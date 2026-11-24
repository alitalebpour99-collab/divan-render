// «یک دور» in the one style (owner, 23 Nov 2026: the seamless loop rebuilt on the map engine): what is on frame f of a
// turn, pure (no React), so the renderer (Loop.tsx) and the pre-delivery check (scripts/mapcheck.mjs, checkLoop) read
// the very same layout. The navy room of the storyboard Reels: the map of Iran under the camera, Tehran's market marked
// on it with a leader down to the glass chart panel (as Reel.tsx draws a chart beat), the HUD and the header at the
// top, the one source line, the event or the badge in the caption's row. Every moving value is periodic in the turn
// (loop-time.ts): the camera's sway, the pin's ring, the draw.
import { geoOrthographic } from "d3-geo";
import { scaleOf, type Look } from "../map-engine/camera";
import { PLACES_FA } from "../map-engine/names";
import { textWidth } from "../map-engine/labels";
import type { LoopProps } from "../props";
import { at, badgeAt, drawingAt, progressAt, ring, runOf, stopFrame, timesAt, wave } from "../loop-time";

export type Box = { x: number; y: number; w: number; h: number };
export const W = 1080;
export const H = 1920;
/** the storyboard Reels' column (Reel.tsx L, R): the right edge leaves room for the app's own buttons */
export const L = 64;
export const R = 884;
export const COLW = R - L;
/** the header and the source line, as Reel.tsx CHROME: no word on the map may enter them */
export const CHROME: Box[] = [
  { x: 0, y: 0, w: 1080, h: 556 },
  { x: 0, y: 1404, w: 1080, h: 64 },
];
/** the glass panel of the chart (Reel.tsx Chart: L − 24 … R + 24), a little taller: the line is the story here */
export const PANEL: Box = { x: L - 24, y: 700, w: COLW + 48, h: 690 };
/** the plot inside it: time runs left to right, the oldest day on the left, today on the right (owner, 19 Nov 2026) */
export const PLOT = { x0: L + 40, x1: R - 40, y0: 966, y1: 1262 };
/** the caption's row (Reel.tsx Caption, y 1490): the event while the line is drawn, then the channel badge */
export const ROW_TOP = 1490;
export const ROW_H = 78;
/** the source line (Reel.tsx SOURCE_TOP) */
export const SOURCE_TOP = 1414;
/** where Tehran's market stands on the screen, between the header and the panel */
export const PIN_AT: [number, number] = [540, 630];
/** the camera's width (degrees of arc across the frame) and its drift: whole periods per turn */
export const SPAN = 17;
/**
 * v3 (the coordinator, 24 Nov 2026: «the map should move»): the camera drifts east and west across Iran once a turn
 * (DRIFT degrees either side of Tehran), rises and falls twice, and breathes in and out: Tehran's pin travels about
 * 100 px each way on the screen, always between the header and the panel. Whole periods: frame N is frame 0.
 */
export const DRIFT = 1.6;
/** one beat of the bed (frames): the library track of the loop runs at 100 BPM (music/prompts.json), 0.6 s */
export const BEAT = 18;
/** how long an event's ripple runs over the map from Tehran (frames) */
export const RIPPLE = 36;
/** the strip of the events under the caption's row: one numbered disc an event at its date, the pin running along it */
export const STRIP = { x0: L + 34, x1: R - 34, y: 1640, box: { x: L, y: 1600, w: COLW, h: 84 } };
export const LABEL_SIZE = 52;
export const PIN_R = 13;

export const loopDuration = (p: Pick<LoopProps, "frames">) => Math.max(240, Math.min(450, Math.round(p.frames || 300)));

const TEHRAN = PLACES_FA.tehran;

/** The camera on frame f: centred so Tehran stands at PIN_AT, swaying a little; equal at frame 0 and frame N. */
export function loopLook(f: number, N: number): Look {
  const span = SPAN * (1 + 0.06 * wave(f, N, 1, 2.0));
  const scale = scaleOf(span, W);
  const d = (Math.asin((H / 2 - PIN_AT[1]) / scale) * 180) / Math.PI;
  return { lon: TEHRAN.lon + DRIFT * wave(f, N, 1, 0.6), lat: TEHRAN.lat - d + 0.3 * wave(f, N, 2, 1.1), span };
}

/** The projection of a look, exactly as MapStage.tsx makeView draws it (the whole screen is the stage). */
export function loopView(look: Look) {
  const scale = scaleOf(look.span, W);
  const proj = geoOrthographic().rotate([-look.lon, -look.lat, 0]).scale(scale).translate([W / 2, H / 2]).clipAngle(90).precision(0.4);
  return {
    look,
    at: (lon: number, lat: number) => proj([lon, lat]) as [number, number] | null,
    inv: (x: number, y: number) => (proj.invert ? (proj.invert([x, y]) as [number, number] | null) : null),
  };
}

/** The header's size: the largest from 84 px down to 60 that keeps the span in two lines of the column. */
export function headerSize(text: string): number {
  for (let s = 84; s > 60; s -= 2) if (textWidth(text, s) <= 2 * COLW - 60) return s;
  return 60;
}

