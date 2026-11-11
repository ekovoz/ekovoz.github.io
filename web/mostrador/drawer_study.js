// ============================================================================
// web/mostrador/drawer_study.js — Gaveta 1 (Estudio 14-Col, Rosetta NSM-65 & Calibración WFST/Diacrónica)
// Decisiones D1-R41, D2-R41, D3-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import {
  getAll156DiachronicSubstitutionsCatalog,
  hydrateDiachronicRegister,
  renderChapterDiachronicAuditCardHtml,
  renderChapterDiachronicWitnessesHtml,
  renderUnifiedDiachronicContextHtml,
} from "./diachronic_register.js";
import {
  highlightStudyCardByStrongId,
  hydrateCulturalGlossesLexicon,
  hydratePhilologyRosettaIndex,
  renderPhilologyRosettaExplorerHtml,
  renderPhilologyRosettaInspectorHtml,
  renderPhilologyRosettaResultsRowsHtml,
  searchPhilologyRosettaIndex,
} from "./estudio.js";
import { hydratePericopesAndGlosses } from "./evangelios.js";
import {
  listOrthographyProfilesForLang,
  renderWfstAndScriptioContinuaInspectorHtml,
} from "./orthography_wfst.js";
import { parseBiblicalCoordinateReference } from "./reference.js";

export const HAREL_STUDY_SUBTABS = ["words", "rosetta", "calibrate"];

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Hidrata los Senderos de Vida (`life_trails`) y Perícopas de Capítulo (`chapter_pericopes`)
 * desde `web/data/pericopes_and_glosses.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateLifeTrailsFromPericopesArtifact(artifact = null) {
  const lifeTrails = Array.isArray(artifact?.life_trails) ? artifact.life_trails : [];
  const chapterPericopes =
    artifact?.chapter_pericopes && typeof artifact.chapter_pericopes === "object"
      ? artifact.chapter_pericopes
      : {};
  const masoreticAndGospel = Array.isArray(artifact?.masoretic_and_gospel_pericopes)
    ? artifact.masoretic_and_gospel_pericopes
    : [];
  return {
    lifeTrails,
    chapterPericopes,
    masoreticAndGospel,
    evangeliosMacroThreads: artifact?.evangelios_macro_threads || {},
    felices12Dichas: Array.isArray(artifact?.felices_12_dichas) ? artifact.felices_12_dichas : [],
    felices28Plates: Array.isArray(artifact?.felices_28_plates) ? artifact.felices_28_plates : [],
  };
}

/**
 * Hidrata los metadatos de fuente de nombres de libros (`lang`, `name_source`, `books`, `nsm_subtitle`)
 * desde `web/data/book_names/<lang>.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateBookNamesSourceBadge(bookNamesDoc = null) {
  const lang = String(bookNamesDoc?.lang || "es");
  const nameSource = String(bookNamesDoc?.name_source || lang);
  const books = Array.isArray(bookNamesDoc?.books) ? bookNamesDoc.books : [];
  const sampleNsmSubtitle = String(books[0]?.nsm_subtitle || "");
  return {
    lang,
    nameSource,
    booksCount: books.length,
    sampleNsmSubtitle,
  };
}

/**
 * Hidrata el estado de integridad de módulos WASM (`modules`) desde `web/wasm/wasm_manifest.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateWasmManifestStatus(wasmManifest = null) {
  const modules =
    wasmManifest?.modules && typeof wasmManifest.modules === "object"
      ? wasmManifest.modules
      : {
          ekovoz_player_wasm: { path: "wasm/ekovoz_player_wasm.wasm" },
          qr_stream_receiver_wasm: { path: "wasm/qr_stream_receiver_wasm.wasm" },
        };
  return {
    modules,
    hasPlayerWasm: Boolean(modules.ekovoz_player_wasm),
    hasReceiverWasm: Boolean(modules.qr_stream_receiver_wasm),
  };
}

/**
 * Controlador XOR de Sub-Pestañas de Harel (`D1-R41` / `D3-R41` / `D7-R32` / `D10-R32`):
 * Garantiza que dentro de cualquiera de las 4 Gavetas (`study`, `print`, `workshop`, `dosis`)
 * solo 1 sub-panel esté visible a la vez ($\le 4$ chunks visuales simultáneos bajo la Ley de Cowan $4 \pm 1$).
 */
