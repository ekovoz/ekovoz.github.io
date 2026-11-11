import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPatchPayload,
  buildElicitationSeedPayload,
  renderImproveDrawerHtml,
  renderCascadeAndLadderHtml,
  renderTallerArtifactsCatalogHtml,
  renderStpLexiconExplorerHtml,
  renderStpLexiconResultsRowsHtml,
  verifyLock8PredicativeAndNegation,
  validateQuoteBalancePda,
  detectLlmMetatextLeak,
  validateAllEightLocksPda,
  CANONICAL_5_OT_TRANSLATION_WAVES,
  FIELD_WORKSHOP_STP_LEXICON,
  KEY_TERMS_GLOSSARY,
  UNCERTAINTY_QUEUE_60,
  EXTERNAL_AUDIT_8_LOCKS,
  TIER3A_CONTINUUMS,
  hydrateFieldWorkshopData,
  computeSisterWorksCascade,
  selectTopEntropyVerseQueue,
  applySuggestedImprovement,
} from "./mejorar.js";
import {
  CROSS_WORK_BRIDGE_TABLE,
  projectCrossWorkCoordinate,
} from "../mostrador.js";
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

test("celf250_elicitation_seed_payload_zero_audio_bytes", () => {
  const seed = buildElicitationSeedPayload({
    lang: "kgv",
    rung: "Rung1SwadeshAndNsm65",
    rank: 1,
    verseId: "GEN.1.1",
    strongIds: ["H0430", "H0776"],
    responseText: "Kalamang boin allpa",
  });
  assert.equal(seed.audio_bytes, 0);
  assert.equal(
    seed.payloadLine,
    "EKOVOZ_SEED250_PAYLOAD|kgv|Rung1SwadeshAndNsm65|1|GEN.1.1|H0430,H0776|Kalamang boin allpa",
  );
  assert.match(seed.tomlBlock, /\[\[elicitation_seed_250\]\]/);
  assert.match(seed.tomlBlock, /audio_bytes = 0/);

  const drawerHtml = renderImproveDrawerHtml({
    lang: "kgv",
    ref: "GEN.1.1",
    strongId: "H0430",
    currentVerseText: "Kalamang boin allpa",
    elicitationRank: 1,
  });
  assert.match(drawerHtml, /data-celf250-ladder="true"/);
  assert.match(drawerHtml, /EKOVOZ_SEED250_PAYLOAD\|kgv/);
});

test("renders_cascade_preview_and_6_taller_cc0_artifacts_without_raw_i18n_keys", () => {
  const drawerHtml = renderImproveDrawerHtml({
    lang: "stp",
    ref: "ROM.1.16",
    strongId: "G1411",
    currentVerseText: "Jich poder de Dios",
  });
  assert.equal(
    />improve\.[a-z0-9_.]+</i.test(drawerHtml),
    false,
    "Improve drawer must never leak raw improve.* i18n keys into visible labels"
  );
  const cascadeHtml = renderCascadeAndLadderHtml({ lang: "stp", currentRef: "ROM.1.16", strongId: "G1411", level: "L3" });
  assert.match(cascadeHtml, /data-cascade-level="L3"/);
  assert.match(cascadeHtml, /data-ladder-ref="GEN\.1\.1"/);
  const tallerHtml = renderTallerArtifactsCatalogHtml("stp");
  assert.match(tallerHtml, /01_diccionario_strong_es_glosa\.tsv/);
  assert.match(tallerHtml, /06_escalera_elicitacion_250_versiculos\.tsv/);
});

