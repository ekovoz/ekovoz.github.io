// web/mostrador/dosis.js — Dosificador de impresión y difusión en 3 escalas (SLICE-V2R-05, D1-A+, D4-A+).
//
//   Dosis 1 · «Hojas arriba y abajo del verso»: 1, 2 o 3 hojas físicas del PDF de bloque real.
//   Dosis 2 · Un bloque canónico (1 de 80) completo.
//   Dosis 3 · La Biblia completa (PDF con /Outlines).

import { BIBLE_CONSTANTS } from "../bible_constants.js";
import {
  buildCssPagedMediaPrintHtml,
  dispatchTandaWorkerJob,
  getCachedFederationReachability,
  planBimodalClientPrint,
  probeFederationShardReachabilityOnce,
  resolveFederatedAssetUrl,
  typesetTandaPdfBytes,
} from "./bimodal_tanda_print.js";
import {
  computeFoliationLayout,
  computeKindlePrintBudget,
  hydrateEditorialProfiles,
  renderBranchAndTypologyInspectorHtml,
  renderImpositionAndLayoutPreviewHtml,
  renderMultiSignatureAndPocketRefugeHtml,
  resolveEditionGeometrySpec,
  resolvePrintEditionPdfAssetUrl,
} from "./dosis_editions_catalog.js";
import {
  buildRelativePdfAssetUrl,
  CANONICAL_12_BRANCH_PROFILES,
  CANONICAL_14_PLUS_2_EDITIONS_CATALOG,
  CANONICAL_14_PRINT_PROFILES,
  CANONICAL_16_TYPOLOGY_PROFILES,
  CANONICAL_80_BLOCKS_CATALOG,
  CANONICAL_9_TOML_PROFILES,
  computeMultiSignatureImposition,
  FIELD_PDFS_REGISTRY,
  POCKET_REFUGE_4_SHEETS_SPEC,
  PRECOMPILED_PDF_LANGS,
  resolveCanonicalBlockCode,
  resolveCanonicalBlockForPassage,
  resolvePrecompiledDiskLang,
  VERIFIED_TEXT_BIBLE_LANGS,
} from "./dosis_profiles_schema.js";
import {
  evaluateOpticalSauvolaPhotocopyOracle,
  rasterizeTrueTypeGlyphsFromSfntBytes,
  resolveOracleSpecimenDefaults,
} from "./sauvola_canvas_oracle.js";
const CANONICAL_66_USFM = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG",
  "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];
const USFM_BOOK_ALIAS_MAP = {
  EZE: "EZK",
  JOE: "JOL",
  NAH: "NAM",
  PHI: "PHP",
  SOL: "SNG",
};

export {
  buildRelativePdfAssetUrl, CANONICAL_12_BRANCH_PROFILES, CANONICAL_14_PLUS_2_EDITIONS_CATALOG, CANONICAL_14_PRINT_PROFILES, CANONICAL_16_TYPOLOGY_PROFILES, CANONICAL_80_BLOCKS_CATALOG, CANONICAL_9_TOML_PROFILES, computeFoliationLayout, computeKindlePrintBudget, computeMultiSignatureImposition, FIELD_PDFS_REGISTRY, hydrateEditorialProfiles, POCKET_REFUGE_4_SHEETS_SPEC, PRECOMPILED_PDF_LANGS, renderBranchAndTypologyInspectorHtml, renderImpositionAndLayoutPreviewHtml, renderMultiSignatureAndPocketRefugeHtml, resolveCanonicalBlockCode, resolveCanonicalBlockForPassage, resolveEditionGeometrySpec, resolvePrecompiledDiskLang, resolvePrintEditionPdfAssetUrl, VERIFIED_TEXT_BIBLE_LANGS
};

// @req[BIB-V2-19]
export {
  buildCssPagedMediaPrintHtml,
  dispatchTandaWorkerJob,
  getCachedFederationReachability,
  planBimodalClientPrint,
  probeFederationShardReachabilityOnce,
  resolveFederatedAssetUrl,
  typesetTandaPdfBytes
};

const prefixCache = new WeakMap();

function prefixTable(catalogOrVerseCounts) {
  if (!catalogOrVerseCounts || typeof catalogOrVerseCounts !== "object") {
    return { table: new Map(), total: 0, bookOrder: [] };
  }
  if (prefixCache.has(catalogOrVerseCounts)) return prefixCache.get(catalogOrVerseCounts);
  const verseCounts = catalogOrVerseCounts.verse_counts || catalogOrVerseCounts;
  let bookOrder;
  if (Array.isArray(catalogOrVerseCounts.book_order) && catalogOrVerseCounts.book_order.length > 0) {
    bookOrder = catalogOrVerseCounts.book_order;
  } else {
    const canonical66 = CANONICAL_66_USFM;
    const presentCanonical = canonical66.filter((b) =>
      Object.prototype.hasOwnProperty.call(verseCounts, b),
    );
    const extraKeys = Object.keys(verseCounts).filter((k) => !presentCanonical.includes(k));
    bookOrder = [...presentCanonical, ...extraKeys];
  }
  const table = new Map();
  let running = 0;
  for (const book of bookOrder) {
    const starts = [];
    for (const count of verseCounts[book] || []) {
      starts.push(running);
      running += count;
    }
    starts.push(running);
    table.set(book, starts);
  }
  const value = { table, total: running, bookOrder };
  prefixCache.set(catalogOrVerseCounts, value);
  return value;
}

/** Ordinal canónico 1-based de (libro, capítulo, versículo), o `null` si no existe. */
export function ordinalOf(book, chapter, verse, catalog) {
  const starts = prefixTable(catalog).table.get(book);
  if (!starts) return null;
  const c = Number(chapter);
  const v = Number(verse);
  if (!Number.isInteger(c) || !Number.isInteger(v) || c < 1 || v < 1 || c >= starts.length) return null;
  const ordinal = starts[c - 1] + v;
  return ordinal > starts[c] ? null : ordinal;
}

/** Referencia (libro, capítulo, versículo) de un ordinal canónico. */
export function refOfOrdinal(ordinal, catalog) {
  const { table, total, bookOrder } = prefixTable(catalog);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > total) return null;
  for (const book of bookOrder) {
    const starts = table.get(book);
    if (ordinal > starts[starts.length - 1]) continue;
    for (let c = 1; c < starts.length; c++) {
      if (ordinal <= starts[c]) return { book, chapter: c, verse: ordinal - starts[c - 1] };
    }
  }
  return null;
}

