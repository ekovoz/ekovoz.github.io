// ============================================================================
// web/mostrador/ekpack_binary_codec.js — Códec Binario Puro `.ekpack` V3 (`EV3\x01`),
// RFC 8878/9659 Zstd Acotado, SHA-256 FIPS 180-4 y Verificación Pre-Zstd
// (`SLICE-EKO-V2LEA-05` · Extracción LCOM4 `C1` desde `offline_mesh.js`)
// ============================================================================

import {
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureWebCrypto,
} from "./ed25519_field_math.js";

export const EKPACK_SEEKABLE_MAGIC = 0x8f92eab1;
const EKPACK_CODEC_FSST_ZSTD = 2;
const ZSTD_RFC8878_MAGIC = 0xfd2fb528;
const EKPACK_EV3_HEADER_LEN = 171;
const EKPACK_EV3_FLAG_HAS_FRAME67 = 0x01;
const EKPACK_EV3_FLAG_DEV_TEST = 0x02;
const MAX_ZSTD_WINDOW_BYTES = 8 * 1024 * 1024;
const MAX_ZSTD_BLOCK_SIZE = 131_072;
const MAX_EV3_FRAME0_OUT_BYTES = 256 * 1024;
export const MAX_EV3_META_OUT_BYTES = 256 * 1024;
const MAX_EKPACK_BOOK_OUT_BYTES = 8 * 1024 * 1024;

const SKIPPABLE_MAGIC_MASK = 0xfffffff0;
const SKIPPABLE_MAGIC_BASE = 0x184d2a50;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256BytesSyncPureJs(inputBytes) {
  const data = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes || []);
  const bitLenHi = Math.floor((data.byteLength * 8) / 0x100000000);
  const bitLenLo = (data.byteLength * 8) >>> 0;
  const padLen = (data.byteLength + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.byteLength] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padLen - 8, bitLenHi >>> 0, false);
  dv.setUint32(padLen - 4, bitLenLo >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, h0, false);
  odv.setUint32(4, h1, false);
  odv.setUint32(8, h2, false);
  odv.setUint32(12, h3, false);
  odv.setUint32(16, h4, false);
  odv.setUint32(20, h5, false);
  odv.setUint32(24, h6, false);
  odv.setUint32(28, h7, false);
  return out;
}

export function bytesToHexLower(bytes) {
  let s = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    s += bytes[i].toString(16).padStart(2, "0");
  }
  return s;
}

export async function computeSha256HexWebCrypto(inputBytes) {
  const src = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes || []);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto?.subtle?.digest) {
    try {
      const ab = await globalThis.crypto.subtle.digest("SHA-256", src);
      return bytesToHexLower(new Uint8Array(ab));
    } catch {
      // Fallback determinista RFC 6234
    }
  }
  return bytesToHexLower(sha256BytesSyncPureJs(src));
}

export function computeEcoPackCrc32Hex(inputBytes) {
  const bytes =
    inputBytes instanceof Uint8Array
      ? inputBytes
      : new TextEncoder().encode(String(inputBytes ?? "EKOVOZ_EKPACK"));
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export function buildEkpackSigningMessageV2(hdr = {}) {
  const langCode = String(hdr.lang_code || hdr.lang || "es");
  const codecId =
    Number(hdr.codec_id ?? hdr.codecId ?? EKPACK_CODEC_FSST_ZSTD) || EKPACK_CODEC_FSST_ZSTD;
  const contentDigest = String(hdr.content_digest_sha256_hex || "");
  const merkleRoot = String(hdr.merkle_root_sha256_hex || "");
  const metaSha = String(hdr.meta_zstd_sha256_hex || "");
  return metaSha
    ? `EKPACK-V2-MANIFEST:${langCode}:${codecId}:${contentDigest}:${merkleRoot}:${metaSha}`
    : `EKPACK-V2-MANIFEST:${langCode}:${codecId}:${contentDigest}:${merkleRoot}`;
}

function buildEkpackV3BinarySigningMessage({
  codecId = EKPACK_CODEC_FSST_ZSTD,
  flagsV3 = 0,
  langLen = 2,
  langPadded16 = new Uint8Array(16),
  unicodeBlockBase = 0,
  bookEpistemicTiers17 = new Uint8Array(17),
  f0ZstdSha32,
  symZstdSha32,
  metaZstdSha32,
  merkleRoot32,
  frame67Sha32,
  isDevTest = false,
}) {
  const domain = isDevTest ? "EKPACK-V3-DEV-TEST:" : "EKPACK-V3-MANIFEST:";
  const out = new Uint8Array(219);
  const enc = new TextEncoder();
  out.set(enc.encode(domain), 0);
  out[19] = codecId & 0xff;
  out[20] = flagsV3 & 0xff;
  out[21] = langLen & 0xff;
  out.set(langPadded16.subarray(0, 16), 22);
  const dv = new DataView(out.buffer);
  dv.setUint32(38, unicodeBlockBase >>> 0, true);
  out.set(bookEpistemicTiers17.subarray(0, 17), 42);
  out.set(f0ZstdSha32.subarray(0, 32), 59);
  out.set(symZstdSha32.subarray(0, 32), 91);
  out.set(metaZstdSha32.subarray(0, 32), 123);
  out.set(merkleRoot32.subarray(0, 32), 155);
  out.set(frame67Sha32.subarray(0, 32), 187);
  return out;
}

function formatEv3HexSigningMessage(payload219) {
  return `EV3HEX:${bytesToHexLower(payload219)}`;
}

export function computeEditionMerkleRootHexSync(leaves) {
  const enc = new TextEncoder();
  if (!Array.isArray(leaves) || leaves.length === 0) {
    return bytesToHexLower(sha256BytesSyncPureJs(enc.encode("EKOVOZ_MERKLE_EMPTY_V1")));
  }
  let level = leaves.map(([id, data]) => {
    const prefix = enc.encode(`LEAF:${id}:`);
    const buf = new Uint8Array(prefix.byteLength + data.byteLength);
    buf.set(prefix, 0);
    buf.set(data, prefix.byteLength);
    return sha256BytesSyncPureJs(buf);
  });
  const nodePrefix = enc.encode("NODE:");
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      const buf = new Uint8Array(5 + 64);
      buf.set(nodePrefix, 0);
      buf.set(left, 5);
      buf.set(right, 37);
      next.push(sha256BytesSyncPureJs(buf));
    }
    level = next;
  }
  return bytesToHexLower(level[0]);
}

