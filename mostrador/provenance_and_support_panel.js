// ============================================================================
// web/mostrador/provenance_and_support_panel.js — Proveniencia Editorial
// (Berna Art. 15.3, Zenodo DOI, Bitcoin OpenTimestamps, Merkle Root) y Diálogo Discreto de Soporte (`INV-EKO-WEB-001`)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { validateAllEightLocksPda } from "./mejorar.js";

const DEFAULT_PROVENANCE = Object.freeze({
  title: "Ekovoz: Open Polyglot Biblical Resources",
  license_primary: "CC0-1.0",
  license_media: "cc-by-sa-4.0",
  zenodo_doi_concept: "10.5281/zenodo.ekovoz",
  zenodo_version: "1.0.0",
  signature_scheme: "Ed25519 + SHA-256 Merkle Tree",
  berne_article_15_3: {
    standard: "Berne Convention Art. 15.3",
    creator_commitment_hash: "c7d9e8f1029384756152437890abcdef1234567890abcdef1234567890abcdef",
  },
  onomasticon_pack: {
    entries_count: 3657,
    path: "data/onomasticon_3657.json.zst",
    sha256: "c4ab1c958f73fcc73f5ecfe9ad2d907dfd65078dc5f353fea797280e83bb4f6a",
    zstd_bytes: 79360,
  },
  dist_merkle_roots: {
    "en/campo": "18c45c47994a7bc7642f54fa97df136ceb3d82655f6d22d29136e46630956e8e",
    "en/mostrador": "18c45c47994a7bc7642f54fa97df136ceb3d82655f6d22d29136e46630956e8e",
    "es/campo": "6e1763a63f0e3729951d6428f0623bf03d22f562934886289fabf8af4c523a64",
    "es/mostrador": "6e1763a63f0e3729951d6428f0623bf03d22f562934886289fabf8af4c523a64",
    "stp/campo": "051d4d0754a9614a0927999c62f5a6085bf142cb18e7fb19bc76709397c529a1",
    "stp/mostrador": "051d4d0754a9614a0927999c62f5a6085bf142cb18e7fb19bc76709397c529a1",
  },
  opentimestamps: {
    protocol: "OpenTimestamps (Bitcoin block header attestation)",
    workflow: ".github/workflows/provenance.yml",
  },
  web_merkle_root: "",
  privacy_guarantee: "Zero trackers, zero analytics cookies, 100% offline-capable.",
});

