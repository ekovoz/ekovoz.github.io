// ============================================================================
// web/mostrador/drawer_print.js — Gaveta 2 (Imprimir, 14+2 Ediciones PDF, Imposición 4n & Fotocopia Sauvola)
// Slimmed LCOM4 module (D1-R2, D4-R2, D5-R2, D6-R2): delegates social/photocopy
// cards to social_and_photocopy_cards.js, unified printConfig & direct 14+2 +
// Grambank wiring to print_config_projector.js, and stealth naming to stealth_filename.js.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  buildRelativePdfAssetUrl,
  CANONICAL_12_BRANCH_PROFILES,
  CANONICAL_16_MACRO_TANDAS,
  CANONICAL_16_TYPOLOGY_PROFILES,
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
  resolveMacroTandaForBlock,
  resolveRegionalPrintDefaults,
  simulateThirdGenPhotocopySauvola,
  syncDose2AndDose3LinksForActiveLang,
} from "./dosis.js";
import { buildCssPagedMediaPrintHtml } from "./bimodal_tanda_print.js";
import { computeSaddleStitchImpositionPlan } from "./optical_lt.js";
import {
  buildEditionRenderSpecBytes16,
  resolveNumericEditionId,
  transduceTextToBrailleBrfAndUnicode,
} from "./dosis_editions_catalog.js";
import { bindSurfaceActions, patchStoreState } from "./dom_patch.js";
import { isRtlLocale } from "./i18n.js";
import { mountOfflineFontNoticeWithLocalImporter } from "./offline_font_bundle.js";
import { decodeRfc8878RawZstdFrameJs } from "./offline_mesh.js";
import {
  applyGrambankTypologyToPrint,
  ensureDirectEditionsAndGrambankControls,
  filterBookEntriesRange,
  flattenLoadedBookChapters,
  resolveDefaultTypologyForLang,
  resolveEditionSubstrateForProfile,
  resolveGrambankTypologyPrintPreset,
} from "./print_config_projector.js";
import {
  bindImpositionAndLayoutButtons,
  bindPagedMediaPrintButton,
  buildEditionCatalogCardHtml,
  handleCatalogEditionCardClick,
  mountOrUpdatePrintActiveWorkBanner,
  normalizeStandardPaperFormat,
  renderCompactTypologySelectorHtml,
  renderDuplexAssistantCardHtml,
  renderFieldRefugeAndChecklistHtml,
  renderStationeryPostcardHtml,
  renderUnifiedBraillePreviewHtml,
  resolveDuplexFlipEdge,
  resolveUnifiedSauvolaState,
  revokeObjectUrlSafe,
  storeWorkerTandaPdfResult,
} from "./print_work_and_photocopy.js";
import { resolveWorkDrawerAdapter } from "./projection_contract.js";
import {
  buildOpenGraphSocialCardSvg1200x630,
  formatPhotocopySimBadgeText,
  renderEditorialGraphicsAndPrintSpecsCard,
  renderPhotocopyResilienceAndSocialCardHtml,
  simulateKanungoSauvolaGeneration,
} from "./social_and_photocopy_cards.js";
import { isStealthFilenameActive, resolveSafeDownloadFilename } from "./stealth_filename.js";
import {
  bindDose2And3LazySynthLinks,
  bindNaturalStagePresetsInDrawer,
  collectBlockAndTandaVerses,
  executeDose2And3WorkerDispatch,
} from "./print_guide_and_progress.js";
import { mountSlotView } from "./surface_compositor.js";
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

