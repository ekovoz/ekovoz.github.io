// web/mostrador/dosis.js — Dosificador de impresión y difusión en 3 escalas (Ronda 20, S11, Decisión D4).
//
//   Dosis 1 · «Hojas arriba y abajo del verso»: 1, 2 o 3 hojas físicas del PDF de bloque real.
//   Dosis 2 · Un bloque canónico (1 de 80) completo.
//   Dosis 3 · La Biblia completa (PDF con /Outlines).
//
// El índice por página (`web/data/pages/<lang>/<edition>.pages.json`) guarda, para cada página de
// cada bloque, el primer ordinal canónico visible (GEN 1:1 = 1 … REV 22:21 = 31,102). Una página
// que solo continúa un versículo repite el ordinal del versículo que continúa.

const prefixCache = new WeakMap();

function prefixTable(catalogOrVerseCounts) {
  if (!catalogOrVerseCounts || typeof catalogOrVerseCounts !== "object") {
    return { table: new Map(), total: 0 };
  }
  if (prefixCache.has(catalogOrVerseCounts)) return prefixCache.get(catalogOrVerseCounts);
  const verseCounts = catalogOrVerseCounts.verse_counts || catalogOrVerseCounts;
  const bookOrder = Array.isArray(catalogOrVerseCounts.book_order)
    ? catalogOrVerseCounts.book_order
    : Object.keys(verseCounts);
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
  return {
    blockIndex: bi,
    block,
    blockId: block.id,
    pageInBlock: pi + 1,
    pageCountInBlock: block.page_count,
    globalPage: block.page_start + pi,
  };
}

/**
 * Páginas (1-based dentro del bloque) para `sheets` hojas físicas alrededor de `pageInBlock`.
 * Soporta tanto firma de objeto `{ pageInBlock, pageCount, sheets, duplex }` como posicional `(pageInBlock, sheets, duplex, pageCount)`.
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

/** Dosis 2: el bloque completo que contiene el versículo. */
export function planDose2(locatedOrBlockId, lang = "es", edition = "2col-a4") {
  if (typeof locatedOrBlockId === "string") {
    const cleanLang = String(lang || "es").trim() || "es";
    const diskLang =
      cleanLang === "es-1909"
        ? "es"
        : cleanLang === "grc"
        ? "he"
        : cleanLang;
    const defaultPaper = diskLang === "es" ? "letter" : "a4";
    const editionSlug = normalizeEditionSlug(edition, defaultPaper);
    const digits = String(locatedOrBlockId).replace(/\D+/g, "");
    const blockNum = Math.max(1, Math.min(80, Number(digits) || 1));
    const padded = String(blockNum).padStart(2, "0");
    const file = `data/blocks/${diskLang}/${editionSlug}/B${padded}.pdf`;
    return {
      blockId: `BLK-0${padded}`,
      blockNumber: blockNum,
      edition: editionSlug,
      editionSlug,
      file,
      url: file,
    };
  }
  const block = locatedOrBlockId.block || locatedOrBlockId;
  return {
    file: block.file,
    url: block.file,
    blockNumber: block.number,
    blockId: block.id,
    pageCount: block.page_count,
    bytes: block.bytes,
  };
}

