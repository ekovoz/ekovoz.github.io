// @req[BIB-V2-18] @req[BIB-V2-19] Web Worker dedicado para composición de Tandas Canónicas PDF (<= 50 páginas)
// conectado 1:1 al núcleo compartido de `editorial-typeset` vía `ekovoz_typeset_worker.wasm` (`SLICE-V2C-12`, `D1B+`, `D2B+`):
// - Doble fuente `/F1` (materna) + `/F2` (puente `CharisSIL-Regular.ttf`) + imposición `2-up 4N` (`/Subtype /Form` XObjects + Inglis).
// - Telemetría honesta de memoria lineal real `wasm.memory.buffer.byteLength` (`0` `Math.min(13 MiB)` `DEB-V2C-02`).
// - Prohibición estricta de degradación silenciosa a `WinAnsiEncoding` (`?`) cuando hay codepoints `> U+00FF` (`DEB-V2C-13`).

const MAX_WORKER_RAM_CEILING_BYTES = 14 * 1024 * 1024;

const FONT_FILE_BY_SCRIPT = {
  Arab: "NotoNaskhArabic-Regular.ttf",
  Aran: "NotoNastaliqUrdu-Regular.ttf",
  Syrc: "NotoSansSyriac-Regular.ttf",
  Hebr: "Cardo-Regular.ttf",
  Grek: "EBGaramond-Regular.ttf",
  Cyrl: "NotoSans-Regular.ttf",
  Deva: "NotoSansDevanagari-Regular.ttf",
  Beng: "NotoSansBengali-Regular.ttf",
  Guru: "NotoSansGurmukhi-Regular.ttf",
  Gujr: "NotoSansGujarati-Regular.ttf",
  Orya: "NotoSansOriya-Regular.ttf",
  Taml: "NotoSansTamil-Regular.ttf",
  Telu: "NotoSansTelugu-Regular.ttf",
  Knda: "NotoSansKannada-Regular.ttf",
  Mlym: "NotoSansMalayalam-Regular.ttf",
  Sinh: "NotoSansSinhala-Regular.ttf",
  Thaa: "NotoSansThaana-Regular.ttf",
  Tibt: "NotoSerifTibetan-Regular.ttf",
  Hans: "NotoSansSC-Regular.ttf",
  Hant: "NotoSansTC-Regular.ttf",
  Jpan: "NotoSansJP-Regular.ttf",
  Kore: "NotoSansKR-Regular.ttf",
  Thai: "NotoSansThai-Regular.ttf",
  Laoo: "NotoSansLao-Regular.ttf",
  Khmr: "NotoSansKhmer-Regular.ttf",
  Mymr: "NotoSansMyanmar-Regular.ttf",
  Ethi: "NotoSansEthiopic-Regular.ttf",
  Tfng: "NotoSansTifinagh-Regular.ttf",
  Geor: "NotoSerifGeorgian-Regular.ttf",
  Armn: "NotoSerifArmenian-Regular.ttf",
  Latn: "CharisSIL-Regular.ttf",
};

const SCRIPT_BY_LANG_PREFIX = {
  ar: "Arab",
  fa: "Arab",
  ur: "Aran",
  syr: "Syrc",
  he: "Hebr",
  hbo: "Hebr",
  grc: "Grek",
  el: "Grek",
  ru: "Cyrl",
  uk: "Cyrl",
  kk: "Cyrl",
  hi: "Deva",
  mr: "Deva",
  ne: "Deva",
  bn: "Beng",
  pa: "Guru",
  gu: "Gujr",
  or: "Orya",
  ta: "Taml",
  te: "Telu",
  kn: "Knda",
  ml: "Mlym",
  si: "Sinh",
  dv: "Thaa",
  bo: "Tibt",
  zh: "Hans",
  ja: "Jpan",
  ko: "Kore",
  th: "Thai",
  lo: "Laoo",
  km: "Khmr",
  my: "Mymr",
  am: "Ethi",
  ti: "Ethi",
  tzm: "Tfng",
  shi: "Tfng",
  ka: "Geor",
  hy: "Armn",
};

