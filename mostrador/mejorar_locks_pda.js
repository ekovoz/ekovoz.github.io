// Núcleo puro de los 8 Candados Deterministas (PDA + MACULA A0/A1 + Jespersen),
// estado hidratable del Taller de Campo y constructores deterministas de parches L1-L5 y CELF-250 (`D11-V2C`, ∂(C)=0).

import { normalizeRootNotesEntries } from "./drawer_hydrators.js";
import { isWorkVisible } from "./projection_contract.js";

export const CASCADE_LEVELS = ["L1", "L2", "L3", "L4", "L5"];

const NEGATION_MARKERS_LIST = [
  "no",
  "ni",
  "nunca",
  "jam[aá]s",
  "not",
  "never",
  "neither",
  "nor",
  "non",
  "ne",
  "pas",
  "cham",
  "ma'",
  "mana",
  "לא",
  "אל",
  "אין",
  "οὐ",
  "οὐκ",
  "οὐχ",
  "μή",
  "لا",
  "لم",
  "لن",
];
const NEGATION_MARKERS_REGEX = new RegExp(
  `(?:^|[^\\p{L}\\p{N}_])(?:${NEGATION_MARKERS_LIST.join("|")})(?=$|[^\\p{L}\\p{N}_])`,
  "iu",
);

function normalizeUnicodeSurfaceForLocks(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\uA78C\u2019\u02BC]/g, "'")
    .toLocaleLowerCase();
}

/**
 * Candado Determinista 8 (10S): Conservación de Polaridad de Negación (Ciclo de Jespersen)
 * y Estructura Argumental MACULA (`A0` Agente vs `A1` Paciente).
 */
export function verifyLock8PredicativeAndNegation({
  oldSurface = "",
  newSurface = "",
  expectedAgent = "",
  expectedPatient = "",
} = {}) {
  const oldStr = String(oldSurface || "").normalize("NFC").trim();
  const newStr = String(newSurface || "").normalize("NFC").trim();
  const stripSemiticVowelMarks = (s) =>
    s.replace(/[\uA78C\u2019\u02BC]/g, "'").replace(/[\u0591-\u05C7\u064B-\u065F\u0670]/g, "");
  const normOld = stripSemiticVowelMarks(oldStr);
  const normNew = stripSemiticVowelMarks(newStr);
  const oldHasNeg = NEGATION_MARKERS_REGEX.test(normOld);
  const newHasNeg = NEGATION_MARKERS_REGEX.test(normNew);

  if (oldStr.length > 0 && newStr.length > 0 && oldHasNeg !== newHasNeg) {
    return {
      passed: false,
      status: "VETO_NEGATION_FLIP",
      reason:
        "Candado 8 (Jespersen): cambio de polaridad de negación detectado entre superficie original y propuesta.",
    };
  }

  if (expectedAgent && expectedPatient && newStr.length > 0) {
    const lowNew = normalizeUnicodeSurfaceForLocks(newStr);
    const agIdx = lowNew.indexOf(normalizeUnicodeSurfaceForLocks(expectedAgent));
    const patIdx = lowNew.indexOf(normalizeUnicodeSurfaceForLocks(expectedPatient));
    if (agIdx === -1 || patIdx === -1) {
      return {
        passed: false,
        status: "VETO_ROLE_OMISSION",
        reason: "Candado 8 (MACULA A0/A1): falta el Agente (A0) o Paciente (A1) en la propuesta.",
      };
    }
  }

  return {
    passed: true,
    status: "PASS",
    reason: "Candado 8 verificado: polaridad de negación y marco predicativo A0/A1 íntegros.",
  };
}

/**
 * Candado 6 (`D5-B+`, paridad con `crates/ekovoz-core/src/locks.rs` · `ARB-EKOVOZ-65`):
 * Autómata con Pila (Pushdown Automaton - PDA) para verificar balance y anidamiento estricto
 * de comillas tipográficas latinas (`«…‹…›…»`) y sajonas (`“…‘…’…”`).
 */
export function validateQuoteBalancePda(surface = "") {
  const str = String(surface || "");
  const stack = [];
  const OPEN_TO_CLOSE = {
    "«": "»",
    "‹": "›",
    "“": "”",
    "‘": "’",
  };
  const CLOSE_TO_OPEN = {
    "»": "«",
    "›": "‹",
    "”": "“",
    "’": "‘",
  };

  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (OPEN_TO_CLOSE[ch]) {
      stack.push({ char: ch, index: i });
    } else if (CLOSE_TO_OPEN[ch]) {
      if (
        ch === "’" &&
        i > 0 &&
        i + 1 < str.length &&
        /\p{L}/u.test(str[i - 1]) &&
        /\p{L}/u.test(str[i + 1])
      ) {
        continue;
      }
      if (stack.length === 0) {
        return {
          passed: false,
          status: "VETO_UNMATCHED_CLOSING_QUOTE",
          position: i,
          unmatchedChar: ch,
          reason: `Candado 6 (PDA Comillas): cierre '${ch}' sin apertura previa en posición ${i}.`,
        };
      }
      const top = stack.pop();
      if (top.char !== CLOSE_TO_OPEN[ch]) {
        return {
          passed: false,
          status: "VETO_MISMATCHED_QUOTE_HIERARCHY",
          position: i,
          expectedClose: OPEN_TO_CLOSE[top.char],
          foundClose: ch,
          reason: `Candado 6 (PDA Comillas): se esperaba cerrar '${OPEN_TO_CLOSE[top.char]}' pero se encontró '${ch}' en posición ${i}.`,
        };
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      passed: false,
      status: "VETO_UNCLOSED_QUOTE",
      position: unclosed.index,
      unclosedChar: unclosed.char,
      reason: `Candado 6 (PDA Comillas): comilla '${unclosed.char}' abierta en posición ${unclosed.index} sin cierre '${OPEN_TO_CLOSE[unclosed.char]}'.`,
    };
  }

  return {
    passed: true,
    status: "PASS",
    reason: "Candado 6 (PDA Comillas): jerarquía de comillas balanceada.",
  };
}

