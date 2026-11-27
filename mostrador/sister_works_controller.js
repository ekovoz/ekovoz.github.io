// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D8-R37 (8A) | sister_works_controller.js]
// web/mostrador/sister_works_controller.js — Controlador de Escenario para Obras Hermanas (Los Felices + 1 Evangelio)
// ============================================================================

import { buildCssPagedMediaPrintHtml, dispatchTandaWorkerJob } from "./bimodal_tanda_print.js";
import { CROSS_WORK_BRIDGE_TABLE, escapeHtml } from "./bridge_and_chapter.js";
import { hydrateDiachronicRegister } from "./diachronic_register.js";
import { resolveOverlayEntryForOsis, resolveVerseWithOverlay } from "./drawer_workshop.js";
import { hydrateCulturalGlossesLexicon } from "./estudio.js";
import {
  formatEvangeliosBridgeLine,
  formatHumanEvangeliosPlateTitle,
  formatReadableCitation,
  hydratePericopesAndGlosses,
  renderEvangeliosPlateActionsHtml,
  resolveEvangeliosMacroThreadAndEcho,
  resolvePericopeHeaderForVerse,
  shouldShowEvangeliosBridgeLine,
} from "./evangelios.js";
import { isRtlLocale } from "./i18n.js";
import { parseBiblicalCoordinateReference } from "./reference.js";
import { resolveSafeDownloadFilename } from "./stealth_filename.js";
import { WORK_DRAWER_ADAPTERS } from "./projection_contract.js";

/**
 * Expande una referencia bíblica puntual o rango de versículos (ej. `"MAT 5:1-16"`, `"MAT.5.1-12"`, `"MAT.5.3"`)
 * en las coordenadas OSIS cubiertas y proyecta cualquier overlay CRDT activo en tiempo de lectura (`SLICE-V2C-20`).
 */
function projectEvangeliosPassageWithOverlays(state, lang = "es", referenceStr = "", baseText = "", fallbackOsis = "") {
  const rawBase = String(baseText || "");
  if (!state || !state.verifiedOverlaysByOsis || (!referenceStr && !fallbackOsis)) {
    return { text: rawBase, matchedOverlays: [] };
  }
  const anchorStr = String(referenceStr)
    .replace(/^Mt\b/i, "MAT")
    .replace(/^Mc\b/i, "MRK")
    .replace(/^Lc\b/i, "LUK")
    .replace(/^Jn\b/i, "JHN")
    .replace(/\s*[-–—]\s*\d+(?:[:.]\d+)?\s*$/, "")
    .trim();
  const parsed =
    parseBiblicalCoordinateReference(anchorStr) ||
    parseBiblicalCoordinateReference(fallbackOsis) ||
    parseBiblicalCoordinateReference(referenceStr);
  if (!parsed || !parsed.bookCode) {
    return { text: rawBase, matchedOverlays: [] };
  }
  const book = String(parsed.bookCode).toUpperCase();
  const ch = Number(parsed.chapter) || 1;
  const startV = Number(parsed.verse) || 1;
  const rangeMatch = String(referenceStr).match(/[:.]\s*(\d+)\s*[-–—]\s*(\d+)/);
  const vFrom = rangeMatch ? Math.max(1, Number(rangeMatch[1]) || startV) : startV;
  const vTo = rangeMatch ? Math.max(vFrom, Math.min(vFrom + 60, Number(rangeMatch[2]) || vFrom)) : vFrom;

  let projected = rawBase;
  const matchedOverlays = [];
  for (let v = vFrom; v <= vTo; v += 1) {
    const osis = `${book}.${ch}.${v}`;
    const ov = resolveOverlayEntryForOsis(state, lang, osis);
    if (!ov) continue;
    matchedOverlays.push(ov);
    const nextSurf = resolveVerseWithOverlay(state, lang, osis, "");
    if (!nextSurf) continue;
    if (vFrom === vTo) {
      projected = nextSurf;
    } else if (ov.old_surface && projected.includes(ov.old_surface)) {
      projected = projected.replace(ov.old_surface, nextSurf);
    } else if (!projected.includes(nextSurf)) {
      projected = projected ? `${projected} — [${osis}] ${nextSurf}` : nextSurf;
    }
  }
  return { text: projected, matchedOverlays };
}

/**
 * Resuelve la entrada semanal activa de *1 Evangelio* y su ancla bíblica en `CROSS_WORK_BRIDGE_TABLE` (`D8-R37`).
 */
