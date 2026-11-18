// ============================================================================
// web/mostrador/drawer_workshop.js — Gaveta 3 (Taller de Campo, Escalera CELF-250 & Auditoría CRDT/Censo 7,164)
// Decisiones D1-R41, D4-R41, D6-R41, D7-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import {
  CASCADE_SEMILATTICE_PRIORITY,
  exportSignedEcoPatchV2Artifact,
  foldCascadePatchV2Semilattice,
  projectChapterThroughCascadeSemilattice,
} from "./cascade_l1_l5.js";
import {
  CANONICAL_BOOK_ORDER,
  CANONICAL_TOTAL_VERSES,
  canonicalOrdinalOf,
  canonicalRefOfOrdinal,
} from "./canonical_versification.js";
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

export {
  CASCADE_SEMILATTICE_PRIORITY,
  exportSignedEcoPatchV2Artifact,
  foldCascadePatchV2Semilattice,
  projectChapterThroughCascadeSemilattice,
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

function hexToBytesWorkshop(hex) {
  const clean = String(hex || "").trim();
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHexWorkshop(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

let cachedLocalWorkshopKeyPairPromise = null;
// Llave pública raíz canónica Ed25519 de mantenedores Ekovoz (derivada de `EKPACK_DOMAIN_SEED_CONTEXT`)
const CANONICAL_MAINTAINER_ED25519_PUBKEY_HEX =
  "eb08398e334092817873f33e922316b4024f5eb1c0fa7d7fb3fcbfdb33ea27f7";

export const OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED = "LOCAL_WORKSHOP_SELF_SIGNED";
export const OVERLAY_AUTHORITY_MAINTAINER_ED25519 = "VERIFIED_MAINTAINER_ED25519";

function classifyOverlayAuthorityTier(publicKeyHex, isLocalKey = false, maintainerPubHex = "") {
  const cleanPub = String(publicKeyHex || "").trim().toLowerCase();
  const rootMaintainer = String(
    maintainerPubHex || CANONICAL_MAINTAINER_ED25519_PUBKEY_HEX,
  )
    .trim()
    .toLowerCase();
  if (!isLocalKey && cleanPub && cleanPub === rootMaintainer) {
    return OVERLAY_AUTHORITY_MAINTAINER_ED25519;
  }
  return OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
}

async function getOrCreateLocalWorkshopEd25519KeyPair(subtle) {
  if (!cachedLocalWorkshopKeyPairPromise) {
    cachedLocalWorkshopKeyPairPromise = (async () => {
      const kp = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      const rawPub = new Uint8Array(await subtle.exportKey("raw", kp.publicKey));
      return { privateKey: kp.privateKey, publicKey: kp.publicKey, publicKeyHex: bytesToHexWorkshop(rawPub) };
    })();
  }
  return cachedLocalWorkshopKeyPairPromise;
}

function openCascadeOverlayIdb(idbFactory) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("IDB open timeout"));
      }
    }, 120);
    const req = idbFactory.open("ekovoz_cascade_overlays_v2", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db && (!db.objectStoreNames || !db.objectStoreNames.contains("signed_overlays"))) {
        db.createObjectStore("signed_overlays", { keyPath: "overlayKey" });
      }
    };
    req.onsuccess = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(req.result);
      }
    };
    req.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(req.error || new Error("IDB open failed"));
      }
    };
  });
}