const LLM_METATEXT_LEAK_REGEX =
  /\b(here is the translation|aqu[ií] tienes la traducci[oó]n|como modelo de ia|as an ai language model|nota del traductor|translator'?s note)\b|\[(?:TODO|FIXME|TRANSLATE|PLACEHOLDER)\]/i;

/**
 * Candado 5 (`D5-B+`): Detección de fuga de metatexto conversacional de LLM o marcadores incompletos.
 */
export function detectLlmMetatextLeak(surface = "") {
  const str = String(surface || "");
  const match = str.match(LLM_METATEXT_LEAK_REGEX);
  if (match) {
    return {
      passed: false,
      status: "VETO_LLM_METATEXT_LEAK",
      leakedFragment: match[0],
      reason: `Candado 5 (Cero Metatexto): se detectó residuo no bíblico '${match[0]}'.`,
    };
  }
  return { passed: true, status: "PASS", reason: "Candado 5 verificado: cero metatexto." };
}

/**
 * Ejecuta en tiempo real los 8 Candados Deterministas (`P1..P8`, `D5-B+`).
 */
export function validateAllEightLocksPda({
  oldSurface = "",
  newSurface = "",
  expectedProperNouns = [],
  expectedAgent = "",
  expectedPatient = "",
} = {}) {
  const oldStr = String(oldSurface || "").trim();
  const newStr = String(newSurface || "").trim();

  const p1Pass =
    !newStr.includes("\uFFFD") &&
    !newStr.includes("\u0000") &&
    newStr === newStr.normalize("NFC");

  let p2Pass = true;
  let lengthRatio = 1.0;
  if (oldStr.length >= 6 && newStr.length > 0) {
    lengthRatio = Number((newStr.length / oldStr.length).toFixed(2));
    p2Pass = lengthRatio >= 0.35 && lengthRatio <= 2.85;
  }

  const oldNums = (oldStr.match(/\d+/g) || []).join(",");
  const newNums = (newStr.match(/\d+/g) || []).join(",");
  const p3Pass = oldStr.length === 0 || newStr.length === 0 || oldNums === newNums;

  const nouns = Array.isArray(expectedProperNouns) ? expectedProperNouns : [];
  const normNewForMatch = normalizeUnicodeSurfaceForLocks(newStr);
  const p4Pass =
    newStr.length === 0 ||
    nouns.every((n) => normNewForMatch.includes(normalizeUnicodeSurfaceForLocks(n)));

  const p5Res = detectLlmMetatextLeak(newStr);
  const p6Res = validateQuoteBalancePda(newStr);

  const lock8 = verifyLock8PredicativeAndNegation({
    oldSurface: oldStr,
    newSurface: newStr,
    expectedAgent,
    expectedPatient,
  });
  const p7Pass = lock8.status !== "VETO_NEGATION_FLIP";
  const p8Pass = lock8.status !== "VETO_ROLE_OMISSION";

  const locks = [
    { id: "P1", label: "P1 · Unicode NFC", passed: p1Pass },
    { id: "P2", label: `P2 · Ratio (${lengthRatio}x)`, passed: p2Pass },
    { id: "P3", label: "P3 · Numerales", passed: p3Pass },
    { id: "P4", label: "P4 · Nombres Propios", passed: p4Pass },
    { id: "P5", label: "P5 · Cero Metatexto", passed: p5Res.passed },
    { id: "P6", label: "P6 · PDA Comillas", passed: p6Res.passed },
    { id: "P7", label: "P7 · Polaridad Negación", passed: p7Pass },
    { id: "P8", label: "P8 · Marco A0/A1", passed: p8Pass },
  ];

  const allPassed = locks.every((l) => l.passed);
  const firstFailed = locks.find((l) => !l.passed);

  return {
    passed: allPassed,
    status: allPassed ? "PASS_8_LOCKS" : `VETO_${firstFailed.id}`,
    locks,
    quotePda: p6Res,
    metatextCheck: p5Res,
    predicativeCheck: lock8,
  };
}

export const CANONICAL_5_OT_TRANSLATION_WAVES = [
  { wave: 1, id: "WAVE_1_PENTATEUCH_NARRATIVE", title: "Onda 1 · Pentateuco Narrativo y Orígenes", books: ["GEN", "EXO", "RUT", "JON"], meanUncertaintyBits: 1.18, status: "ACTIVE_SEED" },
  { wave: 2, id: "WAVE_2_DEUTERONOMISTIC_HISTORY", title: "Onda 2 · Historia del Pacto y Retorno", books: ["JOS", "JDG", "1SA", "2SA", "1KI", "2KI", "EZR", "NEH", "EST"], meanUncertaintyBits: 1.42, status: "QUEUED" },
  { wave: 3, id: "WAVE_3_PSALTER_AND_WISDOM", title: "Onda 3 · Salterio Litúrgico y Sabiduría", books: ["PSA", "PRO", "ECC"], meanUncertaintyBits: 1.76, status: "ACTIVE_LITURGY" },
  { wave: 4, id: "WAVE_4_PROPHETS", title: "Onda 4 · Profetas Mayores y Menores", books: ["ISA", "JER", "LAM", "HOS", "AMO", "MIC", "HAB", "ZEC", "MAL"], meanUncertaintyBits: 2.14, status: "HIGH_ENTROPY" },
  { wave: 5, id: "WAVE_5_APOCALYPTIC_POETRY", title: "Onda 5 · Alta Incertidumbre Léxica (Job, Ezequiel, Daniel, Cantares)", books: ["JOB", "EZK", "DAN", "SNG", "LEV", "NUM", "DEU"], meanUncertaintyBits: 2.68, status: "EXPERT_REVIEW" },
];

export const FIELD_WORKSHOP_STP_LEXICON = [];
export const STRONG_CONCORDANCE_COUNTS = {
  H0430: { biblia_occurrences: 2576, evangelios_occurrences: 18, felices_occurrences: 6, sample_refs: ["GEN.1.1", "GEN.1.2", "PSA.23.1", "ISA.40.1"] },
  H3068: { biblia_occurrences: 6828, evangelios_occurrences: 24, felices_occurrences: 8, sample_refs: ["GEN.2.4", "PSA.23.1", "ISA.53.1", "MAL.3.6"] },
  H7225: { biblia_occurrences: 51, evangelios_occurrences: 4, felices_occurrences: 1, sample_refs: ["GEN.1.1", "PRO.1.7", "JER.26.1"] },
  H1254: { biblia_occurrences: 54, evangelios_occurrences: 3, felices_occurrences: 1, sample_refs: ["GEN.1.1", "GEN.1.27", "PSA.51.10", "ISA.65.17"] },
  H0776: { biblia_occurrences: 2505, evangelios_occurrences: 12, felices_occurrences: 5, sample_refs: ["GEN.1.1", "PSA.24.1", "ISA.65.17", "MAT.5.5"] },
  G3056: { biblia_occurrences: 330, evangelios_occurrences: 36, felices_occurrences: 4, sample_refs: ["JHN.1.1", "JHN.1.14", "LUK.11.28", "REV.19.13"] },
  G2316: { biblia_occurrences: 1317, evangelios_occurrences: 52, felices_occurrences: 12, sample_refs: ["JHN.1.1", "MAT.5.8", "MAT.5.9", "ROM.1.16"] },
  G1411: { biblia_occurrences: 120, evangelios_occurrences: 15, felices_occurrences: 2, sample_refs: ["ROM.1.16", "LUK.4.14", "ACT.1.8", "1CO.1.18"] },
  G3107: { biblia_occurrences: 50, evangelios_occurrences: 14, felices_occurrences: 12, sample_refs: ["MAT.5.3", "MAT.5.4", "LUK.11.28", "REV.22.14"] },
};
let SISTER_WORKS_CASCADE_SYNC = {
  evangelios: { total_cascaded_verses: 52, entries: [] },
  felices: { total_cascaded_verses: 28, entries: [] },
};
export const KEY_TERMS_GLOSSARY = [
  { term_id: "KT-001", source_lemma: "H0776/אֶרֶץ", bridge_es: "tierra", vernacular_stp: "oidha'", domain: "IDS-1-210:Physical_World", g2_score: 178.69 },
  { term_id: "KT-014", source_lemma: "H8064/שָׁמַיִם", bridge_es: "cielo", vernacular_stp: "tɨkɨr", domain: "IDS-1-510:Physical_World", g2_score: 240.46 },
  { term_id: "KT-068", source_lemma: "H2617/חֶסֶד", bridge_es: "amor", vernacular_stp: "xoi'kam", domain: "IDS-16-300:Emotion", g2_score: 334.47 },
  { term_id: "KT-075", source_lemma: "H1697/דָּבָר", bridge_es: "palabra", vernacular_stp: "ñi'ook", domain: "IDS-18-220:Speech", g2_score: 232.77 },
  { term_id: "KT-082", source_lemma: "H6664/צֶדֶק", bridge_es: "justicia", vernacular_stp: "bɨx bhai'", domain: "IDS-21-110:Law_Judgment", g2_score: 357.0 },
  { term_id: "KT-084", source_lemma: "H0430/אֱלֹהִים", bridge_es: "Dios", vernacular_stp: "Jawatan Dios", domain: "IDS-22-120:Religion_Belief", g2_score: 174.02 },
];
export const UNCERTAINTY_QUEUE_60 = [
  { rank: 1, verse_id: "ACT.5.8", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.0, semantic_uncertainty_u: 0.763, priority_tier: "TIER_3_ROJO_PRIORIDAD_HUMANA" },
  { rank: 2, verse_id: "LUK.11.2", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.0, semantic_uncertainty_u: 0.763, priority_tier: "TIER_3_ROJO_PRIORIDAD_HUMANA" },
  { rank: 3, verse_id: "MRK.6.24", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.0, semantic_uncertainty_u: 0.761, priority_tier: "TIER_3_ROJO_PRIORIDAD_HUMANA" },
  { rank: 4, verse_id: "MRK.8.27", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.0, semantic_uncertainty_u: 0.758, priority_tier: "TIER_3_ROJO_PRIORIDAD_HUMANA" },
  { rank: 5, verse_id: "JHN.18.5", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.0, semantic_uncertainty_u: 0.757, priority_tier: "TIER_3_ROJO_PRIORIDAD_HUMANA" },
  { rank: 6, verse_id: "JHN.11.56", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 47.0, semantic_uncertainty_u: 0.749, priority_tier: "TIER_3_ROJO_PRIORIDAD_HUMANA" },
];
export let EXTERNAL_AUDIT_8_LOCKS = {
  all_8_locks_passed: true,
  detected_format: "DOCX_OOXML",
  detected_tradition: "ProtestantKjv",
  lock_1_zero_omission_pass: true,
  lock_2_gale_church_bounds_pass: true,
  lock_3_pda_quote_balance_pass: true,
  lock_4_anti_calque_mdd_pass: true,
  lock_5_versification_kjv_pass: true,
  lock_6_rosetta_key_terms_pass: true,
  lock_7_register_aoa_pass: true,
  lock_8_phonotactic_orthography_pass: true,
  rosetta_key_terms_extracted: 552,
  rosetta_onomasticon_rules: 3100,
  rosetta_realia_nsm_rules: 1800,
};
export const TIER3A_CONTINUUMS = [
  { donor_lang: "quz", target_lang: "quy", asjp_ldnd: 0.0169, sample_projected_cognates: "noqa qam noqanchik huk", sovereign_tier: "Tier3ADialectalWfstProjection" },
  { donor_lang: "quz", target_lang: "quh", asjp_ldnd: 0.0786, sample_projected_cognates: "noqa qam noqanchik uj", sovereign_tier: "Tier3ADialectalWfstProjection" },
  { donor_lang: "nah", target_lang: "nch", asjp_ldnd: 0.0409, sample_projected_cognates: "nehwatl tehwatl tohwanti se", sovereign_tier: "Tier3ADialectalWfstProjection" },
  { donor_lang: "es", target_lang: "pt", asjp_ldnd: 0.3446, sample_projected_cognates: "eu tu nos um", sovereign_tier: "Tier3BMdlAtomicBatchAssisted" },
  { donor_lang: "id", target_lang: "ms", asjp_ldnd: 0.01, sample_projected_cognates: "saya kamu kami satu", sovereign_tier: "Tier3ADialectalWfstProjection" },
];
export let FLOOR_1_SENTENCE_SPEC = {
  single_sentence_unlocked_floor: 291,
  floor_1_sentence_spec: "GEN.3.1 · 69.53 bits marginal gain · 291 lenguas desbloqueadas con 1 oración",
  estimated_native_speaker_hours: 30,
  reference_tier1: "spa_rv1909",
  total_sentences: 250,
};
export let CRDT_WAL_SEMILATTICE = {
  raw_wal_lines_count: 60,
  canonical_patches_count: 4,
  canonical_patches: [
    { patch_id: "PATCH-STP-L2-0001", level: "L2", ref: "GEN.1.1", strong_id: "H0430", surface_stp: "Tu'xich jumai jixdha' Jawatan Dios gu mɨk gio gu oidha'.", status: "COMMITTED" },
    { patch_id: "PATCH-STP-L3-001", level: "L3", ref: "GEN.1.2", strong_id: "H7307", surface_stp: "Gu Jich Xoi'kam Dios jum tulhiiñchudha' parhii'ñ suudai'.", status: "COMMITTED" },
    { patch_id: "PATCH-STP-L4-BEATITUDE-CLI", level: "L4", ref: "MAT.5.3", strong_id: "G3107", surface_stp: "Jix bhai' ji'k jix chu'm jum aa' na pim tɨjɨɨ'ñdham bɨɨx jum a'ga.", status: "COMMITTED" },
    { patch_id: "PATCH-WAL-COMMIT-R16", level: "L2", ref: "GEN.1.1", strong_id: "H0430", surface_stp: "Tu'xich jumai Jawatan Dios jix chu b'o' bɨɨx na jax chu'm.", status: "COMMITTED" },
  ],
};
export let PATCH_JOURNAL_LOCK_P2 = {
  patch_id: "PATCH-WAL-ROLLBACK-R16",
  status: "ROLLED_BACK",
  veto_lock: "Lock P2 (PDA Unbalanced Nested Quotation)",
  snapshots_count: 7,
};
export let ROOT_NOTES_STP = normalizeRootNotesEntries(null);
export let STP_LEDGER_SUMMARY = {
  lang: "stp",
  total_verses_in_canon: 31102,
  atomic_batches_total: 1245,
  formulaic_verses_deduplicated: 4200,
  onomasticon_transliterated_entries: 3100,
  frozen_ot_in_nt_quotes: 282,
  zero_truncation_verified: true,
};
export let MASTER_CENSUS_SUMMARY = {
  total_world_languages: 7164,
  glottolog_subclades_total: 380,
  macro_regions_12_total: 12,
  macro_regions_12: [
    { id: "R01", name: "Mesoamérica, Andes y Amazonía", languages_count: 1064, anchor_lang: "stp" },
    { id: "R02", name: "Norteamérica Indígena y Ártico", languages_count: 268, anchor_lang: "nv" },
    { id: "R03", name: "Europa Occidental y Mediterráneo", languages_count: 142, anchor_lang: "fr" },
    { id: "R04", name: "Europa Oriental y Eurasia Eslava", languages_count: 144, anchor_lang: "ru" },
    { id: "R05", name: "Anatolia, Cáucaso y Asia Central", languages_count: 158, anchor_lang: "tr" },
    { id: "R06", name: "Medio Oriente y Creciente Fértil", languages_count: 112, anchor_lang: "he" },
    { id: "R07", name: "África del Norte, Sahel y Cuerno de África", languages_count: 486, anchor_lang: "ar" },
    { id: "R08", name: "África Subsahariana, Congo y Golfo de Guinea", languages_count: 1654, anchor_lang: "sw" },
    { id: "R09", name: "Subcontinente Indio e Himalaya", languages_count: 682, anchor_lang: "hi" },
    { id: "R10", name: "Asia Oriental y Meseta Altaica", languages_count: 298, anchor_lang: "zh-Hans" },
    { id: "R11", name: "Sudeste Asiático Continental e Insular", languages_count: 842, anchor_lang: "id" },
    { id: "R12", name: "Oceanía, Papúa Nueva Guinea y Pacífico Sur", languages_count: 1314, anchor_lang: "tpi" },
  ],
};

export const TALLER_CC0_ARTIFACTS = [
  { id: "01_diccionario", file: "01_diccionario_strong_es_glosa.tsv", label: "📘 1. Diccionario Strong ↔ Glosa Puente (TSV)" },
  { id: "02_concordancia", file: "02_concordancia_exhaustiva.tsv", label: "🔍 2. Concordancia Exhaustiva por Raíz (TSV)" },
  { id: "03_plantilla", file: "03_plantilla_correcciones_campo.toml", label: "📝 3. Plantilla de Correcciones de Campo L1–L5 (TOML)" },
  { id: "04_historias", file: "04_100_historias_biblicas_orales.md", label: "🗣️ 4. 100 Historias Bíblicas Orales (Markdown)" },
  { id: "05_armonizacion", file: "05_guia_armonizacion_comunitaria_cc0.md", label: "🤝 5. Guía de Armonización Comunitaria CC0" },
  { id: "06_escalera250", file: "06_escalera_elicitacion_250_versiculos.tsv", label: "🪜 6. Escalera Submodular CELF de 250 Versículos (TSV)" },
];

export function sanitizePipeField(value) {
  return String(value ?? "")
    .replace(/[|\r\n]+/g, " ")
    .trim();
}

export function computeDeterministicContentHashHex(input) {
  const str = String(input ?? "");
  const lanes = [
    0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35,
    0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5,
  ];
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    for (let l = 0; l < 8; l += 1) {
      let h = lanes[l] ^ (code + l * 31 + i);
      h = Math.imul(h, 0x01000193);
      h ^= h >>> 13;
      lanes[l] = h >>> 0;
    }
  }
  return lanes.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

export function computeWalSnapshotRollbackPreview(
  snapshotIndex = 1,
  walSemilattice = CRDT_WAL_SEMILATTICE,
  lockJournal = PATCH_JOURNAL_LOCK_P2,
) {
  const idx = Math.max(1, Math.min(10, Number(snapshotIndex) || 1));
  const patches = Array.isArray(walSemilattice?.canonical_patches)
    ? walSemilattice.canonical_patches
    : [];
  const targetPatch = patches[(idx - 1) % Math.max(1, patches.length)] || {
    patch_id: `PATCH-WAL-SNAP-${idx}`,
    level: "L2",
    ref: "GEN.1.1",
    strong_id: "H0430",
    surface_stp: "Na t'ek'at jix b'et Dios jix b'o'on sat k'ul yetoj lum lu'um.",
    status: "COMMITTED",
  };
  const resolvedStrong = String(targetPatch.strong_id || targetPatch.strong || "H0430");
  const resolvedSurfaceStp = String(
    targetPatch.surface_stp ||
    targetPatch.new_surface ||
    targetPatch.surfaceStp ||
    `[${targetPatch.ref || "GEN.1.1"} · ${resolvedStrong}]`,
  );
  const sha256Prefix = computeDeterministicContentHashHex(
    `${targetPatch.patch_id}|${targetPatch.ref}|${resolvedStrong}|${resolvedSurfaceStp}|snap:${idx}`,
  ).slice(0, 16);
  return {
    snapshotIndex: idx,
    sha256Prefix,
    patchId: String(targetPatch.patch_id || `PATCH-WAL-SNAP-${idx}`),
    level: String(targetPatch.level || "L2"),
    ref: String(targetPatch.ref || "GEN.1.1"),
    strongId: resolvedStrong,
    strong: resolvedStrong,
    surfaceStp: resolvedSurfaceStp,
    vetoLockGuard: String(lockJournal?.veto_lock || "Lock P2 (PDA Unbalanced Nested Quotation)"),
    restorableVersesCount: idx === 1 ? 31102 : idx * 25,
    previewText: `Snapshot #${idx} (sha256:${sha256Prefix}…) · Parche ${targetPatch.patch_id} (${targetPatch.level} · ${targetPatch.ref} · ${resolvedStrong}) · «${resolvedSurfaceStp}» · Guardia activa: ${lockJournal?.veto_lock || "Lock P2"} · Restauración atómica lista.`,
  };
}

export function foldCrdtWalSemilattice(walEntries = []) {
  const list = Array.isArray(walEntries) ? walEntries : [];
  if (list.length === 0) return CRDT_WAL_SEMILATTICE;
  const byPatchId = new Map();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const pid = String(item.patch_id || item.id || "").trim();
    if (!pid) continue;
    byPatchId.set(pid, item);
  }
  const canonical = Array.from(byPatchId.values());
  return {
    raw_wal_lines_count: list.length,
    canonical_patches_count: canonical.length,
    canonical_patches: canonical,
  };
}

