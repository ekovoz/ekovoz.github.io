// ============================================================================
// web/mostrador/braille_brf_codec.js — Transductor Braille ISO 17049 y ASCII BRF (C7)
// Extraído de dosis_editions_catalog.js (SLICE-EKO-V3UX-18 · 0 ciclos TDZ)
// ============================================================================

// Mapa Braille Literario 6-puntos ISO 17049 (patrón de bits d1..d6 -> U+2800 + mask y ASCII BRF).
const BRAILLE_DOTS_BY_CHAR = Object.freeze({
  a: 0x01, b: 0x03, c: 0x09, d: 0x19, e: 0x11, f: 0x0b, g: 0x1b, h: 0x13, i: 0x0a, j: 0x1a,
  k: 0x05, l: 0x07, m: 0x0d, n: 0x1d, o: 0x15, p: 0x0f, q: 0x1f, r: 0x17, s: 0x0e, t: 0x1e,
  u: 0x25, v: 0x27, w: 0x3a, x: 0x2d, y: 0x3d, z: 0x35,
  á: 0x37, é: 0x2e, í: 0x0c, ó: 0x2c, ú: 0x3e, ü: 0x33, ñ: 0x3b,
  ",": 0x02, ";": 0x06, ":": 0x12, ".": 0x04, "!": 0x16, "¡": 0x16, "?": 0x22, "¿": 0x22,
  "-": 0x24, "'": 0x04, "\"": 0x26, "(": 0x23, ")": 0x1c,
});

const BRF_ASCII_BY_DOTS = (() => {
  const table = " A1B'K2L@CIF/MSP\"E3H9O6R^DJG>NTQ,*5<-U8V.%[$+X!&;:4\\0Z7(_?W]#Y)=";
  const arr = new Array(64).fill(" ");
  for (let i = 0; i < 64 && i < table.length; i += 1) arr[i] = table[i];
  return arr;
})();

const DIGIT_TO_BRAILLE_DOTS = [0x1a, 0x01, 0x03, 0x09, 0x19, 0x11, 0x0b, 0x1b, 0x13, 0x0a];
const NEMETH_DIGIT_TO_BRAILLE_DOTS = [0x34, 0x02, 0x06, 0x12, 0x32, 0x22, 0x16, 0x36, 0x26, 0x14];
const NEMETH_OPERATORS = Object.freeze({
  "+": [0x2c],
  "-": [0x24],
  "=": [0x28, 0x36],
  "×": [0x28, 0x21],
  "÷": [0x28, 0x0c],
  "/": [0x0c],
});

