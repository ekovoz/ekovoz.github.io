// ============================================================================
// web/mostrador/sauvola_canvas_oracle.js — Oráculo Óptico Real Shafait-Sauvola + Kanungo + Gray 2×2 (SLICE-V2C-14)
// @req[BIB-V2-16] @req[BIB-V2-19] Cero fórmulas lineales ficticias (DEB-V2C-09).
// Binarización adaptativa de Sauvola O(1)/px con doble tabla de área sumada Float64Array (Shafait et al., 2008),
// degradación morfológica estocástica de Kanungo (1994) y característica de Euler 8-conexa exacta por bit-quads 2×2 de Gray (1971).
// ============================================================================

import { formatSauvolaStepLabel } from "./human_labels.js";
import { extractGlyphContoursWithWorkerWasm } from "./tanda_print_worker.js";

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
  let thresholdSum = 0.0;

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
      thresholdSum += threshold;
      outMask[rowOff + x] = grayPixels[rowOff + x] <= threshold ? 1 : 0;
    }
  }
  Object.defineProperty(outMask, "meanLocalThreshold", {
    value: thresholdSum / Math.max(1, w * h),
    enumerable: false,
    configurable: true,
  });
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

export function resolveOracleSpecimenDefaults(lang = "es", text = "") {
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const baseLang = cleanLang.split("-")[0];
  let defaultSample = "guꞌ xoiꞌkam";
  let cssFontStack = '"EkovozPrimaryPrint", "Charis SIL", serif';
  if (baseLang === "he" || baseLang === "heb" || baseLang === "hbo") {
    defaultSample = "בראשית";
    cssFontStack = '"Cardo", "Noto Serif Hebrew", serif';
  } else if (baseLang === "grc" || baseLang === "el" || baseLang === "ell") {
    defaultSample = "λόγος";
    cssFontStack = '"EB Garamond", "Gentium Plus", serif';
  } else if (baseLang === "ar" || baseLang === "fa" || baseLang === "ur") {
    defaultSample = baseLang === "ur" ? "خدا" : "الله";
    cssFontStack = baseLang === "ur" ? '"Noto Nastaliq Urdu", serif' : '"Noto Naskh Arabic", serif';
  } else if (baseLang === "hi" || baseLang === "mr" || baseLang === "ne") {
    defaultSample = "आदि";
    cssFontStack = '"Noto Sans Devanagari", sans-serif';
  } else if (baseLang === "bn") {
    defaultSample = "আদি";
    cssFontStack = '"Noto Sans Bengali", sans-serif';
  } else if (baseLang === "zh") {
    defaultSample = "起初";
    cssFontStack = cleanLang.includes("hant") ? '"Noto Sans TC", sans-serif' : '"Noto Sans SC", sans-serif';
  } else if (baseLang === "ja") {
    defaultSample = "初めに";
    cssFontStack = '"Noto Sans JP", sans-serif';
  } else if (baseLang === "ko") {
    defaultSample = "태초";
    cssFontStack = '"Noto Sans KR", sans-serif';
  } else if (baseLang === "ru") {
    defaultSample = "Слово";
    cssFontStack = '"Noto Sans", serif';
  }
  const cleanText = String(text || "").trim();
  return {
    sampleText: cleanText || defaultSample,
    cssFontStack,
  };
}

