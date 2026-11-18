// @req[BIB-V2-19] Motor cliente de Impresora Bimodal (Carril A CSS Paged Media + Carril B Worker WASM <=50p)
// Purgado el emisor JS `/Identity-H` sin `/FontFile2` y conectado `new Worker("./tanda_print_worker.js")` (`SLICE-V2R-16`).

import {
  buildUnicodeColdSeedVectorPdf,
  resolveFontFileForLangOrScript,
  runWorkerTandaJob,
  typesetTandaWithCachedWasmSync,
} from "./tanda_print_worker.js";

function resolvePrecompiledDiskLang(rawLang = "es") {
  const clean = String(rawLang || "").trim().toLowerCase();
  if (clean === "es") return "es";
  if (clean === "en" || clean === "stp" || clean === "he" || clean === "grc") return clean;
  return null;
}

function normalizeVerseEntriesForTanda({ book = "GEN", chapter = 1, verse = 1, text = "", verses = null, versesMap = null } = {}) {
  const source = verses || versesMap;
  if (Array.isArray(source) && source.length > 0) {
    return source.map((item, idx) =>
      typeof item === "string"
        ? { ref: `${book} ${chapter}:${idx + 1}`, text: item }
        : { ref: String(item?.ref || `${book} ${chapter}:${item?.verse || idx + 1}`), text: String(item?.text ?? "") }
    );
  }
  if (source && typeof source === "object") {
    const keys = Object.keys(source).sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
    if (keys.length > 0) {
      return keys.map((k) => ({ ref: `${book} ${chapter}:${k}`, text: String(source[k] ?? "") }));
    }
  }
  const cleanText = String(text || "").trim();
  if (cleanText) {
    return [{ ref: `${book} ${chapter}:${verse}`, text: cleanText }];
  }
  return [{ ref: `${book} ${chapter}:${verse}`, text: `${book} ${chapter}:${verse}` }];
}

function wrapGreedyLines(paragraph, cpl) {
  const words = String(paragraph || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const limit = Math.max(20, cpl);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= limit) {
      cur += ` ${w}`;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function escapePrintHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let cachedFederationReachable = null;
let inFlightFederationProbe = null;

function extractMetaFederationBase(doc = null) {
  const rootDoc = doc || (typeof globalThis.document !== "undefined" ? globalThis.document : null);
  if (!rootDoc) return "";
  if (typeof rootDoc.querySelector === "function") {
    const meta = rootDoc.querySelector('meta[name="ekovoz-federation-base"]');
    const content = meta?.getAttribute?.("content") ?? meta?.content ?? "";
    if (String(content).trim()) return String(content).trim();
  }
  return "";
}

/**
 * Resuelve determinísticamente la URL de un activo en un shard federado (`editions-01`, `packs-01..07`)
 * leyendo `globalThis.EKOVOZ_FEDERATION_BASE_URL` o `<meta name="ekovoz-federation-base">` (`D3-V2D`, `GAP-01`).
 */
export function resolveFederatedAssetUrl(shardName, subPath = "", doc = null, options = {}) {
  const cleanShard = String(shardName || "")
    .trim()
    .replace(/^(\.\/|\/)+/, "")
    .replace(/\/+$/, "");
  const cleanSub = String(subPath || "")
    .trim()
    .replace(/^(\.\/|\/)+/, "");
  const joinedRel = cleanShard && cleanSub ? `${cleanShard}/${cleanSub}` : cleanShard || cleanSub;

  const globalBase =
    typeof globalThis.EKOVOZ_FEDERATION_BASE_URL === "string"
      ? globalThis.EKOVOZ_FEDERATION_BASE_URL.trim()
      : "";
  const effectiveBase = (globalBase || extractMetaFederationBase(doc)).replace(/\/+$/, "");
  if (effectiveBase) {
    return `${effectiveBase}/${joinedRel}`;
  }
  return options.dotSlashPrefix ? `./${joinedRel}` : joinedRel;
}

/** Devuelve el veredicto memoizado de alcanzabilidad del shard `editions-01/` (`true`, `false` o `null`). */
export function getCachedFederationReachability() {
  return cachedFederationReachable;
}

/**
 * Ejecuta como máximo `1` sonda `HEAD` por sesión con timeout estricto de `800 ms` (`RFC 8305` Happy Eyeballs)
 * sobre `editions-01/fonts/fonts_federation_manifest.json`, memoizando el resultado para no romper jamás el
 * *User Activation Gesture* en clics posteriores (`D3-V2D`, `ARB-EKOVOZ-88`).
 */
export async function probeFederationShardReachabilityOnce({
  doc = null,
  fetchImpl = null,
  timeoutMs = 800,
  forceRefresh = false,
} = {}) {
  if (!forceRefresh && cachedFederationReachable !== null) {
    return cachedFederationReachable;
  }
  if (!forceRefresh && inFlightFederationProbe) {
    return inFlightFederationProbe;
  }
  const effectiveFetch =
    typeof fetchImpl === "function"
      ? fetchImpl
      : typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : null;
  if (!effectiveFetch) {
    cachedFederationReachable = false;
    return false;
  }

  const probeUrl = resolveFederatedAssetUrl(
    "editions-01",
    "fonts/fonts_federation_manifest.json",
    doc,
    { dotSlashPrefix: true },
  );
  const effectiveTimeout = Math.max(50, Math.min(5000, Number(timeoutMs) || 800));

  inFlightFederationProbe = (async () => {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // Non-fatal
      }
    }, effectiveTimeout);
    try {
      const res = await effectiveFetch(probeUrl, {
        method: "HEAD",
        cache: "no-store",
        ...(controller ? { signal: controller.signal } : {}),
      });
      const ok = Boolean(res && (res.ok || res.status === 200 || res.status === 204 || res.status === 206));
      cachedFederationReachable = ok;
      return ok;
    } catch {
      cachedFederationReachable = false;
      return false;
    } finally {
      clearTimeout(timer);
      inFlightFederationProbe = null;
    }
  })();

  return inFlightFederationProbe;
}

