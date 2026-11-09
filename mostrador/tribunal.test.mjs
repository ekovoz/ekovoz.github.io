import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createMostradorController,
  deriveEpistemicSeal,
  applyOrthographyProfile,
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

  // Switch to classical register (es-1909)
  await mockDoc.getElementById("btnRegClasica").listeners.click();
  assert.equal(ctrl.state.lang, "es-1909");
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
  assert.equal(indexHtml.includes('id="evangeliosLangSelect"'), false, "D8-B+: Duplicate #evangeliosLangSelect must be purged");
  assert.ok(indexHtml.includes("button,select,.uls-chip,.uls-trigger-btn,summary{min-height:48px;min-width:48px;}"), "D9-B+: summary must enforce 48px tap target");

  // 4. Debris Purge Verification
  assert.equal(fs.existsSync(path.resolve(WEB_DIR, "..", "portal_publico")), false, "portal_publico debris must be purged");
  assert.equal(fs.existsSync(path.join(WEB_DIR, "bible_reader.js")), false, "web/bible_reader.js debris must be purged");
  assert.equal(fs.existsSync(path.join(WEB_DIR, "bible_reader.test.mjs")), false, "web/bible_reader.test.mjs debris must be purged");
  assert.equal(fs.existsSync(path.join(WEB_DIR, "es")), false, "Static localized clone web/es/ must be purged");
});




