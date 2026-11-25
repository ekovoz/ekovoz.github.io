// ============================================================================
// web/mostrador/print_unified_options.js — Bloque unificado de Accesibilidad,
// Fotocopia legible (3ª generación) y Entrega Segura (Sigilo) (`SLICE-V3HIG-05`).
// ============================================================================

import { bindSurfaceActions, patchStoreState } from "./dom_patch.js";
import { simulateThirdGenPhotocopySauvola } from "./dosis.js";
import { bindPagedMediaPrintButton, resolveUnifiedSauvolaState } from "./print_work_and_photocopy.js";
import {
  formatPhotocopySimBadgeText,
  renderPhotocopyResilienceAndSocialCardHtml,
  simulateKanungoSauvolaGeneration,
} from "./social_and_photocopy_cards.js";
import { isStealthFilenameActive, resolveSafeDownloadFilename } from "./stealth_filename.js";

/**
 * Conecta modo privado (sigilo) y botón de impresión directa desde navegador (`SLICE-V3HIG-05`).
 */
export function bindStealthAndPagedMediaControls({
  ctx,
  state,
  targetDoc,
  getEl,
  stealthBlkNum,
  buildCssPagedMediaPrintHtml,
  renderPrintDrawerPanelsSyncInDrawer,
} = {}) {
  const stealthActive = isStealthFilenameActive(state);
  const chkStealth = getEl("chkStealthPackMode", targetDoc);
  if (chkStealth) {
    chkStealth.checked = Boolean(state.stealthMode);
    chkStealth.setAttribute?.("data-action", "toggle-stealth-mode");
    bindSurfaceActions(chkStealth, {
      "toggle-stealth-mode": (ev) => {
        const nextStealth = Boolean(ev?.target?.checked ?? chkStealth.checked);
        patchStoreState(ctx, { stealthMode: nextStealth }, "stealth");
        targetDoc?.documentElement?.setAttribute?.("data-stealth-mode", nextStealth ? "true" : "false");
        renderPrintDrawerPanelsSyncInDrawer?.(ctx);
      },
    }, { scope: "print-stealth", events: ["change"] });
  }
  if (stealthActive) {
    for (const [lid, kind] of [
      ["linkDose2BlockPdf", "dosis2"],
      ["linkDose3FullBiblePdf", "dosis3"],
    ]) {
      const lEl = getEl(lid, targetDoc);
      if (lEl) {
        lEl.setAttribute?.("download", resolveSafeDownloadFilename(state, { kind, blockNumber: stealthBlkNum }));
        lEl.setAttribute?.("data-stealth-mode", "true");
      }
    }
  }
  bindPagedMediaPrintButton({
    state,
    targetDoc,
    getEl,
    buildCssPagedMediaPrintHtml,
    stealthBlkNum,
  });
}

function toggleUnifiedBrailleB70State({ ctx, state, enable, targetDoc, hydratePrintDrawerPanels }) {
  if (enable) {
    state._prevPaperBeforeBraille = state.paperFormat || "a4";
    state._prevPrintProfileBeforeBraille = state.activePrintProfileId || "02_2col_pastoral";
    patchStoreState(ctx, {
      paperFormat: "b70",
      activePrintProfileId: "11_braille_nemeth_b70",
      edition: "11_braille_nemeth_b70",
      brailleNemethEnabled: true,
    }, "print");
  } else {
    const restorePaper = state._prevPaperBeforeBraille || "a4";
    const restoreProfile = state._prevPrintProfileBeforeBraille || "02_2col_pastoral";
    patchStoreState(ctx, {
      paperFormat: restorePaper,
      activePrintProfileId: restoreProfile,
      edition: restoreProfile,
      brailleNemethEnabled: false,
    }, "print");
  }
  hydratePrintDrawerPanels?.(targetDoc);
}

/**
 * Unifica `#btnQuickBrailleB70` y `#chkBrailleNemethToggle` sobre el mismo estado Braille B70 (`SLICE-V3HIG-05`).
 */
export function bindUnifiedBrailleB70Controls({
  ctx,
  state,
  targetDoc,
  getEl,
  effectivePaper,
  hydratePrintDrawerPanels,
} = {}) {
  const btnQuickBraille = getEl("btnQuickBrailleB70", targetDoc);
  if (btnQuickBraille) {
    const isBrailleOn =
      effectivePaper === "b70" ||
      state.activePrintProfileId === "11_braille_nemeth_b70" ||
      Boolean(state.brailleNemethEnabled);
    btnQuickBraille.setAttribute?.("aria-pressed", isBrailleOn ? "true" : "false");
    btnQuickBraille.setAttribute?.("data-action", "quick-braille-b70");
    bindSurfaceActions(btnQuickBraille, {
      "quick-braille-b70": () => {
        const turningOn = !(state.paperFormat === "b70" || state.activePrintProfileId === "11_braille_nemeth_b70");
        toggleUnifiedBrailleB70State({ ctx, state, enable: turningOn, targetDoc, hydratePrintDrawerPanels });
      },
    }, { scope: "quick-braille-b70", events: ["click"] });
  }

  const chkNemeth = getEl("chkBrailleNemethToggle", targetDoc);
  if (chkNemeth && typeof chkNemeth.addEventListener === "function" && !chkNemeth._nemethBound) {
    chkNemeth._nemethBound = true;
    chkNemeth.addEventListener("change", (ev) => {
      toggleUnifiedBrailleB70State({
        ctx,
        state,
        enable: Boolean(ev?.target?.checked),
        targetDoc,
        hydratePrintDrawerPanels,
      });
    });
  }
}

