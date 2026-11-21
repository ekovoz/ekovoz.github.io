// @ekovoz-spec[REQ-BIB-011 | Decisiones 1C, 21C | test_geographic_3_tap_funnel_and_subregions]
// Embudo soberano de 7,164 idiomas (Glottolog 4.8 / ISO 639-3) — Ekovoz Mostrador Ronda 20.
// Cero dependencias de Node.js. Opera en navegador sobre shards/region_01..12.json y data/catalog.json.

const ISO1_TO_ISO3 = Object.freeze({
  es: "spa",
  en: "eng",
  stp: "stp",
  he: "heb",
  grc: "grc",
  ar: "arb",
  ja: "jpn",
  hi: "hin",
  pt: "por",
  fr: "fra",
  de: "deu",
  ru: "rus",
  zh: "cmn",
  "zh-hans": "cmn",
  ko: "kor",
  id: "ind",
  it: "ita",
  tr: "tur",
  vi: "vie",
  bn: "ben",
  ur: "urd",
  fa: "pes",
  sw: "swa",
});

const ISO3_TO_ISO1 = Object.freeze({
  ...Object.fromEntries(Object.entries(ISO1_TO_ISO3).map(([k, v]) => [v, k])),
  swh: "sw",
});

const MACRO_REGION_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

const REGION_SLUG_TO_ID = Object.freeze({
  "americas-mesoamerica": 1,
  "americas-andes-amazonia": 1,
  "americas-north": 2,
  "europe-west": 3,
  "europe-east": 4,
  "anatolia-caucasus-central-asia": 5,
  "europe-east-caucasus": 5,
  "mena": 6,
  "africa-north-sahel-horn": 7,
  "africa-subsaharan": 8,
  "africa-west": 8,
  "africa-east-horn": 7,
  "africa-central-south": 8,
  "asia-south": 9,
  "asia-east": 10,
  "asia-southeast": 11,
  "asia-east-se": 11,
  "oceania-pacific": 12,
});

// Tabla directa O(1) de nibbles (26^3 * 4 bits = 8,788 B exactos, ARB-EKOVOZ-104) sobre las 7,164 lenguas vivas ISO-639-3:
// nibbles 1..12 = R01..R12; nibbles 13..15 = subregiones lusófonas en R01/R08/R11 -> lengua puente 'pt' en 0 RTT.
const ISO639_3_NIBBLE_TABLE_8788_B64 =
  "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";

let _cachedIso639NibbleTable8788 = null;

function ensureIso639NibbleTable8788() {
  if (_cachedIso639NibbleTable8788) return _cachedIso639NibbleTable8788;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const rev = new Int8Array(128).fill(-1);
  for (let i = 0; i < 64; i += 1) rev[alphabet.charCodeAt(i)] = i;
  const out = new Uint8Array(8788);
  let outPos = 0;
  const n = ISO639_3_NIBBLE_TABLE_8788_B64.length;
  for (let i = 0; i < n && outPos < 8788; i += 4) {
    const v0 = rev[ISO639_3_NIBBLE_TABLE_8788_B64.charCodeAt(i) & 0x7f];
    const v1 = rev[ISO639_3_NIBBLE_TABLE_8788_B64.charCodeAt(i + 1) & 0x7f];
    const c2 = ISO639_3_NIBBLE_TABLE_8788_B64.charCodeAt(i + 2);
    const c3 = ISO639_3_NIBBLE_TABLE_8788_B64.charCodeAt(i + 3);
    const v2 = c2 === 61 ? 0 : rev[c2 & 0x7f];
    const v3 = c3 === 61 ? 0 : rev[c3 & 0x7f];
    const triple = (v0 << 18) | (v1 << 12) | (v2 << 6) | v3;
    if (outPos < 8788) out[outPos++] = (triple >>> 16) & 0xff;
    if (c2 !== 61 && outPos < 8788) out[outPos++] = (triple >>> 8) & 0xff;
    if (c3 !== 61 && outPos < 8788) out[outPos++] = triple & 0xff;
  }
  _cachedIso639NibbleTable8788 = out;
  return out;
}

