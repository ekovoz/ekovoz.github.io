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
  buildRelativePdfAssetUrl,
  normalizeEditionSlug,
  listCatalogEditionsForLang,
  listAll14PrintEditionsForLang,
  computeKindlePrintBudget,
  computeFoliationLayout,
  simulateThirdGenPhotocopySauvola,
  CANONICAL_9_TOML_PROFILES,
  CANONICAL_14_PRINT_PROFILES,
  CANONICAL_12_BRANCH_PROFILES,
  hydrateEditorialProfiles,
  computeMultiSignatureImposition,
  CANONICAL_80_BLOCKS_CATALOG,
  POCKET_REFUGE_4_SHEETS_SPEC,
  renderMultiSignatureAndPocketRefugeHtml,
  paperForRegion,
  chooseEdition,
  effectiveThreatClassWeb,
  doseFilename,
  resolveEditionGeometrySpec,
  resolvePrintEditionPdfAssetUrl,
  syncPrintDrawerControlsFromEditionProfile,
  renderImpositionAndLayoutPreviewHtml,
} from "./dosis.js";
import { renderEvangeliosPlateActionsHtml } from "./evangelios.js";
import {
  hasDiachronicVariants,
  resolveEffectiveCorpusTarget,
  syncDiachronicRegisterOrthogonality,
  hydrateDiachronicRegister,
  BOOK_VECTORS_66,
  computeAnalyticalRegisterMetrics,
} from "./diachronic_register.js";

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

test("plan_dose2_normalizes_legacy_02_2col_pastoral_to_existing_disk_pdf", () => {
  assert.equal(normalizeEditionSlug("02_2col_pastoral", "a4"), "2col-a4");
  assert.equal(normalizeEditionSlug("02_2col_pastoral", "letter"), "2col-letter");
  for (const [lang, ed] of [
    ["es", "02_2col_pastoral"],
    ["es-1909", "2col-a4"],
    ["en", "02_2col_pastoral"],
    ["stp", "02_2col_pastoral"],
    ["he", "2col-a4"],
    ["grc", "2col-a4"],
  ]) {
    const d2 = planDose2("B01", lang, ed);
    assert.ok(!d2.url.includes("02_2col_pastoral"), `Legacy slug leaked for ${lang}: ${d2.url}`);
    assert.ok(fs.existsSync(path.join(webDir, d2.file)), `Expected disk PDF for ${lang}: ${d2.file}`);
  }
  const manifest = readJson("downloads_manifest.json");
  const editionsEs = listCatalogEditionsForLang(manifest, "es");
  assert.equal(editionsEs.length, 11, "Expected 9 canonical editions + 2 field PDFs");
  assert.ok(editionsEs.some((e) => e.url === "obras/biblia/campo/refugio_4_hojas.pdf"));
  assert.ok(editionsEs.some((e) => e.url === "obras/biblia/campo/checklist_80_bloques.pdf"));

  // Tolerates legacy 1st-arg string call listCatalogEditionsForLang("es", "bloque_01")
  const editionsLegacyCall = listCatalogEditionsForLang("es", "bloque_01");
  assert.equal(editionsLegacyCall.length, 11);

  // 5B++: Metamorphic Kindle print budget calculation
  const bSmall = computeKindlePrintBudget({ fontPt: 8.5, columns: 3, orientation: "landscape", paper: "A4" });
  const bLarge = computeKindlePrintBudget({ fontPt: 12.0, columns: 3, orientation: "portrait", paper: "Letter" });
  assert.notEqual(bSmall.summaryText, bLarge.summaryText);
  assert.equal(bSmall.effectiveColumns, 3);
  assert.equal(bLarge.effectiveColumns, 2, "12pt with 3 cols must clamp to 2 cols");
  assert.ok(bLarge.estimatedPages > bSmall.estimatedPages);
});