/**
 * Renderiza y conecta la simulación de fotocopia legible (hasta 3ª generación) (`SLICE-V3HIG-05`).
 */
export function renderAndBindPhotocopyPanel({
  ctx,
  state,
  targetDoc,
  getEl,
  renderPrintDrawerPanelsSyncInDrawer,
} = {}) {
  const unifiedSauvola = resolveUnifiedSauvolaState(state);
  const simLang = state.effectiveCorpusLang || state.lang || "es";
  const activeVerseForPhotocopy = String(
    state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
    "En el principio creó Dios los cielos y la tierra.",
  ).slice(0, 140);
  const simLive = simulateKanungoSauvolaGeneration(unifiedSauvola.genIndex, unifiedSauvola.sauvolaK, 300, {
    lang: simLang,
    text: activeVerseForPhotocopy,
    ttfBytes: state.activePrintTtfBytes || null,
  });
  const photocopyBadge = getEl("biblePhotocopySimBadge", targetDoc);
  if (photocopyBadge) {
    const sim3rd = simulateThirdGenPhotocopySauvola({
      strokePt: (state.fontSizePt || 9.5) >= 9.0 ? 0.85 : 0.75,
      k: simLive.sauvolaK,
      R: 128,
      lang: simLang,
      text: activeVerseForPhotocopy,
      ttfBytes: state.activePrintTtfBytes || null,
    });
    photocopyBadge.textContent = formatPhotocopySimBadgeText(simLive);
    photocopyBadge.setAttribute("data-euler-delta", String(simLive.eulerCharacteristicDelta));
    photocopyBadge.setAttribute("data-survives-3rd-gen", String(Boolean(simLive.wcagPassAaa && sim3rd.survives3rdGen)));
    photocopyBadge.setAttribute("data-photocopy-gen", String(simLive.genIndex));
    photocopyBadge.setAttribute("data-sauvola-k", String(simLive.sauvolaK));
    photocopyBadge.setAttribute("data-contrast-ratio", String(simLive.contrastLabel));
  }

  const graphicsHost = getEl("editorialGraphicsPhotocopyHost", targetDoc);
  if (!graphicsHost) return;
  graphicsHost.innerHTML = renderPhotocopyResilienceAndSocialCardHtml({
    book: state.book,
    chapter: state.chapter,
    verse: state.verse,
    text: activeVerseForPhotocopy,
    lang: state.lang,
    activeGen: unifiedSauvola.genIndex,
    sauvolaK: unifiedSauvola.sauvolaK,
    uiLocale: state.uiLocale || "es",
    ttfBytes: state.activePrintTtfBytes || null,
    precomputedActiveSim: simLive,
    showHeaderContrastBadge: false,
  });
  if (typeof graphicsHost.addEventListener === "function" && !graphicsHost._photocopyBound) {
    graphicsHost._photocopyBound = true;
    graphicsHost.addEventListener("click", (e) => {
      const genBtn = e?.target?.closest
        ? e.target.closest("[data-photocopy-gen]")
        : e?.target?.getAttribute?.("data-photocopy-gen")
          ? e.target
          : null;
      const genAttr = genBtn?.getAttribute?.("data-photocopy-gen");
      if (genAttr !== null && genAttr !== undefined) {
        state.photocopyGen = Number(genAttr) || 0;
        renderPrintDrawerPanelsSyncInDrawer?.(ctx);
      }
    });
  }
  const sauvolaInput = getEl("inputSauvolaK", targetDoc);
  if (sauvolaInput && typeof sauvolaInput.addEventListener === "function" && !sauvolaInput._sauvolaKBound) {
    sauvolaInput._sauvolaKBound = true;
    const onSauvolaChange = (ev) => {
      state.sauvolaK = Number(ev?.target?.value) || 0.25;
      renderPrintDrawerPanelsSyncInDrawer?.(ctx);
    };
    if (!sauvolaInput._sauvolaEventsBound) {
      sauvolaInput._sauvolaEventsBound = true;
      sauvolaInput.addEventListener("input", onSauvolaChange);
      sauvolaInput.addEventListener("change", onSauvolaChange);
    }
  }
}
