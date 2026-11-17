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

const FELICES_28_PLATES_BY_VERSE = {
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
  "PSA.1.1": [25],
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
  oldSurface = "",
  newSurface = "",
  note = "",
  votes = [],
  existingOverlayEntries = [],
  validateLocksFn = null,
} = {}) {
  const cleanLang = String(lang || "stp").trim().toLowerCase();
  const cleanLevel = String(level || "L2").trim().toUpperCase();
  const levelNum = { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 }[cleanLevel] || 0;
  if (levelNum === 0) {
    return {
      accepted: false,
      status: "REJECTED_INVALID_LEVEL",
      reason: `Invalid cascade level: ${level}`,
    };
  }

  const trimmedNew = String(newSurface || "").trim();
  if (!trimmedNew) {
    return {
      accepted: false,
      status: "REJECTED_EMPTY_SURFACE",
      reason: "Lock P1: newSurface cannot be empty",
    };
  }

  if (typeof validateLocksFn === "function") {
    const lockReport = validateLocksFn({
      oldSurface: String(oldSurface || ""),
      newSurface: trimmedNew,
    });
    const locksPassed =
      lockReport && lockReport.passed !== false && lockReport.allPassed !== false;
    if (!locksPassed) {
      return {
        accepted: false,
        status: lockReport?.status || lockReport?.firstFailed || "VETO_EIGHT_LOCKS",
        reason: `Rejected by deterministic lock ${lockReport?.status || lockReport?.firstFailed || "P8"}`,
        lockReport,
      };
    }
  }

  // Dawid-Skene + SPRT posterior P(T=1 | votes) with Gold-Seed reliability filter
  const normalizedVotes = Array.isArray(votes) && votes.length > 0
    ? votes
    : [{ informantId: "local-proposer", passedGoldSeeds: true, agrees: true }];

  let logOdds = 0.0; // Prior P(T=1) = 0.50 -> log(0.5 / 0.5) = 0
  let qualifiedAffirmativeSpeakers = 0;
  for (const v of normalizedVotes) {
    if (v.passedGoldSeeds === false) {
      // Bot / uncalibrated voter: zero epistemic weight (anti-spam veto)
      continue;
    }
    const sensitivity = Number.isFinite(v.sensitivity) ? v.sensitivity : 0.82;
    const fpr = Number.isFinite(v.falsePositiveRate) ? v.falsePositiveRate : 0.12;
    if (v.agrees !== false) {
      logOdds += Math.log(sensitivity / fpr);
      qualifiedAffirmativeSpeakers += 1;
    } else {
      logOdds += Math.log((1 - sensitivity) / (1 - fpr));
    }
  }
  const posteriorTruthProb = Number((1 / (1 + Math.exp(-logOdds))).toFixed(4));
  const promotedToCanonicalWal = qualifiedAffirmativeSpeakers >= 2 && posteriorTruthProb >= 0.9;
  const editorialStatus = promotedToCanonicalWal ? "COMMUNITY_VALIDATED" : "SPEAKER_REVIEWED_QUARANTINE";

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
      for (const pl of FELICES_28_PLATES_BY_VERSE[r] || []) {
        if (!felicesPlatesTouched.includes(pl)) felicesPlatesTouched.push(pl);
      }
    }
  }

  const digestHex = fnv1aHex(
    `${cleanLang}|${cleanLevel}|${cleanRef}|${strongId}|${oldSurface}|${trimmedNew}|${note}`,
  );
  const patchId = `PATCH-${cleanLang.toUpperCase()}-${cleanLevel}-${digestHex.slice(0, 8).toUpperCase()}`;

  const ekpackOverlayEntry = {
    patch_id: patchId,
    lang_code: cleanLang,
    cascade_level: cleanLevel,
    target_ref: cleanRef,
    strong_id: String(strongId || ""),
    old_surface: String(oldSurface || ""),
    new_surface: trimmedNew,
    note_pure_text: String(note || ""),
    promoted_to_canonical_wal: promotedToCanonicalWal,
    posterior_truth_prob: posteriorTruthProb,
    editorial_status: editorialStatus,
    formulaic_parallel_refs: formulaicParallelRefs,
    evangelios_weeks_touched: evangeliosWeeksTouched,
    felices_plates_touched: felicesPlatesTouched,
    audio_bytes: 0,
    jpg_bytes: 0,
    content_hash_hex: digestHex,
  };

  // Fold into CRDT join-semilattice overlay for local .ekpack instant reading
  const overlayMap = new Map();
  for (const prev of Array.isArray(existingOverlayEntries) ? existingOverlayEntries : []) {
    if (prev && prev.target_ref) {
      overlayMap.set(`${prev.lang_code || cleanLang}:${prev.target_ref}`, prev);
    }
  }
  for (const r of touchedBibleRefs) {
    overlayMap.set(`${cleanLang}:${r}`, {
      ...ekpackOverlayEntry,
      target_ref: r,
      propagated_from: r === cleanRef ? "DIRECT" : "FORMULAIC_PARALLEL_L3",
    });
  }

  return {
    accepted: true,
    status: editorialStatus,
    patchId,
    lang: cleanLang,
    level: cleanLevel,
    posteriorTruthProb,
    promotedToCanonicalWal,
    qualifiedAffirmativeSpeakers,
    touchedBibleRefs,
    formulaicParallelRefs,
    evangeliosWeeksTouched,
    felicesPlatesTouched,
    ekpackOverlayEntry,
    foldedOverlayEntries: Array.from(overlayMap.values()),
  };
}
