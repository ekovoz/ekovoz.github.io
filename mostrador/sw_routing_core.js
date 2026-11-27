// ============================================================================
// web/mostrador/sw_routing_core.js — Núcleo Puro Compartido del Service Worker
// (SSOT ESM sin efectos secundarios; sincronizado hacia `web/sw.js` clásico).
// Referencia: D2-V2LD + D10-V2LD / ARB-EKOVOZ-115 (ciclo efímero W3C 30 s,
// fallback /index.html estricto a mode=navigate, 0 respuestas opaque).
// ============================================================================

export const CACHE_NAME = "ekovoz-mostrador-v51";
export const OPT_IN_META_KEY = "/__ekovoz_meta/offline-opt-in";

export const SUPPORTED_BOOK_NAMES_LANGS = new Set([
  "ar",
  "bn",
  "en",
  "es-1909",
  "es",
  "fa",
  "fr",
  "grc",
  "he",
  "hi",
  "id",
  "ja",
  "pt",
  "ru",
  "stp",
  "ur",
  "zh-Hans",
]);

export const SHELL_CORE_ASSETS = [
  "/",
  "/index.html",
  "/mostrador.css",
  "/bible_constants.js",
  "/mostrador.js",
  "/sw.js",
  "/i18n_ui.js",
  "/mostrador/bridge_and_chapter.js",
  "/mostrador/canonical_versification.js",
  "/mostrador/concordance_search.js",
  "/mostrador/chrome_static_i18n.js",
  "/mostrador/diglossic_chapter_renderer.js",
  "/mostrador/drawer_hydrators.js",
  "/mostrador/drawer_pro_boveda.js",
  "/mostrador/drawer_study.js",
  "/mostrador/drawer_print.js",
  "/mostrador/drawer_workshop.js",
  "/mostrador/drawer_workshop_cards.js",
  "/mostrador/docx_client_reader.js",
  "/mostrador/print_funnel_view.js",
  "/mostrador/workshop_audit_and_langs.js",
  "/mostrador/workshop_elicit_and_cldf.js",
  "/mostrador/workshop_overlay_store.js",
  "/mostrador/authenticity_sheet.js",
  "/mostrador/drawer_share.js",
  "/mostrador/drawer_share_optical_controller.js",
  "/mostrador/i18n.js",
  "/mostrador/human_labels.js",
  "/mostrador/data_layer.js",
  "/mostrador/data_layer_wasm_codecs.js",
  "/mostrador/dom_patch.js",
  "/mostrador/dom_projection_contracts.js",
  "/mostrador/ed25519_field_math.js",
  "/mostrador/pdf_pages.js",
  "/mostrador/dosis.js",
  "/mostrador/dosis_editions_catalog.js",
  "/mostrador/dosis_profiles_schema.js",
  "/mostrador/ekovoz_typeset_worker.wasm",
  "/mostrador/evangelios.js",
  "/mostrador/orthography_wfst.js",
  "/mostrador/diachronic_register.js",
  "/mostrador/reference.js",
  "/mostrador/lang_funnel.js",
  "/mostrador/language_selector_view.js",
  "/mostrador/mejorar.js",
  "/mostrador/mejorar_locks_pda.js",
  "/mostrador/mejorar_audit_renderers.js",
  "/mostrador/mejorar_renderers.js",
  "/mostrador/mostrador_viewport_dose1.js",
  "/mostrador/ekpack_binary_codec.js",
  "/mostrador/offline_font_bundle.js",
  "/mostrador/offline_mesh.js",
  "/mostrador/optical_lt.js",
  "/mostrador/optical_grid_codec.js",
  "/mostrador/optical_wasm_bridge.js",
  "/mostrador/oral_portico_wasm.js",
  "/mostrador/estudio.js",
  "/mostrador/estudio_rosetta_and_realia.js",
  "/mostrador/estudio_schemas.js",
  "/mostrador/quine_and_sneakernet.js",
  "/mostrador/cross_work_bridge.js",
  "/mostrador/braille_brf_codec.js",
  "/mostrador/projection_contract.js",
  "/mostrador/provenance_and_support_panel.js",
  "/mostrador/sauvola_canvas_oracle.js",
  "/mostrador/felices_stage_controller.js",
  "/mostrador/sister_works_controller.js",
  "/mostrador/social_and_photocopy_cards.js",
  "/mostrador/print_config_projector.js",
  "/mostrador/polyglot_picker_view.js",
  "/mostrador/print_guide_and_progress.js",
  "/mostrador/print_stage_ribbon.js",
  "/mostrador/print_unified_options.js",
  "/mostrador/print_work_and_photocopy.js",
  "/mostrador/stage_dom_bindings.js",
  "/mostrador/state_store.js",
  "/mostrador/stealth_filename.js",
  "/mostrador/study_onomasticon_and_ubs.js",
  "/mostrador/study_verse_viewmodel.js",
  "/mostrador/surface_compositor.js",
  "/mostrador/sw_routing_core.js",
  "/mostrador/url_route_lens.js",
  "/mostrador/cascade_l1_l5.js",
  "/mostrador/tanda_print_worker.js",
  "/mostrador/bimodal_tanda_print.js",
  "/mostrador/vault_indexeddb.js",
  "/mostrador/vault_manager_panel.js",
  "/wasm/ekovoz_player_wasm.wasm",
  "/wasm/qr_stream_receiver_wasm.wasm",
  "/wasm/wasm_manifest.json",
  "/i18n/index.json",
  "/i18n/en.json",
  "/i18n/es.json",
  "/assets/fonts/CharisSIL-Regular.ttf",
  "/assets/fonts/CharisSIL-Bold-Subset.ttf",
  "/assets/fonts/Cardo-Hebrew-Biblical.ttf",
  "/assets/fonts/EBGaramond-Greek-Biblical.ttf",
  "/canon_lexicon.json",
  "/downloads_manifest.json",
  "/manifest.webmanifest",
  "/data/annotation_index_report.json",
  "/data/blind_calibration_report.json",
  "/data/catalog.json",
  "/data/diachronic_register_es.json",
  "/data/editorial_profiles.json",
  "/data/elicitation_ladder_250.json",
  "/data/field_workshop_stp.json",
  "/data/fonts_zst_manifest.json",
  "/data/formulaic_index.json",
  "/data/master_census_summary.json",
  "/data/offline_packs_catalog.json",
  "/data/onomasticon_3657.json.zst",
  "/data/packs/packs_manifest.json",
  "/data/pericopes_and_glosses.json",
  "/data/book_names/ar.json",
  "/data/book_names/bn.json",
  "/data/book_names/en.json",
  "/data/book_names/es-1909.json",
  "/data/book_names/es.json",
  "/data/book_names/fa.json",
  "/data/book_names/fr.json",
  "/data/book_names/grc.json",
  "/data/book_names/he.json",
  "/data/book_names/hi.json",
  "/data/book_names/id.json",
  "/data/book_names/ja.json",
  "/data/book_names/pt.json",
  "/data/book_names/ru.json",
  "/data/book_names/stp.json",
  "/data/book_names/ur.json",
  "/data/book_names/zh-Hans.json",
];

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

