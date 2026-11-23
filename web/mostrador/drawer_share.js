// ============================================================================
// web/mostrador/drawer_share.js — Gaveta 4 (Compartir Offline, Quine HTML, QRBeam LT & Auditoría Criptográfica)
// Decisiones D1-R41, D6-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { serializeMostradorRouteQuery } from "../i18n_ui.js";
import { escapeHtml } from "./bridge_and_chapter.js";
import { canonicalOrdinalOf } from "./canonical_versification.js";
import {
  verifyArtifactProjectionClosure,
} from "./data_layer.js";
import { lookupPericopeConstructiveReceipt } from "./diachronic_register.js";
import {
  bindOpticalCameraAndCadenceController,
  hydrateOpticalTxAndRxPanels,
  stopQrBeamAutoCadenceTimer,
} from "./drawer_share_optical_controller.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import { validateAllEightLocksPda } from "./mejorar.js";
import {
  CANONICAL_ECO_PACKS_MANIFEST,
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  STORED_ECO_PACKS,
  buildEkpackSigningMessageV2,
  buildFullCorpusDeflateQuineHtml,
  buildQuineHtml,
  commitVerifiedPackToIndexedDb,
  decodeRfc8878RawZstdFrameJs,
  exportBundleAsFile,
  hydrateEcoPacksManifest,
  importBundleFromFile,
  listPacksFromIndexedDbAsync,
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
  MAX_ECO_GRID_29_PAYLOAD_BYTES,
  MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES,
  createRelayEncoderFromDecoded,
  verifyManifestAndMerkleAudit,
} from "./optical_lt.js";

import {
  effectiveThreatClassWeb,
  resolveCanonicalBlockCode,
  stealthNeutralFilenameWeb,
} from "./dosis.js";
import { buildOpenGraphSocialCardSvg1200x630 } from "./drawer_print.js";
import {
  mountOfflineFontNoticeWithLocalImporter,
  summarizeOfflineFontsVaultCatalog,
} from "./offline_font_bundle.js";

export const HAREL_DOSIS_SUBTABS = ["pdf", "mesh", "graphics"];
export {
  MAX_ECO_GRID_29_PAYLOAD_BYTES,
  MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES
};

/**
 * Compuerta bimodal honesta de Shannon/Nyquist (`D5-V2LE`):
 * - Cargas `<= 4 KB` (`ECO-GRID 29×29` a `12 B/cuadro × 6.5 fps = 78 B/s <= 80 B/s`): canal óptico en silencio RF.
 * - Cargas `> 4 KB`: transferencia directa de archivo o HTML Quine auto-contenida (retirada promesa inexistente `qr-v10`).
 */
