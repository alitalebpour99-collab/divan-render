// The gate of the set style: the checks a Reel must pass before it is handed
// back to the site, and so before the owner sees it (the hub's social audit of
// 2026-11-13, the style guide and the owner's rules). A check fails, it does
// not warn:
//
//   hook-words   the words on screen in the first 1.5 s: at most 7, there from the first frame, no logo or card first
//   hook-motion  the camera moves from the first frame, and the picture really changes in the first 1.5 s (measured)
//   length       the Reel's length is inside its format's range
//   moves        a camera event at least every 3 s, and no 2.5 s of frozen picture (measured)
//   loop         the camera ends where it began with the first picture back, and the last frame looks like the first (measured)
//   safe         every text inside the frame and outside the apps' header, rail and caption rows, on every frame it is seen
//   text-size    no text to be read under 48 px (the owner's floor), no text at all under 40 px (the source, the AI note, a label)
//   empty-card   no card seen without its words, and no stretch of frames with nothing on the table (the review of 2026-11-14)
//   fill-x       the cards of a resting moment fill the column and sit in the middle of the screen, not against one edge
//   hook-number  a figure the hook counts stands inside its sentence («۱۸۴ رویداد در ۲۶۰ روز جنگ»), never apart from a sentence that needs it
//   overlap      no screen line (source, AI note, badge) over a piece of the table
//   halves       the upper and the lower half of the safe area both hold something at every resting moment
//   source       every figure on screen has its source on screen at the same time
//   persian      no «·» and no «|» beside Persian
//   badge        the channel badge: in the bottom safe area, never in the middle, 1.5 to 2.5 s, at the close, gone before the loop
//   sound-fx     at most two effects in any second
//   loudness     −14 LUFS within 1 LU, true peak −1 dBTP or lower (measured)
//   dark         near-black pixels 35 % or less (measured)
//   cover        the tile shows three or four big words
//
// The plan is the composition's own (src/set/plans.ts, carried in its props),
// so the gate checks exactly what was drawn. The plan's checks are pure and
// tested (tests/gate.test.mjs); the measured ones need ffmpeg.
//   DIVAN_GATE=warn  report and go on      DIVAN_GATE=off  no gate at all
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TARGET, loudness } from "./finish.mjs";
import { badgeCueCheck } from "./src/set/badge-sound.js";

const FPS = 30;
const W = 1080;
const H = 1920;
// the same numbers as src/set/space.ts (measured on the owner's screenshots of 2026-11-13)
const K = 2617 / H;
const CUT = (W * K - 1320) / 2;
export const ZONES = { top: Math.ceil((0.11 * 2868) / K), right: Math.floor((0.86 * 1320 + CUT) / K), left: Math.ceil(CUT / K), bottom: Math.floor(2158 / K) };
export const MIDDLE = { top: Math.round(H / 3), bottom: Math.round((2 * H) / 3) };
// the column's middle, as src/set/space.ts has it (COL_X0): a little left of the frame's middle, clear of the rail
const COL_X = 520;
const EYE_Y = Math.round((ZONES.top + ZONES.bottom) / 2);
export const MIN_TEXT = 48;
export const MIN_MARK = 40;
/** A word the hook's figure counts: a sentence that begins with one needs its figure in front of it. */
const COUNTED = /^(رویداد|رویدادها|حمله|حمله‌ها|نفر|تن|مورد|کشته|زخمی|بار|دور|کشور|روز|سال|ماه|تأسیسات|موشک|پهپاد)$/;
/** fill-x: the middle of the cards within this many px of the frame's middle, their width at least this share of the safe width */
const FILL = { centre: 40, width: 0.6 };
/** empty-card: at most this many frames (0.13 s) with nothing on the screen */
const EMPTY_RUN = 4;
const NUMERAL = /^[0-9۰-۹٫٬.,/]+$/;
/** The words of a hook as a reader takes them in: two figures weigh one word (src/set/plans.ts hookWeight). */
export const hookWeight = (s) => {
  const w = wordsOf(s);
  const nums = w.filter((x) => NUMERAL.test(x)).length;
  return w.length - nums + Math.ceil(nums / 2);
};
const HOOK = Math.round(1.5 * FPS);
const FADE = 6;
const MOVE = { cut: 0, whip: 7, glide: 20 };

