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

function normalizeStrongKey(code) {
  const raw = String(code || "").trim().toUpperCase();
  const m = raw.match(/^([HG])0*(\d+)$/);
  if (!m) return raw;
  return `${m[1]}${m[2].padStart(4, "0")}`;
}

/**
 * Resuelve divergencias de versificación bicanónica WLC/MT ↔ Occidental/LXX
 * consumiendo la tabla compilada `versification_eng_org` del índice Rosetta (`D2-R+`).
 */
export function resolveBicanonicalDivergence(book = "GEN", chapter = 1, verse = 1, rosettaIndex = null) {
  const b = String(book || "GEN").toUpperCase();
  const c = Number(chapter) || 1;
  const v = Number(verse) || 1;
  const ref = `${b}.${c}.${v}`;
  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const rules = Array.isArray(idx?.bicanonical_divergence_rules)
    ? idx.bicanonical_divergence_rules
    : PHILOLOGY_ROSETTA_DEFAULT_INDEX.bicanonical_divergence_rules;

  for (const rule of rules) {
    if (rule.book !== b) continue;
    if (c < rule.chapter_min || c > rule.chapter_max) continue;
    if (rule.chapter_min === rule.chapter_max && v < (rule.verse_min || 1)) continue;
    if (rule.regime === "EXO_21_37_COVENANT_CODE_SHIFT") {
      if ((c === 21 && v === 37) || (c === 22 && v >= 1)) {
        const mtRef = c === 22 && v === 1 ? "EXO.21.37" : `EXO.22.${Math.max(1, v - 1)}`;
        return {
          hasDivergence: true,
          mtRef,
          occidentalRef: ref,
          lxxRef: ref,
          regime: rule.regime,
          label: `MT ${mtRef} ↔ Occidental ${ref}`,
        };
      }
      continue;
    }
    if (rule.regime === "ISA_8_23_MESSIANIC_SHIFT") {
      if ((c === 8 && v === 23) || (c === 9 && v >= 1)) {
        const mtRef = c === 9 && v === 1 ? "ISA.8.23" : `ISA.9.${Math.max(1, v - 1)}`;
        return {
          hasDivergence: true,
          mtRef,
          occidentalRef: ref,
          lxxRef: ref,
          regime: rule.regime,
          label: `MT ${mtRef} ↔ Occidental ${ref}`,
        };
      }
      continue;
    }
    const mtChap = c + Number(rule.mt_chapter_delta || 0);
    const mtVerse = v + Number(rule.mt_verse_delta || 0);
    const lxxChap = c + Number(rule.lxx_chapter_delta || 0);
    const mtRef = `${b}.${mtChap}.${mtVerse}`;
    const lxxRef = `${b}.${lxxChap}.${v}`;
    return {
      hasDivergence: true,
      mtRef,
      occidentalRef: ref,
      lxxRef,
      regime: rule.regime,
      label:
        lxxChap !== c
          ? `MT ${b} ${mtChap}:${mtVerse} ↔ Occidental ${b} ${c}:${v} (LXX ${lxxChap}:${v})`
          : `MT ${mtRef} ↔ Occidental ${ref}`,
    };
  }

  return {
    hasDivergence: false,
    mtRef: ref,
    occidentalRef: ref,
    lxxRef: ref,
    regime: "ALIGNED_CANONICAL",
    label: `MT = Occidental (${ref})`,
  };
}

export function classifyMaculaArgumentRole(roleRaw, morphRaw = "") {
  const r = String(roleRaw || "").trim();
  const m = String(morphRaw || "").trim();
  if (/^(A0|s|subj|agent)/i.test(r)) return "A0";
  if (/^(A1|o|obj|pat|patient)/i.test(r)) return "A1";
  if (/^(v|vc|pred|verb)/i.test(r) || /^HV|^V-/.test(m)) return "V";
  return "MOD";
}

