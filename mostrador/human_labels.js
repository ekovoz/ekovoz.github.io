// ============================================================================
// web/mostrador/human_labels.js — Capa L0 Pura de Humanización Filológica
// Decisión D9-R5 (9A) · SLICE-R5-10: Diccionario puro sin dependencias DOM/Store
// (LCOM4 = 1, out_deg = 0). Erradica fugas INV-ERG-20 en nodos primarios.
// ============================================================================

const HUMAN_PHILOLOGY_LABELS = Object.freeze({
  LXX_VG_MT: Object.freeze({
    es: "Comparación de manuscritos antiguos (Hebreo, Griego y Vulgata)",
    en: "Ancient manuscript comparison (Hebrew, Greek & Vulgate)",
  }),
  KETIV_QERE: Object.freeze({
    es: "Nota de lectura tradicional",
    en: "Traditional reading note",
  }),
  VERSIFICATION: Object.freeze({
    es: "Diferencia de numeración entre biblias",
    en: "Verse numbering difference",
  }),
  TR_SUPPLEMENT: Object.freeze({
    es: "Frase conservada en tradición bizantina",
    en: "Phrase preserved in Byzantine tradition",
  }),
  SURFACE_VARIANT: Object.freeze({
    es: "Variante de redacción superficial",
    en: "Surface wording variant",
  }),
  UNMATCHED: Object.freeze({
    es: "Expresión pendiente de enlace directo",
    en: "Phrase awaiting direct link",
  }),
  SRGNT: Object.freeze({
    es: "Texto griego fuente",
    en: "Greek source text",
  }),
  TAGNT: Object.freeze({
    es: "Texto griego anotado",
    en: "Annotated Greek text",
  }),
  WLC: Object.freeze({
    es: "Texto hebreo fuente",
    en: "Hebrew source text",
  }),
  TAHOT: Object.freeze({
    es: "Texto hebreo anotado",
    en: "Annotated Hebrew text",
  }),
  "NSM-65": Object.freeze({
    es: "Sentido básico universal",
    en: "Universal core meaning",
  }),
  ECO1: Object.freeze({
    es: "Transferencia óptica compacta",
    en: "Compact optical transfer",
  }),
  ECOM: Object.freeze({
    es: "Enlace óptico multiparte",
    en: "Multi-part optical link",
  }),
  "TRILITERAL-SEMITIC": Object.freeze({
    es: "Raíz consonántica semítica",
    en: "Semitic consonantal root",
  }),
  "0 BYTES AUDIO": Object.freeze({
    es: "Lectura ligera sin audio",
    en: "Lightweight text-only guide",
  }),
  PASS: Object.freeze({
    es: "Verificado",
    en: "Verified",
  }),
  "OFFLINE FONT PACK": Object.freeze({
    es: "Fuentes para lectura sin conexión",
    en: "Offline reading fonts",
  }),
  SUBCLADES: Object.freeze({
    es: "Subfamilias lingüísticas",
    en: "Language subfamilies",
  }),
  CC0: Object.freeze({
    es: "Dominio público abierto",
    en: "Open public domain",
  }),
});

export function humanizeTechnicalCode(rawCode, uiLocale = "es") {
  const clean = String(rawCode || "").trim();
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  if (!clean) return isEn ? "Manuscript note" : "Nota textual";
  const upper = clean.toUpperCase();
  const direct = HUMAN_PHILOLOGY_LABELS[upper] || HUMAN_PHILOLOGY_LABELS[clean];
  if (direct) return isEn ? direct.en : direct.es;
  return isEn ? "Manuscript variant note" : "Nota de tradición textual";
}
