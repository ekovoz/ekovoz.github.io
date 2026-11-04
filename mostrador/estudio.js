// Gaveta bajo demanda: Estudio Palabra por Palabra de 14 Columnas (C01..C14), Realia, NSM y Atribución CC BY 4.0.
// Ekovoz Mostrador Ronda 20 — Cero dependencias de Node.js, cero relleno sintético.

import { MATRIX_ROW_COLUMNS } from "./data_layer.js";

const DEFAULT_ATTRIBUTION =
  "STEPBible TAHOT/TAGNT (Tyndale House, CC BY 4.0) · Clear Bible Macula Hebrew/Greek (CC BY 4.0) · OpenScriptures WLC / CenterBLR SRGNT · Ekovoz NSM-65";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeMatrixRowObject(row, book = "GEN", chapter = 1) {
  if (!row) return null;
  if (Array.isArray(row)) {
    if (row.length === 13) {
      const verseNum = Number(row[0]) || 1;
      return {
        verse: verseNum,
        c01_ordinal_31102: 1,
        c02_ref: `${book}.${chapter}.${verseNum}`,
        c03_source_corpus: String(row[3] || "").startsWith("G") ? "SRGNT" : "WLC",
        c04_word_pos: 1,
        c05_orig_text: row[1] ?? "∅",
        c06_translit: row[2] ?? "∅",
        c07_strong_id: row[3] ?? "∅",
        c08_morph_code: row[4] ?? "∅",
        c09_macula_role: row[8] ?? "∅",
        c10_clause_id: row[9] ?? "∅",
        c11_semantic_domain: row[5] ?? "∅",
        c12_gloss_es: row[7] ?? "∅",
        c13_nsm_65: row[11] ?? "∅",
        c14_target_gloss: row[6] ?? "∅",
      };
    }
    const obj = {};
    for (let i = 0; i < MATRIX_ROW_COLUMNS.length; i++) {
      obj[MATRIX_ROW_COLUMNS[i]] = row[i] ?? "∅";
    }
    const verseNum = Number(obj.verse) || 1;
    obj.c02_ref = `${book}.${chapter}.${verseNum}`;
    return obj;
  }
  const verseNum = Number(row.verse) || Number(String(row.c02_ref || "").split(".")[2]) || 1;
  return {
    verse: verseNum,
    c01_ordinal_31102: row.c01_ordinal_31102 ?? 1,
    c02_ref: row.c02_ref || `${book}.${chapter}.${verseNum}`,
    c03_source_corpus: row.c03_source_corpus ?? "∅",
    c04_word_pos: row.c04_word_pos ?? 1,
    c05_orig_text: row.c05_orig_text ?? "∅",
    c06_translit: row.c06_translit ?? "∅",
    c07_strong_id: row.c07_strong_id ?? "∅",
    c08_morph_code: row.c08_morph_code ?? "∅",
    c09_macula_role: row.c09_macula_role ?? "∅",
    c10_clause_id: row.c10_clause_id ?? "∅",
    c11_semantic_domain: row.c11_semantic_domain ?? "∅",
    c12_gloss_es: row.c12_gloss_es ?? "∅",
    c13_nsm_65: row.c13_nsm_65 ?? "∅",
    c14_target_gloss: row.c14_target_gloss ?? "∅",
  };
}

