import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_ORTHOGRAPHY_PROFILES,
  SCRIPTIO_CONTINUA_7_SCRIPTS,
  ReverseOrthographyMap,
  resolveCanonicalOrthoProfileId,
  transduceTokenWfst,
  transduceVerseWithReverseMap,
  segmentScriptioContinuaSyllables,
} from "./orthography_wfst.js";

test("D1-B+: Reglas contextuales WFST en stp (INALI_2018 <-> ILV_1950) preservan préstamos y contexto vocálico", () => {
  const stpVerse = "Jix kɨɨꞌ guch Xoiꞌkam kilometro kaꞌm";
  const { text, reverseMap } = transduceVerseWithReverseMap(
    stpVerse,
    "stp",
    "tradicional",
    [
      { token: "kɨɨꞌ", strongId: "H2896" },
      { token: "Xoiꞌkam", strongId: "H0430" },
      { token: "kaꞌm", strongId: "H0776" },
    ]
  );

  // k ante ɨ -> qu ("quɨɨ'"), k ante a -> c ("ca'm"),ꞌ -> '
  assert.ok(text.includes("quɨɨ'"), `Esperaba quɨɨ' en "${text}"`);
  assert.ok(text.includes("ca'm"), `Esperaba ca'm en "${text}"`);
  // Mapa inverso O(1) resuelve desde la superficie transducida hacia el Strong ID original
  assert.equal(reverseMap.resolveStrong("quɨɨ'"), "H2896");
  assert.equal(reverseMap.resolveStrong("ca'm"), "H0776");
  assert.equal(reverseMap.resolveCanonical("quɨɨ'"), "kɨɨꞌ");
});

test("D1-B+: Bengalí pluricéntrico (bn-BD vs bn-IN) realiza sustitución léxica real sin prefijo literal '[bn-BD]'", () => {
  const verseBd = "জীবনের পানি ও নিমন্ত্রণ";
  const resIn = transduceVerseWithReverseMap(verseBd, "bn", "bn-IN", [
    { token: "পানি", strongId: "G5204" },
  ]);

  assert.ok(!resIn.text.includes("[bn-IN]"), "Jamás debe anteponer el prefijo literal [bn-IN]");
  assert.ok(!resIn.text.includes("[bn-BD]"), "Jamás debe anteponer el prefijo literal [bn-BD]");
  assert.ok(resIn.text.includes("জল"), "Debe transducir পানি -> জল en bn-IN");
  assert.equal(resIn.reverseMap.resolveStrong("জল"), "G5204");
});

test("D1-B+: Árabe (TASHKEEL_STRIPPED), Uzbeko (CYRL <-> LATN) y Tamazight (TFNG <-> LATN)", () => {
  const arbVowelized = "بِسْمِ اللَّهِ الرَّحْمَٰنِ";
  const arbStripped = transduceTokenWfst(arbVowelized, "arb", "TASHKEEL_STRIPPED");
  assert.ok(!/[\u064B-\u065F]/.test(arbStripped), "Debe remover marcas de tashkeel en árabe");

  const uznCyrl = "ўзбек";
  const uznLatn = transduceTokenWfst(uznCyrl, "uzn", "LATN");
  assert.equal(uznLatn, "oʻzbek");

  const tzmLatn = "aman";
  const tzmTfng = transduceTokenWfst(tzmLatn, "tzm", "TFNG");
  assert.equal(tzmTfng, "ⴰⵎⴰⵏ");
});

test("D1-B+: Segmentador silábico para las 7 escrituras Scriptio Continua (Hans, Hant, Jpan, Thai, Laoo, Khmr, Mymr)", () => {
  assert.equal(SCRIPTIO_CONTINUA_7_SCRIPTS.length, 7);
  const segmentedHans = segmentScriptioContinuaSyllables("太初有道", "Hans");
  assert.ok(segmentedHans.includes("\u200B"), "Debe insertar fronteras U+200B en escritura Hans");
  const segmentedThai = segmentScriptioContinuaSyllables("ในปฐมกาล", "Thai");
  assert.ok(segmentedThai.includes("\u200B"), "Debe insertar fronteras U+200B en escritura Thai");
  assert.ok(CANONICAL_ORTHOGRAPHY_PROFILES.stp);
  assert.equal(resolveCanonicalOrthoProfileId("bn", "bn-IN"), "bn-IN");
});

test("D1-R37 (SLICE-115): Tokenización JIT en el versículo activo (.bible-word-token) y consulta inversa O(1) a Strong ID", async () => {
  const { renderChapterPreviewHtml, lookupWordTokenStrongEntry } = await import(
    "./bridge_and_chapter.js"
  );
  const reverseMap = new ReverseOrthographyMap("stp", "tradicional");
  reverseMap.registerTokenPair("kɨɨꞌ", "quɨɨ'", "H2896");
  reverseMap.registerTokenPair("Xoiꞌkam", "Xoi'cam", "H0430");

  const resolved = lookupWordTokenStrongEntry("quɨɨ',", 0, reverseMap, []);
  assert.equal(resolved.surface, "quɨɨ'");
  assert.equal(resolved.canonical, "kɨɨꞌ");
  assert.equal(resolved.strongId, "H2896");

  const html = renderChapterPreviewHtml(
    "GEN",
    1,
    "stp",
    {
      verses: {
        "1": "Jix kɨɨꞌ guch Xoiꞌkam",
        "2": "Gio baꞌ jum duu",
      },
    },
    null,
    {
      selectedVerse: 1,
      orthographyProfile: "tradicional",
      reverseMap,
      tokenStrongPairs: [
        { token: "kɨɨꞌ", strongId: "H2896" },
        { token: "Xoiꞌkam", strongId: "H0430" },
      ],
    }
  );

  assert.ok(
    html.includes('class="bible-word-token"'),
    "El versículo activo debe tokenizarse con .bible-word-token"
  );
  assert.ok(
    html.includes('data-strong-id="H2896"'),
    "El token transducido debe conservar su Strong ID resuelto en O(1)"
  );
  assert.ok(
    !html.includes('data-verse="2" data-osis="GEN.1.2" data-strong-id'),
    "Los versículos inactivos NO deben inflar el DOM con spans por palabra"
  );
});