test("patch_and_seed_include_eco_patch_json_hash_and_accept_osis_and_object_lang", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const patch = buildPatchPayload({
    kind: "verse",
    lang: "stp",
    level: "L4",
    ref: "ROM.1.16",
    strongId: "G1411",
    oldSurface: "poder",
    newSurface: "fuerza viva",
  });
  assert.ok(patch.filename.endsWith(".eco.patch.json"));
  assert.equal(patch.contentHash.length, 64);
  assert.equal(patch.payload.content_hash, patch.contentHash);
  const parsedJson = JSON.parse(patch.json);
  assert.equal(parsedJson.schema, "ekovoz.eco.patch.v1");
  assert.equal(parsedJson.ref, "ROM.1.16");

  // 3B++: Calling with { osis, currentSurface } (as mostrador.js does) preserves ROM.1.16
  const romHtml = renderImproveDrawerHtml({
    lang: "stp",
    osis: "ROM.1.16",
    currentSurface: "Porque no me avergüenzo del evangelio",
  });
  assert.match(romHtml, /data-ref="ROM\.1\.16"/);
  assert.doesNotMatch(romHtml, /data-ref="GEN\.1\.1"/);

  // Calling renderTallerArtifactsCatalogHtml({ lang: "stp" }) must never produce [object Object]
  const tallerFromObj = renderTallerArtifactsCatalogHtml({ lang: "stp" });
  assert.doesNotMatch(tallerFromObj, /\[object Object\]/);
  assert.match(tallerFromObj, /obras\/biblia\/taller\/stp\//);

  // 4B++: Full 250-rung ladder integration
  const ladder250 = JSON.parse(
    fs.readFileSync(path.join(webDir, "data", "elicitation_ladder_250.json"), "utf8"),
  );
  const cascade250 = renderCascadeAndLadderHtml({
    ladderItems: ladder250,
    lang: "stp",
    osis: "ROM.1.16",
    level: "L3",
    limit: 30,
  });
  assert.match(cascade250, /data-celf-total="250"/);
  assert.match(cascade250, /data-ladder-ref="GEN\.3\.1"/);
  assert.match(cascade250, /data-celf-rung-filter="Rung2MorphosyntaxAndTamValence"/);
  assert.match(cascade250, /id="btnNextHighEntropyVerse"/);

  const lockPass = verifyLock8PredicativeAndNegation({
    oldSurface: "No tendrás dioses ajenos",
    newSurface: "No adorarás ídolos ajenos",
  });
  assert.equal(lockPass.passed, true);
  assert.equal(lockPass.status, "PASS");

  const lockVeto = verifyLock8PredicativeAndNegation({
    oldSurface: "No tendrás dioses ajenos",
    newSurface: "Tendrás dioses ajenos",
  });
  assert.equal(lockVeto.passed, false);
  assert.equal(lockVeto.status, "VETO_NEGATION_FLIP");

  const queue = selectTopEntropyVerseQueue(ladder250, "GEN.1.1", 4);
  assert.equal(queue.length, 4);
  assert.notEqual(queue[0].ref, "GEN.1.1");
  assert.ok(queue[0].shannon_entropy > 1.0);

  const mejorarSrc = fs.readFileSync(path.join(webDir, "mostrador", "mejorar.js"), "utf8");
  assert.equal(/min-height:\s*(?:36|40|42|44)px/.test(mejorarSrc), false, "DEB-DOM-09: zero sub-48px tap targets in mejorar.js");
});