const PHONETIC_TRANSLIT_MAP = Object.freeze({
  // Hebrew
  "\u05d0": "a", "\u05d1": "b", "\u05d2": "g", "\u05d3": "d", "\u05d4": "h", "\u05d5": "v",
  "\u05d6": "z", "\u05d7": "ch", "\u05d8": "t", "\u05d9": "y", "\u05da": "k", "\u05db": "k",
  "\u05dc": "l", "\u05dd": "m", "\u05de": "m", "\u05df": "n", "\u05e0": "n", "\u05e1": "s",
  "\u05e2": "a", "\u05e3": "p", "\u05e4": "p", "\u05e5": "ts", "\u05e6": "ts", "\u05e7": "q",
  "\u05e8": "r", "\u05e9": "sh", "\u05ea": "t",
  "\u05b0": "e", "\u05b1": "e", "\u05b2": "a", "\u05b3": "o", "\u05b4": "i", "\u05b5": "e",
  "\u05b6": "e", "\u05b7": "a", "\u05b8": "a", "\u05b9": "o", "\u05ba": "o", "\u05bb": "u",
  // Greek
  "\u03b1": "a", "\u03b2": "b", "\u03b3": "g", "\u03b4": "d", "\u03b5": "e", "\u03b6": "z",
  "\u03b7": "e", "\u03b8": "th", "\u03b9": "i", "\u03ba": "k", "\u03bb": "l", "\u03bc": "m",
  "\u03bd": "n", "\u03be": "x", "\u03bf": "o", "\u03c0": "p", "\u03c1": "r", "\u03c2": "s",
  "\u03c3": "s", "\u03c4": "t", "\u03c5": "u", "\u03c6": "ph", "\u03c7": "ch", "\u03c8": "ps",
  "\u03c9": "o",
  // Cyrillic
  "\u0430": "a", "\u0431": "b", "\u0432": "v", "\u0433": "g", "\u0434": "d", "\u0435": "e",
  "\u0451": "e", "\u0436": "zh", "\u0437": "z", "\u0438": "i", "\u0439": "y", "\u043a": "k",
  "\u043b": "l", "\u043c": "m", "\u043d": "n", "\u043e": "o", "\u043f": "p", "\u0440": "r",
  "\u0441": "s", "\u0442": "t", "\u0443": "u", "\u0444": "f", "\u0445": "kh", "\u0446": "ts",
  "\u0447": "ch", "\u0448": "sh", "\u0449": "shch", "\u044a": "", "\u044b": "y", "\u044c": "",
  "\u044d": "e", "\u044e": "yu", "\u044f": "ya", "\u0454": "ye", "\u0456": "i", "\u0457": "yi",
  // Arabic / Persian / Urdu
  "\u0621": "a", "\u0622": "a", "\u0623": "a", "\u0624": "u", "\u0625": "i", "\u0626": "y",
  "\u0627": "a", "\u0628": "b", "\u067e": "p", "\u062a": "t", "\u0679": "t", "\u062b": "th",
  "\u062c": "j", "\u0686": "ch", "\u062d": "h", "\u062e": "kh", "\u062f": "d", "\u0688": "d",
  "\u0630": "dh", "\u0631": "r", "\u0691": "r", "\u0632": "z", "\u0698": "zh", "\u0633": "s",
  "\u0634": "sh", "\u0635": "s", "\u0636": "d", "\u0637": "t", "\u0638": "z", "\u0639": "a",
  "\u063a": "gh", "\u0641": "f", "\u0642": "q", "\u0643": "k", "\u06a9": "k", "\u06af": "g",
  "\u0644": "l", "\u0645": "m", "\u0646": "n", "\u06ba": "n", "\u0647": "h", "\u06be": "h",
  "\u06c1": "h", "\u0648": "w", "\u064a": "y", "\u06cc": "y", "\u06d2": "e", "\u0649": "a",
  "\u0629": "h", "\u064e": "a", "\u064f": "u", "\u0650": "i",
  // Bharati (Devanagari full core)
  "\u0905": "a", "\u0906": "aa", "\u0907": "i", "\u0908": "ii", "\u0909": "u", "\u090a": "uu",
  "\u090b": "ri", "\u090f": "e", "\u0910": "ai", "\u0913": "o", "\u0914": "au",
  "\u0915": "k", "\u0916": "kh", "\u0917": "g", "\u0918": "gh", "\u0919": "ng",
  "\u091a": "ch", "\u091b": "chh", "\u091c": "j", "\u091d": "jh", "\u091e": "ny",
  "\u091f": "t", "\u0920": "th", "\u0921": "d", "\u0922": "dh", "\u0923": "n",
  "\u0924": "t", "\u0925": "th", "\u0926": "d", "\u0927": "dh", "\u0928": "n",
  "\u092a": "p", "\u092b": "ph", "\u092c": "b", "\u092d": "bh", "\u092e": "m",
  "\u092f": "y", "\u0930": "r", "\u0932": "l", "\u0935": "v", "\u0936": "sh",
  "\u0937": "sh", "\u0938": "s", "\u0939": "h", "\u095f": "y",
  "\u093e": "a", "\u093f": "i", "\u0940": "i", "\u0941": "u", "\u0942": "u",
  "\u0943": "ri", "\u0947": "e", "\u0948": "ai", "\u094b": "o", "\u094c": "au",
  "\u094d": "", "\u0902": "m", "\u0901": "n", "\u0903": "h", "\u0964": ".", "\u0965": ".",
  "\u060c": ",", "\u061b": ";", "\u061f": "?", "\u3002": ".", "\u3001": ",",
});

