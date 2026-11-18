// ============================================================================
// web/mostrador/ed25519_field_math.js — Kernel Criptográfico Puro L0 (`SLICE-EKO-V2G-05`,
// `ARB-EKOVOZ-90`): Aritmética de Curva de Edwards Torcida sobre GF(2^255 - 19),
// SHA-512 (RFC 6234) y Verificación Ed25519 (RFC 8032 / WebCrypto / WASM).
// ============================================================================

export const SOVEREIGN_ED25519_PUBLIC_KEY_HEX =
  "5f7a02cab91d9022730752855ea280e6d8a6a6e18ac3724dd65c20583a327720";

const ED25519_P = (1n << 255n) - 19n;
const ED25519_L = (1n << 252n) + 27742317777372353535851937790883648493n;

function modP(a) {
  const r = a % ED25519_P;
  return r >= 0n ? r : r + ED25519_P;
}

function modPowP(base, exp) {
  let res = 1n;
  let b = modP(base);
  let e = exp;
  while (e > 0n) {
    if ((e & 1n) === 1n) res = (res * b) % ED25519_P;
    b = (b * b) % ED25519_P;
    e >>= 1n;
  }
  return res;
}

function modInvP(a) {
  return modPowP(a, ED25519_P - 2n);
}

const ED25519_D = modP(-121665n * modInvP(121666n));
const ED25519_SQRT_M1 = modPowP(2n, (ED25519_P - 1n) >> 2n);

function recoverX(y, signBit) {
  if (y >= ED25519_P) return null;
  const y2 = (y * y) % ED25519_P;
  const u = modP(y2 - 1n);
  const v = modP(ED25519_D * y2 + 1n);
  let x = modPowP(modP(u * modInvP(v)), (ED25519_P + 3n) >> 3n);
  if (modP(v * ((x * x) % ED25519_P) - u) !== 0n) {
    x = modP(x * ED25519_SQRT_M1);
    if (modP(v * ((x * x) % ED25519_P) - u) !== 0n) {
      return null;
    }
  }
  if (x === 0n && signBit === 1n) return null;
  if ((x & 1n) !== signBit) {
    x = ED25519_P - x;
  }
  return x;
}

const ED25519_BY = modP(4n * modInvP(5n));
const ED25519_BX = recoverX(ED25519_BY, 0n);
const ED25519_BASE_POINT = [
  ED25519_BX,
  ED25519_BY,
  1n,
  modP(ED25519_BX * ED25519_BY),
];

function edwardsAdd(ptP, ptQ) {
  const [x1, y1, z1, t1] = ptP;
  const [x2, y2, z2, t2] = ptQ;
  const a = modP((y1 - x1) * (y2 - x2));
  const b = modP((y1 + x1) * (y2 + x2));
  const c = modP(t1 * 2n * ED25519_D * t2);
  const d = modP(z1 * 2n * z2);
  const e = modP(b - a);
  const f = modP(d - c);
  const g = modP(d + c);
  const h = modP(b + a);
  return [modP(e * f), modP(g * h), modP(f * g), modP(e * h)];
}

function edwardsScalarMult(pt, scalar) {
  let q = [0n, 1n, 1n, 0n];
  let addend = pt;
  let k = scalar;
  while (k > 0n) {
    if ((k & 1n) === 1n) q = edwardsAdd(q, addend);
    addend = edwardsAdd(addend, addend);
    k >>= 1n;
  }
  return q;
}

function edwardsPointsEqual(ptP, ptQ) {
  const [x1, y1, z1] = ptP;
  const [x2, y2, z2] = ptQ;
  return modP(x1 * z2 - x2 * z1) === 0n && modP(y1 * z2 - y2 * z1) === 0n;
}

function decodeEdwardsPoint(bytes32) {
  if (!(bytes32 instanceof Uint8Array) || bytes32.length !== 32) return null;
  let y = 0n;
  for (let i = 0; i < 32; i += 1) {
    const b = i === 31 ? bytes32[i] & 0x7f : bytes32[i];
    y |= BigInt(b) << BigInt(8 * i);
  }
  const signBit = BigInt((bytes32[31] >>> 7) & 1);
  const x = recoverX(y, signBit);
  if (x === null) return null;
  return [x, y, 1n, modP(x * y)];
}

const SHA512_K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
];

const MASK64 = 0xffffffffffffffffn;
const rotr64 = (x, n) => ((x >> n) | ((x << (64n - n)) & MASK64)) & MASK64;

