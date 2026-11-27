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
  if (state.oralVoiceActive && typeof globalThis.speechSynthesis?.cancel === "function") {
    try {
      globalThis.speechSynthesis.cancel();
    } catch {
      // Headless / sandboxed environments may lack full speechSynthesis
    }
  }
  state.oralPorticoPlaying = false;
}

function patchOralPorticoCursorInPlace({
  oralBanner,
  state,
  prosody,
  isPlaying,
  getEl,
  targetDoc,
}) {
  const isEn = String(state?.uiLocale || state?.lang || "es").trim().toLowerCase().startsWith("en");
  const cadenceBar =
    (typeof getEl === "function" ? getEl("bibleAudioCadenceBar", targetDoc) : null) ||
    (typeof oralBanner?.querySelector === "function"
      ? oralBanner.querySelector("#bibleAudioCadenceBar")
      : null);
  if (cadenceBar && typeof cadenceBar.setAttribute === "function") {
    cadenceBar.setAttribute("data-elapsed-ms", String(prosody.elapsedMs));
    cadenceBar.setAttribute("data-playing", String(isPlaying));
    cadenceBar.setAttribute("data-active-syllable-index", String(prosody.activeSyllableIndex));
    cadenceBar.setAttribute("data-active-syllable", String(prosody.activeSyllable || ""));
  }
  const elapsedRange =
    (typeof getEl === "function" ? getEl("audioElapsedRange", targetDoc) : null) ||
    (typeof oralBanner?.querySelector === "function"
      ? oralBanner.querySelector("#audioElapsedRange")
      : null);
  if (elapsedRange) {
    elapsedRange.value = String(prosody.elapsedMs);
  }
  const playBtn =
    (typeof getEl === "function" ? getEl("btnPlayPauseOralPorticoCadence", targetDoc) : null) ||
    (typeof oralBanner?.querySelector === "function"
      ? oralBanner.querySelector("#btnPlayPauseOralPorticoCadence")
      : null);
  if (playBtn) {
    playBtn.textContent = isPlaying
      ? (isEn ? "⏸ Pause" : "⏸ Pausar")
      : (isEn ? "▶ Guide Verse" : "▶ Guiar Versículo");
  }
  const cursorBadge =
    typeof oralBanner?.querySelector === "function"
      ? oralBanner.querySelector('[data-prosodic-cursor="true"]')
      : null;
  if (cursorBadge) {
    cursorBadge.textContent = isEn
      ? `Syllable #${prosody.activeSyllableIndex + 1}/${prosody.syllables.length}: «${prosody.activeSyllable}»`
      : `Sílaba #${prosody.activeSyllableIndex + 1}/${prosody.syllables.length}: «${prosody.activeSyllable}»`;
  }
  const spans =
    Array.isArray(oralBanner?._porticoSyllableSpans) && oralBanner._porticoSyllableSpans.length > 0
      ? oralBanner._porticoSyllableSpans
      : typeof oralBanner?.querySelectorAll === "function"
        ? Array.from(oralBanner.querySelectorAll("[data-syllable-index]"))
        : [];
  for (let idx = 0; idx < spans.length; idx += 1) {
    const sp = spans[idx];
    const isActive = idx === prosody.activeSyllableIndex;
    if (sp?.classList && typeof sp.classList.toggle === "function") {
      sp.classList.toggle("is-active-syllable", isActive);
    } else if (sp && typeof sp.className === "string") {
      sp.className = isActive ? "uls-badge is-active-syllable" : "uls-badge";
    }
    if (sp && typeof sp.setAttribute === "function") {
      sp.setAttribute("data-syllable-active", isActive ? "true" : "false");
    }
  }
  const vpEl = typeof getEl === "function" ? getEl("bibleVerseViewport", targetDoc) : null;
  const wordTokens = typeof vpEl?.querySelectorAll === "function" ? Array.from(vpEl.querySelectorAll(".bible-word-token")) : [];
  const totalSyl = Math.max(1, prosody.syllables?.length || spans.length || 1);
  if (wordTokens.length > 0) {
    const tokIdx = Math.min(wordTokens.length - 1, Math.floor((Number(prosody.activeSyllableIndex || 0) / totalSyl) * wordTokens.length));
    for (let wi = 0; wi < wordTokens.length; wi += 1) {
      const wEl = wordTokens[wi];
      const activeWord = wi === tokIdx;
      wEl?.classList?.toggle?.("is-speaking-word", activeWord);
      wEl?.setAttribute?.("data-speaking-word", activeWord ? "true" : "false");
    }
  }
  if (state) state.lastProsodyAlignment = prosody;
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
  const wpm = Number(state.audioCadenceWpm) || 150;
  const targetSyllablesPerSec = 5.0 * (Math.max(60, wpm) / 150);
  const playerWasm =
    dataLayer && typeof dataLayer.getHydratedWasmModule === "function"
      ? dataLayer.getHydratedWasmModule("ekovoz_player_wasm")
      : null;
  const preProsody = computeProsodyAndSyllableAlignmentInWasm(
    { text: verseText, wpm, elapsedMs: 0, totalMs: 12000 },
    playerWasm,
  );
  const dynamicTotalMs = Math.max(
    1500,
    Math.round((Math.max(1, preProsody.syllableCount) / Math.max(1, targetSyllablesPerSec)) * 1000),
  );
  const totalMs = Number(state.audioTotalMs) || dynamicTotalMs;
  const elapsedMs = Math.max(0, Math.min(totalMs, Number(state.audioElapsedMs ?? 0)));
  const prosody = computeProsodyAndSyllableAlignmentInWasm(
    { text: verseText, wpm, elapsedMs, totalMs },
    playerWasm,
  );
  state.lastProsodyAlignment = prosody;
  const isEn = String(state.uiLocale || state.lang || "es").trim().toLowerCase().startsWith("en");
  const isPlaying = Boolean(state.oralPorticoPlaying);
  const voiceActive = Boolean(state.oralVoiceActive);
  const mountKey = `${state.book}|${state.chapter}|${state.verse}|${prosody.wpm}|${prosody.totalMs}|${prosody.syllables.length}|${prosody.wasmBacked}|${isEn ? "en" : "es"}|${voiceActive}|${isPlaying || Boolean(state.oralAudioPlayed)}`;

  if (
    oralBanner._porticoMountKey === mountKey &&
    ((Array.isArray(oralBanner._porticoSyllableSpans) && oralBanner._porticoSyllableSpans.length > 0) ||
      typeof oralBanner.querySelectorAll === "function")
  ) {
    patchOralPorticoCursorInPlace({
      oralBanner,
      state,
      prosody,
      isPlaying,
      getEl,
      targetDoc,
    });
    return prosody;
  }

  const syllablesHtml = prosody.syllables
    .map(
      (syl, idx) =>
        `<span class="uls-badge${idx === prosody.activeSyllableIndex ? " is-active-syllable" : ""}" data-syllable-index="${idx}" data-syllable-active="${idx === prosody.activeSyllableIndex}">${escapeHtml(syl)}</span>`,
    )
    .join(" ");

  const guideBtnLabel = isPlaying
    ? (isEn ? "⏸ Pause" : "⏸ Pausar")
    : (isEn ? "▶ Guide Verse" : "▶ Guiar Versículo");
  const voiceToggleLabel = voiceActive
    ? (isEn ? "🔊 Device Voice: On" : "🔊 Voz del dispositivo: Activa")
    : (isEn ? "🔊 Device Voice: Off" : "🔊 Voz del dispositivo: Apagada");

  oralBanner.innerHTML =
    `<div id="bibleAudioCadenceBar" class="mostrador-audio-cadence-bar" data-portico-compact="true" ` +
    `data-wpm="${prosody.wpm}" ` +
    `data-target-bits-per-sec="${prosody.targetBitsPerSec}" ` +
    `data-elapsed-ms="${prosody.elapsedMs}" ` +
    `data-total-ms="${prosody.totalMs}" ` +
    `data-syllable-count="${prosody.syllables.length}" ` +
    `data-playing="${isPlaying}" ` +
    `data-voice-active="${voiceActive}" ` +
    `data-active-syllable-index="${prosody.activeSyllableIndex}" ` +
    `data-active-syllable="${escapeHtml(prosody.activeSyllable)}" ` +
    `data-pause-comma-ms="${prosody.pauseCommaMs}" ` +
    `data-pause-semicolon-ms="${prosody.pauseSemicolonMs}" ` +
    `data-pause-period-ms="${prosody.pausePeriodSelahMs}" ` +
    `data-audio-crc16="${escapeHtml(prosody.crc16Hex)}" ` +
    `data-oral-status="${isPlaying || state.oralAudioPlayed ? "verified" : "ready"}" ` +
    `data-wasm-backed="${prosody.wasmBacked}">` +
    `<div class="ek-row-wrap">` +
    `<strong>🗣️ ${isEn ? "Listen" : "Escuchar"} (${escapeHtml(`${state.book} ${state.chapter}:${state.verse}`)}) ${isPlaying || state.oralAudioPlayed ? `<span class="uls-badge" data-oral-verified="true">${isEn ? "Active" : "Activa"}</span>` : ""}</strong>` +
    `<button type="button" id="btnPlayPauseOralPorticoCadence" class="uls-chip oral-portico-cadence-btn is-primary-guide">${guideBtnLabel}</button>` +
    `<button type="button" id="btnOralVoiceToggle" class="uls-chip oral-portico-cadence-btn is-voice-control" aria-pressed="${voiceActive}">${voiceToggleLabel}</button>` +
    `<select id="audioCadenceWpmSelect" aria-label="${isEn ? "Reading pace" : "Ritmo de lectura"}">` +
    [90, 120, 135, 150, 160]
      .map((w) => `<option value="${w}"${w === prosody.wpm ? " selected" : ""}>${w} ${isEn ? "WPM" : "ppm"}</option>`)
      .join("") +
    `</select>` +
    `<input id="audioElapsedRange" type="range" min="0" max="${prosody.totalMs}" step="250" value="${prosody.elapsedMs}" aria-label="${isEn ? "Reading position" : "Posición en versículo"}">` +
    `</div>` +
    (prosody.syllables.length > 0
      ? `<div class="prosody-syllable-strip oral-portico-secondary ek-mt-xs">` +
      `<span class="uls-badge" data-prosodic-cursor="true">${isEn ? `Syllable #${prosody.activeSyllableIndex + 1}/${prosody.syllables.length}: «${escapeHtml(prosody.activeSyllable)}»` : `Sílaba #${prosody.activeSyllableIndex + 1}/${prosody.syllables.length}: «${escapeHtml(prosody.activeSyllable)}»`}</span> ` +
      `${syllablesHtml}</div>`
      : "") +
    `</div>`;

  oralBanner._porticoMountKey = mountKey;
  oralBanner._porticoSyllableSpans =
    typeof oralBanner.querySelectorAll === "function"
      ? Array.from(oralBanner.querySelectorAll("[data-syllable-index]"))
      : oralBanner._porticoSyllableSpans || [];
  patchOralPorticoCursorInPlace({
    oralBanner,
    state,
    prosody,
    isPlaying,
    getEl,
    targetDoc,
  });

  const updateTick = () => {
    const tickProsody = computeProsodyAndSyllableAlignmentInWasm(
      { text: verseText, wpm, elapsedMs: Number(state.audioElapsedMs) || 0, totalMs },
      playerWasm,
    );
    patchOralPorticoCursorInPlace({
      oralBanner,
      state,
      prosody: tickProsody,
      isPlaying: Boolean(state.oralPorticoPlaying),
      getEl,
      targetDoc,
    });
  };

  const playBtn = getEl("btnPlayPauseOralPorticoCadence", targetDoc);
  if (playBtn && typeof playBtn.addEventListener === "function") {
    playBtn.addEventListener("click", () => {
      if (state.oralPorticoPlaying) {
        stopOralPorticoAnimationLoop(state);
        updateTick();
        return;
      }
      stopOralPorticoAnimationLoop(state);
      state.oralPorticoPlaying = true;
      state.oralAudioPlayed = true;
      oralBanner?.querySelector?.("[data-oral-status]")?.setAttribute?.("data-oral-status", "verified");
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
            updateTick();
            return;
          }
          updateTick();
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
          updateTick();
        }, 120);
        if (typeof state.oralPorticoFallbackTimerId?.unref === "function") {
          state.oralPorticoFallbackTimerId.unref();
        }
      }
      updateTick();
    });
  }

  const voiceBtn = getEl("btnOralVoiceToggle", targetDoc);
  if (voiceBtn && typeof voiceBtn.addEventListener === "function") {
    voiceBtn.addEventListener("click", () => {
      state.oralVoiceActive = !state.oralVoiceActive;
      if (state.oralVoiceActive && typeof globalThis.speechSynthesis?.speak === "function" && typeof SpeechSynthesisUtterance === "function") {
        try {
          globalThis.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(verseText);
          u.lang = String(state.lang || "es");
          u.rate = Math.max(0.6, Math.min(1.6, prosody.wpm / 150));
          globalThis.speechSynthesis.speak(u);
        } catch {
          // Silent fallback to WASM cursor
        }
      } else if (!state.oralVoiceActive && typeof globalThis.speechSynthesis?.cancel === "function") {
        try {
          globalThis.speechSynthesis.cancel();
        } catch {
          // Non-fatal
        }
      }
      renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
    });
  }

  const wpmSel = getEl("audioCadenceWpmSelect", targetDoc);
  if (wpmSel && typeof wpmSel.addEventListener === "function") {
    wpmSel.addEventListener("change", (e) => {
      state.audioCadenceWpm = Number(e?.target?.value || wpmSel.value) || 150;
      renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
    });
  }
  const elapsedRange = getEl("audioElapsedRange", targetDoc);
  if (elapsedRange && typeof elapsedRange.addEventListener === "function") {
    const onRangeChange = (e) => {
      state.audioElapsedMs = Number(e?.target?.value ?? elapsedRange.value) || 0;
      updateTick();
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
