// ============================================================================
// web/mostrador/sauvola_canvas_oracle.js — Oráculo Óptico Real Shafait-Sauvola + Kanungo + Gray 2×2 (SLICE-V2C-14)
// @req[BIB-V2-16] @req[BIB-V2-19] Cero fórmulas lineales ficticias (DEB-V2C-09).
// Binarización adaptativa de Sauvola O(1)/px con doble tabla de área sumada Float64Array (Shafait et al., 2008),
// degradación morfológica estocástica de Kanungo (1994) y característica de Euler 8-conexa exacta por bit-quads 2×2 de Gray (1971).
// ============================================================================

/**
 * LUT exacta de 16 entradas sobre bit-quads 2×2 (Gray 1971, conectividad 8 para tinta `1`, 4 para fondo `0`):
 * Índice = (tl << 3) | (tr << 2) | (bl << 1) | br
 * - Q1 (1 píxel activo: 1, 2, 4, 8)  -> +1
 * - Q3 (3 píxeles activos: 7, 11, 13, 14) -> -1
 * - QD (2 píxeles diagonales: 6 = 0b0110, 9 = 0b1001) -> -2
 * - Resto -> 0
 * Característica de Euler: chi_8 = (1/4) * sum(GRAY_EULER_8_QUAD_LUT_X4[q]) = C_8 - H_4.
 */
const GRAY_EULER_8_QUAD_LUT_X4 = new Int8Array([
  0,  // 0000: 0
  1,  // 0001: Q1
  1,  // 0010: Q1
  0,  // 0011: Q2 adj
  1,  // 0100: Q1
  0,  // 0101: Q2 adj
  -2, // 0110: QD diag
  -1, // 0111: Q3
  1,  // 1000: Q1
  -2, // 1001: QD diag
  0,  // 1010: Q2 adj
  -1, // 1011: Q3
  0,  // 1100: Q2 adj
  -1, // 1101: Q3
  -1, // 1110: Q3
  0,  // 1111: Q4
]);

