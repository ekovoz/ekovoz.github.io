// ============================================================================
// web/mostrador/print_catalog_actions.js — Costura LCOM4 C5 (`∂(C) = 0`)
// Extraída de print_work_and_photocopy.js (`SLICE-EKO-HIG12-01` · D5 + D12):
// - Despacho seguro de clics sobre el catálogo de 14+2 ediciones (`stealthActive` corregido).
// - Descarga Blob / Data-URI y almacenamiento de resultados del worker de tandas.
// ============================================================================

import { resolveLocalPrintArtifactFallback } from "./bimodal_tanda_print.js";
import { dispatchTandaWorkerJob, syncPrintDrawerControlsFromEditionProfile } from "./dosis.js";
import { buildEditionRenderSpecBytes16, resolveNumericEditionId } from "./dosis_editions_catalog.js";
import { isRtlLocale } from "./i18n.js";
import { mountOfflineFontNoticeWithLocalImporter } from "./offline_font_bundle.js";
import { resolveEditionSubstrateForProfile } from "./print_config_projector.js";
import { updatePrintConfig } from "./state_store.js";
import { resolveSafeDownloadFilename } from "./stealth_filename.js";
import { encodePaperFormatCode } from "./tanda_print_worker.js";

/** Revoca de forma segura un ObjectURL `blob:` sin lanzar en entornos headless/mock. */
export function revokeObjectUrlSafe(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    try {
      globalThis.URL?.revokeObjectURL?.(url);
    } catch {
      // Non-fatal in mock/non-browser runtimes
    }
  }
}

function encodePdfBytesToDataUriSafe(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof globalThis.btoa === "function" ? globalThis.btoa(bin) : Buffer.from(bytes).toString("base64");
  return `data:application/pdf;base64,${b64}`;
}

function toDownloadablePdfHref(pdfInput) {
  const parts = Array.isArray(pdfInput)
    ? pdfInput.filter((p) => p instanceof Uint8Array && p.byteLength > 0)
    : pdfInput instanceof Uint8Array && pdfInput.byteLength > 0
      ? [pdfInput]
      : [];
  if (parts.length === 0) return "";
  if (
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.Blob === "function" &&
    typeof globalThis.URL?.createObjectURL === "function"
  ) {
    return globalThis.URL.createObjectURL(new globalThis.Blob(parts, { type: "application/pdf" }));
  }
  const total = parts.reduce((acc, p) => acc + p.byteLength, 0);
  const combined = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    combined.set(p, off);
    off += p.byteLength;
  }
  return encodePdfBytesToDataUriSafe(combined);
}

function applyLocalPrintFallbackToCard(cardEl, localFb) {
  if (!cardEl || !localFb?.isFallback || !localFb?.href) return false;
  cardEl.href = localFb.href;
  cardEl.setAttribute?.("href", localFb.href);
  cardEl.setAttribute?.("download", localFb.filename);
  cardEl.setAttribute?.("data-local-print-fallback", localFb.mode);
  return true;
}

/**
 * Maneja de forma determinista el clic sobre una tarjeta de edición PDF/Braille en `#bibleEditionsCatalogGrid`.
 */
