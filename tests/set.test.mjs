// The set style's plans and the gate's plan checks, without a browser or ffmpeg:
//   node --test tests/        (Node 23.6 or later: the plans are TypeScript, read with type stripping)
// The samples of the three formats must pass every plan check; a made-up bad plan must fail the checks it breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { planOf } from "../src/set/plans.ts";
import { hookWeight, planChecks, verdict, wordsOf } from "../gate.mjs";

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
  const gap = planFor("dilemma", "set-dilemma");
  const ask = gap.pieces.find((p) => p.id === "ask");
  for (const p of gap.pieces.filter((x) => x.id === "ask" || x.id === "foot")) p.show = [[ask.show[0][0] + 20, p.show[0][1]]];
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
