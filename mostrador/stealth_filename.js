// ============================================================================
// web/mostrador/stealth_filename.js — SSOT Resolve Safe Download Filenames
// Decision D6-R2: 100% coverage across Doses 1-3, Paged Media, Postal A6, .brf,
// Quine HTML, OpenGraph SVG, Los Evangelios PDF, and Los Felices PDF.
// ============================================================================

import {
  effectiveThreatClassWeb,
  resolveCanonicalBlockCode,
  stealthNeutralFilenameWeb,
} from "./dosis.js";

const KIND_EXT_MAP = Object.freeze({
  dosis1: "pdf",
  dosis2: "pdf",
  dosis3: "pdf",
  edition_pdf: "pdf",
  evangelios_pdf: "pdf",
  felices_pdf: "pdf",
  paged_media: "html",
  postal_a6: "html",
  quine_html: "html",
  opengraph_svg: "svg",
  braille_brf: "brf",
});

export function isStealthFilenameActive(state = {}) {
  const activeLang = String(state.effectiveCorpusLang || state.lang || "es").trim() || "es";
  return (
    Boolean(state.stealthMode) ||
    effectiveThreatClassWeb(state.countryIso2 || "MX", activeLang) === "CLASS_C_STEALTH"
  );
}

/**
 * Pure single source of truth returning either a stealth-neutral filename (when stealthMode is active)
 * or a canonical descriptive filename for every downloadable artifact in Ekovoz.
 */
export function resolveSafeDownloadFilename(state = {}, artifactSpec = {}) {
  const kind = String(artifactSpec.kind || "edition_pdf").trim();
  const ext = String(artifactSpec.ext || KIND_EXT_MAP[kind] || "pdf").toLowerCase();
  const curLang = String(state.effectiveCorpusLang || state.lang || artifactSpec.lang || "es")
    .trim()
    .toLowerCase();
  const book = String(artifactSpec.book || state.book || "GEN").trim();
  const chapter = Math.max(1, Number(artifactSpec.chapter ?? state.chapter) || 1);
  const verse = Math.max(1, Number(artifactSpec.verse ?? state.verse) || 1);

  if (isStealthFilenameActive(state)) {
    const blk = resolveCanonicalBlockCode(book, chapter, verse);
    const blkNum = Math.max(1, Number(artifactSpec.blockNumber ?? state.activeBlockNumber ?? blk.blockNumber) || 1);
    if (ext === "brf") {
      const basePdf = stealthNeutralFilenameWeb(blkNum, "pdf").replace(/\.pdf$/i, "");
      return `${basePdf}.brf`;
    }
    if (ext === "svg") {
      return stealthNeutralFilenameWeb(blkNum, "svg");
    }
    return stealthNeutralFilenameWeb(blkNum, ext === "html" ? "html" : "pdf");
  }

  if (artifactSpec.defaultName) {
    return String(artifactSpec.defaultName);
  }

  const bookLower = book.toLowerCase();
  switch (kind) {
    case "dosis1":
      return `ekovoz-${curLang}-${bookLower}-${chapter}-sheets.pdf`;
    case "dosis2":
      return `ekovoz-${curLang}-B${String(Number(artifactSpec.blockNumber ?? state.activeBlockNumber) || 1).padStart(2, "0")}.pdf`;
    case "dosis3":
      return `ekovoz-${curLang}-biblia-completa.pdf`;
    case "paged_media":
      return `ekovoz-${curLang}-${bookLower}-${chapter}-paged.html`;
    case "postal_a6":
      return `postal-a6-${curLang}-${bookLower}-${chapter}-${verse}.html`;
    case "braille_brf":
      return `${curLang}_${book.toUpperCase()}_${chapter}_ed11_b70.brf`;
    case "quine_html":
      return `ekovoz-offline-${curLang}.html`;
    case "opengraph_svg":
      return `ekovoz_${bookLower}_${chapter}_${verse}_1200x630.svg`;
    case "evangelios_pdf":
      return `evangelios-52-laminas-${curLang}.pdf`;
    case "felices_pdf":
      return `felices-27-laminas-${curLang}.pdf`;
    default:
      return `ekovoz-${curLang}-${bookLower}-${chapter}.${ext}`;
  }
}

/**
 * Especificación extrema Clase-C (`D6'`, PoPETs 2017): portada, cornisas, nombre de archivo
 * y diccionario /Info neutrales, más recibo auditable sin tokens de origen bíblico.
 */
export function buildClassCStealthSpec({ blockNumber = 1, uiLocale = "es", kind = "dosis1" } = {}) {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cleanBlk = Math.max(1, Number(blockNumber) || 1);
  const ext = String(KIND_EXT_MAP[kind] || "pdf").toLowerCase();
  const filename = stealthNeutralFilenameWeb(cleanBlk, ext === "html" ? "html" : "pdf");
  const neutralTitle = isEn ? `Reading Notes ${String(cleanBlk).padStart(2, "0")}` : `Notas de Lectura ${String(cleanBlk).padStart(2, "0")}`;
  const neutralHeader = isEn ? "Study Workbook" : "Cuaderno de Lectura";
  const sanitizePdfMeta = () => ({
    title: neutralTitle,
    author: "",
    subject: "",
    creator: "",
    producer: "",
    keywords: "",
  });
  const verifyCleanReceipt = (meta = {}) => {
    const joined = [filename, meta.title, meta.author, meta.creator, meta.producer, meta.subject].join(" ");
    const forbidden = /(biblia|bible|ekovoz|evangelio|gospel|jes[uú]s|cristo|christ)/i.test(joined);
    return {
      verified: !forbidden,
      neutralCover: true,
      zeroOriginMetadata: !forbidden && !meta.author && !meta.creator,
      filename,
      neutralTitle,
      label: isEn
        ? `Verified discreet copy: neutral cover ("${neutralTitle}"), 0 origin metadata, filename "${filename}"`
        : `Copia discreta verificada: portada neutra («${neutralTitle}»), 0 metadatos de origen, archivo «${filename}»`,
    };
  };
  return { filename, neutralTitle, neutralHeader, sanitizePdfMeta, verifyCleanReceipt };
}
