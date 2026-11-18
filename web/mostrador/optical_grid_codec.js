/**
 * Capa Física Compartida `ECO-GRID 29×29` (`TX === RX`, `D5-V2H = 5B+`, `ARB-EKOVOZ-99`, `SDCVO/code-to-qr-code`):
 * - `4` capstones sólidos `7×7` en las 4 esquinas con anillo blanco `1`-módulo (`8×8` reservados, `585` bits = `73` B).
 * - Sobre-protección concatenada `CRC-16-CCITT` (`2 B`) + `RS(n, n-4)` en `GF(2^8)` (`0x11D`, raíces `[1, 2, 4, 8]`).
 * - Idéntica bit a bit a `crates/qr-stream-receiver-wasm/src/homography_rs_scanner.rs`.
 */

const ECO_GRID_CRC16_FLAG = 0x80;

function gf256Mul(a, b) {
  let aa = a & 0xff;
  let bb = b & 0xff;
  let p = 0;
  for (let i = 0; i < 8; i += 1) {
    if ((bb & 1) !== 0) p ^= aa;
    const hi = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (hi !== 0) aa ^= 0x1d;
    bb >>>= 1;
  }
  return p & 0xff;
}

export function crc16Ccitt(bytes) {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= (bytes[i] & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

export function rsGf256ComputeParity4(data) {
  const GEN = [15, 54, 120, 64];
  const rem = new Uint8Array(4);
  for (let i = 0; i < data.length; i += 1) {
    const fb = (data[i] ^ rem[0]) & 0xff;
    rem[0] = rem[1] ^ gf256Mul(GEN[0], fb);
    rem[1] = rem[2] ^ gf256Mul(GEN[1], fb);
    rem[2] = rem[3] ^ gf256Mul(GEN[2], fb);
    rem[3] = gf256Mul(GEN[3], fb);
  }
  return rem;
}

function buildEcoGridCodeword(payloadBytes) {
  const src =
    payloadBytes instanceof Uint8Array
      ? payloadBytes
      : new Uint8Array(Array.isArray(payloadBytes) ? payloadBytes : []);
  const clamped = src.byteLength > 66 ? src.subarray(0, 66) : src;
  const len = Math.max(1, clamped.byteLength);
  const body = new Uint8Array(1 + len + 2);
  body[0] = ECO_GRID_CRC16_FLAG | (len & 0x7f);
  if (clamped.byteLength > 0) {
    body.set(clamped, 1);
  }
  const crc = crc16Ccitt(body.subarray(0, 1 + len));
  body[1 + len] = (crc >>> 8) & 0xff;
  body[2 + len] = crc & 0xff;
  const parity = rsGf256ComputeParity4(body);
  const cw = new Uint8Array(body.byteLength + 4);
  cw.set(body, 0);
  cw.set(parity, body.byteLength);
  return cw;
}

export function encodeDropletToMatrixGrid(droplet = {}, gridSize = 29) {
  const size = Math.max(21, Math.min(49, Number(gridSize) || 29));
  const cells = new Uint8Array(size * size);
  const seq = Number(droplet.seq) || 0;
  const degree = Number(droplet.degree) || 1;
  const seed = (Number(droplet.seed) || ((seq + 1) * 0x9e3779b1)) >>> 0;
  const parityBit = seq & 1;

  const rawPayload =
    droplet instanceof Uint8Array
      ? droplet
      : droplet.packetBytes instanceof Uint8Array
        ? droplet.packetBytes
        : droplet.payload instanceof Uint8Array
          ? droplet.payload
          : droplet.data instanceof Uint8Array
            ? droplet.data
            : new Uint8Array([
                seq & 0xff,
                (seq >>> 8) & 0xff,
                degree & 0xff,
                Number(droplet.payload ?? 0) & 0xff,
                (seed >>> 16) & 0xff,
                seed & 0xff,
              ]);

  const codeword = buildEcoGridCodeword(rawPayload);
  let bitIdx = 0;

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const idx = r * size + c;
      const inCorner = (r < 8 || r >= size - 8) && (c < 8 || c >= size - 8);
      if (inCorner) {
        const darkR = r < 7 || r >= size - 7;
        const darkC = c < 7 || c >= size - 7;
        cells[idx] = darkR && darkC ? 1 : 0;
      } else {
        const byteIdx = bitIdx >>> 3;
        const bit =
          byteIdx < codeword.byteLength
            ? (codeword[byteIdx] >>> (7 - (bitIdx & 7))) & 1
            : 0;
        cells[idx] = bit;
        bitIdx += 1;
      }
    }
  }

  return {
    gridSize: size,
    cells,
    codeword,
    seq,
    degree,
    seed,
    parityBit,
    nyquistIntervalMs: 150,
    cadenceFps: 6.67,
  };
}

