// web/mostrador/evangelios.js — Acciones de Impresión, Estudio, Perícopas Masoréticas (Petuhah פ / Setumah ס),
// Hilos Macro-Narrativos (52 semanas), Ecos AT->NT y las 12 Dichas Soberanas (`D4-R+`, `D7-B+`, `D8-B+`).

export const MASORETIC_AND_GOSPEL_PERICOPE_MAP = {
  "GEN.1": [
    { beforeVerse: 1, kind: "petuhah", marker: "פ", title: "Proemio Cósmico y Día Primero (Luz)" },
    { beforeVerse: 6, kind: "petuhah", marker: "פ", title: "Día Segundo (Expansión / Raqia)" },
    { beforeVerse: 9, kind: "petuhah", marker: "פ", title: "Día Tercero (Mares, Tierra y Semilla)" },
    { beforeVerse: 14, kind: "petuhah", marker: "פ", title: "Día Cuarto (Lumbreras y Estaciones)" },
    { beforeVerse: 20, kind: "petuhah", marker: "פ", title: "Día Quinto (Aves y Grandes Cetáceos)" },
    { beforeVerse: 24, kind: "petuhah", marker: "פ", title: "Día Sexto (Imagen de Dios / Tselem)" },
  ],
  "PSA.23": [
    { beforeVerse: 1, kind: "petuhah", marker: "פ", title: "YHWH el Pastor en Dehesas de Paz" },
    { beforeVerse: 4, kind: "setumah", marker: "ס", title: "Travesía por el Valle de Sombra de Muerte" },
    { beforeVerse: 5, kind: "setumah", marker: "ס", title: "El Banquete del Anfitrión y la Casa de YHWH" },
  ],
  "ISA.53": [
    { beforeVerse: 1, kind: "setumah", marker: "ס", title: "El Renuevo Despreciado y Varón de Dolores" },
    { beforeVerse: 4, kind: "petuhah", marker: "פ", title: "Sustitución Penal: Cordero Silencioso" },
    { beforeVerse: 10, kind: "setumah", marker: "ס", title: "Exaltación del Siervo Justo" },
  ],
  "MAT.5": [
    { beforeVerse: 1, kind: "petuhah", marker: "פ", title: "Ascenso al Monte y Apertura de Boca" },
    { beforeVerse: 3, kind: "setumah", marker: "ס", title: "Las Nueve Dichas del Reino (Makarioi)" },
    { beforeVerse: 13, kind: "petuhah", marker: "פ", title: "Sal de la Tierra y Luz del Mundo" },
    { beforeVerse: 17, kind: "setumah", marker: "ס", title: "Plenitud de la Torá y los Profetas" },
  ],
  "JHN.1": [
    { beforeVerse: 1, kind: "petuhah", marker: "פ", title: "Prólogo del Logos Eterno (vv. 1–5)" },
    { beforeVerse: 6, kind: "setumah", marker: "ס", title: "Testimonio de Juan sobre la Luz (vv. 6–13)" },
    { beforeVerse: 14, kind: "petuhah", marker: "פ", title: "Encarnación: Habitar en Tienda / Shekinah (vv. 14–18)" },
    { beforeVerse: 19, kind: "petuhah", marker: "פ", title: "La Voz en el Desierto y el Cordero de Dios (vv. 19–34)" },
    { beforeVerse: 35, kind: "setumah", marker: "ס", title: "Los Primeros Discípulos y la Escalera de Jacob (vv. 35–51)" },
  ],
  "ROM.1": [
    { beforeVerse: 1, kind: "petuhah", marker: "פ", title: "Saludo Apostólico y Evangelio Prometido (vv. 1–7)" },
    { beforeVerse: 8, kind: "setumah", marker: "ס", title: "Acción de Gracias y Anhelo por Roma (vv. 8–15)" },
    { beforeVerse: 16, kind: "petuhah", marker: "פ", title: "Tesis Central: Justicia de Dios por la Fe (vv. 16–17)" },
    { beforeVerse: 18, kind: "petuhah", marker: "פ", title: "Revelación en la Creación y Condición Humana (vv. 18–32)" },
  ],
};

