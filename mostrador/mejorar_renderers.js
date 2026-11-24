// Renderizadores puros de HTML para el Taller de Campo, Escalera CELF-250,
// Explorador Léxico O'dam y Catálogo de Artefactos CC0 (`D11-V2C`, ∂(C)=0, 0 ciclos ESM).

import {
  renderCrdtWalAndLockP2AuditCardHtml,
  renderFieldWorkshopCensus7164Html,
  renderMasterCensus7164CardHtml,
} from "./drawer_hydrators.js";
import {
  CANONICAL_5_OT_TRANSLATION_WAVES,
  CASCADE_LEVELS,
  CRDT_WAL_SEMILATTICE,
  EXTERNAL_AUDIT_8_LOCKS,
  FIELD_WORKSHOP_STP_LEXICON,
  FLOOR_1_SENTENCE_SPEC,
  KEY_TERMS_GLOSSARY,
  MASTER_CENSUS_SUMMARY,
  PATCH_JOURNAL_LOCK_P2,
  ROOT_NOTES_STP,
  STP_LEDGER_SUMMARY,
  STRONG_CONCORDANCE_COUNTS,
  TALLER_CC0_ARTIFACTS,
  TIER3A_CONTINUUMS,
  UNCERTAINTY_QUEUE_60,
  buildElicitationSeedPayload,
  buildPatchPayload,
  computeSisterWorksCascade,
  sanitizePipeField,
  selectTopEntropyVerseQueue,
  validateAllEightLocksPda,
  verifyLock8PredicativeAndNegation,
} from "./mejorar_locks_pda.js";

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

export const IMPROVE_I18N_FALLBACKS_ES = {
  "improve.title": "Proponer mejora de traducción (L1–L5)",
  "improve.subtitle": "Parche determinista en texto plano (0 Bytes Audio · CC0)",
  "improve.kind_label": "Objetivo:",
  "improve.kind_verse": "Versículo bíblico / Raíz Strong",
  "improve.kind_ui": "Texto de interfaz",
  "improve.level_label": "Nivel de cascada:",
  "improve.level.L1": "L1 · Puntuación / Ortografía",
  "improve.level.L2": "L2 · Glosa léxica (Raíz Strong)",
  "improve.level.L3": "L3 · Sintaxis de cláusula (VSO/SOV/SVO)",
  "improve.level.L4": "L4 · Cohesión discursiva y perícopa",
  "improve.level.L5": "L5 · Propagación canónica entre las 3 obras",
  "improve.current": "Texto actual:",
  "improve.proposed": "Mejora propuesta:",
  "improve.note": "Nota del anciano / revisor comunitario:",
  "improve.copy_patch": "📋 Copiar línea de parche",
  "improve.download_patch": "⬇️ Descargar .patch.toml",
};

