// web/mostrador/data_layer.js — Capa de datos única del Mostrador (Ronda 20, S09, Decisiones D1 y D5).
//
// Puertos y adaptadores: la capa recibe un `source` con `getJson(ruta)` y `getBytes(ruta)`.
// En el navegador se usa `createFetchSource` (same-origin, GitHub Pages); en las pruebas, un
// adaptador que lee los mismos archivos del disco. No hay ramas para Node: este módulo no conoce
// `process`, `fs` ni `require`.
//
// Regla de honestidad: si un capítulo no existe en el idioma pedido, el estado es `unavailable`.
// Nunca se muestra otro capítulo en su lugar.

export const STATUS = Object.freeze({ LOADING: "loading", READY: "ready", UNAVAILABLE: "unavailable" });

export const MATRIX_ROW_COLUMNS = Object.freeze([
  "c01_ordinal_31102",
  "verse",
  "c03_source_corpus",
  "c04_word_pos",
  "c05_orig_text",
  "c06_translit",
  "c07_strong_id",
  "c08_morph_code",
  "c09_macula_role",
  "c10_clause_id",
  "c11_semantic_domain",
  "c12_gloss_es",
  "c13_nsm_65",
  "c14_target_gloss",
]);

const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const BOOK_RE = /^[1-3A-Z][A-Z0-9]{2}$/;
const EDITION_RE = /^[a-z0-9_-]{1,32}$/;

const EDITION_ALIASES = Object.freeze({
  "02_2col_pastoral": "2col-a4",
  "01_1col_lectura": "2col-a4",
});

function normalizeEditionSlug(edition) {
  const raw = String(edition || "2col-a4").trim();
  return EDITION_ALIASES[raw] || raw;
}

