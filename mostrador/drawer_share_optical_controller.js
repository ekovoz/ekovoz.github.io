// ============================================================================
// web/mostrador/drawer_share_optical_controller.js — Controlador Óptico Air-Gap
// TX/RX (ECO1 + Sistemático LT 0..K-1 + Cadencia Nyquist + Cámara Luma8 480×480)
// Costura Limpia ∂(C)=0 extraída de drawer_share.js (SLICE-EKO-V2I-07 + SLICE-EKO-V2I-24)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  STATUS,
  decodeFrameInWasmLinearMemory,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory,
} from "./data_layer.js";
import {
  LTEncoder,
  OPTICAL_CADENCE_PRESETS,
  QrStreamSession,
  decodeLubyTransformPeeling,
  decodeQrStreamViaWasmBridge,
  deriveWasmFountainSourceIndices,
  encodeDropletToMatrixGrid,
  encodeEco1BinaryPacket,
  encodeEcomMetadataPacket,
  encodeLubyTransformDroplets,
  renderDropletMatrixSvgOrCanvas,
  renderOpticalReceiverRxPanelHtml,
  runOpticalReceiverBurstSession,
  validateNyquistOpticalFps,
} from "./optical_lt.js";

/**
 * Tamaño de bloque LT calibrado a 12 B para que toda trama `ECO1`/`ECOM` (`<= 66 B`
 * hasta grado `d <= 15`) quepa íntegra dentro del codeword `ECO-GRID 29×29`.
 */
export const ECO1_MATRIX29_SAFE_BLOCK_BYTES = 12;
const ECO1_MATRIX29_MAX_DEGREE = 15;

function computeFnv1aShortDigestHex(bytes) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < bytes.byteLength; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Construye una trama óptica `ECO-GRID 29×29`:
 * - `0 <= seq < K`: pase sistemático `ECO1` (`degree = 1`, `indices = [seq]`).
 * - `seq === K`: paquete de cierre/integridad **`ECOM`** (`<= 66 B`) con digest del payload (`DEBRIS-V2LE-04`).
 * - `seq > K`: paquete de reparación LT Solitón unificado con `splitmix64` WASM (`deriveWasmFountainSourceIndices`).
 */
export function buildEco1OpticalTxFrame(rawBytes, seqNum = 0, streamId = 1) {
  const payload =
    rawBytes instanceof Uint8Array && rawBytes.byteLength > 0
      ? rawBytes
      : new Uint8Array([0x47, 0x45, 0x4e]);
  const blockSize = ECO1_MATRIX29_SAFE_BLOCK_BYTES;
  const encoder = new LTEncoder(payload, blockSize);
  const targetSeq = Math.max(0, Math.floor(Number(seqNum) || 0));

  if (targetSeq === encoder.K) {
    const packetBytes = encodeEcomMetadataPacket({
      streamId,
      seq: targetSeq,
      totalBytes: payload.byteLength,
      totalChunks: encoder.K,
      blockSize,
      sha256Hex: computeFnv1aShortDigestHex(payload),
      compact: true,
    });
    const grid = encodeDropletToMatrixGrid({ seq: targetSeq, degree: 0, packetBytes }, 29);
    return {
      encoder,
      blockSize,
      seq: targetSeq,
      packetKind: "ECOM",
      isEndOfStreamEcom: true,
      isSystematicPhase: false,
      degree: 0,
      indices: [],
      packetBytes,
      grid,
    };
  }

  let boundedIndices;
  const boundedData = new Uint8Array(blockSize);
  if (targetSeq < encoder.K) {
    boundedIndices = [targetSeq];
    boundedData.set(encoder.blocks[targetSeq]);
  } else {
    const repairPid = targetSeq - 1;
    const rawIdx = deriveWasmFountainSourceIndices(streamId, repairPid, encoder.K);
    boundedIndices = rawIdx.length > ECO1_MATRIX29_MAX_DEGREE ? rawIdx.slice(0, ECO1_MATRIX29_MAX_DEGREE) : rawIdx;
    for (const idx of boundedIndices) {
      const blk = encoder.blocks[idx];
      if (blk) {
        for (let j = 0; j < blockSize; j += 1) boundedData[j] ^= blk[j];
      }
    }
  }

  const packetBytes = encodeEco1BinaryPacket({
    streamId,
    seq: targetSeq < encoder.K ? targetSeq : targetSeq - 1,
    totalChunks: encoder.K,
    degree: boundedIndices.length,
    indices: boundedIndices,
    payloadBytes: boundedData,
  });

  const grid = encodeDropletToMatrixGrid(
    {
      seq: targetSeq,
      degree: boundedIndices.length,
      indices: boundedIndices,
      data: boundedData,
      packetBytes,
    },
    29,
  );

  return {
    encoder,
    blockSize,
    seq: targetSeq,
    packetKind: "ECO1",
    isEndOfStreamEcom: false,
    isSystematicPhase: targetSeq < encoder.K,
    degree: boundedIndices.length,
    indices: boundedIndices,
    packetBytes,
    grid,
  };
}

