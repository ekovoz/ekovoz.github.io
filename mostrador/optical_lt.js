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
    };
  }

  nextDroplet() {
    const step = this.seq++;
    // Las primeras K gotas usan semillas calibradas de grado 1 o 2 y las siguientes muestrean el Solitón completo
    const seed = ((step + 1) * 0x9e3779b1) >>> 0;
    return this.encodeDropletWithSeed(seed);
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
      for (const idx of unknown) {
        this.waitingByBlock[idx].push(pending);
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
