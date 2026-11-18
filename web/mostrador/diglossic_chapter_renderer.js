// ============================================================================
// web/mostrador/diglossic_chapter_renderer.js — Costura Limpia ∂(C) = 0 (SLICE-EKO-V2G-06 / 11 / 20)
// Proyección Diglósica de 2 Estratos Progresivos (D8-V2G / ARB-EKOVOZ-97) y Clasificador Honesto Tier 0/1/2/3/4 (D2-V2G).
// - Elimina `rawMatrixRows.slice(0, 64)` (`DEBRIS-V2G-16` erradicado): proyecta el 100% de los versículos (ej. 176 en Salmo 119).
// - Elimina el disfraz `TIER_4_GMIS_CELF250` para lenguas abiertas Tier 1 (`DEBRIS-V2G-03` erradicado).
// - Garantiza 1 sola pasada DOM canónica por navegación mediante firma determinista `computeViewportRenderSignature`.
// ============================================================================

import {
  REGIONAL_BRIDGE_LANGUAGES_10,
  escapeHtml,
  resolveRegionalBridgeLanguage21,
} from "./bridge_and_chapter.js";
import { STATUS } from "./data_layer.js";

const TIER0_AUTOGRAPH_LANGS = new Set(["he", "hbo", "heb", "grc", "el"]);

const OPEN_CANONICAL_TIER1_LANGS = new Set([
  "es",
  "es-1909",
  "en",
  "ar",
  "zh-hans",
  "zh",
  "fr",
  "pt",
  "ru",
  "hi",
  "bn",
  "ur",
  "fa",
  "id",
  "tr",
  "it",
  "ja",
  "ko",
  "sw",
  "de",
]);

/**
 * Determina con honestidad epistémica si el capítulo cargado pertenece a un testigo `Tier 0` o Biblia humana abierta `Tier 1` (`D2-V2G`).
 */
export function isVerifiedCanonicalTier0Or1(langCode, navResult = null) {
  const norm = String(langCode || "").trim().toLowerCase();
  if (TIER0_AUTOGRAPH_LANGS.has(norm)) return true;
  const provTier = String(navResult?.chapter?.provenance?.sovereign_tier || "");
  if (
    navResult?.status === STATUS.READY &&
    (provTier === "tier0_autograph_witness" || provTier === "tier1_canonical_human_66")
  ) {
    return true;
  }
  return navResult?.status === STATUS.READY && OPEN_CANONICAL_TIER1_LANGS.has(norm);
}

/**
 * Clasifica el nivel soberano real prohibiendo disfrazar lenguas humanas `Tier 1` como `TIER_4_GMIS_CELF250` (`DEBRIS-V2G-03`).
 */
export function resolveHonestSovereignTier({
  lang = "es",
  navStatus = STATUS.READY,
  provenance = null,
  catalogEntry = null,
} = {}) {
  const norm = String(lang || "").trim().toLowerCase();
  if (TIER0_AUTOGRAPH_LANGS.has(norm)) {
    return "TIER_0_AUTOGRAPH_WITNESS";
  }
  const provTier = String(provenance?.sovereign_tier || "");
  if (provTier === "tier1_canonical_human_66") {
    return "TIER_1_OPEN_CANONICAL_66";
  }
  if (provTier === "tier2_nt_human_ot_synthesized" || norm === "stp") {
    return "TIER_2_NT_PLUS_OT_SYNTH";
  }
  if (OPEN_CANONICAL_TIER1_LANGS.has(norm)) {
    return navStatus === STATUS.READY
      ? "TIER_1_OPEN_CANONICAL_66"
      : "TIER_1_PACK_UNREACHABLE";
  }
  const catTier = String(catalogEntry?.sovereign_tier || "");
  if (catTier === "TIER_1_OPEN_CANONICAL_66") {
    return navStatus === STATUS.READY
      ? "TIER_1_OPEN_CANONICAL_66"
      : "TIER_1_PACK_UNREACHABLE";
  }
  if (navStatus === STATUS.UNAVAILABLE) {
    return "TIER_4_GMIS_CELF250";
  }
  return catTier || "TIER_3_PORTION_LADDER";
}

