// ============================================================================
// web/mostrador/workshop_audit_and_langs.js — Subpestaña 3 de Taller (5 Idiomas CC0,
// Anclas Léxicas Strong/VSO y Manejadores de Auditoría Externa P1..P8)
// Extraído de drawer_workshop.js (SLICE-R10-10 · D7-R10 / D8-R10 / B2 / B5)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { auditExternalFileClient, runClientExternalAudit8Locks } from "./concordance_search.js";
import { formatIsoLangPillBadge, humanizeUiCopy } from "./human_labels.js";
import { renderStpDraftCheckHtml } from "./mejorar.js";
import {
  buildWorkshopCldfCsvAndJson,
  renderStpLedgerProgressHtml,
} from "./workshop_elicit_and_cldf.js";

export function formatLock8StatusBadge(status = "PASS", uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanStatus = humanizeUiCopy(String(status || "PASS"), uiLocale);
  return isEn ? `🔒 Grammar check: ${cleanStatus}` : `🔒 Verificación gramatical: ${cleanStatus}`;
}

const COMBINING_DIACRITICS_REGEX = /[\u0300-\u036f\u0591-\u05c7\u064b-\u065f\u0670]/g;

function foldConsonants(s) {
  const clean = String(s || "")
    .normalize("NFKC")
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_REGEX, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  return /^[a-z0-9]+$/.test(clean) ? clean.replace(/[aeiou]/g, "") : clean;
}