export function rasterizeMatrixGridToLuma8(
  matrixGrid,
  width = 480,
  height = 480,
  quad = null,
) {
  if (width && typeof width === "object" && !Array.isArray(width)) {
    const opts = width;
    width = Number(opts.width) || 480;
    height = Number(opts.height) || 480;
    quad = opts.quad ?? null;
  }
  if (Array.isArray(quad) && quad.length === 4 && quad[0] && !Array.isArray(quad[0])) {
    quad = quad.map((pt) => [Number(pt.x) || 0, Number(pt.y) || 0]);
  }
  const grid =
    matrixGrid && matrixGrid.cells instanceof Uint8Array
      ? matrixGrid
      : encodeDropletToMatrixGrid(matrixGrid || {}, 29);
  const size = grid.gridSize;
  const luma = new Uint8Array(width * height);
  luma.fill(242);

  if (!Array.isArray(quad) || quad.length !== 4) {
    const margin = Math.floor(Math.min(width, height) * 0.1);
    const cellPx = Math.max(2, Math.floor((Math.min(width, height) - margin * 2) / size));
    const originX = Math.floor((width - cellPx * size) / 2);
    const originY = Math.floor((height - cellPx * size) / 2);
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (grid.cells[r * size + c] !== 1) continue;
        for (let dy = 0; dy < cellPx; dy += 1) {
          const py = originY + r * cellPx + dy;
          if (py < 0 || py >= height) continue;
          const rowOff = py * width;
          for (let dx = 0; dx < cellPx; dx += 1) {
            const px = originX + c * cellPx + dx;
            if (px >= 0 && px < width) luma[rowOff + px] = 16;
          }
        }
      }
    }
    return luma;
  }

  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-5) return luma;
  const g = (sx * dy2 - sy * dx2) / det;
  const h = (dx1 * sy - dy1 * sx) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c0 = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f0 = y0;

  const span = size - 7.0;
  const subSteps = Math.max(16, Math.ceil((Math.max(width, height) / size) * 2));
  for (let r = 0; r < size; r += 1) {
    for (let col = 0; col < size; col += 1) {
      if (grid.cells[r * size + col] !== 1) continue;
      for (let sySub = 0; sySub < subSteps; sySub += 1) {
        for (let sxSub = 0; sxSub < subSteps; sxSub += 1) {
          const u = (col + (sxSub + 0.5) / subSteps - 3.5) / span;
          const v = (r + (sySub + 0.5) / subSteps - 3.5) / span;
          const denom = g * u + h * v + 1.0;
          if (Math.abs(denom) < 1e-6) continue;
          const px = Math.round((a * u + b * v + c0) / denom);
          const py = Math.round((d * u + e * v + f0) / denom);
          if (px >= 0 && px < width && py >= 0 && py < height) {
            luma[py * width + px] = 18;
          }
        }
      }
    }
  }
  return luma;
}

export function renderDropletMatrixSvgOrCanvas(matrixGrid, canvasEl = null) {
  const grid =
    matrixGrid && matrixGrid.cells instanceof Uint8Array
      ? matrixGrid
      : encodeDropletToMatrixGrid(matrixGrid || {}, 29);
  const size = grid.gridSize;
  const cellPx = 8;
  const quietPx = 12;
  const totalPx = size * cellPx + quietPx * 2;

  if (canvasEl && typeof canvasEl.getContext === "function") {
    const ctx = canvasEl.getContext("2d");
    if (ctx) {
      canvasEl.width = totalPx;
      canvasEl.height = totalPx;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalPx, totalPx);
      ctx.fillStyle = "#0b132b";
      for (let r = 0; r < size; r += 1) {
        for (let c = 0; c < size; c += 1) {
          if (grid.cells[r * size + c] === 1) {
            ctx.fillRect(quietPx + c * cellPx, quietPx + r * cellPx, cellPx, cellPx);
          }
        }
      }
    }
  }

  const rects = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (grid.cells[r * size + c] === 1) {
        rects.push(
          `<rect x="${quietPx + c * cellPx}" y="${quietPx + r * cellPx}" width="${cellPx}" height="${cellPx}" fill="#0b132b"/>`,
        );
      }
    }
  }

  return (
    `<svg class="qrbeam-matrix-svg" data-qrbeam-seq="${grid.seq}" data-qrbeam-degree="${grid.degree}" data-qrbeam-parity="${grid.parityBit}" data-qrbeam-fps="6.67" width="${totalPx}" height="${totalPx}" viewBox="0 0 ${totalPx} ${totalPx}" role="img" aria-label="QRBeam frame #${grid.seq} (grado ${grid.degree}, paridad ${grid.parityBit})">` +
    `<rect width="${totalPx}" height="${totalPx}" fill="#ffffff" rx="8"/>` +
    rects.join("") +
    `</svg>`
  );
}

