// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D1-R44 (1A) · D9-R44 (9A) | projection_contract.js]
// web/mostrador/projection_contract.js — Proyección pura del estado activo sobre el cromo pegajoso de las gavetas.
// Frontera de mutación ∂(C) = 0 respecto del controlador: sólo lee `state` y escribe nodos DOM ya existentes.
// ============================================================================

import {
  STORE_DOMAIN_OWNERS,
  VALID_ACTIVE_INTENTS,
  VALID_ACTIVE_MODALS,
  WORK_LIFECYCLE,
  isRegisteredWorkId,
} from "./state_store.js";

/**
 * Ciclo de vida declarativo por obra editorial (`D1-R11`, `ARB-EKOVOZ-R11`).
 *
 * REGLA PERMANENTE DE GOBERNANZA (INTENTIONAL MAINTAINER GATE — DO NOT AUTO-PROMOTE):
 * - Cualquier obra marcada como `"draft"` está DESHABILITADA deliberadamente por decisión del mantenedor.
 * - Al realizar futuras auditorías o planes para "exponer todas las funcionalidades del backend en la UI",
 *   las obras en `"draft"` NO deben tratarse como gaps huérfanos ni promoverse a `"public"` de forma automática;
 *   su acceso queda restringido explícitamente a `?preview=1` salvo autorización expresa de lanzamiento.
 */
export { WORK_LIFECYCLE, isRegisteredWorkId };

/**
 * Parsea `?preview=...` (`?preview=1`, `?preview=true`, `?preview=all` o lista CSV como `?preview=evangelios`).
 */
export function parsePreviewWorksParam(rawPreview = "", lifecycle = WORK_LIFECYCLE) {
  const clean = String(rawPreview || "").trim().toLowerCase();
  if (!clean || clean === "0" || clean === "false" || clean === "off") return [];
  if (clean === "1" || clean === "true" || clean === "all") {
    return Object.keys(lifecycle).filter((k) => lifecycle[k] !== "public");
  }
  const tokens = clean.split(/[\s,]+/).filter(Boolean);
  return Array.from(new Set(tokens.filter((t) => Object.prototype.hasOwnProperty.call(lifecycle, t))));
}

/**
 * Indica si `workId` es visible para el usuario o sesión actual (`public` o autorizado vía `previewWorks`).
 */
export function isWorkVisible(workId, stateOrPreview = null, lifecycle = WORK_LIFECYCLE) {
  const key = String(workId || "").trim().toLowerCase();
  const stage = lifecycle[key];
  if (!stage) return false;
  if (stage === "public") return true;
  const previewList = Array.isArray(stateOrPreview)
    ? stateOrPreview
    : Array.isArray(stateOrPreview?.previewWorks)
      ? stateOrPreview.previewWorks
      : parsePreviewWorksParam(stateOrPreview?.preview || stateOrPreview?.previewParam, lifecycle);
  return previewList.includes(key);
}

/**
 * Resuelve la obra efectiva garantizando degradación segura hacia `"biblia"` cuando una obra está en `draft` sin permiso.
 */
export function resolvePublicOrPreviewWork(requestedWork, stateOrPreview = null, lifecycle = WORK_LIFECYCLE) {
  const key = String(requestedWork || "biblia").trim().toLowerCase();
  return isWorkVisible(key, stateOrPreview, lifecycle) ? key : "biblia";
}

/**
 * Manifiesto declarativo de ranuras por contexto `(sheet, subtab)` (`D1-R9` / `SLICE-R9-01`).
 * Impone máximo 1 unidad funcional primaria visible sobre el pliegue y ubica las secundarias en acordeones colapsables.
 */
