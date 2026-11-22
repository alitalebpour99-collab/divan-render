// The director: from a Reel's content and the narrator's words to its storyboard (storyboard-fa.md §1 step 5).
// Pure (no React): the site and the renderer both run it. Every beat lasts as long as its line is said; it is cut
// into shots of 1 to 2 seconds, each cut made on a word the narrator says, so a picture changes when a word lands.
// Each shot says what it shows, how it moves, what it writes, what it sounds like, how it leaves, and why it is there.
import { geoDistance, geoInterpolate } from "d3-geo";
import type { Look } from "../map-engine/camera";
import { CAPITALS } from "../map-engine/capitals";
import { PLACES_FA } from "../map-engine/names";
import { country } from "../map-engine/world";
import { textWidth } from "../map-engine/labels";
import { bandBottom, fitPoints, WIDE } from "./legend";

/**
 * Where the first frame looks from when the concept gives no opening and the hook names states out of its frame
 * («میز ایران و آمریکا کجاست؟» on a frame of Iran): the globe turned to hold them all, so the Reel opens on every
 * actor and dives to the place (round 2). Null when everything is in the frame (the Reel's own short dive then).
 */
export function hookFrom(b: Beat): Look | null {
  if (b.kind !== "hook" || b.from) return b.kind === "hook" ? (b.from ?? null) : null;
  const pts = (b.marks ?? []).filter((m) => m.kind === "fill").map((m) => country((m as { a3: string }).a3)?.centroid).filter((p): p is [number, number] => Boolean(p));
  const far = pts.filter((p) => (geoDistance(p, [b.look.lon, b.look.lat]) * 180) / Math.PI > b.look.span * 0.55);
  if (!far.length) return null;
  // the mean direction of the actors and the place, on the sphere
  const all: [number, number][] = pts.length > 1 ? pts : [...pts, [b.look.lon, b.look.lat]];
  const r = Math.PI / 180;
  const v = all.reduce((a, [lon, lat]) => [a[0] + Math.cos(lat * r) * Math.cos(lon * r), a[1] + Math.cos(lat * r) * Math.sin(lon * r), a[2] + Math.sin(lat * r)], [0, 0, 0]);
  return { lon: Math.atan2(v[1], v[0]) / r, lat: Math.atan2(v[2], Math.hypot(v[0], v[1])) / r, span: 175, tilt: 0 };
}
import type { Beat, Mark, ReelContent, Shot, Storyboard, Transition } from "./types";

export const FPS = 30;
/** pass 4: how long the camera flies into a beat (Reel.tsx cameraKeys): a quick dive, a whip pan (render 1 at 22/30 frames left an empty frame at every cut) */
export const TRAVEL = { dive: 14, pan: 6 } as const;
/**
 * Pass 4 (the judge: «near-empty frames at the cuts: the header arrives before the marks»): a beat's first shot that flies
 * (a dive or a pan) brings its header, its marks, its discs and their legend rows together, when the camera has arrived.
 */
export function arriveOf(shots: Shot[], s: Shot, fps = FPS): number {
  if (s.beat === 0 || shots.find((z) => z.beat === s.beat) !== s) return 0;
  const len = Math.round(s.dur * fps);
  return s.motion.camera === "dive" ? Math.max(0, Math.min(TRAVEL.dive, len - 8)) : s.motion.camera === "pan" ? Math.max(0, Math.min(TRAVEL.pan, len - 8)) : 0;
}
const MIN_SHOT = 30;
const MAX_SHOT = 60;
/** the narrator starts within the first 3 frames; every other line a little after its beat begins */
const LEAD = { hook: 2, other: 4 } as const;
const PAD = 6;
/** the last frames bring the first picture back (the loop) */
export const LOOP = 40;
/** the hook's own shots end within this many frames; a longer first line goes on as the event in detail */
export const HOOK_MAX = 30;

export type VoiceLine = { file: string; cue: string; frames: number; words?: { text: string; from: number; frames: number }[] };

/** How many views a beat has: a road shows its object, its cost and its source (three shots, never a card). */
export const viewsOf = (b: Beat): number => {
  switch (b.kind) {
    case "hook":
      return 1;
    case "map":
      return Math.max(1, Math.min(4, b.marks.length));
    case "chart":
      return 2;
    case "number":
      return 3;
    case "flags":
      return Math.max(1, Math.min(3, b.a3.length));
    case "demand":
      return 3;
    case "road":
      return 3;
    case "gauge":
      return 2;
    case "poll":
      return 3;
  }
};
/**
 * Reading time (owner, 21 Nov 2026: «زمان ویدیو برای توضیح بیشتر وجود داشته باشه اگه لازمه»): a beat stays until its
 * words can be read at 2.75 words a second, plus the time to look at its map (a second, and a little more for each
 * incident or thing on it). The length of a Reel follows its content, not a fixed short time; the hook is the exception
 * (its title is the first two seconds and the cut is what holds the eye).
 */
