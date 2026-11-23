// Round 7 (the owner on the round-6 videos, 22 Nov 2026): the permanent rules, checked on both test topics frame by frame.
//   node --import ./tests/register.mjs --test tests/round7.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { enrich, sourcedZones } from "../src/storyboard/enrich.ts";
import { direct } from "../src/storyboard/director.ts";
import { frameWords, CHROME, POLL_BOX, shipClocks } from "../src/storyboard/Reel.tsx";
import { fitCallout } from "../src/map-engine/layers.tsx";
import { ROUTES, LANES } from "../src/map-engine/lanes.ts";
import { isLand, landOn, kmToLand } from "../src/map-engine/water.ts";
import { shipCount, smooth, kmPerFrame, KNOTS } from "../src/map-engine/ships.ts";
import { sailAt } from "../src/map-engine/objects.tsx";
import { isShip } from "../src/map-engine/object-ids.ts";
import { textOf } from "../src/storyboard/topics.ts";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../samples/${name}.json`, import.meta.url), "utf8"));
const TOPICS = ["divan-strait", "divan-abqaiq"];
const built = Object.fromEntries(TOPICS.map((n) => {
  const c = enrich(read(n));
  return [n, { c, sb: direct(c, []) }];
}));
const meet = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// ---- 1. no text over text ----
for (const name of TOPICS) {
  test(`${name}: no word on the map meets another, the header, the source line or the poll, on any frame`, () => {
    const { c, sb } = built[name];
    const bad = [];
    for (let f = 0; f < sb.total; f += 2) {
      const { words, beat } = frameWords(c, sb, f);
      const chrome = [...CHROME, ...(beat.kind === "poll" && f < sb.total - 40 ? [POLL_BOX] : [])];
      for (let i = 0; i < words.length; i += 1) {
        for (let j = i + 1; j < words.length; j += 1) if (meet(words[i].box, words[j].box)) bad.push(`${f}: ${words[i].kind} ${words[i].t} × ${words[j].kind} ${words[j].t}`);
        for (const ch of chrome) if (meet(words[i].box, ch)) bad.push(`${f}: ${words[i].kind} ${words[i].t} × the header, source or poll`);
      }
    }
    assert.deepEqual(bad.slice(0, 10), []);
  });
}

test("a callout wraps to two lines at most, its sub-line one", () => {
  for (const name of TOPICS)
    for (const b of built[name].c.beats)
      for (const m of b.marks ?? [])
        if (m.kind === "callout") {
          const fit = fitCallout({ id: "x", lon: 0, lat: 0, bold: m.bold, sub: m.sub }, 820);
          assert.ok(fit.lines.length <= 2, `«${m.bold}» in ${fit.lines.length} lines`);
        }
});

// ---- 2. ships move naturally ----
for (const name of TOPICS) {
  test(`${name}: every ship on a lane sails one clock: never a jump, at its type's speed`, () => {
    const { c, sb } = built[name];
    const clocks = shipClocks(c, sb);
    for (const b of c.beats)
      for (const m of b.marks ?? []) {
        if (m.kind !== "object" || m.move !== "sail" || !m.lane) continue;
        const ck = clocks.get(`${m.id}|${m.lane}`);
        assert.ok(ck, `${m.id} on ${m.lane} has a clock`);
        const o = { ...m, ...ck };
        let last = null;
        for (let f = 0; f < sb.total - 40; f += 1) {
          const p = sailAt(o, f).p;
          if (last) {
            const km = Math.hypot((p[0] - last[0]) * 111.32 * Math.cos((p[1] * Math.PI) / 180), (p[1] - last[1]) * 110.6);
            assert.ok(km <= kmPerFrame(m.id) * 1.05 + 1e-6, `${m.id} moves ${km.toFixed(3)} km in a frame at ${f}`);
          }
          assert.ok(!isLand(p), `${m.id} on land at frame ${f}: ${p}`);
          last = p;
        }
      }
  });
}

test("a ship's speed is its type's service speed, the same time-lapse for every Reel", () => {
  assert.ok(Math.abs(kmPerFrame("tanker") / kmPerFrame("lng") - KNOTS.tanker / KNOTS.lng) < 1e-9);
  assert.ok(kmPerFrame("tanker") > 0.1 && kmPerFrame("tanker") < 0.3, "a tanker covers a few km a second of video, never a strait in a second");
});

