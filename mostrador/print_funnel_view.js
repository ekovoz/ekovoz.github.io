// ============================================================================
// web/mostrador/print_funnel_view.js — Embudo progresivo único de impresión (D4-HIG2 / SLICE-EKO-HIG2-05)
// Costura LCOM4 extraída de dosis.js para proyectar Alcance -> Formato sin jerga interna.
// ============================================================================

import { BIBLE_CONSTANTS } from "../bible_constants.js";
import { CANONICAL_80_BLOCKS_CATALOG, computeMultiSignatureImposition } from "./dosis_profiles_schema.js";
import { humanizeUiCopy } from "./human_labels.js";

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
    for (const blk of slice5) {
      const rawStart = String(blk.startBook || "").toUpperCase();
      const rawEnd = String(blk.endBook || rawStart).toUpperCase();
      const sBook = USFM_BOOK_ALIAS_MAP[rawStart] || rawStart;
      const eBook = USFM_BOOK_ALIAS_MAP[rawEnd] || rawEnd;
      const sIdx = CANONICAL_66_USFM.indexOf(sBook);
      const eIdx = CANONICAL_66_USFM.indexOf(eBook);
      if (sIdx >= 0 && eIdx >= sIdx) {
        for (let k = sIdx; k <= eIdx; k += 1) booksSet.add(CANONICAL_66_USFM[k]);
      } else {
        if (sBook) booksSet.add(sBook);
        if (eBook) booksSet.add(eBook);
      }
    }
    const rangeLabel = `${firstBlk.startBook} ${firstBlk.startChapter} – ${lastBlk.endBook} ${lastBlk.endChapter}`;
    macroTandas.push(
      Object.freeze({
        macroTandaId: `MT-${padded}`,
        macroTandaCode: `MT${padded}`,
        macroTandaNumber: macroNumber,
        testament: macroNumber <= 12 ? "AT" : "NT",
        startBlockNumber: firstBlk.blockNumber,
        endBlockNumber: lastBlk.blockNumber,
        blockIds: Object.freeze(slice5.map((b) => b.blockId)),
        blockCodes: Object.freeze(slice5.map((b) => b.shortCode)),
        booksIncluded: Object.freeze([...booksSet]),
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
      }),
    );
  }
  return Object.freeze(macroTandas);
}

export const CANONICAL_16_MACRO_TANDAS = buildCanonical16MacroTandasCatalog();

export function resolveMacroTandaForBlock(blockNumberOrCode = 1) {
  const num =
    typeof blockNumberOrCode === "string"
      ? Number(String(blockNumberOrCode).replace(/^BLK-|^B/i, "")) || 1
      : Number(blockNumberOrCode) || 1;
  const clamped = Math.max(1, Math.min(BIBLE_CONSTANTS.CANONICAL_BLOCKS_COUNT, Math.floor(num)));
  const mtIdx = Math.min(15, Math.floor((clamped - 1) / 5));
  return CANONICAL_16_MACRO_TANDAS[mtIdx] || CANONICAL_16_MACRO_TANDAS[0];
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
    macroTandaNumber: mt.macroTandaNumber,
    macroTandaId: mt.macroTandaId,
    lang: cleanLang,
    columns: Number(columns) || 2,
    fontPt: Number(fontPt) || 9.5,
    paper: String(paper || "a4").toLowerCase(),
    dir: dir === "rtl" ? "rtl" : "ltr",
    blockIds: mt.blockIds,
    blockCodes: mt.blockCodes,
    rangeLabel: mt.rangeLabel,
    logicalPagesCount: mt.logicalPagesCount,
    maxSheetsPerSignature: mt.maxSheetsPerSignature,
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
      `${isEn ? "Section" : "Tomo"} ${mt.macroTandaNumber}/16 · ${mt.rangeLabel}` +
      `</option>`
    );
  }).join("");
  const titleText = humanizeUiCopy(
    isEn
      ? "Complete Bible print bundles (16 sewable sections)"
      : "Biblia completa por paquetes imprimibles (16 secciones)",
    uiLocale,
  );
  const selectLabel = isEn ? "Section (1–16):" : "Sección (1–16):";

  return (
    `<div id="macroTandas16Dose3Panel" class="macro-tandas-16-card" data-macro-tandas-count="16" data-canonical-blocks-covered="80" data-active-macro-tanda="${activeMt.macroTandaId}" data-max-sheets-signature="${activeMt.maxSheetsPerSignature}" data-creep-mm="${activeMt.maxCreepMm}" data-spreads-4n="${activeMt.spreads4nCount}">` +
    `<div class="ek-row-between ek-mb-sm">` +
    `<strong>🏛️ ${titleText}</strong>` +
    `</div>` +
    `<div class="ek-row-wrap">` +
    `<label for="macroTanda16Select" class="ek-semibold">${selectLabel}</label>` +
    `<select id="macroTanda16Select" data-action="select-macro-tanda-16" aria-label="${isEn ? "Select printable section (1 to 16)" : "Seleccionar sección imprimible (1 a 16)"}">${optionsHtml}</select>` +
    `<button type="button" id="btnGenerateAll16MacroTandas" class="uls-chip eco-action-btn ek-semibold" data-action="generate-sequential-16-macro-tandas" data-lang="${lang}" data-cols="${Number(columns) || 2}" data-font-pt="${Number(fontPt) || 9.5}">⚡ ${isEn ? "Prepare All 16 PDFs" : "Preparar los 16 PDFs"}</button>` +
    `</div>` +
    `<div class="tech-details ek-mt-xs" data-advanced-audit="true">` +
    `<span class="uls-badge" data-macro-tanda-creep="${activeMt.maxCreepMm}">4N: ${activeMt.spreads4nCount} ${isEn ? "spreads" : "pliegos"} · creep ${activeMt.maxCreepMm} mm · &lt;14 MiB Worker</span>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Formatea textos humanos para enlaces de impresión (D4-HIG2) sin jerga MT-01/2col.
 */
export function formatUnifiedDoseLinksCopy({
  lang = "es",
  book = "GEN",
  activeMacroTanda,
  isFullBible16 = false,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const langLower = String(lang || "es").trim().toLowerCase();
  const langUpper = langLower.toUpperCase();
  const bookUpper = String(book || "GEN").toUpperCase();
  const bookOrd = CANONICAL_66_USFM.indexOf(USFM_BOOK_ALIAS_MAP[bookUpper] || bookUpper);
  const isStpOtDraft = langLower === "stp" && bookOrd >= 0 && bookOrd < 39;
  const bookScopeHint = isStpOtDraft
    ? (isEn ? `${langUpper} · ${bookUpper} (OT draft)` : `${langUpper} · ${bookUpper} (borrador AT)`)
    : `${langUpper} · ${bookUpper}`;
  const rangeStr = activeMacroTanda?.rangeLabel || `${bookUpper}`;
  const dose2Text = isEn
    ? `📚 2. Download Book PDF (${bookScopeHint})`
    : `📚 2. Descargar Libro PDF (${bookScopeHint})`;
  const dose3Text = isFullBible16
    ? isEn
      ? `🏛️ 3. Download Full Bible PDF (66 books · ${langUpper})`
      : `🏛️ 3. Descargar Biblia Completa PDF (66 libros · ${langUpper})`
    : isEn
      ? `🏛️ 3. Download Bible Section ${activeMacroTanda?.macroTandaNumber || 1}/16 (${rangeStr} · ${langUpper})`
      : `🏛️ 3. Descargar Tomo Bíblico ${activeMacroTanda?.macroTandaNumber || 1}/16 (${rangeStr} · ${langUpper})`;
  return { dose2Text, dose3Text };
}
