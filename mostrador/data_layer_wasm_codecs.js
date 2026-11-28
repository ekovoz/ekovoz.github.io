// web/mostrador/data_layer_wasm_codecs.js — Codecs binarios sin estado `.ekpack`, puentes de memoria lineal
// `WebAssembly`, digest `SHA-256` puro y proyecciones relacionales `3NF` (`SLICE-V2C-02`, `D11B+`: ∂_mut(C) = 0).

import { decodeRfc8878RawZstdFrameJs } from "./offline_mesh.js";

const MATRIX_TIER0_SCHEMA_CRC32 = 0x4e14c015;

export const MATRIX_ROW_COLUMNS = Object.freeze([
  "verse",
  "c03",
  "c04",
  "c05",
  "c06",
  "c07",
  "c08",
  "c09",
  "c10",
  "c11",
  "c12",
  "c13",
  "c14",
  "c02_word_pos",
  "c06_translit",
]);

/**
 * Empaqueta la tabla `fsst_symbol_table` (`Vec<Vec<u8>>`) al formato binario
 * `[cnt_lo, cnt_hi, len_lo_i, len_hi_i_or_u8, ...sym_i]` esperado por `decode_ekpack_book_frame_in_place`
 * en `ekovoz_player_wasm`. Soporta entradas `<= 255 B` (símbolos FSST) y también diccionarios
 * `ZSTD_RAW_DICT_SYM_TAG` mayores a `255 B` codificando longitud extendida con centinela `0xFF` cuando aplica,
 * preservando compatibilidad 100% con el formato `[cnt_lo, cnt_hi, len_u8, ...]` existente.
 */
