// ============================================================================
// web/mostrador/surface_compositor.js — Declarative Single-Source Surface Compositor
// Decisions D1-R2, D2-R2, D3-R2: zero inline style mutations, synchronous boot
// subtab delegation (eliminating Delta Hamming = 0), and ?mode=studio fold startup.
// ============================================================================

import { HAREL_SHEET_MAP } from "./bridge_and_chapter.js";
import { verifyArtifactProjectionClosure } from "./dom_projection_contracts.js";
import {
  EXCLUSIVE_VISIBILITY_SLOTS,
  SURFACE_SLOT_MANIFEST,
  WORK_LIFECYCLE,
  isTechnicalPlaneEnabled,
  isWorkVisible,
  projectStoreAttributesToDom,
  resolveActiveWorkDrawerContext,
  resolveDrawerChromePriority,
  resolvePublicOrPreviewWork,
  resolveWorkDrawerAdapter,
  resolveWorkspaceMode,
  syncStickyDrawerContextHeader,
} from "./projection_contract.js";
import {
  DEFAULT_SUBTABS_BY_SHEET,
  closeSheet,
  isMobileSheetViewport,
  resolvePrimaryIntentGroup,
  setActiveIntent,
  setSheetSubtab,
  setSurfacePlane,
} from "./state_store.js";

/**
 * Monta de forma atomica una vista dentro de su contenedor asignado (`D1-R10`),
 * garantizando un unico dueno por ranura, orden determinista y cero inserciones paralelas huerfanas.
 */
export function mountSlotView(containerEl, { html = "", ownerId = "", orderIndex = null } = {}) {
  if (!containerEl) return false;
  if (typeof containerEl.setAttribute === "function") {
    if (ownerId) containerEl.setAttribute("data-slot-owner", String(ownerId));
    if (Number.isFinite(Number(orderIndex))) {
      containerEl.setAttribute("data-slot-order", String(Number(orderIndex)));
    }
  }
  if (typeof html === "string") {
    containerEl.innerHTML = html;
  }
  return true;
}

/**
 * Proyecta de forma sustractiva el manifiesto `(activeWork, activeSheet, activeSubtab)`
 * gobernando orden, dueno de ranura y adaptador de obra sin acumular duplicados (`D1-R10`, `D11-R10`).
 */
export function enforceSubtractiveSlotOwnership(state = {}, resolveEl) {
  const normalizedSheet = state.activeSheet === "improve" ? "field" : state.activeSheet || null;
  const activeSubtabs = state.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
  const activeSubtab = normalizedSheet
    ? activeSubtabs[normalizedSheet] || DEFAULT_SUBTABS_BY_SHEET[normalizedSheet] || ""
    : "";
  const slotKey = normalizedSheet && activeSubtab ? `${normalizedSheet}:${activeSubtab}` : "";
  const spec = slotKey ? SURFACE_SLOT_MANIFEST[slotKey] || null : null;
  const workCtx = resolveActiveWorkDrawerContext(state);
  const workAdapter = resolveWorkDrawerAdapter(state);
  if (typeof resolveEl === "function") {
    const drawersHost = resolveEl("sovereignGlobalDrawersHost");
    if (drawersHost && typeof drawersHost.setAttribute === "function") {
      drawersHost.setAttribute("data-active-work", workCtx.activeWork);
      drawersHost.setAttribute("data-primary-slot", spec ? spec.primary : "");
      drawersHost.setAttribute("data-work-print-mode", workAdapter.printMode);
      drawersHost.setAttribute("data-work-share-target", workAdapter.shareTarget);
    }
    if (spec && spec.primary) {
      const primaryEl = resolveEl(spec.primary);
      primaryEl?.setAttribute?.("data-slot-role", "primary");
      primaryEl?.setAttribute?.("data-slot-order", "0");
    }
    if (spec && Array.isArray(spec.slotOrder)) {
      spec.slotOrder.forEach((slotId, idx) => {
        const slotEl = resolveEl(slotId);
        if (slotEl && typeof slotEl.setAttribute === "function") {
          slotEl.setAttribute("data-slot-order", String(idx));
        }
      });
    }
  }
  return {
    activeWork: workCtx.activeWork,
    workAdapter,
    slotKey,
    primarySlot: spec ? spec.primary : null,
    collapsibleCount: spec ? spec.collapsibles.length : 0,
    slotOrder: spec?.slotOrder || [],
  };
}