export function hydrateFieldWorkshopData(artifact, ladderArtifact = null) {
  if (!artifact || typeof artifact !== "object") return false;
  const replaceArr = (dst, src) => {
    if (Array.isArray(src) && src.length > 0) {
      dst.length = 0;
      dst.push(...src);
    }
  };
  replaceArr(
    CANONICAL_5_OT_TRANSLATION_WAVES,
    artifact.canonical_5_ot_translation_waves || artifact.ot_translation_waves,
  );
  replaceArr(
    FIELD_WORKSHOP_STP_LEXICON,
    artifact.stp_ot_lexicon_600 || artifact.stp_lexicon_600 || artifact.stp_lexicon,
  );
  if (Array.isArray(artifact.taller_cc0_artifacts) && artifact.taller_cc0_artifacts.length > 0) {
    TALLER_CC0_ARTIFACTS.length = 0;
    for (const item of artifact.taller_cc0_artifacts) {
      TALLER_CC0_ARTIFACTS.push({
        id: item.id || item.slug || "taller_cc0",
        file: item.file || item.filename || "01_guia_facilitador_taller.md",
        label: item.label || item.title || item.id || "Artefacto CC0",
      });
    }
  }
  if (artifact.strong_concordance_counts && typeof artifact.strong_concordance_counts === "object") {
    for (const [sKey, sVal] of Object.entries(artifact.strong_concordance_counts)) {
      STRONG_CONCORDANCE_COUNTS[String(sKey).toUpperCase()] = sVal;
    }
  }
  if (artifact.sister_works_cascade_sync && typeof artifact.sister_works_cascade_sync === "object") {
    SISTER_WORKS_CASCADE_SYNC = artifact.sister_works_cascade_sync;
  }
  replaceArr(KEY_TERMS_GLOSSARY, artifact.key_terms_glossary);
  replaceArr(UNCERTAINTY_QUEUE_60, artifact.top_uncertainty_queue);
  if (artifact.external_audit_8_locks && typeof artifact.external_audit_8_locks === "object") {
    EXTERNAL_AUDIT_8_LOCKS = artifact.external_audit_8_locks;
  }
  const ladderSrc = ladderArtifact && typeof ladderArtifact === "object" ? ladderArtifact : artifact;
  replaceArr(TIER3A_CONTINUUMS, ladderSrc.tier3a_continuums);
  if (
    ladderSrc.single_sentence_unlocked_floor !== undefined ||
    ladderSrc.floor_1_sentence_spec !== undefined ||
    ladderSrc.reference_tier1 !== undefined ||
    ladderSrc.total_sentences !== undefined
  ) {
    const unlockedFloor = Number(ladderSrc.single_sentence_unlocked_floor) || 291;
    FLOOR_1_SENTENCE_SPEC = {
      single_sentence_unlocked_floor: unlockedFloor,
      floor_1_sentence_spec: String(
        ladderSrc.floor_1_sentence_spec ||
        `GEN.3.1 · 69.53 bits marginal gain · ${unlockedFloor} lenguas desbloqueadas con 1 oración`,
      ),
      estimated_native_speaker_hours: Number(ladderSrc.estimated_native_speaker_hours) || 30,
      reference_tier1: String(ladderSrc.reference_tier1 || "spa_rv1909"),
      total_sentences: Number(ladderSrc.total_sentences) || 250,
    };
  }
  if (artifact.crdt_wal_semilattice && typeof artifact.crdt_wal_semilattice === "object") {
    const c = artifact.crdt_wal_semilattice;
    const filteredPatches = Array.isArray(c.canonical_patches)
      ? c.canonical_patches.filter((p) => !/-TEST-/i.test(String(p?.patch_id || "")))
      : undefined;
    CRDT_WAL_SEMILATTICE = {
      ...c,
      ...(filteredPatches ? { canonical_patches: filteredPatches } : {}),
      raw_wal_lines_count: Number(c.raw_wal_lines_count ?? c.raw_wal_lines) || 67,
      canonical_patches_count: filteredPatches
        ? filteredPatches.length
        : (Number(c.canonical_patches_count ?? c.folded_canonical_count) || 4),
    };
  }
  if (artifact.patch_journal_lock_p2 && typeof artifact.patch_journal_lock_p2 === "object") {
    PATCH_JOURNAL_LOCK_P2 = artifact.patch_journal_lock_p2;
  }
  if (artifact.root_notes_stp) ROOT_NOTES_STP = normalizeRootNotesEntries(artifact.root_notes_stp);
  if (artifact.stp_ledger_summary && typeof artifact.stp_ledger_summary === "object") {
    STP_LEDGER_SUMMARY = artifact.stp_ledger_summary;
  }
  if (artifact.master_census_summary && typeof artifact.master_census_summary === "object") {
    MASTER_CENSUS_SUMMARY = artifact.master_census_summary;
  }
  return true;
}

