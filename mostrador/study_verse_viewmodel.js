// ============================================================================
// web/mostrador/study_verse_viewmodel.js — View-Model Puro de Versículo en Estudio
// Costura L0 ∂(C) = 0 sin DOM (`SLICE-EKO-HIG3-04` · D1-HIG3 / D5-HIG3 / D9-HIG3):
// Unifica el régimen textual real (AT Hebreo vs NT Griego), la selección del
// token léxico primario (`isLexicalRow`) y la síntesis compacta de versificación.
// ============================================================================

const NT_BOOK_CODES = new Set([
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
  "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
  "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
]);

/**
 * Resuelve la tradición de texto base según el testamento real del libro.
 * Evita etiquetar libros del Nuevo Testamento griego (p. ej. `ROM 8:28`) como `MT` (Texto Masorético).
 */
export function resolveTestamentRegime(book = "GEN", chapter = 1, verse = 1, rawBicanon = null, uiLocale = "es") {
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const isNt = NT_BOOK_CODES.has(cleanBook);
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const ref = `${cleanBook}.${Math.max(1, Number(chapter) || 1)}.${Math.max(1, Number(verse) || 1)}`;
  const sourceTradition = isNt ? "SBLGNT" : "MT";

  if (!rawBicanon || !rawBicanon.hasDivergence) {
    return {
      isNt,
      sourceTradition,
      regime: rawBicanon?.regime || "ALIGNED_CANONICAL",
      hasDivergence: false,
      mtRef: rawBicanon?.mtRef || ref,
      occidentalRef: rawBicanon?.occidentalRef || ref,
      lxxRef: rawBicanon?.lxxRef || ref,
      label: isNt
        ? (isEn ? `Greek NT (${ref})` : `NT Griego (${ref})`)
        : (isEn ? `MT = Western (${ref})` : `MT = Occidental (${ref})`),
    };
  }

  return {
    isNt,
    sourceTradition,
    regime: rawBicanon.regime,
    hasDivergence: true,
    mtRef: rawBicanon.mtRef || ref,
    occidentalRef: rawBicanon.occidentalRef || ref,
    lxxRef: rawBicanon.lxxRef || ref,
    label: isNt ? String(rawBicanon.label || "").replace(/^MT\b/, "NT Griego") : rawBicanon.label,
  };
}

/**
 * Selecciona el primer token léxico con contenido significativo de `activeRows`,
 * evitando anclar encabezados a palabras funcionales de clase cerrada (p. ej. `G3708 ἰδού`).
 */
export function selectPrimaryLexicalToken(activeRows = [], isLexicalRow = null, fallbackStrong = "") {
  const rows = Array.isArray(activeRows) ? activeRows : [];
  const checkLexical = typeof isLexicalRow === "function"
    ? isLexicalRow
    : (r) => Boolean(r?.c07_strong_id && r.c07_strong_id !== "∅");

  const lexical = rows.find((r) => checkLexical(r));
  if (lexical?.c07_strong_id) {
    return { strongId: String(lexical.c07_strong_id), row: lexical };
  }
  const withStrong = rows.find((r) => r?.c07_strong_id && r.c07_strong_id !== "∅");
  if (withStrong?.c07_strong_id) {
    return { strongId: String(withStrong.c07_strong_id), row: withStrong };
  }
  const fallback = fallbackStrong || (rows[0]?.c07_strong_id && rows[0].c07_strong_id !== "∅" ? rows[0].c07_strong_id : "H0430");
  return { strongId: String(fallback), row: rows[0] || null };
}

/**
 * Resume la tabla de correspondencias `ENG ↔ ORG` en 1 línea compacta para mantener
 * WFST y `book_vectors_66` visibles arriba del pliegue en `Estudiar -> 3. Raíces`.
 */
export function buildCompactVersificationSummary(engOrgMapping = null, ubsComparison = null, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refStr = engOrgMapping?.occidentalRef || engOrgMapping?.mtRef || "";
  const refParts = String(refStr).split(".");
  const book = String(ubsComparison?.book || refParts[0] || "GEN").toUpperCase();
  const chapter = Number(ubsComparison?.chapter || refParts[1] || 1);
  const verse = Number(ubsComparison?.verse || refParts[2] || 1);
  const isNt = NT_BOOK_CODES.has(book);
  const orgTrad = ubsComparison?.traditions?.ORG?.ref || engOrgMapping?.mtRef || `${book}.${chapter}.${verse}`;
  const engTrad = ubsComparison?.traditions?.ENG?.ref || `${book}.${chapter}.${verse}`;
  const hasShift = orgTrad !== engTrad || Boolean(ubsComparison?.hasDivergence || engOrgMapping?.hasDivergence);

  return {
    isNt,
    hasShift,
    oneLineText: hasShift
      ? (isEn
        ? `Verse numbering (${book} ${chapter}:${verse}): Modern ${engTrad} · Source ${orgTrad}`
        : `Numeración (${book} ${chapter}:${verse}): Moderna ${engTrad} · Fuente ${orgTrad}`)
      : (isEn
        ? `Aligned numbering across editions (${book} ${chapter}:${verse})`
        : `Numeración coincidente en todas las tradiciones (${book} ${chapter}:${verse})`),
    detailsToggleLabel: isEn ? "View edition comparison table" : "Ver tabla entre tradiciones",
  };
}