export function parseEkpackPreamble32Js(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 32) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, 32);
  const magic = view.getUint32(0, true);
  if (magic !== EKPACK_SEEKABLE_MAGIC) return null;
  const version = view.getUint16(4, true);
  if (version !== 1) return null;
  const codecId = bytes[6];
  if (codecId !== EKPACK_CODEC_FSST_ZSTD) return null;
  return {
    magic,
    version,
    codecId,
    flags: view.getUint16(8, true),
    bookCount: view.getUint16(10, true),
    frame0Offset: view.getUint32(12, true),
    frame0ByteLen: view.getUint32(16, true),
    totalVerses: view.getUint32(20, true),
    totalFileBytes: Number(view.getBigUint64(24, true)),
  };
}

function inspectZstdFrameLimits(frameBytes, maxOutBytes) {
  const view = new DataView(frameBytes.buffer, frameBytes.byteOffset, frameBytes.byteLength);
  let pos = 0;
  while (pos + 4 <= frameBytes.byteLength) {
    const magic = view.getUint32(pos, true);
    if ((magic & SKIPPABLE_MAGIC_MASK) >>> 0 === SKIPPABLE_MAGIC_BASE) {
      if (pos + 8 > frameBytes.byteLength) {
        throw new Error("Truncated RFC 8878 Zstd skippable frame");
      }
      const skipLen = view.getUint32(pos + 4, true);
      const nextPos = pos + 8 + skipLen;
      if (nextPos > frameBytes.byteLength) {
        throw new Error("Truncated RFC 8878 Zstd skippable payload");
      }
      pos = nextPos;
      continue;
    }
    break;
  }
  if (pos + 5 > frameBytes.byteLength) {
    throw new Error("Truncated RFC 8878 Zstd frame header");
  }
  const magic = view.getUint32(pos, true);
  pos += 4;
  if (magic !== ZSTD_RFC8878_MAGIC) {
    throw new Error(`Invalid RFC 8878 Zstd magic 0x${magic.toString(16)}`);
  }
  const fhd = frameBytes[pos++];
  const fcsFlag = (fhd >>> 6) & 3;
  const singleSegment = (fhd & 0x20) !== 0;
  const unusedReserved = (fhd >>> 3) & 3;
  const hasChecksum = (fhd & 0x04) !== 0;
  const dictIdFlag = fhd & 3;
  if (unusedReserved !== 0) {
    throw new Error("Invalid RFC 8878 Zstd Frame_Header_Descriptor reserved bits");
  }
  if (!singleSegment) {
    if (pos >= frameBytes.byteLength) {
      throw new Error("Truncated RFC 8878 Zstd Window_Descriptor");
    }
    const wd = frameBytes[pos++];
    const exp = wd >>> 3;
    const mant = wd & 7;
    if (exp > 13 || (exp === 13 && mant > 0)) {
      throw new Error("ERR_ZSTD_WINDOW_EXCEEDS_8MIB: Window_Descriptor > 8 MiB");
    }
  }
  const dictBytes = dictIdFlag === 0 ? 0 : 1 << (dictIdFlag - 1);
  if (pos + dictBytes > frameBytes.byteLength) {
    throw new Error("Truncated RFC 8878 Zstd Dict_ID");
  }
  for (let i = 0; i < dictBytes; i += 1) {
    if (frameBytes[pos + i] !== 0) {
      throw new Error("Non-zero Zstd Dict_ID unsupported without dictionary");
    }
  }
  pos += dictBytes;

  const fcsLen =
    fcsFlag === 0 ? (singleSegment ? 1 : 0) : fcsFlag === 1 ? 2 : fcsFlag === 2 ? 4 : 8;
  if (pos + fcsLen > frameBytes.byteLength) {
    throw new Error("Truncated RFC 8878 Zstd Frame_Content_Size");
  }
  let expectedTotal = 0;
  if (fcsFlag === 0 && singleSegment) {
    expectedTotal = frameBytes[pos++];
  } else if (fcsFlag === 1) {
    expectedTotal = view.getUint16(pos, true) + 256;
    pos += 2;
  } else if (fcsFlag === 2) {
    expectedTotal = view.getUint32(pos, true);
    pos += 4;
  } else if (fcsFlag === 3) {
    const big = view.getBigUint64(pos, true);
    if (big > BigInt(maxOutBytes)) {
      throw new Error("ERR_ZSTD_OUTPUT_EXCEEDS_CAP: Frame_Content_Size > maxOutBytes");
    }
    expectedTotal = Number(big);
    pos += 8;
  }
  if (expectedTotal > maxOutBytes) {
    throw new Error(`ERR_ZSTD_OUTPUT_EXCEEDS_CAP: ${expectedTotal} > ${maxOutBytes}`);
  }
  if (singleSegment && expectedTotal > MAX_ZSTD_WINDOW_BYTES) {
    throw new Error(`ERR_ZSTD_WINDOW_EXCEEDS_8MIB: singleSegment ${expectedTotal}`);
  }
  return { pos, hasChecksum, fcsLen, expectedTotal };
}