const SUBTAB_GROUP_TO_SHEET = Object.freeze({
  study: "study",
  print: "print",
  workshop: "field",
  dosis: "share",
});

const SHEET_TO_SUBTAB_GROUP = Object.freeze({
  study: "study",
  print: "print",
  field: "workshop",
  share: "dosis",
});

/**
 * Pure projection of one Harel subtab group (`study`, `print`, `workshop`, `dosis`)
 * toggling `hidden`, `aria-selected`, `aria-pressed`, and `.is-active` without inline `style`.
 */
export function projectSubtabGroupToDom(rootDoc, groupName, activeSubtab) {
  if (!rootDoc || typeof rootDoc.querySelectorAll !== "function") {
    return { groupName, activeSubtab, toggledPanels: 0 };
  }
  const btnAttr = `data-${groupName}-subtab-btn`;
  const panelAttr = `data-${groupName}-subtab-panel`;

  for (const btn of Array.from(rootDoc.querySelectorAll(`[${btnAttr}]`))) {
    const val = btn.getAttribute?.(btnAttr);
    const isSelected = val === activeSubtab;
    btn.setAttribute?.("aria-selected", isSelected ? "true" : "false");
    btn.setAttribute?.("aria-pressed", isSelected ? "true" : "false");
    btn.classList?.toggle?.("is-active", isSelected);
  }

  let toggledPanels = 0;
  for (const panel of Array.from(rootDoc.querySelectorAll(`[${panelAttr}]`))) {
    const val = panel.getAttribute?.(panelAttr);
    const hasPinnedStatus = panel.getAttribute?.("data-status-visible") === "true";
    const isIdleProgress = panel.id === "tandaWorkerProgressWrap" && panel.getAttribute?.("data-worker-active") !== "true";
    const isVisible = !isIdleProgress && (val === activeSubtab || hasPinnedStatus);
    panel.hidden = !isVisible;
    toggledPanels += 1;
  }
  return { groupName, activeSubtab, toggledPanels };
}

/**
 * Synchronizes all 4 sheet subtab groups from `state.activeSubtabBySheet`.
 */
function projectAllSubtabsFromState(state = {}, rootDoc) {
  const bySheet = state.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
  const results = [];
  for (const [groupName, sheetId] of Object.entries(SUBTAB_GROUP_TO_SHEET)) {
    const subtab = bySheet[sheetId] || DEFAULT_SUBTABS_BY_SHEET[sheetId];
    results.push(projectSubtabGroupToDom(rootDoc, groupName, subtab));
  }
  return results;
}

/**
 * Projects active work, inspector openness, topbar pressed states, and sheet panels
 * strictly from `state` without inline `style.display` overrides.
 */