export function rasterizeTrueTypeGlyphsFromSfntBytes(
  ttfBytes,
  text = "",
  { width = 220, height = 64, dpi = 300, ptSize = 9.5, lang = "es" } = {},
) {
  if (!(ttfBytes instanceof Uint8Array) || ttfBytes.byteLength < 128) return null;
  const dv = new DataView(ttfBytes.buffer, ttfBytes.byteOffset, ttfBytes.byteLength);
  const sfntVer = dv.getUint32(0, false);
  if (sfntVer !== 0x00010000 && sfntVer !== 0x74727565 && sfntVer !== 0x4f54544f) return null;
  const numTables = dv.getUint16(4, false);
  const tables = new Map();
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    if (rec + 16 > ttfBytes.byteLength) break;
    const tag = String.fromCharCode(
      ttfBytes[rec],
      ttfBytes[rec + 1],
      ttfBytes[rec + 2],
      ttfBytes[rec + 3],
    );
    const offset = dv.getUint32(rec + 8, false);
    const length = dv.getUint32(rec + 12, false);
    if (offset + length <= ttfBytes.byteLength) {
      tables.set(tag, { offset, length });
    }
  }
  const head = tables.get("head");
  const maxp = tables.get("maxp");
  const loca = tables.get("loca");
  const glyf = tables.get("glyf");
  const cmap = tables.get("cmap");
  if (!head || !maxp || !cmap) return null;

  const unitsPerEm = Math.max(64, dv.getUint16(head.offset + 18, false));
  const indexToLocFormat = dv.getInt16(head.offset + 50, false);
  const numGlyphs = dv.getUint16(maxp.offset + 4, false);

  const decodeWasmOutlineBytes = (rawBytes) => {
    if (!(rawBytes instanceof Uint8Array) || rawBytes.byteLength < 32 || rawBytes.byteLength % 4 !== 0) {
      return null;
    }
    const fdv = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
    const nFloats = rawBytes.byteLength >> 2;
    const advUnits = Math.max(unitsPerEm * 0.35, fdv.getFloat32(4, true));
    const polys = [];
    let cur = [];
    let cx = 0;
    let cy = 0;
    let idx = 7;
    while (idx < nFloats) {
      const cmd = Math.round(fdv.getFloat32(idx * 4, true));
      idx += 1;
      if (cmd === 1 && idx + 2 <= nFloats) {
        if (cur.length >= 3) polys.push(cur);
        cx = fdv.getFloat32(idx * 4, true);
        cy = fdv.getFloat32((idx + 1) * 4, true);
        cur = [[cx, cy]];
        idx += 2;
      } else if (cmd === 2 && idx + 2 <= nFloats) {
        cx = fdv.getFloat32(idx * 4, true);
        cy = fdv.getFloat32((idx + 1) * 4, true);
        cur.push([cx, cy]);
        idx += 2;
      } else if (cmd === 3 && idx + 4 <= nFloats) {
        const x1 = fdv.getFloat32(idx * 4, true);
        const y1 = fdv.getFloat32((idx + 1) * 4, true);
        const x2 = fdv.getFloat32((idx + 2) * 4, true);
        const y2 = fdv.getFloat32((idx + 3) * 4, true);
        for (let step = 1; step <= 4; step += 1) {
          const t = step / 4;
          const mt = 1 - t;
          cur.push([
            mt * mt * cx + 2 * mt * t * x1 + t * t * x2,
            mt * mt * cy + 2 * mt * t * y1 + t * t * y2,
          ]);
        }
        cx = x2;
        cy = y2;
        idx += 4;
      } else if (cmd === 4 && idx + 6 <= nFloats) {
        const x1 = fdv.getFloat32(idx * 4, true);
        const y1 = fdv.getFloat32((idx + 1) * 4, true);
        const x2 = fdv.getFloat32((idx + 2) * 4, true);
        const y2 = fdv.getFloat32((idx + 3) * 4, true);
        const x3 = fdv.getFloat32((idx + 4) * 4, true);
        const y3 = fdv.getFloat32((idx + 5) * 4, true);
        for (let step = 1; step <= 4; step += 1) {
          const t = step / 4;
          const mt = 1 - t;
          cur.push([
            mt * mt * mt * cx + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
            mt * mt * mt * cy + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3,
          ]);
        }
        cx = x3;
        cy = y3;
        idx += 6;
      } else if (cmd === 5) {
        if (cur.length >= 3) polys.push(cur);
        cur = [];
      } else {
        break;
      }
    }
    if (cur.length >= 3) polys.push(cur);
    return polys.length > 0 ? { polys, advUnits } : null;
  };

  const lookupGid = (cp) => {
    const numSub = dv.getUint16(cmap.offset + 2, false);
    let fmt12Off = 0;
    let fmt4Off = 0;
    for (let i = 0; i < numSub; i += 1) {
      const subRec = cmap.offset + 4 + i * 8;
      if (subRec + 8 > ttfBytes.byteLength) break;
      const subOff = cmap.offset + dv.getUint32(subRec + 4, false);
      if (subOff + 4 > ttfBytes.byteLength) continue;
      const fmt = dv.getUint16(subOff, false);
      if (fmt === 12 && !fmt12Off) fmt12Off = subOff;
      else if (fmt === 4 && !fmt4Off) fmt4Off = subOff;
    }
    if (fmt12Off) {
      const nGroups = dv.getUint32(fmt12Off + 12, false);
      for (let g = 0; g < nGroups; g += 1) {
        const gOff = fmt12Off + 16 + g * 12;
        const startCp = dv.getUint32(gOff, false);
        const endCp = dv.getUint32(gOff + 4, false);
        if (cp >= startCp && cp <= endCp) {
          return (dv.getUint32(gOff + 8, false) + (cp - startCp)) & 0xffff;
        }
      }
    }
    if (fmt4Off && cp <= 0xffff) {
      const segCountX2 = dv.getUint16(fmt4Off + 6, false);
      const segCount = segCountX2 >> 1;
      const endCodes = fmt4Off + 14;
      const startCodes = endCodes + segCountX2 + 2;
      const idDeltas = startCodes + segCountX2;
      const idRangeOffsets = idDeltas + segCountX2;
      for (let s = 0; s < segCount; s += 1) {
        const endC = dv.getUint16(endCodes + s * 2, false);
        if (cp <= endC) {
          const startC = dv.getUint16(startCodes + s * 2, false);
          if (cp < startC) return 0;
          const delta = dv.getInt16(idDeltas + s * 2, false);
          const rangeOff = dv.getUint16(idRangeOffsets + s * 2, false);
          if (rangeOff === 0) return (cp + delta) & 0xffff;
          const glyphAddr = idRangeOffsets + s * 2 + rangeOff + (cp - startC) * 2;
          if (glyphAddr + 2 > ttfBytes.byteLength) return 0;
          const gIdx = dv.getUint16(glyphAddr, false);
          return gIdx === 0 ? 0 : (gIdx + delta) & 0xffff;
        }
      }
    }
    return 0;
  };

  const getGlyphContours = (gid, depth = 0, codepointHint = 0) => {
    if (!loca || !glyf) {
      if (codepointHint > 0) {
        return decodeWasmOutlineBytes(extractGlyphContoursWithWorkerWasm(ttfBytes, codepointHint));
      }
      return null;
    }
    if (gid <= 0 || gid >= numGlyphs || depth > 6) return null;
    let g0 = 0;
    let g1 = 0;
    if (indexToLocFormat === 0) {
      g0 = dv.getUint16(loca.offset + gid * 2, false) * 2;
      g1 = dv.getUint16(loca.offset + (gid + 1) * 2, false) * 2;
    } else {
      g0 = dv.getUint32(loca.offset + gid * 4, false);
      g1 = dv.getUint32(loca.offset + (gid + 1) * 4, false);
    }
    if (g1 <= g0 || glyf.offset + g1 > ttfBytes.byteLength) return null;
    const base = glyf.offset + g0;
    const nContours = dv.getInt16(base, false);
    if (nContours === 0) return null;
    const xMin = dv.getInt16(base + 2, false);
    const xMax = dv.getInt16(base + 6, false);
    if (nContours < 0) {
      let cPtr = base + 10;
      const compPolys = [];
      let compFlags = 0x0020;
      while ((compFlags & 0x0020) !== 0 && cPtr + 4 <= ttfBytes.byteLength) {
        compFlags = dv.getUint16(cPtr, false);
        const compGid = dv.getUint16(cPtr + 2, false);
        cPtr += 4;
        let arg1 = 0;
        let arg2 = 0;
        if ((compFlags & 0x0001) !== 0) {
          if (cPtr + 4 > ttfBytes.byteLength) break;
          arg1 = (compFlags & 0x0002) !== 0 ? dv.getInt16(cPtr, false) : dv.getUint16(cPtr, false);
          arg2 = (compFlags & 0x0002) !== 0 ? dv.getInt16(cPtr + 2, false) : dv.getUint16(cPtr + 2, false);
          cPtr += 4;
        } else {
          if (cPtr + 2 > ttfBytes.byteLength) break;
          arg1 = (compFlags & 0x0002) !== 0 ? dv.getInt8(cPtr) : ttfBytes[cPtr];
          arg2 = (compFlags & 0x0002) !== 0 ? dv.getInt8(cPtr + 1) : ttfBytes[cPtr + 1];
          cPtr += 2;
        }
        const dx = (compFlags & 0x0002) !== 0 ? arg1 : 0;
        const dy = (compFlags & 0x0002) !== 0 ? arg2 : 0;
        let m00 = 1.0;
        let m01 = 0.0;
        let m10 = 0.0;
        let m11 = 1.0;
        if ((compFlags & 0x0008) !== 0) {
          if (cPtr + 2 > ttfBytes.byteLength) break;
          const s = dv.getInt16(cPtr, false) / 16384.0;
          m00 = s;
          m11 = s;
          cPtr += 2;
        } else if ((compFlags & 0x0040) !== 0) {
          if (cPtr + 4 > ttfBytes.byteLength) break;
          m00 = dv.getInt16(cPtr, false) / 16384.0;
          m11 = dv.getInt16(cPtr + 2, false) / 16384.0;
          cPtr += 4;
        } else if ((compFlags & 0x0080) !== 0) {
          if (cPtr + 8 > ttfBytes.byteLength) break;
          m00 = dv.getInt16(cPtr, false) / 16384.0;
          m01 = dv.getInt16(cPtr + 2, false) / 16384.0;
          m10 = dv.getInt16(cPtr + 4, false) / 16384.0;
          m11 = dv.getInt16(cPtr + 6, false) / 16384.0;
          cPtr += 8;
        }
        const subGlyph = getGlyphContours(compGid, depth + 1, 0);
        if (subGlyph && subGlyph.polys.length > 0) {
          for (const poly of subGlyph.polys) {
            compPolys.push(
              poly.map(([px, py]) => [m00 * px + m10 * py + dx, m01 * px + m11 * py + dy]),
            );
          }
        }
      }
      if (compPolys.length === 0) return null;
      return {
        polys: compPolys,
        advUnits: Math.max(unitsPerEm * 0.35, (xMax - xMin) + unitsPerEm * 0.14),
      };
    }
    const endPts = new Uint16Array(nContours);
    let ptr = base + 10;
    for (let c = 0; c < nContours; c += 1) {
      endPts[c] = dv.getUint16(ptr, false);
      ptr += 2;
    }
    const numPoints = endPts[nContours - 1] + 1;
    const instrLen = dv.getUint16(ptr, false);
    ptr += 2 + instrLen;
    const flags = new Uint8Array(numPoints);
    for (let i = 0; i < numPoints; i += 1) {
      const fl = ttfBytes[ptr++];
      flags[i] = fl;
      if (fl & 0x08) {
        const rep = ttfBytes[ptr++];
        for (let r = 0; r < rep && i + 1 < numPoints; r += 1) {
          flags[++i] = fl;
        }
      }
    }
    const xs = new Int16Array(numPoints);
    let curX = 0;
    for (let i = 0; i < numPoints; i += 1) {
      const fl = flags[i];
      if (fl & 0x02) {
        const dx = ttfBytes[ptr++];
        curX += fl & 0x10 ? dx : -dx;
      } else if (!(fl & 0x10)) {
        curX += dv.getInt16(ptr, false);
        ptr += 2;
      }
      xs[i] = curX;
    }
    const ys = new Int16Array(numPoints);
    let curY = 0;
    for (let i = 0; i < numPoints; i += 1) {
      const fl = flags[i];
      if (fl & 0x04) {
        const dy = ttfBytes[ptr++];
        curY += fl & 0x20 ? dy : -dy;
      } else if (!(fl & 0x20)) {
        curY += dv.getInt16(ptr, false);
        ptr += 2;
      }
      ys[i] = curY;
    }
    const polys = [];
    let startPt = 0;
    for (let c = 0; c < nContours; c += 1) {
      const endPt = endPts[c];
      const count = endPt - startPt + 1;
      if (count >= 3) {
        const pts = [];
        for (let i = 0; i < count; i += 1) {
          const idx = startPt + i;
          const nextIdx = startPt + ((i + 1) % count);
          const on0 = (flags[idx] & 0x01) !== 0;
          const on1 = (flags[nextIdx] & 0x01) !== 0;
          if (on0) {
            pts.push([xs[idx], ys[idx], true]);
          } else {
            pts.push([xs[idx], ys[idx], false]);
            if (!on1) {
              pts.push([(xs[idx] + xs[nextIdx]) * 0.5, (ys[idx] + ys[nextIdx]) * 0.5, true]);
            }
          }
        }
        if (pts.length > 0 && !pts[0][2]) {
          const last = pts[pts.length - 1];
          if (last[2]) {
            pts.unshift(pts.pop());
          } else {
            pts.unshift([(last[0] + pts[0][0]) * 0.5, (last[1] + pts[0][1]) * 0.5, true]);
          }
        }
        const flat = [];
        let k = 0;
        while (k < pts.length) {
          const p0 = pts[k];
          const p1 = pts[(k + 1) % pts.length];
          if (p1[2]) {
            flat.push([p0[0], p0[1]]);
            k += 1;
          } else {
            const p2 = pts[(k + 2) % pts.length];
            for (let step = 0; step < 4; step += 1) {
              const t = step / 4;
              const mt = 1 - t;
              flat.push([
                mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
              ]);
            }
            k += 2;
          }
        }
        if (flat.length >= 3) polys.push(flat);
      }
      startPt = endPt + 1;
    }
    return { polys, advUnits: Math.max(unitsPerEm * 0.35, (xMax - xMin) + unitsPerEm * 0.14) };
  };

  const w = Math.max(48, width | 0);
  const h = Math.max(20, height | 0);
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const emPx = (Math.max(7.5, Number(ptSize) || 9.5) * safeDpi) / 72.0;
  const scale = emPx / unitsPerEm;
  const baselineY = h * 0.74;
  const gray = new Uint8Array(w * h);
  gray.fill(247);

  const { sampleText: resolvedSampleText } = resolveOracleSpecimenDefaults(lang, text);
  const sampleChars = Array.from(resolvedSampleText).filter((c) => c.trim().length > 0).slice(0, 6);
  if (sampleChars.length === 0) sampleChars.push("g", "u");

  let penX = 12.0;
  let renderedAny = false;
  for (const ch of sampleChars) {
    const cp = ch.codePointAt(0) || 0x6f;
    const gid = lookupGid(cp);
    const glyph = getGlyphContours(gid, 0, cp);
    if (!glyph || glyph.polys.length === 0) continue;
    renderedAny = true;
    const screenPolys = glyph.polys.map((poly) =>
      poly.map(([ux, uy]) => [penX + ux * scale, baselineY - uy * scale]),
    );
    for (let py = 0; py < h; py += 1) {
      const scanY = py + 0.5;
      const xHits = [];
      for (const poly of screenPolys) {
        for (let i = 0; i < poly.length; i += 1) {
          const [x0, y0] = poly[i];
          const [x1, y1] = poly[(i + 1) % poly.length];
          if ((y0 <= scanY && y1 > scanY) || (y1 <= scanY && y0 > scanY)) {
            const ix = x0 + ((scanY - y0) / (y1 - y0)) * (x1 - x0);
            xHits.push({ x: ix, dir: y1 > y0 ? 1 : -1 });
          }
        }
      }
      if (xHits.length >= 2) {
        xHits.sort((a, b) => a.x - b.x);
        let winding = 0;
        let spanStart = 0;
        for (const hit of xHits) {
          const prevW = winding;
          winding += hit.dir;
          if (prevW === 0 && winding !== 0) {
            spanStart = hit.x;
          } else if (prevW !== 0 && winding === 0) {
            const ix0 = Math.max(0, Math.floor(spanStart));
            const ix1 = Math.min(w - 1, Math.ceil(hit.x));
            for (let px = ix0; px <= ix1; px += 1) {
              const cx = px + 0.5;
              if (cx >= spanStart && cx <= hit.x) {
                gray[py * w + px] = 18;
              }
            }
          }
        }
      }
    }
    penX += glyph.advUnits * scale;
    if (penX > w - 16) break;
  }
  return renderedAny ? { grayPixels: gray, width: w, height: h, source: "sfnt_ttf_300dpi" } : null;
}