export function applyHarelSubtabSelection(
  rootDoc,
  groupName = "workshop",
  activeSubtab = "patch",
) {
  if (!rootDoc) return { groupName, activeSubtab, toggledPanels: 0 };
  const btnAttr = `data-${groupName}-subtab-btn`;
  const panelAttr = `data-${groupName}-subtab-panel`;

  const buttons =
    typeof rootDoc.querySelectorAll === "function"
      ? Array.from(rootDoc.querySelectorAll(`[${btnAttr}]`))
      : [];
  for (const btn of buttons) {
    const val = btn.getAttribute(btnAttr);
    const isSelected = val === activeSubtab;
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }

  const panels =
    typeof rootDoc.querySelectorAll === "function"
      ? Array.from(rootDoc.querySelectorAll(`[${panelAttr}]`))
      : [];
  let toggledPanels = 0;
  for (const panel of panels) {
    const val = panel.getAttribute(panelAttr);
    const isVisible = val === activeSubtab;
    panel.hidden = !isVisible;
    if (panel.style) {
      panel.style.display = isVisible ? "" : "none";
    }
    toggledPanels += 1;
  }

  return { groupName, activeSubtab, toggledPanels };
}

/**
 * Monta el HTML de una tarjeta con `id` raíz dentro de su contenedor anfitrión existente
 * sin anidar un segundo `<div id="...">` duplicado (Apple HIG R36 — Decisión 4A / INV-ERG-16).
 */
export function mountCardHtmlIntoHost(hostEl, fullCardHtml) {
  if (!hostEl || typeof fullCardHtml !== "string") return false;
  const trimmed = fullCardHtml.trim();
  const hostId = typeof hostEl.getAttribute === "function" ? hostEl.getAttribute("id") : hostEl.id;
  if (hostId && trimmed.startsWith("<") && trimmed.includes(`id="${hostId}"`)) {
    const firstTagEnd = trimmed.indexOf(">");
    const lastTagStart = trimmed.lastIndexOf("</");
    if (firstTagEnd > 0 && lastTagStart > firstTagEnd) {
      const openTag = trimmed.slice(0, firstTagEnd + 1);
      const innerHtml = trimmed.slice(firstTagEnd + 1, lastTagStart);
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(openTag)) !== null) {
        const [, attrName, attrVal] = match;
        if (attrName !== "id" && typeof hostEl.setAttribute === "function") {
          hostEl.setAttribute(attrName, attrVal);
        }
      }
      hostEl.innerHTML = innerHtml;
      return true;
    }
  }
  hostEl.innerHTML = trimmed;
  return true;
}

/**
 * Sincroniza un código Strong activo en la Gaveta 1 (`#bibleEasyDrawerPanel`):
 * resalta la tarjeta de la Matriz 14-Col, actualiza `#rosettaSearchInput` y filtra `#rosettaExplorerResultsRows` (`D2-R38`).
 */
