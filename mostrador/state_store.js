// ============================================================================
// web/mostrador/state_store.js — Single Declarative EkovozStore + OwnershipRegistry
// + Glitch-Free Object.is Batching + Native <dialog> Controller (D2-V3UX / SLICE-05)
// Pure browser ES module: zero Node fs imports, zero external runtime dependencies.
// ============================================================================

export const STORE_DOMAIN_OWNERS = Object.freeze({
  book: "navigation",
  chapter: "navigation",
  verse: "navigation",
  lang: "navigation",
  corpusLang: "navigation",
  register: "navigation",
  rollMode: "navigation",
  orthographyProfile: "navigation",
  oralPorticoActive: "navigation",
  countryIso2: "navigation",
  regionCode: "navigation",
  uiLocale: "locale",
  activeWork: "work",
  activePlateIndex: "work",
  activeDichaIndex: "work",
  evangeliosWeekId: "work",
  evangeliosQuarter: "work",
  activeSheet: "sheet",
  activeModal: "modal",
  surfaceMode: "surface",
  appearanceTheme: "appearance",
  fontFamily: "appearance",
  fontScale: "appearance",
  stealthMode: "stealth",
  edition: "print",
  paperFormat: "print",
  columns: "print",
  fontSizePt: "print",
  duplex: "print",
  orientation: "print",
  sheets: "print",
  activeStrongId: "study",
});

export const VALID_ACTIVE_MODALS = Object.freeze([
  null,
  "compass",
  "preview",
  "plate",
  "appearance",
  "spotlight",
]);

/**
 * Single-writer-per-domain registry preventing cross-module state fights.
 */
export function createOwnershipRegistry(ownerMap = STORE_DOMAIN_OWNERS) {
  const owners = { ...ownerMap };
  return Object.freeze({
    ownerOf(key) {
      return owners[key] || null;
    },
    assertCanWrite(key, domain = "*") {
      if (!domain || domain === "*") return true;
      const expected = owners[key];
      if (expected && expected !== domain) {
        throw new TypeError(
          `[OwnershipRegistry] Domain "${domain}" cannot mutate "${key}" owned by "${expected}"`,
        );
      }
      return true;
    },
    ownersSnapshot() {
      return { ...owners };
    },
  });
}

/**
 * Glitch-free reactive store using Object.is equality and synchronous batch() coalescing.
 */
export function createEkovozStore(initialState = {}, options = {}) {
  const registry = options.registry || createOwnershipRegistry(options.ownerMap);
  const listeners = new Set();
  const state =
    options.backingState && typeof options.backingState === "object"
      ? options.backingState
      : {};

  const defaults = {
    activeWork: "biblia",
    activeModal: null,
    activeSheet: null,
    surfaceMode: "reader",
    appearanceTheme: "light",
    fontFamily: "serif",
    fontScale: 1.0,
    stealthMode: false,
    corpusLang: initialState.lang || state.lang || "es",
    uiLocale: initialState.uiLocale || state.uiLocale || "en",
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (state[k] === undefined) state[k] = v;
  }
  if (initialState && typeof initialState === "object") {
    for (const [k, v] of Object.entries(initialState)) {
      if (v !== undefined) state[k] = v;
    }
  }

  let batchDepth = 0;
  let pendingBaseline = null;

  function emitDelta(before, after) {
    const changedKeys = [];
    for (const key of Object.keys(after)) {
      if (!Object.is(before[key], after[key])) {
        changedKeys.push(key);
      }
    }
    if (changedKeys.length === 0) return false;
    const snapshot = { ...after };
    for (const listener of Array.from(listeners)) {
      listener(snapshot, changedKeys);
    }
    return true;
  }

  function setState(patch = {}, domain = "*") {
    if (!patch || typeof patch !== "object") return false;
    for (const key of Object.keys(patch)) {
      registry.assertCanWrite(key, domain);
    }
    const before = batchDepth > 0 ? null : { ...state };
    let mutatedAny = false;
    for (const [key, nextVal] of Object.entries(patch)) {
      if (!Object.is(state[key], nextVal)) {
        state[key] = nextVal;
        if (key === "lang" && !("corpusLang" in patch)) {
          state.corpusLang = nextVal;
        }
        mutatedAny = true;
      }
    }
    if (!mutatedAny) return false;
    if (batchDepth > 0) return true;
    return emitDelta(before, state);
  }

  function batch(fn) {
    if (typeof fn !== "function") return undefined;
    if (batchDepth === 0) {
      pendingBaseline = { ...state };
    }
    batchDepth += 1;
    try {
      return fn({ setState, getState });
    } finally {
      batchDepth -= 1;
      if (batchDepth === 0) {
        const baseline = pendingBaseline || {};
        pendingBaseline = null;
        emitDelta(baseline, state);
      }
    }
  }

  function getState() {
    return { ...state };
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    registry,
    getState,
    setState,
    batch,
    subscribe,
  };
}

