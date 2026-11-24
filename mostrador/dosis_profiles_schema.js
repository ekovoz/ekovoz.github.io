// ============================================================================
// web/mostrador/dosis_profiles_schema.js — Módulo L0 Puro de Catálogos, Bloques,
// Imposición 4n y Perfiles Tipográficos (SLICE-EKO-V2LC-B02 · 0 imports circulares)
// ============================================================================

import { BIBLE_CONSTANTS } from "../bible_constants.js";

export const PRECOMPILED_PDF_LANGS = ["es", "en", "stp", "he", "grc"];
export const VERIFIED_TEXT_BIBLE_LANGS = ["es", "es-1909", "en", "stp", "he", "grc"];

export const FIELD_PDFS_REGISTRY = {
  refugio_4_hojas: { bytes: 54308, path: "obras/biblia/campo/refugio_4_hojas.pdf" },
  checklist_80_bloques: { bytes: 12312, path: "obras/biblia/campo/checklist_80_bloques.pdf" },
};

/** Resuelve si un código de idioma pertenece a las 5 lenguas de núcleo (`es, en, stp, he, grc`). */
export function resolvePrecompiledDiskLang(rawLang = "es") {
  const clean = String(rawLang || "").trim().toLowerCase();
  if (clean === "es" || clean === "en" || clean === "stp" || clean === "he" || clean === "grc") return clean;
  return null;
}

