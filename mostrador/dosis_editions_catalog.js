// ============================================================================
// web/mostrador/dosis_editions_catalog.js — Hidratación, Geometría, Imposición y
// Transductor Braille sobre esquema puro L0 (`dosis_profiles_schema.js`).
// Extraído de dosis.js (SLICE-V2R-05 / SLICE-EKO-V2LC-B02 · 0 ciclos TDZ · 0 Object.freeze)
// ============================================================================

import {
  buildRelativePdfAssetUrl,
  CANONICAL_12_BRANCH_PROFILES,
  CANONICAL_14_PLUS_2_EDITIONS_CATALOG,
  CANONICAL_14_PRINT_PROFILES,
  CANONICAL_16_TYPOLOGY_PROFILES,
  CANONICAL_80_BLOCKS_CATALOG,
  CANONICAL_9_TOML_PROFILES,
  computeMultiSignatureImposition,
  FIELD_PDFS_REGISTRY,
  GOSPEL_14_PERICOPES_SPEC,
  POCKET_REFUGE_4_SHEETS_SPEC,
  PRECOMPILED_PDF_LANGS,
  REFUGE_4_SHEETS_PASSAGES_SPEC,
  resolveCanonicalBlockCode,
  resolveCanonicalBlockForPassage,
  resolvePrecompiledDiskLang,
  VERIFIED_TEXT_BIBLE_LANGS,
} from "./dosis_profiles_schema.js";

export {
  buildRelativePdfAssetUrl,
  CANONICAL_12_BRANCH_PROFILES,
  CANONICAL_14_PLUS_2_EDITIONS_CATALOG,
  CANONICAL_14_PRINT_PROFILES,
  CANONICAL_16_TYPOLOGY_PROFILES,
  CANONICAL_80_BLOCKS_CATALOG,
  CANONICAL_9_TOML_PROFILES,
  computeMultiSignatureImposition,
  FIELD_PDFS_REGISTRY,
  GOSPEL_14_PERICOPES_SPEC,
  POCKET_REFUGE_4_SHEETS_SPEC,
  PRECOMPILED_PDF_LANGS,
  REFUGE_4_SHEETS_PASSAGES_SPEC,
  resolveCanonicalBlockCode,
  resolveCanonicalBlockForPassage,
  resolvePrecompiledDiskLang,
  VERIFIED_TEXT_BIBLE_LANGS
};

const EDITORIAL_PROFILE_PRIMARY_KEY_ALIASES = Object.freeze({
  "one-column-reading": "01_1col_lectura",
  "1col-reading": "01_1col_lectura",
  "1col-a4": "01_1col_lectura",
  "1col-letter": "01_1col_lectura",
  "two-column-bible": "02_2col_pastoral",
  "2col-pastoral": "02_2col_pastoral",
  "2col-letter": "02_2col_pastoral",
  "2col-a4": "02_2col_pastoral",
  "three-column-compact": "03_3col_compacta",
  "3col-compact": "03_3col_compacta",
  "3col-a4": "03_3col_compacta",
  "3col-letter": "03_3col_compacta",
  "large-print": "04_1col_letra_grande",
  "1col-large-print": "04_1col_letra_grande",
  "intergenerational-parallel": "05_interlineal_estudio",
  "interlinear-study": "05_interlineal_estudio",
  "bilingual-parallel": "06_bilingue_paralela",
  "field-review-workbook": "07_cuaderno_5lineas_apaisado",
  "field-notebook-5line": "07_cuaderno_5lineas_apaisado",
  "booklet-pocket": "08_bolsillo_misionero",
  "papel": "09_atril_liturgico",
  "pulpit-folio": "09_atril_liturgico",
  "standard-1col": "10_evangelio_14_pericopas",
  "gospel-14-pericopes": "10_evangelio_14_pericopas",
  "doc": "11_braille_nemeth_b70",
  "braille-nemeth-b70": "11_braille_nemeth_b70",
  "mobile-9x16": "12_dislexia_espaciado_amplio",
  "dyslexia-wide": "12_dislexia_espaciado_amplio",
  "compact-2col": "13_contraste_extremo_baja_vision",
  "low-vision-contrast": "13_contraste_extremo_baja_vision",
  "ultra-compact-3col": "14_pliego_mural_comunitario",
  "mural-sheet-a3": "14_pliego_mural_comunitario",
});

