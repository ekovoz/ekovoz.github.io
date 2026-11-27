// Ekovoz Mostrador — Pure Imposition, Duplex Flip & Folded Page-Order SVG Renderer (SLICE-EKO-HIG10-05)

export function resolveDuplexFlipEdge(
  orientation = "portrait",
  foliationMode = "saddle_stitch",
  uiLocale = "es",
) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const isLandscape = String(orientation || "portrait").trim().toLowerCase() === "landscape";
  const isSaddle = String(foliationMode || "saddle_stitch").trim().toLowerCase() === "saddle_stitch";
  const isShortEdge = isLandscape || isSaddle;
  const edge = isShortEdge ? "short" : "long";
  const labelEs = isShortEdge ? "borde corto" : "borde largo";
  const labelEn = isShortEdge ? "short edge" : "long edge";
  const toggleLabelEs = `Impresión a doble cara (voltear por el ${labelEs})`;
  const toggleLabelEn = `Double-sided printing (flip on ${labelEn})`;
  const step2Es = `Paso 1: Imprime caras impares (anverso). Paso 2: Voltea el pliego por el ${labelEs} e imprime caras pares (reverso)`;
  const step2En = `Step 1: Print odd pages (front). Step 2: Flip sheet along the ${labelEn} and print even pages (back)`;
  return {
    edge,
    flipEdge: edge,
    isShortEdge,
    flipAxis: isShortEdge ? "horizontal" : "vertical",
    cssClass: isShortEdge ? "duplex-short-edge" : "duplex-long-edge",
    labelEs,
    labelEn,
    toggleLabel: isEn ? toggleLabelEn : toggleLabelEs,
    step2Text: isEn ? step2En : step2Es,
  };
}

export function auditFoldedPageOrder({
  totalPages = 4,
  impositionMode = "booklet_4n",
  dir = "ltr",
  creepMm = 0.35,
  inglisMarginMm = 4,
} = {}) {
  const safeDir = String(dir || "ltr").trim().toLowerCase() === "rtl" ? "rtl" : "ltr";
  const count = Math.max(1, Number.isFinite(Number(totalPages)) ? Math.floor(Number(totalPages)) : 4);
  const paddedPages = Math.max(4, Math.ceil(count / 4) * 4);
  const sheetsCount = paddedPages / 4;
  const isSinglePage = impositionMode === "linear" || impositionMode === "single" || impositionMode === "single_sheet_20mm";

  const sheets = [];
  if (isSinglePage) {
    for (let p = 1; p <= count; p += 2) {
      const next = p + 1 <= count ? p + 1 : null;
      sheets.push({
        sheetIndex: Math.floor((p - 1) / 2) + 1,
        sideA: [p, null],
        sideB: [next, null],
        creepShiftMm: 0,
      });
    }
  } else {
    for (let s = 0; s < sheetsCount; s += 1) {
      const frontRight = s * 2 + 1;
      const frontLeft = paddedPages - s * 2;
      const backLeft = frontRight + 1;
      const backRight = frontLeft - 1;
      const normalizeSlot = (p) => (p <= count ? p : null);
      const rawSideA = [normalizeSlot(frontLeft), normalizeSlot(frontRight)];
      const rawSideB = [normalizeSlot(backLeft), normalizeSlot(backRight)];
      sheets.push({
        sheetIndex: s + 1,
        sideA: safeDir === "rtl" ? [rawSideA[1], rawSideA[0]] : rawSideA,
        sideB: safeDir === "rtl" ? [rawSideB[1], rawSideB[0]] : rawSideB,
        creepShiftMm: Number((s * creepMm).toFixed(2)),
      });
    }
  }

  return {
    dir: safeDir,
    impositionMode,
    totalPages: count,
    paddedPages,
    sheetsCount: sheets.length,
    creepMm,
    inglisMarginMm,
    sheets,
  };
}

function formatSlotLabel(pageNumber, isEn) {
  if (pageNumber == null) {
    return isEn ? "[blank]" : "[en blanco]";
  }
  return `p. ${pageNumber}`;
}