export function resolveEvangeliosActiveSelection({
  corpus = null,
  quarterFilter = "T1",
  weekId = "",
  plateSlug = "",
  fallbackLang = "es",
} = {}) {
  const gospelRows = Array.isArray(corpus?.entries) ? corpus.entries : [];
  if (gospelRows.length === 0) return null;
  const cleanSlug = String(plateSlug || "").trim().toLowerCase();
  const cleanWeek = String(weekId || "").trim().toLowerCase();
  const matchedGlobal =
    (cleanSlug ? gospelRows.find((row) => String(row?.["plate_id"] || "").toLowerCase() === cleanSlug) : null) ||
    (cleanWeek
      ? gospelRows.find(
        (row) =>
          String(row?.["id"] || "").toLowerCase() === cleanWeek ||
          String(row?.["plate_id"] || "").toLowerCase() === cleanWeek,
      )
      : null);
  const effectiveQuarter = matchedGlobal?.["quarter"] || quarterFilter || "T1";
  const quarterEntries = gospelRows.filter((row) => row?.["quarter"] === effectiveQuarter);
  const pool = quarterEntries.length > 0 ? quarterEntries : gospelRows;
  const activeEntry =
    matchedGlobal ||
    pool.find((row) => String(row?.["id"] || "").toLowerCase() === cleanWeek) ||
    pool[0];
  let coordinate = null;
  const bridgeAnchor =
    activeEntry?.id === "s01" && activeEntry?.reference
      ? null
      : Object.values(CROSS_WORK_BRIDGE_TABLE.evangeliosAnchors || {}).find(
        (a) => a.weekId === activeEntry?.id,
      );
  if (bridgeAnchor) {
    coordinate = {
      book: bridgeAnchor.book,
      chapter: bridgeAnchor.chapter,
      verse: bridgeAnchor.verse,
    };
  }
  if (!coordinate && activeEntry?.reference) {
    const parsedEv = parseBiblicalCoordinateReference(activeEntry.reference);
    if (parsedEv && parsedEv.bookCode) {
      coordinate = {
        book: parsedEv.bookCode,
        chapter: parsedEv.chapter || 1,
        verse: parsedEv.verse || 1,
      };
    }
  }
  if (!coordinate) {
    const macroMeta = resolveEvangeliosMacroThreadAndEcho({
      plateSlug: activeEntry?.plate_id || "",
      weekId: activeEntry?.id || "",
    });
    if (macroMeta?.anchorOsis) {
      const parsedOsis = parseBiblicalCoordinateReference(macroMeta.anchorOsis);
      if (parsedOsis?.bookCode) {
        coordinate = {
          book: parsedOsis.bookCode,
          chapter: parsedOsis.chapter || 1,
          verse: parsedOsis.verse || 1,
        };
      }
    }
  }
  return {
    activeEntry,
    pool,
    effectiveQuarter,
    totalPlates: Number(corpus?.total_plates) || entries.length || 52,
    canonicalGospelVersesCount: Number(corpus?.canonical_gospel_verses_count) || 3779,
    activeLang: ["es", "en", "pt", "fr", "quc", "gn", "stp"].includes(fallbackLang)
      ? fallbackLang
      : "es",
    coordinate,
  };
}

/**
 * Construye las opciones HTML del selector semanal `#evangeliosWeekSelect` (`D8-R37` / `D8-R38` / `D4-R45`).
 */
function formatLocalizedGospelDisplayRef(ref = "", isEn = false) {
  return formatReadableCitation(ref, isEn ? "en" : "es");
}

function stripDuplicateEvangeliosTitleFromQuote(quoteText = "", titleText = "") {
  const q = String(quoteText || "").trim();
  const t = String(titleText || "").trim();
  if (!q || !t) return q;
  const idx = q.indexOf(" — ");
  if (idx > 0 && q.slice(idx + 3).trim() === t) {
    return q.slice(0, idx).trim();
  }
  return q === t ? "" : q;
}

export function buildEvangeliosWeekOptionsHtml(
  pool = [],
  activeEntryId = "s01",
  activeEvLang = "es",
  uiLocale = activeEvLang,
) {
  const isEn = String(uiLocale || activeEvLang || "es").toLowerCase().startsWith("en");
  const weekWord = isEn ? "Week" : "Semana";
  return (Array.isArray(pool) ? pool : [])
    .map((e) => {
      const sel = e.id === activeEntryId ? " selected" : "";
      const localizedRef = formatLocalizedGospelDisplayRef(e.reference || "", isEn);
      return `<option value="${escapeHtml(e.id)}" data-plate-slug="${escapeHtml(e.plate_id || "")}"${sel}>${weekWord} ${e.week} (${escapeHtml(e.quarter)}) · ${escapeHtml(localizedRef)}</option>`;
    })
    .join("");
}

/**
 * Renderiza la tarjeta principal de *1 Evangelio* (`#evangeliosActivePlateCard`) con perícopas y ecos AT (`D8-R37` / `D8-R38` / `D4-R45`).
 */
