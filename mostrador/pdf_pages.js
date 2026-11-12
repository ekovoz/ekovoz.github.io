// web/mostrador/pdf_pages.js — Extracción de páginas reales de un PDF (Ronda 20, S10, Decisión D4).
//
// Port a JS de `rebuild_page_tree` + `inherited_page_attribute` + `discard_unreachable_objects`
// (`aashish47/pdf-bookmark-extractor` `src/pdf.rs`, SHA-256 `786989407df701fa…`), para la Dosis 1:
// recortar en el teléfono las hojas alrededor de un versículo desde el PDF de bloque que produjo
// Typst, con la tipografía y las fuentes reales (cualquier escritura).
//
// Alcance (verificado sobre los PDF de bloque de Typst): PDF con tabla xref clásica, sin flujos de
// objetos (/ObjStm) ni flujos xref. Cualquier otro caso se rechaza con un error explícito.
// Sin dependencias: Uint8Array → cadena Latin-1 (1 carácter = 1 byte) → objetos.

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set(["(", ")", "<", ">", "[", "]", "{", "}", "/", "%"]);
const INHERITABLE = ["Resources", "MediaBox", "CropBox", "Rotate"];

export class PdfRef {
  constructor(num, gen) {
    this.num = num;
    this.gen = gen;
  }
}

class PdfName {
  constructor(name) {
    this.name = name;
  }
}

/** Cadena PDF ya escapada tal como aparece en el archivo (se reescribe sin modificar). */
class PdfRawString {
  constructor(raw) {
    this.raw = raw;
  }
}

function bytesToLatin1(bytes) {
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}

function latin1ToBytes(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Analizador de valores PDF (ISO 32000-1 §7.3) sobre una cadena Latin-1. */
class Lexer {
  constructor(text, pos = 0) {
    this.text = text;
    this.pos = pos;
  }

  skipWs() {
    const t = this.text;
    while (this.pos < t.length) {
      const c = t.charCodeAt(this.pos);
      if (WS.has(c)) {
        this.pos += 1;
      } else if (t[this.pos] === "%") {
        while (this.pos < t.length && t[this.pos] !== "\n" && t[this.pos] !== "\r") this.pos += 1;
      } else {
        break;
      }
    }
  }

  readToken() {
    this.skipWs();
    const t = this.text;
    const start = this.pos;
    while (this.pos < t.length && !WS.has(t.charCodeAt(this.pos)) && !DELIM.has(t[this.pos])) this.pos += 1;
    return t.slice(start, this.pos);
  }

  peekKeyword(word) {
    this.skipWs();
    return this.text.startsWith(word, this.pos);
  }

  readLiteralString() {
    const t = this.text;
    const start = this.pos;
    let depth = 0;
    for (; this.pos < t.length; this.pos++) {
      const ch = t[this.pos];
      if (ch === "\\") {
        this.pos += 1;
      } else if (ch === "(") {
        depth += 1;
      } else if (ch === ")") {
        depth -= 1;
        if (depth === 0) {
          this.pos += 1;
          return new PdfRawString(t.slice(start, this.pos));
        }
      }
    }
    throw new Error("Cadena literal PDF sin cierre");
  }

  readValue() {
    this.skipWs();
    const t = this.text;
    const ch = t[this.pos];
    if (ch === "<" && t[this.pos + 1] === "<") {
      this.pos += 2;
      const dict = new Map();
      for (;;) {
        this.skipWs();
        if (t[this.pos] === ">" && t[this.pos + 1] === ">") {
          this.pos += 2;
          return dict;
        }
        if (t[this.pos] !== "/") throw new Error(`Clave de diccionario inválida en ${this.pos}`);
        const key = this.readValue().name;
        dict.set(key, this.readValue());
      }
    }
    if (ch === "<") {
      const end = t.indexOf(">", this.pos);
      const raw = t.slice(this.pos, end + 1);
      this.pos = end + 1;
      return new PdfRawString(raw);
    }
    if (ch === "(") return this.readLiteralString();
    if (ch === "[") {
      this.pos += 1;
      const arr = [];
      for (;;) {
        this.skipWs();
        if (t[this.pos] === "]") {
          this.pos += 1;
          return arr;
        }
        arr.push(this.readValue());
      }
    }
    if (ch === "/") {
      this.pos += 1;
      const start = this.pos;
      while (this.pos < t.length && !WS.has(t.charCodeAt(this.pos)) && !DELIM.has(t[this.pos])) this.pos += 1;
      return new PdfName(t.slice(start, this.pos));
    }
    const token = this.readToken();
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "null") return null;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(token)) {
      if (/^\d+$/.test(token)) {
        const save = this.pos;
        const gen = this.readToken();
        if (/^\d+$/.test(gen)) {
          const r = this.readToken();
          if (r === "R") return new PdfRef(Number(token), Number(gen));
        }
        this.pos = save;
      }
      return Number(token);
    }
    throw new Error(`Token PDF inesperado «${token}» en ${this.pos}`);
  }
}