export const SURFACE_SLOT_MANIFEST = Object.freeze({
  "study:words": Object.freeze({
    primary: "leipzig14ColStratumAction",
    collapsibles: Object.freeze([]),
    slotOrder: Object.freeze(["leipzig14ColStratumAction"]),
  }),
  "study:rosetta": Object.freeze({
    primary: "nsm65StratumCard",
    collapsibles: Object.freeze([
      "studyUbsComparatorHost",
      "studyOnomasticonExplorerHost",
      "realiaMetrologyStratumCard",
      "tskCrossRefsStratumCard",
      "studyFormulaicParallelsHost",
    ]),
    slotOrder: Object.freeze([
      "nsm65StratumCard",
      "studyUbsAccordion",
      "studyOnomasticonAccordion",
      "studyRealiaAccordion",
      "studyTskFormulaicAccordion",
    ]),
  }),
  "study:calibrate": Object.freeze({
    primary: "bibleAnalyticalThermometerPanel",
    collapsibles: Object.freeze([
      "wfstAndScriptioContinuaHost",
      "rosettaCalibrationAuditDetails",
      "diachronicSubstitutionsDetails",
    ]),
    slotOrder: Object.freeze([
      "bibleAnalyticalThermometerPanel",
      "studyOrthographyAccordion",
      "philologyRosettaStaticHost",
      "diachronicSubstitutionsDetails",
    ]),
  }),
  "print:doses": Object.freeze({
    primary: "mostradorDoseCards",
    collapsibles: Object.freeze(["printFieldPdfsHost", "bibleEditionsCatalogGrid"]),
    slotOrder: Object.freeze(["mostradorDoseCards", "printFieldPdfsHost", "bibleEditionsCatalogGrid"]),
  }),
  "print:imposition": Object.freeze({
    primary: "bibleKindleConfigurator",
    collapsibles: Object.freeze(["printTypologyBridgeHost", "duplexAssistantPanel", "impositionBookletPreviewHost"]),
    slotOrder: Object.freeze(["bibleKindleConfigurator", "printTypologyBridgeHost", "duplexAssistantPanel", "impositionBookletPreviewHost"]),
  }),
  "print:stationery": Object.freeze({
    primary: "stationeryCardPanel",
    collapsibles: Object.freeze(["photocopyResilienceUnifiedSection"]),
    slotOrder: Object.freeze(["stationeryCardPanel", "photocopyResilienceUnifiedSection"]),
  }),
  "field:patch": Object.freeze({
    primary: "socraticElicitorContainer",
    collapsibles: Object.freeze(["stpLexiconExplorerHost"]),
    slotOrder: Object.freeze(["socraticElicitorContainer", "stpLexiconExplorerHost"]),
  }),
  "field:ladder": Object.freeze({
    primary: "cascadeImpactPreviewList",
    collapsibles: Object.freeze([]),
    slotOrder: Object.freeze(["cascadeImpactPreviewList"]),
  }),
  "field:audit": Object.freeze({
    primary: "externalAudit8LocksPanel",
    collapsibles: Object.freeze(["tallerArtifactsCatalog"]),
    slotOrder: Object.freeze(["externalAudit8LocksPanel", "tallerArtifactsCatalog"]),
  }),
  "share:mesh": Object.freeze({
    primary: "vaultStorageManagerHost",
    collapsibles: Object.freeze(["shareOfflinePacksDetails", "shareFontVaultDetails"]),
    slotOrder: Object.freeze(["vaultStorageManagerHost", "shareOfflinePacksDetails", "shareFontVaultDetails"]),
  }),
  "share:pdf": Object.freeze({
    primary: "bibleOpticalQrStreamPanel",
    collapsibles: Object.freeze(["opticalReceiverRxPanel"]),
    slotOrder: Object.freeze(["bibleOpticalQrStreamPanel", "opticalReceiverRxPanel"]),
  }),
  "share:graphics": Object.freeze({
    primary: "shareOpenGraphCardPanel",
    collapsibles: Object.freeze(["shareAuthenticityUnifiedCard"]),
    slotOrder: Object.freeze(["shareOpenGraphCardPanel", "shareAuthenticityUnifiedCard"]),
  }),
});

/**
 * Registro declarativo de adaptadores multi-obra escalable a N obras (`D11-R10`).
 * Define el modo de adaptacion de cada gaveta sin condicionales dispersos en 4 archivos.
 */
export const WORK_DRAWER_ADAPTERS = Object.freeze({
  biblia: Object.freeze({
    workId: "biblia",
    studyPriority: "verse-15col",
    printMode: "biblia-3-doses",
    workshopTarget: "chapter-verse",
    shareTarget: "passage-pack",
    llmsManifestPrefix: "llms/biblia",
  }),
  felices: Object.freeze({
    workId: "felices",
    studyPriority: "anchor-passage",
    printMode: "plate-and-booklet",
    workshopTarget: "plate-dicha",
    shareTarget: "plate-card",
    llmsManifestPrefix: "llms/felices",
  }),
  evangelios: Object.freeze({
    workId: "evangelios",
    studyPriority: "pericope-week",
    printMode: "weekly-booklet",
    workshopTarget: "liturgical-week",
    shareTarget: "weekly-card",
    llmsManifestPrefix: "llms/evangelios",
  }),
});