test("d5_b_plus_pda_quote_balance_llm_metatext_leak_all_8_locks_sister_cascade_and_5_ot_waves", () => {
  // 1. PDA Nested Quote Balance («…‹…›…» and “…‘…’…”)
  assert.equal(validateQuoteBalancePda("Dijo Jesús: «Escrito está: ‹No sólo de pan vivirá el hombre›».").passed, true);
  assert.equal(validateQuoteBalancePda("Dijo Jesús: «Escrito está: ‹No sólo de pan».").passed, false);
  assert.equal(validateQuoteBalancePda("Ñi’ook verdadero (apóstrofo intrapalabra)").passed, true);

  // 2. LLM Meta-text leak
  assert.equal(detectLlmMetatextLeak("Aquí tienes la traducción: En el principio").passed, false);
  assert.equal(detectLlmMetatextLeak("En el principio creó Dios los cielos").passed, true);

  // 3. Full 8-Lock deterministic verifier (P1..P8)
  const reportOk = validateAllEightLocksPda({
    oldSurface: "En los 7 días dijo Moisés: «No temáis».",
    newSurface: "Durante los 7 días declaró Moisés: «No tengan temor».",
    expectedProperNouns: ["Moisés"],
  });
  assert.equal(reportOk.passed, true);
  assert.equal(reportOk.status, "PASS_8_LOCKS");
  assert.equal(reportOk.locks.length, 8);

  const reportFailP6 = validateAllEightLocksPda({
    oldSurface: "Dijo Moisés: «No temáis».",
    newSurface: "Dijo Moisés: «No temáis.",
  });
  assert.equal(reportFailP6.passed, false);
  assert.equal(reportFailP6.status, "VETO_P6");

  // 4. Sister-Works Cascade & 5 OT Waves
  const cascade = computeSisterWorksCascade({ strongId: "H0430", ref: "GEN.1.1", level: "L5" });
  assert.equal(cascade.sisterWorks.length, 3);
  assert.equal(CANONICAL_5_OT_TRANSLATION_WAVES.length, 5);
});

test("d6_r_plus_hydrates_field_workshop_stp_artifact_and_enforces_zero_object_freeze", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const fwPath = path.join(webDir, "data", "field_workshop_stp.json");
  if (fs.existsSync(fwPath)) {
    const fwJson = JSON.parse(fs.readFileSync(fwPath, "utf8"));
    hydrateFieldWorkshopData(fwJson);
    assert.ok(FIELD_WORKSHOP_STP_LEXICON.length >= 600, `Expected >= 600 stp lexicon entries, got ${FIELD_WORKSHOP_STP_LEXICON.length}`);
    assert.equal(CANONICAL_5_OT_TRANSLATION_WAVES.length, 5);
  }
  const mejorarSrc = fs.readFileSync(path.join(webDir, "mostrador", "mejorar.js"), "utf8");
  assert.equal(mejorarSrc.includes("Object.freeze("), false, "D6-R+: zero Object.freeze in mejorar.js");
});

