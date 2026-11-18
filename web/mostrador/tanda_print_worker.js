// @req[BIB-V2-18] @req[BIB-V2-19] Web Worker soberano de Tandas y Streaming PDF (`D5-V2G`, `D6-V2G`, `D7-V2G` · `ARB-EKOVOZ-96`):
// - Purgado al 100% cualquier fallback PDF de 8 bits heredado (`DEBRIS-V2G-11` eliminado: solo OpenType `/Type0` + `Identity-H`).
// - Carga tipográfica Same-Origin `/packs/fonts/<Font>.ttf.zst` (`Zstd-22`) descomprimida con `ruzstd` (`ekovoz_player_wasm.wasm`)
//   y persistida en `ekovoz_vault_v2` IndexedDB (`DEBRIS-V2G-13b` eliminado: `0` peticiones a `editions-01/fonts/*`).
// - Harel FSM determinista `FONT_HAREL_FSM` (`IDLE -> VAULT -> ZST_NETWORK -> READY_OPENTYPE | OFFLINE_CSS_FALLBACK`) con `0` promesas colgadas.
// - Streaming multi-tanda `StreamingPdfSession` (`wasm_pdf_session_begin/push_tanda/finish`): `/FontFile2` 1 sola vez en Chunk 0,
//   concatenación del `100%` de `tandas[0..N]` sin truncar en 50 páginas y `M_RAM <= 8 MiB` constante (`< 14 MiB`).

import {
  decodeRfc8878RawZstdFrameJs,
  loadFontBytesFromVault,
  storeFontBytesInVault,
} from "./offline_mesh.js";

const MAX_WORKER_RAM_CEILING_BYTES = 14 * 1024 * 1024;

const FONT_HAREL_STATES = Object.freeze({
  IDLE: "IDLE",
  TIER0_CORE_CHECK: "TIER0_CORE_CHECK",
  PROBING_VAULT: "PROBING_VAULT",
  FETCHING_SAME_ORIGIN_ZST: "FETCHING_SAME_ORIGIN_ZST",
  READY_OPENTYPE: "READY_OPENTYPE",
  HARFBUZZ_READY: "HARFBUZZ_READY",
  OFFLINE_CSS_FALLBACK: "OFFLINE_CSS_FALLBACK",
});

export function createFontLoadingHarelFsm() {
  let state = FONT_HAREL_STATES.IDLE;
  const history = [state];
  return {
    get state() {
      return state;
    },
    get history() {
      return history.slice();
    },
    transition(nextState) {
      if (FONT_HAREL_STATES[nextState]) {
        state = FONT_HAREL_STATES[nextState];
        history.push(state);
      }
      return state;
    },
  };
}

const FONT_FILE_BY_SCRIPT = {
  Arab: "NotoNaskhArabic-Regular.ttf",
  Aran: "NotoNastaliqUrdu-Regular.ttf",
  Syrc: "NotoSansSyriac-Regular.ttf",
  Hebr: "Cardo-Regular.ttf",
  Grek: "EBGaramond-Regular.ttf",
  Cyrl: "NotoSans-Regular.ttf",
  Deva: "NotoSansDevanagari-Regular.ttf",
  Beng: "NotoSansBengali-Regular.ttf",
  Guru: "NotoSansGurmukhi-Regular.ttf",
  Gujr: "NotoSansGujarati-Regular.ttf",
  Orya: "NotoSansOriya-Regular.ttf",
  Taml: "NotoSansTamil-Regular.ttf",
  Telu: "NotoSansTelugu-Regular.ttf",
  Knda: "NotoSansKannada-Regular.ttf",
  Mlym: "NotoSansMalayalam-Regular.ttf",
  Sinh: "NotoSansSinhala-Regular.ttf",
  Thaa: "NotoSansThaana-Regular.ttf",
  Tibt: "NotoSerifTibetan-Regular.ttf",
  Hans: "NotoSansSC-Regular.ttf",
  Hant: "NotoSansTC-Regular.ttf",
  Jpan: "NotoSansJP-Regular.ttf",
  Hang: "NotoSansKR-Regular.ttf",
  Kore: "NotoSansKR-Regular.ttf",
  Thai: "NotoSansThai-Regular.ttf",
  Laoo: "NotoSansLao-Regular.ttf",
  Khmr: "NotoSansKhmer-Regular.ttf",
  Mymr: "NotoSansMyanmar-Regular.ttf",
  Ethi: "NotoSansEthiopic-Regular.ttf",
  Tfng: "NotoSansTifinagh-Regular.ttf",
  Geor: "NotoSerifGeorgian-Regular.ttf",
  Armn: "NotoSerifArmenian-Regular.ttf",
  Latn: "CharisSIL-Regular.ttf",
};

