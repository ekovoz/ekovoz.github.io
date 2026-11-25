// ============================================================================
// web/mostrador/print_config_projector.js — Extracted Print Configurator & Substrate Resolver
// Decision D4-R2: Consolidated printConfig SSOT, direct 14+2 Editions selector (incl.
// Ed. 15 Bilingual Bridge 62/38 & Ed. 16 CC0 Notebook 45mm margin), and Grambank wiring.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { resolveSelectableBridgeLang } from "./diglossic_chapter_renderer.js";
import {
  CANONICAL_12_BRANCH_PROFILES,
  CANONICAL_14_PLUS_2_EDITIONS_CATALOG,
  CANONICAL_16_TYPOLOGY_PROFILES,
  dispatchTandaWorkerJob,
  normalizeEditionSlug,
  syncPrintDrawerControlsFromEditionProfile,
} from "./dosis.js";
import {
  GOSPEL_14_PERICOPES_SPEC,
  REFUGE_4_SHEETS_PASSAGES_SPEC,
  buildEditionRenderSpecBytes16,
  formatCanonical80BlocksChecklistEntries,
  resolveNumericEditionId,
  transduceTextToBrailleBrfAndUnicode,
} from "./dosis_editions_catalog.js";
import { isRtlLocale } from "./i18n.js";
import { updatePrintConfig } from "./state_store.js";
import { encodePaperFormatCode } from "./tanda_print_worker.js";

function normalizeChapterMapToEntries(bookCode, chapterNum, versesMap) {
  if (Array.isArray(versesMap)) return versesMap;
  if (!versesMap || typeof versesMap !== "object") return [];
  return Object.keys(versesMap)
    .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
    .map((vNum) => ({ ref: `${bookCode} ${chapterNum}:${vNum}`, text: String(versesMap[vNum] ?? "") }));
}

export function filterBookEntriesRange(entries, bookCode, minCh = 1, maxCh = 999, minV = 1, maxV = 999) {
  const out = [];
  for (const item of entries) {
    const m = String(item?.ref || "").match(/^([A-Z0-9]+)\s+(\d+):(\d+)/i);
    if (!m) continue;
    if (String(m[1]).toUpperCase() !== String(bookCode).toUpperCase()) continue;
    const ch = Number(m[2]);
    const v = Number(m[3]);
    if (ch < minCh || ch > maxCh) continue;
    if (ch === minCh && v < minV) continue;
    if (ch === maxCh && v > maxV) continue;
    out.push(item);
  }
  return out;
}

export function flattenLoadedBookChapters(bookCode, chaptersObj) {
  if (!chaptersObj || typeof chaptersObj !== "object") return [];
  const entries = [];
  const isChapArray = Array.isArray(chaptersObj);
  const chapNums = Object.keys(chaptersObj).sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
  for (const chKey of chapNums) {
    const chDisplay = isChapArray ? Number(chKey) + 1 : chKey;
    const chVal = chaptersObj[chKey];
    if (Array.isArray(chVal)) {
      for (const v of chVal) {
        if (Array.isArray(v) && v.length >= 3 && v[2]) {
          entries.push({ ref: `${bookCode} ${chDisplay}:${v[0] ?? 1}`, text: String(v[2]) });
        } else if (v && v.text) {
          entries.push({ ref: `${bookCode} ${chDisplay}:${v.start ?? v.verse ?? 1}`, text: String(v.text) });
        }
      }
    } else if (chVal && typeof chVal === "object") {
      const versesMap = chVal.verses && typeof chVal.verses === "object" ? chVal.verses : chVal;
      const vNums = Object.keys(versesMap).sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
      for (const vKey of vNums) {
        if (typeof versesMap[vKey] === "string") {
          entries.push({ ref: `${bookCode} ${chDisplay}:${vKey}`, text: versesMap[vKey] });
        }
      }
    }
  }
  return entries;
}

