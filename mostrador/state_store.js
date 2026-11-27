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
  bridgeLang: "navigation",
  uiLocale: "locale",
  activeWork: "work",
  previewWorks: "work",
  activePlateIndex: "work",
  activeDichaIndex: "work",
  evangeliosWeekId: "work",
  evangeliosQuarter: "work",
  activeSheet: "sheet",
  activeSubtabBySheet: "sheet",
  activeCorpusTab: "sheet",
  mobileSheetOpen: "sheet",
  activeModal: "modal",
  activeIntent: "surface",
  intentSeq: "sheet",
  surfaceMode: "surface",
  surfacePlane: "surface",
  workspaceMode: "surface",
  appearanceTheme: "appearance",
  fontFamily: "appearance",
  fontScale: "appearance",
  stealthMode: "stealth",
  activeDose: "print",
  edition: "print",
  paperFormat: "print",
  columns: "print",
  fontSizePt: "print",
  duplex: "print",
  orientation: "print",
  sheets: "print",
  printConfig: "print",
  activeBranchId: "print",
  activeTypologyId: "print",
  activeStrongId: "study",
});

export const VALID_ACTIVE_INTENTS = Object.freeze([
  "read",
  "study",
  "print",
  "share",
  "workshop",
]);

/**
 * Canónica 3-Intenciones (`D1-HIG8`): colapsa las 5 sub-rutas del store en
 * 3 intenciones de primer nivel con dueño único (`read` | `print` | `studio`).
 */
const PRIMARY_INTENT_GROUPS = Object.freeze({
  read: "read",
  print: "print",
  study: "studio",
  workshop: "studio",
  share: "studio",
});

export function resolvePrimaryIntentGroup(rawIntent = "read") {
  const clean = normalizeIntentId(rawIntent);
  return PRIMARY_INTENT_GROUPS[clean] || "read";
}

export const VALID_ACTIVE_MODALS = Object.freeze([
  null,
  "compass",
  "preview",
  "plate",
  "appearance",
  "spotlight",
  "support",
]);

export const DEFAULT_SUBTABS_BY_SHEET = Object.freeze({
  study: "words",
  print: "doses",
  field: "patch",
  share: "mesh",
});

const DEFAULT_PRINT_CONFIG = Object.freeze({
  edition: "02_2col_pastoral",
  paperFormat: "a4",
  orientation: "portrait",
  columns: 2,
  fontSizePt: 9.5,
  duplex: true,
  foliationMode: "saddle_stitch",
  activeBranchId: null,
  activeTypologyId: null,
});

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
    previewWorks: [],
    activeModal: null,
    activeSheet: null,
    activeSubtabBySheet: DEFAULT_SUBTABS_BY_SHEET,
    activeCorpusTab: "bibles",
    mobileSheetOpen: false,
    intentSeq: 0,
    activeIntent: "read",
    surfaceMode: "reader",
    surfacePlane: "editorial",
    workspaceMode: "reader",
    appearanceTheme: "light",
    fontFamily: "serif",
    fontScale: 1.0,
    stealthMode: false,
    paperFormat: "a4",
    printConfig: DEFAULT_PRINT_CONFIG,
    activeBranchId: null,
    activeTypologyId: null,
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
    if (typeof listener !== "function") return () => { };
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

/**
 * Pure glitch-free domain actions for sheet, work, and surface mode transitions (D1-R4 / SLICE-R4-01).
 */
function normalizeSheetId(rawSheetName) {
  if (!rawSheetName) return null;
  const clean = String(rawSheetName).trim().toLowerCase();
  if (clean === "improve" || clean === "workshop") return "field";
  if (clean === "dosis") return "share";
  if (["study", "print", "field", "share"].includes(clean)) return clean;
  return null;
}

function sheetToIntentId(sheetId) {
  if (sheetId === "field" || sheetId === "improve") return "workshop";
  if (sheetId === "study" || sheetId === "print" || sheetId === "share") return sheetId;
  return "read";
}

function normalizeIntentId(rawIntent) {
  if (!rawIntent) return "read";
  const clean = String(rawIntent).trim().toLowerCase();
  if (clean === "field" || clean === "improve" || clean === "workshop") return "workshop";
  if (clean === "vault") return "print";
  if (clean === "dosis" || clean === "share") return "share";
  if (clean === "study" || clean === "print" || clean === "read") return clean;
  return "read";
}

