// The set style's world, as plain numbers: the camera over the table, the
// platforms' safe zones, and the plan a Reel is drawn from. Nothing here draws;
// Table.tsx draws a plan, and gate.mjs checks the same plan after the render
// (the plan travels with the composition's props, so the gate sees exactly
// what was drawn).
//
// The world is Divan's own: a calm war-room table under a lamp. Ink-green
// baize with a faint topographic map in it, thin brass borders, a compass rose
// set into the wood, and the episode's dossier plates, brass seals and pins
// lying on it. The camera floats over the table and never stands still: it
// pushes in from the first frame, drifts and turns a little while a plate is
// read, whips from one station of the table to the next, and in the last
// second glides back to where it began, so the Reel loops on its first picture.
// No WebGL: the table is one transformed layer, the pieces are placed by the
// camera math below (a little parallax by their height above the cloth).

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// ---------- the platforms' safe zones ----------
// Measured on the owner's iPhone screenshots of 2026-11-13 (hub
// ahura-city/ali-list-1112/cue-sample/, 1320 × 2868; the same numbers as
// Pickwise's set/zones.ts and Bidar's set/space.ts): the video fills the screen
// from the top down to row 2617 and loses a strip at both sides; the app's
// header covers the top 11 % of the screen, the rail of buttons the right 14 %,
// and the account's name and the caption begin at row 2158 (TikTok, the
// highest of the three). In the frame of 1080 × 1920:
const SCREEN = { w: 1320, h: 2868, videoBottom: 2617 };
const K = SCREEN.videoBottom / H;
const CUT = (W * K - SCREEN.w) / 2;
export const ZONES = {
  /** rows above this are under the app's header */
  top: Math.ceil((0.11 * SCREEN.h) / K),
  /** columns right of this are under the rail */
  right: Math.floor((0.86 * SCREEN.w + CUT) / K),
  /** columns left of this are off the screen */
  left: Math.ceil(CUT / K),
  /** rows below this hold the account's name and the caption */
  bottom: Math.floor(2158 / K),
};
/** The middle of the frame, where the badge never goes: the middle third of the height. */
export const MIDDLE = { top: Math.round(H / 3), bottom: Math.round((2 * H) / 3) };
/** The column every text is written in: inside the zones with a margin. */
export const COL = { left: ZONES.left + 30, right: ZONES.right - 26 };
export const COL_W = COL.right - COL.left;
export const COL_X = (COL.left + COL.right) / 2;
/** The middle of the safe area: where the camera puts what it looks at. */
export const EYE_Y = Math.round((ZONES.top + ZONES.bottom) / 2);
/**
 * The owner's floor for type (6 November 2026): every text to be read at least
 * 48 px on the finished video. Marks that are not read as a sentence (the
 * source chip, the channel badge) may go down to 1.5 % of the height (STYLE
 * GUIDE R5), never lower.
 */
export const MIN_TEXT = 48;
export const MIN_MARK = Math.ceil(0.015 * H);

export type Box = { x: number; y: number; w: number; h: number };
export const inZones = (b: Box, slack = 0.5) => b.x >= ZONES.left - slack && b.y >= ZONES.top - slack && b.x + b.w <= ZONES.right + slack && b.y + b.h <= ZONES.bottom + slack;
export const onScreen = (b: Box) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < W && b.y < H;

// ---------- the camera ----------
/**
 * Where the camera is: the point of the table under the eye (x, y in table
 * units), how near it is (zoom 1 draws a table unit as one pixel) and how far
 * it is turned (degrees).
 */
export type Pose = { x: number; y: number; zoom: number; turn: number };
export type Move = "cut" | "whip" | "glide";
/**
 * A shot: from frame `at` the camera goes to `pose` (a whip in 7 frames, a
 * glide in 20, a cut at once) and then drifts: it pushes in by `push` (share
 * of the zoom a second) and turns `sway` degrees back and forth, so no held
 * second is still.
 */
export type Shot = { at: number; pose: Pose; move: Move; push?: number; sway?: number; why: string };
export const MOVE_FRAMES: Record<Move, number> = { cut: 0, whip: 7, glide: 20 };
/** the push of a shot comes to rest over about this many seconds */
export const PUSH_FOR = 2.2;
/** A punch: the camera leans in by `depth` (share of the zoom) on a beat and settles back. */
export type Punch = { at: number; depth: number; why: string };

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const easeInOut = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const mix = (a: Pose, b: Pose, t: number): Pose => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, zoom: a.zoom * (b.zoom / a.zoom) ** t, turn: a.turn + (b.turn - a.turn) * t });

/** Where the camera has drifted `frames` after its shot began. */
function drifted(s: Shot, frames: number): Pose {
  const t = Math.max(0, frames) / FPS;
  // the push eases off after PUSH_FOR seconds (a long line must not carry a plate out of the frame); the sway goes on
  return { ...s.pose, zoom: s.pose.zoom * (1 + (s.push ?? 0) * PUSH_FOR * (1 - Math.exp(-t / PUSH_FOR))), turn: s.pose.turn + (s.sway ?? 0) * Math.sin(t * 1.3) };
}
const punchAt = (p: Punch, f: number) => {
  const t = f - p.at;
  if (t < 0 || t > 22) return 0;
  return t < 5 ? smooth(t / 5) : 1 - smooth((t - 5) / 17);
};