export function hydrateEditorialProfiles(artifact) {
  if (!artifact || typeof artifact !== "object") return false;
  const rawPrint = Array.isArray(artifact.print_profiles_14) && artifact.print_profiles_14.length > 0
    ? artifact.print_profiles_14
    : Array.isArray(artifact.print_profiles) && artifact.print_profiles.length > 0
      ? artifact.print_profiles
      : null;
  if (rawPrint) {
    // D5-V2G (DEBRIS-V2G-10 erradicado): Hidratar estrictamente por llave primaria `id` canónica (`01_..14_`),
    // prohibiendo sobrescribir por posición alfabética (`bilingual-parallel`, `booklet-pocket`, ...).
    const indexByCanonicalId = new Map(
      CANONICAL_14_PRINT_PROFILES.map((item, idx) => [item.id, idx]),
    );
    for (const p of rawPrint) {
      if (!p || typeof p !== "object") continue;
      const rawId = String(p.id || "").trim();
      const canonicalId = EDITORIAL_PROFILE_PRIMARY_KEY_ALIASES[rawId] || rawId;
      const slotIdx = indexByCanonicalId.get(canonicalId);
      if (slotIdx === undefined) continue;
      const prev = CANONICAL_14_PRINT_PROFILES[slotIdx];
      const parsedTypography = p.parsed?.typography || p.parsed?.layout || p.parsed || {};
      const nextCols = Number(p.columns ?? parsedTypography.columns ?? parsedTypography.default_columns ?? prev.columns ?? 2);
      const nextFontPt = Number(p.fontPt ?? p.font_size_pt ?? parsedTypography.font_size_pt ?? parsedTypography.default_font_size_pt ?? prev.fontPt ?? 9.5);
      const nextLeading = Number(p.leadingRatio ?? p.leading_ratio ?? parsedTypography.leading_ratio ?? parsedTypography.line_height_ratio ?? prev.leadingRatio ?? 1.35);
      const nextPaper = p.paperSize || p.paper_size || parsedTypography.paper_size || parsedTypography.paper || prev.paperSize || "A4";
      CANONICAL_14_PRINT_PROFILES[slotIdx] = {
        ...prev,
        ...p,
        id: canonicalId,
        tomlPath: p.tomlPath || p.toml_path || prev.tomlPath || `obras/biblia/profiles/${canonicalId}.toml`,
        columns: nextCols,
        fontPt: nextFontPt,
        leadingRatio: nextLeading,
        paperSize: nextPaper,
      };
    }
    CANONICAL_9_TOML_PROFILES.length = 0;
    const rawToml9 = Array.isArray(artifact.canonical_9_toml_profiles)
      ? artifact.canonical_9_toml_profiles
      : [];
    const toml9ById = new Map();
    for (const item of rawToml9) {
      if (item && typeof item === "object") {
        const rawId = String(item.id || "").trim();
        toml9ById.set(EDITORIAL_PROFILE_PRIMARY_KEY_ALIASES[rawId] || rawId, item);
      }
    }
    for (const p of CANONICAL_14_PRINT_PROFILES.slice(0, 9)) {
      const extra9 = toml9ById.get(p.id);
      CANONICAL_9_TOML_PROFILES.push(
        extra9
          ? {
            ...extra9,
            ...p,
            id: p.id,
            columns: p.columns ?? extra9.columns,
            fontPt: p.fontPt ?? extra9.fontPt,
            paperSize: p.paperSize || extra9.paperSize,
          }
          : p,
      );
    }
  }
  if (Array.isArray(artifact.canonical_9_plus_2_editions) && artifact.canonical_9_plus_2_editions.length >= 16) {
    const prevEdById = new Map(CANONICAL_14_PLUS_2_EDITIONS_CATALOG.map((item) => [item.id, item]));
    CANONICAL_14_PLUS_2_EDITIONS_CATALOG.length = 0;
    for (const ed of artifact.canonical_9_plus_2_editions) {
      CANONICAL_14_PLUS_2_EDITIONS_CATALOG.push({
        ...(prevEdById.get(ed.id) || {}),
        ...ed,
      });
    }
  }
  if (artifact.pocket_refuge_4_sheets_spec && typeof artifact.pocket_refuge_4_sheets_spec === "object") {
    Object.assign(POCKET_REFUGE_4_SHEETS_SPEC, artifact.pocket_refuge_4_sheets_spec);
  }
  if (artifact.field_pdfs && typeof artifact.field_pdfs === "object") {
    for (const [fKey, fVal] of Object.entries(artifact.field_pdfs)) {
      if (fVal && typeof fVal === "object") {
        FIELD_PDFS_REGISTRY[fKey] = {
          bytes: Number(fVal.bytes) || FIELD_PDFS_REGISTRY[fKey]?.bytes || 0,
          path: String(fVal.path || FIELD_PDFS_REGISTRY[fKey]?.path || ""),
        };
      }
    }
  }
  const rawBranches = Array.isArray(artifact.branch_profiles_12) && artifact.branch_profiles_12.length > 0
    ? artifact.branch_profiles_12
    : Array.isArray(artifact.branch_profiles) && artifact.branch_profiles.length > 0
      ? artifact.branch_profiles
      : null;
  if (rawBranches) {
    const prevBrById = new Map(CANONICAL_12_BRANCH_PROFILES.map((item) => [item.id, item]));
    CANONICAL_12_BRANCH_PROFILES.length = 0;
    for (const bp of rawBranches) {
      const prev = prevBrById.get(bp.id) || {};
      CANONICAL_12_BRANCH_PROFILES.push({
        ...prev,
        ...bp,
        tomlPath: bp.tomlPath || bp.toml_path || prev.tomlPath || `obras/biblia/perfiles_ramas/${bp.id}.toml`,
      });
    }
  }
  const rawTypology = Array.isArray(artifact.typology_profiles_16) && artifact.typology_profiles_16.length > 0
    ? artifact.typology_profiles_16.filter((tp) => tp.id !== "swa_typology").slice(0, 16)
    : null;
  if (rawTypology) {
    CANONICAL_16_TYPOLOGY_PROFILES.length = 0;
    for (const tp of rawTypology) {
      const data = tp.data || tp;
      CANONICAL_16_TYPOLOGY_PROFILES.push({
        id: tp.id || `${data.lang_code || "es"}_typology`,
        ...data,
      });
    }
  }
  const rawBlocks = Array.isArray(artifact.canonical_80_blocks_catalog) && artifact.canonical_80_blocks_catalog.length === 80
    ? artifact.canonical_80_blocks_catalog
    : Array.isArray(artifact.blocks_80) && artifact.blocks_80.length === 80
      ? artifact.blocks_80
      : null;
  if (rawBlocks) {
    const blkAliases = { EZE: "EZK", JOE: "JOL", NAH: "NAM", PHI: "PHP", SOL: "SNG" };
    const normBk = (b) => {
      const up = String(b || "").trim().toUpperCase();
      return blkAliases[up] || up;
    };
    CANONICAL_80_BLOCKS_CATALOG.length = 0;
    for (const blk of rawBlocks) {
      const [srBk, srCh] = String(blk.startRef || "GEN.1").split(".");
      const [erBk, erCh] = String(blk.endRef || "GEN.15").split(".");
      const startBook = normBk(blk.startBook || srBk);
      const startChapter = Number(blk.startChapter || srCh) || 1;
      const endBook = normBk(blk.endBook || erBk);
      const endChapter = Number(blk.endChapter || erCh) || 15;
      CANONICAL_80_BLOCKS_CATALOG.push({
        ...blk,
        startBook,
        startChapter,
        endBook,
        endChapter,
        startRef: `${startBook}.${startChapter}`,
        endRef: `${endBook}.${endChapter}`,
      });
    }
  }
  return true;
}