export async function resolveEditionSubstrateForProfile(
  profId,
  {
    state = {},
    dataLayer = null,
    curLang = "es",
    activeBook = "GEN",
    activeChapter = 1,
    columns = 2,
    fontPt = 9.5,
    paper = "a4",
    orientation = "portrait",
    booklet4n = false,
  } = {},
) {
  const id = String(profId || "02_2col_pastoral").trim();
  const baseVerses =
    Array.isArray(state.fullBookVerses) && state.fullBookVerses.length > 0
      ? state.fullBookVerses
      : normalizeChapterMapToEntries(activeBook, activeChapter, state.lastNavResult?.chapter?.verses || {});

  if (id.includes("checklist_80_bloques")) {
    return {
      book: "GEN",
      chapter: 1,
      verses: formatCanonical80BlocksChecklistEntries(curLang),
      bridgeVerses: null,
      editionMode: 0,
      columns: 2,
      fontPt: 9.0,
      paper: "a4",
      orientation: "portrait",
      booklet4n: false,
      brfHref: "",
    };
  }

  const loadBookEntries = async (langCode, bookCode) => {
    if (typeof dataLayer?.loadBookFromEkpackRange !== "function") return [];
    const res = await dataLayer.loadBookFromEkpackRange(langCode, bookCode);
    return String(res?.status || "").toLowerCase() === "ready"
      ? flattenLoadedBookChapters(bookCode, res.data?.chapters)
      : [];
  };

  if (id.includes("refugio_4_hojas")) {
    const bridgeLang = resolveSelectableBridgeLang({ state, curLang });
    const vernOut = [];
    const bridgeOut = [];
    const vernByBook = new Map();
    const bridgeByBook = new Map();
    for (const p of REFUGE_4_SHEETS_PASSAGES_SPEC) {
      if (!vernByBook.has(p.book)) {
        vernByBook.set(p.book, await loadBookEntries(curLang, p.book));
        bridgeByBook.set(p.book, await loadBookEntries(bridgeLang, p.book));
      }
      for (const item of filterBookEntriesRange(vernByBook.get(p.book), p.book, p.chapter, p.chapter, p.startVerse, p.endVerse)) {
        vernOut.push(item);
      }
      for (const item of filterBookEntriesRange(bridgeByBook.get(p.book), p.book, p.chapter, p.chapter, p.startVerse, p.endVerse)) {
        bridgeOut.push(item);
      }
    }
    return {
      book: "GEN",
      chapter: 1,
      verses: vernOut.length > 0 ? vernOut : baseVerses,
      bridgeVerses: bridgeOut.length > 0 ? bridgeOut : null,
      editionMode: 15,
      columns: 2,
      fontPt: 8.5,
      paper: "a4",
      orientation: "portrait",
      booklet4n: true,
      brfHref: "",
    };
  }

  if (id === "10_evangelio_14_pericopas") {
    const gospelOut = [];
    const gospelByBook = new Map();
    for (const p of GOSPEL_14_PERICOPES_SPEC) {
      if (!gospelByBook.has(p.book)) {
        gospelByBook.set(p.book, await loadBookEntries(curLang, p.book));
      }
      const slice = filterBookEntriesRange(gospelByBook.get(p.book), p.book, p.chapter, p.chapter, p.startVerse, p.endVerse);
      if (slice.length > 0) {
        gospelOut.push({ ref: `${p.book} ${p.chapter}:${p.startVerse}`, text: `[${p.title}] ${slice[0].text}` });
        for (let k = 1; k < slice.length; k += 1) gospelOut.push(slice[k]);
      }
    }
    return {
      book: "JHN",
      chapter: 1,
      verses: gospelOut.length > 0 ? gospelOut : baseVerses,
      bridgeVerses: null,
      editionMode: 0,
      columns: 2,
      fontPt: 10.0,
      paper: "a4",
      orientation: "portrait",
      booklet4n: true,
      brfHref: "",
    };
  }

  if (id === "06_bilingue_paralela") {
    const bridgeLang = resolveSelectableBridgeLang({ state, curLang });
    let bridgeEntries = await loadBookEntries(bridgeLang, activeBook);
    const cachedBridgeVerses = state.lastBridgeChapter?.verses || state.lastNavResult?.bridgeChapter?.verses;
    if (bridgeEntries.length === 0 && cachedBridgeVerses) {
      bridgeEntries = normalizeChapterMapToEntries(activeBook, activeChapter, cachedBridgeVerses);
    }
    return {
      book: activeBook,
      chapter: activeChapter,
      verses: baseVerses,
      bridgeVerses: bridgeEntries.length > 0 ? bridgeEntries : null,
      editionMode: 15,
      maternalWidthPct: 62,
      bridgeWidthPct: 38,
      bilingualRatio: "62/38",
      columns: 2,
      fontPt: 9.5,
      paper,
      orientation,
      booklet4n,
      brfHref: "",
    };
  }

  if (id === "05_interlineal_estudio") {
    const chapEntries = normalizeChapterMapToEntries(
      activeBook,
      activeChapter,
      state.lastNavResult?.chapter?.verses || {},
    );
    const activeSet = chapEntries.length > 0 ? chapEntries : baseVerses;
    let matrixRes = state.lastNavResult?.matrix || state.lastNavResult?.chapterMatrix || null;
    if (!matrixRes && typeof dataLayer?.loadChapterMatrix === "function") {
      try {
        matrixRes = await dataLayer.loadChapterMatrix(activeBook, activeChapter);
      } catch {
        matrixRes = null;
      }
    }
    const matrixRows = Array.isArray(matrixRes?.rows) ? matrixRes.rows : [];
    const interlinearVerses = activeSet.map((entry) => {
      const vMatch = String(entry.ref || "").match(/:(\d+)$/);
      const vNum = Number(vMatch ? vMatch[1] : 1) || 1;
      const tokens = matrixRows.filter((r) =>
        Array.isArray(r) ? Number(r[0]) === vNum : Number(r?.verse ?? r?.v ?? 0) === vNum,
      );
      if (tokens.length === 0) {
        const pendingLabel = curLang.startsWith("en")
          ? "Tier-0 matrix loading"
          : "Matriz Tier-0 cargándose";
        return { ref: entry.ref, text: `${entry.text} ‖ (${pendingLabel})` };
      }
      const colsSummary = tokens
        .map((tk, tkIdx) => {
          const c02Pos = `w${tkIdx + 1}`;
          const surf = Array.isArray(tk) ? tk[1] || "" : tk.surface || tk.c03 || "";
          const lem = Array.isArray(tk) ? tk[2] || "" : tk.lemma || tk.c04 || "";
          const strong = Array.isArray(tk) ? tk[3] || "" : tk.strong || tk.c05 || "";
          const morph = Array.isArray(tk) ? tk[4] || "" : tk.morph || tk.c06 || "";
          const domain = Array.isArray(tk) ? tk[5] || "" : tk.domain || tk.c07 || "";
          const glossEn = Array.isArray(tk) ? tk[6] || "" : tk.gloss_en || tk.c08 || "";
          const glossEs = Array.isArray(tk) ? tk[7] || "" : tk.gloss_es || tk.gloss || tk.c09 || "";
          const gloss = glossEn && glossEs && glossEn !== glossEs
            ? (curLang.startsWith("en") ? `${glossEn}/${glossEs}` : `${glossEs}/${glossEn}`)
            : (glossEs || glossEn);
          const clause = Array.isArray(tk) ? tk[8] || "" : tk.clause || tk.c10 || "";
          const c11 = Array.isArray(tk) ? tk[9] || "" : tk.c11 || "";
          const c12 = Array.isArray(tk) ? tk[10] || "" : tk.c12 || "";
          const c13 = Array.isArray(tk) ? tk[11] || "" : tk.c13 || "";
          const c14 = Array.isArray(tk) ? tk[12] || "" : tk.c14 || "";
          const translitAscii = Array.isArray(tk) && tk[14] && tk[13] && tk[14] !== tk[13] ? tk[13] : "";
          const translit = Array.isArray(tk) ? tk[14] || tk[13] || "" : tk.translit || tk.c15 || "";
          const extras = [domain, clause, c11, c12, c13, c14, translitAscii, translit].filter(Boolean);
          return extras.length > 0
            ? `[${surf}|${lem}|${strong}|${morph}|${c02Pos}|${gloss}|${extras.join("|")}]`
            : `[${surf}|${lem}|${strong}|${morph}|${c02Pos}|${gloss}]`;
        })
        .join(" ");
      return { ref: entry.ref, text: `${entry.text} ‖ ${colsSummary}` };
    });
    const isNtInterlinear = /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)$/i.test(
      String(activeBook || "").trim(),
    );
    return {
      book: activeBook,
      chapter: activeChapter,
      verses: interlinearVerses,
      bridgeVerses: null,
      bridgeFontFile: isNtInterlinear ? "EBGaramond-Greek-Biblical.ttf" : "Cardo-Hebrew-Biblical.ttf",
      tertiaryFontFile: isNtInterlinear ? "Cardo-Hebrew-Biblical.ttf" : "EBGaramond-Greek-Biblical.ttf",
      editionMode: 0,
      columns: 1,
      fontPt: 9.0,
      paper: "a4",
      orientation: "portrait",
      booklet4n: false,
      brfAscii: "",
      brfHref: "",
    };
  }

  if (id === "11_braille_nemeth_b70") {
    const braille = transduceTextToBrailleBrfAndUnicode(baseVerses, {
      lineWidth: 40,
      nemeth: Boolean(state?.brailleNemethEnabled),
    });
    const brfHref = `data:text/plain;charset=utf-8,${encodeURIComponent(braille.brfAscii)}`;
    return {
      book: activeBook,
      chapter: activeChapter,
      verses: braille.unicodeBrailleEntries.map((e) => ({
        ref: e.ref,
        text: `${e.unicodeBraille} — ${e.text}`,
      })),
      bridgeVerses: null,
      editionMode: 0,
      columns: 1,
      fontPt: 16.0,
      paper: "b70",
      orientation: "portrait",
      booklet4n: false,
      brfAscii: braille.brfAscii,
      brfHref,
    };
  }

  return {
    book: activeBook,
    chapter: activeChapter,
    verses: baseVerses,
    bridgeVerses: null,
    editionMode: id === "07_cuaderno_5lineas_apaisado" ? 16 : 0,
    columns,
    fontPt,
    paper,
    orientation: id === "07_cuaderno_5lineas_apaisado" ? "landscape" : orientation,
    booklet4n,
    brfHref: "",
  };
}