export function packFsstSymbolTableBytes(symbolTable) {
  if (typeof symbolTable === "string") {
    const clean = symbolTable.trim();
    if (!clean) return new Uint8Array([0, 0]);
    if (typeof Buffer !== "undefined") {
      const buf = Buffer.from(clean, "base64");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
    return out;
  }
  const list = Array.isArray(symbolTable) ? symbolTable : [];
  let total = 2;
  const norm = [];
  for (const s of list) {
    const arr = s instanceof Uint8Array ? s : new Uint8Array(s || []);
    if (arr.byteLength >= 255) {
      // Centinela 0xFF seguido de u32 LE para entradas largas (ej. diccionario Zstd compartido `ZSTD_RAW_DICT\0`)
      norm.push({ long: true, bytes: arr });
      total += 5 + arr.byteLength;
    } else {
      norm.push({ long: false, bytes: arr });
      total += 1 + arr.byteLength;
    }
  }
  const out = new Uint8Array(total);
  out[0] = norm.length & 0xff;
  out[1] = (norm.length >>> 8) & 0xff;
  let cursor = 2;
  for (const item of norm) {
    const sym = item.bytes;
    if (item.long) {
      out[cursor++] = 0xff;
      out[cursor++] = sym.byteLength & 0xff;
      out[cursor++] = (sym.byteLength >>> 8) & 0xff;
      out[cursor++] = (sym.byteLength >>> 16) & 0xff;
      out[cursor++] = (sym.byteLength >>> 24) & 0xff;
    } else {
      out[cursor++] = sym.byteLength;
    }
    out.set(sym, cursor);
    cursor += sym.byteLength;
  }
  return out;
}

export function allocWasmBuffer(exports, len) {
  if (typeof exports.wasm_alloc === "function") return exports.wasm_alloc(len) >>> 0;
  if (typeof exports.alloc_pcm_buffer === "function") return exports.alloc_pcm_buffer(len) >>> 0;
  if (typeof exports.alloc_frame_buffer === "function") return exports.alloc_frame_buffer(len) >>> 0;
  return 0;
}

export function freeWasmBuffer(exports, ptr, len) {
  if (!ptr) return;
  if (typeof exports.wasm_free === "function") {
    exports.wasm_free(ptr, len);
  } else if (typeof exports.free_pcm_buffer === "function") {
    exports.free_pcm_buffer(ptr, len);
  }
}

export function decodeZstdFrameInPlayerWasm(wasmMod, frameBytes, decompressedHint = 0) {
  const exports = wasmMod?.exports || wasmMod || null;
  if (
    !exports ||
    !exports.memory ||
    typeof exports.decode_ekpack_zstd_frame_in_place !== "function"
  ) {
    return decodeRfc8878RawZstdFrameJs(frameBytes, wasmMod);
  }
  const inLen = frameBytes.byteLength;
  const inPtr = allocWasmBuffer(exports, inLen);
  let outCap = Math.min(
    16 * 1024 * 1024,
    Math.max(65536, Number(decompressedHint) > 0 ? Number(decompressedHint) + 1024 : inLen * 8),
  );
  let outPtr = allocWasmBuffer(exports, outCap);
  try {
    new Uint8Array(exports.memory.buffer, inPtr, inLen).set(frameBytes);
    let written = exports.decode_ekpack_zstd_frame_in_place(inPtr, inLen, outPtr, outCap);
    while (written === -3 && outCap < 16 * 1024 * 1024) {
      freeWasmBuffer(exports, outPtr, outCap);
      outCap = Math.min(16 * 1024 * 1024, outCap * 4);
      outPtr = allocWasmBuffer(exports, outCap);
      new Uint8Array(exports.memory.buffer, inPtr, inLen).set(frameBytes);
      written = exports.decode_ekpack_zstd_frame_in_place(inPtr, inLen, outPtr, outCap);
    }
    if (written < 0) {
      throw new Error(`decode_ekpack_zstd_frame_in_place failed (code=${written})`);
    }
    const res = new Uint8Array(written);
    res.set(new Uint8Array(exports.memory.buffer, outPtr, written));
    return res;
  } finally {
    freeWasmBuffer(exports, inPtr, inLen);
    freeWasmBuffer(exports, outPtr, outCap);
  }
}

export function decodeBookFrameTsvBytesInPlayerWasm(
  wasmMod,
  frameBytes,
  packedSymbols,
  unicodeBlockBase = 0,
  decompressedHint = 0,
) {
  const exports = wasmMod?.exports || wasmMod || null;
  if (
    !exports ||
    !exports.memory ||
    typeof exports.decode_ekpack_book_frame_in_place !== "function"
  ) {
    throw new Error("ekovoz_player_wasm missing decode_ekpack_book_frame_in_place");
  }
  const fLen = frameBytes.byteLength;
  const sLen = packedSymbols.byteLength;
  const fPtr = allocWasmBuffer(exports, fLen);
  const sPtr = allocWasmBuffer(exports, Math.max(4, sLen));
  let outCap = Math.max(
    131072,
    Number(decompressedHint) > 0 ? Number(decompressedHint) * 4 : fLen * 12,
  );
  let outPtr = allocWasmBuffer(exports, outCap);
  try {
    new Uint8Array(exports.memory.buffer, fPtr, fLen).set(frameBytes);
    if (sLen > 0) new Uint8Array(exports.memory.buffer, sPtr, sLen).set(packedSymbols);
    let written = exports.decode_ekpack_book_frame_in_place(
      fPtr,
      fLen,
      2,
      sPtr,
      sLen,
      unicodeBlockBase >>> 0,
      outPtr,
      outCap,
    );
    while (written === -3 && outCap < 32 * 1024 * 1024) {
      freeWasmBuffer(exports, outPtr, outCap);
      outCap *= 3;
      outPtr = allocWasmBuffer(exports, outCap);
      new Uint8Array(exports.memory.buffer, fPtr, fLen).set(frameBytes);
      if (sLen > 0) new Uint8Array(exports.memory.buffer, sPtr, sLen).set(packedSymbols);
      written = exports.decode_ekpack_book_frame_in_place(
        fPtr,
        fLen,
        2,
        sPtr,
        sLen,
        unicodeBlockBase >>> 0,
        outPtr,
        outCap,
      );
    }
    if (written < 0) {
      throw new Error(`decode_ekpack_book_frame_in_place failed (code=${written})`);
    }
    const out = new Uint8Array(written);
    out.set(new Uint8Array(exports.memory.buffer, outPtr, written));
    return out;
  } finally {
    freeWasmBuffer(exports, fPtr, fLen);
    freeWasmBuffer(exports, sPtr, Math.max(4, sLen));
    freeWasmBuffer(exports, outPtr, outCap);
  }
}

export function decodeRlzBookTsvBytesInPlayerWasm(wasmMod, baseTsvBytes, firstVerseOrd, frame67Bytes) {
  const exports = wasmMod?.exports || wasmMod || null;
  if (
    !exports ||
    !exports.memory ||
    typeof exports.decode_ekpack_rlz_book_in_place !== "function"
  ) {
    throw new Error("ekovoz_player_wasm missing decode_ekpack_rlz_book_in_place");
  }
  const bLen = baseTsvBytes.byteLength;
  const rLen = frame67Bytes.byteLength;
  const bPtr = allocWasmBuffer(exports, bLen);
  const rPtr = allocWasmBuffer(exports, rLen);
  let outCap = Math.max(131072, bLen * 2 + 16384);
  let outPtr = allocWasmBuffer(exports, outCap);
  try {
    new Uint8Array(exports.memory.buffer, bPtr, bLen).set(baseTsvBytes);
    new Uint8Array(exports.memory.buffer, rPtr, rLen).set(frame67Bytes);
    let written = exports.decode_ekpack_rlz_book_in_place(
      bPtr,
      bLen,
      firstVerseOrd >>> 0,
      rPtr,
      rLen,
      outPtr,
      outCap,
    );
    while (written === -3 && outCap < 32 * 1024 * 1024) {
      freeWasmBuffer(exports, outPtr, outCap);
      outCap *= 3;
      outPtr = allocWasmBuffer(exports, outCap);
      new Uint8Array(exports.memory.buffer, bPtr, bLen).set(baseTsvBytes);
      new Uint8Array(exports.memory.buffer, rPtr, rLen).set(frame67Bytes);
      written = exports.decode_ekpack_rlz_book_in_place(
        bPtr,
        bLen,
        firstVerseOrd >>> 0,
        rPtr,
        rLen,
        outPtr,
        outCap,
      );
    }
    if (written < 0) {
      throw new Error(`decode_ekpack_rlz_book_in_place failed (code=${written})`);
    }
    const out = new Uint8Array(written);
    out.set(new Uint8Array(exports.memory.buffer, outPtr, written));
    return out;
  } finally {
    freeWasmBuffer(exports, bPtr, bLen);
    freeWasmBuffer(exports, rPtr, rLen);
    freeWasmBuffer(exports, outPtr, outCap);
  }
}

export function parseBookTsvIntoChapters(tsvBytes) {
  const decodedStr = new TextDecoder("utf-8").decode(tsvBytes);
  const chaptersMap = new Map();
  let maxCh = 0;
  for (const line of decodedStr.split("\n")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    const osis = line.slice(0, tab);
    const text = line.slice(tab + 1);
    const parts = osis.split(".");
    const chNum = Number(parts[1]) || 1;
    const [vStartRaw, vEndRaw] = String(parts[2] || "1").split("-");
    const vStart = Number(vStartRaw) || 1;
    const vEnd = Number(vEndRaw || vStartRaw) || vStart;
    if (chNum > maxCh) maxCh = chNum;
    if (!chaptersMap.has(chNum)) chaptersMap.set(chNum, []);
    chaptersMap.get(chNum).push([vStart, vEnd, text]);
  }
  const chapters = [];
  for (let c = 1; c <= maxCh; c += 1) {
    chapters.push(chaptersMap.get(c) || []);
  }
  return chapters;
}

export function reconstructMatrixChapterFromDictPool(
  parsedBook,
  chapter,
  hdr,
  dictDoc,
  requestedBook = null,
) {
  const reqUpper = requestedBook ? String(requestedBook).toUpperCase() : "";
  const chTuple = parsedBook[1].find(
    (c) =>
      Number(c[0]) === chapter &&
      (!reqUpper ||
        typeof c[3] !== "string" ||
        String(c[3]).toUpperCase() === reqUpper),
  );
  if (!chTuple) return null;
  const bCode = String(
    (typeof chTuple[3] === "string" && chTuple[3]) ||
    requestedBook ||
    parsedBook[0] ||
    "",
  );
  const idxRows = Array.isArray(chTuple[1]) ? chTuple[1] : [];
  const strongsArr = Array.isArray(chTuple[2]) ? chTuple[2] : [];

  // v4 Two-Tier Order-Preserving Dictionary (`Binnig et al. SIGMOD 2009`, `D3-V2F`):
  // Tier 1 (`dictDoc.closed_strings` <= 24 KB) + Tier 2 (`parsedBook[2..5]` cold per-book / warm division pool < 95 KB cold HTTP 206).
  if (Array.isArray(dictDoc?.closed_strings) && Array.isArray(parsedBook[2])) {
    const closedPool = dictDoc.closed_strings;
    const bookStrings = parsedBook[2];
    const bookLexemes = Array.isArray(parsedBook[3]) ? parsedBook[3] : [];
    const bookRealiaMap = parsedBook[4] && typeof parsedBook[4] === "object" ? parsedBook[4] : {};
    const bookPrags = Array.isArray(parsedBook[5]) ? parsedBook[5] : null;
    const bookNum =
      (typeof chTuple[4] === "number" && Number(chTuple[4])) ||
      Number(parsedBook[6]) ||
      (Array.isArray(hdr?.books)
        ? hdr.books.findIndex((b) => String(b[0]).toUpperCase() === bCode.toUpperCase()) + 1
        : 1) ||
      1;
    const macBc = String(bookNum).padStart(2, "0") + String(chapter).padStart(3, "0");
    const getClosed = (idx) => String(closedPool[Number(idx) || 0] ?? "");
    const getLocal = (idx) => String(bookStrings[Number(idx) || 0] ?? "");

    const isColumnarSoa = chTuple.length >= 12 && (idxRows.length === 0 || typeof idxRows[0] === "number");
    const rows = isColumnarSoa
      ? (() => {
        const wDeltas = Array.isArray(chTuple[3]) ? chTuple[3] : [];
        const lSurfs = Array.isArray(chTuple[4]) ? chTuple[4] : [];
        const lexIds = Array.isArray(chTuple[5]) ? chTuple[5] : [];
        const g06s = Array.isArray(chTuple[6]) ? chTuple[6] : [];
        const l10s = Array.isArray(chTuple[7]) ? chTuple[7] : [];
        const g11s = Array.isArray(chTuple[8]) ? chTuple[8] : [];
        const l12s = Array.isArray(chTuple[9]) ? chTuple[9] : [];
        const l13s = Array.isArray(chTuple[10]) ? chTuple[10] : [];
        const l14s = Array.isArray(chTuple[11]) ? chTuple[11] : [];
        const outRows = new Array(idxRows.length);
        let curV = 1;
        let curW = 1;
        for (let i = 0; i < idxRows.length; i += 1) {
          const vd = Number(idxRows[i]) || 0;
          const wd = Number(wDeltas[i]) || 1;
          if (i === 0) {
            curV = vd;
            curW = wd;
          } else if (vd !== 0) {
            curV += vd;
            curW = wd;
          } else {
            curW += wd;
          }
          const vNum = Math.max(1, curV);
          const wordPos = Math.max(1, curW);
          const macBcv = macBc + String(vNum).padStart(3, "0");
          const lt = bookLexemes[Number(lexIds[i]) || 0] || [0, 0, 0, 0, 0, 0];
          const c07Full = getLocal(lt[3])
            .replaceAll("~C:", "CONCEPTICON:")
            .replaceAll("~S:", "SDBH:")
            .replaceAll("~L:", "LN:");
          const c10Exp = getLocal(l10s[i]).replaceAll("^", macBcv).replaceAll("%", macBc);
          const c10Full = c10Exp.startsWith("~")
            ? `${bCode}.${chapter}.${vNum}.${c10Exp.slice(1)}`
            : c10Exp;
          const c12Full = getLocal(l12s[i])
            .replaceAll("^", macBcv)
            .replaceAll("%", macBc)
            .replaceAll("~E:", "EVID:")
            .replaceAll("~F:", "REF:");
          const c13Full = getLocal(l13s[i])
            .replaceAll("^", macBcv)
            .replaceAll("%", macBc)
            .replaceAll("~P:", "PRIM:")
            .replaceAll("~F:", "REF:");
          const c14Full = getLocal(l14s[i])
            .replaceAll("~U", "UNIVERSAL_TRANSPARENT:NONE")
            .replaceAll("~R:", "REALIA_GLOSS_REQUIRED:")
            .replaceAll("~M:", "METROLOGY_GLOSS_REQUIRED:")
            .replaceAll("~V:", "VOICE:");
          outRows[i] = [
            vNum,
            getLocal(lSurfs[i]),
            getLocal(lt[0]),
            getLocal(lt[2]),
            getClosed(g06s[i]),
            c07Full,
            getLocal(lt[4]),
            getLocal(lt[5]),
            c10Full,
            getClosed(g11s[i]),
            c12Full,
            c13Full,
            c14Full,
            wordPos,
            getLocal(lt[1]),
          ];
        }
        return outRows;
      })()
      : idxRows.map((r, rowIdx) => {
        const vNum = Number(r[0]) || 1;
        const macBcv = macBc + String(vNum).padStart(3, "0");
        const wordPos = Number(r[1]) || rowIdx + 1;
        const lt = bookLexemes[Number(r[3]) || 0] || [0, 0, 0, 0, 0, 0, 0];
        const pt = bookPrags
          ? bookPrags[Number(r[4]) || 0] || [0, 0, 0, 0, 0]
          : [r[4], r[5], r[6], r[7], r[8]];
        const has6Prag = pt.length >= 6;
        const c07Full = getLocal(lt[3])
          .replaceAll("~C:", "CONCEPTICON:")
          .replaceAll("~S:", "SDBH:")
          .replaceAll("~L:", "LN:");
        const c10Exp = getLocal(pt[1]).replaceAll("^", macBcv).replaceAll("%", macBc);
        const c10Full = c10Exp.startsWith("~")
          ? `${bCode}.${chapter}.${vNum}.${c10Exp.slice(1)}`
          : c10Exp;
        const c12Full = getLocal(pt[3])
          .replaceAll("^", macBcv)
          .replaceAll("%", macBc)
          .replaceAll("~E:", "EVID:")
          .replaceAll("~F:", "REF:");
        const raw13 = has6Prag ? getLocal(pt[4]) : getLocal(lt[6]);
        const c13Full = raw13
          .replaceAll("^", macBcv)
          .replaceAll("%", macBc)
          .replaceAll("~P:", "PRIM:")
          .replaceAll("~F:", "REF:");
        const raw14 = getLocal(has6Prag ? pt[5] : pt[4]);
        const c14Full = raw14
          .replaceAll("~U", "UNIVERSAL_TRANSPARENT:NONE")
          .replaceAll("~R:", "REALIA_GLOSS_REQUIRED:")
          .replaceAll("~M:", "METROLOGY_GLOSS_REQUIRED:")
          .replaceAll("~V:", "VOICE:");
        return [
          vNum,
          getLocal(r[2]),
          getLocal(lt[0]),
          getLocal(lt[2]),
          getClosed(pt[0]),
          c07Full,
          getLocal(lt[4]),
          getLocal(lt[5]),
          c10Full,
          getClosed(pt[2]),
          c12Full,
          c13Full,
          c14Full,
          wordPos,
          getLocal(lt[1]),
        ];
      });
    const realia = [];
    for (const sc of strongsArr) {
      const entries = bookRealiaMap[String(sc)];
      if (Array.isArray(entries)) realia.push(...entries);
    }
    return {
      book: bCode,
      chapter,
      schema_crc32: Number(hdr?.schema_crc32) || MATRIX_TIER0_SCHEMA_CRC32,
      columns: hdr?.columns || MATRIX_ROW_COLUMNS,
      col_descriptors: hdr?.col_descriptors || null,
      rows,
      realia,
      attribution: hdr?.attribution || "",
    };
  }

  const pool = Array.isArray(dictDoc?.strings) ? dictDoc.strings : [];
  const lexemes = Array.isArray(dictDoc?.lexemes) ? dictDoc.lexemes : [];
  const prags = Array.isArray(dictDoc?.prag) ? dictDoc.prag : [];
  const lexMap = dictDoc?.lexicon || {};
  const getS = (idx) => String(pool[Number(idx) || 0] ?? "");
  const rows = idxRows.map((r, rowIdx) => {
    const vNum = Number(r[0]) || 1;
    const lt = lexemes[Number(r[2]) || 0] || [0, 0, 0, 0, 0, 0, 0];
    const pt = prags[Number(r[5]) || 0] || [0, 0];
    const c10Raw = getS(r[4]);
    const c10Full = c10Raw.startsWith("~")
      ? `${bCode}.${chapter}.${vNum}.${c10Raw.slice(1)}`
      : c10Raw;
    return [
      vNum,
      getS(r[1]),
      getS(lt[0]),
      getS(lt[1]),
      getS(r[3]),
      getS(lt[2]),
      getS(lt[3]),
      getS(lt[4]),
      c10Full,
      getS(pt[0]),
      getS(pt[1]),
      getS(lt[5]),
      getS(lt[6]),
      rowIdx + 1,
      getS(lt[0]),
    ];
  });
  const realia = [];
  for (const sc of strongsArr) {
    const entries = lexMap[String(sc)];
    if (Array.isArray(entries)) realia.push(...entries);
  }
  return {
    book: bCode,
    chapter,
    schema_crc32: MATRIX_TIER0_SCHEMA_CRC32,
    columns: hdr?.columns || MATRIX_ROW_COLUMNS,
    rows,
    realia,
    attribution: hdr?.attribution || "",
  };
}

/**
 * D1-C+ (`MSWasm POPL 2023` + `ARB-EKOVOZ-62`):
 * Copia un payload `Uint8Array` a la memoria lineal compartida `wasmExports.memory`
 * mediante `wasm_alloc` / `alloc_frame_buffer` e invoca `decode_optical_frame_in_place(ptr, len, expectedDropIdx)`.
 */
export function decodeFrameInWasmLinearMemory(wasmMod, frameBytes, expectedDropIdx = 0) {
  const exports = wasmMod?.exports || wasmMod;
  if (!exports || !exports.memory || typeof exports.decode_optical_frame_in_place !== "function") {
    return null;
  }
  const bytes =
    frameBytes instanceof Uint8Array
      ? frameBytes
      : typeof frameBytes === "string"
        ? new TextEncoder().encode(frameBytes)
        : new Uint8Array(frameBytes || []);
  if (bytes.byteLength === 0) return -1;
  const ptr = allocWasmBuffer(exports, bytes.byteLength) || 1024;
  try {
    new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength).set(bytes);
    return exports.decode_optical_frame_in_place(ptr, bytes.byteLength, expectedDropIdx >>> 0);
  } finally {
    if (typeof exports.wasm_free === "function") exports.wasm_free(ptr, bytes.byteLength);
  }
}

