// ============================================================================
// web/mostrador/workshop_overlay_store.js — Almacén IndexedDB de Sobrecapas Firmadas Ed25519
// y Proyección Reactiva Unificada Array/Object del Semirretículo `L1–L3` (`SLICE-EKO-V2H-06` + `22`)
// ============================================================================

import {
  CASCADE_SEMILATTICE_PRIORITY,
  projectChapterThroughCascadeSemilattice,
  replaceAllWholeToken,
} from "./cascade_l1_l5.js";
import { SOVEREIGN_ED25519_PUBLIC_KEY_HEX } from "./ed25519_field_math.js";
import { computeEcoPackCrc32Hex, computeSha256HexWebCrypto } from "./offline_mesh.js";

function escHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hexToBytesWorkshop(hex) {
  const clean = String(hex || "").trim();
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHexWorkshop(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

let cachedLocalWorkshopKeyPairPromise = null;

export const OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED = "LOCAL_WORKSHOP_SELF_SIGNED";
export const OVERLAY_AUTHORITY_MAINTAINER_ED25519 = "VERIFIED_MAINTAINER_ED25519";

function classifyOverlayAuthorityTier(publicKeyHex, isLocalKey = false, maintainerPubHex = "") {
  const cleanPub = String(publicKeyHex || "").trim().toLowerCase();
  const rootMaintainer = String(
    maintainerPubHex || SOVEREIGN_ED25519_PUBLIC_KEY_HEX,
  )
    .trim()
    .toLowerCase();
  if (!isLocalKey && cleanPub && cleanPub === rootMaintainer) {
    return OVERLAY_AUTHORITY_MAINTAINER_ED25519;
  }
  return OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
}

async function getOrCreateLocalWorkshopEd25519KeyPair(subtle) {
  if (!cachedLocalWorkshopKeyPairPromise) {
    cachedLocalWorkshopKeyPairPromise = (async () => {
      const kp = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      const rawPub = new Uint8Array(await subtle.exportKey("raw", kp.publicKey));
      return {
        privateKey: kp.privateKey,
        publicKey: kp.publicKey,
        publicKeyHex: bytesToHexWorkshop(rawPub),
      };
    })();
  }
  return cachedLocalWorkshopKeyPairPromise;
}

export async function signLocalWorkshopPayload(payloadInput, options = {}) {
  const subtle = options.subtle || globalThis.crypto?.subtle || null;
  if (!subtle || typeof subtle.generateKey !== "function" || typeof subtle.sign !== "function") {
    throw new Error("WEBCRYPTO_ED25519_UNAVAILABLE");
  }
  const bytes =
    payloadInput instanceof Uint8Array
      ? payloadInput
      : new TextEncoder().encode(String(payloadInput ?? ""));
  const localKp = await getOrCreateLocalWorkshopEd25519KeyPair(subtle);
  const sigBuf = await subtle.sign({ name: "Ed25519" }, localKp.privateKey, bytes);
  return {
    signatureHex: bytesToHexWorkshop(new Uint8Array(sigBuf)),
    publicKeyHex: localKp.publicKeyHex,
    authorityTier: OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
  };
}

function openCascadeOverlayIdb(idbFactory) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        const err = new Error("IDB open timeout");
        err.code = "IDB_TIMEOUT";
        reject(err);
      }
    }, 1500);
    const req = idbFactory.open("ekovoz_cascade_overlays_v2", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db && (!db.objectStoreNames || !db.objectStoreNames.contains("signed_overlays"))) {
        db.createObjectStore("signed_overlays", { keyPath: "overlayKey" });
      }
    };
    req.onsuccess = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(req.result);
      }
    };
    req.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(req.error || new Error("IDB open failed"));
      }
    };
  });
}