/**
 * Decodifica un frame `RFC 8878` Zstandard bajo cotas duras `RFC 9659` (`Window <= 8 MiB`, `Block <= 128 KiB`,
 * `maxOutBytes` aplicado antes de cualquier reserva RLE/Raw/FCS), o delega en `ekovoz_player_wasm`.
 */
export function decodeRfc8878RawZstdFrameJs(
  frameBytes,
  wasmPlayerMod = null,
  maxOutBytes = MAX_EKPACK_BOOK_OUT_BYTES,
) {
  if (!(frameBytes instanceof Uint8Array) || frameBytes.byteLength < 8) {
    throw new Error("Truncated RFC 8878 Zstd frame (< 8 bytes)");
  }
  const hardCap = Math.max(1, Math.min(Number(maxOutBytes) || MAX_EKPACK_BOOK_OUT_BYTES, 16 * 1024 * 1024));
  const hdr = inspectZstdFrameLimits(frameBytes, hardCap);

  const exports = wasmPlayerMod?.exports || wasmPlayerMod;
  if (
    exports &&
    exports.memory &&
    typeof exports.wasm_alloc === "function" &&
    typeof exports.wasm_free === "function" &&
    typeof exports.decode_ekpack_zstd_frame_in_place === "function"
  ) {
    const inPtr = exports.wasm_alloc(frameBytes.byteLength) >>> 0;
    let outCap = Math.min(
      hardCap,
      Math.max(hdr.expectedTotal, Math.min(hardCap, Math.max(65536, frameBytes.byteLength * 6))),
    );
    let outPtr = exports.wasm_alloc(outCap) >>> 0;
    try {
      new Uint8Array(exports.memory.buffer, inPtr, frameBytes.byteLength).set(frameBytes);
      let written = exports.decode_ekpack_zstd_frame_in_place(
        inPtr,
        frameBytes.byteLength,
        outPtr,
        outCap,
      );
      if (written === -3 && outCap < hardCap) {
        exports.wasm_free(outPtr, outCap);
        outCap = Math.min(hardCap, outCap * 4);
        outPtr = exports.wasm_alloc(outCap) >>> 0;
        new Uint8Array(exports.memory.buffer, inPtr, frameBytes.byteLength).set(frameBytes);
        written = exports.decode_ekpack_zstd_frame_in_place(
          inPtr,
          frameBytes.byteLength,
          outPtr,
          outCap,
        );
      }
      if (written >= 0) {
        if (written > hardCap) {
          throw new Error(`ERR_ZSTD_OUTPUT_EXCEEDS_CAP: ${written} > ${hardCap}`);
        }
        const out = new Uint8Array(written);
        out.set(new Uint8Array(exports.memory.buffer, outPtr, written));
        return out;
      }
      throw new Error(`Zstd WASM decode rejected frame (rc=${written})`);
    } finally {
      if (inPtr) exports.wasm_free(inPtr, frameBytes.byteLength);
      if (outPtr) exports.wasm_free(outPtr, outCap);
    }
  }

  let pos = hdr.pos;
  const chunks = [];
  let totalLen = 0;
  let isLast = false;
  while (!isLast) {
    if (pos + 3 > frameBytes.byteLength) {
      throw new Error("Truncated RFC 8878 Zstd block header");
    }
    const bh = frameBytes[pos] | (frameBytes[pos + 1] << 8) | (frameBytes[pos + 2] << 16);
    pos += 3;
    isLast = (bh & 1) === 1;
    const blockType = (bh >>> 1) & 3;
    const blockSize = bh >>> 3;
    if (blockSize > MAX_ZSTD_BLOCK_SIZE) {
      throw new Error(`ERR_ZSTD_BLOCK_EXCEEDS_128KIB: ${blockSize}`);
    }
    if (totalLen + blockSize > hardCap) {
      throw new Error(`ERR_ZSTD_OUTPUT_EXCEEDS_CAP: ${totalLen + blockSize} > ${hardCap}`);
    }
    if (blockType === 0) {
      if (pos + blockSize > frameBytes.byteLength) {
        throw new Error("Truncated RFC 8878 Zstd Raw_Block");
      }
      chunks.push(frameBytes.subarray(pos, pos + blockSize));
      pos += blockSize;
      totalLen += blockSize;
    } else if (blockType === 1) {
      if (pos >= frameBytes.byteLength) {
        throw new Error("Truncated RFC 8878 Zstd RLE_Block");
      }
      const rle = new Uint8Array(blockSize);
      rle.fill(frameBytes[pos++]);
      chunks.push(rle);
      totalLen += blockSize;
    } else {
      throw new Error("Compressed Zstd block requires ekovoz_player_wasm ruzstd runtime");
    }
  }
  if (hdr.hasChecksum) {
    if (pos + 4 > frameBytes.byteLength) {
      throw new Error("Truncated RFC 8878 Zstd content checksum");
    }
    pos += 4;
  }
  if (hdr.fcsLen > 0 && totalLen !== hdr.expectedTotal) {
    throw new Error(`Zstd FCS mismatch: decoded ${totalLen} !== expected ${hdr.expectedTotal}`);
  }
  const out = new Uint8Array(totalLen);
  let cursor = 0;
  for (const c of chunks) {
    out.set(c, cursor);
    cursor += c.byteLength;
  }
  return out;
}

