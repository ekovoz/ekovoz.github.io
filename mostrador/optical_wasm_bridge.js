/**
 * Puente binario WASM y protocolo de tramas `ECO1`/`ECOM` (`C8` extraída de `optical_lt.js`, `∂(C) = 0`,
 * `SLICE-EKO-V2H-02`, `D5-V2H = 5B+`, `ARB-EKOVOZ-99`).
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
 * Blanqueo/desblanqueo XOR determinista Xorshift32 (idempotente para equilibrar módulos `29×29`).
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

function eco1WhiteningSeed(streamId, seq) {
  return ((Number(streamId) >>> 0) ^ (Number(seq) >>> 0) ^ 0x9e3779b1) >>> 0;
}

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
  const rawPayload =
    payloadBytes instanceof Uint8Array
      ? payloadBytes
      : new Uint8Array(Array.isArray(payloadBytes) ? payloadBytes : []);
  const payload = whitenBlockXor(rawPayload, eco1WhiteningSeed(streamId, seq));
  const totalLen = 19 + deg * 2 + payload.length + 4;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);
  buf.set([0x45, 0x43, 0x4f, 0x31, 0x01, encodeCornerToggleMarker(seq)]);
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
  view.setUint32(offset, computeCrc32(buf.subarray(0, offset)), false);
  return buf;
}

export function encodeEcomMetadataPacket({
  streamId = 1,
  seq = 0,
  totalBytes = 0,
  totalChunks = 1,
  blockSize = 512,
  sha256Hex = "",
  filename = "shard.eco",
  compact = false,
} = {}) {
  const cleanSha = String(sha256Hex || "").toLowerCase();
  const payloadObj = compact
    ? {
      n: Number(totalBytes) || 0,
      k: Math.max(1, Number(totalChunks) || 1),
      b: Math.max(1, Number(blockSize) || 512),
      ...(cleanSha ? { h: cleanSha.slice(0, 8) } : {}),
    }
    : {
      streamId: Number(streamId) >>> 0,
      totalBytes: Number(totalBytes) || 0,
      totalChunks: Math.max(1, Number(totalChunks) || 1),
      blockSize: Math.max(1, Number(blockSize) || 512),
      sha256Hex: cleanSha,
      filename: String(filename || "shard.eco"),
    };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const buf = new Uint8Array(16 + jsonBytes.length);
  const view = new DataView(buf.buffer);
  buf.set([0x45, 0x43, 0x4f, 0x4d, 0x01, encodeCornerToggleMarker(seq)]);
  view.setUint32(6, Number(streamId) >>> 0, false);
  view.setUint16(10, jsonBytes.length & 0xffff, false);
  buf.set(jsonBytes, 12);
  const crcOffset = 12 + jsonBytes.length;
  view.setUint32(crcOffset, computeCrc32(buf.subarray(0, crcOffset)), false);
  return buf;
}

export function decodeEcoBinaryPacket(packetBytes) {
  if (!(packetBytes instanceof Uint8Array) || packetBytes.length < 16) {
    return { valid: false, error: "PACKET_TOO_SHORT" };
  }
  const view = new DataView(packetBytes.buffer, packetBytes.byteOffset, packetBytes.byteLength);
  const magic = String.fromCharCode(
    packetBytes[0],
    packetBytes[1],
    packetBytes[2],
    packetBytes[3],
  );
  if (magic !== "ECO1" && magic !== "ECOM") return { valid: false, error: "INVALID_MAGIC" };
  const version = packetBytes[4];
  const cornerMarker = packetBytes[5];
  const cornerBit = extractCornerToggleBit(cornerMarker);
  if (cornerBit === null) return { valid: false, error: "INVALID_CORNER_MARKER" };
  const bodyEnd = packetBytes.length - 4;
  if (view.getUint32(bodyEnd, false) !== computeCrc32(packetBytes.subarray(0, bodyEnd))) {
    return { valid: false, error: "CRC32_MISMATCH" };
  }
  const streamId = view.getUint32(6, false);
  if (magic === "ECOM") {
    const jsonLen = view.getUint16(10, false);
    const rawMeta = JSON.parse(new TextDecoder().decode(packetBytes.subarray(12, 12 + jsonLen)));
    const meta =
      rawMeta && rawMeta.n !== undefined
        ? {
          streamId,
          totalBytes: Number(rawMeta.n) || 0,
          totalChunks: Math.max(1, Number(rawMeta.k) || 1),
          blockSize: Math.max(1, Number(rawMeta.b) || 12),
          sha256Hex: String(rawMeta.h || ""),
          filename: String(rawMeta.f || "shard.eco"),
        }
        : rawMeta;
    return { valid: true, magic: "ECOM", version, cornerMarker, cornerBit, streamId, meta };
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
  const whitenedPayload = packetBytes.slice(offset, offset + payloadLen);
  const payloadBytes = whitenBlockXor(whitenedPayload, eco1WhiteningSeed(streamId, seq));

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

const U64_MASK = 0xffffffffffffffffn;
export function splitmix64Next(box) {
  box.s = (box.s + 0x9e3779b97f4a7c15n) & U64_MASK;
  let z = box.s;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & U64_MASK;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & U64_MASK;
  return (z ^ (z >> 31n)) & U64_MASK;
}

/** PRNG determinista `splitmix64` de `64` bits bit-a-bit compatible con `qr_stream_receiver_wasm`. */
export function splitmix64(seed = 0) {
  const box = { s: BigInt.asUintN(64, BigInt(Math.trunc(Number(seed) || 0))) };
  return function nextRandom() {
    const z = splitmix64Next(box);
    return Number((z >> 12n) & 0xfffffffffffffn) / 4503599627370496;
  };
}

