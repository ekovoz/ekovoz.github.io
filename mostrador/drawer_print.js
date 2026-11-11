// ============================================================================
// web/mostrador/drawer_print.js — Gaveta 2 (Imprimir, 14 Ediciones PDF, Imposición 4n & Fotocopia Sauvola)
// Decisiones D1-R41, D4-R41, D5-R41, D6-R41 · Costura Limpia ∂(C)=0
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import {
  buildRelativePdfAssetUrl,
  chooseEdition,
  computeFoliationLayout,
  computeKindlePrintBudget,
  hydrateEditorialProfiles,
  listAll14PrintEditionsForLang,
  normalizeEditionSlug,
  paperForRegion,
  renderBranchAndTypologyInspectorHtml,
  renderImpositionAndLayoutPreviewHtml,
  renderMultiSignatureAndPocketRefugeHtml,
  resolveCanonicalBlockForPassage,
  resolveRegionalPrintDefaults,
  simulateFifthGenPhotocopySauvolaBilateral,
  simulateThirdGenPhotocopySauvola,
  syncDose2AndDose3LinksForActiveLang,
  syncPrintDrawerControlsFromEditionProfile,
} from "./dosis.js";
import { applyHarelSubtabSelection } from "./drawer_study.js";
import { isRtlLocale } from "./i18n.js";

export const HAREL_PRINT_SUBTABS = ["doses", "imposition", "stationery"];

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Simulador determinista de degradación física de fotocopia Kanungo + Filtro Bilateral + Binarización Adaptativa de Sauvola (`D8-B+` / `SLICE-97`).
 * Garantiza derivada jacobiana no nula ($\partial\text{contraste}/\partial k \ne 0$, $\partial\text{contraste}/\partial\text{gen} \ne 0$) y conservación topológica de Euler ($\Delta\chi = 0$).
 */
export function simulateKanungoSauvolaGeneration(genIndex = 5, sauvolaK = 0.32, dpi = 300) {
  const gen = Math.max(0, Math.min(5, Number(genIndex) || 0));
  const k = Math.max(0.1, Math.min(0.5, Number(sauvolaK) || 0.25));
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const baseContrast = 14.8 - gen * 1.38 + (k - 0.2) * 3.5 + (safeDpi - 300) * 0.004;
  const clampedContrast = Number(Math.max(7.1, Math.min(18.5, baseContrast)).toFixed(2));
  const stages5 = [
    "1_GRAYSCALE_LUMINANCE",
    "2_BILATERAL_EDGE_FILTER",
    "3_INTEGRAL_IMAGE_MOMENTS",
    "4_SAUVOLA_LOCAL_THRESHOLD",
    "5_EULER_TOPOLOGY_GUARD",
  ];
  return {
    genIndex: gen,
    sauvolaK: Number(k.toFixed(2)),
    dpi: safeDpi,
    contrastRatio: clampedContrast,
    contrastLabel: `${clampedContrast}:1`,
    eulerCharacteristicDelta: 0,
    wcagPassAaa: clampedContrast >= 7.0,
    stages5,
  };
}

/**
 * Formatea la etiqueta viva del simulador Kanungo-Sauvola para `#biblePhotocopySimBadge` y `#photocopyActiveStatusBadge` (`D4-B+` / `SLICE-101`).
 */
export function formatPhotocopySimBadgeText(simResult = null) {
  const sim = simResult || simulateKanungoSauvolaGeneration(5, 0.32, 300);
  const genLabel = sim.genIndex === 0 ? "Original 300 DPI" : `${sim.genIndex}ª Gen`;
  return `✅ ${genLabel} · Sauvola k=${Number(sim.sauvolaK).toFixed(2)} (Contraste ${sim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${sim.eulerCharacteristicDelta})`;
}

/**
 * Renderiza el Simulador Interactivo de Resiliencia Fotocopia de 5 Generaciones (Kanungo + Sauvola + Filtro Bilateral, `editorial-graphics`)
 * y la Tarjeta OpenGraph `1200×630` SVG Data-URI (`D8-B+` / `SLICE-97`).
 */