/**
 * Mapea el 100% de las filas morfosemánticas del capítulo sin truncamiento (`0` `.slice(0, 64)` — cubre 1..176 en Salmo 119).
 */
export function mapFullChapterGmisRows(rawMatrixRows = []) {
  if (!Array.isArray(rawMatrixRows) || rawMatrixRows.length === 0) return [];
  const out = new Array(rawMatrixRows.length);
  for (let i = 0; i < rawMatrixRows.length; i += 1) {
    const r = rawMatrixRows[i];
    out[i] = Array.isArray(r)
      ? {
          verse: Number(r[0]) || 1,
          c05_orig_text: r[1] ?? "∅",
          c08_morph_code: r[4] ?? "∅",
          c13_nsm_65: r[11] ?? "∅",
        }
      : r;
  }
  return out;
}

/**
 * Renderiza el Puente Diglósico en 2 estratos progresivos (`D8-V2G` / `ARB-EKOVOZ-97`, ventana sacádica de Rayner 1998 `< 8 ms`):
 * - Estrato 1 (Foveal por defecto, 2 líneas con `content-visibility: auto`): lectura limpia sin sobrecarga cognitiva.
 * - Estrato 2 (Morfológico Leipzig de 4 líneas `L1..L4` bajo demanda): expandido automáticamente en el versículo seleccionado o en `register === "estudio"`.
 */
function normalizeVersesToKeyMap(rawVerses) {
  if (!rawVerses) return {};
  if (Array.isArray(rawVerses)) {
    const out = {};
    for (let i = 0; i < rawVerses.length; i += 1) {
      const item = rawVerses[i];
      if (item && typeof item === "object") {
        const vn = Number(item.start ?? item.verse ?? i + 1);
        if (vn > 0 && item.text !== undefined) out[String(vn)] = String(item.text);
      } else if (typeof item === "string") {
        out[String(i + 1)] = item;
      }
    }
    return out;
  }
  if (typeof rawVerses === "object") return rawVerses;
  return {};
}

