// ============================================================================
// web/mostrador/mostrador_viewport_dose1.js — Costura Limpia ∂_mut(C) = 0 (SLICE-V2D-11)
// Proyección del lienzo de lectura (#bibleVerseViewport, cintillo de perícopas, termómetro analítico,
// Pórtico Oral WASM) y dispensación de Dosis 1/2/3 extraída de web/mostrador.js (GOLD-696).
// ============================================================================

import {
  escapeHtml,
  isBookHumanVerifiedByEpistemicTier,
  renderChapterPreviewHtml,
  unpackBookEpistemicTier2Bit,
} from "./bridge_and_chapter.js";
import { STATUS } from "./data_layer.js";
import { renderAnalyticalThermometerHtml } from "./diachronic_register.js";
import {
  computeViewportRenderSignature,
  renderProgressiveTwoStrataDiglossicBridge,
} from "./diglossic_chapter_renderer.js";
import {
  dispatchTandaWorkerJob,
  doseFilename,
  effectiveThreatClassWeb,
  locateVersePage,
  ordinalOf,
  planBimodalClientPrint,
  planDose1,
  syncDose2AndDose3LinksForActiveLang,
} from "./dosis.js";
import { projectChapterWithLiveOverlays } from "./drawer_workshop.js";
import { renderChapterPericopesRibbonHtml } from "./evangelios.js";
import { isRtlLocale } from "./i18n.js";
import { decodeRfc8878RawZstdFrameJs } from "./offline_mesh.js";
import { renderOralPorticoWasmConsole } from "./oral_portico_wasm.js";
import { ReverseOrthographyMap } from "./orthography_wfst.js";
import { countPdfPages, extractPdfPages } from "./pdf_pages.js";
import { resolveFontFileForLangOrScript } from "./tanda_print_worker.js";

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

  // SLICE-EKO-V2H-20 + SLICE-EKO-V2I-20: Proyección XOR estricta de 1 sola vista por capítulo.
  // En `stp` (`Tier 2`), el NT humano verificado (`40_MAT..66_REV`, `book_epistemic_tiers == 0b01`)
  // se renderiza en mostrador monolingüe canónico con sello verificado; el AT (`01_GEN..39_MAL`, `0b10`)
  // se renderiza en Puente Diglósico de 2 columnas.
  const packedBookTiers =
    res.provenance?.book_epistemic_tiers ||
    res.chapter?.provenance?.book_epistemic_tiers ||
    res.bookEpistemicTiers ||
    null;
  const bookTierBits = unpackBookEpistemicTier2Bit(packedBookTiers, state.book);
  viewport.setAttribute(
    "data-book-epistemic-tier-bits",
    bookTierBits === null ? "auto" : String(bookTierBits),
  );
  const isHumanVerifiedBook =
    isBookHumanVerifiedByEpistemicTier(state.book, {
      ...res,
      book: state.book,
      lang: state.lang,
    }) &&
    (bookTierBits === 0 || bookTierBits === 1 || String(state.lang || "").toLowerCase() === "stp");
  let baseHtml = "";
  if (
    res.status === STATUS.READY &&
    state.lastDiglossicContext &&
    state.register !== "bilingue" &&
    !isHumanVerifiedBook
  ) {
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
        searchHighlight: state.activeSearchHighlight || "",
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

export async function updateMostradorDoseLinks({ state, targetDoc, getEl }) {
  try {
    syncDose2AndDose3LinksForActiveLang({
      state,
      targetDoc,
      getEl,
    });
  } catch {
    // Non-fatal if DOM targets are absent in headless environment
  }
}

export async function dispenseMostradorDose1({ opts = {}, state, dataLayer }) {
  const sheets = Math.max(1, Math.min(3, Number(opts.sheets ?? state.sheets) || 1));
  const duplex = opts.duplex !== undefined ? Boolean(opts.duplex) : state.duplex;
  const edition = opts.edition || state.edition;

  const synthesizeLiveBimodalDose1 = async (blockIdHint = "bimodal-tanda-dose1", ordHint = 1) => {
    const chapterVerses = state.lastNavResult?.chapter?.verses || {};
    const dir = isRtlLocale(state.lang) ? "rtl" : "ltr";
    const maxPagesLaneA = Math.max(1, Math.min(6, sheets * (duplex ? 2 : 1)));
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
      const targetFontFile = resolveFontFileForLangOrScript(state.lang || "es", state.script || "");
      let wasmBytes = null;
      let fontBytes = null;
      if (typeof dataLayer?.loadBytes === "function") {
        const fontPromise =
          targetFontFile === "CharisSIL-Regular.ttf"
            ? dataLayer.loadBytes("assets/fonts/CharisSIL-Regular.ttf")
            : dataLayer.loadBytes(`packs/fonts/${targetFontFile}.zst`).then(async (zstBytes) => {
              if (!(zstBytes instanceof Uint8Array) || zstBytes.byteLength <= 16) return null;
              const playerWasm =
                dataLayer?.getHydratedWasmModule?.("ekovoz_player_wasm") ||
                (typeof dataLayer?.loadWasmModule === "function"
                  ? await dataLayer.loadWasmModule("ekovoz_player_wasm")
                  : null);
              return decodeRfc8878RawZstdFrameJs(zstBytes, playerWasm);
            });
        [wasmBytes, fontBytes] = await Promise.all([
          dataLayer.loadBytes("mostrador/ekovoz_typeset_worker.wasm"),
          fontPromise.catch(() => null),
        ]);
      }
      const workerRes = await dispatchTandaWorkerJob({
        lang: state.lang,
        script: state.script || "",
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
      } else if (Array.isArray(workerRes?.blobParts) && workerRes.blobParts.length > 0) {
        const total = workerRes.blobParts.reduce((a, p) => a + p.byteLength, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const p of workerRes.blobParts) {
          merged.set(p, off);
          off += p.byteLength;
        }
        if (merged.byteLength > 0) pdfBytes = merged;
      }
    } catch {
      // Fallback to CSS Paged Media (@media print) when WASM Worker/font is unavailable (DEB-V2LB-04)
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
    const hasRealPdf = pdfBytes instanceof Uint8Array && pdfBytes.byteLength >= 8;
    const totalPages = hasRealPdf
      ? Math.max(1, countPdfPages(pdfBytes))
      : Math.max(1, Number(sheets) || 1);
    const strokeFallbackNote = hasRealPdf
      ? "Si la fuente física /F2 negrita no está embebida, /F1 aplica refuerzo vectorial PDF (q 2 Tr 0.28 w) sin degradar a latín."
      : "Impresión directa desde el navegador activa; el refuerzo vectorial /F1 aplica al exportar el PDF completo.";
    return {
      bytes: pdfBytes,
      printHtml: bimodal.printHtml,
      filename,
      threatClass,
      blockId: blockIdHint,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
      sheetCount: sheets,
      pageCount: totalPages,
      availabilityMode: hasRealPdf ? "bimodal_client_print" : "css_paged_media_fallback",
      strokeFallbackNote,
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

export function resolveVerifiedBookCount(targetState = {}) {
  const packed =
    targetState?.lastNavResult?.provenance?.book_epistemic_tiers ||
    targetState?.lastNavResult?.chapter?.provenance?.book_epistemic_tiers ||
    targetState?.lastNavResult?.bookEpistemicTiers ||
    null;
  if (packed && typeof packed.length === "number" && packed.length >= 17) {
    let count = 0;
    for (let i = 0; i < 66; i += 1) {
      const bits = ((Number(packed[i >>> 2]) || 0) >>> ((i & 3) * 2)) & 0x03;
      if (bits === 0 || bits === 1) count += 1;
    }
    if (count > 0) return count;
  }
  const navCount = Number(
    targetState?.lastNavResult?.provenance?.canonical_books_present ||
    targetState?.lastNavResult?.chapter?.provenance?.canonical_books_present ||
    0,
  );
  if (navCount > 0 && navCount <= 66) return navCount;
  const catEntry = targetState?.activeCatalogEntry || null;
  const catCount = Number(catEntry?.canonical_books_present || catEntry?.canonicalBooksPresent || 0);
  if (catCount > 0 && catCount <= 66) return catCount;
  const sovereignTier = String(
    targetState?.lastNavResult?.provenance?.sovereign_tier ||
    targetState?.lastNavResult?.chapter?.provenance?.sovereign_tier ||
    "",
  ).toLowerCase();
  if (sovereignTier === "tier_1_canonical") {
    return 66;
  }
  return 0;
}

export function updateMostradorSealDom({ sealKey, state, i18nInstance, getEl, targetDoc }) {
  const effectiveSealKey = sealKey || state.seal || "seal.unavailable";
  state.seal = effectiveSealKey;
  const sealEl = getEl("epistemicStatusSeal", targetDoc);
  if (!sealEl) return;
  const corpusLang = String(state.effectiveCorpusLang || state.lang || "").trim().toLowerCase();
  const verifiedBookCount = resolveVerifiedBookCount(state);
  const isPartialVerified =
    effectiveSealKey === "seal.verified" &&
    verifiedBookCount > 0 &&
    verifiedBookCount < 66 &&
    !(verifiedBookCount === 27 && (corpusLang === "stp" || corpusLang === "st"));
  const displayKey =
    effectiveSealKey === "seal.verified" && (corpusLang === "stp" || corpusLang === "st")
      ? "seal.verified_nt"
      : isPartialVerified
        ? "seal.verified_portion"
        : effectiveSealKey;
  sealEl.setAttribute("data-seal", effectiveSealKey);
  sealEl.setAttribute("data-i18n", displayKey);
  if (verifiedBookCount > 0) {
    sealEl.setAttribute("data-verified-book-count", String(verifiedBookCount));
  } else if (typeof sealEl.removeAttribute === "function") {
    sealEl.removeAttribute("data-verified-book-count");
  }
  const rawLabel = i18nInstance ? i18nInstance.t(displayKey) : displayKey;
  const isEn = String(state.uiLocale || "en").toLowerCase().startsWith("en");
  const fallbackHuman =
    displayKey === "seal.verified_nt"
      ? isEn
        ? "Verified text · 27 New Testament Books"
        : "Texto verificado · 27 Libros del Nuevo Testamento"
      : isPartialVerified
        ? isEn
          ? `Verified portion · ${verifiedBookCount} Canonical ${verifiedBookCount === 1 ? "Book" : "Books"}`
          : `Porción verificada · ${verifiedBookCount} ${verifiedBookCount === 1 ? "Libro Canónico" : "Libros Canónicos"}`
        : effectiveSealKey === "seal.verified"
          ? isEn
            ? "Verified text · 66 Canonical Books"
            : "Texto verificado · 66 Libros Canónicos"
          : effectiveSealKey === "seal.draft_review"
            ? isEn
              ? "Workshop draft & verified portion · Tiers 2–4 (L1–L5 review)"
              : "Borrador de taller y porción verificada · Tiers 2–4 (revisión L1–L5)"
            : isEn
              ? "GMIS 4-line interlinear scaffold + 21st-Century Bridge"
              : "Andamiaje interlineal GMIS 4 líneas + Puente Siglo XXI";
  const hasLocalizedRawLabel =
    Boolean(rawLabel) &&
    rawLabel !== effectiveSealKey &&
    !rawLabel.startsWith("seal.");
  sealEl.textContent = isPartialVerified
    ? hasLocalizedRawLabel
      ? isEn
        ? `${rawLabel} · ${verifiedBookCount} Canonical ${verifiedBookCount === 1 ? "Book" : "Books"}`
        : `${rawLabel} · ${verifiedBookCount} ${verifiedBookCount === 1 ? "Libro Canónico" : "Libros Canónicos"}`
      : fallbackHuman
    : hasLocalizedRawLabel
      ? rawLabel
      : fallbackHuman;
}