function lastIndexAtMost(sorted, value) {
  let lo = 0;
  let hi = sorted.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * Página que muestra el ordinal: bloque cuyo primer ordinal es `<=` al pedido (el último que lo
 * cumple) y, dentro del bloque, la última página cuyo primer ordinal visible es `<=`.
 */
export function locateVersePage(pagesIndex, ordinal) {
  if (!pagesIndex || !Array.isArray(pagesIndex.blocks)) return null;
  const blocks = pagesIndex.blocks;
  const blockFirsts = blocks.map((b) => b.first_ordinal_per_page[0]);
  const bi = lastIndexAtMost(blockFirsts, ordinal);
  if (bi < 0) return null;
  const block = blocks[bi];
  const pi = lastIndexAtMost(block.first_ordinal_per_page, ordinal);
  if (pi < 0) return null;
  const pageStartOrd = block.first_ordinal_per_page[pi] ?? ordinal;
  const pageStartRef = pagesIndex.catalog ? refOfOrdinal(pageStartOrd, pagesIndex.catalog) : null;
  return {
    blockIndex: bi,
    block,
    blockId: block.id,
    pageInBlock: pi + 1,
    pageCountInBlock: block.page_count,
    globalPage: block.page_start + pi,
    pageStartRef,
  };
}

/**
 * Páginas (1-based dentro del bloque) para `sheets` hojas físicas alrededor de `pageInBlock`.
 */
export function planDose1(arg1, arg2, arg3, arg4) {
  const opts =
    arg1 && typeof arg1 === "object"
      ? arg1
      : { pageInBlock: arg1, sheets: arg2 ?? 1, duplex: arg3 ?? true, pageCount: arg4 ?? 12 };
  const { pageInBlock, pageCount, sheets = 1, duplex = true } = opts;
  const k = Math.max(1, Math.min(3, Number(sheets) || 1));
  const perSheet = duplex ? 2 : 1;
  const totalSheets = Math.ceil(pageCount / perSheet);
  const verseSheet = Math.floor((pageInBlock - 1) / perSheet);
  const wanted = Math.min(k, totalSheets);
  let start = verseSheet - Math.floor((wanted - 1) / 2);
  start = Math.max(0, Math.min(start, totalSheets - wanted));
  const pages = [];
  for (let p = start * perSheet + 1; p <= Math.min((start + wanted) * perSheet, pageCount); p++) pages.push(p);
  return { pages, sheets: wanted, sheetCount: wanted, duplex };
}

/** Normaliza slugs de edición legados (ej. `"02_2col_pastoral"`) hacia `"2col-a4"` o `"2col-letter"`. */
export function normalizeEditionSlug(edition, fallbackPaper = "a4") {
  const raw = String(edition || "").trim().toLowerCase();
  if (raw === "2col-letter" || raw === "1col-letter" || raw === "3col-letter") return raw;
  if (raw === "2col-a4" || raw === "1col-a4" || raw === "3col-a4") return raw;
  if (raw.includes("letter")) return "2col-letter";
  if (raw.includes("a4")) return "2col-a4";
  return fallbackPaper === "letter" ? "2col-letter" : "2col-a4";
}

/** Dosis 2: el bloque completo que contiene el versículo (síntesis soberana en `tanda_print_worker.js`). */
export function planDose2(locatedOrBlockId, lang = "es", edition = "2col-a4") {
  if (typeof locatedOrBlockId === "string") {
    const cleanLang = String(lang || "es").trim().toLowerCase() || "es";
    const precompiledLang = resolvePrecompiledDiskLang(cleanLang);
    const defaultPaper = precompiledLang === "es" ? "letter" : "a4";
    const editionSlug = normalizeEditionSlug(edition, defaultPaper);
    const digits = String(locatedOrBlockId).replace(/\D+/g, "");
    const blockNum = Math.max(1, Math.min(80, Number(digits) || 1));
    const padded = String(blockNum).padStart(2, "0");
    const file = `mostrador/tanda_print_worker.js?lang=${encodeURIComponent(cleanLang)}&edition=${encodeURIComponent(editionSlug)}&block=B${padded}`;
    return {
      blockId: `BLK-0${padded}`,
      blockNumber: blockNum,
      lang: cleanLang,
      hasPrecompiledPdf: false,
      availabilityMode: "bimodal_client_print",
      edition: editionSlug,
      editionSlug,
      file,
      url: file,
    };
  }
  const block = locatedOrBlockId.block || locatedOrBlockId;
  const relFile = buildRelativePdfAssetUrl(block.file);
  return {
    file: relFile,
    url: relFile,
    blockNumber: block.number,
    blockId: block.id,
    pageCount: block.page_count,
    bytes: block.bytes,
  };
}

export function encodePdfBytesToDataUri(bytes) {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.byteLength, i + chunk)));
  }
  const b64 =
    typeof globalThis.btoa === "function"
      ? globalThis.btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${b64}`;
}

/**
 * Determina si el perfil geométrico seleccionado (`1col`, `3col` o letra grande `>= 12pt`) requiere
 * síntesis viva real en `tanda_print_worker.js` en lugar de servir el PDF estático precompilado `2col` (`DEB-V2C-11`).
 */
export function requiresLiveGeometrySynthesis({
  columns = 2,
  fontPt = 9.5,
} = {}) {
  const cols = Number(columns) || 2;
  const pt = Number(fontPt) || 9.5;
  return cols !== 2 || pt >= 12.0;
}

/**
 * Construye determinísticamente el índice de páginas de los `80` bloques canónicos sobre los `31,102` versículos
 * sin depender del directorio legado retirado `web/data/pages/` (`SLICE-V2C-07` / `DEB-V2C-12`).
 */
export function buildCanonical80BlocksPagesIndex(catalog, lang = "es", edition = "2col-letter") {
  const cleanLang = String(lang || "es").trim().toLowerCase() || "es";
  const precompiledLang = resolvePrecompiledDiskLang(cleanLang) || "es";
  const editionSlug = normalizeEditionSlug(edition, precompiledLang === "es" ? "letter" : "a4");
  const { total, bookOrder } = prefixTable(catalog);
  const totalVerses = total || 31102;
  const verseCounts = catalog?.verse_counts || catalog || {};
  let pageStart = 1;

  const blocks = CANONICAL_80_BLOCKS_CATALOG.map((blk, idx) => {
    const blockNum = idx + 1;
    const padded = String(blockNum).padStart(2, "0");
    const startOrd =
      ordinalOf(blk.startBook, blk.startChapter, 1, catalog) ||
      Math.floor((idx * totalVerses) / 80) + 1;
    const endBookChapters = verseCounts[blk.endBook] || [];
    const endChapIdx = Math.max(0, Math.min(endBookChapters.length - 1, (Number(blk.endChapter) || 1) - 1));
    const endVerseCount = endBookChapters[endChapIdx] || 1;
    const endOrd =
      ordinalOf(blk.endBook || bookOrder?.[bookOrder.length - 1] || "REV", blk.endChapter || 1, endVerseCount, catalog) ||
      Math.min(totalVerses, Math.floor(((idx + 1) * totalVerses) / 80));
    const pageCount = Math.max(4, Number(blk.pagesCount) || 16);
    const span = Math.max(1, endOrd - startOrd + 1);
    const firstOrdinalPerPage = [];
    for (let p = 0; p < pageCount; p += 1) {
      const ord = Math.min(endOrd, startOrd + Math.floor((p * span) / pageCount));
      firstOrdinalPerPage.push(ord);
    }
    const entry = {
      id: blk.blockId || `BLK-0${padded}`,
      number: blockNum,
      file: `mostrador/tanda_print_worker.js?lang=${encodeURIComponent(cleanLang)}&edition=${encodeURIComponent(editionSlug)}&block=B${padded}`,
      page_start: pageStart,
      page_count: pageCount,
      first_ordinal_per_page: firstOrdinalPerPage,
    };
    pageStart += pageCount;
    return entry;
  });

  if (blocks.length > 0) {
    blocks[0].first_ordinal_per_page[0] = 1;
  }
  for (let i = 1; i < blocks.length; i += 1) {
    if (blocks[i].first_ordinal_per_page[0] <= blocks[i - 1].first_ordinal_per_page[0]) {
      blocks[i].first_ordinal_per_page[0] = blocks[i - 1].first_ordinal_per_page[0] + 1;
    }
  }

  return {
    lang: precompiledLang,
    edition: editionSlug,
    total_pages: pageStart - 1,
    catalog,
    blocks,
  };
}

/**
 * Agrupa biyectivamente los `80` bloques canónicos (`BLK-001..BLK-080`, `5` bloques por Macro-Tanda = `16 × 5 = 80`)
 * en las **16 Macro-Tandas Canónicas** cosibles ($M \le 8$ hojas por cuadernillo `4N`, `32` págs/cuadernillo, `< 14 MiB` RAM Worker).
 */
function buildCanonical16MacroTandasCatalog() {
  const macroTandas = [];
  for (let m = 0; m < 16; m += 1) {
    const macroNumber = m + 1;
    const padded = String(macroNumber).padStart(2, "0");
    const slice5 = CANONICAL_80_BLOCKS_CATALOG.slice(m * 5, (m + 1) * 5);
    const firstBlk = slice5[0];
    const lastBlk = slice5[slice5.length - 1];
    const totalLogicalPages = slice5.reduce((acc, b) => acc + (Number(b.pagesCount) || 16), 0);
    const imp = computeMultiSignatureImposition({
      totalPages: totalLogicalPages,
      maxSheetsPerSignature: 8,
      paperThicknessMm: 0.09,
      paperBulkFactor: 1.15,
      dir: "ltr",
    });
    const booksSet = new Set();
    const bookOrder66 = CANONICAL_66_USFM;
    for (const blk of slice5) {
      const rawStart = String(blk.startBook || "").toUpperCase();
      const rawEnd = String(blk.endBook || rawStart).toUpperCase();
      const sBook = USFM_BOOK_ALIAS_MAP[rawStart] || rawStart;
      const eBook = USFM_BOOK_ALIAS_MAP[rawEnd] || rawEnd;
      const sIdx = bookOrder66.indexOf(sBook);
      const eIdx = bookOrder66.indexOf(eBook);
      if (sIdx >= 0 && eIdx >= sIdx) {
        for (let k = sIdx; k <= eIdx; k += 1) {
          booksSet.add(bookOrder66[k]);
        }
      } else {
        if (sBook) booksSet.add(sBook);
        if (eBook) booksSet.add(eBook);
      }
    }
    const rangeLabel = `${firstBlk.startBook} ${firstBlk.startChapter} – ${lastBlk.endBook} ${lastBlk.endChapter}`;
    macroTandas.push({
      macroTandaId: `MT-${padded}`,
      macroTandaCode: `MT${padded}`,
      macroTandaNumber: macroNumber,
      testament: macroNumber <= 12 ? "AT" : "NT",
      startBlockNumber: firstBlk.blockNumber,
      endBlockNumber: lastBlk.blockNumber,
      blockIds: slice5.map((b) => b.blockId),
      blockCodes: slice5.map((b) => b.shortCode),
      booksIncluded: [...booksSet],
      startBook: firstBlk.startBook,
      startChapter: firstBlk.startChapter,
      endBook: lastBlk.endBook,
      endChapter: lastBlk.endChapter,
      rangeLabel,
      logicalPagesCount: Number(imp.totalPages ?? imp.paddedTotalPages) || 32,
      signatureCount: imp.signatureCount,
      maxSheetsPerSignature: 8,
      spreads4nCount: (Number(imp.totalPages ?? imp.paddedTotalPages) || 32) / 2,
      maxCreepMm: imp.maxCreepMm,
      creepWithinBound: imp.creepWithinBound,
      workerRamSafeUnder14Mb: true,
    });
  }
  return macroTandas;
}

export const CANONICAL_16_MACRO_TANDAS = buildCanonical16MacroTandasCatalog();

export function resolveMacroTandaForBlock(blockNumberOrCode = 1) {
  const num =
    typeof blockNumberOrCode === "string"
      ? Math.max(1, Math.min(80, Number(blockNumberOrCode.replace(/\D+/g, "")) || 1))
      : Math.max(1, Math.min(80, Number(blockNumberOrCode) || 1));
  const macroIdx = Math.min(15, Math.floor((num - 1) / 5));
  return CANONICAL_16_MACRO_TANDAS[macroIdx] || CANONICAL_16_MACRO_TANDAS[0];
}

export function planSequential16MacroTandasGeneration({
  lang = "es",
  columns = 2,
  fontPt = 9.5,
  paper = "a4",
  dir = "ltr",
} = {}) {
  const cleanLang = String(lang || "es").trim().toLowerCase() || "es";
  return CANONICAL_16_MACRO_TANDAS.map((mt) => ({
    macroTandaId: mt.macroTandaId,
    macroTandaNumber: mt.macroTandaNumber,
    blockIds: mt.blockIds,
    booksIncluded: mt.booksIncluded,
    rangeLabel: mt.rangeLabel,
    columns: Math.max(1, Math.min(3, Number(columns) || 2)),
    fontPt: Number(fontPt) || 9.5,
    paper: String(paper || "a4").toLowerCase(),
    dir: dir === "rtl" ? "rtl" : "ltr",
    booklet4n: true,
    maxSheetsPerSignature: 8,
    maxCreepMm: mt.maxCreepMm,
    spreads4nCount: mt.spreads4nCount,
    downloadFilename: `ekovoz_${cleanLang}_${mt.macroTandaId.toLowerCase()}_${Number(columns) || 2}col.pdf`,
  }));
}

export function renderCanonical16MacroTandasSelectorHtml({
  activeMacroTandaNumber = 1,
  lang = "es",
  columns = 2,
  fontPt = 9.5,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const idx = Math.max(1, Math.min(16, Number(activeMacroTandaNumber) || 1)) - 1;
  const activeMt = CANONICAL_16_MACRO_TANDAS[idx] || CANONICAL_16_MACRO_TANDAS[0];
  const optionsHtml = CANONICAL_16_MACRO_TANDAS.map((mt) => {
    const sel = mt.macroTandaNumber === activeMt.macroTandaNumber ? " selected" : "";
    return (
      `<option value="${mt.macroTandaNumber}"${sel}>` +
      `${mt.macroTandaId} (${mt.blockCodes[0]}–${mt.blockCodes[4]}) · ${mt.rangeLabel} · M≤${mt.maxSheetsPerSignature}h · creep ${mt.maxCreepMm}mm` +
      `</option>`
    );
  }).join("");

  return (
    `<div id="macroTandas16Dose3Panel" class="macro-tandas-16-card" data-macro-tandas-count="16" data-canonical-blocks-covered="80" data-active-macro-tanda="${activeMt.macroTandaId}" data-max-sheets-signature="${activeMt.maxSheetsPerSignature}" data-creep-mm="${activeMt.maxCreepMm}" data-spreads-4n="${activeMt.spreads4nCount}" style="margin-top:0.55rem;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.35rem;">` +
    `<strong>🏛️ ${isEn ? "Dose 3 · 16 Canonical Macro-Tandas (80 Blocks, M≤8 Sewable Signatures)" : "Dosis 3 · 16 Macro-Tandas Canónicas (80 Bloques, Cuadernillos M≤8 Hojas)"}</strong>` +
    `<span class="uls-badge" data-macro-tanda-creep="${activeMt.maxCreepMm}">4N: ${activeMt.spreads4nCount} ${isEn ? "spreads" : "pliegos"} · creep ${activeMt.maxCreepMm} mm · &lt;14 MiB Worker</span>` +
    `</div>` +
    `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.45rem;">` +
    `<label for="macroTanda16Select" style="font-weight:600;">${isEn ? "Macro-Tanda (1–16):" : "Macro-Tanda (1–16):"}</label>` +
    `<select id="macroTanda16Select" data-action="select-macro-tanda-16" aria-label="${isEn ? "Select Canonical Macro-Tanda (1 to 16)" : "Seleccionar Macro-Tanda Canónica (1 a 16)"}" style="min-height:48px;flex:1;min-width:220px;">${optionsHtml}</select>` +
    `<button type="button" id="btnGenerateAll16MacroTandas" class="uls-chip" data-action="generate-sequential-16-macro-tandas" data-lang="${lang}" data-cols="${Number(columns) || 2}" data-font-pt="${Number(fontPt) || 9.5}" style="min-height:48px;min-width:48px;padding:8px 12px;cursor:pointer;font-weight:600;">⚡ ${isEn ? "Synthesize All 16 Tandas (Worker)" : "Generar las 16 Tandas en Secuencia (Worker)"}</button>` +
    `</div>` +
    `</div>`
  );
}

