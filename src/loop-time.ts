// The clock of «یک دور» (src/loop/Loop.tsx), the seamless-loop Reel: every animated value
// is a function of the frame's place in one turn (phase = frame / frames), and
// takes the same value at the last frame's successor (phase 1) as at frame 0. So
// the video can play again and again with no visible seam. Pure, without React,
// so the tests (tests/seam.test.mjs, tests/loop.test.mjs) read it with Node's own type stripping.

/** One turn: 9.6 s at 30 fps, sixteen beats of the loop's library bed (divan-data-steady, 100 BPM); v3 (24 Nov 2026), was 300. */
export const LOOP_FRAMES = 288;
/** The range a loop's length must stay in (the seamless-loop brief: about 8 to 15 s). */
export const LOOP_RANGE: [number, number] = [8 * 30, 15 * 30];

/**
 * The marks of a turn, as shares of it:
 * 0 – rewind   the full line, today's figure and «۲٫۸ برابر» (the hook, readable on the first frame)
 * rewind – draw the pin runs back along the line to the first day, the figure steps back through the readings
 * draw – full  the line is drawn again to today, the pin stopping at each event as it pops up
 * full – 1     the full line again, «۲٫۸ برابر» back, the channel badge (gone before the turn ends)
 */
export const MARK = { rewind: 0.12, draw: 0.22, full: 0.82, badgeIn: 0.84, badgeOut: 0.95 } as const;
/** Words snap in and out over this many frames (round 3A: a cross-fade caught half-way reads as ghosted text). */
export const SNAP = 5;
/** The fewest frames the pin spends between two stops (an event's words stay at least this long: never a blink). */
export const MIN_LEG = 22;

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const easeInOut = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const wrap = (frame: number, frames: number) => ((frame % frames) + frames) % frames;

/** The frame of a mark. */
export const at = (mark: keyof typeof MARK, frames: number) => Math.round(MARK[mark] * frames);

/**
 * The legs of the draw: the pin goes from stop to stop (shares of the run, 0…1, the events' places), easing into
 * each so it rests a moment where an event pops up. Each leg's time is its share of the run, but never under
 * MIN_LEG frames (two events close together still get time to be read). Returns [share, frame] knots.
 */
export function legsOf(frames: number, stops: number[] = []): [number, number][] {
  const b = at("draw", frames);
  const c = at("full", frames);
  const cuts = [...new Set([0, ...stops.filter((s) => s > 0.001 && s < 0.999), 1])].sort((x, y) => x - y);
  const d = cuts.slice(1).map((s, i) => s - cuts[i]);
  const span = c - b;
  // every leg gets MIN_LEG frames, the rest of the draw is shared by distance (too many stops: equal legs)
  const floor = Math.min(MIN_LEG, span / d.length);
  const rest = span - floor * d.length;
  const t = d.map((x) => floor + rest * x);
  const knots: [number, number][] = [[0, b]];
  let f = b;
  t.forEach((x, i) => {
    f += x;
    knots.push([cuts[i + 1], i === t.length - 1 ? c : f]);
  });
  return knots;
}

/**
 * How much of the line is drawn (0 = only the first day, 1 = up to today). 1 at frame 0 and at frame `frames`.
 * `stops`: where the draw rests (the events' shares of the run); without them one smooth stroke.
 */
export function progressAt(frame: number, frames: number, stops: number[] = []): number {
  const f = wrap(frame, frames);
  const a = at("rewind", frames);
  const b = at("draw", frames);
  const c = at("full", frames);
  if (f < a) return 1;
  if (f < b) return 1 - easeInOut((f - a) / (b - a));
  if (f >= c) return 1;
  if (!stops.length) return easeInOut((f - b) / (c - b));
  const knots = legsOf(frames, stops);
  for (let i = 0; i + 1 < knots.length; i += 1) {
    const [s0, f0] = knots[i];
    const [s1, f1] = knots[i + 1];
    if (f < f1) return s0 + (s1 - s0) * smooth((f - f0) / Math.max(1, f1 - f0));
  }
  return 1;
}

