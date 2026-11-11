// ============================================================================
// web/mostrador/bridge_and_chapter.js — Pure Cross-Work Coordinate Bridge,
// Orthography Profile Transducer, Epistemic Seal & Chapter Preview Renderer
// Extracted via LCOM4 Clean Seam (D87 / D6-A++ · ARB-EKOVOZ-62, ∂_mut(C) = 0)
// ============================================================================

import {
  FELICES_PLATE_TO_BIBLE_COORDINATE,
  getActivePlateIndex,
  resolvePlateForBibleCoordinate,
} from "../i18n_ui.js";
import { STATUS } from "./data_layer.js";
import {
  applySpanish21DiachronicRegister,
  computeAnalyticalRegisterMetrics,
} from "./diachronic_register.js";
import { detectContextualCulturalGlossesForVerse } from "./estudio.js";
import {
  EVANGELIOS_MACRO_THREADS_AND_ECHOES,
  FELICES_12_DICHAS_COORDINATE_MAP,
  FELICES_28_PLATES_MAP,
  parseCanonicalOtEchoRef,
  resolveMasoreticPericopeBreaks,
} from "./evangelios.js";
import { formatLocalizedNumeralWeb, isRtlLocale } from "./i18n.js";
import {
  ReverseOrthographyMap,
  resolveCanonicalOrthoProfileId,
  resolveOrthoFamilyKey,
  resolveScriptioContinuaCodeForLang,
  segmentScriptioContinuaSyllables,
  transduceOrthographyWeb,
} from "./orthography_wfst.js";

/**
 * Mapa declarativo canónico `Selector DOM -> Handler` (`D68 / 7B+` + `D70 / 9B+` · `ARB-EKOVOZ-65`).
 */
export const MOSTRADOR_DOM_BINDINGS = {
  "#tabWorkBiblia": "switchWork:biblia",
  "#tabWorkFelices": "switchWork:felices",
  "#tabWorkEvangelios": "switchWork:evangelios",
  "#bibleSelectBook": "navigate:book",
  "#bibleSelectChapter": "navigate:chapter",
  "#btnPrevChapter": "navigate:prevChapter",
  "#btnNextChapter": "navigate:nextChapter",
  "#btnOpenCompass": "compass:toggle",
  "#bibleChapterPericopesRibbon": "selectVerse:pericope",
  "#felicesSocraticWonderCard": "navigate:wonderCite",
  "#toggleA4": "setPaperFormat:a4",
  "#toggleCarta": "setPaperFormat:letter",
  "#btnOpenPreviewCarousel": "openModal:previewModal",
  "#previewModalCloseBtn": "closeModal:previewModal",
  "#btnPreviewClose": "closeModal:previewModal",
  "#carouselPrevBtn": "prevSlide",
  "#carouselNextBtn": "nextSlide",
  "#evangeliosWeekSelect": "hydrateEvangeliosSection:week",
  "#evangeliosLangSelect": "hydrateEvangeliosSection:lang",
  "#rosettaSearchInput": "renderPhilologyRosettaResultsRowsHtml",
  "#stpLexiconSearchInput": "renderStpLexiconResultsRowsHtml",
  "#bibleEasyDrawer": "transitionSheet:study",
  "#btnOpenPrintEditionsSheet": "transitionSheet:print",
  "#btnOpenFieldWorkshopSheet": "transitionSheet:field",
  "#btnOpenShareAndAuditSheet": "transitionSheet:share",
};

/**
 * Tabla biyectiva entre las 3 Obras Soberanas (`biblia`, `felices`, `evangelios`, `D5-E+` · `ARB-EKOVOZ-61`).
 */
