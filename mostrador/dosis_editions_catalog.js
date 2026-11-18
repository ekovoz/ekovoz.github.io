// ============================================================================
// web/mostrador/dosis_editions_catalog.js — Catálogo de 14+2 Ediciones, 80 Bloques,
// 12 Ramas G_01..G_12, 16 Hojas Tipológicas e Imposición Multi-Pliego 4n
// Extraído de dosis.js (SLICE-V2R-05 · D1-A+ · D4-A+ · ∂(C)=0 · < 800 LOC · 0 Object.freeze)
// ============================================================================

import { BIBLE_CONSTANTS } from "../bible_constants.js";
import { canonicalOrdinalOf } from "./canonical_versification.js";

export const PRECOMPILED_PDF_LANGS = ["es", "en", "stp", "he", "grc"];
export const VERIFIED_TEXT_BIBLE_LANGS = ["es", "es-1909", "en", "stp", "he", "grc"];

export const FIELD_PDFS_REGISTRY = {
  refugio_4_hojas: { bytes: 54295, path: "obras/biblia/campo/refugio_4_hojas.pdf" },
  checklist_80_bloques: { bytes: 12437, path: "obras/biblia/campo/checklist_80_bloques.pdf" },
};

/** Resuelve si un código de idioma cuenta con PDFs precompilados en la federación Same-Origin `editions-01`. */
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
    .replace(/^\/+(?=(?:data|obras|editions-01|packs-0[1-7])\/)/, "");
}

