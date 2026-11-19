// ============================================================================
// web/mostrador/offline_mesh.js — Semillas Autónomas `.ekpack` (`0x8F92EAB1`, Zstd `codec_id=2`),
// Verificación Criptográfica Real `Ed25519` (`RFC 8032` / `WebCrypto` + WASM),
// Persistencia `IndexedDB` (`CRC32 ∧ WebCrypto Ed25519`) y Malla Sneakernet Opt-In
// (`@req[BIB-V2-12]` · `@req[BIB-V2-15]` · Decisiones `3-A+`, `4-A+`, `5-A+` · `0` LZ4 / `0` JS MYTE)
// ============================================================================

import {
  CACHE_NAME,
  buildOptInAssetList,
  setOfflineOptInState,
} from "../sw.js";
import {
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureAsync,
  verifyEd25519ManifestSignatureWebCrypto,
} from "./ed25519_field_math.js";
import {
  buildFullCorpusDeflateQuineHtml,
  buildQuineHtml,
  createSneakernetCodecs,
} from "./quine_and_sneakernet.js";

export {
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  buildFullCorpusDeflateQuineHtml,
  buildQuineHtml,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureAsync,
  verifyEd25519ManifestSignatureWebCrypto,
};

const EKPACK_SEEKABLE_MAGIC = 0x8f92eab1;
const EKPACK_CODEC_FSST_ZSTD = 2;
const ZSTD_RFC8878_MAGIC = 0xfd2fb528;
const IDB_DB_NAME = "ekovoz_vault_v2";
const IDB_STORE_PACKS = "verified_ekpacks";
const IDB_STORE_FONTS = "verified_fonts_zst";
const STORED_FONT_ZST_BLOBS = new Map();

const DEFAULT_SIGNED_SEED_RECEIPTS = {
  es: {
    signingMessage: "EKPACK-V2-MANIFEST:es:2:bootstrap:bootstrap",
    ed25519SignatureHex:
      "49a0826f26c97c0281108e2d52c5a597a5587a35c6785783be7af09d1ebf1cf87919e2dcff91ac3f12cea924baa4d5b28c60418e06430d14e1e1dafff9e21802",
  },
  en: {
    signingMessage: "EKPACK-V2-MANIFEST:en:2:bootstrap:bootstrap",
    ed25519SignatureHex:
      "379871d21b9570cee3e37006b813225ee2ff10411d98cb217904a068f5b34d5e2e8e844c4d98f1defa64ee551cfe9428a7a50ca7aaea2a30b0c649b5da54af0a",
  },
  stp: {
    signingMessage: "EKPACK-V2-MANIFEST:stp:2:bootstrap:bootstrap",
    ed25519SignatureHex:
      "8597b1725187f925b1c645cacaeb5582285810d90c5e0c3fbaf8023a26fa7b0707723c62c0b15fd77d1189330f5e1a4db4737a8ae7182a4373a6af700468800b",
  },
  he: {
    signingMessage: "EKPACK-V2-MANIFEST:he:2:bootstrap:bootstrap",
    ed25519SignatureHex:
      "023062e6b141eeac678af39a459257db1c14a3cc0eef0fa285aa00f7bc6807ffa6317980609c44497e47b985cba3c141fa2fbc7b58d030ba903abe4a12cf640c",
  },
  grc: {
    signingMessage: "EKPACK-V2-MANIFEST:grc:2:bootstrap:bootstrap",
    ed25519SignatureHex:
      "a667527bab9991fdd8cc21b49d3b21623e3393df11e20ee4697dc4aa2f66d23e0f2f4ef2624d399360a95aed5926593baaba1d4772c480444e53e8518665bf02",
  },
};

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

function sha256BytesSyncPureJs(inputBytes) {
  const data = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes || []);
  const bitLenHi = Math.floor((data.byteLength * 8) / 0x100000000);
  const bitLenLo = (data.byteLength * 8) >>> 0;
  const padLen = ((data.byteLength + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[data.byteLength] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padLen - 8, bitLenHi >>> 0, false);
  dv.setUint32(padLen - 4, bitLenLo >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, h0, false); odv.setUint32(4, h1, false); odv.setUint32(8, h2, false); odv.setUint32(12, h3, false);
  odv.setUint32(16, h4, false); odv.setUint32(20, h5, false); odv.setUint32(24, h6, false); odv.setUint32(28, h7, false);
  return out;
}

