// ============================================================================
// web/mostrador.js — Sovereign Browser Dispenser & Data Layer Controller (Ronda 20)
// Pure browser runtime: zero Node filesystem APIs, zero synthetic fallbacks, zero Type3 fake PDFs.
// ============================================================================

import {
  createI18n,
  negotiate,
  applyToDom,
  formatLocalizedNumeralWeb,
  isRtlLocale,
} from "./mostrador/i18n.js";
import {
  createDataLayer,
  createFetchSource,
  STATUS,
} from "./mostrador/data_layer.js";
import {
  extractPdfPages,
  countPdfPages,
} from "./mostrador/pdf_pages.js";
import {
  ordinalOf,
  refOfOrdinal,
  locateVersePage,
  planDose1,
  planDose2,
  planDose3,
  effectiveThreatClassWeb,
  stealthNeutralFilenameWeb,
  doseFilename,
} from "./mostrador/dosis.js";
import {
  ROSETTA_66_BOOKS,
  normalizeBookAliasToken,
  resolveBookCodeByAliasOrName,
  parseBiblicalCoordinateReference,
  createReferenceResolver,
} from "./mostrador/reference.js";
import {
  GEOGRAPHIC_MACRO_REGIONS,
  indexRegionShards,
  listMacroRegions,
  listCountriesInRegion,
  listLanguagesInCountry,
  searchLanguages,
  suggestLayer0Languages,
} from "./mostrador/lang_funnel.js";
import {
  dlog,
  solitonCdf,
  splitmix32,
  LTEncoder,
  LTDecoder,
  encodeLubyTransformDroplets,
  decodeLubyTransformPeeling,
} from "./mostrador/optical_lt.js";

export {
  STATUS,
  ROSETTA_66_BOOKS,
  GEOGRAPHIC_MACRO_REGIONS,
  negotiate,
  applyToDom,
  formatLocalizedNumeralWeb,
  isRtlLocale,
  createI18n,
  createDataLayer,
  createFetchSource,
  extractPdfPages,
  countPdfPages,
  ordinalOf,
  refOfOrdinal,
  locateVersePage,
  planDose1,
  planDose2,
  planDose3,
  effectiveThreatClassWeb,
  stealthNeutralFilenameWeb,
  doseFilename,
  normalizeBookAliasToken,
  resolveBookCodeByAliasOrName,
  parseBiblicalCoordinateReference,
  createReferenceResolver,
  indexRegionShards,
  listMacroRegions,
  listCountriesInRegion,
  listLanguagesInCountry,
  searchLanguages,
  suggestLayer0Languages,
  dlog,
  solitonCdf,
  splitmix32,
  LTEncoder,
  LTDecoder,
  encodeLubyTransformDroplets,
  decodeLubyTransformPeeling,
};