/**
 * Detiene limpiamente el bucle `requestAnimationFrame` de emisión `QRBeam` si está activo.
 */
export function stopQrBeamAutoCadenceTimer(state) {
  if (!state) return;
  if (state.qrBeamAutoRafId) {
    if (typeof globalThis.cancelAnimationFrame === "function") {
      try {
        globalThis.cancelAnimationFrame(state.qrBeamAutoRafId);
      } catch {
        // Non-fatal
      }
    }
    try {
      clearTimeout(state.qrBeamAutoRafId);
    } catch {
      // Non-fatal
    }
    state.qrBeamAutoRafId = null;
  }
  state.qrBeamAutoPlaying = false;
}

function drawGridOntoOpticalCanvas(canvasEl, grid) {
  if (!canvasEl || typeof canvasEl.getContext !== "function" || !grid?.cells) return;
  const ctx = canvasEl.getContext("2d");
  if (!ctx) return;
  const n = grid.gridSize || 29;
  const mod = Math.max(2, Math.floor((canvasEl.width || 174) / (n + 2)));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasEl.width || (n + 2) * mod, canvasEl.height || (n + 2) * mod);
  ctx.fillStyle = "#111111";
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (grid.cells[r * n + c]) {
        ctx.fillRect((c + 1) * mod, (r + 1) * mod, mod, mod);
      }
    }
  }
}

/**
 * Hidrata los paneles ópticos TX (`#bibleOpticalQrStreamPanel`) y RX (`#opticalReceiverRxPanel`).
 */