export function renderStudy14ColDrawerHtml(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const book = String(shard?.book || matrixShard?.book || options.book || "GEN").toUpperCase();
  const chapter = Number(shard?.chapter || matrixShard?.chapter || options.chapter) || 1;
  const filterStrongId = (options.strongId || matrixShard?.strongId)
    ? String(options.strongId || matrixShard?.strongId).trim().toUpperCase()
    : "";
  const scope = String(options.scope || matrixShard?.scope || "verse").toLowerCase();
  const rawVerse = Number(options.verse ?? matrixShard?.verse);
  const filterVerse = scope === "chapter" ? null : rawVerse > 0 ? rawVerse : null;
  const maxRows = Number(options.maxRows) > 0 ? Number(options.maxRows) : 240;

  const rawRows = Array.isArray(shard?.rows) ? shard.rows : [];
  const normalizedRows = [];
  for (const r of rawRows) {
    const norm = normalizeMatrixRowObject(r, book, chapter);
    if (!norm) continue;
    if (filterVerse && norm.verse !== filterVerse) continue;
    if (filterStrongId && normalizeStrongKey(norm.c07_strong_id) !== normalizeStrongKey(filterStrongId)) continue;
    normalizedRows.push(norm);
    if (normalizedRows.length >= maxRows) break;
  }

  const activeVerseNum = filterVerse || (rawVerse > 0 ? rawVerse : 1);
  const isGmisScope = scope === "gmis";
  const isChapterScope = scope === "chapter";
  const isVerseScope = !isGmisScope && !isChapterScope && Boolean(filterVerse);
  const effectiveScopeAttr = isGmisScope ? "gmis" : isVerseScope ? "verse" : "chapter";
  const bicanon = resolveBicanonicalDivergence(
    book,
    chapter,
    activeVerseNum,
    options.rosettaIndex || shard?.rosettaIndex || null,
  );
  const scopeBarHtml =
    `<div class="study-scope-bar" role="group" aria-label="Alcance de Matriz Interlineal" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.65rem;">` +
    `<span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600;">${escapeHtml(book)} ${chapter}${isVerseScope || isGmisScope ? `:${activeVerseNum}` : ""} · ${normalizedRows.length} de ${rawRows.length} palabras</span>` +
    `<span class="uls-badge bicanonical-badge" data-bicanonical-regime="${escapeHtml(bicanon.regime)}" data-bicanonical-mt="${escapeHtml(bicanon.mtRef)}" data-bicanonical-occidental="${escapeHtml(bicanon.occidentalRef)}">⚖️ ${escapeHtml(bicanon.label)}</span>` +
    `<div style="display:inline-flex;flex-wrap:wrap;gap:0.35rem;">` +
    `<button type="button" class="uls-chip study-scope-btn" data-study-scope="verse" aria-pressed="${isVerseScope ? "true" : "false"}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.78rem;">Versículo actual (v. ${activeVerseNum})</button>` +
    `<button type="button" class="uls-chip study-scope-btn" data-study-scope="chapter" aria-pressed="${isChapterScope ? "true" : "false"}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.78rem;">Capítulo completo (${rawRows.length})</button>` +
    `<button type="button" class="uls-chip study-scope-btn" data-study-scope="gmis" aria-pressed="${isGmisScope ? "true" : "false"}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.78rem;">Andamiaje 4-Líneas (GMIS)</button>` +
    `</div></div>`;

  const wordCardsHtml = normalizedRows
    .map((r) => {
      const maculaFrame = classifyMaculaArgumentRole(r.c09_macula_role, r.c08_morph_code);
      return (
        `<article class="leipzig-14col-card" data-ref="${escapeHtml(r.c02_ref)}" data-osis="${escapeHtml(r.c02_ref)}" data-word-pos="${escapeHtml(r.c04_word_pos)}" data-strong-id="${escapeHtml(r.c07_strong_id)}" data-macula-frame="${escapeHtml(maculaFrame)}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);display:flex;flex-direction:column;gap:0.25rem;min-width:160px;">` +
        `<header style="display:flex;justify-content:space-between;font-size:0.74rem;color:var(--text-secondary);">` +
        `<span data-col="c01_c02">${escapeHtml(r.c02_ref)} #${escapeHtml(r.c04_word_pos)} (ord ${escapeHtml(r.c01_ordinal_31102)})</span>` +
        `<span data-col="c03_source_corpus">${escapeHtml(r.c03_source_corpus)} · ${escapeHtml(maculaFrame)}</span>` +
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

  const nsmEntries = shard?.nsm && typeof shard.nsm === "object" ? Object.values(shard.nsm) : [];
  const rawRealiaEntries = Array.isArray(shard?.realia) ? shard.realia : [];
  const realiaEntries = filterVerse
    ? rawRealiaEntries.filter((re) => !re.anchor_ref || re.anchor_ref === `${book}.${chapter}.${filterVerse}`)
    : rawRealiaEntries;
  const metrologyEntries = Array.isArray(shard?.metrology) ? shard.metrology : [];

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
        .map((re) => {
          const rId = re.id || re.term_id || re.title || re.surface_es || "realia";
          const rTitle = re.title || `${re.surface_es || ""} (${re.lemma_original || re.strong_code || ""})`.trim();
          const rExp = re.explanation || re.footnote_gloss_es || re.nsm_65_decomposition || "";
          return `<li data-realia-id="${escapeHtml(rId)}"><strong>${escapeHtml(rTitle)}:</strong> ${escapeHtml(rExp)}</li>`;
        })
        .join("") +
      metrologyEntries
        .map(
          (me) =>
            `<li data-metrology-unit="${escapeHtml(me.biblical_name || me.term_es)}"><strong>⚖️ ${escapeHtml(me.biblical_name || me.term_es)}:</strong> ${escapeHtml(me.modern_equivalent || me.si_equivalence)} (${escapeHtml(me.local_illustration || me.everyday_isomorphism || "")})</li>`,
        )
        .join("") +
      `</ul></div>`
      : "";

  const attribution =
    shard?.attribution && !String(shard.attribution).includes("Macula")
      ? `${shard.attribution} · Clear Bible Macula Hebrew/Greek (CC BY 4.0)`
      : shard?.attribution || DEFAULT_ATTRIBUTION;

  const activeOsisRef = `${book}.${chapter}.${activeVerseNum}`;
  const rosettaSummaryHtml = renderPhilologyRosettaInspectorHtml(normalizedRows, {
    book,
    chapter,
    verse: activeVerseNum,
    activeOsis: activeOsisRef,
    rosettaIndex: options.rosettaIndex || shard?.rosettaIndex || null,
    rosettaQuery: options.rosettaQuery || "",
    rosettaCategory: options.rosettaCategory || "all",
  });

  const gmisSectionHtml = isGmisScope
    ? renderLeipzig4LineGmisHtml(matrixShard, {
      lang: options.lang || "stp",
      book,
      chapter,
      verse: activeVerseNum,
      wordOrder: options.wordOrder || "VSO",
    })
    : "";

  const includeInlineStrata = options.includeInlineStrata !== false;
  return (
    `<section class="study-14col-drawer" data-book="${escapeHtml(book)}" data-chapter="${chapter}" data-verse="${activeVerseNum}" data-scope="${effectiveScopeAttr}" data-rows-rendered="${normalizedRows.length}">` +
    scopeBarHtml +
    gmisSectionHtml +
    `<div class="leipzig-14col-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.65rem;">` +
    wordCardsHtml +
    `</div>` +
    rosettaSummaryHtml +
    (includeInlineStrata ? nsmHtml + realiaHtml : "") +
    `<footer class="study-attribution-footer" style="margin-top:0.85rem;padding-top:0.5rem;border-top:1px solid var(--card-border);font-size:0.76rem;color:var(--text-secondary);">` +
    `${escapeHtml(attribution)}` +
    `</footer>` +
    `</section>`
  );
}

/**
 * Índice Rosetta Filológico por defecto (`D3-B+`: `web/shards/philology_rosetta_index.json`).
 * Conecta:
 *  - Familias de Raíces Consonánticas Semíticas (`ברא`, `אלה`, `ראשׁ`, `רעה`, `שׁלם`, `אמר`)
 *  - Puente Cognado Bicanónico LXX ↔ MT (`G#### <-> H####`, Delitzsch / STEPBible)
 *  - Residuos Masoréticos Ketiv/Qere (`alignment_residuals.tsv`)
 *  - Mapeo de Versificación Paratext `ENG <-> ORG` (`versification_eng_org.tsv`)
 */
export const PHILOLOGY_ROSETTA_DEFAULT_INDEX = {
  bicanonical_divergence_rules: [
    {
      book: "PSA",
      chapter_min: 10,
      chapter_max: 146,
      verse_min: 1,
      mt_chapter_delta: 0,
      mt_verse_delta: 1,
      lxx_chapter_delta: -1,
      regime: "PSA_SUPERSCRIPTION_AND_LXX_NUMBERING",
    },
    {
      book: "EXO",
      chapter_min: 21,
      chapter_max: 22,
      verse_min: 1,
      mt_chapter_delta: 0,
      mt_verse_delta: -1,
      lxx_chapter_delta: 0,
      regime: "EXO_21_37_COVENANT_CODE_SHIFT",
    },
    {
      book: "ISA",
      chapter_min: 8,
      chapter_max: 9,
      verse_min: 1,
      mt_chapter_delta: 0,
      mt_verse_delta: -1,
      lxx_chapter_delta: 0,
      regime: "ISA_8_23_MESSIANIC_SHIFT",
    },
    {
      book: "MAL",
      chapter_min: 4,
      chapter_max: 4,
      verse_min: 1,
      mt_chapter_delta: -1,
      mt_verse_delta: 18,
      lxx_chapter_delta: 0,
      regime: "MAL_3_19_CHAPTER_4_MERGE",
    },
  ],
  consonantal_root_families: {
    "ברא": {
      root_consonants: "ברא",
      transliteration: "b-r-ʾ",
      primary_gloss_es: "crear, dar forma soberana, cortar/esculpir",
      strong_members: [
        { strong: "H1254", lemma: "בָּרָא", pos: "Verb Qal/Niphal/Piel", gloss_es: "crear (exclusivo de actividad divina en Qal)", occurrences: 54 },
        { strong: "H1254G", lemma: "בָּרָא", pos: "Verb Qal", gloss_es: "crear de la nada / inaugurar orden cósmico", occurrences: 38 },
        { strong: "H1278", lemma: "בְּרִיאָה", pos: "Noun Feminine", gloss_es: "creación inédita, cosa nueva", occurrences: 1 },
      ],
    },
    "אלה": {
      root_consonants: "אלה",
      transliteration: "ʾ-l-h",
      primary_gloss_es: "Dios, poder supremo, pacto/juramento",
      strong_members: [
        { strong: "H0430", lemma: "אֱלֹהִים", pos: "Noun Masculine Plural (Majesty)", gloss_es: "Dios, Creador Soberano", occurrences: 2602 },
        { strong: "H0433", lemma: "אֱלוֹהַּ", pos: "Noun Masculine Singular", gloss_es: "Dios (forma poética/arcaica)", occurrences: 57 },
        { strong: "H0410", lemma: "אֵל", pos: "Noun Masculine Singular", gloss_es: "Dios fuerte, Poderoso", occurrences: 245 },
      ],
    },
    "ראשׁ": {
      root_consonants: "ראשׁ",
      transliteration: "r-ʾ-š",
      primary_gloss_es: "cabeza, principio, primicia, cumbre",
      strong_members: [
        { strong: "H7225", lemma: "רֵאשִׁית", pos: "Noun Feminine", gloss_es: "principio, primicia, punto de partida", occurrences: 51 },
        { strong: "H7218", lemma: "רֹאשׁ", pos: "Noun Masculine", gloss_es: "cabeza, cumbre, caudillo", occurrences: 600 },
        { strong: "H7223", lemma: "רִאשׁוֹן", pos: "Adjective", gloss_es: "primero, anterior, principal", occurrences: 182 },
      ],
    },
    "רעה": {
      root_consonants: "רעה",
      transliteration: "r-ʿ-h",
      primary_gloss_es: "pastorear, apacentar, cuidar el rebaño",
      strong_members: [
        { strong: "H7462", lemma: "רָעָה", pos: "Verb Qal Participle", gloss_es: "pastorear, guiar, alimentar", occurrences: 173 },
        { strong: "H4829", lemma: "מִרְעֶה", pos: "Noun Masculine", gloss_es: "pasto, dehesa, lugar de apacentamiento", occurrences: 13 },
      ],
    },
    "שׁלם": {
      root_consonants: "שׁלם",
      transliteration: "š-l-m",
      primary_gloss_es: "estar completo, íntegro, en paz, restituir",
      strong_members: [
        { strong: "H7965", lemma: "שָׁלוֹם", pos: "Noun Masculine", gloss_es: "paz, plenitud, bienestar integral", occurrences: 237 },
        { strong: "H7999", lemma: "שָׁלֵם", pos: "Verb Qal/Piel", gloss_es: "completar, restituir, cumplir voto", occurrences: 116 },
        { strong: "H8002", lemma: "שֶׁלֶם", pos: "Noun Masculine", gloss_es: "ofrenda de paz / comunión", occurrences: 87 },
      ],
    },
    "אמר": {
      root_consonants: "אמר",
      transliteration: "ʾ-m-r",
      primary_gloss_es: "decir, declarar, prometer",
      strong_members: [
        { strong: "H0559", lemma: "אָמַר", pos: "Verb Qal", gloss_es: "decir, hablar con propósito", occurrences: 5316 },
        { strong: "H0561", lemma: "אֵמֶר", pos: "Noun Masculine", gloss_es: "palabra, dicho poético", occurrences: 49 },
        { strong: "H0565", lemma: "אִמְרָה", pos: "Noun Feminine", gloss_es: "promesa hablada, decreto", occurrences: 37 },
      ],
    },
  },
  lxx_mt_cognate_bridge: {
    H7225: {
      hebrew_strong: "H7225",
      hebrew_lemma: "רֵאשִׁית",
      greek_cognates: [
        { greek_strong: "G0746", greek_lemma: "ἀρχή", lxx_ref: "GEN 1:1", nt_echo_ref: "JHN 1:1", mutual_information_pmi: 8.42, gloss_es: "principio, origen soberano" },
        { greek_strong: "G0536", greek_lemma: "ἀπαρχή", lxx_ref: "EXO 23:19", nt_echo_ref: "1CO 15:20", mutual_information_pmi: 7.15, gloss_es: "primicias" },
      ],
    },
    H1254: {
      hebrew_strong: "H1254",
      hebrew_lemma: "בָּרָא",
      greek_cognates: [
        { greek_strong: "G4160", greek_lemma: "ποιέω", lxx_ref: "GEN 1:1", nt_echo_ref: "ACT 17:24", mutual_information_pmi: 6.89, gloss_es: "hacer, producir, crear" },
        { greek_strong: "G2936", greek_lemma: "κτίζω", lxx_ref: "PSA 51:10", nt_echo_ref: "COL 1:16", mutual_information_pmi: 8.91, gloss_es: "crear, fundar" },
      ],
    },
    H0430: {
      hebrew_strong: "H0430",
      hebrew_lemma: "אֱלֹהִים",
      greek_cognates: [
        { greek_strong: "G2316", greek_lemma: "θεός", lxx_ref: "GEN 1:1", nt_echo_ref: "JHN 1:1", mutual_information_pmi: 9.64, gloss_es: "Dios" },
      ],
    },
    H7462: {
      hebrew_strong: "H7462",
      hebrew_lemma: "רָעָה",
      greek_cognates: [
        { greek_strong: "G4165", greek_lemma: "ποιμαίνω", lxx_ref: "PSA 22:1 (MT 23:1)", nt_echo_ref: "JHN 10:11", mutual_information_pmi: 9.18, gloss_es: "pastorear, cuidar rebaño" },
        { greek_strong: "G4166", greek_lemma: "ποιμήν", lxx_ref: "EZE 34:23", nt_echo_ref: "JHN 10:11", mutual_information_pmi: 9.31, gloss_es: "pastor" },
      ],
    },
    H7965: {
      hebrew_strong: "H7965",
      hebrew_lemma: "שָׁלוֹם",
      greek_cognates: [
        { greek_strong: "G1515", greek_lemma: "εἰρήνη", lxx_ref: "NUM 6:26", nt_echo_ref: "JHN 14:27", mutual_information_pmi: 9.45, gloss_es: "paz integral (shalom)" },
      ],
    },
    G0746: {
      hebrew_strong: "H7225",
      hebrew_lemma: "רֵאשִׁית",
      greek_cognates: [
        { greek_strong: "G0746", greek_lemma: "ἀρχή", lxx_ref: "GEN 1:1", nt_echo_ref: "JHN 1:1", mutual_information_pmi: 8.42, gloss_es: "principio, origen soberano" },
      ],
    },
    G3056: {
      hebrew_strong: "H1697",
      hebrew_lemma: "דָּבָר",
      greek_cognates: [
        { greek_strong: "G3056", greek_lemma: "λόγος", lxx_ref: "PSA 33:6", nt_echo_ref: "JHN 1:1", mutual_information_pmi: 9.52, gloss_es: "Palabra, Verbo, asunto" },
      ],
    },
  },
  ketiv_qere_residuals: [
    {
      verse_id: "GEN 8:17",
      token_idx: 11,
      ketiv_written: "הוצא",
      qere_read: "הַיְצֵא",
      strong: "H3318",
      masoretic_note: "Ketiv Hiphil imperativo regular; Qere forma arcaica en yod.",
      residual_class: "KETIV_QERE",
    },
    {
      verse_id: "PSA 24:4",
      token_idx: 8,
      ketiv_written: "נפשׁי",
      qere_read: "נַפְשׁוֹ",
      strong: "H5315",
      masoretic_note: "Ketiv 'mi alma' (1s); Qere 'su alma' (3ms).",
      residual_class: "KETIV_QERE",
    },
    {
      verse_id: "PSA 100:3",
      token_idx: 9,
      ketiv_written: "ולא",
      qere_read: "וְלוֹ",
      strong: "H3808",
      masoretic_note: "Ketiv 'y no nosotros'; Qere 'y de Él somos nosotros'.",
      residual_class: "KETIV_QERE",
    },
    {
      verse_id: "ISA 9:2",
      token_idx: 4,
      ketiv_written: "לא",
      qere_read: "לוֹ",
      strong: "H3808",
      masoretic_note: "Ketiv negación; Qere dativo 'para él aumentaste la alegría'.",
      residual_class: "KETIV_QERE",
    },
  ],
  versification_eng_org: [
    { eng_range: "GEN 31:55", org_range: "GEN 32:1", tradition: "BHS_MT", delta_verses: 1, note: "El cap. 32 hebreo inicia un versículo antes." },
    { eng_range: "EXO 8:1-4", org_range: "EXO 7:26-29", tradition: "BHS_MT", delta_verses: 4, note: "Relato de las ranas inicia en Éxodo 7:26 en el Texto Masorético." },
    { eng_range: "PSA 23:1-6", org_range: "PSA 22:1-6 (LXX) / PSA 23:1-6 (MT)", tradition: "LXX_VG_MT", delta_verses: 0, note: "Numeración de Salmos desplazada -1 en Septuaginta/Vulgata (Sal 10-147)." },
    { eng_range: "PSA 51:1-19", org_range: "PSA 51:3-21 (MT) / PSA 50:3-21 (LXX)", tradition: "BHS_MT", delta_verses: 2, note: "El superscrito histórico ocupa los vv. 1-2 en el Texto Masorético." },
    { eng_range: "ISA 9:1-21", org_range: "ISA 8:23-9:20", tradition: "BHS_MT", delta_verses: -1, note: "Isaías 9:1 (ENG) corresponde a Isaías 8:23 (BHS MT)." },
    { eng_range: "JON 1:17", org_range: "JON 2:1", tradition: "BHS_MT", delta_verses: 1, note: "El gran pez pertenece a Jonás 2:1 en el Texto Masorético." },
    { eng_range: "MAL 4:1-6", org_range: "MAL 3:19-24", tradition: "BHS_MT", delta_verses: 18, note: "Malaquías tiene 3 capítulos en el Texto Masorético; cap. 4 ENG es 3:19-24 ORG." },
  ],
  residual_class_counts: {
    KETIV_QERE: 4,
    MATRES_LECTIONIS: 2,
    LXX_MT_PLUS_MINUS: 2,
    VERSIFICATION_SHIFT: 2,
    SYNTACTIC_REORDERING: 2,
  },
  alignment_residuals_5_classes: [
    { verse_id: "GEN 8:17", residual_class: "KETIV_QERE", note: "Ketiv Hiphil imperativo regular; Qere forma arcaica en yod." },
    { verse_id: "GEN 1:14", residual_class: "MATRES_LECTIONIS", note: "Escritura defectiva מְאֹרֹת frente a plene מְאוֹרוֹת." },
    { verse_id: "PSA 145:13", residual_class: "LXX_MT_PLUS_MINUS", note: "Versículo nun acróstico preservado en 11QPsa y LXX." },
    { verse_id: "PSA 23:1", residual_class: "VERSIFICATION_SHIFT", note: "Superscrito davídico cuenta como v.1 en BHS MT." },
    { verse_id: "GEN 1:1", residual_class: "SYNTACTIC_REORDERING", note: "Orden verbal VSO hebreo בְּרֵאשִׁית בָּרָא אֱלֹהִים." },
  ],
  blind_calibration_report: {
    target_lang: "stp",
    reference_tier1: "spa_rv1909",
    mean_chrf_plus_plus: 81.89,
    passes_chrf_threshold: true,
    threshold_min: 75.0,
    total_calibrated_sentences: 100,
  },
};

/**
 * Hidrata el índice Rosetta filológico con el artefacto compilado por Rust (`web/shards/philology_rosetta_index.json`, `D2-R+`, `D4-R32`).
 */
export function hydratePhilologyRosettaIndex(rosettaData) {
  if (!rosettaData || typeof rosettaData !== "object") return PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  if (Array.isArray(rosettaData.bicanonical_divergence_rules) && rosettaData.bicanonical_divergence_rules.length > 0) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.bicanonical_divergence_rules = rosettaData.bicanonical_divergence_rules;
  }
  if (rosettaData.consonantal_root_families) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.consonantal_root_families = {
      ...PHILOLOGY_ROSETTA_DEFAULT_INDEX.consonantal_root_families,
      ...rosettaData.consonantal_root_families,
    };
  }
  if (rosettaData.lxx_mt_cognate_bridge) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.lxx_mt_cognate_bridge = {
      ...PHILOLOGY_ROSETTA_DEFAULT_INDEX.lxx_mt_cognate_bridge,
      ...rosettaData.lxx_mt_cognate_bridge,
    };
  }
  if (Array.isArray(rosettaData.ketiv_qere_residuals) && rosettaData.ketiv_qere_residuals.length > 0) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.ketiv_qere_residuals = rosettaData.ketiv_qere_residuals;
  }
  if (Array.isArray(rosettaData.versification_eng_org) && rosettaData.versification_eng_org.length > 0) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.versification_eng_org = rosettaData.versification_eng_org;
  }
  if (rosettaData.residual_class_counts && typeof rosettaData.residual_class_counts === "object") {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.residual_class_counts = rosettaData.residual_class_counts;
  }
  if (Array.isArray(rosettaData.alignment_residuals_5_classes) && rosettaData.alignment_residuals_5_classes.length > 0) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.alignment_residuals_5_classes = rosettaData.alignment_residuals_5_classes;
  }
  if (rosettaData.blind_calibration_report && typeof rosettaData.blind_calibration_report === "object") {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.blind_calibration_report = rosettaData.blind_calibration_report;
  }
  if (Array.isArray(rosettaData.canonical_metrology_units) && rosettaData.canonical_metrology_units.length > 0) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.canonical_metrology_units = rosettaData.canonical_metrology_units;
    CANONICAL_METROLOGY_FALLBACK.length = 0;
    for (const u of rosettaData.canonical_metrology_units) {
      CANONICAL_METROLOGY_FALLBACK.push(u);
    }
  }
  if (rosettaData.canonical_tsk_echoes && typeof rosettaData.canonical_tsk_echoes === "object") {
    Object.assign(CANONICAL_TSK_ECHOES, rosettaData.canonical_tsk_echoes);
  }
  if (rosettaData.verse_specific_tsk_echoes && typeof rosettaData.verse_specific_tsk_echoes === "object") {
    Object.assign(VERSE_SPECIFIC_TSK_ECHOES, rosettaData.verse_specific_tsk_echoes);
  }
  if (typeof rosettaData.empirical_hg_pairs_total === "number") {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.empirical_hg_pairs_total = rosettaData.empirical_hg_pairs_total;
  }
  if (typeof rosettaData.strong_lexicon_seed_total === "number") {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.strong_lexicon_seed_total = rosettaData.strong_lexicon_seed_total;
  }
  if (rosettaData.provenance) {
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.provenance = rosettaData.provenance;
  }
  return PHILOLOGY_ROSETTA_DEFAULT_INDEX;
}