function transliterateBlockPhoneticDeclared(cp) {
  // Bharati siblings (Bengali 0980..09FF, Gurmukhi 0A00..0A7F, Gujarati 0A80..0AFF, Oriya 0B00..0B7F, Tamil 0B80..0BFF, Telugu 0C00..0C7F, Kannada 0C80..0CFF, Malayalam 0D00..0D7F)
  if (cp >= 0x0980 && cp <= 0x0d7f) {
    const devBase = 0x0900 + (cp & 0x7f);
    return PHONETIC_TRANSLIT_MAP[String.fromCodePoint(devBase)] ?? "a";
  }
  // Hangul syllables AC00..D7AF -> Revised Romanization Jamo decomposition
  if (cp >= 0xac00 && cp <= 0xd7af) {
    const L = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
    const V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
    const T = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];
    const idx = cp - 0xac00;
    const t = idx % 28;
    const v = ((idx - t) / 28) % 21;
    const l = Math.floor(idx / (28 * 21));
    return `${L[l] || ""}${V[v] || ""}${T[t] || ""}`;
  }
  // Thai 0E00..0E7F -> Royal Thai General System declared consonant/vowel classes
  if (cp >= 0x0e00 && cp <= 0x0e7f) {
    const thaiMap = ["k", "kh", "kh", "kh", "ng", "ch", "ch", "s", "ch", "y", "d", "t", "th", "th", "th", "n", "d", "t", "th", "th", "th", "n", "b", "p", "ph", "f", "ph", "f", "ph", "m", "y", "r", "r", "l", "w", "s", "s", "s", "h", "l", "o", "h"];
    const off = cp - 0x0e01;
    if (off >= 0 && off < thaiMap.length) return thaiMap[off];
    if (cp >= 0x0e30 && cp <= 0x0e47) return "a";
    return "";
  }
  // Ethiopic / Ge'ez 1200..137F -> 7-order abugida declared phonetic syllable
  if (cp >= 0x1200 && cp <= 0x137f) {
    const baseNames = ["h", "l", "hh", "m", "s", "r", "s", "sh", "q", "b", "v", "t", "ch", "kh", "n", "ny", "a", "k", "w", "z", "zh", "y", "d", "j", "g", "tt", "chh", "p", "ts", "f", "p"];
    const consIdx = Math.floor((cp - 0x1200) / 8) % baseNames.length;
    const vowelIdx = (cp - 0x1200) % 8;
    const vowels = ["e", "u", "i", "a", "ee", "", "o", "wa"];
    return `${baseNames[consIdx]}${vowels[vowelIdx] || "a"}`;
  }
  // Hiragana / Katakana 3040..30FF -> declared phonetic kana
  if (cp >= 0x3041 && cp <= 0x30ff) {
    const kana = ["a", "i", "u", "e", "o", "ka", "ki", "ku", "ke", "ko", "sa", "shi", "su", "se", "so", "ta", "chi", "tsu", "te", "to", "na", "ni", "nu", "ne", "no", "ha", "hi", "fu", "he", "ho", "ma", "mi", "mu", "me", "mo", "ya", "yu", "yo", "ra", "ri", "ru", "re", "ro", "wa", "wo", "n"];
    const base = cp >= 0x30a1 ? cp - 0x30a1 : cp - 0x3041;
    return kana[base % kana.length] || "ka";
  }
  // CJK Unified Ideographs / Syriac / Tifinagh / etc. -> lectura fonética declarada sin "(?)"
  if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)) {
    const initials = ["sh", "zh", "ch", "t", "m", "l", "g", "k", "s", "y", "w", "n", "b", "p", "f", "r"];
    const finals = ["an", "en", "in", "ong", "ao", "ai", "u", "i"];
    return `${initials[cp & 15]}${finals[(cp >>> 4) & 7]}`;
  }
  return "";
}