export function syncDose2AndDose3LinksForActiveLang({
  state = {},
  targetDoc = null,
  getEl = null,
} = {}) {
  const resolveEl =
    typeof getEl === "function"
      ? (id) => getEl(id, targetDoc)
      : (id) => targetDoc?.getElementById?.(id) || null;
  const rawLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
  const lang = rawLang;
  const precompiledLang = lang === "es-1909" ? null : resolvePrecompiledDiskLang(lang);
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const book = String(state.book || "GEN").toUpperCase();
  const chapter = Number(state.chapter) || 1;
  const verse = Number(state.verse) || 1;
  const activeCols = Number(state.columns) || 2;
  const activeFontPt = Number(state.fontSizePt) || 9.5;
  const needsLiveGeom =
    (state.columns !== undefined || state.fontSizePt !== undefined) &&
    requiresLiveGeometrySynthesis({ columns: activeCols, fontPt: activeFontPt });
  const edition = normalizeEditionSlug(
    state.edition || "2col-a4",
    precompiledLang === "es" ? "letter" : "a4",
  );
  const resolvedBlock = resolveCanonicalBlockCode(book, chapter, verse);
  const blockNum = Number(state.activeBlockNumber) || resolvedBlock.blockNumber || 1;
  const padded = String(Math.max(1, Math.min(BIBLE_CONSTANTS.CANONICAL_BLOCKS_COUNT, blockNum))).padStart(2, "0");
  const blockCode = `B${padded}`;
  const activeMacroTanda =
    CANONICAL_16_MACRO_TANDAS[
    Math.max(1, Math.min(16, Number(state.activeMacroTandaNumber) || resolveMacroTandaForBlock(blockNum).macroTandaNumber)) - 1
    ] || resolveMacroTandaForBlock(blockNum);

  const linkDose2 = resolveEl("linkDose2BlockPdf");
  const linkDose3 = resolveEl("linkDose3FullBiblePdf");
  const effectiveFedReachable =
    state.federationReachable !== undefined
      ? state.federationReachable
      : getCachedFederationReachability();

  if (
    effectiveFedReachable === null &&
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.fetch === "function" &&
    !state._federationAutoProbeScheduled
  ) {
    state._federationAutoProbeScheduled = true;
    probeFederationShardReachabilityOnce({ doc: targetDoc })
      .then((reachable) => {
        state.federationReachable = reachable;
        if (reachable === false) {
          syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
        }
      })
      .catch(() => { });
  }

  const chapterVersesMap = state.lastNavResult?.chapter?.verses || null;
  const dose2Verses = Array.isArray(state.fullBookVerses) && state.fullBookVerses.length > 0
    ? state.fullBookVerses
    : chapterVersesMap;
  const dose3Verses = Array.isArray(state.bibleTandaVerses) && state.bibleTandaVerses.length > 0
    ? state.bibleTandaVerses
    : dose2Verses;

  const bimodalDose2 = planBimodalClientPrint({
    dose: 2,
    lang,
    book,
    chapter,
    verse,
    verses: Array.isArray(dose2Verses) ? dose2Verses : null,
    versesMap: !Array.isArray(dose2Verses) ? dose2Verses : null,
    columns: activeCols,
    fontPt: activeFontPt,
    paper: state.paperFormat || "a4",
  });
  const bimodalDose3 = planBimodalClientPrint({
    dose: 3,
    lang,
    book,
    chapter,
    verse,
    verses: Array.isArray(dose3Verses) ? dose3Verses : null,
    versesMap: !Array.isArray(dose3Verses) ? dose3Verses : null,
    columns: activeCols,
    fontPt: activeFontPt,
    paper: state.paperFormat || "a4",
  });

  const dose2Bytes = state.dose2WorkerPdfBytes instanceof Uint8Array && state.dose2WorkerPdfBytes.byteLength > 0
    ? state.dose2WorkerPdfBytes
    : bimodalDose2.pdfBytes;
  const dose3Bytes = state.dose3WorkerPdfBytes instanceof Uint8Array && state.dose3WorkerPdfBytes.byteLength > 0
    ? state.dose3WorkerPdfBytes
    : bimodalDose3.pdfBytes;

  const dose2Href =
    state.dose2ObjectUrl ||
    (dose2Bytes instanceof Uint8Array && dose2Bytes.byteLength > 0 ? encodePdfBytesToDataUri(dose2Bytes) : "#");
  const dose3Href =
    state.dose3ObjectUrl ||
    (dose3Bytes instanceof Uint8Array && dose3Bytes.byteLength > 0 ? encodePdfBytesToDataUri(dose3Bytes) : "#");
  const dose2Planned = planDose2(blockCode, lang, edition);

  if (linkDose2) {
    linkDose2.href = dose2Href;
    linkDose2.setAttribute?.("href", dose2Href);
    linkDose2.setAttribute?.("download", `ekovoz-${lang}-${book.toLowerCase()}-${activeCols}col-${activeFontPt}pt.pdf`);
    linkDose2.setAttribute?.("data-dose-mode", dose2Href === "#" ? "wasm-on-demand" : "bimodal-tanda");
    linkDose2.setAttribute?.("data-tanda-scope", Array.isArray(state.fullBookVerses) ? "full-book" : "chapter-seed");
    linkDose2.setAttribute?.("data-worker-url", bimodalDose2.workerUrl || dose2Planned.url);
    linkDose2.setAttribute?.("data-block-code", blockCode);
    linkDose2.setAttribute?.("data-columns", String(activeCols));
    linkDose2.setAttribute?.("data-font-pt", String(activeFontPt));
    linkDose2.setAttribute?.("data-lang", lang);
    linkDose2.textContent = isEn
      ? `📚 2. Print/Download Book Tanda PDF (${lang.toUpperCase()} · ${book} · ${activeCols}col)`
      : `📚 2. Imprimir/Descargar Libro en Tanda PDF (${lang.toUpperCase()} · ${book} · ${activeCols}col)`;
  }
  if (linkDose3) {
    const isFullBible16 = Boolean(state._dose3Streamed16Of16);
    const dose3Scope = isFullBible16
      ? "full-bible-16-tandas"
      : Array.isArray(state.bibleTandaVerses)
        ? "bible-tanda-50p"
        : "book-seed";
    const dose3Download = isFullBible16
      ? `ekovoz-${lang}-biblia-completa-${activeCols}col.pdf`
      : `ekovoz-${lang}-${activeMacroTanda.macroTandaId.toLowerCase()}-${activeCols}col.pdf`;
    linkDose3.href = dose3Href;
    linkDose3.setAttribute?.("href", dose3Href);
    linkDose3.setAttribute?.("download", dose3Download);
    linkDose3.setAttribute?.("data-dose-mode", dose3Href === "#" ? "wasm-on-demand" : "bimodal-tanda");
    linkDose3.setAttribute?.("data-tanda-scope", dose3Scope);
    linkDose3.setAttribute?.("data-macro-tanda", isFullBible16 ? "ALL-16" : activeMacroTanda.macroTandaId);
    linkDose3.setAttribute?.("data-worker-url", bimodalDose3.workerUrl);
    linkDose3.setAttribute?.("data-columns", String(activeCols));
    linkDose3.setAttribute?.("data-font-pt", String(activeFontPt));
    linkDose3.setAttribute?.("data-lang", lang);
    linkDose3.textContent = isFullBible16
      ? isEn
        ? `🏛️ 3. Download Full Bible PDF (16/16 Macro-Tandas · ${lang.toUpperCase()})`
        : `🏛️ 3. Descargar Biblia Completa PDF (16/16 Macro-Tandas · ${lang.toUpperCase()})`
      : isEn
        ? `🏛️ 3. Download Macro-Tanda ${activeMacroTanda.macroTandaId} (${activeMacroTanda.blockCodes[0]}–${activeMacroTanda.blockCodes[4]} · ${lang.toUpperCase()})`
        : `🏛️ 3. Descargar Macro-Tanda ${activeMacroTanda.macroTandaId} (${activeMacroTanda.blockCodes[0]}–${activeMacroTanda.blockCodes[4]} · ${lang.toUpperCase()})`;
  }
  return {
    mode: "bimodal-tanda",
    lang,
    blockCode,
    macroTandaId: activeMacroTanda.macroTandaId,
    workerUrl: bimodalDose2.workerUrl,
    dose2Href,
    dose3Href,
  };
}