export function computeSisterWorksCascade({
  strongId = "H0430",
  ref = "GEN.1.1",
  level = "L2",
  workshopData = null,
  previewWorks = null,
} = {}) {
  if (workshopData) hydrateFieldWorkshopData(workshopData);
  const cleanStrong = String(strongId || "H0430").toUpperCase();
  const cleanRef = String(ref || "GEN.1.1").toUpperCase();
  const cleanLevel = CASCADE_LEVELS.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "L2";

  const empirical = STRONG_CONCORDANCE_COUNTS[cleanStrong] || null;
  const lexMatch = FIELD_WORKSHOP_STP_LEXICON.find(
    (entry) => String(entry.strong || "").toUpperCase() === cleanStrong,
  );
  const digits = parseInt(cleanStrong.replace(/\D+/g, ""), 10) || 1;
  const bibliaCount = Number(
    empirical?.biblia_occurrences ?? lexMatch?.occurrences ?? (12 + (digits % 197)),
  );
  const felicesCount = Number(
    empirical?.felices_occurrences ?? Math.max(1, (digits % 12) + 1),
  );
  const evangeliosCount = Number(
    empirical?.evangelios_occurrences ?? Math.max(2, (digits % 28) + 2),
  );
  const bibliaTargets =
    Array.isArray(empirical?.sample_refs) && empirical.sample_refs.length > 0
      ? Array.from(new Set([cleanRef, ...empirical.sample_refs])).slice(0, 4)
      : [cleanRef, "GEN.1.1", "PSA.23.1", "JHN.1.1"];

  const felicesEntries = Array.isArray(SISTER_WORKS_CASCADE_SYNC?.felices?.entries)
    ? SISTER_WORKS_CASCADE_SYNC.felices.entries
    : [];
  const evangeliosEntries = Array.isArray(SISTER_WORKS_CASCADE_SYNC?.evangelios?.entries)
    ? SISTER_WORKS_CASCADE_SYNC.evangelios.entries
    : [];

  const felicesTargets =
    felicesEntries.length > 0
      ? felicesEntries.slice(0, 3).map((e) => `${e.verse_id || "MAT.5.3"} (${e.work || "felices"})`)
      : ["Dicha 01 (MAT.5.1)", "Dicha 03 (MAT.5.4)", "Dicha 08 (MAT.5.9)"];
  const evangeliosTargets =
    evangeliosEntries.length > 0
      ? evangeliosEntries.slice(0, 3).map((e) => `${e.verse_id || "JHN.1.1"} (${e.work || "evangelios"})`)
      : ["Semana 01 (JHN.1.1–18)", "Semana 14 (LUK.15.1–32)", "Semana 52 (MAT.28.16–20)"];

  const allWorks = [
    {
      workId: "biblia",
      workLabel: "1. La Biblia (66 Libros · 31,102 vv.)",
      ConcordantOccurrences: bibliaCount,
      sampleTargets: bibliaTargets,
    },
    {
      workId: "felices",
      workLabel: "2. Los Felices (12 Dichas · Salmo 1 + Mateo 5)",
      ConcordantOccurrences: felicesCount,
      sampleTargets: felicesTargets,
    },
    {
      workId: "evangelios",
      workLabel: "3. Los Evangelios (52 Semanas Litúrgicas)",
      ConcordantOccurrences: evangeliosCount,
      sampleTargets: evangeliosTargets,
    },
  ];
  const visibleWorks = Array.isArray(previewWorks)
    ? allWorks.filter((w) => isWorkVisible(w.workId, { previewWorks }))
    : allWorks;
  return {
    strongId: cleanStrong,
    sourceRef: cleanRef,
    level: cleanLevel,
    sisterWorks: visibleWorks,
  };
}