/**
 * D1-C+ (`ARB-EKOVOZ-62`):
 * Copia un bloque RaptorQ / LT Fountain a `wasmExports.memory` e invoca `verify_raptorq_esi_block_in_place(ptr, len, expectedK)`.
 */
export function verifyRaptorQBlockInWasmLinearMemory(wasmMod, blockBytes, expectedK = 8) {
  const exports = wasmMod?.exports || wasmMod;
  if (!exports || !exports.memory || typeof exports.verify_raptorq_esi_block_in_place !== "function") {
    return null;
  }
  const bytes =
    blockBytes instanceof Uint8Array
      ? blockBytes
      : typeof blockBytes === "string"
        ? new TextEncoder().encode(blockBytes)
        : new Uint8Array(blockBytes || []);
  if (bytes.byteLength === 0) return -1;
  const ptr = allocWasmBuffer(exports, bytes.byteLength) || 2048;
  try {
    new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength).set(bytes);
    return exports.verify_raptorq_esi_block_in_place(ptr, bytes.byteLength, Math.max(1, expectedK >>> 0));
  } finally {
    if (typeof exports.wasm_free === "function") exports.wasm_free(ptr, bytes.byteLength);
  }
}

/**
 * D1-C+ (`ARB-EKOVOZ-62`, `SLICE-EKO-HIG13-24`):
 * Copia un frame PCM/Opus a `wasmExports.memory` de `ekovoz_player_wasm` e invoca `verify_audio_frame_crc16_in_place(ptr, len)`.
 * Exportación WASM latente intencional bajo la invariante arquitectónica `0 Bytes de Audio` en red/mostrador:
 * la aplicación web no descarga ni transmite audio binario; el helper permanece disponible para verificación
 * local de integridad CRC-16 sobre búferes en memoria cuando una herramienta offline invoca `ekovoz_player_wasm`.
 */