/** Devuelve las ediciones tipográficas canónicas + 2 PDFs de campo enriquecidas con `downloads_manifest.json` y perfiles TOML. */
export function listCatalogEditionsForLang(manifestOrLang, maybeLang = "es", options = {}) {
  const isFirstArgLang = typeof manifestOrLang === "string";
  const resolvedLang = String(isFirstArgLang ? manifestOrLang : maybeLang || "es").trim().toLowerCase() || "es";
  const resolvedOptions =
    isFirstArgLang && typeof maybeLang === "object" && maybeLang !== null
      ? maybeLang
      : isFirstArgLang && typeof maybeLang === "string" && arguments.length >= 2
        ? { ...options, uiLocale: options?.uiLocale || maybeLang }
        : options || {};
  const uiLocale = String(resolvedOptions?.uiLocale || resolvedOptions?.locale || "es").trim().toLowerCase();
  const isEn = uiLocale.startsWith("en");
  const list = isFirstArgLang
    ? []
    : Array.isArray(manifestOrLang)
      ? manifestOrLang
      : (manifestOrLang && manifestOrLang.entries) || [];

  const precompiledLang = resolvePrecompiledDiskLang(resolvedLang);
  const defaultPaper = precompiledLang === "es" ? "letter" : "a4";

  const fullMatch = precompiledLang
    ? list.find((e) => e && e.lang === precompiledLang && (e.kind === "full" || e.kind === "full_bible") && e.path) ||
    list.find((e) => e && e.lang === precompiledLang && e.path) ||
    null
    : null;

  const catalogSource =
    Array.isArray(resolvedOptions?.editorialProfiles?.canonical_9_plus_2_editions) &&
      resolvedOptions.editorialProfiles.canonical_9_plus_2_editions.length >= 16
      ? resolvedOptions.editorialProfiles.canonical_9_plus_2_editions
      : Array.isArray(manifestOrLang?.canonical_9_plus_2_editions) &&
        manifestOrLang.canonical_9_plus_2_editions.length >= 16
        ? manifestOrLang.canonical_9_plus_2_editions
        : CANONICAL_14_PLUS_2_EDITIONS_CATALOG;

  const baseCatalog = catalogSource;

  const tomlLookup = new Map(
    (CANONICAL_14_PRINT_PROFILES || []).map((p, idx) => [p.id, { ...p, index: idx }])
  );

  return baseCatalog.map((item, idx) => {
    const tomlMeta =
      tomlLookup.get(item.id) ||
      (CANONICAL_14_PRINT_PROFILES && CANONICAL_14_PRINT_PROFILES[idx]) ||
      {};
    const localizedLabel = isEn && item.label_en ? item.label_en : item.label;
    if (item.kind === "field_pdf") {
      const regEntry = FIELD_PDFS_REGISTRY[item.editionSlug] || {};
      const editionMode =
        item.editionSlug === "refugio_4_hojas"
          ? 1
          : item.editionSlug === "checklist_80_bloques"
            ? 0
            : 2;
      const isStaticEs = resolvedLang === "es";
      const cleanFieldUrl = isStaticEs
        ? buildRelativePdfAssetUrl(
          regEntry.path || item.url || "obras/biblia/campo/refugio_4_hojas.pdf",
        )
        : `mostrador/tanda_print_worker.js?lang=${encodeURIComponent(resolvedLang)}&edition=${encodeURIComponent(item.id)}&editionMode=${editionMode}`;
      const fieldBytes = Number(regEntry.bytes ?? item.bytes ?? 0);
      return {
        ...item,
        label: localizedLabel,
        profileId: item.id,
        profileUrl: cleanFieldUrl,
        lang: resolvedLang,
        editionMode,
        hasPrecompiledPdf: isStaticEs,
        requiresLiveWorkerSynthesis: true,
        availabilityMode: "bimodal_client_print",
        path: cleanFieldUrl,
        url: cleanFieldUrl,
        bytes: fieldBytes,
      };
    }
    const resolvedCols = tomlMeta.columns || item.columns || 2;
    const resolvedFontPt = tomlMeta.fontPt || item.fontPt || 9.5;
    const resolvedPaper = tomlMeta.paperSize || (defaultPaper === "letter" ? "Letter" : "A4");
    const impositionMode = tomlMeta.impositionMode || "single_sheet_20mm";
    const fallbackUrl = resolvePrintEditionPdfAssetUrl(
      item.id,
      resolvedLang,
      resolvedPaper,
      "B01",
      null,
    );
    const budgetPaper = resolvedPaper.includes("B70")
      ? "B70"
      : resolvedPaper.includes("Letter")
        ? "Letter"
        : resolvedPaper.includes("A3")
          ? "A3"
          : resolvedPaper.includes("Folio")
            ? "Folio"
            : "A4";
    const budget = computeKindlePrintBudget({
      fontPt: resolvedFontPt,
      columns: resolvedCols,
      paper: budgetPaper,
    });
    const requiresLiveWorkerSynthesis = true;
    const hasPrecompiledPdf = false;
    const availabilityMode = "bimodal_client_print";
    const resolvedProfileUrl = `mostrador/tanda_print_worker.js?lang=${encodeURIComponent(resolvedLang)}&edition=${encodeURIComponent(item.id)}&cols=${resolvedCols}&font=${resolvedFontPt}pt&paper=${encodeURIComponent(resolvedPaper)}&mode=${encodeURIComponent(impositionMode)}`;
    return {
      ...item,
      label: localizedLabel,
      profileId: item.id,
      profileUrl: resolvedProfileUrl,
      tomlPath: tomlMeta.tomlPath || `obras/biblia/profiles/${item.id}.toml`,
      columns: resolvedCols,
      fontPt: resolvedFontPt,
      leadingRatio: tomlMeta.leadingRatio || 1.35,
      gutterMm: tomlMeta.gutterMm || 20.0,
      paperSize: resolvedPaper,
      impositionMode,
      ...(item.id === "11_braille_nemeth_b70"
        ? {
          brfCellsPerLine: 40,
          brfFormat: "iso_17049_braillefit_40col",
          brfAssetPath: `obras/biblia/editions/${resolvedLang}/braille_40col.brf`,
        }
        : {}),
      cpl: budget.cpl,
      estimatedPages: budget.estimatedPages,
      summarySpec: `${resolvedCols} col · ${resolvedFontPt}pt · ${resolvedPaper} (~${budget.estimatedPages} ${isEn ? "pages" : "págs"})`,
      lang: resolvedLang,
      diskLang: precompiledLang || resolvedLang,
      hasPrecompiledPdf,
      requiresLiveWorkerSynthesis,
      supportsLivePdfSynthesis: true,
      availabilityMode,
      path: fallbackUrl,
      url: fallbackUrl,
      bytes: fullMatch?.bytes || 0,
      sha256: fullMatch?.sha256 || "",
    };
  });
}

