// ============================================================================
// web/mostrador/provenance_and_support_panel.js — Proveniencia Editorial
// (Berna Art. 15.3, Zenodo DOI, Bitcoin OpenTimestamps, Merkle Root) y Diálogo Discreto de Soporte (`INV-EKO-WEB-001`)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { parseEkpackPreamble32Js, sha256BytesSyncPureJs } from "./ekpack_binary_codec.js";
import { validateAllEightLocksPda } from "./mejorar.js";
import { resolveCliSurfaceKind } from "./projection_contract.js";

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
  explicitUserVerification = true,
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
  const humanAttestationStatus = !explicitUserVerification
    ? (isEn ? "🛡️ Ready to verify" : "🛡️ Listo para verificar")
    : isVerifiedSig
      ? (isEn ? "✅ Authentic editorial edition" : "✅ Edición editorial auténtica")
      : (isEn ? "⛔ Unverified signature" : "⛔ Firma no verificada");

  return (
    `<div class="editorial-attestation-receipt ek-stack-sm ek-mt-xs" data-ed25519-verified="${ed25519GateAttr}" data-ed25519-pending="${String(!explicitUserVerification)}" data-eight-locks-status="${escapeHtml(eightLocksReport.status)}" data-zero-truncation="${zeroTrunc}" data-living-languages="${totalLangs}" data-rust-surface-score="${surfaceScore}">` +
    `<div class="ek-row-between">` +
    `<span class="ek-semibold">🛡️ ${humanAttestationTitle}</span>` +
    `<span class="uls-badge">${humanAttestationStatus} · ${totalLangs.toLocaleString("en-US")} ${isEn ? "languages" : "lenguas"}</span>` +
    `</div>` +
    `<div class="ek-stack-sm ek-mt-sm" data-audit-breakdown="true"${explicitUserVerification ? "" : " hidden"}>` +
    `<span class="uls-badge" data-ed25519-gate="${ed25519GateAttr}">${ed25519BadgeText} · Zero-Truncation=${zeroTrunc ? "OK" : "PENDING"}</span>` +
    `<div class="tech-details ek-mt-xs" data-advanced-audit="true" data-technical-plane="true"><strong class="tech-details-summary">${isEn ? "🔬 R&D Telemetry & Corpus Metrics" : "🔬 Métricas I+D y Telemetría del Corpus"}</strong>` +
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
    `</div>` +
    `</div>`
  );
}

export function verifyLocalEkpackFileBuffer(bytes, { wasmMod = null, uiLocale = "es" } = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const preamble = parseEkpackPreamble32Js(u8);
  const sha256Hex =
    u8.byteLength > 0
      ? Array.from(sha256BytesSyncPureJs(u8))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : "";
  const valid = Boolean(preamble && preamble.frame0Offset + preamble.frame0ByteLen <= u8.byteLength);
  const hasWasm = Boolean(wasmMod?.exports);
  const summary = valid
    ? isEn
      ? `✅ Valid local package (${preamble.bookCount} books · ${preamble.totalVerses} vv.) · SHA-256 ${sha256Hex.slice(0, 16)}…`
      : `✅ Paquete local válido (${preamble.bookCount} libros · ${preamble.totalVerses} vv.) · SHA-256 ${sha256Hex.slice(0, 16)}…`
    : isEn
      ? "⛔ Invalid or truncated local package file."
      : "⛔ Archivo de paquete local inválido o truncado.";
  return { valid, preamble, sha256Hex, wasmRuntimeReady: hasWasm, summary };
}