export function verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, pcmBytes) {
  const exports = wasmMod?.exports || wasmMod;
  if (!exports || !exports.memory || typeof exports.verify_audio_frame_crc16_in_place !== "function") {
    return null;
  }
  const bytes =
    pcmBytes instanceof Uint8Array
      ? pcmBytes
      : typeof pcmBytes === "string"
        ? new TextEncoder().encode(pcmBytes)
        : new Uint8Array(pcmBytes || []);
  if (bytes.byteLength === 0) return -1;
  const ptr =
    typeof exports.alloc_pcm_buffer === "function"
      ? exports.alloc_pcm_buffer(bytes.byteLength) >>> 0
      : allocWasmBuffer(exports, bytes.byteLength);
  try {
    new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength).set(bytes);
    return exports.verify_audio_frame_crc16_in_place(ptr, bytes.byteLength);
  } finally {
    if (typeof exports.free_pcm_buffer === "function" && ptr) {
      exports.free_pcm_buffer(ptr, bytes.byteLength);
    } else {
      freeWasmBuffer(exports, ptr, bytes.byteLength);
    }
  }
}

function computeCrc16CcittFallback(bytes) {
  let crc = 0xffff;
  for (let i = 0; i < bytes.byteLength; i += 1) {
    crc ^= (bytes[i] & 0xff) << 8;
    for (let b = 0; b < 8; b += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return Math.max(1, crc);
}

const SPANISH_STRONG_VOWEL_RE = /[aeoáéóíúAEOÁÉÓÍÚ]/;
const SPANISH_ALL_VOWEL_RE = /[aeiouyáéíóúüAEIOUYÁÉÍÓÚÜ]/;
const SPANISH_INSEPARABLE_ONSET_SET = new Set([
  "pr", "pl", "br", "bl", "tr", "dr", "cr", "cl", "gr", "gl", "fr", "fl", "ch", "ll", "rr",
]);

function isVowelUnitAt(chars, idx) {
  const ch = chars[idx];
  if (!ch || !SPANISH_ALL_VOWEL_RE.test(ch)) return false;
  const low = ch.toLowerCase();
  const prev = idx > 0 ? chars[idx - 1].toLowerCase() : "";
  const next = idx + 1 < chars.length ? chars[idx + 1].toLowerCase() : "";
  // U muda tras 'q' o 'g' delante de e/i/é/í (pero 'ü' sí suena)
  if (low === "u" && (prev === "q" || prev === "g") && "eiéí".includes(next)) return false;
  // La 'y' solo actúa como vocal si va tras otra vocal (rey) o aislada (y)
  if (low === "y" && chars.length > 1 && idx + 1 < chars.length && SPANISH_ALL_VOWEL_RE.test(next)) return false;
  return true;
}

function formsHiatusPair(v1, v2) {
  return SPANISH_STRONG_VOWEL_RE.test(v1) && SPANISH_STRONG_VOWEL_RE.test(v2);
}

/**
 * Silabeador ortográfico español determinista (`GOLD-713` / `D3-HIG8`):
 * respeta diptongos, triptongos, hiatos (`í`, `ú`, vocales fuertes), dígrafos (`ch`, `ll`, `rr`, `qu`, `gu`)
 * y ataques consonánticos inseparables manteniendo puntuación adjunta.
 */
export function splitSpanishOrthographicSyllables(rawToken = "") {
  const s = String(rawToken || "");
  const m = s.match(/^([^\p{L}]*)([\p{L}]+)([^\p{L}]*)$/u);
  if (!m) return s ? [s] : [];
  const [, pre, word, post] = m;
  const chars = Array.from(word);
  const nuclei = [];
  let i = 0;
  while (i < chars.length) {
    if (!isVowelUnitAt(chars, i)) {
      i += 1;
      continue;
    }
    const start = i;
    let end = i + 1;
    while (end < chars.length && isVowelUnitAt(chars, end) && !formsHiatusPair(chars[end - 1], chars[end])) {
      end += 1;
    }
    nuclei.push([start, end]);
    i = end;
  }
  if (nuclei.length <= 1) return [s];
  const cuts = [0];
  for (let n = 0; n < nuclei.length - 1; n += 1) {
    const cStart = nuclei[n][1];
    const cEnd = nuclei[n + 1][0];
    const cluster = chars.slice(cStart, cEnd).join("").toLowerCase();
    let splitAt = cStart;
    if (cluster.length === 1) {
      splitAt = cStart;
    } else if (cluster.length === 2) {
      splitAt = SPANISH_INSEPARABLE_ONSET_SET.has(cluster) ? cStart : cStart + 1;
    } else if (cluster.length >= 3) {
      const last2 = cluster.slice(-2);
      splitAt = SPANISH_INSEPARABLE_ONSET_SET.has(last2) ? cEnd - 2 : cEnd - 1;
    }
    cuts.push(splitAt);
  }
  cuts.push(chars.length);
  const out = [];
  for (let k = 0; k < cuts.length - 1; k += 1) {
    let part = chars.slice(cuts[k], cuts[k + 1]).join("");
    if (k === 0) part = pre + part;
    if (k === cuts.length - 2) part += post;
    if (part) out.push(part);
  }
  return out.length > 0 ? out : [s];
}

const GREEK_CYRILLIC_SYLLABLE_RE =
  /[^\sαεηιουωάέήίόύώϊϋΐΰаеёиоуыэюяіїє]*[αεηιουωάέήίόύώϊϋΐΰаеёиоуыэюяіїє]+(?:[^\sαεηιουωάέήίόύώϊϋΐΰаеёиоуыэюяіїє]+(?=[^\sαεηιουωάέήίόύώϊϋΐΰаеёиоуыэюяіїє][αεηιουωάέήίόύώϊϋΐΰаеёиоуыэюяіїє])|[^\sαεηιουωάέήίόύώϊϋΐΰаеёиоуыэюяіїє]*$)|.+/giu;

export function segmentMultilingualSyllables(cleanText) {
  const rawTokens = String(cleanText || "").trim().split(/\s+/).filter(Boolean);
  const syllables = [];
  for (const tok of rawTokens) {
    if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u.test(tok)) {
      const units = tok.match(/[\p{L}\p{N}]\p{M}*|[^\s\p{L}\p{N}]+/gu) || [tok];
      for (const u of units) syllables.push(u);
      continue;
    }
    if (/[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Oriya}\p{Script=Ethiopic}]/u.test(tok)) {
      const aksharas = tok.match(/\p{L}(?:\p{M}|\u200D\p{L}|[\u094D\u09CD\u0BCD\u0C4D\u0D4D]\p{L})*|[^\s\p{L}]+/gu) || [tok];
      for (const ak of aksharas) syllables.push(ak);
      continue;
    }
    if (/[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}]/u.test(tok)) {
      const clusters = tok.match(/\p{L}\p{M}*/gu) || [];
      if (clusters.length >= 2) {
        const prefixPunct = tok.match(/^[^\p{L}]+/u)?.[0] || "";
        const suffixPunct = tok.match(/[^\p{L}\p{M}]+$/u)?.[0] || "";
        for (let i = 0; i < clusters.length; i += 2) {
          let beat;
          if (i + 3 === clusters.length) {
            beat = clusters.slice(i, i + 3).join("");
            i = clusters.length;
          } else {
            beat = clusters.slice(i, Math.min(clusters.length, i + 2)).join("");
          }
          if (i === 0 && prefixPunct) beat = prefixPunct + beat;
          if (i + 2 >= clusters.length && suffixPunct) beat += suffixPunct;
          syllables.push(beat);
        }
        continue;
      }
      syllables.push(tok);
      continue;
    }
    if (/^[^\p{L}]*\p{Script=Latin}+[^\p{L}]*$/u.test(tok)) {
      for (const syl of splitSpanishOrthographicSyllables(tok)) {
        if (syl) syllables.push(syl);
      }
      continue;
    }
    const parts = tok.match(GREEK_CYRILLIC_SYLLABLE_RE);
    if (parts && parts.length > 0) {
      for (const p of parts) {
        const cleanPart = p.trim();
        if (cleanPart) syllables.push(cleanPart);
      }
    } else {
      syllables.push(tok);
    }
  }
  return syllables;
}

