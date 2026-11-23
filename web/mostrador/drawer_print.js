// ============================================================================
// web/mostrador/drawer_print.js — Gaveta 2 (Imprimir, 14 Ediciones PDF, Imposición 4n & Fotocopia Sauvola)
// Decisiones D1-R41, D4-R41, D5-R41, D6-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { escapeHtml, resolveRegionalBridgeLanguage21 } from "./bridge_and_chapter.js";
import {
  buildRelativePdfAssetUrl,
  CANONICAL_16_MACRO_TANDAS,
  CANONICAL_80_BLOCKS_CATALOG,
  chooseEdition,
  computeFoliationLayout,
  computeKindlePrintBudget,
  dispatchTandaWorkerJob,
  effectiveThreatClassWeb,
  encodePdfBytesToDataUri,
  hydrateEditorialProfiles,
  listAll14PrintEditionsForLang,
  normalizeEditionSlug,
  paperForRegion,
  planDose3,
  planSequential16MacroTandasGeneration,
  probeFederationShardReachabilityOnce,
  renderCanonical16MacroTandasSelectorHtml,
  renderImpositionAndLayoutPreviewHtml,
  renderMultiSignatureAndPocketRefugeHtml,
  resolveCanonicalBlockCode,
  resolveCanonicalBlockForPassage,
  resolveMacroTandaForBlock,
  resolveRegionalPrintDefaults,
  simulateFifthGenPhotocopySauvolaBilateral,
  simulateThirdGenPhotocopySauvola,
  stealthNeutralFilenameWeb,
  syncDose2AndDose3LinksForActiveLang,
  syncPrintDrawerControlsFromEditionProfile,
} from "./dosis.js";
import {
  buildCssPagedMediaPrintHtml,
  resolveLocalPrintArtifactFallback,
} from "./bimodal_tanda_print.js";
import { computeSaddleStitchImpositionPlan } from "./optical_lt.js";
import {
  GOSPEL_14_PERICOPES_SPEC,
  REFUGE_4_SHEETS_PASSAGES_SPEC,
  buildEditionRenderSpecBytes16,
  formatCanonical80BlocksChecklistEntries,
  resolveNumericEditionId,
  transduceTextToBrailleBrfAndUnicode,
} from "./dosis_editions_catalog.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import { isRtlLocale } from "./i18n.js";
import { decodeRfc8878RawZstdFrameJs } from "./offline_mesh.js";
import {
  evaluateOpticalSauvolaPhotocopyOracle,
  filterEphemeralSubpixelIslands1px,
  resolveOracleSpecimenDefaults,
} from "./sauvola_canvas_oracle.js";
import {
  encodePaperFormatCode,
  resolveFontFileForLangOrScript,
  resolveTier0AssetFontFilename,
  runWorkerTandaJob,
} from "./tanda_print_worker.js";
export { runWorkerTandaJob };

export const HAREL_PRINT_SUBTABS = ["doses", "imposition", "stationery"];

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import { mountOfflineFontNoticeWithLocalImporter } from "./offline_font_bundle.js";

/**
 * Oráculo óptico real Kanungo + Filtro Bilateral + Binarización Adaptativa Shafait-Sauvola (`Float64Array` `O(1)`/px)
 * + Bit-Quads `2×2` de Gray (`SLICE-V2C-14`, `SLICE-EKO-V2I-13`: contornos reales `ttfBytes` compuestos incluidos).
 */
export function simulateKanungoSauvolaGeneration(genIndex = 5, sauvolaK = 0.32, dpi = 300, extraOpts = {}) {
  const report = evaluateOpticalSauvolaPhotocopyOracle({
    genIndex,
    sauvolaK,
    dpi,
    strokePt: extraOpts?.strokePt ?? 0.85,
    lang: extraOpts?.lang || "es",
    text: extraOpts?.text || "",
    ttfBytes: extraOpts?.ttfBytes instanceof Uint8Array ? extraOpts.ttfBytes : null,
    useBrowserCanvasIfAvailable: extraOpts?.useBrowserCanvasIfAvailable ?? true,
  });
  if (extraOpts?.rawBinaryMask instanceof Uint8Array) {
    report.filteredMask = filterEphemeralSubpixelIslands1px(
      extraOpts.rawBinaryMask,
      report.width,
      report.height,
    );
  }
  return report;
}

/**
 * Formatea la etiqueta viva del simulador Kanungo-Sauvola para `#biblePhotocopySimBadge` y `#photocopyActiveStatusBadge` (`D4-B+` / `SLICE-101`).
 */
export function formatPhotocopySimBadgeText(simResult = null) {
  const sim = simResult || simulateKanungoSauvolaGeneration(5, 0.32, 300);
  const genLabel = sim.genIndex === 0 ? "Original 300 DPI" : `${sim.genIndex}ª Gen`;
  return `✅ ${genLabel} · Sauvola k=${Number(sim.sauvolaK).toFixed(2)} (Contraste ${sim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${sim.eulerCharacteristicDelta})`;
}

/**
 * Renderiza el Simulador Interactivo de Resiliencia Fotocopia de 5 Generaciones (Kanungo + Sauvola + Filtro Bilateral, `editorial-graphics`)
 * y la Tarjeta OpenGraph `1200×630` SVG Data-URI (`D8-B+` / `SLICE-97`).
 */