/**
 * Resuelve la ancla Strong inicial del pasaje evitando `H0430` en NT (usa `G2316` como respaldo NT).
 */
export function resolveDefaultStrongForPassage(book = "GEN", activeRows = [], fallbackStrong = "") {
  const cleanFallback = String(fallbackStrong || "").trim().toUpperCase();
  if (cleanFallback && cleanFallback !== "∅") return cleanFallback;
  const rows = Array.isArray(activeRows) ? activeRows : [];
  for (const r of rows) {
    const s = String(r?.c07_strong_id || r?.strong_id || r?.strong || "").trim().toUpperCase();
    if (s && s !== "∅") return s;
  }
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  return NT_BOOK_CODES.has(cleanBook) ? "G2316" : "H0430";
}

/**
 * Suprime etiquetas vacías tipo `Sentido básico: ∅` devolviendo cadena vacía cuando no hay sentido válido.
 */
export function formatNonEmptyCoreMeaning(raw = "", uiLocale = "es") {
  const clean = String(raw || "").trim();
  if (!clean || /^(?:∅|—|-|none|null|prim:\s*(?:∅|none|-))$/i.test(clean)) return "";
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  return `${isEn ? "Core meaning" : "Sentido básico"}: ${clean}`;
}

/**
 * Separa filas léxicas de contenido y partículas funcionales para focalizar `02a`/`02b`.
 */
export function partitionContentAndFunctionRows(rows = [], isClosedClassFn = null) {
  const list = Array.isArray(rows) ? rows : [];
  const contentRows = [];
  const functionRows = [];
  for (const r of list) {
    const strong = String(r?.c07_strong_id || r?.strong_id || "").trim();
    const hasStrong = Boolean(strong && strong !== "∅");
    const isFunc =
      typeof isClosedClassFn === "function" &&
      !strong.includes("+") &&
      isClosedClassFn(r?.c11_semantic_domain, r?.c09_macula_role, r?.c08_morph_code, r?.c13_nsm_65);
    if (hasStrong && !isFunc) contentRows.push(r);
    else functionRows.push(r);
  }
  return { contentRows, functionRows };
}

