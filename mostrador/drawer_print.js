// ============================================================================
// web/mostrador/drawer_print.js — Gaveta 2 (Imprimir, 14+2 Ediciones PDF, Imposición 4n & Fotocopia Sauvola)
// Slimmed LCOM4 module (D1-R2, D4-R2, D5-R2, D6-R2): delegates social/photocopy
// cards to social_and_photocopy_cards.js, unified printConfig & direct 14+2 +
// Grambank wiring to print_config_projector.js, and stealth naming to stealth_filename.js.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  buildRelativePdfAssetUrl,
  CANONICAL_16_MACRO_TANDAS,
  CANONICAL_80_BLOCKS_CATALOG,
  chooseEdition,
  computeFoliationLayout,
  computeKindlePrintBudget,
  dispatchTandaWorkerJob,
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
  simulateThirdGenPhotocopySauvola,
  syncDose2AndDose3LinksForActiveLang,
  syncPrintDrawerControlsFromEditionProfile,
} from "./dosis.js";
import {
  buildCssPagedMediaPrintHtml,
  resolveLocalPrintArtifactFallback,
} from "./bimodal_tanda_print.js";
import { computeSaddleStitchImpositionPlan } from "./optical_lt.js";
import {
  buildEditionRenderSpecBytes16,
  resolveNumericEditionId,
  transduceTextToBrailleBrfAndUnicode,
} from "./dosis_editions_catalog.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import { isRtlLocale } from "./i18n.js";
import { mountOfflineFontNoticeWithLocalImporter } from "./offline_font_bundle.js";
import { decodeRfc8878RawZstdFrameJs } from "./offline_mesh.js";
import {
  applyGrambankTypologyToPrint,
  ensureDirectEditionsAndGrambankControls,
  filterBookEntriesRange,
  flattenLoadedBookChapters,
  normalizeChapterMapToEntries,
  resolveEditionSubstrateForProfile,
  resolveGrambankTypologyPrintPreset,
} from "./print_config_projector.js";
import { resolveOracleSpecimenDefaults } from "./sauvola_canvas_oracle.js";
import {
  buildOpenGraphSocialCardSvg1200x630,
  formatPhotocopySimBadgeText,
  renderEditorialGraphicsAndPrintSpecsCard,
  renderPhotocopyResilienceAndSocialCardHtml,
  simulateKanungoSauvolaGeneration,
} from "./social_and_photocopy_cards.js";
import { isStealthFilenameActive, resolveSafeDownloadFilename } from "./stealth_filename.js";
import { updatePrintConfig } from "./state_store.js";
import {
  encodePaperFormatCode,
  resolveFontFileForLangOrScript,
  resolveTier0AssetFontFilename,
  runWorkerTandaJob,
} from "./tanda_print_worker.js";

export {
  HAREL_PRINT_SUBTABS_CONST as HAREL_PRINT_SUBTABS,
  applyGrambankTypologyToPrint,
  buildOpenGraphSocialCardSvg1200x630,
  formatPhotocopySimBadgeText,
  mountOfflineFontNoticeWithLocalImporter,
  renderEditorialGraphicsAndPrintSpecsCard,
  renderPhotocopyResilienceAndSocialCardHtml,
  resolveEditionSubstrateForProfile,
  resolveGrambankTypologyPrintPreset,
  runWorkerTandaJob,
  simulateKanungoSauvolaGeneration,
};

const HAREL_PRINT_SUBTABS_CONST = ["doses", "imposition", "stationery"];

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
  const total = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const combined = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    combined.set(p, off);
    off += p.byteLength;
  }
  return encodePdfBytesToDataUriSafe(combined);
}