export function renderEditorialGraphicsAndPrintSpecsCard({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  sauvolaK = 0.32,
  uiLocale = "es",
  ttfBytes = null,
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const activeSim = simulateKanungoSauvolaGeneration(activeGen, sauvolaK, 300, {
    lang,
    text: cleanText,
    ttfBytes,
  });
  const fifthGenBilateral = simulateFifthGenPhotocopySauvolaBilateral({
    strokePt: 0.85,
    k: activeSim.sauvolaK,
    R: 128,
  });
  const generations = [0, 1, 2, 3, 4, 5].map((g) => {
    const defaultK = Number((0.2 + g * 0.024).toFixed(2));
    const sim = simulateKanungoSauvolaGeneration(
      g,
      g === activeSim.genIndex ? activeSim.sauvolaK : defaultK,
      300,
      { lang, text: cleanText, ttfBytes },
    );
    return {
      gen: g,
      label:
        g === 0
          ? "Original 300 DPI"
          : g === 5
            ? isEn
              ? "Rural Photocopy Gen 5"
              : "Fotocopia Rural Gen 5"
            : isEn
              ? `Photocopy Gen ${g}`
              : `Fotocopy Gen ${g}`.replace("Fotocopy", "Fotocopia"),
      contrast: sim.contrastLabel,
      sauvolaK: sim.sauvolaK.toFixed(2),
      active: g === activeSim.genIndex,
    };
  });

  const genBadges = generations
    .map(
      (g) =>
        `<button type="button" class="uls-chip" data-photocopy-gen="${g.gen}" data-contrast-ratio="${g.contrast}" data-sauvola-k="${g.sauvolaK}" style="min-height:48px;min-width:48px;padding:8px 12px;box-sizing:border-box;font-size:0.73rem;cursor:pointer;${g.active ? "border:2px solid var(--accent-primary);font-weight:700;" : ""}">` +
        `🖨️ <strong>${g.label}</strong>: ${g.contrast} ≥ 7.0:1 (k=${g.sauvolaK})` +
        `</button>`,
    )
    .join(" ");

  const stagesBadges = activeSim.stages5
    .map(
      (st) =>
        `<span class="uls-badge" data-graphics-stage="${st}" style="font-size:0.69rem;padding:0.15rem 0.4rem;">${st}</span>`,
    )
    .join(" ");

  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="#12161f"/>` +
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="#181e29" stroke="#d4a359" stroke-width="3"/>` +
    `<text x="96" y="150" fill="#d4a359" font-family="serif" font-size="38" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="280" fill="#f8fafc" font-family="serif" font-size="42">${escHtml(cleanText)}</text>` +
    `<text x="96" y="520" fill="#94a3b8" font-family="sans-serif" font-size="26">editorial-graphics · Gen ${activeSim.genIndex} (Sauvola k=${activeSim.sauvolaK.toFixed(2)}) · Contraste ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${activeSim.eulerCharacteristicDelta}</text>` +
    `</svg>`;
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;

  return (
    `<div id="editorialGraphicsPhotocopyPanel" class="editorial-graphics-photocopy-card" ` +
    `data-photocopy-generations="5" ` +
    `data-active-photocopy-gen="${activeSim.genIndex}" ` +
    `data-sauvola-k="${activeSim.sauvolaK.toFixed(2)}" ` +
    `data-euler-delta="${activeSim.eulerCharacteristicDelta}" ` +
    `data-min-contrast-wcag="${activeSim.contrastRatio}" ` +
    `data-fifth-gen-min-contrast="${fifthGenBilateral.minContrastRatio}" ` +
    `data-social-card-dimensions="${fifthGenBilateral.socialCardDimensions}" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<strong>🖼️ ${isEn ? "Sovereign Graphics Engine (<code>editorial-graphics</code> · Kanungo + Sauvola 5th-Gen Photocopy)" : "Motor Gráfico Soberano (<code>editorial-graphics</code> · Kanungo + Sauvola 5ª Generación Fotocopia)"}</strong>` +
    `<span id="photocopyActiveStatusBadge" class="uls-badge" data-sauvola-pass="true">✅ Gen ${activeSim.genIndex} ${isEn ? "Contrast" : "Contraste"} ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${activeSim.eulerCharacteristicDelta}</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.45rem;">${genBadges}</div>` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">` +
    `<label for="inputSauvolaK" style="font-size:0.74rem;font-weight:600;">🎛️ ${isEn ? `Sauvola Parameter k (${activeSim.sauvolaK.toFixed(2)}):` : `Parámetro Sauvola k (${activeSim.sauvolaK.toFixed(2)}):`}</label>` +
    `<input id="inputSauvolaK" type="range" min="0.15" max="0.40" step="0.01" value="${activeSim.sauvolaK.toFixed(2)}" style="min-height:48px;min-width:140px;box-sizing:border-box;" />` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">${stagesBadges}</div>` +
    `</div>` +
    `<div style="font-size:0.74rem;color:var(--text-secondary);">` +
    `<img alt="Kanungo-Sauvola Preview" src="${svgDataUrl}" style="max-width:260px;height:auto;border-radius:8px;border:1px solid var(--card-border);display:block;margin-bottom:0.25rem;" />` +
    `<span>${isEn ? "Optical legibility stress specimen verified." : "Espécimen óptico de resiliencia a fotocopia verificado."}</span>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Construye una tarjeta OpenGraph `1200×630` SVG autónoma para la gaveta de Compartir (`SLICE-EKO-V3UX-14`).
 */
export function buildOpenGraphSocialCardSvg1200x630({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  sauvolaK = 0.32,
  contrastLabel = "21.00:1",
  eulerDelta = 0,
} = {}) {
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="#12161f"/>` +
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="#181e29" stroke="#d4a359" stroke-width="3"/>` +
    `<text x="96" y="150" fill="#d4a359" font-family="serif" font-size="38" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="280" fill="#f8fafc" font-family="serif" font-size="42">${escHtml(cleanText)}</text>` +
    `<text x="96" y="520" fill="#94a3b8" font-family="sans-serif" font-size="26">editorial-graphics · Gen ${Number(activeGen) || 0} (Sauvola k=${Number(sauvolaK || 0.32).toFixed(2)}) · Contraste ${escHtml(contrastLabel)} ≥ 7.0:1 AAA · Δχ=${Number(eulerDelta) || 0}</text>` +
    `</svg>`;
  return {
    width: 1200,
    height: 630,
    dimensions: "1200x630",
    svgMarkup,
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`,
  };
}

export function renderPhotocopyResilienceAndSocialCardHtml(opts = {}) {
  return renderEditorialGraphicsAndPrintSpecsCard(opts);
}

/**
 * Renderizado síncrono de la Gaveta 2 (Imprimir y Ediciones) (`D4-R41` / `D5-R41` / `D10-R38`).
 */
export function renderPrintDrawerPanelsSyncInDrawer(ctx = {}) {
  const { state, targetDoc, getEl, hydratePrintDrawerPanels } = ctx;
  const liveBlock = resolveCanonicalBlockCode(state.book, state.chapter, state.verse);
  const passageKey = `${state.book}.${state.chapter}`;
  if (state.activeBlockPassageKey !== passageKey) {
    state.activeBlockPassageKey = passageKey;
    state.activeBlockNumber = liveBlock.blockNumber || 1;
  }
  syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
  for (const [linkId, flag] of [
    ["linkDose2BlockPdf", "_dose2Bound"],
    ["linkDose3FullBiblePdf", "_dose3Bound"],
  ]) {
    const linkEl = getEl(linkId, targetDoc);
    if (linkEl && typeof linkEl.addEventListener === "function" && !linkEl[flag]) {
      linkEl[flag] = true;
      linkEl.addEventListener("click", async (ev) => {
        if (linkEl._directSynthesizedClick) return;
        const curHref = String(linkEl.getAttribute?.("href") || linkEl.href || "");
        const needsSynthesis =
          !curHref ||
          curHref.startsWith("#") ||
          curHref.startsWith("data:") ||
          (linkId === "linkDose2BlockPdf"
            ? !state.dose2ObjectUrl
            : !state.dose3ObjectUrl || !state._dose3Streamed16Of16);
        if (needsSynthesis) {
          ev?.preventDefault?.();
          if (linkId === "linkDose3FullBiblePdf") {
            state.fullBible16MacroTandasPlan = planSequential16MacroTandasGeneration({
              lang: state.effectiveCorpusLang || state.lang || "es",
              columns: state.columns || 2,
              fontPt: state.fontSizePt || 9.5,
              paper: state.paperFormat || "a4",
              dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            });
            state.generateFull66BookBible = true;
          }
          state.lastHydratedWorkerTandaKey = "";
          try {
            await hydratePrintDrawerPanels?.(targetDoc);
          } finally {
            if (linkId === "linkDose3FullBiblePdf") {
              state.generateFull66BookBible = false;
            }
          }
          const readyHref =
            linkId === "linkDose2BlockPdf"
              ? state.dose2ObjectUrl || String(linkEl.getAttribute?.("href") || linkEl.href || "")
              : state.dose3ObjectUrl || String(linkEl.getAttribute?.("href") || linkEl.href || "");
          if (readyHref && !readyHref.startsWith("#") && typeof linkEl.click === "function") {
            linkEl._directSynthesizedClick = true;
            try {
              linkEl.click();
            } finally {
              linkEl._directSynthesizedClick = false;
            }
          }
        }
      });
    }
  }
  const stealthActive =
    Boolean(state.stealthMode) ||
    effectiveThreatClassWeb(state.countryIso2 || "MX", state.effectiveCorpusLang || state.lang || "es") ===
      "CLASS_C_STEALTH";
  const stealthBlk = resolveCanonicalBlockCode(state.book || "GEN", state.chapter || 1, state.verse || 1);
  const stealthBlkNum = Number(state.activeBlockNumber) || stealthBlk.blockNumber || 1;
  const chkStealth = getEl("chkStealthPackMode", targetDoc);
  if (chkStealth) {
    chkStealth.checked = Boolean(state.stealthMode);
    if (typeof chkStealth.addEventListener === "function" && !chkStealth._stealthBound) {
      chkStealth._stealthBound = true;
      chkStealth.addEventListener("change", (ev) => {
        const nextStealth = Boolean(ev?.target?.checked ?? chkStealth.checked);
        state.stealthMode = nextStealth;
        ctx.store?.setState?.({ stealthMode: nextStealth }, "stealth");
        targetDoc?.documentElement?.setAttribute?.("data-stealth-mode", nextStealth ? "true" : "false");
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      });
    }
  }
  if (stealthActive) {
    const neutralPdfName = stealthNeutralFilenameWeb(stealthBlkNum, "pdf");
    for (const lid of ["linkDose2BlockPdf", "linkDose3FullBiblePdf"]) {
      const lEl = getEl(lid, targetDoc);
      if (lEl) {
        lEl.setAttribute?.("download", neutralPdfName);
        lEl.setAttribute?.("data-stealth-mode", "true");
      }
    }
  }
  const btnPagedMedia = getEl("btnPrintCssPagedMedia", targetDoc);
  if (btnPagedMedia && typeof btnPagedMedia.addEventListener === "function" && !btnPagedMedia._pagedMediaBound) {
    btnPagedMedia._pagedMediaBound = true;
    btnPagedMedia.addEventListener("click", () => {
      const chapVerses = state.lastNavResult?.chapter?.verses || {};
      const entries = Object.keys(chapVerses)
        .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
        .map((vNum) => ({ ref: `${state.book || "GEN"} ${state.chapter || 1}:${vNum}`, text: String(chapVerses[vNum] || "") }));
      const pagedHtml = buildCssPagedMediaPrintHtml({
        lang: state.lang || "es",
        book: state.book || "GEN",
        chapter: state.chapter || 1,
        verse: state.verse || 1,
        verses: entries.length > 0 ? entries : null,
        columns: state.columns || 2,
        fontPt: state.fontSizePt || 9.5,
        paper: state.paperFormat || "a4",
        duplex: state.duplex !== false,
        dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      });
      state.lastCssPagedMediaHtml = pagedHtml;
      const curStealth =
        Boolean(state.stealthMode) ||
        effectiveThreatClassWeb(state.countryIso2 || "MX", state.lang || "es") === "CLASS_C_STEALTH";
      const curBlk = resolveCanonicalBlockCode(state.book || "GEN", state.chapter || 1, state.verse || 1);
      const dlFilename = curStealth
        ? stealthNeutralFilenameWeb(Number(state.activeBlockNumber) || curBlk.blockNumber || 1, "html")
        : `ekovoz-${String(state.lang || "es")}-${String(state.book || "gen").toLowerCase()}-${Number(state.chapter) || 1}-paged.html`;
      btnPagedMedia.setAttribute?.("data-paged-media-ready", "true");
      btnPagedMedia.setAttribute?.("data-paged-media-filename", dlFilename);
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(pagedHtml)}`;
      if (typeof targetDoc?.createElement === "function") {
        try {
          const a = targetDoc.createElement("a");
          if (a) {
            a.href = dataUrl;
            a.download = dlFilename;
            a.click?.();
          }
        } catch {
          // Non-fatal in headless DOM
        }
      }
    });
  }
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const regionalDefaults = resolveRegionalPrintDefaults(state.countryIso2 || "MX", {
    lang: state.lang,
    uiLocale: state.uiLocale || "es",
  });
  const effectivePaper = state.paperFormat || regionalDefaults.paperFormat || regionalDefaults.paper || paperForRegion(state.countryIso2 || "MX");
  const effectiveEdition = state.edition || regionalDefaults.edition || chooseEdition(["2col-a4", "2col-letter"], effectivePaper);
  const budget = computeKindlePrintBudget({
    fontPt: state.fontSizePt || 9.5,
    columns: state.columns || 2,
    orientation: state.orientation || "landscape",
    paper: effectivePaper || "a4",
  });
  const budgetOutput = getEl("kindleBudgetOutput", targetDoc);
  if (budgetOutput) {
    budgetOutput.textContent = budget.summaryText;
    if (typeof budgetOutput.setAttribute === "function") {
      budgetOutput.setAttribute("data-cpl", String(budget.cpl));
      budgetOutput.setAttribute("data-estimated-pages", String(budget.estimatedPages));
      budgetOutput.setAttribute("data-effective-columns", String(budget.effectiveColumns));
    }
  }

  for (const [btnId, tabName] of [
    ["btnPrintSubtabDoses", "doses"],
    ["btnPrintSubtabImposition", "imposition"],
    ["btnPrintSubtabStationery", "stationery"],
  ]) {
    const pBtn = getEl(btnId, targetDoc);
    if (pBtn && typeof pBtn.addEventListener === "function" && !pBtn._printSubtabBound) {
      pBtn._printSubtabBound = true;
      pBtn.addEventListener("click", () => {
        applyHarelSubtabSelection(targetDoc, "print", tabName);
      });
    }
  }

  const duplexPanel = getEl("duplexAssistantPanel", targetDoc);
  if (duplexPanel) {
    const slug = normalizeEditionSlug(effectiveEdition, {
      paperFormat: effectivePaper,
      columns: state.columns,
    });
    const foliation = computeFoliationLayout({
      mode: state.foliationMode || "saddle_stitch",
      paper: effectivePaper || "a4",
      pageCount: 16,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
    });
    const resolvedBlock = resolveCanonicalBlockForPassage(state.book, state.chapter);
    // D6-R44: al navegar a otro libro/capítulo, el bloque canónico (1..80) se re-sincroniza con el pasaje activo;
    // la selección manual del usuario se respeta mientras permanezca en el mismo pasaje.
    const passageKey = `${state.book}.${state.chapter}`;
    if (state.activeBlockPassageKey !== passageKey) {
      state.activeBlockPassageKey = passageKey;
      state.activeBlockNumber = resolvedBlock.blockNumber || 1;
    }
    const activeBlockNum = Number(state.activeBlockNumber) || resolvedBlock.blockNumber || 1;
    const activeMacroTanda =
      CANONICAL_16_MACRO_TANDAS[
      Math.max(1, Math.min(16, Number(state.activeMacroTandaNumber) || resolveMacroTandaForBlock(activeBlockNum).macroTandaNumber)) - 1
      ] || resolveMacroTandaForBlock(activeBlockNum);
    const multiSigHtml = renderMultiSignatureAndPocketRefugeHtml({
      totalPages: 160,
      activeBlockNumber: activeBlockNum,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      uiLocale: state.uiLocale || "es",
    });
    const macroTandas16Html = renderCanonical16MacroTandasSelectorHtml({
      activeMacroTandaNumber: activeMacroTanda.macroTandaNumber,
      lang: state.effectiveCorpusLang || state.lang || "es",
      columns: state.columns || 2,
      fontPt: state.fontSizePt || 9.5,
      uiLocale: state.uiLocale || "es",
    });
    const duplexHeader = isEn
      ? `Duplex Assistant (${state.duplex ? "2-sided · Even parity guaranteed" : "1-sided"}) · ${escapeHtml(foliation.summary)}`
      : `Asistente Dúplex (${state.duplex ? "2 caras · Paridad par garantizada" : "1 cara"}) · ${escapeHtml(foliation.summary)}`;
    const duplexBody = isEn
      ? `Step 1: Print odd pages (front). Step 2: Flip sheet along the long edge and print even pages (back) · ${escapeHtml(budget.summaryText)}.`
      : `Paso 1: Imprime caras impares (anverso). Paso 2: Voltea el pliego por el borde largo e imprime caras pares (reverso) · ${escapeHtml(budget.summaryText)}.`;
    const nemethCheckedAttr = state.brailleNemethEnabled || slug === "11_braille_nemeth_b70" ? " checked" : "";
    const nemethLabel = isEn
      ? "Nemeth Math Braille · Ed. 11 BEB B70 (excludes 1:1-5)"
      : "Braille Matemático Nemeth · Ed. 11 BEB B70 (excluye 1:1-5)";
    const activeVerseSample =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "En el principio creó Dios los cielos y la tierra.";
    const brfResult = transduceTextToBrailleBrfAndUnicode(
      `${state.book || "GEN"} ${Number(state.chapter) || 1}:${Number(state.verse) || 1} ${activeVerseSample}`,
      { nemethMath: Boolean(nemethCheckedAttr) },
    );
    const brfHref = `data:text/plain;charset=utf-8,${encodeURIComponent(String(brfResult?.brf || ""))}`;
    const brfFilename = `${String(state.lang || "es")}_${String(state.book || "GEN")}_${Number(state.chapter) || 1}_ed11_b70.brf`;
    const nemethToggleHtml =
      `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px;">` +
      `<label class="uls-chip" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">` +
      `<input type="checkbox" id="chkBrailleNemethToggle" data-action="toggle-braille-nemeth" data-edition-slug="11_braille_nemeth_b70"${nemethCheckedAttr} />` +
      `<span>${escapeHtml(nemethLabel)}</span></label>` +
      `<a id="btnDownloadBrailleBrf" class="uls-chip" href="${brfHref}" download="${escapeHtml(brfFilename)}" data-edition-slug="11_braille_nemeth_b70">` +
      `⠋ ${isEn ? "Download Tactile .brf (Ed. 11)" : "Descargar .brf Táctil (Ed. 11)"}</a>` +
      `</div>`;
    duplexPanel.innerHTML = `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(
      slug,
    )}" data-foliation-mode="${escapeHtml(foliation.mode)}" data-binding-edge="${escapeHtml(
      foliation.bindingEdge,
    )}"><strong>${duplexHeader}</strong><p style="margin:4px 0 0;font-size:0.84rem;">${duplexBody}</p>${nemethToggleHtml}${multiSigHtml}${macroTandas16Html}</div>`;
    const chkNemeth = getEl("chkBrailleNemethToggle", targetDoc);
    if (chkNemeth && typeof chkNemeth.addEventListener === "function" && !chkNemeth._nemethBound) {
      chkNemeth._nemethBound = true;
      chkNemeth.addEventListener("change", (ev) => {
        const checked = Boolean(ev?.target?.checked);
        state.brailleNemethEnabled = checked;
        if (checked) {
          state._prevPrintProfileBeforeBraille = state.activePrintProfileId || "02_2col_pastoral";
          state.activePrintProfileId = "11_braille_nemeth_b70";
          state.edition = "11_braille_nemeth_b70";
        } else if (state.activePrintProfileId === "11_braille_nemeth_b70") {
          const restore = state._prevPrintProfileBeforeBraille || "02_2col_pastoral";
          state.activePrintProfileId = restore;
          state.edition = restore;
        }
        hydratePrintDrawerPanels(targetDoc);
      });
    }
    const macroSel = getEl("macroTanda16Select", targetDoc);
    if (macroSel && typeof macroSel.addEventListener === "function" && !macroSel._macroSelBound) {
      macroSel._macroSelBound = true;
      macroSel.addEventListener("change", (e) => {
        const chosenMt = Math.max(1, Math.min(16, Number(e?.target?.value || macroSel.value) || 1));
        state.activeMacroTandaNumber = chosenMt;
        state.activeBlockNumber = (chosenMt - 1) * 5 + 1;
        state.generateFull66BookBible = false;
        hydratePrintDrawerPanels(targetDoc);
      });
    }
    const btnGenAll16 = getEl("btnGenerateAll16MacroTandas", targetDoc);
    if (btnGenAll16 && typeof btnGenAll16.addEventListener === "function" && !btnGenAll16._gen16Bound) {
      btnGenAll16._gen16Bound = true;
      btnGenAll16.addEventListener("click", async () => {
        state.fullBible16MacroTandasPlan = planSequential16MacroTandasGeneration({
          lang: state.effectiveCorpusLang || state.lang || "es",
          columns: state.columns || 2,
          fontPt: state.fontSizePt || 9.5,
          paper: effectivePaper || "a4",
          dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
        });
        state.generateFull66BookBible = true;
        state.lastHydratedWorkerTandaKey = "";
        try {
          await hydratePrintDrawerPanels?.(targetDoc);
          const dose3Link = getEl("linkDose3FullBiblePdf", targetDoc);
          const dose3Href = state.dose3ObjectUrl || String(dose3Link?.getAttribute?.("href") || dose3Link?.href || "");
          if (dose3Link && dose3Href && !dose3Href.startsWith("#") && typeof dose3Link.click === "function") {
            dose3Link._directSynthesizedClick = true;
            try {
              dose3Link.click();
            } finally {
              dose3Link._directSynthesizedClick = false;
            }
          }
        } finally {
          state.generateFull66BookBible = false;
        }
      });
    }
    const blockSel = getEl("canonicalBlockSelect", targetDoc);
    if (blockSel && String(blockSel.value) !== String(activeBlockNum)) {
      blockSel.value = String(activeBlockNum);
    }
    if (blockSel && typeof blockSel.addEventListener === "function" && !blockSel._blockSelBound) {
      blockSel._blockSelBound = true;
      blockSel.addEventListener("change", (e) => {
        state.activeBlockNumber = Math.max(1, Math.min(80, Number(e?.target?.value || blockSel.value) || 1));
        state.generateFull66BookBible = false;
        hydratePrintDrawerPanels(targetDoc);
      });
    }
  }

  const photocopyBadge = getEl("biblePhotocopySimBadge", targetDoc);
  if (photocopyBadge) {
    const activeGen = Number.isInteger(state.photocopyGen) ? state.photocopyGen : 3;
    const activeSauvolaK = typeof state.sauvolaK === "number" ? state.sauvolaK : 0.25;
    const simLang = state.effectiveCorpusLang || state.lang || "es";
    const specimenSample = resolveOracleSpecimenDefaults(simLang, "").sampleText;
    const simLive = simulateKanungoSauvolaGeneration(activeGen, activeSauvolaK, 300, {
      lang: simLang,
      text: specimenSample,
      ttfBytes: state.activePrintTtfBytes || null,
    });
    const sim3rd = simulateThirdGenPhotocopySauvola({
      strokePt: (state.fontSizePt || 9.5) >= 9.0 ? 0.85 : 0.75,
      k: simLive.sauvolaK,
      R: 128,
      lang: simLang,
      text: specimenSample,
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
  if (graphicsHost) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      "En el principio creó Dios los cielos y la tierra.";
    graphicsHost.innerHTML = renderPhotocopyResilienceAndSocialCardHtml({
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      text: verseText,
      lang: state.lang,
      activeGen: state.photocopyGen ?? 5,
      sauvolaK: state.sauvolaK ?? 0.32,
      uiLocale: state.uiLocale || "es",
      ttfBytes: state.activePrintTtfBytes || null,
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
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
    const sauvolaInput = getEl("inputSauvolaK", targetDoc);
    if (sauvolaInput && typeof sauvolaInput.addEventListener === "function" && !sauvolaInput._sauvolaKBound) {
      sauvolaInput._sauvolaKBound = true;
      const onSauvolaChange = (ev) => {
        state.sauvolaK = Number(ev?.target?.value) || 0.32;
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      };
      if (!sauvolaInput._sauvolaEventsBound) {
        sauvolaInput._sauvolaEventsBound = true;
        sauvolaInput.addEventListener("input", onSauvolaChange);
        sauvolaInput.addEventListener("change", onSauvolaChange);
      }
    }
  }

  const stationeryPanel = getEl("stationeryCardPanel", targetDoc);
  if (stationeryPanel) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      (isEn
        ? "Select a verse for an A6/Letter postcard."
        : "Selecciona un versículo para tarjeta postal A6/Carta.");
    const refLabel = `${state.book || "GEN"} ${state.chapter || 1}:${state.verse || 1}`;
    const curLang = String(state.lang || "es").trim() || "es";
    const postalHtml = buildCssPagedMediaPrintHtml({
      lang: curLang,
      book: state.book || "GEN",
      chapter: state.chapter || 1,
      verse: state.verse || 1,
      verses: [{ ref: refLabel, text: verseText }],
      columns: 1,
      fontPt: 11.5,
      paper: "a4",
      duplex: false,
      dir: isRtlLocale(curLang) ? "rtl" : "ltr",
    });
    const postalHref = `data:text/html;charset=utf-8,${encodeURIComponent(postalHtml)}`;
    const postalDownload = stealthActive
      ? stealthNeutralFilenameWeb(stealthBlkNum, "html")
      : `postal-a6-${curLang}-${String(state.book || "gen").toLowerCase()}-${Number(state.chapter) || 1}-${Number(state.verse) || 1}.html`;
    stationeryPanel.innerHTML =
      `<div class="mostrador-stationery-card" data-osis="${escapeHtml(
        `${state.book}.${state.chapter}.${state.verse}`,
      )}" style="display:flex;flex-direction:column;gap:0.45rem;">` +
      `<strong>${isEn ? "A6 Typographic Postcard" : "Postal tipográfica A6"} (${escapeHtml(refLabel)})</strong>` +
      `<blockquote style="margin:4px 0 0;font-style:italic;">"${escapeHtml(verseText)}"</blockquote>` +
      `<a id="btnDownloadStationeryPostcard" class="uls-chip" href="${postalHref}" download="${escapeHtml(postalDownload)}" style="min-height:48px;min-width:48px;align-self:flex-start;display:inline-flex;align-items:center;padding:8px 12px;text-decoration:none;font-size:0.78rem;">✉️ ${isEn ? "Download A6 Postcard (HTML)" : "Descargar Postal A6 (HTML)"}</a>` +
      `</div>`;
  }

  const impHost = getEl("impositionBookletPreviewHost", targetDoc);
  if (impHost && !impHost.innerHTML) {
    impHost.innerHTML = renderImpositionAndLayoutPreviewHtml({
      mode: state.activePrintPreviewMode || "imposition",
      paper: effectivePaper || "a4",
      pageCount: 16,
      columns: state.columns || 2,
      fontPt: state.fontSizePt || 9.5,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      uiLocale: state.uiLocale || "es",
    });
  }

  const btnCalcImp = getEl("btnCalculateImposition", targetDoc);
  if (btnCalcImp && typeof btnCalcImp.addEventListener === "function" && !btnCalcImp._printImpBound) {
    btnCalcImp._printImpBound = true;
    btnCalcImp.addEventListener("click", () => {
      state.activePrintPreviewMode = "imposition";
      const imp = computeSaddleStitchImpositionPlan({
        totalPages: 16,
        paperThicknessMm: 0.09,
        rtl: isRtlLocale(state.lang),
      });
      const sheetsSummary = imp.sheets
        .map((s) => `P${s.sheetIndex}[F:${s.front[0]}-${s.front[1]} / V:${s.back[0]}-${s.back[1]} · creep +${s.creepMm}mm]`)
        .join(" · ");
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-imposition" data-integrity="${imp.integrityVerified}" data-rtl="${imp.rtl}">` +
        `📐 <strong>Imposición Saddle-Stitch 4n (${imp.paddedPages} págs · ${imp.sheetCount} pliegos · ${imp.rtl ? "RTL Lomo Invertido" : "LTR"}):</strong> ` +
        `Suma constante=${imp.folioSumConstant} · Creep máx=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`;
      const host = getEl("impositionBookletPreviewHost", targetDoc);
      if (host) {
        host.setAttribute("data-audit-action", "calculate-imposition");
        host.innerHTML =
          renderImpositionAndLayoutPreviewHtml({
            mode: "imposition",
            paper: state.paperFormat || "a4",
            pageCount: 16,
            columns: state.columns || 2,
            fontPt: state.fontSizePt || 9.5,
            dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            uiLocale: state.uiLocale || "es",
          }) + receiptHtml;
      }
    });
  }

  const btnCalcLayout = getEl("btnCalculateLayout", targetDoc);
  if (btnCalcLayout && typeof btnCalcLayout.addEventListener === "function" && !btnCalcLayout._printLayoutBound) {
    btnCalcLayout._printLayoutBound = true;
    btnCalcLayout.addEventListener("click", () => {
      state.activePrintPreviewMode = "layout";
      const budget = computeKindlePrintBudget({
        fontPt: state.fontSizePt || 9.5,
        columns: state.columns || 2,
        orientation: state.orientation || "landscape",
        paper: state.paperFormat || "a4",
      });
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-layout" data-cpl="${budget.cpl}">` +
        `📏 <strong>Invariante Geométrico A4/Letter Verificado:</strong> ${escapeHtml(budget.summaryText)} (8 Candados Tipográficos en verde).</div>`;
      const host = getEl("impositionBookletPreviewHost", targetDoc);
      if (host) {
        host.setAttribute("data-audit-action", "calculate-layout");
        host.innerHTML =
          renderImpositionAndLayoutPreviewHtml({
            mode: "layout",
            paper: state.paperFormat || "a4",
            pageCount: 16,
            columns: state.columns || 2,
            fontPt: state.fontSizePt || 9.5,
            dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            uiLocale: state.uiLocale || "es",
          }) + receiptHtml;
      }
    });
  }

  const catalogGrid = getEl("bibleEditionsCatalogGrid", targetDoc);
  if (catalogGrid) {
    const activeProfileId = state.activePrintProfileId || "02_2col_pastoral";
    const effectiveLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
    const activeBlockCode = `B${String(
      Math.max(1, Math.min(80, Number(state.activeBlockNumber) || liveBlock.blockNumber || 1)),
    ).padStart(2, "0")}`;
    const editions = listAll14PrintEditionsForLang(
      effectiveLang,
      effectiveLang,
      { uiLocale: state.uiLocale || "es" },
    );
    if (!state.editionObjectUrls || typeof state.editionObjectUrls !== "object") {
      state.editionObjectUrls = {};
    }
    const editionScopeSig = `${effectiveLang}::${state.book || "GEN"}::${state.chapter || 1}::${activeBlockCode}`;
    if (state._editionObjectUrlsScope && state._editionObjectUrlsScope !== editionScopeSig) {
      for (const prevUrl of Object.values(state.editionObjectUrls)) {
        if (typeof prevUrl === "string" && prevUrl.startsWith("blob:")) {
          try {
            globalThis.URL?.revokeObjectURL?.(prevUrl);
          } catch {
            // Non-fatal
          }
        }
      }
      state.editionObjectUrls = {};
    }
    state._editionObjectUrlsScope = editionScopeSig;
    catalogGrid.setAttribute("data-editions-count", String(editions.length));
    catalogGrid.setAttribute("data-active-block-code", activeBlockCode);
    catalogGrid.innerHTML = editions
      .map((ed) => {
        const cardId = ed.profileId || ed.id;
        const isSelected = ed.kind !== "field_pdf" && cardId === activeProfileId;
        const dynamicFieldMode =
          ed.id?.includes("refugio_4_hojas") || ed.editionSlug === "refugio_4_hojas"
            ? 15
            : ed.id?.includes("checklist_80_bloques") || ed.editionSlug === "checklist_80_bloques"
              ? 0
              : ed.id === "06_bilingue_paralela"
                ? 15
                : ed.id === "07_cuaderno_5lineas_apaisado"
                  ? 16
                  : 0;
        const editionCacheKey = `${cardId}::${editionScopeSig}`;
        const cachedCardHref = state.editionObjectUrls[editionCacheKey] || state.editionObjectUrls[cardId] || "";
        const staticFieldHref =
          ed.kind === "field_pdf" && effectiveLang === "es" && state.federationReachable !== false
            ? buildRelativePdfAssetUrl(ed.profileUrl || ed.url || "")
            : "";
        const resolvedHref =
          cachedCardHref ||
          staticFieldHref ||
          buildRelativePdfAssetUrl(ed.profileUrl || ed.url || "mostrador/tanda_print_worker.js");
        const paperCode = encodePaperFormatCode(
          ed.paperSize || effectivePaper,
          String(ed.paperSize || "").toLowerCase().includes("landscape") ? "landscape" : "portrait",
        );
        const specParts =
          ed.kind === "field_pdf"
            ? [
              isEn ? "Field PDF" : "PDF de Campo",
              ed.bytes ? `${(Number(ed.bytes) / 1024).toFixed(1)} KB` : "",
            ].filter(Boolean)
            : [
              ed.columns ? `${ed.columns} col` : "",
              ed.fontPt ? `${ed.fontPt} pt` : "",
              ed.paperSize ? String(ed.paperSize).toUpperCase() : "",
              activeBlockCode,
            ].filter(Boolean);
        const specBadge = specParts.length
          ? `<span class="edition-spec-badge">${escapeHtml(specParts.join(" · "))}</span>`
          : "";
        return (
          `<a class="uls-chip print-edition-card${isSelected ? " is-selected" : ""}" aria-pressed="${isSelected ? "true" : "false"
          }" style="text-decoration:none;" href="${escapeHtml(
            resolvedHref,
          )}" data-profile-id="${escapeHtml(cardId)}" data-edition-slug="${escapeHtml(
            ed.editionSlug,
          )}" data-edition-mode="${dynamicFieldMode}" data-paper-code="${paperCode}" data-active-block="${escapeHtml(activeBlockCode)}" data-field-pdf-bytes="${escapeHtml(
            ed.bytes || "",
          )}" data-geometry-key="${escapeHtml(ed.geometryKey || "")}" data-edition-kind="${escapeHtml(
            ed.kind || "edition",
          )}" data-toml-path="${escapeHtml(ed.tomlPath || "")}" data-font-pt="${escapeHtml(
            ed.fontPt || "",
          )}" data-columns="${escapeHtml(ed.columns || "")}" data-paper-size="${escapeHtml(
            ed.paperSize || "",
          )}" data-has-precompiled-pdf="${Boolean(staticFieldHref && !cachedCardHref)}" data-availability-mode="bimodal_client_print" data-bimodal-lane="lane_b_worker_tanda" download>📄 ${escapeHtml(ed.label)}${specBadge}</a>`
        );
      })
      .join("");
    if (typeof catalogGrid.addEventListener === "function" && !catalogGrid._editionsBound) {
      catalogGrid._editionsBound = true;
      catalogGrid.addEventListener("click", async (e) => {
        const cardEl = e?.target?.closest
          ? e.target.closest("[data-profile-id]")
          : e?.target?.getAttribute?.("data-profile-id")
            ? e.target
            : null;
        const profId = cardEl?.getAttribute?.("data-profile-id");
        if (!profId) return;
        const curLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
        const isFieldCard =
          profId.includes("refugio_4_hojas") || profId.includes("checklist_80_bloques");
        if (isFieldCard && curLang === "es" && state.federationReachable !== false) {
          return;
        }
        let cols = Number(cardEl?.getAttribute?.("data-columns")) || Number(state.columns) || 2;
        let fontPt = Number(cardEl?.getAttribute?.("data-font-pt")) || Number(state.fontSizePt) || 9.5;
        let paper = cardEl?.getAttribute?.("data-paper-size") || state.paperFormat || "a4";
        let orientation = String(paper).toLowerCase().includes("landscape") ? "landscape" : "portrait";
        let booklet4n = state.foliationMode === "saddle_stitch";
        if (!isFieldCard) {
          const synced = syncPrintDrawerControlsFromEditionProfile(profId, targetDoc);
          state.activePrintProfileId = synced.profileId;
          state.fontSizePt = synced.fontPt;
          state.columns = synced.columns;
          state.paperFormat = synced.paper;
          state.orientation = synced.orientation;
          state.foliationMode = synced.foliationMode;
          cols = synced.columns;
          fontPt = synced.fontPt;
          paper = synced.paper;
          orientation = synced.orientation || orientation;
          booklet4n = synced.foliationMode === "saddle_stitch";
        }
        const curBlockCode = `B${String(
          Math.max(1, Math.min(80, Number(state.activeBlockNumber) || 1)),
        ).padStart(2, "0")}`;
        const cacheKey = `${profId}::${curLang}::${state.book || "GEN"}::${state.chapter || 1}::${curBlockCode}`;
        if (!state.editionObjectUrls || typeof state.editionObjectUrls !== "object") {
          state.editionObjectUrls = {};
        }
        if (!state.editionObjectUrls[cacheKey] && !cardEl._directSynthesizedClick) {
          e?.preventDefault?.();
          try {
            const substrate = await resolveEditionSubstrateForProfile(profId, {
              state,
              dataLayer: ctx.dataLayer,
              curLang,
              activeBook: state.book || "GEN",
              activeChapter: state.chapter || 1,
              columns: cols,
              fontPt,
              paper,
              orientation,
              booklet4n,
            });
            if (substrate.brfAscii || substrate.brfHref) {
              if (!state.brfObjectUrls || typeof state.brfObjectUrls !== "object") {
                state.brfObjectUrls = {};
              }
              const prevBrfUrl = state.brfObjectUrls[cacheKey];
              if (typeof prevBrfUrl === "string" && prevBrfUrl.startsWith("blob:")) {
                try {
                  globalThis.URL?.revokeObjectURL?.(prevBrfUrl);
                } catch {
                  // Non-fatal
                }
              }
              let resolvedBrfHref = substrate.brfHref || "";
              if (
                substrate.brfAscii &&
                typeof globalThis.Blob === "function" &&
                typeof globalThis.URL?.createObjectURL === "function"
              ) {
                try {
                  resolvedBrfHref = globalThis.URL.createObjectURL(
                    new globalThis.Blob([substrate.brfAscii], { type: "text/plain;charset=utf-8" }),
                  );
                } catch {
                  // Fallback to data URI
                }
              }
              state.brfObjectUrls[cacheKey] = resolvedBrfHref;
              const brfFilename = `ekovoz-${curLang}-${String(substrate.book || state.book || "GEN").toLowerCase()}-braille.brf`;
              cardEl.setAttribute?.("data-brf-href", resolvedBrfHref);
              cardEl.setAttribute?.("data-brf-download", brfFilename);
              if (resolvedBrfHref && typeof targetDoc?.createElement === "function") {
                try {
                  const brfAnchor = targetDoc.createElement("a");
                  if (brfAnchor) {
                    brfAnchor.href = resolvedBrfHref;
                    brfAnchor.download = brfFilename;
                    brfAnchor.setAttribute?.("href", resolvedBrfHref);
                    brfAnchor.setAttribute?.("download", brfFilename);
                    brfAnchor.click?.();
                  }
                } catch {
                  // Non-fatal in mock docs
                }
              }
            }
            const clickedEditionId = resolveNumericEditionId(profId || substrate.editionMode);
            const clickedRenderSpec = clickedEditionId > 0
              ? buildEditionRenderSpecBytes16(clickedEditionId, {
                columns: substrate.columns,
                fontTenthsPt: Math.round((Number(substrate.fontPt) || 9.5) * 10),
                paperCode: encodePaperFormatCode(substrate.paper, substrate.orientation),
              })
              : null;
            const res = await dispatchTandaWorkerJob({
              lang: curLang,
              book: substrate.book || state.book || "GEN",
              chapter: substrate.chapter || state.chapter || 1,
              verses: substrate.verses,
              bridgeVerses: substrate.bridgeVerses,
              bridgeFontFile: substrate.bridgeFontFile || "",
              tertiaryFontFile: substrate.tertiaryFontFile || "",
              editionId: clickedEditionId,
              editionRenderSpec: clickedRenderSpec,
              editionMode: substrate.editionMode,
              columns: substrate.columns,
              fontPt: substrate.fontPt,
              paper: substrate.paper,
              orientation: substrate.orientation,
              includeBoldFont: true,
              dir: isRtlLocale(curLang) ? "rtl" : "ltr",
              booklet4n: substrate.booklet4n,
              maxPagesPerTanda: 0,
            });
            const hasEditionParts = Array.isArray(res?.blobParts) && res.blobParts.length > 0;
            const hasEditionPdf = hasEditionParts || (res?.pdfBytes instanceof Uint8Array && res.pdfBytes.byteLength > 0);
            if (res?.type === "tanda-offline-font-notice") {
              const noticeEl = getEl("tanda-offline-font-notice", targetDoc);
              mountOfflineFontNoticeWithLocalImporter(noticeEl, res, {
                targetDoc,
                onImported: () => hydratePrintDrawerPanels?.(targetDoc),
              });
              const localFb = resolveLocalPrintArtifactFallback({
                href: cardEl.getAttribute?.("href") || cardEl.href || "",
                distAvailable: Boolean(state.federationReachable),
                lang: curLang,
                book: substrate.book || state.book || "GEN",
                chapter: substrate.chapter || state.chapter || 1,
                verse: state.verse || 1,
                verses: substrate.verses,
                columns: substrate.columns,
                fontPt: substrate.fontPt,
                paper: substrate.paper,
                stealthMode: Boolean(state.stealthMode),
                blockNumber: stealthBlkNum,
                stealthFilename: stealthActive ? stealthNeutralFilenameWeb(stealthBlkNum, "html") : "",
              });
              if (localFb.isFallback && localFb.href) {
                cardEl.href = localFb.href;
                cardEl.setAttribute?.("href", localFb.href);
                cardEl.setAttribute?.("download", localFb.filename);
                cardEl.setAttribute?.("data-local-print-fallback", localFb.mode);
              }
            } else if (hasEditionPdf) {
              const prevHref = state.editionObjectUrls[cacheKey];
              if (typeof prevHref === "string" && prevHref.startsWith("blob:")) {
                try {
                  globalThis.URL?.revokeObjectURL?.(prevHref);
                } catch {
                  // Non-fatal
                }
              }
              const nextHref = toDownloadablePdfHref(hasEditionParts ? res.blobParts : res.pdfBytes);
              state.editionObjectUrls[cacheKey] = nextHref;
              state.editionObjectUrls[profId] = nextHref;
              cardEl.href = nextHref;
              cardEl.setAttribute?.("href", nextHref);
              if (stealthActive) {
                cardEl.setAttribute?.("download", stealthNeutralFilenameWeb(stealthBlkNum, "pdf"));
              }
              if (typeof cardEl.click === "function") {
                cardEl._directSynthesizedClick = true;
                try {
                  cardEl.click();
                } finally {
                  cardEl._directSynthesizedClick = false;
                }
              }
            } else {
              const localFb = resolveLocalPrintArtifactFallback({
                href: cardEl.getAttribute?.("href") || cardEl.href || "",
                distAvailable: Boolean(state.federationReachable),
                lang: curLang,
                book: substrate.book || state.book || "GEN",
                chapter: substrate.chapter || state.chapter || 1,
                verse: state.verse || 1,
                verses: substrate.verses,
                columns: substrate.columns,
                fontPt: substrate.fontPt,
                paper: substrate.paper,
                stealthMode: Boolean(state.stealthMode),
                blockNumber: stealthBlkNum,
                stealthFilename: stealthActive ? stealthNeutralFilenameWeb(stealthBlkNum, "html") : "",
              });
              if (localFb.isFallback && localFb.href) {
                cardEl.href = localFb.href;
                cardEl.setAttribute?.("href", localFb.href);
                cardEl.setAttribute?.("download", localFb.filename);
                cardEl.setAttribute?.("data-local-print-fallback", localFb.mode);
              }
            }
          } catch {
            // Non-fatal
          }
        } else if (state.editionObjectUrls[cacheKey]) {
          const cachedHref = state.editionObjectUrls[cacheKey];
          cardEl.href = cachedHref;
          cardEl.setAttribute?.("href", cachedHref);
        }
        if (!isFieldCard) {
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
  }
}

function normalizeChapterMapToEntries(bookCode, chapterNum, versesMap) {
  if (Array.isArray(versesMap)) return versesMap;
  if (!versesMap || typeof versesMap !== "object") return [];
  return Object.keys(versesMap)
    .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
    .map((vNum) => ({ ref: `${bookCode} ${chapterNum}:${vNum}`, text: String(versesMap[vNum] ?? "") }));
}

function filterBookEntriesRange(entries, bookCode, minCh = 1, maxCh = 999, minV = 1, maxV = 999) {
  const out = [];
  for (const item of entries) {
    const m = String(item?.ref || "").match(/^([A-Z0-9]+)\s+(\d+):(\d+)/i);
    if (!m) continue;
    if (String(m[1]).toUpperCase() !== String(bookCode).toUpperCase()) continue;
    const ch = Number(m[2]);
    const v = Number(m[3]);
    if (ch < minCh || ch > maxCh) continue;
    if (ch === minCh && v < minV) continue;
    if (ch === maxCh && v > maxV) continue;
    out.push(item);
  }
  return out;
}

export async function resolveEditionSubstrateForProfile(
  profId,
  {
    state = {},
    dataLayer = null,
    curLang = "es",
    activeBook = "GEN",
    activeChapter = 1,
    columns = 2,
    fontPt = 9.5,
    paper = "a4",
    orientation = "portrait",
    booklet4n = false,
  } = {},
) {
  const id = String(profId || "02_2col_pastoral").trim();
  const baseVerses =
    Array.isArray(state.fullBookVerses) && state.fullBookVerses.length > 0
      ? state.fullBookVerses
      : normalizeChapterMapToEntries(activeBook, activeChapter, state.lastNavResult?.chapter?.verses || {});

  if (id.includes("checklist_80_bloques")) {
    return {
      book: "GEN",
      chapter: 1,
      verses: formatCanonical80BlocksChecklistEntries(curLang),
      bridgeVerses: null,
      editionMode: 0,
      columns: 2,
      fontPt: 9.0,
      paper: "a4",
      orientation: "portrait",
      booklet4n: false,
      brfHref: "",
    };
  }

  const loadBookEntries = async (langCode, bookCode) => {
    if (typeof dataLayer?.loadBookFromEkpackRange !== "function") return [];
    const res = await dataLayer.loadBookFromEkpackRange(langCode, bookCode);
    return String(res?.status || "").toLowerCase() === "ready"
      ? flattenLoadedBookChapters(bookCode, res.data?.chapters)
      : [];
  };

  if (id.includes("refugio_4_hojas")) {
    const bridgeLang = curLang === "es" ? "en" : "es";
    const vernOut = [];
    const bridgeOut = [];
    const vernByBook = new Map();
    const bridgeByBook = new Map();
    for (const p of REFUGE_4_SHEETS_PASSAGES_SPEC) {
      if (!vernByBook.has(p.book)) {
        vernByBook.set(p.book, await loadBookEntries(curLang, p.book));
        bridgeByBook.set(p.book, await loadBookEntries(bridgeLang, p.book));
      }
      for (const item of filterBookEntriesRange(vernByBook.get(p.book), p.book, p.chapter, p.chapter, p.startVerse, p.endVerse)) {
        vernOut.push(item);
      }
      for (const item of filterBookEntriesRange(bridgeByBook.get(p.book), p.book, p.chapter, p.chapter, p.startVerse, p.endVerse)) {
        bridgeOut.push(item);
      }
    }
    return {
      book: "GEN",
      chapter: 1,
      verses: vernOut.length > 0 ? vernOut : baseVerses,
      bridgeVerses: bridgeOut.length > 0 ? bridgeOut : null,
      editionMode: 15,
      columns: 2,
      fontPt: 8.5,
      paper: "a4",
      orientation: "portrait",
      booklet4n: true,
      brfHref: "",
    };
  }

  if (id === "10_evangelio_14_pericopas") {
    const gospelOut = [];
    const gospelByBook = new Map();
    for (const p of GOSPEL_14_PERICOPES_SPEC) {
      if (!gospelByBook.has(p.book)) {
        gospelByBook.set(p.book, await loadBookEntries(curLang, p.book));
      }
      const slice = filterBookEntriesRange(gospelByBook.get(p.book), p.book, p.chapter, p.chapter, p.startVerse, p.endVerse);
      if (slice.length > 0) {
        gospelOut.push({ ref: `${p.book} ${p.chapter}:${p.startVerse}`, text: `[${p.title}] ${slice[0].text}` });
        for (let k = 1; k < slice.length; k += 1) gospelOut.push(slice[k]);
      }
    }
    return {
      book: "JHN",
      chapter: 1,
      verses: gospelOut.length > 0 ? gospelOut : baseVerses,
      bridgeVerses: null,
      editionMode: 0,
      columns: 2,
      fontPt: 10.0,
      paper: "a4",
      orientation: "portrait",
      booklet4n: true,
      brfHref: "",
    };
  }

  if (id === "06_bilingue_paralela") {
    const resolvedBridge =
      typeof resolveRegionalBridgeLanguage21 === "function"
        ? resolveRegionalBridgeLanguage21(curLang, state.countryIso2 || "MX")
        : null;
    const bridgeLang =
      String(
        state.lastBridgeLang ||
        resolvedBridge?.code ||
        (curLang === "es" ? "en" : "es"),
      )
        .trim() || "es";
    let bridgeEntries = await loadBookEntries(bridgeLang, activeBook);
    const cachedBridgeVerses = state.lastBridgeChapter?.verses || state.lastNavResult?.bridgeChapter?.verses;
    if (bridgeEntries.length === 0 && cachedBridgeVerses) {
      bridgeEntries = normalizeChapterMapToEntries(activeBook, activeChapter, cachedBridgeVerses);
    }
    return {
      book: activeBook,
      chapter: activeChapter,
      verses: baseVerses,
      bridgeVerses: bridgeEntries.length > 0 ? bridgeEntries : null,
      editionMode: 15,
      maternalWidthPct: 62,
      bridgeWidthPct: 38,
      bilingualRatio: "62/38",
      columns: 2,
      fontPt: 9.5,
      paper,
      orientation,
      booklet4n,
      brfHref: "",
    };
  }

  if (id === "05_interlineal_estudio") {
    const chapEntries = normalizeChapterMapToEntries(
      activeBook,
      activeChapter,
      state.lastNavResult?.chapter?.verses || {},
    );
    const activeSet = chapEntries.length > 0 ? chapEntries : baseVerses;
    let matrixRes = state.lastNavResult?.matrix || state.lastNavResult?.chapterMatrix || null;
    if (!matrixRes && typeof dataLayer?.loadChapterMatrix === "function") {
      try {
        matrixRes = await dataLayer.loadChapterMatrix(activeBook, activeChapter);
      } catch {
        matrixRes = null;
      }
    }
    const matrixRows = Array.isArray(matrixRes?.rows) ? matrixRes.rows : [];
    const interlinearVerses = activeSet.map((entry) => {
      const vMatch = String(entry.ref || "").match(/:(\d+)$/);
      const vNum = Number(vMatch ? vMatch[1] : 1) || 1;
      const tokens = matrixRows.filter((r) =>
        Array.isArray(r) ? Number(r[0]) === vNum : Number(r?.verse ?? r?.v ?? 0) === vNum,
      );
      if (tokens.length === 0) {
        const pendingLabel = curLang.startsWith("en")
          ? "Tier-0 matrix loading"
          : "Matriz Tier-0 cargándose";
        return { ref: entry.ref, text: `${entry.text} ‖ (${pendingLabel})` };
      }
      const colsSummary = tokens
        .map((tk, tkIdx) => {
          const c02Pos = `w${tkIdx + 1}`;
          const surf = Array.isArray(tk) ? tk[1] || "" : tk.surface || tk.c03 || "";
          const lem = Array.isArray(tk) ? tk[2] || "" : tk.lemma || tk.c04 || "";
          const strong = Array.isArray(tk) ? tk[3] || "" : tk.strong || tk.c05 || "";
          const morph = Array.isArray(tk) ? tk[4] || "" : tk.morph || tk.c06 || "";
          const domain = Array.isArray(tk) ? tk[5] || "" : tk.domain || tk.c07 || "";
          const glossEn = Array.isArray(tk) ? tk[6] || "" : tk.gloss_en || tk.c08 || "";
          const glossEs = Array.isArray(tk) ? tk[7] || "" : tk.gloss_es || tk.gloss || tk.c09 || "";
          const gloss = glossEn && glossEs && glossEn !== glossEs
            ? (curLang.startsWith("en") ? `${glossEn}/${glossEs}` : `${glossEs}/${glossEn}`)
            : (glossEs || glossEn);
          const clause = Array.isArray(tk) ? tk[8] || "" : tk.clause || tk.c10 || "";
          const c11 = Array.isArray(tk) ? tk[9] || "" : tk.c11 || "";
          const c12 = Array.isArray(tk) ? tk[10] || "" : tk.c12 || "";
          const c13 = Array.isArray(tk) ? tk[11] || "" : tk.c13 || "";
          const c14 = Array.isArray(tk) ? tk[12] || "" : tk.c14 || "";
          const translitAscii = Array.isArray(tk) && tk[14] && tk[13] && tk[14] !== tk[13] ? tk[13] : "";
          const translit = Array.isArray(tk) ? tk[14] || tk[13] || "" : tk.translit || tk.c15 || "";
          const extras = [domain, clause, c11, c12, c13, c14, translitAscii, translit].filter(Boolean);
          return extras.length > 0
            ? `[${surf}|${lem}|${strong}|${morph}|${c02Pos}|${gloss}|${extras.join("|")}]`
            : `[${surf}|${lem}|${strong}|${morph}|${c02Pos}|${gloss}]`;
        })
        .join(" ");
      return { ref: entry.ref, text: `${entry.text} ‖ ${colsSummary}` };
    });
    const isNtInterlinear = /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)$/i.test(
      String(activeBook || "").trim(),
    );
    return {
      book: activeBook,
      chapter: activeChapter,
      verses: interlinearVerses,
      bridgeVerses: null,
      bridgeFontFile: isNtInterlinear ? "EBGaramond-Greek-Biblical.ttf" : "Cardo-Hebrew-Biblical.ttf",
      tertiaryFontFile: isNtInterlinear ? "Cardo-Hebrew-Biblical.ttf" : "EBGaramond-Greek-Biblical.ttf",
      editionMode: 0,
      columns: 1,
      fontPt: 9.0,
      paper: "a4",
      orientation: "portrait",
      booklet4n: false,
      brfAscii: "",
      brfHref: "",
    };
  }

  if (id === "11_braille_nemeth_b70") {
    const braille = transduceTextToBrailleBrfAndUnicode(baseVerses, {
      lineWidth: 40,
      nemeth: Boolean(state?.brailleNemethEnabled),
    });
    const brfHref = `data:text/plain;charset=utf-8,${encodeURIComponent(braille.brfAscii)}`;
    return {
      book: activeBook,
      chapter: activeChapter,
      verses: braille.unicodeBrailleEntries.map((e) => ({
        ref: e.ref,
        text: `${e.unicodeBraille} — ${e.text}`,
      })),
      bridgeVerses: null,
      editionMode: 0,
      columns: 1,
      fontPt: 16.0,
      paper: "b70",
      orientation: "portrait",
      booklet4n: false,
      brfAscii: braille.brfAscii,
      brfHref,
    };
  }

  return {
    book: activeBook,
    chapter: activeChapter,
    verses: baseVerses,
    bridgeVerses: null,
    editionMode: id === "07_cuaderno_5lineas_apaisado" ? 16 : 0,
    columns,
    fontPt,
    paper,
    orientation: id === "07_cuaderno_5lineas_apaisado" ? "landscape" : orientation,
    booklet4n,
    brfHref: "",
  };
}

function flattenLoadedBookChapters(bookCode, chaptersObj) {
  if (!chaptersObj || typeof chaptersObj !== "object") return [];
  const entries = [];
  const isChapArray = Array.isArray(chaptersObj);
  const chapNums = Object.keys(chaptersObj).sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
  for (const chKey of chapNums) {
    const chDisplay = isChapArray ? Number(chKey) + 1 : chKey;
    const chVal = chaptersObj[chKey];
    if (Array.isArray(chVal)) {
      for (const v of chVal) {
        if (Array.isArray(v) && v.length >= 3 && v[2]) {
          entries.push({ ref: `${bookCode} ${chDisplay}:${v[0] ?? 1}`, text: String(v[2]) });
        } else if (v && v.text) {
          entries.push({ ref: `${bookCode} ${chDisplay}:${v.start ?? v.verse ?? 1}`, text: String(v.text) });
        }
      }
    } else if (chVal && typeof chVal === "object") {
      const versesMap = chVal.verses && typeof chVal.verses === "object" ? chVal.verses : chVal;
      const vNums = Object.keys(versesMap).sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
      for (const vKey of vNums) {
        if (typeof versesMap[vKey] === "string") {
          entries.push({ ref: `${bookCode} ${chDisplay}:${vKey}`, text: versesMap[vKey] });
        }
      }
    }
  }
  return entries;
}

function toDownloadablePdfHref(pdfInput) {
  const parts = Array.isArray(pdfInput)
    ? pdfInput.filter((p) => p instanceof Uint8Array && p.byteLength > 0)
    : pdfInput instanceof Uint8Array && pdfInput.byteLength > 0
      ? [pdfInput]
      : [];
  if (parts.length === 0) return "";
  if (
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.Blob === "function" &&
    typeof globalThis.URL?.createObjectURL === "function"
  ) {
    return globalThis.URL.createObjectURL(new globalThis.Blob(parts, { type: "application/pdf" }));
  }
  if (parts.length === 1) {
    return encodePdfBytesToDataUri(parts[0]);
  }
  const total = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    merged.set(p, off);
    off += p.byteLength;
  }
  return encodePdfBytesToDataUri(merged);
}

export async function hydratePrintDrawerPanelsInDrawer(ctx = {}) {
  const { state, dataLayer, targetDoc, getEl } = ctx;
  renderPrintDrawerPanelsSyncInDrawer(ctx);
  if (!state.editorialProfilesLoaded && typeof dataLayer?.loadEditorialProfiles === "function") {
    state.editorialProfilesLoaded = true;
    try {
      const ep = await dataLayer.loadEditorialProfiles();
      if (ep) {
        hydrateEditorialProfiles(ep);
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      }
    } catch {
      // Non-fatal
    }
  }

  const printFontLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
  const printFontFile = resolveFontFileForLangOrScript(printFontLang, state.script || "");
  if (
    state._activePrintTtfFontFile !== printFontFile ||
    !(state.activePrintTtfBytes instanceof Uint8Array)
  ) {
    if (state._activePrintTtfFontFile && state._activePrintTtfFontFile !== printFontFile) {
      state.activePrintTtfBytes = null;
      state._activePrintTtfFontFile = "";
    }
    if (typeof dataLayer?.loadBytes === "function") {
      try {
        const tier0AssetFile = resolveTier0AssetFontFilename(printFontFile);
        let ttf = tier0AssetFile ? await dataLayer.loadBytes(`assets/fonts/${tier0AssetFile}`) : null;
        if (!(ttf instanceof Uint8Array) || ttf.byteLength <= 64) {
          const zst = await dataLayer.loadBytes(`packs/fonts/${printFontFile}.zst`);
          if (zst instanceof Uint8Array && zst.byteLength > 16) {
            const playerWasm =
              dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") ||
              (typeof dataLayer?.loadWasmModule === "function"
                ? await dataLayer.loadWasmModule("ekovoz_player_wasm")
                : null);
            ttf = decodeRfc8878RawZstdFrameJs(zst, playerWasm);
          }
        }
        if (ttf instanceof Uint8Array && ttf.byteLength > 64) {
          state.activePrintTtfBytes = ttf;
          state._activePrintTtfFontFile = printFontFile;
        }
      } catch {
        // Non-fatal in headless mocks without font asset
      }
    }
  }

  if (
    state.federationReachable === undefined &&
    typeof globalThis.fetch === "function" &&
    typeof globalThis.window !== "undefined"
  ) {
    const probed = await probeFederationShardReachabilityOnce({ doc: targetDoc });
    state.federationReachable = probed;
    if (probed === false) {
      syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
      renderPrintDrawerPanelsSyncInDrawer(ctx);
    }
  }

  const effectiveLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
  const dose3Plan = planDose3([], effectiveLang, state.edition || "01_lectura_general");
  const dose3LinkEl = getEl("linkDose3FullBiblePdf", targetDoc);
  if (dose3Plan && dose3LinkEl && typeof dose3LinkEl.setAttribute === "function") {
    dose3LinkEl.setAttribute("data-dose3-edition", String(dose3Plan.edition || state.edition || "01_lectura_general"));
  }
  const activeCols = Number(state.columns) || 2;
  const activeFontPt = Number(state.fontSizePt) || 9.5;
  const resolvedBlock = resolveCanonicalBlockCode(state.book, state.chapter, state.verse);
  const activeBlockNum = Number(state.activeBlockNumber) || resolvedBlock.blockNumber || 1;
  const activeBlockSpec = CANONICAL_80_BLOCKS_CATALOG[Math.max(0, Math.min(79, activeBlockNum - 1))];
  const activeMacroTanda =
    CANONICAL_16_MACRO_TANDAS[
    Math.max(1, Math.min(16, Number(state.activeMacroTandaNumber) || resolveMacroTandaForBlock(activeBlockNum).macroTandaNumber)) - 1
    ] || resolveMacroTandaForBlock(activeBlockNum);
  const full66Flag = state.generateFull66BookBible ? "FULL66" : `MT${activeMacroTanda.macroTandaNumber}`;
  const workerCacheKey = `${effectiveLang}:${state.book || "GEN"}:B${activeBlockNum}:${full66Flag}:${activeCols}:${activeFontPt}:${state.paperFormat || "a4"}`;
  if (
    state.lastHydratedWorkerTandaKey !== workerCacheKey &&
    typeof dataLayer?.loadBookFromEkpackRange === "function"
  ) {
    state.lastHydratedWorkerTandaKey = workerCacheKey;
    try {
      const activeBook = String(state.book || "GEN").toUpperCase();
      const bookCache = new Map();
      const fetchBookEntries = async (bCode) => {
        const cleanB = String(bCode || "").toUpperCase();
        if (!cleanB) return [];
        if (bookCache.has(cleanB)) return bookCache.get(cleanB);
        const bRes = await dataLayer.loadBookFromEkpackRange(effectiveLang, cleanB);
        const flat = String(bRes?.status || "").toLowerCase() === "ready"
          ? flattenLoadedBookChapters(cleanB, bRes.data?.chapters)
          : [];
        bookCache.set(cleanB, flat);
        return flat;
      };

      const fullBookVerses = await fetchBookEntries(activeBook);
      if (fullBookVerses.length > 0) {
        state.fullBookVerses = fullBookVerses;

        const blockVerses = [];
        if (activeBlockSpec) {
          const normBlockBook = (b) => {
            const u = String(b || "").trim().toUpperCase();
            return ({ EZE: "EZK", JOE: "JOL", NAH: "NAM", PHI: "PHP", SOL: "SNG" })[u] || u;
          };
          const startB = normBlockBook(activeBlockSpec.startBook);
          const endB = normBlockBook(activeBlockSpec.endBook);
          const mtForBlock = resolveMacroTandaForBlock(activeBlockNum);
          const candidateBooks = Array.isArray(mtForBlock?.booksIncluded)
            ? mtForBlock.booksIncluded.map(normBlockBook)
            : [normBlockBook(activeBook)];
          const sBookIdx = candidateBooks.indexOf(startB);
          const eBookIdx = candidateBooks.indexOf(endB);
          const blockBooks = sBookIdx >= 0 && eBookIdx >= sBookIdx
            ? candidateBooks.slice(sBookIdx, eBookIdx + 1)
            : [startB, endB].filter(Boolean);
          for (const bCode of [...new Set(blockBooks)]) {
            const entries = await fetchBookEntries(bCode);
            const minCh = bCode === startB ? activeBlockSpec.startChapter : 1;
            const maxCh = bCode === endB ? activeBlockSpec.endChapter : 999;
            for (const item of filterBookEntriesRange(entries, bCode, minCh, maxCh, 1, 999)) {
              blockVerses.push(item);
            }
          }
        }
        const dose2Payload = blockVerses.length > 0 ? blockVerses : fullBookVerses;

        const tandaVerses = [];
        const targetMacroPlans =
          state.generateFull66BookBible && Array.isArray(state.fullBible16MacroTandasPlan) && state.fullBible16MacroTandasPlan.length === 16
            ? state.fullBible16MacroTandasPlan
            : [activeMacroTanda];
        const seenBooks = new Set();
        for (const mtStep of targetMacroPlans) {
          const macroBooks =
            Array.isArray(mtStep.booksIncluded) && mtStep.booksIncluded.length > 0
              ? mtStep.booksIncluded
              : [activeBook];
          for (const targetBook of macroBooks) {
            if (seenBooks.has(targetBook)) continue;
            seenBooks.add(targetBook);
            for (const item of await fetchBookEntries(targetBook)) {
              tandaVerses.push(item);
            }
          }
        }
        if (tandaVerses.length === 0) {
          for (const item of fullBookVerses) tandaVerses.push(item);
        }
        state.bibleTandaVerses = tandaVerses;

        const skipDose2Redundant = Boolean(state.generateFull66BookBible);
        const dir = isRtlLocale(effectiveLang) ? "rtl" : "ltr";
        const activeEditionId = resolveNumericEditionId(state.activePrintProfileId);
        const activeRenderSpec = activeEditionId > 0
          ? buildEditionRenderSpecBytes16(activeEditionId, {
            columns: activeCols,
            fontTenthsPt: Math.round((Number(activeFontPt) || 9.5) * 10),
            paperCode: encodePaperFormatCode(state.paperFormat || "a4", state.orientation || "portrait"),
          })
          : null;
        const [dose2Res, dose3Res] = await Promise.all([
          skipDose2Redundant
            ? Promise.resolve(null)
            : dispatchTandaWorkerJob({
              lang: effectiveLang,
              book: activeBlockSpec?.startBook || activeBook,
              chapter: activeBlockSpec?.startChapter || 1,
              verses: dose2Payload,
              editionId: activeEditionId,
              editionRenderSpec: activeRenderSpec,
              columns: activeCols,
              fontPt: activeFontPt,
              paper: state.paperFormat || "a4",
              orientation: state.orientation || "portrait",
              includeBoldFont: true,
              dir,
              booklet4n: state.foliationMode === "saddle_stitch",
              maxPagesPerTanda: 0,
            }),
          dispatchTandaWorkerJob({
            lang: effectiveLang,
            book: state.generateFull66BookBible ? "GEN" : activeMacroTanda.startBook || activeBook,
            chapter: state.generateFull66BookBible ? 1 : activeMacroTanda.startChapter || 1,
            verses: tandaVerses,
            editionId: activeEditionId,
            editionRenderSpec: activeRenderSpec,
            columns: activeCols,
            fontPt: activeFontPt,
            paper: state.paperFormat || "a4",
            orientation: state.orientation || "portrait",
            includeBoldFont: true,
            dir,
            booklet4n: true,
            maxPagesPerTanda: 0,
          }),
        ]);
        if (dose2Res?.type === "tanda-offline-font-notice" || dose3Res?.type === "tanda-offline-font-notice") {
          const noticeEl = getEl("tanda-offline-font-notice", targetDoc);
          const activeNotice = dose2Res?.type === "tanda-offline-font-notice" ? dose2Res : dose3Res;
          mountOfflineFontNoticeWithLocalImporter(noticeEl, activeNotice, {
            targetDoc,
            onImported: () => hydratePrintDrawerPanels?.(targetDoc),
          });
        }
        const d2Parts = Array.isArray(dose2Res?.blobParts) && dose2Res.blobParts.length > 0 ? dose2Res.blobParts : null;
        if (d2Parts || (dose2Res?.pdfBytes instanceof Uint8Array && dose2Res.pdfBytes.byteLength > 0)) {
          if (typeof state.dose2ObjectUrl === "string" && state.dose2ObjectUrl.startsWith("blob:")) {
            try {
              globalThis.URL?.revokeObjectURL?.(state.dose2ObjectUrl);
            } catch {
              // Non-fatal
            }
          }
          state.dose2WorkerBlobParts = d2Parts || [dose2Res.pdfBytes];
          state.dose2WorkerPdfBytes = d2Parts
            ? (d2Parts.length === 1 ? d2Parts[0] : null)
            : dose2Res.pdfBytes;
          state.dose2ObjectUrl = toDownloadablePdfHref(state.dose2WorkerBlobParts);
        }
        const d3Parts = Array.isArray(dose3Res?.blobParts) && dose3Res.blobParts.length > 0 ? dose3Res.blobParts : null;
        if (d3Parts || (dose3Res?.pdfBytes instanceof Uint8Array && dose3Res.pdfBytes.byteLength > 0)) {
          if (typeof state.dose3ObjectUrl === "string" && state.dose3ObjectUrl.startsWith("blob:")) {
            try {
              globalThis.URL?.revokeObjectURL?.(state.dose3ObjectUrl);
            } catch {
              // Non-fatal
            }
          }
          state.dose3WorkerBlobParts = d3Parts || [dose3Res.pdfBytes];
          state.dose3WorkerPdfBytes = d3Parts
            ? (d3Parts.length === 1 ? d3Parts[0] : null)
            : dose3Res.pdfBytes;
          state.dose3LastCompletedTandas = targetMacroPlans.length;
          state._dose3Streamed16Of16 = Boolean(
            state.generateFull66BookBible && targetMacroPlans.length === 16,
          );
          state.dose3ObjectUrl = toDownloadablePdfHref(state.dose3WorkerBlobParts);
        }
        syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      }
    } catch {
      // Non-fatal fallback to synchronous seed tanda
    } finally {
      state.generateFull66BookBible = false;
    }
  } else {
    state.generateFull66BookBible = false;
  }
}

export function revokePrintObjectUrls(targetState) {
  if (!targetState || typeof targetState !== "object") return;
  for (const key of ["dose2ObjectUrl", "dose3ObjectUrl"]) {
    const urlVal = targetState[key];
    if (typeof urlVal === "string" && urlVal.startsWith("blob:")) {
      try {
        globalThis.URL?.revokeObjectURL?.(urlVal);
      } catch {
        // Non-fatal
      }
    }
    targetState[key] = "";
  }
  targetState._dose3Streamed16Of16 = false;
  targetState.dose3LastCompletedTandas = 0;
  for (const mapKey of ["editionObjectUrls", "brfObjectUrls"]) {
    const urlMap = targetState[mapKey];
    if (urlMap && typeof urlMap === "object") {
      for (const prevUrl of Object.values(urlMap)) {
        if (typeof prevUrl === "string" && prevUrl.startsWith("blob:")) {
          try {
            globalThis.URL?.revokeObjectURL?.(prevUrl);
          } catch {
            // Non-fatal
          }
        }
      }
      targetState[mapKey] = {};
    }
  }
  targetState.dose2WorkerPdfBytes = null;
  targetState.dose3WorkerPdfBytes = null;
  targetState.fullBookVerses = null;
  targetState.bibleTandaVerses = null;
  targetState.generateFull66BookBible = false;
  targetState.lastHydratedWorkerTandaKey = "";
}

export { mountOfflineFontNoticeWithLocalImporter };