export function projectSurfaceLayoutFromState(state = {}, rootDoc, getEl) {
  if (!rootDoc) return false;
  const resolveEl =
    typeof getEl === "function"
      ? (id) => getEl(id, rootDoc)
      : (id) => (typeof rootDoc.getElementById === "function" ? rootDoc.getElementById(id) : null);

  projectStoreAttributesToDom(state, rootDoc);
  projectAllSubtabsFromState(state, rootDoc);
  const techPlaneOn = resolveWorkspaceMode(state, rootDoc?.location?.search || "") === "studio" || isTechnicalPlaneEnabled(state, rootDoc?.location?.search || "");
  const syncDetailsPlane = (selector) => {
    for (const det of Array.from(rootDoc.querySelectorAll(selector))) {
      if (det.tagName !== "DETAILS") continue;
      if (techPlaneOn && !det.open) {
        det.open = true;
        det.setAttribute?.("data-auto-opened-by-tech", "1");
      } else if (!techPlaneOn && det.getAttribute?.("data-auto-opened-by-tech") === "1") {
        det.open = false;
        det.removeAttribute?.("data-auto-opened-by-tech");
      }
    }
  };
  if (typeof rootDoc.querySelectorAll === "function") {
    syncDetailsPlane('[data-technical-plane="true"]');
    syncDetailsPlane('details[data-contextual-details="true"]');
  }

  const showEvangelios = isWorkVisible("evangelios", state);
  const activeWork = resolvePublicOrPreviewWork(state.activeWork, state);
  const workSections = {
    biblia: "bibleSovereignSection",
    felices: "felicesSovereignSection",
    evangelios: "evangeliosSovereignSection",
  };
  for (const [wKey, secId] of Object.entries(workSections)) {
    const el = resolveEl(secId);
    if (el) {
      el.hidden = wKey !== activeWork;
      el.setAttribute?.("data-active-work", wKey === activeWork ? "true" : "false");
    }
  }
  const tabEvEl = resolveEl("tabWorkEvangelios");
  if (tabEvEl) {
    tabEvEl.hidden = !showEvangelios;
    tabEvEl.setAttribute?.("aria-hidden", showEvangelios ? "false" : "true");
  }
  if (typeof rootDoc.querySelectorAll === "function") {
    for (const evScoped of Array.from(rootDoc.querySelectorAll('[data-work-scope="evangelios"]'))) {
      evScoped.hidden = !showEvangelios;
      if ("disabled" in evScoped) evScoped.disabled = !showEvangelios;
    }
  }
  const evDraftBadge = resolveEl("evangeliosDraftPreviewBadge");
  if (evDraftBadge) {
    const showDraftBadge = showEvangelios && WORK_LIFECYCLE.evangelios !== "public";
    evDraftBadge.hidden = !showDraftBadge;
    if (showDraftBadge) {
      const isEnUi = String(state.uiLocale || "en").trim().toLowerCase().startsWith("en");
      evDraftBadge.textContent = isEnUi
        ? "🧪 Draft · Internal Preview"
        : "🧪 Borrador · Vista previa interna";
    }
  }

  const normalizedSheet = state.activeSheet === "improve" ? "field" : state.activeSheet || null;
  const hasOpenSheet = Boolean(normalizedSheet && HAREL_SHEET_MAP[normalizedSheet]);
  const vp = resolveEl("bibleVerseViewport");
  if (vp) {
    vp.setAttribute?.("data-inspector-open", hasOpenSheet ? "true" : "false");
  }

  const drawersHost = resolveEl("sovereignGlobalDrawersHost");
  if (drawersHost) {
    const showDrawersHost = true;
    drawersHost.hidden = !showDrawersHost;
    drawersHost.setAttribute?.("data-inspector-open", hasOpenSheet ? "true" : "false");
    drawersHost.setAttribute?.("data-intent-group", resolvePrimaryIntentGroup(state.activeIntent));
    const isExpertFocus = state.activeIntent === "study" || state.activeIntent === "improve" || state.activeIntent === "field" || state.activeIntent === "workshop";
    drawersHost.setAttribute?.("data-chrome-audience", isExpertFocus ? "studio" : "print-first");
  }

  for (const [sheetKey, cfg] of Object.entries(HAREL_SHEET_MAP)) {
    const isOpen = hasOpenSheet && sheetKey === normalizedSheet;
    const panel = resolveEl(cfg.panelId);
    const btn = resolveEl(cfg.buttonId);
    if (panel) {
      panel.hidden = !isOpen;
    }
    if (btn) {
      btn.setAttribute?.("data-open", isOpen ? "true" : "false");
      btn.setAttribute?.("aria-expanded", isOpen ? "true" : "false");
      btn.setAttribute?.("aria-pressed", isOpen ? "true" : "false");
      btn.setAttribute?.("data-chrome-priority", resolveDrawerChromePriority(sheetKey));
      btn.setAttribute?.("data-chrome-salience", isOpen ? "active" : "idle");
    }
  }

  const activeSubtabs = state.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
  const isSharePdf = normalizedSheet === "share" && activeSubtabs.share === "pdf";
  const camVideo = resolveEl("bibleOpticalCameraVideo");
  if (camVideo && !isSharePdf) {
    camVideo.hidden = true;
  }

  const exitProPill = resolveEl("btnExitTechnicalPlanePill");
  if (exitProPill) {
    exitProPill.hidden = !techPlaneOn;
    exitProPill.setAttribute?.("aria-pressed", techPlaneOn ? "true" : "false");
  }
  const readerBtn = resolveEl("btnWorkspaceReader");
  if (readerBtn) {
    readerBtn.setAttribute?.("aria-pressed", techPlaneOn ? "false" : "true");
  }
  const studioBtn = resolveEl("btnToggleTechnicalPlane");
  if (studioBtn) {
    studioBtn.setAttribute?.("aria-pressed", techPlaneOn ? "true" : "false");
  }

  const appBtn = resolveEl("btnAppearanceMenu");
  if (appBtn && typeof appBtn.textContent === "string") {
    appBtn.textContent = "Aa";
  }

  const appPop = resolveEl("appearancePopover");
  if (appPop && !appPop.hidden && (hasOpenSheet || (state.activeModal && state.activeModal !== "appearance"))) {
    appPop.hidden = true;
    resolveEl("btnAppearanceMenu")?.setAttribute?.("aria-expanded", "false");
  }

  const lexHost = resolveEl("stpLexiconExplorerHost");
  if (lexHost) {
    const activeFieldSubtab = activeSubtabs.field || "patch";
    lexHost.hidden = !(
      String(state.lang || "").toLowerCase() === "stp" &&
      normalizedSheet === "field" &&
      activeFieldSubtab === "patch"
    );
  }

  const backdrop = resolveEl("mobileSheetBackdrop");
  if (backdrop) {
    const viewWin = rootDoc?.defaultView;
    const isMobileEnv = viewWin ? isMobileSheetViewport(viewWin) : true;
    backdrop.hidden = !(hasOpenSheet && state.mobileSheetOpen === true && isMobileEnv);
  }

  const closeSheetBtn = resolveEl("btnCloseMobileSheet");
  if (closeSheetBtn) {
    const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
    closeSheetBtn.setAttribute?.("aria-label", isEn ? "Close panel" : "Cerrar panel");
  }

  const resolvedState = hasOpenSheet ? { ...state, activeSheet: normalizedSheet } : { ...state, activeSheet: null };
  syncStickyDrawerContextHeader(resolvedState, resolveEl, rootDoc);
  enforceSubtractiveSlotOwnership(resolvedState, resolveEl);
  assertSlotVisibilityOwnership(rootDoc, resolvedState);
  return true;
}

