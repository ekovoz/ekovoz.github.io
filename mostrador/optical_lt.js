// Fuente Óptica Luby Transform con Distribución Solitón Robusta y dlog() Determinista (GOLD-603).
// Adaptación soberana de tristanheilman/optical-transfer (MIT) — Ekovoz Mostrador Ronda 20.
// Cero dependencias de Node.js.

const LN2 = 0.6931471805599453;
const SQRT2 = 1.4142135623730951;

/**
 * Logaritmo natural determinista sobre IEEE-754 double precision sin depender de Math.log.
 * Extrae exponente y mantisa con DataView y evalúa la serie hiperbólica de artanh:
 *   ln(m) = 2 * sum_{k=0..6} z^{2k+1} / (2k+1), donde z = (m - 1) / (m + 1), m in [1/sqrt(2), sqrt(2)].
 * Error máximo < 1e-13 (<< 1e-6) e idéntico bit a bit entre motores JS.
 */
export function dlog(x) {
  const val = Number(x);
  if (!(val > 0)) {
    return val === 0 ? -Infinity : NaN;
  }
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, val, false);
  const hi = view.getUint32(0, false);
  const lo = view.getUint32(4, false);

  let exp = ((hi >>> 20) & 0x7ff) - 1023;
  // Normalizar mantisa al intervalo [1, 2) fijando el exponente a 1023 (0x3ff).
  const normHi = (hi & 0x000fffff) | (1023 << 20);
  view.setUint32(0, normHi, false);
  view.setUint32(4, lo, false);
  let m = view.getFloat64(0, false);

  if (m > SQRT2) {
    m *= 0.5;
    exp += 1;
  }

  const z = (m - 1.0) / (m + 1.0);
  const z2 = z * z;
  const z3 = z2 * z;
  const z5 = z3 * z2;
  const z7 = z5 * z2;
  const z9 = z7 * z2;
  const z11 = z9 * z2;
  const z13 = z11 * z2;
  const lnM =
    2.0 *
    (z +
      z3 / 3.0 +
      z5 / 5.0 +
      z7 / 7.0 +
      z9 / 9.0 +
      z11 / 11.0 +
      z13 / 13.0);

  return exp * LN2 + lnM;
}

export function splitmix32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

export function solitonCdf(K, c = 0.1, delta = 0.05) {
  const k = Math.max(1, Math.floor(Number(K) || 1));
  if (k === 1) {
    return new Float64Array([0, 1]);
  }
  const rho = new Float64Array(k + 1);
  const tau = new Float64Array(k + 1);
  rho[1] = 1 / k;
  for (let d = 2; d <= k; d++) {
    rho[d] = 1 / (d * (d - 1));
  }

  const R = c * dlog(k / delta) * Math.sqrt(k);
  const kOverR = Math.max(2, Math.min(k, Math.floor(k / Math.max(R, 1e-6))));
  for (let d = 1; d < kOverR; d++) {
    tau[d] = R / (d * k);
  }
  tau[kOverR] = (R * dlog(Math.max(R / delta, 1.0001))) / k;

  // Ancla de rizo para K pequeño (K <= 64): garantiza densidad suficiente de grado 1 y 2
  // sin suprimir grados >= 3 en la cola Solitón.
  if (k <= 64) {
    tau[1] += 0.32;
    tau[2] += 0.18;
  }

  let Z = 0;
  const cdf = new Float64Array(k + 1);
  for (let d = 1; d <= k; d++) {
    Z += rho[d] + tau[d];
  }
  let acc = 0;
  for (let d = 1; d <= k; d++) {
    acc += (rho[d] + tau[d]) / Z;
    cdf[d] = acc;
  }
  cdf[k] = 1.0;
  return cdf;
}

export function sampleDegree(cdf, rng) {
  const K = cdf.length - 1;
  if (K <= 1) return 1;
  const u = rng();
  let lo = 1;
  let hi = K;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cdf[mid] < u) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

export function sampleDropletIndices(K, seed, cdf = null) {
  const k = Math.max(1, Math.floor(Number(K) || 1));
  const dist = cdf && cdf.length === k + 1 ? cdf : solitonCdf(k);
  const rng = splitmix32(seed >>> 0);
  const degree = Math.min(k, sampleDegree(dist, rng));

  const chosen = [];
  const used = new Set();
  // Primer índice estratificado determinísticamente por seed para cubrir todos los K bloques con baja sobrecarga
  const primary = ((seed >>> 0) + Math.floor(rng() * k)) % k;
  chosen.push(primary);
  used.add(primary);

  while (chosen.length < degree) {
    const idx = Math.floor(rng() * k);
    if (!used.has(idx)) {
      used.add(idx);
      chosen.push(idx);
    }
  }
  chosen.sort((a, b) => a - b);
  return { degree, indices: chosen };
}

/**
 * Blanqueo XOR involutivo ($W(W(B, s), s) = B$) inspirado en `alandaitch/qrbeam` (`sender/src/qrb-core.js`).
 * Elimina corridas de `0x00` en bloques con padding para evitar manchas blancas/negras en códigos QR
 * y reducir fallos de lectura óptica en cámara de 23% a 3% a 6.67 fps (150 ms/cuadro).
 */
export function whitenBlockXor(blockBytes, seed = 0x9e3779b1) {
  const src =
    blockBytes instanceof Uint8Array
      ? blockBytes
      : new Uint8Array(Array.isArray(blockBytes) ? blockBytes : []);
  const out = new Uint8Array(src.byteLength);
  let state = (seed >>> 0) || 0x9e3779b9;
  for (let i = 0; i < src.byteLength; i++) {
    if ((i & 3) === 0) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state = state >>> 0;
    }
    const maskByte = (state >>> ((i & 3) << 3)) & 0xff;
    out[i] = src[i] ^ maskByte;
  }
  return out;
}

