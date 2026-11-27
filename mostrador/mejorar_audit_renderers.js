// Sub-módulo LCOM4 C3 de Taller: Cascada CELF-250 y Auditoría Externa P1..P8 (`D14-HIG8` · `SLICE-EKO-HIG8-19`).
// Extraído de `mejorar_renderers.js` (`∂(C)=0`, 99% contigüidad, zero ciclos ESM).

import {
  renderCrdtWalAndLockP2AuditCardHtml,
  renderFieldWorkshopCensus7164Html,
} from "./drawer_hydrators.js";
import { formatEditorialTraditionLabel, formatHumanMetricLabel, humanizeUiCopy } from "./human_labels.js";
import { isWorkVisible } from "./projection_contract.js";
import { renderElicitSessionCardHtml } from "./workshop_elicit_and_cldf.js";
import {
  CANONICAL_5_OT_TRANSLATION_WAVES,
  CASCADE_LEVELS,
  CRDT_WAL_SEMILATTICE,
  EXTERNAL_AUDIT_8_LOCKS,
  FLOOR_1_SENTENCE_SPEC,
  MASTER_CENSUS_SUMMARY,
  PATCH_JOURNAL_LOCK_P2,
  ROOT_NOTES_STP,
  STP_LEDGER_SUMMARY,
  TIER3A_CONTINUUMS,
  UNCERTAINTY_QUEUE_60,
  buildElicitationSeedPayload,
  computeSisterWorksCascade,
  sanitizePipeField,
  selectTopEntropyVerseQueue,
} from "./mejorar_locks_pda.js";