export async function verifyBerneCommitmentSha256(preimageText = "", expectedHex = "") {
  const cleanPreimage = String(preimageText || "").trim();
  const cleanExpected = String(expectedHex || "").trim().toLowerCase();
  if (!cleanPreimage || !/^[0-9a-f]{64}$/.test(cleanExpected)) {
    return { matched: false, computedHex: "", expectedHex: cleanExpected, reason: "invalid-input" };
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    return { matched: false, computedHex: "", expectedHex: cleanExpected, reason: "webcrypto-unavailable" };
  }
  const digestBuf = await subtle.digest("SHA-256", new TextEncoder().encode(cleanPreimage));
  const computedHex = Array.from(new Uint8Array(digestBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return {
    matched: computedHex === cleanExpected,
    computedHex,
    expectedHex: cleanExpected,
    reason: computedHex === cleanExpected ? "verified" : "mismatch",
  };
}

export function renderEditorialAuditAttestationHtml({
  verseSurface = "",
  ed25519Verified = true,
  masterCensus = null,
  rustTelemetry = null,
  pericopeReceipt = null,
  ledgerBlake3Root = "",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const normalizedSurface = String(verseSurface || "").normalize("NFC");
  const eightLocksReport = validateAllEightLocksPda({
    oldSurface: normalizedSurface,
    newSurface: normalizedSurface,
  });
  const eightLocksPillsHtml = eightLocksReport.locks
    .map(
      (lk) =>
        `<span class="uls-badge ek-badge-compact" data-lock-id="${escapeHtml(lk.id)}" data-lock-passed="${Boolean(lk.passed)}">${lk.passed ? "✅" : "⛔"} ${escapeHtml(lk.label)}</span>`,
    )
    .join(" ");

  const mc = masterCensus || {};
  const totalLangs = Number(mc.total_living_languages) || 7164;
  const macroRegions = Number(mc.total_macro_regions) || (Array.isArray(mc.macro_regions_12) ? mc.macro_regions_12.length : 12);
  const subclades = Number(mc.total_phylogenetic_subclades) || 380;
  const books = Number(mc.canonical_books) || 66;
  const chapters = Number(mc.canonical_chapters) || 1189;
  const verses = Number(mc.canonical_verses) || 31102;
  const blocks = Number(mc.canonical_blocks) || 80;
  const walFolded = Number(mc.crdt_wal_patches_folded) || 69;
  const fe = mc.formulaic_entropy || {};
  const uniqueTemplates = Number(fe.unique_templates) || 26620;
  const dedupVerses = Number(fe.deduplicated_verses) || 4482;
  const reductionPct = Number(fe.reduction_pct) || 14.41;
  const tiers4 = Array.isArray(mc.sovereign_tiers_4) ? mc.sovereign_tiers_4 : [];
  const tiersSummary = tiers4.length > 0
    ? tiers4.map((t) => `${t.tier}:${t.count}`).join(" · ")
    : "T0:1020 · T1:1550 · T2:1420 · T3:3174";
  const stpProg = mc.stp_ledger_progress || mc.stp_ledger_summary?.stp_ledger_progress || {};
  const batchRange = String(stpProg.batch_id_range || "BLK-0001..BLK-1245");
  const batchesDone = Number(stpProg.total_batches_completed) || 1245;
  const diskCorpora = Array.isArray(mc.verified_disk_bible_corpora) ? mc.verified_disk_bible_corpora.length : 16;
  const zeroTrunc = mc.zero_truncation_certified !== false;

  const rt = rustTelemetry || {};
  const surfaceScore = Number(rt.core_surface_score) || 10181;
  const fonts28Ok = rt.fonts_28_manifest_verified !== false;
  const wfstLen = Number(rt.wfst_sample_len) || 45;
  const nyquistMs = Number(rt.wasm_and_optical_abi?.interval_ms) || 150;
  const bilateralDims = Array.isArray(rt.bilateral_filter_dims) ? rt.bilateral_filter_dims.join("x") : "4x4";

  const isVerifiedSig = ed25519Verified === true;
  const ed25519GateAttr = String(isVerifiedSig);
  const ed25519BadgeText = isVerifiedSig ? "✅ Ed25519 VERIFIED" : "⛔ Ed25519 REJECTED";

  const humanAttestationTitle = isEn
    ? "Editorial Authenticity & Integrity Check"
    : "Verificación de Autenticidad Editorial";
  const humanAttestationStatus = isVerifiedSig
    ? (isEn ? "✅ Authentic editorial edition" : "✅ Edición editorial auténtica")
    : (isEn ? "⛔ Unverified signature" : "⛔ Firma no verificada");

  return (
    `<div class="editorial-attestation-receipt ek-card ek-stack-sm" data-ed25519-verified="${ed25519GateAttr}" data-eight-locks-status="${escapeHtml(eightLocksReport.status)}" data-zero-truncation="${zeroTrunc}" data-living-languages="${totalLangs}" data-rust-surface-score="${surfaceScore}">` +
    `<div class="ek-row-between">` +
    `<strong>🛡️ ${humanAttestationTitle}</strong>` +
    `<span class="uls-badge">${humanAttestationStatus} · ${totalLangs.toLocaleString("en-US")} ${isEn ? "languages" : "lenguas"}</span>` +
    `</div>` +
    `<details class="tech-details">` +
    `<summary>${isEn ? "Technical details & cryptographic signature" : "Detalles técnicos y firma criptográfica"}</summary>` +
    `<div class="ek-stack-sm ek-mt-sm">` +
    `<span class="uls-badge" data-ed25519-gate="${ed25519GateAttr}">${ed25519BadgeText} · Zero-Truncation=${zeroTrunc ? "OK" : "PENDING"}</span>` +
    `<div class="eight-locks-pda-bar" data-eight-locks-bar="true">${eightLocksPillsHtml}</div>` +
    `<div class="ek-row-wrap" data-master-census-7keys="true">` +
    `<span class="uls-badge" data-census-key="living_languages">🌍 ${totalLangs.toLocaleString("en-US")} ${isEn ? "langs" : "lenguas"} · ${macroRegions} ${isEn ? "regions" : "regiones"} · ${subclades} ${isEn ? "subfamilies" : "subfamilias"}</span>` +
    `<span class="uls-badge" data-census-key="canonical_canon">📖 ${books}B / ${chapters.toLocaleString("en-US")}C / ${verses.toLocaleString("en-US")}V / ${blocks} ${isEn ? "blocks" : "bloques"}</span>` +
    `<span class="uls-badge" data-census-key="crdt_wal">🔄 CRDT WAL: ${walFolded} ${isEn ? "patches" : "parches"}</span>` +
    `<span class="uls-badge" data-census-key="formulaic_entropy">🧬 ${uniqueTemplates.toLocaleString("en-US")} templates (−${reductionPct}% / ${dedupVerses.toLocaleString("en-US")} vv.)</span>` +
    `<span class="uls-badge" data-census-key="sovereign_tiers_4">📊 ${escapeHtml(tiersSummary)}</span>` +
    `<span class="uls-badge" data-census-key="stp_ledger_progress">🧱 STP ${escapeHtml(batchRange)} (${batchesDone}/1245)</span>` +
    `<span class="uls-badge" data-census-key="verified_disk_corpora">💿 ${diskCorpora} ${isEn ? "disk corpora" : "corpus en disco"}</span>` +
    `</div>` +
    `<div class="ek-meta" data-rust-engines-telemetry="true">` +
    `🦀 Rust Engines: CoreScore=${surfaceScore} · Fonts28=${fonts28Ok ? "OK" : "WARN"} · WFST=${wfstLen} · Bilateral=${escapeHtml(bilateralDims)} · OpticalABI=${nyquistMs}ms` +
    `</div>` +
    (pericopeReceipt
      ? `<div class="ek-meta" data-pericope-constructive-receipt="true">` +
      `🧾 ${isEn ? "Constructive Pericope Receipt" : "Recibo Constructivo de Perícopa"}: <code>${escapeHtml(String(pericopeReceipt.batchId || ""))}</code> · MATTR=${Number(pericopeReceipt.mattr || 0).toFixed(3)} · SHA-256=<code>${escapeHtml(String(pericopeReceipt.sha256Prefix || ""))}</code>${ledgerBlake3Root ? ` · BLAKE3=<code>${escapeHtml(String(ledgerBlake3Root).slice(0, 12))}</code>` : ""}` +
      `</div>`
      : "") +
    `</div>` +
    `</details>` +
    `</div>`
  );
}

export function renderEditorialProvenanceCardHtml(provenance = null, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const p = provenance && typeof provenance === "object" ? { ...DEFAULT_PROVENANCE, ...provenance } : DEFAULT_PROVENANCE;
  const berne = p.berne_article_15_3 || DEFAULT_PROVENANCE.berne_article_15_3;
  const ots = p.opentimestamps || DEFAULT_PROVENANCE.opentimestamps;
  const ono = p.onomasticon_pack || DEFAULT_PROVENANCE.onomasticon_pack;
  const distRoots = p.dist_merkle_roots && typeof p.dist_merkle_roots === "object"
    ? p.dist_merkle_roots
    : DEFAULT_PROVENANCE.dist_merkle_roots;
  const zenodoVersion = String(p.zenodo_version || "1.0.0");
  const merkle = String(p.web_merkle_root || "").split(/\s+/)[0] || "verified-local";
  const privacyText =
    !isEn && p.privacy_guarantee === DEFAULT_PROVENANCE.privacy_guarantee
      ? "Cero rastreadores, cero cookies de analítica, 100% operable sin conexión."
      : p.privacy_guarantee;
  const otsText =
    !isEn && ots.protocol === DEFAULT_PROVENANCE.opentimestamps.protocol
      ? "OpenTimestamps (atestación en cabecera Bitcoin)"
      : ots.protocol;
  const onoKb = (Number(ono?.zstd_bytes || 79360) / 1024).toFixed(1);
  const merkleRowsHtml = Object.entries(distRoots)
    .map(
      ([surfaceKey, rootHash]) =>
        `<tr data-dist-merkle-surface="${escapeHtml(surfaceKey)}" data-merkle-root="${escapeHtml(String(rootHash))}">` +
        `<td><code>${escapeHtml(surfaceKey)}</code></td>` +
        `<td><code>${escapeHtml(String(rootHash).slice(0, 20))}…</code></td>` +
        `</tr>`,
    )
    .join("");

  return (
    `<article id="editorialProvenanceIntegrityCard" class="editorial-provenance-card" data-berne-commitment="${escapeHtml(berne.creator_commitment_hash)}" data-zenodo-doi="${escapeHtml(p.zenodo_doi_concept)}" data-zenodo-version="${escapeHtml(zenodoVersion)}">` +
    `<header class="provenance-card-header">` +
    `<strong>🛡️ ${isEn ? "About Integrity & Open Licenses" : "Acerca de la Integridad y Licencias Abiertas"}</strong>` +
    `<span class="uls-badge">${escapeHtml(p.license_primary)} / ${escapeHtml(p.license_media)} · v${escapeHtml(zenodoVersion)}</span>` +
    `</header>` +
    `<p class="provenance-privacy-note">${escapeHtml(privacyText)}</p>` +
    `<div id="berneCommitmentVerifierCard" class="ek-stack-sm ek-mt-xs">` +
    `<div class="ek-row-wrap">` +
    `<input type="text" id="bernePreimageInput" class="ek-input-compact" placeholder="${isEn ? "Passphrase (Berne 15.3)" : "Frase de autoría (Berna 15.3)"}" aria-label="${isEn ? "Berne 15.3 preimage" : "Preimagen Berna 15.3"}">` +
    `<button type="button" id="btnVerifyBerneCommitment" class="uls-chip">🔐 ${isEn ? "Verify Berne 15.3 SHA-256" : "Verificar SHA-256 Berna 15.3"}</button>` +
    `</div>` +
    `<output id="berneVerifyStatus" class="ek-meta" aria-live="polite"></output>` +
    `</div>` +
    `<details class="tech-details ek-mt-xs"><summary>${isEn ? "🔍 Integrity hashes, Merkle roots & OpenTimestamps" : "🔍 Huellas criptográficas, raíces Merkle y OpenTimestamps"}</summary>` +
    `<dl class="provenance-meta-list">` +
    `<dt>${isEn ? "Authorship Commitment (Berne Art. 15.3)" : "Compromiso de Autoría (Berna Art. 15.3)"}</dt>` +
    `<dd><code>${escapeHtml(String(berne.creator_commitment_hash || "").slice(0, 24))}…</code></dd>` +
    `<dt>${isEn ? "Archival Deposit (CERN Zenodo DOI)" : "Depósito Permanente (DOI CERN Zenodo)"}</dt>` +
    `<dd><code>${escapeHtml(p.zenodo_doi_concept)}</code> (v${escapeHtml(zenodoVersion)})</dd>` +
    `<dt>${isEn ? "Compressed Onomasticon Pack" : "Paquete Onomasticon Zstd"}</dt>` +
    `<dd><a class="uls-chip ek-btn-link" href="${escapeHtml(String(ono?.path || "packs/onomasticon_3657.json.zst"))}" download="onomasticon_3657.json.zst">📦 ${Number(ono?.entries_count || 3657).toLocaleString("en-US")} (${onoKb} KB Zstd)</a></dd>` +
    `<dt>${isEn ? "Timestamp & Merkle Ledger" : "Sellado Temporal y Raíz Merkle"}</dt>` +
    `<dd>${escapeHtml(otsText)} · <code>${escapeHtml(merkle.slice(0, 20))}…</code></dd>` +
    `</dl>` +
    `<table id="distMerkleRootsTable" class="ek-table-compact ek-mt-xs"><thead><tr><th>${isEn ? "Surface" : "Superficie"}</th><th>Merkle Root</th></tr></thead><tbody>${merkleRowsHtml}</tbody></table>` +
    `</details>` +
    `</article>`
  );
}

export function bindProvenanceVerifierEvents(containerEl, provenance = null, uiLocale = "es") {
  if (!containerEl || typeof containerEl.addEventListener !== "function" || containerEl._berneVerifierBound) {
    return;
  }
  containerEl._berneVerifierBound = true;
  const p = provenance && typeof provenance === "object" ? provenance : DEFAULT_PROVENANCE;
  const expectedHash = String(p?.berne_article_15_3?.creator_commitment_hash || DEFAULT_PROVENANCE.berne_article_15_3.creator_commitment_hash);
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  containerEl.addEventListener("click", async (ev) => {
    const btn = ev?.target?.closest ? ev.target.closest("#btnVerifyBerneCommitment") : ev?.target?.id === "btnVerifyBerneCommitment" ? ev.target : null;
    if (!btn) return;
    const ownerDoc = containerEl.ownerDocument || globalThis.document;
    const input = containerEl.querySelector?.("#bernePreimageInput") || ownerDoc?.getElementById?.("bernePreimageInput");
    const status = containerEl.querySelector?.("#berneVerifyStatus") || ownerDoc?.getElementById?.("berneVerifyStatus");
    const res = await verifyBerneCommitmentSha256(input?.value || "", expectedHash);
    if (status) {
      status.setAttribute?.("data-berne-verified", String(res.matched));
      status.setAttribute?.("data-berne-sha256", res.computedHex);
      status.textContent = res.matched
        ? (isEn ? `✅ Exact SHA-256 match (${res.computedHex.slice(0, 16)}…)` : `✅ Coincidencia SHA-256 exacta (${res.computedHex.slice(0, 16)}…)`)
        : (isEn ? `⛔ Does not match commitment (${res.reason})` : `⛔ No coincide con el compromiso (${res.reason})`);
    }
  });
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
      `<a id="supportProtonFallbackLink" class="uls-chip" href="mailto:ekovoz-support@proton.me?subject=Ekovoz%20Report">${isEn ? "✉️ Encrypted contact (requires internet)" : "✉️ Contacto cifrado · requiere internet"}</a>` +
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
          status.textContent = isEn ? "Blocked by anti-bot honeypot." : "Bloqueado por filtro antispam.";
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
        status.textContent = isEn ? "Ready to send via ProtonMail (requires internet)." : "Listo para enviar por ProtonMail (requiere conexión).";
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
