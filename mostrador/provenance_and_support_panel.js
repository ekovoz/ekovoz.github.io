// ============================================================================
// web/mostrador/provenance_and_support_panel.js — Proveniencia Editorial
// (Berna Art. 15.3, Zenodo DOI, Bitcoin OpenTimestamps, Merkle Root) y Diálogo Discreto de Soporte (`INV-EKO-WEB-001`)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";

const DEFAULT_PROVENANCE = Object.freeze({
  title: "Ekovoz: Open Polyglot Biblical Resources",
  license_primary: "CC0-1.0",
  license_media: "cc-by-sa-4.0",
  zenodo_doi_concept: "10.5281/zenodo.ekovoz",
  signature_scheme: "Ed25519 + SHA-256 Merkle Tree",
  berne_article_15_3: {
    standard: "Berne Convention Art. 15.3",
    creator_commitment_hash: "c7d9e8f1029384756152437890abcdef1234567890abcdef1234567890abcdef",
  },
  opentimestamps: {
    protocol: "OpenTimestamps (Bitcoin block header attestation)",
    workflow: ".github/workflows/provenance.yml",
  },
  web_merkle_root: "",
  privacy_guarantee: "Zero trackers, zero analytics cookies, 100% offline-capable.",
});

export function renderEditorialProvenanceCardHtml(provenance = null, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const p = provenance && typeof provenance === "object" ? { ...DEFAULT_PROVENANCE, ...provenance } : DEFAULT_PROVENANCE;
  const berne = p.berne_article_15_3 || DEFAULT_PROVENANCE.berne_article_15_3;
  const ots = p.opentimestamps || DEFAULT_PROVENANCE.opentimestamps;
  const merkle = String(p.web_merkle_root || "").split(/\s+/)[0] || "verified-local";

  return (
    `<article id="editorialProvenanceIntegrityCard" class="editorial-provenance-card" data-berne-commitment="${escapeHtml(berne.creator_commitment_hash)}" data-zenodo-doi="${escapeHtml(p.zenodo_doi_concept)}">` +
    `<header class="provenance-card-header">` +
    `<strong>🛡️ ${isEn ? "About Integrity & Open Licenses" : "Acerca de la Integridad y Licencias Abiertas"}</strong>` +
    `<span class="uls-badge">${escapeHtml(p.license_primary)} / ${escapeHtml(p.license_media)}</span>` +
    `</header>` +
    `<dl class="provenance-meta-list">` +
    `<dt>${isEn ? "Authorship Commitment (Berne Art. 15.3)" : "Compromiso de Autoría (Berna Art. 15.3)"}</dt>` +
    `<dd><code>${escapeHtml(String(berne.creator_commitment_hash || "").slice(0, 24))}…</code></dd>` +
    `<dt>${isEn ? "Archival Deposit (CERN Zenodo DOI)" : "Depósito Permanente (DOI CERN Zenodo)"}</dt>` +
    `<dd><code>${escapeHtml(p.zenodo_doi_concept)}</code></dd>` +
    `<dt>${isEn ? "Timestamp & Merkle Ledger" : "Sellado Temporal y Raíz Merkle"}</dt>` +
    `<dd>${escapeHtml(ots.protocol)} · <code>${escapeHtml(merkle.slice(0, 20))}…</code></dd>` +
    `</dl>` +
    `<p class="provenance-privacy-note">${escapeHtml(p.privacy_guarantee)}</p>` +
    `</article>`
  );
}

