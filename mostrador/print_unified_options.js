// ============================================================================
// web/mostrador/print_unified_options.js — Bloque unificado de Accesibilidad,
// Fotocopia legible (3ª generación) y Entrega Segura (Sigilo) (`SLICE-V3HIG-05`).
// ============================================================================

import { bindSurfaceActions, patchStoreState } from "./dom_patch.js";
import { simulateThirdGenPhotocopySauvola } from "./dosis.js";
import { summarizeOfflineFontsVaultCatalog } from "./offline_font_bundle.js";
import { bindPagedMediaPrintButton, resolveUnifiedSauvolaState } from "./print_work_and_photocopy.js";
import {
  formatPhotocopySimBadgeText,
  renderPhotocopyResilienceAndSocialCardHtml,
  simulateKanungoSauvolaGeneration,
} from "./social_and_photocopy_cards.js";
import { buildClassCStealthSpec, isStealthFilenameActive, resolveSafeDownloadFilename } from "./stealth_filename.js";

/**
 * Conecta modo privado (sigilo Clase-C) y botón de impresión directa desde navegador (`SLICE-V3HIG-05` + `SLICE-EKO-HIG10-07`).
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
  const uiLocale = state?.uiLocale || "es";
  const chkStealth = getEl("chkStealthPackMode", targetDoc);
  if (chkStealth) {
    chkStealth.checked = Boolean(state.stealthMode);
    chkStealth.setAttribute?.("data-action", "toggle-stealth-mode");
    chkStealth.setAttribute?.("data-stealth-first-class", "true");
    chkStealth.closest?.("label.hig-toggle-row")?.setAttribute?.("data-ergos-fitts-min", "48");
    bindSurfaceActions(chkStealth, {
      "toggle-stealth-mode": (ev) => {
        const nextStealth = Boolean(ev?.target?.checked ?? chkStealth.checked);
        patchStoreState(ctx, { stealthMode: nextStealth }, "stealth");
        targetDoc?.documentElement?.setAttribute?.("data-stealth-mode", nextStealth ? "true" : "false");
        renderPrintDrawerPanelsSyncInDrawer?.(ctx);
      },
    }, { scope: "print-stealth", events: ["change"] });
  }
  const receiptHost = getEl("stealthClassCReceiptHost", targetDoc);
  if (receiptHost) {
    if (stealthActive) {
      const spec = buildClassCStealthSpec({ blockNumber: stealthBlkNum, uiLocale, kind: "dosis1" });
      const receipt = spec.verifyCleanReceipt(spec.sanitizePdfMeta());
      state.lastStealthClassCReceipt = receipt;
      receiptHost.hidden = false;
      receiptHost.removeAttribute?.("hidden");
      receiptHost.setAttribute?.("data-class-c-verified", String(receipt.verified));
      receiptHost.textContent = state.lastStealthClassCReceipt?.label || receipt.label;
    } else {
      state.lastStealthClassCReceipt = null;
      receiptHost.hidden = true;
      receiptHost.setAttribute?.("hidden", "");
      receiptHost.removeAttribute?.("data-class-c-verified");
      receiptHost.textContent = "";
    }
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
  renderAndBindContextualTypographyAndFontsVault({
    state,
    targetDoc,
    getEl,
    summarizeOfflineFontsVaultCatalog,
    renderPrintDrawerPanelsSyncInDrawer: () => renderPrintDrawerPanelsSyncInDrawer?.(ctx),
  });
}

/**
 * Proyecta opciones tipográficas contextuales (`Furigana`/`Kinsoku` en japonés, `ZWSP` en tai/jemer/lao/birmano)
 * y el resumen in-situ de la bóveda offline de 34 fuentes `.ttf.zst` dentro de `2. Imprimir`.
 */
