// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D1-R44 (1A) · D9-R44 (9A) | projection_contract.js]
// web/mostrador/projection_contract.js — Proyección pura del estado activo sobre el cromo pegajoso de las gavetas.
// Frontera de mutación ∂(C) = 0 respecto del controlador: sólo lee `state` y escribe nodos DOM ya existentes.
// ============================================================================

import { STORE_DOMAIN_OWNERS, VALID_ACTIVE_MODALS } from "./state_store.js";

/**
 * Sincroniza `#stickyDrawerContextHeader` con el pasaje y la lengua activos (`D1-R44`, `DEB-R44-02`):
 * - `#stickyActiveVersePill` ← `📖 LIBRO cap:vers`
 * - `#stickyActiveLangBtn` ← `🌍 LANG`
 * - `#btnStickyJumpToCanvas` ← rótulo bilingüe
 * - la barra completa se oculta (`hidden`) cuando ninguna de las 4 gavetas está abierta (`!state.activeSheet`).
 * Devuelve `true` si la barra quedó visible.
 */
export function syncStickyDrawerContextHeader(state = {}, getEl, targetDoc) {
  if (typeof getEl !== "function") return false;
  const header = getEl("stickyDrawerContextHeader", targetDoc);
  const visible = Boolean(state.activeSheet);
  if (header) {
    header.hidden = !visible;
    if (typeof header.setAttribute === "function") {
      header.setAttribute("data-active-sheet", visible ? String(state.activeSheet) : "");
    }
  }
  const versePill = getEl("stickyActiveVersePill", targetDoc);
  if (versePill) {
    versePill.textContent = `📖 ${state.book || "GEN"} ${Number(state.chapter) || 1}:${Number(state.verse) || 1}`;
  }
  const langBtn = getEl("stickyActiveLangBtn", targetDoc);
  if (langBtn) {
    langBtn.textContent = `🌍 ${String(state.lang || "es").toUpperCase()}`;
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
  const surfaceMode = state.surfaceMode === "studio" ? "studio" : "reader";
  const theme = ["light", "sepia", "dark"].includes(state.appearanceTheme) ? state.appearanceTheme : "light";
  const fontFamily = state.fontFamily === "sans" ? "sans" : "serif";
  const fontScale = Number.isFinite(Number(state.fontScale))
    ? Math.max(0.85, Math.min(1.5, Number(state.fontScale)))
    : 1.0;
  const stealth = Boolean(state.stealthMode);
  const activeModal =
    state.activeModal && VALID_ACTIVE_MODALS.has(state.activeModal)
      ? String(state.activeModal)
      : "";
  const storeDomains = Object.keys(STORE_DOMAIN_OWNERS).join(",");

  for (const el of targets) {
    if (typeof el.setAttribute === "function") {
      el.setAttribute("data-surface-mode", surfaceMode);
      el.setAttribute("data-theme", theme);
      el.setAttribute("data-font-family", fontFamily);
      el.setAttribute("data-stealth-mode", stealth ? "true" : "false");
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

