// Pruebas de la capa de datos (Ronda 20, S09). El adaptador de disco lee los shards reales que
// genera `xtask build-web-data` en web/data/.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDataLayer, STATUS } from "./data_layer.js";
import { runWithoutProcess } from "./test_support/no_process_runner.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "..");

function diskSource({ delays = {} } = {}) {
  const wait = (rel) => new Promise((r) => setTimeout(r, delays[rel] || 0));
  return {
    async getJson(rel) {
      await wait(rel);
      const file = path.join(webDir, rel);
      return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    },
    async getBytes(rel) {
      await wait(rel);
      const file = path.join(webDir, rel);
      return fs.existsSync(file) ? new Uint8Array(fs.readFileSync(file)) : null;
    },
  };
}

test("rom_1_es_contains_pablo", async () => {
  const layer = createDataLayer({ source: diskSource() });
  const ch = await layer.loadChapter({ lang: "es", book: "ROM", chapter: 1 });
  assert.equal(ch.status, STATUS.READY);
  assert.equal(ch.key, "ROM.1");
  assert.match(ch.verses[0].text, /Pablo/i);
  assert.doesNotMatch(ch.verses[0].text, /En el principio era el Verbo/);
  assert.equal(ch.provenance.tier, "canonical_human_complete");
});

test("all_1189_chapters_resolve_to_their_own_key", async () => {
  const layer = createDataLayer({ source: diskSource(), cacheLimit: 80 });
  const catalog = await layer.loadCatalog();
  let chapters = 0;
  for (const book of catalog.book_order) {
    const counts = catalog.verse_counts[book];
    for (let c = 1; c <= counts.length; c++) {
      const ch = await layer.loadChapter({ lang: "es", book, chapter: c });
      assert.equal(ch.status, STATUS.READY, `${book} ${c}`);
      assert.equal(ch.key, `${book}.${c}`);
      const lastVerse = Math.max(...ch.verses.map((v) => v.end));
      assert.equal(lastVerse, counts[c - 1], `${book} ${c}: último versículo`);
      chapters += 1;
    }
  }
  assert.equal(chapters, 1189);
});

test("missing_lang_is_unavailable_not_fallback", async () => {
  const layer = createDataLayer({ source: diskSource() });
  const missing = await layer.loadChapter({ lang: "xx", book: "ROM", chapter: 1 });
  assert.equal(missing.status, STATUS.UNAVAILABLE);
  assert.deepEqual(missing.verses, []);
  const beyond = await layer.loadChapter({ lang: "es", book: "ROM", chapter: 17 });
  assert.equal(beyond.status, STATUS.UNAVAILABLE);
  const injected = await layer.loadChapter({ lang: "../x", book: "ROM", chapter: 1 });
  assert.equal(injected.status, STATUS.UNAVAILABLE);
  assert.equal(await layer.loadBytes("data/../../secret"), null);
});

test("stale_navigation_is_discarded", async () => {
  const layer = createDataLayer({ source: diskSource({ delays: { "data/text/es/GEN.json": 80 } }) });
  const first = layer.navigate({ lang: "es", book: "GEN", chapter: 1 });
  const second = layer.navigate({ lang: "es", book: "ROM", chapter: 1 });
  const [r1, r2] = await Promise.all([first.result, second.result]);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  assert.equal(r1.key, "GEN.1");
  assert.equal(r2.key, "ROM.1");
});

test("matrix_chapter_has_columns_rows_and_attribution", async () => {
  const layer = createDataLayer({ source: diskSource() });
  const m = await layer.loadChapterMatrix("ROM", 1);
  assert.equal(m.status, STATUS.READY);
  assert.equal(m.columns[0], "verse");
  assert.equal(m.rows[0][0], 1);
  assert.match(m.rows[0][1], /Παῦλος/);
  assert.match(m.attribution, /CC BY 4\.0/);
});

test("zero_node_fs_tokens_in_module", () => {
  const src = fs.readFileSync(path.join(here, "data_layer.js"), "utf8");
  for (const token of ["node:fs", "process.versions", "readFileSync", "require(", "getBuiltinModule"]) {
    assert.ok(!src.includes(token), `data_layer.js contiene ${token}`);
  }
});

test("runs_with_process_undefined", () => {
  const romPath = path.join(webDir, "data/text/es/ROM.json");
  const out = runWithoutProcess(
    path.join(here, "data_layer.js"),
    `async (m) => {
      const nodeFs = await import("node:fs");
      const diskAdapter = { async getJson(rel) {
        return rel === "data/text/es/ROM.json" ? JSON.parse(nodeFs.readFileSync(${JSON.stringify(romPath)}, "utf8")) : null;
      } };
      const layer = m.createDataLayer({ source: diskAdapter });
      const ch = await layer.loadChapter({ lang: "es", book: "ROM", chapter: 1 });
      return { status: ch.status, key: ch.key, first: ch.verses[0].text.slice(0, 40) };
    }`
  );
  assert.equal(out.processType, "undefined");
  assert.equal(out.result.status, "ready");
  assert.equal(out.result.key, "ROM.1");
  assert.match(out.result.first, /Pablo/i);
});
