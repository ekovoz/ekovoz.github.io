import test from "node:test";
import assert from "node:assert/strict";

import { buildPatchPayload, renderImproveDrawerHtml } from "./mejorar.js";
import { runModuleWithoutProcess } from "../test_support/no_process_runner.mjs";

test("patch_fields_match_patch_template_toml", () => {
  const patch = buildPatchPayload({
    kind: "verse",
    lang: "stp",
    level: "L3",
    ref: "JHN.1.1",
    strongId: "G3056",
    oldSurface: "Ñi'ook",
    newSurface: "Ñi'ook Verdadero",
    note: "Revisión de ancianos en Mezquital",
  });

  assert.equal(patch.kind, "verse");
  assert.equal(patch.lang, "stp");
  assert.equal(patch.level, "L3");
  assert.equal(patch.ref, "JHN.1.1");
  assert.equal(patch.strong_id, "G3056");
  assert.equal(patch.old_surface, "Ñi'ook");
  assert.equal(patch.new_surface, "Ñi'ook Verdadero");
  assert.equal(patch.audio_bytes, 0);
  assert.equal(
    patch.payloadLine,
    "EKOVOZ_PATCH_PAYLOAD|stp|L3|JHN.1.1|Ñi'ook|Ñi'ook Verdadero|Revisión de ancianos en Mezquital",
  );
  assert.equal(
    patch.cliFileLine,
    "JHN.1.1|Ñi'ook|Ñi'ook Verdadero|Revisión de ancianos en Mezquital",
  );
  assert.match(patch.tomlBlock, /\[\[patches\]\]/);
  assert.match(patch.tomlBlock, /strong_id = "G3056"/);
  assert.match(patch.tomlBlock, /audio_bytes = 0/);
});

test("patch_ui_string_kind_has_key_and_locale", () => {
  const patch = buildPatchPayload({
    kind: "ui-string",
    locale: "fr",
    key: "dose.1.title",
    oldSurface: "Sheets around this verse",
    newSurface: "Feuilles autour de ce verset",
    note: "Traduction française de l'interface",
  });

  assert.equal(patch.kind, "ui-string");
  assert.equal(patch.locale, "fr");
  assert.equal(patch.key, "dose.1.title");
  assert.equal(patch.old_surface, "Sheets around this verse");
  assert.equal(patch.new_surface, "Feuilles autour de ce verset");
  assert.equal(patch.audio_bytes, 0);
  assert.equal(
    patch.payloadLine,
    "EKOVOZ_UI_PATCH_PAYLOAD|fr|dose.1.title|Sheets around this verse|Feuilles autour de ce verset|Traduction française de l'interface",
  );
});

test("patch_zero_audio_bytes", () => {
  const html = renderImproveDrawerHtml({
    lang: "stp",
    locale: "en",
    ref: "GEN.1.1",
    strongId: "H0430",
    currentVerseText: "Jich Këkahl Jawatan Dios",
  });
  assert.match(html, /data-audio-bytes="0"/);
  assert.match(html, /H0430/);
  assert.match(html, /EKOVOZ_PATCH_PAYLOAD\|stp\|L2\|GEN\.1\.1/);
});

test("runs_with_process_undefined", () => {
  const out = runModuleWithoutProcess(
    new URL("./mejorar.js", import.meta.url).href,
    `
      const p = mod.buildPatchPayload({ kind: "verse", lang: "es", level: "L1", ref: "ROM.1.16", oldSurface: "a", newSurface: "b" });
      if (!p.payloadLine.startsWith("EKOVOZ_PATCH_PAYLOAD|es|L1|ROM.1.16|") || p.audio_bytes !== 0) {
        throw new Error("Invalid patch payload");
      }
      console.log("OK_NO_PROCESS_MEJORAR");
    `,
  );
  assert.match(out, /OK_NO_PROCESS_MEJORAR/);
});