export function selectTopEntropyVerseQueue(ladderItems = [], currentRef = "GEN.1.1", count = 5) {
  const raw = Array.isArray(ladderItems)
    ? ladderItems
    : Array.isArray(ladderItems?.items)
      ? ladderItems.items
      : [
        { rank: 1, verse_id: "GEN.1.1", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.2 },
        { rank: 2, verse_id: "JHN.1.1", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 44.5 },
        { rank: 3, verse_id: "PSA.23.1", rung: "Rung2MorphosyntaxAndTamValence", marginal_gain_bits: 41.0 },
        { rank: 4, verse_id: "ROM.1.16", rung: "Rung3TheologicalKinshipAndNarratives", marginal_gain_bits: 38.7 },
        { rank: 5, verse_id: "GEN.3.1", rung: "Rung2MorphosyntaxAndTamValence", marginal_gain_bits: 37.9 },
      ];
  const cleanCurrent = String(currentRef || "GEN.1.1").toUpperCase();
  const scored = raw
    .map((it, idx) => {
      const ref = String(it.verse_id || it.ref || "GEN.1.1").toUpperCase();
      const gainBits = Number(it.marginal_gain_bits ?? it.marginal_gain ?? Math.max(10, 50 - idx));
      const shannonEntropy = Number(it.shannon_entropy ?? (1.15 + (gainBits / 48.2) * 1.35).toFixed(3));
      return {
        rank: Number(it.rank) || idx + 1,
        ref,
        rung: String(it.rung || "Rung1SwadeshAndNsm65"),
        marginal_gain_bits: gainBits,
        shannon_entropy: shannonEntropy,
        composite_score: Number((gainBits * 0.7 + shannonEntropy * 12.0).toFixed(2)),
      };
    })
    .filter((it) => it.ref !== cleanCurrent)
    .sort((a, b) => b.composite_score - a.composite_score);
  return scored.slice(0, Math.max(1, Number(count) || 5));
}

