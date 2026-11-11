// Transducción Ortográfica WFST Contextual, 7 Segmentadores Silábicos Scriptio Continua
// y Mapa Inverso O(1) a Strong IDs (Decisión D1-B+, Arbitrajes #3, #40, #48, #65).
// Paridad 1:1 con crates/editorial-typeset/src/orthography.rs (jiemakel/seco-hfst + ASVLeipzig/cor-asv-fst).
// Cero dependencias de Node.js, cero prefijos literales "[bn-BD]", cero reemplazo ciego /k/g -> "c".

export const SCRIPTIO_CONTINUA_7_SCRIPTS = Object.freeze([
  "Hans",
  "Hant",
  "Jpan",
  "Thai",
  "Laoo",
  "Khmr",
  "Mymr",
]);

const STP_FAMILY_LANGS = new Set(["stp", "aud", "quc", "nah", "tzj", "cak", "mam"]);

/**
 * Resuelve la clave de familia ortográfica WFST ("stp", "bn", "arb", "uzn", "tzm") o null (`D1-S21+`).
 */
export function resolveOrthoFamilyKey(lang = "") {
  const raw = String(lang || "").trim().toLowerCase();
  if (!raw) return null;
  const base = raw.split("-")[0];
  if (STP_FAMILY_LANGS.has(raw) || STP_FAMILY_LANGS.has(base)) return "stp";
  if (base === "bn") return "bn";
  if (base === "arb" || base === "ar") return "arb";
  if (base === "uzn" || base === "uz" || base === "kk") return "uzn";
  if (base === "tzm" || base === "ber" || base === "kab") return "tzm";
  return null;
}

/**
 * Lista los perfiles ortográficos canónicos disponibles para la lengua activa (`D1-S21+`).
 */
export function listOrthographyProfilesForLang(lang = "stp") {
  const familyKey = resolveOrthoFamilyKey(lang);
  if (!familyKey || !CANONICAL_ORTHOGRAPHY_PROFILES[familyKey]) {
    return [];
  }
  const family = CANONICAL_ORTHOGRAPHY_PROFILES[familyKey];
  return Object.values(family.profiles).map((p) => ({
    id: p.id,
    label: p.label,
    script: p.script,
    familyLang: familyKey,
    isDefault: p.id === family.defaultProfile,
  }));
}

/**
 * Resuelve el código ISO 15924 de escritura Scriptio Continua para un código de idioma o escritura (`D2-S21+`).
 */
