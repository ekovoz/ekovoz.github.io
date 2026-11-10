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

export const FELICES_28_PLATES_MAP = {};

/**
 * Hidrata los mapas de perícopas, las 52 semanas de Evangelios y las 12 Dichas / 28 Láminas de Felices
 * desde el artefacto compilado por Rust (`web/data/pericopes_and_glosses.json`, `D3-C+`, `ARB-EKOVOZ-62`).
 */
export function hydratePericopesAndGlosses(artifact) {
  if (!artifact || typeof artifact !== "object") return false;
  const rawPericopes =
    artifact.masoretic_and_gospel_pericopes ||
    artifact.pericopes_by_chapter ||
    artifact.chapter_pericopes;
  if (rawPericopes && typeof rawPericopes === "object") {
    for (const [k, v] of Object.entries(rawPericopes)) {
      if (Array.isArray(v) && v.length > 0) {
        MASORETIC_AND_GOSPEL_PERICOPE_MAP[k] = v.map((item) => ({
          beforeVerse: Number(item.beforeVerse ?? item.startVerse ?? 1) || 1,
          startVerse: Number(item.startVerse ?? item.beforeVerse ?? 1) || 1,
          kind: String(item.kind || item.markerType || "petuhah").toLowerCase().includes("setum")
            ? "setumah"
            : "petuhah",
          marker: item.marker || "פ",
          title: item.title || "",
          synopticParallel: item.synopticParallel || "",
        }));
      }
    }
  }
  if (artifact.evangelios_52_weeks && typeof artifact.evangelios_52_weeks === "object" && !Array.isArray(artifact.evangelios_52_weeks)) {
    for (const [wKey, wVal] of Object.entries(artifact.evangelios_52_weeks)) {
      EVANGELIOS_MACRO_THREADS_AND_ECHOES[wKey] = wVal;
    }
  }
  const rawMacroThreads = Array.isArray(artifact.evangelios_macro_threads)
    ? artifact.evangelios_macro_threads
    : Array.isArray(artifact.evangelios_52_weeks)
      ? artifact.evangelios_52_weeks
      : null;
  if (rawMacroThreads && rawMacroThreads.length > 0) {
    for (const entry of rawMacroThreads) {
      const wNum = Number(entry.weekNumber ?? entry.week) || 1;
      const wKey = `s${String(wNum).padStart(2, "0")}`;
      const existing = EVANGELIOS_MACRO_THREADS_AND_ECHOES[wKey] || EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;
      const quarterPrefix = existing?.macroThread ? existing.macroThread.split("·")[0].trim() : "";
      const enrichedMacro = entry.macroThread
        ? quarterPrefix && !String(entry.macroThread).includes(quarterPrefix)
          ? `${quarterPrefix} · ${entry.macroThread}`
          : String(entry.macroThread)
        : existing?.macroThread || "";
      EVANGELIOS_MACRO_THREADS_AND_ECHOES[wKey] = {
        weekId: wKey,
        weekNumber: wNum,
        title: entry.title || existing?.title || `Semana ${wNum}`,
        cita: entry.cita || entry.ref || "",
        anchorOsis: entry.anchorOsis || "JHN.1.1",
        book: entry.book || "JHN",
        chapter: Number(entry.chapter) || 1,
        macroThread: enrichedMacro,
        otEchoes: Array.isArray(entry.otEchoes) && entry.otEchoes.length > 0
          ? entry.otEchoes
          : entry.otEcho
            ? [String(entry.otEcho), ...(existing?.otEchoes || []).slice(1)]
            : existing?.otEchoes || [],
        culturalRealia: entry.culturalRealia || entry.liturgicalDawnNote || existing?.culturalRealia || "",
        questions: Array.isArray(entry.questions) ? entry.questions : [],
        pericopeBlocks: Array.isArray(entry.pericopeBlocks) ? entry.pericopeBlocks : [],
      };
    }
  }
  if (Array.isArray(artifact.felices_12_dichas)) {
    for (const item of artifact.felices_12_dichas) {
      const num = Number(item.number) || 1;
      const parts = String(item.anchorRef || "MAT.5.3").split(".");
      const existing = FELICES_12_DICHAS_COORDINATE_MAP[num] || FELICES_12_DICHAS_COORDINATE_MAP[1];
      FELICES_12_DICHAS_COORDINATE_MAP[num] = {
        book: item.book || parts[0] || existing.book,
        chapter: Number(item.chapter || parts[1]) || existing.chapter,
        verse: Number(item.verse || parts[2]) || existing.verse,
        title: item.title || existing.title,
        virtue: item.virtue || "",
      };
    }
  } else if (artifact.felices_12_dichas && typeof artifact.felices_12_dichas === "object") {
    for (const [dKey, dVal] of Object.entries(artifact.felices_12_dichas)) {
      FELICES_12_DICHAS_COORDINATE_MAP[Number(dKey) || dKey] = dVal;
    }
  }
  if (Array.isArray(artifact.felices_28_plates)) {
    artifact.felices_28_plates.forEach((plate, idx) => {
      const pNum = Number(plate.number ?? plate.plateNumber) || (idx + 1);
      const dichaIdx = pNum >= 25 ? 1 : Math.max(1, Math.min(12, Math.floor((pNum + 1) / 2)));
      const dichaMeta = FELICES_12_DICHAS_COORDINATE_MAP[dichaIdx] || FELICES_12_DICHAS_COORDINATE_MAP[1];
      const fallbackRef = `${dichaMeta.book}.${dichaMeta.chapter}.${dichaMeta.verse}`;
      FELICES_28_PLATES_MAP[pNum] = {
        ...plate,
        number: pNum,
        type: String(plate.type || "condicion"),
        title_es: String(plate.title_es || plate.title || `${dichaMeta.title} (Lámina ${pNum}/28)`),
        cita_es: String(plate.cita_es || plate.ref || fallbackRef),
        preguntas_es:
          Array.isArray(plate.preguntas_es) && plate.preguntas_es.length > 0
            ? plate.preguntas_es
            : [
                `¿Dónde has experimentado hoy la necesidad o la promesa de «${dichaMeta.title}» (${fallbackRef})?`,
                `¿Qué paso concreto de misericordia o paz nos invita a dar esta lámina en familia?`,
              ],
      };
    });
  }
  return true;
}

