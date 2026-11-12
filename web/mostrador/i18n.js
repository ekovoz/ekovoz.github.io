// web/mostrador/i18n.js — Motor de internacionalización de la interfaz (Ronda 20, S07, Decisión D11).
//
// Principios:
//   - Idioma de la interfaz (UI) ≠ idioma de lectura (contenido). Este módulo solo gobierna la UI.
//   - Inglés por defecto: el HTML se entrega en inglés; los demás catálogos se cargan bajo demanda.
//   - Negociación RFC 4647 (lookup) con guardas de escritura y padres CLDR; nunca se sirve una
//     escritura que el lector no pidió (zh-TW no recibe zh-Hans).
//   - Plurales con Intl.PluralRules y números con Intl.NumberFormat (0 KB de librería).
//   - Los mensajes nunca contienen HTML: se aplican con textContent.
//
// Sin dependencias de Node: funciona igual en el navegador y en `node --test`.

export const DEFAULT_LOCALE = "en";

/** Subetiquetas probables (CLDR likelySubtags) para idiomas cuya escritura decide el texto. */
const LIKELY_SCRIPT_BY_LANGUAGE = {
  zh: "Hans",
  sr: "Cyrl",
  pa: "Guru",
  uz: "Latn",
  az: "Latn",
  ha: "Latn",
  mn: "Cyrl",
};

/** Escritura implícita por región (CLDR likelySubtags) para los idiomas con más de una escritura. */
const SCRIPT_BY_LANGUAGE_REGION = {
  zh: { TW: "Hant", HK: "Hant", MO: "Hant", CN: "Hans", SG: "Hans", MY: "Hans" },
  pa: { PK: "Arab", IN: "Guru" },
  sr: { ME: "Latn", RS: "Cyrl", BA: "Cyrl" },
  uz: { AF: "Arab", UZ: "Latn" },
  az: { IR: "Arab", AZ: "Latn" },
  ha: { SD: "Arab", NG: "Latn", NE: "Latn" },
};

/** Padres explícitos de CLDR (parentLocales) que no se obtienen truncando la etiqueta. */
const CLDR_PARENT_LOCALES = {
  "es-MX": "es-419",
  "es-AR": "es-419",
  "es-CO": "es-419",
  "es-CL": "es-419",
  "es-PE": "es-419",
  "es-US": "es-419",
  "es-419": "es",
  "pt-AO": "pt-PT",
  "pt-MZ": "pt-PT",
  "pt-PT": "pt",
  "en-IN": "en-001",
  "en-GB": "en-001",
  "en-AU": "en-001",
  "en-001": "en",
};

/** Descompone una etiqueta BCP 47 en idioma, escritura y región (sin validar el registro IANA). */
function parseTag(tag) {
  const parts = String(tag || "")
    .trim()
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean);
  const language = (parts.shift() || "").toLowerCase();
  let script = null;
  let region = null;
  for (const part of parts) {
    if (!script && /^[A-Za-z]{4}$/.test(part)) {
      script = part[0].toUpperCase() + part.slice(1).toLowerCase();
    } else if (!region && /^([A-Za-z]{2}|\d{3})$/.test(part)) {
      region = part.toUpperCase();
    }
  }
  return { language, script, region };
}

/** Normaliza una etiqueta a la forma canónica `idioma[-Escritura][-REGIÓN]`. */
function canonicalTag(tag) {
  const { language, script, region } = parseTag(tag);
  return [language, script, region].filter(Boolean).join("-");
}

/** Escritura efectiva de una etiqueta: explícita, implícita por región o probable por idioma. */
export function effectiveScript(tag) {
  const { language, script, region } = parseTag(tag);
  if (script) return script;
  if (region && SCRIPT_BY_LANGUAGE_REGION[language] && SCRIPT_BY_LANGUAGE_REGION[language][region]) {
    return SCRIPT_BY_LANGUAGE_REGION[language][region];
  }
  return LIKELY_SCRIPT_BY_LANGUAGE[language] || null;
}