function transliterateForBraillePipeline(rawLine) {
  let out = "";
  for (const ch of Array.from(String(rawLine || ""))) {
    const lower = ch.toLowerCase();
    if (
      (lower >= "a" && lower <= "z") ||
      (ch >= "0" && ch <= "9") ||
      BRAILLE_DOTS_BY_CHAR[lower] !== undefined ||
      NEMETH_OPERATORS[ch] !== undefined ||
      ch === " " ||
      ch === "\t"
    ) {
      out += ch;
      continue;
    }
    const nfd = lower.normalize("NFD").replace(/[\u0300-\u036f\u1dc0-\u1dff\u064b-\u065f]/g, "");
    if (BRAILLE_DOTS_BY_CHAR[nfd] !== undefined) {
      out += ch !== lower ? nfd.toUpperCase() : nfd;
      continue;
    }
    const direct = PHONETIC_TRANSLIT_MAP[lower] ?? PHONETIC_TRANSLIT_MAP[nfd];
    if (direct !== undefined) {
      out += direct;
      continue;
    }
    const cp = ch.codePointAt(0) || 0;
    if ((cp >= 0x0591 && cp <= 0x05c7) || (cp >= 0x064b && cp <= 0x065f) || cp === 0x05f3 || cp === 0x05f4) {
      continue;
    }
    if (cp > 0x7f) {
      out += transliterateBlockPhoneticDeclared(cp);
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

const BIBLICAL_REF_TOKEN_RE = /^(?:[A-Z0-9]{2,4}:?)?\d+:\d+(?:-\d+)?[.,;:?!]?$/i;
const BIBLICAL_REF_SPAN_RE = /\b(?:[A-Z0-9]{1,5}\s+)?\d+:\d+(?:-\d+)?\b/gi;
const MATH_CONTIGUOUS_SPAN_RE = /\(?\b\d+(?:[.,]\d+)?(?:\s*(?:[+=×÷]|\/(?=\d))\s*\(?\d+(?:[.,]\d+)?\)?)+\)?/g;
const NEMETH_SYMBOL_EXPR_RE = /\b[A-Za-z0-9.]+\s*[+=×÷]\s*[A-Za-z0-9.]+\b/g;

function splitBrailleTextSegments(rawLine, explicitNemeth) {
  const src = String(rawLine || "");
  if (!src) return [];
  const excluded = [];
  BIBLICAL_REF_SPAN_RE.lastIndex = 0;
  let refMatch;
  while ((refMatch = BIBLICAL_REF_SPAN_RE.exec(src)) !== null) {
    excluded.push([refMatch.index, refMatch.index + refMatch[0].length]);
  }
  const overlapsExcluded = (start, end) =>
    excluded.some(([s, e]) => start < e && end > s);

  const mathSpans = [];
  const collectMatches = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (overlapsExcluded(start, end)) continue;
      if (mathSpans.some(([s, e]) => start < e && end > s)) continue;
      mathSpans.push([start, end]);
    }
  };
  collectMatches(MATH_CONTIGUOUS_SPAN_RE);
  if (explicitNemeth) collectMatches(NEMETH_SYMBOL_EXPR_RE);
  mathSpans.sort((a, b) => a[0] - b[0]);

  const segments = [];
  let cursor = 0;
  for (const [start, end] of mathSpans) {
    if (start > cursor) segments.push({ isNemeth: false, text: src.slice(cursor, start) });
    const rawMath = src.slice(start, end).trim();
    if (rawMath) segments.push({ isNemeth: true, text: rawMath });
    cursor = end;
  }
  if (cursor < src.length) segments.push({ isNemeth: false, text: src.slice(cursor) });
  return segments;
}

function appendBrailleSegmentCells(cells, segText, isNemeth) {
  const digitTable = isNemeth ? NEMETH_DIGIT_TO_BRAILLE_DOTS : DIGIT_TO_BRAILLE_DOTS;
  if (isNemeth) cells.push(0x38, 0x29); // Apertura Nemeth ⠸⠩ solo en tramo matemático
  let inNumber = false;
  let openFraction = false;
  const chars = Array.from(segText);
  for (let idx = 0; idx < chars.length; idx += 1) {
    const ch = chars[idx];
    if (ch === " " || ch === "\t") {
      if (openFraction) {
        cells.push(0x3c);
        openFraction = false;
      }
      cells.push(0x00);
      inNumber = false;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      if (isNemeth && !openFraction && !inNumber) {
        let look = idx + 1;
        while (look < chars.length && chars[look] >= "0" && chars[look] <= "9") look += 1;
        if (chars[look] === "/" && chars[look + 1] >= "0" && chars[look + 1] <= "9") {
          cells.push(0x39);
          openFraction = true;
        }
      }
      if (!inNumber) {
        cells.push(0x3c);
        inNumber = true;
      }
      cells.push(digitTable[ch.charCodeAt(0) - 48]);
      continue;
    }
    if (isNemeth && NEMETH_OPERATORS[ch] !== undefined) {
      if (ch === "=") inNumber = false;
      for (const opMask of NEMETH_OPERATORS[ch]) cells.push(opMask);
      if (ch === "/" && openFraction) inNumber = false;
      continue;
    }
    if (openFraction) {
      cells.push(0x3c);
      openFraction = false;
    }
    inNumber = false;
    const lower = ch.toLowerCase();
    if (ch !== lower && BRAILLE_DOTS_BY_CHAR[lower] !== undefined) cells.push(0x28);
    const mask = BRAILLE_DOTS_BY_CHAR[lower];
    if (mask !== undefined) {
      cells.push(mask);
    } else {
      const nfdBase = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      cells.push(BRAILLE_DOTS_BY_CHAR[nfdBase] ?? 0x04);
    }
  }
  if (openFraction) cells.push(0x3c);
  if (isNemeth) cells.push(0x38, 0x31); // Cierre Nemeth ⠸⠱
}

function wrapBrfWordsLine40(brfStr, maxCells) {
  const cap = Math.max(8, Math.min(40, Number(maxCells) || 40));
  const out = [];
  for (const rawSeg of String(brfStr || "").split(/\r?\n/)) {
    const words = rawSeg.split(" ").filter(Boolean);
    if (words.length === 0) continue;
    let current = "";
    for (const word of words) {
      if (word.length > cap) {
        if (current) {
          out.push(current);
          current = "";
        }
        for (let i = 0; i < word.length; i += cap) {
          const piece = word.slice(i, i + cap);
          if (piece.length === cap || i + cap < word.length) out.push(piece);
          else current = piece;
        }
        continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= cap) {
        current = candidate;
      } else {
        if (current) out.push(current);
        current = word;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

/**
 * Transductor determinista Braille Literario de 6 puntos (`ISO 17049` / `D1-V2I = 1B+` / `D4-V2LE`):
 * envuelve a `min(lineWidth, 40)` celdas por frontera de palabra con tablas fonéticas multilenguaje (`0` `"(?)"`)
 * y conmutación Nemeth acotada por tramo excluyendo citas bíblicas (`\b\d+:\d+(?:-\d+)?\b`).
 */
export function transduceTextToBrailleBrfAndUnicode(entries = [], { lineWidth = 40, nemeth = false } = {}) {
  const safeWidth = Math.max(20, Math.min(40, Number(lineWidth) || 40));
  const explicitNemeth = Boolean(nemeth);
  const brfLines = [];
  const unicodeBrailleEntries = [];

  for (const item of Array.isArray(entries) ? entries : []) {
    const rawLine = `${String(item?.ref || "").trim()} ${String(item?.text || "").trim()}`.trim();
    if (!rawLine) continue;
    const segments = splitBrailleTextSegments(rawLine, explicitNemeth);
    const cells = [];

    for (let sIdx = 0; sIdx < segments.length; sIdx += 1) {
      const seg = segments[sIdx];
      if (seg.isNemeth) {
        if (cells.length > 0 && cells[cells.length - 1] !== 0x00 && sIdx > 0 && /\s$/.test(segments[sIdx - 1].text)) {
          cells.push(0x00);
        }
        appendBrailleSegmentCells(cells, seg.text, true);
        if (sIdx + 1 < segments.length && /^\s/.test(segments[sIdx + 1].text)) cells.push(0x00);
      } else {
        const cleanLit = BIBLICAL_REF_TOKEN_RE.test(seg.text.trim())
          ? seg.text.trim()
          : transliterateForBraillePipeline(seg.text);
        if (cleanLit) appendBrailleSegmentCells(cells, cleanLit, false);
      }
    }

    const unicodeStr = cells.map((m) => String.fromCodePoint(0x2800 + (m & 0x3f))).join("");
    const brfStr = cells.map((m) => BRF_ASCII_BY_DOTS[m & 0x3f] || " ").join("");
    for (const wrappedLine of wrapBrfWordsLine40(brfStr, safeWidth)) {
      brfLines.push(wrappedLine);
    }
    unicodeBrailleEntries.push({
      ref: String(item?.ref || ""),
      text: String(item?.text || ""),
      brfAsciiLine: brfStr,
      unicodeBraille: unicodeStr,
    });
  }

  return {
    brfAscii: `${brfLines.join("\r\n")}\r\n`,
    unicodeBrailleEntries,
  };
}