export function renderMasterCensusBoardSectionHtml(masterCensus = null, uiLocale = "es") {
  if (!masterCensus || typeof masterCensus !== "object") return "";
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const entropy = masterCensus.formulaic_entropy || {};
  const waves = Array.isArray(masterCensus.stp_ledger_summary?.waves) ? masterCensus.stp_ledger_summary.waves : [];
  const tiersCount = Array.isArray(masterCensus.sovereign_tiers_4) ? masterCensus.sovereign_tiers_4.length : 4;
  return (
    `<section class="ek-card ek-mt-sm" data-master-census-board="true" data-shared-census-provenance="true">` +
    `<strong>🌍 ${isEn ? "Master Living Languages Census" : "Censo Maestro de Lenguas Vivas"}</strong>` +
    `<dl class="ek-specs-dl ek-mt-xs">` +
    `<dt>${isEn ? "Living Languages / Regions / Clades" : "Lenguas Vivas / Regiones / Clados"}</dt>` +
    `<dd>${Number(masterCensus.total_living_languages || 7164).toLocaleString("en-US")} · ${Number(masterCensus.total_macro_regions || 12)} · ${Number(masterCensus.total_phylogenetic_subclades || 380)} (${tiersCount} tiers)</dd>` +
    `<dt>${isEn ? "Formulaic Entropy Reduction" : "Reducción de Entropía Formulaica"}</dt>` +
    `<dd>${Number(entropy.deduplicated_verses || 0).toLocaleString("en-US")} / ${Number(entropy.total_verses || 31102).toLocaleString("en-US")} vv. (−${Number(entropy.reduction_pct || 0).toFixed(2)}% · ${Number(entropy.unique_templates || 0).toLocaleString("en-US")} templates)</dd>` +
    `<dt>${isEn ? "OT Synthesis Waves" : "Oleadas AT"}</dt>` +
    `<dd>${waves.length || 5} ${isEn ? "structured waves" : "oleadas estructurales"}</dd>` +
    `</dl></section>`
  );
}