/** Devuelve las 16 ediciones completas (los 14 perfiles TOML `01..14` + 2 PDFs de campo). */
export function listAll14PrintEditionsForLang(manifestOrLang, maybeLang = "es", options = {}) {
  return listCatalogEditionsForLang(manifestOrLang, maybeLang, { ...options, includeAll14Profiles: true });
}

/** Dosis 3: entrada `full` del manifiesto para el idioma y la edición, si existe. */
export function planDose3(manifest, lang, edition) {
  const list = Array.isArray(manifest) ? manifest : (manifest && manifest.entries) || [];
  return (
    list.find(
      (e) =>
        (e.kind === "full" || e.kind === "full_bible") &&
        e.lang === lang &&
        (!edition || !e.edition || e.edition === edition)
    ) || null
  );
}

const LETTER_TERRITORIES = new Set(["BZ", "CA", "CL", "CO", "CR", "GT", "MX", "NI", "PA", "PH", "PR", "SV", "US", "VE"]);

export function paperForRegion(regionIso2) {
  const clean = String(regionIso2 || "").trim().split(/[-_]/).pop().toUpperCase();
  return LETTER_TERRITORIES.has(clean) ? "letter" : "a4";
}

export function chooseEdition(editions, paper) {
  const list = Array.isArray(editions) ? editions : [];
  return list.find((e) => e.endsWith(`-${paper}`)) || list[0] || null;
}

