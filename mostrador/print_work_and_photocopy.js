// ============================================================================
// web/mostrador/print_work_and_photocopy.js — Submódulo de Contexto Multi-Obra,
// Papel SSOT (A4 / US-LETTER), Oráculo Unificado Sauvola y Vista Braille B70
// Decisiones D2-R9, D5-R9, D6-R9, D8-R9 · Cero estilos inline · Costura limpia
// ============================================================================

import { escapeHtml } from "./bridge_and_chapter.js";
import { resolveLocalPrintArtifactFallback } from "./bimodal_tanda_print.js";
import { dispatchTandaWorkerJob, syncPrintDrawerControlsFromEditionProfile } from "./dosis.js";
import { buildEditionRenderSpecBytes16, resolveNumericEditionId } from "./dosis_editions_catalog.js";
import { isRtlLocale } from "./i18n.js";
import { mountOfflineFontNoticeWithLocalImporter } from "./offline_font_bundle.js";
import { resolveEditionSubstrateForProfile } from "./print_config_projector.js";
import { renderPhysicalPrintGuideHtml } from "./print_guide_and_progress.js";
import { resolveActiveWorkDrawerContext } from "./projection_contract.js";
import { updatePrintConfig } from "./state_store.js";
import { resolveSafeDownloadFilename } from "./stealth_filename.js";
import { encodePaperFormatCode } from "./tanda_print_worker.js";

export function normalizeStandardPaperFormat(raw = "a4") {
  const clean = String(raw || "a4").trim().toLowerCase();
  if (/^(letter|us[-_]?letter|carta)$/.test(clean)) return "letter";
  if (clean.includes("b70") || clean.includes("braille")) return "b70";
  if (clean.includes("a3")) return "a3";
  if (clean.includes("folio") || clean.includes("oficio")) return "folio";
  return "a4";
}

export function formatStandardPaperBadge(raw = "a4") {
  const norm = normalizeStandardPaperFormat(raw);
  if (norm === "letter") return "US-LETTER";
  if (norm === "b70") return "B70";
  if (norm === "a3") return "A3";
  if (norm === "folio") return "FOLIO";
  return "A4";
}

export function resolveUnifiedSauvolaState(state = {}) {
  const genIndex = Number.isInteger(state?.photocopyGen)
    ? Math.max(0, Math.min(5, state.photocopyGen))
    : 3;
  const rawK = Number(state?.sauvolaK);
  const sauvolaK =
    Number.isFinite(rawK) && rawK > 0
      ? Math.max(0.15, Math.min(0.45, Number(rawK.toFixed(2))))
      : 0.25;
  return {
    genIndex,
    sauvolaK,
    dpi: 300,
    R: 128,
  };
}

export function renderPrintActiveWorkBannerHtml(state = {}) {
  const workCtx = resolveActiveWorkDrawerContext(state);
  if (!workCtx.isSisterWork) return "";
  const isEn = String(state?.uiLocale || "es").trim().toLowerCase().startsWith("en");
  const scopeCopy =
    workCtx.activeWork === "felices"
      ? isEn
        ? "Prints 27 bilingual plates / selected paper format alongside the passage anchor."
        : "Imprime las 27 láminas bilingües / tamaño activo junto con el pasaje bíblico ancla."
      : isEn
        ? "Prints the 52 liturgical gospel sheets / active paper format alongside the passage anchor."
        : "Imprime las 52 láminas litúrgicas del evangelio / papel activo junto con el pasaje ancla.";
  return (
    `<aside id="printActiveWorkBanner" class="work-context-drawer-banner" data-active-work="${escapeHtml(workCtx.activeWork)}">` +
    `<strong>${escapeHtml(workCtx.bannerText)}</strong>` +
    `<span class="ek-meta"> · ${escapeHtml(scopeCopy)}</span>` +
    `</aside>`
  );
}

