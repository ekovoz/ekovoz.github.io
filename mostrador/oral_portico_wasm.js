// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D10-R45 (10A+) | oral_portico_wasm.js]
// web/mostrador/oral_portico_wasm.js — Costura Limpia ∂_mut(C) = 0 del Pórtico Prosódico WASM (0 Bytes Audio)
// Extraído de web/mostrador.js (SLICE-185) con inyección explícita de contexto.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { STATUS, computeProsodyAndSyllableAlignmentInWasm } from "./data_layer.js";

function stopOralPorticoAnimationLoop(state) {
  if (!state) return;
  if (state.oralPorticoRafId && typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(state.oralPorticoRafId);
  }
  state.oralPorticoRafId = null;
  if (state.oralPorticoFallbackTimerId) {
    clearInterval(state.oralPorticoFallbackTimerId);
    state.oralPorticoFallbackTimerId = null;
  }
  state.oralPorticoPlaying = false;
}

/**
 * Renderiza la consola prosódica interactiva en `#bibleOralPorticoBanner` (`0 Bytes Audio`, CRC-16 + sílabas WASM completas sin truncar a 24).
 */
export function renderOralPorticoWasmConsole({
  state,
  dataLayer,
  getEl,
  targetDoc,
} = {}) {
  if (!state || typeof getEl !== "function") return null;
  const oralBanner = getEl("bibleOralPorticoBanner", targetDoc);
  if (!oralBanner) return null;
  const verseText =
    state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
    "En el principio creó Dios los cielos y la tierra.";
  const wpm = Number(state.audioCadenceWpm) || 135;
  const wordCount = Math.max(1, verseText.trim().split(/\s+/).filter(Boolean).length);
  const dynamicTotalMs = Math.max(2500, Math.round((wordCount / Math.max(60, wpm)) * 60000));
  const totalMs = Number(state.audioTotalMs) || dynamicTotalMs;
  const elapsedMs = Math.max(0, Math.min(totalMs, Number(state.audioElapsedMs ?? 3000)));
  const playerWasm =
    dataLayer && typeof dataLayer.getHydratedWasmModule === "function"
      ? dataLayer.getHydratedWasmModule("ekovoz_player_wasm")
      : null;
  const prosody = computeProsodyAndSyllableAlignmentInWasm(
    { text: verseText, wpm, elapsedMs, totalMs },
    playerWasm,
  );
  state.lastProsodyAlignment = prosody;
  const isPlaying = Boolean(state.oralPorticoPlaying);
  const syllablesHtml = prosody.syllables
    .map(
      (syl, idx) =>
        `<span class="uls-badge" data-syllable-index="${idx}" data-syllable-active="${idx === prosody.activeSyllableIndex}" style="${idx === prosody.activeSyllableIndex ? "font-weight:700;border-color:var(--accent-amber);" : "opacity:0.8;"}">${escapeHtml(syl)}</span>`,
    )
    .join(" ");

  oralBanner.innerHTML =
    `<div id="bibleAudioCadenceBar" class="mostrador-audio-cadence-bar" ` +
    `data-wpm="${prosody.wpm}" ` +
    `data-elapsed-ms="${prosody.elapsedMs}" ` +
    `data-total-ms="${prosody.totalMs}" ` +
    `data-syllable-count="${prosody.syllables.length}" ` +
    `data-playing="${isPlaying}" ` +
    `data-active-syllable-index="${prosody.activeSyllableIndex}" ` +
    `data-active-syllable="${escapeHtml(prosody.activeSyllable)}" ` +
    `data-pause-comma-ms="${prosody.pauseCommaMs}" ` +
    `data-pause-semicolon-ms="${prosody.pauseSemicolonMs}" ` +
    `data-pause-period-ms="${prosody.pausePeriodSelahMs}" ` +
    `data-audio-crc16="${escapeHtml(prosody.crc16Hex)}" ` +
    `data-wasm-backed="${prosody.wasmBacked}">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.45rem;margin-bottom:0.4rem;">` +
    `<strong>🗣️ Escucha Guiada (${escapeHtml(`${state.book} ${state.chapter}:${state.verse}`)}) <small class="uls-badge hig-tech-meta">Pórtico Prosódico WASM · 0 Bytes Audio · ${prosody.wpm} WPM · CRC-16=${escapeHtml(prosody.crc16Hex)}</small></strong>` +
    `<div style="display:inline-flex;flex-wrap:wrap;gap:0.4rem;align-items:center;font-size:0.78rem;">` +
    `<button type="button" id="btnPlayPauseOralPorticoCadence" class="uls-chip" style="min-height:40px;padding:0.2rem 0.6rem;">${isPlaying ? "⏸ Pausar" : "▶ Guiar Versículo"}</button>` +
    `<label for="audioCadenceWpmSelect">Cadencia: ` +
    `<select id="audioCadenceWpmSelect" style="min-height:48px;padding:0.2rem 0.4rem;">` +
    [90, 120, 135, 160]
      .map((w) => `<option value="${w}"${w === prosody.wpm ? " selected" : ""}>${w} WPM</option>`)
      .join("") +
    `</select></label>` +
    `<label for="audioElapsedRange">Cursor (ms): ` +
    `<input id="audioElapsedRange" type="range" min="0" max="${prosody.totalMs}" step="250" value="${prosody.elapsedMs}" style="vertical-align:middle;">` +
    `</label>` +
    `</div></div>` +
    `<div class="oral-portico-secondary" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.35rem;font-size:0.75rem;">` +
    `<span class="uls-badge" data-prosodic-pause="comma">τ₁ Coma: ${prosody.pauseCommaMs} ms</span>` +
    `<span class="uls-badge" data-prosodic-pause="semicolon">τ₂ Punto y coma: ${prosody.pauseSemicolonMs} ms</span>` +
    `<span class="uls-badge" data-prosodic-pause="period">τ₃ Punto / Selah: ${prosody.pausePeriodSelahMs} ms</span>` +
    `<span class="uls-badge" data-prosodic-cursor="true">Sílaba #${prosody.activeSyllableIndex + 1}/${prosody.syllables.length}: «${escapeHtml(prosody.activeSyllable)}»</span>` +
    `</div>` +
    `<div class="prosody-syllable-strip oral-portico-secondary" style="display:flex;flex-wrap:wrap;gap:0.25rem;font-size:0.76rem;">${syllablesHtml}</div>` +
    `</div>`;

  const playBtn = getEl("btnPlayPauseOralPorticoCadence", targetDoc);
  if (playBtn && typeof playBtn.addEventListener === "function") {
    playBtn.addEventListener("click", () => {
      if (state.oralPorticoPlaying) {
        stopOralPorticoAnimationLoop(state);
        renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
        return;
      }
      stopOralPorticoAnimationLoop(state);
      state.oralPorticoPlaying = true;
      if ((Number(state.audioElapsedMs) || 0) >= prosody.totalMs) {
        state.audioElapsedMs = 0;
      }
      const startWall = typeof performance !== "undefined" ? performance.now() : Date.now();
      const baseElapsed = Number(state.audioElapsedMs) || 0;
      if (typeof globalThis.requestAnimationFrame === "function") {
        const stepRaf = (nowTs) => {
          if (!state.oralPorticoPlaying || !state.oralPorticoActive) {
            stopOralPorticoAnimationLoop(state);
            return;
          }
          const curNow = Number.isFinite(nowTs) ? nowTs : Date.now();
          const nextElapsed = Math.min(prosody.totalMs, Math.round(baseElapsed + (curNow - startWall)));
          state.audioElapsedMs = nextElapsed;
          if (nextElapsed >= prosody.totalMs) {
            stopOralPorticoAnimationLoop(state);
            renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
            return;
          }
          renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
          state.oralPorticoRafId = globalThis.requestAnimationFrame(stepRaf);
        };
        state.oralPorticoRafId = globalThis.requestAnimationFrame(stepRaf);
      } else {
        state.oralPorticoFallbackTimerId = setInterval(() => {
          if (!state.oralPorticoPlaying || !state.oralPorticoActive) {
            stopOralPorticoAnimationLoop(state);
            return;
          }
          const nextElapsed = Math.min(prosody.totalMs, (Number(state.audioElapsedMs) || 0) + 120);
          state.audioElapsedMs = nextElapsed;
          if (nextElapsed >= prosody.totalMs) {
            stopOralPorticoAnimationLoop(state);
          }
          renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
        }, 120);
        if (typeof state.oralPorticoFallbackTimerId?.unref === "function") {
          state.oralPorticoFallbackTimerId.unref();
        }
      }
      renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
    });
  }

  const wpmSel = getEl("audioCadenceWpmSelect", targetDoc);
  if (wpmSel && typeof wpmSel.addEventListener === "function") {
    wpmSel.addEventListener("change", (e) => {
      state.audioCadenceWpm = Number(e?.target?.value || wpmSel.value) || 135;
      renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
    });
  }
  const elapsedRange = getEl("audioElapsedRange", targetDoc);
  if (elapsedRange && typeof elapsedRange.addEventListener === "function") {
    const onRangeChange = (e) => {
      state.audioElapsedMs = Number(e?.target?.value ?? elapsedRange.value) || 0;
      renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
    };
    elapsedRange.addEventListener("input", onRangeChange);
    elapsedRange.addEventListener("change", onRangeChange);
  }
  return prosody;
}