test("foliation_layout_20mm_punch_marks_rtl_inversion_and_sauvola_3rd_gen_photocopy", () => {
  const singleLtr = computeFoliationLayout({ mode: "single_sheet_20mm", paper: "A4", pageCount: 8, dir: "ltr" });
  assert.equal(singleLtr.bindingMarginMm, 20.0);
  assert.equal(singleLtr.punchHoleDiameterMm, 4.0);
  assert.equal(singleLtr.bindingEdge, "left");

  const singleRtl = computeFoliationLayout({ mode: "single_sheet_20mm", paper: "A4", pageCount: 8, dir: "rtl" });
  assert.equal(singleRtl.bindingEdge, "right");

  const saddleLtr = computeFoliationLayout({ mode: "saddle_stitch", paper: "A4", pageCount: 8, dir: "ltr" });
  const saddleRtl = computeFoliationLayout({ mode: "saddle_stitch", paper: "A4", pageCount: 8, dir: "rtl" });
  assert.equal(saddleLtr.spineGutterMm, 9.215);
  assert.deepEqual(saddleLtr.spreads[0].front, [8, 1]);
  assert.deepEqual(saddleRtl.spreads[0].front, [1, 8]);

  const sauvolaPass = simulateThirdGenPhotocopySauvola({ strokePt: 0.85, k: 0.2, R: 128 });
  assert.equal(sauvolaPass.survives3rdGen, true);
  assert.equal(sauvolaPass.eulerCharacteristicDelta, 0);

  const sauvolaFail = simulateThirdGenPhotocopySauvola({ strokePt: 0.5, k: 0.2, R: 128 });
  assert.equal(sauvolaFail.survives3rdGen, false);
  assert.equal(sauvolaFail.eulerCharacteristicDelta, -1);

  const evHtml = renderEvangeliosPlateActionsHtml({ weekId: "s01", passageRef: "JHN.1.1", lang: "es" });
  assert.match(evHtml, /ot-echo-jump-chip/);
  assert.match(evHtml, /data-evangelios-pericopes="true"/);
  assert.match(evHtml, /min-height:48px/);
});

test("d4_b_plus_multi_signature_4n_imposition_creep_bound_9_toml_profiles_and_80_blocks", () => {
  assert.equal(CANONICAL_9_TOML_PROFILES.length, 9);
  assert.ok(CANONICAL_9_TOML_PROFILES.every((p) => p.tomlPath.startsWith("obras/biblia/profiles/")));
  assert.equal(CANONICAL_80_BLOCKS_CATALOG.length, 80);
  assert.equal(CANONICAL_80_BLOCKS_CATALOG[0].blockId, "BLK-001");
  assert.equal(CANONICAL_80_BLOCKS_CATALOG[79].blockId, "BLK-080");
  assert.equal(POCKET_REFUGE_4_SHEETS_SPEC.klDivergence, 0.0);

  const imp = computeMultiSignatureImposition({
    totalPages: 160,
    maxSheetsPerSignature: 8,
    paperThicknessMm: 0.09,
    paperBulkFactor: 1.15,
    dir: "ltr",
  });
  assert.equal(imp.signatureCount, 5, "160 pages / 32 pages per signature = 5 signatures");
  assert.equal(imp.creepWithinBound, true);
  assert.ok(imp.maxCreepMm <= 2.45, `Expected creep <= 2.45mm, got ${imp.maxCreepMm}`);
  assert.equal(imp.signatures[0].sheetsCount, 8);
  assert.ok(imp.signatures[1].steppedCollationMarkYMm > imp.signatures[0].steppedCollationMarkYMm);

  const html = renderMultiSignatureAndPocketRefugeHtml({ totalPages: 160, activeBlockNumber: 5 });
  assert.match(html, /data-multi-signature="true"/);
  assert.match(html, /data-active-field-block="BLK-005"/);
  assert.match(html, /D_KL = 0\.0/);

  // D5-R+: 14 print profiles (01..14), 12 branch profiles (G_01..G_12), 80 real blocks, zero Object.freeze
  const profilesPath = path.join(webDir, "data", "editorial_profiles.json");
  if (fs.existsSync(profilesPath)) {
    hydrateEditorialProfiles(readJson("data/editorial_profiles.json"));
  }
  assert.equal(CANONICAL_14_PRINT_PROFILES.length, 14);
  assert.equal(CANONICAL_12_BRANCH_PROFILES.length, 12);
  assert.equal(CANONICAL_80_BLOCKS_CATALOG.length, 80);

  const dosisSrc = fs.readFileSync(path.join(webDir, "mostrador", "dosis.js"), "utf8");
  const diachronicSrc = fs.readFileSync(path.join(webDir, "mostrador", "diachronic_register.js"), "utf8");
  assert.equal(dosisSrc.includes("Object.freeze("), false, "D5-R+: zero Object.freeze in dosis.js");
  assert.equal(diachronicSrc.includes("Object.freeze("), false, "D3-R+: zero Object.freeze in diachronic_register.js");
});