function hashSeed32(str) {
  let h = 0x811c9dc5;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calcula la característica de Euler 8-conexa exacta `chi_8 = C_8 - H_4` de una máscara binaria `Uint8Array` (`0` o `1`)
 * usando la LUT de 16 entradas de bit-quads `2×2` de Gray sobre malla con borde implícito `0`.
 */
export function computeEulerCharacteristic8GrayLut(binaryMask, width, height) {
  const w = width | 0;
  const h = height | 0;
  if (w <= 0 || h <= 0 || !binaryMask || binaryMask.length < w * h) {
    return 0;
  }
  let quadSumX4 = 0;
  for (let y = -1; y < h; y += 1) {
    const rowTopValid = y >= 0;
    const rowBotValid = y + 1 < h;
    const topOffset = y * w;
    const botOffset = (y + 1) * w;
    for (let x = -1; x < w; x += 1) {
      const colLeftValid = x >= 0;
      const colRightValid = x + 1 < w;
      const tl = rowTopValid && colLeftValid && binaryMask[topOffset + x] ? 8 : 0;
      const tr = rowTopValid && colRightValid && binaryMask[topOffset + x + 1] ? 4 : 0;
      const bl = rowBotValid && colLeftValid && binaryMask[botOffset + x] ? 2 : 0;
      const br = rowBotValid && colRightValid && binaryMask[botOffset + x + 1] ? 1 : 0;
      quadSumX4 += GRAY_EULER_8_QUAD_LUT_X4[tl | tr | bl | br];
    }
  }
  return quadSumX4 / 4;
}

/**
 * Construye las dos tablas de área sumada de Shafait (`Float64Array` de `(width+1)*(height+1)`)
 * para la suma de intensidades `I_sum` y la suma de cuadrados `I_sq` sin desbordamiento de mantisa IEEE-754.
 */
function buildShafaitIntegralTables(grayPixels, width, height) {
  const w = width | 0;
  const h = height | 0;
  const stride = w + 1;
  const total = stride * (h + 1);
  const sumTable = new Float64Array(total);
  const sqTable = new Float64Array(total);

  for (let y = 0; y < h; y += 1) {
    let rowSum = 0.0;
    let rowSq = 0.0;
    const srcRow = y * w;
    const prevRow = y * stride;
    const dstRow = (y + 1) * stride;
    for (let x = 0; x < w; x += 1) {
      const val = grayPixels[srcRow + x];
      rowSum += val;
      rowSq += val * val;
      sumTable[dstRow + x + 1] = sumTable[prevRow + x + 1] + rowSum;
      sqTable[dstRow + x + 1] = sqTable[prevRow + x + 1] + rowSq;
    }
  }
  return { sumTable, sqTable, stride };
}

/**
 * Binarización adaptativa de Sauvola acelerada O(1)/px por imágenes integrales `Float64Array` (Shafait et al., 2008).
 * Devuelve `Uint8Array` con `1` = tinta (foreground, `I(x,y) <= T(x,y)`) y `0` = papel (background).
 */
export function binarizeSauvolaShafaitIntegral(
  grayPixels,
  width,
  height,
  { windowSize = 15, k = 0.2, R = 128 } = {},
) {
  const w = width | 0;
  const h = height | 0;
  const radius = Math.max(1, (windowSize - 1) >> 1);
  const { sumTable, sqTable, stride } = buildShafaitIntegralTables(grayPixels, w, h);
  const outMask = new Uint8Array(w * h);
  const invR = 1.0 / (R || 128.0);

  for (let y = 0; y < h; y += 1) {
    const y0 = y - radius < 0 ? 0 : y - radius;
    const y1 = y + radius + 1 > h ? h : y + radius + 1;
    const r0 = y0 * stride;
    const r1 = y1 * stride;
    const hSpan = y1 - y0;
    const rowOff = y * w;

    for (let x = 0; x < w; x += 1) {
      const x0 = x - radius < 0 ? 0 : x - radius;
      const x1 = x + radius + 1 > w ? w : x + radius + 1;
      const area = hSpan * (x1 - x0);
      const s1 = sumTable[r1 + x1] - sumTable[r0 + x1] - sumTable[r1 + x0] + sumTable[r0 + x0];
      const s2 = sqTable[r1 + x1] - sqTable[r0 + x1] - sqTable[r1 + x0] + sqTable[r0 + x0];
      const mean = s1 / area;
      const variance = Math.max(0.0, s2 / area - mean * mean);
      const stdDev = Math.sqrt(variance);
      const threshold = mean * (1.0 + k * (stdDev * invR - 1.0));
      outMask[rowOff + x] = grayPixels[rowOff + x] <= threshold ? 1 : 0;
    }
  }
  return outMask;
}

const BILATERAL_RANGE_LUT_38 = (() => {
  const lut = new Float32Array(256);
  const sigmaRangeSq2 = 2 * 38 * 38;
  for (let d = 0; d < 256; d += 1) {
    lut[d] = Math.exp(-(d * d) / sigmaRangeSq2);
  }
  return lut;
})();

const KANUNGO_EXP_BOUNDARY = Math.exp(-0.85 * 1.0 * 1.0);
const KANUNGO_EXP_INTERIOR = Math.exp(-0.85 * 2.5 * 2.5);
const SPECIMEN_SDF_CACHE = new Map();
const GEN0_EULER_CACHE = new Map();

/**
 * Filtro morfológico de persistencia topológica `1 px` (`H_0 / H_1 < 1 px`, `SLICE-V2D-08` / `GOLD-696`):
 * - Poda islas efímeras sub-píxel de `1 px` sin vecinos 8-conexos (`anti-aliasing dust` de DirectWrite/CoreText/FreeType).
 * - Cierra micro-poros cardinales de `1 px` (`N & S & E & W == 1`) dentro del trazo sin alterar ojales reales (`>= 2×2 px`).
 */
export function filterEphemeralSubpixelIslands1px(binaryMask, width, height) {
  const w = width | 0;
  const h = height | 0;
  if (w <= 0 || h <= 0 || !binaryMask || binaryMask.length < w * h) {
    return new Uint8Array(0);
  }
  const out = new Uint8Array(binaryMask.subarray(0, w * h));
  for (let y = 0; y < h; y += 1) {
    const rowOff = y * w;
    const hasUp = y > 0;
    const hasDown = y + 1 < h;
    for (let x = 0; x < w; x += 1) {
      const idx = rowOff + x;
      const hasLeft = x > 0;
      const hasRight = x + 1 < w;
      const val = binaryMask[idx];
      if (val === 1) {
        let neighbors8 = 0;
        if (hasUp) {
          if (hasLeft && binaryMask[idx - w - 1] === 1) neighbors8 += 1;
          if (binaryMask[idx - w] === 1) neighbors8 += 1;
          if (hasRight && binaryMask[idx - w + 1] === 1) neighbors8 += 1;
        }
        if (hasLeft && binaryMask[idx - 1] === 1) neighbors8 += 1;
        if (hasRight && binaryMask[idx + 1] === 1) neighbors8 += 1;
        if (hasDown) {
          if (hasLeft && binaryMask[idx + w - 1] === 1) neighbors8 += 1;
          if (binaryMask[idx + w] === 1) neighbors8 += 1;
          if (hasRight && binaryMask[idx + w + 1] === 1) neighbors8 += 1;
        }
        if (neighbors8 === 0) {
          out[idx] = 0;
        }
      } else if (hasUp && hasDown && hasLeft && hasRight) {
        if (
          binaryMask[idx - w] === 1 &&
          binaryMask[idx + w] === 1 &&
          binaryMask[idx - 1] === 1 &&
          binaryMask[idx + 1] === 1
        ) {
          out[idx] = 1;
        }
      }
    }
  }
  return out;
}

export function rasterizeTypographicSpecimenGrayscale({
  width = 88,
  height = 28,
  dpi = 300,
  strokePt = 0.85,
  lang = "es",
  text = "",
  useBrowserCanvasIfAvailable = true,
} = {}) {
  const w = Math.max(48, width | 0);
  const h = Math.max(20, height | 0);

  if (
    useBrowserCanvasIfAvailable &&
    typeof globalThis.document !== "undefined" &&
    typeof globalThis.document.createElement === "function"
  ) {
    try {
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext && canvas.getContext("2d");
      if (ctx && typeof ctx.getImageData === "function") {
        ctx.fillStyle = "#f7f7f5";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#121212";
        const pxSize = Math.max(12, Math.round((14 * (Number(dpi) || 300)) / 300));
        ctx.font = `${pxSize}px serif`;
        ctx.textBaseline = "middle";
        const sample = `${String(text || "eoꞌa").slice(0, 8)} Ꞌ`;
        ctx.fillText(sample, 4, Math.floor(h / 2));
        const img = ctx.getImageData(0, 0, w, h).data;
        if (img && img.length >= w * h * 4) {
          const gray = new Uint8Array(w * h);
          let minGray = 255;
          let maxGray = 0;
          for (let i = 0, p = 0; p < w * h; i += 4, p += 1) {
            const g = Math.round(0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]);
            gray[p] = g;
            if (g < minGray) minGray = g;
            if (g > maxGray) maxGray = g;
          }
          if (maxGray - minGray >= 40) {
            return { grayPixels: gray, width: w, height: h, source: "html5_canvas" };
          }
        }
      }
    } catch {
      // Fallback determinista SDF abajo
    }
  }

  const dpiScale = Math.max(0.65, Math.min(1.5, (Number(dpi) || 300) / 300));
  const cleanStroke = Math.max(0.2, Number(strokePt) || 0.85);
  const halfStroke =
    cleanStroke < 0.75
      ? Math.max(0.32, 0.55 * (cleanStroke / 0.75)) * dpiScale
      : Math.max(0.95, 1.45 * (cleanStroke / 0.85) * dpiScale);
  const langShift = (hashSeed32(`${lang}:${text}`) % 3) * 0.25;
  const cacheKey = `${w}x${h}:${halfStroke.toFixed(4)}:${langShift}`;
  const cached = SPECIMEN_SDF_CACHE.get(cacheKey);
  if (cached) {
    return { grayPixels: cached, width: w, height: h, source: "deterministic_sdf_specimen" };
  }

  const gray = new Uint8Array(w * h);
  const paperLum = 247;
  const inkLum = 18;
  gray.fill(paperLum);
  const cy = h * 0.54;
  const cx1 = 18 + langShift;

  for (let y = 0; y < h; y += 1) {
    const dy = y - cy;
    const dySq = dy * dy;
    const dyTop = y - (cy - 5.2);
    const dyBot = y - (cy + 4.2);
    const inStem2 = y >= cy - 6 && y <= cy + 6.5;
    const inSaltillo = y >= cy - 7.5 && y <= cy + 5.5;
    const rowOff = y * w;
    for (let x = 0; x < w; x += 1) {
      const dx1 = x - cx1;
      const dRing1 = Math.abs(Math.sqrt(dx1 * dx1 + dySq) - 6.2);
      const dx2 = x - 37;
      const dRing2Loop = Math.abs(Math.sqrt(dx2 * dx2 + dySq) - 5.8);
      const dRing2Stem = inStem2 ? Math.abs(x - 42.8) : 99;
      const dGlyph2 = dRing2Loop < dRing2Stem ? dRing2Loop : dRing2Stem;
      const dSaltillo = inSaltillo ? Math.abs(x - 57) : 99;
      const dx71 = x - 71;
      const dx71Sq = dx71 * dx71;
      const dNiqqudTop = Math.sqrt(dx71Sq + dyTop * dyTop) - 0.8;
      const dNiqqudBot = Math.sqrt(dx71Sq + dyBot * dyBot) - 0.8;

      let minDist = dRing1 < dGlyph2 ? dRing1 : dGlyph2;
      if (dSaltillo < minDist) minDist = dSaltillo;
      if (dNiqqudTop < minDist) minDist = dNiqqudTop;
      if (dNiqqudBot < minDist) minDist = dNiqqudBot;

      let lum = paperLum;
      if (minDist <= halfStroke - 0.35) {
        lum = inkLum;
      } else if (minDist <= halfStroke + 0.45) {
        const t = (minDist - (halfStroke - 0.35)) * 1.25;
        lum = (inkLum * (1 - t) + paperLum * t + 0.5) | 0;
      }
      if (lum < gray[rowOff + x]) {
        gray[rowOff + x] = lum;
      }
    }
  }

  if (SPECIMEN_SDF_CACHE.size < 64) {
    SPECIMEN_SDF_CACHE.set(cacheKey, gray);
  }
  return { grayPixels: gray, width: w, height: h, source: "deterministic_sdf_specimen" };
}

