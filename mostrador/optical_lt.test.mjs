import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  dlog,
  solitonCdf,
  splitmix32,
  sampleDropletIndices,
  whitenBlockXor,
  LTEncoder,
  LTDecoder,
  encodeLubyTransformDroplets,
  decodeLubyTransformPeeling,
  encodeDropletToMatrixGrid,
  renderDropletMatrixSvgOrCanvas,
  computeSaddleStitchImpositionPlan,
  verifyManifestAndMerkleAudit,
  OPTICAL_CADENCE_PRESETS,
  createRelayEncoderFromDecoded,
  NYQUIST_MIN_FPS,
  NYQUIST_MAX_FPS,
  NYQUIST_DEFAULT_FPS,
  validateNyquistOpticalFps,
  encodeCornerToggleMarker,
  extractCornerToggleBit,
  encodeEco1BinaryPacket,
  encodeEcomMetadataPacket,
  decodeEcoBinaryPacket,
  QrStreamSession,
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

test("systematic_first_pass_completes_in_exactly_K_droplets_when_zero_loss", () => {
  const payload = new Uint8Array(4096);
  for (let i = 0; i < payload.length; i++) payload[i] = (i * 31 + 7) & 0xff;
  const encoder = new LTEncoder(payload, 512);
  const decoder = new LTDecoder(encoder.K, 512, payload.byteLength);
  assert.equal(encoder.K, 8);
  for (let i = 0; i < encoder.K; i++) {
    const drop = encoder.nextDroplet();
    assert.equal(drop.systematic, true);
    assert.equal(drop.degree, 1);
    assert.deepEqual(drop.indices, [i]);
    if (i === 0) assert.ok(drop.meta && drop.meta.cadenceFps === 6.67);
    decoder.addDroplet(drop);
  }
  assert.equal(decoder.isComplete(), true);
  assert.deepEqual(decoder.reconstructBytes(), payload);
});

test("whiten_block_xor_eliminates_zero_runs_and_is_self_inverse", () => {
  const zeroBlock = new Uint8Array(256);
  const whitened = whitenBlockXor(zeroBlock, 0x12345678);
  const nonZeroCount = whitened.reduce((acc, b) => acc + (b !== 0 ? 1 : 0), 0);
  assert.ok(nonZeroCount > 240, `Expected whitened zero-block to break zero runs, got ${nonZeroCount}/256 non-zero`);
  const restored = whitenBlockXor(whitened, 0x12345678);
  assert.deepEqual(restored, zeroBlock);
});

test("qrbeam_matrix_grid_4th_corner_parity_saddle_stitch_4n_and_merkle_audit", () => {
  const droplets = encodeLubyTransformDroplets([10, 20, 30, 40, 50, 60, 70, 80]);
  const grid0 = encodeDropletToMatrixGrid(droplets[0], 29);
  const grid1 = encodeDropletToMatrixGrid(droplets[1], 29);

  assert.equal(grid0.gridSize, 29);
  assert.equal(grid0.parityBit, 0);
  assert.equal(grid1.parityBit, 1);
  assert.notDeepEqual(grid0.cells, grid1.cells, "Consecutive QRBeam frames must mutate matrix cells");

  const svg0 = renderDropletMatrixSvgOrCanvas(grid0, null);
  assert.match(svg0, /data-qrbeam-seq="0"/);
  assert.match(svg0, /data-qrbeam-parity="0"/);

  // 8B++: Saddle-Stitch 4n imposition with creep and RTL spine inversion
  const planLtr = computeSaddleStitchImpositionPlan({ totalPages: 14, paperThicknessMm: 0.1, rtl: false });
  assert.equal(planLtr.paddedPages, 16);
  assert.equal(planLtr.blankPagesAdded, 2);
  assert.equal(planLtr.sheetCount, 4);
  assert.equal(planLtr.integrityVerified, true);
  assert.deepEqual(planLtr.sheets[0].front, [16, 1]);

  const planRtl = computeSaddleStitchImpositionPlan({ totalPages: 16, paperThicknessMm: 0.1, rtl: true });
  assert.equal(planRtl.integrityVerified, true);
  assert.deepEqual(planRtl.sheets[0].front, [1, 16], "RTL must invert outer spine pair");
  assert.ok(planRtl.maxCreepMm > 0);

  // 7B++: Manifest and Merkle root audit
  const audit = verifyManifestAndMerkleAudit({
    manifest: { entries: [{ lang: "es", path: "data/blocks/es/2col-letter/B01.pdf", sha256: "a".repeat(64) }] },
    merkleRootHex: "b".repeat(64),
    lang: "es",
    book: "ROM",
    chapter: 1,
  });
  assert.equal(audit.verified, true);
  assert.equal(audit.merkleRootHex, "b".repeat(64));
});

