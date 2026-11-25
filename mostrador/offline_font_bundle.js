// ============================================================================
// web/mostrador/offline_font_bundle.js — Empaquetado Offline EKF1 (.ekfonts),
// Verificación Authenticate-then-Decompress (SHA-256 pre-Zstd & pre-IDB) e Importador Local.
// Decisión D5-V2LH / GAP-V2LF-08 (web/ <= 30 MB intacto, 0 descargas automáticas sin opt-in).
// ============================================================================

import {
  bytesToHexLower,
  computeSha256HexWebCrypto,
  sha256BytesSyncPureJs,
} from "./ekpack_binary_codec.js";
import { decodeRfc8878RawZstdFrameJs, storeFontBytesInVault } from "./offline_mesh.js";

const EKF1_VERSION = 1;
const EKF1_PREAMBLE_BYTES = 44;

/**
 * Calcula SHA-256 hex (64 caracteres minúsculas) usando WebCrypto cuando está disponible
 * con respaldo síncrono puro en JS para Workers o entornos headless mínimos.
 */
export async function sha256HexBytes(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  if (globalThis.crypto?.subtle?.digest) {
    try {
      return await computeSha256HexWebCrypto(u8);
    } catch {
      // Respaldo determinista JS puro
    }
  }
  return bytesToHexLower(sha256BytesSyncPureJs(u8));
}

function isZstdFrame(bytes) {
  return (
    bytes instanceof Uint8Array &&
    bytes.byteLength >= 4 &&
    bytes[0] === 0x28 &&
    bytes[1] === 0xb5 &&
    bytes[2] === 0x2f &&
    bytes[3] === 0xfd
  );
}

function isEkf1Bundle(bytes) {
  return (
    bytes instanceof Uint8Array &&
    bytes.byteLength >= EKF1_PREAMBLE_BYTES &&
    bytes[0] === 0x45 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x31
  );
}

function normalizeShaHex(hex) {
  return String(hex || "").trim().toLowerCase();
}

/**
 * Autentica un contenedor `.ekfonts` (`EKF1`) ANTES de descomprimir ningún frame `.ttf.zst`:
 * verifica magic `EKF1`, versión `1`, límites del JSON de índice, SHA-256 del payload completo
 * y SHA-256 individual de cada slice `.ttf.zst`.
 */