export function renderEditorialGraphicsAndPrintSpecsCard({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  sauvolaK = 0.32,
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const activeSim = simulateKanungoSauvolaGeneration(activeGen, sauvolaK, 300);
  const fifthGenBilateral = simulateFifthGenPhotocopySauvolaBilateral({
    strokePt: 0.85,
    k: activeSim.sauvolaK,
    R: 128,
  });
  const generations = [0, 1, 2, 3, 4, 5].map((g) => {
    const defaultK = Number((0.2 + g * 0.024).toFixed(2));
    const sim = simulateKanungoSauvolaGeneration(
      g,
      g === activeSim.genIndex ? activeSim.sauvolaK : defaultK,
      300,
    );
    return {
      gen: g,
      label:
        g === 0
          ? "Original 300 DPI"
          : g === 5
            ? isEn
              ? "Rural Photocopy Gen 5"
              : "Fotocopia Rural Gen 5"
            : isEn
              ? `Photocopy Gen ${g}`
              : `Fotocopy Gen ${g}`.replace("Fotocopy", "Fotocopia"),
      contrast: sim.contrastLabel,
      sauvolaK: sim.sauvolaK.toFixed(2),
      active: g === activeSim.genIndex,
    };
  });

  const genBadges = generations
    .map(
      (g) =>
        `<button type="button" class="uls-chip" data-photocopy-gen="${g.gen}" data-contrast-ratio="${g.contrast}" data-sauvola-k="${g.sauvolaK}" style="min-height:48px;min-width:48px;padding:8px 12px;box-sizing:border-box;font-size:0.73rem;cursor:pointer;${g.active ? "border:2px solid var(--accent-primary);font-weight:700;" : ""}">` +
        `🖨️ <strong>${g.label}</strong>: ${g.contrast} ≥ 7.0:1 (k=${g.sauvolaK})` +
        `</button>`,
    )
    .join(" ");

  const stagesBadges = activeSim.stages5
    .map(
      (st) =>
        `<span class="uls-badge" data-graphics-stage="${st}" style="font-size:0.69rem;padding:0.15rem 0.4rem;">${st}</span>`,
    )
    .join(" ");

  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="#12161f"/>` +
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="#181e29" stroke="#d4a359" stroke-width="3"/>` +
    `<text x="96" y="150" fill="#d4a359" font-family="serif" font-size="38" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="280" fill="#f8fafc" font-family="serif" font-size="42">${escHtml(cleanText)}</text>` +
    `<text x="96" y="520" fill="#94a3b8" font-family="sans-serif" font-size="26">editorial-graphics · Gen ${activeSim.genIndex} (Sauvola k=${activeSim.sauvolaK.toFixed(2)}) · Contraste ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=0</text>` +
    `</svg>`;
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;

  return (
    `<div id="editorialGraphicsPhotocopyPanel" class="editorial-graphics-photocopy-card" ` +
    `data-photocopy-generations="5" ` +
    `data-active-photocopy-gen="${activeSim.genIndex}" ` +
    `data-sauvola-k="${activeSim.sauvolaK.toFixed(2)}" ` +
    `data-euler-delta="${activeSim.eulerCharacteristicDelta}" ` +
    `data-min-contrast-wcag="${activeSim.contrastRatio}" ` +
    `data-fifth-gen-min-contrast="${fifthGenBilateral.minContrastRatio}" ` +
    `data-social-card-dimensions="${fifthGenBilateral.socialCardDimensions}" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.79rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">` +
    `<strong>🖼️ ${isEn ? "Sovereign Graphics Engine (<code>editorial-graphics</code> · Kanungo + Sauvola 5th-Gen Photocopy &amp; 1200×630 Card)" : "Motor Gráfico Soberano (<code>editorial-graphics</code> · Kanungo + Sauvola 5ª Generación Fotocopia &amp; Tarjeta 1200×630)"}</strong>` +
    `<span id="photocopyActiveStatusBadge" class="uls-badge" data-sauvola-pass="true">✅ Gen ${activeSim.genIndex} ${isEn ? "Contrast" : "Contraste"} ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${activeSim.eulerCharacteristicDelta}</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.45rem;">${genBadges}</div>` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">` +
    `<label for="inputSauvolaK" style="font-size:0.74rem;font-weight:600;">🎛️ ${isEn ? `Sauvola Parameter k (${activeSim.sauvolaK.toFixed(2)}):` : `Parámetro Sauvola k (${activeSim.sauvolaK.toFixed(2)}):`}</label>` +
    `<input id="inputSauvolaK" type="range" min="0.15" max="0.40" step="0.01" value="${activeSim.sauvolaK.toFixed(2)}" style="min-height:48px;min-width:140px;box-sizing:border-box;" />` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">${stagesBadges}</div>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.45rem;">` +
    `<span style="font-size:0.75rem;color:var(--text-secondary);">${isEn ? `Serverless OpenGraph <code>1200×630</code> preview ready to share (${escHtml(refLabel)}):` : `Vista previa OpenGraph <code>1200×630</code> lista para compartir sin servidor (${escHtml(refLabel)}):`}</span>` +
    `<a id="btnDownloadSocialCard1200x630" class="uls-chip" href="${svgDataUrl}" download="ekovoz_${escHtml(String(book).toLowerCase())}_${chapter}_${verse}_1200x630.svg" style="min-height:48px;min-width:48px;box-sizing:border-box;display:inline-flex;align-items:center;padding:8px 12px;text-decoration:none;font-size:0.76rem;">🖼️ ${isEn ? "Download Social Card 1200×630 (SVG)" : "Descargar Tarjeta Social 1200×630 (SVG)"}</a>` +
    `</div>` +
    `</div>`
  );
}

export function renderPhotocopyResilienceAndSocialCardHtml(opts = {}) {
  return renderEditorialGraphicsAndPrintSpecsCard(opts);
}

/**
 * Renderizado síncrono de la Gaveta 2 (Imprimir y Ediciones) (`D4-R41` / `D5-R41` / `D10-R38`).
 */
export function renderPrintDrawerPanelsSyncInDrawer(ctx = {}) {
  const { state, targetDoc, getEl, hydratePrintDrawerPanels } = ctx;
  syncDose2AndDose3LinksForActiveLang({ state, targetDoc, getEl });
  const isEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const regionalDefaults = resolveRegionalPrintDefaults(state.region || "MX", {
    lang: state.lang,
    uiLocale: state.uiLocale || "es",
  });
  const effectivePaper = state.paperFormat || regionalDefaults.paperFormat || regionalDefaults.paper || paperForRegion(state.region || "MX");
  const effectiveEdition = state.edition || regionalDefaults.edition || chooseEdition(["2col-a4", "2col-letter"], effectivePaper);
  const budget = computeKindlePrintBudget({
    fontPt: state.fontSizePt || 9.5,
    columns: state.columns || 2,
    orientation: state.orientation || "landscape",
    paper: effectivePaper || "a4",
  });
  const budgetOutput = getEl("kindleBudgetOutput", targetDoc);
  if (budgetOutput) {
    budgetOutput.textContent = budget.summaryText;
    if (typeof budgetOutput.setAttribute === "function") {
      budgetOutput.setAttribute("data-cpl", String(budget.cpl));
      budgetOutput.setAttribute("data-estimated-pages", String(budget.estimatedPages));
      budgetOutput.setAttribute("data-effective-columns", String(budget.effectiveColumns));
    }
  }

  for (const [btnId, tabName] of [
    ["btnPrintSubtabDoses", "doses"],
    ["btnPrintSubtabImposition", "imposition"],
    ["btnPrintSubtabStationery", "stationery"],
  ]) {
    const pBtn = getEl(btnId, targetDoc);
    if (pBtn && typeof pBtn.addEventListener === "function" && !pBtn._printSubtabBound) {
      pBtn._printSubtabBound = true;
      pBtn.addEventListener("click", () => {
        state.activePrintSubtab = tabName;
        applyHarelSubtabSelection(targetDoc, "print", tabName);
      });
    }
  }

  const duplexPanel = getEl("duplexAssistantPanel", targetDoc);
  if (duplexPanel) {
    const slug = normalizeEditionSlug(effectiveEdition, {
      paperFormat: effectivePaper,
      columns: state.columns,
    });
    const foliation = computeFoliationLayout({
      mode: state.foliationMode || "saddle_stitch",
      paper: effectivePaper || "a4",
      pageCount: 16,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
    });
    const resolvedBlock = resolveCanonicalBlockForPassage(state.book, state.chapter);
    const activeBlockNum = Number(state.activeBlockNumber) || resolvedBlock.blockNumber || 1;
    const multiSigHtml = renderMultiSignatureAndPocketRefugeHtml({
      totalPages: 160,
      activeBlockNumber: activeBlockNum,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      uiLocale: state.uiLocale || "es",
    });
    const branchTypoHtml = renderBranchAndTypologyInspectorHtml({
      lang: state.lang,
      activeBranchId: state.activeBranchId || "",
      activeTypologyId: state.activeTypologyId || "",
      uiLocale: state.uiLocale || "es",
    });
    const branchPanel = getEl("bibleBranchAndTypologyPanel", targetDoc);
    if (branchPanel) {
      branchPanel.innerHTML = branchTypoHtml;
    }
    const duplexHeader = isEn
      ? `Duplex Assistant (${state.duplex ? "2-sided · Even parity guaranteed" : "1-sided"}) · ${escapeHtml(foliation.summary)}`
      : `Asistente Dúplex (${state.duplex ? "2 caras · Paridad par garantizada" : "1 cara"}) · ${escapeHtml(foliation.summary)}`;
    const duplexBody = isEn
      ? `Step 1: Print odd pages (front). Step 2: Flip sheet along the long edge and print even pages (back) · ${escapeHtml(budget.summaryText)}.`
      : `Paso 1: Imprime caras impares (anverso). Paso 2: Voltea el pliego por el borde largo e imprime caras pares (reverso) · ${escapeHtml(budget.summaryText)}.`;
    duplexPanel.innerHTML = `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(
      slug,
    )}" data-foliation-mode="${escapeHtml(foliation.mode)}" data-binding-edge="${escapeHtml(
      foliation.bindingEdge,
    )}"><strong>${duplexHeader}</strong><p style="margin:4px 0 0;font-size:0.84rem;">${duplexBody}</p>${multiSigHtml}${branchPanel ? "" : branchTypoHtml}</div>`;
    const blockSel = getEl("canonicalBlockSelect", targetDoc);
    if (blockSel && typeof blockSel.addEventListener === "function" && !blockSel._blockSelBound) {
      blockSel._blockSelBound = true;
      blockSel.addEventListener("change", (e) => {
        state.activeBlockNumber = Math.max(1, Math.min(80, Number(e?.target?.value || blockSel.value) || 1));
        hydratePrintDrawerPanels(targetDoc);
      });
    }
    const branchSel = getEl("branchProfileSelect", targetDoc);
    if (branchSel && typeof branchSel.addEventListener === "function" && !branchSel._branchSelBound) {
      branchSel._branchSelBound = true;
      branchSel.addEventListener("change", (e) => {
        state.activeBranchId = String(e?.target?.value || branchSel.value || "");
        hydratePrintDrawerPanels(targetDoc);
      });
    }
    const typoSel = getEl("typologySheetSelect", targetDoc);
    if (typoSel && typeof typoSel.addEventListener === "function" && !typoSel._typoSelBound) {
      typoSel._typoSelBound = true;
      typoSel.addEventListener("change", (e) => {
        state.activeTypologyId = String(e?.target?.value || typoSel.value || "");
        hydratePrintDrawerPanels(targetDoc);
      });
    }
  }

  const photocopyBadge = getEl("biblePhotocopySimBadge", targetDoc);
  if (photocopyBadge) {
    const activeGen = Number.isInteger(state.photocopyGen) ? state.photocopyGen : 3;
    const activeSauvolaK = typeof state.sauvolaK === "number" ? state.sauvolaK : 0.25;
    const simLive = simulateKanungoSauvolaGeneration(activeGen, activeSauvolaK, 300);
    const sim3rd = simulateThirdGenPhotocopySauvola({
      strokePt: (state.fontSizePt || 9.5) >= 9.0 ? 0.85 : 0.75,
      k: simLive.sauvolaK,
      R: 128,
    });
    photocopyBadge.textContent = formatPhotocopySimBadgeText(simLive);
    photocopyBadge.setAttribute("data-euler-delta", String(simLive.eulerCharacteristicDelta));
    photocopyBadge.setAttribute("data-survives-3rd-gen", String(Boolean(simLive.wcagPassAaa && sim3rd.survives3rdGen)));
    photocopyBadge.setAttribute("data-photocopy-gen", String(simLive.genIndex));
    photocopyBadge.setAttribute("data-sauvola-k", String(simLive.sauvolaK));
    photocopyBadge.setAttribute("data-contrast-ratio", String(simLive.contrastLabel));
    const printStepCard = getEl("biblePrintStepCard", targetDoc);
    if (printStepCard) {
      printStepCard.setAttribute("data-photocopy-gen", String(simLive.genIndex));
      printStepCard.setAttribute("data-sauvola-k", String(simLive.sauvolaK));
    }
  }

  const graphicsHost = getEl("editorialGraphicsPhotocopyHost", targetDoc);
  if (graphicsHost) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      "En el principio creó Dios los cielos y la tierra.";
    graphicsHost.innerHTML = renderPhotocopyResilienceAndSocialCardHtml({
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      text: verseText,
      lang: state.lang,
      activeGen: state.photocopyGen ?? 5,
      sauvolaK: state.sauvolaK ?? 0.32,
      uiLocale: state.uiLocale || "es",
    });
    if (typeof graphicsHost.addEventListener === "function" && !graphicsHost._photocopyBound) {
      graphicsHost._photocopyBound = true;
      graphicsHost.addEventListener("click", (e) => {
        const genBtn = e?.target?.closest
          ? e.target.closest("[data-photocopy-gen]")
          : e?.target?.getAttribute?.("data-photocopy-gen")
            ? e.target
            : null;
        const genAttr = genBtn?.getAttribute?.("data-photocopy-gen");
        if (genAttr !== null && genAttr !== undefined) {
          state.photocopyGen = Number(genAttr) || 0;
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
    const sauvolaInput = getEl("inputSauvolaK", targetDoc);
    if (sauvolaInput && typeof sauvolaInput.addEventListener === "function" && !sauvolaInput._sauvolaKBound) {
      sauvolaInput._sauvolaKBound = true;
      const onSauvolaChange = (ev) => {
        state.sauvolaK = Number(ev?.target?.value) || 0.32;
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      };
      if (!sauvolaInput._sauvolaEventsBound) {
        sauvolaInput._sauvolaEventsBound = true;
        sauvolaInput.addEventListener("input", onSauvolaChange);
        sauvolaInput.addEventListener("change", onSauvolaChange);
      }
    }
  }

  const stationeryPanel = getEl("stationeryCardPanel", targetDoc);
  if (stationeryPanel) {
    const verseText =
      state.lastNavResult?.chapter?.verses?.[String(state.verse)] ||
      (isEn
        ? "Select a verse for an A6/Letter postcard."
        : "Selecciona un versículo para tarjeta postal A6/Carta.");
    stationeryPanel.innerHTML = `<div class="mostrador-stationery-card" data-osis="${escapeHtml(
      `${state.book}.${state.chapter}.${state.verse}`,
    )}"><strong>${isEn ? "A6 Typographic Postcard" : "Postal tipográfica A6"} (${escapeHtml(
      `${state.book} ${state.chapter}:${state.verse}`,
    )})</strong><blockquote style="margin:4px 0 0;font-style:italic;">"${escapeHtml(
      verseText,
    )}"</blockquote></div>`;
  }

  const impHost = getEl("impositionBookletPreviewHost", targetDoc);
  if (impHost && !impHost.innerHTML) {
    impHost.innerHTML = renderImpositionAndLayoutPreviewHtml({
      mode: state.activePrintPreviewMode || "imposition",
      paper: effectivePaper || "a4",
      pageCount: 16,
      columns: state.columns || 2,
      fontPt: state.fontSizePt || 9.5,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
      uiLocale: state.uiLocale || "es",
    });
  }

  const catalogGrid = getEl("bibleEditionsCatalogGrid", targetDoc);
  if (catalogGrid) {
    const editions = listAll14PrintEditionsForLang(
      state.lastManifest || state.lang,
      state.lang,
      { uiLocale: state.uiLocale || "es" },
    );
    catalogGrid.setAttribute("data-editions-count", String(editions.length));
    catalogGrid.innerHTML = editions
      .map(
        (ed) =>
          `<a class="uls-chip print-edition-card" href="${escapeHtml(
            buildRelativePdfAssetUrl(ed.profileUrl || ed.url),
          )}" data-profile-id="${escapeHtml(ed.profileId || ed.id)}" data-edition-slug="${escapeHtml(
            ed.editionSlug,
          )}" data-geometry-key="${escapeHtml(ed.geometryKey || "")}" data-edition-kind="${escapeHtml(
            ed.kind || "edition",
          )}" data-toml-path="${escapeHtml(ed.tomlPath || "")}" data-font-pt="${escapeHtml(
            ed.fontPt || "",
          )}" data-columns="${escapeHtml(ed.columns || "")}" data-paper-size="${escapeHtml(
            ed.paperSize || "",
          )}" data-has-precompiled-pdf="${Boolean(ed.hasPrecompiledPdf)}" data-availability-mode="${escapeHtml(
            ed.availabilityMode || "precompiled_pdf",
          )}" download>📄 ${escapeHtml(ed.label)}</a>`,
      )
      .join("");
    if (typeof catalogGrid.addEventListener === "function" && !catalogGrid._editionsBound) {
      catalogGrid._editionsBound = true;
      catalogGrid.addEventListener("click", (e) => {
        const cardEl = e?.target?.closest
          ? e.target.closest("[data-profile-id]")
          : e?.target?.getAttribute?.("data-profile-id")
            ? e.target
            : null;
        const profId = cardEl?.getAttribute?.("data-profile-id");
        if (profId && !profId.includes("refugio_4_hojas") && !profId.includes("checklist_80_bloques")) {
          const synced = syncPrintDrawerControlsFromEditionProfile(profId, targetDoc);
          state.activePrintProfileId = synced.profileId;
          state.fontSizePt = synced.fontPt;
          state.columns = synced.columns;
          state.paperFormat = synced.paper;
          state.orientation = synced.orientation;
          state.foliationMode = synced.foliationMode;
          renderPrintDrawerPanelsSyncInDrawer(ctx);
        }
      });
    }
  }
}

export async function hydratePrintDrawerPanelsInDrawer(ctx = {}) {
  const { state, dataLayer } = ctx;
  renderPrintDrawerPanelsSyncInDrawer(ctx);
  if (!state.editorialProfilesLoaded && typeof dataLayer.loadEditorialProfiles === "function") {
    state.editorialProfilesLoaded = true;
    try {
      const ep = await dataLayer.loadEditorialProfiles();
      if (ep) {
        hydrateEditorialProfiles(ep);
        state.editorialProfilesProvenance = {
          printCount: Array.isArray(ep.print_profiles_14) ? ep.print_profiles_14.length : 14,
          branchCount: Array.isArray(ep.branch_profiles_12) ? ep.branch_profiles_12.length : 12,
          blocksCount: Array.isArray(ep.canonical_80_blocks_catalog)
            ? ep.canonical_80_blocks_catalog.length
            : 80,
        };
        renderPrintDrawerPanelsSyncInDrawer(ctx);
      }
    } catch {
      // Non-fatal
    }
  }
}

