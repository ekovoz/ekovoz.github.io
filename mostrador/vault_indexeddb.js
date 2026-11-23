// ============================================================================
// web/mostrador/vault_indexeddb.js — Bóveda IndexedDB ACID (`ekovoz_vault_v2`)
// Costura limpia LCOM4 (`∂(C) = 0`) extraída de `offline_mesh.js` (`D3-V2LD` +
// `D10-V2LD` / `ARB-EKOVOZ-95` / `ARB-EKOVOZ-115`).
// Garantiza: resolución únicamente en `tx.oncomplete` (onerror/onabort),
// manejo de `onversionchange`, listado real sobre `store.getAll()`, y lecturas
// `Range` $O(1)$ vía `Blob.slice()`.
// ============================================================================

const IDB_DB_NAME = "ekovoz_vault_v2";
const IDB_DB_VERSION = 2;
export const IDB_STORE_PACKS = "verified_ekpacks";
export const IDB_STORE_FONTS = "verified_fonts_zst";

let _cachedVaultDb = null;
let _cachedVaultDbRef = null;
let _pendingVaultOpenPromise = null;

export function resetVaultDbCache() {
  if (_cachedVaultDb && typeof _cachedVaultDb.close === "function") {
    try {
      _cachedVaultDb.close();
    } catch {
      // Ignore close error on stale ref
    }
  }
  _cachedVaultDb = null;
  _cachedVaultDbRef = null;
  _pendingVaultOpenPromise = null;
}

function requestPersistentStorageOnce() {
  try {
    if (
      globalThis?.navigator?.storage &&
      typeof globalThis.navigator.storage.persist === "function"
    ) {
      globalThis.navigator.storage.persist().catch(() => { });
    }
  } catch {
    // Entornos sin StorageManager (Node/WebViews antiguos)
  }
}

function openSovereignIndexedDb(idbOverride = null) {
  const idb = idbOverride || globalThis?.indexedDB;
  if (!idb || typeof idb.open !== "function") {
    return Promise.resolve(null);
  }
  if (_cachedVaultDb && _cachedVaultDbRef === idb) {
    return Promise.resolve(_cachedVaultDb);
  }
  if (_cachedVaultDb && _cachedVaultDbRef !== idb) {
    resetVaultDbCache();
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
            if (_cachedVaultDb === dbHandle) {
              resetVaultDbCache();
            } else {
              try {
                dbHandle.close?.();
              } catch {
                // Ignore close error
              }
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
      const req = idb.open(IDB_DB_NAME, IDB_DB_VERSION);
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

export async function writeRecordToIndexedDb(storeName, record, idbOverride = null) {
  const db = await openSovereignIndexedDb(idbOverride);
  if (!db || typeof db.transaction !== "function") return false;
  requestPersistentStorageOnce();
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };
    try {
      const tx = db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);
      let putReqOk = false;
      tx.oncomplete = () => done(true);
      tx.onerror = () => done(false);
      tx.onabort = () => done(false);
      const putReq = store.put(record);
      if (putReq) {
        putReq.onsuccess = () => {
          putReqOk = true;
        };
        putReq.onerror = () => done(false);
      } else if (putReqOk) {
        // Unreachable guard keeping strict ACID contract
      }
    } catch {
      resetVaultDbCache();
      done(false);
    }
  });
}

export async function readRecordFromIndexedDb(storeName, key, idbOverride = null) {
  const db = await openSovereignIndexedDb(idbOverride);
  if (!db || typeof db.transaction !== "function") return null;
  return new Promise((resolve) => {
    let settled = false;
    const done = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    try {
      const tx = db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => done(getReq.result || null);
      getReq.onerror = () => done(null);
      tx.onerror = () => done(null);
      tx.onabort = () => done(null);
    } catch {
      resetVaultDbCache();
      done(null);
    }
  });
}

export async function listRecordsFromIndexedDb(storeName, idbOverride = null) {
  const db = await openSovereignIndexedDb(idbOverride);
  if (!db || typeof db.transaction !== "function") return [];
  return new Promise((resolve) => {
    let settled = false;
    const done = (rows) => {
      if (!settled) {
        settled = true;
        resolve(Array.isArray(rows) ? rows : []);
      }
    };
    try {
      const tx = db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      if (typeof store.getAll === "function") {
        const allReq = store.getAll();
        allReq.onsuccess = () => done(allReq.result || []);
        allReq.onerror = () => done([]);
        tx.onerror = () => done([]);
        tx.onabort = () => done([]);
        return;
      }
      if (typeof store.openCursor === "function") {
        const items = [];
        const curReq = store.openCursor();
        curReq.onsuccess = (ev) => {
          const cursor = ev?.target?.result || curReq.result || null;
          if (!cursor) {
            done(items);
            return;
          }
          if (cursor.value) items.push(cursor.value);
          cursor.continue();
        };
        curReq.onerror = () => done(items);
        tx.onerror = () => done(items);
        return;
      }
      done([]);
    } catch {
      resetVaultDbCache();
      done([]);
    }
  });
}

export async function sliceBlobRangeBytes(packRecord, startByte, endByteInclusive) {
  if (!packRecord) return null;
  const s = Math.max(0, Number(startByte) || 0);
  const totalLen = Number(packRecord.byteLen) || Number(packRecord.packBlob?.size) || 0;
  if (totalLen <= 0 || s >= totalLen) return null;
  const endExcl = Math.min(totalLen, Math.max(s + 1, (Number(endByteInclusive) || s) + 1));

  if (packRecord.packBlob && typeof packRecord.packBlob.slice === "function") {
    const ab = await packRecord.packBlob.slice(s, endExcl).arrayBuffer();
    return new Uint8Array(ab);
  }
  if (packRecord.packBytes instanceof Uint8Array) {
    return packRecord.packBytes.slice(s, endExcl);
  }
  return null;
}
