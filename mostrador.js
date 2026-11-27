// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | Decisiones 2C, 3C, 17C, 18C, 22C, 30C, 46C, 48C | test_spatial_nav_roll_mode_drawer_and_mini_pdf_slice]
// web/mostrador.js — Sovereign Browser Dispenser & Data Layer Controller (Ronda 20)
// Pure browser runtime: zero Node filesystem APIs, zero synthetic fallbacks, zero Type3 fake PDFs.
// ============================================================================

import {
FELICES_PLATE_TO_BIBLE_COORDINATE, applyAriaLabelsToDom, resolvePlateForBibleCoordinate,
serializeMostradorRouteQuery, setActivePlateIndex, setPaperFormat, syncFelicesWithCorpusLang, syncI18nUiFromState, updateUI,
} from "./i18n_ui.js";
import {
CROSS_WORK_BRIDGE_TABLE, HAREL_SHEET_MAP, LIFE_TRAILS_ANCHORS, MOSTRADOR_DOM_BINDINGS, MULTI_ORTHO_LANGS, POETIC_BOOKS,
REGIONAL_BRIDGE_LANGUAGES_10, applyOrthographyProfile, deriveEpistemicSeal, escapeHtml, formatActiveCorpusBadgeText,
lookupWordTokenStrongEntry, projectCrossWorkCoordinate, renderChapterPreviewHtml, renderDiglossicParallelBridge,
renderInteractiveVerseTokensHtml, resolveRegionalBridgeLanguage21, syncOrthographyPillsVisibilityInDom, toUnicodeSuperscript,
} from "./mostrador/bridge_and_chapter.js";
import {
ARTIFACT_PROJECTION_SCHEMA, MOSTRADOR_DOM_SCOPE_CONTRACTS, STATUS, computeProsodyAndSyllableAlignmentInWasm, createDataLayer,
createFetchSource, loadNsmRealiaLexicon, projectNsmRealiaLexicon3NF, resolveLocalizedBookMeta, verifyArtifactProjectionClosure, verifyVplDomScopeContainment,
} from "./mostrador/data_layer.js";
import {
applySpanish21DiachronicRegister, computeAnalyticalRegisterMetrics, hasDiachronicVariants, hydrateDiachronicRegister,
renderAnalyticalThermometerHtml, renderChapterDiachronicAuditCardHtml, renderUnifiedDiachronicContextHtml, resolveEffectiveCorpusTarget,
summarizeChapterDiachronicTransformations, syncDiachronicRegisterOrthogonality,
} from "./mostrador/diachronic_register.js";
import { isVerifiedCanonicalTier0Or1, mapFullChapterGmisRows, renderProgressiveTwoStrataDiglossicBridge, resolveHonestSovereignTier, resolveSelectableBridgeLang } from "./mostrador/diglossic_chapter_renderer.js";
import { patchStoreState } from "./mostrador/dom_patch.js";
import { auditSingleOwnerContract, resolveCapabilityIntentLayer } from "./mostrador/dom_projection_contracts.js";
import {
CANONICAL_12_BRANCH_PROFILES, CANONICAL_14_PLUS_2_EDITIONS_CATALOG, CANONICAL_14_PRINT_PROFILES, CANONICAL_16_TYPOLOGY_PROFILES,
CANONICAL_80_BLOCKS_CATALOG, CANONICAL_9_TOML_PROFILES, POCKET_REFUGE_4_SHEETS_SPEC, PRECOMPILED_PDF_LANGS, VERIFIED_TEXT_BIBLE_LANGS,
buildCssPagedMediaPrintHtml, computeFoliationLayout, computeKindlePrintBudget, computeMultiSignatureImposition, doseFilename,
effectiveThreatClassWeb, listAll14PrintEditionsForLang, listCatalogEditionsForLang, locateVersePage, normalizeEditionSlug, ordinalOf,
planBimodalClientPrint, planDose1, planDose2, planDose3, refOfOrdinal, renderBranchAndTypologyInspectorHtml, renderImpositionAndLayoutPreviewHtml,
renderMultiSignatureAndPocketRefugeHtml, resolveCanonicalBlockForPassage, resolvePrintEditionPdfAssetUrl,
simulateFifthGenPhotocopySauvolaBilateral, simulateThirdGenPhotocopySauvola, stealthNeutralFilenameWeb,
syncPrintDrawerControlsFromEditionProfile, typesetTandaPdfBytes,
} from "./mostrador/dosis.js";
import {
HAREL_DOSIS_SUBTABS, HAREL_PRINT_SUBTABS, HAREL_STUDY_SUBTABS, HAREL_WORKSHOP_SUBTABS,
applyStaticChromeTranslations, formatPhotocopySimBadgeText, hydrateBookNamesSourceBadge, hydrateImproveDrawerPanel,
hydrateLifeTrailsFromPericopesArtifact, hydratePrintDrawerPanelsInDrawer, hydrateShareAndAuditDrawerPanel, hydrateStudyDrawerPanel,
hydrateWasmManifestStatus, renderCrdtWalAndLockP2AuditCardHtml, renderMasterCensus7164CardHtml,
renderPhotocopyResilienceAndSocialCardHtml, renderPrintDrawerPanelsSyncInDrawer, syncActiveStrongInStudyDrawer,
} from "./mostrador/drawer_hydrators.js";
import { revokePrintObjectUrls } from "./mostrador/drawer_print.js";
import { bindShareDrawerActionEvents } from "./mostrador/drawer_share.js";
import { ensureStateOverlaysHydrated, resolveOverlayEntryForOsis, resolveVerseWithOverlay } from "./mostrador/drawer_workshop.js";
import {
classifyMaculaArgumentRole, highlightStudyCardByStrongId, hydrateCulturalGlossesLexicon, renderLeipzig4LineGmisHtml,
renderPhilologyRosettaExplorerHtml, renderPhilologyRosettaInspectorHtml, renderPhilologyRosettaResultsRowsHtml,
renderStudy14ColDrawerHtml, renderStudyStrataCards, resolveBicanonicalDivergence, searchPhilologyRosettaIndex,
} from "./mostrador/estudio.js";
import {
EVANGELIOS_MACRO_THREADS_AND_ECHOES, FELICES_12_DICHAS_COORDINATE_MAP, FELICES_28_PLATES_MAP, hydratePericopesAndGlosses,
parseCanonicalOtEchoRef, renderChapterPericopesRibbonHtml, renderEvangeliosPlateActionsHtml, renderFelicesSocraticWonderCardHtml,
resolveEvangeliosMacroThreadAndEcho, resolveFelicesDichaCoordinate, resolveFelicesPlate,
resolveMasoreticPericopeBreaks,
} from "./mostrador/evangelios.js";
import { bindFelicesStageEvents } from "./mostrador/felices_stage_controller.js";
import {
applyToDom, createI18n, formatLocalizedNumeralWeb, isRtlLocale, localizeWorkChromeLabels, negotiate, requestedUiLocales,
} from "./mostrador/i18n.js";
import { GEOGRAPHIC_MACRO_REGIONS, indexRegionShards, listCountriesInRegion, listLanguagesInCountry, listMacroRegions, lookupIso639MacroRegionO1, searchLanguages, suggestLayer0Languages } from "./mostrador/lang_funnel.js";
import {
CRDT_WAL_SEMILATTICE, FIELD_WORKSHOP_STP_LEXICON, IMPROVE_I18N_FALLBACKS, IMPROVE_I18N_FALLBACKS_ES, MASTER_CENSUS_SUMMARY,
PATCH_JOURNAL_LOCK_P2, ROOT_NOTES_STP, STP_LEDGER_SUMMARY, applySuggestedImprovement, buildElicitationSeedPayload,
foldCrdtWalSemilattice, propagateCascadeL1ToL5, renderCascadeAndLadderHtml, renderImproveDrawerHtml, renderStpLexiconExplorerHtml,
renderStpLexiconResultsRowsHtml, renderTallerArtifactsCatalogHtml, selectTopEntropyVerseQueue, verifyLock8PredicativeAndNegation,
} from "./mostrador/mejorar.js";
import { dispenseMostradorDose1, renderMostradorViewportFromState, updateMostradorDoseLinks, updateMostradorSealDom } from "./mostrador/mostrador_viewport_dose1.js";
import {
CANONICAL_ECO_PACKS_MANIFEST, STORED_ECO_PACKS, computeEcoPackCrc32Hex,
ensureVaultHydrated,
exportSneakernetBundleJson, hydrateEcoPacksManifest,
importSneakernetBundleJson, probeEcoPackRandomAccessBounds, renderOfflineMeshEcoCardHtml, triggerOptInOfflinePackDownload,
verifyAndStoreEcoPack,
} from "./mostrador/offline_mesh.js";
import {
LTDecoder, LTEncoder, OPTICAL_CADENCE_PRESETS, computeNyquistSafeFpsViaWasm, createRelayEncoderFromDecoded, decodeLubyTransformPeeling,
dlog, encodeLubyTransformDroplets, renderOpticalReceiverRxPanelHtml, runOpticalReceiverBurstSession, solitonCdf, splitmix64,
whitenBlockXor,
} from "./mostrador/optical_lt.js";
import { bindOralPorticoToggleEvent } from "./mostrador/oral_portico_wasm.js";
import {
ReverseOrthographyMap, listOrthographyProfilesForLang, resolveCanonicalOrthoProfileId, resolveOrthoFamilyKey,
resolveScriptioContinuaCodeForLang, segmentScriptioContinuaSyllables, transduceOrthographyWeb, transduceVerseWithReverseMap,
} from "./mostrador/orthography_wfst.js";
import { countPdfPages, extractPdfPages } from "./mostrador/pdf_pages.js";
import { SINGLE_OWNER_CAPABILITY_MAP, projectStoreAttributesToDom, syncStickyDrawerContextHeader } from "./mostrador/projection_contract.js";
import {
ROSETTA_66_BOOKS, createReferenceResolver, normalizeBookAliasToken, parseBiblicalCoordinateReference, resolveBookCodeByAliasOrName,
} from "./mostrador/reference.js";
import {
bindSisterWorksStageEvents, buildEvangeliosWeekOptionsHtml, renderEvangeliosStageCardHtml,
resolveEvangeliosActiveSelection, syncSisterWorksTabsDom,
} from "./mostrador/sister_works_controller.js";
import { bindStageDomEvents } from "./mostrador/stage_dom_bindings.js";
import {
closeSheet, createEkovozStore, createGuardedStateProxy, openSheet, setActiveIntent, toggleSheet,
} from "./mostrador/state_store.js";
import { applyInitialSurfaceModeFromUrl, createSurfaceCompositor, projectSubtabGroupToDom, projectSurfaceLayoutFromState } from "./mostrador/surface_compositor.js";
import {
parseInitialRouteAndLocale, resolveDefaultCorpusLangForUi,
} from "./mostrador/url_route_lens.js";

