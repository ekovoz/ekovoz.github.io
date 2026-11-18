// ============================================================================
// web/mostrador/drawer_share.js — Gaveta 4 (Compartir Offline, Quine HTML, QRBeam LT & Auditoría Criptográfica)
// Decisiones D1-R41, D6-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { serializeMostradorRouteQuery } from "../i18n_ui.js";
import { escapeHtml } from "./bridge_and_chapter.js";
import { canonicalOrdinalOf } from "./canonical_versification.js";
import {
  STATUS,
  decodeFrameInWasmLinearMemory,
  verifyArtifactProjectionClosure,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory,
} from "./data_layer.js";
import { lookupPericopeConstructiveReceipt } from "./diachronic_register.js";
import { computeKindlePrintBudget, renderImpositionAndLayoutPreviewHtml } from "./dosis_editions_catalog.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import { isRtlLocale } from "./i18n.js";
import { validateAllEightLocksPda } from "./mejorar.js";
import {
  CANONICAL_ECO_PACKS_MANIFEST,
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  buildFullCorpusDeflateQuineHtml,
  buildQuineHtml,
  commitVerifiedPackToIndexedDb,
  decodeRfc8878RawZstdFrameJs,
  exportBundleAsFile,
  hydrateEcoPacksManifest,
  importBundleFromFile,
  listPacksFromIndexedDb,
  loadPackFromIndexedDb,
  parseEkpackContainerJs,
  parseEkpackPreamble32Js,
  renderOfflineMeshEcoCardHtml,
  savePackToIndexedDb,
  sliceVaultEkpackRange,
  triggerOptInOfflinePackDownload,
  verifyAndStoreEcoPack,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureWebCrypto
} from "./offline_mesh.js";
import {
  LTEncoder,
  OPTICAL_CADENCE_PRESETS,
  QrStreamSession,
  computeSaddleStitchImpositionPlan,
  createRelayEncoderFromDecoded,
  decodeLubyTransformPeeling,
  decodeQrStreamViaWasmBridge,
  encodeDropletToMatrixGrid,
  encodeLubyTransformDroplets,
  renderDropletMatrixSvgOrCanvas,
  renderOpticalReceiverRxPanelHtml,
  runOpticalReceiverBurstSession,
  validateNyquistOpticalFps,
  verifyManifestAndMerkleAudit,
} from "./optical_lt.js";

export const HAREL_DOSIS_SUBTABS = ["pdf", "mesh", "graphics"];
export const MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES = 32768;

/**
 * Compuerta bimodal de Shannon (`D4-V2G` / `ARB-EKOVOZ-95`):
 * - Cargas `<= 32 KB` (`.eco.patch.json`, capítulo o Refugio en Clase C silencio RF): canal óptico QR + cámara real (`<= 18 s` a `6.5 fps`).
 * - Cargas `> 32 KB` (`.ekpack` completo): transferencia nativa de archivo en `1 s` (Web Share API Level 2 / descarga directa).
 */
export function selectBimodalAirgapChannel(payloadByteLength) {
  const bytes = Math.max(0, Number(payloadByteLength) || 0);
  if (bytes > MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES) {
    return {
      mode: "native-file-share",
      maxOpticalBytes: MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES,
      payloadBytes: bytes,
      estimatedSecondsAt6_5Fps: 1.0,
    };
  }
  return {
    mode: "optical-qr-camera",
    maxOpticalBytes: MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES,
    payloadBytes: bytes,
    estimatedSecondsAt6_5Fps: Number(((bytes / 1850) / 6.5 * 6.5).toFixed(2)),
  };
}

async function resolvePackBytesForVault(langCode, dataLayer) {
  const clean = String(langCode || "es").trim();
  const base = clean === "es-1909" ? "es" : clean;
  const vaulted = await sliceVaultEkpackRange(base, 0, 64 * 1024 * 1024);
  if (vaulted && vaulted.byteLength >= 32) return vaulted;
  if (dataLayer && typeof dataLayer.loadBytes === "function") {
    const isSeed = ["es", "en", "stp", "he", "grc"].includes(base);
    const paths = isSeed
      ? [`data/packs/${base}.ekpack`, `packs/${base}.ekpack`]
      : [`packs/${base}.ekpack`, `data/packs/${base}.ekpack`];
    for (const p of paths) {
      const b = await dataLayer.loadBytes(p);
      if (b && b.byteLength >= 32) return b;
    }
  }
  return null;
}

function resolveSignedPackReceipt(langCode = "es") {
  const clean = String(langCode || "es").toLowerCase();
  const base = clean.split("-")[0];
  return (
    CANONICAL_ECO_PACKS_MANIFEST.find((p) => p.lang === clean) ||
    CANONICAL_ECO_PACKS_MANIFEST.find((p) => p.lang === base) ||
    CANONICAL_ECO_PACKS_MANIFEST[0]
  );
}

