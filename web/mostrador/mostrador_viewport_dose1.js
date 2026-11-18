// ============================================================================
// web/mostrador/mostrador_viewport_dose1.js — Costura Limpia ∂_mut(C) = 0 (SLICE-V2D-11)
// Proyección del lienzo de lectura (#bibleVerseViewport, cintillo de perícopas, termómetro analítico,
// Pórtico Oral WASM) y dispensación de Dosis 1/2/3 extraída de web/mostrador.js (GOLD-696).
// ============================================================================

import { escapeHtml, renderChapterPreviewHtml } from "./bridge_and_chapter.js";
import { STATUS } from "./data_layer.js";
import {
  computeViewportRenderSignature,
  renderProgressiveTwoStrataDiglossicBridge,
} from "./diglossic_chapter_renderer.js";
import { renderAnalyticalThermometerHtml } from "./diachronic_register.js";
import {
  buildRelativePdfAssetUrl,
  dispatchTandaWorkerJob,
  doseFilename,
  effectiveThreatClassWeb,
  locateVersePage,
  ordinalOf,
  planBimodalClientPrint,
  planDose1,
  planDose2,
  planDose3,
  syncDose2AndDose3LinksForActiveLang,
} from "./dosis.js";
import { projectChapterWithLiveOverlays } from "./drawer_workshop.js";
import { renderChapterPericopesRibbonHtml } from "./evangelios.js";
import { isRtlLocale } from "./i18n.js";
import { renderOralPorticoWasmConsole } from "./oral_portico_wasm.js";
import { ReverseOrthographyMap } from "./orthography_wfst.js";
import { countPdfPages, extractPdfPages } from "./pdf_pages.js";

export function renderMostradorViewportFromState({
  state,
  dataLayer,
  i18nInstance,
  getEl,
  targetDoc,
  force = false,
}) {
  const viewport = getEl("bibleVerseViewport", targetDoc);
  if (!viewport || !state.lastNavResult) return;
  const res = state.lastNavResult;
  const effectiveLang = state.effectiveCorpusLang || state.lang;
  const renderSig = computeViewportRenderSignature(state, effectiveLang);
  const prevSig =
    typeof viewport.getAttribute === "function" ? viewport.getAttribute("data-render-sig") : "";
  if (!force && prevSig === renderSig && String(viewport.innerHTML || "").length > 0) {
    return;
  }
  const prevPasses = Number(
    (typeof viewport.getAttribute === "function" && viewport.getAttribute("data-render-pass-count")) || 0,
  );
  viewport.setAttribute("data-render-sig", renderSig);
  viewport.setAttribute("data-render-pass-count", String(prevPasses + 1));
  viewport.setAttribute("data-status", res.status);
  viewport.setAttribute("data-current-ref", `${state.book}.${state.chapter}`);
  viewport.setAttribute("data-selected-verse", String(state.verse));
  viewport.setAttribute("data-lang", effectiveLang);
  viewport.setAttribute("data-canonical-lang", state.lang);
  viewport.setAttribute("data-register", state.register);
  viewport.setAttribute("data-roll-mode", state.rollMode);

  const pericopesRibbon = getEl("bibleChapterPericopesRibbon", targetDoc);
  if (pericopesRibbon) {
    const ribbonHtml = renderChapterPericopesRibbonHtml(
      state.book,
      state.chapter,
      state.uiLocale || state.lang || "es",
    );
    pericopesRibbon.innerHTML = ribbonHtml;
    pericopesRibbon.hidden = !String(ribbonHtml || "").trim();
  }

  const reverseMap = new ReverseOrthographyMap(state.lang, state.orthographyProfile);
  const overlayProj =
    res.status === STATUS.READY && res.chapter
      ? projectChapterWithLiveOverlays(state, effectiveLang, res.chapter)
      : { chapterForRender: null, bannerHtml: "", activeAuthority: "" };
  viewport.setAttribute("data-active-overlay-authority", overlayProj.activeAuthority);
  state.reverseOrthoMap = reverseMap;

  // SLICE-EKO-V2H-20: Proyección XOR estricta de 1 sola vista por capítulo (-50% nodos DOM, 0 duplicación)
  let baseHtml = "";
  if (res.status === STATUS.READY && state.lastDiglossicContext && state.register !== "bilingue") {
    const dCtx = state.lastDiglossicContext;
    const diglossicOnly = renderProgressiveTwoStrataDiglossicBridge({
      lang: state.lang,
      book: state.book,
      chapter: state.chapter,
      selectedVerse: state.verse,
      register: state.register,
      sovereignTier: dCtx.sovereignTier,
      macroRegion: dCtx.macroRegion,
      bridgeLang: dCtx.bridgeCode,
      maternalVerses: overlayProj.chapterForRender?.verses || {},
      bridgeVerses: dCtx.bridgeVerses,
      gmisRows: dCtx.gmisRows,
    });
    baseHtml = `${overlayProj.bannerHtml || ""}<article class="bible-trimodal-chapter diglossic-xor-chapter" data-xor-view="diglossic" data-book="${escapeHtml(state.book)}" data-chapter="${Number(state.chapter)}" data-lang="${escapeHtml(effectiveLang)}">${diglossicOnly}</article>`;
  } else {
    baseHtml = renderChapterPreviewHtml(
      state.book,
      state.chapter,
      effectiveLang,
      overlayProj.chapterForRender,
      i18nInstance,
      {
        selectedVerse: state.verse,
        rollMode: state.rollMode,
        oralPorticoActive: state.oralPorticoActive,
        pausePeriodSelahMs: state.lastProsodyAlignment?.pausePeriodSelahMs || 650,
        register: state.register,
        bridgeChapterData: state.lastBridgeChapter,
        orthographyProfile: state.orthographyProfile,
        reverseMap,
        tokenStrongPairs: state.tokenStrongPairs || [],
      },
    );
    if (overlayProj.bannerHtml) {
      baseHtml = `${overlayProj.bannerHtml}${baseHtml}`;
    }
    if (res.status !== STATUS.READY && state.lastDiglossicBridgeHtml) {
      baseHtml += state.lastDiglossicBridgeHtml;
    }
    if (res.status === STATUS.UNAVAILABLE && state.lastMatrixFallbackHtml) {
      baseHtml += state.lastMatrixFallbackHtml;
    }
  }
  viewport.innerHTML = baseHtml;
  if (typeof viewport.querySelector === "function") {
    const selectedEl = viewport.querySelector(".mostrador-verse.is-selected");
    if (selectedEl) {
      if (typeof selectedEl.offsetTop === "number" && typeof viewport.offsetTop === "number") {
        const relTop = Math.max(0, selectedEl.offsetTop - viewport.offsetTop - 48);
        viewport.scrollTop = relTop;
      } else if (typeof selectedEl.scrollIntoView === "function") {
        try {
          selectedEl.scrollIntoView({ block: "nearest", inline: "nearest" });
        } catch {
          selectedEl.scrollIntoView();
        }
      }
    }
  }

  const thermoPanel = getEl("bibleAnalyticalThermometerPanel", targetDoc);
  if (thermoPanel) {
    thermoPanel.innerHTML = renderAnalyticalThermometerHtml({
      verses: res.status === STATUS.READY ? res.chapter?.verses || {} : {},
      bookCode: state.book,
      osisRef: `${state.book}.${state.chapter}.${state.verse}`,
      includeInlineSubstitutionsDetails: false,
      uiLocale: state.uiLocale || state.lang || "es",
    });
  }
  if (state.oralPorticoActive) {
    renderOralPorticoWasmConsole({ state, dataLayer, getEl, targetDoc });
  }
}

