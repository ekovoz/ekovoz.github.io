// web/mostrador/reference.js — Resolución de citas bíblicas en varios idiomas (Ronda 20, S12).
//
// Toma los nombres, abreviaturas y alias de `web/data/book_names/<lang>.json` (generados desde
// `obras/biblia/indices/book_names_rosetta.tsv`) y resuelve citas como «Jn 3:16», «Juan 3,16»,
// «1 Juan 1:9», «رومية ٨:٢٨», «PSA.119.105» o «यूहन्ना ३:१६».
// Una cita con capítulo o versículo inexistente devuelve `null` (no se recorta en silencio).

const DIGIT_BLOCKS = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0e50, 0x0ed0, 0xff10];

/** Convierte dígitos de cualquier sistema decimal Unicode admitido a ASCII. */
export function asciiDigits(text) {
  let out = "";
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    const base = DIGIT_BLOCKS.find((b) => cp >= b && cp <= b + 9);
    out += base === undefined ? ch : String(cp - base);
  }
  return out;
}

/** Normaliza un nombre de libro: sin marcas diacríticas (NFD + \p{M}), sin puntuación ni espacios. */
export function normalizeBookToken(raw) {
  return asciiDigits(String(raw || ""))
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s.\u05F3\u05F4'"’״׳_\-·]+/g, "");
}

/**
 * Crea un resolutor a partir de uno o varios documentos `book_names` (idioma de lectura, de la UI,
 * inglés…). Si dos libros comparten un alias normalizado, el alias se descarta por ambiguo.
 */
export function createReferenceResolver(bookNamesDocs) {
  const index = new Map();
  const ambiguous = new Set();
  const chaptersByCode = new Map();
  const add = (alias, code) => {
    const key = normalizeBookToken(alias);
    if (!key || ambiguous.has(key)) return;
    const prev = index.get(key);
    if (prev && prev !== code) {
      index.delete(key);
      ambiguous.add(key);
      return;
    }
    index.set(key, code);
  };
  for (const doc of bookNamesDocs.filter(Boolean)) {
    for (const book of doc.books) {
      chaptersByCode.set(book.code, book.chapters);
      add(book.code, book.code);
      add(String(book.ordinal).padStart(2, "0"), book.code);
      add(book.name, book.code);
      add(book.abbr, book.code);
      for (const alias of book.aliases || []) add(alias, book.code);
    }
  }
  return {
    resolveBook(query) {
      const trimmed = String(query || "").trim();
      if (!trimmed) return null;
      return index.get(normalizeBookToken(trimmed)) || null;
    },
    chaptersOf(code) {
      return chaptersByCode.get(code) || 0;
    },
    get aliasCount() {
      return index.size;
    },
  };
}

function validate(code, chapter, verse, verseCounts) {
  const counts = verseCounts && verseCounts[code];
  if (!counts) return null;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > counts.length) return null;
  if (!Number.isInteger(verse) || verse < 1 || verse > counts[chapter - 1]) return null;
  return { book: code, chapter, verse };
}

/**
 * Interpreta una cita libre. `verseCounts` es `catalog.verse_counts`. Devuelve
 * `{ book, chapter, verse }` o `null`.
 */
export function parseReference(input, resolver, verseCounts) {
  const raw = asciiDigits(String(input || "")).trim();
  if (!raw) return null;

  const dot = /^([1-3]?[A-Za-z]{2,3})\.(\d+)(?:\.(\d+))?$/.exec(raw);
  if (dot) {
    const code = resolver.resolveBook(dot[1]);
    if (code) return validate(code, Number(dot[2]), dot[3] ? Number(dot[3]) : 1, verseCounts);
  }

  const ref = /^(.+?)\s*(\d+)(?:\s*[:.,]\s*(\d+))?$/u.exec(raw);
  if (ref) {
    const code = resolver.resolveBook(ref[1]);
    if (code) return validate(code, Number(ref[2]), ref[3] ? Number(ref[3]) : 1, verseCounts);
  }

  const solo = resolver.resolveBook(raw);
  if (solo) return validate(solo, 1, 1, verseCounts);
  return null;
}