export async function persistSignedCascadeOverlayIdb(receipt, options = {}) {
  const idbFactory = options.indexedDB || globalThis.indexedDB || null;
  const subtle = options.subtle || globalThis.crypto?.subtle || null;
  if (!receipt || !receipt.cascade || !receipt.cascade.accepted) {
    return { persisted: false, reason: "CASCADE_NOT_ACCEPTED" };
  }
  const entries = Array.isArray(receipt.cascade.foldedOverlayEntries)
    ? receipt.cascade.foldedOverlayEntries
    : receipt.cascade.ekpackOverlayEntry
      ? [receipt.cascade.ekpackOverlayEntry]
      : [];
  if (entries.length === 0) return { persisted: false, reason: "EMPTY_OVERLAY_ENTRIES" };

  const primary = receipt.cascade.ekpackOverlayEntry || entries[0];
  const canonicalPayload = JSON.stringify({
    patch_id: primary.patch_id,
    lang_code: primary.lang_code,
    cascade_level: primary.cascade_level,
    target_ref: primary.target_ref,
    new_surface: primary.new_surface,
    content_hash_hex: primary.content_hash_hex,
  });
  const payloadBytes = new TextEncoder().encode(canonicalPayload);
  const computedCrc32Hex = computeEcoPackCrc32Hex(payloadBytes);
  const computedSha256Hex = await computeSha256HexWebCrypto(payloadBytes);
  const explicitCrc = String(options.expectedCrc32Hex || receipt.expectedCrc32Hex || "")
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(explicitCrc)) {
    return { persisted: false, reason: "ERR_MISSING_EXPECTED_CRC32", computedCrc32Hex, computedSha256Hex };
  }
  if (explicitCrc !== computedCrc32Hex.toLowerCase()) {
    return { persisted: false, reason: "CRC32_MISMATCH", computedCrc32Hex, computedSha256Hex };
  }
  const explicitSha = String(options.expectedSha256Hex || receipt.expectedSha256Hex || "")
    .trim()
    .toLowerCase();
  if (explicitSha && explicitSha !== computedSha256Hex) {
    return { persisted: false, reason: "SHA256_MISMATCH", computedCrc32Hex, computedSha256Hex };
  }

  let signatureHex = String(options.signatureHex || receipt.signatureHex || "").trim();
  let publicKeyHex = String(options.publicKeyHex || receipt.publicKeyHex || "").trim();
  if (!subtle) return { persisted: false, reason: "WEBCRYPTO_UNAVAILABLE" };

  const signMsgV3Bytes = new TextEncoder().encode(
    `EKOVOZ_CASCADE_OVERLAY_V3:${computedSha256Hex}:${canonicalPayload}`,
  );
  const signMsgV2Bytes = new TextEncoder().encode(
    `EKOVOZ_CASCADE_OVERLAY_V2:${computedCrc32Hex}:${canonicalPayload}`,
  );
  let sigVersion = 3;
  let signedWithLocalEphemeralKey = false;
  if (!signatureHex && !publicKeyHex) {
    const localKp = await getOrCreateLocalWorkshopEd25519KeyPair(subtle);
    const sigBuf = await subtle.sign({ name: "Ed25519" }, localKp.privateKey, signMsgV3Bytes);
    signatureHex = bytesToHexWorkshop(new Uint8Array(sigBuf));
    publicKeyHex = localKp.publicKeyHex;
    signedWithLocalEphemeralKey = true;
  }
  const authorityTier = classifyOverlayAuthorityTier(
    publicKeyHex,
    signedWithLocalEphemeralKey,
    options.canonicalMaintainerPublicKeyHex || receipt.canonicalMaintainerPublicKeyHex,
  );
  const authorityLabel =
    authorityTier === OVERLAY_AUTHORITY_MAINTAINER_ED25519
      ? "Edición canónica verificada"
      : "Borrador local firmado en este dispositivo";
  const sigBytes = hexToBytesWorkshop(signatureHex);
  const pubBytes = hexToBytesWorkshop(publicKeyHex);
  if (!sigBytes || sigBytes.length !== 64 || !pubBytes || pubBytes.length !== 32) {
    return { persisted: false, reason: "ED25519_MALFORMED_KEY_OR_SIGNATURE" };
  }
  let ed25519Ok = false;
  try {
    const cryptoKey = await subtle.importKey("raw", pubBytes, { name: "Ed25519" }, false, ["verify"]);
    ed25519Ok = Boolean(await subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, signMsgV3Bytes));
    if (!ed25519Ok && !signedWithLocalEphemeralKey) {
      const okV2 = Boolean(
        await subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, signMsgV2Bytes),
      );
      if (okV2) {
        ed25519Ok = true;
        sigVersion = 2;
      }
    }
  } catch {
    ed25519Ok = false;
  }
  if (!ed25519Ok) {
    return { persisted: false, reason: "ED25519_SIGNATURE_INVALID" };
  }
  if (!idbFactory || typeof idbFactory.open !== "function") {
    return {
      persisted: false,
      reason: "INDEXEDDB_UNAVAILABLE",
      crc32Hex: computedCrc32Hex,
      sha256Hex: computedSha256Hex,
      sigVersion,
      ed25519Verified: true,
      authorityTier,
      authorityLabel,
      signatureHex,
      publicKeyHex,
    };
  }

  const db = await openCascadeOverlayIdb(idbFactory);
  const savedKeys = [];
  const savedAtIso = new Date().toISOString();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("signed_overlays", "readwrite");
    const store = tx.objectStore("signed_overlays");
    for (const rawEntry of entries) {
      const entry = {
        ...rawEntry,
        authorityTier,
        authorityLabel,
        publicKeyHex,
        savedAtIso,
      };
      const overlayKey = `${entry.lang_code}:${entry.target_ref}`;
      savedKeys.push(overlayKey);
      store.put({
        overlayKey,
        entry,
        canonicalPayload,
        crc32Hex: computedCrc32Hex,
        sha256Hex: computedSha256Hex,
        sigVersion,
        signatureHex,
        publicKeyHex,
        authorityTier,
        authorityLabel,
        savedAtIso,
      });
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("IDB write failed"));
  });
  if (typeof db.close === "function") db.close();
  return {
    persisted: true,
    crc32Hex: computedCrc32Hex,
    sha256Hex: computedSha256Hex,
    sigVersion,
    ed25519Verified: true,
    authorityTier,
    authorityLabel,
    signatureHex,
    publicKeyHex,
    savedKeys,
  };
}