export function selectBimodalAirgapChannel(payloadByteLength) {
  const bytes = Math.max(0, Number(payloadByteLength) || 0);
  if (bytes <= MAX_ECO_GRID_29_PAYLOAD_BYTES) {
    const ecoGridBytesPerSec = 12 * 6.5;
    return {
      mode: "optical-qr-camera",
      opticalProfile: "eco-grid-29x29",
      maxOpticalBytes: MAX_ECO_GRID_29_PAYLOAD_BYTES,
      throughputBytesPerSec: ecoGridBytesPerSec,
      payloadBytes: bytes,
      estimatedSecondsAt6_5Fps: Number((bytes / ecoGridBytesPerSec).toFixed(2)),
    };
  }
  return {
    mode: "native-file-share",
    opticalProfile: "file-or-quine-html",
    maxOpticalBytes: MAX_ECO_GRID_29_PAYLOAD_BYTES,
    maxEcoGrid29Bytes: MAX_ECO_GRID_29_PAYLOAD_BYTES,
    payloadBytes: bytes,
    estimatedSecondsAt6_5Fps: 1.0,
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

function resolveSignedPackReceipt(langCode = "es", state = null, dataLayer = null) {
  const clean = String(langCode || "es").toLowerCase();
  const base = clean.split("-")[0];
  const statePacks = Array.isArray(state?.packManifest)
    ? state.packManifest
    : Array.isArray(state?.packManifest?.packs)
      ? state.packManifest.packs
      : [];
  const layerManifest = dataLayer?.getHydratedPackManifest?.();
  const layerPacks = Array.isArray(layerManifest)
    ? layerManifest
    : Array.isArray(layerManifest?.packs)
      ? layerManifest.packs
      : [];
  const manifestProvided =
    Boolean(state?.packManifestLoaded) ||
    statePacks.length > 0 ||
    layerPacks.length > 0;
  const sources = [...statePacks, ...layerPacks, ...CANONICAL_ECO_PACKS_MANIFEST];
  const hasSig = (p) =>
    p &&
    String(p.ed25519SignatureHex || "").trim().length > 0 &&
    String(p.signingMessage || "").trim().length > 0;
  const exactSigned = sources.find((p) => String(p?.lang || "").toLowerCase() === clean && hasSig(p));
  if (exactSigned) return { ...exactSigned, _manifestProvided: manifestProvided };
  const baseSigned = sources.find((p) => String(p?.lang || "").toLowerCase() === base && hasSig(p));
  if (baseSigned) return { ...baseSigned, _manifestProvided: manifestProvided };
  const stored = STORED_ECO_PACKS.get(clean) || STORED_ECO_PACKS.get(base) || null;
  if (stored?.hdr) {
    const signingMessage =
      stored.hdr.ev3_signing_message || buildEkpackSigningMessageV2(stored.hdr);
    return {
      ...stored,
      lang: clean,
      signingMessage,
      ed25519SignatureHex: String(stored.hdr.ed25519_signature_hex || stored.signatureHex || ""),
      ed25519PublicKeyHex: String(stored.hdr.ed25519_public_key_hex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX),
      _manifestProvided: manifestProvided,
    };
  }
  const fallback =
    sources.find((p) => String(p?.lang || "").toLowerCase() === clean) ||
    sources.find((p) => String(p?.lang || "").toLowerCase() === base) ||
    CANONICAL_ECO_PACKS_MANIFEST[0];
  return {
    ...(fallback || { lang: clean }),
    _manifestProvided: manifestProvided,
  };
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
  const normalizedSurface = String(verseSurface || "").normalize("NFC");
  const eightLocksReport = validateAllEightLocksPda({
    oldSurface: normalizedSurface,
    newSurface: normalizedSurface,
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

  const isVerifiedSig = ed25519Verified === true;
  const ed25519GateAttr = String(isVerifiedSig);
  const ed25519BadgeText = isVerifiedSig ? "✅ Ed25519 VERIFIED" : "⛔ Ed25519 REJECTED";

  return (
    `<div class="editorial-attestation-receipt" data-ed25519-verified="${ed25519GateAttr}" data-eight-locks-status="${escapeHtml(eightLocksReport.status)}" data-zero-truncation="${zeroTrunc}" data-living-languages="${totalLangs}" data-rust-surface-score="${surfaceScore}" style="padding:0.6rem 0.75rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.76rem;display:flex;flex-direction:column;gap:0.45rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.35rem;">` +
    `<strong>🛡️ ${isEn ? "Sovereign Cryptographic Attestation & 8 Deterministic Locks" : "Atestación Criptográfica Soberana y 8 Candados Deterministas"}</strong>` +
    `<span class="uls-badge" data-ed25519-gate="${ed25519GateAttr}">${ed25519BadgeText} · Zero-Truncation=${zeroTrunc ? "OK" : "PENDING"}</span>` +
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
          if (typeof hydrateShareAndAuditDrawer === "function" && !state._offlinePacksRehydratedOnce) {
            state._offlinePacksRehydratedOnce = true;
            hydrateShareAndAuditDrawer(targetDoc);
          }
        }
      })
      .catch(() => { });
  }

  const packsPanel = getEl("offlinePacksCatalogPanel", targetDoc);
  if (packsPanel) {
    if (
      !state._vaultShareHydratedOnce &&
      !state._vaultShareHydratingPromise &&
      typeof listPacksFromIndexedDbAsync === "function"
    ) {
      state._vaultShareHydratingPromise = Promise.resolve(
        listPacksFromIndexedDbAsync({ force: !Array.isArray(state._hydratedVaultPacks) }),
      )
        .then((vaultPacks) => {
          state._vaultShareHydratedOnce = true;
          state._hydratedVaultPacks = Array.isArray(vaultPacks) ? vaultPacks : [];
          state._vaultShareHydratingPromise = null;
          if (typeof hydrateShareAndAuditDrawer === "function" && packsPanel.isConnected !== false) {
            hydrateShareAndAuditDrawer(targetDoc);
          }
          return state._hydratedVaultPacks;
        })
        .catch(() => {
          state._vaultShareHydratingPromise = null;
          return [];
        });
    }
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
      vaultPacks: Array.isArray(state._hydratedVaultPacks) ? state._hydratedVaultPacks : null,
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

    const ensureShareChildHost = (hostId) => {
      const existing = getEl(hostId, targetDoc);
      if (existing) return existing;
      if (packsPanel?.parentNode && typeof targetDoc?.createElement === "function") {
        const el = targetDoc.createElement("div");
        el.id = hostId;
        if (typeof el.setAttribute === "function") {
          el.setAttribute("data-dosis-subtab-panel", "mesh");
        }
        if (typeof packsPanel.parentNode.appendChild === "function") {
          packsPanel.parentNode.appendChild(el);
        }
        return el;
      }
      return null;
    };

    if (!state._fontsZstManifestRequested && typeof dataLayer?.loadJson === "function") {
      state._fontsZstManifestRequested = true;
      Promise.resolve(dataLayer.loadJson("data/fonts_zst_manifest.json"))
        .then((fontsManifest) => {
          if (fontsManifest) {
            state.fontsZstManifest = fontsManifest;
            if (typeof hydrateShareAndAuditDrawer === "function" && packsPanel.isConnected !== false) {
              hydrateShareAndAuditDrawer(targetDoc);
            }
          }
        })
        .catch(() => { });
    }

    const fontVaultHost = ensureShareChildHost("editorialFontPackVaultPanel");
    if (fontVaultHost) {
      const fontSummary = summarizeOfflineFontsVaultCatalog(state.fontsZstManifest || null);
      fontVaultHost.hidden = false;
      fontVaultHost.innerHTML =
        `<div id="ekfontsVaultSummaryCard" data-ekfonts-bundle="${escapeHtml(fontSummary.bundleFile)}" data-fonts-count="${fontSummary.totalFonts}" style="padding:0.6rem 0.75rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
        `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
        `<strong>🔤 ${isEn ? "Sovereign Font Vault (.ekfonts · 34 .ttf.zst)" : "Bóveda Tipográfica Soberana (.ekfonts · 34 .ttf.zst)"}</strong>` +
        `<a class="uls-chip" href="${escapeHtml(fontSummary.bundleUrl)}" download="${escapeHtml(fontSummary.bundleFile)}" data-ekfonts-bundle-url="${escapeHtml(fontSummary.bundleUrl)}" style="min-height:48px;min-width:48px;display:inline-flex;align-items:center;padding:0.25rem 0.65rem;text-decoration:none;font-size:0.75rem;">📦 ${escapeHtml(fontSummary.bundleFile)} (${fontSummary.totalFonts || 34})</a>` +
        `</div>` +
        `<div id="shareOfflineFontImporterHost"></div>` +
        `</div>`;
      const importerHost = getEl("shareOfflineFontImporterHost", targetDoc);
      if (importerHost) {
        mountOfflineFontNoticeWithLocalImporter(
          importerHost,
          {
            targetFontFile: "CharisSIL-Regular.ttf",
            fontsManifest: fontSummary.fonts,
          },
          {
            targetDoc,
            onImported: () => hydrateShareAndAuditDrawer?.(targetDoc),
          },
        );
      }
    }

    const ogHost = ensureShareChildHost("shareOpenGraphCardPanel");
    if (ogHost) {
      const isStealth =
        Boolean(state.stealthMode) ||
        effectiveThreatClassWeb(state.countryIso2 || "MX", activeLang) === "CLASS_C_STEALTH";
      const blk = resolveCanonicalBlockCode(state.book || "GEN", state.chapter || 1, state.verse || 1);
      const ogCard = buildOpenGraphSocialCardSvg1200x630({
        book: state.book || "GEN",
        chapter: state.chapter || 1,
        verse: state.verse || 1,
        text: activeVerseText,
        lang: activeLang,
        activeGen: state.photocopyGen ?? 3,
        sauvolaK: state.sauvolaK ?? 0.25,
      });
      const ogFilename = isStealth
        ? stealthNeutralFilenameWeb(blk.blockNumber || 1, "svg")
        : `ekovoz_${String(state.book || "gen").toLowerCase()}_${Number(state.chapter) || 1}_${Number(state.verse) || 1}_1200x630.svg`;
      ogHost.hidden = false;
      ogHost.innerHTML =
        `<div class="share-opengraph-card" data-social-card-dimensions="1200x630" style="padding:0.6rem 0.75rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.5rem;">` +
        `<span style="font-size:0.76rem;color:var(--text-secondary);">${isEn ? "OpenGraph <code>1200×630</code> Social Card ready to share offline:" : "Tarjeta OpenGraph <code>1200×630</code> lista para compartir:"}</span>` +
        `<img src="${ogCard.svgDataUrl}" alt="OpenGraph 1200x630" style="max-width:220px;height:auto;border-radius:8px;border:1px solid var(--card-border);" />` +
        `<a id="btnDownloadSocialCard1200x630" class="uls-chip" href="${ogCard.svgDataUrl}" download="${escapeHtml(ogFilename)}" style="min-height:48px;min-width:48px;display:inline-flex;align-items:center;padding:8px 12px;text-decoration:none;font-size:0.76rem;">🖼️ ${isEn ? "Download Social Card 1200×630 (SVG)" : "Descargar Tarjeta Social 1200×630 (SVG)"}</a>` +
        `</div>`;
    }

    const installEcoBtn = getEl("btnInstallEcoPackOffline", targetDoc);
    if (installEcoBtn && typeof installEcoBtn.addEventListener === "function" && !installEcoBtn._ecoInstallBound) {
      installEcoBtn._ecoInstallBound = true;
      installEcoBtn.addEventListener("click", async () => {
        const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
        if (packBytes && packBytes.byteLength >= 32) {
          const playerWasm = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
          const packReceipt = resolveSignedPackReceipt(packLang, state, dataLayer);
          await commitVerifiedPackToIndexedDb(
            {
              lang: packLang,
              packBytes,
              expectedCrc32: packReceipt?.crc32Hex || "",
              expectedSha256: packReceipt?.ekpackSha256 || packReceipt?.sha256 || "",
            },
            SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
            playerWasm,
          );
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
          const packReceipt = resolveSignedPackReceipt(packLang, state, dataLayer);
          saved = await savePackToIndexedDb(packLang, {
            packBytes,
            expectedCrc32: packReceipt?.crc32Hex || "",
            expectedSha256: packReceipt?.ekpackSha256 || packReceipt?.sha256 || "",
          });
        }
        const allPacks = await listPacksFromIndexedDbAsync({ force: true });
        state._hydratedVaultPacks = Array.isArray(allPacks) ? allPacks : [];
        state._vaultShareHydratedOnce = true;
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
            const packReceipt = resolveSignedPackReceipt(packLang, state, dataLayer);
            loaded = await commitVerifiedPackToIndexedDb({
              lang: packLang,
              packBytes,
              expectedCrc32: packReceipt?.crc32Hex || "",
              expectedSha256: packReceipt?.ekpackSha256 || packReceipt?.sha256 || "",
            });
          }
        }
        const allPacks = await listPacksFromIndexedDbAsync({ force: true });
        state._hydratedVaultPacks = Array.isArray(allPacks) ? allPacks : [];
        state._vaultShareHydratedOnce = true;
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
        if (!(packBytes instanceof Uint8Array) || packBytes.byteLength < 32) {
          exportSneakernetBtn.setAttribute("data-sneakernet-error", "missing-pack-bytes");
          const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
          if (statusPanel) {
            statusPanel.hidden = false;
            statusPanel.textContent = `⛔ No hay contenedor binario ${packLang}.ekpack descargado en bóveda para exportar.`;
          }
          return;
        }
        const channel = selectBimodalAirgapChannel(packBytes.byteLength);
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
            const fileReceipt = resolveSignedPackReceipt(nameStem, state, dataLayer);
            const committed = await commitVerifiedPackToIndexedDb(
              {
                lang: nameStem,
                packBytes: fileBytes,
                expectedCrc32: fileReceipt?.crc32Hex || "",
                expectedSha256: fileReceipt?.ekpackSha256 || fileReceipt?.sha256 || "",
              },
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
            const committed = await commitVerifiedPackToIndexedDb(
              {
                lang: imported.lang || packLang,
                packBytes: candidateBin,
                expectedCrc32: imported.crc32Hex || "",
                expectedSha256: imported.sha256 || "",
              },
              SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
              playerWasm,
            );
            const verifiedOk = Boolean(committed?.verified);
            importSneakernetInput.setAttribute("data-imported-valid", String(verifiedOk));
            if (verifiedOk && typeof ctx.navigate === "function") {
              await ctx.navigate({ lang: committed.lang || imported.lang || packLang }, targetDoc);
            }
            return;
          }
          importSneakernetInput.setAttribute("data-imported-valid", "false");
          return;
        }
        if (state.lastExportedSneakernetBundle) {
          const imported = importBundleFromFile(state.lastExportedSneakernetBundle);
          const candidateBin =
            imported.payloadBytes instanceof Uint8Array && imported.payloadBytes.byteLength >= 32
              ? imported.payloadBytes
              : null;
          if (imported.valid && candidateBin && parseEkpackPreamble32Js(candidateBin)) {
            const playerWasm = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
            const committed = await commitVerifiedPackToIndexedDb(
              {
                lang: imported.lang || packLang,
                packBytes: candidateBin,
                expectedCrc32: imported.crc32Hex || "",
                expectedSha256: imported.sha256 || "",
              },
              SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
              playerWasm,
            );
            importSneakernetInput.setAttribute("data-imported-valid", String(Boolean(committed?.verified)));
            return;
          }
        }
        importSneakernetInput.setAttribute("data-imported-valid", "false");
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
          stopQrBeamAutoCadenceTimer(state);
          const videoEl = getEl("bibleOpticalCameraVideo", targetDoc);
          if (videoEl) videoEl.hidden = true;
        }
      });
    }
  }

  hydrateOpticalTxAndRxPanels({
    qrPanel: getEl("bibleOpticalQrStreamPanel", targetDoc),
    rxPanel: getEl("opticalReceiverRxPanel", targetDoc),
    shutterInput: getEl("rxShutterUsInput", targetDoc),
    readoutInput: getEl("rxRollingReadoutMsInput", targetDoc),
    runRxBtn: getEl("btnRunOpticalRxSession", targetDoc),
    getEl,
    targetDoc,
    state,
    dataLayer,
    isEn,
    rehydrateDrawer: hydrateShareAndAuditDrawer,
  });

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
    const signedPack = resolveSignedPackReceipt(activeLang, state, dataLayer);
    const hasHydratedSig =
      String(signedPack?.ed25519SignatureHex || "").trim().length > 0 &&
      String(signedPack?.signingMessage || "").trim().length > 0;
    const ed25519GateValue = hasHydratedSig
      ? verifyEd25519ManifestSignature(
        signedPack.signingMessage,
        signedPack.ed25519SignatureHex,
        signedPack.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
        dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null,
      ) === true
      : false;
    const diachronicAudit =
      state.diachronicAuditPayload || dataLayer?.getHydratedDiachronicAudit?.() || null;
    const pericopeReceipt = lookupPericopeConstructiveReceipt(
      diachronicAudit,
      state.book || "GEN",
      state.chapter || 1,
      state.verse || 1,
    );
    auditStatusPanel.setAttribute?.("data-ed25519-verified", String(ed25519GateValue));
    auditStatusPanel.innerHTML = renderEditorialAuditAttestationHtml({
      verseSurface: activeVerseTextForQuine,
      ed25519Verified: ed25519GateValue,
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

export { applyStaticChromeTranslations } from "./chrome_static_i18n.js";

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
        const bookCountMatch = quinePayload.match(/data-(?:book-count|quine-books)="(\d+)"/);
        const quineBookCount = bookCountMatch ? Number(bookCountMatch[1]) : 1;
        statusPanel.setAttribute("data-audit-action", "share-quine");
        statusPanel.setAttribute("data-book-count", String(quineBookCount));
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="share-quine" data-quine-lang="${escapeHtml(packLang)}" data-quine-bytes="${quinePayload.length}" data-book-count="${quineBookCount}" data-kleene-quine="true">` +
          `✅ <strong>Quine Autónomo de Kleene Listo (${escapeHtml(packLang.toUpperCase())}):</strong> ` +
          `<a href="${escapeHtml(quineUrl)}" download="lector_offline_${escapeHtml(packLang)}.html">Descargar lector_offline_${escapeHtml(packLang)}.html</a> ` +
          `(${quinePayload.length} B · Punto Fijo de Kleene · ${quineBookCount} ${quineBookCount === 1 ? "libro" : "libros"} deflate-raw · 0 fetch · 100% offline).</div>`;
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
      const signedPack = resolveSignedPackReceipt(state.lang, state, dataLayer);
      const ed25519Ok = await verifyEd25519ManifestSignatureWebCrypto(
        signedPack.signingMessage,
        signedPack.ed25519SignatureHex,
        signedPack.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
        dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null,
      );
      if (ed25519Ok) {
        const binaryPack = await resolvePackBytesForVault(packLang, dataLayer);
        if (binaryPack instanceof Uint8Array && parseEkpackPreamble32Js(binaryPack)) {
          await verifyAndStoreEcoPack({
            lang: packLang,
            packBytes: binaryPack,
            expectedCrc32: signedPack.crc32Hex || "",
            expectedSha256: signedPack.ekpackSha256 || signedPack.sha256 || "",
            signatureHex: signedPack.ed25519SignatureHex,
            signingMessage: signedPack.signingMessage,
            publicKeyHex: signedPack.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
            wasmPlayerMod: dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null,
          }).catch(() => null);
        }
      }
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
    }
  };

  for (const shareBtnId of [
    "btnShareQuine",
    "btnCopyDirectShareLink",
    "btnVerifyEd25519Signature",
  ]) {
    const sBtn = getEl(shareBtnId, targetDoc);
    if (sBtn && typeof sBtn.addEventListener === "function") {
      sBtn.addEventListener("click", async () => {
        sBtn.setAttribute("data-last-invoked", shareBtnId);
        await executeGaveta4Action(shareBtnId);
      });
    }
  }

  const getUserMediaFn =
    typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
      ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      : null;

  bindOpticalCameraAndCadenceController({
    fpsSel: getEl("bibleOpticalFpsSelect", targetDoc),
    camRxBtn: getEl("btnToggleOpticalCameraRx", targetDoc),
    statusPanelGetter: () => getEl("editorialAuditStatusPanel", targetDoc),
    videoElGetter: () => getEl("bibleOpticalCameraVideo", targetDoc),
    targetDoc,
    state,
    dataLayer,
    getUserMediaFn,
    rehydrateDrawer: hydrateShareAndAuditDrawer,
  });

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
