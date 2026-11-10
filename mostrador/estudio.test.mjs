import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renderStudy14ColDrawerHtml,
  renderLeipzig4LineGmisHtml,
  renderStudyStrataCards,
  resolveBicanonicalDivergence,
  classifyMaculaArgumentRole,
  resolveConsonantalRootFamily,
  resolveLxxMtCognateBridge,
  resolveKetivQereResiduals,
  resolveParatextEngOrgMapping,
  hydratePhilologyRosettaIndex,
  hydrateCulturalGlossesLexicon,
} from "./estudio.js";
import {
  hydratePericopesAndGlosses,
  resolveEvangeliosMacroThreadAndEcho,
  resolveFelicesDichaCoordinate,
  resolveFelicesPlate,
  resolveMasoreticPericopeBreaks,
} from "./evangelios.js";
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

test("renders_leipzig_4line_gmis_scaffold_for_tier3_and_tier4_without_fake_words", () => {
  const gen1Shard = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const html = renderLeipzig4LineGmisHtml(gen1Shard, {
    lang: "kgv",
    book: "GEN",
    chapter: 1,
    verse: 1,
    wordOrder: "SOV",
  });
  assert.match(html, /data-gmis-scaffold="true"/);
  assert.match(html, /data-gmis-line="1"/);
  assert.match(html, /data-gmis-line="2"/);
  assert.match(html, /data-gmis-line="3"/);
  assert.match(html, /data-gmis-line="4"/);
  assert.match(html, /data-elicitation-slot="H7225"/);
  assert.match(html, /\[___\]/);
});

test("renders_three_semantic_strata_cards_nsm65_realia_and_tsk", () => {
  const gen1Shard = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const strata = renderStudyStrataCards(gen1Shard, { book: "GEN", chapter: 1, verse: 1 });
  assert.match(strata.nsmHtml, /data-stratum="nsm65"/);
  assert.match(strata.nsmHtml, /H7225/);
  assert.match(strata.realiaHtml, /data-stratum="realia-metrology"/);
  assert.match(strata.realiaHtml, /Codo \(Ammah\)/);
  assert.match(strata.tskHtml, /data-stratum="tsk"/);
  assert.match(strata.tskHtml, /data-tsk-ref="JHN\.1\.1"/);
});

test("metamorphic_verse_filter_and_nsm_realia_lexicon_integration", () => {
  const gen1Shard = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const nsmLexicon = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "shards", "nsm_realia_lexicon.json"), "utf8"),
  );

  // 1B++: Filtering by verse 1 vs verse 2 produces distinct 14-column cards
  const htmlV1 = renderStudy14ColDrawerHtml(gen1Shard, { book: "GEN", chapter: 1, verse: 1, scope: "verse" });
  const htmlV2 = renderStudy14ColDrawerHtml(gen1Shard, { book: "GEN", chapter: 1, verse: 2, scope: "verse" });
  const htmlChapter = renderStudy14ColDrawerHtml(gen1Shard, { book: "GEN", chapter: 1, verse: 1, scope: "chapter" });

  assert.notEqual(htmlV1, htmlV2, "14-col drawer must change when verse changes from 1 to 2");
  assert.match(htmlV1, /data-rows-rendered="7"/);
  assert.match(htmlV2, /data-rows-rendered="14"/);
  assert.ok(!htmlV1.includes('data-ref="GEN.1.2"'), "Verse 1 scope must not leak GEN.1.2 cards");
  assert.ok(htmlChapter.includes('data-ref="GEN.1.1"') && htmlChapter.includes('data-ref="GEN.1.2"'));

  // 2B++: Strata cards mutate across verses and integrate nsm_realia_lexicon.json
  const strataV1 = renderStudyStrataCards(gen1Shard, { book: "GEN", chapter: 1, verse: 1, nsmLexicon });
  const strataV2 = renderStudyStrataCards(gen1Shard, { book: "GEN", chapter: 1, verse: 2, nsmLexicon });
  assert.notEqual(strataV1.nsmHtml, strataV2.nsmHtml);
  assert.notEqual(strataV1.realiaHtml, strataV2.realiaHtml);
  assert.notEqual(strataV1.tskHtml, strataV2.tskHtml);
  assert.match(strataV2.tskHtml, /JER\.4\.23/);
  assert.match(strataV1.realiaHtml, /MET-0/);
});

