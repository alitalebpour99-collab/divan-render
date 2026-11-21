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
      // round 4: a time joins a callout's sub line, an approximate place becomes an area; kinds and places stay the writer's
      const key = (m) => `${m.kind}:${m.lon ?? m.points?.[0]?.lon ?? m.coords?.[0]?.[0] ?? m.a3 ?? ""}`;
      const writer = b.marks.filter((m) => m.kind !== "object" && !(m.kind === "callout" && !c.beats[i].marks.some((w) => w.kind === "callout" && w.lon === m.lon && w.lat === m.lat)));
      assert.deepEqual(writer.slice(0, c.beats[i].marks.length).map(key), c.beats[i].marks.map(key), `${name}: the writer's marks are kept in order`);
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
  // round 4: approach (along the real lane), the event, the aftermath
  assert.deepEqual(m2.map((m) => `${m.id}/${m.move}`), ["tanker/approach", "mine/stand", "missile/drop", "tanker/approach"]);
  // the times: the first incident at the source's date, the second «ساعتی بعد»
  const subs = c.beats[3].marks.filter((m) => m.kind === "callout").map((m) => m.sub);
  assert.ok(subs[0].includes("۲۰ نوامبر") && subs[1].includes("ساعتی بعد"), subs.join(" | "));
  // the source says the places are approximate: areas, not pins
  assert.ok(c.beats[3].marks.filter((m) => m.kind === "pins").every((m) => m.area));
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

// ---- round 4 pass 3: a claim beat keeps every claim on the screen ----
test("abqaiq «سه روایت»: every shot of a claim beat holds all its claim points inside the safe frame", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const { claimPoints } = await import("../src/storyboard/director.ts");
  const { scaleOf } = await import("../src/map-engine/camera.ts");
  const { geoOrthographic } = await import("d3-geo");
  const c = en(read("divan-abqaiq"));
  const sb = direct(c, []);
  let seen = 0;
  c.beats.forEach((b, bi) => {
    if (b.kind !== "map") return;
    const pts = claimPoints(b.marks);
    if (!pts) return;
    for (const s of sb.shots.filter((x) => x.beat === bi)) {
      const L = s.motion.look;
      assert.ok(L, `shot ${s.n} has a look`);
      const proj = geoOrthographic().rotate([-L.lon, -L.lat, L.roll ?? 0]).scale(scaleOf(L.span, 1080)).translate([540, 960]);
      for (const p of pts) {
        const [x, y] = proj(p);
        assert.ok(x >= 64 && x <= 884 && y >= 560 && y <= 1400, `shot ${s.n}: the claim at ${p} stands at ${Math.round(x)},${Math.round(y)}, outside the safe frame`);
        seen += 1;
      }
    }
  });
  assert.ok(seen >= 6, "the abqaiq sample has a claim beat");
});

test("pass 3: a callout that only repeats the beat's headline is not drawn again on the map", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const c = en(read("divan-abqaiq"));
  const norm = (s) => String(s ?? "").replace(/[\s،,٫.«»:]/g, "");
  for (const b of c.beats) if (b.kind === "map") for (const m of b.marks) if (m.kind === "callout") assert.notEqual(norm(m.bold), norm(b.caption), `«${m.bold}» repeats the headline`);
});

test("pass 3: a crowded label covers other labels before it ever covers the scale", () => {
  const safe = { x: 0, y: 0, w: 400, h: 400 };
  const scale = { x: 0, y: 300, w: 400, h: 100 };
  // the frame is full: every place meets something; the label must still keep off the scale
  const crowd = [{ x: 0, y: 0, w: 400, h: 300 }];
  const [p] = place([{ id: "a", x: 200, y: 320, w: 200, h: 60 }], safe, [...crowd, scale], 18, [scale]);
  const meets = p.box.y < scale.y + scale.h && scale.y < p.box.y + p.box.h;
  assert.ok(!meets, `the label stands at y ${p.box.y}, over the scale`);
});

