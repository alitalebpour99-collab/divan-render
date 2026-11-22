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
      // round 8: the writer's callouts are numbered discs now, in their order, with the writer's words in the legend;
      // the rest the engine adds is ground: names, the real lanes, a pin it moved to the water
      const w = c.beats[i].marks;
      const callouts = w.filter((m) => m.kind === "callout");
      const discs = b.marks.filter((m) => m.kind === "marker");
      // (a callout that only repeats the headline is dropped first, pass 3)
      const norm = (s) => String(s ?? "").replace(/[s،,٫.«»:]/g, "");
      const own = callouts.filter((m) => norm(m.bold) !== norm(c.beats[i].caption));
      // (and an incident's time the source gives becomes a disc of its own when the writer put no words on its pin: annotate)
      assert.ok(discs.length >= Math.min(3, own.length) && discs.length <= 3, `${name}: a disc a callout`);
      assert.equal((b.legend ?? []).filter((x) => x.n > 0).length, discs.length, `${name}: a row of the legend a disc`);
      discs.forEach((d, k) => assert.equal(d.n, k + 1));
      assert.ok(!b.marks.some((m) => m.kind === "callout"), `${name}: no callout is left on the map`);
      for (const m of b.marks) if (!w.some((x) => x.kind === m.kind)) assert.ok(["label", "lane", "marker", "object"].includes(m.kind), `${name}: enrichment added a ${m.kind}`);
    });
  }
});

// ---- the topic's objects on the map (owner, 21 Nov 2026) ----
import { topicsOf, objectsSaid, withObjects } from "../src/storyboard/topics.ts";
import { enrich as enrichAll } from "../src/storyboard/enrich.ts";
import { MAP_OBJECTS } from "../src/map-engine/object-ids.ts";
import { worldFor } from "../src/map-engine/world.ts";
import { geoContains } from "d3-geo";
import { isLand, coastKm } from "../src/map-engine/water.ts";

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

test("strait: a tanker sails the strait from frame 0, the incidents are numbered discs on the water", () => {
  const c = enrichAll(read("divan-strait"));
  const objs = (b) => (b.marks ?? []).filter((m) => m.kind === "object");
  const hook = objs(c.beats[0]);
  assert.equal(hook.length, 1);
  assert.equal(hook[0].id, "tanker");
  assert.equal(hook[0].move, "sail");
  const m2 = objs(c.beats[3]);
  // round 8: no missile is drawn flying (the source gives no launch point): the strike is its impact under disc ۲
  // a ship that came in lies by its disc (its way in would cross the disc)
  assert.deepEqual(m2.map((m) => `${m.id}/${m.move}`), ["tanker/stand", "mine/stand", "tanker/stand"]);
  const discs = c.beats[3].marks.filter((m) => m.kind === "marker");
  assert.deepEqual(discs.map((d) => [d.n, d.sea, Boolean(d.hit)]), [[1, true, true], [2, true, true]]);
  // the times: the first incident at the source's date, the second «ساعتی بعد», in the legend's words
  const items = c.beats[3].legend.map((x) => x.text);
  assert.ok(items[0].includes("۲۰ نوامبر") && items[1].includes("ساعتی بعد"), items.join(" | "));
  // the disc is the place: no pin is left under it
  assert.ok(!c.beats[3].marks.some((m) => m.kind === "pins"));
  // every disc of a sea event on water, clear of the coast; every thing that floats on water
  for (const d of discs) assert.ok(!isLand([d.lon, d.lat]) && coastKm([d.lon, d.lat]) >= 2, `disc ${d.n} on the water`);
  for (const m of [...hook, ...m2]) {
    const pts = m.path ?? [[m.lon, m.lat]];
    assert.ok(pts.every((p) => !geoContains(worldFor(0).land, p)), `${m.id} on water`);
  }
  // the burning tankers stay by their incidents (beside the disc, never on it)
  [m2[0], m2[2]].forEach((m, i) => assert.ok(Math.hypot(m.lon - discs[i].lon, m.lat - discs[i].lat) < 0.8, `${m.id} by disc ${i + 1}`));
  assert.ok(m2[0].fire !== undefined && m2[2].fire !== undefined);
  const label = c.beats[0].marks.find((m) => m.kind === "label");
  assert.ok(Math.hypot(hook[0].lon - label.lon, hook[0].lat - label.lat) > 0.1, "the hook's tanker keeps off «تنگهٔ هرمز»");
  // every storyboard check still passes, and a second pass adds nothing (idempotent)
  const sb = direct(c, []);
  assert.deepEqual(storyboardChecks(c, sb).filter((x) => !x.ok), []);
  assert.deepEqual(enrichAll(c), c);
});