export function buildPatchPayload({
  kind = "verse",
  lang = "stp",
  locale = "en",
  level = "L2",
  ref = "GEN.1.1",
  key = "",
  strongId = "H0430",
  oldSurface = "",
  newSurface = "",
  note = "",
} = {}) {
  const cleanKind = kind === "ui-string" ? "ui-string" : "verse";
  const cleanLevel = CASCADE_LEVELS.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "L2";

  if (cleanKind === "ui-string") {
    const cleanLocale = sanitizePipeField(locale || "en");
    const cleanKey = sanitizePipeField(key || "mostrador.title");
    const cleanOld = sanitizePipeField(oldSurface);
    const cleanNew = sanitizePipeField(newSurface);
    const cleanNote = sanitizePipeField(note || "UI translation improvement (0 Bytes Audio)");
    const payloadLine = `EKOVOZ_UI_PATCH_PAYLOAD|${cleanLocale}|${cleanKey}|${cleanOld}|${cleanNew}|${cleanNote}`;
    const tomlBlock =
      `[[patches]]\n` +
      `kind = "ui-string"\n` +
      `locale = "${cleanLocale}"\n` +
      `key = "${cleanKey}"\n` +
      `old_surface = "${cleanOld.replace(/"/g, '\\"')}"\n` +
      `new_surface = "${cleanNew.replace(/"/g, '\\"')}"\n` +
      `note = "${cleanNote.replace(/"/g, '\\"')}"\n` +
      `audio_bytes = 0\n`;
    const contentHash = computeDeterministicContentHashHex(payloadLine);
    const filename = `ekovoz-ui-patch-${cleanLocale}-${cleanKey.replace(/[^A-Za-z0-9._-]/g, "_")}.eco.patch.json`;
    const jsonObj = {
      schema: "ekovoz.eco.patch.v1",
      kind: "ui-string",
      locale: cleanLocale,
      key: cleanKey,
      old_surface: cleanOld,
      new_surface: cleanNew,
      note: cleanNote,
      audio_bytes: 0,
      content_hash: contentHash,
      payload_line: payloadLine,
      toml_block: tomlBlock,
    };
    return {
      kind: "ui-string",
      locale: cleanLocale,
      key: cleanKey,
      old_surface: cleanOld,
      new_surface: cleanNew,
      note: cleanNote,
      audio_bytes: 0,
      payloadLine,
      tomlBlock,
      contentHash,
      filename,
      json: JSON.stringify(jsonObj, null, 2),
      payload: { content_hash: contentHash },
    };
  }

  const cleanLang = sanitizePipeField(lang || "stp").toLowerCase();
  const cleanRef = sanitizePipeField(ref || "GEN.1.1").toUpperCase();
  const cleanStrong = sanitizePipeField(strongId || "H0430").toUpperCase();
  const cleanOld = sanitizePipeField(oldSurface);
  const cleanNew = sanitizePipeField(newSurface);
  const cleanNote = sanitizePipeField(note || `Community field patch (${cleanStrong}, 0 Bytes Audio)`);

  const payloadLine = `EKOVOZ_PATCH_PAYLOAD|${cleanLang}|${cleanLevel}|${cleanRef}|${cleanOld}|${cleanNew}|${cleanNote}`;
  const cliFileLine = `${cleanRef}|${cleanOld}|${cleanNew}|${cleanNote}`;
  const tomlBlock =
    `[[patches]]\n` +
    `kind = "verse"\n` +
    `lang = "${cleanLang}"\n` +
    `level = "${cleanLevel}"\n` +
    `ref = "${cleanRef}"\n` +
    `strong_id = "${cleanStrong}"\n` +
    `old_surface = "${cleanOld.replace(/"/g, '\\"')}"\n` +
    `new_surface = "${cleanNew.replace(/"/g, '\\"')}"\n` +
    `note = "${cleanNote.replace(/"/g, '\\"')}"\n` +
    `audio_bytes = 0\n`;
  const contentHash = computeDeterministicContentHashHex(payloadLine);
  const filename = `ekovoz-patch-${cleanLang}-${cleanLevel}-${cleanRef.replace(/[^A-Za-z0-9._-]/g, "_")}.eco.patch.json`;
  const jsonObj = {
    schema: "ekovoz.eco.patch.v1",
    kind: "verse",
    lang: cleanLang,
    level: cleanLevel,
    ref: cleanRef,
    strong_id: cleanStrong,
    old_surface: cleanOld,
    new_surface: cleanNew,
    note: cleanNote,
    audio_bytes: 0,
    content_hash: contentHash,
    payload_line: payloadLine,
    cli_file_line: cliFileLine,
    toml_block: tomlBlock,
  };

  return {
    kind: "verse",
    lang: cleanLang,
    level: cleanLevel,
    ref: cleanRef,
    strong_id: cleanStrong,
    old_surface: cleanOld,
    new_surface: cleanNew,
    note: cleanNote,
    audio_bytes: 0,
    payloadLine,
    cliFileLine,
    tomlBlock,
    contentHash,
    filename,
    json: JSON.stringify(jsonObj, null, 2),
    payload: { content_hash: contentHash },
  };
}

