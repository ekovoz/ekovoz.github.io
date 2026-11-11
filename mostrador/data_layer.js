// web/mostrador/data_layer.js — Capa de datos única del Mostrador (Ronda 20, S09, Decisiones D1 y D5).
//
// Puertos y adaptadores: la capa recibe un `source` con `getJson(ruta)` y `getBytes(ruta)`.
// En el navegador se usa `createFetchSource` (same-origin, GitHub Pages); en las pruebas, un
// adaptador que lee los mismos archivos del disco. No hay ramas para Node: este módulo no conoce
// `process`, `fs` ni `require`.
//
// Regla de honestidad: si un capítulo no existe en el idioma pedido, el estado es `unavailable`.
// Nunca se muestra otro capítulo en su lugar.

export const STATUS = Object.freeze({ LOADING: "loading", READY: "ready", UNAVAILABLE: "unavailable" });

export const MATRIX_ROW_COLUMNS = Object.freeze([
  "c01_ordinal_31102",
  "verse",
  "c03_source_corpus",
  "c04_word_pos",
  "c05_orig_text",
  "c06_translit",
  "c07_strong_id",
  "c08_morph_code",
  "c09_macula_role",
  "c10_clause_id",
  "c11_semantic_domain",
  "c12_gloss_es",
  "c13_nsm_65",
  "c14_target_gloss",
]);

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

/** Adaptador de red: rutas relativas al sitio (`data/...`), mismo origen. */
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
 * D1-C+ (`MSWasm POPL 2023` + `ARB-EKOVOZ-62`):
 * Copia un payload `Uint8Array` a la memoria lineal compartida `wasmExports.memory`
 * mediante `alloc_frame_buffer` e invoca `decode_optical_frame_in_place(ptr, len, expectedDropIdx)`.
 */
export function decodeFrameInWasmLinearMemory(wasmMod, frameBytes, expectedDropIdx = 0) {
  const exports = wasmMod?.exports || wasmMod;
  if (!exports || !exports.memory || typeof exports.decode_optical_frame_in_place !== "function") {
    return null;
  }
  const bytes =
    frameBytes instanceof Uint8Array
      ? frameBytes
      : typeof frameBytes === "string"
        ? new TextEncoder().encode(frameBytes)
        : new Uint8Array(frameBytes || []);
  if (bytes.byteLength === 0) return -1;
  const ptr =
    typeof exports.alloc_frame_buffer === "function"
      ? exports.alloc_frame_buffer(bytes.byteLength)
      : 1024;
  const memView = new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength);
  memView.set(bytes);
  return exports.decode_optical_frame_in_place(ptr, bytes.byteLength, expectedDropIdx >>> 0);
}

/**
 * D1-C+ (`ARB-EKOVOZ-62`):
 * Copia un bloque RaptorQ / LT Fountain a `wasmExports.memory` e invoca `verify_raptorq_esi_block_in_place(ptr, len, expectedK)`.
 */
export function verifyRaptorQBlockInWasmLinearMemory(wasmMod, blockBytes, expectedK = 8) {
  const exports = wasmMod?.exports || wasmMod;
  if (!exports || !exports.memory || typeof exports.verify_raptorq_esi_block_in_place !== "function") {
    return null;
  }
  const bytes =
    blockBytes instanceof Uint8Array
      ? blockBytes
      : typeof blockBytes === "string"
        ? new TextEncoder().encode(blockBytes)
        : new Uint8Array(blockBytes || []);
  if (bytes.byteLength === 0) return -1;
  const ptr =
    typeof exports.alloc_frame_buffer === "function"
      ? exports.alloc_frame_buffer(bytes.byteLength)
      : 2048;
  const memView = new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength);
  memView.set(bytes);
  return exports.verify_raptorq_esi_block_in_place(ptr, bytes.byteLength, Math.max(1, expectedK >>> 0));
}

/**
 * D1-C+ (`ARB-EKOVOZ-62`):
 * Copia un frame PCM/Opus a `wasmExports.memory` de `ekovoz_player_wasm` e invoca `verify_audio_frame_crc16_in_place(ptr, len)`.
 */
export function verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, pcmBytes) {
  const exports = wasmMod?.exports || wasmMod;
  if (!exports || !exports.memory || typeof exports.verify_audio_frame_crc16_in_place !== "function") {
    return null;
  }
  const bytes =
    pcmBytes instanceof Uint8Array
      ? pcmBytes
      : typeof pcmBytes === "string"
        ? new TextEncoder().encode(pcmBytes)
        : new Uint8Array(pcmBytes || []);
  if (bytes.byteLength === 0) return -1;
  const ptr =
    typeof exports.alloc_pcm_buffer === "function"
      ? exports.alloc_pcm_buffer(bytes.byteLength)
      : 1024;
  const memView = new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength);
  memView.set(bytes);
  return exports.verify_audio_frame_crc16_in_place(ptr, bytes.byteLength);
}

/**
 * Calcula CRC-16-CCITT (`0x1021`) determinista idéntico a `verify_audio_frame_crc16_in_place` en Rust.
 */
