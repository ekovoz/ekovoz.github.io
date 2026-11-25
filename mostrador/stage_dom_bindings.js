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
  syncFelicesWithCorpusLang,
  syncI18nUiFromState,
} from "../i18n_ui.js";
import {
  HAREL_SHEET_MAP,
  LIFE_TRAILS_ANCHORS,
  escapeHtml,
  lookupWordTokenStrongEntry,
  projectCrossWorkCoordinate,
} from "./bridge_and_chapter.js";
import { searchMultiBookConcordance } from "./concordance_search.js";
import { bindSurfaceActions } from "./dom_patch.js";
import { normalizeEditionSlug } from "./dosis.js";
import { DEFAULT_PRINT_CONFIG } from "./dosis_profiles_schema.js";
import { syncActiveStrongInStudyDrawer } from "./drawer_hydrators.js";
import { bindPrintFirstStageRibbon } from "./print_stage_ribbon.js";
import { bindCorpusPolyglotAndUiPreferences } from "./polyglot_picker_view.js";
import { resolvePublicOrPreviewWork } from "./projection_contract.js";
import { bindSupportContactDialog } from "./provenance_and_support_panel.js";
import {
  ROSETTA_66_BOOKS,
  parseBiblicalCoordinateReference,
  searchSpotlightCorpus,
} from "./reference.js";
import { syncSisterWorksTabsDom } from "./sister_works_controller.js";
import { createNativeDialogController, setActiveWork } from "./state_store.js";

/**
 * Conecta los listeners declarativos del escenario principal sobre `targetDoc` con contexto inyectado.
 */
