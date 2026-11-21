// The storyboard's own checks (storyboard-fa.md §1 step 6, §2 «قانون‌های هر نما»), made before anything is drawn.
// Pure: the site runs them on a draft, the renderer again on what it will draw. The file itself is measured after
// the render (video/qa.mjs): frozen picture, sync, legibility, loop, loudness, darkness, the vision score.
import { TEMPLATES, recipeProblems } from "./templates";
import type { ReelContent, Storyboard } from "./types";
import { wordsIn } from "./director";

export type Check = { id: string; ok: boolean; detail: string; fa: string };

const DOT = /[؀-ۿ]\s*[·|]|[·|]\s*[؀-ۿ]/;
const LATIN = /[A-Za-z]{2,}/;

export function storyboardChecks(c: ReelContent, sb: Storyboard): Check[] {
  const out: Check[] = [];
  const add = (id: string, ok: boolean, detail: string, fa: string) => out.push({ id, ok, detail, fa });
  const t = TEMPLATES[c.template];
  const secs = sb.total / sb.fps;
  add("length", secs >= t.seconds[0] && secs <= t.seconds[1], `${secs.toFixed(1)} s (${t.seconds[0]} to ${t.seconds[1]} for ${t.id})`, "طول ویدیو برای این قالب درست نیست");
  const recipe = recipeProblems(c);
  add("recipe", !recipe.length, recipe.length ? recipe.join("; ") : `beats follow «${t.fa}»`, "ترتیب بخش‌ها با قالب نمی‌خواند");
  const bad = sb.shots.filter((s) => s.dur < 0.99 || s.dur > 2.01);
  add("shot-length", !bad.length, bad.length ? `shots out of 1–2 s: ${bad.map((s) => `#${s.n} ${s.dur.toFixed(2)} s`).join(", ")}` : `${sb.shots.length} shots, each 1 to 2 s`, "نمایی کوتاه‌تر از ۱ یا بلندتر از ۲ ثانیه است");
  const wordy = sb.shots.filter((s) => wordsIn(s.text.header) + wordsIn(s.text.sub) > sb.checks.max_words_per_shot);
  add("shot-words", !wordy.length, wordy.length ? `over ${sb.checks.max_words_per_shot} words: ${wordy.map((s) => `#${s.n}`).join(", ")}` : "8 words or fewer in every shot", "متن یک نما بیش از ۸ کلمه است");
  const crowded = sb.shots.filter((s) => wordsIn(s.text.header) + wordsIn(s.text.sub) + s.text.chips.reduce((n, x) => n + wordsIn(x), 0) > sb.checks.max_words_on_screen);
  add("screen-words", !crowded.length, crowded.length ? `over 12 words on screen: ${crowded.map((s) => `#${s.n}`).join(", ")}` : "12 words or fewer on screen", "روی صفحه بیش از ۱۲ کلمه است");
  const hook = c.beats[0];
  const hw = hook && hook.kind === "hook" ? wordsIn(hook.title) : 99;
  add("hook-words", hw >= 2 && hw <= 7, `hook of ${hw} words`, "قلاب بیش از ۷ کلمه است");
  // the hook is one picture: it says its line and gives way within 3 s (the reference turns its first picture in 2)
  const hookEnd = sb.shots.filter((s) => s.beat === 0 && s.text.header).reduce((t, s) => Math.max(t, s.start + s.dur), 0);
  add("hook-short", hookEnd <= 3.0, `the hook lasts ${hookEnd.toFixed(1)} s`, "قلاب بیش از ۳ ثانیه طول می‌کشد");
  const off = sb.shots.filter((s) => s.word_at !== null && Math.abs(s.word_at - s.start) > sb.checks.sync_tolerance_s + 0.2);
  add("sync", !off.length, off.length ? `shots far from their word: ${off.map((s) => `#${s.n} ${(s.word_at! - s.start).toFixed(2)} s`).join(", ")}` : "every shot starts on its word (±0.4 s)", "تصویر با کلمهٔ راوی هم‌زمان نیست");
  const v0 = sb.voice[0];
  add("voice-zero", !sb.voice.length || v0.from <= 3, v0 ? `first line at frame ${v0.from}` : "no narrator", "صدای راوی از ثانیهٔ صفر شروع نمی‌شود");
  const lastWord = sb.words.length ? sb.words[sb.words.length - 1].end : 0;
  add("end", !sb.words.length || secs - lastWord <= sb.checks.end_after_last_word_s + 1.2, `${(secs - lastWord).toFixed(1)} s after the last word`, "پایان ویدیو بعد از آخرین کلمه طولانی است");
  const meaningless = sb.shots.filter((s) => !s.meaning || !s.picture.asset);
  add("meaning", !meaningless.length, meaningless.length ? `shots without a meaning: ${meaningless.map((s) => `#${s.n}`).join(", ")}` : "every shot has a picture and a reason", "نمایی بی‌معنی یا بی‌تصویر است");
  // two effects a second at most
  const sfx = sb.shots.filter((s) => s.sound.sfx).map((s) => s.start);
  const dense = sfx.some((a, i) => sfx.filter((b) => b >= a && b < a + 1).length > 2 && i >= 0);
  add("sfx", !dense, `${sfx.length} effects`, "بیش از دو افکت در یک ثانیه است");
  const texts = [c.kicker, ...c.beats.flatMap((b) => (b.kind === "road" ? [b.road.title, b.road.cost] : b.kind === "hook" ? [b.title, b.sub ?? ""] : b.kind === "number" ? [b.big, b.unit, b.text] : b.kind === "demand" ? [b.wants] : b.kind === "poll" ? [b.q, ...b.options.map((o) => o.title)] : b.kind === "map" ? [b.caption ?? "", ...b.marks.flatMap((m) => (m.kind === "callout" ? [m.bold, m.sub ?? ""] : []))] : []))];
  add("no-dot", !texts.some((s) => DOT.test(s)), "no «·» or «|» beside Persian", "کنار متن فارسی «·» یا «|» آمده است");
  add("persian", !texts.some((s) => LATIN.test(s)), "no Latin words on screen (a source may name an outlet as it names itself)", "روی صفحه واژهٔ لاتین آمده است");
  // every road and every figure carries its source; every map beat with a callout too
  const unsourced = c.beats.filter((b) => (b.kind === "road" && !b.road.source) || (b.kind === "number" && !b.source) || (b.kind === "demand" && !b.source) || (b.kind === "chart" && !b.chart.source) || (b.kind === "map" && b.marks.some((m) => m.kind === "callout" || m.kind === "pins") && !b.source));
  add("sources", !unsourced.length, unsourced.length ? `beats without a source: ${unsourced.map((b) => b.cue).join(", ")}` : "every figure, road and mark has its source", "یک عدد، راه یا نشانه منبع ندارد");
  // the map rules: contested ground hatched, colours by actor or by road, never both
  if (c.convention === "actors") {
    const roadColours = c.beats.some((b) => b.kind === "road" && ["#ff5a4e", "#3da5ff", "#2ed3a0"].includes(b.road.color));
    add("convention", !roadColours, "colours belong to the actors", "رنگ راه‌ها و رنگ بازیگرها با هم آمده است");
  }
  return out;
}