/**
 * Resuelve en cascada Same-Origin / Federada la ruta de fuentes y ediciones precompiladas (`D1B+` + `D3-V2D`):
 * 1. Núcleo tipográfico Tier-0 offline empacado en `./assets/fonts/` (`CharisSIL-Regular.ttf`, `Cardo-Hebrew-Biblical.ttf`, `EBGaramond-Greek-Biblical.ttf`).
 * 2. Shards federados en `editions-01/fonts/<Font>.ttf` (vía `resolveFederatedAssetUrl`).
 * 3. Síntesis viva en `tanda_print_worker.js` o `@media print` cuando offline o `web/` aislado.
 */
export function resolveSameOriginFontAndPdfCascade({
  lang = "es",
  script = "",
  edition = "2col-a4",
  blockId = "B01",
  doc = null,
} = {}) {
  const cleanLang = String(lang || "es").trim().toLowerCase() || "es";
  const fontFile = resolveFontFileForLangOrScript(cleanLang, script);
  const tier0OfflineUrl =
    fontFile === "CharisSIL-Regular.ttf"
      ? "./assets/fonts/CharisSIL-Regular.ttf"
      : fontFile === "Cardo-Regular.ttf" || fontFile === "NotoSansHebrew-Regular.ttf"
        ? "./assets/fonts/Cardo-Hebrew-Biblical.ttf"
        : fontFile === "EBGaramond-Regular.ttf"
          ? "./assets/fonts/EBGaramond-Greek-Biblical.ttf"
          : null;
  const sameOriginZstFontUrl = `./packs/fonts/${fontFile}.zst`;
  const precompiledLang = resolvePrecompiledDiskLang(cleanLang);
  const fedReachable = getCachedFederationReachability();
  return {
    lang: cleanLang,
    fontFile,
    fontZstUrl: sameOriginZstFontUrl,
    federationReachable: fedReachable,
    fontUrlsCascade: [tier0OfflineUrl || "./assets/fonts/CharisSIL-Regular.ttf"].filter(Boolean),
    boldFontUrlsCascade: ["./assets/fonts/CharisSIL-Bold-Subset.ttf"],
    bridgeFontUrl: "./assets/fonts/CharisSIL-Regular.ttf",
    precompiledBlockUrl:
      precompiledLang && fedReachable !== false
        ? resolveFederatedAssetUrl(
          "editions-01",
          `data/blocks/${precompiledLang}/${edition}/${blockId}.pdf`,
          doc,
          { dotSlashPrefix: true },
        )
        : null,
    precompiledFullUrl:
      precompiledLang && fedReachable !== false
        ? resolveFederatedAssetUrl(
          "editions-01",
          `data/full/${precompiledLang}/${edition}.pdf`,
          doc,
          { dotSlashPrefix: true },
        )
        : null,
    workerSynthesisFallback: "./mostrador/tanda_print_worker.js",
  };
}

