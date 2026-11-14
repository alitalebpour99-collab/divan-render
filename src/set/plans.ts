// The plans of the set style: what each format puts on the table, where the
// camera goes and when, which sounds land where. Pure: given the props, the
// narrator's lines and a way to measure text, a plan comes out (tested
// outside the browser with a rough measure, drawn by Table.tsx with the
// real one). Every word on screen comes from the props; nothing is written here
// except the fixed labels of the page (the legend of the war map, «منبع»).
import { fit, linesHeight, type Measure } from "./fit.ts";
import { COL_W, FPS, H, MIN_MARK, MIN_TEXT, ZONES, type Box, type Cue, type Hud, type Line, type MapLayer, type Piece, type Plan, type Pose, type Punch, type Shot, type Window } from "./space.ts";

export const SET_FORMATS = ["figure", "war", "dilemma"] as const;
export type SetFormat = (typeof SET_FORMATS)[number];
export const isSetFormat = (f: unknown): f is SetFormat => typeof f === "string" && (SET_FORMATS as readonly string[]).includes(f);
/** The range of lengths each format may run, in seconds (the social audit of 2026-11-13: one idea, 15 to 22 s; a dilemma has three roads to show). */
export const LENGTH: Record<SetFormat, [number, number]> = { figure: [12, 26], war: [15, 32], dilemma: [16, 36] };

export type Fonts = { vazir: string; naskh: string };
export type VoiceLine = { file: string; cue: string; frames: number };
export type Ctx = { fonts: Fonts; voiceIn?: VoiceLine[]; badge: boolean; measure?: Measure };

const FOREVER = 1e9;
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
/** No «·» or «|» beside Persian (the owner, 6 November 2026): a separator becomes the Persian comma. */
export const plainFa = (s: unknown) =>
  String(s ?? "")
    .replace(/\s*[·|]\s*/g, "، ")
    .replace(/\s+/g, " ")
    .trim();