let cachedWorkerWasmExports = null;
const cachedFontBytes = new Map();

export function resolveFontFileForLangOrScript(lang = "es", script = "") {
  const cleanScript = String(script || "").trim();
  if (cleanScript && FONT_FILE_BY_SCRIPT[cleanScript]) {
    return FONT_FILE_BY_SCRIPT[cleanScript];
  }
  const cleanLang = String(lang || "es").trim().toLowerCase();
  if (cleanLang.includes("hant") || cleanLang === "zh-tw" || cleanLang === "zh-hk") {
    return FONT_FILE_BY_SCRIPT.Hant;
  }
  const prefix = cleanLang.split("-")[0];
  const mappedScript = SCRIPT_BY_LANG_PREFIX[cleanLang] || SCRIPT_BY_LANG_PREFIX[prefix] || "Latn";
  return FONT_FILE_BY_SCRIPT[mappedScript] || "CharisSIL-Regular.ttf";
}

function containsNonWinAnsiCodepoints(text = "") {
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    const cp = s.codePointAt(i);
    if (cp > 0xffff) i += 1;
    if (
      cp > 0x00ff &&
      cp !== 0x2013 &&
      cp !== 0x2014 &&
      cp !== 0x2018 &&
      cp !== 0x2019 &&
      cp !== 0x201c &&
      cp !== 0x201d &&
      cp !== 0x2026
    ) {
      return true;
    }
  }
  return false;
}

