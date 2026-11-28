import { renderDiglossicParallelBridge, resolveRegionalBridgeLanguage21 } from "./bridge_and_chapter.js";
export { renderDiglossicParallelBridge, resolveRegionalBridgeLanguage21 };
// Gaveta bajo demanda: Estudio Palabra por Palabra de 15 Columnas (col01..col15), Realia, NSM y Atribución CC BY 4.0.
// Ekovoz Mostrador Ronda 20 — Cero dependencias de Node.js, cero relleno sintético.

import { MATRIX_ROW_COLUMNS } from "./data_layer.js";
import {
  aggregateBlindCalibration12Langs,
  detectContextualCulturalGlossesForVerse,
  getHydratedCulturalGlossesMap,
  hydrateCulturalGlossesLexicon,
  hydratePhilologyRosettaIndex,
  renderPhilologyRosettaExplorerHtml,
  renderPhilologyRosettaInspectorHtml,
  renderPhilologyRosettaResultsRowsHtml,
  resolveBicanonicalDivergence,
  resolveConsonantalRootFamily,
  resolveKetivQereResiduals,
  resolveLxxMtCognateBridge,
  resolveParatextEngOrgMapping,
  searchPhilologyRosettaIndex,
} from "./estudio_rosetta_and_realia.js";
import {
  CANONICAL_5_RESIDUAL_KINDS,
  CANONICAL_TSK_ECHOES,
  NSM_ES_TO_EN_PHRASES,
  PHILOLOGY_ROSETTA_DEFAULT_INDEX,
  SDBH_HIERARCHICAL_PREFIXES,
  SEMANTIC_TAG_GLOSSARY,
  VERSE_SPECIFIC_TSK_ECHOES
} from "./estudio_schemas.js";
import { humanizeUiCopy } from "./human_labels.js";
import { formatNonEmptyCoreMeaning, partitionContentAndFunctionRows, resolveDefaultStrongForPassage, resolveTestamentRegime, selectPrimaryLexicalToken } from "./study_verse_viewmodel.js";
export {
  aggregateBlindCalibration12Langs, CANONICAL_5_RESIDUAL_KINDS, detectContextualCulturalGlossesForVerse, hydrateCulturalGlossesLexicon, hydratePhilologyRosettaIndex, PHILOLOGY_ROSETTA_DEFAULT_INDEX, renderPhilologyRosettaExplorerHtml, renderPhilologyRosettaInspectorHtml, renderPhilologyRosettaResultsRowsHtml, resolveBicanonicalDivergence, resolveConsonantalRootFamily, resolveKetivQereResiduals, resolveLxxMtCognateBridge, resolveParatextEngOrgMapping, searchPhilologyRosettaIndex
};

const DEFAULT_ATTRIBUTION =
  "STEPBible TAHOT/TAGNT (Tyndale House, CC BY 4.0) · Clear Bible Macula Hebrew/Greek (CC BY 4.0) · OpenScriptures WLC / CenterBLR SRGNT · Ekovoz NSM-65";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeMatrixRowObject(row, book = "GEN", chapter = 1, fallbackWordPos = 1) {
  if (!row) return null;
  if (Array.isArray(row)) {
    // Contrato auto-descriptivo 15-campos `MATRIX_ROW_COLUMNS` (`ekovoz.matrix_tier0.ekpack.v4`, `D3-V2F`):
    // [0:verse, 1:c03_surface, 2:c04_lemma, 3:c05_strong, 4:c06_morph, 5:c07_domain, 6:c08_en, 7:c09_es,
    //  8:c10_syntax, 9:c11_discourse, 10:c12_pragmatic, 11:c13_nsm65, 12:c14_realia, 13:c02_word_pos, 14:c06_translit]
    if (row.length >= 13 && row.length <= MATRIX_ROW_COLUMNS.length) {
      const verseNum = Number(row[0]) || 1;
      const strongRaw = String(row[3] || "∅");
      const wordPos =
        row.length >= 14 && Number(row[13]) > 0
          ? Number(row[13])
          : Math.max(1, Number(fallbackWordPos) || 1);
      const translit =
        row.length >= 15 && row[14] && row[14] !== "∅" ? String(row[14]) : String(row[2] ?? "∅");
      const c10Syntax = String(row[8] ?? "∅");
      const c12Pragmatic = String(row[10] ?? "∅");
      return {
        verse: verseNum,
        c01_ordinal_31102: verseNum,
        c02_ref: `${book}.${chapter}.${verseNum}`,
        c03_source_corpus: strongRaw.startsWith("G") ? "SRGNT" : "WLC",
        c04_word_pos: wordPos,
        c04_lemma: row[2] ?? "∅",
        c05_orig_text: row[1] ?? "∅",
        c06_translit: translit,
        c07_strong_id: strongRaw,
        c08_morph_code: row[4] ?? "∅",
        c08_gloss_en: row[6] ?? "∅",
        c09_macula_role: c12Pragmatic.startsWith("MACULA:") ? c12Pragmatic : c10Syntax,
        c10_clause_id: c10Syntax,
        c11_semantic_domain: row[5] ?? "∅",
        c11_discourse_speech_act: row[9] ?? "∅",
        c12_gloss_es: row[7] ?? "∅",
        c12_pragmatic_focus: c12Pragmatic,
        c13_nsm_65: row[11] ?? "∅",
        c14_target_gloss: row[6] ?? "∅",
        c14_realia_flag: row[12] ?? "∅",
      };
    }
  }
  const verseNum = Number(row.verse) || Number(String(row.c02_ref || "").split(".")[2]) || 1;
  return {
    verse: verseNum,
    c01_ordinal_31102: row.c01_ordinal_31102 ?? verseNum,
    c02_ref: row.c02_ref || `${book}.${chapter}.${verseNum}`,
    c03_source_corpus: row.c03_source_corpus ?? "∅",
    c04_word_pos: row.c04_word_pos ?? Math.max(1, Number(fallbackWordPos) || 1),
    c04_lemma: row.c04_lemma ?? row.c06_translit ?? "∅",
    c05_orig_text: row.c05_orig_text ?? "∅",
    c06_translit: row.c06_translit ?? row.c04_lemma ?? "∅",
    c07_strong_id: row.c07_strong_id ?? "∅",
    c08_morph_code: row.c08_morph_code ?? "∅",
    c09_macula_role: row.c09_macula_role ?? "∅",
    c10_clause_id: row.c10_clause_id ?? "∅",
    c11_semantic_domain: row.c11_semantic_domain ?? "∅",
    c11_discourse_speech_act: row.c11_discourse_speech_act ?? row.c10_clause_id ?? "∅",
    c12_gloss_es: row.c12_gloss_es ?? "∅",
    c12_pragmatic_focus: row.c12_pragmatic_focus ?? "∅",
    c13_nsm_65: row.c13_nsm_65 ?? "∅",
    c14_target_gloss: row.c14_target_gloss ?? "∅",
    c14_realia_flag: row.c14_realia_flag ?? row.c14_target_gloss ?? "∅",
  };
}