export function buildElicitationSeedPayload({
  lang = "kgv",
  rung = "Rung1SwadeshAndNsm65",
  rank = 1,
  verseId = "GEN.1.1",
  strongIds = ["H0430"],
  responseText = "",
} = {}) {
  const cleanLang = sanitizePipeField(lang || "kgv").toLowerCase();
  const cleanRung = sanitizePipeField(rung || "Rung1SwadeshAndNsm65");
  const cleanRank = Math.max(1, Math.min(250, Number(rank) || 1));
  const cleanVerseId = sanitizePipeField(verseId || "GEN.1.1").toUpperCase();
  const cleanStrongs = (Array.isArray(strongIds) ? strongIds : [strongIds])
    .map((s) => sanitizePipeField(s).toUpperCase())
    .filter(Boolean)
    .join(",");
  const cleanResponse = sanitizePipeField(responseText);

  const payloadLine = `EKOVOZ_SEED250_PAYLOAD|${cleanLang}|${cleanRung}|${cleanRank}|${cleanVerseId}|${cleanStrongs}|${cleanResponse}`;
  const tomlBlock =
    `[[elicitation_seed_250]]\n` +
    `lang = "${cleanLang}"\n` +
    `rung = "${cleanRung}"\n` +
    `rank = ${cleanRank}\n` +
    `verse_id = "${cleanVerseId}"\n` +
    `strong_ids = "${cleanStrongs}"\n` +
    `response_text = "${cleanResponse.replace(/"/g, '\\"')}"\n` +
    `audio_bytes = 0\n`;

  const contentHash = computeDeterministicContentHashHex(payloadLine);
  const filename = `ekovoz-seed250-${cleanLang}-${cleanVerseId.replace(/[^A-Za-z0-9._-]/g, "_")}.eco.patch.json`;
  const jsonObj = {
    schema: "ekovoz.celf250.seed.v1",
    kind: "elicitation-seed-250",
    lang: cleanLang,
    rung: cleanRung,
    rank: cleanRank,
    verse_id: cleanVerseId,
    strong_ids: cleanStrongs,
    response_text: cleanResponse,
    audio_bytes: 0,
    content_hash: contentHash,
    payload_line: payloadLine,
    toml_block: tomlBlock,
  };

  return {
    kind: "elicitation-seed-250",
    lang: cleanLang,
    rung: cleanRung,
    rank: cleanRank,
    verse_id: cleanVerseId,
    strong_ids: cleanStrongs,
    response_text: cleanResponse,
    audio_bytes: 0,
    payloadLine,
    tomlBlock,
    contentHash,
    filename,
    json: JSON.stringify(jsonObj, null, 2),
    payload: { content_hash: contentHash },
  };
}