export async function parseAndVerifyEkfontsBundleJs(bundleBytes) {
  const u8 = bundleBytes instanceof Uint8Array ? bundleBytes : new Uint8Array(bundleBytes || 0);
  if (!isEkf1Bundle(u8)) {
    throw new Error("ERR_EKF1_INVALID_MAGIC: expected EKF1 bundle header");
  }
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const version = view.getUint16(4, true);
  if (version !== EKF1_VERSION) {
    throw new Error(`ERR_EKF1_UNSUPPORTED_VERSION: got ${version}, expected ${EKF1_VERSION}`);
  }
  const headerLen = view.getUint32(8, true);
  const payloadStart = EKF1_PREAMBLE_BYTES + headerLen;
  if (headerLen === 0 || payloadStart > u8.byteLength) {
    throw new Error("ERR_EKF1_INVALID_HEADER_LEN: JSON header exceeds container bounds");
  }
  const expectedPayloadSha = bytesToHexLower(u8.subarray(12, 44));
  const payloadBytes = u8.subarray(payloadStart);
  const actualPayloadSha = await sha256HexBytes(payloadBytes);
  if (actualPayloadSha !== expectedPayloadSha) {
    throw new Error(
      `ERR_EKF1_PAYLOAD_SHA_MISMATCH: expected ${expectedPayloadSha}, got ${actualPayloadSha}`,
    );
  }
  let index;
  try {
    index = JSON.parse(new TextDecoder("utf-8").decode(u8.subarray(EKF1_PREAMBLE_BYTES, payloadStart)));
  } catch (err) {
    throw new Error(`ERR_EKF1_CORRUPT_INDEX_JSON: ${err?.message || err}`);
  }
  const entries = Array.isArray(index?.entries) ? index.entries : [];
  if (entries.length === 0) {
    throw new Error("ERR_EKF1_EMPTY_ENTRIES");
  }
  const verifiedEntries = [];
  for (const entry of entries) {
    const file = String(entry?.file || "").trim();
    const offset = Number(entry?.offset);
    const zstBytes = Number(entry?.zstBytes);
    const expectedZstSha = normalizeShaHex(entry?.zstSha256);
    const expectedRawSha = normalizeShaHex(entry?.rawSha256);
    if (
      !file ||
      !Number.isInteger(offset) ||
      !Number.isInteger(zstBytes) ||
      offset < 0 ||
      zstBytes <= 0 ||
      offset + zstBytes > payloadBytes.byteLength
    ) {
      throw new Error(`ERR_EKF1_ENTRY_BOUNDS: invalid slice for '${file || "unknown"}'`);
    }
    const zstSlice = payloadBytes.subarray(offset, offset + zstBytes);
    if (expectedZstSha) {
      const actualZstSha = await sha256HexBytes(zstSlice);
      if (actualZstSha !== expectedZstSha) {
        throw new Error(
          `ERR_EKF1_ENTRY_ZST_SHA_MISMATCH: '${file}' expected ${expectedZstSha}, got ${actualZstSha}`,
        );
      }
    }
    verifiedEntries.push({
      file,
      zstFile: String(entry?.zstFile || `${file}.zst`),
      rawBytes: Number(entry?.rawBytes) || 0,
      zstSha256: expectedZstSha,
      rawSha256: expectedRawSha,
      zstSlice,
    });
  }
  return { version, payloadSha256: actualPayloadSha, entries: verifiedEntries };
}

async function resolveRuzstdWasmInstance(playerWasm, dataLayer) {
  let wasmMod = playerWasm || dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
  if (!wasmMod && typeof dataLayer?.loadWasmModule === "function") {
    try {
      wasmMod = await dataLayer.loadWasmModule("ekovoz_player_wasm");
    } catch {
      wasmMod = null;
    }
  }
  if (!wasmMod && typeof fetch === "function" && typeof WebAssembly === "object") {
    try {
      const wRes = await fetch(new URL("../wasm/ekovoz_player_wasm.wasm", import.meta.url));
      if (wRes?.ok) {
        wasmMod = (await WebAssembly.instantiate(await wRes.arrayBuffer(), {})).instance;
      }
    } catch {
      wasmMod = null;
    }
  }
  return wasmMod;
}

/**
 * Importa uno o múltiples archivos `.ekfonts`, `.ttf.zst` o `.ttf` hacia `ekovoz_vault_v2`,
 * validando integridad SHA-256 antes de descomprimir y antes de persistir cuando hay digest conocido.
 */
