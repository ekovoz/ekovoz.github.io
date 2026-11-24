// ============================================================================
// web/mostrador/vault_manager_panel.js — Gestor Visual de Bóveda Offline IndexedDB
// Expone espacio ocupado, los 24 .ekpack + matrix_tier0 + .ekfonts, progreso por chunks
// y controles para descargar o liberar caché individualmente (`SLICE-R2-B06`).
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  IDB_STORE_FONTS,
  IDB_STORE_PACKS,
  deleteRecordFromIndexedDb,
  estimateVaultStorageQuota,
  fetchPackWithChunkProgress,
  listRecordsFromIndexedDb,
  writeRecordToIndexedDb,
} from "./vault_indexeddb.js";

const CANONICAL_24_PACK_LANGS = Object.freeze([
  "es", "en", "stp", "he", "grc", "pt", "fr", "ar",
  "fa", "ur", "hi", "bn", "id", "ru", "zh-Hans", "de",
  "it", "ja", "ko", "sw", "tr", "arp", "bre", "cha",
]);

const EMBEDDED_DATA_PACK_LANGS = new Set([
  "en", "es", "grc", "he", "matrix_tier0", "stp",
]);

/**
 * Resuelve la URL canónica de un `.ekpack`: `data/packs/` solo para los 6 paquetes embebidos,
 * y `packs/` para los demás idiomas descargables bajo demanda (`D4-R8` / `SLICE-R8A-09`).
 */
export function resolveCanonicalVaultPackUrl(langCode, meta = null) {
  const clean = String(langCode || "").trim();
  if (meta?.sameOriginPackUrl) return String(meta.sameOriginPackUrl);
  return EMBEDDED_DATA_PACK_LANGS.has(clean)
    ? `data/packs/${clean}.ekpack`
    : `packs/${clean}.ekpack`;
}

