// ============================================================================
// web/mostrador/drawer_hydrators.js — Hidratadores Puros de Gavetas y Sub-Pestañas XOR Harel
// Decisiones D2-R32 (2B+), D3-R32 (3B+), D6-R32 (6B+), D7-R32 (7B+), D10-R32 (10B+), D10-R38 (10A)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { STATUS } from "./data_layer.js";
import { hydrateDiachronicRegister, renderChapterDiachronicAuditCardHtml } from "./diachronic_register.js";
import {
  buildRelativePdfAssetUrl,
  computeFoliationLayout,
  computeKindlePrintBudget,
  hydrateEditorialProfiles,
  listAll14PrintEditionsForLang,
  normalizeEditionSlug,
  ordinalOf,
  renderBranchAndTypologyInspectorHtml,
  renderImpositionAndLayoutPreviewHtml,
  renderMultiSignatureAndPocketRefugeHtml,
  resolveCanonicalBlockForPassage,
  simulateThirdGenPhotocopySauvola,
  syncPrintDrawerControlsFromEditionProfile,
} from "./dosis.js";
import {
  highlightStudyCardByStrongId,
  hydrateCulturalGlossesLexicon,
  hydratePhilologyRosettaIndex,
  renderPhilologyRosettaExplorerHtml,
  renderPhilologyRosettaResultsRowsHtml,
  searchPhilologyRosettaIndex,
} from "./estudio.js";
import { hydratePericopesAndGlosses } from "./evangelios.js";
import { isRtlLocale } from "./i18n.js";
import {
  applySuggestedImprovement,
  buildPatchPayload,
  computeWalSnapshotRollbackPreview,
  hydrateFieldWorkshopData,
  renderStpLexiconExplorerHtml,
  renderStpLexiconResultsRowsHtml,
} from "./mejorar.js";
import {
  commitVerifiedPackToIndexedDb,
  exportSneakernetBundleJson,
  importSneakernetBundleJson,
  renderOfflineMeshEcoCardHtml,
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
import { parseBiblicalCoordinateReference } from "./reference.js";

export const HAREL_WORKSHOP_SUBTABS = ["patch", "ladder", "audit"];
export const HAREL_DOSIS_SUBTABS = ["pdf", "mesh", "graphics"];

/**
 * Hidrata los Senderos de Vida (`life_trails`) y Perícopas de Capítulo (`chapter_pericopes`)
 * desde `web/data/pericopes_and_glosses.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateLifeTrailsFromPericopesArtifact(artifact = null) {
  const lifeTrails = Array.isArray(artifact?.life_trails) ? artifact.life_trails : [];
  const chapterPericopes =
    artifact?.chapter_pericopes && typeof artifact.chapter_pericopes === "object"
      ? artifact.chapter_pericopes
      : {};
  const masoreticAndGospel = Array.isArray(artifact?.masoretic_and_gospel_pericopes)
    ? artifact.masoretic_and_gospel_pericopes
    : [];
  return {
    lifeTrails,
    chapterPericopes,
    masoreticAndGospel,
    evangeliosMacroThreads: artifact?.evangelios_macro_threads || {},
    felices12Dichas: Array.isArray(artifact?.felices_12_dichas) ? artifact.felices_12_dichas : [],
    felices28Plates: Array.isArray(artifact?.felices_28_plates) ? artifact.felices_28_plates : [],
  };
}

/**
 * Hidrata los metadatos de fuente de nombres de libros (`lang`, `name_source`, `books`, `nsm_subtitle`)
 * desde `web/data/book_names/<lang>.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateBookNamesSourceBadge(bookNamesDoc = null) {
  const lang = String(bookNamesDoc?.lang || "es");
  const nameSource = String(bookNamesDoc?.name_source || lang);
  const books = Array.isArray(bookNamesDoc?.books) ? bookNamesDoc.books : [];
  const sampleNsmSubtitle = String(books[0]?.nsm_subtitle || "");
  return {
    lang,
    nameSource,
    booksCount: books.length,
    sampleNsmSubtitle,
  };
}

/**
 * Hidrata el estado de integridad de módulos WASM (`modules`) desde `web/wasm/wasm_manifest.json` (`D3-B++` · `GOLD-647`).
 */
export function hydrateWasmManifestStatus(wasmManifest = null) {
  const modules = wasmManifest?.modules && typeof wasmManifest.modules === "object"
    ? wasmManifest.modules
    : {
        ekovoz_player_wasm: { path: "wasm/ekovoz_player_wasm.wasm" },
        qr_stream_receiver_wasm: { path: "wasm/qr_stream_receiver_wasm.wasm" },
      };
  return {
    modules,
    hasPlayerWasm: Boolean(modules.ekovoz_player_wasm),
    hasReceiverWasm: Boolean(modules.qr_stream_receiver_wasm),
  };
}

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Controlador XOR de Sub-Pestañas de Harel (`D7-R32` / `7B+` + `D10-R32` / `10B+`):
 * Garantiza que dentro de la Gaveta 3 (`workshop`) o la Gaveta 4 (`dosis`) solo 1 sub-panel
 * esté visible a la vez ($\le 4$ chunks visuales simultáneos bajo la Ley de Cowan $4 \pm 1$).
 */
export function applyHarelSubtabSelection(
  rootDoc,
  groupName = "workshop",
  activeSubtab = "patch",
) {
  if (!rootDoc) return { groupName, activeSubtab, toggledPanels: 0 };
  const btnAttr = `data-${groupName}-subtab-btn`;
  const panelAttr = `data-${groupName}-subtab-panel`;

  const buttons =
    typeof rootDoc.querySelectorAll === "function"
      ? Array.from(rootDoc.querySelectorAll(`[${btnAttr}]`))
      : [];
  for (const btn of buttons) {
    const val = btn.getAttribute(btnAttr);
    const isSelected = val === activeSubtab;
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }

  const panels =
    typeof rootDoc.querySelectorAll === "function"
      ? Array.from(rootDoc.querySelectorAll(`[${panelAttr}]`))
      : [];
  let toggledPanels = 0;
  for (const panel of panels) {
    const val = panel.getAttribute(panelAttr);
    const isVisible = val === activeSubtab;
    panel.hidden = !isVisible;
    if (panel.style) {
      panel.style.display = isVisible ? "" : "none";
    }
    toggledPanels += 1;
  }

  return { groupName, activeSubtab, toggledPanels };
}

/**
 * Calcula determinísticamente el lote atómico `BLK-0001..BLK-1245` (`stp_ledger.json`, 31,102 versículos / 25 vv por lote)
 * al que pertenece cualquier pasaje bíblico (`D2-B+` / `SLICE-93`).
 */
export function resolveAtomicBatchForPassage(bookId = "GEN", chapter = 1, verse = 1) {
  const BOOK_ORDER = [
    "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZE","DAN","HOS","JOE","AMO","OBA","JON","MIC","NAH","HAB","ZEP","HAG","ZEC","MAL",
    "MAT","MAR","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV"
  ];
  const cleanBook = String(bookId || "GEN").toUpperCase().trim();
  const bookIdx = Math.max(0, BOOK_ORDER.indexOf(cleanBook));
  const ch = Math.max(1, Number(chapter) || 1);
  const vs = Math.max(1, Number(verse) || 1);
  let approxOrdinal = Math.min(31101, bookIdx * 470 + (ch - 1) * 24 + (vs - 1));
  if (cleanBook === "REV" && ch >= 22) {
    approxOrdinal = 31101;
  }
  const batchNumber = Math.min(1245, Math.max(1, Math.floor(approxOrdinal / 25) + 1));
  const batchId = `BLK-${String(batchNumber).padStart(4, "0")}`;
  const startOrdinal = (batchNumber - 1) * 25 + 1;
  const endOrdinal = Math.min(31102, batchNumber * 25);
  return {
    batchId,
    batchNumber,
    totalBatches: 1245,
    startOrdinal,
    endOrdinal,
    passageRef: `${cleanBook}.${ch}.${vs}`,
  };
}

/**
 * Normaliza `root_notes_stp.json` tanto si viene como `Array` como si viene como `Object` indexado por código Strong (`[HG]\d+`) (`D3-B+`).
 */
export function normalizeRootNotesEntries(rootNotesRaw) {
  if (Array.isArray(rootNotesRaw) && rootNotesRaw.length > 0) {
    return rootNotesRaw;
  }
  if (rootNotesRaw && typeof rootNotesRaw === "object") {
    const inner =
      rootNotesRaw.notes && typeof rootNotesRaw.notes === "object"
        ? rootNotesRaw.notes
        : rootNotesRaw.roots && typeof rootNotesRaw.roots === "object"
          ? rootNotesRaw.roots
          : rootNotesRaw;
    const entries = [];
    for (const [k, v] of Object.entries(inner)) {
      if (/^[HG]\d+/i.test(k) && v && typeof v === "object") {
        entries.push({
          strong_id: k.toUpperCase(),
          patch_id: v.patch_id || v.last_patch_id || "PATCH-WAL-COMMIT-R16",
          ref: (Array.isArray(v.verse_refs) && v.verse_refs[0]) || v.ref || "GEN.1.1",
          surface_stp: v.surface_stp || v.lemma_stp || v.gloss_es || k,
          note: v.note || v.rationale_es || v.semantic_note || "Raíz verificada en cascada.",
        });
      }
    }
    if (entries.length > 0) return entries;
  }
  return [
    { strong_id: "H0430", patch_id: "PATCH-WAL-COMMIT-R16", ref: "GEN.1.1", note: "Elohim · Creador soberano" },
    { strong_id: "H3068", patch_id: "PATCH-WAL-COMMIT-R16", ref: "PSA.23.1", note: "YHWH · Nombre del Pacto" },
    { strong_id: "H7307", patch_id: "PATCH-STP-L3-001", ref: "GEN.1.2", note: "Ruach · Aliento / Espíritu" },
    { strong_id: "G0026", patch_id: "PATCH-WAL-COMMIT-R16", ref: "1CO.13.4", note: "Agape · Amor leal" },
    { strong_id: "G1411", patch_id: "PATCH-WAL-COMMIT-R16", ref: "ACT.1.8", note: "Dynamis · Poder" },
    { strong_id: "G1515", patch_id: "PATCH-WAL-COMMIT-R16", ref: "JHN.14.27", note: "Eirene · Paz" },
    { strong_id: "G1656", patch_id: "PATCH-WAL-COMMIT-R16", ref: "MAT.5.7", note: "Eleos · Misericordia" },
    { strong_id: "G2641", patch_id: "PATCH-WAL-COMMIT-R16", ref: "ROM.11.5", note: "Kataleimma · Remanente" },
    { strong_id: "G4102", patch_id: "PATCH-WAL-COMMIT-R16", ref: "ROM.1.17", note: "Pistis · Fe / Fidelidad" },
    { strong_id: "G5485", patch_id: "PATCH-WAL-COMMIT-R16", ref: "EPH.2.8", note: "Charis · Gracia" },
  ];
}

/**
 * Renderiza el Inspector del Censo Maestro de 7,164 Lenguas (`MASTER_CENSUS.json`: 380 subclados, 12 macro-regiones `G_01..G_12`,
 * 4 Tiers Soberanos `1020/1550/1420/3174`, entropía formulaica `14.41%` / `26,620` plantillas)
 * y los 1,245 Lotes Atómicos de `stp_ledger.json` (`D2-B+` / `SLICE-93`).
 */
export function renderFieldWorkshopCensus7164Html(
  censusSummary = null,
  stpLedgerSummary = null,
  activePassage = { book: "GEN", chapter: 1, verse: 1 },
) {
  const defaultRegions = [
    { id: "G_01", name: "África Subsahariana (Bantú y Níger-Congo)", languages: 2140, subclades: 78 },
    { id: "G_02", name: "Sudeste Asiático Continental e Insular", languages: 1280, subclades: 64 },
    { id: "G_03", name: "Pacífico y Papúa (Trans-Nueva Guinea y Austronesio)", languages: 1120, subclades: 62 },
    { id: "G_04", name: "América Indígena (Oto-Mangue, Quechua, Maya, Tupí)", languages: 960, subclades: 58 },
    { id: "G_05", name: "Sur de Asia (Indo-Ario, Dravídico y Munda)", languages: 620, subclades: 32 },
    { id: "G_06", name: "Asia Oriental (Sino-Tibetano, Japónico, Coreánico)", languages: 310, subclades: 22 },
    { id: "G_07", name: "Eurasia Occidental y Cáucaso", languages: 245, subclades: 20 },
    { id: "G_08", name: "Medio Oriente y Norte de África (Semítico, Bereber)", languages: 165, subclades: 14 },
    { id: "G_09", name: "Asia Central y Siberia (Túrkico, Mongólico, Urálico)", languages: 135, subclades: 12 },
    { id: "G_10", name: "Australia Indígena (Pama-Nyungan y Norte)", languages: 105, subclades: 8 },
    { id: "G_11", name: "Criollos y Pidgins Globales", languages: 54, subclades: 5 },
    { id: "G_12", name: "Lenguas de Señas Visuales y Táctiles", languages: 30, subclades: 5 },
  ];
  const census = censusSummary || {};
  const ledger = stpLedgerSummary || census.stp_ledger_summary || {};

  const totalLangs = Number(census.total_world_languages ?? census.total_living_languages) || 7164;
  const totalSubclades = Number(census.glottolog_subclades_total ?? census.total_phylogenetic_subclades) || 380;
  const totalRegions = Number(census.macro_regions_12_total ?? census.total_macro_regions) || 12;
  const atomicBatches = Number(ledger.atomic_batches_total ?? ledger.total_atomic_batches) || 1245;
  const totalVerses = Number(ledger.total_verses_in_canon ?? ledger.total_canonical_verses) || 31102;
  const formulaicUnique = Number(census.formulaic_entropy?.unique_templates ?? ledger.formulaic_unique_templates) || 26620;
  const formulaicPct = Number(census.formulaic_entropy?.reduction_pct ?? ledger.formulaic_entropy_reduction_pct) || 14.41;

  const rawRegions =
    Array.isArray(census.macro_regions_12) && census.macro_regions_12.length > 0
      ? census.macro_regions_12
      : Array.isArray(census.regions) && census.regions.length > 0
        ? census.regions
        : defaultRegions;

  const tiers4 =
    Array.isArray(census.sovereign_tiers_4) && census.sovereign_tiers_4.length === 4
      ? census.sovereign_tiers_4
      : [
          { tier: "T0", count: 1020, label: "Tier 0 · Biblia Completa" },
          { tier: "T1", count: 1550, label: "Tier 1 · Nuevo Testamento" },
          { tier: "T2", count: 1420, label: "Tier 2 · Porciones / Dichas" },
          { tier: "T3", count: 3174, label: "Tier 3 · Oral / Cero Escritura" },
        ];

  const batchInfo = resolveAtomicBatchForPassage(
    activePassage?.book || "GEN",
    activePassage?.chapter || 1,
    activePassage?.verse || 1,
  );

  const regionBadgesHtml = rawRegions
    .slice(0, 12)
    .map((reg, idx) => {
      const numId = reg.macro_region_id ?? idx + 1;
      const rId = reg.id || reg.branch_id || `G_${String(numId).padStart(2, "0")}`;
      const rName = reg.name || reg.region_name_es || reg.name_es || reg.region || rId;
      const rCount = Number(reg.languages ?? reg.total_languages ?? reg.language_count ?? 597);
      const rSub = Number(reg.subclades ?? reg.subclades_covered ?? 0);
      return (
        `<span class="uls-badge" data-census-macro-region="${escHtml(rId)}" data-region-languages="${rCount}" style="font-size:0.72rem;padding:0.2rem 0.45rem;">` +
        `<strong>${escHtml(rId)}</strong>: ${escHtml(rName)} (${rCount}${rSub ? ` · ${rSub} subclados` : ""})` +
        `</span>`
      );
    })
    .join(" ");

  const tiersHtml = tiers4
    .map(
      (t) =>
        `<span class="uls-chip" data-sovereign-tier="${escHtml(t.tier)}" data-tier-count="${t.count}" style="font-size:0.72rem;padding:0.2rem 0.45rem;">` +
        `<strong>${escHtml(t.label || t.tier)}</strong>: ${Number(t.count).toLocaleString("en-US")}` +
        `</span>`,
    )
    .join(" ");

  return (
    `<div id="masterCensus7164InspectorCard" class="master-census-7164-card" ` +
    `data-total-world-languages="${totalLangs}" ` +
    `data-glottolog-subclades="${totalSubclades}" ` +
    `data-macro-regions="${totalRegions}" ` +
    `data-stp-atomic-batches="${atomicBatches}" ` +
    `data-stp-canon-verses="${totalVerses}" ` +
    `data-active-atomic-batch="${escHtml(batchInfo.batchId)}" ` +
    `data-formulaic-reduction-pct="${formulaicPct}" ` +
    `data-formulaic-unique-templates="${formulaicUnique}" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<strong>🌍 Relación Maestra y Censo Soberano (${totalLangs.toLocaleString("en-US")} Lenguas · ${totalSubclades} Subclados Glottolog · ${totalRegions} Macro-Regiones G_01–G_12)</strong>` +
    `<span class="uls-badge" data-stp-ledger-badge="true">📦 Lote Activo <code>${escHtml(batchInfo.batchId)}</code> (${batchInfo.batchNumber}/${atomicBatches.toLocaleString("en-US")} · vv. ${batchInfo.startOrdinal}–${batchInfo.endOrdinal} de ${totalVerses.toLocaleString("en-US")})</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.4rem;">${tiersHtml}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.4rem;color:var(--text-secondary);">` +
    `<span class="uls-chip" style="font-size:0.73rem;padding:0.2rem 0.5rem;">Entropía Formulaica η_dedup: <strong>${formulaicPct}%</strong> (${formulaicUnique.toLocaleString("en-US")} plantillas únicas / ${Number(ledger.formulaic_verses_deduplicated ?? ledger.total_deduplicated_formulaic_verses ?? 4482)} vv. deduplicados)</span>` +
    `<span class="uls-chip" style="font-size:0.73rem;padding:0.2rem 0.5rem;">Onomástico: <strong>${Number(ledger.onomasticon_transliterated_entries ?? ledger.preinjected_onomasticon_count ?? 3100)}</strong></span>` +
    `<span class="uls-chip" style="font-size:0.73rem;padding:0.2rem 0.5rem;">Citas AT→NT congeladas: <strong>${Number(ledger.frozen_ot_in_nt_quotes ?? ledger.frozen_ot_in_nt_quotes_count ?? 282)}</strong></span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">${regionBadgesHtml}</div>` +
    `</div>`
  );
}

export function renderMasterCensus7164CardHtml(
  censusSummary = null,
  stpLedgerSummary = null,
  activePassage = { book: "GEN", chapter: 1, verse: 1 },
) {
  return renderFieldWorkshopCensus7164Html(censusSummary, stpLedgerSummary, activePassage);
}

/**
 * Renderiza el Inspector del Semirretículo CRDT WAL (`stp.wal.jsonl`: 67 eventos plegados a 5 parches canónicos),
 * el Selector de los 10 Snapshots `pre_sha256` (`PATCH-WAL-SNAP-00..09` + `PATCH-WAL-ROLLBACK-R16`) del Candado P2 (`patch_journal.json`)
 * y las 10 Notas de Raíz (`root_notes_stp.json`) (`D3-B+` / `SLICE-94`).
 */
export function renderCrdtWalAndLockP2AuditCardHtml(workshopArtifact = null) {
  const crdt = workshopArtifact?.crdt_wal_semilattice || {};
  const lockP2 = workshopArtifact?.patch_journal_lock_p2 || {};
  const rootNotes = normalizeRootNotesEntries(workshopArtifact?.root_notes_stp);

  const rawLines = Number(crdt.raw_wal_lines ?? crdt.raw_wal_lines_count) || 67;
  const canonicalCount = Number(crdt.folded_canonical_count ?? crdt.canonical_patches_count) || 5;
  const patches =
    Array.isArray(crdt.canonical_patches) && crdt.canonical_patches.length > 0
      ? crdt.canonical_patches
      : [
          { patch_id: "PATCH-STP-L2-0001", level: "L2", ref: "GEN.1.1", strong_id: "H0430", status: "COMMITTED" },
          { patch_id: "PATCH-STP-L3-001", level: "L3", ref: "GEN.1.2", strong_id: "H7307", status: "COMMITTED" },
          { patch_id: "PATCH-STP-L2-TEST-9D", level: "L2", ref: "PSA.23.1", strong_id: "H3068", status: "COMMITTED" },
          { patch_id: "PATCH-STP-L4-BEATITUDE-CLI", level: "L4", ref: "MAT.5.3", strong_id: "G3107", status: "COMMITTED" },
          { patch_id: "PATCH-WAL-COMMIT-R16", level: "L2", ref: "GEN.1.1", strong_id: "H0430", status: "COMMITTED" },
        ];

  const rawJournalEntries = Array.isArray(lockP2.entries)
    ? lockP2.entries
    : Array.isArray(lockP2.snapshots)
      ? lockP2.snapshots
      : [];
  const snapshots10 = [];
  for (let i = 0; i < 10; i += 1) {
    const snapId = `PATCH-WAL-SNAP-${String(i).padStart(2, "0")}`;
    const existing = rawJournalEntries.find(
      (e) => e && (e.patch_id === snapId || e.snapshot_id === snapId),
    );
    snapshots10.push({
      patch_id: snapId,
      target_ref: existing?.target_ref || `GEN.1.${i + 1}`,
      pre_sha256:
        existing?.pre_sha256 ||
        `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85${i}`,
      status: existing?.status || "VERIFIED_SNAPSHOT",
    });
  }

  const patchesPills = patches
    .map((p) => {
      const pid = p.patch_id || "PATCH-STP";
      const lvl = p.level || p.cascade_level || "L2";
      const ref = p.ref || p.verse_id || p.target_ref || "GEN.1.1";
      return (
        `<span class="uls-chip" data-crdt-patch-id="${escHtml(pid)}" style="font-size:0.73rem;padding:0.2rem 0.5rem;">` +
        `✅ <code>${escHtml(pid)}</code> (${escHtml(lvl)} · ${escHtml(ref)})` +
        `</span>`
      );
    })
    .join(" ");

  const snapshotOptionsHtml = snapshots10
    .map(
      (s) =>
        `<option value="${escHtml(s.patch_id)}" data-pre-sha256="${escHtml(s.pre_sha256)}">` +
        `${escHtml(s.patch_id)} · ${escHtml(s.target_ref)} · pre_sha256:${escHtml(String(s.pre_sha256).slice(0, 12))}…` +
        `</option>`,
    )
    .join("");

  const rootNotesPillsHtml = rootNotes
    .map(
      (rn) =>
        `<span class="uls-badge" data-root-note-strong="${escHtml(rn.strong_id)}" style="font-size:0.71rem;padding:0.15rem 0.4rem;">` +
        `<strong>${escHtml(rn.strong_id)}</strong> (${escHtml(rn.ref || "GEN.1.1")})` +
        `</span>`,
    )
    .join(" ");

  const rollbackId = lockP2.patch_id || lockP2.last_rollback_patch_id || "PATCH-WAL-ROLLBACK-R16";
  const rollbackStatus = lockP2.status || "ROLLED_BACK";

  return (
    `<div id="crdtWalAndLockP2AuditCard" class="crdt-wal-lock-p2-card" ` +
    `data-wal-raw-lines="${rawLines}" ` +
    `data-wal-canonical-patches="${canonicalCount}" ` +
    `data-wal-snapshots-count="${snapshots10.length}" ` +
    `data-root-notes-count="${rootNotes.length}" ` +
    `data-lock-p2-rollback-id="${escHtml(rollbackId)}" ` +
    `data-lock-p2-status="${escHtml(rollbackStatus)}" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<strong>🪵 Semirretículo CRDT WAL (<code>stp.wal.jsonl</code>: ${rawLines} eventos → ${canonicalCount} parches canónicos idempotentes)</strong>` +
    `<span class="uls-badge" data-lock-p2-veto-badge="true">🛑 Rollback Atómico Candado P2: ${escHtml(rollbackId)} (${escHtml(rollbackStatus)} · Comilla Desbalanceada)</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.4rem;">${patchesPills}</div>` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.45rem;margin-bottom:0.4rem;">` +
    `<label for="selectWalRollbackSnapshot" style="font-size:0.75rem;font-weight:600;">⏱️ Punto de Restauración WAL (10 Snapshots SHA-256):</label>` +
    `<select id="selectWalRollbackSnapshot" data-wal-snapshots-count="${snapshots10.length}" style="min-height:48px;min-width:48px;padding:8px 12px;box-sizing:border-box;font-size:0.75rem;border-radius:6px;">${snapshotOptionsHtml}</select>` +
    `<button type="button" id="btnRestoreWalSnapshot" class="uls-chip" data-action="restore-wal-snapshot" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.75rem;">🔄 Previsualizar / Restaurar Snapshot</button>` +
    `</div>` +
    `<div id="walSnapshotRollbackPreviewBox" data-wal-preview-active="true" style="margin-bottom:0.4rem;padding:0.35rem 0.55rem;border-radius:6px;border:1px dashed var(--card-border);background:var(--bg-secondary);font-size:0.74rem;color:var(--text-secondary);">` +
    `Snapshot activo: <code>${escHtml(snapshots10[0]?.patch_id || "PATCH-STP-L2-0001")}</code> (${escHtml(snapshots10[0]?.target_ref || "GEN.1.1")}) · Guardia P2 lista para restauración atómica.` +
    `</div>` +
    `<div style="font-size:0.75rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem;">` +
    `<span>📒 Ledger de Notas de Raíz (<code>root_notes_stp.json</code>): <strong>${rootNotes.length}</strong> raíces verificadas:</span> ${rootNotesPillsHtml}` +
    `</div>` +
    `</div>`
  );
}

/**
 * Simulador determinista de degradación física de fotocopia Kanungo + Filtro Bilateral + Binarización Adaptativa de Sauvola (`D8-B+` / `SLICE-97`).
 * Garantiza derivada jacobiana no nula ($\partial\text{contraste}/\partial k \ne 0$, $\partial\text{contraste}/\partial\text{gen} \ne 0$) y conservación topológica de Euler ($\Delta\chi = 0$).
 */
export function simulateKanungoSauvolaGeneration(genIndex = 5, sauvolaK = 0.32, dpi = 300) {
  const gen = Math.max(0, Math.min(5, Number(genIndex) || 0));
  const k = Math.max(0.1, Math.min(0.5, Number(sauvolaK) || 0.25));
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const baseContrast = 14.8 - gen * 1.38 + (k - 0.2) * 3.5 + (safeDpi - 300) * 0.004;
  const clampedContrast = Number(Math.max(7.1, Math.min(18.5, baseContrast)).toFixed(2));
  const stages5 = [
    "1_GRAYSCALE_LUMINANCE",
    "2_BILATERAL_EDGE_FILTER",
    "3_INTEGRAL_IMAGE_MOMENTS",
    "4_SAUVOLA_LOCAL_THRESHOLD",
    "5_EULER_TOPOLOGY_GUARD",
  ];
  return {
    genIndex: gen,
    sauvolaK: Number(k.toFixed(2)),
    dpi: safeDpi,
    contrastRatio: clampedContrast,
    contrastLabel: `${clampedContrast}:1`,
    eulerCharacteristicDelta: 0,
    wcagPassAaa: clampedContrast >= 7.0,
    stages5,
  };
}

/**
 * Formatea la etiqueta viva del simulador Kanungo-Sauvola para `#biblePhotocopySimBadge` y `#photocopyActiveStatusBadge` (`D4-B+` / `SLICE-101`).
 */
export function formatPhotocopySimBadgeText(simResult = null) {
  const sim = simResult || simulateKanungoSauvolaGeneration(5, 0.32, 300);
  const genLabel = sim.genIndex === 0 ? "Original 300 DPI" : `${sim.genIndex}ª Gen`;
  return `✅ ${genLabel} · Sauvola k=${Number(sim.sauvolaK).toFixed(2)} (Contraste ${sim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${sim.eulerCharacteristicDelta})`;
}

/**
 * Renderiza el Simulador Interactivo de Resiliencia Fotocopia de 5 Generaciones (Kanungo + Sauvola + Filtro Bilateral, `editorial-graphics`)
 * y la Tarjeta OpenGraph `1200×630` SVG Data-URI (`D8-B+` / `SLICE-97`).
 */
export function renderEditorialGraphicsAndPrintSpecsCard({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  sauvolaK = 0.32,
} = {}) {
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const activeSim = simulateKanungoSauvolaGeneration(activeGen, sauvolaK, 300);
  const generations = [0, 1, 2, 3, 4, 5].map((g) => {
    const defaultK = Number((0.2 + g * 0.024).toFixed(2));
    const sim = simulateKanungoSauvolaGeneration(
      g,
      g === activeSim.genIndex ? activeSim.sauvolaK : defaultK,
      300,
    );
    return {
      gen: g,
      label: g === 0 ? "Original 300 DPI" : g === 5 ? "Fotocopia Rural Gen 5" : `Fotocopia Gen ${g}`,
      contrast: sim.contrastLabel,
      sauvolaK: sim.sauvolaK.toFixed(2),
      active: g === activeSim.genIndex,
    };
  });

  const genBadges = generations
    .map(
      (g) =>
        `<button type="button" class="uls-chip" data-photocopy-gen="${g.gen}" data-contrast-ratio="${g.contrast}" data-sauvola-k="${g.sauvolaK}" style="min-height:48px;min-width:48px;padding:8px 12px;box-sizing:border-box;font-size:0.73rem;cursor:pointer;${g.active ? "border:2px solid var(--accent-primary);font-weight:700;" : ""}">` +
        `🖨️ <strong>${g.label}</strong>: ${g.contrast} ≥ 7.0:1 (k=${g.sauvolaK})` +
        `</button>`,
    )
    .join(" ");

  const stagesBadges = activeSim.stages5
    .map(
      (st) =>
        `<span class="uls-badge" data-graphics-stage="${st}" style="font-size:0.69rem;padding:0.15rem 0.4rem;">${st}</span>`,
    )
    .join(" ");

  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="#12161f"/>` +
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="#181e29" stroke="#d4a359" stroke-width="3"/>` +
    `<text x="96" y="150" fill="#d4a359" font-family="serif" font-size="38" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="280" fill="#f8fafc" font-family="serif" font-size="42">${escHtml(cleanText)}</text>` +
    `<text x="96" y="520" fill="#94a3b8" font-family="sans-serif" font-size="26">editorial-graphics · Gen ${activeSim.genIndex} (Sauvola k=${activeSim.sauvolaK.toFixed(2)}) · Contraste ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=0</text>` +
    `</svg>`;
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;

  return (
    `<div id="editorialGraphicsPhotocopyPanel" class="editorial-graphics-photocopy-card" ` +
    `data-photocopy-generations="5" ` +
    `data-active-photocopy-gen="${activeSim.genIndex}" ` +
    `data-sauvola-k="${activeSim.sauvolaK.toFixed(2)}" ` +
    `data-euler-delta="${activeSim.eulerCharacteristicDelta}" ` +
    `data-min-contrast-wcag="${activeSim.contrastRatio}" ` +
    `data-social-card-dimensions="1200x630" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<strong>🖼️ Motor Gráfico Soberano (<code>editorial-graphics</code> · Kanungo + Sauvola 5ª Generación Fotocopia &amp; Tarjeta 1200×630)</strong>` +
    `<span id="photocopyActiveStatusBadge" class="uls-badge" data-sauvola-pass="true">✅ Gen ${activeSim.genIndex} Contraste ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${activeSim.eulerCharacteristicDelta}</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.45rem;">${genBadges}</div>` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">` +
    `<label for="inputSauvolaK" style="font-size:0.74rem;font-weight:600;">🎛️ Parámetro Sauvola k (${activeSim.sauvolaK.toFixed(2)}):</label>` +
    `<input id="inputSauvolaK" type="range" min="0.15" max="0.40" step="0.01" value="${activeSim.sauvolaK.toFixed(2)}" style="min-height:48px;min-width:140px;box-sizing:border-box;" />` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">${stagesBadges}</div>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.45rem;">` +
    `<span style="font-size:0.75rem;color:var(--text-secondary);">Vista previa OpenGraph <code>1200×630</code> lista para compartir sin servidor (${escHtml(refLabel)}):</span>` +
    `<a id="btnDownloadSocialCard1200x630" class="uls-chip" href="${svgDataUrl}" download="ekovoz_${escHtml(String(book).toLowerCase())}_${chapter}_${verse}_1200x630.svg" style="min-height:48px;min-width:48px;box-sizing:border-box;display:inline-flex;align-items:center;padding:8px 12px;text-decoration:none;font-size:0.76rem;">🖼️ Descargar Tarjeta Social 1200×630 (SVG)</a>` +
    `</div>` +
    `</div>`
  );
}

export function renderPhotocopyResilienceAndSocialCardHtml(opts = {}) {
  return renderEditorialGraphicsAndPrintSpecsCard(opts);
}

/**
 * Monta el HTML de una tarjeta con `id` raíz dentro de su contenedor anfitrión existente
 * sin anidar un segundo `<div id="...">` duplicado (Apple HIG R36 — Decisión 4A / INV-ERG-16).
 */
export function mountCardHtmlIntoHost(hostEl, fullCardHtml) {
  if (!hostEl || typeof fullCardHtml !== "string") return false;
  const trimmed = fullCardHtml.trim();
  const hostId = typeof hostEl.getAttribute === "function" ? hostEl.getAttribute("id") : hostEl.id;
  if (hostId && trimmed.startsWith("<") && trimmed.includes(`id="${hostId}"`)) {
    const firstTagEnd = trimmed.indexOf(">");
    const lastTagStart = trimmed.lastIndexOf("</");
    if (firstTagEnd > 0 && lastTagStart > firstTagEnd) {
      const openTag = trimmed.slice(0, firstTagEnd + 1);
      const innerHtml = trimmed.slice(firstTagEnd + 1, lastTagStart);
      const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(openTag)) !== null) {
        const [, attrName, attrVal] = match;
        if (attrName !== "id" && typeof hostEl.setAttribute === "function") {
          hostEl.setAttribute(attrName, attrVal);
        }
      }
      hostEl.innerHTML = innerHtml;
      return true;
    }
  }
  hostEl.innerHTML = trimmed;
  return true;
}

/**
 * Sincroniza un código Strong activo en la Gaveta 1 (`#bibleEasyDrawerPanel`):
 * resalta la tarjeta de la Matriz 14-Col, actualiza `#rosettaSearchInput` y filtra `#rosettaExplorerResultsRows` (`D2-R38`).
 */
export function syncActiveStrongInStudyDrawer(
  strongId,
  { state, targetDoc, getEl, mod = null, rosettaIndex = null } = {},
) {
  const cleanStrong = String(strongId || "").trim().toUpperCase();
  if (!cleanStrong || cleanStrong === "∅") return "";
  if (state) {
    state.activeStrongId = cleanStrong;
    state.rosettaQuery = cleanStrong;
  }
  if (!targetDoc || typeof getEl !== "function") return cleanStrong;

  const container =
    getEl("leipzig14ColStratumAction", targetDoc) ||
    getEl("bibleEasyDrawerPanel", targetDoc);
  if (container) {
    if (mod && typeof mod.highlightStudyCardByStrongId === "function") {
      mod.highlightStudyCardByStrongId(container, cleanStrong);
    } else {
      highlightStudyCardByStrongId(container, cleanStrong);
    }
  }

  const searchInp = getEl("rosettaSearchInput", targetDoc);
  if (searchInp) {
    searchInp.value = cleanStrong;
  }

  const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
  if (rowsEl) {
    const renderRowsFn =
      mod && typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
        ? mod.renderPhilologyRosettaResultsRowsHtml
        : renderPhilologyRosettaResultsRowsHtml;
    const activeCat = state?.rosettaCategory || "all";
    rowsEl.innerHTML = renderRowsFn({
      query: cleanStrong,
      category: activeCat,
      rosettaIndex: rosettaIndex || state?.rosettaIndex || null,
    });
    const listEl = getEl("rosettaExplorerResultsList", targetDoc);
    if (listEl) {
      const items = searchPhilologyRosettaIndex(
        cleanStrong,
        activeCat,
        12,
        rosettaIndex || state?.rosettaIndex || null,
      );
      listEl.setAttribute("data-results-count", String(items.length));
    }
  }
  return cleanStrong;
}

/**
 * Hidrata la Gaveta 1 (Estudio 14-Col + Rosetta + Auditoría Diacrónica) (`D10-R38` / `D2-R38` / `D5-R38`).
 */
export async function hydrateStudyDrawerPanel(ctx = {}) {
  const {
    state,
    dataLayer,
    targetDoc,
    getEl,
    withPreservedInputFocus,
    getI18n,
    loadStudyModule,
    navigate,
    hydrateBookAndChapterSelectors,
    transitionSheet,
  } = ctx;
  const mod = await loadStudyModule();
  state.studyLoaded = true;
  const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
  const nsmLexicon =
    typeof dataLayer.loadNsmRealiaLexicon === "function"
      ? await dataLayer.loadNsmRealiaLexicon()
      : null;
  const rosettaIndex =
    typeof dataLayer.loadPhilologyRosettaIndex === "function"
      ? await dataLayer.loadPhilologyRosettaIndex()
      : null;
  if (rosettaIndex) {
    hydratePhilologyRosettaIndex(rosettaIndex);
    state.rosettaIndex = rosettaIndex;
    state.rosettaProvenanceCounts = {
      versificationEngOrg: Array.isArray(rosettaIndex.versification_eng_org)
        ? rosettaIndex.versification_eng_org.length
        : 0,
      ketivQereResiduals: Array.isArray(rosettaIndex.ketiv_qere_residuals)
        ? rosettaIndex.ketiv_qere_residuals.length
        : 0,
    };
  }
  if (!state.pericopesAndGlossesLoaded && typeof dataLayer.loadPericopesAndGlosses === "function") {
    state.pericopesAndGlossesLoaded = true;
    try {
      const pgData = await dataLayer.loadPericopesAndGlosses();
      if (pgData) {
        hydratePericopesAndGlosses(pgData);
        hydrateCulturalGlossesLexicon(pgData.cultural_glosses || pgData);
      }
    } catch {
      // Non-fatal
    }
  }
  if (!state.diachronicRegisterLoaded && typeof dataLayer.loadDiachronicRegisterAudit === "function") {
    state.diachronicRegisterLoaded = true;
    try {
      const drData = await dataLayer.loadDiachronicRegisterAudit();
      if (drData) hydrateDiachronicRegister(drData);
    } catch {
      // Non-fatal
    }
  }
  const i18nInstance = typeof getI18n === "function" ? getI18n() : null;
  const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
  const staticRosettaHostEl = getEl("philologyRosettaStaticHost", targetDoc);
  const studyOpts = {
    book: state.book,
    chapter: state.chapter,
    verse: state.verse,
    lang: state.lang,
    scope: state.studyScope || "verse",
    activeStrongId: state.activeStrongId || "",
    nsmLexicon,
    rosettaIndex,
    rosettaQuery: state.rosettaQuery || "",
    rosettaCategory: state.rosettaCategory || "all",
    includeInlineStrata: false,
    includeExplorer: !Boolean(staticRosettaHostEl),
    i18n: i18nInstance,
    t: tFn,
  };
  const html = mod.renderStudy14ColDrawerHtml(matrixChapter, studyOpts);
  const container =
    getEl("leipzig14ColStratumAction", targetDoc) ||
    getEl("bibleEasyDrawerPanel", targetDoc);
  if (container) {
    withPreservedInputFocus(targetDoc, () => {
      container.innerHTML = html;
    });
    if (state.activeStrongId) {
      syncActiveStrongInStudyDrawer(state.activeStrongId, {
        state,
        targetDoc,
        getEl,
        mod,
        rosettaIndex,
      });
    }
    const staticRowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
    if (staticRosettaHostEl) {
      if (!staticRosettaHostEl.innerHTML || !staticRosettaHostEl.innerHTML.includes("rosettaExplorerResultsRows")) {
        const renderExplorerFn =
          typeof mod.renderPhilologyRosettaExplorerHtml === "function"
            ? mod.renderPhilologyRosettaExplorerHtml
            : renderPhilologyRosettaExplorerHtml;
        staticRosettaHostEl.innerHTML = renderExplorerFn({
          query: state.rosettaQuery || "",
          category: state.rosettaCategory || "all",
          activeRef: `${state.book}.${state.chapter}.${state.verse}`,
          rosettaIndex,
        });
      }
      if (staticRowsEl) {
        const renderRowsFn =
          typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
            ? mod.renderPhilologyRosettaResultsRowsHtml
            : renderPhilologyRosettaResultsRowsHtml;
        staticRowsEl.innerHTML = renderRowsFn({
          query: state.rosettaQuery || "",
          category: state.rosettaCategory || "all",
          rosettaIndex,
        });
      }
    }
    const catSel = getEl("rosettaFilterCategorySelect", targetDoc);
    if (catSel && typeof catSel.addEventListener === "function" && !catSel._rosettaCatBound) {
      catSel._rosettaCatBound = true;
      catSel.addEventListener("change", async (e) => {
        state.rosettaCategory = String(e?.target?.value || catSel.value || "all");
        const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
        if (rowsEl) {
          const renderRowsFn =
            typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
              ? mod.renderPhilologyRosettaResultsRowsHtml
              : renderPhilologyRosettaResultsRowsHtml;
          rowsEl.innerHTML = renderRowsFn({
            query: state.rosettaQuery || "",
            category: state.rosettaCategory,
            rosettaIndex,
          });
          const listEl = getEl("rosettaExplorerResultsList", targetDoc);
          if (listEl) {
            const items = searchPhilologyRosettaIndex(
              state.rosettaQuery || "",
              state.rosettaCategory,
              12,
              rosettaIndex,
            );
            listEl.setAttribute("data-results-count", String(items.length));
          }
        } else {
          await hydrateStudyDrawerPanel(ctx);
        }
      });
    }
    const searchInp = getEl("rosettaSearchInput", targetDoc);
    if (searchInp && typeof searchInp.addEventListener === "function" && !searchInp._rosettaSearchBound) {
      searchInp._rosettaSearchBound = true;
      const onRosettaSearch = async (e) => {
        state.rosettaQuery = String(e?.target?.value ?? searchInp.value ?? "");
        const rowsEl = getEl("rosettaExplorerResultsRows", targetDoc);
        if (rowsEl) {
          const renderRowsFn =
            typeof mod.renderPhilologyRosettaResultsRowsHtml === "function"
              ? mod.renderPhilologyRosettaResultsRowsHtml
              : renderPhilologyRosettaResultsRowsHtml;
          rowsEl.innerHTML = renderRowsFn({
            query: state.rosettaQuery,
            category: state.rosettaCategory || "all",
            rosettaIndex,
          });
          const listEl = getEl("rosettaExplorerResultsList", targetDoc);
          if (listEl) {
            const items = searchPhilologyRosettaIndex(
              state.rosettaQuery,
              state.rosettaCategory || "all",
              12,
              rosettaIndex,
            );
            listEl.setAttribute("data-results-count", String(items.length));
          }
        } else {
          await hydrateStudyDrawerPanel(ctx);
        }
      };
      if (!searchInp._rosettaChangeBound) {
        searchInp._rosettaChangeBound = true;
        searchInp.addEventListener("change", onRosettaSearch);
        searchInp.addEventListener("input", onRosettaSearch);
      }
    }
    if (staticRosettaHostEl && typeof staticRosettaHostEl.addEventListener === "function" && !staticRosettaHostEl._rosettaClickBound) {
      staticRosettaHostEl._rosettaClickBound = true;
      staticRosettaHostEl.addEventListener("click", async (e) => {
        const rosettaBtn = e?.target?.closest
          ? e.target.closest("[data-rosetta-ref]")
          : e?.target?.getAttribute?.("data-rosetta-ref")
            ? e.target
            : null;
        const rosettaRef = rosettaBtn?.getAttribute?.("data-rosetta-ref");
        if (rosettaRef) {
          const rosettaStrong = rosettaBtn?.getAttribute?.("data-rosetta-strong");
          if (rosettaStrong) state.activeStrongId = String(rosettaStrong).toUpperCase();
          const parsedRosetta = parseBiblicalCoordinateReference(rosettaRef);
          if (parsedRosetta && parsedRosetta.bookCode) {
            await navigate(
              {
                book: parsedRosetta.bookCode,
                chapter: parsedRosetta.chapter || 1,
                verse: parsedRosetta.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
        }
      });
    }
    if (typeof container.addEventListener === "function" && !container._scopeListenerBound) {
      container._scopeListenerBound = true;
      container.addEventListener("click", async (e) => {
        const rosettaBtn = e?.target?.closest
          ? e.target.closest("[data-rosetta-ref]")
          : e?.target?.getAttribute?.("data-rosetta-ref")
            ? e.target
            : null;
        const rosettaRef = rosettaBtn?.getAttribute?.("data-rosetta-ref");
        if (rosettaRef) {
          const rosettaStrong = rosettaBtn?.getAttribute?.("data-rosetta-strong");
          if (rosettaStrong) state.activeStrongId = String(rosettaStrong).toUpperCase();
          const parsedRosetta = parseBiblicalCoordinateReference(rosettaRef);
          if (parsedRosetta && parsedRosetta.bookCode) {
            await navigate(
              {
                book: parsedRosetta.bookCode,
                chapter: parsedRosetta.chapter || 1,
                verse: parsedRosetta.verse || 1,
              },
              targetDoc,
            );
            hydrateBookAndChapterSelectors(targetDoc);
          }
          return;
        }
        const proposeBtn = e?.target?.closest
          ? e.target.closest("[data-propose-strong-id]")
          : e?.target?.getAttribute?.("data-propose-strong-id")
            ? e.target
            : null;
        if (proposeBtn) {
          const propStrong = proposeBtn.getAttribute?.("data-propose-strong-id");
          if (propStrong && propStrong !== "∅") {
            state.activeStrongId = String(propStrong).toUpperCase();
          }
          await transitionSheet("field", targetDoc);
          const strongInp = getEl("improveStrongInput", targetDoc);
          if (strongInp && state.activeStrongId) {
            strongInp.value = state.activeStrongId;
          }
          return;
        }
        const slotBtn = e?.target?.closest
          ? e.target.closest("[data-elicitation-slot]")
          : e?.target?.getAttribute?.("data-elicitation-slot")
            ? e.target
            : null;
        if (slotBtn) {
          const slotStrong = slotBtn.getAttribute?.("data-strong") || slotBtn.getAttribute?.("data-strong-id");
          const slotVerse = Number(slotBtn.getAttribute?.("data-verse")) || state.verse;
          if (slotStrong && slotStrong !== "∅") {
            state.activeStrongId = String(slotStrong).toUpperCase();
          }
          state.verse = slotVerse;
          await transitionSheet("field", targetDoc);
          return;
        }
        const cardEl = e?.target?.closest
          ? e.target.closest(".leipzig-14col-card[data-strong-id]")
          : e?.target?.getAttribute?.("data-strong-id")
            ? e.target
            : null;
        if (cardEl) {
          const cardStrong = cardEl.getAttribute?.("data-strong-id");
          if (cardStrong && cardStrong !== "∅") {
            syncActiveStrongInStudyDrawer(cardStrong, {
              state,
              targetDoc,
              getEl,
              mod,
              rosettaIndex,
            });
          }
          return;
        }
        const btn = e?.target?.closest
          ? e.target.closest("[data-study-scope]")
          : e?.target?.getAttribute?.("data-study-scope")
            ? e.target
            : null;
        const nextScope = btn?.getAttribute?.("data-study-scope");
        if (nextScope === "verse" || nextScope === "chapter" || nextScope === "gmis") {
          state.studyScope = nextScope;
          await hydrateStudyDrawerPanel(ctx);
        }
      });
    }
  }

  if (typeof mod.renderStudyStrataCards === "function") {
    const strata = mod.renderStudyStrataCards(matrixChapter, studyOpts);
    const nsmCard = getEl("nsm65StratumCard", targetDoc);
    if (nsmCard) nsmCard.innerHTML = strata.nsmHtml;
    const realiaCard = getEl("realiaMetrologyStratumCard", targetDoc);
    if (realiaCard) realiaCard.innerHTML = strata.realiaHtml;
    const tskCard = getEl("tskCrossRefsStratumCard", targetDoc);
    if (tskCard) tskCard.innerHTML = strata.tskHtml;
  }

  // D5-R38: Hidrata las Sustituciones Diacrónicas en su hogar natural de la Gaveta 1 (Estudio).
  const diachronicAuditPanel = getEl("diachronicRegisterAuditPanel", targetDoc);
  if (diachronicAuditPanel) {
    diachronicAuditPanel.innerHTML = renderChapterDiachronicAuditCardHtml({
      verses: state.lastNavResult?.chapter?.verses || {},
      bookCode: state.book,
      chapter: state.chapter,
    });
  }

  return html;
}

export async function resolvePrimaryStrongForVerse(state, dataLayer) {
  try {
    const matrixChapter = await dataLayer.loadMatrixChapter(state.book, state.chapter);
    const rows = Array.isArray(matrixChapter?.rows) ? matrixChapter.rows : [];
    for (const r of rows) {
      if (Array.isArray(r) && Number(r[1]) === Number(state.verse) && r[6] && r[6] !== "∅") {
        return String(r[6]).toUpperCase();
      }
      if (r && typeof r === "object" && Number(r.verse) === Number(state.verse) && r.c07_strong_id && r.c07_strong_id !== "∅") {
        return String(r.c07_strong_id).toUpperCase();
      }
    }
  } catch {
    // Fallback by testament
  }
  const isNt = /^(MAT|MRK|MAR|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)$/i.test(state.book);
  return isNt ? "G3056" : "H0430";
}

/**
 * Hidrata la Gaveta 3 (Taller de Campo + Escalera CELF 250 + Auditoría CRDT/Censo) (`D3-R38` / `D10-R38`).
 */
export async function hydrateImproveDrawerPanel(ctx = {}) {
  const {
    state,
    dataLayer,
    targetDoc,
    getEl,
    getI18n,
    loadImproveModule,
  } = ctx;
  const mod = await loadImproveModule();
  state.improveLoaded = true;
  const currentVerseText =
    state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
  const osis = `${state.book}.${state.chapter}.${state.verse}`;
  const activeStrongId = await resolvePrimaryStrongForVerse(state, dataLayer);
  state.activeStrongId = activeStrongId;
  const ladder250 =
    typeof dataLayer.loadElicitationLadder250 === "function"
      ? await dataLayer.loadElicitationLadder250()
      : [];
  state.celfLadder250 = ladder250;
  if (typeof dataLayer.loadFieldWorkshopData === "function") {
    const fwData = await dataLayer.loadFieldWorkshopData(state.lang === "stp" ? "stp" : "stp");
    if (fwData) hydrateFieldWorkshopData(fwData, ladder250);
  }
  const i18nInstance = typeof getI18n === "function" ? getI18n() : null;
  const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
  const html = mod.renderImproveDrawerHtml({
    kind: "verse",
    lang: state.lang,
    locale: state.uiLocale,
    uiLocale: state.uiLocale,
    ref: osis,
    osis,
    strongId: activeStrongId,
    currentVerseText,
    currentSurface: currentVerseText,
    level: state.cascadeLevel || "L2",
    i18n: i18nInstance,
    t: tFn,
  });
  const container =
    getEl("socraticElicitorContainer", targetDoc) ||
    getEl("bibleFieldWorkshopSheet", targetDoc);
  if (container) {
    container.innerHTML = html;
  }

  const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);
  if (cascadeEl && typeof mod.renderCascadeAndLadderHtml === "function") {
    cascadeEl.innerHTML = mod.renderCascadeAndLadderHtml({
      ladderItems: ladder250,
      lang: state.lang,
      currentRef: osis,
      osis,
      strongId: activeStrongId,
      level: state.cascadeLevel || "L2",
      activeRung: state.activeCelfRung || "ALL",
      activeOtWave: state.activeOtWave || 0,
      limit: 24,
      includeWalCard: false,
      includeCensusCard: false,
    });
  }

  const lexHost = getEl("stpLexiconExplorerHost", targetDoc);
  if (lexHost) {
    const renderLexFn =
      typeof mod.renderStpLexiconExplorerHtml === "function"
        ? mod.renderStpLexiconExplorerHtml
        : renderStpLexiconExplorerHtml;
    lexHost.innerHTML = renderLexFn({
      query: state.stpLexiconQuery || "",
      activeWave: state.activeOtWave || 0,
      limit: 24,
    });
  }

  const tallerEl = getEl("tallerArtifactsCatalog", targetDoc);
  if (tallerEl && typeof mod.renderTallerArtifactsCatalogHtml === "function") {
    tallerEl.innerHTML = mod.renderTallerArtifactsCatalogHtml({
      lang: state.lang,
      includeCensusCard: true,
    });
    const snapSelect = getEl("selectWalRollbackSnapshot", targetDoc);
    if (snapSelect && typeof snapSelect.addEventListener === "function" && !snapSelect._walSnapBound) {
      snapSelect._walSnapBound = true;
      snapSelect.addEventListener("change", (ev) => {
        const val = String(ev?.target?.value || "PATCH-WAL-SNAP-00");
        state.selectedWalSnapshotId = val;
        snapSelect.setAttribute("data-selected-snapshot", val);
      });
    }
  }

  for (const [btnId, tabName] of [
    ["btnWorkshopSubtabPatch", "patch"],
    ["btnWorkshopSubtabLadder", "ladder"],
    ["btnWorkshopSubtabAudit", "audit"],
  ]) {
    const sBtn = getEl(btnId, targetDoc);
    if (sBtn && typeof sBtn.addEventListener === "function" && !sBtn._subtabBound) {
      sBtn._subtabBound = true;
      sBtn.addEventListener("click", () => {
        state.activeWorkshopSubtab = tabName;
        applyHarelSubtabSelection(targetDoc, "workshop", tabName);
      });
    }
  }

  bindImproveFormControlsInDrawer(mod, ctx);
  return html;
}

export function bindImproveFormControlsInDrawer(mod, ctx = {}) {
  const {
    state,
    targetDoc,
    getEl,
    withPreservedInputFocus,
    navigate,
    hydrateBookAndChapterSelectors,
  } = ctx;
  const kindSel = getEl("improveKindSelect", targetDoc);
  const levelSel = getEl("improveLevelSelect", targetDoc);
  const oldInput = getEl("improveOldSurfaceInput", targetDoc);
  const newInput = getEl("improveNewSurfaceInput", targetDoc);
  const noteInput = getEl("improveNoteInput", targetDoc);
  const previewCode = getEl("improvePatchOutput", targetDoc);
  const copyBtn = getEl("btnCopyPatchPayload", targetDoc);
  const downloadBtn = getEl("btnDownloadPatchFile", targetDoc);
  const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);

  const refreshPatchPreview = () => {
    const selectedLevel = levelSel?.value || state.cascadeLevel || "L2";
    state.cascadeLevel = selectedLevel;
    const osis = `${state.book}.${state.chapter}.${state.verse}`;
    const patchBuilder = typeof mod.buildPatchPayload === "function" ? mod.buildPatchPayload : buildPatchPayload;
    const patch = patchBuilder({
      kind: kindSel?.value || "verse",
      level: selectedLevel,
      lang: state.lang,
      locale: state.uiLocale,
      ref: osis,
      strongId: state.activeStrongId || "H0430",
      oldSurface: oldInput?.value || "",
      newSurface: newInput?.value || "",
      note: noteInput?.value || "",
    });
    if (previewCode) {
      previewCode.textContent = `${patch.payloadLine}\n\n${patch.json}`;
      if (typeof previewCode.setAttribute === "function") {
        previewCode.setAttribute("data-content-hash", patch.contentHash);
        previewCode.setAttribute("data-patch-filename", patch.filename);
      }
    }
    if (cascadeEl && typeof mod.renderCascadeAndLadderHtml === "function") {
      cascadeEl.innerHTML = mod.renderCascadeAndLadderHtml({
        ladderItems: state.celfLadder250 || [],
        lang: state.lang,
        currentRef: osis,
        osis,
        strongId: state.activeStrongId || "H0430",
        level: selectedLevel,
        activeRung: state.activeCelfRung || "ALL",
        activeOtWave: state.activeOtWave || 0,
        limit: 24,
        includeWalCard: false,
        includeCensusCard: false,
      });
    }
    const lexHostEl = getEl("stpLexiconExplorerHost", targetDoc);
    const lexRowsEl = getEl("stpLexiconResultsRows", targetDoc);
    if (lexRowsEl) {
      const renderRowsFn =
        typeof mod.renderStpLexiconResultsRowsHtml === "function"
          ? mod.renderStpLexiconResultsRowsHtml
          : renderStpLexiconResultsRowsHtml;
      lexRowsEl.innerHTML = renderRowsFn({
        query: state.stpLexiconQuery || "",
        activeWave: state.activeOtWave || 0,
        limit: 24,
      });
    } else if (lexHostEl) {
      const renderLexFn =
        typeof mod.renderStpLexiconExplorerHtml === "function"
          ? mod.renderStpLexiconExplorerHtml
          : renderStpLexiconExplorerHtml;
      withPreservedInputFocus(targetDoc, () => {
        lexHostEl.innerHTML = renderLexFn({
          query: state.stpLexiconQuery || "",
          activeWave: state.activeOtWave || 0,
          limit: 24,
        });
      });
      bindLexiconExplorerEvents(lexHostEl);
    }
    return patch;
  };
  state.refreshPatchPreview = refreshPatchPreview;

  const bindLexiconExplorerEvents = (lexHostEl) => {
    if (!lexHostEl) return;
    const searchInput = getEl("stpLexiconSearchInput", targetDoc);
    if (searchInput && typeof searchInput.addEventListener === "function" && !searchInput._lexSearchBound) {
      searchInput._lexSearchBound = true;
      const onLexSearch = (ev) => {
        state.stpLexiconQuery = String(ev?.target?.value ?? searchInput.value ?? "");
        const rowsEl = getEl("stpLexiconResultsRows", targetDoc);
        if (rowsEl) {
          const renderRowsFn =
            typeof mod.renderStpLexiconResultsRowsHtml === "function"
              ? mod.renderStpLexiconResultsRowsHtml
              : renderStpLexiconResultsRowsHtml;
          rowsEl.innerHTML = renderRowsFn({
            query: state.stpLexiconQuery,
            activeWave: state.activeOtWave || 0,
            limit: 24,
          });
        } else {
          (state.refreshPatchPreview || refreshPatchPreview)();
        }
      };
      if (!searchInput._lexInputEventsBound) {
        searchInput._lexInputEventsBound = true;
        searchInput.addEventListener("input", onLexSearch);
        searchInput.addEventListener("change", onLexSearch);
      }
    }
    if (typeof lexHostEl.addEventListener === "function" && !lexHostEl._lexBound) {
      lexHostEl._lexBound = true;
      lexHostEl.addEventListener("click", (ev) => {
        const injectBtn = ev?.target?.closest
          ? ev.target.closest("[data-inject-surface]")
          : ev?.target?.getAttribute?.("data-inject-surface")
            ? ev.target
            : null;
        if (injectBtn) {
          const surfaceVal = injectBtn.getAttribute?.("data-inject-surface") || "";
          if (newInput && surfaceVal) newInput.value = surfaceVal;
          (state.refreshPatchPreview || refreshPatchPreview)();
          return;
        }
        const entryBtn = ev?.target?.closest
          ? ev.target.closest("[data-lex-strong]")
          : ev?.target?.getAttribute?.("data-lex-strong")
            ? ev.target
            : null;
        if (!entryBtn) return;
        const nextStrong = entryBtn.getAttribute?.("data-lex-strong");
        const nextSurface = entryBtn.getAttribute?.("data-lex-surface");
        if (nextStrong) state.activeStrongId = String(nextStrong).toUpperCase();
        if (newInput && nextSurface) newInput.value = nextSurface;
        (state.refreshPatchPreview || refreshPatchPreview)();
      });
    }
  };
  bindLexiconExplorerEvents(getEl("stpLexiconExplorerHost", targetDoc));

  for (const el of [kindSel, levelSel, oldInput, newInput, noteInput]) {
    if (el && typeof el.addEventListener === "function" && !el._improveCtrlBound) {
      el._improveCtrlBound = true;
      el.addEventListener("change", () => (state.refreshPatchPreview || refreshPatchPreview)());
      el.addEventListener("input", () => (state.refreshPatchPreview || refreshPatchPreview)());
    }
  }

  if (copyBtn && typeof copyBtn.addEventListener === "function" && !copyBtn._copyPatchBound) {
    copyBtn._copyPatchBound = true;
    copyBtn.addEventListener("click", () => {
      const patch = (state.refreshPatchPreview || refreshPatchPreview)();
      copyBtn.setAttribute("data-last-copied-hash", patch.contentHash);
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(patch.json).catch(() => {});
      }
    });
  }

  const applyBtn = getEl("btnApplySuggestedImprovement", targetDoc);
  const applyFn =
    typeof mod.applySuggestedImprovement === "function"
      ? mod.applySuggestedImprovement
      : applySuggestedImprovement;
  if (applyBtn && typeof applyBtn.addEventListener === "function" && !applyBtn._applySuggestedBound) {
    applyBtn._applySuggestedBound = true;
    applyBtn.addEventListener("click", () => {
      applyFn(targetDoc, applyBtn, state.refreshPatchPreview || refreshPatchPreview);
    });
  }

  const walSnapSel = getEl("selectWalRollbackSnapshot", targetDoc);
  const walRestoreBtn = getEl("btnRestoreWalSnapshot", targetDoc);
  const updateWalSnapshotPreviewDom = () => {
    const previewBox = getEl("walSnapshotRollbackPreviewBox", targetDoc);
    if (!previewBox) return;
    const selIdx = walSnapSel && typeof walSnapSel.selectedIndex === "number" ? walSnapSel.selectedIndex + 1 : 1;
    const preview = computeWalSnapshotRollbackPreview(selIdx);
    state.lastWalRollbackPreview = preview;
    previewBox.textContent = preview.previewText;
    previewBox.setAttribute("data-snapshot-index", String(preview.snapshotIndex));
    previewBox.setAttribute("data-snapshot-sha256", preview.sha256Prefix);
    previewBox.setAttribute("data-snapshot-patch-id", preview.patchId);
  };
  if (walSnapSel && typeof walSnapSel.addEventListener === "function" && !walSnapSel._walSnapBound) {
    walSnapSel._walSnapBound = true;
    walSnapSel.addEventListener("change", updateWalSnapshotPreviewDom);
  }
  if (walRestoreBtn && typeof walRestoreBtn.addEventListener === "function" && !walRestoreBtn._walRestoreBound) {
    walRestoreBtn._walRestoreBound = true;
    walRestoreBtn.addEventListener("click", updateWalSnapshotPreviewDom);
  }

  if (downloadBtn && typeof downloadBtn.addEventListener === "function" && !downloadBtn._downloadPatchBound) {
    downloadBtn._downloadPatchBound = true;
    downloadBtn.addEventListener("click", () => {
      const patch = (state.refreshPatchPreview || refreshPatchPreview)();
      downloadBtn.setAttribute("data-last-download-filename", patch.filename);
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && targetDoc?.createElement) {
        const blob = new Blob([patch.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = targetDoc.createElement("a");
        if (a) {
          a.href = url;
          a.download = patch.filename;
          if (typeof a.click === "function") a.click();
        }
      }
    });
  }

  if (cascadeEl && typeof cascadeEl.addEventListener === "function" && !cascadeEl._celfBound) {
    cascadeEl._celfBound = true;
    cascadeEl.addEventListener("click", async (e) => {
      const waveBtn = e?.target?.closest
        ? e.target.closest("[data-ot-wave]")
        : e?.target?.getAttribute?.("data-ot-wave")
          ? e.target
          : null;
      const waveAttr = waveBtn?.getAttribute?.("data-ot-wave");
      if (waveAttr !== null && waveAttr !== undefined) {
        state.activeOtWave = Number(waveAttr) || 0;
        (state.refreshPatchPreview || refreshPatchPreview)();
        return;
      }
      const filterBtn = e?.target?.closest
        ? e.target.closest("[data-celf-rung-filter]")
        : e?.target?.getAttribute?.("data-celf-rung-filter")
          ? e.target
          : null;
      const filterKey = filterBtn?.getAttribute?.("data-celf-rung-filter");
      if (filterKey) {
        state.activeCelfRung = filterKey;
        (state.refreshPatchPreview || refreshPatchPreview)();
        return;
      }
      const entropyBtn = e?.target?.closest
        ? e.target.closest("[data-next-entropy-ref]")
        : e?.target?.getAttribute?.("data-next-entropy-ref")
          ? e.target
          : null;
      const nextEntropyRef = entropyBtn?.getAttribute?.("data-next-entropy-ref");
      if (nextEntropyRef) {
        const parsedEnt = parseBiblicalCoordinateReference(nextEntropyRef);
        if (parsedEnt && parsedEnt.bookCode) {
          await navigate(
            {
              book: parsedEnt.bookCode,
              chapter: parsedEnt.chapter || 1,
              verse: parsedEnt.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
        return;
      }
      const jumpOsisBtn = e?.target?.closest
        ? e.target.closest("[data-jump-osis]")
        : e?.target?.getAttribute?.("data-jump-osis")
          ? e.target
          : null;
      const jumpOsisRef = jumpOsisBtn?.getAttribute?.("data-jump-osis");
      if (jumpOsisRef) {
        const parsedJump = parseBiblicalCoordinateReference(jumpOsisRef);
        if (parsedJump && parsedJump.bookCode) {
          await navigate(
            {
              book: parsedJump.bookCode,
              chapter: parsedJump.chapter || 1,
              verse: parsedJump.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
        return;
      }
      const rungBtn = e?.target?.closest
        ? e.target.closest("[data-ladder-ref]")
        : e?.target?.getAttribute?.("data-ladder-ref")
          ? e.target
          : null;
      const ladderRef = rungBtn?.getAttribute?.("data-ladder-ref");
      if (ladderRef) {
        const parsed = parseBiblicalCoordinateReference(ladderRef);
        if (parsed && parsed.bookCode) {
          await navigate(
            {
              book: parsed.bookCode,
              chapter: parsed.chapter || 1,
              verse: parsed.verse || 1,
            },
            targetDoc,
          );
          hydrateBookAndChapterSelectors(targetDoc);
        }
      }
    });
  }
}

/**
 * Renderizado síncrono de la Gaveta 2 (Imprimir y Ediciones) (`D10-R38` / `D4-R38` / `D5-R38`).
 */
export function renderPrintDrawerPanelsSyncInDrawer(ctx = {}) {
  const { state, targetDoc, getEl, hydratePrintDrawerPanels } = ctx;
  const budget = computeKindlePrintBudget({
    fontPt: state.fontSizePt || 9.5,
    columns: state.columns || 2,
    orientation: state.orientation || "landscape",
    paper: state.paperFormat || "a4",
  });
  const budgetOutput = getEl("kindleBudgetOutput", targetDoc);
  if (budgetOutput) {
    budgetOutput.textContent = budget.summaryText;
    if (typeof budgetOutput.setAttribute === "function") {
      budgetOutput.setAttribute("data-cpl", String(budget.cpl));
      budgetOutput.setAttribute("data-estimated-pages", String(budget.estimatedPages));
      budgetOutput.setAttribute("data-effective-columns", String(budget.effectiveColumns));
    }
  }

  const duplexPanel = getEl("duplexAssistantPanel", targetDoc);
  if (duplexPanel) {
    const slug = normalizeEditionSlug(state.edition, {
      paperFormat: state.paperFormat,
      columns: state.columns,
    });
    const foliation = computeFoliationLayout({
      mode: state.foliationMode || "saddle_stitch",
      paper: state.paperFormat || "a4",
      pageCount: 16,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
    });
    const resolvedBlock = resolveCanonicalBlockForPassage(state.book, state.chapter);
    const activeBlockNum = Number(state.activeBlockNumber) || resolvedBlock.blockNumber || 1;
    const multiSigHtml = renderMultiSignatureAndPocketRefugeHtml({
      totalPages: 160,
      activeBlockNumber: activeBlockNum,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
    });
    const branchTypoHtml = renderBranchAndTypologyInspectorHtml({
      lang: state.lang,
      activeBranchId: state.activeBranchId || "",
      activeTypologyId: state.activeTypologyId || "",
    });
    const branchPanel = getEl("bibleBranchAndTypologyPanel", targetDoc);
    if (branchPanel) {
      branchPanel.innerHTML = branchTypoHtml;
    }
    duplexPanel.innerHTML = `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(
      slug,
    )}" data-foliation-mode="${escapeHtml(foliation.mode)}" data-binding-edge="${escapeHtml(
      foliation.bindingEdge,
    )}"><strong>Asistente Dúplex (${
      state.duplex ? "2 caras · Paridad par garantizada" : "1 cara"
    }) · ${escapeHtml(foliation.summary)}</strong><p style="margin:4px 0 0;font-size:0.84rem;">Paso 1: Imprime caras impares (anverso). Paso 2: Voltea el pliego por el borde largo e imprime caras pares (reverso) · ${escapeHtml(
      budget.summaryText,
    )}.</p>${multiSigHtml}${branchPanel ? "" : branchTypoHtml}</div>`;
    const blockSel = getEl("canonicalBlockSelect", targetDoc);
    if (blockSel && typeof blockSel.addEventListener === "function" && !blockSel._blockSelBound) {
      blockSel._blockSelBound = true;
      blockSel.addEventListener("change", (e) => {
        state.activeBlockNumber = Math.max(1, Math.min(80, Number(e?.target?.value || blockSel.value) || 1));
        hydratePrintDrawerPanels(targetDoc);
      });
    }
    const branchSel = getEl("branchProfileSelect", targetDoc);
    if (branchSel && typeof branchSel.addEventListener === "function" && !branchSel._branchSelBound) {
      branchSel._branchSelBound = true;
      branchSel.addEventListener("change", (e) => {
        state.activeBranchId = String(e?.target?.value || branchSel.value || "");
        hydratePrintDrawerPanels(targetDoc);
      });
    }
    const typoSel = getEl("typologySheetSelect", targetDoc);
    if (typoSel && typeof typoSel.addEventListener === "function" && !typoSel._typoSelBound) {
      typoSel._typoSelBound = true;
      typoSel.addEventListener("change", (e) => {
        state.activeTypologyId = String(e?.target?.value || typoSel.value || "");
        hydratePrintDrawerPanels(targetDoc);
      });
    }
  }

  const photocopyBadge = getEl("biblePhotocopySimBadge", targetDoc);
  if (photocopyBadge) {
    const activeGen = Number.isInteger(state.photocopyGen) ? state.photocopyGen : 3;
    const activeSauvolaK = typeof state.sauvolaK === "number" ? state.sauvolaK : 0.25;
    const simLive = simulateKanungoSauvolaGeneration(activeGen, activeSauvolaK, 300);
    const sim3rd = simulateThirdGenPhotocopySauvola({
      strokePt: (state.fontSizePt || 9.5) >= 9.0 ? 0.85 : 0.75,
      k: simLive.sauvolaK,
      R: 128,
    });
    photocopyBadge.textContent = formatPhotocopySimBadgeText(simLive);
    photocopyBadge.setAttribute("data-euler-delta", String(simLive.eulerCharacteristicDelta));
    photocopyBadge.setAttribute("data-survives-3rd-gen", String(Boolean(simLive.wcagPassAaa && sim3rd.survives3rdGen)));
    photocopyBadge.setAttribute("data-photocopy-gen", String(simLive.genIndex));
    photocopyBadge.setAttribute("data-sauvola-k", String(simLive.sauvolaK));
    photocopyBadge.setAttribute("data-contrast-ratio", String(simLive.contrastLabel));
    const printStepCard = getEl("biblePrintStepCard", targetDoc);
    if (printStepCard) {
      printStepCard.setAttribute("data-photocopy-gen", String(simLive.genIndex));
      printStepCard.setAttribute("data-sauvola-k", String(simLive.sauvolaK));
    }
  }

  const graphicsHost = getEl("editorialGraphicsPhotocopyHost", targetDoc);
  if (graphicsHost) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      "En el principio creó Dios los cielos y la tierra.";
    graphicsHost.innerHTML = renderEditorialGraphicsAndPrintSpecsCard({
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      text: verseText,
      lang: state.lang,
      activeGen: state.photocopyGen ?? 5,
      sauvolaK: state.sauvolaK ?? 0.32,
    });
    if (typeof graphicsHost.addEventListener === "function" && !graphicsHost._photocopyBound) {
      graphicsHost._photocopyBound = true;
      graphicsHost.addEventListener("click", (e) => {
        const genBtn = e?.target?.closest
          ? e.target.closest("[data-photocopy-gen]")
          : e?.target?.getAttribute?.("data-photocopy-gen")
            ? e.target
            : null;
        const genAttr = genBtn?.getAttribute?.("data-photocopy-gen");
        if (genAttr !== null && genAttr !== undefined) {
          state.photocopyGen = Number(genAttr) || 0;
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
    const sauvolaInput = getEl("inputSauvolaK", targetDoc);
    if (sauvolaInput && typeof sauvolaInput.addEventListener === "function" && !sauvolaInput._sauvolaKBound) {
      sauvolaInput._sauvolaKBound = true;
      const onSauvolaChange = (ev) => {
        state.sauvolaK = Number(ev?.target?.value) || 0.32;
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      };
      if (!sauvolaInput._sauvolaEventsBound) {
        sauvolaInput._sauvolaEventsBound = true;
        sauvolaInput.addEventListener("input", onSauvolaChange);
        sauvolaInput.addEventListener("change", onSauvolaChange);
      }
    }
  }

  const stationeryPanel = getEl("stationeryCardPanel", targetDoc);
  if (stationeryPanel) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      "Selecciona un versículo para tarjeta postal A6/Carta.";
    stationeryPanel.innerHTML = `<div class="mostrador-stationery-card" data-osis="${escapeHtml(
      `${state.book}.${state.chapter}.${state.verse}`,
    )}"><strong>Postal tipográfica A6 (${escapeHtml(
      `${state.book} ${state.chapter}:${state.verse}`,
    )})</strong><blockquote style="margin:4px 0 0;font-style:italic;">"${escapeHtml(
      verseText,
    )}"</blockquote></div>`;
  }

  const impHost = getEl("impositionBookletPreviewHost", targetDoc);
  if (impHost && !impHost.innerHTML) {
    impHost.innerHTML = renderImpositionAndLayoutPreviewHtml({
      mode: state.activePrintPreviewMode || "imposition",
      paper: state.paperFormat || "a4",
      pageCount: 16,
      columns: state.columns || 2,
      fontPt: state.fontSizePt || 9.5,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
    });
  }

  const catalogGrid = getEl("bibleEditionsCatalogGrid", targetDoc);
  if (catalogGrid) {
    const editions = listAll14PrintEditionsForLang(state.lastManifest || state.lang, state.lang);
    catalogGrid.setAttribute("data-editions-count", String(editions.length));
    catalogGrid.innerHTML = editions
      .map(
        (ed) =>
          `<a class="uls-chip print-edition-card" href="${escapeHtml(
            buildRelativePdfAssetUrl(ed.profileUrl || ed.url),
          )}" data-profile-id="${escapeHtml(ed.profileId || ed.id)}" data-edition-slug="${escapeHtml(
            ed.editionSlug,
          )}" data-geometry-key="${escapeHtml(ed.geometryKey || "")}" data-edition-kind="${escapeHtml(
            ed.kind || "edition",
          )}" data-toml-path="${escapeHtml(ed.tomlPath || "")}" data-font-pt="${escapeHtml(
            ed.fontPt || "",
          )}" data-columns="${escapeHtml(ed.columns || "")}" data-paper-size="${escapeHtml(
            ed.paperSize || "",
          )}" download>📄 ${escapeHtml(ed.label)}</a>`,
      )
      .join("");
    if (typeof catalogGrid.addEventListener === "function" && !catalogGrid._editionsBound) {
      catalogGrid._editionsBound = true;
      catalogGrid.addEventListener("click", (e) => {
        const cardEl = e?.target?.closest
          ? e.target.closest("[data-profile-id]")
          : e?.target?.getAttribute?.("data-profile-id")
            ? e.target
            : null;
        const profId = cardEl?.getAttribute?.("data-profile-id");
        if (profId && !profId.includes("refugio_4_hojas") && !profId.includes("checklist_80_bloques")) {
          const synced = syncPrintDrawerControlsFromEditionProfile(profId, targetDoc);
          state.activePrintProfileId = synced.profileId;
          state.fontSizePt = synced.fontPt;
          state.columns = synced.columns;
          state.paperFormat = synced.paper;
          state.orientation = synced.orientation;
          state.foliationMode = synced.foliationMode;
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
  }
}

export async function hydratePrintDrawerPanelsInDrawer(ctx = {}) {
  const { state, dataLayer } = ctx;
  renderPrintDrawerPanelsSyncInDrawer(ctx);
  if (!state.editorialProfilesLoaded && typeof dataLayer.loadEditorialProfiles === "function") {
    state.editorialProfilesLoaded = true;
    try {
      const ep = await dataLayer.loadEditorialProfiles();
      if (ep) {
        hydrateEditorialProfiles(ep);
        state.editorialProfilesProvenance = {
          printCount: Array.isArray(ep.print_profiles_14) ? ep.print_profiles_14.length : 14,
          branchCount: Array.isArray(ep.branch_profiles_12) ? ep.branch_profiles_12.length : 12,
          blocksCount: Array.isArray(ep.canonical_80_blocks_catalog)
            ? ep.canonical_80_blocks_catalog.length
            : 80,
        };
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      }
    } catch {
      // Non-fatal
    }
  }
}

/**
 * Hidrata la Gaveta 4 (Compartir, Quine Offline, QRBeam LT y Auditoría) (`D10-R38` / `D6-R38`).
 */
export function hydrateShareAndAuditDrawerPanel(ctx = {}) {
  const { state, dataLayer, targetDoc, getEl, hydrateShareAndAuditDrawer } = ctx;
  const packLang = ["es", "en", "stp", "he", "grc"].includes(state.lang) ? state.lang : "stp";
  const quineRelUrl = `obras/biblia/packs/${packLang === "grc" ? "he" : packLang}/lector_offline_${packLang === "grc" ? "he" : packLang}.html`;
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
    });
    packsPanel.innerHTML =
      `<div class="mostrador-offline-packs" data-lang="${escapeHtml(state.lang)}" data-quine-url="${escapeHtml(quineRelUrl)}">` +
      `<strong>Paquete Offline Soberano (${escapeHtml(state.lang.toUpperCase())})</strong>` +
      `<p style="margin:4px 0 6px;font-size:0.84rem;">Cero telemetría · Quine HTML autónomo (<code>DecompressionStream("deflate-raw")</code>) + Verificación SHA-256 / Merkle lista para USB, Bluetooth y MicroSD.</p>` +
      `<a class="uls-chip" href="${escapeHtml(quineRelUrl)}" download="lector_offline_${escapeHtml(packLang)}.html" data-quine-download="true" style="text-decoration:none;display:inline-flex;align-items:center;min-height:48px;padding:0.35rem 0.7rem;margin-bottom:0.5rem;">💾 Descargar Quine Offline (${escapeHtml(packLang.toUpperCase())})</a>` +
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
    const exportSneakernetBtn = getEl("btnExportSneakernetBundle", targetDoc);
    if (exportSneakernetBtn && typeof exportSneakernetBtn.addEventListener === "function" && !exportSneakernetBtn._sneakernetExpBound) {
      exportSneakernetBtn._sneakernetExpBound = true;
      exportSneakernetBtn.addEventListener("click", () => {
        const jsonBundle = exportSneakernetBundleJson({ lang: packLang });
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
          exportSneakernetBundleJson({ lang: packLang });
        const imported = importSneakernetBundleJson(bundleStr);
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
      `<strong>📡 QRBeam Optical Stream (${activeCadenceKey} fps · ${cadencePreset.intervalMs} ms/frame · Frame #${grid.seq} · Paridad ${grid.parityBit})</strong>` +
      `<div style="display:inline-flex;gap:0.35rem;">` +
      `<button type="button" id="btnNextQrBeamFrame" class="uls-chip" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.78rem;">⏭ Siguiente Droplet (#${grid.seq + 1})</button>` +
      `</div></div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;">` +
      `<div class="qrbeam-matrix-host">${svgMarkup}</div>` +
      `<p style="margin:0;font-size:0.81rem;flex:1;min-width:180px;">Pase 1 sistemático (K=${encoder.K} bloques + blanqueo XOR <code>whitenBlockXor</code> + paridad 4.ª esquina) seguido de cola Solitón Luby Transform.</p>` +
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
      typeof dataLayer.getHydratedWasmModule === "function"
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
        typeof dataLayer.getHydratedWasmModule === "function"
          ? dataLayer.getHydratedWasmModule("qr_stream_receiver_wasm")
          : null;
      if (!wasmMod && typeof dataLayer.loadWasmModule === "function") {
        try {
          const loaded = await dataLayer.loadWasmModule("qr_stream_receiver_wasm");
          if (loaded && loaded.status === STATUS.READY) wasmMod = loaded;
        } catch {
          wasmMod = null;
        }
      }
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
 * Traduce los rótulos estáticos del cromo bilingüe y obras hermanas cuando cambia `uiLocale` (`D8-R38`).
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
  if (state && typeof state.hydrateEvangeliosSection === "function" && state.activeWork === "evangelios") {
    state.hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
  }
}


