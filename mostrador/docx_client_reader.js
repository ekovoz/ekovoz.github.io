// ============================================================================
// web/mostrador/docx_client_reader.js — Lector puro L0 .docx en cliente (<= 8 MiB)
// Basado en protocolo PKZIP EOCD (0x06054b50) + CDH (0x02014b50) + DecompressionStream("deflate-raw").
// Cero dependencias externas, cero red, protección anti-ZIP-bomb. Cargado lazy bajo demanda.
// ============================================================================

export const MAX_DOCX_BYTES = 8 * 1024 * 1024;
const MAX_DOCX_XML_OUT_BYTES = 16 * 1024 * 1024;

function decodeXmlEntities(raw = "") {
  return String(raw)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Math.min(0x10ffff, Number(d) || 32)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Math.min(0x10ffff, parseInt(h, 16) || 32)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function findZipEndOfCentralDirectory(u8) {
  const minOffset = Math.max(0, u8.byteLength - 65557);
  for (let i = u8.byteLength - 22; i >= minOffset; i -= 1) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) {
      return i;
    }
  }
  return -1;
}

async function inflateRawBounded(compressedBytes, maxOutBytes = MAX_DOCX_XML_OUT_BYTES) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("DecompressionStream('deflate-raw') unavailable in this environment");
  }
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  const writePromise = writer.write(compressedBytes).then(() => writer.close());
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxOutBytes) {
        throw new Error(`DOCX uncompressed word/document.xml exceeds ${maxOutBytes} B anti-bomb limit`);
      }
      chunks.push(value);
    }
    await writePromise;
  } finally {
    try { writer.releaseLock(); } catch { }
    try { reader.releaseLock(); } catch { }
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(out);
}

function extractParagraphTextFromWordDocumentXml(xml = "") {
  const src = String(xml || "");
  const paragraphs = src.split(/<\/w:p>/i);
  const lines = [];
  for (const p of paragraphs) {
    const runs = [];
    for (const m of p.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)) {
      runs.push(decodeXmlEntities(m[1]));
    }
    const line = runs.join("").replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

/**
 * Extrae texto plano (párrafos `word/document.xml`) de un `.docx` ≤ 8 MiB directamente en el navegador.
 */
export async function extractDocxDocumentXmlText(inputBuffer) {
  const u8 = inputBuffer instanceof Uint8Array
    ? inputBuffer
    : inputBuffer instanceof ArrayBuffer
      ? new Uint8Array(inputBuffer)
      : null;
  if (!u8 || u8.byteLength < 22) throw new Error("Archivo .docx vacío o inválido.");
  if (u8.byteLength > MAX_DOCX_BYTES) {
    throw new Error(`Archivo .docx (${u8.byteLength} B) supera límite cliente de 8 MiB; usa ekovoz audit-external.`);
  }
  const eocdOffset = findZipEndOfCentralDirectory(u8);
  if (eocdOffset < 0) throw new Error("Cabecera ZIP EOCD (0x06054b50) no encontrada en .docx.");
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  if (cdOffset + cdSize > eocdOffset) throw new Error("Directorio central ZIP corrupto.");

  let pos = cdOffset;
  const decoder = new TextDecoder("utf-8");
  for (let idx = 0; idx < totalEntries && pos + 46 <= cdOffset + cdSize; idx += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOff = view.getUint32(pos + 42, true);
    const name = decoder.decode(u8.subarray(pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;
    if (name !== "word/document.xml") continue;
    if (uncompSize > MAX_DOCX_XML_OUT_BYTES) {
      throw new Error("word/document.xml excede el límite seguro (16 MiB).");
    }
    if (localOff + 30 > u8.byteLength || view.getUint32(localOff, true) !== 0x04034b50) {
      throw new Error("Cabecera local ZIP inválida en word/document.xml.");
    }
    const lfNameLen = view.getUint16(localOff + 26, true);
    const lfExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lfNameLen + lfExtraLen;
    if (dataStart + compSize > u8.byteLength) throw new Error("Datos ZIP truncados.");
    const slice = u8.subarray(dataStart, dataStart + compSize);
    const xml = method === 0 ? decoder.decode(slice) : method === 8 ? await inflateRawBounded(slice) : "";
    if (!xml && method !== 0 && method !== 8) {
      throw new Error(`Método de compresión ZIP (${method}) no soportado; re-guarda como .docx estándar.`);
    }
    return extractParagraphTextFromWordDocumentXml(xml);
  }
  throw new Error("word/document.xml no encontrado dentro del .docx.");
}
