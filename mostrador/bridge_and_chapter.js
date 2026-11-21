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
import { lookupIso639MacroRegionO1 } from "./lang_funnel.js";
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
    { beatitudeIndex: 11, plateIndex: 25, book: "MAT", chapter: 5, verse: 1, evangeliosWeek: "s08", evangeliosQuarter: "T1" },
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

export function syncOrthographyPillsVisibilityInDom({ state, targetDoc, getEl }) {
  const orthoContainer = getEl("bibleOrthographyPills", targetDoc);
  if (!orthoContainer) return;
  const familyKey = resolveOrthoFamilyKey(state.lang);
  const isMultiOrtho = Boolean(familyKey) || MULTI_ORTHO_LANGS.has(String(state.lang || "").toLowerCase());
  orthoContainer.hidden = !isMultiOrtho;
  if (orthoContainer.style) orthoContainer.style.display = isMultiOrtho ? "flex" : "none";
  orthoContainer.setAttribute("data-ortho-visible", isMultiOrtho ? "true" : "false");
  orthoContainer.setAttribute("data-ortho-family", familyKey || "none");

  const activeCanonProfile = resolveCanonicalOrthoProfileId(
    familyKey || state.lang,
    state.orthographyProfile,
  );
  const pillSpecs = [
    { id: "btnOrthoInali", family: "stp", profile: "INALI_2018" },
    { id: "btnOrthoTradicional", family: "stp", profile: "ILV_1950" },
    { id: "btnOrthoFonetica", family: "stp", profile: "FONETICA_IPA" },
    { id: "btnOrthoBnBd", family: "bn", profile: "bn-BD" },
    { id: "btnOrthoBnIn", family: "bn", profile: "bn-IN" },
    { id: "btnOrthoArbTashkeel", family: "arb", profile: "TASHKEEL_STRIPPED", altProfile: "VOWELIZED" },
    { id: "btnOrthoUznCyrl", family: "uzn", profile: "CYRL", altProfile: "LATN" },
    { id: "btnOrthoTzmTfng", family: "tzm", profile: "TFNG", altProfile: "LATN" },
  ];
  for (const spec of pillSpecs) {
    const btn = getEl(spec.id, targetDoc);
    if (!btn) continue;
    const matchesFamily = Boolean(familyKey) && spec.family === familyKey;
    btn.hidden = !matchesFamily;
    if (btn.style) btn.style.display = matchesFamily ? "" : "none";
    const isPressed =
      matchesFamily &&
      (activeCanonProfile === spec.profile ||
        (spec.altProfile && activeCanonProfile === spec.altProfile));
    if (typeof btn.setAttribute === "function") {
      btn.setAttribute("aria-pressed", isPressed ? "true" : "false");
      btn.setAttribute("data-active-ortho-profile", activeCanonProfile);
    }
  }
}
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

const VERIFIED_EKPACK_HUMAN_20 = new Set([
  "es",
  "es-1909",
  "en",
  "he",
  "hbo",
  "heb",
  "grc",
  "ar",
  "bn",
  "de",
  "fa",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "pt",
  "ru",
  "sw",
  "tr",
  "ur",
  "zh-hans",
  "zh",
]);

const CANONICAL_66_BOOKS_ORDER = [
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
  "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV",
];
const CANONICAL_66_BOOK_INDEX = new Map(CANONICAL_66_BOOKS_ORDER.map((c, idx) => [c, idx]));

/**
 * Desempaqueta en O(1) los 2 bits epistémicos (`0=Tier0, 1=Tier1 Humano, 2=Tier2 Sint/Taller, 3=Tier4 Sin Texto`)
 * del arreglo de 17 bytes `book_epistemic_tiers` embebido en `Frame 0` (`SLICE-EKO-V2I-20`).
 */
export function unpackBookEpistemicTier2Bit(packed17Bytes, bookCodeOrOrd) {
  let idx = -1;
  if (typeof bookCodeOrOrd === "number" && Number.isInteger(bookCodeOrOrd)) {
    idx = bookCodeOrOrd;
  } else {
    const code = String(bookCodeOrOrd || "").trim().toUpperCase();
    if (CANONICAL_66_BOOK_INDEX.has(code)) idx = CANONICAL_66_BOOK_INDEX.get(code);
  }
  if (idx < 0 || idx >= 66) return 3;
  if (!packed17Bytes || typeof packed17Bytes.length !== "number" || packed17Bytes.length < 17) {
    return null;
  }
  const byteIdx = idx >>> 2;
  const shift = (idx & 3) * 2;
  return ((Number(packed17Bytes[byteIdx]) || 0) >>> shift) & 0x03;
}