/**
 * Registers synchronous root click delegation for all `[data-*-subtab-btn]` controls
 * during bootstrap (before any lazy sheet module import settles).
 */
function bindEarlySubtabDelegation({ store, state, doc, onSubtabChange } = {}) {
  if (!doc || typeof doc.addEventListener !== "function") return () => { };
  if (doc._r2SubtabDelegationBound) return doc._r2SubtabUnbind || (() => { });

  let lastSheetOpenerEl = null;
  const restoreSheetFocus = () => {
    const opener = lastSheetOpenerEl;
    lastSheetOpenerEl = null;
    if (opener && typeof opener.focus === "function") {
      try { opener.focus(); } catch { }
    }
  };

  const handleClick = (evt) => {
    const target = evt?.target;
    if (!target) return;

    const triggerMatch = Object.values(HAREL_SHEET_MAP).find(
      (cfg) => target.id === cfg.buttonId || Boolean(target.closest?.(`#${cfg.buttonId}`)),
    );
    if (triggerMatch) {
      lastSheetOpenerEl = target.closest?.(`#${triggerMatch.buttonId}`) || target;
      if (state && typeof state === "object") {
        state.userTouchedSheet = true;
      }
    }

    if (
      target.id === "mobileSheetBackdrop" ||
      target.id === "btnCloseMobileSheet" ||
      Boolean(target.closest?.("#btnCloseMobileSheet"))
    ) {
      if (state && typeof state === "object") {
        state.userTouchedSheet = true;
      }
      if (store) {
        closeSheet(store);
      } else if (state && typeof state === "object") {
        state.activeSheet = null;
        state.mobileSheetOpen = false;
      }
      projectSurfaceLayoutFromState(store?.getState?.() || state || {}, doc);
      restoreSheetFocus();
      return;
    }

    for (const [groupName, sheetId] of Object.entries(SUBTAB_GROUP_TO_SHEET)) {
      const btnAttr = `data-${groupName}-subtab-btn`;
      const btn =
        typeof target.closest === "function"
          ? target.closest(`[${btnAttr}]`)
          : typeof target.getAttribute === "function" && target.getAttribute(btnAttr)
            ? target
            : null;
      if (!btn) continue;
      const subtabId = btn.getAttribute?.(btnAttr);
      if (!subtabId) continue;

      const activeState = store?.getState?.() || state || {};
      const bySheet = activeState.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
      const nextMap = Object.freeze({ ...bySheet, [sheetId]: subtabId });
      if (state && typeof state === "object") {
        state.activeSubtabBySheet = nextMap;
      }
      if (store) {
        setSheetSubtab(store, sheetId, subtabId);
      }
      projectSubtabGroupToDom(doc, groupName, subtabId);
      if (typeof onSubtabChange === "function") {
        onSubtabChange(sheetId, subtabId, groupName);
      }
      return;
    }
  };

  const handleKeyDown = (evt) => {
    if (evt?.key !== "Escape") return;
    const activeState = store?.getState?.() || state || {};
    if (!activeState.activeSheet) return;
    if (store) {
      closeSheet(store);
    } else if (state && typeof state === "object") {
      state.activeSheet = null;
      state.mobileSheetOpen = false;
    }
    projectSurfaceLayoutFromState(store?.getState?.() || state || {}, doc);
    restoreSheetFocus();
  };

  doc.addEventListener("click", handleClick);
  doc.addEventListener("keydown", handleKeyDown);
  doc._r2SubtabDelegationBound = true;
  doc._r2SubtabUnbind = () => {
    doc.removeEventListener?.("click", handleClick);
    doc.removeEventListener?.("keydown", handleKeyDown);
    doc._r2SubtabDelegationBound = false;
  };
  return doc._r2SubtabUnbind;
}