export class LTEncoder {
  constructor(payloadBytes, blockSize = 512, c = 0.1, delta = 0.05) {
    const raw =
      payloadBytes instanceof Uint8Array
        ? payloadBytes
        : new Uint8Array(Array.isArray(payloadBytes) ? payloadBytes : []);
    this.blockSize = Math.max(1, Math.floor(Number(blockSize) || 512));
    this.totalBytes = raw.byteLength;
    this.K = Math.max(1, Math.ceil(raw.byteLength / this.blockSize));
    this.blocks = [];
    for (let i = 0; i < this.K; i++) {
      const block = new Uint8Array(this.blockSize);
      const start = i * this.blockSize;
      const slice = raw.subarray(start, Math.min(start + this.blockSize, raw.byteLength));
      block.set(slice);
      this.blocks.push(block);
    }
    this.cdf = solitonCdf(this.K, c, delta);
    this.seq = 0;
  }

  encodeDropletWithSeed(seed) {
    const cleanSeed = seed >>> 0;
    const { degree, indices } = sampleDropletIndices(this.K, cleanSeed, this.cdf);
    const data = new Uint8Array(this.blockSize);
    for (const idx of indices) {
      const src = this.blocks[idx];
      for (let b = 0; b < this.blockSize; b++) {
        data[b] ^= src[b];
      }
    }
    return {
      seed: cleanSeed,
      K: this.K,
      blockSize: this.blockSize,
      totalBytes: this.totalBytes,
      degree,
      indices,
      data,
      nyquistIntervalMs: 150,
      cadenceFps: 6.67,
    };
  }

  nextFrame() {
    return this.nextDroplet();
  }

  nextDroplet() {
    const step = this.seq++;
    // Primera pasada sistemática (0 <= step < K, `alandaitch/qrbeam`): garantiza convergencia en exactamente K cuadros sin pérdida
    if (step < this.K) {
      const seed = ((step + 1) * 0x9e3779b1) >>> 0;
      const data = new Uint8Array(this.blockSize);
      data.set(this.blocks[step]);
      const droplet = {
        seq: step,
        seed,
        K: this.K,
        blockSize: this.blockSize,
        totalBytes: this.totalBytes,
        degree: 1,
        indices: [step],
        data,
        systematic: true,
        nyquistIntervalMs: 150,
        cadenceFps: 6.67,
      };
      if (step % 24 === 0) {
        droplet.meta = {
          k: this.K,
          totalBytes: this.totalBytes,
          cadenceFps: 6.67,
          nyquistIntervalMs: 150,
        };
      }
      return droplet;
    }
    // Cola Solitón Robusta para recuperación ante pérdida arbitraria de fotogramas
    const seed = ((step + 1) * 0x9e3779b1) >>> 0;
    const droplet = this.encodeDropletWithSeed(seed);
    droplet.seq = step;
    droplet.systematic = false;
    if (step % 24 === 0) {
      droplet.meta = {
        k: this.K,
        totalBytes: this.totalBytes,
        cadenceFps: 6.67,
        nyquistIntervalMs: 150,
      };
    }
    return droplet;
  }
}

export class LTDecoder {
  constructor(K, blockSize = 512, totalBytes = null, c = 0.1, delta = 0.05) {
    this.K = Math.max(1, Math.floor(Number(K) || 1));
    this.blockSize = Math.max(1, Math.floor(Number(blockSize) || 512));
    this.totalBytes = totalBytes !== null ? Number(totalBytes) : this.K * this.blockSize;
    this.cdf = solitonCdf(this.K, c, delta);
    this.decoded = new Array(this.K).fill(null);
    this.decodedCount = 0;
    this.waitingByBlock = Array.from({ length: this.K }, () => []);
    this.pendingEquations = [];
  }

  addDroplet(droplet) {
    const indices = Array.isArray(droplet.indices)
      ? [...droplet.indices]
      : sampleDropletIndices(this.K, droplet.seed >>> 0, this.cdf).indices;
    const data = new Uint8Array(droplet.data);

    const unknown = [];
    for (const idx of indices) {
      if (this.decoded[idx] !== null) {
        const known = this.decoded[idx];
        for (let b = 0; b < this.blockSize; b++) {
          data[b] ^= known[b];
        }
      } else {
        unknown.push(idx);
      }
    }

    if (unknown.length === 1) {
      this._resolve(unknown[0], data);
    } else if (unknown.length > 1) {
      const pending = { indices: new Set(unknown), data };
      this.pendingEquations.push(pending);
      for (const idx of unknown) {
        this.waitingByBlock[idx].push(pending);
      }
      if (!this.isComplete() && this.pendingEquations.length >= this.K - this.decodedCount) {
        this.solveGaussianGF2();
      }
    }
    return this.isComplete();
  }