export const READ_WPS = 2.75;
const screenWords = (b: Beat): number => {
  const marks = b.kind === "hook" || b.kind === "map" || b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : [];
  const own = b.kind === "map" ? [b.caption] : b.kind === "number" ? [b.big, b.unit, b.text] : b.kind === "chart" ? [b.chart.title] : b.kind === "road" ? [b.road.title, b.road.cost] : b.kind === "demand" ? [b.wants] : b.kind === "flags" ? [b.title] : b.kind === "poll" ? [b.q, ...b.options.map((o) => o.title)] : [];
  // round 8: a beat's legend is read like its callouts were
  const legend = b.kind === "map" || b.kind === "hook" ? (b.legend ?? []).map((x) => x.text) : [];
  // pass 4: a place's name on the map is glanced at, not read (it is ground, not news): it adds no reading time
  return [...own, ...legend, ...marks.flatMap((m) => (m.kind === "callout" ? [m.bold, m.sub] : []))].reduce((n, s) => n + wordsIn(s), 0);
};
// pass 4 (the judge: «the share beat runs 12.5 s»): a thing that stands right by its numbered disc is looked at with it, once
const lookFrames = (b: Beat, fps: number) => {
  if (b.kind !== "map" && b.kind !== "demand" && b.kind !== "road") return 0;
  const ms = b.marks ?? [];
  const discs = ms.filter((m): m is Extract<Mark, { kind: "marker" }> => m.kind === "marker");
  const span = "look" in b && b.look ? b.look.span : 4;
  const byDisc = (m: Mark) => m.kind === "object" && (m.move === undefined || m.move === "stand") && discs.some((d) => Math.hypot(d.lon - m.lon, d.lat - m.lat) < span * 0.25);
  return fps + Math.round(0.4 * fps * ms.filter((m) => (m.kind === "object" || m.kind === "pins" || m.kind === "marker") && !byDisc(m)).length);
};
export const readFrames = (b: Beat, fps = FPS) => (b.kind === "hook" ? 0 : Math.round((screenWords(b) / READ_WPS) * fps) + lookFrames(b, fps));
/** The least a beat lasts without a narrator, in frames. */
// pass 5 (the judge: «the hook's title vanishes at 1 s»): the hook holds its title at least 2.5 s
const floorOf = (b: Beat) => Math.max(b.kind === "hook" ? 75 : b.kind === "chart" ? 105 : b.kind === "poll" ? 3 * 32 + LOOP : viewsOf(b) * 40, readFrames(b));

/** Words of a line said at about 13 letters a second, when no narrator read it (samples, a Reel held without voice). */
export function guessWords(text: string, fps = FPS): { text: string; from: number; frames: number }[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  let at = 0;
  return words.map((w) => {
    const frames = Math.max(5, Math.round(((Array.from(w).length + 1) / 13) * fps));
    const out = { text: w, from: at, frames };
    at += frames;
    return out;
  });
}

const centreOf = (marks: Mark[], fallback: Look): [number, number] => {
  const pts: [number, number][] = [];
  for (const m of marks) {
    if (m.kind === "callout" || m.kind === "label" || m.kind === "flag" || m.kind === "object") pts.push([m.lon, m.lat]);
    else if (m.kind === "pins") pts.push(...m.points.map((p) => [p.lon, p.lat] as [number, number]));
    else if (m.kind === "measure") pts.push(m.a, m.b);
    else if (m.kind === "claim" || m.kind === "dashed" || m.kind === "comet") pts.push(m.coords[Math.floor(m.coords.length / 2)]);
  }
  if (!pts.length) return [fallback.lon, fallback.lat];
  return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
};
const lookOfBeat = (b: Beat): Look | null =>
  b.kind === "hook" || b.kind === "map" || b.kind === "demand" ? b.look : b.kind === "road" && b.look ? b.look : b.kind === "chart" && b.chart.place && PLACES_FA[b.chart.place] ? { lon: PLACES_FA[b.chart.place].lon, lat: PLACES_FA[b.chart.place].lat - 1.5, span: 14 } : null;

/**
 * The camera's vocabulary inside a beat (round 2, 21 Nov 2026; the judge: «one framing held for 20 s»). The first
 * shot of a beat flies to the beat's look (a dive or a pan); every later shot makes the next move of a cycle, started
 * at a different place for each beat, so two shots in a row never move alike and every 1 to 2 s the picture changes:
 *   push   in on what this shot brings (60 % of the way to its marks, twice as close)
 *   pan    across to what this shot brings (or a third of the frame across), a little closer
 *   pull   back out to the region round the beat (2.4 times its frame), flat
 *   lean   the map leans back like a table (tilt 24°), a little closer
 * The beat's own look bounds every move (0.4 to 2.8 of its span), so its marks stay in the frame. Each move is made in
 * 0.7 s and the camera then creeps on (Reel.tsx cameraKeys): on a sheet of one frame a second, every second is new.
 */
/** The beat's line that travels furthest (a comet, a dashed line or a claim): the one the camera follows. */
const lineOf = (marks: Mark[]): [number, number][] | null => {
  let best: [number, number][] | null = null;
  let len = 0;
  for (const m of marks) {
    // round 4: a pipeline laid on its route, a ship on its lane, an aircraft on its way are lines the camera follows too
    // round 7: a ship on a lane sails the Reel's clock along the whole lane: its way is not this beat's line to follow
    if (m.kind === "object" && m.lane) continue;
    if (m.kind === "object" && m.path && m.path.length >= 2 && (m.move === "pipe" || m.move === "sail" || m.move === "fly" || m.move === "approach")) {
      const d = geoDistance(m.path[0], m.path[m.path.length - 1]);
      if (d > len) {
        len = d;
        best = m.path;
      }
      continue;
    }
    if (m.kind !== "comet" && m.kind !== "dashed" && m.kind !== "claim") continue;
    // a looping comet is traffic on a lane, not a story: the camera never follows it out to sea (round 3A, 7.5–9 s)
    if (m.kind === "comet" && m.loop) continue;
    const d = geoDistance(m.coords[0], m.coords[m.coords.length - 1]);
    if (d > len) {
      len = d;
      best = m.coords;
    }
  }
  return best && len > 0.02 ? best : null;
};
/** A claim beat (round 4 pass 3): two or more states' callouts on one map. Their points, or null. */
/**
 * The beat's marks shared out over its shots, at most one new callout a shot (round 6, the judge: «two incidents close
 * together crowd one shot»): a second callout waits for the next shot; the last shot takes what is left.
 */
/** round 8: when the first shot brings a disc, no other disc comes on that shot: it waits for the next one */
export function discsAfterFirst(sl: number[][], firstHasDisc: boolean, isDisc: (i: number) => boolean): number[][] {
  if (!firstHasDisc || sl.length < 2) return sl;
  const out = sl.map((x) => [...x]);
  const moved = out[0].filter(isDisc);
  out[0] = out[0].filter((i) => !isDisc(i));
  out[1] = [...moved, ...out[1]];
  return out;
}
/**
 * Pass 3 (owner: «پمپ‌جک ۲ ثانیه بعد از دایره‌اش می‌آید»): a thing that stands by a later disc comes on the very shot its
 * disc lands on, whatever share of the shots the stagger gave it.
 */