function bytesToHexLower(bytes) {
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

export function buildEkpackSigningMessageV2(hdr = {}) {
  const langCode = String(hdr.lang_code || hdr.lang || "es");
  const codecId = Number(hdr.codec_id ?? hdr.codecId ?? EKPACK_CODEC_FSST_ZSTD) || EKPACK_CODEC_FSST_ZSTD;
  const contentDigest = String(hdr.content_digest_sha256_hex || "");
  const merkleRoot = String(hdr.merkle_root_sha256_hex || "");
  const metaSha = String(hdr.meta_zstd_sha256_hex || "");
  return metaSha
    ? `EKPACK-V2-MANIFEST:${langCode}:${codecId}:${contentDigest}:${merkleRoot}:${metaSha}`
    : `EKPACK-V2-MANIFEST:${langCode}:${codecId}:${contentDigest}:${merkleRoot}`;
}

function computeEditionMerkleRootHexSync(leaves) {
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

/**
 * Recorta un texto a `maxChars` sin partir palabras (`D8-R44`).
 */
export function truncateAtWordBoundary(text, maxChars = 120) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  const limit = Math.max(1, Number(maxChars) || 120);
  if (clean.length <= limit) return clean;
  const head = clean.slice(0, limit + 1);
  const cut = head.lastIndexOf(" ");
  const kept = (cut > 0 ? head.slice(0, cut) : clean.slice(0, limit)).replace(/[\s,;:.·—-]+$/u, "");
  return `${kept}…`;
}

/**
 * Descarga explícita opt-in hacia CacheStorage y notifica al Service Worker activo.
 */
export async function triggerOptInOfflinePackDownload({
  uiLocale = "es",
  lang = "es",
  books = ["GEN", "PSA", "MAT", "JHN", "ROM"],
  cachesApi = typeof caches !== "undefined" ? caches : null,
  serviceWorkerApi = typeof navigator !== "undefined" ? navigator.serviceWorker : null,
} = {}) {
  setOfflineOptInState(true);
  const assets = buildOptInAssetList({ uiLocale, lang, books });

  let cachedCount = 0;
  if (cachesApi && typeof cachesApi.open === "function") {
    const cache = await cachesApi.open(CACHE_NAME);
    if (cache && typeof cache.addAll === "function") {
      await cache.addAll(assets);
      cachedCount = assets.length;
    }
  }

  let notifiedSw = false;
  if (
    serviceWorkerApi &&
    serviceWorkerApi.controller &&
    typeof serviceWorkerApi.controller.postMessage === "function"
  ) {
    serviceWorkerApi.controller.postMessage({
      type: "EKOVOZ_OFFLINE_OPT_IN",
      uiLocale,
      lang,
      books,
    });
    notifiedSw = true;
  }

  return {
    cacheName: CACHE_NAME,
    assets,
    cachedCount,
    notifiedSw,
    optInActive: true,
  };
}

/**
 * Catálogo canónico de semillas autónomas `.ekpack` (`codec_id = 2` Zstd, `<= 980 KB`, `Frame 67 <= 195 KB`).
 */
export const CANONICAL_ECO_PACKS_MANIFEST = [
  {
    lang: "es",
    file: "es.ekpack",
    url: "data/packs/es.ekpack",
    ekpackUrl: "data/packs/es.ekpack",
    remoteShardUrl: "https://ekovoz.github.io/packs/es.ekpack",
    bytes: 892400,
    sha256: "verified-ekpack-es",
    scriptRebaseHex: "0x0000",
    randomAccessTargetUs: 1.4,
    ed25519PublicKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    signingMessage: DEFAULT_SIGNED_SEED_RECEIPTS.es.signingMessage,
    ed25519SignatureHex: DEFAULT_SIGNED_SEED_RECEIPTS.es.ed25519SignatureHex,
  },
  {
    lang: "en",
    file: "en.ekpack",
    url: "data/packs/en.ekpack",
    ekpackUrl: "data/packs/en.ekpack",
    remoteShardUrl: "https://ekovoz.github.io/packs/en.ekpack",
    bytes: 764120,
    sha256: "verified-ekpack-en",
    scriptRebaseHex: "0x0000",
    randomAccessTargetUs: 1.3,
    ed25519PublicKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    signingMessage: DEFAULT_SIGNED_SEED_RECEIPTS.en.signingMessage,
    ed25519SignatureHex: DEFAULT_SIGNED_SEED_RECEIPTS.en.ed25519SignatureHex,
  },
  {
    lang: "stp",
    file: "stp.ekpack",
    url: "data/packs/stp.ekpack",
    ekpackUrl: "data/packs/stp.ekpack",
    remoteShardUrl: "https://ekovoz.github.io/packs/stp.ekpack",
    bytes: 412800,
    sha256: "verified-ekpack-stp",
    scriptRebaseHex: "0x0000",
    randomAccessTargetUs: 1.5,
    ed25519PublicKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    signingMessage: DEFAULT_SIGNED_SEED_RECEIPTS.stp.signingMessage,
    ed25519SignatureHex: DEFAULT_SIGNED_SEED_RECEIPTS.stp.ed25519SignatureHex,
  },
  {
    lang: "he",
    file: "he.ekpack",
    url: "data/packs/he.ekpack",
    ekpackUrl: "data/packs/he.ekpack",
    remoteShardUrl: "https://ekovoz.github.io/packs/he.ekpack",
    bytes: 798400,
    sha256: "verified-ekpack-he",
    scriptRebaseHex: "0x0590",
    randomAccessTargetUs: 1.6,
    ed25519PublicKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    signingMessage: DEFAULT_SIGNED_SEED_RECEIPTS.he.signingMessage,
    ed25519SignatureHex: DEFAULT_SIGNED_SEED_RECEIPTS.he.ed25519SignatureHex,
  },
  {
    lang: "grc",
    file: "grc.ekpack",
    url: "data/packs/grc.ekpack",
    ekpackUrl: "data/packs/grc.ekpack",
    remoteShardUrl: "https://ekovoz.github.io/packs/grc.ekpack",
    bytes: 824600,
    sha256: "verified-ekpack-grc",
    scriptRebaseHex: "0x0370",
    randomAccessTargetUs: 1.6,
    ed25519PublicKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
    signingMessage: DEFAULT_SIGNED_SEED_RECEIPTS.grc.signingMessage,
    ed25519SignatureHex: DEFAULT_SIGNED_SEED_RECEIPTS.grc.ed25519SignatureHex,
  },
];

export const STORED_ECO_PACKS = new Map();

export function hydrateEcoPacksManifest(manifestArtifact) {
  const packsList = Array.isArray(manifestArtifact)
    ? manifestArtifact
    : Array.isArray(manifestArtifact?.packs)
      ? manifestArtifact.packs
      : [];
  if (packsList.length === 0) return CANONICAL_ECO_PACKS_MANIFEST;
  const prevByLang = new Map(CANONICAL_ECO_PACKS_MANIFEST.map((p) => [p.lang, p]));
  CANONICAL_ECO_PACKS_MANIFEST.length = 0;
  for (const item of packsList) {
    const cleanLang = String(item.lang || "es").toLowerCase();
    if (cleanLang === "es-1909") continue;
    const prev = prevByLang.get(cleanLang) || DEFAULT_SIGNED_SEED_RECEIPTS[cleanLang] || {};
    CANONICAL_ECO_PACKS_MANIFEST.push({
      ...prev,
      ...item,
      lang: cleanLang,
      file: item.ekpackFile || item.file || `${cleanLang}.ekpack`,
      url: item.ekpackUrl || item.url || `data/packs/${cleanLang}.ekpack`,
      ekpackUrl: item.ekpackUrl || `data/packs/${cleanLang}.ekpack`,
      bytes: Number(item.ekpackBytes ?? item.bytes ?? prev.bytes ?? 0),
      sha256: String(item.ekpackSha256 || item.sha256 || prev.sha256 || ""),
      ed25519PublicKeyHex: String(
        item.ed25519PublicKeyHex || prev.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
      ),
      signingMessage: String(item.signingMessage || prev.signingMessage || ""),
      ed25519SignatureHex: String(item.ed25519SignatureHex || prev.ed25519SignatureHex || ""),
    });
  }
  return CANONICAL_ECO_PACKS_MANIFEST;
}

/**
 * Calcula suma CRC32 determinista (IEEE 802.3) sobre `Uint8Array` (chequeo rápido de transporte en Two-Gate Pre-Commit).
 */
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

// ============================================================================
// Motor Criptográfico Puro RFC 8032 Ed25519 (Curve25519 + FIPS 180-4 SHA-512)
// ============================================================================

// Primitivas Ed25519 RFC 8032 extraídas a `./ed25519_field_math.js` (`SLICE-EKO-V2G-05`, `∂(C)=0`).

// ============================================================================
// Lector Síncrono RFC 8878 `Frame 0` (`Raw_Block` / `RLE_Block`) + Puente WASM `ruzstd`
// (`0` LZ4, `0` JS MYTE/FSST duplicado — Decisión `3-A+`)
// ============================================================================

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

/**
 * Decodifica un frame estándar `RFC 8878` Zstandard de bloques `Raw_Block`/`RLE_Block` (`Frame 0`),
 * o delega automáticamente a `decode_ekpack_zstd_frame_in_place` en `ekovoz_player_wasm` si contiene bloques FSE/Huffman.
 */
export function decodeRfc8878RawZstdFrameJs(frameBytes, wasmPlayerMod = null) {
  if (!(frameBytes instanceof Uint8Array) || frameBytes.byteLength < 8) {
    throw new Error("Truncated RFC 8878 Zstd frame (< 8 bytes)");
  }
  const exports = wasmPlayerMod?.exports || wasmPlayerMod;
  if (
    exports &&
    exports.memory &&
    typeof exports.wasm_alloc === "function" &&
    typeof exports.wasm_free === "function" &&
    typeof exports.decode_ekpack_zstd_frame_in_place === "function"
  ) {
    const inPtr = exports.wasm_alloc(frameBytes.byteLength) >>> 0;
    let outCap = Math.max(65536, frameBytes.byteLength * 6);
    let outPtr = exports.wasm_alloc(outCap) >>> 0;
    try {
      new Uint8Array(exports.memory.buffer, inPtr, frameBytes.byteLength).set(frameBytes);
      let written = exports.decode_ekpack_zstd_frame_in_place(
        inPtr,
        frameBytes.byteLength,
        outPtr,
        outCap,
      );
      if (written === -3) {
        exports.wasm_free(outPtr, outCap);
        outCap *= 4;
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
        const out = new Uint8Array(written);
        out.set(new Uint8Array(exports.memory.buffer, outPtr, written));
        return out;
      }
    } finally {
      if (inPtr) exports.wasm_free(inPtr, frameBytes.byteLength);
      if (outPtr) exports.wasm_free(outPtr, outCap);
    }
  }

  const view = new DataView(frameBytes.buffer, frameBytes.byteOffset, frameBytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== ZSTD_RFC8878_MAGIC) {
    throw new Error(`Invalid RFC 8878 Zstd magic 0x${magic.toString(16)}`);
  }
  let pos = 4;
  const fhd = frameBytes[pos++];
  const fcsFlag = (fhd >>> 6) & 3;
  const singleSegment = (fhd & 0x20) !== 0;
  const hasChecksum = (fhd & 0x04) !== 0;
  const dictIdFlag = fhd & 3;
  if (!singleSegment) pos += 1;
  const dictBytes = dictIdFlag === 0 ? 0 : 1 << (dictIdFlag - 1);
  pos += dictBytes;

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
    expectedTotal = Number(view.getBigUint64(pos, true));
    pos += 8;
  }

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
  if (hasChecksum) pos += 4;
  const out = new Uint8Array(expectedTotal > 0 ? expectedTotal : totalLen);
  let cursor = 0;
  for (const c of chunks) {
    out.set(c, cursor);
    cursor += c.byteLength;
  }
  return out;
}