export function parseEm2MetaTrailerBytes(metaRaw, expectedBookCount = 0) {
  if (!(metaRaw instanceof Uint8Array) || metaRaw.byteLength < 2) {
    return {
      valid: false,
      hasEm2: false,
      bookCount: 0,
      bookSha256Hexes: [],
      em2Flags: 0,
      symSha256Hex: "",
      booksDirSha256Hex: "",
      frame67Sha256Hex: "",
    };
  }
  const cnt = metaRaw[0] | (metaRaw[1] << 8);
  const trOff = 2 + cnt * 32;
  if (cnt < expectedBookCount || metaRaw.byteLength < trOff) {
    return {
      valid: false,
      hasEm2: false,
      bookCount: cnt,
      bookSha256Hexes: [],
      em2Flags: 0,
      symSha256Hex: "",
      booksDirSha256Hex: "",
      frame67Sha256Hex: "",
    };
  }
  const bookSha256Hexes = new Array(cnt);
  for (let i = 0; i < cnt; i += 1) {
    bookSha256Hexes[i] = bytesToHexLower(metaRaw.subarray(2 + i * 32, 2 + (i + 1) * 32));
  }
  const hasEm2 =
    metaRaw.byteLength >= trOff + 4 + 1 + 32 + 32 &&
    metaRaw[trOff] === 0x45 &&
    metaRaw[trOff + 1] === 0x4d &&
    metaRaw[trOff + 2] === 0x32 &&
    metaRaw[trOff + 3] === 0x01;
  if (!hasEm2) {
    return {
      valid: true,
      hasEm2: false,
      bookCount: cnt,
      bookSha256Hexes,
      em2Flags: 0,
      symSha256Hex: "",
      booksDirSha256Hex: "",
      frame67Sha256Hex: "",
    };
  }
  const em2Flags = metaRaw[trOff + 4];
  const symSha256Hex = bytesToHexLower(metaRaw.subarray(trOff + 5, trOff + 37));
  const booksDirSha256Hex = bytesToHexLower(metaRaw.subarray(trOff + 37, trOff + 69));
  let frame67Sha256Hex = "";
  if ((em2Flags & 0x02) !== 0) {
    if (metaRaw.byteLength < trOff + 101) {
      return {
        valid: false,
        hasEm2: false,
        bookCount: cnt,
        bookSha256Hexes: [],
        em2Flags,
        symSha256Hex: "",
        booksDirSha256Hex: "",
        frame67Sha256Hex: "",
      };
    }
    frame67Sha256Hex = bytesToHexLower(metaRaw.subarray(trOff + 69, trOff + 101));
  }
  return {
    valid: true,
    hasEm2: true,
    bookCount: cnt,
    bookSha256Hexes,
    em2Flags,
    symSha256Hex,
    booksDirSha256Hex,
    frame67Sha256Hex,
  };
}

export function computeBooksDirectoryBytesJs(books = []) {
  const enc = new TextEncoder();
  const chunks = [];
  let totalLen = 0;
  for (const bk of Array.isArray(books) ? books : []) {
    const idBytes = enc.encode(String(bk.usfm_id || ""));
    const rec = new Uint8Array(idBytes.byteLength + 1 + 4 + 2 + 1);
    rec.set(idBytes, 0);
    rec[idBytes.byteLength] = 0x3a;
    const dv = new DataView(rec.buffer, idBytes.byteLength + 1, 6);
    dv.setUint32(0, Number(bk.first_verse_ord) || 0, true);
    dv.setUint16(4, Number(bk.verse_count) || 0, true);
    rec[rec.byteLength - 1] = 0x0a;
    chunks.push(rec);
    totalLen += rec.byteLength;
  }
  const out = new Uint8Array(totalLen);
  let cursor = 0;
  for (const c of chunks) {
    out.set(c, cursor);
    cursor += c.byteLength;
  }
  return out;
}

function hasEv3MagicEnvelope(f0Envelope) {
  return Boolean(
    f0Envelope instanceof Uint8Array &&
      f0Envelope.byteLength >= EKPACK_EV3_HEADER_LEN + 12 &&
      f0Envelope[0] === 0x45 &&
      f0Envelope[1] === 0x56 &&
      f0Envelope[2] === 0x33 &&
      f0Envelope[3] === 0x01,
  );
}

