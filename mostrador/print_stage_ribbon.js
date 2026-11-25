// ============================================================================
// web/mostrador/print_stage_ribbon.js — Proyección pura de Imprenta por Etapas (`D1-R13`, `D2-R13`, `D3-R13`).
// Frontera limpia ∂(C) = 0: cero dependencias Node, cero estilos inline y copy humano libre de jerga técnica.
// ============================================================================

const TIER1_FULL_BIBLE_LANGS = new Set([
  "es", "es-1909", "en", "ar", "bn", "de", "fa", "fr",
  "hi", "id", "it", "ja", "ko", "pt", "ru", "sw", "tr", "ur", "zh-hans",
]);

const TIER3_PORTION_LANGS = new Set(["arp", "bre", "cha"]);

export const NATURAL_PRINT_STAGE_PRESETS = [
  { id: "evangelios4", books: ["MAT", "MRK", "LUK", "JHN"], labelEs: "4 Evangelios", labelEn: "4 Gospels", pagesHint: "~80p" },
  { id: "nt27", books: 27, labelEs: "Nuevo Testamento (27)", labelEn: "New Testament (27)", pagesHint: "~280p" },
  { id: "salmosProverbios", books: ["PSA", "PRO"], labelEs: "Salmos y Proverbios", labelEn: "Psalms & Proverbs", pagesHint: "~120p" },
  { id: "biblia66", books: 66, labelEs: "Biblia Completa (66)", labelEn: "Full Bible (66)", pagesHint: "~1,100p" },
];

function escHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Clasifica el Tier epistémico real (`0..4`) del idioma activo para proyectar opciones honestas de impresión.
 */
export function resolveCorpusPrintTier(lang = "es", bookEpistemicTiers = null) {
  const clean = String(lang || "es").trim().toLowerCase();
  if (clean === "he" || clean === "grc") return 0;
  if (TIER1_FULL_BIBLE_LANGS.has(clean)) return 1;
  if (clean === "stp") return 2;
  if (TIER3_PORTION_LANGS.has(clean)) return 3;
  if (bookEpistemicTiers && typeof bookEpistemicTiers === "object") {
    const vals = Object.values(bookEpistemicTiers).map((v) => Number(v));
    if (vals.some((v) => v === 2)) return 2;
    if (vals.some((v) => v === 3)) return 3;
  }
  return 4;
}

/**
 * Proyecta los botones de descarga por etapas (`Etapa 1 / 2 / 3`) respetando el Tier real del corpus (`D3-R13`).
 */