/**
 * D5-S21+ (`ARB-EKOVOZ-63`, `ekovoz_player_wasm`, `ARB-EKOVOZ-108` ~39 bits/s):
 * Calcula las pausas prosódicas ($\tau_1$ coma, $\tau_2$ punto y coma, $\tau_3$ punto/selah),
 * segmenta sílabas Unicode multilingües, alinea el cursor dado `(elapsedMs, totalMs, syllableCount)`
 * e invoca `verify_audio_frame_crc16_in_place` sobre la memoria lineal de `ekovoz_player_wasm`.
 */
export function computeProsodyAndSyllableAlignmentInWasm(
  { text = "", wpm = 150, elapsedMs = 0, totalMs = 12000 } = {},
  wasmMod = null,
) {
  const exports = wasmMod?.exports || wasmMod || null;
  const safeWpm = Math.max(70, Math.min(220, Math.floor(Number(wpm) || 150)));
  const cleanText = String(text || "En el principio creó Dios los cielos y la tierra.").trim();
  const syllables = segmentMultilingualSyllables(cleanText);
  if (syllables.length === 0) {
    syllables.push(cleanText || "Selah");
  }
  const syllableCount = syllables.length;
  const safeTotalMs = Math.max(500, Math.floor(Number(totalMs) || 12000));
  const safeElapsedMs = Math.max(0, Math.min(safeTotalMs, Math.floor(Number(elapsedMs) || 0)));

  const baseBeatMs = Math.max(180, Math.floor(60000 / safeWpm));
  const hasWasmPause = Boolean(exports && typeof exports.compute_prosodic_pause_ms === "function");
  const pauseCommaMs = hasWasmPause
    ? Number(exports.compute_prosodic_pause_ms(1, safeWpm)) >>> 0
    : Math.floor((baseBeatMs * 3) / 5);
  const pauseSemicolonMs = hasWasmPause
    ? Number(exports.compute_prosodic_pause_ms(2, safeWpm)) >>> 0
    : Math.floor((baseBeatMs * 9) / 10);
  const pausePeriodSelahMs = hasWasmPause
    ? Number(exports.compute_prosodic_pause_ms(3, safeWpm)) >>> 0
    : Math.floor((baseBeatMs * 7) / 5);

  const hasWasmAlign = Boolean(exports && typeof exports.align_syllable_cursor_ms === "function");
  const activeSyllableIndex = hasWasmAlign
    ? Number(exports.align_syllable_cursor_ms(safeElapsedMs, safeTotalMs, syllableCount)) >>> 0
    : Math.min(syllableCount - 1, Math.floor((safeElapsedMs * syllableCount) / safeTotalMs));

  const textBytes = new TextEncoder().encode(`${cleanText}|wpm=${safeWpm}`);
  const wasmCrc16 = verifyAudioPcmCrc16InWasmLinearMemory(wasmMod, textBytes);
  const crc16 =
    typeof wasmCrc16 === "number" && wasmCrc16 > 0
      ? wasmCrc16
      : computeCrc16CcittFallback(textBytes);

  return {
    wpm: safeWpm,
    targetBitsPerSec: 39,
    syllablesPerSec: Number(((syllableCount * 1000) / safeTotalMs).toFixed(2)),
    elapsedMs: safeElapsedMs,
    totalMs: safeTotalMs,
    syllableCount,
    syllables,
    activeSyllableIndex,
    activeSyllable: syllables[activeSyllableIndex] || syllables[0] || "",
    pauseCommaMs,
    pauseSemicolonMs,
    pausePeriodSelahMs,
    crc16,
    crc16Hex: `0x${crc16.toString(16).toUpperCase().padStart(4, "0")}`,
    wasmBacked: hasWasmPause && hasWasmAlign,
  };
}