export async function updateMostradorDoseLinks({ state, dataLayer, getEl, targetDoc }) {
  try {
    const syncedLive = syncDose2AndDose3LinksForActiveLang({
      state,
      targetDoc,
      getEl,
    });
    if (syncedLive && syncedLive.mode !== "precompiled") {
      return;
    }
    const catalog = await dataLayer.loadCatalog();
    const pageIndex = await dataLayer.loadPageIndex(state.lang, state.edition);
    const manifest = await dataLayer.loadManifest();
    if (catalog && pageIndex) {
      const ordinal = ordinalOf(
        state.book,
        state.chapter,
        state.verse,
        catalog.verse_counts,
      );
      const loc = locateVersePage(pageIndex, ordinal);
      if (loc) {
        const d2 = planDose2(loc.blockId, state.lang, state.edition, {
          paperFormat: state.paperFormat,
          columns: state.columns,
        });
        const linkDose2 = getEl("linkDose2BlockPdf", targetDoc);
        if (linkDose2) {
          linkDose2.setAttribute("href", buildRelativePdfAssetUrl(d2.url));
          linkDose2.setAttribute("data-edition-slug", d2.editionSlug);
          linkDose2.setAttribute(
            "download",
            doseFilename({
              dose: 2,
              lang: state.lang,
              blockId: loc.blockId,
              countryIso2: state.countryIso2,
            }),
          );
        }
      }
    }
    if (manifest) {
      const d3 = planDose3(manifest, state.lang);
      const linkDose3 = getEl("linkDose3FullBiblePdf", targetDoc);
      if (linkDose3 && d3) {
        linkDose3.setAttribute("href", buildRelativePdfAssetUrl(d3.href || d3.path));
        linkDose3.setAttribute(
          "download",
          doseFilename({
            dose: 3,
            lang: state.lang,
            countryIso2: state.countryIso2,
          }),
        );
      }
    }
  } catch {
    // Non-fatal if page index or manifest is unavailable for an uncompiled language
  }
}

