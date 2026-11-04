// Pruebas del resolutor de citas multilingüe (Ronda 20, S12). Usan web/data/book_names/*.json reales.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReferenceResolver, parseReference, normalizeBookToken, asciiDigits } from "./reference.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(webDir, rel), "utf8"));
const catalog = readJson("data/catalog.json");
const names = (lang) => readJson(`data/book_names/${lang}.json`);
const resolver = createReferenceResolver(["es", "en", "he", "ar", "ja", "hi", "stp"].map(names));

test("resolves_spanish_names_abbreviations_and_aliases", () => {
  assert.deepEqual(parseReference("Juan 3:16", resolver, catalog.verse_counts), { book: "JHN", chapter: 3, verse: 16 });
  assert.deepEqual(parseReference("Romanos 8,28", resolver, catalog.verse_counts), { book: "ROM", chapter: 8, verse: 28 });
  assert.deepEqual(parseReference("Génesis 1", resolver, catalog.verse_counts), { book: "GEN", chapter: 1, verse: 1 });
  const es = names("es");
  const rev = es.books.find((b) => b.code === "REV");
  for (const alias of [rev.abbr, ...rev.aliases]) {
    assert.equal(resolver.resolveBook(alias), "REV", `alias «${alias}»`);
  }
});

test("resolves_english_and_numbered_books", () => {
  assert.deepEqual(parseReference("1 John 1:9", resolver, catalog.verse_counts), { book: "1JN", chapter: 1, verse: 9 });
  assert.deepEqual(parseReference("PSA.119.105", resolver, catalog.verse_counts), { book: "PSA", chapter: 119, verse: 105 });
  assert.deepEqual(parseReference("66", resolver, catalog.verse_counts), { book: "REV", chapter: 1, verse: 1 });
});

test("resolves_non_latin_scripts_and_native_digits", () => {
  assert.equal(asciiDigits("٨:٢٨"), "8:28");
  assert.equal(asciiDigits("३:१६"), "3:16");
  for (const lang of ["he", "ar", "ja", "hi"]) {
    const rom = names(lang).books.find((b) => b.code === "ROM");
    assert.deepEqual(parseReference(`${rom.name} 8:28`, resolver, catalog.verse_counts), { book: "ROM", chapter: 8, verse: 28 }, lang);
  }
  const arRom = names("ar").books.find((b) => b.code === "ROM").name;
  assert.deepEqual(parseReference(`${arRom} ٨:٢٨`, resolver, catalog.verse_counts), { book: "ROM", chapter: 8, verse: 28 });
});

test("invalid_chapter_or_verse_returns_null_without_clamping", () => {
  assert.equal(parseReference("Juan 22:1", resolver, catalog.verse_counts), null);
  assert.equal(parseReference("Génesis 1:32", resolver, catalog.verse_counts), null);
  assert.equal(parseReference("Libro inexistente 1:1", resolver, catalog.verse_counts), null);
  assert.equal(parseReference("", resolver, catalog.verse_counts), null);
});

test("normalization_strips_marks_in_any_script", () => {
  assert.equal(normalizeBookToken("Génesis"), "genesis");
  assert.equal(normalizeBookToken("בְּרֵאשִׁית"), normalizeBookToken("בראשית"));
  assert.equal(normalizeBookToken("1 Cor."), "1cor");
});

test("every_book_resolves_by_its_name_in_every_language", () => {
  for (const lang of ["es", "en", "he", "ar", "ja", "hi"]) {
    for (const book of names(lang).books) {
      const own = createReferenceResolver([names(lang)]);
      assert.equal(own.resolveBook(book.name), book.code, `${lang}: ${book.name}`);
    }
  }
});