function normalizeStrongKey(code) {
  const raw = String(code || "").trim().toUpperCase();
  const m = raw.match(/^([HG])0*(\d+)$/);
  if (!m) return raw;
  return `${m[1]}${m[2].padStart(4, "0")}`;
}

export function classifyMaculaArgumentRole(roleRaw, morphRaw = "") {
  const r = String(roleRaw || "").trim();
  const m = String(morphRaw || "").trim();
  if (/^(A0|s|subj|agent)/i.test(r)) return "A0";
  if (/^(A1|o|obj|pat|patient)/i.test(r)) return "A1";
  if (/^(v|vc|pred|verb)/i.test(r) || /^HV|^V-/.test(m)) return "V";
  return "MOD";
}

export function decodeSdbhHierarchicalCode(rawTag, uiLocale = "es") {
  const isEn = !String(uiLocale || "es").trim().toLowerCase().startsWith("es");
  const raw = String(rawTag || "").trim();
  const strongBadges = [];
  for (const m of raw.matchAll(/\[([HG]\d{3,5}(?:\+[HG]\d{3,5})*)\]/gi)) {
    for (const code of m[1].split("+")) {
      const norm = code.trim().toUpperCase();
      if (norm && !strongBadges.includes(norm)) strongBadges.push(norm);
    }
  }
  const withoutStrong = raw.replace(/\[[HG]\d{3,5}(?:\+[HG]\d{3,5})*\]/gi, "").replace(/\|\s*CLICS3:[^|]+/gi, "").trim();
  const labels = [];
  for (const m of withoutStrong.matchAll(/(?:SDBH:)?(\d{6,15})/gi)) {
    const digits = m[1];
    const matched = SDBH_HIERARCHICAL_PREFIXES.find(([prefix]) => digits.startsWith(prefix));
    const resolved = matched ? (isEn ? matched[2] : matched[1]) : (isEn ? "SDBH lexical domain" : "Dominio léxico SDBH");
    if (!labels.includes(resolved)) labels.push(resolved);
  }
  return { label: labels.slice(0, 3).join(" · "), strongBadges };
}

/**
 * Traduce composicionalmente fórmulas de los 65 primitivos semánticos universales de Wierzbicka (`NSM-65`)
 * de español a inglés cuando `uiLocale !== "es"`, limpiando códigos `SDBH` y sufijos `[Hxxxx]` (`D2-R45`).
 */
export function translateNsm65PrimePhrase(spanishFormula, uiLocale = "es") {
  const isEs = String(uiLocale || "es").trim().toLowerCase().startsWith("es");
  let cleaned = String(spanishFormula || "")
    .replace(/\[[HG]\d{3,5}(?:\+[HG]\d{3,5})*\]/gi, "")
    .replace(/\|\s*CLICS3:[^|]+/gi, "")
    .replace(/^(?:NSM_65:)?(?:SDBH:[\d,+]+(?:\+SDBH:[\d,+]+)*\|?)?/i, "")
    .replace(/\|?PRIM:/gi, " | ")
    .replace(/(?:NSM_65:)?SDBH:[\d,+]+/gi, "")
    .trim();

  const segments = cleaned
    .split(/[|+]+/)
    .map((s) => s.trim())
    .filter((s) => s && !SEMANTIC_TAG_SILENT.has(s.toUpperCase()));
  if (segments.length === 0) return "";

  const normalizedEs = [...new Set(segments)].join(" · ");
  if (isEs) return normalizedEs;

  let translated = normalizedEs.toUpperCase();
  for (const [esPhrase, enPhrase] of NSM_ES_TO_EN_PHRASES) {
    const escaped = esPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    translated = translated.replace(new RegExp(`(^|[^A-ZÁÉÍÓÚÜÑ])${escaped}(?=$|[^A-ZÁÉÍÓÚÜÑ])`, "g"), `$1${enPhrase}`);
  }
  return translated.replace(/\s+/g, " ").trim();
}

const SEMANTIC_TAG_SILENT = new Set(["VOICE:∅", "UNIVERSAL_TRANSPARENT:NONE", "∅", "MACULA:∅", "EVID:∅"]);

/**
 * Traduce una etiqueta compuesta (`MACULA:A1_PATIENT|EVID:DIRECT_SENSORY` o `NSM_65:SDBH:002003003004...`)
 * a lenguaje humano en `uiLocale`, sin filtrar códigos numéricos crudos ni sufijos `[Hxxxx]`.
 */