/**
 * Construye una hoja completa `@media print` CSS Paged Media (Carril A de la Impresora Bimodal)
 * con `@font-face` Same-Origin (`./assets/fonts/` + `./editions-01/fonts/`) y el 100% de los versículos sin truncamiento.
 */
export function buildCssPagedMediaPrintHtml({
  lang = "es",
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "",
  verses = null,
  columns = 2,
  fontPt = 10.0,
  paper = "a4",
  duplex = true,
  dir = "ltr",
} = {}) {
  const entries = normalizeVerseEntriesForTanda({ book, chapter, verse, text, verses });
  const cleanCols = Math.max(1, Math.min(3, Number(columns) || 2));
  const cleanPt = Math.max(7.5, Math.min(18.0, Number(fontPt) || 10.0));
  const cssPageSize = String(paper || "a4").toLowerCase().includes("letter") ? "letter" : "A4";
  const spineMm = duplex ? "16mm" : "20mm";
  const cascade = resolveSameOriginFontAndPdfCascade({ lang });
  const primaryFontSrc = cascade.fontUrlsCascade
    .map((u) => `url("${escapePrintHtml(u)}") format("truetype")`)
    .join(", ");
  const boldFontSrc = cascade.boldFontUrlsCascade
    .map((u) => `url("${escapePrintHtml(u)}") format("truetype")`)
    .join(", ");
  const primaryBoldFaceRule =
    cascade.fontFile === "CharisSIL-Regular.ttf"
      ? `\n@font-face { font-family: "EkovozPrimaryPrint"; font-weight: 700; font-style: normal; src: ${boldFontSrc}; font-display: swap; }`
      : "";
  const versesHtml = entries
    .map((e) => `<p class="v"><sup class="vn">${escapePrintHtml(e.ref.split(":").pop() || "")}</sup> ${escapePrintHtml(e.text)}</p>`)
    .join("\n");
  return `<!doctype html>
<html lang="${escapePrintHtml(lang)}" dir="${dir === "rtl" ? "rtl" : "ltr"}" data-sovereign-font="${escapePrintHtml(cascade.fontFile)}">
<head>
<meta charset="utf-8">
<title>${escapePrintHtml(`${book} ${chapter} (${lang})`)}</title>
<style>
@font-face { font-family: "EkovozPrimaryPrint"; font-weight: 400; font-style: normal; src: ${primaryFontSrc}; font-display: swap; }${primaryBoldFaceRule}
@font-face { font-family: "Charis SIL"; font-weight: 400; font-style: normal; src: url("./assets/fonts/CharisSIL-Regular.ttf") format("truetype"); font-display: swap; }
@font-face { font-family: "Charis SIL"; font-weight: 700; font-style: normal; src: ${boldFontSrc}; font-display: swap; }
@font-face { font-family: "EkovozHebrewTier0"; src: url("./assets/fonts/Cardo-Hebrew-Biblical.ttf") format("truetype"); font-display: swap; }
@font-face { font-family: "EkovozGreekTier0"; src: url("./assets/fonts/EBGaramond-Greek-Biblical.ttf") format("truetype"); font-display: swap; }
@page { size: ${cssPageSize}; margin: 14mm 14mm 16mm ${spineMm}; }
@media print {
  body { margin: 0; font-family: "EkovozPrimaryPrint", "Charis SIL", "EkovozHebrewTier0", "EkovozGreekTier0", serif; font-size: ${cleanPt}pt; line-height: 1.34; color: #000; }
  h1 { margin: 0 0 0.45em 0; font-size: 1.18em; font-weight: 700; font-synthesis: none; }
  .chapter-cols { column-count: ${cleanCols}; column-gap: 6mm; orphans: 2; widows: 2; }
  .v { margin: 0 0 0.28em 0; text-align: justify; }
  .vn { font-size: 0.72em; font-weight: 700; font-synthesis: none; }
}
</style>
</head>
<body>
<header><h1>${escapePrintHtml(`${book} ${chapter} · ${lang.toUpperCase()}`)}</h1></header>
<main class="chapter-cols">
${versesHtml}
</main>
</body>
</html>`;
}

