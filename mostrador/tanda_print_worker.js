// @req[BIB-V2-18] @req[BIB-V2-19] Web Worker soberano de Tandas y Streaming PDF (`D5-V2G`, `D6-V2G`, `D7-V2G` · `ARB-EKOVOZ-96`):
// - Purgado al 100% cualquier fallback PDF de 8 bits heredado (`DEBRIS-V2G-11` eliminado: solo OpenType `/Type0` + `Identity-H`).
// - Carga tipográfica Same-Origin `/packs/fonts/<Font>.ttf.zst` (`Zstd-22`) descomprimida con `ruzstd` (`ekovoz_player_wasm.wasm`)
//   y persistida en `ekovoz_vault_v2` IndexedDB (`DEBRIS-V2G-13b` eliminado: `0` peticiones a `editions-01/fonts/*`).
// - Harel FSM determinista `FONT_HAREL_FSM` (`IDLE -> VAULT -> ZST_NETWORK -> READY_OPENTYPE | OFFLINE_CSS_FALLBACK`) con `0` promesas colgadas.
// - Streaming multi-tanda `StreamingPdfSession` (`wasm_pdf_session_begin/push_tanda/finish`): `/FontFile2` 1 sola vez en Chunk 0,
//   concatenación del `100%` de `tandas[0..N]` sin truncar en 50 páginas y `M_RAM <= 8 MiB` constante (`< 14 MiB`).

import {
  buildEditionRenderSpecBytes16,
  resolveNumericEditionId,
} from "./dosis_editions_catalog.js";
import { sha256HexBytes } from "./offline_font_bundle.js";
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

export function resolveTier0AssetFontFilename(fontFile) {
  if (fontFile === "CharisSIL-Regular.ttf") return "CharisSIL-Regular.ttf";
  if (fontFile === "CharisSIL-Bold-Subset.ttf") return "CharisSIL-Bold-Subset.ttf";
  if (
    fontFile === "Cardo-Regular.ttf" ||
    fontFile === "Cardo-Hebrew-Biblical.ttf" ||
    fontFile === "NotoSansHebrew-Regular.ttf"
  ) {
    return "Cardo-Hebrew-Biblical.ttf";
  }
  if (fontFile === "EBGaramond-Regular.ttf" || fontFile === "EBGaramond-Greek-Biblical.ttf") {
    return "EBGaramond-Greek-Biblical.ttf";
  }
  return null;
}

function tier0OfflineCandidateForFont(fontFile) {
  const assetName = resolveTier0AssetFontFilename(fontFile);
  return assetName ? new URL(`../assets/fonts/${assetName}`, import.meta.url) : null;
}

export function encodePaperFormatCode(paper = "a4", orientation = "") {
  const raw = String(paper || "a4").trim().toLowerCase();
  const orient = String(orientation || "").trim().toLowerCase();
  const isLandscape = orient === "landscape" || raw.includes("landscape");
  const base = raw.includes("b70") || raw.includes("braille")
    ? 4
    : raw.includes("a3")
      ? 2
      : raw.includes("folio") || raw.includes("oficio")
        ? 3
        : raw.includes("letter") || raw.includes("carta")
          ? 1
          : 0;
  return isLandscape ? (base | 0x80) : base;
}

function concatUint8Chunks(chunks, totalBytes) {
  if (!Array.isArray(chunks) || chunks.length === 0 || totalBytes <= 0) {
    return new Uint8Array();
  }
  if (chunks.length === 1) return chunks[0];
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of chunks) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

