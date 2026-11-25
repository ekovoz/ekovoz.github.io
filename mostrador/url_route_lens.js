// ============================================================================
// web/mostrador/url_route_lens.js — Bidirectional URL <-> Store Route Lens
// Implements GetPut/PutGet projection for work, coordinate, intent, dose,
// bilingual bridge pair, print profile, and R11 draft preview gate (`GOLD-634`).
// ============================================================================

import { isWorkVisible, parsePreviewWorksParam, WORK_LIFECYCLE } from "./projection_contract.js";

const FELICES_N = 27;
const REGISTERED_WORK_IDS = Object.freeze(Object.keys(WORK_LIFECYCLE));

const clampNum = (v, hi, d = 1) => Math.max(1, Math.min(hi, Number(v) || d));
const trimStr = (v, d = "") => String(v || d).trim();

const parseWeekSlug27 = (s) => {
  const m = trimStr(s).toLowerCase().match(/^s?0*(\d{1,2})$/);
  return m ? `s${String(clampNum(m[1], 52)).padStart(2, "0")}` : null;
};

export const FELICES_PLATE_TO_BIBLE_COORDINATE = Object.fromEntries(
  Array.from({ length: FELICES_N }, (_, i) => [
    i + 1,
    i < 24
      ? {
        book: "MAT",
        chapter: 5,
        verse: i < 2 ? 1 : i < 4 ? 3 : Math.min(12, (i >> 1) + 2),
        beatitudeIndex: Math.min(10, i >> 1),
      }
      : i < 26
        ? { book: "MAT", chapter: 5, verse: 1, beatitudeIndex: 0 }
        : { book: "REV", chapter: 22, verse: 14, beatitudeIndex: 11 },
  ]),
);

const DEFAULT_CORPUS_LANG_BY_UI_MAP = Object.freeze({
  en: "en",
  es: "es",
  fr: "fr",
  pt: "pt",
  it: "it",
  id: "id",
  tr: "tr",
  ru: "ru",
  "zh-hans": "zh-Hans",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
  hi: "hi",
  bn: "bn",
  "bn-bd": "bn",
  "bn-in": "bn",
  ar: "ar",
  ur: "ur",
  fa: "fa",
});

export function normalizeRouteIntent(rawIntent = "", rawMode = "") {
  const clean = trimStr(rawIntent).toLowerCase();
  if (clean === "improve" || clean === "field" || clean === "workshop") return "workshop";
  if (clean === "dosis" || clean === "share") return "share";
  if (clean === "study" || clean === "print" || clean === "read") return clean;
  if (trimStr(rawMode).toLowerCase() === "studio") return "study";
  return "";
}

export function normalizeRouteDose(rawDose = "") {
  const m = trimStr(rawDose).toLowerCase().match(/^(?:dose)?([123])$/);
  return m ? Number(m[1]) : null;
}

export function intentToSheetId(intent = "") {
  const clean = trimStr(intent).toLowerCase();
  if (clean === "workshop" || clean === "field" || clean === "improve") return "field";
  if (clean === "dosis" || clean === "share") return "share";
  if (clean === "study" || clean === "print") return clean;
  return null;
}

export function resolveDefaultCorpusLangForUi(uiLocale = "en") {
  const clean = trimStr(uiLocale, "en").replace(/_/g, "-").toLowerCase();
  if (!clean) return "en";
  if (Object.prototype.hasOwnProperty.call(DEFAULT_CORPUS_LANG_BY_UI_MAP, clean)) {
    return DEFAULT_CORPUS_LANG_BY_UI_MAP[clean];
  }
  const primary = clean.split("-")[0];
  if (Object.prototype.hasOwnProperty.call(DEFAULT_CORPUS_LANG_BY_UI_MAP, primary)) {
    return DEFAULT_CORPUS_LANG_BY_UI_MAP[primary];
  }
  return "en";
}

