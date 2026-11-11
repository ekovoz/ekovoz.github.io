import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applyOrthographyProfile,
  buildEvangeliosWeekOptionsHtml,
  createMostradorController,
  deriveEpistemicSeal,
  renderChapterPreviewHtml,
  renderEvangeliosStageCardHtml,
  STATUS,
} from "../mostrador.js";
import { runWithProcessUndefined } from "../test_support/no_process_runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");

function createDiskBackedSource() {
  return {
    async readJson(relUrl) {
      const clean = relUrl.replace(/^\//, "");
      const fullPath = path.join(WEB_DIR, clean);
      if (!fs.existsSync(fullPath)) return null;
      return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    },
    async readBytes(relUrl) {
      const clean = relUrl.replace(/^\//, "");
      const fullPath = path.join(WEB_DIR, clean);
      if (!fs.existsSync(fullPath)) return null;
      return new Uint8Array(fs.readFileSync(fullPath));
    },
  };
}

function createMockDom() {
  const elements = {};
  const ensureEl = (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        hidden: id.endsWith("Panel") || id.endsWith("Sheet"),
        innerHTML: "",
        textContent: "",
        value: "",
        attrs: {},
        listeners: {},
        setAttribute(k, v) {
          this.attrs[k] = String(v);
        },
        getAttribute(k) {
          return this.attrs[k] ?? null;
        },
        addEventListener(ev, fn) {
          this.listeners[ev] = fn;
        },
        querySelectorAll() {
          return [];
        },
      };
    }
    return elements[id];
  };

  for (const id of [
    "bibleSovereignSection",
    "bibleVerseViewport",
    "epistemicStatusSeal",
    "bibleSelectBook",
    "bibleSelectChapter",
    "bibleSelectLang",
    "btnOpenCompass",
    "bibleEasyDrawerPanel",
    "biblePrintEditionsSheet",
    "bibleFieldWorkshopSheet",
    "bibleShareAndAuditSheet",
    "bibleEasyDrawer",
    "btnOpenPrintEditionsSheet",
    "btnOpenFieldWorkshopSheet",
    "btnOpenShareAndAuditSheet",
    "leipzig14ColStratumAction",
    "socraticElicitorContainer",
    "linkDose2BlockPdf",
    "linkDose3FullBiblePdf",
    "btnDose1Sheets",
  ]) {
    ensureEl(id);
  }

  return {
    elements,
    documentElement: {
      attrs: { lang: "en", dir: "ltr" },
      setAttribute(k, v) {
        this.attrs[k] = String(v);
      },
      getAttribute(k) {
        return this.attrs[k] ?? null;
      },
    },
    getElementById(id) {
      return ensureEl(id);
    },
    querySelectorAll() {
      return [];
    },
  };
}

test("seal_derived_from_loaded_data_not_hardcoded", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "ROM",
    chapter: 1,
    verse: 16,
  });

  // 1. Spanish ROM.1 -> verified seal and contains "Pablo", never "Palabra" (John 1)
  const navEs = await ctrl.navigate({ lang: "es", book: "ROM", chapter: 1, verse: 16 });
  assert.equal(navEs.status, STATUS.READY);
  assert.equal(ctrl.state.seal, "seal.verified");
  assert.equal(mockDoc.elements.epistemicStatusSeal.getAttribute("data-seal"), "seal.verified");
  assert.ok(
    /pablo/i.test(mockDoc.elements.bibleVerseViewport.innerHTML),
    "ROM.1 in Spanish must contain 'Pablo'"
  );
  assert.equal(
    mockDoc.elements.bibleVerseViewport.innerHTML.includes("En el principio era el Verbo"),
    false,
    "ROM.1 must never fall back to John 1"
  );

  // 2. O'dam (stp) GEN.1 -> draft review seal
  const navStp = await ctrl.navigate({ lang: "stp", book: "GEN", chapter: 1, verse: 1 });
  assert.equal(navStp.status, STATUS.READY);
  assert.equal(ctrl.state.seal, "seal.draft_review");
  assert.equal(
    mockDoc.elements.epistemicStatusSeal.getAttribute("data-seal"),
    "seal.draft_review"
  );

  // 3. Unavailable language -> seal.unavailable and zero silent fallback
  const navMissing = await ctrl.navigate({ lang: "tlh", book: "ROM", chapter: 1, verse: 1 });
  assert.equal(navMissing.status, STATUS.UNAVAILABLE);
  assert.equal(ctrl.state.seal, "seal.unavailable");
  assert.equal(
    mockDoc.elements.epistemicStatusSeal.getAttribute("data-seal"),
    "seal.unavailable"
  );
  assert.equal(
    deriveEpistemicSeal({ status: STATUS.UNAVAILABLE, chapter: null }),
    "seal.unavailable"
  );
});

test("harel_xor_at_most_one_sheet_open", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });

  assert.equal(ctrl.countVisibleSheets(mockDoc), 0);

  for (const sheet of ["study", "print", "field", "share"]) {
    await ctrl.transitionSheet(sheet, mockDoc);
    assert.equal(ctrl.state.activeSheet, sheet);
    assert.equal(
      ctrl.countVisibleSheets(mockDoc),
      1,
      `Opening '${sheet}' must leave exactly 1 visible sheet`
    );
  }

  // Second click on active sheet closes it
  await ctrl.transitionSheet("share", mockDoc);
  assert.equal(ctrl.state.activeSheet, null);
  assert.equal(ctrl.countVisibleSheets(mockDoc), 0);
});

test("dose1_button_extracts_real_typst_pdf_pages", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "ROM",
    chapter: 1,
    verse: 16,
    sheets: 2,
    duplex: true,
  });

  await ctrl.navigate({ lang: "es", book: "ROM", chapter: 1, verse: 16 });
  const dose1 = await ctrl.dispenseDose1({ sheets: 2, duplex: true });

  assert.ok(dose1.bytes instanceof Uint8Array);
  assert.ok(dose1.bytes.byteLength > 1000, "Dose 1 extracted Typst PDF must be > 1 KB");
  const header = new TextDecoder("latin1").decode(dose1.bytes.subarray(0, 8));
  assert.equal(header, "%PDF-1.7");
  assert.ok(dose1.pageCount >= 1 && dose1.pageCount <= 4);
  assert.ok(dose1.filename.endsWith(".pdf"));
});

test("study_and_improve_drawers_lazy_load", async () => {
  let studyLoads = 0;
  let improveLoads = 0;
  const mockDoc = createMockDom();

  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "ROM",
    chapter: 1,
    verse: 1,
    loadStudyModule: async () => {
      studyLoads += 1;
      return import("./estudio.js");
    },
    loadImproveModule: async () => {
      improveLoads += 1;
      return import("./mejorar.js");
    },
  });

  await ctrl.navigate({ lang: "es", book: "ROM", chapter: 1, verse: 1 });
  assert.equal(studyLoads, 0, "Study module must not load on initial navigation");
  assert.equal(improveLoads, 0, "Improve module must not load on initial navigation");

  await ctrl.transitionSheet("study", mockDoc);
  assert.equal(studyLoads, 1, "Study module loads when study drawer opens");
  assert.ok(
    mockDoc.elements.leipzig14ColStratumAction.innerHTML.includes('data-osis="ROM.1.1"')
  );

  await ctrl.transitionSheet("field", mockDoc);
  assert.equal(improveLoads, 1, "Improve module loads when field/improve drawer opens");
  assert.ok(
    mockDoc.elements.socraticElicitorContainer.innerHTML.includes("EKOVOZ_PATCH_PAYLOAD")
  );
});

test("zero_data_inv_or_unmounted_fn_in_index_html", () => {
  const html = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.equal(
    html.includes("data-inv="),
    false,
    "DEB-R20-07: web/index.html must contain 0 data-inv attributes"
  );
  assert.equal(
    html.includes("data-fn="),
    false,
    "DEB-R20-07: web/index.html must contain 0 data-fn attributes"
  );
  assert.equal(
    html.includes("UNMOUNTED_CLIENT_FN"),
    false,
    "DEB-R20-07: web/index.html must contain 0 UNMOUNTED_CLIENT_FN markers"
  );

  // Also verify mostrador.js runs with process === undefined in vm
  const res = runWithProcessUndefined(path.join(WEB_DIR, "mostrador.js"), (mod) => {
    const seal = mod.deriveEpistemicSeal({
      status: "ready",
      lang: "es",
      chapter: { verses: { "1": "Pablo, siervo de Jesucristo" } },
      meta: { draft_status: "verified" },
    });
    return seal;
  });
  assert.equal(res, "seal.verified");
});

test("pericope_blocks_and_inline_verse_selection_update_state_and_study", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });
  ctrl.bindDomEvents(mockDoc);
  await ctrl.navigate({ lang: "es", book: "JHN", chapter: 1, verse: 1 });

  const vpHtml = mockDoc.elements.bibleVerseViewport.innerHTML;
  assert.ok(
    vpHtml.includes('class="mostrador-pericope-block"'),
    "Must partition verses into .mostrador-pericope-block containers"
  );
  assert.ok(
    vpHtml.includes("bible-chapter-dropcap"),
    "Verse 1 must include 2-line dropcap .bible-chapter-dropcap"
  );
  assert.ok(
    vpHtml.includes("mostrador-verse") && vpHtml.includes('is-selected" data-verse="1"'),
    "Selected verse must carry .mostrador-verse.is-selected"
  );

  // Select verse 14 and verify state and open study drawer update
  await ctrl.transitionSheet("study", mockDoc);
  await ctrl.selectVerse(14, mockDoc);
  assert.equal(ctrl.state.verse, 14);
  assert.ok(
    mockDoc.elements.bibleVerseViewport.innerHTML.includes(
      'class="mostrador-verse bible-verse-line is-selected" data-verse="14"'
    )
  );
  assert.ok(
    mockDoc.elements.leipzig14ColStratumAction.innerHTML.includes('data-osis="JHN.1.14"')
  );
});

test("register_switching_loads_es1909_and_bilingual_58_42_diptych", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });
  ctrl.bindDomEvents(mockDoc);
  await ctrl.navigate({ lang: "es", book: "JHN", chapter: 1, verse: 1 });

  // Switch to classical register (es-1909) — D3-E+ preserves state.lang === "es" while effectiveCorpusLang === "es-1909"
  await mockDoc.getElementById("btnRegClasica").listeners.click();
  assert.equal(ctrl.state.lang, "es");
  assert.equal(ctrl.state.effectiveCorpusLang, "es-1909");
  assert.equal(ctrl.state.register, "clasica");
  assert.equal(ctrl.state.seal, "seal.verified");

  // Switch to bilingual diptych (58% / 42%)
  await mockDoc.getElementById("btnRegBilingue").listeners.click();
  assert.equal(ctrl.state.register, "bilingue");
  assert.ok(
    mockDoc.elements.bibleVerseViewport.innerHTML.includes("mostrador-bilingue-diptych"),
    "Bilingual register must render .mostrador-bilingue-diptych"
  );
  assert.ok(
    mockDoc.elements.bibleVerseViewport.innerHTML.includes("minmax(0,58fr) minmax(0,42fr)"),
    "Bilingual diptych must enforce asymmetric 58/42 columns"
  );
});

test("both_dose1_buttons_receive_listeners_and_print_config_updates_edition", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "ROM",
    chapter: 1,
    verse: 16,
  });
  ctrl.bindDomEvents(mockDoc);
  await ctrl.navigate({ lang: "es", book: "ROM", chapter: 1, verse: 16 });

  assert.equal(
    typeof mockDoc.getElementById("btnDose1Sheets").listeners.click,
    "function",
    "#btnDose1Sheets must have a click listener"
  );
  assert.equal(
    typeof mockDoc.getElementById("btnPrintAroundVerse").listeners.click,
    "function",
    "#btnPrintAroundVerse must also have a click listener (DEB-EKO-03 resolved)"
  );

  const pkg = await mockDoc.getElementById("btnPrintAroundVerse").listeners.click();
  assert.ok(pkg.bytes instanceof Uint8Array && pkg.bytes.byteLength > 1000);
});

test("compass_modal_oral_portico_and_8_life_trails_navigate_to_anchor_passages", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });
  ctrl.bindDomEvents(mockDoc);
  await ctrl.navigate({ lang: "es", book: "JHN", chapter: 1, verse: 1 });

  // Oral Portico toggle
  mockDoc.getElementById("btnToggleAudioNarakeet").listeners.click();
  assert.equal(ctrl.state.oralPorticoActive, true);
  assert.ok(
    mockDoc.getElementById("bibleOralPorticoBanner").innerHTML.includes("0 Bytes Audio")
  );
  assert.ok(
    mockDoc.elements.bibleVerseViewport.innerHTML.includes("[Pausa silenciosa · 3s]")
  );

  // Life trail navigation (Consuelo -> PSA 23:1)
  await mockDoc.getElementById("btnTrailConsuelo").listeners.click();
  assert.equal(ctrl.state.book, "PSA");
  assert.equal(ctrl.state.chapter, 23);
  assert.equal(ctrl.state.verse, 1);

  // Orthography pills hidden for es, visible for stp
  assert.equal(mockDoc.getElementById("bibleOrthographyPills").hidden, true);
  await ctrl.navigate({ lang: "stp", book: "GEN", chapter: 1, verse: 1 });
  assert.equal(mockDoc.getElementById("bibleOrthographyPills").hidden, false);
});

test("study_drawer_populates_3_semantic_strata_and_field_share_drawers_populate", async () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });
  ctrl.bindDomEvents(mockDoc);
  await ctrl.navigate({ lang: "es", book: "JHN", chapter: 1, verse: 1 });

  await ctrl.transitionSheet("study", mockDoc);
  assert.ok(mockDoc.getElementById("nsm65StratumCard").innerHTML.includes("NSM-65"));
  assert.ok(mockDoc.getElementById("realiaMetrologyStratumCard").innerHTML.includes("Realia"));
  assert.ok(mockDoc.getElementById("tskCrossRefsStratumCard").innerHTML.includes("TSK"));

  await ctrl.transitionSheet("field", mockDoc);
  assert.ok(
    mockDoc.getElementById("cascadeImpactPreviewList").innerHTML.includes("CELF-250")
  );
  assert.ok(
    mockDoc.getElementById("tallerArtifactsCatalog").innerHTML.includes("CC0")
  );

  await ctrl.transitionSheet("share", mockDoc);
  assert.ok(
    mockDoc.getElementById("bibleOpticalQrStreamPanel").innerHTML.includes("6.67")
  );
});

test("foveal_folding_sets_data_inspector_open_and_purges_obsolete_modals_and_cloned_ekovoz_html", () => {
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });

  return (async () => {
    await ctrl.transitionSheet("study", mockDoc);
    assert.equal(mockDoc.getElementById("bibleVerseViewport").getAttribute("data-inspector-open"), "true");
    await ctrl.transitionSheet("study", mockDoc);
    assert.equal(mockDoc.getElementById("bibleVerseViewport").getAttribute("data-inspector-open"), "false");

    const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
    for (const deadModal of ['id="langModal"', 'id="opticalModal"', 'id="contactModal"', 'id="foldModal"']) {
      assert.equal(indexHtml.includes(deadModal), false, `index.html must not contain ${deadModal}`);
    }

    assert.equal(
      fs.existsSync(path.join(WEB_DIR, "ekovoz.html")),
      false,
      "D1-R+: static clone web/ekovoz.html must be permanently purged",
    );
    for (const loc of ["ar", "bn", "en", "es", "fa", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "tr", "ur", "zh"]) {
      assert.equal(
        fs.existsSync(path.join(WEB_DIR, loc)),
        false,
        `D1-R+: static locale clone directory web/${loc}/ must not exist`,
      );
    }

    const mostradorSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");
    assert.equal(/min-height:\s*(?:36|38|40|42|44)px/.test(mostradorSrc), false, "DEB-DOM-10: zero sub-48px tap targets in mostrador.js");
  })();
});

