// web/mostrador/evangelios.js — Acciones de Impresión, Estudio, Perícopas Masoréticas (Petuhah פ / Setumah ס),
// Hilos Macro-Narrativos (52 semanas), Ecos AT->NT y las 12 Dichas Soberanas (`D4-R+`, `D7-B+`, `D8-B+`).

import { ROSETTA_66_BOOKS } from "./reference.js";

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
        weekNumber: w,
        plateSlug: w === 1 ? "mc-01-redes" : "",
        anchorOsis: w === 1 ? "MRK.1.16" : "MRK.1.1",
        book: "MRK",
        chapter: 1,
        title: w === 1 ? "Vengan conmigo y síganme." : `Semana ${w}`,
        macroThread: "Hilo 1 · Del Principio Creador al Verbo Encarnado y el Llamado junto al Mar",
        otEchoes: ["GEN.1.1 (En el principio)", "EXO.33.18 (Muéstrame tu gloria)", "PRO.8.22 (Sabiduría creadora)"],
        culturalRealia: "Redes de pesca en Galilea (ἀμφίβληστρον / amphiblēstron): atarraya circular lanzada desde la orilla antes del llamado apostólico.",
      };
    } else if (w <= 26) {
      weeks[key] = {
        weekId: key,
        macroThread: "Hilo 2 · El Pastor que Busca, las Parábolas de Semilla y el Banquete de la Gracia",
        otEchoes: ["EZK.34.11 (Yo mismo buscaré mis ovejas)", "PSA.23.1 (YHWH es mi pastor)", "ISA.55.1 (Venid a las aguas)"],
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
  1: { book: "MAT", chapter: 5, verse: 1, title: "Dicha 1 · Jesús sube al Monte con sus Discípulos (Mt 5:1)", title_en: "Saying 1 · Jesus Goes Up the Mountain with His Disciples (Matt 5:1)" },
  2: { book: "MAT", chapter: 5, verse: 3, title: "Dicha 2 · Los Pobres en Espíritu", title_en: "Saying 2 · The Poor in Spirit" },
  3: { book: "MAT", chapter: 5, verse: 4, title: "Dicha 3 · Los que Lloran (Consuelo)", title_en: "Saying 3 · Those Who Mourn (Comfort)" },
  4: { book: "MAT", chapter: 5, verse: 5, title: "Dicha 4 · Los Mansos (Herencia de la Tierra)", title_en: "Saying 4 · The Meek (Inheriting the Earth)" },
  5: { book: "MAT", chapter: 5, verse: 6, title: "Dicha 5 · Hambre y Sed de Justicia", title_en: "Saying 5 · Hunger and Thirst for Righteousness" },
  6: { book: "MAT", chapter: 5, verse: 7, title: "Dicha 6 · Los Misericordiosos", title_en: "Saying 6 · The Merciful" },
  7: { book: "MAT", chapter: 5, verse: 8, title: "Dicha 7 · Los de Limpio Corazón (Verán a Dios)", title_en: "Saying 7 · The Pure in Heart (Shall See God)" },
  8: { book: "MAT", chapter: 5, verse: 9, title: "Dicha 8 · Los Pacificadores (Hijos de Dios)", title_en: "Saying 8 · The Peacemakers (Children of God)" },
  9: { book: "MAT", chapter: 5, verse: 10, title: "Dicha 9 · Perseguidos por Causa de la Justicia", title_en: "Saying 9 · Persecuted for Righteousness' Sake" },
  10: { book: "MAT", chapter: 5, verse: 11, title: "Dicha 10 · Insultados y perseguidos por causa de Jesús (Mt 5:11)", title_en: "Saying 10 · Insulted and Persecuted for Jesus' Sake (Matt 5:11)" },
  11: { book: "MAT", chapter: 5, verse: 12, title: "Dicha 11 · Alégrense y celebren (Mt 5:12 · Galardón en los Cielos)", title_en: "Saying 11 · Rejoice and Be Glad (Matt 5:12 · Reward in Heaven)" },
  12: { book: "REV", chapter: 22, verse: 14, title: "Dicha 12 · Los que Lavan sus Ropas (Árbol de la Vida)", title_en: "Saying 12 · Those Who Wash Their Robes (Tree of Life)" },
};

const FELICES_PLATE_TO_DICHA_HYDRATED = {};

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
  // D4-R44 / DEB-R44-06: `pericopes_and_glosses.json` publica `evangelios_macro_threads` como objeto
  // indexado `s01..s52`; antes sólo se aceptaba un arreglo y las 52 semanas caían al hilo genérico.
  const macroSource = artifact.evangelios_macro_threads ?? artifact.evangelios_52_weeks;
  const rawMacroThreads = Array.isArray(macroSource)
    ? macroSource
    : macroSource && typeof macroSource === "object"
      ? Object.entries(macroSource)
        .filter(([, v]) => v && typeof v === "object" && (v.macroThread || v.weekNumber || v.cita))
        .map(([k, v]) => ({ ...v, weekNumber: v.weekNumber ?? (Number(String(k).replace(/\D/g, "")) || 1) }))
      : null;
  if (rawMacroThreads && rawMacroThreads.length > 0) {
    for (const entry of rawMacroThreads) {
      const wNum = Number(entry.weekNumber ?? entry.week) || 1;
      const wKey = `s${String(wNum).padStart(2, "0")}`;
      const existing = EVANGELIOS_MACRO_THREADS_AND_ECHOES[wKey] || EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;
      const quarterPrefix = existing?.macroThread ? existing.macroThread.split("·")[0].trim() : "";
      const enrichedMacro = entry.macroThread
        ? quarterPrefix && !String(entry.macroThread).includes(quarterPrefix) && !/^\s*Hilo\s+(?:Q?\d+)\b/i.test(String(entry.macroThread))
          ? `${quarterPrefix} · ${entry.macroThread}`
          : String(entry.macroThread)
        : existing?.macroThread || "";
      const citaMatch = /^([1-3]?[A-Z]{2,3})\s+(\d+):(\d+)/.exec(String(entry.cita || entry.ref || "").trim().toUpperCase());
      const parsedEchoParts = entry.otEcho
        ? String(entry.otEcho)
          .split("↔")[0]
          .split("·")
          .map((s) => s.trim())
          .filter(Boolean)
        : [];
      EVANGELIOS_MACRO_THREADS_AND_ECHOES[wKey] = {
        weekId: wKey,
        weekNumber: wNum,
        plateSlug: String(entry.plateId || entry.plate_id || entry.plateSlug || existing?.plateSlug || ""),
        title: entry.title || existing?.title || `Semana ${wNum}`,
        cita: entry.cita || entry.ref || "",
        gesture: entry.gesture || existing?.gesture || "",
        anchorOsis: entry.anchorOsis || (citaMatch ? `${citaMatch[1]}.${citaMatch[2]}.${citaMatch[3]}` : "MRK.1.16"),
        book: entry.book || (citaMatch ? citaMatch[1] : "MRK"),
        chapter: Number(entry.chapter) || (citaMatch ? Number(citaMatch[2]) : 1),
        macroThread: enrichedMacro,
        otEchoes: Array.isArray(entry.otEchoes) && entry.otEchoes.length > 0
          ? entry.otEchoes
          : parsedEchoParts.length > 0
            ? parsedEchoParts
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
        title_en: item.title_en || existing.title_en || "",
        virtue: item.virtue || "",
      };
    }
  } else if (artifact.felices_12_dichas && typeof artifact.felices_12_dichas === "object") {
    for (const [dKey, dVal] of Object.entries(artifact.felices_12_dichas)) {
      const numKey = Number(dKey) || dKey;
      const prev = FELICES_12_DICHAS_COORDINATE_MAP[numKey] || {};
      FELICES_12_DICHAS_COORDINATE_MAP[numKey] = {
        ...prev,
        ...dVal,
        title_en: dVal?.title_en || prev.title_en || "",
      };
    }
  }
  if (artifact.felices_plate_to_dicha && typeof artifact.felices_plate_to_dicha === "object") {
    for (const [pKey, dVal] of Object.entries(artifact.felices_plate_to_dicha)) {
      const pNum = Number(pKey);
      const dNum = Number(dVal);
      if (pNum >= 1 && pNum <= 27 && dNum >= 1 && dNum <= 12) {
        FELICES_PLATE_TO_DICHA_HYDRATED[pNum] = dNum;
      }
    }
  }
  if (Array.isArray(artifact.felices_28_plates)) {
    for (const k of Object.keys(FELICES_28_PLATES_MAP)) delete FELICES_28_PLATES_MAP[k];
    artifact.felices_28_plates.slice(0, 27).forEach((plate, idx) => {
      const pNum = Number(plate.number ?? plate.plateNumber ?? plate.id) || (idx + 1);
      if (pNum > 27) return;
      const coordMeta = FELICES_PLATE_TO_BIBLE_COORDINATE[pNum];
      const mappedDicha =
        Number(plate.dicha_index ?? plate.dichaIndex) ||
        FELICES_PLATE_TO_DICHA_HYDRATED[pNum] ||
        (coordMeta && Number.isInteger(coordMeta.beatitudeIndex) ? coordMeta.beatitudeIndex + 1 : 0);
      const dichaIdx =
        mappedDicha >= 1 && mappedDicha <= 12
          ? mappedDicha
          : pNum === 27
            ? 12
            : pNum >= 25
              ? 1
              : Math.max(1, Math.min(12, Math.floor((pNum + 1) / 2)));
      const dichaMeta = FELICES_12_DICHAS_COORDINATE_MAP[dichaIdx] || FELICES_12_DICHAS_COORDINATE_MAP[1];
      const fallbackRef = `${dichaMeta.book}.${dichaMeta.chapter}.${dichaMeta.verse}`;
      FELICES_28_PLATES_MAP[pNum] = {
        ...plate,
        number: pNum,
        dicha_index: dichaIdx,
        dichaIndex: dichaIdx,
        type: String(plate.type || "condicion"),
        title_es: String(plate.title_es || plate.title || `${dichaMeta.title} (Lámina ${pNum}/27)`),
        title_en: String(plate.title_en || `${dichaMeta.title_en || `Saying ${dichaIdx}`} (Plate ${pNum}/27)`),
        cita_es: String(plate.cita_es || plate.ref || fallbackRef),
        preguntas_es:
          Array.isArray(plate.preguntas_es) && plate.preguntas_es.length > 0
            ? plate.preguntas_es
            : [
              `¿Dónde has experimentado hoy la necesidad o la promesa de «${dichaMeta.title}» (${fallbackRef})?`,
              `¿Qué paso concreto de misericordia o paz nos invita a dar esta lámina en familia?`,
            ],
        preguntas_en:
          Array.isArray(plate.preguntas_en) && plate.preguntas_en.length > 0
            ? plate.preguntas_en
            : [
              `How does "${dichaMeta.title_en || `Saying ${dichaIdx}`}" (${fallbackRef}) speak into your week today?`,
              `What concrete act of mercy or peacemaking does this plate invite your household to practice?`,
            ],
      };
    });
  }
  return true;
}