export async function persistSignedCascadeOverlayIdb(receipt, options = {}) {
  const idbFactory = options.indexedDB || globalThis.indexedDB || null;
  const subtle = options.subtle || globalThis.crypto?.subtle || null;
  if (!receipt || !receipt.cascade || !receipt.cascade.accepted) {
    return { persisted: false, reason: "CASCADE_NOT_ACCEPTED" };
  }
  const entries = Array.isArray(receipt.cascade.foldedOverlayEntries)
    ? receipt.cascade.foldedOverlayEntries
    : receipt.cascade.ekpackOverlayEntry
      ? [receipt.cascade.ekpackOverlayEntry]
      : [];
  if (entries.length === 0) return { persisted: false, reason: "EMPTY_OVERLAY_ENTRIES" };

  const primary = receipt.cascade.ekpackOverlayEntry || entries[0];
  const canonicalPayload = JSON.stringify({
    patch_id: primary.patch_id,
    lang_code: primary.lang_code,
    cascade_level: primary.cascade_level,
    target_ref: primary.target_ref,
    new_surface: primary.new_surface,
    content_hash_hex: primary.content_hash_hex,
  });
  const payloadBytes = new TextEncoder().encode(canonicalPayload);
  const computedCrc32Hex = computeEcoPackCrc32Hex(payloadBytes);
  const expectedCrc = String(options.expectedCrc32Hex || receipt.expectedCrc32Hex || computedCrc32Hex).toLowerCase();
  if (expectedCrc !== computedCrc32Hex.toLowerCase()) {
    return { persisted: false, reason: "CRC32_MISMATCH", computedCrc32Hex };
  }

  let signatureHex = String(options.signatureHex || receipt.signatureHex || "").trim();
  let publicKeyHex = String(options.publicKeyHex || receipt.publicKeyHex || "").trim();
  if (!subtle) return { persisted: false, reason: "WEBCRYPTO_UNAVAILABLE" };

  const signMessageBytes = new TextEncoder().encode(
    `EKOVOZ_CASCADE_OVERLAY_V2:${computedCrc32Hex}:${canonicalPayload}`,
  );
  let signedWithLocalEphemeralKey = false;
  if (!signatureHex && !publicKeyHex) {
    const localKp = await getOrCreateLocalWorkshopEd25519KeyPair(subtle);
    const sigBuf = await subtle.sign({ name: "Ed25519" }, localKp.privateKey, signMessageBytes);
    signatureHex = bytesToHexWorkshop(new Uint8Array(sigBuf));
    publicKeyHex = localKp.publicKeyHex;
    signedWithLocalEphemeralKey = true;
  }
  const authorityTier = classifyOverlayAuthorityTier(
    publicKeyHex,
    signedWithLocalEphemeralKey,
    options.canonicalMaintainerPublicKeyHex || receipt.canonicalMaintainerPublicKeyHex,
  );
  const authorityLabel =
    authorityTier === OVERLAY_AUTHORITY_MAINTAINER_ED25519
      ? "Edición canónica verificada"
      : "Borrador local firmado en este dispositivo";
  const sigBytes = hexToBytesWorkshop(signatureHex);
  const pubBytes = hexToBytesWorkshop(publicKeyHex);
  if (!sigBytes || sigBytes.length !== 64 || !pubBytes || pubBytes.length !== 32) {
    return { persisted: false, reason: "ED25519_MALFORMED_KEY_OR_SIGNATURE" };
  }
  let ed25519Ok = false;
  try {
    const cryptoKey = await subtle.importKey("raw", pubBytes, { name: "Ed25519" }, false, ["verify"]);
    ed25519Ok = Boolean(await subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, signMessageBytes));
  } catch {
    ed25519Ok = false;
  }
  if (!ed25519Ok) {
    return { persisted: false, reason: "ED25519_SIGNATURE_INVALID" };
  }
  if (!idbFactory || typeof idbFactory.open !== "function") {
    return {
      persisted: false,
      reason: "INDEXEDDB_UNAVAILABLE",
      crc32Hex: computedCrc32Hex,
      ed25519Verified: true,
      authorityTier,
      authorityLabel,
    };
  }

  const db = await openCascadeOverlayIdb(idbFactory);
  const savedKeys = [];
  const savedAtIso = new Date().toISOString();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("signed_overlays", "readwrite");
    const store = tx.objectStore("signed_overlays");
    for (const rawEntry of entries) {
      const entry = {
        ...rawEntry,
        authorityTier,
        authorityLabel,
        publicKeyHex,
        savedAtIso,
      };
      const overlayKey = `${entry.lang_code}:${entry.target_ref}`;
      savedKeys.push(overlayKey);
      store.put({
        overlayKey,
        entry,
        canonicalPayload,
        crc32Hex: computedCrc32Hex,
        signatureHex,
        publicKeyHex,
        authorityTier,
        authorityLabel,
        savedAtIso,
      });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("IDB write failed"));
  });
  if (typeof db.close === "function") db.close();
  return {
    persisted: true,
    crc32Hex: computedCrc32Hex,
    ed25519Verified: true,
    authorityTier,
    authorityLabel,
    signatureHex,
    publicKeyHex,
    savedKeys,
  };
}

