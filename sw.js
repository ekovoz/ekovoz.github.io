// Ekovoz Service Worker (v9.0.0, upgraded from ekovoz-v8) — Zero Dependencies
// Network-First for HTML navigation; Native passthrough for PDFs;
// Same-Origin 200 OK cache + Virtual 206 Partial Content slice for .eco.zst (< 445 KB, Decisión 48C)

const CACHE_NAME = 'ekovoz-v9';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/i18n_ui.js',
  '/bible_reader.js',
  '/obras_manifest.json',
  '/manifest.webmanifest',
  '/canon_lexicon.json',
  '/llms.txt',
  '/og.png',
  '/preview/0007.png',
  '/preview/0018.png',
  '/preview/0016.png'
];

/**
 * Rebanado virtual 206 Partial Content en RAM desde paquete .eco.zst cacheado (Decisión 48C).
 */
function serveVirtualRangeSlice206(fullBuffer, rangeHeader) {
  const m = /^bytes=(\d+)-(\d+)?$/.exec((rangeHeader || '').trim());
  if (!m) {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(fullBuffer.byteLength) },
      body: fullBuffer
    };
  }
  const start = Number(m[1]);
  const end = m[2] !== undefined ? Math.min(Number(m[2]), fullBuffer.byteLength - 1) : fullBuffer.byteLength - 1;
  const slice = fullBuffer.subarray(start, end + 1);
  return {
    status: 206,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${fullBuffer.byteLength}`,
      'Content-Length': String(slice.byteLength)
    },
    body: slice
  };
}

/**
 * Quine de Cliente en < 5 ms (Decisión 46C): empaqueta el lector + paquete .eco.zst en un único archivo HTML autónomo.
 */
function synthesizeOfflineClientQuine(langCode, autonym, ecoZstBase64, readerScriptSource) {
  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lector Bíblico Offline — ${autonym} (${langCode})</title>
</head>
<body data-lang="${langCode}" data-audio-bytes="0" data-jpg-bytes="0">
<main id="offline-bible-root"><h1>${autonym} (${langCode})</h1></main>
<script id="eco-zst-payload" type="application/octet-stream" data-encoding="base64">${ecoZstBase64}</script>
<script type="module">${readerScriptSource}</script>
</body>
</html>`;
}

/**
 * Serializador de retroalimentación de campo en Texto Puro L1-L5 (Decisión 35C — 0 Bytes de Audio).
 */
function serializeFieldFeedbackPatchL1L5({ langCode, cascadeLevel, targetRefOrLemma, oldSurface, newSurface, notePureText }) {
  if (!['L1', 'L2', 'L3', 'L4', 'L5'].includes(cascadeLevel)) {
    throw new Error(`Nivel de cascada inválido: ${cascadeLevel}`);
  }
  return {
    patch_id: `PATCH-${langCode.toUpperCase()}-${cascadeLevel}`,
    lang_code: langCode,
    cascade_level: cascadeLevel,
    target_ref_or_lemma: targetRefOrLemma,
    old_surface: oldSurface || '',
    new_surface: newSurface,
    note_pure_text: notePureText || '',
    audio_bytes: 0
  };
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[Ekovoz SW] Pre-caching partial warning:', err);
        });
      })
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[Ekovoz SW] Purging old cache:', name);
              return caches.delete(name);
            })
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
      return;
    }

    const url = event.request.url;

    // BYPASS: Never intercept or cache large PDF binaries (.pdf).
    // Allow the browser's native download engine to handle them directly.
    if (url.endsWith('.pdf')) {
      return;
    }

    // 0. Compact Bible Packs (.eco.zst < 445 KB — Decisión 48C):
    // Cache-First via Same-Origin 200 OK + Virtual 206 Partial Content slice in RAM.
    if (url.endsWith('.eco.zst')) {
      const rangeHeader = event.request.headers.get('range');
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          let cached = await cache.match(url);
          if (!cached) {
            cached = await fetch(url);
            if (cached && cached.status === 200) {
              await cache.put(url, cached.clone());
            }
          }
          if (rangeHeader && cached) {
            const fullBuf = new Uint8Array(await cached.clone().arrayBuffer());
            const sliced = serveVirtualRangeSlice206(fullBuf, rangeHeader);
            return new Response(sliced.body, {
              status: sliced.status,
              headers: sliced.headers
            });
          }
          return cached;
        })
      );
      return;
    }

    // 1. Navigation / HTML requests: NETWORK-FIRST with cache fallback
    if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
              return cachedResponse || caches.match('/index.html');
            });
          })
      );
      return;
    }

    // 2. Static assets (images, icons, manifests): CACHE-FIRST with network fallback
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
    );
  });
}

export { serveVirtualRangeSlice206, synthesizeOfflineClientQuine, serializeFieldFeedbackPatchL1L5 };