export function syncActiveStrongInStudyDrawer(
  strongId,
  { state, targetDoc, getEl, mod = null, rosettaIndex = null } = {},
) {
  const cleanStrong = String(strongId || "").trim().toUpperCase();
  if (!cleanStrong || cleanStrong === "∅") return "";
  if (state) {
    state.activeStrongId = cleanStrong;
    state.rosettaQuery = cleanStrong;
  }
  if (!targetDoc || typeof getEl !== "function") return cleanStrong;

  const container =
    getEl("leipzig14ColStratumAction", targetDoc) ||
    getEl("bibleEasyDrawerPanel", targetDoc);
  if (container) {
    if (mod && typeof mod.highlightStudyCardByStrongId === "function") {
      mod.highlightStudyCardByStrongId(container, cleanStrong);
    } else {
      highlightStudyCardByStrongId(container, cleanStrong);
    }
  }

  const searchInp = getEl("rosettaSearchInput", targetDoc);
  if (searchInp) {
    searchInp.value = cleanStrong;
  }

  const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
  if (rowsEl) {
    const renderRowsFn =
      mod && typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
        ? mod.renderPhilologyRosettaResultsRowsHtml
        : renderPhilologyRosettaResultsRowsHtml;
    const activeCat = state?.rosettaCategory || "all";
    rowsEl.innerHTML = renderRowsFn({
      query: cleanStrong,
      category: activeCat,
      rosettaIndex: rosettaIndex || state?.rosettaIndex || null,
    });
    const listEl = getEl("rosettaExplorerResultsList", targetDoc);
    if (listEl) {
      const items = searchPhilologyRosettaIndex(
        cleanStrong,
        activeCat,
        12,
        rosettaIndex || state?.rosettaIndex || null,
      );
      listEl.setAttribute("data-results-count", String(items.length));
    }
  }
  return cleanStrong;
}

/**
 * Hidrata la Gaveta 1 (Estudio 14-Col + Rosetta + Calibración WFST/Diacrónica) (`D3-R41` / `D10-R38` / `D2-R38`).
 */
