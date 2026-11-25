// ============================================================================
// web/mostrador/drawer_workshop.js — Gaveta 3 (Taller de Campo, Escalera CELF-250 & Auditoría CRDT/Censo 7,164)
// Decisiones D1-R41, D4-R41, D6-R41, D7-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import {
  CASCADE_SEMILATTICE_PRIORITY,
  evaluateBetaDawidSkeneSprt,
  exportSignedEcoPatchV2Artifact,
  foldCascadePatchV2Semilattice,
  hydrateFormulaicParallelsIndex,
  projectChapterThroughCascadeSemilattice,
} from "./cascade_l1_l5.js";
import { runClientExternalAudit8Locks } from "./concordance_search.js";
import { bindSurfaceActions, createLatestSlotRunner, patchStoreState } from "./dom_patch.js";
const workshopSlotRunner = createLatestSlotRunner();
import { resolvePrimaryStrongForVerse } from "./drawer_study.js";
import {
  normalizeRootNotesEntries,
  renderCrdtWalAndLockP2AuditCardHtml,
  renderFieldWorkshopCensus7164Html,
  renderMasterCensus7164CardHtml,
  resolveAtomicBatchForPassage,
} from "./drawer_workshop_cards.js";
import {
  applySuggestedImprovement,
  buildPatchPayload,
  computeWalSnapshotRollbackPreview,
  hydrateFieldWorkshopData,
  renderStpLexiconExplorerHtml,
  renderStpLexiconResultsRowsHtml,
} from "./mejorar.js";
import {
  validateAllEightLocksPda,
  verifyLock8PredicativeAndNegation,
} from "./mejorar_locks_pda.js";
import { computeEcoPackCrc32Hex } from "./offline_mesh.js";
import { resolveActiveWorkDrawerContext } from "./projection_contract.js";
import { projectSurfaceLayoutFromState } from "./surface_compositor.js";
import { formatLock8StatusBadge, createWorkshopAuditHandlers, deriveVerseLockAnchors, renderWorkshop5LangsSwitcherHtml, renderWorkshopAuditSubtabHtml } from "./workshop_audit_and_langs.js";
import { resolveDefaultStrongForPassage } from "./study_verse_viewmodel.js";
import {
  OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
  OVERLAY_AUTHORITY_MAINTAINER_ED25519,
  applyOverlayEntriesToLiveState,
  ensureStateOverlaysHydrated,
  loadLiveCascadeOverlaysIdb,
  persistSignedCascadeOverlayIdb,
  projectChapterWithLiveOverlays,
  resolveOverlayEntryForOsis,
  resolveVerseWithOverlay,
  signLocalWorkshopPayload,
} from "./workshop_overlay_store.js";

export {
  CASCADE_SEMILATTICE_PRIORITY,
  OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
  OVERLAY_AUTHORITY_MAINTAINER_ED25519,
  applyOverlayEntriesToLiveState,
  ensureStateOverlaysHydrated,
  exportSignedEcoPatchV2Artifact,
  foldCascadePatchV2Semilattice,
  loadLiveCascadeOverlaysIdb,
  normalizeRootNotesEntries,
  persistSignedCascadeOverlayIdb,
  projectChapterThroughCascadeSemilattice,
  projectChapterWithLiveOverlays,
  renderCrdtWalAndLockP2AuditCardHtml,
  renderFieldWorkshopCensus7164Html,
  renderMasterCensus7164CardHtml,
  resolveAtomicBatchForPassage,
  resolveOverlayEntryForOsis,
  resolveVerseWithOverlay
};
export const HAREL_WORKSHOP_SUBTABS = ["patch", "ladder", "audit"];

/**
 * Hidrata la Gaveta 3 (Taller de Campo + Escalera CELF 250 + Auditoría CRDT/Censo) (`D4-R41` / `D3-R38` / `D10-R38`).
 */
