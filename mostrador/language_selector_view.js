// ============================================================================
// web/mostrador/language_selector_view.js — Selector de Lenguas Desacoplado (SLICE-EKO-EXIT-06)
// Separa estrictamente Obra (Biblia / Felices / Evangelios) vs Lengua (Tier 1 vs Long-Tail SIL 7,164)
// vs Variante/Ortografia, evitando mezclar variantes bn-BD/bn-IN de Felices en modo Biblia.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";

export const SISTER_WORK_ONLY_LANG_CODES = Object.freeze({
  felices: new Set(["bn-bd", "bn-in"]),
  evangelios: new Set(["gn", "quc"]),
});

const TIER1_CANONICAL_SET = new Set([
  "es", "es-1909", "en", "pt", "fr", "de", "it", "he", "grc",
  "ar", "fa", "ur", "hi", "bn", "id", "sw", "tr", "ru", "zh-hans", "ja", "ko",
]);

/**
 * Particiona una lista de lenguas en Tier 1 (biblias completas / Tier 0-1) vs Long-Tail (Tier 2-4 / censo SIL),
 * aislando las lenguas exclusivas de obras hermanas (p. ej. `bn-BD`/`bn-IN` de Felices) cuando no corresponden a la obra activa.
 */
export function partitionLanguagesTier1AndLongTail(
  entries = [],
  { activeWork = "biblia", previewEvangelios = false } = {},
) {
  const work = String(activeWork || "biblia").trim().toLowerCase();
  const seen = new Set();
  const tier1 = [];
  const longTail = [];
  const sisterWorkOnly = [];

  for (const raw of Array.isArray(entries) ? entries : []) {
    if (!raw || typeof raw !== "object") continue;
    const code = String(raw.code || raw.iso639_3 || "").trim();
    const norm = code.toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);

    const isFelicesOnly = SISTER_WORK_ONLY_LANG_CODES.felices.has(norm);
    const isEvangOnly = SISTER_WORK_ONLY_LANG_CODES.evangelios.has(norm);
    if (isFelicesOnly && work !== "felices") {
      sisterWorkOnly.push({ ...raw, code, workScope: "felices" });
      continue;
    }
    if (isEvangOnly && (work !== "evangelios" || !previewEvangelios)) {
      sisterWorkOnly.push({ ...raw, code, workScope: "evangelios" });
      continue;
    }

    const seal = String(raw.sovereignSeal || raw.tier || "").toUpperCase();
    const isTier1 =
      TIER1_CANONICAL_SET.has(norm) ||
      seal.includes("TIER_0") ||
      seal.includes("TIER_1");
    if (isTier1) {
      tier1.push({ ...raw, code });
    } else {
      longTail.push({ ...raw, code });
    }
  }

  return {
    activeWork: work,
    tier1,
    longTail,
    sisterWorkOnly,
    counts: {
      tier1Count: tier1.length,
      longTailCount: longTail.length,
      excludedSisterCount: sisterWorkOnly.length,
      totalCount: tier1.length + longTail.length,
    },
  };
}

/**
 * Localiza las opciones de lengua puente (`Bridge: Auto` -> `Puente: Automático`) respetando el idioma UI activo.
 */
export function localizeBridgeLangSelectLabels(bridgeSelect, uiLocale = "es") {
  if (!bridgeSelect || !bridgeSelect.options) return false;
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  for (const opt of Array.from(bridgeSelect.options)) {
    const val = String(opt?.value || "").trim();
    if (!val) {
      opt.textContent = isEn ? "Bridge: Auto" : "Puente: Automático";
    } else {
      opt.textContent = `${isEn ? "Bridge" : "Puente"}: ${val.toUpperCase()}`;
    }
  }
  return true;
}

/**
 * Renderiza el selector desacoplado Tier 1 vs Comunidades / Long-Tail sin mezcla de obras.
 */
export function renderDecoupledLanguageSelectorHtml({
  entries = [],
  activeLang = "es",
  activeWork = "biblia",
  previewEvangelios = false,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const { tier1, longTail, counts } = partitionLanguagesTier1AndLongTail(entries, {
    activeWork,
    previewEvangelios,
  });
  const activeNorm = String(activeLang || "es").trim().toLowerCase();

  const renderBtn = (item) => {
    const code = String(item.code || item.iso639_3 || "").trim();
    const label = String(item.displayLabel || item.name || code);
    const sel = code.toLowerCase() === activeNorm ? "true" : "false";
    return `<button type="button" class="uls-chip polyglot-window-row" role="option" data-corpus-lang="${escapeHtml(code)}" aria-selected="${sel}">${escapeHtml(label)}</button>`;
  };

  return (
    `<div id="decoupledLanguageSelector" data-active-work="${escapeHtml(activeWork)}" data-tier1-count="${counts.tier1Count}" data-longtail-count="${counts.longTailCount}" data-total-visible="${counts.totalCount}">` +
    `<div class="ek-mb-sm" data-lang-tier-group="tier1">` +
    `<strong class="ek-title-sm">${isEn ? `Major Full Bibles (${counts.tier1Count})` : `Biblias Completas (${counts.tier1Count})`}</strong>` +
    `<div class="chip-wrap-row">${tier1.map(renderBtn).join("")}</div>` +
    `</div>` +
    `<div data-lang-tier-group="longtail">` +
    `<strong class="ek-title-sm">${isEn ? `Minority &amp; Community Languages (${counts.longTailCount})` : `Comunidades y Lenguas Minoritarias (${counts.longTailCount})`}</strong>` +
    `<div class="chip-wrap-row">${longTail.map(renderBtn).join("")}</div>` +
    `</div>` +
    `</div>`
  );
}
