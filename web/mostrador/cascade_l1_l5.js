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
  lamportTs = 0,
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

  // Fold into CRDT join-semilattice overlay (`Δ_L1 > Δ_L2 > Δ_L3`) for local .ekpack instant reading
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
    accepted: true,
    status: editorialStatus,
    patchId,
    lang: cleanLang,
    level: cleanLevel,
    constitutionalAxis,
    semilatticePriority: directPriority,
    posteriorTruthProb,
    promotedToCanonicalWal,
    qualifiedAffirmativeSpeakers,
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

  // Build verse -> Set(strongId) and verse -> Set(c13Onomasticon) from 15-col Array rows (`matrix_tier0.ekpack`) or Object rows
  const strongsByVerse = new Map();
  const c13ByVerse = new Map();
  for (const row of Array.isArray(matrixRows) ? matrixRows : []) {
    if (!row) continue;
    const isArr = Array.isArray(row);
    const vKey = String(isArr ? (row[0] ?? "") : (row.verse ?? row.v ?? ""));
    if (!vKey) continue;
    const st = String(isArr ? (row[4] ?? "") : (row.strong ?? row.c05_strong ?? ""))
      .trim()
      .toUpperCase();
    if (st) {
      if (!strongsByVerse.has(vKey)) strongsByVerse.set(vKey, new Set());
      for (const subSt of st.split(/[+,\s/]+/).filter(Boolean)) {
        strongsByVerse.get(vKey).add(subSt);
      }
    }
    const c13 = String(
      isArr ? (row[12] ?? row[13] ?? "") : (row.onomasticon ?? row.c13_onomasticon ?? ""),
    ).trim();
    if (c13 && c13 !== "-" && c13 !== "0") {
      if (!c13ByVerse.has(vKey)) c13ByVerse.set(vKey, new Set());
      c13ByVerse.get(vKey).add(c13);
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
    if (direct && entryPriorityRank(direct) >= CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE) {
      projected[vNum] = direct.new_surface;
      continue;
    }
    let text = String(rawText ?? "");
    const vStrongs = strongsByVerse.get(String(vNum));
    for (const r3 of l3Rules) {
      const reqStrong = String(r3.strong_id || "").toUpperCase();
      if (!reqStrong || !vStrongs || vStrongs.has(reqStrong)) {
        text = replaceAllWholeToken(text, r3.old_surface, r3.new_surface);
      }
    }
    const vC13 = c13ByVerse.get(String(vNum));
    for (const r2 of l2Rules) {
      const reqStrong = String(r2.strong_id || "").toUpperCase();
      if (!reqStrong || !vStrongs || vStrongs.has(reqStrong) || (vC13 && vC13.size > 0)) {
        text = replaceAllWholeToken(text, r2.old_surface, r2.new_surface);
      }
    }
    if (direct && direct.new_surface) {
      text = direct.new_surface;
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
  const artifact = {
    schema: "ekovoz.eco.patch.v2",
    patch_id: entry.patch_id || cascadeResult?.patchId || "PATCH-UNKNOWN",
    lang_code: entry.lang_code || cascadeResult?.lang || "stp",
    cascade_level: entry.cascade_level || cascadeResult?.level || "L2",
    constitutional_axis: entry.constitutional_axis || cascadeResult?.constitutionalAxis || "ONOMASTICON_C13_3100",
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
