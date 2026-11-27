// ============================================================================
// web/mostrador/print_work_and_photocopy.js — Submódulo de Contexto Multi-Obra,
// Papel SSOT (A4 / US-LETTER), Oráculo Unificado Sauvola y Vista Braille B70
// Decisiones D2-R9, D5-R9, D6-R9, D8-R9 · Cero estilos inline · Costura limpia
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { isRtlLocale } from "./i18n.js";
import {
  auditFoldedPageOrder,
  bindImpositionAndLayoutButtons,
  renderImpositionDuplexSvgDiagram,
  resolveDuplexFlipEdge,
} from "./print_imposition_and_duplex_svg.js";
import { storeWorkerTandaPdfResult } from "./print_catalog_actions.js";
import { renderPhysicalPrintGuideHtml } from "./print_guide_and_progress.js";
import { resolveActiveWorkDrawerContext } from "./projection_contract.js";
import { resolveSafeDownloadFilename } from "./stealth_filename.js";

export {
  auditFoldedPageOrder,
  bindImpositionAndLayoutButtons,
  renderImpositionDuplexSvgDiagram,
  resolveDuplexFlipEdge,
  storeWorkerTandaPdfResult,
};

export function normalizeStandardPaperFormat(raw = "a4") {
const clean = String(raw || "a4").trim().toLowerCase();
if (/^(letter|us[-_]?letter|carta)$/.test(clean)) return "letter";
if (clean.includes("b70") || clean.includes("braille")) return "b70";
if (clean.includes("a3")) return "a3";
if (clean.includes("folio") || clean.includes("oficio")) return "folio";
return "a4";
}

export function formatStandardPaperBadge(raw = "a4") {
const norm = normalizeStandardPaperFormat(raw);
if (norm === "letter") return "US-LETTER";
if (norm === "b70") return "B70";
if (norm === "a3") return "A3";
if (norm === "folio") return "FOLIO";
return "A4";
}

export function resolveUnifiedSauvolaState(state = {}) {
const genIndex = Number.isInteger(state?.photocopyGen)
? Math.max(0, Math.min(5, state.photocopyGen))
: 3;
const rawK = Number(state?.sauvolaK);
const sauvolaK =
Number.isFinite(rawK) && rawK > 0
? Math.max(0.15, Math.min(0.45, Number(rawK.toFixed(2))))
: 0.25;
return {
genIndex,
sauvolaK,
dpi: 300,
R: 128,
};
}

export function renderPrintActiveWorkBannerHtml(state = {}) {
const workCtx = resolveActiveWorkDrawerContext(state);
if (!workCtx.isSisterWork) return "";
const isEn = String(state?.uiLocale || "es").trim().toLowerCase().startsWith("en");
const scopeCopy =
workCtx.activeWork === "felices"
? isEn
? "Prints 27 bilingual plates / selected paper format alongside the passage anchor."
: "Imprime las 27 láminas bilingües / tamaño activo junto con el pasaje bíblico ancla."
: isEn
? "Prints the 52 liturgical gospel sheets / active paper format alongside the passage anchor."
: "Imprime las 52 láminas litúrgicas del evangelio / papel activo junto con el pasaje ancla.";
return (
`<aside id="printActiveWorkBanner" class="work-context-drawer-banner" data-active-work="${escapeHtml(workCtx.activeWork)}">` +
`<strong>${escapeHtml(workCtx.bannerText)}</strong>` +
`<span class="ek-meta"> · ${escapeHtml(scopeCopy)}</span>` +
`</aside>`
);
}

export function mountOrUpdatePrintActiveWorkBanner(sheetEl, targetDoc, state = {}) {
if (!sheetEl) return null;
const html = renderPrintActiveWorkBannerHtml(state);
let bannerEl =
typeof targetDoc?.getElementById === "function"
? targetDoc.getElementById("printActiveWorkBanner")
: null;
if (!html) {
if (bannerEl) bannerEl.hidden = true;
return null;
}
if (!bannerEl && typeof targetDoc?.createElement === "function" && typeof sheetEl.insertBefore === "function") {
bannerEl = targetDoc.createElement("aside");
bannerEl.id = "printActiveWorkBanner";
bannerEl.className = "work-context-drawer-banner";
sheetEl.insertBefore(bannerEl, sheetEl.firstChild || null);
}
if (bannerEl) {
bannerEl.hidden = false;
bannerEl.setAttribute?.("data-active-work", String(state?.activeWork || "biblia"));
const innerMatch = html.match(/^<aside[^>]*>([\s\S]*)<\/aside>$/i);
bannerEl.innerHTML = innerMatch ? innerMatch[1] : html;
}
return bannerEl;
}