/** Cadena de búsqueda de una etiqueta: padres CLDR, escritura probable y truncamiento, sin cruzar de escritura. */
export function lookupChain(tag) {
  const chain = [];
  const { language, script } = parseTag(tag);
  const effScript = effectiveScript(tag);
  let current = canonicalTag(tag);
  while (current) {
    if (!chain.includes(current)) chain.push(current);
    if (CLDR_PARENT_LOCALES[current]) {
      current = CLDR_PARENT_LOCALES[current];
      continue;
    }
    const cut = current.lastIndexOf("-");
    if (cut > 0) {
      const next = current.slice(0, cut);
      if (next === language && !script && effScript) {
        const withScript = `${language}-${effScript}`;
        if (!chain.includes(withScript)) chain.push(withScript);
      }
      current = next;
    } else {
      if (current === language && !script && effScript) {
        const withScript = `${language}-${effScript}`;
        if (!chain.includes(withScript)) chain.push(withScript);
      }
      current = "";
    }
  }
  return chain;
}

/**
 * Elige el mejor locale disponible para la lista de preferencias del usuario (RFC 4647 lookup).
 * Un candidato solo es válido si su escritura efectiva coincide con la del pedido.
 */
export function negotiate(requested, available, fallback = DEFAULT_LOCALE) {
  const wanted = (Array.isArray(requested) ? requested : [requested]).filter(Boolean);
  const byCanonical = new Map(available.map((code) => [canonicalTag(code).toLowerCase(), code]));
  for (const tag of wanted) {
    const wantedScript = effectiveScript(tag);
    for (const candidate of lookupChain(tag)) {
      const hit = byCanonical.get(candidate.toLowerCase());
      if (!hit) continue;
      const candidateScript = effectiveScript(hit);
      if (wantedScript && candidateScript && wantedScript !== candidateScript) continue;
      return hit;
    }
  }
  return available.includes(fallback) ? fallback : available[0];
}

function findClosingBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parsePluralOptions(body) {
  const options = {};
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i += 1;
    const start = i;
    while (i < body.length && !/[\s{]/.test(body[i])) i += 1;
    const selector = body.slice(start, i);
    while (i < body.length && /\s/.test(body[i])) i += 1;
    if (body[i] !== "{" || !selector) break;
    const end = findClosingBrace(body, i);
    if (end < 0) break;
    options[selector] = body.slice(i + 1, end);
    i = end + 1;
  }
  return options;
}

/**
 * Formatea un mensaje con el subconjunto de ICU MessageFormat admitido:
 * `{nombre}` y `{n, plural, =0 {…} one {…} other {…}}` (con `#` = número formateado).
 */