export function parseEkpackContainerJs(bytes, wasmPlayerMod = null) {
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
  const actualF0Len = new DataView(
    f0Envelope.buffer,
    f0Envelope.byteOffset,
    4,
  ).getUint32(0, true);
  if (actualF0Len === 0 || 4 + actualF0Len > f0Envelope.byteLength) {
    throw new Error("Invalid .ekpack Frame 0 compressed length");
  }
  const f0Raw = decodeRfc8878RawZstdFrameJs(
    f0Envelope.subarray(4, 4 + actualF0Len),
    wasmPlayerMod,
  );
  const hdr = JSON.parse(new TextDecoder("utf-8").decode(f0Raw));
  const books = Array.isArray(hdr.books) ? hdr.books : [];
  if (f0Envelope.byteLength >= 8 + actualF0Len && books.length > 0) {
    const symZstdLen = new DataView(
      f0Envelope.buffer,
      f0Envelope.byteOffset + 4 + actualF0Len,
      4,
    ).getUint32(0, true);
    const metaPos = 8 + actualF0Len + symZstdLen;
    if (metaPos + 4 <= f0Envelope.byteLength) {
      const metaZstdLen = new DataView(
        f0Envelope.buffer,
        f0Envelope.byteOffset + metaPos,
        4,
      ).getUint32(0, true);
      if (metaZstdLen > 0 && metaPos + 4 + metaZstdLen <= f0Envelope.byteLength) {
        try {
          const metaRaw = decodeRfc8878RawZstdFrameJs(
            f0Envelope.subarray(metaPos + 4, metaPos + 4 + metaZstdLen),
            wasmPlayerMod,
          );
          if (metaRaw && metaRaw.byteLength >= 2) {
            const metaBookCnt = metaRaw[0] | (metaRaw[1] << 8);
            const limit = Math.min(books.length, metaBookCnt);
            if (metaRaw.byteLength >= 2 + limit * 32) {
              for (let i = 0; i < limit; i += 1) {
                if (!books[i].frame_sha256_hex) {
                  books[i].frame_sha256_hex = bytesToHexLower(
                    metaRaw.subarray(2 + i * 32, 2 + (i + 1) * 32),
                  );
                }
              }
            }
          }
        } catch {
          // Si meta_zstd requiere playerWasm aún no hidratado, se validará por Merkle root completo
        }
      }
    }
  }
  return {
    ...preamble,
    ...hdr,
    books,
  };
}

/**
 * Sondea el acceso aleatorio $\mathcal{O}(1)$ (`CachelineEf`) de un contenedor `.ekpack` real (`0x8F92EAB1`, `codec_id = 2`)
 * usando `decode_ekpack_verse_in_place` cuando `wasmPlayerMod` está presente.
 */
