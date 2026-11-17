// web/mostrador/data_layer.js — Capa de datos única del Mostrador (`SLICE-V2R-10`, `SLICE-V2C-02`).
//
// Puertos y adaptadores: la capa recibe un `source` con `getJson(ruta)`, `getBytes(ruta)` y `getRangeBytes(ruta, s, e)`.
// En el navegador se usa `createFetchSource` (same-origin, GitHub Pages); en las pruebas, un
// adaptador sobre disco o memoria. Este módulo jamás referencia APIs exclusivas de servidor.
//
// Lectura primaria sobre contenedores sellados `.ekpack` (`codec_id = 2` Zstd + `Frame 67` RLZ) y
// `data/packs/matrix_tier0.ekpack` vía `HTTP 206 Range` + `ekovoz_player_wasm` (`ruzstd`).
// Regla de honestidad: si un capítulo no existe en el idioma pedido, el estado es `unavailable`.

import { BIBLE_CONSTANTS as _BIBLE_CONSTANTS } from "../bible_constants.js";
import {
  MATRIX_ROW_COLUMNS,
  allocWasmBuffer,
  computeProsodyAndSyllableAlignmentInWasm,
  decodeBookFrameTsvBytesInPlayerWasm,
  decodeFrameInWasmLinearMemory,
  decodeRlzBookTsvBytesInPlayerWasm,
  decodeZstdFrameInPlayerWasm,
  freeWasmBuffer,
  normalizeEvangeliosCorpusDoc,
  packFsstSymbolTableBytes,
  parseBookTsvIntoChapters,
  projectNsmRealiaLexicon3NF,
  reconstructMatrixChapterFromDictPool,
  resolveLocalizedBookMeta,
  sha256HexFromBytes,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory,
} from "./data_layer_wasm_codecs.js";
import { buildCanonical80BlocksPagesIndex } from "./dosis.js";
import {
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  decodeRfc8878RawZstdFrameJs,
  inspectDeltaZstPatch,
  parseEkpackContainerJs,
  parseEkpackPreamble32Js,
  truncateAtWordBoundary,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureAsync,
  verifyEd25519ManifestSignatureWebCrypto,
} from "./offline_mesh.js";

export {
  MATRIX_ROW_COLUMNS,
  allocWasmBuffer,
  computeProsodyAndSyllableAlignmentInWasm,
  decodeBookFrameTsvBytesInPlayerWasm,
  decodeFrameInWasmLinearMemory,
  decodeRlzBookTsvBytesInPlayerWasm,
  decodeZstdFrameInPlayerWasm,
  freeWasmBuffer,
  packFsstSymbolTableBytes,
  parseBookTsvIntoChapters,
  projectNsmRealiaLexicon3NF,
  reconstructMatrixChapterFromDictPool,
  resolveLocalizedBookMeta,
  sha256HexFromBytes,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory
};

export const BIBLE_CONSTANTS = _BIBLE_CONSTANTS;

export const STATUS = Object.freeze({ LOADING: "loading", READY: "ready", UNAVAILABLE: "unavailable" });

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const BOOK_RE = /^[1-3A-Z][A-Z0-9]{2}$/;
const EDITION_RE = /^[a-z0-9_-]{1,32}$/;

const EDITION_ALIASES = Object.freeze({
  "02_2col_pastoral": "2col-a4",
  "01_1col_lectura": "2col-a4",
});

function normalizeEditionSlug(edition) {
  const raw = String(edition || "2col-a4").trim();
  return EDITION_ALIASES[raw] || raw;
}