export function renderProgressiveTwoStrataDiglossicBridge({
  lang = "stp",
  book = "GEN",
  chapter = 1,
  selectedVerse = 1,
  register = "intergeneracional",
  sovereignTier = "TIER_2_NT_PLUS_OT_SYNTH",
  macroRegion = 1,
  bridgeLang = "",
  maternalVerses = {},
  bridgeVerses = {},
  gmisRows = [],
  celfPrompt = "",
} = {}) {
  const matMap = normalizeVersesToKeyMap(maternalVerses);
  const brMap = normalizeVersesToKeyMap(bridgeVerses);
  const cleanBook = String(book || "GEN").trim().toUpperCase();
  const cleanChap = Number(chapter) || 1;
  const selV = Math.max(1, Number(selectedVerse) || 1);
  const expandAllLeipzig = String(register || "").toLowerCase() === "estudio";
  const ntBooks = new Set([
    "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL",
    "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
  ]);
  const isNt = ntBooks.has(cleanBook);
  const regionalSlot = REGIONAL_BRIDGE_LANGUAGES_10[macroRegion] || REGIONAL_BRIDGE_LANGUAGES_10[1];
  const bridgeSpec = resolveRegionalBridgeLanguage21({
    macroRegion,
    bridgeLang: bridgeLang || regionalSlot?.code || "",
  });

  const gmisByVerse = new Map();
  for (const r of Array.isArray(gmisRows) ? gmisRows : []) {
    const vn = Number(r?.verse) || 1;
    if (!gmisByVerse.has(vn)) gmisByVerse.set(vn, []);
    gmisByVerse.get(vn).push(r);
  }

  const verseSet = new Set([
    ...Object.keys(matMap).map((k) => Number(k)),
    ...Object.keys(brMap).map((k) => Number(k)),
    ...Array.from(gmisByVerse.keys()),
  ]);
  const verseNums = Array.from(verseSet)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (verseNums.length === 0) verseNums.push(1);

  const isHumanMaternalPortion =
    sovereignTier === "TIER_0_AUTOGRAPH_WITNESS" ||
    sovereignTier === "TIER_1_OPEN_CANONICAL_66" ||
    (sovereignTier === "TIER_2_NT_PLUS_OT_SYNTH" && isNt) ||
    (sovereignTier === "TIER_3_PORTION_LADDER" && Object.keys(matMap).length > 0);

  const sealCode = isHumanMaternalPortion
    ? "VERIFIED_MATERNAL_PORTION_PLUS_BRIDGE_21"
    : sovereignTier === "TIER_4_GMIS_CELF250"
      ? "GMIS_4LINE_CELF250_SCAFFOLD_PLUS_BRIDGE_21"
      : sovereignTier === "TIER_1_PACK_UNREACHABLE"
        ? "TIER1_OPEN_PACK_OFFLINE_NOTICE"
        : "OT_INTERLINEAR_SCAFFOLD_PLUS_BRIDGE_21";

  const rowsHtml = new Array(verseNums.length);
  for (let i = 0; i < verseNums.length; i += 1) {
    const vNum = verseNums[i];
    const osis = `${cleanBook}.${cleanChap}.${vNum}`;
    const matTxt = String(matMap[String(vNum)] || "").trim();
    const brTxt = String(brMap[String(vNum)] || "").trim();
    const isExpanded = expandAllLeipzig || vNum === selV;

    const isSelected = vNum === selV;
    let leftCellHtml = "";
    if (isHumanMaternalPortion && matTxt) {
      leftCellHtml = `<div class="mostrador-verse bible-verse-line${isSelected ? " is-selected" : ""} diglossic-maternal-human" data-verse="${vNum}" data-osis="${escapeHtml(osis)}" data-maternal-stratum="HUMAN_VERIFIED" data-stratum="1-foveal"><sup>${vNum}</sup> ${escapeHtml(matTxt)}</div>`;
    } else {
      const vRows = gmisByVerse.get(vNum) || [];
      const l1 =
        vRows.map((x) => escapeHtml(x.c05_orig_text || x.morph || "—")).join(" · ") ||
        escapeHtml(matTxt || `— (${osis})`);
      const l2 =
        vRows.map((x) => escapeHtml(x.c08_morph_code || x.leipzig || "GLOSA")).join(" · ") ||
        "Morfología Leipzig";
      const l3 = vRows.map((x) => escapeHtml(x.c13_nsm_65 || "ALGUIEN / DECIR")).join(" · ");
      const openAttr = isExpanded ? " open" : "";
      leftCellHtml =
        `<details class="diglossic-gmis-4line" data-maternal-stratum="GMIS_SCAFFOLD" data-gmis-lines="4" data-stratum="2-leipzig"${openAttr}>` +
        `<summary class="mostrador-verse bible-verse-line${isSelected ? " is-selected" : ""} diglossic-foveal-summary" data-verse="${vNum}" data-osis="${escapeHtml(osis)}" data-stratum="1-foveal"><sup>${vNum}</sup> ${escapeHtml(matTxt || l3 || `[Semilla ${osis}]`)}</summary>` +
        `<div data-gmis-line="1"><strong>L1 Original/Morfemas:</strong> ${l1}</div>` +
        `<div data-gmis-line="2"><strong>L2 Glosa Leipzig:</strong> ${l2}</div>` +
        `<div data-gmis-line="3"><strong>L3 NSM-65:</strong> ${l3}</div>` +
        `<div data-gmis-line="4"><strong>L4 CELF-250 (${escapeHtml(lang)}):</strong> ${escapeHtml(celfPrompt || `Semilla submodular para ${osis}`)}</div>` +
        `</details>`;
    }

    const rightCellHtml =
      `<div class="diglossic-bridge-21" data-bridge-lang="${escapeHtml(bridgeSpec.code)}" data-stratum="1-foveal">` +
      `<sup>${vNum}</sup> ${escapeHtml(brTxt || `[Puente ${bridgeSpec.code.toUpperCase()} ${osis}]`)}` +
      `</div>`;

    rowsHtml[i] =
      `<div class="diglossic-parallel-row" data-verse="${vNum}" data-osis="${escapeHtml(osis)}" style="content-visibility:auto;contain-intrinsic-size:0 48px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0.75rem;padding:0.45rem 0;border-bottom:1px solid var(--card-border);">` +
      leftCellHtml +
      rightCellHtml +
      `</div>`;
  }

  const gmisScaffoldAttr = sovereignTier === "TIER_4_GMIS_CELF250" ? ' data-gmis-scaffold="true"' : "";
  return (
    `<section class="diglossic-parallel-bridge" data-diglossic-bridge="true"${gmisScaffoldAttr} data-progressive-strata="2" data-total-verses="${verseNums.length}" data-lang="${escapeHtml(lang)}" data-bridge-lang="${escapeHtml(bridgeSpec.code)}" data-sovereign-tier="${escapeHtml(sovereignTier)}" data-epistemic-seal="${sealCode}" data-epistemic-honesty="ZERO_SYNTHETIC_BIBLE">` +
    `<header class="diglossic-bridge-header" style="display:flex;justify-content:space-between;gap:0.5rem;padding:0.4rem 0.6rem;border-radius:8px;background:var(--bg-secondary);font-size:0.78rem;margin-bottom:0.5rem;">` +
    `<span><strong>Columna Materna (<code>${escapeHtml(lang)}</code>):</strong> ${isHumanMaternalPortion ? "Porción Humana Verificada" : "Andamiaje Interlineal Honesto GMIS + CELF-250 (0% Falsa Biblia)"}</span>` +
    `<span><strong>Lengua Puente Siglo XXI (<code>${escapeHtml(bridgeSpec.code)}</code>):</strong> ${escapeHtml(bridgeSpec.label)}</span>` +
    `</header>` +
    rowsHtml.join("\n") +
    `</section>`
  );
}