export function resolvePrintStageDescriptorsForTier({
  lang = "en",
  book = "JHN",
  chapter = 1,
  canonicalBlock = null,
  bookEpistemicTiers = null,
  uiLocale = "en",
} = {}) {
  const isEn = String(uiLocale || "en").trim().toLowerCase().startsWith("en");
  const tier = resolveCorpusPrintTier(lang, bookEpistemicTiers);
  const cleanBook = String(book || "JHN").trim().toUpperCase();
  const cleanChap = Math.max(1, Number(chapter) || 1);
  const blockCode = canonicalBlock?.code
    ? String(canonicalBlock.code)
    : `B${String(Math.max(1, Math.min(80, Number(canonicalBlock?.blockNumber) || 1))).padStart(2, "0")}`;

  if (tier <= 1) {
    return {
      tier,
      heading: isEn ? "Print or download PDF by stage" : "Descarga o imprime en PDF por etapas",
      subline: isEn
        ? "Choose 1 chapter, a printable booklet, or the complete 66-book Bible (offline, free)."
        : "Elige 1 capítulo hoy, un cuadernillo por libro o la Biblia completa (66 libros, sin internet).",
      stages: [
        {
          id: "btnStagePdfDose1",
          action: "dose1",
          label: isEn ? "1. This Chapter PDF" : "1. PDF de este capítulo",
          sublabel: `${cleanBook} ${cleanChap}`,
          badge: isEn ? "<= 12 pp." : "<= 12 págs.",
          primary: true,
        },
        {
          id: "btnStagePdfDose2",
          action: "dose2",
          label: isEn ? "2. Booklet / Book PDF" : "2. Cuadernillo / Libro PDF",
          sublabel: isEn ? `Block ${blockCode}` : `Bloque ${blockCode}`,
          badge: isEn ? "2-sided" : "Doble cara",
          primary: true,
        },
        {
          id: "btnStagePdfDose3",
          action: "dose3",
          label: isEn ? "3. Full Bible PDF (66)" : "3. Biblia Completa PDF (66)",
          sublabel: isEn ? "14+2 print editions" : "14+2 formatos",
          badge: isEn ? "All books" : "Completa",
          primary: true,
        },
      ],
      secondaryAction: {
        id: "btnStagePdfMoreFormats",
        action: "open-print",
        label: isEn ? "Paper size, Braille & offline copy" : "Tamaño, Braille y copia sin internet",
      },
    };
  }

  if (tier === 2) {
    return {
      tier,
      heading: isEn ? "Verified New Testament + Bilingual Workbook" : "Nuevo Testamento PDF + Cuaderno Bilingüe AT",
      subline: isEn
        ? "Print verified NT books cleanly, or print bilingual side-by-side sheets for the Old Testament."
        : "Imprime el Nuevo Testamento verificado en PDF o el cuaderno bilingüe 62/38 para avanzar el Antiguo Testamento.",
      stages: [
        {
          id: "btnStagePdfDose1",
          action: "dose1",
          label: isEn ? "1. This Passage PDF" : "1. PDF de este pasaje",
          sublabel: `${cleanBook} ${cleanChap}`,
          badge: isEn ? "Verified NT" : "NT verificado",
          primary: true,
        },
        {
          id: "btnStagePdfDose2",
          action: "stage-nt",
          label: isEn ? "2. Full New Testament PDF (27)" : "2. Nuevo Testamento Completo PDF (27)",
          sublabel: isEn ? "27 verified books" : "27 libros completos",
          badge: "NT 27",
          primary: true,
        },
        {
          id: "btnStagePdfDose3",
          action: "open-print",
          label: isEn ? "3. Bilingual Workbook PDF (62/38)" : "3. Cuaderno Bilingüe AT PDF (62/38)",
          sublabel: isEn ? "Mother tongue + bridge" : "Lengua materna + puente",
          badge: isEn ? "Workbook" : "Taller",
          primary: false,
        },
      ],
      secondaryAction: {
        id: "btnStagePdfMoreFormats",
        action: "open-share",
        label: isEn ? "Save offline pack (USB / QR)" : "Guardar sin internet (USB / QR)",
      },
    };
  }

  if (tier === 3) {
    return {
      tier,
      heading: isEn ? "Verified Scripture Portion + Bridge Workbook" : "Porciones Verificadas PDF + Cuaderno Puente",
      subline: isEn
        ? "Public-domain verified books ready to print, paired with a regional bridge Bible."
        : "Libros verificados listos para imprimir, junto con el cuaderno bilingüe en lengua puente.",
      stages: [
        {
          id: "btnStagePdfDose1",
          action: "dose1",
          label: isEn ? "1. Current Portion PDF" : "1. PDF de esta porción",
          sublabel: `${cleanBook} ${cleanChap}`,
          badge: isEn ? "Verified portion" : "Porción PDF",
          primary: true,
        },
        {
          id: "btnStagePdfDose2",
          action: "dose2",
          label: isEn ? "2. Available Books Booklet" : "2. Cuadernillo libros disponibles",
          sublabel: isEn ? `Block ${blockCode}` : `Bloque ${blockCode}`,
          badge: isEn ? "2-sided" : "Doble cara",
          primary: true,
        },
        {
          id: "btnStagePdfDose3",
          action: "open-print",
          label: isEn ? "3. Bridge Workbook (62/38)" : "3. Cuaderno Bilingüe Puente (62/38)",
          sublabel: isEn ? "Ready to annotate" : "Listo para revisar",
          badge: isEn ? "Bilingual" : "Bilingüe",
          primary: false,
        },
      ],
      secondaryAction: {
        id: "btnStagePdfMoreFormats",
        action: "open-print",
        label: isEn ? "More print options" : "Más opciones de impresión",
      },
    };
  }

  return {
    tier: 4,
    heading: isEn ? "Regional Bridge Bible + Community Field Notebook" : "Biblia en Lengua Puente PDF + Cuaderno de Campo",
    subline: isEn
      ? "Zero machine-invented Scripture. Print the regional bridge Bible or a blank bilingual workbook."
      : "Cero Escritura inventada por máquina. Imprime la Biblia puente regional o el cuaderno comunitario.",
    stages: [
      {
        id: "btnStagePdfDose1",
        action: "dose1",
        label: isEn ? "1. Bridge Passage PDF" : "1. PDF en lengua puente",
        sublabel: `${cleanBook} ${cleanChap}`,
        badge: isEn ? "Bridge text" : "Texto puente",
        primary: true,
      },
      {
        id: "btnStagePdfDose2",
        action: "open-print",
        label: isEn ? "2. Bridge Booklet PDF" : "2. Cuadernillo puente PDF",
        sublabel: isEn ? "Paper Carta / A4" : "Carta / A4 doble cara",
        badge: isEn ? "Printable" : "Imprimible",
        primary: true,
      },
      {
        id: "btnStagePdfDose3",
        action: "open-print",
        label: isEn ? "3. Field Translation Notebook (Ed. 16)" : "3. Cuaderno Comunitario PDF (Ed. 16)",
        sublabel: isEn ? "45 mm margin · CC0" : "Margen 45 mm · CC0",
        badge: "Ed. 16",
        primary: false,
      },
    ],
    secondaryAction: {
      id: "btnStagePdfMoreFormats",
      action: "open-share",
      label: isEn ? "Offline font pack & USB copy" : "Fuentes sin internet y copia USB",
    },
  };
}

