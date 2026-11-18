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

// Reel 198 (17 Nov 2026, «دولت با طرح حمله به سدهای ایران چه کند؟»): the gate refused it three times, for text outside the
// safe area (road-0, road-2), text that did not fit its card (a fact and all three «چرا»), one fact over the other, and a
// close of 5.2 s. Its texts are rebuilt from the gate's log (the first 40 characters of each, the rest at the lengths the
// dilemma agent allows: a fact up to 64 characters, a reason up to 18 words); the close's line as the narrator says it.
const REASONS_198 = [
  "حمله به سدها در سند رسمی سازمان ملل ثبت می‌شود و هزینهٔ حقوقی آن برای حمله‌کننده بالا می‌رود",
  "حمله‌کننده بداند هزینه دارد و مردم پشت دولت می‌مانند و دفاع از سدها جدی‌تر می‌شود",
  "خطر حمله به غیرنظامیان کم می‌شود و راه گفت‌وگو با میانجی‌های منطقه باز می‌ماند",
];
const reel198 = (facts = 2) => {
  const base = read("set-dilemma");
  const q = "دولت با طرح حمله به سدهای ایران چه کند؟";
  return {
    ...base,
    question: q,
    hook: { text: q, figure: null, short: "دولت با حمله به سدها چه کند؟" },
    facts: [
      { k: "چه گفتند", v: "به گفتهٔ معاون وزیر خارجه: عادی‌سازی آن با تهدید سدها ممکن نیست", s: "منشور، ۹ رسانه" },
      { k: "چه شد", v: "رسانه‌های آمریکا از طرح حمله به سدهای بزرگ ایران خبر دادند", s: "منشور، ۹ رسانه" },
      { k: "واکنش", v: "سازمان ملل حمله به سدها را خلاف قوانین جنگ دانست", s: "منشور، ۴ رسانه" },
    ].slice(0, facts),
    options: base.options.map((o, i) => ({ ...o, title: ["شکایت رسمی", "هشدار بازدارنده", "میانجی‌گری"][i], gained: REASONS_198[i] })),
  };
};
// the narrator's lines: the question as it opens, the close's line (3.6 s for the ten words said until 17 Nov)
const voice198 = (end) => [{ file: "v0.mp3", cue: "start", frames: 102 }, { file: "v1.mp3", cue: "end", frames: Math.ceil(end * 30) }];
const plan198 = (facts = 2, end = 1.6) => planOf("dilemma", reel198(facts), { fonts, badge: true, measure, voiceIn: voice198(end) });

for (const n of [2, 3]) {
  test(`Reel 198 with ${n} facts: long facts and reasons stay in their cards, inside the safe area, never one over another`, () => {
    const plan = plan198(n);
    const failed = planChecks(plan, "دولت چه کند؟").filter((c) => !c.ok).map((c) => `${c.id}: ${c.detail}`);
    assert.deepEqual(failed, []);
    // the facts are whole: «ممکن نیست» keeps its «نیست»
    const said = (id) => plan.pieces.find((p) => p.id === id).lines.slice(1, -1).map((l) => l.text).join(" ");
    reel198(n).facts.forEach((f, k) => assert.equal(said(`fact-${k}`), f.v));
    // every road keeps its «چرا»; a reason too long for the column is cut after a whole clause (on its verb, before «و»)
    plan.pieces.filter((p) => /^road-/.test(p.id)).forEach((r, k) => {
      const text = r.sub.map((l) => l.text).join(" ");
      const whole = `چرا: ${REASONS_198[k]}`;
      assert.match(text, /^چرا: /);
      assert.ok(text === whole || (whole.startsWith(`${text} و `) && /(د|ند|است|ست)$/.test(text)), `«${text}» is «${whole}» or a clause of it`);
    });
  });
}

test("Reel 198: its facts stacked by their own heights (the fixed step of 390 px put a fact of four lines over the next)", () => {
  const plan = plan198(2);
  const [a, b] = ["fact-0", "fact-1"].map((id) => plan.pieces.find((p) => p.id === id));
  assert.ok(a.h > 390 && b.at[1] - a.at[1] >= (a.h + b.h) / 2, `fact-0 (${a.h} px) above fact-1, not over it`);
});

test("the close of Reel 198: the narrator's ten-word line (3.6 s) cannot close in 3.8 s; a line of 2.4 s or less does", () => {
  const close = (end) => planChecks(plan198(2, end), "دولت چه کند؟").find((c) => c.id === "close");
  assert.equal(close(3.6).ok, false, close(3.6).detail);
  assert.match(close(3.6).detail, /5\.0 s/);
  for (const end of [1.2, 1.6, 2.0, 2.4]) assert.ok(close(end).ok, `${end} s: ${close(end).detail}`);
});

// Ali, 18 Nov: «پرچم ایران غلطه». Iran's flag is the one its law sets: 4 : 7, three equal bands, the red emblem, 22 takbir.
test("Iran's flag: 4 : 7, its colours, 11 + 11 takbir, the emblem, no historical flag by default", async () => {
  const { IRAN_FLAG, IRAN_ASPECT, HISTORICAL_FLAGS, flagAspect, takbirXs } = await import("../src/set/iran-flag.ts");
  assert.equal(IRAN_FLAG.height / IRAN_FLAG.width, 4 / 7);
  assert.equal(flagAspect("IRN"), IRAN_ASPECT);
  assert.equal(flagAspect("SAU"), 1.5);
  assert.deepEqual([IRAN_FLAG.green, IRAN_FLAG.white, IRAN_FLAG.red], ["#239f40", "#ffffff", "#da0000"]);
  const xs = takbirXs();
  // eleven along the green band's lower edge and eleven along the red band's upper edge, all on the sheet
  assert.equal(xs.length * IRAN_FLAG.takbir.wordsAt.length, 22);
  assert.ok(xs.every((x) => x > 0 && x + 37 * IRAN_FLAG.takbir.wordsScale < IRAN_FLAG.width));
  const third = IRAN_FLAG.height / 3;
  const [oy] = [IRAN_FLAG.takbir.origin[1]];
  // the words sit in the green just above its edge, and in the red just below the white
  assert.ok(oy + IRAN_FLAG.takbir.wordsAt[0] < third && oy + IRAN_FLAG.takbir.wordsAt[0] + 10 * IRAN_FLAG.takbir.wordsScale <= third + 1);
  assert.ok(oy + IRAN_FLAG.takbir.wordsAt[1] >= 2 * third - 1 && oy + IRAN_FLAG.takbir.wordsAt[1] < 2 * third + 20);
  assert.equal(IRAN_FLAG.emblem.half.length, 4);
  assert.deepEqual([...IRAN_FLAG.emblem.centre], [IRAN_FLAG.width / 2, IRAN_FLAG.height / 2]);
  assert.deepEqual(Object.keys(HISTORICAL_FLAGS), []);
  // every flag the samples ask for is a current state's key, never a historical one
  const keys = fs.readdirSync(new URL("../samples/", import.meta.url)).filter((f) => f.endsWith(".json")).flatMap((f) => [...fs.readFileSync(new URL(`../samples/${f}`, import.meta.url), "utf8").matchAll(/"iso3"\s*:\s*"([^"]+)"/g)].map((m) => m[1]));
  assert.ok(keys.every((k) => /^[A-Z]{3}$/.test(k)), keys.join(","));
});