export {
ARTIFACT_PROJECTION_SCHEMA, CANONICAL_12_BRANCH_PROFILES, CANONICAL_14_PLUS_2_EDITIONS_CATALOG, CANONICAL_14_PRINT_PROFILES, CANONICAL_16_TYPOLOGY_PROFILES, CANONICAL_80_BLOCKS_CATALOG, CANONICAL_9_TOML_PROFILES, CANONICAL_ECO_PACKS_MANIFEST, CRDT_WAL_SEMILATTICE, CROSS_WORK_BRIDGE_TABLE, EVANGELIOS_MACRO_THREADS_AND_ECHOES, FELICES_12_DICHAS_COORDINATE_MAP, FELICES_28_PLATES_MAP, FELICES_PLATE_TO_BIBLE_COORDINATE, FIELD_WORKSHOP_STP_LEXICON, GEOGRAPHIC_MACRO_REGIONS,
HAREL_DOSIS_SUBTABS, HAREL_PRINT_SUBTABS, HAREL_SHEET_MAP, HAREL_STUDY_SUBTABS, HAREL_WORKSHOP_SUBTABS, IMPROVE_I18N_FALLBACKS, IMPROVE_I18N_FALLBACKS_ES, LIFE_TRAILS_ANCHORS, LTDecoder, LTEncoder, MASTER_CENSUS_SUMMARY, MOSTRADOR_DOM_BINDINGS, MOSTRADOR_DOM_SCOPE_CONTRACTS, MULTI_ORTHO_LANGS, OPTICAL_CADENCE_PRESETS, PATCH_JOURNAL_LOCK_P2, POCKET_REFUGE_4_SHEETS_SPEC, POETIC_BOOKS, PRECOMPILED_PDF_LANGS, ROOT_NOTES_STP, ROSETTA_66_BOOKS, ReverseOrthographyMap, STATUS, STORED_ECO_PACKS, STP_LEDGER_SUMMARY, VERIFIED_TEXT_BIBLE_LANGS, applyOrthographyProfile, applySpanish21DiachronicRegister, applyStaticChromeTranslations, applySuggestedImprovement, applyToDom, buildCssPagedMediaPrintHtml, buildElicitationSeedPayload, buildEvangeliosWeekOptionsHtml, classifyMaculaArgumentRole, computeAnalyticalRegisterMetrics, computeEcoPackCrc32Hex, computeFoliationLayout, computeKindlePrintBudget, computeMultiSignatureImposition, computeNyquistSafeFpsViaWasm, computeProsodyAndSyllableAlignmentInWasm, countPdfPages, createDataLayer, createFetchSource, createI18n, createReferenceResolver, createRelayEncoderFromDecoded, decodeLubyTransformPeeling, deriveEpistemicSeal, dlog, doseFilename, effectiveThreatClassWeb, encodeLubyTransformDroplets, escapeHtml, exportSneakernetBundleJson, extractPdfPages, foldCrdtWalSemilattice, formatLocalizedNumeralWeb, formatPhotocopySimBadgeText, hasDiachronicVariants, highlightStudyCardByStrongId, hydrateBookNamesSourceBadge, hydrateCulturalGlossesLexicon, hydrateEcoPacksManifest, hydrateLifeTrailsFromPericopesArtifact, hydrateWasmManifestStatus, importSneakernetBundleJson, indexRegionShards, isRtlLocale, listAll14PrintEditionsForLang, listCatalogEditionsForLang, listCountriesInRegion,
listLanguagesInCountry, listMacroRegions, listOrthographyProfilesForLang, locateVersePage, lookupWordTokenStrongEntry, negotiate, normalizeBookAliasToken, normalizeEditionSlug, ordinalOf, parseBiblicalCoordinateReference, parseCanonicalOtEchoRef, parseInitialRouteAndLocale, patchStoreState, planBimodalClientPrint, planDose1,
planDose2,
planDose3, probeEcoPackRandomAccessBounds, projectCrossWorkCoordinate, projectSubtabGroupToDom, propagateCascadeL1ToL5, refOfOrdinal, renderAnalyticalThermometerHtml, renderBranchAndTypologyInspectorHtml, renderCascadeAndLadderHtml, renderChapterDiachronicAuditCardHtml, renderChapterPericopesRibbonHtml, renderChapterPreviewHtml, renderCrdtWalAndLockP2AuditCardHtml, renderDiglossicParallelBridge, renderEvangeliosPlateActionsHtml, renderEvangeliosStageCardHtml, renderFelicesSocraticWonderCardHtml, renderImpositionAndLayoutPreviewHtml, renderImproveDrawerHtml, renderInteractiveVerseTokensHtml, renderLeipzig4LineGmisHtml, renderMasterCensus7164CardHtml, renderMultiSignatureAndPocketRefugeHtml, renderOfflineMeshEcoCardHtml, renderOpticalReceiverRxPanelHtml, renderPhilologyRosettaExplorerHtml, renderPhilologyRosettaInspectorHtml, renderPhilologyRosettaResultsRowsHtml, renderPhotocopyResilienceAndSocialCardHtml, renderStpLexiconExplorerHtml, renderStpLexiconResultsRowsHtml, renderStudy14ColDrawerHtml,
renderStudyStrataCards, renderTallerArtifactsCatalogHtml, renderUnifiedDiachronicContextHtml, resolveBicanonicalDivergence, resolveBookCodeByAliasOrName, resolveCanonicalBlockForPassage, resolveCanonicalOrthoProfileId, resolveEffectiveCorpusTarget, resolveEvangeliosActiveSelection, resolveEvangeliosMacroThreadAndEcho, resolveFelicesDichaCoordinate, resolveFelicesPlate, resolveLocalizedBookMeta, resolveMasoreticPericopeBreaks, resolveOrthoFamilyKey, resolveOverlayEntryForOsis, resolvePlateForBibleCoordinate, resolvePrintEditionPdfAssetUrl, resolveRegionalBridgeLanguage21, resolveScriptioContinuaCodeForLang, resolveVerseWithOverlay, runOpticalReceiverBurstSession, searchLanguages, searchPhilologyRosettaIndex, segmentScriptioContinuaSyllables, selectTopEntropyVerseQueue, serializeMostradorRouteQuery, setActiveIntent, setPaperFormat, simulateFifthGenPhotocopySauvolaBilateral, simulateThirdGenPhotocopySauvola, solitonCdf,
splitmix64, stealthNeutralFilenameWeb, suggestLayer0Languages, summarizeChapterDiachronicTransformations, syncActiveStrongInStudyDrawer, syncDiachronicRegisterOrthogonality, syncFelicesWithCorpusLang, syncI18nUiFromState, syncPrintDrawerControlsFromEditionProfile, syncSisterWorksTabsDom, toUnicodeSuperscript, transduceOrthographyWeb, transduceVerseWithReverseMap, triggerOptInOfflinePackDownload, typesetTandaPdfBytes, updateUI, verifyAndStoreEcoPack, verifyArtifactProjectionClosure, verifyLock8PredicativeAndNegation, verifyVplDomScopeContainment, whitenBlockXor
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
uiLocale: options.uiLocale || (options.lang && options.lang !== "en" ? "es" : "en"),
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
fontSizePt: Number(options.fontSizePt) || 9.5,
orientation: options.orientation || "portrait",
register: options.register || "intergeneracional",
rollMode: options.rollMode || "chapter",
oralPorticoActive: Boolean(options.oralPorticoActive),
orthographyProfile: options.orthographyProfile || "inali",
activeWork: options.activeWork || "biblia",
activeModal: null,
activeSheet: null,
mobileSheetOpen: false,
userTouchedSheet: false,
intentSeq: 0,
activeIntent: options.activeIntent || (options.surfaceMode === "studio" ? "study" : "read"),
surfaceMode: options.surfaceMode || "reader",
appearanceTheme: options.appearanceTheme || "light",
fontFamily: options.fontFamily || "serif",
fontScale: Number(options.fontScale) || 1.0,
stealthMode: Boolean(options.stealthMode),
corpusLang: options.lang || "es",
status: STATUS.IDLE,
seal: "seal.loading",
lastNavResult: null,
lastBridgeChapter: null,
studyLoaded: false,
improveLoaded: false,
felicesLoaded: false,
audioTotalMs: Number(options.audioTotalMs) || 0,
pendingCascadeSignatureHex: String(options.pendingCascadeSignatureHex || ""),
pendingCascadePublicKeyHex: String(options.pendingCascadePublicKeyHex || ""),
pendingCommunityVotes: Array.isArray(options.pendingCommunityVotes) ? options.pendingCommunityVotes : [],
pendingExpectedCrc32Hex: String(options.pendingExpectedCrc32Hex || ""),
};
const store = createEkovozStore(state, { backingState: state });
const guardedState = createGuardedStateProxy(store, { strictWrites: false });

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
updateMostradorSealDom({ sealKey, state, i18nInstance, getEl, targetDoc });
}

