// Pruebas de los catálogos de UI (Ronda 20, S08). Leen web/i18n/*.json reales.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createI18n, pseudoLocalizeCatalog, formatMessage } from "../mostrador/i18n.js";

const i18nDir = path.dirname(fileURLToPath(import.meta.url));
const read = (code) => JSON.parse(fs.readFileSync(path.join(i18nDir, `${code}.json`), "utf8"));
const codes = fs
  .readdirSync(i18nDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .map((f) => f.replace(/\.json$/, ""));
const en = read("en");
const enKeys = Object.keys(en.messages);

function placeholders(message) {
  const names = new Set();
  const re = /\{\s*(\w+)\s*(,\s*plural\s*,)?/g;
  let m;
  while ((m = re.exec(message))) names.add(m[1]);
  return [...names].sort();
}

function pluralSelectors(message) {
  const m = /\{\s*\w+\s*,\s*plural\s*,([\s\S]*)\}/.exec(message);
  if (!m) return [];
  return [...m[1].matchAll(/(=\d+|zero|one|two|few|many|other)\s*\{/g)].map((x) => x[1]);
}

test("en_is_complete_source_with_mostrador_keys", () => {
  assert.ok(enKeys.some((k) => k.startsWith("mostrador.")));
  assert.ok(enKeys.some((k) => k.startsWith("dose.")));
  assert.ok(enKeys.some((k) => k.startsWith("seal.")));
  assert.equal(en.meta.dir, "ltr");
  for (const key of enKeys) assert.ok(en.messages[key].trim().length > 0, key);
});

test("every_locale_keys_subset_of_en", () => {
  for (const code of codes) {
    for (const key of Object.keys(read(code).messages)) {
      assert.ok(enKeys.includes(key), `${code}: clave «${key}» no existe en en.json`);
    }
  }
});

test("placeholders_match_en", () => {
  for (const code of codes) {
    const catalog = read(code);
    for (const [key, value] of Object.entries(catalog.messages)) {
      assert.deepEqual(placeholders(value), placeholders(en.messages[key]), `${code}.${key}`);
    }
  }
});

test("plural_forms_valid_for_locale", () => {
  for (const code of codes) {
    const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    for (const [key, value] of Object.entries(read(code).messages)) {
      const selectors = pluralSelectors(value);
      if (selectors.length === 0) continue;
      assert.ok(selectors.includes("other"), `${code}.${key}: falta «other»`);
      for (const sel of selectors) {
        assert.ok(sel.startsWith("=") || categories.includes(sel), `${code}.${key}: «${sel}» no es categoría de ${code}`);
      }
      for (const n of [0, 1, 2, 3, 5, 11, 100]) {
        const out = formatMessage(value, { n, pages: n, block: 7, size: "4 MB", pct: 50, book: "X", chapter: 1, text: "x" }, code);
        assert.ok(!out.includes("{"), `${code}.${key} con n=${n}: «${out}»`);
      }
    }
  }
});

test("pseudo_locale_en_xa_expands_40_percent", () => {
  const pseudo = pseudoLocalizeCatalog(en, "en-XA");
  for (const key of enKeys) {
    const original = en.messages[key];
    const visible = original.replace(/\{[^{}]*\}/g, "");
    if (visible.length < 10) continue;
    assert.ok(pseudo.messages[key].length >= original.length * 1.35, `${key}: expansión insuficiente`);
    assert.deepEqual(placeholders(pseudo.messages[key]), placeholders(original), key);
  }
  assert.equal(pseudo.meta.status, "pseudo");
});

test("pseudo_locale_ar_xb_is_rtl", async () => {
  const pseudo = pseudoLocalizeCatalog(en, "ar-XB");
  assert.equal(pseudo.meta.dir, "rtl");
  const i18n = createI18n({
    loadCatalog: async (code) => (code === "ar-XB" ? pseudo : code === "en" ? en : null),
    available: ["en", "ar-XB"],
  });
  await i18n.setLocale(["ar-XB"]);
  assert.equal(i18n.meta().dir, "rtl");
  assert.ok(i18n.t("mostrador.title").startsWith("\u200F"));
});

test("coverage_reported_per_locale", () => {
  const index = JSON.parse(fs.readFileSync(path.join(i18nDir, "index.json"), "utf8"));
  assert.equal(index.default, "en");
  const byCode = new Map(index.locales.map((l) => [l.code, l]));
  assert.equal(byCode.get("en").coverage, 1);
  assert.equal(byCode.get("es").coverage, 1);
  for (const code of codes) {
    const entry = byCode.get(code);
    assert.ok(entry, `${code} falta en index.json`);
    const own = Object.keys(read(code).messages).filter((k) => enKeys.includes(k)).length;
    assert.ok(Math.abs(entry.coverage - own / enKeys.length) < 0.001, `${code}: cobertura desfasada`);
    assert.ok(["human", "reviewed", "machine-draft"].includes(entry.status), `${code}: status ${entry.status}`);
  }
});

test("R38_SLICE_124_monolingual_pastoral_i18n_catalog_parity_and_zero_jargon_leak", () => {
  const es = read("es");
  assert.equal(Object.keys(es.messages).length, enKeys.length);
  for (const [k, v] of Object.entries(es.messages)) {
    assert.equal(/INV-EKO-TYP|Sauvola|GF\(2\)/i.test(v), false, `es.${k} must not leak raw technical jargon: ${v}`);
  }
  for (const [k, v] of Object.entries(en.messages)) {
    assert.equal(/INV-EKO-TYP|Sauvola|GF\(2\)/i.test(v), false, `en.${k} must not leak raw technical jargon: ${v}`);
  }
});

test("R45_SLICE_175_zero_dead_i18n_keys_and_accurate_diachronic_subtab_label", () => {
  const webRoot = path.resolve(i18nDir, "..");
  const prodFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", "i18n", "dist", ".git"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!/\.(test|spec)\.(js|mjs|ts)$/.test(entry.name) && /\.(html|js|mjs)$/.test(entry.name)) {
        prodFiles.push(full);
      }
    }
  };
  walk(webRoot);
  const prodCorpus = prodFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const dynamicPrefixes = new Set();
  for (const m of prodCorpus.matchAll(/startsWith\(\s*["'`]([A-Za-z0-9_.-]+\.)["'`]\s*\)/g)) {
    dynamicPrefixes.add(m[1]);
  }
  for (const m of prodCorpus.matchAll(/`([A-Za-z0-9_.-]+\.)\$\{/g)) {
    dynamicPrefixes.add(m[1]);
  }

  const deadKeys = enKeys.filter(
    (k) => ![...dynamicPrefixes].some((p) => k.startsWith(p)) && !prodCorpus.includes(k),
  );
  assert.deepEqual(deadKeys, [], `DEB-R45-02: expected 0 dead i18n keys in en.json, found ${deadKeys.join(", ")}`);

  const es = read("es");
  assert.equal(en.messages["study.subtab.diachronic"], "🏛️ 2. Strata & Glosses");
  assert.equal(es.messages["study.subtab.diachronic"], "🏛️ 2. Estratos y Glosas");
  assert.equal("study.subtab.rosetta" in en.messages, false);
});