/**
 * Native <dialog> controller: showModal()/close(), backdrop rect dismiss,
 * Escape cancel, and #opener focus-restore without style.display hacks.
 */
export function createNativeDialogController(
  dialogEl,
  {
    modalId = "compass",
    openerFallback = null,
    targetDoc = typeof document !== "undefined" ? document : null,
    store = null,
    onOpen = null,
    onClose = null,
  } = {},
) {
  let storedOpener = null;

  const isCurrentlyOpen = () => Boolean(dialogEl?.open);

  const ensureClosedAttributes = () => {
    if (!dialogEl) return;
    dialogEl.open = false;
    dialogEl.removeAttribute?.("open");
    if (dialogEl.style && dialogEl.style.display === "none") {
      dialogEl.style.display = "";
    }
  };

  const open = (explicitOpener = null) => {
    if (!dialogEl) return false;
    storedOpener = explicitOpener || targetDoc?.activeElement || openerFallback || null;
    if (dialogEl.hidden) dialogEl.hidden = false;
    if (dialogEl.style && dialogEl.style.display === "none") {
      dialogEl.style.display = "";
    }
    if (typeof dialogEl.showModal === "function") {
      try {
        if (!dialogEl.open) dialogEl.showModal();
      } catch {
        dialogEl.open = true;
        dialogEl.setAttribute?.("open", "");
      }
    } else {
      dialogEl.open = true;
      dialogEl.setAttribute?.("open", "");
    }
    store?.setState?.({ activeModal: modalId }, "modal");
    onOpen?.();
    return true;
  };

  const restoreOpenerFocus = () => {
    if (storedOpener && typeof storedOpener.focus === "function") {
      try {
        storedOpener.focus();
      } catch {
        // Safe no-op in virtual DOM mocks
      }
    }
    storedOpener = null;
  };

  const close = () => {
    if (!dialogEl) return false;
    if (typeof dialogEl.close === "function") {
      try {
        if (dialogEl.open) dialogEl.close();
      } catch {
        dialogEl.open = false;
      }
    }
    ensureClosedAttributes();
    store?.setState?.({ activeModal: null }, "modal");
    restoreOpenerFocus();
    onClose?.();
    return false;
  };

  ensureClosedAttributes();

  if (dialogEl && typeof dialogEl.addEventListener === "function" && !dialogEl._nativeDialogBound) {
    dialogEl._nativeDialogBound = true;
    dialogEl.addEventListener("cancel", (e) => {
      e?.preventDefault?.();
      close();
    });
    dialogEl.addEventListener("click", (e) => {
      if (e?.target !== dialogEl) return;
      if (typeof dialogEl.getBoundingClientRect === "function" && typeof e.clientX === "number" && typeof e.clientY === "number") {
        const rect = dialogEl.getBoundingClientRect();
        const inside =
          rect &&
          rect.width > 0 &&
          rect.height > 0 &&
          e.clientY >= rect.top &&
          e.clientY <= rect.top + rect.height &&
          e.clientX >= rect.left &&
          e.clientX <= rect.left + rect.width;
        if (inside) return;
      }
      close();
    });
  }

  return {
    open,
    close,
    isOpen: isCurrentlyOpen,
    getOpener: () => storedOpener,
  };
}