export async function handleCatalogEditionCardClick(cardEl, e, {
  state,
  ctx,
  targetDoc,
  getEl,
  isStealthActive,
  stealthBlkNum,
  renderPrintDrawerPanelsSyncInDrawer,
  hydratePrintDrawerPanels,
  ensureDirectEditionsAndGrambankControls,
} = {}) {
  const profId = cardEl?.getAttribute?.("data-profile-id");
  if (!profId) return;
  const curLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
  const isFieldCard =
    profId.includes("refugio_4_hojas") || profId.includes("checklist_80_bloques");
  if (isFieldCard && curLang === "es" && state.federationReachable !== false) {
    return;
  }
  let cols = Number(cardEl?.getAttribute?.("data-columns")) || Number(state.columns) || 2;
  let fontPt = Number(cardEl?.getAttribute?.("data-font-pt")) || Number(state.fontSizePt) || 9.5;
  let paper = cardEl?.getAttribute?.("data-paper-size") || state.paperFormat || "a4";
  let orientation = String(paper).toLowerCase().includes("landscape") ? "landscape" : "portrait";
  let booklet4n = state.foliationMode === "saddle_stitch";
  if (!isFieldCard) {
    const synced = syncPrintDrawerControlsFromEditionProfile(profId, targetDoc);
    state.activePrintProfileId = synced.profileId;
    state.edition = synced.profileId;
    state.fontSizePt = synced.fontPt;
    state.columns = synced.columns;
    state.paperFormat = synced.paper;
    state.orientation = synced.orientation;
    state.foliationMode = synced.foliationMode;
    if (ctx.store) {
      updatePrintConfig(ctx.store, {
        edition: synced.profileId,
        fontSizePt: synced.fontPt,
        columns: synced.columns,
        paperFormat: synced.paper,
        orientation: synced.orientation,
        foliationMode: synced.foliationMode,
      });
    }
    ensureDirectEditionsAndGrambankControls({
      ...ctx,
      onConfigChanged: () => renderPrintDrawerPanelsSyncInDrawer(ctx),
    });
    cols = synced.columns;
    fontPt = synced.fontPt;
    paper = synced.paper;
    orientation = synced.orientation || orientation;
    booklet4n = synced.foliationMode === "saddle_stitch";
  }
  const curBlockCode = `B${String(Math.max(1, Math.min(80, Number(state.activeBlockNumber) || 1))).padStart(2, "0")}`;
  const cacheKey = `${profId}::${curLang}::${state.book || "GEN"}::${state.chapter || 1}::${curBlockCode}`;
  if (!state.editionObjectUrls || typeof state.editionObjectUrls !== "object") {
    state.editionObjectUrls = {};
  }
  if (!state.editionObjectUrls[cacheKey] && !cardEl._directSynthesizedClick) {
    e?.preventDefault?.();
    try {
      const substrate = await resolveEditionSubstrateForProfile(profId, {
        state,
        dataLayer: ctx.dataLayer,
        curLang,
        activeBook: state.book || "GEN",
        activeChapter: state.chapter || 1,
        columns: cols,
        fontPt,
        paper,
        orientation,
        booklet4n,
      });
      if (substrate.brfAscii || substrate.brfHref) {
        if (!state.brfObjectUrls || typeof state.brfObjectUrls !== "object") {
          state.brfObjectUrls = {};
        }
        revokeObjectUrlSafe(state.brfObjectUrls[cacheKey]);
        let resolvedBrfHref = substrate.brfHref || "";
        if (
          substrate.brfAscii &&
          typeof globalThis.Blob === "function" &&
          typeof globalThis.URL?.createObjectURL === "function"
        ) {
          try {
            resolvedBrfHref = globalThis.URL.createObjectURL(
              new globalThis.Blob([substrate.brfAscii], { type: "text/plain;charset=utf-8" }),
            );
          } catch {
            // Fallback to data URI
          }
        }
        state.brfObjectUrls[cacheKey] = resolvedBrfHref;
        const brfFilename = resolveSafeDownloadFilename(state, { kind: "braille_brf", blockNumber: stealthBlkNum });
        cardEl.setAttribute?.("data-brf-href", resolvedBrfHref);
        cardEl.setAttribute?.("data-brf-download", brfFilename);
        if (resolvedBrfHref && typeof targetDoc?.createElement === "function") {
          try {
            const brfAnchor = targetDoc.createElement("a");
            if (brfAnchor) {
              brfAnchor.href = resolvedBrfHref;
              brfAnchor.download = brfFilename;
              brfAnchor.click?.();
            }
          } catch {
            // Non-fatal in mock docs
          }
        }
      }
      const clickedEditionId = resolveNumericEditionId(profId || substrate.editionMode);
      const clickedRenderSpec = clickedEditionId > 0
        ? buildEditionRenderSpecBytes16(clickedEditionId, {
          columns: substrate.columns,
          fontTenthsPt: Math.round((Number(substrate.fontPt) || 9.5) * 10),
          paperCode: encodePaperFormatCode(substrate.paper, substrate.orientation),
        })
        : null;
      const res = await dispatchTandaWorkerJob({
        lang: curLang,
        book: substrate.book || state.book || "GEN",
        chapter: substrate.chapter || state.chapter || 1,
        verses: substrate.verses,
        bridgeVerses: substrate.bridgeVerses,
        bridgeFontFile: substrate.bridgeFontFile || "",
        tertiaryFontFile: substrate.tertiaryFontFile || "",
        editionId: clickedEditionId,
        editionRenderSpec: clickedRenderSpec,
        editionMode: substrate.editionMode,
        columns: substrate.columns,
        fontPt: substrate.fontPt,
        paper: substrate.paper,
        orientation: substrate.orientation,
        includeBoldFont: true,
        dir: isRtlLocale(curLang) ? "rtl" : "ltr",
        booklet4n: substrate.booklet4n,
        maxPagesPerTanda: 0,
      });
      const hasEditionParts = Array.isArray(res?.blobParts) && res.blobParts.length > 0;
      const hasEditionPdf = hasEditionParts || (res?.pdfBytes instanceof Uint8Array && res.pdfBytes.byteLength > 0);
      const stealthActive = Boolean(isStealthActive ?? state?.stealthMode);
      const localFallbackPayload = {
        href: cardEl.getAttribute?.("href") || cardEl.href || "",
        distAvailable: Boolean(state.federationReachable),
        lang: curLang,
        book: substrate.book || state.book || "GEN",
        chapter: substrate.chapter || state.chapter || 1,
        verse: state.verse || 1,
        verses: substrate.verses,
        columns: substrate.columns,
        fontPt: substrate.fontPt,
        paper: substrate.paper,
        stealthMode: stealthActive,
        blockNumber: stealthBlkNum,
        stealthFilename: stealthActive ? resolveSafeDownloadFilename(state, { kind: "paged_media", blockNumber: stealthBlkNum }) : "",
      };
      if (res?.type === "tanda-offline-font-notice") {
        const noticeEl = getEl("tanda-offline-font-notice", targetDoc);
        mountOfflineFontNoticeWithLocalImporter(noticeEl, res, {
          targetDoc,
          onImported: () => hydratePrintDrawerPanels?.(targetDoc),
        });
        applyLocalPrintFallbackToCard(cardEl, resolveLocalPrintArtifactFallback(localFallbackPayload));
      } else if (hasEditionPdf) {
        revokeObjectUrlSafe(state.editionObjectUrls[cacheKey]);
        const nextHref = toDownloadablePdfHref(hasEditionParts ? res.blobParts : res.pdfBytes);
        state.editionObjectUrls[cacheKey] = nextHref;
        state.editionObjectUrls[profId] = nextHref;
        cardEl.href = nextHref;
        cardEl.setAttribute?.("href", nextHref);
        cardEl.setAttribute?.(
          "download",
          resolveSafeDownloadFilename(state, { kind: "edition_pdf", blockNumber: stealthBlkNum, defaultName: `${profId}-${curLang}.pdf` }),
        );
        if (typeof cardEl.click === "function") {
          cardEl._directSynthesizedClick = true;
          try {
            cardEl.click();
          } finally {
            cardEl._directSynthesizedClick = false;
          }
        }
      } else {
        applyLocalPrintFallbackToCard(cardEl, resolveLocalPrintArtifactFallback(localFallbackPayload));
      }
    } catch {
      // Non-fatal
    }
  } else if (state.editionObjectUrls[cacheKey]) {
    const cachedHref = state.editionObjectUrls[cacheKey];
    cardEl.href = cachedHref;
    cardEl.setAttribute?.("href", cachedHref);
  }
  if (!isFieldCard && typeof renderPrintDrawerPanelsSyncInDrawer === "function") {
    renderPrintDrawerPanelsSyncInDrawer(ctx);
  }
}

/** Almacena de forma determinista el PDF o partes Blob devueltas por el worker de tandas. */
export function storeWorkerTandaPdfResult(state, keyPrefix, res, targetMacroCount = 1) {
  const urlKey = `${keyPrefix}ObjectUrl`;
  const partsKey = `${keyPrefix}WorkerBlobParts`;
  const bytesKey = `${keyPrefix}WorkerPdfBytes`;
  const parts = Array.isArray(res?.blobParts) && res.blobParts.length > 0 ? res.blobParts : null;
  if (!parts && (!(res?.pdfBytes instanceof Uint8Array) || res.pdfBytes.byteLength <= 0)) return false;
  revokeObjectUrlSafe(state[urlKey]);
  state[partsKey] = parts || [res.pdfBytes];
  state[bytesKey] = parts ? (parts.length === 1 ? parts[0] : null) : res.pdfBytes;
  state[urlKey] = toDownloadablePdfHref(state[partsKey]);
  if (keyPrefix === "dose3") {
    state.dose3LastCompletedTandas = targetMacroCount;
    state._dose3Streamed16Of16 = Boolean(state.generateFull66BookBible && targetMacroCount === 16);
  }
  return true;
}