/**
 * Firma determinista del estado visual del lienzo para garantizar una única escritura DOM por navegación (`D8-V2G`).
 */
export function computeViewportRenderSignature(state, effectiveLang) {
  const res = state?.lastNavResult;
  const overlayLen = Array.isArray(state?.liveCascadeOverlays) ? state.liveCascadeOverlays.length : 0;
  const verifiedOverlayCount =
    state?.verifiedOverlaysByOsis && typeof state.verifiedOverlaysByOsis === "object"
      ? Object.keys(state.verifiedOverlaysByOsis).length
      : 0;
  const overlayTopRev =
    overlayLen > 0
      ? String(state.liveCascadeOverlays[overlayLen - 1]?.patchId || state.liveCascadeOverlays[overlayLen - 1]?.hlc || overlayLen)
      : "0";
  return [
    state?.book || "",
    state?.chapter || 0,
    state?.verse || 1,
    effectiveLang || "",
    state?.lang || "",
    state?.register || "",
    state?.rollMode || "",
    state?.orthographyProfile || "",
    state?.oralPorticoActive ? "1" : "0",
    state?.uiLocale || "",
    res?.status || "",
    res?.corpusRev || res?.chapter?.corpusRev || "",
    (state?.lastDiglossicBridgeHtml || "").length,
    (state?.lastMatrixFallbackHtml || "").length,
    overlayLen,
    verifiedOverlayCount,
    state?.overlayRevision || 0,
    overlayTopRev,
  ].join("|");
}