export function humanizeSemanticTagChain(rawTag, uiLocale = "es") {
  const isEn = !String(uiLocale || "es").trim().toLowerCase().startsWith("es");
  const cleanedRaw = String(rawTag || "")
    .replace(/\[[HG]\d{3,5}(?:\+[HG]\d{3,5})*\]/gi, "")
    .replace(/\|\s*CLICS3:[^|]+/gi, "");
  const parts = cleanedRaw
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !SEMANTIC_TAG_SILENT.has(p.toUpperCase()));
  const human = [];
  for (const p of parts) {
    if (/^PRIM:/i.test(p)) {
      const primeText = translateNsm65PrimePhrase(p, uiLocale);
      if (primeText) human.push(primeText);
      continue;
    }
    if (/(?:^|:|\+)SDBH:\d{6,15}/i.test(p) || /^\d{6,15}$/.test(p)) {
      const decoded = decodeSdbhHierarchicalCode(p, uiLocale);
      if (decoded.label) human.push(decoded.label);
      continue;
    }
    const funcMatch = /^FUNC:([a-z0-9_-]+)$/i.exec(p);
    if (funcMatch) {
      const fMap = {
        conj: ["Conjunción", "Conjunction"],
        rel: ["Conector relativo", "Relative connector"],
        det: ["Artículo", "Article"],
        prep: ["Preposición", "Preposition"],
        part: ["Partícula", "Particle"],
        pron: ["Pronombre", "Pronoun"],
        adv: ["Adverbio", "Adverb"],
        interj: ["Interjección", "Interjection"],
      };
      const mapped = fMap[funcMatch[1].toLowerCase()];
      human.push(mapped ? (isEn ? mapped[1] : mapped[0]) : funcMatch[1]);
      continue;
    }
    const key = p.toUpperCase().replace(/\s+/g, "_").replace(/^NSM_65:/, "");
    const hit = SEMANTIC_TAG_GLOSSARY[key];
    if (hit) {
      human.push(isEn ? hit[1] : hit[0]);
      continue;
    }
    if (!isEn === false && /[ÁÉÍÓÚÑ]|\b(?:ALGUIEN|ALGO|PERSONAS|LUGAR|TIEMPO|HACER|DECIR|VIVIR)\b/.test(p)) {
      const primeEn = translateNsm65PrimePhrase(p, uiLocale);
      if (primeEn) {
        human.push(primeEn);
        continue;
      }
    }
    const bare = p
      .replace(/^(?:NSM_65:)?(?:SDBH|LN|MACULA|EVID|VOICE|PRIM):/i, "")
      .replace(/_/g, " ")
      .trim()
      .toLowerCase();
    if (bare) human.push(bare.charAt(0).toUpperCase() + bare.slice(1));
  }
  return [...new Set(human.filter(Boolean))].join(" · ");
}

