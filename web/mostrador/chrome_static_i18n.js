// ============================================================================
// web/mostrador/chrome_static_i18n.js — Costura C3 (`D9-V2LAP`, LCOM4 ∂(C)=0)
// Traducción determinista de rótulos estáticos del cromo bilingüe y obras hermanas.
// ============================================================================

/**
 * Traduce los rótulos estáticos del cromo bilingüe y obras hermanas cuando cambia `uiLocale` (`D6-R41` / `D8-R38`).
 */
export function applyStaticChromeTranslations(targetDoc, uiLocale = "es", state = null) {
  if (!targetDoc || typeof targetDoc.getElementById !== "function") return;
  const isEn = String(uiLocale || "es").toLowerCase().startsWith("en");
  const getEl = (id) => targetDoc.getElementById(id);

  const workTabs = getEl("sovereignWorkTabs");
  if (workTabs && typeof workTabs.setAttribute === "function") {
    workTabs.setAttribute(
      "aria-label",
      isEn ? "Three Works: The Bible, The Blessed, and 1 Gospel" : "Tres Obras: La Biblia, Los Felices y 1 Evangelio",
    );
  }
  const sheetDoors = getEl("bibleProgressiveSheetDoors");
  if (sheetDoors && typeof sheetDoors.setAttribute === "function") {
    sheetDoors.setAttribute(
      "aria-label",
      isEn ? "Reading, Printing, and Study Drawers" : "Gavetas de Lectura, Impresión y Estudio",
    );
  }
  const btnFelOpen = getEl("btnFelicesOpenInBible");
  if (btnFelOpen) {
    btnFelOpen.textContent = isEn
      ? "📖 Open passage in The Bible"
      : "📖 Abrir pasaje en La Biblia";
  }
  const felDichaSel = getEl("felicesDichaSelect");
  if (felDichaSel && felDichaSel.options) {
    const enDichaTitles = {
      "1": "Beatitude 1 · Mt 5:1 (Jesus Goes Up on the Mountain)",
      "2": "Beatitude 2 · Mt 5:3 (Poor in Spirit)",
      "3": "Beatitude 3 · Mt 5:4 (Those Who Mourn)",
      "4": "Beatitude 4 · Mt 5:5 (The Meek)",
      "5": "Beatitude 5 · Mt 5:6 (Hunger and Thirst for Righteousness)",
      "6": "Beatitude 6 · Mt 5:7 (The Merciful)",
      "7": "Beatitude 7 · Mt 5:8 (Pure in Heart)",
      "8": "Beatitude 8 · Mt 5:9 (The Peacemakers)",
      "9": "Beatitude 9 · Mt 5:10 (Persecuted for Righteousness)",
      "10": "Beatitude 10 · Mt 5:11 (Blessed When Reviled)",
      "11": "Beatitude 11 · Mt 5:12 (Joy of the Prophets)",
      "12": "Beatitude 12 · Rev 22:14 (Tree of Life)",
    };
    const esDichaTitles = {
      "1": "Dicha 1 · Mt 5:1 (Jesús sube al Monte)",
      "2": "Dicha 2 · Mt 5:3 (Pobres en Espíritu)",
      "3": "Dicha 3 · Mt 5:4 (Los que Lloran)",
      "4": "Dicha 4 · Mt 5:5 (Los Mansos)",
      "5": "Dicha 5 · Mt 5:6 (Hambre y Sed de Justicia)",
      "6": "Dicha 6 · Mt 5:7 (Misericordiosos)",
      "7": "Dicha 7 · Mt 5:8 (Limpio Corazón)",
      "8": "Dicha 8 · Mt 5:9 (Pacificadores)",
      "9": "Dicha 9 · Mt 5:10 (Perseguidos por la Justicia)",
      "10": "Dicha 10 · Mt 5:11 (Bienaventurados cuando os vituperen)",
      "11": "Dicha 11 · Mt 5:12 (Gozo de los Profetas)",
      "12": "Dicha 12 · Ap 22:14 (Árbol de la Vida)",
    };
    for (const opt of Array.from(felDichaSel.options)) {
      const k = String(opt.value || "");
      const map = isEn ? enDichaTitles : esDichaTitles;
      if (map[k]) opt.textContent = map[k];
    }
  }
  const felPlateSel = getEl("felicesPlateSelect");
  if (felPlateSel && felPlateSel.options) {
    for (const opt of Array.from(felPlateSel.options)) {
      const txt = String(opt.textContent || "");
      opt.textContent = isEn
        ? txt.replace(/^Lámina\b/i, "Plate").replace(/\(Sal\s+/g, "(Ps ")
        : txt.replace(/^Plate\b/i, "Lámina").replace(/\(Ps\s+/g, "(Sal ");
    }
  }
  const rosettaInp = getEl("rosettaSearchInput");
  if (rosettaInp && typeof rosettaInp.setAttribute === "function") {
    rosettaInp.setAttribute(
      "placeholder",
      isEn
        ? "Search H7225, G3056, GEN.31.55..."
        : "Buscar H7225, G3056, GEN.31.55...",
    );
  }
  const stpLexInp = getEl("stpLexiconSearchInput");
  if (stpLexInp && typeof stpLexInp.setAttribute === "function") {
    stpLexInp.setAttribute(
      "placeholder",
      isEn
        ? "Filter Tepehuan lexicon (H0430, Dios, Jich Xoi'kam...)"
        : "Filtrar léxico Tepehuano (H0430, Dios, Jich Xoi'kam...)",
    );
  }
  const diaSummary = getEl("diachronicSubstitutionsSummary");
  if (diaSummary) {
    diaSummary.textContent = isEn
      ? "View 1909 → 21st Century substitutions in this chapter"
      : "Ver sustituciones 1909 → Siglo XXI en este capítulo";
  }
  const photoTechSummary = getEl("photocopyTechReceiptSummary");
  if (photoTechSummary) {
    photoTechSummary.textContent = isEn
      ? "🔬 Optical & Typographic Verification (Kanungo-Sauvola)"
      : "🔬 Verificación Óptica y Tipográfica (Kanungo-Sauvola)";
  }
  const evHeadingEl = getEl("evangeliosMainHeading");
  if (evHeadingEl) {
    evHeadingEl.textContent = isEn
      ? "🌅 The Gospels · 52 Plates"
      : "🌅 Los Evangelios · 52 Láminas";
  }
  const evWeekLblEl = getEl("evangeliosWeekSelectLabel");
  if (evWeekLblEl) {
    evWeekLblEl.textContent = isEn ? "Week:" : "Semana:";
  }
  if (state && typeof state.hydrateEvangeliosSection === "function" && state.activeWork === "evangelios") {
    state.hydrateEvangeliosSection(state.evangeliosQuarter || "T1", state.evangeliosWeekId || "s01");
  }
}