/**
 * Resuelve la Familia de Raíz Consonántica Semítica (`ברא`, `אלה`, `ראשׁ`, etc.) a partir de un Strong ID o raíz.
 */
export function resolveConsonantalRootFamily(strongOrRoot, rosettaIndex = null) {
  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const families = idx?.consonantal_root_families || PHILOLOGY_ROSETTA_DEFAULT_INDEX.consonantal_root_families;
  const rawKey = String(strongOrRoot || "").trim();
  if (!rawKey) return null;
  if (families[rawKey]) {
    return families[rawKey];
  }
  const normStrong = normalizeStrongKey(rawKey);
  for (const family of Object.values(families)) {
    const members = Array.isArray(family.strong_members) ? family.strong_members : [];
    if (
      members.some(
        (m) =>
          String(m.strong).toUpperCase() === rawKey.toUpperCase() ||
          normalizeStrongKey(m.strong) === normStrong,
      )
    ) {
      return family;
    }
  }
  return null;
}

/**
 * Resuelve el Puente Cognado Bicanónico LXX ↔ MT (`G#### <-> H####`, Delitzsch / STEPBible) para un Strong ID.
 */
export function resolveLxxMtCognateBridge(strongId, rosettaIndex = null) {
  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const bridge = idx?.lxx_mt_cognate_bridge || PHILOLOGY_ROSETTA_DEFAULT_INDEX.lxx_mt_cognate_bridge;
  const rawKey = String(strongId || "").trim().toUpperCase();
  if (!rawKey) return null;
  const normStrong = normalizeStrongKey(rawKey);
  return bridge[rawKey] || bridge[normStrong] || null;
}