export function isCacheableResponse(resp) {
  return Boolean(resp && resp.status === 200 && resp.type !== "opaque");
}

export function shouldFallbackToIndexHtml(request) {
  return Boolean(request && request.mode === "navigate");
}

export function classifyRequestRoute(rawUrl, options = {}) {
  const optIn = Boolean(options.offlineOptIn ?? _offlineOptInEnabled);
  const hasRangeHeader = Boolean(options.hasRangeHeader);
  const path = String(rawUrl || "").split("?")[0];

  if (path === OPT_IN_META_KEY) {
    return "network-only";
  }

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

  if (path.startsWith("/packs/fonts/") && (path.endsWith(".ttf.zst") || path.endsWith(".ekfonts"))) {
    return "cache-first";
  }

  if (
    path.startsWith("/data/") ||
    path.includes("/wasm/") ||
    path.endsWith(".wasm") ||
    path.includes("/assets/fonts/") ||
    path.startsWith("/packs/") ||
    path.endsWith(".json")
  ) {
    return "cache-first";
  }

  return "network-first";
}

const ACTIVE_LANG_FONT_ZST_MAP = {
  ar: "NotoNaskhArabic-Regular.ttf.zst",
  arb: "NotoNaskhArabic-Regular.ttf.zst",
  fa: "NotoNaskhArabic-Regular.ttf.zst",
  ur: "NotoNastaliqUrdu-Regular.ttf.zst",
  syr: "NotoSansSyriac-Regular.ttf.zst",
  he: "Cardo-Regular.ttf.zst",
  grc: "EBGaramond-Regular.ttf.zst",
  el: "EBGaramond-Regular.ttf.zst",
  ru: "NotoSans-Regular.ttf.zst",
  hi: "NotoSansDevanagari-Regular.ttf.zst",
  bn: "NotoSansBengali-Regular.ttf.zst",
  ta: "NotoSansTamil-Regular.ttf.zst",
  te: "NotoSansTelugu-Regular.ttf.zst",
  ja: "NotoSansJP-Regular.ttf.zst",
  ko: "NotoSansKR-Regular.ttf.zst",
  "zh-hans": "NotoSansSC-Regular.ttf.zst",
  "zh-hant": "NotoSansTC-Regular.ttf.zst",
  "zh-tw": "NotoSansTC-Regular.ttf.zst",
  th: "NotoSansThai-Regular.ttf.zst",
  am: "NotoSansEthiopic-Regular.ttf.zst",
  my: "NotoSansMyanmar-Regular.ttf.zst",
  km: "NotoSansKhmer-Regular.ttf.zst",
};

export function buildOptInAssetList({
  uiLocale = "en",
  lang = "es",
  fontZstFiles = [],
} = {}) {
  const urls = new Set(SHELL_CORE_ASSETS);
  const cleanUi = String(uiLocale || "en").trim().toLowerCase();
  const exactI18nFile = KNOWN_I18N_CATALOG_FILES[cleanUi];
  if (exactI18nFile && exactI18nFile !== "en.json") {
    urls.add(`/i18n/${exactI18nFile}`);
  }
  const cleanLang = String(lang || "es").trim();
  const lowerLang = cleanLang.toLowerCase();
  const matchedBookLang = Array.from(SUPPORTED_BOOK_NAMES_LANGS).find(
    (code) => code.toLowerCase() === lowerLang,
  );
  if (matchedBookLang) {
    urls.add(`/data/book_names/${matchedBookLang}.json`);
  }
  const activeZst =
    ACTIVE_LANG_FONT_ZST_MAP[lowerLang] ||
    ACTIVE_LANG_FONT_ZST_MAP[lowerLang.split("-")[0]] ||
    "";
  if (activeZst) {
    urls.add(`/packs/fonts/${activeZst}`);
  }
  for (const extraFile of Array.isArray(fontZstFiles) ? fontZstFiles : []) {
    const cleanFile = String(extraFile || "").trim().replace(/^\/+/, "");
    if (cleanFile) {
      urls.add(cleanFile.startsWith("packs/") ? `/${cleanFile}` : `/packs/fonts/${cleanFile}`);
    }
  }
  return Array.from(urls);
}