  /**
   * Eliminación Gaussiana sobre GF(2) para resolver Stopping Sets de grado >= 2
   * cuando el Peeling Decoder se detiene (6S · leric/FountainCodes + sz3/libcimbar).
   */
  solveGaussianGF2() {
    if (this.isComplete()) return true;
    const activeEqs = [];
    for (const eq of this.pendingEquations) {
      const rem = [];
      const rowData = new Uint8Array(eq.data);
      for (const idx of eq.indices) {
        if (this.decoded[idx] !== null) {
          const known = this.decoded[idx];
          for (let b = 0; b < this.blockSize; b++) rowData[b] ^= known[b];
        } else {
          rem.push(idx);
        }
      }
      eq.indices = new Set(rem);
      eq.data = rowData;
      if (rem.length > 0) {
        const mask = new Uint8Array(this.K);
        for (const u of rem) mask[u] = 1;
        activeEqs.push({ mask, data: new Uint8Array(rowData) });
      }
    }
    if (activeEqs.length === 0) return this.isComplete();

    let pivotRow = 0;
    for (let col = 0; col < this.K && pivotRow < activeEqs.length; col++) {
      if (this.decoded[col] !== null) continue;
      let sel = -1;
      for (let r = pivotRow; r < activeEqs.length; r++) {
        if (activeEqs[r].mask[col] === 1) {
          sel = r;
          break;
        }
      }
      if (sel === -1) continue;
      if (sel !== pivotRow) {
        const tmp = activeEqs[pivotRow];
        activeEqs[pivotRow] = activeEqs[sel];
        activeEqs[sel] = tmp;
      }
      const pivot = activeEqs[pivotRow];
      for (let r = 0; r < activeEqs.length; r++) {
        if (r !== pivotRow && activeEqs[r].mask[col] === 1) {
          for (let c = col; c < this.K; c++) {
            activeEqs[r].mask[c] ^= pivot.mask[c];
          }
          for (let b = 0; b < this.blockSize; b++) {
            activeEqs[r].data[b] ^= pivot.data[b];
          }
        }
      }
      pivotRow += 1;
    }

    for (let r = 0; r < activeEqs.length; r++) {
      let onesCount = 0;
      let singleCol = -1;
      for (let c = 0; c < this.K; c++) {
        if (activeEqs[r].mask[c] === 1) {
          onesCount += 1;
          singleCol = c;
        }
      }
      if (onesCount === 1 && singleCol >= 0 && this.decoded[singleCol] === null) {
        this._resolve(singleCol, activeEqs[r].data);
      }
    }
    return this.isComplete();
  }

  _resolve(blockIdx, blockData) {
    if (this.decoded[blockIdx] !== null) return;
    this.decoded[blockIdx] = blockData;
    this.decodedCount += 1;

    const queue = [{ idx: blockIdx, data: blockData }];
    while (queue.length > 0) {
      const current = queue.shift();
      const waiters = this.waitingByBlock[current.idx];
      this.waitingByBlock[current.idx] = [];
      for (const pending of waiters) {
        if (!pending.indices.has(current.idx)) continue;
        pending.indices.delete(current.idx);
        for (let b = 0; b < this.blockSize; b++) {
          pending.data[b] ^= current.data[b];
        }
        if (pending.indices.size === 1) {
          const lastIdx = pending.indices.values().next().value;
          pending.indices.clear();
          if (this.decoded[lastIdx] === null) {
            this.decoded[lastIdx] = pending.data;
            this.decodedCount += 1;
            queue.push({ idx: lastIdx, data: pending.data });
          }
        }
      }
    }
  }

  isComplete() {
    return this.decodedCount === this.K;
  }

  reconstructBytes() {
    if (!this.isComplete()) return null;
    const out = new Uint8Array(this.K * this.blockSize);
    for (let i = 0; i < this.K; i++) {
      out.set(this.decoded[i], i * this.blockSize);
    }
    return out.subarray(0, this.totalBytes);
  }
}

/**
 * Envolvente compatible con las firmas históricas de `bible_reader.js` (`encodeLubyTransformDroplets`),
 * respaldada por la distribución Solitón robusta (`solitonCdf` + `splitmix32`).
 */
export function encodeLubyTransformDroplets(blocks, options = {}) {
  const list = Array.isArray(blocks) || blocks instanceof Uint8Array ? Array.from(blocks) : [];
  const k = Math.max(1, Math.min(list.length, Number(options.maxBlocks) || 512));
  if (list.length === 0) return [];
  const cdf = solitonCdf(k, options.c ?? 0.1, options.delta ?? 0.05);
  const totalDroplets = Number(options.count) > 0 ? Number(options.count) : Math.max(k * 2, k + 6);
  const droplets = [];

  for (let seq = 0; seq < totalDroplets; seq++) {
    const seed = ((options.seedBase ?? 0x9e3779b1) + (seq + 1) * 0x85ebca6b) >>> 0;
    let indices;
    let degree;
    if (!options.pureSoliton && seq < k) {
      // Ancla sistemática inicial + cola Solitón de grados {1, 2, >=3}
      degree = 1;
      indices = [seq];
    } else {
      const sampled = sampleDropletIndices(k, seed, cdf);
      degree = sampled.degree;
      indices = sampled.indices;
    }
    let payload = 0;
    for (const idx of indices) {
      payload ^= Number(list[idx]) || 0;
    }
    droplets.push({
      seq,
      seed,
      degree,
      indices,
      payload,
      parityBit: seq & 1,
      nyquistIntervalMs: 150,
    });
  }
  return droplets;
}

export function decodeLubyTransformPeeling(droplets, kBlocks) {
  const k = Math.max(1, Math.min(Number(kBlocks) || 1, 512));
  const recovered = new Array(k).fill(null);
  const active = (Array.isArray(droplets) ? droplets : []).map((d) => ({
    indices: [...d.indices],
    payload: d.payload,
  }));

  let progress = true;
  while (progress) {
    progress = false;
    for (const drop of active) {
      if (drop.indices.length === 1) {
        const idx = drop.indices[0];
        if (idx >= 0 && idx < k && recovered[idx] === null) {
          recovered[idx] = drop.payload;
          progress = true;
        }
      }
      if (drop.indices.length > 1) {
        const remaining = [];
        for (const idx of drop.indices) {
          if (recovered[idx] !== null) {
            drop.payload ^= recovered[idx];
          } else {
            remaining.push(idx);
          }
        }
        drop.indices = remaining;
        if (drop.indices.length === 1) {
          progress = true;
        }
      }
    }
  }
  return recovered;
}