export function renderBranchAndTypologyInspectorHtml({
  lang = "es",
  activeBranchId = "",
  activeTypologyId = "",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanLang = String(lang || "es").toLowerCase().split("-")[0];
  const branches = CANONICAL_12_BRANCH_PROFILES;
  const typologies = CANONICAL_16_TYPOLOGY_PROFILES;

  const matchedBranch =
    branches.find((b) => b.id === activeBranchId) ||
    branches.find((b) => Array.isArray(b.parsed?.anchor_languages) && b.parsed.anchor_languages.includes(cleanLang)) ||
    branches[0] ||
    { id: "G_01_latin_extended", tomlPath: "obras/biblia/profiles/G_01_latin_extended.toml" };

  const matchedTypology =
    typologies.find((t) => t.id === activeTypologyId) ||
    typologies.find((t) => t.lang_code === cleanLang) ||
    typologies[0] ||
    { id: "es_typology", lang_code: "es", word_order: "Vso", family_subclade: "Indo-European::Romance-Iberian" };

  const branchOptions = branches
    .map((b, idx) => {
      const sel = b.id === matchedBranch.id ? " selected" : "";
      const name = b.parsed?.name_es || `${isEn ? "Branch" : "Rama"} G_${String(idx + 1).padStart(2, "0")} · ${b.id}`;
      const order = b.parsed?.word_order || "SVO";
      return `<option value="${b.id}"${sel}>${name} (${order})</option>`;
    })
    .join("");

  const typologyOptions = typologies
    .map((t) => {
      const sel = t.id === matchedTypology.id ? " selected" : "";
      return `<option value="${t.id}"${sel}>${t.id} (${t.lang_code} · ${t.word_order} · ${t.family_subclade})</option>`;
    })
    .join("");

  const bParsed = matchedBranch.parsed || {};
  const specimenOrder = matchedTypology.word_order || bParsed.word_order || "SVO";
  const specimenCopula = matchedTypology.copula_affirmative || "es / is";
  const specimenNeg = matchedTypology.negation_preverbal || "no / not";
  const specimenClause =
    String(specimenOrder).toUpperCase().startsWith("VSO")
      ? `[V: Creó] [S: Dios] [O: los cielos y la tierra] · Cópula=${specimenCopula} · Neg=${specimenNeg}`
      : String(specimenOrder).toUpperCase().startsWith("SOV")
        ? `[S: Dios] [O: los cielos y la tierra] [V: creó] · Cópula=${specimenCopula} · Neg=${specimenNeg}`
        : `[S: Dios] [V: creó] [O: los cielos y la tierra] · Cópula=${specimenCopula} · Neg=${specimenNeg}`;
  return (
    `<div id="bibleBranchAndTypologyInspector" class="branch-typology-inspector-card" data-branch-count="${branches.length}" data-typology-count="${typologies.length}" data-active-branch="${matchedBranch.id}" data-active-typology="${matchedTypology.id}">` +
    `<div class="ek-bold ek-mb-sm">🌐 ${isEn ? "12 Script Branches Inspector (G_01–G_12) & 16 Typological Sheets" : "Inspector de 12 Ramas de Escritura (G_01–G_12) y 16 Hojas Tipológicas"}</div>` +
    `<div class="ek-row-wrap ek-mb-sm">` +
    `<label>${isEn ? "Branch (12)" : "Rama (12)"}: <select id="branchProfileSelect" aria-label="${isEn ? "Typographic Branch G_01 to G_12" : "Rama Tipográfica G_01 a G_12"}">${branchOptions}</select></label>` +
    `<label>${isEn ? "Typology (16)" : "Tipología (16)"}: <select id="typologySheetSelect" aria-label="${isEn ? "Linguistic Typology Sheet (16)" : "Hoja de Tipología Lingüística (16)"}">${typologyOptions}</select></label>` +
    `</div>` +
    `<div class="ek-row-wrap ek-text-secondary">` +
    `<span class="uls-chip ek-badge-compact" data-branch-meta="${matchedBranch.id}">${isEn ? "Branch" : "Rama"}: <strong>${bParsed.name_es || matchedBranch.id}</strong> · ${isEn ? "Order" : "Orden"}=${bParsed.word_order || "SVO"} · ${isEn ? "Morphology" : "Morfología"}=${bParsed.morphology || "FUSIONAL"} · ${isEn ? "Alignment" : "Alineamiento"}=${bParsed.alignment || "NOM_ACC"}</span>` +
    `<span class="uls-chip ek-badge-compact" data-typology-meta="${matchedTypology.id}">${isEn ? "Typology" : "Tipología"}: <strong>${matchedTypology.lang_code}</strong> · ${isEn ? "Order" : "Orden"}=${matchedTypology.word_order} · ${isEn ? "Clade" : "Clade"}=${matchedTypology.family_subclade} · ${isEn ? "Copula" : "Cópula"}=${matchedTypology.copula_affirmative || "∅"} · ${isEn ? "Negation" : "Negación"}=${matchedTypology.negation_preverbal || "∅"}</span>` +
    `</div>` +
    `<div id="branchTypologyLiveSpecimen" data-live-specimen-branch="${matchedBranch.id}" data-live-specimen-typology="${matchedTypology.id}" data-live-specimen-order="${specimenOrder}">` +
    `<strong>🔍 ${isEn ? `Live Morphosyntactic & Typographic Specimen (${matchedBranch.id} · ${matchedTypology.id}):` : `Especimen Morfosintáctico y Tipográfico en Vivo (${matchedBranch.id} · ${matchedTypology.id}):`}</strong> ` +
    `<code>${specimenClause}</code>` +
    `</div>` +
    `</div>`
  );
}

export function renderMultiSignatureAndPocketRefugeHtml({
  totalPages = 160,
  activeBlockNumber = 1,
  dir = "ltr",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const multiSig = computeMultiSignatureImposition({ totalPages, dir });
  const blkIndex = Math.max(1, Math.min(80, Number(activeBlockNumber) || 1)) - 1;
  const blk = CANONICAL_80_BLOCKS_CATALOG[blkIndex] || CANONICAL_80_BLOCKS_CATALOG[0];

  const sigRows = multiSig.signatures
    .slice(0, 5)
    .map(
      (s) =>
        `<span class="uls-chip ek-badge-compact" data-signature-code="${s.signatureCode}">${s.signatureCode} (p.${s.startPage}–${s.endPage} · creep ${s.maxCreepMm}mm · ${isEn ? "mark" : "marca"} Y=${s.steppedCollationMarkYMm}mm)</span>`,
    )
    .join(" ");

  const blockOptionsHtml = CANONICAL_80_BLOCKS_CATALOG.map((item) => {
    const sel = item.blockNumber === blk.blockNumber ? " selected" : "";
    return `<option value="${item.blockNumber}"${sel}>${item.blockId} · ${item.rangeLabel} (${item.testament})</option>`;
  }).join("");

  return (
    `<div class="multi-signature-imposition-card" data-multi-signature="true" data-signature-count="${multiSig.signatureCount}" data-max-creep-mm="${multiSig.maxCreepMm}" data-kl-divergence="${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence}">` +
    `<div class="ek-bold ek-mb-sm">📐 ${isEn ? `4n Multi-Signature Imposition (${multiSig.summary})` : `Imposición Multi-Pliego 4n (${multiSig.summary})`}</div>` +
    `<div class="ek-row-wrap ek-mb-sm">${sigRows}</div>` +
    `<div class="ek-row-wrap ek-mb-sm">` +
    `<label for="canonicalBlockSelect" class="ek-semibold">${isEn ? "Explore 80 Canonical Blocks:" : "Explorar 80 Bloques Canónicos:"}</label>` +
    `<select id="canonicalBlockSelect" data-action="select-canonical-block" aria-label="${isEn ? "Select Canonical Block (1 to 80)" : "Seleccionar Bloque Canónico (1 a 80)"}">${blockOptionsHtml}</select>` +
    `</div>` +
    `<div class="ek-row-between ek-text-secondary">` +
    `<span data-active-field-block="${blk.blockId}">📦 ${isEn ? "Active block" : "Bloque activo"}: <strong>${blk.blockId}</strong> (${blk.rangeLabel} · ${blk.title})</span>` +
    `<span data-pocket-refuge="refugio_4_hojas">🛡️ ${isEn ? `4-Sheet Pocket Refuge (16 pp · D_KL = ${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence.toFixed(1)})` : `Refugio 4 Hojas (16 págs · D_KL = ${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence.toFixed(1)})`}</span>` +
    `</div>` +
    `</div>`
  );
}

export function resolveEditionGeometrySpec(profileId = "02_2col_pastoral", paperFormat = "a4") {
  const cleanId = String(profileId || "02_2col_pastoral").trim();
  const numPrefix = cleanId.match(/^(\d{2})_/)?.[1] || "";
  const exactIdx = CANONICAL_14_PRINT_PROFILES.findIndex((p) => p && p.id === cleanId);
  const prefixIdx = numPrefix
    ? CANONICAL_14_PRINT_PROFILES.findIndex((p) => p && String(p.id || "").startsWith(`${numPrefix}_`))
    : -1;
  const fallbackIdx = numPrefix ? Math.max(0, Math.min(13, parseInt(numPrefix, 10) - 1)) : 1;
  const resolvedIdx = exactIdx >= 0 ? exactIdx : prefixIdx >= 0 ? prefixIdx : fallbackIdx;
  const found =
    CANONICAL_14_PRINT_PROFILES[resolvedIdx] ||
    CANONICAL_14_PRINT_PROFILES[1] ||
    CANONICAL_14_PRINT_PROFILES[0];
  const resolvedPrefix =
    numPrefix ||
    String(found?.id || cleanId).match(/^(\d{2})_/)?.[1] ||
    String(resolvedIdx + 1).padStart(2, "0");
  const callerPaper = String(paperFormat || "").trim().toLowerCase();
  const basePaper = String(found?.paperSize || "A4");
  const isBaseStdPaper = /^(?:a4|letter|us-letter)$/i.test(basePaper);
  const paperSize =
    isBaseStdPaper && (callerPaper === "letter" || callerPaper === "us-letter" || callerPaper === "a4")
      ? callerPaper.includes("letter")
        ? "Letter"
        : "A4"
      : resolvedPrefix === "01"
        ? "A4"
        : resolvedPrefix === "02"
          ? "Letter"
          : String(found?.paperSize || paperFormat || "A4");
  const editionDir =
    resolvedPrefix === "01"
      ? "2col-a4"
      : resolvedPrefix === "02"
        ? "2col-letter"
        : paperSize.toLowerCase().includes("letter")
          ? "2col-letter"
          : "2col-a4";
  const prefixSampleBlockMap = {
    "01": null,
    "02": null,
    "03": "B03",
    "04": "B04",
    "05": "B05",
    "06": "B06",
    "07": "B07",
    "08": "B01",
    "09": "B09",
    "10": "B65",
    "11": "B11",
    "12": "B12",
    "13": "B13",
    "14": "B14",
  };
  const defaultColsByPrefix = {
    "01": 1, "02": 2, "03": 3, "04": 1, "05": 1, "06": 2, "07": 1,
    "08": 2, "09": 2, "10": 2, "11": 1, "12": 1, "13": 1, "14": 3,
  };
  const defaultFontByPrefix = {
    "01": 10.5, "02": 9.5, "03": 8.0, "04": 13.5, "05": 9.0, "06": 9.5, "07": 10.0,
    "08": 8.5, "09": 12.0, "10": 10.0, "11": 16.0, "12": 12.5, "13": 18.0, "14": 11.0,
  };
  const usePrefixDefaults = Boolean(numPrefix && exactIdx < 0 && prefixIdx < 0);
  const isBraille11 = cleanId === "11_braille_nemeth_b70";
  const isExplicitSingleColumnVariant =
    isBraille11 || (exactIdx < 0 && /1col|lectura|braille|baja_vision|pulpito|pliego_mural|interlineal/i.test(cleanId));
  return {
    profileId: exactIdx < 0 && numPrefix ? cleanId : found.id,
    columns: isExplicitSingleColumnVariant
      ? 1
      : usePrefixDefaults
        ? defaultColsByPrefix[resolvedPrefix] || 2
        : Number(found.columns) || defaultColsByPrefix[resolvedPrefix] || 2,
    fontPt: isBraille11
      ? 16.0
      : usePrefixDefaults
        ? defaultFontByPrefix[resolvedPrefix] || 9.5
        : Number(found.fontPt) || defaultFontByPrefix[resolvedPrefix] || 9.5,
    leadingRatio: Number(found.leadingRatio) || 1.35,
    gutterMm: Number(found.gutterMm) || 20.0,
    paperSize,
    editionDir,
    impositionMode: String(found.impositionMode || "single_sheet_20mm"),
    tomlPath: String(found.tomlPath || `obras/biblia/profiles/${found.id}.toml`),
    sampleBlockId:
      resolvedPrefix in prefixSampleBlockMap ? prefixSampleBlockMap[resolvedPrefix] : null,
  };
}

export function resolvePrintEditionPdfAssetUrl(
  profileId = "02_2col_pastoral",
  lang = "es",
  paper = "a4",
  blockId = null,
  manifestFallbackPath = null,
) {
  const id = String(profileId || "02_2col_pastoral").trim();
  if (id.includes("refugio_4_hojas")) {
    return "obras/biblia/campo/refugio_4_hojas.pdf";
  }
  if (id.includes("checklist_80_bloques")) {
    return "obras/biblia/campo/checklist_80_bloques.pdf";
  }
  const cleanLang = String(lang || "es").trim().toLowerCase() || "es";
  const spec = resolveEditionGeometrySpec(id, paper);
  const editionDir = spec.editionDir;
  const chosenBlock =
    blockId && /^B\d{2}$/i.test(String(blockId)) && String(blockId).toUpperCase() !== "B01"
      ? String(blockId).toUpperCase()
      : spec.sampleBlockId || "FULL";
  if (manifestFallbackPath) {
    return buildRelativePdfAssetUrl(manifestFallbackPath);
  }
  return `mostrador/tanda_print_worker.js?lang=${encodeURIComponent(cleanLang)}&edition=${encodeURIComponent(editionDir)}&id=${encodeURIComponent(id)}&cols=${spec.columns}&font=${spec.fontPt}pt&block=${encodeURIComponent(chosenBlock)}`;
}

/** Calcula en tiempo real el presupuesto tipográfico Kindle / Impresión. */
export function computeKindlePrintBudget({
  fontPt = 9.5,
  columns = 2,
  orientation = "portrait",
  paper = "A4",
  script = "Latn",
  uiLocale = "es",
} = {}) {
  const cleanPt = Math.max(7.0, Math.min(18.0, Number(fontPt) || 9.5));
  const reqCols = Math.max(1, Math.min(3, Number(columns) || 2));
  const isLandscape = String(orientation || "portrait").toLowerCase() === "landscape";
  const cleanOrientation = isLandscape ? "Landscape" : "Portrait";
  const isEs = !String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const orientLabel = isEs ? (isLandscape ? "Horizontal" : "Vertical") : cleanOrientation;
  const rawPaperUpper = String(paper || "A4").toUpperCase();
  const cleanPaper = rawPaperUpper.includes("A3")
    ? "A3"
    : rawPaperUpper.includes("FOLIO") || rawPaperUpper.includes("OFICIO")
      ? "Folio"
      : rawPaperUpper.includes("B70") || rawPaperUpper.includes("BRAILLE")
        ? "B70"
        : rawPaperUpper.includes("LETTER") || rawPaperUpper.includes("CARTA")
          ? "Letter"
          : "A4";
  const isComplexScript = /^(Tibt|Arab|Hebr|Deva)$/i.test(String(script || "Latn"));

  const effectiveColumns = reqCols === 3 && (cleanPt >= 11.0 && cleanPaper !== "A3" || isComplexScript) ? 2 : reqCols;
  const baseWidthPt =
    cleanPaper === "A3"
      ? 842
      : cleanPaper === "B70"
        ? 794
        : cleanPaper === "Folio" || cleanPaper === "Letter"
          ? 612
          : 595;
  const baseHeightPt =
    cleanPaper === "A3"
      ? 1191
      : cleanPaper === "B70"
        ? 828
        : cleanPaper === "Folio"
          ? 936
          : cleanPaper === "Letter"
            ? 792
            : 842;
  const pageWidthPt = cleanOrientation === "Landscape" ? baseHeightPt : baseWidthPt;
  const printableWidthPt = pageWidthPt - 72 - (effectiveColumns - 1) * 18;
  const colWidthPt = printableWidthPt / effectiveColumns;
  const cpl = Math.max(24, Math.min(92, Math.round(colWidthPt / (cleanPt * 0.52))));
  const basePages = 1180;
  const scaleFactor = Math.pow(cleanPt / 9.5, 1.65) * (2 / effectiveColumns);
  const estimatedPages = Math.max(420, Math.round(basePages * scaleFactor));
  const clampedNote = effectiveColumns !== reqCols ? ` [clamp ${reqCols}→${effectiveColumns} col]` : "";
  const pagesUnit = isEs ? "págs" : "pp";
  const summaryText = `${cleanPt.toFixed(1).replace(/\.0$/, "")}pt · ${effectiveColumns} col · ${orientLabel} · ${cleanPaper} (${cpl} cpl · ~${estimatedPages} ${pagesUnit})${clampedNote}`;

  return {
    fontPt: cleanPt,
    requestedColumns: reqCols,
    effectiveColumns,
    orientation: cleanOrientation,
    paper: cleanPaper,
    cpl,
    estimatedPages,
    clamped: effectiveColumns !== reqCols,
    summaryText,
  };
}

export function computeFoliationLayout({
  mode = "saddle_stitch",
  paper = "A4",
  pageCount = 16,
  dir = "ltr",
} = {}) {
  const cleanMode = mode === "single_sheet_20mm" ? "single_sheet_20mm" : "saddle_stitch";
  const cleanPaper = String(paper || "A4").toUpperCase() === "LETTER" ? "Letter" : "A4";
  const isRtl = String(dir || "ltr").toLowerCase() === "rtl";
  const paddedPages = Math.max(4, Math.ceil((Number(pageCount) || 16) / 4) * 4);

  if (cleanMode === "single_sheet_20mm") {
    return {
      mode: "single_sheet_20mm",
      paper: cleanPaper,
      dir: isRtl ? "rtl" : "ltr",
      bindingMarginMm: 20.0,
      outerMarginMm: 12.0,
      bindingEdge: isRtl ? "right" : "left",
      punchHoleDiameterMm: 4.0,
      punchHoleSpacingIso838Mm: 80.0,
      lichtenbergAspectRatio: Number(Math.SQRT2.toFixed(4)),
      impositionOrder: Array.from({ length: paddedPages }, (_, i) => i + 1),
      summary: `Hoja Suelta · Margen ${isRtl ? "derecho (RTL)" : "izquierdo"} 20.0 mm + 2 perforaciones Ø 4.0 mm (ISO 838)`,
    };
  }

  const sheets = paddedPages / 4;
  const spreads = [];
  for (let s = 0; s < sheets; s += 1) {
    const outerLeft = paddedPages - 2 * s;
    const outerRight = 1 + 2 * s;
    const innerLeft = 2 + 2 * s;
    const innerRight = paddedPages - 1 - 2 * s;
    spreads.push(
      isRtl
        ? { sheet: s + 1, front: [outerRight, outerLeft], back: [innerRight, innerLeft] }
        : { sheet: s + 1, front: [outerLeft, outerRight], back: [innerLeft, innerRight] }
    );
  }

  return {
    mode: "saddle_stitch",
    paper: cleanPaper,
    dir: isRtl ? "rtl" : "ltr",
    spineGutterMm: 9.215,
    outerMarginMm: 10.5,
    bindingEdge: "center_fold",
    punchHoleDiameterMm: 0,
    lichtenbergAspectRatio: Number(Math.SQRT2.toFixed(4)),
    paddedPages,
    spreads,
    summary: `Pliego Saddle-Stitch 4n (${paddedPages} págs · Lomo Lichtenberg 9.215 mm · ${isRtl ? "Orden Polar RTL" : "Orden LTR"})`,
  };
}

export function renderImpositionAndLayoutPreviewHtml({
  mode = "imposition",
  paper = "A4",
  pageCount = 16,
  columns = 2,
  fontPt = 9.5,
  orientation = "portrait",
  dir = "ltr",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const normPaper = String(paper || "A4").toLowerCase().includes("letter") ? "Letter" : "A4";
  const foliation = computeFoliationLayout({
    mode: mode === "layout" ? "single_sheet_20mm" : "saddle_stitch",
    paper: normPaper,
    pageCount,
    dir,
  });
  const imp = computeMultiSignatureImposition({
    totalPages: Math.max(16, Number(pageCount) || 16),
    maxSheetsPerSignature: 4,
    dir,
  });
  const budget = computeKindlePrintBudget({
    fontPt,
    columns,
    orientation,
    paper: normPaper,
    uiLocale,
  });
  const firstSpread =
    foliation.spreads && foliation.spreads[0]
      ? isEn
        ? `Front [${foliation.spreads[0].front.join(", ")}] · Back [${foliation.spreads[0].back.join(", ")}]`
        : `Frente [${foliation.spreads[0].front.join(", ")}] · Dorso [${foliation.spreads[0].back.join(", ")}]`
      : isEn
        ? "Spread [16, 1] / [2, 15]"
        : "Pliego [16, 1] / [2, 15]";
  const titleText =
    mode === "layout"
      ? isEn
        ? "📏 A4/Letter Geometry Verified (INV-EKO-TYP-003)"
        : "📏 Geometría A4/Carta Verificada (INV-EKO-TYP-003)"
      : isEn
        ? "📐 Saddle-Stitch 4n Booklet Imposition Ready to Fold"
        : "📐 Imposición Saddle-Stitch 4n Lista para Doblar";
  const detailText = isEn
    ? `Paper: ${normPaper} · ${budget.summaryText} · ${firstSpread} · Spine √2=${foliation.spineGutterMm || 9.215} mm · Binder margin=${foliation.bindingMarginMm || 20.0} mm (Ø ${foliation.punchHoleDiameterMm || 4.0} mm) · Max creep=${imp.maxCreepMm} mm`
    : `Papel: ${normPaper} · ${budget.summaryText} · ${firstSpread} · Lomo √2=${foliation.spineGutterMm || 9.215} mm · Margen perforado=${foliation.bindingMarginMm || 20.0} mm (Ø ${foliation.punchHoleDiameterMm || 4.0} mm) · Creep máx=${imp.maxCreepMm} mm`;

  return (
    `<div class="imposition-booklet-preview-card" ` +
    `data-print-preview-mode="${mode}" ` +
    `data-orientation="${budget.orientation.toLowerCase()}" ` +
    `data-paper="${normPaper}" ` +
    `data-spine-gutter-mm="${foliation.spineGutterMm || 9.215}" ` +
    `data-binding-margin-mm="${foliation.bindingMarginMm || 20.0}" ` +
    `data-creep-mm="${imp.maxCreepMm}">` +
    `<strong>${titleText}</strong>` +
    `<span>${detailText}</span>` +
    `</div>`
  );
}


export function formatCanonical80BlocksChecklistEntries(lang = "es") {
  const isEn = String(lang || "es").toLowerCase().startsWith("en");
  return CANONICAL_80_BLOCKS_CATALOG.map((blk) => ({
    ref: blk.blockId,
    text: isEn
      ? `[ ] ${blk.shortCode} (${blk.testament}) · ${blk.rangeLabel} · ${blk.chaptersCount} ch · ${blk.pagesCount} pp`
      : `[ ] ${blk.shortCode} (${blk.testament}) · ${blk.rangeLabel} · ${blk.chaptersCount} caps · ${blk.pagesCount} págs`,
  }));
}

export function resolveNumericEditionId(profileIdOrMode = "02_2col_pastoral") {
  if (typeof profileIdOrMode === "number" && Number.isFinite(profileIdOrMode)) {
    const n = Math.trunc(profileIdOrMode);
    return n >= 1 && n <= 16 ? n : 0;
  }
  const clean = String(profileIdOrMode || "").trim();
  const numMatch = clean.match(/^(\d{2})_/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= 16) return n;
  }
  const canonical = EDITORIAL_PROFILE_PRIMARY_KEY_ALIASES[clean] || "";
  const aliasMatch = canonical.match(/^(\d{2})_/);
  return aliasMatch ? parseInt(aliasMatch[1], 10) : 0;
}

/** Construye descriptor binario alineado de `16 B` (`EditionRenderSpec`) igual al kernel Rust/WASM (`D3-V2LE`). */
export function buildEditionRenderSpecBytes16(profileIdOrMode = 0, overrides = {}) {
  const edId = resolveNumericEditionId(profileIdOrMode);
  const presets = {
    1: { flags: 0x04, lead: 138, inner: 20, outer: 14, top: 16, tc: 0, font: 105, cols: 1, paper: 0x00, rw: 40, m: 0 },
    2: { flags: 0x04, lead: 134, inner: 20, outer: 14, top: 16, tc: 0, font: 95, cols: 2, paper: 0x01, rw: 40, m: 0 },
    3: { flags: 0x0c, lead: 124, inner: 16, outer: 10, top: 14, tc: 0, font: 80, cols: 3, paper: 0x00, rw: 35, m: 8 },
    4: { flags: 0x05, lead: 150, inner: 20, outer: 14, top: 18, tc: 0, font: 135, cols: 1, paper: 0x01, rw: 50, m: 0 },
    5: { flags: 0x44, lead: 152, inner: 20, outer: 14, top: 16, tc: 0, font: 90, cols: 1, paper: 0x00, rw: 45, m: 0 },
    6: { flags: 0x04, lead: 138, inner: 20, outer: 14, top: 16, tc: 0, font: 95, cols: 2, paper: 0x00, rw: 40, m: 0 },
    7: { flags: 0x45, lead: 175, inner: 20, outer: 15, top: 16, tc: 0, font: 100, cols: 1, paper: 0x80, rw: 80, m: 0 },
    8: { flags: 0x0c, lead: 128, inner: 14, outer: 10, top: 13, tc: 0, font: 85, cols: 2, paper: 0x00, rw: 40, m: 8 },
    9: { flags: 0x0c, lead: 144, inner: 20, outer: 14, top: 18, tc: 0, font: 120, cols: 2, paper: 0x03, rw: 50, m: 8 },
    10: { flags: 0x2c, lead: 136, inner: 18, outer: 12, top: 16, tc: 0, font: 100, cols: 2, paper: 0x00, rw: 40, m: 8 },
    11: { flags: 0x85, lead: 178, inner: 22, outer: 16, top: 18, tc: 0, font: 160, cols: 1, paper: 0x04, rw: 50, m: 0 },
    12: { flags: 0x15, lead: 155, inner: 20, outer: 16, top: 18, tc: 80, font: 125, cols: 1, paper: 0x01, rw: 45, m: 0 },
    13: { flags: 0x07, lead: 155, inner: 20, outer: 16, top: 18, tc: 0, font: 180, cols: 1, paper: 0x01, rw: 90, m: 0 },
    14: { flags: 0x0c, lead: 142, inner: 20, outer: 14, top: 18, tc: 0, font: 110, cols: 3, paper: 0x02, rw: 50, m: 8 },
    15: { flags: 0x04, lead: 138, inner: 20, outer: 14, top: 16, tc: 0, font: 95, cols: 2, paper: 0x00, rw: 40, m: 0 },
    16: { flags: 0x45, lead: 175, inner: 20, outer: 15, top: 16, tc: 0, font: 100, cols: 1, paper: 0x80, rw: 80, m: 0 },
  };
  const p = presets[edId] || { flags: 0, lead: 0, inner: 0, outer: 0, top: 0, tc: 0, font: 0, cols: 0, paper: 0, rw: 0, m: 0 };
  const buf = new Uint8Array(16);
  const dv = new DataView(buf.buffer);
  buf[0] = edId & 0xff;
  buf[1] = p.flags & 0xff;
  dv.setUint16(2, p.lead & 0xffff, true);
  buf[4] = p.inner & 0xff;
  buf[5] = p.outer & 0xff;
  buf[6] = p.top & 0xff;
  buf[7] = p.tc & 0xff;
  const rawFontTenths = overrides.fontTenthsPt ? Math.max(p.font, overrides.fontTenthsPt) : p.font;
  const effFontTenths = edId === 13 ? Math.max(180, rawFontTenths) : edId === 12 ? Math.max(125, rawFontTenths) : rawFontTenths;
  dv.setUint16(8, effFontTenths & 0xffff, true);
  buf[10] = (overrides.columns || p.cols) & 0xff;
  buf[11] = (edId === 11 ? 4 : overrides.paperCode !== undefined ? overrides.paperCode : p.paper) & 0xff;
  buf[12] = p.rw & 0xff;
  buf[13] = p.m & 0xff;
  return buf;
}

export { transduceTextToBrailleBrfAndUnicode } from "./braille_brf_codec.js";
