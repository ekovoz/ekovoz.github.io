// ============================================================================
// web/mostrador/drawer_hydrators.js — Fachada de Costura Limpia ∂(C)=0 para las 4 Gavetas Harel
// Decisiones D1-R41, D3-R41, D4-R41, D8-R41 · Delega a drawer_study.js, drawer_print.js, drawer_workshop.js, drawer_share.js
// ============================================================================

import {
  resolveRegionalPrintDefaults,
  simulateFifthGenPhotocopySauvolaBilateral,
} from "./dosis.js";
import {
  HAREL_PRINT_SUBTABS,
  formatPhotocopySimBadgeText as formatPhotocopySimBadgeTextImpl,
  hydratePrintDrawerPanelsInDrawer as hydratePrintDrawerPanelsInDrawerImpl,
  renderEditorialGraphicsAndPrintSpecsCard as renderEditorialGraphicsAndPrintSpecsCardImpl,
  renderPhotocopyResilienceAndSocialCardHtml,
  renderPrintDrawerPanelsSyncInDrawer as renderPrintDrawerPanelsSyncInDrawerImpl,
  simulateKanungoSauvolaGeneration,
} from "./drawer_print.js";
import {
  HAREL_DOSIS_SUBTABS,
  applyStaticChromeTranslations as applyStaticChromeTranslationsImpl,
  hydrateShareAndAuditDrawerPanel as hydrateShareAndAuditDrawerPanelImpl,
} from "./drawer_share.js";
import {
  HAREL_STUDY_SUBTABS,
  applyHarelSubtabSelection,
  hydrateBookNamesSourceBadge,
  hydrateLifeTrailsFromPericopesArtifact,
  hydrateStudyDrawerPanel as hydrateStudyDrawerPanelImpl,
  hydrateWasmManifestStatus,
  mountCardHtmlIntoHost,
  resolvePrimaryStrongForVerse,
  syncActiveStrongInStudyDrawer as syncActiveStrongInStudyDrawerImpl,
} from "./drawer_study.js";
import {
  HAREL_WORKSHOP_SUBTABS,
  bindImproveFormControlsInDrawer,
  hydrateImproveDrawerPanel as hydrateImproveDrawerPanelImpl,
  normalizeRootNotesEntries,
  renderCrdtWalAndLockP2AuditCardHtml,
  renderFieldWorkshopCensus7164Html as renderFieldWorkshopCensus7164HtmlImpl,
  renderMasterCensus7164CardHtml,
  resolveAtomicBatchForPassage,
} from "./drawer_workshop.js";
import {
  exportBundleAsFile,
  importBundleFromFile,
  listPacksFromIndexedDb,
  loadPackFromIndexedDb,
  savePackToIndexedDb,
} from "./offline_mesh.js";

export {
  HAREL_DOSIS_SUBTABS,
  HAREL_PRINT_SUBTABS,
  HAREL_STUDY_SUBTABS,
  HAREL_WORKSHOP_SUBTABS,
  applyHarelSubtabSelection,
  bindImproveFormControlsInDrawer,
  exportBundleAsFile,
  hydrateBookNamesSourceBadge,
  hydrateLifeTrailsFromPericopesArtifact,
  hydrateWasmManifestStatus,
  importBundleFromFile,
  listPacksFromIndexedDb,
  loadPackFromIndexedDb,
  mountCardHtmlIntoHost,
  normalizeRootNotesEntries,
  renderCrdtWalAndLockP2AuditCardHtml,
  renderMasterCensus7164CardHtml,
  renderPhotocopyResilienceAndSocialCardHtml,
  resolveAtomicBatchForPassage,
  resolvePrimaryStrongForVerse,
  resolveRegionalPrintDefaults,
  savePackToIndexedDb,
  simulateFifthGenPhotocopySauvolaBilateral,
  simulateKanungoSauvolaGeneration,
};

export function formatPhotocopySimBadgeText(simResult = null) {
  return formatPhotocopySimBadgeTextImpl(simResult);
}

export function renderFieldWorkshopCensus7164Html(
  censusSummary = null,
  stpLedgerSummary = null,
  activePassage = { book: "GEN", chapter: 1, verse: 1 },
) {
  return renderFieldWorkshopCensus7164HtmlImpl(censusSummary, stpLedgerSummary, activePassage);
}

export function renderEditorialGraphicsAndPrintSpecsCard(opts = {}) {
  return renderEditorialGraphicsAndPrintSpecsCardImpl(opts);
}

export function syncActiveStrongInStudyDrawer(strongId, ctx = {}) {
  return syncActiveStrongInStudyDrawerImpl(strongId, ctx);
}

export async function hydrateStudyDrawerPanel(ctx = {}) {
  return hydrateStudyDrawerPanelImpl(ctx);
}

export async function hydrateImproveDrawerPanel(ctx = {}) {
  return hydrateImproveDrawerPanelImpl(ctx);
}

export function renderPrintDrawerPanelsSyncInDrawer(ctx = {}) {
  return renderPrintDrawerPanelsSyncInDrawerImpl(ctx);
}

export async function hydratePrintDrawerPanelsInDrawer(ctx = {}) {
  return hydratePrintDrawerPanelsInDrawerImpl(ctx);
}

export function hydrateShareAndAuditDrawerPanel(ctx = {}) {
  return hydrateShareAndAuditDrawerPanelImpl(ctx);
}

export function applyStaticChromeTranslations(targetDoc, uiLocale = "es", state = null) {
  return applyStaticChromeTranslationsImpl(targetDoc, uiLocale, state);
}
