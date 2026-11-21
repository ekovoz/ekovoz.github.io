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
import { CANONICAL_BOOK_ORDER } from "./canonical_versification.js";
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
  buildEkpackSigningMessageV2,
  computeBooksDirectoryBytesJs,
  computeSha256HexWebCrypto,
  decodeRfc8878RawZstdFrameJs,
  inspectDeltaZstPatch,
  parseEkpackContainerJs,
  parseEkpackPreamble32Js,
  parseEm2MetaTrailerBytes,
  sliceVaultEkpackRange,
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

/** Adaptador de red: rutas relativas al sitio (`data/...`, `packs/...`), mismo origen. */
export function createFetchSource({ baseUrl = "", fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("createFetchSource requiere fetch");
  const url = (rel) => `${baseUrl}${rel}`;
  return {
    isFetchNetworkSource: true,
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

  async function loadJson(rel) {
    if (
      !/^(?:data|i18n|shards)\/[A-Za-z0-9._/-]+\.json$/.test(String(rel || "")) ||
      String(rel).includes("..")
    ) {
      return null;
    }
    return getJson(rel);
  }

  const EMBEDDED_SEED_PACK_LANGS = new Set(["es", "en", "stp", "he", "grc", "matrix_tier0"]);

  async function loadBytes(rel) {
    if (typeof sourceGetBytes !== "function") return null;
    if (
      !/^(?:data|wasm|packs|assets|mostrador)\/[A-Za-z0-9._/-]+$/.test(String(rel || "")) ||
      String(rel).includes("..")
    ) {
      return null;
    }
    return bytesCache.get(rel, async () => {
      const vaultedFull = await sliceVaultEkpackRange(rel, 0, 64 * 1024 * 1024);
      if (vaultedFull && vaultedFull.byteLength >= 32) return vaultedFull;
      return sourceGetBytes.call(source, rel);
    });
  }

  async function readEkpackSlice(relPath, startByte, endByteInclusive) {
    const s = Math.max(0, Number(startByte) || 0);
    const e = Math.max(s, Number(endByteInclusive) || s);
    // D3-V2G: Consultar primero la bóveda persistente IndexedDB (`ekovoz_vault_v2`) con `Blob.slice` zero-copy (< 64 KB RAM)
    const vaultedSlice = await sliceVaultEkpackRange(relPath, s, e);
    if (vaultedSlice && vaultedSlice.byteLength > 0) {
      return vaultedSlice;
    }
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

  async function resolvePackCandidatePaths(baseLang) {
    const vaultHead = await sliceVaultEkpackRange(baseLang, 0, 31);
    if (vaultHead && vaultHead.byteLength >= 32) {
      return [`packs/${baseLang}.ekpack`];
    }
    if (EMBEDDED_SEED_PACK_LANGS.has(baseLang)) {
      return [`data/packs/${baseLang}.ekpack`, `packs/${baseLang}.ekpack`];
    }
    let packCat = null;
    try {
      packCat = await getJson("data/offline_packs_catalog.json");
    } catch (_err) {
      packCat = null;
    }
    const availLangs = Array.isArray(packCat?.available_pack_langs)
      ? packCat.available_pack_langs
      : Array.isArray(packCat?.packs)
        ? packCat.packs.map((p) => String(p?.lang || ""))
        : null;
    if (
      source?.isFetchNetworkSource &&
      Array.isArray(availLangs) &&
      availLangs.length > 0 &&
      !availLangs.includes(baseLang) &&
      !availLangs.includes(baseLang.toLowerCase())
    ) {
      return [];
    }
    const mounts = Array.isArray(packCat?.pack_mounts)
      ? packCat.pack_mounts
        .map((m) => String(m?.base_url || "").replace(/^\/+|\/+$/g, ""))
        .filter((p) => p === "packs" || p === "data/packs")
      : [];
    const orderedBases = mounts.length > 0 ? mounts : ["packs", "data/packs"];
    const out = [];
    for (const base of orderedBases) {
      if (base === "data/packs" && source?.isFetchNetworkSource && !EMBEDDED_SEED_PACK_LANGS.has(baseLang)) {
        continue;
      }
      const candidate = `${base}/${baseLang}.ekpack`;
      if (!out.includes(candidate)) out.push(candidate);
    }
    return out;
  }

  async function resolvePackHeaderInfo(baseLang) {
    const candidates = await resolvePackCandidatePaths(baseLang);
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
        const pinnedPubKey = SOVEREIGN_ED25519_PUBLIC_KEY_HEX.toLowerCase();
        const headerPubKey = String(hdr.ed25519_public_key_hex || "").trim().toLowerCase();
        if (headerPubKey !== pinnedPubKey) {
          return { ed25519Invalid: true, reason: "UNPINNED_ED25519_KEY", relPack };
        }
        if (
          String(hdr.lang_code || "").trim().toLowerCase() !==
          String(baseLang || "").trim().toLowerCase()
        ) {
          return { ed25519Invalid: true, reason: "EKPACK_LANG_REPLAY", relPack };
        }
        const expectedMetaSha = String(hdr.meta_zstd_sha256_hex || "").trim().toLowerCase();
        if (!/^[0-9a-f]{64}$/.test(expectedMetaSha)) {
          return { ed25519Invalid: true, reason: "EKPACK_META_ZSTD_SHA256_MISSING", relPack };
        }
        const signMsgV2 = buildEkpackSigningMessageV2(hdr);
        const sigOkV2 =
          (await verifyEd25519ManifestSignatureWebCrypto(
            signMsgV2,
            hdr.ed25519_signature_hex,
            pinnedPubKey,
            playerWasm,
          )) &&
          verifyEd25519ManifestSignature(
            signMsgV2,
            hdr.ed25519_signature_hex,
            pinnedPubKey,
            playerWasm,
          );
        if (!sigOkV2) {
          return { ed25519Invalid: true, relPack };
        }
        let packedSymbols;
        let symZstdSlice = null;
        let symZstdLen = 0;
        if (f0Envelope.byteLength >= 8 + actualF0Len) {
          symZstdLen = new DataView(
            f0Envelope.buffer,
            f0Envelope.byteOffset + 4 + actualF0Len,
            4,
          ).getUint32(0, true);
        }
        if (symZstdLen > 0) {
          if (8 + actualF0Len + symZstdLen > f0Envelope.byteLength) {
            return { ed25519Invalid: true, reason: "EKPACK_SYM_ZSTD_TRUNCATED", relPack };
          }
          symZstdSlice = f0Envelope.subarray(8 + actualF0Len, 8 + actualF0Len + symZstdLen);
        }
        if (
          !hdr.fsst_symbol_table ||
          (Array.isArray(hdr.fsst_symbol_table) && hdr.fsst_symbol_table.length === 0)
        ) {
          packedSymbols = symZstdSlice || new Uint8Array([0, 0]);
        } else {
          packedSymbols = packFsstSymbolTableBytes(hdr.fsst_symbol_table);
        }
        const metaPos = 8 + actualF0Len + symZstdLen;
        if (Array.isArray(hdr.books) && hdr.books.length > 0) {
          const hasMetaEnvelope = metaPos + 4 <= f0Envelope.byteLength;
          const metaZstdLen = hasMetaEnvelope
            ? new DataView(
                f0Envelope.buffer,
                f0Envelope.byteOffset + metaPos,
                4,
              ).getUint32(0, true)
            : 0;
          if (
            !hasMetaEnvelope ||
            metaZstdLen === 0 ||
            metaPos + 4 + metaZstdLen > f0Envelope.byteLength
          ) {
            return { ed25519Invalid: true, reason: "EKPACK_META_ZSTD_INVALID", relPack };
          }
          const metaZstdSlice = f0Envelope.subarray(metaPos + 4, metaPos + 4 + metaZstdLen);
          const actualMetaSha = await computeSha256HexWebCrypto(metaZstdSlice);
          if (actualMetaSha !== expectedMetaSha) {
            return { ed25519Invalid: true, reason: "EKPACK_META_ZSTD_INVALID", relPack };
          }
          try {
            const metaRaw = decodeRfc8878RawZstdFrameJs(metaZstdSlice, playerWasm);
            const em2 = parseEm2MetaTrailerBytes(metaRaw, hdr.books.length);
            if (!em2.valid || !em2.hasEm2) {
              return { ed25519Invalid: true, reason: "EKPACK_EM2_TRAILER_INVALID", relPack };
            }
            if (symZstdSlice && symZstdSlice.byteLength > 0) {
              const actualSymSha = await computeSha256HexWebCrypto(symZstdSlice);
              if (actualSymSha !== em2.symSha256Hex) {
                return { ed25519Invalid: true, reason: "EKPACK_SYM_ZSTD_TAMPERED", relPack };
              }
            }
            const actualDirSha = await computeSha256HexWebCrypto(
              computeBooksDirectoryBytesJs(hdr.books),
            );
            if (actualDirSha !== em2.booksDirSha256Hex) {
              return { ed25519Invalid: true, reason: "EKPACK_BOOKS_DIR_TAMPERED", relPack };
            }
            for (let bi = 0; bi < hdr.books.length; bi += 1) {
              const hexStr = em2.bookSha256Hexes[bi];
              if (
                hdr.books[bi].frame_sha256_hex &&
                String(hdr.books[bi].frame_sha256_hex).toLowerCase() !== hexStr
              ) {
                return {
                  ed25519Invalid: true,
                  reason: "EKPACK_META_ZSTD_INVALID",
                  relPack,
                };
              }
              if (!hdr.books[bi].frame_sha256_hex) {
                hdr.books[bi].frame_sha256_hex = hexStr;
              }
            }
            if (hdr.intralang_rlz) {
              if (!em2.frame67Sha256Hex) {
                return {
                  ed25519Invalid: true,
                  reason: "FRAME67_META_HASH_MISSING",
                  relPack,
                };
              }
              if (
                hdr.intralang_rlz.frame_sha256_hex &&
                String(hdr.intralang_rlz.frame_sha256_hex).toLowerCase() !==
                  em2.frame67Sha256Hex
              ) {
                return {
                  ed25519Invalid: true,
                  reason: "FRAME67_META_HASH_MISMATCH",
                  relPack,
                };
              }
              hdr.intralang_rlz.frame_sha256_hex = em2.frame67Sha256Hex;
            }
          } catch {
            return { ed25519Invalid: true, reason: "EKPACK_META_ZSTD_INVALID", relPack };
          }
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
      return {
        status: STATUS.UNAVAILABLE,
        data: null,
        reason: hdrInfo.reason || "EKPACK_ED25519_INVALID",
      };
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
    if (!bookEntry.frame_sha256_hex) {
      return {
        status: STATUS.UNAVAILABLE,
        data: null,
        reason: "EKPACK_BOOK_FRAME_SHA256_MISSING",
      };
    }
    const actualBookSha256 = await computeSha256HexWebCrypto(frameBytes);
    if (actualBookSha256 !== String(bookEntry.frame_sha256_hex).toLowerCase()) {
      return {
        status: STATUS.UNAVAILABLE,
        data: null,
        reason: "EKPACK_BOOK_FRAME_SHA256_MISMATCH",
      };
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
      if (
        f67Bytes.byteLength < 8 ||
        new DataView(f67Bytes.buffer, f67Bytes.byteOffset, 4).getUint32(0, true) >>> 0 !==
          0xfd2fb528
      ) {
        return { status: STATUS.UNAVAILABLE, data: null, reason: "FRAME67_ZSTD_TAMPERED" };
      }
      if (!rlzDesc.frame_sha256_hex) {
        return { status: STATUS.UNAVAILABLE, data: null, reason: "FRAME67_SHA256_MISSING" };
      }
      const actualF67Sha = await computeSha256HexWebCrypto(f67Bytes);
      if (actualF67Sha !== String(rlzDesc.frame_sha256_hex).toLowerCase()) {
        return { status: STATUS.UNAVAILABLE, data: null, reason: "FRAME67_SHA256_MISMATCH" };
      }
      if (
        !rlzDesc.base_content_sha256_hex ||
        String(rlzDesc.base_content_sha256_hex).toLowerCase() !==
          String(hdrInfo.hdr.content_digest_sha256_hex || "").toLowerCase()
      ) {
        return { status: STATUS.UNAVAILABLE, data: null, reason: "FRAME67_BASE_DIGEST_MISMATCH" };
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
    const bookOrdinal = Math.max(0, CANONICAL_BOOK_ORDER.indexOf(book));
    const tierVec = Array.isArray(hdrInfo.hdr.book_epistemic_tiers)
      ? hdrInfo.hdr.book_epistemic_tiers
      : null;
    const bookTierBits =
      tierVec && tierVec.length >= 17
        ? ((Number(tierVec[bookOrdinal >> 2]) || 0) >> ((bookOrdinal & 3) * 2)) & 0b11
        : reqLang === "he" || reqLang === "grc"
          ? 0
          : reqLang === "stp" && bookOrdinal < 39
            ? 2
            : 1;
    let hasTier0 = reqLang === "he" || reqLang === "grc";
    let hasTier1 = false;
    let packHasTier2Scaffold = reqLang === "stp";
    let hasTier3Unattested = false;
    if (tierVec && tierVec.length >= 17) {
      for (let bIdx = 0; bIdx < 66; bIdx += 1) {
        const tb = ((Number(tierVec[bIdx >> 2]) || 0) >> ((bIdx & 3) * 2)) & 0b11;
        if (tb === 0) hasTier0 = true;
        else if (tb === 1) hasTier1 = true;
        else if (tb === 2) packHasTier2Scaffold = true;
        else if (tb === 3) hasTier3Unattested = true;
      }
    }
    const isTier3PortionPack =
      !packHasTier2Scaffold &&
      hasTier3Unattested &&
      (hasTier1 || (Array.isArray(hdrInfo.hdr.books) && hdrInfo.hdr.books.length < 66));
    const bookEpistemicTier =
      bookTierBits === 0
        ? "tier0_autograph_witness"
        : bookTierBits === 2
          ? "tier2_nt_human_ot_synthesized"
          : bookTierBits === 3
            ? "tier4_gmis_scaffold"
            : "tier1_canonical_human_66";
    const sovereignTier = packHasTier2Scaffold
      ? "tier2_nt_human_ot_synthesized"
      : isTier3PortionPack
        ? "tier_3_portion_ladder"
        : hasTier0 && !hasTier1
          ? "tier0_autograph_witness"
          : bookTierBits === 3
            ? "tier4_gmis_scaffold"
            : "tier1_canonical_human_66";
    const provenance = {
      tier: packHasTier2Scaffold
        ? "nt_human_ot_scaffold"
        : isTier3PortionPack
          ? "portion_ladder_tier3"
          : bookTierBits === 0
            ? "autograph_witness_tier0"
            : "canonical_human_complete",
      sovereign_tier: sovereignTier,
      book_epistemic_tier: bookEpistemicTier,
      book_epistemic_tier_bits: bookTierBits,
      book_epistemic_tiers: tierVec,
      versification_tradition: hdrInfo.hdr.versification_tradition || "eng",
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
    const rawLang = String(lang || "es").trim() || "es";
    const baseLang = rawLang.toLowerCase() === "es-1909" ? "es" : rawLang;
    const candidatePaths = await resolvePackCandidatePaths(baseLang);
    let packBytes = null;
    for (const relPack of candidatePaths) {
      packBytes = await loadBytes(relPack);
      if (packBytes && packBytes.byteLength >= 32) break;
    }
    if (!packBytes) {
      packBytes = await loadBytes(`data/packs/${baseLang}.ekpack`);
    }
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
    if (!source?.isFetchNetworkSource) {
      const mockData = await getJson(`data/text/${lang}/${book}.json`);
      if (mockData && mockData.book === book && mockData.lang === lang) {
        return { status: STATUS.READY, data: mockData, provenance: mockData.provenance };
      }
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

  function decodeBase64ToBytesJs(b64) {
    const clean = String(b64 || "").trim();
    if (!clean) return new Uint8Array(0);
    if (typeof atob === "function") {
      const bin = atob(clean);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
      return out;
    }
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(clean, "base64"));
    }
    return new Uint8Array(0);
  }

  function sliceFrameSha256HexJs(rawFrameHashes, frameIdx) {
    const idx = Number(frameIdx);
    if (
      !(rawFrameHashes instanceof Uint8Array) ||
      !Number.isInteger(idx) ||
      idx < 0 ||
      (idx + 1) * 32 > rawFrameHashes.byteLength
    ) {
      return "";
    }
    let hex = "";
    const base = idx * 32;
    for (let i = 0; i < 32; i += 1) {
      hex += rawFrameHashes[base + i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  async function loadChapterMatrixFromEkpackRange(book, chapter) {
    const relMatrix = "data/packs/matrix_tier0.ekpack";
    const hdrInfo = await ekpackHeaderCache.get(relMatrix, async () => {
      const headProbe = await readEkpackSlice(relMatrix, 0, 32767);
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
      const pinnedPubKey = SOVEREIGN_ED25519_PUBLIC_KEY_HEX.toLowerCase();
      const headerPubKey = String(hdr.ed25519_public_key_hex || "").trim().toLowerCase();
      if (headerPubKey !== pinnedPubKey) {
        return { ed25519Invalid: true };
      }
      if (hdr.schema_crc32 !== undefined && Number(hdr.schema_crc32) !== 0x4e14c015) {
        return { ed25519Invalid: true };
      }
      const frameDirHex = String(hdr.frame_dir_sha256_hex || "").trim().toLowerCase();
      const rawFrameHashes = decodeBase64ToBytesJs(hdr.frame_hashes_b64);
      if (
        !/^[0-9a-f]{64}$/.test(frameDirHex) ||
        rawFrameHashes.byteLength === 0 ||
        rawFrameHashes.byteLength % 32 !== 0
      ) {
        return { ed25519Invalid: true };
      }
      const signMsg = `EKOVOZ_MATRIX_TIER0_V2:${hdr.content_digest_sha256_hex}:${hdr.merkle_root_sha256_hex}:${frameDirHex}`;
      const edOk = await verifyEd25519ManifestSignatureAsync(
        signMsg,
        hdr.ed25519_signature_hex,
        pinnedPubKey,
        playerWasm,
      );
      if (!edOk) return { ed25519Invalid: true };

      const enc = new TextEncoder();
      const dictIdx = Array.isArray(hdr.dict_frame) && hdr.dict_frame.length >= 4 ? Number(hdr.dict_frame[3]) : -1;
      const realiaIdx =
        Array.isArray(hdr.realia_frame) && hdr.realia_frame.length >= 4 ? Number(hdr.realia_frame[3]) : -1;
      if (!Number.isInteger(dictIdx) || dictIdx < 0 || !Number.isInteger(realiaIdx) || realiaIdx < 0) {
        return { ed25519Invalid: true };
      }
      const dirLines = [`D:${dictIdx}|R:${realiaIdx}`];
      const bookMap = new Map();
      for (const entry of hdr.books || []) {
        const bkCode = String(entry[0]);
        const fidx = entry.length >= 5 ? Number(entry[4]) : -1;
        if (!Number.isInteger(fidx) || fidx < 0) return { ed25519Invalid: true };
        dirLines.push(`B:${bkCode}:${fidx}`);
        bookMap.set(bkCode.toUpperCase(), {
          offset: Number(entry[1]) || 0,
          byteLen: Number(entry[2]) || 0,
          decLen: Number(entry[3]) || 0,
          frameIdx: fidx,
        });
      }
      const windowMap = new Map();
      if (hdr.win_ranges && typeof hdr.win_ranges === "object") {
        const sortedWinBooks = Object.keys(hdr.win_ranges).sort();
        for (const bkCode of sortedWinBooks) {
          const wins = hdr.win_ranges[bkCode];
          if (!Array.isArray(wins)) continue;
          const bUpper = String(bkCode).toUpperCase();
          const baseBook = bookMap.get(bUpper);
          if (!baseBook) continue;
          let runOff = baseBook.offset;
          const perBookWins = [];
          for (let i = 0; i < wins.length; i += 1) {
            const w = wins[i];
            const cFirst = Number(w[0]) || 1;
            const cLast = Number(w[1]) || cFirst;
            const cLen = Number(w[2]) || 0;
            const absOff = w.length >= 4 ? Number(w[3]) : runOff;
            const wfidx = w.length >= 5 ? Number(w[4]) : -1;
            if (!Number.isInteger(wfidx) || wfidx < 0) return { ed25519Invalid: true };
            dirLines.push(`W:${bkCode}:${w[0]}:${w[1]}:${wfidx}`);
            perBookWins.push({
              winIdx: i,
              cFirst,
              cLast,
              offset: absOff,
              byteLen: cLen,
              decLen: 0,
              frameIdx: wfidx,
            });
            runOff = absOff + cLen;
          }
          windowMap.set(bUpper, perBookWins);
        }
      }
      const dirSuffixBytes = enc.encode(`\n${dirLines.join("\n")}\n`);
      const dirBuf = new Uint8Array(rawFrameHashes.byteLength + dirSuffixBytes.byteLength);
      dirBuf.set(rawFrameHashes, 0);
      dirBuf.set(dirSuffixBytes, rawFrameHashes.byteLength);
      const actualDirSha = await computeSha256HexWebCrypto(dirBuf);
      if (actualDirSha !== frameDirHex) {
        return { ed25519Invalid: true };
      }

      let dictDoc = null;
      if (Array.isArray(hdr.dict_frame) && hdr.dict_frame.length >= 4) {
        const dOff = Number(hdr.dict_frame[0]) || 0;
        const dLen = Number(hdr.dict_frame[1]) || 0;
        const dDec = Number(hdr.dict_frame[2]) || 0;
        const expectedDictSha = sliceFrameSha256HexJs(rawFrameHashes, dictIdx);
        if (dLen > 0 && expectedDictSha) {
          const dSlice =
            dOff + dLen <= headProbe.byteLength
              ? headProbe.subarray(dOff, dOff + dLen)
              : await readEkpackSlice(relMatrix, dOff, dOff + dLen - 1);
          if (!dSlice || dSlice.byteLength !== dLen) {
            return { ed25519Invalid: true };
          }
          const actualDictSha = await computeSha256HexWebCrypto(dSlice);
          if (actualDictSha !== expectedDictSha) {
            return { ed25519Invalid: true };
          }
          if (playerWasm) {
            const dRaw = decodeZstdFrameInPlayerWasm(playerWasm, dSlice, dDec);
            dictDoc = JSON.parse(new TextDecoder("utf-8").decode(dRaw));
          }
        } else if (dLen > 0) {
          return { ed25519Invalid: true };
        }
      }
      return { preamble, hdr, bookMap, windowMap, dictDoc, rawFrameHashes };
    });

    if (!hdrInfo) return { status: STATUS.UNAVAILABLE, reason: "missing" };
    if (hdrInfo.ed25519Invalid) {
      return { status: STATUS.UNAVAILABLE, reason: "MATRIX_EKPACK_ED25519_INVALID" };
    }
    const bKey = String(book).toUpperCase();
    const chNum = Number(chapter);
    const winsForBook = hdrInfo.windowMap?.get(bKey);
    const matchedWin = winsForBook
      ? winsForBook.find((w) => chNum >= w.cFirst && chNum <= w.cLast)
      : null;
    const bEntry = matchedWin || hdrInfo.bookMap.get(bKey);
    if (!bEntry || bEntry.byteLen <= 0) {
      return { status: STATUS.UNAVAILABLE, reason: "chapter_missing_in_matrix_ekpack" };
    }
    const expectedFrameSha = sliceFrameSha256HexJs(hdrInfo.rawFrameHashes, bEntry.frameIdx);
    if (!expectedFrameSha) {
      return { status: STATUS.UNAVAILABLE, reason: "MATRIX_FRAME_SHA256_MISSING" };
    }
    const playerWasm = await ensurePlayerWasmLoaded();
    if (!playerWasm) {
      return { status: STATUS.UNAVAILABLE, reason: "player_wasm_unavailable" };
    }
    const cacheKey = matchedWin
      ? `matrix_v4_off:${bEntry.offset}:${bEntry.byteLen}`
      : `matrix_v3_book:${bKey}`;
    const parsedBook = await ekpackHeaderCache.get(cacheKey, async () => {
      const slice = await readEkpackSlice(
        relMatrix,
        bEntry.offset,
        bEntry.offset + bEntry.byteLen - 1,
      );
      if (
        !slice ||
        slice.byteLength !== bEntry.byteLen ||
        slice.byteLength < 8 ||
        new DataView(slice.buffer, slice.byteOffset, 4).getUint32(0, true) >>> 0 !== 0xfd2fb528
      ) {
        return null;
      }
      const actualFrameSha = await computeSha256HexWebCrypto(slice);
      if (actualFrameSha !== expectedFrameSha) {
        return { shaMismatch: true };
      }
      const rawJsonBytes = decodeZstdFrameInPlayerWasm(playerWasm, slice, bEntry.decLen);
      return JSON.parse(new TextDecoder("utf-8").decode(rawJsonBytes));
    });
    if (parsedBook?.shaMismatch) {
      return { status: STATUS.UNAVAILABLE, reason: "MATRIX_FRAME_SHA256_MISMATCH" };
    }
    if (!Array.isArray(parsedBook) || !Array.isArray(parsedBook[1])) {
      return { status: STATUS.UNAVAILABLE, reason: "matrix_range_incomplete" };
    }
    const doc = reconstructMatrixChapterFromDictPool(
      parsedBook,
      chapter,
      hdrInfo.hdr,
      hdrInfo.dictDoc,
      bKey,
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
    if (!source?.isFetchNetworkSource) {
      const localPages = await getJson(`data/pages/${lang}/${ed}.pages.json`);
      if (localPages) return localPages;
    }
    const cat = await loadCatalog();
    return buildCanonical80BlocksPagesIndex(cat, lang, ed);
  }

  async function loadBlockPdf(lang, edition, blockId) {
    const ed = normalizeEditionSlug(edition);
    const normBlock = String(blockId || "")
      .trim()
      .replace(/^BLK-0?(\d{2})$/i, "B$1");
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed) || !/^B\d{2}$/.test(normBlock)) return null;
    return null;
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
              provenance: chapterRes.provenance || null,
              corpusRev: chapterRes.corpusRev || null,
            }
            : null,
        meta: {
          draft_status:
            chapterRes.provenance?.status ||
            chapterRes.provenance?.sovereign_tier ||
            "",
          provenance: chapterRes.provenance || null,
          corpusRev: chapterRes.corpusRev || null,
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
    loadJson,
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
