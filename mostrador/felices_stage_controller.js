// ============================================================================
// web/mostrador/felices_stage_controller.js — Escenario Focal de Los Felices
// Extraído desde costura LCOM4 ∂(C)=0 (`D8-R3` + `D6-R3`):
// - `bindFelicesStageEvents` sin listener legado duplicado en `#footerContactBtn`.
// - `renderLocalizedFelicesPlateCardHtml` para láminas tipográficas multilingües (`bn-BD`, `ar`, etc.).
// ============================================================================

import {
  nextPlate,
  nextSlide,
  openActivePlateZoom,
  openModal,
  closeModal,
  prevPlate,
  prevSlide,
  printActivePlate,
  registerPlateCoordinateListener,
  resolvePlateForBibleCoordinate,
  setActivePlateIndex,
  setSlide,
  shareResource,
  syncFelicesWithCorpusLang,
  updateDownloadLinks,
  updateFocalPlate,
  updateUI,
} from "../i18n_ui.js";
import { BIBLE_CONSTANTS } from "../bible_constants.js";
import { escapeHtml } from "./bridge_and_chapter.js";
import { resolveFelicesDichaCoordinate } from "./evangelios.js";
import { parseBiblicalCoordinateReference } from "./reference.js";

/**
 * Compone una lámina tipográfica SVG/HTML nativa para idiomas distintos de `es` (`bn-BD`, `ar`, `hi`, `stp`, `en`)
 * evitando mostrar JPGs con tipografía española quemada dentro de la cuota de 403 KB en `web/`.
 */
export function renderLocalizedFelicesPlateCardHtml({
  plateIndex = 1,
  totalPlates = 27,
  lang = "en",
  uiLocale = "es",
  verseText = "",
  refLabel = "MAT 5:1",
  dir = "ltr",
} = {}) {
  const cleanLang = String(lang || "en").trim();
  const cleanUi = String(uiLocale || cleanLang || "es").trim().toLowerCase();
  const cleanDir = dir === "rtl" ? "rtl" : "ltr";
  const plateWord = cleanLang.toLowerCase().startsWith("bn") || cleanUi.startsWith("bn")
    ? "পাতা"
    : cleanUi.startsWith("es")
      ? "Lámina"
      : "Plate";
  const badgeLang = cleanLang.toUpperCase();
  return (
    `<article class="felices-localized-plate-card is-unoccluded" data-hides-overlay-duplicate="true" lang="${escapeHtml(cleanLang)}" dir="${cleanDir}" data-localized-plate="${Number(plateIndex) || 1}" data-plate-lang="${escapeHtml(cleanLang)}">` +
    `<div class="felices-localized-plate-top">` +
    `<svg class="felices-localized-crest" viewBox="0 0 64 20" aria-hidden="true">` +
    `<line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" stroke-width="1.2" />` +
    `<circle cx="32" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="1.4" />` +
    `<line x1="42" y1="10" x2="62" y2="10" stroke="currentColor" stroke-width="1.2" />` +
    `</svg>` +
    `<span class="felices-localized-plate-meta">${escapeHtml(plateWord)} ${Number(plateIndex) || 1} / ${Number(totalPlates) || 27} · ${escapeHtml(badgeLang)}</span>` +
    `</div>` +
    `<blockquote class="felices-localized-plate-verse">${escapeHtml(verseText || "")}</blockquote>` +
    `<footer class="felices-localized-plate-ref">${escapeHtml(refLabel || "")}</footer>` +
    `</article>`
  );
}

/**
 * Enlaza el visor focal de *Los Felices* (27 láminas, 12 dichas, carrusel, modales y puente a La Biblia).
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
  for (const dlId of ["linkSheets", "linkBooklet"]) {
    const dlLink = getEl(dlId, targetDoc);
    if (dlLink && typeof dlLink.addEventListener === "function") {
      dlLink.addEventListener("click", async (e) => {
        const href = String(dlLink.getAttribute?.("href") || dlLink.href || "");
        if (!href.startsWith("dist/") || typeof globalThis.fetch !== "function") return;
        e.preventDefault?.();
        let reachable = false;
        try {
          const headRes = await globalThis.fetch(href, { method: "HEAD" });
          reachable = Boolean(headRes?.ok);
        } catch {
          reachable = false;
        }
        if (reachable && typeof globalThis.window?.open === "function") {
          globalThis.window.open(href, "_blank", "noopener");
          return;
        }
        const toastEl = getEl("toastNotification", targetDoc);
        if (toastEl) {
          const isEn = String(state?.uiLocale || state?.lang || "es").toLowerCase().startsWith("en");
          toastEl.textContent = isEn
            ? "Offline standalone build: opening local print view"
            : "Modo web autónomo: abriendo vista local de impresión";
          toastEl.classList?.add?.("show");
        }
        if (typeof transitionSheet === "function") {
          await transitionSheet("print", targetDoc);
        } else {
          printActivePlate();
        }
      });
    }
  }
  const btnShareW = getEl("btnShareWork", targetDoc);
  if (btnShareW && typeof btnShareW.addEventListener === "function") {
    btnShareW.addEventListener("click", () => shareResource(targetDoc, state));
  }
  const foldTrig = getEl("foldGuideTrigger", targetDoc);
  if (foldTrig && typeof foldTrig.addEventListener === "function") {
    foldTrig.addEventListener("click", () => transitionSheet("print", targetDoc));
  }
  const felOptShare = getEl("btnFelicesOpticalShare", targetDoc);
  if (felOptShare && typeof felOptShare.addEventListener === "function") {
    felOptShare.addEventListener("click", () => transitionSheet("share", targetDoc));
  }
  const felLangSel = getEl("felicesLangSelect", targetDoc);
  if (felLangSel && typeof felLangSel.addEventListener === "function") {
    felLangSel.addEventListener("change", (e) => {
      const nextFelLang = String(e?.target?.value || felLangSel.value || "es");
      state.lang = nextFelLang;
      syncFelicesWithCorpusLang(nextFelLang, targetDoc);
      updateFocalPlate(targetDoc, nextFelLang, true, state.uiLocale || nextFelLang, state);
      updateDownloadLinks(targetDoc, nextFelLang);
      updateUI(targetDoc);
    });
  }
  const felPlateSel = getEl("felicesPlateSelect", targetDoc);
  if (felPlateSel && typeof felPlateSel.addEventListener === "function") {
    felPlateSel.addEventListener("change", (e) => {
      const maxPlates = Number(BIBLE_CONSTANTS?.FELICES_PLATES_COUNT) || 27;
      const pIdx = Math.max(1, Math.min(maxPlates, Number(e?.target?.value || felPlateSel.value) || 24));
      setActivePlateIndex(pIdx, targetDoc);
    });
  }
  const felDichaSel = getEl("felicesDichaSelect", targetDoc);
  if (felDichaSel && typeof felDichaSel.addEventListener === "function") {
    felDichaSel.addEventListener("change", (e) => {
      const dIdx = Math.max(1, Math.min(12, Number(e?.target?.value || felDichaSel.value) || 1));
      state.explicitPlateRequested = false;
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