// ---- round 5 ----
test("round 5: a callout's colour reads at 4.5:1 on the night sea and the land (Saudi blue, the GBR line)", async () => {
  const { readable, contrast } = await import("../src/map-engine/contrast.ts");
  const sea = "#121f35";
  const land = "#2a3649";
  const gold = "#ffb020";
  for (const c of ["#5c7fa8", "#3d8fe0", "#c06cf0", "#ff4d40", "#7fa3cf"]) {
    const x = readable(c, [sea, land]);
    assert.ok(contrast(x, sea) >= 4.5 && contrast(x, land) >= 4.5, `${c} → ${x}: ${contrast(x, sea).toFixed(2)} on the sea`);
  }
  // a colour that already reads is left alone
  assert.equal(readable("#ffb020", [sea]), "#ffb020");
  // on a light ground (Iran's amber), the words go dark
  assert.ok(contrast(readable("#5c7fa8", [gold]), gold) >= 4.5);
});

test("round 5: a beat's callouts keep their offset from their points while the camera moves (no jump)", async () => {
  const { carry } = await import("../src/map-engine/labels.ts");
  const safe = { x: 64, y: 560, w: 820, h: 840 };
  const ref = [{ id: "a", box: { x: 300, y: 700, w: 200, h: 80 }, anchor: [520, 760], leader: true, side: "l" }];
  const a = carry(ref, { a: [500, 800] }, safe)[0];
  const b = carry(ref, { a: [560, 900] }, safe)[0];
  assert.deepEqual([a.box.x - a.anchor[0], a.box.y - a.anchor[1]], [b.box.x - b.anchor[0], b.box.y - b.anchor[1]]);
  // and never leaves the safe frame
  const c = carry(ref, { a: [20, 1500] }, safe)[0];
  assert.ok(c.box.x >= safe.x && c.box.y + c.box.h <= safe.y + safe.h);
});

test("round 5: every later shot of a map beat or the hook brings something new on the map", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  for (const name of ["divan-strait", "divan-abqaiq"]) {
    const c = en(read(name));
    const sb = direct(c, []);
    for (const s of sb.shots) {
      const b = c.beats[s.beat];
      if (b.kind !== "map" && b.kind !== "hook") continue;
      const first = sb.shots.find((x) => x.beat === s.beat);
      if (s === first) continue;
      assert.ok(s.marks.length > 0, `${name}: shot ${s.n} (beat ${s.beat}) brings nothing new`);
    }
  }
});

test("round 5: abqaiq's hook shows the strike on its first shot", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const c = en(read("divan-abqaiq"));
  const sb = direct(c, []);
  const first = sb.shots[0].marks.map((i) => c.beats[0].marks[i]);
  assert.ok(first.some((m) => m.kind === "object" && (m.move === "drop" || m.move === "arc")), "no drone or missile on the first shot");
  assert.ok(first.some((m) => m.kind === "object" && m.id === "refinery" && m.fire !== undefined), "the refinery does not burn");
});

test("round 5: the camera never leaves a beat's main thing", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const { mainObject, claimPoints } = await import("../src/storyboard/director.ts");
  const { scaleOf } = await import("../src/map-engine/camera.ts");
  const { geoOrthographic } = await import("d3-geo");
  for (const name of ["divan-strait", "divan-abqaiq"]) {
    const c = en(read(name));
    const sb = direct(c, []);
    for (const s of sb.shots) {
      const b = c.beats[s.beat];
      if (b.kind !== "map" || claimPoints(b.marks)) continue;
      const p = mainObject(b.marks);
      const L = s.motion.look;
      if (!p || !L) continue;
      const [x, y] = geoOrthographic().rotate([-L.lon, -L.lat, L.roll ?? 0]).scale(scaleOf(L.span, 1080)).translate([540, 960])(p);
      assert.ok(x >= 64 && x <= 884 && y >= 560 && y <= 1400, `${name} shot ${s.n}: the main thing at ${Math.round(x)},${Math.round(y)}`);
    }
  }
});
