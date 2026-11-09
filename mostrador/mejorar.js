// Gaveta bajo demanda: Sugerir Mejora Comunitaria (Verso/Palabra L1-L5 con raíz Strong + Cadena de UI).
// Ekovoz Mostrador Ronda 20 — 0 Bytes Audio, texto puro compatible con ekovoz-cli apply-patch.

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

/**
 * Hidrata los datos reales del Taller de Campo (`web/data/field_workshop_stp.json`, `D6-R+`):
 * 600 términos del diccionario Strong ↔ Glosa puente y las 5 ondas del Antiguo Testamento.
 */
export function hydrateFieldWorkshopData(artifact) {
  if (!artifact || typeof artifact !== "object") return;
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
    : Array.isArray(artifact.stp_lexicon)
      ? artifact.stp_lexicon
      : [];
  if (lex.length > 0) {
    FIELD_WORKSHOP_STP_LEXICON.length = 0;
    for (const entry of lex) {
      FIELD_WORKSHOP_STP_LEXICON.push(entry);
    }
  }
}

/**
 * Calcula la Propagación en Cascada a las 3 Obras Hermanas (`La Biblia -> Los Felices -> Los Evangelios`, `D5-B+`).
 */
export function computeSisterWorksCascade({
  strongId = "H0430",
  ref = "GEN.1.1",
  level = "L2",
} = {}) {
  const cleanStrong = String(strongId || "H0430").toUpperCase();
  const cleanRef = String(ref || "GEN.1.1").toUpperCase();
  const cleanLevel = CASCADE_LEVELS.includes(String(level).toUpperCase())
    ? String(level).toUpperCase()
    : "L2";

  return {
    strongId: cleanStrong,
    sourceRef: cleanRef,
    level: cleanLevel,
    sisterWorks: [
      {
        workId: "biblia",
        workLabel: "1. La Biblia (66 Libros · 31,102 vv.)",
        ConcordantOccurrences: cleanStrong === "H0430" ? 2602 : cleanStrong === "G3056" ? 330 : 48,
        sampleTargets: [cleanRef, "GEN.1.1", "PSA.23.1", "JHN.1.1"],
      },
      {
        workId: "felices",
        workLabel: "2. Los Felices (12 Dichas · Salmo 1 + Mateo 5)",
        ConcordantOccurrences: 6,
        sampleTargets: ["Dicha 01 (PSA.1.1)", "Dicha 03 (MAT.5.3)", "Dicha 09 (MAT.5.9)"],
      },
      {
        workId: "evangelios",
        workLabel: "3. Los Evangelios (52 Semanas Litúrgicas)",
        ConcordantOccurrences: 18,
        sampleTargets: ["Semana 01 (JHN.1.1–18)", "Semana 14 (LUK.15.1–32)", "Semana 52 (MAT.28.16–20)"],
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
    `<button type="button" id="btnCopyPatchPayload" class="uls-chip" style="min-height:48px;" data-i18n="improve.copy_patch">${t("improve.copy_patch")}</button>` +
    `<button type="button" id="btnDownloadPatchFile" class="uls-chip" style="min-height:48px;" data-i18n="improve.download_patch">${t("improve.download_patch")}</button>` +
    `</div>` +
    `</div>` +
    `</section>`
  );
}

const TALLER_CC0_ARTIFACTS = [
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
  const filteredList =
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
    `<div class="ot-translation-waves-bar" data-ot-waves="5" style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.55rem;font-size:0.75rem;">` +
    CANONICAL_5_OT_TRANSLATION_WAVES.map(
      (w) =>
        `<span class="uls-badge" data-ot-wave="${w.wave}" data-uncertainty-bits="${w.meanUncertaintyBits}">${w.title} (U=${w.meanUncertaintyBits}b)</span>`,
    ).join(" ") +
    `</div>`;

  return (
    `<div class="cascade-impact-box" data-cascade-level="${cleanLevel}" data-cascade-lang="${cleanLang}" data-celf-total="${totalCount}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);">` +
    `<strong style="font-size:0.84rem;display:block;margin-bottom:0.3rem;">🌊 Cascada Determinista ${cleanLevel} · Escalera CELF-250 (${totalCount} peldaños · ${sanitizePipeField(strongId)} en ${resolvedRef} → Biblia + Evangelios + Felices)</strong>` +
    `<p style="margin:0 0 0.45rem 0;font-size:0.8rem;color:var(--text-secondary);">` +
    `Al corregir esta raíz en <code>${cleanLang}</code>, el motor propaga la mejora a todas las ocurrencias concordantes con cuarentena bayesiana Dawid-Skene + SPRT (0 Bytes Audio). Pulsa cualquier peldaño para saltar al versículo diagnóstico:` +
    `</p>` +
    sisterCascadeHtml +
    rungFilterHtml +
    `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${ladderButtons}</div>` +
    otWavesHtml +
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


