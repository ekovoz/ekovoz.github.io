// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D8-R37 (8A) | sister_works_controller.js]
// web/mostrador/sister_works_controller.js — Controlador de Escenario para Obras Hermanas (Los Felices + 1 Evangelio)
// ============================================================================

import {
  closeModal, getActivePlateIndex, nextPlate, nextSlide, openActivePlateZoom, openModal, prevPlate, prevSlide,
  printActivePlate, registerPlateCoordinateListener, resolvePlateForBibleCoordinate, setActivePlateIndex, setSlide,
  shareResource, syncFelicesWithCorpusLang, updateDownloadLinks, updateFocalPlate,
} from "../i18n_ui.js";
import { escapeHtml, CROSS_WORK_BRIDGE_TABLE } from "./bridge_and_chapter.js";
import { hydrateDiachronicRegister } from "./diachronic_register.js";
import { hydrateCulturalGlossesLexicon } from "./estudio.js";
import {
  formatEvangeliosBridgeLine,
  formatHumanEvangeliosPlateTitle,
  hydratePericopesAndGlosses,
  renderEvangeliosPlateActionsHtml,
  resolveEvangeliosMacroThreadAndEcho,
  resolveFelicesDichaCoordinate,
  resolvePericopeHeaderForVerse,
  shouldShowEvangeliosBridgeLine,
} from "./evangelios.js";
import { parseBiblicalCoordinateReference } from "./reference.js";

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
  const entries = Array.isArray(corpus?.entries) ? corpus.entries : [];
  if (entries.length === 0) return null;
  const cleanSlug = String(plateSlug || "").trim().toLowerCase();
  const cleanWeek = String(weekId || "").trim().toLowerCase();
  const matchedGlobal =
    (cleanSlug ? entries.find((e) => String(e.plate_id || "").toLowerCase() === cleanSlug) : null) ||
    (cleanWeek
      ? entries.find(
          (e) =>
            String(e.id || "").toLowerCase() === cleanWeek ||
            String(e.plate_id || "").toLowerCase() === cleanWeek,
        )
      : null);
  const effectiveQuarter = matchedGlobal?.quarter || quarterFilter || "T1";
  const quarterEntries = entries.filter((e) => e.quarter === effectiveQuarter);
  const pool = quarterEntries.length > 0 ? quarterEntries : entries;
  const activeEntry =
    matchedGlobal ||
    pool.find((e) => String(e.id || "").toLowerCase() === cleanWeek) ||
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
      const labelTitle = formatHumanEvangeliosPlateTitle(e, activeEvLang, uiLocale);
      return `<option value="${escapeHtml(e.id)}" data-plate-slug="${escapeHtml(e.plate_id || "")}"${sel}>${weekWord} ${e.week} (${escapeHtml(e.quarter)}) · ${escapeHtml(labelTitle)} — ${escapeHtml(e.reference)}</option>`;
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
  const macroMeta = resolveEvangeliosMacroThreadAndEcho({
    plateSlug: activeEntry.plate_id || "",
    weekId: activeEntry.id || "s01",
    anchorOsis: activeEntry.reference || "",
  });
  const parsedRef = parseBiblicalCoordinateReference(activeEntry.reference || macroMeta?.anchorOsis || "MRK.1.16");
  const pericopeHdr = parsedRef
    ? resolvePericopeHeaderForVerse(parsedRef.bookCode, parsedRef.chapter || 1, parsedRef.verse || 1)
    : null;
  const formattedBridge = bridgeObj?.text
    ? formatEvangeliosBridgeLine(bridgeObj.text, activeEvLang, uiLocale)
    : "";
  return (
    `<header data-pericope-header="${escapeHtml(pericopeHdr?.title || "")}" data-plate-slug="${escapeHtml(activeEntry.plate_id || "")}" data-total-plates="${totalPlates}" data-canonical-gospel-verses="${gospelVersesCount}" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.5rem;">` +
    `<div><strong>${weekWord} ${activeEntry.week}/${totalPlates} (${escapeHtml(activeEntry.quarter)}) · ${escapeHtml(labelTitle)} — ${escapeHtml(activeEntry.reference || "")}</strong> ` +
    `<span class="uls-badge" data-evangelios-corpus-counts="true" style="font-size:0.72rem;">${totalPlates} ${isEn ? "plates" : "láminas"} · ${gospelVersesCount.toLocaleString("en-US")} vv.</span></div>` +
    `<button type="button" class="uls-chip" data-evangelios-ref="${escapeHtml(activeEntry.reference)}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.8rem;">📖 ${openBibleLabel}: ${escapeHtml(activeEntry.reference)}</button>` +
    `</header>` +
    `<p style="margin:0 0 0.45rem 0;font-size:0.82rem;color:var(--accent-amber);"><strong>🕊️ ${gestureLabel}:</strong> ${escapeHtml(activeEntry.gesture || "")}</p>` +
    `<blockquote style="margin:0 0 0.45rem 0;font-size:0.95rem;line-height:1.5;">${escapeHtml(tObj.text || "")}</blockquote>` +
    (shouldShowEvangeliosBridgeLine(activeEvLang) && bridgeObj && bridgeObj.text
      ? `<p data-formatted-bridge="${escapeHtml(formattedBridge)}" style="margin:0;font-size:0.8rem;color:var(--text-secondary);border-top:1px dashed var(--card-border);padding-top:0.4rem;"><em>${bridgeLabel}:</em> ${escapeHtml(bridgeObj.text)}</p>`
      : "") +
    renderEvangeliosPlateActionsHtml({
      weekId: activeEntry.id,
      plateSlug: activeEntry.plate_id || "",
      passageRef: activeEntry.reference,
      lang: activeEvLang,
      uiLocale,
    })
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
    if (sec.style) sec.style.display = active ? "" : "none";
    if (typeof sec.setAttribute === "function") {
      sec.setAttribute("data-active-work", active ? "true" : "false");
    }
  };
  applySec(bibSec, cleanWork === "biblia");
  applySec(felSec, cleanWork === "felices");
  applySec(evaSec, cleanWork === "evangelios");
  applySec(drawersHost, cleanWork === "biblia");

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
    state.evangeliosCorpus = corpus;
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
    state.evangeliosPlateSlug = activeEntry.plate_id || "";
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
      cardEl.innerHTML = renderEvangeliosStageCardHtml(activeEntry, activeEvLang, activeUiLocale, {
        totalPlates,
        canonicalGospelVersesCount,
      });
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
      state.evangeliosLang = e?.target?.value || evLangSelect.value || "es";
      await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
    });
  }
  return hydrateEvangeliosSection;
}