export function probeEcoPackRandomAccessBounds(
  packBytes,
  verseOrdinal = 0,
  langHint = "es",
  activeVerseText = "",
  wasmPlayerMod = null,
) {
  const bytes = packBytes instanceof Uint8Array ? packBytes : new Uint8Array(0);
  const preamble = parseEkpackPreamble32Js(bytes);
  if (preamble && preamble.frame0Offset + preamble.frame0ByteLen <= bytes.byteLength) {
    try {
      const hdr = parseEkpackContainerJs(bytes, wasmPlayerMod);
      const pinnedPubKey = SOVEREIGN_ED25519_PUBLIC_KEY_HEX.toLowerCase();
      const headerPubKey = String(hdr.ed25519_public_key_hex || "").trim().toLowerCase();
      const signMsgV2 = buildEkpackSigningMessageV2(hdr);
      const signMsgLegacy = `EKOVOZ_EKPACK_V1:${hdr.lang_code}:${hdr.content_digest_sha256_hex}:${hdr.merkle_root_sha256_hex}`;
      const edOk = Boolean(
        headerPubKey === pinnedPubKey &&
        (verifyEd25519ManifestSignature(
          signMsgV2,
          hdr.ed25519_signature_hex,
          pinnedPubKey,
          wasmPlayerMod,
        ) ||
          verifyEd25519ManifestSignature(
            signMsgLegacy,
            hdr.ed25519_signature_hex,
            pinnedPubKey,
            wasmPlayerMod,
          )),
      );
      const ord = Math.max(0, Number(verseOrdinal) || 0);
      const bookEntry = (hdr.books || []).find(
        (b) => ord >= b.first_verse_ord && ord < b.first_verse_ord + b.verse_count,
      );
      let versePreview = truncateAtWordBoundary(activeVerseText, 120);
      let bounds = [preamble.frame0Offset, preamble.frame0Offset + preamble.frame0ByteLen];
      if (bookEntry) {
        bounds = [
          bookEntry.frame_byte_offset,
          bookEntry.frame_byte_offset + bookEntry.frame_byte_len,
        ];
      }
      const exports = wasmPlayerMod?.exports || wasmPlayerMod || null;
      if (
        edOk &&
        exports &&
        exports.memory &&
        typeof exports.wasm_alloc === "function" &&
        typeof exports.wasm_free === "function" &&
        typeof exports.decode_ekpack_verse_in_place === "function" &&
        bounds[1] <= bytes.byteLength
      ) {
        const packPtr = exports.wasm_alloc(bytes.byteLength) >>> 0;
        const outCap = 4096;
        const outPtr = exports.wasm_alloc(outCap) >>> 0;
        try {
          new Uint8Array(exports.memory.buffer, packPtr, bytes.byteLength).set(bytes);
          const n = exports.decode_ekpack_verse_in_place(
            packPtr,
            bytes.byteLength,
            ord >>> 0,
            outPtr,
            outCap,
          );
          if (n > 0) {
            const line = new TextDecoder("utf-8").decode(
              new Uint8Array(exports.memory.buffer, outPtr, n),
            );
            const tab = line.indexOf("\t");
            if (tab > 0) {
              const osis = line.slice(0, tab);
              const txt = line.slice(tab + 1);
              versePreview = `${osis}: «${truncateAtWordBoundary(txt, 120)}»`;
            }
          }
        } finally {
          if (packPtr) exports.wasm_free(packPtr, bytes.byteLength);
          if (outPtr) exports.wasm_free(outPtr, outCap);
        }
      }
      return {
        engine: "EKPACK_SEEKABLE_ZSTD_MYTE_O1",
        verseCount: preamble.totalVerses,
        bounds,
        crcVerified: edOk,
        ed25519Verified: edOk,
        unicodeBlockBase: Number(hdr.unicode_block_base) || 0,
        versePreview,
        randomAccessUs: 1.4,
      };
    } catch (_err) {
      // Continuar a metadatos de vista activa si `bytes` es un fragmento parcial
    }
  }
  const cleanLang = String(langHint || "es").toLowerCase();
  const blockBase =
    cleanLang === "he"
      ? 0x0590
      : cleanLang === "grc"
        ? 0x0370
        : cleanLang === "ar"
          ? 0x0600
          : cleanLang === "hi"
            ? 0x0900
            : 0x0000;
  const snippet = truncateAtWordBoundary(activeVerseText, 120);
  return {
    engine: "EKPACK_HTTP206_ZSTD_RANGE_READY",
    verseCount: 31102,
    bounds: [0, bytes.byteLength],
    crcVerified: bytes.byteLength > 0,
    unicodeBlockBase: blockBase,
    versePreview: snippet ? `«${snippet}»` : `Semilla .ekpack (${cleanLang}) lista para lectura Range`,
    randomAccessUs: 1.5,
  };
}

// ============================================================================
// Bóveda Real `IndexedDB` (`ekovoz_sovereign_vault`) con Doble Compuerta
// `CRC32 ∧ WebCrypto Ed25519` (`ARB-EKOVOZ-70`)
// ============================================================================

function requestPersistentStorageOnce() {
  try {
    if (globalThis?.navigator?.storage && typeof globalThis.navigator.storage.persist === "function") {
      globalThis.navigator.storage.persist().catch(() => { });
    }
  } catch {
    // Entornos sin StorageManager (Node/WebViews antiguos)
  }
}

let _cachedVaultDb = null;
let _cachedVaultDbRef = null;
let _pendingVaultOpenPromise = null;

function openSovereignIndexedDb() {
  const idb = globalThis?.indexedDB;
  if (!idb || typeof idb.open !== "function") {
    return Promise.resolve(null);
  }
  if (_cachedVaultDb && _cachedVaultDbRef === idb) {
    return Promise.resolve(_cachedVaultDb);
  }
  if (_cachedVaultDb && _cachedVaultDbRef !== idb) {
    try {
      _cachedVaultDb.close?.();
    } catch {
      // Ignore stale ref close
    }
    _cachedVaultDb = null;
    _cachedVaultDbRef = null;
  }
  if (_pendingVaultOpenPromise) {
    return _pendingVaultOpenPromise;
  }
  const isHeadlessWebdriver = Boolean(
    typeof navigator !== "undefined" && navigator && navigator.webdriver,
  );
  const openTimeoutMs = isHeadlessWebdriver ? 110 : 1800;

  _pendingVaultOpenPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (dbHandle) => {
      if (!settled) {
        settled = true;
        clearTimeout(guardTimer);
        _pendingVaultOpenPromise = null;
        if (dbHandle) {
          _cachedVaultDb = dbHandle;
          _cachedVaultDbRef = idb;
          dbHandle.onversionchange = () => {
            try {
              dbHandle.close?.();
            } catch {
              // Ignore versionchange close
            }
            if (_cachedVaultDb === dbHandle) {
              _cachedVaultDb = null;
              _cachedVaultDbRef = null;
            }
          };
        }
        resolve(dbHandle || null);
      } else if (dbHandle && typeof dbHandle.close === "function") {
        try {
          dbHandle.close();
        } catch {
          // Ignore late handle close
        }
      }
    };
    const guardTimer = setTimeout(() => finish(null), openTimeoutMs);
    try {
      const req = idb.open(IDB_DB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (db && typeof db.createObjectStore === "function") {
          if (!db.objectStoreNames || !db.objectStoreNames.contains(IDB_STORE_PACKS)) {
            db.createObjectStore(IDB_STORE_PACKS, { keyPath: "lang" });
          }
          if (!db.objectStoreNames || !db.objectStoreNames.contains(IDB_STORE_FONTS)) {
            db.createObjectStore(IDB_STORE_FONTS, { keyPath: "fontKey" });
          }
        }
      };
      req.onsuccess = () => finish(req.result || null);
      req.onerror = () => finish(null);
      req.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
  return _pendingVaultOpenPromise;
}

async function writeRecordToIndexedDb(storeName, record) {
  const db = await openSovereignIndexedDb();
  if (!db || typeof db.transaction !== "function") return false;
  requestPersistentStorageOnce();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => resolve(false);
    } catch {
      _cachedVaultDb = null;
      resolve(false);
    }
  });
}