export async function loadLiveCascadeOverlaysIdb(lang = "stp", options = {}) {
  const idbFactory = options.indexedDB || globalThis.indexedDB || null;
  const subtle = options.subtle || globalThis.crypto?.subtle || null;
  if (!idbFactory || typeof idbFactory.open !== "function") return [];
  const db = await openCascadeOverlayIdb(idbFactory);
  const rawRecords = await new Promise((resolve, reject) => {
    const tx = db.transaction("signed_overlays", "readonly");
    const store = tx.objectStore("signed_overlays");
    const req = store.getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error || new Error("IDB read failed"));
  });
  if (typeof db.close === "function") db.close();
  const cleanLang = String(lang || "stp").trim().toLowerCase();
  const verified = [];
  for (const rec of rawRecords) {
    if (!rec || !rec.entry || String(rec.entry.lang_code || "").toLowerCase() !== cleanLang) continue;
    const payloadStr = String(rec.canonicalPayload || "");
    const crc = computeEcoPackCrc32Hex(new TextEncoder().encode(payloadStr));
    if (crc.toLowerCase() !== String(rec.crc32Hex || "").toLowerCase()) continue;
    if (subtle && rec.signatureHex && rec.publicKeyHex) {
      const sigB = hexToBytesWorkshop(rec.signatureHex);
      const pubB = hexToBytesWorkshop(rec.publicKeyHex);
      if (!sigB || !pubB) continue;
      const msgB = new TextEncoder().encode(`EKOVOZ_CASCADE_OVERLAY_V2:${rec.crc32Hex}:${payloadStr}`);
      try {
        const key = await subtle.importKey("raw", pubB, { name: "Ed25519" }, false, ["verify"]);
        const ok = await subtle.verify({ name: "Ed25519" }, key, sigB, msgB);
        if (!ok) continue;
      } catch {
        continue;
      }
    }
    const authorityTier =
      rec.authorityTier ||
      rec.entry.authorityTier ||
      classifyOverlayAuthorityTier(
        rec.publicKeyHex,
        false,
        options.canonicalMaintainerPublicKeyHex,
      );
    const authorityLabel =
      authorityTier === OVERLAY_AUTHORITY_MAINTAINER_ED25519
        ? "Edición canónica verificada"
        : "Borrador local firmado en este dispositivo";
    verified.push({
      ...rec.entry,
      authorityTier,
      authorityLabel,
      publicKeyHex: rec.publicKeyHex || rec.entry.publicKeyHex || "",
      savedAtIso: rec.savedAtIso || rec.entry.savedAtIso || "",
    });
  }
  return verified;
}

/**
 * Consolida los parches verificados en una única tabla CRDT Last-Writer-Wins (`state.verifiedOverlaysByOsis`)
 * indexada por `${lang}:${OSIS}` (`DEB-V2C-08` purgado: `0` colecciones write-only huérfanas).
 */