test("resolves_bicanonical_wlc_occidental_divergence_and_enforces_48px_tap_targets", () => {
  const psa23 = resolveBicanonicalDivergence("PSA", 23, 1);
  assert.equal(psa23.hasDivergence, true);
  assert.equal(psa23.mtRef, "PSA.23.2");
  assert.equal(psa23.occidentalRef, "PSA.23.1");
  assert.equal(psa23.lxxRef, "PSA.22.1");

  const exo22 = resolveBicanonicalDivergence("EXO", 22, 1);
  assert.equal(exo22.hasDivergence, true);
  assert.equal(exo22.mtRef, "EXO.21.37");

  const jhn1 = resolveBicanonicalDivergence("JHN", 1, 1);
  assert.equal(jhn1.hasDivergence, false);

  assert.equal(classifyMaculaArgumentRole("A0", "N-NSM"), "A0");
  assert.equal(classifyMaculaArgumentRole("A1", "N-ASM"), "A1");
  assert.equal(classifyMaculaArgumentRole("v", "V-AAI-3S"), "V");

  const estudioSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador", "estudio.js"), "utf8");
  assert.equal(/min-height:\s*(?:36|40|44)px/.test(estudioSrc), false, "DEB-DOM-08: zero sub-48px tap targets in estudio.js");
});

test("d3_b_plus_philology_rosetta_index_consonantal_root_lxx_mt_bridge_and_ketiv_qere", () => {
  const rosettaJson = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "shards", "philology_rosetta_index.json"), "utf8"),
  );
  assert.ok(rosettaJson.decision === "D2-R+" || rosettaJson.decision_ref === "D3-B+");
  hydratePhilologyRosettaIndex(rosettaJson);

  // 1. Consonantal Root Family (ברא -> H1254, H1278)
  const rootBara = resolveConsonantalRootFamily("H1254", rosettaJson);
  assert.ok(rootBara, "Expected consonantal root family for H1254");
  assert.equal(rootBara.root_consonants, "ברא");
  assert.ok(rootBara.strong_members.some((m) => m.strong === "H1278"));

  // 2. LXX <-> MT Cognate Bridge (H7225 <-> G0746 ἀρχή)
  const bridgeH7225 = resolveLxxMtCognateBridge("H7225", rosettaJson);
  assert.ok(bridgeH7225, "Expected LXX<->MT cognate bridge for H7225");
  assert.ok(bridgeH7225.greek_cognates.some((g) => g.greek_strong === "G0746" && g.greek_lemma === "ἀρχή"));

  // 3. Ketiv/Qere Masoretic Residuals (GEN 8:17 -> הוצא / הַיְצֵא)
  const kqGen = resolveKetivQereResiduals("GEN", 8, 17, rosettaJson);
  assert.ok(kqGen.length > 0);
  assert.equal(kqGen[0].ketiv_written, "הוצא");
  assert.equal(kqGen[0].qere_read, "הַיְצֵא");

  // 4. Paratext ENG <-> ORG Versification
  const paratextPsa = resolveParatextEngOrgMapping("PSA", 23, 1, rosettaJson);
  assert.equal(paratextPsa.hasDivergence, true);
  assert.ok(paratextPsa.paratextEntry.org_range.includes("PSA 22:1-6"));

  // 5. Render in 14-col drawer and strata cards
  const gen1Shard = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const drawerHtml = renderStudy14ColDrawerHtml(gen1Shard, {
    book: "GEN",
    chapter: 1,
    verse: 1,
    scope: "verse",
    rosettaIndex: rosettaJson,
  });
  assert.match(drawerHtml, /data-stratum="philology-rosetta"/);
  assert.match(drawerHtml, /data-consonantal-root="ברא"/);
  assert.match(drawerHtml, /data-lxx-cognate="G0746"/);
  assert.match(drawerHtml, /data-ketiv-qere-ref="GEN 8:17"/);

  // 6. D4-R+: 52 weeks of Evangelios and all 12 Dichas of Felices without Object.freeze toy tables
  const pericopesPath = path.join(WEB_DIR, "data", "pericopes_and_glosses.json");
  if (fs.existsSync(pericopesPath)) {
    const pericopesJson = JSON.parse(fs.readFileSync(pericopesPath, "utf8"));
    hydratePericopesAndGlosses(pericopesJson);
  }
  const s25 = resolveEvangeliosMacroThreadAndEcho("s25");
  assert.ok(s25.macroThread.includes("Hilo 2"));
  const dicha10 = resolveFelicesDichaCoordinate(10);
  const dicha12 = resolveFelicesDichaCoordinate(12);
  assert.equal(dicha10.book, "LUK");
  assert.equal(dicha12.book, "REV");

  const estudioSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador", "estudio.js"), "utf8");
  const evangeliosSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador", "evangelios.js"), "utf8");
  assert.equal(estudioSrc.includes("Object.freeze("), false, "D2-R+: zero Object.freeze in estudio.js");
  assert.equal(evangeliosSrc.includes("Object.freeze("), false, "D4-R+: zero Object.freeze in evangelios.js");

  // D4-A+: 3rd scope button data-study-scope="gmis" with Brushing & Linking [data-jump-sheet="field"] and Cultural Glosses Accordion
  const gen1ShardForGmis = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "matrix", "GEN", "1.json"), "utf8"),
  );
  const gmisDrawerHtml = renderStudy14ColDrawerHtml(gen1ShardForGmis, {
    book: "GEN",
    chapter: 1,
    verse: 1,
    scope: "gmis",
    lang: "stp",
    wordOrder: "VSO",
  });
  assert.match(gmisDrawerHtml, /data-scope="gmis"/);
  assert.match(gmisDrawerHtml, /data-study-scope="gmis" aria-pressed="true"/);
  assert.match(gmisDrawerHtml, /data-gmis-scaffold="true"/);
  assert.match(gmisDrawerHtml, /data-jump-sheet="field"/);

  const pericopesFull = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "pericopes_and_glosses.json"), "utf8"),
  );
  hydrateCulturalGlossesLexicon(pericopesFull.cultural_glosses);
  const strataWithGlosses = renderStudyStrataCards(gen1ShardForGmis, { book: "GEN", chapter: 1, verse: 1 });
  assert.match(strataWithGlosses.realiaHtml, /id="studyCulturalGlossesCatalogAccordion"/);
  assert.match(strataWithGlosses.realiaHtml, /data-cultural-gloss-term="denario"/);
  assert.match(strataWithGlosses.realiaHtml, /data-cultural-gloss-term="siclo"/);
});