export async function loadLiveCascadeOverlaysIdb(lang = "stp", options = {}) {
  const idbFactory = options.indexedDB || globalThis.indexedDB || null;
  const subtle = options.subtle || globalThis.crypto?.subtle || null;
  if (!subtle || !idbFactory || typeof idbFactory.open !== "function") return [];
  const db = await openCascadeOverlayIdb(idbFactory);
  const rawRecords = await new Promise((resolve, reject) => {
    const tx = db.transaction("signed_overlays", "readonly");
    const store = tx.objectStore("signed_overlays");
    const req = store.getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error || new Error("IDB read failed"));
  });
  if (typeof db.close === "function") db.close();
  const cleanLang = String(lang || "stp").trim().toLowerCase();
  const verified = [];
  for (const rec of rawRecords) {
    if (!rec || !rec.entry || String(rec.entry.lang_code || "").toLowerCase() !== cleanLang) continue;
    const payloadStr = String(rec.canonicalPayload || "");
    if (!payloadStr || !rec.sha256Hex || !rec.signatureHex || !rec.publicKeyHex) continue;
    const payloadBytes = new TextEncoder().encode(payloadStr);
    const actualSha = await computeSha256HexWebCrypto(payloadBytes);
    if (actualSha !== String(rec.sha256Hex).toLowerCase()) continue;
    const crc = computeEcoPackCrc32Hex(payloadBytes);
    if (!rec.crc32Hex || crc.toLowerCase() !== String(rec.crc32Hex).toLowerCase()) continue;
    const sigB = hexToBytesWorkshop(rec.signatureHex);
    const pubB = hexToBytesWorkshop(rec.publicKeyHex);
    if (!sigB || sigB.length !== 64 || !pubB || pubB.length !== 32) continue;
    const msgStr =
      rec.sigVersion === 2
        ? `EKOVOZ_CASCADE_OVERLAY_V2:${rec.crc32Hex}:${payloadStr}`
        : `EKOVOZ_CASCADE_OVERLAY_V3:${actualSha}:${payloadStr}`;
    const msgB = new TextEncoder().encode(msgStr);
    try {
      const key = await subtle.importKey("raw", pubB, { name: "Ed25519" }, false, ["verify"]);
      const ok = await subtle.verify({ name: "Ed25519" }, key, sigB, msgB);
      if (!ok) continue;
    } catch {
      continue;
    }
    const authorityTier =
      rec.authorityTier ||
      rec.entry.authorityTier ||
      classifyOverlayAuthorityTier(
        rec.publicKeyHex,
        false,
        options.canonicalMaintainerPublicKeyHex,
      );
    const authorityLabel =
      authorityTier === OVERLAY_AUTHORITY_MAINTAINER_ED25519
        ? "Edición canónica verificada"
        : "Borrador local firmado en este dispositivo";
    verified.push({
      ...rec.entry,
      authorityTier,
      authorityLabel,
      publicKeyHex: rec.publicKeyHex || rec.entry.publicKeyHex || "",
      savedAtIso: rec.savedAtIso || rec.entry.savedAtIso || "",
    });
  }
  return verified;
}