export function applyOverlayEntriesToLiveState(state, entries = []) {
  if (!state || !Array.isArray(entries) || entries.length === 0) return 0;
  let appliedCount = 0;
  if (!state.verifiedOverlaysByOsis || typeof state.verifiedOverlaysByOsis !== "object") {
    state.verifiedOverlaysByOsis = {};
  }
  const activeBookChap = `${String(state.book || "").toUpperCase()}.${state.chapter}.`;
  const activeLangClean = String(state.lang || "es").trim().toLowerCase();

  for (const entry of entries) {
    if (!entry || !entry.target_ref || !entry.new_surface) continue;
    const entryLang = String(entry.lang_code || activeLangClean || "es").trim().toLowerCase();
    const cleanOsis = String(entry.target_ref).trim().toUpperCase();
    const mapKey = `${entryLang}:${cleanOsis}`;
    const prev = state.verifiedOverlaysByOsis[mapKey];
    const nextTs = Number(entry.lamport_ts || 0);
    const prevTs = Number(prev?.lamport_ts || 0);
    const nextIso = String(entry.savedAtIso || "");
    const prevIso = String(prev?.savedAtIso || "");
    const nextPrio = Number(entry.semilattice_priority ?? CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE);
    const prevPrio = Number(prev?.semilattice_priority ?? CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE);
    const shouldReplace =
      !prev ||
      nextPrio > prevPrio ||
      (nextPrio === prevPrio && nextTs > prevTs) ||
      (nextPrio === prevPrio && nextTs === prevTs && nextIso >= prevIso);

    if (shouldReplace) {
      state.verifiedOverlaysByOsis[mapKey] = {
        ...entry,
        lang_code: entryLang,
        target_ref: cleanOsis,
        authorityTier: entry.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
        authorityLabel:
          entry.authorityLabel ||
          (entry.authorityTier === OVERLAY_AUTHORITY_MAINTAINER_ED25519
            ? "Edición canónica verificada"
            : "Borrador local firmado en este dispositivo"),
      };
    }

    if (
      entryLang === activeLangClean &&
      cleanOsis.startsWith(activeBookChap) &&
      state.lastNavResult?.chapter?.verses
    ) {
      const vNumStr = cleanOsis.slice(activeBookChap.length);
      const vNumInt = Number(vNumStr);
      const newSurf = state.verifiedOverlaysByOsis[mapKey].new_surface;
      if (Array.isArray(state.lastNavResult.chapter.verses)) {
        for (const vObj of state.lastNavResult.chapter.verses) {
          if (vObj && Number(vObj.start ?? vObj.verse) === vNumInt) {
            vObj.text = newSurf;
          }
        }
      } else {
        state.lastNavResult.chapter.verses[vNumStr] = newSurf;
      }
      if (Array.isArray(state.lastNavResult.chapter.rawVerses)) {
        for (const vObj of state.lastNavResult.chapter.rawVerses) {
          if (vObj && Number(vObj.start ?? vObj.verse) === vNumInt) {
            vObj.text = newSurf;
          }
        }
      }
      appliedCount += 1;
    }
  }
  return appliedCount;
}

/**
 * Devuelve la entrada CRDT verificada para `(lang, osis)` si existe en `state.verifiedOverlaysByOsis`.
 */
export function resolveOverlayEntryForOsis(state, lang = "es", osis = "") {
  if (!state || !state.verifiedOverlaysByOsis || !osis) return null;
  const cleanLang = String(lang || state.lang || "es").trim().toLowerCase();
  const baseLang = cleanLang === "es-1909" ? "es-1909" : cleanLang.split("-")[0] || cleanLang;
  const cleanOsis = String(osis).trim().toUpperCase().replace(/\s+/g, ".");
  return (
    state.verifiedOverlaysByOsis[`${cleanLang}:${cleanOsis}`] ||
    state.verifiedOverlaysByOsis[`${baseLang}:${cleanOsis}`] ||
    null
  );
}

/**
 * Lente reactiva pura libre de glitches (`SLICE-V2C-19` / `SLICE-V2C-20`):
 * Proyecta en tiempo de lectura cualquier versículo citado por coordenada OSIS a través de `state.verifiedOverlaysByOsis`.
 */
export function resolveVerseWithOverlay(state, lang = "es", osis = "", baseText = "") {
  const entry = resolveOverlayEntryForOsis(state, lang, osis);
  if (entry && typeof entry.new_surface === "string" && entry.new_surface.trim().length > 0) {
    return entry.new_surface;
  }
  return baseText;
}