export const wordsOf = (s: string) =>
  String(s)
    .replace(/[؟?!.،,؛:«»"()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
const firstSentences = (text: string) =>
  plainFa(text)
    .split(/(?<=[.!؟?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * The timeline and the pieces of one Reel, built scene by scene. A scene has
 * its station on the table (where the camera looks), its length (at least its
 * own, longer when the narrator's line for it is longer) and its pieces.
 */
class Board {
  pieces: Piece[] = [];
  hud: Hud[] = [];
  shots: Shot[] = [];
  punches: Punch[] = [];
  sfx: Cue[] = [];
  voice: Plan["voice"] = [];
  t = 0;
  private lines: VoiceLine[];
  ctx: Ctx;
  format: SetFormat;
  constructor(ctx: Ctx, format: SetFormat) {
    this.ctx = ctx;
    this.format = format;
    this.lines = (ctx.voiceIn ?? []).filter((l) => l.frames > 0);
  }
  get m(): Measure {
    return this.ctx.measure ?? ((t, s) => t.length * s * 0.5);
  }
  /** The narrator's line for a moment, placed at `at`; returns its length in frames (0 without one). */
  say(cue: string, at: number): number {
    const line = this.lines.find((l) => l.cue === cue);
    if (!line) return 0;
    this.voice.push({ file: line.file, from: at, frames: line.frames });
    return line.frames;
  }
  hasLine(cue: string) {
    return this.lines.some((l) => l.cue === cue);
  }
  shot(at: number, pose: Pose, move: Shot["move"], why: string, push = 0.018, sway = 0.45) {
    this.shots.push({ at, pose, move, push, sway, why });
    if (move === "whip") this.cue(at, "whoosh", why);
    else if (move === "glide" && at > 0) this.cue(at, "swish", why);
  }
  punch(at: number, depth: number, why: string) {
    this.punches.push({ at, depth, why });
  }
  /** A sound at a frame, unless two already land within that second (at most two effects a second). */
  cue(at: number, name: Cue["name"], why: string) {
    const near = this.sfx.filter((c) => Math.abs(c.at - at) < FPS);
    if (near.length >= 2 || near.some((c) => Math.abs(c.at - at) < 6)) return;
    this.sfx.push({ at: Math.max(0, Math.round(at)), name, why });
  }
  /** Lines of text that fit a width. */
  text(text: string, width: number, size: number, opts: { weight?: number; family?: "vazir" | "naskh"; maxLines?: number; min?: number; color?: string } = {}): Line[] {
    const family = this.ctx.fonts[opts.family ?? "vazir"];
    const r = fit({ text, width, size, maxLines: opts.maxLines ?? 3, min: Math.min(size, opts.min ?? MIN_TEXT + 4), weight: opts.weight ?? 700, family, color: opts.color }, this.m);
    if (r.overflow) this.overflow.push(text.slice(0, 40));
    return r.lines.map((l) => ({ ...l, family: opts.family ?? "vazir" }) as Line);
  }
  overflow: string[] = [];
  /** A dossier plate: lines stacked, padded; its height follows its lines. */
  plate(id: string, at: [number, number], w: number, lines: Line[], show: Window[], more: Partial<Piece> = {}): Piece {
    const h = Math.round(linesHeight(lines, 1.42) + 2 * 34);
    const p: Piece = { id, kind: "plate", at, w, h, lift: 0.04, show, lines, ...more };
    this.pieces.push(p);
    return p;
  }
  piece(p: Piece) {
    this.pieces.push(p);
    return p;
  }
  /** A source chip under a piece (one line, a mark: it may be smaller than the reading floor). */
  chip(id: string, at: [number, number], text: string, show: Window[], w = COL_W - 170): Piece {
    const lines = this.text(text, w - 40, 36, { weight: 500, maxLines: 1, min: MIN_MARK + 3, color: "ink2" });
    return this.piece({ id, kind: "chip", at, w, h: Math.round(linesHeight(lines, 1.35) + 24), lift: 0.05, show, lines, num: false });
  }
  /** A screen-fixed line at the bottom of the safe area: the source, the AI note, the day of the replay. */
  hudLine(id: string, kind: Hud["kind"], text: string, show: Window[], place: "top" | "bottom", color = "ink2", size = 36): Hud {
    const lines = this.text(text, COL_W - 40, size, { weight: 500, maxLines: kind === "source" ? 2 : 1, min: MIN_MARK + 3, color });
    const h = Math.round(linesHeight(lines, 1.35) + 22);
    const width = Math.min(COL_W, Math.round(Math.max(...lines.map((l) => this.m(l.text, l.size, 500, this.ctx.fonts.vazir))) + 56));
    // the source sits on the bottom row of the safe area; a title strip (a turning point, the AI note) under the app's header
    const box: Box = { x: ZONES.right - 26 - width, y: place === "top" ? ZONES.top + 18 : ZONES.bottom - 18 - h, w: width, h };
    const hud: Hud = { id, kind, box, show, lines };
    this.hud.push(hud);
    return hud;
  }
}

/** Where a station sits on the table: far enough apart that two are never on screen together. */
const ST = (i: number): [number, number] => [[0, 0], [1650, -260], [380, 1750], [-1600, 520], [1400, 2100], [-1200, 2300]][i] as [number, number];
const POSE = (at: [number, number], zoom = 1, turn = 0): Pose => ({ x: at[0], y: at[1], zoom, turn });
/** a scene of at least `min` frames, longer while its narrator's line lasts */
const span = (min: number, voice: number) => Math.max(min, voice ? voice + 10 : 0);

/**
 * The close of every set Reel: the question to the viewer and the channel
 * badge at a station of their own, then the camera glides home to the first
 * picture. Returns the frame the Reel ends on.
 */
function close(b: Board, at: [number, number], ask: string, foot: string, hook: { pieces: Piece[]; pose: Pose }): number {
  const start = b.t;
  b.shot(start, POSE(at, 1, -1.2), "whip", "to the close");
  const end = b.say("end", start + 8);
  const len = span(Math.round(3.4 * FPS), end + 8);
  const shown: Window[] = [[start + 8, start + len]];
  const askLines = b.text(ask, COL_W - 170, 78, { family: "naskh", maxLines: 3, color: "ink" });
  b.plate("ask", [at[0], at[1] - 230], COL_W - 110, askLines, shown, { kind: "ask", emblem: "council" });
  const footLines = b.text(foot, COL_W - 140, 54, { maxLines: 3, min: MIN_TEXT, color: "ink2", weight: 500 });
  b.plate("foot", [at[0], at[1] + 150], COL_W - 100, [...footLines, { text: "divan.ahura.cloud", size: 56, weight: 800, color: "acc" }], shown, { lift: 0.02 });
  b.cue(start + 12, "pop", "the question lands");
  b.punch(start + Math.round(len * 0.55), 0.035, "a beat under the question");
  if (b.ctx.badge) {
    // the channel badge: small, in the bottom safe area, after the question has come, gone before the loop
    const from = start + Math.round(0.8 * FPS);
    const to = Math.min(from + Math.round(2.2 * FPS), start + len - 6);
    const box: Box = { x: ZONES.left + 30, y: ZONES.bottom - 236, w: 330, h: 80 };
    b.hud.push({ id: "badge", kind: "badge", box, show: [[from, to]], lines: [{ text: "دیوان", size: 46, weight: 700 }] });
  }
  b.t = start + len;
  // home: the camera glides back to the first frame's place and stays there, the first picture comes back
  const home = b.t;
  b.shots.push({ at: home, pose: hook.pose, move: "glide", push: 0, sway: 0, why: "home, for the loop" });
  b.cue(home, "swish", "home");
  for (const p of hook.pieces) p.show.push([home + 15, FOREVER]);
  return home + 22;
}

// ---------- «عدد روز» ----------
type FigureIn = { label: string; valueText: string; value: number; decimals: number; unit: string; percent: number | null; explain: string; when: string; source: string; section: string; foot: string; hook: { text: string; figure: string | null; short?: string | null } | null; ask?: string; src?: string };

function planFigure(p: FigureIn, ctx: Ctx): Plan {
  const b = new Board(ctx, "figure");
  const s0 = ST(0);
  const pose0 = POSE(s0);
  const figureText = plainFa(p.hook?.figure ?? p.valueText);
  const hookText = plainFa(p.hook?.short ?? p.hook?.text ?? p.label);
  // the hook: the figure and its question, there from the first frame; the camera already pushing in
  b.shot(0, pose0, "cut", "the hook, moving from frame 0", 0.028, 0.6);
  b.cue(3, "hit", "a sound in the first half second");
  b.punch(14, 0.03, "the figure lands");
  const startLen = b.say("start", 4);
  const s0len = span(Math.round(2.5 * FPS), startLen + 4);
  const hookWin: Window[] = [[0, s0len]];
  const qLines = b.text(hookText, COL_W - 160, 92, { family: "naskh", maxLines: 2, color: "ink" });
  const q = b.plate("hook", [s0[0], s0[1] - 300], COL_W - 90, qLines, hookWin, { kind: "plate" });
  const fig = b.piece({ id: "hook-figure", kind: "figure", at: [s0[0], s0[1] + 120], w: 640, h: 300, lift: 0.08, show: [...hookWin], lines: b.text(figureText, 600, 210, { weight: 800, maxLines: 1, min: 120, color: "acc" }), num: true, emblem: p.percent != null ? "ring" : "figure" });
  if (s0len > 2.8 * FPS) b.punch(Math.round(s0len * 0.62), 0.025, "a beat while the question is said");
  b.t = s0len;

  // what the figure is: the label, the unit, the figure counting up on its dial
  const s1 = ST(1);
  b.shot(b.t, POSE(s1, 1, 1.5), "whip", "to the figure's station");
  const a1 = b.t + 8;
  const s1len = Math.round(3.0 * FPS);
  const w1: Window[] = [[a1, b.t + s1len]];
  b.plate("section", [s1[0], s1[1] - 470], COL_W - 260, b.text(plainFa(`عدد روز: ${p.section}`), COL_W - 300, 54, { weight: 700, maxLines: 1, color: "acc" }), w1, { lift: 0.02 });
  b.plate("label", [s1[0], s1[1] - 250], COL_W - 90, b.text(plainFa(p.label), COL_W - 160, 82, { family: "naskh", maxLines: 2, color: "ink" }), w1);
  b.piece({ id: "count", kind: "counter", at: [s1[0], s1[1] + 60], w: 640, h: 240, lift: 0.08, show: w1, lines: b.text(plainFa(p.valueText), 600, 180, { weight: 800, maxLines: 1, min: 110, color: "acc" }), count: { to: p.value, decimals: p.decimals, text: plainFa(p.valueText), from: a1, frames: 26 }, num: true });
  if (p.unit) b.plate("unit", [s1[0], s1[1] + 280], COL_W - 170, b.text(plainFa(p.unit), COL_W - 180, 62, { maxLines: 2, color: "ink" }), w1, { lift: 0.03 });
  b.cue(a1 + 2, "tick", "the count starts");
  b.cue(a1 + 28, "pop", "the figure lands");
  b.punch(a1 + 28, 0.03, "the figure lands");
  b.t += s1len;

  // what it means: the site's own explanation, a plate per sentence or two, the camera stepping down between them
  const s2 = ST(2);
  b.shot(b.t, POSE(s2, 1, -1), "whip", "to the explanation");
  const explainLen = b.say("explain", b.t + 8);
  const parts = firstSentences(p.explain);
  const halves = parts.length > 1 ? [parts.slice(0, Math.ceil(parts.length / 2)).join(" "), parts.slice(Math.ceil(parts.length / 2)).join(" ")] : [parts[0] ?? plainFa(p.label)];
  const s2len = span(Math.round((halves.length > 1 ? 4.6 : 3.0) * FPS), explainLen + 6);
  const a2 = b.t + 8;
  const cut = halves.length > 1 ? b.t + Math.round(s2len * 0.5) : b.t + s2len;
  b.plate("explain-1", [s2[0], s2[1] - 120], COL_W - 90, b.text(halves[0], COL_W - 160, 64, { maxLines: 5, color: "ink", weight: 500 }), [[a2, cut]]);
  b.cue(a2 + 4, "pop", "the explanation lands");
  if (halves.length > 1) {
    const s2b: [number, number] = [s2[0] + 40, s2[1] + 820];
    b.shot(cut, POSE(s2b, 1.0, 0.8), "glide", "down to the second half");
    b.plate("explain-2", [s2b[0], s2b[1] - 120], COL_W - 90, b.text(halves[1], COL_W - 160, 64, { maxLines: 5, color: "ink", weight: 500 }), [[cut + 18, b.t + s2len]]);
    b.cue(cut + 20, "pop", "the second half lands");
  } else b.punch(b.t + Math.round(s2len * 0.55), 0.025, "a beat while it is read");
  b.t += s2len;

  // the source, from the first frame to the last: under every figure
  const source = plainFa(p.src ?? `منبع: ${p.source}، ${p.when.replace(/^تاریخ:\s*/, "")}`);
  b.hudLine("source", "source", source, [[0, FOREVER]], "bottom");

  const ask = plainFa(p.ask ?? "این عدد را می‌دانستی؟");
  const total = close(b, ST(3), ask, plainFa(p.foot), { pieces: [q, fig], pose: pose0 });
  return finishPlan(b, total, { text: hookText, figure: figureText, from: 0 }, null);
}

// ---------- «جنگ، روز به روز» ----------
type WarIn = { warStart: string; warAsOf: string; warDay: number; events: { d: number; c: [number, number] | null; t: "confirmed" | "claim" | "unverified"; i: boolean }[]; milestones: { date: string; day: number; fa: string }[]; counts: { total: number; confirmed: number; claim: number; unverified: number; located: number }; foot: string; hook: { text: string; figure: string | null; short?: string | null } | null; ask?: string; src?: string };
/** The map's window (the site's «region» extent) and its place on the table. */
export const WAR_EXTENT: [[number, number], [number, number]] = [[31, 11.5], [64, 41]];
export const WAR_MAP = { w: 1520, h: 1460 };
/** A longitude/latitude on the table (the same Mercator as the map Table.tsx draws: geo.ts fits the extent into this box). */
export type Project = (lon: number, lat: number) => [number, number];

function planWar(p: WarIn, ctx: Ctx, place: Project): Plan {
  const b = new Board(ctx, "war");
  const centre: [number, number] = [0, 0];
  const iran = place(54.5, 32.5);
  const pose0 = POSE([iran[0], iran[1] - 40], 1.0);
  b.shot(0, pose0, "cut", "the hook over the map, moving from frame 0", 0.03, 0.6);
  b.cue(3, "hit", "a sound in the first half second");
  b.punch(14, 0.03, "the count lands");
  const figureText = plainFa(p.hook?.figure ?? fa(p.counts.total));
  const hookText = plainFa(p.hook?.short ?? p.hook?.text ?? "رویداد ثبت‌شده در جنگ. کجاها؟");
  const startLen = b.say("start", 4);
  const s0len = span(Math.round(2.5 * FPS), startLen + 4);
  const hookWin: Window[] = [[0, s0len]];
  const q = b.plate("hook", [pose0.x, pose0.y - 400], COL_W - 90, b.text(hookText, COL_W - 160, 84, { family: "naskh", maxLines: 2, color: "ink" }), hookWin);
  const fig = b.piece({ id: "hook-figure", kind: "figure", at: [pose0.x, pose0.y + 300], w: 560, h: 230, lift: 0.08, show: [...hookWin], lines: b.text(figureText, 520, 190, { weight: 800, maxLines: 1, min: 110, color: "acc" }), num: true, emblem: "war" });
  b.t = s0len;

  // the replay: the events come onto the map day by day; the camera follows where they fall
  const playLen = b.say("play", b.t + 6);
  const PLAY = span(Math.round(10.5 * FPS), playLen + 8);
  const a = b.t;
  const maxDay = Math.max(2, p.warDay);
  const frameOfDay = (d: number) => a + 10 + ((Math.max(1, d) - 1) / (maxDay - 1)) * (PLAY - 30);
  const inside = (c: [number, number]) => c[0] >= WAR_EXTENT[0][0] && c[0] <= WAR_EXTENT[1][0] && c[1] >= WAR_EXTENT[0][1] && c[1] <= WAR_EXTENT[1][1];
  const pins = p.events.filter((e) => e.c && inside(e.c)).map((e) => {
    const [x, y] = place(e.c![0], e.c![1]);
    return { x, y, t: e.t, from: Math.round(frameOfDay(e.d)) };
  });
  // the camera: three or four looks, each at where the next stretch of days falls, a new one every 2.4 s or so
  const looks = Math.max(3, Math.min(5, Math.round(PLAY / (2.4 * FPS))));
  for (let k = 0; k < looks; k += 1) {
    const f0 = a + Math.round((k * PLAY) / looks);
    const f1 = a + Math.round(((k + 1) * PLAY) / looks);
    const here = pins.filter((q) => q.from >= f0 - 20 && q.from < f1 + 10);
    const cx = here.length ? here.reduce((s, q) => s + q.x, 0) / here.length : iran[0];
    const cy = here.length ? here.reduce((s, q) => s + q.y, 0) / here.length : iran[1];
    // never so far from Iran that the map's middle leaves the frame
    const x = iran[0] + Math.max(-320, Math.min(320, cx - iran[0]));
    const y = iran[1] + Math.max(-300, Math.min(300, cy - iran[1])) + 60;
    b.shot(f0, POSE([x, y], k === 0 ? 1.12 : 1.12 + 0.05 * (k % 2), k % 2 ? 1.6 : -1.4), k === 0 ? "whip" : "glide", `the replay, look ${k + 1}`, 0.02, 0.4);
  }
  // the turning points, each said on screen for a moment as the replay passes it
  const miles = p.milestones.filter((m) => m.day >= 1 && m.day <= maxDay).slice(0, 6);
  let lastMile = -999;
  for (const m of miles) {
    const at = Math.round(frameOfDay(m.day));
    if (at - lastMile < Math.round(1.2 * FPS)) continue;
    lastMile = at;
    b.hudLine(`mile-${m.day}`, "day", plainFa(`${m.fa}، روز ${fa(m.day)}`), [[at, Math.min(at + Math.round(1.6 * FPS), a + PLAY)]], "top", "ink", 48);
    b.cue(at, "tick", `turning point: ${m.fa}`);
    b.punch(at, 0.02, `turning point: ${m.fa}`);
  }
  b.t = a + PLAY;

  // the tally: what was recorded, what kind, as of when
  const s2: [number, number] = [iran[0] + 1700, iran[1] + 360];
  b.shot(b.t, POSE(s2, 1, 1.2), "whip", "to the tally");
  const t1 = b.t + 8;
  const tallyLen = Math.round(3.4 * FPS);
  const tw: Window[] = [[t1, b.t + tallyLen]];
  b.piece({ id: "total", kind: "counter", at: [s2[0], s2[1] - 400], w: 600, h: 230, lift: 0.08, show: tw, lines: b.text(fa(p.counts.total), 560, 180, { weight: 800, maxLines: 1, min: 110, color: "acc" }), count: { to: p.counts.total, decimals: 0, text: fa(p.counts.total), from: t1, frames: 24 }, num: true });
  b.plate("total-line", [s2[0], s2[1] - 160], COL_W - 110, b.text(plainFa(`رویداد ثبت‌شده تا ${p.warAsOf ? faDateShort(p.warAsOf) : ""}`), COL_W - 170, 60, { maxLines: 2, color: "ink" }), tw, { lift: 0.03 });
  const rows = [
    { t: "confirmed", label: "تأییدشده", n: p.counts.confirmed },
    { t: "claim", label: "ادعای یک طرف", n: p.counts.claim },
    { t: "unverified", label: "تأییدنشده", n: p.counts.unverified },
  ];
  rows.forEach((r, k) => {
    b.piece({ id: `legend-${r.t}`, kind: "legend", at: [s2[0], s2[1] - 10 + k * 105], w: COL_W - 110, h: 100, lift: 0.03, show: [[t1 + 10 + k * 6, b.t + tallyLen]], lines: [{ text: r.label, size: 54, weight: 700 }, { text: fa(r.n), size: 60, weight: 800 }], mark: r.t, count: { to: r.n, decimals: 0, text: fa(r.n), from: t1 + 10 + k * 6, frames: 18 }, num: true });
  });
  b.plate("note", [s2[0], s2[1] + 320], COL_W - 110, b.text("این فهرستِ همهٔ حمله‌ها نیست.", COL_W - 170, 50, { maxLines: 2, min: MIN_TEXT, color: "ink2", weight: 500 }), [[t1 + 30, b.t + tallyLen]], { lift: 0.02 });
  b.cue(t1 + 2, "tick", "the count starts");
  b.cue(t1 + 26, "pop", "the count lands");
  b.punch(t1 + 26, 0.03, "the count lands");
  b.punch(t1 + 60, 0.02, "a beat while the rows are read");
  b.t += tallyLen;

  // the source, from the first frame to the last
  b.hudLine("source", "source", plainFa(p.src ?? `منبع: رویدادهای ثبت‌شدهٔ دیوان، هر کدام با منبعش، تا ${faDateShort(p.warAsOf)}`), [[0, FOREVER]], "bottom");

  const ask = plainFa(p.ask ?? "کدام رویداد را از نزدیک دیده بودی؟");
  const total = close(b, [iran[0] - 1700, iran[1] + 300], ask, plainFa(p.foot), { pieces: [q, fig], pose: pose0 });
  const map: MapLayer = { at: centre, w: WAR_MAP.w, h: WAR_MAP.h, pins };
  return finishPlan(b, total, { text: hookText, figure: figureText, from: 0 }, map);
}

const MONTHS = ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
/** «۳ اکتبر ۲۰۲۶» from an ISO day: the site's own way of writing a date in a Reel (kit.tsx faDate) without Intl in the tests. */
function faDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return "";
  return `${fa(Number(m[3]))} ${MONTHS[Number(m[2]) - 1]} ${fa(m[1])}`;
}

// ---------- «دوراهی امروز» ----------
type DilemmaIn = { question: string; facts: { k: string; v: string; s: string }[]; options: { title: string; line: string }[]; pick: number; why: string; advisors: { name: string; stance: "for" | "cond" | "against" }[]; foot: string; hook: { text: string; figure: string | null; short?: string | null } | null; ask?: string; src?: string };
const ADVISER_EMBLEM: [RegExp, string][] = [
  [/اقتصاد/, "treasury"],
  [/دیپلماسی/, "chancery"],
  [/تاریخ/, "archive"],
  [/سیاست/, "council"],
  [/امنیت|نظامی|دفاع/, "war"],
];

function planDilemma(p: DilemmaIn, ctx: Ctx): Plan {
  const b = new Board(ctx, "dilemma");
  const s0 = ST(0);
  const pose0 = POSE(s0);
  const hookText = plainFa(p.hook?.short ?? p.hook?.text ?? p.question);
  b.shot(0, pose0, "cut", "the hook, moving from frame 0", 0.028, 0.6);
  b.cue(3, "hit", "a sound in the first half second");
  b.punch(16, 0.03, "the question lands");
  const startLen = b.say("start", 4);
  const s0len = span(Math.round(2.6 * FPS), startLen + 4);
  const hookWin: Window[] = [[0, s0len]];
  const seal = b.piece({ id: "hook-seal", kind: "seal", at: [s0[0], s0[1] + 300], w: 330, h: 330, lift: 0.08, show: [...hookWin], emblem: "council" });
  const q = b.plate("hook", [s0[0], s0[1] - 220], COL_W - 90, b.text(hookText, COL_W - 160, 96, { family: "naskh", maxLines: 3, color: "ink" }), hookWin);
  b.t = s0len;

  // what happened: two or three rows, each with its source under it
  const s1 = ST(1);
  b.shot(b.t, POSE(s1, 1, 1.2), "whip", "to the news");
  const facts = p.facts.slice(0, 3);
  const factsLen = Math.round((1.4 + 1.05 * facts.length) * FPS);
  const a1 = b.t + 8;
  const STEP = 390;
  const fromOf = (k: number) => a1 + 6 + k * Math.round(1.05 * FPS);
  facts.forEach((f, k) => {
    const from = fromOf(k);
    // two rows on screen at a time; for the third the camera steps down and the first leaves
    const until = k + 2 < facts.length ? fromOf(k + 2) - 4 : b.t + factsLen;
    const y = s1[1] - STEP / 2 + k * STEP;
    // the row's label, its words, and its source as the plate's last line (a mark, smaller)
    const lines = [...b.text(plainFa(f.k), COL_W - 170, 50, { weight: 800, maxLines: 1, color: "acc" }), ...b.text(plainFa(f.v), COL_W - 170, 62, { family: "naskh", maxLines: 2, color: "ink" }), ...b.text(plainFa(`منبع: ${f.s}`), COL_W - 170, 36, { weight: 500, maxLines: 1, min: MIN_MARK + 3, color: "ink2" })];
    // the first two plates lie on the table from the scene's start, their words come one after the other
    b.plate(`fact-${k}`, [s1[0], y], COL_W - 100, lines, [[k < 2 ? a1 : from, until]], { num: /[0-9۰-۹]/.test(f.v), lit: null, mark: "src", reveal: from });
    if (k >= 2) b.shot(from - 6, POSE([s1[0], s1[1] + (k - 1) * STEP], 1, k % 2 ? 1 : -1), "glide", `down to fact ${k + 1}`);
    b.cue(from + 2, "pop", `fact ${k + 1}`);
    if (k === 1) b.punch(from, 0.018, `fact ${k + 1}`);
  });
  b.t += factsLen;

  // the roads: numbered brass seals, the camera passing along them
  const s2 = ST(2);
  const roads = p.options.slice(0, 4);
  const roadsLen = Math.round((0.6 + 1.1 * roads.length) * FPS);
  const a2 = b.t;
  const gap = roads.length > 3 ? 272 : 300;
  const roadH = roads.length > 3 ? 222 : 244;
  const y0 = s2[1] - ((roads.length - 1) * gap) / 2;
  roads.forEach((o, k) => {
    const at: [number, number] = [s2[0] + (k % 2 ? 24 : -24), y0 + k * gap];
    const from = a2 + 8 + k * Math.round(1.1 * FPS);
    const lines = b.text(plainFa(o.title), COL_W - 300, 66, { family: "naskh", maxLines: 2, color: "ink" });
    // every road's medallion lies on the table from the start of the scene; its name comes as the camera reaches it
    b.piece({ id: `road-${k}`, kind: "road", at, w: COL_W - 100, h: roadH, lift: 0.05, show: [[a2 + 8, b.t + roadsLen]], reveal: from, lines, mark: fa(k + 1), lit: null });
    // the camera stays on the whole column and leans toward each road as it lands
    if (k === 0) b.shot(a2, POSE([s2[0], s2[1] - 40], 1, -1), "whip", "to the roads");
    else b.shot(from - 4, POSE([s2[0], s2[1] + (k / Math.max(1, roads.length - 1) - 0.5) * 80], 1, k % 2 ? 1 : -1), "glide", `along the roads, ${k + 1}`);
    b.cue(from + 2, "pop", `road ${k + 1}`);
  });
  b.hudLine("ai-roads", "ai", "راه‌ها و سنجش: تحلیل هوش مصنوعی، نه خبر", [[a2 + 8, a2 + roadsLen]], "top", "claim", 40);
  b.t += roadsLen;

  // the road Divan would take, and why
  const s3 = ST(3);
  const pick = Math.max(0, Math.min(roads.length - 1, p.pick));
  b.cue(b.t - 22, "rise", "before the pick");
  b.shot(b.t, POSE(s3, 1, -1.2), "whip", "to the pick");
  const pickLen = Math.round(3.8 * FPS);
  const a3 = b.t + 8;
  b.piece({ id: "pick", kind: "road", at: [s3[0], s3[1] - 300], w: COL_W - 100, h: 250, lift: 0.07, show: [[a3, b.t + pickLen]], lines: b.text(plainFa(roads[pick]?.title ?? ""), COL_W - 300, 74, { family: "naskh", maxLines: 2, color: "ink" }), mark: fa(pick + 1), lit: "acc" });
  b.plate("why", [s3[0], s3[1] + 120], COL_W - 90, [...b.text("راهی که دیوان می‌رفت", COL_W - 160, 52, { weight: 800, maxLines: 1, color: "acc" }), ...b.text(plainFa(p.why), COL_W - 160, 58, { maxLines: 5, color: "ink", weight: 500 })], [[a3, b.t + pickLen]], { reveal: a3 + 14 });
  b.cue(a3 + 2, "hit", "the pick");
  b.punch(a3 + 2, 0.04, "the pick");
  b.punch(a3 + Math.round(2.0 * FPS), 0.02, "a beat while the reason is read");
  b.hudLine("ai-pick", "ai", "تحلیل هوش مصنوعی، نه خبر", [[a3, b.t + pickLen]], "top", "claim", 40);
  b.t += pickLen;

  // the five advisers, when the dossier has them: emblems, never faces
  if (p.advisors.length) {
    const s4 = ST(4);
    b.shot(b.t, POSE(s4, 1, 1), "whip", "to the advisers");
    const advLen = Math.round(2.8 * FPS);
    const a4 = b.t + 8;
    b.plate("adv-title", [s4[0], s4[1] - 500], COL_W - 110, [...b.text("نظر پنج مشاور", COL_W - 170, 58, { weight: 800, maxLines: 1, color: "acc" }), ...b.text("تحلیل هوش مصنوعی، نه خبر", COL_W - 170, 40, { weight: 500, maxLines: 1, min: MIN_MARK + 3, color: "claim" })], [[a4, b.t + advLen]], { lift: 0.02 });
    p.advisors.slice(0, 5).forEach((ad, k) => {
      const row = Math.floor(k / 2);
      const col = k % 2;
      const at: [number, number] = [s4[0] + (k === 4 ? 0 : col ? -190 : 190), s4[1] - 200 + row * 270];
      const emblem = ADVISER_EMBLEM.find(([re]) => re.test(ad.name))?.[1] ?? "seat";
      const stance = ad.stance === "for" ? "موافق" : ad.stance === "cond" ? "مشروط" : "مخالف";
      b.piece({ id: `adv-${k}`, kind: "seal", at, w: 340, h: 250, lift: 0.05, show: [[a4 + 4 + k * 5, b.t + advLen]], emblem, lit: ad.stance === "for" ? "good" : ad.stance === "cond" ? "both" : "bad", lines: [...b.text(plainFa(ad.name.replace(/^مشاور\s*/, "")), 300, 50, { weight: 700, maxLines: 1, min: MIN_TEXT, color: "ink" }), { text: stance, size: 48, weight: 800 }] });
    });
    b.cue(a4 + 2, "pop", "the advisers");
    b.punch(a4 + Math.round(1.5 * FPS), 0.02, "a beat over the advisers");
    b.t += advLen;
  }

  const src = plainFa(p.src ?? `منبع خبر: ${p.facts[0]?.s ?? "منشور"}`);
  b.hudLine("source", "source", src, [[0, FOREVER]], "bottom");
  const ask = plainFa(p.ask ?? "تو کدام راه را می‌رفتی؟ شماره‌اش را بنویس.");
  const total = close(b, ST(5), ask, plainFa(p.foot), { pieces: [q, seal], pose: pose0 });
  return finishPlan(b, total, { text: hookText, figure: null, from: 0 }, null);
}

function finishPlan(b: Board, total: number, hook: Plan["hook"], map: MapLayer | null): Plan {
  const closeShot = b.shots.find((s) => s.why === "to the close");
  const homeShot = b.shots.find((s) => s.why.startsWith("home"));
  // a window that runs to the end stays open (the first picture is whole on the last frame, for the loop)
  for (const p of b.pieces) p.show = p.show.map(([a, c]) => [a, c >= FOREVER ? FOREVER : Math.min(c, total)] as Window);
  for (const h of b.hud) h.show = h.show.map(([a, c]) => [a, c >= FOREVER ? FOREVER : Math.min(c, total)] as Window);
  // a change at least every 2.7 s: where a long line holds a scene, the camera leans in a little on its own
  const marks = () => [0, ...b.shots.map((s) => s.at), ...b.punches.map((p) => p.at), total].sort((x, y) => x - y);
  for (let guard = 0; guard < 40; guard += 1) {
    const m = marks();
    const i = m.findIndex((v, k) => k > 0 && v - m[k - 1] > Math.round(2.7 * FPS));
    if (i < 0) break;
    b.punch(m[i - 1] + Math.round((m[i] - m[i - 1]) / 2), 0.015, "a beat in a long hold");
  }
  b.punches.sort((x, y) => x.at - y.at);
  return {
    format: b.format,
    total,
    length: LENGTH[b.format],
    hook,
    shots: b.shots,
    punches: b.punches,
    pieces: b.pieces,
    hud: b.hud,
    sfx: b.sfx.filter((c) => c.at < total - 4).sort((x, y) => x.at - y.at),
    map,
    voice: b.voice,
    badge: b.ctx.badge,
    close: closeShot?.at ?? total,
    home: homeShot?.at ?? total,
    ...(b.overflow.length ? { overflow: b.overflow } : {}),
  } as Plan;
}

/**
 * Whether a Reel can be drawn in the set style: its hook fits seven words (the
 * figure counted as one). A Reel whose hook does not (a stand-in dilemma with a
 * long question) is drawn in the classic look instead, and the worker says so.
 */
export function setPossible(props: { hook?: { text?: string; figure?: string | null; short?: string | null } | null; question?: string }): boolean {
  const h = props.hook;
  const text = h?.short ?? h?.text ?? props.question ?? "";
  return wordsOf(plainFa(text)).length + (h?.figure ? 1 : 0) <= 7;
}

/** The plan of a set Reel from its props. `place` puts a longitude/latitude on the table (the war map). */
export function planOf(format: SetFormat, props: unknown, ctx: Ctx, place?: Project): Plan {
  if (format === "figure") return planFigure(props as FigureIn, ctx);
  if (format === "war") return planWar(props as WarIn, ctx, place ?? ((lon, lat) => [(lon - 47.5) * 46, (36 - lat) * 50]));
  return planDilemma(props as DilemmaIn, ctx);
}

export { H as FRAME_H };
