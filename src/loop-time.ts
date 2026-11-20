// The clock of «یک دور» (Loop.tsx), the seamless-loop Reel: every animated value
// is a function of the frame's place in one turn (phase = frame / frames), and
// takes the same value at the last frame's successor (phase 1) as at frame 0. So
// the video can play again and again with no visible seam. Pure, without React,
// so the tests (tests/seam.test.mjs) read it with Node's own type stripping.

/** One turn: 10 s at 30 fps. 10 s is ten beats of the drone (60 BPM) and twenty of a 120 BPM bed. */
export const LOOP_FRAMES = 300;
/** The range a loop's length must stay in (the seamless-loop brief: about 8 to 15 s). */
export const LOOP_RANGE: [number, number] = [8 * 30, 15 * 30];

/**
 * The marks of a turn, as shares of it:
 * 0 – rewind   the full line, today's figure and «۲٫۸ برابر» (the hook, readable on the first frame)
 * rewind – draw the brass pin runs back along the line to the first day, the figure rolls back
 * draw – full  the line is drawn again to today, each event pops up as it is reached
 * full – 1     the full line again, «۲٫۸ برابر» back, the channel badge (gone before the turn ends)
 */
export const MARK = { rewind: 0.12, draw: 0.22, full: 0.82, badgeIn: 0.84, badgeOut: 0.95 } as const;

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const easeInOut = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/** The frame of a mark. */
export const at = (mark: keyof typeof MARK, frames: number) => Math.round(MARK[mark] * frames);

/** How much of the line is drawn (0 = only the first day, 1 = up to today). 1 at frame 0 and at frame `frames`. */
export function progressAt(frame: number, frames: number): number {
  const f = ((frame % frames) + frames) % frames;
  const a = at("rewind", frames);
  const b = at("draw", frames);
  const c = at("full", frames);
  if (f < a) return 1;
  if (f < b) return 1 - easeInOut((f - a) / (b - a));
  if (f < c) return easeInOut((f - b) / (c - b));
  return 1;
}

/** How much «… برابر» shows: there at the start, out as the pin runs back, in again once the line is full. */
export function timesAt(frame: number, frames: number): number {
  const f = ((frame % frames) + frames) % frames;
  const a = at("rewind", frames);
  const c = at("full", frames);
  if (f < a) return 1;
  if (f < c) return 1 - smooth((f - a) / 8);
  return smooth((f - c - 2) / 10);
}

/** The event card: only while the line is being drawn. */
export function drawingAt(frame: number, frames: number): number {
  const f = ((frame % frames) + frames) % frames;
  const b = at("draw", frames);
  const c = at("full", frames);
  return Math.min(smooth((f - b) / 6), smooth((c - f) / 6));
}

/** The channel badge: in at badgeIn, out (fully) before badgeOut, so the turn's last frames equal its first. */
export function badgeAt(frame: number, frames: number): number {
  const f = ((frame % frames) + frames) % frames;
  const a = at("badgeIn", frames);
  const z = at("badgeOut", frames);
  return Math.min(smooth((f - a) / 6), smooth((z - 6 - f) / 6));
}

/** A slow wave of one or more whole periods per turn: the camera's sway, the pin's pulse, the lamp's glint. */
export const wave = (frame: number, frames: number, periods = 1, shift = 0) => Math.sin((2 * Math.PI * periods * frame) / frames + shift);

/** How far along the time axis (percent) the line is at a progress, from the first reading's x to the last's. */
export const runOf = (p: number, firstX: number, lastX: number) => firstX + p * (lastX - firstX);

/** The frame of the draw at which the line reaches x (percent). */
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