export function renderUnifiedBraillePreviewHtml({
verseRef = "GEN 1:1",
unicodeText = "",
brfText = "",
isEn = false,
nemethEnabled = false,
} = {}) {
const previewLine = String(unicodeText || brfText || "").trim().slice(0, 72);
if (!previewLine) return "";
const specLabel = isEn
? `BEB B70 (280×292 mm · 40 cells/line · ${nemethEnabled ? "Nemeth active" : "Literary UEB/SP"})`
: `BEB B70 (280×292 mm · 40 celdas/línea · ${nemethEnabled ? "Nemeth activo" : "Literario CBE/UEB"})`;
return (
`<div id="brailleLivePreviewCard" class="ek-card-muted ek-mt-xs" data-braille-b70-preview="true" data-nemeth-enabled="${nemethEnabled ? "true" : "false"}">` +
`<div class="ek-row-between"><strong>⠋ ${escapeHtml(verseRef)}</strong><span class="uls-badge ek-badge-compact">${escapeHtml(specLabel)}</span></div>` +
`<p class="ek-meta ek-mt-xs" lang="und-Brai">${escapeHtml(previewLine)}</p>` +
`</div>`
);
}

export function buildEditionCatalogCardHtml(ed, {
state,
activeProfileId,
effectiveLang,
effectivePaper,
activeBlockCode,
editionScopeSig,
isEn,
buildRelativePdfAssetUrl,
encodePaperFormatCode,
} = {}) {
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
const cardPaperRaw = String(ed.paperSize || "").toLowerCase();
const normEffPaper = normalizeStandardPaperFormat(effectivePaper || "a4");
const isAdaptableStdPaper =
(cardPaperRaw === "a4" || cardPaperRaw === "letter" || cardPaperRaw === "us-letter") &&
(normEffPaper === "a4" || normEffPaper === "letter");
const resolvedCardPaper = isAdaptableStdPaper ? normEffPaper : (ed.paperSize || "");
const displayPaperBadge = isAdaptableStdPaper
? formatStandardPaperBadge(normEffPaper)
: ed.paperSize
? formatStandardPaperBadge(ed.paperSize)
: "";
const paperCode = encodePaperFormatCode(
resolvedCardPaper || effectivePaper,
String(resolvedCardPaper || "").toLowerCase().includes("landscape") ? "landscape" : "portrait",
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
displayPaperBadge,
].filter(Boolean);
const cleanLabel = String(ed.label || "").replace(/\s*\(\s*\d+\s*col\s*·[^)]*\)/i, "").trim();
const specBadge = specParts.length
? `<span class="edition-spec-badge">${escapeHtml(specParts.join(" · "))}</span>`
: "";
return (
`<a class="uls-chip print-edition-card${isSelected ? " is-selected" : ""}" aria-pressed="${isSelected ? "true" : "false"
}" href="${escapeHtml(resolvedHref)}" data-profile-id="${escapeHtml(cardId)}" data-edition-slug="${escapeHtml(
ed.editionSlug,
)}" data-edition-mode="${dynamicFieldMode}" data-paper-code="${paperCode}" data-active-block="${escapeHtml(activeBlockCode)}" data-field-pdf-bytes="${escapeHtml(
ed.bytes || "",
)}" data-geometry-key="${escapeHtml(ed.geometryKey || "")}" data-edition-kind="${escapeHtml(
ed.kind || "edition",
)}" data-toml-path="${escapeHtml(ed.tomlPath || "")}" data-font-pt="${escapeHtml(
ed.fontPt || "",
)}" data-columns="${escapeHtml(ed.columns || "")}" data-paper-size="${escapeHtml(
resolvedCardPaper,
)}" data-has-precompiled-pdf="${Boolean(staticFieldHref && !cachedCardHref)}" data-availability-mode="bimodal_client_print" data-bimodal-lane="lane_b_worker_tanda" download>📄 ${escapeHtml(cleanLabel)}${specBadge}</a>`
);
}

