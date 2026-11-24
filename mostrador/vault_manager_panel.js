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

const VAULT_PACK_HUMAN_NAMES = Object.freeze({
  es: "Español (Reina-Valera / Actualizada)",
  en: "English (WEB / KJV)",
  stp: "O'dam (Tepehuano del Sureste)",
  he: "Hebreo bíblico (WLC)",
  grc: "Griego koiné (SBLGNT)",
  pt: "Portugués",
  fr: "Francés",
  ar: "Árabe",
  fa: "Persa (Farsi)",
  ur: "Urdu",
  hi: "Hindi",
  bn: "Bengalí",
  id: "Indonesio",
  ru: "Ruso",
  "zh-Hans": "Chino simplificado",
  de: "Alemán",
  it: "Italiano",
  ja: "Japonés",
  ko: "Coreano",
  sw: "Swahili",
  tr: "Turco",
  arp: "Arapaho",
  bre: "Bretón",
  cha: "Chamorro",
  matrix_tier0: "Estudio 15 columnas (Matriz original)",
});

function resolveVaultPackDisplayTitle(langCode, isEn = false) {
  const clean = String(langCode || "").trim();
  if (clean === "matrix_tier0") {
    return isEn ? "15-Column Study Matrix (Original)" : VAULT_PACK_HUMAN_NAMES.matrix_tier0;
  }
  const baseName = VAULT_PACK_HUMAN_NAMES[clean] || clean.toUpperCase();
  return `${baseName} · ${isEn ? "66 books" : "66 libros"}`;
}

/**
 * Resuelve la URL canónica de un `.ekpack`: `data/packs/` solo para los 6 paquetes embebidos,
 * y `packs/` para los demás idiomas descargables bajo demanda (`D4-R8` / `SLICE-R8A-09`).
 */