export class GateRefusal extends Error {}

const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const sec = (f) => (f / FPS).toFixed(1);
export const wordsOf = (s) => String(s).replace(/[؟?!.،,؛:«»"()]/g, " ").split(/\s+/).filter(Boolean);
/** a «·» or «|» with Persian beside it (spaces between allowed) */
export const dotBeside = (s) => /[؀-ۿ]\s*[·|]|[·|]\s*[؀-ۿ]/.test(String(s));
const DIGIT = /[0-9۰-۹]/;

// ---------- the camera, as src/set/space.ts has it ----------
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const easeInOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const drifted = (s, frames) => {
  const t = Math.max(0, frames) / FPS;
  return { ...s.pose, zoom: s.pose.zoom * (1 + (s.push ?? 0) * 2.2 * (1 - Math.exp(-t / 2.2))), turn: s.pose.turn + (s.sway ?? 0) * Math.sin(t * 1.3) };
};
const mixPose = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, zoom: a.zoom * (b.zoom / a.zoom) ** t, turn: a.turn + (b.turn - a.turn) * t });
const punchAt = (p, f) => {
  const t = f - p.at;
  if (t < 0 || t > 22) return 0;
  return t < 5 ? smooth(t / 5) : 1 - smooth((t - 5) / 17);
};
export function poseAt(shots, punches, f) {
  let k = 0;
  for (let i = 0; i < shots.length; i += 1) if (shots[i].at <= f) k = i;
  const s = shots[k];
  let pose = drifted(s, f - s.at);
  if (k > 0) {
    const len = MOVE[s.move];
    const u = len ? (f - s.at) / len : 1;
    if (u < 1) pose = mixPose(drifted(shots[k - 1], s.at - shots[k - 1].at), drifted(s, 0), easeInOut(u));
  }
  const depth = punches.reduce((m, p) => m + p.depth * punchAt(p, f), 0);
  return depth ? { ...pose, zoom: pose.zoom * (1 + depth) } : pose;
}
function boxOf(p, pose) {
  const a = (-pose.turn * Math.PI) / 180;
  const dx = p.at[0] - pose.x;
  const dy = p.at[1] - pose.y;
  const k = pose.zoom * (1 + p.lift);
  const cx = COL_X + (dx * Math.cos(a) - dy * Math.sin(a)) * k;
  const cy = EYE_Y + (dx * Math.sin(a) + dy * Math.cos(a)) * k;
  const t = (Math.abs(pose.turn) * Math.PI) / 180;
  const w = (p.w * Math.cos(t) + p.h * Math.sin(t)) * k;
  const h = (p.h * Math.cos(t) + p.w * Math.sin(t)) * k;
  return { x: cx - w / 2, y: cy - h / 2, w, h, k };
}
export function seen(windows, f) {
  let v = 0;
  for (const [a, b] of windows) {
    if (f < a || f >= b) continue;
    v = Math.max(v, Math.min(a === 0 ? 1 : smooth((f - a + 1) / FADE), b >= 1e8 ? 1 : smooth((b - f) / FADE)));
  }
  return v;
}
const inZones = (b) => b.x >= ZONES.left - 0.5 && b.y >= ZONES.top - 0.5 && b.x + b.w <= ZONES.right + 0.5 && b.y + b.h <= ZONES.bottom + 0.5;
const shrink = (b) => ({ x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 8 });
const meets = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const textsOf = (plan) => [...plan.pieces.flatMap((p) => (p.lines ?? []).map((l) => l.text)), ...plan.hud.flatMap((h) => h.lines.map((l) => l.text)), plan.hook.text];
const hasDigits = (p) => (p.lines ?? []).some((l) => DIGIT.test(l.text)) || Boolean(p.count);

