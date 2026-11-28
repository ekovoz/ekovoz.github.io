// ============================================================================
// web/mostrador/print_page_contour_preview.js — Previsualización de Contorno
// Vectorial (WASM `wasm_extract_glyph_contours_f32`) + Flags `reserved[0]`
// (`SLICE-EKO-RC18` / `D10-HIG14`: `/Outlines` + `Knuth-Plass` estricto)
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";

export const EXT_FLAGS = Object.freeze({
  OUTLINE_BOOKMARKS: 1 << 0,
  KNUTH_PLASS_STRICT: 1 << 1,
});

export function packEditionRenderSpecExtFlags({
  outlineBookmarks = false,
  knuthPlassStrict = false,
} = {}) {
  let mask = 0;
  if (outlineBookmarks) mask |= EXT_FLAGS.OUTLINE_BOOKMARKS;
  if (knuthPlassStrict) mask |= EXT_FLAGS.KNUTH_PLASS_STRICT;
  return mask & 0xff;
}

export function decodeFlatContourCommandsF32(f32Stream) {
  if (!f32Stream || f32Stream.length < 7) {
    return { metrics: null, ops: [] };
  }
  const metrics = {
    unitsPerEm: Number(f32Stream[0]) || 1000,
    advanceWidth: Number(f32Stream[1]) || 500,
    xMin: Number(f32Stream[2]) || 0,
    yMin: Number(f32Stream[3]) || 0,
    xMax: Number(f32Stream[4]) || 500,
    yMax: Number(f32Stream[5]) || 800,
    contourCount: Number(f32Stream[6]) || 0,
  };
  const ops = [];
  let i = 7;
  while (i < f32Stream.length) {
    const code = Math.round(f32Stream[i]);
    if (code === 1 && i + 2 < f32Stream.length) {
      ops.push({ op: "M", x: f32Stream[i + 1], y: f32Stream[i + 2] });
      i += 3;
    } else if (code === 2 && i + 2 < f32Stream.length) {
      ops.push({ op: "L", x: f32Stream[i + 1], y: f32Stream[i + 2] });
      i += 3;
    } else if (code === 3 && i + 4 < f32Stream.length) {
      ops.push({ op: "Q", cx: f32Stream[i + 1], cy: f32Stream[i + 2], x: f32Stream[i + 3], y: f32Stream[i + 4] });
      i += 5;
    } else if (code === 4 && i + 6 < f32Stream.length) {
      ops.push({ op: "C", c1x: f32Stream[i + 1], c1y: f32Stream[i + 2], c2x: f32Stream[i + 3], c2y: f32Stream[i + 4], x: f32Stream[i + 5], y: f32Stream[i + 6] });
      i += 7;
    } else if (code === 5) {
      ops.push({ op: "Z" });
      i += 1;
    } else {
      break;
    }
  }
  return { metrics, ops };
}