test("d1_to_d9_b_plus_sovereign_parity_wfst_diachronic_rosetta_imposition_pda_eco1_and_global_drawers", async () => {
  // 1. D1-B+: Contextual WFST preserves loanwords and removes literal "[bn-BD]" prefix
  assert.equal(applyOrthographyProfile("Jich kam Cristo kilo", "tradicional", "stp"), "Jich cam Cristo kilo");
  const bnText = applyOrthographyProfile("যীশু খ্রীষ্ট ঈশ্বরের পুত্র", "bn-BD", "bn");
  assert.equal(bnText.includes("[bn-BD]"), false, "Must never prepend literal [bn-BD] string");
  assert.ok(bnText.includes("ঈসা মসীহ"));

  // 2. D2-B+ & D7-B+: Masoretic Pericope markers (פ / ס) and Analytical Register Metrics
  const previewHtml = renderChapterPreviewHtml(
    "JHN",
    1,
    "es",
    {
      verses: {
        "1": "En el principio era el Verbo.",
        "6": "Hubo un hombre enviado de Dios, el cual se llamaba Juan.",
        "14": "Y aquel Verbo fue hecho carne, y habitó entre nosotros.",
      },
    },
    null,
    { register: "intergeneracional", selectedVerse: 1 },
  );
  assert.match(previewHtml, /data-masoretic-marker="פ"/);
  assert.match(previewHtml, /data-aoa="/);
  assert.match(previewHtml, /data-mdd="/);
  assert.match(previewHtml, /data-eipen-l="/);

  // 3. D8-B+ & D9-B+: Global Harel Drawers host, zero duplicate selectors, Fitts 48px summary, Pelli-Bouma
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.ok(indexHtml.includes('id="sovereignGlobalDrawersHost"'), "D8-B+: Global Harel drawers host must exist");
  assert.equal(indexHtml.includes('id="paperFormatDrawer"'), false, "D8-B+: Duplicate #paperFormatDrawer must be purged");
  assert.equal(indexHtml.includes('id="evangeliosLangSelect"'), true, "D2-A+ (D72): 7-language #evangeliosLangSelect must be present in #evangeliosSovereignSection");
  assert.ok(indexHtml.includes("button,select,.uls-chip,.uls-trigger-btn,summary{min-height:48px;min-width:48px;}"), "D9-B+: summary must enforce 48px tap target");

  // 4. Debris Purge Verification
  assert.equal(fs.existsSync(path.resolve(WEB_DIR, "..", "portal_publico")), false, "portal_publico debris must be purged");
  assert.equal(fs.existsSync(path.join(WEB_DIR, "bible_reader.js")), false, "web/bible_reader.js debris must be purged");
  assert.equal(fs.existsSync(path.join(WEB_DIR, "bible_reader.test.mjs")), false, "web/bible_reader.test.mjs debris must be purged");
  assert.equal(fs.existsSync(path.join(WEB_DIR, "es")), false, "Static localized clone web/es/ must be purged");
});

test("D8-E+: sw.js SHELL_CORE_ASSETS covers 100% of static ES module graph imported by mostrador.js", async () => {
  const { SHELL_CORE_ASSETS } = await import("../sw.js");
  const { triggerOptInOfflinePackDownload } = await import("./offline_mesh.js");
  const mostradorSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");

  const importRegex = /from\s+["'](\.[^"']+\.js)["']/g;
  const importedModules = [];
  let match;
  while ((match = importRegex.exec(mostradorSrc)) !== null) {
    const normalized = match[1].replace(/^\./, "");
    importedModules.push(normalized);
  }
  assert.ok(importedModules.length >= 12, `Expected >= 12 static imports in mostrador.js, got ${importedModules.length}`);

  for (const modPath of importedModules) {
    assert.ok(
      SHELL_CORE_ASSETS.includes(modPath),
      `D8-E+ violation: module ${modPath} imported by web/mostrador.js is missing from SHELL_CORE_ASSETS in web/sw.js`
    );
    const diskPath = path.join(WEB_DIR, modPath.replace(/^\//, ""));
    assert.equal(fs.existsSync(diskPath), true, `Module ${modPath} in SHELL_CORE_ASSETS must exist on disk`);
  }

  let addedAssets = [];
  const res = await triggerOptInOfflinePackDownload({
    uiLocale: "es",
    lang: "stp",
    books: ["GEN", "JHN"],
    cachesApi: {
      async open() {
        return {
          async addAll(list) {
            addedAssets = list;
          },
        };
      },
    },
  });
  assert.equal(res.optInActive, true);
  assert.ok(addedAssets.includes("/mostrador/estudio.js"));
  assert.ok(addedAssets.includes("/mostrador/mejorar.js"));
  assert.ok(addedAssets.includes("/mostrador/diachronic_register.js"));
  assert.ok(addedAssets.includes("/i18n_ui.js"));
});

test("D7-C+_and_D8-C+_ARB_EKOVOZ_62_pre_render_hydration_zero_dto_drop_and_zero_dead_web_builder_or_orphaned_tests", async () => {
  const mostradorSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");
  const opticalSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador", "optical_lt.js"), "utf8");
  assert.equal(mostradorSrc.includes("Object.freeze("), false, "D7-C+: zero Object.freeze in mostrador.js");
  assert.equal(opticalSrc.includes("Object.freeze("), false, "D7-C+: zero Object.freeze in optical_lt.js");

  const webBuilderRs = fs.readFileSync(
    path.resolve(WEB_DIR, "..", "crates", "xtask", "src", "web_builder.rs"),
    "utf8",
  );
  assert.equal(
    webBuilderRs.includes("build_all_language_pages"),
    false,
    "D8-C+: dead build_all_language_pages must be purged from web_builder.rs",
  );

  for (const deadTest of [
    "bible_reader_audit.test.mjs",
    "bible_reader_Branches_DEF.test.mjs",
    "bible_reader_ui_ergonomics.test.mjs",
  ]) {
    assert.equal(
      fs.existsSync(path.resolve(WEB_DIR, "..", "tests", deadTest)),
      false,
      `D8-C+: orphaned test tests/${deadTest} must be purged`,
    );
  }
});

test("D1_to_D9_S21_plus_ARB_EKOVOZ_63_complete_section_2_1_backend_surface_projection", async () => {
  const {
    listOrthographyProfilesForLang,
    resolveOrthoFamilyKey,
    resolveScriptioContinuaCodeForLang,
    listAll14PrintEditionsForLang,
    CANONICAL_16_TYPOLOGY_PROFILES,
    resolveCanonicalBlockForPassage,
    renderBranchAndTypologyInspectorHtml,
    computeProsodyAndSyllableAlignmentInWasm,
    computeNyquistSafeFpsViaWasm,
    runOpticalReceiverBurstSession,
    renderOpticalReceiverRxPanelHtml,
    renderStpLexiconExplorerHtml,
    summarizeChapterDiachronicTransformations,
    renderAnalyticalThermometerHtml,
  } = await import("../mostrador.js");

  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "GEN",
    chapter: 1,
    verse: 1,
  });
  ctrl.bindDomEvents(mockDoc);

  // 1. D1-S21+: 5 WFST Orthographic Families (stp, bn, arb, uzn, tzm) + ReverseOrthographyMap + Scriptio Continua (7 scripts)
  assert.equal(resolveOrthoFamilyKey("stp"), "stp");
  assert.equal(resolveOrthoFamilyKey("bn-BD"), "bn");
  assert.equal(resolveOrthoFamilyKey("arb"), "arb");
  assert.equal(resolveOrthoFamilyKey("uzn"), "uzn");
  assert.equal(resolveOrthoFamilyKey("tzm"), "tzm");
  assert.equal(listOrthographyProfilesForLang("stp").length, 3);
  assert.equal(listOrthographyProfilesForLang("bn").length, 2);
  assert.equal(listOrthographyProfilesForLang("arb").length, 2);
  assert.equal(listOrthographyProfilesForLang("uzn").length, 2);
  assert.equal(listOrthographyProfilesForLang("tzm").length, 2);
  assert.equal(resolveScriptioContinuaCodeForLang("zh"), "Hans");
  assert.equal(resolveScriptioContinuaCodeForLang("ja"), "Jpan");
  assert.equal(resolveScriptioContinuaCodeForLang("th"), "Thai");

  await ctrl.navigate({ lang: "bn", book: "GEN", chapter: 1, verse: 1 }, mockDoc);
  assert.equal(mockDoc.getElementById("bibleOrthographyPills").hidden, false);
  assert.equal(mockDoc.getElementById("btnOrthoBnBd").hidden, false);
  assert.equal(mockDoc.getElementById("btnOrthoBnIn").hidden, false);
  assert.equal(mockDoc.getElementById("btnOrthoInali").hidden, true);
  mockDoc.getElementById("btnOrthoBnIn").listeners.click();
  assert.equal(ctrl.state.orthographyProfile, "bn-IN");

  await ctrl.navigate({ lang: "arb", book: "GEN", chapter: 1, verse: 1 }, mockDoc);
  assert.equal(mockDoc.getElementById("btnOrthoArbTashkeel").hidden, false);
  assert.equal(mockDoc.getElementById("btnOrthoBnBd").hidden, true);
  mockDoc.getElementById("btnOrthoArbTashkeel").listeners.click();
  assert.equal(ctrl.state.orthographyProfile, "TASHKEEL_STRIPPED");
  mockDoc.getElementById("btnOrthoArbTashkeel").listeners.click();
  assert.equal(ctrl.state.orthographyProfile, "VOWELIZED");

  await ctrl.navigate({ lang: "uzn", book: "GEN", chapter: 1, verse: 1 }, mockDoc);
  assert.equal(mockDoc.getElementById("btnOrthoUznCyrl").hidden, false);
  mockDoc.getElementById("btnOrthoUznCyrl").listeners.click();
  assert.equal(ctrl.state.orthographyProfile, "CYRL");

  await ctrl.navigate({ lang: "tzm", book: "GEN", chapter: 1, verse: 1 }, mockDoc);
  assert.equal(mockDoc.getElementById("btnOrthoTzmTfng").hidden, false);
  mockDoc.getElementById("btnOrthoTzmTfng").listeners.click();
  assert.equal(ctrl.state.orthographyProfile, "TFNG");

  // 2. D2-S21+, D3-S21+, D4-S21+: 14 Print Profiles (+ 2 field PDFs = 16), 80 Canonical Blocks, 12 Branches & 16 Typological Sheets
  const allEditions = listAll14PrintEditionsForLang("es", "es");
  assert.equal(allEditions.length, 16);
  assert.equal(CANONICAL_16_TYPOLOGY_PROFILES.length, 16);
  const resolvedRom = resolveCanonicalBlockForPassage("ROM", 8);
  assert.ok(resolvedRom.blockNumber >= 61 && resolvedRom.blockNumber <= 80);
  const branchHtml = renderBranchAndTypologyInspectorHtml({ lang: "stp" });
  assert.match(branchHtml, /data-branch-count="12"/);
  assert.match(branchHtml, /data-typology-count="16"/);

  await ctrl.transitionSheet("print", mockDoc);
  assert.equal(mockDoc.getElementById("bibleEditionsCatalogGrid").getAttribute("data-editions-count"), "16");
  assert.ok(mockDoc.getElementById("duplexAssistantPanel").innerHTML.includes('id="canonicalBlockSelect"'));
  assert.ok(mockDoc.getElementById("bibleBranchAndTypologyPanel").innerHTML.includes('id="branchProfileSelect"'));

  // 3. D5-S21+: Live WASM Prosodic Pause & Syllable Alignment Console
  const prosody = computeProsodyAndSyllableAlignmentInWasm({
    text: "En el principio creó Dios los cielos y la tierra.",
    wpm: 120,
    elapsedMs: 5000,
    totalMs: 10000,
  });
  assert.ok(prosody.pausePeriodSelahMs > prosody.pauseCommaMs);
  assert.ok(prosody.crc16 > 0);
  assert.ok(prosody.syllableCount >= 8);

  // 4. D6-S21+: Air-Gapped Optical Receiver (QrStreamSession + RaptorQ Syndrome + Nyquist CMOS)
  const nyq = computeNyquistSafeFpsViaWasm(8000, 14, null);
  assert.ok(nyq.safeFps >= 6.0 && nyq.safeFps <= 7.5);
  const rxReport = runOpticalReceiverBurstSession({
    payloadText: "GEN.1.1 · En el principio creó Dios los cielos y la tierra.",
    shutterUs: 8000,
    rollingReadoutMs: 14,
    simulatedDrops: [1],
  });
  assert.equal(rxReport.complete, true);
  assert.equal(rxReport.payloadMatches, true);
  assert.ok(rxReport.duplicateFramesDropped >= 1);
  assert.ok(rxReport.raptorqSyndrome > 0);
  const rxHtml = renderOpticalReceiverRxPanelHtml(rxReport);
  assert.match(rxHtml, /data-rx-complete="true"/);

  // 5. D7-S21+: Interactive 600-Term FIELD_WORKSHOP_STP_LEXICON Explorer & 5 OT Waves Filter
  await ctrl.navigate({ lang: "stp", book: "GEN", chapter: 1, verse: 1 }, mockDoc);
  await ctrl.transitionSheet("field", mockDoc);
  const lexHtml = renderStpLexiconExplorerHtml({ query: "H0430", activeWave: 1 });
  assert.match(lexHtml, /id="stpLexiconExplorerPanel"/);
  assert.match(lexHtml, /data-lex-strong="H0430"/);
  assert.ok(mockDoc.getElementById("cascadeImpactPreviewList").innerHTML.includes("ot-wave-filter-btn"));

  // 6. D8-S21+: Diachronic Tier 1/2/3 Breakdown + BOOK_VECTORS_66 + INTERGENERATIONAL_CORE_RULES
  const diaSummary = summarizeChapterDiachronicTransformations(
    ["Jehová díjoles: habéis visto el tabernáculo."],
    "GEN"
  );
  assert.ok(diaSummary.tier1LexicalCount >= 2);
  assert.ok(diaSummary.tier2MorphologicalCount >= 1);
  assert.ok(diaSummary.tier3EncliticCount >= 1);
  const thermoHtml = renderAnalyticalThermometerHtml({
    verses: ["Jehová díjoles: habéis visto el tabernáculo."],
    bookCode: "GEN",
    osisRef: "GEN.1.1",
  });
  assert.match(thermoHtml, /data-tier1-count="/);
  assert.match(thermoHtml, /data-tier2-count="/);
  assert.match(thermoHtml, /data-tier3-count="/);
  assert.match(thermoHtml, /data-book-vector-code="GEN"/);
});

test("D52_to_D59_ARB_EKOVOZ_64_stage3_apple_hig_and_rosetta_explorer_u7", async () => {
  const {
    projectCrossWorkCoordinate,
    parseInitialRouteAndLocale,
    serializeMostradorRouteQuery,
    LIFE_TRAILS_ANCHORS,
    parseCanonicalOtEchoRef,
    renderEvangeliosPlateActionsHtml,
    searchPhilologyRosettaIndex,
    renderPhilologyRosettaExplorerHtml,
  } = await import("../mostrador.js");

  // 1. D52 (1C+): Polymorphic projectCrossWorkCoordinate (object & positional signatures)
  const projObj = projectCrossWorkCoordinate({
    fromWork: "biblia",
    toWork: "evangelios",
    book: "LUK",
    chapter: 15,
    verse: 11,
    plateIndex: 12,
    weekId: "s01",
  });
  assert.equal(projObj.fromWork, "biblia");
  assert.equal(projObj.toWork, "evangelios");
  assert.equal(projObj.book, "LUK");
  assert.equal(projObj.chapter, 15);
  assert.equal(projObj.evangeliosWeekId, "s27");
  assert.equal(projObj.weekId, "s27");
  assert.equal(projObj.evangeliosQuarter, "T3");

  const projPos = projectCrossWorkCoordinate("evangelios", "biblia", {
    evangeliosWeekId: "s40",
  });
  assert.equal(projPos.book, "JHN");
  assert.equal(projPos.chapter, 20);
  assert.equal(projPos.verse, 19);
  assert.equal(projPos.weekId, "s40");

  const projDicha = projectCrossWorkCoordinate({
    fromWork: "felices",
    toWork: "biblia",
    dichaIndex: 10,
  });
  assert.equal(projDicha.book, "LUK");
  assert.equal(projDicha.chapter, 11);
  assert.equal(projDicha.verse, 28);

  // 2. D53 (2C+): Isomorphic URL Query State Codec
  const routeFel = parseInitialRouteAndLocale({
    search: "?work=felices&plate=14&dicha=7&ui=es&lang=stp",
  });
  assert.equal(routeFel.work, "felices");
  assert.equal(routeFel.plate, 14);
  assert.equal(routeFel.dicha, 7);
  assert.equal(routeFel.ui, "es");
  assert.equal(routeFel.lang, "stp");
  assert.equal(routeFel.ref, "MAT.5.8");

  const routeEva = parseInitialRouteAndLocale({
    search: "?work=evangelios&week=27&lang=es",
  });
  assert.equal(routeEva.work, "evangelios");
  assert.equal(routeEva.week, "s27");

  const querySerialized = serializeMostradorRouteQuery({
    activeWork: "felices",
    uiLocale: "es",
    lang: "stp",
    book: "MAT",
    chapter: 5,
    verse: 8,
    activePlateIndex: 14,
    activeDichaIndex: 7,
  });
  assert.match(querySerialized, /work=felices/);
  assert.match(querySerialized, /plate=14/);
  assert.match(querySerialized, /dicha=7/);

  // 3. D54 (3C+): LIFE_TRAILS_ANCHORS.btnTrailFamilia -> 1CO 13:4 & aria-pressed
  assert.ok(LIFE_TRAILS_ANCHORS.btnTrailFamilia, "btnTrailFamilia must exist in LIFE_TRAILS_ANCHORS");
  assert.equal(LIFE_TRAILS_ANCHORS.btnTrailFamilia.book, "1CO");
  assert.equal(LIFE_TRAILS_ANCHORS.btnTrailFamilia.chapter, 13);
  assert.equal(LIFE_TRAILS_ANCHORS.btnTrailFamilia.verse, 4);

  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    source: createDiskBackedSource(),
    doc: mockDoc,
    lang: "es",
    book: "JHN",
    chapter: 1,
    verse: 1,
  });
  ctrl.bindDomEvents(mockDoc);
  await mockDoc.getElementById("btnTrailFamilia").listeners.click();
  assert.equal(ctrl.state.book, "1CO");
  assert.equal(ctrl.state.chapter, 13);
  assert.equal(ctrl.state.verse, 4);
  assert.equal(mockDoc.getElementById("btnTrailFamilia").getAttribute("aria-pressed"), "true");
  assert.equal(mockDoc.getElementById("btnTrailConsuelo").getAttribute("aria-pressed"), "false");

  // 4. D56 (5C+): Evangelios OT Echo Jump, Pericope Blocks & Questions without duplicate drawer buttons
  const parsedOt = parseCanonicalOtEchoRef("EXO.25.8 (Habitaré entre ellos)");
  assert.equal(parsedOt.refCode, "EXO.25.8");
  const evCardHtml = renderEvangeliosPlateActionsHtml({
    weekId: "s01",
    passageRef: "JHN.1.1",
    lang: "es",
  });
  assert.ok(!evCardHtml.includes("evangelios-inspector-actions"), "Duplicate drawer buttons must be removed");
  assert.match(evCardHtml, /class="uls-chip ot-echo-jump-chip"/);
  assert.match(evCardHtml, /data-ot-echo-ref="GEN\.1\.1"/);
  assert.match(evCardHtml, /id="evangeliosPericopeBlocksList"/);
  assert.match(evCardHtml, /id="evangeliosQuestionsList"/);

  // 5. D57 (6C+): Interactive PHILOLOGY_ROSETTA_DEFAULT_INDEX Explorer (B7 -> U7)
  const allRosetta = searchPhilologyRosettaIndex("", "all", 25);
  assert.ok(allRosetta.length >= 15, `Expected >= 15 Rosetta items across 5 sub-corpora, got ${allRosetta.length}`);
  const kqRosetta = searchPhilologyRosettaIndex("PSA", "ketiv_qere", 10);
  assert.ok(kqRosetta.length >= 2);
  const explorerHtml = renderPhilologyRosettaExplorerHtml({
    query: "H7225",
    category: "cognates",
    activeRef: "GEN.1.1",
  });
  assert.match(explorerHtml, /id="philologyRosettaExplorerPanel"/);
  assert.match(explorerHtml, /id="rosettaFilterCategorySelect"/);
  assert.match(explorerHtml, /id="rosettaSearchInput"/);
  assert.match(explorerHtml, /class="uls-chip rosetta-jump-chip"/);
});

test("D62_to_D69_ARB_EKOVOZ_65_reactive_router_quotient_lens_focus_preservation_and_zero_404", async () => {
  const {
    MOSTRADOR_DOM_BINDINGS,
    bootBrowserMostrador,
    createMostradorController,
    parseInitialRouteAndLocale,
    resolvePlateForBibleCoordinate,
    serializeMostradorRouteQuery,
  } = await import("../mostrador.js");

  // 1. D65 (4B+): Quotient Lens preserves even plate fibers (PutGet) and ?dicha=N without ?ref=
  for (let p = 1; p <= 28; p += 1) {
    const coord = resolvePlateForBibleCoordinate("MAT", 5, 3, p);
    if (p === 1 || p === 2) {
      assert.equal(coord, p, `Even/odd fiber plate ${p} for MAT 5:3 must be preserved`);
    }
  }
  assert.equal(resolvePlateForBibleCoordinate("MAT", 5, 8, 14), 14);
  assert.equal(resolvePlateForBibleCoordinate("MAT", 5, 8, 13), 13);

  const dichaRoute = parseInitialRouteAndLocale({
    search: "?work=felices&dicha=7&format=letter",
  });
  assert.equal(dichaRoute.work, "felices");
  assert.equal(dichaRoute.dicha, 7);
  assert.equal(dichaRoute.ref, "MAT.5.8");
  assert.equal(dichaRoute.format, "letter");

  // 2. D62 (1C+) & D64 (3C+) & D66 (5C+): Reactive URL History & Cross-Work Coordinate Sync
  const historyLog = [];
  const mockDoc = createMockDom();
  const mockWin = {
    document: mockDoc,
    location: { search: "?work=evangelios&week=s27&lang=es&format=letter", pathname: "/index.html" },
    history: {
      pushState(st, _title, url) {
        historyLog.push({ op: "push", url, st });
      },
      replaceState(st, _title, url) {
        historyLog.push({ op: "replace", url, st });
      },
    },
    addEventListener() { },
  };
  mockDoc.defaultView = mockWin;

  const bootedCtrl = await bootBrowserMostrador(mockWin, {
    source: createDiskBackedSource(),
  });
  assert.equal(bootedCtrl.state.activeWork, "evangelios");
  assert.equal(bootedCtrl.state.evangeliosWeekId, "s27");
  assert.equal(bootedCtrl.state.book, "LUK");
  assert.equal(bootedCtrl.state.chapter, 15);
  assert.equal(bootedCtrl.state.paperFormat, "letter");
  assert.match(bootedCtrl.state.lastSerializedUrl, /work=evangelios/);
  assert.match(bootedCtrl.state.lastSerializedUrl, /week=s27/);
  assert.match(bootedCtrl.state.lastSerializedUrl, /format=letter/);
  assert.ok(historyLog.length >= 1, "Router must synchronize URL via history API");

  // Changing Evangelios week updates state.book/chapter/verse, compass trigger, and URL
  const weekSel = mockDoc.getElementById("evangeliosWeekSelect");
  weekSel.value = "s40";
  await weekSel.listeners.change({ target: { value: "s40" } });
  assert.equal(bootedCtrl.state.evangeliosWeekId, "s40");
  assert.equal(bootedCtrl.state.book, "JHN");
  assert.equal(bootedCtrl.state.chapter, 20);
  assert.match(bootedCtrl.state.lastSerializedUrl, /week=s40/);

  // 3. D63 (2B+) & D68 (7B+): Unified Paper Format (A4 <-> Letter) & Preview Carousel Modal
  const toggleA4 = mockDoc.getElementById("toggleA4");
  const toggleCarta = mockDoc.getElementById("toggleCarta");
  await toggleA4.listeners.click();
  assert.equal(bootedCtrl.state.paperFormat, "a4");
  assert.equal(mockDoc.getElementById("kindlePaperFormatSelector").value, "a4");
  await toggleCarta.listeners.click();
  assert.equal(bootedCtrl.state.paperFormat, "letter");
  assert.equal(mockDoc.getElementById("kindlePaperFormatSelector").value, "letter");

  const btnPreview = mockDoc.getElementById("btnOpenPreviewCarousel");
  assert.ok(btnPreview.listeners.click, "#btnOpenPreviewCarousel must have click listener bound");
  assert.equal(MOSTRADOR_DOM_BINDINGS["#btnOpenPreviewCarousel"], "openModal:previewModal");

  // 4. D67 (6B+): Sub-tree surgical update preserves #rosettaSearchInput & #stpLexiconSearchInput node identity
  await bootedCtrl.transitionSheet("study", mockDoc);
  const rosettaContainer =
    mockDoc.getElementById("philologyRosettaStaticHost") ||
    mockDoc.getElementById("leipzig14ColStratumAction");
  assert.match(rosettaContainer.innerHTML, /id="rosettaExplorerResultsRows"/);
  const rosettaInputBefore = mockDoc.getElementById("rosettaSearchInput");
  rosettaInputBefore.value = "H7225";
  rosettaInputBefore.selectionStart = 3;
  rosettaInputBefore.selectionEnd = 3;
  await rosettaInputBefore.listeners.input({ target: { value: "H7225" } });
  const rosettaInputAfter = mockDoc.getElementById("rosettaSearchInput");
  assert.equal(rosettaInputAfter, rosettaInputBefore, "#rosettaSearchInput reference must not be destroyed on input");
  assert.equal(rosettaInputAfter.selectionStart, 3);
  assert.equal(bootedCtrl.state.rosettaQuery, "H7225");

  await bootedCtrl.transitionSheet("field", mockDoc);
  const stpInputBefore = mockDoc.getElementById("stpLexiconSearchInput");
  stpInputBefore.value = "Dios";
  stpInputBefore.selectionStart = 2;
  stpInputBefore.selectionEnd = 2;
  stpInputBefore.listeners.input({ target: { value: "Dios" } });
  const stpInputAfter = mockDoc.getElementById("stpLexiconSearchInput");
  assert.equal(stpInputAfter, stpInputBefore, "#stpLexiconSearchInput reference must not be destroyed on input");
  assert.equal(stpInputAfter.selectionStart, 2);
  assert.equal(bootedCtrl.state.stpLexiconQuery, "Dios");

  // 5. D69 (8B+): Zero root-relative 404 links in index.html & hydrateShareAndAuditDrawer
  await bootedCtrl.transitionSheet("share", mockDoc);
  const packsHtml = mockDoc.getElementById("offlinePacksCatalogPanel").innerHTML;
  assert.doesNotMatch(packsHtml, /href="\/obras\/biblia\/packs\//, "Quine offline link must be relative (zero leading /)");
  assert.match(packsHtml, /href="obras\/biblia\/packs\//);
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.doesNotMatch(indexHtml, /href="\/(dist|llms\.txt|sitemap\.xml)/);
  assert.match(indexHtml, /id="btnOpenPreviewCarousel"/);
});

test("D1_to_D10_A_plus_ARB_EKOVOZ_61_triple_provenance_closure_and_full_backend_ui_parity", async () => {
  const {
    ARTIFACT_PROJECTION_SCHEMA,
    MOSTRADOR_DOM_BINDINGS,
    createMostradorController,
    renderChapterPericopesRibbonHtml,
    renderFelicesSocraticWonderCardHtml,
    resolveLocalizedBookMeta,
    verifyArtifactProjectionClosure,
  } = await import("../mostrador.js");

  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const controllerFiles = [
    path.join(WEB_DIR, "mostrador.js"),
    path.join(WEB_DIR, "i18n_ui.js"),
    path.join(WEB_DIR, "mostrador", "estudio.js"),
    path.join(WEB_DIR, "mostrador", "mejorar.js"),
    path.join(WEB_DIR, "mostrador", "evangelios.js"),
    path.join(WEB_DIR, "mostrador", "dosis.js"),
    path.join(WEB_DIR, "mostrador", "diachronic_register.js"),
    path.join(WEB_DIR, "mostrador", "drawer_hydrators.js"),
    path.join(WEB_DIR, "mostrador", "drawer_study.js"),
    path.join(WEB_DIR, "mostrador", "drawer_print.js"),
    path.join(WEB_DIR, "mostrador", "drawer_workshop.js"),
    path.join(WEB_DIR, "mostrador", "drawer_share.js"),
    path.join(WEB_DIR, "mostrador", "bridge_and_chapter.js"),
    path.join(WEB_DIR, "mostrador", "sister_works_controller.js"),
  ];
  const controllerCorpus = controllerFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  // 1. D1-A+ (D71) & D1-B++..D4-B++ (GOLD-647): Algebraic Triple Provenance Closure N[X] \ {0} over all 8 compiled artifacts
  const closure = verifyArtifactProjectionClosure({
    htmlSource: indexHtml,
    domBindings: MOSTRADOR_DOM_BINDINGS,
    controllerCorpus,
  });
  assert.equal(
    closure.ok,
    true,
    `Triple Provenance Closure failed: missingDomIds=${JSON.stringify(closure.missingDomIds)}, unprojectedKeys=${JSON.stringify(closure.unprojectedKeys)}, scopeViolations=${JSON.stringify(closure.scopeViolations)}`,
  );
  assert.equal(ARTIFACT_PROJECTION_SCHEMA.length, 8);

  // 2. D2-A+ (D72) & D8-A+ (D78): Restored #toggleA4, #toggleCarta, #evangeliosLangSelect (7 langs), and zero .slice(0, 140)
  for (const id of ["toggleA4", "toggleCarta", "nameCarta", "subCarta", "nameA4", "subA4", "evangeliosLangSelect", "bibleChapterPericopesRibbon", "felicesSocraticWonderCard"]) {
    assert.ok(indexHtml.includes(`id="${id}"`), `index.html must contain id="${id}"`);
  }
  for (const code of ["es", "en", "pt", "fr", "quc", "gn", "stp"]) {
    assert.match(indexHtml, new RegExp(`<option value="${code}">`));
  }
  const mostradorSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");
  assert.equal(mostradorSrc.includes("verseText.slice(0, 140)"), false, "DEBRIS-EKV-01: verseText.slice(0, 140) truncation must be purged");

  // 3. D3-A+ (D73), D4-A+ (D74), D5-A+ (D75), D9-A+ (D79), D10-A+ (D80) end-to-end controller verification
  const mockDoc = createMockDom();
  const ctrl = createMostradorController({
    doc: mockDoc,
    source: createDiskBackedSource(),
    lang: "es",
    book: "MAT",
    chapter: 5,
    verse: 3,
    oralPorticoActive: true,
  });
  ctrl.bindDomEvents(mockDoc);
  await ctrl.navigate({ lang: "es", book: "MAT", chapter: 5, verse: 3 }, mockDoc);

  // D5-A+: Pericopes Ribbon & NSM-65 Book Subtitle
  const ribbonHtml = mockDoc.getElementById("bibleChapterPericopesRibbon").innerHTML;
  assert.match(ribbonHtml, /chapter-pericope-ribbon-chip/);
  assert.match(ribbonHtml, /data-pericope-verse="1"/);
  assert.match(mockDoc.getElementById("btnOpenCompass").getAttribute("data-nsm-subtitle") || "", /Jesús|Dios|Buenas/i);
  const locMeta = resolveLocalizedBookMeta(ctrl.state.localizedBookNames, "MAT");
  assert.ok(locMeta.nsmSubtitle.length > 5);

  // D10-A+: Oral pause uses dynamic pausePeriodSelahMs & Optical Relay invokes createRelayEncoderFromDecoded
  assert.match(mockDoc.getElementById("bibleVerseViewport").innerHTML, /data-pause-period-ms="/);
  await ctrl.transitionSheet("share", mockDoc);
  mockDoc.getElementById("btnOpticalRelayTx").listeners.click();
  assert.ok(ctrl.state.lastRelayEncoder && ctrl.state.lastRelayEncoder.K >= 1);
  assert.match(mockDoc.getElementById("editorialAuditStatusPanel").innerHTML, /data-relay-k="/);

  // D3-A+: Study Drawer GMIS 4-line scope & Cultural Glosses Catalog Accordion
  await ctrl.transitionSheet("study", mockDoc);
  ctrl.state.studyScope = "gmis";
  await ctrl.hydrateStudyDrawer(mockDoc);
  const studyHtml = mockDoc.getElementById("leipzig14ColStratumAction").innerHTML;
  assert.match(studyHtml, /data-study-scope="gmis"/);
  assert.match(studyHtml, /data-elicitation-slot="/);
  assert.match(mockDoc.getElementById("realiaMetrologyStratumCard").innerHTML, /id="studyCulturalGlossesCatalogAccordion"/);

  // D4-A+: Field Workshop Dunning G^2 Glossary, 8 Locks, Uncertainty Queue 60 & Tier 3A Continuums
  await ctrl.transitionSheet("field", mockDoc);
  const cascadeHtml = mockDoc.getElementById("cascadeImpactPreviewList").innerHTML;
  assert.match(cascadeHtml, /id="externalAudit8LocksPanel"/);
  assert.match(cascadeHtml, /id="uncertaintyQueue60Panel"/);
  assert.match(cascadeHtml, /id="tier3aDialectContinuumPanel"/);
  const lexHostHtml = mockDoc.getElementById("stpLexiconExplorerHost").innerHTML;
  assert.match(lexHostHtml, /id="dunningKeyTermsGlossaryPanel"/);
  assert.match(lexHostHtml, /data-vso-phrase="/);

  // D9-A+: Felices Socratic Wonder Card
  const wonderHtml = renderFelicesSocraticWonderCardHtml(1);
  assert.match(wonderHtml, /data-plate-number="1"/);
  assert.match(wonderHtml, /data-wonder-cite="/);
  assert.ok(renderChapterPericopesRibbonHtml("JHN", 1, "es").includes("data-pericope-verse"));

  // D1-A++ / D2-A++ / D3-A++ / D6-A++ (SLICE-75 & SLICE-77):
  // Verify #evangeliosLangSelect PutGet for any of the 7,164 languages (e.g. 'usp')
  await ctrl.navigate({ lang: "usp", book: "JHN", chapter: 1, verse: 1 }, mockDoc);
  assert.equal(
    mockDoc.getElementById("evangeliosLangSelect").value,
    "usp",
    "D3-A++: evangeliosLangSelect must satisfy PutGet for arbitrary ISO-639-3 language 'usp'",
  );
  // Verify #bibleEasyDrawer aria-pressed synchronization (D2-A++)
  await ctrl.transitionSheet("study", mockDoc);
  assert.equal(
    mockDoc.getElementById("bibleEasyDrawer").getAttribute("aria-pressed"),
    "true",
    "D2-A++: bibleEasyDrawer must sync aria-pressed='true' when study sheet is open",
  );
  await ctrl.transitionSheet("study", mockDoc);
  assert.equal(
    mockDoc.getElementById("bibleEasyDrawer").getAttribute("aria-pressed"),
    "false",
    "D2-A++: bibleEasyDrawer must sync aria-pressed='false' when study sheet closes",
  );
  // Verify #sovereignCorpusLangBtn aria-expanded synchronization (D1-A++)
  mockDoc.getElementById("sovereignCorpusLangBtn").listeners.click();
  assert.equal(
    mockDoc.getElementById("sovereignCorpusLangBtn").getAttribute("aria-expanded"),
    "true",
    "D1-A++: sovereignCorpusLangBtn must sync aria-expanded='true' when drawer opens",
  );
});

test("D1_to_D9_B_plus_plus_GOLD_647_vpl_dom_scope_containment_and_8_artifact_exact_closure", async () => {
  const {
    ARTIFACT_PROJECTION_SCHEMA,
    MOSTRADOR_DOM_SCOPE_CONTRACTS,
    hydrateBookNamesSourceBadge,
    hydrateLifeTrailsFromPericopesArtifact,
    hydrateWasmManifestStatus,
    verifyVplDomScopeContainment,
  } = await import("../mostrador.js");
  const { hydrateDiachronicRegister, renderAnalyticalThermometerHtml } = await import(
    "./diachronic_register.js"
  );

  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const dataLayerSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador", "data_layer.js"), "utf8");
  const mostradorSrc = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");

  // 1. DEBRIS-B1 & DEBRIS-B3: Zero allowDynamicInCorpus: true & zero improvePatchPreviewCode
  assert.equal(
    dataLayerSrc.includes("allowDynamicInCorpus: true") || dataLayerSrc.includes("allowDynamicInCorpus:true"),
    false,
    "DEBRIS-B1: data_layer.js must not contain allowDynamicInCorpus: true",
  );
  assert.equal(
    mostradorSrc.includes("improvePatchPreviewCode"),
    false,
    "DEBRIS-B3: mostrador.js must not reference orphan selector improvePatchPreviewCode",
  );

  // 2. D1-B++ (GOLD-647): VPL DOM Scope Containment holds for all MOSTRADOR_DOM_SCOPE_CONTRACTS
  const vplCheck = verifyVplDomScopeContainment(indexHtml, MOSTRADOR_DOM_SCOPE_CONTRACTS);
  assert.equal(
    vplCheck.ok,
    true,
    `VPL DOM Scope Containment failed: ${JSON.stringify(vplCheck.violations)}`,
  );
  assert.equal(MOSTRADOR_DOM_SCOPE_CONTRACTS.length, 8);

  // Negative VPL test: detects when a selector is placed outside its declared scopeRoot
  const badVpl = verifyVplDomScopeContainment(indexHtml, [
    { selector: "#rosettaSearchInput", scopeRoot: "#bibleFieldWorkshopSheet" },
  ]);
  assert.equal(badVpl.ok, false);
  assert.equal(badVpl.violations[0].reason, "scope_root_not_ancestor");

  // 3. D2-B++: diachronic_register_es.json hydration of all 8 keys + #diachronicSubstitutionsDetails
  const diachronicJson = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "diachronic_register_es.json"), "utf8"),
  );
  hydrateDiachronicRegister(diachronicJson);
  const thermoHtml = renderAnalyticalThermometerHtml({
    verses: ["En el principio creó Dios los cielos y la tierra."],
    bookCode: "GEN",
    osisRef: "GEN.1.1",
  });
  assert.match(thermoHtml, /id="diachronicSubstitutionsDetails"/);
  assert.match(thermoHtml, /data-total-verses-audited="31102"/);

  // 4. D3-B++ & D9-B++: drawer_hydrators.js pure projections for pericopes_and_glosses, book_names, and wasm_manifest
  const pericopesJson = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "pericopes_and_glosses.json"), "utf8"),
  );
  const trailsRes = hydrateLifeTrailsFromPericopesArtifact(pericopesJson);
  assert.ok(Array.isArray(trailsRes.lifeTrails));
  assert.ok(typeof trailsRes.chapterPericopes === "object");

  const bookNamesEs = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "book_names", "es.json"), "utf8"),
  );
  const bnBadge = hydrateBookNamesSourceBadge(bookNamesEs);
  assert.equal(bnBadge.lang, "es");
  assert.equal(bnBadge.nameSource, "es");
  assert.equal(bnBadge.booksCount, 66);

  const wasmManifest = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "wasm", "wasm_manifest.json"), "utf8"),
  );
  const wasmStatus = hydrateWasmManifestStatus(wasmManifest);
  assert.equal(wasmStatus.hasPlayerWasm, true);
  assert.equal(wasmStatus.hasReceiverWasm, true);
  assert.equal(ARTIFACT_PROJECTION_SCHEMA.length, 8);
});

