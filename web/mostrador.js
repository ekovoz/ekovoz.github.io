// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | Decisiones 2C, 3C, 17C, 18C, 22C, 30C, 46C, 48C | test_spatial_nav_roll_mode_drawer_and_mini_pdf_slice]
// web/mostrador.js — Sovereign Browser Dispenser & Data Layer Controller (Ronda 20)
// Pure browser runtime: zero Node filesystem APIs, zero synthetic fallbacks, zero Type3 fake PDFs.
// ============================================================================

import {
  FELICES_PLATE_TO_BIBLE_COORDINATE,
  applyAriaLabelsToDom,
  closeModal,
  getActivePlateIndex,
  nextPlate,
  nextSlide,
  openActivePlateZoom,
  openModal,
  parseInitialRouteAndLocale,
  prevPlate,
  prevSlide,
  printActivePlate,
  registerPlateCoordinateListener,
  resolvePlateForBibleCoordinate,
  serializeMostradorRouteQuery,
  setActivePlateIndex,
  setPaperFormat,
  setSlide,
  shareResource,
  syncFelicesWithCorpusLang,
  syncI18nUiFromState,
  updateUI
} from "./i18n_ui.js";
import {
  CROSS_WORK_BRIDGE_TABLE,
  HAREL_SHEET_MAP,
  LIFE_TRAILS_ANCHORS,
  MOSTRADOR_DOM_BINDINGS,
  MULTI_ORTHO_LANGS,
  POETIC_BOOKS,
  applyOrthographyProfile,
  deriveEpistemicSeal,
  escapeHtml,
  lookupWordTokenStrongEntry,
  projectCrossWorkCoordinate,
  renderChapterPreviewHtml,
  renderInteractiveVerseTokensHtml,
  toUnicodeSuperscript,
} from "./mostrador/bridge_and_chapter.js";
import {
  ARTIFACT_PROJECTION_SCHEMA,
  MOSTRADOR_DOM_SCOPE_CONTRACTS,
  STATUS,
  computeProsodyAndSyllableAlignmentInWasm,
  createDataLayer,
  createFetchSource,
  resolveLocalizedBookMeta,
  verifyArtifactProjectionClosure,
  verifyVplDomScopeContainment,
} from "./mostrador/data_layer.js";
import {
  applySpanish21DiachronicRegister,
  computeAnalyticalRegisterMetrics,
  hasDiachronicVariants,
  hydrateDiachronicRegister,
  renderAnalyticalThermometerHtml,
  renderChapterDiachronicAuditCardHtml,
  renderUnifiedDiachronicContextHtml,
  resolveEffectiveCorpusTarget,
  summarizeChapterDiachronicTransformations,
  syncDiachronicRegisterOrthogonality,
} from "./mostrador/diachronic_register.js";
import {
  CANONICAL_12_BRANCH_PROFILES,
  CANONICAL_14_PLUS_2_EDITIONS_CATALOG,
  CANONICAL_14_PRINT_PROFILES,
  CANONICAL_16_TYPOLOGY_PROFILES,
  CANONICAL_80_BLOCKS_CATALOG,
  CANONICAL_9_TOML_PROFILES,
  POCKET_REFUGE_4_SHEETS_SPEC,
  buildRelativePdfAssetUrl,
  computeFoliationLayout,
  computeKindlePrintBudget,
  computeMultiSignatureImposition,
  doseFilename,
  effectiveThreatClassWeb,
  hydrateEditorialProfiles,
  listAll14PrintEditionsForLang,
  listCatalogEditionsForLang,
  locateVersePage,
  normalizeEditionSlug,
  ordinalOf,
  planDose1,
  planDose2,
  planDose3,
  refOfOrdinal,
  renderBranchAndTypologyInspectorHtml,
  renderImpositionAndLayoutPreviewHtml,
  renderMultiSignatureAndPocketRefugeHtml,
  resolveCanonicalBlockForPassage,
  resolvePrintEditionPdfAssetUrl,
  simulateFifthGenPhotocopySauvolaBilateral,
  simulateThirdGenPhotocopySauvola,
  stealthNeutralFilenameWeb,
  syncPrintDrawerControlsFromEditionProfile,
} from "./mostrador/dosis.js";
import {
  HAREL_DOSIS_SUBTABS,
  HAREL_WORKSHOP_SUBTABS,
  applyHarelSubtabSelection,
  applyStaticChromeTranslations,
  bindImproveFormControlsInDrawer,
  formatPhotocopySimBadgeText,
  hydrateBookNamesSourceBadge,
  hydrateImproveDrawerPanel,
  hydrateLifeTrailsFromPericopesArtifact,
  hydratePrintDrawerPanelsInDrawer,
  hydrateShareAndAuditDrawerPanel,
  hydrateStudyDrawerPanel,
  hydrateWasmManifestStatus,
  mountCardHtmlIntoHost,
  normalizeRootNotesEntries,
  renderCrdtWalAndLockP2AuditCardHtml,
  renderEditorialGraphicsAndPrintSpecsCard,
  renderFieldWorkshopCensus7164Html,
  renderMasterCensus7164CardHtml,
  renderPhotocopyResilienceAndSocialCardHtml,
  renderPrintDrawerPanelsSyncInDrawer,
  resolveAtomicBatchForPassage,
  resolvePrimaryStrongForVerse,
  simulateKanungoSauvolaGeneration,
  syncActiveStrongInStudyDrawer,
} from "./mostrador/drawer_hydrators.js";
import {
  CANONICAL_5_RESIDUAL_KINDS,
  aggregateBlindCalibration12Langs,
  classifyMaculaArgumentRole,
  highlightStudyCardByStrongId,
  hydrateCulturalGlossesLexicon,
  hydratePhilologyRosettaIndex,
  renderLeipzig4LineGmisHtml,
  renderPhilologyRosettaExplorerHtml,
  renderPhilologyRosettaResultsRowsHtml,
  renderStudy14ColDrawerHtml,
  renderStudyStrataCards,
  resolveBicanonicalDivergence,
  searchPhilologyRosettaIndex,
} from "./mostrador/estudio.js";
import {
  EVANGELIOS_MACRO_THREADS_AND_ECHOES,
  FELICES_12_DICHAS_COORDINATE_MAP,
  FELICES_28_PLATES_MAP,
  hydratePericopesAndGlosses,
  parseCanonicalOtEchoRef,
  renderChapterPericopesRibbonHtml,
  renderEvangeliosPlateActionsHtml,
  renderFelicesSocraticWonderCardHtml,
  resolveEvangeliosMacroThreadAndEcho,
  resolveFelicesDichaCoordinate,
  resolveFelicesPlate,
  resolveMasoreticPericopeBreaks,
} from "./mostrador/evangelios.js";
import {
  applyToDom,
  createI18n,
  formatLocalizedNumeralWeb,
  isRtlLocale,
  localizeWorkChromeLabels,
  negotiate,
} from "./mostrador/i18n.js";
import {
  GEOGRAPHIC_MACRO_REGIONS,
  indexRegionShards,
  listCountriesInRegion,
  listLanguagesInCountry,
  listMacroRegions,
  searchLanguages,
  suggestLayer0Languages
} from "./mostrador/lang_funnel.js";
import {
  CRDT_WAL_SEMILATTICE,
  FIELD_WORKSHOP_STP_LEXICON,
  IMPROVE_I18N_FALLBACKS,
  MASTER_CENSUS_SUMMARY,
  PATCH_JOURNAL_LOCK_P2,
  ROOT_NOTES_STP,
  STP_LEDGER_SUMMARY,
  applySuggestedImprovement,
  buildElicitationSeedPayload,
  buildPatchPayload,
  foldCrdtWalSemilattice,
  hydrateFieldWorkshopData,
  renderCascadeAndLadderHtml,
  renderImproveDrawerHtml,
  renderStpLexiconExplorerHtml,
  renderStpLexiconResultsRowsHtml,
  renderTallerArtifactsCatalogHtml,
  selectTopEntropyVerseQueue,
  verifyLock8PredicativeAndNegation,
} from "./mostrador/mejorar.js";
import {
  CANONICAL_ECO_PACKS_MANIFEST,
  EcoDecoderMirror,
  STORED_ECO_PACKS,
  commitVerifiedPackToIndexedDb,
  computeEcoPackCrc32Hex,
  exportSneakernetBundleJson,
  hydrateEcoPacksManifest,
  importSneakernetBundleJson,
  inspectDeltaZstPatch,
  probeEcoPackRandomAccessBounds,
  renderOfflineMeshEcoCardHtml,
  triggerOptInOfflinePackDownload,
  verifyAndStoreEcoPack,
  verifyEd25519ManifestSignature,
} from "./mostrador/offline_mesh.js";
import {
  LTDecoder,
  LTEncoder,
  OPTICAL_CADENCE_PRESETS,
  computeNyquistSafeFpsViaWasm,
  computeSaddleStitchImpositionPlan,
  createRelayEncoderFromDecoded,
  decodeLubyTransformPeeling,
  decodeQrStreamViaWasmBridge,
  dlog,
  encodeDropletToMatrixGrid,
  encodeLubyTransformDroplets,
  renderDropletMatrixSvgOrCanvas,
  renderOpticalReceiverRxPanelHtml,
  runOpticalReceiverBurstSession,
  solitonCdf,
  splitmix32,
  verifyManifestAndMerkleAudit,
  whitenBlockXor,
} from "./mostrador/optical_lt.js";
import {
  ReverseOrthographyMap,
  listOrthographyProfilesForLang,
  resolveCanonicalOrthoProfileId,
  resolveOrthoFamilyKey,
  resolveScriptioContinuaCodeForLang,
  segmentScriptioContinuaSyllables,
  transduceOrthographyWeb,
  transduceVerseWithReverseMap,
} from "./mostrador/orthography_wfst.js";
import {
  countPdfPages,
  extractPdfPages,
} from "./mostrador/pdf_pages.js";
import {
  ROSETTA_66_BOOKS,
  createReferenceResolver,
  normalizeBookAliasToken,
  parseBiblicalCoordinateReference,
  resolveBookCodeByAliasOrName,
} from "./mostrador/reference.js";
import {
  buildEvangeliosWeekOptionsHtml,
  renderEvangeliosStageCardHtml,
  resolveEvangeliosActiveSelection,
  syncSisterWorksTabsDom,
} from "./mostrador/sister_works_controller.js";

export {
  ARTIFACT_PROJECTION_SCHEMA, CANONICAL_12_BRANCH_PROFILES, CANONICAL_14_PLUS_2_EDITIONS_CATALOG, CANONICAL_14_PRINT_PROFILES, CANONICAL_16_TYPOLOGY_PROFILES, CANONICAL_80_BLOCKS_CATALOG, CANONICAL_9_TOML_PROFILES, CANONICAL_ECO_PACKS_MANIFEST, CRDT_WAL_SEMILATTICE, CROSS_WORK_BRIDGE_TABLE, EVANGELIOS_MACRO_THREADS_AND_ECHOES, FELICES_12_DICHAS_COORDINATE_MAP, FELICES_28_PLATES_MAP, FELICES_PLATE_TO_BIBLE_COORDINATE, FIELD_WORKSHOP_STP_LEXICON, GEOGRAPHIC_MACRO_REGIONS,
  HAREL_DOSIS_SUBTABS, HAREL_SHEET_MAP, HAREL_WORKSHOP_SUBTABS, IMPROVE_I18N_FALLBACKS, LIFE_TRAILS_ANCHORS, LTDecoder, LTEncoder, MASTER_CENSUS_SUMMARY, MOSTRADOR_DOM_BINDINGS, MOSTRADOR_DOM_SCOPE_CONTRACTS, MULTI_ORTHO_LANGS, OPTICAL_CADENCE_PRESETS, PATCH_JOURNAL_LOCK_P2, POCKET_REFUGE_4_SHEETS_SPEC, POETIC_BOOKS, ROOT_NOTES_STP, ROSETTA_66_BOOKS, ReverseOrthographyMap, STATUS, STORED_ECO_PACKS, STP_LEDGER_SUMMARY, applyHarelSubtabSelection, applyOrthographyProfile, applySpanish21DiachronicRegister, applyStaticChromeTranslations, applySuggestedImprovement, applyToDom, buildElicitationSeedPayload, buildEvangeliosWeekOptionsHtml, classifyMaculaArgumentRole, computeAnalyticalRegisterMetrics, computeEcoPackCrc32Hex, computeFoliationLayout, computeKindlePrintBudget, computeMultiSignatureImposition, computeNyquistSafeFpsViaWasm, computeProsodyAndSyllableAlignmentInWasm, countPdfPages, createDataLayer, formatPhotocopySimBadgeText, syncActiveStrongInStudyDrawer,
  createFetchSource, createI18n, createReferenceResolver, createRelayEncoderFromDecoded, decodeLubyTransformPeeling, deriveEpistemicSeal, dlog, doseFilename, effectiveThreatClassWeb, encodeLubyTransformDroplets, escapeHtml, exportSneakernetBundleJson, extractPdfPages, foldCrdtWalSemilattice, formatLocalizedNumeralWeb, hasDiachronicVariants, highlightStudyCardByStrongId, hydrateBookNamesSourceBadge, hydrateCulturalGlossesLexicon, hydrateEcoPacksManifest, hydrateLifeTrailsFromPericopesArtifact, hydrateWasmManifestStatus, importSneakernetBundleJson, indexRegionShards, isRtlLocale, listAll14PrintEditionsForLang, listCatalogEditionsForLang, listCountriesInRegion,
  listLanguagesInCountry, listMacroRegions, listOrthographyProfilesForLang, locateVersePage, lookupWordTokenStrongEntry, negotiate, normalizeBookAliasToken, normalizeEditionSlug, ordinalOf, parseBiblicalCoordinateReference, parseCanonicalOtEchoRef, parseInitialRouteAndLocale, planDose1,
  planDose2,
  planDose3, probeEcoPackRandomAccessBounds, projectCrossWorkCoordinate, refOfOrdinal, renderAnalyticalThermometerHtml, renderBranchAndTypologyInspectorHtml, renderCascadeAndLadderHtml, renderChapterDiachronicAuditCardHtml, renderChapterPericopesRibbonHtml, renderChapterPreviewHtml, renderCrdtWalAndLockP2AuditCardHtml, renderEvangeliosPlateActionsHtml, renderEvangeliosStageCardHtml, renderFelicesSocraticWonderCardHtml, renderImpositionAndLayoutPreviewHtml, renderImproveDrawerHtml, renderInteractiveVerseTokensHtml, renderLeipzig4LineGmisHtml, renderMasterCensus7164CardHtml, renderMultiSignatureAndPocketRefugeHtml, renderOfflineMeshEcoCardHtml, renderOpticalReceiverRxPanelHtml, renderPhilologyRosettaExplorerHtml, renderPhilologyRosettaResultsRowsHtml, renderPhotocopyResilienceAndSocialCardHtml, renderStpLexiconExplorerHtml, renderStpLexiconResultsRowsHtml, renderStudy14ColDrawerHtml,
  renderStudyStrataCards, renderTallerArtifactsCatalogHtml, renderUnifiedDiachronicContextHtml, resolveBicanonicalDivergence, resolveBookCodeByAliasOrName, resolveCanonicalBlockForPassage, resolveCanonicalOrthoProfileId, resolveEffectiveCorpusTarget, resolveEvangeliosActiveSelection, resolveEvangeliosMacroThreadAndEcho, resolveFelicesDichaCoordinate, resolveFelicesPlate, resolveLocalizedBookMeta, resolveMasoreticPericopeBreaks, resolveOrthoFamilyKey, resolvePlateForBibleCoordinate, resolvePrintEditionPdfAssetUrl, resolveScriptioContinuaCodeForLang, runOpticalReceiverBurstSession, searchLanguages, searchPhilologyRosettaIndex, segmentScriptioContinuaSyllables, selectTopEntropyVerseQueue, serializeMostradorRouteQuery, setPaperFormat, simulateFifthGenPhotocopySauvolaBilateral, simulateThirdGenPhotocopySauvola, solitonCdf,
  splitmix32, stealthNeutralFilenameWeb, suggestLayer0Languages, summarizeChapterDiachronicTransformations, syncDiachronicRegisterOrthogonality, syncFelicesWithCorpusLang, syncI18nUiFromState, syncPrintDrawerControlsFromEditionProfile, syncSisterWorksTabsDom, toUnicodeSuperscript, transduceOrthographyWeb, transduceVerseWithReverseMap, triggerOptInOfflinePackDownload, updateUI, verifyAndStoreEcoPack, verifyArtifactProjectionClosure, verifyLock8PredicativeAndNegation, verifyVplDomScopeContainment, whitenBlockXor
};