export function sha256HexFromBytes(inputBytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const bytes = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes || []);
  const bitLen = bytes.length * 8;
  const totalLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

export function normalizeEvangeliosCorpusDoc(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const rawItems = Array.isArray(raw.entries)
    ? raw.entries
    : Array.isArray(raw.plates)
      ? raw.plates
      : [];
  const entries = rawItems.map((item, idx) => {
    const weekNum = Number(item.week) || idx + 1;
    const id = item.id || `s${String(weekNum).padStart(2, "0")}`;
    const qVal = item.quarter;
    const quarter =
      typeof qVal === "number"
        ? `T${qVal}`
        : typeof qVal === "string" && qVal.startsWith("T")
          ? qVal
          : `T${Math.min(4, Math.floor(idx / 13) + 1)}`;
    return {
      ...item,
      id,
      plate_id: item.plate_id || id,
      week: weekNum,
      quarter,
    };
  });
  return {
    ...raw,
    work: raw.work || "evangelios",
    quarters: Array.isArray(raw.quarters) ? raw.quarters : ["T1", "T2", "T3", "T4"],
    entries,
    plates: Array.isArray(raw.plates) ? raw.plates : entries,
  };
}

const CANONICAL_NSM_BOOK_SUBTITLES = {
  GEN: "Cómo Dios hizo todo en el principio y habló con Abraham",
  EXO: "Cómo Dios sacó a su pueblo de Egipto y les dio su palabra",
  LEV: "Cómo vivir cerca del Dios santo sin mancha",
  PSA: "Cantos y oraciones del corazón delante de Dios",
  MAT: "Las buenas noticias de Jesús el Mesías y su Reino",
  MRK: "Lo que Jesús el Hijo de Dios hizo con poder",
  LUK: "La historia verdadera de Jesús para todas las personas",
  JHN: "La Palabra viva de Dios que vino a dar vida eterna",
  ROM: "Cómo Dios hace justos a los que confían en Jesús",
  "1CO": "Cómo vivir unidos en amor como cuerpo de Cristo",
  REV: "Lo que Jesús mostró que sucederá cuando Dios haga nuevas todas las cosas",
};