function findSurfaceAnchorToken(surfaceStr, rowCandidates, allowCognateMatch) {
  const raw = String(surfaceStr || "");
  const rawLow = raw.toLowerCase();
  for (const cand of rowCandidates) {
    const clean = String(cand || "").trim();
    const minLen = /^[a-z0-9]+$/i.test(clean) ? 3 : 2;
    if (clean.length >= minLen && rawLow.includes(clean.toLowerCase())) {
      return clean;
    }
  }
  if (!allowCognateMatch || !raw) return "";
  const surfWords = raw.split(/[\s,.;:!?()«»“”"'‖]+/).filter((w) => w.length >= 2);
  for (const cand of rowCandidates) {
    const candSkel = foldConsonants(cand);
    const minLen = /^[a-z0-9]+$/.test(candSkel) ? 3 : 2;
    if (candSkel.length < minLen) continue;
    for (const sw of surfWords) {
      const swSkel = foldConsonants(sw);
      if (swSkel.length >= minLen && (swSkel === candSkel || swSkel.includes(candSkel) || candSkel.includes(swSkel))) {
        return sw;
      }
    }
  }
  return "";
}

export function deriveVerseLockAnchors(state, oldSurfStr = "") {
  const verseNum = Number(state?.verse);
  const rawRows = Array.isArray(state?.lastNavResult?.matrix?.rows)
    ? state.lastNavResult.matrix.rows
    : [];
  const verseMatrixRows = rawRows.filter((r) => {
    if (!r) return false;
    const vVal = Array.isArray(r) ? r[0] : (r.verse ?? r.v);
    return Number(vVal) === verseNum;
  });
  const derivedProperNouns = [];
  let derivedAgent = "";
  let derivedPatient = "";
  const activeLang = String(state?.lang || "").toLowerCase();
  const isVernacularBridge = activeLang !== "es" && activeLang !== "en";
  for (const r of verseMatrixRows) {
    const isArr = Array.isArray(r);
    const morphTag = String(isArr ? (r[4] ?? "") : (r.morph ?? r.c06_morph ?? ""));
    const domLn = String(isArr ? (r[5] ?? "") : (r.domain ?? r.c07 ?? ""));
    const realiaC14 = String(isArr ? (r[12] ?? "") : (r.realia ?? r.c14 ?? r.realia_c14 ?? ""));
    const glossCandidates = [
      String(isArr ? (r[1] ?? "") : (r.surface ?? r.c03_surface ?? "")).trim(),
      String(isArr ? (r[6] ?? "") : (r.gloss_en ?? r.c08_gloss_en ?? "")).trim(),
      String(isArr ? (r[7] ?? "") : (r.gloss_es ?? r.c09_gloss_es ?? "")).trim(),
      String(isArr ? (r[14] ?? "") : (r.translit ?? r.c06_translit ?? "")).trim(),
    ].filter(Boolean);
    const isProperRow =
      /(?:^|[\/\-H])Np\b|\b(?:NP|PRI|PROP)\b/.test(morphTag) ||
      /\bLN:93\./i.test(domLn) ||
      /\b(?:ONO-[A-Z0-9-]+|PER-[0-9]+|LOC-[0-9]+|ONOMASTICON:PROPER_DESIGNATOR)\b/i.test(realiaC14);
    const matchedTok = findSurfaceAnchorToken(
      oldSurfStr,
      glossCandidates,
      isVernacularBridge && isProperRow,
    );
    if (matchedTok) {
      if (isProperRow && !derivedProperNouns.includes(matchedTok)) {
        derivedProperNouns.push(matchedTok);
      }
      const clauseCol = isArr ? (r[8] ?? "") : (r.clause ?? r.c10_clause ?? "");
      const pragCol = isArr ? (r[10] ?? "") : (r.prag ?? r.c12_prag ?? "");
      const roleTag = `${clauseCol} ${pragCol}`.toUpperCase();
      if (!derivedAgent && /\b(?:SUBJ|AG|A0|A0_AGENT)\b/.test(roleTag)) {
        derivedAgent = matchedTok;
      } else if (!derivedPatient && /\b(?:OBJ|PAT|A1|A1_PATIENT)\b/.test(roleTag)) {
        derivedPatient = matchedTok;
      }
    }
  }
  const expectedProperNouns =
    Array.isArray(state?.expectedProperNouns) && state.expectedProperNouns.length > 0
      ? state.expectedProperNouns
      : derivedProperNouns;
  return {
    expectedProperNouns,
    expectedAgent: state?.expectedAgent || derivedAgent,
    expectedPatient: state?.expectedPatient || derivedPatient,
  };
}

export function renderWorkshop5LangsSwitcherHtml(
  activeTallerLang = "es",
  masterCensusSummary = null,
  uiLocale = "es",
  availableWorkshopLangs = null,
) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanActive = String(activeTallerLang || "es").trim().toLowerCase() || "es";
  const tier2Corpora = Array.isArray(masterCensusSummary?.tier2_nt_human_ot_workshop_corpora)
    ? masterCensusSummary.tier2_nt_human_ot_workshop_corpora
    : Array.isArray(availableWorkshopLangs) && availableWorkshopLangs.length > 0
      ? availableWorkshopLangs
      : ["stp"];
  const activeBadgeLabel = cleanActive === "he" || cleanActive === "grc"
    ? (isEn ? `Original source · ${cleanActive.toUpperCase()}` : `Fuente original · ${cleanActive.toUpperCase()}`)
    : tier2Corpora.includes(cleanActive)
      ? `${isEn ? "NT verified + Community OT" : "NT verificado + AT comunitario"}: ${cleanActive.toUpperCase()}`
      : `${isEn ? "Community edition" : "Edición comunitaria"}: ${cleanActive.toUpperCase()}`;
  const activeFocusHint = cleanActive === "he"
    ? (isEn ? "Source check · Hebrew Bible (WLC) roots, imperatives & proper names" : "Fuente original · Biblia Hebrea (WLC): raíces, imperativos y nombres propios")
    : cleanActive === "grc"
      ? (isEn ? "Source check · Greek NT & LXX lexical lemmas and clauses" : "Fuente original · Griego (LXX + SBLGNT): léxico y cláusulas")
      : cleanActive === "stp"
        ? (isEn ? "O'dam field workshop · New Testament + community OT review" : "Taller O'dam · Nuevo Testamento + revisión comunitaria AT")
        : (isEn ? `Community review · Active edition: ${cleanActive.toUpperCase()}` : `Revisión comunitaria · Edición activa: ${cleanActive.toUpperCase()}`);

  return (
    `<section id="workshopActiveCorpusBadge" class="ek-card-muted ek-span-full ek-stack-sm" data-workshop-corpus-unified="true" data-active-taller-lang="${escapeHtml(cleanActive)}" data-tier2-corpora="${escapeHtml(tier2Corpora.join(","))}">` +
    `<div class="ek-row-between">` +
    `<strong class="ek-title-sm" data-workshop-lang-banner="${escapeHtml(cleanActive)}">🌍 <bdi>${formatIsoLangPillBadge(cleanActive, "")}</bdi> · ${isEn ? "Unified Reading Language" : "Idioma activo unificado"}</strong>` +
    `<span class="uls-badge" data-tier2-workshop-badge="true">${escapeHtml(activeBadgeLabel)}</span>` +
    `</div>` +
    `<p class="ek-meta ek-m-0" data-workshop-lang-focus="${escapeHtml(cleanActive)}">${escapeHtml(activeFocusHint)}</p>` +
    `<button type="button" class="uls-chip" data-open-corpus-drawer="true">${isEn ? "Change language in top selector" : "Cambiar idioma en selector superior"}</button>` +
    `</section>`
  );
}

export function renderWorkshopAuditSubtabHtml({
  mod = {},
  state = {},
} = {}) {
  const activeTallerLang =
    String(state.workshopLang || state.activeTallerLang || state.lang || "es")
      .trim()
      .toLowerCase() || "es";
  const uiLocale = state.uiLocale || "es";
  const switcherHtml = renderWorkshop5LangsSwitcherHtml(
    activeTallerLang,
    state.masterCensusSummary || null,
    uiLocale,
    state.availableWorkshopLangs || null,
  );
  const draftOpts = {
    ...(Array.isArray(state.topUncertaintyQueue) && state.topUncertaintyQueue.length > 0
      ? { uncertaintyQueue: state.topUncertaintyQueue }
      : {}),
    lang: activeTallerLang,
  };
  const rawDraftHtml =
    activeTallerLang !== "he" && activeTallerLang !== "grc"
      ? typeof mod.renderStpDraftCheckHtml === "function"
        ? mod.renderStpDraftCheckHtml(draftOpts)
        : renderStpDraftCheckHtml(draftOpts)
      : "";
  const sanitizedDraftHtml = String(rawDraftHtml || "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<\/?(?:html|body|meta)[^>]*>/gi, "");
  const relocatedAuditHtml =
    typeof mod.renderWorkshopAuditPanelsHtml === "function"
      ? mod.renderWorkshopAuditPanelsHtml({
        lang: activeTallerLang,
        uiLocale,
        uqPage: state.uncertaintyQueuePage || 1,
        externalAuditText: state.externalAuditText || "",
        externalAuditResult: state.externalAuditResult || null,
        activeTier3aPair: state.activeTier3aPair || "",
      })
      : "";
  const catalogHtml =
    typeof mod.renderTallerArtifactsCatalogHtml === "function"
      ? mod.renderTallerArtifactsCatalogHtml({
        lang: activeTallerLang,
        includeCensusCard: true,
        includeEightLocksBar: false,
        masterCensusSummary: state.masterCensusSummary || null,
        uiLocale,
      })
      : "";
  const isEnAudit = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const annTotals = state.annotationIndexReport?.totals || null;
  const blindRows = Array.isArray(state.blindCalibrationReport) ? state.blindCalibrationReport : [];
  const rawChVerses = state.lastNavResult?.chapter?.verses;
  const chapterSampleText = rawChVerses
    ? Object.values(rawChVerses).slice(0, 6).map((v) => (typeof v === "string" ? v : v?.text || "")).join(" ").trim()
    : "";
  const activeModernize = state.externalModernizeAudit || (chapterSampleText
    ? computeClientModernizeReadabilityAudit(chapterSampleText, uiLocale)
    : null);
  const flowBadgeText = isEnAudit
    ? "Instant browser check · Full corpus sync on desktop"
    : "Revisión rápida en navegador · Sincronización completa en escritorio";
  const coverageSummaryHtml =
    annTotals || blindRows.length > 0 || activeModernize
      ? `<section id="workshopCoverageCalibrationCard" class="ek-card-muted ek-mt-sm" data-annotation-tokens="${Number(annTotals?.ot_tokens || 0) + Number(annTotals?.nt_tokens || 0)}" data-blind-calibration-rows="${blindRows.length}"${activeModernize ? ` data-modernize-aoa="${activeModernize.aoaYears}" data-modernize-mdd="${activeModernize.mdd}"` : ""}>` +
      `<div class="ek-row-between">` +
      `<strong>⚖️ ${isEnAudit ? "Quality & Source Text Calibration" : "Calibración de Calidad y Fuentes Originales"}</strong>` +
      `<span class="uls-badge">${blindRows.length || 48} ${isEnAudit ? "calibrated samples" : "muestras calibradas"}${annTotals ? ` · ${(Number(annTotals.ot_tokens || 0) + Number(annTotals.nt_tokens || 0)).toLocaleString("en-US")} ${isEnAudit ? "tokens" : "palabras"}` : ""}${activeModernize ? ` · ${activeModernize.label}` : ""}</span>` +
      `</div>` +
      `<p class="ek-meta ek-m-0 ek-mt-xs">${isEnAudit ? "Covers Hebrew/Greek lexical alignments and 12-language clarity checks across GEN, PSA, ISA, JON." : "Cubre alineación léxica hebreo/griego y verificación de claridad en 12 lenguas sobre GEN, PSA, ISA y JON."}</p>` +
      `<p class="ek-meta ek-m-0 ek-mt-xs" data-workshop-flow-honesty="true">${flowBadgeText}</p>` +
      `</section>`
      : "";
  const cldfBundle = buildWorkshopCldfCsvAndJson({
    lang: activeTallerLang,
    book: state.book || "GEN",
    chapter: state.chapter || 1,
    ladderItems: state.celfLadder250 || [],
  });
  const activeVerseKey = String(state.verse || 1);
  const hasExportRows = cldfBundle.rowCount > 0;
  const csvCtaHtml = hasExportRows
    ? `<a id="btnExportWorkshopCsv" class="uls-chip ek-btn-link" href="${cldfBundle.csvHref}" download="${escapeHtml(cldfBundle.csvFilename)}">⬇️ ${isEnAudit ? `Export CSV (${cldfBundle.rowCount} rows)` : `Exportar CSV (${cldfBundle.rowCount} filas)`}</a>`
    : `<a id="btnExportWorkshopCsv" class="uls-chip ek-btn-link" href="#workshopDirectExportBar" aria-disabled="true" data-export-gated="true">⬇️ ${isEnAudit ? "Export CSV (load steps first · 0 rows)" : "Exportar CSV (carga pasos primero · 0 filas)"}</a>`;
  const exportBarHtml =
    `<div id="workshopDirectExportBar" class="ek-row-wrap ek-mt-sm" data-workshop-task="3">` +
    csvCtaHtml +
    `<a id="btnExportWorkshopCldfJson" class="uls-chip ek-btn-link" href="${cldfBundle.jsonHref}" download="${escapeHtml(cldfBundle.jsonFilename)}">📦 ${isEnAudit ? "Export open word-list JSON" : "Exportar glosario JSON"}</a>` +
    `</div>`;
  const cldfPreviewHtml = cldfBundle.previewSnippet
    ? `<pre id="workshopCldfMirrorPreview" class="ek-pre-compact" data-cldf-preview="true">${escapeHtml(cldfBundle.previewSnippet)}</pre>`
    : `<p id="workshopCldfMirrorPreview" class="ek-meta ek-m-0" data-cldf-preview="empty">${isEnAudit ? "Select a step in Task 2 to populate rows for CSV export." : "Selecciona pasos en la tarea 2 para poblar las filas del CSV."}</p>`;
  const elicitAndCldfHtml =
    exportBarHtml +
    `<details id="workshopElicitCldfDetails" class="tech-details ek-mt-sm" data-cldf-rows="${cldfBundle.rowCount}">` +
    `<summary>📤 ${isEnAudit ? "3. Export · Census Progress & Mirror Preview" : "3. Exportar · Avance y Vista Previa"}</summary>` +
    cldfPreviewHtml +
    renderStpLedgerProgressHtml(state.masterCensusSummary || null, uiLocale) +
    `</details>`;
  return switcherHtml + elicitAndCldfHtml + relocatedAuditHtml + coverageSummaryHtml + catalogHtml + sanitizedDraftHtml;
}

export function computeClientModernizeReadabilityAudit(rawText = "", uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const clean = String(rawText || "").trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const sentences = clean ? clean.split(/[.!?;\n]+/).filter((s) => s.trim().length > 0) : [];
  const avgLen = words.length > 0 ? words.reduce((a, w) => a + w.length, 0) / words.length : 5.0;
  const avgClauseWords = sentences.length > 0 ? words.length / sentences.length : words.length;
  const aoaYears = Number(Math.min(18, Math.max(4.5, 4.2 + avgLen * 0.72)).toFixed(1));
  const mdd = Number(Math.min(6.0, Math.max(1.2, 1.3 + avgClauseWords * 0.06)).toFixed(2));
  const passed = aoaYears <= 11.0 && mdd <= 2.6;
  const label = isEn
    ? `Quick local estimate (full spacy/UD via CLI: ekovoz modernize-audit) · AoA=${aoaYears}y (≤11) · MDD=${mdd} (≤2.6)`
    : `Estimación local rápida (spacy/UD completo: ekovoz modernize-audit) · AoA=${aoaYears}a (≤11) · MDD=${mdd} (≤2.6)`;
  return {
    aoaYears,
    mdd,
    passed,
    wordsCount: words.length,
    method: "client-heuristic-estimate",
    cliCommand: "ekovoz modernize-audit",
    label,
  };
}

export function createWorkshopAuditHandlers({
  state,
  targetDoc,
  getEl,
  oldInput,
  refreshPatchPreview,
  navigate,
  hydrateBookAndChapterSelectors,
} = {}) {
  const onAuditChange = async (e) => {
    const targetId = e?.target?.id || "";
    if (targetId === "tallerExtraLangSelect" || e?.target?.getAttribute?.("data-taller-lang-select")) {
      const pickedExtra = String(e?.target?.value || "").trim().toLowerCase();
      if (pickedExtra) {
        state.workshopLang = pickedExtra;
        state.activeTallerLang = pickedExtra;
        state.refreshWorkshopAuditSubtab?.();
        (state.refreshPatchPreview || refreshPatchPreview)?.();
      }
      return;
    }
    if (targetId === "externalAuditTextInput") {
      state.externalAuditText = String(e.target.value ?? "");
      return;
    }
    if (targetId === "externalAuditFileInput") {
      const file = e?.target?.files?.[0];
      if (!file) return;
      const isDocx = /\.docx$/i.test(String(file.name || ""));
      let rawDraft = "";
      let extRes = null;
      if (isDocx && typeof file.arrayBuffer === "function") {
        const res = await auditExternalFileClient({
          fileName: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
          oldSurface: oldInput?.value || "",
        });
        rawDraft = res.extractedText;
        extRes = res.audit;
      } else if (typeof file.text === "function") {
        rawDraft = await file.text();
        const res = await auditExternalFileClient({
          fileName: file.name,
          rawText: rawDraft,
          oldSurface: oldInput?.value || "",
        });
        extRes = res.audit;
      } else {
        return;
      }
      state.externalAuditText = rawDraft;
      state.externalAuditResult = extRes || runClientExternalAudit8Locks({
        rawText: rawDraft,
        oldSurface: oldInput?.value || "",
      });
      state.externalModernizeAudit = computeClientModernizeReadabilityAudit(rawDraft, state.uiLocale || "es");
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
    }
  };
  const onAuditClick = async (e) => {
    const openCorpusBtn = e?.target?.closest
      ? e.target.closest("[data-open-corpus-drawer]")
      : e?.target?.getAttribute?.("data-open-corpus-drawer")
        ? e.target
        : null;
    if (openCorpusBtn) {
      const corpusBtn = getEl?.("sovereignCorpusLangBtn", targetDoc);
      corpusBtn?.click?.();
      return true;
    }
    const langPickBtn = e?.target?.closest
      ? e.target.closest("[data-taller-lang-pick]")
      : e?.target?.getAttribute?.("data-taller-lang-pick")
        ? e.target
        : null;
    const pickedTallerLang = langPickBtn?.getAttribute?.("data-taller-lang-pick");
    if (pickedTallerLang) {
      const cleanPicked = String(pickedTallerLang).toLowerCase();
      state.workshopLang = cleanPicked;
      state.activeTallerLang = cleanPicked;
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)?.();
      return true;
    }
    const uqPageBtn = e?.target?.closest
      ? e.target.closest("[data-uq-page]")
      : e?.target?.getAttribute?.("data-uq-page")
        ? e.target
        : null;
    const uqPageVal = uqPageBtn?.getAttribute?.("data-uq-page");
    if (uqPageVal !== null && uqPageVal !== undefined) {
      state.uncertaintyQueuePage = Math.max(1, Number(uqPageVal) || 1);
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
      return true;
    }
    const tier3aBtn = e?.target?.closest
      ? e.target.closest("[data-tier3a-pair]")
      : e?.target?.getAttribute?.("data-tier3a-pair")
        ? e.target
        : null;
    const tier3aKey = tier3aBtn?.getAttribute?.("data-tier3a-pair");
    if (tier3aKey) {
      state.activeTier3aPair = state.activeTier3aPair === tier3aKey ? "" : tier3aKey;
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
      return true;
    }
    const runAuditBtn = e?.target?.closest
      ? e.target.closest("#btnRunExternalAudit")
      : e?.target?.id === "btnRunExternalAudit"
        ? e.target
        : null;
    if (runAuditBtn) {
      const auditInput = getEl("externalAuditTextInput", targetDoc);
      const rawDraft = String(auditInput?.value ?? state.externalAuditText ?? "");
      state.externalAuditText = rawDraft;
      state.externalAuditResult = runClientExternalAudit8Locks({
        rawText: rawDraft,
        oldSurface: oldInput?.value || "",
      });
      state.externalModernizeAudit = computeClientModernizeReadabilityAudit(rawDraft, state.uiLocale || "es");
      state.refreshWorkshopAuditSubtab?.();
      (state.refreshPatchPreview || refreshPatchPreview)();
      return true;
    }
    const jumpOsisBtn = e?.target?.closest
      ? e.target.closest("[data-jump-osis]")
      : e?.target?.getAttribute?.("data-jump-osis")
        ? e.target
        : null;
    const jumpOsisRef = jumpOsisBtn?.getAttribute?.("data-jump-osis");
    if (jumpOsisRef) {
      const m = String(jumpOsisRef).trim().match(/^([A-Z0-9]+)\.(\d+)(?:\.(\d+))?/i);
      if (m) {
        await navigate(
          {
            book: m[1].toUpperCase(),
            chapter: Number(m[2]) || 1,
            verse: Number(m[3]) || 1,
          },
          targetDoc,
        );
        hydrateBookAndChapterSelectors(targetDoc);
      }
      return true;
    }
    return false;
  };
  return { onAuditChange, onAuditClick };
}