/** Adaptador de red: rutas relativas al sitio (`data/...`), mismo origen. */
export function createFetchSource({ baseUrl = "", fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("createFetchSource requiere fetch");
  const url = (rel) => `${baseUrl}${rel}`;
  return {
    async getJson(rel) {
      const resp = await fetchImpl(url(rel));
      if (!resp || !resp.ok) return null;
      return resp.json();
    },
    async getBytes(rel) {
      const resp = await fetchImpl(url(rel));
      if (!resp || !resp.ok) return null;
      return new Uint8Array(await resp.arrayBuffer());
    },
  };
}

/** Caché LRU mínima con deduplicación de peticiones en vuelo. */
function createLru(limit) {
  const values = new Map();
  const inflight = new Map();
  return {
    async get(key, producer) {
      if (values.has(key)) {
        const v = values.get(key);
        values.delete(key);
        values.set(key, v);
        return v;
      }
      if (inflight.has(key)) return inflight.get(key);
      const promise = (async () => {
        try {
          const v = await producer();
          if (v !== null && v !== undefined) {
            values.set(key, v);
            while (values.size > limit) values.delete(values.keys().next().value);
          }
          return v;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, promise);
      return promise;
    },
    get size() {
      return values.size;
    },
  };
}

/**
 * Crea la capa de datos. Todas las funciones devuelven objetos con `status` explícito.
 */
export function createDataLayer({ source, cacheLimit = 32 } = {}) {
  const sourceGetJson = source && (source.getJson || source.readJson);
  const sourceGetBytes = source && (source.getBytes || source.readBytes);
  if (typeof sourceGetJson !== "function") throw new TypeError("createDataLayer requiere source.getJson");
  const jsonCache = createLru(cacheLimit);
  const bytesCache = createLru(Math.max(4, Math.floor(cacheLimit / 4)));
  let generation = 0;

  const getJson = (rel) => jsonCache.get(rel, () => sourceGetJson.call(source, rel));

  async function loadCatalog() {
    return getJson("data/catalog.json");
  }

  async function loadManifest() {
    return getJson("downloads_manifest.json");
  }

  async function loadBookNames(lang) {
    if (!LANG_RE.test(lang)) return null;
    return getJson(`data/book_names/${lang}.json`);
  }

  async function loadBookText(lang, book) {
    if (!LANG_RE.test(String(lang)) || !BOOK_RE.test(String(book))) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "invalid_key" };
    }
    const data = await getJson(`data/text/${lang}/${book}.json`);
    if (!data || data.book !== book || data.lang !== lang) {
      return { status: STATUS.UNAVAILABLE, data: null, reason: "missing" };
    }
    return { status: STATUS.READY, data, provenance: data.provenance };
  }

  /** Devuelve los versículos de un capítulo: `{ status, key, lang, verses: [{start, end, text}], provenance }`. */
  async function loadChapter({ lang, book, chapter }) {
    const ch = Number(chapter);
    const key = `${book}.${ch}`;
    const bookResult = await loadBookText(lang, book);
    if (bookResult.status !== STATUS.READY) return { status: STATUS.UNAVAILABLE, key, lang, verses: [], reason: bookResult.reason };
    const raw = Number.isInteger(ch) && ch >= 1 ? bookResult.data.chapters[ch - 1] : undefined;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { status: STATUS.UNAVAILABLE, key, lang, verses: [], reason: "empty_chapter", provenance: bookResult.provenance };
    }
    const verses = raw.map(([start, end, text]) => ({ start, end, text }));
    const pericopeBreaks = (bookResult.data.pericope_breaks || [])
      .filter(([c]) => c === ch)
      .map(([, verse, kind]) => ({ verse, kind }));
    return {
      status: STATUS.READY,
      key,
      lang,
      book,
      chapter: ch,
      verses,
      pericopeBreaks,
      provenance: bookResult.provenance,
      corpusRev: bookResult.data.corpus_rev,
    };
  }

  /** Filas de la Matriz Original de 14 columnas de un capítulo (`columns` + `rows` compactas). */
  async function loadChapterMatrix(book, chapter) {
    const ch = Number(chapter);
    if (!BOOK_RE.test(String(book)) || !Number.isInteger(ch) || ch < 1) {
      return { status: STATUS.UNAVAILABLE, reason: "invalid_key" };
    }
    const data = await getJson(`data/matrix/${book}/${ch}.json`);
    if (!data || data.book !== book || Number(data.chapter) !== ch || !Array.isArray(data.rows)) {
      return { status: STATUS.UNAVAILABLE, reason: "missing" };
    }
    return { status: STATUS.READY, ...data };
  }

  async function loadPages(lang, edition) {
    const ed = normalizeEditionSlug(edition);
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed)) return null;
    return getJson(`data/pages/${lang}/${ed}.pages.json`);
  }

  async function loadBytes(rel) {
    if (typeof sourceGetBytes !== "function") return null;
    if (!/^data\/[A-Za-z0-9._/-]+$/.test(rel) || rel.includes("..")) return null;
    return bytesCache.get(rel, () => sourceGetBytes.call(source, rel));
  }

  async function loadBlockPdf(lang, edition, blockId) {
    const ed = normalizeEditionSlug(edition);
    const normBlock = String(blockId || "")
      .trim()
      .replace(/^BLK-0?(\d{2})$/i, "B$1");
    if (!LANG_RE.test(String(lang)) || !EDITION_RE.test(ed) || !/^B\d{2}$/.test(normBlock)) return null;
    return loadBytes(`data/blocks/${lang}/${ed}/${normBlock}.pdf`);
  }

  async function loadI18nIndex() {
    return getJson("i18n/index.json");
  }

  async function loadUiCatalog(loc) {
    if (!LANG_RE.test(String(loc))) return null;
    return getJson(`i18n/${loc}.json`);
  }

  /**
   * Inicia una navegación. Devuelve `{ generation, isCurrent(), result }` y además es thenable
   * (`await navigate(state)`) para soportar tanto `{ isCurrent, result }` como `await dataLayer.navigate(state)`.
   */
  function navigate(state) {
    generation += 1;
    const mine = generation;
    const isCurrent = () => mine === generation;
    const result = loadChapter(state);
    const enrichedPromise = result.then((chapterRes) => {
      const versesMap = {};
      if (Array.isArray(chapterRes.verses)) {
        for (const v of chapterRes.verses) {
          if (v && v.start !== undefined) {
            versesMap[String(v.start)] = v.text;
          }
        }
      }
      return {
        ...chapterRes,
        stale: !isCurrent(),
        chapter:
          chapterRes.status === STATUS.READY
            ? {
                verses: versesMap,
                rawVerses: chapterRes.verses,
                pericopeBreaks: chapterRes.pericopeBreaks,
              }
            : null,
        meta: {
          draft_status: chapterRes.provenance?.status || "",
        },
      };
    });
    return {
      generation: mine,
      isCurrent,
      result,
      then: (onFulfilled, onRejected) => enrichedPromise.then(onFulfilled, onRejected),
    };
  }

  return {
    loadCatalog,
    loadManifest,
    loadBookNames,
    loadBookText,
    loadChapter,
    loadChapterMatrix,
    loadMatrixChapter: loadChapterMatrix,
    loadPages,
    loadPageIndex: loadPages,
    loadBytes,
    loadBlockPdf,
    loadI18nIndex,
    loadUiCatalog,
    navigate,
    get generation() {
      return generation;
    },
  };
}