export async function hydrateImproveDrawerPanel(ctx = {}) {
  const {
    state,
    dataLayer,
    targetDoc,
    getEl,
    getI18n,
    loadImproveModule,
  } = ctx;
  const earlyAuditEl = getEl?.("tallerArtifactsCatalog", targetDoc);
  const earlyHandlers = createWorkshopAuditHandlers({
    state,
    targetDoc,
    getEl,
    oldInput: getEl?.("improveOldSurfaceInput", targetDoc),
    refreshPatchPreview: () => state.refreshPatchPreview?.(),
    navigate: ctx.navigate,
    hydrateBookAndChapterSelectors: ctx.hydrateBookAndChapterSelectors,
  });
  if (earlyAuditEl && typeof earlyAuditEl.addEventListener === "function" && !earlyAuditEl._auditPanelsBound) {
    earlyAuditEl._auditPanelsBound = true;
    earlyAuditEl.addEventListener("change", earlyHandlers.onAuditChange);
    earlyAuditEl.addEventListener("click", earlyHandlers.onAuditClick);
  }
  const earlyDynamicHost = getEl?.("tallerArtifactsDynamicList", targetDoc);
  if (earlyDynamicHost && !String(earlyDynamicHost.innerHTML || "").includes("workshop5LangsSwitcher")) {
    const renderEarlySwitcher = () => {
      earlyDynamicHost.innerHTML = renderWorkshop5LangsSwitcherHtml(
        state?.activeTallerLang || state?.lang || "es",
        state?.masterCensusSummary || null,
        state?.uiLocale || "es",
        state?.availableWorkshopLangs || null,
      );
    };
    if (state && typeof state.refreshWorkshopAuditSubtab !== "function") {
      state.refreshWorkshopAuditSubtab = renderEarlySwitcher;
    }
    renderEarlySwitcher();
  }
  return workshopSlotRunner.run("workshop", async (_signal, isCurrent) => {
    const mod = await loadImproveModule();
    if (!isCurrent()) return "";
    const currentVerseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
    const osis = `${state.book}.${state.chapter}.${state.verse}`;
    if (!state.lastNavResult?.matrix?.rows) {
      const loadMatFn =
        typeof dataLayer?.loadChapterMatrix === "function"
          ? dataLayer.loadChapterMatrix.bind(dataLayer)
          : typeof dataLayer?.loadMatrixChapter === "function"
            ? dataLayer.loadMatrixChapter.bind(dataLayer)
            : null;
      if (loadMatFn) {
        try {
          const matRes = await loadMatFn(state.book || "GEN", state.chapter || 1);
          const rows = Array.isArray(matRes?.rows)
            ? matRes.rows
            : Array.isArray(matRes?.data?.rows)
              ? matRes.data.rows
              : null;
          if (rows && rows.length > 0) {
            if (!state.lastNavResult) state.lastNavResult = {};
            state.lastNavResult.matrix = { rows };
          }
        } catch {
          // Mantener operación degradada limpia cuando matrix_tier0 no está disponible
        }
      }
    }
    if (!state.formulaicIndexHydrated && typeof dataLayer?.loadJson === "function") {
      try {
        const fj = await dataLayer.loadJson("data/formulaic_index.json");
        if (fj) {
          hydrateFormulaicParallelsIndex(fj);
          state.formulaicIndexHydrated = true;
        }
      } catch {
        // Non-fatal
      }
    }
    const activeStrongId = await resolvePrimaryStrongForVerse(state, dataLayer);
    state.activeStrongId = activeStrongId;
    const ladder250 =
      typeof dataLayer.loadElicitationLadder250 === "function"
        ? await dataLayer.loadElicitationLadder250()
        : [];
    state.celfLadder250 = ladder250;
    const fieldWorkshopActiveLang = String(state.lang || "stp").trim().toLowerCase() || "stp";
    if (typeof dataLayer.loadFieldWorkshopData === "function") {
      const fwData = await dataLayer.loadFieldWorkshopData(fieldWorkshopActiveLang);
      if (fwData) {
        hydrateFieldWorkshopData(fwData, ladder250);
        state.availableWorkshopLangs = Array.isArray(fwData.available_workshop_langs)
          ? fwData.available_workshop_langs
          : [];
        state.topUncertaintyQueue = Array.isArray(fwData.top_uncertainty_queue)
          ? fwData.top_uncertainty_queue
          : [];
      } else {
        state.availableWorkshopLangs = [];
        state.topUncertaintyQueue = [];
      }
    }
    const persistedOverlays = await loadLiveCascadeOverlaysIdb(state.lang).catch(() => []);
    if (persistedOverlays.length > 0) {
      state.liveCascadeOverlays = persistedOverlays;
      applyOverlayEntriesToLiveState(state, persistedOverlays);
    }
    if (!state.masterCensusSummary && typeof dataLayer.loadMasterCensusSummary === "function") {
      try {
        const censusData = await dataLayer.loadMasterCensusSummary();
        if (censusData) state.masterCensusSummary = censusData;
      } catch {
        // Non-fatal
      }
    }
    if (!state.annotationIndexReport && typeof dataLayer?.loadAnnotationIndexReport === "function") {
      try {
        const ann = await dataLayer.loadAnnotationIndexReport();
        if (ann) state.annotationIndexReport = ann;
      } catch {
        // Non-fatal
      }
    }
    if (!state.blindCalibrationReport && typeof dataLayer?.loadBlindCalibrationReport === "function") {
      try {
        const blind = await dataLayer.loadBlindCalibrationReport();
        if (blind) state.blindCalibrationReport = blind;
      } catch {
        // Non-fatal
      }
    }
    if (!isCurrent()) return "";
    const i18nInstance = typeof getI18n === "function" ? getI18n() : null;
    const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
    const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);
    const lockAnchors = deriveVerseLockAnchors(state, currentVerseText);
    const html = mod.renderImproveDrawerHtml({
      kind: "verse",
      lang: state.lang,
      locale: state.uiLocale,
      uiLocale: state.uiLocale,
      ref: osis,
      osis,
      strongId: activeStrongId,
      currentVerseText,
      currentSurface: currentVerseText,
      proposedSurface: "",
      expectedProperNouns: lockAnchors.expectedProperNouns,
      expectedAgent: lockAnchors.expectedAgent,
      expectedPatient: lockAnchors.expectedPatient,
      level: state.cascadeLevel || "L2",
      includeInlineSeedPanel: !Boolean(cascadeEl),
      includeEightLocksBar: true,
      i18n: i18nInstance,
      t: tFn,
    });
    const workCtx = resolveActiveWorkDrawerContext(state);
    const isEnWorkshop = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
    const localEditsCount = Array.isArray(state.liveCascadeOverlays) ? state.liveCascadeOverlays.length : 0;
    const progressCardHtml =
      `<aside id="workshopProgressCard" class="work-context-drawer-banner" data-work-context="${workCtx.activeWork}" data-workshop-collaborator="true" data-local-edits="${localEditsCount}">` +
      `<strong>🌱 ${workCtx.isSisterWork ? workCtx.bannerText : (isEnWorkshop ? `My Progress · ${localEditsCount} local pass(es) in ${fieldWorkshopActiveLang.toUpperCase()}` : `Mi progreso · ${localEditsCount} corrección(es) locales en ${fieldWorkshopActiveLang.toUpperCase()}`)}</strong>` +
      `</aside>`;
    const container =
      getEl("socraticElicitorContainer", targetDoc) ||
      getEl("bibleFieldWorkshopSheet", targetDoc);
    getEl("bibleFieldWorkshopSheet", targetDoc)?.setAttribute?.("data-workshop-collaborator-mode", "true");
    if (container) {
      container.innerHTML = progressCardHtml + html;
      container.setAttribute?.("data-field-workshop-lang", fieldWorkshopActiveLang);
      container.setAttribute?.("data-active-work", workCtx.activeWork);
      container.removeAttribute?.("data-field-workshop-fallback");
    }

    if (cascadeEl && typeof mod.renderCascadeAndLadderHtml === "function") {
      cascadeEl.innerHTML = mod.renderCascadeAndLadderHtml({
        ladderItems: ladder250,
        lang: state.lang,
        currentRef: osis,
        osis,
        strongId: activeStrongId,
        level: state.cascadeLevel || "L2",
        activeRung: state.activeCelfRung || "ALL",
        activeOtWave: state.activeOtWave || 0,
        limit: 24,
        includeWalCard: false,
        includeCensusCard: false,
        uiLocale: state.uiLocale || "es",
        uqPage: state.uncertaintyQueuePage || 1,
        externalAuditText: state.externalAuditText || "",
        externalAuditResult: state.externalAuditResult || null,
        activeTier3aPair: state.activeTier3aPair || "",
        previewWorks: Array.isArray(state.previewWorks) ? state.previewWorks : [],
      });
    }

    const lexHost = getEl("stpLexiconExplorerHost", targetDoc);
    const isStpLang = String(state.lang || "").toLowerCase() === "stp";
    if (lexHost) {
      if (isStpLang) {
        const renderLexFn =
          typeof mod.renderStpLexiconExplorerHtml === "function"
            ? mod.renderStpLexiconExplorerHtml
            : renderStpLexiconExplorerHtml;
        lexHost.innerHTML = renderLexFn({
          query: state.stpLexiconQuery || "",
          activeWave: state.activeOtWave || 0,
          limit: 24,
        });
      } else {
        lexHost.innerHTML = "";
      }
    }

    const renderAuditSubtabPanels = () => {
      const tallerHost = getEl("tallerArtifactsDynamicList", targetDoc) || getEl("tallerArtifactsCatalog", targetDoc);
      if (!tallerHost) return;
      tallerHost.innerHTML = renderWorkshopAuditSubtabHtml({
        mod,
        state,
      });
      const catalogHost = getEl("tallerArtifactsCatalog", targetDoc);
      if (catalogHost && tallerHost !== catalogHost && catalogHost.children) {
        const dupIds = new Set([
          "externalAudit8LocksPanel",
          "uncertaintyQueue60Panel",
          "tier3aDialectContinuumPanel",
        ]);
        for (const child of Array.from(catalogHost.children)) {
          if (child !== tallerHost && dupIds.has(child.id) && typeof child.remove === "function") {
            child.remove();
          }
        }
      }
    };
    state.refreshWorkshopAuditSubtab = renderAuditSubtabPanels;
    renderAuditSubtabPanels();

    bindImproveFormControlsInDrawer(mod, ctx);
    projectSurfaceLayoutFromState(state, targetDoc, getEl);
    return html;
  });
}

