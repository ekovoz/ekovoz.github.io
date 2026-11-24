// ============================================================================
// web/mostrador/drawer_study.js — Gaveta 1 (Estudio 15-Col, Rosetta NSM-65 & Calibración WFST/Diacrónica)
// Decisiones D1-R41, D2-R41, D3-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { BIBLE_CONSTANTS } from "./data_layer.js";
import {
  getAll156DiachronicSubstitutionsCatalog,
  hydrateDiachronicRegister,
  renderChapterDiachronicAuditCardHtml,
  renderUnifiedDiachronicContextHtml,
} from "./diachronic_register.js";
import { bindSurfaceActions, patchStoreState, patchTextAndAttrs, reconcileKeyedList } from "./dom_patch.js";
import { renderBranchAndTypologyInspectorHtml } from "./dosis.js";
import {
  decodeSdbhHierarchicalCode,
  highlightStudyCardByStrongId,
  hydrateCulturalGlossesLexicon,
  hydratePhilologyRosettaIndex,
  renderPhilologyRosettaExplorerHtml,
  renderPhilologyRosettaInspectorHtml,
  renderPhilologyRosettaResultsRowsHtml,
  searchPhilologyRosettaIndex,
  translateNsm65PrimePhrase,
} from "./estudio.js";
import { hydratePericopesAndGlosses } from "./evangelios.js";
import {
  listOrthographyProfilesForLang,
  renderWfstAndScriptioContinuaInspectorHtml,
} from "./orthography_wfst.js";
import { applyGrambankTypologyToPrint } from "./print_config_projector.js";
import { resolveActiveWorkDrawerContext } from "./projection_contract.js";
import { parseBiblicalCoordinateReference } from "./reference.js";
import { hydrateOnomasticonAndUbsPanels, renderFormulaicParallelsCardHtml } from "./study_onomasticon_and_ubs.js";

