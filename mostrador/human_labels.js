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
  TOKEN: Object.freeze({
    es: "Palabra",
    en: "Word",
  }),
  "CRDT WAL": Object.freeze({
    es: "Registro de revisiones",
    en: "Revision history log",
  }),
  "MACRO-TANDA": Object.freeze({
    es: "Bloque completo de impresión",
    en: "Full print bundle",
  }),
  "SAUVOLA K=0.25": Object.freeze({
    es: "Nitidez para fotocopias",
    en: "Photocopy legibility boost",
  }),
  SAUVOLA: Object.freeze({
    es: "Nitidez de fotocopia",
    en: "Photocopy clarity",
  }),
  CPL: Object.freeze({
    es: "Caracteres por línea",
    en: "Characters per line",
  }),
  "8/8 PASS": Object.freeze({
    es: "8 controles de calidad aprobados",
    en: "8 quality checks passed",
  }),
  "BERNA 15.3": Object.freeze({
    es: "Sello público de autoría abierta",
    en: "Public open-authorship seal",
  }),
  "14+2": Object.freeze({
    es: "16 ediciones listas para imprimir",
    en: "16 print-ready editions",
  }),
  RUNG1SWADESHANDNSM65: Object.freeze({
    es: "Nivel 1 · Vocabulario básico",
    en: "Stage 1 · Core words",
  }),
  "CELF-250": Object.freeze({
    es: "Revisión comunitaria (250 versículos)",
    en: "Community review (250 verses)",
  }),
  "CHRF++": Object.freeze({
    es: "Calibración de fidelidad textual",
    en: "Text fidelity calibration",
  }),
  "CRC-16": Object.freeze({
    es: "Verificación de integridad de audio",
    en: "Audio integrity check",
  }),
  "MATRIX_TIER0.EKPACK": Object.freeze({
    es: "Texto fuente original (15 columnas)",
    en: "Original study text (15 columns)",
  }),
  "BRIDGE: AUTO": Object.freeze({
    es: "Puente: Automático",
    en: "Bridge: Auto",
  }),
  "BÓVEDA PRO": Object.freeze({
    es: "Bóveda y verificación",
    en: "Vault & verification",
  }),
  UBS: Object.freeze({
    es: "Ediciones textuales internacionales",
    en: "International textual editions",
  }),
  QRSTREAMSESION: Object.freeze({
    es: "Receptor óptico por cámara",
    en: "Optical camera receiver",
  }),
  QRSTREAMSESSION: Object.freeze({
    es: "Receptor óptico por cámara",
    en: "Optical camera receiver",
  }),
  SAUVOLA_KANUNGO: Object.freeze({
    es: "Calibración de nitidez en copias",
    en: "Photocopy legibility check",
  }),
  OPENTIMESTAMPS: Object.freeze({
    es: "Sello público de fecha e integridad",
    en: "Public date & integrity seal",
  }),
  SBLGNT: Object.freeze({
    es: "Texto griego fuente",
    en: "Greek source text",
  }),
  "01_UTO_AZTECAN": Object.freeze({
    es: "Familia lingüística Uto-Azteca",
    en: "Uto-Aztecan language family",
  }),
});

export function isExpertVocabularyEnabled(searchStr = "") {
  return /(?:^|[?&])expert=1(?:&|$)/i.test(String(searchStr || ""));
}

/**
 * Política de copy consciente del plano (`SLICE-EKO-HIG13-19..20`): cero jerga dev en Lectura, trazabilidad completa en Estudio Pro.
 */
export function formatCopyForSurfacePlane(editorialCopy = "", technicalCopy = "", stateOrSearch = null) {
  const isTech = typeof stateOrSearch === "string"
    ? /(?:^|[?&])(?:mode=studio|expert=1)(?:&|$)/i.test(stateOrSearch)
    : Boolean(stateOrSearch?.surfacePlane === "technical" || stateOrSearch?.workspaceMode === "studio");
  return isTech ? String(technicalCopy ?? editorialCopy ?? "") : String(editorialCopy ?? technicalCopy ?? "");
}

export function humanizeTechnicalCode(rawCode, uiLocale = "es") {
  const clean = String(rawCode || "").trim();
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  if (!clean) return isEn ? "Manuscript note" : "Nota textual";
  const upper = clean.toUpperCase();
  const direct = HUMAN_PHILOLOGY_LABELS[upper] || HUMAN_PHILOLOGY_LABELS[clean];
  if (direct) return isEn ? direct.en : direct.es;
  return isEn ? "Manuscript variant note" : "Nota de tradición textual";
}

/**
 * Normaliza etiquetas visibles en DOM para erradicar fugas técnicas INV-ERG-20 en los renderizadores.
 */