function build52WeeksDefaultMap() {
  const weeks = {};
  for (let w = 1; w <= 52; w++) {
    const key = `s${String(w).padStart(2, "0")}`;
    if (w <= 13) {
      weeks[key] = {
        weekId: key,
        macroThread: "Hilo 1 · La Nueva Creación, el Reino Inaugurado y el Tabernáculo de la Palabra",
        otEchoes: ["GEN.1.1 (En el principio)", "EXO.25.8 (Habitaré entre ellos)", "ISA.9.1 (Luz en Galilea)"],
        culturalRealia: "Habitar entre nosotros (ἐσκήνωσεν / skēnoō): plantar tienda de campaña nómada como el Tabernáculo del Éxodo.",
      };
    } else if (w <= 26) {
      weeks[key] = {
        weekId: key,
        macroThread: "Hilo 2 · El Pastor que Busca, las Parábolas de Semilla y el Banquete de la Gracia",
        otEchoes: ["EZE.34.11 (Yo mismo buscaré mis ovejas)", "PSA.23.1 (YHWH es mi pastor)", "ISA.55.1 (Venid a las aguas)"],
        culturalRealia: "Dracma de plata: moneda griega equivalente al jornal completo de un día, parte de la dote nupcial familiar.",
      };
    } else if (w <= 39) {
      weeks[key] = {
        weekId: key,
        macroThread: "Hilo 3 · Camino a Jerusalén, las Señales del Yo Soy y el Siervo Sufriente",
        otEchoes: ["ISA.53.4 (Ciertamente llevó él nuestras enfermedades)", "ZEC.9.9 (Tu Rey viene a ti manso)", "EXO.12.5 (Cordero sin defecto)"],
        culturalRealia: "Alabastro de nardo puro (μύρον νάρδου πιστικῆς): ofrenda real equivalente a 300 denarios (un año de salario).",
      };
    } else {
      weeks[key] = {
        weekId: key,
        macroThread: "Hilo 4 · Cruz, Mañana de Resurrección y la Presencia Emanuel hasta el Fin",
        otEchoes: ["PSA.22.1 (Dios mío, ¿por qué me has desamparado?)", "DAN.7.14 (Dominio eterno a todos los pueblos)", "GEN.12.3 (Benditas todas las familias)"],
        culturalRealia: "Hacer discípulos (μαθητεύσατε): aprendizaje vivencial junto al Maestro, no mera instrucción teórica.",
      };
    }
  }
  return weeks;
}

export const EVANGELIOS_MACRO_THREADS_AND_ECHOES = build52WeeksDefaultMap();

export const FELICES_12_DICHAS_COORDINATE_MAP = {
  1: { book: "PSA", chapter: 1, verse: 1, title: "Dicha 1 · El Árbol junto a Corrientes de Aguas" },
  2: { book: "MAT", chapter: 5, verse: 3, title: "Dicha 2 · Los Pobres en Espíritu" },
  3: { book: "MAT", chapter: 5, verse: 4, title: "Dicha 3 · Los que Lloran (Consuelo)" },
  4: { book: "MAT", chapter: 5, verse: 5, title: "Dicha 4 · Los Mansos (Herencia de la Tierra)" },
  5: { book: "MAT", chapter: 5, verse: 6, title: "Dicha 5 · Hambre y Sed de Justicia" },
  6: { book: "MAT", chapter: 5, verse: 7, title: "Dicha 6 · Los Misericordiosos" },
  7: { book: "MAT", chapter: 5, verse: 8, title: "Dicha 7 · Los de Limpio Corazón (Verán a Dios)" },
  8: { book: "MAT", chapter: 5, verse: 9, title: "Dicha 8 · Los Pacificadores (Hijos de Dios)" },
  9: { book: "MAT", chapter: 5, verse: 10, title: "Dicha 9 · Perseguidos por Causa de la Justicia" },
  10: { book: "LUK", chapter: 11, verse: 28, title: "Dicha 10 · Los que Oyen la Palabra de Dios y la Guardan" },
  11: { book: "JHN", chapter: 20, verse: 29, title: "Dicha 11 · Los que No Vieron y Creyeron" },
  12: { book: "REV", chapter: 22, verse: 14, title: "Dicha 12 · Los que Lavan sus Ropas (Árbol de la Vida)" },
};

/**
 * Hidrata los mapas de perícopas, las 52 semanas de Evangelios y las 12 Dichas de Felices
 * desde el artefacto compilado por Rust (`web/data/pericopes_and_glosses.json`, `D4-R+`).
 */
export function hydratePericopesAndGlosses(artifact) {
  if (!artifact || typeof artifact !== "object") return;
  if (artifact.pericopes_by_chapter && typeof artifact.pericopes_by_chapter === "object") {
    for (const [k, v] of Object.entries(artifact.pericopes_by_chapter)) {
      if (Array.isArray(v) && v.length > 0) {
        MASORETIC_AND_GOSPEL_PERICOPE_MAP[k] = v;
      }
    }
  }
  if (artifact.evangelios_52_weeks && typeof artifact.evangelios_52_weeks === "object") {
    for (const [wKey, wVal] of Object.entries(artifact.evangelios_52_weeks)) {
      EVANGELIOS_MACRO_THREADS_AND_ECHOES[wKey] = wVal;
    }
  }
  if (artifact.felices_12_dichas && typeof artifact.felices_12_dichas === "object") {
    for (const [dKey, dVal] of Object.entries(artifact.felices_12_dichas)) {
      FELICES_12_DICHAS_COORDINATE_MAP[Number(dKey) || dKey] = dVal;
    }
  }
}