export function renderPrintDrawerPanelsSyncInDrawer(ctx = {}) {
  const { state, targetDoc, getEl, hydratePrintDrawerPanels } = ctx;
  mountOrUpdatePrintActiveWorkBanner(getEl("biblePrintEditionsSheet", targetDoc), targetDoc, state);
  const liveBlock = resolveCanonicalBlockCode(state.book, state.chapter, state.verse);
  const passageKey = `${state.book}.${state.chapter}`;
  if (state.activeBlockPassageKey !== passageKey) {
    state.activeBlockPassageKey = passageKey;
    state.activeBlockNumber = liveBlock.blockNumber || 1;
  }
  syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
  bindDose2And3LazySynthLinks({
    state,
    targetDoc,
    getEl,
    planSequential16MacroTandasGeneration,
    isRtlLocale,
    hydratePrintDrawerPanels,
  });
  bindNaturalStagePresetsInDrawer({ state, targetDoc, getEl, hydratePrintDrawerPanels });

  const stealthActive = isStealthFilenameActive(state);
  const stealthBlkNum = Number(state.activeBlockNumber) || liveBlock.blockNumber || 1;
  const chkStealth = getEl("chkStealthPackMode", targetDoc);
  if (chkStealth) {
    chkStealth.checked = Boolean(state.stealthMode);
    chkStealth.setAttribute?.("data-action", "toggle-stealth-mode");
    bindSurfaceActions(chkStealth, {
      "toggle-stealth-mode": (ev) => {
        const nextStealth = Boolean(ev?.target?.checked ?? chkStealth.checked);
        patchStoreState(ctx, { stealthMode: nextStealth }, "stealth");
        targetDoc?.documentElement?.setAttribute?.("data-stealth-mode", nextStealth ? "true" : "false");
        renderPrintDrawerPanelsSyncInDrawer(ctx);
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

  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const regionalDefaults = resolveRegionalPrintDefaults(state.countryIso2 || "MX", {
    lang: state.lang,
    uiLocale: state.uiLocale || "es",
  });
  const effectivePaper = state.paperFormat || regionalDefaults.paperFormat || regionalDefaults.paper || paperForRegion(state.countryIso2 || "MX");
  const effectiveEdition = state.edition || regionalDefaults.edition || chooseEdition(["2col-a4", "2col-letter"], effectivePaper);
  const activeOrientation = String(state.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
  state.orientation = activeOrientation;
  const activeFontPt = Number(state.fontSizePt) || 9.5;
  state.fontSizePt = activeFontPt;
  const fontSliderEl = getEl("kindleFontSizeSlider", targetDoc);
  if (fontSliderEl) fontSliderEl.value = String(activeFontPt);
  const fontValEl = getEl("kindleFontSizeValue", targetDoc);
  if (fontValEl) fontValEl.textContent = `${activeFontPt.toFixed(1)} pt`;
  const paperSelEl = getEl("kindlePaperFormatSelector", targetDoc);
  if (paperSelEl) paperSelEl.value = effectivePaper;
  const orientSel = getEl("kindleOrientationSelector", targetDoc);
  if (orientSel) orientSel.value = activeOrientation;

  const btnQuickBraille = getEl("btnQuickBrailleB70", targetDoc);
  if (btnQuickBraille) {
    const isBrailleOn = effectivePaper === "b70" || state.activePrintProfileId === "11_braille_nemeth_b70" || Boolean(state.brailleNemethEnabled);
    btnQuickBraille.setAttribute?.("aria-pressed", isBrailleOn ? "true" : "false");
    btnQuickBraille.setAttribute?.("data-action", "quick-braille-b70");
    bindSurfaceActions(
      btnQuickBraille,
      {
        "quick-braille-b70": () => {
          const turningOn = !(state.paperFormat === "b70" || state.activePrintProfileId === "11_braille_nemeth_b70");
          if (turningOn) {
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
        },
      },
      { scope: "quick-braille-b70", events: ["click"] },
    );
  }
  const budget = computeKindlePrintBudget({
    fontPt: activeFontPt,
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

  const workAdapter = resolveWorkDrawerAdapter(state);
  const printSheetEl = getEl("biblePrintEditionsSheet", targetDoc);
  if (printSheetEl && typeof printSheetEl.setAttribute === "function") {
    printSheetEl.setAttribute("data-work-print-mode", workAdapter.printMode || "bible_editions");
  }

  ensureDirectEditionsAndGrambankControls({
    ...ctx,
    onConfigChanged: () => renderPrintDrawerPanelsSyncInDrawer(ctx),
  });

  const flipEdgeInfo = resolveDuplexFlipEdge(
    activeOrientation,
    state.foliationMode || "saddle_stitch",
    state.uiLocale || "es",
  );
  const duplexToggleEl = getEl("kindleDuplexToggle", targetDoc);
  if (duplexToggleEl && typeof duplexToggleEl.setAttribute === "function") {
    duplexToggleEl.setAttribute("data-flip-edge", flipEdgeInfo.edge);
  }
  const duplexLabelTextEl = getEl("kindleDuplexLabelText", targetDoc);
  if (duplexLabelTextEl) {
    duplexLabelTextEl.textContent = flipEdgeInfo.toggleLabel;
  }

  const typologyHost = getEl("printTypologyBridgeHost", targetDoc);
  if (typologyHost) {
    const defaultTypo = resolveDefaultTypologyForLang(state.effectiveCorpusLang || state.lang || "es");
    const activeBranchId = state.activeBranchId || defaultTypo.branchId;
    const activeTypoId = state.activeTypologyId || defaultTypo.typologyId;
    mountSlotView(typologyHost, {
      html: renderCompactTypologySelectorHtml({
        branches: state.editorialProfiles?.branch_profiles_12 || CANONICAL_12_BRANCH_PROFILES,
        typologies: state.editorialProfiles?.typology_profiles_16 || CANONICAL_16_TYPOLOGY_PROFILES,
        activeBranchId,
        activeTypologyId: activeTypoId,
        uiLocale: state.uiLocale || "es",
      }),
      ownerId: "drawer_print:imposition:typology",
      orderIndex: 1,
    });
    const branchSel = getEl("printBranchProfileSelect", targetDoc);
    const typoSel = getEl("printTypologyProfileSelect", targetDoc);
    const onTypoChange = async () => {
      const nextBranch = String(branchSel?.value || activeBranchId);
      const nextTypo = String(typoSel?.value || activeTypoId);
      await applyGrambankTypologyToPrint(ctx, nextBranch, nextTypo, { triggerJob: false });
      renderPrintDrawerPanelsSyncInDrawer(ctx);
    };
    if (branchSel && typeof branchSel.addEventListener === "function" && !branchSel._printTypoBound) {
      branchSel._printTypoBound = true;
      branchSel.addEventListener("change", onTypoChange);
    }
    if (typoSel && typeof typoSel.addEventListener === "function" && !typoSel._printTypoBound) {
      typoSel._printTypoBound = true;
      typoSel.addEventListener("change", onTypoChange);
    }
  }

  const fieldPdfsHost = getEl("printFieldPdfsHost", targetDoc);
  if (fieldPdfsHost) {
    mountSlotView(fieldPdfsHost, {
      html: renderFieldRefugeAndChecklistHtml(state.editorialProfiles || null, state.uiLocale || "es"),
      ownerId: "drawer_print:doses:field_pdfs",
      orderIndex: 2,
    });
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
    const nemethChecked = Boolean(state.brailleNemethEnabled || slug === "11_braille_nemeth_b70");
    const activeVerseSample =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "En el principio creó Dios los cielos y la tierra.";
    const brfResult = transduceTextToBrailleBrfAndUnicode(
      `${state.book || "GEN"} ${Number(state.chapter) || 1}:${Number(state.verse) || 1} ${activeVerseSample}`,
      { nemethMath: nemethChecked },
    );
    duplexPanel.innerHTML = renderDuplexAssistantCardHtml({
      slug,
      duplex: Boolean(state.duplex !== false),
      foliation,
      flipEdgeInfo,
      budgetSummary: budget.summaryText,
      nemethChecked,
      verseRef: `${state.book || "GEN"} ${Number(state.chapter) || 1}:${Number(state.verse) || 1}`,
      unicodeText: brfResult?.unicode || "",
      brfText: brfResult?.brf || "",
      brfHref: `data:text/plain;charset=utf-8,${encodeURIComponent(String(brfResult?.brf || ""))}`,
      brfFilename: resolveSafeDownloadFilename(state, { kind: "braille_brf", blockNumber: stealthBlkNum }),
      multiSigHtml,
      macroTandas16Html,
      isEn,
    });

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
  if (graphicsHost) {
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
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
    const sauvolaInput = getEl("inputSauvolaK", targetDoc);
    if (sauvolaInput && typeof sauvolaInput.addEventListener === "function" && !sauvolaInput._sauvolaKBound) {
      sauvolaInput._sauvolaKBound = true;
      const onSauvolaChange = (ev) => {
        state.sauvolaK = Number(ev?.target?.value) || 0.25;
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
    stationeryPanel.innerHTML = renderStationeryPostcardHtml({
      osis: `${state.book}.${state.chapter}.${state.verse}`,
      refLabel,
      verseText,
      postalHref: `data:text/html;charset=utf-8,${encodeURIComponent(postalHtml)}`,
      postalDownload: resolveSafeDownloadFilename(state, { kind: "postal_a6", blockNumber: stealthBlkNum }),
      isEn,
    });
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

  bindImpositionAndLayoutButtons({
    state,
    targetDoc,
    getEl,
    computeSaddleStitchImpositionPlan,
    computeKindlePrintBudget,
    renderImpositionAndLayoutPreviewHtml,
  });

  const catalogGrid = getEl("bibleEditionsCatalogGrid", targetDoc);
  if (catalogGrid) {
    const activeProfileId = state.activePrintProfileId || "02_2col_pastoral";
    const effectiveLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
    const normPaper = normalizeStandardPaperFormat(effectivePaper);
    const activeBlockCode = `B${String(
      Math.max(1, Math.min(80, Number(state.activeBlockNumber) || liveBlock.blockNumber || 1)),
    ).padStart(2, "0")}`;
    const editions = listAll14PrintEditionsForLang(
      effectiveLang,
      effectiveLang,
      { uiLocale: state.uiLocale || "es", paperFormat: normPaper },
    );
    if (!state.editionObjectUrls || typeof state.editionObjectUrls !== "object") {
      state.editionObjectUrls = {};
    }
    const editionScopeSig = `${effectiveLang}::${state.book || "GEN"}::${state.chapter || 1}::${activeBlockCode}`;
    if (state._editionObjectUrlsScope && state._editionObjectUrlsScope !== editionScopeSig) {
      for (const prevUrl of Object.values(state.editionObjectUrls)) {
        revokeObjectUrlSafe(prevUrl);
      }
      state.editionObjectUrls = {};
    }
    state._editionObjectUrlsScope = editionScopeSig;
    catalogGrid.setAttribute("data-editions-count", String(editions.length));
    catalogGrid.setAttribute("data-active-block-code", activeBlockCode);
    catalogGrid.innerHTML = editions
      .map((ed) =>
        buildEditionCatalogCardHtml(ed, {
          state,
          activeProfileId,
          effectiveLang,
          effectivePaper: normPaper,
          activeBlockCode,
          editionScopeSig,
          isEn,
          buildRelativePdfAssetUrl,
          encodePaperFormatCode,
        }),
      )
      .join("");

    if (typeof catalogGrid.addEventListener === "function" && !catalogGrid._editionsBound) {
      catalogGrid._editionsBound = true;
      catalogGrid.addEventListener("click", async (e) => {
        const cardEl = e?.target?.closest
          ? e.target.closest("[data-profile-id]")
          : e?.target?.getAttribute?.("data-profile-id")
            ? e.target
            : null;
        if (!cardEl) return;
        await handleCatalogEditionCardClick(cardEl, e, {
          state,
          ctx,
          targetDoc,
          getEl,
          isStealthActive: stealthActive,
          stealthBlkNum,
          renderPrintDrawerPanelsSyncInDrawer,
          hydratePrintDrawerPanels,
          ensureDirectEditionsAndGrambankControls,
        });
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
  const workerWrap = getEl("tandaWorkerProgressWrap", targetDoc);
  const workerBar = getEl("tandaWorkerProgress", targetDoc);
  const workerLabel = getEl("tandaWorkerProgressLabel", targetDoc);
  const activePrintSubtab = state.activeSubtabBySheet?.print || state.activeSubtabs?.print || "doses";
  if (activePrintSubtab !== "doses" || ctx.skipSpeculativeWorker === true) {
    workerWrap?.setAttribute?.("hidden", "");
    workerBar?.removeAttribute?.("data-ergos-active-job");
    if (workerLabel) workerLabel.textContent = "";
  }
  const explicitWorkerReq = Boolean(ctx.userRequestedPdfBuild || state.generateFull66BookBible);
  const allowWorkerHydrate = activePrintSubtab === "doses" && (explicitWorkerReq || (typeof globalThis.window === "undefined" && ctx.skipSpeculativeWorker !== true));
  const workerCacheKey = `${effectiveLang}:${state.book || "GEN"}:B${activeBlockNum}:${full66Flag}:${activeCols}:${activeFontPt}:${state.paperFormat || "a4"}`;
  if (
    allowWorkerHydrate &&
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

        const targetMacroPlans =
          state.generateFull66BookBible && Array.isArray(state.fullBible16MacroTandasPlan) && state.fullBible16MacroTandasPlan.length === 16
            ? state.fullBible16MacroTandasPlan
            : [activeMacroTanda];
        const { dose2Payload, tandaVerses } = await collectBlockAndTandaVerses({
          activeBook,
          activeBlockSpec,
          activeBlockNumber: activeBlockNum,
          targetMacroPlans,
          fullBookVerses,
          fetchBookEntries,
          filterBookEntriesRange,
          resolveMacroTandaForBlock,
        });
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
        await executeDose2And3WorkerDispatch({
          state,
          effectiveLang,
          activeBook,
          activeBlockSpec,
          activeMacroTanda,
          targetMacroPlans,
          dose2Payload,
          tandaVerses,
          activeEditionId,
          activeRenderSpec,
          activeCols,
          activeFontPt,
          dir,
          skipDose2Redundant,
          dispatchTandaWorkerJob,
          workerWrap,
          workerBar,
          workerLabel,
          explicitWorkerReq,
          activePrintSubtab,
          mountOfflineFontNoticeWithLocalImporter,
          storeWorkerTandaPdfResult,
          syncDose2AndDose3LinksForActiveLang,
          renderPrintDrawerPanelsSyncInDrawer,
          hydratePrintDrawerPanels: ctx.hydratePrintDrawerPanels,
          ctx,
          targetDoc,
          getEl,
        });
      }
    } catch {
      // Non-fatal fallback
    } finally {
      if (workerLabel) workerLabel.textContent = "";
      workerBar?.removeAttribute?.("data-ergos-active-job");
      workerWrap?.setAttribute?.("hidden", "");
      state.generateFull66BookBible = false;
    }
  } else {
    state.generateFull66BookBible = false;
  }
}

export function revokePrintObjectUrls(targetState) {
  if (!targetState || typeof targetState !== "object") return;
  const revokeIfBlob = (u) => {
    if (typeof u === "string" && u.startsWith("blob:")) {
      try { globalThis.URL?.revokeObjectURL?.(u); } catch {}
    }
  };
  for (const key of ["dose2ObjectUrl", "dose3ObjectUrl"]) {
    revokeIfBlob(targetState[key]);
    targetState[key] = "";
  }
  targetState._dose3Streamed16Of16 = false;
  targetState.dose3LastCompletedTandas = 0;
  for (const mapKey of ["editionObjectUrls", "brfObjectUrls"]) {
    const urlMap = targetState[mapKey];
    if (urlMap && typeof urlMap === "object") {
      Object.values(urlMap).forEach(revokeIfBlob);
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