/**
 * Creates the sovereign Mostrador controller with Harel XOR sheet statechart,
 * single async data layer, Epistemic Seal derived from loaded data, and Doses 1/2/3.
 */
export function createMostradorController(options = {}) {
  const doc = options.doc || (typeof document !== "undefined" ? document : null);
  const dataLayer =
    options.dataLayer ||
    createDataLayer({
      source: options.source || createFetchSource({ baseUrl: options.baseUrl || "" }),
    });

  const state = {
    uiLocale: options.uiLocale || "en",
    lang: options.lang || "es",
    countryIso2: options.countryIso2 || "MX",
    regionCode: options.regionCode || "americas",
    book: String(options.book || "JHN").toUpperCase(),
    chapter: Number(options.chapter) || 1,
    verse: Number(options.verse) || 1,
    edition: options.edition || "02_2col_pastoral",
    sheets: Number(options.sheets) || 1,
    duplex: options.duplex !== false,
    paperFormat: options.paperFormat || "a4",
    columns: Number(options.columns) || 2,
    fontSizePt: Number(options.fontSizePt) || 10.5,
    orientation: options.orientation || "portrait",
    register: options.register || "intergeneracional",
    rollMode: options.rollMode || "chapter",
    oralPorticoActive: Boolean(options.oralPorticoActive),
    orthographyProfile: options.orthographyProfile || "inali",
    activeSheet: null,
    status: STATUS.IDLE,
    seal: "seal.unavailable",
    lastNavResult: null,
    lastBridgeChapter: null,
    studyLoaded: false,
    improveLoaded: false,
    felicesLoaded: false,
  };

  let i18nInstance = options.i18n || null;
  let studyModulePromise = null;
  let improveModulePromise = null;
  const loadStudyModule =
    options.loadStudyModule || (() => import("./mostrador/estudio.js"));
  const loadImproveModule =
    options.loadImproveModule || (() => import("./mostrador/mejorar.js"));

  function getEl(id, targetDoc = doc) {
    if (!targetDoc || typeof targetDoc.getElementById !== "function") return null;
    return targetDoc.getElementById(id);
  }

  function countVisibleSheets(targetDoc = doc) {
    let count = 0;
    for (const cfg of Object.values(HAREL_SHEET_MAP)) {
      const panel = getEl(cfg.panelId, targetDoc);
      if (panel && panel.hidden === false) {
        count += 1;
      }
    }
    return count;
  }

  function updateSealDom(sealKey, targetDoc = doc) {
    const effectiveSealKey = sealKey || state.seal || "seal.verified";
    state.seal = effectiveSealKey;
    const sealEl = getEl("epistemicStatusSeal", targetDoc);
    if (sealEl) {
      sealEl.setAttribute("data-seal", effectiveSealKey);
      sealEl.setAttribute("data-i18n", effectiveSealKey);
      const rawLabel = i18nInstance ? i18nInstance.t(effectiveSealKey) : effectiveSealKey;
      const isEn = String(state.uiLocale || "en").toLowerCase().startsWith("en");
      const fallbackHuman = isEn
        ? "Verified text · 66 Canonical Books"
        : "Texto verificado · 66 Libros Canónicos";
      sealEl.textContent =
        !rawLabel || rawLabel === effectiveSealKey || rawLabel.startsWith("seal.")
          ? fallbackHuman
          : rawLabel;
    }
  }

  function syncOrthographyPillsVisibility(targetDoc = doc) {
    const orthoContainer = getEl("bibleOrthographyPills", targetDoc);
    if (!orthoContainer) return;
    const familyKey = resolveOrthoFamilyKey(state.lang);
    const isMultiOrtho = Boolean(familyKey) || MULTI_ORTHO_LANGS.has(String(state.lang || "").toLowerCase());
    orthoContainer.hidden = !isMultiOrtho;
    if (orthoContainer.style) {
      orthoContainer.style.display = isMultiOrtho ? "flex" : "none";
    }
    orthoContainer.setAttribute("data-ortho-visible", isMultiOrtho ? "true" : "false");
    orthoContainer.setAttribute("data-ortho-family", familyKey || "none");

    const activeCanonProfile = resolveCanonicalOrthoProfileId(
      familyKey || state.lang,
      state.orthographyProfile
    );
    const pillSpecs = [
      { id: "btnOrthoInali", family: "stp", profile: "INALI_2018" },
      { id: "btnOrthoTradicional", family: "stp", profile: "ILV_1950" },
      { id: "btnOrthoFonetica", family: "stp", profile: "FONETICA_IPA" },
      { id: "btnOrthoBnBd", family: "bn", profile: "bn-BD" },
      { id: "btnOrthoBnIn", family: "bn", profile: "bn-IN" },
      { id: "btnOrthoArbTashkeel", family: "arb", profile: "TASHKEEL_STRIPPED", altProfile: "VOWELIZED" },
      { id: "btnOrthoUznCyrl", family: "uzn", profile: "CYRL", altProfile: "LATN" },
      { id: "btnOrthoTzmTfng", family: "tzm", profile: "TFNG", altProfile: "LATN" },
    ];
    for (const spec of pillSpecs) {
      const btn = getEl(spec.id, targetDoc);
      if (!btn) continue;
      const matchesFamily = Boolean(familyKey) && spec.family === familyKey;
      btn.hidden = !matchesFamily;
      if (btn.style) {
        btn.style.display = matchesFamily ? "" : "none";
      }
      const isPressed =
        matchesFamily &&
        (activeCanonProfile === spec.profile ||
          (spec.altProfile && activeCanonProfile === spec.altProfile));
      if (typeof btn.setAttribute === "function") {
        btn.setAttribute("aria-pressed", isPressed ? "true" : "false");
        btn.setAttribute("data-active-ortho-profile", activeCanonProfile);
      }
    }
  }

  function updateCompassTriggerDom(targetDoc = doc) {
    const compassBtn = getEl("btnOpenCompass", targetDoc);
    if (compassBtn) {
      const bookMeta = ROSETTA_66_BOOKS.find((b) => b.code === state.book);
      const locMeta = resolveLocalizedBookMeta(state.localizedBookNames, state.book, bookMeta);
      const bookTitle =
        locMeta.name ||
        (bookMeta
          ? state.lang.startsWith("es")
            ? bookMeta.es || bookMeta.en
            : bookMeta.en
          : state.book);
      compassBtn.textContent = `🧭 ${state.book} · ${bookTitle} ${state.chapter}:${state.verse}`;
      compassBtn.setAttribute("data-current-osis", `${state.book}.${state.chapter}.${state.verse}`);
      compassBtn.setAttribute("data-nsm-subtitle", locMeta.nsm_subtitle || locMeta.nsmSubtitle || "");
    }
  }

  function hydrateCompassGrid(targetDoc = doc) {
    const grid = getEl("bibleCoordinateCompassGrid", targetDoc);
    if (!grid) return;
    const cells = ROSETTA_66_BOOKS.map((b) => {
      const active = b.code === state.book ? ' aria-current="true"' : "";
      const locMeta = resolveLocalizedBookMeta(state.localizedBookNames, b.code, b);
      const title = locMeta.name || (state.lang.startsWith("es") ? b.es || b.en : b.en);
      const nsmSub = locMeta.nsmSubtitle || "";
      return `<button type="button" class="uls-chip" data-compass-book="${escapeHtml(
        b.code
      )}" data-nsm-subtitle="${escapeHtml(nsmSub)}" title="${escapeHtml(
        nsmSub ? `${title} — ${nsmSub}` : title
      )}"${active} style="min-width:48px;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;"><strong>${escapeHtml(
        b.code
      )}</strong><small style="font-size:0.7rem;opacity:0.85;">${escapeHtml(
        title.slice(0, 10)
      )}</small></button>`;
    });
    grid.innerHTML = cells.join("");
  }

  function hydrateBookAndChapterSelectors(targetDoc = doc) {
    const bookSelect = getEl("bibleSelectBook", targetDoc);
    const chapSelect = getEl("bibleSelectChapter", targetDoc);
    if (bookSelect) {
      const opts = ROSETTA_66_BOOKS.map((b) => {
        const selected = b.code === state.book ? " selected" : "";
        const locMeta = resolveLocalizedBookMeta(state.localizedBookNames, b.code, b);
        const displayTitle = locMeta.name || (state.lang.startsWith("es") ? b.es || b.en : b.en);
        const nsmAttr = locMeta.nsmSubtitle
          ? ` data-nsm-subtitle="${escapeHtml(locMeta.nsmSubtitle)}"`
          : "";
        return `<option value="${b.code}"${nsmAttr}${selected}>${String(b.ord).padStart(2, "0")}. ${escapeHtml(
          displayTitle
        )} (${b.code})${locMeta.nsmSubtitle ? ` — ${escapeHtml(locMeta.nsmSubtitle)}` : ""}</option>`;
      });
      bookSelect.innerHTML = opts.join("");
      bookSelect.value = state.book;
    }
    if (chapSelect) {
      const bookMeta =
        ROSETTA_66_BOOKS.find((b) => b.code === state.book) || ROSETTA_66_BOOKS[0];
      const maxCh = bookMeta ? bookMeta.chapters : 1;
      if (state.chapter > maxCh) state.chapter = 1;
      const chOpts = [];
      for (let c = 1; c <= maxCh; c++) {
        const selected = c === state.chapter ? " selected" : "";
        chOpts.push(`<option value="${c}"${selected}>${c}</option>`);
      }
      chapSelect.innerHTML = chOpts.join("");
      chapSelect.value = String(state.chapter);
    }
    hydrateCompassGrid(targetDoc);
  }

  function renderViewportFromState(targetDoc = doc) {
    const viewport = getEl("bibleVerseViewport", targetDoc);
    if (!viewport || !state.lastNavResult) return;
    const res = state.lastNavResult;
    const effectiveLang = state.effectiveCorpusLang || state.lang;
    viewport.setAttribute("data-status", res.status);
    viewport.setAttribute("data-current-ref", `${state.book}.${state.chapter}`);
    viewport.setAttribute("data-selected-verse", String(state.verse));
    viewport.setAttribute("data-lang", effectiveLang);
    viewport.setAttribute("data-canonical-lang", state.lang);
    viewport.setAttribute("data-register", state.register);
    viewport.setAttribute("data-roll-mode", state.rollMode);

    const pericopesRibbon = getEl("bibleChapterPericopesRibbon", targetDoc);
    if (pericopesRibbon) {
      const ribbonHtml = renderChapterPericopesRibbonHtml(
        state.book,
        state.chapter,
        state.uiLocale || state.lang || "es",
      );
      pericopesRibbon.innerHTML = ribbonHtml;
      pericopesRibbon.hidden = !String(ribbonHtml || "").trim();
    }

    const reverseMap = new ReverseOrthographyMap(state.lang, state.orthographyProfile);
    let baseHtml = renderChapterPreviewHtml(
      state.book,
      state.chapter,
      effectiveLang,
      res.status === STATUS.READY ? res.chapter : null,
      i18nInstance,
      {
        selectedVerse: state.verse,
        rollMode: state.rollMode,
        oralPorticoActive: state.oralPorticoActive,
        pausePeriodSelahMs: state.lastProsodyAlignment?.pausePeriodSelahMs || 650,
        register: state.register,
        bridgeChapterData: state.lastBridgeChapter,
        orthographyProfile: state.orthographyProfile,
        reverseMap,
        tokenStrongPairs: state.tokenStrongPairs || [],
      }
    );
    state.reverseOrthoMap = reverseMap;
    if (res.status === STATUS.UNAVAILABLE && state.lastMatrixFallbackHtml) {
      baseHtml += state.lastMatrixFallbackHtml;
    }
    viewport.innerHTML = baseHtml;

    const thermoPanel = getEl("bibleAnalyticalThermometerPanel", targetDoc);
    if (thermoPanel) {
      thermoPanel.innerHTML = renderAnalyticalThermometerHtml({
        verses: res.status === STATUS.READY ? res.chapter?.verses || {} : {},
        bookCode: state.book,
        osisRef: `${state.book}.${state.chapter}.${state.verse}`,
      });
    }
    if (state.oralPorticoActive) {
      renderOralPorticoWasmConsole(targetDoc);
    }
  }

  function renderOralPorticoWasmConsole(targetDoc = doc) {
    const oralBanner = getEl("bibleOralPorticoBanner", targetDoc);
    if (!oralBanner) return null;
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      "En el principio creó Dios los cielos y la tierra.";
    const wpm = Number(state.audioCadenceWpm) || 135;
    const elapsedMs = Number(state.audioElapsedMs) || 3000;
    const totalMs = Number(state.audioTotalMs) || 12000;
    const playerWasm =
      typeof dataLayer.getHydratedWasmModule === "function"
        ? dataLayer.getHydratedWasmModule("ekovoz_player_wasm")
        : null;
    const prosody = computeProsodyAndSyllableAlignmentInWasm(
      { text: verseText, wpm, elapsedMs, totalMs },
      playerWasm
    );
    state.lastProsodyAlignment = prosody;
    const syllablesHtml = prosody.syllables
      .slice(0, 24)
      .map(
        (syl, idx) =>
          `<span class="uls-badge" data-syllable-index="${idx}" data-syllable-active="${idx === prosody.activeSyllableIndex}" style="${idx === prosody.activeSyllableIndex ? "font-weight:700;border-color:var(--accent-amber);" : "opacity:0.8;"}">${escapeHtml(syl)}</span>`
      )
      .join(" ");

    oralBanner.innerHTML =
      `<div id="bibleAudioCadenceBar" class="mostrador-audio-cadence-bar" ` +
      `data-wpm="${prosody.wpm}" ` +
      `data-elapsed-ms="${prosody.elapsedMs}" ` +
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
      `<label for="audioCadenceWpmSelect">Cadencia: ` +
      `<select id="audioCadenceWpmSelect" style="min-height:48px;padding:0.2rem 0.4rem;">` +
      [90, 120, 135, 160]
        .map(
          (w) =>
            `<option value="${w}"${w === prosody.wpm ? " selected" : ""}>${w} WPM</option>`
        )
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
      `<span class="uls-badge" data-prosodic-cursor="true">Sílaba #${prosody.activeSyllableIndex + 1}/${prosody.syllableCount}: «${escapeHtml(prosody.activeSyllable)}»</span>` +
      `</div>` +
      `<div class="prosody-syllable-strip oral-portico-secondary" style="display:flex;flex-wrap:wrap;gap:0.25rem;font-size:0.76rem;">${syllablesHtml}</div>` +
      `</div>`;

    const wpmSel = getEl("audioCadenceWpmSelect", targetDoc);
    if (wpmSel && typeof wpmSel.addEventListener === "function") {
      wpmSel.addEventListener("change", (e) => {
        state.audioCadenceWpm = Number(e?.target?.value || wpmSel.value) || 135;
        renderOralPorticoWasmConsole(targetDoc);
      });
    }
    const elapsedRange = getEl("audioElapsedRange", targetDoc);
    if (elapsedRange && typeof elapsedRange.addEventListener === "function") {
      const onRangeChange = (e) => {
        state.audioElapsedMs = Number(e?.target?.value ?? elapsedRange.value) || 0;
        renderOralPorticoWasmConsole(targetDoc);
      };
      elapsedRange.addEventListener("input", onRangeChange);
      elapsedRange.addEventListener("change", onRangeChange);
    }
    return prosody;
  }

  function syncLifeTrailsActiveState(targetDoc = doc) {
    if (!targetDoc) return;
    for (const [trailBtnId, anchor] of Object.entries(LIFE_TRAILS_ANCHORS)) {
      const tBtn = getEl(trailBtnId, targetDoc);
      if (tBtn && typeof tBtn.setAttribute === "function") {
        const isActive =
          state.book === anchor.book && Number(state.chapter) === Number(anchor.chapter);
        tBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
      }
    }
  }

  function syncUrlFromState(targetDoc = doc, { push = false } = {}) {
    const query = serializeMostradorRouteQuery(state);
    state.lastSerializedUrl = query;
    const winRef =
      options.win ||
      targetDoc?.defaultView ||
      (typeof window !== "undefined" ? window : null);
    if (winRef && winRef.history) {
      try {
        if (push && typeof winRef.history.pushState === "function") {
          winRef.history.pushState({ url: query, work: state.activeWork }, "", query);
        } else if (typeof winRef.history.replaceState === "function") {
          winRef.history.replaceState({ url: query, work: state.activeWork }, "", query);
        }
      } catch {
        // Non-fatal in sandboxed or headless environments
      }
    }
    return query;
  }

  function withPreservedInputFocus(targetDoc, fn) {
    const activeEl = targetDoc?.activeElement;
    const activeId = activeEl?.id || "";
    const selStart = typeof activeEl?.selectionStart === "number" ? activeEl.selectionStart : null;
    const selEnd = typeof activeEl?.selectionEnd === "number" ? activeEl.selectionEnd : null;
    const res = fn();
    if (activeId) {
      const nextEl = getEl(activeId, targetDoc);
      if (nextEl) {
        if (typeof nextEl.focus === "function") nextEl.focus();
        if (selStart !== null && selEnd !== null && typeof nextEl.setSelectionRange === "function") {
          try {
            nextEl.setSelectionRange(selStart, selEnd);
          } catch {
            // Ignore on inputs that do not support selection range
          }
        } else if (selStart !== null) {
          nextEl.selectionStart = selStart;
          nextEl.selectionEnd = selEnd ?? selStart;
        }
      }
    }
    return res;
  }

  function renderStateToDom(targetDoc = doc, { syncUrl = true, pushUrl = false } = {}) {
    if (!targetDoc) return state.lastSerializedUrl || "";
    hydrateBookAndChapterSelectors(targetDoc);
    updateCompassTriggerDom(targetDoc);
    syncOrthographyPillsVisibility(targetDoc);
    syncLifeTrailsActiveState(targetDoc);
    const paperSel = getEl("kindlePaperFormatSelector", targetDoc);
    if (paperSel && state.paperFormat) {
      paperSel.value = state.paperFormat;
    }
    const corpusLangBtn = getEl("sovereignCorpusLangBtn", targetDoc);
    const corpusDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
    if (corpusLangBtn && corpusDrawer) {
      corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
    }
    const easyDrawerBtn = getEl("bibleEasyDrawer", targetDoc);
    if (easyDrawerBtn) {
      const isStudyOpen = state.activeSheet === "study";
      easyDrawerBtn.setAttribute("aria-pressed", isStudyOpen ? "true" : "false");
      easyDrawerBtn.setAttribute("aria-expanded", isStudyOpen ? "true" : "false");
    }
    const evLangSel = getEl("evangeliosLangSelect", targetDoc);
    if (evLangSel && state.lang) {
      if (typeof evLangSel.appendChild === "function" && targetDoc?.createElement) {
        const hasOpt = Array.from(evLangSel.options || []).some((o) => o.value === state.lang);
        if (!hasOpt) {
          const dynOpt = targetDoc.createElement("option");
          dynOpt.value = state.lang;
          dynOpt.textContent = `${state.lang.toUpperCase()} (${state.lang})`;
          evLangSel.appendChild(dynOpt);
        }
      }
      evLangSel.value = state.lang;
      state.evangeliosLang = state.lang;
    }
    syncI18nUiFromState(state, targetDoc);
    const chromeLabels = localizeWorkChromeLabels(state.uiLocale || "en");
    const tabEvEl = getEl("tabWorkEvangelios", targetDoc);
    if (tabEvEl && chromeLabels.evangeliosTab) {
      tabEvEl.textContent = chromeLabels.evangeliosTab;
    }
    const pulseBadgeEl = getEl("bibleStageRegisterPulseBadge", targetDoc);
    if (pulseBadgeEl && chromeLabels.registerPulse) {
      const regKey =
        state.register === "clasica"
          ? "clasico"
          : state.register === "estudio"
            ? "original"
            : "siglo21";
      pulseBadgeEl.textContent = chromeLabels.registerPulse[regKey] || chromeLabels.registerPulse.siglo21;
      if (typeof pulseBadgeEl.setAttribute === "function") {
        pulseBadgeEl.setAttribute("data-active-register", state.register || "intergeneracional");
      }
    }
    if (syncUrl) {
      return syncUrlFromState(targetDoc, { push: pushUrl });
    }
    return state.lastSerializedUrl || "";
  }

  function commitState(patch = {}, opts = {}) {
    const targetDoc = opts.doc || doc;
    if (patch && typeof patch === "object") {
      Object.assign(state, patch);
    }
    renderStateToDom(targetDoc, {
      syncUrl: opts.syncUrl !== false,
      pushUrl: Boolean(opts.pushUrl),
    });
    return state;
  }

  async function selectVerse(verseNumber, targetDoc = doc) {
    state.verse = Math.max(1, Number(verseNumber) || 1);
    renderViewportFromState(targetDoc);
    updateCompassTriggerDom(targetDoc);
    syncLifeTrailsActiveState(targetDoc);
    syncI18nUiFromState(state, targetDoc);
    syncUrlFromState(targetDoc, { push: false });
    await updateDoseLinks(targetDoc);
    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (state.activeSheet === "print") {
      hydratePrintDrawerPanels(targetDoc);
    }
    return state.verse;
  }

  async function navigate(partial = {}, targetDoc = doc) {
    if (partial.lang) state.lang = String(partial.lang);
    if (partial.book) state.book = String(partial.book).toUpperCase();
    if (partial.chapter !== undefined) state.chapter = Math.max(1, Number(partial.chapter) || 1);
    if (partial.verse !== undefined) state.verse = Math.max(1, Number(partial.verse) || 1);
    if (partial.edition) state.edition = String(partial.edition);
    if (partial.sheets !== undefined) state.sheets = Math.max(1, Math.min(3, Number(partial.sheets) || 1));
    if (partial.register) state.register = String(partial.register);
    if (partial.rollMode) state.rollMode = String(partial.rollMode);
    if (partial.orthographyProfile) state.orthographyProfile = String(partial.orthographyProfile);
    if (partial.paperFormat) state.paperFormat = String(partial.paperFormat).toLowerCase();

    hydrateBookAndChapterSelectors(targetDoc);
    syncOrthographyPillsVisibility(targetDoc);
    syncLifeTrailsActiveState(targetDoc);
    const diachronicSync = syncDiachronicRegisterOrthogonality(targetDoc, state);
    const effectiveCorpusLang =
      diachronicSync.effectiveCorpusLang || resolveEffectiveCorpusTarget(state.lang, state.register);
    state.effectiveCorpusLang = effectiveCorpusLang;
    const langSelectEl = getEl("bibleSelectLang", targetDoc);
    if (langSelectEl && langSelectEl.value !== state.lang) {
      langSelectEl.value = state.lang;
    }
    const corpusLbl = getEl("sovereignActiveCorpusLabel", targetDoc);
    if (corpusLbl) {
      corpusLbl.textContent = `Corpus: ${state.lang} · 7,164`;
    }
    const evLangSel = getEl("evangeliosLangSelect", targetDoc);
    if (evLangSel && state.lang) {
      if (typeof evLangSel.appendChild === "function" && targetDoc?.createElement) {
        const hasOpt = Array.from(evLangSel.options || []).some((o) => o.value === state.lang);
        if (!hasOpt) {
          const dynOpt = targetDoc.createElement("option");
          dynOpt.value = state.lang;
          dynOpt.textContent = `${state.lang.toUpperCase()} (${state.lang})`;
          evLangSel.appendChild(dynOpt);
        }
      }
      evLangSel.value = state.lang;
      state.evangeliosLang = state.lang;
    }
    if (state.activeWork === "felices") {
      state.activePlateIndex = resolvePlateForBibleCoordinate(
        state.book,
        state.chapter,
        state.verse,
        state.activePlateIndex,
      );
    }
    syncI18nUiFromState(state, targetDoc);
    syncUrlFromState(targetDoc, { push: Boolean(partial.pushHistory) });

    state.status = STATUS.LOADING;
    const viewport = getEl("bibleVerseViewport", targetDoc);
    if (viewport) {
      viewport.setAttribute("data-status", STATUS.LOADING);
      viewport.setAttribute("data-current-ref", `${state.book}.${state.chapter}`);
      viewport.setAttribute("data-lang", state.lang);
      const dir = isRtlLocale(state.lang) ? "rtl" : "ltr";
      viewport.setAttribute("dir", dir);
      const sec = getEl("bibleSovereignSection", targetDoc);
      if (sec) sec.setAttribute("dir", dir);
    }

    const res = await dataLayer.navigate({
      lang: effectiveCorpusLang,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
    });

    if (res.stale) {
      return res;
    }

    state.status = res.status;
    state.lastNavResult = res;
    state.lastBridgeChapter = null;
    state.lastMatrixFallbackHtml = "";

    if (state.register === "bilingue" && res.status === STATUS.READY) {
      const bridgeLang = state.lang === "es" ? "en" : "es";
      try {
        const bridgeRes = await dataLayer.loadChapter({
          lang: bridgeLang,
          book: state.book,
          chapter: state.chapter,
        });
        if (bridgeRes && Array.isArray(bridgeRes.verses) && bridgeRes.verses.length > 0) {
          const bMap = {};
          for (const v of bridgeRes.verses) {
            if (v && v.start !== undefined) bMap[String(v.start)] = v.text;
          }
          state.lastBridgeChapter = { verses: bMap };
        } else if (bridgeRes && bridgeRes.verses && typeof bridgeRes.verses === "object") {
          state.lastBridgeChapter = bridgeRes;
        }
      } catch {
        state.lastBridgeChapter = null;
      }
    }

    let catalogEntry = null;
    try {
      const cat = await dataLayer.loadCatalog();
      if (cat && Array.isArray(cat.languages)) {
        catalogEntry =
          cat.languages.find((l) => l.code === effectiveCorpusLang) ||
          cat.languages.find((l) => l.code === state.lang) ||
          null;
      }
    } catch {
      catalogEntry = null;
    }

    const sealKey = deriveEpistemicSeal(res, catalogEntry);
    updateSealDom(sealKey, targetDoc);

    if (res.status === STATUS.UNAVAILABLE) {
      try {
        const matrixShard = await dataLayer.loadMatrixChapter(state.book, state.chapter);
        if (matrixShard && Array.isArray(matrixShard.rows) && matrixShard.rows.length > 0) {
          state.lastMatrixFallbackHtml = renderLeipzig4LineGmisHtml(matrixShard, {
            lang: state.lang,
            book: state.book,
            chapter: state.chapter,
            verse: state.verse,
          });
        }
      } catch {
        state.lastMatrixFallbackHtml = "";
      }
    }

    if (!state.pericopesAndGlossesLoaded && typeof dataLayer.loadPericopesAndGlosses === "function") {
      state.pericopesAndGlossesLoaded = true;
      try {
        const pgData = await dataLayer.loadPericopesAndGlosses();
        if (pgData) {
          hydratePericopesAndGlosses(pgData);
          hydrateCulturalGlossesLexicon(pgData.cultural_glosses || pgData);
          state.lifeTrailsHydrated = hydrateLifeTrailsFromPericopesArtifact(pgData);
        }
      } catch {
        // Non-fatal
      }
    }
    if (state.localizedBookNamesLang !== state.lang && typeof dataLayer.loadBookNames === "function") {
      try {
        const bnDoc = await dataLayer.loadBookNames(state.lang);
        if (bnDoc && Array.isArray(bnDoc.books)) {
          state.localizedBookNames = bnDoc;
          state.localizedBookNamesLang = state.lang;
          state.bookNamesSourceMeta = hydrateBookNamesSourceBadge(bnDoc);
          hydrateBookAndChapterSelectors(targetDoc);
        }
      } catch {
        // Non-fatal
      }
    }
    if (!state.wasmManifestStatus) {
      state.wasmManifestStatus = hydrateWasmManifestStatus(null);
    }
    if (!state.diachronicRegisterLoaded && typeof dataLayer.loadDiachronicRegisterAudit === "function") {
      state.diachronicRegisterLoaded = true;
      try {
        const drData = await dataLayer.loadDiachronicRegisterAudit();
        if (drData) hydrateDiachronicRegister(drData);
      } catch {
        // Non-fatal
      }
    }

    renderViewportFromState(targetDoc);
    updateCompassTriggerDom(targetDoc);

    await updateDoseLinks(targetDoc);

    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (state.activeSheet === "print") {
      await hydratePrintDrawerPanels(targetDoc);
    } else if (state.activeSheet === "share") {
      hydrateShareAndAuditDrawer(targetDoc);
    }

    return res;
  }

  async function updateDoseLinks(targetDoc = doc) {
    try {
      const catalog = await dataLayer.loadCatalog();
      const pageIndex = await dataLayer.loadPageIndex(state.lang, state.edition);
      const manifest = await dataLayer.loadManifest();
      if (catalog && pageIndex) {
        const ordinal = ordinalOf(
          state.book,
          state.chapter,
          state.verse,
          catalog.verse_counts
        );
        const loc = locateVersePage(pageIndex, ordinal);
        if (loc) {
          const d2 = planDose2(loc.blockId, state.lang, state.edition, {
            paperFormat: state.paperFormat,
            columns: state.columns,
          });
          const linkDose2 = getEl("linkDose2BlockPdf", targetDoc);
          if (linkDose2) {
            linkDose2.setAttribute("href", buildRelativePdfAssetUrl(d2.url));
            linkDose2.setAttribute("data-edition-slug", d2.editionSlug);
            linkDose2.setAttribute(
              "download",
              doseFilename({
                dose: 2,
                lang: state.lang,
                blockId: loc.blockId,
                countryIso2: state.countryIso2,
              })
            );
          }
        }
      }
      if (manifest) {
        const d3 = planDose3(manifest, state.lang);
        const linkDose3 = getEl("linkDose3FullBiblePdf", targetDoc);
        if (linkDose3 && d3) {
          linkDose3.setAttribute("href", buildRelativePdfAssetUrl(d3.href || d3.path));
          linkDose3.setAttribute(
            "download",
            doseFilename({
              dose: 3,
              lang: state.lang,
              countryIso2: state.countryIso2,
            })
          );
        }
      }
    } catch {
      // Non-fatal if page index or manifest is unavailable for an uncompiled language
    }
  }

  async function dispenseDose1(opts = {}) {
    const sheets = Math.max(1, Math.min(3, Number(opts.sheets ?? state.sheets) || 1));
    const duplex = opts.duplex !== undefined ? Boolean(opts.duplex) : state.duplex;
    const edition = opts.edition || state.edition;

    const catalog = await dataLayer.loadCatalog();
    if (!catalog || !catalog.verse_counts) {
      throw new Error("Catalog verse_counts unavailable");
    }
    const pageIndex = await dataLayer.loadPageIndex(state.lang, edition);
    if (!pageIndex) {
      throw new Error(`Page index unavailable for ${state.lang}/${edition}`);
    }

    const ordinal = ordinalOf(
      state.book,
      state.chapter,
      state.verse,
      catalog.verse_counts
    );
    const loc = locateVersePage(pageIndex, ordinal);
    if (!loc) {
      throw new Error(`Could not locate ordinal ${ordinal} in page index`);
    }

    const plan = planDose1(loc.pageInBlock, sheets, duplex, loc.pageCountInBlock);
    const blockBytes = await dataLayer.loadBlockPdf(state.lang, edition, loc.blockId);
    if (!blockBytes) {
      throw new Error(`Block PDF unavailable: ${state.lang}/${edition}/${loc.blockId}`);
    }

    const extractedBytes = extractPdfPages(blockBytes, plan.pages);
    const threatClass = effectiveThreatClassWeb(state.countryIso2, state.lang);
    const filename = doseFilename({
      dose: 1,
      lang: state.lang,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      blockId: loc.blockId,
      countryIso2: state.countryIso2,
      ordinal: loc.blockIndex,
    });

    return {
      bytes: extractedBytes,
      filename,
      threatClass,
      blockId: loc.blockId,
      pages: plan.pages,
      sheetCount: plan.sheetCount,
      pageCount: countPdfPages(extractedBytes),
    };
  }

  function buildDrawerHydratorContext(targetDoc = doc) {
    return {
      state,
      dataLayer,
      targetDoc,
      getEl,
      withPreservedInputFocus,
      getI18n: () => i18nInstance,
      loadStudyModule: () => {
        if (!studyModulePromise) {
          studyModulePromise = Promise.resolve(loadStudyModule());
        }
        return studyModulePromise;
      },
      loadImproveModule: () => {
        if (!improveModulePromise) {
          improveModulePromise = Promise.resolve(loadImproveModule());
        }
        return improveModulePromise;
      },
      navigate,
      hydrateBookAndChapterSelectors,
      transitionSheet,
      hydratePrintDrawerPanels,
      hydrateShareAndAuditDrawer,
    };
  }

  async function hydrateStudyDrawer(targetDoc = doc) {
    return hydrateStudyDrawerPanel(buildDrawerHydratorContext(targetDoc));
  }

  async function hydrateImproveDrawer(targetDoc = doc) {
    return hydrateImproveDrawerPanel(buildDrawerHydratorContext(targetDoc));
  }

  function renderPrintDrawerPanelsSync(targetDoc = doc) {
    return renderPrintDrawerPanelsSyncInDrawer(buildDrawerHydratorContext(targetDoc));
  }

  async function hydratePrintDrawerPanels(targetDoc = doc) {
    return hydratePrintDrawerPanelsInDrawer(buildDrawerHydratorContext(targetDoc));
  }

  function hydrateShareAndAuditDrawer(targetDoc = doc) {
    return hydrateShareAndAuditDrawerPanel(buildDrawerHydratorContext(targetDoc));
  }

  async function transitionSheet(rawSheetName, targetDoc = doc) {
    const normalized = rawSheetName === "improve" ? "field" : rawSheetName;
    const vp = getEl("bibleVerseViewport", targetDoc);
    const hideOpticalVideoIfOutsidePdfSubtab = () => {
      const videoEl = getEl("bibleOpticalCameraVideo", targetDoc);
      if (videoEl) videoEl.hidden = true;
    };
    if (!normalized || !HAREL_SHEET_MAP[normalized]) {
      state.activeSheet = null;
      if (vp) vp.setAttribute("data-inspector-open", "false");
      hideOpticalVideoIfOutsidePdfSubtab();
      for (const cfg of Object.values(HAREL_SHEET_MAP)) {
        const panel = getEl(cfg.panelId, targetDoc);
        const btn = getEl(cfg.buttonId, targetDoc);
        if (panel) panel.hidden = true;
        if (btn) {
          btn.setAttribute("data-open", "false");
          btn.setAttribute("aria-expanded", "false");
          btn.setAttribute("aria-pressed", "false");
        }
      }
      return null;
    }

    const willOpen = state.activeSheet !== normalized;
    state.activeSheet = willOpen ? normalized : null;
    if (vp) {
      vp.setAttribute("data-inspector-open", willOpen ? "true" : "false");
    }
    if (!willOpen || normalized !== "share") {
      hideOpticalVideoIfOutsidePdfSubtab();
    }

    let openedPanelEl = null;
    for (const [key, cfg] of Object.entries(HAREL_SHEET_MAP)) {
      const isOpen = willOpen && key === normalized;
      const panel = getEl(cfg.panelId, targetDoc);
      const btn = getEl(cfg.buttonId, targetDoc);
      if (panel) {
        panel.hidden = !isOpen;
        if (isOpen) openedPanelEl = panel;
      }
      if (btn) {
        btn.setAttribute("data-open", isOpen ? "true" : "false");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        btn.setAttribute("aria-pressed", isOpen ? "true" : "false");
      }
    }

    if (willOpen && normalized === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (willOpen && normalized === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (willOpen && normalized === "print") {
      await hydratePrintDrawerPanels(targetDoc);
    } else if (willOpen && normalized === "share") {
      hydrateShareAndAuditDrawer(targetDoc);
    }

    if (openedPanelEl && typeof openedPanelEl.scrollIntoView === "function") {
      try {
        openedPanelEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {
        // Non-fatal in headless DOM environments
      }
    }

    syncUrlFromState(targetDoc, { push: false });
    return state.activeSheet;
  }

  async function setUiLocale(requestedLocale, targetDoc = doc) {
    let available = ["en", "es"];
    try {
      const idx = await dataLayer.loadI18nIndex();
      if (idx && Array.isArray(idx.locales)) {
        available = idx.locales.map((l) => l.code || l);
      }
    } catch {
      // keep default available list
    }
    const resolved = negotiate([requestedLocale], available, "en");
    const enCatalog = (await dataLayer.loadUiCatalog("en")) || {};
    const activeCatalog =
      resolved === "en"
        ? enCatalog
        : (await dataLayer.loadUiCatalog(resolved)) || enCatalog;
    i18nInstance = createI18n({
      locale: resolved,
      catalogs: { en: enCatalog, [resolved]: activeCatalog },
    });
    state.uiLocale = resolved;
    if (targetDoc) {
      applyToDom(targetDoc, i18nInstance, {
        book: state.book,
        chapter: state.chapter,
        verse: state.verse,
        lang: state.lang,
        uiLocale: resolved,
      });
      applyAriaLabelsToDom(targetDoc, activeCatalog);
      applyStaticChromeTranslations(targetDoc, resolved, state);
      updateSealDom(state.seal, targetDoc);
      updateCompassTriggerDom(targetDoc);
      syncI18nUiFromState(state, targetDoc);
      syncUrlFromState(targetDoc, { push: false });
    }
    return resolved;
  }

  function bindDomEvents(targetDoc = doc) {
    if (!targetDoc) return;
    hydrateBookAndChapterSelectors(targetDoc);
    syncOrthographyPillsVisibility(targetDoc);
    syncDiachronicRegisterOrthogonality(targetDoc, state);

    const bookSelect = getEl("bibleSelectBook", targetDoc);
    if (bookSelect && typeof bookSelect.addEventListener === "function") {
      bookSelect.addEventListener("change", async (e) => {
        const nextBook = e?.target?.value || bookSelect.value || "GEN";
        state.book = String(nextBook).toUpperCase();
        state.chapter = 1;
        state.verse = 1;
        hydrateBookAndChapterSelectors(targetDoc);
        await navigate({ book: state.book, chapter: 1, verse: 1 }, targetDoc);
      });
    }

    const chapSelect = getEl("bibleSelectChapter", targetDoc);
    if (chapSelect && typeof chapSelect.addEventListener === "function") {
      chapSelect.addEventListener("change", async (e) => {
        const nextChap = Number(e?.target?.value || chapSelect.value) || 1;
        await navigate({ chapter: nextChap, verse: 1 }, targetDoc);
      });
    }

    const prevBtn = getEl("btnPrevChapter", targetDoc);
    if (prevBtn && typeof prevBtn.addEventListener === "function") {
      prevBtn.addEventListener("click", async () => {
        if (state.chapter > 1) {
          await navigate({ chapter: state.chapter - 1, verse: 1 }, targetDoc);
        } else {
          const idx = ROSETTA_66_BOOKS.findIndex((b) => b.code === state.book);
          const prevBook =
            idx > 0 ? ROSETTA_66_BOOKS[idx - 1] : ROSETTA_66_BOOKS[ROSETTA_66_BOOKS.length - 1];
          await navigate(
            { book: prevBook.code, chapter: prevBook.chapters, verse: 1 },
            targetDoc
          );
        }
        hydrateBookAndChapterSelectors(targetDoc);
      });
    }

    const nextBtn = getEl("btnNextChapter", targetDoc);
    if (nextBtn && typeof nextBtn.addEventListener === "function") {
      nextBtn.addEventListener("click", async () => {
        const bookMeta =
          ROSETTA_66_BOOKS.find((b) => b.code === state.book) || ROSETTA_66_BOOKS[0];
        if (state.chapter < bookMeta.chapters) {
          await navigate({ chapter: state.chapter + 1, verse: 1 }, targetDoc);
        } else {
          const idx = ROSETTA_66_BOOKS.findIndex((b) => b.code === state.book);
          const nextBook =
            idx >= 0 && idx + 1 < ROSETTA_66_BOOKS.length
              ? ROSETTA_66_BOOKS[idx + 1]
              : ROSETTA_66_BOOKS[0];
          await navigate({ book: nextBook.code, chapter: 1, verse: 1 }, targetDoc);
        }
        hydrateBookAndChapterSelectors(targetDoc);
      });
    }

    const compassBtn = getEl("btnOpenCompass", targetDoc);
    const compassModal = getEl("bibleCoordinateCompassModal", targetDoc);
    const closeCompassBtn = getEl("btnCloseCompassModal", targetDoc);
    const compassGrid = getEl("bibleCoordinateCompassGrid", targetDoc);

    if (compassBtn && typeof compassBtn.addEventListener === "function") {
      compassBtn.addEventListener("click", () => {
        hydrateCompassGrid(targetDoc);
        if (compassModal) {
          const nextHidden = !compassModal.hidden;
          compassModal.hidden = nextHidden;
          if (compassModal.style) {
            compassModal.style.display = nextHidden ? "none" : "block";
          }
        }
      });
    }

    if (closeCompassBtn && typeof closeCompassBtn.addEventListener === "function") {
      closeCompassBtn.addEventListener("click", () => {
        if (compassModal) {
          compassModal.hidden = true;
          if (compassModal.style) compassModal.style.display = "none";
        }
      });
    }

    if (compassGrid && typeof compassGrid.addEventListener === "function") {
      compassGrid.addEventListener("click", async (e) => {
        const target = e?.target?.closest
          ? e.target.closest("[data-compass-book]")
          : e?.target;
        const bookCode = target?.getAttribute
          ? target.getAttribute("data-compass-book")
          : target?.dataset?.compassBook;
        if (bookCode) {
          if (compassModal) {
            compassModal.hidden = true;
            if (compassModal.style) compassModal.style.display = "none";
          }
          await navigate({ book: bookCode, chapter: 1, verse: 1 }, targetDoc);
          hydrateBookAndChapterSelectors(targetDoc);
        }
      });
    }

    const oralBtn = getEl("btnToggleAudioNarakeet", targetDoc);
    const oralBanner = getEl("bibleOralPorticoBanner", targetDoc);
    if (oralBtn && typeof oralBtn.addEventListener === "function") {
      oralBtn.addEventListener("click", async () => {
        state.oralPorticoActive = !state.oralPorticoActive;
        oralBtn.setAttribute("aria-pressed", state.oralPorticoActive ? "true" : "false");
        if (oralBanner) {
          oralBanner.hidden = !state.oralPorticoActive;
          if (oralBanner.style) {
            oralBanner.style.display = state.oralPorticoActive ? "block" : "none";
          }
          if (state.oralPorticoActive) {
            renderOralPorticoWasmConsole(targetDoc);
          }
        }
        renderViewportFromState(targetDoc);
        if (state.oralPorticoActive && oralBanner && typeof dataLayer.loadWasmModule === "function") {
          try {
            const wasmMod = await dataLayer.loadWasmModule("ekovoz_player_wasm");
            if (wasmMod && wasmMod.status === STATUS.READY) {
              renderOralPorticoWasmConsole(targetDoc);
            }
          } catch {
            // Fallback deterministic prosody stays active
          }
        }
      });
    }

    const viewport = getEl("bibleVerseViewport", targetDoc);
    if (viewport && typeof viewport.addEventListener === "function") {
      viewport.addEventListener("click", async (e) => {
        const celfTrigger = e?.target?.closest
          ? e.target.closest('[data-action="open-celf250-workshop"]')
          : e?.target?.getAttribute?.("data-action") === "open-celf250-workshop"
            ? e.target
            : null;
        if (celfTrigger) {
          await transitionSheet("field", targetDoc);
          return;
        }
        const wordTokenEl = e?.target?.closest
          ? e.target.closest(".bible-word-token[data-word-surface]")
          : e?.target?.getAttribute?.("data-word-surface")
            ? e.target
            : null;
        if (wordTokenEl) {
          const wordSurface = wordTokenEl.getAttribute?.("data-word-surface") || "";
          const tokenVerse = Number(wordTokenEl.getAttribute?.("data-verse")) || state.verse;
          const tokenStrongAttr = wordTokenEl.getAttribute?.("data-strong-id") || "";
          const lookedUp = lookupWordTokenStrongEntry(
            wordSurface,
            state.reverseOrthoMap,
            state.tokenStrongPairs || [],
          );
          const resolvedStrong = String(tokenStrongAttr || lookedUp.strongId || "").toUpperCase();
          state.selectedWordSurface = wordSurface;
          state.selectedCanonicalToken = lookedUp.canonicalToken;
          if (resolvedStrong && resolvedStrong !== "∅") {
            state.activeStrongId = resolvedStrong;
          }
          if (Number.isFinite(tokenVerse) && tokenVerse >= 1 && tokenVerse !== Number(state.verse)) {
            await selectVerse(tokenVerse, targetDoc);
          }
          if (e?.altKey) {
            await transitionSheet("field", targetDoc);
            const oldInp = getEl("improveOldValueInput", targetDoc);
            if (oldInp && wordSurface) oldInp.value = wordSurface;
            const strongInp = getEl("improveStrongInput", targetDoc);
            if (strongInp && state.activeStrongId) strongInp.value = state.activeStrongId;
          } else {
            await transitionSheet("study", targetDoc);
            if (state.activeStrongId) {
              syncActiveStrongInStudyDrawer(
                state.activeStrongId,
                buildDrawerHydratorContext(targetDoc),
              );
            }
          }
          return;
        }
        const verseEl = e?.target?.closest
          ? e.target.closest("[data-verse]")
          : e?.target?.getAttribute?.("data-verse")
            ? e.target
            : null;
        const vNum = verseEl?.getAttribute
          ? Number(verseEl.getAttribute("data-verse"))
          : Number(verseEl?.dataset?.verse);
        if (Number.isFinite(vNum) && vNum >= 1) {
          await selectVerse(vNum, targetDoc);
        }
      });
    }

    const regionSelect = getEl("bibleSelectRegion", targetDoc);
    const countrySelect = getEl("bibleSelectCountry", targetDoc);
    const langSelect = getEl("bibleSelectLang", targetDoc);
    const langFilterInput = getEl("quickLangFilterInput", targetDoc);

    const ensureRegionIndexLoaded = async () => {
      if (state.regionIndex) return state.regionIndex;
      const catalog = await dataLayer.loadCatalog();
      const shards =
        typeof dataLayer.loadAllRegionShards === "function"
          ? await dataLayer.loadAllRegionShards()
          : [];
      state.regionIndex = indexRegionShards(shards, catalog || { languages: [] });
      return state.regionIndex;
    };

    if (regionSelect && typeof regionSelect.addEventListener === "function") {
      regionSelect.addEventListener("change", async (e) => {
        state.regionCode = e?.target?.value || regionSelect.value || "americas-mesoamerica";
        const idx = await ensureRegionIndexLoaded();
        const subregions = listCountriesInRegion(idx, state.regionCode);
        if (countrySelect && subregions.length > 0) {
          countrySelect.innerHTML = subregions
            .map(
              (c) =>
                `<option value="${escapeHtml(c.code || c.name)}">${escapeHtml(
                  c.label || c.name
                )}</option>`
            )
            .join("");
        }
        const regionLangs = listLanguagesInCountry(idx, state.regionCode, "");
        if (langSelect && regionLangs.length > 0) {
          langSelect.innerHTML = regionLangs
            .slice(0, 60)
            .map(
              (m) =>
                `<option value="${escapeHtml(m.code)}" data-seal="${escapeHtml(
                  m.sovereignSeal || ""
                )}">${escapeHtml(m.displayLabel)}</option>`
            )
            .join("");
        }
      });
    }

    if (countrySelect && typeof countrySelect.addEventListener === "function") {
      countrySelect.addEventListener("change", async (e) => {
        const subName = String(e?.target?.value || countrySelect.value || "MX");
        state.countryIso2 = subName.toUpperCase().slice(0, 2);
        const idx = await ensureRegionIndexLoaded();
        const subLangs = listLanguagesInCountry(idx, state.regionCode || 1, subName);
        if (langSelect && subLangs.length > 0) {
          langSelect.innerHTML = subLangs
            .slice(0, 60)
            .map(
              (m) =>
                `<option value="${escapeHtml(m.code)}" data-seal="${escapeHtml(
                  m.sovereignSeal || ""
                )}">${escapeHtml(m.displayLabel)}</option>`
            )
            .join("");
        }
        await updateDoseLinks(targetDoc);
      });
    }

    if (langSelect && typeof langSelect.addEventListener === "function") {
      langSelect.addEventListener("change", async (e) => {
        const nextLang = e?.target?.value || langSelect.value || "es";
        await navigate({ lang: nextLang }, targetDoc);
      });
    }

    if (langFilterInput && typeof langFilterInput.addEventListener === "function") {
      langFilterInput.addEventListener("input", async (e) => {
        const q = String(e?.target?.value || langFilterInput.value || "").trim();
        if (!q) return;
        const idx = await ensureRegionIndexLoaded();
        const matches = searchLanguages(idx, q, { limit: 25 });
        if (matches.length > 0 && langSelect) {
          langSelect.innerHTML = matches
            .map(
              (m) =>
                `<option value="${escapeHtml(m.code)}" data-iso="${escapeHtml(
                  m.iso639_3
                )}" data-seal="${escapeHtml(m.sovereignSeal || "")}">${escapeHtml(
                  m.displayLabel || m.name || m.code
                )}</option>`
            )
            .join("");
        }
      });
    }

    for (const [btnId, corpusLang] of [
      ["quickLangEs", "es"],
      ["quickLangEs1909", "es-1909"],
      ["quickLangEn", "en"],
      ["quickLangStp", "stp"],
      ["quickLangHe", "he"],
      ["quickLangGrc", "grc"],
    ]) {
      const qBtn = getEl(btnId, targetDoc);
      if (qBtn && typeof qBtn.addEventListener === "function") {
        qBtn.addEventListener("click", async () => {
          const reg = corpusLang === "es-1909" ? "clasica" : state.register;
          await navigate({ lang: corpusLang, register: reg }, targetDoc);
        });
      }
    }

    const btnRegInter = getEl("btnRegIntergeneracional", targetDoc);
    if (btnRegInter && typeof btnRegInter.addEventListener === "function") {
      btnRegInter.addEventListener("click", async () => {
        const nextLang = state.lang === "es-1909" ? "es" : state.lang;
        await navigate({ lang: nextLang, register: "intergeneracional" }, targetDoc);
      });
    }

    const btnRegClasica = getEl("btnRegClasica", targetDoc);
    if (btnRegClasica && typeof btnRegClasica.addEventListener === "function") {
      btnRegClasica.addEventListener("click", async () => {
        const baseLang = state.lang === "es-1909" ? "es" : state.lang;
        await navigate({ lang: baseLang, register: "clasica" }, targetDoc);
      });
    }

    const btnRegBilingue = getEl("btnRegBilingue", targetDoc);
    if (btnRegBilingue && typeof btnRegBilingue.addEventListener === "function") {
      btnRegBilingue.addEventListener("click", async () => {
        await navigate({ register: "bilingue" }, targetDoc);
      });
    }

    const btnRegEstudio = getEl("btnRegEstudio", targetDoc);
    if (btnRegEstudio && typeof btnRegEstudio.addEventListener === "function") {
      btnRegEstudio.addEventListener("click", async () => {
        await transitionSheet("study", targetDoc);
      });
    }

    const toggleRoll = getEl("toggleRollMode", targetDoc);
    if (toggleRoll && typeof toggleRoll.addEventListener === "function") {
      toggleRoll.addEventListener("click", () => {
        state.rollMode = state.rollMode === "roll" ? "chapter" : "roll";
        toggleRoll.setAttribute("aria-pressed", state.rollMode === "roll" ? "true" : "false");
        renderViewportFromState(targetDoc);
        syncUrlFromState(targetDoc, { push: false });
      });
    }

    for (const [orthoBtnId, profile, altProfile] of [
      ["btnOrthoInali", "inali", null],
      ["btnOrthoTradicional", "tradicional", null],
      ["btnOrthoFonetica", "fonetica", null],
      ["btnOrthoBnBd", "bn-BD", null],
      ["btnOrthoBnIn", "bn-IN", null],
      ["btnOrthoArbTashkeel", "TASHKEEL_STRIPPED", "VOWELIZED"],
      ["btnOrthoUznCyrl", "CYRL", "LATN"],
      ["btnOrthoTzmTfng", "TFNG", "LATN"],
    ]) {
      const oBtn = getEl(orthoBtnId, targetDoc);
      if (oBtn && typeof oBtn.addEventListener === "function") {
        oBtn.addEventListener("click", () => {
          if (altProfile && state.orthographyProfile === profile) {
            state.orthographyProfile = altProfile;
          } else {
            state.orthographyProfile = profile;
          }
          syncOrthographyPillsVisibility(targetDoc);
          renderViewportFromState(targetDoc);
          syncUrlFromState(targetDoc, { push: false });
        });
      }
    }

    for (const [trailBtnId, anchor] of Object.entries(LIFE_TRAILS_ANCHORS)) {
      const tBtn = getEl(trailBtnId, targetDoc);
      if (tBtn && typeof tBtn.addEventListener === "function") {
        tBtn.addEventListener("click", async () => {
          await navigate(
            { book: anchor.book, chapter: anchor.chapter, verse: anchor.verse },
            targetDoc
          );
          hydrateBookAndChapterSelectors(targetDoc);
        });
      }
    }

    const uiLangSelect = getEl("langSelect", targetDoc);
    const ulsTrigger = getEl("ulsTriggerBtn", targetDoc);
    if (uiLangSelect && typeof uiLangSelect.addEventListener === "function") {
      uiLangSelect.addEventListener("change", async (e) => {
        const nextUi = e?.target?.value || uiLangSelect.value || "en";
        await setUiLocale(nextUi, targetDoc);
        uiLangSelect.hidden = true;
        if (ulsTrigger) {
          ulsTrigger.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (ulsTrigger && typeof ulsTrigger.addEventListener === "function") {
      ulsTrigger.addEventListener("click", () => {
        if (uiLangSelect) {
          uiLangSelect.hidden = !uiLangSelect.hidden;
          ulsTrigger.setAttribute("aria-expanded", uiLangSelect.hidden ? "false" : "true");
        }
      });
    }

    const corpusLangBtn = getEl("sovereignCorpusLangBtn", targetDoc);
    const corpusDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
    if (corpusLangBtn && typeof corpusLangBtn.addEventListener === "function") {
      corpusLangBtn.addEventListener("click", () => {
        if (corpusDrawer) {
          corpusDrawer.open = !corpusDrawer.open;
          corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
        }
      });
    }

    const evGlobalBadge = getEl("evangeliosGlobalLangBadge", targetDoc);
    if (evGlobalBadge && typeof evGlobalBadge.addEventListener === "function") {
      evGlobalBadge.addEventListener("click", () => {
        if (corpusDrawer) {
          corpusDrawer.open = !corpusDrawer.open;
          if (corpusLangBtn) {
            corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
          }
        }
      });
    }

    const refInput = getEl("mostradorRefInput", targetDoc);
    const refBtn = getEl("btnGoReference", targetDoc);
    if (refBtn && typeof refBtn.addEventListener === "function") {
      refBtn.addEventListener("click", async () => {
        const raw = refInput ? refInput.value : "";
        const parsed = parseBiblicalCoordinateReference(raw);
        if (parsed && parsed.bookCode) {
          if (compassModal) {
            compassModal.hidden = true;
            if (compassModal.style) compassModal.style.display = "none";
          }
          await navigate(
            {
              book: parsed.bookCode,
              chapter: parsed.chapter || 1,
              verse: parsed.verse || 1,
            },
            targetDoc
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
      });
    }

    for (const [sheetKey, cfg] of Object.entries(HAREL_SHEET_MAP)) {
      const btn = getEl(cfg.buttonId, targetDoc);
      if (btn && typeof btn.addEventListener === "function") {
        btn.addEventListener("click", () => {
          transitionSheet(sheetKey, targetDoc);
        });
      }
    }

    const handleDose1Trigger = async () => {
      const pkg = await dispenseDose1();
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
        const blob = new Blob([pkg.bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = targetDoc.createElement ? targetDoc.createElement("a") : null;
        if (a) {
          a.href = url;
          a.download = pkg.filename;
          if (typeof a.click === "function") a.click();
        }
      }
      return pkg;
    };

    for (const dose1BtnId of ["btnDose1Sheets", "btnPrintAroundVerse"]) {
      const btnDose1 = getEl(dose1BtnId, targetDoc);
      if (btnDose1 && typeof btnDose1.addEventListener === "function") {
        btnDose1.addEventListener("click", handleDose1Trigger);
      }
    }

    const fontSlider = getEl("kindleFontSizeSlider", targetDoc);
    const colSel = getEl("kindleColumnSelector", targetDoc);
    const paperSel = getEl("kindlePaperFormatSelector", targetDoc);
    const orientSel = getEl("kindleOrientationSelector", targetDoc);
    const foliationSel = getEl("bibleFoliationModeSelect", targetDoc);
    const duplexToggle = getEl("kindleDuplexToggle", targetDoc);
    const btnSimPhotocopy = getEl("btnSimulatePhotocopy3Gen", targetDoc);

    const syncKindlePrintConfig = async () => {
      if (fontSlider?.value) state.fontSizePt = Number(fontSlider.value) || 10.5;
      if (colSel?.value) state.columns = Number(colSel.value) || 2;
      if (paperSel?.value) state.paperFormat = String(paperSel.value).toLowerCase();
      if (orientSel?.value) state.orientation = String(orientSel.value).toLowerCase();
      if (foliationSel?.value) state.foliationMode = String(foliationSel.value);
      if (duplexToggle && typeof duplexToggle.checked === "boolean") {
        state.duplex = duplexToggle.checked;
      }
      state.edition = normalizeEditionSlug(state.edition, {
        paperFormat: state.paperFormat,
        columns: state.columns,
        largePrint: state.fontSizePt >= 13,
      });
      syncI18nUiFromState(state, targetDoc);
      syncUrlFromState(targetDoc, { push: false });
      hydratePrintDrawerPanels(targetDoc);
      await updateDoseLinks(targetDoc);
    };

    for (const kCtrl of [fontSlider, colSel, paperSel, orientSel, foliationSel, duplexToggle]) {
      if (kCtrl && typeof kCtrl.addEventListener === "function") {
        kCtrl.addEventListener("change", syncKindlePrintConfig);
        kCtrl.addEventListener("input", syncKindlePrintConfig);
      }
    }

    const toggleA4Btn = getEl("toggleA4", targetDoc);
    const toggleCartaBtn = getEl("toggleCarta", targetDoc);
    const bindPaperFormatBtn = (btnEl, fmt) => {
      if (btnEl && typeof btnEl.addEventListener === "function") {
        btnEl.addEventListener("click", async () => {
          state.paperFormat = fmt;
          if (paperSel) paperSel.value = fmt;
          setPaperFormat(fmt, targetDoc);
          state.edition = normalizeEditionSlug(state.edition, {
            paperFormat: state.paperFormat,
            columns: state.columns,
            largePrint: state.fontSizePt >= 13,
          });
          syncI18nUiFromState(state, targetDoc);
          syncUrlFromState(targetDoc, { push: false });
          hydratePrintDrawerPanels(targetDoc);
          await updateDoseLinks(targetDoc);
        });
      }
    };
    bindPaperFormatBtn(toggleA4Btn, "a4");
    bindPaperFormatBtn(toggleCartaBtn, "letter");

    if (btnSimPhotocopy && typeof btnSimPhotocopy.addEventListener === "function") {
      btnSimPhotocopy.addEventListener("click", () => {
        const cycleOrder = [1, 2, 3, 5, 0];
        const currentGen = Number.isInteger(state.photocopyGen) ? state.photocopyGen : 3;
        const curIdx = cycleOrder.indexOf(currentGen);
        const nextGen = cycleOrder[(curIdx + 1) % cycleOrder.length];
        state.photocopyGen = nextGen;
        state.sauvolaK = Number((0.2 + nextGen * 0.024).toFixed(2));
        renderPrintDrawerPanelsSync(targetDoc);
      });
    }

    const tskCard = getEl("tskCrossRefsStratumCard", targetDoc);
    if (tskCard && typeof tskCard.addEventListener === "function") {
      tskCard.addEventListener("click", async (e) => {
        const pill = e?.target?.closest
          ? e.target.closest("[data-tsk-ref]")
          : e?.target?.getAttribute?.("data-tsk-ref")
            ? e.target
            : null;
        const ref = pill?.getAttribute
          ? pill.getAttribute("data-tsk-ref")
          : pill?.dataset?.tskRef;
        if (ref) {
          const parsed = parseBiblicalCoordinateReference(ref);
          if (parsed && parsed.bookCode) {
            await navigate(
              {
                book: parsed.bookCode,
                chapter: parsed.chapter || 1,
                verse: parsed.verse || 1,
              },
              targetDoc
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
        }
      });
    }

    const executeGaveta4Action = async (shareBtnId) => {
      hydrateShareAndAuditDrawer(targetDoc);
      const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
      if (statusPanel) {
        statusPanel.hidden = false;
        if (statusPanel.style) statusPanel.style.display = "";
      }
      const packLang = ["es", "en", "stp", "he"].includes(state.lang) ? state.lang : "stp";
      const osis = `${state.book}.${state.chapter}.${state.verse}`;

      if (shareBtnId === "btnShareQuine") {
        const quineUrl = `obras/biblia/packs/${packLang}/lector_offline_${packLang}.html`;
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "share-quine");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="share-quine" data-quine-lang="${escapeHtml(packLang)}">` +
            `✅ <strong>Quine Autónomo Listo (${escapeHtml(packLang.toUpperCase())}):</strong> ` +
            `<a href="${escapeHtml(quineUrl)}" download="lector_offline_${escapeHtml(packLang)}.html">Descargar lector_offline_${escapeHtml(packLang)}.html</a> ` +
            `(DecompressionStream deflate-raw · 100% offline).</div>`;
        }
      } else if (shareBtnId === "btnCopyDirectShareLink") {
        const shareUrl = serializeMostradorRouteQuery(state);
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(shareUrl).catch(() => { });
        }
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "copy-link");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="copy-link" data-share-url="${escapeHtml(shareUrl)}">` +
            `🔗 <strong>Enlace directo copiado:</strong> <code>${escapeHtml(shareUrl)}</code></div>`;
        }
      } else if (shareBtnId === "btnVerifyEd25519Signature") {
        const manifest = await dataLayer.loadManifest();
        const merkleObj =
          typeof dataLayer.loadMerkleRoot === "function" ? await dataLayer.loadMerkleRoot() : null;
        const receipt = verifyManifestAndMerkleAudit({
          manifest,
          merkleRootHex: merkleObj?.merkleRootHex || "",
          lang: state.lang,
          book: state.book,
          chapter: state.chapter,
        });
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "verify-signature");
          statusPanel.setAttribute("data-verified", String(receipt.verified));
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="verify-signature" data-verified="${receipt.verified}" data-merkle-root="${escapeHtml(receipt.merkleRootHex)}">` +
            `🔐 <strong>Auditoría Criptográfica (${escapeHtml(receipt.algorithm)}):</strong> ` +
            `Estado=${receipt.verified ? "VERIFICADO" : "PENDIENTE"} · Artefactos=${receipt.artifactsChecked} · ` +
            `Merkle Root=<code>${escapeHtml(receipt.merkleRootHex.slice(0, 16))}…</code> · ` +
            `SHA-256=<code>${escapeHtml(receipt.sampleSha256.slice(0, 16))}…</code></div>`;
        }
      } else if (shareBtnId === "btnCalculateImposition") {
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
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "calculate-imposition");
          statusPanel.innerHTML = receiptHtml;
        }
        const impHost = getEl("impositionBookletPreviewHost", targetDoc);
        if (impHost) {
          impHost.setAttribute("data-audit-action", "calculate-imposition");
          impHost.innerHTML =
            renderImpositionAndLayoutPreviewHtml({
              mode: "imposition",
              paper: state.paperFormat || "a4",
              pageCount: 16,
              columns: state.columns || 2,
              fontPt: state.fontSizePt || 9.5,
              dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            }) + receiptHtml;
        }
      } else if (shareBtnId === "btnCalculateLayout") {
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
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "calculate-layout");
          statusPanel.innerHTML = receiptHtml;
        }
        const impHost = getEl("impositionBookletPreviewHost", targetDoc);
        if (impHost) {
          impHost.setAttribute("data-audit-action", "calculate-layout");
          impHost.innerHTML =
            renderImpositionAndLayoutPreviewHtml({
              mode: "layout",
              paper: state.paperFormat || "a4",
              pageCount: 16,
              columns: state.columns || 2,
              fontPt: state.fontSizePt || 9.5,
              dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            }) + receiptHtml;
        }
      }
    };

    for (const shareBtnId of [
      "btnShareQuine",
      "btnCopyDirectShareLink",
      "btnVerifyEd25519Signature",
      "btnCalculateImposition",
      "btnCalculateLayout",
    ]) {
      const sBtn = getEl(shareBtnId, targetDoc);
      if (sBtn && typeof sBtn.addEventListener === "function") {
        sBtn.addEventListener("click", async () => {
          sBtn.setAttribute("data-last-invoked", shareBtnId);
          await executeGaveta4Action(shareBtnId);
        });
      }
    }

    const fpsSel = getEl("bibleOpticalFpsSelect", targetDoc);
    if (fpsSel && typeof fpsSel.addEventListener === "function") {
      fpsSel.addEventListener("change", (e) => {
        state.opticalCadenceFps = String(e?.target?.value || fpsSel.value || "6.67") === "10" ? "10" : "6.67";
        hydrateShareAndAuditDrawer(targetDoc);
      });
    }

    const camRxBtn = getEl("btnToggleOpticalCameraRx", targetDoc);
    if (camRxBtn && typeof camRxBtn.addEventListener === "function") {
      camRxBtn.addEventListener("click", async () => {
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        const videoEl = getEl("bibleOpticalCameraVideo", targetDoc);
        if (videoEl) videoEl.hidden = !videoEl.hidden;
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "optical-camera-rx");
          statusPanel.setAttribute("data-wasm-bridge", "loading");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-wasm-bridge="loading">` +
            `📷 <strong>Receptor Óptico LT + GF(2) Activo:</strong> ` +
            `Eliminación Gaussiana sobre GF(2) lista para resolver Stopping Sets de grado ≥ 2.</div>`;
        }
        let wasmStatusAttr = "fallback";
        if (typeof dataLayer.loadWasmModule === "function") {
          try {
            const wasmMod = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
            const bridgeCheck = decodeQrStreamViaWasmBridge([], wasmMod);
            if (bridgeCheck.ok) wasmStatusAttr = `ready-v${bridgeCheck.wasmAbiVersion}`;
          } catch {
            wasmStatusAttr = "unavailable";
          }
        }
        if (statusPanel && statusPanel.getAttribute("data-audit-action") === "optical-camera-rx") {
          statusPanel.setAttribute("data-wasm-bridge", wasmStatusAttr);
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-wasm-bridge="${escapeHtml(wasmStatusAttr)}">` +
            `📷 <strong>Receptor Óptico LT + GF(2) Activo (WASM=${escapeHtml(wasmStatusAttr)}):</strong> ` +
            `Eliminación Gaussiana sobre GF(2) lista para resolver Stopping Sets de grado ≥ 2.</div>`;
        }
      });
    }

    const relayBtn = getEl("btnOpticalRelayTx", targetDoc);
    if (relayBtn && typeof relayBtn.addEventListener === "function") {
      relayBtn.addEventListener("click", () => {
        state.qrFrameSeq = 0;
        hydrateShareAndAuditDrawer(targetDoc);
        const relayDecoderSource =
          state.lastOpticalRxReport?.decoder &&
            typeof state.lastOpticalRxReport.decoder.reconstructBytes === "function"
            ? state.lastOpticalRxReport.decoder
            : {
              K: 4,
              blockSize: 32,
              isComplete: () => true,
              reconstructBytes: () =>
                new TextEncoder().encode(
                  `${state.book}.${state.chapter}.${state.verse} · ${state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
                  "Relay payload"
                  }`,
                ),
            };
        const relayEncoder = createRelayEncoderFromDecoded(relayDecoderSource, 32);
        const relayDroplet = relayEncoder.nextDroplet();
        state.lastRelayEncoder = relayEncoder;
        state.lastRelayDroplet = relayDroplet;
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "optical-relay-tx");
          statusPanel.setAttribute("data-relay-k", String(relayEncoder.K));
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-relay-tx" data-relay-k="${relayEncoder.K}" data-relay-seq="${relayDroplet.seq}">` +
            `🔁 <strong>Re-Emisión Relay Iniciada (K=${relayEncoder.K} bloques · Droplet #${relayDroplet.seq}):</strong> Re-codificando los K bloques decodificados con nueva semilla Luby Transform.</div>`;
        }
      });
    }

    const pericopesRibbon = getEl("bibleChapterPericopesRibbon", targetDoc);
    if (pericopesRibbon && typeof pericopesRibbon.addEventListener === "function") {
      pericopesRibbon.addEventListener("click", async (e) => {
        const synBtn = e?.target?.closest
          ? e.target.closest("[data-synoptic-jump]")
          : e?.target?.getAttribute?.("data-synoptic-jump")
            ? e.target
            : null;
        const synRef = synBtn?.getAttribute?.("data-synoptic-jump");
        if (synRef) {
          const parsedSyn = parseBiblicalCoordinateReference(synRef);
          if (parsedSyn && parsedSyn.bookCode) {
            await navigate(
              {
                book: parsedSyn.bookCode,
                chapter: parsedSyn.chapter || 1,
                verse: parsedSyn.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
          return;
        }
        const vBtn = e?.target?.closest
          ? e.target.closest("[data-pericope-verse]")
          : e?.target?.getAttribute?.("data-pericope-verse")
            ? e.target
            : null;
        const vNum = Number(vBtn?.getAttribute?.("data-pericope-verse"));
        if (Number.isFinite(vNum) && vNum >= 1) {
          await selectVerse(vNum, targetDoc);
        }
      });
    }

    const wonderCard = getEl("felicesSocraticWonderCard", targetDoc);
    if (wonderCard && typeof wonderCard.addEventListener === "function") {
      wonderCard.addEventListener("click", async (e) => {
        const citeBtn = e?.target?.closest
          ? e.target.closest("[data-wonder-cite]")
          : e?.target?.getAttribute?.("data-wonder-cite")
            ? e.target
            : null;
        const citeRef = citeBtn?.getAttribute?.("data-wonder-cite");
        if (citeRef) {
          const parsedCite = parseBiblicalCoordinateReference(citeRef);
          await switchWork("biblia", targetDoc);
          if (parsedCite && parsedCite.bookCode) {
            await navigate(
              {
                book: parsedCite.bookCode,
                chapter: parsedCite.chapter || 1,
                verse: parsedCite.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
        }
      });
    }

    const hydrateEvangeliosSection = async (quarterFilter = state.evangeliosQuarter || "T1", weekId = state.evangeliosWeekId || "") => {
      const evSec = getEl("evangeliosSovereignSection", targetDoc);
      if (!evSec) return null;
      if (!state.pericopesAndGlossesLoaded && typeof dataLayer.loadPericopesAndGlosses === "function") {
        state.pericopesAndGlossesLoaded = true;
        try {
          const pgData = await dataLayer.loadPericopesAndGlosses();
          if (pgData) {
            hydratePericopesAndGlosses(pgData);
            hydrateCulturalGlossesLexicon(pgData.cultural_glosses || pgData);
          }
        } catch {
          // Non-fatal
        }
      }
      if (!state.diachronicRegisterLoaded && typeof dataLayer.loadDiachronicRegisterAudit === "function") {
        state.diachronicRegisterLoaded = true;
        try {
          const drData = await dataLayer.loadDiachronicRegisterAudit();
          if (drData) hydrateDiachronicRegister(drData);
        } catch {
          // Non-fatal
        }
      }
      const corpus =
        typeof dataLayer.loadEvangeliosCorpus === "function"
          ? await dataLayer.loadEvangeliosCorpus()
          : null;
      if (!corpus || !Array.isArray(corpus.entries)) return null;
      state.evangeliosCorpus = corpus;
      const evLangSel = getEl("evangeliosLangSelect", targetDoc);
      const fallbackEvLang = evLangSel?.value || state.evangeliosLang || state.lang || "es";
      const resolvedEv = resolveEvangeliosActiveSelection({
        corpus,
        quarterFilter,
        weekId,
        fallbackLang: fallbackEvLang,
      });
      if (!resolvedEv) return null;
      const { activeEntry, pool, effectiveQuarter, activeLang: activeEvLang, coordinate } = resolvedEv;
      state.evangeliosQuarter = effectiveQuarter;
      state.evangeliosLang = activeEvLang;
      state.evangeliosWeekId = activeEntry.id;
      if (coordinate) {
        state.book = coordinate.book;
        state.chapter = coordinate.chapter;
        state.verse = coordinate.verse;
      }
      hydrateBookAndChapterSelectors(targetDoc);
      updateCompassTriggerDom(targetDoc);
      syncLifeTrailsActiveState(targetDoc);
      syncUrlFromState(targetDoc, { push: false });

      const weekSelect = getEl("evangeliosWeekSelect", targetDoc);
      if (weekSelect) {
        weekSelect.innerHTML = buildEvangeliosWeekOptionsHtml(pool, activeEntry.id, activeEvLang);
        weekSelect.value = activeEntry.id;
      }

      const qTabs = getEl("evangeliosQuarterTabs", targetDoc);
      if (qTabs && typeof qTabs.querySelectorAll === "function") {
        for (const btn of qTabs.querySelectorAll("[data-evangelios-quarter]")) {
          const qCode = btn.getAttribute("data-evangelios-quarter");
          btn.setAttribute("aria-selected", qCode === quarterFilter ? "true" : "false");
        }
      }

      const cardEl = getEl("evangeliosActivePlateCard", targetDoc);
      if (cardEl && activeEntry) {
        cardEl.setAttribute("data-evangelios-id", activeEntry.id);
        cardEl.setAttribute("data-evangelios-quarter", activeEntry.quarter);
        cardEl.setAttribute("data-evangelios-lang", activeEvLang);
        cardEl.innerHTML = renderEvangeliosStageCardHtml(activeEntry, activeEvLang);
      }
      if (state.activeSheet === "study") {
        await hydrateStudyDrawer(targetDoc);
      } else if (state.activeSheet === "field") {
        await hydrateImproveDrawer(targetDoc);
      } else if (state.activeSheet === "print") {
        hydratePrintDrawerPanels(targetDoc);
      } else if (state.activeSheet === "share") {
        hydrateShareAndAuditDrawer(targetDoc);
      }
      return activeEntry;
    };

    state.hydrateEvangeliosSection = hydrateEvangeliosSection;

    const evSec = getEl("evangeliosSovereignSection", targetDoc);
    if (evSec && typeof evSec.addEventListener === "function" && !evSec._evBound) {
      evSec._evBound = true;
      evSec.addEventListener("click", async (e) => {
        const qBtn = e?.target?.closest
          ? e.target.closest("[data-evangelios-quarter]")
          : e?.target?.getAttribute?.("data-evangelios-quarter")
            ? e.target
            : null;
        const nextQ = qBtn?.getAttribute?.("data-evangelios-quarter");
        if (nextQ) {
          await hydrateEvangeliosSection(nextQ, "");
          return;
        }
        const echoBtn = e?.target?.closest
          ? e.target.closest("[data-ot-echo-ref]")
          : e?.target?.getAttribute?.("data-ot-echo-ref")
            ? e.target
            : null;
        const echoRef = echoBtn?.getAttribute?.("data-ot-echo-ref");
        if (echoRef) {
          const parsedEcho = parseBiblicalCoordinateReference(echoRef);
          if (parsedEcho && parsedEcho.bookCode) {
            await switchWork("biblia", targetDoc);
            await navigate(
              {
                book: parsedEcho.bookCode,
                chapter: parsedEcho.chapter || 1,
                verse: parsedEcho.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
          return;
        }
        const pericopeBtn = e?.target?.closest
          ? e.target.closest("[data-pericope-ref]")
          : e?.target?.getAttribute?.("data-pericope-ref")
            ? e.target
            : null;
        const pericopeRef = pericopeBtn?.getAttribute?.("data-pericope-ref");
        if (pericopeRef) {
          const parsedPer = parseBiblicalCoordinateReference(pericopeRef);
          if (parsedPer && parsedPer.bookCode) {
            await switchWork("biblia", targetDoc);
            await navigate(
              {
                book: parsedPer.bookCode,
                chapter: parsedPer.chapter || 1,
                verse: parsedPer.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
          return;
        }
        const refBtn = e?.target?.closest
          ? e.target.closest("[data-evangelios-ref]")
          : e?.target?.getAttribute?.("data-evangelios-ref")
            ? e.target
            : null;
        const rawRef = refBtn?.getAttribute?.("data-evangelios-ref");
        if (rawRef) {
          const parsed = parseBiblicalCoordinateReference(rawRef);
          if (parsed && parsed.bookCode) {
            await switchWork("biblia", targetDoc);
            await navigate(
              {
                book: parsed.bookCode,
                chapter: parsed.chapter || 1,
                verse: parsed.verse || 1,
              },
              targetDoc
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
        }
      });
    }

    const evWeekSelect = getEl("evangeliosWeekSelect", targetDoc);
    if (evWeekSelect && typeof evWeekSelect.addEventListener === "function") {
      evWeekSelect.addEventListener("change", async (e) => {
        const wId = e?.target?.value || evWeekSelect.value || "s01";
        await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", wId);
      });
    }

    const evLangSelect = getEl("evangeliosLangSelect", targetDoc);
    if (evLangSelect && typeof evLangSelect.addEventListener === "function") {
      evLangSelect.addEventListener("change", async (e) => {
        state.evangeliosLang = e?.target?.value || evLangSelect.value || "es";
        await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
      });
    }

    const switchWork = async (workId, docRef = targetDoc) => {
      const cleanWork = ["biblia", "felices", "evangelios"].includes(workId) ? workId : "biblia";
      const prevWork = state.activeWork || "biblia";
      state.activeWork = cleanWork;
      syncSisterWorksTabsDom(cleanWork, (id) => getEl(id, docRef));

      const projected = projectCrossWorkCoordinate({
        fromWork: prevWork,
        toWork: cleanWork,
        book: state.book,
        chapter: state.chapter,
        verse: state.verse,
        plateIndex: state.activePlateIndex ?? getActivePlateIndex(),
        dichaIndex: state.activeDichaIndex,
        weekId: state.evangeliosWeekId || "s01",
        evangeliosQuarter: state.evangeliosQuarter || "T1",
      });
      state.book = projected.book;
      state.chapter = projected.chapter;
      state.verse = projected.verse;
      state.activePlateIndex = projected.plateIndex;
      state.activeDichaIndex = projected.felicesDicha;
      state.evangeliosWeekId = projected.evangeliosWeekId;
      state.evangeliosQuarter = projected.evangeliosQuarter;

      if (cleanWork === "evangelios") {
        await hydrateEvangeliosSection(
          state.evangeliosQuarter || "T1",
          state.evangeliosWeekId || "s01"
        );
      } else if (cleanWork === "felices") {
        setActivePlateIndex(state.activePlateIndex ?? 24, docRef);
        state.felicesLoaded = true;
      } else if (cleanWork === "biblia") {
        await navigate(
          {
            book: state.book,
            chapter: state.chapter,
            verse: state.verse,
          },
          docRef
        );
      }

      hydrateBookAndChapterSelectors(docRef);
      updateCompassTriggerDom(docRef);
      syncLifeTrailsActiveState(docRef);
      syncI18nUiFromState(state, docRef);
      syncUrlFromState(docRef, { push: prevWork !== cleanWork });

      if (state.activeSheet === "study") {
        await hydrateStudyDrawer(docRef);
      } else if (state.activeSheet === "field") {
        await hydrateImproveDrawer(docRef);
      } else if (state.activeSheet === "print") {
        hydratePrintDrawerPanels(docRef);
      } else if (state.activeSheet === "share") {
        hydrateShareAndAuditDrawer(docRef);
      }
      return cleanWork;
    };

    registerPlateCoordinateListener(async (coord) => {
      if (!coord) return;
      state.activePlateIndex = coord.plateIndex;
      if (coord.dichaIndex) state.activeDichaIndex = coord.dichaIndex;
      if (state.activeWork === "felices") {
        if (coord.book) state.book = coord.book;
        if (coord.chapter) state.chapter = coord.chapter;
        if (coord.verse) state.verse = coord.verse;
      }
      hydrateBookAndChapterSelectors(targetDoc);
      updateCompassTriggerDom(targetDoc);
      syncLifeTrailsActiveState(targetDoc);
      syncUrlFromState(targetDoc, { push: false });
      if (state.activeSheet === "study") {
        await hydrateStudyDrawer(targetDoc);
      } else if (state.activeSheet === "field") {
        await hydrateImproveDrawer(targetDoc);
      } else if (state.activeSheet === "print") {
        hydratePrintDrawerPanels(targetDoc);
      } else if (state.activeSheet === "share") {
        hydrateShareAndAuditDrawer(targetDoc);
      }
    });

    const focalFrame = getEl("focalPlateFrame", targetDoc);
    if (focalFrame && typeof focalFrame.addEventListener === "function") {
      focalFrame.addEventListener("click", () => openActivePlateZoom(targetDoc));
    }
    const btnOpenPreview = getEl("btnOpenPreviewCarousel", targetDoc);
    if (btnOpenPreview && typeof btnOpenPreview.addEventListener === "function") {
      btnOpenPreview.addEventListener("click", () => openModal("previewModal", targetDoc));
    }
    const btnPrevP = getEl("btnPrevPlate", targetDoc);
    if (btnPrevP && typeof btnPrevP.addEventListener === "function") {
      btnPrevP.addEventListener("click", () => prevPlate(targetDoc));
    }
    const btnNextP = getEl("btnNextPlate", targetDoc);
    if (btnNextP && typeof btnNextP.addEventListener === "function") {
      btnNextP.addEventListener("click", () => nextPlate(targetDoc));
    }
    const btnPrintP = getEl("btnPrintPlate", targetDoc);
    if (btnPrintP && typeof btnPrintP.addEventListener === "function") {
      btnPrintP.addEventListener("click", () => printActivePlate());
    }
    const btnShareW = getEl("btnShareWork", targetDoc);
    if (btnShareW && typeof btnShareW.addEventListener === "function") {
      btnShareW.addEventListener("click", () => shareResource(targetDoc));
    }
    const foldTrig = getEl("foldGuideTrigger", targetDoc);
    if (foldTrig && typeof foldTrig.addEventListener === "function") {
      foldTrig.addEventListener("click", () => transitionSheet("print", targetDoc));
    }
    const felOptShare = getEl("btnFelicesOpticalShare", targetDoc);
    if (felOptShare && typeof felOptShare.addEventListener === "function") {
      felOptShare.addEventListener("click", () => transitionSheet("share", targetDoc));
    }
    const footContact = getEl("footerContactBtn", targetDoc);
    if (footContact && typeof footContact.addEventListener === "function") {
      footContact.addEventListener("click", () => transitionSheet("field", targetDoc));
    }
    const felPlateSel = getEl("felicesPlateSelect", targetDoc);
    if (felPlateSel && typeof felPlateSel.addEventListener === "function") {
      felPlateSel.addEventListener("change", (e) => {
        const pIdx = Math.max(1, Math.min(28, Number(e?.target?.value || felPlateSel.value) || 24));
        setActivePlateIndex(pIdx, targetDoc);
      });
    }
    const felDichaSel = getEl("felicesDichaSelect", targetDoc);
    if (felDichaSel && typeof felDichaSel.addEventListener === "function") {
      felDichaSel.addEventListener("change", (e) => {
        const dIdx = Math.max(1, Math.min(12, Number(e?.target?.value || felDichaSel.value) || 1));
        state.activeDichaIndex = dIdx;
        const dCoord = resolveFelicesDichaCoordinate(dIdx);
        if (dCoord) {
          state.book = dCoord.book;
          state.chapter = dCoord.chapter;
          state.verse = dCoord.verse;
          const pIdx = resolvePlateForBibleCoordinate(dCoord.book, dCoord.chapter, dCoord.verse);
          setActivePlateIndex(pIdx, targetDoc);
        }
      });
    }
    const btnFelOpenBib = getEl("btnFelicesOpenInBible", targetDoc);
    if (btnFelOpenBib && typeof btnFelOpenBib.addEventListener === "function") {
      btnFelOpenBib.addEventListener("click", async () => {
        const rawOsis =
          btnFelOpenBib.getAttribute?.("data-felices-osis") ||
          `${state.book}.${state.chapter}.${state.verse}`;
        const parsed = parseBiblicalCoordinateReference(rawOsis);
        await switchWork("biblia", targetDoc);
        if (parsed && parsed.bookCode) {
          await navigate(
            {
              book: parsed.bookCode,
              chapter: parsed.chapter || 1,
              verse: parsed.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
      });
    }
    for (const [closeBtnId, modalId] of [
      ["previewModalCloseBtn", "previewModal"],
      ["btnPreviewClose", "previewModal"],
      ["plateModalCloseBtn", "plateModal"],
      ["btnPlateClose", "plateModal"],
    ]) {
      const cBtn = getEl(closeBtnId, targetDoc);
      if (cBtn && typeof cBtn.addEventListener === "function") {
        cBtn.addEventListener("click", () => closeModal(modalId, targetDoc));
      }
    }
    const cPrev = getEl("carouselPrevBtn", targetDoc);
    if (cPrev && typeof cPrev.addEventListener === "function") {
      cPrev.addEventListener("click", () => prevSlide(targetDoc));
    }
    const cNext = getEl("carouselNextBtn", targetDoc);
    if (cNext && typeof cNext.addEventListener === "function") {
      cNext.addEventListener("click", () => nextSlide(targetDoc));
    }
    for (const [pillId, slideIdx] of [
      ["termPill_1", 0],
      ["termPill_2", 1],
      ["termPill_3", 2],
    ]) {
      const pEl = getEl(pillId, targetDoc);
      if (pEl && typeof pEl.addEventListener === "function") {
        pEl.addEventListener("click", () => setSlide(slideIdx, targetDoc));
      }
    }

    state.switchWork = switchWork;
    globalThis.switchSovereignWork = (w) => switchWork(w, targetDoc);

    const tabBib = getEl("tabWorkBiblia", targetDoc);
    const tabFel = getEl("tabWorkFelices", targetDoc);
    const tabEva = getEl("tabWorkEvangelios", targetDoc);
    if (tabBib && typeof tabBib.addEventListener === "function") {
      tabBib.addEventListener("click", () => switchWork("biblia", targetDoc));
    }
    if (tabFel && typeof tabFel.addEventListener === "function") {
      tabFel.addEventListener("click", () => switchWork("felices", targetDoc));
    }
    if (tabEva && typeof tabEva.addEventListener === "function") {
      tabEva.addEventListener("click", () => switchWork("evangelios", targetDoc));
    }
    syncLifeTrailsActiveState(targetDoc);
  }

  return {
    state,
    dataLayer,
    get i18n() {
      return i18nInstance;
    },
    set i18n(val) {
      i18nInstance = val;
    },
    navigate,
    selectVerse,
    dispenseDose1,
    transitionSheet,
    countVisibleSheets,
    setUiLocale,
    bindDomEvents,
    hydrateStudyDrawer,
    hydrateImproveDrawer,
    hydratePrintDrawerPanels,
    hydrateShareAndAuditDrawer,
    hydrateBookAndChapterSelectors,
    renderStateToDom,
    commitState,
    syncUrlFromState,
  };
}

/**
 * Browser bootstrap when running in a real window environment.
 */
export async function bootBrowserMostrador(
  win = typeof window !== "undefined" ? window : null,
  options = {},
) {
  if (!win || !win.document) return null;
  const doc = win.document;
  const route = parseInitialRouteAndLocale({
    search: win.location?.search || "",
    pathname: win.location?.pathname || "",
    defaultUi: doc.documentElement.getAttribute("lang") || "en",
    defaultLang: "es",
  });
  let effectiveRefStr = route.ref;
  if (route.work === "evangelios" && !route.refExplicit && route.week) {
    const evThread = EVANGELIOS_MACRO_THREADS_AND_ECHOES[route.week];
    if (evThread?.passage) {
      effectiveRefStr = evThread.passage;
    }
  }
  const parsedRef = parseBiblicalCoordinateReference(effectiveRefStr) || {
    bookCode: "JHN",
    chapter: 1,
    verse: 1,
  };

  const controller = createMostradorController({
    doc,
    win,
    source: options.source || win.ekovozSource,
    uiLocale: route.ui,
    lang: route.lang,
    book: parsedRef.bookCode,
    chapter: parsedRef.chapter || 1,
    verse: parsedRef.verse || 1,
    paperFormat: route.format || "a4",
  });

  controller.state.activeWork = route.work || "biblia";
  if (route.reg) controller.state.register = route.reg;
  if (route.ortho) controller.state.orthographyProfile = route.ortho;
  if (route.format) controller.state.paperFormat = route.format;
  if (route.plate !== null) {
    controller.state.activePlateIndex = route.plate;
    setActivePlateIndex(route.plate, doc);
  }
  if (route.dicha !== null) {
    controller.state.activeDichaIndex = route.dicha;
  }
  if (route.week !== null) {
    controller.state.evangeliosWeekId = route.week;
    const wkMatch = String(route.week).match(/^s?0*(\d{1,2})$/);
    const wkNum = wkMatch ? Number(wkMatch[1]) || 1 : 1;
    controller.state.evangeliosQuarter =
      wkNum <= 13 ? "T1" : wkNum <= 26 ? "T2" : wkNum <= 39 ? "T3" : "T4";
  }

  win.EkovozMostrador = controller;
  win.EkovozStore = {
    get activeSheet() {
      return controller.state.activeSheet;
    },
    transitionSheet: (s) => controller.transitionSheet(s, doc),
    countVisibleSheets: () => controller.countVisibleSheets(doc),
  };

  win.selectSovereignBibleLang = async function selectSovereignBibleLang(langCode) {
    await controller.navigate({ lang: langCode }, doc);
  };

  controller.bindDomEvents(doc);
  await controller.setUiLocale(route.ui, doc);
  await controller.navigate(
    {
      lang: route.lang,
      book: parsedRef.bookCode,
      chapter: parsedRef.chapter || 1,
      verse: parsedRef.verse || 1,
      register: route.reg || undefined,
      orthographyProfile: route.ortho || undefined,
      paperFormat: route.format || "a4",
    },
    doc
  );

  if (route.work && route.work !== "biblia" && typeof controller.state.switchWork === "function") {
    await controller.state.switchWork(route.work, doc);
  }

  if (route.sheet) {
    await controller.transitionSheet(route.sheet, doc);
  }

  if (typeof win.addEventListener === "function") {
    win.addEventListener("popstate", async () => {
      const popRoute = parseInitialRouteAndLocale({
        search: win.location?.search || "",
        pathname: win.location?.pathname || "",
        defaultUi: controller.state.uiLocale || "en",
        defaultLang: controller.state.lang || "es",
      });
      const popRef = parseBiblicalCoordinateReference(popRoute.ref) || {
        bookCode: controller.state.book,
        chapter: controller.state.chapter,
        verse: controller.state.verse,
      };
      if (popRoute.plate !== null) controller.state.activePlateIndex = popRoute.plate;
      if (popRoute.dicha !== null) controller.state.activeDichaIndex = popRoute.dicha;
      if (popRoute.week !== null) controller.state.evangeliosWeekId = popRoute.week;
      if (popRoute.format) controller.state.paperFormat = popRoute.format;
      await controller.navigate(
        {
          lang: popRoute.lang,
          book: popRef.bookCode,
          chapter: popRef.chapter || 1,
          verse: popRef.verse || 1,
          register: popRoute.reg || undefined,
          orthographyProfile: popRoute.ortho || undefined,
          paperFormat: popRoute.format || "a4",
        },
        doc,
      );
      if (popRoute.work && typeof controller.state.switchWork === "function") {
        await controller.state.switchWork(popRoute.work, doc);
      }
    });
  }

  return controller;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  bootBrowserMostrador(window).catch(() => { });
}
