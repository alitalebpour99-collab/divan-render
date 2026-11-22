// Content density (round 3, 21 Nov 2026; the judge, every round: «hold the same frame with one comet»): a map beat
// should bring something new about every 1.5 s of its line. The writer is asked for that (lib/agents/maps.ts); what
// it leaves short is filled here from Divan's own geography, never from the news: the shipping lane in view as a
// traced route, then the names of the ports, cities and seas in view, one by one. No incident, no figure, no claim
// is ever added: a pin, a callout or a zone only comes from the writer, who has the reports.
// Pure and idempotent: the site runs it on a draft, the renderer again on what it draws (Root.tsx).
import { geoDistance } from "d3-geo";
import { LANES } from "../map-engine/lanes";
import { PLACES_FA } from "../map-engine/names";
import type { Look } from "../map-engine/camera";
import { guessWords, FPS, shotsFor } from "./director";
import type { Beat, Mark, ReelContent } from "./types";
import { withObjects } from "./topics";
import { isShip } from "../map-engine/object-ids";
import { legendize } from "./legend";

/** A new picture every 45 frames (1.5 s). */
export const MARK_EVERY = 45;

const deg = (a: [number, number], b: [number, number]) => (geoDistance(a, b) * 180) / Math.PI;
const inView = (look: Look, p: [number, number], share = 0.42) => deg([look.lon, look.lat], p) < look.span * share;
/** what a mark brings that the eye counts as new (a fill is ground, not news) */
const counts = (m: Mark) => m.kind !== "fill";
const anchors = (m: Mark): [number, number][] =>
  m.kind === "object" ? [[m.lon, m.lat], ...(m.path ?? [])] : m.kind === "callout" || m.kind === "label" || m.kind === "flag" ? [[m.lon, m.lat]] : m.kind === "pins" ? m.points.map((p) => [p.lon, p.lat] as [number, number]) : m.kind === "measure" ? [m.a, m.b] : m.kind === "comet" || m.kind === "dashed" || m.kind === "claim" ? [m.coords[0], m.coords[m.coords.length - 1]] : [];

/** How many marks a beat's line asks for: one per 1.5 s it is said (at least one). */
export function marksWanted(b: Beat): number {
  const ws = guessWords(b.say ?? "");
  const frames = ws.length ? ws[ws.length - 1].from + ws[ws.length - 1].frames : 0;
  return Math.max(1, Math.round(frames / MARK_EVERY));
}

/** The marks a map beat is short of, from the ground in view: the lane, then the places by nearness to the centre. */
export function groundFor(look: Look, have: Mark[], want: number): Mark[] {
  const out: Mark[] = [];
  // round 5: a name may stand beside a pipeline or a lane; only the points of things keep the names off
  const used = have.flatMap((m) => (m.kind === "object" ? [[m.lon, m.lat] as [number, number]] : anchors(m)));
  const near = (p: [number, number]) => used.some((q) => deg(p, q) < look.span * 0.08);
  // round 7 (owner: «هیچ تزئینی بدون دلیل داستانی»): the lane is drawn only where a ship of the story sails or lies on it
  const shipping = have.some((m) => m.kind === "object" && isShip(m.id));
  if (want > 0 && shipping && !have.some((m) => m.kind === "comet" || m.kind === "dashed" || m.kind === "lane")) {
    const lane = LANES.find((l) => l.path.filter((p) => inView(look, p, 0.6)).length >= 2);
    if (lane) {
      const pts = lane.path.filter((p) => inView(look, p, 0.9));
      // traffic on the lane, not a story: it loops, so the camera never follows it away from the beat (round 4)
      if (pts.length >= 2) out.push({ kind: "comet", coords: pts, color: "#ffd88a", loop: true });
    }
  }
  const places = Object.values(PLACES_FA)
    .map((p) => ({ ...p, at: [p.lon, p.lat] as [number, number] }))
    .filter((p) => inView(look, p.at, 0.4) && !near(p.at) && !have.some((m) => m.kind === "label" && m.t === p.t))
    .sort((a, b) => deg(a.at, [look.lon, look.lat]) - deg(b.at, [look.lon, look.lat]));
  for (const p of places) {
    if (out.length >= want) break;
    if (out.some((m) => m.kind === "label" && deg([m.lon, m.lat], p.at) < look.span * 0.1)) continue;
    out.push({ kind: "label", t: p.t, lon: p.lon, lat: p.lat });
  }
  return out.slice(0, Math.max(0, want));
}

