// Pruebas de extracción de páginas reales (Ronda 20, S10). Usan los PDF de bloque que publica
// `xtask build-web-data` en web/data/blocks/ y un PDF real con /ObjStm del repositorio.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPdfPages, parsePdf, pageRefs, countPdfPages, PdfRef } from "./pdf_pages.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "..");
const repoRoot = path.resolve(webDir, "..");

function blockPdf(lang, edition, number) {
  const file = path.join(webDir, "data", "blocks", lang, edition, `B${String(number).padStart(2, "0")}.pdf`);
  return new Uint8Array(fs.readFileSync(file));
}

const samples = [
  ["es", "2col-letter", 1],
  ["es", "2col-a4", 40],
  ["stp", "2col-letter", 60],
  ["ar", "2col-a4", 1],
  ["hi", "2col-a4", 45],
];

test("extract_returns_requested_page_count", () => {
  for (const [lang, edition, n] of samples) {
    const src = blockPdf(lang, edition, n);
    const total = countPdfPages(src);
    const wanted = [1, Math.min(2, total)].filter((v, i, a) => a.indexOf(v) === i);
    const out = extractPdfPages(src, wanted);
    assert.equal(countPdfPages(out), wanted.length, `${lang} ${edition} B${n}`);
  }
});

test("extract_output_reparses_and_keeps_page_content", () => {
  const src = blockPdf("es", "2col-letter", 1);
  const srcPdf = parsePdf(src);
  const total = pageRefs(srcPdf).length;
  const last = total;
  const out = extractPdfPages(src, [last]);
  const outPdf = parsePdf(out);
  const [outPage] = pageRefs(outPdf);
  const srcPage = pageRefs(srcPdf)[last - 1];
  assert.equal(outPage.num, srcPage.num, "la página conserva su objeto");
  const contentsOf = (pdf, ref) => {
    const c = pdf.objects.get(ref.num).value.get("Contents");
    return Array.isArray(c) ? c.map((r) => r.num) : [c.num];
  };
  for (const num of contentsOf(srcPdf, srcPage)) {
    const a = srcPdf.objects.get(num);
    const b = outPdf.objects.get(num);
    assert.equal(
      outPdf.text.slice(b.stream.start, b.stream.end),
      srcPdf.text.slice(a.stream.start, a.stream.end),
      "el flujo de contenido es idéntico"
    );
  }
  for (const key of ["MediaBox", "Resources"]) {
    assert.ok(outPdf.objects.get(outPage.num).value.has(key), `la página trae ${key} (heredado o propio)`);
  }
});

test("extract_output_smaller_than_input", () => {
  for (const [lang, edition, n] of samples) {
    const src = blockPdf(lang, edition, n);
    if (countPdfPages(src) < 3) continue;
    const out = extractPdfPages(src, [1]);
    assert.ok(out.length < src.length, `${lang} B${n}: ${out.length} >= ${src.length}`);
  }
});

test("xref_offsets_point_to_objects", () => {
  const out = extractPdfPages(blockPdf("stp", "2col-letter", 60), [1, 2]);
  const text = Buffer.from(out).toString("latin1");
  const xrefAt = Number(/startxref\s+(\d+)/.exec(text.slice(text.lastIndexOf("startxref")))[1]);
  const lines = text.slice(xrefAt).split("\n");
  const [, count] = lines[1].split(" ").map(Number);
  for (let n = 1; n < count; n++) {
    const [off, , kind] = lines[2 + n].trim().split(" ");
    if (kind !== "n") continue;
    assert.ok(text.startsWith(`${n} `, Number(off)), `objeto ${n} no está en ${off}`);
  }
});

test("all_references_resolve", () => {
  const out = extractPdfPages(blockPdf("ar", "2col-a4", 1), [1]);
  const pdf = parsePdf(out);
  const visit = (value) => {
    if (value instanceof PdfRef) assert.ok(pdf.objects.has(value.num), `referencia colgante ${value.num}`);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value instanceof Map) for (const v of value.values()) visit(v);
  };
  for (const entry of pdf.objects.values()) visit(entry.value);
  const catalog = pdf.objects.get(pdf.trailer.get("Root").num).value;
  for (const dropped of ["Outlines", "Names", "StructTreeRoot", "Metadata"]) {
    assert.ok(!catalog.has(dropped), `el catálogo no debe traer /${dropped}`);
  }
  assert.ok(!pdf.trailer.has("Info"), "sin /Info (Clase C)");
});

test("rejects_object_streams", () => {
  const file = path.join(
    repoRoot,
    "contexto_felices",
    "ideas_felices",
    "Los Felices del Señor Jesús",
    "2021-08-08 Los Felices del Señor Jesús.pdf"
  );
  const bytes = new Uint8Array(fs.readFileSync(file));
  assert.throws(() => extractPdfPages(bytes, [1]), /ObjStm/);
});

test("rejects_pages_out_of_range", () => {
  const src = blockPdf("es", "2col-letter", 1);
  const total = countPdfPages(src);
  assert.throws(() => extractPdfPages(src, [total + 1]), /fuera de rango/);
  assert.throws(() => extractPdfPages(src, []), /Sin páginas/);
});

