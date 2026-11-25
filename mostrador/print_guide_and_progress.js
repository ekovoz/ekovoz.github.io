// ============================================================================
// web/mostrador/print_guide_and_progress.js — Extracción LCOM4 desde drawer_print.js (`D5-R13`, `D6-R13`, `D7-R13`).
// Progreso numérico determinista por libro (`k/66`), cancelación segura, atajos de etapa natural y guía física cotidiana.
// ============================================================================

import { NATURAL_PRINT_STAGE_PRESETS } from "./print_stage_ribbon.js";

function escHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normUsfmBook(rawBook) {
  const u = String(rawBook || "").trim().toUpperCase();
  return ({ EZE: "EZK", JOE: "JOL", NAH: "NAM", PHI: "PHP", SOL: "SNG" })[u] || u;
}

/**
 * Renderiza progreso determinista libro a libro (`k/total`), estimado en MB y botón Cancelar (`D5-R13`).
 */
export function renderTandaProgressCardHtml({
  active = false,
  completedBooks = 0,
  totalBooks = 66,
  currentBookCode = "GEN",
  editionLabel = "",
  estimatedMb = 0,
  cancellable = true,
  cancelled = false,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const total = Math.max(1, Number(totalBooks) || 1);
  const done = Math.max(0, Math.min(total, Number(completedBooks) || 0));
  const cleanBook = normUsfmBook(currentBookCode || "GEN");
  const mbText = Number(estimatedMb) > 0 ? ` · ~${Number(estimatedMb).toFixed(1)} MB` : "";
  const edText = editionLabel ? ` · ${escHtml(editionLabel)}` : "";
  const statusText = cancelled
    ? (isEn ? "PDF generation cancelled cleanly." : "Generación de PDF cancelada sin residuos.")
    : active
      ? (isEn
        ? `Building PDF: Book ${done}/${total} (${cleanBook})${mbText}${edText}`
        : `Armando PDF: Libro ${done}/${total} (${cleanBook})${mbText}${edText}`)
      : (isEn
        ? `Ready: ${done}/${total} books compiled${mbText}`
        : `Listo: ${done}/${total} libros compilados${mbText}`);
  const cancelBtn = cancellable && active && !cancelled
    ? `<button type="button" id="btnCancelTandaPdfJob" class="uls-chip print-cancel-btn" data-action="cancel-tanda-job">${isEn ? "Cancel" : "Cancelar"}</button>`
    : "";
  return `<div class="tanda-progress-card" data-progress-active="${active ? "true" : "false"}" data-progress-cancelled="${cancelled ? "true" : "false"}"><div class="tanda-progress-head"><span id="tandaWorkerProgressLabel">${statusText}</span>${cancelBtn}</div><progress id="tandaWorkerProgressBar" value="${done}" max="${total}"></progress></div>`;
}

/**
 * Atajos de etapas naturales (`4 Evangelios`, `NT 27`, `Salmos + Proverbios`, `Biblia Completa 66`).
 */
export function renderNaturalStagePresetsHtml({
  activePresetId = "",
  tier = 1,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const allowed = Number(tier) <= 1
    ? NATURAL_PRINT_STAGE_PRESETS
    : Number(tier) === 2
      ? NATURAL_PRINT_STAGE_PRESETS.filter((p) => p.id === "nt27")
      : [];
  if (allowed.length === 0) return "";
  const chips = allowed
    .map((p) => {
      const label = isEn ? p.labelEn : p.labelEs;
      const pressed = activePresetId === p.id ? "true" : "false";
      return `<button type="button" class="uls-chip" data-natural-stage-preset="${escHtml(p.id)}" aria-pressed="${pressed}">${escHtml(label)} · ${escHtml(p.pagesHint)}</button>`;
    })
    .join("");
  const heading = isEn ? "Quick print bundles" : "Etapas listas para imprimir";
  return `<div class="natural-stage-presets" role="group" aria-label="${heading}"><span class="natural-stage-title">${heading}</span><div class="chip-wrap-row">${chips}</div></div>`;
}

/**
 * Guía física cotidiana "De PDF a Papel" en 3 pasos simples sin jerga técnica (`D6-R13`).
 */
export function renderPhysicalPrintGuideHtml(paperFormat = "a4", uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanPaper = String(paperFormat || "a4").trim().toLowerCase() === "letter"
    ? (isEn ? "US Letter" : "Carta (México / EE. UU.)")
    : "A4";
  const steps = isEn
    ? [
      `1. Paper: pick ${cleanPaper} in your printer dialog.`,
      "2. Duplex: print double-sided with \"Flip on short edge\" for folded booklets.",
      "3. Bind: fold stack in half and staple or punch along the 4 spine marks.",
    ]
    : [
      `1. Papel: elige ${cleanPaper} al enviar a la impresora.`,
      "2. Doble cara: activa «voltear por borde corto» si imprimes cuadernillo.",
      "3. Armado: dobla las hojas a la mitad y engrapa o perfora en las 4 marcas.",
    ];
  const title = isEn ? "From PDF to Paper (3 simple steps)" : "De PDF a Papel (3 pasos simples)";
  return `<div id="physicalPrintGuideCard" class="print-guide-card"><strong>${title}</strong><ol class="print-guide-steps">${steps.map((s) => `<li>${escHtml(s)}</li>`).join("")}</ol></div>`;
}

/**
 * Recopila los versículos de Dosis 2 (bloque canónico) y Tanda/Dosis 3 (tanda o 66 libros) desde `fetchBookEntries`.
 */
export async function collectBlockAndTandaVerses({
  activeBook = "GEN",
  activeBlockSpec = null,
  activeBlockNumber = 1,
  targetMacroPlans = [],
  fullBookVerses = [],
  fetchBookEntries,
  filterBookEntriesRange,
  resolveMacroTandaForBlock,
} = {}) {
  const blockVerses = [];
  if (activeBlockSpec) {
    const startB = normUsfmBook(activeBlockSpec.startBook);
    const endB = normUsfmBook(activeBlockSpec.endBook);
    const mtForBlock = resolveMacroTandaForBlock(activeBlockNumber);
    const candidateBooks = Array.isArray(mtForBlock?.booksIncluded)
      ? mtForBlock.booksIncluded.map(normUsfmBook)
      : [normUsfmBook(activeBook)];
    const sIdx = candidateBooks.indexOf(startB);
    const eIdx = candidateBooks.indexOf(endB);
    const blockBooks = sIdx >= 0 && eIdx >= sIdx ? candidateBooks.slice(sIdx, eIdx + 1) : [startB, endB].filter(Boolean);
    for (const bCode of [...new Set(blockBooks)]) {
      const entries = await fetchBookEntries(bCode);
      const minCh = bCode === startB ? activeBlockSpec.startChapter : 1;
      const maxCh = bCode === endB ? activeBlockSpec.endChapter : 999;
      for (const item of filterBookEntriesRange(entries, bCode, minCh, maxCh, 1, 999)) blockVerses.push(item);
    }
  }
  const tandaVerses = [];
  const seenBooks = new Set();
  for (const mtStep of targetMacroPlans) {
    const macroBooks = Array.isArray(mtStep?.booksIncluded) && mtStep.booksIncluded.length > 0 ? mtStep.booksIncluded : [activeBook];
    for (const targetBook of macroBooks) {
      if (seenBooks.has(targetBook)) continue;
      seenBooks.add(targetBook);
      for (const item of await fetchBookEntries(targetBook)) tandaVerses.push(item);
    }
  }
  if (tandaVerses.length === 0) {
    for (const item of fullBookVerses) tandaVerses.push(item);
  }
  return {
    dose2Payload: blockVerses.length > 0 ? blockVerses : fullBookVerses,
    tandaVerses,
  };
}

/**
 * Ejecuta en paralelo controlado (o secuencial Full-66) el envío al worker para Dosis 2 y Dosis 3 (`D5-R13`).
 */
export async function executeDose2And3WorkerDispatch({
  state,
  effectiveLang,
  activeBook,
  activeBlockSpec,
  activeMacroTanda,
  targetMacroPlans,
  dose2Payload,
  tandaVerses,
  activeEditionId,
  activeRenderSpec,
  activeCols,
  activeFontPt,
  dir,
  skipDose2Redundant,
  encodePaperFormatCode,
  dispatchTandaWorkerJob,
  workerWrap,
  workerBar,
  workerLabel,
  explicitWorkerReq,
  activePrintSubtab,
  mountOfflineFontNoticeWithLocalImporter,
  storeWorkerTandaPdfResult,
  syncDose2AndDose3LinksForActiveLang,
  renderPrintDrawerPanelsSyncInDrawer,
  hydratePrintDrawerPanels,
  ctx,
  targetDoc,
  getEl,
} = {}) {
  const isEn = String(state.uiLocale || "es").startsWith("en");
  const prevAbort = state._activeTandaAbortController;
  if (prevAbort && typeof prevAbort.abort === "function") {
    try { prevAbort.abort(); } catch { /* non-fatal */ }
  }
  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  state._activeTandaAbortController = abortController;
  const cancelBtn = typeof getEl === "function" ? getEl("btnCancelTandaPdfJob", targetDoc) : null;
  if (cancelBtn) {
    cancelBtn.hidden = !explicitWorkerReq;
    if (typeof cancelBtn.addEventListener === "function" && !cancelBtn._cancelBound) {
      cancelBtn._cancelBound = true;
      cancelBtn.addEventListener("click", () => {
        state._activeTandaAbortController?.abort?.();
        workerWrap?.setAttribute?.("data-progress-cancelled", "true");
        workerWrap?.setAttribute?.("data-worker-active", "false");
        const cancelledCard = renderTandaProgressCardHtml({ active: false, cancelled: true, uiLocale: state.uiLocale || "es" });
        const cardHost = typeof getEl === "function" ? getEl("tandaWorkerProgressCardHost", targetDoc) : null;
        if (cardHost) cardHost.innerHTML = cancelledCard;
        if (workerLabel) {
          workerLabel.textContent = isEn ? "PDF generation cancelled cleanly." : "Generación de PDF cancelada sin residuos.";
        }
        cancelBtn.hidden = true;
      });
    }
  }
  if ((state.activeSubtabBySheet?.print || activePrintSubtab) === "doses" && explicitWorkerReq) {
    workerWrap?.setAttribute?.("data-worker-active", "true");
    workerWrap?.removeAttribute?.("hidden");
    if (workerWrap) workerWrap.hidden = false;
    workerBar?.setAttribute?.("data-ergos-active-job", "true");
    if (workerBar) workerBar.value = 15;
    if (workerLabel) workerLabel.textContent = isEn ? "Preparing PDF sheets in background…" : "Preparando pliegos PDF sin bloqueo…";
    const cardHost = typeof getEl === "function" ? getEl("tandaWorkerProgressCardHost", targetDoc) : null;
    if (cardHost) {
      cardHost.innerHTML = renderTandaProgressCardHtml({
        active: true,
        completedBooks: 0,
        totalBooks: Math.max(1, targetMacroPlans?.length === 16 ? 66 : 1),
        currentBookCode: activeBook || "GEN",
        editionLabel: state.activePrintProfileId || "",
        estimatedMb: 0,
        cancellable: true,
        cancelled: false,
        uiLocale: state.uiLocale || "es",
      });
    }
  }
  const baseJob = {
    lang: effectiveLang,
    editionId: activeEditionId,
    editionRenderSpec: activeRenderSpec,
    columns: activeCols,
    fontPt: activeFontPt,
    paper: state.paperFormat || "a4",
    orientation: state.orientation || "portrait",
    includeBoldFont: true,
    dir,
    maxPagesPerTanda: 0,
  };
  const onProgress = (prog = {}) => {
    const done = Number(prog.progressBookIndex || prog.tandaIndex || 0);
    const total = Math.max(1, Number(prog.progressTotalBooks || prog.totalTandas || 1));
    const code = prog.currentBookCode || activeBook || "GEN";
    const pct = Math.max(5, Math.min(99, Math.round((done / total) * 100)));
    const progressCardHtml = renderTandaProgressCardHtml({
      active: true,
      completedBooks: done,
      totalBooks: total,
      currentBookCode: code,
      editionLabel: state.activePrintProfileId || "",
      estimatedMb: Number(prog.estimatedMb || 0),
      cancellable: true,
      cancelled: false,
      uiLocale: state.uiLocale || "es",
    });
    const cardHost = typeof getEl === "function" ? getEl("tandaWorkerProgressCardHost", targetDoc) : null;
    if (cardHost) cardHost.innerHTML = progressCardHtml;
    if (workerBar) workerBar.value = pct;
    if (workerLabel) {
      workerLabel.textContent = isEn
        ? `Building PDF: Book ${done}/${total} (${code})`
        : `Armando PDF: Libro ${done}/${total} (${code})`;
    }
  };
  const jobOpts = abortController ? { onProgress, signal: abortController.signal } : { onProgress };
  const [dose2Res, dose3Res] = await Promise.all([
    skipDose2Redundant
      ? Promise.resolve(null)
      : dispatchTandaWorkerJob({
        ...baseJob,
        book: activeBlockSpec?.startBook || activeBook,
        chapter: activeBlockSpec?.startChapter || 1,
        verses: dose2Payload,
        booklet4n: state.foliationMode === "saddle_stitch",
      }, jobOpts),
    dispatchTandaWorkerJob({
      ...baseJob,
      book: state.generateFull66BookBible ? "GEN" : activeMacroTanda.startBook || activeBook,
      chapter: state.generateFull66BookBible ? 1 : activeMacroTanda.startChapter || 1,
      verses: tandaVerses,
      booklet4n: true,
    }, jobOpts),
  ]);
  if (state._activeTandaAbortController === abortController) {
    state._activeTandaAbortController = null;
  }
  if (cancelBtn) cancelBtn.hidden = true;
  if (workerBar) workerBar.value = 100;
  if (dose2Res?.type === "tanda-offline-font-notice" || dose3Res?.type === "tanda-offline-font-notice") {
    const noticeEl = getEl("tanda-offline-font-notice", targetDoc);
    const activeNotice = dose2Res?.type === "tanda-offline-font-notice" ? dose2Res : dose3Res;
    mountOfflineFontNoticeWithLocalImporter(noticeEl, activeNotice, {
      targetDoc,
      onImported: () => hydratePrintDrawerPanels?.(targetDoc),
    });
  }
  storeWorkerTandaPdfResult(state, "dose2", dose2Res, 1);
  storeWorkerTandaPdfResult(state, "dose3", dose3Res, targetMacroPlans.length);
  syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
  renderPrintDrawerPanelsSyncInDrawer(ctx);
}

/**
 * Renderiza y conecta los atajos de etapas naturales (`evangelios4`, `nt27`, `salmosProverbios`, `biblia66`).
 */
export function bindNaturalStagePresetsInDrawer({ state, targetDoc, getEl, hydratePrintDrawerPanels } = {}) {
  const host = typeof getEl === "function" ? getEl("printNaturalStagesHost", targetDoc) : null;
  if (!host) return false;
  const lang = String(state?.effectiveCorpusLang || state?.lang || "es").toLowerCase();
  const tier = lang === "he" || lang === "grc" ? 0 : lang === "stp" ? 2 : 1;
  host.innerHTML = renderNaturalStagePresetsHtml({
    activePresetId: state?.selectedNaturalStagePreset || "",
    tier,
    uiLocale: state?.uiLocale || "es",
  });
  if (typeof host.addEventListener === "function" && !host._naturalPresetsBound) {
    host._naturalPresetsBound = true;
    host.addEventListener("click", async (ev) => {
      const btn = ev?.target?.closest
        ? ev.target.closest("[data-natural-stage-preset]")
        : ev?.target?.getAttribute?.("data-natural-stage-preset")
          ? ev.target
          : null;
      const presetId = String(btn?.getAttribute?.("data-natural-stage-preset") || "").trim();
      if (!presetId) return;
      state.selectedNaturalStagePreset = presetId;
      state.userRequestedPdfBuild = true;
      state.generateFull66BookBible = presetId === "biblia66";
      state.lastHydratedWorkerTandaKey = "";
      await hydratePrintDrawerPanels?.(targetDoc);
    });
  }
  return true;
}

/**
 * Conecta clics bajo demanda de `#linkDose2BlockPdf` y `#linkDose3FullBiblePdf` para síntesis JIT (`< 950 LOC`).
 */
export function bindDose2And3LazySynthLinks({
  state,
  targetDoc,
  getEl,
  planSequential16MacroTandasGeneration,
  isRtlLocale,
  hydratePrintDrawerPanels,
} = {}) {
  for (const [linkId, flag] of [["linkDose2BlockPdf", "_dose2Bound"], ["linkDose3FullBiblePdf", "_dose3Bound"]]) {
    const linkEl = getEl(linkId, targetDoc);
    if (!linkEl || typeof linkEl.addEventListener !== "function" || linkEl[flag]) continue;
    linkEl[flag] = true;
    linkEl.addEventListener("click", async (ev) => {
      if (linkEl._directSynthesizedClick) return;
      const curHref = String(linkEl.getAttribute?.("href") || linkEl.href || "");
      const needsSynth = !curHref || curHref.startsWith("#") || curHref.startsWith("data:") ||
        (linkId === "linkDose2BlockPdf" ? !state.dose2ObjectUrl : !state.dose3ObjectUrl || !state._dose3Streamed16Of16);
      if (!needsSynth) return;
      ev?.preventDefault?.();
      if (linkId === "linkDose3FullBiblePdf") {
        state.fullBible16MacroTandasPlan = planSequential16MacroTandasGeneration({
          lang: state.effectiveCorpusLang || state.lang || "es",
          columns: state.columns || 2,
          fontPt: state.fontSizePt || 9.5,
          paper: state.paperFormat || "a4",
          dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
        });
        state.generateFull66BookBible = true;
      }
      state.lastHydratedWorkerTandaKey = "";
      try { await hydratePrintDrawerPanels?.(targetDoc); } finally { if (linkId === "linkDose3FullBiblePdf") state.generateFull66BookBible = false; }
      const readyHref = linkId === "linkDose2BlockPdf"
        ? (state.dose2ObjectUrl || String(linkEl.getAttribute?.("href") || linkEl.href || ""))
        : (state.dose3ObjectUrl || String(linkEl.getAttribute?.("href") || linkEl.href || ""));
      if (readyHref && !readyHref.startsWith("#") && typeof linkEl.click === "function") {
        linkEl._directSynthesizedClick = true;
        try { linkEl.click(); } finally { linkEl._directSynthesizedClick = false; }
      }
    });
  }
}