/**
 * Handles `?intent=` and `?mode=studio` alias startup synchronously above the fold (`D4-R6A`).
 */
export function applyInitialSurfaceModeFromUrl({ store, state, search = "", doc, getEl } = {}) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const intentParam = params.get("intent");
  const modeParam = params.get("mode");
  const sheetParam = params.get("sheet");
  const isStudio = modeParam === "studio";
  if (!intentParam && !isStudio && !sheetParam) return null;

  const targetSheet =
    sheetParam && HAREL_SHEET_MAP[sheetParam === "improve" || sheetParam === "workshop" ? "field" : sheetParam]
      ? sheetParam === "improve" || sheetParam === "workshop"
        ? "field"
        : sheetParam
      : intentParam === "workshop" || intentParam === "field" || intentParam === "improve"
        ? "field"
        : intentParam === "vault"
          ? "share"
          : ["study", "print", "share"].includes(intentParam)
            ? intentParam
            : isStudio
              ? "study"
              : null;
  const resolvedIntent =
    targetSheet === "field"
      ? "workshop"
      : ["study", "print", "share"].includes(targetSheet)
        ? targetSheet
        : intentParam === "read"
          ? "read"
          : isStudio
            ? "study"
            : "read";

  const mobileOpen = isMobileSheetViewport(doc?.defaultView);
  const vaultRequested = intentParam === "vault";
  if (store && typeof store.setState === "function") {
    if (isStudio) setSurfacePlane(store, "technical");
    if (vaultRequested) setSheetSubtab(store, "share", "mesh");
    setActiveIntent(store, resolvedIntent, { mobileSheetOpen: mobileOpen });
  } else if (state && typeof state === "object") {
    if (isStudio) {
      state.surfacePlane = "technical";
      state.workspaceMode = "studio";
    }
    if (vaultRequested) {
      state.activeSubtabBySheet = Object.freeze({ ...(state.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET), share: "mesh" });
      state.vaultRequested = true;
    }
    state.activeIntent = resolvedIntent;
    state.activeSheet = targetSheet;
    state.mobileSheetOpen = Boolean(targetSheet && mobileOpen);
  }
  const snap = store?.getState?.() || state || {};
  projectSurfaceLayoutFromState(snap, doc, getEl);
  return { activeIntent: snap.activeIntent || resolvedIntent, activeSheet: snap.activeSheet, vaultRequested };
}