/**
 * Compone una Tanda PDF (`%PDF-1.7`, `<= 50` páginas, `< 14 MB` RAM) delegando en `ekovoz_typeset_worker.wasm`
 * con `/FontFile2` subconjuntado real (`subsetter` + `rustybuzz` + `unicode-bidi`), y respaldo `Type1 /WinAnsiEncoding`
 * libre de `/Identity-H` sin fuente cuando aún no se ha hidratado WASM en navegador.
 */
export function typesetTandaPdfBytes({
  tandaId = "TANDA-01",
  lang = "es",
  script = "",
  book = "GEN",
  chapter = 1,
  verse = 1,
  text = "",
  verses = null,
  versesMap = null,
  columns = 2,
  fontPt = 9.5,
  paper = "a4",
  paperFormat = "",
  dir = "ltr",
  maxPages = 0,
  editionMode = 0,
  wasmBytes = null,
  fontBytes = null,
} = {}) {
  const effectivePaper = paperFormat || paper || "a4";
  const entries = normalizeVerseEntriesForTanda({ book, chapter, verse, text, verses, versesMap });
  const headerLine = `${tandaId} · ${String(lang).toUpperCase()} · ${book} ${chapter}`;
  const rawParagraphs = [headerLine, ...entries.map((e) => `${e.ref} ${e.text}`)];

  const wasmPdf = typesetTandaWithCachedWasmSync({
    lang,
    script,
    joinedText: rawParagraphs.join("\n"),
    editionMode,
    columns,
    paper: effectivePaper,
    dir,
    fontPt,
    maxPages: maxPages || 200,
    wasmBytes,
    fontBytes,
  });
  if (wasmPdf && wasmPdf.byteLength > 0) {
    return wasmPdf;
  }

  const cols = editionMode === 2 ? 1 : Math.max(1, Math.min(3, Number(columns) || 2));
  const cleanPt = Math.max(7.5, Math.min(18.0, Number(fontPt) || 9.5));
  const isLetter = String(effectivePaper).toLowerCase().includes("letter");
  const pageW = isLetter ? 612 : 595;
  const colW = Math.max(120, pageW - (editionMode === 2 ? 168 : 80) - 14 * (cols - 1)) / cols;
  const cpl = Math.max(20, Math.min(86, Math.round(colW / (cleanPt * 0.5))));
  const wrapped = [];
  for (const para of rawParagraphs) {
    for (const ln of wrapGreedyLines(para, cpl)) wrapped.push(ln);
  }
  return buildUnicodeColdSeedVectorPdf({
    lines: wrapped.length > 0 ? wrapped : [headerLine],
    columns: cols,
    isLetter,
    isRtl: String(dir || "ltr").toLowerCase() === "rtl",
    fontPt: cleanPt,
    maxPages,
    editionMode,
  });
}

/**
 * Despacha la composición de una Tanda Canónica (`Dosis 2` Libro o `Dosis 3` Biblia `<= 50p`) hacia un
 * `Web Worker` real (`new Worker(new URL("./tanda_print_worker.js", import.meta.url), { type: "module" })`)
 * en navegador, o ejecuta `runWorkerTandaJob` directamente en entornos sin API DOM `Worker`.
 */