async function importLocalFontFilesToVault(
  fileList,
  {
    targetFontFile = "CharisSIL-Regular.ttf",
    manifestFonts = [],
    playerWasm = null,
    dataLayer = null,
    storeFont = storeFontBytesInVault,
    decodeZst = decodeRfc8878RawZstdFrameJs,
  } = {},
) {
  const files = Array.from(fileList || []).filter((f) => f && typeof f.arrayBuffer === "function");
  const manifestByKey = new Map();
  for (const item of Array.isArray(manifestFonts) ? manifestFonts : []) {
    if (item?.file) manifestByKey.set(String(item.file).trim(), item);
    if (item?.zstFile) manifestByKey.set(String(item.zstFile).trim(), item);
  }
  const importedFiles = [];
  const errors = [];
  let cachedWasm = null;

  const ensureWasm = async () => {
    if (!cachedWasm) {
      cachedWasm = await resolveRuzstdWasmInstance(playerWasm, dataLayer);
    }
    return cachedWasm;
  };

  for (const fileObj of files) {
    const fileName = String(fileObj.name || "").trim();
    try {
      const bytes = new Uint8Array(await fileObj.arrayBuffer());
      if (isEkf1Bundle(bytes) || fileName.toLowerCase().endsWith(".ekfonts")) {
        const bundle = await parseAndVerifyEkfontsBundleJs(bytes);
        const wasmMod = await ensureWasm();
        for (const entry of bundle.entries) {
          const rawTtf = decodeZst(entry.zstSlice, wasmMod);
          if (!(rawTtf instanceof Uint8Array) || rawTtf.byteLength < 64) {
            throw new Error(`ERR_EKF1_EMPTY_TTF: '${entry.file}'`);
          }
          const actualRawSha = await sha256HexBytes(rawTtf);
          if (entry.rawSha256 && actualRawSha !== entry.rawSha256) {
            throw new Error(
              `ERR_EKF1_RAW_SHA_MISMATCH: '${entry.file}' expected ${entry.rawSha256}, got ${actualRawSha}`,
            );
          }
          await storeFont(entry.file, rawTtf, { rawSha256: entry.rawSha256 || actualRawSha });
          importedFiles.push(entry.file);
        }
        continue;
      }

      const inferredName = fileName.replace(/\.zst$/i, "").trim() || targetFontFile;
      const mEntry =
        manifestByKey.get(fileName) ||
        manifestByKey.get(inferredName) ||
        manifestByKey.get(targetFontFile) ||
        null;

      let rawTtf = bytes;
      if (isZstdFrame(bytes)) {
        if (mEntry?.zstSha256) {
          const actualZstSha = await sha256HexBytes(bytes);
          if (actualZstSha !== normalizeShaHex(mEntry.zstSha256)) {
            throw new Error(`ERR_FONT_ZST_SHA_MISMATCH: '${inferredName}'`);
          }
        }
        const wasmMod = await ensureWasm();
        rawTtf = decodeZst(bytes, wasmMod);
      }

      if (rawTtf instanceof Uint8Array && rawTtf.byteLength >= 64) {
        const actualRawSha = await sha256HexBytes(rawTtf);
        if (mEntry?.rawSha256 && actualRawSha !== normalizeShaHex(mEntry.rawSha256)) {
          throw new Error(`ERR_FONT_RAW_SHA_MISMATCH: '${inferredName}'`);
        }
        const vaultKey =
          manifestByKey.has(inferredName) && fileName
            ? inferredName
            : fileName && fileName.toLowerCase().endsWith(".ttf") && !manifestByKey.size && targetFontFile === "CharisSIL-Regular.ttf"
              ? inferredName
              : targetFontFile || inferredName;
        await storeFont(vaultKey, rawTtf, { rawSha256: normalizeShaHex(mEntry?.rawSha256) || actualRawSha });
        importedFiles.push(vaultKey);
      }
    } catch (err) {
      errors.push(String(err?.message || err));
    }
  }
  return { importedFiles, errors };
}

/**
 * Monta el aviso no intrusivo de tipografía offline con importador multi-archivo
 * (`.ekfonts`, `.ttf`, `.ttf.zst`) validado antes de descomprimir y almacenar en IDB.
 */