test("every object of the library has its names and what it depicts", () => {
  assert.ok(MAP_OBJECTS.length >= 20);
  for (const o of MAP_OBJECTS) assert.ok(o.en && o.fa && o.depicts.length > 30 && o.moves.length, o.id);
});

// ---- round 4 pass 3: a claim beat keeps every claim on the screen ----
test("abqaiq «سه روایت»: every shot of a claim beat holds all its numbered places inside the map band", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const { bandBottom } = await import("../src/storyboard/legend.ts");
  const { scaleOf } = await import("../src/map-engine/camera.ts");
  const { geoOrthographic } = await import("d3-geo");
  const c = en(read("divan-abqaiq"));
  const sb = direct(c, []);
  let seen = 0;
  c.beats.forEach((b, bi) => {
    if (b.kind !== "map") return;
    const pts = b.marks.filter((m) => m.kind === "marker").map((m) => [m.lon, m.lat]);
    if (pts.length < 3) return;
    for (const s of sb.shots.filter((x) => x.beat === bi)) {
      const L = s.motion.look;
      assert.ok(L, `shot ${s.n} has a look`);
      const proj = geoOrthographic().rotate([-L.lon, -L.lat, L.roll ?? 0]).scale(scaleOf(L.span, 1080)).translate([540, 960]);
      for (const p of pts) {
        const [x, y] = proj(p);
        assert.ok(x >= 40 && x <= 1040 && y >= 580 && y <= bandBottom(b.legend), `shot ${s.n}: the place at ${p} stands at ${Math.round(x)},${Math.round(y)}, outside the map band`);
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

test("round 8: abqaiq's hook shows the struck refinery burning from frame 0, and no strike direction anywhere", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const c = en(read("divan-abqaiq"));
  const sb = direct(c, []);
  const first = sb.shots[0].marks.map((i) => c.beats[0].marks[i]);
  assert.ok(first.some((m) => m.kind === "object" && m.id === "refinery" && m.fire !== undefined), "the refinery does not burn");
  // the source names no launch site: no missile or drone flies in from anywhere; the impact is the disc's burst
  for (const b of c.beats) for (const m of b.marks ?? []) assert.ok(!(m.kind === "object" && (m.move === "drop" || m.move === "arc")), `a ${m.id} ${m.move} is drawn`);
  assert.ok(c.beats[1].marks.filter((m) => m.kind === "marker" && m.hit).length === 2, "both targets are struck discs");
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
      // pass 5: a followed line's first shots travel with the line, before its end and the thing there are reached
      if (s.motion.follow > 0) continue;
      const p = mainObject(b.marks);
      const L = s.motion.look;
      if (!p || !L) continue;
      const [x, y] = geoOrthographic().rotate([-L.lon, -L.lat, L.roll ?? 0]).scale(scaleOf(L.span, 1080)).translate([540, 960])(p);
      assert.ok(x >= 64 && x <= 884 && y >= 560 && y <= 1400, `${name} shot ${s.n}: the main thing at ${Math.round(x)},${Math.round(y)}`);
    }
  }
});

test("round 5: carried callouts that come to meet are moved apart", async () => {
  const { carry } = await import("../src/map-engine/labels.ts");
  const safe = { x: 64, y: 560, w: 820, h: 840 };
  const ref = [
    { id: "a", box: { x: 300, y: 800, w: 300, h: 90 }, anchor: [620, 840], leader: true, side: "l" },
    { id: "b", box: { x: 300, y: 700, w: 300, h: 90 }, anchor: [620, 740], leader: true, side: "l" },
  ];
  const [a, b] = carry(ref, { a: [620, 840], b: [620, 860] }, safe);
  const meet = a.box.y < b.box.y + b.box.h && b.box.y < a.box.y + a.box.h;
  assert.ok(!meet, `a at ${a.box.y}, b at ${b.box.y}`);
});

// ---- round 6 ----
test("round 6: an object is never drawn under the minimum size, and the main thing is a size larger", async () => {
  const { objectZoom, MIN_SCALE, MAIN_BOOST } = await import("../src/map-engine/objscale.ts");
  // a mine (art scale 0.62) on a wide map (the map's zoom 0.55): at least the minimum
  assert.ok(0.62 * objectZoom(0.55, 0.62) >= MIN_SCALE - 1e-9);
  // round 7: never over the most either (readable, but in proportion to the map); the main thing a size larger
  const { MAX_SCALE } = await import("../src/map-engine/objscale.ts");
  assert.ok(Math.abs(0.88 * objectZoom(1, 0.88) - MAX_SCALE) < 1e-9);
  assert.ok(Math.abs(objectZoom(1, 0.88, true) / objectZoom(1, 0.88) - MAIN_BOOST) < 1e-9);
});

test("round 6: a share the line says becomes a bar at the main thing, its words and value from the line", async () => {
  const { enrich: en, shareOf } = await import("../src/storyboard/enrich.ts");
  const c = en(read("divan-abqaiq"));
  const s = c.beats[2].marks.find((m) => m.kind === "share");
  assert.ok(s, "the ۵٫۷ beat has its bar");
  assert.equal(s.share, 0.5);
  assert.ok(c.beats[2].say.includes(s.label), `«${s.label}» is not the line's own words`);
  assert.equal(shareOf("۳۰ درصد از صادرات نفت ایران").share, 0.3);
  assert.equal(shareOf("پهپادها تأسیسات را زدند."), null);
  // the strait says no share: nothing is drawn
  assert.ok(!en(read("divan-strait")).beats.some((b) => b.kind === "map" && b.marks.some((m) => m.kind === "share")));
});

test("round 6: at most one new callout a shot (the last shot of a beat takes what is left)", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  for (const name of ["divan-strait", "divan-abqaiq"]) {
    const c = en(read(name));
    const sb = direct(c, []);
    for (const s of sb.shots) {
      const b = c.beats[s.beat];
      if (b.kind !== "map") continue;
      const last = sb.shots.filter((x) => x.beat === s.beat).at(-1);
      if (s === last) continue;
      const n = s.marks.filter((i) => b.marks[i].kind === "callout").length;
      assert.ok(n <= 1, `${name} shot ${s.n} brings ${n} callouts`);
    }
  }
});

test("round 6: an incident's time keeps the sub-line short (no long date)", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const c = en(read("divan-abqaiq"));
  for (const m of c.beats[1].marks) if (m.kind === "callout") assert.ok(!(m.sub ?? "").includes("۲۰۱۹") && (m.sub ?? "").length <= 28, `«${m.sub}»`);
});

