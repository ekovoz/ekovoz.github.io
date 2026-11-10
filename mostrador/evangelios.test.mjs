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