export function renderEvangeliosStageCardHtml(
  activeEntry,
  activeEvLang = "es",
  uiLocale = activeEvLang,
  corpusMeta = null,
  state = null,
) {
  if (!activeEntry) return "";
  const isEn = String(uiLocale || activeEvLang || "es").toLowerCase().startsWith("en");
  const weekWord = isEn ? "Week" : "Semana";
  const openBibleLabel = isEn ? "Open in The Bible" : "Abrir en La Biblia";
  const gestureLabel = isEn ? "Liturgical Gesture" : "Gesto Litúrgico";
  const bridgeLabel = isEn ? "Bridge" : "Puente";
  const totalPlates = Number(corpusMeta?.totalPlates ?? corpusMeta?.total_plates) || 52;
  const gospelVersesCount =
    Number(corpusMeta?.canonicalGospelVersesCount ?? corpusMeta?.canonical_gospel_verses_count) || 3779;
  const tObj = activeEntry.texts?.[activeEvLang] || activeEntry.texts?.es || {};
  const bridgeObj = activeEvLang === "es" ? activeEntry.texts?.en : activeEntry.texts?.es;
  const labelTitle = formatHumanEvangeliosPlateTitle(activeEntry, activeEvLang, uiLocale);
  const localizedRef = formatLocalizedGospelDisplayRef(activeEntry.reference || "", isEn);
  const macroMeta = resolveEvangeliosMacroThreadAndEcho({
    plateSlug: activeEntry.plate_id || "",
    weekId: activeEntry.id || "s01",
    anchorOsis: activeEntry.reference || "",
  });
  const effectiveRef = activeEntry.reference || macroMeta?.anchorOsis || "MRK.1.16";
  const parsedRef = parseBiblicalCoordinateReference(effectiveRef);
  const pericopeHdr = parsedRef
    ? resolvePericopeHeaderForVerse(parsedRef.bookCode, parsedRef.chapter || 1, parsedRef.verse || 1)
    : null;
  const formattedBridge = bridgeObj?.text
    ? formatEvangeliosBridgeLine(bridgeObj.text, activeEvLang, uiLocale)
    : "";
  const overlayProj = projectEvangeliosPassageWithOverlays(
    state,
    activeEvLang,
    effectiveRef,
    tObj.text || "",
    macroMeta?.anchorOsis || "",
  );
  const rawPassageText = String(corpusMeta?.passageText || "").trim();
  const strippedQuote = stripDuplicateEvangeliosTitleFromQuote(overlayProj.text, labelTitle);
  const quoteDisplayText = rawPassageText || strippedQuote;
  const overlayBadgesHtml = overlayProj.matchedOverlays
    .map(
      (ov) =>
        `<span class="uls-badge evangelios-overlay-badge" data-overlay-authority="${escapeHtml(
          ov.authorityTier || "LOCAL_WORKSHOP_SELF_SIGNED",
        )}" data-overlay-osis="${escapeHtml(ov.target_ref || "")}">🔐 ${escapeHtml(
          ov.target_ref || "",
        )} · ${escapeHtml(ov.authorityTier || "LOCAL_WORKSHOP_SELF_SIGNED")}</span>`,
    )
    .join("");
  return (
    `<div class="evangelios-reading-body">` +
    `<header class="evangelios-stage-card-header" data-pericope-header="${escapeHtml(pericopeHdr?.title || "")}" data-plate-slug="${escapeHtml(activeEntry.plate_id || "")}" data-total-plates="${totalPlates}" data-canonical-gospel-verses="${gospelVersesCount}">` +
    `<div><strong>${weekWord} ${activeEntry.week}/${totalPlates} · ${escapeHtml(labelTitle)}</strong> ` +
    `<span class="uls-badge evangelios-corpus-counts-badge" data-evangelios-corpus-counts="true">${totalPlates} ${isEn ? "plates" : "láminas"} · ${gospelVersesCount.toLocaleString("en-US")} vv.</span>${overlayBadgesHtml}</div>` +
    `<div class="evangelios-stage-card-actions">` +
    `<button type="button" class="uls-chip evangelios-stage-action-btn" data-evangelios-ref="${escapeHtml(activeEntry.reference)}">📖 ${openBibleLabel}: ${escapeHtml(localizedRef)}</button>` +
    `<button type="button" id="btnPrintEvangeliosPlate" class="uls-chip evangelios-stage-action-btn" data-action="evangelios-print-pdf" data-week-id="${escapeHtml(activeEntry.id || "s01")}">🖨️ ${isEn ? "Download Week PDF" : "Descargar Semana (PDF)"}</button>` +
    `</div>` +
    `</header>` +
    `<p class="evangelios-stage-gesture"><strong>🕊️ ${gestureLabel}:</strong> ${escapeHtml(activeEntry.gesture || "")}</p>` +
    (quoteDisplayText ? `<blockquote class="evangelios-stage-quote evangelios-passage-blockquote">${escapeHtml(quoteDisplayText)}</blockquote>` : "") +
    (shouldShowEvangeliosBridgeLine(activeEvLang) && bridgeObj && bridgeObj.text
      ? `<p class="evangelios-stage-bridge" data-formatted-bridge="${escapeHtml(formattedBridge)}"><em>${bridgeLabel}:</em> ${escapeHtml(bridgeObj.text)}</p>`
      : "") +
    renderEvangeliosPlateActionsHtml({
      weekId: activeEntry.id,
      plateSlug: activeEntry.plate_id || "",
      passageRef: activeEntry.reference,
      lang: activeEvLang,
      uiLocale,
      gestureText: activeEntry.gesture || "",
    }) +
    `</div>`
  );
}