test("D2-C+_and_D3-C+_hydrate_multi_pericope_chapters_52_weeks_28_felices_plates_and_custom_rosetta_bicanonical", () => {
  // Custom bicanonical rule via options.rosettaIndex forwarded by renderStudy14ColDrawerHtml
  const customRosetta = {
    bicanonical_divergence_rules: [
      {
        book: "JOB",
        chapter_min: 40,
        chapter_max: 41,
        verse_min: 1,
        mt_chapter_delta: 0,
        mt_verse_delta: 8,
        lxx_chapter_delta: 0,
        regime: "JOB_BEHEMOTH_LEVIATHAN_SHIFT",
      },
    ],
  };
  const bicanonJob = resolveBicanonicalDivergence("JOB", 41, 1, customRosetta);
  assert.equal(bicanonJob.hasDivergence, true);
  assert.equal(bicanonJob.regime, "JOB_BEHEMOTH_LEVIATHAN_SHIFT");
  assert.equal(bicanonJob.mtRef, "JOB.41.9");

  // Hydrate chapter_pericopes + evangelios_macro_threads + felices_28_plates schema
  hydratePericopesAndGlosses({
    chapter_pericopes: {
      "GEN.1": [
        { startVerse: 1, marker: "פ", markerType: "Petuchah (párrafo abierto)", title: "Día 1" },
        { startVerse: 6, marker: "פ", markerType: "Petuchah (párrafo abierto)", title: "Día 2" },
        { startVerse: 9, marker: "פ", markerType: "Petuchah (párrafo abierto)", title: "Día 3" },
        { startVerse: 14, marker: "פ", markerType: "Petuchah (párrafo abierto)", title: "Día 4" },
      ],
    },
    evangelios_macro_threads: Array.from({ length: 52 }, (_, idx) => ({
      weekNumber: idx + 1,
      title: `Lámina ${idx + 1}`,
      cita: `Juan ${(idx % 21) + 1}:1`,
      macroThread: `Hilo Semanal ${idx + 1}`,
      otEcho: "GEN 1:1",
      liturgicalDawnNote: `Nota de alba ${idx + 1}`,
    })),
    felices_28_plates: Array.from({ length: 28 }, (_, idx) => ({
      number: idx + 1,
      id: `lamina-${idx + 1}`,
      title: `Felices Lámina ${idx + 1}`,
      section: idx === 0 ? "INTRO" : idx <= 12 ? "DICHAS" : "CONTRARIOS",
    })),
  });

  const breaksGen1 = resolveMasoreticPericopeBreaks("GEN", 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14]);
  assert.equal(breaksGen1.has(6), true);
  assert.equal(breaksGen1.has(9), true);
  assert.equal(breaksGen1.has(14), true);

  const week1 = resolveEvangeliosMacroThreadAndEcho("s01");
  const week52 = resolveEvangeliosMacroThreadAndEcho("s52");
  assert.notEqual(week1.macroThread, week52.macroThread);
  assert.ok(week52.macroThread.includes("Hilo 4"));

  const plate28 = resolveFelicesPlate(28);
  assert.equal(plate28.number, 28);
  assert.equal(plate28.title, "Felices Lámina 28");
});