function serialize(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  if (value instanceof PdfRef) return `${value.num} ${value.gen} R`;
  if (value instanceof PdfName) return `/${value.name}`;
  if (value instanceof PdfRawString) return value.raw;
  if (Array.isArray(value)) return `[${value.map(serialize).join(" ")}]`;
  if (value instanceof Map) {
    let out = "<<";
    for (const [k, v] of value) out += `/${k} ${serialize(v)}`;
    return `${out}>>`;
  }
  throw new Error(`Valor PDF no serializable: ${value}`);
}

function collectRefs(value, out) {
  if (value instanceof PdfRef) out.push(value.num);
  else if (Array.isArray(value)) for (const v of value) collectRefs(v, out);
  else if (value instanceof Map) for (const v of value.values()) collectRefs(v, out);
}

/**
 * Analiza un PDF con xref clásico. Devuelve `{ text, objects, trailer }`; cada objeto trae su
 * valor (`value`), y si es un flujo, el rango de bytes de su contenido.
 */
export function parsePdf(bytes) {
  const text = bytesToLatin1(bytes);
  if (!text.startsWith("%PDF-")) throw new Error("No es un PDF");
  if (text.includes("/ObjStm")) throw new Error("PDF con flujos de objetos (/ObjStm): no admitido");
  const sx = text.lastIndexOf("startxref");
  if (sx < 0) throw new Error("PDF sin startxref");
  const xrefOffset = Number(/startxref\s+(\d+)/.exec(text.slice(sx))[1]);
  if (!text.startsWith("xref", xrefOffset)) throw new Error("PDF con flujo xref: no admitido");

  const offsets = new Map();
  let trailer = null;
  let cursor = xrefOffset;
  const visitedSections = new Set();
  while (cursor !== null && !visitedSections.has(cursor)) {
    visitedSections.add(cursor);
    const lex = new Lexer(text, cursor + 4);
    for (;;) {
      lex.skipWs();
      if (lex.peekKeyword("trailer")) break;
      const first = Number(lex.readToken());
      const count = Number(lex.readToken());
      for (let i = 0; i < count; i++) {
        const off = Number(lex.readToken());
        const gen = Number(lex.readToken());
        const kind = lex.readToken();
        const num = first + i;
        if (kind === "n" && !offsets.has(num)) offsets.set(num, { offset: off, gen });
      }
    }
    lex.readToken();
    const sectionTrailer = lex.readValue();
    if (!trailer) trailer = sectionTrailer;
    const prev = sectionTrailer.get("Prev");
    cursor = typeof prev === "number" ? prev : null;
  }

  const objects = new Map();
  for (const [num, { offset, gen }] of offsets) {
    const lex = new Lexer(text, offset);
    const headNum = Number(lex.readToken());
    const headGen = Number(lex.readToken());
    const kw = lex.readToken();
    if (headNum !== num || headGen !== gen || kw !== "obj") {
      throw new Error(`La xref apunta a ${offset} pero allí no está «${num} ${gen} obj»`);
    }
    const value = lex.readValue();
    const entry = { num, gen, offset, value, stream: null };
    if (lex.peekKeyword("stream")) {
      lex.pos += "stream".length;
      if (text[lex.pos] === "\r") lex.pos += 1;
      if (text[lex.pos] === "\n") lex.pos += 1;
      entry.stream = { start: lex.pos, lengthValue: value.get("Length") };
    }
    objects.set(num, entry);
  }
  for (const entry of objects.values()) {
    if (!entry.stream) continue;
    let length = entry.stream.lengthValue;
    if (length instanceof PdfRef) length = objects.get(length.num)?.value;
    if (typeof length !== "number") throw new Error(`Flujo ${entry.num} sin /Length numérico`);
    entry.stream.end = entry.stream.start + length;
    if (!/^\s*endstream/.test(text.slice(entry.stream.end, entry.stream.end + 16))) {
      throw new Error(`Flujo ${entry.num}: /Length no termina en endstream`);
    }
  }
  return { text, objects, trailer };
}

function resolve(pdf, value) {
  return value instanceof PdfRef ? pdf.objects.get(value.num)?.value : value;
}

/** Referencias de las páginas hoja en orden de lectura. */
export function pageRefs(pdf) {
  const catalog = resolve(pdf, pdf.trailer.get("Root"));
  const out = [];
  const seen = new Set();
  const walk = (ref) => {
    if (!(ref instanceof PdfRef) || seen.has(ref.num)) return;
    seen.add(ref.num);
    const node = pdf.objects.get(ref.num)?.value;
    if (!(node instanceof Map)) return;
    const type = node.get("Type");
    if (type instanceof PdfName && type.name === "Pages") {
      for (const kid of node.get("Kids") || []) walk(kid);
    } else {
      out.push(ref);
    }
  };
  walk(catalog.get("Pages"));
  return out;
}