/**
 * Sincroniza la visibilidad Harel XOR entre las 3 obras hermanas (`biblia`, `felices`, `evangelios`) (`D8-R37`).
 */
export function syncSisterWorksTabsDom(cleanWork = "biblia", getElFn) {
  if (typeof getElFn !== "function") return cleanWork;
  const bibSec = getElFn("bibleSovereignSection");
  const felSec = getElFn("felicesSovereignSection");
  const evaSec = getElFn("evangeliosSovereignSection");
  const drawersHost = getElFn("sovereignGlobalDrawersHost");
  const tabBib = getElFn("tabWorkBiblia");
  const tabFel = getElFn("tabWorkFelices");
  const tabEva = getElFn("tabWorkEvangelios");

  const applySec = (sec, active) => {
    if (!sec) return;
    sec.hidden = !active;
    if (typeof sec.setAttribute === "function") {
      sec.setAttribute("data-active-work", active ? "true" : "false");
    }
  };
  applySec(bibSec, cleanWork === "biblia");
  applySec(felSec, cleanWork === "felices");
  applySec(evaSec, cleanWork === "evangelios");
  // Keep global Harel drawers symmetric across registered work adapters (R11 draft gating handled by surface_compositor)
  const hasDrawerAdapter = Boolean(WORK_DRAWER_ADAPTERS[cleanWork]);
  const showGlobalDrawers = hasDrawerAdapter || Boolean(drawersHost?.getAttribute?.("data-inspector-open") === "true");
  applySec(drawersHost, showGlobalDrawers);

  if (tabBib) tabBib.setAttribute("aria-selected", cleanWork === "biblia" ? "true" : "false");
  if (tabFel) tabFel.setAttribute("aria-selected", cleanWork === "felices" ? "true" : "false");
  if (tabEva) tabEva.setAttribute("aria-selected", cleanWork === "evangelios" ? "true" : "false");
  return cleanWork;
}

/**
 * Enlaza la cinta de perícopas, la tarjeta socrática de *Los Felices* y el escenario de *Los Evangelios* (trimestres,
 * ecos AT, perícopas y selector semanal); devuelve el hidratador de la Obra 3 (`D9-R44`, costura LCOM4 ∂(C)=0).
 */