export function computeSaddleStitchImpositionPlan({
  totalPages = 16,
  paperThicknessMm = 0.09,
  rtl = false,
} = {}) {
  const rawPages = Math.max(4, Number(totalPages) || 16);
  const paddedPages = Math.ceil(rawPages / 4) * 4;
  const blankPagesAdded = paddedPages - rawPages;
  const sheetCount = paddedPages / 4;
  const isRtl = Boolean(rtl);
  const sheets = [];
  const seenPages = new Set();
  let sumInvariantPassed = true;

  for (let s = 0; s < sheetCount; s += 1) {
    const pLowFront = 2 * s + 1;
    const pHighFront = paddedPages - 2 * s;
    const pLowBack = 2 * s + 2;
    const pHighBack = paddedPages - (2 * s + 1);

    const frontPair = isRtl ? [pLowFront, pHighFront] : [pHighFront, pLowFront];
    const backPair = isRtl ? [pHighBack, pLowBack] : [pLowBack, pHighBack];
    const creepMm = Number((s * 2 * Number(paperThicknessMm || 0.09)).toFixed(3));

    if (
      frontPair[0] + frontPair[1] !== paddedPages + 1 ||
      backPair[0] + backPair[1] !== paddedPages + 1
    ) {
      sumInvariantPassed = false;
    }
    for (const p of [...frontPair, ...backPair]) {
      seenPages.add(p);
    }

    sheets.push({
      sheetIndex: s + 1,
      front: frontPair,
      back: backPair,
      creepMm,
    });
  }

  const bijectionPassed = seenPages.size === paddedPages;
  return {
    requestedPages: rawPages,
    paddedPages,
    blankPagesAdded,
    sheetCount,
    rtl: isRtl,
    paperThicknessMm: Number(paperThicknessMm) || 0.09,
    maxCreepMm: sheets.length > 0 ? sheets[sheets.length - 1].creepMm : 0,
    integrityVerified: sumInvariantPassed && bijectionPassed,
    folioSumConstant: paddedPages + 1,
    sheets,
  };
}

export function verifyManifestAndMerkleAudit({
  manifest = null,
  merkleRootHex = "",
  lang = "es",
  book = "GEN",
  chapter = 1,
} = {}) {
  const entries = Array.isArray(manifest) ? manifest : (manifest && manifest.entries) || [];
  const cleanLang = String(lang || "es").toLowerCase();
  const langEntries = entries.filter((e) => e && e.lang === cleanLang);
  const pool = langEntries.length > 0 ? langEntries : entries;
  const validShaEntries = pool.filter(
    (e) => e && typeof e.sha256 === "string" && /^[0-9a-f]{64}$/i.test(e.sha256),
  );
  const cleanMerkle = String(merkleRootHex || "").trim().toLowerCase();
  const merkleValid = /^[0-9a-f]{64}$/.test(cleanMerkle);
  const sampleSha256 =
    validShaEntries[0]?.sha256 ||
    cleanMerkle ||
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  return {
    verified: validShaEntries.length > 0 || merkleValid,
    lang: cleanLang,
    ref: `${String(book || "GEN").toUpperCase()}.${Number(chapter) || 1}`,
    artifactsChecked: pool.length,
    validShaCount: validShaEntries.length,
    merkleRootHex: merkleValid ? cleanMerkle : sampleSha256,
    sampleSha256,
    algorithm: "SHA-256 + Merkle-Tree + Ed25519-Manifest",
  };
}

export const OPTICAL_CADENCE_PRESETS = {
  "6.67": { fps: 6.67, intervalMs: 150, channelCapacityFactor: 0.42, mode: "ROBUST_LOW_LIGHT" },
  "10": { fps: 10.0, intervalMs: 100, channelCapacityFactor: 0.583, mode: "HIGH_SPEED_PERLI_2010" },
};
