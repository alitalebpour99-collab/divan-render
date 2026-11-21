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
import { guessWords, FPS } from "./director";
import type { Beat, Mark, ReelContent } from "./types";
import { withObjects } from "./topics";

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
  const used = have.flatMap(anchors);
  const near = (p: [number, number]) => used.some((q) => deg(p, q) < look.span * 0.12);
  if (want > 0 && !have.some((m) => m.kind === "comet" || m.kind === "dashed")) {
    const lane = LANES.find((l) => l.path.filter((p) => inView(look, p, 0.6)).length >= 2);
    if (lane) {
      const pts = lane.path.filter((p) => inView(look, p, 0.9));
      if (pts.length >= 2) out.push({ kind: "comet", coords: pts, color: "#ffd88a" });
    }
  }
  const places = Object.values(PLACES_FA)
    .map((p) => ({ ...p, at: [p.lon, p.lat] as [number, number] }))
    .filter((p) => inView(look, p.at, 0.4) && !near(p.at) && !have.some((m) => m.kind === "label" && m.t === p.t))
    .sort((a, b) => deg(a.at, [look.lon, look.lat]) - deg(b.at, [look.lon, look.lat]));
  for (const p of places) {
    if (out.length >= want) break;
    if (out.some((m) => m.kind === "label" && deg([m.lon, m.lat], p.at) < look.span * 0.15)) continue;
    out.push({ kind: "label", t: p.t, lon: p.lon, lat: p.lat });
  }
  return out.slice(0, Math.max(0, want));
}

/** The content with every map beat brought up to a mark per 1.5 s from the ground in view. */
export function enrich(content: ReelContent): ReelContent {
  // the topic's own objects first (a tanker, a missile, a rig …; owner, 21 Nov 2026): the ground only fills what is left
  const c = withObjects(content);
  const beats = c.beats.map((b): Beat => {
    if (b.kind !== "map") return b;
    const short = marksWanted(b) - b.marks.filter(counts).length;
    if (short <= 0) return b;
    const extra = groundFor(b.look, b.marks, short);
    // the news first, as the narrator says it; the ground fills the beat's later shots
    return extra.length ? { ...b, marks: [...b.marks, ...extra] } : b;
  });
  return { ...c, beats };
}

void FPS;