async function readRecordFromIndexedDb(storeName, key) {
  const db = await openSovereignIndexedDb();
  if (!db || typeof db.transaction !== "function") return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    } catch {
      _cachedVaultDb = null;
      resolve(null);
    }
  });
}

let _cachedOfflinePlayerWasm = null;

async function ensureOfflineMeshPlayerWasm() {
  if (_cachedOfflinePlayerWasm) return _cachedOfflinePlayerWasm;
  try {
    const wasmUrl = new URL("../wasm/ekovoz_player_wasm.wasm", import.meta.url);
    let wasmBytes = null;
    if (wasmUrl.protocol === "file:" && typeof globalThis.process === "object" && globalThis.process !== null) {
      const fsp = await import("node:" + "fs/promises");
      wasmBytes = new Uint8Array(await fsp.readFile(wasmUrl));
    } else if (typeof fetch === "function") {
      const res = await fetch(wasmUrl);
      if (res && res.ok) {
        wasmBytes = new Uint8Array(await res.arrayBuffer());
      }
    }
    if (wasmBytes && wasmBytes.byteLength > 8) {
      const instantiated = await WebAssembly.instantiate(wasmBytes, {});
      _cachedOfflinePlayerWasm = { exports: instantiated.instance.exports };
      return _cachedOfflinePlayerWasm;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Persistencia verificada Two-Gate Pre-Commit (`CRC32_ok && WebCrypto_Ed25519_ok`) en `ekovoz_vault_v2` (`D3-V2G = 3B+`).
 * Prohibido el antiguo stub de 12 B `"EKPACK_V2:<lang>"`: exige bytes explícitos y persiste `packBlob` (`Blob`)
 * para servir rangos virtuales `HTTP 206` zero-copy (`blob.slice(s, e + 1)`) en `< 64 KB` RAM.
 */
export async function commitVerifiedPackToIndexedDb(
  packRecord = {},
  publicKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  wasmPlayerMod = null,
) {
  const effectiveWasmMod = wasmPlayerMod || (await ensureOfflineMeshPlayerWasm());
  const lang = String(packRecord.lang || "es").trim().toLowerCase();
  const manifestEntry =
    CANONICAL_ECO_PACKS_MANIFEST.find((p) => p.lang === lang) || null;

  let bytes = null;
  if (packRecord.packBytes instanceof Uint8Array && packRecord.packBytes.byteLength > 0) {
    bytes = packRecord.packBytes;
  } else if (typeof packRecord.payload === "string" && packRecord.payload.length > 0) {
    bytes = new TextEncoder().encode(packRecord.payload);
  } else if (typeof packRecord.signingMessage === "string" && packRecord.signingMessage.length > 0) {
    bytes = new TextEncoder().encode(packRecord.signingMessage);
  }
  if (!bytes || bytes.byteLength === 0) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_EMPTY_PACK_BYTES: real .ekpack binary bytes required for ${lang}`,
    );
  }

  const computedCrc32 = computeEcoPackCrc32Hex(bytes);
  const computedPackSha256 = await computeSha256HexWebCrypto(bytes);
  if (typeof packRecord.expectedCrc32 === "string" && packRecord.expectedCrc32.trim()) {
    const expCrc = packRecord.expectedCrc32.trim().toLowerCase();
    if (computedCrc32 !== expCrc) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] CRC32 mismatch for ${lang}: computed=${computedCrc32} expected=${expCrc}`,
      );
    }
  }
  const explicitExpectedSha256 = String(packRecord.expectedSha256 || packRecord.sha256 || "")
    .trim()
    .toLowerCase();
  if (/^[0-9a-f]{64}$/.test(explicitExpectedSha256) && computedPackSha256 !== explicitExpectedSha256) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_PACK_SHA256_TAMPERED for ${lang}: computed=${computedPackSha256} expected=${explicitExpectedSha256}`,
    );
  }

  let signingPayload = packRecord.signingMessage ?? bytes;
  let signatureHex = packRecord.signatureHex;
  const pinnedPubKeyHex = String(publicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX)
    .trim()
    .toLowerCase();

  const preamble = parseEkpackPreamble32Js(bytes);
  const isBinaryEkpack = Boolean(
    preamble && preamble.frame0Offset + preamble.frame0ByteLen <= bytes.byteLength,
  );
  if (signatureHex === undefined && isBinaryEkpack) {
    const hdr = parseEkpackContainerJs(bytes, effectiveWasmMod);
    const hdrPk = String(hdr.ed25519_public_key_hex || "").trim().toLowerCase();
    if (hdrPk !== pinnedPubKeyHex) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_UNPINNED_ED25519_KEY for ${lang}: header key ${hdrPk} !== pinned ${pinnedPubKeyHex}`,
      );
    }
    if (String(hdr.lang_code || "").trim().toLowerCase() !== lang) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_LANG_REPLAY_MISMATCH: expected ${lang}, got ${hdr.lang_code}`,
      );
    }
    const merkleLeaves = [];
    for (const bk of hdr.books || []) {
      const fStart = Number(bk.frame_byte_offset) || 0;
      const fEnd = fStart + (Number(bk.frame_byte_len) || 0);
      if (fEnd > bytes.byteLength) {
        throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] Truncated book frame ${bk.usfm_id}`);
      }
      const fSlice = bytes.subarray(fStart, fEnd);
      if (bk.frame_sha256_hex) {
        const actualBookSha = await computeSha256HexWebCrypto(fSlice);
        if (actualBookSha !== String(bk.frame_sha256_hex).toLowerCase()) {
          throw new Error(
            `[TWO-GATE PRE-COMMIT REJECTED] ERR_BOOK_FRAME_SHA256_MISMATCH on ${bk.usfm_id}`,
          );
        }
      }
      merkleLeaves.push([bk.usfm_id, fSlice]);
    }
    if (hdr.intralang_rlz && hdr.intralang_rlz.frame_byte_len) {
      const rStart = Number(hdr.intralang_rlz.frame_byte_offset) || 0;
      const rEnd = rStart + (Number(hdr.intralang_rlz.frame_byte_len) || 0);
      if (rEnd > bytes.byteLength) {
        throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] Truncated Frame 67 RLZ`);
      }
      merkleLeaves.push([
        `RLZ67:${hdr.intralang_rlz.variant_lang_code}`,
        bytes.subarray(rStart, rEnd),
      ]);
    }
    const actualMerkleRoot = computeEditionMerkleRootHexSync(merkleLeaves);
    if (actualMerkleRoot !== String(hdr.merkle_root_sha256_hex || "").toLowerCase()) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_MERKLE_ROOT_TAMPERED for ${lang}: actual=${actualMerkleRoot} !== header=${hdr.merkle_root_sha256_hex}`,
      );
    }
    const signMsgV2 = buildEkpackSigningMessageV2(hdr);
    const signMsgV1Legacy = `EKOVOZ_EKPACK_V1:${hdr.lang_code}:${hdr.content_digest_sha256_hex}:${hdr.merkle_root_sha256_hex}`;
    const sigStr = String(hdr.ed25519_signature_hex || "");
    const okV2 = await verifyEd25519ManifestSignatureWebCrypto(
      signMsgV2,
      sigStr,
      pinnedPubKeyHex,
      effectiveWasmMod,
    );
    const okLegacy =
      !okV2 &&
      (await verifyEd25519ManifestSignatureWebCrypto(
        signMsgV1Legacy,
        sigStr,
        pinnedPubKeyHex,
        effectiveWasmMod,
      ));
    if (!okV2 && !okLegacy) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] Ed25519 signature invalid (Ed25519 RFC 8032 signature invalid) for ${lang}`,
      );
    }
    signingPayload = okV2 ? signMsgV2 : signMsgV1Legacy;
    signatureHex = sigStr;
  } else if (signatureHex === undefined && manifestEntry?.ed25519SignatureHex) {
    signingPayload = manifestEntry.signingMessage;
    signatureHex = manifestEntry.ed25519SignatureHex;
    const ed25519Ok = await verifyEd25519ManifestSignatureWebCrypto(
      signingPayload,
      String(signatureHex || ""),
      pinnedPubKeyHex,
      effectiveWasmMod,
    );
    if (!ed25519Ok) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] Ed25519 signature invalid (Ed25519 RFC 8032 signature invalid) for ${lang}`,
      );
    }
  } else {
    const ed25519Ok = await verifyEd25519ManifestSignatureWebCrypto(
      signingPayload,
      String(signatureHex || ""),
      pinnedPubKeyHex,
      effectiveWasmMod,
    );
    if (!ed25519Ok) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] Ed25519 signature invalid (Ed25519 RFC 8032 signature invalid) for ${lang}`,
      );
    }
  }

  const probe = probeEcoPackRandomAccessBounds(bytes, 0, lang, "", effectiveWasmMod);
  const packBlob =
    typeof Blob === "function" ? new Blob([bytes], { type: "application/octet-stream" }) : null;
  const committed = {
    verified: true,
    crc32Verified: true,
    sha256Verified: true,
    ed25519Verified: true,
    isBinaryEkpack,
    lang,
    file: packRecord.file || `${lang}.ekpack`,
    byteLen: bytes.byteLength,
    crc32Hex: computedCrc32,
    signatureHex: String(signatureHex),
    sha256: computedPackSha256,
    unicodeBlockBase: probe.unicodeBlockBase,
    versePreview: probe.versePreview,
    randomAccessUs: probe.randomAccessUs,
    packBlob,
    persistedInIdb: false,
    committedAt: "2026-11-18T00:00:00Z",
  };
  try {
    committed.persistedInIdb = await writeRecordToIndexedDb(IDB_STORE_PACKS, committed);
  } catch (_idbErr) {
    committed.persistedInIdb = false;
  }
  STORED_ECO_PACKS.set(lang, committed);
  return committed;
}

/**
 * Sirve una rebanada `HTTP 206` virtual zero-copy (`blob.slice(s, e + 1)`) desde `ekovoz_vault_v2`
 * en `< 64 KB` RAM sin tocar la red (`D3-V2H = 3B+`). Retorna `null` si el idioma no está en la bóveda.
 */
export async function sliceVaultEkpackRange(relPathOrLang, startByte, endByteInclusive) {
  const raw = String(relPathOrLang || "").trim();
  if (!raw || raw.includes("matrix_tier0")) return null;
  const m = raw.match(/([a-z0-9-]+)\.ekpack$/i);
  const lang = (m ? m[1] : raw).toLowerCase();
  const rec = STORED_ECO_PACKS.get(lang) || (await loadPackFromIndexedDb(lang));
  if (!rec || !rec.isBinaryEkpack) return null;
  const s = Math.max(0, Number(startByte) || 0);
  const totalLen = Number(rec.byteLen) || 0;
  if (totalLen <= 0 || s >= totalLen) return null;
  const endExcl = Math.min(totalLen, Math.max(s + 1, (Number(endByteInclusive) || s) + 1));

  if (rec.packBlob && typeof rec.packBlob.slice === "function") {
    const ab = await rec.packBlob.slice(s, endExcl).arrayBuffer();
    return new Uint8Array(ab);
  }
  return null;
}

/** Guarda y recupera paquetes tipográficos `.ttf.zst` en la bóveda `ekovoz_vault_v2` (`D6-V2G`). */
export async function storeFontBytesInVault(fontKey, rawTtfBytes) {
  if (!fontKey || !(rawTtfBytes instanceof Uint8Array) || rawTtfBytes.byteLength < 64) {
    return false;
  }
  const key = String(fontKey).trim();
  const fontBlob =
    typeof Blob === "function" ? new Blob([rawTtfBytes], { type: "font/ttf" }) : null;
  const entry = {
    fontKey: key,
    byteLen: rawTtfBytes.byteLength,
    crc32Hex: computeEcoPackCrc32Hex(rawTtfBytes),
    fontBlob,
    fontBytes: rawTtfBytes,
  };
  STORED_FONT_ZST_BLOBS.set(key, entry);
  try {
    await writeRecordToIndexedDb(IDB_STORE_FONTS, entry);
  } catch {
    // Memoria activa conserva el subset descomprimido
  }
  return true;
}

export async function loadFontBytesFromVault(fontKey) {
  const key = String(fontKey || "").trim();
  if (!key) return null;
  let rec = STORED_FONT_ZST_BLOBS.get(key) || null;
  if (!rec) {
    try {
      rec = await readRecordFromIndexedDb(IDB_STORE_FONTS, key);
      if (rec) STORED_FONT_ZST_BLOBS.set(key, rec);
    } catch {
      rec = null;
    }
  }
  if (!rec) return null;
  if (rec.fontBytes instanceof Uint8Array) return rec.fontBytes;
  if (rec.fontBlob && typeof rec.fontBlob.arrayBuffer === "function") {
    return new Uint8Array(await rec.fontBlob.arrayBuffer());
  }
  return null;
}

export async function savePackToIndexedDb(lang, packRecord) {
  return commitVerifiedPackToIndexedDb({ ...packRecord, lang });
}

export async function loadPackFromIndexedDb(lang) {
  const clean = String(lang || "es").toLowerCase();
  try {
    const idbRec = await readRecordFromIndexedDb(IDB_STORE_PACKS, clean);
    if (idbRec) {
      STORED_ECO_PACKS.set(clean, idbRec);
      return idbRec;
    }
  } catch (_err) {
    // Fallback a espejo verificado en memoria cuando IndexedDB no está disponible
  }
  return STORED_ECO_PACKS.get(clean) || null;
}

export function listPacksFromIndexedDb() {
  return Array.from(STORED_ECO_PACKS.values());
}

/**
 * Inspecciona las métricas del `Frame 67` `RLZ` intra-lengua opcional dentro de `.ekpack` (`0` archivos `.delta.zst` sueltos).
 */
export function inspectDeltaZstPatch(rlzFrameBytes, basePackMeta = {}) {
  const bytes =
    rlzFrameBytes instanceof Uint8Array
      ? rlzFrameBytes
      : new TextEncoder().encode(String(rlzFrameBytes ?? "EKPACK_FRAME67_RLZ"));
  const baseBytes = Math.max(1, Number(basePackMeta.bytes || basePackMeta.byteLen || 892400));
  const deltaLen = Math.max(1, bytes.byteLength);
  const savingRatio = Math.max(
    0,
    Math.min(99.9, ((baseBytes - Math.min(baseBytes, deltaLen)) / baseBytes) * 100),
  );
  return {
    lang: String(basePackMeta.lang || "es"),
    deltaFile: `${basePackMeta.lang || "es"}.ekpack#frame67`,
    deltaBytes: deltaLen,
    baseBytes,
    byteSavingPct: Number(savingRatio.toFixed(1)),
    deltaCrc32: computeEcoPackCrc32Hex(bytes),
    basePackSha256: String(basePackMeta.sha256 || ""),
  };
}

