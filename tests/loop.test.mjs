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
  assert.ok(Math.hypot(a.pin[0] - z.pin[0], a.pin[1] - z.pin[1]) < 1.5, "the camera jumps at the seam");
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