const IDB_TIMEOUT_SENTINEL = Symbol("idb-timeout");

/**
 * Distingue parches léxicos/onomásticos `L2`/`L3` a nivel token de reescrituras `L1` (o `L2` de versículo completo)
 * para no sobrescribir todo el versículo con un solo vocablo al hidratar o resolver un overlay.
 */
function isTokenScopedCascadeOverlay(entry, baseText = "") {
  const lvl = String(entry?.cascade_level || "").trim().toUpperCase();
  if ((lvl !== "L2" && lvl !== "L3") || entry?.replaces_whole_verse === true) {
    return false;
  }
  if (entry?.token_scoped === true) return true;
  const oldSurf = String(entry?.old_surface || "").trim();
  const newSurf = String(entry?.new_surface || "").trim();
  if (!oldSurf || !newSurf) return false;
  const oldWords = oldSurf.split(/\s+/).filter(Boolean).length;
  const newWords = newSurf.split(/\s+/).filter(Boolean).length;
  if (oldWords <= 3 && newWords <= 4 && !/[.!?]$/.test(newSurf)) {
    return true;
  }
  const cleanBase = String(baseText || "").trim();
  return Boolean(cleanBase && cleanBase.length > newSurf.length * 1.3 && cleanBase.includes(oldSurf));
}