/** Normaliza cualquier ruta de activo PDF a ruta relativa sin `/` inicial ni prefijo físico `dist_federation/`. */
export function buildRelativePdfAssetUrl(rawUrl = "") {
  const clean = String(rawUrl || "").trim();
  if (!clean) return "";
  return clean
    .replace(/^dist_federation\//, "")
    .replace(/^\/+/, "");
}

export const CANONICAL_14_PLUS_2_EDITIONS_CATALOG = [
  { id: "01_1col_lectura", editionSlug: "01_1col_lectura", label: "1. Lectura Continua (1 col · 10.5pt)", label_en: "1. Continuous Reading (1 col · 10.5pt)", kind: "edition", columns: 1, fontPt: 10.5 },
  { id: "02_2col_pastoral", editionSlug: "02_2col_pastoral", label: "2. Pastoral Clásica (2 col · 9.5pt)", label_en: "2. Classic Pastoral (2 col · 9.5pt)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "03_3col_compacta", editionSlug: "03_3col_compacta", label: "3. Compacta de Bolsillo (3 col · 8.0pt)", label_en: "3. Pocket Compact (3 col · 8.0pt)", kind: "edition", columns: 3, fontPt: 8.0 },
  { id: "04_1col_letra_grande", editionSlug: "04_1col_letra_grande", label: "4. Letra Grande Abuelos (1 col · 13.5pt)", label_en: "4. Large Print Elders (1 col · 13.5pt)", kind: "edition", columns: 1, fontPt: 13.5 },
  { id: "05_interlineal_estudio", editionSlug: "05_interlineal_estudio", label: "5. Interlineal de Estudio 15-Col (A4)", label_en: "5. 15-Col Study Interlinear (A4)", kind: "edition", columns: 1, fontPt: 9.0 },
  { id: "06_bilingue_paralela", editionSlug: "06_bilingue_paralela", label: "6. Díptico Bilingüe 62/38 (Materna + Puente)", label_en: "6. Bilingual Diptych 62/38 (Vernacular + Bridge)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "07_cuaderno_5lineas_apaisado", editionSlug: "07_cuaderno_5lineas_apaisado", label: "7. Cuaderno de Campo 5 Líneas (Landscape)", label_en: "7. 5-Line Field Notebook (Landscape)", kind: "edition", columns: 1, fontPt: 10.0 },
  { id: "08_bolsillo_misionero", editionSlug: "08_bolsillo_misionero", label: "8. Pliego Saddle-Stitch 4n (Imposición)", label_en: "8. Saddle-Stitch 4n Booklet (Imposition)", kind: "edition", columns: 2, fontPt: 8.5 },
  { id: "09_atril_liturgico", editionSlug: "09_atril_liturgico", label: "9. Edición de Atril y Asamblea (Folio)", label_en: "9. Pulpit & Assembly Folio Edition", kind: "edition", columns: 2, fontPt: 12.0 },
  { id: "10_evangelio_14_pericopas", editionSlug: "10_evangelio_14_pericopas", label: "10. Evangelio 14 Perícopas (2 col · 10.0pt)", label_en: "10. Gospel 14 Pericopes (2 col · 10.0pt)", kind: "edition", columns: 2, fontPt: 10.0 },
  { id: "11_braille_nemeth_b70", editionSlug: "11_braille_nemeth_b70", label: "11. Braille Táctil BEB B70 (1 col · 16.0pt)", label_en: "11. Tactile Braille BEB B70 (1 col · 16.0pt)", kind: "edition", columns: 1, fontPt: 16.0 },
  { id: "12_dislexia_espaciado_amplio", editionSlug: "12_dislexia_espaciado_amplio", label: "12. Dislexia Espaciado Amplio (1 col · 12.5pt)", label_en: "12. Dyslexia Wide Spacing (1 col · 12.5pt)", kind: "edition", columns: 1, fontPt: 12.5 },
  { id: "13_contraste_extremo_baja_vision", editionSlug: "13_contraste_extremo_baja_vision", label: `13. Baja Visión Contraste Extremo (1 col · ${((Number(BIBLE_CONSTANTS?.LOW_VISION_MIN_FONT_PT_X10) || 180) / 10).toFixed(1)}pt)`, label_en: `13. Low Vision High Contrast (1 col · ${((Number(BIBLE_CONSTANTS?.LOW_VISION_MIN_FONT_PT_X10) || 180) / 10).toFixed(1)}pt)`, kind: "edition", columns: 1, fontPt: (Number(BIBLE_CONSTANTS?.LOW_VISION_MIN_FONT_PT_X10) || 180) / 10 },
  { id: "14_pliego_mural_comunitario", editionSlug: "14_pliego_mural_comunitario", label: "14. Pliego Mural Comunitario A3 (3 col · 11.0pt)", label_en: "14. Community Mural Sheet A3 (3 col · 11.0pt)", kind: "edition", columns: 3, fontPt: 11.0 },
  { id: "15_refugio_4_hojas", editionSlug: "refugio_4_hojas", label: "15. Refugio de Emergencia (4 Hojas · PDF)", label_en: "15. Emergency Pocket Refuge (4 Sheets · PDF)", kind: "field_pdf", url: "obras/biblia/campo/refugio_4_hojas.pdf", bytes: 54308 },
  { id: "16_checklist_80_bloques", editionSlug: "checklist_80_bloques", label: "16. Checklist de 80 Bloques de Campo (PDF)", label_en: "16. 80 Canonical Field Blocks Checklist (PDF)", kind: "field_pdf", url: "obras/biblia/campo/checklist_80_bloques.pdf", bytes: 12312 },
];

export const DEFAULT_PRINT_CONFIG = Object.freeze({
  paperSize: "A4",
  paperFormat: "a4",
  fontPt: 9.5,
  columns: 2,
});

export const CANONICAL_9_TOML_PROFILES = [
  { id: "01_1col_lectura", tomlPath: "obras/biblia/profiles/one-column-reading.toml", columns: 1, fontPt: 10.5, leadingRatio: 1.38, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 62 },
  { id: "02_2col_pastoral", tomlPath: "obras/biblia/profiles/two-column-bible.toml", columns: DEFAULT_PRINT_CONFIG.columns, fontPt: DEFAULT_PRINT_CONFIG.fontPt, leadingRatio: 1.32, paperSize: DEFAULT_PRINT_CONFIG.paperSize, impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 48 },
  { id: "03_3col_compacta", tomlPath: "obras/biblia/profiles/three-column-compact.toml", columns: 3, fontPt: 8.0, leadingRatio: 1.24, paperSize: "A4", impositionMode: "saddle_stitch", gutterMm: 9.215, cplTarget: 36 },
  { id: "04_1col_letra_grande", tomlPath: "obras/biblia/profiles/large-print.toml", columns: 1, fontPt: 13.5, leadingRatio: 1.45, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 52 },
  { id: "05_interlineal_estudio", tomlPath: "obras/biblia/profiles/05_interlineal_estudio.toml", columns: 1, fontPt: 9.0, leadingRatio: 1.50, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 68 },
  { id: "06_bilingue_paralela", tomlPath: "obras/biblia/profiles/bilingual-parallel.toml", columns: 2, fontPt: 9.5, leadingRatio: 1.34, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 58 },
  { id: "07_cuaderno_5lineas_apaisado", tomlPath: "obras/biblia/profiles/field-review-workbook.toml", columns: 1, fontPt: 10.0, leadingRatio: 1.60, paperSize: "A4-Landscape", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 70 },
  { id: "08_bolsillo_misionero", tomlPath: "obras/biblia/profiles/08_bolsillo_misionero.toml", columns: 2, fontPt: 8.5, leadingRatio: 1.26, paperSize: "A4", impositionMode: "multi_signature_4n", gutterMm: 9.215, cplTarget: 44 },
  { id: "09_atril_liturgico", tomlPath: "obras/biblia/profiles/09_atril_liturgico.toml", columns: 2, fontPt: 12.0, leadingRatio: 1.42, paperSize: "Folio", impositionMode: "multi_signature_4n", gutterMm: 14.0, cplTarget: 54 },
];

export const CANONICAL_14_PRINT_PROFILES = [
  ...CANONICAL_9_TOML_PROFILES,
  { id: "10_evangelio_14_pericopas", tomlPath: "obras/biblia/profiles/10_evangelio_14_pericopas.toml", columns: 2, fontPt: 10.0, leadingRatio: 1.35, paperSize: "A4", impositionMode: "saddle_stitch", gutterMm: 9.215, cplTarget: 50 },
  { id: "11_braille_nemeth_b70", tomlPath: "obras/biblia/profiles/11_braille_nemeth_b70.toml", columns: 1, fontPt: 16.0, leadingRatio: 1.65, paperSize: "B70-Braille", impositionMode: "single_sheet_20mm", gutterMm: 22.0, cplTarget: 40 },
  { id: "12_dislexia_espaciado_amplio", tomlPath: "obras/biblia/profiles/12_dislexia_espaciado_amplio.toml", columns: 1, fontPt: 12.5, leadingRatio: 1.55, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 52 },
  { id: "13_contraste_extremo_baja_vision", tomlPath: "obras/biblia/profiles/13_contraste_extremo_baja_vision.toml", columns: 1, fontPt: (Number(BIBLE_CONSTANTS?.LOW_VISION_MIN_FONT_PT_X10) || 180) / 10, leadingRatio: 1.50, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 46 },
  { id: "14_pliego_mural_comunitario", tomlPath: "obras/biblia/profiles/14_pliego_mural_comunitario.toml", columns: 3, fontPt: 11.0, leadingRatio: 1.40, paperSize: "A3", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 64 },
];

export const CANONICAL_12_BRANCH_PROFILES = [
  { id: "G_01_latin_extended", tomlPath: "obras/biblia/perfiles_ramas/05_indo_european_romance_germanic_slavic.toml", leadingRatio: 1.32 },
  { id: "G_02_arabic_naskh_nastaliq", tomlPath: "obras/biblia/perfiles_ramas/06_afroasiatic_semitic_berber_cushitic.toml", leadingRatio: 1.55 },
  { id: "G_03_indic_brahmic_aksara", tomlPath: "obras/biblia/perfiles_ramas/08_indo_aryan_iranian_dravidian.toml", leadingRatio: 1.48 },
  { id: "G_04_cjk_ideographic_grid", tomlPath: "obras/biblia/perfiles_ramas/09_sino_tibetan_hmong_mien_kra_dai.toml", leadingRatio: 1.60 },
  { id: "G_05_cyrillic_eurasian", tomlPath: "obras/biblia/perfiles_ramas/10_altaic_turkic_mongolic_japonic_koreanic.toml", leadingRatio: 1.34 },
  { id: "G_06_ethiopic_abugida", tomlPath: "obras/biblia/perfiles_ramas/07_niger_congo_bantu_atlantic.toml", leadingRatio: 1.42 },
  { id: "G_07_se_asian_tall_stack", tomlPath: "obras/biblia/perfiles_ramas/11_austronesian_malayo_polynesian.toml", leadingRatio: 1.75 },
  { id: "G_08_hebrew_syriac_masoretic", tomlPath: "obras/biblia/perfiles_ramas/ramas_tipologicas.toml", leadingRatio: 1.46 },
  { id: "G_09_african_tonal_ipa", tomlPath: "obras/biblia/perfiles_ramas/02_otomanguean_mixe_zoque.toml", leadingRatio: 1.38 },
  { id: "G_10_amerindian_polysynthetic", tomlPath: "obras/biblia/perfiles_ramas/01_uto_aztecan.toml", leadingRatio: 1.40 },
  { id: "G_11_syllabics_tifinagh_nko", tomlPath: "obras/biblia/perfiles_ramas/03_mayan_totonacan.toml", leadingRatio: 1.44 },
  { id: "G_12_sign_tactile_oral_only", tomlPath: "obras/biblia/perfiles_ramas/04_quechuan_aymaran_andean.toml", leadingRatio: 1.50 },
];

export function computeMultiSignatureImposition({
  totalPages = 160,
  maxSheetsPerSignature = 8,
  paperThicknessMm = 0.09,
  paperBulkFactor = 1.15,
  dir = "ltr",
} = {}) {
  const cleanMaxSheets = Math.max(1, Math.min(8, Number(maxSheetsPerSignature) || 8));
  const maxPagesPerSig = cleanMaxSheets * 4;
  const paddedTotalPages = Math.max(4, Math.ceil((Number(totalPages) || 32) / 4) * 4);
  const signatureCount = Math.ceil(paddedTotalPages / maxPagesPerSig);
  const isRtl = String(dir || "ltr").toLowerCase() === "rtl";

  const signatures = [];
  let maxCreepObservedMm = 0;

  for (let sigIdx = 0; sigIdx < signatureCount; sigIdx += 1) {
    const startPage = sigIdx * maxPagesPerSig + 1;
    const endPage = Math.min(paddedTotalPages, (sigIdx + 1) * maxPagesPerSig);
    const sigPageCount = endPage - startPage + 1;
    const sheetsInSig = sigPageCount / 4;
    const sheets = [];

    for (let s = 0; s < sheetsInSig; s += 1) {
      const rawCreepMm = s * Math.PI * paperThicknessMm * paperBulkFactor;
      const creepMm = Number(Math.min(2.45, rawCreepMm).toFixed(3));
      if (creepMm > maxCreepObservedMm) maxCreepObservedMm = creepMm;

      const outerLeft = endPage - 2 * s;
      const outerRight = startPage + 2 * s;
      const innerLeft = startPage + 1 + 2 * s;
      const innerRight = endPage - 1 - 2 * s;
      sheets.push({
        sheetInSignature: s + 1,
        creepOffsetMm: creepMm,
        front: isRtl ? [outerRight, outerLeft] : [outerLeft, outerRight],
        back: isRtl ? [innerRight, innerLeft] : [innerLeft, innerRight],
      });
    }

    const steppedCollationMarkYMm = Number((20.0 + sigIdx * 6.5).toFixed(2));
    signatures.push({
      signatureIndex: sigIdx + 1,
      signatureCode: `SIG-${String(sigIdx + 1).padStart(2, "0")}`,
      startPage,
      endPage,
      sheetsCount: sheetsInSig,
      maxCreepMm: sheets.length > 0 ? sheets[sheets.length - 1].creepOffsetMm : 0,
      steppedCollationMarkYMm,
      steppedCollationMarkHeightMm: 5.0,
      sheets,
    });
  }

  return {
    totalPages: paddedTotalPages,
    maxSheetsPerSignature: cleanMaxSheets,
    signatureCount,
    maxCreepMm: maxCreepObservedMm,
    creepWithinBound: maxCreepObservedMm <= 2.45,
    dir: isRtl ? "rtl" : "ltr",
    signatures,
    summary: `${signatureCount} cuadernillos (M≤${cleanMaxSheets} hojas = ${maxPagesPerSig} págs/firma · Creep máx ${maxCreepObservedMm.toFixed(2)} mm ≤ 2.45 mm · Marcas de alzado escalonadas)`,
  };
}

const CANONICAL_66_BOOKS_CHAPTER_COUNTS = [
  ["GEN", 50, "AT · Pentateuco (Torá)"], ["EXO", 40, "AT · Pentateuco (Torá)"], ["LEV", 27, "AT · Pentateuco (Torá)"],
  ["NUM", 36, "AT · Pentateuco (Torá)"], ["DEU", 34, "AT · Pentateuco (Torá)"], ["JOS", 24, "AT · Libros Históricos"],
  ["JDG", 21, "AT · Libros Históricos"], ["RUT", 4, "AT · Libros Históricos"], ["1SA", 31, "AT · Libros Históricos"],
  ["2SA", 24, "AT · Libros Históricos"], ["1KI", 22, "AT · Libros Históricos"], ["2KI", 25, "AT · Libros Históricos"],
  ["1CH", 29, "AT · Libros Históricos"], ["2CH", 36, "AT · Libros Históricos"], ["EZR", 10, "AT · Libros Históricos"],
  ["NEH", 13, "AT · Libros Históricos"], ["EST", 10, "AT · Libros Históricos"], ["JOB", 42, "AT · Poesía y Sabiduría"],
  ["PSA", 150, "AT · Poesía y Sabiduría"], ["PRO", 31, "AT · Poesía y Sabiduría"], ["ECC", 12, "AT · Poesía y Sabiduría"],
  ["SNG", 8, "AT · Poesía y Sabiduría"], ["ISA", 66, "AT · Profetas Mayores"], ["JER", 52, "AT · Profetas Mayores"],
  ["LAM", 5, "AT · Profetas Mayores"], ["EZK", 48, "AT · Profetas Mayores"], ["DAN", 12, "AT · Profetas Mayores"],
  ["HOS", 14, "AT · Profetas Menores"], ["JOL", 3, "AT · Profetas Menores"], ["AMO", 9, "AT · Profetas Menores"],
  ["OBA", 1, "AT · Profetas Menores"], ["JON", 4, "AT · Profetas Menores"], ["MIC", 7, "AT · Profetas Menores"],
  ["NAM", 3, "AT · Profetas Menores"], ["HAB", 3, "AT · Profetas Menores"], ["ZEP", 3, "AT · Profetas Menores"],
  ["HAG", 2, "AT · Profetas Menores"], ["ZEC", 14, "AT · Profetas Menores"], ["MAL", 4, "AT · Profetas Menores"],
  ["MAT", 28, "NT · Evangelios y Hechos"], ["MRK", 16, "NT · Evangelios y Hechos"], ["LUK", 24, "NT · Evangelios y Hechos"],
  ["JHN", 21, "NT · Evangelios y Hechos"], ["ACT", 28, "NT · Evangelios y Hechos"], ["ROM", 16, "NT · Epístolas Paulinas"],
  ["1CO", 16, "NT · Epístolas Paulinas"], ["2CO", 13, "NT · Epístolas Paulinas"], ["GAL", 6, "NT · Epístolas Paulinas"],
  ["EPH", 6, "NT · Epístolas Paulinas"], ["PHP", 4, "NT · Epístolas Paulinas"], ["COL", 4, "NT · Epístolas Paulinas"],
  ["1TH", 5, "NT · Epístolas Paulinas"], ["2TH", 3, "NT · Epístolas Paulinas"], ["1TI", 6, "NT · Epístolas Pastorales"],
  ["2TI", 4, "NT · Epístolas Pastorales"], ["TIT", 3, "NT · Epístolas Pastorales"], ["PHM", 1, "NT · Epístolas Pastorales"],
  ["HEB", 13, "NT · Epístolas Generales y Apocalipsis"], ["JAS", 5, "NT · Epístolas Generales y Apocalipsis"],
  ["1PE", 5, "NT · Epístolas Generales y Apocalipsis"], ["2PE", 3, "NT · Epístolas Generales y Apocalipsis"],
  ["1JN", 5, "NT · Epístolas Generales y Apocalipsis"], ["2JN", 1, "NT · Epístolas Generales y Apocalipsis"],
  ["3JN", 1, "NT · Epístolas Generales y Apocalipsis"], ["JUD", 1, "NT · Epístolas Generales y Apocalipsis"],
  ["REV", 22, "NT · Epístolas Generales y Apocalipsis"],
];

const SCHEMA_BOOK_ALIAS_MAP = {
  EZE: "EZK",
  JOE: "JOL",
  NAH: "NAM",
  PHI: "PHP",
  SOL: "SNG",
};

function buildCanonical80BlocksCatalog() {
  const otCh = [];
  const ntCh = [];
  for (let i = 0; i < CANONICAL_66_BOOKS_CHAPTER_COUNTS.length; i += 1) {
    const [book, count, division] = CANONICAL_66_BOOKS_CHAPTER_COUNTS[i];
    const target = i < 39 ? otCh : ntCh;
    for (let ch = 1; ch <= count; ch += 1) {
      target.push({ book, ch, division });
    }
  }
  const catalog = [];
  for (let b = 0; b < 60; b += 1) {
    const startIdx = Math.floor((b * otCh.length) / 60);
    const endIdx = Math.max(startIdx + 1, Math.floor(((b + 1) * otCh.length) / 60)) - 1;
    const first = otCh[startIdx];
    const last = otCh[Math.min(endIdx, otCh.length - 1)];
    const blockNumber = b + 1;
    const padded = String(blockNumber).padStart(2, "0");
    const rangeLabel = first.book === last.book ? `${first.book} ${first.ch}–${last.ch}` : `${first.book} ${first.ch} – ${last.book} ${last.ch}`;
    catalog.push({
      blockId: `BLK-0${padded}`,
      shortCode: `B${padded}`,
      blockNumber,
      testament: "AT",
      startBook: first.book,
      startChapter: first.ch,
      endBook: last.book,
      endChapter: last.ch,
      chaptersCount: endIdx - startIdx + 1,
      rangeLabel,
      title: `${first.division} (${rangeLabel})`,
      sheetsCount: 4,
      pagesCount: 16,
    });
  }
  for (let b = 0; b < 20; b += 1) {
    const startIdx = Math.floor((b * ntCh.length) / 20);
    const endIdx = Math.max(startIdx + 1, Math.floor(((b + 1) * ntCh.length) / 20)) - 1;
    const first = ntCh[startIdx];
    const last = ntCh[Math.min(endIdx, ntCh.length - 1)];
    const blockNumber = 61 + b;
    const padded = String(blockNumber).padStart(2, "0");
    const rangeLabel = first.book === last.book ? `${first.book} ${first.ch}–${last.ch}` : `${first.book} ${first.ch} – ${last.book} ${last.ch}`;
    catalog.push({
      blockId: `BLK-0${padded}`,
      shortCode: `B${padded}`,
      blockNumber,
      testament: "NT",
      startBook: first.book,
      startChapter: first.ch,
      endBook: last.book,
      endChapter: last.ch,
      chaptersCount: endIdx - startIdx + 1,
      rangeLabel,
      title: `${first.division} (${rangeLabel})`,
      sheetsCount: 4,
      pagesCount: 16,
    });
  }
  return catalog;
}

export const CANONICAL_80_BLOCKS_CATALOG = buildCanonical80BlocksCatalog();

export const POCKET_REFUGE_4_SHEETS_SPEC = {
  id: "refugio_4_hojas",
  url: "obras/biblia/campo/refugio_4_hojas.pdf",
  sheets: 4,
  pages: 16,
  klDivergence: 0.0,
  folds: "Acordeón 8 paneles por hoja (resistente al agua y sudor)",
  anchors: [
    "Hoja 1: Creación, Caída y Promesa (Génesis 1–3 · Salmo 23 · Isaías 53)",
    "Hoja 2: Las 12 Dichas de Jesús y el Sermón del Monte (Mateo 5–7 · Lucas 15)",
    "Hoja 3: Cruz, Resurrección y Nueva Creación (Juan 1, 3, 19–20 · Romanos 8)",
    "Hoja 4: Liturgia de Consuelo, Oración en Crisis y Promesas Finales (Apocalipsis 21–22)",
  ],
};

export const CANONICAL_16_TYPOLOGY_PROFILES = [
  { id: "ar_typology", lang_code: "ar", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "de_typology", lang_code: "de", word_order: "Svo", family_subclade: "Indo-European::Germanic-West", is_head_final_postpositional: false },
  { id: "en_typology", lang_code: "en", word_order: "Svo", family_subclade: "CLADE_008::eng", is_head_final_postpositional: false },
  { id: "es_typology", lang_code: "es", word_order: "Svo", family_subclade: "Indo-European::Romance-Iberian", is_head_final_postpositional: false, copula_affirmative: "es", negation_preverbal: "no" },
  { id: "fr_typology", lang_code: "fr", word_order: "Svo", family_subclade: "CLADE_001::fra", is_head_final_postpositional: false },
  { id: "grc_typology", lang_code: "grc", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "he_typology", lang_code: "he", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "hi_typology", lang_code: "hi", word_order: "Sov", family_subclade: "HeadFinal::SOV-Macro", is_head_final_postpositional: true },
  { id: "id_typology", lang_code: "id", word_order: "Svo", family_subclade: "CLADE_031::ind", is_head_final_postpositional: false },
  { id: "nah_typology", lang_code: "nah", word_order: "Vso", family_subclade: "Uto-Aztecan::Aztecan", is_head_final_postpositional: false, copula_affirmative: "ca", negation_preverbal: "amo" },
  { id: "pt_typology", lang_code: "pt", word_order: "Svo", family_subclade: "Indo-European::Romance-Lusophone", is_head_final_postpositional: false },
  { id: "quy_typology", lang_code: "quy", word_order: "Sov", family_subclade: "Quechuan::Southern-Quechua", is_head_final_postpositional: true, copula_affirmative: "kan", negation_preverbal: "mana" },
  { id: "quz_typology", lang_code: "quz", word_order: "Sov", family_subclade: "Quechuan::Southern-Quechua", is_head_final_postpositional: true, copula_affirmative: "kan", negation_preverbal: "mana" },
  { id: "stp_typology", lang_code: "stp", word_order: "Vso", family_subclade: "Uto-Aztecan::Tepiman", is_head_final_postpositional: false, copula_affirmative: "jir", negation_preverbal: "cham" },
  { id: "sw_typology", lang_code: "sw", word_order: "Svo", family_subclade: "CLADE_021::swa", is_head_final_postpositional: false },
  { id: "tr_typology", lang_code: "tr", word_order: "Sov", family_subclade: "HeadFinal::SOV-Macro", is_head_final_postpositional: true },
];

export function resolveCanonicalBlockForPassage(book = "GEN", chapter = 1) {
  const rawBook = String(book || "GEN").trim().toUpperCase();
  const cleanBook = SCHEMA_BOOK_ALIAS_MAP[rawBook] || rawBook;
  const cleanChapter = Math.max(1, Number(chapter) || 1);
  const bookIndexMap = new Map(
    CANONICAL_66_BOOKS_CHAPTER_COUNTS.map(([bCode], idx) => [bCode, idx]),
  );
  const targetBookIdx = bookIndexMap.has(cleanBook) ? bookIndexMap.get(cleanBook) : 0;

  for (const blk of CANONICAL_80_BLOCKS_CATALOG) {
    const rawSBk = String(blk.startBook || String(blk.startRef || "GEN.1").split(".")[0]).trim().toUpperCase();
    const startBook = SCHEMA_BOOK_ALIAS_MAP[rawSBk] || rawSBk;
    const startCh = Number(blk.startChapter || String(blk.startRef || "GEN.1").split(".")[1]) || 1;
    const rawEBk = String(blk.endBook || String(blk.endRef || "GEN.15").split(".")[0]).trim().toUpperCase();
    const endBook = SCHEMA_BOOK_ALIAS_MAP[rawEBk] || rawEBk;
    const endCh = Number(blk.endChapter || String(blk.endRef || "GEN.15").split(".")[1]) || 15;
    const sIdx = bookIndexMap.has(startBook) ? bookIndexMap.get(startBook) : 0;
    const eIdx = bookIndexMap.has(endBook) ? bookIndexMap.get(endBook) : 0;

    const afterStart =
      targetBookIdx > sIdx || (targetBookIdx === sIdx && cleanChapter >= startCh);
    const beforeEnd =
      targetBookIdx < eIdx || (targetBookIdx === eIdx && cleanChapter <= endCh);
    if (afterStart && beforeEnd) {
      return blk;
    }
  }
  return CANONICAL_80_BLOCKS_CATALOG[0];
}

export function resolveCanonicalBlockCode(book = "GEN", chapter = 1, _verse = 1) {
  const totalBlocks = Number(BIBLE_CONSTANTS?.CANONICAL_BLOCKS_COUNT) || 80;
  const rawBook = String(book || "GEN").trim().toUpperCase();
  const cleanBook = SCHEMA_BOOK_ALIAS_MAP[rawBook] || rawBook;
  const cleanChap = Math.max(1, Number(chapter) || 1);
  const blk = resolveCanonicalBlockForPassage(cleanBook, cleanChap);
  let blockNumber = Number(blk?.blockNumber);
  if (!Number.isFinite(blockNumber) || blockNumber < 1 || blockNumber > totalBlocks) {
    blockNumber = 1;
  }
  const padded = String(blockNumber).padStart(2, "0");
  return {
    blockCode: `B${padded}`,
    blockNumber,
    blockId: blk?.blockId || `BLK-${String(blockNumber).padStart(3, "0")}`,
    startRef: blk?.startRef || `${cleanBook}.${cleanChap}`,
    endRef: blk?.endRef || `${cleanBook}.${cleanChap}`,
  };
}

export const GOSPEL_14_PERICOPES_SPEC = [
  { id: "P01", book: "JHN", chapter: 1, startVerse: 1, endVerse: 18, title: "1. El Verbo se hizo carne" },
  { id: "P02", book: "LUK", chapter: 2, startVerse: 1, endVerse: 20, title: "2. Nacimiento del Mesías" },
  { id: "P03", book: "MRK", chapter: 1, startVerse: 9, endVerse: 20, title: "3. Bautismo y llamado" },
  { id: "P04", book: "MAT", chapter: 5, startVerse: 1, endVerse: 16, title: "4. Las Dichas y la Luz del Mundo" },
  { id: "P05", book: "MAT", chapter: 6, startVerse: 5, endVerse: 15, title: "5. La Oración del Reino" },
  { id: "P06", book: "MRK", chapter: 4, startVerse: 35, endVerse: 41, title: "6. Autoridad sobre la tempestad" },
  { id: "P07", book: "JHN", chapter: 3, startVerse: 1, endVerse: 21, title: "7. Nacer de nuevo" },
  { id: "P08", book: "JHN", chapter: 4, startVerse: 5, endVerse: 26, title: "8. Agua viva junto al pozo" },
  { id: "P09", book: "LUK", chapter: 10, startVerse: 25, endVerse: 37, title: "9. El buen samaritano" },
  { id: "P10", book: "LUK", chapter: 15, startVerse: 11, endVerse: 32, title: "10. El hijo pródigo y el Padre" },
  { id: "P11", book: "JHN", chapter: 10, startVerse: 1, endVerse: 18, title: "11. El Buen Pastor" },
  { id: "P12", book: "JHN", chapter: 11, startVerse: 17, endVerse: 44, title: "12. La Resurrección y la Vida" },
  { id: "P13", book: "LUK", chapter: 23, startVerse: 32, endVerse: 49, title: "13. Entrega en la cruz" },
  { id: "P14", book: "JHN", chapter: 20, startVerse: 1, endVerse: 29, title: "14. Sepulcro vacío y envío" },
];

export const REFUGE_4_SHEETS_PASSAGES_SPEC = [
  { book: "GEN", chapter: 1, startVerse: 1, endVerse: 5 },
  { book: "PSA", chapter: 23, startVerse: 1, endVerse: 6 },
  { book: "PSA", chapter: 46, startVerse: 1, endVerse: 11 },
  { book: "PSA", chapter: 91, startVerse: 1, endVerse: 16 },
  { book: "ISA", chapter: 40, startVerse: 28, endVerse: 31 },
  { book: "ISA", chapter: 53, startVerse: 1, endVerse: 12 },
  { book: "MAT", chapter: 5, startVerse: 1, endVerse: 12 },
  { book: "MAT", chapter: 11, startVerse: 28, endVerse: 30 },
  { book: "LUK", chapter: 15, startVerse: 1, endVerse: 10 },
  { book: "JHN", chapter: 1, startVerse: 1, endVerse: 14 },
  { book: "JHN", chapter: 3, startVerse: 16, endVerse: 17 },
  { book: "JHN", chapter: 14, startVerse: 1, endVerse: 6 },
  { book: "JHN", chapter: 20, startVerse: 19, endVerse: 29 },
  { book: "ROM", chapter: 8, startVerse: 28, endVerse: 39 },
  { book: "PHP", chapter: 4, startVerse: 4, endVerse: 9 },
  { book: "REV", chapter: 21, startVerse: 1, endVerse: 7 },
];