export function renderStudy14ColDrawerHtml(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const book = String(shard?.book || matrixShard?.book || options.book || "GEN").toUpperCase();
  const chapter = Number(shard?.chapter || matrixShard?.chapter || options.chapter) || 1;
  const filterStrongId = options.strongId ? String(options.strongId).trim().toUpperCase() : "";
  const filterVerse = Number(options.verse) > 0 ? Number(options.verse) : null;
  const maxRows = Number(options.maxRows) > 0 ? Number(options.maxRows) : 240;

  const rawRows = Array.isArray(shard?.rows) ? shard.rows : [];
  const normalizedRows = [];
  for (const r of rawRows) {
    const norm = normalizeMatrixRowObject(r, book, chapter);
    if (!norm) continue;
    if (filterVerse && norm.verse !== filterVerse) continue;
    if (filterStrongId && String(norm.c07_strong_id).toUpperCase() !== filterStrongId) continue;
    normalizedRows.push(norm);
    if (normalizedRows.length >= maxRows) break;
  }

  const wordCardsHtml = normalizedRows
    .map((r) => {
      return (
        `<article class="leipzig-14col-card" data-ref="${escapeHtml(r.c02_ref)}" data-osis="${escapeHtml(r.c02_ref)}" data-word-pos="${escapeHtml(r.c04_word_pos)}" data-strong-id="${escapeHtml(r.c07_strong_id)}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);display:flex;flex-direction:column;gap:0.25rem;min-width:160px;">` +
        `<header style="display:flex;justify-content:space-between;font-size:0.74rem;color:var(--text-secondary);">` +
        `<span data-col="c01_c02">${escapeHtml(r.c02_ref)} #${escapeHtml(r.c04_word_pos)} (ord ${escapeHtml(r.c01_ordinal_31102)})</span>` +
        `<span data-col="c03_source_corpus">${escapeHtml(r.c03_source_corpus)}</span>` +
        `</header>` +
        `<div data-col="c05_orig_text" style="font-size:1.18rem;font-weight:700;">${escapeHtml(r.c05_orig_text)}</div>` +
        `<div data-col="c06_translit" style="font-size:0.82rem;font-style:italic;color:var(--text-secondary);">${escapeHtml(r.c06_translit)}</div>` +
        `<div style="font-size:0.78rem;display:flex;flex-wrap:wrap;gap:0.35rem;">` +
        `<code data-col="c07_strong_id">${escapeHtml(r.c07_strong_id)}</code>` +
        `<code data-col="c08_morph_code">${escapeHtml(r.c08_morph_code)}</code>` +
        `</div>` +
        `<div style="font-size:0.76rem;color:var(--text-secondary);">` +
        `<span data-col="c09_macula_role">Rol: ${escapeHtml(r.c09_macula_role)}</span> · ` +
        `<span data-col="c10_clause_id">Cláusula: ${escapeHtml(r.c10_clause_id)}</span> · ` +
        `<span data-col="c11_semantic_domain">Dom: ${escapeHtml(r.c11_semantic_domain)}</span>` +
        `</div>` +
        `<div data-col="c12_gloss_es" style="font-size:0.86rem;font-weight:600;">${escapeHtml(r.c12_gloss_es)}</div>` +
        `<div data-col="c13_nsm_65" style="font-size:0.76rem;color:var(--accent-amber);">NSM-65: ${escapeHtml(r.c13_nsm_65)}</div>` +
        `<div data-col="c14_target_gloss" style="font-size:0.84rem;color:var(--accent-emerald);">Meta: ${escapeHtml(r.c14_target_gloss)}</div>` +
        `</article>`
      );
    })
    .join("");

  const nsmEntries = matrixShard?.nsm && typeof matrixShard.nsm === "object" ? Object.values(matrixShard.nsm) : [];
  const realiaEntries = Array.isArray(matrixShard?.realia) ? matrixShard.realia : [];
  const metrologyEntries = Array.isArray(matrixShard?.metrology) ? matrixShard.metrology : [];

  const nsmHtml =
    nsmEntries.length > 0
      ? `<div class="study-nsm-section" style="margin-top:0.75rem;">` +
        `<strong>🧭 Primitivos Universales NSM-65:</strong>` +
        `<ul style="margin:0.35rem 0 0 1.1rem;font-size:0.83rem;">` +
        nsmEntries
          .map(
            (n) =>
              `<li data-nsm-strong="${escapeHtml(n.strong_id)}"><code>${escapeHtml(n.strong_id)}</code> <strong>${escapeHtml(n.lemma)}</strong> (${escapeHtml(n.gloss)}): ${escapeHtml(n.nsm_explication)}</li>`,
          )
          .join("") +
        `</ul></div>`
      : "";

  const realiaHtml =
    realiaEntries.length > 0 || metrologyEntries.length > 0
      ? `<div class="study-realia-metrology-section" style="margin-top:0.75rem;">` +
        `<strong>🏛️ Mundo Bíblico (Realia) y Metrología Fiel:</strong>` +
        `<ul style="margin:0.35rem 0 0 1.1rem;font-size:0.83rem;">` +
        realiaEntries
          .map(
            (re) =>
              `<li data-realia-id="${escapeHtml(re.id || re.title)}"><strong>${escapeHtml(re.title)}:</strong> ${escapeHtml(re.explanation)}</li>`,
          )
          .join("") +
        metrologyEntries
          .map(
            (me) =>
              `<li data-metrology-unit="${escapeHtml(me.biblical_name)}"><strong>⚖️ ${escapeHtml(me.biblical_name)}:</strong> ${escapeHtml(me.modern_equivalent)} (${escapeHtml(me.local_illustration || "")})</li>`,
          )
          .join("") +
        `</ul></div>`
      : "";

  const attribution =
    matrixShard?.attribution && !String(matrixShard.attribution).includes("Macula")
      ? `${matrixShard.attribution} · Clear Bible Macula Hebrew/Greek (CC BY 4.0)`
      : matrixShard?.attribution || DEFAULT_ATTRIBUTION;

  return (
    `<section class="study-14col-drawer" data-book="${escapeHtml(book)}" data-chapter="${chapter}" data-rows-rendered="${normalizedRows.length}">` +
    `<div class="leipzig-14col-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.65rem;">` +
    wordCardsHtml +
    `</div>` +
    nsmHtml +
    realiaHtml +
    `<footer class="study-attribution-footer" style="margin-top:0.85rem;padding-top:0.5rem;border-top:1px solid var(--card-border);font-size:0.76rem;color:var(--text-secondary);">` +
    `${escapeHtml(attribution)}` +
    `</footer>` +
    `</section>`
  );
}