export function parseInitialRouteAndLocale({
  search = "",
  pathname = "",
  defaultUi = "en",
  defaultLang = null,
  macroThreads = null,
} = {}) {
  const q = new URLSearchParams(trimStr(search).replace(/^\?/, ""));
  const pL = trimStr(pathname).toLowerCase();
  const g = (k) => trimStr(q.get(k));
  const b = (k, h) => {
    const n = Number(q.get(k));
    return n >= 1 ? clampNum(Math.round(n), h) : null;
  };
  const rawPreview = g("preview");
  const previewWorks = parsePreviewWorksParam(rawPreview);
  const previewParam = previewWorks.length > 0 ? (rawPreview || (previewWorks.length === 1 ? previewWorks[0] : "1")) : "";
  const plate = b("plate", FELICES_N);
  const dicha = b("dicha", 12);
  const week = parseWeekSlug27(g("week"));
  const rW = g("work").toLowerCase();
  const requestedWork = REGISTERED_WORK_IDS.includes(rW)
    ? rW
    : plate || dicha
      ? "felices"
      : week
        ? "evangelios"
        : REGISTERED_WORK_IDS.find((w) => pL.includes(w)) || "biblia";
  const workAllowed = isWorkVisible(requestedWork, previewWorks);
  const blockedDraftWork = workAllowed ? null : requestedWork;
  const work = workAllowed ? requestedWork : "biblia";
  const degradedWeek = blockedDraftWork === "evangelios" ? week : null;
  const effectiveWeek = work === "evangelios" ? week : null;
  const dP = dicha ? (dicha === 1 ? 25 : dicha === 12 ? 27 : clampNum(dicha * 2 - 1, 24)) : null;
  const pC = work === "felices" && (plate || dP) ? FELICES_PLATE_TO_BIBLE_COORDINATE[plate || dP] : null;
  const evFallbackRef = degradedWeek && macroThreads?.[degradedWeek]?.anchorOsis
    ? macroThreads[degradedWeek].anchorOsis
    : null;
  const rR = g("ref");
  const ui = g("ui") || defaultUi || "en";
  const lang = g("lang") || defaultLang || resolveDefaultCorpusLangForUi(ui);
  const rawIntent = normalizeRouteIntent(g("intent"), g("mode"));
  const explicitSheet = g("sheet").toLowerCase();
  const sheet = explicitSheet
    ? (explicitSheet === "improve" || explicitSheet === "workshop" ? "field" : explicitSheet === "dosis" ? "share" : explicitSheet)
    : intentToSheetId(rawIntent);
  const intent = rawIntent || (sheet === "field" ? "workshop" : sheet || "read");
  const dose = normalizeRouteDose(g("dose"));
  const bridge = g("bridge") || g("bridgeLang") || null;
  const profile = g("profile") || g("edition") || null;

  return {
    work,
    blockedDraftWork,
    degradedWeek,
    previewWorks,
    previewParam,
    ui,
    lang,
    ref: rR || (pC ? `${pC.book}.${pC.chapter}.${pC.verse}` : evFallbackRef || "JHN.1.1"),
    refExplicit: !!rR,
    plate,
    dicha,
    week: effectiveWeek,
    reg: g("reg").toLowerCase() || g("register").toLowerCase() || null,
    ortho: g("ortho") || null,
    sheet,
    intent,
    dose,
    bridge,
    profile,
    format: g("format").toLowerCase() === "letter" ? "letter" : "a4",
  };
}

export function serializeMostradorRouteQuery(st = {}, fallbackPlate = 24) {
  const previewWorks = Array.isArray(st.previewWorks)
    ? st.previewWorks
    : parsePreviewWorksParam(st.preview || st.previewParam || "");
  const rW = trimStr(st.work || st.activeWork || "biblia").toLowerCase();
  const work = REGISTERED_WORK_IDS.includes(rW) && isWorkVisible(rW, previewWorks) ? rW : "biblia";
  const ui = trimStr(st.ui || st.uiLocale, "en");
  const q = new URLSearchParams({
    work,
    ui,
    lang: trimStr(st.lang, resolveDefaultCorpusLangForUi(ui)),
    ref: trimStr(
      st.ref,
      `${trimStr(st.book, "JHN").toUpperCase()}.${clampNum(st.chapter, 999)}.${clampNum(st.verse, 999)}`,
    ),
  });
  if (previewWorks.length > 0) {
    q.set("preview", trimStr(st.previewParam, previewWorks.length === 1 ? previewWorks[0] : "1"));
  }
  if (work === "felices") {
    q.set("plate", String(clampNum(st.plate ?? st.activePlateIndex ?? fallbackPlate, FELICES_N, 24)));
    const d = Number(st.dicha ?? st.activeDichaIndex ?? st.felicesDicha);
    if (d >= 1 && d <= 12) q.set("dicha", String(Math.round(d)));
  } else if (work === "evangelios") {
    q.set("week", parseWeekSlug27(st.week || st.evangeliosWeekId) || "s01");
  }
  const sheetVal = trimStr(st.sheet || st.activeSheet).toLowerCase();
  const intentVal = normalizeRouteIntent(st.intent || st.activeIntent);
  const doseVal = normalizeRouteDose(st.dose ?? st.activeDose);
  const bridgeVal = trimStr(st.bridge || st.bridgeLang);
  const profileVal = trimStr(st.profile || st.edition);
  for (const [k, v] of [
    ["reg", trimStr(st.reg || st.register).toLowerCase()],
    ["ortho", trimStr(st.ortho || st.orthographyProfile)],
    ["sheet", sheetVal],
    ["intent", intentVal && intentVal !== "read" ? intentVal : ""],
    ["dose", doseVal ? String(doseVal) : ""],
    ["bridge", bridgeVal],
    ["profile", profileVal && profileVal !== "02_2col_pastoral" ? profileVal : ""],
    ["format", trimStr(st.format || st.paperFormat).toLowerCase()],
  ]) {
    if (v && v !== "intergeneracional" && v !== "a4") q.set(k, v);
  }
  return `?${q}`;
}