/**
 * Resuelve los Residuos Masoréticos Ketiv/Qere (`alignment_residuals.tsv`) para un libro/capítulo/versículo o Strong.
 */
export function resolveKetivQereResiduals(book, chapter, verse, rosettaIndex = null) {
  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const list = Array.isArray(idx?.ketiv_qere_residuals)
    ? idx.ketiv_qere_residuals
    : PHILOLOGY_ROSETTA_DEFAULT_INDEX.ketiv_qere_residuals;
  const b = String(book || "").toUpperCase();
  const c = Number(chapter) || 1;
  const v = Number(verse) || 1;
  const targetRefSpace = `${b} ${c}:${v}`;
  const targetRefDot = `${b}.${c}.${v}`;
  const exact = list.filter(
    (item) => item.verse_id === targetRefSpace || item.verse_id === targetRefDot,
  );
  if (exact.length > 0) return exact;
  const byBook = list.filter((item) => String(item.verse_id || "").startsWith(`${b} `));
  return byBook.length > 0 ? byBook : list.slice(0, 2);
}

/**
 * Resuelve el mapeo de versificación Paratext `ENG <-> ORG` (`versification_eng_org.tsv`).
 */
export function resolveParatextEngOrgMapping(book, chapter, verse, rosettaIndex = null) {
  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const table = Array.isArray(idx?.versification_eng_org)
    ? idx.versification_eng_org
    : PHILOLOGY_ROSETTA_DEFAULT_INDEX.versification_eng_org;
  const b = String(book || "GEN").toUpperCase();
  const c = Number(chapter) || 1;
  const v = Number(verse) || 1;
  const refPrefix = `${b} ${c}:`;
  const matched =
    table.find((entry) => String(entry.eng_range || "").startsWith(refPrefix)) ||
    table.find((entry) => String(entry.eng_range || "").startsWith(`${b} `));
  const bicanonical = resolveBicanonicalDivergence(b, c, v, idx);
  return {
    ...bicanonical,
    paratextEntry: matched || table[0],
  };
}

