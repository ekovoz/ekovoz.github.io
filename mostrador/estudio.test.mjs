import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderStudy14ColDrawerHtml } from "./estudio.js";
import { runModuleWithoutProcess } from "../test_support/no_process_runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");

test("renders_all_14_columns_for_genesis_1", () => {
  const gen1Shard = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const html = renderStudy14ColDrawerHtml(gen1Shard);
  assert.match(html, /בְּרֵאשִׁ֖?ית/);
  assert.match(html, /H7225/);
  for (const col of [
    "c01_c02",
    "c03_source_corpus",
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
  ]) {
    assert.ok(html.includes(`data-col="${col}"`), `Expected column ${col} in rendered HTML`);
  }
});

test("preserves_empty_marker_without_synthetic_fill", () => {
  const shard = {
    book: "GEN",
    chapter: 1,
    rows: [
      {
        verse: 1,
        c01_ordinal_31102: 1,
        c02_ref: "GEN.1.1",
        c03_source_corpus: "WLC",
        c04_word_pos: 1,
        c05_orig_text: "בְּרֵאשִׁית",
        c06_translit: "bə·rê·šîṯ",
        c07_strong_id: "H7225",
        c08_morph_code: "HR/Ncfsa",
        c09_macula_role: "∅",
        c10_clause_id: "∅",
        c11_semantic_domain: "∅",
        c12_gloss_es: "En el principio",
        c13_nsm_65: "ANTES DE TODO",
        c14_target_gloss: "∅",
      },
    ],
  };
  const html = renderStudy14ColDrawerHtml(shard);
  assert.match(html, /Rol: ∅/);
  assert.match(html, /Cláusula: ∅/);
  assert.doesNotMatch(html, /PREDICATE_CORE/);
  assert.doesNotMatch(html, /hebrew_root_/);
});

test("renders_cc_by_4_0_attribution", () => {
  const gen1Shard = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const html = renderStudy14ColDrawerHtml(gen1Shard);
  assert.match(html, /STEPBible/);
  assert.match(html, /Macula/);
  assert.match(html, /CC BY 4\.0/);
});

test("renders_realia_and_metrology_entries", () => {
  const shard = {
    book: "JHN",
    chapter: 2,
    rows: [],
    realia: [
      {
        id: "stone_jars",
        title: "Tinajas de piedra de purificación",
        explanation: "Vasijas rituales judías de piedra caliza.",
      },
    ],
    metrology: [
      {
        biblical_name: "Metretes (Cántaro)",
        modern_equivalent: "~39 litros",
        local_illustration: "2 garrafones de agua de 20 L",
      },
    ],
  };
  const html = renderStudy14ColDrawerHtml(shard);
  assert.match(html, /Tinajas de piedra de purificación/);
  assert.match(html, /Metretes \(Cántaro\)/);
  assert.match(html, /~39 litros/);
});

test("runs_with_process_undefined", () => {
  const out = runModuleWithoutProcess(
    new URL("./estudio.js", import.meta.url).href,
    `
      const html = mod.renderStudy14ColDrawerHtml({
        book: "GEN",
        chapter: 1,
        rows: [[1, 1, "WLC", 1, "בְּרֵאשִׁית", "bere'shit", "H7225", "HR/Ncfsa", "∅", "∅", "∅", "En el principio", "ANTES DE TODO", "∅"]],
      });
      if (!html.includes("H7225") || !html.includes("CC BY 4.0")) {
        throw new Error("Unexpected study HTML");
      }
      console.log("OK_NO_PROCESS_ESTUDIO");
    `,
  );
  assert.match(out, /OK_NO_PROCESS_ESTUDIO/);
});
