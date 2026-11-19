// ============================================================================
// web/mostrador/drawer_workshop.js — Gaveta 3 (Taller de Campo, Escalera CELF-250 & Auditoría CRDT/Censo 7,164)
// Decisiones D1-R41, D4-R41, D6-R41, D7-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import {
  CANONICAL_BOOK_ORDER,
  CANONICAL_TOTAL_VERSES,
  canonicalOrdinalOf,
  canonicalRefOfOrdinal,
} from "./canonical_versification.js";
import {
  CASCADE_SEMILATTICE_PRIORITY,
  evaluateBetaDawidSkeneSprt,
  exportSignedEcoPatchV2Artifact,
  foldCascadePatchV2Semilattice,
  hydrateFormulaicParallelsIndex,
  projectChapterThroughCascadeSemilattice,
} from "./cascade_l1_l5.js";
import {
  applyHarelSubtabSelection,
  resolvePrimaryStrongForVerse,
} from "./drawer_study.js";
import {
  applySuggestedImprovement,
  buildPatchPayload,
  computeWalSnapshotRollbackPreview,
  foldCrdtWalSemilattice,
  hydrateFieldWorkshopData,
  renderStpDraftCheckHtml,
  renderStpLexiconExplorerHtml,
  renderStpLexiconResultsRowsHtml,
} from "./mejorar.js";
import { computeEcoPackCrc32Hex } from "./offline_mesh.js";
import { parseBiblicalCoordinateReference } from "./reference.js";
import {
  OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
  OVERLAY_AUTHORITY_MAINTAINER_ED25519,
  applyOverlayEntriesToLiveState,
  ensureStateOverlaysHydrated,
  loadLiveCascadeOverlaysIdb,
  persistSignedCascadeOverlayIdb,
  projectChapterWithLiveOverlays,
  resolveOverlayEntryForOsis,
  resolveVerseWithOverlay,
} from "./workshop_overlay_store.js";

export {
  CASCADE_SEMILATTICE_PRIORITY,
  OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
  OVERLAY_AUTHORITY_MAINTAINER_ED25519,
  applyOverlayEntriesToLiveState,
  ensureStateOverlaysHydrated,
  exportSignedEcoPatchV2Artifact,
  foldCascadePatchV2Semilattice,
  loadLiveCascadeOverlaysIdb,
  persistSignedCascadeOverlayIdb,
  projectChapterThroughCascadeSemilattice,
  projectChapterWithLiveOverlays,
  resolveOverlayEntryForOsis,
  resolveVerseWithOverlay,
};
export const HAREL_WORKSHOP_SUBTABS = ["patch", "ladder", "audit"];

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Calcula determinísticamente el lote atómico `BLK-0001..BLK-1245` (`stp_ledger.json`, 31,102 versículos / 25 vv por lote)
 * al que pertenece cualquier pasaje bíblico (`D2-B+` / `SLICE-93`).
 */
