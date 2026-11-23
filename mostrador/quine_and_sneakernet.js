/**
 * Síntesis Quine HTML Autónomo de `66` Libros (`CompressionStream` / `DecompressionStream("deflate-raw")`,
 * Teorema de Recursión de Kleene 1938) y Transporte Bidireccional Sneakernet (`SLICE-EKO-V2H-05` / `10`,
 * `D4-V2H = 4B+`, `ARB-EKOVOZ-98`, `fabiospampinato/tiny-compressor`).
 */

function escapeHtmlBasic(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bytesToBase64(bytes) {
  if (typeof Buffer === "function") {
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
  }
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.byteLength, i + chunk)));
  }
  return btoa(bin);
}

async function compressUtf8DeflateRawBase64(jsonStr) {
  const rawBytes = new TextEncoder().encode(jsonStr);
  if (typeof CompressionStream === "function") {
    const cs = new CompressionStream("deflate-raw");
    const readPromise = new Response(cs.readable).arrayBuffer();
    const writer = cs.writable.getWriter();
    await Promise.all([
      readPromise,
      (async () => {
        await writer.write(rawBytes);
        await writer.close();
      })(),
    ]);
    const compressedBuf = await readPromise;
    return {
      encoding: "deflate-raw-base64",
      base64: bytesToBase64(new Uint8Array(compressedBuf)),
      rawBytesLen: rawBytes.byteLength,
      compressedBytesLen: compressedBuf.byteLength,
    };
  }
  return {
    encoding: "utf8-base64",
    base64: bytesToBase64(rawBytes),
    rawBytesLen: rawBytes.byteLength,
    compressedBytesLen: rawBytes.byteLength,
  };
}

const RTL_LANG_BASE_CODES = new Set(["he", "heb", "hbo", "ar", "arb", "fa", "pes", "ur", "urd", "yi", "syr"]);

function isRtlQuineLang(langCode) {
  const base = String(langCode || "").trim().toLowerCase().split("-")[0];
  return RTL_LANG_BASE_CODES.has(base);
}

function resolveQuineFontHint(langCode, explicitHint = "") {
  const manual = String(explicitHint || "").trim();
  if (manual) return manual;
  const base = String(langCode || "").trim().toLowerCase().split("-")[0];
  if (base === "he" || base === "heb" || base === "hbo") {
    return "'Noto Serif Hebrew', 'SBL Hebrew', serif";
  }
  if (base === "grc" || base === "el") {
    return "'Gentium Plus', 'Galatia SIL', Georgia, serif";
  }
  if (base === "ar" || base === "arb" || base === "ur" || base === "urd" || base === "fa" || base === "pes" || base === "syr") {
    return "'Noto Naskh Arabic', 'Scheherazade New', serif";
  }
  if (base === "hi" || base === "hin" || base === "mr" || base === "ne") {
    return "'Noto Serif Devanagari', serif";
  }
  if (base === "zh" || base === "ja" || base === "yue") {
    return "'Noto Serif CJK TC', 'Noto Serif CJK JP', serif";
  }
  if (base === "ko") {
    return "'Noto Serif KR', serif";
  }
  return "'Charis SIL', Georgia, serif";
}

/**
 * Constructor síncrono de semilla Quine con bootstrap `DecompressionStream("deflate-raw")` embebido.
 */