/**
 * Determina si el libro canónico actual cuenta con texto humano verificado (`0b00` o `0b01`)
 * según `book_epistemic_tiers` (incluyendo `stp` NT `40_MAT..66_REV` y porciones `Tier 3` como `arp` `LUK`).
 */
export function isBookHumanVerifiedByEpistemicTier(bookCode, navResult = null, catalogEntry = null) {
  const cleanBook = String(bookCode || navResult?.book || navResult?.chapter?.book || "").trim().toUpperCase();
  const bookIdx = CANONICAL_66_BOOK_INDEX.has(cleanBook) ? CANONICAL_66_BOOK_INDEX.get(cleanBook) : -1;
  if (bookIdx < 0) return false;
  const packed =
    navResult?.provenance?.book_epistemic_tiers ||
    navResult?.chapter?.provenance?.book_epistemic_tiers ||
    navResult?.bookEpistemicTiers ||
    catalogEntry?.bookEpistemicTiers ||
    null;
  const bits = unpackBookEpistemicTier2Bit(packed, bookIdx);
  if (bits !== null) {
    return bits === 0 || bits === 1;
  }
  const lang = String(navResult?.lang || catalogEntry?.code || "").trim().toLowerCase();
  if (lang === "stp") {
    return bookIdx >= 39;
  }
  return false;
}

/**
 * Derives the Epistemic Seal key strictly from Frame 0 provenance and loaded chapter status.
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
  const activeBook = String(navResult.book || navResult.chapter?.book || "").trim().toUpperCase();
  const packedTiers =
    navResult.provenance?.book_epistemic_tiers ||
    navResult.chapter?.provenance?.book_epistemic_tiers ||
    navResult.bookEpistemicTiers ||
    catalogEntry?.bookEpistemicTiers ||
    null;
  if (activeBook && packedTiers && packedTiers.length >= 17) {
    const bits = unpackBookEpistemicTier2Bit(packedTiers, activeBook);
    if (bits === 0 || bits === 1) return "seal.verified";
    if (bits === 2) return "seal.draft_review";
    return "seal.unavailable";
  }
  const provTier = String(
    navResult.provenance?.sovereign_tier ||
      navResult.chapter?.provenance?.sovereign_tier ||
      catalogEntry?.sovereign_tier ||
      "",
  ).toLowerCase();
  if (
    provTier === "tier0_autograph_witness" ||
    provTier === "tier1_canonical_human_66" ||
    provTier === "tier_0_autograph_witness" ||
    provTier === "tier_1_open_canonical_66"
  ) {
    return "seal.verified";
  }
  if (provTier === "tier2_nt_human_ot_synthesized" || provTier === "tier_2_nt_plus_ot_synth") {
    if (activeBook && CANONICAL_66_BOOK_INDEX.has(activeBook) && CANONICAL_66_BOOK_INDEX.get(activeBook) >= 39) {
      return "seal.verified";
    }
    return "seal.draft_review";
  }
  if (provTier === "tier_3_portion_ladder" || provTier === "tier3a_dialectal_wfst_projection" || provTier === "tier3b_mdl_atomic_batch_assisted") {
    return "seal.verified";
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
  if (VERIFIED_EKPACK_HUMAN_20.has(lang)) {
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

/**
 * Mapa determinista de las 10 Lenguas Puente Regionales Siglo XXI (`D7-V2` + `D6-V2I`, `@req[BIB-V2-21]`):
 * `es, en, pt, fr, ru, ar, sw, hi, zh-Hans, id` alineadas `1:1` con `R01..R12` y con `packs/<code >.ekpack`.
 */
export const REGIONAL_BRIDGE_LANGUAGES_10 = {
  1: { code: "es", label: "Español Siglo XXI (Núcleo Vivo)" },
  2: { code: "en", label: "English 21st Century (Contemporary Bridge)" },
  3: { code: "fr", label: "Français Contemporain (Puente Europa Occidental)" },
  4: { code: "ru", label: "Русский Современный Мост" },
  5: { code: "ru", label: "Русский / Евразийский Мост" },
  6: { code: "ar", label: "العربية المعاصرة" },
  7: { code: "fr", label: "Français Contemporain / Sahel Bridge" },
  8: { code: "sw", label: "Kiswahili Sanifu cha Karne ya 21" },
  9: { code: "hi", label: "आधुनिक हिंदी सेतु" },
  10: { code: "zh-Hans", label: "现代中文桥接本" },
  11: { code: "id", label: "Bahasa Indonesia Abad ke-21" },
  12: { code: "en", label: "English Pacific Bridge" },
  13: { code: "pt", label: "Português Contemporâneo (Puente Lusófono · Américas)" },
  14: { code: "pt", label: "Português Contemporâneo (Puente Lusófono · Europa/África)" },
  15: { code: "pt", label: "Português Contemporâneo (Puente Lusófono · Asia-Pacífico)" },
};

