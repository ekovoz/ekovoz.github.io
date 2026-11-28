// ============================================================================
// web/mostrador/study_bicanonical_and_diachronic.js — Comparativa Bicanónica
// `LXX ↔ MT` + Diferencial Diacrónico `1909 vs. Actual` (`SLICE-EKO-RC19`)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { compareUbsSixTraditions } from "./canonical_versification.js";
import { getAll156DiachronicSubstitutionsCatalog } from "./diachronic_register.js";

function extractDiachronicWordHits(verseText = "") {
  const cleanText = String(verseText || "").trim();
  const catalog = getAll156DiachronicSubstitutionsCatalog();
  if (!cleanText) return [];
  const lower = cleanText.toLowerCase();
  const hits = [];
  for (const rule of catalog) {
    const arch = String(rule.archaic || "").trim();
    const mod = String(rule.modern || "").trim();
    if (!arch || !mod) continue;
    if (lower.includes(arch.toLowerCase()) || lower.includes(mod.toLowerCase())) {
      hits.push(rule);
    }
    if (hits.length >= 6) break;
  }
  return hits;
}

export function buildBicanonicalLxxMtCardHtml({
  book = "GEN",
  chapter = 1,
  verse = 1,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const ubs = compareUbsSixTraditions(book, chapter, verse, uiLocale);
  const rows = Array.isArray(ubs?.rows) ? ubs.rows : [];
  const orgRow = rows.find((r) => r.code === "ORG") || { code: "ORG", ref: `${book}.${chapter}.${verse}`, note: "" };
  const lxxRow = rows.find((r) => r.code === "LXX") || orgRow;
  const engRow = rows.find((r) => r.code === "ENG") || orgRow;
  const diverged = lxxRow.ref !== orgRow.ref || (ubs?.regime && ubs.regime !== "ALIGNED_CANONICAL");
  const regimeBadge = diverged
    ? (isEn ? `Divergent numbering (${ubs.regime})` : `Numeración divergente (${ubs.regime})`)
    : (isEn ? "MT ↔ LXX aligned" : "MT ↔ LXX alineado");
  const traditionChips = rows
    .map(
      (r) =>
        `<span class="uls-badge" data-ubs-tradition="${escapeHtml(r.code)}"><strong>${escapeHtml(r.code)}</strong> ${escapeHtml(r.ref)}${r.note ? ` · ${escapeHtml(r.note)}` : ""}</span>`,
    )
    .join(" ");

  return (
    `<article id="studyBicanonicalLxxMtCard" class="ek-subcard ek-stack-xs" data-bicanonical-regime="${escapeHtml(ubs?.regime || "ALIGNED_CANONICAL")}" data-lxx-diverged="${diverged ? "true" : "false"}">` +
    `<div class="ek-row-between"><strong>📜 ${isEn ? "Bicanonical Alignment (LXX ↔ MT)" : "Comparativa Bicanónica (LXX ↔ MT)"}</strong>` +
    `<span class="uls-badge">${escapeHtml(regimeBadge)}</span></div>` +
    `<p class="ek-meta ek-m-0">${isEn ? "Hebrew Masoretic" : "Masorético (MT)"}: <strong>${escapeHtml(orgRow.ref)}</strong> · ${isEn ? "Greek Septuagint" : "Septuaginta (LXX)"}: <strong>${escapeHtml(lxxRow.ref)}</strong> · ${isEn ? "Western" : "Occidental"}: <strong>${escapeHtml(engRow.ref)}</strong></p>` +
    `<div class="ek-row-wrap">${traditionChips}</div>` +
    `</article>`
  );
}

export function buildDiachronic1909VsActualCardHtml({
  verseText = "",
  book = "GEN",
  chapter = 1,
  verse = 1,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const hits = extractDiachronicWordHits(verseText);
  const catalog = getAll156DiachronicSubstitutionsCatalog();
  const sampleRules = hits.length > 0 ? hits : catalog.slice(0, 4);
  const diffRowsHtml = sampleRules
    .map(
      (r) =>
        `<li data-diachronic-pair="${escapeHtml(`${r.archaic}=>${r.modern}`)}"><span class="ek-tag-warn">${escapeHtml(r.archaic)}</span> → <strong>${escapeHtml(r.modern)}</strong> <span class="ek-meta">(${escapeHtml(r.morphTag || `T${r.tier}`)})</span></li>`,
    )
    .join("");
  const statusCopy =
    hits.length > 0
      ? (isEn ? `${hits.length} morphological/lexical register updates matched in ${book} ${chapter}:${verse}.` : `${hits.length} relevos léxico-morfológicos detectados en ${book} ${chapter}:${verse}.`)
      : (isEn ? `No 1909 archaisms in ${book} ${chapter}:${verse}; showing active register rules (${catalog.length}).` : `Sin arcaísmos 1909 en ${book} ${chapter}:${verse}; reglas activas de registro (${catalog.length}).`);

  return (
    `<article id="studyDiachronic1909VsActualCard" class="ek-subcard ek-stack-xs" data-diachronic-matches="${hits.length}" data-diachronic-catalog="${catalog.length}">` +
    `<div class="ek-row-between"><strong>🕰️ ${isEn ? "1909 vs. Present Register Diff" : "Paralelo Diacrónico 1909 vs. Actual"}</strong>` +
    `<span class="uls-badge">${hits.length} / ${catalog.length}</span></div>` +
    `<p class="ek-meta ek-m-0">${escapeHtml(statusCopy)}</p>` +
    `<ul class="ek-list-compact ek-m-0">${diffRowsHtml}</ul>` +
    `</article>`
  );
}

export function renderStudyBicanonicalAndDiachronicPanelHtml({
  book = "GEN",
  chapter = 1,
  verse = 1,
  verseText = "",
  uiLocale = "es",
} = {}) {
  const bicanonHtml = buildBicanonicalLxxMtCardHtml({ book, chapter, verse, uiLocale });
  const diachronicHtml = buildDiachronic1909VsActualCardHtml({ verseText, book, chapter, verse, uiLocale });
  return (
    `<section id="studyBicanonicalDiachronicPanel" class="ek-stack-sm ek-mt-xs" data-technical-plane="true">` +
    `${bicanonHtml}${diachronicHtml}` +
    `</section>`
  );
}
