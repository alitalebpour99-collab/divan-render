// The set style's plans and the gate's plan checks, without a browser or ffmpeg:
//   node --test tests/        (Node 23.6 or later: the plans are TypeScript, read with type stripping)
// The samples of the three formats must pass every plan check; a made-up bad plan must fail the checks it breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { planOf } from "../src/set/plans.ts";
import { hookWeight, planChecks, verdict, wordsOf } from "../gate.mjs";
import { BREATH, MIN_PAUSE, badgeCueCheck, closeMoment, needFrames, speechOf } from "../src/set/badge-sound.js";

const fonts = { vazir: "Vazirmatn", naskh: "Noto Naskh Arabic" };
// a rough Persian measure: a letter is about half its size wide (the browser measures the real font)
const measure = (t, s) => t.length * s * 0.5;
const read = (name) => JSON.parse(fs.readFileSync(new URL(`../samples/${name}.json`, import.meta.url), "utf8"));
const voiceOf = (name) => {
  const file = new URL(`../samples/${name}.voice.json`, import.meta.url);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).map((l, i) => ({ file: `v${i}.mp3`, cue: l.cue, frames: Math.ceil(l.seconds * 30) })) : [];
};

for (const [format, name] of [
  ["figure", "set-figure"],
  ["war", "set-war"],
  ["dilemma", "set-dilemma"],
  ["versus", "set-versus-sau"],
  ["versus", "set-versus-tur"],
]) {
  test(`${name}: every plan check passes`, () => {
    const props = read(name);
    const cover = read(`${name}.cover`);
    const plan = planOf(format, props, { fonts, badge: true, measure, voiceIn: voiceOf(name) });
    const checks = planChecks(plan, cover.big);
    const failed = checks.filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => `${c.id}: ${c.detail}`), []);
    assert.ok(plan.total / 30 >= plan.length[0] && plan.total / 30 <= plan.length[1]);
  });
}

test("a long hook, a late source and a badge in the middle fail, in plain Persian", () => {
  const props = { ...read("set-figure"), hook: { text: "این یک جملهٔ خیلی بلند است که هشت واژه دارد", figure: "۲" } };
  const plan = planOf("figure", props, { fonts, badge: true, measure });
  plan.hud = plan.hud.filter((h) => h.kind !== "source");
  const badge = plan.hud.find((h) => h.kind === "badge");
  badge.box = { ...badge.box, y: 900 };
  const failed = planChecks(plan, "دو واژه").filter((c) => !c.ok).map((c) => c.id);
  for (const id of ["hook-words", "source", "badge", "cover"]) assert.ok(failed.includes(id), `${id} should fail: ${failed}`);
  assert.match(verdict({ checks: planChecks(plan, "دو واژه") }), /^این ویدیو از بازبینی پیش از ارسال رد شد/);
});

test("words are counted as a reader counts them", () => {
  assert.equal(wordsOf("۱۸۴ رویداد در ۲۳۱ روز جنگ. کجاها؟").length, 7);
  // two figures weigh one word: the owner's hook is seven
  assert.equal(hookWeight("۱۸۴ رویداد در ۲۶۰ روز جنگ. کجا بودند؟"), 7);
});

// the review of 2026-11-14: what the new checks must refuse
const planFor = (format, name) => planOf(format, read(name), { fonts, badge: true, measure, voiceIn: voiceOf(name) });
const failedIds = (plan, name) => planChecks(plan, read(`${name}.cover`).big).filter((c) => !c.ok).map((c) => c.id);

test("a card seen before its words, and a stretch with nothing on the screen, fail empty-card", () => {
  const plan = planFor("dilemma", "set-dilemma");
  const road = plan.pieces.find((p) => p.id === "road-1");
  road.reveal = road.show[0][0] + 30;
  assert.ok(failedIds(plan, "set-dilemma").includes("empty-card"));
  // nothing on the table for a second in the middle of the film
  const gap = planFor("dilemma", "set-dilemma");
  const from = gap.shots[2].at;
  for (const p of gap.pieces) p.show = p.show.map(([a, c]) => (a < from + 40 && c > from ? [from + 40, Math.max(c, from + 41)] : [a, c]));
  assert.ok(failedIds(gap, "set-dilemma").includes("empty-card"));
});

test("cards against one edge fail fill-x", () => {
  const plan = planFor("dilemma", "set-dilemma");
  for (const p of plan.pieces.filter((x) => x.id.startsWith("road-"))) p.at = [p.at[0] - 90, p.at[1]];
  assert.ok(failedIds(plan, "set-dilemma").includes("fill-x"));
});

test("a mark under 40 px fails text-size", () => {
  const plan = planFor("dilemma", "set-dilemma");
  plan.hud.find((h) => h.kind === "source").lines[0].size = 36;
  assert.ok(failedIds(plan, "set-dilemma").includes("text-size"));
});