function sha512Bytes(msgBytes) {
  const H = [
    0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
  ];
  const bitLen = BigInt(msgBytes.length) * 8n;
  const totalLen = Math.ceil((msgBytes.length + 17) / 128) * 128;
  const padded = new Uint8Array(totalLen);
  padded.set(msgBytes);
  padded[msgBytes.length] = 0x80;
  let remBits = bitLen;
  for (let i = 0; i < 16; i += 1) {
    padded[totalLen - 1 - i] = Number(remBits & 0xffn);
    remBits >>= 8n;
  }

  const W = new Array(80).fill(0n);
  for (let off = 0; off < totalLen; off += 128) {
    for (let i = 0; i < 16; i += 1) {
      let word = 0n;
      for (let b = 0; b < 8; b += 1) {
        word = (word << 8n) | BigInt(padded[off + i * 8 + b]);
      }
      W[i] = word;
    }
    for (let i = 16; i < 80; i += 1) {
      const s0 = rotr64(W[i - 15], 1n) ^ rotr64(W[i - 15], 8n) ^ (W[i - 15] >> 7n);
      const s1 = rotr64(W[i - 2], 19n) ^ rotr64(W[i - 2], 61n) ^ (W[i - 2] >> 6n);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) & MASK64;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 80; i += 1) {
      const S1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n);
      const ch = (e & f) ^ ((~e & MASK64) & g);
      const t1 = (h + S1 + ch + SHA512_K[i] + W[i]) & MASK64;
      const S0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) & MASK64;
      h = g;
      g = f;
      f = e;
      e = (d + t1) & MASK64;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) & MASK64;
    }
    H[0] = (H[0] + a) & MASK64;
    H[1] = (H[1] + b) & MASK64;
    H[2] = (H[2] + c) & MASK64;
    H[3] = (H[3] + d) & MASK64;
    H[4] = (H[4] + e) & MASK64;
    H[5] = (H[5] + f) & MASK64;
    H[6] = (H[6] + g) & MASK64;
    H[7] = (H[7] + h) & MASK64;
  }

  const digest = new Uint8Array(64);
  for (let i = 0; i < 8; i += 1) {
    let w = H[i];
    for (let b = 7; b >= 0; b -= 1) {
      digest[i * 8 + b] = Number(w & 0xffn);
      w >>= 8n;
    }
  }
  return digest;
}

function hexToFixedBytes(hexOrBytes, expectedBytes) {
  if (hexOrBytes instanceof Uint8Array) {
    return hexOrBytes.byteLength === expectedBytes ? hexOrBytes : null;
  }
  const clean = String(hexOrBytes ?? "").trim();
  if (clean.length !== expectedBytes * 2) return null;
  const out = new Uint8Array(expectedBytes);
  for (let i = 0; i < expectedBytes; i += 1) {
    const hi = clean.charCodeAt(i * 2);
    const lo = clean.charCodeAt(i * 2 + 1);
    const hn =
      hi >= 48 && hi <= 57 ? hi - 48 : hi >= 97 && hi <= 102 ? hi - 87 : hi >= 65 && hi <= 70 ? hi - 55 : -1;
    const ln =
      lo >= 48 && lo <= 57 ? lo - 48 : lo >= 97 && lo <= 102 ? lo - 87 : lo >= 65 && lo <= 70 ? lo - 55 : -1;
    if (hn < 0 || ln < 0) return null;
    out[i] = (hn << 4) | ln;
  }
  return out;
}

function normalizePayloadBytes(payloadStringOrBytes) {
  if (payloadStringOrBytes instanceof Uint8Array) return payloadStringOrBytes;
  return new TextEncoder().encode(String(payloadStringOrBytes ?? ""));
}