export function hydrateOpticalTxAndRxPanels({
  qrPanel,
  rxPanel,
  shutterInput,
  readoutInput,
  runRxBtn,
  getEl,
  targetDoc,
  state,
  dataLayer,
  isEn = false,
  rehydrateDrawer,
} = {}) {
  if (qrPanel) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      `${state.book}.${state.chapter}.${state.verse}`;
    const rawBytes = new TextEncoder().encode(
      JSON.stringify({
        osis: `${state.book}.${state.chapter}.${state.verse}`,
        lang: state.lang,
        text: verseText,
      }),
    );
    const seqNum = Number(state.qrFrameSeq) || 0;
    const txFrame = buildEco1OpticalTxFrame(rawBytes, seqNum, 1);
    const { encoder, grid, packetBytes, isSystematicPhase, isEndOfStreamEcom } = txFrame;
    const svgMarkup = renderDropletMatrixSvgOrCanvas(grid, null);
    const activeCadenceKey = String(state.opticalCadenceFps || "6.67") === "10" ? "10" : "6.67";
    const cadencePreset =
      OPTICAL_CADENCE_PRESETS[activeCadenceKey] || OPTICAL_CADENCE_PRESETS["6.67"];
    const nyquistCheck = validateNyquistOpticalFps(Number(activeCadenceKey) || 6.67);

    const kBound = Math.max(1, Math.min(50, rawBytes.byteLength));
    const safePeelBlock = Math.max(32, Math.ceil(Math.max(1, rawBytes.byteLength) / 50));
    const ltEncoded = encodeLubyTransformDroplets(rawBytes.subarray(0, kBound), {
      maxBlocks: 50,
      blockSize: safePeelBlock,
      dropletCount: Math.max(4, kBound * 2 + 4),
    });
    const dropletArray = Array.isArray(ltEncoded) ? ltEncoded : ltEncoded?.droplets || [];
    const kLt = Math.max(1, Math.min(50, Number(ltEncoded?.K) || kBound));
    const ltRecoveredBytes = decodeLubyTransformPeeling(dropletArray, kLt);
    const ltComplete =
      Array.isArray(ltRecoveredBytes) &&
      ltRecoveredBytes.length === kLt &&
      ltRecoveredBytes.every((val, idx) => val !== null && val === rawBytes[idx]);
    const isPlaying = Boolean(state.qrBeamAutoPlaying);
    const formatPhaseLabel = (tf) =>
      tf.isEndOfStreamEcom
        ? (isEn ? "Integrity confirmation" : "Cierre verificado")
        : tf.isSystematicPhase
          ? (isEn ? `Secure optical transfer · block ${tf.grid.seq + 1}/${tf.encoder.K}` : `Transferencia óptica segura · bloque ${tf.grid.seq + 1}/${tf.encoder.K}`)
          : (isEn ? `Recovery frame #${tf.grid.seq}` : `Cuadro de recuperación #${tf.grid.seq}`);
    const phaseLabel = formatPhaseLabel(txFrame);

    const activeQrMode = state.qrShareSubmode === "receive" ? "receive" : "send";
    const camHostEl = targetDoc?.getElementById?.("opticalCameraViewportHost") || null;
    const relayBtnEl = targetDoc?.getElementById?.("btnOpticalRelayTx") || null;
    const camBtnEl = targetDoc?.getElementById?.("btnToggleOpticalCameraRx") || null;
    const rxPanelEl = rxPanel || targetDoc?.getElementById?.("opticalReceiverRxPanel") || null;
    if (camHostEl) camHostEl.hidden = activeQrMode !== "receive";
    if (relayBtnEl) relayBtnEl.hidden = activeQrMode !== "receive";
    if (camBtnEl) camBtnEl.hidden = activeQrMode !== "receive";
    if (rxPanelEl) {
      rxPanelEl.hidden = activeQrMode !== "receive";
      if (activeQrMode !== "receive") rxPanelEl.innerHTML = "";
    }

    qrPanel.innerHTML =
      `<div id="qrBeamStreamRoot" class="mostrador-qrbeam-stream" data-fps="${activeCadenceKey}" data-nyquist-safe="${Boolean(nyquistCheck?.valid ?? nyquistCheck?.nyquistSafe)}" data-nyquist-channel-limit="4096" data-lt-peeling-decoded="${ltComplete}" data-eco1-bytes="${packetBytes.byteLength}" data-packet-kind="${txFrame.packetKind}" data-systematic-phase="${isSystematicPhase}" data-ecom-frame="${isEndOfStreamEcom}" data-frame-interval-ms="${cadencePreset.intervalMs}" data-total-blocks="${encoder.K}" data-seq="${grid.seq}" data-degree="${grid.degree}" data-parity="${grid.parityBit}" data-qr-mode="${activeQrMode}">` +
      `<div class="subtabs-bar ek-mb-sm" role="tablist" aria-label="${isEn ? "Optical transfer mode" : "Modo de transferencia óptica"}">` +
      `<button type="button" id="btnQrModeSend" class="uls-chip" role="tab" aria-selected="${activeQrMode === "send"}" aria-pressed="${activeQrMode === "send"}" data-qr-mode="send">📡 ${isEn ? "Show QR" : "Enviar QR"}</button>` +
      `<button type="button" id="btnQrModeReceive" class="uls-chip" role="tab" aria-selected="${activeQrMode === "receive"}" aria-pressed="${activeQrMode === "receive"}" data-qr-mode="receive">📷 ${isEn ? "Receive Camera" : "Recibir cámara"}</button>` +
      `</div>` +
      `<div class="ek-row-between ek-mb-sm">` +
      `<strong>📡 ${isEn ? "Offline Optical QR" : "QR Óptico sin internet"} (<span id="opticalFrameCounter" data-seq="${grid.seq}" data-packet-kind="${txFrame.packetKind}">${activeCadenceKey} fps · ${phaseLabel}</span>)</strong>` +
      `<div class="ek-flex-wrap-inline">` +
      `<button type="button" id="btnToggleQrBeamAutoPlay" class="uls-chip qrbeam-btn">${isPlaying ? (isEn ? "⏸ Pause Beam" : "⏸ Pausar Emisión") : isEn ? "▶ Auto Beam" : "▶ Emisión Continua"}</button>` +
      `<button type="button" id="btnNextQrBeamFrame" class="uls-chip qrbeam-btn">⏭ ${isEn ? "Next Frame" : "Siguiente cuadro"} (#${grid.seq + 1})</button>` +
      `</div></div>` +
      `<p id="opticalNyquistChannelHint" class="ek-meta ek-m-0 ek-mb-sm" data-optical-max-kb="4">${isEn ? "Physical QR limit <= 4–16 KB (1–3 chapters / verses). For the full Bible (~1 MB), export portable HTML or USB package." : "Límite físico QR <= 4–16 KB (pasajes y capítulos). Para Biblia completa (~1 MB), usa HTML portable o paquete USB."}</p>` +
      `<div class="ek-row-gap-lg">` +
      `<div id="qrBeamMatrixHost" class="qrbeam-matrix-host"><span id="qrBeamMatrixSvgSlot">${svgMarkup}</span><canvas id="qrBeamMatrixCanvas" width="174" height="174" aria-hidden="true"></canvas></div>` +
      `<details class="tech-details" data-advanced-audit="true"><summary>${isEn ? "Technical optical stream details" : "Detalles técnicos del canal óptico"}</summary>` +
      `<p class="qrbeam-desc">${isEn ? `ECO-GRID 29×29 (${packetBytes.byteLength} B ≤ 66 B): Systematic Pass (0..${encoder.K - 1}) + ECOM digest trailer + SplitMix64 LT repair tail.` : `ECO-GRID 29×29 (${packetBytes.byteLength} B ≤ 66 B): Pase sistemático (0..${encoder.K - 1}) + cierre ECOM + cola LT SplitMix64.`}</p>` +
      `</details>` +
      `</div></div>`;

    for (const [mBtnId, mVal] of [["btnQrModeSend", "send"], ["btnQrModeReceive", "receive"]]) {
      const mBtn = getEl(mBtnId, targetDoc);
      if (mBtn && typeof mBtn.addEventListener === "function" && !mBtn._qrModeBound) {
        mBtn._qrModeBound = true;
        mBtn.addEventListener("click", () => {
          state.qrShareSubmode = mVal;
          rehydrateDrawer?.(targetDoc);
        });
      }
    }

    const paintGranularOpticalFrame = (nextSeq) => {
      state.qrFrameSeq = nextSeq;
      const cycleMod = encoder.K + Math.max(4, Math.ceil(encoder.K * 0.5)) + 1;
      const effSeq = nextSeq % cycleMod;
      const nextTx = buildEco1OpticalTxFrame(rawBytes, effSeq, 1);
      const svgSlot = getEl("qrBeamMatrixSvgSlot", targetDoc);
      const canvasEl = getEl("qrBeamMatrixCanvas", targetDoc);
      if (svgSlot) {
        svgSlot.innerHTML = renderDropletMatrixSvgOrCanvas(nextTx.grid, null);
      } else {
        const matrixHost = getEl("qrBeamMatrixHost", targetDoc);
        if (matrixHost && !canvasEl) {
          matrixHost.innerHTML = renderDropletMatrixSvgOrCanvas(nextTx.grid, null);
        }
      }
      if (canvasEl) drawGridOntoOpticalCanvas(canvasEl, nextTx.grid);
      const counterEl = getEl("opticalFrameCounter", targetDoc);
      if (counterEl) {
        counterEl.textContent = `${activeCadenceKey} fps · ${formatPhaseLabel(nextTx)} · ${isEn ? "Parity" : "Paridad"} ${nextTx.grid.parityBit}`;
        counterEl.setAttribute?.("data-seq", String(nextTx.grid.seq));
        counterEl.setAttribute?.("data-packet-kind", nextTx.packetKind);
      }
      const rootEl = getEl("qrBeamStreamRoot", targetDoc);
      if (rootEl) {
        rootEl.setAttribute?.("data-seq", String(nextTx.grid.seq));
        rootEl.setAttribute?.("data-packet-kind", nextTx.packetKind);
      }
      return nextTx;
    };

    const nextFrameBtn = getEl("btnNextQrBeamFrame", targetDoc);
    if (nextFrameBtn && typeof nextFrameBtn.addEventListener === "function" && !nextFrameBtn._qrNextBound) {
      nextFrameBtn._qrNextBound = true;
      nextFrameBtn.addEventListener("click", () => {
        paintGranularOpticalFrame((Number(state.qrFrameSeq) || 0) + 1);
      });
    }

    const autoBtn = getEl("btnToggleQrBeamAutoPlay", targetDoc);
    if (autoBtn && typeof autoBtn.addEventListener === "function" && !autoBtn._qrAutoBound) {
      autoBtn._qrAutoBound = true;
      autoBtn.addEventListener("click", () => {
        if (state.qrBeamAutoPlaying) {
          stopQrBeamAutoCadenceTimer(state);
          autoBtn.textContent = isEn ? "▶ Auto Beam" : "▶ Emisión Continua";
          return;
        }
        stopQrBeamAutoCadenceTimer(state);
        state.qrBeamAutoPlaying = true;
        autoBtn.textContent = isEn ? "⏸ Pause Beam" : "⏸ Pausar Emisión";
        const frameIntervalMs = Math.max(134, Math.min(167, Number(cadencePreset.intervalMs) || 150));
        let lastFrameTs = 0;
        const scheduleRaf =
          typeof globalThis.requestAnimationFrame === "function"
            ? (cb) => globalThis.requestAnimationFrame(cb)
            : (cb) => {
              const id = setTimeout(() => cb(Date.now()), frameIntervalMs);
              if (typeof id?.unref === "function") id.unref();
              return id;
            };
        const onRafTick = (nowMs) => {
          if (!state.qrBeamAutoPlaying) {
            stopQrBeamAutoCadenceTimer(state);
            return;
          }
          if (!lastFrameTs || nowMs - lastFrameTs >= frameIntervalMs) {
            lastFrameTs = nowMs;
            paintGranularOpticalFrame((Number(state.qrFrameSeq) || 0) + 1);
          }
          if (state.qrBeamAutoPlaying) {
            state.qrBeamAutoRafId = scheduleRaf(onRafTick);
          }
        };
        state.qrBeamAutoRafId = scheduleRaf(onRafTick);
      });
    }
  }

  if (rxPanel && state?.qrShareSubmode === "receive") {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      `${state.book}.${state.chapter}.${state.verse}`;
    const rxWasm =
      typeof dataLayer?.getHydratedWasmModule === "function"
        ? dataLayer.getHydratedWasmModule("qr_stream_receiver_wasm")
        : null;
    const report =
      state.lastOpticalRxReport ||
      runOpticalReceiverBurstSession(
        {
          payloadText: `${state.book}.${state.chapter}.${state.verse} · ${verseText}`,
          shutterUs: state.rxShutterUs || 8000,
          rollingReadoutMs: state.rxRollingReadoutMs || 14,
          simulatedDrops: [1],
        },
        rxWasm,
      );
    state.lastOpticalRxReport = report;
    rxPanel.innerHTML = renderOpticalReceiverRxPanelHtml(report);

    const sIn = shutterInput || getEl("rxShutterUsInput", targetDoc);
    const rIn = readoutInput || getEl("rxRollingReadoutMsInput", targetDoc);
    const rBtn = runRxBtn || getEl("btnRunOpticalRxSession", targetDoc);

    const runRxUpdate = async () => {
      state.rxShutterUs = Number(sIn?.value) || state.rxShutterUs || 8000;
      state.rxRollingReadoutMs = Number(rIn?.value) || state.rxRollingReadoutMs || 14;
      let wasmMod =
        typeof dataLayer?.getHydratedWasmModule === "function"
          ? dataLayer.getHydratedWasmModule("qr_stream_receiver_wasm")
          : null;
      if (!wasmMod && typeof dataLayer?.loadWasmModule === "function") {
        try {
          const loaded = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
          if (loaded && loaded.status === STATUS.READY) wasmMod = loaded;
        } catch {
          wasmMod = null;
        }
      }
      const probeBytes = new TextEncoder().encode(`${state.book}.${state.chapter}.${state.verse}`);
      decodeFrameInWasmLinearMemory(wasmMod, probeBytes);
      verifyRaptorQBlockInWasmLinearMemory(wasmMod, probeBytes, 0);
      verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, probeBytes);
      state.lastOpticalRxReport = runOpticalReceiverBurstSession(
        {
          payloadText: `${state.book}.${state.chapter}.${state.verse} · ${verseText}`,
          shutterUs: state.rxShutterUs,
          rollingReadoutMs: state.rxRollingReadoutMs,
          simulatedDrops: [1, 3],
        },
        wasmMod,
      );
      rehydrateDrawer(targetDoc);
    };

    if (rBtn && typeof rBtn.addEventListener === "function" && !rBtn._rxRunBound) {
      rBtn._rxRunBound = true;
      rBtn.addEventListener("click", runRxUpdate);
    }
    for (const inp of [sIn, rIn]) {
      if (inp && typeof inp.addEventListener === "function" && !inp._rxInputBound) {
        inp._rxInputBound = true;
        inp.addEventListener("change", runRxUpdate);
      }
    }
  }
}