export function renderGlyphContourSampleToCanvas(
  canvasEl,
  {
    sampleText = "Aa · Gén 1:1",
    wasmExports = null,
    fontBytes = null,
    fontPt = 10.5,
    columns = 2,
    outlineBookmarks = false,
    knuthPlassStrict = false,
  } = {},
) {
  const ctx = canvasEl && typeof canvasEl.getContext === "function" ? canvasEl.getContext("2d") : null;
  const w = Number(canvasEl?.width) || 240;
  const h = Number(canvasEl?.height) || 140;
  let contourOpsCount = 0;
  let wasmBacked = false;
  let decodedMetrics = null;

  if (
    wasmExports &&
    wasmExports.memory &&
    typeof wasmExports.wasm_alloc === "function" &&
    typeof wasmExports.wasm_free === "function" &&
    typeof wasmExports.wasm_extract_glyph_contours_f32 === "function" &&
    fontBytes instanceof Uint8Array &&
    fontBytes.byteLength >= 64
  ) {
    const firstPrintable = Array.from(String(sampleText || "A")).find((ch) => ch.trim().length > 0) || "A";
    const cp = firstPrintable.codePointAt(0) || 65;
    const outCap = 16384;
    const fPtr = wasmExports.wasm_alloc(fontBytes.byteLength);
    const oPtr = wasmExports.wasm_alloc(outCap);
    try {
      new Uint8Array(wasmExports.memory.buffer, fPtr, fontBytes.byteLength).set(fontBytes);
      const written = wasmExports.wasm_extract_glyph_contours_f32(fPtr, fontBytes.byteLength, cp, oPtr, outCap);
      if (written >= 28 && written % 4 === 0) {
        const f32 = new Float32Array(wasmExports.memory.buffer.slice(oPtr, oPtr + written));
        const decoded = decodeFlatContourCommandsF32(f32);
        decodedMetrics = decoded.metrics;
        contourOpsCount = decoded.ops.length;
        wasmBacked = contourOpsCount > 0;
        if (ctx && wasmBacked && decodedMetrics) {
          ctx.clearRect?.(0, 0, w, h);
          ctx.fillStyle = "#faf8f5";
          ctx.fillRect?.(0, 0, w, h);
          ctx.strokeStyle = "#d6cfc7";
          ctx.strokeRect?.(8, 8, w - 16, h - 16);
          const scale = Math.min(72 / decodedMetrics.unitsPerEm, 0.14);
          const ox = 22;
          const oy = h - 34;
          ctx.beginPath?.();
          for (const cmd of decoded.ops) {
            if (cmd.op === "M") ctx.moveTo?.(ox + cmd.x * scale, oy - cmd.y * scale);
            else if (cmd.op === "L") ctx.lineTo?.(ox + cmd.x * scale, oy - cmd.y * scale);
            else if (cmd.op === "Q") ctx.quadraticCurveTo?.(ox + cmd.cx * scale, oy - cmd.cy * scale, ox + cmd.x * scale, oy - cmd.y * scale);
            else if (cmd.op === "C") ctx.bezierCurveTo?.(ox + cmd.c1x * scale, oy - cmd.c1y * scale, ox + cmd.c2x * scale, oy - cmd.c2y * scale, ox + cmd.x * scale, oy - cmd.y * scale);
            else if (cmd.op === "Z") ctx.closePath?.();
          }
          ctx.fillStyle = "#1c1917";
          ctx.fill?.();
        }
      }
    } finally {
      wasmExports.wasm_free(fPtr, fontBytes.byteLength);
      wasmExports.wasm_free(oPtr, outCap);
    }
  }

  if (ctx && !wasmBacked) {
    ctx.clearRect?.(0, 0, w, h);
    ctx.fillStyle = "#faf8f5";
    ctx.fillRect?.(0, 0, w, h);
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1.2;
    ctx.strokeRect?.(12, 10, w - 24, h - 20);
  }

  if (ctx) {
    const safeCols = Math.max(1, Math.min(3, Number(columns) || 2));
    const gridX0 = wasmBacked ? 96 : 22;
    const gridW = w - gridX0 - 18;
    const colGap = 8;
    const colW = Math.max(18, (gridW - (safeCols - 1) * colGap) / safeCols);
    ctx.fillStyle = knuthPlassStrict ? "#69300c" : "#57534e";
    for (let c = 0; c < safeCols; c += 1) {
      const cx = gridX0 + c * (colW + colGap);
      for (let line = 0; line < 7; line += 1) {
        const y = 26 + line * 13;
        const lw = knuthPlassStrict && line < 6 ? colW : line === 6 ? colW * 0.62 : colW * (0.86 + ((line % 3) * 0.04));
        ctx.fillRect?.(cx, y, Math.max(10, lw), 3);
      }
    }
  }

  const extFlags = packEditionRenderSpecExtFlags({ outlineBookmarks, knuthPlassStrict });
  canvasEl?.setAttribute?.("data-preview-mode", wasmBacked ? "wasm-contours" : "layout-wireframe");
  canvasEl?.setAttribute?.("data-ext-flags", String(extFlags));
  return {
    rendered: Boolean(ctx || canvasEl),
    mode: wasmBacked ? "wasm-contours" : "layout-wireframe",
    contourOpsCount,
    extFlags,
    fontPt: Number(fontPt) || 10.5,
    columns: Math.max(1, Math.min(3, Number(columns) || 2)),
  };
}