export function renderAndBindContextualTypographyAndFontsVault({
  state,
  targetDoc,
  getEl,
  summarizeOfflineFontsVaultCatalog,
  renderPrintDrawerPanelsSyncInDrawer,
} = {}) {
  const isEn = String(state?.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanLang = String(state?.effectiveCorpusLang || state?.lang || "es").trim().toLowerCase();
  const isJpan = cleanLang === "ja" || cleanLang.startsWith("ja-");
  const isZwspScript = /^(th|lo|km|my)(?:-|$)/.test(cleanLang);

  const scriptHost = typeof getEl === "function" ? getEl("printScriptTypographyHost", targetDoc) : null;
  if (scriptHost) {
    if (isJpan || isZwspScript) {
      scriptHost.hidden = false;
      scriptHost.removeAttribute?.("hidden");
      const chips = [];
      if (isJpan) {
        chips.push(
          `<label class="hig-toggle-row"><input type="checkbox" id="chkScriptFurigana" class="hig-switch"${state?.printFurigana !== false ? " checked" : ""}><span>${isEn ? "Ruby Furigana annotations" : "Guía fonética Furigana (Ruby)"}</span></label>`,
          `<label class="hig-toggle-row"><input type="checkbox" id="chkScriptKinsoku" class="hig-switch"${state?.printKinsoku !== false ? " checked" : ""}><span>${isEn ? "Kinsoku line-break rules" : "Reglas de corte Kinsoku"}</span></label>`,
        );
      }
      if (isZwspScript) {
        chips.push(
          `<label class="hig-toggle-row"><input type="checkbox" id="chkScriptZwsp" class="hig-switch"${state?.printZwsp !== false ? " checked" : ""}><span>${isEn ? "Syllable ZWSP word breaks" : "Cortes de sílaba ZWSP sin espacios"}</span></label>`,
        );
      }
      scriptHost.innerHTML = `<div class="ek-row-wrap" data-script-typography="true">${chips.join("")}</div>`;
      const bindToggle = (id, key) => {
        const el = typeof getEl === "function" ? getEl(id, targetDoc) : null;
        if (el && typeof el.addEventListener === "function" && !el._boundScriptOpt) {
          el._boundScriptOpt = true;
          el.addEventListener("change", (ev) => {
            const val = Boolean(ev?.target?.checked);
            if (state) {
              if (key === "printFurigana") state.printFurigana = val;
              else if (key === "printKinsoku") state.printKinsoku = val;
              else if (key === "printZwsp") state.printZwsp = val;
            }
            renderPrintDrawerPanelsSyncInDrawer?.();
          });
        }
      };
      bindToggle("chkScriptFurigana", "printFurigana");
      bindToggle("chkScriptKinsoku", "printKinsoku");
      bindToggle("chkScriptZwsp", "printZwsp");
    } else {
      scriptHost.hidden = true;
      scriptHost.setAttribute?.("hidden", "");
      scriptHost.innerHTML = "";
    }
  }

  const vaultHost = typeof getEl === "function" ? getEl("printFontsVaultHost", targetDoc) : null;
  if (vaultHost && typeof summarizeOfflineFontsVaultCatalog === "function") {
    const summary = summarizeOfflineFontsVaultCatalog(state?.fontsZstManifest || { fonts: [] });
    const countFonts = summary.totalFonts > 0 ? summary.totalFonts : 34;
    vaultHost.setAttribute?.("data-fonts-vault-count", String(countFonts));
    vaultHost.innerHTML =
      `<section class="ek-card-muted ek-mt-xs"><strong class="ek-title-sm">${isEn ? `Offline font vault (${countFonts} world scripts ready)` : `Bóveda tipográfica sin conexión (${countFonts} escrituras listas)`}</strong>` +
      `<p class="ek-meta ek-m-0">${isEn ? "Signed offline font pack for embedding crisp outlines with zero internet access." : "Paquete firmado de fuentes para incrustar tipografía nítida sin conexión a internet."}</p>` +
      `<a class="uls-chip ek-mt-xs" href="${summary.bundleUrl}" download="${summary.bundleFile}">${isEn ? "Download offline font bundle" : "Descargar paquete de fuentes sin conexión"}</a>` +
      `</section>`;
  }
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
  const graphicsHost = getEl("editorialGraphicsPhotocopyHost", targetDoc);
  if (photocopyBadge) {
    const sim3rd = simulateThirdGenPhotocopySauvola({
      strokePt: (state.fontSizePt || 9.5) >= 9.0 ? 0.85 : 0.75,
      k: simLive.sauvolaK,
      R: 128,
      lang: simLang,
      text: activeVerseForPhotocopy,
      ttfBytes: state.activePrintTtfBytes || null,
    });
    const unifiedDelta = String(simLive.eulerCharacteristicDelta);
    photocopyBadge.textContent = formatPhotocopySimBadgeText(simLive);
    photocopyBadge.setAttribute("data-euler-delta", unifiedDelta);
    photocopyBadge.setAttribute("data-survives-3rd-gen", String(Boolean(simLive.wcagPassAaa && sim3rd.survives3rdGen)));
    photocopyBadge.setAttribute("data-photocopy-gen", String(simLive.genIndex));
    photocopyBadge.setAttribute("data-sauvola-k", String(simLive.sauvolaK));
    photocopyBadge.setAttribute("data-contrast-ratio", String(simLive.contrastLabel));
  }
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
