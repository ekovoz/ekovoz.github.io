// ============================================================================
// web/mostrador/drawer_study.js — Gaveta 1 (Estudio 15-Col, Rosetta NSM-65 & Calibración WFST/Diacrónica)
// Decisiones D1-R41, D2-R41, D3-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import {
getAll156DiachronicSubstitutionsCatalog,
hydrateDiachronicRegister,
renderAnalyticalThermometerHtml,
renderChapterDiachronicAuditCardHtml,
renderUnifiedDiachronicContextHtml,
} from "./diachronic_register.js";
import { bindSurfaceActions, patchStoreState, patchTextAndAttrs, reconcileKeyedList } from "./dom_patch.js";
import { highlightStudyCardByStrongId, hydrateCulturalGlossesLexicon, hydratePhilologyRosettaIndex, isClosedClassFunctionTag, renderPhilologyRosettaExplorerHtml, renderPhilologyRosettaInspectorHtml, renderPhilologyRosettaResultsRowsHtml, searchPhilologyRosettaIndex } from "./estudio.js";
import { humanizeUiCopy } from "./human_labels.js";
import { hydratePericopesAndGlosses } from "./evangelios.js";
import {
listOrthographyProfilesForLang,
renderWfstAndScriptioContinuaInspectorHtml,
} from "./orthography_wfst.js";
import { resolveActiveWorkDrawerContext } from "./projection_contract.js";
import { renderModernizeRegisterDiffHtml } from "./workshop_elicit_and_cldf.js";
import { parseBiblicalCoordinateReference } from "./reference.js";
import { hydrateOnomasticonAndUbsPanels, renderFormulaicParallelsCardHtml } from "./study_onomasticon_and_ubs.js";
import { buildRosettaMultiPivotCompareHtml, summarizeAnnotationIndexTotals, summarizeDiachronicAndBlindCalibration } from "./study_verse_viewmodel.js";

export const HAREL_STUDY_SUBTABS = ["words", "rosetta", "calibrate"];

function escHtml(val) {
return String(val ?? "")
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;");
}

function renderProBovedaStudyAccordionHtml(uiLocale = "es") {
const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
return (
`<details id="proBovedaCalibrationDetails" class="r9-stratum-accordion ek-mt-sm" data-pro-boveda="true" data-technical-plane="true">` +
`<summary>🔬 ${isEn ? "Vault & Verification · I+D Calibration & Corpus Metrics (chrF++, AoA, MDD)" : "Bóveda y verificación · Calibración I+D y Métricas (chrF++, AoA, MDD)"}</summary>` +
`<div id="proBovedaStudyCalibSlot" class="ek-mt-xs"><p class="ek-meta">${isEn ? "Open to load linguistic benchmark matrices on demand." : "Abre para cargar matrices de calibración I+D bajo demanda."}</p></div>` +
`</details>`
);
}

const TRAIL_BTN_TO_TRAIL_ID = Object.freeze({
btnTrailConsuelo: "TRAIL_CONSUELO",
btnTrailPaz: "TRAIL_PAZ_ANSIEDAD",
btnTrailPerdon: "TRAIL_PERDON",
btnTrailSabiduria: "TRAIL_SABIDURIA",
btnTrailFamilia: "TRAIL_FAMILIA",
btnTrailEsperanza: "TRAIL_ESPERANZA",
btnTrailOracion: "TRAIL_JUSTICIA",
btnTrailCreacion: "TRAIL_CAMINO_JESUS",
});