export function resolveFelicesPlate(plateNumber = 1, artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const idx = Math.max(1, Math.min(27, Number(plateNumber) || 1));
  if (FELICES_28_PLATES_MAP[idx]) return FELICES_28_PLATES_MAP[idx];
  const coordMeta = FELICES_PLATE_TO_BIBLE_COORDINATE[idx];
  const mappedDicha =
    FELICES_PLATE_TO_DICHA_HYDRATED[idx] ||
    (coordMeta && Number.isInteger(coordMeta.beatitudeIndex) ? coordMeta.beatitudeIndex + 1 : 0);
  const dichaIdx =
    mappedDicha >= 1 && mappedDicha <= 12
      ? mappedDicha
      : idx === 27
        ? 12
        : idx >= 25
          ? 1
          : Math.max(1, Math.min(12, Math.floor((idx + 1) / 2)));
  const dichaMeta = FELICES_12_DICHAS_COORDINATE_MAP[dichaIdx] || FELICES_12_DICHAS_COORDINATE_MAP[1];
  const fallbackRef = `${dichaMeta.book}.${dichaMeta.chapter}.${dichaMeta.verse}`;
  return {
    number: idx,
    dicha_index: dichaIdx,
    dichaIndex: dichaIdx,
    type: idx % 2 === 0 ? "condicion" : "promesa",
    title_es: `${dichaMeta.title} (Lámina ${idx}/27)`,
    title_en: `${dichaMeta.title_en || `Saying ${dichaIdx}`} (Plate ${idx}/27)`,
    cita_es: fallbackRef,
    preguntas_es: [
      `¿Dónde has experimentado hoy la necesidad o la promesa de «${dichaMeta.title}» (${fallbackRef})?`,
      `¿Qué paso concreto de misericordia o paz nos invita a dar esta lámina en familia?`,
    ],
    preguntas_en: [
      `How does "${dichaMeta.title_en || `Saying ${dichaIdx}`}" (${fallbackRef}) speak into your week today?`,
      `What concrete act of mercy or peacemaking does this plate invite your household to practice?`,
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

export function resolveEvangeliosMacroThreadAndEcho(weekOrQuery = "s01", artifact = null) {
  if (artifact) hydratePericopesAndGlosses(artifact);
  const allEntries = Object.values(EVANGELIOS_MACRO_THREADS_AND_ECHOES);
  if (weekOrQuery && typeof weekOrQuery === "object") {
    const slug = String(weekOrQuery.plateSlug || weekOrQuery.plate_id || "").trim().toLowerCase();
    const wRaw = String(weekOrQuery.weekId || "").trim().toLowerCase();
    const osis = String(weekOrQuery.anchorOsis || "").trim().toUpperCase();
    if (slug) {
      const bySlug = allEntries.find((item) => String(item?.plateSlug || "").toLowerCase() === slug);
      if (bySlug) return bySlug;
    }
    if (wRaw) {
      const cleanW = /^\d+$/.test(wRaw) ? `s${wRaw.padStart(2, "0")}` : wRaw;
      if (EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanW]) {
        return EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanW];
      }
    }
    if (osis) {
      const parsed = parseCanonicalOtEchoRef(osis);
      const normOsis = `${parsed.book}.${parsed.chapter}.${parsed.verse}`;
      const byOsis = allEntries.find((item) => String(item?.anchorOsis || "").toUpperCase() === normOsis);
      if (byOsis) return byOsis;
    }
    return EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;
  }
  const raw = String(weekOrQuery || "s01").trim();
  const lower = raw.toLowerCase();
  const cleanWeek = /^\d+$/.test(lower) ? `s${lower.padStart(2, "0")}` : lower;
  if (EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanWeek]) {
    return EVANGELIOS_MACRO_THREADS_AND_ECHOES[cleanWeek];
  }
  const bySlug = allEntries.find((item) => String(item?.plateSlug || "").toLowerCase() === lower);
  if (bySlug) return bySlug;
  const parsed = parseCanonicalOtEchoRef(raw);
  const normOsis = `${parsed.book}.${parsed.chapter}.${parsed.verse}`;
  const byOsis = allEntries.find((item) => String(item?.anchorOsis || "").toUpperCase() === normOsis);
  return byOsis || EVANGELIOS_MACRO_THREADS_AND_ECHOES.s01;
}