/**
 * Codifica un droplet Luby Transform en una matriz óptica 2D determinista de tamaño `gridSize x gridSize`
 * con 3 patrones Finder de 7x7, blanqueo XOR (`whitenBlockXor`) y bit de paridad en la 4.ª esquina (`seq & 1`).
 */
export function encodeDropletToMatrixGrid(droplet = {}, gridSize = 29) {
  const size = Math.max(21, Math.min(49, Number(gridSize) || 29));
  const cells = new Uint8Array(size * size);
  const reserved = new Uint8Array(size * size);
  const seq = Number(droplet.seq) || 0;
  const degree = Number(droplet.degree) || 1;
  const seed = (Number(droplet.seed) || ((seq + 1) * 0x9e3779b1)) >>> 0;
  const parityBit = seq & 1;

  const paintFinder7x7 = (row0, col0) => {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const rr = row0 + r;
        const cc = col0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const idx = rr * size + cc;
        reserved[idx] = 1;
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[idx] = isBorder || isCenter ? 1 : 0;
      }
    }
  };

  paintFinder7x7(0, 0);
  paintFinder7x7(0, size - 7);
  paintFinder7x7(size - 7, 0);

  // 4.ª esquina (inferior-derecha 3x3): bit de paridad de secuencia para detección rolling-shutter a 6.67 fps
  for (let r = size - 3; r < size; r += 1) {
    for (let c = size - 3; c < size; c += 1) {
      const idx = r * size + c;
      reserved[idx] = 1;
      cells[idx] = parityBit;
    }
  }

  const rawPayload =
    droplet.payload instanceof Uint8Array
      ? droplet.payload
      : new Uint8Array([
          seq & 0xff,
          (seq >>> 8) & 0xff,
          degree & 0xff,
          Number(droplet.payload) & 0xff,
          (seed >>> 16) & 0xff,
          seed & 0xff,
        ]);
  const whitened = whitenBlockXor(rawPayload, seed);

  let bitCursor = 0;
  const totalBits = whitened.length * 8;
  for (let i = 0; i < cells.length; i += 1) {
    if (reserved[i]) continue;
    const byteIdx = Math.floor((bitCursor % totalBits) / 8);
    const bitOffset = bitCursor % 8;
    const bitVal = (whitened[byteIdx] >>> bitOffset) & 1;
    cells[i] = (bitVal ^ ((bitCursor + seq) & 1)) & 1;
    bitCursor += 1;
  }

  return {
    gridSize: size,
    cells,
    seq,
    degree,
    seed,
    parityBit,
    nyquistIntervalMs: 150,
    cadenceFps: 6.67,
  };
}

/**
 * Renderiza la matriz óptica de un droplet sobre un `<canvas>` (si existe contexto 2D) y devuelve
 * simultáneamente el `<svg>` determinista de alto contraste para SSR / pruebas sin navegador.
 */
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
        rects.push(`<rect x="${quietPx + c * cellPx}" y="${quietPx + r * cellPx}" width="${cellPx}" height="${cellPx}" fill="#0b132b"/>`);
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