export function renderFieldRefugeAndChecklistHtml(profilesArtifact = null, uiLocale = "es") {
const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
const fieldPdfs = profilesArtifact?.field_pdfs || {};
const refugePath = String(fieldPdfs?.refugio_4_hojas?.path || "obras/biblia/campo/refugio_4_hojas.pdf");
const refugeKb = Math.max(1, Math.round((Number(fieldPdfs?.refugio_4_hojas?.bytes) || 54304) / 1024));
const checkPath = String(fieldPdfs?.checklist_80_bloques?.path || "obras/biblia/campo/checklist_80_bloques.pdf");
const checkKb = Math.max(1, Math.round((Number(fieldPdfs?.checklist_80_bloques?.bytes) || 12312) / 1024));
const defaultAnchors = [
"Hoja 1: Creación, Caída y Promesa (Génesis 1–3 · Salmo 23 · Isaías 53)",
"Hoja 2: Las 12 Dichas de Jesús y el Sermón del Monte (Mateo 5–7 · Lucas 15)",
"Hoja 3: Cruz, Resurrección y Nueva Creación (Juan 1, 3, 19–20 · Romanos 8)",
"Hoja 4: La Mesa, Consuelo e Iglesia en Casa (Salmo 91 · 1 Corintios 13 · Apocalipsis 21–22)",
];
const anchors =
Array.isArray(profilesArtifact?.pocket_refuge_4_sheets_spec?.anchors) &&
profilesArtifact.pocket_refuge_4_sheets_spec.anchors.length > 0
? profilesArtifact.pocket_refuge_4_sheets_spec.anchors
: defaultAnchors;
const anchorItemsHtml = anchors.map((a) => `<li>${escapeHtml(a)}</li>`).join("");

return (
`<section id="printFieldPdfsCard" class="ek-card ek-stack-sm ek-mt-sm" data-field-pdfs="true">` +
`<div class="ek-row-between">` +
`<strong>🏕️ ${isEn ? "Emergency Field Kits (Ready PDFs)" : "Kits de Campo e Impresión de Refugio (PDFs Listos)"}</strong>` +
`<span class="uls-badge">60% · 47 pp · 80 bloques</span>` +
`</div>` +
`<div class="ek-row-wrap">` +
`<a id="linkFieldRefuge4SheetsPdf" class="uls-chip ek-btn-link" href="${escapeHtml(refugePath)}" download="refugio_4_hojas.pdf">` +
`🛡️ ${isEn ? `4-Sheet Pocket Refuge (${refugeKb} KB PDF)` : `Refugio de Bolsillo 4 Hojas (${refugeKb} KB PDF)`}</a>` +
`<a id="linkFieldChecklist80Pdf" class="uls-chip ek-btn-link" href="${escapeHtml(checkPath)}" download="checklist_80_bloques.pdf">` +
`☑️ ${isEn ? `80-Block Canon Checklist (${checkKb} KB PDF)` : `Lista de 80 Bloques Canónicos (${checkKb} KB PDF)`}</a>` +
`</div>` +
`<details class="tech-details ek-mt-xs" data-refuge-anchors="true"><summary>${isEn ? "4 Refuge Sheet Anchors" : "Anclas de las 4 hojas de refugio"}</summary>` +
`<ul class="ek-list-compact ek-mt-xs">${anchorItemsHtml}</ul>` +
`</details>` +
`</section>`
);
}