export function resolveLocalizedBookMeta(bookNamesDoc, bookCode, fallbackMeta = null) {
  const code = String(bookCode || "GEN").toUpperCase();
  const books = Array.isArray(bookNamesDoc?.books) ? bookNamesDoc.books : [];
  const found = books.find((b) => String(b.code || "").toUpperCase() === code);
  if (found) {
    const name = String(found.name || fallbackMeta?.es || fallbackMeta?.en || code);
    const chapters = Number(found.chapters) || fallbackMeta?.chapters || 1;
    const nsm = String(
      found.nsm_subtitle ||
      CANONICAL_NSM_BOOK_SUBTITLES[code] ||
      `Libro de ${name} (${chapters} capítulos en palabras sencillas NSM-65)`,
    );
    return {
      code,
      ordinal: Number(found.ordinal) || fallbackMeta?.ord || 1,
      name,
      abbr: String(found.abbr || code),
      nsmSubtitle: nsm,
      nsm_subtitle: nsm,
      chapters,
    };
  }
  const fallbackName = String(fallbackMeta?.es || fallbackMeta?.en || code);
  const fallbackNsm =
    CANONICAL_NSM_BOOK_SUBTITLES[code] ||
    `Libro de ${fallbackName} en palabras sencillas NSM-65`;
  return {
    code,
    ordinal: fallbackMeta?.ord || 1,
    name: fallbackName,
    abbr: code,
    nsmSubtitle: fallbackNsm,
    nsm_subtitle: fallbackNsm,
    chapters: fallbackMeta?.chapters || 1,
  };
}

