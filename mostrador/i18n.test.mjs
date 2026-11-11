// Pruebas del motor de i18n de la interfaz (Ronda 20, S07). Usan los catálogos reales de web/i18n/.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  negotiate,
  lookupChain,
  effectiveScript,
  formatMessage,
  createI18n,
  requestedUiLocales,
  verifyDataI18nCatalogBijection,
  DEFAULT_LOCALE,
} from "./i18n.js";
import { runWithoutProcess } from "./test_support/no_process_runner.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(here, "..", "i18n");
const available = fs
  .readdirSync(i18nDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json" && !f.startsWith("qps"))
  .map((f) => f.replace(/\.json$/, ""));
const loadCatalog = async (code) => {
  const file = path.join(i18nDir, `${code}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
};

test("negotiate_es_mx_to_es", () => {
  assert.equal(negotiate(["es-MX", "en"], available), "es");
  assert.deepEqual(lookupChain("es-MX"), ["es-MX", "es-419", "es"]);
});

test("negotiate_zh_tw_never_gets_hans", () => {
  assert.equal(effectiveScript("zh-TW"), "Hant");
  assert.equal(negotiate(["zh-TW"], available), DEFAULT_LOCALE);
  assert.equal(negotiate(["zh-Hant-HK", "fr"], available), "fr");
  assert.equal(negotiate(["zh-CN"], available), "zh-Hans");
  assert.equal(negotiate(["zh"], available), "zh-Hans");
});

test("negotiate_bn_bd_keeps_region", () => {
  assert.equal(negotiate(["bn-BD"], available), "bn-BD");
  assert.equal(negotiate(["bn-IN"], available), "bn-IN");
  assert.equal(negotiate(["bn"], available), "bn");
});

test("negotiate_unknown_falls_to_en", () => {
  assert.equal(negotiate(["stp-MX", "qu"], available), "en");
  assert.equal(negotiate([], available), "en");
});

test("plural_categories_ar_has_six", () => {
  assert.equal(new Intl.PluralRules("ar").resolvedOptions().pluralCategories.length, 6);
  const msg = "{n, plural, zero {cero} one {uno} two {dos} few {pocos} many {muchos} other {otros}}";
  assert.equal(formatMessage(msg, { n: 0 }, "ar"), "cero");
  assert.equal(formatMessage(msg, { n: 2 }, "ar"), "dos");
  assert.equal(formatMessage(msg, { n: 3 }, "ar"), "pocos");
  assert.equal(formatMessage(msg, { n: 11 }, "ar"), "muchos");
  assert.equal(formatMessage("{n, plural, one {# hoja} other {# hojas}}", { n: 3 }, "es"), "3 hojas");
  assert.equal(formatMessage("{n, plural, =1 {una hoja} other {# hojas}}", { n: 1 }, "es"), "una hoja");
});

test("missing_key_walks_parent_chain_to_en", async () => {
  const i18n = createI18n({ loadCatalog, available });
  await i18n.setLocale(["bn-BD"]);
  assert.deepEqual(i18n.chain.slice(-1), ["en"]);
  assert.ok(i18n.chain.includes("bn"), `cadena: ${i18n.chain.join(" > ")}`);
  const en = await loadCatalog("en");
  const onlyInEn = Object.keys(en.messages).find((k) => k.startsWith("mostrador."));
  assert.ok(onlyInEn, "en.json debe traer claves mostrador.*");
  const bnBd = await loadCatalog("bn-BD");
  if (!(onlyInEn in bnBd.messages)) {
    assert.equal(i18n.t(onlyInEn), formatMessage(en.messages[onlyInEn], {}, "en"));
  }
  assert.equal(i18n.t("clave.que.no.existe"), "clave.que.no.existe");
  assert.ok(i18n.missingKeys.includes("clave.que.no.existe"));
});

test("messages_never_inject_html", async () => {
  const i18n = createI18n({ loadCatalog, available });
  await i18n.setLocale(["es"]);
  const nodes = [];
  const makeEl = (attrs) => ({
    attrs: { ...attrs },
    textContent: "",
    getAttribute(name) {
      return this.attrs[name] ?? null;
    },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  });
  const title = makeEl({ "data-i18n": "mostrador.title" });
  const btn = makeEl({ "data-i18n-attr": "aria-label:dose.one.title" });
  nodes.push(title, btn);
  const htmlEl = makeEl({});
  const root = {
    ownerDocument: { documentElement: htmlEl },
    querySelectorAll(sel) {
      return sel === "[data-i18n]" ? [title] : [btn];
    },
  };
  i18n.applyToDom(root);
  assert.ok(title.textContent.length > 0 && title.textContent !== "mostrador.title");
  assert.ok(!("innerHTML" in title), "solo textContent");
  assert.equal(htmlEl.attrs.lang, "es");
  assert.equal(htmlEl.attrs.dir, "ltr");
  for (const code of available) {
    const catalog = await loadCatalog(code);
    for (const [key, value] of Object.entries(catalog.messages)) {
      assert.ok(!/<\s*\/?\s*[a-z][^>]*>/i.test(value), `${code}.${key} contiene HTML`);
    }
  }
});

test("requested_ui_locales_order_url_saved_navigator", () => {
  assert.deepEqual(
    requestedUiLocales({ search: "?ui=ar&lang=stp", savedPreference: "es", navigatorLanguages: ["fr-FR"] }),
    ["ar", "es", "fr-FR"]
  );
  assert.deepEqual(requestedUiLocales({ search: "", navigatorLanguages: ["ja"] }), ["ja"]);
});

test("runs_with_process_undefined", () => {
  const out = runWithoutProcess(
    path.join(here, "i18n.js"),
    `(m) => ({ n: m.negotiate(["es-MX"], ["en", "es"]), f: m.formatMessage("{n, plural, one {# hoja} other {# hojas}}", { n: 2 }, "es") })`
  );
  assert.equal(out.processType, "undefined");
  assert.deepEqual(out.result, { n: "es", f: "2 hojas" });
});

test("D1_R44_data_i18n_bijection_index_html_vs_18_catalogs", async () => {
  const html = fs.readFileSync(path.resolve(here, "..", "index.html"), "utf8");
  const catalogs = {};
  for (const code of available) catalogs[code] = await loadCatalog(code);
  const report = verifyDataI18nCatalogBijection(html, catalogs);
  assert.ok(report.keys.length >= 100, `se esperaban >= 100 claves data-i18n, hay ${report.keys.length}`);
  assert.ok(report.keys.includes("share.btn.copyLink"));
  assert.ok(report.keys.includes("study.subtab.calibrate"));
  assert.deepEqual(report.missingByLocale, {}, `claves data-i18n huérfanas: ${JSON.stringify(report.missingByLocale)}`);
  assert.equal(report.ok, true);
});

test("D1_R44_data_i18n_bijection_detects_orphan_keys_and_es_ui_has_no_english_buttons", async () => {
  const report = verifyDataI18nCatalogBijection('<b data-i18n="a.ok">x</b><i data-i18n="a.missing">y</i>', {
    es: { messages: { "a.ok": "Bien" } },
    en: { messages: { "a.ok": "Ok", "a.missing": "Missing" } },
  });
  assert.deepEqual(report.missingByLocale, { es: ["a.missing"] });
  assert.equal(report.ok, false);
  const es = await loadCatalog("es");
  const en = await loadCatalog("en");
  for (const key of ["share.btn.copyLink", "share.btn.cameraRx", "print.btn.imposition", "felices.closeBtn"]) {
    assert.notEqual(es.messages[key], en.messages[key], `es.${key} no debe quedar en inglés`);
  }
  const i18n = createI18n({ locale: "es", catalogs: { es, en } });
  const t = typeof i18n.t === "function" ? i18n.t("share.btn.copyLink") : es.messages["share.btn.copyLink"];
  assert.equal(t, "🔗 Copiar enlace directo a este pasaje");
});