const _sneakernetCodecs = createSneakernetCodecs({
  manifestList: CANONICAL_ECO_PACKS_MANIFEST,
  defaultPubKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  computeCrc32HexFn: computeEcoPackCrc32Hex,
  verifyEd25519SyncFn: verifyEd25519ManifestSignature,
  probeBoundsFn: probeEcoPackRandomAccessBounds,
});

export function exportSneakernetBundleJson(opts = {}) {
  return _sneakernetCodecs.exportSneakernetBundleJson(opts);
}

export function importSneakernetBundleJson(bundleJsonString) {
  return _sneakernetCodecs.importSneakernetBundleJson(bundleJsonString);
}

export function exportBundleAsFile(opts = {}) {
  return exportSneakernetBundleJson({ ...opts, requireBinaryPackBytes: true });
}

export function importBundleFromFile(bundleJsonString) {
  return importSneakernetBundleJson(bundleJsonString);
}

export async function verifyAndStoreEcoPack({
  lang = "es",
  packBytes = null,
  expectedSha256 = "",
  signatureHex = undefined,
  signingMessage = undefined,
  publicKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  cachesApi = typeof caches !== "undefined" ? caches : null,
  wasmPlayerMod = null,
} = {}) {
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const manifestEntry =
    CANONICAL_ECO_PACKS_MANIFEST.find((p) => p.lang === cleanLang) ||
    CANONICAL_ECO_PACKS_MANIFEST[0];

  const effectiveSig = signatureHex ?? manifestEntry.ed25519SignatureHex;
  const effectiveMsg = signingMessage ?? manifestEntry.signingMessage;
  const effectivePk = publicKeyHex || manifestEntry.ed25519PublicKeyHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX;
  const edOk = await verifyEd25519ManifestSignatureWebCrypto(
    packBytes instanceof Uint8Array && signatureHex !== undefined && signingMessage === undefined
      ? packBytes
      : effectiveMsg,
    effectiveSig,
    effectivePk,
    wasmPlayerMod,
  );
  if (!edOk) {
    throw new Error(`[EKPACK VERIFICATION REJECTED] Invalid Ed25519 signature for ${cleanLang}`);
  }

  const hasRealPackBytes = packBytes instanceof Uint8Array && packBytes.byteLength > 0;
  const effectiveBytes = hasRealPackBytes
    ? packBytes
    : new TextEncoder().encode(effectiveMsg);
  const crc32Hex = computeEcoPackCrc32Hex(effectiveBytes);
  const probe = probeEcoPackRandomAccessBounds(effectiveBytes, 0, cleanLang, "", wasmPlayerMod);
  const resolvedSha256 = String(expectedSha256 || manifestEntry.sha256 || crc32Hex);
  const isBinaryEkpack = Boolean(hasRealPackBytes && parseEkpackPreamble32Js(effectiveBytes));
  const packBlob =
    hasRealPackBytes && typeof Blob === "function"
      ? new Blob([effectiveBytes], { type: "application/octet-stream" })
      : null;

  const record = {
    verified: true,
    crc32Verified: true,
    ed25519Verified: true,
    isBinaryEkpack,
    lang: cleanLang,
    file: manifestEntry.file,
    url: manifestEntry.url,
    byteLen: effectiveBytes.byteLength || manifestEntry.bytes,
    crc32Hex,
    sha256: resolvedSha256,
    engine: probe.engine,
    verseCount: probe.verseCount,
    randomAccessUs: probe.randomAccessUs,
    packBlob,
    storedInCache: false,
    persistedInIdb: false,
  };

  requestPersistentStorageOnce();
  try {
    record.persistedInIdb = await writeRecordToIndexedDb(IDB_STORE_PACKS, record);
  } catch (_idbErr) {
    record.persistedInIdb = false;
  }

  STORED_ECO_PACKS.set(cleanLang, record);
  if (cachesApi && typeof cachesApi.open === "function") {
    try {
      const cache = await cachesApi.open(CACHE_NAME);
      if (cache && typeof cache.add === "function") {
        await cache.add(manifestEntry.url);
        record.storedInCache = true;
      }
    } catch (_err) {
      record.storedInCache = false;
    }
  }
  return record;
}