export function renderImproveDrawerHtml({
  i18n = null,
  t: customT = null,
  lang = "stp",
  locale = "es",
  ref = "",
  osis = "",
  strongId = "",
  currentVerseText = "",
  currentSurface = "",
  proposedSurface = "",
  newSurface = "",
  expectedProperNouns = [],
  expectedAgent = "",
  expectedPatient = "",
  elicitationRank = 1,
  level = "L2",
  includeInlineSeedPanel = true,
  includeEightLocksBar = false,
} = {}) {
  const resolvedRef = sanitizePipeField(ref || osis || "GEN.1.1").toUpperCase();
  const resolvedVerseText = String(currentVerseText || currentSurface || "");
  const resolvedProposedSurface = String(proposedSurface || newSurface || "");
  const selectedLevel = ["L1", "L2", "L3", "L4", "L5"].includes(
    String(level || "").trim().toUpperCase(),
  )
    ? String(level).trim().toUpperCase()
    : "L2";
  const isNewTestament =
    /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)\b/i.test(
      resolvedRef,
    );
  const resolvedStrong = sanitizePipeField(strongId || (isNewTestament ? "G3056" : "H0430")).toUpperCase();
  const isEn = String(locale || "es").trim().toLowerCase().startsWith("en");
  const fallbackDict = isEn ? IMPROVE_I18N_FALLBACKS : IMPROVE_I18N_FALLBACKS_ES;
  const t = (k, vars) => {
    const raw =
      i18n && typeof i18n.t === "function"
        ? i18n.t(k, vars)
        : typeof customT === "function"
          ? customT(k, vars)
          : k;
    if (!raw || raw === k || String(raw).startsWith("improve.")) {
      return fallbackDict[k] || IMPROVE_I18N_FALLBACKS[k] || String(raw || k);
    }
    return raw;
  };
  const patch = buildPatchPayload({
    kind: "verse",
    lang,
    locale,
    level: selectedLevel,
    ref: resolvedRef,
    strongId: resolvedStrong,
    oldSurface: resolvedVerseText,
    newSurface: resolvedProposedSurface,
  });
  const seed250 = buildElicitationSeedPayload({
    lang,
    rung: "Rung1SwadeshAndNsm65",
    rank: elicitationRank,
    verseId: resolvedRef,
    strongIds: [resolvedStrong],
    responseText: resolvedProposedSurface,
  });
  const lockOpts = {
    oldSurface: patch.old_surface,
    newSurface: patch.new_surface,
    expectedProperNouns,
    expectedAgent,
    expectedPatient,
  };
  const eightLocksReport = validateAllEightLocksPda(lockOpts);
  const eightLocksPillsHtml = eightLocksReport.locks
    .map(
      (lk) =>
        `<span class="uls-badge ek-badge-compact" data-lock-id="${lk.id}" data-lock-passed="${lk.passed}">${lk.passed ? "✅" : "⛔"} ${lk.label}</span>`,
    )
    .join(" ");
  const lock8Result = verifyLock8PredicativeAndNegation(lockOpts);

  return (
    `<section class="improve-drawer" data-lang="${patch.lang}" data-ref="${patch.ref}" data-strong-id="${patch.strong_id}" data-audio-bytes="0" data-lock8-status="${lock8Result.status}" data-eight-locks-status="${eightLocksReport.status}">` +
    `<header class="ek-row-between ek-mb-sm">` +
    `<div>` +
    `<h4 class="ek-m-0" data-i18n="improve.title">${t("improve.title")}</h4>` +
    `<p class="ek-subtitle" data-i18n="improve.subtitle">${t("improve.subtitle")}</p>` +
    `</div>` +
    `<div class="lock8-status-row">` +
    `<span class="uls-badge" data-lock8-badge="true">🔒 ${isEn ? `Grammar check: ${lock8Result.status}` : `Verificación gramatical: ${lock8Result.status}`}</span>` +
    `<details class="tech-details"><summary>${isEn ? "Technical details" : "Detalles técnicos"}</summary>` +
    `<code>${isEn ? "Lock 8 (MACULA A0/A1 + Jespersen)" : "Candado 8 (MACULA A0/A1 + Jespersen)"}</code>` +
    (includeEightLocksBar
      ? `<div class="eight-locks-pda-bar" data-eight-locks-bar="true">${eightLocksPillsHtml}</div>`
      : "") +
    `</details>` +
    `</div>` +
    `</header>` +
    `<div class="ek-stack">` +
    `<label class="ek-label">` +
    `<span data-i18n="improve.kind_label">${t("improve.kind_label")}</span> ` +
    `<select id="improveKindSelect" class="ek-input">` +
    `<option value="verse" data-i18n="improve.kind_verse">${t("improve.kind_verse")} (${patch.ref} · ${patch.strong_id})</option>` +
    `<option value="ui-string" data-i18n="improve.kind_ui">${t("improve.kind_ui")} (${locale})</option>` +
    `</select>` +
    `</label>` +
    `<label class="ek-label">` +
    `<span data-i18n="improve.level_label">${t("improve.level_label")}</span> ` +
    `<select id="improveLevelSelect" class="ek-input">` +
    ["L1", "L2", "L3", "L4", "L5"]
      .map(
        (lv) =>
          `<option value="${lv}"${selectedLevel === lv ? " selected" : ""}>${t(`improve.level.${lv}`)}</option>`,
      )
      .join("") +
    `</select>` +
    `</label>` +
    `<label class="ek-label">` +
    `<span data-i18n="improve.current">${t("improve.current")}</span>` +
    `<input id="improveOldSurfaceInput" class="ek-input" type="text" value="${patch.old_surface.replace(/"/g, "&quot;")}">` +
    `</label>` +
    `<label class="ek-label">` +
    `<span data-i18n="improve.proposed">${t("improve.proposed")}</span>` +
    `<input id="improveNewSurfaceInput" class="ek-input" type="text" value="${patch.new_surface.replace(/"/g, "&quot;")}">` +
    `</label>` +
    `<label class="ek-label">` +
    `<span data-i18n="improve.note">${t("improve.note")}</span>` +
    `<input id="improveNoteInput" class="ek-input" type="text" value="">` +
    `</label>` +
    `<details id="improvePatchTechReceiptDetails" class="hig-tech-meta hig-tech-receipt-details">` +
    `<summary>${isEn ? "🧾 View JSONL / SHA-256 cryptographic receipt" : "🧾 Ver recibo criptográfico JSONL / SHA-256"}</summary>` +
    `<pre id="improvePatchOutput" class="ek-pre">${patch.payloadLine}</pre>` +
    `</details>` +
    (includeInlineSeedPanel
      ? `<div class="celf250-ladder-panel ek-card-muted" data-celf250-ladder="true" data-celf250-rank="${seed250.rank}">` +
      `<strong class="ek-title-sm">🧬 ${isEn ? `Community Progress Step #${seed250.rank}/250` : `Paso de Revisión Comunitaria #${seed250.rank}/250`}</strong>` +
      `<details class="hig-tech-receipt-details"><summary>${isEn ? "🧾 Technical seed payload (CELF-250)" : "🧾 Detalles técnicos de semilla (CELF-250)"}</summary>` +
      `<pre id="celf250SeedOutput" class="ek-pre-compact">${seed250.payloadLine}</pre>` +
      `</details>` +
      `</div>`
      : "") +
    `<details id="improveCommunityVotesDetails" class="hig-tech-meta">` +
    `<summary>${isEn ? "🗳️ Community consensus votes" : "🗳️ Votos de consenso comunitario"}</summary>` +
    `<div class="ek-stack-sm ek-mt-sm">` +
    `<label class="ek-label-sm">${isEn ? "Reviewer ID" : "ID revisor"} <input id="improveVoteReviewerIdInput" class="ek-input" type="text" placeholder="hablante_1"></label>` +
    `<label class="ek-label-sm ek-row"><input id="improveVoteGoldSeedsCheck" type="checkbox"> <span>${isEn ? "Passed 2 Gold Seeds" : "Aprobó 2 semillas de oro"}</span></label>` +
    `<div class="ek-row-wrap">` +
    `<button type="button" id="btnAddCommunityVoteApprove" class="uls-chip" data-i18n="improve.vote_approve">👍 ${isEn ? "Approve vote" : "Voto aprobar"}</button>` +
    `<button type="button" id="btnAddCommunityVoteReject" class="uls-chip" data-i18n="improve.vote_reject">👎 ${isEn ? "Reject vote" : "Voto rechazar"}</button>` +
    `<input type="file" id="inputImportCommunityVotesJson" class="ek-input" accept=".json,application/json" aria-label="Import Community Votes JSON">` +
    `</div>` +
    `<output id="improveCommunityVotesStatus" class="ek-meta"></output>` +
    `</div>` +
    `</details>` +
    `<div class="ek-row-wrap">` +
    `<button type="button" id="btnApplySuggestedImprovement" class="uls-chip apply-improvement" data-i18n="improve.apply_cascade" data-apply-improvement="true" data-lang="${patch.lang}" data-ref="${patch.ref}" data-strong-id="${patch.strong_id}" data-proposed-surface="${patch.new_surface.replace(/"/g, "&quot;")}">✅ ${isEn ? "Apply improvement to cascade" : "Aplicar mejora a la cascada"}</button>` +
    `<button type="button" id="btnCopyPatchPayload" class="uls-chip ek-btn-fitts" data-i18n="improve.copy_patch">${t("improve.copy_patch")}</button>` +
    `<button type="button" id="btnDownloadPatchFile" class="uls-chip ek-btn-fitts" data-i18n="improve.download_patch">${t("improve.download_patch")}</button>` +
    `</div>` +
    `</div>` +
    `</section>`
  );
}