/**
 * Resuelve en O(1) (`3` operaciones enteras, `0` RTT de red, `8,788 B` exactos) la macro-región `1..12`
 * y condición lusófona (`pt`) para cualquiera de las `7,164` lenguas vivas `ISO-639-3` (`SLICE-EKO-V2I-21`).
 */
export function lookupIso639MacroRegionO1(isoOrLangCode) {
  const table = ensureIso639NibbleTable8788();
  const raw = String(isoOrLangCode || "").trim().toLowerCase();
  const iso3 = ISO1_TO_ISO3[raw] || (raw.includes("-") ? ISO1_TO_ISO3[raw.split("-")[0]] || raw.split("-")[0] : raw);
  if (iso3.length !== 3) {
    return { found: false, iso639_3: iso3, macroRegionId: 1, isLusophone: false, nibble: 0, tableByteLength: table.byteLength };
  }
  const c0 = iso3.charCodeAt(0) - 97;
  const c1 = iso3.charCodeAt(1) - 97;
  const c2 = iso3.charCodeAt(2) - 97;
  if (c0 < 0 || c0 >= 26 || c1 < 0 || c1 >= 26 || c2 < 0 || c2 >= 26) {
    return { found: false, iso639_3: iso3, macroRegionId: 1, isLusophone: false, nibble: 0, tableByteLength: table.byteLength };
  }
  const idx = c0 * 676 + c1 * 26 + c2;
  const nibble = (table[idx >>> 1] >>> ((idx & 1) << 2)) & 0x0f;
  if (nibble === 0) {
    return { found: false, iso639_3: iso3, macroRegionId: 1, isLusophone: false, nibble: 0, tableByteLength: table.byteLength };
  }
  const isLusophone = nibble >= 13;
  const macroRegionId = nibble === 13 ? 1 : nibble === 14 ? 8 : nibble === 15 ? 11 : nibble;
  return {
    found: true,
    iso639_3: iso3,
    macroRegionId,
    isLusophone,
    nibble,
    tableByteLength: table.byteLength,
  };
}

export function resolveMacroRegionId(regionCodeOrId) {
  if (typeof regionCodeOrId === "number" && Number.isInteger(regionCodeOrId) && regionCodeOrId >= 1 && regionCodeOrId <= 12) {
    return regionCodeOrId;
  }
  const str = String(regionCodeOrId || "").trim().toLowerCase();
  if (REGION_SLUG_TO_ID[str]) return REGION_SLUG_TO_ID[str];
  const m = str.match(/^(?:region[_-]?)?0?([1-9]|1[0-2])$/);
  if (m) return Number(m[1]);
  return 1;
}

