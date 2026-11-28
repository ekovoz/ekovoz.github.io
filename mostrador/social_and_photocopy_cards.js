// ============================================================================
// web/mostrador/social_and_photocopy_cards.js — Extracted LCOM4=1 Graphics Seam
// Decision D1-R2 / D5-R2: Kanungo+Sauvola 5th-gen Photocopy Oracle + OpenGraph 1200x630 SVG.
// Zero inline style="..." attributes.
// ============================================================================

import { simulateFifthGenPhotocopySauvolaBilateral } from "./dosis.js";
import { formatSauvolaStepLabel } from "./human_labels.js";
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
  const legibleVerdict = sim.wcagPassAaa !== false ? "Legible para fotocopiar" : "Ajustar contraste";
  return `✅ ${genLabel} · ${legibleVerdict} (Contraste ${sim.contrastLabel} ≥ 7.0:1)`;
}

function wrapSvgTextLines(rawText, maxCharsPerLine = 40, maxLines = 4) {
  const words = String(rawText || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let current = "";
  let truncated = false;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine || !current) {
      current = next.length <= maxCharsPerLine ? next : `${next.slice(0, Math.max(1, maxCharsPerLine - 1))}…`;
      continue;
    }
    if (lines.length + 1 >= maxLines) {
      truncated = true;
      break;
    }
    lines.push(current);
    current = word;
  }
  if (current) {
    lines.push(truncated ? `${current.replace(/[\s.,;:!?]+$/g, "")}…` : current);
  }
  return lines.slice(0, maxLines);
}