export function formatHumanEvangeliosPlateTitle(
  entry = {},
  activeEvLang = "es",
  uiLocale = activeEvLang,
) {
  if (!entry || typeof entry !== "object") return "";
  const langKey = String(activeEvLang || "es").trim();
  const uiKey = String(uiLocale || langKey || "es").trim().toLowerCase();
  const tObj = entry.texts?.[langKey] || (uiKey.startsWith("en") ? entry.texts?.en : null) || entry.texts?.es || {};
  if (tObj.title && !/^[a-z]{2}-\d{2}-[a-z0-9-]+$/i.test(String(tObj.title).trim())) {
    return String(tObj.title).trim();
  }
  const rawText = String(tObj.text || "").trim();
  if (rawText) {
    const afterDash = rawText.includes("—") ? rawText.split("—").slice(1).join("—").trim() : rawText;
    const firstClause = afterDash.split(/(?<=[.!?¡¿])\s+/)[0]?.trim() || afterDash;
    if (firstClause.length <= 68) return firstClause;
    const cut = firstClause.slice(0, 65).replace(/\s+\S*$/, "").trim();
    return `${cut || firstClause.slice(0, 64)}…`;
  }
  const macroMeta = resolveEvangeliosMacroThreadAndEcho({
    plateSlug: entry.plate_id || entry.plateSlug || "",
    weekId: entry.id || "",
    anchorOsis: entry.reference || "",
  });
  if (macroMeta?.title) return String(macroMeta.title).trim();
  if (entry.gesture) return String(entry.gesture).trim();
  return uiKey.startsWith("en") ? `Plate ${Number(entry.week) || 1}` : `Lámina ${Number(entry.week) || 1}`;
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
const CITATION_ALIASES = {
  MC: "MRK", MT: "MAT", LC: "LUK", JN: "JHN", SAL: "PSA", PS: "PSA",
  GN: "GEN", EX: "EXO", LV: "LEV", NM: "NUM", DT: "DEU", IS: "ISA",
  JR: "JER", EZ: "EZK", DN: "DAN", HCH: "ACT", RM: "ROM", AP: "REV",
};

/** Convierte una referencia OSIS o abreviada (`MC 1:16-20`, `MRK.1.16`) en cita humana localizada (`Marcos 1:16–20`). */
export function formatReadableCitation(osisRef, locale = "es") {
  const raw = String(osisRef || "").trim();
  if (!raw) return "";
  const isEs = String(locale || "es").trim().toLowerCase().startsWith("es");
  const m = raw.match(/^([1-3]?\s*[A-Za-zÁÉÍÓÚáéíóúñÑ]+)[.\s]+(\d+)(?:[:.](\d+(?:[-–]\d+)?))?(.*)$/);
  if (!m) return raw;
  const rawBook = m[1].replace(/\s+/g, "").toUpperCase();
  const code = CITATION_ALIASES[rawBook] || rawBook;
  const bookMeta = ROSETTA_66_BOOKS.find(
    (b) => b.code === code || b.es.toUpperCase() === rawBook || b.en.toUpperCase() === rawBook,
  );
  const bookName = bookMeta ? (isEs ? bookMeta.es : bookMeta.en) : m[1].trim();
  const chap = m[2];
  const verse = m[3] ? `:${m[3].replace(/-/g, "–")}` : "";
  const tail = m[4] || "";
  return `${bookName} ${chap}${verse}${tail}`;
}

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
  plateSlug = "",
  passageRef = "MRK.1.16",
  lang = "es",
  uiLocale = null,
  gestureText = "",
} = {}) {
  const cleanWeek = String(weekId || "s01").trim().toLowerCase();
  const cleanRef = String(passageRef || "MRK.1.16").trim().toUpperCase();
  const cleanLang = String(lang || "es").trim().toLowerCase();
  const effectiveUi = String(uiLocale || lang || "es").trim().toLowerCase();
  const isEnUi = effectiveUi.startsWith("en");
  const normCmp = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const normGesture = normCmp(gestureText);
  const enrichment = resolveEvangeliosMacroThreadAndEcho({
    plateSlug,
    weekId: cleanWeek,
    anchorOsis: cleanRef,
  });

  const parsedPassage = parseCanonicalOtEchoRef(enrichment.anchorOsis || cleanRef);
  const bookKey = `${enrichment.book || parsedPassage.book}.${enrichment.chapter || parsedPassage.chapter}`;
  const openingHeader = resolvePericopeHeaderForVerse(
    enrichment.book || parsedPassage.book,
    enrichment.chapter || parsedPassage.chapter,
    parsedPassage.verse || 1,
  );
  const bridgeLine = shouldShowEvangeliosBridgeLine(cleanLang)
    ? formatEvangeliosBridgeLine(enrichment.title || openingHeader?.title || "", cleanLang, effectiveUi)
    : "";

  const echoesHtml = (enrichment.otEchoes || [])
    .map((ec) => {
      const parsedEcho = parseCanonicalOtEchoRef(ec);
      const humanEcho = formatReadableCitation(ec, effectiveUi);
      return (
        `<button type="button" class="uls-chip ot-echo-jump-chip" ` +
        `data-ot-echo="${escapeHtml(ec)}" data-ot-echo-ref="${escapeHtml(parsedEcho.refCode)}">` +
        `📜 ${isEnUi ? "OT Echo" : "Eco AT"}: ${escapeHtml(humanEcho)}</button>`
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
            title: isEnUi ? `Pericope Opening (${bookKey})` : `Apertura de Perícopa (${bookKey})`,
          },
        ];

  const seenChipLabels = new Set();
  const pericopesHtml = rawPericopes
    .map((pb, idx) => {
      if (typeof pb === "string") {
        const cleanStr = pb.replace(/^\d+\.\s*/, "").trim();
        const nStr = normCmp(cleanStr);
        if (!cleanStr || (normGesture && (nStr === normGesture || normGesture.includes(nStr) || nStr.includes(normGesture))) || seenChipLabels.has(nStr)) {
          return "";
        }
        seenChipLabels.add(nStr);
        const vMatch = /:(\d+)/.exec(cleanStr);
        const vStart = vMatch ? Number(vMatch[1]) || 1 : (parsedPassage.verse || 1);
        const pRef = `${enrichment.book || parsedPassage.book}.${enrichment.chapter || parsedPassage.chapter}.${vStart}`;
        return (
          `<button type="button" class="uls-chip evangelios-pericope-chip" ` +
          `data-pericope-block="${idx + 1}" data-pericope-verse="${vStart}" data-pericope-ref="${escapeHtml(pRef)}">` +
          `פ v.${vStart} · ${escapeHtml(cleanStr)}</button>`
        );
      }
      const vStart = Number(pb.beforeVerse ?? pb.startVerse ?? pb.verse ?? 1) || 1;
      const pRef = `${enrichment.book || parsedPassage.book}.${enrichment.chapter || parsedPassage.chapter}.${vStart}`;
      const label = pb.title || pb.heading || pb.label || (isEnUi ? `Block ${idx + 1} (v. ${vStart})` : `Bloque ${idx + 1} (v. ${vStart})`);
      const nLbl = normCmp(label);
      if ((normGesture && (nLbl === normGesture || normGesture.includes(nLbl) || nLbl.includes(normGesture))) || seenChipLabels.has(nLbl)) {
        return "";
      }
      seenChipLabels.add(nLbl);
      const marker = pb.marker || (pb.kind === "setumah" ? "ס" : "פ");
      return (
        `<button type="button" class="uls-chip evangelios-pericope-chip" ` +
        `data-pericope-block="${idx + 1}" data-pericope-verse="${vStart}" data-pericope-ref="${escapeHtml(pRef)}">` +
        `${escapeHtml(marker)} v.${vStart} · ${escapeHtml(label)}</button>`
      );
    })
    .filter(Boolean)
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
        `<li data-evangelios-question="${qIdx + 1}">${escapeHtml(q)}</li>`,
    )
    .join("");

  return (
    `<div class="evangelios-exegesis-enrichment" data-week="${escapeHtml(cleanWeek)}" data-lang="${escapeHtml(cleanLang)}" data-ui-locale="${escapeHtml(effectiveUi)}" data-macro-thread="${escapeHtml(enrichment.macroThread)}">` +
    `<div class="evangelios-macro-title">🧵 ${escapeHtml(enrichment.macroThread)}</div>` +
    (bridgeLine ? `<div class="evangelios-bridge-line">${escapeHtml(bridgeLine)}</div>` : "") +
    `<div class="evangelios-ot-echoes-bar">${echoesHtml}</div>` +
    `<div data-realia-gloss="true" class="evangelios-realia-gloss">🏺 <strong>${isEnUi ? "Cultural Context:" : "Contexto Cultural:"}</strong> ${escapeHtml(enrichment.culturalRealia)}</div>` +
    `<div id="evangeliosPericopeBlocksList" data-evangelios-pericopes="true" class="evangelios-pericopes-bar">` +
    `<strong>📑 ${isEnUi ? "Sections:" : "Secciones:"}</strong> ${pericopesHtml}` +
    `</div>` +
    `<div id="evangeliosQuestionsList" data-evangelios-questions="true" class="evangelios-questions-box">` +
    `<strong>🌅 ${isEnUi ? "Dawn Reflection Questions:" : "Preguntas para el Amanecer:"}</strong>` +
    `<ol class="evangelios-questions-list">${questionsHtml}</ol>` +
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
        `data-ui-lang="${escapeHtml(uiLang)}">` +
        `<strong>${escapeHtml(marker)} v.${vStart}</strong> · <span>${escapeHtml(title)}</span>` +
        `</button>`
      );
    })
    .join("");
}