export const ROSETTA_66_BOOKS = Object.freeze([
  { ord: 1, code: "GEN", en: "Genesis", es: "Génesis", chapters: 50 },
  { ord: 2, code: "EXO", en: "Exodus", es: "Éxodo", chapters: 40 },
  { ord: 3, code: "LEV", en: "Leviticus", es: "Levítico", chapters: 27 },
  { ord: 4, code: "NUM", en: "Numbers", es: "Números", chapters: 36 },
  { ord: 5, code: "DEU", en: "Deuteronomy", es: "Deuteronomio", chapters: 34 },
  { ord: 6, code: "JOS", en: "Joshua", es: "Josué", chapters: 24 },
  { ord: 7, code: "JDG", en: "Judges", es: "Jueces", chapters: 21 },
  { ord: 8, code: "RUT", en: "Ruth", es: "Rut", chapters: 4 },
  { ord: 9, code: "1SA", en: "1 Samuel", es: "1 Samuel", chapters: 31 },
  { ord: 10, code: "2SA", en: "2 Samuel", es: "2 Samuel", chapters: 24 },
  { ord: 11, code: "1KI", en: "1 Kings", es: "1 Reyes", chapters: 22 },
  { ord: 12, code: "2KI", en: "2 Kings", es: "2 Reyes", chapters: 25 },
  { ord: 13, code: "1CH", en: "1 Chronicles", es: "1 Crónicas", chapters: 29 },
  { ord: 14, code: "2CH", en: "2 Chronicles", es: "2 Crónicas", chapters: 36 },
  { ord: 15, code: "EZR", en: "Ezra", es: "Esdras", chapters: 10 },
  { ord: 16, code: "NEH", en: "Nehemiah", es: "Nehemías", chapters: 13 },
  { ord: 17, code: "EST", en: "Esther", es: "Ester", chapters: 10 },
  { ord: 18, code: "JOB", en: "Job", es: "Job", chapters: 42 },
  { ord: 19, code: "PSA", en: "Psalms", es: "Salmos", chapters: 150 },
  { ord: 20, code: "PRO", en: "Proverbs", es: "Proverbios", chapters: 31 },
  { ord: 21, code: "ECC", en: "Ecclesiastes", es: "Eclesiastés", chapters: 12 },
  { ord: 22, code: "SNG", en: "Song of Solomon", es: "Cantares", chapters: 8 },
  { ord: 23, code: "ISA", en: "Isaiah", es: "Isaías", chapters: 66 },
  { ord: 24, code: "JER", en: "Jeremiah", es: "Jeremías", chapters: 52 },
  { ord: 25, code: "LAM", en: "Lamentations", es: "Lamentaciones", chapters: 5 },
  { ord: 26, code: "EZK", en: "Ezekiel", es: "Ezequiel", chapters: 48 },
  { ord: 27, code: "DAN", en: "Daniel", es: "Daniel", chapters: 12 },
  { ord: 28, code: "HOS", en: "Hosea", es: "Oseas", chapters: 14 },
  { ord: 29, code: "JOL", en: "Joel", es: "Joel", chapters: 3 },
  { ord: 30, code: "AMO", en: "Amos", es: "Amós", chapters: 9 },
  { ord: 31, code: "OBA", en: "Obadiah", es: "Abdías", chapters: 1 },
  { ord: 32, code: "JON", en: "Jonah", es: "Jonás", chapters: 4 },
  { ord: 33, code: "MIC", en: "Micah", es: "Miqueas", chapters: 7 },
  { ord: 34, code: "NAM", en: "Nahum", es: "Nahúm", chapters: 3 },
  { ord: 35, code: "HAB", en: "Habakkuk", es: "Habacuc", chapters: 3 },
  { ord: 36, code: "ZEP", en: "Zephaniah", es: "Sofonías", chapters: 3 },
  { ord: 37, code: "HAG", en: "Haggai", es: "Hageo", chapters: 2 },
  { ord: 38, code: "ZEC", en: "Zechariah", es: "Zacarías", chapters: 14 },
  { ord: 39, code: "MAL", en: "Malachi", es: "Malaquías", chapters: 4 },
  { ord: 40, code: "MAT", en: "Matthew", es: "Mateo", chapters: 28 },
  { ord: 41, code: "MRK", en: "Mark", es: "Marcos", chapters: 16 },
  { ord: 42, code: "LUK", en: "Luke", es: "Lucas", chapters: 24 },
  { ord: 43, code: "JHN", en: "John", es: "Juan", chapters: 21 },
  { ord: 44, code: "ACT", en: "Acts", es: "Hechos", chapters: 28 },
  { ord: 45, code: "ROM", en: "Romans", es: "Romanos", chapters: 16 },
  { ord: 46, code: "1CO", en: "1 Corinthians", es: "1 Corintios", chapters: 16 },
  { ord: 47, code: "2CO", en: "2 Corinthians", es: "2 Corintios", chapters: 13 },
  { ord: 48, code: "GAL", en: "Galatians", es: "Gálatas", chapters: 6 },
  { ord: 49, code: "EPH", en: "Ephesians", es: "Efesios", chapters: 6 },
  { ord: 50, code: "PHP", en: "Philippians", es: "Filipenses", chapters: 4 },
  { ord: 51, code: "COL", en: "Colossians", es: "Colosenses", chapters: 4 },
  { ord: 52, code: "1TH", en: "1 Thessalonians", es: "1 Tesalonicenses", chapters: 5 },
  { ord: 53, code: "2TH", en: "2 Thessalonians", es: "2 Tesalonicenses", chapters: 3 },
  { ord: 54, code: "1TI", en: "1 Timothy", es: "1 Timoteo", chapters: 6 },
  { ord: 55, code: "2TI", en: "2 Timothy", es: "2 Timoteo", chapters: 4 },
  { ord: 56, code: "TIT", en: "Titus", es: "Tito", chapters: 3 },
  { ord: 57, code: "PHM", en: "Philemon", es: "Filemón", chapters: 1 },
  { ord: 58, code: "HEB", en: "Hebrews", es: "Hebreos", chapters: 13 },
  { ord: 59, code: "JAS", en: "James", es: "Santiago", chapters: 5 },
  { ord: 60, code: "1PE", en: "1 Peter", es: "1 Pedro", chapters: 5 },
  { ord: 61, code: "2PE", en: "2 Peter", es: "2 Pedro", chapters: 3 },
  { ord: 62, code: "1JN", en: "1 John", es: "1 Juan", chapters: 5 },
  { ord: 63, code: "2JN", en: "2 John", es: "2 Juan", chapters: 1 },
  { ord: 64, code: "3JN", en: "3 John", es: "3 Juan", chapters: 1 },
  { ord: 65, code: "JUD", en: "Jude", es: "Judas", chapters: 1 },
  { ord: 66, code: "REV", en: "Revelation", es: "Apocalipsis", chapters: 22 },
]);