export function renderCompactTypologySelectorHtml({
branches = [],
typologies = [],
activeBranchId = "",
activeTypologyId = "",
uiLocale = "es",
} = {}) {
const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
const branchOptions = (Array.isArray(branches) ? branches : []).map((b) => {
const id = String(b?.id || "");
const name = String(b?.label || b?.parsed?.family_name || id).replace(/^G_\d+_/i, "").replace(/_/g, " ");
const order = String(b?.parsed?.word_order || "");
const sel = id === activeBranchId ? " selected" : "";
return `<option value="${escapeHtml(id)}"${sel}>${escapeHtml(name)}${order ? ` (${escapeHtml(order)})` : ""}</option>`;
}).join("");
const typoOptions = (Array.isArray(typologies) ? typologies : []).map((t) => {
const id = String(t?.id || "");
const langCode = String(t?.lang_code || t?.data?.lang_code || id.replace(/_typology$/, "")).toUpperCase();
const order = String(t?.word_order || t?.data?.word_order || "");
const sel = id === activeTypologyId ? " selected" : "";
return `<option value="${escapeHtml(id)}"${sel}>${escapeHtml(langCode)}${order ? ` · ${escapeHtml(order)}` : ""}</option>`;
}).join("");

return (
`<section id="printTypologyBridgeCard" class="ek-card-muted ek-stack-sm ek-mt-xs" data-typology-bridge="true">` +
`<strong class="ek-title-sm">🌐 ${isEn ? "Language-adapted layout (12 families × 16 scripts)" : "Diseño adaptado al idioma (12 familias × 16 escrituras)"}</strong>` +
`<div class="ek-form-pair ek-mt-xs">` +
`<label class="ek-label-sm">${isEn ? "Linguistic branch (12)" : "Rama lingüística (12)"}` +
`<select id="printBranchProfileSelect" class="ek-input">${branchOptions}</select></label>` +
`<label class="ek-label-sm">${isEn ? "Typological syntax (16)" : "Perfil sintáctico (16)"}` +
`<select id="printTypologyProfileSelect" class="ek-input">${typoOptions}</select></label>` +
`</div>` +
`</section>`
);
}

export function renderDuplexAssistantCardHtml({
slug = "02_2col_pastoral",
duplex = true,
foliation = {},
flipEdgeInfo = {},
budgetSummary = "",
nemethChecked = false,
verseRef = "GEN 1:1",
unicodeText = "",
brfText = "",
brfHref = "",
brfFilename = "ekovoz.brf",
multiSigHtml = "",
macroTandas16Html = "",
isEn = false,
} = {}) {
const duplexHeader = isEn
? `Duplex Assistant (${duplex ? `2-sided · ${flipEdgeInfo.labelEn || "short edge"}` : "1-sided"}) · ${escapeHtml(foliation.summary || "")}`
: `Asistente Dúplex (${duplex ? `2 caras · ${flipEdgeInfo.labelEs || "borde corto"}` : "1 cara"}) · ${escapeHtml(foliation.summary || "")}`;
const duplexBody = `${escapeHtml(flipEdgeInfo.step2Text || "")} · ${escapeHtml(budgetSummary || "")}.`;
const nemethCheckedAttr = nemethChecked ? " checked" : "";
const nemethLabel = isEn
? "Tactile Math Notation (Nemeth)"
: "Notación matemática táctil (Nemeth)";
const nemethToggleHtml =
`<div class="braille-actions-row">` +
`<label class="hig-toggle-row uls-chip" data-braille-switch-label="true">` +
`<input type="checkbox" id="chkBrailleNemethToggle" class="hig-switch" data-action="toggle-braille-nemeth" data-edition-slug="11_braille_nemeth_b70" aria-label="${escapeHtml(nemethLabel)}"${nemethCheckedAttr} />` +
`<span id="brailleNemethSwitchLabel">${escapeHtml(nemethLabel)}</span></label>` +
`<a id="btnDownloadBrailleBrf" class="uls-chip" href="${escapeHtml(brfHref)}" download="${escapeHtml(brfFilename)}" data-edition-slug="11_braille_nemeth_b70">` +
`⠋ ${isEn ? "Download Tactile .brf (Ed. 11)" : "Descargar .brf Táctil (Ed. 11)"}</a>` +
`</div>`;
const braillePreviewHtml = renderUnifiedBraillePreviewHtml({
verseRef,
unicodeText,
brfText,
isEn,
nemethEnabled: nemethChecked,
});
const physicalGuideHtml = renderPhysicalPrintGuideHtml(
foliation?.paper || "a4",
isEn ? "en" : "es",
);
const techDetailsTitle = isEn
? "Technical booklet & imposition details"
: "Detalles técnicos de pliegos e imposición";
const creepNote = isEn
? "Booklet fold order with automatic inner-margin adjustment."
: "Orden de cuadernillo con ajuste automático del margen interno.";
const macroDetailsSummary = isEn
? "Booklet volumes & 80 blocks (16 batches)"
: "Tomos por volumen y 80 bloques (16 macro-tandas)";
return `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(slug)}" data-foliation-mode="${escapeHtml(foliation.mode || "saddle_stitch")}" data-binding-edge="${escapeHtml(foliation.bindingEdge || "left")}" data-flip-edge="${escapeHtml(flipEdgeInfo.edge || "short")}">${nemethToggleHtml}${braillePreviewHtml}${physicalGuideHtml}<p class="ek-meta ek-m-0">${creepNote}</p><section class="ek-stack-xs" data-technical-plane="true"><strong class="ek-title-sm">${techDetailsTitle}</strong><strong>${duplexHeader}</strong><p class="duplex-summary-text">${duplexBody}</p><strong class="ek-title-sm">${macroDetailsSummary}</strong>${multiSigHtml}${macroTandas16Html}</section></div>`;
}

