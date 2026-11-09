// ============================================================================
// web/i18n_ui.js — Controlador Ligero de "Los Felices" sobre web/i18n/<loc>.json
// y web/data/felices/<loc>.json (Ronda 20 — S19 & S29b, Cero Diccionarios Embebidos)
// ============================================================================

export const LANGUAGE_PACKS = Object.freeze([
  { code: "en", name: "English (Default)", autonym: "English", dir: "ltr", script: "Latn" },
  { code: "es", name: "Español", autonym: "Español", dir: "ltr", script: "Latn" },
  { code: "bn-BD", name: "Bengali — Bangladesh (Kitabul Mokaddos · ঈসা মসীহ)", autonym: "বাংলা (বাংলাদেশ)", dir: "ltr", script: "Beng" },
  { code: "bn-IN", name: "Bengali — West Bengal / Traditional (প্রভু যীশু)", autonym: "বাংলা (ভারত/প্রচলিত)", dir: "ltr", script: "Beng" },
  { code: "fr", name: "Français", autonym: "Français", dir: "ltr", script: "Latn" },
  { code: "pt", name: "Português", autonym: "Português", dir: "ltr", script: "Latn" },
  { code: "it", name: "Italiano", autonym: "Italiano", dir: "ltr", script: "Latn" },
  { code: "id", name: "Bahasa Indonesia", autonym: "Bahasa Indonesia", dir: "ltr", script: "Latn" },
  { code: "tr", name: "Türkçe", autonym: "Türkçe", dir: "ltr", script: "Latn" },
  { code: "ru", name: "Русский", autonym: "Русский", dir: "ltr", script: "Cyrl" },
  { code: "zh-Hans", name: "Chino Simplificado", autonym: "简体中文", dir: "ltr", script: "Hans" },
  { code: "ja", name: "Japonés", autonym: "日本語", dir: "ltr", script: "Jpan" },
  { code: "ko", name: "Coreano", autonym: "한국어", dir: "ltr", script: "Kore" },
  { code: "hi", name: "Hindi", autonym: "हिन्दी", dir: "ltr", script: "Deva" },
  { code: "bn", name: "Bengalí", autonym: "বাংলা", dir: "ltr", script: "Beng" },
  { code: "ar", name: "Árabe", autonym: "العربية", dir: "rtl", script: "Arab" },
  { code: "ur", name: "Urdu", autonym: "اردو", dir: "rtl", script: "Aran" },
  { code: "fa", name: "Persa", autonym: "فارسی", dir: "rtl", script: "Arab" },
]);

const TOTAL_PLATES = 28;
let currentPlateIndex = 24;
let currentPaperFormat = "a4";

const uiCatalogCache = new Map();
const felicesContentCache = new Map();

export function resolveDistLangSlug(lang) {
  const raw = String(lang || "en").trim();
  if (raw === "zh-Hans" || raw === "zh") return "zh";
  if (raw === "bn-BD" || raw === "bn-IN" || raw === "bn") return "bn";
  const pack = LANGUAGE_PACKS.find((p) => p.code === raw);
  return pack ? pack.code : "en";
}

export function getPlateUrl(idx = currentPlateIndex) {
  const clamped = Math.max(1, Math.min(TOTAL_PLATES, Number(idx) || 1));
  const num = String(clamped).padStart(2, "0");
  return `/assets/felices/plates/${num}.jpg`;
}

/**
 * Resolves UI strings for a locale from loaded catalogs, falling back strictly to `en` (never `es`).
 */
export function resolveFelicesStrings(locale, catalogsByLocale = {}) {
  const rawEn = catalogsByLocale.en || uiCatalogCache.get("en") || {};
  const rawLoc = catalogsByLocale[locale] || uiCatalogCache.get(locale) || {};
  const enCat = rawEn.messages || rawEn;
  const locCat = rawLoc.messages || rawLoc;
  const parentCode = String(locale || "").includes("-")
    ? String(locale).split("-")[0]
    : null;
  const rawParent =
    (parentCode && (catalogsByLocale[parentCode] || uiCatalogCache.get(parentCode))) ||
    {};
  const parentCat = rawParent.messages || rawParent;

  const out = {};
  const allKeys = new Set([
    ...Object.keys(enCat),
    ...Object.keys(parentCat),
    ...Object.keys(locCat),
  ]);
  for (const key of allKeys) {
    if (!key.startsWith("felices.")) continue;
    const shortKey = key.slice("felices.".length);
    const val =
      locCat[key] !== undefined && locCat[key] !== ""
        ? locCat[key]
        : parentCat[key] !== undefined && parentCat[key] !== ""
          ? parentCat[key]
          : enCat[key];
    if (val !== undefined) {
      out[shortKey] = val;
      out[key] = val;
    }
  }
  return out;
}

