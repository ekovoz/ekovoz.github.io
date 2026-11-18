// Ekovoz Service Worker (v46.0.0 — Bóveda Soberana ekovoz-mostrador-v46, supersede ekovoz-mostrador-v20..v45, D3-V2G / ARB-EKOVOZ-95)
// Cero precarga invasiva sin consentimiento del usuario y CERO peticiones fantasma `/data/text/*.json` (DEBRIS-V2G-05 erradicado).
// Los contenedores `.ekpack` y fuentes `.ttf.zst` residen verificados por Ed25519 en IndexedDB (`ekovoz_vault_v2`).

export const CACHE_NAME = "ekovoz-mostrador-v46";

export const SHELL_CORE_ASSETS = [
  "/",
  "/index.html",
  "/mostrador.css",
  "/bible_constants.js",
  "/mostrador.js",
  "/i18n_ui.js",
  "/mostrador/bridge_and_chapter.js",
  "/mostrador/canonical_versification.js",
  "/mostrador/diglossic_chapter_renderer.js",
  "/mostrador/drawer_hydrators.js",
  "/mostrador/drawer_study.js",
  "/mostrador/drawer_print.js",
  "/mostrador/drawer_workshop.js",
  "/mostrador/workshop_overlay_store.js",
  "/mostrador/drawer_share.js",
  "/mostrador/i18n.js",
  "/mostrador/data_layer.js",
  "/mostrador/data_layer_wasm_codecs.js",
  "/mostrador/dom_projection_contracts.js",
  "/mostrador/ed25519_field_math.js",
  "/mostrador/pdf_pages.js",
  "/mostrador/dosis.js",
  "/mostrador/dosis_editions_catalog.js",
  "/mostrador/evangelios.js",
  "/mostrador/orthography_wfst.js",
  "/mostrador/diachronic_register.js",
  "/mostrador/reference.js",
  "/mostrador/lang_funnel.js",
  "/mostrador/optical_lt.js",
  "/mostrador/optical_grid_codec.js",
  "/mostrador/optical_wasm_bridge.js",
  "/mostrador/oral_portico_wasm.js",
  "/mostrador/estudio.js",
  "/mostrador/estudio_rosetta_and_realia.js",
  "/mostrador/mejorar.js",
  "/mostrador/mejorar_locks_pda.js",
  "/mostrador/mejorar_renderers.js",
  "/mostrador/mostrador_viewport_dose1.js",
  "/mostrador/offline_mesh.js",
  "/mostrador/quine_and_sneakernet.js",
  "/mostrador/projection_contract.js",
  "/mostrador/sauvola_canvas_oracle.js",
  "/mostrador/sister_works_controller.js",
  "/mostrador/stage_dom_bindings.js",
  "/mostrador/estudio_schemas.js",
  "/mostrador/cascade_l1_l5.js",
  "/mostrador/tanda_print_worker.js",
  "/mostrador/bimodal_tanda_print.js",
  "/wasm/ekovoz_player_wasm.wasm",
  "/wasm/qr_stream_receiver_wasm.wasm",
  "/i18n/index.json",
  "/i18n/en.json",
  "/i18n/es.json",
  "/assets/fonts/CharisSIL-Regular.ttf",
  "/assets/fonts/CharisSIL-Bold-Subset.ttf",
  "/data/catalog.json",
  "/data/offline_packs_catalog.json",
  "/manifest.webmanifest",
];

const SUPPORTED_BOOK_NAMES_LANGS = new Set(["es", "en", "stp", "he", "grc"]);
export const KNOWN_I18N_CATALOG_FILES = Object.freeze({
  ar: "ar.json",
  bn: "bn.json",
  "bn-bd": "bn-BD.json",
  "bn-in": "bn-IN.json",
  en: "en.json",
  es: "es.json",
  fa: "fa.json",
  fr: "fr.json",
  hi: "hi.json",
  id: "id.json",
  it: "it.json",
  ja: "ja.json",
  ko: "ko.json",
  pt: "pt.json",
  ru: "ru.json",
  tr: "tr.json",
  ur: "ur.json",
  "zh-hans": "zh-Hans.json",
});
let _offlineOptInEnabled = false;