export function mountOfflineFontNoticeWithLocalImporter(
  noticeEl,
  notice,
  { targetDoc, playerWasm = null, dataLayer = null, manifestFonts = [], onImported } = {},
) {
  if (!noticeEl || !notice) return;
  noticeEl.hidden = false;
  noticeEl.setAttribute?.("data-font-fsm-state", notice.fontFsmState || "OFFLINE_CSS_FALLBACK");
  const targetFontFile = String(notice.fontFile || "").trim() || "CharisSIL-Regular.ttf";
  noticeEl.setAttribute?.("data-missing-font-file", targetFontFile);
  noticeEl.textContent = notice.message || "";
  const docRef = targetDoc || globalThis.document;
  if (typeof docRef?.createElement === "function" && typeof noticeEl.appendChild === "function") {
    let importerInput = noticeEl.querySelector?.('input[data-local-font-importer="1"]') || null;
    if (!importerInput) {
      const lbl = docRef.createElement("label");
      lbl.textContent = ` (${targetFontFile} .ekfonts / .ttf / .ttf.zst) `;
      importerInput = docRef.createElement("input");
      importerInput.type = "file";
      importerInput.multiple = true;
      importerInput.accept = ".ekfonts,.ttf,.ttf.zst";
      importerInput.setAttribute?.("accept", ".ekfonts,.ttf,.ttf.zst");
      importerInput.setAttribute?.("multiple", "multiple");
      importerInput.setAttribute?.("data-local-font-importer", "1");
      importerInput.setAttribute?.("data-font-file", targetFontFile);
      importerInput.addEventListener?.("change", async (ev) => {
        const selectedFiles = ev?.target?.files || importerInput.files || [];
        const res = await importLocalFontFilesToVault(selectedFiles, {
          targetFontFile,
          manifestFonts,
          playerWasm,
          dataLayer,
        });
        if (res.errors.length > 0 && res.importedFiles.length === 0) {
          noticeEl.setAttribute?.("data-local-font-import-error", res.errors[0]);
          return;
        }
        if (res.importedFiles.length > 0) {
          noticeEl.setAttribute?.(
            "data-local-font-imported",
            res.importedFiles.includes(targetFontFile) ? targetFontFile : res.importedFiles[0],
          );
          noticeEl.setAttribute?.("data-local-font-imported-count", String(res.importedFiles.length));
          noticeEl.hidden = true;
          await onImported?.(res);
        }
      });
      lbl.appendChild?.(importerInput);
      noticeEl.appendChild(lbl);
    } else {
      importerInput.setAttribute?.("data-font-file", targetFontFile);
    }
  }
}

/**
 * Resume el catálogo de la bóveda tipográfica `.ekfonts` (`fonts_zst_manifest.json`, 34 fuentes `.ttf.zst`)
 * para exposición soberana en la UI de Compartir/Offline.
 */
export function summarizeOfflineFontsVaultCatalog(manifestData = null) {
  const rawFonts = Array.isArray(manifestData?.fonts)
    ? manifestData.fonts
    : Array.isArray(manifestData)
      ? manifestData
      : [];
  const seen = new Set();
  const fonts = [];
  const scripts = new Set();

  for (const item of rawFonts) {
    const file = String(item?.file || "").trim();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const lower = file.toLowerCase();
    const scriptTag = lower.includes("hebrew") || lower.includes("cardo")
      ? "Hebr"
      : lower.includes("arabic") || lower.includes("naskh") || lower.includes("nastaliq")
        ? "Arab"
        : lower.includes("devanagari")
          ? "Deva"
          : lower.includes("bengali")
            ? "Beng"
            : lower.includes("cjk") || lower.includes("jp") || lower.includes("kr") || lower.includes("sc")
              ? "Hani"
              : lower.includes("garamond")
                ? "Grek"
                : "Latn";
    scripts.add(scriptTag);
    fonts.push({
      file,
      zstFile: String(item?.zstFile || `${file}.zst`),
      url: String(item?.url || `packs/fonts/${file}.zst`),
      rawBytes: Number(item?.rawBytes) || 0,
      zstBytes: Number(item?.zstBytes) || 0,
      rawSha256: normalizeShaHex(item?.rawSha256),
      zstSha256: normalizeShaHex(item?.zstSha256),
      scriptTag,
    });
  }

  return {
    bundleFile: String(manifestData?.bundleFile || "ekovoz_fonts_bundle_v1.ekfonts"),
    bundleUrl: String(manifestData?.bundleUrl || "packs/fonts/ekovoz_fonts_bundle_v1.ekfonts"),
    bundleBytes: Number(manifestData?.bundleBytes) || 0,
    bundleSha256: normalizeShaHex(manifestData?.bundleSha256),
    codec: String(manifestData?.codec || "RFC8878_ZSTD_LEVEL_22"),
    totalFonts: fonts.length,
    scriptCount: scripts.size,
    fonts,
  };
}