function verifyViaWasmCompact(pkBytes, msgBytes, sigBytes, wasmPlayerMod) {
  const exports = wasmPlayerMod?.exports || wasmPlayerMod || null;
  if (
    !exports ||
    !exports.memory ||
    typeof exports.verify_ed25519_compact_in_place !== "function"
  ) {
    return null;
  }
  const totalNeeded = 32 + 64 + msgBytes.byteLength;
  const allocFn =
    typeof exports.wasm_alloc === "function"
      ? exports.wasm_alloc
      : typeof exports.alloc_pcm_buffer === "function"
        ? exports.alloc_pcm_buffer
        : null;
  const freeFn =
    typeof exports.wasm_free === "function"
      ? exports.wasm_free
      : typeof exports.free_pcm_buffer === "function"
        ? exports.free_pcm_buffer
        : null;
  if (!allocFn) return null;

  const basePtr = allocFn(totalNeeded) >>> 0;
  try {
    const mem = new Uint8Array(exports.memory.buffer);
    if (!basePtr || basePtr + totalNeeded > mem.byteLength) return null;
    const pkPtr = basePtr;
    const sigPtr = basePtr + 32;
    const msgPtr = basePtr + 96;
    mem.set(pkBytes, pkPtr);
    mem.set(sigBytes, sigPtr);
    if (msgBytes.byteLength > 0) mem.set(msgBytes, msgPtr);
    const rc = exports.verify_ed25519_compact_in_place(pkPtr, msgPtr, msgBytes.byteLength, sigPtr);
    return rc === 1;
  } finally {
    if (freeFn && basePtr) freeFn(basePtr, totalNeeded);
  }
}

export function verifyEd25519ManifestSignature(
  payloadStringOrBytes,
  signatureHex = "",
  publicKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  wasmPlayerMod = null,
) {
  const resolvedPkHex =
    publicKeyHex === "ed25519-ekovoz-sovereign-pub-v1" || !publicKeyHex
      ? SOVEREIGN_ED25519_PUBLIC_KEY_HEX
      : publicKeyHex;
  const pkBytes = hexToFixedBytes(resolvedPkHex, 32);
  const sigBytes = hexToFixedBytes(signatureHex, 64);
  if (!pkBytes || !sigBytes) return false;
  const msgBytes = normalizePayloadBytes(payloadStringOrBytes);

  const wasmRes = verifyViaWasmCompact(pkBytes, msgBytes, sigBytes, wasmPlayerMod);
  if (typeof wasmRes === "boolean") return wasmRes;

  const rBytes = sigBytes.subarray(0, 32);
  const sBytes = sigBytes.subarray(32, 64);
  let S = 0n;
  for (let i = 0; i < 32; i += 1) {
    S |= BigInt(sBytes[i]) << BigInt(8 * i);
  }
  if (S >= ED25519_L) return false;

  const ptA = decodeEdwardsPoint(pkBytes);
  const ptR = decodeEdwardsPoint(rBytes);
  if (!ptA || !ptR) return false;

  const ram = new Uint8Array(64 + msgBytes.byteLength);
  ram.set(rBytes, 0);
  ram.set(pkBytes, 32);
  ram.set(msgBytes, 64);
  const digest64 = sha512Bytes(ram);
  let kChallenge = 0n;
  for (let i = 0; i < 64; i += 1) {
    kChallenge |= BigInt(digest64[i]) << BigInt(8 * i);
  }
  kChallenge %= ED25519_L;

  const lhs = edwardsScalarMult(edwardsScalarMult(ED25519_BASE_POINT, S), 8n);
  const rhs = edwardsScalarMult(edwardsAdd(ptR, edwardsScalarMult(ptA, kChallenge)), 8n);
  return edwardsPointsEqual(lhs, rhs);
}

export async function verifyEd25519ManifestSignatureWebCrypto(
  payloadStringOrBytes,
  signatureHex = "",
  publicKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  wasmPlayerMod = null,
) {
  const resolvedPkHex =
    publicKeyHex === "ed25519-ekovoz-sovereign-pub-v1" || !publicKeyHex
      ? SOVEREIGN_ED25519_PUBLIC_KEY_HEX
      : publicKeyHex;
  const pkBytes = hexToFixedBytes(resolvedPkHex, 32);
  const sigBytes = hexToFixedBytes(signatureHex, 64);
  if (!pkBytes || !sigBytes) return false;
  const msgBytes = normalizePayloadBytes(payloadStringOrBytes);

  const subtle = globalThis?.crypto?.subtle;
  if (subtle && typeof subtle.importKey === "function" && typeof subtle.verify === "function") {
    try {
      const cryptoKey = await subtle.importKey("raw", pkBytes, { name: "Ed25519" }, false, [
        "verify",
      ]);
      const ok = await subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, msgBytes);
      return Boolean(ok);
    } catch (_unsupportedWebViewErr) {
      // Fallback WASM / RFC 8032 en WebViews sin soporte Ed25519 en SubtleCrypto
    }
  }
  return verifyEd25519ManifestSignature(msgBytes, sigBytes, pkBytes, wasmPlayerMod);
}

export { verifyEd25519ManifestSignatureWebCrypto as verifyEd25519ManifestSignatureAsync };