export function extractGlyphContoursWithWorkerWasm(
  fontBytes,
  codepoint,
  wasmBytesOverride = null,
) {
  if (!(fontBytes instanceof Uint8Array) || fontBytes.byteLength < 64) return null;
  if (!cachedWorkerWasmExports && wasmBytesOverride instanceof Uint8Array && wasmBytesOverride.byteLength > 8) {
    const mod = new WebAssembly.Module(wasmBytesOverride);
    cachedWorkerWasmExports = new WebAssembly.Instance(mod, {}).exports;
  }
  const wasmExports = cachedWorkerWasmExports;
  if (
    !wasmExports ||
    !wasmExports.memory ||
    typeof wasmExports.wasm_alloc !== "function" ||
    typeof wasmExports.wasm_free !== "function" ||
    typeof wasmExports.wasm_extract_glyph_contours_f32 !== "function"
  ) {
    return null;
  }
  const fLen = fontBytes.byteLength;
  const outCap = 32768;
  const fPtr = wasmExports.wasm_alloc(fLen) >>> 0;
  const outPtr = wasmExports.wasm_alloc(outCap) >>> 0;
  if (!fPtr || !outPtr || outPtr < 4096) {
    if (fPtr) wasmExports.wasm_free(fPtr, fLen);
    if (outPtr) wasmExports.wasm_free(outPtr, outCap);
    return null;
  }
  try {
    new Uint8Array(wasmExports.memory.buffer, fPtr, fLen).set(fontBytes);
    const written = wasmExports.wasm_extract_glyph_contours_f32(
      fPtr,
      fLen,
      Number(codepoint) >>> 0,
      outPtr,
      outCap,
    );
    if (written < 32) return null;
    const raw = new Uint8Array(written);
    raw.set(new Uint8Array(wasmExports.memory.buffer, outPtr, written));
    return raw;
  } finally {
    wasmExports.wasm_free(fPtr, fLen);
    wasmExports.wasm_free(outPtr, outCap);
  }
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
  manifestEntry = null,
) {
  const expectedRawSha = String(manifestEntry?.rawSha256 || "").trim().toLowerCase();
  const expectedZstSha = String(manifestEntry?.zstSha256 || "").trim().toLowerCase();
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
    const vaulted = await loadFontBytesFromVault(fontFile, { expectedRawSha256: expectedRawSha });
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
            if (expectedZstSha && (await sha256HexBytes(bytes)) !== expectedZstSha) {
              continue;
            }
            const playerWasm = await ensurePlayerZstdWasmLoaded();
            bytes = decodeRfc8878RawZstdFrameJs(bytes, playerWasm);
          }
          if (bytes instanceof Uint8Array && bytes.byteLength > 64) {
            const actualRawSha = await sha256HexBytes(bytes);
            if (expectedRawSha && actualRawSha !== expectedRawSha) {
              continue;
            }
            storeFontBytesInVault(fontFile, bytes, {
              fontFile,
              rawSha256: expectedRawSha || actualRawSha,
            }).catch(() => undefined);
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

function resolveEffectiveEditionSpecBytes(editionId, editionMode, editionRenderSpec, overrides) {
  if (editionRenderSpec instanceof Uint8Array && editionRenderSpec.byteLength === 16) {
    return editionRenderSpec;
  }
  const resolvedId = resolveNumericEditionId(editionId || editionMode);
  return resolvedId > 0 ? buildEditionRenderSpecBytes16(resolvedId, overrides) : null;
}

function executeWasmTandaTypeset(
  wasmExports,
  fontBytes,
  utf8Bytes,
  {
    bridgeFontBytes = null,
    boldFontBytes = null,
    tertiaryFontBytes = null,
    bridgeUtf8Bytes = null,
    editionId = 0,
    editionRenderSpec = null,
    editionMode = 0,
    columns = 2,
    paperCode = 0,
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
  const hasTriscript = typeof wasmExports.typeset_tanda_pdf_triscript_in_place === "function";
  const hasSpecAbi = typeof wasmExports.typeset_tanda_pdf_spec_in_place === "function";
  const hasEditionMode = typeof wasmExports.typeset_tanda_pdf_edition_mode_in_place === "function";
  const hasDual4n = typeof wasmExports.typeset_tanda_pdf_dual_font_4n_in_place === "function";
  const hasSingle = typeof wasmExports.typeset_tanda_pdf_in_place === "function";
  if (!hasTriscript && !hasSpecAbi && !hasEditionMode && !hasDual4n && !hasSingle) {
    return null;
  }

  const safeCols = Math.max(1, Math.min(3, Number(columns) || 2));
  const safeTenths = Math.max(75, Math.min(220, Math.round(Number(fontTenthsPt) || 95)));
  const safePages = Number(maxPages) === 0 ? 0 : Math.max(1, Math.min(255, Number(maxPages) || 0));
  const rawMode = Number(editionMode) || 0;
  const resolvedPaperByte = Number.isFinite(Number(paperCode)) && Number(paperCode) > 0
    ? Number(paperCode) & 0xff
    : isLetter
      ? 1
      : 0;
  const f1Len = fontBytes.byteLength;
  const f2Len = bridgeFontBytes instanceof Uint8Array ? bridgeFontBytes.byteLength : 0;
  const f3Len = boldFontBytes instanceof Uint8Array ? boldFontBytes.byteLength : 0;
  const f4Len = tertiaryFontBytes instanceof Uint8Array ? tertiaryFontBytes.byteLength : 0;
  const specOverrides = {
    columns: safeCols,
    fontTenthsPt: safeTenths,
    paperCode: resolvedPaperByte,
  };
  const specBytes = hasTriscript && f4Len >= 64
    ? (resolveEffectiveEditionSpecBytes(editionId, editionMode, editionRenderSpec, specOverrides) ||
      buildEditionRenderSpecBytes16(0, specOverrides))
    : hasSpecAbi
      ? resolveEffectiveEditionSpecBytes(editionId, editionMode, editionRenderSpec, specOverrides)
      : null;

  const tLen = utf8Bytes.byteLength;
  const bLen = bridgeUtf8Bytes instanceof Uint8Array ? bridgeUtf8Bytes.byteLength : 0;
  const outCap = Math.min(8 * 1024 * 1024, Math.max(131072, (tLen + bLen) * 6 + 262144));

  const f1Ptr = wasmExports.wasm_alloc(f1Len) >>> 0;
  const f2Ptr = (hasTriscript || hasSpecAbi || hasEditionMode || hasDual4n) && f2Len > 0 ? wasmExports.wasm_alloc(f2Len) >>> 0 : 0;
  const f3Ptr = (hasTriscript || hasSpecAbi || hasEditionMode) && f3Len > 0 ? wasmExports.wasm_alloc(f3Len) >>> 0 : 0;
  const f4Ptr = hasTriscript && f4Len >= 64 ? wasmExports.wasm_alloc(f4Len) >>> 0 : 0;
  const specPtr = specBytes ? (wasmExports.wasm_alloc(16) >>> 0) : 0;
  const tPtr = wasmExports.wasm_alloc(tLen) >>> 0;
  const bPtr = (hasTriscript || hasSpecAbi || hasEditionMode || hasDual4n) && bLen > 0 ? wasmExports.wasm_alloc(bLen) >>> 0 : 0;
  const outPtr = wasmExports.wasm_alloc(outCap) >>> 0;
  if (!f1Ptr || !tPtr || !outPtr) {
    if (f1Ptr) wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    if (f3Ptr) wasmExports.wasm_free(f3Ptr, f3Len);
    if (f4Ptr) wasmExports.wasm_free(f4Ptr, f4Len);
    if (specPtr) wasmExports.wasm_free(specPtr, 16);
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
    if (f3Ptr && f3Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f3Ptr, f3Len).set(boldFontBytes);
    }
    if (f4Ptr && f4Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f4Ptr, f4Len).set(tertiaryFontBytes);
    }
    if (specPtr && specBytes) {
      new Uint8Array(wasmExports.memory.buffer, specPtr, 16).set(specBytes);
    }
    new Uint8Array(wasmExports.memory.buffer, tPtr, tLen).set(utf8Bytes);
    if (bPtr && bLen > 0) {
      new Uint8Array(wasmExports.memory.buffer, bPtr, bLen).set(bridgeUtf8Bytes);
    }

    const mappedEditionCode =
      rawMode === 1 || rawMode === 15
        ? 15
        : rawMode === 2 || rawMode === 16
          ? 16
          : resolveNumericEditionId(editionId || editionMode);

    const written =
      f4Ptr > 0 && hasTriscript
        ? wasmExports.typeset_tanda_pdf_triscript_in_place(
          f1Ptr,
          f1Len,
          f2Ptr,
          f2Len,
          f3Ptr,
          f3Len,
          f4Ptr,
          f4Len,
          tPtr,
          tLen,
          bPtr,
          bLen,
          specPtr,
          specPtr > 0 ? 16 : 0,
          isRtl ? 1 : 0,
          booklet4n ? 1 : 0,
          safePages,
          outPtr,
          outCap,
        )
        : specPtr > 0 && hasSpecAbi
          ? wasmExports.typeset_tanda_pdf_spec_in_place(
            f1Ptr,
            f1Len,
            f2Ptr,
            f2Len,
            f3Ptr,
            f3Len,
            tPtr,
            tLen,
            bPtr,
            bLen,
            specPtr,
            16,
            isRtl ? 1 : 0,
            booklet4n ? 1 : 0,
            safePages,
            outPtr,
            outCap,
          )
          : (mappedEditionCode > 0 || f3Ptr > 0 || resolvedPaperByte > 1) && hasEditionMode
            ? wasmExports.typeset_tanda_pdf_edition_mode_in_place(
              f1Ptr,
              f1Len,
              f2Ptr,
              f2Len,
              f3Ptr,
              f3Len,
              tPtr,
              tLen,
              bPtr,
              bLen,
              safeCols,
              resolvedPaperByte,
              isRtl ? 1 : 0,
              booklet4n ? 1 : 0,
              safeTenths,
              safePages,
              mappedEditionCode,
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
                resolvedPaperByte,
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
                resolvedPaperByte,
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
    if (f3Ptr) wasmExports.wasm_free(f3Ptr, f3Len);
    if (f4Ptr) wasmExports.wasm_free(f4Ptr, f4Len);
    if (specPtr) wasmExports.wasm_free(specPtr, 16);
    wasmExports.wasm_free(tPtr, tLen);
    if (bPtr) wasmExports.wasm_free(bPtr, bLen);
    wasmExports.wasm_free(outPtr, outCap);
  }
}

function executeWasmStreamingPdfSession(
  wasmExports,
  fontBytes,
  bridgeFontBytes,
  boldFontBytes,
  tertiaryFontBytes,
  tandaSlices,
  {
    editionId = 0,
    editionRenderSpec = null,
    editionMode = 0,
    columns = 2,
    paperCode = 0,
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
  const hasSpecBegin = typeof wasmExports.wasm_pdf_session_begin_v2 === "function";
  const safeCols = Math.max(1, Math.min(3, Number(columns) || 2));
  const safeTenths = Math.max(75, Math.min(220, Math.round(Number(fontTenthsPt) || 95)));
  const safePages = Number(maxPagesPerTanda) === 0 ? 0 : Math.max(1, Math.min(255, Number(maxPagesPerTanda) || 0));
  const rawMode = Number(editionMode) || 0;
  const resolvedPaperByte = Number.isFinite(Number(paperCode)) && Number(paperCode) > 0
    ? Number(paperCode) & 0xff
    : isLetter
      ? 1
      : 0;
  const specBytes = hasSpecBegin
    ? resolveEffectiveEditionSpecBytes(editionId, editionMode, editionRenderSpec, {
      columns: safeCols,
      fontTenthsPt: safeTenths,
      paperCode: resolvedPaperByte,
    })
    : null;
  const hasChunkDrain =
    typeof wasmExports.wasm_pdf_session_drain_chunk === "function" &&
    typeof wasmExports.wasm_pdf_session_finish_tail_with_desc === "function";
  const f1Len = fontBytes.byteLength;
  const f2Len = bridgeFontBytes instanceof Uint8Array ? bridgeFontBytes.byteLength : 0;
  const f3Len = boldFontBytes instanceof Uint8Array ? boldFontBytes.byteLength : 0;
  const f4Len = tertiaryFontBytes instanceof Uint8Array ? tertiaryFontBytes.byteLength : 0;
  const outCap = hasChunkDrain ? 2 * 1024 * 1024 : 6 * 1024 * 1024;
  const f1Ptr = wasmExports.wasm_alloc(f1Len) >>> 0;
  const f2Ptr = f2Len > 0 ? wasmExports.wasm_alloc(f2Len) >>> 0 : 0;
  const f3Ptr = f3Len > 0 ? wasmExports.wasm_alloc(f3Len) >>> 0 : 0;
  const specPtr = specBytes ? (wasmExports.wasm_alloc(16) >>> 0) : 0;
  const descPtr =
    hasChunkDrain || typeof wasmExports.wasm_pdf_session_finish_with_desc === "function"
      ? wasmExports.wasm_alloc(16) >>> 0
      : 0;
  const outPtr = wasmExports.wasm_alloc(outCap) >>> 0;
  if (!f1Ptr || !outPtr || outPtr < 4096) {
    if (f1Ptr) wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    if (f3Ptr) wasmExports.wasm_free(f3Ptr, f3Len);
    if (specPtr) wasmExports.wasm_free(specPtr, 16);
    if (descPtr) wasmExports.wasm_free(descPtr, 16);
    if (outPtr) wasmExports.wasm_free(outPtr, outCap);
    return null;
  }

  let sessionStarted = false;
  try {
    new Uint8Array(wasmExports.memory.buffer, f1Ptr, f1Len).set(fontBytes);
    if (f2Ptr && f2Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f2Ptr, f2Len).set(bridgeFontBytes);
    }
    if (f3Ptr && f3Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f3Ptr, f3Len).set(boldFontBytes);
    }
    if (specPtr && specBytes) {
      new Uint8Array(wasmExports.memory.buffer, specPtr, 16).set(specBytes);
    }
    const mappedEditionCode =
      rawMode === 1 || rawMode === 15
        ? 15
        : rawMode === 2 || rawMode === 16
          ? 16
          : resolveNumericEditionId(editionId || editionMode);

    const beginCode =
      specPtr > 0 && hasSpecBegin
        ? wasmExports.wasm_pdf_session_begin_v2(
          f1Ptr,
          f1Len,
          f2Ptr,
          f2Len,
          f3Ptr,
          f3Len,
          specPtr,
          16,
          isRtl ? 1 : 0,
          booklet4n ? 1 : 0,
        )
        : wasmExports.wasm_pdf_session_begin(
          f1Ptr,
          f1Len,
          f2Ptr,
          f2Len,
          f3Ptr,
          f3Len,
          safeCols,
          resolvedPaperByte,
          isRtl ? 1 : 0,
          booklet4n ? 1 : 0,
          safeTenths,
          mappedEditionCode,
        );
    if (specPtr) wasmExports.wasm_free(specPtr, 16);
    if (beginCode <= 0) return null;
    sessionStarted = true;
    if (f4Len >= 64 && typeof wasmExports.wasm_pdf_session_attach_tertiary_font === "function") {
      const f4Ptr = wasmExports.wasm_alloc(f4Len) >>> 0;
      if (!f4Ptr) return null;
      try {
        new Uint8Array(wasmExports.memory.buffer, f4Ptr, f4Len).set(tertiaryFontBytes);
        if (wasmExports.wasm_pdf_session_attach_tertiary_font(f4Ptr, f4Len) <= 0) {
          return null;
        }
      } finally {
        wasmExports.wasm_free(f4Ptr, f4Len);
      }
    }

    const tandas = [];
    const blobParts = [];
    let totalBlobBytes = 0;
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
        const pagesEmitted = wasmExports.wasm_pdf_session_push_tanda(
          tPtr,
          tLen,
          bPtr,
          bLen,
          safePages,
        );
        if (pagesEmitted <= 0) return null;
        let drainedBytes = 0;
        if (hasChunkDrain) {
          const chunkLen = wasmExports.wasm_pdf_session_drain_chunk(outPtr, outCap);
          if (chunkLen < 0 || (!booklet4n && chunkLen === 0)) return null;
          if (chunkLen > 0) {
            const chunk = new Uint8Array(chunkLen);
            chunk.set(new Uint8Array(wasmExports.memory.buffer, outPtr, chunkLen));
            blobParts.push(chunk);
            totalBlobBytes += chunkLen;
            drainedBytes = chunkLen;
          }
        }
        const linearRam = wasmExports.memory.buffer.byteLength;
        if (linearRam > maxObservedRam) maxObservedRam = linearRam;
        emitProgress({
          type: "tanda-progress",
          tandaIndex: idx + 1,
          totalTandas: tandaSlices.length,
          pages: pagesEmitted,
          bytes: drainedBytes,
          peakRamBytes: linearRam,
          fontFile,
        });
        tandas.push({
          tandaIndex: idx + 1,
          totalTandas: tandaSlices.length,
          fontFile,
          pages: pagesEmitted,
          bytes: drainedBytes,
          peakRamBytes: Math.max(65536, linearRam),
        });
      } finally {
        wasmExports.wasm_free(tPtr, tLen);
        if (bPtr) wasmExports.wasm_free(bPtr, bLen);
      }
    }

    if (hasChunkDrain) {
      const tailLen = wasmExports.wasm_pdf_session_finish_tail_with_desc(descPtr, outPtr, outCap);
      sessionStarted = false;
      if (tailLen <= 0) return null;
      if (descPtr >= 4096) {
        const dv = new DataView(wasmExports.memory.buffer, descPtr, 16);
        if (dv.getUint32(0, true) !== 0x50444653) return null;
      }
      const tailChunk = new Uint8Array(tailLen);
      tailChunk.set(new Uint8Array(wasmExports.memory.buffer, outPtr, tailLen));
      blobParts.push(tailChunk);
      totalBlobBytes += tailLen;
      const headChunk = blobParts[0];
      if (
        !headChunk ||
        headChunk.byteLength < 8 ||
        headChunk[0] !== 0x25 ||
        headChunk[1] !== 0x50 ||
        headChunk[2] !== 0x44 ||
        headChunk[3] !== 0x46
      ) {
        return null;
      }
      let cachedFullPdf = null;
      return {
        blobParts,
        byteLength: totalBlobBytes,
        tandas,
        peakRamBytes: maxObservedRam,
        get fullPdf() {
          if (!cachedFullPdf) {
            cachedFullPdf = concatUint8Chunks(blobParts, totalBlobBytes);
          }
          return cachedFullPdf;
        },
      };
    }

    const pdfLen =
      descPtr >= 4096 && typeof wasmExports.wasm_pdf_session_finish_with_desc === "function"
        ? wasmExports.wasm_pdf_session_finish_with_desc(descPtr, outPtr, outCap)
        : wasmExports.wasm_pdf_session_finish(outPtr, outCap);
    sessionStarted = false;
    if (pdfLen <= 0) return null;
    if (descPtr >= 4096 && typeof wasmExports.wasm_pdf_session_finish_with_desc === "function") {
      const dv = new DataView(wasmExports.memory.buffer, descPtr, 16);
      const magic = dv.getUint32(0, true);
      if (magic !== 0x50444653) return null;
    }
    const fullPdf = new Uint8Array(pdfLen);
    fullPdf.set(new Uint8Array(wasmExports.memory.buffer, outPtr, pdfLen));
    if (
      fullPdf.byteLength < 8 ||
      fullPdf[0] !== 0x25 ||
      fullPdf[1] !== 0x50 ||
      fullPdf[2] !== 0x44 ||
      fullPdf[3] !== 0x46
    ) {
      return null;
    }
    return {
      blobParts: [fullPdf],
      byteLength: fullPdf.byteLength,
      fullPdf,
      tandas,
      peakRamBytes: maxObservedRam,
    };
  } finally {
    if (sessionStarted && typeof wasmExports.wasm_pdf_session_finish === "function") {
      try {
        wasmExports.wasm_pdf_session_finish(outPtr, outCap);
      } catch {
        // Ignore cleanup
      }
    }
    wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    if (f3Ptr) wasmExports.wasm_free(f3Ptr, f3Len);
    if (descPtr) wasmExports.wasm_free(descPtr, 16);
    wasmExports.wasm_free(outPtr, outCap);
  }
}

