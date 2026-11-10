// @ekovoz-spec[REQ-BIB-011 | Decisiones 1C, 21C | test_geographic_3_tap_funnel_and_subregions]
// Embudo soberano de 7,164 idiomas (Glottolog 4.8 / ISO 639-3) — Ekovoz Mostrador Ronda 20.
// Cero dependencias de Node.js. Opera en navegador sobre shards/region_01..12.json y data/catalog.json.

export const ISO1_TO_ISO3 = Object.freeze({
  es: "spa",
  en: "eng",
  stp: "stp",
  he: "heb",
  ar: "arb",
  ja: "jpn",
  hi: "hin",
  pt: "por",
  fr: "fra",
  de: "deu",
  ru: "rus",
  zh: "zho",
  ko: "kor",
  id: "ind",
  tr: "tur",
  vi: "vie",
  bn: "ben",
  ur: "urd",
  fa: "pes",
  sw: "swh",
});

export const ISO3_TO_ISO1 = Object.freeze(
  Object.fromEntries(Object.entries(ISO1_TO_ISO3).map(([k, v]) => [v, k])),
);

export const MACRO_REGION_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

export const REGION_SLUG_TO_ID = Object.freeze({
  "americas-mesoamerica": 1,
  "americas-south": 2,
  "americas-north": 3,
  "europe-west": 4,
  "europe-east-caucasus": 5,
  "mena": 6,
  "africa-west": 7,
  "africa-east-horn": 8,
  "africa-central-south": 9,
  "asia-south": 10,
  "asia-east-se": 11,
  "oceania-pacific": 12,
});

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

export function normalizeLangSearchToken(input) {
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
  const list = Array.isArray(catalog?.languages) ? catalog.languages : [];
  for (const entry of list) {
    if (!entry || typeof entry.code !== "string") continue;
    const code = entry.code.toLowerCase();
    const iso3 = (entry.iso639_3 || ISO1_TO_ISO3[code] || code).toLowerCase();
    byCode.set(code, entry);
    byIso3.set(iso3, entry);
  }
  return { byIso3, byCode };
}

export function formatBilingualLangLabel(record) {
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

export function enrichLanguageTuple(tuple, macroRegionId, catalogLookup) {
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
  const isDraft = tier === "seed_draft_field_review_l1_l5";
  const sovereignSeal = hasText
    ? isDraft
      ? "TIER_2_FIELD_DRAFT"
      : "TIER_1_CANONICAL"
    : "TIER_3_4_PIONEER";

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

export function enrichRegionShard(shard, catalog) {
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
  for (const entry of Array.isArray(catalog?.languages) ? catalog.languages : []) {
    const iso3 = (entry.iso639_3 || ISO1_TO_ISO3[entry.code] || entry.code || "").toLowerCase();
    if (!iso3 || byIso.has(iso3)) continue;
    const rec = enrichLanguageTuple(
      [iso3, entry.exonym || entry.code, entry.autonym || entry.code, ""],
      entry.macro_region_id || 1,
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