/** The content with every map beat brought up to a mark per 1.5 s from the ground in view. */
export function enrich(content: ReelContent): ReelContent {
  // round 8: the content was already brought to numbered discs and a legend (a second pass changes nothing)
  if (content.legend) return content;
  // the topic's own objects first (a tanker, a missile, a rig …; owner, 21 Nov 2026): the ground only fills what is left
  const c = withObjects(sourcedZones(content));
  const norm = (s: string | undefined) => String(s ?? "").replace(/[\s،,٫.«»:]/g, "");
  const beats = c.beats.map((b00): Beat => {
    if (b00.kind !== "map") return b00;
    const b0 = withShare(b00);
    // pass 3: a callout that only repeats the beat's headline goes (the header already says it, in bigger letters)
    const dup = (m: Mark) => m.kind === "callout" && norm(b0.caption) !== "" && norm(m.bold) === norm(b0.caption);
    const b = b0.marks.some(dup) ? { ...b0, marks: b0.marks.filter((m) => !dup(m)) } : b0;
    // round 5: every later shot brings something new: as many marks that come in on their own as the beat has shots
    // (an object that stands comes with the first shot, so it does not count)
    const own = (m: Mark) => counts(m) && m.kind !== "hatch" && !(m.kind === "object" && m.move !== "drop" && m.move !== "arc");
    const short = Math.max(marksWanted(b), shotsOf(b)) - b.marks.filter(own).length;
    if (short <= 0) return b;
    const extra = groundFor(b.look, b.marks, short);
    // the news first, as the narrator says it; the ground fills the beat's later shots
    return extra.length ? { ...b, marks: [...b.marks, ...extra] } : b;
  });
  // round 8 (owner): last, the callouts become numbered discs and a legend; the lanes the real ones; strikes impact points
  const done = legendize({ ...c, beats: strikeInHook(beats) });
  return {
    ...done,
    beats: done.beats.map((b): Beat => {
      if (b.kind !== "map") return b;
      const own = (m: Mark) => counts(m) && m.kind !== "hatch" && m.kind !== "lane" && !(m.kind === "object" && m.move !== "drop" && m.move !== "arc");
      const short = Math.max(marksWanted(b), shotsOf(b)) - b.marks.filter(own).length;
      const extra = short > 0 ? groundFor(b.look, b.marks, short).filter((m) => m.kind === "label") : [];
      return extra.length ? { ...b, marks: [...b.marks, ...extra] } : b;
    }),
  };
}

/** About how many shots the director cuts a beat into (director.ts: shots of 1 to 2 s over its line). */
export function shotsOf(b: Beat): number {
  return shotsFor(b);
}

/**
 * Round 5 (the judge: «the hook shows the refinery, not the strike»): a hook whose thing stands where the story's strike
 * lands shows the strike on its first shot: the drone or missile coming down, the thing burning, the place's name.
 */