export async function hydrateStudyDrawerPanel(ctx = {}) {
  const {
    state,
    dataLayer,
    targetDoc,
    getEl,
    withPreservedInputFocus,
    getI18n,
    loadStudyModule,
    navigate,
    hydrateBookAndChapterSelectors,
    transitionSheet,
  } = ctx;
  const mod = await loadStudyModule();
  state.studyLoaded = true;
  const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
  const nsmLexicon =
    typeof dataLayer.loadNsmRealiaLexicon === "function"
      ? await dataLayer.loadNsmRealiaLexicon()
      : null;
  const rosettaIndex =
    typeof dataLayer.loadPhilologyRosettaIndex === "function"
      ? await dataLayer.loadPhilologyRosettaIndex()
      : null;
  if (rosettaIndex) {
    hydratePhilologyRosettaIndex(rosettaIndex);
    state.rosettaIndex = rosettaIndex;
    state.rosettaProvenanceCounts = {
      versificationEngOrg: Array.isArray(rosettaIndex.versification_eng_org)
        ? rosettaIndex.versification_eng_org.length
        : 0,
      ketivQereResiduals: Array.isArray(rosettaIndex.ketiv_qere_residuals)
        ? rosettaIndex.ketiv_qere_residuals.length
        : 0,
    };
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
  const i18nInstance = typeof getI18n === "function" ? getI18n() : null;
  const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
  const staticRosettaHostEl = getEl("philologyRosettaStaticHost", targetDoc);
  const studyOpts = {
    book: state.book,
    chapter: state.chapter,
    verse: state.verse,
    lang: state.lang,
    uiLocale: state.uiLocale || "es",
    scope: state.studyScope || "verse",
    activeStrongId: state.activeStrongId || "",
    nsmLexicon,
    rosettaIndex,
    rosettaQuery: state.rosettaQuery || "",
    rosettaCategory: state.rosettaCategory || "all",
    includeInlineStrata: false,
    includeRosettaInspector: !Boolean(staticRosettaHostEl),
    includeExplorer: !Boolean(staticRosettaHostEl),
    i18n: i18nInstance,
    t: tFn,
  };
  const html = mod.renderStudy14ColDrawerHtml(matrixChapter, studyOpts);
  const container =
    getEl("leipzig14ColStratumAction", targetDoc) ||
    getEl("bibleEasyDrawerPanel", targetDoc);
  if (container) {
    withPreservedInputFocus(targetDoc, () => {
      container.innerHTML = html;
    });
    if (state.activeStrongId) {
      syncActiveStrongInStudyDrawer(state.activeStrongId, {
        state,
        targetDoc,
        getEl,
        mod,
        rosettaIndex,
      });
    }
    const staticRowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
    if (staticRosettaHostEl) {
      if (!staticRosettaHostEl.innerHTML || !staticRosettaHostEl.innerHTML.includes("rosettaExplorerResultsRows")) {
        const renderExplorerFn =
          typeof mod.renderPhilologyRosettaExplorerHtml === "function"
            ? mod.renderPhilologyRosettaExplorerHtml
            : renderPhilologyRosettaExplorerHtml;
        staticRosettaHostEl.innerHTML = renderExplorerFn({
          query: state.rosettaQuery || "",
          category: state.rosettaCategory || "all",
          activeRef: `${state.book}.${state.chapter}.${state.verse}`,
          rosettaIndex,
          uiLocale: state.uiLocale || "es",
        });
      }
      let summarySlot = getEl("philologyRosettaSummarySlot", targetDoc);
      if (!summarySlot && targetDoc?.createElement && typeof staticRosettaHostEl.insertBefore === "function") {
        summarySlot = targetDoc.createElement("div");
        summarySlot.id = "philologyRosettaSummarySlot";
        staticRosettaHostEl.insertBefore(summarySlot, staticRosettaHostEl.firstChild || null);
      }
      if (summarySlot) {
        const renderInspectorFn =
          typeof mod.renderPhilologyRosettaInspectorHtml === "function"
            ? mod.renderPhilologyRosettaInspectorHtml
            : renderPhilologyRosettaInspectorHtml;
        summarySlot.innerHTML = renderInspectorFn(matrixChapter?.rows || [], {
          ...studyOpts,
          includeExplorer: false,
        });
      }
      if (staticRowsEl) {
        const renderRowsFn =
          typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
            ? mod.renderPhilologyRosettaResultsRowsHtml
            : renderPhilologyRosettaResultsRowsHtml;
        staticRowsEl.innerHTML = renderRowsFn({
          query: state.rosettaQuery || "",
          category: state.rosettaCategory || "all",
          rosettaIndex,
        });
      }
    }
    const catSel = getEl("rosettaFilterCategorySelect", targetDoc);
    if (catSel && typeof catSel.addEventListener === "function" && !catSel._rosettaCatBound) {
      catSel._rosettaCatBound = true;
      catSel.addEventListener("change", async (e) => {
        state.rosettaCategory = String(e?.target?.value || catSel.value || "all");
        const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
        if (rowsEl) {
          const renderRowsFn =
            typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
              ? mod.renderPhilologyRosettaResultsRowsHtml
              : renderPhilologyRosettaResultsRowsHtml;
          rowsEl.innerHTML = renderRowsFn({
            query: state.rosettaQuery || "",
            category: state.rosettaCategory,
            rosettaIndex,
          });
          const listEl = getEl("rosettaExplorerResultsList", targetDoc);
          if (listEl) {
            const items = searchPhilologyRosettaIndex(
              state.rosettaQuery || "",
              state.rosettaCategory,
              12,
              rosettaIndex,
            );
            listEl.setAttribute("data-results-count", String(items.length));
          }
        } else {
          await hydrateStudyDrawerPanel(ctx);
        }
      });
    }
    const searchInp = getEl("rosettaSearchInput", targetDoc);
    if (searchInp && typeof searchInp.addEventListener === "function" && !searchInp._rosettaSearchBound) {
      searchInp._rosettaSearchBound = true;
      const onRosettaSearch = async (e) => {
        state.rosettaQuery = String(e?.target?.value ?? searchInp.value ?? "");
        const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
        if (rowsEl) {
          const renderRowsFn =
            typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
              ? mod.renderPhilologyRosettaResultsRowsHtml
              : renderPhilologyRosettaResultsRowsHtml;
          rowsEl.innerHTML = renderRowsFn({
            query: state.rosettaQuery,
            category: state.rosettaCategory || "all",
            rosettaIndex,
          });
          const listEl = getEl("rosettaExplorerResultsList", targetDoc);
          if (listEl) {
            const items = searchPhilologyRosettaIndex(
              state.rosettaQuery,
              state.rosettaCategory || "all",
              12,
              rosettaIndex,
            );
            listEl.setAttribute("data-results-count", String(items.length));
          }
        } else {
          await hydrateStudyDrawerPanel(ctx);
        }
      };
      if (!searchInp._rosettaChangeBound) {
        searchInp._rosettaChangeBound = true;
        searchInp.addEventListener("change", onRosettaSearch);
        searchInp.addEventListener("input", onRosettaSearch);
      }
    }
    if (staticRosettaHostEl && typeof staticRosettaHostEl.addEventListener === "function" && !staticRosettaHostEl._rosettaClickBound) {
      staticRosettaHostEl._rosettaClickBound = true;
      staticRosettaHostEl.addEventListener("click", async (e) => {
        const rosettaBtn = e?.target?.closest
          ? e.target.closest("[data-rosetta-ref]")
          : e?.target?.getAttribute?.("data-rosetta-ref")
            ? e.target
            : null;
        const rosettaRef = rosettaBtn?.getAttribute?.("data-rosetta-ref");
        if (rosettaRef) {
          const rosettaStrong = rosettaBtn?.getAttribute?.("data-rosetta-strong");
          if (rosettaStrong) state.activeStrongId = String(rosettaStrong).toUpperCase();
          const parsedRosetta = parseBiblicalCoordinateReference(rosettaRef);
          if (parsedRosetta && parsedRosetta.bookCode) {
            await navigate(
              {
                book: parsedRosetta.bookCode,
                chapter: parsedRosetta.chapter || 1,
                verse: parsedRosetta.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
        }
      });
    }
    if (typeof container.addEventListener === "function" && !container._scopeListenerBound) {
      container._scopeListenerBound = true;
      container.addEventListener("click", async (e) => {
        const rosettaBtn = e?.target?.closest
          ? e.target.closest("[data-rosetta-ref]")
          : e?.target?.getAttribute?.("data-rosetta-ref")
            ? e.target
            : null;
        const rosettaRef = rosettaBtn?.getAttribute?.("data-rosetta-ref");
        if (rosettaRef) {
          const rosettaStrong = rosettaBtn?.getAttribute?.("data-rosetta-strong");
          if (rosettaStrong) state.activeStrongId = String(rosettaStrong).toUpperCase();
          const parsedRosetta = parseBiblicalCoordinateReference(rosettaRef);
          if (parsedRosetta && parsedRosetta.bookCode) {
            await navigate(
              {
                book: parsedRosetta.bookCode,
                chapter: parsedRosetta.chapter || 1,
                verse: parsedRosetta.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
          return;
        }
        const proposeBtn = e?.target?.closest
          ? e.target.closest("[data-propose-strong-id]")
          : e?.target?.getAttribute?.("data-propose-strong-id")
            ? e.target
            : null;
        if (proposeBtn) {
          const propStrong = proposeBtn.getAttribute?.("data-propose-strong-id");
          if (propStrong && propStrong !== "∅") {
            state.activeStrongId = String(propStrong).toUpperCase();
          }
          await transitionSheet("field", targetDoc);
          const strongInp = getEl("improveStrongInput", targetDoc);
          if (strongInp && state.activeStrongId) {
            strongInp.value = state.activeStrongId;
          }
          return;
        }
        const slotBtn = e?.target?.closest
          ? e.target.closest("[data-elicitation-slot]")
          : e?.target?.getAttribute?.("data-elicitation-slot")
            ? e.target
            : null;
        if (slotBtn) {
          const slotStrong = slotBtn.getAttribute?.("data-strong") || slotBtn.getAttribute?.("data-strong-id");
          const slotVerse = Number(slotBtn.getAttribute?.("data-verse")) || state.verse;
          if (slotStrong && slotStrong !== "∅") {
            state.activeStrongId = String(slotStrong).toUpperCase();
          }
          state.verse = slotVerse;
          await transitionSheet("field", targetDoc);
          return;
        }
        const cardEl = e?.target?.closest
          ? e.target.closest(".leipzig-14col-card[data-strong-id]")
          : e?.target?.getAttribute?.("data-strong-id")
            ? e.target
            : null;
        if (cardEl) {
          const cardStrong = cardEl.getAttribute?.("data-strong-id");
          if (cardStrong && cardStrong !== "∅") {
            syncActiveStrongInStudyDrawer(cardStrong, {
              state,
              targetDoc,
              getEl,
              mod,
              rosettaIndex,
            });
          }
          return;
        }
        const btn = e?.target?.closest
          ? e.target.closest("[data-study-scope]")
          : e?.target?.getAttribute?.("data-study-scope")
            ? e.target
            : null;
        const nextScope = btn?.getAttribute?.("data-study-scope");
        if (nextScope === "verse" || nextScope === "chapter" || nextScope === "gmis") {
          state.studyScope = nextScope;
          await hydrateStudyDrawerPanel(ctx);
        }
      });
    }
  }

  for (const [btnId, tabName] of [
    ["btnStudySubtabWords", "words"],
    ["btnStudySubtabRosetta", "rosetta"],
    ["btnStudySubtabCalibrate", "calibrate"],
  ]) {
    const sBtn = getEl(btnId, targetDoc);
    if (sBtn && typeof sBtn.addEventListener === "function" && !sBtn._studySubtabBound) {
      sBtn._studySubtabBound = true;
      sBtn.addEventListener("click", () => {
        state.activeStudySubtab = tabName;
        applyHarelSubtabSelection(targetDoc, "study", tabName);
      });
    }
  }

  if (typeof mod.renderStudyStrataCards === "function") {
    const strata = mod.renderStudyStrataCards(matrixChapter, studyOpts);
    const nsmCard = getEl("nsm65StratumCard", targetDoc);
    if (nsmCard) nsmCard.innerHTML = strata.nsmHtml;
    const realiaCard = getEl("realiaMetrologyStratumCard", targetDoc);
    if (realiaCard) realiaCard.innerHTML = strata.realiaHtml;
    const tskCard = getEl("tskCrossRefsStratumCard", targetDoc);
    if (tskCard) tskCard.innerHTML = strata.tskHtml;
  }

  // D3-R40: Hidrata el Inspector WFST Multi-Ortográfico + Scriptio Continua en #wfstAndScriptioContinuaHost.
  const wfstHost = getEl("wfstAndScriptioContinuaHost", targetDoc);
  if (wfstHost) {
    const profilesForLang = listOrthographyProfilesForLang(state.lang);
    const activeVerseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
    wfstHost.innerHTML = renderWfstAndScriptioContinuaInspectorHtml({
      lang: state.lang,
      profileId: state.orthographyProfile || profilesForLang[0]?.id || "INALI_PRACTICAL",
      sampleText: activeVerseText || undefined,
      uiLocale: state.uiLocale || "es",
    });
    const wfstSel = getEl("wfstInspectorProfileSelect", targetDoc);
    if (wfstSel && typeof wfstSel.addEventListener === "function" && !wfstSel._wfstBound) {
      wfstSel._wfstBound = true;
      wfstSel.addEventListener("change", async (e) => {
        const nextProf = String(e?.target?.value || wfstSel.value || "");
        if (nextProf) {
          state.orthographyProfile = nextProf;
          await hydrateStudyDrawerPanel(ctx);
        }
      });
    }
  }

  // D5-R38 / D9-R39 / D8-R41: Hidrata las Sustituciones Diacrónicas + Testigos del Capítulo y enlaza el buscador/filtro por Tier 1/2/3 de las 156 reglas.
  const diachronicAuditPanel = getEl("diachronicRegisterAuditPanel", targetDoc);
  if (diachronicAuditPanel) {
    const chapterVerses = state.lastNavResult?.chapter?.verses || {};
    const witnessesHtml = renderChapterDiachronicWitnessesHtml(
      chapterVerses,
      state.book,
      state.chapter,
    );
    const unifiedCtxHtml = renderUnifiedDiachronicContextHtml({
      verseText: chapterVerses[String(state.verse)] || "",
      bookCode: state.book,
      chapter: state.chapter,
      verse: state.verse,
    });
    const combinedAuditHtml =
      renderChapterDiachronicAuditCardHtml({
        verses: chapterVerses,
        bookCode: state.book,
        chapter: state.chapter,
        query: state.diachronicQuery || "",
        activeTier: state.diachronicTier || 0,
        uiLocale: state.uiLocale || "es",
      }) +
      witnessesHtml +
      unifiedCtxHtml;
    mountCardHtmlIntoHost(diachronicAuditPanel, combinedAuditHtml);
    diachronicAuditPanel.innerHTML = combinedAuditHtml;
    const diaSearchInp = getEl("diachronicSubstitutionsSearchInput", targetDoc);
    const diaTierSel = getEl("diachronicTierFilterSelect", targetDoc);
    const refreshDiachronicRulesList = () => {
      const listEl = getEl("diachronicSubstitutionsResultsList", targetDoc);
      if (!listEl) return;
      const q = String(diaSearchInp?.value ?? state.diachronicQuery ?? "").trim().toLowerCase();
      const t = Number(diaTierSel?.value ?? state.diachronicTier ?? 0);
      state.diachronicQuery = q;
      state.diachronicTier = t;
      const filtered = getAll156DiachronicSubstitutionsCatalog().filter((r) => {
        if (t >= 1 && t <= 3 && r.tier !== t) return false;
        if (q) return r.archaic.toLowerCase().includes(q) || r.modern.toLowerCase().includes(q);
        return true;
      });
      listEl.setAttribute("data-shown-rules", String(filtered.length));
      listEl.innerHTML = filtered
        .map(
          (r) =>
            `<span class="uls-badge diachronic-rule-chip" data-diachronic-rule-tier="${r.tier}" data-archaic="${escHtml(r.archaic)}" data-modern="${escHtml(r.modern)}">[T${r.tier}] ${escHtml(r.archaic)} → <strong>${escHtml(r.modern)}</strong></span>`,
        )
        .join(" ");
    };
    if (diaSearchInp && typeof diaSearchInp.addEventListener === "function" && !diaSearchInp._diaBound) {
      diaSearchInp._diaBound = true;
      diaSearchInp.addEventListener("input", refreshDiachronicRulesList);
      diaSearchInp.addEventListener("change", refreshDiachronicRulesList);
    }
    if (diaTierSel && typeof diaTierSel.addEventListener === "function" && !diaTierSel._diaBound) {
      diaTierSel._diaBound = true;
      diaTierSel.addEventListener("change", refreshDiachronicRulesList);
    }
  }

  return html;
}

export async function resolvePrimaryStrongForVerse(state, dataLayer) {
  try {
    const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
    const rows = Array.isArray(matrixChapter?.rows) ? matrixChapter.rows : [];
    for (const r of rows) {
      if (Array.isArray(r) && Number(r[1]) === Number(state.verse) && r[6] && r[6] !== "∅") {
        return String(r[6]).toUpperCase();
      }
      if (r && typeof r === "object" && Number(r.verse) === Number(state.verse) && r.c07_strong_id && r.c07_strong_id !== "∅") {
        return String(r.c07_strong_id).toUpperCase();
      }
    }
  } catch {
    // Fallback by testament
  }
  const isNt = /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)$/i.test(state.book);
  return isNt ? "G3056" : "H0430";
}