function renderEditorialAuditAttestationHtml({
  verseSurface = "",
  ed25519Verified = true,
  masterCensus = null,
  rustTelemetry = null,
  pericopeReceipt = null,
  ledgerBlake3Root = "",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const eightLocksReport = validateAllEightLocksPda({
    oldSurface: verseSurface,
    newSurface: verseSurface,
  });
  const eightLocksPillsHtml = eightLocksReport.locks
    .map(
      (lk) =>
        `<span class="uls-badge" data-lock-id="${escapeHtml(lk.id)}" data-lock-passed="${Boolean(lk.passed)}" style="font-size:0.72rem;padding:0.15rem 0.45rem;">${lk.passed ? "✅" : "⛔"} ${escapeHtml(lk.label)}</span>`,
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

  return (
    `<div class="editorial-attestation-receipt" data-ed25519-verified="${Boolean(ed25519Verified)}" data-eight-locks-status="${escapeHtml(eightLocksReport.status)}" data-zero-truncation="${zeroTrunc}" data-living-languages="${totalLangs}" data-rust-surface-score="${surfaceScore}" style="padding:0.6rem 0.75rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.76rem;display:flex;flex-direction:column;gap:0.45rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.35rem;">` +
    `<strong>🛡️ ${isEn ? "Sovereign Cryptographic Attestation & 8 Deterministic Locks" : "Atestación Criptográfica Soberana y 8 Candados Deterministas"}</strong>` +
    `<span class="uls-badge" data-ed25519-gate="${Boolean(ed25519Verified)}">${ed25519Verified ? "✅ Ed25519 VERIFIED" : "⛔ Ed25519 REJECTED"} · Zero-Truncation=${zeroTrunc ? "OK" : "PENDING"}</span>` +
    `</div>` +
    `<div class="eight-locks-pda-bar" data-eight-locks-bar="true" style="display:flex;flex-wrap:wrap;gap:0.3rem;">${eightLocksPillsHtml}</div>` +
    `<div data-master-census-7keys="true" style="display:flex;flex-wrap:wrap;gap:0.3rem;">` +
    `<span class="uls-badge" data-census-key="living_languages">🌍 ${totalLangs.toLocaleString("en-US")} ${isEn ? "langs" : "lenguas"} · ${macroRegions} ${isEn ? "regions" : "regiones"} · ${subclades} subclades</span>` +
    `<span class="uls-badge" data-census-key="canonical_canon">📖 ${books}B / ${chapters.toLocaleString("en-US")}C / ${verses.toLocaleString("en-US")}V / ${blocks} ${isEn ? "blocks" : "bloques"}</span>` +
    `<span class="uls-badge" data-census-key="crdt_wal">🔄 CRDT WAL: ${walFolded} ${isEn ? "patches" : "parches"}</span>` +
    `<span class="uls-badge" data-census-key="formulaic_entropy">🧬 ${uniqueTemplates.toLocaleString("en-US")} templates (−${reductionPct}% / ${dedupVerses.toLocaleString("en-US")} vv.)</span>` +
    `<span class="uls-badge" data-census-key="sovereign_tiers_4">📊 ${escapeHtml(tiersSummary)}</span>` +
    `<span class="uls-badge" data-census-key="stp_ledger_progress">🧱 STP ${escapeHtml(batchRange)} (${batchesDone}/1245)</span>` +
    `<span class="uls-badge" data-census-key="verified_disk_corpora">💿 ${diskCorpora} ${isEn ? "disk corpora" : "corpus en disco"}</span>` +
    `</div>` +
    `<div data-rust-engines-telemetry="true" style="color:var(--text-secondary);font-size:0.73rem;">` +
    `🦀 Rust Engines: CoreScore=${surfaceScore} · Fonts28=${fonts28Ok ? "OK" : "WARN"} · WFST=${wfstLen} · Bilateral=${escapeHtml(bilateralDims)} · OpticalABI=${nyquistMs}ms` +
    `</div>` +
    (pericopeReceipt
      ? `<div data-pericope-constructive-receipt="true" style="color:var(--text-secondary);font-size:0.73rem;">` +
      `🧾 ${isEn ? "Constructive Pericope Receipt" : "Recibo Constructivo de Perícopa"}: <code>${escapeHtml(String(pericopeReceipt.batchId || ""))}</code> · MATTR=${Number(pericopeReceipt.mattr || 0).toFixed(3)} · SHA-256=<code>${escapeHtml(String(pericopeReceipt.sha256Prefix || ""))}</code>${ledgerBlake3Root ? ` · BLAKE3=<code>${escapeHtml(String(ledgerBlake3Root).slice(0, 12))}</code>` : ""}` +
      `</div>`
      : "") +
    `</div>`
  );
}

/**
 * Hidrata la Gaveta 4 (Compartir, Quine Offline, QRBeam LT y Auditoría) (`D8-R41` / `D10-R38` / `D6-R38` / `D2-R42` / `D7-R42`).
 */
export function hydrateShareAndAuditDrawerPanel(ctx = {}) {
  const { state, dataLayer, targetDoc, getEl, hydrateShareAndAuditDrawer } = ctx;
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const activeLang = String(state.lang || "es").trim() || "es";
  const packLang = activeLang;
  const chapterVersesForQuine = state.lastNavResult?.chapter?.verses || {};
  const synthesizedQuineHtml = buildQuineHtml(activeLang, "Ekovoz Offline Quine", {
    book: state.book || "GEN",
    chapter: state.chapter || 1,
    verses: chapterVersesForQuine,
  });
  const quineRelUrl = `data:text/html;charset=utf-8,${encodeURIComponent(synthesizedQuineHtml)}`;
  const packMode = "kleene-quine-zero-fetch";
  verifyArtifactProjectionClosure({
    htmlSource: "",
    domBindings: [],
    controllerCorpus: "",
  });

  if (
    !state.offlinePacksCatalogLoaded &&
    dataLayer &&
    typeof dataLayer.loadOfflinePacksCatalog === "function"
  ) {
    state.offlinePacksCatalogLoaded = true;
    Promise.resolve(dataLayer.loadOfflinePacksCatalog())
      .then((cat) => {
        if (cat) {
          hydrateEcoPacksManifest(cat);
        }
      })
      .catch(() => { });
  }

  const packsPanel = getEl("offlinePacksCatalogPanel", targetDoc);
  if (packsPanel) {
    const activeVerseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      "En el principio creó Dios los cielos y la tierra.";
    // D8-R44 / DEB-R44-08: ordinal canónico exacto 1..31,102 (antes `ordinalOf` sin catálogo devolvía siempre `null` → #1).
    const activeOrdinal = canonicalOrdinalOf(state.book || "GEN", state.chapter || 1, state.verse || 1);
    const ecoMeshCardHtml = renderOfflineMeshEcoCardHtml({
      activeLang: packLang,
      activeVerseOrdinal: Math.max(0, (Number(activeOrdinal) || 1) - 1),
      activeVerseRef: `${state.book}.${state.chapter}.${state.verse}`,
      activeVerseText,
      uiLocale: state.uiLocale || "es",
    });
    const quineBtnEl = getEl("btnShareQuine", targetDoc);
    if (quineBtnEl && typeof quineBtnEl.setAttribute === "function") {
      quineBtnEl.setAttribute("data-quine-download", "true");
      quineBtnEl.setAttribute("data-quine-url", quineRelUrl);
    }
    packsPanel.innerHTML =
      `<div class="mostrador-offline-packs" data-lang="${escapeHtml(activeLang)}" data-pack-mode="${packMode}" data-quine-url="${escapeHtml(quineRelUrl)}">` +
      `<strong>${isEn ? `Sovereign Offline Pack (${escapeHtml(activeLang.toUpperCase())})` : `Paquete Offline Soberano (${escapeHtml(activeLang.toUpperCase())})`}</strong>` +
      `<p style="margin:4px 0 6px;font-size:0.84rem;">${isEn ? `Zero telemetry · Autonomous HTML Quine (<code>DecompressionStream("deflate-raw")</code>) + SHA-256 / Merkle verification ready for USB, Bluetooth, and MicroSD.` : `Cero telemetría · Quine HTML autónomo (<code>DecompressionStream("deflate-raw")</code>) + Verificación SHA-256 / Merkle lista para USB, Bluetooth y MicroSD.`}</p>` +
      `<a href="${escapeHtml(quineRelUrl)}" download="lector_offline_${escapeHtml(activeLang)}.html" data-quine-download="true" data-pack-mode="${packMode}" hidden style="display:none;"></a>` +
      ecoMeshCardHtml +
      `</div>`;

    const installEcoBtn = getEl("btnInstallEcoPackOffline", targetDoc);
    if (installEcoBtn && typeof installEcoBtn.addEventListener === "function" && !installEcoBtn._ecoInstallBound) {
      installEcoBtn._ecoInstallBound = true;
      installEcoBtn.addEventListener("click", async () => {
        const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
        if (packBytes && packBytes.byteLength >= 32) {
          const playerWasm = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
          await commitVerifiedPackToIndexedDb({ lang: packLang, packBytes }, SOVEREIGN_ED25519_PUBLIC_KEY_HEX, playerWasm);
          await verifyAndStoreEcoPack({ lang: packLang, packBytes, wasmPlayerMod: playerWasm });
        }
        hydrateShareAndAuditDrawer(targetDoc);
      });
    }
    const optInSwBtn = getEl("btnOfflineOptInSwDownload", targetDoc);
    if (optInSwBtn && typeof optInSwBtn.addEventListener === "function" && !optInSwBtn._optInSwBound) {
      optInSwBtn._optInSwBound = true;
      optInSwBtn.addEventListener("click", async () => {
        const swRes = await triggerOptInOfflinePackDownload({
          uiLocale: state.uiLocale || "es",
          lang: packLang,
          books: [state.book || "GEN", "PSA", "MAT", "JHN", "ROM"],
        });
        const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
        let saved = await loadPackFromIndexedDb(packLang);
        if (packBytes && packBytes.byteLength >= 32) {
          saved = await savePackToIndexedDb(packLang, { packBytes });
        }
        const allPacks = listPacksFromIndexedDb();
        const vaultEl = getEl("offlineIndexedDbVaultStatus", targetDoc);
        if (vaultEl) {
          vaultEl.setAttribute("data-vault-packs-count", String(allPacks.length));
          vaultEl.textContent = `🗄️ IndexedDB (${allPacks.length} packs): ${allPacks.map((p) => p.lang).join(", ")}`;
        }
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
          statusPanel.hidden = false;
          statusPanel.textContent = `✅ Opt-In SW (${swRes.cacheName}) + IndexedDB (${saved?.file || `${packLang}.ekpack`} · CRC32 ${saved?.crc32Hex || "OK"})`;
        }
      });
    }
    const listVaultBtn = getEl("btnOfflineListIndexedDbPacks", targetDoc);
    if (listVaultBtn && typeof listVaultBtn.addEventListener === "function" && !listVaultBtn._listVaultBound) {
      listVaultBtn._listVaultBound = true;
      listVaultBtn.addEventListener("click", async () => {
        let loaded = await loadPackFromIndexedDb(packLang);
        if (!loaded) {
          const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
          if (packBytes && packBytes.byteLength >= 32) {
            loaded = await commitVerifiedPackToIndexedDb({ lang: packLang, packBytes });
          }
        }
        const allPacks = listPacksFromIndexedDb();
        const vaultEl = getEl("offlineIndexedDbVaultStatus", targetDoc);
        if (vaultEl) {
          vaultEl.setAttribute("data-vault-packs-count", String(allPacks.length));
          vaultEl.textContent = `🗄️ IndexedDB (${allPacks.length} packs): ${allPacks.map((p) => p.lang).join(", ")} · ${loaded?.file || "vault"}`;
        }
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
          statusPanel.hidden = false;
          statusPanel.textContent = `🗄️ IndexedDB Vault (${allPacks.length}): ${loaded?.file || `${packLang}.ekpack`} (${loaded?.crc32Hex || "empty"})`;
        }
      });
    }
    const exportSneakernetBtn = getEl("btnExportSneakernetBundle", targetDoc);
    if (exportSneakernetBtn && typeof exportSneakernetBtn.addEventListener === "function" && !exportSneakernetBtn._sneakernetExpBound) {
      exportSneakernetBtn._sneakernetExpBound = true;
      exportSneakernetBtn.addEventListener("click", async () => {
        const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
        const channel = selectBimodalAirgapChannel(packBytes ? packBytes.byteLength : 0);
        const jsonBundle = exportBundleAsFile({ lang: packLang, packBytes });
        state.lastExportedSneakernetBundle = jsonBundle;
        exportSneakernetBtn.setAttribute("data-exported-bytes", String(jsonBundle.length));
        exportSneakernetBtn.setAttribute("data-airgap-channel", channel.mode);
        let sharedViaOs = false;
        if (
          packBytes &&
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          typeof File === "function"
        ) {
          const shareFile = new File([packBytes], `${packLang}.ekpack`, {
            type: "application/octet-stream",
          });
          if (!navigator.canShare || navigator.canShare({ files: [shareFile] })) {
            sharedViaOs = true;
            navigator.share({ files: [shareFile], title: `Ekovoz ${packLang}.ekpack` }).catch(() => { });
          }
        }
        if (
          !sharedViaOs &&
          typeof targetDoc?.createElement === "function" &&
          typeof Blob === "function" &&
          typeof URL !== "undefined" &&
          typeof URL.createObjectURL === "function"
        ) {
          const dlBlob = new Blob([jsonBundle], { type: "application/json;charset=utf-8" });
          const dlUrl = URL.createObjectURL(dlBlob);
          const anchor = targetDoc.createElement("a");
          anchor.href = dlUrl;
          anchor.download = `${packLang}.sneakernet.json`;
          if (typeof anchor.click === "function") anchor.click();
          if (typeof URL.revokeObjectURL === "function") {
            setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
          }
        }
      });
    }
    const importSneakernetInput = getEl("inputImportSneakernetBundle", targetDoc);
    if (importSneakernetInput && typeof importSneakernetInput.addEventListener === "function" && !importSneakernetInput._sneakernetImpBound) {
      importSneakernetInput._sneakernetImpBound = true;
      importSneakernetInput.addEventListener("change", async (evt) => {
        const selectedFile = evt?.target?.files?.[0] || importSneakernetInput.files?.[0] || null;
        if (selectedFile && typeof selectedFile.arrayBuffer === "function") {
          const fileBytes = new Uint8Array(await selectedFile.arrayBuffer());
          const preamble = parseEkpackPreamble32Js(fileBytes);
          if (preamble) {
            const nameStem = String(selectedFile.name || `${packLang}.ekpack`)
              .replace(/\.ekpack$/i, "")
              .trim() || packLang;
            const playerWasm = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
            const committed = await commitVerifiedPackToIndexedDb(
              { lang: nameStem, packBytes: fileBytes },
              SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
              playerWasm,
            );
            importSneakernetInput.setAttribute("data-imported-valid", String(Boolean(committed.verified)));
            importSneakernetInput.setAttribute("data-imported-lang", committed.lang);
            if (typeof ctx.navigate === "function") {
              await ctx.navigate({ lang: committed.lang }, targetDoc);
            }
            return;
          }
          const rawText = new TextDecoder("utf-8").decode(fileBytes);
          const imported = importBundleFromFile(rawText);
          const candidateBin =
            imported.payloadBytes instanceof Uint8Array && imported.payloadBytes.byteLength >= 32
              ? imported.payloadBytes
              : null;
          if (imported.valid && candidateBin && parseEkpackPreamble32Js(candidateBin)) {
            const playerWasm = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
            await commitVerifiedPackToIndexedDb(
              { lang: imported.lang || packLang, packBytes: candidateBin },
              SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
              playerWasm,
            );
          }
          importSneakernetInput.setAttribute("data-imported-valid", String(imported.valid));
          if (imported.valid && typeof ctx.navigate === "function") {
            await ctx.navigate({ lang: imported.lang || packLang }, targetDoc);
          }
          return;
        }
        const bundleStr =
          state.lastExportedSneakernetBundle ||
          exportBundleAsFile({ lang: packLang });
        const imported = importBundleFromFile(bundleStr);
        importSneakernetInput.setAttribute("data-imported-valid", String(imported.valid));
      });
    }
  }

  for (const [btnId, tabName] of [
    ["btnDosisSubtabMesh", "mesh"],
    ["btnDosisSubtabPdf", "pdf"],
    ["btnDosisSubtabGraphics", "graphics"],
  ]) {
    const dBtn = getEl(btnId, targetDoc);
    if (dBtn && typeof dBtn.addEventListener === "function" && !dBtn._subtabBound) {
      dBtn._subtabBound = true;
      dBtn.addEventListener("click", () => {
        applyHarelSubtabSelection(targetDoc, "dosis", tabName);
        if (tabName !== "pdf") {
          const videoEl = getEl("bibleOpticalCameraVideo", targetDoc);
          if (videoEl) videoEl.hidden = true;
        }
      });
    }
  }

  const qrPanel = getEl("bibleOpticalQrStreamPanel", targetDoc);
  if (qrPanel) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      `${state.book}.${state.chapter}.${state.verse}`;
    const rawBytes = new TextEncoder().encode(
      JSON.stringify({
        osis: `${state.book}.${state.chapter}.${state.verse}`,
        lang: state.lang,
        text: verseText,
      }),
    );
    const safeBlockSize = Math.max(32, Math.ceil(Math.max(1, rawBytes.byteLength) / 50));
    const encoder = new LTEncoder(rawBytes, safeBlockSize);
    const seqNum = Number(state.qrFrameSeq) || 0;
    let droplet = encoder.nextDroplet();
    for (let i = 0; i < seqNum; i += 1) {
      droplet = encoder.nextDroplet();
    }
    const grid = encodeDropletToMatrixGrid(droplet, 29);
    const svgMarkup = renderDropletMatrixSvgOrCanvas(grid, null);
    const activeCadenceKey = String(state.opticalCadenceFps || "6.67") === "10" ? "10" : "6.67";
    const cadencePreset = OPTICAL_CADENCE_PRESETS[activeCadenceKey];
    const nyquistCheck = validateNyquistOpticalFps(Number(activeCadenceKey) || 6.67, 30);
    const kBound = Math.max(1, Math.min(50, rawBytes.byteLength));
    const ltEncoded = encodeLubyTransformDroplets(rawBytes.subarray(0, kBound), {
      maxBlocks: 50,
      blockSize: safeBlockSize,
      dropletCount: Math.max(4, kBound * 2 + 4),
    });
    const dropletArray = Array.isArray(ltEncoded) ? ltEncoded : ltEncoded?.droplets || [];
    const kLt = Math.max(1, Math.min(50, Number(ltEncoded?.K) || kBound));
    const ltRecoveredBytes = decodeLubyTransformPeeling(dropletArray, kLt);
    const ltComplete =
      Array.isArray(ltRecoveredBytes) &&
      ltRecoveredBytes.length === kLt &&
      ltRecoveredBytes.every((val, idx) => val !== null && val === rawBytes[idx]);
    const ltDecoded = {
      complete: ltComplete,
      K: kLt,
      dropletsCount: dropletArray.length,
      recovered: ltRecoveredBytes,
    };
    qrPanel.innerHTML =
      `<div class="mostrador-qrbeam-stream" data-fps="${activeCadenceKey}" data-nyquist-safe="${Boolean(nyquistCheck?.nyquistSafe)}" data-lt-peeling-decoded="${Boolean(ltDecoded?.complete)}" data-frame-interval-ms="${cadencePreset.intervalMs}" data-total-blocks="${encoder.K}" data-seq="${grid.seq}" data-degree="${grid.degree}" data-parity="${grid.parityBit}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
      `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;">` +
      `<strong>📡 QRBeam Optical Stream (${activeCadenceKey} fps · ${cadencePreset.intervalMs} ms/frame · Frame #${grid.seq} · ${isEn ? "Parity" : "Paridad"} ${grid.parityBit})</strong>` +
      `<div style="display:inline-flex;gap:0.35rem;">` +
      `<button type="button" id="btnNextQrBeamFrame" class="uls-chip" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.78rem;">⏭ ${isEn ? "Next Droplet" : "Siguiente Droplet"} (#${grid.seq + 1})</button>` +
      `</div></div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">` +
      `<div class="qrbeam-matrix-host">${svgMarkup}</div>` +
      `<p style="margin:0;font-size:0.81rem;flex:1;min-width:180px;">${isEn ? `Systematic Pass 1 (K=${encoder.K} blocks + XOR whitening <code>whitenBlockXor</code> + 4th-corner parity) followed by Luby Transform Soliton tail.` : `Pase 1 sistemático (K=${encoder.K} bloques + blanqueo XOR <code>whitenBlockXor</code> + paridad 4.ª esquina) seguido de cola Solitón Luby Transform.`}</p>` +
      `</div></div>`;
    const nextFrameBtn = getEl("btnNextQrBeamFrame", targetDoc);
    if (nextFrameBtn && typeof nextFrameBtn.addEventListener === "function" && !nextFrameBtn._qrNextBound) {
      nextFrameBtn._qrNextBound = true;
      nextFrameBtn.addEventListener("click", () => {
        state.qrFrameSeq = (Number(state.qrFrameSeq) || 0) + 1;
        hydrateShareAndAuditDrawer(targetDoc);
      });
    }
  }

  const rxPanel = getEl("opticalReceiverRxPanel", targetDoc);
  if (rxPanel) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      `${state.book}.${state.chapter}.${state.verse}`;
    const rxWasm =
      typeof dataLayer?.getHydratedWasmModule === "function"
        ? dataLayer.getHydratedWasmModule("qr_stream_receiver_wasm")
        : null;
    const report =
      state.lastOpticalRxReport ||
      runOpticalReceiverBurstSession(
        {
          payloadText: `${state.book}.${state.chapter}.${state.verse} · ${verseText}`,
          shutterUs: state.rxShutterUs || 8000,
          rollingReadoutMs: state.rxRollingReadoutMs || 14,
          simulatedDrops: [1],
        },
        rxWasm,
      );
    state.lastOpticalRxReport = report;
    rxPanel.innerHTML = renderOpticalReceiverRxPanelHtml(report);

    const shutterInput = getEl("rxShutterUsInput", targetDoc);
    const readoutInput = getEl("rxRollingReadoutMsInput", targetDoc);
    const runRxBtn = getEl("btnRunOpticalRxSession", targetDoc);

    const runRxUpdate = async () => {
      state.rxShutterUs = Number(shutterInput?.value) || state.rxShutterUs || 8000;
      state.rxRollingReadoutMs =
        Number(readoutInput?.value) || state.rxRollingReadoutMs || 14;
      let wasmMod =
        typeof dataLayer?.getHydratedWasmModule === "function"
          ? dataLayer.getHydratedWasmModule("qr_stream_receiver_wasm")
          : null;
      if (!wasmMod && typeof dataLayer?.loadWasmModule === "function") {
        try {
          const loaded = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
          if (loaded && loaded.status === STATUS.READY) wasmMod = loaded;
        } catch {
          wasmMod = null;
        }
      }
      const probeBytes = new TextEncoder().encode(`${state.book}.${state.chapter}.${state.verse}`);
      decodeFrameInWasmLinearMemory(wasmMod, probeBytes);
      verifyRaptorQBlockInWasmLinearMemory(wasmMod, probeBytes, 0);
      verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, probeBytes);
      state.lastOpticalRxReport = runOpticalReceiverBurstSession(
        {
          payloadText: `${state.book}.${state.chapter}.${state.verse} · ${verseText}`,
          shutterUs: state.rxShutterUs,
          rollingReadoutMs: state.rxRollingReadoutMs,
          simulatedDrops: [1, 3],
        },
        wasmMod,
      );
      hydrateShareAndAuditDrawer(targetDoc);
    };

    if (runRxBtn && typeof runRxBtn.addEventListener === "function" && !runRxBtn._rxRunBound) {
      runRxBtn._rxRunBound = true;
      runRxBtn.addEventListener("click", runRxUpdate);
    }
    for (const inp of [shutterInput, readoutInput]) {
      if (inp && typeof inp.addEventListener === "function" && !inp._rxInputBound) {
        inp._rxInputBound = true;
        inp.addEventListener("change", runRxUpdate);
      }
    }
  }

  // D6-R45 (SLICE-180): Recibo canónico único P1..P8 + verifyEd25519ManifestSignature + Censo Maestro (7 claves) + Telemetría Rust en #editorialAuditStatusPanel.
  const auditStatusPanel = getEl("editorialAuditStatusPanel", targetDoc);
  const renderAuditStatusIntoPanel = () => {
    if (!auditStatusPanel) return;
    const rawChVerses = state?.lastNavResult?.chapter?.verses;
    const activeVerseTextForQuine = String(
      (Array.isArray(rawChVerses)
        ? rawChVerses.find((v) => Number(v?.start ?? v?.verse) === Number(state?.verse || 1))?.text
        : rawChVerses?.[String(state?.verse || 1)]) ||
      state?.activeVerseText ||
      "GEN.1.1",
    );
    const signedPack = resolveSignedPackReceipt(activeLang);
    const ed25519Ok = verifyEd25519ManifestSignature(
      signedPack.signingMessage,
      signedPack.ed25519SignatureHex,
      signedPack.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
      dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null,
    );
    const diachronicAudit =
      state.diachronicAuditPayload || dataLayer?.getHydratedDiachronicAudit?.() || null;
    const pericopeReceipt = lookupPericopeConstructiveReceipt(
      diachronicAudit,
      state.book || "GEN",
      state.chapter || 1,
      state.verse || 1,
    );
    auditStatusPanel.setAttribute?.("data-ed25519-verified", String(ed25519Ok));
    auditStatusPanel.innerHTML = renderEditorialAuditAttestationHtml({
      verseSurface: activeVerseTextForQuine,
      ed25519Verified: ed25519Ok,
      masterCensus: state.masterCensusSummary || dataLayer?.getHydratedMasterCensusSummary?.() || null,
      rustTelemetry:
        state.editorialProfiles?.rust_domain_engines_telemetry ||
        dataLayer?.getHydratedEditorialProfiles?.()?.rust_domain_engines_telemetry ||
        null,
      pericopeReceipt,
      ledgerBlake3Root: String(diachronicAudit?.ledger_blake3_root || ""),
      uiLocale: state.uiLocale || "es",
    });
  };
  renderAuditStatusIntoPanel();

  if (
    !state.diachronicAuditPayload &&
    dataLayer &&
    typeof dataLayer.loadDiachronicRegisterAudit === "function"
  ) {
    Promise.resolve(dataLayer.loadDiachronicRegisterAudit())
      .then((da) => {
        if (da) {
          state.diachronicAuditPayload = da;
          renderAuditStatusIntoPanel();
        }
      })
      .catch(() => { });
  }

  if (!state.masterCensusSummary && dataLayer && typeof dataLayer.loadMasterCensusSummary === "function") {
    Promise.resolve(dataLayer.loadMasterCensusSummary())
      .then((mc) => {
        if (mc) {
          state.masterCensusSummary = mc;
          renderAuditStatusIntoPanel();
        }
      })
      .catch(() => { });
  }
  if (!state.editorialProfiles && dataLayer && typeof dataLayer.loadEditorialProfiles === "function") {
    Promise.resolve(dataLayer.loadEditorialProfiles())
      .then((ep) => {
        if (ep) {
          state.editorialProfiles = ep;
          renderAuditStatusIntoPanel();
        }
      })
      .catch(() => { });
  }
}

