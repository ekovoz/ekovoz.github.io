// ============================================================================
// web/mostrador/authenticity_sheet.js — Hoja de Autenticidad Criptografica y Licencia (SLICE-EKO-EXIT-10)
// Separa la verificacion criptografica (Ed25519, Merkle, OpenTimestamps, Berna 15.3, CC0)
// de las tarjetas sociales del pasaje para mantener cero jerga tecnica en el flujo diario.
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";

/**
 * Renderiza el resumen de autenticidad y licencia CC0 aislado dentro de `#shareAuthenticityUnifiedCard`.
 */
export function renderAuthenticityAndLicenseSheetHtml({
  activeWork = "biblia",
  activeLang = "es",
  editorialProvenance = null,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const prov = editorialProvenance && typeof editorialProvenance === "object" ? editorialProvenance : {};
  const doi = String(prov.doi || prov.zenodoDoi || "10.5281/zenodo.ekovoz");
  const license = String(prov.license || "CC0 1.0");
  return (
    `<div id="authenticityLicenseIsolationNotice" class="ek-mt-xs ek-text-secondary" data-authenticity-unified="true" data-authenticity-isolated="true" data-work="${escapeHtml(activeWork)}" data-lang="${escapeHtml(activeLang)}">` +
    `<span>${isEn ? "Public domain seal" : "Sello de dominio público"}: <strong>${escapeHtml(license)}</strong> · DOI ${escapeHtml(doi)}</span>` +
    `</div>`
  );
}

/**
 * Marca la frontera estructural entre las tarjetas sociales OpenGraph (`slot 0`) y el panel
 * tecnico de firma Ed25519 / Merkle / OpenTimestamps (`slot 1`).
 */
export function bindAuthenticitySheetIsolation({ targetDoc = null, getEl = null } = {}) {
  if (!targetDoc && typeof getEl !== "function") return false;
  const resolve = typeof getEl === "function"
    ? (id) => getEl(id, targetDoc)
    : (id) => (typeof targetDoc?.getElementById === "function" ? targetDoc.getElementById(id) : null);

  const authCard = resolve("shareAuthenticityUnifiedCard");
  const ogPanel = resolve("shareOpenGraphCardPanel");
  if (authCard && typeof authCard.setAttribute === "function") {
    authCard.setAttribute("data-authenticity-isolated", "true");
    authCard.setAttribute("data-slot-order", "1");
  }
  if (ogPanel && typeof ogPanel.setAttribute === "function") {
    ogPanel.setAttribute("data-social-card-isolated", "true");
    ogPanel.setAttribute("data-slot-order", "0");
  }
  return Boolean(authCard || ogPanel);
}