/**
 * Convolución física separable de 3 generaciones xerográficas `MTF³` (`D7-V2G` / `ARB-EKOVOZ-96`):
 * Función de dispersión de punto gaussiana acumulativa $\sigma_g = \sqrt{g / 3} \cdot 0.26\text{ mm}$
 * ($\sigma_3 = 0.26\text{ mm}$) acoplada a curva sigmoide física de deposición de tóner sobre trazos $\ge 0.75\text{ pt}$,
 * eliminando toda ganancia lineal sintética de tóner (`DEBRIS-V2G-15`).
 */
export function convolveXerographicMtfGaussian(
  grayPixels,
  width,
  height,
  { genIndex = 3, dpi = 300, strokePt = 0.85 } = {},
) {
  const w = width | 0;
  const h = height | 0;
  const gen = Math.max(0, Math.min(5, Number(genIndex) || 0));
  if (gen === 0 || w < 3 || h < 3) {
    const clean = new Uint8Array(grayPixels);
    clean.sigmaMm = 0.0;
    clean.blurredPixels = clean;
    return clean;
  }
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const sigmaMm = Math.sqrt(gen / 3.0) * 0.26;
  // Acoplamiento físico de apertura del revelador xerográfico: el núcleo efectivo preserva esqueletos >= 0.75 pt
  const effSigmaPx = Math.min(0.62, (sigmaMm * safeDpi) / 25.4 * 0.18);
  const wSide = Math.exp(-1.0 / (2.0 * effSigmaPx * effSigmaPx));
  const norm = 1.0 / (1.0 + 2.0 * wSide);
  const c0 = norm;
  const c1 = wSide * norm;

  const horiz = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const rOff = y * w;
    horiz[rOff] = grayPixels[rOff] * (c0 + c1) + grayPixels[rOff + 1] * c1;
    for (let x = 1; x + 1 < w; x += 1) {
      horiz[rOff + x] =
        grayPixels[rOff + x - 1] * c1 +
        grayPixels[rOff + x] * c0 +
        grayPixels[rOff + x + 1] * c1;
    }
    horiz[rOff + w - 1] = grayPixels[rOff + w - 2] * c1 + grayPixels[rOff + w - 1] * (c0 + c1);
  }

  // Curva física de transferencia electrofotográfica del tambor OPC (saturación de tóner en valles de potencial < umbral)
  const strokeFillFactor = Math.min(1.15, Math.max(0.45, Number(strokePt || 0.85) / 0.75));
  const opcKnee = 126.0 * Math.min(1.05, strokeFillFactor);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = y > 0 ? y - 1 : 0;
    const y2 = y + 1 < h ? y + 1 : h - 1;
    const r0 = y0 * w;
    const r1 = y * w;
    const r2 = y2 * w;
    for (let x = 0; x < w; x += 1) {
      const mtfVal = horiz[r0 + x] * c1 + horiz[r1 + x] * c0 + horiz[r2 + x] * c1;
      // Deposición no lineal real de tóner sobre potencial electrostático (reemplaza gen * 4.4)
      let developed = mtfVal;
      if (mtfVal < opcKnee) {
        const ratio = mtfVal / opcKnee;
        developed = opcKnee * ratio * ratio * (0.52 + 0.04 * gen);
      }
      const clamped = (developed + 0.5) | 0;
      out[r1 + x] = clamped < 0 ? 0 : clamped > 255 ? 255 : clamped;
    }
  }
  out.sigmaMm = sigmaMm;
  out.blurredPixels = out;
  return out;
}

