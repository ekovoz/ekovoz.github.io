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

