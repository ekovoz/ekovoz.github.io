// ============================================================================
// web/mostrador/workshop_overlay_store.js — Almacén IndexedDB de Sobrecapas Firmadas Ed25519
// y Proyección Reactiva Unificada Array/Object del Semirretículo `L1–L3` (`SLICE-EKO-V2H-06` + `22`)
// ============================================================================

import {
  CASCADE_SEMILATTICE_PRIORITY,
  projectChapterThroughCascadeSemilattice,
} from "./cascade_l1_l5.js";
import { computeEcoPackCrc32Hex } from "./offline_mesh.js";

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
const CANONICAL_MAINTAINER_ED25519_PUBKEY_HEX =
  "eb08398e334092817873f33e922316b4024f5eb1c0fa7d7fb3fcbfdb33ea27f7";

export const OVERLAY_AUTHORITY_LOCAL_SELF_SIGNED = "LOCAL_WORKSHOP_SELF_SIGNED";
export const OVERLAY_AUTHORITY_MAINTAINER_ED25519 = "VERIFIED_MAINTAINER_ED25519";

function classifyOverlayAuthorityTier(publicKeyHex, isLocalKey = false, maintainerPubHex = "") {
  const cleanPub = String(publicKeyHex || "").trim().toLowerCase();
  const rootMaintainer = String(
    maintainerPubHex || CANONICAL_MAINTAINER_ED25519_PUBKEY_HEX,
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

function openCascadeOverlayIdb(idbFactory) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("IDB open timeout"));
      }
    }, 250);
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
  const expectedCrc = String(
    options.expectedCrc32Hex || receipt.expectedCrc32Hex || computedCrc32Hex,
  ).toLowerCase();
  if (expectedCrc !== computedCrc32Hex.toLowerCase()) {
    return { persisted: false, reason: "CRC32_MISMATCH", computedCrc32Hex };
  }

  let signatureHex = String(options.signatureHex || receipt.signatureHex || "").trim();
  let publicKeyHex = String(options.publicKeyHex || receipt.publicKeyHex || "").trim();
  if (!subtle) return { persisted: false, reason: "WEBCRYPTO_UNAVAILABLE" };

  const signMessageBytes = new TextEncoder().encode(
    `EKOVOZ_CASCADE_OVERLAY_V2:${computedCrc32Hex}:${canonicalPayload}`,
  );
  let signedWithLocalEphemeralKey = false;
  if (!signatureHex && !publicKeyHex) {
    const localKp = await getOrCreateLocalWorkshopEd25519KeyPair(subtle);
    const sigBuf = await subtle.sign({ name: "Ed25519" }, localKp.privateKey, signMessageBytes);
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
    ed25519Ok = Boolean(await subtle.verify({ name: "Ed25519" }, cryptoKey, sigBytes, signMessageBytes));
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
      ed25519Verified: true,
      authorityTier,
      authorityLabel,
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
  if (!idbFactory || typeof idbFactory.open !== "function") return [];
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
    const crc = computeEcoPackCrc32Hex(new TextEncoder().encode(payloadStr));
    if (crc.toLowerCase() !== String(rec.crc32Hex || "").toLowerCase()) continue;
    if (subtle && rec.signatureHex && rec.publicKeyHex) {
      const sigB = hexToBytesWorkshop(rec.signatureHex);
      const pubB = hexToBytesWorkshop(rec.publicKeyHex);
      if (!sigB || !pubB) continue;
      const msgB = new TextEncoder().encode(`EKOVOZ_CASCADE_OVERLAY_V2:${rec.crc32Hex}:${payloadStr}`);
      try {
        const key = await subtle.importKey("raw", pubB, { name: "Ed25519" }, false, ["verify"]);
        const ok = await subtle.verify({ name: "Ed25519" }, key, sigB, msgB);
        if (!ok) continue;
      } catch {
        continue;
      }
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
      const vNumStr = cleanOsis.slice(activeBookChap.length);
      const vNumInt = Number(vNumStr);
      const newSurf = state.verifiedOverlaysByOsis[mapKey].new_surface;
      if (Array.isArray(state.lastNavResult.chapter.verses)) {
        for (const vObj of state.lastNavResult.chapter.verses) {
          if (vObj && Number(vObj.start ?? vObj.verse) === vNumInt) {
            vObj.text = newSurf;
          }
        }
      } else {
        state.lastNavResult.chapter.verses[vNumStr] = newSurf;
      }
      if (Array.isArray(state.lastNavResult.chapter.rawVerses)) {
        for (const vObj of state.lastNavResult.chapter.rawVerses) {
          if (vObj && Number(vObj.start ?? vObj.verse) === vNumInt) {
            vObj.text = newSurf;
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
    return entry.new_surface;
  }
  return baseText;
}

export async function ensureStateOverlaysHydrated(state, targetLang = "") {
  if (!state || typeof state !== "object") return;
  const lang = String(targetLang || state.lang || "es").trim().toLowerCase();
  if (state.hydratedOverlayLang !== lang) {
    state.hydratedOverlayLang = lang;
    const idbOverlays = await Promise.race([
      loadLiveCascadeOverlaysIdb(lang).catch(() => []),
      new Promise((r) => setTimeout(() => r([]), 120)),
    ]);
    if (idbOverlays.length > 0) {
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
  const rawVerses = rawChapter.verses || [];
  const baseVerseMap = {};
  if (Array.isArray(rawVerses)) {
    for (const vItem of rawVerses) {
      if (vItem && typeof vItem === "object") {
        baseVerseMap[String(vItem.start ?? vItem.verse ?? "")] = String(vItem.text || "");
      }
    }
  } else {
    Object.assign(baseVerseMap, rawVerses);
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

  const badges = [];
  let projectedVerses;
  if (Array.isArray(rawVerses)) {
    projectedVerses = rawVerses.map((vItem) => {
      if (!vItem || typeof vItem !== "object") return vItem;
      const vKey = String(vItem.start ?? vItem.verse ?? "");
      const osisKey = `${activeBook}.${activeChap}.${vKey}`;
      const ovEntry = resolveOverlayEntryForOsis(state, effectiveLang, osisKey);
      const baseCandidate = semilatticeProjectedMap[vKey] ?? (vItem.text || "");
      const projectedText = resolveVerseWithOverlay(state, effectiveLang, osisKey, baseCandidate);
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
    for (const [vKey, vText] of Object.entries(rawVerses)) {
      const osisKey = `${activeBook}.${activeChap}.${vKey}`;
      const ovEntry = resolveOverlayEntryForOsis(state, effectiveLang, osisKey);
      const baseCandidate = semilatticeProjectedMap[vKey] ?? vText;
      projectedVerses[vKey] = resolveVerseWithOverlay(
        state,
        effectiveLang,
        osisKey,
        baseCandidate,
      );
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