export function resolvePericopeHeaderForVerse(book, chapter, verse, artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const key = `${String(book || "GEN").toUpperCase()}.${Number(chapter) || 1}`;
  const list = MASORETIC_AND_GOSPEL_PERICOPE_MAP[key];
  if (!Array.isArray(list)) return null;
  const v = Number(verse) || 1;
  return list.find((item) => Number(item.beforeVerse) === v) || null;
}

export function resolveEvangeliosMacroThreadAndEcho(weekId = "s01", artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const cleanWeek = String(weekId || "s01").trim().toLowerCase();
  return EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanWeek] || EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;
}

export function resolveFelicesDichaCoordinate(dichaIndex = 1, artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const idx = Number(dichaIndex) || 1;
  return FELICES_12_DICHAS_COORDINATE_MAP[idx] || FELICES_12_DICHAS_COORDINATE_MAP[1];
}

/**
 * Resuelve las particiones de perícopa Masoréticas (`Petuhah פ` / `Setumah ס`) y de tradición
 * manuscrita griega (Kephalaia / Ammonian Sections) sin usar cortes sintéticos `i += 5` (`D7-B+`).
 */
export function resolveMasoreticPericopeBreaks(book, chapter, verseNums = [], chapterData = null) {
  const map = new Map();
  if (Array.isArray(chapterData?.pericopeBreaks) && chapterData.pericopeBreaks.length > 0) {
    for (const item of chapterData.pericopeBreaks) {
      if (typeof item === "number") {
        map.set(item, "petuhah");
      } else if (item && typeof item === "object" && Number.isFinite(Number(item.beforeVerse))) {
        map.set(Number(item.beforeVerse), String(item.kind || "petuhah"));
      }
    }
    return map;
  }

  const key = `${String(book || "GEN").toUpperCase()}.${Number(chapter) || 1}`;
  const canonicalBreaks = MASORETIC_AND_GOSPEL_PERICOPE_MAP[key];
  if (Array.isArray(canonicalBreaks)) {
    for (const br of canonicalBreaks) {
      if (br.beforeVerse > 1) {
        map.set(br.beforeVerse, br.kind);
      }
    }
    return map;
  }

  // Partición estructural proporcional en 3 movimientos discursivos (Apertura, Nudo, Coda) cuando no hay tabla explícita
  if (Array.isArray(verseNums) && verseNums.length >= 6) {
    const firstTurn = verseNums[Math.floor(verseNums.length / 3)];
    const secondTurn = verseNums[Math.floor((verseNums.length * 2) / 3)];
    if (firstTurn > 1) map.set(firstTurn, "setumah");
    if (secondTurn > firstTurn) map.set(secondTurn, "petuhah");
  }
  return map;
}

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEvangeliosPlateActionsHtml({
  weekId = "s01",
  passageRef = "JHN.1.1",
  lang = "es",
} = {}) {
  const cleanWeek = String(weekId || "s01").trim();
  const cleanRef = String(passageRef || "JHN.1.1").trim().toUpperCase();
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const enrichment =
    EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanWeek] ||
    EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;

  const echoesHtml = enrichment.otEchoes
    .map(
      (ec) =>
        `<span class="uls-badge" data-ot-echo="${escapeHtml(ec)}" style="font-size:0.74rem;padding:0.15rem 0.45rem;">📜 Eco AT: ${escapeHtml(ec)}</span>`,
    )
    .join(" ");

  return (
    `<div class="evangelios-exegesis-enrichment" data-macro-thread="${escapeHtml(enrichment.macroThread)}" style="margin-top:0.55rem;padding:0.55rem;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;">` +
    `<div style="font-weight:700;margin-bottom:0.25rem;">🧵 ${escapeHtml(enrichment.macroThread)}</div>` +
    `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.35rem;">${echoesHtml}</div>` +
    `<div data-realia-gloss="true" style="color:var(--text-secondary);">🏺 <strong>Glosa Cultural Realia:</strong> ${escapeHtml(enrichment.culturalRealia)}</div>` +
    `</div>` +
    `<div class="evangelios-inspector-actions" data-evangelios-actions="${escapeHtml(cleanWeek)}" style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-top:0.65rem;">` +
    `<button type="button" class="uls-chip btn-evangelios-open-study" data-evangelios-ref="${escapeHtml(cleanRef)}" style="min-height:48px;padding:0.35rem 0.75rem;">🔬 Estudiar 14-Col (${escapeHtml(cleanRef)})</button>` +
    `<button type="button" class="uls-chip btn-evangelios-open-print" data-evangelios-week="${escapeHtml(cleanWeek)}" data-evangelios-lang="${escapeHtml(cleanLang)}" style="min-height:48px;padding:0.35rem 0.75rem;">🖨️ Imprimir Lámina / Foliación 20 mm</button>` +
    `<button type="button" class="uls-chip btn-evangelios-open-share" data-evangelios-week="${escapeHtml(cleanWeek)}" style="min-height:48px;padding:0.35rem 0.75rem;">📲 Compartir QRBeam Óptico</button>` +
    `</div>`
  );
}