/** The checks that need only the plan (and the tile's words). Each: {id, ok, detail, fa}. */
export function planChecks(plan, cover) {
  const out = [];
  const add = (id, ok, detail, faText) => out.push({ id, ok: Boolean(ok), detail, fa: faText });
  const CLOSE_MAX = 3.8;
  /** the formats that must show a real thing through the film; «دوراهی امروز» joins them when it is redrawn (round 3) */
  const OBJECT_FORMATS = ["figure", "versus", "war"];
  const total = plan.total;
  const frames = [];
  for (let f = 0; f < total; f += 2) frames.push(f);

  // the hook: what is readable in the first 1.5 s, the screen lines (the source) not counted
  const early = plan.pieces.filter((p) => p.show.some(([a]) => a < HOOK) && (p.lines ?? []).length);
  const hookWords = hookWeight(early.flatMap((p) => p.lines.map((l) => l.text)).join(" "));
  const fromZero = early.some((p) => p.show.some(([a]) => a === 0));
  const card = plan.hud.some((h) => h.kind === "badge" && h.show.some(([a]) => a < HOOK));
  add("hook-words", hookWords >= 1 && hookWords <= 7 && fromZero && !card, `${hookWords} words in the first 1.5 s, from frame 0: ${fromZero}, badge or card first: ${card}`, `در ثانیهٔ اول ${fa(hookWords)} واژه روی تصویر است (حداکثر ۷، از همان فریم اول)`);
  const first = plan.shots[0];
  const moving = (first?.push ?? 0) > 0 || (first?.sway ?? 0) > 0 || plan.shots.some((s) => s.at > 0 && s.at < HOOK) || plan.punches.some((p) => p.at < HOOK);
  add("hook-camera", moving, moving ? "the camera moves from the first frame" : "no camera move in the first 1.5 s", "تصویر در ثانیهٔ اول حرکت ندارد");

  const s = total / FPS;
  add("length", s >= plan.length[0] && s <= plan.length[1], `${s.toFixed(1)} s, allowed ${plan.length[0]}–${plan.length[1]} s`, `طول ویدیو ${fa(Math.round(s))} ثانیه است، بیرون از بازهٔ ${fa(plan.length[0])} تا ${fa(plan.length[1])}`);

  const events = [...plan.shots.map((x) => x.at), ...plan.punches.map((x) => x.at)].sort((a, b) => a - b);
  const marks = [0, ...events, total];
  let gap = 0;
  let at = 0;
  for (let i = 1; i < marks.length; i += 1) if (marks[i] - marks[i - 1] > gap) [gap, at] = [marks[i] - marks[i - 1], marks[i - 1]];
  add("moves", gap <= 3 * FPS, `longest stretch without a camera event: ${sec(gap)} s from ${sec(at)} s`, `از ثانیهٔ ${fa(Math.round(at / FPS))} بیش از ۳ ثانیه چیزی در تصویر عوض نمی‌شود`);

  const last = plan.shots[plan.shots.length - 1];
  const home = last && first && last.at + MOVE[last.move] <= total - 1 && ["x", "y", "zoom", "turn"].every((k) => Math.abs(last.pose[k] - first.pose[k]) < 1e-6) && !last.push && !last.sway;
  const firstPieces = plan.pieces.filter((p) => p.show.some(([a]) => a === 0));
  const back = firstPieces.every((p) => seen(p.show, total - 1) >= 0.99);
  const rest = plan.pieces.filter((p) => !firstPieces.includes(p)).every((p) => seen(p.show, total - 1) === 0);
  add("loop-plan", home && back && rest, `camera home: ${Boolean(home)}, first picture back: ${back}, the rest gone: ${rest}`, "پایان ویدیو به تصویر اولش برنمی‌گردد");

  // every frame a text is seen: where it is, how big, what it covers
  const outside = new Set();
  const small = new Set();
  const covered = new Set();
  const unsourced = new Set();
  let emptyAt = -1;
  const inMove = (f) => plan.shots.some((x) => x.at > 0 && f >= x.at && f <= x.at + MOVE[x.move]);
  const offCentre = new Set();
  const restFrames = new Set(plan.shots.map((x) => x.at + MOVE[x.move] + 12).filter((f) => f < total));
  for (const f of frames.concat([...restFrames])) {
    const pose = poseAt(plan.shots, plan.punches, f);
    const live = plan.pieces.map((p) => ({ p, v: seen(p.show, f), b: boxOf(p, pose) })).filter((x) => x.v >= 0.5 && x.b.x + x.b.w > 0 && x.b.x < W && x.b.y + x.b.h > 0 && x.b.y < H);
    const huds = plan.hud.filter((h) => seen(h.show, f) >= 0.5);
    for (const x of live) {
      if (!(x.p.lines ?? []).length) continue;
      // a card riding out with the camera's whip or glide is not read: the zones hold for the frames between moves
      if (!inZones(x.b) && !inMove(f)) outside.add(`${x.p.id}@${sec(f)}s`);
      for (const l of [...x.p.lines, ...(x.p.sub ?? [])]) {
        // a line drawn under 48 px is a mark (the source, the AI note): 40 px at least; every other line 48
        const floor = l.size < MIN_TEXT ? MIN_MARK : MIN_TEXT;
        if (l.size * x.b.k < floor - 0.5) small.add(`${x.p.id} ${Math.round(l.size * x.b.k)} px`);
      }
      for (const h of huds) if (!inMove(f) && meets(h.box, x.b)) covered.add(`${h.id} over ${x.p.id}@${sec(f)}s`);
      // two pieces with words never lie on each other (the tally's note once lay on its last row)
      for (const y of live) if (!inMove(f) && y !== x && (y.p.lines ?? []).length && x.p.id < y.p.id && meets(shrink(x.b), shrink(y.b))) covered.add(`${x.p.id} on ${y.p.id}@${sec(f)}s`);
    }
    const figures = live.filter((x) => hasDigits(x.p));
    if (figures.length && !huds.some((h) => h.kind === "source") && !live.some((x) => x.p.mark === "src")) for (const x of figures) unsourced.add(`${x.p.id}@${sec(f)}s`);
    // the cards of a resting moment: centred on the screen and filling the column (the cards once sat against the left edge)
    if (restFrames.has(f)) {
      const cards = live.filter((x) => (x.p.lines ?? []).length && x.v >= 0.99);
      if (cards.length) {
        const l = Math.min(...cards.map((x) => x.b.x));
        const r = Math.max(...cards.map((x) => x.b.x + x.b.w));
        const mid = (l + r) / 2;
        if (Math.abs(mid - W / 2) > FILL.centre || r - l < FILL.width * (ZONES.right - ZONES.left)) offCentre.add(`${sec(f)} s: ${Math.round(l)}–${Math.round(r)}`);
      }
    }
    if (restFrames.has(f) && emptyAt < 0 && !plan.map) {
      const things = live.map((x) => x.b);
      const mid = (ZONES.top + ZONES.bottom) / 2;
      const up = things.some((b) => b.y < mid - 40);
      const down = things.some((b) => b.y + b.h > mid + 40);
      if (!up || !down) emptyAt = f;
    }
  }
  // empty cards: a card seen before its words come; and empty stretches: frames with nothing on the table (the map counts)
  const empty = new Set();
  for (const p of plan.pieces) {
    if (!["plate", "road", "legend", "ask", "chip"].includes(p.kind)) continue;
    const start = Math.min(...p.show.map(([a]) => a));
    if (!(p.lines ?? []).length) empty.add(`${p.id} has no words`);
    else if (p.reveal != null && p.reveal > start + 2) empty.add(`${p.id} empty ${sec(p.reveal - start)} s before its words`);
  }
  {
    // on the screen, not only on the table: a piece or the war map inside the frame (the war once showed nothing at 19 s, between its tally and its close)
    const inFrame = (b) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < W && b.y < H;
    let run = 0;
    for (let f = 0; f < total; f += 1) {
      const pose = poseAt(plan.shots, plan.punches, f);
      const any = plan.pieces.some((p) => seen(p.show, f) >= 0.5 && inFrame(boxOf(p, pose))) || (plan.map && inFrame(boxOf({ at: plan.map.at, w: plan.map.w, h: plan.map.h, lift: 0 }, pose)));
      run = any ? 0 : run + 1;
      if (run > EMPTY_RUN) {
        empty.add(`nothing on the screen at ${sec(f - run)} s`);
        run = -1e9;
      }
    }
  }
  // the hook's figure: inside its sentence, or the sentence stands without it
  const hookFig = plan.hook.figure ? String(plan.hook.figure) : "";
  const hookLines = plan.pieces.filter((p) => p.show.some(([a]) => a === 0));
  const sentence = hookLines.filter((p) => p.kind === "plate" || p.kind === "ask").flatMap((p) => p.lines.map((l) => l.text)).join(" ");
  const apart = hookFig && hookLines.some((p) => (p.kind === "figure" || p.kind === "counter") && p.lines?.some((l) => l.text.includes(hookFig)));
  const firstWord = wordsOf(sentence)[0] ?? "";
  const twice = hookFig && apart && sentence.includes(hookFig);
  const bare = hookFig && apart && COUNTED.test(firstWord);
  const lost = hookFig && !apart && sentence && !sentence.includes(hookFig);
  for (const h of plan.hud) {
    if (!inZones(h.box)) outside.add(h.id);
    for (const l of h.lines) if (l.size < MIN_MARK) small.add(`${h.id} ${l.size} px`);
  }
  const list = (s) => [...s].slice(0, 6).join(", ");
  add("safe", !outside.size, outside.size ? `outside the zones: ${list(outside)}` : `every text inside x ${ZONES.left}–${ZONES.right}, y ${ZONES.top}–${ZONES.bottom} on every frame it is seen`, "متنی بیرون از قاب امن است (زیر نوار یا دکمه‌های اینستاگرام)");
  add("text-size", !small.size && !(plan.overflow ?? []).length, small.size || (plan.overflow ?? []).length ? `too small: ${list(small)}${(plan.overflow ?? []).length ? `; did not fit: ${plan.overflow.join(" / ")}` : ""}` : `every text ${MIN_TEXT} px or more, marks ${MIN_MARK} px or more`, "متنی ریزتر از حد خواندن است یا در جایش جا نمی‌شود");
  add("overlap", !covered.size, covered.size ? list(covered) : "no screen line over a piece, no piece on another", "دو متن روی هم افتاده‌اند");
  add("empty-card", !empty.size, empty.size ? list(empty) : "every card comes with its words, no empty stretch", "کارت خالی یا قاب خالی روی تصویر آمده است");
  add("fill-x", !offCentre.size, offCentre.size ? `not centred or not filling the column: ${list(offCentre)}` : `the cards of every resting moment centred within ${FILL.centre} px of the middle, ${Math.round(FILL.width * 100)} % of the safe width or more`, "کارت‌ها وسط تصویر نیستند یا عرض را پر نمی‌کنند");
  add("hook-number", !twice && !bare && !lost, twice ? `the figure ${hookFig} is in the sentence and again apart from it` : bare ? `«${firstWord}» opens the hook while its figure ${hookFig} stands apart` : lost ? `the hook's figure ${hookFig} is not on screen` : hookFig ? `the figure ${hookFig} stands ${apart ? "apart from a sentence that reads without it" : "inside its sentence"}` : "no figure in the hook", "عدد هوک از جمله‌اش جدا افتاده است");
  add("halves", emptyAt < 0, emptyAt < 0 ? "both halves hold something at every resting moment" : `half the frame is empty at ${sec(emptyAt)} s`, `در ثانیهٔ ${fa(Math.round(emptyAt / FPS))} نیمی از قاب خالی است`);
  add("source", !unsourced.size, unsourced.size ? `a figure without its source on screen: ${list(unsourced)}` : "every figure has its source on screen", "عددی بدون منبعش روی تصویر آمده است");
  // the close (the owner's review of 2026-11-16): about three seconds, and never a card alone on an empty table
  const closeLen = total - plan.close;
  const PICTURE = ["model", "flag", "figure", "counter", "seal", "pin", "side", "road", "legend"];
  let bareAt = -1;
  for (let f = plan.close + 12; f < total && bareAt < 0; f += 2) {
    const pose = poseAt(plan.shots, plan.punches, f);
    const onScreen = (b) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < W && b.y < H;
    const picture = plan.pieces.some((p) => PICTURE.includes(p.kind) && seen(p.show, f) >= 0.5 && onScreen(boxOf(p, pose))) || (plan.map && onScreen(boxOf({ at: plan.map.at, w: plan.map.w, h: plan.map.h, lift: 0 }, pose)));
    if (!picture) bareAt = f;
  }
  add("close", closeLen <= CLOSE_MAX * FPS && bareAt < 0, `the close runs ${sec(closeLen)} s (${CLOSE_MAX} s or less)${bareAt < 0 ? ", the picture on the table throughout" : `; only words on the table at ${sec(bareAt)} s`}`, bareAt < 0 ? `پایان ویدیو ${fa(Math.round(closeLen / FPS))} ثانیه است (باید حدود ۳ ثانیه باشد)` : "در پایان ویدیو فقط نوشته روی میز است و تصویری نیست");
  // a picture, not only words (the owner's review of 2026-11-16: «عدد روز» was plates on cloth): through most of the film a real
  // thing is on the screen: a model, a flag, the war map with its pins
  const THING = ["model", "flag", "pin", "side"];
  if (OBJECT_FORMATS.includes(plan.format)) {
    let withThing = 0;
    let looked = 0;
    for (let f = 0; f < total; f += 3) {
      const pose = poseAt(plan.shots, plan.punches, f);
      if (plan.shots.some((x) => x.at > 0 && f >= x.at && f <= x.at + MOVE[x.move])) continue;
      looked += 1;
      const onScreen = (b) => b.x + b.w > 60 && b.y + b.h > 60 && b.x < W - 60 && b.y < H - 60;
      if (plan.pieces.some((p) => THING.includes(p.kind) && seen(p.show, f) >= 0.5 && onScreen(boxOf(p, pose))) || (plan.map && onScreen(boxOf({ at: plan.map.at, w: plan.map.w, h: plan.map.h, lift: 0 }, pose)))) withThing += 1;
    }
    const share = looked ? withThing / looked : 0;
    add("object", share >= 0.85, `a real thing on the screen in ${Math.round(share * 100)} % of the resting frames (85 % needed)`, "بیشتر ویدیو فقط نوشته است و چیزی واقعی روی میز نیست");
  }
  // balanced lines: no block of text with one short line beside long ones («تولید نفت / خام. یعنی چه؟» is two even lines; a line of one word beside a full one is not)
  const uneven = [];
  for (const p of plan.pieces) {
    const lines = (p.lines ?? []).filter((l) => !/^[a-z0-9.]+$/i.test(l.text));
    for (let i = 0; i < lines.length; ) {
      let j = i + 1;
      while (j < lines.length && lines[j].size === lines[i].size && lines[j].weight === lines[i].weight && lines[j].color === lines[i].color) j += 1;
      const block = lines.slice(i, j);
      const words = block.map((l) => l.text.trim().split(/\s+/).length);
      if (block.length >= 2 && words.reduce((a, b) => a + b, 0) >= 3 * block.length && words.some((n) => n === 1)) uneven.push(`${p.id}: «${block.map((l) => l.text).join(" / ")}»`);
      i = j;
    }
  }
  add("balanced", !uneven.length, uneven.length ? `a line of one word beside full lines: ${uneven.slice(0, 3).join("; ")}` : "no line of one word beside full lines", "خطِ تک‌واژه‌ای کنار خط‌های پر آمده است");
  const dots = textsOf(plan).filter(dotBeside);
  add("persian", !dots.length, dots.length ? `«·» or «|» beside Persian: ${dots.slice(0, 3).join(" / ")}` : "no «·» or «|» beside Persian", "کنار متن فارسی «·» یا «|» آمده است");

  const badge = plan.hud.find((h) => h.kind === "badge");
  if (plan.badge) {
    const [from, to] = badge?.show[0] ?? [0, 0];
    const len = to - from;
    const middle = badge && badge.box.y < MIDDLE.bottom && badge.box.y + badge.box.h > MIDDLE.top;
    const ok = badge && inZones(badge.box) && !middle && len >= 1.5 * FPS && len <= 2.5 * FPS && from >= plan.close && to <= total - 15;
    add("badge", ok, badge ? `${sec(len)} s from ${sec(from)} s at y ${badge.box.y}–${badge.box.y + badge.box.h}` : "no badge", "نشان کانال سر جایش نیست");
  } else add("badge", !badge, "switched off (DIVAN_BADGE=off)", "نشان کانال خاموش است ولی آمده");
  // the badge's brass tick (owner 2026-11-16, src/set/badge-sound.js): once where the plan put it, off the narrator, at its level
  const tick = badgeCueCheck({ hud: plan.hud.map((h) => (h.kind === "badge" ? { ...h, from: h.show?.[0]?.[0] ?? h.from } : h)), sfx: plan.sfx });
  add("badge-sound", tick.ok, tick.detail, "صدای نشان کانال جای درستی ندارد");

  let dense = 0;
  for (const a of plan.sfx) dense = Math.max(dense, plan.sfx.filter((b) => b.at >= a.at && b.at < a.at + FPS).length);
  const soon = plan.sfx.some((c) => c.at <= 15);
  add("sound-fx", dense <= 2 && soon, `at most ${dense} effects in a second, ${plan.sfx.length} in all, one in the first half second: ${soon}`, "صداها بیش از اندازه پشت هم‌اند یا نیم‌ثانیهٔ اول صدایی ندارد");

  if (cover !== undefined) {
    const cw = wordsOf(cover).length;
    add("cover", cw >= 3 && cw <= 4, `${cw} words on the tile`, `کاور ویدیو ${fa(cw)} واژه دارد (باید ۳ یا ۴ باشد)`);
  }
  return out;
}

