// ============================================================================
// web/mostrador/concordance_search.js — Búsqueda de Concordancia en RAM & Auditor USFM 8 Candados
// Pure L0 (`ARB-EKOVOZ-62`, cero side-effects DOM globales, 0 red)
// ============================================================================

import { validateAllEightLocksPda } from "./mejorar_locks_pda.js";

/**
 * Pliega acentos diacríticos y normaliza a NFC/minúsculas para concordancia determinista.
 */
export function normalizeSearchFold(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveChapterVersesEntries(chapterEntry) {
  if (Array.isArray(chapterEntry)) {
    return chapterEntry.map((tuple) => ({
      verse: Number(tuple?.[0]) || 1,
      text: String(tuple?.[2] ?? tuple?.[1] ?? ""),
    }));
  }
  if (chapterEntry && typeof chapterEntry === "object" && chapterEntry.verses) {
    return Object.entries(chapterEntry.verses).map(([vKey, vText]) => ({
      verse: Number(vKey) || 1,
      text: String(vText ?? ""),
    }));
  }
  return [];
}

/**
 * Busca en los capítulos cargados de un libro (`.ekpack` en RAM o JSON offline)
 * sin tocar la red, con plegado diacrítico.
 */
export function searchBookVersesConcordance({
  bookData,
  book = "GEN",
  query = "",
  limit = 16,
} = {}) {
  const foldedQuery = normalizeSearchFold(query);
  if (!foldedQuery || foldedQuery.length < 2 || !bookData || typeof bookData !== "object") {
    return [];
  }
  const cleanBook = String(book || bookData.book || "GEN").toUpperCase();
  const maxResults = Math.max(1, Number(limit) || 16);
  const hits = [];

  const chaptersRaw = bookData.chapters;
  const chapterPairs = Array.isArray(chaptersRaw)
    ? chaptersRaw.map((chData, idx) => [idx + 1, chData])
    : chaptersRaw && typeof chaptersRaw === "object"
      ? Object.entries(chaptersRaw)
          .map(([chKey, chData]) => [Number(chKey) || 1, chData])
          .sort((a, b) => a[0] - b[0])
      : [];

  for (const [chapterNum, chapterEntry] of chapterPairs) {
    const entries = resolveChapterVersesEntries(chapterEntry);
    for (const { verse, text } of entries) {
      if (!text) continue;
      const foldedVerse = normalizeSearchFold(text);
      if (!foldedVerse.includes(foldedQuery)) continue;
      hits.push({
        kind: "concordance",
        book: cleanBook,
        chapter: chapterNum,
        verse,
        osis: `${cleanBook}.${chapterNum}.${verse}`,
        label: `${cleanBook} ${chapterNum}:${verse}`,
        snippet: text.slice(0, 110),
        matchQuery: String(query).trim(),
      });
      if (hits.length >= maxResults) {
        return hits;
      }
    }
  }
  return hits;
}

/**
 * Parsea un fragmento USFM (`\id`, `\c`, `\v`), OSIS (`GEN.1.1|texto` o `\t`) o texto plano
 * para auditoría cliente instantánea con los 8 candados deterministicos.
 */
export function parseExternalUsfmSnippet(rawText = "") {
  const src = String(rawText ?? "").replace(/\r\n?/g, "\n").trim();
  if (!src) return [];

  let book = "DRAFT";
  let chapter = 1;
  const parsed = [];

  const idMatch = src.match(/^\\id\s+([A-Z0-9]{2,4})/m);
  if (idMatch) {
    book = idMatch[1].toUpperCase();
  }

  const hasUsfmVerses = /(?:^|\s)\\v\s+\d+/m.test(src);
  if (hasUsfmVerses) {
    const tokens = src.split(/(?=\\(?:c|v)\s+\d+)/);
    for (const tok of tokens) {
      const cMatch = tok.match(/^\\c\s+(\d+)/);
      if (cMatch) {
        chapter = Math.max(1, Number(cMatch[1]) || 1);
        continue;
      }
      const vMatch = tok.match(/^\\v\s+(\d+)\s+([\s\S]+)/);
      if (vMatch) {
        const verse = Math.max(1, Number(vMatch[1]) || 1);
        const cleanBody = vMatch[2]
          .replace(/\\[a-z0-9*]+\s*/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (cleanBody) {
          parsed.push({
            ref: `${book}.${chapter}.${verse}`,
            chapter,
            verse,
            text: cleanBody,
          });
        }
      }
    }
    return parsed;
  }

  const lines = src.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const refLine = line.match(/^([A-Z0-9]{2,4}\.\d+\.\d+)\s*[|\t:]\s*(.+)$/);
    if (refLine) {
      const parts = refLine[1].split(".");
      parsed.push({
        ref: refLine[1].toUpperCase(),
        chapter: Number(parts[1]) || 1,
        verse: Number(parts[2]) || 1,
        text: refLine[2].trim(),
      });
    } else {
      const verseNum = i + 1;
      parsed.push({
        ref: `${book}.${chapter}.${verseNum}`,
        chapter,
        verse: verseNum,
        text: line,
      });
    }
  }
  return parsed;
}

/**
 * Ejecuta los 8 Candados Deterministas (P1..P8) sobre cada unidad de un borrador externo USFM/texto.
 */
export function runClientExternalAudit8Locks({
  rawText = "",
  oldSurface = "",
  validateAllEightLocksFn = validateAllEightLocksPda,
} = {}) {
  const entries = parseExternalUsfmSnippet(rawText);
  if (entries.length === 0) {
    return {
      entriesCount: 0,
      allPassed: false,
      passedCount: 0,
      vetoCount: 0,
      results: [],
    };
  }
  const results = entries.map((entry) => {
    const lockRes = validateAllEightLocksFn({
      oldSurface,
      newSurface: entry.text,
    });
    return {
      ref: entry.ref,
      text: entry.text,
      passed: Boolean(lockRes?.passed),
      status: String(lockRes?.status || "PASS_8_LOCKS"),
      locks: Array.isArray(lockRes?.locks) ? lockRes.locks : [],
    };
  });
  const passedCount = results.filter((r) => r.passed).length;
  const vetoCount = results.length - passedCount;
  return {
    entriesCount: results.length,
    allPassed: vetoCount === 0,
    passedCount,
    vetoCount,
    results,
  };
}

function escapeRegExpLiteral(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resalta coincidencias de búsqueda sobre texto HTML-escapado sin corromper entidades (`&amp;`, etc.).
 */
export function highlightSearchMatchHtml(escapedText, rawQuery = "") {
  const base = String(escapedText ?? "");
  const cleanQuery = String(rawQuery ?? "").trim();
  if (!base || cleanQuery.length < 2) return base;

  const escapedQueryForRegex = cleanQuery
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const exactRe = new RegExp(`(${escapeRegExpLiteral(escapedQueryForRegex)})`, "gi");
  if (exactRe.test(base)) {
    return base.replace(exactRe, '<mark class="search-hit-mark">$1</mark>');
  }

  const foldedNeedle = normalizeSearchFold(cleanQuery);
  if (!foldedNeedle) return base;
  const tokens = base.split(/(\s+)/);
  return tokens
    .map((tok) => {
      if (!tok || /^\s+$/.test(tok) || /^&[a-z0-9#]+;$/i.test(tok)) return tok;
      if (normalizeSearchFold(tok).includes(foldedNeedle)) {
        return `<mark class="search-hit-mark">${tok}</mark>`;
      }
      return tok;
    })
    .join("");
}

const DEFAULT_CONCORDANCE_VAULT_BOOKS = [
  "GEN", "EXO", "PSA", "PRO", "ISA", "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "GAL", "EPH", "PHP", "HEB", "JAS", "1JN", "REV",
];

/**
 * Multi-book RAM concordance (`D5-R12`): searches `activeBook` first, and optionally spans
 * cached/vault books when `scope === "vault"` without inflating `stage_dom_bindings.js`.
 */
export async function searchMultiBookConcordance({
  dataLayer,
  lang = "es",
  activeBook = "GEN",
  query = "",
  scope = "book",
  candidateBooks = DEFAULT_CONCORDANCE_VAULT_BOOKS,
  limit = 16,
} = {}) {
  const cleanQuery = String(query ?? "").trim();
  const cleanLang = String(lang || "es").trim() || "es";
  const cleanActive = String(activeBook || "GEN").toUpperCase();
  const maxResults = Math.max(1, Number(limit) || 16);
  if (cleanQuery.length < 2 || typeof dataLayer?.loadBookText !== "function") {
    return [];
  }
  const booksToScan =
    scope === "vault"
      ? Array.from(new Set([cleanActive, ...(candidateBooks || []).map((b) => String(b).toUpperCase())]))
      : [cleanActive];
  const allHits = [];
  for (const bookCode of booksToScan) {
    if (allHits.length >= maxResults) break;
    try {
      const bookRes = await dataLayer.loadBookText(cleanLang, bookCode);
      if (bookRes?.status === "ready" && bookRes?.data) {
        const hits = searchBookVersesConcordance({
          bookData: bookRes.data,
          book: bookCode,
          query: cleanQuery,
          limit: maxResults - allHits.length,
        });
        allHits.push(...hits);
      }
    } catch {
      // Non-fatal skip for missing book in partial offline portion
    }
  }
  return allHits.slice(0, maxResults);
}