async function ensureWorkerWasmExports(wasmUrlOverride = "", wasmBytesOverride = null) {
  if (wasmBytesOverride instanceof Uint8Array && wasmBytesOverride.byteLength > 8) {
    const instantiated = await WebAssembly.instantiate(wasmBytesOverride, {});
    cachedWorkerWasmExports = instantiated.instance.exports;
    return cachedWorkerWasmExports;
  }
  if (cachedWorkerWasmExports) return cachedWorkerWasmExports;
  if (typeof fetch === "function" && typeof WebAssembly === "object") {
    const targetUrl = wasmUrlOverride || new URL("./ekovoz_typeset_worker.wasm", import.meta.url);
    try {
      const res = await fetch(targetUrl);
      if (res && res.ok) {
        const bytes = await res.arrayBuffer();
        const instantiated = await WebAssembly.instantiate(bytes, {});
        cachedWorkerWasmExports = instantiated.instance.exports;
        return cachedWorkerWasmExports;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function tier0OfflineCandidateForFont(fontFile) {
  if (fontFile === "CharisSIL-Regular.ttf") {
    return new URL("../assets/fonts/CharisSIL-Regular.ttf", import.meta.url);
  }
  if (fontFile === "Cardo-Regular.ttf" || fontFile === "NotoSansHebrew-Regular.ttf") {
    return new URL("../assets/fonts/Cardo-Hebrew-Biblical.ttf", import.meta.url);
  }
  if (fontFile === "EBGaramond-Regular.ttf") {
    return new URL("../assets/fonts/EBGaramond-Greek-Biblical.ttf", import.meta.url);
  }
  return null;
}

async function ensureFontBytesLoaded(
  fontFile,
  fontUrlOverride = "",
  fontBytesOverride = null,
  federationBaseUrl = "",
) {
  if (fontBytesOverride instanceof Uint8Array && fontBytesOverride.byteLength > 64) {
    if (cachedFontBytes.size >= 3) {
      cachedFontBytes.delete(cachedFontBytes.keys().next().value);
    }
    cachedFontBytes.set(fontFile, fontBytesOverride);
    return fontBytesOverride;
  }
  if (cachedFontBytes.has(fontFile)) return cachedFontBytes.get(fontFile);
  if (typeof fetch === "function") {
    const tier0 = tier0OfflineCandidateForFont(fontFile);
    const effectiveFedBase = String(
      federationBaseUrl ||
        (typeof globalThis.EKOVOZ_FEDERATION_BASE_URL === "string"
          ? globalThis.EKOVOZ_FEDERATION_BASE_URL
          : ""),
    )
      .trim()
      .replace(/\/+$/, "");
    const fedFontCandidate = effectiveFedBase
      ? `${effectiveFedBase}/editions-01/fonts/${fontFile}`
      : new URL(`../editions-01/fonts/${fontFile}`, import.meta.url);
    const candidates = fontUrlOverride
      ? [fontUrlOverride]
      : [
        tier0,
        fedFontCandidate,
        new URL(`../../assets/fonts/${fontFile}`, import.meta.url),
      ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate);
        if (res && res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          if (bytes.byteLength > 64) {
            if (cachedFontBytes.size >= 3) {
              cachedFontBytes.delete(cachedFontBytes.keys().next().value);
            }
            cachedFontBytes.set(fontFile, bytes);
            return bytes;
          }
        }
      } catch {
        // Try next candidate
      }
    }
  }
  return null;
}

function executeWasmTandaTypeset(
  wasmExports,
  fontBytes,
  utf8Bytes,
  {
    bridgeFontBytes = null,
    bridgeUtf8Bytes = null,
    columns = 2,
    isLetter = false,
    isRtl = false,
    booklet4n = false,
    fontTenthsPt = 95,
    maxPages = 50,
  } = {},
) {
  if (
    !wasmExports ||
    !wasmExports.memory ||
    typeof wasmExports.wasm_alloc !== "function" ||
    typeof wasmExports.wasm_free !== "function"
  ) {
    return null;
  }
  const hasDual4n = typeof wasmExports.typeset_tanda_pdf_dual_font_4n_in_place === "function";
  const hasSingle = typeof wasmExports.typeset_tanda_pdf_in_place === "function";
  if (!hasDual4n && !hasSingle) {
    return null;
  }

  const f1Len = fontBytes.byteLength;
  const f2Len = bridgeFontBytes instanceof Uint8Array ? bridgeFontBytes.byteLength : 0;
  const tLen = utf8Bytes.byteLength;
  const bLen = bridgeUtf8Bytes instanceof Uint8Array ? bridgeUtf8Bytes.byteLength : 0;
  const outCap = Math.min(8 * 1024 * 1024, Math.max(131072, (tLen + bLen) * 6 + 262144));

  const f1Ptr = wasmExports.wasm_alloc(f1Len) >>> 0;
  const f2Ptr = hasDual4n && f2Len > 0 ? wasmExports.wasm_alloc(f2Len) >>> 0 : 0;
  const tPtr = wasmExports.wasm_alloc(tLen) >>> 0;
  const bPtr = hasDual4n && bLen > 0 ? wasmExports.wasm_alloc(bLen) >>> 0 : 0;
  const outPtr = wasmExports.wasm_alloc(outCap) >>> 0;
  if (!f1Ptr || !tPtr || !outPtr) {
    if (f1Ptr) wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    if (tPtr) wasmExports.wasm_free(tPtr, tLen);
    if (bPtr) wasmExports.wasm_free(bPtr, bLen);
    if (outPtr) wasmExports.wasm_free(outPtr, outCap);
    return null;
  }

  try {
    new Uint8Array(wasmExports.memory.buffer, f1Ptr, f1Len).set(fontBytes);
    if (f2Ptr && f2Len > 0) {
      new Uint8Array(wasmExports.memory.buffer, f2Ptr, f2Len).set(bridgeFontBytes);
    }
    new Uint8Array(wasmExports.memory.buffer, tPtr, tLen).set(utf8Bytes);
    if (bPtr && bLen > 0) {
      new Uint8Array(wasmExports.memory.buffer, bPtr, bLen).set(bridgeUtf8Bytes);
    }

    const safeCols = Math.max(1, Math.min(3, Number(columns) || 2));
    const safeTenths = Math.max(75, Math.min(180, Math.round(Number(fontTenthsPt) || 95)));
    const safePages = Math.max(1, Math.min(50, Number(maxPages) || 50));

    const written = hasDual4n
      ? wasmExports.typeset_tanda_pdf_dual_font_4n_in_place(
        f1Ptr,
        f1Len,
        f2Ptr,
        f2Len,
        tPtr,
        tLen,
        bPtr,
        bLen,
        safeCols,
        isLetter ? 1 : 0,
        isRtl ? 1 : 0,
        booklet4n ? 1 : 0,
        safeTenths,
        safePages,
        outPtr,
        outCap,
      )
      : wasmExports.typeset_tanda_pdf_in_place(
        f1Ptr,
        f1Len,
        tPtr,
        tLen,
        safeCols,
        isLetter ? 1 : 0,
        isRtl ? 1 : 0,
        safeTenths,
        safePages,
        outPtr,
        outCap,
      );

    if (written > 0) {
      const pdfBytes = new Uint8Array(written);
      pdfBytes.set(new Uint8Array(wasmExports.memory.buffer, outPtr, written));
      return pdfBytes;
    }
    return null;
  } finally {
    wasmExports.wasm_free(f1Ptr, f1Len);
    if (f2Ptr) wasmExports.wasm_free(f2Ptr, f2Len);
    wasmExports.wasm_free(tPtr, tLen);
    if (bPtr) wasmExports.wasm_free(bPtr, bLen);
    wasmExports.wasm_free(outPtr, outCap);
  }
}

export function typesetTandaWithCachedWasmSync({
  lang = "es",
  script = "",
  joinedText = "",
  bridgeJoinedText = "",
  columns = 2,
  paper = "a4",
  dir = "ltr",
  booklet4n = false,
  fontPt = 9.5,
  maxPages = 50,
  wasmBytes = null,
  fontBytes: fontBytesOverride = null,
  bridgeFontBytes: bridgeFontOverride = null,
} = {}) {
  const fontFile = resolveFontFileForLangOrScript(lang, script);
  if (!cachedWorkerWasmExports && wasmBytes instanceof Uint8Array && wasmBytes.byteLength > 8) {
    const mod = new WebAssembly.Module(wasmBytes);
    cachedWorkerWasmExports = new WebAssembly.Instance(mod, {}).exports;
  }
  if (!cachedFontBytes.has(fontFile) && fontBytesOverride instanceof Uint8Array && fontBytesOverride.byteLength > 64) {
    if (cachedFontBytes.size >= 3) {
      cachedFontBytes.delete(cachedFontBytes.keys().next().value);
    }
    cachedFontBytes.set(fontFile, fontBytesOverride);
  }
  const fontBytes = cachedFontBytes.get(fontFile);
  if (!cachedWorkerWasmExports || !fontBytes) return null;
  const bridgeFont =
    bridgeFontOverride instanceof Uint8Array
      ? bridgeFontOverride
      : cachedFontBytes.get("CharisSIL-Regular.ttf") || null;
  const utf8Bytes = new TextEncoder().encode(String(joinedText || "Ekovoz Tanda"));
  const bridgeUtf8Bytes = bridgeJoinedText
    ? new TextEncoder().encode(String(bridgeJoinedText))
    : null;
  return executeWasmTandaTypeset(cachedWorkerWasmExports, fontBytes, utf8Bytes, {
    bridgeFontBytes: bridgeFont,
    bridgeUtf8Bytes,
    columns,
    isLetter: String(paper || "a4").toLowerCase().includes("letter"),
    isRtl: String(dir || "ltr").toLowerCase() === "rtl",
    booklet4n: Boolean(booklet4n),
    fontTenthsPt: Math.round((Number(fontPt) || 9.5) * 10),
    maxPages,
  });
}

function mapWinAnsiByte(cp) {
  if (cp <= 0xff) return cp;
  if (cp === 0x2013) return 0x96;
  if (cp === 0x2014) return 0x97;
  if (cp === 0x2018) return 0x91;
  if (cp === 0x2019) return 0x92;
  if (cp === 0x201c) return 0x93;
  if (cp === 0x201d) return 0x94;
  if (cp === 0x2026) return 0x85;
  return 0x2d;
}

function encodeWinAnsiPdfLiteral(str) {
  let out = "(";
  for (let i = 0; i < str.length; i += 1) {
    const cp = str.codePointAt(i);
    if (cp > 0xffff) i += 1;
    if (cp < 0x20) continue;
    const byte = mapWinAnsiByte(cp);
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
      out += `\\${String.fromCharCode(byte)}`;
    } else if (byte >= 0x20 && byte <= 0x7e) {
      out += String.fromCharCode(byte);
    } else {
      out += `\\${byte.toString(8).padStart(3, "0")}`;
    }
  }
  out += ")";
  return out;
}

export function buildStandard14WinAnsiFallbackPdf({
  lines = ["Ekovoz Tanda"],
  columns = 2,
  isLetter = false,
  isRtl = false,
  fontPt = 9.5,
  maxPages = 50,
} = {}) {
  const cols = Math.max(1, Math.min(3, Number(columns) || 2));
  const cleanPt = Math.max(7.5, Math.min(18.0, Number(fontPt) || 9.5));
  const pageW = isLetter ? 612 : 595;
  const pageH = isLetter ? 792 : 842;
  const marginX = 40;
  const marginY = 44;
  const gutter = 14;
  const colW = Math.max(140, pageW - marginX * 2 - gutter * (cols - 1)) / cols;
  const lineH = Math.max(10, Math.round(cleanPt * 1.32));
  const linesPerCol = Math.max(16, Math.floor((pageH - marginY * 2) / lineH));
  const linesPerPage = linesPerCol * cols;
  const pageCount = Math.max(
    1,
    Math.min(Math.max(1, Math.min(50, Number(maxPages) || 50)), Math.ceil(lines.length / linesPerPage)),
  );

  const pageStreams = [];
  for (let p = 0; p < pageCount; p += 1) {
    const slice = lines.slice(p * linesPerPage, (p + 1) * linesPerPage);
    let st = "";
    for (let i = 0; i < slice.length; i += 1) {
      const rawCol = Math.floor(i / linesPerCol);
      const effCol = isRtl ? cols - 1 - rawCol : rawCol;
      const row = i % linesPerCol;
      const x = (marginX + effCol * (colW + gutter)).toFixed(1);
      const y = (pageH - marginY - row * lineH).toFixed(1);
      st += `BT /F1 ${cleanPt.toFixed(1)} Tf ${x} ${y} Td ${encodeWinAnsiPdfLiteral(slice[i])} Tj ET\n`;
    }
    pageStreams.push(st);
  }

  const totalObjs = 4 + pageCount * 2;
  const offsets = new Array(totalObjs + 1).fill(0);
  const chunks = [];
  let cursor = 0;
  const enc = new TextEncoder();
  const pushStr = (s) => {
    const b = enc.encode(s);
    chunks.push(b);
    cursor += b.byteLength;
  };
  const writeObj = (id, body) => {
    offsets[id] = cursor;
    pushStr(`${id} 0 obj\n${body}\nendobj\n`);
  };

  pushStr("%PDF-1.7\n");
  writeObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = Array.from({ length: pageCount }, (_, i) => `${5 + i * 2} 0 R`).join(" ");
  writeObj(2, `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageCount} >>`);
  writeObj(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding /ToUnicode 4 0 R >>");
  const cmap =
    "/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (WinAnsi) /Supplement 0 >> def /CMapName /EkovozWinAnsi def /CMapType 2 def 1 begincodespacerange <20> <FF> endcodespacerange 1 beginbfrange <20> <7E> <0020> endbfrange endcmap CMapName currentdict /CMap defineresource pop end end";
  writeObj(4, `<< /Length ${enc.encode(cmap).byteLength} >>\nstream\n${cmap}\nendstream`);

  for (let i = 0; i < pageCount; i += 1) {
    const pageId = 5 + i * 2;
    const contentId = 6 + i * 2;
    writeObj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    const stLen = enc.encode(pageStreams[i]).byteLength;
    writeObj(contentId, `<< /Length ${stLen} >>\nstream\n${pageStreams[i]}endstream`);
  }

  const xrefOff = cursor;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= totalObjs; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF\n`;
  pushStr(xref);

  const out = new Uint8Array(cursor);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.byteLength;
  }
  return out;
}

export async function runWorkerTandaJob(payload = {}, emitProgress = () => { }) {
  const {
    lang = "es",
    script = "",
    book = "GEN",
    chapter = 1,
    verses = [],
    bridgeVerses = null,
    columns = 2,
    fontPt = 9.5,
    paper = "a4",
    dir = "ltr",
    booklet4n = false,
    maxPagesPerTanda = 50,
    wasmUrl = "",
    fontUrl = "",
    bridgeFontUrl = "",
    wasmBytes = null,
    fontBytes: fontBytesOverride = null,
    bridgeFontBytes: bridgeFontOverride = null,
    federationBaseUrl = "",
  } = payload;

  const normalizeEntries = (raw) =>
    Array.isArray(raw)
      ? raw.map((item, idx) =>
        typeof item === "string"
          ? { ref: `${book} ${chapter}:${idx + 1}`, text: item }
          : { ref: String(item?.ref || `${book} ${chapter}:${item?.verse || idx + 1}`), text: String(item?.text ?? "") },
      )
      : raw && typeof raw === "object"
        ? Object.entries(raw).map(([vNum, text]) => ({ ref: `${book} ${chapter}:${vNum}`, text: String(text ?? "") }))
        : [];

  const entries = normalizeEntries(verses);
  const bridgeEntries = bridgeVerses ? normalizeEntries(bridgeVerses) : [];

  const cappedMaxPages = Math.max(1, Math.min(50, Number(maxPagesPerTanda) || 50));
  const versesPerTanda = Math.max(40, cappedMaxPages * 22);
  const totalTandas = Math.max(1, Math.ceil(Math.max(1, entries.length) / versesPerTanda));
  const fontFile = resolveFontFileForLangOrScript(lang, script);
  const needsBridgeFont = bridgeEntries.length > 0 || fontFile !== "CharisSIL-Regular.ttf";

  const [wasmExports, fontBytes, bridgeFontBytes] = await Promise.all([
    ensureWorkerWasmExports(wasmUrl, wasmBytes),
    ensureFontBytesLoaded(fontFile, fontUrl, fontBytesOverride, federationBaseUrl),
    needsBridgeFont
      ? ensureFontBytesLoaded(
        "CharisSIL-Regular.ttf",
        bridgeFontUrl,
        bridgeFontOverride,
        federationBaseUrl,
      )
      : Promise.resolve(null),
  ]);

  const isLetter = String(paper || "a4").toLowerCase().includes("letter");
  const isRtl =
    String(dir || "ltr").toLowerCase() === "rtl" ||
    ["ar", "fa", "ur", "he", "hbo", "syr", "dv"].includes(String(lang).split("-")[0]);

  const tandas = [];
  for (let tIdx = 0; tIdx < totalTandas; tIdx += 1) {
    const slice = entries.slice(tIdx * versesPerTanda, (tIdx + 1) * versesPerTanda);
    const lines = slice.length > 0 ? slice.map((e) => `${e.ref} ${e.text}`) : [`${book} ${chapter}:1 (${lang})`];
    const joined = lines.join("\n");
    const utf8 = new TextEncoder().encode(joined);

    const bSlice = bridgeEntries.slice(tIdx * versesPerTanda, (tIdx + 1) * versesPerTanda);
    const bridgeUtf8 =
      bSlice.length > 0
        ? new TextEncoder().encode(bSlice.map((e) => `${e.ref} ${e.text}`).join("\n"))
        : null;

    let pdfBytes = null;
    if (wasmExports && fontBytes) {
      pdfBytes = executeWasmTandaTypeset(wasmExports, fontBytes, utf8, {
        bridgeFontBytes,
        bridgeUtf8Bytes: bridgeUtf8,
        columns,
        isLetter,
        isRtl,
        booklet4n: Boolean(booklet4n),
        fontTenthsPt: Math.round((Number(fontPt) || 9.5) * 10),
        maxPages: cappedMaxPages,
      });
    }

    if (!pdfBytes) {
      // DEB-V2C-13: Prohibición absoluta de degradación silenciosa a WinAnsi (`?`) en escrituras > U+00FF
      if (containsNonWinAnsiCodepoints(joined)) {
        return {
          type: "tanda-offline-font-notice",
          status: "OFFLINE_FONT_REQUIRED_USE_CSS_PRINT",
          lang,
          fontFile,
          wasmFontEmbedded: false,
          winAnsiFallbackForbidden: true,
          fallbackRecommendation: "css-paged-media",
          message: `La fuente soberana '${fontFile}' no está en caché offline. Se bloqueó la degradación a WinAnsi ('?'); use Impresión Directa HTML (@media print) o conecte para cachear el shard tipográfico.`,
          totalTandas: 0,
          tandas: [],
          pdfBytes: new Uint8Array(),
          peakRamBytes: wasmExports?.memory?.buffer?.byteLength || 0,
        };
      }
      pdfBytes = buildStandard14WinAnsiFallbackPdf({
        lines,
        columns,
        isLetter,
        isRtl,
        fontPt,
        maxPages: cappedMaxPages,
      });
    }

    // DEB-V2C-02: Medición real sin enmascarar con Math.min(13 MiB)
    const wasmLinearBytes = wasmExports?.memory?.buffer?.byteLength || 0;
    const peakRamBytes = wasmLinearBytes > 0 ? wasmLinearBytes : pdfBytes.byteLength;
    if (peakRamBytes > MAX_WORKER_RAM_CEILING_BYTES) {
      throw new Error(
        `Worker WASM linear memory (${peakRamBytes} B) exceeded constitutional 14 MiB ceiling (${MAX_WORKER_RAM_CEILING_BYTES} B)`,
      );
    }

    emitProgress({
      type: "tanda-progress",
      tandaIndex: tIdx + 1,
      totalTandas,
      bytes: pdfBytes.byteLength,
      peakRamBytes,
      fontFile,
    });
    tandas.push({
      tandaIndex: tIdx + 1,
      totalTandas,
      fontFile,
      pdfBytes,
      peakRamBytes: Math.max(65536, peakRamBytes),
    });
  }

  return {
    type: "tanda-complete",
    lang,
    fontFile,
    wasmFontEmbedded: Boolean(wasmExports && fontBytes),
    booklet4n: Boolean(booklet4n),
    totalTandas,
    tandas,
    pdfBytes: tandas[0]?.pdfBytes || new Uint8Array(),
    peakRamBytes: Math.max(...tandas.map((t) => t.peakRamBytes), 65536),
  };
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function" && typeof self.postMessage === "function") {
  self.addEventListener("message", async (ev) => {
    try {
      const result = await runWorkerTandaJob(ev.data || {}, (prog) => self.postMessage(prog));
      self.postMessage(result);
    } catch (err) {
      self.postMessage({
        type: "tanda-error",
        error: String(err?.message || err),
      });
    }
  });
}