export function resolveWorkDrawerAdapter(state = {}) {
  const workId = WORK_DRAWER_ADAPTERS[state?.activeWork] ? state.activeWork : "biblia";
  return WORK_DRAWER_ADAPTERS[workId];
}

/**
 * Resuelve la etiqueta y coordenada bíblica ancla de la obra activa (`biblia`, `felices`, `evangelios`) (`D3-R9`).
 */
export function resolveActiveWorkDrawerContext(state = {}) {
  const activeWork = isRegisteredWorkId(state.activeWork)
    ? String(state.activeWork).trim().toLowerCase()
    : "biblia";
  const isEn = String(state.uiLocale || "en").trim().toLowerCase().startsWith("en");
  const book = String(state.book || (activeWork === "felices" ? "MAT" : "GEN")).toUpperCase();
  const chapter = Math.max(1, Number(state.chapter) || (activeWork === "felices" ? 5 : 1));
  const verse = Math.max(1, Number(state.verse) || 1);
  const anchorOsis = `${book} ${chapter}:${verse}`;
  if (activeWork === "felices") {
    const plateNum = Math.min(27, Math.max(1, Number(state.activePlateIndex) || 24));
    const workLabel = isEn
      ? `Beatitudes · Plate ${plateNum}/27`
      : `Los Felices · Lám. ${plateNum}/27`;
    return {
      activeWork,
      isSisterWork: true,
      plateNum,
      weekNum: null,
      anchorOsis,
      workLabel,
      pillText: `🎨 ${workLabel} (${anchorOsis})`,
      bannerText: isEn
        ? `${workLabel} · Biblical anchor: ${anchorOsis}`
        : `${workLabel} · Pasaje ancla en Biblia: ${anchorOsis}`,
    };
  }
  if (activeWork === "evangelios") {
    const weekNum = Math.min(
      52,
      Math.max(1, Number(String(state.evangeliosWeekId || "1").replace(/^\D+/g, "")) || 1),
    );
    const workLabel = isEn ? `Gospels · Week ${weekNum}/52` : `Evangelios · Sem. ${weekNum}/52`;
    return {
      activeWork,
      isSisterWork: true,
      plateNum: null,
      weekNum,
      anchorOsis,
      workLabel,
      pillText: `🌅 ${workLabel} (${anchorOsis})`,
      bannerText: isEn
        ? `${workLabel} · Biblical anchor: ${anchorOsis}`
        : `${workLabel} · Pasaje ancla en Biblia: ${anchorOsis}`,
    };
  }
  return {
    activeWork: "biblia",
    isSisterWork: false,
    plateNum: null,
    weekNum: null,
    anchorOsis,
    workLabel: isEn ? "Bible" : "Biblia",
    pillText: `📖 ${anchorOsis}`,
    bannerText: "",
  };
}

/**
 * Sincroniza `#stickyDrawerContextHeader` con la obra y pasaje activo (`D1-R44`, `D4-R5`, `D3-R9`).
 * Devuelve `true` si la barra quedó visible.
 */
export function syncStickyDrawerContextHeader(state = {}, getEl, targetDoc) {
  if (typeof getEl !== "function") return false;
  const header = getEl("stickyDrawerContextHeader", targetDoc);
  const visible = Boolean(state.activeSheet);
  const workCtx = resolveActiveWorkDrawerContext(state);
  if (header) {
    header.hidden = !visible;
    if (typeof header.setAttribute === "function") {
      header.setAttribute("data-active-sheet", visible ? String(state.activeSheet) : "");
      header.setAttribute("data-active-work", workCtx.activeWork);
    }
  }
  const versePill = getEl("stickyActiveVersePill", targetDoc);
  if (versePill) {
    versePill.textContent = workCtx.pillText;
  }
  const jumpBtn = getEl("btnStickyJumpToCanvas", targetDoc);
  if (jumpBtn) {
    jumpBtn.textContent = String(state.uiLocale || "en").toLowerCase().startsWith("es") ? "↑ Lienzo" : "↑ Canvas";
  }
  return visible;
}

/**
 * Resuelve la intención explícita de superficie sin depender de conmutadores globales ocultos (`2A'`).
 */
function resolveExplicitSurfaceIntent(state = {}) {
  if (VALID_ACTIVE_INTENTS.includes(state.activeIntent)) return state.activeIntent;
  if (state.activeSheet === "field" || state.activeSheet === "improve") return "workshop";
  if (["study", "print", "share"].includes(state.activeSheet)) return state.activeSheet;
  return state.surfaceMode === "studio" ? "study" : "read";
}