export function formatMessage(message, params = {}, locale = DEFAULT_LOCALE) {
  let out = "";
  let i = 0;
  const text = String(message);
  while (i < text.length) {
    const ch = text[i];
    if (ch !== "{") {
      out += ch;
      i += 1;
      continue;
    }
    const end = findClosingBrace(text, i);
    if (end < 0) {
      out += text.slice(i);
      break;
    }
    const inner = text.slice(i + 1, end);
    const pluralMatch = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(inner);
    if (pluralMatch) {
      const value = Number(params[pluralMatch[1]]);
      const options = parsePluralOptions(pluralMatch[2]);
      const category = new Intl.PluralRules(locale).select(value);
      const chosen = options[`=${value}`] ?? options[category] ?? options.other ?? "";
      const formattedNumber = new Intl.NumberFormat(locale).format(value);
      out += formatMessage(chosen.replace(/#/g, formattedNumber), params, locale);
    } else {
      const name = inner.trim();
      const value = params[name];
      if (typeof value === "number") out += new Intl.NumberFormat(locale).format(value);
      else if (value !== undefined && value !== null) out += String(value);
      else out += `{${name}}`;
    }
    i = end + 1;
  }
  return out;
}

function extractMessagesDict(catalog) {
  if (!catalog || typeof catalog !== "object") return null;
  if (catalog.messages && typeof catalog.messages === "object") return catalog.messages;
  return catalog;
}

/**
 * Crea un motor de i18n. Soporta tanto `loadCatalog(locale)` asíncrono como catálogos precargados
 * (`{ locale, catalog, fallbackCatalog }` o `{ locale, catalogs }`).
 */
export function createI18n(opts = {}) {
  const {
    loadCatalog: userLoadCatalog,
    available: userAvailable,
    defaultLocale = DEFAULT_LOCALE,
    locale: initialLocale,
    catalog: singleCatalog,
    fallbackCatalog,
    catalogs: preloadedCatalogs,
  } = opts;

  const preloaded = new Map();
  if (preloadedCatalogs && typeof preloadedCatalogs === "object") {
    for (const [k, v] of Object.entries(preloadedCatalogs)) {
      if (v) preloaded.set(k, v);
    }
  }
  if (fallbackCatalog) preloaded.set(defaultLocale, fallbackCatalog);
  if (singleCatalog) preloaded.set(initialLocale || defaultLocale, singleCatalog);

  const loadCatalog =
    typeof userLoadCatalog === "function"
      ? userLoadCatalog
      : async (code) => preloaded.get(code) || null;

  const available = Array.isArray(userAvailable) && userAvailable.length > 0
    ? userAvailable
    : [...new Set([defaultLocale, ...(initialLocale ? [initialLocale] : []), ...preloaded.keys()])];

  const cache = new Map(preloaded);
  const missing = new Set();
  const initialCandidates = requestedUiLocales({
    search: opts.search || "",
    savedPreference: initialLocale || null,
    navigatorLanguages: Array.isArray(opts.navigatorLanguages) ? opts.navigatorLanguages : [],
  });
  let locale = initialCandidates[0] || initialLocale || defaultLocale;
  let chain = [...new Set([locale, defaultLocale])];

  async function catalogFor(code) {
    if (!cache.has(code)) {
      let loaded = (await loadCatalog(code)) || null;
      if (!loaded && (code === "en-XA" || code === "ar-XB")) {
        const baseCat = (await loadCatalog(defaultLocale)) || cache.get(defaultLocale);
        if (baseCat) loaded = pseudoLocalizeCatalog(baseCat, code);
      }
      cache.set(code, loaded);
    }
    return cache.get(code);
  }

  async function setLocale(requested) {
    const chosen = negotiate(requested, available, defaultLocale);
    const nextChain = [];
    for (const candidate of [...lookupChain(chosen), defaultLocale]) {
      const hit = available.find((code) => canonicalTag(code).toLowerCase() === candidate.toLowerCase());
      if (hit && !nextChain.includes(hit) && (await catalogFor(hit))) nextChain.push(hit);
    }
    if (!nextChain.includes(defaultLocale) && (await catalogFor(defaultLocale))) nextChain.push(defaultLocale);
    locale = nextChain[0] || defaultLocale;
    chain = nextChain;
    return locale;
  }

  function resolve(key) {
    for (const code of chain) {
      const dict = extractMessagesDict(cache.get(code));
      if (dict && typeof dict[key] === "string") {
        return { message: dict[key], from: code };
      }
    }
    return null;
  }

  function t(key, params = {}) {
    const hit = resolve(key);
    if (!hit) {
      missing.add(key);
      return key;
    }
    return formatMessage(hit.message, params, hit.from);
  }

  function meta() {
    const catalog = cache.get(locale);
    return (catalog && (catalog.meta || catalog._meta)) || { locale, dir: isRtlLocale(locale) ? "rtl" : "ltr" };
  }

  function coverage() {
    const base = extractMessagesDict(cache.get(defaultLocale)) || {};
    const own = extractMessagesDict(cache.get(locale)) || {};
    const keys = Object.keys(base).filter((k) => !k.startsWith("_"));
    if (keys.length === 0) return 0;
    const present = keys.filter((k) => typeof own[k] === "string").length;
    return present / keys.length;
  }

  function formatNumber(value, options = {}) {
    return new Intl.NumberFormat(locale, options).format(value);
  }

  function applyToDom(root, params = {}) {
    const doc = root && root.ownerDocument ? root.ownerDocument : root;
    const effectiveParams = {
      book: params.book || "JHN",
      chapter: params.chapter ?? 1,
      verse: params.verse ?? 1,
      lang: params.lang || locale,
      uiLocale: params.uiLocale || locale,
      ...params,
    };
    for (const el of root.querySelectorAll("[data-i18n]")) {
      const key = el.getAttribute("data-i18n");
      const hit = resolve(key);
      if (!hit) {
        missing.add(key);
        continue;
      }
      el.textContent = formatMessage(hit.message, effectiveParams, hit.from);
    }
    for (const el of root.querySelectorAll("[data-i18n-attr]")) {
      for (const pair of el.getAttribute("data-i18n-attr").split(";")) {
        const [attr, key] = pair.split(":").map((s) => s && s.trim());
        if (attr && key) {
          const hit = resolve(key);
          if (hit) {
            el.setAttribute(attr, formatMessage(hit.message, effectiveParams, hit.from));
          } else {
            missing.add(key);
          }
        }
      }
    }
    if (doc && doc.documentElement) {
      doc.documentElement.setAttribute("lang", locale);
      doc.documentElement.setAttribute("dir", meta().dir === "rtl" ? "rtl" : "ltr");
      if (typeof doc.documentElement.innerHTML === "string" && cache.size > 0) {
        const bij = verifyDataI18nCatalogBijection(
          doc.documentElement.innerHTML,
          Object.fromEntries(cache),
        );
        for (const key of bij.keys) {
          if (!resolve(key)) missing.add(key);
        }
      }
    }
  }

  return {
    setLocale,
    t,
    meta,
    coverage,
    formatNumber,
    applyToDom,
    get locale() {
      return locale;
    },
    get chain() {
      return [...chain];
    },
    get missingKeys() {
      return [...missing];
    },
  };
}

/**
 * Preferencias de UI en orden: `?ui=` en la URL, preferencia guardada solo si el usuario la activó,
 * y `navigator.languages`.
 */
export function requestedUiLocales({ search = "", savedPreference = null, navigatorLanguages = [] } = {}) {
  const params = new URLSearchParams(search);
  const fromUrl = params.get("ui");
  return [fromUrl, savedPreference, ...navigatorLanguages].filter((v) => typeof v === "string" && v.trim());
}

const PSEUDO_ACCENTS = {
  a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í", j: "ĵ", k: "ķ", l: "ļ", m: "ɱ",
  n: "ñ", o: "ó", p: "þ", q: "ǫ", r: "ŕ", s: "š", t: "ţ", u: "ú", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
  A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í", J: "Ĵ", K: "Ķ", L: "Ļ", M: "Ṁ",
  N: "Ñ", O: "Ó", P: "Þ", Q: "Ǫ", R: "Ŕ", S: "Š", T: "Ţ", U: "Ú", V: "Ṽ", W: "Ŵ", X: "Ẋ", Y: "Ý", Z: "Ž",
};

function pseudoText(text, mode) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "{") {
      const end = findClosingBrace(text, i);
      if (end > 0) {
        const inner = text.slice(i + 1, end);
        const plural = /^(\s*\w+\s*,\s*plural\s*,)([\s\S]*)$/.exec(inner);
        if (plural) {
          const options = parsePluralOptions(plural[2]);
          const rebuilt = Object.entries(options)
            .map(([sel, body]) => `${sel} {${pseudoText(body, mode)}}`)
            .join(" ");
          out += `{${plural[1]} ${rebuilt}}`;
        } else {
          out += text.slice(i, end + 1);
        }
        i = end + 1;
        continue;
      }
    }
    out += mode === "accented" ? PSEUDO_ACCENTS[text[i]] || text[i] : text[i];
    i += 1;
  }
  return out;
}

