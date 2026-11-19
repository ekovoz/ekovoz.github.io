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
  encodeDropletToMatrixGrid,
  encodeEco1BinaryPacket,
  encodeLubyTransformDroplets,
  renderDropletMatrixSvgOrCanvas,
  renderOpticalReceiverRxPanelHtml,
  runOpticalReceiverBurstSession,
  validateNyquistOpticalFps,
} from "./optical_lt.js";

/**
 * Tamaño de bloque LT calibrado a 12 B para que toda trama `ECO1` (`23 + 2·d + 12 <= 65 B`
 * hasta grado `d <= 15`) quepa íntegra sin truncamiento dentro del codeword `ECO-GRID 29×29` (`66 B`).
 */
export const ECO1_MATRIX29_SAFE_BLOCK_BYTES = 12;
const ECO1_MATRIX29_MAX_DEGREE = 15;

/**
 * Construye una trama óptica `ECO1` real sobre `ECO-GRID 29×29`, garantizando fase sistemática
 * determinista en `Frames 0..K-1` (`degree = 1`, `indices = [seq]`) seguida de cola Solitón LT
 * acotada a `d <= 15` para paridad exacta `TX === RX` con `QrStreamSession`.
 */
export function buildEco1OpticalTxFrame(rawBytes, seqNum = 0, streamId = 1) {
  const payload =
    rawBytes instanceof Uint8Array && rawBytes.byteLength > 0
      ? rawBytes
      : new Uint8Array([0x47, 0x45, 0x4e]);
  const blockSize = ECO1_MATRIX29_SAFE_BLOCK_BYTES;
  const encoder = new LTEncoder(payload, blockSize);
  const targetSeq = Math.max(0, Math.floor(Number(seqNum) || 0));

  let droplet = encoder.nextDroplet();
  for (let i = 0; i < targetSeq; i += 1) {
    droplet = encoder.nextDroplet();
  }

  let boundedIndices = Array.isArray(droplet.indices) ? droplet.indices.slice() : [0];
  let boundedData =
    droplet.data instanceof Uint8Array ? droplet.data : new Uint8Array(blockSize);
  if (targetSeq < encoder.K) {
    // Pase 1 sistemático estricto (Frames 0..K-1): grado 1 exacto sobre el bloque `targetSeq`
    boundedIndices = [targetSeq];
    boundedData = encoder.blocks[targetSeq].slice();
  } else if (boundedIndices.length > ECO1_MATRIX29_MAX_DEGREE) {
    boundedIndices = boundedIndices.slice(0, ECO1_MATRIX29_MAX_DEGREE);
    const recomputed = new Uint8Array(blockSize);
    for (const idx of boundedIndices) {
      const blk = encoder.blocks[idx];
      if (blk) {
        for (let j = 0; j < blockSize; j += 1) recomputed[j] ^= blk[j];
      }
    }
    boundedData = recomputed;
  }

  const packetBytes = encodeEco1BinaryPacket({
    streamId,
    seq: targetSeq,
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
    isSystematicPhase: targetSeq < encoder.K,
    degree: boundedIndices.length,
    indices: boundedIndices,
    packetBytes,
    grid,
  };
}

/**
 * Detiene limpiamente el temporizador automático de emisión `QRBeam` si está activo.
 */
export function stopQrBeamAutoCadenceTimer(state) {
  if (!state) return;
  if (state.qrBeamAutoIntervalId) {
    clearInterval(state.qrBeamAutoIntervalId);
    state.qrBeamAutoIntervalId = null;
  }
  state.qrBeamAutoPlaying = false;
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
    const { encoder, grid, packetBytes, isSystematicPhase } = txFrame;
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
    const phaseLabel = isSystematicPhase
      ? isEn
        ? `Systematic ${grid.seq + 1}/${encoder.K}`
        : `Sistemático ${grid.seq + 1}/${encoder.K}`
      : isEn
        ? `LT Soliton #${grid.seq}`
        : `Solitón LT #${grid.seq}`;

    qrPanel.innerHTML =
      `<div class="mostrador-qrbeam-stream" data-fps="${activeCadenceKey}" data-nyquist-safe="${Boolean(nyquistCheck?.valid ?? nyquistCheck?.nyquistSafe)}" data-lt-peeling-decoded="${ltComplete}" data-eco1-bytes="${packetBytes.byteLength}" data-systematic-phase="${isSystematicPhase}" data-frame-interval-ms="${cadencePreset.intervalMs}" data-total-blocks="${encoder.K}" data-seq="${grid.seq}" data-degree="${grid.degree}" data-parity="${grid.parityBit}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
      `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;">` +
      `<strong>📡 QRBeam ECO1 (${activeCadenceKey} fps · ${cadencePreset.intervalMs} ms · ${phaseLabel} · ${isEn ? "Parity" : "Paridad"} ${grid.parityBit})</strong>` +
      `<div style="display:inline-flex;gap:0.35rem;flex-wrap:wrap;">` +
      `<button type="button" id="btnToggleQrBeamAutoPlay" class="uls-chip" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.78rem;">${isPlaying ? (isEn ? "⏸ Pause Beam" : "⏸ Pausar Emisión") : isEn ? "▶ Auto Beam" : "▶ Emisión Continua"}</button>` +
      `<button type="button" id="btnNextQrBeamFrame" class="uls-chip" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.78rem;">⏭ ${isEn ? "Next Droplet" : "Siguiente Droplet"} (#${grid.seq + 1})</button>` +
      `</div></div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">` +
      `<div class="qrbeam-matrix-host">${svgMarkup}</div>` +
      `<p style="margin:0;font-size:0.81rem;flex:1;min-width:180px;">${isEn ? `ECO1 binary frame (${packetBytes.byteLength} B ≤ 66 B): Systematic Pass 1 (Frames 0..${encoder.K - 1}, degree=1) + XOR whitening <code>whitenBlockXor</code> + Luby Transform Soliton tail.` : `Trama binaria ECO1 (${packetBytes.byteLength} B ≤ 66 B): Pase 1 sistemático (Frames 0..${encoder.K - 1}, grado=1) + blanqueo XOR <code>whitenBlockXor</code> + cola Solitón Luby Transform.`}</p>` +
      `</div></div>`;

    const nextFrameBtn = getEl("btnNextQrBeamFrame", targetDoc);
    if (nextFrameBtn && typeof nextFrameBtn.addEventListener === "function" && !nextFrameBtn._qrNextBound) {
      nextFrameBtn._qrNextBound = true;
      nextFrameBtn.addEventListener("click", () => {
        state.qrFrameSeq = (Number(state.qrFrameSeq) || 0) + 1;
        rehydrateDrawer(targetDoc);
      });
    }

    const autoBtn = getEl("btnToggleQrBeamAutoPlay", targetDoc);
    if (autoBtn && typeof autoBtn.addEventListener === "function" && !autoBtn._qrAutoBound) {
      autoBtn._qrAutoBound = true;
      autoBtn.addEventListener("click", () => {
        if (state.qrBeamAutoPlaying) {
          stopQrBeamAutoCadenceTimer(state);
          rehydrateDrawer(targetDoc);
          return;
        }
        stopQrBeamAutoCadenceTimer(state);
        state.qrBeamAutoPlaying = true;
        const intervalMs = Math.max(100, Number(cadencePreset.intervalMs) || 150);
        state.qrBeamAutoIntervalId = setInterval(() => {
          if (!state.qrBeamAutoPlaying) {
            stopQrBeamAutoCadenceTimer(state);
            return;
          }
          state.qrFrameSeq = (Number(state.qrFrameSeq) || 0) + 1;
          rehydrateDrawer(targetDoc);
        }, intervalMs);
        if (typeof state.qrBeamAutoIntervalId?.unref === "function") {
          state.qrBeamAutoIntervalId.unref();
        }
        rehydrateDrawer(targetDoc);
      });
    }
  }

  if (rxPanel) {
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

  if (!camRxBtn || typeof camRxBtn.addEventListener !== "function") return;

  camRxBtn.addEventListener("click", async () => {
    const statusPanel = statusPanelGetter();
    const videoEl = videoElGetter();
    const willOpen = videoEl ? Boolean(videoEl.hidden) : !state.opticalCameraActive;
    state.opticalCameraActive = willOpen;
    if (videoEl) videoEl.hidden = !willOpen;

    const stopOpticalCameraSession = () => {
      state.opticalCameraActive = false;
      if (videoEl) videoEl.hidden = true;
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
      if (statusPanel.style) statusPanel.style.display = "";
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
            Promise.resolve(videoEl.play()).catch(() => {});
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
                if (Array.isArray(codes) && codes.length > 0 && codes[0].rawValue) {
                  state.lastScannedOpticalFrameRaw = String(codes[0].rawValue);
                  const rawFrameBytes = new TextEncoder().encode(state.lastScannedOpticalFrameRaw);
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