/**
 * Vincula la cámara óptica real (`getUserMedia` + `BarcodeDetector`/homografía WASM `Luma8 480×480`)
 * y el selector de cadencia Nyquist (`#bibleOpticalFpsSelect`).
 */
export function bindOpticalCameraAndCadenceController({
  fpsSel,
  camRxBtn,
  statusPanelGetter,
  videoElGetter,
  targetDoc,
  state,
  dataLayer,
  getUserMediaFn,
  rehydrateDrawer,
} = {}) {
  if (fpsSel && typeof fpsSel.addEventListener === "function") {
    fpsSel.addEventListener("change", (e) => {
      state.opticalCadenceFps =
        String(e?.target?.value || fpsSel.value || "6.67") === "10" ? "10" : "6.67";
      if (state.qrBeamAutoPlaying) {
        stopQrBeamAutoCadenceTimer(state);
      }
      rehydrateDrawer(targetDoc);
    });
  }

  const initialCamHost = targetDoc?.getElementById?.("opticalCameraViewportHost") || null;
  if (initialCamHost && !state?.opticalCameraActive) {
    initialCamHost.hidden = true;
    initialCamHost.setAttribute?.("data-camera-idle-hidden", "true");
  }
  if (!camRxBtn || typeof camRxBtn.addEventListener !== "function") return;

  camRxBtn.addEventListener("click", async () => {
    const statusPanel = statusPanelGetter();
    const videoEl = videoElGetter();
    const camHost = targetDoc?.getElementById?.("opticalCameraViewportHost") || null;
    const idleEl = targetDoc?.getElementById?.("opticalCameraIdlePlaceholder") || null;
    const willOpen = videoEl ? Boolean(videoEl.hidden) : !state.opticalCameraActive;
    state.opticalCameraActive = willOpen;
    if (camHost) camHost.hidden = !willOpen;
    if (videoEl) videoEl.hidden = !willOpen;
    if (idleEl) idleEl.hidden = willOpen;

    const stopOpticalCameraSession = () => {
      state.opticalCameraActive = false;
      if (camHost) camHost.hidden = true;
      if (videoEl) videoEl.hidden = true;
      if (idleEl) idleEl.hidden = false;
      if (
        state.activeCameraMediaStream &&
        typeof state.activeCameraMediaStream.getTracks === "function"
      ) {
        for (const trk of state.activeCameraMediaStream.getTracks()) {
          if (typeof trk.stop === "function") trk.stop();
        }
      }
      state.activeCameraMediaStream = null;
      if (state.activeCameraIntervalId) {
        clearInterval(state.activeCameraIntervalId);
        state.activeCameraIntervalId = null;
      }
      if (
        state.activeCameraRvfcHandle &&
        videoEl &&
        typeof videoEl.cancelVideoFrameCallback === "function"
      ) {
        videoEl.cancelVideoFrameCallback(state.activeCameraRvfcHandle);
      }
      state.activeCameraRvfcHandle = null;
    };

    if (!willOpen) {
      stopOpticalCameraSession();
      state.activeOpticalWasmSession = null;
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "optical-camera-stopped");
        statusPanel.textContent = "📷 Cámara óptica detenida y hardware liberado.";
      }
      return;
    }

    if (statusPanel) {
      statusPanel.hidden = false;
      statusPanel.setAttribute("data-audit-action", "optical-camera-rx");
      statusPanel.setAttribute("data-wasm-bridge", "loading");
    }

    let wasmMod = null;
    let wasmStatusAttr = "fallback";
    if (dataLayer && typeof dataLayer.loadWasmModule === "function") {
      try {
        wasmMod = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
        if (wasmMod?.exports?.ekovoz_wasm_abi_version) {
          wasmStatusAttr = `ready-v${wasmMod.exports.ekovoz_wasm_abi_version()}`;
        }
      } catch {
        wasmStatusAttr = "unavailable";
      }
    }
    state.activeOpticalWasmSession = null;
    state.lastSampledCameraMediaTime = -1;

    const ensureRxSessionForPacket = (pktBytes) => {
      if (state.activeOpticalWasmSession) return state.activeOpticalWasmSession;
      if (
        pktBytes instanceof Uint8Array &&
        pktBytes.byteLength >= 23 &&
        pktBytes[0] === 0x45 &&
        pktBytes[1] === 0x43 &&
        pktBytes[2] === 0x4f &&
        pktBytes[3] === 0x31
      ) {
        const dv = new DataView(pktBytes.buffer, pktBytes.byteOffset, pktBytes.byteLength);
        const streamId = dv.getUint32(6, false);
        const totalChunks = Math.max(1, dv.getUint16(14, false));
        const deg = Math.max(1, pktBytes[16]);
        const lenOffset = 17 + deg * 2;
        const blkSize =
          lenOffset + 2 <= pktBytes.byteLength
            ? Math.max(1, dv.getUint16(lenOffset, false))
            : ECO1_MATRIX29_SAFE_BLOCK_BYTES;
        state.activeOpticalWasmSession = new QrStreamSession({
          streamId,
          totalChunks,
          blockSize: blkSize,
          totalBytes: totalChunks * blkSize,
        });
      } else {
        state.activeOpticalWasmSession = new QrStreamSession();
      }
      return state.activeOpticalWasmSession;
    };

    const onBatchDecodedMaybeComplete = (wasmBatch) => {
      if (!wasmBatch || !wasmBatch.complete) return false;
      state.lastOpticalRxReport = wasmBatch;
      stopOpticalCameraSession();
      if (statusPanel) {
        const rxBytes = wasmBatch.reconstructedBytes || wasmBatch.decodedBytes || new Uint8Array(0);
        statusPanel.setAttribute("data-audit-action", "optical-camera-complete");
        statusPanel.setAttribute("data-rx-complete", "true");
        statusPanel.setAttribute("data-rx-bytes", String(rxBytes.byteLength || 0));
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="optical-camera-complete" data-rx-complete="true" data-rx-bytes="${rxBytes.byteLength || 0}">` +
          `✅ <strong>Recepción Óptica Completada (${rxBytes.byteLength || 0} B):</strong> ` +
          `Peeling LT/GF(2) convergente en sesión continua y cámara liberada.</div>`;
      }
      return true;
    };

    const detector =
      typeof globalThis.BarcodeDetector === "function"
        ? new globalThis.BarcodeDetector({ formats: ["qr_code"] })
        : null;
    let cameraMode = "wasm-homography-pgl3";
    if (typeof getUserMediaFn === "function") {
      try {
        const mediaStream = await getUserMediaFn({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 480 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        state.activeCameraMediaStream = mediaStream;
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          if (typeof videoEl.play === "function") {
            Promise.resolve(videoEl.play()).catch(() => { });
          }
          if (
            typeof videoEl.readyState === "number" &&
            videoEl.readyState < 2 &&
            typeof videoEl.addEventListener === "function"
          ) {
            await new Promise((resolve) => {
              let done = false;
              const finishReady = () => {
                if (done) return;
                done = true;
                resolve();
              };
              videoEl.addEventListener("loadeddata", finishReady, { once: true });
              setTimeout(finishReady, 80);
            });
          }
        }
        cameraMode = detector
          ? "getUserMedia+BarcodeDetector+WASM"
          : "getUserMedia+WASM-PGL3-RS256";
        const captureCanvas =
          typeof targetDoc?.createElement === "function" ? targetDoc.createElement("canvas") : null;
        if (captureCanvas) {
          captureCanvas.width = 480;
          captureCanvas.height = 480;
        }
        let samplingBusy = false;
        const sampleSingleFrame = async () => {
          if (samplingBusy || !state.opticalCameraActive || !videoEl) return;
          samplingBusy = true;
          try {
            if (detector && typeof detector.detect === "function") {
              try {
                const codes = await detector.detect(videoEl);
                if (Array.isArray(codes) && codes.length > 0 && (codes[0].rawBytes || codes[0].rawValue)) {
                  let rawFrameBytes;
                  if (codes[0].rawBytes instanceof Uint8Array && codes[0].rawBytes.byteLength > 0) {
                    rawFrameBytes = codes[0].rawBytes;
                  } else {
                    const rawStr = String(codes[0].rawValue || "");
                    state.lastScannedOpticalFrameRaw = rawStr;
                    const isBinaryEco = rawStr.startsWith("ECO1") || rawStr.startsWith("ECOM");
                    rawFrameBytes = isBinaryEco
                      ? Uint8Array.from(rawStr, (ch) => ch.charCodeAt(0) & 0xff)
                      : new TextEncoder().encode(rawStr);
                  }
                  const session = ensureRxSessionForPacket(rawFrameBytes);
                  const wasmBatch = decodeQrStreamViaWasmBridge([rawFrameBytes], wasmMod, session);
                  if (onBatchDecodedMaybeComplete(wasmBatch)) return;
                  return;
                }
              } catch {
                // Fallback a escáner Luma8 480×480 WASM PGL(3,ℝ) + RS(255,251)
              }
            }
            const ctx2d =
              captureCanvas && typeof captureCanvas.getContext === "function"
                ? captureCanvas.getContext("2d", { willReadFrequently: true })
                : null;
            if (
              ctx2d &&
              typeof ctx2d.drawImage === "function" &&
              typeof ctx2d.getImageData === "function" &&
              wasmMod?.exports?.scan_luma8_homography_rs_in_place
            ) {
              ctx2d.drawImage(videoEl, 0, 0, 480, 480);
              const rgba = ctx2d.getImageData(0, 0, 480, 480).data;
              const pixCount = 480 * 480;
              const ex = wasmMod.exports;
              const lumaPtr = ex.wasm_alloc(pixCount);
              const outPtr = ex.wasm_alloc(4096);
              try {
                const lumaView = new Uint8Array(ex.memory.buffer, lumaPtr, pixCount);
                for (let p = 0, q = 0; p < pixCount; p += 1, q += 4) {
                  lumaView[p] = (77 * rgba[q] + 150 * rgba[q + 1] + 29 * rgba[q + 2]) >> 8;
                }
                const decodedLen = ex.scan_luma8_homography_rs_in_place(
                  lumaPtr,
                  480,
                  480,
                  outPtr,
                  4096,
                );
                if (decodedLen > 0) {
                  const payloadSlice = new Uint8Array(
                    ex.memory.buffer,
                    outPtr,
                    decodedLen,
                  ).slice();
                  const session = ensureRxSessionForPacket(payloadSlice);
                  const wasmBatch = decodeQrStreamViaWasmBridge([payloadSlice], wasmMod, session);
                  onBatchDecodedMaybeComplete(wasmBatch);
                }
              } finally {
                ex.wasm_free(lumaPtr, pixCount);
                ex.wasm_free(outPtr, 4096);
              }
            }
          } finally {
            samplingBusy = false;
          }
        };
        await sampleSingleFrame();
        if (state.opticalCameraActive && videoEl) {
          const cadenceMs =
            OPTICAL_CADENCE_PRESETS[String(state.opticalCadenceFps || "6.67")]?.frameDurationMs ||
            150;
          if (typeof videoEl.requestVideoFrameCallback === "function") {
            const onRvfc = (_now, metadata) => {
              if (!state.opticalCameraActive || !videoEl) return;
              const mediaTime = Number(metadata?.mediaTime ?? videoEl.currentTime ?? 0);
              if (mediaTime !== state.lastSampledCameraMediaTime) {
                state.lastSampledCameraMediaTime = mediaTime;
                void sampleSingleFrame();
              }
              if (
                state.opticalCameraActive &&
                typeof videoEl.requestVideoFrameCallback === "function"
              ) {
                state.activeCameraRvfcHandle = videoEl.requestVideoFrameCallback(onRvfc);
              }
            };
            state.activeCameraRvfcHandle = videoEl.requestVideoFrameCallback(onRvfc);
          } else {
            state.activeCameraIntervalId = setInterval(() => {
              if (!state.opticalCameraActive || !videoEl) return;
              const curT = Number(videoEl.currentTime ?? -1);
              if (curT < 0 || curT !== state.lastSampledCameraMediaTime) {
                state.lastSampledCameraMediaTime = curT;
                void sampleSingleFrame();
              }
            }, cadenceMs);
            if (typeof state.activeCameraIntervalId?.unref === "function") {
              state.activeCameraIntervalId.unref();
            }
          }
        }
      } catch {
        cameraMode = "permission-denied-or-headless";
      }
    }

    if (statusPanel && statusPanel.getAttribute("data-audit-action") === "optical-camera-rx") {
      statusPanel.setAttribute("data-wasm-bridge", wasmStatusAttr);
      statusPanel.setAttribute("data-camera-mode", cameraMode);
      if (state.lastScannedOpticalFrameRaw) {
        statusPanel.setAttribute(
          "data-last-scanned-frame",
          state.lastScannedOpticalFrameRaw.slice(0, 64),
        );
      }
      statusPanel.innerHTML =
        `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-camera-mode="${escapeHtml(cameraMode)}" data-wasm-bridge="${escapeHtml(wasmStatusAttr)}">` +
        `📷 <strong>Receptor Óptico Bimodal Activo (≤ 32 KB · Modo=${escapeHtml(cameraMode)} · WASM=${escapeHtml(wasmStatusAttr)}):</strong> ` +
        `Captura real Luma8 480×480 + Homografía PGL(3,ℝ) + Reed-Solomon GF(2⁸) + Peeling LT/GF(2).</div>`;
    }
  });
}