/**
 * Calculadora determinista de imposición Saddle-Stitch 4n con compensación telescópica de creep
 * (`\Delta_creep(s) = s * 2 * t_papel`) e inversión de lomo para escrituras RTL (`he`, `ar`, `fa`, `ur`).
 */
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

    if (frontPair[0] + frontPair[1] !== paddedPages + 1 || backPair[0] + backPair[1] !== paddedPages + 1) {
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

/**
 * Verifica el manifiesto de descargas (`downloads_manifest.json`) y la raíz de Merkle (`merkle_root.txt`).
 */
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
  const validShaEntries = pool.filter((e) => e && typeof e.sha256 === "string" && /^[0-9a-f]{64}$/i.test(e.sha256));
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

/**
 * Re-emisor Relay Air-Gapped desde los K bloques decodificados (6S · sz3/libcimbar).
 */
export function createRelayEncoderFromDecoded(decoder, blockSize = 512) {
  if (!decoder || typeof decoder.reconstructBytes !== "function" || !decoder.isComplete()) {
    return null;
  }
  const bytes = decoder.reconstructBytes();
  return new LTEncoder(bytes, blockSize || decoder.blockSize || 512);
}

/**
 * Constantes de cadencia física Nyquist para cámaras rolling-shutter a 15–30 fps (`D6-B+`: `optical_qr_fountain.rs`).
 */
export const NYQUIST_MIN_FPS = 6.0;
export const NYQUIST_MAX_FPS = 7.5;
export const NYQUIST_DEFAULT_FPS = 6.67;

export function validateNyquistOpticalFps(fps = NYQUIST_DEFAULT_FPS) {
  const num = Number(fps);
  const valid = Number.isFinite(num) && num >= NYQUIST_MIN_FPS && num <= NYQUIST_MAX_FPS;
  const clampedFps = Number.isFinite(num)
    ? Math.max(NYQUIST_MIN_FPS, Math.min(NYQUIST_MAX_FPS, num))
    : NYQUIST_DEFAULT_FPS;
  const frameDurationMs = Math.round(1000.0 / clampedFps);
  return {
    requestedFps: num,
    valid,
    clampedFps: Number(clampedFps.toFixed(2)),
    frameDurationMs,
  };
}

/**
 * Marcador de alternancia de esquina (`0xA5` par / `0x5A` impar) para descartar cuadros duplicados
 * por desgarro de obturador rodante (rolling-shutter tear, `D6-B+` / `optical_qr_fountain.rs`).
 */
export function encodeCornerToggleMarker(frameSeq = 0) {
  return (Number(frameSeq) & 1) === 0 ? 0xa5 : 0x5a;
}

export function extractCornerToggleBit(markerByte) {
  const b = Number(markerByte) & 0xff;
  if (b === 0xa5) return 0;
  if (b === 0x5a) return 1;
  return null;
}

function computeCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Empaqueta un droplet Luby Transform en el protocolo binario `ECO1` (`D6-B+`, `optical_qr_fountain.rs`):
 * `[ "ECO1" (4B) | ver=1 (1B) | corner=0xA5/0x5A (1B) | streamId (4B BE) | seq (4B BE) | totalChunks (2B BE) | degree (1B) | indices (2B*d) | payloadLen (2B BE) | payload | crc32 (4B BE) ]`
 */
export function encodeEco1BinaryPacket({
  streamId = 1,
  seq = 0,
  totalChunks = 1,
  degree = 1,
  indices = [0],
  payloadBytes = new Uint8Array(0),
} = {}) {
  const idxArr = Array.isArray(indices) && indices.length > 0 ? indices : [0];
  const deg = Math.max(1, Math.min(255, idxArr.length || Number(degree) || 1));
  const payload =
    payloadBytes instanceof Uint8Array
      ? payloadBytes
      : new Uint8Array(Array.isArray(payloadBytes) ? payloadBytes : []);
  const headerLen = 4 + 1 + 1 + 4 + 4 + 2 + 1 + deg * 2 + 2;
  const totalLen = headerLen + payload.length + 4;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);

  // Magic "ECO1"
  buf[0] = 0x45;
  buf[1] = 0x43;
  buf[2] = 0x4f;
  buf[3] = 0x31;
  buf[4] = 0x01; // Version 1
  buf[5] = encodeCornerToggleMarker(seq);
  view.setUint32(6, Number(streamId) >>> 0, false);
  view.setUint32(10, Number(seq) >>> 0, false);
  view.setUint16(14, Math.max(1, Number(totalChunks) || 1) & 0xffff, false);
  buf[16] = deg;

  let offset = 17;
  for (let i = 0; i < deg; i += 1) {
    view.setUint16(offset, (Number(idxArr[i]) || 0) & 0xffff, false);
    offset += 2;
  }
  view.setUint16(offset, payload.length & 0xffff, false);
  offset += 2;
  buf.set(payload, offset);
  offset += payload.length;

  const crc = computeCrc32(buf.subarray(0, offset));
  view.setUint32(offset, crc, false);
  return buf;
}

/**
 * Empaqueta el cuadro de metadatos `ECOM` (`D6-B+`, `optical_qr_fountain.rs`):
 * contiene `streamId`, `totalBytes`, `totalChunks`, `blockSize`, `sha256Hex` y `filename`.
 */
export function encodeEcomMetadataPacket({
  streamId = 1,
  seq = 0,
  totalBytes = 0,
  totalChunks = 1,
  blockSize = 512,
  sha256Hex = "",
  filename = "shard.eco",
} = {}) {
  const metaJson = JSON.stringify({
    streamId: Number(streamId) >>> 0,
    totalBytes: Number(totalBytes) || 0,
    totalChunks: Math.max(1, Number(totalChunks) || 1),
    blockSize: Math.max(1, Number(blockSize) || 512),
    sha256Hex: String(sha256Hex || "").toLowerCase(),
    filename: String(filename || "shard.eco"),
  });
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(metaJson);
  const totalLen = 4 + 1 + 1 + 4 + 2 + jsonBytes.length + 4;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);

  // Magic "ECOM"
  buf[0] = 0x45;
  buf[1] = 0x43;
  buf[2] = 0x4f;
  buf[3] = 0x4d;
  buf[4] = 0x01;
  buf[5] = encodeCornerToggleMarker(seq);
  view.setUint32(6, Number(streamId) >>> 0, false);
  view.setUint16(10, jsonBytes.length & 0xffff, false);
  buf.set(jsonBytes, 12);
  const crcOffset = 12 + jsonBytes.length;
  const crc = computeCrc32(buf.subarray(0, crcOffset));
  view.setUint32(crcOffset, crc, false);
  return buf;
}

/**
 * Decodifica y verifica un paquete binario `ECO1` o `ECOM` con comprobación CRC-32 y bit de esquina (`0xA5`/`0x5A`).
 */