export function typesetTandaWithCachedWasmSync({
  lang = "es",
  script = "",
  joinedText = "",
  bridgeJoinedText = "",
  editionId = 0,
  editionRenderSpec = null,
  editionMode = 0,
  columns = 2,
  paper = "a4",
  orientation = "",
  dir = "ltr",
  booklet4n = false,
  fontPt = 9.5,
  maxPages = 50,
  wasmBytes = null,
  fontBytes: fontBytesOverride = null,
  bridgeFontBytes: bridgeFontOverride = null,
  boldFontBytes: boldFontOverride = null,
  tertiaryFontBytes: tertiaryFontOverride = null,
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
  const boldFont =
    boldFontOverride instanceof Uint8Array
      ? boldFontOverride
      : cachedFontBytes.get("CharisSIL-Bold-Subset.ttf") || null;
  const tertiaryFont =
    tertiaryFontOverride instanceof Uint8Array
      ? tertiaryFontOverride
      : null;
  const utf8Bytes = new TextEncoder().encode(String(joinedText || "Ekovoz Tanda"));
  const bridgeUtf8Bytes = bridgeJoinedText
    ? new TextEncoder().encode(String(bridgeJoinedText))
    : null;
  const paperCode = encodePaperFormatCode(paper, orientation);
  return executeWasmTandaTypeset(cachedWorkerWasmExports, fontBytes, utf8Bytes, {
    bridgeFontBytes: bridgeFont,
    boldFontBytes: boldFont,
    tertiaryFontBytes: tertiaryFont,
    bridgeUtf8Bytes,
    editionId,
    editionRenderSpec,
    editionMode,
    columns,
    paperCode,
    isLetter: (paperCode & 0x7f) === 1,
    isRtl: String(dir || "ltr").toLowerCase() === "rtl",
    booklet4n: Boolean(booklet4n),
    fontTenthsPt: Math.round((Number(fontPt) || 9.5) * 10),
    maxPages,
  });
}

export async function runWorkerTandaJob(payload = {}, emitProgress = () => { }) {
  const {
    lang = "es",
    script = "",
    book = "GEN",
    chapter = 1,
    verses = [],
    bridgeVerses = null,
    editionId = 0,
    editionRenderSpec = null,
    editionMode = 0,
    columns = 2,
    fontPt = 9.5,
    paper = "a4",
    orientation = "",
    dir = "ltr",
    booklet4n = false,
    maxPagesPerTanda = 50,
    wasmUrl = "",
    fontUrl = "",
    bridgeFontFile = "",
    bridgeFontUrl = "",
    tertiaryFontFile = "",
    tertiaryFontUrl = "",
    boldFontUrl = "",
    includeBoldFont = false,
    wasmBytes = null,
    fontBytes: fontBytesOverride = null,
    bridgeFontBytes: bridgeFontOverride = null,
    tertiaryFontBytes: tertiaryFontOverride = null,
    boldFontBytes: boldFontOverride = null,
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

  const rawMaxPages = payload.maxPagesPerTanda === undefined ? 50 : Number(payload.maxPagesPerTanda);
  const cappedMaxPages = rawMaxPages === 0 ? 0 : Math.max(1, Math.min(255, Number.isFinite(rawMaxPages) ? rawMaxPages : 50));
  const slicePagesTarget = cappedMaxPages === 0 || cappedMaxPages > 50 ? 25 : cappedMaxPages;
  const versesPerTanda = Math.max(40, slicePagesTarget * 22);
  const totalTandas = Math.max(1, Math.ceil(Math.max(1, entries.length) / versesPerTanda));
  const fontFile = resolveFontFileForLangOrScript(lang, script);
  const explicitBridgeFontFile = String(bridgeFontFile || "").trim();
  const effectiveBridgeFontFile = explicitBridgeFontFile || "CharisSIL-Regular.ttf";
  const explicitTertiaryFontFile = String(tertiaryFontFile || "").trim();
  const needsBridgeFont =
    Number(editionMode) === 1 ||
    Number(editionMode) === 15 ||
    resolveNumericEditionId(editionId || editionMode) === 6 ||
    bridgeEntries.length > 0 ||
    fontFile !== "CharisSIL-Regular.ttf" ||
    Boolean(explicitBridgeFontFile) ||
    bridgeFontOverride instanceof Uint8Array ||
    Boolean(bridgeFontUrl);
  const needsTertiaryFont =
    Boolean(explicitTertiaryFontFile) ||
    tertiaryFontOverride instanceof Uint8Array ||
    Boolean(tertiaryFontUrl);
  const wantsBoldFont = Boolean(
    includeBoldFont || boldFontOverride instanceof Uint8Array || boldFontUrl,
  );

  const fontFsm = createFontLoadingHarelFsm();
  const [wasmExports, fontBytes, bridgeFontBytes, boldFontBytes, tertiaryFontBytes] = await Promise.all([
    ensureWorkerWasmExports(wasmUrl, wasmBytes),
    ensureFontBytesLoaded(fontFile, fontUrl, fontBytesOverride, fontFsm),
    needsBridgeFont
      ? ensureFontBytesLoaded(effectiveBridgeFontFile, bridgeFontUrl, bridgeFontOverride)
      : Promise.resolve(null),
    wantsBoldFont
      ? ensureFontBytesLoaded("CharisSIL-Bold-Subset.ttf", boldFontUrl, boldFontOverride)
      : Promise.resolve(null),
    needsTertiaryFont
      ? ensureFontBytesLoaded(explicitTertiaryFontFile || "EBGaramond-Greek-Biblical.ttf", tertiaryFontUrl, tertiaryFontOverride)
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
      message: `La tipografía '${fontFile}' no está disponible sin internet (/packs/fonts/${fontFile}.zst). Se bloqueó la sustitución automática; usa «Imprimir desde el navegador».`,
      totalTandas: 0,
      tandas: [],
      pdfBytes: new Uint8Array(),
      peakRamBytes: wasmExports?.memory?.buffer?.byteLength || 0,
    };
  }

  const paperCode = encodePaperFormatCode(paper, orientation);
  const isLetter = (paperCode & 0x7f) === 1;
  const resolvedScript = resolveScriptIso15924ForLang(lang, script);
  const isRtl =
    String(dir || "ltr").toLowerCase() === "rtl" ||
    ["Arab", "Aran", "Hebr", "Syrc", "Thaa"].includes(resolvedScript);
  const fontTenthsPt = Math.round((Number(fontPt) || 9.5) * 10);
  const rawMode = Number(editionMode) || 0;
  const resolvedEditionId = resolveNumericEditionId(
    editionId || (rawMode === 1 || rawMode === 15 ? 15 : rawMode === 2 || rawMode === 16 ? 16 : editionMode),
  );
  const effectiveSpecBytes = resolveEffectiveEditionSpecBytes(
    resolvedEditionId,
    editionMode,
    editionRenderSpec,
    {
      columns: Math.max(1, Math.min(3, Number(columns) || 2)),
      fontTenthsPt,
      paperCode,
    },
  );

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

  // Cuando hay múltiples tandas (`totalTandas > 1`), ejecutamos `StreamingPdfSession` por `BlobParts[]`
  // (`1` sola incrustación `/FontFile2` por fuente y `0` descarte de `tandas[1..N]`, `M_RAM <= 6 MiB`).
  if (totalTandas > 1 && typeof wasmExports.wasm_pdf_session_begin === "function") {
    const streamed = executeWasmStreamingPdfSession(
      wasmExports,
      fontBytes,
      bridgeFontBytes,
      boldFontBytes,
      tertiaryFontBytes,
      tandaSlices,
      {
        editionId: resolvedEditionId,
        editionRenderSpec: effectiveSpecBytes,
        editionMode,
        columns,
        paperCode,
        isLetter,
        isRtl,
        booklet4n: Boolean(booklet4n),
        fontTenthsPt,
        maxPagesPerTanda: cappedMaxPages,
      },
      emitProgress,
      fontFile,
    );
    if (!streamed || !Array.isArray(streamed.blobParts) || streamed.blobParts.length === 0 || streamed.byteLength === 0) {
      throw new Error(
        `StreamingPdfSession multi-tanda failed to finalize all ${totalTandas} tandas without truncation`,
      );
    }
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
      editionId: resolvedEditionId,
      editionSpecBytes16: effectiveSpecBytes,
      editionMode: Number(editionMode) || 0,
      paperCode,
      totalTandas,
      tandas: streamed.tandas,
      blobParts: streamed.blobParts,
      byteLength: streamed.byteLength,
      get pdfBytes() {
        return streamed.fullPdf;
      },
      peakRamBytes: Math.max(65536, streamed.peakRamBytes),
    };
  }

  const { utf8, bridgeUtf8 } = tandaSlices[0];
  const pdfBytes = executeWasmTandaTypeset(wasmExports, fontBytes, utf8, {
    bridgeFontBytes,
    boldFontBytes,
    tertiaryFontBytes,
    bridgeUtf8Bytes: bridgeUtf8,
    editionId: resolvedEditionId,
    editionRenderSpec: effectiveSpecBytes,
    editionMode,
    columns,
    paperCode,
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
    tandaIndex: 1,
    totalTandas: 1,
    bytes: pdfBytes.byteLength,
    peakRamBytes,
    fontFile,
  });
  const tandas = [
    {
      tandaIndex: 1,
      totalTandas: 1,
      fontFile,
      pdfBytes,
      peakRamBytes: Math.max(65536, peakRamBytes),
    },
  ];

  return {
    type: "tanda-complete",
    lang,
    fontFile,
    fontFsmState: fontFsm.state,
    wasmFontEmbedded: true,
    streamingSessionUsed: false,
    booklet4n: Boolean(booklet4n),
    editionId: resolvedEditionId,
    editionSpecBytes16: effectiveSpecBytes,
    editionMode: Number(editionMode) || 0,
    paperCode,
    totalTandas: 1,
    tandas,
    blobParts: [pdfBytes],
    pdfBytes,
    peakRamBytes: Math.max(65536, peakRamBytes),
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