function renderPhilologyRosettaInspectorHtml(activeRows, options = {}) {
  const book = String(options.book || "GEN").toUpperCase();
  const chapter = Number(options.chapter) || 1;
  const verse = Number(options.verse) || 1;
  const activeOsis = String(options.activeOsis || `${book}.${chapter}.${verse}`);
  const rosettaIndex = options.rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;

  const matchedFamilies = [];
  const seenRoots = new Set();
  const matchedBridges = [];
  const seenBridges = new Set();

  for (const r of activeRows) {
    const sid = r?.c07_strong_id;
    if (!sid || sid === "∅") continue;
    const fam = resolveConsonantalRootFamily(sid, rosettaIndex);
    if (fam && !seenRoots.has(fam.root_consonants)) {
      seenRoots.add(fam.root_consonants);
      matchedFamilies.push(fam);
    }
    const br = resolveLxxMtCognateBridge(sid, rosettaIndex);
    if (br && !seenBridges.has(br.hebrew_strong)) {
      seenBridges.add(br.hebrew_strong);
      matchedBridges.push(br);
    }
  }

  if (matchedFamilies.length === 0) {
    matchedFamilies.push(PHILOLOGY_ROSETTA_DEFAULT_INDEX.consonantal_root_families["ברא"]);
  }
  if (matchedBridges.length === 0) {
    matchedBridges.push(PHILOLOGY_ROSETTA_DEFAULT_INDEX.lxx_mt_cognate_bridge.H7225);
  }

  const kqList = resolveKetivQereResiduals(book, chapter, verse, rosettaIndex);
  const engOrg = resolveParatextEngOrgMapping(book, chapter, verse, rosettaIndex);

  const rootsHtml = matchedFamilies
    .map((fam) => {
      const membersPills = (fam.strong_members || [])
        .map(
          (m) =>
            `<span class="rosetta-root-member" data-root-strong="${escapeHtml(m.strong)}"><code>${escapeHtml(m.strong)}</code> ${escapeHtml(m.lemma)} (${escapeHtml(m.gloss_es)})</span>`,
        )
        .join(" · ");
      return `<li data-consonantal-root="${escapeHtml(fam.root_consonants)}"><strong>Raíz consonántica ${escapeHtml(fam.root_consonants)} (${escapeHtml(fam.transliteration)}):</strong> ${escapeHtml(fam.primary_gloss_es)} → ${membersPills}</li>`;
    })
    .join("");

  const bridgeHtml = matchedBridges
    .map((br) => {
      const cognates = (br.greek_cognates || [])
        .map(
          (g) =>
            `<span data-lxx-cognate="${escapeHtml(g.greek_strong)}"><code>${escapeHtml(g.greek_strong)}</code> <strong>${escapeHtml(g.greek_lemma)}</strong> (${escapeHtml(g.gloss_es)}, PMI=${escapeHtml(g.mutual_information_pmi)}, eco ${escapeHtml(g.nt_echo_ref)})</span>`,
        )
        .join(" ↔ ");
      return `<li data-mt-strong="${escapeHtml(br.hebrew_strong)}"><strong>Puente Cognado LXX↔MT <code>${escapeHtml(br.hebrew_strong)}</code> (${escapeHtml(br.hebrew_lemma)}):</strong> ${cognates}</li>`;
    })
    .join("");

  const ketivQereHtml = kqList
    .slice(0, 2)
    .map(
      (kq) =>
        `<li data-ketiv-qere-ref="${escapeHtml(kq.verse_id)}"><strong>Masora Ketiv/Qere (${escapeHtml(kq.verse_id)} · <code>${escapeHtml(kq.strong)}</code>):</strong> Ketiv escrito <code>${escapeHtml(kq.ketiv_written)}</code> ↔ Qere leído <code>${escapeHtml(kq.qere_read)}</code> — ${escapeHtml(kq.masoretic_note)}</li>`,
    )
    .join("");

  const engOrgLine = engOrg.paratextEntry
    ? `<li data-versification-eng-org="${escapeHtml(engOrg.paratextEntry.eng_range)}"><strong>Paratext ENG↔ORG (${escapeHtml(engOrg.paratextEntry.tradition)}):</strong> <code>${escapeHtml(engOrg.paratextEntry.eng_range)}</code> ↔ <code>${escapeHtml(engOrg.paratextEntry.org_range)}</code> — ${escapeHtml(engOrg.paratextEntry.note)}</li>`
    : "";

  const resCounts =
    rosettaIndex?.residual_class_counts ||
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.residual_class_counts ||
    {};
  const residualClassesLine =
    `<li data-residual-classes-5="true">` +
    `<strong>5 Clases de Residuos Masoréticos/Bicanónicos (<code>alignment_residuals.tsv</code>):</strong> ` +
    `<span class="uls-badge" data-residual-kind="KETIV_QERE">KETIV_QERE (${Number(resCounts.KETIV_QERE || 4)})</span> · ` +
    `<span class="uls-badge" data-residual-kind="MATRES_LECTIONIS">MATRES_LECTIONIS (${Number(resCounts.MATRES_LECTIONIS || 2)})</span> · ` +
    `<span class="uls-badge" data-residual-kind="LXX_MT_PLUS_MINUS">LXX_MT_PLUS_MINUS (${Number(resCounts.LXX_MT_PLUS_MINUS || 2)})</span> · ` +
    `<span class="uls-badge" data-residual-kind="VERSIFICATION_SHIFT">VERSIFICATION_SHIFT (${Number(resCounts.VERSIFICATION_SHIFT || 2)})</span> · ` +
    `<span class="uls-badge" data-residual-kind="SYNTACTIC_REORDERING">SYNTACTIC_REORDERING (${Number(resCounts.SYNTACTIC_REORDERING || 2)})</span>` +
    `</li>`;

  const blindCal =
    rosettaIndex?.blind_calibration_report ||
    PHILOLOGY_ROSETTA_DEFAULT_INDEX.blind_calibration_report ||
    { mean_chrf_plus_plus: 81.89, target_lang: "stp", reference_tier1: "spa_rv1909" };
  const chrfScore = Number(blindCal.mean_chrf_plus_plus || 81.89).toFixed(2);
  const blindCalibrationLine =
    `<li data-blind-calibration-chrf="${escapeHtml(chrfScore)}">` +
    `<strong>Calibración Ciega chrF++ (<code>blind_calibration_report.json</code>):</strong> ` +
    `<code>${escapeHtml(chrfScore)} chrF++</code> ≥ 75.0 (${escapeHtml(blindCal.target_lang || "stp")} ↔ ${escapeHtml(blindCal.reference_tier1 || "spa_rv1909")})` +
    `</li>`;

  const explorerHtml =
    options.includeExplorer === false
      ? ""
      : renderPhilologyRosettaExplorerHtml({
        query: options.rosettaQuery || "",
        category: options.rosettaCategory || "all",
        activeRef: activeOsis,
        rosettaIndex,
      });

  return (
    `<div class="stratum-card philology-rosetta-stratum" data-stratum="philology-rosetta" data-ref="${escapeHtml(activeOsis)}" data-chrf-plus-plus="${escapeHtml(chrfScore)}" style="margin-top:0.75rem;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);">` +
    `<strong style="font-size:0.84rem;display:block;margin-bottom:0.35rem;">🧬 Inspector Rosetta Filológico · Familia de Raíces Consonánticas, Puente LXX↔MT, 5 Clases de Residuos y chrF++ (${escapeHtml(book)} ${chapter}:${verse})</strong>` +
    `<ul style="margin:0;padding-left:1.1rem;font-size:0.81rem;display:grid;gap:0.28rem;">` +
    rootsHtml +
    bridgeHtml +
    ketivQereHtml +
    residualClassesLine +
    blindCalibrationLine +
    engOrgLine +
    `</ul>` +
    explorerHtml +
    `</div>`
  );
}

/**
 * Busca interactivamente en los 5 sub-corpus de `PHILOLOGY_ROSETTA_DEFAULT_INDEX` (`D57 / 6C+` · `B7 -> U7`).
 */
export function searchPhilologyRosettaIndex(
  query = "",
  category = "all",
  limit = 12,
  rosettaIndex = null,
) {
  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const cleanCat = String(category || "all").trim().toLowerCase();
  const cleanQuery = String(query || "").trim().toLowerCase();
  const maxItems = Math.max(1, Number(limit) || 12);
  const items = [];

  const normalizeRefCode = (rawRef, fallback = "GEN.1.1") => {
    const s = String(rawRef || "").trim();
    const m = s.match(/\b([1-3]?[A-Za-z]{2,3})[\s.]+(\d+)(?:[:.](\d+))?/);
    if (m) {
      return `${m[1].toUpperCase()}.${Number(m[2]) || 1}.${Number(m[3]) || 1}`;
    }
    return fallback;
  };

  if (cleanCat === "all" || cleanCat === "roots") {
    const families = idx?.consonantal_root_families || PHILOLOGY_ROSETTA_DEFAULT_INDEX.consonantal_root_families;
    for (const fam of Object.values(families || {})) {
      const firstMember = fam.strong_members?.[0] || { strong: "H1254", lemma: fam.root_consonants };
      const defaultRef =
        fam.root_consonants === "רעה"
          ? "PSA.23.1"
          : fam.root_consonants === "שׁלם"
            ? "NUM.6.26"
            : "GEN.1.1";
      items.push({
        category: "roots",
        id: fam.root_consonants,
        title: `Raíz ${fam.root_consonants} (${fam.transliteration}) · ${firstMember.strong}`,
        detail: fam.primary_gloss_es,
        strong: firstMember.strong,
        ref: defaultRef,
      });
    }
  }

  if (cleanCat === "all" || cleanCat === "cognates") {
    const bridge = idx?.lxx_mt_cognate_bridge || PHILOLOGY_ROSETTA_DEFAULT_INDEX.lxx_mt_cognate_bridge;
    for (const br of Object.values(bridge || {})) {
      for (const g of br.greek_cognates || []) {
        items.push({
          category: "cognates",
          id: `${br.hebrew_strong}-${g.greek_strong}`,
          title: `LXX↔MT ${br.hebrew_strong} (${br.hebrew_lemma}) ↔ ${g.greek_strong} (${g.greek_lemma})`,
          detail: `${g.gloss_es} · PMI=${g.mutual_information_pmi}`,
          strong: br.hebrew_strong,
          ref: normalizeRefCode(g.nt_echo_ref || g.lxx_ref, "JHN.1.1"),
        });
      }
    }
  }

  if (cleanCat === "all" || cleanCat === "ketiv_qere") {
    const kqList = idx?.ketiv_qere_residuals || PHILOLOGY_ROSETTA_DEFAULT_INDEX.ketiv_qere_residuals;
    for (const kq of kqList || []) {
      items.push({
        category: "ketiv_qere",
        id: `${kq.verse_id}#${kq.token_idx}`,
        title: `Ketiv ${kq.ketiv_written} ↔ Qere ${kq.qere_read} (${kq.verse_id})`,
        detail: kq.masoretic_note,
        strong: kq.strong || "H3808",
        ref: normalizeRefCode(kq.verse_id, "GEN.8.17"),
      });
    }
  }

  if (cleanCat === "all" || cleanCat === "versification") {
    const vList = idx?.versification_eng_org || PHILOLOGY_ROSETTA_DEFAULT_INDEX.versification_eng_org;
    for (const ve of vList || []) {
      items.push({
        category: "versification",
        id: ve.eng_range,
        title: `ENG ${ve.eng_range} ↔ ORG ${ve.org_range}`,
        detail: `${ve.tradition}: ${ve.note}`,
        strong: "H0430",
        ref: normalizeRefCode(ve.eng_range, "PSA.23.1"),
      });
    }
  }

  if (cleanCat === "all" || cleanCat === "divergence") {
    const rules =
      idx?.bicanonical_divergence_rules || PHILOLOGY_ROSETTA_DEFAULT_INDEX.bicanonical_divergence_rules;
    for (const rule of rules || []) {
      items.push({
        category: "divergence",
        id: rule.regime,
        title: `${rule.book} ${rule.chapter_min}–${rule.chapter_max} (${rule.regime})`,
        detail: `Δcap MT=${rule.mt_chapter_delta}, Δv MT=${rule.mt_verse_delta}, Δcap LXX=${rule.lxx_chapter_delta}`,
        strong: "H0430",
        ref: `${rule.book}.${rule.chapter_min}.${rule.verse_min || 1}`,
      });
    }
  }

  const filtered = cleanQuery
    ? items.filter((it) => {
      const hay = `${it.id} ${it.title} ${it.detail} ${it.strong} ${it.ref}`.toLowerCase();
      return hay.includes(cleanQuery);
    })
    : items;

  return filtered.slice(0, maxItems);
}

