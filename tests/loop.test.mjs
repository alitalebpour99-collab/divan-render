// «یک دور» on the map engine (owner, 23 Nov 2026): the turn's layout frame by frame (src/loop/scene.ts), through the
// same pre-delivery check as the storyboard Reels (scripts/mapcheck-loop.mjs checkLoop), without a browser.
//   node --import ./tests/register.mjs --test tests/loop.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loopScene, loopDuration, stopsOf, eventFrames, headerSize, rowSize, COLW } from "../src/loop/scene.ts";
import { textWidth } from "../src/map-engine/labels.ts";
import { MIN_LEG, progressAt, legsOf } from "../src/loop-time.ts";
import { checkLoop } from "../scripts/mapcheck-loop.mjs";

const sample = JSON.parse(fs.readFileSync(new URL("../samples/loop-dollar.json", import.meta.url), "utf8"));

test("the sample passes the pre-delivery check on every frame, blink across the seam included", async () => {
  const { fails } = await checkLoop(sample, 1);
  assert.deepEqual(fails.slice(0, 5), []);
});

test("the last frame flows into the first: the same reading, line, words and almost the same camera", () => {
  const N = loopDuration(sample);
  const a = loopScene(sample, 0);
  const z = loopScene(sample, N - 1);
  assert.equal(a.prog, 1);
  assert.equal(z.prog, 1);
  assert.equal(a.reading, z.reading);
  assert.equal(a.times, 1);
  assert.equal(z.times, 1);
  assert.equal(a.badge, 0);
  assert.equal(z.badge, 0);
  assert.equal(a.event, null);
  assert.equal(z.event, null);
  assert.ok(Math.hypot(a.pin[0] - z.pin[0], a.pin[1] - z.pin[1]) < 4, "the camera jumps at the seam (more than one frame of its drift)");
  // and frame N is frame 0
  assert.deepEqual(loopScene(sample, N).look, a.look);
});

test("every figure on the screen is a reading of the site, never a value between two", () => {
  const N = loopDuration(sample);
  for (let f = 0; f < N; f += 1) assert.ok(sample.points.includes(loopScene(sample, f).reading), `frame ${f}`);
});

test("the pin rests at each event, and each event's words stay at least MIN_LEG frames (no flicker)", () => {
  const N = loopDuration(sample);
  const stops = stopsOf(sample);
  const knots = legsOf(N, stops);
  for (let i = 1; i < knots.length; i += 1) assert.ok(knots[i][1] - knots[i - 1][1] >= MIN_LEG - 1e-6, `leg ${i}`);
  const runs = new Map();
  for (let f = 0; f < N; f += 1) {
    const t = loopScene(sample, f).event?.event;
    if (t) runs.set(t, (runs.get(t) ?? 0) + 1);
  }
  assert.equal(runs.size, sample.points.filter((q) => q.event).length);
  for (const [t, n] of runs) assert.ok(n >= MIN_LEG - 1, `«${t}» shown ${n} frames`);
  // the pin is on each stop at its frame
  for (const [sh, fr] of knots.slice(1, -1)) assert.ok(Math.abs(progressAt(Math.round(fr), N, stops) - sh) < 0.01, `stop ${sh}`);
  assert.ok(eventFrames(sample).every((x) => x > 0 && x < N));
});

test("the header keeps to two lines, the event rows to the column; a span too long fails the check", async () => {
  assert.ok(headerSize(sample.span) >= 60);
  // every event fits its row whole (the size steps down from 46 px), never cut with an ellipsis
  for (const q of sample.points.filter((x) => x.event)) assert.ok(textWidth(q.event, rowSize(q.event)) + 92 <= COLW, q.event);
  const long = { ...sample, span: "از ".repeat(60) + "امروز" };
  const { fails } = await checkLoop(long, 30);
  assert.ok(fails.some((x) => x.rule === "header-too-long"));
});

test("v4: everything the loop writes ends above y 1500, out of Instagram's caption band", () => {
  const N = loopDuration(sample);
  for (let f = 0; f < N; f += 3) {
    const sc = loopScene(sample, f);
    for (const b of [...sc.panels, ...sc.words.map((w) => w.box), sc.badgeBox]) assert.ok(b.y + b.h <= 1500 || b.y === 0, `frame ${f}: a box ends at ${b.y + b.h}`);
  }
});

test("v4: the pin beats on the bed's measured beats (beatOf finds the phase of a made-up pulse)", async () => {
  const { beatOf } = await import("../music.mjs");
  const rate = 44100;
  const seconds = 9.6;
  const total = Math.round(seconds * rate);
  const L = new Float32Array(total);
  // a soft bed plus a short burst every 0.6 s, the first at 0.21 s
  for (let i = 0; i < total; i += 1) L[i] = 0.05 * Math.sin((2 * Math.PI * 110 * i) / rate);
  for (let b = 0.21; b < seconds; b += 0.6) for (let k = 0; k < 0.04 * rate; k += 1) L[Math.round(b * rate) + k] += 0.5 * Math.sin((2 * Math.PI * 60 * k) / rate) * (1 - k / (0.04 * rate));
  const beat = beatOf(L, L, total, rate, seconds);
  assert.equal(beat.period, 18);
  assert.ok(Math.abs(beat.phase - 0.21 * 30) <= 1.2, `phase ${beat.phase}`);
  assert.ok(Math.abs(beat.bpm - 100) <= 3, `bpm ${beat.bpm}`);
  assert.ok(beat.strength > 2, `strength ${beat.strength}`);
  // v5: a track at 107 BPM gets 17 beats a turn (its own tempo), and the phase of its first beat
  const L2 = new Float32Array(total);
  for (let i = 0; i < total; i += 1) L2[i] = 0.05 * Math.sin((2 * Math.PI * 110 * i) / rate);
  for (let b = 0.1; b < seconds - 0.05; b += 60 / 107.1) for (let k = 0; k < 0.04 * rate; k += 1) L2[Math.round(b * rate) + k] += 0.5 * Math.sin((2 * Math.PI * 60 * k) / rate) * (1 - k / (0.04 * rate));
  const b2 = beatOf(L2, L2, total, rate, seconds);
  assert.equal(b2.beats, 17, JSON.stringify(b2));
  assert.ok(Math.abs(b2.phase - 3) <= 1.5, `phase ${b2.phase}`);
  assert.equal(loopScene({ ...sample, beats: 17, beatPhase: 3 }, 3).pulse, 0);
  // and the scene's pulse peaks on it: the ring starts (0) on the beat's frame
  const sc = loopScene({ ...sample, beatPhase: 6 }, 6);
  assert.equal(sc.pulse, 0);
});