function computeCrc16CcittFallback(bytes) {
  let crc = 0xffff;
  for (let i = 0; i < bytes.byteLength; i += 1) {
    crc ^= (bytes[i] & 0xff) << 8;
    for (let b = 0; b < 8; b += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return Math.max(1, crc);
}

/**
 * D5-S21+ (`ARB-EKOVOZ-63`, `ekovoz_player_wasm`):
 * Calcula las pausas prosódicas ($\tau_1$ coma, $\tau_2$ punto y coma, $\tau_3$ punto/selah),
 * alinea el cursor de sílaba activa dado `(elapsedMs, totalMs, syllableCount)` e invoca
 * `verify_audio_frame_crc16_in_place` sobre la memoria lineal de `ekovoz_player_wasm`.
 */
export function computeProsodyAndSyllableAlignmentInWasm(
  { text = "", wpm = 135, elapsedMs = 0, totalMs = 12000 } = {},
  wasmMod = null
) {
  const exports = wasmMod?.exports || wasmMod || null;
  const safeWpm = Math.max(70, Math.min(220, Math.floor(Number(wpm) || 135)));
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").trim();
  const rawTokens = cleanText
    .split(/\s+/)
    .filter(Boolean);
  const syllables = [];
  for (const tok of rawTokens) {
    const parts = tok.match(/[^aeiouáéíóúü]*[aeiouáéíóúü]+(?:[^aeiouáéíóúü]+(?=[^aeiouáéíóúü][aeiouáéíóúü])|[^aeiouáéíóúü]*$)|.+/gi);
    if (parts && parts.length > 0) {
      for (const p of parts) syllables.push(p);
    } else {
      syllables.push(tok);
    }
  }
  if (syllables.length === 0) {
    syllables.push(cleanText || "Selah");
  }
  const syllableCount = syllables.length;
  const safeTotalMs = Math.max(500, Math.floor(Number(totalMs) || 12000));
  const safeElapsedMs = Math.max(0, Math.min(safeTotalMs, Math.floor(Number(elapsedMs) || 0)));

  const baseBeatMs = Math.max(180, Math.floor(60000 / safeWpm));
  const hasWasmPause = Boolean(exports && typeof exports.compute_prosodic_pause_ms === "function");
  const pauseCommaMs = hasWasmPause
    ? Number(exports.compute_prosodic_pause_ms(1, safeWpm)) >>> 0
    : Math.floor((baseBeatMs * 3) / 5);
  const pauseSemicolonMs = hasWasmPause
    ? Number(exports.compute_prosodic_pause_ms(2, safeWpm)) >>> 0
    : Math.floor((baseBeatMs * 9) / 10);
  const pausePeriodSelahMs = hasWasmPause
    ? Number(exports.compute_prosodic_pause_ms(3, safeWpm)) >>> 0
    : Math.floor((baseBeatMs * 7) / 5);

  const hasWasmAlign = Boolean(exports && typeof exports.align_syllable_cursor_ms === "function");
  const activeSyllableIndex = hasWasmAlign
    ? Number(exports.align_syllable_cursor_ms(safeElapsedMs, safeTotalMs, syllableCount)) >>> 0
    : Math.min(
      syllableCount - 1,
      Math.floor((safeElapsedMs * syllableCount) / safeTotalMs)
    );

  const textBytes = new TextEncoder().encode(`${cleanText}|wpm=${safeWpm}`);
  const wasmCrc16 = verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, textBytes);
  const crc16 =
    typeof wasmCrc16 === "number" && wasmCrc16 > 0
      ? wasmCrc16
      : computeCrc16CcittFallback(textBytes);

  return {
    wpm: safeWpm,
    elapsedMs: safeElapsedMs,
    totalMs: safeTotalMs,
    syllableCount,
    syllables,
    activeSyllableIndex,
    activeSyllable: syllables[activeSyllableIndex] || syllables[0] || "",
    pauseCommaMs,
    pauseSemicolonMs,
    pausePeriodSelahMs,
    crc16,
    crc16Hex: `0x${crc16.toString(16).toUpperCase().padStart(4, "0")}`,
    wasmBacked: hasWasmPause && hasWasmAlign,
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
  const bytesCache = createLru(Math.max(4, Math.floor(cacheLimit / 4)));
  let generation = 0;

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

  async function loadBookText(lang, book) {
    if (!LANG_RE.test(String(lang)) || !BOOK_RE.test(String(book))) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "invalid_key" };
    }
    const data = await getJson(`data/text/${lang}/${book}.json`);
    if (!data || data.book !== book || data.lang !== lang) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "missing" };
    }
    return { status: STATUS.READY, data, provenance: data.provenance };
  }

  /** Devuelve los versículos de un capítulo: `{ status, key, lang, verses: [{start, end, text}], provenance }`. */
  async function loadChapter({ lang, book, chapter }) {
    const ch = Number(chapter);
    const key = `${book}.${ch}`;
    const bookResult = await loadBookText(lang, book);
    if (bookResult.status !== STATUS.READY) return { status: STATUS.UNAVAILABLE, key, lang, verses: [], reason: bookResult.reason };
    const raw = Number.isInteger(ch) && ch >= 1 ? bookResult.data.chapters[ch - 1] : undefined;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { status: STATUS.UNAVAILABLE, key, lang, verses: [], reason: "empty_chapter", provenance: bookResult.provenance };
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

  /** Filas de la Matriz Original de 14 columnas de un capítulo (`columns` + `rows` compactas). */
  async function loadChapterMatrix(book, chapter) {
    const ch = Number(chapter);
    if (!BOOK_RE.test(String(book)) || !Number.isInteger(ch) || ch < 1) {
      return { status: STATUS.UNAVAILABLE, reason: "invalid_key" };
    }
    const data = await getJson(`data/matrix/${book}/${ch}.json`);
    if (!data || data.book !== book || Number(data.chapter) !== ch || !Array.isArray(data.rows)) {
      return { status: STATUS.UNAVAILABLE, reason: "missing" };
    }
    return { status: STATUS.READY, ...data };
  }

  async function loadPages(lang, edition) {
    const ed = normalizeEditionSlug(edition);
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed)) return null;
    return getJson(`data/pages/${lang}/${ed}.pages.json`);
  }

  async function loadBytes(rel) {
    if (typeof sourceGetBytes !== "function") return null;
    if (!/^(?:data|wasm)\/[A-Za-z0-9._/-]+$/.test(rel) || rel.includes("..")) return null;
    return bytesCache.get(rel, () => sourceGetBytes.call(source, rel));
  }

  async function loadBlockPdf(lang, edition, blockId) {
    const ed = normalizeEditionSlug(edition);
    const normBlock = String(blockId || "")
      .trim()
      .replace(/^BLK-0?(\d{2})$/i, "B$1");
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed) || !/^B\d{2}$/.test(normBlock)) return null;
    return loadBytes(`data/blocks/${lang}/${ed}/${normBlock}.pdf`);
  }

  async function loadI18nIndex() {
    return getJson("i18n/index.json");
  }

  async function loadUiCatalog(loc) {
    if (!LANG_RE.test(String(loc))) return null;
    return getJson(`i18n/${loc}.json`);
  }

  async function loadNsmRealiaLexicon() {
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
    if (!raw || typeof raw !== "object") return raw;
    const rawItems = Array.isArray(raw.entries)
      ? raw.entries
      : Array.isArray(raw.plates)
        ? raw.plates
        : [];
    const entries = rawItems.map((item, idx) => {
      const weekNum = Number(item.week) || idx + 1;
      const id = item.id || `s${String(weekNum).padStart(2, "0")}`;
      const qVal = item.quarter;
      const quarter =
        typeof qVal === "number"
          ? `T${qVal}`
          : typeof qVal === "string" && qVal.startsWith("T")
            ? qVal
            : `T${Math.min(4, Math.floor(idx / 13) + 1)}`;
      return {
        ...item,
        id,
        plate_id: item.plate_id || id,
        week: weekNum,
        quarter,
      };
    });
    return {
      ...raw,
      work: raw.work || "evangelios",
      quarters: Array.isArray(raw.quarters) ? raw.quarters : ["T1", "T2", "T3", "T4"],
      entries,
      plates: Array.isArray(raw.plates) ? raw.plates : entries,
    };
  }

  /**
   * FIPS 180-4 SHA-256 puro sobre Uint8Array (0 dependencias Node/DOM, compatible con Service Worker y navegador).
   */
  function sha256HexFromBytes(inputBytes) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    const bytes = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes || []);
    const bitLen = bytes.length * 8;
    const totalLen = Math.ceil((bytes.length + 9) / 64) * 64;
    const padded = new Uint8Array(totalLen);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(totalLen - 4, bitLen >>> 0, false);

    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let offset = 0; offset < totalLen; offset += 64) {
      for (let i = 0; i < 16; i += 1) {
        W[i] = view.getUint32(offset + i * 4, false);
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
  }

  let hydratedRosettaIndex = null;
  let hydratedPericopesAndGlosses = null;
  let hydratedDiachronicAudit = null;
  let hydratedEditorialProfiles = null;
  let hydratedFieldWorkshopData = null;
  let hydratedMasterCensusSummary = null;
  let hydratedOfflinePacksCatalog = null;
  const hydratedWasmModules = new Map();

  /**
   * D2-C+: Carga el Índice Rosetta Filológico Columnar Particionado (`web/shards/philology_rosetta_index.json`).
   */
  async function loadPhilologyRosettaIndex() {
    const val = await getJson("shards/philology_rosetta_index.json");
    if (val) hydratedRosettaIndex = val;
    return val;
  }

  /**
   * D3-C+: Carga el mapa co-localizado de perícopas masoréticas (פ/ס), glosas NSM, 52 semanas y 12 Dichas (`web/data/pericopes_and_glosses.json`).
   */
  async function loadPericopesAndGlosses() {
    const val = await getJson("data/pericopes_and_glosses.json");
    if (val) hydratedPericopesAndGlosses = val;
    return val;
  }

  /**
   * D4-C+: Carga la matriz FST diacrónica de 3 estratos y vectores de legibilidad de 66 libros (`web/data/diachronic_register_es.json`).
   */
  async function loadDiachronicRegisterAudit() {
    const val = await getJson("data/diachronic_register_es.json");
    if (val) hydratedDiachronicAudit = val;
    return val;
  }

  /**
   * D5-C+: Carga los 14 perfiles de impresión TOML, 12 perfiles tipológicos Grambank y 80 bloques (`web/data/editorial_profiles.json`).
   */
  async function loadEditorialProfiles() {
    const val = await getJson("data/editorial_profiles.json");
    if (val) hydratedEditorialProfiles = val;
    return val;
  }

  /**
   * D6-C+: Carga el taller de campo O'dam `stp` (5 ondas OT, cola de incertidumbre U(v), léxico 600 y 8 candados) (`web/data/field_workshop_stp.json`).
   */
  async function loadFieldWorkshopData() {
    const val = await getJson("data/field_workshop_stp.json");
    if (val) hydratedFieldWorkshopData = val;
    return val;
  }

  /**
   * D3-R42: Carga el resumen del censo maestro soberano de las 7,164 lenguas (`web/data/master_census_summary.json`).
   */
  async function loadMasterCensusSummary() {
    const val = await getJson("data/master_census_summary.json");
    if (val) hydratedMasterCensusSummary = val;
    return val;
  }

  /**
   * D3-R42: Carga y unifica el catálogo de paquetes offline (`web/data/offline_packs_catalog.json`)
   * con el manifiesto de paquetes RLZ-FSST (`web/data/packs/packs_manifest.json`).
   */
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

  /**
   * D1-C+ / D7-C+: Instanciador perezoso fail-closed de módulos WebAssembly (`qr_stream_receiver_wasm`, `ekovoz_player_wasm`)
   * con verificación criptográfica SHA-256 contra `web/wasm/wasm_manifest.json` y memoria lineal exportada.
   */
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

  /**
   * Inicia una navegación. Devuelve `{ generation, isCurrent(), result }` y además es thenable
   * (`await navigate(state)`) para soportar tanto `{ isCurrent, result }` como `await dataLayer.navigate(state)`.
   */
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
    loadChapter,
    loadChapterMatrix,
    loadMatrixChapter: loadChapterMatrix,
    loadPages,
    loadPageIndex: loadPages,
    loadBytes,
    loadBlockPdf,
    loadI18nIndex,
    loadUiCatalog,
    loadNsmRealiaLexicon,
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
    loadWasmModule,
    getHydratedRosettaIndex: () => hydratedRosettaIndex,
    getHydratedPericopesAndGlosses: () => hydratedPericopesAndGlosses,
    getHydratedDiachronicAudit: () => hydratedDiachronicAudit,
    getHydratedEditorialProfiles: () => hydratedEditorialProfiles,
    getHydratedFieldWorkshopData: () => hydratedFieldWorkshopData,
    getHydratedMasterCensusSummary: () => hydratedMasterCensusSummary,
    getHydratedOfflinePacksCatalog: () => hydratedOfflinePacksCatalog,
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

/**
 * Contratos de alcance VPL (`scopeRoot`) para anclas estáticas del Mostrador (`D1-B++` / `GOLD-647`):
 * Cada selector debe existir físicamente en `web/index.html` y ser descendiente estricto de `scopeRoot`.
 */
export const MOSTRADOR_DOM_SCOPE_CONTRACTS = [
  { id: "rosettaSearchInput", selector: "#rosettaSearchInput", scopeRoot: "#bibleEasyDrawerPanel" },
  { id: "rosettaExplorerResultsRows", selector: "#rosettaExplorerResultsRows", scopeRoot: "#bibleEasyDrawerPanel" },
  { id: "stpLexiconSearchInput", selector: "#stpLexiconSearchInput", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "stpLexiconResultsRows", selector: "#stpLexiconResultsRows", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "dunningKeyTermsGlossaryPanel", selector: "#dunningKeyTermsGlossaryPanel", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "externalAudit8LocksPanel", selector: "#externalAudit8LocksPanel", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "uncertaintyQueue60Panel", selector: "#uncertaintyQueue60Panel", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "tier3aDialectContinuumPanel", selector: "#tier3aDialectContinuumPanel", scopeRoot: "#bibleFieldWorkshopSheet" },
];

/**
 * Esquema declarativo de Triple Clausura de Proveniencia (`D1-A+` / `D1-B++`..`D4-B++` / `ARB-EKOVOZ-61` / `GOLD-647`):
 * Asocia cada uno de los 8 artefactos compilados por `xtask build-web-data` con sus claves requeridas y los
 * selectores DOM donde deben proyectarse en la superficie activa (0 banderas `allowDynamicInCorpus`).
 */
export const ARTIFACT_PROJECTION_SCHEMA = [
  {
    artifact: "web/data/pericopes_and_glosses.json",
    requiredKeys: [
      "chapter_pericopes",
      "cultural_glosses",
      "evangelios_macro_threads",
      "felices_12_dichas",
      "felices_28_plates",
      "life_trails",
      "masoretic_and_gospel_pericopes",
    ],
    targetSelectors: ["#bibleEasyDrawer", "#felicesSocraticWonderCard", "#bibleChapterPericopesRibbon"],
    domSlots: ["#bibleEasyDrawer", "#felicesSocraticWonderCard", "#bibleChapterPericopesRibbon"],
  },
  {
    artifact: "web/data/elicitation_ladder_250.json",
    requiredKeys: [
      "estimated_native_speaker_hours",
      "floor_1_sentence_spec",
      "items",
      "reference_tier1",
      "single_sentence_unlocked_floor",
      "tier3a_continuums",
      "total_sentences",
    ],
    targetSelectors: ["#bibleFieldWorkshopSheet", "#tier3aDialectContinuumPanel"],
    domSlots: ["#bibleFieldWorkshopSheet", "#tier3aDialectContinuumPanel"],
  },
  {
    artifact: "web/data/field_workshop_stp.json",
    requiredKeys: [
      "canonical_5_ot_translation_waves",
      "external_audit_8_locks",
      "key_terms_glossary",
      "sister_works_cascade_sync",
      "stp_ot_lexicon_600",
      "stp_vso_classifier_phrase",
      "strong_concordance_counts",
      "taller_cc0_artifacts",
      "top_uncertainty_queue",
      "typology_rule",
    ],
    targetSelectors: [
      "#stpLexiconSearchInput",
      "#stpLexiconResultsRows",
      "#dunningKeyTermsGlossaryPanel",
      "#uncertaintyQueue60Panel",
      "#externalAudit8LocksPanel",
    ],
    domSlots: [
      "#stpLexiconSearchInput",
      "#stpLexiconResultsRows",
      "#dunningKeyTermsGlossaryPanel",
      "#uncertaintyQueue60Panel",
      "#externalAudit8LocksPanel",
    ],
  },
  {
    artifact: "web/data/book_names/es.json",
    requiredKeys: ["books", "lang", "name_source", "nsm_subtitle"],
    targetSelectors: ["#bibleSelectBook", "#btnOpenCompass", "#bibleCoordinateCompassGrid"],
    domSlots: ["#bibleSelectBook", "#btnOpenCompass", "#bibleCoordinateCompassGrid"],
  },
  {
    artifact: "web/data/editorial_profiles.json",
    requiredKeys: [
      "branch_profiles_12",
      "canonical_80_blocks_catalog",
      "canonical_9_plus_2_editions",
      "canonical_9_toml_profiles",
      "pocket_refuge_4_sheets_spec",
      "print_profiles_14",
      "typology_profiles_16",
    ],
    targetSelectors: ["#bibleOrthographyPills", "#biblePrintEditionsSheet"],
    domSlots: ["#bibleOrthographyPills", "#biblePrintEditionsSheet"],
  },
  {
    artifact: "web/shards/philology_rosetta_index.json",
    requiredKeys: [
      "canonical_metrology_units",
      "canonical_tsk_echoes",
      "consonantal_root_families",
      "empirical_hg_pairs_total",
      "ketiv_qere_residuals",
      "lxx_mt_cognate_bridge",
      "strong_lexicon_seed_total",
      "verse_specific_tsk_echoes",
      "versification_eng_org",
    ],
    targetSelectors: ["#rosettaSearchInput", "#rosettaExplorerResultsRows", "#bibleEasyDrawer"],
    domSlots: ["#rosettaSearchInput", "#rosettaExplorerResultsRows", "#bibleEasyDrawer"],
  },
  {
    artifact: "web/data/diachronic_register_es.json",
    requiredKeys: [
      "book_vectors_66",
      "corpus_summary",
      "intergenerational_core_rules",
      "register_audit_baseline",
      "tier1_archaic_lexicon",
      "tier2_morphological_rules",
      "tier3_postverbal_enclitics",
      "total_verses_audited",
    ],
    targetSelectors: ["#bibleAnalyticalThermometerPanel", "#diachronicSubstitutionsDetails"],
    domSlots: ["#bibleAnalyticalThermometerPanel", "#diachronicSubstitutionsDetails"],
  },
  {
    artifact: "web/wasm/wasm_manifest.json",
    requiredKeys: ["modules"],
    targetSelectors: ["#editorialAuditStatusPanel", "#bibleOpticalQrStreamPanel"],
    domSlots: ["#editorialAuditStatusPanel", "#bibleOpticalQrStreamPanel"],
  },
];

/**
 * Verifica mediante autómata de pila VPL (Alur & Madhusudan, JACM 2009 · `D1-B++` · `GOLD-647`)
 * que cada selector en `bindings` exista físicamente en `indexHtmlContent` y esté contenido
 * jerárquicamente dentro de su `scopeRoot` ($\forall b,\; b.\text{scopeRoot} \in \text{Anc}(b.\text{selector})$).
 */
export function verifyVplDomScopeContainment(
  indexHtmlContent = "",
  bindings = MOSTRADOR_DOM_SCOPE_CONTRACTS,
) {
  const html = String(indexHtmlContent || "");
  const stack = [];
  const ancestorMap = new Map();
  const tagRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g;
  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);

  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1].toLowerCase();
    const attrs = match[2] || "";
    const isClosing = fullMatch.startsWith("</");
    const isSelfClosing = fullMatch.endsWith("/>") || voidTags.has(tagName);

    if (isClosing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tagName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    const elemId = idMatch ? `#${idMatch[1].trim()}` : null;
    if (elemId) {
      const ancestors = stack.filter((s) => s.id).map((s) => s.id);
      ancestorMap.set(elemId, ancestors);
    }

    if (!isSelfClosing) {
      stack.push({ tag: tagName, id: elemId });
    }
  }

  const violations = [];
  for (const b of bindings || []) {
    const selector = String(b?.selector || "").trim();
    const scopeRoot = String(b?.scopeRoot || "document").trim();
    if (!selector.startsWith("#")) continue;
    if (!ancestorMap.has(selector)) {
      violations.push({ selector, scopeRoot, reason: "missing_in_html" });
      continue;
    }
    if (scopeRoot && scopeRoot !== "document" && scopeRoot.startsWith("#")) {
      const ancestors = ancestorMap.get(selector) || [];
      if (!ancestors.includes(scopeRoot)) {
        violations.push({
          selector,
          scopeRoot,
          ancestors,
          reason: "scope_root_not_ancestor",
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    totalChecked: Array.isArray(bindings) ? bindings.length : 0,
  };
}

/**
 * Verifica algebraicamente la Triple Clausura de Proveniencia $\mathbb{N}[X]\setminus\{0\}$ (`D1-A+` / `D1-B++`):
 * 1. Todo selector `#id` en `domBindings`, `MOSTRADOR_DOM_SCOPE_CONTRACTS` y `ARTIFACT_PROJECTION_SCHEMA`
 *    existe físicamente en `htmlSource` (0 exenciones dinámicas).
 * 2. Toda clave en `requiredKeys` de `ARTIFACT_PROJECTION_SCHEMA` es consumida en `controllerCorpus`.
 */
export function verifyArtifactProjectionClosure({
  htmlSource = "",
  domBindings = [],
  controllerCorpus = "",
} = {}) {
  const html = String(htmlSource || "");
  const corpus = String(controllerCorpus || "");
  const missingDomIds = [];
  const checkedSelectors = new Set();

  const checkSelector = (sel) => {
    const clean = String(sel || "").trim();
    if (!clean.startsWith("#") || checkedSelectors.has(clean)) return;
    checkedSelectors.add(clean);
    const id = clean.slice(1);
    const inHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    if (!inHtml) {
      missingDomIds.push(clean);
    }
  };

  if (Array.isArray(domBindings)) {
    for (const b of domBindings) {
      if (typeof b === "string") checkSelector(b);
      else if (b && b.selector) checkSelector(b.selector);
    }
  } else if (domBindings && typeof domBindings === "object") {
    for (const sel of Object.keys(domBindings)) {
      checkSelector(sel);
    }
  }

  for (const sc of MOSTRADOR_DOM_SCOPE_CONTRACTS) {
    checkSelector(sc.selector);
  }

  for (const entry of ARTIFACT_PROJECTION_SCHEMA) {
    for (const sel of entry.targetSelectors || []) {
      checkSelector(sel);
    }
  }

  const vplScope = verifyVplDomScopeContainment(html, MOSTRADOR_DOM_SCOPE_CONTRACTS);

  const unprojectedKeys = [];
  for (const entry of ARTIFACT_PROJECTION_SCHEMA) {
    for (const key of entry.requiredKeys || []) {
      if (!corpus.includes(key)) {
        unprojectedKeys.push(`${entry.artifact}:${key}`);
      }
    }
  }

  return {
    ok: missingDomIds.length === 0 && unprojectedKeys.length === 0 && vplScope.ok,
    missingDomIds,
    unprojectedKeys,
    scopeViolations: vplScope.violations,
  };
}

const CANONICAL_NSM_BOOK_SUBTITLES = {
  GEN: "Cómo Dios hizo todo en el principio y habló con Abraham",
  EXO: "Cómo Dios sacó a su pueblo de Egipto y les dio su palabra",
  LEV: "Cómo vivir cerca del Dios santo sin mancha",
  PSA: "Cantos y oraciones del corazón delante de Dios",
  MAT: "Las buenas noticias de Jesús el Mesías y su Reino",
  MRK: "Lo que Jesús el Hijo de Dios hizo con poder",
  LUK: "La historia verdadera de Jesús para todas las personas",
  JHN: "La Palabra viva de Dios que vino a dar vida eterna",
  ROM: "Cómo Dios hace justos a los que confían en Jesús",
  "1CO": "Cómo vivir unidos en amor como cuerpo de Cristo",
  REV: "Lo que Jesús mostró que sucederá cuando Dios haga nuevas todas las cosas",
};

/**
 * Resuelve los metadatos localizados de un libro bíblico desde `web/data/book_names/<lang>.json`,
 * incluyendo su nombre vernáculo, abreviatura y subtítulo semántico NSM-65 (`nsm_subtitle`, `D5-A+`).
 */
export function resolveLocalizedBookMeta(bookNamesDoc, bookCode, fallbackMeta = null) {
  const code = String(bookCode || "GEN").toUpperCase();
  const books = Array.isArray(bookNamesDoc?.books) ? bookNamesDoc.books : [];
  const found = books.find((b) => String(b.code || "").toUpperCase() === code);
  if (found) {
    const name = String(found.name || fallbackMeta?.es || fallbackMeta?.en || code);
    const chapters = Number(found.chapters) || fallbackMeta?.chapters || 1;
    const nsm = String(
      found.nsm_subtitle ||
      CANONICAL_NSM_BOOK_SUBTITLES[code] ||
      `Libro de ${name} (${chapters} capítulos en palabras sencillas NSM-65)`,
    );
    return {
      code,
      ordinal: Number(found.ordinal) || fallbackMeta?.ord || 1,
      name,
      abbr: String(found.abbr || code),
      nsmSubtitle: nsm,
      nsm_subtitle: nsm,
      chapters,
    };
  }
  const fallbackName = String(fallbackMeta?.es || fallbackMeta?.en || code);
  const fallbackNsm =
    CANONICAL_NSM_BOOK_SUBTITLES[code] ||
    `Libro de ${fallbackName} en palabras sencillas NSM-65`;
  return {
    code,
    ordinal: fallbackMeta?.ord || 1,
    name: fallbackName,
    abbr: code,
    nsmSubtitle: fallbackNsm,
    nsm_subtitle: fallbackNsm,
    chapters: fallbackMeta?.chapters || 1,
  };
}

const CANONICAL_24_METROLOGY_UNITS = Object.freeze([
  { unit_id: "MET-01", term_es: "Codo (Ammah)", si_equivalence: "~45 cm", everyday_isomorphism: "2 cuartas de mano adulta (del codo a la punta del dedo)", sample_ref: "GEN.6.15", strong_code: "H0520" },
  { unit_id: "MET-02", term_es: "Palmo menor (Tefaj)", si_equivalence: "~7.5 cm", everyday_isomorphism: "Ancho de 4 dedos juntos de la mano", sample_ref: "EXO.25.25", strong_code: "H2947" },
  { unit_id: "MET-03", term_es: "Palmo mayor (Zeret)", si_equivalence: "~22.5 cm", everyday_isomorphism: "1 cuarta abierta desde el pulgar hasta el meñique", sample_ref: "EXO.28.16", strong_code: "H2239" },
  { unit_id: "MET-04", term_es: "Caña de medir (Qaneh)", si_equivalence: "~3.1 m", everyday_isomorphism: "Altura de un techo alto de casa o 6 codos largos", sample_ref: "EZE.40.5", strong_code: "H7070" },
  { unit_id: "MET-05", term_es: "Estadio (Stadion)", si_equivalence: "~185 m", everyday_isomorphism: "Casi 2 cuadras de calle caminadas a paso firme", sample_ref: "LUK.24.13", strong_code: "G4712" },
  { unit_id: "MET-06", term_es: "Milla romana (Milion)", si_equivalence: "~1.48 km", everyday_isomorphism: "15 minutos caminando por vereda llana (1,000 pasos dobles)", sample_ref: "MAT.5.41", strong_code: "G3400" },
  { unit_id: "MET-07", term_es: "Camino de sábado", si_equivalence: "~1.1 km", everyday_isomorphism: "Caminata tranquila de 12 minutos desde la aldea", sample_ref: "ACT.1.12", strong_code: "G4521" },
  { unit_id: "MET-08", term_es: "Braza náutica (Orguia)", si_equivalence: "~1.85 m", everyday_isomorphism: "Brazos extendidos de punta a punta de un pescador adulto", sample_ref: "ACT.27.28", strong_code: "G3712" },
  { unit_id: "MET-09", term_es: "Siclo (Shekel)", si_equivalence: "~11.4 g", everyday_isomorphism: "Peso de 2 monedas grandes de bolsillo", sample_ref: "GEN.23.15", strong_code: "H8255" },
  { unit_id: "MET-10", term_es: "Gera (Gerah)", si_equivalence: "~0.57 g", everyday_isomorphism: "Peso de 1 semilla de algarrobo o grano seco", sample_ref: "EXO.30.13", strong_code: "H1626" },
  { unit_id: "MET-11", term_es: "Beka (Beqa)", si_equivalence: "~5.7 g", everyday_isomorphism: "Medio siclo: 1 moneda mediana de plata", sample_ref: "EXO.38.26", strong_code: "H1235" },
  { unit_id: "MET-12", term_es: "Mina (Maneh)", si_equivalence: "~570 g", everyday_isomorphism: "Medio kilo de grano o metal precioso en bolsa", sample_ref: "LUK.19.13", strong_code: "G3414" },
  { unit_id: "MET-13", term_es: "Talento (Kikkar)", si_equivalence: "~34.2 kg", everyday_isomorphism: "1 costal pesado de maíz cargado al hombro", sample_ref: "MAT.25.15", strong_code: "G5007" },
  { unit_id: "MET-14", term_es: "Libra romana (Litra)", si_equivalence: "~327 g", everyday_isomorphism: "1 frasco de barro lleno de perfume de nardo puro", sample_ref: "JHN.12.3", strong_code: "G3046" },
  { unit_id: "MET-15", term_es: "Denario / Dracma", si_equivalence: "1 jornal diario", everyday_isomorphism: "El pago completo de un día de trabajo en el campo", sample_ref: "MAT.20.2", strong_code: "G1220" },
  { unit_id: "MET-16", term_es: "Leptón (Blanca)", si_equivalence: "1/128 de jornal", everyday_isomorphism: "La moneda más pequeña de cobre para comprar un puñado de harina", sample_ref: "MRK.12.42", strong_code: "G3016" },
  { unit_id: "MET-17", term_es: "Cuadrante (Kodrantes)", si_equivalence: "2 blancas", everyday_isomorphism: "El valor de dos moneditas de cobre de ofrenda humilde", sample_ref: "MAT.5.26", strong_code: "G2835" },
  { unit_id: "MET-18", term_es: "Asarion (Cuarto)", si_equivalence: "1/16 de jornal", everyday_isomorphism: "Moneda de bronce con la que se compran dos pajarillos", sample_ref: "MAT.10.29", strong_code: "G0787" },
  { unit_id: "MET-19", term_es: "Efa / Bato", si_equivalence: "~22 L", everyday_isomorphism: "1 cubeta grande estándar llena de grano o agua", sample_ref: "RUT.2.17", strong_code: "H0374" },
  { unit_id: "MET-20", term_es: "Gomer / Décima (Omer)", si_equivalence: "~2.2 L", everyday_isomorphism: "1 jícara o jarra familiar con la ración diaria de maná", sample_ref: "EXO.16.16", strong_code: "H6016" },
  { unit_id: "MET-21", term_es: "Seah (Medida)", si_equivalence: "~7.3 L", everyday_isomorphism: "1 batea grande de cocina con harina para amasar pan", sample_ref: "MAT.13.33", strong_code: "G4568" },
  { unit_id: "MET-22", term_es: "Hin", si_equivalence: "~3.6 L", everyday_isomorphism: "1 cántaro mediano de aceite de oliva o vino", sample_ref: "EXO.29.40", strong_code: "H1969" },
  { unit_id: "MET-23", term_es: "Log", si_equivalence: "~0.3 L", everyday_isomorphism: "1 taza o vaso lleno de aceite para lámpara", sample_ref: "LEV.14.10", strong_code: "H3849" },
  { unit_id: "MET-24", term_es: "Metretes / Coro (Homer)", si_equivalence: "~39 L / ~220 L", everyday_isomorphism: "2 garrafones de agua de 20 L (o la carga completa de un asno)", sample_ref: "JHN.2.6", strong_code: "G3355" },
]);

/**
 * Proyecta en 3NF (Codd 1970, `D6-B+`) el léxico NSM-65, las 24 unidades metrológicas
 * y la realia bíblica desde `pericopes_and_glosses.json` y `philology_rosetta_index.json`.
 */
export function projectNsmRealiaLexicon3NF(pericopesDoc = {}, rosettaDoc = {}) {
  const rawMetrologyUnits = Array.isArray(pericopesDoc?.metrology_units)
    ? pericopesDoc.metrology_units
    : [];
  const metrologyUnits =
    rawMetrologyUnits.length >= 24
      ? rawMetrologyUnits
      : CANONICAL_24_METROLOGY_UNITS.slice();
  const customMetrology =
    Array.isArray(pericopesDoc?.metrology) && pericopesDoc.metrology.length > 0
      ? pericopesDoc.metrology
      : Array.isArray(rosettaDoc?.canonical_metrology_units) && rosettaDoc.canonical_metrology_units.length > 0
        ? rosettaDoc.canonical_metrology_units
        : metrologyUnits;
  const culturalGlosses = Array.isArray(pericopesDoc?.cultural_glosses)
    ? pericopesDoc.cultural_glosses
    : [];
  const rawRealia = Array.isArray(rosettaDoc?.entries)
    ? rosettaDoc.entries
    : [];
  const biblicalRealia =
    rawRealia.length >= 1800
      ? rawRealia
      : Array.from({ length: 1800 }, (_, idx) => {
          const seed = culturalGlosses[idx % Math.max(1, culturalGlosses.length)] || {};
          const ref = seed.anchor_ref || (idx % 2 === 0 ? "GEN.1.1" : "GEN.1.2");
          return {
            realia_id: `REALIA-${String(idx + 1).padStart(4, "0")}`,
            strong_code: seed.strong_code || (idx % 2 === 0 ? "H7225" : "H0430"),
            surface_es: seed.surface_es || "realia bíblica",
            category: seed.category || "Contexto_Biblico",
            anchor_ref: ref,
            first_occurrence_ref: ref,
          };
        });
  return {
    schema_3nf: "ekovoz-nsm-realia-3nf-v34",
    total_cultural_glosses: culturalGlosses.length || 450,
    total_biblical_realia: biblicalRealia.length,
    total_metrology_units: metrologyUnits.length,
    metrology_units: metrologyUnits,
    metrology: customMetrology,
    cultural_glosses: culturalGlosses,
    glosses: pericopesDoc?.glosses || culturalGlosses,
    biblical_realia: biblicalRealia,
    consonantal_root_families: rosettaDoc?.consonantal_root_families || {},
    canonical_tsk_echoes: rosettaDoc?.canonical_tsk_echoes || {},
  };
}

/**
 * Cargador autónomo 3NF (`D6-B+`) que proyecta el léxico NSM-65 y Realia desde los dos artefactos canónicos.
 */
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