// Tabla 3NF completa ISO 639-1 + ISO 639-3 -> ISO 15924 (0 truncamiento a 2 letras, D7-V2G)
const ISO639_TO_ISO15924 = {
  ar: "Arab", ara: "Arab", arb: "Arab", arq: "Arab", arz: "Arab",
  fa: "Arab", fas: "Arab", pes: "Arab", prs: "Arab", ps: "Arab", pus: "Arab", ug: "Arab", uig: "Arab",
  ur: "Aran", urd: "Aran", pnb: "Aran", ks: "Aran", kas: "Aran",
  syr: "Syrc", syc: "Syrc", aii: "Syrc",
  he: "Hebr", heb: "Hebr", hbo: "Hebr", yi: "Hebr", ydd: "Hebr",
  grc: "Grek", el: "Grek", ell: "Grek", pnt: "Grek",
  ru: "Cyrl", rus: "Cyrl", uk: "Cyrl", ukr: "Cyrl", be: "Cyrl", bel: "Cyrl", bg: "Cyrl", bul: "Cyrl",
  sr: "Cyrl", srp: "Cyrl", mk: "Cyrl", mkd: "Cyrl", kk: "Cyrl", kaz: "Cyrl", ky: "Cyrl", kir: "Cyrl",
  tg: "Cyrl", tgk: "Cyrl", mn: "Cyrl", khk: "Cyrl", tt: "Cyrl", tat: "Cyrl",
  hi: "Deva", hin: "Deva", mr: "Deva", mar: "Deva", ne: "Deva", nep: "Deva", npi: "Deva",
  mai: "Deva", bho: "Deva", awa: "Deva", sa: "Deva", san: "Deva",
  bn: "Beng", ben: "Beng", as: "Beng", asm: "Beng",
  pa: "Guru", pan: "Guru",
  gu: "Gujr", guj: "Gujr",
  or: "Orya", ori: "Orya", ory: "Orya",
  ta: "Taml", tam: "Taml",
  te: "Telu", tel: "Telu",
  kn: "Knda", kan: "Knda",
  ml: "Mlym", mal: "Mlym",
  si: "Sinh", sin: "Sinh",
  dv: "Thaa", div: "Thaa",
  bo: "Tibt", bod: "Tibt", dz: "Tibt", dzo: "Tibt",
  zh: "Hans", zho: "Hans", cmn: "Hans", wuu: "Hans", yue: "Hant",
  ja: "Jpan", jpn: "Jpan",
  ko: "Hang", kor: "Hang",
  th: "Thai", tha: "Thai", nod: "Thai", sou: "Thai",
  lo: "Laoo", lao: "Laoo",
  km: "Khmr", khm: "Khmr",
  my: "Mymr", mya: "Mymr", shn: "Mymr", kar: "Mymr",
  am: "Ethi", amh: "Ethi", ti: "Ethi", tir: "Ethi", gez: "Ethi", wal: "Ethi",
  tzm: "Tfng", shi: "Tfng", kab: "Latn",
  ka: "Geor", kat: "Geor",
  hy: "Armn", hye: "Armn",
};

let cachedWorkerWasmExports = null;
let cachedPlayerWasmExports = null;
const cachedFontBytes = new Map();

export function resolveScriptIso15924ForLang(lang = "es", explicitScript = "") {
  const cleanScript = String(explicitScript || "").trim();
  if (cleanScript && FONT_FILE_BY_SCRIPT[cleanScript]) return cleanScript;
  const raw = String(lang || "es").trim().toLowerCase();
  if (raw.includes("hant") || raw === "zh-tw" || raw === "zh-hk" || raw === "zh-mo") return "Hant";
  if (raw.includes("hans") || raw === "zh-cn" || raw === "zh-sg") return "Hans";
  for (const subtag of raw.split("-")) {
    if (subtag.length === 4) {
      const titleCase = subtag[0].toUpperCase() + subtag.slice(1);
      if (FONT_FILE_BY_SCRIPT[titleCase]) return titleCase;
    }
  }
  const primary = raw.split("-")[0];
  return ISO639_TO_ISO15924[raw] || ISO639_TO_ISO15924[primary] || "Latn";
}

export function resolveFontFileForLangOrScript(lang = "es", script = "") {
  const iso15924 = resolveScriptIso15924ForLang(lang, script);
  return FONT_FILE_BY_SCRIPT[iso15924] || "CharisSIL-Regular.ttf";
}

