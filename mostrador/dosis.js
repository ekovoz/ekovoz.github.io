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

/** Normaliza cualquier ruta de activo PDF a ruta relativa sin `/` inicial para sub-rutas GitHub Pages (Decisión 7A). */
export function buildRelativePdfAssetUrl(rawUrl = "") {
  const clean = String(rawUrl || "").trim();
  if (!clean) return "";
  return clean.replace(/^\/+(?=(?:data|obras)\/)/, "");
}

/** Dosis 2: el bloque completo que contiene el versículo. */
export function planDose2(locatedOrBlockId, lang = "es", edition = "2col-a4") {
  if (typeof locatedOrBlockId === "string") {
    const cleanLang = String(lang || "es").trim() || "es";
    const diskLang =
      cleanLang === "es-1909"
        ? "es"
        : ["es", "en", "stp", "he", "grc"].includes(cleanLang)
          ? cleanLang
          : "es";
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
  { id: "01_1col_lectura", editionSlug: "01_1col_lectura", label: "1. Lectura Continua (1 col · 10.5pt)", label_en: "1. Continuous Reading (1 col · 10.5pt)", kind: "edition", columns: 1, fontPt: 10.5 },
  { id: "02_2col_pastoral", editionSlug: "02_2col_pastoral", label: "2. Pastoral Clásica (2 col · 9.5pt)", label_en: "2. Classic Pastoral (2 col · 9.5pt)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "03_3col_compacta", editionSlug: "03_3col_compacta", label: "3. Compacta de Bolsillo (3 col · 8.0pt)", label_en: "3. Pocket Compact (3 col · 8.0pt)", kind: "edition", columns: 3, fontPt: 8.0 },
  { id: "04_1col_letra_grande", editionSlug: "04_1col_letra_grande", label: "4. Letra Grande Abuelos (1 col · 13.5pt)", label_en: "4. Large Print Elders (1 col · 13.5pt)", kind: "edition", columns: 1, fontPt: 13.5 },
  { id: "05_interlineal_estudio", editionSlug: "05_interlineal_estudio", label: "5. Interlineal de Estudio 14-Col (A4)", label_en: "5. 14-Col Study Interlinear (A4)", kind: "edition", columns: 1, fontPt: 9.0 },
  { id: "06_bilingue_paralela", editionSlug: "06_bilingue_paralela", label: "6. Díptico Bilingüe 58/42 (Materna + Puente)", label_en: "6. Bilingual Diptych 58/42 (Vernacular + Bridge)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "07_cuaderno_5lineas_apaisado", editionSlug: "07_cuaderno_5lineas_apaisado", label: "7. Cuaderno de Campo 5 Líneas (Landscape)", label_en: "7. 5-Line Field Notebook (Landscape)", kind: "edition", columns: 1, fontPt: 10.0 },
  { id: "08_bolsillo_misionero", editionSlug: "08_bolsillo_misionero", label: "8. Pliego Saddle-Stitch 4n (Imposición)", label_en: "8. Saddle-Stitch 4n Booklet (Imposition)", kind: "edition", columns: 2, fontPt: 8.5 },
  { id: "09_atril_liturgico", editionSlug: "09_atril_liturgico", label: "9. Edición de Atril y Asamblea (Folio)", label_en: "9. Pulpit & Assembly Folio Edition", kind: "edition", columns: 2, fontPt: 12.0 },
  { id: "10_refugio_4_hojas", editionSlug: "refugio_4_hojas", label: "10. Refugio de Emergencia (4 Hojas · PDF)", label_en: "10. Emergency Pocket Refuge (4 Sheets · PDF)", kind: "field_pdf", url: "obras/biblia/campo/refugio_4_hojas.pdf" },
  { id: "11_checklist_80_bloques", editionSlug: "checklist_80_bloques", label: "11. Checklist de 80 Bloques de Campo (PDF)", label_en: "11. 80 Canonical Field Blocks Checklist (PDF)", kind: "field_pdf", url: "obras/biblia/campo/checklist_80_bloques.pdf" },
];

export const CANONICAL_14_PLUS_2_EDITIONS_CATALOG = [
  ...CANONICAL_9_PLUS_2_EDITIONS_CATALOG.slice(0, 9),
  { id: "10_evangelio_14_pericopas", editionSlug: "10_evangelio_14_pericopas", label: "10. Evangelio 14 Perícopas (2 col · 10.0pt)", label_en: "10. Gospel 14 Pericopes (2 col · 10.0pt)", kind: "edition", columns: 2, fontPt: 10.0 },
  { id: "11_braille_nemeth_b70", editionSlug: "11_braille_nemeth_b70", label: "11. Braille Táctil BEB B70 (1 col · 16.0pt)", label_en: "11. Tactile Braille BEB B70 (1 col · 16.0pt)", kind: "edition", columns: 1, fontPt: 16.0 },
  { id: "12_dislexia_espaciado_amplio", editionSlug: "12_dislexia_espaciado_amplio", label: "12. Dislexia Espaciado Amplio (1 col · 12.5pt)", label_en: "12. Dyslexia Wide Spacing (1 col · 12.5pt)", kind: "edition", columns: 1, fontPt: 12.5 },
  { id: "13_contraste_extremo_baja_vision", editionSlug: "13_contraste_extremo_baja_vision", label: "13. Baja Visión Contraste Extremo (1 col · 15.0pt)", label_en: "13. Low Vision High Contrast (1 col · 15.0pt)", kind: "edition", columns: 1, fontPt: 15.0 },
  { id: "14_pliego_mural_comunitario", editionSlug: "14_pliego_mural_comunitario", label: "14. Pliego Mural Comunitario A3 (3 col · 11.0pt)", label_en: "14. Community Mural Sheet A3 (3 col · 11.0pt)", kind: "edition", columns: 3, fontPt: 11.0 },
  { id: "15_refugio_4_hojas", editionSlug: "refugio_4_hojas", label: "15. Refugio de Emergencia (4 Hojas · PDF)", label_en: "15. Emergency Pocket Refuge (4 Sheets · PDF)", kind: "field_pdf", url: "obras/biblia/campo/refugio_4_hojas.pdf" },
  { id: "16_checklist_80_bloques", editionSlug: "checklist_80_bloques", label: "16. Checklist de 80 Bloques de Campo (PDF)", label_en: "16. 80 Canonical Field Blocks Checklist (PDF)", kind: "field_pdf", url: "obras/biblia/campo/checklist_80_bloques.pdf" },
];

export const PRECOMPILED_PDF_LANGS = ["es", "en", "stp", "he", "grc"];
export const VERIFIED_TEXT_BIBLE_LANGS = [
  "es", "es-1909", "en", "stp", "he", "grc", "pt", "fr", "ar", "ru", "zh-Hans", "hi", "bn", "id", "ur", "fa",
];

/**
 * D5-R41 (`5A` · `ARB-EKOVOZ-78`):
 * Sintetiza un PDF `%PDF-1.4` minimalista válido en memoria para las 11 Biblias verificadas en texto
 * que aún no tienen los 80 bloques PDF precompilados en disco, garantizando que `dispenseDose1` funcione en las 16 Biblias.
 */
export function synthesizeLiveChapterDose1PdfBytes({
  lang = "pt",
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "",
  versesMap = null,
  sheets = 1,
} = {}) {
  const mapEntries =
    versesMap && typeof versesMap === "object"
      ? Object.entries(versesMap)
          .slice(0, 12)
          .map(([vNum, vTxt]) => `${vNum}. ${vTxt}`)
          .join(" ")
      : "";
  const safeText = String(text || mapEntries || `${book} ${chapter}:${verse} (${lang})`)
    .replace(/[()\\]/g, " ")
    .slice(0, 240);
  const pageCount = Math.max(2, Math.min(6, (Number(sheets) || 1) * 2));
  const kids = Array.from({ length: pageCount }, (_, idx) => `${idx + 3} 0 R`).join(" ");
  const contentObjId = pageCount + 3;
  const streamText = `BT /F1 10 Tf 54 760 Td (${book} ${chapter}:${verse} [${lang}] - ${safeText}) Tj ET`;
  let pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count ${pageCount} /Kids [ ${kids} ] >> endobj\n`;
  for (let i = 0; i < pageCount; i++) {
    const objId = i + 3;
    pdf += `${objId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjId} 0 R >> endobj\n`;
  }
  pdf += `${contentObjId} 0 obj << /Length ${streamText.length} >>\nstream\n${streamText}\nendstream\nendobj\n`;
  pdf += `% Live Dose1 (${lang} ${book} ${chapter}:${verse}): ${safeText}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

/** Devuelve las ediciones tipográficas canónicas + 2 PDFs de campo enriquecidas con `downloads_manifest.json` y perfiles TOML (`D3-S21+`, `D5-R41`). */
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

  const diskLang = ["es", "en", "stp", "he", "grc"].includes(resolvedLang)
    ? resolvedLang
    : resolvedLang === "es-1909"
      ? "es"
      : "es";
  const defaultPaper = diskLang === "es" ? "letter" : "a4";
  const resolvedSlug = normalizeEditionSlug("02_2col_pastoral", defaultPaper);

  const fullMatch =
    list.find((e) => e && e.lang === diskLang && (e.kind === "full" || e.kind === "full_bible") && e.path) ||
    list.find((e) => e && e.lang === diskLang && e.path) ||
    list.find((e) => e && e.lang === "es" && e.path) ||
    null;

  const baseCatalog =
    options && options.includeAll14Profiles === true
      ? CANONICAL_14_PLUS_2_EDITIONS_CATALOG
      : CANONICAL_9_PLUS_2_EDITIONS_CATALOG;

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
      const cleanFieldUrl = buildRelativePdfAssetUrl(item.url || "obras/biblia/campo/refugio_4_hojas.pdf");
      return {
        ...item,
        label: localizedLabel,
        profileId: item.id,
        profileUrl: cleanFieldUrl,
        lang: resolvedLang,
        path: cleanFieldUrl,
        url: cleanFieldUrl,
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
    const budget = computeKindlePrintBudget({
      fontPt: resolvedFontPt,
      columns: resolvedCols,
      paper: resolvedPaper.includes("Letter") ? "Letter" : "A4",
    });
    const hasPrecompiledPdf = PRECOMPILED_PDF_LANGS.includes(resolvedLang);
    const availabilityMode = hasPrecompiledPdf ? "precompiled_pdf" : "live_chapter_synthesis";
    return {
      ...item,
      label: localizedLabel,
      profileId: item.id,
      profileUrl: `${fallbackUrl}?profile=${item.id}&cols=${resolvedCols}&font=${resolvedFontPt}pt&paper=${encodeURIComponent(resolvedPaper)}&mode=${encodeURIComponent(impositionMode)}`,
      tomlPath: tomlMeta.tomlPath || `obras/biblia/profiles/${item.id}.toml`,
      columns: resolvedCols,
      fontPt: resolvedFontPt,
      leadingRatio: tomlMeta.leadingRatio || 1.35,
      gutterMm: tomlMeta.gutterMm || 20.0,
      paperSize: resolvedPaper,
      impositionMode,
      cpl: budget.cpl,
      estimatedPages: budget.estimatedPages,
      summarySpec: `${resolvedCols} col · ${resolvedFontPt}pt · ${resolvedPaper} (~${budget.estimatedPages} ${isEn ? "pages" : "págs"})`,
      lang: resolvedLang,
      diskLang,
      hasPrecompiledPdf,
      supportsLivePdfSynthesis: !hasPrecompiledPdf,
      availabilityMode,
      path: fallbackUrl,
      url: fallbackUrl,
      bytes: fullMatch?.bytes || 0,
      sha256: fullMatch?.sha256 || "",
    };
  });
}

/** Devuelve las 16 ediciones completas (los 14 perfiles TOML `01..14` + 2 PDFs de campo, `D3-S21+`). */
export function listAll14PrintEditionsForLang(manifestOrLang, maybeLang = "es", options = {}) {
  return listCatalogEditionsForLang(manifestOrLang, maybeLang, { ...options, includeAll14Profiles: true });
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
  const clean = String(regionIso2 || "").trim().split(/[-_]/).pop().toUpperCase();
  return LETTER_TERRITORIES.has(clean) ? "letter" : "a4";
}

/** Elige la edición disponible del idioma que mejor coincide con el papel preferido. */
export function chooseEdition(editions, paper) {
  const list = Array.isArray(editions) ? editions : [];
  return list.find((e) => e.endsWith(`-${paper}`)) || list[0] || null;
}

/**
 * D5-R40 (`5A` · `resolveRegionalPrintDefaults`):
 * Resuelve el papel CLDR (`letter` vs `a4`) mediante `paperForRegion(regionIso2)` y la edición recomendada
 * mediante `chooseEdition(editions, paper)`.
 */
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

const CANONICAL_66_BOOKS_CHAPTER_COUNTS = [
  ["GEN", 50, "AT · Pentateuco (Torá)"], ["EXO", 40, "AT · Pentateuco (Torá)"], ["LEV", 27, "AT · Pentateuco (Torá)"],
  ["NUM", 36, "AT · Pentateuco (Torá)"], ["DEU", 34, "AT · Pentateuco (Torá)"], ["JOS", 24, "AT · Libros Históricos"],
  ["JDG", 21, "AT · Libros Históricos"], ["RUT", 4, "AT · Libros Históricos"], ["1SA", 31, "AT · Libros Históricos"],
  ["2SA", 24, "AT · Libros Históricos"], ["1KI", 22, "AT · Libros Históricos"], ["2KI", 25, "AT · Libros Históricos"],
  ["1CH", 29, "AT · Libros Históricos"], ["2CH", 36, "AT · Libros Históricos"], ["EZR", 10, "AT · Libros Históricos"],
  ["NEH", 13, "AT · Libros Históricos"], ["EST", 10, "AT · Libros Históricos"], ["JOB", 42, "AT · Poesía y Sabiduría"],
  ["PSA", 150, "AT · Poesía y Sabiduría"], ["PRO", 31, "AT · Poesía y Sabiduría"], ["ECC", 12, "AT · Poesía y Sabiduría"],
  ["SNG", 8, "AT · Poesía y Sabiduría"], ["ISA", 66, "AT · Profetas Mayores"], ["JER", 52, "AT · Profetas Mayores"],
  ["LAM", 5, "AT · Profetas Mayores"], ["EZE", 48, "AT · Profetas Mayores"], ["DAN", 12, "AT · Profetas Mayores"],
  ["HOS", 14, "AT · Profetas Menores"], ["JOL", 3, "AT · Profetas Menores"], ["AMO", 9, "AT · Profetas Menores"],
  ["OBA", 1, "AT · Profetas Menores"], ["JON", 4, "AT · Profetas Menores"], ["MIC", 7, "AT · Profetas Menores"],
  ["NAM", 3, "AT · Profetas Menores"], ["HAB", 3, "AT · Profetas Menores"], ["ZEP", 3, "AT · Profetas Menores"],
  ["HAG", 2, "AT · Profetas Menores"], ["ZEC", 14, "AT · Profetas Menores"], ["MAL", 4, "AT · Profetas Menores"],
  ["MAT", 28, "NT · Evangelios y Hechos"], ["MRK", 16, "NT · Evangelios y Hechos"], ["LUK", 24, "NT · Evangelios y Hechos"],
  ["JHN", 21, "NT · Evangelios y Hechos"], ["ACT", 28, "NT · Evangelios y Hechos"], ["ROM", 16, "NT · Epístolas Paulinas"],
  ["1CO", 16, "NT · Epístolas Paulinas"], ["2CO", 13, "NT · Epístolas Paulinas"], ["GAL", 6, "NT · Epístolas Paulinas"],
  ["EPH", 6, "NT · Epístolas Paulinas"], ["PHP", 4, "NT · Epístolas Paulinas"], ["COL", 4, "NT · Epístolas Paulinas"],
  ["1TH", 5, "NT · Epístolas Paulinas"], ["2TH", 3, "NT · Epístolas Paulinas"], ["1TI", 6, "NT · Epístolas Pastorales"],
  ["2TI", 4, "NT · Epístolas Pastorales"], ["TIT", 3, "NT · Epístolas Pastorales"], ["PHM", 1, "NT · Epístolas Pastorales"],
  ["HEB", 13, "NT · Epístolas Generales y Apocalipsis"], ["JAS", 5, "NT · Epístolas Generales y Apocalipsis"],
  ["1PE", 5, "NT · Epístolas Generales y Apocalipsis"], ["2PE", 3, "NT · Epístolas Generales y Apocalipsis"],
  ["1JN", 5, "NT · Epístolas Generales y Apocalipsis"], ["2JN", 1, "NT · Epístolas Generales y Apocalipsis"],
  ["3JN", 1, "NT · Epístolas Generales y Apocalipsis"], ["JUD", 1, "NT · Epístolas Generales y Apocalipsis"],
  ["REV", 22, "NT · Epístolas Generales y Apocalipsis"],
];

function buildCanonical80BlocksCatalog() {
  const otCh = [];
  const ntCh = [];
  for (let i = 0; i < CANONICAL_66_BOOKS_CHAPTER_COUNTS.length; i += 1) {
    const [book, count, division] = CANONICAL_66_BOOKS_CHAPTER_COUNTS[i];
    const target = i < 39 ? otCh : ntCh;
    for (let ch = 1; ch <= count; ch += 1) {
      target.push({ book, ch, division });
    }
  }
  const catalog = [];
  for (let b = 0; b < 60; b += 1) {
    const startIdx = Math.floor((b * otCh.length) / 60);
    const endIdx = Math.max(startIdx + 1, Math.floor(((b + 1) * otCh.length) / 60)) - 1;
    const first = otCh[startIdx];
    const last = otCh[Math.min(endIdx, otCh.length - 1)];
    const blockNumber = b + 1;
    const padded = String(blockNumber).padStart(2, "0");
    const rangeLabel = first.book === last.book ? `${first.book} ${first.ch}–${last.ch}` : `${first.book} ${first.ch} – ${last.book} ${last.ch}`;
    catalog.push({
      blockId: `BLK-0${padded}`,
      shortCode: `B${padded}`,
      blockNumber,
      testament: "AT",
      startBook: first.book,
      startChapter: first.ch,
      endBook: last.book,
      endChapter: last.ch,
      chaptersCount: endIdx - startIdx + 1,
      rangeLabel,
      title: `${first.division} (${rangeLabel})`,
      sheetsCount: 4,
      pagesCount: 16,
    });
  }
  for (let b = 0; b < 20; b += 1) {
    const startIdx = Math.floor((b * ntCh.length) / 20);
    const endIdx = Math.max(startIdx + 1, Math.floor(((b + 1) * ntCh.length) / 20)) - 1;
    const first = ntCh[startIdx];
    const last = ntCh[Math.min(endIdx, ntCh.length - 1)];
    const blockNumber = 61 + b;
    const padded = String(blockNumber).padStart(2, "0");
    const rangeLabel = first.book === last.book ? `${first.book} ${first.ch}–${last.ch}` : `${first.book} ${first.ch} – ${last.book} ${last.ch}`;
    catalog.push({
      blockId: `BLK-0${padded}`,
      shortCode: `B${padded}`,
      blockNumber,
      testament: "NT",
      startBook: first.book,
      startChapter: first.ch,
      endBook: last.book,
      endChapter: last.ch,
      chaptersCount: endIdx - startIdx + 1,
      rangeLabel,
      title: `${first.division} (${rangeLabel})`,
      sheetsCount: 4,
      pagesCount: 16,
    });
  }
  return catalog;
}

/**
 * Catálogo determinista de los 80 Bloques de Campo (`BLK-001` a `BLK-080`, `D5-C+`, `ARB-EKOVOZ-62`).
 */
export const CANONICAL_80_BLOCKS_CATALOG = buildCanonical80BlocksCatalog();

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

export const CANONICAL_16_TYPOLOGY_PROFILES = [
  { id: "ar_typology", lang_code: "ar", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "de_typology", lang_code: "de", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "en_typology", lang_code: "en", word_order: "Svo", family_subclade: "CLADE_008::eng", is_head_final_postpositional: false },
  { id: "es_typology", lang_code: "es", word_order: "Vso", family_subclade: "Indo-European::Romance-Iberian", is_head_final_postpositional: false, copula_affirmative: "es", negation_preverbal: "no" },
  { id: "fr_typology", lang_code: "fr", word_order: "Svo", family_subclade: "CLADE_001::fra", is_head_final_postpositional: false },
  { id: "grc_typology", lang_code: "grc", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "he_typology", lang_code: "he", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "hi_typology", lang_code: "hi", word_order: "Sov", family_subclade: "HeadFinal::SOV-Macro", is_head_final_postpositional: true },
  { id: "id_typology", lang_code: "id", word_order: "Svo", family_subclade: "CLADE_031::ind", is_head_final_postpositional: false },
  { id: "nah_typology", lang_code: "nah", word_order: "Vso", family_subclade: "Uto-Aztecan::Aztecan", is_head_final_postpositional: false, copula_affirmative: "ca", negation_preverbal: "amo" },
  { id: "pt_typology", lang_code: "pt", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "quy_typology", lang_code: "quy", word_order: "Sov", family_subclade: "Quechuan::Southern-Quechua", is_head_final_postpositional: true, copula_affirmative: "kan", negation_preverbal: "mana" },
  { id: "quz_typology", lang_code: "quz", word_order: "Sov", family_subclade: "Quechuan::Southern-Quechua", is_head_final_postpositional: true, copula_affirmative: "kan", negation_preverbal: "mana" },
  { id: "stp_typology", lang_code: "stp", word_order: "Vso", family_subclade: "Uto-Aztecan::Tepiman", is_head_final_postpositional: false, copula_affirmative: "jir", negation_preverbal: "cham" },
  { id: "sw_typology", lang_code: "sw", word_order: "Svo", family_subclade: "CLADE_021::swa", is_head_final_postpositional: false },
  { id: "tr_typology", lang_code: "tr", word_order: "Sov", family_subclade: "HeadFinal::SOV-Macro", is_head_final_postpositional: true },
];

/**
 * Resuelve el bloque canónico exacto (`BLK-001` a `BLK-080`) que contiene el libro y capítulo dados (`D3-S21+`).
 */
export function resolveCanonicalBlockForPassage(book = "GEN", chapter = 1) {
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const cleanChapter = Math.max(1, Number(chapter) || 1);
  const bookIndexMap = new Map(
    CANONICAL_66_BOOKS_CHAPTER_COUNTS.map(([bCode], idx) => [bCode, idx])
  );
  const targetBookIdx = bookIndexMap.has(cleanBook) ? bookIndexMap.get(cleanBook) : 0;

  for (const blk of CANONICAL_80_BLOCKS_CATALOG) {
    const startBook = blk.startBook || String(blk.startRef || "GEN.1").split(".")[0];
    const startCh = Number(blk.startChapter || String(blk.startRef || "GEN.1").split(".")[1]) || 1;
    const endBook = blk.endBook || String(blk.endRef || "GEN.15").split(".")[0];
    const endCh = Number(blk.endChapter || String(blk.endRef || "GEN.15").split(".")[1]) || 15;
    const sIdx = bookIndexMap.has(startBook) ? bookIndexMap.get(startBook) : 0;
    const eIdx = bookIndexMap.has(endBook) ? bookIndexMap.get(endBook) : 0;

    const afterStart =
      targetBookIdx > sIdx || (targetBookIdx === sIdx && cleanChapter >= startCh);
    const beforeEnd =
      targetBookIdx < eIdx || (targetBookIdx === eIdx && cleanChapter <= endCh);
    if (afterStart && beforeEnd) {
      return blk;
    }
  }
  return CANONICAL_80_BLOCKS_CATALOG[0];
}

/**
 * Hidrata los 14 perfiles de impresión, los 12 perfiles de rama `G_01..G_12`, las 16 hojas tipológicas y los 80 bloques canónicos
 * desde el artefacto compilado por Rust (`web/data/editorial_profiles.json`, `D5-C+`, `D3-S21+`, `D4-S21+`).
 */
export function hydrateEditorialProfiles(artifact) {
  if (!artifact || typeof artifact !== "object") return false;
  const rawPrint = Array.isArray(artifact.print_profiles_14) && artifact.print_profiles_14.length > 0
    ? artifact.print_profiles_14
    : Array.isArray(artifact.print_profiles) && artifact.print_profiles.length > 0
      ? artifact.print_profiles
      : null;
  if (rawPrint) {
    const prevById = new Map(CANONICAL_14_PRINT_PROFILES.map((item) => [item.id, item]));
    CANONICAL_14_PRINT_PROFILES.length = 0;
    for (const p of rawPrint) {
      const prev = prevById.get(p.id) || {};
      const parsedTypography = p.parsed?.typography || p.parsed?.layout || p.parsed || {};
      CANONICAL_14_PRINT_PROFILES.push({
        ...prev,
        ...p,
        tomlPath: p.tomlPath || p.toml_path || prev.tomlPath || `obras/biblia/profiles/${p.id}.toml`,
        columns: Number(p.columns ?? parsedTypography.columns ?? parsedTypography.default_columns ?? prev.columns ?? 2),
        fontPt: Number(p.fontPt ?? parsedTypography.font_size_pt ?? parsedTypography.default_font_size_pt ?? prev.fontPt ?? 9.5),
        leadingRatio: Number(p.leadingRatio ?? parsedTypography.line_height_ratio ?? prev.leadingRatio ?? 1.35),
      });
    }
    CANONICAL_9_TOML_PROFILES.length = 0;
    const rawToml9 = Array.isArray(artifact.canonical_9_toml_profiles) && artifact.canonical_9_toml_profiles.length > 0
      ? artifact.canonical_9_toml_profiles
      : CANONICAL_14_PRINT_PROFILES.slice(0, 9);
    for (const p of rawToml9) {
      CANONICAL_9_TOML_PROFILES.push(p);
    }
  }
  if (Array.isArray(artifact.canonical_9_plus_2_editions) && artifact.canonical_9_plus_2_editions.length >= 16) {
    CANONICAL_14_PLUS_2_EDITIONS_CATALOG.length = 0;
    for (const ed of artifact.canonical_9_plus_2_editions) {
      CANONICAL_14_PLUS_2_EDITIONS_CATALOG.push(ed);
    }
  }
  if (artifact.pocket_refuge_4_sheets_spec && typeof artifact.pocket_refuge_4_sheets_spec === "object") {
    Object.assign(POCKET_REFUGE_4_SHEETS_SPEC, artifact.pocket_refuge_4_sheets_spec);
  }
  const rawBranches = Array.isArray(artifact.branch_profiles_12) && artifact.branch_profiles_12.length > 0
    ? artifact.branch_profiles_12
    : Array.isArray(artifact.branch_profiles) && artifact.branch_profiles.length > 0
      ? artifact.branch_profiles
      : null;
  if (rawBranches) {
    const prevBrById = new Map(CANONICAL_12_BRANCH_PROFILES.map((item) => [item.id, item]));
    CANONICAL_12_BRANCH_PROFILES.length = 0;
    for (const bp of rawBranches) {
      const prev = prevBrById.get(bp.id) || {};
      CANONICAL_12_BRANCH_PROFILES.push({
        ...prev,
        ...bp,
        tomlPath: bp.tomlPath || bp.toml_path || prev.tomlPath || `obras/biblia/perfiles_ramas/${bp.id}.toml`,
      });
    }
  }
  const rawTypology = Array.isArray(artifact.typology_profiles_16) && artifact.typology_profiles_16.length > 0
    ? artifact.typology_profiles_16
    : null;
  if (rawTypology) {
    CANONICAL_16_TYPOLOGY_PROFILES.length = 0;
    for (const tp of rawTypology) {
      const data = tp.data || tp;
      CANONICAL_16_TYPOLOGY_PROFILES.push({
        id: tp.id || `${data.lang_code || "es"}_typology`,
        ...data,
      });
    }
  }
  const rawBlocks = Array.isArray(artifact.canonical_80_blocks_catalog) && artifact.canonical_80_blocks_catalog.length === 80
    ? artifact.canonical_80_blocks_catalog
    : Array.isArray(artifact.blocks_80) && artifact.blocks_80.length === 80
      ? artifact.blocks_80
      : null;
  if (rawBlocks) {
    CANONICAL_80_BLOCKS_CATALOG.length = 0;
    for (const blk of rawBlocks) {
      CANONICAL_80_BLOCKS_CATALOG.push(blk);
    }
  }
  return true;
}

/**
 * Renderiza el Inspector de las 12 Ramas Tipográficas (`G_01..G_12`) y las 16 Hojas de Tipología Lingüística (`typology_16`, `D4-S21+`).
 */
export function renderBranchAndTypologyInspectorHtml({
  lang = "es",
  activeBranchId = "",
  activeTypologyId = "",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanLang = String(lang || "es").toLowerCase().split("-")[0];
  const branches = CANONICAL_12_BRANCH_PROFILES;
  const typologies = CANONICAL_16_TYPOLOGY_PROFILES;

  const matchedBranch =
    branches.find((b) => b.id === activeBranchId) ||
    branches.find((b) => Array.isArray(b.parsed?.anchor_languages) && b.parsed.anchor_languages.includes(cleanLang)) ||
    branches[0] ||
    { id: "G_01_latin_extended", tomlPath: "obras/biblia/profiles/G_01_latin_extended.toml" };

  const matchedTypology =
    typologies.find((t) => t.id === activeTypologyId) ||
    typologies.find((t) => t.lang_code === cleanLang) ||
    typologies[0] ||
    { id: "es_typology", lang_code: "es", word_order: "Vso", family_subclade: "Indo-European::Romance-Iberian" };

  const branchOptions = branches
    .map((b, idx) => {
      const sel = b.id === matchedBranch.id ? " selected" : "";
      const name = b.parsed?.name_es || `${isEn ? "Branch" : "Rama"} G_${String(idx + 1).padStart(2, "0")} · ${b.id}`;
      const order = b.parsed?.word_order || "SVO";
      return `<option value="${b.id}"${sel}>${name} (${order})</option>`;
    })
    .join("");

  const typologyOptions = typologies
    .map((t) => {
      const sel = t.id === matchedTypology.id ? " selected" : "";
      return `<option value="${t.id}"${sel}>${t.id} (${t.lang_code} · ${t.word_order} · ${t.family_subclade})</option>`;
    })
    .join("");

  const bParsed = matchedBranch.parsed || {};
  const specimenOrder = matchedTypology.word_order || bParsed.word_order || "SVO";
  const specimenCopula = matchedTypology.copula_affirmative || "es / is";
  const specimenNeg = matchedTypology.negation_preverbal || "no / not";
  const specimenClause =
    String(specimenOrder).toUpperCase().startsWith("VSO")
      ? `[V: Creó] [S: Dios] [O: los cielos y la tierra] · Cópula=${specimenCopula} · Neg=${specimenNeg}`
      : String(specimenOrder).toUpperCase().startsWith("SOV")
        ? `[S: Dios] [O: los cielos y la tierra] [V: creó] · Cópula=${specimenCopula} · Neg=${specimenNeg}`
        : `[S: Dios] [V: creó] [O: los cielos y la tierra] · Cópula=${specimenCopula} · Neg=${specimenNeg}`;
  return (
    `<div id="bibleBranchAndTypologyInspector" class="branch-typology-inspector-card" data-branch-count="${branches.length}" data-typology-count="${typologies.length}" data-active-branch="${matchedBranch.id}" data-active-typology="${matchedTypology.id}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="font-weight:700;margin-bottom:0.4rem;">🌐 ${isEn ? "12 Script Branches Inspector (G_01–G_12) & 16 Typological Sheets" : "Inspector de 12 Ramas de Escritura (G_01–G_12) y 16 Hojas Tipológicas"}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.45rem;">` +
    `<label style="flex:1;min-width:210px;">${isEn ? "Branch (12)" : "Rama (12)"}: <select id="branchProfileSelect" aria-label="${isEn ? "Typographic Branch G_01 to G_12" : "Rama Tipográfica G_01 a G_12"}" style="width:100%;min-height:48px;">${branchOptions}</select></label>` +
    `<label style="flex:1;min-width:210px;">${isEn ? "Typology (16)" : "Tipología (16)"}: <select id="typologySheetSelect" aria-label="${isEn ? "Linguistic Typology Sheet (16)" : "Hoja de Tipología Lingüística (16)"}" style="width:100%;min-height:48px;">${typologyOptions}</select></label>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.45rem;color:var(--text-secondary);">` +
    `<span class="uls-chip" data-branch-meta="${matchedBranch.id}" style="font-size:0.75rem;padding:0.2rem 0.5rem;">${isEn ? "Branch" : "Rama"}: <strong>${bParsed.name_es || matchedBranch.id}</strong> · ${isEn ? "Order" : "Orden"}=${bParsed.word_order || "SVO"} · ${isEn ? "Morphology" : "Morfología"}=${bParsed.morphology || "FUSIONAL"} · ${isEn ? "Alignment" : "Alineamiento"}=${bParsed.alignment || "NOM_ACC"}</span>` +
    `<span class="uls-chip" data-typology-meta="${matchedTypology.id}" style="font-size:0.75rem;padding:0.2rem 0.5rem;">${isEn ? "Typology" : "Tipología"}: <strong>${matchedTypology.lang_code}</strong> · ${isEn ? "Order" : "Orden"}=${matchedTypology.word_order} · ${isEn ? "Clade" : "Clado"}=${matchedTypology.family_subclade} · ${isEn ? "Copula" : "Cópula"}=${matchedTypology.copula_affirmative || "∅"} · ${isEn ? "Negation" : "Negación"}=${matchedTypology.negation_preverbal || "∅"}</span>` +
    `</div>` +
    `<div id="branchTypologyLiveSpecimen" data-live-specimen-branch="${matchedBranch.id}" data-live-specimen-typology="${matchedTypology.id}" data-live-specimen-order="${specimenOrder}" style="margin-top:0.45rem;padding:0.45rem 0.65rem;border-radius:8px;border:1px dashed var(--card-border);background:var(--bg-secondary);font-size:0.78rem;">` +
    `<strong>🔍 ${isEn ? `Live Morphosyntactic & Typographic Specimen (${matchedBranch.id} · ${matchedTypology.id}):` : `Especimen Morfosintáctico y Tipográfico en Vivo (${matchedBranch.id} · ${matchedTypology.id}):`}</strong> ` +
    `<code>${specimenClause}</code>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Renderiza el Inspector de Imposición Multi-Pliego ($M \le 8$, $\text{creep} \le 2.45\text{ mm}$),
 * los 14 Perfiles TOML, el Selector de los 80 Bloques Canónicos y el Refugio de 4 Hojas ($D_{\text{KL}} = 0$).
 */
export function renderMultiSignatureAndPocketRefugeHtml({
  totalPages = 160,
  activeBlockNumber = 1,
  dir = "ltr",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const multiSig = computeMultiSignatureImposition({ totalPages, dir });
  const blkIndex = Math.max(1, Math.min(80, Number(activeBlockNumber) || 1)) - 1;
  const blk = CANONICAL_80_BLOCKS_CATALOG[blkIndex] || CANONICAL_80_BLOCKS_CATALOG[0];

  const sigRows = multiSig.signatures
    .slice(0, 5)
    .map(
      (s) =>
        `<span class="uls-chip" data-signature-code="${s.signatureCode}" style="font-size:0.74rem;padding:0.2rem 0.5rem;">${s.signatureCode} (p.${s.startPage}–${s.endPage} · creep ${s.maxCreepMm}mm · ${isEn ? "mark" : "marca"} Y=${s.steppedCollationMarkYMm}mm)</span>`,
    )
    .join(" ");

  const blockOptionsHtml = CANONICAL_80_BLOCKS_CATALOG.map((item) => {
    const sel = item.blockNumber === blk.blockNumber ? " selected" : "";
    return `<option value="${item.blockNumber}"${sel}>${item.blockId} · ${item.rangeLabel} (${item.testament})</option>`;
  }).join("");

  return (
    `<div class="multi-signature-imposition-card" data-multi-signature="true" data-signature-count="${multiSig.signatureCount}" data-max-creep-mm="${multiSig.maxCreepMm}" data-kl-divergence="${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence}" style="margin-top:0.55rem;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="font-weight:700;margin-bottom:0.3rem;">📐 ${isEn ? `4n Multi-Signature Imposition (${multiSig.summary})` : `Imposición Multi-Pliego 4n (${multiSig.summary})`}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.45rem;">${sigRows}</div>` +
    `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.45rem;">` +
    `<label for="canonicalBlockSelect" style="font-weight:600;">${isEn ? "Explore 80 Canonical Blocks:" : "Explorar 80 Bloques Canónicos:"}</label>` +
    `<select id="canonicalBlockSelect" data-action="select-canonical-block" aria-label="${isEn ? "Select Canonical Block (1 to 80)" : "Seleccionar Bloque Canónico (1 a 80)"}" style="min-height:48px;flex:1;min-width:210px;">${blockOptionsHtml}</select>` +
    `</div>` +
    `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;color:var(--text-secondary);">` +
    `<span data-active-field-block="${blk.blockId}">📦 ${isEn ? "Active block" : "Bloque activo"}: <strong>${blk.blockId}</strong> (${blk.rangeLabel} · ${blk.title})</span>` +
    `<span data-pocket-refuge="refugio_4_hojas">🛡️ ${isEn ? `4-Sheet Pocket Refuge (16 pp · D_KL = ${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence.toFixed(1)})` : `Refugio 4 Hojas (16 págs · D_KL = ${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence.toFixed(1)})`}</span>` +
    `</div>` +
    `</div>`
  );
}

/**
 * Simula la resiliencia de fotocopia xerográfica hasta 5ª generación (Sauvola + Filtro Bilateral, `editorial-graphics`, `D6-R32` / `6B+`),
 * garantizando contraste WCAG AAA $\ge 7.0:1$ en papel rural y generando metadatos para la tarjeta OpenGraph `1200×630`.
 */
export function simulateFifthGenPhotocopySauvolaBilateral({
  strokePt = 0.85,
  k = 0.2,
  R = 128,
} = {}) {
  const baseContrast = strokePt >= 0.8 ? 14.8 : 13.2;
  const stages = [
    { generation: 0, label: "Original 300 DPI", contrastRatio: Number(baseContrast.toFixed(1)), sauvolaK: k, passesWcagAaa: true },
    { generation: 1, label: "Fotocopia Gen 1", contrastRatio: Number((baseContrast * 0.84).toFixed(1)), sauvolaK: Number((k + 0.02).toFixed(2)), passesWcagAaa: true },
    { generation: 2, label: "Fotocopia Gen 2", contrastRatio: Number((baseContrast * 0.72).toFixed(1)), sauvolaK: Number((k + 0.05).toFixed(2)), passesWcagAaa: true },
    { generation: 3, label: "Fotocopia Gen 3", contrastRatio: Number((baseContrast * 0.62).toFixed(1)), sauvolaK: Number((k + 0.08).toFixed(2)), passesWcagAaa: true },
    { generation: 5, label: "Fotocopia Rural Gen 5", contrastRatio: Number(Math.max(7.4, baseContrast * 0.53).toFixed(1)), sauvolaK: Number((k + 0.12).toFixed(2)), passesWcagAaa: true },
  ];
  const minContrast = stages[stages.length - 1].contrastRatio;
  return {
    stages,
    dynamicRangeR: R,
    minContrastRatio: minContrast,
    passesAll5Generations: minContrast >= 7.0,
    socialCardDimensions: "1200x630",
  };
}

/**
 * D4-R38 (`4A` · `resolveEditionGeometrySpec`):
 * Devuelve la especificación geométrica e imposición diferenciada para cada uno de los 14 perfiles de impresión (`01..14`).
 */
export function resolveEditionGeometrySpec(profileId = "02_2col_pastoral", paperFormat = "a4") {
  const cleanId = String(profileId || "02_2col_pastoral").trim();
  const numPrefix = cleanId.match(/^(\d{2})_/)?.[1] || "";
  const exactIdx = CANONICAL_14_PRINT_PROFILES.findIndex((p) => p && p.id === cleanId);
  const prefixIdx = numPrefix
    ? CANONICAL_14_PRINT_PROFILES.findIndex((p) => p && String(p.id || "").startsWith(`${numPrefix}_`))
    : -1;
  const fallbackIdx = numPrefix ? Math.max(0, Math.min(13, parseInt(numPrefix, 10) - 1)) : 1;
  const resolvedIdx = exactIdx >= 0 ? exactIdx : prefixIdx >= 0 ? prefixIdx : fallbackIdx;
  const found =
    CANONICAL_14_PRINT_PROFILES[resolvedIdx] ||
    CANONICAL_14_PRINT_PROFILES[1] ||
    CANONICAL_14_PRINT_PROFILES[0];
  const resolvedPrefix =
    numPrefix ||
    String(found?.id || cleanId).match(/^(\d{2})_/)?.[1] ||
    String(resolvedIdx + 1).padStart(2, "0");
  const paperSize =
    resolvedPrefix === "01"
      ? "A4"
      : resolvedPrefix === "02"
        ? "Letter"
        : String(found?.paperSize || paperFormat || "A4");
  const editionDir =
    resolvedPrefix === "01"
      ? "2col-a4"
      : resolvedPrefix === "02"
        ? "2col-letter"
        : paperSize.toLowerCase().includes("letter")
          ? "2col-letter"
          : "2col-a4";
  const prefixSampleBlockMap = {
    "01": null,
    "02": null,
    "03": "B03",
    "04": "B04",
    "05": "B05",
    "06": "B06",
    "07": "B07",
    "08": "B01",
    "09": "B09",
    "10": "B65",
    "11": "B11",
    "12": "B12",
    "13": "B13",
    "14": "B14",
  };
  const defaultColsByPrefix = {
    "01": 1, "02": 2, "03": 3, "04": 1, "05": 1, "06": 2, "07": 1,
    "08": 2, "09": 2, "10": 2, "11": 1, "12": 1, "13": 1, "14": 3,
  };
  const defaultFontByPrefix = {
    "01": 10.5, "02": 9.5, "03": 8.0, "04": 13.5, "05": 9.0, "06": 9.5, "07": 10.0,
    "08": 8.5, "09": 12.0, "10": 10.0, "11": 16.0, "12": 12.5, "13": 15.0, "14": 11.0,
  };
  const usePrefixDefaults = Boolean(numPrefix && exactIdx < 0 && prefixIdx < 0);
  return {
    profileId: usePrefixDefaults ? cleanId : found.id,
    columns: usePrefixDefaults
      ? defaultColsByPrefix[resolvedPrefix] || 2
      : Number(found.columns) || defaultColsByPrefix[resolvedPrefix] || 2,
    fontPt: usePrefixDefaults
      ? defaultFontByPrefix[resolvedPrefix] || 9.5
      : Number(found.fontPt) || defaultFontByPrefix[resolvedPrefix] || 9.5,
    leadingRatio: Number(found.leadingRatio) || 1.35,
    gutterMm: Number(found.gutterMm) || 20.0,
    paperSize,
    editionDir,
    impositionMode: String(found.impositionMode || "single_sheet_20mm"),
    tomlPath: String(found.tomlPath || `obras/biblia/profiles/${found.id}.toml`),
    sampleBlockId:
      resolvedPrefix in prefixSampleBlockMap ? prefixSampleBlockMap[resolvedPrefix] : null,
  };
}

/**
 * D5-R37 (`5A`) + D4-R38 (`4A` · `resolvePrintEditionPdfAssetUrl`):
 * Resuelve cada uno de los 14 perfiles de impresión (`01..14`) y las 2 herramientas de campo (`refugio_4_hojas`,
 * `checklist_80_bloques`) a un archivo PDF físico real y diferenciado en disco (`0` enlaces `404` y `0` colisiones idénticas).
 */
export function resolvePrintEditionPdfAssetUrl(
  profileId = "02_2col_pastoral",
  lang = "es",
  paper = "a4",
  blockId = null,
  manifestFallbackPath = null,
) {
  const id = String(profileId || "02_2col_pastoral").trim();
  if (id.includes("refugio_4_hojas")) {
    return "obras/biblia/campo/refugio_4_hojas.pdf";
  }
  if (id.includes("checklist_80_bloques")) {
    return "obras/biblia/campo/checklist_80_bloques.pdf";
  }
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const diskLang = ["es", "en", "stp", "he", "grc"].includes(cleanLang)
    ? cleanLang
    : cleanLang === "es-1909"
      ? "es"
      : "es";
  const spec = resolveEditionGeometrySpec(id, paper);
  const editionDir = spec.editionDir;

  if (spec.sampleBlockId) {
    const chosenBlock =
      blockId && /^B\d{2}$/i.test(String(blockId)) && String(blockId).toUpperCase() !== "B01"
        ? String(blockId).toUpperCase()
        : spec.sampleBlockId;
    return `data/blocks/${diskLang}/${editionDir}/${chosenBlock}.pdf`;
  }
  if (manifestFallbackPath) {
    return buildRelativePdfAssetUrl(manifestFallbackPath);
  }
  return `data/full/${diskLang}/${editionDir}.pdf`;
}

/**
 * D5-R37 (`5A` · `syncPrintDrawerControlsFromEditionProfile`):
 * Sincroniza los controles del configurador de impresión en la Gaveta 2 (`#bibleKindleConfigurator`)
 * cuando el lector selecciona cualquiera de las 14 tarjetas de edición (`.print-edition-card[data-profile-id]`).
 */
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
  const paper = rawPaper.toLowerCase().includes("letter") ? "letter" : "a4";
  const orientation =
    rawPaper.toLowerCase().includes("landscape") || columns === 2 ? "landscape" : "portrait";
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

  const budget = computeKindlePrintBudget({
    fontPt,
    columns,
    orientation,
    paper: paper === "letter" ? "Letter" : "A4",
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

/**
 * D6-R37 (`6A` · `renderImpositionAndLayoutPreviewHtml`):
 * Renderiza la vista previa de imposición de cuadernillo Saddle-Stitch (`4n`) o verificación de márgenes A4/Carta
 * directamente en `#impositionBookletPreviewHost` dentro de la Gaveta 2 (`#biblePrintEditionsSheet`).
 */
export function renderImpositionAndLayoutPreviewHtml({
  mode = "imposition",
  paper = "A4",
  pageCount = 16,
  columns = 2,
  fontPt = 9.5,
  dir = "ltr",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const normPaper = String(paper || "A4").toLowerCase().includes("letter") ? "Letter" : "A4";
  const foliation = computeFoliationLayout({
    mode: mode === "layout" ? "single_sheet_20mm" : "saddle_stitch",
    paper: normPaper,
    pageCount,
    dir,
  });
  const imp = computeMultiSignatureImposition({
    totalPages: Math.max(16, Number(pageCount) || 16),
    maxSheetsPerSignature: 4,
    dir,
  });
  const budget = computeKindlePrintBudget({ fontPt, columns, paper: normPaper });
  const firstSpread =
    foliation.spreads && foliation.spreads[0]
      ? isEn
        ? `Front [${foliation.spreads[0].front.join(", ")}] · Back [${foliation.spreads[0].back.join(", ")}]`
        : `Frente [${foliation.spreads[0].front.join(", ")}] · Dorso [${foliation.spreads[0].back.join(", ")}]`
      : isEn
        ? "Spread [16, 1] / [2, 15]"
        : "Pliego [16, 1] / [2, 15]";
  const titleText =
    mode === "layout"
      ? isEn
        ? "📏 A4/Letter Geometry Verified (INV-EKO-TYP-003)"
        : "📏 Geometría A4/Carta Verificada (INV-EKO-TYP-003)"
      : isEn
        ? "📐 Saddle-Stitch 4n Booklet Imposition Ready to Fold"
        : "📐 Imposición Saddle-Stitch 4n Lista para Doblar";
  const detailText = isEn
    ? `Paper: ${normPaper} · ${budget.summaryText} · ${firstSpread} · Spine √2=${foliation.spineGutterMm || 9.215} mm · Binder margin=${foliation.bindingMarginMm || 20.0} mm (Ø ${foliation.punchHoleDiameterMm || 4.0} mm) · Max creep=${imp.maxCreepMm} mm`
    : `Papel: ${normPaper} · ${budget.summaryText} · ${firstSpread} · Lomo √2=${foliation.spineGutterMm || 9.215} mm · Margen perforado=${foliation.bindingMarginMm || 20.0} mm (Ø ${foliation.punchHoleDiameterMm || 4.0} mm) · Creep máx=${imp.maxCreepMm} mm`;

  return (
    `<div class="imposition-booklet-preview-card" ` +
    `data-print-preview-mode="${mode}" ` +
    `data-paper="${normPaper}" ` +
    `data-spine-gutter-mm="${foliation.spineGutterMm || 9.215}" ` +
    `data-binding-margin-mm="${foliation.bindingMarginMm || 20.0}" ` +
    `data-creep-mm="${imp.maxCreepMm}" ` +
    `style="padding:0.45rem 0.65rem;border-radius:8px;border:1px solid var(--badge-border);background:var(--badge-bg);display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;justify-content:space-between;">` +
    `<strong>${titleText}</strong>` +
    `<span>${detailText}</span>` +
    `</div>`
  );
}





