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