export function renderStpDraftCheckHtml({
  uncertaintyQueue = UNCERTAINTY_QUEUE_60,
  ntSampleRows = [],
  otScaffoldRows = [],
  lang = "stp",
} = {}) {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const ntBookRe =
    /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)\b/i;
  const otQueue = (Array.isArray(uncertaintyQueue) ? uncertaintyQueue : [])
    .filter((item) => {
      const ref = String(item?.verse_id || item?.ref || "").trim().toUpperCase();
      const u = Number(item?.semantic_uncertainty_u ?? item?.shannon_entropy ?? 0);
      return Boolean(ref) && !ntBookRe.test(ref) && u > 0;
    })
    .slice(0, 25);
  const effectiveOtQueue =
    otQueue.length > 0
      ? otQueue
      : [
        { verse_id: "GEN.1.1", semantic_uncertainty_u: 0.842, token_count: 7, surface: "[H9003+H7225] [H1254] [H0430] — Andamiaje Taller Tier 2" },
        { verse_id: "EXO.3.14", semantic_uncertainty_u: 0.831, token_count: 7, surface: "[H1961] [H0834] [H1961] — Andamiaje Taller Tier 2" },
        { verse_id: "PSA.23.1", semantic_uncertainty_u: 0.815, token_count: 4, surface: "[H3068] [H7462] [H3808] [H2637] — Andamiaje Taller Tier 2" },
        { verse_id: "ISA.53.5", semantic_uncertainty_u: 0.809, token_count: 14, surface: "[H2490] [H6588] [H1792] [H7965] — Andamiaje Taller Tier 2" },
      ];
  const queueRowsHtml = effectiveOtQueue
    .map((r) => {
      const osis = esc(String(r.verse_id || r.ref || "GEN.1.1").toUpperCase());
      const uVal = Number(r.semantic_uncertainty_u ?? r.shannon_entropy ?? 0.8).toFixed(3);
      const tokCount = Number(r.token_count || 7);
      const surf = esc(r.surface || `[H0430] Andamiaje Interlineal Taller (${osis})`);
      return `<tr data-uncertainty-row="true" data-testament="OT" data-osis="${osis}"><td><code>${osis}</code></td><td><strong>${uVal}</strong></td><td>${tokCount}/${tokCount}</td><td>${surf}</td></tr>`;
    })
    .join("\n");
  const ntRows = (
    Array.isArray(ntSampleRows) && ntSampleRows.length > 0
      ? ntSampleRows
      : [{ ref: "MAT.1.1", text: "Jir am gu tuꞌ na bɨx xib jaꞌk tu aꞌga na jax chuꞌm jaꞌtkam kat guiꞌ nam jir boxiiꞌñ kat gu Jesuus." }]
  )
    .map(
      (r) =>
        `<tr data-stratum="NT_HUMAN"><td><code>${esc(r.ref)}</code></td><td><span class="badge-human">NT Humano Verificado (SIL 2016)</span></td><td>${esc(r.text)}</td></tr>`,
    )
    .join("\n");
  const otRows = (
    Array.isArray(otScaffoldRows) && otScaffoldRows.length > 0
      ? otScaffoldRows
      : [{ ref: "GEN.1.1", text: "[H9003+H7225] [H1254] [H0430] [H0853] [H9009+H8064] [H9002+H0853] [H9009+H0776] — Andamiaje Taller Tier 2" }]
  )
    .map(
      (r) =>
        `<tr data-stratum="OT_SCAFFOLD_TIER2"><td><code>${esc(r.ref)}</code></td><td><span class="badge-draft">Andamiaje Explícito Taller Tier 2 ([H####])</span></td><td>${esc(r.text)}</td></tr>`,
    )
    .join("\n");
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><title>Inspector Offline de Taller CC0 — ${esc(lang)}</title></head><body data-taller-inspector="v2" data-lang="${esc(lang)}" data-tier="Tier2_NT_Human_OT_Scaffold" data-total-verses="31102" data-nt-verses="7957" data-ot-verses="23145"><section id="uncertaintyQueueSection"><table><tbody>${queueRowsHtml}</tbody></table></section><section id="stratumContrastSection"><table><tbody>${ntRows}\n${otRows}</tbody></table></section></body></html>`;
}

const CELF_RUNG_LABELS = {
  ALL: "Todos (250)",
  Rung1SwadeshAndNsm65: "Rung 1 · Swadesh & NSM-65",
  Rung2MorphosyntaxAndTamValence: "Rung 2 · Morfosintaxis & TAM",
  Rung3TheologicalKinshipAndNarratives: "Rung 3 · Parentesco & Narrativa",
  Rung4AutomatedPropagationAnd8Locks: "Rung 4 · Propagación & 8 Candados",
};

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
  includeWalCard = false,
  includeCensusCard = false,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
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
    `<div class="celf-rung-filter-bar ek-row-wrap ek-mb-sm" role="group" aria-label="${isEn ? "Filter by CELF-250 Rung" : "Filtro por Peldaño CELF-250"}">` +
    `<button type="button" id="btnNextHighEntropyVerse" class="uls-chip ek-btn-fitts" data-next-entropy-ref="${nextEntropyItem.ref}" data-shannon-entropy="${nextEntropyItem.shannon_entropy}">⚡ ${isEn ? "Next high uncertainty" : "Siguiente alta incertidumbre"}: ${nextEntropyItem.ref} (H=${nextEntropyItem.shannon_entropy}b)</button>` +
    Object.entries(CELF_RUNG_LABELS)
      .map(
        ([rungKey, label]) =>
          `<button type="button" class="uls-chip celf-rung-filter-btn ek-btn-fitts" data-celf-rung-filter="${rungKey}" aria-pressed="${activeRung === rungKey ? "true" : "false"}">${isEn && rungKey === "ALL" ? "All (250)" : label}</button>`,
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
        `<button type="button" class="uls-chip mostrador-celf-rung-btn ek-btn-fitts" data-ladder-ref="${refStr}" data-ladder-rank="${rankNum}" data-ladder-rung="${rungName}">` +
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
    `<div class="sister-works-cascade-bar ek-auto-grid ek-mb-sm" data-sister-works-cascade="true">` +
    sisterCascade.sisterWorks
      .map(
        (sw) =>
          `<div class="ek-subcard" data-sister-work="${sw.workId}">` +
          `<strong>${sw.workLabel}</strong><br>` +
          `<span>${sw.ConcordantOccurrences} ${isEn ? "occurrences" : "ocurrencias"} · ${sw.sampleTargets.slice(0, 2).join(", ")}</span>` +
          `</div>`,
      )
      .join("") +
    `</div>`;

  const otWavesHtml =
    `<div class="ot-translation-waves-bar ek-row-wrap ek-mt-sm" data-ot-waves="5" data-active-ot-wave="${waveNum}">` +
    `<button type="button" class="uls-chip ot-wave-filter-btn ek-btn-fitts" data-ot-wave="0" aria-pressed="${waveNum === 0 ? "true" : "false"}">${isEn ? "All Waves" : "Todas las Ondas"}</button>` +
    CANONICAL_5_OT_TRANSLATION_WAVES.map(
      (w) =>
        `<button type="button" class="uls-chip ot-wave-filter-btn ek-btn-fitts" data-ot-wave="${w.wave}" data-uncertainty-bits="${w.meanUncertaintyBits}" aria-pressed="${waveNum === Number(w.wave) ? "true" : "false"}">${w.title} (U=${w.meanUncertaintyBits}b)</button>`,
    ).join(" ") +
    `</div>`;

  const extAudit = EXTERNAL_AUDIT_8_LOCKS || {};
  const externalAuditHtml =
    `<div id="externalAudit8LocksPanel" class="ek-card-muted ek-mt-sm" data-external-audit-8-locks="true" data-all-8-locks-passed="${Boolean(extAudit.all_8_locks_passed)}">` +
    `<div class="ek-row-between">` +
    `<strong>🛡️ ${isEn ? "External Editorial Review" : "Revisión Editorial Externa"}</strong>` +
    `<span class="uls-badge ek-badge-compact">${extAudit.all_8_locks_passed !== false ? "✅ 8/8 PASS" : "⛔ VETO"} · ${Number(extAudit.rosetta_key_terms_extracted || 552)} ${isEn ? "key terms" : "términos"}</span>` +
    `</div>` +
    `</div>`;

  const uqSlice = UNCERTAINTY_QUEUE_60.slice(0, 8);
  const uncertaintyQueueHtml =
    `<div id="uncertaintyQueue60Panel" class="ek-card-muted ek-mt-sm" data-uncertainty-queue-total="${UNCERTAINTY_QUEUE_60.length}">` +
    `<strong class="ek-title-sm">🎯 ${isEn ? "Priority Verses to Review" : "Versículos Prioritarios por Revisar"}</strong>` +
    `<div class="ek-row-wrap">` +
    uqSlice
      .map((uItem, idx) => {
        const uRef = sanitizePipeField(uItem.verse_id || uItem.ref || "ACT.5.8").toUpperCase();
        const uRank = Number(uItem.rank) || idx + 1;
        const uScore = Number(uItem.semantic_uncertainty_u ?? uItem.shannon_entropy ?? 0.75).toFixed(3);
        return (
          `<button type="button" class="uls-chip uncertainty-queue-btn ek-btn-fitts" data-jump-osis="${uRef}" data-uncertainty-rank="${uRank}" data-uncertainty-u="${uScore}">` +
          `#${uRank} · ${uRef}` +
          `</button>`
        );
      })
      .join("") +
    `</div>` +
    `</div>`;

  const tier3aHtml =
    `<div id="tier3aDialectContinuumPanel" class="ek-card-muted ek-mt-sm" data-tier3a-continuums="${TIER3A_CONTINUUMS.length}" data-floor-1-sentence="${Number(FLOOR_1_SENTENCE_SPEC.single_sentence_unlocked_floor || 291)}" data-reference-tier1="${sanitizePipeField(FLOOR_1_SENTENCE_SPEC.reference_tier1 || "spa_rv1909")}" data-total-sentences="${Number(FLOOR_1_SENTENCE_SPEC.total_sentences || 250)}">` +
    `<strong class="ek-title-sm">🌐 ${isEn ? "Closely Related Languages" : "Lenguas Cercanas"}</strong>` +
    `<div class="ek-row-wrap">` +
    TIER3A_CONTINUUMS.map(
      (tc) =>
        `<span class="uls-badge ek-badge-compact" data-donor-lang="${sanitizePipeField(tc.donor_lang)}" data-target-lang="${sanitizePipeField(tc.target_lang)}" data-asjp-ldnd="${Number(tc.asjp_ldnd || 0).toFixed(4)}">` +
        `${sanitizePipeField(tc.donor_lang)} → ${sanitizePipeField(tc.target_lang)} (${sanitizePipeField(tc.sample_projected_cognates || "")})` +
        `</span>`,
    ).join("") +
    `</div>` +
    `</div>`;

  const masterCensusAndLedgerHtml =
    includeCensusCard === true
      ? renderFieldWorkshopCensus7164Html(MASTER_CENSUS_SUMMARY, STP_LEDGER_SUMMARY)
      : "";
  const crdtWalAndLockP2Html =
    includeWalCard === true
      ? renderCrdtWalAndLockP2AuditCardHtml({
        crdt_wal_semilattice: CRDT_WAL_SEMILATTICE,
        patch_journal_lock_p2: PATCH_JOURNAL_LOCK_P2,
        root_notes_stp: ROOT_NOTES_STP,
      })
      : "";

  const seed250 = buildElicitationSeedPayload({
    lang: cleanLang,
    rung: activeRung && activeRung !== "ALL" ? activeRung : "Rung1SwadeshAndNsm65",
    rank: 1,
    verseId: resolvedRef,
    strongIds: [sanitizePipeField(strongId || "H0430").toUpperCase()],
    responseText: "",
  });
  const seedPanelHtml =
    `<div class="celf250-ladder-panel ek-card-muted ek-mb-sm" data-celf250-ladder="true" data-celf250-rank="${seed250.rank}">` +
    `<strong class="ek-title-sm">🧬 ${isEn ? `Community Progress Step #${seed250.rank}/250` : `Paso de Revisión Comunitaria #${seed250.rank}/250`}</strong>` +
    `<details class="hig-tech-receipt-details tech-details"><summary>${isEn ? "🧾 Technical seed payload (CELF-250)" : "🧾 Detalles técnicos de semilla (CELF-250)"}</summary>` +
    `<pre id="celf250SeedOutput" class="ek-pre-compact">${seed250.payloadLine}</pre>` +
    `</details>` +
    `</div>`;

  return (
    `<div class="cascade-impact-box ek-card" data-cascade-level="${cleanLevel}" data-cascade-lang="${cleanLang}" data-celf-total="${totalCount}" data-active-ot-wave="${waveNum}">` +
    `<strong class="ek-title-sm">🌊 ${isEn ? `Cascade Propagation ${cleanLevel} (${totalCount} steps · ${sanitizePipeField(strongId)} in ${resolvedRef})` : `Propagación de Mejora ${cleanLevel} (${totalCount} pasos · ${sanitizePipeField(strongId)} en ${resolvedRef})`}</strong>` +
    `<p class="ek-subtitle ek-mb-sm">` +
    `${isEn ? `Refining this root in <code>${cleanLang}</code> updates matching verses across Bible, Gospels, and Beatitudes. Tap any step to inspect:` : `Al corregir esta raíz en <code>${cleanLang}</code>, el ajuste se propaga a Biblia, Evangelios y Felices. Pulsa un paso para revisarlo:`}` +
    `</p>` +
    `<details class="tech-details ek-mb-sm"><summary>${isEn ? "Technical details" : "Detalles técnicos"}</summary>` +
    `<p class="ek-meta ek-mt-xs">CELF-250 (${totalCount} peldaños · Dawid-Skene + SPRT · 0 Bytes Audio)</p></details>` +
    seedPanelHtml +
    sisterCascadeHtml +
    rungFilterHtml +
    `<div class="ek-row-wrap">${ladderButtons}</div>` +
    otWavesHtml +
    externalAuditHtml +
    uncertaintyQueueHtml +
    tier3aHtml +
    `<div class="ek-stack ek-mt-sm">` +
    masterCensusAndLedgerHtml +
    crdtWalAndLockP2Html +
    `</div>` +
    `</div>`
  );
}

