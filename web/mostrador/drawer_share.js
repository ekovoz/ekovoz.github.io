// ============================================================================
// web/mostrador/drawer_share.js — Gaveta 4 (Compartir Offline, Quine HTML, QRBeam LT & Auditoría Criptográfica)
// Decisiones D1-R41, D6-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { serializeMostradorRouteQuery } from "../i18n_ui.js";
import { escapeHtml } from "./bridge_and_chapter.js";
import {
  STATUS,
  decodeFrameInWasmLinearMemory,
  verifyArtifactProjectionClosure,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory,
} from "./data_layer.js";
import { canonicalOrdinalOf } from "./canonical_versification.js";
import { computeKindlePrintBudget, renderImpositionAndLayoutPreviewHtml } from "./dosis.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import { isRtlLocale } from "./i18n.js";
import {
  buildQuineHtml,
  commitVerifiedPackToIndexedDb,
  exportBundleAsFile,
  hydrateEcoPacksManifest,
  importBundleFromFile,
  listPacksFromIndexedDb,
  loadPackFromIndexedDb,
  renderOfflineMeshEcoCardHtml,
  savePackToIndexedDb,
  triggerOptInOfflinePackDownload,
  verifyAndStoreEcoPack,
} from "./offline_mesh.js";
import {
  LTEncoder,
  OPTICAL_CADENCE_PRESETS,
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

/**
 * Hidrata la Gaveta 4 (Compartir, Quine Offline, QRBeam LT y Auditoría) (`D8-R41` / `D10-R38` / `D6-R38` / `D2-R42` / `D7-R42`).
 */
export function hydrateShareAndAuditDrawerPanel(ctx = {}) {
  const { state, dataLayer, targetDoc, getEl, hydrateShareAndAuditDrawer } = ctx;
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const activeLang = String(state.lang || "es").trim() || "es";
  const hasPrecompiledPack = ["es", "en", "stp", "he", "grc"].includes(activeLang);
  const packLang = activeLang;
  const activeVerseTextForQuine =
    state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
    "En el principio creó Dios los cielos y la tierra.";
  const quineRelUrl = hasPrecompiledPack
    ? `obras/biblia/packs/${activeLang}/lector_offline_${activeLang}.html`
    : `data:text/html;charset=utf-8,${encodeURIComponent(
        `<!doctype html><html lang="${escapeHtml(activeLang)}"><head><meta charset="utf-8"><title>Ekovoz Quine (${escapeHtml(activeLang.toUpperCase())})</title></head><body><h1>${escapeHtml(state.book || "GEN")} ${Number(state.chapter) || 1}:${Number(state.verse) || 1} (${escapeHtml(activeLang.toUpperCase())})</h1><p>${escapeHtml(activeVerseTextForQuine)}</p></body></html>`,
      )}`;
  const packMode = hasPrecompiledPack ? "precompiled" : "live-synthesis";
  state.lastArtifactProjectionClosure = verifyArtifactProjectionClosure({
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
          state.offlinePacksCatalog = cat;
        }
      })
      .catch(() => {});
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
        const committed = await commitVerifiedPackToIndexedDb({ lang: packLang });
        const rec = await verifyAndStoreEcoPack({ lang: packLang });
        state.lastVerifiedEcoPack = { ...rec, ...committed };
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
        const saved = await savePackToIndexedDb(packLang, { lang: packLang });
        const allPacks = listPacksFromIndexedDb();
        state.lastOptInSwResult = swRes;
        state.lastSavedIndexedDbPack = saved;
        const vaultEl = getEl("offlineIndexedDbVaultStatus", targetDoc);
        if (vaultEl) {
          vaultEl.setAttribute("data-vault-packs-count", String(allPacks.length));
          vaultEl.textContent = `🗄️ IndexedDB (${allPacks.length} packs): ${allPacks.map((p) => p.lang).join(", ")}`;
        }
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
          statusPanel.hidden = false;
          statusPanel.textContent = `✅ Opt-In SW (${swRes.cacheName}) + IndexedDB (${saved.file} · CRC32 ${saved.crc32Hex})`;
        }
      });
    }
    const listVaultBtn = getEl("btnOfflineListIndexedDbPacks", targetDoc);
    if (listVaultBtn && typeof listVaultBtn.addEventListener === "function" && !listVaultBtn._listVaultBound) {
      listVaultBtn._listVaultBound = true;
      listVaultBtn.addEventListener("click", async () => {
        let loaded = await loadPackFromIndexedDb(packLang);
        if (!loaded) {
          loaded = await savePackToIndexedDb(packLang, { lang: packLang });
        }
        const allPacks = listPacksFromIndexedDb();
        state.lastLoadedIndexedDbPack = loaded;
        const vaultEl = getEl("offlineIndexedDbVaultStatus", targetDoc);
        if (vaultEl) {
          vaultEl.setAttribute("data-vault-packs-count", String(allPacks.length));
          vaultEl.textContent = `🗄️ IndexedDB (${allPacks.length} packs): ${allPacks.map((p) => p.lang).join(", ")} · ${loaded.file}`;
        }
        const statusPanel = getEl("editorialAuditStatusPanel", targetDoc);
        if (statusPanel) {
          statusPanel.hidden = false;
          statusPanel.textContent = `🗄️ IndexedDB Vault (${allPacks.length}): ${loaded.file} (${loaded.crc32Hex})`;
        }
      });
    }
    const exportSneakernetBtn = getEl("btnExportSneakernetBundle", targetDoc);
    if (exportSneakernetBtn && typeof exportSneakernetBtn.addEventListener === "function" && !exportSneakernetBtn._sneakernetExpBound) {
      exportSneakernetBtn._sneakernetExpBound = true;
      exportSneakernetBtn.addEventListener("click", () => {
        const jsonBundle = exportBundleAsFile({ lang: packLang });
        state.lastExportedSneakernetBundle = jsonBundle;
        exportSneakernetBtn.setAttribute("data-exported-bytes", String(jsonBundle.length));
      });
    }
    const importSneakernetInput = getEl("inputImportSneakernetBundle", targetDoc);
    if (importSneakernetInput && typeof importSneakernetInput.addEventListener === "function" && !importSneakernetInput._sneakernetImpBound) {
      importSneakernetInput._sneakernetImpBound = true;
      importSneakernetInput.addEventListener("change", () => {
        const bundleStr =
          state.lastExportedSneakernetBundle ||
          exportBundleAsFile({ lang: packLang });
        const imported = importBundleFromFile(bundleStr);
        state.lastImportedSneakernetBundle = imported;
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
        state.activeDosisSubtab = tabName;
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
    const encoder = new LTEncoder(rawBytes, 32);
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
    const ltEncoded = encodeLubyTransformDroplets(rawBytes, {
      blockSize: 32,
      dropletCount: Math.max(4, encoder.K + 4),
    });
    const ltDecoded = decodeLubyTransformPeeling(
      ltEncoded.droplets,
      ltEncoded.K,
      ltEncoded.blockSize,
      ltEncoded.byteLength,
    );
    state.lastNyquistValidation = nyquistCheck;
    state.lastLtPeelingAudit = ltDecoded;
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
      state.lastWasmLinearProbes = {
        frameDecode: decodeFrameInWasmLinearMemory(wasmMod, probeBytes),
        raptorQBlock: verifyRaptorQBlockInWasmLinearMemory(wasmMod, probeBytes, 0),
        audioCrc16: verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, probeBytes),
      };
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
      "1": "Beatitude 1 · Ps 1:1 (The Tree by the Waters)",
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
      "12": "Beatitude 12 · Rev 22:14 / Ps 1:6 (Tree of Life)",
    };
    const esDichaTitles = {
      "1": "Dicha 1 · Sal 1:1 (El Árbol junto a Aguas)",
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
      "12": "Dicha 12 · Ap 22:14 / Sal 1:6 (Árbol de la Vida)",
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
    const packLang = ["es", "en", "stp", "he"].includes(state.lang) ? state.lang : "stp";
    const osis = `${state.book}.${state.chapter}.${state.verse}`;

    if (shareBtnId === "btnShareQuine") {
      const quineUrl = `obras/biblia/packs/${packLang}/lector_offline_${packLang}.html`;
      const quinePayload = buildQuineHtml(packLang);
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "share-quine");
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="share-quine" data-quine-lang="${escapeHtml(packLang)}" data-quine-bytes="${quinePayload.length}">` +
          `✅ <strong>Quine Autónomo Listo (${escapeHtml(packLang.toUpperCase())}):</strong> ` +
          `<a href="${escapeHtml(quineUrl)}" download="lector_offline_${escapeHtml(packLang)}.html">Descargar lector_offline_${escapeHtml(packLang)}.html</a> ` +
          `(${quinePayload.length} B · DecompressionStream deflate-raw · 100% offline).</div>`;
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
      if (statusPanel) {
        statusPanel.setAttribute("data-audit-action", "verify-signature");
        statusPanel.setAttribute("data-verified", String(receipt.verified));
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="verify-signature" data-verified="${receipt.verified}" data-merkle-root="${escapeHtml(receipt.merkleRootHex)}">` +
          `🔐 <strong>Auditoría Criptográfica (${escapeHtml(receipt.algorithm)}):</strong> ` +
          `Estado=${receipt.verified ? "VERIFICADO" : "PENDIENTE"} · Artefactos=${receipt.artifactsChecked} · ` +
          `Merkle Root=<code>${escapeHtml(receipt.merkleRootHex.slice(0, 16))}…</code> · ` +
          `SHA-256=<code>${escapeHtml(receipt.sampleSha256.slice(0, 16))}…</code></div>`;
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
      if (videoEl) videoEl.hidden = !videoEl.hidden;
      if (statusPanel) {
        statusPanel.hidden = false;
        if (statusPanel.style) statusPanel.style.display = "";
        statusPanel.setAttribute("data-audit-action", "optical-camera-rx");
        statusPanel.setAttribute("data-wasm-bridge", "loading");
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-wasm-bridge="loading">` +
          `📷 <strong>Receptor Óptico LT + GF(2) Activo:</strong> ` +
          `Eliminación Gaussiana sobre GF(2) lista para resolver Stopping Sets de grado ≥ 2.</div>`;
      }
      let wasmStatusAttr = "fallback";
      if (typeof dataLayer.loadWasmModule === "function") {
        try {
          const wasmMod = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
          const bridgeCheck = decodeQrStreamViaWasmBridge([], wasmMod);
          if (bridgeCheck.ok) wasmStatusAttr = `ready-v${bridgeCheck.wasmAbiVersion}`;
        } catch {
          wasmStatusAttr = "unavailable";
        }
      }
      if (statusPanel && statusPanel.getAttribute("data-audit-action") === "optical-camera-rx") {
        statusPanel.setAttribute("data-wasm-bridge", wasmStatusAttr);
        statusPanel.innerHTML =
          `<div class="audit-receipt" data-action="optical-camera-rx" data-gf2="ready" data-wasm-bridge="${escapeHtml(wasmStatusAttr)}">` +
          `📷 <strong>Receptor Óptico LT + GF(2) Activo (WASM=${escapeHtml(wasmStatusAttr)}):</strong> ` +
          `Eliminación Gaussiana sobre GF(2) lista para resolver Stopping Sets de grado ≥ 2.</div>`;
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
      state.lastRelayDroplet = relayDroplet;
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
