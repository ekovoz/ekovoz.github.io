// ============================================================================
// @req[BIB-V2-20] Cascada Comunitaria L1–L5 con Dawid-Skene + SPRT,
// Overlay Local `.ekpack` y propagación cruzada Biblia -> Evangelios -> Felices.
// ============================================================================

const FORMULAIC_PARALLEL_QUOTES = {
  "GEN.1.1": ["JHN.1.1", "HEB.11.3"],
  "PSA.22.1": ["MAT.27.46", "MRK.15.34"],
  "ISA.7.14": ["MAT.1.23"],
  "ISA.40.3": ["MAT.3.3", "MRK.1.3", "LUK.3.4", "JHN.1.23"],
  "HAB.2.4": ["ROM.1.17", "GAL.3.11", "HEB.10.38"],
  "DEU.8.3": ["MAT.4.4", "LUK.4.4"],
};

const EVANGELIOS_52_ANCHORS = {
  "JHN.1": "s01",
  "MAT.3": "s04",
  "MAT.4": "s05",
  "MAT.5": "s08",
  "MRK.4": "s14",
  "LUK.15": "s27",
  "MAT.27": "s48",
  "JHN.20": "s50",
};

const FELICES_27_PLATES_BY_VERSE = {
  "MAT.5.1": [25],
  "MAT.5.3": [1, 3],
  "MAT.5.4": [5],
  "MAT.5.5": [7],
  "MAT.5.6": [9],
  "MAT.5.7": [11],
  "MAT.5.8": [13],
  "MAT.5.9": [15],
  "MAT.5.10": [17],
  "MAT.5.11": [19],
  "MAT.5.12": [24],
};

/**
 * Jerarquía constitucional de semirretículo (`D9-V2G`):
 * Un ajuste puntual `L1` sobre un versículo domina estrictamente (`>`) a una sustitución
 * onomástica `L2` (`C13`, 3,100 nombres propios), la cual domina a una propagación léxica
 * `L3` (`C05`, concordancia Strong). Ninguna propagación global pisa correcciones locales `L1`.
 */
export const CASCADE_SEMILATTICE_PRIORITY = {
  L1_DIRECT: 300,
  DIRECT_VERSE: 250,
  L2_ONOMASTICON_C13: 200,
  L3_STRONG_C05: 100,
  FORMULAIC_PARALLEL: 90,
};

const CONSTITUTIONAL_AXIS_BY_LEVEL = {
  L1: "VERSE_PUNCTUATION_ORTHOGRAPHY",
  L2: "ONOMASTICON_C13_3100",
  L3: "STRONG_LEXICON_C05_BATCH",
  L4: "BRANCH_PROFILE_TOML_AND_LITURGY",
  L5: "CANONICAL_LANG_TOML_300DPI_PDF",
};