const DEFAULT_STP_LEXICON_SEED = [
  { strong: "H0430", gloss_es: "Dios / Creador", stp_surface: "Jawatan Dios", stp_vso_classifier_phrase: "gu Jawatan Dios", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 2576 },
  { strong: "H7225", gloss_es: "principio / origen", stp_surface: "na pai' dhuuk", stp_vso_classifier_phrase: "na pai' dhuuk", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 51 },
  { strong: "H1254", gloss_es: "crear / formar", stp_surface: "jix duu", stp_vso_classifier_phrase: "jix duu", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 54 },
  { strong: "H0776", gloss_es: "tierra / mundo", stp_surface: "oidha'", stp_vso_classifier_phrase: "gu oidha'", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 2505 },
  { strong: "H8064", gloss_es: "cielos / firmamento", stp_surface: "tɨkɨr", stp_vso_classifier_phrase: "gu tɨkɨr", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 420 },
  { strong: "H3068", gloss_es: "el Señor (YHWH)", stp_surface: "Jawatan", stp_vso_classifier_phrase: "gu Jawatan", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 3, occurrences: 6828 },
  { strong: "G3056", gloss_es: "Palabra / Verbo", stp_surface: "Ñi'ook", stp_vso_classifier_phrase: "gu Ñi'ook", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 330 },
  { strong: "G2316", gloss_es: "Dios", stp_surface: "Dios", stp_vso_classifier_phrase: "gu Dios", typology_rule: "VSO_HEAD_INITIAL_GB130_1_GB070_1", wave: 1, occurrences: 1317 },
];

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
    const stpSurf = String(
      entry.stp_surface || entry.stp_gloss || entry.stp_vso_classifier_phrase || entry.surface || "",
    ).toLowerCase();
    return strongStr.includes(cleanQuery) || glossEs.includes(cleanQuery) || stpSurf.includes(cleanQuery);
  });

  const shown = (filtered.length > 0 ? filtered : pool).slice(0, Math.max(6, Number(limit) || 24));
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rootNoteByStrong = new Map();
  for (const rn of Array.isArray(ROOT_NOTES_STP) ? ROOT_NOTES_STP : []) {
    if (rn && rn.strong_id) {
      rootNoteByStrong.set(String(rn.strong_id).toUpperCase(), rn);
    }
  }

  return shown
    .map((entry) => {
      const strongCode = String(entry.strong || entry.strong_id || "H0430").toUpperCase();
      const glossEs = String(entry.gloss_es || entry.es_gloss || entry.gloss || "Dios");
      const stpSurf = String(
        entry.stp_surface || entry.stp_gloss || entry.stp_vso_classifier_phrase || entry.surface || glossEs,
      );
      const vsoPhrase = String(entry.stp_vso_classifier_phrase || stpSurf);
      const typoRule = String(
        entry.typology_rule || entry.willett_1991_head_initial_rule || "VSO_HEAD_INITIAL_GB130_1_GB070_1",
      );
      const occ = Number(entry.occurrences || STRONG_CONCORDANCE_COUNTS[strongCode]?.biblia_occurrences || 12);
      const matchedRootNote = rootNoteByStrong.get(strongCode) || null;
      const tierCategory = String(entry.tier_category || "ASJP_SWADESH_110");
      const inlineRootNote = String(
        matchedRootNote?.note ||
        matchedRootNote?.note_pure_text ||
        entry.note ||
        entry.cultural_note ||
        entry.semantic_note ||
        "Morfología VSO cabeza-inicial (Willett 1991)",
      );
      return (
        `<button type="button" class="uls-chip stp-lexicon-entry-btn ek-btn-stack" ` +
        `data-lex-strong="${esc(strongCode)}" ` +
        `data-lex-surface="${esc(stpSurf)}" ` +
        `data-lex-gloss="${esc(glossEs)}" ` +
        `data-vso-phrase="${esc(vsoPhrase)}" ` +
        `data-typology-rule="${esc(typoRule)}" ` +
        `data-tier-category="${esc(tierCategory)}">` +
        `<span><strong>${esc(strongCode)}</strong> · ${esc(stpSurf)} <small class="ek-opacity-muted">(${esc(glossEs)} · VSO: ${esc(vsoPhrase)} · ${occ} vv.)</small></span>` +
        `<span class="stp-inline-root-note" data-root-note="true" data-root-note-source="${matchedRootNote ? "ledger" : "typology"}">📒 ${esc(inlineRootNote)}</span>` +
        `</button>`
      );
    })
    .join("");
}

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
    const stpSurf = String(
      entry.stp_surface || entry.stp_gloss || entry.stp_vso_classifier_phrase || entry.surface || "",
    ).toLowerCase();
    return strongStr.includes(cleanQuery) || glossEs.includes(cleanQuery) || stpSurf.includes(cleanQuery);
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
    `<div id="dunningKeyTermsGlossaryPanel" class="ek-divider-top" data-key-terms-total="${KEY_TERMS_GLOSSARY.length}">` +
    `<strong class="ek-title-sm">📊 Términos clave frecuentes (${KEY_TERMS_GLOSSARY.length} anclas · 1 toque)</strong>` +
    `<div class="ek-row-wrap">` +
    topKeyTerms
      .map((kt) => {
        const surf = String(kt.vernacular_stp || "");
        const bridge = String(kt.bridge_es || "");
        const g2 = Number(kt.g2_score || 15.13).toFixed(1);
        const lemma = String(kt.source_lemma || kt.term_id || "KT");
        return (
          `<button type="button" class="uls-chip dunning-key-term-btn ek-btn-fitts" data-inject-surface="${esc(surf)}" data-dunning-g2="${esc(g2)}" data-source-lemma="${esc(lemma)}">` +
          `<strong>${esc(surf)}</strong> (${esc(bridge)})` +
          `</button>`
        );
      })
      .join("") +
    `</div>` +
    `</div>`;

  return (
    `<div id="stpLexiconExplorerPanel" class="stp-lexicon-explorer ek-card-muted" ` +
    `data-lexicon-total="${pool.length}" ` +
    `data-lexicon-shown="${shown.length}" ` +
    `data-active-ot-wave="${waveNum}">` +
    `<div class="ek-row-between ek-mb-sm">` +
    `<strong class="ek-title-sm">📘 Explorador Léxico O'dam (${pool.length} raíces Strong ↔ Glosa Español ↔ Superficie stp)</strong>` +
    `<input id="stpLexiconSearchInput" class="ek-input-compact" type="search" value="${esc(query)}" placeholder="Buscar Strong (H0430), glosa o término O'dam..." aria-label="Buscar en léxico O'dam de 600 términos">` +
    `</div>` +
    `<div id="stpLexiconResultsRows" class="ek-row-wrap" data-stp-lexicon-results="true">${itemsHtml}</div>` +
    dunningGlossaryHtml +
    `</div>`
  );
}