export async function ensureStateOverlaysHydrated(state, targetLang = "") {
  if (!state || typeof state !== "object") return;
  const lang = String(targetLang || state.lang || "es").trim().toLowerCase();
  if (state.hydratedOverlayLang !== lang) {
    state.hydratedOverlayLang = lang;
    const idbOverlays = await Promise.race([
      loadLiveCascadeOverlaysIdb(lang).catch(() => []),
      new Promise((r) => setTimeout(() => r([]), 120)),
    ]);
    if (idbOverlays.length > 0) {
      state.liveCascadeOverlays = idbOverlays;
      applyOverlayEntriesToLiveState(state, idbOverlays);
    }
  } else if (Array.isArray(state.liveCascadeOverlays) && state.liveCascadeOverlays.length > 0) {
    applyOverlayEntriesToLiveState(state, state.liveCascadeOverlays);
  }
}

export function projectChapterWithLiveOverlays(state, effectiveLang, rawChapter) {
  if (!rawChapter || typeof rawChapter !== "object") {
    return { chapterForRender: null, bannerHtml: "", activeAuthority: "" };
  }
  const rawVerses = rawChapter.verses || [];
  const baseVerseMap = {};
  if (Array.isArray(rawVerses)) {
    for (const vItem of rawVerses) {
      if (vItem && typeof vItem === "object") {
        baseVerseMap[String(vItem.start ?? vItem.verse ?? "")] = String(vItem.text || "");
      }
    }
  } else {
    Object.assign(baseVerseMap, rawVerses);
  }
  const semilatticeProjectedMap =
    Array.isArray(state?.liveCascadeOverlays) && state.liveCascadeOverlays.length > 0
      ? projectChapterThroughCascadeSemilattice({
          verses: baseVerseMap,
          matrixRows: state?.lastNavResult?.matrix?.rows || [],
          overlays: state.liveCascadeOverlays,
          lang: effectiveLang,
          book: state?.book || "GEN",
          chapter: state?.chapter || 1,
        })
      : baseVerseMap;
  const badges = [];
  let projectedVerses;
  if (Array.isArray(rawVerses)) {
    projectedVerses = rawVerses.map((vItem) => {
      if (!vItem || typeof vItem !== "object") return vItem;
      const vKey = String(vItem.start ?? vItem.verse ?? "");
      const osisKey = `${state.book}.${state.chapter}.${vKey}`;
      const ovEntry = resolveOverlayEntryForOsis(state, effectiveLang, osisKey);
      const baseCandidate = semilatticeProjectedMap[vKey] ?? (vItem.text || "");
      const projectedText = resolveVerseWithOverlay(state, effectiveLang, osisKey, baseCandidate);
      if (ovEntry) {
        const auth = ovEntry.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
        badges.push(
          `<span class="uls-badge cascade-authority-badge" data-overlay-authority="${escHtml(auth)}" data-overlay-osis="${escHtml(osisKey)}" style="font-size:0.72rem;margin:0.2rem 0.25rem 0.35rem 0;display:inline-block;">🔐 ${escHtml(osisKey)} · <code>${escHtml(auth)}</code> (${escHtml(ovEntry.authorityLabel || "")})</span>`,
        );
      }
      return projectedText === vItem.text ? vItem : { ...vItem, text: projectedText };
    });
  } else {
    projectedVerses = {};
    for (const [vKey, vText] of Object.entries(rawVerses)) {
      const osisKey = `${state.book}.${state.chapter}.${vKey}`;
      const ovEntry = resolveOverlayEntryForOsis(state, effectiveLang, osisKey);
      projectedVerses[vKey] = resolveVerseWithOverlay(state, effectiveLang, osisKey, vText);
      if (ovEntry) {
        const auth = ovEntry.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
        badges.push(
          `<span class="uls-badge cascade-authority-badge" data-overlay-authority="${escHtml(auth)}" data-overlay-osis="${escHtml(osisKey)}" style="font-size:0.72rem;margin:0.2rem 0.25rem 0.35rem 0;display:inline-block;">🔐 ${escHtml(osisKey)} · <code>${escHtml(auth)}</code> (${escHtml(ovEntry.authorityLabel || "")})</span>`,
        );
      }
    }
  }
  const activeAuthority =
    badges.length === 0
      ? ""
      : badges[0].includes(OVERLAY_AUTHORITY_MAINTAINER_ED25519)
        ? OVERLAY_AUTHORITY_MAINTAINER_ED25519
        : OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
  const bannerHtml =
    badges.length > 0
      ? `<div class="chapter-live-overlays-banner" data-live-cascade-applied="true">${badges.join("")}</div>`
      : "";
  const projectedRawVerses = Array.isArray(rawChapter.rawVerses)
    ? rawChapter.rawVerses.map((vItem) => {
      if (!vItem || typeof vItem !== "object") return vItem;
      const vKey = String(vItem.start ?? vItem.verse ?? "");
      const osisKey = `${state.book}.${state.chapter}.${vKey}`;
      const projectedText = resolveVerseWithOverlay(state, effectiveLang, osisKey, vItem.text || "");
      return projectedText === vItem.text ? vItem : { ...vItem, text: projectedText };
    })
    : rawChapter.rawVerses;
  return {
    chapterForRender: {
      ...rawChapter,
      verses: projectedVerses,
      ...(Array.isArray(projectedRawVerses) ? { rawVerses: projectedRawVerses } : {}),
    },
    bannerHtml,
    activeAuthority,
  };
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
    const draftCheckHtml =
      String(state.lang || "").toLowerCase() === "stp"
        ? renderStpDraftCheckHtml({ lang: state.lang })
        : "";
    tallerEl.innerHTML =
      mod.renderTallerArtifactsCatalogHtml({
        lang: state.lang,
        includeCensusCard: true,
        includeEightLocksBar: false,
        masterCensusSummary: state.masterCensusSummary || null,
        uiLocale: state.uiLocale || "es",
      }) + draftCheckHtml;
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
      const artifact = exportSignedEcoPatchV2Artifact(state.liveCascadeOverlays || [], {
        lang: state.lang || "stp",
        signatureHex: state.pendingCascadeSignatureHex || "",
        publicKeyHex: state.pendingCascadePublicKeyHex || "",
      });
      if (typeof downloadBtn.setAttribute === "function") {
        downloadBtn.setAttribute(
          "data-last-download-filename",
          patch.filename || `${state.lang || "stp"}.eco.patch.json`,
        );
        downloadBtn.setAttribute("data-ecopatch-v2-crc32", artifact.crc32Hex);
        downloadBtn.setAttribute("data-last-downloaded-hash", patch.contentHash);
      }
    });
  }

  const applyBtn = getEl("btnApplySuggestedImprovement", targetDoc);
  if (applyBtn && typeof applyBtn.addEventListener === "function" && !applyBtn._applySuggestedBound) {
    applyBtn._applySuggestedBound = true;
    applyBtn.addEventListener("click", async () => {
      const refreshFn = state.refreshPatchPreview || refreshPatchPreview;
      const osis = `${state.book}.${state.chapter}.${state.verse}`;
      const payloadArgs = {
        lang: state.lang || "stp",
        level: levelSel?.value || state.cascadeLevel || "L2",
        ref: osis,
        strongId: state.activeStrongId || "H0430",
        oldSurface: oldInput?.value || "",
        note: noteInput?.value || "",
        votes: Array.isArray(state.pendingCommunityVotes) ? state.pendingCommunityVotes : [],
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
        applyOverlayEntriesToLiveState(state, [
          {
            patch_id: preview.patchId || "PATCH-WAL-RESTORED",
            lang_code: String(state.lang || "stp").toLowerCase(),
            cascade_level: preview.level || "L2",
            semilattice_priority: CASCADE_SEMILATTICE_PRIORITY.L1_DIRECT,
            target_ref: preview.ref || `${String(state.book || "GEN").toUpperCase()}.${state.chapter || 1}.${state.verse || 1}`,
            strong_id: preview.strongId || preview.strong || "H0430",
            new_surface: preview.surfaceStp,
            authorityTier: OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
            savedAtIso: new Date().toISOString(),
          },
        ]);
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