test("a count set apart from a sentence that needs it fails hook-number; the count inside passes", () => {
  const plan = planFor("war", "set-war");
  assert.ok(!failedIds(plan, "set-war").includes("hook-number"));
  assert.match(plan.hook.text, /^۱۸۴ رویداد در ۲۶۰ روز جنگ\. کجا بودند؟$/);
  const hook = plan.pieces.find((p) => p.id === "hook");
  hook.lines = [{ text: "رویداد در ۲۶۰ روز جنگ. کجاها؟", size: 96, weight: 700 }];
  plan.pieces.push({ id: "hook-figure", kind: "figure", at: [hook.at[0], hook.at[1] + 600], w: 400, h: 200, lift: 0.08, show: [[0, 60]], lines: [{ text: "۱۸۴", size: 190, weight: 800 }], num: true });
  assert.ok(failedIds(plan, "set-war").includes("hook-number"));
});

test("the war's tally does not count the events a second time; every road has its «چرا»", () => {
  const war = planFor("war", "set-war");
  assert.ok(!war.pieces.some((p) => p.kind === "counter" || p.kind === "figure"));
  const dilemma = planFor("dilemma", "set-dilemma");
  const roads = dilemma.pieces.filter((p) => /^road-/.test(p.id));
  assert.equal(roads.length, 3);
  for (const r of roads) assert.match(r.sub?.[0]?.text ?? "", /^چرا: /);
});

// the owner's review of 2026-11-16: the close, the lines
for (const [format, name] of [["figure", "set-figure"], ["war", "set-war"], ["dilemma", "set-dilemma"], ["versus", "set-versus-sau"]]) {
  test(`${name}: the close is about three seconds, at home, with the first picture on the table`, () => {
    const plan = planFor(format, name);
    const closeS = (plan.total - plan.close) / 30;
    assert.ok(closeS >= 2.5 && closeS <= 3.8, `${closeS} s`);
    const closeShot = plan.shots.find((x) => x.why === "to the close");
    assert.deepEqual([closeShot.pose.x, closeShot.pose.y], [plan.shots[0].pose.x, plan.shots[0].pose.y], "the camera goes home, not to a station of its own");
    assert.ok(!plan.pieces.some((p) => p.id === "foot"), "no card of its own for the address");
    const ask = plan.pieces.find((p) => p.id === "ask");
    assert.equal(ask.lines.at(-1).text, "divan.ahura.cloud");
  });
}

test("a close on a bare table, and a close of six seconds, fail «close»", () => {
  const plan = planFor("figure", "set-figure");
  for (const p of plan.pieces.filter((x) => x.kind === "figure" || x.kind === "model")) p.show = p.show.filter(([a]) => a === 0);
  assert.ok(failedIds(plan, "set-figure").includes("close"));
  const long = planFor("figure", "set-figure");
  long.close -= 90;
  assert.ok(failedIds(long, "set-figure").includes("close"));
});

test("lines are balanced: a sentence keeps its line, no word stands alone beside full lines", async () => {
  const { breakLines } = await import("../src/set/fit.ts");
  const w = (t) => t.length * 40;
  assert.deepEqual(breakLines("تولید نفت خام. یعنی چه؟".split(" "), 600, w), ["تولید نفت خام.", "یعنی چه؟"]);
  assert.deepEqual(breakLines("ایران در ژوئیه روزی حدود ۲٫۵ میلیون بشکه نفت تولید کرد.".split(" "), 760, w).map((l) => l.split(" ").length).filter((n) => n < 2), []);
  for (const line of breakLines("این فهرست همهٔ حمله‌ها نیست و هر روز کامل‌تر می‌شود".split(" "), 700, w)) assert.ok(w(line) <= 700);
  const plan = planFor("figure", "set-figure");
  plan.pieces.find((p) => p.id === "explain-1").lines = [{ text: "ایران در ژوئیه روزی حدود", size: 64, weight: 500 }, { text: "۲٫۵", size: 64, weight: 500 }, { text: "میلیون بشکه نفت تولید کرد.", size: 64, weight: 500 }];
  assert.ok(failedIds(plan, "set-figure").includes("balanced"));
});