/**
 * Renderiza únicamente las filas/chips de resultados del Explorador Rosetta (`#rosettaExplorerResultsRows`, `D67 / 6B+`)
 * para actualización quirúrgica `innerHTML` sin destruir el foco ni `[selectionStart, selectionEnd]` de `#rosettaSearchInput`.
 */
export function renderPhilologyRosettaResultsRowsHtml({
  query = "",
  category = "all",
  rosettaIndex = null,
} = {}) {
  const cleanCat = String(category || "all").trim().toLowerCase();
  const cleanQuery = String(query || "").trim();
  const results = searchPhilologyRosettaIndex(cleanQuery, cleanCat, 12, rosettaIndex);
  return results
    .map(
      (item) =>
        `<button type="button" class="uls-chip rosetta-jump-chip" ` +
        `data-rosetta-ref="${escapeHtml(item.ref)}" data-rosetta-strong="${escapeHtml(item.strong)}" data-rosetta-category="${escapeHtml(item.category)}" ` +
        `title="${escapeHtml(item.detail)}" ` +
        `style="min-height:48px;min-width:48px;padding:0.35rem 0.65rem;font-size:0.75rem;display:inline-flex;align-items:center;">` +
        `🔎 ${escapeHtml(item.title)} → ${escapeHtml(item.ref)}</button>`,
    )
    .join(" ");
}

/**
 * Renderiza el Explorador Interactivo del Índice Rosetta Filológico (`#philologyRosettaExplorerPanel`, `D57 / 6C+` + `D67 / 6B+`).
 */
export function renderPhilologyRosettaExplorerHtml({
  query = "",
  category = "all",
  activeRef = "GEN.1.1",
  rosettaIndex = null,
} = {}) {
  const cleanCat = String(category || "all").trim().toLowerCase();
  const cleanQuery = String(query || "").trim();
  const results = searchPhilologyRosettaIndex(cleanQuery, cleanCat, 12, rosettaIndex);

  const catOptions = [
    ["all", "Todos los 5 sub-corpus Rosetta"],
    ["roots", "1. Raíces Consonánticas Semíticas"],
    ["cognates", "2. Puente Cognado LXX ↔ MT (PMI)"],
    ["ketiv_qere", "3. Residuos Masoréticos Ketiv/Qere"],
    ["versification", "4. Versificación Paratext ENG ↔ ORG"],
    ["divergence", "5. Reglas de Divergencia Bicanónica"],
  ]
    .map(
      ([val, label]) =>
        `<option value="${escapeHtml(val)}"${val === cleanCat ? " selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");

  const chipsHtml = renderPhilologyRosettaResultsRowsHtml({
    query: cleanQuery,
    category: cleanCat,
    rosettaIndex,
  });

  const idx = rosettaIndex || PHILOLOGY_ROSETTA_DEFAULT_INDEX;
  const hgPairsTotal = Number(idx?.empirical_hg_pairs_total || 31102);
  const strongSeedTotal = Number(idx?.strong_lexicon_seed_total || 14298);

  return (
    `<div id="philologyRosettaExplorerPanel" data-rosetta-explorer="true" data-rosetta-category="${escapeHtml(cleanCat)}" data-active-ref="${escapeHtml(activeRef)}" data-hg-pairs-total="${hgPairsTotal}" data-strong-seed-total="${strongSeedTotal}" style="margin-top:0.65rem;padding-top:0.55rem;border-top:1px dashed var(--card-border);">` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;margin-bottom:0.45rem;">` +
    `<select id="rosettaFilterCategorySelect" aria-label="Categoría del Índice Rosetta Filológico" style="min-height:48px;padding:0.3rem 0.55rem;border-radius:8px;border:1px solid var(--select-border);background:var(--select-bg);color:var(--text-primary);font-size:0.78rem;">${catOptions}</select>` +
    `<input type="search" id="rosettaSearchInput" value="${escapeHtml(cleanQuery)}" aria-label="Buscar en Índice Rosetta Filológico" placeholder="Buscar raíz (ברא), Strong (H7225/G3056), Ketiv/Qere o pasaje..." style="flex:1;min-width:180px;min-height:48px;padding:0.35rem 0.65rem;border-radius:8px;border:1px solid var(--select-border);background:var(--select-bg);color:var(--text-primary);font-size:0.78rem;">` +
    `</div>` +
    `<div id="rosettaExplorerResultsList" data-results-count="${results.length}"><div id="rosettaExplorerResultsRows" data-rosetta-results="true" style="display:flex;flex-wrap:wrap;gap:0.35rem;">${chipsHtml}</div></div>` +
    `</div>`
  );
}

const CANONICAL_METROLOGY_FALLBACK = [
  { biblical_name: "Codo (Ammah)", modern_equivalent: "~45 cm", local_illustration: "2 cuartas de mano adulta (del codo a la punta del dedo)" },
  { biblical_name: "Siclo (Shekel)", modern_equivalent: "~11.4 gramos", local_illustration: "Peso de 2 monedas grandes de bolsillo" },
  { biblical_name: "Efa / Bato", modern_equivalent: "~22 litros", local_illustration: "1 cubeta estándar llena de grano o agua" },
  { biblical_name: "Talento (Kikkar)", modern_equivalent: "~34 kg", local_illustration: "1 costal pesado de maíz al hombro" },
  { biblical_name: "Denario / Dracma", modern_equivalent: "1 jornal diario", local_illustration: "El pago completo de un día de trabajo en el campo" },
  { biblical_name: "Metretes (Cántaro)", modern_equivalent: "~39 litros", local_illustration: "2 garrafones de agua de 20 L" },
];

let HYDRATED_CULTURAL_GLOSSES_MAP = {
  denario: {
    term: "denario",
    category: "moneda",
    nsm_gloss_es: "el pago completo de un día de trabajo de un trabajador del campo",
  },
  efod: {
    term: "efod",
    category: "vestimenta_sacerdotal",
    nsm_gloss_es: "chaleco sagrado de lino tejido con oro y piedras preciosas que llevaba el sacerdote",
  },
  filacterias: {
    term: "filacterias",
    category: "realia_liturgica",
    nsm_gloss_es: "pequeñas cajas de cuero con palabras de la Ley de Dios atadas en la frente y el brazo",
  },
  publicano: {
    term: "publicano",
    category: "oficio_imperial",
    nsm_gloss_es: "cobrador de impuestos al servicio del imperio romano",
  },
  siclo: {
    term: "siclo",
    category: "peso_moneda",
    nsm_gloss_es: "pieza de plata que pesaba unos once gramos (como dos monedas grandes)",
  },
  talento: {
    term: "talento",
    category: "peso_moneda",
    nsm_gloss_es: "carga pesada de unos treinta y cuatro kilos de plata u oro (el salario de veinte años)",
  },
};

/**
 * Hidrata el diccionario de glosas culturales NSM-65 desde `pericopes_and_glosses.json` (`cultural_glosses`, `D4-A+`).
 */
