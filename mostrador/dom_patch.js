// ============================================================================
// web/mostrador/dom_patch.js — Micro-motor L0 declarativo sin dependencias
// Decisiones D7-R6A (7A) + D8-R6A (8A) · LCOM4 = 1, out_deg = 0.
// Síntesis de node-delta (parcheo por clave sin destruir foco) + delegate.js
// (delegación [data-action] con AbortController, cero flags _*Bound en nodos).
// ============================================================================

const SURFACE_ACTION_CONTROLLERS = new WeakMap();

/**
 * Updates textContent and attributes on matched selectors inside rootEl without innerHTML.
 */
export function patchTextAndAttrs(rootEl, entries = []) {
  if (!rootEl || !Array.isArray(entries)) return 0;
  let updated = 0;
  for (const entry of entries) {
    if (!entry) continue;
    const target =
      entry.selector && typeof rootEl.querySelector === "function"
        ? rootEl.querySelector(entry.selector)
        : entry.id && typeof rootEl.getElementById === "function"
          ? rootEl.getElementById(entry.id)
          : entry.el || rootEl;
    if (!target) continue;
    if ("text" in entry && entry.text !== undefined) {
      const nextText = String(entry.text);
      if (target.textContent !== nextText) target.textContent = nextText;
    }
    if (entry.attrs && typeof entry.attrs === "object" && typeof target.setAttribute === "function") {
      for (const [k, v] of Object.entries(entry.attrs)) {
        if (v === null || v === undefined || v === false) {
          target.removeAttribute?.(k);
        } else {
          const valStr = v === true ? "true" : String(v);
          if (target.getAttribute?.(k) !== valStr) target.setAttribute(k, valStr);
        }
      }
    }
    if ("hidden" in entry && typeof entry.hidden === "boolean") {
      target.hidden = entry.hidden;
    }
    updated += 1;
  }
  return updated;
}

/**
 * Reconciles keyed child elements in-place inside containerEl, preserving node identity and focus.
 */
export function reconcileKeyedList(containerEl, items = [], getKey, createEl, patchEl) {
  if (!containerEl || typeof getKey !== "function") return [];
  const docRef = containerEl.ownerDocument || (typeof document !== "undefined" ? document : null);
  const supportsDomChildren =
    typeof containerEl.appendChild === "function" &&
    typeof containerEl.insertBefore === "function" &&
    (Array.isArray(containerEl.children) || typeof containerEl.childNodes?.length === "number") &&
    docRef &&
    typeof docRef.createElement === "function";

  if (!supportsDomChildren) {
    const out = [];
    for (let i = 0; i < items.length; i += 1) {
      const el = createEl(items[i], i, docRef);
      if (el && typeof patchEl === "function") patchEl(el, items[i], i);
      out.push(el);
    }
    containerEl._reconciledItemsCount = out.length;
    return out;
  }

  const existingByKey = new Map();
  const prevChildren = Array.from(containerEl.children || []);
  for (const child of prevChildren) {
    const k = child?.getAttribute?.("data-key") || child?.dataset?.key;
    if (k !== undefined && k !== null && k !== "") existingByKey.set(String(k), child);
  }

  const nextNodes = [];
  const seenKeys = new Set();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const key = String(getKey(item, i));
    seenKeys.add(key);
    let node = existingByKey.get(key);
    if (!node) {
      node = createEl(item, i, docRef);
      if (node && typeof node.setAttribute === "function") node.setAttribute("data-key", key);
    }
    if (node && typeof patchEl === "function") patchEl(node, item, i);
    if (node) nextNodes.push(node);
  }

  for (const child of prevChildren) {
    const k = child?.getAttribute?.("data-key") || child?.dataset?.key;
    if (!k || !seenKeys.has(String(k))) {
      child.remove?.();
    }
  }

  for (let i = 0; i < nextNodes.length; i += 1) {
    const node = nextNodes[i];
    const currentAt = containerEl.children?.[i] || null;
    if (currentAt !== node) {
      containerEl.insertBefore(node, currentAt);
    }
  }
  return nextNodes;
}

/**
 * Binds one delegated handler per surface root for `[data-action]` events via AbortController.
 */
export function bindSurfaceActions(rootEl, handlers = {}, opts = {}) {
  if (!rootEl || typeof rootEl.addEventListener !== "function") return () => {};
  const scopeKey = String(opts.scope || "default");
  let scopeMap = SURFACE_ACTION_CONTROLLERS.get(rootEl);
  if (!scopeMap) {
    scopeMap = new Map();
    SURFACE_ACTION_CONTROLLERS.set(rootEl, scopeMap);
  }
  const prevCtrl = scopeMap.get(scopeKey);
  if (prevCtrl && typeof prevCtrl.abort === "function") prevCtrl.abort();

  const ctrl = typeof AbortController === "function" ? new AbortController() : null;
  if (ctrl) scopeMap.set(scopeKey, ctrl);

  const eventTypes = Array.isArray(opts.events) && opts.events.length > 0 ? opts.events : ["click", "change", "input"];
  const actionAttr = String(opts.actionAttr || "data-action");
  const actionNames = Object.keys(handlers);
  const dispatch = (evt) => {
    const rawTarget = evt?.target || evt?.currentTarget || rootEl;
    const actionEl =
      rawTarget && typeof rawTarget.closest === "function"
        ? rawTarget.closest(`[${actionAttr}]`)
        : rawTarget?.getAttribute?.(actionAttr)
          ? rawTarget
          : rootEl?.getAttribute?.(actionAttr)
            ? rootEl
            : null;
    const actionName = actionEl?.getAttribute?.(actionAttr);
    let handler = actionName ? handlers[actionName] : null;
    if (!handler && actionNames.length === 1 && (!evt || (!evt?.target?.closest && !evt?.target?.getAttribute))) {
      handler = handlers[actionNames[0]];
    }
    if (typeof handler === "function") {
      handler(evt, actionEl || rootEl);
    }
  };

  for (const evType of eventTypes) {
    rootEl.addEventListener(evType, dispatch, ctrl ? { signal: ctrl.signal } : false);
  }
  return () => {
    ctrl?.abort();
    if (!ctrl && typeof rootEl.removeEventListener === "function") {
      for (const evType of eventTypes) rootEl.removeEventListener(evType, dispatch);
    }
  };
}

/**
 * Writes state patches strictly through ctx.store when present, keeping test mocks compatible.
 */
export function patchStoreState(ctx, patch = {}, domain = "*") {
  if (!patch || typeof patch !== "object") return false;
  if (ctx?.store && typeof ctx.store.setState === "function") {
    return ctx.store.setState(patch, domain);
  }
  if (ctx?.state && typeof ctx.state === "object") {
    Object.assign(ctx.state, patch);
    return true;
  }
  return false;
}