export function humanizeUiCopy(rawText, uiLocale = "es", { allowExpert = false } = {}) {
  const src = String(rawText ?? "");
  if (!src || allowExpert) return src;
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const replacements = [
    [/\bPrimitivos Semánticos Universales NSM-65\b/gi, isEn ? "Universal Core Meanings" : "Sentido básico universal"],
    [/\bUniversal Semantic Primitives NSM-65\b/gi, "Universal Core Meanings"],
    [/\bNSM-65\b/gi, isEn ? "Core meaning" : "Sentido básico"],
    [/\bCELF-250\b/gi, isEn ? "250-step community guide" : "Guía comunitaria (250 pasos)"],
    [/\bQrStreamSession\b/gi, isEn ? "Optical camera link" : "Enlace óptico por cámara"],
    [/\bBerna 15\.3\b/gi, isEn ? "open-authorship verification" : "verificación abierta de autoría"],
    [/\bBerne 15\.3\b/gi, "open-authorship verification"],
    [/\bMacro-Tanda\s*(?:MT-\d+)?\b/gi, isEn ? "Print bundle" : "Paquete de impresión"],
    [/\((?:6\s+Tradiciones Textuales\s*)?UBS\)/gi, isEn ? "(Historical Manuscript Traditions)" : "(Tradiciones Textuales Históricas)"],
    [/\bUBS\b/g, isEn ? "Historical Editions" : "Ediciones Históricas"],
    [/\bOpenTimestamps\b/gi, isEn ? "public integrity records" : "sellos públicos de fecha"],
    [/\b01_UTO_AZTECAN\b/gi, isEn ? "Uto-Aztecan language family" : "Familia lingüística Uto-Azteca"],
    [/\bSauvola \+ Kanungo\b/gi, isEn ? "photocopy clarity model" : "simulación de fotocopia rural"],
    [/\bNT\+Taller OT\b/gi, isEn ? "NT verified + OT workbook" : "NT verificado + taller AT"],
    [/\bWLC\b/g, isEn ? "Hebrew source" : "Hebreo fuente"],
    [/\bSBLGNT\b/g, isEn ? "Greek source" : "Griego fuente"],
    [/\bTaller comunitario OT\b/gi, isEn ? "OT community workshop" : "Taller comunitario AT"],
    [/\b8\/8 PASS\b/g, isEn ? "8/8 checks verified" : "8/8 controles verificados"],
    [/\bPASS\b/g, isEn ? "Verified" : "Verificado"],
    [/Sistemático\s*1\/16\s*·\s*Paridad\s*0/gi, isEn ? "Safe optical transfer · block 1/16" : "Transferencia óptica segura · bloque 1/16"],
    [/(\d+)\s*WPM\b/gi, isEn ? "$1 WPM" : "$1 ppm"],
    [/\bBridge\s*\(([a-zA-Z-]+)\)/g, (_, code) => (isEn ? `Bridge (${String(code).toUpperCase()})` : `Lengua puente (${String(code).toLowerCase()})`)],
    [/\bJSONL\s*\/\s*SHA-256\b/gi, isEn ? "Signed audit log" : "Bitácora verificada"],
    [/\bL2 Glosa lingüística:\s*HR\/Ncfsa\b/gi, isEn ? "Grammatical detail in Study" : "Detalle gramatical en Estudiar"],
    [/\bPRIM:\s*/gi, isEn ? "Core meaning: " : "Sentido básico: "],
    [/\s*\(?0 Bytes Audio\)?/gi, ""],
    [/\bB01\s*[·:]\s*/g, ""],
    [/\bEipen\s*L\s*=\s*[\d.,]+/gi, isEn ? "Contemporary flow" : "Fluidez actual"],
    [/\bAoA\s*=\s*[\d.,]+/gi, isEn ? "Everyday vocabulary" : "Vocabulario cotidiano"],
    [/\bMDD\s*=\s*[\d.,]+/gi, isEn ? "Clear sentence structure" : "Oración directa"],
    [/\bPrev\s*=\s*[\d.,]+/gi, isEn ? "Common usage" : "Uso frecuente"],
    [/\bProtestantKjv\b/gi, isEn ? "Standard 66-book edition" : "Edición clásica (66 libros)"],
    [/\bASJP\s*LDND\b/gi, isEn ? "Shared lexical roots" : "Raíces compartidas"],
    [/\bCLDF\b/g, isEn ? "Open word-list package" : "Glosario abierto"],
  ];
  let out = src;
  for (const [rx, sub] of replacements) {
    out = out.replace(rx, sub);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

const HUMAN_METRIC_LABELS = Object.freeze({
  eipen: Object.freeze({ es: "Fluidez contemporánea", en: "Contemporary reading flow" }),
  eipen_l: Object.freeze({ es: "Fluidez contemporánea", en: "Contemporary reading flow" }),
  aoa: Object.freeze({ es: "Edad natural de vocabulario", en: "Natural word age" }),
  mdd: Object.freeze({ es: "Cercanía gramatical", en: "Sentence directness" }),
  prev: Object.freeze({ es: "Uso cotidiano", en: "Everyday usage" }),
  prevalence: Object.freeze({ es: "Uso cotidiano", en: "Everyday usage" }),
  cldf: Object.freeze({ es: "Glosario abierto", en: "Open word-list package" }),
  asjp: Object.freeze({ es: "Raíces compartidas", en: "Shared lexical roots" }),
  b01: Object.freeze({ es: "Edición principal", en: "Standard edition" }),
});

export function formatHumanMetricLabel(metricKey = "", rawValue = "", uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const key = String(metricKey || "").trim().toLowerCase();
  const entry = HUMAN_METRIC_LABELS[key] || { es: "Indicador editorial", en: "Editorial indicator" };
  const title = isEn ? entry.en : entry.es;
  const valStr = String(rawValue ?? "").trim();
  return valStr ? `${title}: ${valStr}` : title;
}

export function formatEditorialTraditionLabel(traditionKey = "", uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const clean = String(traditionKey || "").trim();
  const norm = clean.toLowerCase();
  if (norm === "protestantkjv" || norm === "protestant" || norm === "protestant-66") {
    return isEn ? "Standard 66-book edition" : "Edición clásica (66 libros)";
  }
  if (norm === "catholic" || norm === "lxx") {
    return isEn ? "Greek heritage canon" : "Canon griego histórico";
  }
  if (norm === "orthodox") {
    return isEn ? "Eastern historical canon" : "Canon histórico oriental";
  }
  return clean || (isEn ? "Complete Biblical canon" : "Canon bíblico completo");
}

export function formatIsoLangPillBadge(langCode = "", label = "", { prefix = "" } = {}) {
  const iso = String(langCode || "").trim().toUpperCase();
  const tag = iso ? `<span class="ek-iso-tag">${iso}</span>` : "";
  const pre = prefix ? `${prefix} ` : "";
  return `${pre}${tag}${String(label || "").trim()}`.trim();
}

const SAUVOLA_STEP_LABELS = Object.freeze({
  "1_GRAYSCALE_LUMINANCE": Object.freeze({ es: "1. Contraste y escala de grises", en: "1. Grayscale contrast balance" }),
  "2_BILATERAL_EDGE_FILTER": Object.freeze({ es: "2. Definición nítida de letras", en: "2. Crisp glyph edge preservation" }),
  "2_INTEGRAL_SAUVOLA_THRESHOLD": Object.freeze({ es: "2. Umbral adaptativo de papel", en: "2. Adaptive paper thresholding" }),
  "3_INTEGRAL_IMAGE_MOMENTS": Object.freeze({ es: "3. Balance local de luz y papel", en: "3. Local light & paper balance" }),
  "3_DESPECKLE_CONTOUR_FILTER": Object.freeze({ es: "3. Limpieza de manchas e impresor", en: "3. Ink speckle cleanup" }),
  "4_SAUVOLA_LOCAL_THRESHOLD": Object.freeze({ es: "4. Separación limpia de tinta y fondo", en: "4. Clean ink-to-paper separation" }),
  "4_BILATERAL_HALO_PRESERVATION": Object.freeze({ es: "4. Definición nítida de letras", en: "4. Crisp glyph edge preservation" }),
  "5_EULER_TOPOLOGY_GUARD": Object.freeze({ es: "5. Verificación de trazos cerrados", en: "5. Closed-stroke legibility guard" }),
});

export function formatSauvolaStepLabel(stepCode = "", uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const key = String(stepCode || "").trim().toUpperCase();
  const hit = SAUVOLA_STEP_LABELS[key];
  if (hit) return isEn ? hit.en : hit.es;
  return key.replace(/^\d+_/, "").replace(/_/g, " ").toLowerCase();
}

export function formatVaultEditionMetadata(pack = {}, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const lang = String(pack?.lang || pack?.code || "es").trim();
  const defaultBooks = lang.toLowerCase() === "stp" ? 27 : 66;
  const booksCount = Number(pack?.booksCount || pack?.books || defaultBooks);
  const labelMap = { es: "Español", "es-1909": "Español (1909)", en: "English", pt: "Português", fr: "Français", de: "Deutsch", it: "Italiano", he: "עברית", grc: "Ελληνικά", stp: "O'dam (Tepehuano)" };
  const langName = labelMap[lang.toLowerCase()] || lang.toUpperCase();
  const scope = (lang.toLowerCase() === "stp" && booksCount <= 27)
    ? (isEn ? `${booksCount} books (NT)` : `${booksCount} libros (NT)`)
    : (booksCount >= 66 ? (isEn ? "66 books" : "66 libros") : `${booksCount} ${isEn ? "books" : "libros"}`);
  const note = pack?.subsettedBiblical ? (isEn ? "embedded script fonts" : "fuentes incluidas") : (isEn ? "ready offline" : "lista sin conexión");
  return `${langName} · ${scope} · ${note}`;
}

export function formatOpticalStreamCaption(metrics = {}, uiLocale = "es") {
  const isEn = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  const cur = Number(metrics?.currentFrame ?? 0);
  const tot = Math.max(1, Number(metrics?.totalFrames ?? 1));
  const bytes = Number(metrics?.bytes ?? 0);
  const sizeStr = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  return isEn ? `Transferring packet ${cur} of ${tot} (${sizeStr})` : `Transmitiendo bloque ${cur} de ${tot} (${sizeStr})`;
}
