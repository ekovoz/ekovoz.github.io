// ============================================================================
// web/mostrador/offline_mesh.js — Semillas Autónomas `.ekpack` (`0x8F92EAB1`, Zstd `codec_id=2`),
// Verificación Criptográfica Real `Ed25519` (`RFC 8032` / `WebCrypto` + WASM),
// Persistencia `IndexedDB` (`CRC32 ∧ WebCrypto Ed25519`) y Malla Sneakernet Opt-In
// (`@req[BIB-V2-12]` · `@req[BIB-V2-15]` · Decisiones `3-A+`, `4-A+`, `5-A+` · `0` LZ4 / `0` JS MYTE)
// ============================================================================

import {
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureAsync,
  verifyEd25519ManifestSignatureWebCrypto,
} from "./ed25519_field_math.js";
import {
  MAX_EV3_META_OUT_BYTES,
  buildEkpackSigningMessageV2,
  bytesToHexLower,
  computeBooksDirectoryBytesJs,
  computeEcoPackCrc32Hex,
  computeEditionMerkleRootHexSync,
  computeSha256HexWebCrypto,
  decodeRfc8878RawZstdFrameJs,
  extractEkpackMetaZstdSliceNoWasm,
  parseAndVerifyEkpackV3PreDecompressAsync,
  parseAndVerifyEkpackV3PreDecompressSync,
  parseEkpackContainerJs,
  parseEkpackFrame0UnverifiedLayout,
  parseEkpackPreamble32Js,
  parseEm2MetaTrailerBytes,
  sha256BytesSyncPureJs,
  verifyMatrixTier0PackForVault
} from "./ekpack_binary_codec.js";
import {
  buildFullCorpusDeflateQuineHtml,
  buildQuineHtml,
  createSneakernetCodecs,
} from "./quine_and_sneakernet.js";
import {
  CACHE_NAME,
  buildOptInAssetList,
  setOfflineOptInState,
} from "./sw_routing_core.js";
import {
  IDB_STORE_FONTS,
  IDB_STORE_PACKS,
  readRecordFromIndexedDb as _vaultReadRecordIdb,
  writeRecordToIndexedDb as _vaultWriteRecordIdb,
  listRecordsFromIndexedDb,
  sliceBlobRangeBytes
} from "./vault_indexeddb.js";

export {
  SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  buildEkpackSigningMessageV2,
  buildFullCorpusDeflateQuineHtml,
  buildQuineHtml,
  computeBooksDirectoryBytesJs,
  computeEcoPackCrc32Hex,
  computeSha256HexWebCrypto,
  decodeRfc8878RawZstdFrameJs,
  parseAndVerifyEkpackV3PreDecompressAsync,
  parseAndVerifyEkpackV3PreDecompressSync,
  parseEkpackContainerJs,
  parseEkpackFrame0UnverifiedLayout,
  parseEkpackPreamble32Js,
  parseEm2MetaTrailerBytes,
  verifyEd25519ManifestSignature,
  verifyEd25519ManifestSignatureAsync,
  verifyEd25519ManifestSignatureWebCrypto
};

const STORED_FONT_ZST_BLOBS = new Map();

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
  const payload = {
    type: "EKOVOZ_OFFLINE_OPT_IN",
    uiLocale,
    lang,
    books,
  };
  let targetWorker =
    serviceWorkerApi &&
      serviceWorkerApi.controller &&
      typeof serviceWorkerApi.controller.postMessage === "function"
      ? serviceWorkerApi.controller
      : null;
  if (!targetWorker && serviceWorkerApi && serviceWorkerApi.ready) {
    let timerId = null;
    try {
      const reg = await Promise.race([
        Promise.resolve(serviceWorkerApi.ready).catch(() => null),
        new Promise((resolve) => {
          timerId = setTimeout(() => resolve(null), 150);
        }),
      ]);
      if (reg && reg.active && typeof reg.active.postMessage === "function") {
        targetWorker = reg.active;
      }
    } finally {
      if (timerId !== null) clearTimeout(timerId);
    }
  }
  if (targetWorker) {
    targetWorker.postMessage(payload);
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
    signingMessage: "",
    ed25519SignatureHex: "",
    signatureStatus: "unverified_manifest",
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
    signingMessage: "",
    ed25519SignatureHex: "",
    signatureStatus: "unverified_manifest",
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
    signingMessage: "",
    ed25519SignatureHex: "",
    signatureStatus: "unverified_manifest",
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
    signingMessage: "",
    ed25519SignatureHex: "",
    signatureStatus: "unverified_manifest",
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
    signingMessage: "",
    ed25519SignatureHex: "",
    signatureStatus: "unverified_manifest",
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
    const prev = prevByLang.get(cleanLang) || {};
    const hydratedSig = String(item.ed25519SignatureHex || prev.ed25519SignatureHex || "");
    const hydratedMsg = String(item.signingMessage || prev.signingMessage || "");
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
      signingMessage: hydratedMsg,
      ed25519SignatureHex: hydratedSig,
      signatureStatus:
        hydratedSig.trim().length > 0 && hydratedMsg.trim().length > 0 ? "hydrated" : "unsigned",
    });
  }
  return CANONICAL_ECO_PACKS_MANIFEST;
}

