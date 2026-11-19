// Fachada pública 100% compatible del Taller Comunitario L1-L5 (`D11-V2C`, ∂(C)=0, ΔCallSites=0).
// Orquesta la aplicación interactiva en el DOM y re-exporta los 8 candados PDA + renderizadores.

import {
  evaluateBetaDawidSkeneSprt,
  hydrateFormulaicParallelsIndex,
  propagateCascadeL1ToL5,
} from "./cascade_l1_l5.js";
import { validateAllEightLocksPda } from "./mejorar_locks_pda.js";

export {
  buildElicitationSeedPayload, buildPatchPayload, CANONICAL_5_OT_TRANSLATION_WAVES, computeSisterWorksCascade, computeWalSnapshotRollbackPreview, CRDT_WAL_SEMILATTICE, detectLlmMetatextLeak, EXTERNAL_AUDIT_8_LOCKS, FIELD_WORKSHOP_STP_LEXICON, foldCrdtWalSemilattice,
  hydrateFieldWorkshopData, KEY_TERMS_GLOSSARY, MASTER_CENSUS_SUMMARY, PATCH_JOURNAL_LOCK_P2,
  ROOT_NOTES_STP, selectTopEntropyVerseQueue, STP_LEDGER_SUMMARY, TIER3A_CONTINUUMS, UNCERTAINTY_QUEUE_60, validateAllEightLocksPda, validateQuoteBalancePda, verifyLock8PredicativeAndNegation
} from "./mejorar_locks_pda.js";
export {
  IMPROVE_I18N_FALLBACKS,
  IMPROVE_I18N_FALLBACKS_ES, renderCascadeAndLadderHtml, renderImproveDrawerHtml,
  renderStpDraftCheckHtml, renderStpLexiconExplorerHtml, renderStpLexiconResultsRowsHtml, renderTallerArtifactsCatalogHtml
} from "./mejorar_renderers.js";
export {
  evaluateBetaDawidSkeneSprt,
  hydrateFormulaicParallelsIndex,
  propagateCascadeL1ToL5,
};

/**
 * Aplica una propuesta de mejora en el formulario del Taller de Campo (`button.apply-improvement`, `D5-E+`),
 * actualizando el campo `#improveNewSurfaceInput`, recalculando el recibo SHA-256 y marcando confirmación visual.
 */
export function applySuggestedImprovement(targetDoc, buttonEl = null, onRefresh = null, extraPayload = {}) {
  const getEl = (id) =>
    targetDoc && typeof targetDoc.getElementById === "function"
      ? targetDoc.getElementById(id)
      : null;
  const newInput = getEl("improveNewSurfaceInput");
  const oldInput = getEl("improveOldSurfaceInput");
  const levelSel = getEl("improveLevelSelect");
  const noteInput = getEl("improveNoteInput");
  const proposedAttr =
    buttonEl && typeof buttonEl.getAttribute === "function"
      ? buttonEl.getAttribute("data-proposed-surface")
      : null;
  const isExplicitSuggestionChip =
    Boolean(buttonEl && buttonEl.id !== "btnApplySuggestedImprovement") &&
    Boolean(buttonEl?.getAttribute?.("data-inject-suggestion") === "true");
  const currentTyped = newInput ? String(newInput.value || "").trim() : "";
  if (newInput && proposedAttr && (!currentTyped || isExplicitSuggestionChip)) {
    newInput.value = proposedAttr;
  }
  if (buttonEl && typeof buttonEl.setAttribute === "function") {
    buttonEl.setAttribute("data-applied", "true");
    buttonEl.setAttribute("aria-pressed", "true");
  }
  const surfaceVal = String(
    extraPayload.proposedSurface ?? (newInput ? newInput.value : proposedAttr || ""),
  ).trim();
  const langVal = String(extraPayload.lang || buttonEl?.getAttribute?.("data-lang") || "stp")
    .trim()
    .toLowerCase();
  const levelVal = String(extraPayload.level || levelSel?.value || "L2")
    .trim()
    .toUpperCase();
  const refVal = String(extraPayload.ref || buttonEl?.getAttribute?.("data-ref") || "GEN.1.1")
    .trim()
    .toUpperCase();
  const strongVal = String(
    extraPayload.strongId || buttonEl?.getAttribute?.("data-strong-id") || "H0430",
  )
    .trim()
    .toUpperCase();
  const oldSurfaceVal = String(extraPayload.oldSurface ?? oldInput?.value ?? "");
  const noteVal = String(extraPayload.note ?? noteInput?.value ?? "");
  const cascade = surfaceVal
    ? propagateCascadeL1ToL5({
      lang: langVal,
      level: levelVal,
      ref: refVal,
      strongId: strongVal,
      oldSurface: oldSurfaceVal,
      newSurface: surfaceVal,
      note: noteVal,
      votes: Array.isArray(extraPayload.votes) ? extraPayload.votes : [],
      existingOverlayEntries: Array.isArray(extraPayload.existingOverlayEntries)
        ? extraPayload.existingOverlayEntries
        : [],
      expectedProperNouns: Array.isArray(extraPayload.expectedProperNouns)
        ? extraPayload.expectedProperNouns
        : [],
      expectedAgent: String(extraPayload.expectedAgent || ""),
      expectedPatient: String(extraPayload.expectedPatient || ""),
      validateLocksFn: validateAllEightLocksPda,
    })
    : null;
  const patch = typeof onRefresh === "function" ? onRefresh() : null;
  return {
    applied: Boolean(cascade ? cascade.accepted : surfaceVal.length > 0),
    lang: langVal,
    level: levelVal,
    ref: refVal,
    strongId: strongVal,
    surface: surfaceVal,
    signatureHex: extraPayload.signature || extraPayload.signatureHex || "",
    publicKeyHex: extraPayload.publicKey || extraPayload.publicKeyHex || "",
    expectedCrc32Hex: extraPayload.expectedCrc32Hex || "",
    patch,
    cascade,
  };
}