/** The frame at which the draw reaches a stop (a share of the run). */
export function stopFrame(share: number, frames: number, stops: number[]): number {
  const k = legsOf(frames, stops).find(([s]) => Math.abs(s - share) < 1e-9);
  return k ? Math.round(k[1]) : at("draw", frames);
}

/** How much «… برابر» shows: there at the start, out as the pin runs back, in again once the line is full. */
export function timesAt(frame: number, frames: number): number {
  const f = wrap(frame, frames);
  const a = at("rewind", frames);
  const c = at("full", frames);
  if (f < a) return 1;
  if (f < c) return 1 - smooth((f - a) / SNAP);
  return smooth((f - c) / SNAP);
}

/** The event's words: only while the line is being drawn. */
export function drawingAt(frame: number, frames: number): number {
  const f = wrap(frame, frames);
  const b = at("draw", frames);
  const c = at("full", frames);
  return Math.min(smooth((f - b) / SNAP), smooth((c - f) / SNAP));
}

/** The channel badge: in at badgeIn, out (fully) before badgeOut, so the turn's last frames equal its first. */
export function badgeAt(frame: number, frames: number): number {
  const f = wrap(frame, frames);
  const a = at("badgeIn", frames);
  const z = at("badgeOut", frames);
  return Math.min(smooth((f - a) / 6), smooth((z - 6 - f) / 6));
}

/** A slow wave of one or more whole periods per turn: the camera's sway, the pin's pulse. */
export const wave = (frame: number, frames: number, periods = 1, shift = 0) => Math.sin((2 * Math.PI * periods * frame) / frames + shift);

/** A ring that grows and fades `periods` times a turn (0…1), whole periods so it meets itself at the seam. */
export const ring = (frame: number, frames: number, periods: number) => {
  const u = (wrap(frame, frames) * Math.max(1, Math.round(periods))) / frames;
  return u - Math.floor(u);
};

/** How far along the time axis (percent) the line is at a progress, from the first reading's x to the last's. */
export const runOf = (p: number, firstX: number, lastX: number) => firstX + p * (lastX - firstX);

/** The frame of the draw at which the line reaches x (percent), on a draw without stops. */
export function reachedAt(x: number, firstX: number, lastX: number, frames: number): number {
  const b = at("draw", frames);
  const c = at("full", frames);
  const target = (x - firstX) / Math.max(1e-6, lastX - firstX);
  // invert the ease by bisection: monotone on [0, 1]
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (easeInOut(mid) < target) lo = mid;
    else hi = mid;
  }
  return b + Math.round(((lo + hi) / 2) * (c - b));
}

export type LoopCue = { at: number; name: "swish" | "tick" | "pop" | "badge"; volume: number };

/**
 * The effects of a turn. None in its first and last tenth (the seam must carry only the bed), at most two in any
 * second, so one pop for at most four events, each at least 15 frames after the one before.
 */
export function cuesOf(events: number[], frames: number, badge = true): LoopCue[] {
  const out: LoopCue[] = [
    { at: at("rewind", frames), name: "swish", volume: 0.24 },
    { at: at("draw", frames), name: "tick", volume: 0.2 },
  ];
  let last = at("draw", frames);
  for (const e of [...events].sort((a, b) => a - b)) {
    if (out.filter((c) => c.name === "pop").length >= 4) break;
    if (e - last < 15) continue;
    out.push({ at: e, name: "pop", volume: 0.24 });
    last = e;
  }
  if (badge) out.push({ at: at("badgeIn", frames), name: "badge", volume: 0.5 });
  const lo = Math.ceil(frames * 0.1);
  const hi = Math.floor(frames * 0.9);
  return out.filter((c) => c.at >= lo && c.at <= hi).sort((a, b) => a.at - b.at);
}