export function withPairs(sl: number[][], pairOf: Map<number, number>): number[][] {
  if (!pairOf.size) return sl;
  const out = sl.map((x) => x.filter((i) => !pairOf.has(i)));
  for (const [i, d] of pairOf) {
    const k = out.findIndex((x) => x.includes(d));
    if (k < 0) {
      const back = sl.findIndex((x) => x.includes(i));
      out[back].push(i);
      continue;
    }
    out[k].splice(out[k].indexOf(d) + 1, 0, i);
  }
  // a shot the pairing emptied takes a free mark (not a disc, not riding with one) from the nearest shot that has two
  const free = (i: number) => !pairOf.has(i) && ![...pairOf.values()].includes(i);
  for (let k = 1; k < out.length; k += 1) {
    if (out[k].length) continue;
    const donors = out.map((x, j) => ({ j, d: Math.abs(j - k) + (j < k ? 0.5 : 0) })).filter(({ j }) => j !== k && out[j].length >= 2 && out[j].some(free)).sort((a, z) => a.d - z.d);
    if (!donors.length) continue;
    const x = out[donors[0].j];
    const i = donors[0].j > k ? x.find(free)! : [...x].reverse().find(free)!;
    x.splice(x.indexOf(i), 1);
    out[k].push(i);
  }
  return out;
}
export function stagger(rest: number[], n: number, isCallout: (i: number) => boolean): number[][] {
  const sl = Array.from({ length: n }, (_, k) => rest.slice(Math.floor((k * rest.length) / n), Math.floor(((k + 1) * rest.length) / n)));
  for (let k = 0; k + 1 < n; k += 1) {
    while (sl[k].filter(isCallout).length > 1) {
      const last = [...sl[k]].reverse().find(isCallout)!;
      sl[k] = sl[k].filter((i) => i !== last);
      sl[k + 1] = [last, ...sl[k + 1]];
    }
  }
  return sl;
}
export const claimPoints = (marks: Mark[]): [number, number][] | null => {
  const cs = marks.filter((m): m is Extract<Mark, { kind: "callout" }> => m.kind === "callout" && Boolean((m as { a3?: string }).a3));
  return new Set(cs.map((m) => (m as { a3?: string }).a3)).size >= 2 ? cs.map((m) => [m.lon, m.lat] as [number, number]) : null;
};
/**
 * The look that holds every claim point inside the labels' safe frame (x 140–820, y 620–1340 of 1080×1920), with room
 * for the words: a narrative left off the screen is a narrative the viewer never hears (abqaiq «سه روایت», pass 2).
 * Each later shot breathes a little wider and drifts, so the picture still changes every shot.
 */
export function frameAll(pts: [number, number][], k: number, beat: Look): Look {
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const midLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cos = Math.cos((midLat * Math.PI) / 180);
  const need = Math.max(((Math.max(...lons) - Math.min(...lons)) * cos * 1080) / 680, ((Math.max(...lats) - Math.min(...lats)) * 1080) / 720) * 1.18;
  const span = Math.max(need, beat.span * 0.8) * (1 + 0.07 * (k % 3));
  // the safe frame's middle is 60 px left of and 20 px under the screen's
  const lon = midLon + (60 * span) / (1080 * cos) + (k % 2 ? 1 : -1) * span * 0.02 * (k > 0 ? 1 : 0);
  const lat = midLat + (20 * span) / 1080;
  return { lon, lat, span, tilt: 0, roll: 0 };
}
/** Where a share's bar is (Reel.tsx shareBox): as wide as its words, 318 px over its thing. */
export const shareWidth = (label: string) => Math.min(820, Math.max(360, textWidth(label, 40)));
/** Where its thing may stand (from the screen's middle) so the whole bar is inside the safe frame (x 64–884, y 560–1400). */
export function shareBounds(label: string) {
  const w = shareWidth(label);
  let x0 = 64 + w / 2 + 24 - 540;
  let x1 = 884 - w / 2 - 24 - 540;
  if (x0 > x1) x0 = x1 = (x0 + x1) / 2;
  return { x0, x1, y0: 560 + 318 + 24 - 960, y1: 380 };
}
/** The beat's main thing: its first object that stands at its point (not one that sails, flies or falls, not a pipeline). */
export const mainObject = (marks: Mark[]): [number, number] | null => {
  const o = marks.find((m) => m.kind === "object" && (m.move === undefined || m.move === "stand" || m.move === "approach"));
  return o && o.kind === "object" ? [o.lon, o.lat] : null;
};
/**
 * The look moved as little as it must for the point to stand inside the labels' safe frame (x 140–820, y 620–1340 of
 * 1080×1920). Round 5 (the judge: «the camera follows a comet away, the refinery drops off the left edge»).
 */
