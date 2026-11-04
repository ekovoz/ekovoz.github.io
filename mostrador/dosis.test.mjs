// Pruebas del dosificador (Ronda 20, S11). Usan catalog.json y los índices por página reales.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ordinalOf,
  refOfOrdinal,
  locateVersePage,
  planDose1,
  planDose2,
  planDose3,
  paperForRegion,
  chooseEdition,
  effectiveThreatClassWeb,
  doseFilename,
} from "./dosis.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(webDir, rel), "utf8"));
const catalog = readJson("data/catalog.json");

test("ordinal_roundtrip_all_31102", () => {
  let n = 0;
  for (const book of catalog.book_order) {
    catalog.verse_counts[book].forEach((count, idx) => {
      for (let v = 1; v <= count; v++) {
        n += 1;
        const o = ordinalOf(book, idx + 1, v, catalog);
        assert.equal(o, n);
        if (v === 1 || v === count) assert.deepEqual(refOfOrdinal(o, catalog), { book, chapter: idx + 1, verse: v });
      }
    });
  }
  assert.equal(n, 31102);
  assert.equal(ordinalOf("GEN", 1, 32, catalog), null);
  assert.equal(ordinalOf("ROM", 17, 1, catalog), null);
  assert.equal(refOfOrdinal(31103, catalog), null);
});

test("dose1_range_contains_verse_page_for_all_verses", () => {
  for (const [lang, edition] of [["es", "2col-letter"], ["stp", "2col-a4"], ["he", "2col-a4"]]) {
    const pages = readJson(`data/pages/${lang}/${edition}.pages.json`);
    for (let o = 1; o <= 31102; o++) {
      const loc = locateVersePage(pages, o);
      assert.ok(loc, `${lang} ordinal ${o} sin página`);
      assert.ok(loc.block.first_ordinal_per_page[loc.pageInBlock - 1] <= o);
      for (const sheets of [1, 2, 3]) {
        const plan = planDose1({ pageInBlock: loc.pageInBlock, pageCount: loc.block.page_count, sheets });
        assert.ok(plan.pages.includes(loc.pageInBlock), `${lang} ${o} hojas=${sheets}`);
      }
    }
  }
});

test("dose1_starts_on_odd_page_when_duplex", () => {
  for (let page = 1; page <= 17; page++) {
    for (const sheets of [1, 2, 3]) {
      const plan = planDose1({ pageInBlock: page, pageCount: 17, sheets, duplex: true });
      assert.equal(plan.pages[0] % 2, 1, `página ${page}, hojas ${sheets}`);
      assert.ok(plan.pages.length <= sheets * 2);
    }
  }
  const simplex = planDose1({ pageInBlock: 4, pageCount: 9, sheets: 3, duplex: false });
  assert.deepEqual(simplex.pages, [3, 4, 5]);
});

test("dose1_clips_at_edges", () => {
  assert.deepEqual(planDose1({ pageInBlock: 1, pageCount: 12, sheets: 3 }).pages, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(planDose1({ pageInBlock: 12, pageCount: 12, sheets: 3 }).pages, [7, 8, 9, 10, 11, 12]);
  assert.deepEqual(planDose1({ pageInBlock: 2, pageCount: 3, sheets: 3 }).pages, [1, 2, 3]);
  assert.equal(planDose1({ pageInBlock: 2, pageCount: 3, sheets: 3 }).sheets, 2);
});

test("dose2_and_dose3_from_real_index_and_manifest", () => {
  const pages = readJson("data/pages/es/2col-letter.pages.json");
  const manifest = readJson("downloads_manifest.json");
  const loc = locateVersePage(pages, ordinalOf("JHN", 3, 16, catalog));
  const d2 = planDose2(loc);
  assert.ok(fs.existsSync(path.join(webDir, d2.file)), d2.file);
  assert.equal(d2.pageCount, loc.block.page_count);
  const d3 = planDose3(manifest, "es", "2col-letter");
  assert.equal(d3.kind, "full");
  assert.ok(fs.existsSync(path.join(webDir, d3.path)));
  assert.equal(planDose3(manifest, "xx", "2col-letter"), null);
});

test("paper_and_edition_choice", () => {
  assert.equal(paperForRegion("MX"), "letter");
  assert.equal(paperForRegion("ES"), "a4");
  assert.equal(chooseEdition(["2col-letter", "2col-a4"], "a4"), "2col-a4");
  assert.equal(chooseEdition(["2col-a4"], "letter"), "2col-a4");
  assert.equal(chooseEdition([], "a4"), null);
});

test("class_c_uses_neutral_filename", () => {
  assert.equal(effectiveThreatClassWeb("MX", "ar"), "CLASS_C_STEALTH");
  assert.equal(effectiveThreatClassWeb("MX", "es"), "CLASS_A_OPEN");
  const neutral = doseFilename({ dose: 1, lang: "ar", book: "JHN", chapter: 3, verse: 16, blockNumber: 61, edition: "2col-a4", threatClass: "CLASS_C_STEALTH" });
  assert.equal(neutral, "apuntes_lectura_61.pdf");
  assert.ok(!/biblia|bible|ar/i.test(neutral.replace("apuntes_lectura", "")));
  const open = doseFilename({ dose: 1, lang: "es", book: "JHN", chapter: 3, verse: 16, blockNumber: 61, edition: "2col-letter", threatClass: "CLASS_A_OPEN" });
  assert.equal(open, "ekovoz-es-JHN-3-16-2col-letter.pdf");
});

