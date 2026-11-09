import test from "node:test";
import assert from "node:assert/strict";
import {
  modernizeVerseDiachronic,
  countSpanishSyllables,
  computeAnalyticalRegisterMetrics,
} from "./diachronic_register.js";

test("D2-B+: Modernizador diacrónico ejecuta las 3 capas (Tier 1 léxico, Tier 2 morfología, Tier 3 inversión de enclíticos)", () => {
  const archaic =
    "Y díjoles Jehová: Si guardare el mancebo mi pacto, santificólo en su heredad, como habéis dicho.";
  const res = modernizeVerseDiachronic(archaic);

  assert.ok(res.text.includes("les dijo"), `Esperaba inversión enclítica 'les dijo' en: ${res.text}`);
  assert.ok(res.text.includes("lo santificó"), `Esperaba inversión enclítica 'lo santificó' en: ${res.text}`);
  assert.ok(res.text.includes("el Señor"), "Debe reemplazar Jehová -> el Señor (Tier 1)");
  assert.ok(res.text.includes("joven"), "Debe reemplazar mancebo -> joven (Tier 1)");
  assert.ok(res.text.includes("herencia"), "Debe reemplazar heredad -> herencia (Tier 1)");
  assert.ok(res.text.includes("guarda"), "Debe reescribir futuro de subjuntivo guardare -> guarda (Tier 2)");
  assert.ok(res.text.includes("dijeron"), "Debe reescribir habéis dicho -> dijeron (Tier 2)");
  assert.equal(res.encliticInversionsCount, 2);
  assert.equal(res.appliedTiers.length, 3);
});

test("D2-B+: Termómetro analítico calcula AoA <= 11, P_prev >= 0.96, MDD <= 2.6 y Eipen L en [80, 88] tras modernizar", () => {
  assert.equal(countSpanishSyllables("luz"), 1);
  assert.equal(countSpanishSyllables("principio"), 3);

  const archaicVerse =
    "Díjoles el mancebo: menester es ofrecer holocausto en el tabernáculo como habéis visto.";
  const modernVerse = modernizeVerseDiachronic(archaicVerse).text;

  const beforeMetrics = computeAnalyticalRegisterMetrics(archaicVerse, "GEN.2.3");
  const afterMetrics = computeAnalyticalRegisterMetrics(modernVerse, "GEN.2.3");

  assert.ok(afterMetrics.aoaYears < beforeMetrics.aoaYears, "AoA debe disminuir tras modernizar arcaísmos");
  assert.ok(afterMetrics.aoaYears <= 11.0, `AoA moderno (${afterMetrics.aoaYears}) debe ser <= 11.0`);
  assert.ok(afterMetrics.lexicalPrevalence >= 0.96, `Prevalencia (${afterMetrics.lexicalPrevalence}) >= 0.96`);
  assert.ok(afterMetrics.mdd <= 2.6, `MDD (${afterMetrics.mdd}) <= 2.6`);
  assert.ok(
    afterMetrics.eipenL >= 80.0 && afterMetrics.eipenL <= 88.0,
    `Eipen L (${afterMetrics.eipenL}) debe ubicarse en [80, 88]`
  );
  assert.equal(afterMetrics.passesAllGates, true);
});