/** The event row's size: 46 px (the captions' size) down to 34, so the event is always whole in the column. */
export function rowSize(text: string): number {
  for (let s = 46; s > 34; s -= 2) if (textWidth(text, s) + 92 <= COLW) return s;
  return 34;
}

/** The events' places as shares of the run (0 = the first reading, 1 = the last): where the draw rests. */
export function stopsOf(p: LoopProps): number[] {
  const first = p.points[0];
  const last = p.points[p.points.length - 1];
  const span = Math.max(1e-6, last.x - first.x);
  return p.points.filter((q) => q.event).map((q) => (q.x - first.x) / span);
}

export type Word = { kind: "label" | "row"; t: string; box: Box; at?: [number, number]; map: boolean };

/** Everything frame f shows and where: the renderer draws it, the check tests it. */
export function loopScene(p: LoopProps, f: number) {
  const N = loopDuration(p);
  const pts = p.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const stops = stopsOf(p);
  const prog = progressAt(f, N, stops);
  const run = runOf(prog, first.x, last.x);
  const full = prog >= 0.9999;
  const shown = pts.filter((q) => q.x <= run + 1e-6);
  // the reading at the pin: the last one passed (a figure on the screen is always a reading, never a value between two)
  const reading = full ? last : (shown[shown.length - 1] ?? first);
  const next = pts.find((q) => q.x > run + 1e-6);
  const prev = shown[shown.length - 1] ?? first;
  const tip = full || !next ? { x: last.x, y: last.y } : { x: run, y: prev.y + ((next.y - prev.y) * (run - prev.x)) / Math.max(1e-6, next.x - prev.x) };
  const drawing = drawingAt(f, N);
  const passed = shown.filter((q) => q.event);
  const event = drawing > 0 ? (passed[passed.length - 1] ?? null) : null;
  // how long since this event popped (frames): its point rings once
  const eventAge = event ? f - stopFrame(stops[pts.filter((q) => q.event).indexOf(event)] ?? 0, N, stops) : -1;
  const times = timesAt(f, N);
  const badge = p.badge === false ? 0 : badgeAt(f, N);
  const look = loopLook(f, N);
  const view = loopView(look);
  const pin = view.at(TEHRAN.lon, TEHRAN.lat) ?? PIN_AT;
  // the pin beats with the bed: a whole number of beats a turn (16 in 288 frames at 100 BPM)
  const beats = Math.max(1, Math.round(N / BEAT));
  const pulse = ring(f, N, beats);
  // each event sends a ripple over the map from Tehran as the pin reaches it (gone long before the turn ends)
  const evPts = pts.filter((q) => q.event);
  const ripples = stops.map((s, i) => ({ n: i + 1, age: f - stopFrame(s, N, stops) })).filter((r) => r.age >= 0 && r.age < RIPPLE && stopFrame(stops[r.n - 1], N, stops) + RIPPLE < N);
  // the strip: the events at their dates, the pin along it with the line's pin
  const sxStrip = (x: number) => STRIP.x0 + ((x - first.x) / Math.max(1e-6, last.x - first.x)) * (STRIP.x1 - STRIP.x0);
  const strip = { pin: sxStrip(run), events: evPts.map((q, i) => ({ n: i + 1, x: sxStrip(q.x), passed: q.x <= run + 1e-6, t: q.event as string })) };
  const eventN = event ? evPts.indexOf(event) + 1 : 0;

  const words: Word[] = [];
  const panels: Box[] = [...CHROME, PANEL, STRIP.box];
  // Tehran's name, on its own land, to the left of the pin (a land place's name may stand on its land)
  const lw = textWidth(TEHRAN.t, LABEL_SIZE);
  words.push({ kind: "label", t: TEHRAN.t, at: pin, box: { x: pin[0] - PIN_R - 18 - lw, y: pin[1] - LABEL_SIZE * 0.62, w: lw, h: LABEL_SIZE * 1.24 }, map: true });
  // the caption's row: the event while the line is drawn, then the badge (never both: they are a turn apart)
  const rowText = event?.event ?? null;
  if (rowText && drawing > 0) {
    const w = textWidth(rowText, rowSize(rowText)) + 92;
    const box = { x: R - w, y: ROW_TOP, w, h: ROW_H };
    words.push({ kind: "row", t: rowText, box, map: false });
    panels.push(box);
  }
  const badgeBox = { x: L, y: ROW_TOP, w: 470, h: ROW_H };
  if (badge > 0) panels.push(badgeBox);
  const discs = [{ n: 0, xy: pin, r: PIN_R * 1.25, geo: [TEHRAN.lon, TEHRAN.lat] as [number, number], sea: false }];
  return { N, f, prog, run, full, shown, reading, tip, drawing, event, eventN, eventAge, times, badge, badgeBox, look, view, pin, pulse, beats, ripples, strip, words, panels, discs, stops };
}


/** The frames of a turn at which something is cued (for the sound): the rewind, the draw, each event as the pin reaches it. */
export function eventFrames(p: LoopProps): number[] {
  const N = loopDuration(p);
  const stops = stopsOf(p);
  return stops.filter((s) => s > 0.001).map((s) => stopFrame(s, N, stops));
}

export { at };