export function bindSisterWorksStageEvents(ctx = {}) {
  const {
    state,
    dataLayer,
    targetDoc,
    getEl,
    navigate,
    selectVerse,
    switchWork,
    hydrateBookAndChapterSelectors,
    updateCompassTriggerDom,
    syncLifeTrailsActiveState,
    syncUrlFromState,
    hydrateStudyDrawer,
    hydrateImproveDrawer,
    hydratePrintDrawerPanels,
    hydrateShareAndAuditDrawer,
  } = ctx;
  const pericopesRibbon = getEl("bibleChapterPericopesRibbon", targetDoc);
  if (pericopesRibbon && typeof pericopesRibbon.addEventListener === "function") {
    pericopesRibbon.addEventListener("click", async (e) => {
      const synBtn = e?.target?.closest
        ? e.target.closest("[data-synoptic-jump]")
        : e?.target?.getAttribute?.("data-synoptic-jump")
          ? e.target
          : null;
      const synRef = synBtn?.getAttribute?.("data-synoptic-jump");
      if (synRef) {
        const parsedSyn = parseBiblicalCoordinateReference(synRef);
        if (parsedSyn && parsedSyn.bookCode) {
          await navigate(
            {
              book: parsedSyn.bookCode,
              chapter: parsedSyn.chapter || 1,
              verse: parsedSyn.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
        return;
      }
      const vBtn = e?.target?.closest
        ? e.target.closest("[data-pericope-verse]")
        : e?.target?.getAttribute?.("data-pericope-verse")
          ? e.target
          : null;
      const vNum = Number(vBtn?.getAttribute?.("data-pericope-verse"));
      if (Number.isFinite(vNum) && vNum >= 1) {
        await selectVerse(vNum, targetDoc);
      }
    });
  }

  const wonderCard = getEl("felicesSocraticWonderCard", targetDoc);
  if (wonderCard && typeof wonderCard.addEventListener === "function") {
    wonderCard.addEventListener("click", async (e) => {
      const citeBtn = e?.target?.closest
        ? e.target.closest("[data-wonder-cite]")
        : e?.target?.getAttribute?.("data-wonder-cite")
          ? e.target
          : null;
      const citeRef = citeBtn?.getAttribute?.("data-wonder-cite");
      if (citeRef) {
        const parsedCite = parseBiblicalCoordinateReference(citeRef);
        await switchWork("biblia", targetDoc);
        if (parsedCite && parsedCite.bookCode) {
          await navigate(
            {
              book: parsedCite.bookCode,
              chapter: parsedCite.chapter || 1,
              verse: parsedCite.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
      }
    });
  }

  const hydrateEvangeliosSection = async (quarterFilter = state.evangeliosQuarter || "T1", weekId = state.evangeliosWeekId || "") => {
    const evSec = getEl("evangeliosSovereignSection", targetDoc);
    if (!evSec) return null;
    const rawStateLang = String(state.lang || "").trim();
    const activeCorpusLang =
      ["es", "en", "pt", "fr", "quc", "gn", "stp"].includes(rawStateLang)
        ? rawStateLang
        : String(state.effectiveCorpusLang || rawStateLang || "es").trim() || "es";
    state.evangeliosLang = activeCorpusLang;
    const evLangSelSync = getEl("evangeliosLangSelect", targetDoc);
    if (evLangSelSync) {
      evLangSelSync.hidden = true;
      evLangSelSync.value = activeCorpusLang;
    }

    if (typeof evSec.addEventListener === "function" && !evSec._evPrintBound) {
      evSec._evPrintBound = true;
      evSec.addEventListener("click", async (ev) => {
        const printBtn = ev?.target?.closest
          ? ev.target.closest('[data-action="evangelios-print-pdf"]')
          : ev?.target?.getAttribute?.("data-action") === "evangelios-print-pdf"
            ? ev.target
            : null;
        if (!printBtn) return;
        const wk = printBtn.getAttribute?.("data-week-id") || state.evangeliosWeekId || "s01";
        const curLang = String(state.lang || state.evangeliosLang || "es").trim() || "es";
        const activeQuote = evSec.querySelector?.("blockquote")?.textContent || `${state.book} ${state.chapter}:${state.verse}`;
        const stealthOutName = resolveSafeDownloadFilename(state, {
          kind: "evangelios_pdf",
          lang: curLang,
          weekId: wk,
        });
        printBtn.setAttribute?.("data-print-week", wk);
        printBtn.setAttribute?.("data-download-filename", stealthOutName);
        let pdfBytes = null;
        try {
          const synth = await synthesizeEvangeliosWeekPdfBytes({
            weekId: wk,
            entry: {
              id: wk,
              reference: `${state.book || "MRK"}.${state.chapter || 1}.${state.verse || 1}`,
              gesture: evSec.querySelector?.(".evangelios-stage-gesture")?.textContent || "",
              texts: { [curLang]: { text: activeQuote } },
            },
            activeEvLang: curLang,
            uiLocale: state.uiLocale || curLang,
            dataLayer,
            state,
          });
          pdfBytes = synth.pdfBytes;
        } catch {
          pdfBytes = null;
        }
        if (pdfBytes && pdfBytes.byteLength > 0 && typeof targetDoc?.createElement === "function") {
          printBtn.setAttribute?.("data-print-ready", "true");
          printBtn.setAttribute?.("data-print-format", "application/pdf");
          try {
            const dl = targetDoc.createElement("a");
            if (dl) {
              if (typeof globalThis.Blob === "function" && typeof globalThis.URL?.createObjectURL === "function") {
                dl.href = globalThis.URL.createObjectURL(new globalThis.Blob([pdfBytes], { type: "application/pdf" }));
              } else {
                let bin = "";
                for (let i = 0; i < pdfBytes.byteLength; i += 1) bin += String.fromCharCode(pdfBytes[i]);
                const b64 = typeof globalThis.btoa === "function" ? globalThis.btoa(bin) : Buffer.from(pdfBytes).toString("base64");
                dl.href = `data:application/pdf;base64,${b64}`;
              }
              dl.download = stealthOutName;
              dl.click?.();
            }
          } catch {
            // Non-fatal in headless DOM
          }
          return;
        }
        // Fallback honesto CSS Paged Media (@media print), nunca HTML disfrazado con extension .pdf (DEBRIS-R3-02)
        const printHtml = buildCssPagedMediaPrintHtml({
          lang: curLang,
          book: state.book || "MRK",
          chapter: state.chapter || 1,
          verse: state.verse || 1,
          verses: [{ ref: `${state.book || "MRK"} ${state.chapter || 1}:${state.verse || 1}`, text: activeQuote }],
          columns: 1,
          fontPt: 11.0,
          paper: state.paperFormat || "a4",
        });
        printBtn.setAttribute?.("data-print-ready", "paged-media");
        printBtn.setAttribute?.("data-print-format", "print-dialog");
        printBtn.setAttribute?.("data-print-bytes", String(printHtml.length));
        globalThis.window?.print?.();
      });
    }
    if (!state.pericopesAndGlossesLoaded && typeof dataLayer.loadPericopesAndGlosses === "function") {
      state.pericopesAndGlossesLoaded = true;
      try {
        const pgData = await dataLayer.loadPericopesAndGlosses();
        if (pgData) {
          hydratePericopesAndGlosses(pgData);
          hydrateCulturalGlossesLexicon(pgData.cultural_glosses || pgData);
        }
      } catch {
        // Non-fatal
      }
    }
    if (!state.diachronicRegisterLoaded && typeof dataLayer.loadDiachronicRegisterAudit === "function") {
      state.diachronicRegisterLoaded = true;
      try {
        const drData = await dataLayer.loadDiachronicRegisterAudit();
        if (drData) hydrateDiachronicRegister(drData);
      } catch {
        // Non-fatal
      }
    }
    const corpus =
      typeof dataLayer.loadEvangeliosCorpus === "function"
        ? await dataLayer.loadEvangeliosCorpus()
        : null;
    if (!corpus || !Array.isArray(corpus.entries)) return null;
    const evLangSel = getEl("evangeliosLangSelect", targetDoc);
    const fallbackEvLang = evLangSel?.value || state.evangeliosLang || state.lang || "es";
    const resolvedEv = resolveEvangeliosActiveSelection({
      corpus,
      quarterFilter,
      weekId,
      fallbackLang: fallbackEvLang,
    });
    if (!resolvedEv) return null;
    const {
      activeEntry,
      pool,
      effectiveQuarter,
      totalPlates,
      canonicalGospelVersesCount,
      activeLang: activeEvLang,
      coordinate,
    } = resolvedEv;
    state.evangeliosQuarter = effectiveQuarter;
    state.evangeliosLang = activeEvLang;
    state.evangeliosWeekId = activeEntry.id;
    if (coordinate) {
      state.book = coordinate.book;
      state.chapter = coordinate.chapter;
      state.verse = coordinate.verse;
    }
    hydrateBookAndChapterSelectors(targetDoc);
    updateCompassTriggerDom(targetDoc);
    syncLifeTrailsActiveState(targetDoc);
    syncUrlFromState(targetDoc, { push: false });

    const activeUiLocale = state.uiLocale || "en";
    const isUiEn = String(activeUiLocale).toLowerCase().startsWith("en");
    const evHeadingEl = getEl("evangeliosMainHeading", targetDoc);
    if (evHeadingEl) {
      evHeadingEl.textContent = isUiEn
        ? `🌅 The Gospels · ${totalPlates} Plates (${canonicalGospelVersesCount.toLocaleString("en-US")} vv.)`
        : `🌅 Los Evangelios · ${totalPlates} Láminas (${canonicalGospelVersesCount.toLocaleString("en-US")} vv.)`;
    }
    const evWeekLblEl = getEl("evangeliosWeekSelectLabel", targetDoc);
    if (evWeekLblEl) {
      evWeekLblEl.textContent = isUiEn ? "Week:" : "Semana:";
    }
    const weekSelect = getEl("evangeliosWeekSelect", targetDoc);
    if (weekSelect) {
      weekSelect.innerHTML = buildEvangeliosWeekOptionsHtml(
        pool,
        activeEntry.id,
        activeEvLang,
        activeUiLocale,
      );
      weekSelect.value = activeEntry.id;
    }

    const qTabs = getEl("evangeliosQuarterTabs", targetDoc);
    if (qTabs && typeof qTabs.querySelectorAll === "function") {
      for (const btn of qTabs.querySelectorAll("[data-evangelios-quarter]")) {
        const qCode = btn.getAttribute("data-evangelios-quarter");
        btn.setAttribute("aria-selected", qCode === quarterFilter ? "true" : "false");
      }
    }

    const cardEl = getEl("evangeliosActivePlateCard", targetDoc);
    if (cardEl && activeEntry) {
      cardEl.setAttribute("data-evangelios-id", activeEntry.id);
      cardEl.setAttribute("data-evangelios-quarter", activeEntry.quarter);
      cardEl.setAttribute("data-evangelios-lang", activeEvLang);
      let inlinePassageText = "";
      const parsedInline = parseEvangeliosStartCoordinate(activeEntry.reference || "", coordinate);
      if (parsedInline?.bookCode && typeof dataLayer?.loadChapter === "function") {
        try {
          const chData = await dataLayer.loadChapter({
            lang: activeEvLang,
            book: parsedInline.bookCode,
            chapter: parsedInline.chapter || 1,
          });
          const vFrom = parsedInline.verse || 1;
          const rangeMatch = /-(\d+)$/.exec(String(activeEntry.reference || "").trim());
          const vTo = rangeMatch ? Math.max(vFrom, Number(rangeMatch[1]) || vFrom) : vFrom;
          inlinePassageText = extractChapterVerseRange(chData, vFrom, vTo, 7).joinedText;
        } catch (err) {
          if (err instanceof ReferenceError || err instanceof TypeError) throw err;
        }
      }
      cardEl.innerHTML = renderEvangeliosStageCardHtml(
        activeEntry,
        activeEvLang,
        activeUiLocale,
        {
          totalPlates,
          canonicalGospelVersesCount,
          passageText: inlinePassageText,
        },
        state,
      );
    }
    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (state.activeSheet === "print") {
      hydratePrintDrawerPanels(targetDoc);
    } else if (state.activeSheet === "share") {
      hydrateShareAndAuditDrawer(targetDoc);
    }
    return activeEntry;
  };

  state.hydrateEvangeliosSection = hydrateEvangeliosSection;

  const evSec = getEl("evangeliosSovereignSection", targetDoc);
  if (evSec && typeof evSec.addEventListener === "function" && !evSec._evBound) {
    evSec._evBound = true;
    evSec.addEventListener("click", async (e) => {
      const qBtn = e?.target?.closest
        ? e.target.closest("[data-evangelios-quarter]")
        : e?.target?.getAttribute?.("data-evangelios-quarter")
          ? e.target
          : null;
      const nextQ = qBtn?.getAttribute?.("data-evangelios-quarter");
      if (nextQ) {
        await hydrateEvangeliosSection(nextQ, "");
        return;
      }
      const echoBtn = e?.target?.closest
        ? e.target.closest("[data-ot-echo-ref]")
        : e?.target?.getAttribute?.("data-ot-echo-ref")
          ? e.target
          : null;
      const echoRef = echoBtn?.getAttribute?.("data-ot-echo-ref");
      if (echoRef) {
        const parsedEcho = parseBiblicalCoordinateReference(echoRef);
        if (parsedEcho && parsedEcho.bookCode) {
          await switchWork("biblia", targetDoc);
          await navigate(
            {
              book: parsedEcho.bookCode,
              chapter: parsedEcho.chapter || 1,
              verse: parsedEcho.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
        return;
      }
      const pericopeBtn = e?.target?.closest
        ? e.target.closest("[data-pericope-ref]")
        : e?.target?.getAttribute?.("data-pericope-ref")
          ? e.target
          : null;
      const pericopeRef = pericopeBtn?.getAttribute?.("data-pericope-ref");
      if (pericopeRef) {
        const parsedPer = parseBiblicalCoordinateReference(pericopeRef);
        if (parsedPer && parsedPer.bookCode) {
          await switchWork("biblia", targetDoc);
          await navigate(
            {
              book: parsedPer.bookCode,
              chapter: parsedPer.chapter || 1,
              verse: parsedPer.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
        return;
      }
      const refBtn = e?.target?.closest
        ? e.target.closest("[data-evangelios-ref]")
        : e?.target?.getAttribute?.("data-evangelios-ref")
          ? e.target
          : null;
      const rawRef = refBtn?.getAttribute?.("data-evangelios-ref");
      if (rawRef) {
        const parsed = parseBiblicalCoordinateReference(rawRef);
        if (parsed && parsed.bookCode) {
          await switchWork("biblia", targetDoc);
          await navigate(
            {
              book: parsed.bookCode,
              chapter: parsed.chapter || 1,
              verse: parsed.verse || 1,
            },
            targetDoc
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
      }
    });
  }

  const evWeekSelect = getEl("evangeliosWeekSelect", targetDoc);
  if (evWeekSelect && typeof evWeekSelect.addEventListener === "function") {
    evWeekSelect.addEventListener("change", async (e) => {
      const wId = e?.target?.value || evWeekSelect.value || "s01";
      await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", wId);
    });
  }

  const evLangSelect = getEl("evangeliosLangSelect", targetDoc);
  if (evLangSelect && typeof evLangSelect.addEventListener === "function") {
    evLangSelect.addEventListener("change", async (e) => {
      const nextLang = e?.target?.value || evLangSelect.value || "es";
      state.evangeliosLang = nextLang;
      if (typeof navigate === "function") {
        await navigate({ lang: nextLang }, targetDoc);
      }
      await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
    });
  }
  return hydrateEvangeliosSection;
}

/**
 * Normaliza la lectura de versículos desde `dataLayer.loadChapter({ lang, book, chapter })`
 * aceptando tanto el formato canónico en arreglo `[{ start, end, text }]` como mapas `{ "1": "..." }`.
 */
export function extractChapterVerseRange(chData, vFrom = 1, vTo = vFrom, maxVerses = 7) {
  const rawVerses = chData?.data?.verses ?? chData?.verses ?? null;
  const startV = Math.max(1, Number(vFrom) || 1);
  const endV = Math.max(startV, Number(vTo) || startV);
  const limitV = Number.isFinite(maxVerses) ? Math.min(startV + Math.max(1, maxVerses) - 1, endV) : endV;
  const entries = [];
  if (Array.isArray(rawVerses)) {
    for (const row of rawVerses) {
      const vn = Number(row?.start ?? row?.verse ?? 0);
      const text = String(row?.text || "").trim();
      if (vn >= startV && vn <= limitV && text) {
        entries.push({ verse: vn, text });
      }
    }
  } else if (rawVerses && typeof rawVerses === "object") {
    for (let vn = startV; vn <= limitV; vn += 1) {
      const text = String(rawVerses[String(vn)] || "").trim();
      if (text) entries.push({ verse: vn, text });
    }
  }
  return {
    entries,
    joinedText: entries.map((e) => `${e.verse}. ${e.text}`).join(" "),
  };
}

function parseEvangeliosStartCoordinate(refStr = "", fallbackCoord = null) {
  const raw = String(refStr || "").trim();
  const startOnly = raw.replace(/\s*[-–—]\s*\d+(?:[:.]\d+)?\s*$/, "").trim();
  const parsed =
    (startOnly ? parseBiblicalCoordinateReference(startOnly) : null) ||
    parseBiblicalCoordinateReference(raw);
  if (parsed?.bookCode) return parsed;
  if (fallbackCoord?.book) {
    return {
      bookCode: fallbackCoord.book,
      chapter: Number(fallbackCoord.chapter) || 1,
      verse: Number(fallbackCoord.verse) || 1,
    };
  }
  return null;
}

/**
 * Sintetiza el PDF binario real (`%PDF-1.4`) para la semana activa de *Los Evangelios*
 * reutilizando el motor WASM/OpenType cliente (`dispatchTandaWorkerJob`, `0 KB` extra).
 */
export async function synthesizeEvangeliosWeekPdfBytes({
  weekId = "s01",
  entry = null,
  activeEvLang = "es",
  uiLocale = "es",
  dataLayer = null,
  state = null,
  wasmBytes = null,
  fontBytes = null,
} = {}) {
  const curLang = String(activeEvLang || state?.lang || state?.evangeliosLang || "es").trim() || "es";
  const macroMeta = resolveEvangeliosMacroThreadAndEcho({
    plateSlug: entry?.plate_id || "",
    weekId: weekId || entry?.id || "s01",
    anchorOsis: entry?.reference || "",
  });
  const refStr = String(entry?.reference || macroMeta?.anchorOsis || `${state?.book || "MRK"}.${state?.chapter || 1}.${state?.verse || 1}`);
  const parsed = parseEvangeliosStartCoordinate(refStr, {
    book: state?.book || "MRK",
    chapter: Number(state?.chapter) || 1,
    verse: Number(state?.verse) || 1,
  });
  const book = parsed?.bookCode || "MRK";
  const chapter = Number(parsed?.chapter) || 1;
  const verse = Number(parsed?.verse) || 1;
  let chapterVerses = [];
  if (typeof dataLayer?.loadChapter === "function") {
    try {
      const chRes = await dataLayer.loadChapter({ lang: curLang, book, chapter });
      const rawVerses = chRes?.data?.verses ?? chRes?.verses ?? null;
      if (Array.isArray(rawVerses)) {
        chapterVerses = rawVerses
          .map((row) => ({
            ref: `${book} ${chapter}:${Number(row?.start ?? row?.verse ?? 1)}`,
            text: String(row?.text || "").trim(),
          }))
          .filter((item) => item.text.length > 0);
      } else if (rawVerses && typeof rawVerses === "object") {
        chapterVerses = Object.entries(rawVerses)
          .map(([vNum, text]) => ({
            ref: `${book} ${chapter}:${vNum}`,
            text: String(text || "").trim(),
          }))
          .filter((item) => item.text.length > 0);
      }
    } catch (err) {
      if (err instanceof ReferenceError || err instanceof TypeError) throw err;
    }
  }
  const titleText = entry ? formatHumanEvangeliosPlateTitle(entry, curLang, uiLocale) : macroMeta?.title || "";
  const headerEntries = [];
  if (titleText) headerEntries.push({ ref: formatLocalizedGospelDisplayRef(refStr, String(uiLocale).startsWith("en")), text: titleText });
  if (entry?.gesture) headerEntries.push({ ref: "Gesto", text: entry.gesture });
  const bodyEntries = chapterVerses.length > 0 ? chapterVerses : [{ ref: `${book} ${chapter}:${verse}`, text: entry?.texts?.[curLang]?.text || entry?.texts?.es?.text || titleText }];
  const questionsEntries = (Array.isArray(macroMeta?.questions) ? macroMeta.questions : []).map((q, idx) => ({
    ref: `P${idx + 1}`,
    text: String(q || ""),
  }));
  const allEntries = [...headerEntries, ...bodyEntries, ...questionsEntries];
  const workerRes = await dispatchTandaWorkerJob({
    tandaId: `EV-${String(weekId || "s01").toUpperCase()}`,
    lang: curLang,
    book,
    chapter,
    verse,
    verses: allEntries,
    columns: 1,
    fontPt: 11.0,
    paper: state?.paperFormat || "a4",
    paperFormat: state?.paperFormat || "a4",
    orientation: "portrait",
    dir: isRtlLocale(curLang) ? "rtl" : "ltr",
    ...(wasmBytes ? { wasmBytes } : {}),
    ...(fontBytes ? { fontBytes } : {}),
  });
  return {
    pdfBytes: workerRes?.pdfBytes instanceof Uint8Array ? workerRes.pdfBytes : null,
    book,
    chapter,
    verse,
    verses: allEntries,
    workerResult: workerRes,
  };
}

export { bindFelicesStageEvents } from "./felices_stage_controller.js";