function syncOrthographyPillsVisibility(targetDoc = doc) {
syncOrthographyPillsVisibilityInDom({ state, targetDoc, getEl });
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
return `<button type="button" class="uls-chip compass-book-cell" data-compass-book="${escapeHtml(
b.code
)}" data-nsm-subtitle="${escapeHtml(nsmSub)}" title="${escapeHtml(
nsmSub ? `${title} — ${nsmSub}` : title
)}"${active}><strong>${escapeHtml(
b.code
)}</strong><small class="compass-book-title">${escapeHtml(
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
return renderMostradorViewportFromState({
state,
dataLayer,
i18nInstance,
getEl,
targetDoc,
});
}

function syncLifeTrailsActiveState(targetDoc = doc) {
if (!targetDoc) return;
if (state.activeTrailId) {
const activeAnchor = LIFE_TRAILS_ANCHORS[state.activeTrailId];
const chNum = Number(state.chapter);
const isCreationSpan = state.activeTrailId === "btnTrailCreacion" && state.book === "GEN" && (chNum === 1 || chNum === 2);
const matchesAnchor = activeAnchor && state.book === activeAnchor.book && (isCreationSpan || chNum === Number(activeAnchor.chapter));
if (!matchesAnchor) state.activeTrailId = null;
}
for (const trailBtnId of Object.keys(LIFE_TRAILS_ANCHORS)) {
const tBtn = getEl(trailBtnId, targetDoc);
if (tBtn && typeof tBtn.setAttribute === "function") {
const isActive = Boolean(state.activeTrailId) && state.activeTrailId === trailBtnId;
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

function syncActiveChromeProjection(targetDoc = doc) {
projectStoreAttributesToDom(state, targetDoc);
const hasMountedSheetPanels = Object.values(HAREL_SHEET_MAP).some((cfg) =>
Boolean(getEl(cfg.panelId, targetDoc)),
);
const visibleCount = countVisibleSheets(targetDoc);
const effectiveState =
state.activeSheet && hasMountedSheetPanels && visibleCount === 0
? { ...state, activeSheet: null }
: state;
return syncStickyDrawerContextHeader(effectiveState, getEl, targetDoc);
}

function syncActiveCorpusLabelDom(targetDoc = doc) {
const corpusLbl = getEl("sovereignActiveCorpusLabel", targetDoc);
if (!corpusLbl) return;
const packsCount =
Array.isArray(state.availablePackLangs24) && state.availablePackLangs24.length > 0
? state.availablePackLangs24.length
: 24;
corpusLbl.textContent = formatActiveCorpusBadgeText(state.lang, packsCount, state.uiLocale, {
activeWork: state.activeWork,
register: state.register,
});
}

function renderStateToDom(targetDoc = doc, { syncUrl = true, pushUrl = false } = {}) {
if (!targetDoc) return state.lastSerializedUrl || "";
if (!state._singleOwnerChecked && typeof targetDoc?.body?.innerHTML === "string") {
state._singleOwnerChecked = auditSingleOwnerContract(targetDoc.body.innerHTML).ok;
}
hydrateBookAndChapterSelectors(targetDoc);
updateCompassTriggerDom(targetDoc);
syncOrthographyPillsVisibility(targetDoc);
syncLifeTrailsActiveState(targetDoc);
syncActiveCorpusLabelDom(targetDoc);
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
syncActiveChromeProjection(targetDoc);
if (!state.macroRegionsCatalog) {
state.macroRegionsCatalog = listMacroRegions(state.i18n);
}
suggestLayer0Languages({
regionIso2: state.countryIso2 || "MX",
navigatorLanguages: [state.uiLocale || "es", state.lang || "es"],
});
const chromeLabels = localizeWorkChromeLabels(state.uiLocale || "en");
const tabEvEl = getEl("tabWorkEvangelios", targetDoc);
if (tabEvEl && chromeLabels.evangeliosTab) {
tabEvEl.textContent = chromeLabels.evangeliosTab;
}
if (state.lastNavResult && state.lastNavResult.status === STATUS.READY) {
renderViewportFromState(targetDoc);
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
syncActiveChromeProjection(targetDoc);
return state;
}

async function selectVerse(verseNumber, targetDoc = doc) {
state.verse = Math.max(1, Number(verseNumber) || 1);
renderViewportFromState(targetDoc);
updateCompassTriggerDom(targetDoc);
syncLifeTrailsActiveState(targetDoc);
syncI18nUiFromState(state, targetDoc);
syncActiveChromeProjection(targetDoc);
syncUrlFromState(targetDoc, { push: false });
if (state.activeSheet === "print") {
await updateDoseLinks(targetDoc);
}
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
revokePrintObjectUrls(state);
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
syncActiveCorpusLabelDom(targetDoc);
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
if (state.activeWork === "felices" && !state.explicitPlateRequested) {
state.activePlateIndex = resolvePlateForBibleCoordinate(
state.book,
state.chapter,
state.verse,
state.activePlateIndex,
{ explicitPlateRequested: Boolean(state.explicitPlateRequested) },
);
}
syncI18nUiFromState(state, targetDoc);
syncActiveChromeProjection(targetDoc);
syncUrlFromState(targetDoc, { push: Boolean(partial.pushHistory) });

state.status = STATUS.LOADING;
updateSealDom("seal.loading", targetDoc);
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
await ensureStateOverlaysHydrated(state, state.lang);
state.lastBridgeChapter = null;
state.lastMatrixFallbackHtml = "";
state.lastDiglossicBridgeHtml = "";
state.lastDiglossicContext = null;

const normCorpusLang = String(effectiveCorpusLang || state.lang || "").toLowerCase();
const isTier0Or1 = isVerifiedCanonicalTier0Or1(normCorpusLang, res);

if (state.register === "bilingue" && res.status === STATUS.READY) {
const bridgeLang = resolveSelectableBridgeLang({
state,
curLang: state.lang,
bridgeLang: state.bridgeLang || state.lastBridgeLang || "",
});
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
const allCatEntries = [
...(Array.isArray(cat?.languages) ? cat.languages : []),
...(Array.isArray(cat?.ekpack_languages_21) ? cat.ekpack_languages_21 : []),
...(Array.isArray(cat?.tier3_portion_languages) ? cat.tier3_portion_languages : []),
];
if (allCatEntries.length > 0) {
catalogEntry =
allCatEntries.find((l) => String(l.code).toLowerCase() === normCorpusLang) ||
allCatEntries.find((l) => String(l.code).toLowerCase() === String(state.lang || "").toLowerCase()) ||
null;
}
} catch {
catalogEntry = null;
}

const sealKey = deriveEpistemicSeal(res, catalogEntry);
state.activeCatalogEntry = catalogEntry;
updateSealDom(sealKey, targetDoc);

const isStpNtVerified = (normCorpusLang === "stp" || normCorpusLang === "st") && sealKey === "seal.verified";
if ((!isTier0Or1 && !isStpNtVerified) || sealKey !== "seal.verified") {
const sovereignTier = resolveHonestSovereignTier({
lang: normCorpusLang,
navStatus: res.status,
provenance: res.provenance || res.chapter?.provenance || null,
catalogEntry,
});
if (sovereignTier === "TIER_1_PACK_UNREACHABLE") {
state.lastDiglossicBridgeHtml =
`<section class="tier1-offline-notice" data-sovereign-tier="TIER_1_PACK_UNREACHABLE" data-epistemic-seal="TIER1_OPEN_PACK_OFFLINE_NOTICE">` +
`El contenedor canónico <code>${escapeHtml(state.lang)}.ekpack</code> no está accesible sin red aún; impórtelo vía Sneakernet o conéctese una vez (0% Falsa Biblia GMIS).` +
`</section>`;
} else {
const o1Route = lookupIso639MacroRegionO1(normCorpusLang || state.lang || "");
const macroRegion = Number(
catalogEntry?.macro_region ||
catalogEntry?.macroRegion ||
(o1Route?.found ? o1Route.macroRegionId : 0) ||
1,
);
const regionalSlot = REGIONAL_BRIDGE_LANGUAGES_10[macroRegion] || REGIONAL_BRIDGE_LANGUAGES_10[1];
const explicitBridge = String(state.bridgeLang || catalogEntry?.bridge_lang || "").trim();
const resolvedBridgeCode = explicitBridge || (o1Route?.isLusophone ? "pt" : regionalSlot?.code || "");
const bridgeSpec = resolveRegionalBridgeLanguage21({
lang: normCorpusLang || state.lang || "",
macroRegion,
bridgeLang: resolvedBridgeCode,
});
let bridgeVerses = {};
try {
let brRes = await dataLayer.loadChapter({
lang: bridgeSpec.code,
book: state.book,
chapter: state.chapter,
});
if (!brRes || !brRes.verses || Object.keys(brRes.verses).length === 0) {
brRes = await dataLayer.loadChapter({
lang: "es",
book: state.book,
chapter: state.chapter,
});
}
if (brRes && Array.isArray(brRes.verses)) {
for (const v of brRes.verses) {
if (v && v.start !== undefined) bridgeVerses[String(v.start)] = v.text;
}
} else if (brRes && brRes.verses && typeof brRes.verses === "object") {
bridgeVerses = brRes.verses;
}
} catch {
bridgeVerses = {};
}

let matrixShard = null;
try {
matrixShard = await dataLayer.loadMatrixChapter(state.book, state.chapter);
} catch {
matrixShard = null;
}
const rawMatrixRows = Array.isArray(matrixShard?.rows) ? matrixShard.rows : [];
const gmisRows = mapFullChapterGmisRows(rawMatrixRows);
state.lastDiglossicContext = {
sovereignTier,
macroRegion,
bridgeCode: bridgeSpec.code,
bridgeVerses,
gmisRows,
};
state.lastDiglossicBridgeHtml = renderProgressiveTwoStrataDiglossicBridge({
lang: state.lang,
book: state.book,
chapter: state.chapter,
selectedVerse: state.verse,
register: state.register,
sovereignTier,
macroRegion,
bridgeLang: bridgeSpec.code,
maternalVerses: res.status === STATUS.READY ? res.chapter?.verses || {} : {},
bridgeVerses,
gmisRows,
});
}
}

if (!state.pericopesAndGlossesLoaded && typeof dataLayer.loadPericopesAndGlosses === "function") {
state.pericopesAndGlossesLoaded = true;
try {
const pgData = await dataLayer.loadPericopesAndGlosses();
if (pgData) {
hydratePericopesAndGlosses(pgData);
hydrateCulturalGlossesLexicon(pgData.cultural_glosses || pgData);
hydrateLifeTrailsFromPericopesArtifact(pgData);
projectNsmRealiaLexicon3NF(pgData, {});
} else if (options.source) {
await loadNsmRealiaLexicon({ source: options.source });
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
hydrateBookNamesSourceBadge(bnDoc);
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

syncActiveChromeProjection(targetDoc);
return res;
}

async function updateDoseLinks(targetDoc = doc) {
return updateMostradorDoseLinks({ state, getEl, targetDoc });
}

async function dispenseDose1(opts = {}) {
return dispenseMostradorDose1({ opts, state, dataLayer });
}

function buildDrawerHydratorContext(targetDoc = doc) {
return {
state,
store,
dataLayer,
targetDoc,
getEl,
patchStoreState,
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
renderViewportFromState,
renderStateToDom,
hydrateBookAndChapterSelectors,
transitionSheet,
hydratePrintDrawerPanels,
hydrateShareAndAuditDrawer,
};
}

async function hydrateStudyDrawer(targetDoc = doc) { return hydrateStudyDrawerPanel(buildDrawerHydratorContext(targetDoc)); }
async function hydrateImproveDrawer(targetDoc = doc) { return hydrateImproveDrawerPanel(buildDrawerHydratorContext(targetDoc)); }
function renderPrintDrawerPanelsSync(targetDoc = doc) { return renderPrintDrawerPanelsSyncInDrawer(buildDrawerHydratorContext(targetDoc)); }
async function hydratePrintDrawerPanels(targetDoc = doc) { return hydratePrintDrawerPanelsInDrawer(buildDrawerHydratorContext(targetDoc)); }
function hydrateShareAndAuditDrawer(targetDoc = doc) { return hydrateShareAndAuditDrawerPanel(buildDrawerHydratorContext(targetDoc)); }

async function transitionSheet(rawSheetName, targetDoc = doc, { mode = "toggle", fromUser = false, source = "", expectedIntentSeq = undefined } = {}) {
if (source === "boot") {
if (state.userTouchedSheet || (expectedIntentSeq !== undefined && Number(state.intentSeq || 0) !== Number(expectedIntentSeq))) return state.activeSheet || null;
} else {
state.intentSeq = (Number(state.intentSeq) || 0) + 1;
if (fromUser) state.userTouchedSheet = true;
}
const callIntentSeq = Number(state.intentSeq || 0);
const normalized = rawSheetName === "improve" ? "field" : rawSheetName === "workshop" ? "field" : rawSheetName === "dosis" ? "share" : rawSheetName;
if (!normalized || !HAREL_SHEET_MAP[normalized]) {
closeSheet(store);
syncActiveChromeProjection(targetDoc);
projectSurfaceLayoutFromState(state, targetDoc, getEl);
syncUrlFromState(targetDoc, { push: false });
return null;
}

const prevSheet = state.activeSheet || null;
const nextSheet = mode === "open" ? openSheet(store, normalized) : mode === "close" ? closeSheet(store) : toggleSheet(store, normalized);
const willOpen = Boolean(nextSheet);

if (willOpen && nextSheet === "study") await hydrateStudyDrawer(targetDoc);
else if (willOpen && nextSheet === "field") await hydrateImproveDrawer(targetDoc);
else if (willOpen && nextSheet === "print") { await updateDoseLinks(targetDoc); await hydratePrintDrawerPanels(targetDoc); }
else if (willOpen && nextSheet === "share") hydrateShareAndAuditDrawer(targetDoc);

if ((source === "boot" && state.userTouchedSheet) || Number(state.intentSeq || 0) !== (source === "boot" && expectedIntentSeq !== undefined ? Number(expectedIntentSeq) : callIntentSeq)) {
return state.activeSheet || null;
}

if (willOpen && prevSheet !== nextSheet) {
syncActiveChromeProjection(targetDoc);
}
projectSurfaceLayoutFromState(state, targetDoc, getEl);
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
const ulsCurr = getEl("ulsCurrentLang", targetDoc);
if (ulsCurr) {
ulsCurr.textContent = resolved.startsWith("en")
? "English"
: resolved.startsWith("es")
? "Español"
: resolved.toUpperCase();
}
const ulsSel = getEl("langSelect", targetDoc);
if (ulsSel) ulsSel.value = resolved;
updateSealDom(state.seal, targetDoc);
updateCompassTriggerDom(targetDoc);
if (state.lastNavResult && state.lastNavResult.status === STATUS.READY) {
renderViewportFromState(targetDoc);
renderPrintDrawerPanelsSync(targetDoc);
hydrateShareAndAuditDrawer(targetDoc);
}
syncI18nUiFromState(state, targetDoc);
syncActiveChromeProjection(targetDoc);
syncUrlFromState(targetDoc, { push: false });
}
return resolved;
}

function bindDomEvents(targetDoc = doc) {
if (!targetDoc) return;
hydrateBookAndChapterSelectors(targetDoc);
syncOrthographyPillsVisibility(targetDoc);
syncDiachronicRegisterOrthogonality(targetDoc, state);
bindOralPorticoToggleEvent({
state,
dataLayer,
getEl,
renderViewportFromState,
targetDoc,
});
const stageCtx = {
state,
store,
dataLayer,
targetDoc,
getEl,
navigate,
selectVerse,
dispenseDose1,
setUiLocale,
updateDoseLinks,
hydrateCompassGrid,
hydrateBookAndChapterSelectors,
syncOrthographyPillsVisibility,
renderViewportFromState,
renderPrintDrawerPanelsSync,
updateCompassTriggerDom,
syncLifeTrailsActiveState,
syncUrlFromState,
buildDrawerHydratorContext,
hydrateStudyDrawer,
hydrateImproveDrawer,
hydratePrintDrawerPanels,
hydrateShareAndAuditDrawer,
formatPhotocopySimBadgeText,
projectCrossWorkCoordinate,
transitionSheet: (...a) => transitionSheet(...a),
switchWork: (...a) => state.switchWork?.(...a),
};
bindShareDrawerActionEvents(stageCtx);
const hydrateEvangeliosSection = bindSisterWorksStageEvents(stageCtx);
stageCtx.hydrateEvangeliosSection = hydrateEvangeliosSection;
bindStageDomEvents(stageCtx);
bindFelicesStageEvents(stageCtx);
createSurfaceCompositor({
store,
state,
doc: targetDoc,
getEl,
onSubtabChange: (sheetKey) => {
if (sheetKey === "study") hydrateStudyDrawer(targetDoc);
else if (sheetKey === "field") hydrateImproveDrawer(targetDoc);
else if (sheetKey === "print") hydratePrintDrawerPanels(targetDoc);
else if (sheetKey === "share") hydrateShareAndAuditDrawer(targetDoc);
},
});
syncLifeTrailsActiveState(targetDoc);
}

return {
state,
store,
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
setActiveIntent: (intent, d = doc) => {
setActiveIntent(store, intent, { window: d?.defaultView });
return commitState({}, { doc: d, syncUrl: false });
},
setAppearanceTheme: (theme, d = doc) => commitState({ appearanceTheme: ["light", "sepia", "dark"].includes(theme) ? theme : "light" }, { doc: d, syncUrl: false }),
setStealthMode: (enabled, d = doc) => commitState({ stealthMode: Boolean(enabled) }, { doc: d, syncUrl: false }),
bindDomEvents,
hydrateStudyDrawer,
hydrateImproveDrawer,
hydratePrintDrawerPanels,
hydrateShareAndAuditDrawer,
hydrateBookAndChapterSelectors,
renderStateToDom,
commitState,
guardedState,
syncActiveChromeProjection,
syncUrlFromState,
};
}

function registerSovereignServiceWorker(win = typeof window !== "undefined" ? window : null) {
try {
const swApi = win?.navigator?.serviceWorker;
const proto = String(win?.location?.protocol || "").toLowerCase();
if (
swApi &&
typeof swApi.register === "function" &&
(proto === "https:" || proto === "http:")
) {
return swApi.register("/sw.js", { scope: "/" }).catch(() => null);
}
} catch {
// Registro SW omitido en entornos sin origen HTTP(S)
}
return Promise.resolve(null);
}

/**
 * Browser bootstrap when running in a real window environment.
 */
export async function bootBrowserMostrador(
win = typeof window !== "undefined" ? window : null,
options = {},
) {
if (!win || !win.document) return null;
registerSovereignServiceWorker(win);
ensureVaultHydrated().catch(() => { });
try {
const EPOCH = "ekovoz-r41";
if (win.localStorage && win.localStorage.getItem("ekovoz_cache_epoch") !== EPOCH) {
win.localStorage.setItem("ekovoz_cache_epoch", EPOCH);
if (win.caches && typeof win.caches.keys === "function") {
win.caches.keys().then((ks) => ks.forEach((k) => win.caches.delete(k))).catch(() => { });
}
}
} catch {
// Ignore storage/cache access restrictions in private contexts
}
const doc = win.document;
let savedUi = null;
try { savedUi = win.localStorage?.getItem?.("ekovoz_ui_locale") || null; } catch { savedUi = null; }
const navLangs = Array.isArray(win.navigator?.languages) && win.navigator.languages.length ? win.navigator.languages : (win.navigator?.language ? [win.navigator.language] : []);
const INITIAL_UI_LOCALES = ["en", "es", "fr", "pt", "it", "id", "tr", "ru", "zh-Hans", "ja", "ko", "hi", "bn", "bn-BD", "bn-IN", "ar", "ur", "fa"];
const negotiatedUi = negotiate(requestedUiLocales({ search: win.location?.search || "", savedPreference: savedUi, navigatorLanguages: navLangs }), INITIAL_UI_LOCALES, doc.documentElement.getAttribute("lang") || "en");
const route = parseInitialRouteAndLocale({
search: win.location?.search || "",
pathname: win.location?.pathname || "",
defaultUi: negotiatedUi,
});
let effectiveRefStr = route.ref;
if (!route.refExplicit && (route.work === "evangelios" || route.blockedDraftWork === "evangelios")) {
const bridgeWeek = route.week || route.degradedWeek;
if (bridgeWeek) {
const evThread = EVANGELIOS_MACRO_THREADS_AND_ECHOES[bridgeWeek];
if (evThread?.passage) {
effectiveRefStr = evThread.passage;
} else {
const projected = projectCrossWorkCoordinate({
fromWork: "evangelios",
toWork: "biblia",
weekId: bridgeWeek,
});
if (projected?.book) {
effectiveRefStr = `${projected.book}.${projected.chapter || 1}.${projected.verse || 1}`;
}
}
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
edition: route.profile || "02_2col_pastoral",
paperFormat: route.format || "a4",
activeIntent: route.intent || options.activeIntent || "read",
surfaceMode: new URLSearchParams(String(win.location?.search || "").replace(/^\?/, "")).get("mode") === "studio" ? "studio" : (options.surfaceMode || "reader"),
});

controller.state.previewWorks = Array.isArray(route.previewWorks) ? route.previewWorks : [];
controller.state.previewParam = String(route.previewParam || "");
controller.state.activeWork = route.work || "biblia";
if (route.reg) controller.state.register = route.reg;
if (route.ortho) controller.state.orthographyProfile = route.ortho;
if (route.format) controller.state.paperFormat = route.format;
if (route.dose) controller.state.activeDose = route.dose;
if (route.bridge) controller.state.bridgeLang = route.bridge;
controller.state.explicitPlateRequested = route.plate !== null;
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
get activeSheet() { return controller.state.activeSheet; },
get activeModal() { return controller.state.activeModal; },
get activeIntent() { return controller.state.activeIntent; },
get appearanceTheme() { return controller.state.appearanceTheme; },
get fontFamily() { return controller.state.fontFamily; },
get fontScale() { return controller.state.fontScale; },
get stealthMode() { return controller.state.stealthMode; },
...controller.store,
setActiveIntent: controller.setActiveIntent, setAppearanceTheme: controller.setAppearanceTheme, setStealthMode: controller.setStealthMode,
transitionSheet: (s) => controller.transitionSheet(s, doc), countVisibleSheets: () => controller.countVisibleSheets(doc),
};

win.selectSovereignBibleLang = async function selectSovereignBibleLang(langCode) {
await controller.navigate({ lang: langCode }, doc);
};

const bootIntentSeq = Number(controller.state.intentSeq || 0);
applyInitialSurfaceModeFromUrl({
store: controller.store,
state: controller.state,
search: win.location?.search || "",
doc,
getEl: (id, d) => (d || doc)?.getElementById?.(id) || null,
});
controller.bindDomEvents(doc);
const ovTask = ensureStateOverlaysHydrated(controller.state, route.lang).then(() => { if (controller.state.liveCascadeOverlays?.length && controller.state.lastNavResult) controller.renderStateToDom(doc, { syncUrl: false }); }).catch(() => { });
await Promise.race([ovTask, new Promise((r) => setTimeout(r, 60))]);
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
} else if (route.blockedDraftWork) {
controller.syncUrlFromState(doc, { push: false });
}

if (!controller.state.userTouchedSheet) {
applyInitialSurfaceModeFromUrl({
store: controller.store,
state: controller.state,
search: win.location?.search || "",
doc,
getEl: (id, d) => (d || doc)?.getElementById?.(id) || null,
});
const currentBootSeq = Number(controller.state.intentSeq || 0);
const bootTargetSheet = route.sheet || (controller.state.activeIntent !== "read" ? controller.state.activeIntent : null);
controller.state._capabilityOwners = SINGLE_OWNER_CAPABILITY_MAP;
const intentLayer = resolveCapabilityIntentLayer(controller.state.activeIntent || "read");
doc?.body?.setAttribute?.("data-capability-intent-hops", String(intentLayer.maxHops));
if (bootTargetSheet && controller.state.activeWork === "biblia") {
await controller.transitionSheet(bootTargetSheet, doc, {
mode: "open",
source: "boot",
expectedIntentSeq: currentBootSeq,
});
}
}

if (typeof win.addEventListener === "function") {
win.addEventListener("popstate", async () => {
const popRoute = parseInitialRouteAndLocale({
search: win.location?.search || "",
pathname: win.location?.pathname || "",
defaultUi: controller.state.uiLocale || "en",
defaultLang: controller.state.lang || resolveDefaultCorpusLangForUi(controller.state.uiLocale || "en"),
});
controller.state.previewWorks = Array.isArray(popRoute.previewWorks) ? popRoute.previewWorks : [];
controller.state.previewParam = String(popRoute.previewParam || "");
const popRef = parseBiblicalCoordinateReference(popRoute.ref) || {
bookCode: controller.state.book,
chapter: controller.state.chapter,
verse: controller.state.verse,
};
controller.state.explicitPlateRequested = popRoute.plate !== null;
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