test("D1_to_D12_R32_ARB_EKOVOZ_69_GOLD_648_eco_decoder_census_7164_crdt_wal_rosetta_5_classes_sauvola_and_zero_duplicate_strata", async () => {
  const {
    verifyAndStoreEcoPack,
    exportSneakernetBundleJson,
    importSneakernetBundleJson,
    renderOfflineMeshEcoCardHtml,
    computeEcoPackCrc32Hex,
    probeEcoPackRandomAccessBounds,
    renderMasterCensus7164CardHtml,
    renderCrdtWalAndLockP2AuditCardHtml,
    renderPhotocopyResilienceAndSocialCardHtml,
    applyHarelSubtabSelection,
    HAREL_WORKSHOP_SUBTABS,
    HAREL_DOSIS_SUBTABS,
    renderChapterDiachronicAuditCardHtml,
    simulateFifthGenPhotocopySauvolaBilateral,
    foldCrdtWalSemilattice,
  } = await import("../mostrador.js");
  const {
    hydratePhilologyRosettaIndex,
    renderStudy14ColDrawerHtml,
    renderStudyStrataCards,
  } = await import("./estudio.js");
  const { hydrateFieldWorkshopData, renderCascadeAndLadderHtml } = await import("./mejorar.js");

  // 1. D1-R32 (1B+) & DEBRIS-R32-08: offline_mesh.js + EcoDecoder WASM random access & Sneakernet
  const crc = computeEcoPackCrc32Hex(new Uint8Array([0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39]));
  assert.equal(crc, "cbf43926", "IEEE 802.3 CRC32 of '123456789' must be cbf43926");
  const bounds = probeEcoPackRandomAccessBounds(new Uint8Array([1, 2, 3, 4]), 0);
  assert.equal(bounds.crcVerified, true);
  assert.ok(bounds.verseCount >= 1);

  const storedPack = await verifyAndStoreEcoPack({
    lang: "es",
    packBytes: new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 1, 2, 3, 4]),
  });
  assert.equal(storedPack.verified, true);
  const bundleJson = exportSneakernetBundleJson({ lang: "es" });
  const imported = importSneakernetBundleJson(bundleJson);
  assert.equal(imported.valid, true);
  assert.equal(imported.lang, "es");

  const ecoHtml = renderOfflineMeshEcoCardHtml({ activeLang: "es" });
  assert.match(ecoHtml, /id="offlineEcoMeshCard"/);
  assert.match(ecoHtml, /id="btnInstallEcoPackOffline"/);
  assert.match(ecoHtml, /id="btnExportSneakernetBundle"/);
  assert.match(ecoHtml, /data-eco-decoder-ready="true"/);

  // 2. D2-R32 (2B+): Master Census 7,164 languages x 380 sub-clusters x 12 macro-regions
  const censusHtml = renderMasterCensus7164CardHtml({
    total_world_languages: 7164,
    glottolog_subclades_total: 380,
    macro_regions_12_total: 12,
  });
  assert.match(censusHtml, /id="masterCensus7164InspectorCard"/);
  assert.match(censusHtml, /data-total-world-languages="7164"/);
  assert.match(censusHtml, /data-glottolog-subclades="380"/);
  assert.match(censusHtml, /data-macro-regions="12"/);
  assert.match(censusHtml, /data-stp-atomic-batches="1245"/);

  // 3. D3-R32 (3B+): CRDT WAL Semilattice, Lock P2 & Root Notes STP
  const foldedWal = foldCrdtWalSemilattice([
    { patch_id: "WAL-001", target_ref: "GEN 1:1", status: "COMMITTED" },
    { patch_id: "WAL-001", target_ref: "GEN 1:1", status: "COMMITTED" },
    { patch_id: "WAL-002", target_ref: "MAT 5:3", status: "COMMITTED" },
  ]);
  assert.equal(
    foldedWal.canonical_patches_count,
    2,
    "Idempotent semilattice join must deduplicate repeated patch_id",
  );

  const workshopArtifact = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "field_workshop_stp.json"), "utf8"),
  );
  hydrateFieldWorkshopData(workshopArtifact);
  const cascadeHtmlDefault = renderCascadeAndLadderHtml({ lang: "stp", ref: "MAT 5:3", token: "xoi'kam" });
  assert.doesNotMatch(cascadeHtmlDefault, /id="masterCensus7164InspectorCard"/);
  assert.doesNotMatch(cascadeHtmlDefault, /id="crdtWalAndLockP2AuditCard"/);
  const cascadeHtmlWithCards = renderCascadeAndLadderHtml({
    lang: "stp",
    ref: "MAT 5:3",
    token: "xoi'kam",
    includeWalCard: true,
    includeCensusCard: true,
  });
  assert.match(cascadeHtmlWithCards, /id="masterCensus7164InspectorCard"/);
  assert.match(cascadeHtmlWithCards, /id="crdtWalAndLockP2AuditCard"/);

  const walCardHtml = renderCrdtWalAndLockP2AuditCardHtml();
  assert.match(walCardHtml, /id="crdtWalAndLockP2AuditCard"/);
  assert.match(walCardHtml, /data-wal-raw-lines="(60|67)"/);
  assert.match(walCardHtml, /data-wal-canonical-patches="5"/);
  assert.match(walCardHtml, /data-lock-p2-status="ROLLED_BACK"/);

  // 4. D4-R32 (4B+) & DEBRIS-R32-01..02: 5 ResidualKind classes + chrF++ + zero duplicate DOM injection
  const rosettaJson = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "shards", "philology_rosetta_index.json"), "utf8"),
  );
  hydratePhilologyRosettaIndex(rosettaJson);
  const studyHtml = renderStudy14ColDrawerHtml(
    {
      book: "GEN",
      chapter: 1,
      rows: [{ idx: 1, verse: 1, surface: "בְּרֵאשִׁית", strong: "H7225", gloss_es: "En el principio" }],
    },
    { verse: 1, includeInlineStrata: false },
  );
  assert.doesNotMatch(
    studyHtml,
    /class="study-realia-metrology-section"/,
    "DEBRIS-R32-01: renderStudy14ColDrawerHtml with includeInlineStrata: false must not inject duplicate inline nsm/realia strata",
  );
  assert.match(studyHtml, /data-residual-classes-5="true"/);
  assert.match(studyHtml, /data-chrf-plus-plus="\d+\.\d+"/);
  const strataCards = renderStudyStrataCards(
    {
      book: "GEN",
      chapter: 1,
      rows: [{ idx: 1, verse: 1, surface: "בְּרֵאשִׁית", strong: "H7225", gloss_es: "En el principio" }],
    },
    { verse: 1, includeInlineRosettaInTsk: false },
  );
  assert.doesNotMatch(
    strataCards.tskHtml,
    /data-stratum="philology-rosetta"/,
    "DEBRIS-R32-02: renderStudyStrataCards with includeInlineRosettaInTsk: false must not duplicate philology-rosetta in tskHtml",
  );

  // 5. D5-R32 (5B+) & DEBRIS-R32-07: Chapter diachronic audit card in Drawer 1
  const chapterDiachronicHtml = renderChapterDiachronicAuditCardHtml({
    verses: ["En el principio creó Dios los cielos y la tierra; mas la tierra estaba desordenada."],
    bookCode: "GEN",
    osisRef: "GEN.1.1",
  });
  assert.match(chapterDiachronicHtml, /id="diachronicChapterAuditBadge"/);
  assert.match(chapterDiachronicHtml, /data-chapter-diachronic-audit="true"/);

  // 6. D6-R32 (6B+): 5th-gen photocopy resilience Sauvola + Bilateral + Social OG card
  const sim = simulateFifthGenPhotocopySauvolaBilateral({ strokePt: 0.85 });
  assert.equal(sim.passesAll5Generations, true);
  assert.equal(sim.socialCardDimensions, "1200x630");
  const graphicsHtml = renderPhotocopyResilienceAndSocialCardHtml({ book: "JHN", chapter: 1, verse: 1, lang: "es" });
  assert.match(graphicsHtml, /id="editorialGraphicsPhotocopyPanel"/);
  assert.match(graphicsHtml, /data-photocopy-generations="5"/);
  assert.match(graphicsHtml, /data-social-card-dimensions="1200x630"/);

  // 7. D7-R32 (7B+) & D10-R32 (10B+) & DEBRIS-R32-03..06: Harel XOR subtabs & index.html CSS guards
  assert.deepEqual(HAREL_WORKSHOP_SUBTABS, ["patch", "ladder", "audit"]);
  assert.deepEqual(HAREL_DOSIS_SUBTABS, ["pdf", "mesh", "graphics"]);
  const mockSubtabDoc = {
    querySelectorAll(sel) {
      if (sel.includes("btn")) return [];
      return [
        { hidden: false, style: {}, getAttribute: () => "patch" },
        { hidden: true, style: {}, getAttribute: () => "audit" },
      ];
    },
  };
  const selAudit = applyHarelSubtabSelection(mockSubtabDoc, "workshop", "audit");
  assert.equal(selAudit.activeSubtab, "audit");
  assert.equal(selAudit.toggledPanels, 2);

  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.match(
    indexHtml,
    /#bibleVerseViewport\[data-inspector-open="true"\]\s*\{\s*min-height:\s*200px\s*!important;\s*overflow-y:\s*auto\s*!important;\s*\}/,
    "D1-R38 / DEB-R38-01..03: index.html must preserve sacred canvas min-height:200px without collapsing #bibleChapterPericopesRibbon",
  );
  assert.doesNotMatch(
    indexHtml,
    /#bibleSovereignSection:has\(#bibleVerseViewport\[data-inspector-open="true"\]\)\s*#bibleChapterPericopesRibbon/,
    "D1-R38: index.html must not hide #bibleChapterPericopesRibbon when a drawer is open",
  );
  assert.match(
    indexHtml,
    /\.chapter-pericope-ribbon-chip\s*\{\s*flex-shrink:\s*0;\s*white-space:\s*nowrap;\s*\}/,
    "DEBRIS-R32-04: .chapter-pericope-ribbon-chip must enforce flex-shrink:0 and white-space:nowrap",
  );
  assert.match(indexHtml, /id="workshopHarelSubtabsBar"/);
  assert.match(indexHtml, /id="dosisHarelSubtabsBar"/);
  assert.match(indexHtml, /id="diachronicRegisterAuditPanel"/);
  assert.match(indexHtml, /id="editorialGraphicsPhotocopyHost"/);
});