/** Adaptador de red: rutas relativas al sitio (`data/...`, `editions-01/...`), mismo origen. */
export function createFetchSource({ baseUrl = "", fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("createFetchSource requiere fetch");
  const url = (rel) => `${baseUrl}${rel}`;
  return {
    async getJson(rel) {
      const resp = await fetchImpl(url(rel));
      if (!resp || !resp.ok) return null;
      return resp.json();
    },
    async getBytes(rel) {
      const resp = await fetchImpl(url(rel));
      if (!resp || !resp.ok) return null;
      return new Uint8Array(await resp.arrayBuffer());
    },
    async getRangeBytes(rel, startByte, endByteInclusive) {
      const s = Math.max(0, Number(startByte) || 0);
      const e = Math.max(s, Number(endByteInclusive) || s);
      const resp = await fetchImpl(url(rel), {
        headers: { Range: `bytes=${s}-${e}` },
      });
      if (!resp || !resp.ok) return null;
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (resp.status === 206) return buf;
      return buf.subarray(s, Math.min(buf.byteLength, e + 1));
    },
    async getText(rel) {
      const resp = await fetchImpl(url(rel));
      if (!resp || !resp.ok) return null;
      return resp.text();
    },
  };
}

/** Caché LRU mínima con deduplicación de peticiones en vuelo. */
function createLru(limit) {
  const values = new Map();
  const inflight = new Map();
  return {
    async get(key, producer) {
      if (values.has(key)) {
        const v = values.get(key);
        values.delete(key);
        values.set(key, v);
        return v;
      }
      if (inflight.has(key)) return inflight.get(key);
      const promise = (async () => {
        try {
          const v = await producer();
          if (v !== null && v !== undefined) {
            values.set(key, v);
            while (values.size > limit) values.delete(values.keys().next().value);
          }
          return v;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, promise);
      return promise;
    },
    get size() {
      return values.size;
    },
  };
}

/**
 * Crea la capa de datos. Todas las funciones devuelven objetos con `status` explícito.
 */
export function createDataLayer({ source, cacheLimit = 32 } = {}) {
  const sourceGetJson = source && (source.getJson || source.readJson);
  const sourceGetBytes = source && (source.getBytes || source.readBytes);
  if (typeof sourceGetJson !== "function") throw new TypeError("createDataLayer requiere source.getJson");
  const jsonCache = createLru(cacheLimit);
  const bytesCache = createLru(Math.max(8, Math.floor(cacheLimit / 2)));
  const ekpackHeaderCache = createLru(16);
  const sourceGetRangeBytes = source && (source.getRangeBytes || source.readRangeBytes);
  let generation = 0;
  let playerWasmPromise = null;

  const getJson = (rel) => jsonCache.get(rel, () => sourceGetJson.call(source, rel));

  async function loadCatalog() {
    return getJson("data/catalog.json");
  }

  async function loadManifest() {
    return getJson("downloads_manifest.json");
  }

  async function loadBookNames(lang) {
    if (!LANG_RE.test(lang)) return null;
    return getJson(`data/book_names/${lang}.json`);
  }

  async function loadBytes(rel) {
    if (typeof sourceGetBytes !== "function") return null;
    if (
      !/^(?:data|wasm|editions-0\d|packs-0\d)\/[A-Za-z0-9._/-]+$/.test(String(rel || "")) ||
      String(rel).includes("..")
    ) {
      return null;
    }
    return bytesCache.get(rel, () => sourceGetBytes.call(source, rel));
  }

  async function readEkpackSlice(relPath, startByte, endByteInclusive) {
    const s = Math.max(0, Number(startByte) || 0);
    const e = Math.max(s, Number(endByteInclusive) || s);
    if (typeof sourceGetRangeBytes === "function") {
      return sourceGetRangeBytes.call(source, relPath, s, e);
    }
    const full = await loadBytes(relPath);
    if (!full || s >= full.byteLength) return null;
    return full.subarray(s, Math.min(full.byteLength, e + 1));
  }

  async function ensurePlayerWasmLoaded() {
    const cached = hydratedWasmModules.get("ekovoz_player_wasm");
    if (cached && cached.status === STATUS.READY) return cached;
    if (!playerWasmPromise) {
      playerWasmPromise = loadWasmModule("ekovoz_player_wasm").finally(() => {
        playerWasmPromise = null;
      });
    }
    const res = await playerWasmPromise;
    return res && res.status === STATUS.READY ? res : null;
  }

  async function resolvePackHeaderInfo(baseLang) {
    const candidates = [
      `data/packs/${baseLang}.ekpack`,
      `packs-01/${baseLang}.ekpack`,
    ];
    for (const relPack of candidates) {
      const hdrInfo = await ekpackHeaderCache.get(relPack, async () => {
        const headProbe = await readEkpackSlice(relPack, 0, 65535);
        if (!headProbe || headProbe.byteLength < 32) return null;
        const preamble = parseEkpackPreamble32Js(headProbe);
        if (!preamble) return null;
        const f0End = preamble.frame0Offset + preamble.frame0ByteLen;
        let f0Envelope = null;
        if (f0End <= headProbe.byteLength) {
          f0Envelope = headProbe.subarray(preamble.frame0Offset, f0End);
        } else {
          f0Envelope = await readEkpackSlice(relPack, preamble.frame0Offset, f0End - 1);
        }
        if (!f0Envelope || f0Envelope.byteLength < 12) return null;
        const actualF0Len = new DataView(
          f0Envelope.buffer,
          f0Envelope.byteOffset,
          4,
        ).getUint32(0, true);
        if (actualF0Len === 0 || 4 + actualF0Len > f0Envelope.byteLength) return null;
        const playerWasm = await ensurePlayerWasmLoaded();
        const f0JsonBytes = decodeRfc8878RawZstdFrameJs(
          f0Envelope.subarray(4, 4 + actualF0Len),
          playerWasm,
        );
        const hdr = JSON.parse(new TextDecoder("utf-8").decode(f0JsonBytes));
        const signMsg = `EKOVOZ_EKPACK_V1:${hdr.lang_code}:${hdr.content_digest_sha256_hex}:${hdr.merkle_root_sha256_hex}`;
        const edOk = await verifyEd25519ManifestSignatureWebCrypto(
          signMsg,
          hdr.ed25519_signature_hex,
          hdr.ed25519_public_key_hex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
          playerWasm,
        );
        if (
          !edOk ||
          !verifyEd25519ManifestSignature(
            signMsg,
            hdr.ed25519_signature_hex,
            hdr.ed25519_public_key_hex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
            playerWasm,
          )
        ) {
          return { ed25519Invalid: true, relPack };
        }
        let packedSymbols;
        if (
          (!hdr.fsst_symbol_table ||
            (Array.isArray(hdr.fsst_symbol_table) && hdr.fsst_symbol_table.length === 0)) &&
          f0Envelope.byteLength >= 8 + actualF0Len
        ) {
          const symZstdLen = new DataView(
            f0Envelope.buffer,
            f0Envelope.byteOffset + 4 + actualF0Len,
            4,
          ).getUint32(0, true);
          if (symZstdLen > 0 && 8 + actualF0Len + symZstdLen <= f0Envelope.byteLength) {
            packedSymbols = f0Envelope.subarray(8 + actualF0Len, 8 + actualF0Len + symZstdLen);
          } else {
            packedSymbols = new Uint8Array([0, 0]);
          }
        } else {
          packedSymbols = packFsstSymbolTableBytes(hdr.fsst_symbol_table);
        }
        return {
          relPack,
          preamble,
          hdr,
          packedSymbols,
        };
      });
      if (hdrInfo) return hdrInfo;
    }
    return null;
  }

  /**
   * Lector primario `HTTP 206 Range` sobre `.ekpack` sellado (`codec_id = 2` Zstd + `Frame 67` RLZ `es-1909`).
   */
  async function loadBookFromEkpackRange(lang, book) {
    const reqLang = String(lang || "");
    if (!LANG_RE.test(reqLang) || !BOOK_RE.test(String(book))) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "invalid_key" };
    }
    const isIntralang1909 = reqLang === "es-1909";
    const baseLang = isIntralang1909 ? "es" : reqLang;
    const hdrInfo = await resolvePackHeaderInfo(baseLang);
    if (!hdrInfo) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "missing" };
    }
    if (hdrInfo.ed25519Invalid) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "EKPACK_ED25519_INVALID" };
    }

    const bookEntry = (hdrInfo.hdr.books || []).find((b) => b.usfm_id === book);
    if (!bookEntry) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "book_missing_in_ekpack" };
    }
    const startOff = bookEntry.frame_byte_offset;
    const endOff = startOff + bookEntry.frame_byte_len - 1;
    const frameBytes = await readEkpackSlice(hdrInfo.relPack, startOff, endOff);
    if (!frameBytes || frameBytes.byteLength !== bookEntry.frame_byte_len) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "ekpack_range_incomplete" };
    }

    const playerWasm = await ensurePlayerWasmLoaded();
    if (!playerWasm) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "player_wasm_unavailable" };
    }

    let bookTsvBytes = decodeBookFrameTsvBytesInPlayerWasm(
      playerWasm,
      frameBytes,
      hdrInfo.packedSymbols,
      Number(hdrInfo.hdr.unicode_block_base) || 0,
      Number(bookEntry.decompressed_len) || 0,
    );
    let transferredBytes = frameBytes.byteLength;

    if (isIntralang1909) {
      const rlzDesc = hdrInfo.hdr.intralang_rlz;
      if (!rlzDesc || !rlzDesc.frame_byte_len) {
        return { status: STATUS.UNAVAILABLE, data: null, reason: "frame67_missing" };
      }
      const f67Key = `${hdrInfo.relPack}#frame67`;
      const f67Bytes = await ekpackHeaderCache.get(f67Key, () =>
        readEkpackSlice(
          hdrInfo.relPack,
          rlzDesc.frame_byte_offset,
          rlzDesc.frame_byte_offset + rlzDesc.frame_byte_len - 1,
        ),
      );
      if (!f67Bytes || f67Bytes.byteLength !== rlzDesc.frame_byte_len) {
        return { status: STATUS.UNAVAILABLE, data: null, reason: "frame67_range_incomplete" };
      }
      const deltaStats = inspectDeltaZstPatch(f67Bytes, {
        lang: "es",
        bytes: hdrInfo.preamble.totalFileBytes,
        sha256: hdrInfo.hdr.content_digest_sha256_hex,
      });
      transferredBytes += deltaStats.deltaBytes;
      bookTsvBytes = decodeRlzBookTsvBytesInPlayerWasm(
        playerWasm,
        bookTsvBytes,
        Number(bookEntry.first_verse_ord) || 0,
        f67Bytes,
      );
    }

    const chapters = parseBookTsvIntoChapters(bookTsvBytes);
    const provenance = {
      tier: reqLang === "stp" ? "nt_human_ot_scaffold" : "canonical_human_complete",
      sovereign_tier:
        reqLang === "stp" ? "tier2_nt_human_ot_synthesized" : "tier1_canonical_human_66",
      source: isIntralang1909 ? "ekpack_http206_range_frame67_rlz" : "ekpack_http206_range",
      merkle_root: hdrInfo.hdr.merkle_root_sha256_hex,
      ed25519_verified: true,
    };
    return {
      status: STATUS.READY,
      data: {
        book,
        lang: reqLang,
        chapters,
        pericope_breaks: [],
        provenance,
        corpus_rev: hdrInfo.hdr.content_digest_sha256_hex?.slice(0, 12) || "ekpack-v2",
      },
      provenance,
      rangeBytesTransferred: transferredBytes,
    };
  }

  /**
   * Salto directo $\mathcal{O}(1)$ (`CachelineEf` + `decode_ekpack_verse_in_place`) sobre el `.ekpack` de una lengua.
   */
  async function loadVerseFromEkpackO1(lang, verseOrdinal = 0) {
    const cleanLang = String(lang || "es").toLowerCase();
    const baseLang = cleanLang === "es-1909" ? "es" : cleanLang;
    const packBytes = await loadBytes(`data/packs/${baseLang}.ekpack`);
    const playerWasm = await ensurePlayerWasmLoaded();
    if (!packBytes || !playerWasm) {
      return { status: STATUS.UNAVAILABLE, reason: "missing" };
    }
    const parsedMeta = parseEkpackContainerJs(packBytes, playerWasm);
    const exports = playerWasm.exports;
    const packPtr = allocWasmBuffer(exports, packBytes.byteLength);
    const outCap = 8192;
    const outPtr = allocWasmBuffer(exports, outCap);
    try {
      new Uint8Array(exports.memory.buffer, packPtr, packBytes.byteLength).set(packBytes);
      const written = exports.decode_ekpack_verse_in_place(
        packPtr,
        packBytes.byteLength,
        Math.max(0, Number(verseOrdinal) || 0) >>> 0,
        outPtr,
        outCap,
      );
      if (written <= 0) {
        return { status: STATUS.UNAVAILABLE, reason: "decode_failed" };
      }
      const line = new TextDecoder("utf-8").decode(
        new Uint8Array(exports.memory.buffer, outPtr, written),
      );
      const tab = line.indexOf("\t");
      const osis = tab > 0 ? line.slice(0, tab) : "GEN.1.1";
      const text = tab > 0 ? line.slice(tab + 1) : line;
      return {
        status: STATUS.READY,
        osis,
        text,
        preview: truncateAtWordBoundary(text, 120),
        bookCount: parsedMeta.books.length,
      };
    } finally {
      freeWasmBuffer(exports, packPtr, packBytes.byteLength);
      freeWasmBuffer(exports, outPtr, outCap);
    }
  }

  async function loadBookText(lang, book) {
    if (!LANG_RE.test(String(lang)) || !BOOK_RE.test(String(book))) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "invalid_key" };
    }
    const ekpackResult = await loadBookFromEkpackRange(lang, book);
    if (ekpackResult.status === STATUS.READY || ekpackResult.reason !== "missing") {
      return ekpackResult;
    }
    const mockData = await getJson(`data/text/${lang}/${book}.json`);
    if (mockData && mockData.book === book && mockData.lang === lang) {
      return { status: STATUS.READY, data: mockData, provenance: mockData.provenance };
    }
    return ekpackResult;
  }

  /** Devuelve los versículos de un capítulo: `{ status, key, lang, verses: [{start, end, text}], provenance }`. */
  async function loadChapter({ lang, book, chapter }) {
    const ch = Number(chapter);
    const key = `${book}.${ch}`;
    const bookResult = await loadBookText(lang, book);
    if (bookResult.status !== STATUS.READY) {
      return { status: STATUS.UNAVAILABLE, key, lang, verses: [], reason: bookResult.reason };
    }
    const raw = Number.isInteger(ch) && ch >= 1 ? bookResult.data.chapters[ch - 1] : undefined;
    if (!Array.isArray(raw) || raw.length === 0) {
      return {
        status: STATUS.UNAVAILABLE,
        key,
        lang,
        verses: [],
        reason: "empty_chapter",
        provenance: bookResult.provenance,
      };
    }
    const verses = raw.map(([start, end, text]) => ({ start, end, text }));
    const pericopeBreaks = (bookResult.data.pericope_breaks || [])
      .filter(([c]) => c === ch)
      .map(([, verse, kind]) => ({ verse, kind }));
    return {
      status: STATUS.READY,
      key,
      lang,
      book,
      chapter: ch,
      verses,
      pericopeBreaks,
      provenance: bookResult.provenance,
      corpusRev: bookResult.data.corpus_rev,
    };
  }

  async function loadChapterMatrixFromEkpackRange(book, chapter) {
    const relMatrix = "data/packs/matrix_tier0.ekpack";
    const hdrInfo = await ekpackHeaderCache.get(relMatrix, async () => {
      const headProbe = await readEkpackSlice(relMatrix, 0, 65535);
      if (!headProbe || headProbe.byteLength < 32) return null;
      const preamble = parseEkpackPreamble32Js(headProbe);
      if (!preamble) return null;
      const f0End = preamble.frame0Offset + preamble.frame0ByteLen;
      const f0Envelope =
        f0End <= headProbe.byteLength
          ? headProbe.subarray(preamble.frame0Offset, f0End)
          : await readEkpackSlice(relMatrix, preamble.frame0Offset, f0End - 1);
      if (!f0Envelope || f0Envelope.byteLength < 12) return null;
      const actualF0Len = new DataView(
        f0Envelope.buffer,
        f0Envelope.byteOffset,
        4,
      ).getUint32(0, true);
      if (actualF0Len === 0 || 4 + actualF0Len > f0Envelope.byteLength) return null;
      const playerWasm = await ensurePlayerWasmLoaded();
      const f0JsonBytes = decodeRfc8878RawZstdFrameJs(
        f0Envelope.subarray(4, 4 + actualF0Len),
        playerWasm,
      );
      const hdr = JSON.parse(new TextDecoder("utf-8").decode(f0JsonBytes));
      const signMsg = `EKOVOZ_MATRIX_TIER0_V1:${hdr.content_digest_sha256_hex}:${hdr.merkle_root_sha256_hex}`;
      const edOk = await verifyEd25519ManifestSignatureAsync(
        signMsg,
        hdr.ed25519_signature_hex,
        hdr.ed25519_public_key_hex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
        playerWasm,
      );
      if (!edOk) return { ed25519Invalid: true };
      const bookMap = new Map();
      for (const entry of hdr.books || []) {
        bookMap.set(String(entry[0]).toUpperCase(), {
          offset: Number(entry[1]) || 0,
          byteLen: Number(entry[2]) || 0,
          decLen: Number(entry[3]) || 0,
        });
      }
      let dictDoc = null;
      if (Array.isArray(hdr.dict_frame) && hdr.dict_frame.length >= 2) {
        const dOff = Number(hdr.dict_frame[0]) || 0;
        const dLen = Number(hdr.dict_frame[1]) || 0;
        const dDec = Number(hdr.dict_frame[2]) || 0;
        if (dLen > 0) {
          const dSlice = await readEkpackSlice(relMatrix, dOff, dOff + dLen - 1);
          if (dSlice && dSlice.byteLength === dLen && playerWasm) {
            const dRaw = decodeZstdFrameInPlayerWasm(playerWasm, dSlice, dDec);
            dictDoc = JSON.parse(new TextDecoder("utf-8").decode(dRaw));
          }
        }
      }
      return { preamble, hdr, bookMap, dictDoc };
    });

    if (!hdrInfo) return { status: STATUS.UNAVAILABLE, reason: "missing" };
    if (hdrInfo.ed25519Invalid) {
      return { status: STATUS.UNAVAILABLE, reason: "MATRIX_EKPACK_ED25519_INVALID" };
    }
    const bKey = String(book).toUpperCase();
    const bEntry = hdrInfo.bookMap.get(bKey);
    if (!bEntry || bEntry.byteLen <= 0) {
      return { status: STATUS.UNAVAILABLE, reason: "chapter_missing_in_matrix_ekpack" };
    }
    const playerWasm = await ensurePlayerWasmLoaded();
    if (!playerWasm) {
      return { status: STATUS.UNAVAILABLE, reason: "player_wasm_unavailable" };
    }
    const parsedBook = await ekpackHeaderCache.get(`matrix_v3_book:${bKey}`, async () => {
      const slice = await readEkpackSlice(
        relMatrix,
        bEntry.offset,
        bEntry.offset + bEntry.byteLen - 1,
      );
      if (!slice || slice.byteLength !== bEntry.byteLen) return null;
      const rawJsonBytes = decodeZstdFrameInPlayerWasm(playerWasm, slice, bEntry.decLen);
      return JSON.parse(new TextDecoder("utf-8").decode(rawJsonBytes));
    });
    if (!Array.isArray(parsedBook) || !Array.isArray(parsedBook[1])) {
      return { status: STATUS.UNAVAILABLE, reason: "matrix_range_incomplete" };
    }
    const doc = reconstructMatrixChapterFromDictPool(
      parsedBook,
      chapter,
      hdrInfo.hdr,
      hdrInfo.dictDoc,
    );
    if (!doc) {
      return { status: STATUS.UNAVAILABLE, reason: "chapter_missing_in_matrix_ekpack" };
    }
    if (doc.book !== book || Number(doc.chapter) !== chapter || !Array.isArray(doc.rows)) {
      return { status: STATUS.UNAVAILABLE, reason: "invalid_matrix_payload" };
    }
    return { status: STATUS.READY, ...doc };
  }

  /** Filas de la Matriz Original de 14 columnas de un capítulo (`columns` + `rows` desde `matrix_tier0.ekpack`). */
  async function loadChapterMatrix(book, chapter) {
    const ch = Number(chapter);
    if (!BOOK_RE.test(String(book)) || !Number.isInteger(ch) || ch < 1) {
      return { status: STATUS.UNAVAILABLE, reason: "invalid_key" };
    }
    const ekpackMatrix = await loadChapterMatrixFromEkpackRange(book, ch);
    if (ekpackMatrix.status === STATUS.READY || ekpackMatrix.reason !== "missing") {
      return ekpackMatrix;
    }
    const fallbackData = await getJson(`data/matrix/${book}/${ch}.json`);
    if (!fallbackData || fallbackData.book !== book || Number(fallbackData.chapter) !== ch || !Array.isArray(fallbackData.rows)) {
      return { status: STATUS.UNAVAILABLE, reason: "missing" };
    }
    return { status: STATUS.READY, ...fallbackData };
  }

  async function loadPages(lang, edition) {
    const ed = normalizeEditionSlug(edition);
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed)) return null;
    const federatedPages = await getJson(`editions-01/data/pages/${lang}/${ed}.pages.json`);
    if (federatedPages) return federatedPages;
    const cat = await loadCatalog();
    return buildCanonical80BlocksPagesIndex(cat, lang, ed);
  }

  async function loadBlockPdf(lang, edition, blockId) {
    const ed = normalizeEditionSlug(edition);
    const normBlock = String(blockId || "")
      .trim()
      .replace(/^BLK-0?(\d{2})$/i, "B$1");
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed) || !/^B\d{2}$/.test(normBlock)) return null;
    const federated = await loadBytes(`editions-01/data/blocks/${lang}/${ed}/${normBlock}.pdf`);
    if (federated) return federated;
    return loadBytes(`data/blocks/${lang}/${ed}/${normBlock}.pdf`);
  }

  async function loadI18nIndex() {
    return getJson("i18n/index.json");
  }

  async function loadUiCatalog(loc) {
    if (!LANG_RE.test(String(loc))) return null;
    return getJson(`i18n/${loc}.json`);
  }

  async function loadNsmRealiaLexiconInLayer() {
    const [pericopesDoc, rosettaDoc] = await Promise.all([
      loadPericopesAndGlosses(),
      loadPhilologyRosettaIndex(),
    ]);
    return projectNsmRealiaLexicon3NF(pericopesDoc, rosettaDoc);
  }

  async function loadElicitationLadder250() {
    return getJson("data/elicitation_ladder_250.json");
  }

  async function loadRegionShard(macroRegionId) {
    const id = Number(macroRegionId);
    if (!Number.isInteger(id) || id < 1 || id > 12) return null;
    const pad = String(id).padStart(2, "0");
    return getJson(`shards/region_${pad}.json`);
  }

  async function loadAllRegionShards() {
    const promises = [];
    for (let id = 1; id <= 12; id += 1) {
      promises.push(loadRegionShard(id));
    }
    const loaded = await Promise.all(promises);
    return loaded.filter(Boolean);
  }

  async function loadMerkleRoot() {
    const sourceGetText = source && (source.getText || source.readText);
    if (typeof sourceGetText === "function") {
      const rawText = await sourceGetText.call(source, "merkle_root.txt");
      if (typeof rawText === "string" && rawText.trim().length > 0) {
        const match = rawText.match(/[0-9a-fA-F]{64}/);
        return {
          merkleRootHex: match ? match[0].toLowerCase() : rawText.trim().split(/\s+/)[0],
          raw: rawText.trim(),
        };
      }
    }
    if (typeof sourceGetBytes === "function") {
      const bytes = await sourceGetBytes.call(source, "merkle_root.txt");
      if (bytes && bytes.byteLength > 0 && typeof TextDecoder !== "undefined") {
        const decoded = new TextDecoder("utf-8").decode(bytes).trim();
        const match = decoded.match(/[0-9a-fA-F]{64}/);
        return {
          merkleRootHex: match ? match[0].toLowerCase() : decoded.split(/\s+/)[0],
          raw: decoded,
        };
      }
    }
    const manifest = await loadManifest();
    if (manifest) {
      const rawHex =
        manifest.merkle_root ||
        manifest.merkleRoot ||
        (Array.isArray(manifest.entries) && manifest.entries[0]?.sha256) ||
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const match = String(rawHex).match(/[0-9a-fA-F]{64}/);
      const merkleRootHex = match
        ? match[0].toLowerCase()
        : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      return {
        merkleRootHex,
        raw: merkleRootHex,
      };
    }
    return null;
  }

  async function loadEvangeliosCorpus() {
    const raw = await getJson("data/evangelios/corpus.json");
    return normalizeEvangeliosCorpusDoc(raw);
  }

  let hydratedRosettaIndex = null;
  let hydratedPericopesAndGlosses = null;
  let hydratedDiachronicAudit = null;
  let hydratedEditorialProfiles = null;
  let hydratedFieldWorkshopData = null;
  let hydratedMasterCensusSummary = null;
  let hydratedOfflinePacksCatalog = null;
  let hydratedAnnotationIndexReport = null;
  let hydratedBlindCalibrationReport = null;
  const hydratedWasmModules = new Map();

  async function loadPhilologyRosettaIndex() {
    const val = await getJson("shards/philology_rosetta_index.json");
    if (val) hydratedRosettaIndex = val;
    return val;
  }

  async function loadPericopesAndGlosses() {
    const val = await getJson("data/pericopes_and_glosses.json");
    if (val) hydratedPericopesAndGlosses = val;
    return val;
  }

  async function loadDiachronicRegisterAudit() {
    const val = await getJson("data/diachronic_register_es.json");
    if (val) hydratedDiachronicAudit = val;
    return val;
  }

  async function loadEditorialProfiles() {
    const val = await getJson("data/editorial_profiles.json");
    if (val) hydratedEditorialProfiles = val;
    return val;
  }

  async function loadFieldWorkshopData() {
    const val = await getJson("data/field_workshop_stp.json");
    if (val) hydratedFieldWorkshopData = val;
    return val;
  }

  async function loadMasterCensusSummary() {
    const val = await getJson("data/master_census_summary.json");
    if (val) hydratedMasterCensusSummary = val;
    return val;
  }

  async function loadOfflinePacksCatalog() {
    const [catalogDoc, packsManifest] = await Promise.all([
      getJson("data/offline_packs_catalog.json"),
      getJson("data/packs/packs_manifest.json"),
    ]);
    const unified = {
      ...(catalogDoc || {}),
      packsManifest: packsManifest || null,
    };
    hydratedOfflinePacksCatalog = unified;
    return unified;
  }

  async function loadAnnotationIndexReport() {
    const val = await getJson("data/annotation_index_report.json");
    if (val) hydratedAnnotationIndexReport = val;
    return val;
  }

  async function loadBlindCalibrationReport() {
    const val = await getJson("data/blind_calibration_report.json");
    if (val) hydratedBlindCalibrationReport = val;
    return val;
  }

  async function loadWasmModule(moduleName, imports = {}) {
    if (!EDITION_RE.test(String(moduleName || ""))) {
      return { status: STATUS.UNAVAILABLE, reason: "INVALID_WASM_MODULE_NAME" };
    }
    const wasmManifest = await getJson("wasm/wasm_manifest.json");
    const entry = wasmManifest?.modules?.[moduleName];
    if (!entry || !entry.path || !entry.sha256) {
      return { status: STATUS.UNAVAILABLE, reason: "WASM_MANIFEST_ENTRY_MISSING" };
    }
    const bytes = await loadBytes(entry.path);
    if (!bytes || !(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
      return { status: STATUS.UNAVAILABLE, reason: "WASM_BINARY_MISSING" };
    }
    const actualSha256 = sha256HexFromBytes(bytes);
    if (actualSha256 !== String(entry.sha256).toLowerCase()) {
      return {
        status: STATUS.UNAVAILABLE,
        reason: "WASM_SHA256_MISMATCH",
        expectedSha256: entry.sha256,
        actualSha256,
      };
    }
    const instantiated = await WebAssembly.instantiate(bytes, imports);
    const instance = instantiated.instance || instantiated;
    const modResult = {
      status: STATUS.READY,
      moduleName,
      sha256: actualSha256,
      bytes: bytes.byteLength,
      instance,
      exports: instance.exports,
      decodeFrame(frameBytes, expectedDropIdx = 0) {
        return decodeFrameInWasmLinearMemory(instance, frameBytes, expectedDropIdx);
      },
      verifyRaptorQBlock(blockBytes, expectedK = 8) {
        return verifyRaptorQBlockInWasmLinearMemory(instance, blockBytes, expectedK);
      },
      verifyAudioPcmCrc16(pcmBytes) {
        return verifyAudioPcmCrc16InWasmLinearMemory(instance, pcmBytes);
      },
      computeProsodyAndSyllableAlignment(opts = {}) {
        return computeProsodyAndSyllableAlignmentInWasm(opts, instance);
      },
    };
    hydratedWasmModules.set(moduleName, modResult);
    return modResult;
  }

  function navigate(state) {
    generation += 1;
    const mine = generation;
    const isCurrent = () => mine === generation;
    const result = loadChapter(state);
    const enrichedPromise = result.then((chapterRes) => {
      const versesMap = {};
      if (Array.isArray(chapterRes.verses)) {
        for (const v of chapterRes.verses) {
          if (v && v.start !== undefined) {
            versesMap[String(v.start)] = v.text;
          }
        }
      }
      return {
        ...chapterRes,
        stale: !isCurrent(),
        chapter:
          chapterRes.status === STATUS.READY
            ? {
              verses: versesMap,
              rawVerses: chapterRes.verses,
              pericopeBreaks: chapterRes.pericopeBreaks,
            }
            : null,
        meta: {
          draft_status: chapterRes.provenance?.status || "",
        },
      };
    });
    return {
      generation: mine,
      isCurrent,
      result,
      then: (onFulfilled, onRejected) => enrichedPromise.then(onFulfilled, onRejected),
    };
  }

  return {
    loadCatalog,
    loadManifest,
    loadDownloadsManifest: loadManifest,
    loadBookNames,
    loadBookText,
    loadBookFromEkpackRange,
    loadVerseFromEkpackO1,
    loadChapter,
    loadChapterMatrix,
    loadMatrixChapter: loadChapterMatrix,
    loadPages,
    loadPageIndex: loadPages,
    loadBytes,
    loadBlockPdf,
    loadI18nIndex,
    loadUiCatalog,
    loadNsmRealiaLexicon: loadNsmRealiaLexiconInLayer,
    loadElicitationLadder250,
    loadRegionShard,
    loadAllRegionShards,
    loadMerkleRoot,
    loadEvangeliosCorpus,
    loadPhilologyRosettaIndex,
    loadPericopesAndGlosses,
    loadDiachronicRegisterAudit,
    loadEditorialProfiles,
    loadFieldWorkshopData,
    loadMasterCensusSummary,
    loadOfflinePacksCatalog,
    loadAnnotationIndexReport,
    loadBlindCalibrationReport,
    loadWasmModule,
    bibleConstants: BIBLE_CONSTANTS,
    getHydratedRosettaIndex: () => hydratedRosettaIndex,
    getHydratedPericopesAndGlosses: () => hydratedPericopesAndGlosses,
    getHydratedDiachronicAudit: () => hydratedDiachronicAudit,
    getHydratedEditorialProfiles: () => hydratedEditorialProfiles,
    getHydratedFieldWorkshopData: () => hydratedFieldWorkshopData,
    getHydratedMasterCensusSummary: () => hydratedMasterCensusSummary,
    getHydratedOfflinePacksCatalog: () => hydratedOfflinePacksCatalog,
    getHydratedAnnotationIndexReport: () => hydratedAnnotationIndexReport,
    getHydratedBlindCalibrationReport: () => hydratedBlindCalibrationReport,
    getHydratedWasmModule: (name) => hydratedWasmModules.get(name) || null,
    decodeFrameInWasmLinearMemory,
    verifyRaptorQBlockInWasmLinearMemory,
    verifyAudioPcmCrc16InWasmLinearMemory,
    computeProsodyAndSyllableAlignmentInWasm,
    resolveLocalizedBookMeta,
    navigate,
    get generation() {
      return generation;
    },
  };
}

export {
  ARTIFACT_PROJECTION_SCHEMA, MOSTRADOR_DOM_SCOPE_CONTRACTS, verifyArtifactProjectionClosure, verifyVplDomScopeContainment
} from "./dom_projection_contracts.js";

export async function loadNsmRealiaLexicon({
  baseUrl = "",
  fetchImpl = globalThis.fetch,
  source = null,
} = {}) {
  const activeSource = source || createFetchSource({ baseUrl, fetchImpl });
  const getJson = activeSource.getJson || activeSource.readJson;
  const [pericopesDoc, rosettaDoc] = await Promise.all([
    Promise.resolve(getJson.call(activeSource, "data/pericopes_and_glosses.json")).catch(() => null),
    Promise.resolve(getJson.call(activeSource, "shards/philology_rosetta_index.json")).catch(() => null),
  ]);
  return projectNsmRealiaLexicon3NF(pericopesDoc || {}, rosettaDoc || {});
}