const DISK_MATERIALIZED_TALLER_LANGS = new Set(["es", "en", "stp", "he", "grc"]);

function buildDynamicTallerKitHref(langCode, art) {
  const safeLang = String(langCode || "es").replace(/[^a-zA-Z0-9-]/g, "") || "es";
  if (DISK_MATERIALIZED_TALLER_LANGS.has(safeLang.toLowerCase())) {
    return {
      href: `obras/biblia/taller/${safeLang.toLowerCase()}/${art.file}`,
      downloadName: art.file,
      isDynamic: false,
    };
  }
  let mime = "text/plain;charset=utf-8";
  let body = "";
  if (art.file.endsWith(".tsv")) {
    mime = "text/tab-separated-values;charset=utf-8";
    body =
      art.id === "01_diccionario"
        ? `strong_id\tlemma_bridge_es\tlang_target\tgloss_seed\nH0430\tDios\t${safeLang}\t[COMPLETAR_${safeLang.toUpperCase()}]\nH0776\ttierra\t${safeLang}\t[COMPLETAR_${safeLang.toUpperCase()}]\nG3056\tPalabra\t${safeLang}\t[COMPLETAR_${safeLang.toUpperCase()}]\n`
        : art.id === "02_concordancia"
          ? `strong_id\toccurrences_canon\tsample_refs\tlang_code\nH0430\t2576\tGEN.1.1,PSA.23.1\t${safeLang}\nH3068\t6828\tGEN.2.4,PSA.23.1\t${safeLang}\nG2316\t1317\tJHN.1.1,MAT.5.8\t${safeLang}\n`
          : `rank\tverse_id\trung\tlang_code\tresponse_surface\n1\tGEN.1.1\tRung1SwadeshAndNsm65\t${safeLang}\t\n2\tGEN.3.1\tRung1SwadeshAndNsm65\t${safeLang}\t\n3\tMAT.5.3\tRung2MorphosyntaxAndTamValence\t${safeLang}\t\n`;
  } else if (art.file.endsWith(".toml")) {
    mime = "application/toml;charset=utf-8";
    body = `# Kit de Taller Comunitario CC0 (${safeLang})\n[[patches]]\nlang = "${safeLang}"\nlevel = "L2"\nref = "GEN.1.1"\nstrong_id = "H0430"\nold_surface = ""\nnew_surface = ""\naudio_bytes = 0\n`;
  } else {
    mime = "text/markdown;charset=utf-8";
    body = `# Kit de Armonización y Relatos Orales CC0 (${safeLang})\n\n- Lengua objetivo: \`${safeLang}\`\n- Licencia: \`CC0-1.0\` (0 Bytes Audio, 100% texto verificable P1..P8)\n`;
  }
  return {
    href: `data:${mime},${encodeURIComponent(body)}`,
    downloadName: `${safeLang}_${art.file}`,
    isDynamic: true,
  };
}