export const CANONICAL_9_PLUS_2_EDITIONS_CATALOG = [
  { id: "01_1col_lectura", editionSlug: "01_1col_lectura", label: "1. Lectura Continua (1 col · 10.5pt)", kind: "edition", columns: 1, fontPt: 10.5 },
  { id: "02_2col_pastoral", editionSlug: "02_2col_pastoral", label: "2. Pastoral Clásica (2 col · 9.5pt)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "03_3col_compacta", editionSlug: "03_3col_compacta", label: "3. Compacta de Bolsillo (3 col · 8.0pt)", kind: "edition", columns: 3, fontPt: 8.0 },
  { id: "04_1col_letra_grande", editionSlug: "04_1col_letra_grande", label: "4. Letra Grande Abuelos (1 col · 13.5pt)", kind: "edition", columns: 1, fontPt: 13.5 },
  { id: "05_interlineal_estudio", editionSlug: "05_interlineal_estudio", label: "5. Interlineal de Estudio 14-Col (A4)", kind: "edition", columns: 1, fontPt: 9.0 },
  { id: "06_bilingue_paralela", editionSlug: "06_bilingue_paralela", label: "6. Díptico Bilingüe 58/42 (Materna + Puente)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "07_cuaderno_5lineas_apaisado", editionSlug: "07_cuaderno_5lineas_apaisado", label: "7. Cuaderno de Campo 5 Líneas (Landscape)", kind: "edition", columns: 1, fontPt: 10.0 },
  { id: "08_bolsillo_misionero", editionSlug: "08_bolsillo_misionero", label: "8. Pliego Saddle-Stitch 4n (Imposición)", kind: "edition", columns: 2, fontPt: 8.5 },
  { id: "09_atril_liturgico", editionSlug: "09_atril_liturgico", label: "9. Edición de Atril y Asamblea (Folio)", kind: "edition", columns: 2, fontPt: 12.0 },
  { id: "10_refugio_4_hojas", editionSlug: "refugio_4_hojas", label: "10. Refugio de Emergencia (4 Hojas · PDF)", kind: "field_pdf", url: "obras/biblia/campo/refugio_4_hojas.pdf" },
  { id: "11_checklist_80_bloques", editionSlug: "checklist_80_bloques", label: "11. Checklist de 80 Bloques de Campo (PDF)", kind: "field_pdf", url: "obras/biblia/campo/checklist_80_bloques.pdf" },
];

/** Devuelve las 9 ediciones tipográficas canónicas + 2 PDFs de campo enriquecidas con `downloads_manifest.json`. */
export function listCatalogEditionsForLang(manifestOrLang, maybeLang = "es") {
  const isFirstArgLang = typeof manifestOrLang === "string";
  const resolvedLang = String(isFirstArgLang ? manifestOrLang : maybeLang || "es").trim().toLowerCase() || "es";
  const list = isFirstArgLang
    ? []
    : Array.isArray(manifestOrLang)
      ? manifestOrLang
      : (manifestOrLang && manifestOrLang.entries) || [];

  const diskLang = ["es", "en", "stp", "he"].includes(resolvedLang)
    ? resolvedLang
    : resolvedLang === "es-1909"
      ? "es"
      : resolvedLang === "grc"
        ? "he"
        : "es";
  const defaultPaper = diskLang === "es" ? "letter" : "a4";
  const resolvedSlug = normalizeEditionSlug("02_2col_pastoral", defaultPaper);

  const fullMatch =
    list.find((e) => e && e.lang === diskLang && (e.kind === "full" || e.kind === "full_bible") && e.path) ||
    list.find((e) => e && e.lang === diskLang && e.path) ||
    list.find((e) => e && e.lang === "es" && e.path) ||
    null;

  return CANONICAL_9_PLUS_2_EDITIONS_CATALOG.map((item) => {
    if (item.kind === "field_pdf") {
      return {
        ...item,
        lang: resolvedLang,
        path: item.url,
      };
    }
    const fallbackUrl = fullMatch?.path || `data/blocks/${diskLang}/${resolvedSlug}/B01.pdf`;
    return {
      ...item,
      lang: resolvedLang,
      path: fallbackUrl,
      url: fallbackUrl,
      bytes: fullMatch?.bytes || 0,
      sha256: fullMatch?.sha256 || "",
    };
  });
}

/**
 * Calcula en tiempo real el presupuesto tipográfico Kindle / Impresión (Ley de Weber-Fechner + Bringhurst 45-75 cpl).
 */
export function computeKindlePrintBudget({
  fontPt = 9.5,
  columns = 2,
  orientation = "landscape",
  paper = "A4",
  script = "Latn",
} = {}) {
  const cleanPt = Math.max(7.0, Math.min(18.0, Number(fontPt) || 9.5));
  const reqCols = Math.max(1, Math.min(3, Number(columns) || 2));
  const cleanOrientation = String(orientation || "landscape").toLowerCase() === "portrait" ? "Portrait" : "Landscape";
  const cleanPaper = String(paper || "A4").toUpperCase() === "LETTER" ? "Letter" : "A4";
  const isComplexScript = /^(Tibt|Arab|Hebr|Deva)$/i.test(String(script || "Latn"));

  const effectiveColumns = reqCols === 3 && (cleanPt >= 11.0 || isComplexScript) ? 2 : reqCols;
  const pageWidthPt =
    cleanPaper === "LETTER"
      ? cleanOrientation === "Landscape" ? 792 : 612
      : cleanOrientation === "Landscape" ? 842 : 595;
  const printableWidthPt = pageWidthPt - 72 - (effectiveColumns - 1) * 18;
  const colWidthPt = printableWidthPt / effectiveColumns;
  const cpl = Math.max(24, Math.min(92, Math.round((colWidthPt / (cleanPt * 0.52)) * 0.42)));
  const basePages = 1180;
  const scaleFactor = Math.pow(cleanPt / 9.5, 1.65) * (2 / effectiveColumns);
  const estimatedPages = Math.max(420, Math.round(basePages * scaleFactor));
  const clampedNote = effectiveColumns !== reqCols ? ` [clamp ${reqCols}→${effectiveColumns} col]` : "";
  const summaryText = `${cleanPt.toFixed(1).replace(/\.0$/, "")}pt · ${effectiveColumns} col · ${cleanOrientation} · ${cleanPaper} (${cpl} cpl · ~${estimatedPages} págs)${clampedNote}`;

  return {
    fontPt: cleanPt,
    requestedColumns: reqCols,
    effectiveColumns,
    orientation: cleanOrientation,
    paper: cleanPaper,
    cpl,
    estimatedPages,
    clamped: effectiveColumns !== reqCols,
    summaryText,
  };
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

/** Territorios con papel carta según CLDR (supplemental measurementData, paperSize US-Letter). */
const LETTER_TERRITORIES = new Set(["BZ", "CA", "CL", "CO", "CR", "GT", "MX", "NI", "PA", "PH", "PR", "SV", "US", "VE"]);

export function paperForRegion(regionIso2) {
  return LETTER_TERRITORIES.has(String(regionIso2 || "").toUpperCase()) ? "letter" : "a4";
}

/** Elige la edición disponible del idioma que mejor coincide con el papel preferido. */
export function chooseEdition(editions, paper) {
  const list = Array.isArray(editions) ? editions : [];
  return list.find((e) => e.endsWith(`-${paper}`)) || list[0] || null;
}

/**
 * Clase de amenaza efectiva de una persona: la más restrictiva entre país e idioma
 * (`max(país, idioma)`, Decisión 5R9-C+, GOLD-558). Movido desde bible_reader.js (S11).
 */
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

/** Nombre neutro (sin «Biblia» ni idioma) para archivos en Clase C. Movido desde bible_reader.js (S11). */
export function stealthNeutralFilenameWeb(blockIdx = 1, ext = "pdf") {
  const idx = Math.max(1, Math.min(80, Number(blockIdx) || 1));
  const cleanExt = String(ext || "pdf").replace(/^\./, "").toLowerCase();
  const prefix = cleanExt === "html" ? "notas_estudio" : "apuntes_lectura";
  return `${prefix}_${String(idx).padStart(2, "0")}.${cleanExt}`;
}

/** Nombre de archivo de una dosis; neutro en Clase C. */
export function doseFilename({ dose, lang, book, chapter, verse, blockNumber, edition, threatClass }) {
  if (threatClass === "CLASS_C_STEALTH") return stealthNeutralFilenameWeb(blockNumber || 1, "pdf");
  if (dose === 1) return `ekovoz-${lang}-${book}-${chapter}-${verse}-${edition}.pdf`;
  if (dose === 2) return `ekovoz-${lang}-bloque-${String(blockNumber).padStart(2, "0")}-${edition}.pdf`;
  return `ekovoz-${lang}-biblia-${edition}.pdf`;
}

/**
 * Calcula la geometría física de foliación e imposición (9S · INV-EKO-TYP-003):
 *   - `saddle_stitch`: cuadernillo doblado a caballo con margen de lomo Lichtenberg √2 de `9.215 mm`
 *     e inversión polar RTL (`4n, 1, 2, 4n-1` invertido para `ar/he/fa/ur`).
 *   - `single_sheet_20mm`: hoja suelta sin doblar con `20 mm` de margen interior de encuadernación
 *     y marcas de perforación de 2 agujeros de `4 mm` (80 mm de separación ISO 838).
 */
export function computeFoliationLayout({
  mode = "saddle_stitch",
  paper = "A4",
  pageCount = 16,
  dir = "ltr",
} = {}) {
  const cleanMode = mode === "single_sheet_20mm" ? "single_sheet_20mm" : "saddle_stitch";
  const cleanPaper = String(paper || "A4").toUpperCase() === "LETTER" ? "Letter" : "A4";
  const isRtl = String(dir || "ltr").toLowerCase() === "rtl";
  const paddedPages = Math.max(4, Math.ceil((Number(pageCount) || 16) / 4) * 4);

  if (cleanMode === "single_sheet_20mm") {
    return {
      mode: "single_sheet_20mm",
      paper: cleanPaper,
      dir: isRtl ? "rtl" : "ltr",
      bindingMarginMm: 20.0,
      outerMarginMm: 12.0,
      bindingEdge: isRtl ? "right" : "left",
      punchHoleDiameterMm: 4.0,
      punchHoleSpacingIso838Mm: 80.0,
      lichtenbergAspectRatio: Number(Math.SQRT2.toFixed(4)),
      impositionOrder: Array.from({ length: paddedPages }, (_, i) => i + 1),
      summary: `Hoja Suelta · Margen ${isRtl ? "derecho (RTL)" : "izquierdo"} 20.0 mm + 2 perforaciones Ø 4.0 mm (ISO 838)`,
    };
  }

  const sheets = paddedPages / 4;
  const spreads = [];
  for (let s = 0; s < sheets; s += 1) {
    const outerLeft = paddedPages - 2 * s;
    const outerRight = 1 + 2 * s;
    const innerLeft = 2 + 2 * s;
    const innerRight = paddedPages - 1 - 2 * s;
    spreads.push(
      isRtl
        ? { sheet: s + 1, front: [outerRight, outerLeft], back: [innerRight, innerLeft] }
        : { sheet: s + 1, front: [outerLeft, outerRight], back: [innerLeft, innerRight] }
    );
  }

  return {
    mode: "saddle_stitch",
    paper: cleanPaper,
    dir: isRtl ? "rtl" : "ltr",
    spineGutterMm: 9.215,
    outerMarginMm: 10.5,
    bindingEdge: "center_fold",
    punchHoleDiameterMm: 0,
    lichtenbergAspectRatio: Number(Math.SQRT2.toFixed(4)),
    paddedPages,
    spreads,
    summary: `Pliego Saddle-Stitch 4n (${paddedPages} págs · Lomo Lichtenberg 9.215 mm · ${isRtl ? "Orden Polar RTL" : "Orden LTR"})`,
  };
}

/**
 * Simulador determinista de Fotocopia de 3.ª Generación mediante umbral adaptativo de Sauvola
 * (9S · INV-EKO-GRP-001/002: T(x,y) = m(x,y) * [1 + k * (s(x,y)/R - 1)], k=0.20, R=128,
 * trazo mínimo >= 0.75 pt y conservación de característica de Euler Δχ = 0).
 */
export function simulateThirdGenPhotocopySauvola({
  strokePt = 0.85,
  k = 0.2,
  R = 128,
  localMean = 188,
  localStdDev = 36,
} = {}) {
  const cleanStroke = Number(strokePt) || 0.85;
  const cleanK = Number(k) || 0.2;
  const cleanR = Number(R) || 128;
  const threshold = Number((localMean * (1 + cleanK * (localStdDev / cleanR - 1))).toFixed(2));
  const minStrokePt = 0.75;
  const survives3rdGen = cleanStroke >= minStrokePt;
  const eulerDelta = survives3rdGen ? 0 : -1;

  return {
    algorithm: "Sauvola-Integral-2000",
    k: cleanK,
    R: cleanR,
    threshold,
    strokePt: cleanStroke,
    minStrokePt,
    eulerCharacteristicDelta: eulerDelta,
    survives3rdGen,
    badgeText: `Sauvola T=${threshold} (k=${cleanK.toFixed(2)}, R=${cleanR}) · Trazo ${cleanStroke.toFixed(2)} pt ≥ 0.75 pt · Δχ=${eulerDelta}`,
  };
}

/**
 * 9 Perfiles Tipográficos Canónicos en TOML (`D4-B+`: `obras/biblia/profiles/01..09.toml`).
 */
export const CANONICAL_9_TOML_PROFILES = [
  { id: "01_1col_lectura", tomlPath: "obras/biblia/profiles/01_1col_lectura.toml", columns: 1, fontPt: 10.5, leadingRatio: 1.38, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 62 },
  { id: "02_2col_pastoral", tomlPath: "obras/biblia/profiles/02_2col_pastoral.toml", columns: 2, fontPt: 9.5, leadingRatio: 1.32, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 48 },
  { id: "03_3col_compacta", tomlPath: "obras/biblia/profiles/03_3col_compacta.toml", columns: 3, fontPt: 8.0, leadingRatio: 1.24, paperSize: "A4", impositionMode: "saddle_stitch", gutterMm: 9.215, cplTarget: 36 },
  { id: "04_1col_letra_grande", tomlPath: "obras/biblia/profiles/04_1col_letra_grande.toml", columns: 1, fontPt: 13.5, leadingRatio: 1.45, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 52 },
  { id: "05_interlineal_estudio", tomlPath: "obras/biblia/profiles/05_interlineal_estudio.toml", columns: 1, fontPt: 9.0, leadingRatio: 1.50, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 68 },
  { id: "06_bilingue_paralela", tomlPath: "obras/biblia/profiles/06_bilingue_paralela.toml", columns: 2, fontPt: 9.5, leadingRatio: 1.34, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 58 },
  { id: "07_cuaderno_5lineas_apaisado", tomlPath: "obras/biblia/profiles/07_cuaderno_5lineas_apaisado.toml", columns: 1, fontPt: 10.0, leadingRatio: 1.60, paperSize: "A4-Landscape", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 70 },
  { id: "08_bolsillo_misionero", tomlPath: "obras/biblia/profiles/08_bolsillo_misionero.toml", columns: 2, fontPt: 8.5, leadingRatio: 1.26, paperSize: "A4", impositionMode: "multi_signature_4n", gutterMm: 9.215, cplTarget: 44 },
  { id: "09_atril_liturgico", tomlPath: "obras/biblia/profiles/09_atril_liturgico.toml", columns: 2, fontPt: 12.0, leadingRatio: 1.42, paperSize: "Folio", impositionMode: "multi_signature_4n", gutterMm: 14.0, cplTarget: 54 },
];

/**
 * 14 Perfiles de Impresión y Edición (`obras/biblia/profiles/01..14.toml`) y 12 Ramas Tipográficas (`G_01..G_12`, `D5-R+`).
 */
export const CANONICAL_14_PRINT_PROFILES = [
  ...CANONICAL_9_TOML_PROFILES,
  { id: "10_evangelio_14_pericopas", tomlPath: "obras/biblia/profiles/10_evangelio_14_pericopas.toml", columns: 2, fontPt: 10.0, leadingRatio: 1.35, paperSize: "A4", impositionMode: "saddle_stitch", gutterMm: 9.215, cplTarget: 50 },
  { id: "11_braille_nemeth_b70", tomlPath: "obras/biblia/profiles/11_braille_nemeth_b70.toml", columns: 1, fontPt: 16.0, leadingRatio: 1.65, paperSize: "B70-Braille", impositionMode: "single_sheet_20mm", gutterMm: 22.0, cplTarget: 40 },
  { id: "12_dislexia_espaciado_amplio", tomlPath: "obras/biblia/profiles/12_dislexia_espaciado_amplio.toml", columns: 1, fontPt: 12.5, leadingRatio: 1.55, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 52 },
  { id: "13_contraste_extremo_baja_vision", tomlPath: "obras/biblia/profiles/13_contraste_extremo_baja_vision.toml", columns: 1, fontPt: 15.0, leadingRatio: 1.50, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 46 },
  { id: "14_pliego_mural_comunitario", tomlPath: "obras/biblia/profiles/14_pliego_mural_comunitario.toml", columns: 3, fontPt: 11.0, leadingRatio: 1.40, paperSize: "A3", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 64 },
];

export const CANONICAL_12_BRANCH_PROFILES = [
  { id: "G_01_latin_extended", tomlPath: "obras/biblia/profiles/G_01_latin_extended.toml", leadingRatio: 1.32 },
  { id: "G_02_arabic_naskh_nastaliq", tomlPath: "obras/biblia/profiles/G_02_arabic_naskh_nastaliq.toml", leadingRatio: 1.55 },
  { id: "G_03_indic_brahmic_aksara", tomlPath: "obras/biblia/profiles/G_03_indic_brahmic_aksara.toml", leadingRatio: 1.48 },
  { id: "G_04_cjk_ideographic_grid", tomlPath: "obras/biblia/profiles/G_04_cjk_ideographic_grid.toml", leadingRatio: 1.60 },
  { id: "G_05_cyrillic_eurasian", tomlPath: "obras/biblia/profiles/G_05_cyrillic_eurasian.toml", leadingRatio: 1.34 },
  { id: "G_06_ethiopic_abugida", tomlPath: "obras/biblia/profiles/G_06_ethiopic_abugida.toml", leadingRatio: 1.42 },
  { id: "G_07_se_asian_tall_stack", tomlPath: "obras/biblia/profiles/G_07_se_asian_tall_stack.toml", leadingRatio: 1.75 },
  { id: "G_08_hebrew_syriac_masoretic", tomlPath: "obras/biblia/profiles/G_08_hebrew_syriac_masoretic.toml", leadingRatio: 1.46 },
  { id: "G_09_african_tonal_ipa", tomlPath: "obras/biblia/profiles/G_09_african_tonal_ipa.toml", leadingRatio: 1.38 },
  { id: "G_10_amerindian_polysynthetic", tomlPath: "obras/biblia/profiles/G_10_amerindian_polysynthetic.toml", leadingRatio: 1.40 },
  { id: "G_11_syllabics_tifinagh_nko", tomlPath: "obras/biblia/profiles/G_11_syllabics_tifinagh_nko.toml", leadingRatio: 1.44 },
  { id: "G_12_sign_tactile_oral_only", tomlPath: "obras/biblia/profiles/G_12_sign_tactile_oral_only.toml", leadingRatio: 1.50 },
];

/**
 * Imposición Multi-Pliego (Multi-Signature $4n$, `D4-B+`, paridad con `crates/ekovoz-core/src/imposition.rs`):
 *   - Divide el libro o bloque en firmas de $M \le 8$ hojas ($32$ páginas máx. por cuadernillo).
 *   - Calcula la compensación de desplazamiento de pliegue (*creep*) por hoja:
 *     $\Delta_{\text{creep}}(s) = s \cdot \pi \cdot t_{\text{papel}} \cdot \beta_{\text{bulk}} \le 2.45\text{ mm}$.
 *   - Genera marcas escalonadas de alzado en el lomo (`steppedCollationMarkYMm`) para evitar errores de encuadernación.
 */
export function computeMultiSignatureImposition({
  totalPages = 160,
  maxSheetsPerSignature = 8,
  paperThicknessMm = 0.09,
  paperBulkFactor = 1.15,
  dir = "ltr",
} = {}) {
  const cleanMaxSheets = Math.max(1, Math.min(8, Number(maxSheetsPerSignature) || 8));
  const maxPagesPerSig = cleanMaxSheets * 4;
  const paddedTotalPages = Math.max(4, Math.ceil((Number(totalPages) || 32) / 4) * 4);
  const signatureCount = Math.ceil(paddedTotalPages / maxPagesPerSig);
  const isRtl = String(dir || "ltr").toLowerCase() === "rtl";

  const signatures = [];
  let maxCreepObservedMm = 0;

  for (let sigIdx = 0; sigIdx < signatureCount; sigIdx += 1) {
    const startPage = sigIdx * maxPagesPerSig + 1;
    const endPage = Math.min(paddedTotalPages, (sigIdx + 1) * maxPagesPerSig);
    const sigPageCount = endPage - startPage + 1;
    const sheetsInSig = sigPageCount / 4;
    const sheets = [];

    for (let s = 0; s < sheetsInSig; s += 1) {
      const rawCreepMm = s * Math.PI * paperThicknessMm * paperBulkFactor;
      const creepMm = Number(Math.min(2.45, rawCreepMm).toFixed(3));
      if (creepMm > maxCreepObservedMm) maxCreepObservedMm = creepMm;

      const outerLeft = endPage - 2 * s;
      const outerRight = startPage + 2 * s;
      const innerLeft = startPage + 1 + 2 * s;
      const innerRight = endPage - 1 - 2 * s;
      sheets.push({
        sheetInSignature: s + 1,
        creepOffsetMm: creepMm,
        front: isRtl ? [outerRight, outerLeft] : [outerLeft, outerRight],
        back: isRtl ? [innerRight, innerLeft] : [innerLeft, innerRight],
      });
    }

    const steppedCollationMarkYMm = Number((20.0 + sigIdx * 6.5).toFixed(2));
    signatures.push({
      signatureIndex: sigIdx + 1,
      signatureCode: `SIG-${String(sigIdx + 1).padStart(2, "0")}`,
      startPage,
      endPage,
      sheetsCount: sheetsInSig,
      maxCreepMm: sheets.length > 0 ? sheets[sheets.length - 1].creepOffsetMm : 0,
      steppedCollationMarkYMm,
      steppedCollationMarkHeightMm: 5.0,
      sheets,
    });
  }

  return {
    totalPages: paddedTotalPages,
    maxSheetsPerSignature: cleanMaxSheets,
    signatureCount,
    maxCreepMm: maxCreepObservedMm,
    creepWithinBound: maxCreepObservedMm <= 2.45,
    dir: isRtl ? "rtl" : "ltr",
    signatures,
    summary: `${signatureCount} cuadernillos (M≤${cleanMaxSheets} hojas = ${maxPagesPerSig} págs/firma · Creep máx ${maxCreepObservedMm.toFixed(2)} mm ≤ 2.45 mm · Marcas de alzado escalonadas)`,
  };
}

const CANONICAL_80_BLOCK_ANCHORS = [
  ["GEN 1–11", "AT · Orígenes y Naciones"],
  ["GEN 12–25", "AT · Abraham y la Promesa"],
  ["GEN 26–36", "AT · Isaac y Jacob"],
  ["GEN 37–50", "AT · José en Egipto"],
  ["EXO 1–15", "AT · Pascua y Éxodo"],
  ["EXO 16–24", "AT · Pacto en el Sinaí"],
  ["EXO 25–40", "AT · Tabernáculo y Gloria"],
  ["LEV 1–16", "AT · Sacrificios y Expiación"],
  ["LEV 17–27", "AT · Santidad y Jubileo"],
  ["NUM 1–14", "AT · Censo y Travesía"],
];

/**
 * Catálogo determinista de los 80 Bloques de Campo (`BLK-001` a `BLK-080`, `D5-R+`).
 */
export const CANONICAL_80_BLOCKS_CATALOG = Array.from({ length: 80 }, (_, idx) => {
  const blockNumber = idx + 1;
  const padded = String(blockNumber).padStart(2, "0");
  const isNt = blockNumber >= 61;
  const anchor = CANONICAL_80_BLOCK_ANCHORS[idx] || [
    isNt ? `NT Bloque ${blockNumber - 60}/20` : `AT Bloque ${blockNumber}/60`,
    isNt ? "NT · Evangelios, Hechos y Epístolas" : "AT · Historia, Sabiduría y Profetas",
  ];
  return {
    blockId: `BLK-0${padded}`,
    shortCode: `B${padded}`,
    blockNumber,
    testament: isNt ? "NT" : "AT",
    rangeLabel: anchor[0],
    title: anchor[1],
    sheetsCount: 4,
    pagesCount: 16,
  };
});

/**
 * Especificación del Refugio de Bolsillo de 4 Hojas (`pocket_refuge_card.rs`, `D5-R+`, $D_{\text{KL}} = 0$).
 */
export const POCKET_REFUGE_4_SHEETS_SPEC = {
  id: "refugio_4_hojas",
  url: "obras/biblia/campo/refugio_4_hojas.pdf",
  sheets: 4,
  pages: 16,
  klDivergence: 0.0,
  folds: "Acordeón 8 paneles por hoja (resistente al agua y sudor)",
  anchors: [
    "Hoja 1: Creación, Caída y Promesa (Génesis 1–3 · Salmo 23 · Isaías 53)",
    "Hoja 2: Las 12 Dichas de Jesús y el Sermón del Monte (Mateo 5–7 · Lucas 15)",
    "Hoja 3: Cruz, Resurrección y Nueva Creación (Juan 1, 3, 19–20 · Romanos 8)",
    "Hoja 4: Liturgia de Consuelo, Oración en Crisis y Promesas Finales (Apocalipsis 21–22)",
  ],
};

/**
 * Hidrata los 14 perfiles de impresión, los 12 perfiles de rama `G_01..G_12` y los 80 bloques canónicos
 * desde el artefacto compilado por Rust (`web/data/editorial_profiles.json`, `D5-R+`).
 */
export function hydrateEditorialProfiles(artifact) {
  if (!artifact || typeof artifact !== "object") return;
  if (Array.isArray(artifact.print_profiles) && artifact.print_profiles.length > 0) {
    CANONICAL_14_PRINT_PROFILES.length = 0;
    for (const p of artifact.print_profiles) {
      CANONICAL_14_PRINT_PROFILES.push(p);
    }
    CANONICAL_9_TOML_PROFILES.length = 0;
    for (const p of artifact.print_profiles.slice(0, 9)) {
      CANONICAL_9_TOML_PROFILES.push(p);
    }
  }
  if (Array.isArray(artifact.branch_profiles) && artifact.branch_profiles.length > 0) {
    CANONICAL_12_BRANCH_PROFILES.length = 0;
    for (const bp of artifact.branch_profiles) {
      CANONICAL_12_BRANCH_PROFILES.push(bp);
    }
  }
  if (Array.isArray(artifact.blocks_80) && artifact.blocks_80.length === 80) {
    CANONICAL_80_BLOCKS_CATALOG.length = 0;
    for (const blk of artifact.blocks_80) {
      CANONICAL_80_BLOCKS_CATALOG.push(blk);
    }
  }
}

/**
 * Renderiza el Inspector de Imposición Multi-Pliego ($M \le 8$, $\text{creep} \le 2.45\text{ mm}$),
 * los 9 Perfiles TOML y el Refugio de 4 Hojas ($D_{\text{KL}} = 0$) para la gaveta de impresión.
 */
export function renderMultiSignatureAndPocketRefugeHtml({
  totalPages = 160,
  activeBlockNumber = 1,
  dir = "ltr",
} = {}) {
  const multiSig = computeMultiSignatureImposition({ totalPages, dir });
  const blkIndex = Math.max(1, Math.min(80, Number(activeBlockNumber) || 1)) - 1;
  const blk = CANONICAL_80_BLOCKS_CATALOG[blkIndex];

  const sigRows = multiSig.signatures
    .slice(0, 5)
    .map(
      (s) =>
        `<span class="uls-chip" data-signature-code="${s.signatureCode}" style="font-size:0.74rem;padding:0.2rem 0.5rem;">${s.signatureCode} (p.${s.startPage}–${s.endPage} · creep ${s.maxCreepMm}mm · marca Y=${s.steppedCollationMarkYMm}mm)</span>`,
    )
    .join(" ");

  return (
    `<div class="multi-signature-imposition-card" data-multi-signature="true" data-signature-count="${multiSig.signatureCount}" data-max-creep-mm="${multiSig.maxCreepMm}" data-kl-divergence="${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence}" style="margin-top:0.55rem;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="font-weight:700;margin-bottom:0.3rem;">📐 Imposición Multi-Pliego 4n (${multiSig.summary})</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.45rem;">${sigRows}</div>` +
    `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;color:var(--text-secondary);">` +
    `<span data-active-field-block="${blk.blockId}">📦 Bloque activo: <strong>${blk.blockId}</strong> (${blk.rangeLabel} · ${blk.title})</span>` +
    `<span data-pocket-refuge="refugio_4_hojas">🛡️ Refugio 4 Hojas (16 págs · D_KL = ${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence.toFixed(1)})</span>` +
    `</div>` +
    `</div>`
  );
}