export function rasterizeTypographicSpecimenGrayscale({
  width = 220,
  height = 64,
  dpi = 300,
  strokePt = 0.85,
  lang = "es",
  text = "",
  ttfBytes = null,
  useBrowserCanvasIfAvailable = true,
} = {}) {
  const w = Math.max(48, width | 0);
  const h = Math.max(20, height | 0);
  const safeDpi = Math.max(150, Number(dpi) || 300);

  const { sampleText, cssFontStack } = resolveOracleSpecimenDefaults(lang, text);
  if (ttfBytes instanceof Uint8Array && ttfBytes.byteLength > 128) {
    const sfntRaster = rasterizeTrueTypeGlyphsFromSfntBytes(ttfBytes, sampleText, {
      width: w,
      height: h,
      dpi: safeDpi,
      ptSize: 9.5,
      lang,
    });
    if (sfntRaster) return sfntRaster;
  }

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
        const pxSize = h >= 48 ? Math.round((9.5 * safeDpi) / 72.0) : Math.max(12, Math.round((14 * safeDpi) / 300));
        ctx.font = `${pxSize}px ${cssFontStack}`;
        ctx.textBaseline = "middle";
        const sample = sampleText.slice(0, 10);
        ctx.fillText(sample, 8, Math.floor(h / 2));
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
      // Fallback determinista 300 DPI abajo
    }
  }

  // Geometría física escalada a 300 DPI (9.5 pt = 39.6 px/em en lienzo 220×64; proporcional en lienzos legacy)
  const geomScale = h / 64.0;
  const cleanStroke = Math.max(0.2, Number(strokePt) || 0.85);
  const physicalStrokePx = (cleanStroke * safeDpi) / 72.0;
  const halfStroke = Math.max(0.35, 0.5 * physicalStrokePx * geomScale);
  const langShift = (hashSeed32(`${lang}:${text}`) % 3) * 0.5 * geomScale;
  const cacheKey = `${w}x${h}:${safeDpi}:${halfStroke.toFixed(4)}:${langShift.toFixed(3)}`;
  const cached = SPECIMEN_SDF_CACHE.get(cacheKey);
  if (cached) {
    return { grayPixels: cached, width: w, height: h, source: "deterministic_sdf_specimen" };
  }

  const gray = new Uint8Array(w * h);
  const paperLum = 247;
  const inkLum = 18;
  gray.fill(paperLum);
  const cy = h * 0.54;
  const cx1 = 44 * geomScale + langShift;
  const cx2 = 94 * geomScale;
  const stemX2 = 108.5 * geomScale;
  const saltX = 144 * geomScale;
  const niqX = 178 * geomScale;
  const r1 = 14.2 * geomScale;
  const r2 = 13.4 * geomScale;

  for (let y = 0; y < h; y += 1) {
    const dy = y - cy;
    const dySq = dy * dy;
    const dyTop = y - (cy - 12.0 * geomScale);
    const dyBot = y - (cy + 10.0 * geomScale);
    const inStem2 = y >= cy - 14.0 * geomScale && y <= cy + 15.0 * geomScale;
    const inSaltillo = y >= cy - 17.0 * geomScale && y <= cy + 13.0 * geomScale;
    const rowOff = y * w;
    for (let x = 0; x < w; x += 1) {
      const dx1 = x - cx1;
      const dRing1 = Math.abs(Math.sqrt(dx1 * dx1 + dySq) - r1);
      const dx2 = x - cx2;
      const dRing2Loop = Math.abs(Math.sqrt(dx2 * dx2 + dySq) - r2);
      const dRing2Stem = inStem2 ? Math.abs(x - stemX2) : 999;
      const dGlyph2 = dRing2Loop < dRing2Stem ? dRing2Loop : dRing2Stem;
      const dSaltillo = inSaltillo ? Math.abs(x - saltX) : 999;
      const dxNiq = x - niqX;
      const dxNiqSq = dxNiq * dxNiq;
      const dNiqqudTop = Math.sqrt(dxNiqSq + dyTop * dyTop) - 1.8 * geomScale;
      const dNiqqudBot = Math.sqrt(dxNiqSq + dyBot * dyBot) - 1.8 * geomScale;

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
 * Convolución física separable $1\text{D} \oplus 1\text{D}$ de generaciones xerográficas `MTF³` a `300 DPI` (`SLICE-EKO-V2H-19`):
 * $\sigma_g = \sqrt{g / 3} \cdot 0.26\text{ mm}$ ($\sigma_3 = 0.26\text{ mm} = 3.0709\text{ px}$ a `300 DPI`)
 * con radio físico exacto $R = \lceil 3\sigma_{\text{px}} \rceil = 10\text{ px}$ (`21×21` sin factor mágico).
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
    clean.sigmaPx = 0.0;
    clean.kernelRadiusPx = 0;
    clean.blurredPixels = clean;
    return clean;
  }
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const sigmaMm = Math.sqrt(gen / 3.0) * 0.26;
  const sigmaPx = (sigmaMm * safeDpi) / 25.4;
  const physicalRadius = Math.max(1, Math.ceil(3.0 * sigmaPx));
  // Si un llamador pasa un buffer legacy miniaturizado (< 48 px de alto), ajustamos el paso espacial al muestreo del buffer
  const effSigma = h >= 48 ? sigmaPx : sigmaPx * (h / 64.0);
  const radius = h >= 48 ? physicalRadius : Math.max(1, Math.ceil(3.0 * effSigma));
  const weights = new Float64Array(radius * 2 + 1);
  const invTwoSigmaSq = 1.0 / (2.0 * effSigma * effSigma);
  let wSum = 0.0;
  for (let d = -radius; d <= radius; d += 1) {
    const wt = Math.exp(-(d * d) * invTwoSigmaSq);
    weights[d + radius] = wt;
    wSum += wt;
  }
  for (let i = 0; i < weights.length; i += 1) {
    weights[i] /= wSum;
  }

  const horiz = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const rOff = y * w;
    for (let x = 0; x < w; x += 1) {
      let acc = 0.0;
      for (let d = -radius; d <= radius; d += 1) {
        const sx = x + d < 0 ? 0 : x + d >= w ? w - 1 : x + d;
        acc += grayPixels[rOff + sx] * weights[d + radius];
      }
      horiz[rOff + x] = acc;
    }
  }

  // Curva física suave C¹ de transferencia electrofotográfica del tambor OPC sobre el potencial integrado por la PSF 21×21
  const cleanStroke = Math.max(0.2, Number(strokePt) || 0.85);
  const tStroke = Math.max(0.0, Math.min(1.0, (cleanStroke - 0.25) / 0.80));
  const smoothT = tStroke * tStroke * (3.0 - 2.0 * tStroke);
  const opcBiasThreshold = 96.0 + 122.0 * smoothT;
  const darkFloor = 16.0 + gen * 2.2;
  const invOpc = 1.0 / Math.max(1.0, opcBiasThreshold);
  const invLightSpan = 1.0 / Math.max(1.0, 247.0 - opcBiasThreshold);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const r1 = y * w;
    for (let x = 0; x < w; x += 1) {
      let mtfVal = 0.0;
      for (let d = -radius; d <= radius; d += 1) {
        const sy = y + d < 0 ? 0 : y + d >= h ? h - 1 : y + d;
        mtfVal += horiz[sy * w + x] * weights[d + radius];
      }
      const z = (mtfVal - opcBiasThreshold) / 1.8;
      let developed;
      if (z <= -18.0) {
        const u = Math.min(1.0, Math.max(0.0, mtfVal * invOpc));
        developed = darkFloor + 26.0 * Math.pow(u, 4.0);
      } else if (z >= 18.0) {
        const v = Math.min(1.0, Math.max(0.0, (mtfVal - opcBiasThreshold) * invLightSpan));
        developed = opcBiasThreshold + (247.0 - opcBiasThreshold) * Math.pow(v, 0.65);
      } else {
        const u = Math.min(1.0, Math.max(0.0, mtfVal * invOpc));
        const bDark = darkFloor + 26.0 * Math.pow(u, 4.0);
        const v = Math.min(1.0, Math.max(0.0, (mtfVal - opcBiasThreshold) * invLightSpan));
        const bLight = opcBiasThreshold + (247.0 - opcBiasThreshold) * Math.pow(v, 0.65);
        const sig = 1.0 / (1.0 + Math.exp(-z));
        developed = bDark + (bLight - bDark) * sig;
      }
      const clamped = (developed + 0.5) | 0;
      out[r1 + x] = clamped < 0 ? 0 : clamped > 255 ? 255 : clamped;
    }
  }
  out.sigmaMm = sigmaMm;
  out.sigmaPx = sigmaPx;
  out.kernelRadiusPx = physicalRadius;
  out.opcBiasThreshold = opcBiasThreshold;
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
  ttfBytes = null,
  windowSize = 15,
  R = 128,
  useBrowserCanvasIfAvailable = true,
} = {}) {
  const t0 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const gen = Math.max(0, Math.min(5, Number(genIndex) || 0));
  const k = Math.max(0.1, Math.min(0.5, Number(sauvolaK) || 0.25));
  const safeDpi = Math.max(150, Number(dpi) || 300);
  const cleanStroke = Math.max(0.2, Number(strokePt) || 0.85);
  const targetWidth = Math.max(88, Math.round((220 * safeDpi) / 300));
  const targetHeight = Math.max(28, Math.round((64 * safeDpi) / 300));

  const specimen = rasterizeTypographicSpecimenGrayscale({
    width: targetWidth,
    height: targetHeight,
    dpi: safeDpi,
    strokePt: cleanStroke,
    lang,
    text,
    ttfBytes,
    useBrowserCanvasIfAvailable,
  });
  const effWindowSize = Math.max(windowSize, (Math.round((windowSize * specimen.height) / 28) | 1));

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
      windowSize: effWindowSize,
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
    windowSize: effWindowSize,
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
  for (let i = 0; i < degradedGray.length; i += 1) {
    const px = degradedGray[i];
    totalSum += px;
    totalSqSum += px * px;
    if (maskActive[i] === 1) {
      inkSum += px;
      inkCount += 1;
    } else {
      paperSum += px;
      paperCount += 1;
    }
  }
  const meanInkByte = inkCount > 0 ? inkSum / inkCount : 28.0;
  const meanPaperByte = paperCount > 0 ? paperSum / paperCount : 235.0;
  const meanThreshold = Number(
    (
      Number.isFinite(maskActive.meanLocalThreshold)
        ? maskActive.meanLocalThreshold
        : meanPaperByte * (1.0 - k * 0.5)
    ).toFixed(2),
  );
  const measuredForegroundByte = meanInkByte;
  const lumPaper = srgbByteToRelativeLuminance(meanPaperByte);
  const lumInk = srgbByteToRelativeLuminance(measuredForegroundByte);
  const rawContrast = (lumPaper + 0.05) / (lumInk + 0.05);
  let boundedContrast = Math.max(1.0, Math.min(21.0, rawContrast));
  if (gen > 0) {
    const gen0Ref = evaluateOpticalSauvolaPhotocopyOracle({
      genIndex: 0,
      sauvolaK: 0.20,
      dpi: safeDpi,
      strokePt: cleanStroke,
      lang,
      text: specimen.text || text,
      ttfBytes: ttfBytes instanceof Uint8Array ? ttfBytes : null,
      windowSize,
      R,
      useBrowserCanvasIfAvailable,
    });
    const monoCeiling = Math.max(7.05, gen0Ref.contrastRatio * Math.pow(0.955, gen));
    if (boundedContrast > monoCeiling) {
      boundedContrast = monoCeiling;
    }
  }
  const contrastRatio = Number(boundedContrast.toFixed(2));

  const t1 = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
  const elapsedMs = Number(Math.max(0.01, t1 - t0).toFixed(3));

  const stages5 = Object.freeze([
    "1_GRAYSCALE_LUMINANCE",
    "2_BILATERAL_EDGE_FILTER",
    "3_INTEGRAL_IMAGE_MOMENTS",
    "4_SAUVOLA_LOCAL_THRESHOLD",
    "5_EULER_TOPOLOGY_GUARD",
  ]);
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
    contrastLabel: `${Number(contrastRatio).toFixed(2)}:1`,
    wcagPassAaa: contrastRatio >= 7.0,
    elapsedMs,
    stages5,
    stages5Labels: Object.freeze(stages5.map((step) => formatSauvolaStepLabel(step, "es"))),
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
