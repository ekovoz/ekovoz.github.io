// ============================================================================
// web/mostrador/vault_manager_panel.js — Gestor Visual de Bóveda Offline IndexedDB
// Expone espacio ocupado, los 24 .ekpack + matrix_tier0 + .ekfonts, progreso por chunks
// y controles para descargar o liberar caché individualmente (`SLICE-R2-B06`).
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { formatEditorialTraditionLabel, formatVaultEditionMetadata } from "./human_labels.js";
import { DEEP_PROJECTION_SUBKEYS } from "./projection_contract.js";
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
  es: { es: "Español (Reina-Valera / Actualizada)", en: "Spanish (Reina-Valera / Updated)" },
  en: { es: "Inglés (WEB / KJV)", en: "English (WEB / KJV)" },
  stp: { es: "O'dam (Tepehuano del Sureste)", en: "O'dam (Southeastern Tepehuan)" },
  he: { es: "Hebreo bíblico (WLC)", en: "Biblical Hebrew (WLC)" },
  grc: { es: "Griego koiné (SBLGNT)", en: "Koine Greek (SBLGNT)" },
  pt: { es: "Portugués", en: "Portuguese" },
  fr: { es: "Francés", en: "French" },
  ar: { es: "Árabe", en: "Arabic" },
  fa: { es: "Persa (Farsi)", en: "Persian (Farsi)" },
  ur: { es: "Urdu", en: "Urdu" },
  hi: { es: "Hindi", en: "Hindi" },
  bn: { es: "Bengalí", en: "Bengali" },
  id: { es: "Indonesio", en: "Indonesian" },
  ru: { es: "Ruso", en: "Russian" },
  "zh-Hans": { es: "Chino simplificado", en: "Simplified Chinese" },
  de: { es: "Alemán", en: "German" },
  it: { es: "Italiano", en: "Italian" },
  ja: { es: "Japonés", en: "Japanese" },
  ko: { es: "Coreano", en: "Korean" },
  sw: { es: "Swahili", en: "Swahili" },
  tr: { es: "Turco", en: "Turkish" },
  arp: { es: "Arapaho", en: "Arapaho" },
  bre: { es: "Bretón", en: "Breton" },
  cha: { es: "Chamorro", en: "Chamorro" },
  matrix_tier0: { es: "Estudio 15 columnas (Matriz original)", en: "15-Column Study Matrix (Original)" },
});

const CANONICAL_PACK_BOOK_COUNTS = Object.freeze({
  stp: 27,
  arp: 1,
  bre: 4,
  cha: 6,
});