export function renderPrintContourPreviewSectionHtml({
  uiLocale = "es",
  outlineBookmarks = false,
  knuthPlassStrict = false,
  fontPt = 10.5,
  columns = 2,
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const extFlags = packEditionRenderSpecExtFlags({ outlineBookmarks, knuthPlassStrict });
  return (
    `<section id="printContourPreviewSection" class="ek-card-muted ek-stack-xs ek-mt-xs" data-technical-plane="true" data-ext-flags="${extFlags}">` +
    `<strong class="ek-title-sm">✒️ ${isEn ? "Typesetting Preview & PDF Precision" : "Vista Previa de Plana y Precisión PDF"}</strong>` +
    `<label class="hig-toggle-row"><input type="checkbox" id="chkPrintOutlineBookmarks" class="hig-switch"${outlineBookmarks ? " checked" : ""} /><span>${isEn ? "Include PDF navigation bookmarks (/Outlines)" : "Incluir marcadores PDF de capítulos (/Outlines)"}</span></label>` +
    `<label class="hig-toggle-row"><input type="checkbox" id="chkPrintKnuthPlassStrict" class="hig-switch"${knuthPlassStrict ? " checked" : ""} /><span>${isEn ? "Strict Knuth-Plass paragraph balancing" : "Partición estricta Knuth-Plass por columna"}</span></label>` +
    `<div class="ek-row-wrap"><button type="button" id="btnRenderPrintContourPreview" class="uls-chip">🔍 ${isEn ? "Preview 1-Page Layout" : "Previsualizar 1 página"}</button>` +
    `<output id="printContourPreviewStatus" class="ek-meta">${Number(fontPt).toFixed(1)} pt · ${Math.max(1, Math.min(3, Number(columns) || 2))} col</output></div>` +
    `<canvas id="printPageContourCanvas" width="240" height="140" aria-label="${escapeHtml(isEn ? "1-page glyph and column layout preview" : "Vista previa vectorial de contorno y columnas")}"></canvas>` +
    `</section>`
  );
}

export function bindPrintContourPreviewEvents({ state, targetDoc, getEl } = {}) {
  const chkOutline = getEl?.("chkPrintOutlineBookmarks", targetDoc);
  if (chkOutline && typeof chkOutline.addEventListener === "function" && !chkOutline._outlineBound) {
    chkOutline._outlineBound = true;
    chkOutline.addEventListener("change", () => {
      state.printOutlineBookmarks = Boolean(chkOutline.checked);
      state.lastHydratedWorkerTandaKey = "";
    });
  }
  const chkKnuth = getEl?.("chkPrintKnuthPlassStrict", targetDoc);
  if (chkKnuth && typeof chkKnuth.addEventListener === "function" && !chkKnuth._knuthBound) {
    chkKnuth._knuthBound = true;
    chkKnuth.addEventListener("change", () => {
      state.printKnuthPlassStrict = Boolean(chkKnuth.checked);
      state.lastHydratedWorkerTandaKey = "";
    });
  }
  const btnContour = getEl?.("btnRenderPrintContourPreview", targetDoc);
  if (btnContour && typeof btnContour.addEventListener === "function" && !btnContour._contourBound) {
    btnContour._contourBound = true;
    btnContour.addEventListener("click", () => {
      const canvasEl = getEl?.("printPageContourCanvas", targetDoc);
      const outEl = getEl?.("printContourPreviewStatus", targetDoc);
      const res = renderGlyphContourSampleToCanvas(canvasEl, {
        sampleText: state.lastNavResult?.chapter?.verses?.[String(state.verse)] || "Aa · Gén 1:1",
        wasmExports: state.typesetWorkerWasmExports || null,
        fontBytes: state.activePrintTtfBytes || null,
        fontPt: Number(state.fontSizePt) || 10.5,
        columns: Number(state.columns) || 2,
        outlineBookmarks: Boolean(state.printOutlineBookmarks),
        knuthPlassStrict: Boolean(state.printKnuthPlassStrict),
      });
      if (outEl) {
        const ext = packEditionRenderSpecExtFlags({
          outlineBookmarks: state.printOutlineBookmarks,
          knuthPlassStrict: state.printKnuthPlassStrict,
        });
        outEl.textContent = `${res.fontPt.toFixed(1)} pt · ${res.columns} col · ${res.mode} (ext=${ext})`;
      }
    });
  }
}