export function applyToDom(root, i18nInstance, params = {}) {
  if (i18nInstance && typeof i18nInstance.applyToDom === "function" && root && typeof root.querySelectorAll === "function") {
    i18nInstance.applyToDom(root, params);
    return;
  }
  if (!root || !i18nInstance) return;
  const docEl = root.documentElement;
  if (docEl && typeof docEl.setAttribute === "function") {
    const loc = i18nInstance.locale || "en";
    docEl.setAttribute("lang", loc);
    docEl.setAttribute("dir", isRtlLocale(loc) ? "rtl" : "ltr");
  }
}

const RTL_LANG_SET = new Set(["ar", "ur", "fa", "he", "ar-xb", "ps", "sd", "ug", "yi", "dv", "ckb"]);

/**
 * Biyección 1:1 `data-i18n` ↔ catálogos (`D1-R44`, `INV-ERG-25`): devuelve, por locale, las claves
 * `data-i18n="…"` del HTML estático que no existen como cadena en `catalog.messages`. Un resultado vacío
 * garantiza que `applyToDom` nunca deje texto obsoleto ni mezcle idiomas en el cromo.
 */
export function verifyDataI18nCatalogBijection(htmlText, catalogsByLocale = {}) {
  const keys = [...new Set([...String(htmlText || "").matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1].trim()))]
    .filter(Boolean)
    .sort();
  const missingByLocale = {};
  for (const [locale, catalog] of Object.entries(catalogsByLocale || {})) {
    const messages = extractMessagesDict(catalog);
    const missing = keys.filter((k) => typeof messages[k] !== "string" || messages[k].trim() === "");
    if (missing.length > 0) missingByLocale[locale] = missing;
  }
  return { keys, missingByLocale, ok: Object.keys(missingByLocale).length === 0 };
}

export function isRtlLocale(tag) {
  const clean = String(tag || "").trim().toLowerCase();
  if (RTL_LANG_SET.has(clean)) return true;
  const { language, script } = parseTag(tag);
  return RTL_LANG_SET.has(language) || script === "Arab" || script === "Hebr" || script === "Aran";
}