export async function dispenseMostradorDose1({ opts = {}, state, dataLayer }) {
  const sheets = Math.max(1, Math.min(3, Number(opts.sheets ?? state.sheets) || 1));
  const duplex = opts.duplex !== undefined ? Boolean(opts.duplex) : state.duplex;
  const edition = opts.edition || state.edition;

  const synthesizeLiveBimodalDose1 = async (blockIdHint = "bimodal-tanda-dose1", ordHint = 1) => {
    const chapterVerses = state.lastNavResult?.chapter?.verses || {};
    const dir = isRtlLocale(state.lang) ? "rtl" : "ltr";
    const maxPagesLaneA = Math.max(1, Math.min(12, sheets * (duplex ? 4 : 2)));
    const bimodal = planBimodalClientPrint({
      dose: 1,
      lang: state.lang,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      verses: chapterVerses,
      sheets,
      duplex,
      columns: state.columns,
      fontPt: state.fontSizePt,
      paper: state.paperFormat,
      dir,
    });
    let pdfBytes = bimodal.pdfBytes;
    try {
      const [wasmBytes, fontBytes] =
        typeof dataLayer?.loadBytes === "function"
          ? await Promise.all([
              dataLayer.loadBytes("mostrador/ekovoz_typeset_worker.wasm"),
              dataLayer.loadBytes("assets/fonts/CharisSIL-Regular.ttf"),
            ])
          : [null, null];
      const workerRes = await dispatchTandaWorkerJob({
        lang: state.lang,
        book: state.book,
        chapter: state.chapter,
        verses: chapterVerses,
        columns: state.columns || 2,
        fontPt: state.fontSizePt || 9.5,
        paper: state.paperFormat || "a4",
        dir,
        maxPagesPerTanda: maxPagesLaneA,
        ...(wasmBytes instanceof Uint8Array ? { wasmBytes } : {}),
        ...(fontBytes instanceof Uint8Array ? { fontBytes } : {}),
      });
      if (workerRes?.pdfBytes instanceof Uint8Array && workerRes.pdfBytes.byteLength > 0) {
        pdfBytes = workerRes.pdfBytes;
      }
    } catch {
      // Fallback to valid embedded Type3 vector seed when Worker/fetch is mocked out
    }
    const threatClass = effectiveThreatClassWeb(state.countryIso2, state.lang);
    const filename = doseFilename({
      dose: 1,
      lang: state.lang,
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      blockId: blockIdHint,
      blockNumber: ordHint,
      edition,
      threatClass,
      countryIso2: state.countryIso2,
      ordinal: ordHint,
    });
    const totalPages = Math.max(1, countPdfPages(pdfBytes));
    return {
      bytes: pdfBytes,
      printHtml: bimodal.printHtml,
      filename,
      threatClass,
      blockId: blockIdHint,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      sheetCount: sheets,
      pageCount: totalPages,
      availabilityMode: "bimodal_client_print",
    };
  };

  const catalog = await dataLayer.loadCatalog();
  if (!catalog || !catalog.verse_counts) {
    return synthesizeLiveBimodalDose1();
  }
  const pageIndex =
    typeof dataLayer.loadPageIndex === "function"
      ? await dataLayer.loadPageIndex(state.lang, edition)
      : null;
  if (!pageIndex) {
    return synthesizeLiveBimodalDose1();
  }

  const ordinal = ordinalOf(
    state.book,
    state.chapter,
    state.verse,
    catalog,
  );
  const loc = ordinal ? locateVersePage(pageIndex, ordinal) : null;
  if (!loc) {
    return synthesizeLiveBimodalDose1();
  }

  const blockBytes =
    typeof dataLayer.loadBlockPdf === "function"
      ? await dataLayer.loadBlockPdf(state.lang, edition, loc.blockId)
      : null;
  if (!blockBytes) {
    return synthesizeLiveBimodalDose1(loc.blockId, loc.blockIndex + 1);
  }
  const actualBlockPages = Math.max(1, countPdfPages(blockBytes));
  const clampedPageInBlock = Math.min(Math.max(1, Number(loc.pageInBlock) || 1), actualBlockPages);
  const plan = planDose1(clampedPageInBlock, sheets, duplex, actualBlockPages);

  const extractedBytes = extractPdfPages(blockBytes, plan.pages);
  const threatClass = effectiveThreatClassWeb(state.countryIso2, state.lang);
  const filename = doseFilename({
    dose: 1,
    lang: state.lang,
    book: state.book,
    chapter: state.chapter,
    verse: state.verse,
    blockId: loc.blockId,
    blockNumber: loc.blockIndex + 1,
    edition,
    threatClass,
    countryIso2: state.countryIso2,
    ordinal: loc.blockIndex,
  });

  return {
    bytes: extractedBytes,
    filename,
    threatClass,
    blockId: loc.blockId,
    pages: plan.pages,
    sheetCount: plan.sheetCount,
    pageCount: countPdfPages(extractedBytes),
    availabilityMode: "precompiled_pdf",
  };
}