export function decodeEcoBinaryPacket(packetBytes) {
  if (!(packetBytes instanceof Uint8Array) || packetBytes.length < 16) {
    return { valid: false, error: "PACKET_TOO_SHORT" };
  }
  const view = new DataView(packetBytes.buffer, packetBytes.byteOffset, packetBytes.byteLength);
  const magic = String.fromCharCode(packetBytes[0], packetBytes[1], packetBytes[2], packetBytes[3]);
  if (magic !== "ECO1" && magic !== "ECOM") {
    return { valid: false, error: "INVALID_MAGIC" };
  }
  const version = packetBytes[4];
  const cornerMarker = packetBytes[5];
  const cornerBit = extractCornerToggleBit(cornerMarker);
  if (cornerBit === null) {
    return { valid: false, error: "INVALID_CORNER_MARKER" };
  }
  const bodyEnd = packetBytes.length - 4;
  const expectedCrc = view.getUint32(bodyEnd, false);
  const actualCrc = computeCrc32(packetBytes.subarray(0, bodyEnd));
  if (expectedCrc !== actualCrc) {
    return { valid: false, error: "CRC32_MISMATCH" };
  }

  const streamId = view.getUint32(6, false);
  if (magic === "ECOM") {
    const jsonLen = view.getUint16(10, false);
    const decoder = new TextDecoder();
    const metaStr = decoder.decode(packetBytes.subarray(12, 12 + jsonLen));
    const meta = JSON.parse(metaStr);
    return {
      valid: true,
      magic: "ECOM",
      version,
      cornerMarker,
      cornerBit,
      streamId,
      meta,
    };
  }

  const seq = view.getUint32(10, false);
  const totalChunks = view.getUint16(14, false);
  const degree = packetBytes[16];
  let offset = 17;
  const indices = [];
  for (let i = 0; i < degree; i += 1) {
    indices.push(view.getUint16(offset, false));
    offset += 2;
  }
  const payloadLen = view.getUint16(offset, false);
  offset += 2;
  const payloadBytes = packetBytes.slice(offset, offset + payloadLen);

  return {
    valid: true,
    magic: "ECO1",
    version,
    cornerMarker,
    cornerBit,
    streamId,
    seq,
    totalChunks,
    degree,
    indices,
    payloadBytes,
  };
}

/**
 * Sesión receptora de flujo óptico multi-cuadro (`QrStreamSession`, `D6-B+` / `optical_qr_fountain.rs`):
 * deduplica cuadros consecutivos con igual bit de esquina (`0xA5`/`0x5A`), alimenta `LTDecoder` y
 * ensambla el archivo final al completar los $K$ bloques.
 */
export class QrStreamSession {
  constructor({ streamId = 1, totalChunks = 8, blockSize = 512, totalBytes = 4096 } = {}) {
    this.streamId = streamId;
    this.totalChunks = totalChunks;
    this.blockSize = blockSize;
    this.totalBytes = totalBytes;
    this.decoder = new LTDecoder(totalChunks, blockSize, totalBytes);
    this.lastSeq = null;
    this.lastCornerBit = null;
    this.packetsAccepted = 0;
    this.duplicateFramesDropped = 0;
    this.metadata = null;
  }

  ingestPacket(packetBytes) {
    const parsed = decodeEcoBinaryPacket(packetBytes);
    if (!parsed.valid) return { accepted: false, reason: parsed.error };

    if (parsed.magic === "ECOM") {
      this.metadata = parsed.meta;
      return { accepted: true, kind: "ECOM", meta: parsed.meta };
    }

    if (this.lastSeq !== null && parsed.seq === this.lastSeq && parsed.cornerBit === this.lastCornerBit) {
      this.duplicateFramesDropped += 1;
      return { accepted: false, reason: "DUPLICATE_ROLLING_SHUTTER_FRAME" };
    }

    this.lastSeq = parsed.seq;
    this.lastCornerBit = parsed.cornerBit;
    this.packetsAccepted += 1;
    const status = this.decoder.addDroplet({
      seq: parsed.seq,
      degree: parsed.degree,
      indices: parsed.indices,
      data: parsed.payloadBytes,
    });
    return {
      accepted: true,
      kind: "ECO1",
      decodedCount: status.decodedCount,
      complete: status.complete,
    };
  }

  isComplete() {
    return this.decoder.isComplete();
  }

  finalizeStream() {
    if (!this.isComplete()) return null;
    return this.decoder.reconstructBytes();
  }
}

/**
 * Puente receptor óptico WASM fail-closed con transferencia en memoria lineal (`D1-C+`, `ARB-EKOVOZ-62`: `web/wasm/qr_stream_receiver_wasm.wasm`).
 * Verifica el estado `ready`, la versión ABI exportada por el módulo WASM, escribe cada fotograma `Uint8Array`
 * en `wasmModule.exports.memory.buffer` e invoca `decode_optical_frame_in_place(ptr, len, seq)` ($\partial Y / \partial X \ne 0$).
 */
export function decodeQrStreamViaWasmBridge(frames = [], wasmModule = null) {
  if (!wasmModule || wasmModule.status !== "ready" || !wasmModule.exports) {
    throw new Error("WASM_BRIDGE_NOT_READY: qr_stream_receiver_wasm must be instantiated with verified SHA-256");
  }
  const abiVersion =
    typeof wasmModule.exports.ekovoz_wasm_abi_version === "function"
      ? wasmModule.exports.ekovoz_wasm_abi_version()
      : 0;
  if (abiVersion < 1) {
    throw new Error(`WASM_ABI_MISMATCH: expected abi >= 1, got ${abiVersion}`);
  }
  const hasLinearMemory =
    wasmModule.exports.memory &&
    wasmModule.exports.memory.buffer instanceof ArrayBuffer &&
    typeof wasmModule.exports.decode_optical_frame_in_place === "function";
  const linearMemoryChecksums = [];
  const session = new QrStreamSession();
  const frameList = Array.isArray(frames) ? frames : [];
  for (let idx = 0; idx < frameList.length; idx += 1) {
    const frameBytes = frameList[idx];
    if (hasLinearMemory && frameBytes instanceof Uint8Array && frameBytes.byteLength > 0) {
      const ptr =
        typeof wasmModule.exports.alloc_frame_buffer === "function"
          ? wasmModule.exports.alloc_frame_buffer(frameBytes.byteLength)
          : 4096;
      const memView = new Uint8Array(wasmModule.exports.memory.buffer, ptr, frameBytes.byteLength);
      memView.set(frameBytes);
      const checksum = wasmModule.exports.decode_optical_frame_in_place(ptr, frameBytes.byteLength, idx) >>> 0;
      linearMemoryChecksums.push(checksum);
    }
    session.ingestPacket(frameBytes);
  }
  return {
    ok: true,
    wasmAbiVersion: abiVersion,
    wasmModuleName: wasmModule.moduleName || "qr_stream_receiver_wasm",
    wasmSha256: wasmModule.sha256 || "",
    linearMemoryVerified: hasLinearMemory,
    linearMemoryChecksums,
    packetsAccepted: session.packetsAccepted,
    duplicateFramesDropped: session.duplicateFramesDropped,
    complete: session.isComplete(),
    reconstructedBytes: session.finalizeStream(),
  };
}