export function resolveRegionalBridgeLanguage21({ macroRegion = 0, bridgeLang = "", lang = "" } = {}) {
  const rawOverride = String(bridgeLang || "").trim();
  const lowerOverride = rawOverride.toLowerCase();
  const normalizedOverride =
    lowerOverride === "zh" || lowerOverride === "zh-hans" || lowerOverride === "cmn"
      ? "zh-Hans"
      : lowerOverride;
  const validCodes = new Set(["es", "en", "fr", "pt", "sw", "ar", "hi", "id", "ru", "zh-Hans"]);
  if (validCodes.has(normalizedOverride)) {
    const found = Object.values(REGIONAL_BRIDGE_LANGUAGES_10).find(
      (x) => x.code.toLowerCase() === normalizedOverride.toLowerCase(),
    );
    return found || { code: normalizedOverride, label: `Bridge (${normalizedOverride})` };
  }
  let resolvedRegion = Number(macroRegion) || 0;
  if (lang) {
    const o1 = lookupIso639MacroRegionO1(lang);
    if (o1.isLusophone) {
      return REGIONAL_BRIDGE_LANGUAGES_10[o1.nibble] || REGIONAL_BRIDGE_LANGUAGES_10[13];
    }
    if (o1.found && (resolvedRegion < 1 || resolvedRegion > 12)) {
      resolvedRegion = o1.macroRegionId;
    }
  }
  return REGIONAL_BRIDGE_LANGUAGES_10[resolvedRegion] || REGIONAL_BRIDGE_LANGUAGES_10[1];
}

/**
 * Renderiza el Puente Paralelo Diglósico Honesto para `Tiers 2–4` (`D7-V2`, `@req[BIB-V2-21]`):
 * - Columna Materna: porción humana verificada (`Tier 2` NT / `Tier 3` porción) o andamiaje
 *   explícito `GMIS` de 4 líneas + escalera `CELF-250` (`Tier 2` AT / `Tier 4`), con `0%` texto
 *   sintético disfrazado de Biblia humana.
 * - Columna Puente: Lengua Puente Regional Siglo XXI (`es, en, fr, pt, sw, ar, hi, id, ru, zh`).
 */
