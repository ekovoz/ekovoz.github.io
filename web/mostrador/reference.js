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

const EXTRA_COMMON_BOOK_ALIASES = {
  GEN: ["gn", "gen"], EXO: ["ex", "exo"], LEV: ["lv", "lev"], NUM: ["nm", "num"], DEU: ["dt", "deu"],
  JOS: ["js", "jos"], JDG: ["jc", "jue", "jdg"], RUT: ["rt"], "1SA": ["1s", "1sm"], "2SA": ["2s", "2sm"],
  "1KI": ["1r", "1re"], "2KI": ["2r", "2re"], "1CH": ["1cr"], "2CH": ["2cr"], EZR: ["esd"], NEH: ["ne"],
  EST: ["et"], JOB: ["jb"], PSA: ["sal", "sl", "ps"], PRO: ["pr", "prv"], ECC: ["ec"], SNG: ["cnt", "ct"],
  ISA: ["is"], JER: ["jr"], LAM: ["lm"], EZK: ["ez"], DAN: ["dn"], HOS: ["os"], JOL: ["jl"], AMO: ["am"],
  OBA: ["abd", "ob"], JON: ["jon"], MIC: ["mi", "mq"], NAM: ["na"], HAB: ["hab"], ZEP: ["sof"], HAG: ["hag"],
  ZEC: ["zac"], MAL: ["ml", "mal"], MAT: ["mt", "mat"], MRK: ["mc", "mr", "mk"], LUK: ["lc", "lk", "lu"],
  JHN: ["jn", "jh"], ACT: ["hch", "hech", "ac"], ROM: ["rm", "ro"], "1CO": ["1co"], "2CO": ["2co"],
  GAL: ["ga", "gl"], EPH: ["ef", "eph"], PHP: ["fil", "flp", "php"], COL: ["col"], "1TH": ["1ts"],
  "2TH": ["2ts"], "1TI": ["1tm", "1ti"], "2TI": ["2tm", "2ti"], TIT: ["tt", "tit"], PHM: ["flm", "phm"],
  HEB: ["heb", "hb"], JAS: ["stg", "st", "jas"], "1PE": ["1p", "1pe"], "2PE": ["2p", "2pe"],
  "1JN": ["1jn", "1jo"], "2JN": ["2jn", "2jo"], "3JN": ["3jn", "3jo"], JUD: ["jud", "jd"], REV: ["ap", "apoc"],
};

const DEFAULT_BOOK_RESOLVER = createReferenceResolver([
  {
    books: ROSETTA_66_BOOKS.map((b) => ({
      ordinal: b.ord,
      code: b.code,
      name: b.en,
      abbr: b.code.toLowerCase(),
      chapters: b.chapters,
      aliases: [b.es, b.en.slice(0, 3), b.es.slice(0, 3), ...(EXTRA_COMMON_BOOK_ALIASES[b.code] || [])],
    })),
  },
]);

const DEFAULT_VERSE_COUNTS = Object.fromEntries(
  ROSETTA_66_BOOKS.map((b) => [b.code, Array.from({ length: b.chapters }, () => 176)]),
);

export function resolveBookCodeByAliasOrName(query) {
  return DEFAULT_BOOK_RESOLVER.resolveBook(query);
}