test("Round 33 (D1-B+..D8-B+ & ARB-EKOVOZ-70): Metamorphic Jacobian & Structural DTO Subtyping over real web/data/*.json", async () => {
  const {
    EcoDecoderMirror,
    commitVerifiedPackToIndexedDb,
    inspectDeltaZstPatch,
  } = await import("./offline_mesh.js");
  const {
    resolveAtomicBatchForPassage,
    normalizeRootNotesEntries,
    renderMasterCensus7164CardHtml,
    renderCrdtWalAndLockP2AuditCardHtml,
    simulateKanungoSauvolaGeneration,
    renderPhotocopyResilienceAndSocialCardHtml,
  } = await import("./drawer_hydrators.js");
  const {
    CANONICAL_5_RESIDUAL_KINDS,
    aggregateBlindCalibration12Langs,
    hydratePhilologyRosettaIndex,
    searchPhilologyRosettaIndex,
  } = await import("./estudio.js");
  const {
    summarizeChapterDiachronicTransformations,
    renderChapterDiachronicWitnessesHtml,
  } = await import("./diachronic_register.js");

  // T1 (D1-B+): EcoDecoderMirror + Two-Gate Pre-Commit (CRC32 && Ed25519) + .delta.zst
  const mirrorHe = new EcoDecoderMirror(new TextEncoder().encode("ECO1:he:GEN.1.1"), "he");
  assert.equal(mirrorHe.verse_count(), 31102);
  assert.equal(mirrorHe.unicode_block_base(), 0x0590);
  assert.match(mirrorHe.decode_verse_preview(0), /rebase=0x0590/);

  await assert.rejects(
    async () => {
      await commitVerifiedPackToIndexedDb({
        lang: "es",
        payload: "ECO_VALID_PAYLOAD",
        expectedCrc32: "00000000",
      });
    },
    /CRC32 mismatch/,
    "Two-Gate Pre-Commit must reject corrupted CRC32 before writing to IndexedDB",
  );
  await assert.rejects(
    async () => {
      await commitVerifiedPackToIndexedDb({
        lang: "es",
        payload: "ECO_VALID_PAYLOAD",
        signatureHex: "corrupt-signature",
      });
    },
    /Ed25519 signature invalid/,
    "Two-Gate Pre-Commit must reject corrupted Ed25519 signature before writing to IndexedDB",
  );
  const validCommit = await commitVerifiedPackToIndexedDb({
    lang: "he",
    payload: "ECO1:he:GEN.1.1",
  });
  assert.equal(validCommit.verified, true);
  assert.equal(validCommit.unicodeBlockBase, 0x0590);
  const deltaRep = inspectDeltaZstPatch(new Uint8Array(40), { lang: "es", bytes: 162 });
  assert.ok(deltaRep.byteSavingPct > 50);

  // T2 (D2-B+): Master Census 7,164 without [DTO-DROP] + 4 Sovereign Tiers + 1,245 Atomic Batches
  const censusDisk = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "master_census_summary.json"), "utf8"),
  );
  const bFirst = resolveAtomicBatchForPassage("GEN", 1, 1);
  const bLast = resolveAtomicBatchForPassage("REV", 22, 21);
  assert.equal(bFirst.batchId, "BLK-0001");
  assert.equal(bLast.batchId, "BLK-1245");
  const censusCard = renderMasterCensus7164CardHtml(censusDisk, censusDisk.stp_ledger_summary, {
    book: "REV",
    chapter: 22,
    verse: 21,
  });
  assert.match(censusCard, /data-active-atomic-batch="BLK-1245"/);
  assert.match(censusCard, /data-formulaic-reduction-pct="14\.41"/);
  assert.match(censusCard, /data-sovereign-tier="T0"/);
  assert.match(censusCard, /data-sovereign-tier="T3"/);
  assert.doesNotMatch(censusCard, />G_01<\/strong>:\s*G_01\s*\(597\)/, "Zero DTO-DROP fallback on G_01");

  // T3 (D3-B+): 10 Strong roots in root_notes_stp.json + 10 pre_sha256 snapshots in #selectWalRollbackSnapshot
  const workshopDisk = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "data", "field_workshop_stp.json"), "utf8"),
  );
  const normalizedNotes = normalizeRootNotesEntries(workshopDisk.root_notes_stp);
  assert.equal(normalizedNotes.length, 10, "root_notes_stp.json on disk has 10 Strong root notes");
  const walAuditHtml = renderCrdtWalAndLockP2AuditCardHtml(workshopDisk);
  assert.match(walAuditHtml, /id="selectWalRollbackSnapshot"/);
  assert.match(walAuditHtml, /data-wal-snapshots-count="10"/);
  assert.match(walAuditHtml, /data-root-notes-count="10"/);
  assert.match(walAuditHtml, /PATCH-WAL-SNAP-00/);
  assert.match(walAuditHtml, /PATCH-WAL-SNAP-09/);

  // T4 (D4-B+ & D5-B+): 5 real ResidualKind classes (4,036) + 444,363 tokens (0% OOV) + 12-lang / 48-row blind calibration
  assert.deepEqual(CANONICAL_5_RESIDUAL_KINDS, [
    "KETIV_QERE",
    "VERSIFICATION",
    "TR_SUPPLEMENT",
    "SURFACE_VARIANT",
    "UNMATCHED",
  ]);
  const rosettaDisk = JSON.parse(
    fs.readFileSync(path.join(WEB_DIR, "shards", "philology_rosetta_index.json"), "utf8"),
  );
  hydratePhilologyRosettaIndex(rosettaDisk);
  const calAgg = aggregateBlindCalibration12Langs(rosettaDisk.blind_calibration_report);
  assert.equal(calAgg.langsCount, 12);
  assert.equal(calAgg.rowsCount, 48);
  assert.equal(calAgg.passRatePct, 100);
  for (const kind of ["ketiv_qere", "versification", "tr_supplement", "surface_variant", "unmatched"]) {
    const hits = searchPhilologyRosettaIndex("", kind, 5, rosettaDisk);
    assert.ok(hits.length > 0, `searchPhilologyRosettaIndex must return results for ResidualKind '${kind}'`);
  }

  // T5 (D7-B+): Per-verse diachronic witnesses (1909 <-> 2026) with negative dAoA and dMDD
  const diachronicSum = summarizeChapterDiachronicTransformations(
    ["En el principio creó Dios los cielos y la tierra; mas la tierra estaba desordenada, y dijéronle a él."],
    "GEN",
    1,
  );
  assert.ok(diachronicSum.witnesses.length >= 1);
  assert.ok(diachronicSum.deltaAoaChapter < 0);
  assert.ok(diachronicSum.deltaMddChapter < 0);
  const witHtml = renderChapterDiachronicWitnessesHtml({
    verses: ["Mas la tierra estaba desordenada y dijéronle."],
    bookCode: "GEN",
    chapter: 1,
  });
  assert.match(witHtml, /data-diachronic-witness-ref="GEN\.1\.1"/);

  // T6 (D8-B+): Kanungo + Sauvola Jacobian dY/dk != 0 and dY/dGen != 0 + Euler dChi = 0
  const simGen0 = simulateKanungoSauvolaGeneration(0, 0.20, 300);
  const simGen5LowK = simulateKanungoSauvolaGeneration(5, 0.20, 300);
  const simGen5HighK = simulateKanungoSauvolaGeneration(5, 0.35, 300);
  assert.notEqual(simGen0.contrastRatio, simGen5LowK.contrastRatio, "d(Contrast)/d(Gen) != 0");
  assert.notEqual(simGen5LowK.contrastRatio, simGen5HighK.contrastRatio, "d(Contrast)/d(sauvolaK) != 0");
  assert.equal(simGen5HighK.eulerCharacteristicDelta, 0);
  assert.equal(simGen5HighK.stages5.length, 5);
  const cardGen2 = renderPhotocopyResilienceAndSocialCardHtml({ activeGen: 2, sauvolaK: 0.25 });
  assert.match(cardGen2, /data-active-photocopy-gen="2"/);
  assert.match(cardGen2, /id="inputSauvolaK"/);
});