test("D3-E+: Harel orthogonal product state (dL/dR = 0) and conditional visibility of classic register", () => {
  assert.equal(hasDiachronicVariants("es"), true);
  assert.equal(hasDiachronicVariants("es-1909"), true);
  assert.equal(hasDiachronicVariants("en"), false);
  assert.equal(hasDiachronicVariants("stp"), false);

  assert.equal(resolveEffectiveCorpusTarget("es", "clasica"), "es-1909");
  assert.equal(resolveEffectiveCorpusTarget("es", "intergeneracional"), "es");
  assert.equal(resolveEffectiveCorpusTarget("en", "clasica"), "en");

  const stateEs = { lang: "es-1909", register: "clasica" };
  const classicBtn = { hidden: false, style: { display: "" } };
  const mockDom = {
    getElementById: (id) => (id === "btnRegClasica" ? classicBtn : null),
  };

  const resEs = syncDiachronicRegisterOrthogonality(mockDom, stateEs);
  assert.equal(stateEs.lang, "es", "state.lang must remain canonical 'es' even in 'clasica' register");
  assert.equal(resEs.effectiveCorpusLang, "es-1909");
  assert.equal(classicBtn.hidden, false);

  const stateStp = { lang: "stp", register: "clasica" };
  const resStp = syncDiachronicRegisterOrthogonality(mockDom, stateStp);
  assert.equal(stateStp.lang, "stp");
  assert.equal(stateStp.register, "intergeneracional");
  assert.equal(resStp.effectiveCorpusLang, "stp");
  assert.equal(classicBtn.hidden, true);
  assert.equal(classicBtn.style.display, "none");
});

test("D4-C+_and_D5-C+_80_blocks_zero_synthetic_AT_Bloque_and_66_book_diachronic_vectors", () => {
  const profilesPath = path.join(webDir, "data", "editorial_profiles.json");
  if (fs.existsSync(profilesPath)) {
    hydrateEditorialProfiles(readJson("data/editorial_profiles.json"));
  }
  assert.equal(CANONICAL_80_BLOCKS_CATALOG.length, 80);
  for (const blk of CANONICAL_80_BLOCKS_CATALOG) {
    assert.equal(
      String(blk.rangeLabel || "").includes("AT Bloque "),
      false,
      `Block ${blk.blockId} must not contain synthetic 'AT Bloque ': ${blk.rangeLabel}`,
    );
    assert.equal(
      String(blk.rangeLabel || "").includes("NT Bloque "),
      false,
      `Block ${blk.blockId} must not contain synthetic 'NT Bloque ': ${blk.rangeLabel}`,
    );
    assert.ok(String(blk.rangeLabel || "").length >= 4);
  }

  const diachronicPath = path.join(webDir, "data", "diachronic_register_es.json");
  if (fs.existsSync(diachronicPath)) {
    hydrateDiachronicRegister(readJson("data/diachronic_register_es.json"));
    if (Object.keys(BOOK_VECTORS_66).length > 0) {
      assert.equal(Object.keys(BOOK_VECTORS_66).length, 66);
      const revMetrics = computeAnalyticalRegisterMetrics("He aquí yo vengo pronto.", "REV.22.12");
      assert.ok(revMetrics.bookVector || revMetrics.baselineAudit);
    }
  }
});

