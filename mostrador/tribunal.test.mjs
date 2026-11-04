import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createMostradorController,
  deriveEpistemicSeal,
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
      return elements[id] || null;
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