export function resolveRegionalPrintDefaults(
  regionIso2 = "MX",
  langOrOptions = "es",
  editions = ["2col-a4", "2col-letter", "1col-a4", "1col-letter"],
) {
  const isObj = typeof langOrOptions === "object" && langOrOptions !== null && !Array.isArray(langOrOptions);
  const resolvedLang = String(isObj ? langOrOptions.lang || "es" : langOrOptions || "es").toLowerCase();
  const resolvedEditions = isObj && Array.isArray(langOrOptions.editions) ? langOrOptions.editions : editions;
  const paper = paperForRegion(regionIso2);
  const edition = chooseEdition(resolvedEditions, paper) || `2col-${paper}`;
  return {
    regionIso2: String(regionIso2 || "MX").trim().split(/[-_]/).pop().toUpperCase() || "MX",
    lang: resolvedLang,
    paper,
    paperFormat: paper,
    edition,
    recommendedEdition: { slug: edition, paperFormat: paper },
  };
}

export function effectiveThreatClassWeb(countryIso2 = "MX", langCode = "stp") {
  const c = String(countryIso2 || "").trim().toUpperCase().slice(0, 2);
  const l = String(langCode || "").trim().toLowerCase();
  const classCCountries = new Set([
    "AF", "KP", "SO", "YE", "ER", "LY", "PK", "IR", "SD", "IN", "NG", "SA",
    "MV", "ML", "SY", "DZ", "IQ", "MM", "CN", "VN", "LA", "TM", "UZ", "TJ",
    "QA", "OM", "MR", "BR", "BD", "BT", "MA", "EG", "TR",
  ]);
  const classCLangs = new Set([
    "prs", "pus", "pbu", "pbt", "haz", "uzb", "tuk", "bal", "ko", "som", "ar",
    "arb", "tir", "tig", "urd", "ur", "pnb", "snd", "fas", "fa", "pes", "ckb",
    "kmr", "azb", "glk", "mzn", "hi", "hin", "ben", "bn", "mar", "tel", "tam",
    "guj", "kan", "ori", "pan", "hau", "ful", "fuv", "knc", "div", "bam",
    "taq", "tmh", "kab", "shi", "tzm", "ary", "arz", "mya", "shn", "kac",
    "kar", "zh", "cmn", "ug", "uig", "bo", "bod", "ii", "za", "vi", "vie",
    "lo", "lao", "tgk", "tur", "tr", "nep", "sin", "dzo",
  ]);
  if (classCCountries.has(c) || classCLangs.has(l)) return "CLASS_C_STEALTH";
  const classBCountries = new Set(["KZ", "KG", "AZ", "JO", "TN", "AE", "BH", "KW", "ID", "MY", "LK", "NP"]);
  const classBLangs = new Set(["kaz", "kir", "aze", "ind", "id", "msa", "zsm", "jav", "sun", "min", "ace", "bug"]);
  if (classBCountries.has(c) || classBLangs.has(l)) return "CLASS_B_CAUTIOUS";
  return "CLASS_A_OPEN";
}

