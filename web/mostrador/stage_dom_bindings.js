// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D10-R45 (10A+) | stage_dom_bindings.js]
// web/mostrador/stage_dom_bindings.js — Costura Declarativa ∂_mut(C) = 0 de Listeners DOM del Escenario
// Extraído de web/mostrador.js (SLICE-186): brújula canónica, embudo 7,164 lenguas, selectores de libro/capítulo,
// píldoras de registro/ortografía, configuración de impresión/fotocopia y conmutación entre las 3 Obras Hermanas.
// ============================================================================

import {
  getActivePlateIndex,
  setActivePlateIndex,
  setPaperFormat,
  syncI18nUiFromState,
} from "../i18n_ui.js";
import {
  HAREL_SHEET_MAP,
  LIFE_TRAILS_ANCHORS,
  escapeHtml,
  lookupWordTokenStrongEntry,
  projectCrossWorkCoordinate,
} from "./bridge_and_chapter.js";
import { normalizeEditionSlug } from "./dosis.js";
import { syncActiveStrongInStudyDrawer } from "./drawer_hydrators.js";
import {
  indexRegionShards,
  listCountriesInRegion,
  listLanguagesInCountry,
  searchLanguages,
} from "./lang_funnel.js";
import {
  ROSETTA_66_BOOKS,
  parseBiblicalCoordinateReference,
} from "./reference.js";
import { syncSisterWorksTabsDom } from "./sister_works_controller.js";

/**
 * Conecta los listeners declarativos del escenario principal sobre `targetDoc` con contexto inyectado.
 */