export function mountOrUpdatePrintActiveWorkBanner(sheetEl, targetDoc, state = {}) {
  if (!sheetEl) return null;
  const html = renderPrintActiveWorkBannerHtml(state);
  let bannerEl =
    typeof targetDoc?.getElementById === "function"
      ? targetDoc.getElementById("printActiveWorkBanner")
      : null;
  if (!html) {
    if (bannerEl) bannerEl.hidden = true;
    return null;
  }
  if (!bannerEl && typeof targetDoc?.createElement === "function" && typeof sheetEl.insertBefore === "function") {
    bannerEl = targetDoc.createElement("aside");
    bannerEl.id = "printActiveWorkBanner";
    bannerEl.className = "work-context-drawer-banner";
    sheetEl.insertBefore(bannerEl, sheetEl.firstChild || null);
  }
  if (bannerEl) {
    bannerEl.hidden = false;
    bannerEl.setAttribute?.("data-active-work", String(state?.activeWork || "biblia"));
    const innerMatch = html.match(/^<aside[^>]*>([\s\S]*)<\/aside>$/i);
    bannerEl.innerHTML = innerMatch ? innerMatch[1] : html;
  }
  return bannerEl;
}

export function renderUnifiedBraillePreviewHtml({
  verseRef = "GEN 1:1",
  unicodeText = "",
  brfText = "",
  isEn = false,
  nemethEnabled = false,
} = {}) {
  const previewLine = String(unicodeText || brfText || "").trim().slice(0, 72);
  if (!previewLine) return "";
  const specLabel = isEn
    ? `BEB B70 (280×292 mm · 40 cells/line · ${nemethEnabled ? "Nemeth active" : "Literary UEB/SP"})`
    : `BEB B70 (280×292 mm · 40 celdas/línea · ${nemethEnabled ? "Nemeth activo" : "Literario CBE/UEB"})`;
  return (
    `<div id="brailleLivePreviewCard" class="ek-card-muted ek-mt-xs" data-braille-b70-preview="true" data-nemeth-enabled="${nemethEnabled ? "true" : "false"}">` +
    `<div class="ek-row-between"><strong>⠋ ${escapeHtml(verseRef)}</strong><span class="uls-badge ek-badge-compact">${escapeHtml(specLabel)}</span></div>` +
    `<p class="ek-meta ek-mt-xs" lang="und-Brai">${escapeHtml(previewLine)}</p>` +
    `</div>`
  );
}

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