/**
 * DEB-R40-10: Solo muestra la línea puente en Los Evangelios cuando la lengua seleccionada
 * es una lengua focal/indígena (`quc`, `gn`, `stp` o no en `["es", "en", "pt", "fr"]`),
 * evitando duplicar el texto inglés con un prefijo español redundante ("Puente:").
 */
export function shouldShowEvangeliosBridgeLine(corpusLang = "es") {
  const clean = String(corpusLang || "es").trim().toLowerCase();
  return !["es", "en", "pt", "fr"].includes(clean);
}

export function formatEvangeliosBridgeLine(bridgeText = "", corpusLang = "es", uiLocale = "es") {
  if (!bridgeText || !shouldShowEvangeliosBridgeLine(corpusLang)) {
    return "";
  }
  const isEnUi = String(uiLocale || "es").trim().toLowerCase().startsWith("en");
  return `${isEnUi ? "Bridge:" : "Puente:"} ${bridgeText}`;
}

/**
 * D9-A+: Renderiza la Tarjeta de Maravilla Socrática (`#felicesSocraticWonderCard`) para las 28 láminas
 * de Los Felices (`felices_28_plates`), exponiendo `title_es`, `cita_es` y `preguntas_es`.
 */
export function renderFelicesSocraticWonderCardHtml(plateIndex = 1, uiLang = "es") {
  const isEn = String(uiLang || "es").trim().toLowerCase().startsWith("en");
  const plate = resolveFelicesPlate(plateIndex);
  const pNum = Number(plate.number) || Math.max(1, Math.min(27, Number(plateIndex) || 1));
  const titleStr = String(
    (isEn && plate.title_en) || plate.title_es || (isEn ? `Plate ${pNum} / 27` : `Lámina ${pNum} / 27`),
  );
  const citaStr = String(plate.cita_es || "MAT.5.3");
  const typeStr = String(plate.type || "condicion");
  const questions = Array.isArray(isEn ? plate.preguntas_en : plate.preguntas_es) &&
    (isEn ? plate.preguntas_en : plate.preguntas_es).length > 0
    ? (isEn ? plate.preguntas_en : plate.preguntas_es)
    : Array.isArray(plate.preguntas_es) && plate.preguntas_es.length > 0 && !isEn
      ? plate.preguntas_es
      : isEn
        ? [
          `How does this Beatitude (${citaStr}) resonate in our life today?`,
          `With whom can we share this promise this week?`,
        ]
        : [
          `¿Cómo resuena esta dicha (${citaStr}) en nuestra vida hoy?`,
          `¿Con quién podemos compartir esta promesa esta semana?`,
        ];

  const questionsHtml = questions
    .map(
      (q, qIdx) =>
        `<li data-socratic-question="${qIdx + 1}" class="felices-wonder-question-item">${escapeHtml(q)}</li>`,
    )
    .join("");

  return (
    `<div class="felices-socratic-wonder-inner" data-plate-number="${pNum}" data-plate-type="${escapeHtml(typeStr)}" data-ui-lang="${escapeHtml(uiLang)}">` +
    `<div class="felices-wonder-header">` +
    `<strong class="felices-wonder-title">✨ ${escapeHtml(titleStr)}</strong>` +
    `<button type="button" class="uls-chip felices-wonder-cite-btn" data-wonder-cite="${escapeHtml(citaStr)}">📖 ${escapeHtml(citaStr)} (${escapeHtml(typeStr)})</button>` +
    `</div>` +
    `<ol class="felices-wonder-list">${questionsHtml}</ol>` +
    `</div>`
  );
}