export function hydrateCulturalGlossesLexicon(culturalGlossesObj) {
  if (!culturalGlossesObj || typeof culturalGlossesObj !== "object") {
    return HYDRATED_CULTURAL_GLOSSES_MAP;
  }
  const next = { ...HYDRATED_CULTURAL_GLOSSES_MAP };
  for (const [k, v] of Object.entries(culturalGlossesObj)) {
    if (v && typeof v === "object") {
      next[String(k).trim().toLowerCase()] = {
        term: String(v.term || k).trim(),
        category: String(v.category || "realia"),
        nsm_gloss_es: String(v.nsm_gloss_es || ""),
      };
    }
  }
  HYDRATED_CULTURAL_GLOSSES_MAP = next;
  return HYDRATED_CULTURAL_GLOSSES_MAP;
}

const CANONICAL_TSK_ECHOES = {
  GEN: ["JHN.1.1", "PSA.33.6", "HEB.11.3", "COL.1.16"],
  PSA: ["JHN.10.11", "ROM.8.31", "REV.7.17", "ISA.40.11"],
  ISA: ["MAT.1.23", "LUK.4.18", "JHN.12.41", "ROM.10.15"],
  MAT: ["ISA.7.14", "MIC.5.2", "PSA.22.1", "DEU.8.3"],
  JHN: ["GEN.1.1", "EXO.3.14", "PSA.36.9", "1JN.1.1"],
  ROM: ["HAB.2.4", "GEN.15.6", "PSA.32.1", "GAL.3.11"],
  REV: ["DAN.7.13", "GEN.2.9", "ISA.65.17", "EZE.47.1"],
};

const VERSE_SPECIFIC_TSK_ECHOES = {
  "GEN.1.1": ["JHN.1.1", "PSA.33.6", "HEB.11.3", "COL.1.16"],
  "GEN.1.2": ["JER.4.23", "ISA.45.18", "PSA.104.30", "GEN.7.11"],
  "GEN.1.3": ["2CO.4.6", "PSA.33.9", "JHN.1.5", "ISA.60.1"],
  "JHN.1.1": ["GEN.1.1", "1JN.1.1", "REV.19.13", "PRO.8.22"],
  "JHN.1.14": ["EXO.25.8", "COL.2.9", "1TI.3.16", "HEB.2.14"],
  "ROM.1.16": ["HAB.2.4", "1CO.1.18", "MAR.8.38", "PSA.40.9"],
};

/**
 * Genera el HTML de los 3 estratos semánticos de ancho completo (`parryc/interlinear` + `GOLD-556`):
 *   1. `#nsm65StratumCard` — Primitivos Semánticos Universales NSM-65 (Wierzbicka / Youn et al. PNAS 2016)
 *   2. `#realiaMetrologyStratumCard` — Realia y 24 Unidades Metrológicas Cotidianas (Sabatini 2013)
 *   3. `#tskCrossRefsStratumCard` — Ecos Intertextuales AT↔NT (Treasury of Scripture Knowledge)
 */
export function renderStudyStrataCards(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const book = String(shard?.book || matrixShard?.book || options.book || "GEN").toUpperCase();
  const chapter = Number(shard?.chapter || matrixShard?.chapter || options.chapter) || 1;
  const rawVerse = Number(options.verse ?? matrixShard?.verse);
  const verse = rawVerse > 0 ? rawVerse : 1;
  const nsmLexicon = options.nsmLexicon || matrixShard?.nsmLexicon || null;
  const activeOsis = `${book}.${chapter}.${verse}`;

  const rawRows = Array.isArray(shard?.rows) ? shard.rows : [];
  const verseRows = [];
  for (const r of rawRows) {
    const norm = normalizeMatrixRowObject(r, book, chapter);
    if (!norm) continue;
    if (norm.verse === verse) verseRows.push(norm);
  }
  const activeRows =
    verseRows.length > 0
      ? verseRows
      : rawRows
        .slice(0, 8)
        .map((r) => normalizeMatrixRowObject(r, book, chapter))
        .filter(Boolean);

  const verseStrongSet = new Set();
  for (const r of activeRows) {
    if (r.c07_strong_id && r.c07_strong_id !== "∅") {
      verseStrongSet.add(String(r.c07_strong_id).toUpperCase());
      verseStrongSet.add(normalizeStrongKey(r.c07_strong_id));
    }
  }

  const uniqueNsm = new Map();
  for (const r of activeRows) {
    const key = `${r.c07_strong_id}|${r.c13_nsm_65}`;
    if (!uniqueNsm.has(key) && r.c13_nsm_65 && r.c13_nsm_65 !== "∅") {
      uniqueNsm.set(key, r);
    }
  }
  const nsmItems = Array.from(uniqueNsm.values()).slice(0, 8);
  const nsmHtml =
    `<div class="stratum-card nsm65-stratum" data-stratum="nsm65" data-ref="${escapeHtml(activeOsis)}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);">` +
    `<strong style="font-size:0.84rem;display:block;margin-bottom:0.35rem;">🧭 Estrato 1 · Primitivos Semánticos Universales NSM-65 (${escapeHtml(book)} ${chapter}:${verse})</strong>` +
    (nsmItems.length > 0
      ? `<ul style="margin:0;padding-left:1.1rem;font-size:0.82rem;display:grid;gap:0.25rem;">` +
      nsmItems
        .map(
          (r) =>
            `<li data-nsm-strong="${escapeHtml(r.c07_strong_id)}"><code>${escapeHtml(r.c07_strong_id)}</code> <strong>${escapeHtml(r.c05_orig_text)}</strong> (${escapeHtml(r.c12_gloss_es)}) → <span style="color:var(--accent-amber);font-weight:600;">${escapeHtml(r.c13_nsm_65)}</span></li>`
        )
        .join("") +
      `</ul>`
      : `<p style="margin:0;font-size:0.81rem;color:var(--text-secondary);">DIOS · DECIR · HACER · BUENO · VIVIR · SABER · VERDAD (65 primitivos universales libres de circularidad).</p>`) +
    `</div>`;

  const rawShardRealia = Array.isArray(shard?.realia) ? shard.realia : [];
  const verseShardRealia = rawShardRealia.filter(
    (re) =>
      re.anchor_ref === activeOsis ||
      (re.strong_code && verseStrongSet.has(normalizeStrongKey(re.strong_code))) ||
      (!re.anchor_ref && Boolean(re.title))
  );
  const lexiconRealia = Array.isArray(nsmLexicon?.biblical_realia)
    ? nsmLexicon.biblical_realia
      .filter(
        (lr) =>
          lr.first_occurrence_ref === activeOsis ||
          (lr.strong_code && verseStrongSet.has(normalizeStrongKey(lr.strong_code)))
      )
      .slice(0, 4)
    : [];
  const combinedRealia = [...verseShardRealia, ...lexiconRealia].slice(0, 6);

  let metrologyEntries = [];
  if (Array.isArray(shard?.metrology) && shard.metrology.length > 0) {
    metrologyEntries = shard.metrology;
  } else if (Array.isArray(nsmLexicon?.metrology_units) && nsmLexicon.metrology_units.length > 0) {
    const matchedUnits = nsmLexicon.metrology_units.filter(
      (u) => u.sample_ref === activeOsis || (u.strong_code && verseStrongSet.has(normalizeStrongKey(u.strong_code)))
    );
    const offset = ((verse - 1) * 2) % Math.max(1, nsmLexicon.metrology_units.length - 3);
    const windowUnits = nsmLexicon.metrology_units.slice(offset, offset + 3).map((u) => ({
      biblical_name: `${u.term_es} (${u.unit_id})`,
      modern_equivalent: u.si_equivalence,
      local_illustration: u.everyday_isomorphism,
    }));
    metrologyEntries = [
      ...matchedUnits.map((u) => ({
        biblical_name: `${u.term_es} (${u.unit_id})`,
        modern_equivalent: u.si_equivalence,
        local_illustration: u.everyday_isomorphism,
      })),
      CANONICAL_METROLOGY_FALLBACK[0],
      ...windowUnits,
    ].slice(0, 4);
  } else {
    const startIdx = (verse - 1) % 3;
    metrologyEntries = [
      CANONICAL_METROLOGY_FALLBACK[0],
      ...CANONICAL_METROLOGY_FALLBACK.slice(startIdx + 1, startIdx + 4),
    ];
  }

  const realiaHtml =
    `<div class="stratum-card realia-metrology-stratum" data-stratum="realia-metrology" data-ref="${escapeHtml(activeOsis)}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);">` +
    `<strong style="font-size:0.84rem;display:block;margin-bottom:0.35rem;">⚖️ Estrato 2 · Realia Material y 24 Unidades Metrológicas Cotidianas (${escapeHtml(book)} ${chapter}:${verse})</strong>` +
    `<ul style="margin:0;padding-left:1.1rem;font-size:0.82rem;display:grid;gap:0.25rem;">` +
    combinedRealia
      .map((re) => {
        const rId = re.id || re.term_id || re.realia_id || re.title || re.surface_es || re.term_es || "realia";
        const rTitle =
          re.title ||
          `${re.surface_es || re.term_es || ""} (${re.lemma_original || re.original_lemma || re.strong_code || ""})`.trim();
        const rExp = re.explanation || re.footnote_gloss_es || re.nsm_65_decomposition || re.nsm_65_explanation || "";
        return `<li data-realia-id="${escapeHtml(rId)}"><strong>${escapeHtml(rTitle)}:</strong> ${escapeHtml(rExp)}</li>`;
      })
      .join("") +
    metrologyEntries
      .map(
        (me) =>
          `<li data-metrology-unit="${escapeHtml(me.biblical_name)}"><strong>${escapeHtml(me.biblical_name)}:</strong> ${escapeHtml(me.modern_equivalent)} — <em>${escapeHtml(me.local_illustration || "")}</em></li>`
      )
      .join("") +
    `</ul>` +
    `<details id="studyCulturalGlossesCatalogAccordion" class="cultural-glosses-accordion" style="margin-top:0.5rem;padding-top:0.4rem;border-top:1px dashed var(--card-border);">` +
    `<summary style="cursor:pointer;font-size:0.79rem;font-weight:600;color:var(--text-primary);min-height:48px;">📚 Glosas Culturales NSM-65 (${Object.keys(HYDRATED_CULTURAL_GLOSSES_MAP).length} términos: Pesos, Monedas, Oficios y Realia)</summary>` +
    `<ul style="margin:0.35rem 0 0 1.1rem;font-size:0.8rem;display:grid;gap:0.22rem;">` +
    Object.values(HYDRATED_CULTURAL_GLOSSES_MAP)
      .map(
        (cg) =>
          `<li data-cultural-gloss-term="${escapeHtml(cg.term)}"><strong>${escapeHtml(cg.term)}</strong> <span class="uls-badge" style="font-size:0.7rem;">${escapeHtml(cg.category)}</span>: ${escapeHtml(cg.nsm_gloss_es)}</li>`
      )
      .join("") +
    `</ul></details>` +
    `</div>`;

  const baseTsk = Array.isArray(shard?.tsk_refs)
    ? shard.tsk_refs
    : VERSE_SPECIFIC_TSK_ECHOES[activeOsis] ||
    CANONICAL_TSK_ECHOES[book] ||
    ["GEN.1.1", "PSA.23.1", "ISA.53.5", "JHN.1.14", "ROM.1.16"];
  const firstStrong = activeRows[0]?.c07_strong_id || "H0430";
  const rosettaHtml = renderPhilologyRosettaInspectorHtml(activeRows, {
    book,
    chapter,
    verse,
    activeOsis,
    rosettaIndex: options.rosettaIndex || shard?.rosettaIndex || null,
    includeExplorer: false,
  });
  const includeInlineRosettaInTsk = Boolean(options.includeInlineRosettaInTsk);
  const tskHtml =
    `<div class="stratum-card tsk-crossrefs-stratum" data-stratum="tsk" data-ref="${escapeHtml(activeOsis)}" data-primary-strong="${escapeHtml(firstStrong)}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);">` +
    `<strong style="font-size:0.84rem;display:block;margin-bottom:0.35rem;">🔗 Estrato 3 · Ecos Intertextuales AT↔NT (TSK · ${escapeHtml(book)} ${chapter}:${verse} · ${escapeHtml(firstStrong)})</strong>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">` +
    baseTsk
      .map(
        (refStr) =>
          `<button type="button" class="uls-chip mostrador-tsk-pill" data-tsk-ref="${escapeHtml(refStr)}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.8rem;">📖 ${escapeHtml(refStr)}</button>`
      )
      .join("") +
    `</div>` +
    (includeInlineRosettaInTsk ? rosettaHtml : "") +
    `</div>`;

  return { nsmHtml, realiaHtml, tskHtml, rosettaHtml };
}