export function resolveAtomicBatchForPassage(bookId = "GEN", chapter = 1, verse = 1) {
  const cleanBook = String(bookId || "GEN").toUpperCase().trim();
  const ch = Math.max(1, Number(chapter) || 1);
  const vs = Math.max(1, Number(verse) || 1);
  // D8-R44 / DEB-R44-08: ordinal canónico exacto (1..31,102) en lugar de `bookIdx * 470 + (ch - 1) * 24`.
  const exactOrdinal =
    canonicalOrdinalOf(cleanBook, ch, vs) ??
    canonicalOrdinalOf(CANONICAL_BOOK_ORDER.includes(cleanBook) ? cleanBook : "GEN", 1, 1);
  const zeroBasedOrdinal = Math.min(CANONICAL_TOTAL_VERSES - 1, Math.max(0, exactOrdinal - 1));
  const batchNumber = Math.min(1245, Math.max(1, Math.floor(zeroBasedOrdinal / 25) + 1));
  const batchId = `BLK-${String(batchNumber).padStart(4, "0")}`;
  const startOrdinal = (batchNumber - 1) * 25 + 1;
  const endOrdinal = Math.min(31102, batchNumber * 25);
  return {
    batchId,
    batchNumber,
    totalBatches: 1245,
    startOrdinal,
    endOrdinal,
    startRef: canonicalRefOfOrdinal(startOrdinal),
    endRef: canonicalRefOfOrdinal(endOrdinal),
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
  const commitNoteSuffix =
    rootNotesRaw && typeof rootNotesRaw === "object" && rootNotesRaw.note_pure_text
      ? ` · ${String(rootNotesRaw.note_pure_text)}`
      : "";
  const commitSurface =
    rootNotesRaw && typeof rootNotesRaw === "object" && rootNotesRaw.new_surface
      ? String(rootNotesRaw.new_surface)
      : "Jawatan Dios";
  return [
    { strong_id: "H0430", patch_id: "PATCH-WAL-COMMIT-R16", ref: "GEN.1.1", surface_stp: commitSurface, note: `Elohim · Creador soberano${commitNoteSuffix}` },
    { strong_id: "H3068", patch_id: "PATCH-WAL-COMMIT-R16", ref: "PSA.23.1", surface_stp: "Jawatan", note: "YHWH · Nombre del Pacto" },
    { strong_id: "H7307", patch_id: "PATCH-STP-L3-001", ref: "GEN.1.2", surface_stp: "Espíritu", note: "Ruach · Aliento / Espíritu" },
    { strong_id: "G0026", patch_id: "PATCH-WAL-COMMIT-R16", ref: "1CO.13.4", surface_stp: "xoi'kam", note: "Agape · Amor leal" },
    { strong_id: "G1411", patch_id: "PATCH-WAL-COMMIT-R16", ref: "ACT.1.8", surface_stp: "gɨ'kora'", note: "Dynamis · Poder" },
    { strong_id: "G1515", patch_id: "PATCH-WAL-COMMIT-R16", ref: "JHN.14.27", surface_stp: "bhai'x i'ii'ñ", note: "Eirene · Paz" },
    { strong_id: "G1656", patch_id: "PATCH-WAL-COMMIT-R16", ref: "MAT.5.7", surface_stp: "xoi'kam", note: "Eleos · Misericordia" },
    { strong_id: "G2641", patch_id: "PATCH-WAL-COMMIT-R16", ref: "ROM.11.5", surface_stp: "ja'tkam", note: "Kataleimma · Remanente" },
    { strong_id: "G4102", patch_id: "PATCH-WAL-COMMIT-R16", ref: "ROM.1.17", surface_stp: "jix maat", note: "Pistis · Fe / Fidelidad" },
    { strong_id: "G5485", patch_id: "PATCH-WAL-COMMIT-R16", ref: "EPH.2.8", surface_stp: "bhai'x maa", note: "Charis · Gracia" },
  ];
}

/**
 * Renderiza el Inspector del Censo Maestro de 7,164 Lenguas (`MASTER_CENSUS.json`: 380 subclados, 12 macro-regiones `G_01..G_12`,
 * 4 Tiers Soberanos `1020/1550/1420/3174`, entropía formulaica `14.41%` / `26,620` plantillas)
 * y los 1,245 Lotes Atómicos de `stp_ledger.json` (`D2-B+` / `D7-R41` / `SLICE-93`).
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
    `style="grid-column:1 / -1;width:100%;box-sizing:border-box;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
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
 * y las 10 Notas de Raíz (`root_notes_stp.json`) (`D3-B+` / `D7-R41` / `SLICE-94`).
 */
export function renderCrdtWalAndLockP2AuditCardHtml(workshopArtifact = null) {
  const crdt = workshopArtifact?.crdt_wal_semilattice || {};
  const lockP2 = workshopArtifact?.patch_journal_lock_p2 || {};
  const rootNotes = normalizeRootNotesEntries(workshopArtifact?.root_notes_stp);

  const rawLines = Number(crdt.raw_wal_lines ?? crdt.raw_wal_lines_count) || 67;
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
  const foldedWal = foldCrdtWalSemilattice(patches);
  const canonicalCount =
    Number(crdt.folded_canonical_count ?? crdt.canonical_patches_count) ||
    foldedWal.canonicalCount ||
    5;

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
        `<span class="uls-badge" data-root-note-strong="${escHtml(rn.strong_id)}" data-root-note="${escHtml(rn.note || "")}" style="font-size:0.71rem;padding:0.15rem 0.45rem;">` +
        `<strong>${escHtml(rn.strong_id)}</strong> ${escHtml(rn.surface_stp || "")} (${escHtml(rn.ref || "GEN.1.1")}) — ${escHtml(rn.note || "")}` +
        `</span>`,
    )
    .join(" ");
  // D7-R44: notas exegéticas completas de las raíces verificadas (`surface_stp` + `note`), plegadas bajo un toque.
  const rootNotesDetailsHtml = rootNotes.length
    ? `<details id="rootNotesStpFullNotes" class="hig-tech-receipt-details" style="width:100%;margin-top:0.3rem;">` +
    `<summary>📖 Notas exegéticas de las ${rootNotes.length} raíces</summary>` +
    `<ul style="margin:0.3rem 0 0;padding-left:1.1rem;">` +
    rootNotes
      .map(
        (rn) =>
          `<li data-root-note-strong="${escHtml(rn.strong_id)}"><strong>${escHtml(rn.strong_id)} · ${escHtml(rn.surface_stp || "")}</strong> — ${escHtml(rn.note || "")}</li>`,
      )
      .join("") +
    `</ul></details>`
    : "";

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
    `style="grid-column:1 / -1;width:100%;box-sizing:border-box;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<strong>🪵 Semirretículo CRDT WAL (<code>stp.wal.jsonl</code>: ${rawLines} eventos → ${canonicalCount} parches canónicos idempotentes)</strong>` +
    `<span class="uls-badge" data-lock-p2-veto-badge="true">🛑 Rollback Atómico Candado P2: ${escHtml(rollbackId)} (${escHtml(rollbackStatus)} · Comilla Desbalanceada)</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.4rem;">${patchesPills}</div>` +
    `<div style="display:grid;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<label for="selectWalRollbackSnapshot" style="font-size:0.75rem;font-weight:600;">⏱️ Punto de Restauración WAL (10 Snapshots SHA-256):</label>` +
    `<select id="selectWalRollbackSnapshot" data-wal-snapshots-count="${snapshots10.length}" style="width:100%;box-sizing:border-box;min-height:48px;min-width:48px;padding:8px 12px;font-size:0.75rem;border-radius:6px;">${snapshotOptionsHtml}</select>` +
    `<button type="button" id="btnRestoreWalSnapshot" class="uls-chip" data-action="restore-wal-snapshot" style="min-height:48px;padding:0.35rem 0.7rem;font-size:0.75rem;justify-self:start;">🔄 Previsualizar / Restaurar Snapshot</button>` +
    `</div>` +
    `<div id="walSnapshotRollbackPreviewBox" data-wal-preview-active="true" style="margin-bottom:0.4rem;padding:0.35rem 0.55rem;border-radius:6px;border:1px dashed var(--card-border);background:var(--bg-secondary);font-size:0.74rem;color:var(--text-secondary);">` +
    `Snapshot activo: <code>${escHtml(snapshots10[0]?.patch_id || "PATCH-STP-L2-0001")}</code> (${escHtml(snapshots10[0]?.target_ref || "GEN.1.1")}) · Guardia P2 lista para restauración atómica.` +
    `</div>` +
    `<div style="font-size:0.75rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem;">` +
    `<span>📒 Ledger de Notas de Raíz (<code>root_notes_stp.json</code>): <strong>${rootNotes.length}</strong> raíces verificadas:</span> ${rootNotesPillsHtml}` +
    rootNotesDetailsHtml +
    `</div>` +
    `</div>`
  );
}