/** The camera at a frame: its shot, the move into it, the drift and any punch. */
export function poseAt(shots: Shot[], punches: Punch[], f: number): Pose {
  let k = 0;
  for (let i = 0; i < shots.length; i += 1) if (shots[i].at <= f) k = i;
  const s = shots[k];
  let pose = drifted(s, f - s.at);
  if (k > 0) {
    const len = MOVE_FRAMES[s.move];
    const u = len ? (f - s.at) / len : 1;
    if (u < 1) {
      const prev = shots[k - 1];
      pose = mix(drifted(prev, s.at - prev.at), drifted(s, 0), easeInOut(u));
    }
  }
  const depth = punches.reduce((m, p) => m + p.depth * punchAt(p, f), 0);
  return depth ? { ...pose, zoom: pose.zoom * (1 + depth) } : pose;
}
/** How fast the camera moves at a frame, in screen pixels a frame (for the motion blur and the whoosh). */
export function speedAt(shots: Shot[], punches: Punch[], f: number): number {
  const a = poseAt(shots, punches, f);
  const b = poseAt(shots, punches, f + 1);
  return Math.hypot((b.x - a.x) * b.zoom, (b.y - a.y) * b.zoom) + Math.abs(Math.log(b.zoom / a.zoom)) * 900 + Math.abs(b.turn - a.turn) * 12;
}

/** A point of the table on the screen; `lift` is the height above the cloth (0 … 0.12), which moves it a little more than the cloth (parallax). */
export function project(p: [number, number], pose: Pose, lift = 0): { x: number; y: number; k: number } {
  const a = (-pose.turn * Math.PI) / 180;
  const dx = p[0] - pose.x;
  const dy = p[1] - pose.y;
  const k = pose.zoom * (1 + lift);
  return { x: COL_X + (dx * Math.cos(a) - dy * Math.sin(a)) * k, y: EYE_Y + (dx * Math.sin(a) + dy * Math.cos(a)) * k, k };
}

// ---------- the plan ----------
/** A measured line; `color` names a colour of the set (Table.tsx), `family` its typeface. */
export type Line = { text: string; size: number; weight: number; color?: string; family?: "vazir" | "naskh" };
/** When a piece is seen: windows of frames [from, to), each faded in and out over FADE frames. */
export type Window = [number, number];
export const FADE = 6;
/** How visible a piece is at a frame (0 … 1). */
export function seen(windows: Window[], f: number): number {
  let v = 0;
  for (const [a, b] of windows) {
    if (f < a || f >= b) continue;
    v = Math.max(v, Math.min(a === 0 ? 1 : smooth((f - a + 1) / FADE), b >= 1e8 ? 1 : smooth((b - f) / FADE)));
  }
  return v;
}

/**
 * Something on the table. `kind` says how Table.tsx draws it; `lines` are its
 * texts, already measured (fit.ts); `w` and `h` its size in table units at
 * `at` (its centre). `num` marks a figure: the gate wants a source on screen
 * whenever one is seen. `claim` names the source chip that belongs to it.
 */
export type PieceKind = "plate" | "figure" | "seal" | "road" | "chip" | "pin" | "counter" | "legend" | "ai" | "ask";
export type Piece = {
  id: string;
  kind: PieceKind;
  at: [number, number];
  w: number;
  h: number;
  lift: number;
  show: Window[];
  lines?: Line[];
  /** a figure that counts up as it arrives: the value, its decimals, how it is written when it lands */
  count?: { to: number; decimals: number; text: string; from: number; frames: number };
  /** an emblem drawn on the piece (emblems.tsx) */
  emblem?: string;
  /** the piece is lit (the road Divan would take, a stance) */
  lit?: "good" | "bad" | "both" | "acc" | null;
  /** a number on the piece (the road's or the seal's), drawn in its corner */
  mark?: string;
  num?: boolean;
  /** the frame the piece's texts come in, when they come later than the piece itself */
  reveal?: number;
};
/** A screen-fixed piece: the source chip, the AI chip, the channel badge, the day counter. */
export type Hud = { id: string; kind: "source" | "badge" | "ai" | "day"; box: Box; show: Window[]; lines: Line[] };
export type SfxName = "whoosh" | "hit" | "tick" | "pop" | "rise" | "swish";
export type Cue = { at: number; name: SfxName; why: string };
/** The map on the table (war): its window and where it lies on the table. */
export type MapLayer = { at: [number, number]; w: number; h: number; pins: { x: number; y: number; t: "confirmed" | "claim" | "unverified"; from: number }[] };

export type Plan = {
  format: string;
  total: number;
  /** the range of lengths the format allows, in seconds */
  length: [number, number];
  /** the words on screen from the first frame (the hook), and the frame they are there from */
  hook: { text: string; figure: string | null; from: number };
  shots: Shot[];
  punches: Punch[];
  pieces: Piece[];
  hud: Hud[];
  sfx: Cue[];
  map: MapLayer | null;
  /** the narrator's lines on the film's own frames */
  voice: { file: string; from: number; frames: number }[];
  badge: boolean;
  /** where the close begins (the request and the badge), and where the camera starts home */
  close: number;
  home: number;
};

/** Every box a piece covers on screen at a frame (its texts included), or null when it is not seen. */
export function pieceBox(p: Piece, pose: Pose): Box {
  const c = project(p.at, pose, p.lift);
  // a turn of a few degrees widens the box by its corners
  const a = (Math.abs(pose.turn) * Math.PI) / 180;
  const w = (p.w * Math.cos(a) + p.h * Math.sin(a)) * c.k;
  const h = (p.h * Math.cos(a) + p.w * Math.sin(a)) * c.k;
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}