export const CROSS_WORK_BRIDGE_TABLE = {
  beatitudesToBible: [
    { beatitudeIndex: 0, plateIndex: 1, book: "MAT", chapter: 5, verse: 3, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 1, plateIndex: 3, book: "MAT", chapter: 5, verse: 3, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 2, plateIndex: 5, book: "MAT", chapter: 5, verse: 4, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 3, plateIndex: 7, book: "MAT", chapter: 5, verse: 5, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 4, plateIndex: 9, book: "MAT", chapter: 5, verse: 6, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 5, plateIndex: 11, book: "MAT", chapter: 5, verse: 7, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 6, plateIndex: 13, book: "MAT", chapter: 5, verse: 8, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 7, plateIndex: 15, book: "MAT", chapter: 5, verse: 9, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 8, plateIndex: 17, book: "MAT", chapter: 5, verse: 10, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 9, plateIndex: 19, book: "MAT", chapter: 5, verse: 11, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 10, plateIndex: 24, book: "MAT", chapter: 5, verse: 12, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
    { beatitudeIndex: 11, plateIndex: 25, book: "PSA", chapter: 1, verse: 1, evangeliosWeek: "s01", evangeliosQuarter: "T1" },
  ],
  evangeliosAnchors: {
    "JHN.1": { weekId: "s01", quarter: "T1", book: "JHN", chapter: 1, verse: 1 },
    "MAT.5": { weekId: "s08", quarter: "T1", book: "MAT", chapter: 5, verse: 3 },
    "MRK.4": { weekId: "s14", quarter: "T2", book: "MRK", chapter: 4, verse: 35 },
    "LUK.15": { weekId: "s27", quarter: "T3", book: "LUK", chapter: 15, verse: 11 },
    "JHN.20": { weekId: "s40", quarter: "T4", book: "JHN", chapter: 20, verse: 19 },
  },
};

/**
 * Proyecta sin pérdida la coordenada activa al conmutar entre `biblia`, `felices` y `evangelios`
 * aceptando tanto firma de objeto único como firma posicional de 3 argumentos (`D52 / 1C+` · `ARB-EKOVOZ-64`).
 */
export function projectCrossWorkCoordinate(
  fromWorkOrObj = "biblia",
  toWorkArg = "biblia",
  currentStateArg = {},
) {
  const isObjCall =
    fromWorkOrObj !== null &&
    typeof fromWorkOrObj === "object" &&
    !Array.isArray(fromWorkOrObj);
  const currentState = isObjCall ? fromWorkOrObj : currentStateArg || {};
  const rawFrom = isObjCall ? fromWorkOrObj.fromWork : fromWorkOrObj;
  const rawTo = isObjCall ? fromWorkOrObj.toWork : toWorkArg;

  const src = ["biblia", "felices", "evangelios"].includes(String(rawFrom || "").toLowerCase())
    ? String(rawFrom).toLowerCase()
    : "biblia";
  const dst = ["biblia", "felices", "evangelios"].includes(String(rawTo || "").toLowerCase())
    ? String(rawTo).toLowerCase()
    : "biblia";

  let book = String(currentState.book || "JHN").toUpperCase();
  let chapter = Math.max(1, Number(currentState.chapter) || 1);
  let verse = Math.max(1, Number(currentState.verse) || 1);
  let plateIndex = Math.max(
    1,
    Math.min(
      28,
      Number(
        currentState.plateIndex ??
          currentState.felicesPlate ??
          getActivePlateIndex() ??
          24,
      ) || 24,
    ),
  );
  let felicesDicha = Math.max(
    1,
    Math.min(12, Number(currentState.dichaIndex ?? currentState.felicesDicha) || 11),
  );
  const rawWeekInput = String(
    currentState.evangeliosWeekId || currentState.weekId || "s01",
  ).trim().toLowerCase();
  const weekNumMatch = rawWeekInput.match(/^s?0*(\d{1,2})$/);
  let evangeliosWeek = weekNumMatch
    ? `s${String(Math.max(1, Math.min(52, Number(weekNumMatch[1]) || 1))).padStart(2, "0")}`
    : "s01";

  const deriveQuarterForWeek = (wId) => {
    const m = String(wId || "s01").match(/^s?0*(\d{1,2})$/);
    const n = m ? Number(m[1]) || 1 : 1;
    if (n <= 13) return "T1";
    if (n <= 26) return "T2";
    if (n <= 39) return "T3";
    return "T4";
  };
  let evangeliosQuarter = String(
    currentState.evangeliosQuarter || deriveQuarterForWeek(evangeliosWeek),
  );

  if (src === "felices") {
    if (currentState.dichaIndex !== undefined || currentState.felicesDicha !== undefined) {
      const dCoord = FELICES_12_DICHAS_COORDINATE_MAP[felicesDicha];
      if (dCoord) {
        book = dCoord.book;
        chapter = dCoord.chapter;
        verse = dCoord.verse;
        plateIndex = resolvePlateForBibleCoordinate(book, chapter, verse);
      }
    } else if (currentState.beatitudeIndex !== undefined) {
      const bRow = CROSS_WORK_BRIDGE_TABLE.beatitudesToBible.find(
        (r) => r.beatitudeIndex === Number(currentState.beatitudeIndex),
      );
      if (bRow) {
        book = bRow.book;
        chapter = bRow.chapter;
        verse = bRow.verse;
        plateIndex = bRow.plateIndex;
        evangeliosWeek = bRow.evangeliosWeek;
        evangeliosQuarter = bRow.evangeliosQuarter;
        felicesDicha = Math.max(1, Math.min(12, bRow.beatitudeIndex + 1));
      }
    } else {
      const compiledPlate = FELICES_28_PLATES_MAP[plateIndex];
      const pCoord = FELICES_PLATE_TO_BIBLE_COORDINATE[plateIndex];
      if (compiledPlate && (compiledPlate.anchorRef || compiledPlate.book)) {
        const parsedP = parseCanonicalOtEchoRef(
          compiledPlate.anchorRef || `${compiledPlate.book}.${compiledPlate.chapter || 1}.${compiledPlate.verse || 1}`,
        );
        book = parsedP.book;
        chapter = parsedP.chapter;
        verse = parsedP.verse;
      } else if (pCoord) {
        book = pCoord.book;
        chapter = pCoord.chapter;
        verse = pCoord.verse;
        felicesDicha = Math.max(1, Math.min(12, (Number(pCoord.beatitudeIndex) || 0) + 1));
      }
    }
    const evAnchor = CROSS_WORK_BRIDGE_TABLE.evangeliosAnchors[`${book}.${chapter}`];
    if (evAnchor) {
      evangeliosWeek = evAnchor.weekId;
      evangeliosQuarter = evAnchor.quarter;
    }
  } else if (src === "biblia") {
    if ((book === "MAT" && chapter === 5) || (book === "PSA" && chapter === 1)) {
      plateIndex = resolvePlateForBibleCoordinate(book, chapter, verse);
      const pCoord = FELICES_PLATE_TO_BIBLE_COORDINATE[plateIndex];
      if (pCoord) {
        felicesDicha = Math.max(1, Math.min(12, (Number(pCoord.beatitudeIndex) || 0) + 1));
      }
    } else {
      const matchedDicha = Object.entries(FELICES_12_DICHAS_COORDINATE_MAP).find(
        ([, d]) => d.book === book && Number(d.chapter) === chapter,
      );
      if (matchedDicha) {
        felicesDicha = Number(matchedDicha[0]) || 1;
      } else if (dst === "felices") {
        const pCoord = FELICES_PLATE_TO_BIBLE_COORDINATE[plateIndex] || {
          book: "MAT",
          chapter: 5,
          verse: 3,
          beatitudeIndex: 1,
        };
        book = pCoord.book;
        chapter = pCoord.chapter;
        verse = pCoord.verse;
        felicesDicha = Math.max(1, Math.min(12, (Number(pCoord.beatitudeIndex) || 0) + 1));
      }
    }
    const evAnchor = CROSS_WORK_BRIDGE_TABLE.evangeliosAnchors[`${book}.${chapter}`];
    if (evAnchor) {
      evangeliosWeek = evAnchor.weekId;
      evangeliosQuarter = evAnchor.quarter;
    } else {
      const weekEntry = Object.values(EVANGELIOS_MACRO_THREADS_AND_ECHOES).find(
        (w) => w && w.book === book && Number(w.chapter) === chapter,
      );
      if (weekEntry && weekEntry.weekId) {
        evangeliosWeek = weekEntry.weekId;
        evangeliosQuarter = deriveQuarterForWeek(evangeliosWeek);
      }
    }
  } else if (src === "evangelios") {
    const matchAnchor = Object.values(CROSS_WORK_BRIDGE_TABLE.evangeliosAnchors).find(
      (a) => a.weekId === evangeliosWeek,
    );
    const weekMeta = EVANGELIOS_MACRO_THREADS_AND_ECHOES[evangeliosWeek];
    if (matchAnchor) {
      book = matchAnchor.book;
      chapter = matchAnchor.chapter;
      verse = matchAnchor.verse;
      evangeliosQuarter = matchAnchor.quarter;
    } else if (weekMeta && (weekMeta.anchorOsis || weekMeta.book)) {
      const parsedW = parseCanonicalOtEchoRef(
        weekMeta.anchorOsis || `${weekMeta.book}.${weekMeta.chapter || 1}.1`,
      );
      book = parsedW.book;
      chapter = parsedW.chapter;
      verse = parsedW.verse;
      evangeliosQuarter = deriveQuarterForWeek(evangeliosWeek);
    }
    if (dst === "felices") {
      plateIndex = resolvePlateForBibleCoordinate(book, chapter, verse);
      const pCoord = FELICES_PLATE_TO_BIBLE_COORDINATE[plateIndex];
      if (pCoord) {
        felicesDicha = Math.max(1, Math.min(12, (Number(pCoord.beatitudeIndex) || 0) + 1));
      }
    }
  }

  return {
    fromWork: src,
    toWork: dst,
    book,
    chapter,
    verse,
    plateIndex,
    felicesPlate: plateIndex,
    felicesDicha,
    evangeliosWeekId: evangeliosWeek,
    weekId: evangeliosWeek,
    evangeliosQuarter,
  };
}

export const HAREL_SHEET_MAP = {
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
};

export const LIFE_TRAILS_ANCHORS = {
  btnTrailConsuelo: { book: "PSA", chapter: 23, verse: 1, label: "Consuelo" },
  btnTrailPaz: { book: "JHN", chapter: 14, verse: 27, label: "Paz" },
  btnTrailPerdon: { book: "LUK", chapter: 15, verse: 11, label: "Perdón" },
  btnTrailSabiduria: { book: "JAS", chapter: 1, verse: 5, label: "Sabiduría" },
  btnTrailAmor: { book: "1CO", chapter: 13, verse: 4, label: "Amor" },
  btnTrailFamilia: { book: "1CO", chapter: 13, verse: 4, label: "Familia" },
  btnTrailEsperanza: { book: "ROM", chapter: 8, verse: 28, label: "Esperanza" },
  btnTrailOracion: { book: "MAT", chapter: 6, verse: 9, label: "Oración" },
  btnTrailCreacion: { book: "GEN", chapter: 1, verse: 1, label: "Creación" },
};

export const POETIC_BOOKS = new Set(["PSA", "PRO", "JOB", "SNG", "LAM"]);
export const MULTI_ORTHO_LANGS = new Set(["stp", "aud", "quc", "nah", "bn", "bn-bd", "bn-in", "tzj", "cak", "mam", "ar", "arb", "uzn", "uz", "tzm", "kk", "ber"]);
const SUPERSCRIPT_DIGITS = {
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
};

export function escapeHtml(value) {
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
export function applyOrthographyProfile(text, profile = "inali", lang = "stp", options = {}) {
  const raw = String(text ?? "");
  if (!raw) return raw;
  const scriptioCode = resolveScriptioContinuaCodeForLang(lang);
  const segmentedRaw = scriptioCode
    ? segmentScriptioContinuaSyllables(raw, scriptioCode)
    : raw;

  const inferredLang =
    profile === "bn-BD" || profile === "bn-IN"
      ? "bn"
      : profile === "TASHKEEL_STRIPPED" || profile === "VOWELIZED"
        ? "arb"
        : profile === "CYRL" || profile === "LATN"
          ? resolveOrthoFamilyKey(lang) === "tzm" ? "tzm" : "uzn"
          : profile === "TFNG"
            ? "tzm"
            : lang || "stp";

  const familyKey = resolveOrthoFamilyKey(inferredLang);
  if (
    !familyKey &&
    (!profile || profile === "inali" || profile === "INALI" || profile === "INALI_2018")
  ) {
    return segmentedRaw;
  }

  const res = transduceOrthographyWeb(segmentedRaw, {
    lang: familyKey || inferredLang,
    profile,
    tokenStrongPairs: options.tokenStrongPairs || [],
  });
  if (options.reverseMapTarget && res.reverseMap) {
    for (const [surf, canon] of res.reverseMap.surfaceToCanonical.entries()) {
      const strong = res.reverseMap.resolveStrong(surf);
      options.reverseMapTarget.registerTokenPair(canon, surf, strong);
    }
  }
  if (
    familyKey === "stp" &&
    (!profile || profile === "inali" || profile === "INALI" || profile === "INALI_2018")
  ) {
    return segmentedRaw;
  }
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
 * Resolves in O(1) the canonical token and Strong ID (H####/G####) for a clicked word surface
 * using `ReverseOrthographyMap` and optional 14-column interlinear rows (`D1-R37`).
 */
export function lookupWordTokenStrongEntry(
  wordSurface,
  wordIndex = 0,
  reverseMap = null,
  tokenStrongPairs = []
) {
  const cleanSurface = String(wordSurface ?? "")
    .replace(/^[^\p{L}\p{N}\u0247\uA78C']+|[^\p{L}\p{N}\u0247\uA78C']+$/gu, "")
    .trim();
  let canonicalToken = cleanSurface;
  let strongId = "";

  if (reverseMap) {
    if (typeof reverseMap.lookup === "function") {
      const hit = reverseMap.lookup(cleanSurface) || reverseMap.lookup(String(wordSurface ?? "").trim());
      if (hit && typeof hit === "object") {
        canonicalToken = hit.canonical || canonicalToken;
        strongId = hit.strongId || hit.strong || "";
      } else if (typeof hit === "string" && hit) {
        canonicalToken = hit;
      }
    }
    if (!strongId && typeof reverseMap.resolveStrong === "function") {
      strongId =
        reverseMap.resolveStrong(cleanSurface) ||
        reverseMap.resolveStrong(String(wordSurface ?? "").trim()) ||
        "";
    }
    if (canonicalToken === cleanSurface && typeof reverseMap.resolveCanonical === "function") {
      canonicalToken =
        reverseMap.resolveCanonical(cleanSurface) ||
        reverseMap.resolveCanonical(String(wordSurface ?? "").trim()) ||
        cleanSurface;
    }
  }

  if (!strongId && Array.isArray(tokenStrongPairs) && tokenStrongPairs.length > 0) {
    const lowerClean = cleanSurface.toLowerCase();
    const lowerCanon = String(canonicalToken || "").toLowerCase();
    const matched =
      tokenStrongPairs.find((pair) => {
        const candidate = String(
          pair?.token || pair?.surface || pair?.c09_gloss_es || pair?.c08_gloss_en || pair?.c03_surface || ""
        )
          .trim()
          .toLowerCase();
        return candidate && (candidate === lowerClean || candidate === lowerCanon || candidate.includes(lowerClean));
      }) || tokenStrongPairs[wordIndex % tokenStrongPairs.length];
    if (matched) {
      strongId = String(matched.strongId || matched.c07_strong_id || matched.strong || "").trim();
      if (!canonicalToken && matched.token) {
        canonicalToken = String(matched.token).trim();
      }
    }
  }

  return {
    surface: cleanSurface || String(wordSurface ?? "").trim(),
    canonical: canonicalToken || cleanSurface,
    strongId: strongId || "",
    wordIndex: Math.max(0, Number(wordIndex) || 0),
  };
}

/**
 * Tokenizes ONLY the active verse (`selectedVerse`) Just-In-Time into interactive
 * `<span class="bible-word-token">` elements with O(1) Strong resolution (`D1-R37`).
 */
export function renderInteractiveVerseTokensHtml(
  rawText,
  { verseNum = 1, osis = "GEN.1.1", reverseMap = null, tokenStrongPairs = [] } = {}
) {
  const source = String(rawText ?? "");
  if (!source) return "";
  const segments = source.split(/(\s+)/);
  let wordIndex = 0;
  return segments
    .map((seg) => {
      if (!seg || /^\s+$/.test(seg)) {
        return seg;
      }
      const currentIdx = wordIndex++;
      const entry = lookupWordTokenStrongEntry(seg, currentIdx, reverseMap, tokenStrongPairs);
      const strongAttr = entry.strongId
        ? ` data-strong-id="${escapeHtml(entry.strongId)}"`
        : "";
      return `<span class="bible-word-token" data-word-token="${escapeHtml(
        entry.canonical
      )}" data-word-surface="${escapeHtml(
        entry.surface
      )}" data-canonical-token="${escapeHtml(
        entry.canonical
      )}" data-word-index="${currentIdx}" data-verse="${Number(
        verseNum
      )}" data-osis="${escapeHtml(osis)}"${strongAttr}>${escapeHtml(seg)}</span>`;
    })
    .join("");
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
      const primaryBodyHtml = isSelected
        ? renderInteractiveVerseTokensHtml(rawPrimary, {
            verseNum: vNum,
            osis,
            reverseMap: options.reverseMap || null,
            tokenStrongPairs: options.tokenStrongPairs || [],
          })
        : escapeHtml(rawPrimary);
      rowsHtml.push(
        `<div class="mostrador-diptych-row" data-verse="${vNum}" data-osis="${escapeHtml(
          osis
        )}" style="display:grid;grid-template-columns:minmax(0,58fr) minmax(0,42fr);gap:14px;padding:6px 0;border-bottom:1px solid rgba(28,25,23,0.08);"><span class="mostrador-verse bible-verse-line${isSelected ? " is-selected" : ""
        }" data-verse="${vNum}" data-osis="${escapeHtml(
          osis
        )}"><sup class="bible-v-sup"${supHiddenAttr}>${escapeHtml(
          supNum
        )}</sup> ${primaryBodyHtml}</span><span class="mostrador-verse-bridge" data-verse="${vNum}" style="font-size:0.92em;color:#57534E;">${escapeHtml(
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
  const reverseMapTarget =
    options.reverseMap instanceof ReverseOrthographyMap
      ? options.reverseMap
      : new ReverseOrthographyMap(lang, orthoProfile);
  const scriptioCode = resolveScriptioContinuaCodeForLang(lang);

  for (const vNum of verseNums) {
    let rawText = applyOrthographyProfile(
      String(chapterData.verses[String(vNum)] || "").trim(),
      orthoProfile,
      lang,
      {
        reverseMapTarget,
        tokenStrongPairs: options.tokenStrongPairs || [],
      }
    );
    if (!rawText) continue;
    if (String(lang || "").toLowerCase() === "es" && register === "intergeneracional") {
      rawText = applySpanish21DiachronicRegister(rawText).modernizedText;
    }
    allRenderedVersesText.push(rawText);

    if (breakMap.has(vNum) && currentSpans.length > 0) {
      if (oralPorticoActive) {
        const pausePeriodMs = Math.max(250, Number(options.pausePeriodSelahMs) || 650);
        currentSpans.push(
          `<span class="mostrador-oral-pause" data-pause-period-ms="${pausePeriodMs}" aria-label="Pausa silenciosa 3 segundos">[Pausa silenciosa · 3s]</span>`
        );
      }
      const masoreticSymbol = currentBlockKind === "petuhah" ? "פ" : "ס";
      blocks.push(
        `<div class="mostrador-pericope-block${isPoetic ? " mostrador-poetic-stichometry" : ""
        }" data-break-kind="${escapeHtml(currentBlockKind)}" data-masoretic-marker="${masoreticSymbol}">${currentSpans.join(" ")}</div>`
      );
      currentBlockKind = breakMap.get(vNum) || "setumah";
      currentSpans = [];
    }

    const locNum = formatLocalizedNumeralWeb(vNum, lang, false);
    const supNum = toUnicodeSuperscript(locNum);
    const isSelected = vNum === selectedVerse;
    const osis = `${book}.${chapter}.${vNum}`;

    const renderedBody = isSelected
      ? renderInteractiveVerseTokensHtml(rawText, {
          verseNum: vNum,
          osis,
          reverseMap: reverseMapTarget,
          tokenStrongPairs: options.tokenStrongPairs || [],
        })
      : escapeHtml(rawText);
    const dropcapClass = vNum === 1 ? " bible-chapter-dropcap" : "";

    currentSpans.push(
      `<span class="mostrador-verse bible-verse-line${isSelected ? " is-selected" : ""
      }" data-verse="${vNum}" data-osis="${escapeHtml(
        osis
      )}"><sup class="bible-v-sup mostrador-verse-num${dropcapClass}"${supHiddenAttr}>${escapeHtml(
        supNum
      )}</sup> ${renderedBody}</span>`
    );
  }

  if (currentSpans.length > 0) {
    if (oralPorticoActive) {
      const pausePeriodMs = Math.max(250, Number(options.pausePeriodSelahMs) || 650);
      currentSpans.push(
        `<span class="mostrador-oral-pause" data-pause-period-ms="${pausePeriodMs}" aria-label="Pausa silenciosa 3 segundos">[Pausa silenciosa · 3s]</span>`
      );
    }
    const masoreticSymbol = currentBlockKind === "petuhah" ? "פ" : "ס";
    blocks.push(
      `<div class="mostrador-pericope-block${isPoetic ? " mostrador-poetic-stichometry" : ""
      }" data-break-kind="${escapeHtml(currentBlockKind)}" data-masoretic-marker="${masoreticSymbol}">${currentSpans.join(" ")}</div>`
    );
  }

  const regMetrics = computeAnalyticalRegisterMetrics(
    allRenderedVersesText.join(" "),
    `${book}.${chapter}.${selectedVerse}`,
  );
  const selectedRawVerseText = String(chapterData.verses[String(selectedVerse)] || "");
  const contextualGlosses = detectContextualCulturalGlossesForVerse(selectedRawVerseText);
  const contextualGlossBannerHtml =
    contextualGlosses.length > 0
      ? `<aside id="activeVerseCulturalGlossBanner" class="cultural-gloss-canvas-banner" data-cultural-gloss-count="${contextualGlosses.length}" style="margin-top:0.55rem;padding:0.4rem 0.65rem;border-radius:8px;border:1px solid var(--card-border);background:var(--bg-secondary);font-size:0.78rem;line-height:1.4;">` +
        contextualGlosses
          .map(
            (g) =>
              `<span data-cultural-gloss-term="${escapeHtml(g.term)}">🏺 <strong>${escapeHtml(g.term)}</strong>: ${escapeHtml(g.nsm_gloss || "")}</span>`,
          )
          .join(" · ") +
        `</aside>`
      : "";

  return `<article class="bible-trimodal-chapter${isPoetic ? " mostrador-poetic-stichometry" : ""
    }" data-book="${escapeHtml(book)}" data-chapter="${Number(
      chapter
    )}" data-lang="${escapeHtml(
      lang
    )}" data-register="${escapeHtml(register)}" data-roll-mode="${rollMode}" data-ortho-profile="${escapeHtml(
      resolveCanonicalOrthoProfileId(lang, orthoProfile)
    )}" data-scriptio-continua="${escapeHtml(
      scriptioCode || "none"
    )}" data-reverse-ortho-size="${reverseMapTarget.size}" data-aoa="${regMetrics.meanAoa}" data-mdd="${regMetrics.meanDependencyDistance}" data-eipen-l="${regMetrics.eipenReadabilityL}" dir="${dir}">${blocks.join(
      "\n"
    )}${contextualGlossBannerHtml}</article>`;
}