export const HAREL_STUDY_SUBTABS = ["words", "rosetta", "calibrate"];

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAnnotationAndBlindCalibrationCardHtml({
  annotationReport = null,
  blindCalibrationRows = null,
  sampleRow = null,
  activeLang = "es",
  activeBook = "GEN",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const canonicalVerses = Number(BIBLE_CONSTANTS?.CANONICAL_VERSES_COUNT || 31102);
  const canonicalCols = Number(BIBLE_CONSTANTS?.MATRIX_TIER0_DESCRIPTORS_COUNT || BIBLE_CONSTANTS?.MATRIX_COLUMNS_COUNT || 15);
  const sampleSdbh = sampleRow?.c11_semantic_domain
    ? decodeSdbhHierarchicalCode(sampleRow.c11_semantic_domain, uiLocale).label
    : "";
  const sampleNsm = sampleRow?.c13_nsm_65
    ? translateNsm65PrimePhrase(sampleRow.c13_nsm_65, uiLocale)
    : "";

  const parts = [];
  if (annotationReport && typeof annotationReport === "object") {
    const totals = annotationReport.totals || {};
    const ratios = annotationReport.ratios || {};
    const thresholds = annotationReport.thresholds || {};
    const residualsByKind = annotationReport.residuals_by_kind || {};
    const sources = Array.isArray(annotationReport.sources) ? annotationReport.sources : [];
    const indexSha = String(annotationReport.index_sha256 || "");
    const residualsSha = String(annotationReport.residuals_sha256 || "");
    const otTokens = Number(totals.ot_tokens || 0);
    const ntTokens = Number(totals.nt_tokens || 0);
    const totalTokens = otTokens + ntTokens;
    const residualEntries = Object.entries(residualsByKind);
    const totalResiduals = residualEntries.reduce((acc, [, v]) => acc + (Number(v) || 0), 0);
    const residualBadges = residualEntries
      .map(
        ([kind, count]) =>
          `<span class="uls-badge" data-residual-kind="${escHtml(kind)}">${escHtml(kind)}: <strong>${Number(count) || 0}</strong></span>`,
      )
      .join(" ");
    const sourceBadges = sources
      .map(
        (src) =>
          `<span class="uls-badge" data-open-source-id="${escHtml(src.id)}" title="SHA-256: ${escHtml(src.sha256)}">${escHtml(src.id)} (${escHtml(src.license)} · <code>${escHtml(String(src.sha256 || "").slice(0, 8))}</code>)</span>`,
      )
      .join(" ");
    const gatePass = Boolean(thresholds.pass);
    const ntSpanRatio = ((Number(ratios.nt_tagnt_spanish) || 0) * 100).toFixed(2);
    const minNtSpan = ((Number(thresholds.min_nt_tagnt_spanish) || 0.95) * 100).toFixed(0);
    const otUnannRatio = ((Number(ratios.ot_unannotated) || 0) * 100).toFixed(3);
    const maxOtUnann = ((Number(thresholds.max_ot_unannotated) || 0.01) * 100).toFixed(1);
    const ntUnannRatio = ((Number(ratios.nt_unannotated) || 0) * 100).toFixed(3);
    const maxNtUnann = ((Number(thresholds.max_nt_unannotated) || 0.005) * 100).toFixed(1);
    const otKetivRatio = ((Number(ratios.ot_ketiv) || 0) * 100).toFixed(3);
    const maxOtKetiv = ((Number(thresholds.max_ot_ketiv) || 0.005) * 100).toFixed(1);

    parts.push(
      `<section class="calibration-mass-conservation-card" data-annotation-mass-conservation="true" data-total-tokens="${totalTokens}" data-total-residuals="${totalResiduals}" data-canonical-verses="${canonicalVerses}" data-matrix-columns="${canonicalCols}" data-index-sha256="${escHtml(indexSha.slice(0, 16))}" data-residuals-sha256="${escHtml(residualsSha.slice(0, 16))}">` +
      `<div class="calib-card-header">` +
      `<strong>⚖️ ${isEn ? "Lexical Concordance Coverage" : "Cobertura Léxica Completa"} (${totalTokens.toLocaleString("en-US")} tokens · ${canonicalVerses.toLocaleString("en-US")} vv.)</strong>` +
      `<span class="uls-badge" data-thresholds-pass="${gatePass}">${gatePass ? (isEn ? "✅ Quality Verified" : "✅ Calidad Verificada") : "⚠️"}</span>` +
      `</div>` +
      `<details class="tech-details">` +
      `<summary>${isEn ? "Technical verification details (Mass Conservation · Residuals)" : "Detalles técnicos de verificación (Masa léxica · Residuales)"}</summary>` +
      `<div class="ek-stack-sm ek-mt-sm">` +
      `<span class="uls-badge">TAGNT-ES ${ntSpanRatio}% (≥${minNtSpan}%) · OT-Unann ${otUnannRatio}% (≤${maxOtUnann}%) · NT-Unann ${ntUnannRatio}% (≤${maxNtUnann}%) · Ketiv ${otKetivRatio}% (≤${maxOtKetiv}%)</span>` +
      (sampleSdbh || sampleNsm
        ? `<div class="hig-tech-meta">${sampleSdbh ? `<span>SDBH: ${escHtml(sampleSdbh)}</span>` : ""}${sampleSdbh && sampleNsm ? " · " : ""}${sampleNsm ? `<span>NSM-65: ${escHtml(sampleNsm)}</span>` : ""}</div>`
        : "") +
      `<div class="calib-badge-row">` +
      `<span class="calib-row-label">${isEn ? `5 Residual Classes (${totalResiduals.toLocaleString("en-US")}):` : `5 Clases Residuales (${totalResiduals.toLocaleString("en-US")}):`}</span> ${residualBadges}` +
      `</div>` +
      `<div class="calib-badge-row calib-sources-row">` +
      `<span class="calib-row-label">${isEn ? `${sources.length} Open Sources:` : `${sources.length} Fuentes Abiertas:`}</span> ${sourceBadges}` +
      `</div>` +
      `</div>` +
      `</details>` +
      `</section>`,
    );
  }

  if (Array.isArray(blindCalibrationRows) && blindCalibrationRows.length > 0) {
    const booksOrder = ["GEN", "PSA", "ISA", "JON"];
    const byLang = new Map();
    for (const row of blindCalibrationRows) {
      const lc = String(row.lang_code || "").trim();
      if (!lc) continue;
      if (!byLang.has(lc)) {
        byLang.set(lc, {
          langCode: lc,
          macroFamily: String(row.macro_family || ""),
          cells: new Map(),
        });
      }
      byLang.get(lc).cells.set(String(row.book_usfm || "").toUpperCase(), row);
    }
    const normLang = String(activeLang || "es").split("-")[0].toLowerCase();
    const normBook = String(activeBook || "GEN").toUpperCase();
    const headerCells = booksOrder
      .map((bk) => {
        const isActiveCol = bk === normBook;
        return `<th class="calib-th${isActiveCol ? " is-active-col" : ""}" data-book-col="${bk}" data-active-book-col="${isActiveCol}">${bk}</th>`;
      })
      .join("");
    const bodyRows = Array.from(byLang.values())
      .map((entry) => {
        const isActiveRow = entry.langCode.toLowerCase() === normLang;
        const tds = booksOrder
          .map((bk) => {
            const cell = entry.cells.get(bk);
            const isActiveCol = bk === normBook;
            if (!cell) return `<td class="calib-td-num">—</td>`;
            const chrf = Number(cell.chrf_plus_plus || 0).toFixed(1);
            const charF2 = Number(cell.char_f2 || 0).toFixed(1);
            const wordF2 = Number(cell.word_f2 || 0).toFixed(1);
            const lr = Number(cell.length_ratio_gale_church || 1).toFixed(2);
            const mattr = Number(cell.mattr_50 || 1).toFixed(2);
            const passGate = Boolean(cell.passes_release_gate);
            return `<td class="calib-td-num${isActiveRow && isActiveCol ? " is-active-cell" : ""}" data-calib-cell="${escHtml(entry.langCode)}:${bk}" data-passes-gate="${passGate}" data-active-cell="${isActiveRow && isActiveCol}" title="charF2=${charF2} · wordF2=${wordF2} · Gale-Church=${lr} · MATTR50=${mattr}">${chrf}${passGate ? "" : "⚠"}</td>`;
          })
          .join("");
        return (
          `<tr class="${isActiveRow ? "is-active-lang-row" : ""}" data-calib-lang="${escHtml(entry.langCode)}" data-active-lang-row="${isActiveRow}">` +
          `<td class="calib-td-lang"><code>${escHtml(entry.langCode)}</code> <span class="calib-family-tag">(${escHtml(entry.macroFamily)})</span></td>` +
          tds +
          `</tr>`
        );
      })
      .join("");

    parts.push(
      `<section class="blind-calibration-chrf-card" data-blind-calibration-matrix="true" data-langs-count="${byLang.size}" data-books-count="${booksOrder.length}">` +
      `<strong class="calib-matrix-title">🎯 ${isEn ? `Cross-Language Translation Benchmark (${byLang.size} Languages × 4 Passages)` : `Calibración Comparativa (${byLang.size} Lenguas × 4 Pasajes)`}</strong>` +
      `<details class="tech-details">` +
      `<summary>${isEn ? "Technical matrix (chrF++ · Gale-Church · MATTR50)" : "Matriz técnica (chrF++ · Gale-Church · MATTR50)"}</summary>` +
      `<table class="calib-matrix-table">` +
      `<thead><tr><th class="calib-th-lang">${isEn ? "Lang / Family" : "Lengua / Familia"}</th>${headerCells}</tr></thead>` +
      `<tbody>${bodyRows}</tbody>` +
      `</table>` +
      `</details>` +
      `</section>`,
    );
  }

  return parts.join("");
}

/**
 * Hidrata los Senderos de Vida (`life_trails`) y Perícopas de Capítulo (`chapter_pericopes`)
 * desde `web/data/pericopes_and_glosses.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateLifeTrailsFromPericopesArtifact(artifact = null) {
  const lifeTrails = Array.isArray(artifact?.life_trails) ? artifact.life_trails : [];
  const chapterPericopes =
    artifact?.chapter_pericopes && typeof artifact.chapter_pericopes === "object"
      ? artifact.chapter_pericopes
      : {};
  const masoreticAndGospel = Array.isArray(artifact?.masoretic_and_gospel_pericopes)
    ? artifact.masoretic_and_gospel_pericopes
    : [];
  return {
    lifeTrails,
    chapterPericopes,
    masoreticAndGospel,
    evangeliosMacroThreads: artifact?.evangelios_macro_threads || {},
    felices12Dichas: Array.isArray(artifact?.felices_12_dichas) ? artifact.felices_12_dichas : [],
    felices28Plates: Array.isArray(artifact?.felices_28_plates) ? artifact.felices_28_plates : [],
  };
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

  const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
  if (rowsEl) {
    const renderRowsFn =
      mod && typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
        ? mod.renderPhilologyRosettaResultsRowsHtml
        : renderPhilologyRosettaResultsRowsHtml;
    const activeCat = state?.rosettaCategory || "all";
    rowsEl.innerHTML = renderRowsFn({
      query: cleanStrong,
      category: activeCat,
      rosettaIndex: rosettaIndex || state?.rosettaIndex || null,
    });
    const listEl = getEl("rosettaExplorerResultsList", targetDoc);
    if (listEl) {
      const items = searchPhilologyRosettaIndex(
        cleanStrong,
        activeCat,
        12,
        rosettaIndex || state?.rosettaIndex || null,
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
  if (!state.annotationIndexReport && typeof dataLayer.loadAnnotationIndexReport === "function") {
    try {
      state.annotationIndexReport = await dataLayer.loadAnnotationIndexReport();
    } catch {
      // Non-fatal
    }
  }
  if (!state.blindCalibrationReport && typeof dataLayer.loadBlindCalibrationReport === "function") {
    try {
      state.blindCalibrationReport = await dataLayer.loadBlindCalibrationReport();
    } catch {
      // Non-fatal
    }
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
  const html = workBannerHtml + mod.renderStudy14ColDrawerHtml(matrixChapter, studyOpts);
  const container =
    getEl("leipzig14ColStratumAction", targetDoc) ||
    getEl("bibleEasyDrawerPanel", targetDoc);
  if (container) {
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
            ? "🧬 Philological Roots & 12-Language Calibration Summary"
            : "🧬 Resumen filológico de raíces y calibración en 12 lenguas";
          summarySlot = targetDoc.createElement("div");
          summarySlot.id = "philologyRosettaSummarySlot";
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
        summarySlot.innerHTML = renderInspectorFn(matrixChapter?.rows || [], {
          ...studyOpts,
          includeExplorer: false,
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
          rosettaIndex,
        });
      }
    }
    const syncRosettaRows = () => {
      const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
      if (rowsEl) {
        const items = searchPhilologyRosettaIndex(
          state.rosettaQuery || "",
          state.rosettaCategory || "all",
          12,
          rosettaIndex,
        );
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

  // D3-R40 + D3-R45: Hidrata el Inspector WFST Multi-Ortográfico + Scriptio Continua + Conservación de Masa Léxica y Matriz chrF++ en #wfstAndScriptioContinuaHost.
  const wfstHost = getEl("wfstAndScriptioContinuaHost", targetDoc);
  if (wfstHost) {
    const profilesForLang = listOrthographyProfilesForLang(state.lang);
    const activeVerseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
    const firstRowObj =
      Array.isArray(matrixChapter?.rows) && matrixChapter.rows.length > 0 && !Array.isArray(matrixChapter.rows[0])
        ? matrixChapter.rows[0]
        : null;
    const calibrationCardsHtml = renderAnnotationAndBlindCalibrationCardHtml({
      annotationReport: state.annotationIndexReport || dataLayer?.getHydratedAnnotationIndexReport?.() || null,
      blindCalibrationRows: state.blindCalibrationReport || dataLayer?.getHydratedBlindCalibrationReport?.() || null,
      sampleRow: firstRowObj,
      activeLang: state.lang,
      activeBook: state.book,
      uiLocale: state.uiLocale || "es",
    });
    wfstHost.innerHTML =
      renderWfstAndScriptioContinuaInspectorHtml({
        lang: state.lang,
        profileId: state.orthographyProfile || profilesForLang[0]?.id || "INALI_PRACTICAL",
        sampleText: activeVerseText || undefined,
        uiLocale: state.uiLocale || "es",
      }) + calibrationCardsHtml;
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

  const branchPanel = getEl("bibleBranchAndTypologyPanel", targetDoc);
  if (branchPanel) {
    branchPanel.innerHTML = renderBranchAndTypologyInspectorHtml({
      lang: state.lang,
      activeBranchId: state.activeBranchId || "",
      activeTypologyId: state.activeTypologyId || "",
      uiLocale: state.uiLocale || "es",
    });
    const branchSel = getEl("branchProfileSelect", targetDoc);
    if (branchSel && typeof branchSel.addEventListener === "function" && !branchSel._branchSelBound) {
      branchSel._branchSelBound = true;
      branchSel.addEventListener("change", async (e) => {
        state.activeBranchId = String(e?.target?.value || branchSel.value || "");
        await applyGrambankTypologyToPrint(ctx, state.activeBranchId, state.activeTypologyId || "");
        await hydrateStudyDrawerPanel(ctx);
      });
    }
    const typoSel = getEl("typologySheetSelect", targetDoc);
    if (typoSel && typeof typoSel.addEventListener === "function" && !typoSel._typoSelBound) {
      typoSel._typoSelBound = true;
      typoSel.addEventListener("change", async (e) => {
        state.activeTypologyId = String(e?.target?.value || typoSel.value || "");
        await applyGrambankTypologyToPrint(ctx, state.activeBranchId || "", state.activeTypologyId);
        await hydrateStudyDrawerPanel(ctx);
      });
    }
  }

  // D5-R38 / D9-R39 / D8-R41 / D3-R45: Hidrata las Sustituciones Diacrónicas + Testigos del Capítulo sin IDs duplicados (INV-ERG-23).
  const diachronicAuditPanel = getEl("diachronicRegisterAuditPanel", targetDoc);
  if (diachronicAuditPanel) {
    const chapterVerses = state.lastNavResult?.chapter?.verses || {};
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
    diachronicAuditPanel.innerHTML = `${diachronicAuditPanel.innerHTML || ""}${unifiedCtxHtml}`;
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
    for (const r of rows) {
      if (Array.isArray(r) && Number(r[1]) === Number(state.verse) && r[6] && r[6] !== "∅") {
        return String(r[6]).toUpperCase();
      }
      if (r && typeof r === "object" && Number(r.verse) === Number(state.verse) && r.c07_strong_id && r.c07_strong_id !== "∅") {
        return String(r.c07_strong_id).toUpperCase();
      }
    }
  } catch {
    // Fallback by testament
  }
  const isNt = /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)$/i.test(state.book);
  return isNt ? "G3056" : "H0430";
}