function parseLifeTrailRefString(osisRef = "") {
const m = String(osisRef || "").trim().match(/^([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)$/i);
if (!m) return null;
return { book: m[1].toUpperCase(), chapter: Number(m[2]) || 1, verse: Number(m[3]) || 1, osis: `${m[1].toUpperCase()}.${Number(m[2]) || 1}.${Number(m[3]) || 1}` };
}

/**
* Hidrata los Senderos de Vida (`life_trails`) y Perícopas de Capítulo (`chapter_pericopes`)
* desde `web/data/pericopes_and_glosses.json` (`D3-B++` · `GOLD-647` · `SLICE-EKO-HIG6-07`).
*/
export function hydrateLifeTrailsFromPericopesArtifact(artifact = null) {
const rawTrails = Array.isArray(artifact?.life_trails) ? artifact.life_trails : [];
const lifeTrails = rawTrails.map((t) => ({
...t,
parsedAnchors: (Array.isArray(t?.anchor_refs) ? t.anchor_refs : []).map(parseLifeTrailRefString).filter(Boolean),
}));
const trailByButtonId = {};
for (const [btnId, trailId] of Object.entries(TRAIL_BTN_TO_TRAIL_ID)) {
const found = lifeTrails.find((t) => t.trail_id === trailId);
if (found) trailByButtonId[btnId] = found;
}
const chapterPericopes =
artifact?.chapter_pericopes && typeof artifact.chapter_pericopes === "object"
? artifact.chapter_pericopes
: {};
const masoreticAndGospel = Array.isArray(artifact?.masoretic_and_gospel_pericopes)
? artifact.masoretic_and_gospel_pericopes
: [];
return {
lifeTrails,
trailByButtonId,
chapterPericopes,
masoreticAndGospel,
evangeliosMacroThreads: artifact?.evangelios_macro_threads || {},
felices12Dichas: Array.isArray(artifact?.felices_12_dichas) ? artifact.felices_12_dichas : [],
felices28Plates: Array.isArray(artifact?.felices_28_plates) ? artifact.felices_28_plates : [],
};
}

export function bindLifeTrailsNavigation({
state,
dataLayer,
targetDoc,
getEl,
navigate,
hydrateBookAndChapterSelectors,
anchors = {},
} = {}) {
const renderStepper = (trail, stepIdx) => {
const stepperEl = getEl("activeLifeTrailStepper", targetDoc);
const list = Array.isArray(trail?.stepperAnchors) ? trail.stepperAnchors : trail?.parsedAnchors;
if (!stepperEl || !Array.isArray(list) || list.length === 0) return;
const total = list.length;
const rawStep = stepIdx ?? state.activeLifeTrailStepIndex ?? 0;
const safeIdx = ((Number(rawStep) || 0) % total + total) % total;
stepperEl.setAttribute?.("data-active-step-index", String(safeIdx));
const cur = list[safeIdx];
const nextIdx = (safeIdx + 1) % total;
const isEn = String(state.uiLocale || "es").toLowerCase().startsWith("en");
const chips = list.map((s, i) => `<button type="button" class="uls-chip" data-trail-step-index="${i}" aria-pressed="${i === safeIdx ? "true" : "false"}">${i + 1}. ${escHtml(`${s.book} ${s.chapter}:${s.verse}`)}</button>`).join(" ");
stepperEl.hidden = false;
stepperEl.setAttribute?.("data-active-trail-id", String(trail.trail_id || ""));
stepperEl.setAttribute?.("data-active-trail-icon", String(trail.icon_svg_id || ""));
stepperEl.innerHTML = `<span data-trail-step-counter="true"><strong>${escapeTrailTitle(trail)}</strong> · ${isEn ? `Step ${safeIdx + 1}/${total}` : `Paso ${safeIdx + 1}/${total}`} (${escHtml(`${cur.book} ${cur.chapter}:${cur.verse}`)})</span>${chips}<button type="button" id="btnLifeTrailNextStep" class="uls-chip" data-trail-step-index="${nextIdx}">${isEn ? `Next (${nextIdx + 1}/${total}) →` : `Siguiente (${nextIdx + 1}/${total}) →`}</button>`;
if (!stepperEl._trailStepperBound && typeof stepperEl.addEventListener === "function") {
stepperEl._trailStepperBound = true;
stepperEl.addEventListener("click", async (ev) => {
const idxAttr = (ev?.target?.closest ? ev.target.closest("[data-trail-step-index]") : ev?.target)?.getAttribute?.("data-trail-step-index");
const active = state.activeLifeTrail;
const stops = active?.stepperAnchors || active?.parsedAnchors || [];
if (idxAttr == null || stops.length === 0) return;
const targetIdx = Number(idxAttr) || 0;
const stop = stops[targetIdx];
if (!stop) return;
state.activeLifeTrailStepIndex = targetIdx;
await navigate({ book: stop.book, chapter: stop.chapter, verse: stop.verse }, targetDoc);
hydrateBookAndChapterSelectors(targetDoc);
renderStepper(active, targetIdx);
});
}
};
const escapeTrailTitle = (trail) => escHtml(trail?.title_es || trail?.trail_id || "");
const TRAIL_FALLBACK_REFS = { btnTrailConsuelo: ["PSA.23.1", "PSA.46.1", "MAT.11.28", "REV.21.4"], btnTrailPaz: ["JHN.14.27", "PHP.4.6", "ISA.26.3", "PSA.4.8"], btnTrailPerdon: ["LUK.15.11", "1JN.1.9", "PSA.103.12", "ISA.1.18"], btnTrailSabiduria: ["JAS.1.5", "PRO.3.5", "PSA.119.105", "COL.3.16"], btnTrailAmor: ["1CO.13.4", "1JN.4.8", "JHN.3.16", "ROM.8.39"], btnTrailFamilia: ["1CO.13.4", "EPH.5.25", "COL.3.13", "JOS.24.15"], btnTrailEsperanza: ["ROM.8.28", "JER.29.11", "HEB.11.1", "TIT.2.13"], btnTrailOracion: ["MAT.6.9", "PHP.4.6", "1TH.5.17", "PSA.145.18"], btnTrailCreacion: ["GEN.1.1", "PSA.19.1", "JHN.1.3", "COL.1.16"] };
for (const [trailBtnId, anchor] of Object.entries(anchors)) {
const tBtn = getEl(trailBtnId, targetDoc);
if (!tBtn || typeof tBtn.addEventListener !== "function") continue;
tBtn.addEventListener("click", async () => {
state.activeTrailId = trailBtnId;
const fbStops = (TRAIL_FALLBACK_REFS[trailBtnId] || []).map(parseLifeTrailRefString).filter(Boolean);
const immediateTrail = state.hydratedLifeTrails?.trailByButtonId?.[trailBtnId] || { trail_id: trailBtnId, title_es: anchor?.label || tBtn.textContent?.trim() || trailBtnId, parsedAnchors: fbStops.length > 0 ? fbStops : [{ book: anchor.book, chapter: anchor.chapter, verse: anchor.verse, osis: `${anchor.book}.${anchor.chapter}.${anchor.verse}` }] };
if ((immediateTrail.parsedAnchors || []).length > 0) {
state.activeLifeTrail = { ...immediateTrail, stepperAnchors: immediateTrail.parsedAnchors };
state.activeLifeTrailStepIndex = 0;
renderStepper(state.activeLifeTrail, 0);
}
if (!state.hydratedLifeTrails && typeof dataLayer?.loadPericopesAndGlosses === "function") {
try {
const pgData = await dataLayer.loadPericopesAndGlosses();
if (pgData) state.hydratedLifeTrails = hydrateLifeTrailsFromPericopesArtifact(pgData);
} catch { /* Fallback */ }
}
const trailObj = state.hydratedLifeTrails?.trailByButtonId?.[trailBtnId] || immediateTrail;
if (trailObj?.icon_svg_id) tBtn.setAttribute?.("data-trail-icon", String(trailObj.icon_svg_id));
const baseAnchors = Array.isArray(trailObj?.parsedAnchors) ? trailObj.parsedAnchors : [];
let startIdx = baseAnchors.findIndex((a) => a.book === anchor.book && a.chapter === anchor.chapter && a.verse === anchor.verse);
const primaryStop = { book: anchor.book, chapter: anchor.chapter, verse: anchor.verse, osis: `${anchor.book}.${anchor.chapter}.${anchor.verse}` };
const stepperAnchors = startIdx >= 0 ? baseAnchors : [primaryStop, ...baseAnchors];
if (startIdx < 0) startIdx = 0;
const stop = stepperAnchors[startIdx] || anchor;
await navigate({ book: stop.book, chapter: stop.chapter, verse: stop.verse }, targetDoc);
hydrateBookAndChapterSelectors(targetDoc);
if (trailObj && stepperAnchors.length > 0) {
state.activeLifeTrail = { ...trailObj, stepperAnchors };
state.activeLifeTrailStepIndex = startIdx;
renderStepper(state.activeLifeTrail, startIdx);
}
});
}
}

/**
* Hidrata los metadatos de fuente de nombres de libros (`lang`, `name_source`, `books`, `nsm_subtitle`)
* desde `web/data/book_names/<lang>.json` (`D3-B++` · `GOLD-647`).
*/
export function hydrateBookNamesSourceBadge(bookNamesDoc = null) {
const lang = String(bookNamesDoc?.lang || "es");
const nameSource = String(bookNamesDoc?.name_source || lang);
const books = Array.isArray(bookNamesDoc?.books) ? bookNamesDoc.books : [];
const sampleNsmSubtitle = String(books[0]?.nsm_subtitle || "");
return {
lang,
nameSource,
booksCount: books.length,
sampleNsmSubtitle,
};
}

/**
* Hidrata el estado de integridad de módulos WASM (`modules`) desde `web/wasm/wasm_manifest.json` (`D3-B++` · `GOLD-647`).
*/
export function hydrateWasmManifestStatus(wasmManifest = null) {
const modules =
wasmManifest?.modules && typeof wasmManifest.modules === "object"
? wasmManifest.modules
: {
ekovoz_player_wasm: { path: "wasm/ekovoz_player_wasm.wasm" },
qr_stream_receiver_wasm: { path: "wasm/qr_stream_receiver_wasm.wasm" },
};
return {
modules,
hasPlayerWasm: Boolean(modules.ekovoz_player_wasm),
hasReceiverWasm: Boolean(modules.qr_stream_receiver_wasm),
};
}

/**
* Monta el HTML de una tarjeta con `id` raíz dentro de su contenedor anfitrión existente
* sin anidar un segundo `<div id="...">` duplicado (Apple HIG R36 — Decisión 4A / INV-ERG-16).
*/
export function mountCardHtmlIntoHost(hostEl, fullCardHtml) {
if (!hostEl || typeof fullCardHtml !== "string") return false;
const trimmed = fullCardHtml.trim();
const hostId = typeof hostEl.getAttribute === "function" ? hostEl.getAttribute("id") : hostEl.id;
if (hostId && trimmed.startsWith("<") && trimmed.includes(`id="${hostId}"`)) {
const firstTagEnd = trimmed.indexOf(">");
const lastTagStart = trimmed.lastIndexOf("</");
if (firstTagEnd > 0 && lastTagStart > firstTagEnd) {
const openTag = trimmed.slice(0, firstTagEnd + 1);
const innerHtml = trimmed.slice(firstTagEnd + 1, lastTagStart);
const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
let match;
while ((match = attrRegex.exec(openTag)) !== null) {
const [, attrName, attrVal] = match;
if (attrName !== "id" && typeof hostEl.setAttribute === "function") {
hostEl.setAttribute(attrName, attrVal);
}
}
hostEl.innerHTML = innerHtml;
return true;
}
}
hostEl.innerHTML = trimmed;
return true;
}

/**
* Sincroniza un código Strong activo en la Gaveta 1 (`#bibleEasyDrawerPanel`):
* resalta la tarjeta de la Matriz 15-Col, actualiza `#rosettaSearchInput` y filtra `#rosettaExplorerResultsRows` (`D2-R38`).
*/
export function syncActiveStrongInStudyDrawer(
strongId,
{ state, targetDoc, getEl, mod = null, rosettaIndex = null } = {},
) {
const cleanStrong = String(strongId || "").trim().toUpperCase();
if (!cleanStrong || cleanStrong === "∅") return "";
if (state) {
state.activeStrongId = cleanStrong;
state.rosettaQuery = cleanStrong;
}
if (!targetDoc || typeof getEl !== "function") return cleanStrong;

const container =
getEl("leipzig14ColStratumAction", targetDoc) ||
getEl("bibleEasyDrawerPanel", targetDoc);
if (container) {
if (mod && typeof mod.highlightStudyCardByStrongId === "function") {
mod.highlightStudyCardByStrongId(container, cleanStrong);
} else {
highlightStudyCardByStrongId(container, cleanStrong);
}
}

const searchInp = getEl("rosettaSearchInput", targetDoc);
if (searchInp) {
searchInp.value = cleanStrong;
}

const focusedBtn = getEl("btnFocusedTokenProposeRoot", targetDoc);
if (focusedBtn && typeof focusedBtn.setAttribute === "function") {
const isEnUi = String(state?.uiLocale || "es").trim().toLowerCase().startsWith("en");
const activeOsis = `${state?.book || "GEN"}.${Number(state?.chapter) || 1}.${Number(state?.verse) || 1}`;
focusedBtn.setAttribute("data-propose-strong-id", cleanStrong);
focusedBtn.setAttribute("data-osis-ref", activeOsis);
focusedBtn.textContent = `✍️ ${isEnUi ? "Improve root" : "Mejorar raíz"} (${cleanStrong})`;
}

const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
if (rowsEl) {
const renderRowsFn =
mod && typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
? mod.renderPhilologyRosettaResultsRowsHtml
: renderPhilologyRosettaResultsRowsHtml;
const activeCat = state?.rosettaCategory || "all";
const activeRef = state?.book ? `${state.book}.${Number(state.chapter) || 1}.${Number(state.verse) || 1}` : "";
rowsEl.innerHTML = renderRowsFn({
query: cleanStrong,
category: activeCat,
activeRef,
rosettaIndex: rosettaIndex || state?.rosettaIndex || null,
});
const listEl = getEl("rosettaExplorerResultsList", targetDoc);
if (listEl) {
const items = searchPhilologyRosettaIndex(
cleanStrong,
activeCat,
12,
rosettaIndex || state?.rosettaIndex || null,
activeRef,
);
listEl.setAttribute("data-results-count", String(items.length));
}
}
return cleanStrong;
}

/**
* Hidrata la Gaveta 1 (Estudio 15-Col + Rosetta + Calibración WFST/Diacrónica) (`D3-R41` / `D10-R38` / `D2-R38`).
*/
export async function hydrateStudyDrawerPanel(ctx = {}) {
const {
state,
dataLayer,
targetDoc,
getEl,
getI18n,
loadStudyModule,
navigate,
hydrateBookAndChapterSelectors,
transitionSheet,
} = ctx;
const isEnStudySync = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
const profilesSync = listOrthographyProfilesForLang(state.lang);
const wfstHostSync = getEl("wfstAndScriptioContinuaHost", targetDoc);
if (wfstHostSync) {
const syncVerseText = state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
wfstHostSync.innerHTML =
renderWfstAndScriptioContinuaInspectorHtml({
lang: state.lang,
profileId: state.orthographyProfile || profilesSync[0]?.id || "INALI_PRACTICAL",
sampleText: syncVerseText || undefined,
uiLocale: state.uiLocale || "es",
}) + renderProBovedaStudyAccordionHtml(state.uiLocale || "es");
}
const thermoPanelSync = getEl("bibleAnalyticalThermometerPanel", targetDoc);
if (thermoPanelSync) {
thermoPanelSync.innerHTML = renderAnalyticalThermometerHtml({
verses: state.lastNavResult?.chapter?.verses || {},
bookCode: state.book,
osisRef: `${state.book}.${state.chapter}.${state.verse}`,
includeInlineSubstitutionsDetails: false,
uiLocale: state.uiLocale || state.lang || "es",
});
}
const mod = await loadStudyModule();
const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
const nsmLexicon =
typeof dataLayer.loadNsmRealiaLexicon === "function"
? await dataLayer.loadNsmRealiaLexicon()
: null;
const rosettaIndex =
typeof dataLayer.loadPhilologyRosettaIndex === "function"
? await dataLayer.loadPhilologyRosettaIndex()
: null;
if (rosettaIndex) {
hydratePhilologyRosettaIndex(rosettaIndex);
state.rosettaIndex = rosettaIndex;
}
if (!state.pericopesAndGlossesLoaded && typeof dataLayer.loadPericopesAndGlosses === "function") {
state.pericopesAndGlossesLoaded = true;
try {
const pgData = await dataLayer.loadPericopesAndGlosses();
if (pgData) {
hydratePericopesAndGlosses(pgData);
hydrateCulturalGlossesLexicon(pgData.cultural_glosses || pgData);
state.hydratedLifeTrails = hydrateLifeTrailsFromPericopesArtifact(pgData);
}
} catch {
// Non-fatal
}
}
if (!state.diachronicRegisterLoaded && typeof dataLayer.loadDiachronicRegisterAudit === "function") {
state.diachronicRegisterLoaded = true;
try {
const drData = await dataLayer.loadDiachronicRegisterAudit();
if (drData) { state.diachronicRegisterPayload = drData; hydrateDiachronicRegister(drData); }
} catch {
// Non-fatal
}
}
if (!state.annotationIndexReport && typeof dataLayer?.loadAnnotationIndexReport === "function") {
try { const ann = await dataLayer.loadAnnotationIndexReport(); if (ann) state.annotationIndexReport = ann; } catch { /* Non-fatal */ }
}
if (!state.blindCalibrationReport && typeof dataLayer?.loadBlindCalibrationReport === "function") {
try { const br = await dataLayer.loadBlindCalibrationReport(); if (br) state.blindCalibrationReport = br; } catch { /* Non-fatal */ }
}
const i18nInstance = typeof getI18n === "function" ? getI18n() : null;
const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
const staticRosettaHostEl = getEl("philologyRosettaStaticHost", targetDoc);
const studyOpts = {
book: state.book,
chapter: state.chapter,
verse: state.verse,
lang: state.lang,
uiLocale: state.uiLocale || "es",
scope: state.studyScope || "verse",
activeStrongId: state.activeStrongId || "",
nsmLexicon,
rosettaIndex,
rosettaQuery: state.rosettaQuery || "",
rosettaCategory: state.rosettaCategory || "all",
includeInlineStrata: false,
includeRosettaInspector: !Boolean(staticRosettaHostEl),
includeExplorer: !Boolean(staticRosettaHostEl),
i18n: i18nInstance,
t: tFn,
};
const workCtx = resolveActiveWorkDrawerContext(state);
const workBannerHtml = workCtx.isSisterWork
? `<aside class="work-context-drawer-banner" data-work-context="${escHtml(workCtx.activeWork)}"><strong>${escHtml(workCtx.bannerText)}</strong></aside>`
: "";
const isEnStudy = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
const hasMatrixRows = Array.isArray(matrixChapter?.rows) && matrixChapter.rows.length > 0;
const studyMatrixCardHtml =
`<div id="studyMatrixDownloadCard" class="ek-row-between ek-meta ek-mb-xs" data-matrix-tier0="true"${hasMatrixRows ? ' data-technical-plane="true"' : ""}>` +
`<span>📚 ${isEnStudy ? (hasMatrixRows ? "Original Study (15 col) · Technical pack" : "Word-by-word pack offline · Available in Share → Offline") : (hasMatrixRows ? "Estudio Original (15 col) · Paquete técnico" : "Análisis palabra por palabra · Disponible en Compartir → Sin red")}</span>` +
`<span class="ek-row-wrap" data-technical-plane="true">` +
`<a id="btnStudyDownloadMatrixTier0" class="uls-chip ek-btn-link" href="data/packs/matrix_tier0.ekpack" download="matrix_tier0.ekpack">⬇️ ${isEnStudy ? "Original Matrix (.ekpack)" : "Matriz Original (.ekpack)"}</a>` +
`<button type="button" id="btnOpenProBovedaFromStudy" class="uls-chip" data-action="open-pro-boveda">🔐 ${isEnStudy ? "Vault & Verification" : "Bóveda y verificación"}</button>` +
`</span></div>`;
const html = workBannerHtml + studyMatrixCardHtml + mod.renderStudy14ColDrawerHtml(matrixChapter, studyOpts);
const container =
getEl("leipzig14ColStratumAction", targetDoc) ||
getEl("bibleEasyDrawerPanel", targetDoc);
if (container) {
container.setAttribute?.("data-study-contextual-tabs", "3");
if (targetDoc?.activeElement?.id !== "rosettaSearchInput") {
container.innerHTML = html;
}
if (state.activeStrongId) {
syncActiveStrongInStudyDrawer(state.activeStrongId, {
state,
targetDoc,
getEl,
mod,
rosettaIndex,
});
}
const staticRowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
if (staticRosettaHostEl) {
if (!staticRosettaHostEl.innerHTML || !staticRosettaHostEl.innerHTML.includes("rosettaExplorerResultsRows")) {
const renderExplorerFn =
typeof mod.renderPhilologyRosettaExplorerHtml === "function"
? mod.renderPhilologyRosettaExplorerHtml
: renderPhilologyRosettaExplorerHtml;
staticRosettaHostEl.innerHTML = renderExplorerFn({
query: state.rosettaQuery || "",
category: state.rosettaCategory || "all",
activeRef: `${state.book}.${state.chapter}.${state.verse}`,
rosettaIndex,
uiLocale: state.uiLocale || "es",
});
}
let summarySlot = getEl("philologyRosettaSummarySlot", targetDoc);
if (!summarySlot && targetDoc?.createElement && typeof staticRosettaHostEl.appendChild === "function") {
let auditDetails = getEl("rosettaCalibrationAuditDetails", targetDoc);
if (!auditDetails) {
auditDetails = targetDoc.createElement("details");
auditDetails.id = "rosettaCalibrationAuditDetails";
auditDetails.className = "r9-stratum-accordion ek-mt-sm";
const auditSummary = targetDoc.createElement("summary");
const isEnLoc = String(state.uiLocale || "es").toLowerCase().startsWith("en");
auditSummary.textContent = isEnLoc
  ? "🧬 Roots in this passage vs global search (12 languages)"
  : "🧬 En este pasaje vs búsqueda global (12 lenguas)";
summarySlot = targetDoc.createElement("div");
summarySlot.id = "philologyRosettaSummarySlot";
summarySlot.setAttribute?.("data-passage-ref", `${state.book}.${state.chapter}.${state.verse}`);
auditDetails.appendChild(auditSummary);
auditDetails.appendChild(summarySlot);
staticRosettaHostEl.appendChild(auditDetails);
} else {
summarySlot = getEl("philologyRosettaSummarySlot", targetDoc);
}
}
if (summarySlot) {
const renderInspectorFn =
typeof mod.renderPhilologyRosettaInspectorHtml === "function"
? mod.renderPhilologyRosettaInspectorHtml
: renderPhilologyRosettaInspectorHtml;
summarySlot.innerHTML =
renderInspectorFn(matrixChapter?.rows || [], {
...studyOpts,
includeExplorer: false,
}) +
buildRosettaMultiPivotCompareHtml({
book: state.book,
chapter: state.chapter,
verse: state.verse,
rosettaIndex,
activeRows: matrixChapter?.rows || [],
uiLocale: state.uiLocale || "es",
});
}
if (staticRowsEl) {
const renderRowsFn =
typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
? mod.renderPhilologyRosettaResultsRowsHtml
: renderPhilologyRosettaResultsRowsHtml;
staticRowsEl.innerHTML = renderRowsFn({
query: state.rosettaQuery || "",
category: state.rosettaCategory || "all",
activeRef: `${state.book}.${state.chapter}.${state.verse}`,
rosettaIndex,
});
}
}
const syncRosettaRows = () => {
const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
if (rowsEl) {
const activeRef = `${state.book}.${state.chapter}.${state.verse}`;
const bookPref = `${String(state.book || "").toUpperCase()}.`;
const items = searchPhilologyRosettaIndex(
state.rosettaQuery || "",
state.rosettaCategory || "all",
12,
rosettaIndex,
activeRef,
).sort((a, b) => (String(b?.ref || "").toUpperCase().startsWith(bookPref) ? 1 : 0) - (String(a?.ref || "").toUpperCase().startsWith(bookPref) ? 1 : 0));
if (typeof rowsEl.insertBefore === "function" && targetDoc?.createElement) {
reconcileKeyedList(
rowsEl,
items,
(it) => it.id,
(_it, _i, d) => d.createElement("button"),
(btn, it) => {
btn.type = "button";
btn.className = "uls-chip rosetta-jump-chip";
patchTextAndAttrs(btn, [
{
text: `🔎 ${it.title} → ${it.ref}`,
attrs: {
"data-rosetta-ref": it.ref,
"data-rosetta-strong": it.strong,
"data-rosetta-category": it.category,
title: it.detail,
},
},
]);
},
);
} else {
reconcileKeyedList(rowsEl, items, (it) => it.id, (it) => it);
const renderRowsFn =
typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
? mod.renderPhilologyRosettaResultsRowsHtml
: renderPhilologyRosettaResultsRowsHtml;
rowsEl.innerHTML = renderRowsFn({
query: state.rosettaQuery || "",
category: state.rosettaCategory || "all",
activeRef,
rosettaIndex,
});
}
const listEl = getEl("rosettaExplorerResultsList", targetDoc);
if (listEl) {
patchTextAndAttrs(listEl, [{ attrs: { "data-results-count": String(items.length) } }]);
}
return true;
}
return false;
};
const catSel = getEl("rosettaFilterCategorySelect", targetDoc);
if (catSel && typeof catSel.addEventListener === "function") {
catSel.setAttribute?.("data-action", "rosetta-filter-cat");
bindSurfaceActions(
catSel,
{
"rosetta-filter-cat": async (e) => {
patchStoreState(ctx, { rosettaCategory: String(e?.target?.value || catSel.value || "all") });
if (!syncRosettaRows()) await hydrateStudyDrawerPanel(ctx);
},
},
{ scope: "rosetta-cat", events: ["change"] },
);
}
const searchInp = getEl("rosettaSearchInput", targetDoc);
if (searchInp && typeof searchInp.addEventListener === "function") {
searchInp.setAttribute?.("data-action", "rosetta-search");
bindSurfaceActions(
searchInp,
{
"rosetta-search": async (e) => {
patchStoreState(ctx, { rosettaQuery: String(e?.target?.value ?? searchInp.value ?? "") });
if (!syncRosettaRows()) await hydrateStudyDrawerPanel(ctx);
},
},
{ scope: "rosetta-search", events: ["input", "change"] },
);
}
if (staticRosettaHostEl && typeof staticRosettaHostEl.addEventListener === "function" && !staticRosettaHostEl._rosettaClickBound) {
staticRosettaHostEl._rosettaClickBound = true;
staticRosettaHostEl.addEventListener("click", async (e) => {
const rosettaBtn = e?.target?.closest
? e.target.closest("[data-rosetta-ref]")
: e?.target?.getAttribute?.("data-rosetta-ref")
? e.target
: null;
const rosettaRef = rosettaBtn?.getAttribute?.("data-rosetta-ref");
if (rosettaRef) {
const rosettaStrong = rosettaBtn?.getAttribute?.("data-rosetta-strong");
if (rosettaStrong) state.activeStrongId = String(rosettaStrong).toUpperCase();
const parsedRosetta = parseBiblicalCoordinateReference(rosettaRef);
if (parsedRosetta && parsedRosetta.bookCode) {
await navigate(
{
book: parsedRosetta.bookCode,
chapter: parsedRosetta.chapter || 1,
verse: parsedRosetta.verse || 1,
},
targetDoc,
);
hydrateBookAndChapterSelectors(targetDoc);
}
}
});
}
if (typeof container.addEventListener === "function" && !container._scopeListenerBound) {
container._scopeListenerBound = true;
container.addEventListener("click", async (e) => {
const rosettaBtn = e?.target?.closest
? e.target.closest("[data-rosetta-ref]")
: e?.target?.getAttribute?.("data-rosetta-ref")
? e.target
: null;
const rosettaRef = rosettaBtn?.getAttribute?.("data-rosetta-ref");
if (rosettaRef) {
const rosettaStrong = rosettaBtn?.getAttribute?.("data-rosetta-strong");
if (rosettaStrong) state.activeStrongId = String(rosettaStrong).toUpperCase();
const parsedRosetta = parseBiblicalCoordinateReference(rosettaRef);
if (parsedRosetta && parsedRosetta.bookCode) {
await navigate(
{
book: parsedRosetta.bookCode,
chapter: parsedRosetta.chapter || 1,
verse: parsedRosetta.verse || 1,
},
targetDoc,
);
hydrateBookAndChapterSelectors(targetDoc);
}
return;
}
const proposeBtn = e?.target?.closest
? e.target.closest("[data-propose-strong-id]")
: e?.target?.getAttribute?.("data-propose-strong-id")
? e.target
: null;
if (proposeBtn) {
const propStrong = proposeBtn.getAttribute?.("data-propose-strong-id");
if (propStrong && propStrong !== "∅") {
state.activeStrongId = String(propStrong).toUpperCase();
}
await transitionSheet("field", targetDoc);
return;
}
const slotBtn = e?.target?.closest
? e.target.closest("[data-elicitation-slot]")
: e?.target?.getAttribute?.("data-elicitation-slot")
? e.target
: null;
if (slotBtn) {
const slotStrong = slotBtn.getAttribute?.("data-strong") || slotBtn.getAttribute?.("data-strong-id");
const slotVerse = Number(slotBtn.getAttribute?.("data-verse")) || state.verse;
if (slotStrong && slotStrong !== "∅") {
state.activeStrongId = String(slotStrong).toUpperCase();
}
state.verse = slotVerse;
await transitionSheet("field", targetDoc);
return;
}
const cardEl = e?.target?.closest
? e.target.closest(".leipzig-14col-card[data-strong-id]")
: e?.target?.getAttribute?.("data-strong-id")
? e.target
: null;
if (cardEl) {
const cardStrong = cardEl.getAttribute?.("data-strong-id");
if (cardStrong && cardStrong !== "∅") {
syncActiveStrongInStudyDrawer(cardStrong, {
state,
targetDoc,
getEl,
mod,
rosettaIndex,
});
}
return;
}
const btn = e?.target?.closest
? e.target.closest("[data-study-scope]")
: e?.target?.getAttribute?.("data-study-scope")
? e.target
: null;
const nextScope = btn?.getAttribute?.("data-study-scope");
if (nextScope === "verse" || nextScope === "chapter" || nextScope === "gmis") {
state.studyScope = nextScope;
await hydrateStudyDrawerPanel(ctx);
}
});
}
}

if (typeof mod.renderStudyStrataCards === "function") {
const strata = mod.renderStudyStrataCards(matrixChapter, studyOpts);
const nsmCard = getEl("nsm65StratumCard", targetDoc);
if (nsmCard) nsmCard.innerHTML = strata.nsmHtml;
const realiaCard = getEl("realiaMetrologyStratumCard", targetDoc);
if (realiaCard) realiaCard.innerHTML = strata.realiaHtml;
const tskCard = getEl("tskCrossRefsStratumCard", targetDoc);
if (tskCard) tskCard.innerHTML = strata.tskHtml;
}

await hydrateOnomasticonAndUbsPanels({
state,
dataLayer,
targetDoc,
getEl,
navigate,
hydrateBookAndChapterSelectors,
parseBiblicalCoordinateReference,
});

const formulaicHost = getEl("studyFormulaicParallelsHost", targetDoc);
if (formulaicHost) {
if (!state.formulaicIndexData && typeof dataLayer?.loadJson === "function") {
try {
const fj = await dataLayer.loadJson("data/formulaic_index.json");
if (fj) state.formulaicIndexData = fj;
} catch {
// Non-fatal fallback to curated seed
}
}
formulaicHost.innerHTML = renderFormulaicParallelsCardHtml({
book: state.book,
chapter: state.chapter,
verse: state.verse,
formulaicIndex: state.formulaicIndexData || null,
uiLocale: state.uiLocale || "es",
});
if (typeof formulaicHost.addEventListener === "function" && !formulaicHost._formulaicBound) {
formulaicHost._formulaicBound = true;
formulaicHost.addEventListener("click", async (e) => {
const btn = e?.target?.closest
? e.target.closest("[data-formulaic-ref]")
: e?.target?.getAttribute?.("data-formulaic-ref")
? e.target
: null;
const targetRef = btn?.getAttribute?.("data-formulaic-ref");
if (!targetRef) return;
const parsed = parseBiblicalCoordinateReference(targetRef);
if (parsed && parsed.bookCode && typeof navigate === "function") {
await navigate(
{ book: parsed.bookCode, chapter: parsed.chapter || 1, verse: parsed.verse || 1 },
targetDoc,
);
if (typeof hydrateBookAndChapterSelectors === "function") hydrateBookAndChapterSelectors(targetDoc);
}
});
}
}

const proBovedaStudyBtn = getEl("btnOpenProBovedaFromStudy", targetDoc);
if (proBovedaStudyBtn && typeof proBovedaStudyBtn.addEventListener === "function" && !proBovedaStudyBtn._proVaultBound) {
proBovedaStudyBtn._proVaultBound = true;
proBovedaStudyBtn.addEventListener("click", async () => {
patchStoreState(ctx, { activeSubtabBySheet: { ...(state.activeSubtabBySheet || {}), share: "graphics" } }, "sheet");
await transitionSheet?.("share", targetDoc, { fromUser: true });
const det = getEl("shareProBovedaDetails", targetDoc);
if (det) det.open = true;
});
}

// Bóveda Pro Lazy (SLICE-EKO-HIG5-06 · LCOM4 >= 2): WFST ortográfico arriba; métricas I+D (chrF++, AoA, MDD) bajo demanda.
const wfstHost = getEl("wfstAndScriptioContinuaHost", targetDoc);
if (wfstHost) {
const profilesForLang = listOrthographyProfilesForLang(state.lang);
const activeVerseText =
state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
const firstRowObj =
Array.isArray(matrixChapter?.rows) && matrixChapter.rows.length > 0 && !Array.isArray(matrixChapter.rows[0])
? matrixChapter.rows[0]
: null;
wfstHost.innerHTML =
renderWfstAndScriptioContinuaInspectorHtml({
lang: state.lang,
profileId: state.orthographyProfile || profilesForLang[0]?.id || "INALI_PRACTICAL",
sampleText: activeVerseText || undefined,
uiLocale: state.uiLocale || "es",
}) + renderProBovedaStudyAccordionHtml(state.uiLocale || "es");
const calibDetails = getEl("proBovedaCalibrationDetails", targetDoc);
if (calibDetails && typeof calibDetails.addEventListener === "function" && !calibDetails._proCalibBound) {
calibDetails._proCalibBound = true;
calibDetails.addEventListener("toggle", async () => {
if (!calibDetails.open) return;
const slotEl = getEl("proBovedaStudyCalibSlot", targetDoc);
if (!slotEl || slotEl.getAttribute?.("data-pro-boveda-hydrated") === "true") return;
const { hydrateProBovedaStudyCalibration } = await import("./drawer_pro_boveda.js");
await hydrateProBovedaStudyCalibration({ slotEl, state, dataLayer, sampleRow: firstRowObj });
});
}
const wfstSel = getEl("wfstInspectorProfileSelect", targetDoc);
if (wfstSel && typeof wfstSel.addEventListener === "function" && !wfstSel._wfstBound) {
wfstSel._wfstBound = true;
wfstSel.addEventListener("change", async (e) => {
const nextProf = String(e?.target?.value || wfstSel.value || "");
if (nextProf) {
state.orthographyProfile = nextProf;
await hydrateStudyDrawerPanel(ctx);
}
});
}
}

// D5-R38 / D9-R39 / D8-R41 / D3-R45: Hidrata Sustituciones Diacrónicas + ModernizeRegister sin duplicar Typology (propiedad de Print `2. Pliegos`).
const diachronicAuditPanel = getEl("diachronicRegisterAuditPanel", targetDoc);
if (diachronicAuditPanel) {
const chapterVerses = state.lastNavResult?.chapter?.verses || {};
const activeV = String(state.verse || 1);
const modernizeStudyHtml = renderModernizeRegisterDiffHtml({
modernText: chapterVerses[activeV] || "",
classicText: state.lastNavResult?.bridgeChapter?.verses?.[activeV] || "",
uiLocale: state.uiLocale || "es",
idPrefix: "study",
});
const unifiedCtxHtml = renderUnifiedDiachronicContextHtml({
verses: chapterVerses,
bookCode: state.book,
chapter: state.chapter,
osisRef: `${state.book}.${state.chapter}.${state.verse}`,
includeInlineSubstitutionsDetails: false,
});
const auditCardHtml = renderChapterDiachronicAuditCardHtml({
verses: chapterVerses,
bookCode: state.book,
chapter: state.chapter,
query: state.diachronicQuery || "",
activeTier: state.diachronicTier || 0,
uiLocale: state.uiLocale || "es",
});
mountCardHtmlIntoHost(diachronicAuditPanel, auditCardHtml);
const corpusMetricsHtml =
`<section id="studyDeepCorpusMetricsDetails" class="tech-details ek-mt-xs"><strong class="ek-title-sm">📐 ${isEnStudySync ? "Corpus Tokens, Calibration & Register Metrics" : "Totales del Corpus, Calibración y Registro"}</strong>` +
summarizeAnnotationIndexTotals(state.annotationIndexReport || null, state.uiLocale || "es").html +
summarizeDiachronicAndBlindCalibration({
corpusSummary: state.diachronicRegisterPayload?.corpus_summary || null,
blindReport: state.blindCalibrationReport || null,
uiLocale: state.uiLocale || "es",
}) +
`</section>`;
diachronicAuditPanel.innerHTML = `${modernizeStudyHtml}${diachronicAuditPanel.innerHTML || ""}${unifiedCtxHtml}${corpusMetricsHtml}`;
const diaSearchInp = getEl("diachronicSubstitutionsSearchInput", targetDoc);
const diaTierSel = getEl("diachronicTierFilterSelect", targetDoc);
const refreshDiachronicRulesList = () => {
const listEl = getEl("diachronicSubstitutionsResultsList", targetDoc);
if (!listEl) return;
const q = String(diaSearchInp?.value ?? state.diachronicQuery ?? "").trim().toLowerCase();
const t = Number(diaTierSel?.value ?? state.diachronicTier ?? 0);
state.diachronicQuery = q;
state.diachronicTier = t;
const filtered = getAll156DiachronicSubstitutionsCatalog().filter((r) => {
if (t >= 1 && t <= 3 && r.tier !== t) return false;
if (q) return r.archaic.toLowerCase().includes(q) || r.modern.toLowerCase().includes(q);
return true;
});
listEl.setAttribute("data-shown-rules", String(filtered.length));
listEl.innerHTML = filtered
.map(
(r) =>
`<span class="uls-badge diachronic-rule-chip" data-diachronic-rule-tier="${r.tier}" data-archaic="${escHtml(r.archaic)}" data-modern="${escHtml(r.modern)}">[T${r.tier}] ${escHtml(r.archaic)} → <strong>${escHtml(r.modern)}</strong></span>`,
)
.join(" ");
};
if (diaSearchInp && typeof diaSearchInp.addEventListener === "function" && !diaSearchInp._diaBound) {
diaSearchInp._diaBound = true;
diaSearchInp.addEventListener("input", refreshDiachronicRulesList);
diaSearchInp.addEventListener("change", refreshDiachronicRulesList);
}
if (diaTierSel && typeof diaTierSel.addEventListener === "function" && !diaTierSel._diaBound) {
diaTierSel._diaBound = true;
diaTierSel.addEventListener("change", refreshDiachronicRulesList);
}
}

return html;
}

export async function resolvePrimaryStrongForVerse(state, dataLayer) {
try {
const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
const rows = Array.isArray(matrixChapter?.rows) ? matrixChapter.rows : [];
let fallbackStrong = "";
for (const r of rows) {
const isArr = Array.isArray(r);
const vNum = isArr ? Number(r[1]) : Number(r?.verse);
const strong = String(isArr ? (r[6] || "") : (r?.c07_strong_id || "")).trim().toUpperCase();
if (vNum !== Number(state.verse) || !strong || strong === "∅") continue;
if (!fallbackStrong) fallbackStrong = strong;
const morph = isArr ? (r[4] || "") : (r?.c08_morph_code || "");
const role = isArr ? (r[9] || "") : (r?.c09_macula_role || "");
const domain = isArr ? (r[5] || "") : (r?.c11_semantic_domain || "");
const nsm = isArr ? (r[11] || "") : (r?.c13_nsm_65 || "");
if (strong.includes("+") || !isClosedClassFunctionTag(domain, role, morph, nsm)) return strong;
}
if (fallbackStrong) return fallbackStrong;
} catch {
// Fallback by testament
}
return "";
}

