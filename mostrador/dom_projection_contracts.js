// ============================================================================
// web/mostrador/dom_projection_contracts.js — VPL DOM Scope & Triple Closure
// Extracted from data_layer.js (SLICE-V2R-04 · D1-A+ · ∂(C)=0 · < 350 LOC)
// ============================================================================

/**
 * Contratos de alcance VPL (`scopeRoot`) para anclas estáticas del Mostrador (`D1-B++` / `GOLD-647`):
 * Cada selector debe existir físicamente en `web/index.html` y ser descendiente estricto de `scopeRoot`.
 */
export const MOSTRADOR_DOM_SCOPE_CONTRACTS = [
  { id: "rosettaSearchInput", intent: "study", selector: "#rosettaSearchInput", scopeRoot: "#bibleEasyDrawerPanel" },
  { id: "rosettaExplorerResultsRows", intent: "study", selector: "#rosettaExplorerResultsRows", scopeRoot: "#bibleEasyDrawerPanel" },
  { id: "stpLexiconSearchInput", intent: "workshop", selector: "#stpLexiconSearchInput", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "stpLexiconResultsRows", intent: "workshop", selector: "#stpLexiconResultsRows", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "dunningKeyTermsGlossaryPanel", intent: "workshop", selector: "#dunningKeyTermsGlossaryPanel", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "externalAudit8LocksPanel", intent: "workshop", selector: "#externalAudit8LocksPanel", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "uncertaintyQueue60Panel", intent: "workshop", selector: "#uncertaintyQueue60Panel", scopeRoot: "#bibleFieldWorkshopSheet" },
  { id: "tier3aDialectContinuumPanel", intent: "workshop", selector: "#tier3aDialectContinuumPanel", scopeRoot: "#bibleFieldWorkshopSheet" },
];

/**
 * Esquema declarativo de Triple Clausura de Proveniencia (`D1-A+` / `D1-B++`..`D4-B++` / `ARB-EKOVOZ-61` / `GOLD-647`):
 * Asocia cada uno de los 8 artefactos compilados por `xtask build-web-data` con sus claves requeridas y los
 * selectores DOM donde deben proyectarse en la superficie activa (0 banderas `allowDynamicInCorpus`).
 */
