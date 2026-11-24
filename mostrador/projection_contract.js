// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D1-R44 (1A) · D9-R44 (9A) | projection_contract.js]
// web/mostrador/projection_contract.js — Proyección pura del estado activo sobre el cromo pegajoso de las gavetas.
// Frontera de mutación ∂(C) = 0 respecto del controlador: sólo lee `state` y escribe nodos DOM ya existentes.
// ============================================================================

import { STORE_DOMAIN_OWNERS, VALID_ACTIVE_INTENTS, VALID_ACTIVE_MODALS } from "./state_store.js";

/**
 * Manifiesto declarativo de ranuras por contexto `(sheet, subtab)` (`D1-R9` / `SLICE-R9-01`).
 * Impone máximo 1 unidad funcional primaria visible sobre el pliegue y ubica las secundarias en acordeones colapsables.
 */
export const SURFACE_SLOT_MANIFEST = Object.freeze({
  "study:words": Object.freeze({ primary: "leipzig14ColStratumAction", collapsibles: Object.freeze([]) }),
  "study:rosetta": Object.freeze({
    primary: "nsm65StratumCard",
    collapsibles: Object.freeze([
      "studyUbsComparatorHost",
      "studyOnomasticonExplorerHost",
      "realiaMetrologyStratumCard",
      "tskCrossRefsStratumCard",
      "studyFormulaicParallelsHost",
    ]),
  }),
  "study:calibrate": Object.freeze({
    primary: "philologyRosettaStaticHost",
    collapsibles: Object.freeze([
      "wfstAndScriptioContinuaHost",
      "diachronicSubstitutionsDetails",
      "bibleBranchAndTypologyPanel",
    ]),
  }),
  "print:doses": Object.freeze({
    primary: "mostradorDoseCards",
    collapsibles: Object.freeze(["bibleEditionsCatalogGrid"]),
  }),
  "print:imposition": Object.freeze({
    primary: "bibleKindleConfigurator",
    collapsibles: Object.freeze(["duplexAssistantPanel", "impositionBookletPreviewHost"]),
  }),
  "print:stationery": Object.freeze({
    primary: "stationeryCardPanel",
    collapsibles: Object.freeze(["photocopyResilienceUnifiedSection"]),
  }),
  "field:patch": Object.freeze({
    primary: "socraticElicitorContainer",
    collapsibles: Object.freeze(["stpLexiconExplorerHost"]),
  }),
  "field:ladder": Object.freeze({
    primary: "cascadeImpactPreviewList",
    collapsibles: Object.freeze([]),
  }),
  "field:audit": Object.freeze({
    primary: "externalAudit8LocksPanel",
    collapsibles: Object.freeze(["tallerArtifactsCatalog"]),
  }),
  "share:mesh": Object.freeze({
    primary: "vaultStorageManagerHost",
    collapsibles: Object.freeze(["offlinePacksCatalogPanel", "editorialFontPackVaultPanel"]),
  }),
  "share:pdf": Object.freeze({
    primary: "bibleOpticalQrStreamPanel",
    collapsibles: Object.freeze(["opticalReceiverRxPanel"]),
  }),
  "share:graphics": Object.freeze({
    primary: "shareOpenGraphCardPanel",
    collapsibles: Object.freeze(["shareAuthenticityUnifiedCard"]),
  }),
});

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

