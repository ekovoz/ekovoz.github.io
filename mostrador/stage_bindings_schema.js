// ============================================================================
// web/mostrador/stage_bindings_schema.js — Capa L0 Pura ∂(C) = 0
// Decisión D13-HIG9 (SLICE-EKO-HIG9-03): Esquemas declarativos de botones,
// perfiles ortográficos, formato de papel y selectores de roving tabindex.
// Cero dependencias de DOM, Store o red.
// ============================================================================

export const ORTHO_PROFILE_BINDINGS = Object.freeze([
  ["btnOrthoInali", "inali", null],
  ["btnOrthoTradicional", "tradicional", null],
  ["btnOrthoFonetica", "fonetica", null],
  ["btnOrthoBnBd", "bn-BD", null],
  ["btnOrthoBnIn", "bn-IN", null],
  ["btnOrthoArbTashkeel", "TASHKEEL_STRIPPED", "VOWELIZED"],
  ["btnOrthoUznCyrl", "CYRL", "LATN"],
  ["btnOrthoTzmTfng", "TFNG", "LATN"],
]);

export const APPEARANCE_THEME_BINDINGS = Object.freeze([
  ["btnThemeLight", "light"],
  ["btnThemeSepia", "sepia"],
  ["btnThemeDark", "dark"],
]);

export const APPEARANCE_FONT_BINDINGS = Object.freeze([
  ["btnFontSerif", "serif"],
  ["btnFontSans", "sans"],
]);

export const APPEARANCE_SCALE_BINDINGS = Object.freeze([
  ["btnScaleDown", -0.1],
  ["btnScaleUp", 0.1],
]);

export const SISTER_WORK_TAB_BINDINGS = Object.freeze([
  ["tabWorkBiblia", "biblia"],
  ["tabWorkFelices", "felices"],
  ["tabWorkEvangelios", "evangelios"],
]);

export const ROVING_TABLIST_SELECTORS = Object.freeze([
  "#sovereignWorkTabs",
  "#studyHarelSubtabsBar",
  "#printDosisHarelSubtabsBar",
  "#workshopHarelSubtabsBar",
  "#dosisHarelSubtabsBar",
  "#compassModeTabsBar",
]);
