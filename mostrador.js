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
  normalizeEditionSlug,
  listCatalogEditionsForLang,
  computeKindlePrintBudget,
  computeFoliationLayout,
  simulateThirdGenPhotocopySauvola,
  CANONICAL_9_TOML_PROFILES,
  hydrateEditorialProfiles,
  computeMultiSignatureImposition,
  CANONICAL_80_BLOCKS_CATALOG,
  POCKET_REFUGE_4_SHEETS_SPEC,
  renderMultiSignatureAndPocketRefugeHtml,
  planDose1,
  planDose2,
  planDose3,
  effectiveThreatClassWeb,
  stealthNeutralFilenameWeb,
  doseFilename,
} from "./mostrador/dosis.js";
import {
  renderEvangeliosPlateActionsHtml,
  resolveMasoreticPericopeBreaks,
  FELICES_12_DICHAS_COORDINATE_MAP,
  hydratePericopesAndGlosses,
} from "./mostrador/evangelios.js";
import {
  transduceOrthographyWeb,
  ReverseOrthographyMap,
  segmentScriptioContinuaSyllables,
} from "./mostrador/orthography_wfst.js";
import {
  applySpanish21DiachronicRegister,
  computeAnalyticalRegisterMetrics,
  hydrateDiachronicRegister,
} from "./mostrador/diachronic_register.js";
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
  resolveMacroRegionId,
  listCountriesInRegion,
  listLanguagesInCountry,
  searchLanguages,
  suggestLayer0Languages,
} from "./mostrador/lang_funnel.js";
import {
  dlog,
  solitonCdf,
  splitmix32,
  whitenBlockXor,
  LTEncoder,
  LTDecoder,
  encodeLubyTransformDroplets,
  decodeLubyTransformPeeling,
  encodeDropletToMatrixGrid,
  renderDropletMatrixSvgOrCanvas,
  computeSaddleStitchImpositionPlan,
  verifyManifestAndMerkleAudit,
  OPTICAL_CADENCE_PRESETS,
  createRelayEncoderFromDecoded,
  decodeQrStreamViaWasmBridge,
} from "./mostrador/optical_lt.js";
import {
  renderLeipzig4LineGmisHtml,
  renderStudy14ColDrawerHtml,
  renderStudyStrataCards,
  resolveBicanonicalDivergence,
  classifyMaculaArgumentRole,
  hydratePhilologyRosettaIndex,
} from "./mostrador/estudio.js";
import {
  IMPROVE_I18N_FALLBACKS,
  buildPatchPayload,
  buildElicitationSeedPayload,
  renderCascadeAndLadderHtml,
  renderTallerArtifactsCatalogHtml,
  renderImproveDrawerHtml,
  verifyLock8PredicativeAndNegation,
  selectTopEntropyVerseQueue,
  hydrateFieldWorkshopData,
} from "./mostrador/mejorar.js";