export function parseBiblicalCoordinateReference(input, verseCounts = null) {
  const raw = asciiDigits(String(input || "")).trim();
  if (!raw) return null;
  const parsed = parseReference(raw, DEFAULT_BOOK_RESOLVER, verseCounts || DEFAULT_VERSE_COUNTS);
  if (parsed && parsed.book) {
    return {
      book: parsed.book,
      bookCode: parsed.book,
      chapter: parsed.chapter,
      verse: parsed.verse,
    };
  }
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


/**
 * Hidrata los 24 idiomas/paquetes `.ekpack` desde `packs_manifest.json` u `offline_packs_catalog.json`
 * preservando rutas Same-Origin (`/packs/<lang>.ekpack` para remotos y `/data/packs/` o `/packs/`).
 */
export function hydratePackLanguagesFromManifest(packsManifest = null) {
  const rawPacks = Array.isArray(packsManifest)
    ? packsManifest
    : Array.isArray(packsManifest?.packs)
      ? packsManifest.packs
      : [];
  const availableList = Array.isArray(packsManifest?.available_pack_langs)
    ? packsManifest.available_pack_langs
    : [];
  const seen = new Set();
  const packs = [];
  const seedLangs = new Set(["es", "en", "stp", "he", "grc"]);

  for (const p of rawPacks) {
    const cleanLang = String(p?.lang || "").trim();
    if (!cleanLang || seen.has(cleanLang)) continue;
    seen.add(cleanLang);
    const sameOriginUrl = String(
      p?.sameOriginShardUrl || `/packs/${cleanLang}.ekpack`,
    ).trim();
    const rawRel = String(p?.ekpackUrl || p?.url || "").trim();
    const fallbackUrl = seedLangs.has(cleanLang)
      ? `/${(rawRel || `data/packs/${cleanLang}.ekpack`).replace(/^\/+/, "")}`
      : `/packs/${cleanLang}.ekpack`;
    packs.push({
      lang: cleanLang,
      file: String(p?.ekpackFile || p?.file || `${cleanLang}.ekpack`).trim(),
      url: sameOriginUrl || fallbackUrl,
      sameOriginPackUrl: `/packs/${cleanLang}.ekpack`,
      bytes: Number(p?.bytes || p?.ekpackBytes) || 0,
      verses: Number(p?.canonicalVersesPresent || p?.verses) || 0,
      sha256: String(p?.ekpackSha256 || p?.sha256 || "").trim(),
      ebibleId: String(p?.ebibleId || "").trim(),
      sovereignTier: String(p?.sovereignTier || "").trim(),
    });
  }

  for (const code of availableList) {
    const cleanLang = String(code || "").trim();
    if (!cleanLang || seen.has(cleanLang)) continue;
    seen.add(cleanLang);
    packs.push({
      lang: cleanLang,
      file: `${cleanLang}.ekpack`,
      url: `/packs/${cleanLang}.ekpack`,
      sameOriginPackUrl: `/packs/${cleanLang}.ekpack`,
      bytes: 0,
      verses: 0,
      sha256: "",
      ebibleId: "",
      sovereignTier: "",
    });
  }

  return {
    totalPacks: packs.length,
    langs: packs.map((p) => p.lang),
    packs,
  };
}

/**
 * Búsqueda unificada tipo Spotlight sobre citas bíblicas, códigos Strong (`H####`/`G####`),
 * `canon_lexicon.json` (Los Felices / índices multilingües) y versículos del capítulo cargado.
 */
export function searchSpotlightCorpus({
  query = "",
  canonLexicon = null,
  loadedVerses = null,
  book = "GEN",
  chapter = 1,
  lang = "es",
  limit = 12,
} = {}) {
  const rawQuery = String(query || "").trim();
  if (!rawQuery) return [];
  const maxItems = Math.max(1, Math.min(50, Number(limit) || 12));
  const normQuery = normalizeBookToken(asciiDigits(rawQuery));
  const cleanBook = String(book || "GEN").trim().toUpperCase() || "GEN";
  const cleanChap = Math.max(1, Number(chapter) || 1);
  const results = [];
  const seenKeys = new Set();

  const pushUnique = (item) => {
    const key = `${item.kind}:${item.book}:${item.chapter}:${item.verse}:${item.strongId || item.term || ""}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    results.push(item);
  };

  const parsedCitation = parseBiblicalCoordinateReference(rawQuery);
  if (parsedCitation && parsedCitation.bookCode) {
    pushUnique({
      kind: "citation",
      label: `${parsedCitation.bookCode} ${parsedCitation.chapter}:${parsedCitation.verse}`,
      book: parsedCitation.bookCode,
      chapter: parsedCitation.chapter || 1,
      verse: parsedCitation.verse || 1,
      work: "biblia",
      score: 100,
    });
  }

  const strongMatches = rawQuery.match(/\b[HG]\d{1,5}\b/gi) || [];
  for (const sToken of strongMatches) {
    const sid = sToken.toUpperCase();
    pushUnique({
      kind: "strong",
      strongId: sid,
      label: `Strong ${sid}`,
      book: cleanBook,
      chapter: cleanChap,
      verse: 1,
      work: "biblia",
      score: 95,
    });
  }

  if (canonLexicon && typeof canonLexicon === "object" && normQuery.length >= 2) {
    const felicesDict = canonLexicon.felices;
    if (felicesDict && typeof felicesDict === "object") {
      const cleanLang = String(lang || "es").trim().toLowerCase();
      const langOrder = Array.from(
        new Set([cleanLang, cleanLang.split("-")[0], "es", "en", ...Object.keys(felicesDict)]),
      );
      for (const lKey of langOrder) {
        const termsMap = felicesDict[lKey];
        if (!termsMap || typeof termsMap !== "object") continue;
        for (const [term, plateVal] of Object.entries(termsMap)) {
          const normTerm = normalizeBookToken(term);
          if (!normTerm) continue;
          if (normTerm.includes(normQuery) || normQuery.includes(normTerm)) {
            const plates = Array.isArray(plateVal)
              ? plateVal.map((n) => Number(n)).filter((n) => n >= 1)
              : [Number(plateVal) || 1];
            pushUnique({
              kind: "lexicon",
              term,
              lexiconLang: lKey,
              plates,
              label: `${term} (${lKey}) → Felices #${plates.join(",")}`,
              work: "felices",
              book: "MAT",
              chapter: 5,
              verse: 3,
              score: normTerm === normQuery ? 90 : 80,
            });
          }
        }
      }
    }
  }

  if (loadedVerses && typeof loadedVerses === "object" && normQuery.length >= 2) {
    const entries = Array.isArray(loadedVerses)
      ? loadedVerses
      : Object.entries(loadedVerses);
    for (const [vKey, vText] of entries) {
      const vNum = Math.max(1, Number(vKey) || 1);
      const rawText = String(vText || "");
      const normText = normalizeBookToken(rawText);
      if (normText && normText.includes(normQuery)) {
        pushUnique({
          kind: "verse",
          label: `${cleanBook} ${cleanChap}:${vNum}`,
          snippet: rawText.slice(0, 120),
          work: "biblia",
          book: cleanBook,
          chapter: cleanChap,
          verse: vNum,
          score: 70,
        });
      }
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return results.slice(0, maxItems);
}
