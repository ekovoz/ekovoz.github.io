// ============================================================================
// web/mostrador/cross_work_bridge.js — Pure Cross-Work Coordinate Bridge (C2)
// Extracted from bridge_and_chapter.js (SLICE-EKO-V3UX-17 · 0 ciclos TDZ)
// ============================================================================

import {
  FELICES_PLATE_TO_BIBLE_COORDINATE,
  getActivePlateIndex,
  resolvePlateForBibleCoordinate,
} from "../i18n_ui.js";
import {
  EVANGELIOS_MACRO_THREADS_AND_ECHOES,
  FELICES_12_DICHAS_COORDINATE_MAP,
  FELICES_28_PLATES_MAP,
  parseCanonicalOtEchoRef,
} from "./evangelios.js";

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