export function renderStationeryPostcardHtml({
osis = "GEN.1.1",
refLabel = "GEN 1:1",
verseText = "",
postalHref = "#",
postalDownload = "ekovoz-postal.html",
isEn = false,
} = {}) {
return (
`<div id="printStationeryPostcardCard" class="mostrador-stationery-card" data-osis="${escapeHtml(osis)}" data-stationery-only="true" data-excludes-sauvola="true">` +
`<strong>✉️ ${isEn ? "A6 Typographic Gift Postcard" : "Postal tipográfica A6 de regalo"} (${escapeHtml(refLabel)})</strong>` +
`<p class="ek-meta ek-m-0">${isEn ? "Clean high-contrast layout for direct printing (independent of photocopy test below)." : "Diseño limpio para regalo o tarjeta personal (independiente de la prueba de fotocopia inferior)."}</p>` +
`<blockquote class="stationery-quote">"${escapeHtml(verseText)}"</blockquote>` +
`<a id="btnDownloadStationeryPostcard" class="uls-chip stationery-download-btn" href="${escapeHtml(postalHref)}" download="${escapeHtml(postalDownload)}">✉️ ${isEn ? "Download A6 Postcard (HTML)" : "Descargar Postal A6 (HTML)"}</a>` +
`</div>`
);
}

export function bindPagedMediaPrintButton({
state,
targetDoc,
getEl,
buildCssPagedMediaPrintHtml,
stealthBlkNum,
} = {}) {
const btnPagedMedia = getEl("btnPrintCssPagedMedia", targetDoc);
if (!btnPagedMedia || typeof btnPagedMedia.addEventListener !== "function" || btnPagedMedia._pagedMediaBound) return;
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

/**
 * Renderiza bajo demanda las 6 láminas tipográficas reales (`web/preview/*.png`),
 * las especificaciones TOML crudas (`print_profiles_14[].raw_preview`) y telemetría de motores Rust (`SLICE-EKO-HIG6-12`).
 */
export function renderCompactPdfPortalsSelectHtml(portalsRawHtml = "", uiLocale = "es") {
const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
const primaryLinkMatch = String(portalsRawHtml).match(/<a class="btn-modal-action" href="([^"]+)">([^<]+)<\/a>/);
if (!primaryLinkMatch) return String(portalsRawHtml || "");
const opts = Array.from(String(portalsRawHtml).matchAll(/href="(pdf\/([^"]+)\/index\.html)"[^>]*>([^<]+)<\/a>/g))
.slice(1)
.map((m) => `<option value="${m[1]}">${m[2]} · PDF</option>`).join("");
return `<div class="ek-subcard ek-row-wrap"><strong class="ek-title-sm">🌐 ${isEn ? "PDF Portals (24 languages)" : "Portadas PDF (24 idiomas)"}</strong><a class="btn-modal-action" href="${primaryLinkMatch[1]}">${primaryLinkMatch[2]}</a>` +
`<select id="printPdfPortalSelect" class="ek-select-compact" aria-label="${isEn ? "Open PDF portal in another language" : "Abrir portada PDF en otro idioma"}"><option value="">${isEn ? "Other 24 languages…" : "Otros 24 idiomas…"}</option>${opts}</select></div>`;
}

