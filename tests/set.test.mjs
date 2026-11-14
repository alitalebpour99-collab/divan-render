// The set style's plans and the gate's plan checks, without a browser or ffmpeg:
//   node --test tests/        (Node 23.6 or later: the plans are TypeScript, read with type stripping)
// The samples of the three formats must pass every plan check; a made-up bad plan must fail the checks it breaks.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { planOf } from "../src/set/plans.ts";
import { planChecks, verdict, wordsOf } from "../gate.mjs";

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
});