export function resolveFelicesPlate(plateNumber = 1, artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const idx = Math.max(1, Math.min(28, Number(plateNumber) || 1));
  if (FELICES_28_PLATES_MAP[idx]) return FELICES_28_PLATES_MAP[idx];
  const dichaIdx = idx >= 25 ? 1 : Math.max(1, Math.min(12, Math.floor((idx + 1) / 2)));
  const dichaMeta = FELICES_12_DICHAS_COORDINATE_MAP[dichaIdx] || FELICES_12_DICHAS_COORDINATE_MAP[1];
  const fallbackRef = `${dichaMeta.book}.${dichaMeta.chapter}.${dichaMeta.verse}`;
  return {
    number: idx,
    type: idx % 2 === 0 ? "condicion" : "promesa",
    title_es: `${dichaMeta.title} (Lámina ${idx}/28)`,
    cita_es: fallbackRef,
    preguntas_es: [
      `¿Dónde has experimentado hoy la necesidad o la promesa de «${dichaMeta.title}» (${fallbackRef})?`,
      `¿Qué paso concreto de misericordia o paz nos invita a dar esta lámina en familia?`,
    ],
  };
}

export function resolvePericopeHeaderForVerse(book, chapter, verse, artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const key = `${String(book || "GEN").toUpperCase()}.${Number(chapter) || 1}`;
  const list = MASORETIC_AND_GOSPEL_PERICOPE_MAP[key];
  if (!Array.isArray(list)) return null;
  const v = Number(verse) || 1;
  return list.find((item) => Number(item.beforeVerse ?? item.startVerse) === v) || null;
}

export function resolveEvangeliosMacroThreadAndEcho(weekId = "s01", artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const raw = String(weekId || "s01").trim().toLowerCase();
  const cleanWeek = /^\d+$/.test(raw) ? `s${raw.padStart(2, "0")}` : raw;
  return EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanWeek] || EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;
}

export function resolveFelicesDichaCoordinate(dichaIndex = 1, artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const idx = Number(dichaIndex) || 1;
  return FELICES_12_DICHAS_COORDINATE_MAP[idx] || FELICES_12_DICHAS_COORDINATE_MAP[1];
}