export function resolveCanonicalVaultPackUrl(langCode, meta = null, matrixTier0Url = "") {
  const clean = String(langCode || "").trim();
  if (clean === "matrix_tier0" && matrixTier0Url) return String(matrixTier0Url);
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
  activeLang = "es",
  matrixTier0Url = "",
  matrixTier0Bytes = 7562231,
  filterQuery = "",
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

  const normActiveLang = String(activeLang || "es").trim().replace(/^es-1909$/i, "es");
  const installedBiblesCount = mergedLangs.filter((lc) => packMap.has(lc)).length;

  const renderPackRow = (langCode, { priorityTag = "" } = {}) => {
    const rec = packMap.get(langCode);
    const isMatrix = langCode === "matrix_tier0";
    const downloaded = Boolean(rec);
    const meta = packMetaMap.get(langCode);
    const catalogBytes = isMatrix ? Number(matrixTier0Bytes) || 7562231 : Number(meta?.bytes || 0);
    const sizeStr = rec
      ? formatMegabytes(rec.byteLen || rec.packBlob?.size || 0)
      : catalogBytes > 0
        ? formatMegabytes(catalogBytes)
        : "";
    const prog = progressByLang[langCode];
    const url = resolveCanonicalVaultPackUrl(langCode, meta, matrixTier0Url);
    const fileKey = isMatrix ? "matrix_tier0.ekpack" : `${langCode}.ekpack`;
    const humanTitle = resolveVaultPackDisplayTitle(langCode, isEn);
    const searchHay = `${langCode} ${humanTitle} ${fileKey}`.toLowerCase();
    const statusBadge = downloaded
      ? `✅ ${isEn ? "Ready" : "Listo"}${sizeStr ? ` · ${sizeStr}` : ""}`
      : `${isEn ? "Not downloaded" : "Disponible"}${sizeStr ? ` · ${sizeStr}` : ""}`;
    return (
      `<li class="vault-pack-row${isMatrix ? " is-matrix-highlight" : ""}" data-vault-pack="${escapeHtml(langCode)}" data-vault-file="${escapeHtml(fileKey)}" data-vault-search="${escapeHtml(searchHay)}" data-vault-installed="${downloaded}"${priorityTag ? ` data-vault-priority="${escapeHtml(priorityTag)}"` : ""}>` +
      `<div class="vault-pack-info">` +
      `<strong>${escapeHtml(humanTitle)}</strong> ` +
      `<span class="uls-badge">${escapeHtml(statusBadge)}</span>` +
      (prog && prog.pct > 0 && prog.pct < 100
        ? `<progress class="vault-chunk-progress" data-chunk-progress="${prog.pct}" max="100" value="${prog.pct}">${prog.pct}%</progress>`
        : "") +
      `</div>` +
      `<div class="vault-pack-actions">` +
      (!downloaded
        ? `<button type="button" class="uls-chip vault-download-btn" data-vault-download="${escapeHtml(langCode)}" data-vault-url="${escapeHtml(url)}">⬇️ ${isEn ? "Download" : "Descargar"}</button>`
        : `<button type="button" class="uls-chip vault-delete-btn" data-vault-delete="${escapeHtml(langCode)}">🗑️ ${isEn ? "Free space" : "Liberar"}</button>`) +
      `</div>` +
      `</li>`
    );
  };

  const priorityCodes = Array.from(
    new Set([
      ...(mergedLangs.includes(normActiveLang) ? [normActiveLang] : []),
      ...mergedLangs.filter((lc) => packMap.has(lc)),
      "matrix_tier0",
    ]),
  );
  const prioritySet = new Set(priorityCodes);
  const cleanFilter = String(filterQuery || "").trim().toLowerCase();
  const remainingCodes = mergedLangs.filter((lc) => !prioritySet.has(lc));
  const filteredRemainingCodes = cleanFilter
    ? remainingCodes.filter((lc) => `${lc} ${resolveVaultPackDisplayTitle(lc, isEn)}`.toLowerCase().includes(cleanFilter))
    : remainingCodes;

  const priorityRowsHtml = priorityCodes
    .map((lc) =>
      renderPackRow(lc, {
        priorityTag: lc === "matrix_tier0" ? "matrix_tier0" : lc === normActiveLang ? "active_lang" : "installed",
      }),
    )
    .join("");
  const remainingRowsHtml = filteredRemainingCodes.map((lc) => renderPackRow(lc)).join("");
  const summaryLabel = isEn
    ? `${installedBiblesCount} of ${mergedLangs.length} Bibles ready · ${formatMegabytes(usedBytes)}${totalQuota > 0 ? ` / ${formatMegabytes(totalQuota)} (${pct}%)` : ""}`
    : `${installedBiblesCount} de ${mergedLangs.length} Biblias listas · ${formatMegabytes(usedBytes)}${totalQuota > 0 ? ` / ${formatMegabytes(totalQuota)} (${pct}%)` : ""}`;

  return (
    `<section id="vaultStorageManagerPanel" class="vault-manager-card" data-vault-langs-count="${mergedLangs.length}" data-installed-packs="${packMap.size}" data-installed-fonts="${(storedFonts || []).length}" data-tech-key="ekovoz_vault_v2">` +
    `<header class="vault-manager-header">` +
    `<strong>🗄️ ${isEn ? "Offline Device Vault" : "Bóveda sin conexión del dispositivo"}</strong>` +
    `<span class="uls-badge" data-vault-quota-badge="true">${escapeHtml(summaryLabel)}</span>` +
    `</header>` +
    `<progress class="vault-quota-bar" max="100" value="${pct}">${pct}%</progress>` +
    `<ul class="vault-pack-list vault-pack-priority-list">${priorityRowsHtml}</ul>` +
    (remainingCodes.length > 0
      ? `<details id="vaultMorePacksDetails" class="r9-stratum-accordion ek-mt-xs"${cleanFilter ? " open" : ""}>` +
        `<summary>📚 ${isEn ? `More offline Bible languages (${remainingCodes.length})` : `Más idiomas offline disponibles (${remainingCodes.length})`}</summary>` +
        `<div class="ek-mt-xs">` +
        `<input type="search" id="vaultPacksFilterInput" class="ek-input-compact ek-mb-xs" value="${escapeHtml(filterQuery)}" placeholder="${isEn ? "Filter language (pt, fr, ar, stp...)" : "Filtrar idioma (pt, fr, ar, stp...)"}">` +
        `<ul class="vault-pack-list vault-pack-list-compact">${remainingRowsHtml}</ul>` +
        `</div>` +
        `</details>`
      : "") +
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
      activeLang: state.lang || "es",
      matrixTier0Url: state.matrixTier0Url || "data/packs/matrix_tier0.ekpack",
      matrixTier0Bytes: Number(state.matrixTier0Bytes) || 7562231,
      filterQuery: state.vaultFilterQuery || "",
      uiLocale: state.uiLocale || "es",
    });
  };
  await renderNow();

  if (typeof host.addEventListener === "function" && !host._vaultManagerBound) {
    host._vaultManagerBound = true;
    host.addEventListener("input", async (e) => {
      if (e?.target?.id === "vaultPacksFilterInput") {
        state.vaultFilterQuery = String(e.target.value || "");
        await renderNow();
      }
    });
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
      const dlUrl = dlBtn?.getAttribute?.("data-vault-url") || resolveCanonicalVaultPackUrl(dlLang, null, state.matrixTier0Url || "");
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