function formatNsmSentenceCase(raw) {
  const clean = String(raw || "").trim();
  if (!clean || clean === "∅") return "∅";
  if (!/[A-ZÁÉÍÓÚÜÑ]{2,}/.test(clean)) return clean;
  const lower = clean.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Compuerta estricta de clase cerrada (`D6-R12`): detecta `FUNC:*` o morfología cerrada antes de `LN:23`. */
export function isClosedClassFunctionTag(rawDomain = "", rawRole = "", rawMorph = "", rawNsm = "") {
  if (/\bFUNC:[a-z0-9_-]+/i.test(`${rawDomain} ${rawRole} ${rawNsm}`)) return true;
  const morph = String(rawMorph || "").trim();
  return /^(?:C|P|D|T|COND|CONJ|PREP|DET|PART|PRON|INTERJ)(?:-|$)/i.test(morph) || /^(?:H[CRDT]|HC|HR|HT)/.test(morph);
}

/** Guardia semántica Louw-Nida (`D3-R10` + `D6-R12`): prioriza `FUNC:*` antes de `LN:23.46..60`. */
function resolveCoherentNsm65ForDomain(rawDomain = "", rawNsm = "", uiLocale = "es", row = null) {
  const isEn = !String(uiLocale || "es").trim().toLowerCase().startsWith("es");
  const dLow = String(rawDomain || "").toLowerCase(), nsmLow = String(rawNsm || "").toLowerCase();
  const roleRaw = row ? String(row.c09_macula_role || "") : "", morphRaw = row ? String(row.c08_morph_code || "") : "";
  const ln23Match = /\bln:23\.(\d+)/i.exec(dLow);
  if (isClosedClassFunctionTag(rawDomain, roleRaw, morphRaw, rawNsm)) {
    if (ln23Match || /\bln:89\./i.test(dLow) || nsmLow.includes("alimento") || nsmLow.includes("nacimiento")) {
      return isEn ? "Grammatical function link" : "Palabra de enlace gramatical";
    }
    if (/\bFUNC:[a-z0-9_-]+/i.test(rawNsm)) return humanizeSemanticTagChain(rawNsm, uiLocale) || (isEn ? "Grammatical function link" : "Palabra de enlace gramatical");
    const funcSrc = `${rawDomain}|${roleRaw}`.split("|").filter((s) => /\bFUNC:/i.test(s)).join("|");
    if (funcSrc) return humanizeSemanticTagChain(funcSrc, uiLocale) || (isEn ? "Grammatical function link" : "Palabra de enlace gramatical");
  }
  const strongNorm = String(row?.c07_strong_id || row?.strong || "").trim().toUpperCase().replace(/^([HG])0+/, "$1");
  if (ln23Match) {
    const sub = Number(ln23Match[1]) || 0;
    if (sub >= 46 && sub <= 60) {
      if (strongNorm === "G1064") {
        return isEn ? "Womb, conception, and birth of new life" : "Vientre materno: nacimiento, gestación y vida nueva";
      }
      if (strongNorm === "G2192") {
        return isEn ? "Pregnancy: carrying new life within" : "Encinta: llevar vida nueva en el vientre";
      }
      if (strongNorm === "G5088") {
        return isEn ? "Childbirth: giving birth to a child" : "Alumbramiento: dar a luz a un hijo";
      }
      if (!rawNsm || rawNsm === "∅" || nsmLow.includes("alimento")) {
        return isEn ? "Birth, pregnancy, and new life coming into the world" : "Nacimiento, gestación y vida nueva que viene al mundo";
      }
    }
    if (sub >= 61 && sub <= 112 && nsmLow.includes("alimento")) return isEn ? "Vital process of breathing, sleeping, living, or dying" : "Proceso vital de respirar, dormir, vivir o morir";
    if (sub >= 113 && nsmLow.includes("alimento")) return isEn ? "Health, strength, or healing of the human body" : "Salud, fuerza o sanidad del cuerpo humano";
  }
  if (/\bln:89\./i.test(dLow) && nsmLow.includes("tiempo cuando hay luz")) return isEn ? "Logical link joining words or ideas in speech" : "Relación lógica que une palabras o ideas en el discurso";
  if (/\bln:33(?:\.\d+)?\b/i.test(dLow)) {
    if (strongNorm === "G2564" || /^(?:V|HV)(?:-|$)/i.test(morphRaw)) {
      return isEn ? "To call or give a name to someone" : "Llamar o poner nombre a alguien";
    }
    if (strongNorm === "G3686" || /^(?:N|HN)(?:-|$)/i.test(morphRaw)) {
      return isEn ? "Proper name by which someone is known" : "Nombre propio con que se conoce a alguien";
    }
  }
  return "";
}

/**
 * Humaniza las columnas técnicas de la Matriz de 15 Columnas (`col01..col15`, `D4-R39` / `D2-R45`),
 * decodificando taxonomías `SDBH` de 12 dígitos, separando insignias `[Hxxxx]` y traduciendo `NSM-65`.
 */
export function formatHumanReadable15ColFields(row = {}, uiLocale = "es") {
  const isEn = !String(uiLocale || "es").trim().toLowerCase().startsWith("es");
  const rawRole = String(row.c09_macula_role || "").trim();
  const rawClause = String(row.c10_clause_id || "").trim();
  const rawDomain = String(row.c11_semantic_domain || "").trim();
  const rawNsm = String(row.c13_nsm_65 || "").trim();

  const decodedDomain = decodeSdbhHierarchicalCode(rawDomain, uiLocale);
  const decodedNsm = decodeSdbhHierarchicalCode(rawNsm, uiLocale);
  const strongBadges = [...new Set([...decodedDomain.strongBadges, ...decodedNsm.strongBadges])];

  const roleHuman = !rawRole || rawRole === "∅" ? (isEn ? "Lexical core" : "Núcleo léxico") : rawRole;
  const clauseHuman = !rawClause || rawClause === "∅" ? "C1" : rawClause;
  const domainHuman = humanizeSemanticTagChain(rawDomain, uiLocale) || decodedDomain.label || "General";

  let nsmCandidate = resolveCoherentNsm65ForDomain(rawDomain, rawNsm, uiLocale, row);
  if (!nsmCandidate) {
    if (/PRIM:/i.test(rawNsm)) {
      nsmCandidate = translateNsm65PrimePhrase(rawNsm.slice(rawNsm.search(/PRIM:/i)), uiLocale);
    } else {
      nsmCandidate = humanizeSemanticTagChain(rawNsm, uiLocale);
    }
  }
  const nsmHuman = nsmCandidate || "∅";
  return { roleHuman, clauseHuman, domainHuman, nsmHuman, strongBadges };
}

export function renderStudy14ColDrawerHtml(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const uiLocale = String(options.uiLocale || options.locale || shard?.uiLocale || "es").trim().toLowerCase();
  const isEn = uiLocale.startsWith("en");
  const book = String(shard?.book || matrixShard?.book || options.book || "GEN").toUpperCase();
  const chapter = Number(shard?.chapter || matrixShard?.chapter || options.chapter) || 1;
  const filterStrongId = (options.strongId || matrixShard?.strongId)
    ? String(options.strongId || matrixShard?.strongId).trim().toUpperCase()
    : "";
  const scope = String(options.scope || matrixShard?.scope || "verse").toLowerCase();
  const rawVerse = Number(options.verse ?? matrixShard?.verse);
  const filterVerse = scope === "chapter" ? null : rawVerse > 0 ? rawVerse : null;
  const maxRows =
    Number(options.maxRows) > 0
      ? Number(options.maxRows)
      : scope === "chapter" || scope === "gmis"
        ? Number.POSITIVE_INFINITY
        : 240;

  const rawRows = Array.isArray(shard?.rows) ? shard.rows : [];
  const normalizedRows = [];
  const wordPosByVerse = new Map();
  for (const r of rawRows) {
    const vHint = Array.isArray(r) ? Number(r[0]) || 1 : Number(r?.verse) || 1;
    const nextPos = (wordPosByVerse.get(vHint) || 0) + 1;
    wordPosByVerse.set(vHint, nextPos);
    const norm = normalizeMatrixRowObject(r, book, chapter, nextPos);
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
  const rawBicanon = resolveBicanonicalDivergence(
    book,
    chapter,
    activeVerseNum,
    options.rosettaIndex || shard?.rosettaIndex || null,
  );
  const bicanon = resolveTestamentRegime(book, chapter, activeVerseNum, rawBicanon, uiLocale);
  const wordSummaryText = isEn
    ? `${normalizedRows.length} of ${rawRows.length} words`
    : `${normalizedRows.length} de ${rawRows.length} palabras`;
  const scopeVerseLabel = isEn
    ? `Current verse (v. ${activeVerseNum})`
    : `Versículo actual (v. ${activeVerseNum})`;
  const scopeChapterLabel = isEn
    ? `Full chapter (${rawRows.length})`
    : `Capítulo completo (${rawRows.length})`;
  const scopeGmisLabel = isEn
    ? `4-Line Scaffolding`
    : `Andamiaje en 4 Líneas`;
  const scopeBarHtml =
    `<div class="study-scope-bar" role="group" aria-label="${isEn ? "Interlinear Matrix Scope" : "Alcance de Matriz Interlineal"}">` +
    `<span class="study-scope-summary">${escapeHtml(book)} ${chapter}${isVerseScope || isGmisScope ? `:${activeVerseNum}` : ""} · ${wordSummaryText}</span>` +
    `<span class="uls-badge bicanonical-badge" data-bicanonical-regime="${escapeHtml(bicanon.regime)}" data-bicanonical-mt="${escapeHtml(bicanon.mtRef)}" data-bicanonical-occidental="${escapeHtml(bicanon.occidentalRef)}">⚖️ ${escapeHtml(bicanon.label)}</span>` +
    `<div class="study-scope-actions">` +
    `<button type="button" class="uls-chip study-scope-btn" data-study-scope="verse" aria-pressed="${isVerseScope ? "true" : "false"}" data-i18n="study.scope.verse">${scopeVerseLabel}</button>` +
    `<button type="button" class="uls-chip study-scope-btn" data-study-scope="chapter" aria-pressed="${isChapterScope ? "true" : "false"}" data-i18n="study.scope.chapter">${scopeChapterLabel}</button>` +
    `<button type="button" class="uls-chip study-scope-btn" data-study-scope="gmis" aria-pressed="${isGmisScope ? "true" : "false"}" data-i18n="study.scope.gmis">${scopeGmisLabel}</button>` +
    `</div></div>`;

  const activeStrongTarget = String(options.activeStrongId || "").trim().toUpperCase();
  const studyTargetLang = String(options.lang || shard?.lang || "").trim().toLowerCase();
  const wordCardsHtml = normalizedRows
    .map((r) => {
      const maculaFrame = classifyMaculaArgumentRole(r.c09_macula_role, r.c08_morph_code);
      const human = formatHumanReadable15ColFields(r, uiLocale);
      const nsmDisplay = formatNsmSentenceCase(human.nsmHuman);
      const rawTarget = String(r.c14_target_gloss || "").trim();
      const suppressVisibleTarget =
        !rawTarget ||
        rawTarget === "∅" ||
        rawTarget === r.c12_gloss_es ||
        (!isEn && (studyTargetLang === "" || studyTargetLang === "es" || studyTargetLang === "es-1909" || studyTargetLang === "en"));
      const isStrongSelected =
        Boolean(activeStrongTarget) &&
        String(r.c07_strong_id || "").trim().toUpperCase() === activeStrongTarget;
      return (
        `<article class="leipzig-14col-card${isStrongSelected ? " is-active-strong" : ""}" tabindex="0" aria-selected="${isStrongSelected ? "true" : "false"}" data-ref="${escapeHtml(r.c02_ref)}" data-osis="${escapeHtml(r.c02_ref)}" data-word-pos="${escapeHtml(r.c04_word_pos)}" data-lemma="${escapeHtml(r.c04_lemma)}" data-strong-id="${escapeHtml(r.c07_strong_id)}" data-macula-frame="${escapeHtml(maculaFrame)}" data-pragmatic-focus="${escapeHtml(r.c12_pragmatic_focus)}" data-realia-flag="${escapeHtml(String(r.c14_realia_flag || "").replace(/\bSDBH:\d+;?/gi, "").replace(/\+sdbh:[^|;\s]+/gi, ""))}">` +
        `<header class="leipzig-card-header">` +
        `<span data-col="c01_c02">${escapeHtml(r.c02_ref)} · ${isEn ? "Word" : "Palabra"} #${escapeHtml(r.c04_word_pos)}</span>` +
        `<span data-col="c03_source_corpus">${escapeHtml(isEn ? "Source word" : "Palabra original")}</span>` +
        `</header>` +
        `<div class="leipzig-orig-text" data-col="c05_orig_text">${escapeHtml(r.c05_orig_text)}</div>` +
        `<div class="leipzig-translit" data-col="c06_translit">${escapeHtml(r.c06_translit)}</div>` +
        `<div data-col="c12_gloss_es" class="leipzig-primary-gloss">${escapeHtml(r.c12_gloss_es)}</div>` +
        `<div data-col="c13_nsm_65" class="leipzig-nsm-gloss"${formatNonEmptyCoreMeaning(nsmDisplay, uiLocale) ? "" : " hidden"}>${escapeHtml(formatNonEmptyCoreMeaning(nsmDisplay, uiLocale))}</div>` +
        `<div data-col="c14_target_gloss" class="leipzig-target-gloss"${suppressVisibleTarget ? " hidden" : ""}>${isEn ? "Target" : "Meta"}: ${escapeHtml(rawTarget)}</div>` +
        `<details class="tech-details leipzig-tech-morph" data-contextual-details="true">` +
        `<summary>${isEn ? "Linguistic codes" : "Códigos lingüísticos"} (${escapeHtml(r.c07_strong_id)})</summary>` +
        `<div class="leipzig-codes-row">` +
        `<code>${escapeHtml(r.c03_source_corpus)} · ${escapeHtml(maculaFrame)} · ord ${escapeHtml(r.c01_ordinal_31102)}</code> ` +
        `<code data-col="c07_strong_id">${escapeHtml(r.c07_strong_id)}</code> ` +
        `<code data-col="c08_morph_code">${escapeHtml(r.c08_morph_code)}</code>` +
        (human.strongBadges && human.strongBadges.length > 0
          ? ` <span class="sdbh-strong-badges" data-sdbh-strongs="${escapeHtml(human.strongBadges.join("+"))}">[${escapeHtml(human.strongBadges.slice(0, 3).join(" · "))}]</span>`
          : "") +
        `</div>` +
        `<div class="leipzig-syntax-row">` +
        `<span data-col="c09_macula_role" data-raw-role="${escapeHtml(r.c09_macula_role)}">${isEn ? "Role" : "Función"}: ${escapeHtml(human.roleHuman)}</span> · ` +
        `<span data-col="c10_clause_id">${isEn ? "Clause" : "Cláusula"}: ${escapeHtml(human.clauseHuman)}</span> · ` +
        `<span data-col="c11_semantic_domain">${isEn ? "Domain" : "Dominio"}: ${escapeHtml(human.domainHuman)}</span>` +
        `</div>` +
        `</details>` +
        `</article>`
      );
    })
    .join("");

  const { contentRows } = partitionContentAndFunctionRows(normalizedRows, isClosedClassFunctionTag);
  const firstTokenRow = contentRows[0] || normalizedRows.find((r) => r.c07_strong_id && r.c07_strong_id !== "∅") || normalizedRows[0] || null;
  const focusedStrongId = resolveDefaultStrongForPassage(book, contentRows.length ? contentRows : normalizedRows, activeStrongTarget);
  const focusedOsisRef = String(firstTokenRow?.c02_ref || `${book}.${chapter}.${activeVerseNum}`);
  const focusedActionBarHtml = normalizedRows.length > 0
    ? `<div id="studyFocusedTokenActionBar" class="study-focused-token-bar ek-row-between ek-mb-xs" data-focused-token-actions="true">` +
    `<span class="ek-meta">${isEn ? "Selected word" : "Palabra enfocada"}: <code>${escapeHtml(focusedStrongId)}</code></span>` +
    `<button type="button" id="btnFocusedTokenProposeRoot" class="uls-chip btn-propose-strong-root" data-propose-strong-id="${escapeHtml(focusedStrongId)}" data-osis-ref="${escapeHtml(focusedOsisRef)}">✍️ ${isEn ? "Improve root" : "Mejorar raíz"} (${escapeHtml(focusedStrongId)})</button>` +
    `</div>`
    : "";

  const nsmEntries = shard?.nsm && typeof shard.nsm === "object" ? Object.values(shard.nsm) : [];
  const rawRealiaEntries = Array.isArray(shard?.realia) ? shard.realia : [];
  const realiaEntries = filterVerse
    ? rawRealiaEntries.filter((re) => !re.anchor_ref || re.anchor_ref === `${book}.${chapter}.${filterVerse}`)
    : rawRealiaEntries;
  const metrologyEntries = Array.isArray(shard?.metrology) ? shard.metrology : [];

  const nsmHtml =
    nsmEntries.length > 0
      ? `<div class="study-nsm-section">` +
      `<strong>🧭 ${isEn ? "Universal Semantic Primitives:" : "Conceptos Semánticos Universales:"}</strong>` +
      `<ul class="study-list">` +
      nsmEntries
        .map(
          (n) =>
            `<li data-nsm-strong="${escapeHtml(n.strong_id)}"><code>${escapeHtml(n.strong_id)}</code> <strong>${escapeHtml(n.lemma)}</strong> (${escapeHtml(n.gloss)}): ${escapeHtml(formatNsmSentenceCase(formatHumanReadable15ColFields({ c13_nsm_65: n.nsm_explication }, uiLocale).nsmHuman))}</li>`,
        )
        .join("") +
      `</ul></div>`
      : "";

  const realiaHtml =
    realiaEntries.length > 0 || metrologyEntries.length > 0
      ? `<div class="study-realia-metrology-section">` +
      `<strong>🏛️ ${isEn ? "Biblical World (Realia) & Faithful Metrology:" : "Mundo Bíblico (Realia) y Metrología Fiel:"}</strong>` +
      `<ul class="study-list">` +
      realiaEntries
        .map((re) => {
          const rId = re.id || re.term_id || re.title || re.surface_es || "realia";
          const rTitle = re.title || `${re.surface_es || ""} (${re.lemma_original || re.strong_code || ""})`.trim();
          const rExp = formatNsmSentenceCase(formatHumanReadable15ColFields({ c13_nsm_65: re.explanation || re.footnote_gloss_es || re.nsm_65_decomposition || "" }, uiLocale).nsmHuman);
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

  const includeInlineStrata = options.includeInlineStrata !== false;
  const includeRosettaInspector = options.includeRosettaInspector !== false;
  const activeOsisRef = `${book}.${chapter}.${activeVerseNum}`;
  const rosettaSummaryHtml = includeRosettaInspector
    ? renderPhilologyRosettaInspectorHtml(normalizedRows, {
      book,
      chapter,
      verse: activeVerseNum,
      activeOsis: activeOsisRef,
      rosettaIndex: options.rosettaIndex || shard?.rosettaIndex || null,
      rosettaQuery: options.rosettaQuery || "",
      rosettaCategory: options.rosettaCategory || "all",
      includeExplorer: options.includeExplorer !== false,
      uiLocale,
    })
    : "";

  const gmisSectionHtml = isGmisScope
    ? renderLeipzig4LineGmisHtml(matrixShard, {
      lang: options.lang || "stp",
      book,
      chapter,
      verse: activeVerseNum,
      wordOrder: options.wordOrder || "VSO",
      uiLocale,
    })
    : "";

  return (
    `<section class="study-14col-drawer" data-book="${escapeHtml(book)}" data-chapter="${chapter}" data-verse="${activeVerseNum}" data-scope="${effectiveScopeAttr}" data-rows-rendered="${normalizedRows.length}">` +
    scopeBarHtml +
    focusedActionBarHtml +
    gmisSectionHtml +
    `<div class="leipzig-14col-grid">` +
    wordCardsHtml +
    `</div>` +
    rosettaSummaryHtml +
    (includeInlineStrata ? nsmHtml + realiaHtml : "") +
    `<footer class="study-attribution-footer">` +
    `${escapeHtml(attribution)}` +
    `</footer>` +
    `</section>`
  );
}

/**
 * Genera el HTML de los 3 estratos semánticos de ancho completo (`parryc/interlinear` + `GOLD-556`):
 *   1. `#nsm65StratumCard` — Primitivos Semánticos Universales NSM-65 (Wierzbicka / Youn et al. PNAS 2016)
 *   2. `#realiaMetrologyStratumCard` — Realia y 24 Unidades Metrológicas Cotidianas (Sabatini 2013)
 *   3. `#tskCrossRefsStratumCard` — Ecos Intertextuales AT↔NT (Treasury of Scripture Knowledge)
 */
export function renderStudyStrataCards(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const uiLocale = String(options.uiLocale || options.locale || shard?.uiLocale || "es").trim().toLowerCase();
  const isEn = uiLocale.startsWith("en");
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
    if (!uniqueNsm.has(key) && r.c13_nsm_65 && r.c13_nsm_65 !== "∅") uniqueNsm.set(key, r);
  }
  const { contentRows: nsmContent, functionRows: nsmFunc } = partitionContentAndFunctionRows(Array.from(uniqueNsm.values()), isClosedClassFunctionTag);
  const renderNsmLi = (r) => `<li data-nsm-strong="${escapeHtml(r.c07_strong_id)}"><strong>${escapeHtml(r.c05_orig_text)}</strong> · <span class="nsm-lexical-gloss">${escapeHtml(r.c12_gloss_es)}</span> <code>${escapeHtml(r.c07_strong_id)}</code> → <span class="nsm-human-gloss">${escapeHtml(formatNsmSentenceCase(formatHumanReadable15ColFields(r, uiLocale).nsmHuman))}</span></li>`;
  const nsmPrimary = (nsmContent.length > 0 ? nsmContent : nsmFunc).slice(0, 8);
  const nsmExtraFunc = nsmContent.length > 0 ? nsmFunc.slice(0, 6) : [];
  const nsmHeading = humanizeUiCopy(isEn ? `Stratum 1 · Universal Semantic Primitives NSM-65 (${book} ${chapter}:${verse})` : `Estrato 1 · Primitivos Semánticos Universales NSM-65 (${book} ${chapter}:${verse})`, uiLocale);
  const nsmEmpty = humanizeUiCopy(isEn ? "No NSM-65 primitives recorded for this verse" : "Sin primitivos NSM-65 registrados en este versículo", uiLocale);
  const nsmHtml =
    `<div class="stratum-card nsm65-stratum" data-stratum="nsm65" data-ref="${escapeHtml(activeOsis)}">` +
    `<strong class="stratum-title">🧭 ${escapeHtml(nsmHeading)}</strong>` +
    (nsmPrimary.length > 0
      ? `<ul class="study-list stratum-list">${nsmPrimary.map(renderNsmLi).join("")}</ul>` +
      (nsmExtraFunc.length > 0 ? `<div class="tech-details"><strong class="ek-title-sm">${isEn ? `Grammatical particles (${nsmExtraFunc.length})` : `Partículas gramaticales (${nsmExtraFunc.length})`}</strong><ul class="study-list stratum-list">${nsmExtraFunc.map(renderNsmLi).join("")}</ul></div>` : "")
      : `<p class="stratum-empty-note">∅ (${escapeHtml(nsmEmpty)}).</p>`) +
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
    metrologyEntries = matchedUnits.slice(0, 4).map((u) => ({
      biblical_name: `${u.term_es} (${u.unit_id})`,
      modern_equivalent: u.si_equivalence,
      local_illustration: u.everyday_isomorphism,
    }));
  }

  const hydratedCulturalMap = getHydratedCulturalGlossesMap();
  const verseTerms = new Set(activeRows.flatMap((r) => [String(r.c12_gloss_es || "").toLowerCase(), String(r.c04_lemma || "").toLowerCase()]).filter((t) => t.length >= 3));
  const allCultural = Object.values(hydratedCulturalMap);
  const matchedCultural = allCultural.filter((cg) => {
    const tLow = String(cg?.term || "").toLowerCase();
    for (const vt of verseTerms) {
      if (tLow && (vt.includes(tLow) || tLow.includes(vt))) return true;
    }
    return false;
  }).slice(0, 4);
  const realiaHtml =
    `<div class="stratum-card realia-metrology-stratum" data-stratum="realia-metrology" data-ref="${escapeHtml(activeOsis)}">` +
    `<strong class="stratum-title">⚖️ ${isEn ? `Stratum 2 · Material Realia & 24 Everyday Metrological Units (${escapeHtml(book)} ${chapter}:${verse})` : `Estrato 2 · Realia Material y 24 Unidades Metrológicas Cotidianas (${escapeHtml(book)} ${chapter}:${verse})`}</strong>` +
    `<ul class="study-list stratum-list">` +
    combinedRealia
      .map((re) => {
        const rId = re.id || re.term_id || re.realia_id || re.title || re.surface_es || re.term_es || "realia";
        const rTitle =
          re.title ||
          `${re.surface_es || re.term_es || ""} (${re.lemma_original || re.original_lemma || re.strong_code || ""})`.trim();
        const rExp = formatNsmSentenceCase(formatHumanReadable15ColFields({ c13_nsm_65: re.explanation || re.footnote_gloss_es || re.nsm_65_decomposition || re.nsm_65_explanation || "" }, uiLocale).nsmHuman);
        return `<li data-realia-id="${escapeHtml(rId)}"><strong>${escapeHtml(rTitle)}:</strong> ${escapeHtml(rExp)}</li>`;
      })
      .join("") +
    matchedCultural
      .map((cg) => `<li data-cultural-gloss-term="${escapeHtml(cg.term)}"><strong>${escapeHtml(cg.term)}</strong> <span class="uls-badge cultural-gloss-cat">${escapeHtml(cg.category)}</span>: ${escapeHtml(cg.nsm_gloss_es)}</li>`)
      .join("") +
    metrologyEntries
      .map(
        (me) =>
          `<li data-metrology-unit="${escapeHtml(me.biblical_name)}"><strong>${escapeHtml(me.biblical_name)}:</strong> ${escapeHtml(me.modern_equivalent)} — <em>${escapeHtml(me.local_illustration || "")}</em></li>`
      )
      .join("") +
    `</ul>` +
    `<details id="studyCulturalGlossesCatalogAccordion" class="cultural-glosses-accordion">` +
    `<summary class="cultural-glosses-summary">📚 ${isEn ? `All Cultural Glosses (${allCultural.length} terms: Weights, Coins, Crafts & Realia)` : `Catálogo de Glosas Culturales (${allCultural.length} términos: Pesos, Monedas, Oficios y Realia)`}</summary>` +
    `<ul class="study-list stratum-list cultural-glosses-list">` +
    allCultural
      .map(
        (cg) =>
          `<li data-cultural-gloss-term="${escapeHtml(cg.term)}"><strong>${escapeHtml(cg.term)}</strong> <span class="uls-badge cultural-gloss-cat">${escapeHtml(cg.category)}</span>: ${escapeHtml(cg.nsm_gloss_es)}</li>`
      )
      .join("") +
    `</ul></details>` +
    `</div>`;

  const baseTsk = Array.isArray(shard?.tsk_refs)
    ? shard.tsk_refs
    : VERSE_SPECIFIC_TSK_ECHOES[activeOsis] ||
    CANONICAL_TSK_ECHOES[book] ||
    ["GEN.1.1", "PSA.23.1", "ISA.53.5", "JHN.1.14", "ROM.1.16"];
  const isLexicalRow = (r) => Boolean(r?.c07_strong_id && r.c07_strong_id !== "∅" && (String(r.c07_strong_id).includes("+") || !isClosedClassFunctionTag(r.c11_semantic_domain, r.c09_macula_role, r.c08_morph_code, r.c13_nsm_65)));
  const firstStrong = selectPrimaryLexicalToken(activeRows, isLexicalRow).strongId;
  const rosettaHtml = renderPhilologyRosettaInspectorHtml(activeRows, {
    book,
    chapter,
    verse,
    activeOsis,
    rosettaIndex: options.rosettaIndex || shard?.rosettaIndex || null,
    includeExplorer: false,
    uiLocale,
  });
  const includeInlineRosettaInTsk = Boolean(options.includeInlineRosettaInTsk);
  const tskHtml =
    `<div class="stratum-card tsk-crossrefs-stratum" data-stratum="tsk" data-ref="${escapeHtml(activeOsis)}" data-primary-strong="${escapeHtml(firstStrong)}">` +
    `<strong class="stratum-title">🔗 ${isEn ? `Stratum 3 · Intertextual OT↔NT Echoes (TSK · ${escapeHtml(book)} ${chapter}:${verse} · ${escapeHtml(firstStrong)})` : `Estrato 3 · Ecos Intertextuales AT↔NT (TSK · ${escapeHtml(book)} ${chapter}:${verse} · ${escapeHtml(firstStrong)})`}</strong>` +
    `<div class="tsk-pills-row">` +
    baseTsk
      .map(
        (refStr) =>
          `<button type="button" class="uls-chip mostrador-tsk-pill" data-tsk-ref="${escapeHtml(refStr)}">📖 ${escapeHtml(refStr)}</button>`
      )
      .join("") +
    `</div>` +
    (includeInlineRosettaInTsk ? rosettaHtml : "") +
    `</div>`;

  return { nsmHtml, realiaHtml, tskHtml, rosettaHtml };
}

/**
 * Renderiza el Andamiaje Interlineal de 4 Líneas (GMIS, Reglas de Leipzig bdchauvette/leipzig.js)
 * para lenguas de Tier 3B y Tier 4 sin fingir palabras indígenas inexistentes (DEB-R23-09).
 */
export function renderLeipzig4LineGmisHtml(matrixShard, options = {}) {
  const shard = matrixShard?.matrixChapter || matrixShard;
  const uiLocale = String(options.uiLocale || options.locale || shard?.uiLocale || "es").trim().toLowerCase();
  const isEn = uiLocale.startsWith("en");
  const lang = String(options.lang || "tier4").trim();
  const book = String(shard?.book || matrixShard?.book || options.book || "GEN").toUpperCase();
  const chapter = Number(shard?.chapter || matrixShard?.chapter || options.chapter) || 1;
  const filterVerse = Number(options.verse) > 0 ? Number(options.verse) : null;
  const wordOrder = String(options.wordOrder || "SVO").toUpperCase();
  const maxVerses =
    Number(options.maxVerses) > 0
      ? Number(options.maxVerses)
      : filterVerse
        ? 25
        : Number.POSITIVE_INFINITY;

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
            `<div class="leipzig-gmis-unit" data-ref="${escapeHtml(w.c02_ref)}" data-strong-id="${escapeHtml(w.c07_strong_id)}">` +
            `<div class="gmis-line-1" data-gmis-line="1">` +
            `<span class="gmis-orig">${escapeHtml(w.c05_orig_text)}</span> ` +
            `<em class="gmis-translit">${escapeHtml(w.c06_translit)}</em>` +
            `</div>` +
            `<div class="gmis-line-2" data-gmis-line="2">` +
            `<code>${escapeHtml(w.c07_strong_id)}</code> · <span>${escapeHtml(w.c08_morph_code)}</span> · <span>${escapeHtml(w.c09_macula_role)}</span>` +
            `</div>` +
            `<div class="gmis-line-3" data-gmis-line="3">` +
            `${escapeHtml(humanizeUiCopy("NSM-65", uiLocale))}: ${escapeHtml(formatHumanReadable15ColFields(w, uiLocale).nsmHuman)}` +
            `</div>` +
            `<div class="gmis-line-4" data-gmis-line="4">` +
            `<span class="gmis-bridge-gloss">${escapeHtml(w.c12_gloss_es)}</span>` +
            `<button type="button" class="gmis-elicitation-slot uls-chip" data-elicitation-slot="${escapeHtml(w.c07_strong_id)}" data-strong-id="${escapeHtml(w.c07_strong_id)}" data-osis-ref="${escapeHtml(w.c02_ref)}" data-jump-sheet="field">[___]</button>` +
            `</div>` +
            `</div>`
          );
        })
        .join("");
      return (
        `<article class="gmis-verse-row" data-verse="${verseNum}">` +
        `<div class="gmis-verse-heading">${escapeHtml(book)} ${chapter}:${verseNum} (${escapeHtml(wordOrder)})</div>` +
        `<div class="gmis-units-wrap">${unitsHtml}</div>` +
        `</article>`
      );
    })
    .join("");

  return (
    `<section class="gmis-4line-scaffold" data-gmis-scaffold="true" data-lang="${escapeHtml(lang)}" data-book="${escapeHtml(book)}" data-chapter="${chapter}" data-word-order="${escapeHtml(wordOrder)}">` +
    `<header class="gmis-scaffold-header">` +
    `<strong>🔬 ${isEn ? "4-Line Interlinear Analysis" : "Análisis Interlineal en 4 Líneas"}</strong> ` +
    `<div class="tech-details" data-advanced-audit="true">` +
    `<code>${escapeHtml(isEn ? "4-Line Interlinear · Leipzig / WLC / SRGNT" : "Interlineal 4 líneas · Leipzig / WLC / SRGNT")}</code>` +
    `</div>` +
    `</header>` +
    verseBlocksHtml +
    `</section>`
  );
}