function inheritedAttribute(pdf, pageNum, key) {
  const seen = new Set();
  let current = pageNum;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    const dict = pdf.objects.get(current)?.value;
    if (!(dict instanceof Map)) return undefined;
    if (dict.has(key)) return dict.get(key);
    const parent = dict.get("Parent");
    current = parent instanceof PdfRef ? parent.num : undefined;
  }
  return undefined;
}

/**
 * Extrae las páginas `pageNumbers` (1-based, en el orden dado) y devuelve un PDF autónomo nuevo:
 * catálogo mínimo (sin /Outlines, /Names, /StructTreeRoot, /Metadata), árbol de páginas plano,
 * atributos heredados copiados a cada página, sin /Annots ni /Info, y solo objetos alcanzables.
 */
export function extractPdfPages(bytes, pageNumbers) {
  const pdf = parsePdf(bytes);
  const pages = pageRefs(pdf);
  if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) throw new Error("Sin páginas solicitadas");
  const selected = pageNumbers.map((n) => {
    if (!Number.isInteger(n) || n < 1 || n > pages.length) throw new Error(`Página ${n} fuera de rango 1..${pages.length}`);
    return pages[n - 1];
  });

  const rootRef = pdf.trailer.get("Root");
  const catalog = resolve(pdf, rootRef);
  const pagesRef = catalog.get("Pages");
  const replaced = new Map();

  const newCatalog = new Map([
    ["Type", new PdfName("Catalog")],
    ["Pages", pagesRef],
  ]);
  if (catalog.has("Lang")) newCatalog.set("Lang", catalog.get("Lang"));
  replaced.set(rootRef.num, newCatalog);

  replaced.set(
    pagesRef.num,
    new Map([
      ["Type", new PdfName("Pages")],
      ["Kids", selected],
      ["Count", selected.length],
    ])
  );

  for (const ref of selected) {
    const original = pdf.objects.get(ref.num).value;
    const page = new Map(original);
    for (const key of INHERITABLE) {
      if (!page.has(key)) {
        const value = inheritedAttribute(pdf, ref.num, key);
        if (value !== undefined) page.set(key, value);
      }
    }
    page.set("Parent", pagesRef);
    page.delete("Annots");
    page.delete("StructParents");
    replaced.set(ref.num, page);
  }

  const reachable = new Set();
  const stack = [rootRef.num];
  while (stack.length > 0) {
    const num = stack.pop();
    if (reachable.has(num) || !pdf.objects.has(num)) continue;
    reachable.add(num);
    const refs = [];
    collectRefs(replaced.has(num) ? replaced.get(num) : pdf.objects.get(num).value, refs);
    for (const r of refs) if (!reachable.has(r)) stack.push(r);
  }

  const maxNum = Math.max(...reachable);
  const parts = ["%PDF-1.7\n%\xE2\xE3\xCF\xD3\n"];
  let size = parts[0].length;
  const offsets = new Map();
  for (const num of [...reachable].sort((a, b) => a - b)) {
    const entry = pdf.objects.get(num);
    offsets.set(num, size);
    let chunk;
    if (replaced.has(num)) {
      chunk = `${num} ${entry.gen} obj\n${serialize(replaced.get(num))}\nendobj\n`;
    } else if (entry.stream) {
      const dict = new Map(entry.value);
      const length = entry.stream.end - entry.stream.start;
      dict.set("Length", length);
      chunk =
        `${num} ${entry.gen} obj\n${serialize(dict)}\nstream\n` +
        pdf.text.slice(entry.stream.start, entry.stream.end) +
        "\nendstream\nendobj\n";
    } else {
      chunk = `${num} ${entry.gen} obj\n${serialize(entry.value)}\nendobj\n`;
    }
    parts.push(chunk);
    size += chunk.length;
  }
  let xref = `xref\n0 ${maxNum + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxNum; n++) {
    xref += offsets.has(n)
      ? `${String(offsets.get(n)).padStart(10, "0")} ${String(pdf.objects.get(n).gen).padStart(5, "0")} n \n`
      : "0000000000 65535 f \n";
  }
  parts.push(xref);
  parts.push(`trailer\n<</Size ${maxNum + 1}/Root ${rootRef.num} ${rootRef.gen} R>>\nstartxref\n${size}\n%%EOF\n`);
  return latin1ToBytes(parts.join(""));
}

/** Número de páginas de un PDF con xref clásico. */
export function countPdfPages(bytes) {
  return pageRefs(parsePdf(bytes)).length;
}