const FELICES_N = 27;
const FELICES_WK = ["biblia", "felices", "evangelios"];
const clampFelicesNum = (v, h, d = 1) => Math.max(1, Math.min(h, Number(v) || d));
const trimFelicesStr = (v, d = "") => String(v || d).trim();
const parseWeekSlug27 = (s) => {
  const m = trimFelicesStr(s).toLowerCase().match(/^s?0*(\d{1,2})$/);
  return m ? `s${String(clampFelicesNum(m[1], 52)).padStart(2, "0")}` : null;
};

export const FELICES_PLATE_TO_BIBLE_COORDINATE = Object.fromEntries(
  Array.from({ length: FELICES_N }, (_, i) => [
    i + 1,
    i < 24
      ? {
        book: "MAT",
        chapter: 5,
        verse: i < 2 ? 1 : i < 4 ? 3 : Math.min(12, (i >> 1) + 2),
        beatitudeIndex: Math.min(10, i >> 1),
      }
      : i < 26
        ? { book: "MAT", chapter: 5, verse: 1, beatitudeIndex: 0 }
        : { book: "REV", chapter: 22, verse: 14, beatitudeIndex: 11 },
  ]),
);

export function resolveFelicesPlateCoord(b = "MAT", ch = 5, v = 3, cur = 24, opts = {}) {
  const k = clampFelicesNum(cur, FELICES_N, 24);
  if (opts?.explicitPlateRequested) return k;
  const B = trimFelicesStr(b, "MAT").toUpperCase();
  const C = Number(ch) || 1;
  const V = Number(v) || 1;
  const x = FELICES_PLATE_TO_BIBLE_COORDINATE[k];
  if (B === "MAT" && C === 5 && V === 1) return k === 26 ? 26 : 25;
  if (x && x.book === B && x.chapter === C && x.verse === V) return k;
  if (B === "REV" && C === 22 && V === 14) return 27;
  if (B === "MAT" && C === 5) {
    for (const [p, y] of Object.entries(FELICES_PLATE_TO_BIBLE_COORDINATE)) {
      if (y.book === B && y.chapter === 5 && y.verse === V) return Number(p);
    }
  }
  return k;
}