/**
 * Highlights and focuses in Drawer 1 the `.leipzig-14col-card` matching `strongId` (`D1-R37`, `D2-R37`).
 */
export function highlightStudyCardByStrongId(containerEl, strongId) {
  if (!containerEl || !strongId) return null;
  const targetUpper = String(strongId).trim().toUpperCase();
  if (!targetUpper) return null;
  const cards =
    typeof containerEl.querySelectorAll === "function"
      ? Array.from(containerEl.querySelectorAll(".leipzig-14col-card[data-strong-id]"))
      : [];
  let matchedCard = null;
  for (const card of cards) {
    const cardStrong = String(
      (typeof card.getAttribute === "function" && card.getAttribute("data-strong-id")) ||
      card.dataset?.strongId ||
      ""
    )
      .trim()
      .toUpperCase();
    const isHit = cardStrong === targetUpper;
    if (card.classList && typeof card.classList.toggle === "function") {
      card.classList.toggle("is-active-strong", isHit);
    }
    if (typeof card.setAttribute === "function") {
      card.setAttribute("aria-selected", isHit ? "true" : "false");
    }
    if (isHit && !matchedCard) {
      matchedCard = card;
    }
  }
  if (matchedCard && typeof matchedCard.scrollIntoView === "function") {
    matchedCard.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  return matchedCard;
}