function parseEv3HeaderFields(f0Envelope, codecId = EKPACK_CODEC_FSST_ZSTD) {
  if (!(f0Envelope instanceof Uint8Array) || f0Envelope.byteLength < EKPACK_EV3_HEADER_LEN + 12) {
    throw new Error("ERR_EV3_HEADER_MISSING: Truncated EV3\\x01 envelope");
  }
  if (
    f0Envelope[0] !== 0x45 ||
    f0Envelope[1] !== 0x56 ||
    f0Envelope[2] !== 0x33 ||
    f0Envelope[3] !== 0x01
  ) {
    throw new Error("ERR_EV3_MAGIC_INVALID: Expected EV3\\x01 envelope before Frame 0");
  }
  const flagsV3 = f0Envelope[4];
  if ((flagsV3 & ~(EKPACK_EV3_FLAG_HAS_FRAME67 | EKPACK_EV3_FLAG_DEV_TEST)) !== 0) {
    throw new Error("ERR_EV3_FLAGS_INVALID: Unknown EV3 flags");
  }
  const isDevTest = (flagsV3 & EKPACK_EV3_FLAG_DEV_TEST) !== 0;
  const hasFrame67 = (flagsV3 & EKPACK_EV3_FLAG_HAS_FRAME67) !== 0;
  const langLen = f0Envelope[5];
  if (langLen === 0 || langLen > 16) {
    throw new Error("ERR_EV3_LANG_INVALID: Invalid lang_len");
  }
  const langPadded16 = f0Envelope.subarray(6, 22);
  for (let i = langLen; i < 16; i += 1) {
    if (langPadded16[i] !== 0) {
      throw new Error("ERR_EV3_LANG_INVALID: Non-zero language padding");
    }
  }
  const langCode = new TextDecoder("utf-8", { fatal: true }).decode(langPadded16.subarray(0, langLen));
  const dv = new DataView(f0Envelope.buffer, f0Envelope.byteOffset, f0Envelope.byteLength);
  const unicodeBlockBase = dv.getUint32(22, true);
  const bookEpistemicTiers17 = f0Envelope.subarray(26, 43);
  const merkleRoot32 = f0Envelope.subarray(43, 75);
  const frame67Sha32 = f0Envelope.subarray(75, 107);
  const signature64 = f0Envelope.subarray(107, 171);

  let pos = EKPACK_EV3_HEADER_LEN;
  if (pos + 4 > f0Envelope.byteLength) {
    throw new Error("ERR_EV3_TRUNCATED: Missing f0_zstd_len");
  }
  const f0ZstdLen = dv.getUint32(pos, true);
  pos += 4;
  if (f0ZstdLen === 0 || pos + f0ZstdLen > f0Envelope.byteLength) {
    throw new Error("ERR_EV3_TRUNCATED: Invalid f0_zstd_len");
  }
  const f0ZstdSlice = f0Envelope.subarray(pos, pos + f0ZstdLen);
  pos += f0ZstdLen;

  if (pos + 4 > f0Envelope.byteLength) {
    throw new Error("ERR_EV3_TRUNCATED: Missing sym_zstd_len");
  }
  const symZstdLen = dv.getUint32(pos, true);
  pos += 4;
  if (pos + symZstdLen > f0Envelope.byteLength) {
    throw new Error("ERR_EV3_TRUNCATED: Truncated sym_zstd payload");
  }
  const symZstdSlice = f0Envelope.subarray(pos, pos + symZstdLen);
  pos += symZstdLen;

  if (pos + 4 > f0Envelope.byteLength) {
    throw new Error("ERR_EV3_TRUNCATED: Missing meta_zstd_len");
  }
  const metaZstdLen = dv.getUint32(pos, true);
  pos += 4;
  if (metaZstdLen === 0 || pos + metaZstdLen > f0Envelope.byteLength) {
    throw new Error("ERR_EV3_TRUNCATED: Invalid meta_zstd_len");
  }
  const metaZstdSlice = f0Envelope.subarray(pos, pos + metaZstdLen);

  const f0ZstdSha32 = sha256BytesSyncPureJs(f0ZstdSlice);
  // Incondicional incluso cuando sym_zstd_len === 0 (GAP-V2LD-02/18): evita falsificacion null-slice
  const symZstdSha32 = sha256BytesSyncPureJs(symZstdSlice);
  const metaZstdSha32 = sha256BytesSyncPureJs(metaZstdSlice);
  const signingPayload219 = buildEkpackV3BinarySigningMessage({
    codecId,
    flagsV3,
    langLen,
    langPadded16,
    unicodeBlockBase,
    bookEpistemicTiers17,
    f0ZstdSha32,
    symZstdSha32,
    metaZstdSha32,
    merkleRoot32,
    frame67Sha32,
    isDevTest,
  });

  return {
    ev3HeaderLen: EKPACK_EV3_HEADER_LEN,
    flagsV3,
    isDevTest,
    hasFrame67,
    langCode,
    unicodeBlockBase,
    bookEpistemicTiers: Array.from(bookEpistemicTiers17),
    merkleRootHex: bytesToHexLower(merkleRoot32),
    frame67Sha256Hex: bytesToHexLower(frame67Sha32),
    signatureHex: bytesToHexLower(signature64),
    f0ZstdSlice,
    symZstdSlice,
    symZstdLen,
    metaZstdSlice,
    symSha256Hex: bytesToHexLower(symZstdSha32),
    metaZstdSha256Hex: bytesToHexLower(metaZstdSha32),
    signingPayload219,
    signingMessageEv3Hex: formatEv3HexSigningMessage(signingPayload219),
  };
}