/**
 * Projects declarative store attributes (surface intent, theme polarity, typography, stealth)
 * onto root/body with zero local state mutation.
 */
export function projectStoreAttributesToDom(state = {}, targetDoc) {
  if (!targetDoc) return false;
  const targets = [targetDoc.documentElement, targetDoc.body].filter(Boolean);
  const activeIntent = resolveExplicitSurfaceIntent(state);
  const theme = ["light", "sepia", "dark"].includes(state.appearanceTheme) ? state.appearanceTheme : "light";
  const fontFamily = state.fontFamily === "sans" ? "sans" : "serif";
  const fontScale = Number.isFinite(Number(state.fontScale))
    ? Math.max(0.85, Math.min(1.5, Number(state.fontScale)))
    : 1.0;
  const stealth = Boolean(state.stealthMode);
  const hasValidModal = Array.isArray(VALID_ACTIVE_MODALS)
    ? VALID_ACTIVE_MODALS.includes(state.activeModal)
    : VALID_ACTIVE_MODALS.has(state.activeModal);
  const activeModal = state.activeModal && hasValidModal ? String(state.activeModal) : "";
  const activeWork = isRegisteredWorkId(state.activeWork)
    ? String(state.activeWork).trim().toLowerCase()
    : "biblia";
  const activeSheet = state.activeSheet ? String(state.activeSheet) : "";
  const mobileSheetOpen = Boolean(state.activeSheet && state.mobileSheetOpen === true);
  const storeDomains = Object.keys(STORE_DOMAIN_OWNERS).join(",");
  const surfacePlane = resolveSurfacePlane(state, targetDoc?.location?.search || "");

  for (const el of targets) {
    if (typeof el.setAttribute === "function") {
      el.setAttribute("data-intent", activeIntent);
      el.removeAttribute?.("data-surface-mode");
      el.setAttribute("data-surface-plane", surfacePlane);
      el.setAttribute("data-theme", theme);
      el.setAttribute("data-font-family", fontFamily);
      el.setAttribute("data-stealth-mode", stealth ? "true" : "false");
      el.setAttribute("data-active-work", activeWork);
      el.setAttribute("data-mobile-sheet-open", mobileSheetOpen ? "true" : "false");
      if (activeSheet) {
        el.setAttribute("data-active-sheet", activeSheet);
      } else if (typeof el.removeAttribute === "function") {
        el.removeAttribute("data-active-sheet");
      }
      if (activeModal) {
        el.setAttribute("data-active-modal", activeModal);
      } else if (typeof el.removeAttribute === "function") {
        el.removeAttribute("data-active-modal");
      }
      if (storeDomains) {
        el.setAttribute("data-store-domains", storeDomains);
      }
    }
    if (el.style && typeof el.style.setProperty === "function") {
      el.style.setProperty("--bible-font-scale", String(fontScale));
    }
  }
  return true;
}

/**
 * Jerarquía visual de cromo 98% impresor / 2% estudioso-traductor (`D4-R13`, `SLICE-R13-06`).
 * Todas las gavetas permanecen 100% accesibles en DOM; las de uso diario se enfatizan sobre las de taller.
 */
export const CHROME_DRAWER_PRIORITY = Object.freeze({
  print: "primary",
  share: "primary",
  study: "expert",
  field: "expert",
  improve: "expert",
});

export function resolveDrawerChromePriority(sheetKey = "") {
  const clean = String(sheetKey || "").trim().toLowerCase();
  return CHROME_DRAWER_PRIORITY[clean] || "expert";
}

/**
 * Contrato SSOT de sub-claves profundas por artefacto JSON y artefactos estáticos (`D1-HIG6`).
 */