test("D4-E+ and D7-E+: cross-work projection matrix and 1-tap applySuggestedImprovement", () => {
  assert.equal(CROSS_WORK_BRIDGE_TABLE.beatitudesToBible.length, 12, "Expected 12 beatitudes in CROSS_WORK_BRIDGE_TABLE");

  const pFelices = projectCrossWorkCoordinate("felices", "biblia", {
    plateIndex: 9,
  });
  assert.equal(pFelices.book, "MAT");
  assert.equal(pFelices.chapter, 5);
  assert.equal(pFelices.verse, 6);

  const pBibliaToFelices = projectCrossWorkCoordinate("biblia", "felices", {
    book: "MAT",
    chapter: 5,
    verse: 6,
  });
  assert.equal(pBibliaToFelices.plateIndex, 9);

  const drawerHtml = renderImproveDrawerHtml({
    lang: "stp",
    osis: "ROM.1.16",
    currentSurface: "Porque no me avergüenzo del evangelio",
  });
  assert.match(drawerHtml, /id="btnApplySuggestedImprovement"/);
  assert.match(drawerHtml, /class="uls-chip apply-improvement"/);
  assert.match(drawerHtml, /data-apply-improvement="true"/);

  const oldInput = { value: "" };
  const newInput = { value: "" };
  const noteInput = { value: "" };
  const btn = {
    attrs: {
      "data-proposed-surface": "Porque no me avergüenzo del evangelio (revisión comunitaria validada)",
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
  };
  let refreshed = 0;
  const applied = applySuggestedImprovement(
    {
      getElementById(id) {
        if (id === "improveOldSurfaceInput") return oldInput;
        if (id === "improveNewSurfaceInput") return newInput;
        if (id === "improveNoteInput") return noteInput;
        return null;
      },
    },
    btn,
    () => {
      refreshed += 1;
    }
  );
  assert.equal(applied.applied, true);
  assert.ok(newInput.value.includes("revisión comunitaria validada"));
  assert.equal(btn.getAttribute("data-applied"), "true");
  assert.equal(refreshed, 1);
});

test("D6-C+_empirical_strong_concordance_counts_and_sister_works_cascade_sync_without_hardcoded_ternary", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const fwPath = path.join(webDir, "data", "field_workshop_stp.json");
  if (fs.existsSync(fwPath)) {
    const fwJson = JSON.parse(fs.readFileSync(fwPath, "utf8"));
    hydrateFieldWorkshopData(fwJson);
  }
  const cElohim = computeSisterWorksCascade({ strongId: "H0430", ref: "GEN.1.1", level: "L2" });
  const cLogos = computeSisterWorksCascade({ strongId: "G3056", ref: "JHN.1.1", level: "L2" });
  const cBara = computeSisterWorksCascade({ strongId: "H1254", ref: "GEN.1.1", level: "L2" });
  const cDunamis = computeSisterWorksCascade({ strongId: "G1411", ref: "ROM.1.16", level: "L2" });

  assert.notEqual(
    cBara.sisterWorks[0].ConcordantOccurrences,
    cDunamis.sisterWorks[0].ConcordantOccurrences,
    "Different Strong IDs must produce distinct empirical concordance counts",
  );
  assert.notEqual(
    cElohim.sisterWorks[1].ConcordantOccurrences,
    cLogos.sisterWorks[1].ConcordantOccurrences,
  );

  const mejorarSrc = fs.readFileSync(path.join(webDir, "mostrador", "mejorar.js"), "utf8");
  assert.equal(
    mejorarSrc.includes('cleanStrong === "H0430" ? 2602'),
    false,
    "D6-C+: zero hardcoded ternary for ConcordantOccurrences in mejorar.js",
  );
});