/**
 * Renderiza el HTML accesible de la cinta de descarga por etapas (`Cowan <= 4`, cero atributos en linea).
 */
export function renderPrintStageRibbonHtml(opts = {}) {
  const spec = resolvePrintStageDescriptorsForTier(opts);
  const isEn = String(opts?.uiLocale || "en").trim().toLowerCase().startsWith("en");
  const buttonsHtml = spec.stages
    .map((s) => {
      const cls = s.primary ? "print-stage-btn is-primary-stage" : "print-stage-btn";
      return `<div class="print-stage-card" data-ergos-homogeneous-card="print-stage"><button type="button" id="${escHtml(s.id)}" class="${cls}" data-print-stage-action="${escHtml(s.action)}"><span class="print-stage-title">${escHtml(s.label)}</span><span class="print-stage-meta">${escHtml(s.sublabel)} · ${escHtml(s.badge)}</span></button></div>`;
    })
    .join("");
  return `<div class="print-stage-header" data-ribbon-compact="true" data-compact-mobile="true" data-cowan-budget="3"><span class="print-stage-kicker">${escHtml(spec.heading)}</span><div class="ek-flex-wrap-inline"><button type="button" id="${escHtml(spec.secondaryAction.id)}" class="uls-chip print-stage-more" data-print-stage-action="${escHtml(spec.secondaryAction.action)}">${escHtml(spec.secondaryAction.label)}</button><button type="button" id="btnStageRibbonShareOffline" class="uls-chip print-stage-more" data-print-stage-action="open-share">${isEn ? "Carry offline" : "Llevar sin internet"}</button></div></div><div class="print-stage-actions-row" role="group" aria-label="${escHtml(spec.heading)}">${buttonsHtml}</div>`;
}

/**
 * Conecta delegación pura de `[data-print-stage-action]` sobre `#printFirstStageRibbon` (`SLICE-R13-05`).
 */
export function bindPrintFirstStageRibbon({
  targetDoc,
  getEl,
  state,
  handleDose1Trigger,
  transitionSheet,
  hydratePrintDrawerPanels,
} = {}) {
  const host = typeof getEl === "function" ? getEl("printFirstStageRibbon", targetDoc) : null;
  if (!host || typeof host.addEventListener !== "function" || host._printStageBound) return false;
  host._printStageBound = true;
  host.addEventListener("click", async (ev) => {
    const btn = ev?.target?.closest
      ? ev.target.closest("[data-print-stage-action]")
      : ev?.target?.getAttribute?.("data-print-stage-action")
        ? ev.target
        : null;
    const action = String(btn?.getAttribute?.("data-print-stage-action") || "").trim();
    if (!action) return;
    if (action === "dose1") {
      if (state && typeof state === "object") state.activeDose = 1;
      await handleDose1Trigger?.();
      return;
    }
    if (action === "open-share") {
      transitionSheet?.("share", targetDoc, { fromUser: true });
      return;
    }
    if (state && typeof state === "object") {
      state.activeDose = action === "dose2" ? 2 : action === "dose3" || action === "stage-nt" ? 3 : (state.activeDose || 1);
    }
    transitionSheet?.("print", targetDoc, { fromUser: true, dose: state?.activeDose });
    if (action === "dose2") {
      const link2 = getEl("linkDose2BlockPdf", targetDoc);
      link2?.click?.();
      return;
    }
    if (action === "dose3" || action === "stage-nt" || action === "stage-gospels") {
      if (state && typeof state === "object") {
        state.selectedNaturalStagePreset =
          action === "stage-nt" ? "nt27" : action === "stage-gospels" ? "evangelios4" : "biblia66";
        state.userRequestedPdfBuild = true;
        state.generateFull66BookBible = action === "dose3";
        state.lastHydratedWorkerTandaKey = "";
      }
      await hydratePrintDrawerPanels?.(targetDoc);
    }
  });
  return true;
}
