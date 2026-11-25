// ============================================================================
// web/mostrador/drawer_pro_boveda.js — Costura Limpia LCOM4 >= 2 (Bóveda Pro Lazy)
// Aloja telemetría I+D (AoA, MDD, chrF++, conservación léxica), Berna 15.3,
// verificador local .ekpack, raíces Merkle, 34 fuentes Zstd y guías llms.txt.
// Se carga exclusivamente bajo demanda (`import("./drawer_pro_boveda.js")`).
// ============================================================================

import { BIBLE_CONSTANTS } from "./data_layer.js";
import { decodeSdbhHierarchicalCode, translateNsm65PrimePhrase } from "./estudio.js";

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Proyecta métricas I+D de conservación léxica (`annotation_index_report.json`) y benchmark `chrF++`
 * (`blind_calibration_report.json`) únicamente dentro de Bóveda Pro cuando el experto lo abre.
 */
export function renderAnnotationAndBlindCalibrationCardHtml({
  annotationReport = null,
  blindCalibrationRows = null,
  sampleRow = null,
  activeLang = "es",
  activeBook = "GEN",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const canonicalVerses = Number(BIBLE_CONSTANTS?.CANONICAL_VERSES_COUNT || 31102);
  const canonicalCols = Number(
    BIBLE_CONSTANTS?.MATRIX_TIER0_DESCRIPTORS_COUNT || BIBLE_CONSTANTS?.MATRIX_COLUMNS_COUNT || 15,
  );
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
    const indexRelPath = String(
      annotationReport.index_rel_path || "obras/biblia/original_matrix/annotation_index_v1.tsv.zst",
    );

    parts.push(
      `<section class="calibration-mass-conservation-card" data-annotation-mass-conservation="true" data-total-tokens="${totalTokens}" data-total-residuals="${totalResiduals}" data-canonical-verses="${canonicalVerses}" data-matrix-columns="${canonicalCols}" data-index-sha256="${escHtml(indexSha.slice(0, 16))}" data-residuals-sha256="${escHtml(residualsSha.slice(0, 16))}" data-index-rel-path="${escHtml(indexRelPath)}">` +
      `<div class="calib-card-header">` +
      `<strong>⚖️ ${isEn ? "Lexical Concordance Coverage" : "Cobertura Léxica Completa"} (${totalTokens.toLocaleString("en-US")} ${isEn ? "words" : "palabras"} · ${canonicalVerses.toLocaleString("en-US")} vv.)</strong>` +
      `<span class="uls-badge" data-chrf-plus-plus="true" data-thresholds-pass="${gatePass}">${gatePass ? (isEn ? "✅ Quality Verified" : "✅ Calidad Verificada") : "⚠️"}</span>` +
      `</div>` +
      `<div class="ek-stack-sm ek-mt-sm">` +
      `<span class="uls-badge">TAGNT-ES ${ntSpanRatio}% (≥${minNtSpan}%) · OT-Unann ${otUnannRatio}% (≤${maxOtUnann}%) · NT-Unann ${ntUnannRatio}% (≤${maxNtUnann}%) · Ketiv ${otKetivRatio}% (≤${maxOtKetiv}%)</span>` +
      (sampleSdbh || sampleNsm
        ? `<div class="hig-tech-meta">${sampleSdbh ? `<span>SDBH: ${escHtml(sampleSdbh)}</span>` : ""}${sampleSdbh && sampleNsm ? " · " : ""}${sampleNsm ? `<span>Semántica base: ${escHtml(sampleNsm)}</span>` : ""}</div>`
        : "") +
      `<div class="calib-badge-row"><span class="calib-row-label">${isEn ? `5 Residual Classes (${totalResiduals.toLocaleString("en-US")}):` : `5 Clases Residuales (${totalResiduals.toLocaleString("en-US")}):`}</span> ${residualBadges}</div>` +
      `<div class="calib-badge-row calib-sources-row"><span class="calib-row-label">${isEn ? `${sources.length} Open Sources:` : `${sources.length} Fuentes Abiertas:`}</span> ${sourceBadges}</div>` +
      `</div></section>`,
    );
  }

  if (Array.isArray(blindCalibrationRows) && blindCalibrationRows.length > 0) {
    const booksOrder = ["GEN", "PSA", "ISA", "JON"];
    const byLang = new Map();
    for (const row of blindCalibrationRows) {
      const lc = String(row.lang_code || "").trim();
      if (!lc) continue;
      if (!byLang.has(lc)) {
        byLang.set(lc, { langCode: lc, macroFamily: String(row.macro_family || ""), cells: new Map() });
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
      `<section class="blind-calibration-chrf-card ek-mt-sm" data-blind-calibration-matrix="true" data-langs-count="${byLang.size}" data-books-count="${booksOrder.length}">` +
      `<strong class="calib-matrix-title">🎯 ${isEn ? `Cross-Language Benchmark (${byLang.size} Languages × 4 Passages)` : `Calibración Comparativa I+D (${byLang.size} Lenguas × 4 Pasajes)`}</strong>` +
      `<div class="hig-tech-meta">chrF++ · Gale-Church · MATTR50 · Tier 1–3</div>` +
      `<table class="calib-matrix-table"><thead><tr><th class="calib-th-lang">${isEn ? "Lang / Family" : "Lengua / Familia"}</th>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>` +
      `</section>`,
    );
  }

  return parts.join("");
}

/**
 * Hidrata bajo demanda los datos de Bóveda Pro dentro de Estudio (`annotationReport` + `blindCalibrationRows`).
 */
export async function hydrateProBovedaStudyCalibration({
  slotEl,
  state,
  dataLayer,
  sampleRow = null,
} = {}) {
  if (!slotEl || !state) return false;
  const uiLocale = state.uiLocale || "es";
  const isEn = String(uiLocale).toLowerCase().startsWith("en");
  if (!state.annotationIndexReport && typeof dataLayer?.loadAnnotationIndexReport === "function") {
    try { state.annotationIndexReport = await dataLayer.loadAnnotationIndexReport(); } catch { }
  }
  if (!state.blindCalibrationReport && typeof dataLayer?.loadBlindCalibrationReport === "function") {
    try { state.blindCalibrationReport = await dataLayer.loadBlindCalibrationReport(); } catch { }
  }
  const html = renderAnnotationAndBlindCalibrationCardHtml({
    annotationReport: state.annotationIndexReport || dataLayer?.getHydratedAnnotationIndexReport?.() || null,
    blindCalibrationRows: state.blindCalibrationReport || dataLayer?.getHydratedBlindCalibrationReport?.() || null,
    sampleRow,
    activeLang: state.lang,
    activeBook: state.book,
    uiLocale,
  });
  slotEl.innerHTML = html || `<p class="ek-meta">${isEn ? "Calibration indices available when dataset loads." : "Índices I+D disponibles al cargar el corpus completo."}</p>`;
  slotEl.setAttribute?.("data-pro-boveda-hydrated", "true");
  return true;
}