export function parseInitialRouteAndLocale({
  search = "",
  pathname = "",
  defaultUi = "en",
  defaultLang = "es",
} = {}) {
  const q = new URLSearchParams(trimFelicesStr(search).replace(/^\?/, ""));
  const pL = trimFelicesStr(pathname).toLowerCase();
  const g = (k) => trimFelicesStr(q.get(k));
  const b = (k, h) => {
    const n = Number(q.get(k));
    return n >= 1 ? clampFelicesNum(Math.round(n), h) : null;
  };
  const plate = b("plate", FELICES_N);
  const dicha = b("dicha", 12);
  const week = parseWeekSlug27(g("week"));
  const rW = g("work").toLowerCase();
  const work = FELICES_WK.includes(rW)
    ? rW
    : plate || dicha
      ? "felices"
      : week
        ? "evangelios"
        : FELICES_WK.find((w) => pL.includes(w)) || "biblia";
  const dP = dicha ? (dicha === 1 ? 25 : dicha === 12 ? 27 : clampFelicesNum(dicha * 2 - 1, 24)) : null;
  const pC = work === "felices" && (plate || dP) ? FELICES_PLATE_TO_BIBLE_COORDINATE[plate || dP] : null;
  const rR = g("ref");
  return {
    work,
    ui: g("ui") || defaultUi || "en",
    lang: g("lang") || defaultLang || "es",
    ref: rR || (pC ? `${pC.book}.${pC.chapter}.${pC.verse}` : "JHN.1.1"),
    refExplicit: !!rR,
    plate,
    dicha,
    week,
    reg: g("reg").toLowerCase() || g("register").toLowerCase() || null,
    ortho: g("ortho") || null,
    sheet: g("sheet").toLowerCase() || null,
    format: g("format").toLowerCase() === "letter" ? "letter" : "a4",
  };
}