function validatePostDecompressJsonParity(hdr, ev3, pinnedPubKey) {
  if (!hdr || typeof hdr !== "object") {
    throw new Error("ERR_EV3_FRAME0_JSON_INVALID");
  }
  if (String(hdr.lang_code || "").trim().toLowerCase() !== ev3.langCode.toLowerCase()) {
    throw new Error("ERR_EV3_FRAME0_LANG_PARITY_MISMATCH");
  }
  if ((Number(hdr.unicode_block_base) >>> 0) !== (ev3.unicodeBlockBase >>> 0)) {
    throw new Error("ERR_EV3_FRAME0_UNICODE_BLOCK_BASE_TAMPERED");
  }
  const hdrTiers = Array.isArray(hdr.book_epistemic_tiers) ? hdr.book_epistemic_tiers : null;
  if (
    !hdrTiers ||
    hdrTiers.length !== 17 ||
    hdrTiers.some((v, idx) => (Number(v) & 0xff) !== ev3.bookEpistemicTiers[idx])
  ) {
    throw new Error("ERR_EV3_FRAME0_EPISTEMIC_TIERS_TAMPERED");
  }
  if (
    hdr.merkle_root_sha256_hex &&
    String(hdr.merkle_root_sha256_hex).toLowerCase() !== ev3.merkleRootHex
  ) {
    throw new Error("ERR_EV3_FRAME0_MERKLE_PARITY_MISMATCH");
  }
  if (
    hdr.meta_zstd_sha256_hex &&
    String(hdr.meta_zstd_sha256_hex).toLowerCase() !== ev3.metaZstdSha256Hex
  ) {
    throw new Error("ERR_EV3_FRAME0_META_SHA_PARITY_MISMATCH");
  }
  hdr.ed25519_public_key_hex = pinnedPubKey;
  hdr.ed25519_signature_hex = ev3.signatureHex;
  hdr.ev3_signing_message = ev3.signingMessageEv3Hex;
}

function preparePreDecompressEv3(bytes, { expectedPubKeyHex, expectedLang, allowDevTest }) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 32) {
    throw new Error("Truncated .ekpack container (< 32-byte preamble)");
  }
  const preamble = parseEkpackPreamble32Js(bytes);
  if (!preamble) {
    throw new Error("Invalid .ekpack magic (expected 0x8F92EAB1), version, or sealed Zstd codec_id=2");
  }
  if (preamble.frame0Offset + preamble.frame0ByteLen > bytes.byteLength) {
    throw new Error("Truncated .ekpack Frame 0 header bounds");
  }
  const pinnedPubKey = SOVEREIGN_ED25519_PUBLIC_KEY_HEX.toLowerCase();
  if (
    expectedPubKeyHex !== undefined &&
    expectedPubKeyHex !== null &&
    String(expectedPubKeyHex).trim() !== "" &&
    String(expectedPubKeyHex).trim().toLowerCase() !== pinnedPubKey
  ) {
    throw new Error(`ERR_UNPINNED_ED25519_KEY: caller key !== pinned ${pinnedPubKey}`);
  }
  const f0Envelope = bytes.subarray(
    preamble.frame0Offset,
    preamble.frame0Offset + preamble.frame0ByteLen,
  );
  const ev3 = parseEv3HeaderFields(f0Envelope, preamble.codecId);
  if (ev3.isDevTest && !allowDevTest) {
    throw new Error("ERR_DEV_TEST_SIGNATURE_FORBIDDEN: dev-test EV3 flag rejected in release path");
  }
  const cleanExpectedLang = String(expectedLang || "").trim().toLowerCase();
  if (cleanExpectedLang && ev3.langCode.toLowerCase() !== cleanExpectedLang) {
    throw new Error(
      `ERR_LANG_REPLAY_MISMATCH: expected ${cleanExpectedLang}, got ${ev3.langCode}`,
    );
  }
  return { preamble, pinnedPubKey, ev3 };
}

/** Authenticate-then-Decompress síncrono: verifica `EV3\x01` + Ed25519 + SHA-256 antes de cualquier Zstd. */
export function parseAndVerifyEkpackV3PreDecompressSync(
  bytes,
  {
    expectedPubKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    expectedLang = "",
    allowDevTest = false,
    wasmPlayerMod = null,
  } = {},
) {
  const { preamble, pinnedPubKey, ev3 } = preparePreDecompressEv3(bytes, {
    expectedPubKeyHex,
    expectedLang,
    allowDevTest,
  });
  const sigOk = verifyEd25519ManifestSignature(
    ev3.signingPayload219,
    ev3.signatureHex,
    pinnedPubKey,
    wasmPlayerMod,
  );
  if (!sigOk) {
    throw new Error("Ed25519 RFC 8032 signature invalid (pre-Zstd EV3 reject)");
  }
  const f0Raw = decodeRfc8878RawZstdFrameJs(
    ev3.f0ZstdSlice,
    wasmPlayerMod,
    MAX_EV3_FRAME0_OUT_BYTES,
  );
  const hdr = JSON.parse(new TextDecoder("utf-8").decode(f0Raw));
  validatePostDecompressJsonParity(hdr, ev3, pinnedPubKey);
  return {
    preamble,
    ev3,
    hdr,
    books: Array.isArray(hdr.books) ? hdr.books : [],
    symZstdSlice: ev3.symZstdSlice,
    metaZstdSlice: ev3.metaZstdSlice,
  };
}

/** Authenticate-then-Decompress asíncrono (WebCrypto + RFC 8032) previo a toda descompresión Zstd. */
export async function parseAndVerifyEkpackV3PreDecompressAsync(
  bytes,
  {
    expectedPubKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    expectedLang = "",
    allowDevTest = false,
    wasmPlayerMod = null,
  } = {},
) {
  const { preamble, pinnedPubKey, ev3 } = preparePreDecompressEv3(bytes, {
    expectedPubKeyHex,
    expectedLang,
    allowDevTest,
  });
  const sigOk = await verifyEd25519ManifestSignatureWebCrypto(
    ev3.signingPayload219,
    ev3.signatureHex,
    pinnedPubKey,
    wasmPlayerMod,
  );
  if (!sigOk) {
    throw new Error("Ed25519 RFC 8032 signature invalid (pre-Zstd EV3 WebCrypto reject)");
  }
  const f0Raw = decodeRfc8878RawZstdFrameJs(
    ev3.f0ZstdSlice,
    wasmPlayerMod,
    MAX_EV3_FRAME0_OUT_BYTES,
  );
  const hdr = JSON.parse(new TextDecoder("utf-8").decode(f0Raw));
  validatePostDecompressJsonParity(hdr, ev3, pinnedPubKey);
  return {
    preamble,
    ev3,
    hdr,
    books: Array.isArray(hdr.books) ? hdr.books : [],
    symZstdSlice: ev3.symZstdSlice,
    metaZstdSlice: ev3.metaZstdSlice,
  };
}