function encodePdfBytesToDataUriSafe(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof globalThis.btoa === "function" ? globalThis.btoa(bin) : Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${b64}`;
}

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

  const stealthActive = isStealthFilenameActive(state);
  const stealthBlkNum = Number(state.activeBlockNumber) || liveBlock.blockNumber || 1;
  const chkStealth = getEl("chkStealthPackMode", targetDoc);
  if (chkStealth) {
    chkStealth.checked = Boolean(state.stealthMode);
    if (typeof chkStealth.addEventListener === "function" && !chkStealth._stealthBound) {
      chkStealth._stealthBound = true;
      chkStealth.addEventListener("change", (ev) => {
        const nextStealth = Boolean(ev?.target?.checked ?? chkStealth.checked);
        state.stealthMode = nextStealth;
        if (ctx.store) {
          ctx.store.setState({ stealthMode: nextStealth }, "stealth");
        } else {
          targetDoc?.documentElement?.setAttribute?.("data-stealth-mode", nextStealth ? "true" : "false");
        }
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      });
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
      const dlFilename = resolveSafeDownloadFilename(state, { kind: "paged_media", blockNumber: stealthBlkNum });
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
  const activeOrientation = String(state.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
  state.orientation = activeOrientation;
  const orientSel = getEl("kindleOrientationSelector", targetDoc);
  if (orientSel) orientSel.value = activeOrientation;
  const budget = computeKindlePrintBudget({
    fontPt: state.fontSizePt || 9.5,
    columns: state.columns || 2,
    orientation: activeOrientation,
    paper: effectivePaper || "a4",
    uiLocale: state.uiLocale || "es",
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

  ensureDirectEditionsAndGrambankControls({
    ...ctx,
    onConfigChanged: () => renderPrintDrawerPanelsSyncInDrawer(ctx),
  });

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
    const activeBlockNum = Number(state.activeBlockNumber) || liveBlock.blockNumber || 1;
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
    const brfFilename = resolveSafeDownloadFilename(state, { kind: "braille_brf", blockNumber: stealthBlkNum });
    const nemethToggleHtml =
      `<div class="braille-actions-row">` +
      `<label class="hig-toggle-row uls-chip">` +
      `<input type="checkbox" id="chkBrailleNemethToggle" data-action="toggle-braille-nemeth" data-edition-slug="11_braille_nemeth_b70"${nemethCheckedAttr} />` +
      `<span>${escapeHtml(nemethLabel)}</span></label>` +
      `<a id="btnDownloadBrailleBrf" class="uls-chip" href="${brfHref}" download="${escapeHtml(brfFilename)}" data-edition-slug="11_braille_nemeth_b70">` +
      `⠋ ${isEn ? "Download Tactile .brf (Ed. 11)" : "Descargar .brf Táctil (Ed. 11)"}</a>` +
      `</div>`;
    duplexPanel.innerHTML = `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(
      slug,
    )}" data-foliation-mode="${escapeHtml(foliation.mode)}" data-binding-edge="${escapeHtml(
      foliation.bindingEdge,
    )}"><strong>${duplexHeader}</strong><p class="duplex-summary-text">${duplexBody}</p>${nemethToggleHtml}${multiSigHtml}${macroTandas16Html}</div>`;

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
        hydratePrintDrawerPanels?.(targetDoc);
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
        hydratePrintDrawerPanels?.(targetDoc);
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
        hydratePrintDrawerPanels?.(targetDoc);
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
    const postalDownload = resolveSafeDownloadFilename(state, { kind: "postal_a6", blockNumber: stealthBlkNum });
    stationeryPanel.innerHTML =
      `<div class="mostrador-stationery-card" data-osis="${escapeHtml(`${state.book}.${state.chapter}.${state.verse}`)}">` +
      `<strong>${isEn ? "A6 Typographic Postcard" : "Postal tipográfica A6"} (${escapeHtml(refLabel)})</strong>` +
      `<blockquote class="stationery-quote">"${escapeHtml(verseText)}"</blockquote>` +
      `<a id="btnDownloadStationeryPostcard" class="uls-chip stationery-download-btn" href="${postalHref}" download="${escapeHtml(postalDownload)}">✉️ ${isEn ? "Download A6 Postcard (HTML)" : "Descargar Postal A6 (HTML)"}</a>` +
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
      orientation: state.orientation || "portrait",
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      uiLocale: state.uiLocale || "es",
    });
  }

  const btnCalcImp = getEl("btnCalculateImposition", targetDoc);
  if (btnCalcImp && typeof btnCalcImp.addEventListener === "function" && !btnCalcImp._printImpBound) {
    btnCalcImp._printImpBound = true;
    btnCalcImp.addEventListener("click", () => {
      state.activePrintPreviewMode = "imposition";
      const curIsEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
      const curOrientation = String(state.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
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
        (curIsEn
          ? `📐 <strong>4n Saddle-Stitch Imposition (${imp.paddedPages} pp · ${imp.sheetCount} sheets · ${imp.rtl ? "RTL Reversed Spine" : "LTR"}):</strong> Constant sum=${imp.folioSumConstant} · Max creep=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`
          : `📐 <strong>Imposición Saddle-Stitch 4n (${imp.paddedPages} págs · ${imp.sheetCount} pliegos · ${imp.rtl ? "RTL Lomo Invertido" : "LTR"}):</strong> Suma constante=${imp.folioSumConstant} · Creep máx=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`);
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
            orientation: curOrientation,
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
      const curIsEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
      const curOrientation = String(state.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
      const budgetCalc = computeKindlePrintBudget({
        fontPt: state.fontSizePt || 9.5,
        columns: state.columns || 2,
        orientation: curOrientation,
        paper: state.paperFormat || "a4",
        uiLocale: state.uiLocale || "es",
      });
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-layout" data-cpl="${budgetCalc.cpl}">` +
        (curIsEn
          ? `📏 <strong>Verified Page Geometry:</strong> ${escapeHtml(budgetCalc.summaryText)}.</div>`
          : `📏 <strong>Márgenes Verificados:</strong> ${escapeHtml(budgetCalc.summaryText)}.</div>`);
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
            orientation: curOrientation,
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
          }" href="${escapeHtml(
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
          state.edition = synced.profileId;
          state.fontSizePt = synced.fontPt;
          state.columns = synced.columns;
          state.paperFormat = synced.paper;
          state.orientation = synced.orientation;
          state.foliationMode = synced.foliationMode;
          if (ctx.store) {
            updatePrintConfig(ctx.store, {
              edition: synced.profileId,
              fontSizePt: synced.fontPt,
              columns: synced.columns,
              paperFormat: synced.paper,
              orientation: synced.orientation,
              foliationMode: synced.foliationMode,
            });
          }
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
              const brfFilename = resolveSafeDownloadFilename(state, { kind: "braille_brf", blockNumber: stealthBlkNum });
              cardEl.setAttribute?.("data-brf-href", resolvedBrfHref);
              cardEl.setAttribute?.("data-brf-download", brfFilename);
              if (resolvedBrfHref && typeof targetDoc?.createElement === "function") {
                try {
                  const brfAnchor = targetDoc.createElement("a");
                  if (brfAnchor) {
                    brfAnchor.href = resolvedBrfHref;
                    brfAnchor.download = brfFilename;
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
                stealthFilename: stealthActive ? resolveSafeDownloadFilename(state, { kind: "paged_media", blockNumber: stealthBlkNum }) : "",
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
              cardEl.setAttribute?.(
                "download",
                resolveSafeDownloadFilename(state, { kind: "edition_pdf", blockNumber: stealthBlkNum, defaultName: `${profId}-${curLang}.pdf` }),
              );
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
                stealthFilename: stealthActive ? resolveSafeDownloadFilename(state, { kind: "paged_media", blockNumber: stealthBlkNum }) : "",
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
        // Non-fatal
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
      // Non-fatal fallback
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