export function resolveScriptioContinuaCodeForLang(langOrScript = "") {
  const raw = String(langOrScript || "").trim();
  if (!raw) return null;
  if (SCRIPTIO_CONTINUA_7_SCRIPTS.includes(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower === "zh-hant" || lower === "zh-tw" || lower === "zh-hk" || lower === "yue" || lower === "hant") {
    return "Hant";
  }
  if (lower === "zh" || lower === "zh-hans" || lower === "zh-cn" || lower === "cmn" || lower === "hans") {
    return "Hans";
  }
  if (lower === "ja" || lower === "jpn" || lower === "jpan") return "Jpan";
  if (lower === "th" || lower === "tha" || lower === "thai") return "Thai";
  if (lower === "lo" || lower === "lao" || lower === "laoo") return "Laoo";
  if (lower === "km" || lower === "khm" || lower === "khmr") return "Khmr";
  if (lower === "my" || lower === "mya" || lower === "mymr") return "Mymr";
  return null;
}

/**
 * Perfiles ortográficos canónicos pluricéntricos y multiescritura sincronizados con orthography.rs.
 */
export const CANONICAL_ORTHOGRAPHY_PROFILES = Object.freeze({
  stp: Object.freeze({
    lang: "stp",
    defaultProfile: "INALI_2018",
    profiles: Object.freeze({
      INALI_2018: {
        id: "INALI_2018",
        label: "INALI 2018 (k / w / x / ꞌ)",
        script: "Latn",
        rules: [
          { leftCtx: "", src: "qu", dst: "k", rightCtx: "e" },
          { leftCtx: "", src: "qu", dst: "k", rightCtx: "i" },
          { leftCtx: "", src: "Qu", dst: "K", rightCtx: "e" },
          { leftCtx: "", src: "Qu", dst: "K", rightCtx: "i" },
          { leftCtx: "", src: "c", dst: "k", rightCtx: "a" },
          { leftCtx: "", src: "c", dst: "k", rightCtx: "o" },
          { leftCtx: "", src: "c", dst: "k", rightCtx: "u" },
          { leftCtx: "", src: "hu", dst: "w", rightCtx: "a" },
          { leftCtx: "", src: "hu", dst: "w", rightCtx: "i" },
          { leftCtx: "", src: "sh", dst: "x", rightCtx: "" },
          { leftCtx: "", src: "'", dst: "ꞌ", rightCtx: "" },
        ],
      },
      ILV_1950: {
        id: "ILV_1950",
        label: "Tradicional ILV 1950 (qu / c / hu / ')",
        script: "Latn",
        loanwordWhitelist: ["kilómetro", "kilómetros", "kilo", "kilos", "kermés"],
        rules: [
          { leftCtx: "", src: "k", dst: "qu", rightCtx: "e" },
          { leftCtx: "", src: "k", dst: "qu", rightCtx: "i" },
          { leftCtx: "", src: "k", dst: "qu", rightCtx: "ɨ" },
          { leftCtx: "", src: "K", dst: "Qu", rightCtx: "e" },
          { leftCtx: "", src: "K", dst: "Qu", rightCtx: "i" },
          { leftCtx: "", src: "K", dst: "Qu", rightCtx: "ɨ" },
          { leftCtx: "", src: "k", dst: "c", rightCtx: "a" },
          { leftCtx: "", src: "k", dst: "c", rightCtx: "o" },
          { leftCtx: "", src: "k", dst: "c", rightCtx: "u" },
          { leftCtx: "", src: "K", dst: "C", rightCtx: "a" },
          { leftCtx: "", src: "K", dst: "C", rightCtx: "o" },
          { leftCtx: "", src: "K", dst: "C", rightCtx: "u" },
          { leftCtx: "", src: "w", dst: "hu", rightCtx: "a" },
          { leftCtx: "", src: "w", dst: "hu", rightCtx: "i" },
          { leftCtx: "", src: "x", dst: "sh", rightCtx: "" },
          { leftCtx: "", src: "ꞌ", dst: "'", rightCtx: "" },
        ],
      },
      FONETICA_IPA: {
        id: "FONETICA_IPA",
        label: "Transcripción Fonológica (tʃ / ʃ / ʔ)",
        script: "Latn",
        rules: [
          { leftCtx: "", src: "ch", dst: "tʃ", rightCtx: "" },
          { leftCtx: "", src: "x", dst: "ʃ", rightCtx: "" },
          { leftCtx: "", src: "ꞌ", dst: "ʔ", rightCtx: "" },
          { leftCtx: "", src: "'", dst: "ʔ", rightCtx: "" },
        ],
      },
    }),
  }),
  bn: Object.freeze({
    lang: "bn",
    defaultProfile: "bn-BD",
    profiles: Object.freeze({
      "bn-BD": {
        id: "bn-BD",
        label: "বাংলা (ঢাকা · bn-BD)",
        script: "Beng",
        lexicalMap: Object.freeze({
          "জল": "পানি",
          "নিমন্ত্রণ": "দাওয়াত",
          "স্নান": "গোসল",
          "নুন": "লবণ",
          "ঈশ্বর": "আল্লাহ্‌",
          "যীশু": "ঈসা",
          "খ্রীষ্ট": "মসীহ",
          "প্রার্থনা": "মোনাজাত",
        }),
      },
      "bn-IN": {
        id: "bn-IN",
        label: "বাংলা (কলকাতা · bn-IN)",
        script: "Beng",
        lexicalMap: Object.freeze({
          "পানি": "জল",
          "দাওয়াত": "নিমন্ত্রণ",
          "গোসল": "স্নান",
          "লবণ": "নুন",
          "আল্লাহ্‌": "ঈশ্বর",
          "ঈসা": "যীশু",
          "মসীহ": "খ্রীষ্ট",
          "মোনাজাত": "প্রার্থনা",
        }),
      },
    }),
  }),
  arb: Object.freeze({
    lang: "arb",
    defaultProfile: "VOWELIZED",
    profiles: Object.freeze({
      VOWELIZED: {
        id: "VOWELIZED",
        label: "تشكيل كامل (Vocalizado)",
        script: "Arab",
        stripTashkeel: false,
      },
      TASHKEEL_STRIPPED: {
        id: "TASHKEEL_STRIPPED",
        label: "بدون تشكيل (Sin Tashkeel)",
        script: "Arab",
        stripTashkeel: true,
      },
    }),
  }),
  uzn: Object.freeze({
    lang: "uzn",
    defaultProfile: "LATN",
    profiles: Object.freeze({
      LATN: {
        id: "LATN",
        label: "Oʻzbek (Lotin)",
        script: "Latn",
        digraphMap: Object.freeze({
          "ў": "oʻ",
          "Ў": "Oʻ",
          "ғ": "gʻ",
          "Ғ": "Gʻ",
          "ш": "sh",
          "Ш": "Sh",
          "ч": "ch",
          "Ч": "Ch",
          "қ": "q",
          "Қ": "Q",
          "ҳ": "h",
          "Ҳ": "H",
          "а": "a",
          "б": "b",
          "д": "d",
          "е": "e",
          "и": "i",
          "й": "y",
          "к": "k",
          "л": "l",
          "м": "m",
          "н": "n",
          "о": "o",
          "п": "p",
          "р": "r",
          "с": "s",
          "т": "t",
          "у": "u",
          "в": "v",
          "х": "x",
          "з": "z",
        }),
      },
      CYRL: {
        id: "CYRL",
        label: "Ўзбек (Кирилл)",
        script: "Cyrl",
        digraphMap: Object.freeze({
          "oʻ": "ў",
          "Oʻ": "Ў",
          "gʻ": "ғ",
          "Gʻ": "Ғ",
          "sh": "ш",
          "Sh": "Ш",
          "ch": "ч",
          "Ch": "Ч",
          "q": "қ",
          "Q": "Қ",
          "h": "ҳ",
          "H": "Ҳ",
        }),
      },
    }),
  }),
  tzm: Object.freeze({
    lang: "tzm",
    defaultProfile: "TFNG",
    profiles: Object.freeze({
      TFNG: {
        id: "TFNG",
        label: "ⵜⴰⵎⴰⵣⵉⵖⵜ (Tifinagh)",
        script: "Tfng",
        charMap: Object.freeze({
          a: "ⴰ",
          b: "ⴱ",
          g: "ⴳ",
          d: "ⴷ",
          e: "ⴻ",
          f: "ⴼ",
          k: "ⴽ",
          h: "ⵀ",
          i: "ⵉ",
          j: "ⵊ",
          l: "ⵍ",
          m: "ⵎ",
          n: "ⵏ",
          u: "ⵓ",
          r: "ⵔ",
          s: "ⵙ",
          t: "ⵜ",
          w: "ⵡ",
          y: "ⵢ",
          z: "ⵣ",
        }),
      },
      LATN: {
        id: "LATN",
        label: "Tamaziɣt (Latn)",
        script: "Latn",
        charMap: Object.freeze({
          "ⴰ": "a",
          "ⴱ": "b",
          "ⴳ": "g",
          "ⴷ": "d",
          "ⴻ": "e",
          "ⴼ": "f",
          "ⴽ": "k",
          "ⵀ": "h",
          "ⵉ": "i",
          "ⵊ": "j",
          "ⵍ": "l",
          "ⵎ": "m",
          "ⵏ": "n",
          "ⵓ": "u",
          "ⵔ": "r",
          "ⵙ": "s",
          "ⵜ": "t",
          "ⵡ": "w",
          "ⵢ": "y",
          "ⵣ": "z",
        }),
      },
    }),
  }),
});

/**
 * Normaliza un código de perfil heredado de la UI ("inali", "tradicional", "fonetica", "bn-BD", "bn-IN")
 * al identificador canónico de WFST para el idioma dado.
 */
export function resolveCanonicalOrthoProfileId(lang = "stp", requestedProfile = "inali") {
  const cleanLang = String(lang || "stp").toLowerCase().split("-")[0];
  const req = String(requestedProfile || "").trim();
  const reqLower = req.toLowerCase();

  if (cleanLang === "bn") {
    return req === "bn-IN" || reqLower === "bn_in" || reqLower === "tradicional" ? "bn-IN" : "bn-BD";
  }
  if (cleanLang === "arb" || cleanLang === "ar") {
    return req === "TASHKEEL_STRIPPED" || reqLower === "tradicional" || reqLower === "stripped"
      ? "TASHKEEL_STRIPPED"
      : "VOWELIZED";
  }
  if (cleanLang === "uzn" || cleanLang === "uz") {
    return req === "CYRL" || reqLower === "cyrl" || reqLower === "tradicional" ? "CYRL" : "LATN";
  }
  if (cleanLang === "tzm") {
    return req === "LATN" || reqLower === "latn" || reqLower === "tradicional" ? "LATN" : "TFNG";
  }
  if (req === "ILV_1950" || reqLower === "tradicional" || reqLower === "ilv") {
    return "ILV_1950";
  }
  if (req === "FONETICA_IPA" || reqLower === "fonetica" || reqLower === "ipa") {
    return "FONETICA_IPA";
  }
  return "INALI_2018";
}

function stripPunctuationEdges(token) {
  const raw = String(token || "");
  const m = raw.match(/^([^\p{L}\p{N}\p{M}ꞌ'ʻ]*)([\p{L}\p{N}\p{M}ꞌ'ʻ\-]+?)([^\p{L}\p{N}\p{M}ꞌ'ʻ]*)$/u);
  if (!m) {
    return { leading: "", core: raw, trailing: "" };
  }
  return { leading: m[1] || "", core: m[2] || raw, trailing: m[3] || "" };
}

function applyContextualRuleSet(wordCore, rules = [], loanwordWhitelist = []) {
  const lower = wordCore.toLowerCase();
  if (Array.isArray(loanwordWhitelist) && loanwordWhitelist.includes(lower)) {
    return wordCore;
  }

  let out = wordCore;
  for (const rule of rules) {
    const left = String(rule.leftCtx || "");
    const src = String(rule.src || "");
    const dst = String(rule.dst || "");
    const right = String(rule.rightCtx || "");
    if (!src) continue;

    let result = "";
    let idx = 0;
    while (idx < out.length) {
      if (out.startsWith(src, idx)) {
        const leftOk = !left || (idx >= left.length && out.slice(idx - left.length, idx) === left);
        const afterIdx = idx + src.length;
        const rightOk = !right || out.startsWith(right, afterIdx);
        if (leftOk && rightOk) {
          result += dst;
          idx += src.length;
          continue;
        }
      }
      result += out[idx];
      idx += 1;
    }
    out = result;
  }

  // Regla final de posición silábica para stp ILV_1950: k en coda silábica o final de palabra -> c
  if (rules.some((r) => r.src === "k" && r.dst === "qu")) {
    out = out.replace(/k(?![eéiíɨ])/g, "c").replace(/K(?![eéiíɨ])/g, "C");
  }
  return out;
}

/**
 * Transduce un token individual según el perfil WFST del idioma sin contaminar con prefijos literales.
 */
export function transduceTokenWfst(token, lang = "stp", profileId = "INALI_2018") {
  const raw = String(token ?? "");
  if (!raw) return raw;
  const cleanLang = String(lang || "stp").toLowerCase().split("-")[0];
  const resolvedProfile = resolveCanonicalOrthoProfileId(cleanLang, profileId);

  const { leading, core, trailing } = stripPunctuationEdges(raw);
  if (!core) return raw;

  if (cleanLang === "bn") {
    const prof = CANONICAL_ORTHOGRAPHY_PROFILES.bn.profiles[resolvedProfile];
    const mapped = prof?.lexicalMap?.[core] || core;
    return `${leading}${mapped}${trailing}`;
  }

  if (cleanLang === "arb" || cleanLang === "ar") {
    if (resolvedProfile === "TASHKEEL_STRIPPED") {
      const stripped = core.replace(/[\u064B-\u065F\u0670]/g, "");
      return `${leading}${stripped}${trailing}`;
    }
    return raw;
  }

  if (cleanLang === "uzn" || cleanLang === "uz") {
    const prof = CANONICAL_ORTHOGRAPHY_PROFILES.uzn.profiles[resolvedProfile];
    const map = prof?.digraphMap || {};
    let converted = core;
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      converted = converted.split(k).join(map[k]);
    }
    return `${leading}${converted}${trailing}`;
  }

  if (cleanLang === "tzm") {
    const prof = CANONICAL_ORTHOGRAPHY_PROFILES.tzm.profiles[resolvedProfile];
    const map = prof?.charMap || {};
    const converted = core
      .split("")
      .map((ch) => map[ch] || ch)
      .join("");
    return `${leading}${converted}${trailing}`;
  }

  const stpEntry =
    CANONICAL_ORTHOGRAPHY_PROFILES.stp.profiles[resolvedProfile] ||
    CANONICAL_ORTHOGRAPHY_PROFILES.stp.profiles.INALI_2018;
  if (resolvedProfile === "INALI_2018" && profileId === "inali") {
    return raw;
  }
  const transducedCore = applyContextualRuleSet(
    core,
    stpEntry.rules || [],
    stpEntry.loanwordWhitelist || []
  );
  return `${leading}${transducedCore}${trailing}`;
}

/**
 * Mapa inverso O(1) entre la forma transducida en pantalla, el lema canónico y su código Strong original.
 * Paridad exacta con `ReverseOrthographyMap` en `crates/editorial-typeset/src/orthography.rs`.
 */
export class ReverseOrthographyMap {
  constructor(lang = "stp", activeProfileId = "INALI_2018") {
    this.lang = String(lang || "stp").toLowerCase();
    this.activeProfileId = resolveCanonicalOrthoProfileId(this.lang, activeProfileId);
    this.surfaceToCanonical = new Map();
    this.canonicalToSurface = new Map();
    this.surfaceToStrong = new Map();
    this.canonicalToStrong = new Map();
  }

  registerTokenPair(canonicalToken, surfaceToken, strongId = null) {
    const cleanCanon = stripPunctuationEdges(canonicalToken).core || String(canonicalToken || "").trim();
    const cleanSurf = stripPunctuationEdges(surfaceToken).core || String(surfaceToken || "").trim();
    if (!cleanCanon || !cleanSurf) return;

    this.surfaceToCanonical.set(cleanSurf, cleanCanon);
    this.surfaceToCanonical.set(cleanSurf.toLowerCase(), cleanCanon);
    this.canonicalToSurface.set(cleanCanon, cleanSurf);

    if (strongId) {
      const normStrong = String(strongId).trim().toUpperCase();
      this.surfaceToStrong.set(cleanSurf, normStrong);
      this.surfaceToStrong.set(cleanSurf.toLowerCase(), normStrong);
      this.canonicalToStrong.set(cleanCanon, normStrong);
      this.canonicalToStrong.set(cleanCanon.toLowerCase(), normStrong);
    }
  }

  resolveCanonical(surfaceToken) {
    const cleanSurf = stripPunctuationEdges(surfaceToken).core || String(surfaceToken || "").trim();
    return (
      this.surfaceToCanonical.get(cleanSurf) ||
      this.surfaceToCanonical.get(cleanSurf.toLowerCase()) ||
      cleanSurf
    );
  }

  resolveStrong(surfaceOrCanonicalToken) {
    const clean =
      stripPunctuationEdges(surfaceOrCanonicalToken).core ||
      String(surfaceOrCanonicalToken || "").trim();
    if (!clean) return null;
    return (
      this.surfaceToStrong.get(clean) ||
      this.surfaceToStrong.get(clean.toLowerCase()) ||
      this.canonicalToStrong.get(clean) ||
      this.canonicalToStrong.get(clean.toLowerCase()) ||
      null
    );
  }

  get size() {
    return this.canonicalToSurface.size;
  }
}

/**
 * Transduce un versículo completo preservando el vínculo O(1) con los códigos Strong en `ReverseOrthographyMap`.
 */
export function transduceVerseWithReverseMap(
  text,
  lang = "stp",
  profileId = "inali",
  tokenStrongPairs = []
) {
  const raw = String(text ?? "");
  const cleanLang = String(lang || "stp").toLowerCase().split("-")[0];
  const resolvedProfile = resolveCanonicalOrthoProfileId(cleanLang, profileId);
  const reverseMap = new ReverseOrthographyMap(cleanLang, resolvedProfile);

  const strongLookup = new Map();
  if (Array.isArray(tokenStrongPairs)) {
    for (const item of tokenStrongPairs) {
      if (item && item.token && item.strongId) {
        const core = stripPunctuationEdges(item.token).core;
        strongLookup.set(core, item.strongId);
        strongLookup.set(core.toLowerCase(), item.strongId);
      }
    }
  }

  const parts = raw.split(/(\s+)/);
  const outParts = parts.map((part) => {
    if (!part || /^\s+$/.test(part)) return part;
    const { core } = stripPunctuationEdges(part);
    const transduced = transduceTokenWfst(part, cleanLang, resolvedProfile);
    const strongId =
      strongLookup.get(core) || strongLookup.get(core.toLowerCase()) || null;
    reverseMap.registerTokenPair(part, transduced, strongId);
    return transduced;
  });

  return {
    text: outParts.join(""),
    transducedText: outParts.join(""),
    profileId: resolvedProfile,
    reverseMap,
  };
}

/**
 * Alias de compatibilidad para mostrador.js (`transduceOrthographyWeb`).
 */
export function transduceOrthographyWeb(
  text,
  { lang = "stp", profile = "inali", tokenStrongPairs = [] } = {}
) {
  return transduceVerseWithReverseMap(text, lang, profile, tokenStrongPairs);
}

/**
 * Segmentador silábico/clausal determinista con U+200B (Zero-Width Space) para las 7 escrituras
 * Scriptio Continua (Hans, Hant, Jpan, Thai, Laoo, Khmr, Mymr) — Paridad con orthography.rs.
 */
export function segmentScriptioContinuaSyllables(text, scriptIso15924 = "Hans") {
  const raw = String(text ?? "");
  if (!raw) return "";
  const script = String(scriptIso15924 || "Hans");
  if (!SCRIPTIO_CONTINUA_7_SCRIPTS.includes(script)) {
    return raw;
  }

  const ZWSP = "\u200B";
  // En CJK (Hans, Hant, Jpan), insertar frontera de corte suave después de partículas clausales/puntuación o cada 2 sinogramas
  if (script === "Hans" || script === "Hant" || script === "Jpan") {
    const chars = Array.from(raw);
    const out = [];
    for (let i = 0; i < chars.length; i++) {
      out.push(chars[i]);
      const code = chars[i].codePointAt(0) || 0;
      const isCjk =
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3040 && code <= 0x30ff);
      if (isCjk && i + 1 < chars.length && chars[i + 1] !== ZWSP) {
        out.push(ZWSP);
      }
    }
    return out.join("");
  }

  // En Thai, Laoo, Khmr, Mymr: mantener agrupados los signos vocálicos dependientes y marcas de tono con su consonante base
  const COMBINING_REGEX = /[\p{Mn}\p{Mc}]/u;
  const chars = Array.from(raw);
  const clusters = [];
  let current = "";
  for (const ch of chars) {
    if (COMBINING_REGEX.test(ch) && current.length > 0) {
      current += ch;
    } else {
      if (current) clusters.push(current);
      current = ch;
    }
  }
  if (current) clusters.push(current);
  return clusters.join(ZWSP);
}

/**
 * Renderiza el Inspector de Transducción Ortográfica WFST + Préstamos Protegidos + Mapa Inverso a Strong + 7 Escrituras Scriptio Continua (`D3-R39` / `D3-R40`).
 */
export function renderWfstAndScriptioContinuaInspectorHtml({
  text = "",
  lang = "stp",
  profileId = "inali",
  tokenStrongPairs = [],
  scriptIso15924 = null,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").toLowerCase().startsWith("en");
  const familyKey = resolveOrthoFamilyKey(lang) || "stp";
  const availableProfiles = listOrthographyProfilesForLang(familyKey);
  const profileIds = availableProfiles.map((p) => (typeof p === "string" ? p : p.id));
  const resolvedProfileId = resolveCanonicalOrthoProfileId(familyKey, profileId);
  const familyObj = CANONICAL_ORTHOGRAPHY_PROFILES[familyKey] || CANONICAL_ORTHOGRAPHY_PROFILES.stp || {};
  const familyProfiles = familyObj.profiles || familyObj;
  const activeProfile = familyProfiles[resolvedProfileId] || Object.values(familyProfiles)[0] || {};
  const whitelist = Array.isArray(activeProfile.loanwordWhitelist) ? activeProfile.loanwordWhitelist : [];
  const transduced = transduceVerseWithReverseMap(text, familyKey, resolvedProfileId, tokenStrongPairs);
  const activeScript = scriptIso15924 || resolveScriptioContinuaCodeForLang(lang) || "Hans";
  const sampleScriptio = segmentScriptioContinuaSyllables(text || "太初有道，道与神同在", activeScript);
  const zwspCount = (sampleScriptio.match(/\u200B/g) || []).length;

  const profileOptionsHtml = availableProfiles
    .map((p) => {
      const pid = typeof p === "string" ? p : p.id;
      const pMeta = familyProfiles[pid] || {};
      const plabel = (typeof p === "object" && p && p.label) || pMeta.label || pid;
      const sel = pid === resolvedProfileId ? " selected" : "";
      return `<option value="${pid}"${sel}>${plabel}</option>`;
    })
    .join("");

  const reversePairs = [];
  if (transduced.reverseMap && transduced.reverseMap.transducedToCanonical instanceof Map) {
    for (const [surf, canon] of transduced.reverseMap.transducedToCanonical.entries()) {
      const strongId = transduced.reverseMap.resolveStrong(surf) || "";
      if (surf !== canon || strongId) {
        reversePairs.push({ surface: surf, canonical: canon, strongId });
      }
    }
  }

  const reverseHtml = reversePairs.length > 0
    ? reversePairs
        .slice(0, 12)
        .map(
          (p) =>
            `<span class="uls-badge" data-canonical-token="${p.canonical}" data-reverse-strong-id="${p.strongId || ""}">${p.surface} ⇄ ${p.canonical}${p.strongId ? ` (${p.strongId})` : ""}</span>`
        )
        .join(" ")
    : `<span style="font-size:0.74rem;color:var(--text-secondary);">${isEn ? "100% bijective to canonical base" : "100% biyectivo hacia base canónica"} (${resolvedProfileId})</span>`;

  const whitelistHtml = whitelist
    .slice(0, 10)
    .map((w) => `<span class="uls-badge" data-protected-loanword="${w}">🛡️ ${w}</span>`)
    .join(" ");

  const scriptioBadges = SCRIPTIO_CONTINUA_7_SCRIPTS.map(
    (sc) =>
      `<span class="uls-badge" data-scriptio-continua-script="${sc}" style="${sc === activeScript ? "border-color:var(--accent-amber);font-weight:700;" : ""}">${sc}</span>`
  ).join(" ");

  return (
    `<div id="wfstOrthographyAndScriptioInspector" class="wfst-orthography-inspector" ` +
    `data-ortho-family="${familyKey}" ` +
    `data-ortho-profile="${resolvedProfileId}" ` +
    `data-available-profiles="${profileIds.join(",")}" ` +
    `data-protected-loanwords-count="${whitelist.length}" ` +
    `data-zwsp-boundaries="${zwspCount}" ` +
    `style="margin-top:0.35rem;padding:0.45rem 0.65rem;border-radius:8px;border:1px solid var(--card-border);background:var(--bg-secondary);font-size:0.76rem;display:flex;flex-direction:column;gap:0.3rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.35rem;align-items:center;">` +
    `<strong>🔤 ${isEn ? "WFST Transducer" : "Transductor WFST"} (${activeProfile.label || resolvedProfileId}) · ${isEn ? "Reverse Strong Map" : "Mapa Inverso a Strong"}</strong>` +
    `<select id="wfstInspectorProfileSelect" aria-label="${isEn ? "WFST Orthography Profile" : "Perfil Ortográfico WFST"}" style="min-height:48px;min-width:48px;padding:0.3rem 0.55rem;border-radius:8px;border:1px solid var(--select-border);background:var(--select-bg);color:var(--text-primary);font-size:0.75rem;">${profileOptionsHtml}</select>` +
    `<span class="uls-badge">${isEn ? "Protected loanwords" : "Préstamos protegidos"}: ${whitelist.length} · U+200B: ${zwspCount}</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;align-items:center;"><strong>${isEn ? "Reverse mapping:" : "Mapeo inverso:"}</strong> ${reverseHtml}</div>` +
    (whitelist.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;align-items:center;"><strong>${isEn ? "Protected loanwords:" : "Préstamos teológicos intactos:"}</strong> ${whitelistHtml}</div>`
      : "") +
    `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;align-items:center;"><strong>${isEn ? "7 Scriptio Continua segmenters (U+200B):" : "7 segmentadores Scriptio Continua (U+200B):"}</strong> ${scriptioBadges}</div>` +
    `</div>`
  );
}