export const ARTIFACT_PROJECTION_SCHEMA = [
  {
    intent: "study",
    artifact: "web/data/pericopes_and_glosses.json",
    requiredKeys: [
      "chapter_pericopes",
      "cultural_glosses",
      "evangelios_macro_threads",
      "felices_12_dichas",
      "felices_28_plates",
      "life_trails",
      "masoretic_and_gospel_pericopes",
    ],
    targetSelectors: ["#bibleEasyDrawer", "#felicesSocraticWonderCard", "#bibleChapterPericopesRibbon"],
    domSlots: ["#bibleEasyDrawer", "#felicesSocraticWonderCard", "#bibleChapterPericopesRibbon"],
  },
  {
    intent: "workshop",
    artifact: "web/data/elicitation_ladder_250.json",
    requiredKeys: [
      "estimated_native_speaker_hours",
      "floor_1_sentence_spec",
      "items",
      "reference_tier1",
      "single_sentence_unlocked_floor",
      "tier3a_continuums",
      "total_sentences",
    ],
    targetSelectors: ["#bibleFieldWorkshopSheet", "#tier3aDialectContinuumPanel"],
    domSlots: ["#bibleFieldWorkshopSheet", "#tier3aDialectContinuumPanel"],
  },
  {
    intent: "workshop",
    artifact: "web/data/field_workshop_stp.json",
    requiredKeys: [
      "canonical_5_ot_translation_waves",
      "external_audit_8_locks",
      "key_terms_glossary",
      "sister_works_cascade_sync",
      "stp_ot_lexicon_600",
      "stp_vso_classifier_phrase",
      "strong_concordance_counts",
      "taller_cc0_artifacts",
      "top_uncertainty_queue",
      "typology_rule",
    ],
    targetSelectors: [
      "#stpLexiconSearchInput",
      "#stpLexiconResultsRows",
      "#dunningKeyTermsGlossaryPanel",
      "#uncertaintyQueue60Panel",
      "#externalAudit8LocksPanel",
    ],
    domSlots: [
      "#stpLexiconSearchInput",
      "#stpLexiconResultsRows",
      "#dunningKeyTermsGlossaryPanel",
      "#uncertaintyQueue60Panel",
      "#externalAudit8LocksPanel",
    ],
  },
  {
    intent: "read",
    artifact: "web/data/book_names/es.json",
    requiredKeys: ["books", "lang", "name_source", "nsm_subtitle"],
    targetSelectors: ["#bibleSelectBook", "#btnOpenCompass", "#bibleCoordinateCompassGrid"],
    domSlots: ["#bibleSelectBook", "#btnOpenCompass", "#bibleCoordinateCompassGrid"],
  },
  {
    intent: "print",
    artifact: "web/data/editorial_profiles.json",
    requiredKeys: [
      "branch_profiles_12",
      "canonical_80_blocks_catalog",
      "canonical_9_plus_2_editions",
      "canonical_9_toml_profiles",
      "pocket_refuge_4_sheets_spec",
      "print_profiles_14",
      "typology_profiles_16",
    ],
    targetSelectors: ["#bibleOrthographyPills", "#biblePrintEditionsSheet"],
    domSlots: ["#bibleOrthographyPills", "#biblePrintEditionsSheet"],
  },
  {
    intent: "study",
    artifact: "web/shards/philology_rosetta_index.json",
    requiredKeys: [
      "canonical_metrology_units",
      "canonical_tsk_echoes",
      "consonantal_root_families",
      "empirical_hg_pairs_total",
      "ketiv_qere_residuals",
      "lxx_mt_cognate_bridge",
      "strong_lexicon_seed_total",
      "verse_specific_tsk_echoes",
      "versification_eng_org",
    ],
    targetSelectors: ["#rosettaSearchInput", "#rosettaExplorerResultsRows", "#bibleEasyDrawer"],
    domSlots: ["#rosettaSearchInput", "#rosettaExplorerResultsRows", "#bibleEasyDrawer"],
  },
  {
    intent: "study",
    artifact: "web/data/diachronic_register_es.json",
    requiredKeys: [
      "book_vectors_66",
      "corpus_summary",
      "intergenerational_core_rules",
      "register_audit_baseline",
      "tier1_archaic_lexicon",
      "tier2_morphological_rules",
      "tier3_postverbal_enclitics",
      "total_verses_audited",
    ],
    targetSelectors: ["#bibleAnalyticalThermometerPanel", "#diachronicSubstitutionsDetails"],
    domSlots: ["#bibleAnalyticalThermometerPanel", "#diachronicSubstitutionsDetails"],
  },
  {
    intent: "share",
    artifact: "web/wasm/wasm_manifest.json",
    requiredKeys: ["modules"],
    targetSelectors: ["#editorialAuditStatusPanel", "#bibleOpticalQrStreamPanel"],
    domSlots: ["#editorialAuditStatusPanel", "#bibleOpticalQrStreamPanel"],
  },
  {
    intent: "study",
    artifact: "web/data/annotation_index_report.json",
    requiredKeys: [
      "index_sha256",
      "ratios",
      "residuals_by_kind",
      "residuals_sha256",
      "sources",
      "thresholds",
      "totals",
    ],
    targetSelectors: ["#bibleAnalyticalThermometerPanel", "#wfstAndScriptioContinuaHost"],
    domSlots: ["#bibleAnalyticalThermometerPanel", "#wfstAndScriptioContinuaHost"],
  },
  {
    intent: "study",
    artifact: "web/data/blind_calibration_report.json",
    requiredKeys: [
      "book_usfm",
      "char_f2",
      "chrf_plus_plus",
      "lang_code",
      "length_ratio_gale_church",
      "macro_family",
      "mattr_50",
      "passes_release_gate",
      "word_f2",
    ],
    targetSelectors: ["#bibleAnalyticalThermometerPanel", "#wfstAndScriptioContinuaHost"],
    domSlots: ["#bibleAnalyticalThermometerPanel", "#wfstAndScriptioContinuaHost"],
  },
  {
    intent: "read",
    artifact: "web/data/catalog.json",
    requiredKeys: [
      "book_order",
      "languages",
      "verse_counts",
      "ekpack_languages_21",
      "workshop_langs",
      "tier3_portion_languages",
    ],
    targetSelectors: ["#bibleSelectBook", "#bibleSelectLang"],
    domSlots: ["#bibleSelectBook", "#bibleSelectLang"],
  },
  {
    intent: "share",
    artifact: "web/data/master_census_summary.json",
    requiredKeys: [
      "canonical_books",
      "canonical_chapters",
      "canonical_verses",
      "canonical_blocks",
      "macro_regions_12",
      "stp_ledger_summary",
      "total_living_languages",
    ],
    targetSelectors: ["#bibleShareAndAuditSheet", "#editorialAuditStatusPanel"],
    domSlots: ["#bibleShareAndAuditSheet", "#editorialAuditStatusPanel"],
  },
  {
    intent: "share",
    artifact: "web/data/offline_packs_catalog.json",
    requiredKeys: [
      "available_pack_langs",
      "pack_mounts",
      "packs",
    ],
    targetSelectors: ["#bibleShareAndAuditSheet", "#offlinePacksCatalogPanel"],
    domSlots: ["#bibleShareAndAuditSheet", "#offlinePacksCatalogPanel"],
  },
  {
    intent: "share",
    artifact: "web/data/fonts_zst_manifest.json",
    requiredKeys: [
      "bundleBytes",
      "codec",
      "fonts",
      "mount",
    ],
    targetSelectors: ["#bibleShareAndAuditSheet", "#tanda-offline-font-notice"],
    domSlots: ["#bibleShareAndAuditSheet", "#tanda-offline-font-notice"],
  },
];