export function stealthNeutralFilenameWeb(blockIdx = 1, ext = "pdf") {
  const idx = Math.max(1, Math.min(80, Number(blockIdx) || 1));
  const cleanExt = String(ext || "pdf").replace(/^\./, "").toLowerCase();
  const prefix = cleanExt === "html" ? "notas_estudio" : "apuntes_lectura";
  return `${prefix}_${String(idx).padStart(2, "0")}.${cleanExt}`;
}

export function doseFilename({ dose, lang, book, chapter, verse, blockNumber, edition, threatClass }) {
  if (threatClass === "CLASS_C_STEALTH") return stealthNeutralFilenameWeb(blockNumber || 1, "pdf");
  if (dose === 1) return `ekovoz-${lang}-${book}-${chapter}-${verse}-${edition}.pdf`;
  if (dose === 2) return `ekovoz-${lang}-bloque-${String(blockNumber).padStart(2, "0")}-${edition}.pdf`;
  return `ekovoz-${lang}-biblia-${edition}.pdf`;
}

export function simulateThirdGenPhotocopySauvola({
  strokePt = 0.85,
  k = 0.2,
  R = 128,
  ttfBytes = null,
  lang = "es",
  text = "",
} = {}) {
  const cleanStroke = Number(strokePt) || 0.85;
  const cleanK = Number(k) || 0.2;
  const cleanR = Number(R) || 128;
  const minStrokePt = 0.75;
  const specimenText =
    String(text || "").trim() || resolveOracleSpecimenDefaults(lang, "").sampleText || "En el principio";
  const sfntProbe =
    ttfBytes instanceof Uint8Array && ttfBytes.byteLength >= 64
      ? rasterizeTrueTypeGlyphsFromSfntBytes(ttfBytes, specimenText, { dpi: 300, lang })
      : null;
  const oracle = evaluateOpticalSauvolaPhotocopyOracle({
    genIndex: 3,
    sauvolaK: cleanK,
    dpi: 300,
    strokePt: cleanStroke,
    R: cleanR,
    lang,
    text: specimenText,
    ttfBytes: sfntProbe ? ttfBytes : null,
  });
  const survives3rdGen =
    cleanStroke >= minStrokePt && oracle.eulerCharacteristicDelta === 0 && oracle.wcagPassAaa;
  const eulerDelta = survives3rdGen ? 0 : -Math.max(1, oracle.eulerCharacteristicDelta);

  return {
    algorithm: "Sauvola-Integral-2000",
    lang,
    text: specimenText,
    k: cleanK,
    R: cleanR,
    threshold: oracle.meanThreshold,
    strokePt: cleanStroke,
    minStrokePt,
    eulerCharacteristicDelta: eulerDelta,
    survives3rdGen,
    contrastRatio: oracle.contrastRatio,
    rasterSource: oracle.rasterSource,
    badgeText: `Sauvola T=${oracle.meanThreshold} (k=${cleanK.toFixed(2)}, R=${cleanR}) · Trazo ${cleanStroke.toFixed(2)} pt ≥ 0.75 pt · Δχ=${eulerDelta}`,
  };
}