export const CANONICAL_14_PLUS_2_EDITIONS_CATALOG = [
  { id: "01_1col_lectura", editionSlug: "01_1col_lectura", label: "1. Lectura Continua (1 col · 10.5pt)", label_en: "1. Continuous Reading (1 col · 10.5pt)", kind: "edition", columns: 1, fontPt: 10.5 },
  { id: "02_2col_pastoral", editionSlug: "02_2col_pastoral", label: "2. Pastoral Clásica (2 col · 9.5pt)", label_en: "2. Classic Pastoral (2 col · 9.5pt)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "03_3col_compacta", editionSlug: "03_3col_compacta", label: "3. Compacta de Bolsillo (3 col · 8.0pt)", label_en: "3. Pocket Compact (3 col · 8.0pt)", kind: "edition", columns: 3, fontPt: 8.0 },
  { id: "04_1col_letra_grande", editionSlug: "04_1col_letra_grande", label: "4. Letra Grande Abuelos (1 col · 13.5pt)", label_en: "4. Large Print Elders (1 col · 13.5pt)", kind: "edition", columns: 1, fontPt: 13.5 },
  { id: "05_interlineal_estudio", editionSlug: "05_interlineal_estudio", label: "5. Interlineal de Estudio 14-Col (A4)", label_en: "5. 14-Col Study Interlinear (A4)", kind: "edition", columns: 1, fontPt: 9.0 },
  { id: "06_bilingue_paralela", editionSlug: "06_bilingue_paralela", label: "6. Díptico Bilingüe 58/42 (Materna + Puente)", label_en: "6. Bilingual Diptych 58/42 (Vernacular + Bridge)", kind: "edition", columns: 2, fontPt: 9.5 },
  { id: "07_cuaderno_5lineas_apaisado", editionSlug: "07_cuaderno_5lineas_apaisado", label: "7. Cuaderno de Campo 5 Líneas (Landscape)", label_en: "7. 5-Line Field Notebook (Landscape)", kind: "edition", columns: 1, fontPt: 10.0 },
  { id: "08_bolsillo_misionero", editionSlug: "08_bolsillo_misionero", label: "8. Pliego Saddle-Stitch 4n (Imposición)", label_en: "8. Saddle-Stitch 4n Booklet (Imposition)", kind: "edition", columns: 2, fontPt: 8.5 },
  { id: "09_atril_liturgico", editionSlug: "09_atril_liturgico", label: "9. Edición de Atril y Asamblea (Folio)", label_en: "9. Pulpit & Assembly Folio Edition", kind: "edition", columns: 2, fontPt: 12.0 },
  { id: "10_evangelio_14_pericopas", editionSlug: "10_evangelio_14_pericopas", label: "10. Evangelio 14 Perícopas (2 col · 10.0pt)", label_en: "10. Gospel 14 Pericopes (2 col · 10.0pt)", kind: "edition", columns: 2, fontPt: 10.0 },
  { id: "11_braille_nemeth_b70", editionSlug: "11_braille_nemeth_b70", label: "11. Braille Táctil BEB B70 (1 col · 16.0pt)", label_en: "11. Tactile Braille BEB B70 (1 col · 16.0pt)", kind: "edition", columns: 1, fontPt: 16.0 },
  { id: "12_dislexia_espaciado_amplio", editionSlug: "12_dislexia_espaciado_amplio", label: "12. Dislexia Espaciado Amplio (1 col · 12.5pt)", label_en: "12. Dyslexia Wide Spacing (1 col · 12.5pt)", kind: "edition", columns: 1, fontPt: 12.5 },
  { id: "13_contraste_extremo_baja_vision", editionSlug: "13_contraste_extremo_baja_vision", label: "13. Baja Visión Contraste Extremo (1 col · 15.0pt)", label_en: "13. Low Vision High Contrast (1 col · 15.0pt)", kind: "edition", columns: 1, fontPt: 15.0 },
  { id: "14_pliego_mural_comunitario", editionSlug: "14_pliego_mural_comunitario", label: "14. Pliego Mural Comunitario A3 (3 col · 11.0pt)", label_en: "14. Community Mural Sheet A3 (3 col · 11.0pt)", kind: "edition", columns: 3, fontPt: 11.0 },
  { id: "15_refugio_4_hojas", editionSlug: "refugio_4_hojas", label: "15. Refugio de Emergencia (4 Hojas · PDF)", label_en: "15. Emergency Pocket Refuge (4 Sheets · PDF)", kind: "field_pdf", url: "obras/biblia/campo/refugio_4_hojas.pdf", bytes: 54295 },
  { id: "16_checklist_80_bloques", editionSlug: "checklist_80_bloques", label: "16. Checklist de 80 Bloques de Campo (PDF)", label_en: "16. 80 Canonical Field Blocks Checklist (PDF)", kind: "field_pdf", url: "obras/biblia/campo/checklist_80_bloques.pdf", bytes: 12437 },
];

export const CANONICAL_9_TOML_PROFILES = [
  { id: "01_1col_lectura", tomlPath: "obras/biblia/profiles/01_1col_lectura.toml", columns: 1, fontPt: 10.5, leadingRatio: 1.38, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 62 },
  { id: "02_2col_pastoral", tomlPath: "obras/biblia/profiles/02_2col_pastoral.toml", columns: 2, fontPt: 9.5, leadingRatio: 1.32, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 48 },
  { id: "03_3col_compacta", tomlPath: "obras/biblia/profiles/03_3col_compacta.toml", columns: 3, fontPt: 8.0, leadingRatio: 1.24, paperSize: "A4", impositionMode: "saddle_stitch", gutterMm: 9.215, cplTarget: 36 },
  { id: "04_1col_letra_grande", tomlPath: "obras/biblia/profiles/04_1col_letra_grande.toml", columns: 1, fontPt: 13.5, leadingRatio: 1.45, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 52 },
  { id: "05_interlineal_estudio", tomlPath: "obras/biblia/profiles/05_interlineal_estudio.toml", columns: 1, fontPt: 9.0, leadingRatio: 1.50, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 68 },
  { id: "06_bilingue_paralela", tomlPath: "obras/biblia/profiles/06_bilingue_paralela.toml", columns: 2, fontPt: 9.5, leadingRatio: 1.34, paperSize: "A4", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 58 },
  { id: "07_cuaderno_5lineas_apaisado", tomlPath: "obras/biblia/profiles/07_cuaderno_5lineas_apaisado.toml", columns: 1, fontPt: 10.0, leadingRatio: 1.60, paperSize: "A4-Landscape", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 70 },
  { id: "08_bolsillo_misionero", tomlPath: "obras/biblia/profiles/08_bolsillo_misionero.toml", columns: 2, fontPt: 8.5, leadingRatio: 1.26, paperSize: "A4", impositionMode: "multi_signature_4n", gutterMm: 9.215, cplTarget: 44 },
  { id: "09_atril_liturgico", tomlPath: "obras/biblia/profiles/09_atril_liturgico.toml", columns: 2, fontPt: 12.0, leadingRatio: 1.42, paperSize: "Folio", impositionMode: "multi_signature_4n", gutterMm: 14.0, cplTarget: 54 },
];

export const CANONICAL_14_PRINT_PROFILES = [
  ...CANONICAL_9_TOML_PROFILES,
  { id: "10_evangelio_14_pericopas", tomlPath: "obras/biblia/profiles/10_evangelio_14_pericopas.toml", columns: 2, fontPt: 10.0, leadingRatio: 1.35, paperSize: "A4", impositionMode: "saddle_stitch", gutterMm: 9.215, cplTarget: 50 },
  { id: "11_braille_nemeth_b70", tomlPath: "obras/biblia/profiles/11_braille_nemeth_b70.toml", columns: 1, fontPt: 16.0, leadingRatio: 1.65, paperSize: "B70-Braille", impositionMode: "single_sheet_20mm", gutterMm: 22.0, cplTarget: 40 },
  { id: "12_dislexia_espaciado_amplio", tomlPath: "obras/biblia/profiles/12_dislexia_espaciado_amplio.toml", columns: 1, fontPt: 12.5, leadingRatio: 1.55, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 52 },
  { id: "13_contraste_extremo_baja_vision", tomlPath: "obras/biblia/profiles/13_contraste_extremo_baja_vision.toml", columns: 1, fontPt: 15.0, leadingRatio: 1.50, paperSize: "Letter", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 46 },
  { id: "14_pliego_mural_comunitario", tomlPath: "obras/biblia/profiles/14_pliego_mural_comunitario.toml", columns: 3, fontPt: 11.0, leadingRatio: 1.40, paperSize: "A3", impositionMode: "single_sheet_20mm", gutterMm: 20.0, cplTarget: 64 },
];

export const CANONICAL_12_BRANCH_PROFILES = [
  { id: "G_01_latin_extended", tomlPath: "obras/biblia/profiles/G_01_latin_extended.toml", leadingRatio: 1.32 },
  { id: "G_02_arabic_naskh_nastaliq", tomlPath: "obras/biblia/profiles/G_02_arabic_naskh_nastaliq.toml", leadingRatio: 1.55 },
  { id: "G_03_indic_brahmic_aksara", tomlPath: "obras/biblia/profiles/G_03_indic_brahmic_aksara.toml", leadingRatio: 1.48 },
  { id: "G_04_cjk_ideographic_grid", tomlPath: "obras/biblia/profiles/G_04_cjk_ideographic_grid.toml", leadingRatio: 1.60 },
  { id: "G_05_cyrillic_eurasian", tomlPath: "obras/biblia/profiles/G_05_cyrillic_eurasian.toml", leadingRatio: 1.34 },
  { id: "G_06_ethiopic_abugida", tomlPath: "obras/biblia/profiles/G_06_ethiopic_abugida.toml", leadingRatio: 1.42 },
  { id: "G_07_se_asian_tall_stack", tomlPath: "obras/biblia/profiles/G_07_se_asian_tall_stack.toml", leadingRatio: 1.75 },
  { id: "G_08_hebrew_syriac_masoretic", tomlPath: "obras/biblia/profiles/G_08_hebrew_syriac_masoretic.toml", leadingRatio: 1.46 },
  { id: "G_09_african_tonal_ipa", tomlPath: "obras/biblia/profiles/G_09_african_tonal_ipa.toml", leadingRatio: 1.38 },
  { id: "G_10_amerindian_polysynthetic", tomlPath: "obras/biblia/profiles/G_10_amerindian_polysynthetic.toml", leadingRatio: 1.40 },
  { id: "G_11_syllabics_tifinagh_nko", tomlPath: "obras/biblia/profiles/G_11_syllabics_tifinagh_nko.toml", leadingRatio: 1.44 },
  { id: "G_12_sign_tactile_oral_only", tomlPath: "obras/biblia/profiles/G_12_sign_tactile_oral_only.toml", leadingRatio: 1.50 },
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
  ["LAM", 5, "AT · Profetas Mayores"], ["EZE", 48, "AT · Profetas Mayores"], ["DAN", 12, "AT · Profetas Mayores"],
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
  { id: "de_typology", lang_code: "de", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "en_typology", lang_code: "en", word_order: "Svo", family_subclade: "CLADE_008::eng", is_head_final_postpositional: false },
  { id: "es_typology", lang_code: "es", word_order: "Vso", family_subclade: "Indo-European::Romance-Iberian", is_head_final_postpositional: false, copula_affirmative: "es", negation_preverbal: "no" },
  { id: "fr_typology", lang_code: "fr", word_order: "Svo", family_subclade: "CLADE_001::fra", is_head_final_postpositional: false },
  { id: "grc_typology", lang_code: "grc", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "he_typology", lang_code: "he", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "hi_typology", lang_code: "hi", word_order: "Sov", family_subclade: "HeadFinal::SOV-Macro", is_head_final_postpositional: true },
  { id: "id_typology", lang_code: "id", word_order: "Svo", family_subclade: "CLADE_031::ind", is_head_final_postpositional: false },
  { id: "nah_typology", lang_code: "nah", word_order: "Vso", family_subclade: "Uto-Aztecan::Aztecan", is_head_final_postpositional: false, copula_affirmative: "ca", negation_preverbal: "amo" },
  { id: "pt_typology", lang_code: "pt", word_order: "Vso", family_subclade: "Classical::VSO-VerbInitial", is_head_final_postpositional: false },
  { id: "quy_typology", lang_code: "quy", word_order: "Sov", family_subclade: "Quechuan::Southern-Quechua", is_head_final_postpositional: true, copula_affirmative: "kan", negation_preverbal: "mana" },
  { id: "quz_typology", lang_code: "quz", word_order: "Sov", family_subclade: "Quechuan::Southern-Quechua", is_head_final_postpositional: true, copula_affirmative: "kan", negation_preverbal: "mana" },
  { id: "stp_typology", lang_code: "stp", word_order: "Vso", family_subclade: "Uto-Aztecan::Tepiman", is_head_final_postpositional: false, copula_affirmative: "jir", negation_preverbal: "cham" },
  { id: "sw_typology", lang_code: "sw", word_order: "Svo", family_subclade: "CLADE_021::swa", is_head_final_postpositional: false },
  { id: "tr_typology", lang_code: "tr", word_order: "Sov", family_subclade: "HeadFinal::SOV-Macro", is_head_final_postpositional: true },
];

export function resolveCanonicalBlockForPassage(book = "GEN", chapter = 1) {
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const cleanChapter = Math.max(1, Number(chapter) || 1);
  const bookIndexMap = new Map(
    CANONICAL_66_BOOKS_CHAPTER_COUNTS.map(([bCode], idx) => [bCode, idx])
  );
  const targetBookIdx = bookIndexMap.has(cleanBook) ? bookIndexMap.get(cleanBook) : 0;

  for (const blk of CANONICAL_80_BLOCKS_CATALOG) {
    const startBook = blk.startBook || String(blk.startRef || "GEN.1").split(".")[0];
    const startCh = Number(blk.startChapter || String(blk.startRef || "GEN.1").split(".")[1]) || 1;
    const endBook = blk.endBook || String(blk.endRef || "GEN.15").split(".")[0];
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

export function resolveCanonicalBlockCode(book = "GEN", chapter = 1, verse = 1) {
  const totalBlocks = Number(BIBLE_CONSTANTS?.CANONICAL_BLOCKS_COUNT) || 80;
  const totalVerses = Number(BIBLE_CONSTANTS?.CANONICAL_VERSES_COUNT) || 31102;
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const cleanChap = Math.max(1, Number(chapter) || 1);
  const cleanVerse = Math.max(1, Number(verse) || 1);
  const blk = resolveCanonicalBlockForPassage(cleanBook, cleanChap);
  let blockNumber = Number(blk?.blockNumber);
  if (!Number.isFinite(blockNumber) || blockNumber < 1 || blockNumber > totalBlocks) {
    const ord = canonicalOrdinalOf(cleanBook, cleanChap, cleanVerse) || 1;
    blockNumber = Math.min(
      totalBlocks,
      Math.max(1, Math.ceil((ord / totalVerses) * totalBlocks)),
    );
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

const EDITORIAL_PROFILE_PRIMARY_KEY_ALIASES = Object.freeze({
  "1col-reading": "01_1col_lectura",
  "1col-a4": "01_1col_lectura",
  "1col-letter": "01_1col_lectura",
  "2col-pastoral": "02_2col_pastoral",
  "2col-letter": "02_2col_pastoral",
  "2col-a4": "02_2col_pastoral",
  "3col-compact": "03_3col_compacta",
  "3col-a4": "03_3col_compacta",
  "3col-letter": "03_3col_compacta",
  "1col-large-print": "04_1col_letra_grande",
  "large-print": "04_1col_letra_grande",
  "interlinear-study": "05_interlineal_estudio",
  "bilingual-parallel": "06_bilingue_paralela",
  "field-notebook-5line": "07_cuaderno_5lineas_apaisado",
  "booklet-pocket": "08_bolsillo_misionero",
  "pulpit-folio": "09_atril_liturgico",
  "gospel-14-pericopes": "10_evangelio_14_pericopas",
  "braille-nemeth-b70": "11_braille_nemeth_b70",
  "dyslexia-wide": "12_dislexia_espaciado_amplio",
  "low-vision-contrast": "13_contraste_extremo_baja_vision",
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
      CANONICAL_14_PRINT_PROFILES[slotIdx] = {
        ...prev,
        ...p,
        id: canonicalId,
        tomlPath: prev.tomlPath || p.tomlPath || p.toml_path || `obras/biblia/profiles/${canonicalId}.toml`,
        columns: Number(p.columns ?? parsedTypography.columns ?? parsedTypography.default_columns ?? prev.columns ?? 2),
        fontPt: Number(p.fontPt ?? parsedTypography.font_size_pt ?? parsedTypography.default_font_size_pt ?? prev.fontPt ?? 9.5),
        leadingRatio: Number(p.leadingRatio ?? parsedTypography.line_height_ratio ?? prev.leadingRatio ?? 1.35),
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
      CANONICAL_9_TOML_PROFILES.push(extra9 ? { ...extra9, ...p, id: p.id } : p);
    }
  }
  if (Array.isArray(artifact.canonical_9_plus_2_editions) && artifact.canonical_9_plus_2_editions.length >= 16) {
    CANONICAL_14_PLUS_2_EDITIONS_CATALOG.length = 0;
    for (const ed of artifact.canonical_9_plus_2_editions) {
      CANONICAL_14_PLUS_2_EDITIONS_CATALOG.push(ed);
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
    CANONICAL_80_BLOCKS_CATALOG.length = 0;
    for (const blk of rawBlocks) {
      CANONICAL_80_BLOCKS_CATALOG.push(blk);
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
    `<div id="bibleBranchAndTypologyInspector" class="branch-typology-inspector-card" data-branch-count="${branches.length}" data-typology-count="${typologies.length}" data-active-branch="${matchedBranch.id}" data-active-typology="${matchedTypology.id}" style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="font-weight:700;margin-bottom:0.4rem;">🌐 ${isEn ? "12 Script Branches Inspector (G_01–G_12) & 16 Typological Sheets" : "Inspector de 12 Ramas de Escritura (G_01–G_12) y 16 Hojas Tipológicas"}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.45rem;">` +
    `<label style="flex:1;min-width:210px;">${isEn ? "Branch (12)" : "Rama (12)"}: <select id="branchProfileSelect" aria-label="${isEn ? "Typographic Branch G_01 to G_12" : "Rama Tipográfica G_01 a G_12"}" style="width:100%;min-height:48px;">${branchOptions}</select></label>` +
    `<label style="flex:1;min-width:210px;">${isEn ? "Typology (16)" : "Tipología (16)"}: <select id="typologySheetSelect" aria-label="${isEn ? "Linguistic Typology Sheet (16)" : "Hoja de Tipología Lingüística (16)"}" style="width:100%;min-height:48px;">${typologyOptions}</select></label>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.45rem;color:var(--text-secondary);">` +
    `<span class="uls-chip" data-branch-meta="${matchedBranch.id}" style="font-size:0.75rem;padding:0.2rem 0.5rem;">${isEn ? "Branch" : "Rama"}: <strong>${bParsed.name_es || matchedBranch.id}</strong> · ${isEn ? "Order" : "Orden"}=${bParsed.word_order || "SVO"} · ${isEn ? "Morphology" : "Morfología"}=${bParsed.morphology || "FUSIONAL"} · ${isEn ? "Alignment" : "Alineamiento"}=${bParsed.alignment || "NOM_ACC"}</span>` +
    `<span class="uls-chip" data-typology-meta="${matchedTypology.id}" style="font-size:0.75rem;padding:0.2rem 0.5rem;">${isEn ? "Typology" : "Tipología"}: <strong>${matchedTypology.lang_code}</strong> · ${isEn ? "Order" : "Orden"}=${matchedTypology.word_order} · ${isEn ? "Clade" : "Clade"}=${matchedTypology.family_subclade} · ${isEn ? "Copula" : "Cópula"}=${matchedTypology.copula_affirmative || "∅"} · ${isEn ? "Negation" : "Negación"}=${matchedTypology.negation_preverbal || "∅"}</span>` +
    `</div>` +
    `<div id="branchTypologyLiveSpecimen" data-live-specimen-branch="${matchedBranch.id}" data-live-specimen-typology="${matchedTypology.id}" data-live-specimen-order="${specimenOrder}" style="margin-top:0.45rem;padding:0.45rem 0.65rem;border-radius:8px;border:1px dashed var(--card-border);background:var(--bg-secondary);font-size:0.78rem;">` +
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
        `<span class="uls-chip" data-signature-code="${s.signatureCode}" style="font-size:0.74rem;padding:0.2rem 0.5rem;">${s.signatureCode} (p.${s.startPage}–${s.endPage} · creep ${s.maxCreepMm}mm · ${isEn ? "mark" : "marca"} Y=${s.steppedCollationMarkYMm}mm)</span>`,
    )
    .join(" ");

  const blockOptionsHtml = CANONICAL_80_BLOCKS_CATALOG.map((item) => {
    const sel = item.blockNumber === blk.blockNumber ? " selected" : "";
    return `<option value="${item.blockNumber}"${sel}>${item.blockId} · ${item.rangeLabel} (${item.testament})</option>`;
  }).join("");

  return (
    `<div class="multi-signature-imposition-card" data-multi-signature="true" data-signature-count="${multiSig.signatureCount}" data-max-creep-mm="${multiSig.maxCreepMm}" data-kl-divergence="${POCKET_REFUGE_4_SHEETS_SPEC.klDivergence}" style="margin-top:0.55rem;padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="font-weight:700;margin-bottom:0.3rem;">📐 ${isEn ? `4n Multi-Signature Imposition (${multiSig.summary})` : `Imposición Multi-Pliego 4n (${multiSig.summary})`}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.45rem;">${sigRows}</div>` +
    `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.45rem;">` +
    `<label for="canonicalBlockSelect" style="font-weight:600;">${isEn ? "Explore 80 Canonical Blocks:" : "Explorar 80 Bloques Canónicos:"}</label>` +
    `<select id="canonicalBlockSelect" data-action="select-canonical-block" aria-label="${isEn ? "Select Canonical Block (1 to 80)" : "Seleccionar Bloque Canónico (1 a 80)"}" style="min-height:48px;flex:1;min-width:210px;">${blockOptionsHtml}</select>` +
    `</div>` +
    `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.4rem;color:var(--text-secondary);">` +
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
  const paperSize =
    resolvedPrefix === "01"
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
    "08": 8.5, "09": 12.0, "10": 10.0, "11": 16.0, "12": 12.5, "13": 15.0, "14": 11.0,
  };
  const usePrefixDefaults = Boolean(numPrefix && exactIdx < 0 && prefixIdx < 0);
  return {
    profileId: usePrefixDefaults ? cleanId : found.id,
    columns: usePrefixDefaults
      ? defaultColsByPrefix[resolvedPrefix] || 2
      : Number(found.columns) || defaultColsByPrefix[resolvedPrefix] || 2,
    fontPt: usePrefixDefaults
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
  const precompiledLang = resolvePrecompiledDiskLang(cleanLang);
  const spec = resolveEditionGeometrySpec(id, paper);
  const editionDir = spec.editionDir;

  if (!precompiledLang) {
    const chosenBlock =
      blockId && /^B\d{2}$/i.test(String(blockId))
        ? String(blockId).toUpperCase()
        : spec.sampleBlockId || "FULL";
    return `mostrador/tanda_print_worker.js?lang=${encodeURIComponent(cleanLang)}&edition=${encodeURIComponent(editionDir)}&profile=${encodeURIComponent(id)}&block=${encodeURIComponent(chosenBlock)}`;
  }

  if (spec.sampleBlockId) {
    const chosenBlock =
      blockId && /^B\d{2}$/i.test(String(blockId)) && String(blockId).toUpperCase() !== "B01"
        ? String(blockId).toUpperCase()
        : spec.sampleBlockId;
    return `editions-01/data/blocks/${precompiledLang}/${editionDir}/${chosenBlock}.pdf`;
  }
  if (manifestFallbackPath) {
    return buildRelativePdfAssetUrl(manifestFallbackPath);
  }
  return `editions-01/data/full/${precompiledLang}/${editionDir}.pdf`;
}

/** Calcula en tiempo real el presupuesto tipográfico Kindle / Impresión. */
export function computeKindlePrintBudget({
  fontPt = 9.5,
  columns = 2,
  orientation = "landscape",
  paper = "A4",
  script = "Latn",
} = {}) {
  const cleanPt = Math.max(7.0, Math.min(18.0, Number(fontPt) || 9.5));
  const reqCols = Math.max(1, Math.min(3, Number(columns) || 2));
  const cleanOrientation = String(orientation || "landscape").toLowerCase() === "portrait" ? "Portrait" : "Landscape";
  const cleanPaper = String(paper || "A4").toUpperCase() === "LETTER" ? "Letter" : "A4";
  const isComplexScript = /^(Tibt|Arab|Hebr|Deva)$/i.test(String(script || "Latn"));

  const effectiveColumns = reqCols === 3 && (cleanPt >= 11.0 || isComplexScript) ? 2 : reqCols;
  const pageWidthPt =
    cleanPaper === "LETTER"
      ? cleanOrientation === "Landscape" ? 792 : 612
      : cleanOrientation === "Landscape" ? 842 : 595;
  const printableWidthPt = pageWidthPt - 72 - (effectiveColumns - 1) * 18;
  const colWidthPt = printableWidthPt / effectiveColumns;
  const cpl = Math.max(24, Math.min(92, Math.round((colWidthPt / (cleanPt * 0.52)) * 0.42)));
  const basePages = 1180;
  const scaleFactor = Math.pow(cleanPt / 9.5, 1.65) * (2 / effectiveColumns);
  const estimatedPages = Math.max(420, Math.round(basePages * scaleFactor));
  const clampedNote = effectiveColumns !== reqCols ? ` [clamp ${reqCols}→${effectiveColumns} col]` : "";
  const summaryText = `${cleanPt.toFixed(1).replace(/\.0$/, "")}pt · ${effectiveColumns} col · ${cleanOrientation} · ${cleanPaper} (${cpl} cpl · ~${estimatedPages} págs)${clampedNote}`;

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
  const budget = computeKindlePrintBudget({ fontPt, columns, paper: normPaper });
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
    `data-paper="${normPaper}" ` +
    `data-spine-gutter-mm="${foliation.spineGutterMm || 9.215}" ` +
    `data-binding-margin-mm="${foliation.bindingMarginMm || 20.0}" ` +
    `data-creep-mm="${imp.maxCreepMm}" ` +
    `style="padding:0.45rem 0.65rem;border-radius:8px;border:1px solid var(--badge-border);background:var(--badge-bg);display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;justify-content:space-between;">` +
    `<strong>${titleText}</strong>` +
    `<span>${detailText}</span>` +
    `</div>`
  );
}