export function formatLocalizedNumeralWeb(n, lang = "en") {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n ?? "");
  const clean = String(lang || "en").toLowerCase();
  try {
    if (clean === "ar") return new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(num);
    if (clean === "fa" || clean === "ur") return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(num);
    if (clean === "hi") return new Intl.NumberFormat("hi-IN-u-nu-deva", { useGrouping: false }).format(num);
    if (clean.startsWith("bn")) return new Intl.NumberFormat("bn-BD-u-nu-beng", { useGrouping: false }).format(num);
  } catch {
    // fallback ASCII
  }
  return String(num);
}

/**
 * Pseudo-localización determinista de un catálogo (práctica estándar de QA de i18n):
 * `en-XA` acentúa cada letra y alarga el texto ~40 % (detecta textos fijos y desbordes a 360 px);
 * `ar-XB` envuelve cada mensaje en marcas RLM y declara `dir: rtl` (detecta roturas en derecha a izquierda).
 * Los marcadores `{nombre}` y las estructuras plurales se conservan intactos.
 */
export function pseudoLocalizeCatalog(catalog, locale) {
  const accented = locale === "en-XA";
  const messages = {};
  for (const [key, value] of Object.entries(catalog.messages || {})) {
    if (accented) {
      const body = pseudoText(value, "accented");
      const padding = "~".repeat(Math.max(1, Math.ceil(value.length * 0.4)));
      messages[key] = `[${body} ${padding}]`;
    } else {
      messages[key] = `\u200F${pseudoText(value, "plain")}\u200F`;
    }
  }
  return {
    meta: {
      ...(catalog.meta || {}),
      locale,
      autonym: locale,
      dir: accented ? "ltr" : "rtl",
      status: "pseudo",
    },
    messages,
  };
}

/**
 * Localiza de forma coherente el cromo primario de obras, el selector unificado
 * de idioma/corpus y los selectores de Felices / Evangelios (Apple HIG R36 — Decisiones 1A y 2A).
 */