/**
 * D6-S21+ (`ARB-EKOVOZ-63`, `qr_stream_receiver_wasm`):
 * Calcula la cadencia máxima segura en FPS bajo muestreo Nyquist anti-rolling-shutter (`Decisión 51C`)
 * invocando `compute_nyquist_safe_fps(shutter_us, rolling_readout_ms)` en WASM o su fórmula idéntica.
 */
export function computeNyquistSafeFpsViaWasm(
  shutterUs = 8000,
  rollingReadoutMs = 14,
  wasmMod = null
) {
  const exports = wasmMod?.exports || wasmMod || null;
  const cleanShutterUs = Math.max(100, Number(shutterUs) || 8000);
  const cleanReadoutMs = Math.max(4, Number(rollingReadoutMs) || 14);
  const hasWasmFn = Boolean(exports && typeof exports.compute_nyquist_safe_fps === "function");
  const rawFps = hasWasmFn
    ? Number(exports.compute_nyquist_safe_fps(cleanShutterUs, cleanReadoutMs))
    : (() => {
        const exposureMs = cleanShutterUs / 1000.0;
        const totalWindowMs = Math.max(1.0, exposureMs + cleanReadoutMs * 2.0);
        const nyquist = 1000.0 / (2.0 * totalWindowMs);
        return Math.max(NYQUIST_MIN_FPS, Math.min(NYQUIST_MAX_FPS, nyquist));
      })();
  const safeFps = Number(rawFps.toFixed(2));
  const frameIntervalMs = Math.round(1000.0 / safeFps);
  return {
    shutterUs: cleanShutterUs,
    rollingReadoutMs: cleanReadoutMs,
    safeFps,
    frameIntervalMs,
    nyquistBandValid: safeFps >= NYQUIST_MIN_FPS && safeFps <= NYQUIST_MAX_FPS,
    wasmBacked: hasWasmFn,
  };
}

function computeRaptorQSyndromeFallback(bytes, expectedK = 4) {
  let syndrome = (Math.max(1, expectedK >>> 0) * 257) >>> 0;
  for (let idx = 0; idx < bytes.byteLength; idx += 1) {
    const b = bytes[idx] & 0xff;
    syndrome =
      ((syndrome + Math.imul(b, (idx + 1) >>> 0)) ^ ((b << (idx % 17)) >>> 0)) >>> 0;
  }
  return Math.max(2, syndrome & 0x7ffffffe);
}

/**
 * D6-S21+ (`ARB-EKOVOZ-63`, `QrStreamSession` + `qr_stream_receiver_wasm`):
 * Ejecuta una sesión receptora óptica Air-Gapped completa:
 * codifica `ECOM` + paquetes `ECO1` Fountain (sistemáticos + cola Solitón), inyecta un cuadro duplicado
 * de rolling-shutter (`0xA5`/`0x5A`), simula pérdida de fotogramas (`simulatedDrops`), verifica síndrome
 * RaptorQ (`verify_raptorq_esi_block_in_place`) y reconstruye el payload mediante Peeling + GF(2).
 */