/**
 * Resolves plate verse text from `web/data/felices/<locale>.json` with fallback to `en`.
 */
export function resolveFelicesPlateVerse(idx, locale, contentByLocale = {}) {
  const key = String(idx);
  const enData = contentByLocale.en || felicesContentCache.get("en") || {};
  const locData = contentByLocale[locale] || felicesContentCache.get(locale) || {};
  const parentCode = String(locale || "").includes("-")
    ? String(locale).split("-")[0]
    : null;
  const parentData =
    (parentCode &&
      (contentByLocale[parentCode] || felicesContentCache.get(parentCode))) ||
    {};

  const locVerses = locData.plate_verses || locData.plateVerses || {};
  const parentVerses = parentData.plate_verses || parentData.plateVerses || {};
  const enVerses = enData.plate_verses || enData.plateVerses || {};
  const raw =
    locVerses[key] ||
    parentVerses[key] ||
    enVerses[key] ||
    `Plate ${idx}`;

  if (locale === "bn-BD") {
    return raw
      .replace(/প্রভু যীশুর আনন্দময় মানুষ/g, "ঈসা মসীহের মোবারক মানুষ")
      .replace(/প্রভু যীশু/g, "ঈসা মসীহ")
      .replace(/স্বর্গরাজ্যে/g, "আসমানের রাজ্যে")
      .replace(/স্বর্গরাজ্য/g, "আসমানের রাজ্য")
      .replace(/মথি/g, "মতী");
  }
  return raw;
}

export async function ensureLocaleLoaded(locale, fetchFn = typeof fetch === "function" ? fetch : null) {
  const targets = new Set(["en", locale]);
  if (String(locale || "").includes("-")) {
    targets.add(String(locale).split("-")[0]);
  }
  if (!fetchFn) return;
  for (const loc of targets) {
    if (!loc) continue;
    if (!uiCatalogCache.has(loc)) {
      try {
        const r = await fetchFn(`/i18n/${loc}.json`);
        if (r && r.ok) uiCatalogCache.set(loc, await r.json());
      } catch {
        // ignore network miss, fallback to en
      }
    }
    if (!felicesContentCache.has(loc)) {
      try {
        const r = await fetchFn(`/data/felices/${loc}.json`);
        if (r && r.ok) felicesContentCache.set(loc, await r.json());
      } catch {
        // ignore network miss, fallback to en
      }
    }
  }
}

export function updateDownloadLinks(doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return null;
  const lang = doc.getElementById("langSelect")?.value || "en";
  const distLang = resolveDistLangSlug(lang);
  const sheetsLink = doc.getElementById("linkSheets");
  const bookletLink = doc.getElementById("linkBooklet");
  const sheetsName = `felices-${distLang}-v1-sheets.pdf`;
  const bookletName = `felices-${distLang}-v1-booklet.pdf`;
  const sheetsHref = `/dist/${distLang}/v1/mostrador/${sheetsName}`;
  const bookletHref = `/dist/${distLang}/v1/mostrador/${bookletName}`;
  if (sheetsLink) {
    sheetsLink.href = sheetsHref;
    sheetsLink.setAttribute("download", sheetsName);
  }
  if (bookletLink) {
    bookletLink.href = bookletHref;
    bookletLink.setAttribute("download", bookletName);
  }
  return { distLang, sheetsHref, bookletHref, paperFormat: currentPaperFormat };
}

export function setPaperFormat(fmt, doc = typeof document !== "undefined" ? document : null) {
  currentPaperFormat = fmt === "letter" ? "letter" : "a4";
  if (!doc) return currentPaperFormat;
  const btnA4 = doc.getElementById("toggleA4");
  const btnCarta = doc.getElementById("toggleCarta");
  if (btnA4 && btnCarta) {
    const isA4 = currentPaperFormat === "a4";
    btnA4.classList.toggle("active", isA4);
    btnA4.setAttribute("aria-checked", isA4 ? "true" : "false");
    btnCarta.classList.toggle("active", !isA4);
    btnCarta.setAttribute("aria-checked", !isA4 ? "true" : "false");
  }
  updateDownloadLinks(doc);
  return currentPaperFormat;
}