/** Deriva los índices fuente idénticos a `derive_fountain_source_bitset` en WASM (`D5-V2LE`). */
export function deriveWasmFountainSourceIndices(transferId, packetId, kBlocks) {
  const k = Math.max(1, Math.min(50, kBlocks | 0));
  const pid = Math.max(0, packetId | 0);
  if (pid < k) return [pid];
  const tid = BigInt(transferId) & U64_MASK;
  const rep = pid - k;
  const box = {
    s:
      (((tid + 0x9e3779b97f4a7c15n) & U64_MASK) ^
        ((BigInt(pid & 0xffff) * 0xd1b54a32d192ed03n) & U64_MASK)) &
      U64_MASK,
  };
  const r = Number(splitmix64Next(box) % 100n);
  const deg =
    k <= 3
      ? k
      : r < 30
        ? Math.min(3, k)
        : r < 65
          ? Math.min(k, Math.max(4, Math.floor(k / 3)))
          : Math.min(k, Math.max(5, Math.floor(k / 2)));
  const chosen = new Set([(rep * 2) % k, (rep * 2 + 1) % k, (rep * 3 + 2) % k]);
  while (chosen.size < deg) chosen.add(Number(splitmix64Next(box) % BigInt(k)));
  return Array.from(chosen).sort((a, b) => a - b);
}

export function encodeWasmFountainPackets(transferId, payloadBytes, kBlocks, repairCount) {
  const k = Math.max(1, Math.min(50, kBlocks | 0));
  const blockSize = Math.max(1, Math.ceil(payloadBytes.byteLength / k));
  const srcBlocks = Array.from({ length: k }, (_, i) => {
    const blk = new Uint8Array(blockSize);
    const slice = payloadBytes.subarray(i * blockSize, (i + 1) * blockSize);
    blk.set(slice);
    return blk;
  });
  const tid = BigInt(transferId) & U64_MASK;
  const total = k + Math.max(0, repairCount | 0);
  const packets = [];
  for (let pid = 0; pid < total; pid += 1) {
    const sourceIndices = deriveWasmFountainSourceIndices(tid, pid, k);
    const xorPayload = new Uint8Array(blockSize);
    for (const si of sourceIndices) {
      const s = srcBlocks[si];
      for (let b = 0; b < blockSize; b += 1) xorPayload[b] ^= s[b];
    }
    packets.push({
      packetId: pid,
      kBlocks: k,
      blockSize,
      originalByteLen: payloadBytes.byteLength,
      sourceIndices,
      xorPayload,
    });
  }
  return packets;
}

export function runWasmPeelingSession(exports, transferId, payloadOrPackets, kBlocks, dropSet) {
  if (
    !exports?.memory ||
    typeof exports.reset_lt_fountain_session !== "function" ||
    typeof exports.peel_lt_fountain_packet_in_place !== "function"
  ) {
    return null;
  }
  const k = Math.max(1, Math.min(50, kBlocks | 0));
  const tid = BigInt(transferId);
  exports.reset_lt_fountain_session(tid, k);
  const pkts = Array.isArray(payloadOrPackets)
    ? payloadOrPackets
    : encodeWasmFountainPackets(tid, payloadOrPackets, k, Math.max(8, Math.ceil(k * 0.75)));
  if (pkts.length === 0) return null;
  const blkLen = pkts[0].xorPayload.byteLength;
  const outCap = Math.max(64, k * blkLen);
  const xorPtr = typeof exports.wasm_alloc === "function" ? exports.wasm_alloc(blkLen) : 1024;
  const outPtr = typeof exports.wasm_alloc === "function" ? exports.wasm_alloc(outCap) : 2048;
  let recovered = null;
  try {
    for (let i = 0; i < pkts.length; i += 1) {
      if (dropSet && dropSet.has(i)) continue;
      const p = pkts[i];
      new Uint8Array(exports.memory.buffer, xorPtr, blkLen).set(p.xorPayload);
      const rc = exports.peel_lt_fountain_packet_in_place(
        tid,
        p.packetId,
        k,
        p.originalByteLen,
        xorPtr,
        blkLen,
        outPtr,
        outCap,
      );
      if (rc > 0) {
        recovered = new Uint8Array(exports.memory.buffer, outPtr, rc).slice();
        break;
      }
    }
  } finally {
    if (typeof exports.wasm_free === "function") {
      exports.wasm_free(xorPtr, blkLen);
      exports.wasm_free(outPtr, outCap);
    }
  }
  return recovered;
}

export function computeNyquistSafeFpsViaWasm(
  shutterUs = 8000,
  rollingReadoutMs = 14,
  wasmMod = null,
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

export function computeRaptorQSyndromeFallback(bytes, expectedK = 4) {
  let syndrome = (Math.max(1, expectedK >>> 0) * 257) >>> 0;
  for (let idx = 0; idx < bytes.byteLength; idx += 1) {
    const b = bytes[idx] & 0xff;
    syndrome =
      ((syndrome + Math.imul(b, (idx + 1) >>> 0)) ^ ((b << (idx % 17)) >>> 0)) >>> 0;
  }
  return Math.max(2, syndrome & 0x7ffffffe);
}