export const DEEP_PROJECTION_SUBKEYS = Object.freeze({
  "annotation_index_report.json": Object.freeze([
    "totals.ketiv_tokens",
    "totals.nt_macula_tokens",
    "totals.nt_sr_tokens",
    "totals.nt_tagnt_spanish_tokens",
    "totals.tahot_qere_ketiv_rows",
    "totals.tr_supplement_tokens",
    "totals.versification_verses_nt",
    "totals.versification_verses_ot",
  ]),
  "blind_calibration_report.json": Object.freeze(["verses_evaluated"]),
  "diachronic_register_es.json": Object.freeze([
    "corpus_summary.eight_locks_all_passed",
    "corpus_summary.mean_eipen_l",
    "corpus_summary.mean_mattr_50",
    "corpus_summary.tier1_count",
    "corpus_summary.tier2_count",
    "corpus_summary.tier3_count",
  ]),
  "editorial_profiles.json": Object.freeze([
    "print_profiles_14[].raw_preview",
    "rust_domain_engines_telemetry.font_pool_bytes",
    "rust_domain_engines_telemetry.fountain_lt_probe_packets",
    "rust_domain_engines_telemetry.dropcap_typst_len",
    "rust_domain_engines_telemetry.layflat_typst_len",
  ]),
  "elicitation_ladder_250.json": Object.freeze([
    "items[].prompt_es",
    "items[].prompt_en",
    "items[].covered_nsm_primitives",
    "items[].covered_high_freq_strongs",
    "items[].covered_syntactic_frames",
    "items[].marginal_gain_bits",
  ]),
  "field_workshop_stp.json": Object.freeze([
    "stp_ot_lexicon_600[].en_gloss",
    "external_audit_8_locks.pda_unbalanced_count",
    "external_audit_8_locks.normalized_verses_count",
    "external_audit_8_locks.input_source",
    "patch_journal_lock_p2.error_reason",
    "root_notes_stp.verses_mutated_count",
    "root_notes_stp.updated_usfm_files_count",
  ]),
  "formulaic_index.json": Object.freeze(["templates[].parameterized_skeleton"]),
  "master_census_summary.json": Object.freeze([
    "stp_ledger_progress.completed_verses",
    "stp_ledger_progress.nt_human_verified_verses",
    "stp_ledger_progress.ot_workshop_scaffold_verses",
    "stp_ledger_progress.total_batches_planned",
  ]),
  "offline_packs_catalog.json": Object.freeze([
    "packs[].versificationTradition",
    "packs[].diachronicVariants",
    "packs[].bookEpistemicTiersLen",
    "packs[].merkleRootSha256",
    "packs[].contentDigestSha256",
  ]),
  "pericopes_and_glosses.json": Object.freeze([
    "life_trails[].anchor_refs",
    "life_trails[].icon_svg_id",
  ]),
  "static_assets": Object.freeze([
    "preview/0001.png",
    "preview/0006.png",
    "preview/0007.png",
    "preview/0008.png",
    "preview/0016.png",
    "preview/0018.png",
    "obras/biblia/packs/en/lector_offline_en.html",
    "obras/biblia/packs/es/lector_offline_es.html",
    "obras/biblia/packs/grc/lector_offline_grc.html",
    "obras/biblia/packs/he/lector_offline_he.html",
    "obras/biblia/packs/stp/lector_offline_stp.html",
  ]),
});

/**
 * Frontera declarativa de los 21 subcomandos de `ekovoz-cli`: web pública vs. infraestructura CI (`D1-HIG6`).
 */
export const CLI_BRIDGE_SURFACE_MAP = Object.freeze({
  Compile: Object.freeze({ kind: "web-live", surface: "print:doses" }),
  Pack: Object.freeze({ kind: "web-live", surface: "share:mesh" }),
  ApplyPatch: Object.freeze({ kind: "web-live", surface: "workshop:patch" }),
  AuditExternal: Object.freeze({ kind: "web-live", surface: "workshop:audit" }),
  VerifyPack: Object.freeze({ kind: "web-live", surface: "share:graphics" }),
  ModernizeAudit: Object.freeze({ kind: "web-live", surface: "workshop:audit" }),
  StealthPack: Object.freeze({ kind: "web-live", surface: "print:doses" }),
  ApplyCascade: Object.freeze({ kind: "web-live", surface: "workshop:ladder" }),
  Census: Object.freeze({ kind: "web-live", surface: "workshop:audit" }),
  ElicitSession: Object.freeze({ kind: "web-live", surface: "workshop:ladder" }),
  ExtractRosetta: Object.freeze({ kind: "web-live", surface: "study:calibrate" }),
  ExportTaller: Object.freeze({ kind: "web-live", surface: "workshop:audit" }),
  CldfMirror: Object.freeze({ kind: "web-live", surface: "workshop:audit" }),
  ModernizeRegister: Object.freeze({ kind: "web-live", surface: "workshop:audit" }),
  FetchSources: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
  BuildMatrix: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
  NewLang: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
  NewWork: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
  VerifyCanon: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
  CompleteBible: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
  SyncJsConstants: Object.freeze({ kind: "cli-ci-only", surface: "ci" }),
});