/**
 * Computes optimal typological print preset from Grambank 12 branches + 16 typologies.
 */
export function resolveDefaultTypologyForLang(langCode = "es") {
  const base = String(langCode || "es").trim().toLowerCase().split("-")[0];
  const typoMap = {
    es: ["G_01_latin_extended", "es_typology"],
    en: ["G_01_latin_extended", "en_typology"],
    fr: ["G_01_latin_extended", "fr_typology"],
    pt: ["G_01_latin_extended", "pt_typology"],
    it: ["G_01_latin_extended", "it_typology"],
    id: ["G_06_austronesian", "id_typology"],
    tr: ["G_03_turkic_altaic", "tr_typology"],
    ru: ["G_02_cyrillic_slavic", "ru_typology"],
    he: ["G_04_semitic_hebrew", "he_typology"],
    grc: ["G_01_latin_extended", "grc_typology"],
    ar: ["G_05_arabic_persian", "ar_typology"],
    fa: ["G_05_arabic_persian", "fa_typology"],
    ur: ["G_05_arabic_persian", "ur_typology"],
    hi: ["G_07_indo_aryan", "hi_typology"],
    bn: ["G_07_indo_aryan", "bn_typology"],
    ja: ["G_08_cjk", "ja_typology"],
    ko: ["G_08_cjk", "ko_typology"],
    zh: ["G_08_cjk", "zh_typology"],
    stp: ["G_10_americas_uto_aztecan", "stp_typology"],
    quc: ["G_10_americas_uto_aztecan", "quc_typology"],
    gn: ["G_10_americas_uto_aztecan", "gn_typology"],
  };
  const [branchId, typologyId] = typoMap[base] || ["G_01_latin_extended", "es_typology"];
  const hasBranch = CANONICAL_12_BRANCH_PROFILES.some((b) => b.id === branchId);
  const hasTypo = CANONICAL_16_TYPOLOGY_PROFILES.some((t) => t.id === typologyId);
  return {
    branchId: hasBranch ? branchId : (CANONICAL_12_BRANCH_PROFILES.find((b) => b.parsed?.word_order === "SVO")?.id || CANONICAL_12_BRANCH_PROFILES[0]?.id || "G_01_latin_extended"),
    typologyId: hasTypo ? typologyId : (CANONICAL_16_TYPOLOGY_PROFILES.find((t) => t.lang_code === base || t.id === "es_typology")?.id || CANONICAL_16_TYPOLOGY_PROFILES[0]?.id || "es_typology"),
  };
}