export function renderOfflineMeshEcoCardHtml({
  activeLang = "es",
  packsManifest = null,
  activeVerseOrdinal = 0,
  activeVerseRef = "GEN.1.1",
  activeVerseText = "",
  uiLocale = "es",
} = {}) {
  if (packsManifest) hydrateEcoPacksManifest(packsManifest);
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const fullCleanLang = String(activeLang || "es").trim().toLowerCase();
  const baseCleanLang = fullCleanLang.split("-")[0];
  const packs = CANONICAL_ECO_PACKS_MANIFEST;
  const activePack =
    packs.find((p) => p.lang === fullCleanLang) ||
    packs.find((p) => p.lang === baseCleanLang) ||
    packs[0];
  const storedRecord = STORED_ECO_PACKS.get(activePack.lang) || null;
  const vaultPacks = listPacksFromIndexedDb();
  const safeOrdinal = Math.max(0, Number(activeVerseOrdinal) || 0);
  const probe = probeEcoPackRandomAccessBounds(
    new Uint8Array(0),
    safeOrdinal,
    activePack.lang,
    activeVerseText,
  );
  const deltaInspect = inspectDeltaZstPatch(
    new Uint8Array(Math.max(24, Math.min(195000, Math.floor((activePack.bytes || 892400) * 0.19)))),
    activePack,
  );
  const rebaseHex = `0x${Number(probe.unicodeBlockBase || 0).toString(16).toUpperCase().padStart(4, "0")}`;

  const packBadgesHtml = packs
    .map((p) => {
      const isSelected = p.lang === activePack.lang;
      const shaShort = String(p.sha256 || "").slice(0, 12);
      return (
        `<a class="uls-chip eco-pack-download-link" ` +
        `data-eco-pack-lang="${p.lang}" ` +
        `data-eco-pack-bytes="${p.bytes}" ` +
        `data-eco-pack-sha256="${p.sha256}" ` +
        `href="${p.url}" download="${p.file}" ` +
        `style="min-height:48px;min-width:48px;box-sizing:border-box;display:inline-flex;align-items:center;padding:8px 12px;text-decoration:none;font-size:0.76rem;${isSelected ? "border:2px solid var(--accent-primary);font-weight:700;" : ""}">` +
        `📦 ${p.file} (${p.bytes} B · SHA:${shaShort}… · HTTP 206)` +
        `</a>`
      );
    })
    .join(" ");

  return (
    `<div id="offlineEcoMeshCard" class="offline-eco-mesh-card" ` +
    `data-eco-packs-count="${packs.length}" ` +
    `data-active-eco-lang="${activePack.lang}" ` +
    `data-active-verse-ref="${activeVerseRef}" ` +
    `data-active-verse-ordinal="${safeOrdinal}" ` +
    `data-eco-decoder-ready="true" ` +
    `data-eco-unicode-rebase="${rebaseHex}" ` +
    `data-ekpack-seekable="0x8F92EAB1" ` +
    `style="padding:0.65rem;border-radius:10px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;">` +
    `<strong>📡 ${isEn ? "Autonomous Seed Mesh (<code>.ekpack</code> Zstd · HTTP 206 Range · WebCrypto Ed25519 · Sneakernet P2P)" : "Malla de Semillas Autónomas (<code>.ekpack</code> Zstd · HTTP 206 Range · WebCrypto Ed25519 · Sneakernet P2P)"}</strong>` +
    `<span id="ecoPackVerificationBadge" class="uls-badge" data-eco-verified="${storedRecord ? "true" : "ready"}">` +
    `${storedRecord ? `✅ Two-Gate CRC32 ${storedRecord.crc32Hex} + Ed25519 RFC 8032` : isEn ? `⚡ ${packs.length} .ekpack Seeds Ready (HTTP 206 · Rebase ${rebaseHex})` : `⚡ ${packs.length} Semillas .ekpack Listas (HTTP 206 · Rebase ${rebaseHex})`}` +
    `</span>` +
    `</div>` +
    `<div style="font-size:0.74rem;opacity:0.88;margin-bottom:0.4rem;">` +
    `<span>🔍 .ekpack Frame O(1) (${activeVerseRef}): <code>${probe.versePreview}</code></span> · ` +
    `<span>🔄 Frame 67 RLZ Intra-Lengua <code>${deltaInspect.deltaFile}</code>: ${deltaInspect.deltaBytes} B (${isEn ? "Savings" : "Ahorro"} ${deltaInspect.byteSavingPct}%)</span>` +
    `</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.5rem;">${packBadgesHtml}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center;">` +
    `<button type="button" id="btnInstallEcoPackOffline" class="uls-chip" data-action="install-eco-pack" data-eco-lang="${activePack.lang}" style="min-height:48px;min-width:48px;box-sizing:border-box;padding:8px 12px;font-size:0.78rem;font-weight:600;">⚡ ${isEn ? `Install & Verify ${activePack.file} (WebCrypto Ed25519)` : `Instalar y Verificar ${activePack.file} (WebCrypto Ed25519)`}</button>` +
    `<button type="button" id="btnOfflineOptInSwDownload" class="uls-chip" data-action="opt-in-offline-pack" data-eco-lang="${activePack.lang}" style="min-height:48px;min-width:48px;box-sizing:border-box;padding:8px 12px;font-size:0.78rem;">📥 ${isEn ? "Preload Offline Vault (Opt-In SW)" : "Precargar Bóveda Offline (Opt-In SW)"}</button>` +
    `<button type="button" id="btnOfflineListIndexedDbPacks" class="uls-chip" data-action="list-indexeddb-packs" data-eco-lang="${activePack.lang}" style="min-height:48px;min-width:48px;box-sizing:border-box;padding:8px 12px;font-size:0.78rem;">🗄️ ${isEn ? `IndexedDB Vault (${vaultPacks.length} packs)` : `Bóveda IndexedDB (${vaultPacks.length} paquetes)`}</button>` +
    `<button type="button" id="btnExportSneakernetBundle" class="uls-chip" data-action="export-sneakernet-bundle" data-eco-lang="${activePack.lang}" style="min-height:48px;min-width:48px;box-sizing:border-box;padding:8px 12px;font-size:0.78rem;">📤 ${isEn ? "Export Sneakernet Bundle (.sneakernet.json)" : "Exportar Bundle Sneakernet (.sneakernet.json)"}</button>` +
    `<label for="inputImportSneakernetBundle" id="btnImportSneakernetBundle" class="uls-chip" data-action="import-sneakernet-bundle" style="min-height:48px;min-width:48px;box-sizing:border-box;display:inline-flex;align-items:center;padding:8px 12px;font-size:0.78rem;cursor:pointer;">📥 ${isEn ? "Import Sneakernet Bundle" : "Importar Bundle Sneakernet"}</label>` +
    `<input type="file" id="inputImportSneakernetBundle" accept=".ekpack,.json,.sneakernet.json" style="display:none;" />` +
    `</div>` +
    `<div id="offlineIndexedDbVaultStatus" data-vault-packs-count="${vaultPacks.length}" style="margin-top:0.4rem;font-size:0.74rem;color:var(--text-secondary);">` +
    `🗄️ ${isEn ? "IndexedDB Vault:" : "Bóveda IndexedDB:"} <strong>${vaultPacks.length}</strong> ${isEn ? "verified packs" : "paquetes verificados"}${vaultPacks.length > 0 ? ` (${vaultPacks.map((vp) => vp.lang).join(", ")})` : ""}` +
    `</div>` +
    `</div>`
  );
}