test("gaussian_gf2_elimination_resolves_stopping_sets_without_degree1_and_supports_relay", () => {
  const b0 = new Uint8Array([10, 20, 30, 40]);
  const b1 = new Uint8Array([1, 2, 3, 4]);
  const b2 = new Uint8Array([99, 88, 77, 66]);
  const b3 = new Uint8Array([7, 14, 21, 28]);
  const xorBlocks = (...arrs) => {
    const out = new Uint8Array(4);
    for (const a of arrs) for (let i = 0; i < 4; i++) out[i] ^= a[i];
    return out;
  };

  // All droplets have degree >= 2 (pure Peeling Decoder would stall with 0 blocks decoded!)
  const decoder = new LTDecoder(4, 4, 16);
  decoder.addDroplet({ indices: [0, 1], data: xorBlocks(b0, b1) });
  decoder.addDroplet({ indices: [1, 2], data: xorBlocks(b1, b2) });
  decoder.addDroplet({ indices: [2, 3], data: xorBlocks(b2, b3) });
  decoder.addDroplet({ indices: [0, 1, 3], data: xorBlocks(b0, b1, b3) });

  assert.equal(decoder.isComplete(), true, "GF(2) Gaussian Elimination must resolve full-rank degree>=2 stopping set");
  const rec = decoder.reconstructBytes();
  assert.deepEqual(Array.from(rec), [...b0, ...b1, ...b2, ...b3]);

  const relay = createRelayEncoderFromDecoded(decoder, 4);
  assert.ok(relay);
  assert.equal(relay.K, 4);
  assert.equal(OPTICAL_CADENCE_PRESETS["10"].intervalMs, 100);
  assert.equal(OPTICAL_CADENCE_PRESETS["6.67"].intervalMs, 150);
});

test("d6_b_plus_eco1_ecom_binary_protocol_nyquist_bounds_corner_toggle_and_qr_stream_session", () => {
  // 1. Nyquist cadence bounds [6.0, 7.5] fps
  assert.equal(NYQUIST_MIN_FPS, 6.0);
  assert.equal(NYQUIST_MAX_FPS, 7.5);
  assert.equal(NYQUIST_DEFAULT_FPS, 6.67);
  assert.equal(validateNyquistOpticalFps(6.67).valid, true);
  assert.equal(validateNyquistOpticalFps(12.0).valid, false);
  assert.equal(validateNyquistOpticalFps(12.0).clampedFps, 7.5);

  // 2. Corner toggle markers (0xA5 even, 0x5A odd)
  assert.equal(encodeCornerToggleMarker(0), 0xa5);
  assert.equal(encodeCornerToggleMarker(1), 0x5a);
  assert.equal(extractCornerToggleBit(0xa5), 0);
  assert.equal(extractCornerToggleBit(0x5a), 1);
  assert.equal(extractCornerToggleBit(0x00), null);

  // 3. ECOM + ECO1 binary packet roundtrip and QrStreamSession multi-frame assembly
  const payload = new Uint8Array(1024);
  for (let i = 0; i < payload.length; i += 1) payload[i] = (i * 17 + 3) & 0xff;
  const encoder = new LTEncoder(payload, 256);
  const session = new QrStreamSession({ streamId: 77, totalChunks: encoder.K, blockSize: 256, totalBytes: 1024 });

  const ecomPkt = encodeEcomMetadataPacket({
    streamId: 77,
    seq: 0,
    totalBytes: 1024,
    totalChunks: encoder.K,
    blockSize: 256,
    sha256Hex: "a".repeat(64),
    filename: "GEN_1.eco",
  });
  const ecomRes = session.ingestPacket(ecomPkt);
  assert.equal(ecomRes.accepted, true);
  assert.equal(ecomRes.kind, "ECOM");
  assert.equal(session.metadata.filename, "GEN_1.eco");

  for (let s = 0; s < encoder.K; s += 1) {
    const drop = encoder.nextDroplet();
    const pkt = encodeEco1BinaryPacket({
      streamId: 77,
      seq: drop.seq,
      totalChunks: encoder.K,
      degree: drop.degree,
      indices: drop.indices,
      payloadBytes: drop.data,
    });
    const res1 = session.ingestPacket(pkt);
    assert.equal(res1.accepted, true);
    // Simulate duplicate rolling-shutter capture of same frame
    const resDup = session.ingestPacket(pkt);
    assert.equal(resDup.accepted, false);
    assert.equal(resDup.reason, "DUPLICATE_ROLLING_SHUTTER_FRAME");
  }

  assert.equal(session.duplicateFramesDropped, encoder.K);
  assert.equal(session.isComplete(), true);
  assert.deepEqual(session.finalizeStream(), payload);
});

test("R45_SLICE_184_sampleDegree_demoted_to_private", async () => {
  const ns = await import("./optical_lt.js");
  assert.equal(ns.sampleDegree, undefined, "DEB-R45-10: sampleDegree must be module-private");
});