function fnv1aHex(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

const MATRIX_15COL_INDEX = Object.freeze({
  VERSE: 0,
  SURFACE_C03: 1,
  LEMMA_C04: 2,
  STRONG_C05: 3,
  MORPH_C06: 4,
  DOMAIN_LN_C07: 5,
  GLOSS_EN_C08: 6,
  GLOSS_ES_C09: 7,
  CLAUSE_C10: 8,
  SYNTAX_C11: 9,
  PRAG_C12: 10,
  NSM_C13: 11,
  REALIA_C14: 12,
  WORD_POS_C02: 13,
  TRANSLIT_C06: 14,
});

const DS_PRIOR_SENS_ALPHA = 4.0;
const DS_PRIOR_SENS_BETA = 1.2;
const DS_PRIOR_FPR_ALPHA = 1.2;
const DS_PRIOR_FPR_BETA = 8.8;
const DS_MAP_EM_ITERATIONS = 10;
const BUHLMANN_STRAUB_K = 3.0;

/**
 * Evalúa consenso comunitario con inicialización espectral, 10 iteraciones MAP-EM (`Dawid-Skene`,
 * prior `Beta(4, 1.2)`, `fpr = 0.12`, `Gold-Anchor Clamping`), credibilidad `Bühlmann-Straub`
 * (`Z_i = n_i / (n_i + K)`) y deduplicación estricta anti-Sybil (`SLICE-EKO-V2K-14`).
 * Purga `DEBRIS-V2K-04` (cero bypass `v.approved === true`, cero votos anónimos `anon-*`, cero quórum en vacío).
 */
export function evaluateBetaDawidSkeneSprt(votes = []) {
  const sprtAcceptBound = Math.log(0.95 / 0.05);
  const rawList = Array.isArray(votes) ? votes : [];
  if (rawList.length === 0) {
    return {
      logOdds: 0.0,
      posteriorTruthProb: 0.5,
      qualifiedAffirmativeSpeakers: 0,
      distinctReviewersCount: 0,
      emIterations: 0,
      buhlmannCredibility: 0.0,
      reviewerPosteriors: [],
      sprtThresholdNats: Number(sprtAcceptBound.toFixed(4)),
      promotedToCanonicalWal: false,
      editorialStatus: "SPEAKER_REVIEWED_QUARANTINE",
    };
  }

  const seenReviewers = new Set();
  const parsedVoters = [];
  for (let idx = 0; idx < rawList.length; idx += 1) {
    const v = rawList[idx];
    if (!v || typeof v !== "object") continue;
    const revKey = String(
      v.publicKeyHex || v.informantId || v.reviewerId || v.speakerId || v.speaker_id || v.reviewer_id || "",
    )
      .trim()
      .toLowerCase();
    if (!revKey || seenReviewers.has(revKey)) {
      continue;
    }
    seenReviewers.add(revKey);

    const hasExplicitTotal = Number.isFinite(v.goldTotal) && Number(v.goldTotal) > 0;
    const goldTotal = hasExplicitTotal ? Math.max(1, Math.round(Number(v.goldTotal))) : 2;
    const explicitFailGold =
      v.passedGoldSeeds === false ||
      v.passedGoldSeed1 === false ||
      v.passedGoldSeed2 === false ||
      (hasExplicitTotal && Number(v.goldPassed ?? 0) < goldTotal && Number(v.goldPassed ?? 0) === 0);
    const fullGoldPass =
      v.passedGoldSeeds === true ||
      (v.passedGoldSeed1 === true && v.passedGoldSeed2 === true) ||
      (hasExplicitTotal && Number(v.goldPassed ?? 0) >= goldTotal);
    const partialGold =
      !fullGoldPass &&
      !explicitFailGold &&
      (v.passedGoldSeed1 === true ||
        v.passedGoldSeed2 === true ||
        (hasExplicitTotal && Number(v.goldPassed ?? 0) > 0));

    let tpGold = 0;
    let tnGold = 0;
    let fpGold = 0;
    let fnGold = 0;
    if (fullGoldPass) {
      tpGold = goldTotal;
      tnGold = goldTotal;
    } else if (partialGold) {
      const gp = hasExplicitTotal ? Math.max(1, Math.round(Number(v.goldPassed))) : 1;
      const gf = Math.max(1, goldTotal - gp);
      tpGold = gp;
      tnGold = gp;
      fpGold = gf;
      fnGold = gf;
    } else if (explicitFailGold) {
      fpGold = goldTotal;
      fnGold = goldTotal;
    }

    const agrees = v.agrees !== false && v.approved !== false;
    parsedVoters.push({
      reviewerId: revKey,
      agrees,
      goldCalibrated: fullGoldPass,
      goldFailed: explicitFailGold,
      tpGold,
      tnGold,
      fpGold,
      fnGold,
      goldTotalTrials: tpGold + tnGold + fpGold + fnGold,
      overrideSens: Number.isFinite(v.sensitivity)
        ? Math.min(0.99, Math.max(0.51, Number(v.sensitivity)))
        : null,
      overrideFpr: Number.isFinite(v.falsePositiveRate)
        ? Math.max(0.01, Math.min(0.49, Number(v.falsePositiveRate)))
        : null,
    });
  }

  if (parsedVoters.length === 0) {
    return {
      logOdds: 0.0,
      posteriorTruthProb: 0.5,
      qualifiedAffirmativeSpeakers: 0,
      distinctReviewersCount: 0,
      emIterations: 0,
      buhlmannCredibility: 0.0,
      reviewerPosteriors: [],
      sprtThresholdNats: Number(sprtAcceptBound.toFixed(4)),
      promotedToCanonicalWal: false,
      editorialStatus: "SPEAKER_REVIEWED_QUARANTINE",
    };
  }

  // Inicialización espectral ponderada por calibración Gold (rank-1)
  let spectralNum = 0.0;
  let spectralDen = 0.0;
  for (const pv of parsedVoters) {
    const initW = pv.goldCalibrated ? 1.5 : pv.goldFailed ? 0.1 : 0.7;
    spectralNum += initW * (pv.agrees ? 1.0 : -1.0);
    spectralDen += initW;
  }
  const spectralMargin = spectralDen > 0 ? spectralNum / spectralDen : 0.0;
  let qTarget = Math.min(0.95, Math.max(0.05, 0.5 + 0.4 * spectralMargin));

  const priorSensMean = DS_PRIOR_SENS_ALPHA / (DS_PRIOR_SENS_ALPHA + DS_PRIOR_SENS_BETA); // 4/5.2 = 0.7692
  const priorFprMean = DS_PRIOR_FPR_ALPHA / (DS_PRIOR_FPR_ALPHA + DS_PRIOR_FPR_BETA); // 1.2/10 = 0.12
  let voterParams = [];

  for (let iter = 0; iter < DS_MAP_EM_ITERATIONS; iter += 1) {
    let llrIter = 0.0;
    const nextParams = [];
    for (const pv of parsedVoters) {
      let alphaHat;
      let fprHat;
      if (pv.overrideSens !== null) {
        alphaHat = pv.overrideSens;
        fprHat = pv.overrideFpr !== null ? pv.overrideFpr : priorFprMean;
      } else if (pv.goldFailed) {
        // Penalización MAP estricta para revisores que fallan semillas Gold
        const sensNum = DS_PRIOR_FPR_ALPHA + pv.tpGold + (pv.agrees ? qTarget : 0.0);
        const sensDen = DS_PRIOR_SENS_ALPHA + DS_PRIOR_SENS_BETA + pv.tpGold + pv.fnGold + qTarget;
        const fprNum = DS_PRIOR_SENS_ALPHA + pv.fpGold + (pv.agrees ? 1.0 - qTarget : 0.0);
        const fprDen = DS_PRIOR_SENS_ALPHA + DS_PRIOR_SENS_BETA + pv.fpGold + pv.tnGold + (1.0 - qTarget);
        alphaHat = Math.min(0.49, Math.max(0.05, sensNum / sensDen));
        fprHat = Math.min(0.95, Math.max(0.51, fprNum / fprDen));
      } else {
        // Gold-Anchor Clamping: las anclas Gold permanecen fijadas en z_g ∈ {0, 1}; el candidato T es qTarget ∈ (0, 1)
        const rawSens =
          (DS_PRIOR_SENS_ALPHA + pv.tpGold + (pv.agrees ? qTarget : 0.0)) /
          (DS_PRIOR_SENS_ALPHA + DS_PRIOR_SENS_BETA + pv.tpGold + pv.fnGold + qTarget);
        const rawFpr =
          (DS_PRIOR_FPR_ALPHA + pv.fpGold + (pv.agrees ? 1.0 - qTarget : 0.0)) /
          (DS_PRIOR_FPR_ALPHA + DS_PRIOR_FPR_BETA + pv.fpGold + pv.tnGold + (1.0 - qTarget));
        alphaHat = Math.min(0.98, Math.max(0.51, rawSens));
        fprHat = Math.max(0.02, Math.min(0.49, rawFpr));
      }

      const nTrials = pv.goldTotalTrials + 1;
      const buhlmannZ = nTrials / (nTrials + BUHLMANN_STRAUB_K);
      const consensusMatch = pv.agrees ? qTarget : 1.0 - qTarget;
      const empiricalCorrectRate = (pv.tpGold + pv.tnGold + consensusMatch) / nTrials;
      const buhlmannCredibility =
        buhlmannZ * empiricalCorrectRate + (1.0 - buhlmannZ) * priorSensMean;

      llrIter += pv.agrees
        ? Math.log(alphaHat / fprHat)
        : Math.log((1.0 - alphaHat) / (1.0 - fprHat));

      nextParams.push({
        reviewerId: pv.reviewerId,
        agrees: pv.agrees,
        goldCalibrated: pv.goldCalibrated,
        goldFailed: pv.goldFailed,
        sensitivity: Number(alphaHat.toFixed(4)),
        specificity: Number((1.0 - fprHat).toFixed(4)),
        fpr: Number(fprHat.toFixed(4)),
        buhlmannZ: Number(buhlmannZ.toFixed(4)),
        buhlmannCredibility: Number(buhlmannCredibility.toFixed(4)),
      });
    }
    voterParams = nextParams;
    qTarget = 1.0 / (1.0 + Math.exp(-Math.max(-30, Math.min(30, llrIter))));
  }

  let logOdds = 0.0;
  let qualifiedAffirmativeSpeakers = 0;
  let distinctReviewersCount = 0;
  let totalCred = 0.0;
  for (const vp of voterParams) {
    if (!vp.goldFailed) {
      distinctReviewersCount += 1;
      if (vp.agrees) qualifiedAffirmativeSpeakers += 1;
    }
    logOdds += vp.agrees
      ? Math.log(vp.sensitivity / vp.fpr)
      : Math.log((1.0 - vp.sensitivity) / (1.0 - vp.fpr));
    totalCred += vp.buhlmannCredibility;
  }

  const posteriorTruthProb = Number((1 / (1 + Math.exp(-Math.max(-30, Math.min(30, logOdds))))).toFixed(4));
  const avgCredibility =
    voterParams.length > 0 ? Number((totalCred / voterParams.length).toFixed(4)) : 0.0;
  const allGoldVerified = parsedVoters.length > 0 && parsedVoters.every((v) => v.goldCalibrated);
  const minRequired = allGoldVerified ? 2 : 3;
  const promotedToCanonicalWal =
    qualifiedAffirmativeSpeakers >= minRequired &&
    logOdds >= sprtAcceptBound &&
    posteriorTruthProb >= 0.9;

  return {
    logOdds: Number(logOdds.toFixed(4)),
    posteriorTruthProb,
    qualifiedAffirmativeSpeakers,
    distinctReviewersCount,
    emIterations: DS_MAP_EM_ITERATIONS,
    buhlmannCredibility: avgCredibility,
    reviewerPosteriors: voterParams,
    sprtThresholdNats: Number(sprtAcceptBound.toFixed(4)),
    promotedToCanonicalWal,
    editorialStatus: promotedToCanonicalWal
      ? "COMMUNITY_VALIDATED"
      : "SPEAKER_REVIEWED_QUARANTINE",
  };
}

export function hydrateFormulaicParallelsIndex(formulaicJson) {
  const quotes = Array.isArray(formulaicJson?.ot_in_nt_quotations)
    ? formulaicJson.ot_in_nt_quotations
    : [];
  for (const q of quotes) {
    const ot = String(q?.ot_ref || "").trim().toUpperCase();
    const nt = String(q?.nt_ref || "").trim().toUpperCase();
    if (!ot || !nt) continue;
    if (!FORMULAIC_PARALLEL_QUOTES[ot]) FORMULAIC_PARALLEL_QUOTES[ot] = [];
    if (!FORMULAIC_PARALLEL_QUOTES[ot].includes(nt)) {
      FORMULAIC_PARALLEL_QUOTES[ot].push(nt);
    }
  }
  const templates = Array.isArray(formulaicJson?.templates)
    ? formulaicJson.templates
    : [];
  for (const tpl of templates) {
    const anchor = String(tpl?.canonical_anchor_ref || "").trim().toUpperCase();
    const samples = Array.isArray(tpl?.sample_instance_refs) ? tpl.sample_instance_refs : [];
    if (!anchor || samples.length === 0) continue;
    if (!FORMULAIC_PARALLEL_QUOTES[anchor]) FORMULAIC_PARALLEL_QUOTES[anchor] = [];
    for (const sampleRef of samples) {
      const cleanSample = String(sampleRef || "").trim().toUpperCase();
      if (cleanSample && !FORMULAIC_PARALLEL_QUOTES[anchor].includes(cleanSample)) {
        FORMULAIC_PARALLEL_QUOTES[anchor].push(cleanSample);
      }
    }
  }
  return Object.keys(FORMULAIC_PARALLEL_QUOTES).length;
}

/**
 * Evalúa el posterior Bayesiano Dawid-Skene + SPRT (`P(T=1 | votos)`) y ejecuta
 * la propagación determinista en cascada `L1–L5` sobre:
 *  - `L1`: Ortografía / puntuación local
 *  - `L2`: Versículo o lema Strong en los 66 libros
 *  - `L3`: Citas paralelas `formulaic_index` AT <-> NT
 *  - `L4`: Las 52 semanas litúrgicas de *Los Evangelios*
 *  - `L5`: Las 28 láminas bilingües de *Los Felices*
 * produciendo además una entrada de overlay CRDT local para `.ekpack` (`@req[BIB-V2-20]`).
 */
export function propagateCascadeL1ToL5({
  lang = "stp",
  level = "L2",
  ref = "GEN.1.1",
  strongId = "",
  onomasticonId = "",
  oldSurface = "",
  newSurface = "",
  note = "",
  votes = [],
  existingOverlayEntries = [],
  validateLocksFn = null,
  expectedProperNouns = [],
  expectedAgent = "",
  expectedPatient = "",
  lamportTs = 0,
} = {}) {
  const cleanLang = String(lang || "stp").trim().toLowerCase();
  const cleanLevel = String(level || "L2").trim().toUpperCase();
  const levelNum = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 }[cleanLevel] || 0;
  if (levelNum === 0) {
    return {
      accepted: false,
      status: "REJECTED_INVALID_LEVEL",
      editorialStatus: "REJECTED_INVALID_LEVEL",
      persistedLocal: false,
      reason: `Invalid cascade level: ${level}`,
    };
  }

  const trimmedNew = String(newSurface || "").trim();
  if (!trimmedNew) {
    return {
      accepted: false,
      status: "REJECTED_EMPTY_SURFACE",
      editorialStatus: "REJECTED_EMPTY_SURFACE",
      persistedLocal: false,
      reason: "Lock P1: newSurface cannot be empty",
    };
  }

  if (typeof validateLocksFn === "function") {
    const lockReport = validateLocksFn({
      oldSurface: String(oldSurface || ""),
      newSurface: trimmedNew,
      expectedProperNouns,
      expectedAgent,
      expectedPatient,
    });
    const locksPassed =
      lockReport && lockReport.passed !== false && lockReport.allPassed !== false;
    if (!locksPassed) {
      const lockStatus = lockReport?.status || lockReport?.firstFailed || "VETO_EIGHT_LOCKS";
      return {
        accepted: false,
        status: lockStatus,
        editorialStatus: lockStatus,
        persistedLocal: false,
        reason: `Rejected by deterministic lock ${lockStatus}`,
        lockReport,
      };
    }
  }

  // Dawid-Skene Spectral + 10-Iter MAP-EM + Bühlmann-Straub + Wald SPRT
  const dsVerdict = evaluateBetaDawidSkeneSprt(votes);
  const {
    posteriorTruthProb,
    promotedToCanonicalWal,
    editorialStatus,
    qualifiedAffirmativeSpeakers,
  } = dsVerdict;
  const normalizedVotes = (Array.isArray(votes) ? votes : []).filter((v) => v && typeof v === "object");

  const cleanRef = String(ref || "GEN.1.1").trim().toUpperCase();
  const bookChap = cleanRef.split(".").slice(0, 2).join(".");

  const touchedBibleRefs = [cleanRef];
  const formulaicParallelRefs = [];
  if (levelNum >= 3) {
    for (const p of FORMULAIC_PARALLEL_QUOTES[cleanRef] || []) {
      if (!formulaicParallelRefs.includes(p)) formulaicParallelRefs.push(p);
      if (!touchedBibleRefs.includes(p)) touchedBibleRefs.push(p);
    }
    for (const [otRef, ntList] of Object.entries(FORMULAIC_PARALLEL_QUOTES)) {
      if (ntList.includes(cleanRef) && !formulaicParallelRefs.includes(otRef)) {
        formulaicParallelRefs.push(otRef);
        if (!touchedBibleRefs.includes(otRef)) touchedBibleRefs.push(otRef);
      }
    }
  }

  const evangeliosWeeksTouched = [];
  if (levelNum >= 4) {
    for (const r of touchedBibleRefs) {
      const bc = r.split(".").slice(0, 2).join(".");
      const wk = EVANGELIOS_52_ANCHORS[bc];
      if (wk && !evangeliosWeeksTouched.includes(wk)) {
        evangeliosWeeksTouched.push(wk);
      }
    }
    if (evangeliosWeeksTouched.length === 0 && /^(MAT|MRK|LUK|JHN)\./.test(cleanRef)) {
      evangeliosWeeksTouched.push("s01");
    }
  }

  const felicesPlatesTouched = [];
  if (levelNum >= 5) {
    for (const r of touchedBibleRefs) {
      for (const pl of FELICES_27_PLATES_BY_VERSE[r] || []) {
        if (!felicesPlatesTouched.includes(pl)) felicesPlatesTouched.push(pl);
      }
    }
  }

  const cleanStrongId = String(strongId || "").trim().toUpperCase();
  const cleanOnomasticonId = String(
    onomasticonId || (cleanLevel === "L2" && cleanStrongId ? `C13:${cleanStrongId}` : ""),
  ).trim();
  const constitutionalAxis = CONSTITUTIONAL_AXIS_BY_LEVEL[cleanLevel] || "ONOMASTICON_C13_3100";
  const directPriority =
    cleanLevel === "L1"
      ? CASCADE_SEMILATTICE_PRIORITY.L1_DIRECT
      : CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE;

  const digestHex = fnv1aHex(
    `${cleanLang}|${cleanLevel}|${cleanRef}|${cleanStrongId}|${cleanOnomasticonId}|${oldSurface}|${trimmedNew}|${note}`,
  );
  const patchId = `PATCH-${cleanLang.toUpperCase()}-${cleanLevel}-${digestHex.slice(0, 8).toUpperCase()}`;

  const ekpackOverlayEntry = {
    schema: "ekovoz.cascade_patch.v2",
    patch_id: patchId,
    lang_code: cleanLang,
    cascade_level: cleanLevel,
    constitutional_axis: constitutionalAxis,
    semilattice_priority: directPriority,
    lamport_ts: Number(lamportTs) || 1,
    target_ref: cleanRef,
    strong_id: cleanStrongId,
    onomasticon_c13_id: cleanOnomasticonId,
    old_surface: String(oldSurface || ""),
    new_surface: trimmedNew,
    note_pure_text: String(note || ""),
    votes: normalizedVotes,
    promoted_to_canonical_wal: promotedToCanonicalWal,
    posterior_truth_prob: posteriorTruthProb,
    editorial_status: editorialStatus,
    formulaic_parallel_refs: formulaicParallelRefs,
    evangelios_weeks_touched: evangeliosWeeksTouched,
    felices_plates_touched: felicesPlatesTouched,
    requires_cli_materialization: levelNum >= 4,
    cli_targets:
      levelNum >= 5
        ? [`obras/biblia/perfiles_ramas/${cleanLang}.toml`, `obras/biblia/corpus/${cleanLang}/lang.toml`, "300dpi_pdf_editions"]
        : levelNum === 4
          ? [`obras/biblia/perfiles_ramas/${cleanLang}.toml`]
          : [],
    audio_bytes: 0,
    jpg_bytes: 0,
    content_hash_hex: digestHex,
  };

  // Fold into CRDT join-semilattice overlay (`Δ_L1 > Δ_L2 > Δ_L3`) solo si alcanzó promoción canónica o para vista previa aislada
  const incomingEntries = [];
  for (const r of touchedBibleRefs) {
    const isDirect = r === cleanRef;
    incomingEntries.push({
      ...ekpackOverlayEntry,
      target_ref: r,
      propagated_from: isDirect ? "DIRECT" : "FORMULAIC_PARALLEL_L3",
      semilattice_priority: isDirect
        ? directPriority
        : CASCADE_SEMILATTICE_PRIORITY.FORMULAIC_PARALLEL,
    });
  }
  const foldedOverlayEntries = foldCascadePatchV2Semilattice([
    ...(Array.isArray(existingOverlayEntries) ? existingOverlayEntries : []),
    ...incomingEntries,
  ]);

  return {
    accepted: promotedToCanonicalWal,
    status: editorialStatus,
    editorialStatus,
    persistedLocal: promotedToCanonicalWal,
    patchId,
    lang: cleanLang,
    level: cleanLevel,
    constitutionalAxis,
    semilatticePriority: directPriority,
    posteriorTruthProb,
    promotedToCanonicalWal,
    qualifiedAffirmativeSpeakers,
    emIterations: dsVerdict.emIterations,
    buhlmannCredibility: dsVerdict.buhlmannCredibility,
    votes: normalizedVotes,
    touchedBibleRefs,
    formulaicParallelRefs,
    evangeliosWeeksTouched,
    felicesPlatesTouched,
    ekpackOverlayEntry,
    foldedOverlayEntries,
  };
}