function escVm(val) {
  return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Resume los 10+ desgloses globales de `annotation_index_report.json -> totals` para la vista técnica de Estudio.
 */
export function summarizeAnnotationIndexTotals(annotationReport = null, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const t = annotationReport?.totals || {
    ot_tokens: 308738,
    nt_tokens: 138003,
    nt_macula_tokens: 136489,
    nt_sr_tokens: 137336,
    nt_tagnt_spanish_tokens: 135544,
    ketiv_tokens: 1243,
    tahot_qere_ketiv_rows: 1323,
    tr_supplement_tokens: 407,
    versification_verses_ot: 1952,
    nt_unannotated: 260,
    ot_unannotated: 174,
  };
  return {
    totals: t,
    html:
      `<div id="studyAnnotationTotalsBox" class="ek-meta ek-stack-xs ek-mt-xs" data-ot-tokens="${Number(t.ot_tokens || 0)}" data-nt-tokens="${Number(t.nt_tokens || 0)}">` +
      `<span><strong>${isEn ? "Source tokens:" : "Tokens fuente:"}</strong> AT ${Number(t.ot_tokens || 0).toLocaleString("en-US")} · NT ${Number(t.nt_tokens || 0).toLocaleString("en-US")} (MACULA ${Number(t.nt_macula_tokens || 0).toLocaleString("en-US")}, SR ${Number(t.nt_sr_tokens || 0).toLocaleString("en-US")}, TAGNT-ES ${Number(t.nt_tagnt_spanish_tokens || 0).toLocaleString("en-US")})</span>` +
      `<span><strong>${isEn ? "Apparatus & coverage:" : "Aparato y cobertura:"}</strong> Ketiv/Qere ${Number(t.ketiv_tokens || 0)} (${Number(t.tahot_qere_ketiv_rows || 0)} rows) · TR ${Number(t.tr_supplement_tokens || 0)} · OT versification ${Number(t.versification_verses_ot || 0)} · Unannotated: OT ${Number(t.ot_unannotated || 0)} / NT ${Number(t.nt_unannotated || 0)}</span>` +
      `</div>`,
  };
}

/**
 * Resume `diachronic_register_es.json -> corpus_summary` y `blind_calibration_report.json` (`verses_evaluated`).
 */
export function summarizeDiachronicAndBlindCalibration({ corpusSummary = null, blindReport = null, uiLocale = "es" } = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cs = corpusSummary || {
    mean_aoa_years: 7.94,
    mean_eipen_l: 84.24,
    mean_mattr_50: 0.725,
    mean_mdd: 2.2,
    tier1_count: 12697,
    tier2_count: 17103,
    tier3_count: 1302,
    eight_locks_all_passed: true,
  };
  const blindArr = Array.isArray(blindReport) ? blindReport : [];
  const totalEvaluated = blindArr.length > 0
    ? blindArr.reduce((acc, r) => acc + (Number(r?.verses_evaluated) || 0), 0)
    : Number(blindReport?.verses_evaluated) || 48;
  return (
    `<div id="studyCorpusCalibrationBox" class="ek-meta ek-stack-xs ek-mt-xs" data-blind-verses-evaluated="${totalEvaluated}" data-mean-aoa="${Number(cs.mean_aoa_years || 7.94)}">` +
    `<span><strong>${isEn ? "Diachronic Corpus Summary:" : "Resumen Diacrónico del Corpus:"}</strong> AoA ${Number(cs.mean_aoa_years || 7.94)}y · EipenL ${Number(cs.mean_eipen_l || 84.24)} · MATTR ${Number(cs.mean_mattr_50 || 0.725)} · MDD ${Number(cs.mean_mdd || 2.2)}</span>` +
    `<span><strong>${isEn ? "Lexical Tiers:" : "Niveles léxicos:"}</strong> T1 ${Number(cs.tier1_count || 12697).toLocaleString("en-US")} · T2 ${Number(cs.tier2_count || 17103).toLocaleString("en-US")} · T3 ${Number(cs.tier3_count || 1302).toLocaleString("en-US")} · ${isEn ? "Blind benchmark verses:" : "Versos evaluados (calibración ciega):"} ${totalEvaluated}</span>` +
    `</div>`
  );
}

/**
 * Construye comparador multi-pivote (`ExtractRosetta`: HE/GRC · ES · EN · STP) para el pasaje y raíz activa.
 */
export function buildRosettaMultiPivotCompareHtml({
  book = "GEN",
  chapter = 1,
  verse = 1,
  rosettaIndex = null,
  activeRows = [],
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const firstRow = (Array.isArray(activeRows) ? activeRows : []).find((r) => (Array.isArray(r) ? r[6] : r?.c07_strong_id));
  const strongId = String((Array.isArray(firstRow) ? firstRow[6] : firstRow?.c07_strong_id) || resolveDefaultStrongForPassage(book, activeRows));
  const esGloss = String((Array.isArray(firstRow) ? firstRow[3] : firstRow?.c04_spanish_gloss) || "—");
  const enGloss = String((Array.isArray(firstRow) ? firstRow[4] : firstRow?.c05_english_gloss) || "—");
  const lemma = String((Array.isArray(firstRow) ? firstRow[2] : firstRow?.c02_source_lemma) || "—");
  const pairs = Number(rosettaIndex?.empirical_hg_pairs_total || 31102).toLocaleString("en-US");
  return (
    `<div id="rosettaMultiPivotCompareCard" class="ek-card-muted ek-mt-xs" data-rosetta-pivot-strong="${escVm(strongId)}" data-rosetta-pivot-ref="${escVm(`${book}.${chapter}.${verse}`)}">` +
    `<strong>🧭 ${isEn ? "Multi-Pivot Verse Compare (Original ↔ ES ↔ EN)" : "Comparador Multi-Pivote (Original ↔ ES ↔ EN)"} · ${escVm(`${book} ${chapter}:${verse}`)}</strong>` +
    `<p class="ek-meta ek-mt-xs"><strong>${escVm(strongId)}</strong> · <code>${escVm(lemma)}</code> ↔ ES: <em>${escVm(esGloss)}</em> · EN: <em>${escVm(enGloss)}</em> (${pairs} ${isEn ? "empirical alignments" : "alineaciones empíricas"})</p>` +
    `</div>`
  );
}