export function applyOverlayEntriesToLiveState(state, entries = []) {
  if (!state || !Array.isArray(entries) || entries.length === 0) return 0;
  let appliedCount = 0;
  if (!state.verifiedOverlaysByOsis || typeof state.verifiedOverlaysByOsis !== "object") {
    state.verifiedOverlaysByOsis = {};
  }
  const activeBookChap = `${String(state.book || "").toUpperCase()}.${state.chapter}.`;
  const activeLangClean = String(state.lang || "es").trim().toLowerCase();

  for (const entry of entries) {
    if (!entry || !entry.target_ref || !entry.new_surface) continue;
    const entryLang = String(entry.lang_code || activeLangClean || "es").trim().toLowerCase();
    const cleanOsis = String(entry.target_ref).trim().toUpperCase();
    const mapKey = `${entryLang}:${cleanOsis}`;
    const prev = state.verifiedOverlaysByOsis[mapKey];
    const nextTs = Number(entry.lamport_ts || 0);
    const prevTs = Number(prev?.lamport_ts || 0);
    const nextIso = String(entry.savedAtIso || "");
    const prevIso = String(prev?.savedAtIso || "");
    const nextPrio = Number(entry.semilattice_priority ?? CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE);
    const prevPrio = Number(prev?.semilattice_priority ?? CASCADE_SEMILATTICE_PRIORITY.DIRECT_VERSE);
    const shouldReplace =
      !prev ||
      nextPrio > prevPrio ||
      (nextPrio === prevPrio && nextTs > prevTs) ||
      (nextPrio === prevPrio && nextTs === prevTs && nextIso >= prevIso);

    if (shouldReplace) {
      state.verifiedOverlaysByOsis[mapKey] = {
        ...entry,
        lang_code: entryLang,
        target_ref: cleanOsis,
        authorityTier: entry.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED,
        authorityLabel:
          entry.authorityLabel ||
          (entry.authorityTier === OVERLAY_AUTHORITY_MAINTAINER_ED25519
            ? "Edición canónica verificada"
            : "Borrador local firmado en este dispositivo"),
      };
    }

    if (
      entryLang === activeLangClean &&
      cleanOsis.startsWith(activeBookChap) &&
      state.lastNavResult?.chapter?.verses
    ) {
      const ch = state.lastNavResult.chapter;
      if (!ch._immutableBaseVerses) {
        if (Array.isArray(ch.verses)) {
          const baseMap = {};
          for (const vObj of ch.verses) {
            if (vObj && typeof vObj === "object") {
              baseMap[String(vObj.start ?? vObj.verse ?? "")] = String(vObj.text || "");
            }
          }
          ch._immutableBaseVerses = baseMap;
        } else {
          ch._immutableBaseVerses = { ...ch.verses };
        }
      }
      if (!ch._immutableRawVerses && Array.isArray(ch.rawVerses)) {
        const rawMap = {};
        for (const vObj of ch.rawVerses) {
          if (vObj && typeof vObj === "object") {
            rawMap[String(vObj.start ?? vObj.verse ?? "")] = String(vObj.text || "");
          }
        }
        ch._immutableRawVerses = rawMap;
      }
      const vNumStr = cleanOsis.slice(activeBookChap.length);
      const vNumInt = Number(vNumStr);
      const stored = state.verifiedOverlaysByOsis[mapKey];
      const applyValue = (baseText) =>
        isTokenScopedCascadeOverlay(stored, baseText)
          ? replaceAllWholeToken(baseText, stored.old_surface, stored.new_surface)
          : stored.new_surface;
      if (Array.isArray(ch.verses)) {
        for (const vObj of ch.verses) {
          if (vObj && Number(vObj.start ?? vObj.verse) === vNumInt) {
            const origText = ch._immutableBaseVerses[String(vObj.start ?? vObj.verse ?? "")] ?? vObj.text;
            vObj.text = applyValue(origText);
          }
        }
      } else {
        const origText = ch._immutableBaseVerses[vNumStr] ?? ch.verses[vNumStr];
        ch.verses[vNumStr] = applyValue(origText);
      }
      if (Array.isArray(ch.rawVerses)) {
        for (const vObj of ch.rawVerses) {
          if (vObj && Number(vObj.start ?? vObj.verse) === vNumInt) {
            const origRaw = ch._immutableRawVerses?.[String(vObj.start ?? vObj.verse ?? "")] ?? vObj.text;
            vObj.text = applyValue(origRaw);
          }
        }
      }
      appliedCount += 1;
    }
  }
  state.overlayRevision = (Number(state.overlayRevision) || 0) + 1;
  return appliedCount;
}

export function resolveOverlayEntryForOsis(state, lang = "es", osis = "") {
  if (!state || !state.verifiedOverlaysByOsis || !osis) return null;
  const cleanLang = String(lang || state.lang || "es").trim().toLowerCase();
  const baseLang = cleanLang === "es-1909" ? "es-1909" : cleanLang.split("-")[0] || cleanLang;
  const cleanOsis = String(osis).trim().toUpperCase().replace(/\s+/g, ".");
  return (
    state.verifiedOverlaysByOsis[`${cleanLang}:${cleanOsis}`] ||
    state.verifiedOverlaysByOsis[`${baseLang}:${cleanOsis}`] ||
    null
  );
}