export function parseEkpackFrame0UnverifiedLayout(bytes, wasmPlayerMod = null) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 32) {
    throw new Error("Truncated .ekpack container (< 32-byte preamble)");
  }
  const preamble = parseEkpackPreamble32Js(bytes);
  if (!preamble) {
    throw new Error("Invalid .ekpack magic (expected 0x8F92EAB1), version, or sealed Zstd codec_id=2");
  }
  if (preamble.frame0Offset + preamble.frame0ByteLen > bytes.byteLength) {
    throw new Error("Truncated .ekpack Frame 0 header bounds");
  }
  const f0Envelope = bytes.subarray(
    preamble.frame0Offset,
    preamble.frame0Offset + preamble.frame0ByteLen,
  );
  if (f0Envelope.byteLength < 12) {
    throw new Error("Truncated .ekpack Frame 0 envelope");
  }

  let ev3 = null;
  let actualF0Len = 0;
  let f0ZstdSlice = null;
  let symZstdSlice = null;
  let metaZstdSlice = null;

  if (hasEv3MagicEnvelope(f0Envelope)) {
    ev3 = parseEv3HeaderFields(f0Envelope, preamble.codecId);
    f0ZstdSlice = ev3.f0ZstdSlice;
    symZstdSlice = ev3.symZstdSlice;
    metaZstdSlice = ev3.metaZstdSlice;
  } else {
    const dv = new DataView(f0Envelope.buffer, f0Envelope.byteOffset, f0Envelope.byteLength);
    actualF0Len = dv.getUint32(0, true);
    if (actualF0Len === 0 || 4 + actualF0Len > f0Envelope.byteLength) {
      throw new Error("Invalid .ekpack Frame 0 compressed length");
    }
    f0ZstdSlice = f0Envelope.subarray(4, 4 + actualF0Len);
    if (f0Envelope.byteLength >= 8 + actualF0Len) {
      const symZstdLen = dv.getUint32(4 + actualF0Len, true);
      if (symZstdLen > 0 && 8 + actualF0Len + symZstdLen <= f0Envelope.byteLength) {
        symZstdSlice = f0Envelope.subarray(8 + actualF0Len, 8 + actualF0Len + symZstdLen);
      }
      const metaPos = 8 + actualF0Len + symZstdLen;
      if (metaPos + 4 <= f0Envelope.byteLength) {
        const metaZstdLen = dv.getUint32(metaPos, true);
        if (metaZstdLen > 0 && metaPos + 4 + metaZstdLen <= f0Envelope.byteLength) {
          metaZstdSlice = f0Envelope.subarray(metaPos + 4, metaPos + 4 + metaZstdLen);
        }
      }
    }
  }

  const f0Raw = decodeRfc8878RawZstdFrameJs(f0ZstdSlice, wasmPlayerMod, MAX_EV3_FRAME0_OUT_BYTES);
  const hdr = JSON.parse(new TextDecoder("utf-8").decode(f0Raw));
  if (ev3) {
    hdr.ed25519_public_key_hex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX.toLowerCase();
    hdr.ed25519_signature_hex = ev3.signatureHex;
    hdr.ev3_signing_message = ev3.signingMessageEv3Hex;
  }
  const books = Array.isArray(hdr.books) ? hdr.books : [];
  return { preamble, ev3, hdr, books, symZstdSlice, metaZstdSlice };
}

export function parseEkpackContainerJs(bytes, wasmPlayerMod = null) {
  const { preamble, hdr, books, metaZstdSlice } = parseEkpackFrame0UnverifiedLayout(
    bytes,
    wasmPlayerMod,
  );
  if (metaZstdSlice && books.length > 0) {
    try {
      const metaRaw = decodeRfc8878RawZstdFrameJs(
        metaZstdSlice,
        wasmPlayerMod,
        MAX_EV3_META_OUT_BYTES,
      );
      const em2 = parseEm2MetaTrailerBytes(metaRaw, books.length);
      if (em2.valid) {
        const limit = Math.min(books.length, em2.bookSha256Hexes.length);
        for (let i = 0; i < limit; i += 1) {
          if (!books[i].frame_sha256_hex) {
            books[i].frame_sha256_hex = em2.bookSha256Hexes[i];
          }
        }
        if (hdr.intralang_rlz && em2.frame67Sha256Hex && !hdr.intralang_rlz.frame_sha256_hex) {
          hdr.intralang_rlz.frame_sha256_hex = em2.frame67Sha256Hex;
        }
      }
    } catch {
      // Requiere runtime WASM para bloques Zstd comprimidos
    }
  }
  return {
    ...preamble,
    ...hdr,
    books,
  };
}