async function ensureWorkerWasmExports(wasmUrlOverride = "", wasmBytesOverride = null) {
  if (wasmBytesOverride instanceof Uint8Array && wasmBytesOverride.byteLength > 8) {
    const instantiated = await WebAssembly.instantiate(wasmBytesOverride, {});
    cachedWorkerWasmExports = instantiated.instance.exports;
    return cachedWorkerWasmExports;
  }
  if (cachedWorkerWasmExports) return cachedWorkerWasmExports;
  if (typeof fetch === "function" && typeof WebAssembly === "object") {
    const targetUrl = wasmUrlOverride || new URL("./ekovoz_typeset_worker.wasm", import.meta.url);
    try {
      const res = await fetch(targetUrl);
      if (res && res.ok) {
        const bytes = await res.arrayBuffer();
        const instantiated = await WebAssembly.instantiate(bytes, {});
        cachedWorkerWasmExports = instantiated.instance.exports;
        return cachedWorkerWasmExports;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function ensurePlayerZstdWasmLoaded() {
  if (cachedPlayerWasmExports) return { exports: cachedPlayerWasmExports };
  if (typeof fetch === "function" && typeof WebAssembly === "object") {
    try {
      const res = await fetch(new URL("../wasm/ekovoz_player_wasm.wasm", import.meta.url));
      if (res && res.ok) {
        const bytes = await res.arrayBuffer();
        const instantiated = await WebAssembly.instantiate(bytes, {});
        cachedPlayerWasmExports = instantiated.instance.exports;
        return { exports: cachedPlayerWasmExports };
      }
    } catch {
      return null;
    }
  }
  return null;
}

function tier0OfflineCandidateForFont(fontFile) {
  if (fontFile === "CharisSIL-Regular.ttf") {
    return new URL("../assets/fonts/CharisSIL-Regular.ttf", import.meta.url);
  }
  if (fontFile === "Cardo-Regular.ttf" || fontFile === "NotoSansHebrew-Regular.ttf") {
    return new URL("../assets/fonts/Cardo-Hebrew-Biblical.ttf", import.meta.url);
  }
  if (fontFile === "EBGaramond-Regular.ttf") {
    return new URL("../assets/fonts/EBGaramond-Greek-Biblical.ttf", import.meta.url);
  }
  return null;
}

function cacheLoadedFontInRam(fontFile, rawTtfBytes) {
  if (cachedFontBytes.size >= 4 && !cachedFontBytes.has(fontFile)) {
    cachedFontBytes.delete(cachedFontBytes.keys().next().value);
  }
  cachedFontBytes.set(fontFile, rawTtfBytes);
  return rawTtfBytes;
}

async function ensureFontBytesLoaded(
  fontFile,
  fontUrlOverride = "",
  fontBytesOverride = null,
  fsm = null,
) {
  if (fontBytesOverride instanceof Uint8Array && fontBytesOverride.byteLength > 64) {
    fsm?.transition("READY_OPENTYPE");
    return cacheLoadedFontInRam(fontFile, fontBytesOverride);
  }
  if (cachedFontBytes.has(fontFile)) {
    fsm?.transition("READY_OPENTYPE");
    return cachedFontBytes.get(fontFile);
  }

  fsm?.transition("PROBING_VAULT");
  try {
    const vaulted = await loadFontBytesFromVault(fontFile);
    if (vaulted instanceof Uint8Array && vaulted.byteLength > 64) {
      fsm?.transition("READY_OPENTYPE");
      return cacheLoadedFontInRam(fontFile, vaulted);
    }
  } catch {
    // Vault unavailable in headless/mock environment
  }

  if (typeof fetch === "function") {
    fsm?.transition("FETCHING_SAME_ORIGIN_ZST");
    const tier0 = tier0OfflineCandidateForFont(fontFile);
    const sameOriginZstUrl = new URL(`../packs/fonts/${fontFile}.zst`, import.meta.url);
    const rootPacksZstUrl = new URL(`../../packs/fonts/${fontFile}.zst`, import.meta.url);
    const localAssetsRawUrl = new URL(`../../assets/fonts/${fontFile}`, import.meta.url);
    const candidates = fontUrlOverride
      ? [{ url: fontUrlOverride, isZst: String(fontUrlOverride).endsWith(".zst") }]
      : [
          tier0 ? { url: tier0, isZst: false } : null,
          { url: sameOriginZstUrl, isZst: true },
          { url: rootPacksZstUrl, isZst: true },
          { url: localAssetsRawUrl, isZst: false },
        ].filter(Boolean);

    for (const cand of candidates) {
      try {
        const res = await fetch(cand.url);
        if (res && res.ok) {
          let bytes = new Uint8Array(await res.arrayBuffer());
          const hasZstdMagic =
            bytes.byteLength >= 4 &&
            bytes[0] === 0x28 &&
            bytes[1] === 0xb5 &&
            bytes[2] === 0x2f &&
            bytes[3] === 0xfd;
          if ((cand.isZst || hasZstdMagic) && hasZstdMagic) {
            const playerWasm = await ensurePlayerZstdWasmLoaded();
            bytes = decodeRfc8878RawZstdFrameJs(bytes, playerWasm);
          }
          if (bytes instanceof Uint8Array && bytes.byteLength > 64) {
            storeFontBytesInVault(fontFile, bytes).catch(() => undefined);
            fsm?.transition("READY_OPENTYPE");
            return cacheLoadedFontInRam(fontFile, bytes);
          }
        }
      } catch {
        // Try next Same-Origin candidate
      }
    }
  }
  fsm?.transition("OFFLINE_CSS_FALLBACK");
  return null;
}

function executeWasmTandaTypeset(
  wasmExports,
  fontBytes,
  utf8Bytes,
  {
    bridgeFontBytes = null,
    bridgeUtf8Bytes = null,
    editionMode = 0,
    columns = 2,
    isLetter = false,
    isRtl = false,
    booklet4n = false,
    fontTenthsPt = 95,
    maxPages = 50,
  } = {},
) {
  if (
    !wasmExports ||
    !wasmExports.memory ||
    typeof wasmExports.wasm_alloc !== "function" ||
    typeof wasmExports.wasm_free !== "function"
  ) {
    return null;
  }
  const hasEditionMode = typeof wasmExports.typeset_tanda_pdf_edition_mode_in_place === "function";
  const hasDual4n = typeof wasmExports.typeset_tanda_pdf_dual_font_4n_in_place === "function";
  const hasSingle = typeof wasmExports.typeset_tanda_pdf_in_place === "function";
  if (!hasEditionMode && !hasDual4n && !hasSingle) {
    return null;
  }

  const f1Len = fontBytes.byteLength;
  const f2Len = bridgeFontBytes instanceof Uint8Array ? bridgeFontBytes.byteLength : 0;
  const tLen = utf8Bytes.byteLength;
  const bLen = bridgeUtf8Bytes instanceof Uint8Array ? bridgeUtf8Bytes.byteLength : 0;
  const outCap = Math.min(8 * 1024 * 1024, Math.max(131072, (tLen + bLen) * 6 + 262144));

  const f1Ptr = wasmExports.wasm_alloc(f1Len) >>> 0;
  const f2Ptr = (hasEditionMode || hasDual4n) && f2Len > 0 ? wasmExports.wasm_alloc(f2Len) >>> 0 : 0;
  const tPtr = wasmExports.wasm_alloc(tLen) >>> 0;
  const bPtr = (hasEditionMode || hasDual4n) && bLen > 0 ? wasmExports.wasm_alloc(bLen) >>> 0 : 0;
  const outPtr = wasmExports.wasm_alloc(outCap) >>> 0;
  if (!f1Ptr || !tPtr || !outPtr) {
    if (f1Ptr) wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    if (tPtr) wasmExports.wasm_free(tPtr, tLen);
    if (bPtr) wasmExports.wasm_free(bPtr, bLen);
    if (outPtr) wasmExports.wasm_free(outPtr, outCap);
    return null;
  }

  try {
    new Uint8Array(wasmExports.memory.buffer, f1Ptr, f1Len).set(fontBytes);
    if (f2Ptr && f2Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f2Ptr, f2Len).set(bridgeFontBytes);
    }
    new Uint8Array(wasmExports.memory.buffer, tPtr, tLen).set(utf8Bytes);
    if (bPtr && bLen > 0) {
      new Uint8Array(wasmExports.memory.buffer, bPtr, bLen).set(bridgeUtf8Bytes);
    }

    const safeCols = Math.max(1, Math.min(3, Number(columns) || 2));
    const safeTenths = Math.max(75, Math.min(180, Math.round(Number(fontTenthsPt) || 95)));
    const safePages = Math.max(1, Math.min(500, Number(maxPages) || 50));
    const safeMode = Math.max(0, Math.min(2, Number(editionMode) || 0));

    const written =
      safeMode > 0 && hasEditionMode
        ? wasmExports.typeset_tanda_pdf_edition_mode_in_place(
            f1Ptr,
            f1Len,
            f2Ptr,
            f2Len,
            tPtr,
            tLen,
            bPtr,
            bLen,
            safeMode,
            safeCols,
            isLetter ? 1 : 0,
            isRtl ? 1 : 0,
            booklet4n ? 1 : 0,
            safeTenths,
            safePages,
            outPtr,
            outCap,
          )
        : hasDual4n
          ? wasmExports.typeset_tanda_pdf_dual_font_4n_in_place(
              f1Ptr,
              f1Len,
              f2Ptr,
              f2Len,
              tPtr,
              tLen,
              bPtr,
              bLen,
              safeCols,
              isLetter ? 1 : 0,
              isRtl ? 1 : 0,
              booklet4n ? 1 : 0,
              safeTenths,
              safePages,
              outPtr,
              outCap,
            )
          : wasmExports.typeset_tanda_pdf_in_place(
              f1Ptr,
              f1Len,
              tPtr,
              tLen,
              safeCols,
              isLetter ? 1 : 0,
              isRtl ? 1 : 0,
              safeTenths,
              safePages,
              outPtr,
              outCap,
            );

    if (written > 0) {
      const pdfBytes = new Uint8Array(written);
      pdfBytes.set(new Uint8Array(wasmExports.memory.buffer, outPtr, written));
      return pdfBytes;
    }
    return null;
  } finally {
    wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    wasmExports.wasm_free(tPtr, tLen);
    if (bPtr) wasmExports.wasm_free(bPtr, bLen);
    wasmExports.wasm_free(outPtr, outCap);
  }
}

function executeWasmStreamingPdfSession(
  wasmExports,
  fontBytes,
  bridgeFontBytes,
  tandaSlices,
  {
    editionMode = 0,
    columns = 2,
    isLetter = false,
    isRtl = false,
    booklet4n = false,
    fontTenthsPt = 95,
    maxPagesPerTanda = 50,
  } = {},
  emitProgress = () => { },
  fontFile = "CharisSIL-Regular.ttf",
) {
  if (
    typeof wasmExports?.wasm_pdf_session_begin !== "function" ||
    typeof wasmExports?.wasm_pdf_session_push_tanda !== "function" ||
    typeof wasmExports?.wasm_pdf_session_finish !== "function"
  ) {
    return null;
  }
  const f1Len = fontBytes.byteLength;
  const f2Len = bridgeFontBytes instanceof Uint8Array ? bridgeFontBytes.byteLength : 0;
  const outCap = 4 * 1024 * 1024;
  const f1Ptr = wasmExports.wasm_alloc(f1Len) >>> 0;
  const f2Ptr = f2Len > 0 ? wasmExports.wasm_alloc(f2Len) >>> 0 : 0;
  const outPtr = wasmExports.wasm_alloc(outCap) >>> 0;
  if (!f1Ptr || !outPtr) {
    if (f1Ptr) wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    if (outPtr) wasmExports.wasm_free(outPtr, outCap);
    return null;
  }

  let sessionHandle = 0;
  try {
    new Uint8Array(wasmExports.memory.buffer, f1Ptr, f1Len).set(fontBytes);
    if (f2Ptr && f2Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f2Ptr, f2Len).set(bridgeFontBytes);
    }
    const safeCols = Math.max(1, Math.min(3, Number(columns) || 2));
    const safeTenths = Math.max(75, Math.min(180, Math.round(Number(fontTenthsPt) || 95)));
    const safePages = Math.max(1, Math.min(200, Number(maxPagesPerTanda) || 50));
    const safeMode = Math.max(0, Math.min(2, Number(editionMode) || 0));

    sessionHandle = wasmExports.wasm_pdf_session_begin(
      f1Ptr,
      f1Len,
      f2Ptr,
      f2Len,
      0,
      0,
      safeMode,
      safeCols,
      isLetter ? 1 : 0,
      isRtl ? 1 : 0,
      booklet4n ? 1 : 0,
      safeTenths,
      safePages,
    );
    if (sessionHandle <= 0) return null;

    const chunks = [];
    const tandas = [];
    let maxObservedRam = 65536;

    for (let idx = 0; idx < tandaSlices.length; idx += 1) {
      const { utf8, bridgeUtf8 } = tandaSlices[idx];
      const tLen = utf8.byteLength;
      const bLen = bridgeUtf8 ? bridgeUtf8.byteLength : 0;
      const tPtr = wasmExports.wasm_alloc(tLen) >>> 0;
      const bPtr = bLen > 0 ? wasmExports.wasm_alloc(bLen) >>> 0 : 0;
      try {
        new Uint8Array(wasmExports.memory.buffer, tPtr, tLen).set(utf8);
        if (bPtr && bLen > 0) {
          new Uint8Array(wasmExports.memory.buffer, bPtr, bLen).set(bridgeUtf8);
        }
        const chunkLen = wasmExports.wasm_pdf_session_push_tanda(
          sessionHandle,
          tPtr,
          tLen,
          bPtr,
          bLen,
          outPtr,
          outCap,
        );
        if (chunkLen < 0) return null;
        const chunkCopy = new Uint8Array(chunkLen);
        if (chunkLen > 0) {
          chunkCopy.set(new Uint8Array(wasmExports.memory.buffer, outPtr, chunkLen));
          chunks.push(chunkCopy);
        }
        const linearRam = wasmExports.memory.buffer.byteLength;
        if (linearRam > maxObservedRam) maxObservedRam = linearRam;
        emitProgress({
          type: "tanda-progress",
          tandaIndex: idx + 1,
          totalTandas: tandaSlices.length,
          bytes: chunkLen,
          peakRamBytes: linearRam,
          fontFile,
        });
        tandas.push({
          tandaIndex: idx + 1,
          totalTandas: tandaSlices.length,
          fontFile,
          pdfBytes: chunkCopy,
          peakRamBytes: Math.max(65536, linearRam),
        });
      } finally {
        wasmExports.wasm_free(tPtr, tLen);
        if (bPtr) wasmExports.wasm_free(bPtr, bLen);
      }
    }

    const tailLen = wasmExports.wasm_pdf_session_finish(sessionHandle, outPtr, outCap);
    sessionHandle = 0;
    if (tailLen <= 0) return null;
    const tailCopy = new Uint8Array(tailLen);
    tailCopy.set(new Uint8Array(wasmExports.memory.buffer, outPtr, tailLen));
    chunks.push(tailCopy);

    const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const fullPdf = new Uint8Array(totalLen);
    let cursor = 0;
    for (const c of chunks) {
      fullPdf.set(c, cursor);
      cursor += c.byteLength;
    }
    return { fullPdf, tandas, peakRamBytes: maxObservedRam };
  } finally {
    if (sessionHandle > 0 && typeof wasmExports.wasm_pdf_session_finish === "function") {
      try {
        wasmExports.wasm_pdf_session_finish(sessionHandle, outPtr, outCap);
      } catch {
        // Ignore cleanup
      }
    }
    wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    wasmExports.wasm_free(outPtr, outCap);
  }
}

export function typesetTandaWithCachedWasmSync({
  lang = "es",
  script = "",
  joinedText = "",
  bridgeJoinedText = "",
  editionMode = 0,
  columns = 2,
  paper = "a4",
  dir = "ltr",
  booklet4n = false,
  fontPt = 9.5,
  maxPages = 50,
  wasmBytes = null,
  fontBytes: fontBytesOverride = null,
  bridgeFontBytes: bridgeFontOverride = null,
} = {}) {
  const fontFile = resolveFontFileForLangOrScript(lang, script);
  if (!cachedWorkerWasmExports && wasmBytes instanceof Uint8Array && wasmBytes.byteLength > 8) {
    const mod = new WebAssembly.Module(wasmBytes);
    cachedWorkerWasmExports = new WebAssembly.Instance(mod, {}).exports;
  }
  if (!cachedFontBytes.has(fontFile) && fontBytesOverride instanceof Uint8Array && fontBytesOverride.byteLength > 64) {
    cacheLoadedFontInRam(fontFile, fontBytesOverride);
  }
  const fontBytes = cachedFontBytes.get(fontFile);
  if (!cachedWorkerWasmExports || !fontBytes) return null;
  const bridgeFont =
    bridgeFontOverride instanceof Uint8Array
      ? bridgeFontOverride
      : cachedFontBytes.get("CharisSIL-Regular.ttf") || null;
  const utf8Bytes = new TextEncoder().encode(String(joinedText || "Ekovoz Tanda"));
  const bridgeUtf8Bytes = bridgeJoinedText
    ? new TextEncoder().encode(String(bridgeJoinedText))
    : null;
  return executeWasmTandaTypeset(cachedWorkerWasmExports, fontBytes, utf8Bytes, {
    bridgeFontBytes: bridgeFont,
    bridgeUtf8Bytes,
    editionMode,
    columns,
    isLetter: String(paper || "a4").toLowerCase().includes("letter"),
    isRtl: String(dir || "ltr").toLowerCase() === "rtl",
    booklet4n: Boolean(booklet4n),
    fontTenthsPt: Math.round((Number(fontPt) || 9.5) * 10),
    maxPages,
  });
}

function encodeUtf16BeHexPdfString(str) {
  let hex = "<FEFF";
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    const cu = s.charCodeAt(i);
    if (cu < 0x20 && cu !== 0x09) continue;
    hex += cu.toString(16).toUpperCase().padStart(4, "0");
  }
  hex += ">";
  return hex;
}

/**
 * Emisor vectorial sincrónico de arranque frío libre de `/WinAnsiEncoding` y sin degradación `'-'` (`0x2D`) ni tope fijo de 50 páginas:
 * preserva el 100% de los puntos de código Unicode en hexadecimal UTF-16BE con `/ToUnicode` Identity CMap mientras se hidrata el Worker WASM.
 */
export function buildUnicodeColdSeedVectorPdf({
  lines = ["Ekovoz Tanda"],
  columns = 2,
  isLetter = false,
  isRtl = false,
  fontPt = 9.5,
  maxPages = 0,
  editionMode = 0,
} = {}) {
  const cols = editionMode === 2 ? 1 : Math.max(1, Math.min(3, Number(columns) || 2));
  const cleanPt = Math.max(7.5, Math.min(18.0, Number(fontPt) || 9.5));
  const pageW = isLetter ? 612 : 595;
  const pageH = isLetter ? 792 : 842;
  const marginLeft = 40;
  const marginRight = editionMode === 2 ? 127.56 : 40; // 45 mm CC0 notebook margin in Edition 16
  const marginY = 44;
  const gutter = 14;
  const colW = Math.max(120, pageW - marginLeft - marginRight - gutter * (cols - 1)) / cols;
  const lineH = Math.max(10, Math.round(cleanPt * 1.34));
  const linesPerCol = Math.max(16, Math.floor((pageH - marginY * 2) / lineH));
  const linesPerPage = linesPerCol * cols;
  const rawPageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  const pageCount = Number(maxPages) > 0 ? Math.min(Number(maxPages), rawPageCount) : rawPageCount;

  const pageStreams = [];
  for (let p = 0; p < pageCount; p += 1) {
    const slice = lines.slice(p * linesPerPage, (p + 1) * linesPerPage);
    let st = "";
    if (editionMode === 2) {
      // Pauta xerográfica >= 0.85 pt (>= 0.75 pt) en el margen de notas CC0 de 45 mm
      const noteX0 = (pageW - marginRight + 10).toFixed(1);
      const noteX1 = (pageW - 18).toFixed(1);
      st += "0.85 w ";
      for (let r = 0; r < linesPerCol; r += 2) {
        const gy = (pageH - marginY - r * lineH - 2).toFixed(1);
        st += `${noteX0} ${gy} m ${noteX1} ${gy} l S `;
      }
      st += "\n";
    }
    for (let i = 0; i < slice.length; i += 1) {
      const rawCol = Math.floor(i / linesPerCol);
      const effCol = isRtl ? cols - 1 - rawCol : rawCol;
      const row = i % linesPerCol;
      const x = (marginLeft + effCol * (colW + gutter)).toFixed(1);
      const y = (pageH - marginY - row * lineH).toFixed(1);
      st += `BT /F1 ${cleanPt.toFixed(1)} Tf ${x} ${y} Td ${encodeUtf16BeHexPdfString(slice[i])} Tj ET\n`;
    }
    pageStreams.push(st);
  }

  const totalObjs = 4 + pageCount * 2;
  const offsets = new Array(totalObjs + 1).fill(0);
  const chunks = [];
  let cursor = 0;
  const enc = new TextEncoder();
  const pushStr = (s) => {
    const b = enc.encode(s);
    chunks.push(b);
    cursor += b.byteLength;
  };
  const writeObj = (id, body) => {
    offsets[id] = cursor;
    pushStr(`${id} 0 obj\n${body}\nendobj\n`);
  };

  pushStr("%PDF-1.7\n");
  writeObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = Array.from({ length: pageCount }, (_, i) => `${5 + i * 2} 0 R`).join(" ");
  writeObj(2, `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageCount} >>`);
  writeObj(
    3,
    "<< /Type /Font /Subtype /Type0 /BaseFont /CharisSIL-Unicode /Encoding /Identity-H /DescendantFonts [ << /Type /Font /Subtype /CIDFontType2 /BaseFont /CharisSIL-Unicode /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> /DW 600 >> ] /ToUnicode 4 0 R >>",
  );
  const cmap =
    "/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /EkovozIdentityUTF16 def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange 1 beginbfrange <0020> <FFFD> <0020> endbfrange endcmap CMapName currentdict /CMap defineresource pop end end";
  writeObj(4, `<< /Length ${enc.encode(cmap).byteLength} >>\nstream\n${cmap}\nendstream`);

  for (let i = 0; i < pageCount; i += 1) {
    const pageId = 5 + i * 2;
    const contentId = 6 + i * 2;
    writeObj(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    const stLen = enc.encode(pageStreams[i]).byteLength;
    writeObj(contentId, `<< /Length ${stLen} >>\nstream\n${pageStreams[i]}endstream`);
  }

  const xrefOff = cursor;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= totalObjs; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF\n`;
  pushStr(xref);

  const out = new Uint8Array(cursor);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.byteLength;
  }
  return out;
}

export async function runWorkerTandaJob(payload = {}, emitProgress = () => { }) {
  const {
    lang = "es",
    script = "",
    book = "GEN",
    chapter = 1,
    verses = [],
    bridgeVerses = null,
    editionMode = 0,
    columns = 2,
    fontPt = 9.5,
    paper = "a4",
    dir = "ltr",
    booklet4n = false,
    maxPagesPerTanda = 50,
    wasmUrl = "",
    fontUrl = "",
    bridgeFontUrl = "",
    wasmBytes = null,
    fontBytes: fontBytesOverride = null,
    bridgeFontBytes: bridgeFontOverride = null,
  } = payload;

  const normalizeEntries = (raw) =>
    Array.isArray(raw)
      ? raw.map((item, idx) =>
          typeof item === "string"
            ? { ref: `${book} ${chapter}:${idx + 1}`, text: item }
            : { ref: String(item?.ref || `${book} ${chapter}:${item?.verse || idx + 1}`), text: String(item?.text ?? "") },
        )
      : raw && typeof raw === "object"
        ? Object.entries(raw).map(([vNum, text]) => ({ ref: `${book} ${chapter}:${vNum}`, text: String(text ?? "") }))
        : [];

  const entries = normalizeEntries(verses);
  const bridgeEntries = bridgeVerses ? normalizeEntries(bridgeVerses) : [];

  const cappedMaxPages = Math.max(1, Math.min(200, Number(maxPagesPerTanda) || 50));
  const versesPerTanda = Math.max(40, cappedMaxPages * 22);
  const totalTandas = Math.max(1, Math.ceil(Math.max(1, entries.length) / versesPerTanda));
  const fontFile = resolveFontFileForLangOrScript(lang, script);
  const needsBridgeFont =
    Number(editionMode) === 1 || bridgeEntries.length > 0 || fontFile !== "CharisSIL-Regular.ttf";

  const fontFsm = createFontLoadingHarelFsm();
  const [wasmExports, fontBytes, bridgeFontBytes] = await Promise.all([
    ensureWorkerWasmExports(wasmUrl, wasmBytes),
    ensureFontBytesLoaded(fontFile, fontUrl, fontBytesOverride, fontFsm),
    needsBridgeFont
      ? ensureFontBytesLoaded("CharisSIL-Regular.ttf", bridgeFontUrl, bridgeFontOverride)
      : Promise.resolve(null),
  ]);

  if (!wasmExports || !fontBytes) {
    return {
      type: "tanda-offline-font-notice",
      status: "OFFLINE_FONT_REQUIRED_USE_CSS_PRINT",
      fontFsmState: fontFsm.state,
      fontFsmHistory: fontFsm.history,
      lang,
      fontFile,
      wasmFontEmbedded: false,
      winAnsiFallbackForbidden: true,
      fallbackRecommendation: "css-paged-media",
      message: `La fuente soberana '${fontFile}' no está disponible en bóveda offline ni en /packs/fonts/${fontFile}.zst. Se bloqueó toda degradación a WinAnsi; use Impresión Directa HTML (@media print).`,
      totalTandas: 0,
      tandas: [],
      pdfBytes: new Uint8Array(),
      peakRamBytes: wasmExports?.memory?.buffer?.byteLength || 0,
    };
  }

  const isLetter = String(paper || "a4").toLowerCase().includes("letter");
  const resolvedScript = resolveScriptIso15924ForLang(lang, script);
  const isRtl =
    String(dir || "ltr").toLowerCase() === "rtl" ||
    ["Arab", "Aran", "Hebr", "Syrc", "Thaa"].includes(resolvedScript);
  const fontTenthsPt = Math.round((Number(fontPt) || 9.5) * 10);

  const tandaSlices = [];
  for (let tIdx = 0; tIdx < totalTandas; tIdx += 1) {
    const slice = entries.slice(tIdx * versesPerTanda, (tIdx + 1) * versesPerTanda);
    const lines = slice.length > 0 ? slice.map((e) => `${e.ref} ${e.text}`) : [`${book} ${chapter}:1 (${lang})`];
    const utf8 = new TextEncoder().encode(lines.join("\n"));
    const bSlice = bridgeEntries.slice(tIdx * versesPerTanda, (tIdx + 1) * versesPerTanda);
    const bridgeUtf8 =
      bSlice.length > 0
        ? new TextEncoder().encode(bSlice.map((e) => `${e.ref} ${e.text}`).join("\n"))
        : null;
    tandaSlices.push({ utf8, bridgeUtf8 });
  }

  // Cuando hay múltiples tandas (`totalTandas > 1`), ejecutamos `StreamingPdfSession` para emitir `/FontFile2` 1 sola vez en Chunk 0
  // y concatenar el 100% de `tandas[0..N]` sin truncamiento en un único PDF completo con `M_RAM <= 8 MiB`.
  if (totalTandas > 1 && typeof wasmExports.wasm_pdf_session_begin === "function") {
    const streamed = executeWasmStreamingPdfSession(
      wasmExports,
      fontBytes,
      bridgeFontBytes,
      tandaSlices,
      {
        editionMode,
        columns,
        isLetter,
        isRtl,
        booklet4n: Boolean(booklet4n),
        fontTenthsPt,
        maxPagesPerTanda: cappedMaxPages,
      },
      emitProgress,
      fontFile,
    );
    if (streamed && streamed.fullPdf.byteLength > 0) {
      if (streamed.peakRamBytes > MAX_WORKER_RAM_CEILING_BYTES) {
        throw new Error(
          `Worker WASM linear memory (${streamed.peakRamBytes} B) exceeded constitutional 14 MiB ceiling (${MAX_WORKER_RAM_CEILING_BYTES} B)`,
        );
      }
      return {
        type: "tanda-complete",
        lang,
        fontFile,
        fontFsmState: fontFsm.state,
        wasmFontEmbedded: true,
        streamingSessionUsed: true,
        booklet4n: Boolean(booklet4n),
        editionMode: Number(editionMode) || 0,
        totalTandas,
        tandas: streamed.tandas,
        pdfBytes: streamed.fullPdf,
        peakRamBytes: Math.max(65536, streamed.peakRamBytes),
      };
    }
  }

  const tandas = [];
  for (let tIdx = 0; tIdx < totalTandas; tIdx += 1) {
    const { utf8, bridgeUtf8 } = tandaSlices[tIdx];
    const pdfBytes = executeWasmTandaTypeset(wasmExports, fontBytes, utf8, {
      bridgeFontBytes,
      bridgeUtf8Bytes: bridgeUtf8,
      editionMode,
      columns,
      isLetter,
      isRtl,
      booklet4n: Boolean(booklet4n),
      fontTenthsPt,
      maxPages: cappedMaxPages,
    });
    if (!pdfBytes) {
      return {
        type: "tanda-offline-font-notice",
        status: "OFFLINE_FONT_REQUIRED_USE_CSS_PRINT",
        fontFsmState: FONT_HAREL_STATES.OFFLINE_CSS_FALLBACK,
        lang,
        fontFile,
        wasmFontEmbedded: false,
        winAnsiFallbackForbidden: true,
        fallbackRecommendation: "css-paged-media",
        totalTandas: 0,
        tandas: [],
        pdfBytes: new Uint8Array(),
        peakRamBytes: wasmExports?.memory?.buffer?.byteLength || 0,
      };
    }
    const wasmLinearBytes = wasmExports?.memory?.buffer?.byteLength || 0;
    const peakRamBytes = wasmLinearBytes > 0 ? wasmLinearBytes : pdfBytes.byteLength;
    if (peakRamBytes > MAX_WORKER_RAM_CEILING_BYTES) {
      throw new Error(
        `Worker WASM linear memory (${peakRamBytes} B) exceeded constitutional 14 MiB ceiling (${MAX_WORKER_RAM_CEILING_BYTES} B)`,
      );
    }
    emitProgress({
      type: "tanda-progress",
      tandaIndex: tIdx + 1,
      totalTandas,
      bytes: pdfBytes.byteLength,
      peakRamBytes,
      fontFile,
    });
    tandas.push({
      tandaIndex: tIdx + 1,
      totalTandas,
      fontFile,
      pdfBytes,
      peakRamBytes: Math.max(65536, peakRamBytes),
    });
  }

  return {
    type: "tanda-complete",
    lang,
    fontFile,
    fontFsmState: fontFsm.state,
    wasmFontEmbedded: true,
    streamingSessionUsed: false,
    booklet4n: Boolean(booklet4n),
    editionMode: Number(editionMode) || 0,
    totalTandas,
    tandas,
    pdfBytes: tandas[0]?.pdfBytes || new Uint8Array(),
    peakRamBytes: Math.max(...tandas.map((t) => t.peakRamBytes), 65536),
  };
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function" && typeof self.postMessage === "function") {
  self.addEventListener("message", async (ev) => {
    try {
      const result = await runWorkerTandaJob(ev.data || {}, (prog) => self.postMessage(prog));
      self.postMessage(result);
    } catch (err) {
      self.postMessage({
        type: "tanda-error",
        error: String(err?.message || err),
      });
    }
  });
}