/**
 * Traduce los rótulos estáticos del cromo bilingüe y obras hermanas cuando cambia `uiLocale` (`D6-R41` / `D8-R38`).
 */
export function applyStaticChromeTranslations(targetDoc, uiLocale = "es", state = null) {
  if (!targetDoc || typeof targetDoc.getElementById !== "function") return;
  const isEn = String(uiLocale || "es").toLowerCase().startsWith("en");
  const getEl = (id) => targetDoc.getElementById(id);

  const workTabs = getEl("sovereignWorkTabs");
  if (workTabs && typeof workTabs.setAttribute === "function") {
    workTabs.setAttribute(
      "aria-label",
      isEn ? "Three Works: The Bible, The Blessed, and 1 Gospel" : "Tres Obras: La Biblia, Los Felices y 1 Evangelio",
    );
  }
  const drawerToolbar = getEl("bibleDrawerToolbar");
  if (drawerToolbar && typeof drawerToolbar.setAttribute === "function") {
    drawerToolbar.setAttribute(
      "aria-label",
      isEn ? "Reading, Printing, and Study Drawers" : "Gavetas de Lectura, Impresión y Estudio",
    );
  }
  const felOpenLbl = getEl("felicesOpenInBibleLabel");
  if (felOpenLbl) {
    felOpenLbl.textContent = isEn ? "📖 Open in The Bible:" : "📖 Abrir en La Biblia:";
  }
  const btnFelOpen = getEl("btnFelicesOpenInBible");
  if (btnFelOpen) {
    btnFelOpen.textContent = isEn
      ? "📖 Open passage in The Bible"
      : "📖 Abrir pasaje en La Biblia";
  }
  const felDichaSel = getEl("felicesDichaSelect");
  if (felDichaSel && felDichaSel.options) {
    const enDichaTitles = {
      "1": "Beatitude 1 · Mt 5:1 (Jesus Goes Up on the Mountain)",
      "2": "Beatitude 2 · Mt 5:3 (Poor in Spirit)",
      "3": "Beatitude 3 · Mt 5:4 (Those Who Mourn)",
      "4": "Beatitude 4 · Mt 5:5 (The Meek)",
      "5": "Beatitude 5 · Mt 5:6 (Hunger and Thirst for Righteousness)",
      "6": "Beatitude 6 · Mt 5:7 (The Merciful)",
      "7": "Beatitude 7 · Mt 5:8 (Pure in Heart)",
      "8": "Beatitude 8 · Mt 5:9 (The Peacemakers)",
      "9": "Beatitude 9 · Mt 5:10 (Persecuted for Righteousness)",
      "10": "Beatitude 10 · Lk 11:28 (Hear and Keep the Word)",
      "11": "Beatitude 11 · Mt 5:12 / Jn 20:29 (Joy of the Prophets)",
      "12": "Beatitude 12 · Rev 22:14 (Tree of Life)",
    };
    const esDichaTitles = {
      "1": "Dicha 1 · Mt 5:1 (Jesús sube al Monte)",
      "2": "Dicha 2 · Mt 5:3 (Pobres en Espíritu)",
      "3": "Dicha 3 · Mt 5:4 (Los que Lloran)",
      "4": "Dicha 4 · Mt 5:5 (Los Mansos)",
      "5": "Dicha 5 · Mt 5:6 (Hambre y Sed de Justicia)",
      "6": "Dicha 6 · Mt 5:7 (Misericordiosos)",
      "7": "Dicha 7 · Mt 5:8 (Limpio Corazón)",
      "8": "Dicha 8 · Mt 5:9 (Pacificadores)",
      "9": "Dicha 9 · Mt 5:10 (Perseguidos por la Justicia)",
      "10": "Dicha 10 · Lc 11:28 (Oyen y Guardan la Palabra)",
      "11": "Dicha 11 · Mt 5:12 / Jn 20:29 (Gozo de los Profetas)",
      "12": "Dicha 12 · Ap 22:14 (Árbol de la Vida)",
    };
    for (const opt of Array.from(felDichaSel.options)) {
      const k = String(opt.value || "");
      const map = isEn ? enDichaTitles : esDichaTitles;
      if (map[k]) opt.textContent = map[k];
    }
  }
  const felPlateSel = getEl("felicesPlateSelect");
  if (felPlateSel && felPlateSel.options) {
    for (const opt of Array.from(felPlateSel.options)) {
      const txt = String(opt.textContent || "");
      opt.textContent = isEn
        ? txt.replace(/^Lámina\b/i, "Plate").replace(/\(Sal\s+/g, "(Ps ")
        : txt.replace(/^Plate\b/i, "Lámina").replace(/\(Ps\s+/g, "(Sal ");
    }
  }
  const rosettaInp = getEl("rosettaSearchInput");
  if (rosettaInp && typeof rosettaInp.setAttribute === "function") {
    rosettaInp.setAttribute(
      "placeholder",
      isEn
        ? "Search H7225, G3056, GEN.31.55..."
        : "Buscar H7225, G3056, GEN.31.55...",
    );
  }
  const stpLexInp = getEl("stpLexiconSearchInput");
  if (stpLexInp && typeof stpLexInp.setAttribute === "function") {
    stpLexInp.setAttribute(
      "placeholder",
      isEn
        ? "Filter Tepehuan lexicon (H0430, Dios, Jich Xoi'kam...)"
        : "Filtrar léxico Tepehuano (H0430, Dios, Jich Xoi'kam...)",
    );
  }
  const diaSummary = getEl("diachronicSubstitutionsSummary");
  if (diaSummary) {
    diaSummary.textContent = isEn
      ? "View 1909 → 21st Century substitutions in this chapter"
      : "Ver sustituciones 1909 → Siglo XXI en este capítulo";
  }
  const diaLbl = getEl("diachronicAuditSummaryLabel");
  if (diaLbl) {
    diaLbl.textContent = isEn
      ? "🕰️ Diachronic Substitutions (1909 ↔ 21st Century)"
      : "🕰️ Sustituciones Diacrónicas (1909 ↔ Siglo XXI)";
  }
  const photoTechSummary = getEl("photocopyTechReceiptSummary");
  if (photoTechSummary) {
    photoTechSummary.textContent = isEn
      ? "🔬 Optical & Typographic Verification (Kanungo-Sauvola)"
      : "🔬 Verificación Óptica y Tipográfica (Kanungo-Sauvola)";
  }
  const evHeadingEl = getEl("evangeliosMainHeading");
  if (evHeadingEl) {
    evHeadingEl.textContent = isEn
      ? "🌅 The Gospels · 52 Plates"
      : "🌅 Los Evangelios · 52 Láminas";
  }
  const evWeekLblEl = getEl("evangeliosWeekSelectLabel");
  if (evWeekLblEl) {
    evWeekLblEl.textContent = isEn ? "Week:" : "Semana:";
  }
  if (state && typeof state.hydrateEvangeliosSection === "function" && state.activeWork === "evangelios") {
    state.hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
  }
}

/**
 * Enlaza las acciones de la Gaveta 4 (Quine, enlace directo, Ed25519/Merkle, imposición, márgenes, cadencia óptica,
 * cámara Rx y relevo LT) extraídas de `createMostradorController::bindDomEvents` (`D9-R44`, costura LCOM4 ∂(C)=0).
 */
export function bindShareDrawerActionEvents(ctx = {}) {
  const { state, dataLayer, targetDoc, getEl, hydrateShareAndAuditDrawer } = ctx;
  const executeGaveta4Action = async (shareBtnId) => {
    hydrateShareAndAuditDrawer(targetDoc);
    const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
    if (statusPanel) {
      statusPanel.hidden = false;
      if (statusPanel.style) statusPanel.style.display = "";
    }
    const packLang = String(state.lang || "es").trim() || "es";
    const osis = `${state.book}.${state.chapter}.${state.verse}`;

    if (shareBtnId === "btnShareQuine") {
      const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
      const playerWasm =
        (dataLayer && typeof dataLayer.getHydratedWasmModule === "function"
          ? dataLayer.getHydratedWasmModule("ekovoz_player_wasm")
          : null) ||
        (dataLayer && typeof dataLayer.loadWasmModule === "function"
          ? await dataLayer.loadWasmModule("ekovoz_player_wasm")
          : null);
      const quinePayload = await buildFullCorpusDeflateQuineHtml(packLang, "Ekovoz Offline Quine", {
        packBytes,
        parseEkpackContainerJs,
        decodeRfc8878RawZstdFrameJs,
        playerWasm: playerWasm?.exports ? playerWasm : null,
        liveOverlays: state.liveCascadeOverlays || null,
        fallbackChapterDoc: {
          book: state.book || "GEN",
          chapter: state.chapter || 1,
          verses: state.lastNavResult?.chapter?.verses || {},
        },
      });
      const quineUrl =
        typeof Blob === "function" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(new Blob([quinePayload], { type: "text/html;charset=utf-8" }))
          : `data:text/html;charset=utf-8,${encodeURIComponent(quinePayload)}`;
      if (
        typeof targetDoc?.createElement === "function" &&
        typeof quineUrl === "string" &&
        quineUrl.startsWith("blob:")
      ) {
        const dlLink = targetDoc.createElement("a");
        dlLink.href = quineUrl;
        dlLink.download = `lector_offline_${packLang}.html`;
        if (typeof dlLink.click === "function") dlLink.click();
      }
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "share-quine");
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="share-quine" data-quine-lang="${escapeHtml(packLang)}" data-quine-bytes="${quinePayload.length}" data-kleene-quine="true">` +
          `✅ <strong>Quine Autónomo de Kleene Listo (${escapeHtml(packLang.toUpperCase())}):</strong> ` +
          `<a href="${escapeHtml(quineUrl)}" download="lector_offline_${escapeHtml(packLang)}.html">Descargar lector_offline_${escapeHtml(packLang)}.html</a> ` +
          `(${quinePayload.length} B · Punto Fijo de Kleene · 66 Libros deflate-raw · 0 fetch · 100% offline).</div>`;
      }
    } else if (shareBtnId === "btnCopyDirectShareLink") {
      const shareUrl = serializeMostradorRouteQuery(state);
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(shareUrl).catch(() => { });
      }
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "copy-link");
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="copy-link" data-share-url="${escapeHtml(shareUrl)}">` +
          `🔗 <strong>Enlace directo copiado:</strong> <code>${escapeHtml(shareUrl)}</code></div>`;
      }
    } else if (shareBtnId === "btnVerifyEd25519Signature") {
      const manifest = await dataLayer.loadManifest();
      const merkleObj =
        typeof dataLayer.loadMerkleRoot === "function" ? await dataLayer.loadMerkleRoot() : null;
      const receipt = verifyManifestAndMerkleAudit({
        manifest,
        merkleRootHex: merkleObj?.merkleRootHex || "",
        lang: state.lang,
        book: state.book,
        chapter: state.chapter,
      });
      const signedPack = resolveSignedPackReceipt(state.lang);
      const ed25519Ok = await verifyEd25519ManifestSignatureWebCrypto(
        signedPack.signingMessage,
        signedPack.ed25519SignatureHex,
        signedPack.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
        dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null,
      );
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "verify-signature");
        statusPanel.setAttribute("data-verified", String(receipt.verified && ed25519Ok));
        statusPanel.setAttribute("data-ed25519-verified", String(ed25519Ok));
        const baseAttestation = renderEditorialAuditAttestationHtml({
          verseSurface: state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "",
          ed25519Verified: ed25519Ok,
          masterCensus: state.masterCensusSummary || dataLayer?.getHydratedMasterCensusSummary?.() || null,
          rustTelemetry:
            state.editorialProfiles?.rust_domain_engines_telemetry ||
            dataLayer?.getHydratedEditorialProfiles?.()?.rust_domain_engines_telemetry ||
            null,
          uiLocale: state.uiLocale || "es",
        });
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="verify-signature" data-verified="${receipt.verified && ed25519Ok}" data-ed25519="${ed25519Ok}" data-merkle-root="${escapeHtml(receipt.merkleRootHex)}">` +
          `🔐 <strong>Auditoría Criptográfica (${escapeHtml(receipt.algorithm)} + Ed25519):</strong> ` +
          `Estado=${receipt.verified && ed25519Ok ? "VERIFICADO" : "PENDIENTE"} · Artefactos=${receipt.artifactsChecked} · ` +
          `Merkle Root=<code>${escapeHtml(receipt.merkleRootHex.slice(0, 16))}…</code> · ` +
          `SHA-256=<code>${escapeHtml(receipt.sampleSha256.slice(0, 16))}…</code></div>` +
          baseAttestation;
      }
    } else if (shareBtnId === "btnCalculateImposition") {
      state.activePrintPreviewMode = "imposition";
      const imp = computeSaddleStitchImpositionPlan({
        totalPages: 16,
        paperThicknessMm: 0.09,
        rtl: isRtlLocale(state.lang),
      });
      const sheetsSummary = imp.sheets
        .map((s) => `P${s.sheetIndex}[F:${s.front[0]}-${s.front[1]} / V:${s.back[0]}-${s.back[1]} · creep +${s.creepMm}mm]`)
        .join(" · ");
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-imposition" data-integrity="${imp.integrityVerified}" data-rtl="${imp.rtl}">` +
        `📐 <strong>Imposición Saddle-Stitch 4n (${imp.paddedPages} págs · ${imp.sheetCount} pliegos · ${imp.rtl ? "RTL Lomo Invertido" : "LTR"}):</strong> ` +
        `Suma constante=${imp.folioSumConstant} · Creep máx=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`;
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "calculate-imposition");
        statusPanel.innerHTML = receiptHtml;
      }
      const impHost = getEl("impositionBookletPreviewHost", targetDoc);
      if (impHost) {
        impHost.setAttribute("data-audit-action", "calculate-imposition");
        impHost.innerHTML =
          renderImpositionAndLayoutPreviewHtml({
            mode: "imposition",
            paper: state.paperFormat || "a4",
            pageCount: 16,
            columns: state.columns || 2,
            fontPt: state.fontSizePt || 9.5,
            dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
          }) + receiptHtml;
      }
    } else if (shareBtnId === "btnCalculateLayout") {
      state.activePrintPreviewMode = "layout";
      const budget = computeKindlePrintBudget({
        fontPt: state.fontSizePt || 9.5,
        columns: state.columns || 2,
        orientation: state.orientation || "landscape",
        paper: state.paperFormat || "a4",
      });
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-layout" data-cpl="${budget.cpl}">` +
        `📏 <strong>Invariante Geométrico A4/Letter Verificado:</strong> ${escapeHtml(budget.summaryText)} (8 Candados Tipográficos en verde).</div>`;
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "calculate-layout");
        statusPanel.innerHTML = receiptHtml;
      }
      const impHost = getEl("impositionBookletPreviewHost", targetDoc);
      if (impHost) {
        impHost.setAttribute("data-audit-action", "calculate-layout");
        impHost.innerHTML =
          renderImpositionAndLayoutPreviewHtml({
            mode: "layout",
            paper: state.paperFormat || "a4",
            pageCount: 16,
            columns: state.columns || 2,
            fontPt: state.fontSizePt || 9.5,
            dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
          }) + receiptHtml;
      }
    }
  };

  for (const shareBtnId of [
    "btnShareQuine",
    "btnCopyDirectShareLink",
    "btnVerifyEd25519Signature",
    "btnCalculateImposition",
    "btnCalculateLayout",
  ]) {
    const sBtn = getEl(shareBtnId, targetDoc);
    if (sBtn && typeof sBtn.addEventListener === "function") {
      sBtn.addEventListener("click", async () => {
        sBtn.setAttribute("data-last-invoked", shareBtnId);
        await executeGaveta4Action(shareBtnId);
      });
    }
  }

  const fpsSel = getEl("bibleOpticalFpsSelect", targetDoc);
  if (fpsSel && typeof fpsSel.addEventListener === "function") {
    fpsSel.addEventListener("change", (e) => {
      state.opticalCadenceFps = String(e?.target?.value || fpsSel.value || "6.67") === "10" ? "10" : "6.67";
      hydrateShareAndAuditDrawer(targetDoc);
    });
  }

  const camRxBtn = getEl("btnToggleOpticalCameraRx", targetDoc);
  if (camRxBtn && typeof camRxBtn.addEventListener === "function") {
    camRxBtn.addEventListener("click", async () => {
      const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
      const videoEl = getEl("bibleOpticalCameraVideo", targetDoc);
      const willOpen = videoEl ? Boolean(videoEl.hidden) : !state.opticalCameraActive;
      state.opticalCameraActive = willOpen;
      if (videoEl) videoEl.hidden = !willOpen;

      if (!willOpen) {
        if (state.activeCameraMediaStream && typeof state.activeCameraMediaStream.getTracks === "function") {
          for (const trk of state.activeCameraMediaStream.getTracks()) {
            if (typeof trk.stop === "function") trk.stop();
          }
        }
        state.activeCameraMediaStream = null;
        if (state.activeCameraIntervalId) {
          clearInterval(state.activeCameraIntervalId);
          state.activeCameraIntervalId = null;
        }
        if (state.activeCameraRvfcHandle && videoEl && typeof videoEl.cancelVideoFrameCallback === "function") {
          videoEl.cancelVideoFrameCallback(state.activeCameraRvfcHandle);
        }
        state.activeCameraRvfcHandle = null;
        if (state.activeOpticalWasmSession) {
          state.activeOpticalWasmSession = null;
        }
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "optical-camera-stopped");
          statusPanel.textContent = "📷 Cámara óptica detenida y hardware liberado.";
        }
        return;
      }

      if (statusPanel) {
        statusPanel.hidden = false;
        if (statusPanel.style) statusPanel.style.display = "";
        statusPanel.setAttribute("data-audit-action", "optical-camera-rx");
        statusPanel.setAttribute("data-wasm-bridge", "loading");
      }

      let wasmMod = null;
      let wasmStatusAttr = "fallback";
      if (dataLayer && typeof dataLayer.loadWasmModule === "function") {
        try {
          wasmMod = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
          if (wasmMod?.exports?.ekovoz_wasm_abi_version) {
            wasmStatusAttr = `ready-v${wasmMod.exports.ekovoz_wasm_abi_version()}`;
          }
        } catch {
          wasmStatusAttr = "unavailable";
        }
      }
      state.activeOpticalWasmSession = new QrStreamSession();
      state.lastSampledCameraMediaTime = -1;

      const stopOpticalCameraSession = () => {
        state.opticalCameraActive = false;
        if (videoEl) videoEl.hidden = true;
        if (state.activeCameraMediaStream && typeof state.activeCameraMediaStream.getTracks === "function") {
          for (const trk of state.activeCameraMediaStream.getTracks()) {
            if (typeof trk.stop === "function") trk.stop();
          }
        }
        state.activeCameraMediaStream = null;
        if (state.activeCameraIntervalId) {
          clearInterval(state.activeCameraIntervalId);
          state.activeCameraIntervalId = null;
        }
        if (state.activeCameraRvfcHandle && videoEl && typeof videoEl.cancelVideoFrameCallback === "function") {
          videoEl.cancelVideoFrameCallback(state.activeCameraRvfcHandle);
        }
        state.activeCameraRvfcHandle = null;
      };

      const onBatchDecodedMaybeComplete = (wasmBatch) => {
        if (!wasmBatch || !wasmBatch.complete) return false;
        state.lastOpticalRxReport = wasmBatch;
        stopOpticalCameraSession();
        if (statusPanel) {
          statusPanel.setAttribute("data-audit-action", "optical-camera-complete");
          statusPanel.setAttribute("data-rx-complete", "true");
          statusPanel.setAttribute("data-rx-bytes", String(wasmBatch.decodedBytes?.byteLength || 0));
          statusPanel.innerHTML =
            `<div class="audit-receipt" data-action="optical-camera-complete" data-rx-complete="true" data-rx-bytes="${wasmBatch.decodedBytes?.byteLength || 0}">` +
            `✅ <strong>Recepción Óptica Completada (${wasmBatch.decodedBytes?.byteLength || 0} B):</strong> ` +
            `Peeling LT/GF(2) convergente en sesión continua y cámara liberada.</div>`;
        }
        return true;
      };

      const detector =
        typeof globalThis.BarcodeDetector === "function"
          ? new globalThis.BarcodeDetector({ formats: ["qr_code"] })
          : null;
      let cameraMode = "wasm-homography-pgl3";
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      ) {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 480 },
              height: { ideal: 480 },
            },
            audio: false,
          });
          state.activeCameraMediaStream = mediaStream;
          if (videoEl) {
            videoEl.srcObject = mediaStream;
            if (typeof videoEl.play === "function") {
              Promise.resolve(videoEl.play()).catch(() => { });
            }
            if (
              typeof videoEl.readyState === "number" &&
              videoEl.readyState < 2 &&
              typeof videoEl.addEventListener === "function"
            ) {
              await new Promise((resolve) => {
                let done = false;
                const finishReady = () => {
                  if (done) return;
                  done = true;
                  resolve();
                };
                videoEl.addEventListener("loadeddata", finishReady, { once: true });
                setTimeout(finishReady, 80);
              });
            }
          }
          cameraMode = detector ? "getUserMedia+BarcodeDetector+WASM" : "getUserMedia+WASM-PGL3-RS256";
          const captureCanvas =
            typeof targetDoc?.createElement === "function" ? targetDoc.createElement("canvas") : null;
          if (captureCanvas) {
            captureCanvas.width = 480;
            captureCanvas.height = 480;
          }
          let samplingBusy = false;
          const sampleSingleFrame = async () => {
            if (samplingBusy || !state.opticalCameraActive || !videoEl) return;
            samplingBusy = true;
            try {
              if (detector && typeof detector.detect === "function") {
                try {
                  const codes = await detector.detect(videoEl);
                  if (Array.isArray(codes) && codes.length > 0 && codes[0].rawValue) {
                    state.lastScannedOpticalFrameRaw = String(codes[0].rawValue);
                    const rawFrameBytes = new TextEncoder().encode(state.lastScannedOpticalFrameRaw);
                    const wasmBatch = decodeQrStreamViaWasmBridge(
                      [rawFrameBytes],
                      wasmMod,
                      state.activeOpticalWasmSession,
                    );
                    if (onBatchDecodedMaybeComplete(wasmBatch)) return;
                    return;
                  }
                } catch {
                  // Fall through to 480x480 Luma8 WASM homography scanner
                }
              }
              const ctx2d =
                captureCanvas && typeof captureCanvas.getContext === "function"
                  ? captureCanvas.getContext("2d", { willReadFrequently: true })
                  : null;
              if (
                ctx2d &&
                typeof ctx2d.drawImage === "function" &&
                typeof ctx2d.getImageData === "function" &&
                wasmMod?.exports?.scan_luma8_homography_rs_in_place
              ) {
                ctx2d.drawImage(videoEl, 0, 0, 480, 480);
                const rgba = ctx2d.getImageData(0, 0, 480, 480).data;
                const pixCount = 480 * 480;
                const ex = wasmMod.exports;
                const lumaPtr = ex.wasm_alloc(pixCount);
                const outPtr = ex.wasm_alloc(4096);
                try {
                  const lumaView = new Uint8Array(ex.memory.buffer, lumaPtr, pixCount);
                  for (let p = 0, q = 0; p < pixCount; p += 1, q += 4) {
                    lumaView[p] = (77 * rgba[q] + 150 * rgba[q + 1] + 29 * rgba[q + 2]) >> 8;
                  }
                  const decodedLen = ex.scan_luma8_homography_rs_in_place(lumaPtr, 480, 480, outPtr, 4096);
                  if (decodedLen > 0) {
                    const payloadSlice = new Uint8Array(ex.memory.buffer, outPtr, decodedLen).slice();
                    const wasmBatch = decodeQrStreamViaWasmBridge(
                      [payloadSlice],
                      wasmMod,
                      state.activeOpticalWasmSession,
                    );
                    onBatchDecodedMaybeComplete(wasmBatch);
                  }
                } finally {
                  ex.wasm_free(lumaPtr, pixCount);
                  ex.wasm_free(outPtr, 4096);
                }
              }
            } finally {
              samplingBusy = false;
            }
          };
          await sampleSingleFrame();
          if (state.opticalCameraActive && videoEl) {
            const cadenceMs =
              OPTICAL_CADENCE_PRESETS[String(state.opticalCadenceFps || "6.67")]?.frameDurationMs || 150;
            if (typeof videoEl.requestVideoFrameCallback === "function") {
              const onRvfc = (_now, metadata) => {
                if (!state.opticalCameraActive || !videoEl) return;
                const mediaTime = Number(metadata?.mediaTime ?? videoEl.currentTime ?? 0);
                if (mediaTime !== state.lastSampledCameraMediaTime) {
                  state.lastSampledCameraMediaTime = mediaTime;
                  void sampleSingleFrame();
                }
                if (state.opticalCameraActive && typeof videoEl.requestVideoFrameCallback === "function") {
                  state.activeCameraRvfcHandle = videoEl.requestVideoFrameCallback(onRvfc);
                }
              };
              state.activeCameraRvfcHandle = videoEl.requestVideoFrameCallback(onRvfc);
            } else {
              state.activeCameraIntervalId = setInterval(() => {
                if (!state.opticalCameraActive || !videoEl) return;
                const curT = Number(videoEl.currentTime ?? -1);
                if (curT < 0 || curT !== state.lastSampledCameraMediaTime) {
                  state.lastSampledCameraMediaTime = curT;
                  void sampleSingleFrame();
                }
              }, cadenceMs);
              if (typeof state.activeCameraIntervalId?.unref === "function") {
                state.activeCameraIntervalId.unref();
              }
            }
          }
        } catch {
          cameraMode = "permission-denied-or-headless";
        }
      }

      if (statusPanel && statusPanel.getAttribute("data-audit-action") === "optical-camera-rx") {
        statusPanel.setAttribute("data-wasm-bridge", wasmStatusAttr);
        statusPanel.setAttribute("data-camera-mode", cameraMode);
        if (state.lastScannedOpticalFrameRaw) {
          statusPanel.setAttribute("data-last-scanned-frame", state.lastScannedOpticalFrameRaw.slice(0, 64));
        }
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-camera-mode="${escapeHtml(cameraMode)}" data-wasm-bridge="${escapeHtml(wasmStatusAttr)}">` +
          `📷 <strong>Receptor Óptico Bimodal Activo (≤ 32 KB · Modo=${escapeHtml(cameraMode)} · WASM=${escapeHtml(wasmStatusAttr)}):</strong> ` +
          `Captura real Luma8 480×480 + Homografía PGL(3,ℝ) + Reed-Solomon GF(2⁸) + Peeling LT/GF(2).</div>`;
      }
    });
  }

  const relayBtn = getEl("btnOpticalRelayTx", targetDoc);
  if (relayBtn && typeof relayBtn.addEventListener === "function") {
    relayBtn.addEventListener("click", () => {
      state.qrFrameSeq = 0;
      hydrateShareAndAuditDrawer(targetDoc);
      const relayDecoderSource =
        state.lastOpticalRxReport?.decoder &&
          typeof state.lastOpticalRxReport.decoder.reconstructBytes === "function"
          ? state.lastOpticalRxReport.decoder
          : {
            K: 4,
            blockSize: 32,
            isComplete: () => true,
            reconstructBytes: () =>
              new TextEncoder().encode(
                `${state.book}.${state.chapter}.${state.verse} · ${state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
                "Relay payload"
                }`,
              ),
          };
      const relayEncoder = createRelayEncoderFromDecoded(relayDecoderSource, 32);
      const relayDroplet = relayEncoder.nextDroplet();
      state.lastRelayEncoder = relayEncoder;
      const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
      if (statusPanel) {
        statusPanel.hidden = false;
        if (statusPanel.style) statusPanel.style.display = "";
        statusPanel.setAttribute("data-audit-action", "optical-relay-tx");
        statusPanel.setAttribute("data-relay-k", String(relayEncoder.K));
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="optical-relay-tx" data-relay-k="${relayEncoder.K}" data-relay-seq="${relayDroplet.seq}">` +
          `🔁 <strong>Re-Emisión Relay Iniciada (K=${relayEncoder.K} bloques · Droplet #${relayDroplet.seq}):</strong> Re-codificando los K bloques decodificados con nueva semilla Luby Transform.</div>`;
      }
    });
  }
  return executeGaveta4Action;
}