/**
 * Enlaza el visor focal de *Los Felices* (28 láminas, 12 dichas, carrusel, modales y puente a La Biblia) (`D9-R44`).
 */
export function bindFelicesStageEvents(ctx = {}) {
  const {
    state,
    targetDoc,
    getEl,
    navigate,
    switchWork,
    transitionSheet,
    hydrateBookAndChapterSelectors,
    updateCompassTriggerDom,
    syncLifeTrailsActiveState,
    syncUrlFromState,
    hydrateStudyDrawer,
    hydrateImproveDrawer,
    hydratePrintDrawerPanels,
    hydrateShareAndAuditDrawer,
  } = ctx;
  registerPlateCoordinateListener(async (coord) => {
    if (!coord) return;
    state.activePlateIndex = coord.plateIndex;
    if (coord.dichaIndex) state.activeDichaIndex = coord.dichaIndex;
    if (state.activeWork === "felices") {
      if (coord.book) state.book = coord.book;
      if (coord.chapter) state.chapter = coord.chapter;
      if (coord.verse) state.verse = coord.verse;
    }
    hydrateBookAndChapterSelectors(targetDoc);
    updateCompassTriggerDom(targetDoc);
    syncLifeTrailsActiveState(targetDoc);
    syncUrlFromState(targetDoc, { push: false });
    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (state.activeSheet === "print") {
      hydratePrintDrawerPanels(targetDoc);
    } else if (state.activeSheet === "share") {
      hydrateShareAndAuditDrawer(targetDoc);
    }
  });

  const focalFrame = getEl("focalPlateFrame", targetDoc);
  if (focalFrame && typeof focalFrame.addEventListener === "function") {
    focalFrame.addEventListener("click", () => openActivePlateZoom(targetDoc));
  }
  const btnOpenPreview = getEl("btnOpenPreviewCarousel", targetDoc);
  if (btnOpenPreview && typeof btnOpenPreview.addEventListener === "function") {
    btnOpenPreview.addEventListener("click", () => openModal("previewModal", targetDoc));
  }
  const btnPrevP = getEl("btnPrevPlate", targetDoc);
  if (btnPrevP && typeof btnPrevP.addEventListener === "function") {
    btnPrevP.addEventListener("click", () => prevPlate(targetDoc));
  }
  const btnNextP = getEl("btnNextPlate", targetDoc);
  if (btnNextP && typeof btnNextP.addEventListener === "function") {
    btnNextP.addEventListener("click", () => nextPlate(targetDoc));
  }
  const btnPrintP = getEl("btnPrintPlate", targetDoc);
  if (btnPrintP && typeof btnPrintP.addEventListener === "function") {
    btnPrintP.addEventListener("click", () => printActivePlate());
  }
  const btnShareW = getEl("btnShareWork", targetDoc);
  if (btnShareW && typeof btnShareW.addEventListener === "function") {
    btnShareW.addEventListener("click", () => shareResource(targetDoc));
  }
  const foldTrig = getEl("foldGuideTrigger", targetDoc);
  if (foldTrig && typeof foldTrig.addEventListener === "function") {
    foldTrig.addEventListener("click", () => transitionSheet("print", targetDoc));
  }
  const felOptShare = getEl("btnFelicesOpticalShare", targetDoc);
  if (felOptShare && typeof felOptShare.addEventListener === "function") {
    felOptShare.addEventListener("click", () => transitionSheet("share", targetDoc));
  }
  const footContact = getEl("footerContactBtn", targetDoc);
  if (footContact && typeof footContact.addEventListener === "function") {
    footContact.addEventListener("click", () => transitionSheet("field", targetDoc));
  }
  const felLangSel = getEl("felicesLangSelect", targetDoc);
  if (felLangSel && typeof felLangSel.addEventListener === "function") {
    felLangSel.addEventListener("change", (e) => {
      const nextFelLang = String(e?.target?.value || felLangSel.value || "es");
      state.lang = nextFelLang;
      syncFelicesWithCorpusLang(nextFelLang, targetDoc);
      updateFocalPlate(targetDoc, nextFelLang);
      updateDownloadLinks(targetDoc, nextFelLang);
    });
  }
  const felPlateSel = getEl("felicesPlateSelect", targetDoc);
  if (felPlateSel && typeof felPlateSel.addEventListener === "function") {
    felPlateSel.addEventListener("change", (e) => {
      const pIdx = Math.max(1, Math.min(28, Number(e?.target?.value || felPlateSel.value) || 24));
      setActivePlateIndex(pIdx, targetDoc);
    });
  }
  const felDichaSel = getEl("felicesDichaSelect", targetDoc);
  if (felDichaSel && typeof felDichaSel.addEventListener === "function") {
    felDichaSel.addEventListener("change", (e) => {
      const dIdx = Math.max(1, Math.min(12, Number(e?.target?.value || felDichaSel.value) || 1));
      state.activeDichaIndex = dIdx;
      const dCoord = resolveFelicesDichaCoordinate(dIdx);
      if (dCoord) {
        state.book = dCoord.book;
        state.chapter = dCoord.chapter;
        state.verse = dCoord.verse;
        const pIdx = resolvePlateForBibleCoordinate(dCoord.book, dCoord.chapter, dCoord.verse);
        setActivePlateIndex(pIdx, targetDoc);
      }
    });
  }
  const btnFelOpenBib = getEl("btnFelicesOpenInBible", targetDoc);
  if (btnFelOpenBib && typeof btnFelOpenBib.addEventListener === "function") {
    btnFelOpenBib.addEventListener("click", async () => {
      const rawOsis =
        btnFelOpenBib.getAttribute?.("data-felices-osis") ||
        `${state.book}.${state.chapter}.${state.verse}`;
      const parsed = parseBiblicalCoordinateReference(rawOsis);
      await switchWork("biblia", targetDoc);
      if (parsed && parsed.bookCode) {
        await navigate(
          {
            book: parsed.bookCode,
            chapter: parsed.chapter || 1,
            verse: parsed.verse || 1,
          },
          targetDoc,
        );
        hydrateBookAndChapterSelectors(targetDoc);
      }
    });
  }
  for (const [closeBtnId, modalId] of [
    ["previewModalCloseBtn", "previewModal"],
    ["btnPreviewClose", "previewModal"],
    ["plateModalCloseBtn", "plateModal"],
    ["btnPlateClose", "plateModal"],
  ]) {
    const cBtn = getEl(closeBtnId, targetDoc);
    if (cBtn && typeof cBtn.addEventListener === "function") {
      cBtn.addEventListener("click", () => closeModal(modalId, targetDoc));
    }
  }
  const cPrev = getEl("carouselPrevBtn", targetDoc);
  if (cPrev && typeof cPrev.addEventListener === "function") {
    cPrev.addEventListener("click", () => prevSlide(targetDoc));
  }
  const cNext = getEl("carouselNextBtn", targetDoc);
  if (cNext && typeof cNext.addEventListener === "function") {
    cNext.addEventListener("click", () => nextSlide(targetDoc));
  }
  for (const [pillId, slideIdx] of [
    ["termPill_1", 0],
    ["termPill_2", 1],
    ["termPill_3", 2],
  ]) {
    const pEl = getEl(pillId, targetDoc);
    if (pEl && typeof pEl.addEventListener === "function") {
      pEl.addEventListener("click", () => setSlide(slideIdx, targetDoc));
    }
  }
}
