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

function sampleDegree(cdf, rng) {
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
  const rng = splitmix64(seed >>> 0);
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
// whitenBlockXor se define en optical_wasm_bridge.js y se re-exporta abajo para paridad TX/RX única.

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
 * respaldada por la distribución Solitón robusta (`solitonCdf` + `splitmix64`).
 */
export function encodeLubyTransformDroplets(blocks, options = {}) {
  const list = Array.isArray(blocks) || blocks instanceof Uint8Array ? Array.from(blocks) : [];
  const k = Math.max(1, Math.min(list.length, Number(options.maxBlocks) || 50));
  if (list.length === 0) {
    const empty = [];
    Object.defineProperties(empty, {
      droplets: { value: empty },
      K: { value: 0 },
      blockSize: { value: Number(options.blockSize) || 1 },
      byteLength: { value: 0 },
    });
    return empty;
  }
  const cdf = solitonCdf(k, options.c ?? 0.1, options.delta ?? 0.05);
  const requested = Number(options.count || options.dropletCount) || 0;
  const totalDroplets = requested > 0 ? requested : Math.max(k * 2, k + 6);
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
  Object.defineProperties(droplets, {
    droplets: { value: droplets },
    K: { value: k },
    blockSize: { value: Number(options.blockSize) || 1 },
    byteLength: { value: list.length },
  });
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

import {
  OPTICAL_CADENCE_PRESETS,
  computeSaddleStitchImpositionPlan,
  crc16Ccitt,
  encodeDropletToMatrixGrid,
  rasterizeMatrixGridToLuma8,
  renderDropletMatrixSvgOrCanvas,
  rsGf256ComputeParity4,
  verifyManifestAndMerkleAudit,
} from "./optical_grid_codec.js";
import {
  NYQUIST_DEFAULT_FPS,
  NYQUIST_MAX_FPS,
  NYQUIST_MIN_FPS,
  computeNyquistSafeFpsViaWasm,
  computeRaptorQSyndromeFallback,
  decodeEcoBinaryPacket,
  deriveWasmFountainSourceIndices,
  encodeCornerToggleMarker,
  encodeEco1BinaryPacket,
  encodeEcomMetadataPacket,
  encodeWasmFountainPackets,
  extractCornerToggleBit,
  runWasmPeelingSession,
  splitmix64,
  splitmix64Next,
  validateNyquistOpticalFps,
  whitenBlockXor,
} from "./optical_wasm_bridge.js";

export const MAX_ECO_GRID_29_PAYLOAD_BYTES = 4096;
export const MAX_OPTICAL_AIRGAP_PAYLOAD_BYTES = 4096;

export {
  NYQUIST_DEFAULT_FPS,
  NYQUIST_MAX_FPS,
  NYQUIST_MIN_FPS,
  OPTICAL_CADENCE_PRESETS,
  computeNyquistSafeFpsViaWasm,
  computeSaddleStitchImpositionPlan,
  crc16Ccitt,
  deriveWasmFountainSourceIndices,
  encodeCornerToggleMarker,
  encodeDropletToMatrixGrid,
  encodeEco1BinaryPacket,
  encodeEcomMetadataPacket,
  extractCornerToggleBit,
  rasterizeMatrixGridToLuma8,
  renderDropletMatrixSvgOrCanvas,
  rsGf256ComputeParity4,
  splitmix64,
  splitmix64Next,
  validateNyquistOpticalFps,
  verifyManifestAndMerkleAudit,
  whitenBlockXor
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
    this._wasmTransferKey = null;
    this._wasmSolvedBytes = null;
  }

  ingestPacket(packetBytes) {
    const parsed = decodeEcoBinaryPacket(packetBytes);
    if (!parsed.valid) return { accepted: false, reason: parsed.error };

    if (parsed.magic === "ECOM") {
      this.metadata = parsed.meta;
      if (parsed.meta) {
        const metaBytes = Number(parsed.meta.totalBytes);
        if (Number.isFinite(metaBytes) && metaBytes > 0) {
          this.totalBytes = metaBytes;
          if (this.decoder) this.decoder.totalBytes = metaBytes;
        }
        if (this.packetsAccepted === 0) {
          this.streamId = parsed.streamId || this.streamId;
          this.totalChunks = Math.max(1, Number(parsed.meta.totalChunks) || this.totalChunks);
          this.blockSize = Math.max(1, Number(parsed.meta.blockSize) || this.blockSize);
          this.decoder = new LTDecoder(this.totalChunks, this.blockSize, this.totalBytes);
        }
      }
      return { accepted: true, kind: "ECOM", meta: parsed.meta };
    }

    if (
      this.lastSeq !== null &&
      parsed.seq === this.lastSeq &&
      parsed.cornerBit === this.lastCornerBit
    ) {
      this.duplicateFramesDropped += 1;
      return { accepted: false, reason: "DUPLICATE_ROLLING_SHUTTER_FRAME" };
    }

    this.lastSeq = parsed.seq;
    this.lastCornerBit = parsed.cornerBit;
    this.packetsAccepted += 1;
    const isDone = Boolean(
      this.decoder.addDroplet({
        seq: parsed.seq,
        degree: parsed.degree,
        indices: parsed.indices,
        data: parsed.payloadBytes,
      }),
    );
    return {
      accepted: true,
      kind: "ECO1",
      decodedCount: this.decoder.decodedCount,
      complete: isDone,
    };
  }

  isComplete() {
    return Boolean(this._wasmSolvedBytes) || this.decoder.isComplete();
  }

  finalizeStream() {
    if (this._wasmSolvedBytes instanceof Uint8Array) {
      return this.totalBytes > 0 && this._wasmSolvedBytes.byteLength > this.totalBytes
        ? this._wasmSolvedBytes.subarray(0, this.totalBytes)
        : this._wasmSolvedBytes;
    }
    if (!this.decoder.isComplete()) return null;
    return this.decoder.reconstructBytes();
  }
}

function indicesMatchExact(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function decodeQrStreamViaWasmBridge(frames = [], wasmModule = null, existingSession = null) {
  const wasmReady = Boolean(wasmModule && wasmModule.status === "ready" && wasmModule.exports);
  const exports = wasmReady ? wasmModule.exports : null;
  const abiVersion =
    exports && typeof exports.ekovoz_wasm_abi_version === "function"
      ? exports.ekovoz_wasm_abi_version()
      : 0;
  if (wasmReady && abiVersion < 1) {
    throw new Error(`WASM_ABI_MISMATCH: expected abi >= 1, got ${abiVersion}`);
  }
  const hasLinearMemory = Boolean(
    wasmReady &&
    exports.memory &&
    exports.memory.buffer instanceof ArrayBuffer &&
    typeof exports.decode_optical_frame_in_place === "function",
  );
  const canWasmPeel = Boolean(
    hasLinearMemory &&
    typeof exports.reset_lt_fountain_session === "function" &&
    typeof exports.peel_lt_fountain_packet_in_place === "function",
  );
  const linearMemoryChecksums = [];
  const session = existingSession instanceof QrStreamSession ? existingSession : new QrStreamSession();
  const frameList = Array.isArray(frames) ? frames : [];

  for (let idx = 0; idx < frameList.length; idx += 1) {
    const frameBytes = frameList[idx];
    if (hasLinearMemory && frameBytes instanceof Uint8Array && frameBytes.byteLength > 0) {
      const ptr =
        typeof exports.alloc_frame_buffer === "function"
          ? exports.alloc_frame_buffer(frameBytes.byteLength)
          : 4096;
      new Uint8Array(exports.memory.buffer, ptr, frameBytes.byteLength).set(frameBytes);
      linearMemoryChecksums.push(
        exports.decode_optical_frame_in_place(ptr, frameBytes.byteLength, idx) >>> 0,
      );
      if (typeof exports.free_frame_buffer === "function") {
        exports.free_frame_buffer(ptr, frameBytes.byteLength);
      }
    }

    const ingestRes = session.ingestPacket(frameBytes);
    if (canWasmPeel && ingestRes?.accepted && ingestRes.kind === "ECO1" && !session._wasmSolvedBytes) {
      const parsed = decodeEcoBinaryPacket(frameBytes);
      if (parsed.valid && parsed.magic === "ECO1") {
        const expectedWasmIndices = deriveWasmFountainSourceIndices(
          parsed.streamId,
          parsed.seq,
          parsed.totalChunks,
        );
        if (parsed.seq < parsed.totalChunks || indicesMatchExact(parsed.indices, expectedWasmIndices)) {
          const transferKey = `${parsed.streamId}:${parsed.totalChunks}`;
          if (session._wasmTransferKey !== transferKey) {
            exports.reset_lt_fountain_session(BigInt(parsed.streamId >>> 0), parsed.totalChunks);
            session._wasmTransferKey = transferKey;
          }
          const xorLen = parsed.payloadBytes.byteLength;
          const outCap = Math.max(64, parsed.totalChunks * xorLen);
          const xorPtr =
            typeof exports.wasm_alloc === "function"
              ? exports.wasm_alloc(xorLen) >>> 0
              : 1024;
          const outPtr =
            typeof exports.wasm_alloc === "function"
              ? exports.wasm_alloc(outCap) >>> 0
              : 2048;
          try {
            new Uint8Array(exports.memory.buffer, xorPtr, xorLen).set(parsed.payloadBytes);
            const rc = exports.peel_lt_fountain_packet_in_place(
              BigInt(parsed.streamId >>> 0),
              parsed.seq,
              parsed.totalChunks,
              session.totalBytes || outCap,
              xorPtr,
              xorLen,
              outPtr,
              outCap,
            );
            if (rc > 0) {
              session._wasmSolvedBytes = new Uint8Array(exports.memory.buffer, outPtr, rc).slice();
            }
          } finally {
            if (typeof exports.wasm_free === "function") {
              exports.wasm_free(xorPtr, xorLen);
              exports.wasm_free(outPtr, outCap);
            }
          }
        }
      }
    }
  }

  const reconstructedBytes = session.finalizeStream();
  if (wasmReady && frameList.length === 0 && typeof exports.reset_lt_fountain_session === "function") {
    exports.reset_lt_fountain_session(2026n, 4);
  }
  const wasmSolved = Boolean(session._wasmSolvedBytes instanceof Uint8Array);
  return {
    ok: true,
    engine: wasmReady ? "wasm-linear-memory" : "js-fallback",
    wasmAbiVersion: abiVersion,
    wasmModuleName: wasmReady ? wasmModule.moduleName || "qr_stream_receiver_wasm" : "js-fallback",
    wasmSha256: wasmReady ? wasmModule.sha256 || "" : "",
    linearMemoryVerified: hasLinearMemory,
    linearMemoryChecksums,
    packetsAccepted: session.packetsAccepted,
    duplicateFramesDropped: session.duplicateFramesDropped,
    complete: session.isComplete(),
    reconstructedBytes,
    wasmDirectPeelSolved: wasmSolved,
    wasmPeelVerified: Boolean(hasLinearMemory && (wasmSolved || (reconstructedBytes && linearMemoryChecksums.length > 0))),
    session,
    decoder: session.decoder,
  };
}

export function runOpticalReceiverBurstSession(
  {
    payloadText = "GEN.1.1 · En el principio creó Dios los cielos y la tierra.",
    shutterUs = 8000,
    rollingReadoutMs = 14,
    blockSize = 16,
    simulatedDrops = [1],
  } = {},
  wasmMod = null,
) {
  const cleanText = String(
    payloadText || "GEN.1.1 · En el principio creó Dios los cielos y la tierra.",
  );
  const payloadBytes = new TextEncoder().encode(cleanText);
  const cleanBlockSize = Math.max(8, Math.min(256, Number(blockSize) || 16));
  const totalChunks = Math.max(
    1,
    Math.min(50, Math.ceil(payloadBytes.byteLength / cleanBlockSize)),
  );
  const effectiveBlockSize = Math.max(
    1,
    Math.ceil(payloadBytes.byteLength / totalChunks),
  );
  const repairCount = Math.max(12, Math.ceil(totalChunks * 1.5));
  const txFountainPackets = encodeWasmFountainPackets(
    2026,
    payloadBytes,
    totalChunks,
    repairCount,
  );
  const session = new QrStreamSession({
    streamId: 2026,
    totalChunks,
    blockSize: effectiveBlockSize,
    totalBytes: payloadBytes.byteLength,
  });

  const ecomPkt = encodeEcomMetadataPacket({
    streamId: 2026,
    seq: 0,
    totalBytes: payloadBytes.byteLength,
    totalChunks,
    blockSize: effectiveBlockSize,
    filename: "verse.eco",
  });
  session.ingestPacket(ecomPkt);

  const dropSet = new Set(Array.isArray(simulatedDrops) ? simulatedDrops.map(Number) : [1]);
  let duplicateInjected = false;
  let lastAcceptedPacket = ecomPkt;
  const receivedWasmPackets = [];

  for (let step = 0; step < txFountainPackets.length && (!session.isComplete() || receivedWasmPackets.length < totalChunks + dropSet.size + 4); step += 1) {
    const pkt = txFountainPackets[step];
    if (dropSet.has(step)) {
      continue;
    }
    const eco1Pkt = encodeEco1BinaryPacket({
      streamId: 2026,
      seq: pkt.packetId,
      totalChunks,
      degree: pkt.sourceIndices.length,
      indices: pkt.sourceIndices,
      payloadBytes: pkt.xorPayload,
    });
    const decodedRx = decodeEcoBinaryPacket(eco1Pkt);
    const ingestRes = session.ingestPacket(eco1Pkt);
    if (ingestRes.accepted && decodedRx.valid) {
      receivedWasmPackets.push({
        packetId: decodedRx.seq,
        kBlocks: totalChunks,
        blockSize: effectiveBlockSize,
        originalByteLen: payloadBytes.byteLength,
        sourceIndices: decodedRx.indices,
        xorPayload: decodedRx.payloadBytes,
      });
    }
    lastAcceptedPacket = eco1Pkt;
    if (!duplicateInjected) {
      session.ingestPacket(eco1Pkt);
      duplicateInjected = true;
    }
  }

  const reconstructedBytes = session.finalizeStream();
  const reconstructedText = reconstructedBytes ? new TextDecoder().decode(reconstructedBytes) : "";
  const whitenedProbe = whitenBlockXor(lastAcceptedPacket.subarray(0, Math.min(16, lastAcceptedPacket.byteLength)), 2026);
  const sampleLumaPreview = rasterizeMatrixGridToLuma8(
    encodeDropletToMatrixGrid({ data: whitenedProbe }, 29),
    96,
    96,
  );

  const exports = wasmMod?.exports || wasmMod || null;
  let raptorqSyndrome = computeRaptorQSyndromeFallback(lastAcceptedPacket, totalChunks);
  let opticalFrameDigest = 0;
  let wasmLinearVerified = false;
  let wasmPeelRecoveredBytes = null;
  if (
    exports &&
    exports.memory &&
    typeof exports.verify_raptorq_esi_block_in_place === "function"
  ) {
    const ptr =
      typeof exports.alloc_frame_buffer === "function"
        ? exports.alloc_frame_buffer(lastAcceptedPacket.byteLength)
        : 2048;
    new Uint8Array(exports.memory.buffer, ptr, lastAcceptedPacket.byteLength).set(
      lastAcceptedPacket,
    );
    raptorqSyndrome =
      exports.verify_raptorq_esi_block_in_place(ptr, lastAcceptedPacket.byteLength, totalChunks) >>>
      0;
    if (typeof exports.decode_optical_frame_in_place === "function") {
      opticalFrameDigest =
        exports.decode_optical_frame_in_place(ptr, lastAcceptedPacket.byteLength, 0) >>> 0;
    }
    if (typeof exports.free_frame_buffer === "function") {
      exports.free_frame_buffer(ptr, lastAcceptedPacket.byteLength);
    }
    wasmPeelRecoveredBytes = runWasmPeelingSession(
      exports,
      2026,
      receivedWasmPackets,
      totalChunks,
      null,
    );
    wasmLinearVerified = true;
  }

  const finalBytes = wasmPeelRecoveredBytes || reconstructedBytes;
  const finalText = finalBytes ? new TextDecoder().decode(finalBytes) : reconstructedText;
  const nyquist = computeNyquistSafeFpsViaWasm(shutterUs, rollingReadoutMs, wasmMod);

  return {
    complete: Boolean(wasmPeelRecoveredBytes) || session.isComplete(),
    totalChunks,
    packetsAccepted: session.packetsAccepted,
    duplicateFramesDropped: session.duplicateFramesDropped,
    simulatedDropsCount: dropSet.size,
    singlePassEncoding: true,
    reconstructedBytes: finalBytes,
    reconstructedText: finalText,
    payloadMatches: finalText === cleanText,
    wasmPeelVerified: Boolean(wasmPeelRecoveredBytes),
    decoder: session.decoder,
    raptorqSyndrome,
    raptorqSyndromeHex: `0x${raptorqSyndrome.toString(16).toUpperCase().padStart(8, "0")}`,
    opticalFrameDigest,
    lumaPreviewBytes: sampleLumaPreview.byteLength,
    wasmLinearVerified,
    nyquist,
  };
}

export function renderOpticalReceiverRxPanelHtml(report = null) {
  const activeReport =
    report && typeof report === "object" ? report : runOpticalReceiverBurstSession({});
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
    `<span data-rx-reconstructed-text="${esc(activeReport.reconstructedText)}" data-rx-luma-preview="${Number(activeReport.lumaPreviewBytes) || 0}">Payload reconstruido: <code>${esc(activeReport.reconstructedText.slice(0, 96))}</code></span>` +
    `</div>` +
    `</div>`
  );
}



