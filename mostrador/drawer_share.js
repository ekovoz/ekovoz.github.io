// ============================================================================
// web/mostrador/drawer_share.js — Gaveta 4 (Compartir Offline, Quine HTML, QRBeam LT & Auditoría Criptográfica)
// Decisiones D1-R41, D6-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { serializeMostradorRouteQuery } from "../i18n_ui.js";
import { escapeHtml } from "./bridge_and_chapter.js";
import { canonicalOrdinalOf } from "./canonical_versification.js";
import { lookupPericopeConstructiveReceipt } from "./diachronic_register.js";
import { bindSurfaceActions, patchStoreState } from "./dom_patch.js";
import {
    bindOpticalCameraAndCadenceController,
    hydrateOpticalTxAndRxPanels,
    stopQrBeamAutoCadenceTimer,
} from "./drawer_share_optical_controller.js";
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

import { bindAuthenticitySheetIsolation, renderAuthenticityAndLicenseSheetHtml } from "./authenticity_sheet.js";
import { resolveCanonicalBlockCode } from "./dosis.js";
import {
    mountOfflineFontNoticeWithLocalImporter,
    summarizeOfflineFontsVaultCatalog,
} from "./offline_font_bundle.js";
import { INTENT_LAYER_CONTRACT, resolveActiveWorkDrawerContext, resolveWorkDrawerAdapter, validateTwoLayerContract } from "./projection_contract.js";
import {
    bindProvenanceVerifierEvents,
    renderEditorialAuditAttestationHtml,
    renderEditorialProvenanceCardHtml,
} from "./provenance_and_support_panel.js";
import { buildOpenGraphSocialCardSvg1200x630 } from "./social_and_photocopy_cards.js";
import { resolveSafeDownloadFilename } from "./stealth_filename.js";
import { hydrateVaultStorageManagerPanel, renderPortabilityResearchCardHtml } from "./vault_manager_panel.js";

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
        stealthMode: Boolean(state.stealthMode),
        countryIso2: state.countryIso2 || "MX",
    });
    const quineRelUrl = `data:text/html;charset=utf-8,${encodeURIComponent(synthesizedQuineHtml)}`;
    const packMode = "kleene-quine-zero-fetch";
    const quineFilename = resolveSafeDownloadFilename(state, { kind: "quine_html", lang: activeLang });

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
                    if (cat.matrixTier0Url) state.matrixTier0Url = String(cat.matrixTier0Url);
                    if (cat.matrixTier0Bytes) state.matrixTier0Bytes = Number(cat.matrixTier0Bytes) || 7562231;
                    if (typeof hydrateShareAndAuditDrawer === "function" && !state._offlinePacksRehydratedOnce) {
                        state._offlinePacksRehydratedOnce = true;
                        hydrateShareAndAuditDrawer(targetDoc);
                    }
                }
            })
            .catch(() => { });
    }

    const workCtx = resolveActiveWorkDrawerContext(state);
    const workAdapter = resolveWorkDrawerAdapter(state);
    const shareSheetEl = getEl("bibleShareAndAuditSheet", targetDoc);
    if (shareSheetEl) {
        shareSheetEl.removeAttribute?.("hidden");
        shareSheetEl.setAttribute?.("data-work-share-target", workAdapter.shareTarget || "biblia_quine");
        shareSheetEl.setAttribute?.("data-unified-offline-vault", "true");
        const qrHost = getEl("bibleOpticalQrStreamPanel", targetDoc);
        const camHost = getEl("opticalCameraViewportHost", targetDoc);
        if (qrHost && camHost && camHost.parentNode === shareSheetEl && typeof shareSheetEl.insertBefore === "function") {
            shareSheetEl.insertBefore(qrHost, camHost);
        }
    }
    const sharePacksDetailsEl = getEl("shareOfflinePacksDetails", targetDoc);
    sharePacksDetailsEl?.setAttribute?.("data-vault-unified", "true");
    bindAuthenticitySheetIsolation({ targetDoc, getEl });
    const authHost = getEl("editorialProvenanceCardHost", targetDoc);
    if (authHost && !getEl("authenticityLicenseIsolationNotice", targetDoc) && typeof targetDoc?.createElement === "function") {
        const notice = targetDoc.createElement("div");
        notice.innerHTML = renderAuthenticityAndLicenseSheetHtml({
            activeWork: workCtx.activeWork,
            activeLang: packLang,
            editorialProvenance: state.editorialProvenance || null,
            uiLocale: state.uiLocale || "es",
        });
        authHost.appendChild?.(notice);
    }

    const packsPanel = getEl("offlinePacksCatalogPanel", targetDoc);
    if (packsPanel) {
        if (
            !state._vaultShareHydratedOnce &&
            !state._vaultShareHydratingPromise &&
            typeof listPacksFromIndexedDbAsync === "function"
        ) {
            state._vaultShareHydratingPromise = Promise.resolve().then(() =>
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
        const rawEcoMeshCardHtml = renderOfflineMeshEcoCardHtml({
            activeLang: packLang,
            activeVerseOrdinal: Math.max(0, (Number(activeOrdinal) || 1) - 1),
            activeVerseRef: `${state.book}.${state.chapter}.${state.verse}`,
            activeVerseText,
            uiLocale: state.uiLocale || "es",
            vaultPacks: Array.isArray(state._hydratedVaultPacks) ? state._hydratedVaultPacks : null,
        });
        const ecoMeshCardHtml = rawEcoMeshCardHtml.replace(
            /<div class="ek-row-wrap ek-mb-sm">(?:<a class="uls-chip eco-pack-download-link"[\s\S]*?)?<\/div>/,
            "",
        );
        const quineBtnEl = getEl("btnShareQuine", targetDoc);
        if (quineBtnEl && typeof quineBtnEl.setAttribute === "function") {
            quineBtnEl.setAttribute("data-quine-download", "true");
            quineBtnEl.setAttribute("data-quine-url", quineRelUrl);
            quineBtnEl.textContent = isEn
                ? "📦 Export portable HTML copy (USB / Bluetooth)"
                : "📦 Exportar copia HTML portable (USB / Bluetooth)";
        }
        const workBannerHtml = workCtx.isSisterWork
            ? `<aside class="work-context-drawer-banner" data-work-context="${escapeHtml(workCtx.activeWork)}"><strong>${escapeHtml(workCtx.bannerText)}</strong></aside>`
            : "";
        const vaultHostEl = getEl("vaultStorageManagerHost", targetDoc);
        if (shareSheetEl && typeof targetDoc?.createElement === "function" && typeof shareSheetEl.insertBefore === "function") {
            let topShareBanner = getEl("shareActiveWorkBanner", targetDoc);
            if (workCtx.isSisterWork) {
                if (!topShareBanner) {
                    topShareBanner = targetDoc.createElement("aside");
                    topShareBanner.id = "shareActiveWorkBanner";
                    topShareBanner.className = "work-context-drawer-banner";
                    shareSheetEl.insertBefore(topShareBanner, vaultHostEl || packsPanel);
                }
                topShareBanner.removeAttribute?.("hidden");
                topShareBanner.setAttribute?.("data-work-context", workCtx.activeWork);
                topShareBanner.innerHTML = `<strong>${escapeHtml(workCtx.bannerText)}</strong>`;
            } else if (topShareBanner) {
                topShareBanner.setAttribute?.("hidden", "");
            }
        }
        const llmsCleanLang = String(activeLang || "es").split("-")[0] || "es";
        const llmsHref =
            workCtx.activeWork === "felices"
                ? `llms/felices/${["ar", "bn", "en", "es", "fa", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "tr", "ur", "zh-Hans"].includes(activeLang) ? activeLang : "es"}.md`
                : workCtx.activeWork === "evangelios"
                    ? `llms/evangelios/${llmsCleanLang === "stp" ? "stp" : "es"}.md`
                    : ["ar", "bn", "en", "es", "fa", "fr", "hi", "id"].includes(llmsCleanLang)
                        ? `llms/biblia/${llmsCleanLang}.md`
                        : "llms.txt";
        if (!state._downloadsManifestRequested && typeof dataLayer?.loadJson === "function") {
            state._downloadsManifestRequested = true;
            Promise.resolve(dataLayer.loadJson("downloads_manifest.json"))
                .then((dlManifest) => {
                    if (Array.isArray(dlManifest)) {
                        state.downloadsManifestEntries = dlManifest;
                        if (typeof hydrateShareAndAuditDrawer === "function" && packsPanel.isConnected !== false) {
                            hydrateShareAndAuditDrawer(targetDoc);
                        }
                    }
                })
                .catch(() => { });
        }
        const portabilityCardHtml = renderPortabilityResearchCardHtml({
            dlEntries: state.downloadsManifestEntries || [],
            isEn,
        });
        const sharePacksDetailsEl = getEl("shareOfflinePacksDetails", targetDoc);
        sharePacksDetailsEl?.removeAttribute?.("hidden");
        const authCardForDossiers = getEl("shareAuthenticityUnifiedCard", targetDoc);
        const proDossiersHtml = `<section id="shareProBovedaDossiersDetails" class="ek-card ek-mt-xs" data-pro-boveda="true" data-technical-plane="true"><strong class="ek-title-sm">${isEn ? "Authenticity Center: Guides (llms) & Manifest (110 assets)" : "Centro de Autenticidad: Guías (llms) y Manifiesto (110 activos)"}</strong><div id="shareProBovedaDossiersBody" class="ek-stack-sm ek-mt-xs"><a id="linkActiveLlmsManifest" class="uls-chip ek-btn-link" href="${escapeHtml(llmsHref)}" data-work="${escapeHtml(workCtx.activeWork)}">🤖 ${isEn ? "Open Text Guide (llms)" : "Índice textual limpio (llms)"}</a>${portabilityCardHtml}</div></section>`;
        if (authCardForDossiers && typeof targetDoc?.createElement === "function") { const dHost = getEl("shareProBovedaDossiersHost", targetDoc) || Object.assign(targetDoc.createElement("div"), { id: "shareProBovedaDossiersHost" }); if (!dHost.parentNode) authCardForDossiers.appendChild?.(dHost); dHost.innerHTML = proDossiersHtml; }
        packsPanel.innerHTML = `${workBannerHtml}<div class="mostrador-offline-packs" data-lang="${escapeHtml(activeLang)}" data-active-work="${escapeHtml(workCtx.activeWork)}" data-pack-mode="${packMode}" data-quine-url="${escapeHtml(quineRelUrl)}"><a href="${escapeHtml(quineRelUrl)}" download="${escapeHtml(quineFilename)}" data-quine-download="true" data-pack-mode="${packMode}" hidden></a>${ecoMeshCardHtml}</div>${authCardForDossiers ? "" : proDossiersHtml}`;

        const ensureShareChildHost = (hostId, subtabName = "mesh") => {
            const existing = getEl(hostId, targetDoc);
            if (existing) { if (subtabName !== "mesh") existing.setAttribute?.("data-dosis-subtab-panel", subtabName); return existing; }
            if (packsPanel?.parentNode && typeof targetDoc?.createElement === "function") {
                const el = targetDoc.createElement("div"); el.id = hostId;
                if (typeof el.setAttribute === "function") el.setAttribute("data-dosis-subtab-panel", subtabName);
                packsPanel.parentNode.appendChild?.(el);
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
            const fm = state.fontsZstManifest || null;
            const fontSummary = summarizeOfflineFontsVaultCatalog(fm);
            const rawFontMb = ((Number(fm?.total_raw_bytes) || 12175164) / (1024 * 1024)).toFixed(2);
            const zstFontMb = ((Number(fm?.total_zst_bytes) || 5543056) / (1024 * 1024)).toFixed(2);
            const zstSavedPct = Math.max(
                1,
                Math.round((1 - (Number(fm?.total_zst_bytes) || 5543056) / (Number(fm?.total_raw_bytes) || 12175164)) * 100),
            );
            fontVaultHost.innerHTML =
                `<div id="ekfontsVaultSummaryCard" class="ekfonts-vault-summary-card" data-ekfonts-bundle="${escapeHtml(fontSummary.bundleFile)}" data-fonts-count="${fontSummary.totalFonts}" data-zst-saved-pct="${zstSavedPct}">` +
                `<div class="photocopy-header-row">` +
                `<strong>🔤 ${isEn ? "Offline Typography Pack (34 fonts)" : "Paquete tipográfico sin conexión (34 fuentes)"}</strong>` +
                `<span class="uls-badge" data-zst-savings-badge="true">Zstd −${zstSavedPct}% (${rawFontMb} → ${zstFontMb} MB)</span>` +
                `<a class="uls-chip ekfonts-download-chip" href="${escapeHtml(fontSummary.bundleUrl)}" download="${escapeHtml(fontSummary.bundleFile)}" data-tech-key="${escapeHtml(fontSummary.bundleFile)}" data-ekfonts-bundle-url="${escapeHtml(fontSummary.bundleUrl)}">📦 ${isEn ? "Download typography pack" : "Descargar paquete tipográfico"} (${fontSummary.totalFonts || 34})</a>` +
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

        const ogHost = ensureShareChildHost("shareOpenGraphCardPanel", "graphics");
        if (ogHost) {
            const blk = resolveCanonicalBlockCode(state.book || "GEN", state.chapter || 1, state.verse || 1);
            const ogCard = buildOpenGraphSocialCardSvg1200x630({
                book: state.book || "GEN",
                chapter: state.chapter || 1,
                verse: state.verse || 1,
                text: activeVerseText,
                lang: activeLang,
                uiLocale: state.uiLocale || "es",
            });
            const ogFilename = resolveSafeDownloadFilename(state, { kind: "opengraph_svg", blockNumber: blk.blockNumber || 1 });
            ogHost.innerHTML =
                `<div class="share-opengraph-card" data-social-card-dimensions="1200x630">` +
                `<span class="share-opengraph-caption">${isEn ? "Social Card <code>1200×630</code> ready to share offline:" : "Tarjeta Social <code>1200×630</code> lista para compartir:"}</span>` +
                `<img class="share-opengraph-img" src="${ogCard.svgDataUrl}" alt="OpenGraph 1200x630" />` +
                `<a id="btnDownloadSocialCard1200x630" class="uls-chip share-opengraph-dl" href="${ogCard.svgDataUrl}" download="${escapeHtml(ogFilename)}">🖼️ ${isEn ? "Download Social Card 1200×630 (SVG)" : "Descargar Tarjeta Social 1200×630 (SVG)"}</a>` +
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
                    statusPanel.classList?.add("is-visible");
                    statusPanel.setAttribute?.("data-status-visible", "true");
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
                    statusPanel.classList?.add("is-visible");
                    statusPanel.setAttribute?.("data-status-visible", "true");
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
                        statusPanel.classList?.add("is-visible");
                        statusPanel.setAttribute?.("data-status-visible", "true");
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
                const commitBundleText = async (rawText) => {
                    const imported = importBundleFromFile(rawText);
                    const candidateBin =
                        imported.payloadBytes instanceof Uint8Array && imported.payloadBytes.byteLength >= 32
                            ? imported.payloadBytes
                            : null;
                    if (!imported.valid || !candidateBin || !parseEkpackPreamble32Js(candidateBin)) return null;
                    const playerWasm = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
                    return commitVerifiedPackToIndexedDb(
                        {
                            lang: imported.lang || packLang,
                            packBytes: candidateBin,
                            expectedCrc32: imported.crc32Hex || "",
                            expectedSha256: imported.sha256 || "",
                        },
                        SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
                        playerWasm,
                    );
                };
                const selectedFile = evt?.target?.files?.[0] || importSneakernetInput.files?.[0] || null;
                if (selectedFile && typeof selectedFile.arrayBuffer === "function") {
                    const fileBytes = new Uint8Array(await selectedFile.arrayBuffer());
                    if (parseEkpackPreamble32Js(fileBytes)) {
                        const nameStem = String(selectedFile.name || `${packLang}.ekpack`).replace(/\.ekpack$/i, "").trim() || packLang;
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
                        await ctx.navigate?.({ lang: committed.lang }, targetDoc);
                        return;
                    }
                    const committed = await commitBundleText(new TextDecoder("utf-8").decode(fileBytes));
                    const verifiedOk = Boolean(committed?.verified);
                    importSneakernetInput.setAttribute("data-imported-valid", String(verifiedOk));
                    if (verifiedOk) await ctx.navigate?.({ lang: committed.lang || packLang }, targetDoc);
                    return;
                }
                if (state.lastExportedSneakernetBundle) {
                    const committed = await commitBundleText(state.lastExportedSneakernetBundle);
                    if (committed) {
                        importSneakernetInput.setAttribute("data-imported-valid", String(Boolean(committed.verified)));
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
        if (dBtn) {
            dBtn.setAttribute?.("data-action", `share-tab-${tabName}`);
            bindSurfaceActions(dBtn, {
                [`share-tab-${tabName}`]: () => {
                    patchStoreState(ctx, { activeSubtabBySheet: { ...(state.activeSubtabBySheet || {}), share: tabName } }, "sheet");
                    if (tabName !== "pdf") {
                        stopQrBeamAutoCadenceTimer(state);
                    }
                },
            }, { scope: `share-tab-${btnId}`, events: ["click"] });
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
            explicitUserVerification: Boolean(state.userVerifiedEdition),
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

    void hydrateVaultStorageManagerPanel({ state, targetDoc, getEl });
    const provHost = getEl("editorialProvenanceCardHost", targetDoc);
    if (provHost) {
        const authCard = getEl("shareAuthenticityUnifiedCard", targetDoc);
        if (authCard && typeof authCard.setAttribute === "function") {
            const twoLayer = validateTwoLayerContract(targetDoc?.querySelectorAll?.("details")?.length || 0, INTENT_LAYER_CONTRACT);
            authCard.setAttribute("data-max-prod-details", String(twoLayer.maxProdDetails));
            authCard.setAttribute("data-two-layer-valid", String(twoLayer.valid));
        }
        if (authCard && provHost.parentNode === authCard && typeof authCard.insertBefore === "function" && authCard.firstChild && authCard.firstChild !== provHost) {
            authCard.insertBefore(provHost, authCard.firstChild);
        }
        provHost.removeAttribute?.("hidden");
        provHost.innerHTML = renderEditorialProvenanceCardHtml(state.editorialProvenance || null, state.uiLocale || "es");
        bindProvenanceVerifierEvents(provHost, state.editorialProvenance || null, state.uiLocale || "es", { dataLayer });
        if (!state.editorialProvenance && dataLayer && typeof dataLayer.loadEditorialProvenance === "function") {
            Promise.resolve(dataLayer.loadEditorialProvenance())
                .then((prov) => {
                    if (prov) {
                        state.editorialProvenance = prov;
                        provHost.innerHTML = renderEditorialProvenanceCardHtml(prov, state.uiLocale || "es");
                        provHost._berneVerifierBound = false;
                        bindProvenanceVerifierEvents(provHost, prov, state.uiLocale || "es", { dataLayer });
                    }
                })
                .catch(() => { });
        }
    }
}

export { applyStaticChromeTranslations } from "./chrome_static_i18n.js";
export function bindShareDrawerActionEvents(ctx = {}) {
    const { state, dataLayer, targetDoc, getEl, hydrateShareAndAuditDrawer } = ctx;
    const executeGaveta4Action = async (shareBtnId) => {
        hydrateShareAndAuditDrawer(targetDoc);
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
            statusPanel.removeAttribute?.("hidden");
            statusPanel.setAttribute?.("data-status-visible", "true");
        }
        const packLang = String(state.lang || "es").trim() || "es";

        if (shareBtnId === "btnShareQuine") {
            const packBytes = await resolvePackBytesForVault(packLang, dataLayer);
            const playerWasm =
                dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") ||
                (typeof dataLayer?.loadWasmModule === "function" ? await dataLayer.loadWasmModule("ekovoz_player_wasm") : null);
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
            const safeQuineName = resolveSafeDownloadFilename(state, { kind: "quine_html", lang: packLang });
            if (typeof targetDoc?.createElement === "function" && typeof quineUrl === "string" && quineUrl.startsWith("blob:")) {
                const dlLink = targetDoc.createElement("a");
                dlLink.href = quineUrl;
                dlLink.download = safeQuineName;
                dlLink.click?.();
            }
            if (statusPanel) {
                const bookCountMatch = quinePayload.match(/data-(?:book-count|quine-books)="(\d+)"/);
                const quineBookCount = bookCountMatch ? Number(bookCountMatch[1]) : 1;
                statusPanel.setAttribute("data-audit-action", "share-quine");
                statusPanel.setAttribute("data-book-count", String(quineBookCount));
                statusPanel.innerHTML =
                    `<div class="audit-receipt" data-action="share-quine" data-quine-lang="${escapeHtml(packLang)}" data-quine-bytes="${quinePayload.length}" data-book-count="${quineBookCount}" data-kleene-quine="true">` +
                    `✅ <strong>Paquete Offline Listo (${escapeHtml(packLang.toUpperCase())}):</strong> ` +
                    `<a href="${escapeHtml(quineUrl)}" download="${escapeHtml(safeQuineName)}">Descargar ${escapeHtml(safeQuineName)}</a> ` +
                    `(${quinePayload.length} B · ${quineBookCount} ${quineBookCount === 1 ? "libro" : "libros"} · 100% offline).</div>`;
            }
        } else if (shareBtnId === "btnCopyDirectShareLink") {
            const shareUrl = serializeMostradorRouteQuery(state);
            navigator?.clipboard?.writeText?.(shareUrl).catch(() => { });
            if (statusPanel) {
                statusPanel.setAttribute("data-audit-action", "copy-link");
                statusPanel.innerHTML = `<div class="audit-receipt" data-action="copy-link" data-share-url="${escapeHtml(shareUrl)}">🔗 <strong>Enlace directo copiado:</strong> <code>${escapeHtml(shareUrl)}</code></div>`;
            }
        } else if (shareBtnId === "btnVerifyEd25519Signature") {
            state.userVerifiedEdition = true;
            const manifest = await dataLayer.loadManifest();
            const merkleObj = typeof dataLayer.loadMerkleRoot === "function" ? await dataLayer.loadMerkleRoot() : null;
            const receipt = verifyManifestAndMerkleAudit({
                manifest,
                merkleRootHex: merkleObj?.merkleRootHex || "",
                lang: state.lang,
                book: state.book,
                chapter: state.chapter,
            });
            const signedPack = resolveSignedPackReceipt(state.lang, state, dataLayer);
            const wasmMod = dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") || null;
            const ed25519Ok = await verifyEd25519ManifestSignatureWebCrypto(
                signedPack.signingMessage,
                signedPack.ed25519SignatureHex,
                signedPack.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
                wasmMod,
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
                        wasmPlayerMod: wasmMod,
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
                    explicitUserVerification: true,
                    masterCensus: state.masterCensusSummary || dataLayer?.getHydratedMasterCensusSummary?.() || null,
                    rustTelemetry: state.editorialProfiles?.rust_domain_engines_telemetry || dataLayer?.getHydratedEditorialProfiles?.()?.rust_domain_engines_telemetry || null,
                    uiLocale: state.uiLocale || "es",
                });
                statusPanel.innerHTML =
                    `<div class="audit-receipt" data-action="verify-signature" data-verified="${receipt.verified && ed25519Ok}" data-ed25519="${ed25519Ok}" data-merkle-root="${escapeHtml(receipt.merkleRootHex)}">` +
                    `🔐 <strong>Auditoría Criptográfica (${escapeHtml(receipt.algorithm)} + Ed25519):</strong> ` +
                    `Estado=${receipt.verified && ed25519Ok ? "VERIFICADO" : "PENDIENTE"} · Artefactos=${receipt.artifactsChecked} · ` +
                    `Merkle Root=<code>${escapeHtml(receipt.merkleRootHex.slice(0, 16))}…</code> · SHA-256=<code>${escapeHtml(receipt.sampleSha256.slice(0, 16))}…</code></div>` +
                    baseAttestation;
            }
        }
    };

    for (const shareBtnId of ["btnShareQuine", "btnCopyDirectShareLink", "btnVerifyEd25519Signature"]) {
        const sBtn = getEl(shareBtnId, targetDoc);
        sBtn?.addEventListener?.("click", async () => {
            sBtn.setAttribute("data-last-invoked", shareBtnId);
            await executeGaveta4Action(shareBtnId);
        });
    }

    const getUserMediaFn = typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
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
    relayBtn?.addEventListener?.("click", () => {
        state.qrFrameSeq = 0;
        hydrateShareAndAuditDrawer(targetDoc);
        const relayDecoderSource =
            state.lastOpticalRxReport?.decoder && typeof state.lastOpticalRxReport.decoder.reconstructBytes === "function"
                ? state.lastOpticalRxReport.decoder
                : {
                    K: 4,
                    blockSize: 32,
                    isComplete: () => true,
                    reconstructBytes: () => new TextEncoder().encode(
                        `${state.book}.${state.chapter}.${state.verse} · ${state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "Relay payload"}`,
                    ),
                };
        const relayEncoder = createRelayEncoderFromDecoded(relayDecoderSource, 32);
        const relayDroplet = relayEncoder.nextDroplet();
        state.lastRelayEncoder = relayEncoder;
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
            statusPanel.setAttribute?.("data-status-visible", "true");
            statusPanel.setAttribute("data-audit-action", "optical-relay-tx");
            statusPanel.setAttribute("data-relay-k", String(relayEncoder.K));
            statusPanel.innerHTML =
                `<div class="audit-receipt" data-action="optical-relay-tx" data-relay-k="${relayEncoder.K}" data-relay-seq="${relayDroplet.seq}">` +
                `🔁 <strong>Re-Emisión Relay Iniciada (K=${relayEncoder.K} bloques · Droplet #${relayDroplet.seq}):</strong> Re-codificando los K bloques decodificados con nueva semilla Luby Transform.</div>`;
        }
    });
    return executeGaveta4Action;
}