export const normalizeBookAliasToken = normalizeBookToken;

const DEFAULT_BOOK_RESOLVER = createReferenceResolver([
  {
    books: ROSETTA_66_BOOKS.map((b) => ({
      ordinal: b.ord,
      code: b.code,
      name: b.en,
      abbr: b.code.toLowerCase(),
      chapters: b.chapters,
      aliases: [b.es, b.en.slice(0, 3), b.es.slice(0, 3)],
    })),
  },
]);

export function resolveBookCodeByAliasOrName(query) {
  return DEFAULT_BOOK_RESOLVER.resolveBook(query);
}

export function parseBiblicalCoordinateReference(input) {
  const raw = asciiDigits(String(input || "")).trim();
  if (!raw) return null;
  const dot = /^([1-3]?[A-Za-z]{2,3})\.(\d+)(?:\.(\d+))?$/.exec(raw);
  if (dot) {
    const bookCode = resolveBookCodeByAliasOrName(dot[1]) || dot[1].toUpperCase();
    const bookMeta = ROSETTA_66_BOOKS.find((b) => b.code === bookCode);
    const chapter = Number(dot[2]) || 1;
    const verse = dot[3] ? Number(dot[3]) : 1;
    if (bookMeta && chapter >= 1 && chapter <= bookMeta.chapters) {
      return { book: bookCode, bookCode, chapter, verse };
    }
  }
  const ref = /^(.+?)\s*(\d+)(?:\s*[:.,]\s*(\d+))?$/u.exec(raw);
  if (ref) {
    const bookCode = resolveBookCodeByAliasOrName(ref[1]);
    if (bookCode) {
      const bookMeta = ROSETTA_66_BOOKS.find((b) => b.code === bookCode);
      const chapter = Number(ref[2]) || 1;
      const verse = ref[3] ? Number(ref[3]) : 1;
      if (bookMeta && chapter >= 1 && chapter <= bookMeta.chapters) {
        return { book: bookCode, bookCode, chapter, verse };
      }
    }
  }
  const solo = resolveBookCodeByAliasOrName(raw);
  if (solo) return { book: solo, bookCode: solo, chapter: 1, verse: 1 };
  return null;
}