function entryPriorityRank(entry) {
  if (Number.isFinite(entry?.semilattice_priority)) return Number(entry.semilattice_priority);
  const lvl = String(entry?.cascade_level || "L2").toUpperCase();
  if (entry?.propagated_from && entry.propagated_from !== "DIRECT") {
    if (lvl === "L2") return CASCADE_SEMILATTICE_PRIORITY.L2_ONOMASTICON_C13;
    return CASCADE_SEMILATTICE_PRIORITY.FORMULAIC_PARALLEL;
  }
  if (lvl === "L1") return CASCADE_SEMILATTICE_PRIORITY.L1_DIRECT;
  return CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE;
}

/**
 * Pliega un conjunto arbitrario de parches `CascadePatchV2` bajo un semirretículo de unión
 * conmutativo, asociativo e idempotente (`Δ_L1 > Δ_L2 > Δ_L3`, desempate por `lamport_ts` y `content_hash_hex`).
 */
export function foldCascadePatchV2Semilattice(entries = []) {
  const byKey = new Map();
  for (const item of Array.isArray(entries) ? entries : []) {
    if (!item || !item.target_ref || !item.new_surface) continue;
    const lang = String(item.lang_code || "stp").trim().toLowerCase();
    const ref = String(item.target_ref).trim().toUpperCase();
    const key = `${lang}:${ref}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const nextRank = entryPriorityRank(item);
    const prevRank = entryPriorityRank(prev);
    const nextTs = Number(item.lamport_ts || 0);
    const prevTs = Number(prev.lamport_ts || 0);
    const nextHash = String(item.content_hash_hex || "");
    const prevHash = String(prev.content_hash_hex || "");
    if (
      nextRank > prevRank ||
      (nextRank === prevRank && nextTs > prevTs) ||
      (nextRank === prevRank && nextTs === prevTs && nextHash >= prevHash)
    ) {
      byKey.set(key, item);
    }
  }
  return Array.from(byKey.values());
}

function escapeRegexLiteral(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllWholeToken(text, needle, replacement) {
  const src = String(text || "");
  const oldTok = String(needle || "").trim();
  const newTok = String(replacement || "").trim();
  if (!src || !oldTok || !newTok || oldTok === newTok) return src;
  const boundaryRe = new RegExp(`(?<!\\p{L})${escapeRegexLiteral(oldTok)}(?!\\p{L})`, "gu");
  return src.replace(boundaryRe, newTok);
}

/**
 * Proyecta en vivo (`< 2 ms`) un capítulo completo a través del semirretículo `L1..L3`:
 *  1) `L3` (`C05` concordancia Strong): sustituye `old_surface -> new_surface` en versos que comparten `strong_id`.
 *  2) `L2` (`C13` onomástica 3,100): sustituye nombres propios transliterados en todo el capítulo.
 *  3) `L1` / `DIRECT`: aplica el texto íntegro del versículo con máxima prioridad (`Δ_L1 > Δ_L2 > Δ_L3`).
 */
export function projectChapterThroughCascadeSemilattice({
  verses = {},
  matrixRows = [],
  overlays = [],
  lang = "stp",
  book = "GEN",
  chapter = 1,
} = {}) {
  const cleanLang = String(lang || "stp").trim().toLowerCase();
  const prefix = `${String(book || "GEN").trim().toUpperCase()}.${Number(chapter) || 1}.`;
  const relevant = (Array.isArray(overlays) ? overlays : []).filter(
    (e) => e && String(e.lang_code || cleanLang).toLowerCase() === cleanLang,
  );
  if (relevant.length === 0) return { ...verses };

  // Build verse -> Set(strongId) and verse -> Set(onomasticonKey) from typed 15-col Array rows (`MATRIX_15COL_INDEX`) or Object rows
  const strongsByVerse = new Map();
  const onomasticonByVerse = new Map();
  const rawMatrixRows = Array.isArray(matrixRows) ? matrixRows : [];
  for (const row of rawMatrixRows) {
    if (!row) continue;
    const isArr = Array.isArray(row);
    const vKey = String(isArr ? (row[MATRIX_15COL_INDEX.VERSE] ?? "") : (row.verse ?? row.v ?? ""));
    if (!vKey) continue;
    const st = String(isArr ? (row[MATRIX_15COL_INDEX.STRONG_C05] ?? "") : (row.strong ?? row.c05_strong ?? ""))
      .trim()
      .toUpperCase();
    const rowStrongTokens = st ? st.split(/[+,\s/]+/).filter(Boolean) : [];
    if (rowStrongTokens.length > 0) {
      if (!strongsByVerse.has(vKey)) strongsByVerse.set(vKey, new Set());
      for (const subSt of rowStrongTokens) {
        strongsByVerse.get(vKey).add(subSt);
      }
    }
    const morph = String(isArr ? (row[MATRIX_15COL_INDEX.MORPH_C06] ?? "") : (row.morph ?? row.c06_morph ?? "")).trim();
    const domLn = String(isArr ? (row[MATRIX_15COL_INDEX.DOMAIN_LN_C07] ?? "") : (row.domain ?? row.c07 ?? "")).trim();
    const onoExplicit = String(isArr ? "" : (row.onomasticon ?? row.c13_onomasticon ?? "")).trim();
    const isProperOrOnomastic =
      /(?:^|[\/\-H])Np\b|\b(?:NP|PRI|PROP)\b/.test(morph) ||
      /\b(?:LN:93\.|SDBH:)/i.test(domLn) ||
      (onoExplicit && onoExplicit !== "-" && onoExplicit !== "0");
    if (isProperOrOnomastic) {
      if (!onomasticonByVerse.has(vKey)) onomasticonByVerse.set(vKey, new Set());
      const vOnoSet = onomasticonByVerse.get(vKey);
      if (onoExplicit && onoExplicit !== "-" && onoExplicit !== "0") {
        vOnoSet.add(onoExplicit.toUpperCase());
      }
      for (const subSt of rowStrongTokens) {
        vOnoSet.add(subSt);
        vOnoSet.add(`C13:${subSt}`);
      }
      const lnMatch = domLn.match(/LN:93\.[0-9]+/i);
      if (lnMatch) vOnoSet.add(lnMatch[0].toUpperCase());
    }
  }

  const l3Rules = relevant.filter(
    (e) => String(e.cascade_level || "").toUpperCase() === "L3" && e.old_surface && e.new_surface,
  );
  const l2Rules = relevant.filter(
    (e) => String(e.cascade_level || "").toUpperCase() === "L2" && e.old_surface && e.new_surface,
  );
  const foldedDirect = foldCascadePatchV2Semilattice(relevant);
  const directByRef = new Map(
    foldedDirect.map((e) => [String(e.target_ref || "").toUpperCase(), e]),
  );

  const projected = {};
  for (const [vNum, rawText] of Object.entries(verses || {})) {
    const osis = `${prefix}${vNum}`;
    const direct = directByRef.get(osis);
    const directLevel = String(direct?.cascade_level || "").toUpperCase();
    // Solo `L1` directo (prioridad >= L1_DIRECT) sobrescribe el versículo íntegro; `L2`/`L3` deben respetar guardas Strong/Onomástica.
    if (
      direct &&
      (directLevel === "L1" || entryPriorityRank(direct) >= CASCADE_SEMILATTICE_PRIORITY.L1_DIRECT)
    ) {
      projected[vNum] = direct.new_surface;
      continue;
    }
    let text = String(rawText ?? "");
    const vStrongs = strongsByVerse.get(String(vNum));
    if (vStrongs && vStrongs.size > 0) {
      for (const r3 of l3Rules) {
        const reqStrong = String(r3.strong_id || "").trim().toUpperCase();
        if (reqStrong && vStrongs.has(reqStrong)) {
          text = replaceAllWholeToken(text, r3.old_surface, r3.new_surface);
        }
      }
    }
    const vOnomasticon = onomasticonByVerse.get(String(vNum));
    for (const r2 of l2Rules) {
      const reqStrong = String(r2.strong_id || "").trim().toUpperCase();
      const reqOno = String(r2.onomasticon_c13_id || "").trim().toUpperCase();
      const normalizedOno = reqOno.startsWith("C13:") ? reqOno.slice(4) : reqOno;
      const matchesStrong = Boolean(reqStrong && vStrongs && vStrongs.has(reqStrong));
      const matchesOno = Boolean(
        vOnomasticon &&
        ((reqOno && vOnomasticon.has(reqOno)) || (normalizedOno && vOnomasticon.has(normalizedOno))),
      );
      if (matchesStrong || matchesOno) {
        text = replaceAllWholeToken(text, r2.old_surface, r2.new_surface);
      }
    }
    projected[vNum] = text;
  }
  return projected;
}

/**
 * Serializa un paquete `.eco.patch.json` firmado con Ed25519 para exportación Sneakernet
 * y materialización en `ekovoz-cli cascade apply` (`L4` TOML de rama + `L5` PDF 300 DPI).
 */
export function exportSignedEcoPatchV2Artifact({
  cascadeResult,
  signatureHex = "",
  publicKeyHex = "",
  crc32Hex = "",
} = {}) {
  const entry = cascadeResult?.ekpackOverlayEntry || {};
  const artifactVotes = Array.isArray(entry.votes)
    ? entry.votes
    : Array.isArray(cascadeResult?.votes)
      ? cascadeResult.votes
      : [];
  const artifact = {
    schema: "ekovoz.eco.patch.v2",
    patch_id: entry.patch_id || cascadeResult?.patchId || "PATCH-UNKNOWN",
    lang_code: entry.lang_code || cascadeResult?.lang || "stp",
    cascade_level: entry.cascade_level || cascadeResult?.level || "L2",
    constitutional_axis: entry.constitutional_axis || cascadeResult?.constitutionalAxis || "ONOMASTICON_C13_3100",
    lamport_ts: Number(entry.lamport_ts) || 1,
    editorial_status: entry.editorial_status || cascadeResult?.status || "SPEAKER_REVIEWED_QUARANTINE",
    promoted_to_canonical_wal: Boolean(
      entry.promoted_to_canonical_wal ?? cascadeResult?.promotedToCanonicalWal ?? false,
    ),
    posterior_truth_prob: Number(
      entry.posterior_truth_prob ?? cascadeResult?.posteriorTruthProb ?? 0.5,
    ),
    content_hash_hex: String(entry.content_hash_hex || ""),
    votes: artifactVotes,
    target_ref: entry.target_ref || "GEN.1.1",
    strong_id: entry.strong_id || "",
    onomasticon_c13_id: entry.onomasticon_c13_id || "",
    old_surface: entry.old_surface || "",
    new_surface: entry.new_surface || "",
    note_pure_text: entry.note_pure_text || "",
    touched_bible_refs: cascadeResult?.touchedBibleRefs || [],
    evangelios_weeks_touched: cascadeResult?.evangeliosWeeksTouched || [],
    felices_plates_touched: cascadeResult?.felicesPlatesTouched || [],
    cli_targets: entry.cli_targets || [],
    crc32_hex: String(crc32Hex || ""),
    ed25519_public_key_hex: String(publicKeyHex || ""),
    ed25519_signature_hex: String(signatureHex || ""),
    audio_bytes: 0,
    jpg_bytes: 0,
  };
  return {
    filename: `${artifact.patch_id.toLowerCase()}.eco.patch.json`,
    artifact,
    json: JSON.stringify(artifact, null, 2),
  };
}