export function resolveCliSurfaceKind(commandName = "") {
  const key = String(commandName || "").trim();
  const hit = CLI_BRIDGE_SURFACE_MAP[key];
  return hit ? { command: key, ...hit } : { command: key, kind: "cli-ci-only", surface: "ci" };
}

/**
 * Contrato vinculante de revelación en 2 Capas (D1-HIG7 / ARB-EKOVOZ-140).
 * Capa 1: flujo esencial con 1 dueño por intención y 1 acción primaria visible.
 * Capa 2: 1 inspector técnico contextual por vista (`maxProdDetails = 18`).
 */
export const INTENT_LAYER_CONTRACT = Object.freeze({
  maxProdDetails: 18,
  requireInteractiveFlow: true,
  intents: Object.freeze({
    read: Object.freeze({ primaryOwner: "bibleVerseViewport", inspectorDrawer: "bibleOralPorticoBanner", singlePrimaryCta: true }),
    study: Object.freeze({ primaryOwner: "bibleEasyDrawerPanel", inspectorDrawer: "studyDeepCorpusMetricsDetails", singlePrimaryCta: true }),
    print: Object.freeze({ primaryOwner: "biblePrintEditionsSheet", inspectorDrawer: "printEditorialPreviewsDetails", singlePrimaryCta: true }),
    workshop: Object.freeze({ primaryOwner: "bibleFieldWorkshopSheet", inspectorDrawer: "tallerCc0DownloadsDetails", singlePrimaryCta: true }),
    share: Object.freeze({ primaryOwner: "bibleShareAndAuditSheet", inspectorDrawer: "shareProBovedaDossiersDetails", singlePrimaryCta: true }),
  }),
});

export function validateTwoLayerContract(detailsCount = 0, contract = INTENT_LAYER_CONTRACT) {
  const maxAllowed = Number(contract?.maxProdDetails) || 18;
  const count = Number(detailsCount) || 0;
  return { valid: count <= maxAllowed, detailsCount: count, maxProdDetails: maxAllowed };
}

/**
 * Contrato de Dueño Único por Concepto (`Plan HIG9 · D1-HIG9`):
 * Cada capacidad o dimensión de estado tiene un único propietario en DOM y Store,
 * separando Plano Editorial (lectura/impresión/uso humano) de Plano Técnico/I+D (opt-in).
 */
export const SINGLE_OWNER_CAPABILITY_MAP = Object.freeze({
  appLocale: Object.freeze({ owner: "#ulsTriggerBtn", storeKey: "uiLocale", plane: "editorial" }),
  corpusLang: Object.freeze({ owner: "#sovereignCorpusLangBtn", storeKey: "lang", plane: "editorial" }),
  register: Object.freeze({ owner: "#bibleRegisterSelector", storeKey: "register", plane: "editorial" }),
  paperFormat: Object.freeze({ owner: "#kindlePaperFormatSelector", storeKey: "paperFormat", plane: "editorial" }),
  editions16: Object.freeze({ owner: "#bibleEditionsCatalogGrid", storeKey: "edition", plane: "editorial" }),
  typology12x16: Object.freeze({ owner: "#bibleBranchAndTypologyPanel", storeKey: "activeTypologyId", plane: "editorial" }),
  brailleB70: Object.freeze({ owner: "#btnQuickBrailleB70", storeKey: "edition", plane: "editorial" }),
  quickPrintStage: Object.freeze({ owner: "#btnQuickPrintStage", storeKey: "activeIntent", plane: "editorial" }),
  technicalAuditPlane: Object.freeze({ owner: "#btnToggleTechnicalPlane", storeKey: "surfacePlane", plane: "technical" }),
  exitTechnicalPlanePill: Object.freeze({ owner: "#btnExitTechnicalPlanePill", storeKey: "surfacePlane", plane: "technical" }),
});

/**
 * Resuelve el plano de superficie activo (`editorial` por defecto, `technical` bajo `?mode=studio` o opt-in).
 */
export function resolveSurfacePlane(state = {}, search = "") {
  if (state?.surfacePlane === "technical") return "technical";
  if (state?.surfacePlane === "editorial") return "editorial";
  const rawSearch = String(search || state?.search || globalThis?.location?.search || "");
  if (rawSearch) {
    const params = new URLSearchParams(rawSearch.replace(/^\?/, ""));
    if (params.get("mode") === "studio") return "technical";
  }
  return "editorial";
}

export function isTechnicalPlaneEnabled(state = {}, search = "") {
  return resolveSurfacePlane(state, search) === "technical";
}