function normalizeLangSearchToken(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’ʼ`´]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0080-\uffff]+/g, " ")
    .trim();
}

export function listMacroRegions(i18n) {
  return MACRO_REGION_IDS.map((id) => {
    const key = `region.${id}`;
    const label = i18n && typeof i18n.t === "function" ? i18n.t(key) : key;
    return {
      id,
      key,
      label,
      shardFile: `region_${String(id).padStart(2, "0")}.json`,
    };
  });
}

function buildCatalogLookup(catalog) {
  const byIso3 = new Map();
  const byCode = new Map();
  const mergeList = (items, defaults = {}) => {
    if (!Array.isArray(items)) return;
    for (const rawEntry of items) {
      if (!rawEntry || typeof rawEntry.code !== "string") continue;
      const code = rawEntry.code.toLowerCase();
      const iso3 = (rawEntry.iso639_3 || ISO1_TO_ISO3[code] || code).toLowerCase();
      const normalized = {
        ...defaults,
        ...rawEntry,
        code: rawEntry.code,
        iso639_3: iso3,
        direction: rawEntry.direction || rawEntry.dir || defaults.direction || "ltr",
        has_text: rawEntry.has_text ?? defaults.has_text ?? false,
        has_blocks: rawEntry.has_blocks ?? defaults.has_blocks ?? false,
        tier:
          rawEntry.tier ||
          defaults.tier ||
          (rawEntry.sovereign_tier === "TIER_3_PORTION_LADDER"
            ? "tier_3_portion_ladder"
            : rawEntry.draft_status === "seed_draft" ||
              rawEntry.sovereign_tier === "TIER_2_NT_PLUS_OT_SYNTH"
              ? "canonical_nt_human_ot_draft"
              : "canonical_human_complete"),
      };
      if (!byCode.has(code)) byCode.set(code, normalized);
      if (!byIso3.has(iso3)) byIso3.set(iso3, normalized);
    }
  };
  mergeList(catalog?.languages);
  mergeList(catalog?.ekpack_languages_21, { has_text: true, has_blocks: true });
  mergeList(catalog?.tier3_portion_languages, {
    has_text: true,
    has_blocks: false,
    tier: "tier_3_portion_ladder",
  });
  return { byIso3, byCode };
}

function formatBilingualLangLabel(record) {
  const iso = record.iso639_3;
  const cleanAutonym = String(record.autonym || "")
    .replace(new RegExp(`\\s*\\(${iso}\\)\\s*$`, "i"), "")
    .trim();
  const cleanExonym = String(record.exonym || "")
    .replace(new RegExp(`\\s*\\(${iso}\\)\\s*$`, "i"), "")
    .trim();

  if (cleanAutonym && cleanExonym && cleanAutonym.toLowerCase() !== cleanExonym.toLowerCase()) {
    return `${cleanAutonym} · ${cleanExonym} (${iso})`;
  }
  const primary = cleanAutonym || cleanExonym || iso;
  return `${primary} (${iso})`;
}

function enrichLanguageTuple(tuple, macroRegionId, catalogLookup) {
  if (!Array.isArray(tuple) || tuple.length < 3) {
    return null;
  }
  const iso639_3 = String(tuple[0] || "").trim().toLowerCase();
  if (!iso639_3) {
    return null;
  }
  const exonym = String(tuple[1] || iso639_3).trim();
  const autonym = String(tuple[2] || exonym).trim();
  const rawSubregions = String(tuple[3] || "");
  const subregions = rawSubregions
    .split(",")
    .map((s) => s.trim().replace(/_/g, " "))
    .filter(Boolean);

  const catEntry =
    catalogLookup.byIso3.get(iso639_3) ||
    catalogLookup.byCode.get(iso639_3) ||
    (ISO3_TO_ISO1[iso639_3] ? catalogLookup.byCode.get(ISO3_TO_ISO1[iso639_3]) : null) ||
    null;

  const code = catEntry?.code || ISO3_TO_ISO1[iso639_3] || iso639_3;
  const tier = catEntry?.tier || "glottolog_4_8_index_only";
  const hasText = Boolean(catEntry?.has_text);
  const hasBlocks = Boolean(catEntry?.has_blocks);
  const isDraft =
    tier === "seed_draft_field_review_l1_l5" || tier === "canonical_nt_human_ot_draft";
  const isTier3Portion =
    tier === "tier_3_portion_ladder" || catEntry?.sovereign_tier === "TIER_3_PORTION_LADDER";
  const sovereignSeal = !hasText
    ? "TIER_3_4_PIONEER"
    : isTier3Portion
      ? "TIER_3_PORTION_LADDER"
      : isDraft
        ? "TIER_2_FIELD_DRAFT"
        : "TIER_1_CANONICAL";

  const record = {
    iso639_3,
    code,
    exonym: catEntry?.exonym && exonym === iso639_3 ? catEntry.exonym : exonym,
    autonym: catEntry?.autonym && autonym.startsWith(exonym) ? catEntry.autonym : autonym,
    subregions,
    macroRegionId: Number(macroRegionId) || 1,
    hasText,
    hasBlocks,
    tier,
    isDraft,
    sovereignSeal,
    direction: catEntry?.direction || "ltr",
  };
  record.displayLabel = formatBilingualLangLabel(record);
  record._searchText = normalizeLangSearchToken(
    `${record.iso639_3} ${record.code} ${record.autonym} ${record.exonym} ${record.subregions.join(" ")}`,
  );
  return record;
}

function enrichRegionShard(shard, catalog) {
  const lookup = buildCatalogLookup(catalog);
  const macroRegionId = Number(shard?.macro_region_id) || 1;
  const tuples = Array.isArray(shard?.featured_languages) ? shard.featured_languages : [];
  const languages = [];
  const subregionMap = new Map();

  for (const tuple of tuples) {
    const rec = enrichLanguageTuple(tuple, macroRegionId, lookup);
    if (!rec) continue;
    languages.push(rec);
    const tags = rec.subregions.length > 0 ? rec.subregions : ["General"];
    for (const tag of tags) {
      let bucket = subregionMap.get(tag);
      if (!bucket) {
        bucket = [];
        subregionMap.set(tag, bucket);
      }
      bucket.push(rec);
    }
  }

  return {
    macroRegionId,
    totalLanguages: languages.length,
    languages,
    subregions: Array.from(subregionMap.entries()).map(([name, items]) => ({
      code: name,
      name,
      label: `${name} (${items.length})`,
      total: items.length,
      activeCount: items.filter((l) => l.hasText).length,
      languages: items,
    })),
  };
}

export function indexRegionShards(shards, catalog = { languages: [] }) {
  const lookup = buildCatalogLookup(catalog);
  const byIso = new Map();
  const byCode = new Map();
  const byRegion = new Map();

  for (const shard of Array.isArray(shards) ? shards : []) {
    const enriched = enrichRegionShard(shard, catalog);
    byRegion.set(enriched.macroRegionId, enriched);
    for (const rec of enriched.languages) {
      if (!byIso.has(rec.iso639_3)) {
        byIso.set(rec.iso639_3, rec);
      }
      byCode.set(rec.code, rec);
      byCode.set(rec.iso639_3, rec);
    }
  }

  // Ensure any catalog language not yet loaded from a region shard is also addressable by code/ISO.
  for (const entry of [
    ...(Array.isArray(catalog?.languages) ? catalog.languages : []),
    ...(Array.isArray(catalog?.ekpack_languages_21) ? catalog.ekpack_languages_21 : []),
    ...(Array.isArray(catalog?.tier3_portion_languages) ? catalog.tier3_portion_languages : []),
  ]) {
    const iso3 = (entry.iso639_3 || ISO1_TO_ISO3[entry.code] || entry.code || "").toLowerCase();
    if (!iso3 || byIso.has(iso3)) continue;
    const rec = enrichLanguageTuple(
      [iso3, entry.exonym || entry.code, entry.autonym || entry.code, ""],
      entry.macro_region_id || entry.macro_region || 1,
      lookup,
    );
    if (rec) {
      byIso.set(rec.iso639_3, rec);
      byCode.set(rec.code, rec);
      byCode.set(rec.iso639_3, rec);
    }
  }

  function search(query, options = {}) {
    const normOpts = typeof options === "number" ? { limit: options } : options || {};
    const limit = Number(normOpts.limit) > 0 ? Number(normOpts.limit) : 50;
    const regionFilter = normOpts.macroRegionId ? resolveMacroRegionId(normOpts.macroRegionId) : null;
    const normQuery = normalizeLangSearchToken(query);
    const pool = regionFilter && byRegion.has(regionFilter)
      ? byRegion.get(regionFilter).languages
      : Array.from(byIso.values());

    if (!normQuery) {
      return pool
        .slice()
        .sort((a, b) => Number(b.hasText) - Number(a.hasText) || a.displayLabel.localeCompare(b.displayLabel))
        .slice(0, limit);
    }

    const queryTokens = normQuery.split(/\s+/).filter(Boolean);
    const aliasIso = ISO1_TO_ISO3[normQuery] || normQuery;
    const scored = [];

    for (const rec of pool) {
      const hay = rec._searchText;
      let matchesAll = true;
      for (const tok of queryTokens) {
        const tokAlias = ISO1_TO_ISO3[tok] || tok;
        if (!hay.includes(tok) && !hay.includes(tokAlias)) {
          matchesAll = false;
          break;
        }
      }
      if (!matchesAll) continue;

      let score = 0;
      if (rec.hasText) score += 1000;
      if (rec.iso639_3 === normQuery || rec.code === normQuery || rec.iso639_3 === aliasIso) {
        score += 500;
      } else if (
        normalizeLangSearchToken(rec.autonym).startsWith(normQuery) ||
        normalizeLangSearchToken(rec.exonym).startsWith(normQuery)
      ) {
        score += 200;
      } else {
        score += 50;
      }
      scored.push({ rec, score });
    }

    scored.sort(
      (a, b) => b.score - a.score || a.rec.displayLabel.localeCompare(b.rec.displayLabel),
    );
    return scored.slice(0, limit).map((item) => item.rec);
  }

  function listSubregions(macroRegionId) {
    const resolvedId = resolveMacroRegionId(macroRegionId);
    const region = byRegion.get(resolvedId);
    if (!region) return [];
    return region.subregions
      .slice()
      .sort((a, b) => b.activeCount - a.activeCount || b.total - a.total || a.name.localeCompare(b.name));
  }

  function listByRegion(macroRegionId, subregionName = "") {
    const resolvedId = resolveMacroRegionId(macroRegionId);
    const region = byRegion.get(resolvedId);
    if (!region) return [];
    if (!subregionName) {
      return region.languages
        .slice()
        .sort((a, b) => Number(b.hasText) - Number(a.hasText) || a.displayLabel.localeCompare(b.displayLabel));
    }
    const sub = region.subregions.find((s) => s.name === subregionName || s.code === subregionName);
    if (!sub) return [];
    return sub.languages
      .slice()
      .sort((a, b) => Number(b.hasText) - Number(a.hasText) || a.displayLabel.localeCompare(b.displayLabel));
  }

  function suggestLayer0({ navigatorLanguages = [], timeZone = "" } = {}) {
    const picked = [];
    const seen = new Set();
    const pushCode = (codeOrIso) => {
      const rec = byCode.get(String(codeOrIso || "").toLowerCase());
      if (rec && !seen.has(rec.iso639_3)) {
        seen.add(rec.iso639_3);
        picked.push(rec);
      }
    };

    for (const raw of navigatorLanguages) {
      const primary = String(raw || "").split(/[-_]/)[0].toLowerCase();
      if (primary) pushCode(primary);
    }
    if (/Mexico|Mazatlan|Monterrey|Chihuahua|Hermosillo|Merida/i.test(String(timeZone || ""))) {
      pushCode("es");
      pushCode("stp");
    }
    pushCode("en");
    pushCode("es");
    for (const rec of byIso.values()) {
      if (rec.hasText && !seen.has(rec.iso639_3)) {
        seen.add(rec.iso639_3);
        picked.push(rec);
      }
    }
    return picked;
  }

  return {
    totalUniqueIso: byIso.size,
    byIso,
    byCode,
    byRegion,
    search,
    listSubregions,
    listByRegion,
    suggestLayer0,
  };
}

export const GEOGRAPHIC_MACRO_REGIONS = Object.freeze(
  MACRO_REGION_IDS.map((id) => ({
    id,
    key: `region.${id}`,
    shardFile: `region_${String(id).padStart(2, "0")}.json`,
  }))
);

export function listCountriesInRegion(indexOrShards, macroRegionId) {
  const idx = indexOrShards && typeof indexOrShards.listSubregions === "function"
    ? indexOrShards
    : indexRegionShards(Array.isArray(indexOrShards) ? indexOrShards : []);
  return idx.listSubregions(macroRegionId);
}

export function listLanguagesInCountry(indexOrShards, macroRegionId, subregionName = "") {
  const idx = indexOrShards && typeof indexOrShards.listByRegion === "function"
    ? indexOrShards
    : indexRegionShards(Array.isArray(indexOrShards) ? indexOrShards : []);
  return idx.listByRegion(macroRegionId, subregionName);
}

export function searchLanguages(indexOrShards, query, options = {}) {
  const idx = indexOrShards && typeof indexOrShards.search === "function"
    ? indexOrShards
    : indexRegionShards(Array.isArray(indexOrShards) ? indexOrShards : []);
  return idx.search(query, options);
}

export function suggestLayer0Languages(indexOrShards, options = {}) {
  const idx = indexOrShards && typeof indexOrShards.suggestLayer0 === "function"
    ? indexOrShards
    : indexRegionShards(Array.isArray(indexOrShards) ? indexOrShards : []);
  return idx.suggestLayer0(options);
}