const CELF_RUNG_LABELS = {
  ALL: "Todos (250)",
  Rung1SwadeshAndNsm65: "Nivel 1 · Vocabulario básico",
  Rung2MorphosyntaxAndTamValence: "Nivel 2 · Gramática y verbos",
  Rung3TheologicalKinshipAndNarratives: "Nivel 3 · Parentesco y relato",
  Rung4AutomatedPropagationAnd8Locks: "Nivel 4 · Propagación y revisión",
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
  includeAuditPanels = false,
  uiLocale = "es",
  uqPage = 1,
  externalAuditText = "",
  externalAuditResult = null,
  activeTier3aPair = "",
  previewWorks = null,
  elicitSessionIndex = 0,
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
  const activeBookPrefix = `${resolvedRef.split(".")[0]}.`;
  const cleanStrong = sanitizePipeField(strongId || "").toUpperCase();
  const prioritizedList = [...filteredList].sort((a, b) => {
    const refA = String(a.verse_id || a.ref || "").toUpperCase();
    const refB = String(b.verse_id || b.ref || "").toUpperCase();
    const matchA = refA === resolvedRef ? 4 : refA.startsWith(activeBookPrefix) ? 2 : 0;
    const matchB = refB === resolvedRef ? 4 : refB.startsWith(activeBookPrefix) ? 2 : 0;
    const sA = cleanStrong && Array.isArray(a.covered_high_freq_strongs) && a.covered_high_freq_strongs.includes(cleanStrong) ? 1 : 0;
    const sB = cleanStrong && Array.isArray(b.covered_high_freq_strongs) && b.covered_high_freq_strongs.includes(cleanStrong) ? 1 : 0;
    return (matchB + sB) - (matchA + sA);
  });
  const topLadder = prioritizedList.slice(0, Math.max(4, Number(limit) || 24));

  const entropyQueue = selectTopEntropyVerseQueue(rawList, resolvedRef, 3);
  const nextEntropyItem = entropyQueue[0] || { ref: "GEN.1.1", shannon_entropy: 2.45, marginal_gain_bits: 48.2 };

  const rungFilterHtml =
    `<div class="celf-rung-filter-bar ek-row-wrap ek-mb-sm" role="group" aria-label="${isEn ? "Filter by Review Stage" : "Filtro por Etapa de Revisión"}">` +
    `<button type="button" id="btnNextHighEntropyVerse" class="uls-chip ek-btn-fitts" data-next-entropy-ref="${nextEntropyItem.ref}" data-shannon-entropy="${nextEntropyItem.shannon_entropy}">⚡ ${isEn ? "Next priority verse" : "Siguiente pasaje prioritario"}: ${nextEntropyItem.ref}</button>` +
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
      const rungName = sanitizePipeField(item.rung || "Etapa comunitaria");
      const rungHuman = rungName === "Rung1SwadeshAndNsm65"
        ? (isEn ? "Stage 1 · Core words" : "Nivel 1 · Vocabulario básico")
        : CELF_RUNG_LABELS[rungName] || (isEn ? "Community stage" : "Etapa comunitaria");
      const humanRef = refStr.replace(/^([A-Z0-9]+)\.(\d+)\.(\d+)$/, "$1 $2:$3");
      return (
        `<button type="button" class="uls-chip mostrador-celf-rung-btn ek-btn-fitts" data-ladder-ref="${refStr}" data-ladder-rank="${rankNum}" data-ladder-rung="${rungName}">` +
        `#${rankNum} · ${humanRef} (${rungHuman})` +
        `</button>`
      );
    })
    .join("");

  const sisterCascade = computeSisterWorksCascade({
    strongId,
    ref: resolvedRef,
    level: cleanLevel,
    previewWorks: Array.isArray(previewWorks) ? previewWorks : [],
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
        `<button type="button" class="uls-chip ot-wave-filter-btn ek-btn-fitts" data-ot-wave="${w.wave}" data-uncertainty-bits="${w.meanUncertaintyBits}" aria-pressed="${waveNum === Number(w.wave) ? "true" : "false"}">${w.title}</button>`,
    ).join(" ") +
    `</div>`;

  const auditPanelsHtml = includeAuditPanels
    ? renderWorkshopAuditPanelsHtml({
      lang: cleanLang,
      uiLocale,
      uqPage,
      externalAuditText,
      externalAuditResult,
      activeTier3aPair,
    })
    : "";

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

  const showElicitationLadder = cleanLang !== "es" && cleanLang !== "en";
  const seed250 = buildElicitationSeedPayload({
    lang: cleanLang,
    rung: activeRung && activeRung !== "ALL" ? activeRung : "Rung1SwadeshAndNsm65",
    rank: 1,
    verseId: resolvedRef,
    strongIds: [sanitizePipeField(strongId || "").toUpperCase()].filter(Boolean),
    responseText: "",
  });
  const tier2OtProbeVerses = Number(ladderItems?.tier2_ot_probe_verses ?? 1);
  const modernizedFstProbeChars = Number(ladderItems?.modernized_fst_probe_chars ?? 23);
  const celfSummaryBlock = showElicitationLadder
    ? `<details id="celf250TechDetails" class="tech-details hig-tech-receipt-details ek-mb-sm" data-advanced-audit="true" data-celf250-ladder="true" data-celf250-rank="${seed250.rank}" data-tier2-ot-probe-verses="${tier2OtProbeVerses}" data-modernized-fst-probe-chars="${modernizedFstProbeChars}">` +
    `<summary>${isEn ? `Technical details · Community step #${seed250.rank}/250` : `Detalles técnicos · Paso #${seed250.rank}/250 (${totalCount} pasos)`}</summary>` +
    `<p class="ek-meta ek-mt-xs">${isEn ? `Community review (${totalCount} steps · Probes: ${tier2OtProbeVerses} OT v. / ${modernizedFstProbeChars} FST ch · target_ref_or_lemma=${resolvedRef})` : `Secuencia de revisión (${totalCount} pasos · Sonda AT: ${tier2OtProbeVerses} v. · FST: ${modernizedFstProbeChars} car. · target_ref_or_lemma=${resolvedRef})`}</p>` +
    `<pre id="celf250SeedOutput" class="ek-pre-compact">${seed250.payloadLine}</pre>` +
    `</details>`
    : "";

  const headerStrongSuffix = strongId ? ` · ${sanitizePipeField(strongId)}` : "";
  const showEvangeliosCopy = isWorkVisible("evangelios", { previewWorks });
  const sisterWorksPhraseEn = showEvangeliosCopy ? "Bible, Gospels, and Beatitudes" : "Bible and Beatitudes";
  const sisterWorksPhraseEs = showEvangeliosCopy ? "Biblia, Evangelios y Felices" : "Biblia y Felices";
  const elicitCardHtml = renderElicitSessionCardHtml(rawList, uiLocale, {
    index: elicitSessionIndex,
    activeBook: resolvedRef.split(".")[0],
  });
  return (
    `<div class="cascade-impact-box ek-card" data-workshop-task="2" data-cascade-level="${cleanLevel}" data-cascade-lang="${cleanLang}" data-celf-total="${totalCount}" data-active-ot-wave="${waveNum}">` +
    `<strong class="ek-title-sm">🌊 ${isEn ? `2. Validate rule & propagation ${cleanLevel} (${totalCount} steps${headerStrongSuffix} in ${resolvedRef})` : `2. Validar regla y propagación ${cleanLevel} (${totalCount} pasos${headerStrongSuffix} en ${resolvedRef})`}</strong>` +
    `<p class="ek-subtitle ek-mb-sm">` +
    `${isEn ? `Refining this root in <code>${cleanLang}</code> updates matching verses across ${sisterWorksPhraseEn}. Tap any step to inspect:` : `Al corregir esta raíz en <code>${cleanLang}</code>, el ajuste se propaga a ${sisterWorksPhraseEs}. Pulsa un paso para revisarlo:`}` +
    `</p>` +
    elicitCardHtml +
    celfSummaryBlock +
    sisterCascadeHtml +
    (showElicitationLadder ? `${rungFilterHtml}<div class="ek-auto-grid">${ladderButtons}</div>${otWavesHtml}` : "") +
    auditPanelsHtml +
    `<div class="ek-stack ek-mt-sm">` +
    masterCensusAndLedgerHtml +
    crdtWalAndLockP2Html +
    `</div>` +
    `</div>`
  );
}