/**
 * Creates and wires the declarative compositor onto EkovozStore.
 */
export function createSurfaceCompositor({ store, state, doc, getEl, onSubtabChange } = {}) {
  const unbindSubtabs = bindEarlySubtabDelegation({ store, state, doc, onSubtabChange });
  let unsubscribe = () => { };
  if (store && typeof store.subscribe === "function") {
    unsubscribe = store.subscribe((snapshot) => {
      projectSurfaceLayoutFromState(snapshot, doc, getEl);
    });
  }
  projectSurfaceLayoutFromState(store?.getState?.() || state || {}, doc, getEl);
  if (doc?.documentElement?.outerHTML) {
    const audit = verifyArtifactProjectionClosure({
      htmlSource: doc.documentElement.outerHTML,
    });
    doc.documentElement.setAttribute?.("data-projection-ok", audit.ok ? "true" : "false");
  }

  return {
    project: (targetDoc = doc) =>
      projectSurfaceLayoutFromState(store?.getState?.() || state || {}, targetDoc, getEl),
    applyUrlStartup: (search) =>
      applyInitialSurfaceModeFromUrl({ store, state, search, doc, getEl }),
    destroy: () => {
      unsubscribe();
      unbindSubtabs();
    },
  };
}

/**
 * Audita que ninguna ranura bajo propiedad exclusiva del compositor viole su estado declarativo de visibilidad (`D1-HIG13`).
 */
export function assertSlotVisibilityOwnership(rootDoc, state = {}) {
  const violations = [];
  if (!rootDoc || typeof rootDoc.getElementById !== "function") {
    return { ok: true, checked: 0, violations };
  }
  let checked = 0;
  const search = rootDoc?.location?.search || "";
  const techPlaneOn =
    resolveWorkspaceMode(state, search) === "studio" || isTechnicalPlaneEnabled(state, search);
  const exitProPill = rootDoc.getElementById("btnExitTechnicalPlanePill");
  if (exitProPill && Object.prototype.hasOwnProperty.call(EXCLUSIVE_VISIBILITY_SLOTS, "btnExitTechnicalPlanePill")) {
    checked += 1;
    if (Boolean(exitProPill.hidden) !== !techPlaneOn) {
      violations.push("btnExitTechnicalPlanePill");
    }
  }
  const showEvangelios = isWorkVisible("evangelios", state);
  const tabEvEl = rootDoc.getElementById("tabWorkEvangelios");
  if (tabEvEl) {
    checked += 1;
    if (Boolean(tabEvEl.hidden) !== !showEvangelios) {
      violations.push("tabWorkEvangelios");
    }
  }
  const normalizedSheet = state.activeSheet === "improve" ? "field" : state.activeSheet || null;
  for (const [sheetKey, cfg] of Object.entries(HAREL_SHEET_MAP)) {
    const panel = rootDoc.getElementById(cfg.panelId);
    if (!panel) continue;
    checked += 1;
    const expectedOpen = Boolean(normalizedSheet && sheetKey === normalizedSheet);
    if (Boolean(panel.hidden) !== !expectedOpen) {
      violations.push(cfg.panelId);
    }
  }
  const activeSubtabs = state.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
  if (typeof rootDoc.querySelectorAll === "function") {
    for (const [groupName, sheetId] of Object.entries(SUBTAB_GROUP_TO_SHEET)) {
      const activeSubtab = activeSubtabs[sheetId] || DEFAULT_SUBTABS_BY_SHEET[sheetId];
      for (const panel of Array.from(rootDoc.querySelectorAll(`[data-${groupName}-subtab-panel]`))) {
        checked += 1;
        const val = panel.getAttribute?.(`data-${groupName}-subtab-panel`);
        const isPinned = panel.getAttribute?.("data-status-visible") === "true";
        const isIdleProgress =
          panel.id === "tandaWorkerProgressWrap" && panel.getAttribute?.("data-worker-active") !== "true";
        const expectedVisible = !isIdleProgress && (val === activeSubtab || isPinned);
        if (Boolean(panel.hidden) !== !expectedVisible) {
          violations.push(`${groupName}:${val}`);
        }
      }
    }
  }
  return { ok: violations.length === 0, checked, violations };
}
