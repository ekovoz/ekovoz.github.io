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