export function localizeWorkChromeLabels(locale = DEFAULT_LOCALE) {
  const clean = String(locale || DEFAULT_LOCALE).trim().toLowerCase();
  const isEs = clean.startsWith("es");
  const isPt = clean.startsWith("pt");
  const isFr = clean.startsWith("fr");

  if (isEs) {
    return {
      bibliaTab: "📖 Biblia (66)",
      felicesTab: "🎨 Dichas (8)",
      evangeliosTab: "🌅 Los Evangelios (52)",
      corpusPrefix: "Biblia",
      uiLabel: "Interfaz",
      compassBtn: "🧭 Brújula",
      dichaLabels: [
        "1 · Pobres en espíritu (Mt 5:3)",
        "2 · Los que lloran (Mt 5:4)",
        "3 · Mansos y humildes (Mt 5:5)",
        "4 · Hambre y sed de justicia (Mt 5:6)",
        "5 · Misericordiosos (Mt 5:7)",
        "6 · Limpios de corazón (Mt 5:8)",
        "7 · Pacificadores (Mt 5:9)",
        "8 · Perseguidos por la justicia (Mt 5:10)",
      ],
      plateLabels: [
        "Lámina 1 · El Umbral",
        "Lámina 2 · La Semilla",
        "Lámina 3 · El Renuevo",
        "Lámina 4 · El Fruto",
        "Lámina 5 · La Cosecha",
        "Lámina 6 · La Plenitud",
      ],
      openInBible: "📖 Abrir Mateo 5 en Biblia",
      registerPulse: {
        siglo21: "🌡️ Contemporáneo · μ=80.6 · ΔAoA −3.1a",
        clasico: "🏛️ Clásico · μ=64.2 · Base histórica",
        ninos: "🌱 Niños · AoA ≤ 8.5a · Lectura guiada",
        facil: "🤝 Lectura fácil · NSM-65 · Claridad máxima",
        original: "📜 Matriz original · WLC / SRGNT · 14 col",
      },
    };
  }

  if (isPt) {
    return {
      bibliaTab: "📖 Bíblia (66)",
      felicesTab: "🎨 Bem-aventuranças (8)",
      evangeliosTab: "🌅 Os Evangelhos (52)",
      corpusPrefix: "Bíblia",
      uiLabel: "Interface",
      compassBtn: "🧭 Bússola",
      dichaLabels: [
        "1 · Humildes de espírito (Mt 5:3)",
        "2 · Os que choram (Mt 5:4)",
        "3 · Mansos (Mt 5:5)",
        "4 · Fome e sede de justiça (Mt 5:6)",
        "5 · Misericordiosos (Mt 5:7)",
        "6 · Limpos de coração (Mt 5:8)",
        "7 · Pacificadores (Mt 5:9)",
        "8 · Perseguidos pela justiça (Mt 5:10)",
      ],
      plateLabels: [
        "Lâmina 1 · O Limiar",
        "Lâmina 2 · A Semente",
        "Lâmina 3 · O Rebento",
        "Lâmina 4 · O Fruto",
        "Lâmina 5 · A Colheita",
        "Lâmina 6 · A Plenitude",
      ],
      openInBible: "📖 Abrir Mateus 5 na Bíblia",
      registerPulse: {
        siglo21: "🌡️ Contemporâneo · μ=80.6 · ΔAoA −3.1a",
        clasico: "🏛️ Clássico · μ=64.2 · Base histórica",
        ninos: "🌱 Crianças · AoA ≤ 8.5a · Leitura guiada",
        facil: "🤝 Leitura fácil · NSM-65 · Clareza máxima",
        original: "📜 Matriz original · WLC / SRGNT · 14 col",
      },
    };
  }

  if (isFr) {
    return {
      bibliaTab: "📖 Bible (66)",
      felicesTab: "🎨 Béatitudes (8)",
      evangeliosTab: "🌅 Les Évangiles (52)",
      corpusPrefix: "Bible",
      uiLabel: "Interface",
      compassBtn: "🧭 Boussole",
      dichaLabels: [
        "1 · Pauvres en esprit (Mt 5:3)",
        "2 · Ceux qui pleurent (Mt 5:4)",
        "3 · Doux (Mt 5:5)",
        "4 · Faim et soif de justice (Mt 5:6)",
        "5 · Miséricordieux (Mt 5:7)",
        "6 · Cœurs purs (Mt 5:8)",
        "7 · Artisans de paix (Mt 5:9)",
        "8 · Persécutés pour la justice (Mt 5:10)",
      ],
      plateLabels: [
        "Planche 1 · Le Seuil",
        "Planche 2 · La Semence",
        "Planche 3 · Le Bourgeon",
        "Planche 4 · Le Fruit",
        "Planche 5 · La Moisson",
        "Planche 6 · La Plénitude",
      ],
      openInBible: "📖 Ouvrir Matthieu 5 dans la Bible",
      registerPulse: {
        siglo21: "🌡️ Contemporain · μ=80.6 · ΔAoA −3.1a",
        clasico: "🏛️ Classique · μ=64.2 · Base historique",
        ninos: "🌱 Enfants · AoA ≤ 8.5a · Lecture guidée",
        facil: "🤝 Lecture facile · NSM-65 · Clarté maximale",
        original: "📜 Matrice originale · WLC / SRGNT · 14 col",
      },
    };
  }

  return {
    bibliaTab: "📖 Bible (66)",
    felicesTab: "🎨 Beatitudes (8)",
    evangeliosTab: "🌅 The Gospels (52)",
    corpusPrefix: "Bible",
    uiLabel: "UI",
    compassBtn: "🧭 Compass",
    dichaLabels: [
      "1 · Poor in spirit (Matt 5:3)",
      "2 · Those who mourn (Matt 5:4)",
      "3 · The meek (Matt 5:5)",
      "4 · Hunger for righteousness (Matt 5:6)",
      "5 · The merciful (Matt 5:7)",
      "6 · Pure in heart (Matt 5:8)",
      "7 · The peacemakers (Matt 5:9)",
      "8 · Persecuted for righteousness (Matt 5:10)",
    ],
    plateLabels: [
      "Plate 1 · The Threshold",
      "Plate 2 · The Seed",
      "Plate 3 · The Shoot",
      "Plate 4 · The Fruit",
      "Plate 5 · The Harvest",
      "Plate 6 · The Fullness",
    ],
    openInBible: "📖 Open Matthew 5 in Bible",
    registerPulse: {
      siglo21: "🌡️ Contemporary · μ=80.6 · ΔAoA −3.1y",
      clasico: "🏛️ Classic · μ=64.2 · Historical baseline",
      ninos: "🌱 Children · AoA ≤ 8.5y · Guided reading",
      facil: "🤝 Easy read · NSM-65 · Maximum clarity",
      original: "📜 Original matrix · WLC / SRGNT · 14 col",
    },
  };
}