test("rounded lanes stay on the water", () => {
  for (const l of LANES.filter((x) => x.id.startsWith("hormuz") || x.id === "red-sea" || x.id === "gulf-qatar")) assert.deepEqual(landOn(smooth(l.path), 2).slice(0, 3), [], `${l.id} rounded`);
});

// ---- 3. the number of ships comes from the news ----
test("the count of ships is the line's own: «شش نفتکش» six, no number one, a count of days none", () => {
  assert.equal(shipCount("شش نفتکش، فقط در یک هفته."), 6);
  assert.equal(shipCount("۶ نفتکش، ۷ روز"), 6);
  assert.equal(shipCount("six tankers were hit"), 6);
  assert.equal(shipCount("نفتکشی نزدیک خصب به مین خورد"), null);
  assert.equal(shipCount("شش روز در هرمز"), null);
  const c = built["divan-strait"].c;
  const hookShip = c.beats[0].marks.find((m) => m.kind === "object" && isShip(m.id));
  assert.equal(hookShip.count, 6, "the hook's «شش نفتکش» is six ships (a «۶×» badge)");
  // no beat adds ships the line does not name: a beat with no number has at most one ship per incident it tells
  for (const b of c.beats) {
    const ships = (b.marks ?? []).filter((m) => m.kind === "object" && isShip(m.id));
    for (const s of ships) if (!shipCount(textOf(b))) assert.ok(!s.count || s.count === 1);
  }
});

// ---- 5. borders and red lines ----
test("every sea lane of the engine lies on the water (1:50m land, 1:10m strait coasts, the Gulf islands)", () => {
  for (const r of ROUTES.filter((x) => x.kind === "sea-lane")) assert.deepEqual(landOn(r.path, 1).slice(0, 3), [], r.id);
  // the Hormuz scheme keeps off the coast itself (a km at least)
  for (const id of ["hormuz-tss-out", "hormuz-tss-in"]) {
    const r = ROUTES.find((x) => x.id === id);
    const pts = landOn(r.path, 1);
    assert.equal(pts.length, 0);
  }
});

test("a hatched sea area is drawn only from its source's outline; a made-up outline goes, the points stay", () => {
  const raw = read("divan-strait");
  assert.ok(raw.beats[1].marks.some((m) => m.kind === "hatch" && m.polygon), "the sample's writer drew an outline with no source");
  const c = sourcedZones(raw);
  assert.ok(!c.beats[1].marks.some((m) => m.kind === "hatch" && !m.a3 && !m.source));
  const sourced = { ...raw, beats: raw.beats.map((b, i) => (i === 1 ? { ...b, marks: b.marks.map((m) => (m.kind === "hatch" ? { ...m, source: { kind: "advisory", ref: "JMIC advisory 009" } } : m)) } : b)) };
  assert.ok(sourcedZones(sourced).beats[1].marks.some((m) => m.kind === "hatch"));
  for (const name of TOPICS) for (const b of built[name].c.beats) for (const m of b.marks ?? []) if (m.kind === "hatch") assert.ok(m.a3 || m.source);
});

for (const name of TOPICS) {
  test(`${name}: what floats stands and sails on the water, never on the coastline`, () => {
    const { c } = built[name];
    for (const b of c.beats)
      for (const m of b.marks ?? []) {
        if (m.kind !== "object" || !["tanker", "cargo", "lng", "warship", "boats", "mine"].includes(m.id)) continue;
        assert.ok(!isLand([m.lon, m.lat]), `${m.id} at ${m.lon},${m.lat} is on land`);
        assert.ok(kmToLand([m.lon, m.lat], 2) > 1, `${m.id} at ${m.lon},${m.lat} lies on the coast`);
        if (m.path && m.move !== "pipe") assert.deepEqual(landOn(m.path, 2).slice(0, 2), [], `${m.id} (${m.move}) crosses land`);
      }
  });
}

// ---- 6. nothing without a story reason ----
test("no lane is drawn where no ship of the story sails", () => {
  const c = built["divan-abqaiq"].c;
  for (const b of c.beats) for (const m of b.marks ?? []) assert.ok(!(m.kind === "comet" && m.loop), "abqaiq has no ship: no lane traffic");
});