export function resolveGrambankTypologyPrintPreset(branchId = "", typologyId = "") {
  const branch =
    CANONICAL_12_BRANCH_PROFILES.find((b) => b.id === branchId) ||
    CANONICAL_12_BRANCH_PROFILES.find((b) => b.parsed?.word_order === "SVO") ||
    CANONICAL_12_BRANCH_PROFILES[0] ||
    { id: "G_01_latin_extended", parsed: { word_order: "SVO" } };
  const typology =
    CANONICAL_16_TYPOLOGY_PROFILES.find((t) => t.id === typologyId) ||
    CANONICAL_16_TYPOLOGY_PROFILES.find((t) => t.id === "es_typology") ||
    CANONICAL_16_TYPOLOGY_PROFILES[0] ||
    { id: "es_typology", lang_code: "es", word_order: "SVO" };
  const bid = String(branch.id || "");
  const isVsoOrPolysynth =
    /VSO/i.test(String(typology.word_order || "")) ||
    /polysynthetic|americas|uto_aztecan|mayan|quechuan|niger|austronesian/i.test(bid);
  const isLargeScript = /arabic|cjk|cyrillic|indic|brahmic|ethiopic/i.test(bid);
  return {
    branchId: bid,
    typologyId: String(typology.id || ""),
    edition: isVsoOrPolysynth ? "06_bilingue_paralela" : isLargeScript ? "04_letra_grande_13_5pt" : "02_2col_pastoral",
    columns: isVsoOrPolysynth || isLargeScript ? 1 : 2,
    fontSizePt: isLargeScript ? 12.0 : isVsoOrPolysynth ? 10.5 : 9.5,
    orientation: isVsoOrPolysynth ? "landscape" : "portrait",
  };
}

