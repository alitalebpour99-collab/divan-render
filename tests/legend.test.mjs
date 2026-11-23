// Round 8 (the owner, 22 Nov 2026, after seven rounds of labels on leader lines failed on his screenshots): numbered discs
// on the map, the words in a fixed legend, no flags, everything that floats on checked water, the real lanes only, counts
// from the news, impact points only, Khurais a pumpjack; and the pre-delivery check, frame by frame, on both topics.
//   node --import ./tests/register.mjs --test tests/legend.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { enrich } from "../src/storyboard/enrich.ts";
import { legendize, wrapItem, legendBox, LEGEND_MAX, clearKm, waterPoint, LEGEND } from "../src/storyboard/legend.ts";
import { isLand, coastKm, landOn } from "../src/map-engine/water.ts";
import { columnOf, COLUMN_MAX } from "../src/map-engine/objects.tsx";
import { MAP_OBJECTS } from "../src/map-engine/object-ids.ts";
import { checkReel } from "../scripts/mapcheck-lib.mjs";

const read = (name) => JSON.parse(fs.readFileSync(new URL(`../samples/${name}.json`, import.meta.url), "utf8"));
const TOPICS = ["divan-strait", "divan-abqaiq"];
const built = Object.fromEntries(TOPICS.map((n) => [n, enrich(read(n))]));
const mapBeats = (c) => c.beats.filter((b) => b.kind === "map" || b.kind === "hook");

test("no callout, no leader line and no flag is left on any map: the words are in the legend", () => {
  for (const name of TOPICS)
    for (const b of mapBeats(built[name])) {
      for (const m of b.marks ?? []) {
        assert.notEqual(m.kind, "callout", `${name}: a callout on the map`);
        assert.notEqual(m.kind, "flag", `${name}: a flag on the map`);
      }
      const discs = (b.marks ?? []).filter((m) => m.kind === "marker");
      assert.ok(discs.length <= LEGEND_MAX, `${name}: ${discs.length} discs on one beat`);
      // every disc has its row, numbered alike, and every row fits two lines
      const rows = (b.legend ?? []).filter((x) => x.n > 0);
      assert.deepEqual(rows.map((x) => x.n), discs.map((d) => d.n));
      for (const r of b.legend ?? []) {
        const fit = wrapItem(r.text);
        assert.ok(fit && fit.lines.length <= 2, `«${r.text}» takes more than two lines`);
        assert.ok(!/پرچم|flag/i.test(r.text));
      }
      // the box stands in its band: over the source line, under the map
      const box = legendBox(b.legend);
      if (box) assert.ok(box.y >= 1000 && box.y + box.h <= LEGEND.bottom + 0.5, `${name}: the legend at ${box.y}`);
    }
});

test("the attribution is in the words: «به گفتهٔ سپاه» names who says it, with no flag beside the mine", () => {
  const m2 = built["divan-strait"].beats[3];
  assert.equal(m2.legend[0].text, "مین، نزدیک خصب، به گفتهٔ سپاه، ۲۰ نوامبر");
  assert.ok(m2.legend[1].text.startsWith("پرتابه، خروجی تنگه، به گفتهٔ UKMTO"));
});

test("every disc of a sea event is on the water, clear of the coast by its own size on the widest shot", () => {
  for (const name of TOPICS)
    for (const b of mapBeats(built[name]))
      for (const d of (b.marks ?? []).filter((m) => m.kind === "marker" && m.sea)) {
        assert.ok(!isLand([d.lon, d.lat]), `${name}: disc ${d.n} on land`);
        assert.ok(coastKm([d.lon, d.lat]) >= Math.min(clearKm(b.look.span), 2) - 1e-6, `${name}: disc ${d.n} ${coastKm([d.lon, d.lat]).toFixed(1)} km off the coast`);
      }
  // Khasab itself is on land: its disc goes out to the nearest water clear of the coast
  const p = waterPoint([56.25, 26.18], 8);
  assert.ok(p && !isLand(p) && coastKm(p) >= 8);
});

test("the lanes are the real Hormuz scheme only, one inbound and one outbound, on the water and never crossing", () => {
  for (const b of mapBeats(built["divan-strait"])) {
    const lanes = (b.marks ?? []).filter((m) => m.kind === "lane");
    const comets = (b.marks ?? []).filter((m) => m.kind === "comet");
    assert.deepEqual(comets, [], "a hand-drawn line at sea");
    if (!lanes.length) continue;
    assert.deepEqual(lanes.map((l) => l.id).sort(), ["hormuz-tss-in", "hormuz-tss-out"]);
    for (const l of lanes) assert.deepEqual(landOn(l.coords, 1), [], `${l.id} touches land`);
    // the two never cross (drawn only between the scheme's ends, where they run side by side)
    const [A, B] = lanes.map((l) => l.coords);
    const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (let i = 0; i + 1 < A.length; i += 1)
      for (let j = 0; j + 1 < B.length; j += 1) assert.ok(!(d(B[j], B[j + 1], A[i]) * d(B[j], B[j + 1], A[i + 1]) < 0 && d(A[i], A[i + 1], B[j]) * d(A[i], A[i + 1], B[j + 1]) < 0), "the lanes cross");
  }
});

test("counts come from the news: up to six small ships in a column, more one ship and a badge", () => {
  const hook = built["divan-strait"].beats[0].marks.find((m) => m.kind === "object");
  assert.equal(hook.count, 6);
  assert.equal(COLUMN_MAX, 6);
  const six = columnOf(hook, 5, 5);
  assert.equal(six.n, 6, "six drawn one by one");
  assert.ok(six.zoom * 0.88 < 0.4, "small");
  const many = columnOf({ ...hook, count: 9 }, 5, 5);
  assert.equal(many.n, 1, "nine: one ship and its badge");
});

test("a strike is its impact point: no missile or drone flies in from a place the source does not give", () => {
  for (const name of TOPICS)
    for (const b of mapBeats(built[name])) for (const m of b.marks ?? []) assert.ok(!(m.kind === "object" && (m.move === "drop" || m.move === "arc")), `${name}: ${m.id} ${m.move}`);
  assert.ok(built["divan-strait"].beats[3].marks.filter((m) => m.kind === "marker" && m.hit).length === 2);
});

test("Khurais, an onshore oil field, is a pumpjack, not a refinery", () => {
  const m0 = built["divan-abqaiq"].beats[1];
  const things = m0.marks.filter((m) => m.kind === "object").map((m) => m.id);
  assert.deepEqual(things, ["refinery", "pumpjack"]);
  assert.ok(MAP_OBJECTS.some((o) => o.id === "pumpjack"));
});

test("legendize is idempotent and the content says it is done", () => {
  for (const name of TOPICS) {
    assert.equal(built[name].legend, true);
    assert.deepEqual(legendize(built[name]), built[name]);
    assert.deepEqual(enrich(built[name]), built[name]);
  }
});

// ---- the owner's pre-delivery check, frame by frame (every second frame) ----
for (const name of TOPICS) {
  test(`${name}: the pre-delivery check passes on every second frame (no text over land, text or things; nothing afloat on land; no line on land)`, () => {
    const { fails } = checkReel(read(name), 2);
    assert.deepEqual(fails.slice(0, 8), []);
  });
}
