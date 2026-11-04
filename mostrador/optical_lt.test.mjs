import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  dlog,
  solitonCdf,
  splitmix32,
  sampleDropletIndices,
  LTEncoder,
  LTDecoder,
  encodeLubyTransformDroplets,
  decodeLubyTransformPeeling,
} from "./optical_lt.js";
import { runModuleWithoutProcess } from "../test_support/no_process_runner.mjs";

test("dlog_matches_log_within_1e6", () => {
  const testValues = [0.01, 0.05, 0.1, 0.25, 0.5, 0.99, 1.0, 1.5, 2.0, 3.14159, 10, 42, 100, 512, 1000];
  for (const x of testValues) {
    const diff = Math.abs(dlog(x) - Math.log(x));
    assert.ok(diff < 1e-6, `Expected |dlog(${x}) - Math.log(${x})| < 1e-6, got ${diff}`);
  }
});

test("soliton_samples_degrees_above_2", () => {
  const K = 32;
  const cdf = solitonCdf(K);
  const degrees = new Set();
  for (let i = 1; i <= 500; i++) {
    const { degree } = sampleDropletIndices(K, i * 2654435761, cdf);
    degrees.add(degree);
  }
  assert.ok(degrees.has(1), "Expected degree 1 to be sampled");
  assert.ok(degrees.has(2), "Expected degree 2 to be sampled");
  assert.ok(
    Array.from(degrees).some((d) => d >= 3),
    `Expected degrees >= 3 to be sampled, got ${Array.from(degrees).join(",")}`,
  );
});

test("recovers_payload_under_30pct_random_drop", () => {
  // 16 KB = 32 blocks of 512 B
  const payload = new Uint8Array(16 * 1024);
  for (let i = 0; i < payload.length; i++) {
    payload[i] = (i * 73 + 19) & 0xff;
  }
  const expectedSha = crypto.createHash("sha256").update(payload).digest("hex");

  const encoder = new LTEncoder(payload, 512);
  const decoder = new LTDecoder(encoder.K, 512, payload.byteLength);
  assert.equal(encoder.K, 32);

  // Emit 64 droplets, deterministically drop 30% (19 droplets dropped, 45 kept)
  // and if still incomplete after 64 due to random drop, continue streaming until decoded.
  const dropRng = splitmix32(0x13572468);
  const emitted = [];
  for (let i = 0; i < 64; i++) {
    emitted.push(encoder.nextDroplet());
  }
  // Select exactly 30% (19 of 64) indices to drop using Fisher-Yates shuffle
  const order = Array.from({ length: 64 }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(dropRng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const droppedSet = new Set(order.slice(0, Math.floor(64 * 0.3)));

  for (let i = 0; i < emitted.length; i++) {
    if (droppedSet.has(i)) continue;
    decoder.addDroplet(emitted[i]);
  }
  // Fountain property: if the 45 surviving droplets left 1-2 blocks unpeeled, a few extra droplets complete it.
  let extra = 0;
  while (!decoder.isComplete() && extra < 32) {
    decoder.addDroplet(encoder.nextDroplet());
    extra += 1;
  }
  assert.equal(decoder.isComplete(), true);
  const reconstructed = decoder.reconstructBytes();
  const actualSha = crypto.createHash("sha256").update(reconstructed).digest("hex");
  assert.equal(actualSha, expectedSha);
});

test("same_seed_produces_identical_indices", () => {
  const K = 32;
  const cdf = solitonCdf(K);
  for (const seed of [1, 42, 0xdeadbeef, 987654321]) {
    const a = sampleDropletIndices(K, seed, cdf);
    const b = sampleDropletIndices(K, seed, cdf);
    assert.deepEqual(a, b);
  }
});

test("legacy_wrapper_roundtrips_blocks", () => {
  const blocks = [69, 75, 79, 86, 79, 90, 33, 42];
  const droplets = encodeLubyTransformDroplets(blocks);
  const recovered = decodeLubyTransformPeeling(droplets, blocks.length);
  assert.deepEqual(recovered, blocks);
});

test("runs_with_process_undefined", () => {
  const out = runModuleWithoutProcess(
    new URL("./optical_lt.js", import.meta.url).href,
    `
      if (Math.abs(mod.dlog(10) - Math.log(10)) > 1e-6) {
        throw new Error("dlog mismatch");
      }
      const droplets = mod.encodeLubyTransformDroplets([1, 2, 3, 4]);
      const rec = mod.decodeLubyTransformPeeling(droplets, 4);
      if (rec.join(",") !== "1,2,3,4") {
        throw new Error("Failed peeling: " + rec.join(","));
      }
      console.log("OK_NO_PROCESS_LT");
    `,
  );
  assert.match(out, /OK_NO_PROCESS_LT/);
});