// round 2 (2026-11-16): one real object a figure, on the table through the film
test("«عدد روز» puts the thing its figure is about on the table, from the hook to the close", async () => {
  const { objectFor, OBJECTS } = await import("../src/set/props/objects.ts");
  assert.equal(objectFor({ label: "تولید نفت خام", unit: "میلیون بشکه در روز" }), "barrel");
  assert.equal(objectFor({ label: "بارگیری نفت از پایانه‌ها", unit: "میلیون بشکه در روز" }), "tanker");
  assert.equal(objectFor({ label: "تورم نقطه‌به‌نقطه", unit: "درصد" }), "banknotes");
  assert.equal(objectFor({ label: "ناترازی بنزین", unit: "میلیون لیتر در روز" }), "pump");
  assert.equal(objectFor({ label: "کمبود برق در اوج مصرف", unit: "مگاوات" }), "pylon");
  assert.equal(objectFor({ label: "ذخیرهٔ اورانیوم با غنای ۶۰ درصد", unit: "کیلوگرم" }), "centrifuge");
  assert.equal(objectFor({ label: "چیزی دیگر", unit: "" }), "abacus");
  assert.equal(objectFor({ label: "تولید نفت خام", object: "crate" }), "crate", "the site's own choice comes first");
  assert.equal(objectFor({ label: "تولید نفت خام", object: "nothing" }), "barrel");
  for (const [id, m] of Object.entries(OBJECTS)) assert.ok(m.body.length && m.ground > 100 && m.metal?.length === 4, id);
  const plan = planFor("figure", "set-figure");
  const things = plan.pieces.filter((p) => p.kind === "model");
  assert.ok(things.length >= 3 && things.every((p) => p.model === "barrel"), "the oil figure's object is the drum, in every scene");
  assert.ok(things.find((p) => p.id === "hook-object").show.some(([a]) => a === 0), "there from the first frame");
  assert.ok(!failedIds(plan, "set-figure").includes("object"));
});

test("a figure with nothing but plates fails «object»", () => {
  const plan = planFor("figure", "set-figure");
  plan.pieces = plan.pieces.filter((p) => p.kind !== "model");
  assert.ok(failedIds(plan, "set-figure").includes("object"));
});

// the badge in a pause (owner, 2026-11-17: «بج رو ببر توی یه مکث»): the badge, and its tick on its first frame, come in a
// pause of the narration; the close's line waits a breath of about 0.4 s when it has no pause of its own; no word is cut

for (const [format, name] of [["figure", "set-figure"], ["war", "set-war"], ["dilemma", "set-dilemma"], ["versus", "set-versus-sau"], ["versus", "set-versus-tur"]]) {
  test(`${name}: the badge and its tick in a pause of the narration, the close as long as before`, () => {
    const plan = planFor(format, name);
    const off = planOf(format, read(name), { fonts, badge: false, measure, voiceIn: voiceOf(name) });
    const badge = plan.hud.find((h) => h.kind === "badge");
    const from = badge.show[0][0];
    const tick = plan.sfx.filter((s) => s.name === "badge");
    assert.equal(tick.length, 1, `the tick is played: ${badge.cue?.why ?? ""}`);
    assert.equal(tick[0].at, from, "on the badge's first frame");
    // the silence around it: from the last word before to the next word after
    const speech = speechOf(plan.voice);
    const before = Math.max(...speech.filter(([, z]) => z <= from).map(([, z]) => z));
    const after = Math.min(...speech.filter(([a]) => a > from).map(([a]) => a));
    assert.ok(!speech.some(([a, z]) => a < from + needFrames() - 2 && z > from), "over no word");
    assert.ok((after - before) / 30 >= MIN_PAUSE, `a pause of ${((after - before) / 30).toFixed(2)} s`);
    assert.ok(after - from >= Math.round(BREATH * 30), "the close's line waits a breath after the badge");
    // every line plays whole, the close keeps its length; without the badge the line comes as before
    assert.deepEqual(plan.voice.map((v) => v.frames), off.voice.map((v) => v.frames));
    assert.equal(plan.total, off.total);
    assert.equal(off.voice.at(-1).from, off.close + 8);
    assert.ok(badgeCueCheck({ hud: plan.hud.map((h) => (h.kind === "badge" ? { ...h, from } : h)), sfx: plan.sfx }).ok);
  });
}

test("closeMoment: a pause between two words of the close's line first, else a breath before it", () => {
  const need = needFrames();
  // «... بفرست،» then a pause of 0.6 s, then «و دیوان را دنبال کن»: the badge in that pause, the line where it was
  const words = [{ text: "این", from: 0, frames: 8 }, { text: "بفرست،", from: 10, frames: 20 }, { text: "و", from: 48, frames: 5 }, { text: "دیوان", from: 55, frames: 15 }];
  const inner = closeMoment({ at: 108, line: { frames: 72, words }, before: [[40, 96]] });
  assert.deepEqual(inner, { badge: 108 + 30 + 2, lineAt: 108, room: "pause" });
  // no pause in the line: it waits; the badge on its frame; no word cut, the pause long enough
  const breath = closeMoment({ at: 108, line: { frames: 72 }, before: [[40, 96]] });
  assert.equal(breath.room, "breath");
  assert.equal(breath.badge, 108);
  assert.ok(breath.lineAt - breath.badge >= Math.round(BREATH * 30) && breath.lineAt - 96 >= need);
  // the line before still being said at the close: the badge after its last word
  const late = closeMoment({ at: 108, line: { frames: 72 }, before: [[40, 112]] });
  assert.ok(late.badge >= 113 && late.lineAt - 112 >= need);
  // a pause too late to keep the badge 1.5 s before the loop is not taken
  assert.equal(closeMoment({ at: 108, line: { frames: 72, words }, before: [], hi: () => 120 }).room, "breath");
});