export function buildPhotocopySpecimenSvg({
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "En el principio creó Dios los cielos y la tierra.",
  lang = "es",
  activeGen = 5,
  contrastLabel = "21.00:1",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const lines = wrapSvgTextLines(
    String(text || "En el principio creó Dios los cielos y la tierra."),
    38,
    4,
  );
  const tspans = lines
    .map((line, idx) => `<tspan x="96" dy="${idx === 0 ? 0 : 58}">${escHtml(line)}</tspan>`)
    .join("");
  const genSummary =
    activeGen === 0
      ? isEn ? "Original 300 DPI" : "Original 300 PPP"
      : isEn ? `Photocopy specimen (Gen ${Number(activeGen) || 0})` : `Prueba de fotocopia (Gen. ${Number(activeGen) || 0})`;
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="#ffffff"/>` +
    `<rect x="44" y="44" width="1112" height="542" rx="12" fill="#ffffff" stroke="#000000" stroke-width="4"/>` +
    `<text x="96" y="135" fill="#000000" font-family="serif" font-size="36" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="230" fill="#000000" font-family="serif" font-size="44">${tspans}</text>` +
    `<line x1="96" y1="470" x2="1104" y2="470" stroke="#000000" stroke-width="2"/>` +
    `<text x="96" y="530" fill="#000000" font-family="sans-serif" font-size="26">${escHtml(genSummary)} · ${isEn ? "Ink contrast" : "Contraste"} ${escHtml(contrastLabel)} ≥ 7.0:1 AAA</text>` +
    `</svg>`;
  return {
    width: 1200,
    height: 630,
    dimensions: "1200x630",
    svgMarkup,
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`,
  };
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
  precomputedActiveSim = null,
  showHeaderContrastBadge = true,
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").slice(0, 140);
  const activeSim =
    precomputedActiveSim && typeof precomputedActiveSim === "object"
      ? precomputedActiveSim
      : simulateKanungoSauvolaGeneration(activeGen, sauvolaK, 300, {
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
    const sim =
      g === activeSim.genIndex
        ? activeSim
        : simulateKanungoSauvolaGeneration(g, defaultK, 300, { lang, text: cleanText, ttfBytes });
    return {
      gen: g,
      shortLabel: g === 0 ? "Orig" : `G${g}`,
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
        `<button type="button"${g.gen === 3 ? ' id="btnSimulatePhotocopy3Gen"' : ""} class="uls-chip photocopy-gen-btn photocopy-seg-btn${g.active ? " is-selected" : ""}" data-photocopy-gen="${g.gen}" data-gen-label="${escHtml(g.label)}" data-contrast-ratio="${g.contrast}" data-sauvola-k="${g.sauvolaK}" title="${escHtml(g.label)}: ${g.contrast}" aria-pressed="${g.active ? "true" : "false"}">` +
        `<strong>${g.shortLabel}</strong> · ${g.contrast}` +
        `</button>`,
    )
    .join("");

  const stagesBadges = activeSim.stages5
    .map(
      (st) =>
        `<span class="uls-badge photocopy-stage-badge" data-graphics-stage="${st}">${escHtml(formatSauvolaStepLabel(st, uiLocale))}</span>`,
    )
    .join(" ");

  const specimenData = buildPhotocopySpecimenSvg({
    book,
    chapter,
    verse,
    text: cleanText,
    lang,
    activeGen: activeSim.genIndex,
    contrastLabel: activeSim.contrastLabel,
    uiLocale,
  });

  const headerStatusHtml = showHeaderContrastBadge
    ? `<span id="photocopyActiveStatusBadge" class="uls-badge" data-sauvola-pass="true">✅ ${isEn ? `Copy Gen ${activeSim.genIndex} · Contrast` : `Copia Gen. ${activeSim.genIndex} · Contraste`} ${activeSim.contrastLabel} ≥ 7.0:1 AAA</span>`
    : "";
  const verdictHtml =
    `<span id="photocopyLegibilityVerdict" class="uls-badge" data-sauvola-pass="true">` +
    `✅ ${isEn ? `Readable through 3rd copy (G${activeSim.genIndex} · ${activeSim.contrastLabel})` : `Legible hasta 3ª fotocopia rural (G${activeSim.genIndex} · ${activeSim.contrastLabel})`}` +
    `</span>`;
  const genSliderLabel = isEn
    ? `Photocopy wear simulation (G0–G5): G${activeSim.genIndex}`
    : `Nivel de desgaste de fotocopia (G0–G5): G${activeSim.genIndex}`;

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
    `${headerStatusHtml || verdictHtml}` +
    `</div>` +
    `<div class="photocopy-controls-row">` +
    `<label for="inputPhotocopyGenSlider" class="photocopy-slider-label">🖨️ ${escHtml(genSliderLabel)}</label>` +
    `<input id="inputPhotocopyGenSlider" class="photocopy-slider-input" type="range" min="0" max="5" step="1" value="${activeSim.genIndex}" aria-label="${escHtml(genSliderLabel)}" />` +
    `<label for="inputSauvolaK" class="photocopy-slider-label">🎛️ ${isEn ? `Copy contrast level (${activeSim.sauvolaK.toFixed(2)}):` : `Nivel de contraste de copia (${activeSim.sauvolaK.toFixed(2)}):`}</label>` +
    `<input id="inputSauvolaK" class="photocopy-slider-input" type="range" min="0.15" max="0.40" step="0.01" value="${activeSim.sauvolaK.toFixed(2)}" />` +
    `</div>` +
    `<div class="ek-mt-xs"><button type="button" id="btnTogglePhotocopyLevels" class="uls-chip" aria-expanded="false" aria-controls="photocopyAdvancedDetails">${isEn ? "🎛️ Photocopy levels (Orig–G5) & steps" : "🎛️ Ver niveles Orig–G5 y pasos"}</button></div>` +
    `<section id="photocopyAdvancedDetails" class="photocopy-gen-details ek-mt-xs" hidden>` +
    `<div class="photocopy-badges-row photocopy-segmented-bar" role="group" aria-label="${isEn ? "Photocopy generations" : "Generaciones de fotocopia"}">${genBadges}</div>` +
    `<div class="photocopy-badges-row ek-mt-xs" data-advanced-audit="true">${stagesBadges}</div>` +
    `</section>` +
    `<div class="photocopy-preview-caption">` +
    `<img class="photocopy-preview-img" alt="Photocopy Specimen Preview" src="${specimenData.svgDataUrl}" />` +
    `<span>${isEn ? `White-paper black-ink specimen (${escHtml(refLabel)}) verified for community copying.` : `Espécimen papel blanco / tinta negra (${escHtml(refLabel)}) verificado para copiado comunitario.`}</span>` +
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
  uiLocale = "es",
  framingPreset = "balanced",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const refLabel = `${String(book || "GEN").toUpperCase()} ${Number(chapter) || 1}:${Number(verse) || 1}`;
  const presetKey = ["balanced", "bold_verse", "high_contrast"].includes(framingPreset) ? framingPreset : "balanced";
  const palette = presetKey === "high_contrast"
    ? { bg: "#000000", card: "#09090b", border: "#ffffff", accent: "#ffffff", ink: "#ffffff", meta: "#e4e4e7", size: 40, wrap: 40 }
    : presetKey === "bold_verse"
      ? { bg: "#12161f", card: "#181e29", border: "#d4a359", accent: "#f3c778", ink: "#ffffff", meta: "#cbd5e1", size: 44, wrap: 36 }
      : { bg: "#12161f", card: "#181e29", border: "#d4a359", accent: "#d4a359", ink: "#f8fafc", meta: "#cbd5e1", size: 38, wrap: 44 };
  const lines = wrapSvgTextLines(
    String(text || "En el principio creó Dios los cielos y la tierra."),
    palette.wrap,
    5,
  );
  const tspans = lines
    .map((line, idx) => `<tspan x="96" dy="${idx === 0 ? 0 : Math.round(palette.size * 1.28)}">${escHtml(line)}</tspan>`)
    .join("");
  const footerText = isEn
    ? "Ekovoz · Public Domain CC0 · Offline Multilingual Bible"
    : "Ekovoz · Dominio Público CC0 · Lectura sin internet";
  const svgMarkup =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" data-framing-preset="${presetKey}">` +
    `<rect width="1200" height="630" fill="${palette.bg}"/>` +
    `<rect x="48" y="48" width="1104" height="534" rx="24" fill="${palette.card}" stroke="${palette.border}" stroke-width="3"/>` +
    `<text x="96" y="135" fill="${palette.accent}" font-family="serif" font-size="38" font-weight="bold">EKOVOZ · ${escHtml(refLabel)} (${escHtml(String(lang).toUpperCase())})</text>` +
    `<text x="96" y="215" fill="${palette.ink}" font-family="serif" font-size="${palette.size}">${tspans}</text>` +
    `<text x="96" y="535" fill="${palette.meta}" font-family="sans-serif" font-size="26">${escHtml(footerText)}</text>` +
    `</svg>`;
  return {
    width: 1200,
    height: 630,
    dimensions: "1200x630",
    framingPreset: presetKey,
    svgMarkup,
    svgDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`,
  };
}

export function renderSocialCardFramingPresetSelectorHtml({
  framingPreset = "balanced",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cur = ["balanced", "bold_verse", "high_contrast"].includes(framingPreset) ? framingPreset : "balanced";
  return (
    `<label class="ek-label-sm">${isEn ? "Card framing" : "Encuadre"} ` +
    `<select id="socialCardFramingPresetSelect" class="ek-select-compact" aria-label="${escHtml(isEn ? "Social card framing preset" : "Ajuste de encuadre de tarjeta")}">` +
    `<option value="balanced"${cur === "balanced" ? " selected" : ""}>${isEn ? "Balanced Serif" : "Equilibrado"}</option>` +
    `<option value="bold_verse"${cur === "bold_verse" ? " selected" : ""}>${isEn ? "Large Verse" : "Versículo amplio"}</option>` +
    `<option value="high_contrast"${cur === "high_contrast" ? " selected" : ""}>${isEn ? "High Contrast AAA" : "Alto contraste AAA"}</option>` +
    `</select></label>`
  );
}

export function renderPhotocopyResilienceAndSocialCardHtml(opts = {}) {
  return renderEditorialGraphicsAndPrintSpecsCard(opts);
}