export function renderTallerArtifactsCatalogHtml(langOrOpts = "es") {
  const rawLang =
    typeof langOrOpts === "object" && langOrOpts !== null
      ? langOrOpts.lang || "es"
      : langOrOpts;
  const includeCensusCard =
    typeof langOrOpts === "object" && langOrOpts !== null
      ? langOrOpts.includeCensusCard !== false
      : true;
  const includeEightLocksBar =
    typeof langOrOpts === "object" && langOrOpts !== null
      ? langOrOpts.includeEightLocksBar !== false
      : true;
  const customMasterCensus =
    typeof langOrOpts === "object" && langOrOpts !== null && langOrOpts.masterCensusSummary
      ? langOrOpts.masterCensusSummary
      : MASTER_CENSUS_SUMMARY;
  const customStpLedger =
    typeof langOrOpts === "object" && langOrOpts !== null && langOrOpts.stpLedgerSummary
      ? langOrOpts.stpLedgerSummary
      : customMasterCensus?.stp_ledger_summary || STP_LEDGER_SUMMARY;
  const cleanLang = String(rawLang || "es").trim().replace(/[^a-zA-Z0-9-]/g, "") || "es";
  const walAuditHtml = renderCrdtWalAndLockP2AuditCardHtml({
    crdt_wal_semilattice: CRDT_WAL_SEMILATTICE,
    patch_journal_lock_p2: PATCH_JOURNAL_LOCK_P2,
    root_notes_stp: ROOT_NOTES_STP,
  });
  const censusHtml = includeCensusCard
    ? renderMasterCensus7164CardHtml(customMasterCensus, customStpLedger)
    : "";
  const customOldSurface =
    typeof langOrOpts === "object" && langOrOpts !== null && typeof langOrOpts.oldSurface === "string"
      ? langOrOpts.oldSurface
      : "";
  const customNewSurface =
    typeof langOrOpts === "object" && langOrOpts !== null && typeof langOrOpts.newSurface === "string"
      ? langOrOpts.newSurface
      : "";
  const locksList =
    customOldSurface || customNewSurface
      ? validateAllEightLocksPda({
        oldSurface: customOldSurface,
        newSurface: customNewSurface,
        expectedProperNouns: Array.isArray(langOrOpts?.expectedProperNouns)
          ? langOrOpts.expectedProperNouns
          : [],
        expectedAgent: langOrOpts?.expectedAgent || "",
        expectedPatient: langOrOpts?.expectedPatient || "",
      }).locks
      : [
        { id: "P1", label: "P1 · Cero Omisión", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_1_zero_omission_pass !== false },
        { id: "P2", label: "P2 · Cotas Gale-Church", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_2_gale_church_bounds_pass !== false },
        { id: "P3", label: "P3 · PDA Comillas", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_3_pda_quote_balance_pass !== false },
        { id: "P4", label: "P4 · Anti-Calco MDD", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_4_anti_calque_mdd_pass !== false },
        { id: "P5", label: "P5 · Versificación KJV", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_5_versification_kjv_pass !== false },
        { id: "P6", label: "P6 · Términos Clave Rosetta", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_6_rosetta_key_terms_pass !== false },
        { id: "P7", label: "P7 · Registro AoA", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_7_register_aoa_pass !== false },
        { id: "P8", label: "P8 · Ortografía Fonotáctica", passed: EXTERNAL_AUDIT_8_LOCKS?.lock_8_phonotactic_orthography_pass !== false },
      ];
  const eightLocksPillsHtml = locksList
    .map(
      (lk) =>
        `<span class="uls-badge ek-badge-compact" data-lock-id="${lk.id}" data-lock-passed="${lk.passed}">${lk.passed ? "✅" : "⛔"} ${lk.label}</span>`,
    )
    .join(" ");
  return (
    (includeEightLocksBar
      ? `<details class="tech-details ek-mb-sm"><summary>Detalles técnicos de validación</summary><div class="eight-locks-pda-bar" data-eight-locks-bar="true">${eightLocksPillsHtml}</div></details>`
      : "") +
    `<div class="taller-artifacts-grid ek-span-full ek-auto-grid ek-mb-sm" data-taller-lang="${cleanLang}">` +
    TALLER_CC0_ARTIFACTS.map((art) => {
      const kit = buildDynamicTallerKitHref(cleanLang, art);
      return `<a class="uls-chip taller-artifact-link ek-btn-link" data-taller-artifact="${art.id}" data-taller-dynamic="${kit.isDynamic}" href="${kit.href}" download="${kit.downloadName}">${art.label}</a>`;
    }).join("") +
    `</div>` +
    `<div class="taller-fullwidth-audit-stack ek-span-full ek-stack">` +
    walAuditHtml +
    censusHtml +
    `</div>`
  );
}