function strikeInHook(beats: Beat[]): Beat[] {
  const h = beats[0];
  if (!h || h.kind !== "hook") return beats;
  const marks = h.marks ?? [];
  if (marks.some((m) => m.kind === "object" && (m.move === "drop" || m.move === "arc"))) return beats;
  const thing = marks.findIndex((m) => m.kind === "object" && (m.move === undefined || m.move === "stand"));
  if (thing < 0) return beats;
  const o = marks[thing] as Extract<Mark, { kind: "object" }>;
  for (const b of beats.slice(1)) {
    if (b.kind !== "map") continue;
    const strike = b.marks.find((m) => m.kind === "object" && (m.move === "drop" || m.move === "arc") && Math.hypot(m.lon - o.lon, m.lat - o.lat) < 0.5);
    if (!strike) continue;

    const name = b.marks.find((m) => m.kind === "callout" && Math.hypot(m.lon - o.lon, m.lat - o.lat) < 0.5);
    const next = [...marks];
    // it burns as the strike lands (Reel.tsx times the fire from the strike), with no further wait
    next[thing] = { ...o, fire: 0 };
    next.splice(thing + 1, 0, strike);
    if (name && name.kind === "callout" && !marks.some((m) => m.kind === "label" && m.t === name.bold)) next.push({ kind: "label", t: name.bold, lon: name.lon, lat: name.lat + 0.12 });
    return [{ ...h, marks: next }, ...beats.slice(1)];
  }
  return beats;
}

void FPS;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const SHARES: [RegExp, number][] = [
  [/نیمی|نصف/, 0.5],
  [/یک[\s‌]?سوم/, 1 / 3],
  [/دو[\s‌]?سوم/, 2 / 3],
  [/یک[\s‌]?چهارم|ربع/, 0.25],
  [/سه[\s‌]?چهارم/, 0.75],
];
/**
 * A share the line says (round 6, the judge: «the ۵٫۷ beat has no figure on the map»): «حدود نیمی از تولید نفت عربستان»,
 * «یک‌سوم صادرات», «۳۰ درصد از …». Its words and its value come from the line only; nothing is computed or invented.
 */
export function shareOf(say: string): { share: number; label: string } | null {
  const m = /((?:حدود|تقریباً|نزدیک به)\s+)?(نیمی|نصف|یک[\s‌]?سوم|دو[\s‌]?سوم|یک[\s‌]?چهارم|سه[\s‌]?چهارم|ربع|[0-9۰-۹]+(?:[٫.][0-9۰-۹]+)?\s*درصد)\s+از\s+[^.،؛!?؟]+/.exec(say);
  if (!m) return null;
  const word = m[2];
  let share = SHARES.find(([re]) => re.test(word))?.[1];
  if (share === undefined) {
    const n = Number(word.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace("٫", ".").replace(/[^0-9.]/g, ""));
    if (!(n > 0 && n <= 100)) return null;
    share = n / 100;
  }
  return { share, label: m[0].trim() };
}
function withShare(b: Extract<Beat, { kind: "map" }>): Extract<Beat, { kind: "map" }> {
  if (b.marks.some((m) => m.kind === "share")) return b;
  const s = shareOf(b.say ?? "");
  const o = b.marks.find((m) => m.kind === "object" && (m.move === undefined || m.move === "stand"));
  if (!s || !o || o.kind !== "object") return b;
  return { ...b, marks: [...b.marks, { kind: "share", lon: o.lon, lat: o.lat, share: s.share, label: s.label }] };
}

/**
 * Round 7 (owner: «منطقهٔ هاشور خطر فقط از دادهٔ واقعی»): a hatched area of sea is drawn only when its outline comes from a
 * source that draws it (an official advisory area of UKMTO or JMIC, an incident's exact area). A polygon with no such
 * source is a made-up outline: it goes, and the beat keeps its points (pins) and words. A state's own ground (a3) stays.
 */
export function sourcedZones(c: ReelContent): ReelContent {
  const ok = (m: Mark) => m.kind !== "hatch" || Boolean(m.a3) || Boolean(m.source && m.source.ref);
  return { ...c, beats: c.beats.map((b) => (b.kind === "hook" || b.kind === "map" || b.kind === "demand" || b.kind === "road" ? ((b.marks ?? []).every(ok) ? b : ({ ...b, marks: (b.marks ?? []).filter(ok) } as Beat)) : b)) };
}