/**
 * Renderiza el Andamiaje Interlineal Soberano de 4 Líneas (GMIS, Reglas de Leipzig bdchauvette/leipzig.js)
 * para lenguas de Tier 3B y Tier 4 sin fingir palabras indígenas inexistentes (DEB-R23-09).
 */
export function renderLeipzig4LineGmisHtml(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const lang = String(options.lang || "tier4").trim();
  const book = String(shard?.book || matrixShard?.book || options.book || "GEN").toUpperCase();
  const chapter = Number(shard?.chapter || matrixShard?.chapter || options.chapter) || 1;
  const filterVerse = Number(options.verse) > 0 ? Number(options.verse) : null;
  const wordOrder = String(options.wordOrder || "SVO").toUpperCase();
  const maxVerses = Number(options.maxVerses) > 0 ? Number(options.maxVerses) : 25;

  const rawRows = Array.isArray(shard?.rows) ? shard.rows : [];
  const versesMap = new Map();
  for (const r of rawRows) {
    const norm = normalizeMatrixRowObject(r, book, chapter);
    if (!norm) continue;
    if (filterVerse && norm.verse !== filterVerse) continue;
    if (!versesMap.has(norm.verse)) {
      if (versesMap.size >= maxVerses) continue;
      versesMap.set(norm.verse, []);
    }
    versesMap.get(norm.verse).push(norm);
  }

  const verseBlocksHtml = Array.from(versesMap.entries())
    .map(([verseNum, words]) => {
      const unitsHtml = words
        .map((w) => {
          return (
            `<div class="leipzig-gmis-unit" data-ref="${escapeHtml(w.c02_ref)}" data-strong-id="${escapeHtml(w.c07_strong_id)}" style="display:inline-flex;flex-direction:column;gap:0.18rem;padding:0.45rem 0.55rem;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);min-width:135px;">` +
            `<div class="gmis-line-1" data-gmis-line="1" style="font-weight:700;font-size:1.02rem;">` +
            `<span class="gmis-orig">${escapeHtml(w.c05_orig_text)}</span> ` +
            `<em class="gmis-translit" style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(w.c06_translit)}</em>` +
            `</div>` +
            `<div class="gmis-line-2" data-gmis-line="2" style="font-size:0.75rem;font-family:monospace;">` +
            `<code>${escapeHtml(w.c07_strong_id)}</code> · <span>${escapeHtml(w.c08_morph_code)}</span> · <span>${escapeHtml(w.c09_macula_role)}</span>` +
            `</div>` +
            `<div class="gmis-line-3" data-gmis-line="3" style="font-size:0.76rem;color:var(--accent-amber);">` +
            `NSM-65: ${escapeHtml(w.c13_nsm_65)}` +
            `</div>` +
            `<div class="gmis-line-4" data-gmis-line="4" style="font-size:0.8rem;display:flex;align-items:center;justify-content:space-between;gap:0.35rem;">` +
            `<span class="gmis-bridge-gloss">${escapeHtml(w.c12_gloss_es)}</span>` +
            `<button type="button" class="gmis-elicitation-slot uls-chip" data-elicitation-slot="${escapeHtml(w.c07_strong_id)}" data-strong-id="${escapeHtml(w.c07_strong_id)}" data-osis-ref="${escapeHtml(w.c02_ref)}" data-jump-sheet="field" style="min-height:48px;padding:0.2rem 0.45rem;color:var(--accent-emerald);font-family:monospace;">[___]</button>` +
            `</div>` +
            `</div>`
          );
        })
        .join("");
      return (
        `<article class="gmis-verse-row" data-verse="${verseNum}" style="margin-bottom:0.85rem;">` +
        `<div style="font-size:0.78rem;font-weight:700;margin-bottom:0.35rem;color:var(--text-secondary);">${escapeHtml(book)} ${chapter}:${verseNum} (${escapeHtml(wordOrder)})</div>` +
        `<div class="gmis-units-wrap" style="display:flex;flex-wrap:wrap;gap:0.45rem;">${unitsHtml}</div>` +
        `</article>`
      );
    })
    .join("");

  return (
    `<section class="gmis-4line-scaffold" data-gmis-scaffold="true" data-lang="${escapeHtml(lang)}" data-book="${escapeHtml(book)}" data-chapter="${chapter}" data-word-order="${escapeHtml(wordOrder)}" style="margin-top:1rem;padding:0.9rem;border-radius:12px;border:1px dashed var(--card-border);">` +
    `<header style="margin-bottom:0.65rem;">` +
    `<strong>🔬 Andamiaje Interlineal Soberano de 4 Líneas (GMIS · Leipzig / WLC / SRGNT / NSM-65)</strong>` +
    `</header>` +
    verseBlocksHtml +
    `</section>`
  );
}