function ff(args) {
  return spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stderr ?? "";
}
/** Frozen stretches of the picture (ffmpeg freezedetect on a small copy): [[start, duration]]. */
export function freezes(file, { noise = 0.002, min = 2.5, until } = {}) {
  const log = ff([...(until ? ["-t", String(until)] : []), "-i", file, "-an", "-vf", `scale=270:-2,freezedetect=n=${noise}:d=${min}`, "-f", "null", "-"]);
  const starts = [...log.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const durs = [...log.matchAll(/freeze_duration: ([\d.]+)/g)].map((m) => Number(m[1]));
  return starts.map((s, i) => [s, durs[i] ?? Infinity]);
}
/** How alike two frames of a file are (SSIM, 1 = the same), small and a little soft: the picture, not the encoder's grain. */
export function likeness(file, a, b) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "divan-gate-"));
  const one = path.join(dir, "a.png");
  const two = path.join(dir, "b.png");
  const grab = (t, out) => (t === "last" ? ff(["-sseof", "-0.3", "-i", file, "-vf", "scale=540:-2", "-update", "1", "-y", out]) : ff(["-ss", String(t), "-i", file, "-vf", "scale=540:-2", "-frames:v", "1", "-y", out]));
  grab(a, one);
  grab(b, two);
  const log = ff(["-i", one, "-i", two, "-lavfi", "[0]scale=180:-2,gblur=sigma=1[a];[1]scale=180:-2,gblur=sigma=1[b];[a][b]ssim", "-f", "null", "-"]);
  fs.rmSync(dir, { recursive: true, force: true });
  return Number(/All:([\d.]+)/.exec(log)?.[1] ?? NaN);
}
/** The share of near-black pixels (luma under 26 of 255) over a frame a second, on a small grey copy. */
export function darkShare(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-an", "-vf", "fps=1,scale=108:192,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 256 * 1024 * 1024 });
  const px = r.stdout ?? Buffer.alloc(0);
  if (!px.length) return NaN;
  let dark = 0;
  for (const v of px) if (v < 26) dark += 1;
  return dark / px.length;
}

