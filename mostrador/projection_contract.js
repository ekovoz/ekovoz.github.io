// ============================================================================
// @ekovoz-spec[REQ-BIB-012 | D1-R44 (1A) · D9-R44 (9A) | projection_contract.js]
// web/mostrador/projection_contract.js — Proyección pura del estado activo sobre el cromo pegajoso de las gavetas.
// Frontera de mutación ∂(C) = 0 respecto del controlador: sólo lee `state` y escribe nodos DOM ya existentes.
// ============================================================================

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

