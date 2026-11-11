// ============================================================================
// web/mostrador/drawer_share.js — Gaveta 4 (Compartir Offline, Quine HTML, QRBeam LT & Auditoría Criptográfica)
// Decisiones D1-R41, D6-R41, D8-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  STATUS,
  decodeFrameInWasmLinearMemory,
  verifyAudioPcmCrc16InWasmLinearMemory,
  verifyRaptorQBlockInWasmLinearMemory,
} from "./data_layer.js";
import { ordinalOf } from "./dosis.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import {
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
  encodeDropletToMatrixGrid,
  renderDropletMatrixSvgOrCanvas,
  renderOpticalReceiverRxPanelHtml,
  runOpticalReceiverBurstSession,
} from "./optical_lt.js";

export const HAREL_DOSIS_SUBTABS = ["pdf", "mesh", "graphics"];

/**
 * Hidrata la Gaveta 4 (Compartir, Quine Offline, QRBeam LT y Auditoría) (`D8-R41` / `D10-R38` / `D6-R38`).
 */
export function hydrateShareAndAuditDrawerPanel(ctx = {}) {
  const { state, dataLayer, targetDoc, getEl, hydrateShareAndAuditDrawer } = ctx;
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const packLang = ["es", "en", "stp", "he", "grc"].includes(state.lang) ? state.lang : "stp";
  const quineRelUrl = `obras/biblia/packs/${packLang}/lector_offline_${packLang}.html`;

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
    const activeOrdinal = ordinalOf(state.book || "GEN", state.chapter || 1, state.verse || 1);
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
      `<div class="mostrador-offline-packs" data-lang="${escapeHtml(state.lang)}" data-quine-url="${escapeHtml(quineRelUrl)}">` +
      `<strong>${isEn ? `Sovereign Offline Pack (${escapeHtml(state.lang.toUpperCase())})` : `Paquete Offline Soberano (${escapeHtml(state.lang.toUpperCase())})`}</strong>` +
      `<p style="margin:4px 0 6px;font-size:0.84rem;">${isEn ? `Zero telemetry · Autonomous HTML Quine (<code>DecompressionStream("deflate-raw")</code>) + SHA-256 / Merkle verification ready for USB, Bluetooth, and MicroSD.` : `Cero telemetría · Quine HTML autónomo (<code>DecompressionStream("deflate-raw")</code>) + Verificación SHA-256 / Merkle lista para USB, Bluetooth y MicroSD.`}</p>` +
      `<a href="${escapeHtml(quineRelUrl)}" download="lector_offline_${escapeHtml(packLang)}.html" data-quine-download="true" hidden style="display:none;"></a>` +
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
    qrPanel.innerHTML =
      `<div class="mostrador-qrbeam-stream" data-fps="${activeCadenceKey}" data-frame-interval-ms="${cadencePreset.intervalMs}" data-total-blocks="${encoder.K}" data-seq="${grid.seq}" data-degree="${grid.degree}" data-parity="${grid.parityBit}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
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

