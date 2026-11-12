import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MASORETIC_AND_GOSPEL_PERICOPE_MAP,
  FELICES_28_PLATES_MAP,
  hydratePericopesAndGlosses,
  resolveFelicesPlate,
  renderChapterPericopesRibbonHtml,
  renderFelicesSocraticWonderCardHtml,
  renderEvangeliosPlateActionsHtml,
} from "./evangelios.js";

test("D5-A+ and D9-A+: chapter pericopes ribbon and Felices 28-plate Socratic Wonder card render without truncation", () => {
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const pericopesPath = path.join(webDir, "data", "pericopes_and_glosses.json");
  const pericopesJson = JSON.parse(fs.readFileSync(pericopesPath, "utf8"));

  hydratePericopesAndGlosses(pericopesJson);
  assert.ok(Object.keys(MASORETIC_AND_GOSPEL_PERICOPE_MAP).length >= 1100);
  assert.equal(Object.keys(FELICES_28_PLATES_MAP).length, 28);

  const ribbonHtml = renderChapterPericopesRibbonHtml("JHN", 1, "es");
  assert.match(ribbonHtml, /class="uls-chip chapter-pericope-ribbon-chip"/);
  assert.match(ribbonHtml, /data-pericope-verse="1"/);
  assert.match(ribbonHtml, /data-synoptic-jump="/);

  const wonderHtml = renderFelicesSocraticWonderCardHtml(9, "es");
  assert.match(wonderHtml, /class="felices-socratic-wonder-inner"/);
  assert.match(wonderHtml, /data-plate-number="9"/);
  assert.match(wonderHtml, /data-wonder-cite="/);
  assert.match(wonderHtml, /data-socratic-question="1"/);

  const plate9 = resolveFelicesPlate(9);
  assert.equal(plate9.number, 9);
  assert.ok(plate9.title_es.length > 0);
  assert.ok(Array.isArray(plate9.preguntas_es) && plate9.preguntas_es.length >= 2);

  const actionsHtml = renderEvangeliosPlateActionsHtml({ weekId: "s01", passageRef: "JHN.1.1", lang: "stp" });
  assert.match(actionsHtml, /data-lang="stp"/);
});


test("D4_R44_all_52_weeks_resolve_real_macro_threads_from_keyed_object_artifact", async () => {
  const { resolveEvangeliosMacroThreadAndEcho } = await import("./evangelios.js");
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const artifact = JSON.parse(fs.readFileSync(path.join(webDir, "data", "pericopes_and_glosses.json"), "utf8"));
  const source = artifact.evangelios_macro_threads;
  assert.equal(Array.isArray(source), false, "el artefacto real publica un objeto indexado s01..s52");
  assert.equal(Object.keys(source).length, 52);
  hydratePericopesAndGlosses(artifact);
  const seen = new Set();
  for (let w = 1; w <= 52; w++) {
    const key = `s${String(w).padStart(2, "0")}`;
    const meta = resolveEvangeliosMacroThreadAndEcho(key);
    const expected = source[key];
    assert.equal(meta.weekNumber, w, `${key}: weekNumber`);
    assert.ok(meta.macroThread.includes(String(expected.macroThread).split("—")[0].trim().slice(0, 20)), `${key}: hilo real`);
    assert.ok(!/^Hilo \d+ · Hilo /.test(meta.macroThread), `${key}: prefijo de hilo duplicado`);
    assert.ok(Array.isArray(meta.pericopeBlocks) && meta.pericopeBlocks.length >= 1, `${key}: perícopas`);
    assert.match(meta.anchorOsis, /^[1-3]?[A-Z]{2,3}\.\d+\.\d+$/, `${key}: anchorOsis canónico`);
    seen.add(meta.anchorOsis + "|" + meta.macroThread);
  }
  assert.ok(seen.size >= 40, `las 52 semanas deben ser distintas, hay ${seen.size}`);
  const html = renderEvangeliosPlateActionsHtml({ weekId: "s01", passageRef: "JHN 1:1", lang: "es", uiLocale: "es" });
  assert.ok(html.includes('id="evangeliosPericopeBlocksList"'));
  assert.ok(!html.includes("Camino mesiánico y cumplimiento"));
});

test("R45_SLICE_178_all_52_evangelios_plates_bijective_and_zero_raw_slugs", async () => {
  const { resolveEvangeliosMacroThreadAndEcho, formatHumanEvangeliosPlateTitle } = await import("./evangelios.js");
  const {
    resolveEvangeliosActiveSelection,
    buildEvangeliosWeekOptionsHtml,
    renderEvangeliosStageCardHtml,
  } = await import("./sister_works_controller.js");
  const { createDataLayer } = await import("./data_layer.js");

  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const pgJson = JSON.parse(fs.readFileSync(path.join(webDir, "data", "pericopes_and_glosses.json"), "utf8"));
  hydratePericopesAndGlosses(pgJson);

  const layer = createDataLayer({
    source: {
      async getJson(rel) {
        return JSON.parse(fs.readFileSync(path.join(webDir, rel), "utf8"));
      },
      async getBytes(rel) {
        return new Uint8Array(fs.readFileSync(path.join(webDir, rel)));
      },
    },
  });
  const corpus = await layer.loadEvangeliosCorpus();
  assert.equal(corpus.total_plates, 52);
  assert.equal(corpus.canonical_gospel_verses_count, 3779);
  assert.equal(corpus.entries.length, 52);

  // Verify s01 (mc-01-redes, Mc 1:16-20) resolves to MRK 1:16, NOT JHN 1:1 / JHN 1:14
  const selS01 = resolveEvangeliosActiveSelection({ corpus, quarterFilter: "T1", weekId: "s01", fallbackLang: "es" });
  assert.deepEqual(selS01.coordinate, { book: "MRK", chapter: 1, verse: 16 });
  assert.equal(selS01.totalPlates, 52);
  assert.equal(selS01.canonicalGospelVersesCount, 3779);

  // Verify bijection across all 52 plates and zero raw slugs in visible text
  const seenAnchors = new Set();
  const optsHtml = buildEvangeliosWeekOptionsHtml(corpus.entries, "s01", "es", "en");
  const visibleOptionText = optsHtml.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visibleOptionText, /\b(mc|mt|lc|jn)-\d{2}-[a-z0-9-]+\b/i);

  for (const entry of corpus.entries) {
    const bySlug = resolveEvangeliosMacroThreadAndEcho({ plateSlug: entry.plate_id, weekId: entry.id });
    assert.equal(bySlug.plateSlug, entry.plate_id);
    seenAnchors.add(`${entry.plate_id}:${bySlug.anchorOsis}`);
    const humanTitle = formatHumanEvangeliosPlateTitle(entry, "es", "en");
    assert.ok(humanTitle.length > 3);
    assert.doesNotMatch(humanTitle, /\b(mc|mt|lc|jn)-\d{2}-[a-z0-9-]+\b/i);
  }
  assert.equal(seenAnchors.size, 52);

  const cardHtml = renderEvangeliosStageCardHtml(corpus.entries[0], "es", "en", {
    totalPlates: corpus.total_plates,
    canonicalGospelVersesCount: corpus.canonical_gospel_verses_count,
  });
  const visibleCardText = cardHtml.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visibleCardText, /\bmc-01-redes\b/i);
  assert.doesNotMatch(visibleCardText, /Habitar entre nosotros|EXO\.25\.8/);
  assert.match(cardHtml, /data-total-plates="52"/);
  assert.match(cardHtml, /data-canonical-gospel-verses="3779"/);
});
