// Pruebas de la capa de datos (Ronda 20, S09). El adaptador de disco lee los shards reales que
// genera `xtask build-web-data` en web/data/.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ARTIFACT_PROJECTION_SCHEMA,
  createDataLayer,
  decodeFrameInWasmLinearMemory,
  resolveLocalizedBookMeta,
  STATUS,
  verifyArtifactProjectionClosure,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory,
} from "./data_layer.js";
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
    async getText(rel) {
      await wait(rel);
      const file = path.join(webDir, rel);
      return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
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

test("all_6_verified_registers_including_grc_load_rom_1_with_sovereign_tier", async () => {
  const layer = createDataLayer({ source: diskSource() });
  const catalog = await layer.loadCatalog();
  const codes = catalog.languages.map((l) => l.code);
  assert.deepEqual(codes, [
    "es",
    "es-1909",
    "en",
    "stp",
    "he",
    "grc",
    "pt",
    "fr",
    "ar",
    "ru",
    "zh-Hans",
    "hi",
    "bn",
    "id",
    "ur",
    "fa",
  ]);
  for (const code of codes) {
    const ch = await layer.loadChapter({ lang: code, book: "ROM", chapter: 1 });
    assert.equal(ch.status, STATUS.READY, `ROM 1 en ${code}`);
    assert.ok(ch.verses.length >= 25, `ROM 1 en ${code} tiene ${ch.verses.length} versículos`);
    const expectedTier =
      code === "stp" ? "tier2_nt_human_ot_synthesized" : "tier1_canonical_human_66";
    assert.equal(ch.provenance.sovereign_tier, expectedTier, `sovereign_tier en ${code}`);
  }
});

test("tier4_unavailable_lang_renders_gmis_4line_scaffold_from_matrix_shard", async () => {
  const { createMostradorController } = await import("../mostrador.js");
  const elements = new Map();
  const makeEl = (id) => ({
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    hidden: true,
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
  });
  for (const id of [
    "bibleVerseViewport",
    "bibleSovereignSection",
    "epistemicStatusSeal",
    "btnOpenCompass",
  ]) {
    elements.set(id, makeEl(id));
  }
  const fakeDoc = {
    getElementById(id) {
      return elements.get(id) || null;
    },
  };
  const layer = createDataLayer({ source: diskSource() });
  const ctrl = createMostradorController({
    doc: fakeDoc,
    dataLayer: layer,
    lang: "kgv",
    book: "GEN",
    chapter: 1,
    verse: 1,
  });
  const navRes = await ctrl.navigate({ lang: "kgv", book: "GEN", chapter: 1, verse: 1 }, fakeDoc);
  assert.equal(navRes.status, STATUS.UNAVAILABLE);
  const vp = elements.get("bibleVerseViewport");
  assert.equal(vp.getAttribute("data-status"), "unavailable");
  assert.match(vp.innerHTML, /mostrador-status-unavailable/);
  assert.match(vp.innerHTML, /data-gmis-scaffold="true"/);
  assert.match(vp.innerHTML, /data-gmis-line="1"/);
  assert.match(vp.innerHTML, /data-gmis-line="4"/);
});

test("loads_nsm_realia_lexicon_celf250_region_shards_merkle_and_evangelios_corpus", async () => {
  const layer = createDataLayer({ source: diskSource(), cacheLimit: 64 });

  const nsmLex = await layer.loadNsmRealiaLexicon();
  assert.ok(nsmLex, "nsm_realia_lexicon.json must load");
  assert.equal(Array.isArray(nsmLex.metrology_units) && nsmLex.metrology_units.length, 24);
  assert.ok(Array.isArray(nsmLex.biblical_realia) && nsmLex.biblical_realia.length >= 1800);

  const ladder = await layer.loadElicitationLadder250();
  assert.ok(ladder, "elicitation_ladder_250.json must load");
  const items = Array.isArray(ladder) ? ladder : ladder.items || ladder.ladder || [];
  assert.equal(items.length, 250, "CELF-250 ladder must contain 250 diagnostic items");

  const reg1 = await layer.loadRegionShard(1);
  assert.ok(reg1 && reg1.macro_region_id === 1);
  assert.equal(await layer.loadRegionShard(99), null);

  const allRegions = await layer.loadAllRegionShards();
  assert.equal(allRegions.length, 12);

  const merkle = await layer.loadMerkleRoot();
  assert.ok(merkle && /^[0-9a-f]{64}$/.test(merkle.merkleRootHex));

  const evangelios = await layer.loadEvangeliosCorpus();
  assert.ok(evangelios && evangelios.work === "evangelios");
  assert.equal(Array.isArray(evangelios.quarters), true);
  assert.equal(evangelios.quarters.length, 4);
  assert.equal(Array.isArray(evangelios.entries), true);
  assert.equal(evangelios.entries.length, 52);
});

test("round25_loads_all_6_compiled_rust_artifacts_and_enforces_fail_closed_wasm_sha256", async () => {
  const layer = createDataLayer({ source: diskSource(), cacheLimit: 64 });

  const rosetta = await layer.loadPhilologyRosettaIndex();
  assert.ok(rosetta, "philology_rosetta_index.json must load");
  assert.ok(Array.isArray(rosetta.versification_eng_org) && rosetta.versification_eng_org.length >= 265);
  assert.ok(Array.isArray(rosetta.ketiv_qere_residuals) && rosetta.ketiv_qere_residuals.length >= 4);

  const pericopes = await layer.loadPericopesAndGlosses();
  assert.ok(pericopes, "pericopes_and_glosses.json must load");
  assert.equal(Object.keys(pericopes.evangelios_macro_threads || {}).length, 52);
  assert.equal(Object.keys(pericopes.felices_12_dichas || {}).length, 12);

  const diachronic = await layer.loadDiachronicRegisterAudit();
  assert.ok(diachronic, "diachronic_register_es.json must load");
  assert.ok(Array.isArray(diachronic.intergenerational_core_rules) && diachronic.intergenerational_core_rules.length >= 250);

  const profiles = await layer.loadEditorialProfiles();
  assert.ok(profiles, "editorial_profiles.json must load");
  assert.equal(profiles.print_profiles_14.length, 14);
  assert.equal(profiles.branch_profiles_12.length, 12);
  assert.equal(profiles.canonical_80_blocks_catalog.length, 80);

  const workshop = await layer.loadFieldWorkshopData();
  assert.ok(workshop, "field_workshop_stp.json must load");
  assert.equal(workshop.stp_ot_lexicon_600.length, 600);
  assert.equal(workshop.canonical_5_ot_translation_waves.length, 5);

  const wasmOk = await layer.loadWasmModule("qr_stream_receiver_wasm");
  assert.equal(wasmOk.status, STATUS.READY);
  assert.equal(typeof wasmOk.exports.ekovoz_wasm_abi_version, "function");
  assert.ok(wasmOk.exports.ekovoz_wasm_abi_version() >= 25);
  assert.ok(wasmOk.exports.memory instanceof WebAssembly.Memory, "D1-C+: qr_stream_receiver_wasm must export linear memory");

  // Metamorphic Provenance Gate (dY/dX != 0, Chen et al. IEEE TSE 2025 / ARB-EKOVOZ-62):
  const frameAlpha = new Uint8Array([1, 69, 67, 79, 49, 8, 71, 69, 78, 46, 49, 46, 49, 65]);
  const frameBeta = new Uint8Array([1, 69, 67, 79, 49, 8, 71, 69, 78, 46, 49, 46, 49, 66]);
  const digestAlpha = decodeFrameInWasmLinearMemory(wasmOk, frameAlpha, 0);
  const digestBeta = decodeFrameInWasmLinearMemory(wasmOk, frameBeta, 0);
  assert.ok(digestAlpha > 0 && digestBeta > 0);
  assert.notEqual(digestAlpha, digestBeta, "D1-C+ / ARB-EKOVOZ-62: decode_optical_frame_in_place must be payload-sensitive (dY/dX != 0)");

  const syndromeAlpha = verifyRaptorQBlockInWasmLinearMemory(wasmOk, frameAlpha, 8);
  const syndromeBeta = verifyRaptorQBlockInWasmLinearMemory(wasmOk, frameBeta, 8);
  assert.ok(syndromeAlpha > 0 && syndromeBeta > 0);
  assert.notEqual(syndromeAlpha, syndromeBeta, "D1-C+ / ARB-EKOVOZ-62: verify_raptorq_esi_block_in_place must satisfy dY/dX != 0");

  const playerWasm = await layer.loadWasmModule("ekovoz_player_wasm");
  assert.equal(playerWasm.status, STATUS.READY);
  assert.ok(playerWasm.exports.memory instanceof WebAssembly.Memory, "D1-C+: ekovoz_player_wasm must export linear memory");
  const crcAlpha = verifyAudioPcmCrc16InWasmLinearMemory(playerWasm, frameAlpha);
  const crcBeta = verifyAudioPcmCrc16InWasmLinearMemory(playerWasm, frameBeta);
  assert.ok(crcAlpha > 0 && crcBeta > 0);
  assert.notEqual(crcAlpha, crcBeta, "D1-C+ / ARB-EKOVOZ-62: verify_audio_frame_crc16_in_place must satisfy dY/dX != 0");

  // Tampered WASM byte must fail closed with WASM_SHA256_MISMATCH
  const tamperedSource = {
    ...diskSource(),
    async getBytes(rel) {
      const orig = await diskSource().getBytes(rel);
      if (!orig) return null;
      const copy = new Uint8Array(orig);
      copy[copy.length - 1] ^= 0xff;
      return copy;
    },
  };
  const tamperedLayer = createDataLayer({ source: tamperedSource });
  const wasmTampered = await tamperedLayer.loadWasmModule("qr_stream_receiver_wasm");
  assert.equal(wasmTampered.status, STATUS.UNAVAILABLE);
  assert.equal(wasmTampered.reason, "WASM_SHA256_MISMATCH");
});

test("d1_a_plus_artifact_projection_schema_and_localized_book_meta_nsm_subtitle", async () => {
  const layer = createDataLayer({ source: diskSource() });
  assert.ok(Array.isArray(ARTIFACT_PROJECTION_SCHEMA) && ARTIFACT_PROJECTION_SCHEMA.length >= 6);

  const bookNamesEs = await layer.loadBookNames("es");
  assert.ok(bookNamesEs && Array.isArray(bookNamesEs.books) && bookNamesEs.books.length === 66);
  const exoMeta = resolveLocalizedBookMeta(bookNamesEs, "EXO");
  assert.equal(exoMeta.code, "EXO");
  assert.equal(exoMeta.name, "Éxodo");
  assert.ok(exoMeta.nsmSubtitle.length > 10, "D5-A+: Éxodo debe exponer nsm_subtitle desde book_names/es.json");

  const closureFail = verifyArtifactProjectionClosure({
    htmlSource: '<div id="bibleEasyDrawer"></div>',
    domBindings: [{ selector: "#toggleGhostA4" }],
    controllerCorpus: "cultural_glosses",
  });
  assert.equal(closureFail.ok, false);
  assert.ok(closureFail.missingDomIds.includes("#toggleGhostA4"));
  assert.ok(closureFail.unprojectedKeys.some((k) => k.includes("stp_vso_classifier_phrase")));
});

test("R45_SLICE_177_bible_constants_and_annotation_blind_calibration_reports", async () => {
  const mod = await import("./data_layer.js");
  assert.ok(mod.BIBLE_CONSTANTS, "ORPHAN-R45-01: BIBLE_CONSTANTS must be re-exported from data_layer.js");
  assert.equal(mod.BIBLE_CONSTANTS.CANONICAL_VERSES_COUNT, 31102);
  assert.equal(mod.BIBLE_CONSTANTS.CANONICAL_BLOCKS_COUNT, 80);
  assert.equal(mod.BIBLE_CONSTANTS.MATRIX_COLUMNS_COUNT, 14);

  const layer = createDataLayer({ source: diskSource() });
  assert.equal(layer.bibleConstants, mod.BIBLE_CONSTANTS);
  const annReport = await layer.loadAnnotationIndexReport();
  assert.ok(annReport && annReport.totals);
  assert.equal(annReport.totals.ot_tokens + annReport.totals.nt_tokens, 444363);
  assert.equal(annReport.sources.length, 10);
  assert.equal(Object.keys(annReport.residuals_by_kind).length, 5);

  const blindRows = await layer.loadBlindCalibrationReport();
  assert.ok(Array.isArray(blindRows) && blindRows.length === 48, "12 languages x 4 books = 48 rows");
  assert.equal(ARTIFACT_PROJECTION_SCHEMA.length, 10);
});