function decodeBase64BytesJs(b64) {
  const clean = String(b64 || "").replace(/\s+/g, "");
  if (!clean) return new Uint8Array(0);
  const bin = globalThis.atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function verifyMatrixTier0PackForVault(hdr, pinnedPubKeyHex, effectiveWasmMod) {
  if (Number(hdr?.schema_crc32) !== 0x4e14c015) {
    throw new Error("[TWO-GATE PRE-COMMIT REJECTED] ERR_MATRIX_SCHEMA_CRC32_INVALID");
  }
  const hdrPk = String(hdr.ed25519_public_key_hex || "").trim().toLowerCase();
  if (hdrPk !== pinnedPubKeyHex) {
    throw new Error("[TWO-GATE PRE-COMMIT REJECTED] ERR_UNPINNED_ED25519_KEY for matrix_tier0");
  }
  const frameDirHex = String(hdr.frame_dir_sha256_hex || "").trim().toLowerCase();
  const rawFrameHashes = decodeBase64BytesJs(hdr.frame_hashes_b64);
  if (
    !/^[0-9a-f]{64}$/.test(frameDirHex) ||
    rawFrameHashes.byteLength === 0 ||
    rawFrameHashes.byteLength % 32 !== 0
  ) {
    throw new Error("[TWO-GATE PRE-COMMIT REJECTED] ERR_MATRIX_FRAME_DIR_INVALID");
  }
  const signMsg = `EKOVOZ_MATRIX_TIER0_V2:${hdr.content_digest_sha256_hex}:${hdr.merkle_root_sha256_hex}:${frameDirHex}`;
  const ok = await verifyEd25519ManifestSignatureWebCrypto(
    signMsg,
    String(hdr.ed25519_signature_hex || ""),
    pinnedPubKeyHex,
    effectiveWasmMod,
  );
  if (!ok) {
    throw new Error(
      "[TWO-GATE PRE-COMMIT REJECTED] Ed25519 RFC 8032 signature invalid for matrix_tier0",
    );
  }
  const dictIdx =
    Array.isArray(hdr.dict_frame) && hdr.dict_frame.length >= 4 ? Number(hdr.dict_frame[3]) : -1;
  const realiaIdx =
    Array.isArray(hdr.realia_frame) && hdr.realia_frame.length >= 4
      ? Number(hdr.realia_frame[3])
      : -1;
  if (!Number.isInteger(dictIdx) || dictIdx < 0 || !Number.isInteger(realiaIdx) || realiaIdx < 0) {
    throw new Error("[TWO-GATE PRE-COMMIT REJECTED] ERR_MATRIX_DICT_REALIA_INVALID");
  }
  const dirLines = [`D:${dictIdx}|R:${realiaIdx}`];
  for (const entry of hdr.books || []) {
    const bkCode = String(entry[0]);
    const fidx = entry.length >= 5 ? Number(entry[4]) : -1;
    if (!Number.isInteger(fidx) || fidx < 0) {
      throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] ERR_MATRIX_BOOK_IDX_INVALID on ${bkCode}`);
    }
    dirLines.push(`B:${bkCode}:${fidx}`);
  }
  if (hdr.win_ranges && typeof hdr.win_ranges === "object") {
    for (const bkCode of Object.keys(hdr.win_ranges).sort()) {
      const wins = hdr.win_ranges[bkCode];
      if (!Array.isArray(wins)) continue;
      for (const w of wins) {
        const wfidx = w.length >= 5 ? Number(w[4]) : -1;
        if (!Number.isInteger(wfidx) || wfidx < 0) {
          throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] ERR_MATRIX_WIN_IDX_INVALID on ${bkCode}`);
        }
        dirLines.push(`W:${bkCode}:${w[0]}:${w[1]}:${wfidx}`);
      }
    }
  }
  const dirSuffixBytes = new TextEncoder().encode(`\n${dirLines.join("\n")}\n`);
  const dirBuf = new Uint8Array(rawFrameHashes.byteLength + dirSuffixBytes.byteLength);
  dirBuf.set(rawFrameHashes, 0);
  dirBuf.set(dirSuffixBytes, rawFrameHashes.byteLength);
  const actualDirSha = await computeSha256HexWebCrypto(dirBuf);
  if (actualDirSha !== frameDirHex) {
    throw new Error("[TWO-GATE PRE-COMMIT REJECTED] ERR_MATRIX_FRAME_DIR_SHA256_MISMATCH");
  }
  return String(hdr.ed25519_signature_hex || "");
}

export function extractEkpackMetaZstdSliceNoWasm(bytes) {
  const preamble = parseEkpackPreamble32Js(bytes);
  if (!preamble || preamble.frame0Offset + preamble.frame0ByteLen > bytes.byteLength) {
    return null;
  }
  const f0 = bytes.subarray(
    preamble.frame0Offset,
    preamble.frame0Offset + preamble.frame0ByteLen,
  );
  if (hasEv3MagicEnvelope(f0)) {
    try {
      const ev3 = parseEv3HeaderFields(f0, preamble.codecId);
      return { preamble, ev3, metaZstdSlice: ev3.metaZstdSlice };
    } catch {
      return null;
    }
  }
  if (f0.byteLength < 12) return null;
  const dv = new DataView(f0.buffer, f0.byteOffset, f0.byteLength);
  const actualF0Len = dv.getUint32(0, true);
  if (actualF0Len === 0 || 8 + actualF0Len > f0.byteLength) return null;
  const symZstdLen = dv.getUint32(4 + actualF0Len, true);
  const metaPos = 8 + actualF0Len + symZstdLen;
  if (metaPos + 4 > f0.byteLength) return null;
  const metaZstdLen = dv.getUint32(metaPos, true);
  if (metaZstdLen === 0 || metaPos + 4 + metaZstdLen > f0.byteLength) return null;
  return {
    preamble,
    ev3: null,
    metaZstdSlice: f0.subarray(metaPos + 4, metaPos + 4 + metaZstdLen),
  };
}