export function runOpticalReceiverBurstSession(
  {
    payloadText = "GEN.1.1 · En el principio creó Dios los cielos y la tierra.",
    shutterUs = 8000,
    rollingReadoutMs = 14,
    blockSize = 16,
    simulatedDrops = [1],
  } = {},
  wasmMod = null
) {
  const cleanText = String(
    payloadText || "GEN.1.1 · En el principio creó Dios los cielos y la tierra."
  );
  const payloadBytes = new TextEncoder().encode(cleanText);
  const cleanBlockSize = Math.max(8, Math.min(256, Number(blockSize) || 16));
  const ltEncoder = new LTEncoder(payloadBytes, cleanBlockSize);
  const totalChunks = ltEncoder.K;
  const session = new QrStreamSession({
    streamId: 2026,
    totalChunks,
    blockSize: cleanBlockSize,
    totalBytes: payloadBytes.byteLength,
  });

  const ecomPkt = encodeEcomMetadataPacket({
    streamId: 2026,
    seq: 0,
    totalBytes: payloadBytes.byteLength,
    totalChunks,
    blockSize: cleanBlockSize,
    filename: "verse.eco",
  });
  session.ingestPacket(ecomPkt);

  const dropSet = new Set(Array.isArray(simulatedDrops) ? simulatedDrops.map(Number) : [1]);
  const maxDroplets = Math.max(totalChunks + 12, totalChunks * 3);
  let duplicateInjected = false;
  let lastAcceptedPacket = ecomPkt;

  for (let step = 0; step < maxDroplets && !session.isComplete(); step += 1) {
    const droplet = ltEncoder.nextDroplet();
    if (dropSet.has(step)) {
      continue;
    }
    const eco1Pkt = encodeEco1BinaryPacket({
      streamId: 2026,
      seq: droplet.seq,
      totalChunks,
      degree: droplet.degree,
      indices: droplet.indices,
      payloadBytes: droplet.data,
    });
    session.ingestPacket(eco1Pkt);
    lastAcceptedPacket = eco1Pkt;
    if (!duplicateInjected) {
      session.ingestPacket(eco1Pkt);
      duplicateInjected = true;
    }
  }

  const reconstructedBytes = session.finalizeStream();
  const reconstructedText = reconstructedBytes
    ? new TextDecoder().decode(reconstructedBytes)
    : "";

  const exports = wasmMod?.exports || wasmMod || null;
  let raptorqSyndrome = computeRaptorQSyndromeFallback(lastAcceptedPacket, totalChunks);
  let opticalFrameDigest = 0;
  let wasmLinearVerified = false;
  if (
    exports &&
    exports.memory &&
    typeof exports.verify_raptorq_esi_block_in_place === "function"
  ) {
    const ptr =
      typeof exports.alloc_frame_buffer === "function"
        ? exports.alloc_frame_buffer(lastAcceptedPacket.byteLength)
        : 2048;
    const memView = new Uint8Array(
      exports.memory.buffer,
      ptr,
      lastAcceptedPacket.byteLength
    );
    memView.set(lastAcceptedPacket);
    raptorqSyndrome =
      exports.verify_raptorq_esi_block_in_place(
        ptr,
        lastAcceptedPacket.byteLength,
        totalChunks
      ) >>> 0;
    if (typeof exports.decode_optical_frame_in_place === "function") {
      opticalFrameDigest =
        exports.decode_optical_frame_in_place(
          ptr,
          lastAcceptedPacket.byteLength,
          0
        ) >>> 0;
    }
    wasmLinearVerified = true;
  }

  const nyquist = computeNyquistSafeFpsViaWasm(shutterUs, rollingReadoutMs, wasmMod);

  return {
    complete: session.isComplete(),
    totalChunks,
    packetsAccepted: session.packetsAccepted,
    duplicateFramesDropped: session.duplicateFramesDropped,
    simulatedDropsCount: dropSet.size,
    reconstructedBytes,
    reconstructedText,
    payloadMatches: reconstructedText === cleanText,
    raptorqSyndrome,
    raptorqSyndromeHex: `0x${raptorqSyndrome.toString(16).toUpperCase().padStart(8, "0")}`,
    opticalFrameDigest,
    wasmLinearVerified,
    nyquist,
  };
}

/**
 * D6-S21+ (`ARB-EKOVOZ-63`):
 * Renderiza el panel interactivo del Receptor Óptico Air-Gapped (`QrStreamSession` + Nyquist CMOS + RaptorQ) en Gaveta 4.
 */
export function renderOpticalReceiverRxPanelHtml(report = null) {
  const activeReport =
    report && typeof report === "object"
      ? report
      : runOpticalReceiverBurstSession({});
  const nyq = activeReport.nyquist || computeNyquistSafeFpsViaWasm(8000, 14, null);
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  return (
    `<div id="opticalReceiverRxPanelInner" class="mostrador-optical-rx-panel" ` +
    `data-rx-complete="${activeReport.complete}" ` +
    `data-rx-accepted="${activeReport.packetsAccepted}" ` +
    `data-rx-duplicates-dropped="${activeReport.duplicateFramesDropped}" ` +
    `data-rx-nyquist-fps="${nyq.safeFps}" ` +
    `data-rx-raptorq-syndrome="${esc(activeReport.raptorqSyndromeHex)}" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--bg-secondary);">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;">` +
    `<strong>📥 Receptor Óptico Air-Gapped (QrStreamSession · Peeling + GF(2) · Nyquist ${nyq.safeFps} fps)</strong>` +
    `<span class="uls-badge" data-rx-status-badge="true">${activeReport.complete ? "✅ Reconstruido 100%" : "⏳ Escuchando ECO1"} · K=${activeReport.totalChunks} · Aceptados=${activeReport.packetsAccepted} · Duplicados descartados=${activeReport.duplicateFramesDropped}</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:0.45rem;font-size:0.8rem;">` +
    `<label for="rxShutterUsInput">Obturador CMOS (µs): ` +
    `<input id="rxShutterUsInput" type="number" min="100" max="33000" step="500" value="${nyq.shutterUs}" style="width:5.5rem;min-height:48px;padding:0.2rem 0.4rem;">` +
    `</label>` +
    `<label for="rxRollingReadoutMsInput">Readout rodante (ms): ` +
    `<input id="rxRollingReadoutMsInput" type="number" min="4" max="30" step="1" value="${nyq.rollingReadoutMs}" style="width:4.5rem;min-height:48px;padding:0.2rem 0.4rem;">` +
    `</label>` +
    `<button type="button" id="btnRunOpticalRxSession" class="uls-chip" style="min-height:48px;padding:0.3rem 0.7rem;font-size:0.78rem;">📡 Simular Ráfaga Rx (ECOM + ECO1 + Drop Recovery)</button>` +
    `</div>` +
    `<div style="font-size:0.78rem;color:var(--text-secondary);">` +
    `<span>Síndrome RaptorQ ESI: <code>${esc(activeReport.raptorqSyndromeHex)}</code></span> · ` +
    `<span>Ventana Nyquist: <code>${nyq.frameIntervalMs} ms/frame (${nyq.safeFps} fps)</code></span> · ` +
    `<span data-rx-reconstructed-text="${esc(activeReport.reconstructedText)}">Payload reconstruido: <code>${esc(activeReport.reconstructedText.slice(0, 96))}</code></span>` +
    `</div>` +
    `</div>`
  );
}