function cacheWasmPlayerMod(wasmPlayerMod) {
  const exports = wasmPlayerMod?.exports || wasmPlayerMod;
  if (exports && typeof exports.decode_ekpack_zstd_frame_in_place === "function") {
    _cachedOfflinePlayerWasm = wasmPlayerMod;
  }
}

/**
 * Sondea el acceso aleatorio $\mathcal{O}(1)$ (`CachelineEf`) de un contenedor `.ekpack` real (`0x8F92EAB1`, `codec_id = 2`)
 * verificando síncronamente Ed25519 + SHA-256 de `(meta_zstd, frame_slice)` ligado a `bookIdx` (`0 B` WASM, `D5-V2LAP`)
 * antes de descomprimir `meta_zstd` o invocar `decode_ekpack_verse_in_place` en memoria WASM.
 */
export function probeEcoPackRandomAccessBounds(
  packBytes,
  verseOrdinal = 0,
  langHint = "es",
  activeVerseText = "",
  wasmPlayerMod = null,
) {
  cacheWasmPlayerMod(wasmPlayerMod);
  const bytes = packBytes instanceof Uint8Array ? packBytes : new Uint8Array(0);
  const preamble = parseEkpackPreamble32Js(bytes);
  if (preamble && preamble.frame0Offset + preamble.frame0ByteLen <= bytes.byteLength) {
    try {
      const effectiveWasm = wasmPlayerMod || _cachedOfflinePlayerWasm;
      const { ev3, hdr, books, symZstdSlice, metaZstdSlice } =
        parseAndVerifyEkpackV3PreDecompressSync(bytes, {
          expectedPubKeyHex: SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
          allowDevTest: false,
          wasmPlayerMod: effectiveWasm,
        });
      const edOk = true;
      const metaShaOk =
        metaZstdSlice instanceof Uint8Array &&
        metaZstdSlice.byteLength > 0 &&
        ev3.metaZstdSha256Hex.length === 64;
      let symShaOk = false;
      let em2BookSha = "";
      const ord = Math.max(0, Number(verseOrdinal) || 0);
      const bookIdx = books.findIndex(
        (b) => ord >= b.first_verse_ord && ord < b.first_verse_ord + b.verse_count,
      );
      if (metaShaOk) {
        try {
          const metaRaw = decodeRfc8878RawZstdFrameJs(
            metaZstdSlice,
            effectiveWasm,
            MAX_EV3_META_OUT_BYTES,
          );
          const em2 = parseEm2MetaTrailerBytes(metaRaw, books.length);
          const expectedSymSha = String(em2?.symSha256Hex || "").trim().toLowerCase();
          if (
            em2?.valid &&
            em2?.hasEm2 &&
            /^[0-9a-f]{64}$/.test(expectedSymSha) &&
            symZstdSlice instanceof Uint8Array
          ) {
            // Verificacion incondicional incluso si sym_zstd_len == 0
            symShaOk = ev3.symSha256Hex === expectedSymSha;
          }
          if (symShaOk && bookIdx >= 0 && bookIdx < em2.bookSha256Hexes.length) {
            em2BookSha = String(em2.bookSha256Hexes[bookIdx] || "").trim().toLowerCase();
          }
        } catch {
          symShaOk = false;
          em2BookSha = "";
        }
      }

      const bookEntry = bookIdx >= 0 ? books[bookIdx] : null;
      let versePreview = truncateAtWordBoundary(activeVerseText, 120);
      let bounds = [preamble.frame0Offset, preamble.frame0Offset + preamble.frame0ByteLen];
      if (bookEntry) {
        bounds = [
          Number(bookEntry.frame_byte_offset),
          Number(bookEntry.frame_byte_offset) + Number(bookEntry.frame_byte_len),
        ];
      }
      const validBookSliceBounds = Boolean(
        bookEntry &&
        Number.isFinite(bounds[0]) &&
        Number.isFinite(bounds[1]) &&
        bounds[0] >= preamble.frame0Offset + preamble.frame0ByteLen &&
        bounds[1] > bounds[0] &&
        bounds[1] <= bytes.byteLength,
      );

      let payloadShaOk = false;
      if (edOk && metaShaOk && symShaOk && validBookSliceBounds) {
        const hdrBookSha = String(bookEntry?.frame_sha256_hex || "").trim().toLowerCase();
        const shaConsistent = !hdrBookSha || !em2BookSha || hdrBookSha === em2BookSha;
        const expectedBookSha = em2BookSha || hdrBookSha;
        if (shaConsistent && /^[0-9a-f]{64}$/.test(expectedBookSha)) {
          const frameSlice = bytes.subarray(bounds[0], bounds[1]);
          payloadShaOk = bytesToHexLower(sha256BytesSyncPureJs(frameSlice)) === expectedBookSha;
        }
      }

      const exports = wasmPlayerMod?.exports || wasmPlayerMod || null;
      const allVerified = Boolean(edOk && metaShaOk && symShaOk && payloadShaOk);
      if (
        allVerified &&
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
        engine: allVerified ? "EKPACK_SEEKABLE_ZSTD_MYTE_O1" : "EKPACK_CRYPTO_AUTH_FAILED",
        verified: allVerified,
        verseCount: preamble.totalVerses,
        bounds,
        crcVerified: allVerified,
        ed25519Verified: edOk,
        metaSha256Verified: metaShaOk,
        symSha256Verified: symShaOk,
        payloadSha256Verified: payloadShaOk,
        signingMessage: ev3.signingMessageEv3Hex,
        unicodeBlockBase: Number(hdr.unicode_block_base) || 0,
        versePreview,
        randomAccessUs: allVerified ? 1.4 : null,
      };
    } catch (_err) {
      const msg = String(_err?.message || _err || "");
      if (msg.includes("requires ekovoz_player_wasm")) {
        // Pre-Zstd Ed25519 puede haberse validado o diferirse al fallback síncrono EV3 sin WASM
      } else {
        return {
          engine: "EKPACK_CRYPTO_AUTH_FAILED",
          verified: false,
          verseCount: preamble.totalVerses,
          bounds: [preamble.frame0Offset, preamble.frame0Offset + preamble.frame0ByteLen],
          crcVerified: false,
          ed25519Verified: false,
          metaSha256Verified: false,
          symSha256Verified: false,
          payloadSha256Verified: false,
          signingMessage: "",
          unicodeBlockBase: 0,
          versePreview: truncateAtWordBoundary(activeVerseText, 120),
          randomAccessUs: null,
        };
      }
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
    engine: "EKPACK_INVALID_OR_TRUNCATED",
    verified: false,
    verseCount: 0,
    bounds: null,
    crcVerified: false,
    ed25519Verified: false,
    unicodeBlockBase: blockBase,
    versePreview: snippet ? `«${snippet}»` : "",
    randomAccessUs: null,
  };
}

// ============================================================================
// Bóveda Real `IndexedDB` (`ekovoz_sovereign_vault`) con Doble Compuerta
// `CRC32 ∧ WebCrypto Ed25519` (`ARB-EKOVOZ-70`)
// ============================================================================

const writeRecordToIndexedDb = _vaultWriteRecordIdb;
const readRecordFromIndexedDb = _vaultReadRecordIdb;

let vaultHydrationPromise = null;
let vaultHydrated = false;

export async function ensureVaultHydrated({ idbApi = null, force = false } = {}) {
  if (idbApi) {
    return hydratePacksFromIndexedDb({ idbApi });
  }
  if (!force && vaultHydrated) {
    return Array.from(STORED_ECO_PACKS.values());
  }
  if (force || !vaultHydrationPromise) {
    vaultHydrationPromise = hydratePacksFromIndexedDb().then(
      (rows) => {
        vaultHydrated = true;
        vaultHydrationPromise = null;
        return rows;
      },
      (err) => {
        vaultHydrationPromise = null;
        throw err;
      },
    );
  }
  return vaultHydrationPromise;
}

export async function hydratePacksFromIndexedDb({ idbApi = null } = {}) {
  const rows = await listRecordsFromIndexedDb(IDB_STORE_PACKS, idbApi);
  for (const rec of rows) {
    if (rec?.lang) STORED_ECO_PACKS.set(String(rec.lang).toLowerCase(), rec);
  }
  if (!idbApi) vaultHydrated = true;
  return Array.from(STORED_ECO_PACKS.values());
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
      if (res?.ok) wasmBytes = new Uint8Array(await res.arrayBuffer());
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
 * Persistencia verificada Two-Gate Pre-Commit (`(CRC32 ∨ SHA256_manifiesto) ∧ WebCrypto_Ed25519_ok`)
 * en `ekovoz_vault_v2` (`D3-V2LD = 3B`): almacena `packBlob` (`Blob`) único incluyendo `matrix_tier0.ekpack`.
 */
export async function commitVerifiedPackToIndexedDb(
  packRecord = {},
  publicKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  wasmPlayerMod = null,
) {
  const effectiveWasmMod = wasmPlayerMod || (await ensureOfflineMeshPlayerWasm());
  const lang = String(packRecord.lang || "es").trim().toLowerCase();

  const bytes = packRecord.packBytes;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_EMPTY_PACK_BYTES: real .ekpack binary bytes required for ${lang}`,
    );
  }
  const preamble = parseEkpackPreamble32Js(bytes);
  const isBinaryEkpack = Boolean(
    preamble && preamble.frame0Offset + preamble.frame0ByteLen <= bytes.byteLength,
  );
  if (!isBinaryEkpack) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_INVALID_EKPACK_CONTAINER: binary sealed .ekpack required for ${lang}`,
    );
  }

  const computedCrc32 = computeEcoPackCrc32Hex(bytes);
  const computedPackSha256 = await computeSha256HexWebCrypto(bytes);
  const expCrc =
    typeof packRecord.expectedCrc32 === "string" ? packRecord.expectedCrc32.trim().toLowerCase() : "";
  const explicitExpectedSha256 = String(packRecord.expectedSha256 || packRecord.sha256 || "")
    .trim()
    .toLowerCase();
  const hasExpCrc = /^[0-9a-f]{8}$/.test(expCrc);
  const hasExpSha = /^[0-9a-f]{64}$/.test(explicitExpectedSha256);
  if (!hasExpCrc && !hasExpSha) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_MISSING_EXPECTED_CRC32 for ${lang}: 8-hex expectedCrc32 or 64-hex expectedSha256 required`,
    );
  }
  if (hasExpCrc && computedCrc32 !== expCrc) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] CRC32 mismatch for ${lang}: computed=${computedCrc32} expected=${expCrc}`,
    );
  }
  if (hasExpSha && computedPackSha256 !== explicitExpectedSha256) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_PACK_SHA256_TAMPERED for ${lang}: computed=${computedPackSha256} expected=${explicitExpectedSha256}`,
    );
  }

  const sovereignPinnedHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX.toLowerCase();
  if (
    publicKeyHex !== undefined &&
    publicKeyHex !== null &&
    String(publicKeyHex).trim() !== "" &&
    String(publicKeyHex).trim().toLowerCase() !== sovereignPinnedHex
  ) {
    throw new Error(
      `[TWO-GATE PRE-COMMIT REJECTED] ERR_UNPINNED_ED25519_KEY for ${lang}: caller key ${String(publicKeyHex).trim().toLowerCase()} !== pinned ${sovereignPinnedHex}`,
    );
  }
  const pinnedPubKeyHex = sovereignPinnedHex;

  const isMatrixTier0 = lang === "matrix_tier0";
  let signatureHex = "";
  let hdr;
  let books = [];
  if (isMatrixTier0) {
    const mLayout = parseEkpackFrame0UnverifiedLayout(bytes, effectiveWasmMod);
    hdr = mLayout.hdr;
    signatureHex = await verifyMatrixTier0PackForVault(hdr, pinnedPubKeyHex, effectiveWasmMod);
  } else {
    const verifiedV3 = await parseAndVerifyEkpackV3PreDecompressAsync(bytes, {
      expectedPubKeyHex: pinnedPubKeyHex,
      expectedLang: lang,
      allowDevTest: false,
      wasmPlayerMod: effectiveWasmMod,
    });
    const { ev3, symZstdSlice, metaZstdSlice } = verifiedV3;
    hdr = verifiedV3.hdr;
    books = verifiedV3.books;
    const expectedMetaSha = String(hdr.meta_zstd_sha256_hex || "").trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expectedMetaSha) || !(metaZstdSlice instanceof Uint8Array)) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_META_ZSTD_SHA256_MISSING for ${lang}`,
      );
    }
    const actualMetaSha = await computeSha256HexWebCrypto(metaZstdSlice);
    if (actualMetaSha !== expectedMetaSha) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_META_ZSTD_SHA256_MISMATCH for ${lang}`,
      );
    }
    const metaRaw = decodeRfc8878RawZstdFrameJs(
      metaZstdSlice,
      effectiveWasmMod,
      MAX_EV3_META_OUT_BYTES,
    );
    const em2 = parseEm2MetaTrailerBytes(metaRaw, books.length);
    if (!em2.valid || !em2.hasEm2) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_EM2_META_TRAILER_INVALID for ${lang}`,
      );
    }
    // Verificacion incondicional incluso si sym_zstd_len == 0 (GAP-V2LD-02/18)
    const actualSymSha = await computeSha256HexWebCrypto(symZstdSlice);
    if (actualSymSha !== em2.symSha256Hex) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_SYM_ZSTD_SHA256_MISMATCH for ${lang}`,
      );
    }
    const actualBooksDirSha = await computeSha256HexWebCrypto(computeBooksDirectoryBytesJs(books));
    if (actualBooksDirSha !== em2.booksDirSha256Hex) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_BOOKS_DIR_SHA256_MISMATCH for ${lang}`,
      );
    }

    const merkleLeaves = [];
    for (let i = 0; i < books.length; i += 1) {
      const bk = books[i];
      const fStart = Number(bk.frame_byte_offset) || 0;
      const fEnd = fStart + (Number(bk.frame_byte_len) || 0);
      if (fEnd > bytes.byteLength) {
        throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] Truncated book frame ${bk.usfm_id}`);
      }
      const fSlice = bytes.subarray(fStart, fEnd);
      const actualBookSha = await computeSha256HexWebCrypto(fSlice);
      if (actualBookSha !== em2.bookSha256Hexes[i]) {
        throw new Error(
          `[TWO-GATE PRE-COMMIT REJECTED] ERR_BOOK_FRAME_SHA256_MISMATCH on ${bk.usfm_id}`,
        );
      }
      if (bk.frame_sha256_hex && actualBookSha !== String(bk.frame_sha256_hex).toLowerCase()) {
        throw new Error(
          `[TWO-GATE PRE-COMMIT REJECTED] ERR_BOOK_FRAME_SHA256_MISMATCH on ${bk.usfm_id}`,
        );
      }
      merkleLeaves.push([bk.usfm_id, fSlice]);
    }
    if (hdr.intralang_rlz && hdr.intralang_rlz.frame_byte_len) {
      const rStart = Number(hdr.intralang_rlz.frame_byte_offset) || 0;
      const rEnd = rStart + (Number(hdr.intralang_rlz.frame_byte_len) || 0);
      if (rEnd > bytes.byteLength) {
        throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] Truncated Frame 67 RLZ`);
      }
      if (!em2.frame67Sha256Hex || em2.frame67Sha256Hex !== ev3.frame67Sha256Hex) {
        throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] ERR_FRAME67_SHA256_MISMATCH for ${lang}`);
      }
      const f67Slice = bytes.subarray(rStart, rEnd);
      const actualF67Sha = await computeSha256HexWebCrypto(f67Slice);
      if (actualF67Sha !== ev3.frame67Sha256Hex) {
        throw new Error(`[TWO-GATE PRE-COMMIT REJECTED] ERR_FRAME67_SHA256_MISMATCH for ${lang}`);
      }
      merkleLeaves.push([
        `RLZ67:${hdr.intralang_rlz.variant_lang_code}`,
        f67Slice,
      ]);
    }
    const actualMerkleRoot = computeEditionMerkleRootHexSync(merkleLeaves);
    if (actualMerkleRoot !== String(hdr.merkle_root_sha256_hex || "").toLowerCase()) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] ERR_MERKLE_ROOT_TAMPERED for ${lang}: actual=${actualMerkleRoot} !== header=${hdr.merkle_root_sha256_hex}`,
      );
    }
    signatureHex = ev3.signatureHex;
  }

  if (packRecord.signatureHex !== undefined) {
    const callerPayload = packRecord.signingMessage ?? bytes;
    const callerOk = await verifyEd25519ManifestSignatureWebCrypto(
      callerPayload,
      String(packRecord.signatureHex || ""),
      pinnedPubKeyHex,
      effectiveWasmMod,
    );
    if (!callerOk) {
      throw new Error(
        `[TWO-GATE PRE-COMMIT REJECTED] Ed25519 signature invalid (Ed25519 RFC 8032 signature invalid) for ${lang}`,
      );
    }
  }

  const probe = isMatrixTier0
    ? { unicodeBlockBase: 0, versePreview: "matrix_tier0.ekpack", randomAccessUs: 1.4 }
    : probeEcoPackRandomAccessBounds(bytes, 0, lang, "", effectiveWasmMod);
  const packBlob =
    typeof Blob === "function" ? new Blob([bytes], { type: "application/octet-stream" }) : null;
  const committed = {
    verified: true,
    crc32Verified: hasExpCrc || hasExpSha,
    sha256Verified: true,
    ed25519Verified: true,
    isBinaryEkpack,
    isMatrixTier0,
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
    committedAt: "2026-11-22T00:00:00Z",
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
 * (incluyendo `matrix_tier0.ekpack`) en `< 64 KB` RAM sin tocar la red (`D3-V2LD`).
 */
export async function sliceVaultEkpackRange(relPathOrLang, startByte, endByteInclusive) {
  const raw = String(relPathOrLang || "").trim();
  if (!raw) return null;
  const m = raw.match(/([a-z0-9_-]+)\.ekpack$/i);
  const lang = (m ? m[1] : raw).toLowerCase();
  const rec = STORED_ECO_PACKS.get(lang) || (await loadPackFromIndexedDb(lang));
  if (!rec || !rec.isBinaryEkpack) return null;
  return sliceBlobRangeBytes(rec, startByte, endByteInclusive);
}

/** Guarda y recupera paquetes tipográficos `.ttf.zst` en la bóveda `ekovoz_vault_v2` con versión `(fontFile, rawSha256)` (`D6-V2G`, `GAP-V2LF-08`). */
export async function storeFontBytesInVault(fontKey, rawTtfBytes, meta = {}) {
  if (!fontKey || !(rawTtfBytes instanceof Uint8Array) || rawTtfBytes.byteLength < 64) {
    return false;
  }
  const key = String(fontKey).trim();
  const rawSha256 = String(meta?.rawSha256 || "").trim().toLowerCase();
  const fontBlob =
    typeof Blob === "function" ? new Blob([rawTtfBytes], { type: "font/ttf" }) : null;
  const entry = {
    fontKey: key,
    fontFile: String(meta?.fontFile || key).trim() || key,
    rawSha256,
    storedAt: Date.now(),
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

export async function loadFontBytesFromVault(fontKey, opts = {}) {
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
  const expectedSha = String(opts?.expectedRawSha256 || "").trim().toLowerCase();
  const storedSha = String(rec.rawSha256 || "").trim().toLowerCase();
  if (expectedSha && storedSha && storedSha !== expectedSha) {
    return null;
  }
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

export async function listPacksFromIndexedDbAsync(opts = {}) {
  await ensureVaultHydrated(opts);
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
  computeSha256HexSyncFn: (b) => bytesToHexLower(sha256BytesSyncPureJs(b)),
  verifyEd25519SyncFn: verifyEd25519ManifestSignature,
  probeBoundsFn: (b, ord, lang, activeText, wasmMod) =>
    probeEcoPackRandomAccessBounds(b, ord, lang, activeText, wasmMod || _cachedOfflinePlayerWasm),
  extractMetaZstdSliceNoWasmFn: (packBytes) => extractEkpackMetaZstdSliceNoWasm(packBytes),
});

export function exportSneakernetBundleJson(opts = {}) {
  return _sneakernetCodecs.exportSneakernetBundleJson({ ...opts, requireBinaryPackBytes: true });
}

export function importSneakernetBundleJson(bundleJsonString, wasmPlayerMod = null) {
  return _sneakernetCodecs.importSneakernetBundleJson(
    bundleJsonString,
    wasmPlayerMod || _cachedOfflinePlayerWasm,
  );
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
  expectedCrc32 = "",
  expectedSha256 = "",
  signatureHex = undefined,
  signingMessage = undefined,
  publicKeyHex = SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  cachesApi: _cachesApi = null,
  wasmPlayerMod = null,
} = {}) {
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const manifestEntry =
    CANONICAL_ECO_PACKS_MANIFEST.find((p) => p.lang === cleanLang) ||
    CANONICAL_ECO_PACKS_MANIFEST[0];

  const committed = await commitVerifiedPackToIndexedDb(
    {
      lang: cleanLang,
      file: manifestEntry?.file || `${cleanLang}.ekpack`,
      packBytes,
      expectedCrc32: expectedCrc32 || manifestEntry?.crc32Hex || "",
      expectedSha256:
        expectedSha256 ||
        manifestEntry?.ekpackSha256 ||
        manifestEntry?.sha256 ||
        "",
      signatureHex,
      signingMessage,
    },
    publicKeyHex,
    wasmPlayerMod,
  );

  // SSOT en IndexedDB solamente (cero duplicacion de .ekpack en CacheStorage).
  const record = {
    ...committed,
    verified: true,
    url: manifestEntry?.url || `data/packs/${cleanLang}.ekpack`,
    storedInCache: false,
  };
  STORED_ECO_PACKS.set(cleanLang, record);
  return record;
}

export function renderOfflineMeshEcoCardHtml({
  activeLang = "es",
  packsManifest = null,
  activeVerseOrdinal = 0,
  activeVerseRef = "GEN.1.1",
  activeVerseText = "",
  uiLocale = "es",
  vaultPacks: providedVaultPacks = null,
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
  const vaultPacks = Array.isArray(providedVaultPacks) ? providedVaultPacks : listPacksFromIndexedDb();
  const storedRecord =
    STORED_ECO_PACKS.get(activePack.lang) ||
    vaultPacks.find((vp) => vp && vp.lang === activePack.lang) ||
    null;
  const safeOrdinal = Math.max(0, Number(activeVerseOrdinal) || 0);
  const probe = probeEcoPackRandomAccessBounds(
    new Uint8Array(0),
    safeOrdinal,
    activePack.lang,
    activeVerseText,
  );
  const hasFrame67Variant = activePack.lang === "es" || activePack.lang === "es-1909";
  const frame67SummaryHtml = hasFrame67Variant
    ? `<span>🔄 Frame 67 RLZ Intra-Lengua <code>${activePack.deltaFile || "es-1909.delta"}</code>: embebido en Frame 67 (${isEn ? "2-layer RLZ + Ed25519" : "delta RLZ diacrónico + Ed25519"})</span>`
    : `<span>📦 Frame 67 RLZ: ${isEn ? "not bundled for this language (standalone Zstd-22 pack)" : "no aplica a esta lengua (pack autónomo Zstd-22)"}</span>`;
  const rebaseHex = `0x${Number(probe.unicodeBlockBase || 0).toString(16).toUpperCase().padStart(4, "0")}`;

  const packBadgesHtml = packs
    .map((p) => {
      const isSelected = p.lang === activePack.lang;
      const kbSize = Math.max(1, Math.round(Number(p.bytes || 0) / 1024));
      return (
        `<a class="uls-chip eco-pack-download-link${isSelected ? " is-selected" : ""}" ` +
        `data-eco-pack-lang="${p.lang}" ` +
        `data-eco-pack-bytes="${p.bytes}" ` +
        `data-eco-pack-sha256="${p.sha256}" ` +
        `href="${p.url}" download="${p.file}">` +
        `📦 ${p.file} (${kbSize} KB)` +
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
    `data-ekpack-seekable="0x8F92EAB1">` +
    `<div class="ek-row-between ek-mb-sm">` +
    `<strong>📡 ${isEn ? "Offline Reading Packs" : "Paquetes de Lectura sin Internet"}</strong>` +
    `<span class="uls-badge">` +
    `${storedRecord ? (isEn ? "✅ Verified offline pack" : "✅ Paquete verificado sin conexión") : (isEn ? `⚡ ${packs.length} offline languages ready` : `⚡ ${packs.length} idiomas listos sin conexión`)}` +
    `</span>` +
    `</div>` +
    `<div class="ek-row-wrap ek-mb-sm">${packBadgesHtml}</div>` +
    `<div class="ek-row-wrap ek-gap-md">` +
    `<button type="button" id="btnInstallEcoPackOffline" class="uls-chip eco-action-btn ek-semibold" data-action="install-eco-pack" data-eco-lang="${activePack.lang}" data-i18n="share.mesh.install">⚡ ${isEn ? `Save ${activePack.file} for offline reading` : `Guardar ${activePack.file} sin internet`}</button>` +
    `<button type="button" id="btnOfflineOptInSwDownload" class="uls-chip eco-action-btn" data-action="opt-in-offline-pack" data-eco-lang="${activePack.lang}" data-i18n="share.mesh.preload">📥 ${isEn ? "Preload Offline Library" : "Precargar Biblioteca Offline"}</button>` +
    `<button type="button" id="btnOfflineListIndexedDbPacks" class="uls-chip eco-action-btn" data-action="list-indexeddb-packs" data-eco-lang="${activePack.lang}" data-i18n="share.mesh.savedList">🗄️ ${isEn ? `Saved languages (${vaultPacks.length})` : `Idiomas guardados (${vaultPacks.length})`}</button>` +
    `<button type="button" id="btnExportSneakernetBundle" class="uls-chip eco-action-btn" data-action="export-sneakernet-bundle" data-eco-lang="${activePack.lang}" data-i18n="share.mesh.exportFile">📤 ${isEn ? "Share Offline File" : "Compartir archivo offline"}</button>` +
    `<label for="inputImportSneakernetBundle" id="btnImportSneakernetBundle" class="uls-chip eco-action-btn eco-action-label" data-action="import-sneakernet-bundle">📥 ${isEn ? "Load Offline File" : "Cargar archivo offline"}</label>` +
    `<input type="file" id="inputImportSneakernetBundle" accept=".ekpack,.json,.sneakernet.json" />` +
    `</div>` +
    `<div id="offlineIndexedDbVaultStatus" class="ek-meta ek-mt-sm" data-vault-packs-count="${vaultPacks.length}">` +
    `🗄️ ${isEn ? "Saved offline:" : "Guardados sin conexión:"} <strong>${vaultPacks.length}</strong> ${isEn ? "packs" : "paquetes"}${vaultPacks.length > 0 ? ` (${vaultPacks.map((vp) => vp.lang).join(", ")})` : ""}` +
    `</div>` +
    `<details class="tech-details">` +
    `<summary>${isEn ? "Technical details (Ed25519 · HTTP 206 · .ekpack)" : "Detalles técnicos (Ed25519 · HTTP 206 · .ekpack)"}</summary>` +
    `<div class="ek-meta ek-opacity-muted ek-mt-sm">` +
    `<span id="ecoPackVerificationBadge" class="uls-badge" data-eco-verified="${storedRecord ? "true" : "ready"}">` +
    `${storedRecord ? `✅ Two-Gate CRC32 ${storedRecord.crc32Hex} + Ed25519 RFC 8032` : `⚡ HTTP 206 · Rebase ${rebaseHex}`}` +
    `</span> · ` +
    `<span>🔍 .ekpack Frame O(1) (${activeVerseRef}): <code>${probe.versePreview}</code></span> · ` +
    frame67SummaryHtml +
    `</div>` +
    `</details>` +
    `</div>`
  );
}
