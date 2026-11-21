// The storyboard engine without a browser or ffmpeg:
//   node --import ./tests/register.mjs --test tests/storyboard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { direct } from "../src/storyboard/director.ts";
import { storyboardChecks } from "../src/storyboard/checks.ts";
import { fromDecision } from "../src/storyboard/fromDecision.ts";
import { pick, openingOf } from "../src/storyboard/novelty.ts";
import { place, clashes } from "../src/map-engine/labels.ts";
import { flight, lookAt } from "../src/map-engine/camera.ts";
import { nearestGap } from "../src/map-engine/world.ts";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../samples/${name}.json`, import.meta.url), "utf8"));

for (const name of ["divan-strait", "divan-table3", "divan-today"]) {
  test(`${name}: every storyboard check passes, every shot 1–2 s`, () => {
    const c = read(name);
    const sb = direct(c, []);
    const failed = storyboardChecks(c, sb).filter((x) => !x.ok);
    assert.deepEqual(failed, [], failed.map((x) => x.detail).join("; "));
    for (const s of sb.shots) assert.ok(s.dur >= 0.99 && s.dur <= 2.01, `shot ${s.n} lasts ${s.dur}`);
    assert.equal(Math.round((sb.shots.at(-1).start + sb.shots.at(-1).dur) * sb.fps), sb.total);
  });
}

test("the old card props become a storyboard of the one style", () => {
  const c = fromDecision(read("decision-oil"));
  assert.equal(c.engine, "storyboard");
  assert.equal(c.beats.filter((b) => b.kind === "road").length, 3);
  const sb = direct(c, []);
  assert.ok(sb.shots.every((s) => s.dur >= 0.99 && s.dur <= 2.01));
  assert.ok(sb.shots.filter((s) => s.picture.layer === "road").length >= 9, "each road in three views");
});

test("the novelty rules keep the concept least like the recent videos", () => {
  const base = { one_line: "یک", idea_family: "route-and-strait", hook: { type: "question", text: "چرا هرمز؟" }, anchor: { asset: "map:hormuz", regions: [] }, beats: [], twist_at_beat: 2, ending: { type: "loop-to-hook", line: "" }, new_because: [], objects: ["tanker", "mine"] };
  const other = { ...base, idea_family: "who-said-what", hook: { type: "wrong-belief", text: "همه فکر می‌کنند" }, anchor: { asset: "globe:three-capitals", regions: [] }, objects: ["table"] };
  const recent = [{ id: "1", day: new Date().toISOString().slice(0, 10), template: "strait", idea_family: "route-and-strait", hook_type: "question", ending_type: "loop-to-hook", anchor_asset: "map:hormuz", objects: ["tanker", "mine"], opening_shot: { layer: "map", camera: "push" } }];
  const { chosen, all } = pick([{ concept: base, template: "strait", opening: openingOf(base) }, { concept: other, template: "table3", opening: openingOf(other) }], recent);
  assert.equal(chosen.candidate.concept.idea_family, "who-said-what");
  assert.ok(all[0].broken.length >= 2);
});

test("labels never meet and stay inside the safe frame", () => {
  const safe = { x: 64, y: 540, w: 820, h: 900 };
  const wants = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, x: 400 + (i % 2) * 30, y: 800 + i * 20, w: 260, h: 70 }));
  assert.deepEqual(clashes(place(wants, safe), safe), []);
});

test("a dive starts and ends where it should, and a held look still breathes", () => {
  const a = { lon: 0, lat: 20, span: 180 };
  const b = { lon: 56.4, lat: 26.4, span: 3 };
  assert.deepEqual([flight(a, b, 0).lon, flight(a, b, 0).span].map((x) => Math.round(x)), [0, 180]);
  const end = flight(a, b, 1);
  assert.ok(Math.abs(end.lon - 56.4) < 0.01 && Math.abs(end.span - 3) < 0.01);
  const keys = [{ at: 0, ...b }];
  assert.notEqual(lookAt(keys, 0).span, lookAt(keys, 40).span);
});

test("the strait's width is measured from Natural Earth, not typed", () => {
  const g = nearestGap("IRN", "OMN", [[55.8, 25.9], [57.0, 27.0]]);
  assert.ok(g && g.km > 35 && g.km < 60, `Hormuz measured ${g?.km}`);
});