test("R36_SLICE_110_relative_pdf_asset_urls_and_14_differentiated_print_profiles", () => {
  assert.equal(
    buildRelativePdfAssetUrl("/data/blocks/es/lectura-continua/B65.pdf"),
    "data/blocks/es/lectura-continua/B65.pdf",
  );
  assert.equal(
    buildRelativePdfAssetUrl("/data/full/es-2col-a4.pdf"),
    "data/full/es-2col-a4.pdf",
  );
  const manifest = readJson("downloads_manifest.json");
  const all16 = listAll14PrintEditionsForLang(manifest, "es");
  assert.equal(all16.length, 16);
  const printProfiles = all16.filter((e) => e.kind === "edition");
  assert.equal(printProfiles.length, 14);
  for (const p of printProfiles) {
    assert.equal(p.url.startsWith("/"), false, `Profile ${p.id} URL must be relative: ${p.url}`);
    assert.ok(p.profileUrl.includes(`?profile=${p.id}`), `Profile ${p.id} must have distinct profileUrl`);
    assert.ok(p.summarySpec && p.summarySpec.includes("col") && p.summarySpec.includes("pt"));
  }
});

test("R37_SLICE_118_resolvePrintEditionPdfAssetUrl_syncPrintDrawerControls_and_imposition_preview", () => {
  assert.equal(
    resolvePrintEditionPdfAssetUrl("10_refugio_4_hojas", "es"),
    "obras/biblia/campo/refugio_4_hojas.pdf",
  );
  assert.equal(
    resolvePrintEditionPdfAssetUrl("11_checklist_80_bloques", "es"),
    "obras/biblia/campo/checklist_80_bloques.pdf",
  );
  for (const p of CANONICAL_14_PRINT_PROFILES) {
    const resolvedPath = resolvePrintEditionPdfAssetUrl(p.id, "es", p.paperSize, "B01");
    assert.equal(resolvedPath.startsWith("/"), false);
    assert.ok(
      fs.existsSync(path.join(webDir, resolvedPath)),
      `Expected physical PDF on disk for ${p.id}: ${resolvedPath}`,
    );
  }

  const domControls = {
    kindleFontSizeSlider: { value: "" },
    kindleColumnSelector: { value: "" },
    kindlePaperFormatSelector: { value: "" },
    kindleOrientationSelector: { value: "" },
    bibleFoliationModeSelect: { value: "" },
    kindleBudgetOutput: { textContent: "" },
  };
  const mockDoc = {
    getElementById: (id) => domControls[id] || null,
  };
  const synced = syncPrintDrawerControlsFromEditionProfile("02_2col_pastoral", mockDoc);
  assert.equal(synced.columns, 2);
  assert.equal(synced.foliationMode, "single_sheet_20mm");
  assert.equal(domControls.kindleColumnSelector.value, "2");
  assert.equal(domControls.bibleFoliationModeSelect.value, "single_sheet_20mm");
  assert.ok(domControls.kindleBudgetOutput.textContent.includes("col"));

  const syncedBooklet = syncPrintDrawerControlsFromEditionProfile("03_3col_compacta", mockDoc);
  assert.equal(syncedBooklet.columns, 3);
  assert.equal(syncedBooklet.foliationMode, "saddle_stitch");
  assert.equal(domControls.bibleFoliationModeSelect.value, "saddle_stitch");

  const impHtml = renderImpositionAndLayoutPreviewHtml({ mode: "imposition", paper: "A4", pageCount: 16 });
  assert.match(impHtml, /data-print-preview-mode="imposition"/);
  assert.match(impHtml, /9\.215/);

  // D4-R38: 14 print profiles must resolve to 14 distinct physical PDF paths on disk (0 identical-path collisions)
  const resolvedPaths14 = CANONICAL_14_PRINT_PROFILES.map((p) =>
    resolvePrintEditionPdfAssetUrl(p.id, "es", p.paperSize, "B01"),
  );
  const uniquePaths14 = new Set(resolvedPaths14);
  assert.equal(
    uniquePaths14.size,
    14,
    `D4-R38: All 14 print profiles must resolve to 14 distinct PDF paths, got ${uniquePaths14.size}: ${JSON.stringify(resolvedPaths14)}`,
  );
  const specBraille = resolveEditionGeometrySpec("11_braille_nemeth_b70");
  assert.equal(specBraille.columns, 1);
  assert.equal(specBraille.fontPt, 16.0);
  assert.equal(specBraille.sampleBlockId, "B11");
});









