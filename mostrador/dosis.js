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

/** Dosis 2: el bloque completo que contiene el versículo. */
export function planDose2(locatedOrBlockId, lang, edition) {
  if (typeof locatedOrBlockId === "string") {
    return {
      blockId: locatedOrBlockId,
      url: `data/blocks/${lang || "es"}/${edition || "02_2col_pastoral"}/${locatedOrBlockId}.pdf`,
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

