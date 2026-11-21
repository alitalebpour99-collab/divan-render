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

test("round 3: enrichment adds only ground (lanes, names), never news, and is idempotent", async () => {
  const { enrich } = await import("../src/storyboard/enrich.ts");
  for (const name of ["divan-strait", "divan-table3", "divan-today"]) {
    const c = read(name);
    const once = enrich(c);
    assert.deepEqual(enrich(once), once, `${name}: a second pass changes nothing`);
    once.beats.forEach((b, i) => {
      if (b.kind !== "map") return;
      // the topic's objects stand among the writer's marks (topics.ts); the rest of what is added is ground at the end
      const writer = b.marks.filter((m) => m.kind !== "object");
      assert.deepEqual(writer.slice(0, c.beats[i].marks.length), c.beats[i].marks, `${name}: the writer's marks are kept in order`);
      const added = writer.slice(c.beats[i].marks.length);
      for (const m of added) assert.ok(m.kind === "label" || m.kind === "comet", `${name}: enrichment added a ${m.kind}`);
    });
  }
});

// ---- the topic's objects on the map (owner, 21 Nov 2026) ----
import { topicsOf, objectsSaid, withObjects } from "../src/storyboard/topics.ts";
import { enrich as enrichAll } from "../src/storyboard/enrich.ts";
import { MAP_OBJECTS } from "../src/map-engine/object-ids.ts";
import { worldFor } from "../src/map-engine/world.ts";
import { geoContains } from "d3-geo";

test("the classifier names the things a line is about, in fa and en, whole words only", () => {
  assert.deepEqual(objectsSaid("سپاه می‌گوید نفتکشی نزدیک خصب به مین خورد. ساعتی بعد، نفتکش دیگری با پرتابه آتش گرفت."), ["tanker", "mine", "missile"]);
  assert.deepEqual(objectsSaid("Drones and a ballistic missile hit the refinery"), ["drone", "missile", "refinery"]);
  assert.ok(objectsSaid("مجلس طرح تحریم را تصویب کرد").includes("parliament"));
  assert.ok(objectsSaid("بازرسان آژانس به نطنز رفتند").includes("nuclear"));
  assert.ok(objectsSaid("دلار در بازار تهران گران شد").includes("money"));
  // «همین» and «زمین» are not a mine, «ارزش» is not a currency, «ناوگان» is a fleet
  assert.ok(!topicsOf("همین حدود، روی زمین، ارزش").some((h) => h.topic === "mine" || h.topic === "money"));
  assert.ok(objectsSaid("ناوگان آمریکا").includes("warship"));
});

test("strait: a tanker sails the strait from frame 0, the incidents stand on the writer's pins", () => {
  const c = enrichAll(read("divan-strait"));
  const objs = (b) => (b.marks ?? []).filter((m) => m.kind === "object");
  const hook = objs(c.beats[0]);
  assert.equal(hook.length, 1);
  assert.equal(hook[0].id, "tanker");
  assert.equal(hook[0].move, "sail");
  const m2 = objs(c.beats[3]);
  assert.deepEqual(m2.map((m) => `${m.id}/${m.move}`), ["tanker/stand", "mine/stand", "missile/drop", "tanker/stand"]);
  const pins = c.beats[3].marks.filter((m) => m.kind === "pins").map((m) => [m.points[0].lon, m.points[0].lat]);
  // the burning tankers stand on the writer's two pins; nothing stands where the writer put nothing
  // pass 3: on water, at most a few km off the pin when the pin is on the coast
  [m2[0], m2[3]].forEach((m, i) => assert.ok(Math.hypot(m.lon - pins[i][0], m.lat - pins[i][1]) < 0.3, `${m.id} near pin ${i}`));
  for (const m of [...hook, ...m2].filter((x) => x.id !== "missile")) {
    const pts = m.path ?? [[m.lon, m.lat]];
    assert.ok(pts.every((p) => !geoContains(worldFor(0).land, p)), `${m.id} on water`);
  }
  // no object on or through a place name the writer put on its map
  const label = c.beats[0].marks.find((m) => m.kind === "label");
  assert.ok(hook[0].path.every((p) => Math.hypot(p[0] - label.lon, p[1] - label.lat) > 0.5), "the hook's tanker keeps off «تنگهٔ هرمز»");
  assert.ok(m2[0].fire !== undefined && m2[3].fire !== undefined);
  // the object comes in on the shot of its pin: it follows the pin in the marks
  const ks = c.beats[3].marks.map((m) => m.kind);
  assert.equal(ks[ks.indexOf("object") - 1], "pins");
  // every storyboard check still passes, and a second pass adds nothing (idempotent)
  const sb = direct(c, []);
  assert.deepEqual(storyboardChecks(c, sb).filter((x) => !x.ok), []);
  assert.deepEqual(withObjects(c), c);
});

test("every object of the library has its names and what it depicts", () => {
  assert.ok(MAP_OBJECTS.length >= 20);
  for (const o of MAP_OBJECTS) assert.ok(o.en && o.fa && o.depicts.length > 30 && o.moves.length, o.id);
});