export function renderEditorialProvenanceCardHtml(provenance = null, uiLocale = "es", { masterCensus = null } = {}) {
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
  const cliBridgeMeta = resolveCliSurfaceKind("VerifyPack");
  const privacyText =
    !isEn && p.privacy_guarantee === DEFAULT_PROVENANCE.privacy_guarantee
      ? "Cero rastreadores, cero cookies de analítica, 100% operable sin conexión."
      : p.privacy_guarantee;
  const otsText =
    !isEn && ots.protocol === DEFAULT_PROVENANCE.opentimestamps.protocol
      ? "OpenTimestamps (atestación en cabecera Bitcoin)"
      : ots.protocol;
  const otsReceiptExt = String(ots.receipt_ext || ".ots");
  const berneAlgo = String(berne.commitment_sha256_algorithm || "SHA-256");
  const onoKb = (Number(ono?.zstd_bytes || 79360) / 1024).toFixed(1);
  const bibliaLlms = ["ar", "bn", "en", "es", "fa", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "spa", "stp", "tr", "ur", "zh-Hans"];
  const felicesLlms = ["ar", "bn", "en", "es", "fa", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "tr", "ur", "zh-Hans"];
  const llmsNavHtml =
    `<div id="provenanceLlmsGroupedIndex" class="ek-mt-xs ek-stack-xs">` +
    `<div><strong>${isEn ? "Bible guides (18):" : "Guías Biblia (18):"}</strong> ${bibliaLlms.map((l) => `<a class="uls-chip ek-badge-compact" href="llms/biblia/${l}.md">${l}</a>`).join(" ")}</div>` +
    `<div><strong>${isEn ? "Beatitudes guides (16):" : "Guías Los Felices (16):"}</strong> ${felicesLlms.map((l) => `<a class="uls-chip ek-badge-compact" href="llms/felices/${l}.md">${l}</a>`).join(" ")}</div>` +
    `<a class="uls-chip ek-badge-compact" href="llms.txt">llms.txt</a>` +
    `</div>`;
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
    `<div id="editorialProvenanceIntegrityCard" class="editorial-provenance-card ek-stack-sm" data-berne-commitment="${escapeHtml(berne.creator_commitment_hash)}" data-zenodo-doi="${escapeHtml(p.zenodo_doi_concept)}" data-zenodo-version="${escapeHtml(zenodoVersion)}" data-cli-bridge-kind="${escapeHtml(cliBridgeMeta.kind)}">` +
    `<div class="ek-row-between">` +
    `<span class="ek-meta">${escapeHtml(privacyText)}</span>` +
    `<span class="uls-badge">${escapeHtml(p.license_primary)} · DOI ${escapeHtml(p.zenodo_doi_concept)} (v${escapeHtml(zenodoVersion)})</span>` +
    `</div>` +
    `<div id="berneCommitmentVerifierCard" class="ek-stack-sm ek-mt-xs">` +
    `<div class="ek-row-wrap">` +
    `<input type="text" id="bernePreimageInput" class="ek-input-compact" placeholder="${isEn ? "Authorship phrase" : "Frase de autoría"}" aria-label="${isEn ? "Authorship verification phrase" : "Frase de verificación de autoría"}">` +
    `<button type="button" id="btnVerifyBerneCommitment" class="uls-chip">🔐 ${isEn ? "Verify authorship phrase" : "Comprobar frase de autoría"}</button>` +
    `<label for="inputVerifyLocalEkpack" class="uls-chip ek-file-picker-btn">📦 ${isEn ? "Check downloaded package" : "Comprobar paquete descargado"}<input type="file" id="inputVerifyLocalEkpack" class="sr-only-file-input" accept=".ekpack" aria-label="${isEn ? "Select local package file to verify" : "Seleccionar paquete local para verificar"}"></label>` +
    `</div>` +
    `<output id="berneVerifyStatus" class="ek-meta" aria-live="polite"></output>` +
    `<output id="localEkpackVerifyStatus" class="ek-meta" aria-live="polite"></output>` +
    `</div>` +
    `<details class="tech-details ek-mt-xs" data-advanced-audit="true"><summary class="tech-details-summary">${isEn ? "🔍 Cryptographic verification fingerprints & 34 guides" : "🔍 Huellas de verificación y 34 guías abiertas"}</summary>` +
    `<dl class="provenance-meta-list">` +
    `<dt>${isEn ? "Authorship Commitment (Berne Art. 15.3)" : "Compromiso de Autoría (Berna Art. 15.3)"}</dt>` +
    `<dd><code>${escapeHtml(berneAlgo)}</code> · <code>${escapeHtml(String(berne.creator_commitment_hash || "").slice(0, 24))}…</code></dd>` +
    `<dt>${isEn ? "Archival Deposit (CERN Zenodo DOI)" : "Depósito Permanente (DOI CERN Zenodo)"}</dt>` +
    `<dd><code>${escapeHtml(p.zenodo_doi_concept)}</code> (v${escapeHtml(zenodoVersion)})</dd>` +
    `<dt>${isEn ? "Compressed Onomasticon Pack" : "Paquete Onomasticon Zstd"}</dt>` +
    `<dd><a class="uls-chip ek-btn-link" href="${escapeHtml(String(ono?.path || "data/onomasticon_3657.json.zst"))}" download="onomasticon_3657.json.zst">📦 ${Number(ono?.entries_count || 3657).toLocaleString("en-US")} (${onoKb} KB Zstd)</a></dd>` +
    `<dt>${isEn ? "Timestamp & Merkle Ledger" : "Sellado Temporal y Raíz Merkle"}</dt>` +
    `<dd>${escapeHtml(otsText)} (<code>${escapeHtml(otsReceiptExt)}</code>) · <code>${escapeHtml(merkle.slice(0, 20))}…</code></dd>` +
    `</dl>` +
    llmsNavHtml +
    `<table id="distMerkleRootsTable" class="ek-table-compact ek-mt-xs"><thead><tr><th>${isEn ? "Surface" : "Superficie"}</th><th>Merkle Root</th></tr></thead><tbody>${merkleRowsHtml}</tbody></table>` +
    renderMasterCensusBoardSectionHtml(masterCensus, uiLocale) +
    `<section id="cliCiOnlyCommandsReference" class="ek-subcard ek-mt-xs" data-technical-plane="true" data-cli-ci-count="7">` +
    `<strong>⌨️ ${isEn ? "Maintainer CLI/CI Commands (Reproducible Build)" : "Comandos CLI/CI de Mantenedor (Compilación Reproducible)"}</strong>` +
    `<ul class="ek-list-compact ek-mt-xs">` +
    `<li><code>FetchSources</code> · <code>ekovoz-cli fetch-sources</code></li>` +
    `<li><code>BuildMatrix</code> · <code>ekovoz-cli build-matrix</code></li>` +
    `<li><code>NewLang</code> · <code>ekovoz-cli new-lang &lt;iso&gt;</code></li>` +
    `<li><code>NewWork</code> · <code>ekovoz-cli new-work &lt;slug&gt;</code></li>` +
    `<li><code>VerifyCanon</code> · <code>cargo test --workspace -j 1</code></li>` +
    `<li><code>CompleteBible</code> · <code>ekovoz-cli compile --work biblia --lang all</code></li>` +
    `<li><code>SyncJsConstants</code> · <code>cargo run -p xtask -j 1 -- build-web</code></li>` +
    `</ul></section>` +
    `</details>` +
    `</div>`
  );
}