/**
 * Applies selected Grambank branch + typology directly into EkovozStore `printConfig`
 * and optionally triggers a live worker job.
 */
export async function applyGrambankTypologyToPrint(ctx = {}, branchId, typologyId, { triggerJob = false } = {}) {
  const { state = {}, store = null, targetDoc = null } = ctx;
  const preset = resolveGrambankTypologyPrintPreset(branchId, typologyId);
  state.activeBranchId = preset.branchId;
  state.activeTypologyId = preset.typologyId;
  state.activePrintProfileId = preset.edition;
  state.edition = normalizeEditionSlug(preset.edition, { paperFormat: state.paperFormat || "a4", columns: preset.columns });
  state.columns = preset.columns;
  state.fontSizePt = preset.fontSizePt;
  state.orientation = preset.orientation;
  if (store) {
    updatePrintConfig(store, {
      edition: state.edition,
      columns: preset.columns,
      fontSizePt: preset.fontSizePt,
      orientation: preset.orientation,
      activeBranchId: preset.branchId,
      activeTypologyId: preset.typologyId,
    });
  }
  if (targetDoc) {
    syncPrintDrawerControlsFromEditionProfile(preset.edition, targetDoc);
  }
  let jobResult = null;
  if (triggerJob) {
    const langCode = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
    const entries = normalizeChapterMapToEntries(
      state.book || "GEN",
      state.chapter || 1,
      state.lastNavResult?.chapter?.verses || {},
    );
    const editionId = resolveNumericEditionId(preset.edition);
    const renderSpec =
      editionId > 0
        ? buildEditionRenderSpecBytes16(editionId, {
          columns: preset.columns,
          fontTenthsPt: Math.round(preset.fontSizePt * 10),
          paperCode: encodePaperFormatCode(state.paperFormat || "a4", preset.orientation),
        })
        : null;
    jobResult = await dispatchTandaWorkerJob({
      lang: langCode,
      book: state.book || "GEN",
      chapter: state.chapter || 1,
      verses: entries,
      editionId,
      editionRenderSpec: renderSpec,
      editionMode: preset.edition === "06_bilingue_paralela" ? 15 : 0,
      columns: preset.columns,
      fontPt: preset.fontSizePt,
      paper: state.paperFormat || "a4",
      orientation: preset.orientation,
      includeBoldFont: true,
      dir: isRtlLocale(langCode) ? "rtl" : "ltr",
      booklet4n: true,
      maxPagesPerTanda: 0,
    });
  }
  return { preset, jobResult };
}