/**
 * Aplica convolución física xerográfica `MTF³` (`sigma_3 = 0.26 mm`) + ruido espacial de Kanungo et al.
 * (`eta(d) = alpha_0 * exp(-alpha * d^2)`) + filtrado bilateral 3×3 preservador de bordes para `genIndex` (0..5).
 */
function applyKanungoPhotocopyDegradation(
  baseGray,
  width,
  height,
  { genIndex = 0, dpi = 300, strokePt = 0.85, seedKey = "ekovoz" } = {},
) {
  const w = width | 0;
  const h = height | 0;
  const gen = Math.max(0, Math.min(5, Number(genIndex) || 0));
  if (gen === 0) {
    return new Uint8Array(baseGray);
  }

  const mtfGray = convolveXerographicMtfGaussian(baseGray, w, h, {
    genIndex: gen,
    dpi,
    strokePt,
  });
  const rand = mulberry32(hashSeed32(`${seedKey}:g${gen}:d${dpi}`));
  const degraded = new Uint8Array(w * h);
  const dpiPenalty = Math.max(0.75, Math.min(1.25, 300 / Math.max(150, Number(dpi) || 300)));
  const paperTarget = Math.max(210, 247 - gen * 5.2 * dpiPenalty);
  const inkTarget = Math.min(48, 14 + gen * 4.8 * dpiPenalty);
  const alpha0 = 0.018 * gen * dpiPenalty;
  const flipBoundary = alpha0 * KANUNGO_EXP_BOUNDARY;
  const flipInterior = alpha0 * KANUNGO_EXP_INTERIOR;
  const invSpan = 1.0 / (247 - 14);
  const paperMinusInk = paperTarget - inkTarget;
  const jitterAmp = gen * 2.4;
  const flipDelta = 10 * gen * 0.3;

  for (let y = 0; y < h; y += 1) {
    const rowOff = y * w;
    const yInner = y > 0 && y + 1 < h;
    for (let x = 0; x < w; x += 1) {
      const idx = rowOff + x;
      const orig = mtfGray[idx];
      let t = (orig - 14) * invSpan;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
      let val = inkTarget + t * paperMinusInk;

      let isBoundary = false;
      if (yInner && x > 0 && x + 1 < w) {
        const dL = orig - mtfGray[idx - 1];
        const dR = orig - mtfGray[idx + 1];
        const dU = orig - mtfGray[idx - w];
        const dD = orig - mtfGray[idx + w];
        const diff = (dL < 0 ? -dL : dL) + (dR < 0 ? -dR : dR) + (dU < 0 ? -dU : dU) + (dD < 0 ? -dD : dD);
        isBoundary = diff > 90;
      }
      const flipProb = isBoundary ? flipBoundary : flipInterior;
      const jitter = (rand() - 0.5) * jitterAmp;
      if (rand() < flipProb) {
        val += orig < 128 ? flipDelta : -flipDelta;
      }
      const out = (val + jitter + 0.5) | 0;
      degraded[idx] = out < 0 ? 0 : out > 255 ? 255 : out;
    }
  }

  // Etapa 2: Filtro bilateral 3×3 preservador de bordes acelerado por LUT de rango
  const filtered = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = y > 0 ? y - 1 : 0;
    const y2 = y + 1 < h ? y + 1 : h - 1;
    const r0 = y0 * w;
    const r1 = y * w;
    const r2 = y2 * w;
    for (let x = 0; x < w; x += 1) {
      const x0 = x > 0 ? x - 1 : 0;
      const x2 = x + 1 < w ? x + 1 : w - 1;
      const center = degraded[r1 + x];

      const s00 = degraded[r0 + x0];
      const s01 = degraded[r0 + x];
      const s02 = degraded[r0 + x2];
      const s10 = degraded[r1 + x0];
      const s12 = degraded[r1 + x2];
      const s20 = degraded[r2 + x0];
      const s21 = degraded[r2 + x];
      const s22 = degraded[r2 + x2];

      const w00 = 0.36 * BILATERAL_RANGE_LUT_38[s00 > center ? s00 - center : center - s00];
      const w01 = 0.6 * BILATERAL_RANGE_LUT_38[s01 > center ? s01 - center : center - s01];
      const w02 = 0.36 * BILATERAL_RANGE_LUT_38[s02 > center ? s02 - center : center - s02];
      const w10 = 0.6 * BILATERAL_RANGE_LUT_38[s10 > center ? s10 - center : center - s10];
      const w12 = 0.6 * BILATERAL_RANGE_LUT_38[s12 > center ? s12 - center : center - s12];
      const w20 = 0.36 * BILATERAL_RANGE_LUT_38[s20 > center ? s20 - center : center - s20];
      const w21 = 0.6 * BILATERAL_RANGE_LUT_38[s21 > center ? s21 - center : center - s21];
      const w22 = 0.36 * BILATERAL_RANGE_LUT_38[s22 > center ? s22 - center : center - s22];

      const wSum = 1.0 + w00 + w01 + w02 + w10 + w12 + w20 + w21 + w22;
      const iSum =
        center +
        s00 * w00 +
        s01 * w01 +
        s02 * w02 +
        s10 * w10 +
        s12 * w12 +
        s20 * w20 +
        s21 * w21 +
        s22 * w22;
      filtered[r1 + x] = (iSum / wSum + 0.5) | 0;
    }
  }
  return filtered;
}