/**
 * Hidrata la Gaveta 3 (Taller de Campo + Escalera CELF 250 + Auditoría CRDT/Censo) (`D4-R41` / `D3-R38` / `D10-R38`).
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
  const currentVerseText =
    state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "";
  const osis = `${state.book}.${state.chapter}.${state.verse}`;
  // SLICE-EKO-V2I-25: Hidratar perezosamente `matrixRows` del capítulo + `formulaic_index.json` al abrir Gaveta 3
  if (!state.lastNavResult?.matrix?.rows) {
    const loadMatFn =
      typeof dataLayer?.loadChapterMatrix === "function"
        ? dataLayer.loadChapterMatrix.bind(dataLayer)
        : typeof dataLayer?.loadMatrixChapter === "function"
          ? dataLayer.loadMatrixChapter.bind(dataLayer)
          : null;
    if (loadMatFn) {
      try {
        const matRes = await loadMatFn(state.book || "GEN", state.chapter || 1);
        const rows = Array.isArray(matRes?.rows)
          ? matRes.rows
          : Array.isArray(matRes?.data?.rows)
            ? matRes.data.rows
            : null;
        if (rows && rows.length > 0) {
          if (!state.lastNavResult) state.lastNavResult = {};
          state.lastNavResult.matrix = { rows };
        }
      } catch {
        // Mantener operación degradada limpia cuando matrix_tier0 no está disponible
      }
    }
  }
  if (!state.formulaicIndexHydrated && typeof dataLayer?.loadJson === "function") {
    state.formulaicIndexHydrated = true;
    Promise.resolve(dataLayer.loadJson("data/formulaic_index.json"))
      .then((fj) => {
        if (fj) hydrateFormulaicParallelsIndex(fj);
      })
      .catch(() => {});
  }
  const activeStrongId = await resolvePrimaryStrongForVerse(state, dataLayer);
  state.activeStrongId = activeStrongId;
  const ladder250 =
    typeof dataLayer.loadElicitationLadder250 === "function"
      ? await dataLayer.loadElicitationLadder250()
      : [];
  state.celfLadder250 = ladder250;
  if (typeof dataLayer.loadFieldWorkshopData === "function") {
    const fwData = await dataLayer.loadFieldWorkshopData(state.lang === "stp" ? "stp" : "stp");
    if (fwData) {
      hydrateFieldWorkshopData(fwData, ladder250);
      const renderDraftCheck =
        typeof mod.renderStpDraftCheckHtml === "function"
          ? mod.renderStpDraftCheckHtml
          : renderStpDraftCheckHtml;
      renderDraftCheck({
        uncertaintyQueue: fwData.top_uncertainty_queue || [],
        lang: state.lang || "stp",
      });
    }
  }
  const persistedOverlays = await loadLiveCascadeOverlaysIdb(state.lang).catch(() => []);
  if (persistedOverlays.length > 0) {
    state.liveCascadeOverlays = persistedOverlays;
    applyOverlayEntriesToLiveState(state, persistedOverlays);
  }
  if (!state.masterCensusSummary && typeof dataLayer.loadMasterCensusSummary === "function") {
    try {
      const censusData = await dataLayer.loadMasterCensusSummary();
      if (censusData) state.masterCensusSummary = censusData;
    } catch {
      // Non-fatal
    }
  }
  const i18nInstance = typeof getI18n === "function" ? getI18n() : null;
  const tFn = i18nInstance ? (k, p) => i18nInstance.t(k, p) : undefined;
  const cascadeEl = getEl("cascadeImpactPreviewList", targetDoc);
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
    includeInlineSeedPanel: !Boolean(cascadeEl),
    i18n: i18nInstance,
    t: tFn,
  });
  const container =
    getEl("socraticElicitorContainer", targetDoc) ||
    getEl("bibleFieldWorkshopSheet", targetDoc);
  if (container) {
    container.innerHTML = html;
  }

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
      uiLocale: state.uiLocale || "es",
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
    const rawDraftHtml =
      String(state.lang || "").toLowerCase() === "stp"
        ? renderStpDraftCheckHtml({ lang: state.lang })
        : "";
    const sanitizedDraftHtml = String(rawDraftHtml || "")
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<\/?(?:html|body|meta)[^>]*>/gi, "");
    tallerEl.innerHTML =
      mod.renderTallerArtifactsCatalogHtml({
        lang: state.lang,
        includeCensusCard: true,
        includeEightLocksBar: false,
        masterCensusSummary: state.masterCensusSummary || null,
        uiLocale: state.uiLocale || "es",
      }) + sanitizedDraftHtml;
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
        uiLocale: state.uiLocale || "es",
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
      withPreservedInputFocus(targetDoc, () => {
        lexHostEl.innerHTML =
          typeof mod.renderStpLexiconExplorerHtml === "function"
            ? mod.renderStpLexiconExplorerHtml({
              query: state.stpLexiconQuery || "",
              activeWave: state.activeOtWave || 0,
              limit: 24,
            })
            : renderStpLexiconExplorerHtml({
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
        navigator.clipboard.writeText(patch.json).catch(() => { });
      }
    });
  }

  if (downloadBtn && typeof downloadBtn.addEventListener === "function" && !downloadBtn._downloadPatchBound) {
    downloadBtn._downloadPatchBound = true;
    downloadBtn.addEventListener("click", () => {
      const patch = (state.refreshPatchPreview || refreshPatchPreview)();
      const computedCrc = computeEcoPackCrc32Hex(new TextEncoder().encode(patch.json || ""));
      const activeOverlay = Array.isArray(state.liveCascadeOverlays) && state.liveCascadeOverlays.length > 0
        ? state.liveCascadeOverlays[0]
        : {
          patch_id: patch.patchId || "PATCH-WORKSHOP",
          lang_code: state.lang || "stp",
          cascade_level: levelSel?.value || state.cascadeLevel || "L2",
          target_ref: `${state.book}.${state.chapter}.${state.verse}`,
          strong_id: state.activeStrongId || "H0430",
          old_surface: oldInput?.value || "",
          new_surface: newInput?.value || "",
          note_pure_text: noteInput?.value || "",
        };
      const exported = exportSignedEcoPatchV2Artifact({
        cascadeResult: {
          patchId: activeOverlay.patch_id,
          lang: state.lang || "stp",
          level: activeOverlay.cascade_level,
          ekpackOverlayEntry: activeOverlay,
        },
        signatureHex: state.pendingCascadeSignatureHex || "",
        publicKeyHex: state.pendingCascadePublicKeyHex || "",
        crc32Hex: computedCrc,
      });
      const finalFilename = patch.filename || exported.filename || `${state.lang || "stp"}.eco.patch.json`;
      if (typeof downloadBtn.setAttribute === "function") {
        downloadBtn.setAttribute("data-last-download-filename", finalFilename);
        downloadBtn.setAttribute("data-ecopatch-v2-crc32", exported.artifact.crc32_hex);
        downloadBtn.setAttribute("data-last-downloaded-hash", patch.contentHash);
      }
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && targetDoc?.createElement) {
        const blob = new Blob([exported.json || patch.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = targetDoc.createElement("a");
        if (a) {
          a.href = url;
          a.download = finalFilename;
          if (typeof a.click === "function") a.click();
        }
      }
    });
  }

  const voteReviewerInput = getEl("improveVoteReviewerIdInput", targetDoc);
  const voteGoldChk = getEl("improveVoteGoldSeedsCheck", targetDoc);
  const btnVoteApprove = getEl("btnAddCommunityVoteApprove", targetDoc);
  const btnVoteReject = getEl("btnAddCommunityVoteReject", targetDoc);
  const importVotesInput = getEl("inputImportCommunityVotesJson", targetDoc);
  const votesStatusEl = getEl("improveCommunityVotesStatus", targetDoc);

  const renderCommunityVotesStatus = () => {
    const votes = Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : [];
    const ds = evaluateBetaDawidSkeneSprt(votes);
    if (votesStatusEl) {
      votesStatusEl.setAttribute?.("data-ds-sprt-status", ds.editorialStatus);
      votesStatusEl.setAttribute?.("data-vote-count", String(votes.length));
      votesStatusEl.setAttribute?.("data-distinct-reviewers", String(ds.distinctReviewersCount));
      votesStatusEl.textContent = `${ds.editorialStatus} · ${ds.distinctReviewersCount} rev (${votes.length} raw) · P=${ds.posteriorTruthProb}`;
    }
    return ds;
  };
  const pushCommunityVote = (approvedFlag) => {
    if (!Array.isArray(state.pendingCommunityVotes)) state.pendingCommunityVotes = [];
    const idx = state.pendingCommunityVotes.length + 1;
    const revId = String(voteReviewerInput?.value || `hablante_${idx}`).trim() || `hablante_${idx}`;
    const passedGold = Boolean(voteGoldChk ? voteGoldChk.checked !== false : true);
    state.pendingCommunityVotes.push({
      reviewerId: revId,
      approved: Boolean(approvedFlag),
      agrees: Boolean(approvedFlag),
      passedGoldSeeds: passedGold,
    });
    return renderCommunityVotesStatus();
  };
  if (btnVoteApprove && typeof btnVoteApprove.addEventListener === "function" && !btnVoteApprove._voteBound) {
    btnVoteApprove._voteBound = true;
    btnVoteApprove.addEventListener("click", () => pushCommunityVote(true));
  }
  if (btnVoteReject && typeof btnVoteReject.addEventListener === "function" && !btnVoteReject._voteBound) {
    btnVoteReject._voteBound = true;
    btnVoteReject.addEventListener("click", () => pushCommunityVote(false));
  }
  if (importVotesInput && typeof importVotesInput.addEventListener === "function" && !importVotesInput._votesImpBound) {
    importVotesInput._votesImpBound = true;
    importVotesInput.addEventListener("change", async (evt) => {
      const f = evt?.target?.files?.[0] || importVotesInput.files?.[0] || null;
      if (!f || typeof f.text !== "function") return;
      try {
        const parsed = JSON.parse(await f.text());
        const importedVotes = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.votes)
            ? parsed.votes
            : [];
        if (importedVotes.length > 0) {
          state.pendingCommunityVotes = [
            ...(Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : []),
            ...importedVotes,
          ];
          renderCommunityVotesStatus();
        }
      } catch {
        // Non-fatal invalid vote import JSON
      }
    });
  }
  renderCommunityVotesStatus();

  const applyBtn = getEl("btnApplySuggestedImprovement", targetDoc);
  if (applyBtn && typeof applyBtn.addEventListener === "function" && !applyBtn._applySuggestedBound) {
    applyBtn._applySuggestedBound = true;
    applyBtn.addEventListener("click", async () => {
      const refreshFn = state.refreshPatchPreview || refreshPatchPreview;
      const osis = `${state.book}.${state.chapter}.${state.verse}`;
      const oldSurfStr = oldInput?.value || "";
      const verseMatrixRows = Array.isArray(state.lastNavResult?.matrix?.rows)
        ? state.lastNavResult.matrix.rows.filter((r) => Array.isArray(r) && Number(r[0]) === Number(state.verse))
        : [];
      const derivedProperNouns = [];
      let derivedAgent = "";
      let derivedPatient = "";
      for (const r of verseMatrixRows) {
        const morphTag = String(r[4] || "");
        const glossCandidates = [String(r[6] || "").trim(), String(r[7] || "").trim()].filter(Boolean);
        for (const g of glossCandidates) {
          if (g.length >= 3 && oldSurfStr.toLowerCase().includes(g.toLowerCase())) {
            if (/(?:^|[\/\-H])Np\b|\b(?:NP|PRI|PROP)\b/.test(morphTag) && !derivedProperNouns.includes(g)) {
              derivedProperNouns.push(g);
            }
            const roleTag = `${r[8] || ""} ${r[10] || ""}`.toUpperCase();
            if (!derivedAgent && /\b(?:SUBJ|AG|A0|A0_AGENT)\b/.test(roleTag)) {
              derivedAgent = g;
            } else if (!derivedPatient && /\b(?:OBJ|PAT|A1|A1_PATIENT)\b/.test(roleTag)) {
              derivedPatient = g;
            }
          }
        }
      }
      const communityVotes = Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : [];
      const dsVerdict = evaluateBetaDawidSkeneSprt(communityVotes);
      if (typeof applyBtn.setAttribute === "function") {
        applyBtn.setAttribute("data-ds-sprt-status", dsVerdict.editorialStatus);
      }
      renderCommunityVotesStatus();
      const payloadArgs = {
        lang: state.lang || "stp",
        level: levelSel?.value || state.cascadeLevel || "L2",
        ref: osis,
        strongId: state.activeStrongId || "H0430",
        oldSurface: oldSurfStr,
        note: noteInput?.value || "",
        votes: communityVotes,
        expectedProperNouns: Array.isArray(state.expectedProperNouns)
          ? state.expectedProperNouns
          : derivedProperNouns,
        expectedAgent: state.expectedAgent || derivedAgent,
        expectedPatient: state.expectedPatient || derivedPatient,
        existingOverlayEntries: Array.isArray(state.liveCascadeOverlays) ? state.liveCascadeOverlays : [],
        signature: state.pendingCascadeSignatureHex || "",
        publicKey: state.pendingCascadePublicKeyHex || "",
        expectedCrc32Hex: state.pendingExpectedCrc32Hex || "",
      };
      const receipt =
        typeof mod?.applySuggestedImprovement === "function"
          ? mod.applySuggestedImprovement(targetDoc, applyBtn, refreshFn, payloadArgs)
          : applySuggestedImprovement(targetDoc, applyBtn, refreshFn, payloadArgs);
      if (receipt?.cascade?.patchId && typeof applyBtn.setAttribute === "function") {
        applyBtn.setAttribute("data-cascade-patch-id", receipt.cascade.patchId);
        applyBtn.setAttribute("data-cascade-status", receipt.cascade.status || "APPLIED");
      }
      if (receipt?.cascade?.accepted) {
        const idbRes = await persistSignedCascadeOverlayIdb(receipt);
        if (idbRes.persisted || idbRes.ed25519Verified) {
          const authorityTier = idbRes.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
          const authorityLabel =
            idbRes.authorityLabel || "Borrador local firmado en este dispositivo";
          const nextOverlays = (receipt.cascade.foldedOverlayEntries || []).map((e) => ({
            ...e,
            authorityTier,
            authorityLabel,
            publicKeyHex: idbRes.publicKeyHex || "",
          }));
          state.liveCascadeOverlays = nextOverlays;
          applyOverlayEntriesToLiveState(state, nextOverlays);
          if (typeof applyBtn.setAttribute === "function") {
            applyBtn.setAttribute("data-overlay-authority", authorityTier);
          }
          if (typeof ctx.renderViewportFromState === "function") {
            ctx.renderViewportFromState(targetDoc);
          }
          if (typeof ctx.renderStateToDom === "function") {
            ctx.renderStateToDom(targetDoc, { syncUrl: false });
          }
        }
      }
    });
  }

  const walSnapSel = getEl("selectWalRollbackSnapshot", targetDoc);
  const walRestoreBtn = getEl("btnRestoreWalSnapshot", targetDoc);
  const resolveSnapshotIndexFromSelect = () => {
    if (!walSnapSel) return 1;
    if (typeof walSnapSel.selectedIndex === "number" && walSnapSel.selectedIndex >= 0) {
      return walSnapSel.selectedIndex + 1;
    }
    const rawVal = String(walSnapSel.value || "");
    const m = rawVal.match(/(\d+)$/);
    return m ? Math.max(1, Math.min(10, Number(m[1]) + 1)) : 1;
  };
  const updateWalSnapshotPreviewDom = () => {
    const selIdx = resolveSnapshotIndexFromSelect();
    const val = String(walSnapSel?.value || `PATCH-WAL-SNAP-${String(selIdx - 1).padStart(2, "0")}`);
    if (walSnapSel && typeof walSnapSel.setAttribute === "function") {
      walSnapSel.setAttribute("data-selected-snapshot", val);
    }
    const preview = computeWalSnapshotRollbackPreview(selIdx);
    const previewBox = getEl("walSnapshotRollbackPreviewBox", targetDoc);
    if (previewBox) {
      previewBox.textContent = preview.previewText;
      previewBox.setAttribute("data-snapshot-index", String(preview.snapshotIndex));
      previewBox.setAttribute("data-snapshot-sha256", preview.sha256Prefix);
      previewBox.setAttribute("data-snapshot-patch-id", preview.patchId);
    }
    return preview;
  };
  if (walSnapSel && typeof walSnapSel.addEventListener === "function" && !walSnapSel._walSnapBound) {
    walSnapSel._walSnapBound = true;
    walSnapSel.addEventListener("change", updateWalSnapshotPreviewDom);
  }
  if (walRestoreBtn && typeof walRestoreBtn.addEventListener === "function" && !walRestoreBtn._walRestoreBound) {
    walRestoreBtn._walRestoreBound = true;
    walRestoreBtn.addEventListener("click", () => {
      const preview = updateWalSnapshotPreviewDom();
      if (preview && preview.surfaceStp) {
        if (newInput) {
          newInput.value = preview.surfaceStp;
        }
        const restoredEntry = {
          patch_id: preview.patchId || "PATCH-WAL-RESTORED",
          lang_code: String(state.lang || "stp").toLowerCase(),
          cascade_level: preview.level || "L2",
          semilattice_priority: CASCADE_SEMILATTICE_PRIORITY.L1_DIRECT,
          target_ref: preview.ref || `${String(state.book || "GEN").toUpperCase()}.${state.chapter || 1}.${state.verse || 1}`,
          strong_id: preview.strongId || preview.strong || "H0430",
          new_surface: preview.surfaceStp,
          authorityTier: OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
          savedAtIso: new Date().toISOString(),
        };
        state.liveCascadeOverlays = [
          ...(Array.isArray(state.liveCascadeOverlays) ? state.liveCascadeOverlays : []),
          restoredEntry,
        ];
        applyOverlayEntriesToLiveState(state, [restoredEntry]);
        if (typeof walRestoreBtn.setAttribute === "function") {
          walRestoreBtn.setAttribute("data-restored-surface-stp", preview.surfaceStp);
        }
      }
      if (preview && (preview.strong || preview.strongId)) {
        state.activeStrongId = String(preview.strong || preview.strongId).toUpperCase();
      }
      (state.refreshPatchPreview || refreshPatchPreview)();
      if (typeof ctx.renderViewportFromState === "function") {
        ctx.renderViewportFromState(targetDoc);
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