function formatMegabytes(bytes = 0) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export function renderVaultStorageManagerHtml({
  storedPacks = [],
  storedFonts = [],
  quota = { usageBytes: 0, quotaBytes: 0, usagePct: 0, persisted: false },
  hydratedPacks = [],
  availableLangs = [],
  progressByLang = {},
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const packMap = new Map();
  for (const row of Array.isArray(storedPacks) ? storedPacks : []) {
    if (row?.lang) packMap.set(String(row.lang), row);
  }
  const mergedLangs = Array.from(
    new Set([
      ...CANONICAL_24_PACK_LANGS,
      ...(Array.isArray(availableLangs) ? availableLangs.filter(Boolean) : []),
    ]),
  );
  const packMetaMap = new Map();
  for (const m of Array.isArray(hydratedPacks) ? hydratedPacks : []) {
    if (m?.lang) packMetaMap.set(String(m.lang), m);
  }

  const totalPackBytes = Array.from(packMap.values()).reduce(
    (acc, r) => acc + (Number(r?.byteLen) || Number(r?.packBlob?.size) || 0),
    0,
  );
  const totalFontBytes = (Array.isArray(storedFonts) ? storedFonts : []).reduce(
    (acc, f) => acc + (Number(f?.byteLen) || Number(f?.fontBytes?.byteLength) || 0),
    0,
  );
  const usedBytes = Math.max(Number(quota?.usageBytes) || 0, totalPackBytes + totalFontBytes);
  const totalQuota = Number(quota?.quotaBytes) || 0;
  const pct = totalQuota > 0 ? Math.min(100, Math.round((usedBytes / totalQuota) * 100)) : 0;

  const packRows = [...mergedLangs, "matrix_tier0"]
    .map((langCode) => {
      const rec = packMap.get(langCode);
      const isMatrix = langCode === "matrix_tier0";
      const downloaded = Boolean(rec);
      const sizeStr = rec ? formatMegabytes(rec.byteLen || rec.packBlob?.size || 0) : "";
      const prog = progressByLang[langCode];
      const meta = packMetaMap.get(langCode);
      const url = resolveCanonicalVaultPackUrl(langCode, meta);
      return (
        `<li class="vault-pack-row" data-vault-pack="${escapeHtml(langCode)}" data-vault-installed="${downloaded}">` +
        `<div class="vault-pack-info">` +
        `<strong>${escapeHtml(isMatrix ? "matrix_tier0.ekpack (15-Col)" : `${langCode}.ekpack`)}</strong> ` +
        `<span class="uls-badge">${downloaded ? `✅ ${sizeStr || "OK"}` : isEn ? "Not cached" : "Sin descargar"}</span>` +
        (prog && prog.pct > 0 && prog.pct < 100
          ? `<progress class="vault-chunk-progress" data-chunk-progress="${prog.pct}" max="100" value="${prog.pct}">${prog.pct}%</progress>`
          : "") +
        `</div>` +
        `<div class="vault-pack-actions">` +
        (!downloaded
          ? `<button type="button" class="uls-chip vault-download-btn" data-vault-download="${escapeHtml(langCode)}" data-vault-url="${escapeHtml(url)}">⬇️ ${isEn ? "Download" : "Descargar"}</button>`
          : `<button type="button" class="uls-chip vault-delete-btn" data-vault-delete="${escapeHtml(langCode)}">🗑️ ${isEn ? "Free cache" : "Liberar caché"}</button>`) +
        `</div>` +
        `</li>`
      );
    })
    .join("");

  return (
    `<section id="vaultStorageManagerPanel" class="vault-manager-card" data-vault-langs-count="${mergedLangs.length}" data-installed-packs="${packMap.size}" data-installed-fonts="${(storedFonts || []).length}" data-tech-key="ekovoz_vault_v2">` +
    `<header class="vault-manager-header">` +
    `<strong>🗄️ ${isEn ? "Offline Device Vault" : "Bóveda sin conexión del dispositivo"}</strong>` +
    `<span class="uls-badge" data-vault-quota-badge="true">${formatMegabytes(usedBytes)}${totalQuota > 0 ? ` / ${formatMegabytes(totalQuota)} (${pct}%)` : ""} · ${(storedFonts || []).length} ${isEn ? "font packs" : "paquetes tipográficos"}</span>` +
    `</header>` +
    `<progress class="vault-quota-bar" max="100" value="${pct}">${pct}%</progress>` +
    `<ul class="vault-pack-list">${packRows}</ul>` +
    `</section>`
  );
}

export async function hydrateVaultStorageManagerPanel(ctx = {}) {
  const { state = {}, targetDoc = null, getEl, idbOverride = null, storageOverride = null, fetchImpl } = ctx;
  const host = typeof getEl === "function" ? getEl("vaultStorageManagerHost", targetDoc) : targetDoc?.getElementById?.("vaultStorageManagerHost");
  if (!host) return null;

  const progressByLang = state.vaultProgressByLang || (state.vaultProgressByLang = {});
  const renderNow = async () => {
    const [storedPacks, storedFonts, quota] = await Promise.all([
      listRecordsFromIndexedDb(IDB_STORE_PACKS, idbOverride),
      listRecordsFromIndexedDb(IDB_STORE_FONTS, idbOverride),
      estimateVaultStorageQuota(storageOverride),
    ]);
    host.innerHTML = renderVaultStorageManagerHtml({
      storedPacks,
      storedFonts,
      quota,
      hydratedPacks: state.hydratedPacks24 || [],
      availableLangs: state.availablePackLangs24 || [],
      progressByLang,
      uiLocale: state.uiLocale || "es",
    });
  };
  await renderNow();

  if (typeof host.addEventListener === "function" && !host._vaultManagerBound) {
    host._vaultManagerBound = true;
    host.addEventListener("click", async (e) => {
      const delBtn = e?.target?.closest ? e.target.closest("[data-vault-delete]") : e?.target?.getAttribute?.("data-vault-delete") ? e.target : null;
      const delLang = delBtn?.getAttribute?.("data-vault-delete");
      if (delLang) {
        await deleteRecordFromIndexedDb(IDB_STORE_PACKS, delLang, idbOverride);
        await renderNow();
        return;
      }
      const dlBtn = e?.target?.closest ? e.target.closest("[data-vault-download]") : e?.target?.getAttribute?.("data-vault-download") ? e.target : null;
      const dlLang = dlBtn?.getAttribute?.("data-vault-download");
      const dlUrl = dlBtn?.getAttribute?.("data-vault-url") || resolveCanonicalVaultPackUrl(dlLang);
      if (dlLang) {
        try {
          const bytes = await fetchPackWithChunkProgress(dlUrl, {
            fetchImpl,
            onProgress: (p) => {
              progressByLang[dlLang] = p;
              const bar = host.querySelector?.(`[data-vault-pack="${dlLang}"] .vault-chunk-progress`);
              if (bar) {
                bar.value = p.pct;
                bar.setAttribute?.("data-chunk-progress", String(p.pct));
              }
            },
          });
          await writeRecordToIndexedDb(
            IDB_STORE_PACKS,
            { lang: dlLang, file: `${dlLang}.ekpack`, byteLen: bytes.byteLength, packBytes: bytes, verifiedAt: new Date().toISOString() },
            idbOverride,
          );
        } catch {
          // Offline fetch error stays non-fatal in panel
        }
        await renderNow();
      }
    });
  }
  return host;
}