export function bindStageDomEvents(ctx = {}) {
  const {
    state,
    dataLayer,
    targetDoc,
    getEl,
    navigate,
    selectVerse,
    dispenseDose1,
    setUiLocale,
    updateDoseLinks,
    hydrateCompassGrid,
    hydrateBookAndChapterSelectors,
    syncOrthographyPillsVisibility,
    renderViewportFromState,
    renderPrintDrawerPanelsSync,
    updateCompassTriggerDom,
    syncLifeTrailsActiveState,
    syncUrlFromState,
    buildDrawerHydratorContext,
    hydrateStudyDrawer,
    hydrateImproveDrawer,
    hydratePrintDrawerPanels,
    hydrateShareAndAuditDrawer,
    transitionSheet,
    hydrateEvangeliosSection,
  } = ctx;
  if (!targetDoc || !state || typeof getEl !== "function") return null;

  const stickyLangBtn = getEl("stickyActiveLangBtn", targetDoc);
  if (stickyLangBtn && typeof stickyLangBtn.addEventListener === "function" && !stickyLangBtn._stickyLangBound) {
    stickyLangBtn._stickyLangBound = true;
    stickyLangBtn.addEventListener("click", () => {
      const langDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
      if (langDrawer) {
        langDrawer.open = !langDrawer.open;
      }
      const corpusBtn = getEl("sovereignCorpusLangBtn", targetDoc);
      corpusBtn?.click?.();
    });
  }
  const stickyJumpBtn = getEl("btnStickyJumpToCanvas", targetDoc);
  if (stickyJumpBtn && typeof stickyJumpBtn.addEventListener === "function" && !stickyJumpBtn._stickyJumpBound) {
    stickyJumpBtn._stickyJumpBound = true;
    stickyJumpBtn.addEventListener("click", () => {
      const vp = getEl("bibleVerseViewport", targetDoc);
      vp?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
  }

  const bookSelect = getEl("bibleSelectBook", targetDoc);
  if (bookSelect && typeof bookSelect.addEventListener === "function") {
    bookSelect.addEventListener("change", async (e) => {
      const nextBook = e?.target?.value || bookSelect.value || "GEN";
      state.book = String(nextBook).toUpperCase();
      state.chapter = 1;
      state.verse = 1;
      hydrateBookAndChapterSelectors(targetDoc);
      await navigate({ book: state.book, chapter: 1, verse: 1 }, targetDoc);
    });
  }

  const chapSelect = getEl("bibleSelectChapter", targetDoc);
  if (chapSelect && typeof chapSelect.addEventListener === "function") {
    chapSelect.addEventListener("change", async (e) => {
      const nextChap = Number(e?.target?.value || chapSelect.value) || 1;
      await navigate({ chapter: nextChap, verse: 1 }, targetDoc);
    });
  }

  const prevBtn = getEl("btnPrevChapter", targetDoc);
  if (prevBtn && typeof prevBtn.addEventListener === "function") {
    prevBtn.addEventListener("click", async () => {
      if (state.chapter > 1) {
        await navigate({ chapter: state.chapter - 1, verse: 1 }, targetDoc);
      } else {
        const idx = ROSETTA_66_BOOKS.findIndex((b) => b.code === state.book);
        const prevBook =
          idx > 0 ? ROSETTA_66_BOOKS[idx - 1] : ROSETTA_66_BOOKS[ROSETTA_66_BOOKS.length - 1];
        await navigate({ book: prevBook.code, chapter: prevBook.chapters, verse: 1 }, targetDoc);
      }
      hydrateBookAndChapterSelectors(targetDoc);
    });
  }

  const nextBtn = getEl("btnNextChapter", targetDoc);
  if (nextBtn && typeof nextBtn.addEventListener === "function") {
    nextBtn.addEventListener("click", async () => {
      const bookMeta = ROSETTA_66_BOOKS.find((b) => b.code === state.book) || ROSETTA_66_BOOKS[0];
      if (state.chapter < bookMeta.chapters) {
        await navigate({ chapter: state.chapter + 1, verse: 1 }, targetDoc);
      } else {
        const idx = ROSETTA_66_BOOKS.findIndex((b) => b.code === state.book);
        const nextBook =
          idx >= 0 && idx + 1 < ROSETTA_66_BOOKS.length ? ROSETTA_66_BOOKS[idx + 1] : ROSETTA_66_BOOKS[0];
        await navigate({ book: nextBook.code, chapter: 1, verse: 1 }, targetDoc);
      }
      hydrateBookAndChapterSelectors(targetDoc);
    });
  }

  const compassBtn = getEl("btnOpenCompass", targetDoc);
  const compassModal = getEl("bibleCoordinateCompassModal", targetDoc);
  const closeCompassBtn = getEl("btnCloseCompassModal", targetDoc);
  const compassGrid = getEl("bibleCoordinateCompassGrid", targetDoc);

  if (compassBtn && typeof compassBtn.addEventListener === "function") {
    compassBtn.addEventListener("click", () => {
      hydrateCompassGrid(targetDoc);
      if (compassModal) {
        const isOpen =
          !compassModal.hidden &&
          (Boolean(compassModal.open) || compassModal.style?.display === "block");
        const nextHidden = isOpen;
        compassModal.hidden = nextHidden;
        compassModal.open = !nextHidden;
        if (compassModal.style) {
          compassModal.style.display = nextHidden ? "none" : "block";
        }
      }
    });
  }

  if (closeCompassBtn && typeof closeCompassBtn.addEventListener === "function") {
    closeCompassBtn.addEventListener("click", () => {
      if (compassModal) {
        compassModal.hidden = true;
        compassModal.open = false;
        if (compassModal.style) compassModal.style.display = "none";
      }
    });
  }

  if (compassGrid && typeof compassGrid.addEventListener === "function") {
    compassGrid.addEventListener("click", async (e) => {
      const target = e?.target?.closest ? e.target.closest("[data-compass-book]") : e?.target;
      const bookCode = target?.getAttribute
        ? target.getAttribute("data-compass-book")
        : target?.dataset?.compassBook;
      if (bookCode) {
        if (compassModal) {
          compassModal.hidden = true;
          compassModal.open = false;
          if (compassModal.style) compassModal.style.display = "none";
        }
        await navigate({ book: bookCode, chapter: 1, verse: 1 }, targetDoc);
        hydrateBookAndChapterSelectors(targetDoc);
      }
    });
  }

  const viewport = getEl("bibleVerseViewport", targetDoc);
  if (viewport && typeof viewport.addEventListener === "function") {
    viewport.addEventListener("click", async (e) => {
      const celfTrigger = e?.target?.closest
        ? e.target.closest('[data-action="open-celf250-workshop"]')
        : e?.target?.getAttribute?.("data-action") === "open-celf250-workshop"
          ? e.target
          : null;
      if (celfTrigger) {
        await transitionSheet("field", targetDoc);
        return;
      }
      const wordTokenEl = e?.target?.closest
        ? e.target.closest(".bible-word-token[data-word-surface]")
        : e?.target?.getAttribute?.("data-word-surface")
          ? e.target
          : null;
      if (wordTokenEl) {
        const wordSurface = wordTokenEl.getAttribute?.("data-word-surface") || "";
        const tokenVerse = Number(wordTokenEl.getAttribute?.("data-verse")) || state.verse;
        const tokenStrongAttr = wordTokenEl.getAttribute?.("data-strong-id") || "";
        const lookedUp = lookupWordTokenStrongEntry(
          wordSurface,
          state.reverseOrthoMap,
          state.tokenStrongPairs || [],
        );
        const resolvedStrong = String(tokenStrongAttr || lookedUp.strongId || "").toUpperCase();
        state.selectedWordSurface = wordSurface;
        state.selectedCanonicalToken = lookedUp.canonicalToken;
        if (resolvedStrong && resolvedStrong !== "∅") {
          state.activeStrongId = resolvedStrong;
        }
        if (Number.isFinite(tokenVerse) && tokenVerse >= 1 && tokenVerse !== Number(state.verse)) {
          await selectVerse(tokenVerse, targetDoc);
        }
        if (e?.altKey) {
          await transitionSheet("field", targetDoc);
          const oldInp = getEl("improveOldValueInput", targetDoc);
          if (oldInp && wordSurface) oldInp.value = wordSurface;
          const strongInp = getEl("improveStrongInput", targetDoc);
          if (strongInp && state.activeStrongId) strongInp.value = state.activeStrongId;
        } else {
          await transitionSheet("study", targetDoc);
          if (state.activeStrongId) {
            syncActiveStrongInStudyDrawer(state.activeStrongId, buildDrawerHydratorContext(targetDoc));
          }
        }
        return;
      }
      const verseEl = e?.target?.closest
        ? e.target.closest("[data-verse]")
        : e?.target?.getAttribute?.("data-verse")
          ? e.target
          : null;
      const vNum = verseEl?.getAttribute
        ? Number(verseEl.getAttribute("data-verse"))
        : Number(verseEl?.dataset?.verse);
      if (Number.isFinite(vNum) && vNum >= 1) {
        await selectVerse(vNum, targetDoc);
      }
    });
  }

  const regionSelect = getEl("bibleSelectRegion", targetDoc);
  const countrySelect = getEl("bibleSelectCountry", targetDoc);
  const langSelect = getEl("bibleSelectLang", targetDoc);
  const langFilterInput = getEl("quickLangFilterInput", targetDoc);

  const ensureRegionIndexLoaded = async () => {
    if (state.regionIndex) return state.regionIndex;
    const catalog = await dataLayer.loadCatalog();
    const shards =
      typeof dataLayer.loadAllRegionShards === "function" ? await dataLayer.loadAllRegionShards() : [];
    state.regionIndex = indexRegionShards(shards, catalog || { languages: [] });
    return state.regionIndex;
  };

  if (regionSelect && typeof regionSelect.addEventListener === "function") {
    regionSelect.addEventListener("change", async (e) => {
      state.regionCode = e?.target?.value || regionSelect.value || "americas-mesoamerica";
      const idx = await ensureRegionIndexLoaded();
      const subregions = listCountriesInRegion(idx, state.regionCode);
      if (countrySelect && subregions.length > 0) {
        countrySelect.innerHTML = subregions
          .map((c) => `<option value="${escapeHtml(c.code || c.name)}">${escapeHtml(c.label || c.name)}</option>`)
          .join("");
      }
      const regionLangs = listLanguagesInCountry(idx, state.regionCode, "");
      if (langSelect && regionLangs.length > 0) {
        langSelect.innerHTML = regionLangs
          .slice(0, 60)
          .map(
            (m) =>
              `<option value="${escapeHtml(m.code)}" data-seal="${escapeHtml(m.sovereignSeal || "")}">${escapeHtml(m.displayLabel)}</option>`,
          )
          .join("");
      }
    });
  }

  if (countrySelect && typeof countrySelect.addEventListener === "function") {
    countrySelect.addEventListener("change", async (e) => {
      const subName = String(e?.target?.value || countrySelect.value || "MX");
      state.countryIso2 = subName.toUpperCase().slice(0, 2);
      const idx = await ensureRegionIndexLoaded();
      const subLangs = listLanguagesInCountry(idx, state.regionCode || 1, subName);
      if (langSelect && subLangs.length > 0) {
        langSelect.innerHTML = subLangs
          .slice(0, 60)
          .map(
            (m) =>
              `<option value="${escapeHtml(m.code)}" data-seal="${escapeHtml(m.sovereignSeal || "")}">${escapeHtml(m.displayLabel)}</option>`,
          )
          .join("");
      }
      await updateDoseLinks(targetDoc);
    });
  }

  if (langSelect && typeof langSelect.addEventListener === "function") {
    langSelect.addEventListener("change", async (e) => {
      const nextLang = e?.target?.value || langSelect.value || "es";
      await navigate({ lang: nextLang }, targetDoc);
    });
  }

  if (langFilterInput && typeof langFilterInput.addEventListener === "function") {
    langFilterInput.addEventListener("input", async (e) => {
      const q = String(e?.target?.value || langFilterInput.value || "").trim();
      if (!q) return;
      const idx = await ensureRegionIndexLoaded();
      const matches = searchLanguages(idx, q, { limit: 25 });
      if (matches.length > 0 && langSelect) {
        langSelect.innerHTML = matches
          .map(
            (m) =>
              `<option value="${escapeHtml(m.code)}" data-iso="${escapeHtml(m.iso639_3)}" data-seal="${escapeHtml(m.sovereignSeal || "")}">${escapeHtml(m.displayLabel || m.name || m.code)}</option>`,
          )
          .join("");
      }
    });
  }

  for (const [btnId, corpusLang] of [
    ["quickLangEs", "es"],
    ["quickLangEs1909", "es-1909"],
    ["quickLangEn", "en"],
    ["quickLangStp", "stp"],
    ["quickLangHe", "he"],
    ["quickLangGrc", "grc"],
  ]) {
    const qBtn = getEl(btnId, targetDoc);
    if (qBtn && typeof qBtn.addEventListener === "function") {
      qBtn.addEventListener("click", async () => {
        const reg = corpusLang === "es-1909" ? "clasica" : state.register;
        await navigate({ lang: corpusLang, register: reg }, targetDoc);
      });
    }
  }

  const btnRegInter = getEl("btnRegIntergeneracional", targetDoc);
  if (btnRegInter && typeof btnRegInter.addEventListener === "function") {
    btnRegInter.addEventListener("click", async () => {
      const nextLang = state.lang === "es-1909" ? "es" : state.lang;
      await navigate({ lang: nextLang, register: "intergeneracional" }, targetDoc);
    });
  }

  const btnRegClasica = getEl("btnRegClasica", targetDoc);
  if (btnRegClasica && typeof btnRegClasica.addEventListener === "function") {
    btnRegClasica.addEventListener("click", async () => {
      const baseLang = state.lang === "es-1909" ? "es" : state.lang;
      await navigate({ lang: baseLang, register: "clasica" }, targetDoc);
    });
  }

  const btnRegBilingue = getEl("btnRegBilingue", targetDoc);
  if (btnRegBilingue && typeof btnRegBilingue.addEventListener === "function") {
    btnRegBilingue.addEventListener("click", async () => {
      await navigate({ register: "bilingue" }, targetDoc);
    });
  }

  const btnRegEstudio = getEl("btnRegEstudio", targetDoc);
  if (btnRegEstudio && typeof btnRegEstudio.addEventListener === "function") {
    btnRegEstudio.addEventListener("click", async () => {
      await transitionSheet("study", targetDoc);
    });
  }

  const toggleRoll = getEl("toggleRollMode", targetDoc);
  if (toggleRoll && typeof toggleRoll.addEventListener === "function") {
    toggleRoll.addEventListener("click", () => {
      state.rollMode = state.rollMode === "roll" ? "chapter" : "roll";
      toggleRoll.setAttribute("aria-pressed", state.rollMode === "roll" ? "true" : "false");
      renderViewportFromState(targetDoc);
      syncUrlFromState(targetDoc, { push: false });
    });
  }

  for (const [orthoBtnId, profile, altProfile] of [
    ["btnOrthoInali", "inali", null],
    ["btnOrthoTradicional", "tradicional", null],
    ["btnOrthoFonetica", "fonetica", null],
    ["btnOrthoBnBd", "bn-BD", null],
    ["btnOrthoBnIn", "bn-IN", null],
    ["btnOrthoArbTashkeel", "TASHKEEL_STRIPPED", "VOWELIZED"],
    ["btnOrthoUznCyrl", "CYRL", "LATN"],
    ["btnOrthoTzmTfng", "TFNG", "LATN"],
  ]) {
    const oBtn = getEl(orthoBtnId, targetDoc);
    if (oBtn && typeof oBtn.addEventListener === "function") {
      oBtn.addEventListener("click", () => {
        state.orthographyProfile = altProfile && state.orthographyProfile === profile ? altProfile : profile;
        syncOrthographyPillsVisibility(targetDoc);
        renderViewportFromState(targetDoc);
        syncUrlFromState(targetDoc, { push: false });
      });
    }
  }

  for (const [trailBtnId, anchor] of Object.entries(LIFE_TRAILS_ANCHORS)) {
    const tBtn = getEl(trailBtnId, targetDoc);
    if (tBtn && typeof tBtn.addEventListener === "function") {
      tBtn.addEventListener("click", async () => {
        await navigate({ book: anchor.book, chapter: anchor.chapter, verse: anchor.verse }, targetDoc);
        hydrateBookAndChapterSelectors(targetDoc);
      });
    }
  }

  const uiLangSelect = getEl("langSelect", targetDoc);
  const ulsTrigger = getEl("ulsTriggerBtn", targetDoc);
  if (uiLangSelect && typeof uiLangSelect.addEventListener === "function") {
    uiLangSelect.addEventListener("change", async (e) => {
      const nextUi = e?.target?.value || uiLangSelect.value || "en";
      await setUiLocale(nextUi, targetDoc);
      uiLangSelect.hidden = true;
      if (ulsTrigger) ulsTrigger.setAttribute("aria-expanded", "false");
    });
  }
  if (ulsTrigger && typeof ulsTrigger.addEventListener === "function") {
    ulsTrigger.addEventListener("click", () => {
      if (uiLangSelect) {
        uiLangSelect.hidden = !uiLangSelect.hidden;
        ulsTrigger.setAttribute("aria-expanded", uiLangSelect.hidden ? "false" : "true");
      }
    });
  }

  const corpusLangBtn = getEl("sovereignCorpusLangBtn", targetDoc);
  const corpusDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
  if (corpusLangBtn && typeof corpusLangBtn.addEventListener === "function") {
    corpusLangBtn.addEventListener("click", () => {
      if (corpusDrawer) {
        corpusDrawer.open = !corpusDrawer.open;
        corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
      }
    });
  }

  const evGlobalBadge = getEl("evangeliosGlobalLangBadge", targetDoc);
  if (evGlobalBadge && typeof evGlobalBadge.addEventListener === "function") {
    evGlobalBadge.addEventListener("click", () => {
      if (corpusDrawer) {
        corpusDrawer.open = !corpusDrawer.open;
        if (corpusLangBtn) corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
      }
    });
  }

  const refInput = getEl("mostradorRefInput", targetDoc);
  const refBtn = getEl("btnGoReference", targetDoc);
  if (refBtn && typeof refBtn.addEventListener === "function") {
    refBtn.addEventListener("click", async () => {
      const parsed = parseBiblicalCoordinateReference(refInput ? refInput.value : "");
      if (parsed && parsed.bookCode) {
        if (compassModal) {
          compassModal.hidden = true;
          if (compassModal.style) compassModal.style.display = "none";
        }
        await navigate(
          { book: parsed.bookCode, chapter: parsed.chapter || 1, verse: parsed.verse || 1 },
          targetDoc,
        );
        hydrateBookAndChapterSelectors(targetDoc);
      }
    });
  }

  for (const [sheetKey, cfg] of Object.entries(HAREL_SHEET_MAP)) {
    const btn = getEl(cfg.buttonId, targetDoc);
    if (btn && typeof btn.addEventListener === "function") {
      btn.addEventListener("click", () => transitionSheet(sheetKey, targetDoc));
    }
  }

  const handleDose1Trigger = async () => {
    const pkg = await dispenseDose1();
    if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
      const blob = new Blob([pkg.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = targetDoc.createElement ? targetDoc.createElement("a") : null;
      if (a) {
        a.href = url;
        a.download = pkg.filename;
        if (typeof a.click === "function") a.click();
      }
    }
    return pkg;
  };

  for (const dose1BtnId of ["btnDose1Sheets", "btnPrintAroundVerse"]) {
    const btnDose1 = getEl(dose1BtnId, targetDoc);
    if (btnDose1 && typeof btnDose1.addEventListener === "function") {
      btnDose1.addEventListener("click", handleDose1Trigger);
    }
  }

  const fontSlider = getEl("kindleFontSizeSlider", targetDoc);
  const colSel = getEl("kindleColumnSelector", targetDoc);
  const paperSel = getEl("kindlePaperFormatSelector", targetDoc);
  const orientSel = getEl("kindleOrientationSelector", targetDoc);
  const foliationSel = getEl("bibleFoliationModeSelect", targetDoc);
  const duplexToggle = getEl("kindleDuplexToggle", targetDoc);
  const btnSimPhotocopy = getEl("btnSimulatePhotocopy3Gen", targetDoc);

  const syncKindlePrintConfig = async () => {
    if (fontSlider?.value) state.fontSizePt = Number(fontSlider.value) || 10.5;
    if (colSel?.value) state.columns = Number(colSel.value) || 2;
    if (paperSel?.value) state.paperFormat = String(paperSel.value).toLowerCase();
    if (orientSel?.value) state.orientation = String(orientSel.value).toLowerCase();
    if (foliationSel?.value) state.foliationMode = String(foliationSel.value);
    if (duplexToggle && typeof duplexToggle.checked === "boolean") state.duplex = duplexToggle.checked;
    state.edition = normalizeEditionSlug(state.edition, {
      paperFormat: state.paperFormat,
      columns: state.columns,
      largePrint: state.fontSizePt >= 13,
    });
    syncI18nUiFromState(state, targetDoc);
    syncUrlFromState(targetDoc, { push: false });
    hydratePrintDrawerPanels(targetDoc);
    await updateDoseLinks(targetDoc);
  };

  for (const kCtrl of [fontSlider, colSel, paperSel, orientSel, foliationSel, duplexToggle]) {
    if (kCtrl && typeof kCtrl.addEventListener === "function") {
      kCtrl.addEventListener("change", syncKindlePrintConfig);
      kCtrl.addEventListener("input", syncKindlePrintConfig);
    }
  }

  const bindPaperFormatBtn = (btnEl, fmt) => {
    if (btnEl && typeof btnEl.addEventListener === "function") {
      btnEl.addEventListener("click", async () => {
        state.paperFormat = fmt;
        if (paperSel) paperSel.value = fmt;
        setPaperFormat(fmt, targetDoc);
        state.edition = normalizeEditionSlug(state.edition, {
          paperFormat: state.paperFormat,
          columns: state.columns,
          largePrint: state.fontSizePt >= 13,
        });
        syncI18nUiFromState(state, targetDoc);
        syncUrlFromState(targetDoc, { push: false });
        hydratePrintDrawerPanels(targetDoc);
        await updateDoseLinks(targetDoc);
      });
    }
  };
  bindPaperFormatBtn(getEl("toggleA4", targetDoc), "a4");
  bindPaperFormatBtn(getEl("toggleCarta", targetDoc), "letter");

  if (btnSimPhotocopy && typeof btnSimPhotocopy.addEventListener === "function") {
    btnSimPhotocopy.addEventListener("click", () => {
      const cycleOrder = [1, 2, 3, 5, 0];
      const currentGen = Number.isInteger(state.photocopyGen) ? state.photocopyGen : 3;
      const nextGen = cycleOrder[(cycleOrder.indexOf(currentGen) + 1) % cycleOrder.length];
      state.photocopyGen = nextGen;
      state.sauvolaK = Number((0.2 + nextGen * 0.024).toFixed(2));
      renderPrintDrawerPanelsSync(targetDoc);
    });
  }

  const tskCard = getEl("tskCrossRefsStratumCard", targetDoc);
  if (tskCard && typeof tskCard.addEventListener === "function") {
    tskCard.addEventListener("click", async (e) => {
      const pill = e?.target?.closest
        ? e.target.closest("[data-tsk-ref]")
        : e?.target?.getAttribute?.("data-tsk-ref")
          ? e.target
          : null;
      const ref = pill?.getAttribute ? pill.getAttribute("data-tsk-ref") : pill?.dataset?.tskRef;
      if (ref) {
        const parsed = parseBiblicalCoordinateReference(ref);
        if (parsed && parsed.bookCode) {
          await navigate(
            { book: parsed.bookCode, chapter: parsed.chapter || 1, verse: parsed.verse || 1 },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
      }
    });
  }

  const switchWork = async (workId, docRef = targetDoc) => {
    const cleanWork = ["biblia", "felices", "evangelios"].includes(workId) ? workId : "biblia";
    const prevWork = state.activeWork || "biblia";
    state.activeWork = cleanWork;
    if (cleanWork !== "biblia" && state.activeSheet) {
      await transitionSheet(null, docRef);
    }
    syncSisterWorksTabsDom(cleanWork, (id) => getEl(id, docRef));

    const projected = projectCrossWorkCoordinate({
      fromWork: prevWork,
      toWork: cleanWork,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      plateIndex: state.activePlateIndex ?? getActivePlateIndex(),
      dichaIndex: state.activeDichaIndex,
      weekId: state.evangeliosWeekId || "s01",
      evangeliosQuarter: state.evangeliosQuarter || "T1",
    });
    state.book = projected.book;
    state.chapter = projected.chapter;
    state.verse = projected.verse;
    state.activePlateIndex = projected.plateIndex;
    state.activeDichaIndex = projected.felicesDicha;
    state.evangeliosWeekId = projected.evangeliosWeekId;
    state.evangeliosQuarter = projected.evangeliosQuarter;

    if (cleanWork === "evangelios" && typeof hydrateEvangeliosSection === "function") {
      await hydrateEvangeliosSection(
        state.evangeliosQuarter || "T1",
        state.evangeliosWeekId || "s01",
      );
    } else if (cleanWork === "felices") {
      setActivePlateIndex(state.activePlateIndex ?? 24, docRef);
      state.felicesLoaded = true;
    } else if (cleanWork === "biblia") {
      await navigate(
        {
          book: state.book,
          chapter: state.chapter,
          verse: state.verse,
        },
        docRef,
      );
    }

    hydrateBookAndChapterSelectors(docRef);
    updateCompassTriggerDom(docRef);
    syncLifeTrailsActiveState(docRef);
    syncI18nUiFromState(state, docRef);
    syncUrlFromState(docRef, { push: prevWork !== cleanWork });

    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(docRef);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(docRef);
    } else if (state.activeSheet === "print") {
      hydratePrintDrawerPanels(docRef);
    } else if (state.activeSheet === "share") {
      hydrateShareAndAuditDrawer(docRef);
    }
    return cleanWork;
  };

  state.switchWork = switchWork;
  ctx.switchWork = switchWork;
  globalThis.switchSovereignWork = (w) => switchWork(w, targetDoc);

  const tabBib = getEl("tabWorkBiblia", targetDoc);
  const tabFel = getEl("tabWorkFelices", targetDoc);
  const tabEva = getEl("tabWorkEvangelios", targetDoc);
  if (tabBib && typeof tabBib.addEventListener === "function") {
    tabBib.addEventListener("click", () => switchWork("biblia", targetDoc));
  }
  if (tabFel && typeof tabFel.addEventListener === "function") {
    tabFel.addEventListener("click", () => switchWork("felices", targetDoc));
  }
  if (tabEva && typeof tabEva.addEventListener === "function") {
    tabEva.addEventListener("click", () => switchWork("evangelios", targetDoc));
  }

  return switchWork;
}