// ---- round 7 ----
test("round 7: every callout of both topics is at most two lines in the safe frame's width", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const { textWidth } = await import("../src/map-engine/labels.ts");
  // fitCallout lives in a .tsx with React; its rule, rebuilt here from the same pure parts, is what the test holds to
  const SHORT = [[/سازمان عملیات تجاری دریایی بریتانیا|مرکز دریایی بریتانیا/g, "UKMTO"]];
  for (const name of ["divan-strait", "divan-abqaiq"]) {
    for (const b of en(read(name)).beats) {
      if (b.kind !== "map") continue;
      for (const m of b.marks) {
        if (m.kind !== "callout" || !m.sub) continue;
        const sub = SHORT.reduce((x, [re, to]) => x.replace(re, to), m.sub);
        const w = Math.max(textWidth(m.bold, 44), textWidth(sub, 44 * 0.72)) + 34 + (m.a3 ? 1.3 * 44 : 0);
        assert.ok(w <= 820, `${name}: «${m.bold}» / «${sub}» needs ${w} px on one line each`);
      }
    }
  }
});

test("round 8: a share the line says is a row of the legend with its bar, never words on the map", async () => {
  const { enrich: en } = await import("../src/storyboard/enrich.ts");
  const c = en(read("divan-abqaiq"));
  const b = c.beats.find((x) => x.kind === "map" && x.marks.some((m) => m.kind === "share"));
  const row = b.legend.find((x) => x.n === 0);
  assert.equal(row.share, 0.5);
  assert.equal(row.text, "نیمی از تولید عربستان");
});