export function resolveVerseWithOverlay(state, lang = "es", osis = "", baseText = "") {
  const entry = resolveOverlayEntryForOsis(state, lang, osis);
  if (entry && typeof entry.new_surface === "string" && entry.new_surface.trim().length > 0) {
    if (isTokenScopedCascadeOverlay(entry, baseText)) {
      return baseText ? replaceAllWholeToken(baseText, entry.old_surface, entry.new_surface) : "";
    }
    return entry.new_surface;
  }
  return baseText;
}

export async function ensureStateOverlaysHydrated(state, targetLang = "") {
  if (!state || typeof state !== "object") return;
  const lang = String(targetLang || state.lang || "es").trim().toLowerCase();
  if (state.hydratedOverlayLang !== lang) {
    state.hydratedOverlayLang = lang;
    const t0 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    let raceTimer = null;
    const idbOverlays = await Promise.race([
      loadLiveCascadeOverlaysIdb(lang).catch((err) =>
        err?.code === "IDB_TIMEOUT" ? IDB_TIMEOUT_SENTINEL : [],
      ),
      new Promise((r) => {
        raceTimer = setTimeout(() => r(IDB_TIMEOUT_SENTINEL), 1500);
      }),
    ]).finally(() => {
      if (raceTimer !== null) clearTimeout(raceTimer);
    });
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const timedOut = idbOverlays === IDB_TIMEOUT_SENTINEL;
    state.idbOverlayHydrationTelemetry = {
      lang,
      elapsedMs: Math.round((now - t0) * 100) / 100,
      timeoutBudgetMs: 1500,
      timedOut,
      loadedCount: Array.isArray(idbOverlays) ? idbOverlays.length : 0,
    };
    if (timedOut) {
      state.hydratedOverlayLang = "";
      return;
    }
    if (Array.isArray(idbOverlays) && idbOverlays.length > 0) {
      state.liveCascadeOverlays = idbOverlays;
      applyOverlayEntriesToLiveState(state, idbOverlays);
    }
  } else if (Array.isArray(state.liveCascadeOverlays) && state.liveCascadeOverlays.length > 0) {
    applyOverlayEntriesToLiveState(state, state.liveCascadeOverlays);
  }
}

/**
 * Proyecta de forma simétrica capítulos `Array` y `Object` (`verses: { "1": "..." }`) a través
 * del semirretículo `L1–L3` (`projectChapterThroughCascadeSemilattice`) + `verifiedOverlaysByOsis` (`D9-V2H`).
 */