function resolveVaultPackDisplayTitle(langCode, isEn = false, meta = null) {
  const clean = String(langCode || "").trim();
  const names = VAULT_PACK_HUMAN_NAMES[clean];
  const baseName = names ? (isEn ? names.en : names.es) : clean.toUpperCase();
  if (clean === "matrix_tier0") return baseName;
  const rawCount = Number(meta?.canonicalBooksPresent ?? CANONICAL_PACK_BOOK_COUNTS[clean] ?? 66);
  const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 66;
  const tierSuffix = count === 27
    ? (isEn ? "27 books (NT)" : "27 libros (NT)")
    : count < 66
      ? (isEn ? `${count} ${count === 1 ? "book" : "books"} (portion)` : `${count} ${count === 1 ? "libro" : "libros"} (porción)`)
      : (isEn ? "66 books" : "66 libros");
  return `${baseName} · ${tierSuffix}`;
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
  fontsManifest = null,
  errorByLang = {},
  uiLocale = "es",
} = {}) {
  const tier0BundleBytes = Number(fontsManifest?.tier0_offline_bundle_bytes || 825864);
  const totalFontsCount = Number(fontsManifest?.total_fonts || 34);
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
    const humanTitle = resolveVaultPackDisplayTitle(langCode, isEn, meta);
    const searchHay = `${langCode} ${humanTitle} ${fileKey}`.toLowerCase();
    const statusBadge = downloaded
      ? `✅ ${isEn ? "Ready" : "Listo"}${sizeStr ? ` · ${sizeStr}` : ""}`
      : `${isEn ? "Not downloaded" : "Disponible"}${sizeStr ? ` · ${sizeStr}` : ""}`;
    const humanMetaLine = meta ? formatVaultEditionMetadata({ ...meta, lang: langCode, booksCount: meta?.booksCount || 66 }, isEn ? "en" : "es") : "";
    const metaDetailsHtml = meta
      ? `<div class="tech-details vault-pack-meta-details" data-pack-meta-details="true">` +
      `<div class="ek-meta ek-stack-xs">` +
      `<span>${escapeHtml(humanMetaLine)} · </span>` +
      `<div class="ek-stack-xs" data-contextual-meta="true">` +
      `<span><strong>${isEn ? "Canon:" : "Canon:"}</strong> ${escapeHtml(formatEditorialTraditionLabel(meta.versificationTradition || "eng", isEn ? "en" : "es"))} · ${escapeHtml(Array.isArray(meta.diachronicVariants) && meta.diachronicVariants.length ? meta.diachronicVariants.join(", ") : "canonical")}</span>` +
      (meta.merkleRootSha256 ? `<span><strong>Merkle:</strong> <code>${escapeHtml(String(meta.merkleRootSha256).slice(0, 16))}…</code></span>` : "") +
      (meta.contentDigestSha256 ? `<span><strong>Digest:</strong> <code>${escapeHtml(String(meta.contentDigestSha256).slice(0, 16))}…</code></span>` : "") +
      (meta.origin_url ? `<span><strong>origin_url:</strong> <code>${escapeHtml(String(meta.origin_url))}</code></span>` : "") +
      (meta.metaZstdSha256 ? `<span><strong>metaZstdSha256:</strong> <code>${escapeHtml(String(meta.metaZstdSha256).slice(0, 16))}…</code></span>` : "") +
      `</div>` +
      `</div></div>`
      : "";
    const packErr = errorByLang?.[langCode] ? String(errorByLang[langCode]) : "";
    return (
      `<li class="vault-pack-row${isMatrix ? " is-matrix-highlight" : ""}" data-vault-pack="${escapeHtml(langCode)}" data-vault-file="${escapeHtml(fileKey)}" data-vault-search="${escapeHtml(searchHay)}" data-vault-installed="${downloaded}"${priorityTag ? ` data-vault-priority="${escapeHtml(priorityTag)}"` : ""}>` +
      `<div class="vault-pack-info">` +
      `<strong>${escapeHtml(humanTitle)}</strong> ` +
      `<span class="uls-badge bicanonical-badge">${escapeHtml(statusBadge)}</span>` +
      (prog && prog.pct > 0 && prog.pct < 100
        ? `<progress class="vault-chunk-progress" data-chunk-progress="${prog.pct}" max="100" value="${prog.pct}">${prog.pct}%</progress>`
        : "") +
      (packErr ? `<p class="ek-meta" data-vault-error="${escapeHtml(langCode)}">${escapeHtml(packErr)}</p>` : "") +
      metaDetailsHtml +
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
    ? remainingCodes.filter((lc) => `${lc} ${resolveVaultPackDisplayTitle(lc, isEn, packMetaMap.get(lc))}`.toLowerCase().includes(cleanFilter))
    : remainingCodes;

  const priorityRowsHtml = priorityCodes
    .map((lc) =>
      renderPackRow(lc, {
        priorityTag: lc === "matrix_tier0" ? "matrix_tier0" : lc === normActiveLang ? "active_lang" : "installed",
      }),
    )
    .join("");
  const remainingRowsHtml = filteredRemainingCodes.map((lc) => renderPackRow(lc)).join("");
  const showQuotaCap = totalQuota > 0 && totalQuota <= 512 * 1024 * 1024;
  const quotaSuffix = showQuotaCap ? ` / ${formatMegabytes(totalQuota)} (${pct}%)` : "";
  const summaryLabel = isEn
    ? `${installedBiblesCount} of ${mergedLangs.length} Bibles ready · ${formatMegabytes(usedBytes)}${quotaSuffix}`
    : `${installedBiblesCount} de ${mergedLangs.length} Biblias listas · ${formatMegabytes(usedBytes)}${quotaSuffix}`;
  const standaloneReadersHtml = [
    ["es", "Español"],
    ["en", "English"],
    ["grc", "Ἑλληνική (grc)"],
    ["he", "עברית (he)"],
    ["stp", "O'dam (stp)"],
  ]
    .map(([lc, label]) => `<a class="uls-chip ek-badge-compact" href="obras/biblia/packs/${lc}/lector_offline_${lc}.html">${escapeHtml(label)}</a>`)
    .join(" ");

  return (
    `<section id="vaultStorageManagerPanel" class="vault-manager-card" data-vault-langs-count="${mergedLangs.length}" data-installed-packs="${packMap.size}" data-installed-fonts="${(storedFonts || []).length}" data-tier0-offline-bundle-bytes="${tier0BundleBytes}" data-total-fonts="${totalFontsCount}" data-deep-projection-keys="${Array.isArray(DEEP_PROJECTION_SUBKEYS["offline_packs_catalog.json"]) ? DEEP_PROJECTION_SUBKEYS["offline_packs_catalog.json"].length : 5}" data-tech-key="ekovoz_vault_v2">` +
    `<header class="vault-manager-header">` +
    `<strong>🗄️ ${isEn ? "Offline Device Vault" : "Bóveda sin conexión del dispositivo"}</strong>` +
    `<span class="uls-badge" data-vault-quota-badge="true">${escapeHtml(summaryLabel)} · ${totalFontsCount} ${isEn ? "fonts" : "fuentes"} (${formatMegabytes(tier0BundleBytes)})</span>` +
    `</header>` +
    `<progress class="vault-quota-bar" max="100" value="${pct}"${pct === 0 ? " hidden" : ""}>${pct}%</progress>` +
    `<ul class="vault-pack-list vault-pack-priority-list">${priorityRowsHtml}</ul>` +
    (remainingCodes.length > 0
      ? `<section id="vaultMorePacksDetails" class="r9-stratum-accordion ek-mt-xs"${cleanFilter ? ' data-filtered="true"' : ""}>` +
      `<strong>📚 ${isEn ? `More offline Bible languages (${remainingCodes.length})` : `Más idiomas offline disponibles (${remainingCodes.length})`}</strong>` +
      `<div class="ek-mt-xs">` +
      `<input type="search" id="vaultPacksFilterInput" class="ek-input-compact ek-mb-xs" value="${escapeHtml(filterQuery)}" placeholder="${isEn ? "Filter language (pt, fr, ar, stp...)" : "Filtrar idioma (pt, fr, ar, stp...)"}">` +
      `<ul class="vault-pack-list vault-pack-list-compact">${remainingRowsHtml}</ul>` +
      `</div>` +
      `</section>`
      : "") +
    `<section id="vaultStandaloneOfflineReadersCard" class="ek-card ek-stack-xs ek-mt-xs" data-standalone-readers="5">` +
    `<strong>📖 ${isEn ? "Single-file HTML readers (open offline without installing)" : "Lectores HTML de un archivo (abren sin internet ni app)"}</strong>` +
    `<p class="ek-meta ek-m-0">${isEn ? "Self-contained backup HTML editions ready to save or share:" : "Copias portables en HTML listas para guardar o compartir:"}</p>` +
    `<div class="ek-row-wrap">${standaloneReadersHtml}</div>` +
    `</section>` +
    `</section>`
  );
}

export function renderPortabilityResearchCardHtml({ dlEntries = [], isEn = false } = {}) {
  const list = Array.isArray(dlEntries) ? dlEntries : [];
  const manifestTotalAssets = list.length || 110;
  const manifestPacksCount = list.filter((e) => e.kind === "ekpack" || String(e.path || "").endsWith(".ekpack")).length || 24;
  const manifestFontsCount = list.filter((e) => e.kind === "font_zst" || String(e.path || "").endsWith(".ttf.zst")).length || 34;
  const manifestTotalMb = list.length > 0
    ? (list.reduce((acc, e) => acc + (Number(e?.bytes) || 0), 0) / (1024 * 1024)).toFixed(1)
    : "18.4";
  const llmsMdDossiers = [
    "llms/biblia/ar.md", "llms/biblia/bn.md", "llms/biblia/en.md", "llms/biblia/es.md",
    "llms/biblia/fa.md", "llms/biblia/fr.md", "llms/biblia/hi.md", "llms/biblia/id.md",
    "llms/biblia/it.md", "llms/biblia/ja.md", "llms/biblia/ko.md", "llms/biblia/pt.md",
    "llms/biblia/ru.md", "llms/biblia/spa.md", "llms/biblia/stp.md", "llms/biblia/tr.md",
    "llms/biblia/ur.md", "llms/biblia/zh-Hans.md",
    "llms/felices/ar.md", "llms/felices/bn.md", "llms/felices/en.md", "llms/felices/es.md",
    "llms/felices/fa.md", "llms/felices/fr.md", "llms/felices/hi.md", "llms/felices/id.md",
    "llms/felices/it.md", "llms/felices/ja.md", "llms/felices/ko.md", "llms/felices/pt.md",
    "llms/felices/ru.md", "llms/felices/tr.md", "llms/felices/ur.md", "llms/felices/zh-Hans.md",
  ];
  const llmsDossiersLinksHtml = llmsMdDossiers
    .map((mdPath) => `<a class="uls-chip ek-badge-compact" href="${escapeHtml(mdPath)}">${escapeHtml(mdPath.replace(/^llms\//, ""))}</a>`)
    .join(" ");
  return (
    `<section id="sharePortabilityResearchCard" class="ek-card ek-stack-sm ek-mt-sm" data-downloads-manifest-count="${manifestTotalAssets}" data-llms-dossiers="${llmsMdDossiers.length}">` +
    `<div class="ek-row-between">` +
    `<strong>🧭 ${isEn ? "Portability & Open Research Dossiers" : "Portabilidad e Investigación Abierta"}</strong>` +
    `<span class="uls-badge" data-manifest-assets-badge="true">${manifestTotalAssets} ${isEn ? "assets" : "activos"} · ${manifestPacksCount} .ekpack · ${manifestFontsCount} ${isEn ? "fonts" : "fuentes"} (${manifestTotalMb} MB)</span>` +
    `</div>` +
    `<div class="ek-row-wrap">` +
    `<a id="linkLlmsFullCorpus" class="uls-chip ek-btn-link" href="llms-full.txt" data-llms-full="true">📚 ${isEn ? "Full AI & Research Corpus (llms-full.txt · 32 KB)" : "Texto Completo de Investigación (llms-full.txt · 32 KB)"}</a>` +
    `<a id="linkLlmsSummaryIndex" class="uls-chip ek-btn-link" href="llms.txt">📄 llms.txt</a>` +
    `</div>` +
    `<section id="shareLlmsDossiersDetails" class="tech-details">` +
    `<strong>${isEn ? "34 language research sheets (web/llms/*.md)" : "34 fichas lingüísticas abiertas (web/llms/*.md)"}</strong>` +
    `<div class="ek-row-wrap ek-mt-xs">${llmsDossiersLinksHtml}</div>` +
    `</section>` +
    `</section>`
  );
}

export async function hydrateVaultStorageManagerPanel(ctx = {}) {
  const { state = {}, targetDoc = null, getEl, idbOverride = null, storageOverride = null, fetchImpl } = ctx;
  const host = typeof getEl === "function" ? getEl("vaultStorageManagerHost", targetDoc) : targetDoc?.getElementById?.("vaultStorageManagerHost");
  if (!host) return null;

  const progressByLang = state.vaultProgressByLang || (state.vaultProgressByLang = {});
  const errorByLang = state.vaultErrorByLang || (state.vaultErrorByLang = {});
  const isEnUi = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
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
      errorByLang,
      activeLang: state.lang || "es",
      matrixTier0Url: state.matrixTier0Url || "data/packs/matrix_tier0.ekpack",
      matrixTier0Bytes: Number(state.matrixTier0Bytes) || 7562231,
      filterQuery: state.vaultFilterQuery || "",
      fontsManifest: state.fontsZstManifest || null,
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
        delete errorByLang[delLang];
        await deleteRecordFromIndexedDb(IDB_STORE_PACKS, delLang, idbOverride);
        await renderNow();
        return;
      }
      const dlBtn = e?.target?.closest ? e.target.closest("[data-vault-download]") : e?.target?.getAttribute?.("data-vault-download") ? e.target : null;
      const dlLang = dlBtn?.getAttribute?.("data-vault-download");
      const dlUrl = dlBtn?.getAttribute?.("data-vault-url") || resolveCanonicalVaultPackUrl(dlLang, null, state.matrixTier0Url || "");
      if (dlLang) {
        delete errorByLang[dlLang];
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
        } catch (err) {
          const rawMsg = String(err?.message || err || "");
          const isMissingPacksMount = dlUrl.startsWith("packs/") || /404|not found/i.test(rawMsg);
          errorByLang[dlLang] = isMissingPacksMount
            ? (isEnUi
              ? "Pack mount (/packs/) unavailable in this local preview; use embedded packs or full static host."
              : "Paquete (/packs/) no montado en esta vista local; usa los paquetes embebidos o el servidor completo.")
            : (isEnUi ? `Download unavailable (${rawMsg || "offline"}).` : `Descarga no disponible (${rawMsg || "sin conexión"}).`);
        }
        await renderNow();
      }
    });
  }
  return host;
}