/** The checks measured on the finished file. */
export function fileChecks(file) {
  const out = [];
  const add = (id, ok, detail, faText) => out.push({ id, ok: Boolean(ok), detail, fa: faText });
  const early = freezes(file, { min: 0.8, until: 1.6 });
  const moved = likeness(file, 0, 1.2);
  add("hook-motion", !early.length && moved < 0.985, `first 1.5 s: ${early.length} frozen stretch(es); frame 0 against 1.2 s SSIM ${moved.toFixed(3)}`, "تصویر در ثانیهٔ اول ثابت است");
  const frozen = freezes(file);
  add("still", !frozen.length, frozen.length ? `frozen: ${frozen.map(([s, d]) => `${s.toFixed(1)} s for ${Number.isFinite(d) ? d.toFixed(1) : "to the end"}`).join(", ")}` : "no 2.5 s of frozen picture", "بیش از ۲٫۵ ثانیه تصویر ثابت مانده است");
  const loop = likeness(file, 0, "last");
  add("loop", loop >= 0.9, `first and last frame SSIM ${loop.toFixed(3)} (0.90 or more)`, "فریم آخر به فریم اول نمی‌خورد");
  const loud = loudness(file);
  add("loudness", Math.abs(loud.lufs - TARGET.lufs) <= TARGET.tolerance && loud.tp <= TARGET.tp, `${loud.lufs.toFixed(1)} LUFS, true peak ${loud.tp.toFixed(1)} dBTP`, "بلندی صدا اندازه نیست");
  const dark = darkShare(file);
  add("dark", dark <= 0.35, `near-black pixels ${(100 * dark).toFixed(1)} % (35 % or less)`, "تصویر بیش از اندازه تاریک است");
  return out;
}