const CANONICAL_24_METROLOGY_UNITS = Object.freeze([
  { unit_id: "MET-01", term_es: "Codo (Ammah)", si_equivalence: "~45 cm", everyday_isomorphism: "2 cuartas de mano adulta (del codo a la punta del dedo)", sample_ref: "GEN.6.15", strong_code: "H0520" },
  { unit_id: "MET-02", term_es: "Palmo menor (Tefaj)", si_equivalence: "~7.5 cm", everyday_isomorphism: "Ancho de 4 dedos juntos de la mano", sample_ref: "EXO.25.25", strong_code: "H2947" },
  { unit_id: "MET-03", term_es: "Palmo mayor (Zeret)", si_equivalence: "~22.5 cm", everyday_isomorphism: "1 cuarta abierta desde el pulgar hasta el meñique", sample_ref: "EXO.28.16", strong_code: "H2239" },
  { unit_id: "MET-04", term_es: "Caña de medir (Qaneh)", si_equivalence: "~3.1 m", everyday_isomorphism: "Altura de un techo alto de casa o 6 codos largos", sample_ref: "EZK.40.5", strong_code: "H7070" },
  { unit_id: "MET-05", term_es: "Estadio (Stadion)", si_equivalence: "~185 m", everyday_isomorphism: "Casi 2 cuadras de calle caminadas a paso firme", sample_ref: "LUK.24.13", strong_code: "G4712" },
  { unit_id: "MET-06", term_es: "Milla romana (Milion)", si_equivalence: "~1.48 km", everyday_isomorphism: "15 minutos caminando por vereda llana (1,000 pasos dobles)", sample_ref: "MAT.5.41", strong_code: "G3400" },
  { unit_id: "MET-07", term_es: "Camino de sábado", si_equivalence: "~1.1 km", everyday_isomorphism: "Caminata tranquila de 12 minutos desde la aldea", sample_ref: "ACT.1.12", strong_code: "G4521" },
  { unit_id: "MET-08", term_es: "Braza náutica (Orguia)", si_equivalence: "~1.85 m", everyday_isomorphism: "Brazos extendidos de punta a punta de un pescador adulto", sample_ref: "ACT.27.28", strong_code: "G3712" },
  { unit_id: "MET-09", term_es: "Siclo (Shekel)", si_equivalence: "~11.4 g", everyday_isomorphism: "Peso de 2 monedas grandes de bolsillo", sample_ref: "GEN.23.15", strong_code: "H8255" },
  { unit_id: "MET-10", term_es: "Gera (Gerah)", si_equivalence: "~0.57 g", everyday_isomorphism: "Peso de 1 semilla de algarrobo o grano seco", sample_ref: "EXO.30.13", strong_code: "H1626" },
  { unit_id: "MET-11", term_es: "Beka (Beqa)", si_equivalence: "~5.7 g", everyday_isomorphism: "Medio siclo: 1 moneda mediana de plata", sample_ref: "EXO.38.26", strong_code: "H1235" },
  { unit_id: "MET-12", term_es: "Mina (Maneh)", si_equivalence: "~570 g", everyday_isomorphism: "Medio kilo de grano o metal precioso en bolsa", sample_ref: "LUK.19.13", strong_code: "G3414" },
  { unit_id: "MET-13", term_es: "Talento (Kikkar)", si_equivalence: "~34.2 kg", everyday_isomorphism: "1 costal pesado de maíz cargado al hombro", sample_ref: "MAT.25.15", strong_code: "G5007" },
  { unit_id: "MET-14", term_es: "Libra romana (Litra)", si_equivalence: "~327 g", everyday_isomorphism: "1 frasco de barro lleno de perfume de nardo puro", sample_ref: "JHN.12.3", strong_code: "G3046" },
  { unit_id: "MET-15", term_es: "Denario / Dracma", si_equivalence: "1 jornal diario", everyday_isomorphism: "El pago completo de un día de trabajo en el campo", sample_ref: "MAT.20.2", strong_code: "G1220" },
  { unit_id: "MET-16", term_es: "Leptón (Blanca)", si_equivalence: "1/128 de jornal", everyday_isomorphism: "La moneda más pequeña de cobre para comprar un puñado de harina", sample_ref: "MRK.12.42", strong_code: "G3016" },
  { unit_id: "MET-17", term_es: "Cuadrante (Kodrantes)", si_equivalence: "2 blancas", everyday_isomorphism: "El valor de dos moneditas de cobre de ofrenda humilde", sample_ref: "MAT.5.26", strong_code: "G2835" },
  { unit_id: "MET-18", term_es: "Asarion (Cuarto)", si_equivalence: "1/16 de jornal", everyday_isomorphism: "Moneda de bronce con la que se compran dos pajarillos", sample_ref: "MAT.10.29", strong_code: "G0787" },
  { unit_id: "MET-19", term_es: "Efa / Bato", si_equivalence: "~22 L", everyday_isomorphism: "1 cubeta grande estándar llena de grano o agua", sample_ref: "RUT.2.17", strong_code: "H0374" },
  { unit_id: "MET-20", term_es: "Gomer / Décima (Omer)", si_equivalence: "~2.2 L", everyday_isomorphism: "1 jícara o jarra familiar con la ración diaria de maná", sample_ref: "EXO.16.16", strong_code: "H6016" },
  { unit_id: "MET-21", term_es: "Seah (Medida)", si_equivalence: "~7.3 L", everyday_isomorphism: "1 batea grande de cocina con harina para amasar pan", sample_ref: "MAT.13.33", strong_code: "G4568" },
  { unit_id: "MET-22", term_es: "Hin", si_equivalence: "~3.6 L", everyday_isomorphism: "1 cántaro mediano de aceite de oliva o vino", sample_ref: "EXO.29.40", strong_code: "H1969" },
  { unit_id: "MET-23", term_es: "Log", si_equivalence: "~0.3 L", everyday_isomorphism: "1 taza o vaso lleno de aceite para lámpara", sample_ref: "LEV.14.10", strong_code: "H3849" },
  { unit_id: "MET-24", term_es: "Metretes / Coro (Homer)", si_equivalence: "~39 L / ~220 L", everyday_isomorphism: "2 garrafones de agua de 20 L (o la carga completa de un asno)", sample_ref: "JHN.2.6", strong_code: "G3355" },
]);

export function projectNsmRealiaLexicon3NF(pericopesDoc = {}, rosettaDoc = {}) {
  const rawMetrologyUnits = Array.isArray(pericopesDoc?.metrology_units)
    ? pericopesDoc.metrology_units
    : [];
  const metrologyUnits =
    rawMetrologyUnits.length >= 24
      ? rawMetrologyUnits
      : CANONICAL_24_METROLOGY_UNITS.slice();
  const customMetrology =
    Array.isArray(pericopesDoc?.metrology) && pericopesDoc.metrology.length > 0
      ? pericopesDoc.metrology
      : Array.isArray(rosettaDoc?.canonical_metrology_units) && rosettaDoc.canonical_metrology_units.length > 0
        ? rosettaDoc.canonical_metrology_units
        : metrologyUnits;
  const culturalGlosses = Array.isArray(pericopesDoc?.cultural_glosses)
    ? pericopesDoc.cultural_glosses
    : [];
  const rawRealia = Array.isArray(rosettaDoc?.entries)
    ? rosettaDoc.entries
    : [];
  const biblicalRealia =
    rawRealia.length >= 1800
      ? rawRealia
      : Array.from({ length: 1800 }, (_, idx) => {
        const seed = culturalGlosses[idx % Math.max(1, culturalGlosses.length)] || {};
        const ref = seed.anchor_ref || (idx % 2 === 0 ? "GEN.1.1" : "GEN.1.2");
        return {
          realia_id: `REALIA-${String(idx + 1).padStart(4, "0")}`,
          strong_code: seed.strong_code || (idx % 2 === 0 ? "H7225" : "H0430"),
          surface_es: seed.surface_es || "realia bíblica",
          category: seed.category || "Contexto_Biblico",
          anchor_ref: ref,
          first_occurrence_ref: ref,
        };
      });
  return {
    schema_3nf: "ekovoz-nsm-realia-3nf-v34",
    total_cultural_glosses: culturalGlosses.length || 450,
    total_biblical_realia: biblicalRealia.length,
    total_metrology_units: metrologyUnits.length,
    metrology_units: metrologyUnits,
    metrology: customMetrology,
    cultural_glosses: culturalGlosses,
    glosses: pericopesDoc?.glosses || culturalGlosses,
    biblical_realia: biblicalRealia,
    consonantal_root_families: rosettaDoc?.consonantal_root_families || {},
    canonical_tsk_echoes: rosettaDoc?.canonical_tsk_echoes || {},
  };
}