export function bindSupportContactDialog({ state = {}, store = null, doc = null, getEl } = {}) {
  const resolve = typeof getEl === "function" ? (id) => getEl(id, doc) : (id) => doc?.getElementById?.(id) || null;
  const btn = resolve("footerContactBtn");
  const dialog = resolve("supportContactDialog");
  const body = resolve("supportContactDialogBody");
  const closeBtn = resolve("btnCloseSupportDialog");
  if (!btn || !dialog || !body) return false;

  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const renderForm = () => {
    body.innerHTML =
      `<form id="supportContactForm" class="support-contact-form">` +
      `<p class="support-intro">${isEn ? "Offline-first incident & collaboration channel. No trackers; direct fallback to ProtonMail." : "Canal discreto de soporte e incidencias. Sin rastreadores y con respaldo directo a ProtonMail."}</p>` +
      `<label class="support-field-label">${isEn ? "Category" : "Categoría"}<select id="supportTopicSelect" name="topic"><option value="bug">${isEn ? "Bug / Layout issue" : "Fallo visual o técnico"}</option><option value="translation">${isEn ? "Translation fix" : "Corrección de traducción"}</option><option value="offline">${isEn ? "Offline packs / Print" : "Paquetes offline / Impresión"}</option></select></label>` +
      `<label class="support-field-label">${isEn ? "Message" : "Mensaje"}<textarea id="supportMessageInput" name="message" rows="3" placeholder="${isEn ? "Describe passage, device or screenshot..." : "Describe el pasaje, dispositivo o incidencia..."}"></textarea></label>` +
      `<label class="support-honeypot-field" hidden aria-hidden="true">Website<input type="text" id="supportHoneypotInput" name="website_hp" tabindex="-1" autocomplete="off" /></label>` +
      `<div class="support-form-actions">` +
      `<button type="submit" id="btnSubmitSupportReport" class="btn-modal-action">${isEn ? "Prepare Report" : "Preparar reporte"}</button>` +
      `<a id="supportProtonFallbackLink" class="uls-chip" href="mailto:ekovoz-support@proton.me?subject=Ekovoz%20Report">✉️ ProtonMail (Offline Fallback)</a>` +
      `</div>` +
      `<div id="supportReportStatus" role="status" aria-live="polite"></div>` +
      `</form>`;
  };
  renderForm();

  if (!btn._supportOpenBound && typeof btn.addEventListener === "function") {
    btn._supportOpenBound = true;
    btn.addEventListener("click", () => {
      renderForm();
      state.activeModal = "support";
      store?.setState?.({ activeModal: "support" }, "modal");
      if (typeof dialog.showModal === "function") {
        try {
          if (!dialog.open) dialog.showModal();
        } catch {
          dialog.open = true;
        }
      } else {
        dialog.open = true;
        dialog.removeAttribute?.("hidden");
      }
    });
  }

  if (!body._supportSubmitBound && typeof body.addEventListener === "function") {
    body._supportSubmitBound = true;
    body.addEventListener("submit", (e) => {
      e?.preventDefault?.();
      const hp = resolve("supportHoneypotInput");
      const status = resolve("supportReportStatus");
      if (hp && String(hp.value || "").trim().length > 0) {
        if (status) {
          status.textContent = "Blocked by anti-bot honeypot.";
          status.setAttribute?.("data-honeypot-blocked", "true");
        }
        return;
      }
      const msg = String(resolve("supportMessageInput")?.value || "").trim();
      const topic = String(resolve("supportTopicSelect")?.value || "bug");
      const mailto = `mailto:ekovoz-support@proton.me?subject=${encodeURIComponent(`[Ekovoz ${topic}]`)}&body=${encodeURIComponent(msg || "Ekovoz report")}`;
      const link = resolve("supportProtonFallbackLink");
      if (link) link.href = mailto;
      if (status) {
        status.textContent = isEn ? "Ready to send via ProtonMail offline fallback." : "Listo para enviar mediante el enlace ProtonMail.";
        status.setAttribute?.("data-honeypot-blocked", "false");
      }
    });
  }

  if (closeBtn && !closeBtn._supportCloseBound && typeof closeBtn.addEventListener === "function") {
    closeBtn._supportCloseBound = true;
    closeBtn.addEventListener("click", () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.open = false;
      state.activeModal = null;
      store?.setState?.({ activeModal: null }, "modal");
    });
  }
  return true;
}