export function renderEditorialPreviewsAndEngineTelemetryHtml({
editorialProfiles = null,
uiLocale = "es",
} = {}) {
const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
const previewFiles = ["0001.png", "0006.png", "0007.png", "0008.png", "0016.png", "0018.png"];
const thumbsHtml = previewFiles
.map(
(fn) =>
`<a class="uls-chip ek-btn-link" href="preview/${fn}" target="_blank" rel="noopener">` +
`<img src="preview/${fn}" alt="${escapeHtml(`${isEn ? "Print specimen" : "Muestra impresa"} ${fn}`)}" loading="lazy" width="64" height="86" class="photocopy-preview-img"> ` +
`<span>${escapeHtml(fn.replace(/\.png$/, ""))}</span></a>`,
)
.join(" ");
const prof0 = Array.isArray(editorialProfiles?.print_profiles_14) ? editorialProfiles.print_profiles_14[0] : null;
const rawSpec = String(prof0?.raw_preview || "").trim();
const stealthMeta = editorialProfiles?.stealth_metadata || editorialProfiles || {};
const sourceStem = String(prof0?.sourceStem || stealthMeta.sourceStem || "biblia");
const camouflagedTitleLen = Number(stealthMeta.camouflaged_title_len || prof0?.camouflaged_title_len || 32);
const reverseLemmaPresent = Boolean(stealthMeta.reverse_lemma_present ?? prof0?.reverse_lemma_present ?? true);
const tel = editorialProfiles?.rust_domain_engines_telemetry || null;
const telHtml = tel
? `<p class="ek-meta ek-mt-xs"><strong>${isEn ? "Typesetting Engine Status:" : "Estado del motor tipográfico:"}</strong> ` +
`${isEn ? "surface score" : "puntuación"} ${Number(tel.core_surface_score || 0)} · ` +
`${Number(tel.canonical_bible_profiles_count || 9)} ${isEn ? "canonical profiles" : "perfiles canónicos"} · ` +
`${tel.fonts_28_manifest_verified ? (isEn ? "verified fonts" : "fuentes verificadas") : (isEn ? "font check" : "revisión tipográfica")} · ` +
`${Number(tel.fountain_lt_probe_packets || 6)} ${isEn ? "control packets" : "paquetes de control"} · ` +
`${escapeHtml(sourceStem)} (${camouflagedTitleLen} ${isEn ? "chars" : "car."}${reverseLemmaPresent ? (isEn ? ", reverse gloss ready" : ", glosa inversa lista") : ""})</p>`
: `<p class="ek-meta ek-mt-xs">${escapeHtml(sourceStem)} · ${camouflagedTitleLen} ${isEn ? "chars" : "car."}${reverseLemmaPresent ? (isEn ? " · reverse gloss ready" : " · glosa inversa lista") : ""}</p>`;
return (
`<section id="printEditorialPreviewsDetails" class="ek-card-muted ek-mt-xs" data-preview-plates="6">` +
`<strong class="ek-title-sm">🖼️ ${isEn ? "Editorial Print Samples (6 plates)" : "Muestras reales de impresión (6 láminas)"}</strong>` +
`<div class="ek-row-wrap ek-mt-xs">${thumbsHtml}</div>` +
`<div id="printTypesettingTelemetryDetails" class="tech-details ek-mt-xs" data-advanced-audit="true" data-contextual-details="true">` +
`<strong class="ek-title-sm">📐 ${isEn ? "Typesetting profile specifications" : "Especificaciones técnicas de maquetación"}</strong>` +
(rawSpec ? `<pre class="ek-meta ek-mt-xs" data-raw-profile-preview="true">${escapeHtml(rawSpec)}</pre>` : "") +
telHtml +
`</div>` +
`</section>`
);
}