/**
 * Mounts direct 14+2 editions quick selector (explicitly surfacing Ed. 15 62/38 & Ed. 16 CC0 45mm)
 * and Grambank typology bridge inside #bibleKindleConfigurator.
 */
export function ensureDirectEditionsAndGrambankControls(ctx = {}) {
  const { state = {}, store = null, targetDoc = null, getEl, onConfigChanged } = ctx;
  const cfgHost = typeof getEl === "function" ? getEl("bibleKindleConfigurator", targetDoc) : null;
  if (!cfgHost || !targetDoc || typeof targetDoc.createElement !== "function") return null;

  const wrap =
    (typeof getEl === "function" ? getEl("direct14Plus2EditionBar", targetDoc) : null) ||
    targetDoc.createElement("div");
  const isNewWrap = wrap.id !== "direct14Plus2EditionBar";
  wrap.id = "direct14Plus2EditionBar";
  wrap.className = "direct-14-plus-2-bar";
  const isEn = String(state.uiLocale || "es").toLowerCase().startsWith("en");
  const activeEd = String(state.activePrintProfileId || state.edition || "02_2col_pastoral");
  const activeMeta =
    CANONICAL_14_PLUS_2_EDITIONS_CATALOG.find((ed) => ed.id === activeEd) ||
    CANONICAL_14_PLUS_2_EDITIONS_CATALOG[0];
  const liveCols = Number(state.columns) || 2;
  const livePt = Number(state.fontSizePt) || 9.5;
  const livePaper = String(state.paperFormat || "a4").toUpperCase();
  const baseLabel = String(activeMeta?.label || activeEd).replace(/\s*\([^)]*pt[^)]*\)\s*$/i, "").trim();
  const activeBadge =
    activeMeta?.id === "06_bilingue_paralela"
      ? isEn ? `Ed. 15 · Bilingual Bridge 62/38 (${liveCols} col · ${livePt}pt · ${livePaper})` : `Ed. 15 · Puente Bilingüe 62/38 (${liveCols} col · ${livePt}pt · ${livePaper})`
      : activeMeta?.id === "07_cuaderno_5lineas_apaisado"
        ? isEn ? `Ed. 16 · Field Notebook CC0 (45 mm · ${livePaper})` : `Ed. 16 · Cuaderno de Campo CC0 (margen 45 mm · ${livePaper})`
        : `${baseLabel} (${liveCols} col · ${livePt}pt · ${livePaper})`;
  const defaultTypo = resolveDefaultTypologyForLang(state.effectiveCorpusLang || state.lang || "es");
  const branchId = state.activeBranchId || defaultTypo.branchId;
  const typoId = state.activeTypologyId || defaultTypo.typologyId;
  wrap.innerHTML =
    `<div id="activeEditionImpositionSummary" class="ek-row-wrap" data-active-edition-id="${escapeHtml(activeEd)}">` +
    `<span><strong>${isEn ? "Active edition:" : "Edición activa:"}</strong> ${escapeHtml(activeBadge)}</span>` +
    `</div>` +
    `<button type="button" id="btnApplyGrambankToPrint" class="uls-chip" data-grambank-apply-print="true" data-branch-id="${escapeHtml(branchId)}" data-typology-id="${escapeHtml(typoId)}">` +
    `${isEn ? "🌐 Apply typological profile to Print" : "🌐 Aplicar perfil tipológico a Impresión"}</button>`;
  if (isNewWrap && typeof cfgHost.appendChild === "function") {
    cfgHost.appendChild(wrap);
  }

  const gBtn = typeof getEl === "function" ? getEl("btnApplyGrambankToPrint", targetDoc) : null;
  if (gBtn && !gBtn._grambankApplyBound && typeof gBtn.addEventListener === "function") {
    gBtn._grambankApplyBound = true;
    gBtn.addEventListener("click", async () => {
      const fallback = resolveDefaultTypologyForLang(state.effectiveCorpusLang || state.lang || "es");
      const bId = gBtn.getAttribute?.("data-branch-id") || state.activeBranchId || fallback.branchId;
      const tId = gBtn.getAttribute?.("data-typology-id") || state.activeTypologyId || fallback.typologyId;
      await applyGrambankTypologyToPrint(ctx, bId, tId, { triggerJob: true });
      onConfigChanged?.();
    });
  }
  return wrap;
}