export function buildEditionCatalogCardHtml(ed, {
  state,
  activeProfileId,
  effectiveLang,
  effectivePaper,
  activeBlockCode,
  editionScopeSig,
  isEn,
  buildRelativePdfAssetUrl,
  encodePaperFormatCode,
} = {}) {
  const cardId = ed.profileId || ed.id;
  const isSelected = ed.kind !== "field_pdf" && cardId === activeProfileId;
  const dynamicFieldMode =
    ed.id?.includes("refugio_4_hojas") || ed.editionSlug === "refugio_4_hojas"
      ? 15
      : ed.id?.includes("checklist_80_bloques") || ed.editionSlug === "checklist_80_bloques"
        ? 0
        : ed.id === "06_bilingue_paralela"
          ? 15
          : ed.id === "07_cuaderno_5lineas_apaisado"
            ? 16
            : 0;
  const editionCacheKey = `${cardId}::${editionScopeSig}`;
  const cachedCardHref = state.editionObjectUrls[editionCacheKey] || state.editionObjectUrls[cardId] || "";
  const staticFieldHref =
    ed.kind === "field_pdf" && effectiveLang === "es" && state.federationReachable !== false
      ? buildRelativePdfAssetUrl(ed.profileUrl || ed.url || "")
      : "";
  const resolvedHref =
    cachedCardHref ||
    staticFieldHref ||
    buildRelativePdfAssetUrl(ed.profileUrl || ed.url || "mostrador/tanda_print_worker.js");
  const cardPaperRaw = String(ed.paperSize || "").toLowerCase();
  const normEffPaper = normalizeStandardPaperFormat(effectivePaper || "a4");
  const isAdaptableStdPaper =
    (cardPaperRaw === "a4" || cardPaperRaw === "letter" || cardPaperRaw === "us-letter") &&
    (normEffPaper === "a4" || normEffPaper === "letter");
  const resolvedCardPaper = isAdaptableStdPaper ? normEffPaper : (ed.paperSize || "");
  const displayPaperBadge = isAdaptableStdPaper
    ? formatStandardPaperBadge(normEffPaper)
    : ed.paperSize
      ? formatStandardPaperBadge(ed.paperSize)
      : "";
  const paperCode = encodePaperFormatCode(
    resolvedCardPaper || effectivePaper,
    String(resolvedCardPaper || "").toLowerCase().includes("landscape") ? "landscape" : "portrait",
  );
  const specParts =
    ed.kind === "field_pdf"
      ? [
        isEn ? "Field PDF" : "PDF de Campo",
        ed.bytes ? `${(Number(ed.bytes) / 1024).toFixed(1)} KB` : "",
      ].filter(Boolean)
      : [
        ed.columns ? `${ed.columns} col` : "",
        ed.fontPt ? `${ed.fontPt} pt` : "",
        displayPaperBadge,
        activeBlockCode,
      ].filter(Boolean);
  const specBadge = specParts.length
    ? `<span class="edition-spec-badge">${escapeHtml(specParts.join(" · "))}</span>`
    : "";
  return (
    `<a class="uls-chip print-edition-card${isSelected ? " is-selected" : ""}" aria-pressed="${isSelected ? "true" : "false"
    }" href="${escapeHtml(resolvedHref)}" data-profile-id="${escapeHtml(cardId)}" data-edition-slug="${escapeHtml(
      ed.editionSlug,
    )}" data-edition-mode="${dynamicFieldMode}" data-paper-code="${paperCode}" data-active-block="${escapeHtml(activeBlockCode)}" data-field-pdf-bytes="${escapeHtml(
      ed.bytes || "",
    )}" data-geometry-key="${escapeHtml(ed.geometryKey || "")}" data-edition-kind="${escapeHtml(
      ed.kind || "edition",
    )}" data-toml-path="${escapeHtml(ed.tomlPath || "")}" data-font-pt="${escapeHtml(
      ed.fontPt || "",
    )}" data-columns="${escapeHtml(ed.columns || "")}" data-paper-size="${escapeHtml(
      resolvedCardPaper,
    )}" data-has-precompiled-pdf="${Boolean(staticFieldHref && !cachedCardHref)}" data-availability-mode="bimodal_client_print" data-bimodal-lane="lane_b_worker_tanda" download>📄 ${escapeHtml(ed.label)}${specBadge}</a>`
  );
}

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
        stealthMode: Boolean(state.stealthMode),
        blockNumber: stealthBlkNum,
        stealthFilename: isStealthActive ? resolveSafeDownloadFilename(state, { kind: "paged_media", blockNumber: stealthBlkNum }) : "",
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
  if (!isFieldCard) {
    renderPrintDrawerPanelsSyncInDrawer(ctx);
  }
}

export function resolveDuplexFlipEdge(
  orientation = "portrait",
  foliationMode = "saddle_stitch",
  uiLocale = "es",
) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const isLandscape = String(orientation || "portrait").trim().toLowerCase() === "landscape";
  const isSaddle = String(foliationMode || "saddle_stitch").trim().toLowerCase() === "saddle_stitch";
  const isShortEdge = isLandscape || isSaddle;
  const edge = isShortEdge ? "short" : "long";
  const labelEs = isShortEdge ? "borde corto" : "borde largo";
  const labelEn = isShortEdge ? "short edge" : "long edge";
  const toggleLabelEs = `Impresión a doble cara (voltear por el ${labelEs})`;
  const toggleLabelEn = `Double-sided printing (flip on ${labelEn})`;
  const step2Es = `Paso 1: Imprime caras impares (anverso). Paso 2: Voltea el pliego por el ${labelEs} e imprime caras pares (reverso)`;
  const step2En = `Step 1: Print odd pages (front). Step 2: Flip sheet along the ${labelEn} and print even pages (back)`;
  return {
    edge,
    isShortEdge,
    labelEs,
    labelEn,
    toggleLabel: isEn ? toggleLabelEn : toggleLabelEs,
    step2Text: isEn ? step2En : step2Es,
  };
}