export function bindImproveFormControlsInDrawer(mod, ctx = {}) {
  const {
    state,
    targetDoc,
    getEl,
    navigate,
    hydrateBookAndChapterSelectors,
  } = ctx;
  const kindSel = getEl("improveKindSelect", targetDoc);
  const levelSel = getEl("improveLevelSelect", targetDoc);
  const oldInput = getEl("improveOldSurfaceInput", targetDoc);
  const newInput = getEl("improveNewSurfaceInput", targetDoc);
  const noteInput = getEl("improveNoteInput", targetDoc);
  const previewCode = getEl("improvePatchOutput", targetDoc);
  const copyBtn = getEl("btnCopyPatchPayload", targetDoc);
  const downloadBtn = getEl("btnDownloadPatchFile", targetDoc);
  const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);

  const refreshPatchPreview = () => {
    const selectedLevel = levelSel?.value || state.cascadeLevel || "L2";
    state.cascadeLevel = selectedLevel;
    const osis = `${state.book}.${state.chapter}.${state.verse}`;
    const currentOldSurf = oldInput?.value || "";
    const currentNewSurf = newInput?.value || "";
    const patchBuilder = typeof mod.buildPatchPayload === "function" ? mod.buildPatchPayload : buildPatchPayload;
    const patch = patchBuilder({
      kind: kindSel?.value || "verse",
      level: selectedLevel,
      lang: state.lang,
      locale: state.uiLocale,
      ref: osis,
      strongId: state.activeStrongId || "",
      oldSurface: currentOldSurf,
      newSurface: currentNewSurf,
      note: noteInput?.value || "",
    });
    const lockAnchors = deriveVerseLockAnchors(state, currentOldSurf);
    const lockOpts = {
      oldSurface: currentOldSurf,
      newSurface: currentNewSurf,
      expectedProperNouns: lockAnchors.expectedProperNouns,
      expectedAgent: lockAnchors.expectedAgent,
      expectedPatient: lockAnchors.expectedPatient,
    };
    const eightLocksReport = validateAllEightLocksPda(lockOpts);
    const lock8Result = verifyLock8PredicativeAndNegation(lockOpts);
    const isEnLocale = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
    const drawerEl = targetDoc?.querySelector?.(".improve-drawer");
    if (drawerEl && typeof drawerEl.setAttribute === "function") {
      drawerEl.setAttribute("data-lock8-status", lock8Result.status);
      drawerEl.setAttribute("data-eight-locks-status", eightLocksReport.status);
    }
    const lock8BadgeEl = targetDoc?.querySelector?.('[data-lock8-badge="true"]');
    if (lock8BadgeEl) {
      lock8BadgeEl.textContent = formatLock8StatusBadge(lock8Result.status, state.uiLocale);
    }
    const eightLocksBarEl = targetDoc?.querySelector?.('[data-eight-locks-bar="true"]');
    if (eightLocksBarEl) {
      eightLocksBarEl.innerHTML = eightLocksReport.locks
        .map(
          (lk) =>
            `<span class="uls-badge lock-pill-badge" data-lock-id="${lk.id}" data-lock-passed="${lk.passed}">${lk.passed ? "✅" : "⛔"} ${lk.label}</span>`,
        )
        .join(" ");
    }
    if (previewCode) {
      previewCode.textContent = `${patch.payloadLine}\n\n${patch.json}`;
      if (typeof previewCode.setAttribute === "function") {
        previewCode.setAttribute("data-content-hash", patch.contentHash);
        previewCode.setAttribute("data-patch-filename", patch.filename);
      }
    }
    if (cascadeEl && typeof mod.renderCascadeAndLadderHtml === "function") {
      cascadeEl.innerHTML = mod.renderCascadeAndLadderHtml({
        ladderItems: state.celfLadder250 || [],
        lang: state.lang,
        currentRef: osis,
        osis,
        strongId: state.activeStrongId || "",
        level: selectedLevel,
        activeRung: state.activeCelfRung || "ALL",
        activeOtWave: state.activeOtWave || 0,
        limit: 24,
        includeWalCard: false,
        includeCensusCard: false,
        uiLocale: state.uiLocale || "es",
        uqPage: state.uncertaintyQueuePage || 1,
        externalAuditText: state.externalAuditText || "",
        externalAuditResult: state.externalAuditResult || null,
        activeTier3aPair: state.activeTier3aPair || "",
      });
    }
    state.refreshWorkshopAuditSubtab?.();
    const lexHostEl = getEl("stpLexiconExplorerHost", targetDoc);
    const lexRowsEl = getEl("stpLexiconResultsRows", targetDoc);
    const isStpActive = String(state.lang || "").toLowerCase() === "stp";
    if (!isStpActive) {
      if (lexRowsEl) lexRowsEl.innerHTML = "";
      if (lexHostEl) {
        lexHostEl.innerHTML = "";
      }
    } else if (lexRowsEl) {
      const renderRowsFn =
        typeof mod.renderStpLexiconResultsRowsHtml === "function"
          ? mod.renderStpLexiconResultsRowsHtml
          : renderStpLexiconResultsRowsHtml;
      lexRowsEl.innerHTML = renderRowsFn({
        query: state.stpLexiconQuery || "",
        activeWave: state.activeOtWave || 0,
        limit: 24,
      });
    } else if (lexHostEl && targetDoc?.activeElement?.id !== "stpLexiconSearchInput") {
      lexHostEl.innerHTML =
        typeof mod.renderStpLexiconExplorerHtml === "function"
          ? mod.renderStpLexiconExplorerHtml({
            query: state.stpLexiconQuery || "",
            activeWave: state.activeOtWave || 0,
            limit: 24,
          })
          : renderStpLexiconExplorerHtml({
            query: state.stpLexiconQuery || "",
            activeWave: state.activeOtWave || 0,
            limit: 24,
          });
      bindLexiconExplorerEvents(lexHostEl);
    }
    projectSurfaceLayoutFromState(state, targetDoc, getEl);
    return patch;
  };
  state.refreshPatchPreview = refreshPatchPreview;

  const bindLexiconExplorerEvents = (lexHostEl) => {
    if (!lexHostEl) return;
    const searchInput = getEl("stpLexiconSearchInput", targetDoc);
    if (searchInput && typeof searchInput.addEventListener === "function") {
      searchInput.setAttribute?.("data-action", "stp-lex-search");
      const onLexSearch = (ev) => {
        patchStoreState(ctx, { stpLexiconQuery: String(ev?.target?.value ?? searchInput.value ?? "") });
        const rowsEl = getEl("stpLexiconResultsRows", targetDoc);
        if (rowsEl) {
          const renderRowsFn =
            typeof mod.renderStpLexiconResultsRowsHtml === "function"
              ? mod.renderStpLexiconResultsRowsHtml
              : renderStpLexiconResultsRowsHtml;
          rowsEl.innerHTML = renderRowsFn({
            query: state.stpLexiconQuery,
            activeWave: state.activeOtWave || 0,
            limit: 24,
          });
        } else {
          (state.refreshPatchPreview || refreshPatchPreview)();
        }
      };
      bindSurfaceActions(searchInput, { "stp-lex-search": onLexSearch }, { scope: "stp-lex-input", events: ["input", "change"] });
    }
    if (typeof lexHostEl.addEventListener === "function") {
      if (!lexHostEl._lexActionBound) {
        lexHostEl._lexActionBound = true;
        lexHostEl.addEventListener("click", (ev) => {
          const injectBtn = ev?.target?.closest
            ? ev.target.closest("[data-inject-surface]")
            : ev?.target?.getAttribute?.("data-inject-surface")
              ? ev.target
              : null;
          if (injectBtn) {
            const surfaceVal = injectBtn.getAttribute?.("data-inject-surface") || "";
            if (newInput && surfaceVal) newInput.value = surfaceVal;
            (state.refreshPatchPreview || refreshPatchPreview)();
            return;
          }
          const entryBtn = ev?.target?.closest
            ? ev.target.closest("[data-lex-strong]")
            : ev?.target?.getAttribute?.("data-lex-strong")
              ? ev.target
              : null;
          if (!entryBtn) return;
          const nextStrong = entryBtn.getAttribute?.("data-lex-strong");
          const nextSurface = entryBtn.getAttribute?.("data-lex-surface");
          if (nextStrong) state.activeStrongId = String(nextStrong).toUpperCase();
          if (newInput && nextSurface) newInput.value = nextSurface;
          (state.refreshPatchPreview || refreshPatchPreview)();
        });
      }
    }
  };
  bindLexiconExplorerEvents(getEl("stpLexiconExplorerHost", targetDoc));

  for (const el of [kindSel, levelSel, oldInput, newInput, noteInput]) {
    if (el && typeof el.addEventListener === "function" && !el._improveCtrlBound) {
      el._improveCtrlBound = true;
      el.addEventListener("change", () => (state.refreshPatchPreview || refreshPatchPreview)());
      el.addEventListener("input", () => (state.refreshPatchPreview || refreshPatchPreview)());
    }
  }

  if (copyBtn && typeof copyBtn.addEventListener === "function" && !copyBtn._copyPatchBound) {
    copyBtn._copyPatchBound = true;
    copyBtn.addEventListener("click", () => {
      const patch = (state.refreshPatchPreview || refreshPatchPreview)();
      copyBtn.setAttribute("data-last-copied-hash", patch.contentHash);
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(patch.json).catch(() => { });
      }
    });
  }

  if (downloadBtn && typeof downloadBtn.addEventListener === "function" && !downloadBtn._downloadPatchBound) {
    downloadBtn._downloadPatchBound = true;
    downloadBtn.addEventListener("click", async () => {
      const patch = (state.refreshPatchPreview || refreshPatchPreview)();
      const osis = `${state.book}.${state.chapter}.${state.verse}`;
      const liveList = Array.isArray(state.liveCascadeOverlays) ? state.liveCascadeOverlays : [];
      const matchingLive =
        liveList.find((e) => String(e?.target_ref || "").toUpperCase() === osis.toUpperCase()) ||
        (liveList.length > 0 ? liveList[liveList.length - 1] : null);
      const lastEntry = state.lastAppliedCascade?.ekpackOverlayEntry || null;
      const activeOverlay =
        (lastEntry && String(lastEntry.target_ref || "").toUpperCase() === osis.toUpperCase()
          ? lastEntry
          : matchingLive || lastEntry) || {
          patch_id: patch.patchId || "PATCH-WORKSHOP",
          lang_code: state.lang || "stp",
          cascade_level: levelSel?.value || state.cascadeLevel || "L2",
          target_ref: osis,
          strong_id: resolveDefaultStrongForPassage(state.book, [], state.activeStrongId),
          old_surface: oldInput?.value || "",
          new_surface: newInput?.value || "",
          note_pure_text: noteInput?.value || "",
          votes: Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : [],
        };
      const votesList = Array.isArray(activeOverlay.votes)
        ? activeOverlay.votes
        : Array.isArray(state.pendingCommunityVotes)
          ? state.pendingCommunityVotes
          : [];
      const ds = evaluateBetaDawidSkeneSprt(votesList);
      const quorumStatus =
        ds.distinctReviewersCount >= 2 &&
          (ds.promotedToCanonicalWal === true || ds.editorialStatus === "COMMUNITY_VALIDATED")
          ? "quorum_verified"
          : "draft_local_signed_needs_quorum";
      const baseCascadeArg = state.lastAppliedCascade || {
        patchId: activeOverlay.patch_id,
        lang: state.lang || "stp",
        level: activeOverlay.cascade_level,
        ekpackOverlayEntry: activeOverlay,
        votes: votesList,
      };
      let sigHex = activeOverlay.signatureHex || state.pendingCascadeSignatureHex || "";
      let pubHex = activeOverlay.publicKeyHex || state.pendingCascadePublicKeyHex || "";
      let authorityTier = activeOverlay.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
      if (!sigHex || !pubHex) {
        const preDraft = exportSignedEcoPatchV2Artifact({
          cascadeResult: baseCascadeArg,
          signatureHex: "",
          publicKeyHex: "",
          crc32Hex: "",
        });
        try {
          const signed = await signLocalWorkshopPayload(preDraft.json || patch.json);
          sigHex = signed.signatureHex;
          pubHex = signed.publicKeyHex;
          authorityTier = signed.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
        } catch {
          downloadBtn.setAttribute?.("data-ecopatch-v2-error", "WEBCRYPTO_ED25519_UNAVAILABLE");
          const vStatusEl = getEl("improveCommunityVotesStatus", targetDoc);
          if (vStatusEl) {
            vStatusEl.textContent =
              "⛔ WebCrypto Ed25519 no disponible: no se puede exportar parche sin firma criptográfica.";
          }
          return;
        }
      }
      const baseExport = exportSignedEcoPatchV2Artifact({
        cascadeResult: baseCascadeArg,
        signatureHex: sigHex,
        publicKeyHex: pubHex,
        crc32Hex: "",
      });
      const finalArtifact = {
        ...baseExport.artifact,
        authority_tier: authorityTier,
        quorum_status: quorumStatus,
        crc32_hex: "",
      };
      finalArtifact.crc32_hex = computeEcoPackCrc32Hex(
        new TextEncoder().encode(JSON.stringify(finalArtifact)),
      );
      const finalJson = JSON.stringify(finalArtifact, null, 2);
      const finalFilename = baseExport.filename || patch.filename || `${state.lang || "stp"}.eco.patch.json`;
      if (typeof downloadBtn.setAttribute === "function") {
        downloadBtn.setAttribute("data-last-download-filename", finalFilename);
        downloadBtn.setAttribute("data-ecopatch-v2-crc32", finalArtifact.crc32_hex);
        downloadBtn.setAttribute("data-ecopatch-authority-tier", authorityTier);
        downloadBtn.setAttribute("data-ecopatch-quorum-status", quorumStatus);
        downloadBtn.setAttribute("data-last-downloaded-hash", patch.contentHash);
      }
      if (quorumStatus !== "quorum_verified") {
        const vStatusEl = getEl("improveCommunityVotesStatus", targetDoc);
        if (vStatusEl) {
          vStatusEl.textContent =
            "⚠️ Borrador firmado localmente: requiere quórum comunitario (>= 2 revisores) antes de promoción canónica.";
        }
      }
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && targetDoc?.createElement) {
        const blob = new Blob([finalJson || patch.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = targetDoc.createElement("a");
        if (a) {
          a.href = url;
          a.download = finalFilename;
          if (typeof a.click === "function") a.click();
        }
      }
    });
  }

  const voteReviewerInput = getEl("improveVoteReviewerIdInput", targetDoc);
  const voteGoldChk = getEl("improveVoteGoldSeedsCheck", targetDoc);
  const btnVoteApprove = getEl("btnAddCommunityVoteApprove", targetDoc);
  const btnVoteReject = getEl("btnAddCommunityVoteReject", targetDoc);
  const importVotesInput = getEl("inputImportCommunityVotesJson", targetDoc);
  const votesStatusEl = getEl("improveCommunityVotesStatus", targetDoc);

  const renderCommunityVotesStatus = () => {
    const votes = Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : [];
    const ds = evaluateBetaDawidSkeneSprt(votes);
    if (votesStatusEl) {
      votesStatusEl.setAttribute?.("data-ds-sprt-status", ds.editorialStatus);
      votesStatusEl.setAttribute?.("data-vote-count", String(votes.length));
      votesStatusEl.setAttribute?.("data-distinct-reviewers", String(ds.distinctReviewersCount));
      votesStatusEl.textContent = `${ds.editorialStatus} · ${ds.distinctReviewersCount} rev (${votes.length} raw) · P=${ds.posteriorTruthProb}`;
    }
    return ds;
  };
  const pushCommunityVote = (approvedFlag) => {
    if (!Array.isArray(state.pendingCommunityVotes)) state.pendingCommunityVotes = [];
    const idx = state.pendingCommunityVotes.length + 1;
    const revId = String(voteReviewerInput?.value || `hablante_${idx}`).trim() || `hablante_${idx}`;
    const passedGold = Boolean(voteGoldChk?.checked === true);
    state.pendingCommunityVotes.push({
      reviewerId: revId,
      approved: Boolean(approvedFlag),
      agrees: Boolean(approvedFlag),
      passedGoldSeeds: passedGold,
    });
    return renderCommunityVotesStatus();
  };
  if (btnVoteApprove && typeof btnVoteApprove.addEventListener === "function" && !btnVoteApprove._voteBound) {
    btnVoteApprove._voteBound = true;
    btnVoteApprove.addEventListener("click", () => pushCommunityVote(true));
  }
  if (btnVoteReject && typeof btnVoteReject.addEventListener === "function" && !btnVoteReject._voteBound) {
    btnVoteReject._voteBound = true;
    btnVoteReject.addEventListener("click", () => pushCommunityVote(false));
  }
  if (importVotesInput && typeof importVotesInput.addEventListener === "function" && !importVotesInput._votesImpBound) {
    importVotesInput._votesImpBound = true;
    importVotesInput.addEventListener("change", async (evt) => {
      const f = evt?.target?.files?.[0] || importVotesInput.files?.[0] || null;
      if (!f || typeof f.text !== "function") return;
      try {
        const parsed = JSON.parse(await f.text());
        const importedVotes = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.votes)
            ? parsed.votes
            : [];
        if (importedVotes.length > 0) {
          state.pendingCommunityVotes = [
            ...(Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : []),
            ...importedVotes,
          ];
          renderCommunityVotesStatus();
        }
      } catch {
        // Non-fatal invalid vote import JSON
      }
    });
  }
  renderCommunityVotesStatus();

  const applyBtn = getEl("btnApplySuggestedImprovement", targetDoc);
  if (applyBtn && typeof applyBtn.addEventListener === "function" && !applyBtn._applySuggestedBound) {
    applyBtn._applySuggestedBound = true;
    applyBtn.addEventListener("click", async () => {
      const refreshFn = state.refreshPatchPreview || refreshPatchPreview;
      const osis = `${state.book}.${state.chapter}.${state.verse}`;
      if (
        (!Array.isArray(state.lastNavResult?.matrix?.rows) || state.lastNavResult.matrix.rows.length === 0) &&
        ctx?.dataLayer
      ) {
        const loadMatFn =
          typeof ctx.dataLayer.loadChapterMatrix === "function"
            ? ctx.dataLayer.loadChapterMatrix.bind(ctx.dataLayer)
            : typeof ctx.dataLayer.loadMatrixChapter === "function"
              ? ctx.dataLayer.loadMatrixChapter.bind(ctx.dataLayer)
              : null;
        if (loadMatFn) {
          try {
            const matRes = await loadMatFn(state.book || "GEN", state.chapter || 1);
            const rows = Array.isArray(matRes?.rows)
              ? matRes.rows
              : Array.isArray(matRes?.data?.rows)
                ? matRes.data.rows
                : null;
            if (rows && rows.length > 0) {
              if (!state.lastNavResult) state.lastNavResult = {};
              state.lastNavResult.matrix = { rows };
            }
          } catch {
            // Non-fatal fallback
          }
        }
      }
      const oldSurfStr = oldInput?.value || "";
      const lockAnchors = deriveVerseLockAnchors(state, oldSurfStr);
      const communityVotes = Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : [];
      const dsVerdict = evaluateBetaDawidSkeneSprt(communityVotes);
      if (typeof applyBtn.setAttribute === "function") {
        applyBtn.setAttribute("data-ds-sprt-status", dsVerdict.editorialStatus);
      }
      renderCommunityVotesStatus();
      const payloadArgs = {
        lang: state.lang || "stp",
        level: levelSel?.value || state.cascadeLevel || "L2",
        ref: osis,
        strongId: resolveDefaultStrongForPassage(state.book, [], state.activeStrongId),
        oldSurface: oldSurfStr,
        note: noteInput?.value || "",
        votes: communityVotes,
        expectedProperNouns: lockAnchors.expectedProperNouns,
        expectedAgent: lockAnchors.expectedAgent,
        expectedPatient: lockAnchors.expectedPatient,
        existingOverlayEntries: Array.isArray(state.liveCascadeOverlays) ? state.liveCascadeOverlays : [],
        signature: state.pendingCascadeSignatureHex || "",
        publicKey: state.pendingCascadePublicKeyHex || "",
        expectedCrc32Hex: state.pendingExpectedCrc32Hex || "",
      };
      const receipt =
        typeof mod?.applySuggestedImprovement === "function"
          ? mod.applySuggestedImprovement(targetDoc, applyBtn, refreshFn, payloadArgs)
          : applySuggestedImprovement(targetDoc, applyBtn, refreshFn, payloadArgs);
      if (receipt?.cascade) {
        state.lastAppliedCascade = receipt.cascade;
      }
      if (receipt?.cascade?.patchId && typeof applyBtn.setAttribute === "function") {
        applyBtn.setAttribute("data-cascade-patch-id", receipt.cascade.patchId);
        applyBtn.setAttribute("data-cascade-status", receipt.cascade.status || "APPLIED");
      }
      if (receipt?.cascade?.accepted === true && receipt?.cascade?.promotedToCanonicalWal === true) {
        const idbRes = await persistSignedCascadeOverlayIdb(receipt);
        if (idbRes.persisted || idbRes.ed25519Verified) {
          if (idbRes.signatureHex) {
            state.pendingCascadeSignatureHex = idbRes.signatureHex;
          }
          if (idbRes.publicKeyHex) {
            state.pendingCascadePublicKeyHex = idbRes.publicKeyHex;
          }
          const authorityTier = idbRes.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
          const authorityLabel =
            idbRes.authorityLabel || "Borrador local firmado en este dispositivo";
          const nextOverlays = (receipt.cascade.foldedOverlayEntries || []).map((e) => ({
            ...e,
            authorityTier,
            authorityLabel,
            signatureHex: idbRes.signatureHex || state.pendingCascadeSignatureHex || "",
            publicKeyHex: idbRes.publicKeyHex || state.pendingCascadePublicKeyHex || "",
          }));
          state.liveCascadeOverlays = nextOverlays;
          applyOverlayEntriesToLiveState(state, nextOverlays);
          if (typeof applyBtn.setAttribute === "function") {
            applyBtn.setAttribute("data-overlay-authority", authorityTier);
            applyBtn.setAttribute("data-overlay-persisted", "true");
          }
          if (typeof ctx.renderViewportFromState === "function") {
            ctx.renderViewportFromState(targetDoc);
          }
          if (typeof ctx.renderStateToDom === "function") {
            ctx.renderStateToDom(targetDoc, { syncUrl: false });
          }
        }
      } else if (typeof applyBtn.setAttribute === "function") {
        applyBtn.setAttribute("data-overlay-persisted", "false");
      }
    });
  }

  const walSnapSel = getEl("selectWalRollbackSnapshot", targetDoc);
  const walRestoreBtn = getEl("btnRestoreWalSnapshot", targetDoc);
  const resolveSnapshotIndexFromSelect = () => {
    if (!walSnapSel) return 1;
    if (typeof walSnapSel.selectedIndex === "number" && walSnapSel.selectedIndex >= 0) {
      return walSnapSel.selectedIndex + 1;
    }
    const rawVal = String(walSnapSel.value || "");
    const m = rawVal.match(/(\d+)$/);
    return m ? Math.max(1, Math.min(10, Number(m[1]) + 1)) : 1;
  };
  const updateWalSnapshotPreviewDom = () => {
    const selIdx = resolveSnapshotIndexFromSelect();
    const val = String(walSnapSel?.value || `PATCH-WAL-SNAP-${String(selIdx - 1).padStart(2, "0")}`);
    if (walSnapSel && typeof walSnapSel.setAttribute === "function") {
      walSnapSel.setAttribute("data-selected-snapshot", val);
    }
    const preview = computeWalSnapshotRollbackPreview(selIdx);
    const previewBox = getEl("walSnapshotRollbackPreviewBox", targetDoc);
    if (previewBox) {
      previewBox.textContent = preview.previewText;
      previewBox.setAttribute("data-snapshot-index", String(preview.snapshotIndex));
      previewBox.setAttribute("data-snapshot-sha256", preview.sha256Prefix);
      previewBox.setAttribute("data-snapshot-patch-id", preview.patchId);
    }
    return preview;
  };
  if (walSnapSel && typeof walSnapSel.addEventListener === "function" && !walSnapSel._walSnapBound) {
    walSnapSel._walSnapBound = true;
    walSnapSel.addEventListener("change", updateWalSnapshotPreviewDom);
  }
  if (walRestoreBtn && typeof walRestoreBtn.addEventListener === "function" && !walRestoreBtn._walRestoreBound) {
    walRestoreBtn._walRestoreBound = true;
    walRestoreBtn.addEventListener("click", () => {
      const preview = updateWalSnapshotPreviewDom();
      const activeLang = String(state.lang || "stp").trim().toLowerCase() || "stp";
      const previewLang = String(
        preview?.lang || preview?.lang_code || (preview?.surfaceStp ? "stp" : ""),
      ).trim().toLowerCase();
      const restoredSurface =
        activeLang === "stp"
          ? String(preview?.surfaceStp || preview?.new_surface || preview?.surface || "")
          : previewLang === activeLang
            ? String(preview?.new_surface || preview?.surface || "")
            : "";
      if (preview && restoredSurface) {
        if (newInput) {
          newInput.value = restoredSurface;
        }
        const restoredEntry = {
          patch_id: preview.patchId || "PATCH-WAL-RESTORED",
          lang_code: activeLang,
          cascade_level: preview.level || "L2",
          semilattice_priority: CASCADE_SEMILATTICE_PRIORITY.L1_DIRECT,
          target_ref: preview.ref || `${String(state.book || "GEN").toUpperCase()}.${state.chapter || 1}.${state.verse || 1}`,
          strong_id: preview.strongId || preview.strong || resolveDefaultStrongForPassage(state.book),
          new_surface: restoredSurface,
          authorityTier: OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
          savedAtIso: new Date().toISOString(),
        };
        state.liveCascadeOverlays = [
          ...(Array.isArray(state.liveCascadeOverlays) ? state.liveCascadeOverlays : []),
          restoredEntry,
        ];
        applyOverlayEntriesToLiveState(state, [restoredEntry]);
        if (typeof walRestoreBtn.setAttribute === "function") {
          walRestoreBtn.setAttribute(
            activeLang === "stp" ? "data-restored-surface-stp" : "data-restored-surface",
            restoredSurface,
          );
        }
      }
      if (preview && (preview.strong || preview.strongId)) {
        state.activeStrongId = String(preview.strong || preview.strongId).toUpperCase();
      }
      (state.refreshPatchPreview || refreshPatchPreview)();
      if (typeof ctx.renderViewportFromState === "function") {
        ctx.renderViewportFromState(targetDoc);
      }
    });
  }

  const { onAuditChange, onAuditClick } = createWorkshopAuditHandlers({
    state,
    targetDoc,
    getEl,
    oldInput,
    refreshPatchPreview,
    navigate,
    hydrateBookAndChapterSelectors,
  });
  const tallerAuditEl = getEl("tallerArtifactsCatalog", targetDoc);
  if (tallerAuditEl && typeof tallerAuditEl.addEventListener === "function" && !tallerAuditEl._auditPanelsBound) {
    tallerAuditEl._auditPanelsBound = true;
    tallerAuditEl.addEventListener("change", onAuditChange);
    tallerAuditEl.addEventListener("click", onAuditClick);
  }
  if (cascadeEl && typeof cascadeEl.addEventListener === "function" && !cascadeEl._celfBound) {
    cascadeEl._celfBound = true;
    cascadeEl.addEventListener("change", onAuditChange);
    cascadeEl.addEventListener("click", async (e) => {
      if (await onAuditClick(e)) return;
      const waveBtn = e?.target?.closest
        ? e.target.closest("[data-ot-wave]")
        : e?.target?.getAttribute?.("data-ot-wave")
          ? e.target
          : null;
      const waveAttr = waveBtn?.getAttribute?.("data-ot-wave");
      if (waveAttr !== null && waveAttr !== undefined) {
        state.activeOtWave = Number(waveAttr) || 0;
        (state.refreshPatchPreview || refreshPatchPreview)();
        return;
      }
      const filterBtn = e?.target?.closest ? e.target.closest("[data-celf-rung-filter]") : e?.target?.getAttribute?.("data-celf-rung-filter") ? e.target : null;
      const filterKey = filterBtn?.getAttribute?.("data-celf-rung-filter");
      if (filterKey) { state.activeCelfRung = filterKey; (state.refreshPatchPreview || refreshPatchPreview)(); return; }
      const entropyBtn = e?.target?.closest ? e.target.closest("[data-next-entropy-ref]") : e?.target?.getAttribute?.("data-next-entropy-ref") ? e.target : null;
      const nextEntropyRef = entropyBtn?.getAttribute?.("data-next-entropy-ref");
      if (nextEntropyRef) {
        const mEnt = String(nextEntropyRef).trim().match(/^([A-Z0-9]+)\.(\d+)(?:\.(\d+))?/i);
        if (mEnt) { await navigate({ book: mEnt[1].toUpperCase(), chapter: Number(mEnt[2]) || 1, verse: Number(mEnt[3]) || 1 }, targetDoc); hydrateBookAndChapterSelectors(targetDoc); }
        return;
      }
      const rungBtn = e?.target?.closest ? e.target.closest("[data-ladder-ref]") : e?.target?.getAttribute?.("data-ladder-ref") ? e.target : null;
      const ladderRef = rungBtn?.getAttribute?.("data-ladder-ref");
      if (ladderRef) {
        const mRng = String(ladderRef).trim().match(/^([A-Z0-9]+)\.(\d+)(?:\.(\d+))?/i);
        if (mRng) { await navigate({ book: mRng[1].toUpperCase(), chapter: Number(mRng[2]) || 1, verse: Number(mRng[3]) || 1 }, targetDoc); hydrateBookAndChapterSelectors(targetDoc); }
      }
    });
  }
}