/**
 * Resuelve las particiones de perícopa Masoréticas (`Petuhah פ` / `Setumah ס`) y de tradición
 * manuscrita griega (Kephalaia / Ammonian Sections) sin usar cortes sintéticos (`D3-C+`).
 */
export function resolveMasoreticPericopeBreaks(book, chapter, verseNums = [], chapterData = null) {
  const map = new Map();
  if (Array.isArray(chapterData?.pericopeBreaks) && chapterData.pericopeBreaks.length > 0) {
    for (const item of chapterData.pericopeBreaks) {
      if (typeof item === "number") {
        map.set(item, "petuhah");
      } else if (item && typeof item === "object" && Number.isFinite(Number(item.beforeVerse ?? item.startVerse))) {
        map.set(Number(item.beforeVerse ?? item.startVerse), String(item.kind || item.markerType || "petuhah"));
      }
    }
    return map;
  }

  const key = `${String(book || "GEN").toUpperCase()}.${Number(chapter) || 1}`;
  const canonicalBreaks = MASORETIC_AND_GOSPEL_PERICOPE_MAP[key];
  if (Array.isArray(canonicalBreaks) && canonicalBreaks.length > 0) {
    for (const br of canonicalBreaks) {
      const bv = Number(br.beforeVerse ?? br.startVerse) || 1;
      if (bv > 1 || canonicalBreaks.length === 1) {
        map.set(bv, br.kind || "petuhah");
      }
    }
    return map;
  }

  if (Array.isArray(verseNums) && verseNums.length > 0) {
    map.set(verseNums[0] || 1, "petuhah");
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

/**
 * Extrae una referencia OSIS canónica `{ book, chapter, verse, refCode }` desde una cita de Eco AT (`D56 / 5C+`).
 */
export function parseCanonicalOtEchoRef(echoStr = "") {
  const raw = String(echoStr || "").trim();
  const dotMatch = raw.match(/\b([1-3]?[A-Za-z]{2,3})\.(\d+)(?:\.(\d+))?/);
  if (dotMatch) {
    const book = dotMatch[1].toUpperCase();
    const chapter = Math.max(1, Number(dotMatch[2]) || 1);
    const verse = Math.max(1, Number(dotMatch[3]) || 1);
    return { book, chapter, verse, refCode: `${book}.${chapter}.${verse}` };
  }
  const colonMatch = raw.match(/\b([1-3]?[A-Za-z]{2,3})\s+(\d+)(?::(\d+))?/);
  if (colonMatch) {
    const book = colonMatch[1].toUpperCase();
    const chapter = Math.max(1, Number(colonMatch[2]) || 1);
    const verse = Math.max(1, Number(colonMatch[3]) || 1);
    return { book, chapter, verse, refCode: `${book}.${chapter}.${verse}` };
  }
  return { book: "GEN", chapter: 1, verse: 1, refCode: "GEN.1.1" };
}

export function renderEvangeliosPlateActionsHtml({
  weekId = "s01",
  passageRef = "JHN.1.1",
  lang = "es",
} = {}) {
  const cleanWeek = String(weekId || "s01").trim().toLowerCase();
  const cleanRef = String(passageRef || "JHN.1.1").trim().toUpperCase();
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const enrichment =
    EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanWeek] ||
    EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;

  const parsedPassage = parseCanonicalOtEchoRef(enrichment.anchorOsis || cleanRef);
  const bookKey = `${enrichment.book || parsedPassage.book}.${enrichment.chapter || parsedPassage.chapter}`;

  const echoesHtml = (enrichment.otEchoes || [])
    .map((ec) => {
      const parsedEcho = parseCanonicalOtEchoRef(ec);
      return (
        `<button type="button" class="uls-chip ot-echo-jump-chip" ` +
        `data-ot-echo="${escapeHtml(ec)}" data-ot-echo-ref="${escapeHtml(parsedEcho.refCode)}" ` +
        `style="min-height:48px;min-width:48px;padding:0.35rem 0.65rem;font-size:0.76rem;display:inline-flex;align-items:center;">` +
        `📜 Eco AT: ${escapeHtml(ec)}</button>`
      );
    })
    .join(" ");

  const rawPericopes =
    Array.isArray(enrichment.pericopeBlocks) && enrichment.pericopeBlocks.length > 0
      ? enrichment.pericopeBlocks
      : Array.isArray(MASORETIC_AND_GOSPEL_PERICOPE_MAP[bookKey]) &&
          MASORETIC_AND_GOSPEL_PERICOPE_MAP[bookKey].length > 0
        ? MASORETIC_AND_GOSPEL_PERICOPE_MAP[bookKey]
        : [
            {
              beforeVerse: parsedPassage.verse || 1,
              kind: "petuhah",
              marker: "פ",
              title: enrichment.title || `Apertura de Perícopa (${bookKey})`,
            },
          ];

  const pericopesHtml = rawPericopes
    .map((pb, idx) => {
      const vStart = Number(pb.beforeVerse ?? pb.startVerse ?? pb.verse ?? 1) || 1;
      const pRef = `${enrichment.book || parsedPassage.book}.${enrichment.chapter || parsedPassage.chapter}.${vStart}`;
      const label = pb.title || pb.heading || pb.label || `Bloque ${idx + 1} (v. ${vStart})`;
      const marker = pb.marker || (pb.kind === "setumah" ? "ס" : "פ");
      return (
        `<button type="button" class="uls-chip evangelios-pericope-chip" ` +
        `data-pericope-block="${idx + 1}" data-pericope-verse="${vStart}" data-pericope-ref="${escapeHtml(pRef)}" ` +
        `style="min-height:48px;min-width:48px;padding:0.3rem 0.65rem;font-size:0.76rem;display:inline-flex;align-items:center;">` +
        `${escapeHtml(marker)} v.${vStart} · ${escapeHtml(label)}</button>`
      );
    })
    .join(" ");

  const rawQuestions =
    Array.isArray(enrichment.questions) && enrichment.questions.length > 0
      ? enrichment.questions
      : [
          `¿Qué revela este pasaje (${cleanRef}) sobre la promesa cumplida en el hilo «${enrichment.macroThread}»?`,
          `¿Cómo transforma esta palabra nuestra vida comunitaria hoy al amanecer?`,
        ];

  const questionsHtml = rawQuestions
    .map(
      (q, qIdx) =>
        `<li data-evangelios-question="${qIdx + 1}" style="margin-bottom:0.2rem;">${escapeHtml(q)}</li>`,
    )
    .join("");

  return (
    `<div class="evangelios-exegesis-enrichment" data-week="${escapeHtml(cleanWeek)}" data-lang="${escapeHtml(cleanLang)}" data-macro-thread="${escapeHtml(enrichment.macroThread)}" style="margin-top:0.55rem;padding:0.65rem;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);font-size:0.8rem;display:flex;flex-direction:column;gap:0.45rem;">` +
    `<div style="font-weight:700;">🧵 ${escapeHtml(enrichment.macroThread)}</div>` +
    `<div class="evangelios-ot-echoes-bar" style="display:flex;flex-wrap:wrap;gap:0.35rem;">${echoesHtml}</div>` +
    `<div data-realia-gloss="true" style="color:var(--text-secondary);">🏺 <strong>Glosa Cultural Realia:</strong> ${escapeHtml(enrichment.culturalRealia)}</div>` +
    `<div id="evangeliosPericopeBlocksList" data-evangelios-pericopes="true" style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">` +
    `<strong style="font-size:0.76rem;color:var(--text-secondary);">📑 Bloques de Perícopa:</strong> ${pericopesHtml}` +
    `</div>` +
    `<div id="evangeliosQuestionsList" data-evangelios-questions="true" style="border-top:1px dashed var(--card-border);padding-top:0.4rem;">` +
    `<strong style="font-size:0.78rem;display:block;margin-bottom:0.2rem;">🌅 Preguntas Contemplativas de Alborada:</strong>` +
    `<ol style="margin:0;padding-left:1.2rem;color:var(--text-secondary);">${questionsHtml}</ol>` +
    `</div>` +
    `</div>`
  );
}

/**
 * D5-A+: Renderiza la cinta horizontal de bloques de perícopa Masoréticas (`Petuhah פ` / `Setumah ס`)
 * y paralelos sinópticos (`#bibleChapterPericopesRibbon`) para navegación de capítulo en 1 toque.
 */
export function renderChapterPericopesRibbonHtml(bookCode = "GEN", chapterNum = 1, uiLang = "es") {
  const cleanBook = String(bookCode || "GEN").toUpperCase();
  const cleanChap = Math.max(1, Number(chapterNum) || 1);
  const key = `${cleanBook}.${cleanChap}`;
  const rawList =
    Array.isArray(MASORETIC_AND_GOSPEL_PERICOPE_MAP[key]) &&
    MASORETIC_AND_GOSPEL_PERICOPE_MAP[key].length > 0
      ? MASORETIC_AND_GOSPEL_PERICOPE_MAP[key]
      : [
          {
            beforeVerse: 1,
            startVerse: 1,
            kind: "petuhah",
            marker: "פ",
            title: `[פ Petuhah] ${cleanBook} ${cleanChap}:1`,
            synopticParallel: `${cleanBook}.${cleanChap}.1`,
          },
        ];

  return rawList
    .map((pb, idx) => {
      const vStart = Number(pb.beforeVerse ?? pb.startVerse ?? 1) || 1;
      const marker = pb.marker || (pb.kind === "setumah" ? "ס" : "פ");
      const title = pb.title || `Perícopa ${idx + 1} (v.${vStart})`;
      const synoptic = String(pb.synopticParallel || `${cleanBook}.${cleanChap}.${vStart}`);
      return (
        `<button type="button" class="uls-chip chapter-pericope-ribbon-chip" ` +
        `data-pericope-verse="${vStart}" ` +
        `data-synoptic-jump="${escapeHtml(synoptic)}" ` +
        `data-pericope-kind="${escapeHtml(pb.kind || "petuhah")}" ` +
        `data-ui-lang="${escapeHtml(uiLang)}" ` +
        `style="min-height:48px;min-width:48px;padding:0.25rem 0.65rem;font-size:0.75rem;display:inline-flex;align-items:center;gap:0.3rem;white-space:nowrap;">` +
        `<strong>${escapeHtml(marker)} v.${vStart}</strong> · <span>${escapeHtml(title)}</span>` +
        `</button>`
      );
    })
    .join("");
}

/**
 * D9-A+: Renderiza la Tarjeta de Maravilla Socrática (`#felicesSocraticWonderCard`) para las 28 láminas
 * de Los Felices (`felices_28_plates`), exponiendo `title_es`, `cita_es` y `preguntas_es`.
 */
export function renderFelicesSocraticWonderCardHtml(plateIndex = 1, uiLang = "es") {
  const plate = resolveFelicesPlate(plateIndex);
  const pNum = Number(plate.number) || Math.max(1, Math.min(28, Number(plateIndex) || 1));
  const titleStr = String(plate.title_es || `Lámina ${pNum} / 28`);
  const citaStr = String(plate.cita_es || "MAT.5.3");
  const typeStr = String(plate.type || "condicion");
  const questions = Array.isArray(plate.preguntas_es) && plate.preguntas_es.length > 0
    ? plate.preguntas_es
    : [
        `¿Cómo resuena esta dicha (${citaStr}) en nuestra vida hoy?`,
        `¿Con quién podemos compartir esta promesa esta semana?`,
      ];

  const questionsHtml = questions
    .map(
      (q, qIdx) =>
        `<li data-socratic-question="${qIdx + 1}" style="margin-bottom:0.2rem;">${escapeHtml(q)}</li>`,
    )
    .join("");

  return (
    `<div class="felices-socratic-wonder-inner" data-plate-number="${pNum}" data-plate-type="${escapeHtml(typeStr)}" data-ui-lang="${escapeHtml(uiLang)}">` +
    `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.35rem;">` +
    `<strong style="font-size:0.84rem;">✨ ${escapeHtml(titleStr)}</strong>` +
    `<button type="button" class="uls-chip felices-wonder-cite-btn" data-wonder-cite="${escapeHtml(citaStr)}" style="min-height:48px;padding:0.2rem 0.6rem;font-size:0.74rem;">📖 ${escapeHtml(citaStr)} (${escapeHtml(typeStr)})</button>` +
    `</div>` +
    `<ol style="margin:0;padding-left:1.25rem;font-size:0.79rem;color:var(--text-secondary);">${questionsHtml}</ol>` +
    `</div>`
  );
}

