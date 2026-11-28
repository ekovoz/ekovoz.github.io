// ============================================================================
// web/mostrador/oral_audio_crc_verifier.js — Verificador Local de Tramas de
// Audio CRC-16 CCITT conectado a `verify_audio_frame_crc16_in_place` WASM (`RC20`)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { verifyAudioPcmCrc16InWasmLinearMemory } from "./data_layer.js";

export function computeCrc16CcittFalseJs(bytes) {
  let crc = 0xffff;
  for (let i = 0; i < bytes.byteLength; i += 1) {
    crc ^= (bytes[i] & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return Math.max(1, crc);
}

/**
 * Verifica tramas de audio de tamaño `frameSizeBytes` (últimos 2 bytes BE = CRC-16 CCITT).
 * Usa `ekovoz_player_wasm.verify_audio_frame_crc16_in_place` si está hidratado.
 */
export function verifyLocalAudioFileCrc16(
  bytes,
  {
    wasmExports = null,
    frameSizeBytes = 64,
    uiLocale = "es",
  } = {},
) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(0);
  const safeFrameSize = Math.max(4, Number(frameSizeBytes) || 64);
  const wasmMod = wasmExports?.memory ? { exports: wasmExports } : null;
  const wasmBacked = Boolean(typeof wasmExports?.verify_audio_frame_crc16_in_place === "function");

  if (raw.byteLength < 4) {
    return {
      valid: false,
      totalFrames: 0,
      validFrames: 0,
      corruptedFrames: 0,
      wasmBacked,
      summary: isEn ? "⛔ File too short for CRC-16 audio frames." : "⛔ Archivo insuficiente para tramas CRC-16.",
    };
  }

  let validFrames = 0;
  let corruptedFrames = 0;
  let offset = 0;
  while (offset + 4 <= raw.byteLength) {
    const chunkEnd = Math.min(raw.byteLength, offset + safeFrameSize);
    const body = raw.subarray(offset, chunkEnd - 2);
    const storedCrc = ((raw[chunkEnd - 2] << 8) | raw[chunkEnd - 1]) >>> 0;
    const computedCrc = wasmMod
      ? verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, body)
      : computeCrc16CcittFalseJs(body);
    if (computedCrc > 0 && computedCrc === storedCrc) {
      validFrames += 1;
    } else {
      corruptedFrames += 1;
    }
    offset = chunkEnd;
  }

  const totalFrames = validFrames + corruptedFrames;
  const valid = totalFrames > 0 && corruptedFrames === 0;
  const summary = valid
    ? (isEn
      ? `✅ Audio integrity verified (${validFrames}/${totalFrames} intact frames · ${wasmBacked ? "WASM" : "JS"}).`
      : `✅ Integridad de audio verificada (${validFrames}/${totalFrames} tramas íntegras · ${wasmBacked ? "WASM" : "JS"}).`)
    : (isEn
      ? `⛔ Audio corrupted (${corruptedFrames}/${totalFrames} damaged frames).`
      : `⛔ Audio dañado (${corruptedFrames}/${totalFrames} tramas con fallo).`);

  return { valid, totalFrames, validFrames, corruptedFrames, wasmBacked, summary };
}

export function renderOralAudioCrcVerifierHtml({
  uiLocale = "es",
  lastResult = null,
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const statusText = lastResult?.summary || "";
  return (
    `<section id="oralAudioCrcVerifierPanel" class="ek-mt-xs ek-row-wrap" data-technical-plane="true">` +
    `<label for="inputVerifyOralAudioCrc" class="uls-chip ek-file-picker-btn">🔊 ${isEn ? "Verify local audio" : "Verificar audio local"}` +
    `<input type="file" id="inputVerifyOralAudioCrc" class="sr-only-file-input" accept="audio/*,.pcm,.opus,.wav,.bin" aria-label="${escapeHtml(isEn ? "Select local audio file to verify integrity" : "Seleccionar archivo de audio local para verificar integridad")}" /></label>` +
    `<output id="oralAudioCrcStatus" class="ek-meta" aria-live="polite" data-crc-valid="${lastResult ? String(lastResult.valid) : ""}">${escapeHtml(statusText)}</output>` +
    `</section>`
  );
}

export function bindOralAudioCrcVerifierEvents({ containerEl, dataLayer, state, getEl, targetDoc } = {}) {
  const host = containerEl || getEl?.("bibleOralPorticoBanner", targetDoc);
  if (!host || typeof host.addEventListener !== "function" || host._oralCrcBound) return false;
  host._oralCrcBound = true;
  host.addEventListener("change", async (ev) => {
    if (ev?.target?.id !== "inputVerifyOralAudioCrc") return;
    const file = ev?.target?.files?.[0];
    if (!file || typeof file.arrayBuffer !== "function") return;
    const buf = new Uint8Array(await file.arrayBuffer());
    const playerMod =
      dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") ||
      (typeof dataLayer?.loadWasmModule === "function"
        ? await dataLayer.loadWasmModule("ekovoz_player_wasm").catch(() => null)
        : null);
    const res = verifyLocalAudioFileCrc16(buf, {
      wasmExports: playerMod?.exports || playerMod || null,
      uiLocale: state?.uiLocale || "es",
    });
    if (state) state.lastOralAudioCrcResult = res;
    const statusEl = getEl?.("oralAudioCrcStatus", targetDoc) || host.querySelector?.("#oralAudioCrcStatus");
    if (statusEl) {
      statusEl.setAttribute?.("data-crc-valid", String(res.valid));
      statusEl.textContent = res.summary;
    }
  });
  return true;
}