export const HAREL_SHEET_MAP = Object.freeze({
  study: {
    panelId: "bibleEasyDrawerPanel",
    buttonId: "bibleEasyDrawer",
  },
  print: {
    panelId: "biblePrintEditionsSheet",
    buttonId: "btnOpenPrintEditionsSheet",
  },
  field: {
    panelId: "bibleFieldWorkshopSheet",
    buttonId: "btnOpenFieldWorkshopSheet",
  },
  share: {
    panelId: "bibleShareAndAuditSheet",
    buttonId: "btnOpenShareAndAuditSheet",
  },
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Derives the Epistemic Seal key strictly from the loaded data provenance.
 * Never hardcoded in HTML.
 */
export function deriveEpistemicSeal(navResult, catalogEntry = null) {
  if (!navResult || navResult.status !== STATUS.READY || !navResult.chapter) {
    return "seal.unavailable";
  }
  const verses = navResult.chapter.verses;
  if (!verses || typeof verses !== "object" || Object.keys(verses).length === 0) {
    return "seal.unavailable";
  }
  const draftStatus = String(
    navResult.meta?.draft_status || catalogEntry?.draft_status || ""
  ).toLowerCase();
  if (draftStatus === "verified" || draftStatus === "canonical") {
    return "seal.verified";
  }
  if (
    draftStatus === "seed_draft" ||
    draftStatus === "draft" ||
    catalogEntry?.isDraft === true
  ) {
    return "seal.draft_review";
  }
  const lang = String(navResult.lang || "").toLowerCase();
  if (lang === "es" || lang === "en" || lang === "he") {
    return "seal.verified";
  }
  return "seal.draft_review";
}

/**
 * Renders the chapter preview HTML from a loaded chapter object `{ verses: { "1": "..." } }`.
 */
export function renderChapterPreviewHtml(book, chapter, lang, chapterData, i18n = null) {
  if (!chapterData || !chapterData.verses || Object.keys(chapterData.verses).length === 0) {
    const msg = i18n
      ? i18n.t("mostrador.status.unavailable")
      : "This language or passage is not available yet.";
    const retryLabel = i18n ? i18n.t("mostrador.action.retry") : "Retry";
    return `<div class="mostrador-status-unavailable" data-status="unavailable"><p>${escapeHtml(
      msg
    )}</p><button type="button" id="btnRetryNavigation" class="uls-chip" data-i18n="mostrador.action.retry">${escapeHtml(
      retryLabel
    )}</button></div>`;
  }

  const verseNums = Object.keys(chapterData.verses)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);

  const lines = [];
  for (const vNum of verseNums) {
    const rawText = String(chapterData.verses[String(vNum)] || "").trim();
    if (!rawText) continue;
    const locNum = formatLocalizedNumeralWeb(vNum, lang, false);
    lines.push(
      `<p class="bible-verse-line" data-verse="${vNum}" data-osis="${escapeHtml(
        `${book}.${chapter}.${vNum}`
      )}"><sup class="bible-v-sup">${escapeHtml(locNum)}</sup> ${escapeHtml(rawText)}</p>`
    );
  }

  const dir = isRtlLocale(lang) ? "rtl" : "ltr";
  return `<article class="bible-trimodal-chapter" data-book="${escapeHtml(
    book
  )}" data-chapter="${Number(chapter)}" data-lang="${escapeHtml(
    lang
  )}" dir="${dir}">${lines.join("\n")}</article>`;
}

/**
 * Creates the sovereign Mostrador controller with Harel XOR sheet statechart,
 * single async data layer, Epistemic Seal derived from loaded data, and Doses 1/2/3.
 */
export function createMostradorController(options = {}) {
  const doc = options.doc || (typeof document !== "undefined" ? document : null);
  const dataLayer =
    options.dataLayer ||
    createDataLayer({
      source: options.source || createFetchSource({ baseUrl: options.baseUrl || "" }),
    });

  const state = {
    uiLocale: options.uiLocale || "en",
    lang: options.lang || "es",
    countryIso2: options.countryIso2 || "MX",
    book: String(options.book || "JHN").toUpperCase(),
    chapter: Number(options.chapter) || 1,
    verse: Number(options.verse) || 1,
    edition: options.edition || "02_2col_pastoral",
    sheets: Number(options.sheets) || 1,
    duplex: options.duplex !== false,
    activeSheet: null,
    status: STATUS.IDLE,
    seal: "seal.unavailable",
    lastNavResult: null,
    studyLoaded: false,
    improveLoaded: false,
    felicesLoaded: false,
  };

  let i18nInstance = options.i18n || null;
  let studyModulePromise = null;
  let improveModulePromise = null;
  const loadStudyModule =
    options.loadStudyModule || (() => import("./mostrador/estudio.js"));
  const loadImproveModule =
    options.loadImproveModule || (() => import("./mostrador/mejorar.js"));

  function getEl(id, targetDoc = doc) {
    if (!targetDoc || typeof targetDoc.getElementById !== "function") return null;
    return targetDoc.getElementById(id);
  }

  function countVisibleSheets(targetDoc = doc) {
    let count = 0;
    for (const cfg of Object.values(HAREL_SHEET_MAP)) {
      const panel = getEl(cfg.panelId, targetDoc);
      if (panel && panel.hidden === false) {
        count += 1;
      }
    }
    return count;
  }

  function updateSealDom(sealKey, targetDoc = doc) {
    state.seal = sealKey;
    const sealEl = getEl("epistemicStatusSeal", targetDoc);
    if (sealEl) {
      sealEl.setAttribute("data-seal", sealKey);
      sealEl.setAttribute("data-i18n", sealKey);
      const label = i18nInstance ? i18nInstance.t(sealKey) : sealKey;
      sealEl.textContent = label;
    }
  }

  function hydrateBookAndChapterSelectors(targetDoc = doc) {
    const bookSelect = getEl("bibleSelectBook", targetDoc);
    const chapSelect = getEl("bibleSelectChapter", targetDoc);
    if (bookSelect) {
      const opts = ROSETTA_66_BOOKS.map((b) => {
        const selected = b.code === state.book ? " selected" : "";
        return `<option value="${b.code}"${selected}>${String(b.ord).padStart(2, "0")}. ${escapeHtml(
          b.en
        )} (${b.code})</option>`;
      });
      bookSelect.innerHTML = opts.join("");
      bookSelect.value = state.book;
    }
    if (chapSelect) {
      const bookMeta =
        ROSETTA_66_BOOKS.find((b) => b.code === state.book) || ROSETTA_66_BOOKS[0];
      const maxCh = bookMeta ? bookMeta.chapters : 1;
      if (state.chapter > maxCh) state.chapter = 1;
      const chOpts = [];
      for (let c = 1; c <= maxCh; c++) {
        const selected = c === state.chapter ? " selected" : "";
        chOpts.push(`<option value="${c}"${selected}>${c}</option>`);
      }
      chapSelect.innerHTML = chOpts.join("");
      chapSelect.value = String(state.chapter);
    }
  }

  async function navigate(partial = {}, targetDoc = doc) {
    if (partial.lang) state.lang = String(partial.lang);
    if (partial.book) state.book = String(partial.book).toUpperCase();
    if (partial.chapter !== undefined) state.chapter = Math.max(1, Number(partial.chapter) || 1);
    if (partial.verse !== undefined) state.verse = Math.max(1, Number(partial.verse) || 1);
    if (partial.edition) state.edition = String(partial.edition);
    if (partial.sheets !== undefined) state.sheets = Math.max(1, Math.min(3, Number(partial.sheets) || 1));

    state.status = STATUS.LOADING;
    const viewport = getEl("bibleVerseViewport", targetDoc);
    if (viewport) {
      viewport.setAttribute("data-status", STATUS.LOADING);
      viewport.setAttribute("data-current-ref", `${state.book}.${state.chapter}`);
      viewport.setAttribute("data-lang", state.lang);
      const dir = isRtlLocale(state.lang) ? "rtl" : "ltr";
      viewport.setAttribute("dir", dir);
      const sec = getEl("bibleSovereignSection", targetDoc);
      if (sec) sec.setAttribute("dir", dir);
    }

    const res = await dataLayer.navigate({
      lang: state.lang,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
    });

    if (res.stale) {
      return res;
    }

    state.status = res.status;
    state.lastNavResult = res;

    let catalogEntry = null;
    try {
      const cat = await dataLayer.loadCatalog();
      if (cat && Array.isArray(cat.languages)) {
        catalogEntry = cat.languages.find((l) => l.code === state.lang) || null;
      }
    } catch {
      catalogEntry = null;
    }

    const sealKey = deriveEpistemicSeal(res, catalogEntry);
    updateSealDom(sealKey, targetDoc);

    if (viewport) {
      viewport.setAttribute("data-status", res.status);
      viewport.innerHTML = renderChapterPreviewHtml(
        state.book,
        state.chapter,
        state.lang,
        res.status === STATUS.READY ? res.chapter : null,
        i18nInstance
      );
    }

    const compassBtn = getEl("btnOpenCompass", targetDoc);
    if (compassBtn) {
      const bookMeta = ROSETTA_66_BOOKS.find((b) => b.code === state.book);
      const bookTitle = bookMeta ? bookMeta.en : state.book;
      compassBtn.textContent = `🧭 ${state.book} · ${bookTitle} ${state.chapter}:${state.verse}`;
    }

    await updateDoseLinks(targetDoc);

    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    }

    return res;
  }

  async function updateDoseLinks(targetDoc = doc) {
    try {
      const catalog = await dataLayer.loadCatalog();
      const pageIndex = await dataLayer.loadPageIndex(state.lang, state.edition);
      const manifest = await dataLayer.loadManifest();
      if (catalog && pageIndex) {
        const ordinal = ordinalOf(
          state.book,
          state.chapter,
          state.verse,
          catalog.verse_counts
        );
        const loc = locateVersePage(pageIndex, ordinal);
        if (loc) {
          const d2 = planDose2(loc.blockId, state.lang, state.edition);
          const linkDose2 = getEl("linkDose2BlockPdf", targetDoc);
          if (linkDose2) {
            linkDose2.setAttribute("href", `/${d2.url}`);
            linkDose2.setAttribute(
              "download",
              doseFilename({
                dose: 2,
                lang: state.lang,
                blockId: loc.blockId,
                countryIso2: state.countryIso2,
              })
            );
          }
        }
      }
      if (manifest) {
        const d3 = planDose3(manifest, state.lang);
        const linkDose3 = getEl("linkDose3FullBiblePdf", targetDoc);
        if (linkDose3 && d3) {
          linkDose3.setAttribute("href", `/${d3.href}`);
          linkDose3.setAttribute(
            "download",
            doseFilename({
              dose: 3,
              lang: state.lang,
              countryIso2: state.countryIso2,
            })
          );
        }
      }
    } catch {
      // Non-fatal if page index or manifest is unavailable for an uncompiled language
    }
  }

  async function dispenseDose1(opts = {}) {
    const sheets = Math.max(1, Math.min(3, Number(opts.sheets ?? state.sheets) || 1));
    const duplex = opts.duplex !== undefined ? Boolean(opts.duplex) : state.duplex;
    const edition = opts.edition || state.edition;

    const catalog = await dataLayer.loadCatalog();
    if (!catalog || !catalog.verse_counts) {
      throw new Error("Catalog verse_counts unavailable");
    }
    const pageIndex = await dataLayer.loadPageIndex(state.lang, edition);
    if (!pageIndex) {
      throw new Error(`Page index unavailable for ${state.lang}/${edition}`);
    }

    const ordinal = ordinalOf(
      state.book,
      state.chapter,
      state.verse,
      catalog.verse_counts
    );
    const loc = locateVersePage(pageIndex, ordinal);
    if (!loc) {
      throw new Error(`Could not locate ordinal ${ordinal} in page index`);
    }

    const plan = planDose1(loc.pageInBlock, sheets, duplex, loc.pageCountInBlock);
    const blockBytes = await dataLayer.loadBlockPdf(state.lang, edition, loc.blockId);
    if (!blockBytes) {
      throw new Error(`Block PDF unavailable: ${state.lang}/${edition}/${loc.blockId}`);
    }

    const extractedBytes = extractPdfPages(blockBytes, plan.pages);
    const threatClass = effectiveThreatClassWeb(state.countryIso2, state.lang);
    const filename = doseFilename({
      dose: 1,
      lang: state.lang,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      blockId: loc.blockId,
      countryIso2: state.countryIso2,
      ordinal: loc.blockIndex,
    });

    return {
      bytes: extractedBytes,
      filename,
      threatClass,
      blockId: loc.blockId,
      pages: plan.pages,
      sheetCount: plan.sheetCount,
      pageCount: countPdfPages(extractedBytes),
    };
  }

  async function hydrateStudyDrawer(targetDoc = doc) {
    if (!studyModulePromise) {
      studyModulePromise = Promise.resolve(loadStudyModule());
    }
    const mod = await studyModulePromise;
    state.studyLoaded = true;
    const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
    const html = mod.renderStudy14ColDrawerHtml({
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      lang: state.lang,
      matrixChapter,
      t: i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined,
    });
    const container =
      getEl("leipzig14ColStratumAction", targetDoc) ||
      getEl("bibleEasyDrawerPanel", targetDoc);
    if (container) {
      container.innerHTML = html;
    }
    return html;
  }

  async function hydrateImproveDrawer(targetDoc = doc) {
    if (!improveModulePromise) {
      improveModulePromise = Promise.resolve(loadImproveModule());
    }
    const mod = await improveModulePromise;
    state.improveLoaded = true;
    const currentVerseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
    const html = mod.renderImproveDrawerHtml({
      kind: "verse",
      lang: state.lang,
      uiLocale: state.uiLocale,
      osis: `${state.book}.${state.chapter}.${state.verse}`,
      strongId: "G3056",
      currentSurface: currentVerseText,
      t: i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined,
    });
    const container =
      getEl("socraticElicitorContainer", targetDoc) ||
      getEl("bibleFieldWorkshopSheet", targetDoc);
    if (container) {
      container.innerHTML = html;
    }
    return html;
  }

  async function transitionSheet(rawSheetName, targetDoc = doc) {
    const normalized = rawSheetName === "improve" ? "field" : rawSheetName;
    if (!normalized || !HAREL_SHEET_MAP[normalized]) {
      state.activeSheet = null;
      for (const cfg of Object.values(HAREL_SHEET_MAP)) {
        const panel = getEl(cfg.panelId, targetDoc);
        const btn = getEl(cfg.buttonId, targetDoc);
        if (panel) panel.hidden = true;
        if (btn) {
          btn.setAttribute("data-open", "false");
          btn.setAttribute("aria-expanded", "false");
        }
      }
      return null;
    }

    const willOpen = state.activeSheet !== normalized;
    state.activeSheet = willOpen ? normalized : null;

    for (const [key, cfg] of Object.entries(HAREL_SHEET_MAP)) {
      const isOpen = willOpen && key === normalized;
      const panel = getEl(cfg.panelId, targetDoc);
      const btn = getEl(cfg.buttonId, targetDoc);
      if (panel) {
        panel.hidden = !isOpen;
      }
      if (btn) {
        btn.setAttribute("data-open", isOpen ? "true" : "false");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
    }

    if (willOpen && normalized === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (willOpen && normalized === "field") {
      await hydrateImproveDrawer(targetDoc);
    }

    return state.activeSheet;
  }

  async function setUiLocale(requestedLocale, targetDoc = doc) {
    let available = ["en", "es"];
    try {
      const idx = await dataLayer.loadI18nIndex();
      if (idx && Array.isArray(idx.locales)) {
        available = idx.locales.map((l) => l.code || l);
      }
    } catch {
      // keep default available list
    }
    const resolved = negotiate([requestedLocale], available, "en");
    const enCatalog = (await dataLayer.loadUiCatalog("en")) || {};
    const activeCatalog =
      resolved === "en"
        ? enCatalog
        : (await dataLayer.loadUiCatalog(resolved)) || enCatalog;
    i18nInstance = createI18n({
      locale: resolved,
      catalogs: { en: enCatalog, [resolved]: activeCatalog },
    });
    state.uiLocale = resolved;
    if (targetDoc) {
      applyToDom(targetDoc, i18nInstance);
      updateSealDom(state.seal, targetDoc);
    }
    return resolved;
  }

  function bindDomEvents(targetDoc = doc) {
    if (!targetDoc) return;
    hydrateBookAndChapterSelectors(targetDoc);

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

    const langSelect = getEl("bibleSelectLang", targetDoc);
    if (langSelect && typeof langSelect.addEventListener === "function") {
      langSelect.addEventListener("change", async (e) => {
        const nextLang = e?.target?.value || langSelect.value || "es";
        await navigate({ lang: nextLang }, targetDoc);
      });
    }

    const refInput = getEl("mostradorRefInput", targetDoc);
    const refBtn = getEl("btnGoReference", targetDoc);
    if (refBtn && typeof refBtn.addEventListener === "function") {
      refBtn.addEventListener("click", async () => {
        const raw = refInput ? refInput.value : "";
        const parsed = parseBiblicalCoordinateReference(raw);
        if (parsed && parsed.bookCode) {
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
      });
    }

    for (const [sheetKey, cfg] of Object.entries(HAREL_SHEET_MAP)) {
      const btn = getEl(cfg.buttonId, targetDoc);
      if (btn && typeof btn.addEventListener === "function") {
        btn.addEventListener("click", () => {
          transitionSheet(sheetKey, targetDoc);
        });
      }
    }

    const btnDose1 = getEl("btnDose1Sheets", targetDoc) || getEl("btnPrintAroundVerse", targetDoc);
    if (btnDose1 && typeof btnDose1.addEventListener === "function") {
      btnDose1.addEventListener("click", async () => {
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
      });
    }
  }

  return {
    state,
    dataLayer,
    get i18n() {
      return i18nInstance;
    },
    set i18n(val) {
      i18nInstance = val;
    },
    navigate,
    dispenseDose1,
    transitionSheet,
    countVisibleSheets,
    setUiLocale,
    bindDomEvents,
    hydrateStudyDrawer,
    hydrateImproveDrawer,
    hydrateBookAndChapterSelectors,
  };
}

/**
 * Browser bootstrap when running in a real window environment.
 */
export async function bootBrowserMostrador(win = typeof window !== "undefined" ? window : null) {
  if (!win || !win.document) return null;
  const doc = win.document;
  const params = new URLSearchParams(win.location?.search || "");
  const initialUi = params.get("ui") || doc.documentElement.getAttribute("lang") || "en";
  const initialLang = params.get("lang") || "es";
  const rawRef = params.get("ref") || "JHN.1.1";
  const parsedRef = parseBiblicalCoordinateReference(rawRef) || {
    bookCode: "JHN",
    chapter: 1,
    verse: 1,
  };

  const controller = createMostradorController({
    doc,
    uiLocale: initialUi,
    lang: initialLang,
    book: parsedRef.bookCode,
    chapter: parsedRef.chapter || 1,
    verse: parsedRef.verse || 1,
  });

  win.EkovozMostrador = controller;
  win.EkovozStore = {
    get activeSheet() {
      return controller.state.activeSheet;
    },
    transitionSheet: (s) => controller.transitionSheet(s, doc),
    countVisibleSheets: () => controller.countVisibleSheets(doc),
  };

  // Lazy-load i18n_ui.js only when user switches to secondary work "Los Felices" (S15b)
  win.switchSovereignWork = async function switchSovereignWork(workId) {
    const bibSec = doc.getElementById("bibleSovereignSection");
    const felSec = doc.getElementById("felicesSovereignSection");
    const tabBib = doc.getElementById("tabWorkBiblia");
    const tabFel = doc.getElementById("tabWorkFelices");
    const isFelices = workId === "felices";
    if (bibSec) {
      bibSec.hidden = isFelices;
      bibSec.style.display = isFelices ? "none" : "";
      bibSec.setAttribute("data-active-work", isFelices ? "false" : "true");
    }
    if (felSec) {
      felSec.hidden = !isFelices;
      felSec.style.display = isFelices ? "" : "none";
      felSec.setAttribute("data-active-work", isFelices ? "true" : "false");
    }
    if (tabBib) tabBib.setAttribute("aria-selected", isFelices ? "false" : "true");
    if (tabFel) tabFel.setAttribute("aria-selected", isFelices ? "true" : "false");

    if (isFelices && !controller.state.felicesLoaded) {
      controller.state.felicesLoaded = true;
      try {
        await import("./i18n_ui.js");
      } catch {
        // Ignore if already loaded
      }
    }
  };

  win.selectSovereignBibleLang = async function selectSovereignBibleLang(langCode) {
    await controller.navigate({ lang: langCode }, doc);
  };

  win.selectLanguage = async function selectLanguage(localeCode) {
    await controller.setUiLocale(localeCode, doc);
    await controller.navigate({ lang: localeCode }, doc);
  };

  controller.bindDomEvents(doc);
  await controller.setUiLocale(initialUi, doc);
  await controller.navigate(
    {
      lang: initialLang,
      book: parsedRef.bookCode,
      chapter: parsedRef.chapter || 1,
      verse: parsedRef.verse || 1,
    },
    doc
  );

  const requestedSheet = params.get("sheet");
  if (requestedSheet) {
    await controller.transitionSheet(requestedSheet, doc);
  }

  return controller;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  bootBrowserMostrador(window).catch(() => {});
}

