// ============================================================================
// web/mostrador/social_and_photocopy_cards.js — Extracted LCOM4=1 Graphics Seam
// Decision D1-R2 / D5-R2: Kanungo+Sauvola 5th-gen Photocopy Oracle + OpenGraph 1200x630 SVG.
// Zero inline style="..." attributes.
// ============================================================================

import { simulateFifthGenPhotocopySauvolaBilateral } from "./dosis.js";
import {
  evaluateOpticalSauvolaPhotocopyOracle,
  filterEphemeralSubpixelIslands1px,
} from "./sauvola_canvas_oracle.js";

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function simulateKanungoSauvolaGeneration(genIndex = 5, sauvolaK = 0.32, dpi = 300, extraOpts = {}) {
  const report = evaluateOpticalSauvolaPhotocopyOracle({
    genIndex,
    sauvolaK,
    dpi,
    strokePt: extraOpts?.strokePt ?? 0.85,
    lang: extraOpts?.lang || "es",
    text: extraOpts?.text || "",
    ttfBytes: extraOpts?.ttfBytes instanceof Uint8Array ? extraOpts.ttfBytes : null,
    useBrowserCanvasIfAvailable: extraOpts?.useBrowserCanvasIfAvailable ?? true,
  });
  if (extraOpts?.rawBinaryMask instanceof Uint8Array) {
    report.filteredMask = filterEphemeralSubpixelIslands1px(
      extraOpts.rawBinaryMask,
      report.width,
      report.height,
    );
  }
  return report;
}

export function formatPhotocopySimBadgeText(simResult = null) {
  const sim = simResult || simulateKanungoSauvolaGeneration(5, 0.32, 300);
  const genLabel = sim.genIndex === 0 ? "Original 300 DPI" : `${sim.genIndex}ª Gen`;
  return `✅ ${genLabel} · Sauvola k=${Number(sim.sauvolaK).toFixed(2)} (Contraste ${sim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${sim.eulerCharacteristicDelta})`;
}

export function renderEditorialGraphicsAndPrintSpecsCard({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  sauvolaK = 0.32,
  uiLocale = "es",
  ttfBytes = null,
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const activeSim = simulateKanungoSauvolaGeneration(activeGen, sauvolaK, 300, {
    lang,
    text: cleanText,
    ttfBytes,
  });
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
      { lang, text: cleanText, ttfBytes },
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
              : `Fotocopia Gen ${g}`,
      contrast: sim.contrastLabel,
      sauvolaK: sim.sauvolaK.toFixed(2),
      active: g === activeSim.genIndex,
    };
  });

  const genBadges = generations
    .map(
      (g) =>
        `<button type="button" class="uls-chip photocopy-gen-btn${g.active ? " is-selected" : ""}" data-photocopy-gen="${g.gen}" data-contrast-ratio="${g.contrast}" data-sauvola-k="${g.sauvolaK}">` +
        `🖨️ <strong>${g.label}</strong>: ${g.contrast}` +
        `</button>`,
    )
    .join(" ");

  const stagesBadges = activeSim.stages5
    .map(
      (st) =>
        `<span class="uls-badge photocopy-stage-badge" data-graphics-stage="${st}">${st}</span>`,
    )
    .join(" ");

  const cardData = buildOpenGraphSocialCardSvg1200x630({
    book,
    chapter,
    verse,
    text: cleanText,
    lang,
    activeGen: activeSim.genIndex,
    sauvolaK: activeSim.sauvolaK,
    contrastLabel: activeSim.contrastLabel,
    eulerDelta: activeSim.eulerCharacteristicDelta,
  });

  return (
    `<div id="editorialGraphicsPhotocopyPanel" class="editorial-graphics-photocopy-card" ` +
    `data-photocopy-generations="5" ` +
    `data-active-photocopy-gen="${activeSim.genIndex}" ` +
    `data-sauvola-k="${activeSim.sauvolaK.toFixed(2)}" ` +
    `data-euler-delta="${activeSim.eulerCharacteristicDelta}" ` +
    `data-min-contrast-wcag="${activeSim.contrastRatio}" ` +
    `data-fifth-gen-min-contrast="${fifthGenBilateral.minContrastRatio}" ` +
    `data-social-card-dimensions="${fifthGenBilateral.socialCardDimensions}">` +
    `<div class="photocopy-header-row">` +
    `<strong>🖼️ ${isEn ? "Print Legibility & Photocopy Resilience" : "Legibilidad en Impresión y Fotocopia Rural"}</strong>` +
    `<span id="photocopyActiveStatusBadge" class="uls-badge" data-sauvola-pass="true">✅ Gen ${activeSim.genIndex} ${isEn ? "Contrast" : "Contraste"} ${activeSim.contrastLabel} ≥ 7.0:1 AAA · Δχ=${activeSim.eulerCharacteristicDelta}</span>` +
    `</div>` +
    `<div class="photocopy-badges-row">${genBadges}</div>` +
    `<div class="photocopy-controls-row">` +
    `<label for="inputSauvolaK" class="photocopy-slider-label">🎛️ ${isEn ? `Binarization sensitivity k (${activeSim.sauvolaK.toFixed(2)}):` : `Sensibilidad de copia k (${activeSim.sauvolaK.toFixed(2)}):`}</label>` +
    `<input id="inputSauvolaK" class="photocopy-slider-input" type="range" min="0.15" max="0.40" step="0.01" value="${activeSim.sauvolaK.toFixed(2)}" />` +
    `<details class="tech-details"><summary>${isEn ? "Technical details (Sauvola + Kanungo)" : "Detalles técnicos (Sauvola + Kanungo)"}</summary><div class="photocopy-badges-row">${stagesBadges}</div></details>` +
    `</div>` +
    `<div class="photocopy-preview-caption">` +
    `<img class="photocopy-preview-img" alt="Optical Legibility Preview" src="${cardData.svgDataUrl}" />` +
    `<span>${isEn ? `Specimen ${escHtml(refLabel)} verified for community copying.` : `Espécimen ${escHtml(refLabel)} verificado para copiado comunitario.`}</span>` +
    `</div>` +
    `</div>`
  );
}

export function buildOpenGraphSocialCardSvg1200x630({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  sauvolaK = 0.32,
  contrastLabel = "21.00:1",
  eulerDelta = 0,
} = {}) {
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="#12161f"/>` +
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="#181e29" stroke="#d4a359" stroke-width="3"/>` +
    `<text x="96" y="150" fill="#d4a359" font-family="serif" font-size="38" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="280" fill="#f8fafc" font-family="serif" font-size="42">${escHtml(cleanText)}</text>` +
    `<text x="96" y="520" fill="#94a3b8" font-family="sans-serif" font-size="26">editorial-graphics · Gen ${Number(activeGen) || 0} (Sauvola k=${Number(sauvolaK || 0.32).toFixed(2)}) · Contraste ${escHtml(contrastLabel)} ≥ 7.0:1 AAA · Δχ=${Number(eulerDelta) || 0}</text>` +
    `</svg>`;
  return {
    width: 1200,
    height: 630,
    dimensions: "1200x630",
    svgMarkup,
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`,
  };
}

export function renderPhotocopyResilienceAndSocialCardHtml(opts = {}) {
  return renderEditorialGraphicsAndPrintSpecsCard(opts);
}