test("R34 D1-B+..D6-B+: Foveal fold, Dosis Harel button partition, live Kanungo-Sauvola photocopy badge, Fitts 48px, and 3NF loadNsmRealiaLexicon", async () => {
  const {
    simulateKanungoSauvolaGeneration,
    formatPhotocopySimBadgeText,
    renderPhotocopyResilienceAndSocialCardHtml,
    renderCrdtWalAndLockP2AuditCardHtml,
  } = await import("./drawer_hydrators.js");
  const { loadNsmRealiaLexicon } = await import("./data_layer.js");

  // 1. D1-B+, D2-B+, D3-B+: web/index.html enforces explicit summary background, Evangelios 4-col header, and Dosis Harel subtab button partition
  const htmlRaw = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.match(htmlRaw, /background-color:var\(--card-bg,\s*#ffffff\)\s*!important;/);
  assert.match(htmlRaw, /#bibleLanguageAndRegisterDrawer\s*>\s*summary\s*\{\s*display:none\s*!important;\s*\}/);
  assert.match(htmlRaw, /grid-template-columns:repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(htmlRaw, /data-dosis-subtab-panel="mesh"/);
  assert.match(htmlRaw, /data-dosis-subtab-panel="pdf"/);
  assert.match(htmlRaw, /data-dosis-subtab-panel="graphics"/);

  // 2. D4-B+ (DEBRIS-R34-06): Live Kanungo-Sauvola photocopy badge (zero hardcoded "4.85:1 PASS")
  const sim3 = simulateKanungoSauvolaGeneration(3, 0.20, 300);
  const sim5 = simulateKanungoSauvolaGeneration(5, 0.30, 300);
  const badge3 = formatPhotocopySimBadgeText(sim3);
  const badge5 = formatPhotocopySimBadgeText(sim5);
  assert.notEqual(badge3, badge5, "Photocopy badge text must vary dynamically with Gen and Sauvola k");
  assert.match(badge3, /3ª Gen · Sauvola k=0\.20 \(Contraste \d+\.\d{2}:1.*Δχ=0\)/);
  const mostradorRaw = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");
  assert.doesNotMatch(mostradorRaw, /Gen 3 \(300 DPI\): 4\.85:1 PASS/);

  // 3. D5-B+ (DEBRIS-R34-07): Fitts 48x48 px touch target geometry in dynamic drawers
  const photoHtml = renderPhotocopyResilienceAndSocialCardHtml({ activeGen: 3, sauvolaK: 0.20 });
  assert.match(photoHtml, /min-height:48px;\s*min-width:48px;/);
  const walHtml = renderCrdtWalAndLockP2AuditCardHtml({ patches: [] });
  assert.match(walHtml, /min-height:48px;\s*min-width:48px;/);

  // 4. D6-B+ (DEBRIS-R34-01 & DEBRIS-R34-02): Physical eradication of web/shards/nsm_realia_lexicon.json and 3NF projection in loadNsmRealiaLexicon
  assert.equal(
    fs.existsSync(path.join(WEB_DIR, "shards", "nsm_realia_lexicon.json")),
    false,
    "DEBRIS-R34-01: web/shards/nsm_realia_lexicon.json must not exist on disk",
  );
  const dataLayerRaw = fs.readFileSync(path.join(WEB_DIR, "mostrador", "data_layer.js"), "utf8");
  assert.doesNotMatch(dataLayerRaw, /nsm_realia_lexicon/);
  const mockJsonMap = {
    "data/pericopes_and_glosses.json": {
      glosses: { "GEN.1.1": [{ term: "principio", note: "Inicio absoluto" }] },
      metrology: [{ unit: "codo", eq: "45 cm" }],
    },
    "shards/philology_rosetta_index.json": {
      canonical_metrology_units: [{ biblical_name: "Codo", modern_equivalent: "~45 cm" }],
      canonical_tsk_echoes: { GEN: ["JHN.1.1"] },
      consonantal_root_families: { "ברא": { primary_gloss_es: "crear" } },
    },
  };
  const projectedLex = await loadNsmRealiaLexicon({
    baseUrl: "",
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      json: async () => mockJsonMap[url] || {},
    }),
  });
  assert.equal(projectedLex.schema_3nf, "ekovoz-nsm-realia-3nf-v34");
  assert.ok(Array.isArray(projectedLex.metrology));
  assert.ok(projectedLex.metrology.length >= 1);
  assert.ok(projectedLex.consonantal_root_families["ברא"]);
});

test("R36_SLICE_112_apple_hig_ergonomics_foveal_canvas_subtab_coherence_and_zero_dead_evangelios_listeners", () => {
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const mostradorRaw = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");

  // 1. D3-R36 (3A) + D1-R38 (1A): #bibleVerseViewport[data-inspector-open="true"] preserves >= 200px height with overflow-y: auto
  assert.match(indexHtml, /#bibleVerseViewport\[data-inspector-open="true"\][^}]*min-height:\s*200px/i);
  assert.match(indexHtml, /#bibleVerseViewport\[data-inspector-open="true"\][^}]*overflow-y:\s*auto/i);
  assert.doesNotMatch(indexHtml, /#bibleVerseViewport\[data-inspector-open="true"\][^}]*max-height:\s*48px/i);
  assert.doesNotMatch(indexHtml, /#bibleVerseViewport\[data-inspector-open="true"\][^}]*max-height:\s*124px/i);

  // 2. D9-R36 (9A) + D6-R37 (6A): Optical controls under data-dosis-subtab-panel="pdf", Crypto in Drawer 4 "graphics", Imposition/Layout in Drawer 2
  assert.match(indexHtml, /id="bibleOpticalFpsSelect"[^>]*data-dosis-subtab-panel="pdf"/);
  assert.match(indexHtml, /id="btnToggleOpticalCameraRx"[^>]*data-dosis-subtab-panel="pdf"/);
  assert.match(indexHtml, /id="btnOpticalRelayTx"[^>]*data-dosis-subtab-panel="pdf"/);
  assert.match(indexHtml, /id="btnVerifyEd25519Signature"[^>]*data-dosis-subtab-panel="graphics"/);
  assert.match(indexHtml, /id="btnCalculateImposition"[^>]*data-print-tool="imposition"/);
  assert.match(indexHtml, /id="btnCalculateLayout"[^>]*data-print-tool="layout"/);

  // 3. D4-R36 (4A): #leipzig14ColStratumAction precedes #nsm65StratumCard in #bibleEasyDrawerPanel
  const idxLeipzig = indexHtml.indexOf('id="leipzig14ColStratumAction"');
  const idxNsm = indexHtml.indexOf('id="nsm65StratumCard"');
  assert.ok(idxLeipzig > 0 && idxNsm > idxLeipzig, "14-col matrix must be the first element inside Drawer 1");

  // 4. D12-R36 (12A): Zero dead .btn-evangelios-open-print/share/study listeners in mostrador.js
  assert.doesNotMatch(mostradorRaw, /btn-evangelios-open-print/);
  assert.doesNotMatch(mostradorRaw, /btn-evangelios-open-share/);
  assert.doesNotMatch(mostradorRaw, /btn-evangelios-open-study/);
});

test("R37_SLICE_119_word_click_14col_highlight_static_rosetta_diachronic_stage_print_imposition_and_sister_works_seam", async () => {
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const mostradorMod = await import("../mostrador.js");

  // 1. D1-R37 (1A): Word-level interactive tokens and ReverseOrthographyMap O(1) lookup
  const tokenHtml = mostradorMod.renderInteractiveVerseTokensHtml("En el principio", {
    verseNumber: 1,
    osisRef: "GEN.1.1",
    reverseMap: new mostradorMod.ReverseOrthographyMap("es", "default"),
    tokenStrongPairs: [{ surface: "principio", strongId: "H7225" }],
  });
  assert.match(tokenHtml, /class="bible-word-token"/);
  assert.match(tokenHtml, /data-strong-id="H7225"/);

  // 2. D2-R37 (2A): #philologyRosettaStaticHost is a static sibling outside #leipzig14ColStratumAction inside #bibleEasyDrawerPanel
  const idxLeipzigClose = indexHtml.indexOf('<div id="leipzig14ColStratumAction" style="margin-bottom: 0.6rem;"></div>');
  const idxRosettaStatic = indexHtml.indexOf('id="philologyRosettaStaticHost"');
  assert.ok(idxLeipzigClose > 0 && idxRosettaStatic > idxLeipzigClose, "#philologyRosettaStaticHost must be a static sibling after #leipzig14ColStratumAction");

  // 3. D3-R37 (3A) + D5-R38 (5A) + D2-R41: #bibleAnalyticalThermometerPanel and #diachronicRegisterAuditPanel inside Drawer 1 (#bibleEasyDrawerPanel)
  const idxStageAction = indexHtml.indexOf('id="stage-action"');
  const idxThermo = indexHtml.indexOf('id="bibleAnalyticalThermometerPanel"');
  const idxEasyDrawer = indexHtml.indexOf('id="bibleEasyDrawerPanel"');
  const idxPrintDrawerStart = indexHtml.indexOf('id="biblePrintEditionsSheet"');
  const idxAuditPanel = indexHtml.indexOf('id="diachronicRegisterAuditPanel"');
  const idxCompassModal = indexHtml.indexOf('id="bibleCoordinateCompassModal"');
  assert.ok(idxThermo > idxEasyDrawer && idxThermo < idxPrintDrawerStart, "#bibleAnalyticalThermometerPanel must live inside Drawer 1 (#bibleEasyDrawerPanel)");
  assert.ok(idxAuditPanel > idxEasyDrawer && idxAuditPanel < idxPrintDrawerStart, "#diachronicRegisterAuditPanel must live inside Drawer 1 (#bibleEasyDrawerPanel)");

  // 4. D4-R37 (4A): #bibleOralPorticoBanner is not hidden by display:none !important when inspector is open
  assert.match(indexHtml, /#bibleOralPorticoBanner:not\(\[hidden\]\)\{display:flex !important;[^}]*max-height:36px !important/);

  // 5. D6-R37 (6A): #btnCalculateImposition, #btnCalculateLayout, and #impositionBookletPreviewHost live inside #biblePrintEditionsSheet
  const idxPrintDrawer = indexHtml.indexOf('id="biblePrintEditionsSheet"');
  const idxWorkshopDrawer = indexHtml.indexOf('id="bibleFieldWorkshopSheet"');
  const idxImpBtn = indexHtml.indexOf('id="btnCalculateImposition"');
  const idxImpHost = indexHtml.indexOf('id="impositionBookletPreviewHost"');
  assert.ok(idxImpBtn > idxPrintDrawer && idxImpBtn < idxWorkshopDrawer, "#btnCalculateImposition must live in Drawer 2");
  assert.ok(idxImpHost > idxPrintDrawer && idxImpHost < idxWorkshopDrawer, "#impositionBookletPreviewHost must live in Drawer 2");

  // 6. D8-R37 (8A): sister_works_controller.js clean seam exported from mostrador.js
  assert.equal(typeof mostradorMod.resolveEvangeliosActiveSelection, "function");
  assert.equal(typeof mostradorMod.buildEvangeliosWeekOptionsHtml, "function");
  assert.equal(typeof mostradorMod.renderEvangeliosStageCardHtml, "function");
  assert.equal(typeof mostradorMod.syncSisterWorksTabsDom, "function");
});

test("R38_SLICE_126_canvas_non_mutilation_word_to_rosetta_workshop_dedup_14_editions_and_drawer_hydrators_seam", async () => {
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const mostradorRaw = fs.readFileSync(path.join(WEB_DIR, "mostrador.js"), "utf8");
  const mostradorMod = await import("../mostrador.js");
  const hydratorsMod = await import("./drawer_hydrators.js");
  const dosisMod = await import("./dosis.js");

  // 1. D1-R38 (1A): Zero canvas self-mutilation CSS when drawers open
  assert.doesNotMatch(indexHtml, /max-height:\s*124px\s*!important/i);
  assert.doesNotMatch(indexHtml, /#bibleSovereignSection:has\(#bibleVerseViewport\[data-inspector-open="true"\]\)\s*#bibleMainHeading/);
  assert.doesNotMatch(indexHtml, /#bibleSovereignSection:has\(#bibleVerseViewport\[data-inspector-open="true"\]\)\s*#epistemicStatusSeal/);

  // 2. D2-R38 (2A): syncActiveStrongInStudyDrawer updates state.rosettaQuery, #rosettaSearchInput, and #rosettaExplorerResultsRows
  const mockSearchInput = { value: "" };
  const mockRowsEl = { innerHTML: "" };
  const mockListEl = {
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
  };
  const mockState = { activeStrongId: "", rosettaQuery: "", rosettaCategory: "all" };
  const syncedStrong = hydratorsMod.syncActiveStrongInStudyDrawer("H0430", {
    state: mockState,
    targetDoc: {},
    getEl(id) {
      if (id === "rosettaSearchInput") return mockSearchInput;
      if (id === "rosettaExplorerResultsRows") return mockRowsEl;
      if (id === "rosettaExplorerResultsList") return mockListEl;
      return null;
    },
  });
  assert.equal(syncedStrong, "H0430");
  assert.equal(mockState.rosettaQuery, "H0430");
  assert.equal(mockSearchInput.value, "H0430");
  assert.ok(mockRowsEl.innerHTML.length > 0);

  // 3. D4-R38 (4A): 14 distinct PDF URLs and geometry keys across all 14 profiles
  const editions14 = dosisMod.listAll14PrintEditionsForLang("es", "es").filter(
    (e) => e.kind === "edition",
  );
  assert.equal(editions14.length, 14);
  const uniqueUrls = new Set(editions14.map((e) => e.profileUrl));
  assert.equal(uniqueUrls.size, 14, "All 14 print profiles must map to 14 distinct physical PDF paths");

  // 4. D5-R38 (5A) & D6-R38 (6A): #mostradorDoseCards in Drawer 2 and #bibleOpticalCameraVideo in data-dosis-subtab-panel="pdf"
  const idxPrintDrawer = indexHtml.indexOf('id="biblePrintEditionsSheet"');
  const idxWorkshopDrawer = indexHtml.indexOf('id="bibleFieldWorkshopSheet"');
  const idxDoseCards = indexHtml.indexOf('id="mostradorDoseCards"');
  assert.ok(idxDoseCards > idxPrintDrawer && idxDoseCards < idxWorkshopDrawer, "#mostradorDoseCards must reside inside Drawer 2");
  assert.match(indexHtml, /id="bibleOpticalCameraVideo"[^>]*data-dosis-subtab-panel="pdf"/);

  // 5. D7-R38 (7A): Zero broken dist/en/v1/mostrador/felices-en-v1-a4.pdf links in index.html
  assert.doesNotMatch(indexHtml, /dist\/en\/v1\/mostrador\/felices-en-v1-a4\.pdf/);

  // 6. D8-R38 (8A): buildEvangeliosWeekOptionsHtml and renderEvangeliosStageCardHtml localize to English when activeEvLang="en"
  const evEnOpts = mostradorMod.buildEvangeliosWeekOptionsHtml(
    [{ id: "s01", week: 1, quarter: "T1", reference: "JHN 1:1", texts: { en: { title: "The Word" } } }],
    "s01",
    "en",
  );
  assert.match(evEnOpts, /Week 1 \(T1\)/);
  const evEnCard = mostradorMod.renderEvangeliosStageCardHtml(
    {
      id: "s01",
      week: 1,
      quarter: "T1",
      reference: "JHN 1:1",
      gesture: "Light",
      texts: { en: { title: "The Word", text: "In the beginning" }, es: { text: "En el principio" } },
    },
    "en",
  );
  assert.match(evEnCard, /Week 1\/52/);
  assert.match(evEnCard, /Open in The Bible/);

  // 7. D10-R38 (10A): web/mostrador.js reduced by > 900 LOC via drawer_hydrators.js seam
  const mostradorLines = mostradorRaw.split("\n").length;
  assert.ok(mostradorLines <= 2750, `Expected web/mostrador.js <= 2750 LOC after D10-R38 extraction, got ${mostradorLines}`);
  assert.equal(typeof hydratorsMod.hydrateStudyDrawerPanel, "function");
  assert.equal(typeof hydratorsMod.hydrateImproveDrawerPanel, "function");
  assert.equal(typeof hydratorsMod.hydratePrintDrawerPanelsInDrawer, "function");
  assert.equal(typeof hydratorsMod.hydrateShareAndAuditDrawerPanel, "function");
});

test("R39_SLICE_127_to_132_split_brain_elimination_dark_mode_contrast_and_100pct_backend_exposure", async () => {
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const i18nMod = await import("./i18n.js");
  const i18nUiMod = await import("../i18n_ui.js");
  const diachronicMod = await import("./diachronic_register.js");
  const wfstMod = await import("./orthography_wfst.js");
  const estudioMod = await import("./estudio.js");
  const evangeliosMod = await import("./evangelios.js");
  const dosisMod = await import("./dosis.js");
  const mejorarMod = await import("./mejorar.js");
  const offlineMod = await import("./offline_mesh.js");

  // 1. D1-R39 (1A): applyToDom interpolates {book, chapter, verse} and never overwrites with raw missing keys
  const enCat = JSON.parse(fs.readFileSync(path.join(WEB_DIR, "i18n", "en.json"), "utf8"));
  const esCat = JSON.parse(fs.readFileSync(path.join(WEB_DIR, "i18n", "es.json"), "utf8"));
  assert.ok(enCat.messages["seal.verified"], "en.json must define seal.verified");
  assert.ok(esCat.messages["seal.verified"], "es.json must define seal.verified");
  const i18nInst = i18nMod.createI18n({ locale: "en", catalogs: { en: enCat } });
  const mockHeading = {
    textContent: "Genesis 1 — original words",
    getAttribute(k) {
      return k === "data-i18n" ? "study.title" : null;
    },
  };
  const mockRoot = {
    querySelectorAll(sel) {
      return sel === "[data-i18n]" ? [mockHeading] : [];
    },
  };
  i18nMod.applyToDom(mockRoot, i18nInst, { book: "GEN", chapter: 1, verse: 1 });
  assert.equal(mockHeading.textContent, "GEN 1 — original words");

  // 2. D1-R39 (1A): updateDownloadLinks and resolveFelicesPlateVerse never emit /dist/ or "Plate 24"
  const dlInfo = i18nUiMod.updateDownloadLinks(
    {
      getElementById(id) {
        return { href: "", setAttribute() { }, value: id === "langSelect" ? "es" : "" };
      },
    },
    "es",
  );
  assert.ok(!dlInfo.sheetsHref.startsWith("/dist/"), "Felices sheetsHref must not point to dead /dist/ URL");
  assert.ok(!dlInfo.bookletHref.startsWith("/dist/"), "Felices bookletHref must not point to dead /dist/ URL");
  const v24Unloaded = i18nUiMod.resolveFelicesPlateVerse(24, "es", {});
  assert.ok(!v24Unloaded.startsWith("Plate "), "resolveFelicesPlateVerse must never fall back to raw 'Plate 24'");

  // 3. D2-R39 (2A): Dark Mode defines --bg-secondary:#1c1917 and Drawer 2/3 deduplicate buttons/headings
  assert.match(indexHtml, /@media\s*\(prefers-color-scheme:\s*dark\)\{:root\{[^}]*--bg-secondary:#1c1917/);
  assert.doesNotMatch(indexHtml, /id="btnPrintAroundVerse"/, "DEB-R39-04: duplicate #btnPrintAroundVerse must be removed");
  const idxDoseCards = indexHtml.indexOf('id="mostradorDoseCards"');
  const idxEditionsGrid = indexHtml.indexOf('id="bibleEditionsCatalogGrid"');
  const idxKindleCfg = indexHtml.indexOf('id="bibleKindleConfigurator"');
  assert.ok(
    idxEditionsGrid > idxDoseCards && idxEditionsGrid < idxKindleCfg,
    "D5-R39: #bibleEditionsCatalogGrid must appear immediately after #mostradorDoseCards and before #bibleKindleConfigurator",
  );

  // 4. D3-R39 (3A): Diachronic 156 rules catalog + WFST & Scriptio Continua inspector
  const diaCatalog = diachronicMod.getAll156DiachronicSubstitutionsCatalog();
  assert.ok(diaCatalog.length >= 60, "getAll156DiachronicSubstitutionsCatalog must expose all diachronic FST rules");
  const wfstHtml = wfstMod.renderWfstAndScriptioContinuaInspectorHtml({
    text: "En el principio Dios creó",
    lang: "stp",
    profileId: "inali",
  });
  assert.match(wfstHtml, /id="wfstOrthographyAndScriptioInspector"/);
  assert.match(wfstHtml, /data-scriptio-continua-script="Hans"/);

  // 5. D4-R39 (4A): Humanized 14-Col fields (zero NSM_65:SDBH: or Rol: ∅ leaks), 12-lang calibration table, cultural glosses
  const humanFields = estudioMod.formatHumanReadable14ColFields({
    c09_macula_role: "∅",
    c10_clause_id: "∅",
    c11_semantic_domain: "SDBH:Acción_Origen",
    c13_nsm_65: "NSM_65:SDBH:Acción_Origen|PRIM:HACER+ALGO",
  });
  assert.ok(!humanFields.nsmHuman.includes("NSM_65:SDBH:"), "DEB-R39-03: NSM_65:SDBH: prefix must be stripped");
  assert.notEqual(humanFields.roleHuman, "∅", "DEB-R39-03: empty role must not render raw ∅");
  const glossHits = estudioMod.detectContextualCulturalGlossesForVerse("Y vinieron los fariseos con un siclo de plata");
  assert.ok(glossHits.length >= 2, "detectContextualCulturalGlossesForVerse must detect fariseo and siclo");
  const evEnActions = evangeliosMod.renderEvangeliosPlateActionsHtml({
    weekId: "s01",
    passageRef: "JHN.1.1",
    lang: "es",
    uiLocale: "en",
  });
  assert.match(evEnActions, /Cultural Realia Gloss:/);
  assert.match(evEnActions, /Dawn Contemplative Questions:/);
  const sampleEvEntry = {
    id: "s01",
    week: 1,
    quarter: "T1",
    reference: "JHN 1:1-18",
    gesture: "Encender una vela al amanecer",
    texts: {
      es: { title: "El Verbo se hizo carne", text: "En el principio era el Verbo." },
      en: { title: "The Word became flesh", text: "In the beginning was the Word." },
    },
  };
  const evOptsEnUi = buildEvangeliosWeekOptionsHtml([sampleEvEntry], "s01", "es", "en");
  assert.match(evOptsEnUi, /Week 1 \(T1\) · El Verbo se hizo carne/);
  const evCardEnUi = renderEvangeliosStageCardHtml(sampleEvEntry, "es", "en");
  assert.match(evCardEnUi, /Week 1\/52 \(T1\) · El Verbo se hizo carne/);
  assert.match(evCardEnUi, /Open in The Bible: JHN 1:1-18/);
  assert.match(evCardEnUi, /Liturgical Gesture:/);
  assert.match(evCardEnUi, /Cultural Realia Gloss:/);

  // 6. D5-R39 (5A) & D6-R39 (6A): Live Branch/Typology specimen, populated 12 macro-regions, WAL rollback preview
  const branchHtml = dosisMod.renderBranchAndTypologyInspectorHtml({ lang: "stp" });
  assert.match(branchHtml, /id="branchTypologyLiveSpecimen"/);
  assert.equal(mejorarMod.MASTER_CENSUS_SUMMARY.macro_regions_12.length, 12);
  const walPreview = mejorarMod.computeWalSnapshotRollbackPreview(2);
  assert.equal(walPreview.snapshotIndex, 2);
  assert.ok(walPreview.previewText.includes("Snapshot #2"));

  // 7. D7-R39 (7A): Real decoded verse preview in EcoDecoder (zero ECO_VERSE[ord=0..31102 leak) and single Quine CTA
  const ecoCardHtml = offlineMod.renderOfflineMeshEcoCardHtml({
    activeLang: "es",
    activeVerseOrdinal: 0,
    activeVerseRef: "GEN.1.1",
    activeVerseText: "En el principio creó Dios los cielos y la tierra.",
  });
  assert.doesNotMatch(ecoCardHtml, /ECO_VERSE\[ord=0\.\.31102/);
  assert.match(ecoCardHtml, /En el principio creó Dios los cielos y la tierra/);
  assert.doesNotMatch(ecoCardHtml, /Quine HTML Autónomo/, "DEB-R39-09: duplicate Quine CTA inside #offlineEcoMeshCard must be removed");

  // 8. #9.1 & #9.2: Contextual cultural gloss banner on canvas and 156-rule diachronic explorer with Tier filter
  const chapWithGlossHtml = renderChapterPreviewHtml(
    "MAT",
    22,
    "es",
    { verses: { "19": "Mostradme la moneda del tributo. Y ellos le presentaron un denario." } },
    null,
    { selectedVerse: 19 },
  );
  assert.match(chapWithGlossHtml, /id="activeVerseCulturalGlossBanner"/);
  assert.match(chapWithGlossHtml, /denario/i);
  const diaCardHtml = diachronicMod.renderChapterDiachronicAuditCardHtml({
    verses: ["En el principio creó Dios los cielos y la tierra."],
    bookCode: "GEN",
    chapter: 1,
  });
  assert.match(diaCardHtml, /id="diachronicSubstitutionsSearchInput"/);
  assert.match(diaCardHtml, /id="diachronicTierFilterSelect"/);
  assert.match(diaCardHtml, /id="diachronicSubstitutionsResultsList"/);
});

test("R40 (D1-R40..D9-R40 / ARB-EKOVOZ-77 / DEB-R40-01..10): Full i18n template projection, dropcap on sup, viewport scroll, WFST inspector, IndexedDB vault, Harel print subtabs, 16 verified Bible corpora, and zero duplicate DOM IDs", async () => {
  const estudioMod = await import("./estudio.js");
  const evangeliosMod = await import("./evangelios.js");
  const dosisMod = await import("./dosis.js");
  const mejorarMod = await import("./mejorar.js");
  const offlineMod = await import("./offline_mesh.js");
  const diachronicMod = await import("./diachronic_register.js");
  const orthoMod = await import("./orthography_wfst.js");
  const hydratorsMod = await import("./drawer_hydrators.js");
  const { renderEvangeliosStageCardHtml } = await import("./sister_works_controller.js");

  // 1. D1-R40 & DEB-R40-06..08: Dynamic generators honor uiLocale="en" with zero Spanish literal leaks
  const study14En = estudioMod.renderStudy14ColDrawerHtml(
    {
      book: "JHN",
      chapter: 1,
      rows: [
        {
          c01_ordinal_31102: 26046,
          c02_ref: "JHN.1.1",
          c03_source_corpus: "SRGNT",
          c04_word_pos: 1,
          c05_orig_text: "Ἐν",
          c06_translit: "En",
          c07_strong_id: "G1722",
          c08_morph_code: "PREP",
          c09_macula_role: "∅",
          c10_clause_id: "C1",
          c11_semantic_domain: "LN:89.5",
          c12_gloss_es: "En",
          c13_nsm_65: "NSM_65:EN+LUGAR",
          c14_target_gloss: "In",
        },
      ],
    },
    { book: "JHN", chapter: 1, verse: 1, scope: "verse", uiLocale: "en" },
  );
  assert.match(study14En, /1 of 1 words/);
  assert.match(study14En, /Current verse \(v\. 1\)/);
  assert.match(study14En, /Full chapter \(1\)/);
  assert.doesNotMatch(study14En, /de 1 palabras/);
  assert.doesNotMatch(study14En, /Versículo actual/);

  const rosettaEn = estudioMod.renderPhilologyRosettaExplorerHtml({
    book: "JHN",
    chapter: 1,
    verse: 1,
    uiLocale: "en",
  });
  assert.match(rosettaEn, /All Rosetta sub-corpora \+ 5 ResidualKinds/);
  assert.doesNotMatch(rosettaEn, /Todos los sub-corpus Rosetta/);

  const improveEn = mejorarMod.renderImproveDrawerHtml({
    ref: "JHN.1.1",
    lang: "stp",
    locale: "en",
    currentVerseText: "In the beginning",
  });
  assert.match(improveEn, /Lock 8 \(MACULA A0\/A1 \+ Jespersen\):/);
  assert.doesNotMatch(improveEn, /Candado 8 \(MACULA A0\/A1 \+ Jespersen\):/);

  const cascadeEn = mejorarMod.renderCascadeAndLadderHtml({
    lang: "stp",
    ref: "JHN.1.1",
    uiLocale: "en",
  });
  assert.match(cascadeEn, /External 8-Lock Audit/);
  assert.doesNotMatch(cascadeEn, /Auditoría Externa de 8 Candados/);

  const edsEn = dosisMod.listCatalogEditionsForLang("es", "en");
  assert.match(edsEn[0].label, /^1\. Continuous Reading/);
  const pocketEn = dosisMod.renderMultiSignatureAndPocketRefugeHtml({
    lang: "es",
    totalPages: 48,
    uiLocale: "en",
  });
  assert.match(pocketEn, /4n Multi-Signature Imposition/);
  assert.doesNotMatch(pocketEn, /Imposición Multi-Pliego 4n/);

  // 2. D2-R40 & DEB-R40-01: .bible-chapter-dropcap applied only on verse 1 <sup>, never on <p class="mostrador-verse">
  const chapHtml = renderChapterPreviewHtml(
    "JHN",
    1,
    "es",
    {
      verses: {
        "1": "En el principio era el Verbo.",
        "16": "Porque de su plenitud tomamos todos.",
      },
    },
    null,
    { selectedVerse: 16 },
  );
  assert.match(chapHtml, /<sup class="bible-v-sup mostrador-verse-num bible-chapter-dropcap">¹<\/sup>/);
  assert.doesNotMatch(chapHtml, /class="mostrador-verse[^"]*bible-chapter-dropcap"/);
  assert.match(chapHtml, /class="mostrador-verse bible-verse-line is-selected" data-verse="16"/);

  // 3. D3-R40 & DEB-R40-02: Stage thermometer omits duplicate #diachronicSubstitutionsSearchInput IDs; WFST inspector exposes profile selector
  const stageThermoEn = diachronicMod.renderAnalyticalThermometerHtml({
    verses: { "1": "En el principio creó Dios los cielos y la tierra." },
    bookCode: "GEN",
    osisRef: "GEN.1.1",
    includeInlineSubstitutionsDetails: false,
    uiLocale: "en",
  });
  assert.doesNotMatch(stageThermoEn, /id="diachronicSubstitutionsSearchInput"/);
  assert.doesNotMatch(stageThermoEn, /id="diachronicSubstitutionsDetails"/);
  assert.match(stageThermoEn, /Intergenerational Thermometer/);

  const wfstHtml = orthoMod.renderWfstAndScriptioContinuaInspectorHtml({
    lang: "kk",
    profileId: "CYRL",
    sampleVerseText: "Әуелде Құдай аспан мен жерді жаратты.",
    uiLocale: "en",
  });
  assert.match(wfstHtml, /id="wfstInspectorProfileSelect"/);
  assert.match(wfstHtml, /data-ortho-family="uzn"/);
  const bridgeMod = await import("./bridge_and_chapter.js");
  assert.ok(bridgeMod.MULTI_ORTHO_LANGS.has("kk") && bridgeMod.MULTI_ORTHO_LANGS.has("ber"));

  // 4. D4-R40 & DEB-R40-03..04: Offline Mesh IndexedDB controls + Gen 5 Bilateral photocopy badge
  const ecoCardEn = offlineMod.renderOfflineMeshEcoCardHtml({
    activeLang: "es",
    activeVerseOrdinal: 0,
    activeVerseRef: "GEN.1.1",
    activeVerseText: "In the beginning God created the heavens and the earth.",
    uiLocale: "en",
  });
  assert.match(ecoCardEn, /id="btnOfflineOptInSwDownload"/);
  assert.match(ecoCardEn, /id="btnOfflineListIndexedDbPacks"/);
  assert.match(ecoCardEn, /id="offlineIndexedDbVaultStatus"/);

  const graphicsCardEn = hydratorsMod.renderEditorialGraphicsAndPrintSpecsCard({
    lang: "es",
    uiLocale: "en",
  });
  assert.match(graphicsCardEn, /data-fifth-gen-min-contrast="7\.8"/);
  assert.match(graphicsCardEn, /Rural Photocopy Gen 5/);

  // 5. D5-R40 & DEB-R40-09: Regional print defaults (paperForRegion + chooseEdition) & Harel print subtabs
  const regionalDefaults = dosisMod.resolveRegionalPrintDefaults("en-US", {
    threatClass: "S1_OPEN",
    lang: "en",
    uiLocale: "en",
  });
  assert.equal(regionalDefaults.paperFormat, "letter");
  assert.ok(regionalDefaults.recommendedEdition && regionalDefaults.recommendedEdition.slug);
  assert.deepEqual(hydratorsMod.HAREL_PRINT_SUBTABS, ["doses", "imposition", "stationery"]);

  // 6. D6-R40, D7-R40 & DEB-R40-10: 16 verified Bible corpora in index.html, dark-mode --focal-frame-bg, and conditional Evangelios bridge
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.match(indexHtml, /--focal-frame-bg:#faf7f0/);
  assert.match(indexHtml, /id="wfstAndScriptioContinuaHost"/);
  assert.match(indexHtml, /id="printDosisHarelSubtabsBar"/);
  for (const code of ["es", "es-1909", "en", "pt", "fr", "stp", "he", "grc", "ar", "fa", "ur", "hi", "bn", "id", "ru", "zh-Hans"]) {
    assert.match(indexHtml, new RegExp(`data-corpus-lang="${code}"`), `Missing verified pill for ${code}`);
  }
  const sampleEvEntry = {
    id: "s01",
    week: 1,
    quarter: "T1",
    reference: "JHN 1:1-18",
    gesture: "Encender una vela al amanecer",
    texts: {
      es: { title: "El Verbo se hizo carne", text: "En el principio era el Verbo." },
      en: { title: "The Word became flesh", text: "In the beginning was the Word." },
      quc: { title: "Ri Tzij xux winaq", text: "Pa ri chapletajik k'o ri Tzij." },
    },
  };
  const evMajorEs = renderEvangeliosStageCardHtml(sampleEvEntry, "es", "es");
  assert.doesNotMatch(evMajorEs, /<em>Puente:<\/em>/, "DEB-R40-10: major language 'es' must not render redundant English bridge line");
  const evMinorQuc = renderEvangeliosStageCardHtml(sampleEvEntry, "quc", "es");
  assert.match(evMinorQuc, /<em>Puente:<\/em> En el principio era el Verbo\./, "DEB-R40-10: indigenous language 'quc' must render Spanish bridge line");
});

test("R41 (D1-R41..D10-R41 / ARB-EKOVOZ-78 / GOLD-665): Sovereign Surface & Asset Registry, 4-Drawer Harel Symmetry, 18-Locale Parity & Clean-Seam Modularity", async () => {
  const estudioMod = await import("./estudio.js");
  const mejorarMod = await import("./mejorar.js");
  const dosisMod = await import("./dosis.js");
  const hydratorsMod = await import("./drawer_hydrators.js");
  const sisterMod = await import("./sister_works_controller.js");
  const drawerStudyMod = await import("./drawer_study.js");
  const drawerPrintMod = await import("./drawer_print.js");
  const drawerWorkshopMod = await import("./drawer_workshop.js");
  const drawerShareMod = await import("./drawer_share.js");

  // 1. D1-R41 & D3-R41: Clean-seam 4-drawer modules + Study Harel 3-subtab partition without duplicate Rosetta Inspector
  assert.deepEqual(hydratorsMod.HAREL_STUDY_SUBTABS, ["words", "rosetta", "calibrate"]);
  assert.equal(typeof drawerStudyMod.hydrateStudyDrawerPanel, "function");
  assert.equal(typeof drawerPrintMod.renderPrintDrawerPanelsSyncInDrawer, "function");
  assert.equal(typeof drawerWorkshopMod.hydrateImproveDrawerPanel, "function");
  assert.equal(typeof drawerShareMod.hydrateShareAndAuditDrawerPanel, "function");

  const studyNoInlineRosetta = estudioMod.renderStudy14ColDrawerHtml(
    { text: "En el principio", words: [{ c01_ordinal: 1, c02_surface: "בְּרֵאשִׁית", c04_strong: "H7225" }] },
    { book: "GEN", chapter: 1, verse: 1, lang: "es", uiLocale: "es" },
    { includeRosettaInspector: false },
  );
  assert.doesNotMatch(
    studyNoInlineRosetta,
    /id="philologyRosettaInspectorCard"/,
    "D3-R41: Subtab 1 must not duplicate #philologyRosettaInspectorCard when #philologyRosettaStaticHost exists",
  );

  // 2. D4-R41 & D7-R41: Deduplicated #celf250SeedOutput in Gaveta 3 and full-width grid-column: 1 / -1 cards
  const improveNoInlineSeed = mejorarMod.renderImproveDrawerHtml({
    book: "ROM",
    chapter: 1,
    verse: 16,
    lang: "stp",
    locale: "es",
    currentText: "Tet na tu' nii'ñ...",
    includeInlineSeedPanel: false,
  });
  assert.doesNotMatch(
    improveNoInlineSeed,
    /id="celf250SeedOutput"/,
    "D4-R41: Subtab 1 of Drawer 3 must not inject #celf250SeedOutput when static Subtab 2 host exists",
  );
  assert.match(improveNoInlineSeed, /Proponer mejora de traducción/, "D6-R41: Spanish fallback must be used when locale='es' and i18n is omitted");

  const censusHtml = hydratorsMod.renderFieldWorkshopCensus7164Html({ uiLocale: "es" });
  assert.match(censusHtml, /id="masterCensus7164InspectorCard"[^>]*grid-column:1 \/ -1;width:100%/);
  const cascadeWithWalHtml = mejorarMod.renderCascadeAndLadderHtml({
    book: "ROM",
    chapter: 1,
    verse: 16,
    lang: "stp",
    locale: "es",
    includeWalCard: true,
    includeCensusCard: false,
  });
  assert.match(cascadeWithWalHtml, /id="crdtWalAndLockP2AuditCard"[^>]*grid-column:1 \/ -1;width:100%/);

  // 3. D5-R41: Live PDF synthesis for text-only Bibles (zero cross-language substitution to Spanish)
  const ptEditions = dosisMod.listAll14PrintEditionsForLang("pt", "es");
  assert.ok(ptEditions.length >= 14, "listAll14PrintEditionsForLang must return all 14+ profiles");
  assert.equal(ptEditions[0].hasPrecompiledPdf, false, "pt is a verified text Bible without precompiled PDF blocks");
  assert.equal(ptEditions[0].supportsLivePdfSynthesis, true, "pt must support live PDF synthesis");
  const livePdfBytes = dosisMod.synthesizeLiveChapterDose1PdfBytes({
    lang: "pt",
    book: "GEN",
    chapter: 1,
    verse: 1,
    paperFormat: "a4",
    versesMap: { "1": "No princípio criou Deus os céus e a terra.", "2": "A terra, porém, estava sem forma e vazia." },
  });
  assert.ok(livePdfBytes instanceof Uint8Array && livePdfBytes.byteLength > 400);
  const pdfHeader = new TextDecoder("ascii").decode(livePdfBytes.slice(0, 8));
  assert.equal(pdfHeader, "%PDF-1.4");

  // 4. D6-R41: All 18 i18n JSON catalogs have 100% key parity (>= 280 keys each)
  const i18nDir = path.join(WEB_DIR, "i18n");
  const enCatalog = JSON.parse(fs.readFileSync(path.join(i18nDir, "en.json"), "utf8"));
  const enKeys = Object.keys(enCatalog.messages || enCatalog.strings || enCatalog).filter((k) => !k.startsWith("_")).sort();
  assert.ok(enKeys.length >= 280, `Expected >= 280 i18n keys in en.json, got ${enKeys.length}`);
  for (const code of ["ar", "bn", "bn-BD", "bn-IN", "en", "es", "fa", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "tr", "ur", "zh-Hans"]) {
    const cat = JSON.parse(fs.readFileSync(path.join(i18nDir, `${code}.json`), "utf8"));
    const keys = Object.keys(cat.messages || cat.strings || cat).filter((k) => !k.startsWith("_")).sort();
    assert.deepEqual(keys, enKeys, `D6-R41: web/i18n/${code}.json must have 100% key parity with en.json`);
  }

  // 5. D2-R41 & D9-R41: index.html sticky drawer bar, Study Harel subtabs, Felices language selector, and sister works drawer isolation
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  assert.match(indexHtml, /id="bibleProgressiveSheetDoors"[^>]*position:\s*sticky;\s*top:\s*0/);
  assert.match(indexHtml, /id="studyHarelSubtabsBar"/);
  assert.match(indexHtml, /id="felicesLangSelect"/);
  assert.match(indexHtml, /id="bibleAnalyticalThermometerPanel"[^>]*data-study-subtab-panel="calibrate"/);

  const mockEls = {
    sovereignGlobalDrawersHost: { hidden: false, style: { display: "" } },
    bibleProgressiveSheetDoors: { hidden: false, style: { display: "" } },
  };
  sisterMod.syncSisterWorksTabsDom("felices", (id) => mockEls[id] || null);
  assert.equal(mockEls.sovereignGlobalDrawersHost.hidden, true, "D9-R41: #sovereignGlobalDrawersHost must be hidden on Felices tab");
  sisterMod.syncSisterWorksTabsDom("biblia", (id) => mockEls[id] || null);
  assert.equal(mockEls.sovereignGlobalDrawersHost.hidden, false, "D9-R41: #sovereignGlobalDrawersHost must be visible on Biblia tab");
});

test("R42 (ARB-EKOVOZ-79 / GOLD-666): Zero-Orphan Closure (0 unreferenced JSONs, CallsInProd >= 1 for all exported functions, Sticky Drawer Context Header, Live Dose 2/3 & Pack Synthesis, 32 Los Felices PDFs)", async () => {
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");

  // 1. D1-R42: .language-region-pill-group must not be hidden when a drawer is open, and #stickyDrawerContextHeader must exist inside #bibleProgressiveSheetDoors
  assert.doesNotMatch(
    indexHtml,
    /body:has\(#bibleVerseViewport\[data-inspector-open="true"\]\)\s*\.language-region-pill-group/,
    "D1-R42: .language-region-pill-group must remain visible when a drawer is open",
  );
  assert.match(indexHtml, /id="stickyDrawerContextHeader"/);
  assert.match(indexHtml, /id="stickyActiveVersePill"/);
  assert.match(indexHtml, /id="stickyActiveLangBtn"/);
  assert.match(indexHtml, /id="btnStickyJumpToCanvas"/);

  // 2. D2-R42: syncDose2AndDose3LinksForActiveLang synthesizes live PDFs for the 11 text-only languages without falling back to es
  const dosisMod = await import("./dosis.js");
  const mockLink2 = { href: "", textContent: "", attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const mockLink3 = { href: "", textContent: "", attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const liveSync = dosisMod.syncDose2AndDose3LinksForActiveLang({
    state: {
      lang: "pt",
      uiLocale: "en",
      book: "JHN",
      chapter: 1,
      verse: 1,
      lastNavResult: { chapter: { verses: { "1": "No princípio era o Verbo." } } },
    },
    getEl: (id) => (id === "linkDose2BlockPdf" ? mockLink2 : id === "linkDose3FullBiblePdf" ? mockLink3 : null),
  });
  assert.equal(liveSync.mode, "live-synthesis");
  assert.ok(mockLink2.href.startsWith("data:application/pdf;base64,"), "Dose 2 must use live PDF synthesis for pt");
  assert.equal(mockLink2.attrs["data-lang"], "pt");
  assert.ok(mockLink3.href.startsWith("data:application/pdf;base64,"), "Dose 3 must use live PDF synthesis for pt");
  assert.equal(mockLink3.attrs["data-lang"], "pt");

  // 3. D3-R42: loadMasterCensusSummary and loadOfflinePacksCatalog exist in data_layer.js
  const dataLayerMod = await import("./data_layer.js");
  const dl = dataLayerMod.createDataLayer({ source: createDiskBackedSource() });
  const censusDoc = await dl.loadMasterCensusSummary();
  assert.ok(censusDoc && typeof censusDoc === "object", "loadMasterCensusSummary must load master_census_summary.json");
  const offlineCat = await dl.loadOfflinePacksCatalog();
  assert.ok(offlineCat && typeof offlineCat === "object", "loadOfflinePacksCatalog must load offline_packs_catalog.json + packs_manifest.json");

  // 4. D4-R42: updateDownloadLinks points #linkSheets and #linkBooklet to the 32 mirrored Los Felices PDFs
  const i18nUiMod = await import("../i18n_ui.js");
  const felLinks = i18nUiMod.updateDownloadLinks(
    {
      getElementById(id) {
        return { href: "", setAttribute() {}, value: id === "langSelect" ? "pt" : "" };
      },
    },
    "pt",
  );
  assert.equal(felLinks.sheetsHref, "dist/pt/v1/mostrador/felices-pt-v1-sheets.pdf");
  assert.equal(felLinks.bookletHref, "dist/pt/v1/mostrador/felices-pt-v1-booklet.pdf");
  assert.ok(
    fs.existsSync(path.join(WEB_DIR, felLinks.sheetsHref)),
    "Mirrored Los Felices sheets PDF must exist under web/dist/",
  );
  assert.ok(
    fs.existsSync(path.join(WEB_DIR, felLinks.bookletHref)),
    "Mirrored Los Felices booklet PDF must exist under web/dist/",
  );

  // 5. D5-R42..D8-R42: Every exported function across all production JS files has CallsInProd >= 1
  const prodFiles = [
    path.join(WEB_DIR, "i18n_ui.js"),
    path.join(WEB_DIR, "mostrador.js"),
    path.join(WEB_DIR, "sw.js"),
    ...fs
      .readdirSync(path.join(WEB_DIR, "mostrador"))
      .filter((f) => f.endsWith(".js") && !f.endsWith(".test.mjs"))
      .map((f) => path.join(WEB_DIR, "mostrador", f)),
  ];
  const fullProdCorpus = prodFiles.map((p) => fs.readFileSync(p, "utf8")).join("\n");
  for (const filePath of prodFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const exportRe = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
    let m;
    while ((m = exportRe.exec(content)) !== null) {
      const fnName = m[1];
      if (fnName === "bootBrowserMostrador" || fnName === "createMostradorController") continue;
      const callRe = new RegExp(`\\b${fnName}\\s*\\(`, "g");
      const matches = fullProdCorpus.match(callRe) || [];
      assert.ok(
        matches.length >= 2,
        `D5-R42..D8-R42: Exported function '${fnName}' in ${path.basename(filePath)} must have at least 1 production call (found ${matches.length - 1})`,
      );
    }
  }
});

test("R43 (ARB-EKOVOZ-80 / D1-R43..D4-R43 / DEB-R43-01..05): Drawer 1 exact 3-subtab grouping & open details, #felicesLangSelect 18-language bijection, Drawer 3 .eight-locks-pda-bar in Sub-tab 3 audit, and deploy_web.ps1 dist exclusion", async () => {
  const indexHtml = fs.readFileSync(path.join(WEB_DIR, "index.html"), "utf8");
  const deployPs1 = fs.readFileSync(path.resolve(WEB_DIR, "..", "deploy_web.ps1"), "utf8");
  const estudioMod = await import("./estudio.js");
  const mejorarMod = await import("./mejorar.js");
  const i18nUiMod = await import("../i18n_ui.js");

  // 1. D1-R43 (DEB-R43-05): deploy_web.ps1 excludes \\dist\\ from $ControlPlaneBytes
  assert.match(
    deployPs1,
    /\$ControlPlaneBytes\s*=\s*\(Get-ChildItem[^\r\n]*-notmatch\s*"\\\\dist\\\\"/,
    "D1-R43 / DEB-R43-05: deploy_web.ps1 must exclude \\\\dist\\\\ from $ControlPlaneBytes calculation",
  );

  // 2. D2-R43 (DEB-R43-01): #felicesLangSelect has exact 1:1 bijection with the 18 LANGUAGE_PACKS & web/data/felices/*.json
  const selectMatch = indexHtml.match(/<select[^>]*id="felicesLangSelect"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(selectMatch, "#felicesLangSelect must exist in web/index.html");
  const felOptions = [...selectMatch[1].matchAll(/<option\s+value="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(felOptions.length, 18);
  assert.deepEqual(
    [...felOptions].sort(),
    i18nUiMod.LANGUAGE_PACKS.map((p) => p.code).sort(),
    "D2-R43: #felicesLangSelect options must match LANGUAGE_PACKS 1:1",
  );

  // 3. D3-R43 (DEB-R43-02, DEB-R43-03): Drawer 1 (#bibleEasyDrawerPanel) exact 3-subtab grouping and open <details>
  assert.match(indexHtml, /id="nsm65StratumCard"\s+data-study-subtab-panel="rosetta"\s+hidden/);
  assert.match(indexHtml, /id="philologyRosettaStaticHost"\s+data-study-subtab-panel="calibrate"\s+hidden/);
  assert.match(indexHtml, /<details\s+id="diachronicSubstitutionsDetails"\s+open\s+data-study-subtab-panel="calibrate"\s+hidden/);
  const strataCards = estudioMod.renderStudyStrataCards(
    {
      book: "GEN",
      chapter: 1,
      rows: [{ idx: 1, verse: 1, surface: "בְּרֵאשִׁית", strong: "H7225", gloss_es: "En el principio" }],
    },
    { verse: 1 },
  );
  assert.match(
    strataCards.realiaHtml,
    /<details\s+id="studyCulturalGlossesCatalogAccordion"\s+open\b/,
    "D3-R43 / DEB-R43-03: #studyCulturalGlossesCatalogAccordion must render open by default",
  );

  // 4. D4-R43 (DEB-R43-04): .eight-locks-pda-bar omitted from Sub-tab 1 (patch) and mounted in Sub-tab 3 (audit)
  const subtab1Html = mejorarMod.renderImproveDrawerHtml({ lang: "stp", osis: "GEN.1.1" });
  assert.doesNotMatch(subtab1Html, /class="eight-locks-pda-bar"/);
  const subtab3Html = mejorarMod.renderTallerArtifactsCatalogHtml("stp");
  assert.match(subtab3Html, /class="eight-locks-pda-bar"[^>]*data-eight-locks-bar="true"/);
});

test("D9_R44_mostrador_controller_partitioned_below_2000_loc_with_seam_modules", async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const controllerSrc = fs.readFileSync(path.resolve(here, "..", "mostrador.js"), "utf8");
  const loc = controllerSrc.split(/\r?\n/).length;
  assert.ok(loc < 2000, `web/mostrador.js debe quedar < 2,000 LOC (tiene ${loc})`);
  for (const sym of ["bindShareDrawerActionEvents", "bindSisterWorksStageEvents", "bindFelicesStageEvents", "syncStickyDrawerContextHeader"]) {
    assert.ok(controllerSrc.includes(`${sym}(`), `mostrador.js debe delegar en ${sym}`);
  }
  assert.ok(!controllerSrc.includes("const executeGaveta4Action = async"), "executeGaveta4Action vive en drawer_share.js");
  assert.ok(!controllerSrc.includes("const hydrateEvangeliosSection = async"), "el hidratador de Evangelios vive en sister_works_controller.js");
  const share = await import("./drawer_share.js");
  const sister = await import("./sister_works_controller.js");
  assert.equal(typeof share.bindShareDrawerActionEvents, "function");
  assert.equal(typeof sister.bindSisterWorksStageEvents, "function");
  assert.equal(typeof sister.bindFelicesStageEvents, "function");
});

test("D1_R44_sticky_drawer_header_hidden_without_active_sheet_and_tracks_passage", async () => {
  const { syncStickyDrawerContextHeader } = await import("./projection_contract.js");
  const els = {};
  for (const id of ["stickyDrawerContextHeader", "stickyActiveVersePill", "stickyActiveLangBtn", "btnStickyJumpToCanvas"]) {
    els[id] = { id, hidden: true, textContent: "", attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  }
  const getEl = (id) => els[id] || null;
  assert.equal(syncStickyDrawerContextHeader({ activeSheet: null, book: "JHN", chapter: 1, verse: 1, lang: "es", uiLocale: "es" }, getEl), false);
  assert.equal(els.stickyDrawerContextHeader.hidden, true, "sin gaveta abierta la barra se oculta");
  assert.equal(syncStickyDrawerContextHeader({ activeSheet: "study", book: "ROM", chapter: 8, verse: 28, lang: "stp", uiLocale: "es" }, getEl), true);
  assert.equal(els.stickyDrawerContextHeader.hidden, false);
  assert.equal(els.stickyActiveVersePill.textContent, "📖 ROM 8:28");
  assert.equal(els.stickyActiveLangBtn.textContent, "🌍 STP");
  assert.equal(els.btnStickyJumpToCanvas.textContent, "↑ Lienzo");
  syncStickyDrawerContextHeader({ activeSheet: "print", book: "PSA", chapter: 23, verse: 1, lang: "en", uiLocale: "en" }, getEl);
  assert.equal(els.stickyActiveVersePill.textContent, "📖 PSA 23:1");
  assert.equal(els.btnStickyJumpToCanvas.textContent, "↑ Canvas");
  const html = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html"), "utf8");
  assert.match(html, /<div id="stickyDrawerContextHeader" hidden/);
  assert.match(html, /#stickyDrawerContextHeader\[hidden\][^{]*\{display:none !important;\}/);
});