export function renderWorkshopAuditPanelsHtml({
  lang = "stp",
  uiLocale = "es",
  uqPage = 1,
  externalAuditText = "",
  externalAuditResult = null,
  activeTier3aPair = "",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanLang = sanitizePipeField(lang || "stp").toLowerCase();
  const escAud = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const extAudit = EXTERNAL_AUDIT_8_LOCKS || {};
  const auditRowsHtml =
    externalAuditResult && Array.isArray(externalAuditResult.results) && externalAuditResult.results.length > 0
      ? externalAuditResult.results
        .slice(0, 8)
        .map((r) => {
          const badge = r.passed ? `✅ ${humanizeUiCopy("PASS", uiLocale)}` : `⛔ ${escAud(r.status)}`;
          return `<li><code>${escAud(r.ref)}</code> · <strong>${badge}</strong> — ${escAud(String(r.text || "").slice(0, 90))}</li>`;
        })
        .join("")
      : "";
  const extPdaUnbalanced = Number(extAudit.pda_unbalanced_count ?? 0);
  const extNormalizedCount = Number(extAudit.normalized_verses_count ?? 0);
  const extFormatLabel = String(extAudit.detected_format || "USFM").replace(/_OOXML$/i, "");
  const extTraditionLabel = formatEditorialTraditionLabel(extAudit.detected_tradition || "KJV", uiLocale);
  const hasLiveAuditEntries = Boolean(externalAuditResult && Number(externalAuditResult.entriesCount) > 0);
  const badgeHtml = hasLiveAuditEntries
    ? `<span class="uls-badge ek-badge-compact" data-audit-badge-state="${externalAuditResult.allPassed ? "verified" : "veto"}">${externalAuditResult.allPassed ? `✅ ${humanizeUiCopy("8/8 PASS", uiLocale)}` : "⛔ VETO"} (${externalAuditResult.passedCount}/${externalAuditResult.entriesCount})</span>`
    : `<span class="uls-badge ek-badge-compact" data-audit-badge-state="idle">⏳ ${isEn ? "Pending review · Paste or load draft" : "Pendiente de revisión · Pega o carga borrador"}</span>`;
  const extMetaLine = isEn
    ? `Format: ${extFormatLabel} (${extTraditionLabel}) · Normalized verses: ${extNormalizedCount} · Unbalanced quotes/brackets: ${extPdaUnbalanced}`
    : `Formato: ${extFormatLabel} (${extTraditionLabel}) · Versículos normalizados: ${extNormalizedCount} · Comillas/paréntesis sin cierre: ${extPdaUnbalanced}`;
  const auditResultSummaryHtml = externalAuditResult
    ? externalAuditResult.entriesCount === 0
      ? `<p class="ek-meta ek-mt-xs">${isEn ? "Paste USFM (e.g. \\c 1 \\v 1 ...) or load .usfm/.txt/.docx (<= 8 MiB local preview; CLI ekovoz audit-external for full corpus audit)." : "Pega USFM (ej. \\c 1 \\v 1 ...) o carga .usfm/.txt/.docx (<= 8 MiB en cliente; usa CLI ekovoz audit-external para auditoría completa)."}</p>`
      : `<div class="ek-mt-xs" data-live-audit-passed="${externalAuditResult.allPassed}"><strong class="ek-title-sm">${externalAuditResult.allPassed ? "✅" : "⛔"} ${externalAuditResult.passedCount}/${externalAuditResult.entriesCount} ${isEn ? "units passed 8 locks (local check)" : "unidades pasaron los 8 candados (revisión local)"}</strong><ul>${auditRowsHtml}</ul></div>`
    : `<p class="ek-meta ek-mt-xs">${isEn ? "Validate .usfm/.txt/.docx drafts (<= 8 MiB) locally with 8 deterministic locks. For full corpus audit run ekovoz audit-external." : "Valida borradores .usfm/.txt/.docx (<= 8 MiB) localmente con los 8 candados. Para auditoría completa de corpus usa ekovoz audit-external."}</p>`;
  const externalAuditHtml =
    `<div id="externalAudit8LocksPanel" class="ek-card-muted ek-mt-sm" data-audit-lang="${escAud(cleanLang)}" data-external-audit-8-locks="true" data-all-8-locks-passed="${hasLiveAuditEntries ? Boolean(externalAuditResult.allPassed) : false}" data-pda-unbalanced="${extPdaUnbalanced}" data-normalized-verses="${extNormalizedCount}">` +
    `<div class="ek-row-between">` +
    `<strong>🛡️ ${isEn ? "External Editorial Review · 8-Lock Audit" : "Revisión Editorial Externa · Auditoría 8 Candados"}</strong>` +
    badgeHtml +
    `</div>` +
    `<p class="ek-meta ek-mt-xs" data-external-audit-summary="true">${escAud(extMetaLine)}</p>` +
    `<textarea id="externalAuditTextInput" class="ek-field-input ek-textarea-full ek-mt-xs" rows="3" placeholder="\\id GEN&#10;\\c 1&#10;\\v 1 Tu'xich jumai...">${escAud(externalAuditText || "")}</textarea>` +
    `<div class="ek-row-wrap ek-mt-xs">` +
    `<label for="externalAuditFileInput" class="uls-chip ek-file-picker-btn">📂 ${isEn ? "Load .usfm / .txt / .docx (<=8 MB)" : "Cargar .usfm / .txt / .docx (<=8 MB)"}` +
    `<input type="file" id="externalAuditFileInput" class="sr-only-file-input" accept=".usfm,.sfm,.txt,.docx" aria-label="${isEn ? "Load USFM, TXT or DOCX file" : "Cargar archivo USFM, TXT o DOCX"}"></label>` +
    `<button type="button" id="btnRunExternalAudit" class="uls-chip ek-btn-fitts">🔍 ${isEn ? "Audit 8 locks" : "Auditar 8 candados"}</button>` +
    `</div>` +
    `<div id="externalAuditLiveResult" aria-live="polite">${auditResultSummaryHtml}</div>` +
    `</div>`;

  const uqTotal = UNCERTAINTY_QUEUE_60.length;
  const uqPageSize = 15;
  const uqTotalPages = Math.max(1, Math.ceil(uqTotal / uqPageSize));
  const uqSafePage = Math.min(uqTotalPages, Math.max(1, Number(uqPage) || 1));
  const uqStart = (uqSafePage - 1) * uqPageSize;
  const uqSlice = UNCERTAINTY_QUEUE_60.slice(uqStart, uqStart + uqPageSize);
  const uqPagerHtml =
    uqTotalPages > 1
      ? `<div class="ek-row-between ek-mt-xs" role="navigation" aria-label="${isEn ? "Priority queue pagination" : "Paginación de cola de prioridad"}">` +
      `<button type="button" id="btnUqPrevPage" class="uls-chip ek-btn-fitts" data-uq-page="${Math.max(1, uqSafePage - 1)}"${uqSafePage <= 1 ? " disabled" : ""}>← ${isEn ? "Prev" : "Anterior"}</button>` +
      `<span class="ek-meta">${uqStart + 1}–${Math.min(uqTotal, uqStart + uqSlice.length)} / ${uqTotal} · ${isEn ? "Page" : "Pág."} ${uqSafePage}/${uqTotalPages}</span>` +
      `<button type="button" id="btnUqNextPage" class="uls-chip ek-btn-fitts" data-uq-page="${Math.min(uqTotalPages, uqSafePage + 1)}"${uqSafePage >= uqTotalPages ? " disabled" : ""}>${isEn ? "Next" : "Siguiente"} →</button>` +
      `</div>`
      : "";
  const uncertaintyQueueHtml =
    `<div id="uncertaintyQueue60Panel" class="ek-card-muted ek-mt-sm" data-uncertainty-queue-total="${uqTotal}" data-uq-page="${uqSafePage}">` +
    `<div class="ek-row-between"><strong class="ek-title-sm">🎯 ${isEn ? `Priority Verses to Review (${uqTotal})` : `Versículos Prioritarios por Revisar (${uqTotal})`}</strong></div>` +
    `<div class="ek-row-wrap ek-mt-xs">` +
    uqSlice
      .map((uItem, idx) => {
        const uRef = sanitizePipeField(uItem.verse_id || uItem.ref || "ACT.5.8").toUpperCase();
        const uRank = Number(uItem.rank) || uqStart + idx + 1;
        const uScore = Number(uItem.semantic_uncertainty_u ?? uItem.shannon_entropy ?? 0.75).toFixed(3);
        return (
          `<button type="button" class="uls-chip uncertainty-queue-btn ek-btn-fitts" data-jump-osis="${uRef}" data-uncertainty-rank="${uRank}" data-uncertainty-u="${uScore}">` +
          `#${uRank} · ${uRef}` +
          `</button>`
        );
      })
      .join("") +
    `</div>` +
    uqPagerHtml +
    `</div>`;

  const selectedPairObj =
    TIER3A_CONTINUUMS.find(
      (tc) => `${sanitizePipeField(tc.donor_lang)}::${sanitizePipeField(tc.target_lang)}` === activeTier3aPair,
    ) || null;
  const tier3aDetailHtml = selectedPairObj
    ? `<strong>${escAud(selectedPairObj.donor_lang)} → ${escAud(selectedPairObj.target_lang)}</strong> · ${formatHumanMetricLabel("asjp", Number(selectedPairObj.asjp_ldnd || 0).toFixed(4), uiLocale)} · ${isEn ? "Cognates:" : "Cognados:"} ${escAud(selectedPairObj.sample_projected_cognates || "—")} · ${Number(FLOOR_1_SENTENCE_SPEC.single_sentence_unlocked_floor || 291)} ${isEn ? "languages unlocked from 1 anchor sentence" : "lenguas desbloqueadas desde 1 oración ancla"}`
    : `${isEn ? "Tap a closely related pair to inspect shared lexical roots and scaffold floor." : "Pulsa un par cercano para ver raíces compartidas y vocabulario afín."}`;
  const tier3aHtml =
    `<div id="tier3aDialectContinuumPanel" class="ek-card-muted ek-mt-sm" data-tier3a-continuums="${TIER3A_CONTINUUMS.length}" data-floor-1-sentence="${Number(FLOOR_1_SENTENCE_SPEC.single_sentence_unlocked_floor || 291)}" data-reference-tier1="${sanitizePipeField(FLOOR_1_SENTENCE_SPEC.reference_tier1 || "spa_rv1909")}" data-total-sentences="${Number(FLOOR_1_SENTENCE_SPEC.total_sentences || 250)}">` +
    `<strong class="ek-title-sm">🌐 ${isEn ? "Closely Related Languages" : "Lenguas Cercanas"}</strong>` +
    `<div class="ek-row-wrap ek-mt-xs">` +
    TIER3A_CONTINUUMS.map((tc) => {
      const donor = sanitizePipeField(tc.donor_lang);
      const target = sanitizePipeField(tc.target_lang);
      const pairKey = `${donor}::${target}`;
      const isPressed = pairKey === activeTier3aPair;
      return (
        `<button type="button" class="uls-chip tier3a-pair-btn ek-btn-fitts" data-tier3a-pair="${escAud(pairKey)}" data-donor-lang="${escAud(donor)}" data-target-lang="${escAud(target)}" data-asjp-ldnd="${Number(tc.asjp_ldnd || 0).toFixed(4)}" aria-pressed="${isPressed ? "true" : "false"}">` +
        `${escAud(donor)} → ${escAud(target)} (${escAud(tc.sample_projected_cognates || "")})` +
        `</button>`
      );
    }).join("") +
    `</div>` +
    `<div id="tier3aPairDetailHost" class="ek-meta ek-mt-xs" aria-live="polite">${tier3aDetailHtml}</div>` +
    `</div>`;

  return externalAuditHtml + uncertaintyQueueHtml + tier3aHtml;
}