test("D8_R44_canonical_ordinal_is_exact_1_to_31102_and_drives_atomic_batches", async () => {
  const { canonicalOrdinalOf, canonicalRefOfOrdinal, CANONICAL_VERSIFICATION, CANONICAL_TOTAL_VERSES } = await import(
    "./canonical_versification.js"
  );
  const { resolveAtomicBatchForPassage } = await import("./drawer_workshop.js");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const catalog = JSON.parse(fs.readFileSync(path.join(webDir, "data", "catalog.json"), "utf8"));
  assert.deepEqual(CANONICAL_VERSIFICATION.book_order, catalog.book_order, "versificación embebida = catalog.json");
  assert.deepEqual({ ...CANONICAL_VERSIFICATION.verse_counts }, catalog.verse_counts);
  const expected = { "GEN 1 1": 1, "PSA 23 1": 14237, "MAT 1 1": 23146, "JHN 3 16": 26137, "ROM 8 28": 28145, "REV 22 21": 31102 };
  for (const [k, ord] of Object.entries(expected)) {
    const [b, c, v] = k.split(" ");
    assert.equal(canonicalOrdinalOf(b, Number(c), Number(v)), ord, k);
    assert.deepEqual(canonicalRefOfOrdinal(ord), { book: b, chapter: Number(c), verse: Number(v) });
  }
  assert.equal(CANONICAL_TOTAL_VERSES, 31102);
  assert.equal(canonicalOrdinalOf("GEN", 1, 32), null, "GEN 1 tiene 31 versículos");
  assert.equal(resolveAtomicBatchForPassage("GEN", 1, 1).batchId, "BLK-0001");
  assert.equal(resolveAtomicBatchForPassage("PSA", 23, 1).batchNumber, Math.floor((14237 - 1) / 25) + 1);
  assert.equal(resolveAtomicBatchForPassage("ROM", 8, 28).batchNumber, Math.floor((28145 - 1) / 25) + 1);
  assert.equal(resolveAtomicBatchForPassage("REV", 22, 21).batchId, "BLK-1245");
});

test("D8_R44_eco_preview_truncates_at_word_boundary", async () => {
  const { truncateAtWordBoundary, renderOfflineMeshEcoCardHtml } = await import("./offline_mesh.js");
  const gen128 =
    "Y los bendijo Dios, y les dijo: Fructificad y multiplicaos; llenad la tierra, y sojuzgadla, y señoread en los peces del mar, en las aves de los cielos, y en todas las bestias que se mueven sobre la tierra.";
  const cut = truncateAtWordBoundary(gen128, 120);
  assert.ok(cut.endsWith("…"));
  assert.ok(cut.length <= 121, `longitud ${cut.length}`);
  const lastWord = cut.slice(0, -1).split(" ").pop();
  assert.ok(gen128.split(/[\s,;:.]+/).includes(lastWord), `palabra cortada a la mitad: «${lastWord}»`);
  assert.equal(truncateAtWordBoundary("Jesús lloró.", 120), "Jesús lloró.");
  const html = renderOfflineMeshEcoCardHtml({
    activeLang: "es",
    activeVerseOrdinal: 27,
    activeVerseRef: "GEN.1.28",
    activeVerseText: gen128,
    uiLocale: "es",
  });
  assert.ok(!html.includes("llenad la tie»"), "la vista previa no debe cortar «tierra»");
});
