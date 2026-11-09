import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  indexRegionShards,
  listMacroRegions,
  resolveMacroRegionId,
  listCountriesInRegion,
  searchLanguages,
} from "./lang_funnel.js";
import { createI18n } from "./i18n.js";
import { runModuleWithoutProcess } from "../test_support/no_process_runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const SHARDS_DIR = path.join(WEB_DIR, "shards");

function loadAll12Shards() {
  const shards = [];
  for (let i = 1; i <= 12; i++) {
    const file = path.join(SHARDS_DIR, `region_${String(i).padStart(2, "0")}.json`);
    shards.push(JSON.parse(fs.readFileSync(file, "utf8")));
  }
  return shards;
}

const SAMPLE_CATALOG = {
  languages: [
    {
      code: "en",
      iso639_3: "eng",
      autonym: "English",
      exonym: "Inglés",
      direction: "ltr",
      tier: "open_english_world_english_bible",
      has_text: true,
      has_blocks: true,
    },
    {
      code: "es",
      iso639_3: "spa",
      autonym: "Español",
      exonym: "Español",
      direction: "ltr",
      tier: "historical_public_domain_sec_2_2",
      has_text: true,
      has_blocks: true,
    },
    {
      code: "stp",
      iso639_3: "stp",
      autonym: "O'dam (Tepehuano del Sur)",
      exonym: "Tepehuano del Sur",
      direction: "ltr",
      tier: "seed_draft_field_review_l1_l5",
      has_text: true,
      has_blocks: true,
    },
  ],
};

test("region_shards_total_7164_unique_iso", () => {
  const shards = loadAll12Shards();
  const idx = indexRegionShards(shards, SAMPLE_CATALOG);
  assert.equal(idx.totalUniqueIso, 7164);
});

test("search_finds_stp_by_autonym_exonym_and_iso", () => {
  const region01 = JSON.parse(
    fs.readFileSync(path.join(SHARDS_DIR, "region_01.json"), "utf8"),
  );
  const idx = indexRegionShards([region01], SAMPLE_CATALOG);

  for (const q of ["tepehuano", "odam", "O'dam", "stp"]) {
    const hits = idx.search(q);
    assert.ok(
      hits.some((h) => h.iso639_3 === "stp"),
      `Expected search("${q}") to return stp`,
    );
  }
});

test("catalog_join_marks_stp_as_draft_review", () => {
  const region01 = JSON.parse(
    fs.readFileSync(path.join(SHARDS_DIR, "region_01.json"), "utf8"),
  );
  const idx = indexRegionShards([region01], SAMPLE_CATALOG);
  const stp = idx.byIso.get("stp");
  assert.ok(stp);
  assert.equal(stp.hasText, true);
  assert.equal(stp.isDraft, true);
  assert.equal(stp.tier, "seed_draft_field_review_l1_l5");
});

test("region_labels_come_from_i18n_keys", () => {
  const enCatalog = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "i18n", "en.json"), "utf8"),
  );
  const esCatalog = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "i18n", "es.json"), "utf8"),
  );
  const i18nEn = createI18n({ locale: "en", catalog: enCatalog, fallbackCatalog: enCatalog });
  const i18nEs = createI18n({ locale: "es", catalog: esCatalog, fallbackCatalog: enCatalog });

  const regionsEn = listMacroRegions(i18nEn);
  const regionsEs = listMacroRegions(i18nEs);
  assert.equal(regionsEn.length, 12);
  assert.equal(regionsEs.length, 12);
  assert.equal(regionsEn[0].key, "region.1");
  assert.equal(regionsEn[0].label, (enCatalog.messages || enCatalog)["region.1"]);
  assert.equal(regionsEs[0].label, (esCatalog.messages || esCatalog)["region.1"]);
  assert.notEqual(regionsEn[0].label, regionsEs[0].label);
});

test("runs_with_process_undefined", () => {
  const out = runModuleWithoutProcess(
    new URL("./lang_funnel.js", import.meta.url).href,
    `
      const idx = mod.indexRegionShards([
        {
          macro_region_id: 1,
          featured_languages: [["stp", "Tepehuano del Sur (O'dam)", "O'dam", "Durango,Mezquital"]]
        }
      ], {
        languages: [{ code: "stp", iso639_3: "stp", tier: "seed_draft_field_review_l1_l5", has_text: true }]
      });
      const hits = idx.search("odam");
      if (hits.length !== 1 || hits[0].iso639_3 !== "stp" || !hits[0].isDraft) {
        throw new Error("Unexpected funnel search result: " + JSON.stringify(hits));
      }
      console.log("OK_NO_PROCESS_FUNNEL");
    `,
  );
  assert.match(out, /OK_NO_PROCESS_FUNNEL/);
});

test("resolves_region_slugs_lists_subregions_and_searches_7164_languages", () => {
  assert.equal(resolveMacroRegionId("americas-mesoamerica"), 1);
  assert.equal(resolveMacroRegionId("oceania-pacific"), 12);
  assert.equal(resolveMacroRegionId("region_06"), 6);

  const shards = loadAll12Shards();
  const idx = indexRegionShards(shards, SAMPLE_CATALOG);

  const subregions1 = listCountriesInRegion(idx, "americas-mesoamerica");
  assert.ok(subregions1.length > 0, "Expected subregions for americas-mesoamerica");
  assert.ok(subregions1.some((s) => /Durango|Mezquital|Mexico|Oaxaca/i.test(s.name)));

  const kgvHits = searchLanguages(idx, "kalamang", 10);
  assert.ok(kgvHits.some((h) => h.iso639_3 === "kgv" && h.sovereignSeal === "TIER_3_4_PIONEER"));

  const stpHits = searchLanguages(idx, "tepehuano", { limit: 10 });
  assert.ok(stpHits.some((h) => h.iso639_3 === "stp" && h.sovereignSeal === "TIER_2_FIELD_DRAFT"));
});
