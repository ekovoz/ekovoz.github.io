import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applyOrthographyProfile,
  createMostradorController,
  deriveEpistemicSeal,
  renderChapterPreviewHtml,
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
  const rosettaContainer = mockDoc.getElementById("leipzig14ColStratumAction");
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
  const cascadeHtml = renderCascadeAndLadderHtml({ lang: "stp", ref: "MAT 5:3", token: "xoi'kam" });
  assert.match(cascadeHtml, /id="masterCensus7164InspectorCard"/);
  assert.match(cascadeHtml, /id="crdtWalAndLockP2AuditCard"/);

  const walCardHtml = renderCrdtWalAndLockP2AuditCardHtml();
  assert.match(walCardHtml, /id="crdtWalAndLockP2AuditCard"/);
  assert.match(walCardHtml, /data-wal-raw-lines="60"/);
  assert.match(walCardHtml, /data-wal-canonical-patches="5"/);
  assert.match(walCardHtml, /data-lock-p2-status="ROLLED_BACK"/);

  // 4. D4-R32 (4B+) & DEBRIS-R32-01..02: 5 ResidualKind classes + chrF++ 81.89 + zero duplicate DOM injection
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
  assert.match(studyHtml, /data-chrf-plus-plus="81\.89"/);
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
    /#bibleSovereignSection:has\(#bibleVerseViewport\[data-inspector-open="true"\]\)\s*#bibleChapterPericopesRibbon/,
    "D7-R32 / DEBRIS-R32-03: index.html must collapse #bibleChapterPericopesRibbon when inspector is open",
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