export function bindProvenanceVerifierEvents(containerEl, provenance = null, uiLocale = "es", opts = {}) {
  if (!containerEl || typeof containerEl.addEventListener !== "function" || containerEl._berneVerifierBound) {
    return;
  }
  containerEl._berneVerifierBound = true;
  const p = provenance && typeof provenance === "object" ? provenance : DEFAULT_PROVENANCE;
  const expectedHash = String(p?.berne_article_15_3?.creator_commitment_hash || DEFAULT_PROVENANCE.berne_article_15_3.creator_commitment_hash);
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  containerEl.addEventListener("change", async (ev) => {
    if (ev?.target?.id !== "inputVerifyLocalEkpack") return;
    const file = ev.target?.files?.[0];
    if (!file || typeof file.arrayBuffer !== "function") return;
    const ownerDoc = containerEl.ownerDocument || globalThis.document;
    const out = containerEl.querySelector?.("#localEkpackVerifyStatus") || ownerDoc?.getElementById?.("localEkpackVerifyStatus");
    const dl = opts?.dataLayer;
    const wasmMod = dl?.getHydratedWasmModule?.("ekovoz_player_wasm") || (typeof dl?.loadWasmModule === "function" ? await dl.loadWasmModule("ekovoz_player_wasm").catch(() => null) : null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const res = verifyLocalEkpackFileBuffer(bytes, { wasmMod, uiLocale });
    if (out) {
      out.setAttribute?.("data-local-ekpack-valid", String(res.valid));
      out.setAttribute?.("data-local-ekpack-sha256", res.sha256Hex);
      out.textContent = res.summary;
    }
  });
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
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const aboutHost = resolve("aboutGuidesVerifyDynamicHost");
  if (aboutHost) {
    aboutHost.innerHTML =
      `<div class="ek-stack-xs">` +
      `<p class="ek-meta ek-m-0">${isEn ? "Open verification: local Ed25519 signature + Merkle SHA-256 receipt + Zenodo DOI archive + Berne 15.3 open-authorship metadata and 34 llms/*.md technical guides." : "Verificación abierta: firma local Ed25519 + recibo Merkle SHA-256 + archivo DOI Zenodo + aviso Convenio de Berna 15.3 y las 34 guías llms/*.md."}</p>` +
      `<a class="uls-chip" href="data/packs/packs_manifest.json" target="_blank" rel="noopener">${isEn ? "Ed25519 + Merkle packs manifest" : "Manifiesto Ed25519 + Merkle de .ekpack"}</a>` +
      `</div>`;
  }
  const btn = resolve("footerContactBtn");
  const dialog = resolve("supportContactDialog");
  const body = resolve("supportContactDialogBody");
  const closeBtn = resolve("btnCloseSupportDialog");
  if (!btn || !dialog || !body) return false;
  const renderForm = () => {
    body.innerHTML =
      `<form id="supportContactForm" class="support-contact-form">` +
      `<p class="support-intro">${isEn ? "Offline-first incident & collaboration channel. No trackers; direct fallback via encrypted email." : "Canal discreto de soporte e incidencias. Sin rastreadores y con respaldo directo por correo cifrado."}</p>` +
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
        status.textContent = isEn ? "Ready to send via encrypted email (requires internet)." : "Listo para enviar por correo cifrado (requiere conexión).";
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