export function bindStageDomEvents(ctx = {}) {
  const {
    state,
    store,
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

  const stickyJumpBtn = getEl("btnStickyJumpToCanvas", targetDoc);
  if (stickyJumpBtn && typeof stickyJumpBtn.addEventListener === "function") {
    stickyJumpBtn.setAttribute?.("data-action", "jump-to-canvas");
    bindSurfaceActions(stickyJumpBtn, {
      "jump-to-canvas": () => {
        const vp = getEl("bibleVerseViewport", targetDoc);
        vp?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      },
    }, { scope: "sticky-jump", events: ["click"] });
  }

  const compassTabBooks = getEl("btnCompassTabBooks", targetDoc);
  const compassTabConcordance = getEl("btnCompassTabConcordance", targetDoc);
  const compassTabTrails = getEl("btnCompassTabTrails", targetDoc);
  const compassPanelBooks = getEl("compassPanelBooks", targetDoc);
  const compassPanelConcordance = getEl("compassPanelConcordance", targetDoc);
  const compassPanelTrails = getEl("compassPanelTrails", targetDoc);
  const switchCompassTab = (tabName) => {
    const mode = tabName === "trails" ? "trails" : tabName === "concordance" ? "concordance" : "books";
    state.activeCompassTab = mode;
    compassTabBooks?.setAttribute?.("aria-selected", mode === "books" ? "true" : "false");
    compassTabConcordance?.setAttribute?.("aria-selected", mode === "concordance" ? "true" : "false");
    compassTabTrails?.setAttribute?.("aria-selected", mode === "trails" ? "true" : "false");
    if (compassPanelBooks) compassPanelBooks.hidden = mode !== "books";
    if (compassPanelConcordance) compassPanelConcordance.hidden = mode !== "concordance";
    if (compassPanelTrails) compassPanelTrails.hidden = mode !== "trails";
    const rInp = getEl("mostradorRefInput", targetDoc);
    if (rInp) {
      const isEn = String(state.uiLocale || "es").toLowerCase().startsWith("en");
      rInp.placeholder = mode === "concordance" ? (isEn ? "Word or phrase…" : "Palabra o frase…") : mode === "trails" ? (isEn ? "Search trail or topic" : "Buscar ruta o tema") : (isEn ? "Ref (Jn 3:16) or book" : "Cita (Jn 3:16) o libro");
    }
  };
  const tskAccEl = getEl("studyTskFormulaicAccordion", targetDoc);
  if (tskAccEl && typeof tskAccEl.addEventListener === "function") {
    tskAccEl.addEventListener("toggle", () => { if (tskAccEl.open) tskAccEl.scrollIntoView?.({ behavior: "smooth", block: "nearest" }); });
  }
  if (compassTabBooks) {
    compassTabBooks.setAttribute?.("data-action", "compass-tab-books");
    bindSurfaceActions(compassTabBooks, { "compass-tab-books": () => switchCompassTab("books") }, { scope: "compass-books", events: ["click"] });
  }
  if (compassTabConcordance) {
    compassTabConcordance.setAttribute?.("data-action", "compass-tab-concordance");
    bindSurfaceActions(compassTabConcordance, { "compass-tab-concordance": () => switchCompassTab("concordance") }, { scope: "compass-concordance", events: ["click"] });
  }
  if (compassTabTrails) {
    compassTabTrails.setAttribute?.("data-action", "compass-tab-trails");
    bindSurfaceActions(compassTabTrails, { "compass-tab-trails": () => switchCompassTab("trails") }, { scope: "compass-trails", events: ["click"] });
  }

  if (targetDoc && typeof targetDoc.addEventListener === "function" && !targetDoc._r8JumpDelegationBound) {
    targetDoc._r8JumpDelegationBound = true;
    targetDoc.addEventListener("click", (ev) => {
      const btn = ev?.target?.closest ? ev.target.closest("[data-jump-target]") : ev?.target?.getAttribute?.("data-jump-target") ? ev.target : null;
      const targetId = btn?.getAttribute?.("data-jump-target");
      if (!targetId) return;
      const el = getEl(targetId, targetDoc);
      if (el) {
        if (el.hidden) el.hidden = false;
        el.scrollIntoView?.({ behavior: "smooth", block: "start" });
      }
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

  const syncBodyWorkAndOverlayAttrs = (docRef = targetDoc) => {
    const bodyEl = docRef?.body;
    if (!bodyEl || typeof bodyEl.setAttribute !== "function") return;
    const curWork = String(state.activeWork || "biblia").trim().toLowerCase() || "biblia";
    bodyEl.setAttribute("data-work", curWork);
    const corpusOpen = Boolean(getEl("bibleLanguageAndRegisterDrawer", docRef)?.open);
    const compassOpen = Boolean(getEl("bibleCoordinateCompassModal", docRef)?.open);
    const anyOverlay = corpusOpen || compassOpen || Boolean(state.activeModal);
    bodyEl.setAttribute("data-overlay-open", anyOverlay ? "true" : "false");
  };
  syncBodyWorkAndOverlayAttrs(targetDoc);

  const compassDialogCtrl = createNativeDialogController(compassModal, {
    modalId: "compass",
    openerFallback: compassBtn,
    targetDoc,
    store: ctx.store || state.store || null,
  });

  const closeCompassModalDialog = () => {
    compassDialogCtrl.close();
    state.activeModal = null;
    syncBodyWorkAndOverlayAttrs(targetDoc);
  };

  if (compassBtn && typeof compassBtn.addEventListener === "function") {
    compassBtn.addEventListener("click", () => {
      hydrateCompassGrid(targetDoc);
      if (compassModal) {
        if (compassDialogCtrl.isOpen()) {
          closeCompassModalDialog();
        } else {
          compassDialogCtrl.open(compassBtn);
          state.activeModal = "compass";
          syncBodyWorkAndOverlayAttrs(targetDoc);
        }
      }
    });
  }

  if (closeCompassBtn && typeof closeCompassBtn.addEventListener === "function") {
    closeCompassBtn.addEventListener("click", () => {
      closeCompassModalDialog();
    });
  }

  if (compassGrid && typeof compassGrid.addEventListener === "function") {
    compassGrid.addEventListener("click", async (e) => {
      const target = e?.target?.closest ? e.target.closest("[data-compass-book]") : e?.target;
      const bookCode = target?.getAttribute
        ? target.getAttribute("data-compass-book")
        : target?.dataset?.compassBook;
      if (bookCode) {
        closeCompassModalDialog();
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
        if (resolvedStrong && resolvedStrong !== "∅") {
          state.activeStrongId = resolvedStrong;
        }
        if (Number.isFinite(tokenVerse) && tokenVerse >= 1 && tokenVerse !== Number(state.verse)) {
          await selectVerse(tokenVerse, targetDoc);
        }
        if (e?.altKey) {
          await transitionSheet("field", targetDoc);
          const oldInp = getEl("improveOldSurfaceInput", targetDoc);
          if (oldInp && wordSurface) oldInp.value = wordSurface;
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

  const isEnRole = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  getEl("sovereignCorpusLangBtn", targetDoc)?.setAttribute?.("data-lang-role", "corpus");
  getEl("sovereignCorpusLangBtn", targetDoc)?.setAttribute?.("aria-label", isEnRole ? "Bible text language (24 Bibles and 7,164 languages)" : "Idioma del texto bíblico (24 Biblias y 7,164 lenguas)");
  getEl("ulsTriggerBtn", targetDoc)?.setAttribute?.("data-lang-role", "app-ui");
  if (getEl("ulsUiCountBadge", targetDoc)) getEl("ulsUiCountBadge", targetDoc).textContent = isEnRole ? "App language · 18" : "Idioma de la app · 18";
  bindCorpusPolyglotAndUiPreferences({
    state,
    dataLayer,
    targetDoc,
    getEl,
    navigate,
    setUiLocale,
    updateDoseLinks,
    hydrateEvangeliosSection,
    syncFelicesWithCorpusLang,
    renderViewportFromState,
    syncUrlFromState,
    hydratePrintDrawerPanels,
  });

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

  const appearanceBtn = getEl("btnAppearanceMenu", targetDoc);
  const appearancePopover = getEl("appearancePopover", targetDoc);
  if (appearanceBtn && typeof appearanceBtn.addEventListener === "function") {
    appearanceBtn.addEventListener("click", () => {
      if (!appearancePopover) return;
      const nextHidden = !appearancePopover.hidden;
      appearancePopover.hidden = nextHidden;
      appearanceBtn.setAttribute("aria-expanded", nextHidden ? "false" : "true");
      state.activeModal = nextHidden ? null : "appearance";
    });
  }

  const applyStorePatchAndProject = (patch = {}, domain = "appearance") => {
    const targetStore = ctx.store || state.store;
    if (targetStore && typeof targetStore.setState === "function") {
      targetStore.setState(patch, domain);
    } else {
      Object.assign(state, patch);
    }
    if (typeof ctx.syncActiveChromeProjection === "function") {
      ctx.syncActiveChromeProjection(targetDoc);
    } else if (targetDoc?.documentElement?.setAttribute) {
      if (state.activeIntent) targetDoc.documentElement.setAttribute("data-intent", state.activeIntent);
      if (state.appearanceTheme) targetDoc.documentElement.setAttribute("data-theme", state.appearanceTheme);
      if (state.fontFamily) targetDoc.documentElement.setAttribute("data-font-family", state.fontFamily);
      targetDoc.documentElement.style?.setProperty?.("--bible-font-scale", String(state.fontScale || 1.0));
    }
  };

  for (const [themeBtnId, themeKey] of [
    ["btnThemeLight", "light"],
    ["btnThemeSepia", "sepia"],
    ["btnThemeDark", "dark"],
  ]) {
    const tThemeBtn = getEl(themeBtnId, targetDoc);
    if (tThemeBtn && typeof tThemeBtn.addEventListener === "function") {
      tThemeBtn.addEventListener("click", () => {
        applyStorePatchAndProject({ appearanceTheme: themeKey }, "appearance");
        for (const [id, key] of [["btnThemeLight", "light"], ["btnThemeSepia", "sepia"], ["btnThemeDark", "dark"]]) {
          getEl(id, targetDoc)?.setAttribute?.("aria-pressed", key === themeKey ? "true" : "false");
        }
      });
    }
  }

  for (const [fontBtnId, fontKey] of [
    ["btnFontSerif", "serif"],
    ["btnFontSans", "sans"],
  ]) {
    const fBtn = getEl(fontBtnId, targetDoc);
    if (fBtn && typeof fBtn.addEventListener === "function") {
      fBtn.addEventListener("click", () => {
        applyStorePatchAndProject({ fontFamily: fontKey }, "appearance");
        getEl("btnFontSerif", targetDoc)?.setAttribute?.("aria-pressed", fontKey === "serif" ? "true" : "false");
        getEl("btnFontSans", targetDoc)?.setAttribute?.("aria-pressed", fontKey === "sans" ? "true" : "false");
      });
    }
  }

  for (const [scaleBtnId, delta] of [["btnScaleDown", -0.1], ["btnScaleUp", 0.1]]) {
    const sBtn = getEl(scaleBtnId, targetDoc);
    if (sBtn && typeof sBtn.addEventListener === "function") {
      sBtn.addEventListener("click", () => {
        const cur = Number(state.fontScale) || 1.0;
        const nextScale = Number(Math.max(0.85, Math.min(1.5, cur + delta)).toFixed(2));
        applyStorePatchAndProject({ fontScale: nextScale }, "appearance");
      });
    }
  }

  const corpusLangBtn = getEl("sovereignCorpusLangBtn", targetDoc);
  const corpusDrawer = getEl("bibleLanguageAndRegisterDrawer", targetDoc);
  if (corpusLangBtn && typeof corpusLangBtn.addEventListener === "function") {
    corpusLangBtn.addEventListener("click", () => {
      if (corpusDrawer) {
        corpusDrawer.open = !corpusDrawer.open;
        corpusLangBtn.setAttribute("aria-expanded", corpusDrawer.open ? "true" : "false");
        syncBodyWorkAndOverlayAttrs(targetDoc);
      }
    });
  }

  const refInput = getEl("mostradorRefInput", targetDoc);
  const refBtn = getEl("btnGoReference", targetDoc);
  const spotlightHost = getEl("spotlightSearchResults", targetDoc);

  let activeSpotlightSeq = 0;

  const executeSpotlightMatch = async (match) => {
    if (!match) return false;
    closeCompassModalDialog();
    state.activeSearchHighlight =
      match.kind === "concordance" ? String(match.matchQuery || "").trim() : "";
    const vpEl = getEl("bibleVerseViewport", targetDoc);
    if (vpEl && typeof vpEl.removeAttribute === "function") {
      vpEl.removeAttribute("data-render-sig");
    }
    if (match.kind === "lexicon" && match.work === "felices" && typeof ctx.switchWork === "function") {
      state.activePlateIndex = Number(match.plates?.[0]) || 1;
      await ctx.switchWork("felices", targetDoc);
      return true;
    }
    if (match.strongId) {
      state.activeStrongId = match.strongId;
    }
    await navigate(
      {
        book: match.book || state.book || "GEN",
        chapter: match.chapter || 1,
        verse: match.verse || 1,
      },
      targetDoc,
    );
    hydrateBookAndChapterSelectors(targetDoc);
    return true;
  };

  const scopeSel = getEl("compassConcordanceScopeSelect", targetDoc);
  const concordanceResultsHost = getEl("compassConcordanceResults", targetDoc);
  if (scopeSel && typeof scopeSel.addEventListener === "function") {
    scopeSel.addEventListener("change", () => {
      if (refInput?.value) renderSpotlightResults(refInput.value);
    });
  }

  const renderSpotlightResults = async (rawQuery) => {
    const qStr = String(rawQuery || "").trim();
    const seq = ++activeSpotlightSeq;
    if (!qStr) {
      if (spotlightHost) {
        spotlightHost.hidden = true;
        spotlightHost.innerHTML = "";
      }
      if (concordanceResultsHost) concordanceResultsHost.innerHTML = "";
      return [];
    }
    if (!state.canonLexicon && typeof dataLayer?.loadJson === "function") {
      try {
        state.canonLexicon = await dataLayer.loadJson("canon_lexicon.json");
      } catch {
        state.canonLexicon = null;
      }
    }
    const lexMatches = searchSpotlightCorpus({
      query: qStr,
      canonLexicon: state.canonLexicon || null,
      loadedVerses: state.lastNavResult?.chapter?.verses || null,
      book: state.book || "GEN",
      chapter: state.chapter || 1,
      lang: state.lang || "es",
      limit: 6,
    });
    const concScope =
      scopeSel?.value === "vault" || state.activeCompassTab === "concordance" && scopeSel?.value === "vault"
        ? "vault"
        : "book";
    let concMatches = [];
    if (
      qStr.length >= 2 &&
      !parseBiblicalCoordinateReference(qStr) &&
      typeof dataLayer?.loadBookText === "function"
    ) {
      concMatches = await searchMultiBookConcordance({
        dataLayer,
        lang: String(state.lang || "es").trim() || "es",
        activeBook: String(state.book || "GEN").toUpperCase(),
        query: qStr,
        scope: concScope,
        limit: 8,
      });
    }
    if (seq !== activeSpotlightSeq) return [];
    const seenKeys = new Set();
    const matches = [];
    for (const m of [...lexMatches, ...concMatches]) {
      const k = `${m.kind}:${m.book || ""}:${m.chapter || 1}:${m.verse || 1}:${m.label || ""}`;
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      matches.push(m);
      if (matches.length >= 10) break;
    }
    const htmlList = matches
      .map(
        (m, idx) =>
          `<button type="button" class="uls-chip ${m.kind === "concordance" ? "concordance-match-btn" : "spotlight-result-chip"}" role="option" data-spotlight-idx="${idx}" data-spotlight-kind="${m.kind}" data-spotlight-book="${m.book || ""}" data-spotlight-chapter="${m.chapter || 1}" data-spotlight-verse="${m.verse || 1}">` +
          `🔎 <strong>${escapeHtml(m.label)}</strong>${m.snippet ? ` — ${escapeHtml(String(m.snippet).replace(/[\r\n]+/g, " "))}` : ""}</button>`,
      )
      .join("");
    if (spotlightHost) {
      spotlightHost.hidden = matches.length === 0;
      spotlightHost.innerHTML = htmlList;
      spotlightHost._lastMatches = matches;
    }
    if (concordanceResultsHost) {
      concordanceResultsHost.innerHTML = htmlList;
      concordanceResultsHost._lastMatches = matches;
    }
    return matches;
  };

  if (spotlightHost && typeof spotlightHost.addEventListener === "function") {
    spotlightHost.addEventListener("click", async (e) => {
      const optEl = e?.target?.closest
        ? e.target.closest("[data-spotlight-idx]")
        : e?.target?.getAttribute?.("data-spotlight-idx") != null
          ? e.target
          : null;
      const idx = Number(optEl?.getAttribute?.("data-spotlight-idx"));
      const list = Array.isArray(spotlightHost._lastMatches) ? spotlightHost._lastMatches : [];
      if (Number.isInteger(idx) && list[idx]) {
        await executeSpotlightMatch(list[idx]);
      }
    });
  }

  if (refInput && typeof refInput.addEventListener === "function") {
    refInput.addEventListener("input", () => {
      renderSpotlightResults(refInput.value);
    });
    refInput.addEventListener("keydown", async (e) => {
      if (e?.key === "Enter") {
        const matches = await renderSpotlightResults(refInput.value);
        if (matches.length > 0) await executeSpotlightMatch(matches[0]);
      }
    });
  }

  if (refBtn && typeof refBtn.addEventListener === "function") {
    refBtn.addEventListener("click", async () => {
      const qVal = refInput ? refInput.value : "";
      const parsed = parseBiblicalCoordinateReference(qVal);
      if (parsed && parsed.bookCode) {
        closeCompassModalDialog();
        await navigate(
          { book: parsed.bookCode, chapter: parsed.chapter || 1, verse: parsed.verse || 1 },
          targetDoc,
        );
        hydrateBookAndChapterSelectors(targetDoc);
        return;
      }
      const matches = await renderSpotlightResults(qVal);
      if (matches.length > 0) {
        await executeSpotlightMatch(matches[0]);
      }
    });
  }

  for (const [sheetKey, cfg] of Object.entries(HAREL_SHEET_MAP)) {
    const btn = getEl(cfg.buttonId, targetDoc);
    if (btn && typeof btn.addEventListener === "function") {
      btn.addEventListener("click", () => transitionSheet(sheetKey, targetDoc, { fromUser: true }));
    }
  }

  const handleDose1Trigger = async () => {
    const pkg = await dispenseDose1();
    if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL) {
      const pdfBlobParts =
        Array.isArray(pkg.blobParts) && pkg.blobParts.length > 0 ? pkg.blobParts : [pkg.bytes];
      const blob = new Blob(pdfBlobParts, { type: "application/pdf" });
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

  const btnDose1 = getEl("btnDose1Sheets", targetDoc);
  if (btnDose1 && typeof btnDose1.addEventListener === "function") {
    btnDose1.addEventListener("click", handleDose1Trigger);
  }
  bindPrintFirstStageRibbon({ targetDoc, getEl, state, handleDose1Trigger, transitionSheet, hydratePrintDrawerPanels });

  const fontSlider = getEl("kindleFontSizeSlider", targetDoc);
  const colSel = getEl("kindleColumnSelector", targetDoc);
  const paperSel = getEl("kindlePaperFormatSelector", targetDoc);
  const orientSel = getEl("kindleOrientationSelector", targetDoc);
  const foliationSel = getEl("bibleFoliationModeSelect", targetDoc);
  const duplexToggle = getEl("kindleDuplexToggle", targetDoc);
  const btnSimPhotocopy = getEl("btnSimulatePhotocopy3Gen", targetDoc);

  const syncKindlePrintConfig = async () => {
    if (fontSlider?.value) state.fontSizePt = Number(fontSlider.value) || DEFAULT_PRINT_CONFIG.fontPt;
    const fontValEl = getEl("kindleFontSizeValue", targetDoc);
    if (fontValEl) fontValEl.textContent = `${Number(state.fontSizePt || DEFAULT_PRINT_CONFIG.fontPt).toFixed(1)} pt`;
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
    const cleanWork = resolvePublicOrPreviewWork(workId, state);
    const prevWork = state.activeWork || "biblia";
    if (cleanWork !== "biblia" && state.activeSheet) {
      await transitionSheet(null, docRef);
    }
    if (store) {
      setActiveWork(store, cleanWork);
    } else {
      state.activeWork = cleanWork;
    }
    syncBodyWorkAndOverlayAttrs(docRef);
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
      await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
    } else if (cleanWork === "felices") {
      setActivePlateIndex(state.activePlateIndex ?? 24, docRef);
    } else if (cleanWork === "biblia") {
      await navigate({ book: state.book, chapter: state.chapter, verse: state.verse }, docRef);
    }

    hydrateBookAndChapterSelectors(docRef);
    updateCompassTriggerDom(docRef);
    syncLifeTrailsActiveState(docRef);
    syncI18nUiFromState(state, docRef);
    syncUrlFromState(docRef, { push: prevWork !== cleanWork });

    if (state.activeSheet === "study") await hydrateStudyDrawer(docRef);
    else if (state.activeSheet === "field") await hydrateImproveDrawer(docRef);
    else if (state.activeSheet === "print") hydratePrintDrawerPanels(docRef);
    else if (state.activeSheet === "share") hydrateShareAndAuditDrawer(docRef);
    return cleanWork;
  };

  state.switchWork = switchWork;
  ctx.switchWork = switchWork;
  globalThis.switchSovereignWork = (w) => switchWork(w, targetDoc);

  for (const [btnId, workId] of [["tabWorkBiblia", "biblia"], ["tabWorkFelices", "felices"], ["tabWorkEvangelios", "evangelios"]]) {
    const tabBtn = getEl(btnId, targetDoc);
    if (tabBtn && typeof tabBtn.addEventListener === "function") tabBtn.addEventListener("click", () => switchWork(workId, targetDoc));
  }

  bindSupportContactDialog({ state, store: ctx.store, doc: targetDoc, getEl });
  if (typeof targetDoc.addEventListener === "function" && !targetDoc._oralTriggerBound) {
    targetDoc._oralTriggerBound = true;
    targetDoc.addEventListener("click", (ev) => {
      const trig = ev?.target?.closest?.("[data-oral-portico-trigger]") || (ev?.target?.getAttribute?.("data-oral-portico-trigger") ? ev.target : null);
      if (trig) getEl("btnToggleAudioNarakeet", targetDoc)?.click?.();
    });
  }

  return switchWork;
}