/** The whole gate for a set Reel. Returns {ok, checks}; writes nothing. */
export function gate({ plan, file, cover }) {
  const checks = [...planChecks(plan, cover), ...(file ? fileChecks(file) : [])];
  return { ok: checks.every((c) => c.ok), checks };
}

/** The gate's verdict in plain Persian, as the worker hands it to the site and the owner reads it in the bot. */
export function verdict(result) {
  const failed = result.checks.filter((c) => !c.ok);
  return failed.length ? `این ویدیو از بازبینی پیش از ارسال رد شد: ${failed.map((c) => c.fa).join("؛ ")}.` : "";
}

/** Runs the gate as the switch says; throws a GateRefusal when it fails and the switch is on. */
export function enforce({ plan, file, cover, mode = process.env.DIVAN_GATE || "on", log = console.log }) {
  if (mode === "off" || !plan) return null;
  const result = gate({ plan, file, cover });
  for (const c of result.checks) log(`gate ${c.ok ? "pass" : "FAIL"} ${c.id}: ${c.detail}`);
  if (!result.ok && mode !== "warn") throw new GateRefusal(verdict(result));
  return result;
}

/**
 * The gate of a decision Reel (src/decision): the checks its timeline made before anything was drawn (props.qc),
 * and the same file checks as the set style's (a frozen stretch, the loop, the loudness, the darkness).
 */
export function enforceDecision({ qc, file, mode = process.env.DIVAN_GATE || "on", log = console.log }) {
  if (mode === "off" || !Array.isArray(qc)) return null;
  const checks = [...qc, ...(file ? fileChecks(file) : [])];
  const result = { ok: checks.every((c) => c.ok), checks };
  for (const c of checks) log(`gate ${c.ok ? "pass" : "FAIL"} ${c.id}: ${c.detail}`);
  if (!result.ok && mode !== "warn") throw new GateRefusal(verdict(result));
  return result;
}