/**
 * Verifica mediante autómata de pila VPL (Alur & Madhusudan, JACM 2009 · `D1-B++` · `GOLD-647`)
 * que cada selector en `bindings` exista físicamente en `indexHtmlContent` y esté contenido
 * jerárquicamente dentro de su `scopeRoot` (`forall b, b.scopeRoot in Anc(b.selector)`).
 */
export function verifyVplDomScopeContainment(
  indexHtmlContent = "",
  bindings = MOSTRADOR_DOM_SCOPE_CONTRACTS,
) {
  const html = String(indexHtmlContent || "");
  const stack = [];
  const ancestorMap = new Map();
  const tagRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g;
  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);

  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1].toLowerCase();
    const attrs = match[2] || "";
    const isClosing = fullMatch.startsWith("</");
    const isSelfClosing = fullMatch.endsWith("/>") || voidTags.has(tagName);

    if (isClosing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tagName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    const elemId = idMatch ? `#${idMatch[1].trim()}` : null;
    if (elemId) {
      const ancestors = stack.filter((s) => s.id).map((s) => s.id);
      ancestorMap.set(elemId, ancestors);
    }

    if (!isSelfClosing) {
      stack.push({ tag: tagName, id: elemId });
    }
  }

  const violations = [];
  for (const b of bindings || []) {
    const selector = String(b?.selector || "").trim();
    const scopeRoot = String(b?.scopeRoot || "document").trim();
    if (!selector.startsWith("#")) continue;
    if (!ancestorMap.has(selector)) {
      violations.push({ selector, scopeRoot, reason: "missing_in_html" });
      continue;
    }
    if (scopeRoot && scopeRoot !== "document" && scopeRoot.startsWith("#")) {
      const ancestors = ancestorMap.get(selector) || [];
      if (!ancestors.includes(scopeRoot)) {
        violations.push({
          selector,
          scopeRoot,
          ancestors,
          reason: "scope_root_not_ancestor",
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    totalChecked: Array.isArray(bindings) ? bindings.length : 0,
  };
}

/**
 * Verifica algebraicamente la Triple Clausura de Proveniencia `N[X] \ {0}` (`D1-A+` / `D1-B++`):
 * 1. Todo selector `#id` en `domBindings`, `MOSTRADOR_DOM_SCOPE_CONTRACTS` y `ARTIFACT_PROJECTION_SCHEMA`
 *    existe físicamente en `htmlSource` (0 exenciones dinámicas).
 * 2. Toda clave en `requiredKeys` de `ARTIFACT_PROJECTION_SCHEMA` es consumida en `controllerCorpus`.
 */
export function verifyArtifactProjectionClosure({
  htmlSource = "",
  domBindings = [],
  controllerCorpus = "",
} = {}) {
  const html = String(htmlSource || "");
  const corpus = String(controllerCorpus || "");
  const missingDomIds = [];
  const checkedSelectors = new Set();

  const checkSelector = (sel) => {
    const clean = String(sel || "").trim();
    if (!clean.startsWith("#") || checkedSelectors.has(clean)) return;
    checkedSelectors.add(clean);
    const id = clean.slice(1);
    const inHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    if (!inHtml) {
      missingDomIds.push(clean);
    }
  };

  if (Array.isArray(domBindings)) {
    for (const b of domBindings) {
      if (typeof b === "string") checkSelector(b);
      else if (b && b.selector) checkSelector(b.selector);
    }
  } else if (domBindings && typeof domBindings === "object") {
    for (const sel of Object.keys(domBindings)) {
      checkSelector(sel);
    }
  }

  for (const sc of MOSTRADOR_DOM_SCOPE_CONTRACTS) {
    checkSelector(sc.selector);
  }

  for (const entry of ARTIFACT_PROJECTION_SCHEMA) {
    for (const sel of entry.targetSelectors || []) {
      checkSelector(sel);
    }
  }

  const vplScope = verifyVplDomScopeContainment(html, MOSTRADOR_DOM_SCOPE_CONTRACTS);

  const unprojectedKeys = [];
  for (const entry of ARTIFACT_PROJECTION_SCHEMA) {
    for (const key of entry.requiredKeys || []) {
      if (!corpus.includes(key)) {
        unprojectedKeys.push(`${entry.artifact}:${key}`);
      }
    }
  }

  return {
    ok: missingDomIds.length === 0 && unprojectedKeys.length === 0 && vplScope.ok,
    missingDomIds,
    unprojectedKeys,
    scopeViolations: vplScope.violations,
  };
}

export const SINGLE_OWNER_CAPABILITY_CONTRACTS = Object.freeze({
  print_action_ribbon: {
    canonicalOwner: "#btnOpenPrintEditionsSheet",
    forbiddenDuplicateSelectors: ["#btnStageRibbonShareOffline", "#printFirstStageRibbon"],
    maxPrimaryCtas: 1,
    zeroEmptyVisibleHosts: true,
  },
  braille_b70_export: {
    canonicalOwner: "#btnQuickBrailleB70",
    forbiddenDuplicateSelectors: ["#btnDuplicateBrailleB70"],
    maxPrimaryCtas: 1,
  },
  authenticity_verification: {
    canonicalOwner: "#shareAuthenticityUnifiedCard",
    forbiddenDuplicateSelectors: ["#authenticityDuplicateBanner"],
    zeroEmptyVisibleHosts: true,
  },
  optical_qr_rx: {
    canonicalOwner: "#opticalReceiverRxPanel",
    forbiddenDuplicateSelectors: [],
    zeroEmptyVisibleHosts: true,
  },
  study_philology_roots: {
    canonicalOwner: "#bibleCalibrationAndAuditSheet",
    forbiddenDuplicateSelectors: [],
    requiredSurfaceIds: ["#wfstAndScriptioContinuaHost", "#bibleAnalyticalThermometerPanel"],
  },
  share_portability_research: {
    canonicalOwner: "#vaultStorageManagerHost",
    forbiddenDuplicateSelectors: [],
    requiredArtifacts: ["llms-full.txt", "llms.txt", "downloads_manifest.json"],
  },
});

export function auditSingleOwnerContract(htmlSource = "") {
  const html = String(htmlSource || "");
  const duplicateForbidden = [];
  for (const [key, spec] of Object.entries(SINGLE_OWNER_CAPABILITY_CONTRACTS)) {
    for (const sel of spec.forbiddenDuplicateSelectors || []) {
      const id = String(sel).replace(/^#/, "");
      if (id && (html.includes(`id="${id}"`) || html.includes(`id='${id}'`))) {
        duplicateForbidden.push({ contract: key, selector: sel });
      }
    }
  }
  return { ok: duplicateForbidden.length === 0, duplicateForbidden };
}

export const INTENT_CAPABILITY_CONTRACT = Object.freeze({
  exit_print: { maxHops: 2, sheet: "print", capabilities: ["dose1_sheets_around_verse", "print_unified_options_v3"] },
  exit_offline: { maxHops: 2, sheet: "share", capabilities: ["offline_quine_usb", "optical_qr_beam"] },
  language_picker: { maxHops: 1, sheet: null, capabilities: ["reading_language_selector", "polyglot_picker_window_36"] },
  study_context: { maxHops: 2, sheet: "study", capabilities: ["study_14col_drawer", "rosetta_strata"] },
  workshop_collaborator: { maxHops: 2, sheet: "field", capabilities: ["workshop_cascade", "census_7164"] },
  authenticity_cc0: { maxHops: 2, sheet: "share", capabilities: ["ed25519_provenance", "berne_15_3"] },
});

export function resolveCapabilityIntentLayer(intentKey = "read") {
  const key = String(intentKey || "read").trim().toLowerCase();
  if (key === "print") return INTENT_CAPABILITY_CONTRACT.exit_print;
  if (key === "share" || key === "offline") return INTENT_CAPABILITY_CONTRACT.exit_offline;
  if (key === "study") return INTENT_CAPABILITY_CONTRACT.study_context;
  if (key === "field" || key === "workshop" || key === "improve") return INTENT_CAPABILITY_CONTRACT.workshop_collaborator;
  return { maxHops: 1, sheet: null, capabilities: ["async_chapter_viewport", "epistemic_seal_badge"] };
}