export function renderFieldRefugeAndChecklistHtml(profilesArtifact = null, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const fieldPdfs = profilesArtifact?.field_pdfs || {};
  const refugePath = String(fieldPdfs?.refugio_4_hojas?.path || "obras/biblia/campo/refugio_4_hojas.pdf");
  const refugeKb = Math.max(1, Math.round((Number(fieldPdfs?.refugio_4_hojas?.bytes) || 54304) / 1024));
  const checkPath = String(fieldPdfs?.checklist_80_bloques?.path || "obras/biblia/campo/checklist_80_bloques.pdf");
  const checkKb = Math.max(1, Math.round((Number(fieldPdfs?.checklist_80_bloques?.bytes) || 12312) / 1024));
  const defaultAnchors = [
    "Hoja 1: Creación, Caída y Promesa (Génesis 1–3 · Salmo 23 · Isaías 53)",
    "Hoja 2: Las 12 Dichas de Jesús y el Sermón del Monte (Mateo 5–7 · Lucas 15)",
    "Hoja 3: Cruz, Resurrección y Nueva Creación (Juan 1, 3, 19–20 · Romanos 8)",
    "Hoja 4: La Mesa, Consuelo e Iglesia en Casa (Salmo 91 · 1 Corintios 13 · Apocalipsis 21–22)",
  ];
  const anchors =
    Array.isArray(profilesArtifact?.pocket_refuge_4_sheets_spec?.anchors) &&
    profilesArtifact.pocket_refuge_4_sheets_spec.anchors.length > 0
      ? profilesArtifact.pocket_refuge_4_sheets_spec.anchors
      : defaultAnchors;
  const anchorItemsHtml = anchors.map((a) => `<li>${escapeHtml(a)}</li>`).join("");

  return (
    `<section id="printFieldPdfsCard" class="ek-card ek-stack-sm ek-mt-sm" data-field-pdfs="true">` +
    `<div class="ek-row-between">` +
    `<strong>🏕️ ${isEn ? "Emergency Field Kits (Ready PDFs)" : "Kits de Campo e Impresión de Refugio (PDFs Listos)"}</strong>` +
    `<span class="uls-badge">60% · 47 pp · 80 bloques</span>` +
    `</div>` +
    `<div class="ek-row-wrap">` +
    `<a id="linkFieldRefuge4SheetsPdf" class="uls-chip ek-btn-link" href="${escapeHtml(refugePath)}" download="refugio_4_hojas.pdf">` +
    `🛡️ ${isEn ? `4-Sheet Pocket Refuge (${refugeKb} KB PDF)` : `Refugio de Bolsillo 4 Hojas (${refugeKb} KB PDF)`}</a>` +
    `<a id="linkFieldChecklist80Pdf" class="uls-chip ek-btn-link" href="${escapeHtml(checkPath)}" download="checklist_80_bloques.pdf">` +
    `☑️ ${isEn ? `80-Block Canon Checklist (${checkKb} KB PDF)` : `Lista de 80 Bloques Canónicos (${checkKb} KB PDF)`}</a>` +
    `</div>` +
    `<details class="tech-details"><summary>${isEn ? "4 Refuge Sheet Anchors" : "Anclas de las 4 hojas de refugio"}</summary>` +
    `<ul class="ek-list-compact ek-mt-xs">${anchorItemsHtml}</ul>` +
    `</details>` +
    `</section>`
  );
}