export function renderDiglossicParallelBridge({
  lang = "stp",
  book = "GEN",
  chapter = 1,
  sovereignTier = "TIER_2_NT_PLUS_OT_SYNTH",
  macroRegion = 1,
  bridgeLang = "",
  maternalVerses = {},
  bridgeVerses = {},
  gmisRows = [],
  celfPrompt = "",
} = {}) {
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const cleanChap = Number(chapter) || 1;
  const ntBooks = new Set([
    "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL",
    "1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV",
  ]);
  const isNt = ntBooks.has(cleanBook);
  const bridgeSpec = resolveRegionalBridgeLanguage21({ macroRegion, bridgeLang, lang });
  const verseNums = Array.from(
    new Set([...Object.keys(maternalVerses || {}), ...Object.keys(bridgeVerses || {})]),
  )
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (verseNums.length === 0) verseNums.push(1);

  const gmisByVerse = new Map();
  for (const r of Array.isArray(gmisRows) ? gmisRows : []) {
    const vn = Number(r.verse) || 1;
    if (!gmisByVerse.has(vn)) gmisByVerse.set(vn, []);
    gmisByVerse.get(vn).push(r);
  }

  const isHumanMaternalPortion =
    (sovereignTier === "TIER_2_NT_PLUS_OT_SYNTH" && isNt) ||
    (sovereignTier === "TIER_3_PORTION_LADDER" && Object.keys(maternalVerses || {}).length > 0);

  const sealCode = isHumanMaternalPortion
    ? "VERIFIED_MATERNAL_PORTION_PLUS_BRIDGE_21"
    : sovereignTier === "TIER_4_GMIS_CELF250"
      ? "GMIS_4LINE_CELF250_SCAFFOLD_PLUS_BRIDGE_21"
      : "OT_INTERLINEAR_SCAFFOLD_PLUS_BRIDGE_21";

  const rowsHtml = verseNums
    .map((vNum) => {
      const osis = `${cleanBook}.${cleanChap}.${vNum}`;
      const matTxt = String((maternalVerses || {})[String(vNum)] || "").trim();
      const brTxt = String((bridgeVerses || {})[String(vNum)] || "").trim();
      let leftCellHtml = "";
      if (isHumanMaternalPortion && matTxt) {
        leftCellHtml = `<div class="diglossic-maternal-human" data-maternal-stratum="HUMAN_VERIFIED"><sup>${vNum}</sup> ${escapeHtml(matTxt)}</div>`;
      } else {
        const vRows = gmisByVerse.get(vNum) || [];
        const l1 = vRows.map((x) => escapeHtml(x.c05_orig_text || x.morph || "—")).join(" · ") || escapeHtml(matTxt || `[Andamiaje ${osis}]`);
        const l2 = vRows.map((x) => escapeHtml(x.c08_morph_code || x.leipzig || "GLOSA")).join(" · ") || "Morfología Leipzig";
        const l3 = vRows.map((x) => escapeHtml(x.c13_nsm_65 || "ALGUIEN / DECIR")).join(" · ");
        leftCellHtml =
          `<div class="diglossic-gmis-4line" data-maternal-stratum="GMIS_SCAFFOLD" data-gmis-lines="4">` +
          `<div data-gmis-line="1"><strong>L1 Original/Morfemas:</strong> ${l1}</div>` +
          `<div data-gmis-line="2"><strong>L2 Glosa Leipzig:</strong> ${l2}</div>` +
          `<div data-gmis-line="3"><strong>L3 NSM-65:</strong> ${l3}</div>` +
          `<div data-gmis-line="4"><strong>L4 CELF-250 (${escapeHtml(lang)}):</strong> ${escapeHtml(celfPrompt || `Semilla submodular para ${osis}`)}</div>` +
          `</div>`;
      }
      const rightCellHtml =
        `<div class="diglossic-bridge-21" data-bridge-lang="${escapeHtml(bridgeSpec.code)}">` +
        `<sup>${vNum}</sup> ${escapeHtml(brTxt || `[Puente ${bridgeSpec.code.toUpperCase()} ${osis}]`)}` +
        `</div>`;
      return (
        `<div class="diglossic-parallel-row" data-osis="${escapeHtml(osis)}" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0.75rem;padding:0.45rem 0;border-bottom:1px solid var(--card-border);">` +
        leftCellHtml +
        rightCellHtml +
        `</div>`
      );
    })
    .join("\n");

  return (
    `<section class="diglossic-parallel-bridge" data-diglossic-bridge="true" data-lang="${escapeHtml(lang)}" data-bridge-lang="${escapeHtml(bridgeSpec.code)}" data-sovereign-tier="${escapeHtml(sovereignTier)}" data-epistemic-seal="${sealCode}" data-epistemic-honesty="ZERO_SYNTHETIC_BIBLE">` +
    `<header class="diglossic-bridge-header" style="display:flex;justify-content:space-between;gap:0.5rem;padding:0.4rem 0.6rem;border-radius:8px;background:var(--bg-secondary);font-size:0.78rem;margin-bottom:0.5rem;">` +
    `<span><strong>Columna Materna (<code>${escapeHtml(lang)}</code>):</strong> ${isHumanMaternalPortion ? "Porción Humana Verificada" : "Andamiaje Interlineal Honesto GMIS + CELF-250 (0% Falsa Biblia)"}</span>` +
    `<span><strong>Lengua Puente Siglo XXI (<code>${escapeHtml(bridgeSpec.code)}</code>):</strong> ${escapeHtml(bridgeSpec.label)}</span>` +
    `</header>` +
    rowsHtml +
    `</section>`
  );
}

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
    const diglossicHtml = options.diglossicBridge ? renderDiglossicParallelBridge({ lang, book, chapter, ...(typeof options.diglossicBridge === "object" ? options.diglossicBridge : {}) }) : "";
    return `<article class="bible-trimodal-chapter mostrador-bilingue-diptych" data-book="${escapeHtml(
      book
    )}" data-chapter="${Number(chapter)}" data-lang="${escapeHtml(
      lang
    )}" data-register="bilingue" data-roll-mode="${rollMode}" dir="${dir}">${rowsHtml.join(
      "\n"
    )}${diglossicHtml}</article>`;
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
  const diglossicHtml = options.diglossicBridge
    ? renderDiglossicParallelBridge({
        lang,
        book,
        chapter,
        ...(typeof options.diglossicBridge === "object" ? options.diglossicBridge : {}),
      })
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
    )}${contextualGlossBannerHtml}${diglossicHtml}</article>`;
}

