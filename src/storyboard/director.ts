// The director: from a Reel's content and the narrator's words to its storyboard (storyboard-fa.md §1 step 5).
// Pure (no React): the site and the renderer both run it. Every beat lasts as long as its line is said; it is cut
// into shots of 1 to 2 seconds, each cut made on a word the narrator says, so a picture changes when a word lands.
// Each shot says what it shows, how it moves, what it writes, what it sounds like, how it leaves, and why it is there.
import { geoDistance, geoInterpolate } from "d3-geo";
import type { Look } from "../map-engine/camera";
import { CAPITALS } from "../map-engine/capitals";
import { PLACES_FA } from "../map-engine/names";
import { country } from "../map-engine/world";

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
/** The least a beat lasts without a narrator, in frames. */
const floorOf = (b: Beat) => (b.kind === "hook" ? 45 : b.kind === "chart" ? 105 : b.kind === "poll" ? 3 * 32 + LOOP : viewsOf(b) * 40);

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
      const ground = (m: Mark) => m.kind === "fill" || m.kind === "hatch" || m.kind === "label" || m.kind === "pins" || m.kind === "object";
      const tailShots = b.kind === "hook" ? cuts.filter((x) => x - at >= HOOK_MAX).length : 0;
      const later = marks.map((m, i) => (ground(m) ? -1 : i)).filter((i) => i >= 0);
      const ti = tail ? cuts.filter((x) => x - at >= HOOK_MAX).indexOf(s) : -1;
      // pass 3: a beat's objects are there from its first shot (a missile still comes on its own shot, with its pin)
      const early = (m: Mark) => m.kind === "object" && m.move !== "drop" && m.move !== "arc";
      const firsts = marks.map((m, i) => (early(m) ? i : -1)).filter((i) => i >= 0);
      const rest = marks.map((m, i) => (early(m) ? -1 : i)).filter((i) => i >= 0);
      const mine =
        b.kind !== "hook"
          ? [...(k === 0 ? firsts : []), ...rest.slice(Math.floor((k * rest.length) / cuts.length), Math.floor(((k + 1) * rest.length) / cuts.length))]
          : !tailShots
            ? (k === 0 ? marks.map((_, i) => i) : [])
            : k === 0
              ? marks.map((m, i) => (ground(m) ? i : -1)).filter((i) => i >= 0)
              : tail
                ? later.slice(Math.floor((ti * later.length) / tailShots), Math.floor(((ti + 1) * later.length) / tailShots))
                : [];
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
            camera = move === "pull" ? "pull-out" : move === "push" ? "push-close" : "pan";
          }
        }
        // a beat whose words stand on the map (a label, a measure, a demand, a road's cost) is seen flat: a leaning map
        // moved the labels off their points and past the frame's edge (pass D, «میز» 13–29 s). It leans only when no
        // word is on it; its pull then stands in for the lean.
        const speaks = b.kind === "demand" || b.kind === "road" || b.kind === "chart" || marks.some((m) => m.kind === "callout" || m.kind === "measure");
        if (speaks && look) look = { ...look, tilt: 0 };
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
        motion: { camera, ...(look ? { look } : {}), ...(bi === 0 && k === 0 && hookFrom(b) ? { from: hookFrom(b)! } : {}), object: mine.map((i) => ({ id: `${b.kind}-${bi}-mark-${i}`, do: marks[i].kind === "fill" ? "fill" : marks[i].kind === "pins" ? "pop" : marks[i].kind === "object" ? `${(marks[i] as { move?: string }).move ?? "stand"} ${(marks[i] as { id: string }).id}` : "draw", ...(word ? { at_word: word } : {}) })) },
        text: tail ? { chips: [], caption_keyword: word ?? undefined } : textOf(b, view, k),
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
