// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D1-R44 (1A) · D9-R44 (9A) | projection_contract.js]
// web/mostrador/projection_contract.js — Proyección pura del estado activo sobre el cromo pegajoso de las gavetas.
// Frontera de mutación ∂(C) = 0 respecto del controlador: sólo lee `state` y escribe nodos DOM ya existentes.
// ============================================================================

import { STORE_DOMAIN_OWNERS, VALID_ACTIVE_INTENTS, VALID_ACTIVE_MODALS } from "./state_store.js";

/**
 * Ciclo de vida declarativo por obra editorial (`D1-R11`, `D3-R12`).
 * Para pausar una obra como borrador interno, cambiar `"public"` a `"draft"`.
 */
export const WORK_LIFECYCLE = Object.freeze({
  biblia: "public",
  felices: "public",
  evangelios: "public",
});

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
    primary: "philologyRosettaStaticHost",
    collapsibles: Object.freeze([
      "rosettaCalibrationAuditDetails",
      "wfstAndScriptioContinuaHost",
      "diachronicSubstitutionsDetails",
      "bibleBranchAndTypologyPanel",
    ]),
    slotOrder: Object.freeze([
      "philologyRosettaStaticHost",
      "bibleAnalyticalThermometerPanel",
      "studyOrthographyAccordion",
      "diachronicSubstitutionsDetails",
      "studyTypologyAccordion",
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
  const activeWork = ["biblia", "felices", "evangelios"].includes(state.activeWork)
    ? state.activeWork
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
 * Projects declarative store attributes (surface mode, theme polarity, typography, stealth)
 * onto root/body with zero local state mutation.
 */
export function projectStoreAttributesToDom(state = {}, targetDoc) {
  if (!targetDoc) return false;
  const targets = [targetDoc.documentElement, targetDoc.body].filter(Boolean);
  const activeIntent = VALID_ACTIVE_INTENTS.includes(state.activeIntent)
    ? state.activeIntent
    : state.activeSheet === "field" || state.activeSheet === "improve"
      ? "workshop"
      : ["study", "print", "share"].includes(state.activeSheet)
        ? state.activeSheet
        : state.surfaceMode === "studio"
          ? "study"
          : "read";
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
  const activeWork = ["biblia", "felices", "evangelios"].includes(state.activeWork)
    ? state.activeWork
    : "biblia";
  const activeSheet = state.activeSheet ? String(state.activeSheet) : "";
  const mobileSheetOpen = Boolean(state.activeSheet && state.mobileSheetOpen === true);
  const storeDomains = Object.keys(STORE_DOMAIN_OWNERS).join(",");

  for (const el of targets) {
    if (typeof el.setAttribute === "function") {
      el.setAttribute("data-intent", activeIntent);
      el.removeAttribute?.("data-surface-mode");
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