export function renderCompactTypologySelectorHtml({
  branches = [],
  typologies = [],
  activeBranchId = "",
  activeTypologyId = "",
  uiLocale = "es",
} = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const branchOptions = (Array.isArray(branches) ? branches : []).map((b) => {
    const id = String(b?.id || "");
    const name = String(b?.label || b?.parsed?.family_name || id).replace(/^G_\d+_/i, "").replace(/_/g, " ");
    const order = String(b?.parsed?.word_order || "");
    const sel = id === activeBranchId ? " selected" : "";
    return `<option value="${escapeHtml(id)}"${sel}>${escapeHtml(name)}${order ? ` (${escapeHtml(order)})` : ""}</option>`;
  }).join("");
  const typoOptions = (Array.isArray(typologies) ? typologies : []).map((t) => {
    const id = String(t?.id || "");
    const langCode = String(t?.lang_code || t?.data?.lang_code || id.replace(/_typology$/, "")).toUpperCase();
    const order = String(t?.word_order || t?.data?.word_order || "");
    const sel = id === activeTypologyId ? " selected" : "";
    return `<option value="${escapeHtml(id)}"${sel}>${escapeHtml(langCode)}${order ? ` · ${escapeHtml(order)}` : ""}</option>`;
  }).join("");

  return (
    `<details id="printTypologyBridgeCard" class="tech-details ek-card-muted ek-stack-sm ek-mt-xs" data-typology-bridge="true">` +
    `<summary class="ek-title-sm">🌐 ${isEn ? "Advanced linguistic layout adaptation" : "Adaptación lingüística avanzada de maquetación"}</summary>` +
    `<div class="ek-form-pair ek-mt-xs">` +
    `<label class="ek-label-sm">${isEn ? "Linguistic branch (12)" : "Rama lingüística (12)"}` +
    `<select id="printBranchProfileSelect" class="ek-input">${branchOptions}</select></label>` +
    `<label class="ek-label-sm">${isEn ? "Typological syntax (16)" : "Perfil sintáctico (16)"}` +
    `<select id="printTypologyProfileSelect" class="ek-input">${typoOptions}</select></label>` +
    `</div>` +
    `</details>`
  );
}

export function renderDuplexAssistantCardHtml({
  slug = "02_2col_pastoral",
  duplex = true,
  foliation = {},
  flipEdgeInfo = {},
  budgetSummary = "",
  nemethChecked = false,
  verseRef = "GEN 1:1",
  unicodeText = "",
  brfText = "",
  brfHref = "",
  brfFilename = "ekovoz.brf",
  multiSigHtml = "",
  macroTandas16Html = "",
  isEn = false,
} = {}) {
  const duplexHeader = isEn
    ? `Duplex Assistant (${duplex ? `2-sided · ${flipEdgeInfo.labelEn || "short edge"}` : "1-sided"}) · ${escapeHtml(foliation.summary || "")}`
    : `Asistente Dúplex (${duplex ? `2 caras · ${flipEdgeInfo.labelEs || "borde corto"}` : "1 cara"}) · ${escapeHtml(foliation.summary || "")}`;
  const duplexBody = `${escapeHtml(flipEdgeInfo.step2Text || "")} · ${escapeHtml(budgetSummary || "")}.`;
  const nemethCheckedAttr = nemethChecked ? " checked" : "";
  const nemethLabel = isEn
    ? "Braille Math & Grade B70 (Ed. 11)"
    : "Braille Matemático B70 (Ed. 11)";
  const nemethToggleHtml =
    `<div class="braille-actions-row">` +
    `<label class="hig-toggle-row uls-chip">` +
    `<input type="checkbox" id="chkBrailleNemethToggle" class="hig-switch" data-action="toggle-braille-nemeth" data-edition-slug="11_braille_nemeth_b70"${nemethCheckedAttr} />` +
    `<span>${escapeHtml(nemethLabel)}</span></label>` +
    `<a id="btnDownloadBrailleBrf" class="uls-chip" href="${escapeHtml(brfHref)}" download="${escapeHtml(brfFilename)}" data-edition-slug="11_braille_nemeth_b70">` +
    `⠋ ${isEn ? "Download Tactile .brf (Ed. 11)" : "Descargar .brf Táctil (Ed. 11)"}</a>` +
    `</div>`;
  const braillePreviewHtml = renderUnifiedBraillePreviewHtml({
    verseRef,
    unicodeText,
    brfText,
    isEn,
    nemethEnabled: nemethChecked,
  });
  const physicalGuideHtml = renderPhysicalPrintGuideHtml(
    foliation?.paper || "a4",
    isEn ? "en" : "es",
  );
  const techDetailsTitle = isEn
    ? "Technical booklet & imposition details"
    : "Detalles técnicos de pliegos e imposición";
  return `<div class="mostrador-duplex-assistant" data-edition="${escapeHtml(slug)}" data-foliation-mode="${escapeHtml(foliation.mode || "saddle_stitch")}" data-binding-edge="${escapeHtml(foliation.bindingEdge || "left")}" data-flip-edge="${escapeHtml(flipEdgeInfo.edge || "short")}">${physicalGuideHtml}<details class="tech-details"><summary>${techDetailsTitle}</summary><strong>${duplexHeader}</strong><p class="duplex-summary-text">${duplexBody}</p></details>${nemethToggleHtml}${braillePreviewHtml}${multiSigHtml}${macroTandas16Html}</div>`;
}