test("D4-A+_dunning_g2_key_terms_glossary_vso_phrases_uncertainty_queue_60_external_audit_8_locks_and_tier3a_continuums", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const fwPath = path.join(webDir, "data", "field_workshop_stp.json");
  const ladderPath = path.join(webDir, "data", "elicitation_ladder_250.json");
  const fwJson = JSON.parse(fs.readFileSync(fwPath, "utf8"));
  const ladderJson = JSON.parse(fs.readFileSync(ladderPath, "utf8"));

  hydrateFieldWorkshopData(fwJson, ladderJson);
  assert.ok(KEY_TERMS_GLOSSARY.length >= 300, `Expected >= 300 Dunning G² key terms, got ${KEY_TERMS_GLOSSARY.length}`);
  assert.equal(UNCERTAINTY_QUEUE_60.length, 60);
  assert.equal(EXTERNAL_AUDIT_8_LOCKS.all_8_locks_passed, true);
  assert.ok(TIER3A_CONTINUUMS.length >= 5);

  const lexHtml = renderStpLexiconExplorerHtml({ query: "", activeWave: 0, limit: 12 });
  assert.match(lexHtml, /id="dunningKeyTermsGlossaryPanel"/);
  assert.match(lexHtml, /data-inject-surface="/);
  assert.match(lexHtml, /data-dunning-g2="/);
  assert.match(lexHtml, /data-vso-phrase="/);
  assert.match(lexHtml, /data-typology-rule="/);

  const cascadeHtml = renderCascadeAndLadderHtml({
    ladderItems: ladderJson,
    lang: "stp",
    osis: "GEN.1.1",
    strongId: "H0430",
    level: "L2",
  });
  assert.match(cascadeHtml, /id="externalAudit8LocksPanel"/);
  assert.match(cascadeHtml, /id="uncertaintyQueue60Panel"/);
  assert.match(cascadeHtml, /data-jump-osis="ACT\.5\.8"/);
  assert.match(cascadeHtml, /id="tier3aDialectContinuumPanel"/);
  assert.match(cascadeHtml, /data-floor-1-sentence="291"/);
});

test("R36_SLICE_111_field_workshop_census_and_editorial_graphics_hydrators_mount_without_duplicate_ids", async () => {
  const {
    renderFieldWorkshopCensus7164Html,
    renderEditorialGraphicsAndPrintSpecsCard,
    mountCardHtmlIntoHost,
  } = await import("./drawer_hydrators.js");

  const censusHtml = renderFieldWorkshopCensus7164Html(null, null, { book: "GEN", chapter: 1, verse: 1 });
  assert.match(censusHtml, /id="masterCensus7164InspectorCard"/);

  const graphicsHtml = renderEditorialGraphicsAndPrintSpecsCard({
    book: "GEN",
    chapter: 1,
    verse: 1,
    activeGen: 5,
    sauvolaK: 0.32,
  });
  assert.match(graphicsHtml, /id="editorialGraphicsPhotocopyPanel"/);

  const attrs = { id: "masterCensus7164InspectorCard" };
  const hostEl = {
    id: "masterCensus7164InspectorCard",
    innerHTML: "",
    getAttribute(k) {
      return attrs[k] ?? null;
    },
    setAttribute(k, v) {
      attrs[k] = String(v);
    },
  };
  mountCardHtmlIntoHost(hostEl, censusHtml);
  assert.equal(
    hostEl.innerHTML.includes('id="masterCensus7164InspectorCard"'),
    false,
    "mountCardHtmlIntoHost must unwrap outer matching id to prevent duplicate DOM IDs",
  );
  assert.equal(attrs["data-total-world-languages"], "7164");

  // D3-R38: renderCascadeAndLadderHtml defaults to includeWalCard=false and includeCensusCard=false (zero duplicate IDs across Subtabs 1/2/3)
  const cascadeNoDup = renderCascadeAndLadderHtml({ lang: "stp", currentRef: "GEN.1.1", strongId: "H0430", level: "L2" });
  assert.equal(
    cascadeNoDup.includes('id="crdtWalAndLockP2AuditCard"'),
    false,
    "D3-R38: renderCascadeAndLadderHtml must not inject duplicate #crdtWalAndLockP2AuditCard by default",
  );
  assert.equal(
    cascadeNoDup.includes('id="masterCensus7164InspectorCard"'),
    false,
    "D3-R38: renderCascadeAndLadderHtml must not inject duplicate #masterCensus7164InspectorCard by default",
  );
  const auditSubtabHtml = renderTallerArtifactsCatalogHtml({ lang: "stp", includeCensusCard: true });
  assert.equal((auditSubtabHtml.match(/id="crdtWalAndLockP2AuditCard"/g) || []).length, 1);
  assert.equal((auditSubtabHtml.match(/id="masterCensus7164InspectorCard"/g) || []).length, 1);
  // D4-R43 / DEB-R43-04: .eight-locks-pda-bar lives in Sub-tab 3 (audit / renderTallerArtifactsCatalogHtml), not in Sub-tab 1 (patch / renderImproveDrawerHtml default)
  const subtab1PatchHtml = renderImproveDrawerHtml({ lang: "stp", osis: "ROM.1.16", currentSurface: "Tet na tu' nii'ñ" });
  assert.equal(
    subtab1PatchHtml.includes('class="eight-locks-pda-bar"'),
    false,
    "D4-R43 / DEB-R43-04: Sub-tab 1 (patch) must not render .eight-locks-pda-bar by default",
  );
  assert.match(auditSubtabHtml, /class="eight-locks-pda-bar"[^>]*data-eight-locks-bar="true"/);
  for (const lockId of ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]) {
    assert.match(auditSubtabHtml, new RegExp(`data-lock-id="${lockId}"`), `Audit Sub-tab 3 must include lock pill ${lockId}`);
  }
});







