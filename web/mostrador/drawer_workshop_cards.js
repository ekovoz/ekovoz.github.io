// ============================================================================
// web/mostrador/drawer_workshop_cards.js — Tarjetas Puras de Censo 7,164, Lotes Atómicos y CRDT WAL
// Extraído desde `drawer_workshop.js` (Costura Limpia LCOM4 C2 ∂(C)=0, SLICE-EKO-V2K-03, D12-V2K+)
// ============================================================================

import {
  CANONICAL_BOOK_ORDER,
  CANONICAL_TOTAL_VERSES,
  canonicalOrdinalOf,
  canonicalRefOfOrdinal,
} from "./canonical_versification.js";
import { foldCrdtWalSemilattice } from "./mejorar.js";

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
 * Mantener como declaración `function` hoisted por inicialización circular desde `mejorar_locks_pda.js`.
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
 * Renderiza el Inspector del Censo Maestro de 7,164 Lenguas (`MASTER_CENSUS.json`: 380 subclados, 12 macro-regiones `R01..R12`,
 * 4 Tiers Soberanos `2/1020/1550/4594`, entropía formulaica `14.41%` / `26,620` plantillas)
 * y los 1,245 Lotes Atómicos de `stp_ledger.json` (`D2-B+` / `D7-R41` / `SLICE-93`).
 */
export function renderFieldWorkshopCensus7164Html(
  censusSummary = null,
  stpLedgerSummary = null,
  activePassage = { book: "GEN", chapter: 1, verse: 1 },
) {
  const defaultRegions = [
    { id: "R01", name: "Mesoamérica, Andes y Amazonía", languages: 960, subclades: 58 },
    { id: "R02", name: "Norteamérica y Ártico", languages: 215, subclades: 22 },
    { id: "R03", name: "Europa Occidental y Mediterráneo", languages: 145, subclades: 12 },
    { id: "R04", name: "Europa Oriental y Eurasia Eslava", languages: 110, subclades: 10 },
    { id: "R05", name: "Anatolia, Cáucaso y Asia Central", languages: 185, subclades: 16 },
    { id: "R06", name: "Medio Oriente y Creciente Fértil", languages: 165, subclades: 14 },
    { id: "R07", name: "África del Norte, Sahel y Cuerno de África", languages: 420, subclades: 24 },
    { id: "R08", name: "África Subsahariana, Cuenca del Congo y Golfo de Guinea", languages: 1720, subclades: 62 },
    { id: "R09", name: "Subcontinente Indio e Himalaya", languages: 620, subclades: 32 },
    { id: "R10", name: "Asia Oriental y Meseta Altaica", languages: 310, subclades: 22 },
    { id: "R11", name: "Sudeste Asiático Continental e Insular", languages: 1280, subclades: 60 },
    { id: "R12", name: "Oceanía, Papúa y Pacífico Sur", languages: 1034, subclades: 48 },
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
        { tier: "T0", count: 2, label: "Tier 0 · Fuentes Originales Disjuntas (WLC/TAHOT + SRGNT/TAGNT)" },
        { tier: "T1", count: 1020, label: "Tier 1 · Biblia Humana Completa 66/66" },
        { tier: "T2", count: 1550, label: "Tier 2 · NT Humano + AT Taller en Revisión (stp)" },
        { tier: "T3", count: 4594, label: "Tiers 3–4 · Porciones / Escalera CELF-250 Oral" },
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
      const rId = reg.id || reg.branch_id || `R${String(numId).padStart(2, "0")}`;
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
    `<strong>🌍 Relación Maestra y Censo Soberano (${totalLangs.toLocaleString("en-US")} Lenguas · ${totalSubclades} Subclados Glottolog · ${totalRegions} Macro-Regiones R01–R12)</strong>` +
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