export function renderImpositionDuplexSvgDiagram({
  uiLocale = "es",
  dir = "ltr",
  impositionMode = "booklet_4n",
  foliationMode = "saddle_stitch",
  orientation = "landscape",
  paperFormat = "a4",
  duplex = true,
  totalPages = 4,
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const safeDir = String(dir || "ltr").trim().toLowerCase() === "rtl" ? "rtl" : "ltr";
  const flipInfo = resolveDuplexFlipEdge(orientation, foliationMode, uiLocale);
  const audit = auditFoldedPageOrder({
    totalPages,
    impositionMode: foliationMode === "single_sheet_20mm" ? "single_sheet_20mm" : impositionMode,
    dir: safeDir,
  });
  const firstSheet = audit.sheets[0] || { sideA: [4, 1], sideB: [2, 3], creepShiftMm: 0 };

  const normPaper = String(paperFormat || "a4").toLowerCase();
  const formatPaper = normPaper.includes("letter")
    ? (isEn ? "Letter" : "Carta")
    : (normPaper.includes("a3") ? "A3" : (normPaper.includes("folio") ? "Folio" : "A4"));
  const orientWord = isEn
    ? (String(orientation).toLowerCase() === "landscape" ? "Horizontal" : "Portrait")
    : (String(orientation).toLowerCase() === "landscape" ? "Horizontal" : "Vertical");
  const duplexWord = duplex
    ? (isEn ? "Double-sided" : "Doble cara")
    : (isEn ? "Single-sided" : "Una cara");
  const orientationLine = isEn
    ? `100% actual size · ${orientWord} (${formatPaper}) · ${duplexWord}`
    : `100% tamaño real · ${orientWord} (${formatPaper}) · ${duplexWord}`;

  const sideALabel = isEn ? "Side A (Front)" : "Cara A (Frente)";
  const sideBLabel = isEn ? "Side B (Back)" : "Cara B (Reverso)";
  const flipCaption = !duplex
    ? (isEn ? "Single side only" : "Solo 1 cara")
    : (flipInfo.isShortEdge
      ? (isEn ? "Flip short edge" : "Volteo por borde corto")
      : (isEn ? "Flip long edge" : "Volteo por borde largo"));
  const foldCaption = isEn
    ? `Fold center · Inglis ${audit.inglisMarginMm} mm · Creep ${audit.creepMm} mm`
    : `Doblar al centro · Inglis ${audit.inglisMarginMm} mm · Creep ${audit.creepMm} mm`;
  const dirLabel = safeDir === "rtl"
    ? (isEn ? "RTL mirror binding" : "Lectura RTL (der. a izq.)")
    : (isEn ? "LTR binding" : "Lectura LTR (izq. a der.)");

  const aLeft = formatSlotLabel(firstSheet.sideA[0], isEn);
  const aRight = formatSlotLabel(firstSheet.sideA[1], isEn);
  const bLeft = formatSlotLabel(firstSheet.sideB[0], isEn);
  const bRight = formatSlotLabel(firstSheet.sideB[1], isEn);

  const svgAria = isEn
    ? `Two-panel duplex folding diagram: ${sideALabel} [${aLeft}, ${aRight}], ${flipCaption}, ${sideBLabel} [${bLeft}, ${bRight}].`
    : `Diagrama visual de doble cara y doblado: ${sideALabel} [${aLeft}, ${aRight}], ${flipCaption}, ${sideBLabel} [${bLeft}, ${bRight}].`;

  return `
<div class="imposition-svg-wrap" data-dir="${safeDir}" data-flip="${flipInfo.edge}" data-imposition="${impositionMode}">
  <p class="imposition-spec-line"><strong>${orientationLine}</strong></p>
  <svg viewBox="0 0 640 205" width="100%" height="auto" role="img" aria-label="${svgAria.replace(/"/g, "&quot;")}" class="imposition-duplex-svg">
    <rect x="12" y="24" width="248" height="146" rx="6" fill="#fffdf9" stroke="#1c1917" stroke-width="1.5"/>
    <line x1="136" y1="24" x2="136" y2="170" stroke="#78716c" stroke-width="1.2" stroke-dasharray="4 4"/>
    <path d="M18 36 L18 30 L24 30 M254 36 L254 30 L248 30 M18 158 L18 164 L24 164 M254 158 L254 164 L248 164" fill="none" stroke="#b45309" stroke-width="1.2"/>
    <text x="136" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#1c1917">${sideALabel}</text>
    <text x="74" y="96" text-anchor="middle" font-size="14" font-weight="700" fill="#1c1917">${aLeft}</text>
    <text x="198" y="96" text-anchor="middle" font-size="14" font-weight="700" fill="#1c1917">${aRight}</text>
    <text x="74" y="118" text-anchor="middle" font-size="10" fill="#57534e">${safeDir === "rtl" ? (isEn ? "Front" : "Portada") : (isEn ? "Back" : "Contraportada")}</text>
    <text x="198" y="118" text-anchor="middle" font-size="10" fill="#57534e">${safeDir === "rtl" ? (isEn ? "Back" : "Contraportada") : (isEn ? "Front" : "Portada")}</text>

    <path d="M276 92 C298 66, 342 66, 364 92" fill="none" stroke="#1c1917" stroke-width="1.8"/>
    <polygon points="366,95 356,92 362,84" fill="#1c1917"/>
    <text x="320" y="114" text-anchor="middle" font-size="10.5" font-weight="600" fill="#1c1917">${flipCaption}</text>

    <rect x="380" y="24" width="248" height="146" rx="6" fill="#fffdf9" stroke="#1c1917" stroke-width="1.5"/>
    <line x1="504" y1="24" x2="504" y2="170" stroke="#78716c" stroke-width="1.2" stroke-dasharray="4 4"/>
    <rect x="502" y="28" width="4" height="138" fill="#fef3c7" stroke="#d97706" stroke-width="0.6"/>
    <text x="504" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#1c1917">${sideBLabel}</text>
    <text x="442" y="96" text-anchor="middle" font-size="14" font-weight="700" fill="#1c1917">${bLeft}</text>
    <text x="566" y="96" text-anchor="middle" font-size="14" font-weight="700" fill="#1c1917">${bRight}</text>
    <text x="442" y="118" text-anchor="middle" font-size="10" fill="#57534e">${isEn ? "Inside" : "Interior"}</text>
    <text x="566" y="118" text-anchor="middle" font-size="10" fill="#57534e">${isEn ? "Inside" : "Interior"}</text>

    <text x="320" y="192" text-anchor="middle" font-size="10.5" fill="#44403c">${foldCaption} · ${dirLabel}</text>
  </svg>
</div>`.trim();
}

export function bindImpositionAndLayoutButtons({
  state,
  targetDoc,
  getEl,
  computeSaddleStitchImpositionPlan,
  computeKindlePrintBudget,
  renderImpositionAndLayoutPreviewHtml,
} = {}) {
  const escapeSimple = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const renderReactivePreview = (mode = "imposition") => {
    const resolvedMode = mode === "layout" ? "layout" : "imposition";
    if (state) state.activePrintPreviewMode = resolvedMode;
    const host = typeof getEl === "function"
      ? getEl("impositionBookletPreviewHost", targetDoc)
      : targetDoc?.getElementById?.("impositionBookletPreviewHost");
    if (!host) return;
    const curOrientation = String(state?.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
    const curPaper = state?.paperFormat || "a4";
    const curCols = state?.columns || 2;
    const curFontPt = state?.fontSizePt || 9.5;
    const curFoliation = state?.foliationMode || "saddle_stitch";
    const curDuplex = state?.duplex !== false;
    const curDir = ["ar", "fa", "he", "ur", "ug", "ps", "sd"].includes(String(state?.lang || "").toLowerCase())
      ? "rtl"
      : "ltr";
    const imp = typeof computeSaddleStitchImpositionPlan === "function"
      ? computeSaddleStitchImpositionPlan({ totalPages: 16, paperThicknessMm: 0.09, rtl: curDir === "rtl" })
      : { sheetCount: 4, folioSumConstant: 17 };
    const budgetCalc = typeof computeKindlePrintBudget === "function"
      ? computeKindlePrintBudget({
        fontPt: curFontPt,
        columns: curCols,
        orientation: curOrientation,
        paper: curPaper,
        uiLocale: state?.uiLocale || "es",
      })
      : { summaryText: `${curFontPt}pt · ${curCols} col · ${curPaper}` };
    const curIsEn = String(state?.uiLocale || "es").trim().toLowerCase().startsWith("en");
    const svgDiagram = renderImpositionDuplexSvgDiagram({
      uiLocale: state?.uiLocale || "es",
      dir: curDir,
      impositionMode: curFoliation === "single_sheet_20mm" ? "single_sheet_20mm" : "booklet_4n",
      foliationMode: curFoliation,
      orientation: curOrientation,
      paperFormat: curPaper,
      duplex: curDuplex,
      totalPages: 4,
    });
    const summaryBanner = curIsEn
      ? `<div class="ek-meta ek-mt-xs" data-reactive-imposition="true"><strong>${imp.sheetCount} folded sheets · Constant folio ${imp.folioSumConstant}</strong> · ${escapeSimple(budgetCalc.summaryText)}</div>`
      : `<div class="ek-meta ek-mt-xs" data-reactive-imposition="true"><strong>${imp.sheetCount} pliegos doblados · Folio constante ${imp.folioSumConstant}</strong> · ${escapeSimple(budgetCalc.summaryText)}</div>`;
    const legacyPreview = typeof renderImpositionAndLayoutPreviewHtml === "function"
      ? renderImpositionAndLayoutPreviewHtml({
        mode: resolvedMode,
        paper: curPaper,
        pageCount: 16,
        columns: curCols,
        fontPt: curFontPt,
        orientation: curOrientation,
        dir: curDir,
        uiLocale: state?.uiLocale || "es",
      })
      : "";
    host.setAttribute?.("data-reactive-layout", "true");
    host.innerHTML = `${svgDiagram}${summaryBanner}${legacyPreview}`;
  };

  if (typeof getEl === "function") {
    for (const ctrlId of [
      "kindleFontSizeSlider",
      "kindleColumnSelector",
      "kindlePaperFormatSelector",
      "kindleOrientationSelector",
      "bibleFoliationModeSelect",
      "kindleDuplexToggle",
    ]) {
      const ctrl = getEl(ctrlId, targetDoc);
      if (ctrl && typeof ctrl.addEventListener === "function" && !ctrl._reactiveLayoutBound) {
        ctrl._reactiveLayoutBound = true;
        ctrl.addEventListener("change", () => renderReactivePreview("layout"));
        if (ctrlId === "kindleFontSizeSlider") {
          ctrl.addEventListener("input", () => renderReactivePreview("layout"));
        }
      }
    }
  }
  renderReactivePreview(state?.activePrintPreviewMode || "imposition");
}