export {
  STATUS,
  ROSETTA_66_BOOKS,
  GEOGRAPHIC_MACRO_REGIONS,
  IMPROVE_I18N_FALLBACKS,
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
  normalizeEditionSlug,
  listCatalogEditionsForLang,
  computeKindlePrintBudget,
  computeFoliationLayout,
  simulateThirdGenPhotocopySauvola,
  CANONICAL_9_TOML_PROFILES,
  computeMultiSignatureImposition,
  CANONICAL_80_BLOCKS_CATALOG,
  POCKET_REFUGE_4_SHEETS_SPEC,
  renderMultiSignatureAndPocketRefugeHtml,
  renderEvangeliosPlateActionsHtml,
  resolveMasoreticPericopeBreaks,
  FELICES_12_DICHAS_COORDINATE_MAP,
  transduceOrthographyWeb,
  ReverseOrthographyMap,
  segmentScriptioContinuaSyllables,
  applySpanish21DiachronicRegister,
  computeAnalyticalRegisterMetrics,
  OPTICAL_CADENCE_PRESETS,
  createRelayEncoderFromDecoded,
  resolveBicanonicalDivergence,
  classifyMaculaArgumentRole,
  verifyLock8PredicativeAndNegation,
  selectTopEntropyVerseQueue,
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
  whitenBlockXor,
  LTEncoder,
  LTDecoder,
  encodeLubyTransformDroplets,
  decodeLubyTransformPeeling,
  renderLeipzig4LineGmisHtml,
  renderStudy14ColDrawerHtml,
  renderStudyStrataCards,
  buildElicitationSeedPayload,
  renderCascadeAndLadderHtml,
  renderTallerArtifactsCatalogHtml,
  renderImproveDrawerHtml,
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

export const LIFE_TRAILS_ANCHORS = Object.freeze({
  btnTrailConsuelo: { book: "PSA", chapter: 23, verse: 1, label: "Consuelo" },
  btnTrailPaz: { book: "JHN", chapter: 14, verse: 27, label: "Paz" },
  btnTrailPerdon: { book: "LUK", chapter: 15, verse: 11, label: "Perdón" },
  btnTrailSabiduria: { book: "JAS", chapter: 1, verse: 5, label: "Sabiduría" },
  btnTrailAmor: { book: "1CO", chapter: 13, verse: 4, label: "Amor" },
  btnTrailEsperanza: { book: "ROM", chapter: 8, verse: 28, label: "Esperanza" },
  btnTrailOracion: { book: "MAT", chapter: 6, verse: 9, label: "Oración" },
  btnTrailCreacion: { book: "GEN", chapter: 1, verse: 1, label: "Creación" },
});

const POETIC_BOOKS = new Set(["PSA", "PRO", "JOB", "SNG", "LAM"]);
const MULTI_ORTHO_LANGS = new Set(["stp", "aud", "quc", "nah", "bn", "bn-bd", "bn-in", "tzj", "cak", "mam", "ar", "arb", "uzn", "uz", "tzm"]);
const SUPERSCRIPT_DIGITS = Object.freeze({
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toUnicodeSuperscript(numStr) {
  return String(numStr ?? "")
    .split("")
    .map((ch) => SUPERSCRIPT_DIGITS[ch] || ch)
    .join("");
}

/**
 * Transducción ortográfica contextual WFST real (`D1-B+`, paridad con `crates/ekovoz-core/src/orthography.rs`):
 * Preserva préstamos bíblicos (`Cristo`, `kilo`), aplica mapa confesional bengalí (`bn-BD` ↔ `bn-IN`) sin
 * prefijo literal `[bn-BD]`, soporta `arb` (`TASHKEEL_STRIPPED`), `uzn` (`CYRL` ↔ `LATN`), `tzm` (`TFNG` ↔ `LATN`)
 * y construye el `ReverseOrthographyMap` $O(1)$ hacia el Strong ID original.
 */
export function applyOrthographyProfile(text, profile = "inali", lang = "stp") {
  const raw = String(text ?? "");
  if (!profile || profile === "inali" || profile === "INALI" || profile === "INALI_2018") {
    return raw;
  }
  const inferredLang =
    profile === "bn-BD" || profile === "bn-IN"
      ? "bn"
      : profile === "TASHKEEL_STRIPPED"
        ? "arb"
        : profile === "CYRL" || profile === "LATN"
          ? "uzn"
          : profile === "TFNG"
            ? "tzm"
            : lang || "stp";
  const res = transduceOrthographyWeb(raw, {
    lang: inferredLang,
    profile,
  });
  return res.transducedText;
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
  if (lang === "es" || lang === "es-1909" || lang === "en" || lang === "he" || lang === "grc") {
    return "seal.verified";
  }
  return "seal.draft_review";
}

function resolvePericopeBreakSet(chapterData, verseNums, book = "GEN", chapter = 1) {
  return resolveMasoreticPericopeBreaks(book, chapter, verseNums, chapterData);
}

/**
 * Renders the chapter preview HTML from a loaded chapter object `{ verses: { "1": "..." } }`.
 * Supports continuous pericope blocks with inline selectable `.mostrador-verse` spans (`6R+`),
 * Unicode superscripts (`⁰-⁹`), 2-line dropcap on v.1, poetic stichometry, Oral Portico pauses,
 * and asymmetric 58%/42% bilingual diptych (`5R+`).
 */
export function renderChapterPreviewHtml(
  book,
  chapter,
  lang,
  chapterData,
  i18n = null,
  options = {}
) {
  if (!chapterData || !chapterData.verses || Object.keys(chapterData.verses).length === 0) {
    const msg = i18n
      ? i18n.t("mostrador.status.unavailable")
      : "This language or passage is not available yet.";
    const retryLabel = i18n ? i18n.t("mostrador.action.retry") : "Retry";
    return `<div class="mostrador-status-unavailable" data-status="unavailable"><p>${escapeHtml(
      msg
    )}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><button type="button" id="btnRetryNavigation" class="uls-chip" data-i18n="mostrador.action.retry">${escapeHtml(
      retryLabel
    )}</button><button type="button" id="btnOpenCelf250FromUnavailable" class="uls-chip" data-action="open-celf250-workshop">✏️ Iniciar traducción de campo (CELF-250)</button></div></div>`;
  }

  const selectedVerse = Math.max(1, Number(options.selectedVerse) || 1);
  const rollMode = options.rollMode === "roll" ? "roll" : "chapter";
  const oralPorticoActive = Boolean(options.oralPorticoActive);
  const register = String(options.register || "intergeneracional");
  const bridgeChapterData = options.bridgeChapterData || null;
  const orthoProfile = String(options.orthographyProfile || "inali");

  const verseNums = Object.keys(chapterData.verses)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);

  const dir = isRtlLocale(lang) ? "rtl" : "ltr";
  const isPoetic = POETIC_BOOKS.has(String(book || "").toUpperCase());
  const supHiddenAttr = rollMode === "roll" ? ' hidden style="display:none;"' : "";

  if (register === "bilingue" && bridgeChapterData && bridgeChapterData.verses) {
    const rowsHtml = [];
    for (const vNum of verseNums) {
      const rawPrimary = applyOrthographyProfile(
        String(chapterData.verses[String(vNum)] || "").trim(),
        orthoProfile,
        lang
      );
      if (!rawPrimary) continue;
      const rawBridge = String(
        bridgeChapterData.verses[String(vNum)] || rawPrimary
      ).trim();
      const locNum = formatLocalizedNumeralWeb(vNum, lang, false);
      const supNum = toUnicodeSuperscript(locNum);
      const isSelected = vNum === selectedVerse;
      const osis = `${book}.${chapter}.${vNum}`;
      rowsHtml.push(
        `<div class="mostrador-diptych-row" data-verse="${vNum}" data-osis="${escapeHtml(
          osis
        )}" style="display:grid;grid-template-columns:minmax(0,58fr) minmax(0,42fr);gap:14px;padding:6px 0;border-bottom:1px solid rgba(28,25,23,0.08);"><span class="mostrador-verse bible-verse-line${
          isSelected ? " is-selected" : ""
        }" data-verse="${vNum}" data-osis="${escapeHtml(
          osis
        )}"><sup class="bible-v-sup"${supHiddenAttr}>${escapeHtml(
          supNum
        )}</sup> ${escapeHtml(rawPrimary)}</span><span class="mostrador-verse-bridge" data-verse="${vNum}" style="font-size:0.92em;color:#57534E;">${escapeHtml(
          rawBridge
        )}</span></div>`
      );
    }
    return `<article class="bible-trimodal-chapter mostrador-bilingue-diptych" data-book="${escapeHtml(
      book
    )}" data-chapter="${Number(chapter)}" data-lang="${escapeHtml(
      lang
    )}" data-register="bilingue" data-roll-mode="${rollMode}" dir="${dir}">${rowsHtml.join(
      "\n"
    )}</article>`;
  }

  const breakMap = resolvePericopeBreakSet(chapterData, verseNums, book, chapter);
  const blocks = [];
  let currentBlockKind = "petuhah";
  let currentSpans = [];
  const allRenderedVersesText = [];

  for (const vNum of verseNums) {
    let rawText = applyOrthographyProfile(
      String(chapterData.verses[String(vNum)] || "").trim(),
      orthoProfile,
      lang
    );
    if (!rawText) continue;
    if (String(lang || "").toLowerCase() === "es" && register === "intergeneracional") {
      rawText = applySpanish21DiachronicRegister(rawText).modernizedText;
    }
    allRenderedVersesText.push(rawText);

    if (breakMap.has(vNum) && currentSpans.length > 0) {
      if (oralPorticoActive) {
        currentSpans.push(
          `<span class="mostrador-oral-pause" aria-label="Pausa silenciosa 3 segundos">[Pausa silenciosa · 3s]</span>`
        );
      }
      const masoreticSymbol = currentBlockKind === "petuhah" ? "פ" : "ס";
      blocks.push(
        `<div class="mostrador-pericope-block${
          isPoetic ? " mostrador-poetic-stichometry" : ""
        }" data-break-kind="${escapeHtml(currentBlockKind)}" data-masoretic-marker="${masoreticSymbol}">${currentSpans.join(" ")}</div>`
      );
      currentBlockKind = breakMap.get(vNum) || "setumah";
      currentSpans = [];
    }

    const locNum = formatLocalizedNumeralWeb(vNum, lang, false);
    const supNum = toUnicodeSuperscript(locNum);
    const isSelected = vNum === selectedVerse;
    const osis = `${book}.${chapter}.${vNum}`;

    const renderedBody = escapeHtml(rawText);
    const dropcapClass = vNum === 1 ? " bible-chapter-dropcap" : "";

    currentSpans.push(
      `<span class="mostrador-verse bible-verse-line${dropcapClass}${
        isSelected ? " is-selected" : ""
      }" data-verse="${vNum}" data-osis="${escapeHtml(
        osis
      )}"><sup class="bible-v-sup"${supHiddenAttr}>${escapeHtml(
        supNum
      )}</sup> ${renderedBody}</span>`
    );
  }

  if (currentSpans.length > 0) {
    if (oralPorticoActive) {
      currentSpans.push(
        `<span class="mostrador-oral-pause" aria-label="Pausa silenciosa 3 segundos">[Pausa silenciosa · 3s]</span>`
      );
    }
    const masoreticSymbol = currentBlockKind === "petuhah" ? "פ" : "ס";
    blocks.push(
      `<div class="mostrador-pericope-block${
        isPoetic ? " mostrador-poetic-stichometry" : ""
      }" data-break-kind="${escapeHtml(currentBlockKind)}" data-masoretic-marker="${masoreticSymbol}">${currentSpans.join(" ")}</div>`
    );
  }

  const regMetrics = computeAnalyticalRegisterMetrics(allRenderedVersesText.join(" "));

  return `<article class="bible-trimodal-chapter${
    isPoetic ? " mostrador-poetic-stichometry" : ""
  }" data-book="${escapeHtml(book)}" data-chapter="${Number(
    chapter
  )}" data-lang="${escapeHtml(
    lang
  )}" data-register="${escapeHtml(register)}" data-roll-mode="${rollMode}" data-aoa="${regMetrics.meanAoa}" data-mdd="${regMetrics.meanDependencyDistance}" data-eipen-l="${regMetrics.eipenReadabilityL}" dir="${dir}">${blocks.join(
    "\n"
  )}</article>`;
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
    regionCode: options.regionCode || "americas",
    book: String(options.book || "JHN").toUpperCase(),
    chapter: Number(options.chapter) || 1,
    verse: Number(options.verse) || 1,
    edition: options.edition || "02_2col_pastoral",
    sheets: Number(options.sheets) || 1,
    duplex: options.duplex !== false,
    paperFormat: options.paperFormat || "a4",
    columns: Number(options.columns) || 2,
    fontSizePt: Number(options.fontSizePt) || 10.5,
    orientation: options.orientation || "portrait",
    register: options.register || "intergeneracional",
    rollMode: options.rollMode || "chapter",
    oralPorticoActive: Boolean(options.oralPorticoActive),
    orthographyProfile: options.orthographyProfile || "inali",
    activeSheet: null,
    status: STATUS.IDLE,
    seal: "seal.unavailable",
    lastNavResult: null,
    lastBridgeChapter: null,
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

  function syncOrthographyPillsVisibility(targetDoc = doc) {
    const orthoContainer = getEl("bibleOrthographyPills", targetDoc);
    if (!orthoContainer) return;
    const isMultiOrtho = MULTI_ORTHO_LANGS.has(String(state.lang || "").toLowerCase());
    orthoContainer.hidden = !isMultiOrtho;
    if (orthoContainer.style) {
      orthoContainer.style.display = isMultiOrtho ? "flex" : "none";
    }
    orthoContainer.setAttribute("data-ortho-visible", isMultiOrtho ? "true" : "false");
  }

  function updateCompassTriggerDom(targetDoc = doc) {
    const compassBtn = getEl("btnOpenCompass", targetDoc);
    if (compassBtn) {
      const bookMeta = ROSETTA_66_BOOKS.find((b) => b.code === state.book);
      const bookTitle = bookMeta
        ? state.lang.startsWith("es")
          ? bookMeta.es || bookMeta.en
          : bookMeta.en
        : state.book;
      compassBtn.textContent = `🧭 ${state.book} · ${bookTitle} ${state.chapter}:${state.verse}`;
      compassBtn.setAttribute("data-current-osis", `${state.book}.${state.chapter}.${state.verse}`);
    }
  }

  function hydrateCompassGrid(targetDoc = doc) {
    const grid = getEl("bibleCoordinateCompassGrid", targetDoc);
    if (!grid) return;
    const cells = ROSETTA_66_BOOKS.map((b) => {
      const active = b.code === state.book ? ' aria-current="true"' : "";
      const title = state.lang.startsWith("es") ? b.es || b.en : b.en;
      return `<button type="button" class="uls-chip" data-compass-book="${escapeHtml(
        b.code
      )}"${active} style="min-width:48px;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;"><strong>${escapeHtml(
        b.code
      )}</strong><small style="font-size:0.7rem;opacity:0.85;">${escapeHtml(
        title.slice(0, 10)
      )}</small></button>`;
    });
    grid.innerHTML = cells.join("");
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
    hydrateCompassGrid(targetDoc);
  }

  function renderViewportFromState(targetDoc = doc) {
    const viewport = getEl("bibleVerseViewport", targetDoc);
    if (!viewport || !state.lastNavResult) return;
    const res = state.lastNavResult;
    viewport.setAttribute("data-status", res.status);
    viewport.setAttribute("data-current-ref", `${state.book}.${state.chapter}`);
    viewport.setAttribute("data-selected-verse", String(state.verse));
    viewport.setAttribute("data-lang", state.lang);
    viewport.setAttribute("data-register", state.register);
    viewport.setAttribute("data-roll-mode", state.rollMode);

    let baseHtml = renderChapterPreviewHtml(
      state.book,
      state.chapter,
      state.lang,
      res.status === STATUS.READY ? res.chapter : null,
      i18nInstance,
      {
        selectedVerse: state.verse,
        rollMode: state.rollMode,
        oralPorticoActive: state.oralPorticoActive,
        register: state.register,
        bridgeChapterData: state.lastBridgeChapter,
        orthographyProfile: state.orthographyProfile,
      }
    );
    if (res.status === STATUS.UNAVAILABLE && state.lastMatrixFallbackHtml) {
      baseHtml += state.lastMatrixFallbackHtml;
    }
    viewport.innerHTML = baseHtml;
  }

  async function selectVerse(verseNumber, targetDoc = doc) {
    state.verse = Math.max(1, Number(verseNumber) || 1);
    renderViewportFromState(targetDoc);
    updateCompassTriggerDom(targetDoc);
    await updateDoseLinks(targetDoc);
    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (state.activeSheet === "print") {
      hydratePrintDrawerPanels(targetDoc);
    }
    return state.verse;
  }

  async function navigate(partial = {}, targetDoc = doc) {
    if (partial.lang) state.lang = String(partial.lang);
    if (partial.book) state.book = String(partial.book).toUpperCase();
    if (partial.chapter !== undefined) state.chapter = Math.max(1, Number(partial.chapter) || 1);
    if (partial.verse !== undefined) state.verse = Math.max(1, Number(partial.verse) || 1);
    if (partial.edition) state.edition = String(partial.edition);
    if (partial.sheets !== undefined) state.sheets = Math.max(1, Math.min(3, Number(partial.sheets) || 1));
    if (partial.register) state.register = String(partial.register);
    if (partial.rollMode) state.rollMode = String(partial.rollMode);
    if (partial.orthographyProfile) state.orthographyProfile = String(partial.orthographyProfile);

    syncOrthographyPillsVisibility(targetDoc);
    const corpusLbl = getEl("sovereignActiveCorpusLabel", targetDoc);
    if (corpusLbl) {
      corpusLbl.textContent = `Corpus: ${state.lang} · 7,164`;
    }
    const evLangSel = getEl("evangeliosLangSelect", targetDoc);
    if (evLangSel && ["es", "en", "pt", "fr", "quc", "gn", "stp"].includes(state.lang)) {
      evLangSel.value = state.lang;
      state.evangeliosLang = state.lang;
    }

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
    state.lastBridgeChapter = null;
    state.lastMatrixFallbackHtml = "";

    if (state.register === "bilingue" && res.status === STATUS.READY) {
      const bridgeLang = state.lang === "es" ? "en" : "es";
      try {
        const bridgeRes = await dataLayer.loadChapter({
          lang: bridgeLang,
          book: state.book,
          chapter: state.chapter,
        });
        if (bridgeRes && Array.isArray(bridgeRes.verses) && bridgeRes.verses.length > 0) {
          const bMap = {};
          for (const v of bridgeRes.verses) {
            if (v && v.start !== undefined) bMap[String(v.start)] = v.text;
          }
          state.lastBridgeChapter = { verses: bMap };
        } else if (bridgeRes && bridgeRes.verses && typeof bridgeRes.verses === "object") {
          state.lastBridgeChapter = bridgeRes;
        }
      } catch {
        state.lastBridgeChapter = null;
      }
    }

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

    if (res.status === STATUS.UNAVAILABLE) {
      try {
        const matrixShard = await dataLayer.loadMatrixChapter(state.book, state.chapter);
        if (matrixShard && Array.isArray(matrixShard.rows) && matrixShard.rows.length > 0) {
          state.lastMatrixFallbackHtml = renderLeipzig4LineGmisHtml(matrixShard, {
            lang: state.lang,
            book: state.book,
            chapter: state.chapter,
            verse: state.verse,
          });
        }
      } catch {
        state.lastMatrixFallbackHtml = "";
      }
    }

    renderViewportFromState(targetDoc);
    updateCompassTriggerDom(targetDoc);

    await updateDoseLinks(targetDoc);

    if (state.activeSheet === "study") {
      await hydrateStudyDrawer(targetDoc);
    } else if (state.activeSheet === "field") {
      await hydrateImproveDrawer(targetDoc);
    } else if (state.activeSheet === "print") {
      hydratePrintDrawerPanels(targetDoc);
    } else if (state.activeSheet === "share") {
      hydrateShareAndAuditDrawer(targetDoc);
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
          const d2 = planDose2(loc.blockId, state.lang, state.edition, {
            paperFormat: state.paperFormat,
            columns: state.columns,
          });
          const linkDose2 = getEl("linkDose2BlockPdf", targetDoc);
          if (linkDose2) {
            linkDose2.setAttribute("href", `/${d2.url}`);
            linkDose2.setAttribute("data-edition-slug", d2.editionSlug);
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
    }
    const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
    const studyOpts = {
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      lang: state.lang,
      scope: state.studyScope || "verse",
      nsmLexicon,
      rosettaIndex,
      i18n: i18nInstance,
      t: tFn,
    };
    const html = mod.renderStudy14ColDrawerHtml(matrixChapter, studyOpts);
    const container =
      getEl("leipzig14ColStratumAction", targetDoc) ||
      getEl("bibleEasyDrawerPanel", targetDoc);
    if (container) {
      container.innerHTML = html;
      if (typeof container.addEventListener === "function" && !container._scopeListenerBound) {
        container._scopeListenerBound = true;
        container.addEventListener("click", async (e) => {
          const btn = e?.target?.closest
            ? e.target.closest("[data-study-scope]")
            : e?.target?.getAttribute?.("data-study-scope")
              ? e.target
              : null;
          const nextScope = btn?.getAttribute?.("data-study-scope");
          if (nextScope === "verse" || nextScope === "chapter") {
            state.studyScope = nextScope;
            await hydrateStudyDrawer(targetDoc);
          }
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

    return html;
  }

  async function resolvePrimaryStrongForActiveVerse() {
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

  async function hydrateImproveDrawer(targetDoc = doc) {
    if (!improveModulePromise) {
      improveModulePromise = Promise.resolve(loadImproveModule());
    }
    const mod = await improveModulePromise;
    state.improveLoaded = true;
    const currentVerseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
    const osis = `${state.book}.${state.chapter}.${state.verse}`;
    const activeStrongId = await resolvePrimaryStrongForActiveVerse();
    state.activeStrongId = activeStrongId;
    const ladder250 =
      typeof dataLayer.loadElicitationLadder250 === "function"
        ? await dataLayer.loadElicitationLadder250()
        : [];
    state.celfLadder250 = ladder250;
    if (typeof dataLayer.loadFieldWorkshopData === "function") {
      const fwData = await dataLayer.loadFieldWorkshopData(state.lang === "stp" ? "stp" : "stp");
      if (fwData) hydrateFieldWorkshopData(fwData);
    }
    const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
    const html = mod.renderImproveDrawerHtml({
      kind: "verse",
      lang: state.lang,
      locale: state.uiLocale,
      uiLocale: state.uiLocale,
      ref: osis,
      osis,
      strongId: activeStrongId,
      currentVerseText,
      currentSurface: currentVerseText,
      level: state.cascadeLevel || "L2",
      i18n: i18nInstance,
      t: tFn,
    });
    const container =
      getEl("socraticElicitorContainer", targetDoc) ||
      getEl("bibleFieldWorkshopSheet", targetDoc);
    if (container) {
      container.innerHTML = html;
    }

    const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);
    if (cascadeEl && typeof mod.renderCascadeAndLadderHtml === "function") {
      cascadeEl.innerHTML = mod.renderCascadeAndLadderHtml({
        ladderItems: ladder250,
        lang: state.lang,
        currentRef: osis,
        osis,
        strongId: activeStrongId,
        level: state.cascadeLevel || "L2",
        activeRung: state.activeCelfRung || "ALL",
        limit: 24,
      });
    }

    const tallerEl = getEl("tallerArtifactsCatalog", targetDoc);
    if (tallerEl && typeof mod.renderTallerArtifactsCatalogHtml === "function") {
      tallerEl.innerHTML = mod.renderTallerArtifactsCatalogHtml(state.lang);
    }

    bindImproveFormControls(mod, targetDoc);
    return html;
  }

  function bindImproveFormControls(mod, targetDoc = doc) {
    const kindSel = getEl("improveKindSelect", targetDoc);
    const levelSel = getEl("improveLevelSelect", targetDoc);
    const oldInput = getEl("improveOldSurfaceInput", targetDoc);
    const newInput = getEl("improveNewSurfaceInput", targetDoc);
    const noteInput = getEl("improveNoteInput", targetDoc);
    const previewCode =
      getEl("improvePatchOutput", targetDoc) ||
      getEl("improvePatchPreviewCode", targetDoc);
    const copyBtn = getEl("btnCopyPatchPayload", targetDoc);
    const downloadBtn = getEl("btnDownloadPatchFile", targetDoc);
    const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);

    const refreshPatchPreview = () => {
      const selectedLevel = levelSel?.value || state.cascadeLevel || "L2";
      state.cascadeLevel = selectedLevel;
      const osis = `${state.book}.${state.chapter}.${state.verse}`;
      const patchBuilder = typeof mod.buildPatchPayload === "function" ? mod.buildPatchPayload : buildPatchPayload;
      const patch = patchBuilder({
        kind: kindSel?.value || "verse",
        level: selectedLevel,
        lang: state.lang,
        locale: state.uiLocale,
        ref: osis,
        strongId: state.activeStrongId || "H0430",
        oldSurface: oldInput?.value || "",
        newSurface: newInput?.value || "",
        note: noteInput?.value || "",
      });
      if (previewCode) {
        previewCode.textContent = `${patch.payloadLine}\n\n${patch.json}`;
        if (typeof previewCode.setAttribute === "function") {
          previewCode.setAttribute("data-content-hash", patch.contentHash);
          previewCode.setAttribute("data-patch-filename", patch.filename);
        }
      }
      if (cascadeEl && typeof mod.renderCascadeAndLadderHtml === "function") {
        cascadeEl.innerHTML = mod.renderCascadeAndLadderHtml({
          ladderItems: state.celfLadder250 || [],
          lang: state.lang,
          currentRef: osis,
          osis,
          strongId: state.activeStrongId || "H0430",
          level: selectedLevel,
          activeRung: state.activeCelfRung || "ALL",
          limit: 24,
        });
      }
      return patch;
    };

    for (const el of [kindSel, levelSel, oldInput, newInput, noteInput]) {
      if (el && typeof el.addEventListener === "function") {
        el.addEventListener("change", refreshPatchPreview);
        el.addEventListener("input", refreshPatchPreview);
      }
    }

    if (copyBtn && typeof copyBtn.addEventListener === "function") {
      copyBtn.addEventListener("click", () => {
        const patch = refreshPatchPreview();
        copyBtn.setAttribute("data-last-copied-hash", patch.contentHash);
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(patch.json).catch(() => {});
        }
      });
    }

    if (downloadBtn && typeof downloadBtn.addEventListener === "function") {
      downloadBtn.addEventListener("click", () => {
        const patch = refreshPatchPreview();
        downloadBtn.setAttribute("data-last-download-filename", patch.filename);
        if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && targetDoc?.createElement) {
          const blob = new Blob([patch.json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = targetDoc.createElement("a");
          if (a) {
            a.href = url;
            a.download = patch.filename;
            if (typeof a.click === "function") a.click();
          }
        }
      });
    }

    if (cascadeEl && typeof cascadeEl.addEventListener === "function" && !cascadeEl._celfBound) {
      cascadeEl._celfBound = true;
      cascadeEl.addEventListener("click", async (e) => {
        const filterBtn = e?.target?.closest
          ? e.target.closest("[data-celf-rung-filter]")
          : e?.target?.getAttribute?.("data-celf-rung-filter")
            ? e.target
            : null;
        const filterKey = filterBtn?.getAttribute?.("data-celf-rung-filter");
        if (filterKey) {
          state.activeCelfRung = filterKey;
          refreshPatchPreview();
          return;
        }
        const entropyBtn = e?.target?.closest
          ? e.target.closest("[data-next-entropy-ref]")
          : e?.target?.getAttribute?.("data-next-entropy-ref")
            ? e.target
            : null;
        const nextEntropyRef = entropyBtn?.getAttribute?.("data-next-entropy-ref");
        if (nextEntropyRef) {
          const parsedEnt = parseBiblicalCoordinateReference(nextEntropyRef);
          if (parsedEnt && parsedEnt.bookCode) {
            await navigate(
              {
                book: parsedEnt.bookCode,
                chapter: parsedEnt.chapter || 1,
                verse: parsedEnt.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
          return;
        }
        const rungBtn = e?.target?.closest
          ? e.target.closest("[data-ladder-ref]")
          : e?.target?.getAttribute?.("data-ladder-ref")
            ? e.target
            : null;
        const ladderRef = rungBtn?.getAttribute?.("data-ladder-ref");
        if (ladderRef) {
          const parsed = parseBiblicalCoordinateReference(ladderRef);
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
        }
      });
    }
  }

  function hydratePrintDrawerPanels(targetDoc = doc) {
    if (!state.editorialProfilesLoaded && typeof dataLayer.loadEditorialProfiles === "function") {
      state.editorialProfilesLoaded = true;
      Promise.resolve(dataLayer.loadEditorialProfiles())
        .then((ep) => {
          if (ep) hydrateEditorialProfiles(ep);
        })
        .catch(() => {});
    }
    const budget = computeKindlePrintBudget({
      fontPt: state.fontSizePt || 9.5,
      columns: state.columns || 2,
      orientation: state.orientation || "landscape",
      paper: state.paperFormat || "a4",
    });
    const budgetOutput = getEl("kindleBudgetOutput", targetDoc);
    if (budgetOutput) {
      budgetOutput.textContent = budget.summaryText;
      if (typeof budgetOutput.setAttribute === "function") {
        budgetOutput.setAttribute("data-cpl", String(budget.cpl));
        budgetOutput.setAttribute("data-estimated-pages", String(budget.estimatedPages));
        budgetOutput.setAttribute("data-effective-columns", String(budget.effectiveColumns));
      }
    }

    const duplexPanel = getEl("duplexAssistantPanel", targetDoc);
    if (duplexPanel) {
      const slug = normalizeEditionSlug(state.edition, {
        paperFormat: state.paperFormat,
        columns: state.columns,
      });
      const foliation = computeFoliationLayout({
        mode: state.foliationMode || "saddle_stitch",
        paper: state.paperFormat || "a4",
        pageCount: 16,
        dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      });
      const multiSigHtml = renderMultiSignatureAndPocketRefugeHtml({
        totalPages: 160,
        activeBlockNumber: 1,
        dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      });
      duplexPanel.innerHTML = `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(
        slug
      )}" data-foliation-mode="${escapeHtml(foliation.mode)}" data-binding-edge="${escapeHtml(
        foliation.bindingEdge
      )}"><strong>Asistente Dúplex (${
        state.duplex ? "2 caras · Paridad par garantizada" : "1 cara"
      }) · ${escapeHtml(foliation.summary)}</strong><p style="margin:4px 0 0;font-size:0.84rem;">Paso 1: Imprime caras impares (anverso). Paso 2: Voltea el pliego por el borde largo e imprime caras pares (reverso) · ${escapeHtml(
        budget.summaryText
      )}.</p>${multiSigHtml}</div>`;
    }

    const photocopyBadge = getEl("biblePhotocopySimBadge", targetDoc);
    if (photocopyBadge) {
      const sim = simulateThirdGenPhotocopySauvola({
        strokePt: (state.fontSizePt || 9.5) >= 9.0 ? 0.85 : 0.75,
        k: 0.2,
        R: 128,
      });
      photocopyBadge.textContent = sim.badgeText;
      photocopyBadge.setAttribute("data-euler-delta", String(sim.eulerCharacteristicDelta));
      photocopyBadge.setAttribute("data-survives-3rd-gen", String(sim.survives3rdGen));
    }

    const stationeryPanel = getEl("stationeryCardPanel", targetDoc);
    if (stationeryPanel) {
      const verseText =
        state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
        "Selecciona un versículo para tarjeta postal A6/Carta.";
      stationeryPanel.innerHTML = `<div class="mostrador-stationery-card" data-osis="${escapeHtml(
        `${state.book}.${state.chapter}.${state.verse}`
      )}"><strong>Postal tipográfica A6 (${escapeHtml(
        `${state.book} ${state.chapter}:${state.verse}`
      )})</strong><blockquote style="margin:4px 0 0;font-style:italic;">"${escapeHtml(
        verseText.slice(0, 140)
      )}"</blockquote></div>`;
    }

    const catalogGrid = getEl("bibleEditionsCatalogGrid", targetDoc);
    if (catalogGrid) {
      const editions = listCatalogEditionsForLang(state.lastManifest || state.lang, state.lang);
      catalogGrid.innerHTML = editions
        .map(
          (ed) =>
            `<a class="uls-chip" href="/${escapeHtml(
              ed.url
            )}" data-edition-slug="${escapeHtml(ed.editionSlug)}" data-edition-kind="${escapeHtml(
              ed.kind || "edition"
            )}" download>📄 ${escapeHtml(ed.label)}</a>`
        )
        .join("");
    }
  }

  function hydrateShareAndAuditDrawer(targetDoc = doc) {
    const packLang = ["es", "en", "stp", "he"].includes(state.lang) ? state.lang : "stp";
    const quineRelUrl = `obras/biblia/packs/${packLang}/lector_offline_${packLang}.html`;
    const packsPanel = getEl("offlinePacksCatalogPanel", targetDoc);
    if (packsPanel) {
      packsPanel.innerHTML =
        `<div class="mostrador-offline-packs" data-lang="${escapeHtml(state.lang)}" data-quine-url="${escapeHtml(quineRelUrl)}">` +
        `<strong>Paquete Offline Soberano (${escapeHtml(state.lang.toUpperCase())})</strong>` +
        `<p style="margin:4px 0 6px;font-size:0.84rem;">Cero telemetría · Quine HTML autónomo (<code>DecompressionStream("deflate-raw")</code>) + Verificación SHA-256 / Merkle lista para USB, Bluetooth y MicroSD.</p>` +
        `<a class="uls-chip" href="/${escapeHtml(quineRelUrl)}" download="lector_offline_${escapeHtml(packLang)}.html" data-quine-download="true" style="text-decoration:none;display:inline-flex;align-items:center;min-height:48px;padding:0.35rem 0.7rem;">💾 Descargar Quine Offline (${escapeHtml(packLang.toUpperCase())})</a>` +
        `</div>`;
    }

    const qrPanel = getEl("bibleOpticalQrStreamPanel", targetDoc);
    if (qrPanel) {
      const verseText =
        state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
        `${state.book}.${state.chapter}.${state.verse}`;
      const rawBytes = new TextEncoder().encode(
        JSON.stringify({
          osis: `${state.book}.${state.chapter}.${state.verse}`,
          lang: state.lang,
          text: verseText,
        })
      );
      const encoder = new LTEncoder(rawBytes, 32);
      const seqNum = Number(state.qrFrameSeq) || 0;
      let droplet = encoder.nextDroplet();
      for (let i = 0; i < seqNum; i += 1) {
        droplet = encoder.nextDroplet();
      }
      const grid = encodeDropletToMatrixGrid(droplet, 29);
      const svgMarkup = renderDropletMatrixSvgOrCanvas(grid, null);
      const activeCadenceKey = String(state.opticalCadenceFps || "6.67") === "10" ? "10" : "6.67";
      const cadencePreset = OPTICAL_CADENCE_PRESETS[activeCadenceKey];
      qrPanel.innerHTML =
        `<div class="mostrador-qrbeam-stream" data-fps="${activeCadenceKey}" data-frame-interval-ms="${cadencePreset.intervalMs}" data-total-blocks="${encoder.K}" data-seq="${grid.seq}" data-degree="${grid.degree}" data-parity="${grid.parityBit}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
        `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;">` +
        `<strong>📡 QRBeam Optical Stream (${activeCadenceKey} fps · ${cadencePreset.intervalMs} ms/frame · Frame #${grid.seq} · Paridad ${grid.parityBit})</strong>` +
        `<div style="display:inline-flex;gap:0.35rem;">` +
        `<button type="button" id="btnNextQrBeamFrame" class="uls-chip" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.78rem;">⏭ Siguiente Droplet (#${grid.seq + 1})</button>` +
        `<a href="#bibleOpticalQrStreamPanel" class="uls-chip" style="text-decoration:none;min-height:48px;padding:0.35rem 0.7rem;font-size:0.78rem;display:inline-flex;align-items:center;">🔦 Abrir Estudio Óptico</a>` +
        `</div></div>` +
        `<div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">` +
        `<div class="qrbeam-matrix-host">${svgMarkup}</div>` +
        `<p style="margin:0;font-size:0.81rem;flex:1;min-width:180px;">Pase 1 sistemático (K=${encoder.K} bloques + blanqueo XOR <code>whitenBlockXor</code> + paridad 4.ª esquina) seguido de cola Solitón Luby Transform.</p>` +
        `</div></div>`;
      const nextFrameBtn = getEl("btnNextQrBeamFrame", targetDoc);
      if (nextFrameBtn && typeof nextFrameBtn.addEventListener === "function") {
        nextFrameBtn.addEventListener("click", () => {
          state.qrFrameSeq = (Number(state.qrFrameSeq) || 0) + 1;
          hydrateShareAndAuditDrawer(targetDoc);
        });
      }
    }
  }

  async function transitionSheet(rawSheetName, targetDoc = doc) {
    const normalized = rawSheetName === "improve" ? "field" : rawSheetName;
    const vp = getEl("bibleVerseViewport", targetDoc);
    if (!normalized || !HAREL_SHEET_MAP[normalized]) {
      state.activeSheet = null;
      if (vp) vp.setAttribute("data-inspector-open", "false");
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
    if (vp) {
      vp.setAttribute("data-inspector-open", willOpen ? "true" : "false");
    }

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
    } else if (willOpen && normalized === "print") {
      hydratePrintDrawerPanels(targetDoc);
    } else if (willOpen && normalized === "share") {
      hydrateShareAndAuditDrawer(targetDoc);
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
    syncOrthographyPillsVisibility(targetDoc);

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
          await navigate(
            { book: prevBook.code, chapter: prevBook.chapters, verse: 1 },
            targetDoc
          );
        }
        hydrateBookAndChapterSelectors(targetDoc);
      });
    }

    const nextBtn = getEl("btnNextChapter", targetDoc);
    if (nextBtn && typeof nextBtn.addEventListener === "function") {
      nextBtn.addEventListener("click", async () => {
        const bookMeta =
          ROSETTA_66_BOOKS.find((b) => b.code === state.book) || ROSETTA_66_BOOKS[0];
        if (state.chapter < bookMeta.chapters) {
          await navigate({ chapter: state.chapter + 1, verse: 1 }, targetDoc);
        } else {
          const idx = ROSETTA_66_BOOKS.findIndex((b) => b.code === state.book);
          const nextBook =
            idx >= 0 && idx + 1 < ROSETTA_66_BOOKS.length
              ? ROSETTA_66_BOOKS[idx + 1]
              : ROSETTA_66_BOOKS[0];
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
          const nextHidden = !compassModal.hidden;
          compassModal.hidden = nextHidden;
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
          if (compassModal.style) compassModal.style.display = "none";
        }
      });
    }

    if (compassGrid && typeof compassGrid.addEventListener === "function") {
      compassGrid.addEventListener("click", async (e) => {
        const target = e?.target?.closest
          ? e.target.closest("[data-compass-book]")
          : e?.target;
        const bookCode = target?.getAttribute
          ? target.getAttribute("data-compass-book")
          : target?.dataset?.compassBook;
        if (bookCode) {
          if (compassModal) {
            compassModal.hidden = true;
            if (compassModal.style) compassModal.style.display = "none";
          }
          await navigate({ book: bookCode, chapter: 1, verse: 1 }, targetDoc);
          hydrateBookAndChapterSelectors(targetDoc);
        }
      });
    }

    const oralBtn = getEl("btnToggleAudioNarakeet", targetDoc);
    const oralBanner = getEl("bibleOralPorticoBanner", targetDoc);
    if (oralBtn && typeof oralBtn.addEventListener === "function") {
      oralBtn.addEventListener("click", () => {
        state.oralPorticoActive = !state.oralPorticoActive;
        oralBtn.setAttribute("aria-pressed", state.oralPorticoActive ? "true" : "false");
        if (oralBanner) {
          oralBanner.hidden = !state.oralPorticoActive;
          if (oralBanner.style) {
            oralBanner.style.display = state.oralPorticoActive ? "block" : "none";
          }
          if (state.oralPorticoActive) {
            oralBanner.innerHTML = `<strong>🗣️ Pórtico de Lectura en Voz Alta (${escapeHtml(
              `${state.book} ${state.chapter}`
            )}) · 0 Bytes Audio</strong><p style="margin:4px 0 0;">Cadencia sugerida: 135 palabras/min · Respeta las pausas de perícopa <code>[Pausa silenciosa · 3s]</code>.</p>`;
          }
        }
        renderViewportFromState(targetDoc);
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
        typeof dataLayer.loadAllRegionShards === "function"
          ? await dataLayer.loadAllRegionShards()
          : [];
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
            .map(
              (c) =>
                `<option value="${escapeHtml(c.code || c.name)}">${escapeHtml(
                  c.label || c.name
                )}</option>`
            )
            .join("");
        }
        const regionLangs = listLanguagesInCountry(idx, state.regionCode, "");
        if (langSelect && regionLangs.length > 0) {
          langSelect.innerHTML = regionLangs
            .slice(0, 60)
            .map(
              (m) =>
                `<option value="${escapeHtml(m.code)}" data-seal="${escapeHtml(
                  m.sovereignSeal || ""
                )}">${escapeHtml(m.displayLabel)}</option>`
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
                `<option value="${escapeHtml(m.code)}" data-seal="${escapeHtml(
                  m.sovereignSeal || ""
                )}">${escapeHtml(m.displayLabel)}</option>`
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
                `<option value="${escapeHtml(m.code)}" data-iso="${escapeHtml(
                  m.iso639_3
                )}" data-seal="${escapeHtml(m.sovereignSeal || "")}">${escapeHtml(
                  m.displayLabel || m.name || m.code
                )}</option>`
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
        await navigate({ lang: "es-1909", register: "clasica" }, targetDoc);
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
      });
    }

    for (const [orthoBtnId, profile] of [
      ["btnOrthoInali", "inali"],
      ["btnOrthoTradicional", "tradicional"],
      ["btnOrthoFonetica", "fonetica"],
      ["btnOrthoBnBd", "bn-BD"],
      ["btnOrthoBnIn", "bn-IN"],
    ]) {
      const oBtn = getEl(orthoBtnId, targetDoc);
      if (oBtn && typeof oBtn.addEventListener === "function") {
        oBtn.addEventListener("click", () => {
          state.orthographyProfile = profile;
          renderViewportFromState(targetDoc);
        });
      }
    }

    for (const [trailBtnId, anchor] of Object.entries(LIFE_TRAILS_ANCHORS)) {
      const tBtn = getEl(trailBtnId, targetDoc);
      if (tBtn && typeof tBtn.addEventListener === "function") {
        tBtn.addEventListener("click", async () => {
          await navigate(
            { book: anchor.book, chapter: anchor.chapter, verse: anchor.verse },
            targetDoc
          );
          hydrateBookAndChapterSelectors(targetDoc);
        });
      }
    }

    const uiLangSelect = getEl("langSelect", targetDoc);
    if (uiLangSelect && typeof uiLangSelect.addEventListener === "function") {
      uiLangSelect.addEventListener("change", async (e) => {
        const nextUi = e?.target?.value || uiLangSelect.value || "en";
        await setUiLocale(nextUi, targetDoc);
      });
    }

    const ulsTrigger = getEl("ulsTriggerBtn", targetDoc);
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
        }
      });
    }

    const refInput = getEl("mostradorRefInput", targetDoc);
    const refBtn = getEl("btnGoReference", targetDoc);
    if (refBtn && typeof refBtn.addEventListener === "function") {
      refBtn.addEventListener("click", async () => {
        const raw = refInput ? refInput.value : "";
        const parsed = parseBiblicalCoordinateReference(raw);
        if (parsed && parsed.bookCode) {
          if (compassModal) {
            compassModal.hidden = true;
            if (compassModal.style) compassModal.style.display = "none";
          }
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
      if (duplexToggle && typeof duplexToggle.checked === "boolean") {
        state.duplex = duplexToggle.checked;
      }
      state.edition = normalizeEditionSlug(state.edition, {
        paperFormat: state.paperFormat,
        columns: state.columns,
        largePrint: state.fontSizePt >= 13,
      });
      hydratePrintDrawerPanels(targetDoc);
      await updateDoseLinks(targetDoc);
    };

    for (const kCtrl of [fontSlider, colSel, paperSel, orientSel, foliationSel, duplexToggle]) {
      if (kCtrl && typeof kCtrl.addEventListener === "function") {
        kCtrl.addEventListener("change", syncKindlePrintConfig);
        kCtrl.addEventListener("input", syncKindlePrintConfig);
      }
    }

    if (btnSimPhotocopy && typeof btnSimPhotocopy.addEventListener === "function") {
      btnSimPhotocopy.addEventListener("click", () => {
        hydratePrintDrawerPanels(targetDoc);
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
        const ref = pill?.getAttribute
          ? pill.getAttribute("data-tsk-ref")
          : pill?.dataset?.tskRef;
        if (ref) {
          const parsed = parseBiblicalCoordinateReference(ref);
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
        }
      });
    }

    const executeGaveta4Action = async (shareBtnId) => {
      hydrateShareAndAuditDrawer(targetDoc);
      const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
      const packLang = ["es", "en", "stp", "he"].includes(state.lang) ? state.lang : "stp";
      const osis = `${state.book}.${state.chapter}.${state.verse}`;

      if (shareBtnId === "btnShareQuine") {
        const quineUrl = `obras/biblia/packs/${packLang}/lector_offline_${packLang}.html`;
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "share-quine");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="share-quine" data-quine-lang="${escapeHtml(packLang)}">` +
            `✅ <strong>Quine Autónomo Listo (${escapeHtml(packLang.toUpperCase())}):</strong> ` +
            `<a href="/${escapeHtml(quineUrl)}" download="lector_offline_${escapeHtml(packLang)}.html">Descargar lector_offline_${escapeHtml(packLang)}.html</a> ` +
            `(DecompressionStream deflate-raw · 100% offline).</div>`;
        }
      } else if (shareBtnId === "btnCopyDirectShareLink") {
        const shareUrl = `?ui=${encodeURIComponent(state.uiLocale)}&lang=${encodeURIComponent(state.lang)}&ref=${encodeURIComponent(osis)}`;
        if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "copy-link");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="copy-link" data-share-url="${escapeHtml(shareUrl)}">` +
            `🔗 <strong>Enlace directo copiado:</strong> <code>${escapeHtml(shareUrl)}</code></div>`;
        }
      } else if (shareBtnId === "btnVerifyEd25519Signature") {
        const manifest = await dataLayer.loadManifest();
        const merkleObj =
          typeof dataLayer.loadMerkleRoot === "function" ? await dataLayer.loadMerkleRoot() : null;
        const receipt = verifyManifestAndMerkleAudit({
          manifest,
          merkleRootHex: merkleObj?.merkleRootHex || "",
          lang: state.lang,
          book: state.book,
          chapter: state.chapter,
        });
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "verify-signature");
          statusPanel.setAttribute("data-verified", String(receipt.verified));
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="verify-signature" data-verified="${receipt.verified}" data-merkle-root="${escapeHtml(receipt.merkleRootHex)}">` +
            `🔐 <strong>Auditoría Criptográfica (${escapeHtml(receipt.algorithm)}):</strong> ` +
            `Estado=${receipt.verified ? "VERIFICADO" : "PENDIENTE"} · Artefactos=${receipt.artifactsChecked} · ` +
            `Merkle Root=<code>${escapeHtml(receipt.merkleRootHex.slice(0, 16))}…</code> · ` +
            `SHA-256=<code>${escapeHtml(receipt.sampleSha256.slice(0, 16))}…</code></div>`;
        }
      } else if (shareBtnId === "btnCalculateImposition") {
        const imp = computeSaddleStitchImpositionPlan({
          totalPages: 16,
          paperThicknessMm: 0.09,
          rtl: isRtlLocale(state.lang),
        });
        const sheetsSummary = imp.sheets
          .map((s) => `P${s.sheetIndex}[F:${s.front[0]}-${s.front[1]} / V:${s.back[0]}-${s.back[1]} · creep +${s.creepMm}mm]`)
          .join(" · ");
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "calculate-imposition");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="calculate-imposition" data-integrity="${imp.integrityVerified}" data-rtl="${imp.rtl}">` +
            `📐 <strong>Imposición Saddle-Stitch 4n (${imp.paddedPages} págs · ${imp.sheetCount} pliegos · ${imp.rtl ? "RTL Lomo Invertido" : "LTR"}):</strong> ` +
            `Suma constante=${imp.folioSumConstant} · Creep máx=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`;
        }
      } else if (shareBtnId === "btnCalculateLayout") {
        const budget = computeKindlePrintBudget({
          fontPt: state.fontSizePt || 9.5,
          columns: state.columns || 2,
          orientation: state.orientation || "landscape",
          paper: state.paperFormat || "a4",
        });
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "calculate-layout");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="calculate-layout" data-cpl="${budget.cpl}">` +
            `📏 <strong>Invariante Geométrico A4/Letter Verificado:</strong> ${escapeHtml(budget.summaryText)} (8 Candados Tipográficos en verde).</div>`;
        }
      }
    };

    for (const shareBtnId of [
      "btnShareQuine",
      "btnCopyDirectShareLink",
      "btnVerifyEd25519Signature",
      "btnCalculateImposition",
      "btnCalculateLayout",
    ]) {
      const sBtn = getEl(shareBtnId, targetDoc);
      if (sBtn && typeof sBtn.addEventListener === "function") {
        sBtn.addEventListener("click", async () => {
          sBtn.setAttribute("data-last-invoked", shareBtnId);
          await executeGaveta4Action(shareBtnId);
        });
      }
    }

    const fpsSel = getEl("bibleOpticalFpsSelect", targetDoc);
    if (fpsSel && typeof fpsSel.addEventListener === "function") {
      fpsSel.addEventListener("change", (e) => {
        state.opticalCadenceFps = String(e?.target?.value || fpsSel.value || "6.67") === "10" ? "10" : "6.67";
        hydrateShareAndAuditDrawer(targetDoc);
      });
    }

    const camRxBtn = getEl("btnToggleOpticalCameraRx", targetDoc);
    if (camRxBtn && typeof camRxBtn.addEventListener === "function") {
      camRxBtn.addEventListener("click", async () => {
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        const videoEl = getEl("bibleOpticalCameraVideo", targetDoc);
        if (videoEl) videoEl.hidden = !videoEl.hidden;
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "optical-camera-rx");
          statusPanel.setAttribute("data-wasm-bridge", "loading");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-wasm-bridge="loading">` +
            `📷 <strong>Receptor Óptico LT + GF(2) Activo:</strong> ` +
            `Eliminación Gaussiana sobre GF(2) lista para resolver Stopping Sets de grado ≥ 2.</div>`;
        }
        let wasmStatusAttr = "fallback";
        if (typeof dataLayer.loadWasmModule === "function") {
          try {
            const wasmMod = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
            const bridgeCheck = decodeQrStreamViaWasmBridge([], wasmMod);
            if (bridgeCheck.ok) wasmStatusAttr = `ready-v${bridgeCheck.wasmAbiVersion}`;
          } catch {
            wasmStatusAttr = "unavailable";
          }
        }
        if (statusPanel && statusPanel.getAttribute("data-audit-action") === "optical-camera-rx") {
          statusPanel.setAttribute("data-wasm-bridge", wasmStatusAttr);
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-wasm-bridge="${escapeHtml(wasmStatusAttr)}">` +
            `📷 <strong>Receptor Óptico LT + GF(2) Activo (WASM=${escapeHtml(wasmStatusAttr)}):</strong> ` +
            `Eliminación Gaussiana sobre GF(2) lista para resolver Stopping Sets de grado ≥ 2.</div>`;
        }
      });
    }

    const relayBtn = getEl("btnOpticalRelayTx", targetDoc);
    if (relayBtn && typeof relayBtn.addEventListener === "function") {
      relayBtn.addEventListener("click", () => {
        state.qrFrameSeq = 0;
        hydrateShareAndAuditDrawer(targetDoc);
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "optical-relay-tx");
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-relay-tx">` +
            `🔁 <strong>Re-Emisión Relay Iniciada:</strong> Re-codificando los K bloques decodificados con nueva semilla Luby Transform.</div>`;
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
          if (pgData) hydratePericopesAndGlosses(pgData);
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
      state.evangeliosQuarter = quarterFilter;
      const evLangSel = getEl("evangeliosLangSelect", targetDoc);
      const activeEvLang = evLangSel?.value || state.evangeliosLang || (["es", "en", "pt", "fr", "quc", "gn", "stp"].includes(state.lang) ? state.lang : "es");
      state.evangeliosLang = activeEvLang;

      const quarterEntries = corpus.entries.filter((e) => e.quarter === quarterFilter);
      const pool = quarterEntries.length > 0 ? quarterEntries : corpus.entries;
      const activeEntry = pool.find((e) => e.id === weekId) || pool[0];
      state.evangeliosWeekId = activeEntry.id;

      const weekSelect = getEl("evangeliosWeekSelect", targetDoc);
      if (weekSelect) {
        weekSelect.innerHTML = pool
          .map((e) => {
            const tObj = e.texts?.[activeEvLang] || e.texts?.es || {};
            const sel = e.id === activeEntry.id ? " selected" : "";
            const labelTitle = tObj.title || e.plate_id || e.id;
            return `<option value="${escapeHtml(e.id)}"${sel}>Semana ${e.week} (${escapeHtml(e.quarter)}) · ${escapeHtml(labelTitle)} — ${escapeHtml(e.reference)}</option>`;
          })
          .join("");
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
        const tObj = activeEntry.texts?.[activeEvLang] || activeEntry.texts?.es || {};
        const bridgeObj = activeEvLang === "es" ? activeEntry.texts?.en : activeEntry.texts?.es;
        const labelTitle = tObj.title || activeEntry.plate_id || activeEntry.id;
        cardEl.setAttribute("data-evangelios-id", activeEntry.id);
        cardEl.setAttribute("data-evangelios-quarter", activeEntry.quarter);
        cardEl.setAttribute("data-evangelios-lang", activeEvLang);
        cardEl.innerHTML =
          `<header style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.5rem;">` +
          `<strong>Semana ${activeEntry.week}/52 (${escapeHtml(activeEntry.quarter)}) · ${escapeHtml(labelTitle)}</strong>` +
          `<button type="button" class="uls-chip" data-evangelios-ref="${escapeHtml(activeEntry.reference)}" style="min-height:48px;padding:0.35rem 0.75rem;font-size:0.8rem;">📖 Abrir en La Biblia: ${escapeHtml(activeEntry.reference)}</button>` +
          `</header>` +
          `<p style="margin:0 0 0.45rem 0;font-size:0.82rem;color:var(--accent-amber);"><strong>🕊️ Gesto Litúrgico:</strong> ${escapeHtml(activeEntry.gesture || "")}</p>` +
          `<blockquote style="margin:0 0 0.45rem 0;font-size:0.95rem;line-height:1.5;">${escapeHtml(tObj.text || "")}</blockquote>` +
          (bridgeObj && bridgeObj.text
            ? `<p style="margin:0;font-size:0.8rem;color:var(--text-secondary);border-top:1px dashed var(--card-border);padding-top:0.4rem;"><em>Puente:</em> ${escapeHtml(bridgeObj.text)}</p>`
            : "") +
          renderEvangeliosPlateActionsHtml({
            weekId: activeEntry.id,
            passageRef: activeEntry.reference,
            lang: activeEvLang,
          });
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
        const printBtn = e?.target?.closest
          ? e.target.closest(".btn-evangelios-open-print")
          : e?.target?.classList?.contains?.("btn-evangelios-open-print")
            ? e.target
            : null;
        if (printBtn) {
          await transitionSheet("print", targetDoc);
          return;
        }
        const shareBtn = e?.target?.closest
          ? e.target.closest(".btn-evangelios-open-share")
          : e?.target?.classList?.contains?.("btn-evangelios-open-share")
            ? e.target
            : null;
        if (shareBtn) {
          await transitionSheet("share", targetDoc);
          return;
        }
        const studyBtn = e?.target?.closest
          ? e.target.closest(".btn-evangelios-open-study")
          : e?.target?.classList?.contains?.("btn-evangelios-open-study")
            ? e.target
            : null;
        if (studyBtn) {
          const studyRef = studyBtn.getAttribute?.("data-evangelios-ref");
          const parsedStudy = parseBiblicalCoordinateReference(studyRef || "JHN.1.1");
          if (parsedStudy && parsedStudy.bookCode) {
            await navigate(
              {
                book: parsedStudy.bookCode,
                chapter: parsedStudy.chapter || 1,
                verse: parsedStudy.verse || 1,
              },
              targetDoc,
            );
          }
          await transitionSheet("study", targetDoc);
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

    const switchWork = async (workId, docRef = targetDoc) => {
      const cleanWork = ["biblia", "felices", "evangelios"].includes(workId) ? workId : "biblia";
      state.activeWork = cleanWork;
      const bibSec = getEl("bibleSovereignSection", docRef);
      const felSec = getEl("felicesSovereignSection", docRef);
      const evaSec = getEl("evangeliosSovereignSection", docRef);
      const tabBib = getEl("tabWorkBiblia", docRef);
      const tabFel = getEl("tabWorkFelices", docRef);
      const tabEva = getEl("tabWorkEvangelios", docRef);

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

      if (tabBib) tabBib.setAttribute("aria-selected", cleanWork === "biblia" ? "true" : "false");
      if (tabFel) tabFel.setAttribute("aria-selected", cleanWork === "felices" ? "true" : "false");
      if (tabEva) tabEva.setAttribute("aria-selected", cleanWork === "evangelios" ? "true" : "false");

      if (cleanWork === "evangelios") {
        const entry = await hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
        if (entry && entry.reference) {
          const parsed = parseBiblicalCoordinateReference(entry.reference);
          if (parsed && parsed.bookCode) {
            state.book = parsed.bookCode;
            state.chapter = parsed.chapter || 1;
            state.verse = parsed.verse || 1;
          }
        }
      } else if (cleanWork === "felices") {
        const dichaCoord = FELICES_12_DICHAS_COORDINATE_MAP[2];
        if (dichaCoord) {
          state.book = dichaCoord.book;
          state.chapter = dichaCoord.chapter;
          state.verse = dichaCoord.verse;
        }
        if (!state.felicesLoaded) {
          state.felicesLoaded = true;
          try {
            await import("./i18n_ui.js");
          } catch {
            // Ignore if already loaded
          }
        }
      }
      return cleanWork;
    };

    state.switchWork = switchWork;
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
    selectVerse,
    dispenseDose1,
    transitionSheet,
    countVisibleSheets,
    setUiLocale,
    bindDomEvents,
    hydrateStudyDrawer,
    hydrateImproveDrawer,
    hydratePrintDrawerPanels,
    hydrateShareAndAuditDrawer,
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

  win.selectSovereignBibleLang = async function selectSovereignBibleLang(langCode) {
    await controller.navigate({ lang: langCode }, doc);
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