export function isMobileSheetViewport(win = globalThis?.window) {
  if (!win) return false;
  if (typeof win.matchMedia === "function") {
    return Boolean(win.matchMedia("(max-width: 1023px)").matches);
  }
  if (typeof win.innerWidth === "number") {
    return win.innerWidth < 1024;
  }
  return false;
}

export function openSheet(store, rawSheetName, opts = {}) {
  if (!store || typeof store.setState !== "function") return null;
  const normalized = normalizeSheetId(rawSheetName);
  if (!normalized) return closeSheet(store);
  const mobileOpen =
    typeof opts?.mobileSheetOpen === "boolean"
      ? opts.mobileSheetOpen
      : isMobileSheetViewport(opts?.window || globalThis?.window);
  const intent = sheetToIntentId(normalized);
  store.batch?.(({ setState }) => {
    setState({ activeSheet: normalized, mobileSheetOpen: mobileOpen }, "sheet");
    setState({ activeIntent: intent }, "surface");
  });
  if (typeof store.batch !== "function") {
    store.setState({ activeSheet: normalized, mobileSheetOpen: mobileOpen, activeIntent: intent }, "*");
  }
  return normalized;
}

export function closeSheet(store) {
  if (!store || typeof store.setState !== "function") return null;
  store.batch?.(({ setState }) => {
    setState({ activeSheet: null, mobileSheetOpen: false }, "sheet");
    setState({ activeIntent: "read" }, "surface");
  });
  if (typeof store.batch !== "function") {
    store.setState({ activeSheet: null, mobileSheetOpen: false, activeIntent: "read" }, "*");
  }
  return null;
}

export function setActiveIntent(store, rawIntent, opts = {}) {
  const cleanIntent = normalizeIntentId(rawIntent);
  if (!store || typeof store.setState !== "function") return cleanIntent;
  if (cleanIntent === "read") {
    closeSheet(store);
    return "read";
  }
  const sheetId = cleanIntent === "workshop" ? "field" : cleanIntent;
  const mobileOpen =
    typeof opts?.mobileSheetOpen === "boolean"
      ? opts.mobileSheetOpen
      : isMobileSheetViewport(opts?.window || globalThis?.window);
  store.batch?.(({ setState }) => {
    setState({ activeIntent: cleanIntent }, "surface");
    setState({ activeSheet: sheetId, mobileSheetOpen: mobileOpen }, "sheet");
  });
  if (typeof store.batch !== "function") {
    store.setState({ activeIntent: cleanIntent, activeSheet: sheetId, mobileSheetOpen: mobileOpen }, "*");
  }
  return cleanIntent;
}

/**
 * Guarded Proxy preventing unregistered direct property mutations to store-owned keys.
 */
export function createGuardedStateProxy(store, { strictWrites = true } = {}) {
  if (!store || typeof store.getState !== "function") {
    throw new TypeError("[createGuardedStateProxy] Valid EkovozStore required");
  }
  return new Proxy(store.getState(), {
    get(target, prop) {
      return store.getState()[prop] ?? target[prop];
    },
    set(target, prop, value) {
      const key = String(prop);
      const owner = STORE_DOMAIN_OWNERS[key];
      if (owner && strictWrites) {
        throw new TypeError(
          `[EkovozStore Guard] Direct write to owned state.${key} (domain="${owner}") forbidden; use store.setState()`,
        );
      }
      if (owner) {
        store.setState({ [key]: value }, owner);
        return true;
      }
      target[prop] = value;
      return true;
    },
  });
}

export function toggleSheet(store, rawSheetName) {
  if (!store || typeof store.getState !== "function" || typeof store.setState !== "function") {
    return null;
  }
  const normalized = normalizeSheetId(rawSheetName);
  if (!normalized) return closeSheet(store);
  const current = store.getState()?.activeSheet || null;
  return current === normalized ? closeSheet(store) : openSheet(store, normalized);
}

export const WORK_LIFECYCLE = Object.freeze({
  biblia: "public",
  felices: "public",
  evangelios: "draft", // INTENCIONAL (R11): deshabilitado por defecto; requiere ?preview=1
});

export function isRegisteredWorkId(workId, lifecycle = WORK_LIFECYCLE) {
  const key = String(workId || "").trim().toLowerCase();
  return Boolean(key && Object.prototype.hasOwnProperty.call(lifecycle, key));
}

