// The seam check of «یک دور» and the loop's own clock, with small made-up signals: no browser, no ffmpeg, no render.
//   node --test tests/seam.test.mjs        (Node 23.6 or later: loop-time.ts is read with type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEAM, audioSeam, seamChecks, seamVerdict } from "../seam.mjs";
import { seamless } from "../music.mjs";
import { LOOP_FRAMES, at, badgeAt, cuesOf, drawingAt, progressAt, timesAt, wave } from "../src/loop-time.ts";

const RATE = 48000;
const sine = (seconds, hz, amp = 0.5, phase = 0) => Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / RATE + phase));
const byId = (checks) => Object.fromEntries(checks.map((c) => [c.id, c]));

test("a sine of a whole number of periods meets itself: level and click pass", () => {
  // 100 Hz for 1 s: 100 whole periods, the last sample runs into the first
  const a = audioSeam(sine(1, 100), RATE);
  assert.ok(a.jumpDb < 0.5, `level jump ${a.jumpDb}`);
  assert.ok(a.click < 0.05 && a.step <= SEAM.stepTimes, `click ${a.click}, step ${a.step}`);
  const c = byId(seamChecks({ ssim: 0.99, audio: a }));
  assert.ok(c["seam-video"].ok && c["seam-level"].ok && c["seam-click"].ok);
});

test("a sine cut mid-period clicks at the wrap", () => {
  // 100 Hz for 1.0025 s: a quarter period over, the wrap jumps from the crest to zero
  const a = audioSeam(sine(1.0025, 100), RATE);
  const c = byId(seamChecks({ ssim: 0.99, audio: a }));
  assert.equal(c["seam-click"].ok, false, c["seam-click"].detail);
});

test("a bed that fades out at the end steps in level at the wrap", () => {
  const pcm = sine(1, 100);
  for (let i = pcm.length - 4800; i < pcm.length; i += 1) pcm[i] *= 0.2;
  const c = byId(seamChecks({ ssim: 0.99, audio: audioSeam(pcm, RATE) }));
  assert.equal(c["seam-level"].ok, false, c["seam-level"].detail);
});

test("silence on both sides passes; a picture that does not come back fails, in plain Persian", () => {
  const quiet = byId(seamChecks({ ssim: 0.99, audio: audioSeam(new Float32Array(RATE), RATE) }));
  assert.ok(quiet["seam-level"].ok && quiet["seam-click"].ok);
  const checks = seamChecks({ ssim: 0.9, audio: audioSeam(sine(1, 100), RATE) });
  assert.equal(byId(checks)["seam-video"].ok, false);
  assert.match(seamVerdict(checks), /فریم آخر حلقه/);
  assert.equal(byId(seamChecks({ ssim: 0.99, audio: null }))["seam-sound"].ok, false);
});

test("the bed folded by music.mjs seamless() has no click and no step at its wrap", () => {
  // 7.3 Hz-off tone: the raw cut would click; the folded turn must not
  const total = Math.round(0.977 * RATE);
  const cross = Math.round(0.4 * RATE);
  const raw = sine((total + cross) / RATE, 173, 0.5, 0.4);
  const cut = audioSeam(raw.subarray(0, total), RATE);
  assert.equal(byId(seamChecks({ ssim: 1, audio: cut }))["seam-click"].ok, false, "the raw cut should click");
  const { L } = seamless(raw, raw, total, cross);
  const folded = byId(seamChecks({ ssim: 1, audio: audioSeam(L, RATE) }));
  assert.ok(folded["seam-click"].ok, folded["seam-click"].detail);
  assert.ok(folded["seam-level"].ok, folded["seam-level"].detail);
});

test("the loop's clock: every value at the last frame's successor equals frame 0", () => {
  for (const N of [LOOP_FRAMES, 270, 420]) {
    for (const fn of [progressAt, timesAt, drawingAt, badgeAt]) assert.ok(Math.abs(fn(0, N) - fn(N, N)) < 1e-9, `${fn.name} at ${N}`);
    for (const k of [1, 2, 5]) assert.ok(Math.abs(wave(0, N, k) - wave(N, N, k)) < 1e-9);
    // the hook: the full line and «… برابر» on the first frame, no badge
    assert.equal(progressAt(0, N), 1);
    assert.equal(timesAt(0, N), 1);
    assert.equal(badgeAt(0, N), 0);
    assert.equal(badgeAt(N - 1, N), 0);
    // the line is really drawn again in between
    assert.ok(progressAt(at("draw", N), N) < 0.01);
    // small steps from frame to frame, also across the seam
    for (let f = 0; f < N; f += 1) assert.ok(Math.abs(progressAt(f + 1, N) - progressAt(f, N)) < 0.12, `progress jumps at ${f}`);
  }
});

test("the loop's effects stay off the seam, at most two in a second", () => {
  const cues = cuesOf([70, 75, 90, 120, 150, 200, 230], LOOP_FRAMES);
  assert.ok(cues.every((c) => c.at >= 30 && c.at <= 270), JSON.stringify(cues));
  for (const a of cues) assert.ok(cues.filter((b) => b.at >= a.at && b.at < a.at + 30).length <= 2, `dense at ${a.at}`);
  assert.equal(cues.filter((c) => c.name === "badge").length, 1);
  assert.equal(cuesOf([], LOOP_FRAMES, false).filter((c) => c.name === "badge").length, 0);
});