export function serializeMostradorRouteQuery(st = {}, fallbackPlate = 24) {
  const rW = trimFelicesStr(st.work || st.activeWork || "biblia").toLowerCase();
  const work = FELICES_WK.includes(rW) ? rW : "biblia";
  const q = new URLSearchParams({
    work,
    ui: trimFelicesStr(st.ui || st.uiLocale, "en"),
    lang: trimFelicesStr(st.lang, "es"),
    ref: trimFelicesStr(
      st.ref,
      `${trimFelicesStr(st.book, "JHN").toUpperCase()}.${clampFelicesNum(st.chapter, 999)}.${clampFelicesNum(st.verse, 999)}`,
    ),
  });
  if (work === "felices") {
    q.set("plate", String(clampFelicesNum(st.plate ?? st.activePlateIndex ?? fallbackPlate, FELICES_N, 24)));
    const d = Number(st.dicha ?? st.activeDichaIndex ?? st.felicesDicha);
    if (d >= 1 && d <= 12) q.set("dicha", String(Math.round(d)));
  } else if (work === "evangelios") {
    q.set("week", parseWeekSlug27(st.week || st.evangeliosWeekId) || "s01");
  }
  for (const [k, v] of [
    ["reg", trimFelicesStr(st.reg || st.register).toLowerCase()],
    ["ortho", trimFelicesStr(st.ortho || st.orthographyProfile)],
    ["sheet", trimFelicesStr(st.sheet || st.activeSheet).toLowerCase()],
    ["format", trimFelicesStr(st.format || st.paperFormat).toLowerCase()],
  ]) {
    if (v && v !== "intergeneracional" && v !== "a4") q.set(k, v);
  }
  return `?${q}`;
}

