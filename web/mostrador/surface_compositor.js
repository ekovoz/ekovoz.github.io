// ============================================================================
// web/mostrador/surface_compositor.js — Declarative Single-Source Surface Compositor
// Decisions D1-R2, D2-R2, D3-R2: zero inline style mutations, synchronous boot
// subtab delegation (eliminating Delta Hamming = 0), and ?mode=studio fold startup.
// ============================================================================

import { HAREL_SHEET_MAP } from "./bridge_and_chapter.js";
import { verifyArtifactProjectionClosure } from "./dom_projection_contracts.js";
import { projectStoreAttributesToDom, syncStickyDrawerContextHeader } from "./projection_contract.js";
import {
  DEFAULT_SUBTABS_BY_SHEET,
  closeSheet,
  isMobileSheetViewport,
  setSheetSubtab,
} from "./state_store.js";

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
    const isVisible = val === activeSubtab || hasPinnedStatus;
    panel.hidden = !isVisible;
    if (panel.style && panel.style.display === "none" && isVisible) {
      panel.style.display = "";
    }
    toggledPanels += 1;
  }
  return { groupName, activeSubtab, toggledPanels };
}

/**
 * Synchronizes all 4 sheet subtab groups from `state.activeSubtabBySheet`.
 */
export function projectAllSubtabsFromState(state = {}, rootDoc) {
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

  const activeWork = ["biblia", "felices", "evangelios"].includes(state.activeWork)
    ? state.activeWork
    : "biblia";
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

  const normalizedSheet = state.activeSheet === "improve" ? "field" : state.activeSheet || null;
  const hasOpenSheet = Boolean(normalizedSheet && HAREL_SHEET_MAP[normalizedSheet]);
  const vp = resolveEl("bibleVerseViewport");
  if (vp) {
    vp.setAttribute?.("data-inspector-open", hasOpenSheet ? "true" : "false");
  }

  const drawersHost = resolveEl("sovereignGlobalDrawersHost");
  if (drawersHost) {
    const showDrawersHost = state.surfaceMode === "studio" || hasOpenSheet || activeWork === "biblia";
    drawersHost.hidden = !showDrawersHost;
    drawersHost.setAttribute?.("data-inspector-open", hasOpenSheet ? "true" : "false");
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
    }
  }

  const activeSubtabs = state.activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
  const isSharePdf = normalizedSheet === "share" && activeSubtabs.share === "pdf";
  const camVideo = resolveEl("bibleOpticalCameraVideo");
  if (camVideo && !isSharePdf) {
    camVideo.hidden = true;
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

  const surfaceBtn = resolveEl("btnToggleSurfaceMode");
  if (surfaceBtn) {
    const isStudio = state.surfaceMode === "studio";
    const modeKey = isStudio ? "top.btn.readerMode" : "top.btn.studioMode";
    const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
    surfaceBtn.setAttribute?.("aria-pressed", isStudio ? "true" : "false");
    surfaceBtn.setAttribute?.("data-i18n", modeKey);
    surfaceBtn.textContent = isStudio
      ? (isEn ? "📖 Reader" : "📖 Lectura")
      : (isEn ? "🎛️ Studio" : "🎛️ Taller");
  }

  syncStickyDrawerContextHeader(
    hasOpenSheet ? { ...state, activeSheet: normalizedSheet } : { ...state, activeSheet: null },
    resolveEl,
    rootDoc,
  );
  return true;
}

/**
 * Registers synchronous root click delegation for all `[data-*-subtab-btn]` controls
 * during bootstrap (before any lazy sheet module import settles).
 */
export function bindEarlySubtabDelegation({ store, state, doc, onSubtabChange } = {}) {
  if (!doc || typeof doc.addEventListener !== "function") return () => {};
  if (doc._r2SubtabDelegationBound) return doc._r2SubtabUnbind || (() => {});

  let lastSheetOpenerEl = null;
  const restoreSheetFocus = () => {
    const opener = lastSheetOpenerEl;
    lastSheetOpenerEl = null;
    if (opener && typeof opener.focus === "function") {
      try { opener.focus(); } catch {}
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
 * Handles `?mode=studio` startup synchronously so the inspector/toolbar opens immediately above the fold.
 */
export function applyInitialSurfaceModeFromUrl({ store, state, search = "", doc, getEl } = {}) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const modeParam = params.get("mode");
  const sheetParam = params.get("sheet");
  const isStudio = modeParam === "studio";
  if (!isStudio && !sheetParam) return null;

  const targetSheet =
    sheetParam && HAREL_SHEET_MAP[sheetParam === "improve" ? "field" : sheetParam]
      ? sheetParam === "improve"
        ? "field"
        : sheetParam
      : isStudio
        ? "study"
        : null;

  const mobileOpen = isMobileSheetViewport(doc?.defaultView);
  if (store && typeof store.batch === "function") {
    store.batch(({ setState }) => {
      if (isStudio) setState({ surfaceMode: "studio" }, "surface");
      if (targetSheet) setState({ activeSheet: targetSheet, mobileSheetOpen: mobileOpen }, "sheet");
    });
  } else if (state && typeof state === "object") {
    if (isStudio) state.surfaceMode = "studio";
    if (targetSheet) {
      state.activeSheet = targetSheet;
      state.mobileSheetOpen = mobileOpen;
    }
  }
  const snap = store?.getState?.() || state || {};
  projectSurfaceLayoutFromState(snap, doc, getEl);
  return { surfaceMode: snap.surfaceMode, activeSheet: snap.activeSheet };
}

/**
 * Creates and wires the declarative compositor onto EkovozStore.
 */
export function createSurfaceCompositor({ store, state, doc, getEl, onSubtabChange } = {}) {
  const unbindSubtabs = bindEarlySubtabDelegation({ store, state, doc, onSubtabChange });
  let unsubscribe = () => {};
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