export function projectChapterWithLiveOverlays(state, effectiveLang, rawChapter) {
  if (!rawChapter || typeof rawChapter !== "object") {
    return { chapterForRender: null, bannerHtml: "", activeAuthority: "" };
  }
  const sourceVerses = rawChapter._immutableBaseVerses || rawChapter.verses || [];
  const rawVerses = rawChapter.verses || [];
  const baseVerseMap = {};
  if (Array.isArray(sourceVerses)) {
    for (const vItem of sourceVerses) {
      if (vItem && typeof vItem === "object") {
        baseVerseMap[String(vItem.start ?? vItem.verse ?? "")] = String(vItem.text || "");
      }
    }
  } else {
    Object.assign(baseVerseMap, sourceVerses);
  }
  const activeBook = String(state?.book || "GEN").toUpperCase();
  const activeChap = Number(state?.chapter) || 1;
  const semilatticeProjectedMap =
    Array.isArray(state?.liveCascadeOverlays) && state.liveCascadeOverlays.length > 0
      ? projectChapterThroughCascadeSemilattice({
        verses: baseVerseMap,
        matrixRows: state?.lastNavResult?.matrix?.rows || [],
        overlays: state.liveCascadeOverlays,
        lang: effectiveLang,
        book: activeBook,
        chapter: activeChap,
      })
      : baseVerseMap;

  const projectTextIdempotent = (vKey, osisKey, ovEntry) => {
    const baseText = String(baseVerseMap[vKey] ?? "");
    const afterSemi = semilatticeProjectedMap[vKey] ?? baseText;
    if (ovEntry && !isTokenScopedCascadeOverlay(ovEntry, baseText)) {
      return typeof ovEntry.new_surface === "string" && ovEntry.new_surface.trim().length > 0
        ? ovEntry.new_surface
        : afterSemi;
    }
    if (afterSemi !== baseText) {
      if (!ovEntry || !ovEntry.new_surface || afterSemi.includes(ovEntry.new_surface)) {
        return afterSemi;
      }
      return resolveVerseWithOverlay(state, effectiveLang, osisKey, afterSemi);
    }
    return resolveVerseWithOverlay(state, effectiveLang, osisKey, baseText);
  };

  const badges = [];
  let projectedVerses;
  if (Array.isArray(rawVerses)) {
    projectedVerses = rawVerses.map((vItem) => {
      if (!vItem || typeof vItem !== "object") return vItem;
      const vKey = String(vItem.start ?? vItem.verse ?? "");
      const osisKey = `${activeBook}.${activeChap}.${vKey}`;
      const ovEntry = resolveOverlayEntryForOsis(state, effectiveLang, osisKey);
      const projectedText = projectTextIdempotent(vKey, osisKey, ovEntry);
      if (ovEntry) {
        const auth = ovEntry.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
        badges.push(
          `<span class="uls-badge cascade-authority-badge" data-overlay-authority="${escHtml(auth)}" data-overlay-osis="${escHtml(osisKey)}" style="font-size:0.72rem;margin:0.2rem 0.25rem 0.35rem 0;display:inline-block;">🔐 ${escHtml(osisKey)} · <code>${escHtml(auth)}</code> (${escHtml(ovEntry.authorityLabel || "")})</span>`,
        );
      }
      return projectedText === vItem.text ? vItem : { ...vItem, text: projectedText };
    });
  } else {
    projectedVerses = {};
    for (const vKey of Object.keys(rawVerses)) {
      const osisKey = `${activeBook}.${activeChap}.${vKey}`;
      const ovEntry = resolveOverlayEntryForOsis(state, effectiveLang, osisKey);
      projectedVerses[vKey] = projectTextIdempotent(vKey, osisKey, ovEntry);
      if (ovEntry) {
        const auth = ovEntry.authorityTier || OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
        badges.push(
          `<span class="uls-badge cascade-authority-badge" data-overlay-authority="${escHtml(auth)}" data-overlay-osis="${escHtml(osisKey)}" style="font-size:0.72rem;margin:0.2rem 0.25rem 0.35rem 0;display:inline-block;">🔐 ${escHtml(osisKey)} · <code>${escHtml(auth)}</code> (${escHtml(ovEntry.authorityLabel || "")})</span>`,
        );
      }
    }
  }

  const activeAuthority =
    badges.length === 0
      ? ""
      : badges[0].includes(OVERLAY_AUTHORITY_MAINTAINER_ED25519)
        ? OVERLAY_AUTHORITY_MAINTAINER_ED25519
        : OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED;
  const bannerHtml =
    badges.length > 0
      ? `<div class="chapter-live-overlays-banner" data-live-cascade-applied="true">${badges.join("")}</div>`
      : "";
  const projectedRawVerses = Array.isArray(rawChapter.rawVerses)
    ? rawChapter.rawVerses.map((vItem) => {
      if (!vItem || typeof vItem !== "object") return vItem;
      const vKey = String(vItem.start ?? vItem.verse ?? "");
      const osisKey = `${activeBook}.${activeChap}.${vKey}`;
      const baseCandidate = semilatticeProjectedMap[vKey] ?? (vItem.text || "");
      const projectedText = resolveVerseWithOverlay(state, effectiveLang, osisKey, baseCandidate);
      return projectedText === vItem.text ? vItem : { ...vItem, text: projectedText };
    })
    : rawChapter.rawVerses;

  return {
    chapterForRender: {
      ...rawChapter,
      verses: projectedVerses,
      ...(Array.isArray(projectedRawVerses) ? { rawVerses: projectedRawVerses } : {}),
    },
    bannerHtml,
    activeAuthority,
  };
}
