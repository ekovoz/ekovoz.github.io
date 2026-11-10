// Ekovoz Service Worker (v20.0.0 — Ronda 20 Mostrador Opt-In Offline)
// Cero precarga invasiva sin consentimiento del usuario (protección de cuota en celulares de gama baja).
// Jamás intercepta ni almacena en caché PDFs de Biblia completa o cuadernos completos.

export const CACHE_NAME = "ekovoz-mostrador-v20";

export const SHELL_CORE_ASSETS = [
  "/",
  "/index.html",
  "/mostrador.js",
  "/i18n_ui.js",
  "/mostrador/bridge_and_chapter.js",
  "/mostrador/drawer_hydrators.js",
  "/mostrador/i18n.js",
  "/mostrador/data_layer.js",
  "/mostrador/pdf_pages.js",
  "/mostrador/dosis.js",
  "/mostrador/evangelios.js",
  "/mostrador/orthography_wfst.js",
  "/mostrador/diachronic_register.js",
  "/mostrador/reference.js",
  "/mostrador/lang_funnel.js",
  "/mostrador/optical_lt.js",
  "/mostrador/estudio.js",
  "/mostrador/mejorar.js",
  "/mostrador/offline_mesh.js",
  "/i18n/index.json",
  "/i18n/en.json",
  "/i18n/es.json",
  "/data/catalog.json",
  "/manifest.webmanifest",
];

let _offlineOptInEnabled = false;

export function setOfflineOptInState(enabled) {
  _offlineOptInEnabled = Boolean(enabled);
  return _offlineOptInEnabled;
}

export function isFullBibleOrWorkPdfUrl(rawUrl) {
  const path = String(rawUrl || "").split("?")[0].toLowerCase();
  if (!path.endsWith(".pdf")) return false;
  // Solo los bloques cortos /data/blocks/<lang>/<ed>/B01..B80.pdf pueden guardarse bajo opt-in
  if (/\/data\/blocks\/[^/]+\/[^/]+\/b\d{2}\.pdf$/i.test(path)) {
    return false;
  }
  return true;
}

export function classifyRequestRoute(rawUrl, options = {}) {
  const optIn = Boolean(options.offlineOptIn ?? _offlineOptInEnabled);
  const path = String(rawUrl || "").split("?")[0];

  if (isFullBibleOrWorkPdfUrl(path)) {
    return "bypass-full-pdf";
  }

  if (!optIn) {
    return "network-only";
  }

  if (
    path === "/" ||
    path.endsWith("/index.html") ||
    /^\/[a-z]{2,3}(?:-[a-z0-9]+)?\/$/i.test(path)
  ) {
    return "network-first";
  }

  if (
    path.includes("/mostrador") ||
    path.includes("/i18n/") ||
    path.includes("/data/text/") ||
    path.includes("/data/pages/") ||
    path.includes("/data/book_names/") ||
    path.includes("/data/catalog.json") ||
    /\/data\/blocks\/[^/]+\/[^/]+\/b\d{2}\.pdf$/i.test(path)
  ) {
    return "cache-first";
  }

  return "network-first";
}

export function buildOptInAssetList({
  uiLocale = "en",
  lang = "es",
  books = ["GEN", "PSA", "MAT", "JHN", "ROM"],
} = {}) {
  const urls = new Set(SHELL_CORE_ASSETS);
  if (uiLocale && uiLocale !== "en") {
    urls.add(`/i18n/${uiLocale}.json`);
  }
  if (lang) {
    urls.add(`/data/book_names/${lang}.json`);
    for (const b of books) {
      urls.add(`/data/text/${lang}/${String(b).toUpperCase()}.json`);
    }
  }
  return Array.from(urls);
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", () => {
    if (typeof self.skipWaiting === "function") {
      self.skipWaiting();
    }
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
          ),
        )
        .then(() => (self.clients && self.clients.claim ? self.clients.claim() : undefined)),
    );
  });

  self.addEventListener("message", (event) => {
    const data = event?.data || {};
    if (data.type === "EKOVOZ_OFFLINE_OPT_IN") {
      _offlineOptInEnabled = true;
      const assets = buildOptInAssetList({
        uiLocale: data.uiLocale || "en",
        lang: data.lang || "es",
        books: Array.isArray(data.books) ? data.books : ["GEN", "JHN", "ROM"],
      });
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(assets)),
      );
    } else if (data.type === "EKOVOZ_OFFLINE_CLEAR") {
      _offlineOptInEnabled = false;
      event.waitUntil(caches.delete(CACHE_NAME));
    }
  });

  self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    const urlObj = new URL(event.request.url);
    const route = classifyRequestRoute(urlObj.pathname, {
      offlineOptIn: _offlineOptInEnabled,
    });

    if (route === "bypass-full-pdf" || route === "network-only") {
      return;
    }

    if (route === "network-first") {
      event.respondWith(
        fetch(event.request)
          .then((resp) => {
            if (resp && resp.status === 200) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return resp;
          })
          .catch(() => caches.match(event.request).then((r) => r || caches.match("/index.html"))),
      );
      return;
    }

    if (route === "cache-first") {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((resp) => {
            if (resp && resp.status === 200) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            }
            return resp;
          });
        }),
      );
    }
  });
}