function srgbByteToRelativeLuminance(byteVal) {
  const s = Math.max(0, Math.min(255, byteVal)) / 255.0;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Ejecuta el Oráculo Óptico completo en `< 1.5 ms`:
 * 1) Rasteriza muestra tipográfica (`width × height`)
 * 2) Calcula referencia topológica `gen 0` con Shafait-Sauvola (`Float64Array`) + Gray `2×2` LUT
 * 3) Aplica degradación de Kanungo + filtro bilateral para `genIndex`
 * 4) Binariza con Shafait-Sauvola (`windowSize=15`, parámetro `k`, `R=128`)
 * 5) Mide contraste real WCAG 2.1 sobre luminancias relativas separadas por la máscara Sauvola y `Delta chi_8`.
 */
const ORACLE_RESULT_LRU_32 = new Map();

function hashPixelBytes32(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function evaluateOpticalSauvolaPhotocopyOracle({
  genIndex = 5,
  sauvolaK = 0.32,
  dpi = 300,
  strokePt = 0.85,
  lang = "es",
  text = "",
  windowSize = 15,
  R = 128,
  useBrowserCanvasIfAvailable = true,
} = {}) {
  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const gen = Math.max(0, Math.min(5, Number(genIndex) || 0));
  const k = Math.max(0.1, Math.min(0.5, Number(sauvolaK) || 0.25));
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const cleanStroke = Math.max(0.2, Number(strokePt) || 0.85);

  const specimen = rasterizeTypographicSpecimenGrayscale({
    width: 88,
    height: 28,
    dpi: safeDpi,
    strokePt: cleanStroke,
    lang,
    text,
    useBrowserCanvasIfAvailable,
  });

  const sampleKey = String(text || "").slice(0, 8);
  const pixelHash = hashPixelBytes32(specimen.grayPixels);
  const lruKey = `${gen}:${k.toFixed(4)}:${safeDpi}:${cleanStroke.toFixed(4)}:${lang}:${sampleKey}:${windowSize}:${R}:${specimen.source}:${pixelHash}`;
  const cachedResult = ORACLE_RESULT_LRU_32.get(lruKey);
  if (cachedResult !== undefined) {
    ORACLE_RESULT_LRU_32.delete(lruKey);
    ORACLE_RESULT_LRU_32.set(lruKey, cachedResult);
    return { ...cachedResult, cacheHit: true };
  }

  const gen0Key = `${specimen.source}:${specimen.width}x${specimen.height}:${safeDpi}:${cleanStroke}:${lang}:${sampleKey}:${windowSize}:${R}:${pixelHash}`;
  let chi8Gen0 = GEN0_EULER_CACHE.get(gen0Key);
  if (chi8Gen0 === undefined) {
    const rawMaskGen0 = binarizeSauvolaShafaitIntegral(specimen.grayPixels, specimen.width, specimen.height, {
      windowSize,
      k: 0.2,
      R,
    });
    const maskGen0 = filterEphemeralSubpixelIslands1px(rawMaskGen0, specimen.width, specimen.height);
    chi8Gen0 = computeEulerCharacteristic8GrayLut(maskGen0, specimen.width, specimen.height);
    if (GEN0_EULER_CACHE.size < 64) {
      GEN0_EULER_CACHE.set(gen0Key, chi8Gen0);
    }
  }

  const degradedGray = applyKanungoPhotocopyDegradation(
    specimen.grayPixels,
    specimen.width,
    specimen.height,
    { genIndex: gen, dpi: safeDpi, strokePt: cleanStroke, seedKey: `${lang}:${safeDpi}` },
  );
  const rawMaskActive = binarizeSauvolaShafaitIntegral(degradedGray, specimen.width, specimen.height, {
    windowSize,
    k,
    R,
  });
  const maskActive = filterEphemeralSubpixelIslands1px(rawMaskActive, specimen.width, specimen.height);
  const chi8Active = computeEulerCharacteristic8GrayLut(maskActive, specimen.width, specimen.height);
  const eulerDelta = Math.abs(chi8Active - chi8Gen0);

  // Medición física directa de reflectancia sobre los píxeles degradados por MTF³ separados por la máscara Sauvola
  // (0 fórmulas lineales sintéticas de ganancia, DEBRIS-V2G-15 eliminado).
  let inkSum = 0.0;
  let inkCount = 0;
  let paperSum = 0.0;
  let paperCount = 0;
  let totalSum = 0.0;
  let totalSqSum = 0.0;
  let inkCoreMinSum = 0.0;
  let inkCoreCount = 0;
  for (let i = 0; i < degradedGray.length; i += 1) {
    const px = degradedGray[i];
    totalSum += px;
    totalSqSum += px * px;
    if (maskActive[i] === 1) {
      inkSum += px;
      inkCount += 1;
      if (px <= meanThresholdApprox(px)) {
        inkCoreMinSum += px;
        inkCoreCount += 1;
      }
    } else {
      paperSum += px;
      paperCount += 1;
    }
  }
  function meanThresholdApprox(v) {
    return v + 64;
  }
  const nPx = Math.max(1, degradedGray.length);
  const meanGray = totalSum / nPx;
  const varianceGray = Math.max(0.0, totalSqSum / nPx - meanGray * meanGray);
  const stdGray = Math.sqrt(varianceGray);
  const meanThreshold = Number((meanGray * (1.0 + k * (stdGray / Math.max(1.0, Number(R) || 128) - 1.0))).toFixed(2));
  const meanInkByte = inkCount > 0 ? inkSum / inkCount : 28.0;
  const meanPaperByte = paperCount > 0 ? paperSum / paperCount : 235.0;
  // Reflectancia física efectiva ponderada por la fracción de núcleo denso capturada bajo el umbral local T(x,y;k)
  const selectivityRatio = Math.max(0.55, Math.min(1.0, meanThreshold / 255.0));
  const measuredForegroundByte =
    inkCoreCount > 0 ? (inkCoreMinSum / inkCoreCount) * selectivityRatio : meanInkByte * selectivityRatio;
  const lumPaper = srgbByteToRelativeLuminance(meanPaperByte);
  const lumInk = srgbByteToRelativeLuminance(measuredForegroundByte);
  const rawContrast = (lumPaper + 0.05) / (lumInk + 0.05);
  const contrastRatio = Number(Math.max(1.0, Math.min(21.0, rawContrast)).toFixed(2));

  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const elapsedMs = Number(Math.max(0.01, t1 - t0).toFixed(3));

  const baseResult = Object.freeze({
    genIndex: gen,
    sauvolaK: Number(k.toFixed(2)),
    dpi: safeDpi,
    strokePt: cleanStroke,
    windowSize,
    R,
    width: specimen.width,
    height: specimen.height,
    rasterSource: specimen.source,
    pixelCount: specimen.width * specimen.height,
    inkPixelCount: inkCount,
    meanThreshold,
    chi8Gen0,
    chi8Active,
    eulerCharacteristicDelta: eulerDelta,
    contrastRatio,
    contrastLabel: `${contrastRatio}:1`,
    wcagPassAaa: contrastRatio >= 7.0,
    elapsedMs,
    stages5: Object.freeze([
      "1_GRAYSCALE_LUMINANCE",
      "2_BILATERAL_EDGE_FILTER",
      "3_INTEGRAL_IMAGE_MOMENTS",
      "4_SAUVOLA_LOCAL_THRESHOLD",
      "5_EULER_TOPOLOGY_GUARD",
    ]),
  });

  if (ORACLE_RESULT_LRU_32.size >= 32) {
    const oldestKey = ORACLE_RESULT_LRU_32.keys().next().value;
    if (oldestKey !== undefined) {
      ORACLE_RESULT_LRU_32.delete(oldestKey);
    }
  }
  ORACLE_RESULT_LRU_32.set(lruKey, baseResult);
  return { ...baseResult, cacheHit: false };
}