export function buildQuineHtml(lang = "es", title = "Ekovoz Offline Quine", options = {}) {
  const cleanLang = String(lang || "es").replace(/[^a-zA-Z0-9-]/g, "") || "es";
  const dirAttr = options.dir || (isRtlQuineLang(cleanLang) ? "rtl" : "ltr");
  const rawFontHint = resolveQuineFontHint(cleanLang, options.fontHint).replace(/"/g, "'");
  const embeddedFontB64 =
    String(options.embeddedFontBase64 || "").replace(/[^A-Za-z0-9+/=]/g, "") ||
    (options.embeddedFontBytes instanceof Uint8Array && options.embeddedFontBytes.byteLength > 64
      ? bytesToBase64(options.embeddedFontBytes)
      : "");
  const embeddedFontFam =
    String(options.embeddedFontFamily || "EkovozVaultedScript").replace(/[^a-zA-Z0-9 _-]/g, "").trim() ||
    "EkovozVaultedScript";
  const fontHint = embeddedFontB64 ? `'${embeddedFontFam}', ${rawFontHint}` : rawFontHint;
  const embeddedFontCss = embeddedFontB64
    ? `@font-face{font-family:'${embeddedFontFam}';src:url('data:font/ttf;base64,${embeddedFontB64}') format('truetype');font-display:swap;}`
    : "";
  const safeTitle = escapeHtmlBasic(title || "Ekovoz Offline Quine");
  const book = String(options.book || "GEN").replace(/[^A-Z0-9]/gi, "").toUpperCase() || "GEN";
  const chapter = Math.max(1, Number(options.chapter) || 1);
  const versesObj = options.verses && typeof options.verses === "object" ? options.verses : {};
  const verseEntries = Object.entries(versesObj)
    .map(([v, txt]) => [Number(v) || 1, String(txt || "")])
    .sort((a, b) => a[0] - b[0]);

  const compressedCorpusB64 = String(options.compressedCorpusB64 || "");
  const corpusEncoding = String(options.corpusEncoding || "deflate-raw-base64");
  const bookCount = Math.max(1, Number(options.bookCount) || (compressedCorpusB64 ? 66 : 1));

  const seedPayloadJson = JSON.stringify({
    schema: "ekovoz.kleene_quine.v3",
    lang: cleanLang,
    dir: dirAttr,
    fontHint,
    title: safeTitle,
    book,
    chapter,
    bookCount,
    verses:
      verseEntries.length > 0
        ? verseEntries
        : [[1, "Ekovoz Quine Autónomo · 31,102 versículos · 0 red"]],
  }).replace(/<\//g, "<\\/");

  const bodyVersesHtml =
    verseEntries.length > 0
      ? verseEntries
        .map(
          ([vn, tx]) =>
            `<p data-verse="${vn}"><sup>${vn}</sup> ${escapeHtmlBasic(tx)}</p>`,
        )
        .join("")
      : `<p>Ekovoz Quine Autónomo (${escapeHtmlBasic(cleanLang.toUpperCase())}) · 31,102 versículos</p>`;

  return (
    `<!DOCTYPE html><html lang="${escapeHtmlBasic(cleanLang)}" dir="${dirAttr}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${safeTitle} (${escapeHtmlBasic(cleanLang.toUpperCase())})</title>` +
    `<style>${embeddedFontCss}body{font-family:${fontHint};max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.65;background:#faf8f5;color:#1c1917}header{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;margin-bottom:1rem}button,select{min-height:44px;padding:.45rem .85rem;border-radius:8px;border:1px solid #78716c;background:#fff;cursor:pointer}</style>` +
    `</head><body data-quine-lang="${escapeHtmlBasic(cleanLang)}" data-quine-dir="${dirAttr}" data-quine-font-hint="${escapeHtmlBasic(fontHint)}" data-quine-embedded-font="${embeddedFontB64 ? "true" : "false"}" data-quine-initial-book="${escapeHtmlBasic(book)}" data-quine-initial-chapter="${chapter}" data-kleene-quine="true" data-quine-books="${bookCount}" data-book-count="${bookCount}">` +
    `<header><div><h1 id="quineHeading" style="margin:0;font-size:1.25rem;">${safeTitle} (${escapeHtmlBasic(cleanLang.toUpperCase())}) · ${book} ${chapter}</h1>` +
    `<small data-quine-codec="${escapeHtmlBasic(corpusEncoding)}" data-quine-font-hint="${escapeHtmlBasic(fontHint)}">${bookCount} libro(s) · 0 fetch · DecompressionStream("deflate-raw")</small></div>` +
    `<div style="display:flex;gap:.4rem;flex-wrap:wrap;"><select id="quineBookSelect" aria-label="Libro"></select><select id="quineChapterSelect" aria-label="Capítulo"></select>` +
    `<button type="button" id="btnReplicateKleeneQuine" onclick="window.__replicateKleeneQuine()">🔁 Clonar Quine Offline (Punto Fijo de Kleene · 0 red)</button></div></header>` +
    `<main id="quineOfflineReader" dir="${dirAttr}">${bodyVersesHtml}</main>` +
    `<script id="quineInitialDomSeed" type="application/json">${seedPayloadJson}</script>` +
    `<script id="ecoCorpusPayload" type="application/octet-stream" data-encoding="${escapeHtmlBasic(corpusEncoding)}">${compressedCorpusB64}</script>` +
    `<script id="quineKleeneBootstrap">(function(){` +
    `window.__resetToInitialQuineSeed=function(){var sd=document.getElementById('quineInitialDomSeed');if(!sd||!sd.textContent)return;try{var s=JSON.parse(sd.textContent);var h=document.getElementById('quineHeading');var r=document.getElementById('quineOfflineReader');var bs=document.getElementById('quineBookSelect');var cs=document.getElementById('quineChapterSelect');if(h)h.textContent=s.title+' ('+String(s.lang||'es').toUpperCase()+') · '+s.book+' '+s.chapter;if(bs)bs.innerHTML='';if(cs)cs.innerHTML='';if(r&&Array.isArray(s.verses))r.innerHTML=s.verses.map(function(it){return '<p data-verse="'+it[0]+'"><sup>'+it[0]+'</sup> '+String(it[1]||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</p>';}).join('');}catch(_e){}};` +
    `window.__buildCanonicalKleeneQuineHtml=function(){window.__resetToInitialQuineSeed();var html='<!DOCTYPE html>'+document.documentElement.outerHTML;if(window.__renderActiveQuineSelection)window.__renderActiveQuineSelection();return html;};` +
    `window.__replicateKleeneQuine=function(){var html=window.__buildCanonicalKleeneQuineHtml();var blob=new Blob([html],{type:'text/html;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lector_offline_${escapeHtmlBasic(cleanLang)}.html';a.click();};` +
    `window.__decodeEcoQuineCorpus=async function(){var el=document.getElementById('ecoCorpusPayload');if(!el||!el.textContent)return null;var b64=el.textContent.trim();if(!b64)return null;var binStr=atob(b64);var bytes=new Uint8Array(binStr.length);for(var i=0;i<binStr.length;i++)bytes[i]=binStr.charCodeAt(i);if(el.getAttribute('data-encoding')==='deflate-raw-base64'&&typeof DecompressionStream==='function'){var ds=new DecompressionStream('deflate-raw');var rp=new Response(ds.readable).arrayBuffer();var w=ds.writable.getWriter();w.write(bytes);w.close();var ab=await rp;return JSON.parse(new TextDecoder().decode(ab));}return JSON.parse(new TextDecoder().decode(bytes));};` +
    `if(typeof window!=='undefined'&&document.getElementById('ecoCorpusPayload')&&document.getElementById('ecoCorpusPayload').textContent){window.__decodeEcoQuineCorpus().then(function(corpus){if(!corpus||!corpus.books)return;window.__quineCorpus=corpus;var bSel=document.getElementById('quineBookSelect');var cSel=document.getElementById('quineChapterSelect');var reader=document.getElementById('quineOfflineReader');var heading=document.getElementById('quineHeading');var bKeys=Object.keys(corpus.books);bSel.innerHTML=bKeys.map(function(k){return '<option value="'+k+'">'+k+'</option>';}).join('');var initBk=bKeys.includes('${book}')?'${book}':(bKeys[0]||'GEN');bSel.value=initBk;var initChMap=corpus.books[initBk]||{};var initCKeys=Object.keys(initChMap);cSel.innerHTML=initCKeys.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');var initCh=initCKeys.includes('${chapter}')?'${chapter}':(initCKeys[0]||'1');cSel.value=initCh;var renderSel=function(){if(!bSel.innerHTML)bSel.innerHTML=bKeys.map(function(k){return '<option value="'+k+'">'+k+'</option>';}).join('');var bk=bSel.value||initBk;var chMap=corpus.books[bk]||{};var cKeys=Object.keys(chMap);if(!cKeys.includes(cSel.value)){cSel.innerHTML=cKeys.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');if(bk===initBk&&cKeys.includes(initCh))cSel.value=initCh;}var ch=cSel.value||cKeys[0]||'1';var vv=chMap[ch]||[];heading.textContent=corpus.title+' ('+corpus.lang.toUpperCase()+') · '+bk+' '+ch;reader.innerHTML=vv.map(function(it){return '<p data-verse="'+it[0]+'"><sup>'+it[0]+'</sup> '+String(it[1]||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</p>';}).join('');};window.__renderActiveQuineSelection=renderSel;renderSel();bSel.onchange=function(){cSel.innerHTML='';renderSel();};cSel.onchange=renderSel;}).catch(function(){});}` +
    `})();</script></body></html>`
  );
}

/**
 * Decodifica los `66` libros de un contenedor `.ekpack` (usando `parseEkpackContainerJs` + `decodeRfc8878RawZstdFrameJs`)
 * y empaqueta la Biblia completa con `CompressionStream("deflate-raw")` dentro del Quine HTML autónomo (`0` WASM extra).
 */
export async function buildFullCorpusDeflateQuineHtml(
  arg1 = {},
  arg2 = "Ekovoz Offline Quine",
  arg3 = {},
) {
  const opts =
    typeof arg1 === "string"
      ? { ...(arg3 || {}), lang: arg1, title: arg2 }
      : arg1 || {};
  const fbDoc = opts.fallbackChapterDoc && typeof opts.fallbackChapterDoc === "object"
    ? opts.fallbackChapterDoc
    : null;
  const {
    lang = "es",
    title = "Ekovoz Offline Quine",
    packBytes = null,
    liveOverlays = [],
  } = opts;
  const book = String(opts.book || fbDoc?.book || "GEN");
  const chapter = Number(opts.chapter || fbDoc?.chapter) || 1;
  const verses =
    opts.verses && typeof opts.verses === "object" && Object.keys(opts.verses).length > 0
      ? opts.verses
      : fbDoc?.verses && typeof fbDoc.verses === "object"
        ? fbDoc.verses
        : {};
  const isIntralang1909 = String(lang || "").trim().toLowerCase() === "es-1909";
  const targetLangBase = String(lang || "es").trim().toLowerCase().split("-")[0];
  const overlayMap = new Map();
  if (Array.isArray(liveOverlays)) {
    for (const ov of liveOverlays) {
      if (!ov || typeof ov !== "object") continue;
      const ovLang = ov.lang_code ?? ov.lang ?? "";
      if (ovLang) {
        const ovBase = String(ovLang).trim().toLowerCase().split("-")[0];
        if (ovBase !== targetLangBase && !(isIntralang1909 && ovBase === "es")) continue;
      }
      const rawRef = String(ov.osis ?? ov.target_ref ?? ov.ref ?? ov.verse_ref ?? "").trim().toUpperCase();
      const rawSurface = ov.newSurface ?? ov.new_surface ?? ov.text;
      if (rawRef && typeof rawSurface === "string" && rawSurface.length > 0) {
        const refParts = rawRef.split(".");
        const normRef =
          refParts.length === 3
            ? `${refParts[0]}.${Number(refParts[1]) || 1}.${Number(refParts[2]) || 1}`
            : rawRef;
        overlayMap.set(normRef, rawSurface);
      }
    }
  }
  const parseEkpackContainerFn =
    opts.parseEkpackContainerFn || opts.parseEkpackContainerJs || null;
  const decodeZstdFrameFn =
    opts.decodeZstdFrameFn || opts.decodeRfc8878RawZstdFrameJs || null;
  const wasmPlayerMod = opts.wasmPlayerMod || opts.playerWasm || null;
  let booksObj = null;
  let bookCount = 0;

  if (
    packBytes instanceof Uint8Array &&
    packBytes.byteLength >= 64 &&
    typeof parseEkpackContainerFn === "function"
  ) {
    try {
      const hdr = parseEkpackContainerFn(packBytes, wasmPlayerMod);
      const ex = wasmPlayerMod?.exports || wasmPlayerMod || null;
      if (Array.isArray(hdr?.books) && hdr.books.length > 0) {
        let packedSymbols = new Uint8Array([0, 0]);
        if (hdr.frame0Offset >= 0 && hdr.frame0ByteLen >= 12) {
          const f0Env = packBytes.subarray(hdr.frame0Offset, hdr.frame0Offset + hdr.frame0ByteLen);
          const hasEv3 =
            f0Env.byteLength >= 183 &&
            f0Env[0] === 0x45 &&
            f0Env[1] === 0x56 &&
            f0Env[2] === 0x33 &&
            f0Env[3] === 0x01;
          const envOff = hasEv3 ? 171 : 0;
          const actualF0Len = new DataView(f0Env.buffer, f0Env.byteOffset + envOff, 4).getUint32(
            0,
            true,
          );
          if (f0Env.byteLength >= envOff + 8 + actualF0Len) {
            const symZstdLen = new DataView(
              f0Env.buffer,
              f0Env.byteOffset + envOff + 4 + actualF0Len,
              4,
            ).getUint32(0, true);
            if (symZstdLen > 0 && envOff + 8 + actualF0Len + symZstdLen <= f0Env.byteLength) {
              packedSymbols = f0Env.subarray(
                envOff + 8 + actualF0Len,
                envOff + 8 + actualF0Len + symZstdLen,
              );
            }
          }
        }
        booksObj = {};
        const decoder = new TextDecoder("utf-8");
        const unicodeBase = Number(hdr.unicode_block_base) || 0;
        const rlzDesc = isIntralang1909 ? hdr.intralang_rlz : null;
        const f67Slice =
          rlzDesc &&
            Number(rlzDesc.frame_byte_len) > 0 &&
            Number(rlzDesc.frame_byte_offset) + Number(rlzDesc.frame_byte_len) <= packBytes.byteLength
            ? packBytes.subarray(
              Number(rlzDesc.frame_byte_offset),
              Number(rlzDesc.frame_byte_offset) + Number(rlzDesc.frame_byte_len),
            )
            : null;
        for (const bkEntry of hdr.books) {
          const start = Number(bkEntry.frame_byte_offset ?? bkEntry.byte_offset) || 0;
          const len = Number(bkEntry.frame_byte_len ?? bkEntry.byte_len) || 0;
          if (len <= 0 || start + len > packBytes.byteLength) continue;
          const frameSlice = packBytes.subarray(start, start + len);
          let rawTsv = null;
          if (
            ex?.memory &&
            typeof ex.wasm_alloc === "function" &&
            typeof ex.wasm_free === "function" &&
            typeof ex.decode_ekpack_book_frame_in_place === "function"
          ) {
            const fPtr = ex.wasm_alloc(len) >>> 0;
            const sLen = packedSymbols.byteLength;
            const sPtr = ex.wasm_alloc(Math.max(4, sLen)) >>> 0;
            let outCap = Math.max(131072, (Number(bkEntry.decompressed_len) || len * 12) * 3);
            let outPtr = ex.wasm_alloc(outCap) >>> 0;
            try {
              new Uint8Array(ex.memory.buffer, fPtr, len).set(frameSlice);
              if (sLen > 0) new Uint8Array(ex.memory.buffer, sPtr, sLen).set(packedSymbols);
              let written = ex.decode_ekpack_book_frame_in_place(
                fPtr,
                len,
                2,
                sPtr,
                sLen,
                unicodeBase >>> 0,
                outPtr,
                outCap,
              );
              if (written === -3) {
                ex.wasm_free(outPtr, outCap);
                outCap *= 3;
                outPtr = ex.wasm_alloc(outCap) >>> 0;
                new Uint8Array(ex.memory.buffer, fPtr, len).set(frameSlice);
                if (sLen > 0) new Uint8Array(ex.memory.buffer, sPtr, sLen).set(packedSymbols);
                written = ex.decode_ekpack_book_frame_in_place(
                  fPtr,
                  len,
                  2,
                  sPtr,
                  sLen,
                  unicodeBase >>> 0,
                  outPtr,
                  outCap,
                );
              }
              if (written > 0) {
                rawTsv = new Uint8Array(ex.memory.buffer, outPtr, written).slice();
              }
            } finally {
              ex.wasm_free(fPtr, len);
              ex.wasm_free(sPtr, Math.max(4, sLen));
              ex.wasm_free(outPtr, outCap);
            }
          } else if (typeof decodeZstdFrameFn === "function") {
            rawTsv = decodeZstdFrameFn(frameSlice, wasmPlayerMod);
          }
          if (!rawTsv) continue;
          if (
            f67Slice &&
            ex?.memory &&
            typeof ex.wasm_alloc === "function" &&
            typeof ex.wasm_free === "function" &&
            typeof ex.decode_ekpack_rlz_book_in_place === "function"
          ) {
            const bLen = rawTsv.byteLength;
            const rLen = f67Slice.byteLength;
            const bPtr = ex.wasm_alloc(bLen) >>> 0;
            const rPtr = ex.wasm_alloc(rLen) >>> 0;
            const rOutCap = Math.max(131072, bLen * 2 + 16384);
            const rOutPtr = ex.wasm_alloc(rOutCap) >>> 0;
            try {
              new Uint8Array(ex.memory.buffer, bPtr, bLen).set(rawTsv);
              new Uint8Array(ex.memory.buffer, rPtr, rLen).set(f67Slice);
              const rWritten = ex.decode_ekpack_rlz_book_in_place(
                bPtr,
                bLen,
                (Number(bkEntry.first_verse_ord) || 0) >>> 0,
                rPtr,
                rLen,
                rOutPtr,
                rOutCap,
              );
              if (rWritten > 0) {
                rawTsv = new Uint8Array(ex.memory.buffer, rOutPtr, rWritten).slice();
              }
            } finally {
              ex.wasm_free(bPtr, bLen);
              ex.wasm_free(rPtr, rLen);
              ex.wasm_free(rOutPtr, rOutCap);
            }
          }
          const lines = decoder.decode(rawTsv).split("\n");
          const chMap = {};
          for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            if (!line) continue;
            const t1 = line.indexOf("\t");
            if (t1 <= 0) continue;
            const ref = line.slice(0, t1);
            let txt = line.slice(t1 + 1);
            const t2 = txt.indexOf("\t");
            if (t2 >= 0) txt = txt.slice(t2 + 1);
            const parts = ref.split(".");
            const chKey = String(Number(parts[1]) || 1);
            const vNum = Math.max(1, Number(parts[2]) || 1);
            const osisKey = `${String(bkEntry.usfm_id).toUpperCase()}.${chKey}.${vNum}`;
            if (overlayMap.has(osisKey)) {
              txt = overlayMap.get(osisKey);
            }
            if (!chMap[chKey]) chMap[chKey] = [];
            chMap[chKey].push([vNum, txt]);
          }
          booksObj[bkEntry.usfm_id] = chMap;
          bookCount += 1;
        }
      }
    } catch {
      booksObj = null;
      bookCount = 0;
    }
  }

  if (!booksObj || bookCount === 0) {
    const chKey = String(Math.max(1, Number(chapter) || 1));
    const bkKey = String(book || "GEN").toUpperCase();
    const fallbackEntries = Object.entries(verses || {})
      .map(([v, t]) => {
        const vn = Number(v) || 1;
        const osisKey = `${bkKey}.${chKey}.${vn}`;
        return [vn, overlayMap.has(osisKey) ? overlayMap.get(osisKey) : String(t || "")];
      })
      .sort((a, b) => a[0] - b[0]);
    if (fallbackEntries.length === 0) {
      const defKey = `${bkKey}.${chKey}.1`;
      fallbackEntries.push([
        1,
        overlayMap.get(defKey) || "En el principio creó Dios los cielos y la tierra.",
      ]);
    }
    booksObj = {
      [bkKey]: {
        [chKey]: fallbackEntries,
      },
    };
    bookCount = 1;
  }

  const corpusJson = JSON.stringify({
    schema: "ekovoz.quine.corpus.v3",
    lang,
    title,
    bookCount,
    books: booksObj,
  });
  const compressed = await compressUtf8DeflateRawBase64(corpusJson);

  const seedVersesMap = {};
  const activeBookCh = booksObj[String(book || "GEN").toUpperCase()]?.[String(Number(chapter) || 1)];
  if (Array.isArray(activeBookCh) && activeBookCh.length > 0) {
    for (const [vn, tx] of activeBookCh) {
      seedVersesMap[String(vn)] = tx;
    }
  } else if (verses && typeof verses === "object") {
    Object.assign(seedVersesMap, verses);
  }

  return buildQuineHtml(lang, title, {
    book,
    chapter,
    fontHint: opts.fontHint,
    embeddedFontBytes: opts.embeddedFontBytes || null,
    embeddedFontBase64: opts.embeddedFontBase64 || "",
    embeddedFontFamily: opts.embeddedFontFamily || "",
    verses: seedVersesMap,
    compressedCorpusB64: compressed.base64,
    corpusEncoding: compressed.encoding,
    bookCount,
  });
}

export function createSneakernetCodecs({
  manifestList,
  defaultPubKeyHex,
  computeCrc32HexFn,
  computeSha256HexSyncFn = null,
  verifyEd25519SyncFn,
  probeBoundsFn,
  extractMetaZstdSliceNoWasmFn = null,
}) {
  function exportSneakernetBundleJson({
    lang = "es",
    packBytes = null,
    sha256 = "",
    requireBinaryPackBytes = false,
  } = {}) {
    const cleanLang = String(lang || "es").trim();
    const lowerLang = cleanLang.toLowerCase();
    const hasBinaryPack = packBytes instanceof Uint8Array && packBytes.byteLength >= 32;
    if (requireBinaryPackBytes && !hasBinaryPack) {
      throw new Error(
        `ERR_SNEAKERNET_MISSING_PACK_BYTES: real .ekpack binary bytes (>= 32 B) required for ${cleanLang}`,
      );
    }
    const manifestEntry =
      manifestList.find((p) => p.lang.toLowerCase() === lowerLang) || manifestList[0];
    const bytes = hasBinaryPack
      ? packBytes
      : new TextEncoder().encode(manifestEntry.signingMessage);
    const hexChars = new Array(bytes.byteLength);
    for (let i = 0; i < bytes.byteLength; i += 1) {
      hexChars[i] = bytes[i].toString(16).padStart(2, "0");
    }
    const hexPayload = hexChars.join("");
    const crc32Hex = computeCrc32HexFn(bytes);
    const computedSha =
      typeof computeSha256HexSyncFn === "function" ? computeSha256HexSyncFn(bytes) : "";
    const normalizedSha =
      /^[0-9a-f]{64}$/i.test(String(sha256 || "").trim())
        ? String(sha256).trim().toLowerCase()
        : computedSha || manifestEntry.sha256;
    return JSON.stringify(
      {
        schema: "ekovoz.sneakernet.ekpack.v2",
        payloadKind: hasBinaryPack ? "ekpack-binary" : "manifest-receipt-only",
        lang: cleanLang,
        file: manifestEntry.file || `${cleanLang}.ekpack`,
        bytes: bytes.byteLength,
        crc32Hex,
        sha256: normalizedSha,
        ed25519PublicKeyHex: manifestEntry.ed25519PublicKeyHex || defaultPubKeyHex,
        signingMessage: manifestEntry.signingMessage,
        ed25519SignatureHex: manifestEntry.ed25519SignatureHex,
        payloadHex: hexPayload,
      },
      null,
      2,
    );
  }

  function importSneakernetBundleJson(bundleJsonString, wasmPlayerMod = null) {
    const parsed = JSON.parse(String(bundleJsonString || "{}"));
    const rawHex = String(parsed.payloadHex || "").trim();
    const cleanHex = rawHex.length % 2 === 0 ? rawHex : rawHex.slice(0, -1);
    const byteCount = cleanHex.length >>> 1;
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i += 1) {
      bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16) || 0;
    }
    const computedCrc = computeCrc32HexFn(bytes);
    const declaredCrc = String(parsed.crc32Hex || "").trim().toLowerCase();
    const crcMatch = /^[0-9a-f]{8}$/.test(declaredCrc) && computedCrc === declaredCrc;
    const declaredSha = String(parsed.sha256 || "").trim().toLowerCase();
    const computedSha =
      typeof computeSha256HexSyncFn === "function" ? computeSha256HexSyncFn(bytes) : "";
    const shaMatch =
      !declaredSha ||
      !computedSha ||
      (/^[0-9a-f]{64}$/.test(declaredSha) && computedSha === declaredSha);
    const pinnedPubKey = String(defaultPubKeyHex || "").trim().toLowerCase();
    const bundlePubKey = String(parsed.ed25519PublicKeyHex || "").trim().toLowerCase();
    const keyPinned = Boolean(pinnedPubKey) && bundlePubKey === pinnedPubKey;
    const sigHex = String(parsed.ed25519SignatureHex || "").trim();
    const probe = probeBoundsFn(bytes, 0, parsed.lang || "es", "", wasmPlayerMod);
    const hasContainerMagic =
      bytes.byteLength >= 4 &&
      new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) >>> 0 === 0x8f92eab1;
    let sigBoundToPayload = false;
    let edOk = false;
    if (keyPinned && sigHex && bytes.byteLength > 0) {
      if (hasContainerMagic) {
        if (probe?.engine === "EKPACK_SEEKABLE_ZSTD_MYTE_O1") {
          const containerMsg = String(probe?.signingMessage || "");
          const msgMatches = !parsed.signingMessage || parsed.signingMessage === containerMsg;
          edOk = Boolean(
            probe?.ed25519Verified &&
            probe?.symSha256Verified &&
            verifyEd25519SyncFn(containerMsg, sigHex, pinnedPubKey),
          );
          sigBoundToPayload = Boolean(probe?.verified && edOk && msgMatches && shaMatch);
        } else if (probe?.engine === "EKPACK_CRYPTO_AUTH_FAILED") {
          edOk = false;
          sigBoundToPayload = false;
        } else {
          // Fallback síncrono sin WASM: prioriza EV3\x01 pre-Zstd; conserva V2 legacy solo para vectores sintéticos
          const metaInfo =
            typeof extractMetaZstdSliceNoWasmFn === "function"
              ? extractMetaZstdSliceNoWasmFn(bytes)
              : null;
          const ev3 = metaInfo?.ev3 || null;
          const cleanLang = String(parsed.lang || "es").trim().toLowerCase();
          if (ev3) {
            const msgMatches = !parsed.signingMessage || parsed.signingMessage === ev3.signingMessageEv3Hex;
            const edSigOk = Boolean(
              !ev3.isDevTest &&
              ev3.langCode.toLowerCase() === cleanLang &&
              metaInfo.preamble.totalFileBytes === bytes.byteLength &&
              msgMatches &&
              sigHex.toLowerCase() === ev3.signatureHex.toLowerCase() &&
              verifyEd25519SyncFn(ev3.signingPayload219, sigHex, pinnedPubKey),
            );
            edOk = edSigOk;
            sigBoundToPayload = Boolean(edOk && shaMatch);
          } else {
            const sigMsg = String(parsed.signingMessage || "").trim();
            const msgMatch = sigMsg.match(
              /^EKPACK-V2-MANIFEST:([^:]+):2:([0-9a-f]{64}):([0-9a-f]{64}):([0-9a-f]{64})$/i,
            );
            const msgLangMatches = Boolean(msgMatch && msgMatch[1].toLowerCase() === cleanLang);
            const expectedMetaSha = msgMatch ? msgMatch[4].toLowerCase() : "";
            const actualMetaSha =
              metaInfo?.metaZstdSlice && typeof computeSha256HexSyncFn === "function"
                ? computeSha256HexSyncFn(metaInfo.metaZstdSlice)
                : "";
            const metaBound = Boolean(
              metaInfo &&
              metaInfo.preamble.totalFileBytes === bytes.byteLength &&
              expectedMetaSha &&
              actualMetaSha === expectedMetaSha,
            );
            const edSigOk = Boolean(sigMsg && verifyEd25519SyncFn(sigMsg, sigHex, pinnedPubKey));
            edOk = Boolean(edSigOk && metaBound && msgLangMatches);
            sigBoundToPayload = Boolean(edOk && shaMatch);
          }
        }
      } else {
        edOk = Boolean(verifyEd25519SyncFn(bytes, sigHex, pinnedPubKey));
        sigBoundToPayload = Boolean(edOk && shaMatch);
      }
    }
    const isValid = Boolean(crcMatch && sigBoundToPayload && bytes.byteLength > 0);
    return {
      valid: isValid,
      verified: isValid,
      ed25519Verified: Boolean(edOk && sigBoundToPayload),
      lang: String(parsed.lang || "es"),
      bytes: bytes.byteLength,
      payloadHex: cleanHex,
      payloadBytes: bytes,
      crc32Hex: computedCrc,
      sha256: computedSha || declaredSha,
      randomAccessUs: isValid ? probe.randomAccessUs : null,
    };
  }

  return { exportSneakernetBundleJson, importSneakernetBundleJson };
}