export function setActiveWork(store, workId, lifecycle = WORK_LIFECYCLE) {
  if (!store || typeof store.setState !== "function") return "biblia";
  const cleanWork = isRegisteredWorkId(workId, lifecycle) ? String(workId).trim().toLowerCase() : "biblia";
  store.batch?.(({ setState }) => {
    setState({ activeWork: cleanWork }, "work");
    if (cleanWork !== "biblia") {
      setState({ activeSheet: null, mobileSheetOpen: false }, "sheet");
      setState({ activeIntent: "read" }, "surface");
    }
  });
  if (typeof store.batch !== "function") {
    store.setState({ activeWork: cleanWork }, "work");
  }
  return cleanWork;
}

/**
 * Pure glitch-free transition for sheet subtabs stored on EkovozStore.
 */
export function setSheetSubtab(store, sheetId, subtabId) {
  if (!store || typeof store.getState !== "function" || typeof store.setState !== "function") {
    return null;
  }
  const normalizedSheet = sheetId === "improve" ? "field" : sheetId === "dosis" ? "share" : sheetId === "workshop" ? "field" : String(sheetId || "study");
  const cur = store.getState().activeSubtabBySheet || DEFAULT_SUBTABS_BY_SHEET;
  const cleanSubtab = String(subtabId || "").trim();
  if (!cleanSubtab || cur[normalizedSheet] === cleanSubtab) return cur;
  const next = Object.freeze({ ...cur, [normalizedSheet]: cleanSubtab });
  store.setState({ activeSubtabBySheet: next }, "sheet");
  return next;
}

/**
 * Pure glitch-free update for consolidated printConfig and mirrored scalar print keys.
 */
export function updatePrintConfig(store, patch = {}) {
  if (!store || typeof store.getState !== "function" || typeof store.setState !== "function") {
    return null;
  }
  const st = store.getState();
  const base = st.printConfig || {
    edition: st.edition || DEFAULT_PRINT_CONFIG.edition,
    paperFormat: st.paperFormat || DEFAULT_PRINT_CONFIG.paperFormat,
    orientation: st.orientation || DEFAULT_PRINT_CONFIG.orientation,
    columns: Number(st.columns) || DEFAULT_PRINT_CONFIG.columns,
    fontSizePt: Number(st.fontSizePt) || DEFAULT_PRINT_CONFIG.fontSizePt,
    duplex: st.duplex !== false,
    foliationMode: st.foliationMode || DEFAULT_PRINT_CONFIG.foliationMode,
    activeBranchId: st.activeBranchId ?? null,
    activeTypologyId: st.activeTypologyId ?? null,
  };
  const nextCfg = Object.freeze({ ...base, ...patch });
  const topPatch = { printConfig: nextCfg };
  for (const key of ["edition", "paperFormat", "orientation", "columns", "fontSizePt", "duplex", "activeBranchId", "activeTypologyId"]) {
    if (key in patch) topPatch[key] = patch[key];
  }
  store.setState(topPatch, "print");
  return nextCfg;
}

export function setWorkspaceMode(store, rawMode = "reader") {
  const cleanMode = String(rawMode || "").trim().toLowerCase() === "studio" ? "studio" : "reader";
  const cleanPlane = cleanMode === "studio" ? "technical" : "editorial";
  if (!store || typeof store.setState !== "function") return cleanMode;
  store.setState({ workspaceMode: cleanMode, surfacePlane: cleanPlane }, "surface");
  return cleanMode;
}

/**
 * Conmuta el plano de superficie (`editorial` | `technical`) bajo dueño único (`D1-HIG9`).
 */
export function setSurfacePlane(store, rawPlane = "editorial") {
  const cleanPlane = String(rawPlane || "").trim().toLowerCase() === "technical" ? "technical" : "editorial";
  const cleanMode = cleanPlane === "technical" ? "studio" : "reader";
  if (!store || typeof store.setState !== "function") return cleanPlane;
  store.setState({ surfacePlane: cleanPlane, workspaceMode: cleanMode }, "surface");
  return cleanPlane;
}

/**
 * Sincroniza `paperFormat` (`a4` | `letter`) en SSOT compartido entre Impresión y Obras Hermanas (`D11-HIG9`).
 */
export function syncCanonicalPaperFormat(store, rawFormat = "a4") {
  const cleanFmt = String(rawFormat || "").trim().toLowerCase() === "letter" ? "letter" : "a4";
  if (!store || typeof store.setState !== "function") return cleanFmt;
  updatePrintConfig(store, { paperFormat: cleanFmt });
  return cleanFmt;
}