export function updateFocalPlate(doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return;
  const lang = doc.getElementById("langSelect")?.value || "en";
  const t = resolveFelicesStrings(lang);
  const plateLabel = t.plateLabel || "Plate";
  const img = doc.getElementById("focalPlateImg");
  const indicator = doc.getElementById("plateIndexText");
  const verse = doc.getElementById("focalPlateVerse");
  if (img) {
    img.src = getPlateUrl(currentPlateIndex);
    img.alt = `${plateLabel} ${currentPlateIndex} / ${TOTAL_PLATES}`;
  }
  if (indicator) indicator.textContent = `${plateLabel} ${currentPlateIndex} / ${TOTAL_PLATES}`;
  if (verse) verse.textContent = resolveFelicesPlateVerse(currentPlateIndex, lang);
}

export function nextPlate(doc) {
  currentPlateIndex = currentPlateIndex < TOTAL_PLATES ? currentPlateIndex + 1 : 1;
  updateFocalPlate(doc);
}

export function prevPlate(doc) {
  currentPlateIndex = currentPlateIndex > 1 ? currentPlateIndex - 1 : TOTAL_PLATES;
  updateFocalPlate(doc);
}

const ALLOWED_PLATE_MODALS = new Set(["previewModal", "plateModal"]);

export function openModal(id, doc = typeof document !== "undefined" ? document : null) {
  if (!ALLOWED_PLATE_MODALS.has(String(id || ""))) return;
  const m = doc?.getElementById(id);
  if (m && typeof m.showModal === "function") m.showModal();
}

export function closeModal(id, doc = typeof document !== "undefined" ? document : null) {
  if (!ALLOWED_PLATE_MODALS.has(String(id || ""))) return;
  const m = doc?.getElementById(id);
  if (m && typeof m.close === "function") m.close();
}

export async function syncFelicesWithCorpusLang(corpusLang, doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return;
  await ensureLocaleLoaded(corpusLang);
  updateFocalPlate(doc);
}

export async function updateUI(doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return;
  const lang = doc.getElementById("langSelect")?.value || "en";
  await ensureLocaleLoaded(lang);
  const pack = LANGUAGE_PACKS.find((p) => p.code === lang) || LANGUAGE_PACKS[0];
  const t = resolveFelicesStrings(lang);
  doc.documentElement.lang = pack.code;
  doc.documentElement.dir = pack.dir;
  const setTxt = (id, val) => {
    const el = doc.getElementById(id);
    if (el && val) el.textContent = val;
  };
  setTxt("categoryBadge", t.badge);
  setTxt("workTitle", t.title);
  setTxt("workDesc", t.desc);
  setTxt("btnTitleSheets", t.btnTitleSheets);
  setTxt("btnSubSheets", t.btnSubSheets);
  setTxt("btnTitleBooklet", t.btnTitleBooklet);
  setTxt("btnSubBooklet", t.btnSubBooklet);
  setTxt("opticalTriggerText", t.opticalTrigger);
  setTxt("offlineBadgeText", t.offlineBadge);
  setTxt("footerNote", t.footerNote);
  setTxt("btnPrintPlateText", t.btnPrintPlate);
  setTxt("btnShareWorkText", t.btnShare);
  setTxt("foldGuideTrigger", t.foldGuideTrigger);
  setTxt("nameCarta", t.nameCarta);
  setTxt("subCarta", t.subCarta || t.labelCartaSub);
  setTxt("nameA4", t.nameA4);
  setTxt("subA4", t.subA4 || t.labelA4Sub);
  setTxt("focalPlateZoomHintText", t.tapToZoom);
  updateDownloadLinks(doc);
  updateFocalPlate(doc);
}

if (typeof window !== "undefined") {
  Object.assign(window, {
    LANGUAGE_PACKS,
    resolveDistLangSlug,
    getPlateUrl,
    resolveFelicesStrings,
    resolveFelicesPlateVerse,
    updateDownloadLinks,
    setPaperFormat,
    updateFocalPlate,
    nextPlate,
    prevPlate,
    openModal,
    closeModal,
    updateUI,
  });
}