/**
 * Conecta el interruptor `#btnToggleAudioNarakeet` con `#bibleOralPorticoBanner` y carga perezosa de `ekovoz_player_wasm`.
 */
export function bindOralPorticoToggleEvent({
  state,
  dataLayer,
  getEl,
  renderViewportFromState,
  targetDoc,
} = {}) {
  if (!state || typeof getEl !== "function") return;
  const oralBtn = getEl("btnToggleAudioNarakeet", targetDoc);
  const oralBanner = getEl("bibleOralPorticoBanner", targetDoc);
  if (!oralBtn || typeof oralBtn.addEventListener !== "function") return;

  oralBtn.addEventListener("click", async () => {
    state.oralPorticoActive = !state.oralPorticoActive;
    if (!state.oralPorticoActive) {
      stopOralPorticoAnimationLoop(state);
    }
    oralBtn.setAttribute("aria-pressed", state.oralPorticoActive ? "true" : "false");
    if (oralBanner) {
      oralBanner.hidden = !state.oralPorticoActive;
      if (oralBanner.style) {
        oralBanner.style.display = state.oralPorticoActive ? "block" : "none";
      }
      if (state.oralPorticoActive) {
        renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
      }
    }
    if (typeof renderViewportFromState === "function") {
      renderViewportFromState(targetDoc);
    }
    if (state.oralPorticoActive && oralBanner && dataLayer && typeof dataLayer.loadWasmModule === "function") {
      try {
        const wasmMod = await dataLayer.loadWasmModule("ekovoz_player_wasm");
        if (wasmMod && wasmMod.status === STATUS.READY) {
          renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
        }
      } catch {
        // Fallback deterministic prosody stays active
      }
    }
  });
}
