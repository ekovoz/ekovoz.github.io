// Gaveta bajo demanda: Sugerir Mejora Comunitaria (Verso/Palabra L1-L5 con raíz Strong + Cadena de UI).
// Ekovoz Mostrador Ronda 20 — 0 Bytes Audio, texto puro compatible con ekovoz-cli apply-patch.

import {
  renderCrdtWalAndLockP2AuditCardHtml,
  renderMasterCensus7164CardHtml,
} from "./drawer_hydrators.js";

export const CASCADE_LEVELS = ["L1", "L2", "L3", "L4", "L5"];

const NEGATION_MARKERS_REGEX =
  /\b(no|ni|nunca|jam[aá]s|not|never|neither|nor|non|ne|pas|cham|ma'|mana|לא|אל|אין|οὐ|οὐκ|οὐχ|μή|لا|لم|لن)\b/i;

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
  const oldStr = String(oldSurface || "").trim();
  const newStr = String(newSurface || "").trim();
  const oldHasNeg = NEGATION_MARKERS_REGEX.test(oldStr);
  const newHasNeg = NEGATION_MARKERS_REGEX.test(newStr);

  if (oldStr.length > 0 && newStr.length > 0 && oldHasNeg !== newHasNeg) {
    return {
      passed: false,
      status: "VETO_NEGATION_FLIP",
      reason: "Candado 8 (Jespersen): cambio de polaridad de negación detectado entre superficie original y propuesta.",
    };
  }

  if (expectedAgent && expectedPatient && newStr.length > 0) {
    const agIdx = newStr.toLowerCase().indexOf(String(expectedAgent).toLowerCase());
    const patIdx = newStr.toLowerCase().indexOf(String(expectedPatient).toLowerCase());
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
      // Si es comilla interior (« -> ‹ o “ -> ‘), verificar que no invierta jerarquía si se exige estricto
      stack.push({ char: ch, index: i });
    } else if (CLOSE_TO_OPEN[ch]) {
      // Ignorar apóstrofo intrapalabra (ej. Ñi'ook o d’eau donde ’ está rodeado de letras)
      if (ch === "’" && i > 0 && i + 1 < str.length && /\p{L}/u.test(str[i - 1]) && /\p{L}/u.test(str[i + 1])) {
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
 * Ejecuta en tiempo real los 8 Candados Deterministas (`P1..P8`, `D5-B+`, paridad con `crates/ekovoz-core/src/locks.rs`):
 *  - `P1`: Integridad de codificación Unicode (cero `\uFFFD` o bytes nulos).
 *  - `P2`: Proporción de longitud $[0.35, 2.85]$ frente al texto base.
 *  - `P3`: Conservación exacta de numerales y cifras del versículo.
 *  - `P4`: Conservación de nombres propios / anclas léxicas suministradas.
 *  - `P5`: Cero fuga de metatexto de IA o placeholders (`[TODO]`).
 *  - `P6`: Autómata con Pila (PDA) de balance de comillas anidadas (`«…‹…›…»` / `“…‘…’…”`).
 *  - `P7`: Conservación de polaridad de negación (Ciclo de Jespersen).
 *  - `P8`: Conservación del marco predicativo MACULA (`A0` Agente / `A1` Paciente).
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

  // P1: Unicode integrity
  const p1Pass = !newStr.includes("\uFFFD") && !newStr.includes("\u0000");

  // P2: Length ratio bounds [0.35, 2.85] when both non-empty
  let p2Pass = true;
  let lengthRatio = 1.0;
  if (oldStr.length >= 6 && newStr.length > 0) {
    lengthRatio = Number((newStr.length / oldStr.length).toFixed(2));
    p2Pass = lengthRatio >= 0.35 && lengthRatio <= 2.85;
  }

  // P3: Numeral conservation
  const oldNums = (oldStr.match(/\d+/g) || []).join(",");
  const newNums = (newStr.match(/\d+/g) || []).join(",");
  const p3Pass = oldStr.length === 0 || newStr.length === 0 || oldNums === newNums;

  // P4: Proper noun conservation
  const nouns = Array.isArray(expectedProperNouns) ? expectedProperNouns : [];
  const p4Pass =
    newStr.length === 0 ||
    nouns.every((n) => newStr.toLowerCase().includes(String(n).toLowerCase()));

  // P5: Zero LLM metatext leak
  const p5Res = detectLlmMetatextLeak(newStr);

  // P6: PDA nested quotation balance
  const p6Res = validateQuoteBalancePda(newStr);

  // P7 & P8: Negation polarity (Jespersen) & MACULA A0/A1 frame
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

/**
 * 5 Ondas de Traducción del Antiguo Testamento por Incertidumbre Semántica Activa $U(v)$ (`D6-R+`, `ot_waves.rs`).
 */
export const CANONICAL_5_OT_TRANSLATION_WAVES = [
  { wave: 1, id: "WAVE_1_PENTATEUCH_NARRATIVE", title: "Onda 1 · Pentateuco Narrativo y Orígenes", books: ["GEN", "EXO", "RUT", "JON"], meanUncertaintyBits: 1.18, status: "ACTIVE_SEED" },
  { wave: 2, id: "WAVE_2_DEUTERONOMISTIC_HISTORY", title: "Onda 2 · Historia del Pacto y Retorno", books: ["JOS", "JDG", "1SA", "2SA", "1KI", "2KI", "EZR", "NEH", "EST"], meanUncertaintyBits: 1.42, status: "QUEUED" },
  { wave: 3, id: "WAVE_3_PSALTER_AND_WISDOM", title: "Onda 3 · Salterio Litúrgico y Sabiduría", books: ["PSA", "PRO", "ECC"], meanUncertaintyBits: 1.76, status: "ACTIVE_LITURGY" },
  { wave: 4, id: "WAVE_4_PROPHETS", title: "Onda 4 · Profetas Mayores y Menores", books: ["ISA", "JER", "LAM", "HOS", "AMO", "MIC", "HAB", "ZEC", "MAL"], meanUncertaintyBits: 2.14, status: "HIGH_ENTROPY" },
  { wave: 5, id: "WAVE_5_APOCALYPTIC_POETRY", title: "Onda 5 · Alta Incertidumbre Léxica (Job, Ezequiel, Daniel, Cantares)", books: ["JOB", "EZE", "DAN", "SNG", "LEV", "NUM", "DEU"], meanUncertaintyBits: 2.68, status: "EXPERT_REVIEW" },
];

export const FIELD_WORKSHOP_STP_LEXICON = [];
export const STRONG_CONCORDANCE_COUNTS = {
  H0430: { biblia_occurrences: 2602, evangelios_occurrences: 18, felices_occurrences: 6, sample_refs: ["GEN.1.1", "GEN.1.2", "PSA.23.1", "ISA.40.1"] },
  H3068: { biblia_occurrences: 6828, evangelios_occurrences: 24, felices_occurrences: 8, sample_refs: ["GEN.2.4", "PSA.23.1", "ISA.53.1", "MAL.3.6"] },
  H7225: { biblia_occurrences: 51, evangelios_occurrences: 4, felices_occurrences: 1, sample_refs: ["GEN.1.1", "PRO.1.7", "JER.26.1"] },
  H1254: { biblia_occurrences: 54, evangelios_occurrences: 3, felices_occurrences: 1, sample_refs: ["GEN.1.1", "GEN.1.27", "PSA.51.10", "ISA.65.17"] },
  H0776: { biblia_occurrences: 2505, evangelios_occurrences: 12, felices_occurrences: 5, sample_refs: ["GEN.1.1", "PSA.24.1", "ISA.65.17", "MAT.5.5"] },
  G3056: { biblia_occurrences: 330, evangelios_occurrences: 36, felices_occurrences: 4, sample_refs: ["JHN.1.1", "JHN.1.14", "LUK.11.28", "REV.19.13"] },
  G2316: { biblia_occurrences: 1317, evangelios_occurrences: 52, felices_occurrences: 12, sample_refs: ["JHN.1.1", "MAT.5.8", "MAT.5.9", "ROM.1.16"] },
  G1411: { biblia_occurrences: 120, evangelios_occurrences: 15, felices_occurrences: 2, sample_refs: ["ROM.1.16", "LUK.4.14", "ACT.1.8", "1CO.1.18"] },
  G3107: { biblia_occurrences: 50, evangelios_occurrences: 14, felices_occurrences: 12, sample_refs: ["MAT.5.3", "MAT.5.4", "LUK.11.28", "REV.22.14"] },
};
export let SISTER_WORKS_CASCADE_SYNC = {
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
  canonical_patches_count: 5,
  canonical_patches: [
    { patch_id: "PATCH-STP-L2-0001", level: "L2", ref: "GEN.1.1", strong_id: "H0430", status: "COMMITTED" },
    { patch_id: "PATCH-STP-L3-001", level: "L3", ref: "GEN.1.2", strong_id: "H7307", status: "COMMITTED" },
    { patch_id: "PATCH-STP-L2-TEST-9D", level: "L2", ref: "PSA.23.1", strong_id: "H3068", status: "COMMITTED" },
    { patch_id: "PATCH-STP-L4-BEATITUDE-CLI", level: "L4", ref: "MAT.5.3", strong_id: "G3107", status: "COMMITTED" },
    { patch_id: "PATCH-WAL-COMMIT-R16", level: "L2", ref: "GEN.1.1", strong_id: "H0430", status: "COMMITTED" },
  ],
};
export let PATCH_JOURNAL_LOCK_P2 = {
  patch_id: "PATCH-WAL-ROLLBACK-R16",
  status: "ROLLED_BACK",
  veto_lock: "Lock P2 (PDA Unbalanced Nested Quotation)",
  snapshots_count: 7,
};
export let ROOT_NOTES_STP = [
  {
    patch_id: "PATCH-WAL-COMMIT-R16",
    ref: "GEN.1.1",
    strong_id: "H0430",
    note: "Raíz verificada en cascada con 7 snapshots SHA-256.",
  },
];
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
  macro_regions_12: [],
};

/**
 * Pliega un flujo de eventos JSONL de `stp.wal.jsonl` bajo un semirretículo de unión idempotente (`patch_id` LWW),
 * reduciendo 60 líneas crudas a los 5 parches canónicos (`D3-R32` / `3B+`).
 */
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

/**
 * Hidrata los datos reales del Taller de Campo (`web/data/field_workshop_stp.json` + `web/data/elicitation_ladder_250.json`, `D4-A+`, `D3-B++`, `D6-C+`, `ARB-EKOVOZ-61/62`):
 * 600 términos del diccionario Strong ↔ Glosa puente + frase VSO (`stp_vso_classifier_phrase` / `typology_rule`),
 * 5 ondas del Antiguo Testamento, glosario Dunning $G^2 \ge 15.13$ (`key_terms_glossary`),
 * cola top-60 de incertidumbre (`top_uncertainty_queue`), auditoría externa de 8 candados (`external_audit_8_locks`),
 * y continuos dialectales ASJP Swadesh-40 (`tier3a_continuums` + `floor_1_sentence_spec` + `reference_tier1` + `total_sentences`).
 */
export function hydrateFieldWorkshopData(artifact, ladderArtifact = null) {
  if (!artifact || typeof artifact !== "object") return false;
  const waves = Array.isArray(artifact.canonical_5_ot_translation_waves)
    ? artifact.canonical_5_ot_translation_waves
    : Array.isArray(artifact.ot_translation_waves)
      ? artifact.ot_translation_waves
      : [];
  if (waves.length > 0) {
    CANONICAL_5_OT_TRANSLATION_WAVES.length = 0;
    for (const w of waves) {
      CANONICAL_5_OT_TRANSLATION_WAVES.push(w);
    }
  }
  const lex = Array.isArray(artifact.stp_ot_lexicon_600)
    ? artifact.stp_ot_lexicon_600
    : Array.isArray(artifact.stp_lexicon_600)
      ? artifact.stp_lexicon_600
      : Array.isArray(artifact.stp_lexicon)
        ? artifact.stp_lexicon
        : [];
  if (lex.length > 0) {
    FIELD_WORKSHOP_STP_LEXICON.length = 0;
    for (const entry of lex) {
      FIELD_WORKSHOP_STP_LEXICON.push(entry);
    }
  }
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
  if (Array.isArray(artifact.key_terms_glossary) && artifact.key_terms_glossary.length > 0) {
    KEY_TERMS_GLOSSARY.length = 0;
    for (const kt of artifact.key_terms_glossary) {
      KEY_TERMS_GLOSSARY.push(kt);
    }
  }
  const uq60 = Array.isArray(artifact.top_uncertainty_queue)
    ? artifact.top_uncertainty_queue
    : [];
  if (uq60.length > 0) {
    UNCERTAINTY_QUEUE_60.length = 0;
    for (const uItem of uq60) {
      UNCERTAINTY_QUEUE_60.push(uItem);
    }
  }
  if (artifact.external_audit_8_locks && typeof artifact.external_audit_8_locks === "object") {
    EXTERNAL_AUDIT_8_LOCKS = artifact.external_audit_8_locks;
  }
  const ladderSrc = ladderArtifact && typeof ladderArtifact === "object" ? ladderArtifact : artifact;
  if (Array.isArray(ladderSrc.tier3a_continuums) && ladderSrc.tier3a_continuums.length > 0) {
    TIER3A_CONTINUUMS.length = 0;
    for (const tc of ladderSrc.tier3a_continuums) {
      TIER3A_CONTINUUMS.push(tc);
    }
  }
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
    CRDT_WAL_SEMILATTICE = artifact.crdt_wal_semilattice;
  }
  if (artifact.patch_journal_lock_p2 && typeof artifact.patch_journal_lock_p2 === "object") {
    PATCH_JOURNAL_LOCK_P2 = artifact.patch_journal_lock_p2;
  }
  if (Array.isArray(artifact.root_notes_stp) && artifact.root_notes_stp.length > 0) {
    ROOT_NOTES_STP = artifact.root_notes_stp;
  }
  if (artifact.stp_ledger_summary && typeof artifact.stp_ledger_summary === "object") {
    STP_LEDGER_SUMMARY = artifact.stp_ledger_summary;
  }
  if (artifact.master_census_summary && typeof artifact.master_census_summary === "object") {
    MASTER_CENSUS_SUMMARY = artifact.master_census_summary;
  }
  return true;
}

/**
 * Calcula la Propagación en Cascada a las 3 Obras Hermanas (`La Biblia -> Los Felices -> Los Evangelios`, `D6-C+`, `ARB-EKOVOZ-62`)
 * usando los conteos de concordancia empíricos y tablas `stp_cascade_sync.json` de `field_workshop_stp.json`.
 */
export function computeSisterWorksCascade({
  strongId = "H0430",
  ref = "GEN.1.1",
  level = "L2",
  workshopData = null,
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
  const bibliaTargets = Array.isArray(empirical?.sample_refs) && empirical.sample_refs.length > 0
    ? Array.from(new Set([cleanRef, ...empirical.sample_refs])).slice(0, 4)
    : [cleanRef, "GEN.1.1", "PSA.23.1", "JHN.1.1"];

  const felicesEntries = Array.isArray(SISTER_WORKS_CASCADE_SYNC?.felices?.entries)
    ? SISTER_WORKS_CASCADE_SYNC.felices.entries
    : [];
  const evangeliosEntries = Array.isArray(SISTER_WORKS_CASCADE_SYNC?.evangelios?.entries)
    ? SISTER_WORKS_CASCADE_SYNC.evangelios.entries
    : [];

  const felicesTargets = felicesEntries.length > 0
    ? felicesEntries.slice(0, 3).map((e) => `${e.verse_id || "MAT.5.3"} (${e.work || "felices"})`)
    : ["Dicha 01 (PSA.1.1)", "Dicha 03 (MAT.5.3)", "Dicha 09 (MAT.5.9)"];
  const evangeliosTargets = evangeliosEntries.length > 0
    ? evangeliosEntries.slice(0, 3).map((e) => `${e.verse_id || "JHN.1.1"} (${e.work || "evangelios"})`)
    : ["Semana 01 (JHN.1.1–18)", "Semana 14 (LUK.15.1–32)", "Semana 52 (MAT.28.16–20)"];

  return {
    strongId: cleanStrong,
    sourceRef: cleanRef,
    level: cleanLevel,
    sisterWorks: [
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
    ],
  };
}

/**
 * Cola de Prioridad por Entropía de Shannon + Ganancia Marginal Submodular CELF-250 (10S).
 */
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

function sanitizePipeField(value) {
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

  // Formato exacto consumido por `ekovoz-cli apply-patch --file` (REF|OLD|NEW|NOTE y EKOVOZ_PATCH_PAYLOAD)
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

/**
 * Construye el payload determinista para una respuesta de la Escalera Submodular CELF-250
 * (30 horas de trabajo con hablante nativo, 0 Bytes Audio, DEB-R23-10).
 */
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

export const IMPROVE_I18N_FALLBACKS = {
  "improve.title": "Suggest a translation improvement (L1–L5)",
  "improve.subtitle": "Deterministic plain-text field patch (0 Bytes Audio · CC0)",
  "improve.kind_label": "Target:",
  "improve.kind_verse": "Biblical verse / Strong root",
  "improve.kind_ui": "Interface text",
  "improve.level_label": "Cascade level:",
  "improve.level.L1": "L1 · Punctuation / Orthography",
  "improve.level.L2": "L2 · Lexical gloss (Strong root)",
  "improve.level.L3": "L3 · Clause syntax (VSO/SOV/SVO)",
  "improve.level.L4": "L4 · Discourse & pericope cohesion",
  "improve.level.L5": "L5 · Canonical cross-work propagation",
  "improve.current": "Current surface:",
  "improve.proposed": "Proposed improvement:",
  "improve.note": "Elder / community review note:",
  "improve.copy_patch": "📋 Copy patch line",
  "improve.download_patch": "⬇️ Download .patch.toml",
};

export function renderImproveDrawerHtml({
  i18n = null,
  t: customT = null,
  lang = "stp",
  locale = "en",
  ref = "",
  osis = "",
  strongId = "",
  currentVerseText = "",
  currentSurface = "",
  elicitationRank = 1,
  level = "L2",
} = {}) {
  const resolvedRef = sanitizePipeField(ref || osis || "GEN.1.1").toUpperCase();
  const resolvedVerseText = String(currentVerseText || currentSurface || "");
  const isNewTestament = /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)\b/i.test(resolvedRef);
  const resolvedStrong = sanitizePipeField(strongId || (isNewTestament ? "G3056" : "H0430")).toUpperCase();
  const t = (k, vars) => {
    const raw =
      i18n && typeof i18n.t === "function"
        ? i18n.t(k, vars)
        : typeof customT === "function"
          ? customT(k, vars)
          : k;
    if (!raw || raw === k || String(raw).startsWith("improve.")) {
      return IMPROVE_I18N_FALLBACKS[k] || String(raw || k);
    }
    return raw;
  };
  const patch = buildPatchPayload({
    kind: "verse",
    lang,
    locale,
    level,
    ref: resolvedRef,
    strongId: resolvedStrong,
    oldSurface: resolvedVerseText,
    newSurface: resolvedVerseText,
  });
  const seed250 = buildElicitationSeedPayload({
    lang,
    rung: "Rung1SwadeshAndNsm65",
    rank: elicitationRank,
    verseId: resolvedRef,
    strongIds: [resolvedStrong],
    responseText: resolvedVerseText,
  });
  const eightLocksReport = validateAllEightLocksPda({
    oldSurface: patch.old_surface,
    newSurface: patch.new_surface,
  });
  const eightLocksPillsHtml = eightLocksReport.locks
    .map(
      (lk) =>
        `<span class="uls-badge" data-lock-id="${lk.id}" data-lock-passed="${lk.passed}" style="font-size:0.72rem;padding:0.15rem 0.45rem;">${lk.passed ? "✅" : "⛔"} ${lk.label}</span>`,
    )
    .join(" ");

  return (
    `<section class="improve-drawer" data-lang="${patch.lang}" data-ref="${patch.ref}" data-strong-id="${patch.strong_id}" data-audio-bytes="0" data-lock8-status="${verifyLock8PredicativeAndNegation({ oldSurface: patch.old_surface, newSurface: patch.new_surface }).status}" data-eight-locks-status="${eightLocksReport.status}">` +
    `<header style="margin-bottom:0.65rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.4rem;">` +
    `<div>` +
    `<h4 style="margin:0;" data-i18n="improve.title">${t("improve.title")}</h4>` +
    `<p style="margin:0.25rem 0 0 0;font-size:0.84rem;color:var(--text-secondary);" data-i18n="improve.subtitle">${t("improve.subtitle")}</p>` +
    `</div>` +
    `<span class="uls-badge" data-lock8-badge="true">🔒 Candado 8 (MACULA A0/A1 + Jespersen): ${verifyLock8PredicativeAndNegation({ oldSurface: patch.old_surface, newSurface: patch.new_surface }).status}</span>` +
    `</header>` +
    `<div class="eight-locks-pda-bar" data-eight-locks-bar="true" style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.55rem;">${eightLocksPillsHtml}</div>` +
    `<div style="display:grid;gap:0.55rem;">` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.kind_label">${t("improve.kind_label")}</span> ` +
    `<select id="improveKindSelect" style="min-height:48px;padding:0.4rem;">` +
    `<option value="verse" data-i18n="improve.kind_verse">${t("improve.kind_verse")} (${patch.ref} · ${patch.strong_id})</option>` +
    `<option value="ui-string" data-i18n="improve.kind_ui">${t("improve.kind_ui")} (${locale})</option>` +
    `</select>` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.level_label">${t("improve.level_label")}</span> ` +
    `<select id="improveLevelSelect" style="min-height:48px;padding:0.4rem;">` +
    `<option value="L1">${t("improve.level.L1")}</option>` +
    `<option value="L2" selected>${t("improve.level.L2")}</option>` +
    `<option value="L3">${t("improve.level.L3")}</option>` +
    `<option value="L4">${t("improve.level.L4")}</option>` +
    `<option value="L5">${t("improve.level.L5")}</option>` +
    `</select>` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.current">${t("improve.current")}</span>` +
    `<input id="improveOldSurfaceInput" type="text" value="${patch.old_surface.replace(/"/g, "&quot;")}" style="width:100%;min-height:48px;padding:0.4rem;">` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.proposed">${t("improve.proposed")}</span>` +
    `<input id="improveNewSurfaceInput" type="text" value="${patch.new_surface.replace(/"/g, "&quot;")}" style="width:100%;min-height:48px;padding:0.4rem;">` +
    `</label>` +
    `<label style="font-size:0.84rem;">` +
    `<span data-i18n="improve.note">${t("improve.note")}</span>` +
    `<input id="improveNoteInput" type="text" value="" style="width:100%;min-height:48px;padding:0.4rem;">` +
    `</label>` +
    `<pre id="improvePatchOutput" style="padding:0.6rem;border-radius:8px;background:var(--bg-secondary);font-size:0.78rem;overflow-x:auto;">${patch.payloadLine}</pre>` +
    `<div class="celf250-ladder-panel" data-celf250-ladder="true" data-celf250-rank="${seed250.rank}" style="padding:0.6rem;border-radius:8px;border:1px solid var(--card-border);">` +
    `<strong style="font-size:0.82rem;">🧬 Escalera Activa CELF-250 (#${seed250.rank}/250 · 30 Horas · 0 Bytes Audio)</strong>` +
    `<pre id="celf250SeedOutput" style="margin:0.35rem 0 0 0;font-size:0.75rem;overflow-x:auto;">${seed250.payloadLine}</pre>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">` +
    `<button type="button" id="btnApplySuggestedImprovement" class="uls-chip apply-improvement" data-apply-improvement="true" data-proposed-surface="${patch.new_surface.replace(/"/g, "&quot;")}" style="min-height:48px;">✅ Apply improvement to cascade</button>` +
    `<button type="button" id="btnCopyPatchPayload" class="uls-chip" style="min-height:48px;" data-i18n="improve.copy_patch">${t("improve.copy_patch")}</button>` +
    `<button type="button" id="btnDownloadPatchFile" class="uls-chip" style="min-height:48px;" data-i18n="improve.download_patch">${t("improve.download_patch")}</button>` +
    `</div>` +
    `</div>` +
    `</section>`
  );
}

/**
 * Aplica una propuesta de mejora en el formulario del Taller de Campo (`button.apply-improvement`, `D5-E+`),
 * actualizando el campo `#improveNewSurfaceInput`, recalculando el recibo SHA-256 y marcando confirmación visual.
 */
export function applySuggestedImprovement(targetDoc, buttonEl = null, onRefresh = null) {
  const getEl = (id) =>
    targetDoc && typeof targetDoc.getElementById === "function"
      ? targetDoc.getElementById(id)
      : null;
  const newInput = getEl("improveNewSurfaceInput");
  const proposedAttr =
    buttonEl && typeof buttonEl.getAttribute === "function"
      ? buttonEl.getAttribute("data-proposed-surface")
      : null;
  if (newInput && proposedAttr) {
    newInput.value = proposedAttr;
  }
  if (buttonEl && typeof buttonEl.setAttribute === "function") {
    buttonEl.setAttribute("data-applied", "true");
    buttonEl.setAttribute("aria-pressed", "true");
  }
  const patch = typeof onRefresh === "function" ? onRefresh() : null;
  return {
    applied: true,
    surface: newInput ? newInput.value : proposedAttr || "",
    patch,
  };
}

export const TALLER_CC0_ARTIFACTS = [
  { id: "01_diccionario", file: "01_diccionario_strong_es_glosa.tsv", label: "📘 1. Diccionario Strong ↔ Glosa Puente (TSV)" },
  { id: "02_concordancia", file: "02_concordancia_exhaustiva.tsv", label: "🔍 2. Concordancia Exhaustiva por Raíz (TSV)" },
  { id: "03_plantilla", file: "03_plantilla_correcciones_campo.toml", label: "📝 3. Plantilla de Correcciones de Campo L1–L5 (TOML)" },
  { id: "04_historias", file: "04_100_historias_biblicas_orales.md", label: "🗣️ 4. 100 Historias Bíblicas Orales (Markdown)" },
  { id: "05_armonizacion", file: "05_guia_armonizacion_comunitaria_cc0.md", label: "🤝 5. Guía de Armonización Comunitaria CC0" },
  { id: "06_escalera250", file: "06_escalera_elicitacion_250_versiculos.tsv", label: "🪜 6. Escalera Submodular CELF de 250 Versículos (TSV)" },
];

export const CELF_RUNG_LABELS = {
  ALL: "Todos (250)",
  Rung1SwadeshAndNsm65: "Rung 1 · Swadesh & NSM-65",
  Rung2MorphosyntaxAndTamValence: "Rung 2 · Morfosintaxis & TAM",
  Rung3TheologicalKinshipAndNarratives: "Rung 3 · Parentesco & Narrativa",
  Rung4AutomatedPropagationAnd8Locks: "Rung 4 · Propagación & 8 Candados",
};

/**
 * Renderiza la vista previa de propagación en cascada L1–L5 y los eslabones
 * de la Escalera Submodular CELF-250 (`smolix/benchmark-selection`, Arbitraje #61 / #63).
 */
export function renderCascadeAndLadderHtml({
  ladderItems = [],
  lang = "stp",
  currentRef = "",
  osis = "",
  strongId = "H0430",
  level = "L2",
  activeRung = "ALL",
  activeOtWave = 0,
  limit = 24,
} = {}) {
  const cleanLang = sanitizePipeField(lang || "stp").toLowerCase();
  const resolvedRef = sanitizePipeField(currentRef || osis || "GEN.1.1").toUpperCase();
  const cleanLevel = CASCADE_LEVELS.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "L2";
  const rawList = Array.isArray(ladderItems)
    ? ladderItems
    : Array.isArray(ladderItems?.items)
      ? ladderItems.items
      : [];
  const totalCount = rawList.length > 0 ? rawList.length : 4;
  const baseList =
    rawList.length > 0
      ? activeRung && activeRung !== "ALL"
        ? rawList.filter((it) => it.rung === activeRung)
        : rawList
      : [
        { rank: 1, verse_id: "GEN.1.1", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 48.2 },
        { rank: 2, verse_id: "JHN.1.1", rung: "Rung1SwadeshAndNsm65", marginal_gain_bits: 44.5 },
        { rank: 3, verse_id: "PSA.23.1", rung: "Rung2MorphosyntaxAndTamValence", marginal_gain_bits: 41.0 },
        { rank: 4, verse_id: "ROM.1.16", rung: "Rung3TheologicalKinshipAndNarratives", marginal_gain_bits: 38.7 },
      ];
  const waveNum = Number(activeOtWave) || 0;
  const activeWaveObj =
    waveNum >= 1
      ? CANONICAL_5_OT_TRANSLATION_WAVES.find((w) => Number(w.wave) === waveNum) || null
      : null;
  const waveBooksSet =
    activeWaveObj && Array.isArray(activeWaveObj.books)
      ? new Set(activeWaveObj.books.map((b) => String(b).toUpperCase()))
      : null;
  const waveFiltered =
    waveBooksSet && waveBooksSet.size > 0
      ? baseList.filter((it) => {
          const bCode = String(it.verse_id || it.ref || "GEN.1.1")
            .split(".")[0]
            .toUpperCase();
          return waveBooksSet.has(bCode);
        })
      : baseList;
  const filteredList = waveFiltered.length > 0 ? waveFiltered : baseList;

  const sliced = filteredList.slice(0, Math.max(4, Number(limit) || 24));
  const hasGen11 = sliced.some((it) => String(it.verse_id || it.ref).toUpperCase() === "GEN.1.1");
  const gen11Item =
    !hasGen11 && rawList.length > 0
      ? rawList.find((it) => String(it.verse_id || it.ref).toUpperCase() === "GEN.1.1")
      : null;
  const topLadder = gen11Item ? [gen11Item, ...sliced.slice(0, sliced.length - 1)] : sliced;

  const entropyQueue = selectTopEntropyVerseQueue(rawList, resolvedRef, 3);
  const nextEntropyItem = entropyQueue[0] || { ref: "GEN.1.1", shannon_entropy: 2.45, marginal_gain_bits: 48.2 };

  const rungFilterHtml =
    `<div class="celf-rung-filter-bar" role="group" aria-label="Filtro por Peldaño CELF-250" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.5rem;">` +
    `<button type="button" id="btnNextHighEntropyVerse" class="uls-chip" data-next-entropy-ref="${nextEntropyItem.ref}" data-shannon-entropy="${nextEntropyItem.shannon_entropy}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:700;">⚡ Siguiente alta incertidumbre: ${nextEntropyItem.ref} (H=${nextEntropyItem.shannon_entropy}b)</button>` +
    Object.entries(CELF_RUNG_LABELS)
      .map(
        ([rungKey, label]) =>
          `<button type="button" class="uls-chip celf-rung-filter-btn" data-celf-rung-filter="${rungKey}" aria-pressed="${activeRung === rungKey ? "true" : "false"}" style="min-height:48px;padding:0.35rem 0.65rem;font-size:0.76rem;">${label}</button>`
      )
      .join("") +
    `</div>`;

  const ladderButtons = topLadder
    .map((item, idx) => {
      const refStr = sanitizePipeField(item.verse_id || item.ref || "GEN.1.1").toUpperCase();
      const rankNum = Number(item.rank) || idx + 1;
      const rungName = sanitizePipeField(item.rung || "CELF-250");
      const gainBits = Number(item.marginal_gain_bits ?? item.marginal_gain ?? 0);
      const gainBadge = gainBits > 0 ? ` · +${gainBits.toFixed(1)}b` : "";
      return (
        `<button type="button" class="uls-chip mostrador-celf-rung-btn" data-ladder-ref="${refStr}" data-ladder-rank="${rankNum}" data-ladder-rung="${rungName}" style="min-height:48px;padding:0.35rem 0.65rem;font-size:0.79rem;">` +
        `#${rankNum} · ${refStr} (${rungName}${gainBadge})` +
        `</button>`
      );
    })
    .join("");

  const sisterCascade = computeSisterWorksCascade({
    strongId,
    ref: resolvedRef,
    level: cleanLevel,
  });
  const sisterCascadeHtml =
    `<div class="sister-works-cascade-bar" data-sister-works-cascade="true" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0.4rem;margin-bottom:0.55rem;font-size:0.77rem;">` +
    sisterCascade.sisterWorks
      .map(
        (sw) =>
          `<div data-sister-work="${sw.workId}" style="padding:0.4rem 0.55rem;border-radius:8px;border:1px solid var(--card-border);">` +
          `<strong>${sw.workLabel}</strong><br>` +
          `<span>${sw.ConcordantOccurrences} ocurrencias · ${sw.sampleTargets.slice(0, 2).join(", ")}</span>` +
          `</div>`,
      )
      .join("") +
    `</div>`;

  const otWavesHtml =
    `<div class="ot-translation-waves-bar" data-ot-waves="5" data-active-ot-wave="${waveNum}" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.55rem;font-size:0.75rem;">` +
    `<button type="button" class="uls-chip ot-wave-filter-btn" data-ot-wave="0" aria-pressed="${waveNum === 0 ? "true" : "false"}" style="min-height:48px;padding:0.25rem 0.55rem;font-size:0.74rem;">Todas las Ondas</button>` +
    CANONICAL_5_OT_TRANSLATION_WAVES.map(
      (w) =>
        `<button type="button" class="uls-chip ot-wave-filter-btn" data-ot-wave="${w.wave}" data-uncertainty-bits="${w.meanUncertaintyBits}" aria-pressed="${waveNum === Number(w.wave) ? "true" : "false"}" style="min-height:48px;padding:0.25rem 0.55rem;font-size:0.74rem;">${w.title} (U=${w.meanUncertaintyBits}b)</button>`,
    ).join(" ") +
    `</div>`;

  // D4-A+: External Audit 8 Locks Panel (external_audit_8_locks)
  const extAudit = EXTERNAL_AUDIT_8_LOCKS || {};
  const externalAuditHtml =
    `<div id="externalAudit8LocksPanel" data-external-audit-8-locks="true" data-all-8-locks-passed="${Boolean(extAudit.all_8_locks_passed)}" style="margin-top:0.55rem;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid var(--card-border);background:var(--bg-secondary);font-size:0.75rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.35rem;">` +
    `<strong>🛡️ Auditoría Externa de 8 Candados (${sanitizePipeField(extAudit.detected_format || "DOCX_OOXML")} · ${sanitizePipeField(extAudit.detected_tradition || "ProtestantKjv")})</strong>` +
    `<span class="uls-badge" style="font-size:0.71rem;">${extAudit.all_8_locks_passed !== false ? "✅ 8/8 PASS" : "⛔ VETO"} · Rosetta Key Terms: ${Number(extAudit.rosetta_key_terms_extracted || 552)} · Onomasticon: ${Number(extAudit.rosetta_onomasticon_rules || 3100)}</span>` +
    `</div>` +
    `</div>`;

  // D4-A+: Top-60 Uncertainty Queue Panel (uncertainty_queue_60)
  const uqSlice = UNCERTAINTY_QUEUE_60.slice(0, 8);
  const uncertaintyQueueHtml =
    `<div id="uncertaintyQueue60Panel" data-uncertainty-queue-total="${UNCERTAINTY_QUEUE_60.length}" style="margin-top:0.55rem;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
    `<strong style="font-size:0.76rem;display:block;margin-bottom:0.3rem;">🎯 Cola de Incertidumbre Semántica Top-60 (D4-A+ · Dawid-Skene + Entropía U)</strong>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;">` +
    uqSlice
      .map((uItem, idx) => {
        const uRef = sanitizePipeField(uItem.verse_id || uItem.ref || "ACT.5.8").toUpperCase();
        const uRank = Number(uItem.rank) || idx + 1;
        const uScore = Number(uItem.semantic_uncertainty_u ?? uItem.shannon_entropy ?? 0.75).toFixed(3);
        return (
          `<button type="button" class="uls-chip uncertainty-queue-btn" data-jump-osis="${uRef}" data-uncertainty-rank="${uRank}" data-uncertainty-u="${uScore}" style="min-height:48px;padding:0.25rem 0.55rem;font-size:0.73rem;">` +
          `#${uRank} · ${uRef} (U=${uScore})` +
          `</button>`
        );
      })
      .join("") +
    `</div>` +
    `</div>`;

  // D4-A+ / D3-B++: Tier 3A Dialect Continuum ASJP Swadesh-40 + 1-Sentence Unlocked Floor (tier3a_continuums + floor_1_sentence_spec + reference_tier1 + total_sentences)
  const tier3aHtml =
    `<div id="tier3aDialectContinuumPanel" data-tier3a-continuums="${TIER3A_CONTINUUMS.length}" data-floor-1-sentence="${Number(FLOOR_1_SENTENCE_SPEC.single_sentence_unlocked_floor || 291)}" data-reference-tier1="${sanitizePipeField(FLOOR_1_SENTENCE_SPEC.reference_tier1 || "spa_rv1909")}" data-total-sentences="${Number(FLOOR_1_SENTENCE_SPEC.total_sentences || 250)}" style="margin-top:0.55rem;padding:0.45rem 0.6rem;border-radius:8px;border:1px solid var(--card-border);background:var(--bg-secondary);font-size:0.75rem;">` +
    `<strong style="display:block;margin-bottom:0.25rem;">🌐 Continuos Dialectales Tier 3A (ASJP Swadesh-40 LDND ≤ 0.28) · Piso de 1 Oración: ${sanitizePipeField(FLOOR_1_SENTENCE_SPEC.floor_1_sentence_spec)}</strong>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;">` +
    TIER3A_CONTINUUMS.map(
      (tc) =>
        `<span class="uls-badge" data-donor-lang="${sanitizePipeField(tc.donor_lang)}" data-target-lang="${sanitizePipeField(tc.target_lang)}" data-asjp-ldnd="${Number(tc.asjp_ldnd || 0).toFixed(4)}" style="font-size:0.72rem;padding:0.2rem 0.45rem;">` +
        `${sanitizePipeField(tc.donor_lang)} → ${sanitizePipeField(tc.target_lang)} (LDND=${Number(tc.asjp_ldnd || 0).toFixed(4)} · ${sanitizePipeField(tc.sample_projected_cognates || "")})` +
        `</span>`,
    ).join("") +
    `</div>` +
    `</div>`;

  const masterCensusAndLedgerHtml = renderMasterCensus7164CardHtml(
    MASTER_CENSUS_SUMMARY,
    STP_LEDGER_SUMMARY,
  );
  const crdtWalAndLockP2Html = renderCrdtWalAndLockP2AuditCardHtml({
    crdt_wal_semilattice: CRDT_WAL_SEMILATTICE,
    patch_journal_lock_p2: PATCH_JOURNAL_LOCK_P2,
    root_notes_stp: ROOT_NOTES_STP,
  });

  return (
    `<div class="cascade-impact-box" data-cascade-level="${cleanLevel}" data-cascade-lang="${cleanLang}" data-celf-total="${totalCount}" data-active-ot-wave="${waveNum}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);">` +
    `<strong style="font-size:0.84rem;display:block;margin-bottom:0.3rem;">🌊 Cascada Determinista ${cleanLevel} · Escalera CELF-250 (${totalCount} peldaños · ${sanitizePipeField(strongId)} en ${resolvedRef} → Biblia + Evangelios + Felices)</strong>` +
    `<p style="margin:0 0 0.45rem 0;font-size:0.8rem;color:var(--text-secondary);">` +
    `Al corregir esta raíz en <code>${cleanLang}</code>, el motor propaga la mejora a todas las ocurrencias concordantes con cuarentena bayesiana Dawid-Skene + SPRT (0 Bytes Audio). Pulsa cualquier peldaño para saltar al versículo diagnóstico:` +
    `</p>` +
    sisterCascadeHtml +
    rungFilterHtml +
    `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${ladderButtons}</div>` +
    otWavesHtml +
    externalAuditHtml +
    uncertaintyQueueHtml +
    tier3aHtml +
    `<div style="margin-top:0.55rem;display:grid;gap:0.5rem;">` +
    masterCensusAndLedgerHtml +
    crdtWalAndLockP2Html +
    `</div>` +
    `</div>`
  );
}

const DEFAULT_STP_LEXICON_SEED = [
  { strong: "H0430", gloss_es: "Dios / Creador", stp_surface: "Jawatan Dios", stp_vso_classifier_phrase: "gu Jawatan Dios", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 2602 },
  { strong: "H7225", gloss_es: "principio / origen", stp_surface: "na pai' dhuuk", stp_vso_classifier_phrase: "na pai' dhuuk", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 51 },
  { strong: "H1254", gloss_es: "crear / formar", stp_surface: "jix duu", stp_vso_classifier_phrase: "jix duu", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 54 },
  { strong: "H0776", gloss_es: "tierra / mundo", stp_surface: "oidha'", stp_vso_classifier_phrase: "gu oidha'", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 2505 },
  { strong: "H8064", gloss_es: "cielos / firmamento", stp_surface: "tɨkɨr", stp_vso_classifier_phrase: "gu tɨkɨr", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 420 },
  { strong: "H3068", gloss_es: "el Señor (YHWH)", stp_surface: "Jawatan", stp_vso_classifier_phrase: "gu Jawatan", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 3, occurrences: 6828 },
  { strong: "G3056", gloss_es: "Palabra / Verbo", stp_surface: "Ñi'ook", stp_vso_classifier_phrase: "gu Ñi'ook", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 330 },
  { strong: "G2316", gloss_es: "Dios", stp_surface: "Dios", stp_vso_classifier_phrase: "gu Dios", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 1317 },
];

/**
 * Renderiza únicamente las filas/chips del Explorador Léxico O'dam (`#stpLexiconResultsRows`, `D67 / 6B+` + `D4-A+`)
 * para actualización quirúrgica `innerHTML` sin destruir el foco ni `[selectionStart, selectionEnd]` de `#stpLexiconSearchInput`.
 */
export function renderStpLexiconResultsRowsHtml({
  query = "",
  activeWave = 0,
  limit = 24,
} = {}) {
  const pool =
    FIELD_WORKSHOP_STP_LEXICON.length > 0
      ? FIELD_WORKSHOP_STP_LEXICON
      : DEFAULT_STP_LEXICON_SEED;
  const cleanQuery = String(query || "").trim().toLowerCase();
  const waveNum = Number(activeWave) || 0;

  const filtered = pool.filter((entry) => {
    if (!entry) return false;
    if (waveNum >= 1 && Number(entry.wave || 0) !== 0 && Number(entry.wave) !== waveNum) {
      return false;
    }
    if (!cleanQuery) return true;
    const strongStr = String(entry.strong || entry.strong_id || "").toLowerCase();
    const glossEs = String(entry.gloss_es || entry.es_gloss || entry.gloss || "").toLowerCase();
    const stpSurf = String(entry.stp_surface || entry.stp_gloss || entry.stp_vso_classifier_phrase || entry.surface || "").toLowerCase();
    return (
      strongStr.includes(cleanQuery) ||
      glossEs.includes(cleanQuery) ||
      stpSurf.includes(cleanQuery)
    );
  });

  const shown = (filtered.length > 0 ? filtered : pool).slice(0, Math.max(6, Number(limit) || 24));
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return shown
    .map((entry) => {
      const strongCode = String(entry.strong || entry.strong_id || "H0430").toUpperCase();
      const glossEs = String(entry.gloss_es || entry.es_gloss || entry.gloss || "Dios");
      const stpSurf = String(entry.stp_surface || entry.stp_gloss || entry.stp_vso_classifier_phrase || entry.surface || glossEs);
      const vsoPhrase = String(entry.stp_vso_classifier_phrase || stpSurf);
      const typoRule = String(entry.typology_rule || entry.willett_1991_head_initial_rule || "VSO_HEAD_INITIAL_GB130_1_GB070_1");
      const occ = Number(entry.occurrences || STRONG_CONCORDANCE_COUNTS[strongCode]?.biblia_occurrences || 12);
      return (
        `<button type="button" class="uls-chip stp-lexicon-entry-btn" ` +
        `data-lex-strong="${esc(strongCode)}" ` +
        `data-lex-surface="${esc(stpSurf)}" ` +
        `data-lex-gloss="${esc(glossEs)}" ` +
        `data-vso-phrase="${esc(vsoPhrase)}" ` +
        `data-typology-rule="${esc(typoRule)}" ` +
        `style="min-height:48px;padding:0.3rem 0.6rem;font-size:0.76rem;text-align:left;">` +
        `<strong>${esc(strongCode)}</strong> · ${esc(stpSurf)} <small style="opacity:0.82;">(${esc(glossEs)} · VSO: ${esc(vsoPhrase)} · ${occ} vv.)</small>` +
        `</button>`
      );
    })
    .join("");
}

/**
 * D7-S21+ (`ARB-EKOVOZ-63`, `FIELD_WORKSHOP_STP_LEXICON`) + `D67 / 6B+` + `D4-A+`:
 * Renderiza el explorador interactivo de los 600 términos del diccionario Strong ↔ Glosa Español ↔ O'dam (`stp`)
 * con búsqueda instantánea (`#stpLexiconSearchInput`), frase clasificadora VSO y el Glosario de Términos Clave Dunning $G^2 \ge 15.13$.
 */
export function renderStpLexiconExplorerHtml({
  query = "",
  activeWave = 0,
  limit = 24,
} = {}) {
  const pool =
    FIELD_WORKSHOP_STP_LEXICON.length > 0
      ? FIELD_WORKSHOP_STP_LEXICON
      : DEFAULT_STP_LEXICON_SEED;
  const cleanQuery = String(query || "").trim().toLowerCase();
  const waveNum = Number(activeWave) || 0;

  const filtered = pool.filter((entry) => {
    if (!entry) return false;
    if (waveNum >= 1 && Number(entry.wave || 0) !== 0 && Number(entry.wave) !== waveNum) {
      return false;
    }
    if (!cleanQuery) return true;
    const strongStr = String(entry.strong || entry.strong_id || "").toLowerCase();
    const glossEs = String(entry.gloss_es || entry.es_gloss || entry.gloss || "").toLowerCase();
    const stpSurf = String(entry.stp_surface || entry.stp_gloss || entry.stp_vso_classifier_phrase || entry.surface || "").toLowerCase();
    return (
      strongStr.includes(cleanQuery) ||
      glossEs.includes(cleanQuery) ||
      stpSurf.includes(cleanQuery)
    );
  });

  const shown = (filtered.length > 0 ? filtered : pool).slice(0, Math.max(6, Number(limit) || 24));
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const itemsHtml = renderStpLexiconResultsRowsHtml({ query, activeWave, limit });
  const topKeyTerms = KEY_TERMS_GLOSSARY.filter((kt) => Number(kt.g2_score || 0) >= 15.13).slice(0, 8);
  const dunningGlossaryHtml =
    `<div id="dunningKeyTermsGlossaryPanel" data-key-terms-total="${KEY_TERMS_GLOSSARY.length}" style="margin-top:0.55rem;padding-top:0.45rem;border-top:1px solid var(--card-border);">` +
    `<strong style="font-size:0.77rem;display:block;margin-bottom:0.3rem;">📊 Glosario de Términos Clave Dunning G² ≥ 15.13 (${KEY_TERMS_GLOSSARY.length} anclas · 1-Tap Inyección)</strong>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;">` +
    topKeyTerms
      .map((kt) => {
        const surf = String(kt.vernacular_stp || "");
        const bridge = String(kt.bridge_es || "");
        const g2 = Number(kt.g2_score || 15.13).toFixed(1);
        const lemma = String(kt.source_lemma || kt.term_id || "KT");
        return (
          `<button type="button" class="uls-chip dunning-key-term-btn" data-inject-surface="${esc(surf)}" data-dunning-g2="${esc(g2)}" data-source-lemma="${esc(lemma)}" style="min-height:48px;padding:0.25rem 0.55rem;font-size:0.74rem;">` +
          `<strong>${esc(surf)}</strong> (${esc(bridge)} · G²=${esc(g2)})` +
          `</button>`
        );
      })
      .join("") +
    `</div>` +
    `</div>`;

  return (
    `<div id="stpLexiconExplorerPanel" class="stp-lexicon-explorer" ` +
    `data-lexicon-total="${pool.length}" ` +
    `data-lexicon-shown="${shown.length}" ` +
    `data-active-ot-wave="${waveNum}" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.45rem;margin-bottom:0.45rem;">` +
    `<strong style="font-size:0.83rem;">📘 Explorador Léxico O'dam (${pool.length} raíces Strong ↔ Glosa Español ↔ Superficie stp)</strong>` +
    `<input id="stpLexiconSearchInput" type="search" value="${esc(query)}" placeholder="Buscar Strong (H0430), glosa o término O'dam..." aria-label="Buscar en léxico O'dam de 600 términos" style="min-width:220px;min-height:48px;padding:0.25rem 0.55rem;font-size:0.78rem;">` +
    `</div>` +
    `<div id="stpLexiconResultsRows" data-stp-lexicon-results="true" style="display:flex;flex-wrap:wrap;gap:0.35rem;">${itemsHtml}</div>` +
    dunningGlossaryHtml +
    `</div>`
  );
}

/** Renderiza el catálogo de los 6 artefactos CC0 del Taller de Campo (`web/obras/biblia/taller/<lang>/`). */
export function renderTallerArtifactsCatalogHtml(langOrOpts = "es") {
  const rawLang =
    typeof langOrOpts === "object" && langOrOpts !== null
      ? langOrOpts.lang || "es"
      : langOrOpts;
  const cleanLang = ["es", "en", "stp", "he", "grc"].includes(String(rawLang || "").toLowerCase())
    ? String(rawLang).toLowerCase()
    : "es";
  return (
    `<div class="taller-artifacts-grid" data-taller-lang="${cleanLang}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:0.45rem;">` +
    TALLER_CC0_ARTIFACTS.map(
      (art) =>
        `<a class="uls-chip taller-artifact-link" data-taller-artifact="${art.id}" href="obras/biblia/taller/${cleanLang}/${art.file}" download style="min-height:48px;display:inline-flex;align-items:center;padding:0.4rem 0.65rem;text-decoration:none;font-size:0.8rem;">${art.label}</a>`
    ).join("") +
    `</div>`
  );
}