export async function dispatchTandaWorkerJob(payload = {}, onProgress = () => { }) {
  if (typeof globalThis.Worker === "function" && typeof globalThis.window !== "undefined") {
    return new Promise((resolve, reject) => {
      const worker = new globalThis.Worker(new URL("./tanda_print_worker.js", import.meta.url), {
        type: "module",
      });
      const cleanup = () => {
        try {
          worker.terminate();
        } catch {
          // Non-fatal
        }
      };
      worker.addEventListener("message", (ev) => {
        const msg = ev?.data || {};
        if (msg.type === "tanda-progress") {
          onProgress(msg);
        } else if (msg.type === "tanda-complete" || msg.type === "tanda-offline-font-notice") {
          cleanup();
          resolve(msg);
        } else if (msg.type === "tanda-error") {
          cleanup();
          reject(new Error(msg.error || "Worker tanda job failed"));
        }
      });
      worker.addEventListener("error", (err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err?.message || "Worker error")));
      });
      const fedBase =
        typeof globalThis.EKOVOZ_FEDERATION_BASE_URL === "string" &&
          globalThis.EKOVOZ_FEDERATION_BASE_URL.trim()
          ? globalThis.EKOVOZ_FEDERATION_BASE_URL.trim()
          : extractMetaFederationBase();
      worker.postMessage({
        ...(fedBase ? { federationBaseUrl: fedBase } : {}),
        ...payload,
      });
    });
  }
  return runWorkerTandaJob(payload, onProgress);
}

/**
 * Planificador Soberano de Impresora Bimodal en Cliente (`D8-A+`, `SLICE-V2R-16`):
 * - Carril A (`dose === 1`, `<= 12` págs): `@media print` CSS Paged Media + Tanda PDF `%PDF-1.7` íntegra (`0` truncamiento).
 * - Carril B (`dose === 2` Libro o `dose === 3` Tanda Biblia `<= 50` págs): composición vía `Web Worker` + `ekovoz_typeset_worker.wasm`.
 */
export function planBimodalClientPrint(opts = {}) {
  const {
    dose = 1,
    lang = "es",
    book = "GEN",
    chapter = 1,
    verse = 1,
    text = "",
    verses = null,
    versesMap = null,
    sheets = 1,
    duplex = true,
    columns = 2,
    fontPt = 9.5,
    paper = "a4",
    dir = "ltr",
  } = opts;
  const cleanLang = String(lang || "es").trim().toLowerCase() || "es";
  const precompiledLang = resolvePrecompiledDiskLang(cleanLang);
  const entries = normalizeVerseEntriesForTanda({ book, chapter, verse, text, verses, versesMap });
  const emittedChars = entries.reduce((acc, e) => acc + e.text.length, 0);

  if (Number(dose) === 1) {
    const maxPagesLaneA = Math.max(1, Math.min(12, (Number(sheets) || 1) * (duplex ? 4 : 2)));
    const printHtml = buildCssPagedMediaPrintHtml({
      lang: cleanLang,
      book,
      chapter,
      verse,
      text,
      verses: entries,
      columns,
      fontPt,
      paper,
      duplex,
      dir,
    });
    const pdfBytes = typesetTandaPdfBytes({
      tandaId: "DOSIS1-TANDA",
      lang: cleanLang,
      book,
      chapter,
      verse,
      verses: entries,
      columns,
      fontPt,
      paper,
      dir,
      maxPages: maxPagesLaneA,
    });
    return {
      lane: "A",
      mode: precompiledLang ? "lane_a_precompiled_or_css" : "lane_a_css_and_tanda",
      lang: cleanLang,
      hasPrecompiledPdf: Boolean(precompiledLang),
      truncated: false,
      verseCount: entries.length,
      emittedChars,
      maxPages: 12,
      printHtml,
      pdfBytes,
    };
  }

  const maxPagesPerTanda = 50;
  const pdfBytes = typesetTandaPdfBytes({
    tandaId: `DOSIS${dose}-TANDA-01`,
    lang: cleanLang,
    book,
    chapter,
    verse,
    verses: entries,
    columns,
    fontPt,
    paper,
    dir,
    maxPages: maxPagesPerTanda,
  });
  return {
    lane: "B",
    mode: "lane_b_worker_tanda",
    workerUrl: "mostrador/tanda_print_worker.js",
    lang: cleanLang,
    hasPrecompiledPdf: Boolean(precompiledLang),
    truncated: false,
    verseCount: entries.length,
    emittedChars,
    maxPagesPerTanda,
    peakRamCeilingBytes: 14 * 1024 * 1024,
    pdfBytes,
  };
}