export function keepInFrame(look: Look, p: [number, number], b = { x0: -400, x1: 280, y0: -340, y1: 380 }): Look {
  const cos = Math.cos((p[1] * Math.PI) / 180);
  const px = 1080 / look.span;
  const dx = (p[0] - look.lon) * cos * px;
  const dy = -(p[1] - look.lat) * px;
  const cx = Math.max(b.x0, Math.min(b.x1, dx));
  const cy = Math.max(b.y0, Math.min(b.y1, dy));
  if (cx === dx && cy === dy) return look;
  return { ...look, lon: p[0] - cx / (cos * px), lat: p[1] + cy / px };
}
const endOf = (marks: Mark[]): [number, number] | null => {
  for (const m of [...marks].reverse()) if (m.kind === "comet" || m.kind === "dashed" || m.kind === "claim") return m.coords[m.coords.length - 1];
  return null;
};
export const MOVES = ["push", "pan", "pull", "lean"] as const;
export type Move = (typeof MOVES)[number];
export function moveLook(move: Move, prev: Look, beat: Look, target: [number, number] | null, k: number): Look {
  const bound = (span: number) => Math.max(beat.span * 0.4, Math.min(beat.span * 2.8, span));
  const toward = (share: number): [number, number] => (target ? [prev.lon + (target[0] - prev.lon) * share, prev.lat + (target[1] - prev.lat) * share] : [prev.lon, prev.lat]);
  switch (move) {
    case "push": {
      const [lon, lat] = toward(0.6);
      return { lon, lat, span: bound(prev.span * 0.5), tilt: 8, roll: 0 };
    }
    case "pan": {
      // a pan travels: to what this shot brings, or a third of the frame across when it brings nothing; no roll (the
      // judge read a small roll as a wobble)
      const side = (k % 2 ? 1 : -1) * prev.span * 0.34;
      const [lon, lat] = target && Math.hypot(target[0] - prev.lon, target[1] - prev.lat) > prev.span * 0.12 ? toward(0.9) : [prev.lon + side, prev.lat];
      return { lon, lat, span: bound(prev.span * 0.92), tilt: 6, roll: 0 };
    }
    case "pull":
      // out to the context: the whole region round the beat (2.4 times its frame), flat, its names in view
      return { lon: beat.lon + (prev.lon - beat.lon) * 0.3, lat: beat.lat + (prev.lat - beat.lat) * 0.3, span: bound(Math.max(prev.span * 2, beat.span * 2.4)), tilt: 0, roll: 0 };
    case "lean": {
      const [lon, lat] = toward(0.4);
      return { lon, lat: lat - prev.span * 0.08, span: bound(prev.span * 0.85), tilt: 24, roll: 0 };
    }
  }
}
const marksOf = (b: Beat): Mark[] => (b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : []);
const isDive = (a: Look | null, b: Look) => !a || Math.max(a.span, b.span) / Math.min(a.span, b.span) > 2.5 || (geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 180) / Math.PI > Math.min(a.span, b.span) * 0.8;
const wordsIn = (s: string | undefined) => String(s ?? "").replace(/[؟?!.،,؛:«»"()]/g, " ").split(/\s+/).filter(Boolean).length;

/** Cuts [from, to) into shots of MIN_SHOT…MAX_SHOT frames, each starting on a word when one is near; at least `need` shots. */
export function cutBeat(from: number, to: number, wordStarts: number[], need: number): number[] {
  const len = to - from;
  const most = Math.max(1, Math.floor(len / MIN_SHOT));
  const want = Math.min(most, Math.max(need, Math.ceil(len / MAX_SHOT)));
  // the even cut, then each cut moved to the nearest word start within 8 frames that keeps the shots legal
  const cuts: number[] = [from];
  for (let i = 1; i < want; i += 1) {
    const even = from + Math.round((len * i) / want);
    const near = wordStarts.filter((w) => Math.abs(w - even) <= 10).sort((a, b) => Math.abs(a - even) - Math.abs(b - even));
    let c = even;
    for (const w of near) {
      const next = i + 1 < want ? from + Math.round((len * (i + 1)) / want) : to;
      if (w - cuts[cuts.length - 1] >= MIN_SHOT && w - cuts[cuts.length - 1] <= MAX_SHOT && next - w >= MIN_SHOT && next - w <= MAX_SHOT) {
        c = w;
        break;
      }
    }
    cuts.push(c);
  }
  return cuts;
}

const SFX_OF: Partial<Record<Beat["kind"], Shot["sound"]["sfx"]>> = { hook: "hit", map: "whoosh", chart: "tick", number: "rise", flags: "pop", demand: "whoosh", road: "swish", gauge: "tick", poll: "rise" };

/** How many shots direct() cuts a beat into when it has no recorded line (round 5: enrich.ts fills each with a mark). */
export function shotsFor(b: Beat, fps = FPS): number {
  const lead = b.kind === "hook" ? LEAD.hook : LEAD.other;
  const ws = guessWords(b.say ?? "", fps);
  const spoken = ws.length ? ws[ws.length - 1].from + ws[ws.length - 1].frames : 0;
  const need = viewsOf(b);
  const len = Math.max(floorOf(b), spoken ? lead + spoken + PAD : 0, need * MIN_SHOT);
  return Math.min(Math.max(1, Math.floor(len / MIN_SHOT)), Math.max(need, Math.ceil(len / MAX_SHOT)));
}

export function direct(c: ReelContent, lines: VoiceLine[] = [], fps = FPS): Storyboard {
  const shots: Shot[] = [];
  const voice: Storyboard["voice"] = [];
  const words: Storyboard["words"] = [];
  let at = 0;
  let lastLook: Look | null = null;
  const hookBeat = c.beats[0];
  const homeLook: Look | null = hookBeat && hookBeat.kind === "hook" ? hookBeat.look : null;
  c.beats.forEach((b, bi) => {
    const line = lines.find((l) => l.cue === b.cue);
    const lead = b.kind === "hook" ? LEAD.hook : LEAD.other;
    const ws = line?.words?.length ? line.words : line ? [] : guessWords(b.say ?? "", fps);
    const spoken = line ? line.frames : ws.length ? ws[ws.length - 1].from + ws[ws.length - 1].frames : 0;
    const need = viewsOf(b);
    let len = Math.max(floorOf(b), spoken ? lead + spoken + PAD : 0, need * MIN_SHOT);
    if (b.kind === "poll") len = Math.max(len, need * MIN_SHOT + LOOP);
    if (line) voice.push({ file: line.file, from: at + lead, frames: line.frames, cue: b.cue });
    for (const w of ws) words.push({ text: w.text, at: (at + lead + w.from) / fps, end: (at + lead + w.from + w.frames) / fps, cue: b.cue });
    const starts = ws.map((w) => at + lead + w.from);
    const cuts = cutBeat(at, at + len, starts, need);
    const marks = marksOf(b);
    const beatLook = lookOfBeat(b);
    // pass 4: the beat's numbered discs, and those already on the map before each shot
    const discIdx = marks.map((m, i) => (m.kind === "marker" ? i : -1)).filter((i) => i >= 0);
    const landed = new Set<number>();
    let focusI = 0;
    // pass 5 (the judge: «راهی بی‌هرمز holds one frame for 6.5 s»): a beat whose story is a long line (a pipeline across a
    // country) with one numbered place at its far end is followed: the line draws from its start as the camera travels
    // with it, its middle, then its end, where the place's disc, its things and its legend row land; then the whole line
    const flw = b.kind === "map" && beatLook && cuts.length >= 3 && discIdx.length === 1 ? followOf(marks, beatLook, cuts.length) : null;
    cuts.forEach((s, k) => {
      const e = k + 1 < cuts.length ? cuts[k + 1] : at + len;
      const view = Math.min(need - 1, Math.floor((k * need) / cuts.length));
      // the marks this shot brings in: shared out over the shots in order
      const m0 = Math.floor((k * marks.length) / cuts.length);
      const m1 = Math.floor(((k + 1) * marks.length) / cuts.length);
      // a long first line: the hook is its first shots (under 2.5 s, the title on screen, the ground marks whole from
      // frame 0); the rest of the line follows on the same map as the event in detail, its other marks coming in one by one
      const tail = b.kind === "hook" && s - at >= HOOK_MAX;
      // the hook's objects too: the thing of the story is on the first frame, and so on the loop's last
      const tailShots = b.kind === "hook" ? cuts.filter((x) => x - at >= HOOK_MAX).length : 0;
      // round 5: a hook whose marks are all ground keeps its names for the second shot, so that shot brings something new
      const namesLate = b.kind === "hook" && tailShots > 0 && marks.every((m) => m.kind === "fill" || m.kind === "hatch" || m.kind === "label" || m.kind === "pins" || m.kind === "object") && marks.some((m) => m.kind === "label");
      const ground = (m: Mark) => m.kind === "fill" || m.kind === "hatch" || (m.kind === "label" && !namesLate) || m.kind === "pins" || m.kind === "object";
      const later = marks.map((m, i) => (ground(m) ? -1 : i)).filter((i) => i >= 0);
      const ti = tail ? cuts.filter((x) => x - at >= HOOK_MAX).indexOf(s) : -1;
      // pass 3: a beat's objects are there from its first shot (a missile still comes on its own shot, with its pin)
      // pass 4 (the judge: «باریک‌ترین جا opens on 1.5 s with nothing new»): a beat's measure is its news, there at once too
      const early = (m: Mark) => (m.kind === "object" && m.move !== "drop" && m.move !== "arc") || m.kind === "measure";
      const firsts0 = marks.map((m, i) => (early(m) ? i : -1)).filter((i) => i >= 0);
      const rest0 = marks.map((m, i) => (early(m) ? -1 : i)).filter((i) => i >= 0);
      // round 5: when the beat has more shots than marks of its own, its other standing things come in one by one
      // (the barrel after the refinery), so every later shot brings something new
      const stage = rest0.length < cuts.length && firsts0.length > 1;
      const firsts1 = stage ? firsts0.slice(0, 1) : firsts0;
      const rest1 = stage ? [...firsts0.slice(1), ...rest0] : rest0;
      // round 8: an incident's disc comes with its things on the first shot, the next disc on the next shot (the burst,
      // the fire and the legend's row land together, never seconds after the burning ship)
      const isDisc = (i: number) => marks[i].kind === "marker";
      const discsIn = rest1.filter(isDisc);
      const firsts2 = discsIn.length && b.kind !== "hook" ? [...firsts1, discsIn[0]] : firsts1;
      // a later disc brings the things that stand by it (the pumpjack with Khurais' disc), in the disc's order
      const ll = (i: number): [number, number] => [(marks[i] as { lon: number }).lon, (marks[i] as { lat: number }).lat];
      const nearestDisc = (i: number) => discsIn.reduce((a, d) => (Math.hypot(ll(d)[0] - ll(i)[0], ll(d)[1] - ll(i)[1]) < Math.hypot(ll(a)[0] - ll(i)[0], ll(a)[1] - ll(i)[1]) ? d : a), discsIn[0]);
      // pass 3: whether it came first or later, a thing by a later disc rides with that disc, never before it
      const paired = [...firsts1, ...rest1].filter((i) => !isDisc(i) && marks[i].kind === "object" && b.kind !== "hook" && discsIn.length > 1 && nearestDisc(i) !== discsIn[0]);
      const firsts = firsts2.filter((i) => !paired.includes(i));
      const rest = discsIn.length && b.kind !== "hook" ? [...discsIn.slice(1).flatMap((d) => [d, ...paired.filter((i) => nearestDisc(i) === d)]), ...rest1.filter((i) => !isDisc(i) && !paired.includes(i))] : rest1;
      const mine = flw
        ? flw.marks[k]
        : b.kind !== "hook"
          ? [...(k === 0 ? firsts : []), ...withPairs(discsAfterFirst(stagger(rest, cuts.length, (i) => marks[i].kind === "callout" || marks[i].kind === "marker"), firsts.some(isDisc), isDisc), new Map(paired.map((i) => [i, nearestDisc(i)])))[k]]
          : !tailShots
            ? (k === 0 ? marks.map((_, i) => i) : [])
            : k === 0
              ? marks.map((m, i) => (ground(m) ? i : -1)).filter((i) => i >= 0)
              : tail
                ? later.slice(Math.floor((ti * later.length) / tailShots), Math.floor(((ti + 1) * later.length) / tailShots))
                : [];
      // pass 4 (the judge: «18–27 s: nine seconds of the same incident frame»): once every disc of a beat is on the map, a
      // shot that brings only a name instead turns to the discs in turn: the camera leans to disc ①, then ②, and their
      // legend rows light in step (Reel.tsx), so each of those shots says again which place is which
      const allIn = discIdx.length >= 2 && discIdx.every((i) => landed.has(i));
      const focus = b.kind === "map" && k > 0 && allIn && mine.every((i) => marks[i].kind === "label" || marks[i].kind === "lane") ? (marks[discIdx[focusI++ % discIdx.length]] as Extract<Mark, { kind: "marker" }>) : null;
      for (const i of mine) landed.add(i);
      // the word this shot is locked to: the first said inside it (or within 6 frames before it)
      const wi = starts.findIndex((w) => w >= s - 6 && w < e);
      const word = wi >= 0 ? ws[wi].text : null;
      const wordAt = wi >= 0 ? starts[wi] / fps : null;
      let look: Look | undefined;
      let camera: Shot["motion"]["camera"] = "hold-breathe";
      if (b.kind === "flags" && lastLook) {
        // a flag stands on its capital: the camera flies to each state in turn (round 2: no row of flags over a dim globe)
        const a3 = b.a3[Math.min(b.a3.length - 1, Math.floor((k * b.a3.length) / cuts.length))];
        const [lon, lat] = CAPITALS[a3] ?? [lastLook.lon, lastLook.lat];
        look = { lon, lat: lat - 6, span: 46, tilt: k % 2 ? 18 : 6, roll: 0 };
        camera = k === 0 ? (isDive(lastLook, look) ? "dive" : "pan") : "pan";
        lastLook = look;
      } else if ((b.kind === "poll" || b.kind === "gauge") && homeLook) {
        // the close goes home: the hook's own map, a little wider, the question over it; the loop then lands on frame 0
        look = k === 0 ? { ...homeLook, span: homeLook.span * 1.25, tilt: 12 } : { ...homeLook, span: homeLook.span * (1.25 - 0.125 * k), tilt: Math.max(0, 12 - 6 * k) };
        camera = k === 0 ? "pull-out" : "push";
        lastLook = look;
      } else if (beatLook && flw) {
        // pass 5: the followed line: its start, its middle, its end, then the whole of it
        const at0 = flw.looks[k];
        look = { ...at0, tilt: 0, roll: 0 };
        camera = k === 0 ? (isDive(lastLook, look) ? "dive" : "pan") : k === cuts.length - 1 && k > flw.end ? "pull-out" : "pan";
        // the discs and things already on the map stay inside the band
        const on = new Set([...landed, ...mine]);
        const discs = marks.flatMap((m, i) => (m.kind === "marker" && on.has(i) ? [[m.lon, m.lat] as [number, number]] : []));
        const things = marks.flatMap((m, i) => (m.kind === "object" && (m.move === undefined || m.move === "stand") && on.has(i) && Math.hypot(m.lon - look!.lon, m.lat - look!.lat) < look!.span * 0.6 ? [[m.lon, m.lat] as [number, number]] : []));
        if (discs.length || things.length) look = fitPoints(look, discs, things, bandBottom(b.legend) - 40, beatLook.span * 1.3);
        lastLook = look;
      } else if (beatLook) {
        if (k === 0) {
          look = { ...beatLook, tilt: beatLook.tilt ?? (bi % 2 ? 14 : 0) };
          camera = bi === 0 ? ((b.kind === "hook" && (b.opening as Shot["motion"]["camera"])) || "push") : isDive(lastLook, beatLook) ? "dive" : "pan";
        } else {
          const prev = shots[shots.length - 1].motion.look ?? beatLook;
          // what the words of this beat stand on keeps the camera: a demand's capital, the end of a road (its cost is
          // written there), else what this shot brings, else the beat's marks
          const own = b.kind === "demand" ? (CAPITALS[b.a3] ?? null) : b.kind === "road" ? endOf(marks) : null;
          const target = own ?? (mine.length ? centreOf(mine.map((i) => marks[i]), prev) : marks.length ? centreOf(marks, prev) : null);
          // round 3 (the judge at 2 fps: «the US hold 13.5–17.5 s»): a beat with a line on it follows the line after its
          // first two shots: out to the line's middle (the whole way in the frame), then to where it lands, then the
          // cycle's pull. The comet is seen arriving, not only leaving.
          // a demand or a road follows from its second shot (its words land with the dive), a map beat from its third
          const from = b.kind === "map" ? 2 : 1;
          const path = (b.kind === "demand" || b.kind === "road" || b.kind === "map") && k >= from ? lineOf(marks) : null;
          const step = path ? (k - from) % 3 : -1;
          if (path && step < 2) {
            const a = path[0];
            const z = path[path.length - 1];
            const far = (geoDistance(a, z) * 180) / Math.PI;
            const [lon, lat] = step === 0 ? (geoInterpolate(a, z)(0.5) as [number, number]) : z;
            look = { lon, lat, span: step === 0 ? Math.min(175, Math.max(beatLook.span * 0.8, far * 1.3)) : Math.max(4, beatLook.span * 0.8), tilt: 0, roll: 0 };
            camera = step === 0 ? "pull-out" : "pan";
          } else {
            const move = MOVES[(k - 1 + bi) % MOVES.length];
            look = moveLook(move, prev, beatLook, target, k);
            // pass 3: a column of ships the line counts («شش نفتکش») is a long thing: the camera does not push in past
            // most of the beat's own frame, so the column stays on open water in view instead of under the header
            if (marks.some((m) => m.kind === "object" && m.move === "sail" && (m.count ?? 1) > 1) && look.span < beatLook.span * 0.85) look = { ...look, span: beatLook.span * 0.85 };
            camera = move === "pull" ? "pull-out" : move === "push" ? "push-close" : "pan";
          }
        }
        // a beat whose words stand on the map (a label, a measure, a demand, a road's cost) is seen flat: a leaning map
        // moved the labels off their points and past the frame's edge (pass D, «میز» 13–29 s). It leans only when no
        // word is on it; its pull then stands in for the lean.
        // pass 3: on a claim beat every claim stays in the frame, whatever move the cycle asked for
        const claims = b.kind === "map" ? claimPoints(marks) : null;
        if (claims && look) look = frameAll(claims, k, beatLook);
        // round 5: the camera never leaves the beat's main thing (a standing object: a refinery, a mine, a ship lying at its point)
        const main = mainObject(marks);
        if (!claims && main && look) look = keepInFrame(look, main);
        // round 7: a share's bar stands over its thing; the camera, not a clamp, keeps the whole bar in the safe frame
        const share = marks.find((m) => m.kind === "share");
        if (!claims && share && share.kind === "share" && look) look = keepInFrame(look, [share.lon, share.lat], shareBounds(share.label));
        const speaks = b.kind === "demand" || b.kind === "road" || b.kind === "chart" || marks.some((m) => m.kind === "callout" || m.kind === "measure" || m.kind === "marker");
        if (speaks && look) look = { ...look, tilt: 0 };
        // pass 4: a shot that turns to a disc leans the camera a third of the way to it, a little closer
        // (from the beat's own frame, not from the cycle's drift: on a claim beat the frame that holds every claim)
        if (focus && look) {
          const from0 = claims ? frameAll(claims, 0, beatLook) : { ...look, lon: beatLook.lon, lat: beatLook.lat, span: Math.min(look.span, beatLook.span * 1.1) };
          look = { ...from0, lon: from0.lon + (focus.lon - from0.lon) * 0.4, lat: from0.lat + (focus.lat - from0.lat) * 0.4, span: from0.span * 0.92, tilt: 0 };
          // the beat's main thing stays in the frame as the camera turns (round 5)
          if (!claims && main) look = keepInFrame(look, main);
        }
        // round 8: every numbered place and every thing standing at one stays inside the map band (under the header,
        // over the legend), on every shot of its beat, whatever move the cycle asked for
        if (look && (b.kind === "map" || b.kind === "hook")) {
          const discs = marks.filter((m) => m.kind === "marker").map((m) => [(m as { lon: number }).lon, (m as { lat: number }).lat] as [number, number]);
          const things0 = discs.length || (b.legend ?? []).length ? marks.filter((m) => m.kind === "object" && (m.move === undefined || m.move === "stand" || m.move === "approach")).map((m) => [(m as { lon: number }).lon, (m as { lat: number }).lat] as [number, number]) : [];
          // pass 4: a shot turned to a disc keeps that disc's own things whole in the band; the others may pass its edge
          const things = focus ? things0.filter((p) => Math.hypot(p[0] - focus.lon, p[1] - focus.lat) < (beatLook?.span ?? look.span) * 0.2) : things0;
          // the camera never pulls out past 1.3 of the beat's span here: a disc keeps its coast clearance (legend.ts clearKm)
          if (discs.length || things.length) {
            // a disc at sea keeps the coast clearance measured on the beat's widest shot; on land only the band counts
            const atSea = marks.some((m) => m.kind === "marker" && (m as { sea?: boolean }).sea);
            look = fitPoints({ ...look, span: Math.min(look.span, beatLook ? beatLook.span * (atSea ? 1.1 : 1.6) : look.span) }, discs, things, bandBottom(b.legend) - 40, beatLook && atSea ? beatLook.span * WIDE : Infinity);
          }
        }
        lastLook = look;
      } else if (lastLook) {
        // a picture over the map: the map steps back to the region and drifts, so it stays alive and quiet behind
        const back = { ...lastLook, span: Math.max(lastLook.span * 1.6, 18), tilt: 0 };
        look = { ...back, lon: back.lon + (back.span > 100 ? 14 * (k + 1) : (k % 2 ? -1 : 1) * back.span * 0.12 * (k + 1)) };
        camera = k === 0 ? "pull-out" : "pan";
      } else camera = b.kind === "chart" ? "pen" : "push";
      const layer: Shot["picture"]["layer"] = b.kind === "hook" || b.kind === "map" || b.kind === "demand" ? "map" : b.kind;
      const next = c.beats[bi + 1];
      const last = k === cuts.length - 1;
      const tOut: Transition = !last ? "push" : !next ? "loop" : lookOfBeat(next) ? (isDive(lastLook, lookOfBeat(next)!) ? "dive" : "push") : layer === "map" ? "slide" : "pop";
      shots.push({
        n: shots.length + 1,
        start: s / fps,
        dur: (e - s) / fps,
        beat: bi,
        at_word: word,
        word_at: wordAt,
        picture: { layer, asset: assetOf(b), beat: bi, view: String(view) },
        motion: { camera, ...(look ? { look } : {}), ...(focus ? { focus: focus.n } : {}), ...(flw ? { follow: Math.round(cuts[Math.min(flw.end, cuts.length - 1)] - s) } : {}), ...(bi === 0 && k === 0 && hookFrom(b) ? { from: hookFrom(b)! } : {}), object: mine.map((i) => ({ id: `${b.kind}-${bi}-mark-${i}`, do: marks[i].kind === "fill" ? "fill" : marks[i].kind === "pins" ? "pop" : marks[i].kind === "object" ? `${(marks[i] as { move?: string }).move ?? "stand"} ${(marks[i] as { id: string }).id}` : "draw", ...(word ? { at_word: word } : {}) })) },
        // pass 5: the hook's title stays on through the whole first beat, its detail shots too
        // (until 3 s at most: checks.ts hook-short, the hook gives way within 3 s)
        text: tail ? (e / fps <= 3.0 ? { ...textOf(b, view, k), caption_keyword: word ?? undefined } : { chips: [], caption_keyword: word ?? undefined }) : textOf(b, view, k),
        sound: k === 0 || mine.length ? { sfx: k === 0 ? SFX_OF[b.kind] : "pop", ...(word ? { at_word: word } : {}), ...(bi === 0 && k === 0 ? { music: "bed-in" } : {}) } : {},
        transition_out: tOut,
        meaning: tail ? `the event in detail, on the hook's map${mine.length ? ` (${mine.map((i) => marks[i].kind).join(", ")})` : ""}` : meaningOf(b, view, mine.map((i) => marks[i])),
        marks: mine,
        view,
      });
    });
    at += len;
  });
  return {
    video_id: c.video_id,
    project: "divan",
    template: c.template,
    idea_family: c.concept.idea_family,
    concept: c.concept,
    fps,
    total: at,
    voice,
    words,
    shots,
    checks: { max_static_s: 2.0, max_words_on_screen: 12, max_words_per_shot: 8, sync_tolerance_s: 0.2, end_after_last_word_s: 1.6 },
  };
}

/** A point a share t (0…1) of the way along a polyline, by length. */
function alongPath(path: [number, number][], t: number): [number, number] {
  const seg = path.slice(1).map((p, i) => geoDistance(path[i], p));
  const total = seg.reduce((a, x) => a + x, 0);
  let left = t * total;
  for (let i = 0; i < seg.length; i += 1) {
    if (left <= seg[i] || i === seg.length - 1) return geoInterpolate(path[i], path[i + 1])(seg[i] ? Math.min(1, left / seg[i]) : 0) as [number, number];
    left -= seg[i];
  }
  return path[path.length - 1];
}
/**
 * Pass 5: how a beat follows its line, when it has one: a pipeline longer than half the beat's frame with its one disc
 * at its far end. Marks: the line and what stands at its start on the first shot; the disc and what stands by it on
 * the end shot (the third); the names round the shots between and after. Looks: the start, the middle, the end (each at
 * about half the beat's span), then the beat's whole frame.
 */
export function followOf(marks: Mark[], beat: Look, n: number): { marks: number[][]; looks: Look[]; end: number } | null {
  const li = marks.findIndex((m) => m.kind === "object" && m.move === "pipe" && Boolean(m.path) && m.path!.length >= 2);
  if (li < 0) return null;
  const path = (marks[li] as Extract<Mark, { kind: "object" }>).path!;
  const a = path[0];
  const z = path[path.length - 1];
  const long = (geoDistance(a, z) * 180) / Math.PI;
  if (long < beat.span * 0.5) return null;
  const disc = marks.find((m) => m.kind === "marker") as Extract<Mark, { kind: "marker" }> | undefined;
  if (!disc || Math.hypot(disc.lon - z[0], disc.lat - z[1]) > long * 0.2) return null;
  const end = Math.min(2, n - 1);
  const near = (m: Mark, p: [number, number]) => "lon" in m && Math.hypot((m as { lon: number }).lon - p[0], (m as { lat: number }).lat - p[1]) < long * 0.2;
  const out: number[][] = Array.from({ length: n }, () => []);
  const names: number[] = [];
  marks.forEach((m, i) => {
    if (i === li) out[0].push(i);
    else if (m.kind === "label") names.push(i);
    else if (m.kind === "marker" || (m.kind === "object" && near(m, z))) out[end].push(i);
    else out[0].push(i);
  });
  const half = Math.max(beat.span * 0.55, long * 0.45);
  const looks: Look[] = Array.from({ length: n }, (_, k) => {
    if (k > end) return { ...beat };
    const [lon, lat] = alongPath(path, k === 0 ? 0.14 : k === end ? 0.86 : 0.5);
    return { lon, lat, span: half };
  });
  // each name on the shot between or after the end whose frame it is in (a name off every frame waits for the last)
  const free = out.map((x, k) => (k === 0 || k === end ? -1 : k)).filter((k) => k >= 0);
  for (const i of names) {
    const m = marks[i] as Extract<Mark, { kind: "label" }>;
    const fit = free.filter((k) => Math.abs(m.lon - looks[k].lon) < looks[k].span * 0.4 && Math.abs(m.lat - looks[k].lat) < looks[k].span * 0.5);
    out[fit.length ? fit.reduce((a2, k) => (out[k].length < out[a2].length ? k : a2), fit[0]) : n - 1].push(i);
  }
  return { marks: out, looks, end };
}

function assetOf(b: Beat): string {
  switch (b.kind) {
    case "hook":
    case "map":
      return `map:${b.look.lon.toFixed(1)},${b.look.lat.toFixed(1)}@${b.look.span}`;
    case "demand":
      return `map+flag:${b.a3}`;
    case "road":
      return `object:${b.road.object}`;
    case "chart":
      return "chart:pen";
    case "number":
      return "number:pen";
    case "flags":
      return `flags:${b.a3.join(",")}`;
    case "gauge":
      return "gauge:divan";
    case "poll":
      return "poll:roads";
  }
}

/** What a shot writes, by its beat and view: never more than eight words a shot. */
export function textOf(b: Beat, view: number, k: number): Shot["text"] {
  switch (b.kind) {
    case "hook":
      return { header: b.title, sub: b.sub, chips: [], caption_keyword: b.title.split(/\s+/)[0] };
    case "map":
      return { header: b.caption, chips: [], source: b.source };
    case "chart":
      return { header: b.chart.title, chips: [], source: view >= 1 ? b.chart.source : undefined };
    case "number":
      return { header: b.big, sub: view >= 1 ? b.unit : undefined, chips: view >= 1 ? [b.text] : [], source: view >= 2 ? b.source : undefined };
    case "flags":
      return { header: b.title, chips: [] };
    case "demand":
      // the demand is written once, in its own card (Reel.tsx DemandPic): the header stays empty
      return { header: undefined, sub: view >= 1 ? b.wants : undefined, chips: [], source: view >= 2 ? b.source : undefined };
    case "road":
      return { header: b.road.title, sub: view >= 1 ? b.road.cost : undefined, chips: [b.road.key], source: view >= 2 ? b.road.source : undefined };
    case "gauge":
      return { header: b.label, chips: b.ends.slice() };
    case "poll":
      return { header: b.q, chips: view >= 1 ? b.options.map((o) => o.key) : [], source: view >= 2 ? b.site : undefined, sub: view >= 2 ? b.chip : undefined };
  }
  void k;
}

function meaningOf(b: Beat, view: number, marks: Mark[]): string {
  const what = marks.map((m) => (m.kind === "callout" ? `callout «${m.bold}»` : m.kind === "fill" ? `fill ${m.a3}` : m.kind === "object" ? `${m.id} (${m.move ?? "stand"})` : m.kind)).join(", ");
  switch (b.kind) {
    case "hook":
      return `the hook: the event on the map from frame 0${what ? ` (${what})` : ""}`;
    case "map":
      return what ? `the map shows ${what}` : "the camera moves to what the narrator names";
    case "chart":
      return view ? "today's value under the pen, with its source" : "the pen draws the line from the oldest day (left) to today (right)";
    case "number":
      return ["the figure comes in big", "what the figure means", "where the figure comes from"][view];
    case "flags":
      return "the states at the table, as their flags (no faces)";
    case "demand":
      return [`a dive to ${b.a3}, its flag`, `what ${b.a3} wants, in its own colour`, "the source of that demand"][view];
    case "road":
      return [`road ${b.road.key}: its object (${b.road.object}) in its colour`, `road ${b.road.key}: its likely cost (Divan's analysis)`, `road ${b.road.key}: the source it rests on`][view];
    case "gauge":
      return "Divan's estimate of each road on one bar";
    case "poll":
      return ["the question to the viewer", "the roads as choices", "where to answer, then back to the first frame"][view];
  }
}

export { wordsIn };