export function simulateFifthGenPhotocopySauvolaBilateral({
  strokePt = 0.85,
  k = 0.2,
  R = 128,
} = {}) {
  const cleanStroke = Number(strokePt) || 0.85;
  const cleanK = Number(k) || 0.2;
  const cleanR = Number(R) || 128;
  const specs = [
    { generation: 0, label: "Original 300 DPI", kDelta: 0.0 },
    { generation: 1, label: "Fotocopia Gen 1", kDelta: 0.02 },
    { generation: 2, label: "Fotocopia Gen 2", kDelta: 0.05 },
    { generation: 3, label: "Fotocopia Gen 3", kDelta: 0.08 },
    { generation: 5, label: "Fotocopia Rural Gen 5", kDelta: 0.12 },
  ];
  const stages = specs.map((spec) => {
    const stageK = Number((cleanK + spec.kDelta).toFixed(2));
    const oracle = evaluateOpticalSauvolaPhotocopyOracle({
      genIndex: spec.generation,
      sauvolaK: stageK,
      dpi: 300,
      strokePt: cleanStroke,
      R: cleanR,
    });
    return {
      generation: spec.generation,
      label: spec.label,
      contrastRatio: Number(oracle.contrastRatio.toFixed(1)),
      sauvolaK: oracle.sauvolaK,
      eulerCharacteristicDelta: oracle.eulerCharacteristicDelta,
      passesWcagAaa: oracle.wcagPassAaa,
    };
  });
  const minContrast = stages.reduce((acc, s) => Math.min(acc, s.contrastRatio), Infinity);
  return {
    stages,
    dynamicRangeR: cleanR,
    minContrastRatio: minContrast,
    passesAll5Generations: stages.every((s) => s.passesWcagAaa),
    socialCardDimensions: "1200x630",
  };
}

export function syncPrintDrawerControlsFromEditionProfile(
  profileId = "02_2col_pastoral",
  targetDoc = null,
  catalog = CANONICAL_14_PRINT_PROFILES,
) {
  const list = Array.isArray(catalog) && catalog.length > 0 ? catalog : CANONICAL_14_PRINT_PROFILES;
  const cleanId = String(profileId || "02_2col_pastoral").trim();
  const numPrefix = cleanId.match(/^(\d{2})_/)?.[1] || "";
  const found =
    list.find((p) => p && (p.id === cleanId || p.editionSlug === cleanId)) ||
    CANONICAL_9_TOML_PROFILES.find((p) => p && p.id === cleanId) ||
    CANONICAL_14_PLUS_2_EDITIONS_CATALOG.find((p) => p && p.id === cleanId) ||
    (numPrefix && list.find((p) => p && String(p.id || "").startsWith(`${numPrefix}_`))) ||
    CANONICAL_14_PRINT_PROFILES[1] ||
    CANONICAL_14_PRINT_PROFILES[0];

  const columns = Number(found.columns) || (cleanId.includes("3col") ? 3 : cleanId.includes("1col") ? 1 : 2);
  const fontPt = Number(found.fontPt) || (cleanId.includes("3col") ? 8.0 : 9.5);
  const rawPaper = String(found.paperSize || found.paper_size || "A4");
  const rawPaperLower = rawPaper.toLowerCase();
  const paper = rawPaperLower.includes("a3")
    ? "a3"
    : rawPaperLower.includes("folio") || rawPaperLower.includes("oficio")
      ? "folio"
      : rawPaperLower.includes("b70") || rawPaperLower.includes("braille")
        ? "b70"
        : rawPaperLower.includes("letter") || rawPaperLower.includes("carta")
          ? "letter"
          : "a4";
  const orientation = rawPaperLower.includes("landscape") ? "landscape" : "portrait";
  const rawImpMode = String(
    found.impositionMode ||
    found.imposition_mode ||
    found.parsed?.imposition?.mode ||
    (cleanId.includes("refugio") ||
      cleanId.includes("3col") ||
      cleanId.includes("bolsillo") ||
      cleanId.includes("evangelio")
      ? "saddle_stitch"
      : "single_sheet_20mm"),
  );
  const foliationMode =
    rawImpMode === "saddle_stitch" || rawImpMode === "multi_signature_4n"
      ? "saddle_stitch"
      : "single_sheet_20mm";

  const budgetPaperLabel =
    paper === "a3"
      ? "A3"
      : paper === "folio"
        ? "Folio"
        : paper === "b70"
          ? "B70"
          : paper === "letter"
            ? "Letter"
            : "A4";
  const budget = computeKindlePrintBudget({
    fontPt,
    columns,
    orientation,
    paper: budgetPaperLabel,
  });

  if (targetDoc && typeof targetDoc.getElementById === "function") {
    const fontEl = targetDoc.getElementById("kindleFontSizeSlider");
    if (fontEl) fontEl.value = String(fontPt);
    const colEl = targetDoc.getElementById("kindleColumnSelector");
    if (colEl) colEl.value = String(columns);
    const paperEl = targetDoc.getElementById("kindlePaperFormatSelector");
    if (paperEl) paperEl.value = paper;
    const orientEl = targetDoc.getElementById("kindleOrientationSelector");
    if (orientEl) orientEl.value = orientation;
    const folEl = targetDoc.getElementById("bibleFoliationModeSelect");
    if (folEl) folEl.value = foliationMode;
    const outEl = targetDoc.getElementById("kindleBudgetOutput");
    if (outEl) outEl.textContent = budget.summaryText;
  }

  return {
    profileId: found.id,
    columns,
    fontPt,
    paper,
    orientation,
    foliationMode,
    tomlPath: found.tomlPath || `obras/biblia/profiles/${found.id}.toml`,
    budget,
  };
}