export function renderStationeryPostcardHtml({
  osis = "GEN.1.1",
  refLabel = "GEN 1:1",
  verseText = "",
  postalHref = "#",
  postalDownload = "ekovoz-postal.html",
  isEn = false,
} = {}) {
  return (
    `<div class="mostrador-stationery-card" data-osis="${escapeHtml(osis)}">` +
    `<strong>${isEn ? "A6 Typographic Postcard" : "Postal tipográfica A6"} (${escapeHtml(refLabel)})</strong>` +
    `<blockquote class="stationery-quote">"${escapeHtml(verseText)}"</blockquote>` +
    `<a id="btnDownloadStationeryPostcard" class="uls-chip stationery-download-btn" href="${escapeHtml(postalHref)}" download="${escapeHtml(postalDownload)}">✉️ ${isEn ? "Download A6 Postcard (HTML)" : "Descargar Postal A6 (HTML)"}</a>` +
    `</div>`
  );
}

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

export function bindImpositionAndLayoutButtons({
  state,
  targetDoc,
  getEl,
  computeSaddleStitchImpositionPlan,
  computeKindlePrintBudget,
  renderImpositionAndLayoutPreviewHtml,
} = {}) {
  const btnCalcImp = getEl("btnCalculateImposition", targetDoc);
  if (btnCalcImp && typeof btnCalcImp.addEventListener === "function" && !btnCalcImp._printImpBound) {
    btnCalcImp._printImpBound = true;
    btnCalcImp.addEventListener("click", () => {
      state.activePrintPreviewMode = "imposition";
      const curIsEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
      const curOrientation = String(state.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
      const imp = computeSaddleStitchImpositionPlan({ totalPages: 16, paperThicknessMm: 0.09, rtl: isRtlLocale(state.lang) });
      const sheetsSummary = imp.sheets
        .map((s) => `P${s.sheetIndex}[F:${s.front[0]}-${s.front[1]} / V:${s.back[0]}-${s.back[1]} · creep +${s.creepMm}mm]`)
        .join(" · ");
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-imposition" data-integrity="${imp.integrityVerified}" data-rtl="${imp.rtl}">` +
        (curIsEn
          ? `📐 <strong>4n Saddle-Stitch Imposition (${imp.paddedPages} pp · ${imp.sheetCount} sheets · ${imp.rtl ? "RTL Reversed Spine" : "LTR"}):</strong> Constant sum=${imp.folioSumConstant} · Max creep=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`
          : `📐 <strong>Imposición Saddle-Stitch 4n (${imp.paddedPages} págs · ${imp.sheetCount} pliegos · ${imp.rtl ? "RTL Lomo Invertido" : "LTR"}):</strong> Suma constante=${imp.folioSumConstant} · Creep máx=${imp.maxCreepMm}mm · ${escapeHtml(sheetsSummary)}</div>`);
      const host = getEl("impositionBookletPreviewHost", targetDoc);
      if (host) {
        host.setAttribute("data-audit-action", "calculate-imposition");
        host.innerHTML =
          renderImpositionAndLayoutPreviewHtml({
            mode: "imposition",
            paper: state.paperFormat || "a4",
            pageCount: 16,
            columns: state.columns || 2,
            fontPt: state.fontSizePt || 9.5,
            orientation: curOrientation,
            dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            uiLocale: state.uiLocale || "es",
          }) + receiptHtml;
      }
    });
  }
  const btnCalcLayout = getEl("btnCalculateLayout", targetDoc);
  if (btnCalcLayout && typeof btnCalcLayout.addEventListener === "function" && !btnCalcLayout._printLayoutBound) {
    btnCalcLayout._printLayoutBound = true;
    btnCalcLayout.addEventListener("click", () => {
      state.activePrintPreviewMode = "layout";
      const curIsEn = String(state.uiLocale || "es").trim().toLowerCase().startsWith("en");
      const curOrientation = String(state.orientation || "portrait").toLowerCase() === "landscape" ? "landscape" : "portrait";
      const budgetCalc = computeKindlePrintBudget({
        fontPt: state.fontSizePt || 9.5,
        columns: state.columns || 2,
        orientation: curOrientation,
        paper: state.paperFormat || "a4",
        uiLocale: state.uiLocale || "es",
      });
      const receiptHtml =
        `<div class="audit-receipt" data-action="calculate-layout" data-cpl="${budgetCalc.cpl}">` +
        (curIsEn
          ? `📏 <strong>Verified Page Geometry:</strong> ${escapeHtml(budgetCalc.summaryText)}.</div>`
          : `📏 <strong>Márgenes Verificados:</strong> ${escapeHtml(budgetCalc.summaryText)}.</div>`);
      const host = getEl("impositionBookletPreviewHost", targetDoc);
      if (host) {
        host.setAttribute("data-audit-action", "calculate-layout");
        host.innerHTML =
          renderImpositionAndLayoutPreviewHtml({
            mode: "layout",
            paper: state.paperFormat || "a4",
            pageCount: 16,
            columns: state.columns || 2,
            fontPt: state.fontSizePt || 9.5,
            orientation: curOrientation,
            dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
            uiLocale: state.uiLocale || "es",
          }) + receiptHtml;
      }
    });
  }
}

export function bindPagedMediaPrintButton({
  state,
  targetDoc,
  getEl,
  buildCssPagedMediaPrintHtml,
  stealthBlkNum,
} = {}) {
  const btnPagedMedia = getEl("btnPrintCssPagedMedia", targetDoc);
  if (!btnPagedMedia || typeof btnPagedMedia.addEventListener !== "function" || btnPagedMedia._pagedMediaBound) return;
  btnPagedMedia._pagedMediaBound = true;
  btnPagedMedia.addEventListener("click", () => {
    const chapVerses = state.lastNavResult?.chapter?.verses || {};
    const entries = Object.keys(chapVerses)
      .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
      .map((vNum) => ({ ref: `${state.book || "GEN"} ${state.chapter || 1}:${vNum}`, text: String(chapVerses[vNum] || "") }));
    const pagedHtml = buildCssPagedMediaPrintHtml({
      lang: state.lang || "es",
      book: state.book || "GEN",
      chapter: state.chapter || 1,
      verse: state.verse || 1,
      verses: entries.length > 0 ? entries : null,
      columns: state.columns || 2,
      fontPt: state.fontSizePt || 9.5,
      paper: state.paperFormat || "a4",
      duplex: state.duplex !== false,
      dir: isRtlLocale(state.lang) ? "rtl" : "ltr",
    });
    const dlFilename = resolveSafeDownloadFilename(state, { kind: "paged_media", blockNumber: stealthBlkNum });
    btnPagedMedia.setAttribute?.("data-paged-media-ready", "true");
    btnPagedMedia.setAttribute?.("data-paged-media-filename", dlFilename);
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(pagedHtml)}`;
    if (typeof targetDoc?.createElement === "function") {
      try {
        const a = targetDoc.createElement("a");
        if (a) {
          a.href = dataUrl;
          a.download = dlFilename;
          a.click?.();
        }
      } catch {
        // Non-fatal in headless DOM
      }
    }
  });
}