export function setOfflineOptInState(enabled) {
  _offlineOptInEnabled = Boolean(enabled);
  return _offlineOptInEnabled;
}

export function serializeFieldFeedbackPatchL1L5({
  langCode = "es",
  cascadeLevel = "L1",
  targetRefOrLemma = "GEN.1.1",
  oldSurface = "",
  newSurface = "",
  notePureText = "",
} = {}) {
  return {
    lang_code: String(langCode || "es"),
    cascade_level: String(cascadeLevel || "L1"),
    target: String(targetRefOrLemma || "GEN.1.1"),
    old_surface: String(oldSurface || ""),
    new_surface: String(newSurface || ""),
    note_pure_text: String(notePureText || ""),
    audio_bytes: 0,
    jpg_bytes: 0,
  };
}

export function isFullBibleOrWorkPdfUrl(rawUrl) {
  const path = String(rawUrl || "").split("?")[0].toLowerCase();
  if (!path.endsWith(".pdf")) return false;
  if (path.includes("/data/blocks/")) return false;
  return true;
}

export function classifyRequestRoute(rawUrl, options = {}) {
  const optIn = Boolean(options.offlineOptIn ?? _offlineOptInEnabled);
  const hasRangeHeader = Boolean(options.hasRangeHeader);
  const path = String(rawUrl || "").split("?")[0];

  if (isFullBibleOrWorkPdfUrl(path)) {
    return "bypass-full-pdf";
  }

  if (hasRangeHeader) {
    return "network-only";
  }

  if (!optIn) {
    return "network-only";
  }

  if (
    path === "/" ||
    path.endsWith("/index.html") ||
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.includes("/i18n/") ||
    /^\/[a-z]{2,3}(?:-[a-z0-9]+)?\/$/i.test(path)
  ) {
    return "network-first";
  }

  if (
    path.startsWith("/data/") ||
    path.includes("/wasm/") ||
    path.includes("/assets/fonts/") ||
    path.includes("/packs/")
  ) {
    return "cache-first";
  }

  return "network-first";
}

/**
 * Construye la lista exacta del App Shell real bajo Opt-In (`D3-V2G`):
 * CERO URLs inexistentes `/data/text/<lang>/<BOOK>.json` (`DEBRIS-V2G-05` eliminado).
 */
export function buildOptInAssetList({
  uiLocale = "en",
  lang = "es",
} = {}) {
  const urls = new Set(SHELL_CORE_ASSETS);
  const cleanUi = String(uiLocale || "en").trim().toLowerCase();
  const exactI18nFile = KNOWN_I18N_CATALOG_FILES[cleanUi];
  if (exactI18nFile && exactI18nFile !== "en.json") {
    urls.add(`/i18n/${exactI18nFile}`);
  }
  const cleanLang = String(lang || "es").trim().toLowerCase();
  if (SUPPORTED_BOOK_NAMES_LANGS.has(cleanLang)) {
    urls.add(`/data/book_names/${cleanLang}.json`);
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
      });
      event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
          await Promise.all(
            assets.map((assetUrl) => cache.add(assetUrl).catch(() => undefined)),
          );
        }),
      );
    } else if (data.type === "EKOVOZ_OFFLINE_CLEAR") {
      _offlineOptInEnabled = false;
      event.waitUntil(caches.delete(CACHE_NAME));
    } else if (data.type === "EKOVOZ_SERIALIZE_FIELD_PATCH_L1_L5") {
      const serialized = serializeFieldFeedbackPatchL1L5(data.payload || {});
      if (event.source && typeof event.source.postMessage === "function") {
        event.source.postMessage({
          type: "EKOVOZ_FIELD_PATCH_SERIALIZED",
          payload: serialized,
        });
      }
    }
  });

  self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    const urlObj = new URL(event.request.url);
    const hasRangeHeader = Boolean(event.request.headers && event.request.headers.get("Range"));
    const route = classifyRequestRoute(urlObj.pathname, {
      offlineOptIn: _offlineOptInEnabled,
      hasRangeHeader,
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
