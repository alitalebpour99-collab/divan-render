// The one style of Divan (bible v3): the navy room of «تصمیم امروز», drawn from a storyboard (director.ts). The map is
// the anchor: it is on the stage from frame 0 with the event on it, the camera dives and pans as the narrator names
// places, and the other pictures (the pen chart, a road's object, a big figure, the gauge, the poll) come over it
// while the map breathes behind. A picture changes every 1 to 2 seconds, on a word. The last frames bring the first
// picture back, so the Reel loops. Every word comes from the content (types.ts); nothing is typed here.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { geoContains, geoDistance, geoInterpolate } from "d3-geo";
import { measureLabelBox, placeCallouts } from "../map-engine/layers";
import { carry, textWidth } from "../map-engine/labels";
import { mix } from "../map-engine/contrast";
import { worldFor } from "../map-engine/world";
import { densify, useView, ContextNames, pickNames, placeLabel, NAMES_FA, PLACES_FA, nameFa, CAPITALS, CometTrail, CountryFill, Callouts, LaneLine, WaterMask, ClaimLine, DashedLine, FlagChip, LANES, MapStage, MeasureLine, PinCluster, PlaceLabels, RegionHatch, DIVAN, country, lookAt, makeView, faNum, type Key, type Look, type CalloutSpec } from "../map-engine";
import { VAZIR } from "../map-engine/fonts";
import { LOOP, mainObject, shareWidth, arriveOf, TRAVEL } from "./director";
import { RoadObject } from "./objects";
import { MapObject, ObjectDefs, objectBox, objectPoint, columnOf, sailAt, COLUMN_MAX, wetK, artScale, FLOATING, clearOfPanels, shipPose, type Pose } from "../map-engine/objects";
import { kmAlong, kmPerFrame, pointAt, wayOf } from "../map-engine/ships";
import { landOn, landAt, boxOnWater } from "../map-engine/water";
import { MapMarker, Disc } from "../map-engine/markers";
import { legendLayout, legendBox, LEGEND, LEGEND_SOURCE_TOP, MARKER_R, type LegendItem } from "./legend";
const LEGEND_PAD = LEGEND.pad;
const LEGEND_GAP = LEGEND.gap;
import { SeaDetail, ScaleAndNorth, scaleGeom } from "../map-engine/detail";
import { SEA_PLACES_FA } from "../map-engine/names";
import type { Beat, ChartSpec, Mark, ReelContent, Shot, Storyboard } from "./types";

export const ROOM = { bg: "#1a2330", bg2: "#202b3a", edge: "#151d28", panel: "rgba(30,41,58,0.94)", line: "#34445a", paper: "#f3efe6", mute: "#a3afbd", amber: "#ffb020", hit: "#ff4d40" };
const L = 64;
const R = 884;
const COLW = R - L;
/**
 * the map's frame: the whole screen (round 2, 21 Nov 2026: the map is the picture, as in @atlynxmaps, not a panel
 * between a header and a caption); a scrim at the top and the bottom keeps the words on it legible
 */
const STAGE = { x: 0, y: 0, w: 1080, h: 1920 };
/** where labels on the map may go: under the header, above the source line and the caption */
const SAFE = { x: L, y: 560, w: COLW, h: 840 };
/** the one source line of a shot: one short line, always in the same place (round 2: «one source line») */
const SOURCE_TOP = 1414;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const rise = (f: number, at: number, dur = 10) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease });
export const faDigits = (s: string) => String(s).replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[Number(x)]);

type Props = ReelContent & { storyboard: Storyboard; music?: string };

const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.4 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** The camera's keys from the shots: a dive takes 1.5 s, a push the whole shot; the last frames fly back to the first look. */
function cameraKeys(sb: Storyboard): Key[] {
  const keys: Key[] = [];
  let prev: Look | null = null;
  for (const s of sb.shots) {
    const look = s.motion.look;
    if (!look) continue;
    const a = Math.round(s.start * sb.fps);
    const len = Math.round(s.dur * sb.fps);
    if (!prev) {
      const hook = s.motion.from;
      // with no opening of its own the hook dives: from 2.4 times wider and leaning back, so frame 0 already moves
      keys.push({ at: 0, ...(hook ?? (s.motion.camera === "push-close" ? { ...look, span: look.span * 0.55 } : { ...look, span: Math.min(175, look.span * 2.4), lon: look.lon - look.span * 0.3, tilt: 22 })) });
      keys.push({ at: a + len, ...look });
    } else {
      // pass 4: into a new beat the camera whips (its header and marks land as it arrives); inside a beat it glides
      const into = sb.shots.find((z) => z.beat === s.beat) === s && s.beat > 0;
      // pass 5: along a followed line the camera glides the whole shot, with the line as it draws
      const travel = s.motion.follow !== undefined && !into ? len : s.motion.camera === "dive" ? Math.min(len, into ? TRAVEL.dive : 40) : Math.min(len, into ? TRAVEL.pan : 22);
      if (keys[keys.length - 1].at < a) keys.push({ at: a, ...prev });
      keys.push({ at: a + travel, ...look, ease: "inOut" });
      // after the move the camera keeps creeping the same way (a tenth further), so the frame is never still
      if (travel < len) keys.push({ at: a + len, ...look, span: look.span * 0.94, ease: "linear" });
    }
    prev = look;
  }
  // the loop: hold the last look, then fly back to the first in the last frames (the frame number goes last: a key's own «at» must not win)
  // round 3C: home in 20 frames, then the last frames are the first frame itself (the judge: «end on the exact 0 s frame»)
  if (keys.length) keys.push({ ...keys[keys.length - 1], at: sb.total - LOOP }, { ...keys[0], at: sb.total - LOOP + 20 }, { ...keys[0], at: sb.total - 1 });
  return keys.filter((k, i, all) => i === 0 || k.at > all[i - 1].at);
}

/** round 6: where a share's bar stands: above its thing, inside the safe frame */
const shareBox = (v: { at: (lon: number, lat: number) => [number, number] | null }, m: { lon: number; lat: number; label: string }) => {
  const at = v.at(m.lon, m.lat);
  if (!at) return null;
  // round 7: as wide as its words, always right over its thing (the camera keeps it in the frame: director.ts shareBounds)
  const w = shareWidth(m.label);
  const h = 128;
  return { x: at[0] - w / 2, y: at[1] - 190 - h, w, h };
};
/**
 * A share the line says, as a bar over its thing (round 6): the line's own words above, the bar filling to the share,
 * Iran's amber on a dark track, a short leader to the thing. The value is the line's (enrich.ts shareOf), never computed.
 */
const ShareBar: React.FC<{ m: Extract<Mark, { kind: "share" }>; t: number }> = ({ m, t }) => {
  const v = useView();
  const b = shareBox(v, m);
  const at = v.at(m.lon, m.lat);
  if (!b || !at || t < 0) return null;
  const k = interpolate(t, [0, 8], [0, 1], clamp);
  const fill = interpolate(t, [6, 30], [0, m.share], { ...clamp, easing: Easing.out(Easing.cubic) });
  const halo = { paintOrder: "stroke" as const, stroke: DIVAN.halo, strokeWidth: 7, strokeLinejoin: "round" as const };
  const barY = b.y + 66;
  return (
    <g opacity={k}>
      <path d={`M${b.x + b.w / 2} ${b.y + b.h} L${at[0]} ${at[1] - 60}`} stroke={DIVAN.ink} strokeWidth={2.5} opacity={0.7} />
      <text x={b.x + b.w} y={b.y + 44} textAnchor="start" direction="rtl" fill={DIVAN.ink} fontFamily={VAZIR} fontWeight={800} fontSize={40} style={halo}>
        {m.label}
      </text>
      <rect x={b.x} y={barY} width={b.w} height={34} rx={17} fill={DIVAN.halo} stroke={DIVAN.ink} strokeWidth={2} opacity={0.92} />
      {/* right to left, as the page reads */}
      <rect x={b.x + b.w * (1 - fill)} y={barY} width={b.w * fill} height={34} rx={17} fill={m.color ?? DIVAN.accent} />
    </g>
  );
};

/** round 5: the look a beat's callouts are placed on: its last shot's, where all its marks are in */
const refLookOf = (sb: Storyboard, beat: number): Look | undefined => {
  const own = sb.shots.filter((s) => s.beat === beat && s.motion.look);
  return own.length ? (own[own.length - 1].motion.look as Look) : undefined;
};

const clockKey = (m: Extract<Mark, { kind: "object" }>) => (m.move === "sail" && m.lane && m.path ? `${m.id}|${m.lane}` : "");
const CLOCKS = new WeakMap<object, Map<string, { s0: number; f0: number }>>();
/**
 * Round 7: one clock per ship of the Reel (a ship type on a lane): set where it is first seen, so it passes the point of
 * its first beat half-way through that beat, then sails on at its speed through every later beat (ships.ts).
 */
export function shipClocks(c: ReelContent, sb: Storyboard): Map<string, { s0: number; f0: number }> {
  const have = CLOCKS.get(sb);
  if (have) return have;
  // pass 3: the clocks worked out once with the storyboard (Root.tsx), so a frame never searches them again
  const pre = (sb as Storyboard & { clocks?: Record<string, { s0: number; f0: number }> }).clocks;
  if (pre) {
    const m = new Map(Object.entries(pre));
    CLOCKS.set(sb, m);
    return m;
  }
  const out = new Map<string, { s0: number; f0: number }>();
  const ends: Record<number, number> = {};
  for (const s of sb.shots) ends[s.beat] = Math.max(ends[s.beat] ?? 0, Math.round((s.start + s.dur) * sb.fps));
  for (const s of sb.shots) {
    const b = c.beats[s.beat];
    const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : [];
    for (const i of s.marks) {
      const m = marks[i];
      if (m.kind !== "object") continue;
      const key = clockKey(m);
      if (!key || out.has(key)) continue;
      const way = wayOf(m.path!);
      const at = s.beat === 0 && s.n === 1 ? 0 : Math.round(s.start * sb.fps);
      const v = kmPerFrame(m.id);
      const mid = kmAlong(way, [m.lon, m.lat]);
      // on frame 0 the hook's ship is already at its point; a later one reaches its point half-way through its beat
      let s0 = mid - (s.beat === 0 ? 0 : (v * ((ends[s.beat] ?? at) - at)) / 2);
      // never off its way's end before the Reel is over
      s0 = Math.max(0, Math.min(s0, way.km - v * (sb.total - at) - 1));
      // pass 3 (owner: «روساخت نفتکش‌های کوچک به ساحل قشم و ایران می‌ساید»): a column the line counts sails where every hull
      // and house of it is clear of every coast on the frames it is seen, out on the open lane
      if (m.count && m.count > 1 && m.count <= COLUMN_MAX) s0 = openWater(c, sb, key, way, s0, at, v);
      out.set(key, { s0, f0: at });
    }
  }
  CLOCKS.set(sb, out);
  return out;
}

/**
 * Pass 3: where along its way a column of ships is at frame `at` so that, on every frame of the beats it sails in, every
 * ship of it is drawn whole on open water (its waterline, house and bow HOUSE_KM off every coast: objects.tsx hullClear),
 * nearest the writer's point among the best. Measured on the Reel's own camera, every sixth frame.
 */
function openWater(c: ReelContent, sb: Storyboard, key: string, way: ReturnType<typeof wayOf>, s0: number, at: number, v: number): number {
  const keys = cameraKeys(sb);
  const frames: { f: number; view: ReturnType<typeof makeView>; n: number; gap: number; zoom: number; panels: { x: number; y: number; w: number; h: number }[]; discs: [number, number][] }[] = [];
  const beats = new Set<number>();
  for (const s of sb.shots) {
    const b = c.beats[s.beat];
    const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : [];
    if (marks.some((m) => m.kind === "object" && clockKey(m) === key)) beats.add(s.beat);
  }
  for (const s of sb.shots) {
    if (!beats.has(s.beat)) continue;
    const b = c.beats[s.beat] as Extract<Beat, { kind: "hook" | "map" }>;
    const m = b.marks?.find((q): q is Extract<Mark, { kind: "object" }> => q.kind === "object" && clockKey(q) === key);
    if (!m) continue;
    for (let f = Math.round(s.start * sb.fps); f < Math.round((s.start + s.dur) * sb.fps); f += 6) {
      const look = lookOfFrame(keys, f, sb.total);
      const col = columnOf(m, b.look.span, look.span);
      const view = makeView(look, STAGE, DIVAN, f, "clock");
      // the beat's numbered discs (a ship never sails over one: mapcheck's object-over-marker)
      const discs = (b.marks ?? []).filter((q): q is Extract<Mark, { kind: "marker" }> => q.kind === "marker").map((q) => view.at(q.lon, q.lat)).filter((q): q is [number, number] => Boolean(q));
      frames.push({ f, view, n: col.n, gap: col.gapKm, zoom: artScale(m.id) * (m.size ?? 1) * col.zoom, panels: legendBox(b.legend) ? [legendBox(b.legend)!] : [], discs });
    }
  }
  if (!frames.length) return s0;
  const id = key.split("|")[0] as Extract<Mark, { kind: "object" }>["id"];
  const tail = Math.max(...frames.map((x) => (x.n - 1) * x.gap));
  const hi = way.km - v * (sb.total - at) - 1;
  // a ship's verdict on a frame depends only on where along its way it is: kept per 3 km of way
  const memo = frames.map(() => new Map<number, number>());
  // 3: drawn on the map but hidden (its picture near a coast or under the legend); 1: past the band's edge (not seen
  // whole, but nothing on the map is wrong); 0: seen whole on open water
  const bad = (fi: number, km: number) => {
    const x = frames[fi];
    const k = Math.round(km / 3);
    let r = memo[fi].get(k);
    if (r === undefined) {
      const p = pointAt(way, k * 3);
      const q = x.view.at(p[0], p[1]);
      const pose = q ? shipPose(x.view, way, k * 3) : null;
      const onDisc = q ? x.discs.some((d) => Math.abs(d[0] - q[0]) < 135 * x.zoom + MARKER_R + 4 && q[1] - d[1] < 120 * x.zoom + MARKER_R + 6 && d[1] - q[1] < 20 * x.zoom + MARKER_R + 6) : false;
      const hb = q ? { x: q[0] - 135 * x.zoom, y: q[1] - 120 * x.zoom, w: 270 * x.zoom, h: 140 * x.zoom } : null;
      const off = !hb || hb.x + hb.w < 0 || hb.x > 1080 || hb.y + hb.h < 0 || hb.y > 1920;
      // under the header, the source line or the legend (faded there, or not drawn) is as bad as a coast
      const under = hb ? [...CHROME, ...x.panels].some((pn) => meetBox(hb, pn, 2)) : false;
      r = off ? 1 : under || onDisc || !wetK(x.view, q!, x.zoom, id, pose) ? 3 : q![0] < 80 || q![0] > 1000 || q![1] > 1468 ? 1 : 0;
      memo[fi].set(k, r);
    }
    return r;
  };
  const misses = (s: number) => {
    let n = 0;
    frames.forEach((x, fi) => {
      for (let i = 0; i < x.n; i += 1) n += bad(fi, s + v * (x.f - at) - i * x.gap);
    });
    return n;
  };
  if (typeof process !== "undefined" && process.env?.CLOCK_DEBUG) {
    const dump = (s: number) => frames.map((x, fi) => `${(x.f / 30).toFixed(1)}:${Array.from({ length: x.n }, (_, i) => bad(fi, s + v * (x.f - at) - i * x.gap)).join("")}`).join(" ");
    (globalThis as { clockDump?: (s: number) => string }).clockDump = dump;
  }
  let best = { s: s0, n: misses(s0) };
  if (!best.n) return s0;
  for (let d = 4; d <= 480; d += 4)
    for (const s of [s0 + d, s0 - d]) {
      if (s < tail || s > hi) continue;
      const n = misses(s);
      if (n < best.n) best = { s, n };
      if (!best.n) return best.s;
    }
  return best.s;
}

/** The marks on the map at frame f, each with its clock: the hook's are whole from frame 0 (the event is already there). */
export function marksAt(c: ReelContent, sb: Storyboard, f: number, inLoop: boolean) {
  const out: { m: Mark; t: number; beat: number; own: boolean; life?: number; base?: number; opacity?: number }[] = [];
  const clocks = shipClocks(c, sb);
  const baseOf = (i: number) => {
    const b = c.beats[i];
    return b.kind === "hook" || b.kind === "map" || b.kind === "demand" ? b.look.span : b.kind === "road" ? b.look?.span : undefined;
  };
  // where each beat ends: an object that moves (a ship, an aircraft) spends its beat on its way
  const ends: Record<number, number> = {};
  for (const s of sb.shots) ends[s.beat] = Math.max(ends[s.beat] ?? 0, Math.round((s.start + s.dur) * sb.fps));
  // pass 3: the shot's frames rounded as the renderer rounds them (a beat's last frame never falls between two shots)
  const cur = sb.shots.find((s) => f >= Math.round(s.start * sb.fps) && f < Math.round((s.start + s.dur) * sb.fps)) ?? sb.shots[sb.shots.length - 1];
  // the chapter: from the last beat that clears the map
  let from = 0;
  c.beats.forEach((b, i) => {
    if (b.kind === "map" && b.clear && i <= cur.beat) from = i;
  });
  for (const s of sb.shots) {
    const b = c.beats[s.beat];
    const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : [];
    for (const i of s.marks) {
      const m = marks[i];
      // round 5: the hook's strike (a drone or missile coming down) is seen falling on its first shot, not already over
      const strike = m.kind === "object" && (m.move === "drop" || m.move === "arc");
      // round 8: a numbered disc on a beat's first shot lands when the camera has arrived (a dive or a pan takes 1.5 s):
      // flying in, the disc would cross the header or the legend; its burst and the fire it sets come with it
      // pass 4: everything a flying first shot brings (its things too, not only its discs) lands with its header, together
      // a column on the Reel's clock is already sailing (it never blinks out while the camera flies)
      const onClock = m.kind === "object" && Boolean(clockKey(m)) && (m.count ?? 1) > 1;
      const at = s.beat === 0 && s.n === 1 ? (strike ? 6 : -60) : Math.round(s.start * sb.fps) + 3 + (onClock ? 0 : arriveOf(sb.shots, s, sb.fps));
      if (inLoop) {
        // an object of the first frame runs back to where it stood then, so the last frame meets the first
        if (s.beat === 0 && s.n === 1) {
          // round 7: a ship on the Reel's clock comes back where it sailed on frame 0 (it fades in as the camera flies home)
          const ck = m.kind === "object" ? clocks.get(clockKey(m)) : undefined;
          if (ck && m.kind === "object") out.push({ m: { ...m, s0: ck.s0, f0: ck.f0 + sb.total }, t: 99, beat: 0, own: true, base: baseOf(0), opacity: Math.min(1, (f - (sb.total - LOOP)) / 10) });
          else out.push({ m, t: m.kind === "object" ? -at - (sb.total - f) : f - at, beat: 0, own: true, life: (ends[0] ?? 0) - at, base: baseOf(0) });
        }
        continue;
      }
      if (f < at) continue;
      if (s.beat === 0 || s.beat >= from) {
        // labels, measures and callouts belong to their own beat; what is drawn on the ground stays for the chapter
        const passing = m.kind === "callout" || m.kind === "marker" || m.kind === "lane" || m.kind === "measure" || m.kind === "label" || m.kind === "flag" || m.kind === "object" || m.kind === "share" || b.kind === "road";
        // the close gathers the story on the first frame: every line and pin of every beat (the roads too) is back on
        // the hook's map and its comets run again (round 2, the judge: «end on the 0 s map with the three roads»)
        // round 7: the hook's own thing (the refinery, the tanker) stands there too, so the question has its context
        const gather = (c.beats[cur.beat].kind === "poll" || c.beats[cur.beat].kind === "gauge") && (m.kind === "comet" || m.kind === "dashed" || m.kind === "pins" || m.kind === "claim" || (s.beat === 0 && m.kind === "object" && m.move !== "drop" && m.move !== "arc" && m.move !== "sail"));
        if (passing && s.beat !== cur.beat && !gather) continue;
        // a burning object came in early (pass 3): its fire waits for the pin it stands on, and for a missile's burst there
        let mm: Mark = m;
        if (m.kind === "object" && ((m.fire !== undefined && m.fire !== false) || m.move === "approach")) {
          // the incident nearest the ship (its pin, or the missile coming down on it) sets when it starts to burn
          const dist = (lon: number, lat: number) => Math.hypot(lon - m.lon, lat - m.lat);
          let best = Infinity;
          let land = at;
          for (const z of sb.shots)
            if (z.beat === s.beat)
              for (const j of z.marks) {
                const q = marks[j];
                const d = q.kind === "pins" ? Math.min(...q.points.map((p) => dist(p.lon, p.lat))) : q.kind === "marker" ? dist(q.lon, q.lat) + 0.2 : q.kind === "object" && (q.move === "drop" || q.move === "arc") ? dist(q.lon, q.lat) - 1e-3 : Infinity;
                if (d <= best) {
                  best = d;
                  const arrive = arriveOf(sb.shots, z, sb.fps);
                  land = Math.round(z.start * sb.fps) + 3 + arrive + (q.kind === "object" ? 30 : 0);
                }
              }
          const struck = best < Infinity && land > at;
          // round 4, the sequence: the ship sails in and lies at its point when the incident lands, then burns
          mm = { ...m, ...(m.fire !== undefined && m.fire !== false ? { fire: Math.max(0, land - at) + (m.fire === true ? 0 : m.fire) } : {}), ...(m.move === "approach" ? { arrive: Math.max(24, (struck ? land : at + 60) - at - 8) } : {}) };
        }
        // pass 4 (the judge: «make each shot of the share beat add a real change»): a pipeline on a beat whose line says a share
        // of the output went stops its oil on the shot after the share lands
        if (mm.kind === "object" && mm.move === "pipe") {
          const si = marks.findIndex((q) => q.kind === "share");
          const own = sb.shots.filter((z) => z.beat === s.beat);
          const zi = si >= 0 ? own.findIndex((z) => z.marks.includes(si)) : -1;
          if (zi >= 0 && own[zi + 1]) mm = { ...mm, stop: Math.round(own[zi + 1].start * sb.fps) + 3 - at };
          // pass 5: a followed line draws from its start until its end shot, the camera travelling with it
          if (s.motion.follow) mm = { ...mm, draw: Math.max(30, Math.round(s.start * sb.fps) + s.motion.follow - at) };
        }
        // round 6: the beat's main thing is drawn a size larger
        const mp = mainObject(marks);
        if (mm.kind === "object" && mp && mm.lon === mp[0] && mm.lat === mp[1] && marks.findIndex((q) => q.kind === "object" && q.lon === mp[0] && q.lat === mp[1]) === i) mm = { ...mm, main: true };
        // round 7: a ship on a lane sails the Reel's one clock
        if (mm.kind === "object") {
          const ck = clocks.get(clockKey(mm));
          if (ck) mm = { ...mm, s0: ck.s0, f0: ck.f0 };
        }
        out.push({ m: mm, t: f - at, beat: s.beat, own: s.beat === cur.beat || gather, life: (ends[s.beat] ?? at) - at, base: baseOf(s.beat) });
      }
    }
  }
  return out;
}

/** Iran in amber, every other state a tint (round 2: «only Iran in amber»): the closer the camera, the lighter the fill */
const fillOpacity = (color: string, span: number) => (color.toLowerCase() === DIVAN.actors.iran ? (span < 12 ? 0.3 : 0.5) : span < 12 ? 0.26 : 0.4);
/** the ground's names the context layer may write: the places of the engine, and every named state at its centroid */
const PLACE_LIST = Object.values(PLACES_FA);
/** islands and ports on a close map of the Gulf (round 4), never two of one name */
const SEA_LIST = Object.values(SEA_PLACES_FA).filter((p) => !PLACE_LIST.some((q) => q.t === p.t));

/** An area where the source gives a place only roughly: a soft disc and a dashed ring about 15 km across, its centre a small dot. */
const AreaMarks: React.FC<{ points: { lon: number; lat: number }[]; color: string; t: number; span: number }> = ({ points, color, t, span }) => {
  const v = useView();
  if (t < 0) return null;
  const k = Math.min(1, t / 12);
  return (
    <g opacity={k}>
      {points.map((p, i) => {
        const at = v.at(p.lon, p.lat);
        const edge = v.at(p.lon + 0.07, p.lat);
        if (!at || !edge) return null;
        const r = Math.max(36, Math.min(160, Math.hypot(edge[0] - at[0], edge[1] - at[1])));
        void span;
        return (
          <g key={i}>
            <circle cx={at[0]} cy={at[1]} r={r} fill={color} opacity={0.16} />
            <circle cx={at[0]} cy={at[1]} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray="10 8" strokeDashoffset={-v.f * 0.6} />
            <circle cx={at[0]} cy={at[1]} r={5} fill={color} />
          </g>
        );
      })}
    </g>
  );
};
const STATE_LIST = Object.keys(NAMES_FA)
  .map((a3) => {
    const c = country(a3);
    return c ? { t: NAMES_FA[a3], lon: c.centroid[0], lat: c.centroid[1] } : null;
  })
  .filter((x): x is { t: string; lon: number; lat: number } => Boolean(x));

/** Small boxes along every line on the map: the labels are placed clear of them (round 3: «labels over the route»). */
const lineBoxesOf = (v: ReturnType<typeof useView>, ms: Mark[]) => {
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  for (const m of ms) {
    if (m.kind === "object") {
      // an object takes its own room (about 230 by 150 px) where it stands, starts and ends
      // round 7: a ship on the Reel's clock or one coming in takes its room where it lies, not along the whole lane it passes
      const passing = m.move === "approach" || (m.move === "sail" && m.lane);
      const at = [[m.lon, m.lat] as [number, number], ...(m.path && m.path.length > 1 && !passing ? [m.path[0], m.path[Math.floor(m.path.length / 2)], m.path[m.path.length - 1]] : [])];
      for (const q of at) {
        const p = v.at(q[0], q[1]);
        // round 5: a burning object takes its smoke's room too (it rises about 160 px)
        const burns = m.fire !== undefined && m.fire !== false;
        // round 7 pass 3: the main thing is drawn a size larger (about 240 px) and its hull reaches below its point
        if (p) boxes.push(burns ? { x: p[0] - 135, y: p[1] - 300, w: 270, h: 360 } : { x: p[0] - 125, y: p[1] - 130, w: 250, h: 180 });
      }
      continue;
    }
    if (m.kind !== "comet" && m.kind !== "dashed" && m.kind !== "claim") continue;
    const pts = densify(m.coords, 0.5);
    const step = Math.max(1, Math.floor(pts.length / 24));
    for (let i = 0; i < pts.length; i += step) {
      const p = v.at(pts[i][0], pts[i][1]);
      if (p) boxes.push({ x: p[0] - 22, y: p[1] - 22, w: 44, h: 44 });
    }
  }
  return boxes;
};

/** Where the header and the source line write: no word on the map may enter them (round 7). */
export const CHROME = [
  { x: 0, y: 0, w: 1080, h: 556 },
  { x: 0, y: 1404, w: 1080, h: 64 },
];
const meetBox = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/**
 * Round 7 (owner: «هیچ لیبل، کال‌اوت یا تیتری نباید در هیچ لحظه روی دیگری بیفتد»): every word a frame writes on the map,
 * placed once against every other, in the order of what matters: the header and the source line (CHROME), then the
 * share's bar, a measure's length and the scale, then the callouts (placed on their beat's look and carried), then the
 * writer's place names, then the ground's names. What finds no room waits (it is not drawn on this frame); a callout
 * that meets a word placed before it waits too. Pure: tests/words.test.mjs walks both samples frame by frame through it.
 */
/** The poll's options, its chip and the badge (PollPic): the map's words wait under them. */
export const POLL_BOX = { x: 40, y: 990, w: 1000, h: 490 };
export function layoutWords(view: ReturnType<typeof makeView>, refLook: Look | undefined, list: { m: Mark; t: number; life?: number; base?: number }[], scale: boolean, span: number, over: { x: number; y: number; w: number; h: number }[] = []) {
  type B = { x: number; y: number; w: number; h: number };
  const live = list.filter((x) => x.t >= 0);
  const callouts: CalloutSpec[] = [];
  const labels: { t: string; lon: number; lat: number }[] = [];
  live.forEach(({ m }, i) => {
    if (m.kind === "callout") callouts.push({ id: `c${list.indexOf(live[i])}`, lon: m.lon, lat: m.lat, bold: m.bold, sub: m.sub, color: m.color, a3: m.a3 });
    if (m.kind === "label") labels.push({ t: m.t, lon: m.lon, lat: m.lat });
  });
  // round 8: the numbered discs are things on the map too: no word meets one
  const discBoxes = live.flatMap(({ m }) => {
    if (m.kind !== "marker") return [];
    const q = view.at(m.lon, m.lat);
    return q ? [{ x: q[0] - MARKER_R - 10, y: q[1] - MARKER_R - 10, w: 2 * MARKER_R + 20, h: 2 * MARKER_R + 20 }] : [];
  });
  const objBoxes = [...list.flatMap(({ m, t, life, base }) => (m.kind === "object" ? [objectBox(m, t, life ?? 90, base, view, view.f)].filter((b): b is NonNullable<typeof b> => Boolean(b)) : [])), ...discBoxes];
  const sc = scale ? scaleGeom(view) : null;
  const CH = [...CHROME, ...over];
  // round 8: a share's words and bar are a row of the legend: nothing of it on the map
  const shareBoxes: B[] = [];
  // a measure's length on the header or the source line waits (its line is still drawn); round 8: its words stand on the
  // side of its line that is water (never over land, never over a thing), else they wait
  // round 8: a measure's length is a row of the legend (legend.ts): its words are never on the map; its bar stays
  const measureSide = 1;
  const measureBoxes: B[] = [];
  const quietMeasures = live.filter(({ m }) => m.kind === "measure" && !measureBoxes.length).map(({ m }) => m);
  // the scale is the least of the fixed words: it steps aside for a share or a measure; round 8: and it is drawn only
  // over water, clear of every thing and disc
  const scaleOk = Boolean(sc) && ![...shareBoxes, ...measureBoxes, ...CH, ...objBoxes].some((b) => meetBox(b, sc!.box, 6)) && boxOnWater(view, sc!.box);
  const fixed: B[] = [...shareBoxes, ...measureBoxes, ...(scaleOk ? [sc!.box] : [])];
  // round 5: placed once on the beat's look, clear of its objects, their smoke and its lanes; then carried with the places
  const ref = refLook ? makeView(refLook, STAGE, DIVAN, view.f, "ref") : view;
  const fixedRef: B[] = [

    ...live.flatMap(({ m }) => (m.kind === "measure" ? [measureLabelBox(ref, m.a, m.b)].filter((b): b is NonNullable<typeof b> => Boolean(b)) : [])),
    ...(sc ? [sc.box] : []),
  ];
  const preRef = placeCallouts(ref, callouts, SAFE, lineBoxesOf(ref, list.map((x) => x.m)), fixedRef);
  const carried = carry(preRef.placed, Object.fromEntries(callouts.map((c) => [c.id, view.at(c.lon, c.lat)])), SAFE);
  // a carried callout that meets a word placed before it (or another callout) waits for the next shot
  const kept: typeof carried = [];
  // round 7 pass 3 (the judge: «پرتابه، خروجی تنگه» was written over the tanker it names): a carried callout keeps its
  // offset in pixels while the camera zooms, so on this frame it can come onto an object; then it is placed afresh on
  // this frame, clear of every object's room
  const objRooms = objBoxes.map((b) => ({ x: b.x - 10, y: b.y - 10, w: b.w + 20, h: b.h + 20 }));
  for (const p0 of carried) {
    let p = p0;
    // and (the judge: «خریص» stood by Abqaiq after the camera moved) a carried callout that came nearer another
    // callout's place than its own is placed afresh too, with every callout's place known
    const own = view.at(callouts.find((x) => x.id === p.id)?.lon ?? 0, callouts.find((x) => x.id === p.id)?.lat ?? 0);
    const mid: [number, number] = [p.box.x + p.box.w / 2, p.box.y + p.box.h / 2];
    const astray = Boolean(own) && callouts.some((c) => {
      if (c.id === p.id) return false;
      const q = view.at(c.lon, c.lat);
      return Boolean(q) && Math.hypot(mid[0] - q![0], mid[1] - q![1]) < Math.hypot(mid[0] - own![0], mid[1] - own![1]);
    });
    if (astray || objRooms.some((b) => meetBox(p.box, b, 4))) {
      const again = placeCallouts(view, callouts, SAFE, [...objRooms, ...kept.map((k) => k.box)], [...CH, ...fixed]).placed.find((x) => x.id === p.id);
      if (again) p = again;
    }
    const blocked = [...CH, ...fixed, ...kept.map((k) => k.box)].some((b) => meetBox(p.box, b, 4));
    if (!blocked) kept.push(p);
  }
  const pre = { fits: preRef.fits, placed: kept };
  // what lies under each callout on the beat's look (three points along its words): the colour must read on all of it
  const groundAt = (x: number, y: number) => {
    const ll = ref.inv(x, y);
    if (!ll) return DIVAN.sea;
    for (const { m } of list) {
      if (m.kind !== "fill") continue;
      const g = country(m.a3)?.geo;
      if (g && geoContains(g, ll)) return mix(m.color, DIVAN.land, fillOpacity(m.color, ref.look.span));
    }
    return geoContains(worldFor(ref.look.span).land as never, ll) ? DIVAN.land : DIVAN.sea;
  };
  const grounds = Object.fromEntries(preRef.placed.map((p) => [p.id, [0.15, 0.5, 0.85].map((u) => groundAt(p.box.x + p.box.w * u, p.box.y + p.box.h * 0.4))]));
  const showScale = scaleOk && !kept.some((p) => meetBox(p.box, sc!.box));
  const calloutBoxes: B[] = kept.flatMap((p) => {
    const out = [p.box];
    // the leader, as a row of small boxes
    const ex = p.box.x + p.box.w;
    const ey = p.box.y + p.box.h / 2;
    for (let s = 0; s <= 1; s += 0.1) out.push({ x: p.anchor[0] + (ex - p.anchor[0]) * s - 12, y: p.anchor[1] + (ey - p.anchor[1]) * s - 12, w: 24, h: 24 });
    return out;
  });
  const words: { kind: string; t: string; box: B; at?: [number, number] }[] = [
    ...shareBoxes.map((box) => ({ kind: "share", t: "", box })),
    ...measureBoxes.map((box) => ({ kind: "measure", t: "", box })),
    ...(showScale ? [{ kind: "scale", t: "", box: sc!.box }] : []),
    ...kept.map((p) => ({ kind: "callout", t: p.id, box: p.box })),
  ];
  // the writer's place names: clear of all of that, the leaders and each other
  const taken: B[] = [...CH, ...fixed, ...calloutBoxes];
  // round 8: a name never moves off its place onto a leader: it stands on its place, clear of every thing and word, or
  // waits; and a name of the sea (its place is water) is written on the water only
  const groundOk = (at: [number, number] | null, box: B) => {
    const g = at ? view.inv(at[0], at[1]) : null;
    return !g || landAt(g) || boxOnWater(view, box);
  };
  const labelsAt = labels.map((l) => {
    const pl0 = placeLabel(view, l, [], [...taken, ...objBoxes]);
    const pl = pl0 && groundOk(pl0.at, pl0.box) ? pl0 : null;
    if (pl) {
      taken.push(pl.box);
      words.push({ kind: "label", t: l.t, box: pl.box, at: pl.at });
    }
    return pl;
  });
  // where a mark already speaks, the ground stays quiet
  const avoid: [number, number][] = [];
  for (const { m } of live) {
    if (m.kind === "object") avoid.push([m.lon, m.lat], ...(m.path && m.move !== "sail" ? m.path : []));
    else if (m.kind === "callout" || m.kind === "label" || m.kind === "flag") avoid.push([m.lon, m.lat]);
    else if (m.kind === "pins") avoid.push(...m.points.map((p) => [p.lon, p.lat] as [number, number]));
    else if (m.kind === "measure") avoid.push(m.a, m.b, [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2]);
  }
  for (const { m } of live) if (m.kind === "marker") avoid.push([m.lon, m.lat]);
  const names = pickNames(view, avoid, span < 10 ? [...PLACE_LIST, ...SEA_LIST] : PLACE_LIST, STATE_LIST, span > 70 ? 4 : span < 10 ? 6 : 5, [...taken, ...objBoxes]).filter((n) => groundOk(n.at, n.box));
  for (const n of names) words.push({ kind: "name", t: n.t, box: n.box, at: n.at });
  return { pre, grounds, showScale, labelsAt, names, labels, callouts, words, quietMeasures, measureSide };
}

const MapMarks: React.FC<{ list: { m: Mark; t: number; own: boolean; life?: number; base?: number; opacity?: number }[]; f: number; span: number; scale?: boolean; /** round 5: the beat's own look, where its callouts are placed once */ refLook?: Look; /** round 7: a picture over the map whose words the map's words wait under */ over?: { x: number; y: number; w: number; h: number }[]; /** pass 4: the disc the shot turns to, and frames since */ focus?: { n: number; t: number } }> = ({ list, f, span, scale = false, refLook, over = [], focus }) => {
  const callouts: CalloutSpec[] = [];
  const ts: number[] = [];
  const labels: { t: string; lon: number; lat: number }[] = [];
  // a missile and its burst draw under what stands: a ship it hits is never hidden by the flash (pass 3)
  const objects: { drawFirst: boolean; node: React.ReactNode }[] = [];
  const view = useView();
  const measures: React.ReactNode[] = [];
  const discs: React.ReactNode[] = [];
  const shares: { m: Extract<Mark, { kind: "share" }>; t: number }[] = [];
  const body = list.map(({ m, t, own, life, base, opacity }, i) => {
    switch (m.kind) {
      case "fill":
        return <CountryFill key={i} a3={m.a3} color={m.color} t={t} opacity={fillOpacity(m.color, span)} edge={m.color.toLowerCase() === DIVAN.actors.iran || (m as { pulse?: boolean }).pulse} pulse={(m as { pulse?: boolean }).pulse} />;
      case "hatch":
        return <RegionHatch key={i} a3={m.a3} polygon={m.polygon} color={m.color} t={t} />;
      case "claim":
        return <ClaimLine key={i} coords={m.coords} color={m.color} t={t} />;
      case "dashed":
        return (
          <g key={i}>
            <DashedLine coords={m.coords} color={m.color} t={t} />
            {own && t > 30 ? <CometTrail coords={m.coords} color={m.color} t={t - 30} loop={60} head={12} width={8} tail={0.25} /> : null}
          </g>
        );
      case "comet":
        // round 7: a lane is a thin line on the water (LaneLine); a comet over the sea is masked to the water and thinner
        if (m.loop) return <LaneLine key={i} coords={m.coords} color={m.color} t={t} />;
        return seaRoute(m.coords) ? (
          <g key={i}>
            <WaterMask id={`${view.uid}-comet-${i}`} margin={6} />
            <g mask={`url(#${view.uid}-comet-${i})`}>
              <CometTrail coords={m.coords} color={m.color} t={t} dur={36} loop={own && t > 40 ? 54 : undefined} head={12} width={10} tail={0.45} route />
            </g>
          </g>
        ) : (
          <CometTrail key={i} coords={m.coords} color={m.color} t={t} dur={36} loop={own && t > 40 ? 54 : undefined} head={22} width={24} tail={0.45} route />
        );
      case "lane":
        // round 8: the real lane (Hormuz TSS), faint and still, only on the water
        return <LaneLine key={i} coords={m.coords} color="#ffd88a" t={t} faint />;
      case "marker":
        discs.push(<MapMarker key={`k${i}`} lon={m.lon} lat={m.lat} n={m.n} hit={m.hit} t={t} focus={own && focus && focus.n === m.n ? focus.t : undefined} />);
        return null;
      case "pins":
        // a place the source gives only roughly: an area (a soft disc and a dashed ring), never a precise pin
        return m.area ? <AreaMarks key={i} points={m.points} color={m.color} t={t} span={span} /> : <PinCluster key={i} points={m.points} color={m.color} t={t} />;
      case "measure":
        // over the objects: a ship passing the narrowest point must not hide its length
        measures.push(<MeasureLine key={i} a={m.a} b={m.b} t={t} quiet={false} side={1} />);
        return null;
      case "callout":
        callouts.push({ id: `c${i}`, lon: m.lon, lat: m.lat, bold: m.bold, sub: m.sub, color: m.color, a3: m.a3 });
        ts.push(t);
        return null;
      case "label":
        if (t >= 0) labels.push({ t: m.t, lon: m.lon, lat: m.lat });
        return null;
      case "share":
        shares.push({ m, t });
        return null;
      case "object":
        // over the lines and pins they belong to, under the labels
        objects.push({ drawFirst: m.move === "drop" || m.move === "arc", node: <MapObject key={`o${i}`} o={m} t={t} life={life ?? 90} base={base} opacity={opacity ?? 1} panels={[CHROME[0], ...over]} /> });
        return null;
      default:
        return null;
    }
  });
  void f;
  const L7 = layoutWords(view, refLook, list, scale, span, over);
  const { pre, grounds, showScale, labelsAt, names, quietMeasures, measureSide } = L7;
  return (
    <>
      <ObjectDefs />
      <ContextNames avoid={[]} places={[]} states={[]} picked={names} />
      {body}
      {objects.filter((o) => o.drawFirst).map((o) => o.node)}
      {objects.filter((o) => !o.drawFirst).map((o) => o.node)}
      {measures.map((node) => (React.isValidElement(node) ? React.cloneElement(node as React.ReactElement<{ quiet: boolean; side: number }>, { quiet: quietMeasures.length > 0, side: measureSide }) : node))}
      {discs}
      <PlaceLabels items={labels} placed={labelsAt} />
      <Callouts items={callouts} ts={ts} safe={SAFE} pre={pre} grounds={grounds} />
      {/* round 8: a share is a row of the legend (LegendPanel), never words over the map */}
      {shares.length < 0 ? <ShareBar m={shares[0].m} t={0} /> : null}
      {showScale ? <ScaleAndNorth /> : null}
    </>
  );
};

/** A line whose every point is at sea (a ship's way, not a missile's): drawn on the water only. */
const SEA_ROUTES = new WeakMap<object, boolean>();
const seaRoute = (coords: [number, number][]) => {
  let r = SEA_ROUTES.get(coords);
  if (r === undefined) SEA_ROUTES.set(coords, (r = landOn(coords, 4).length === 0));
  return r;
};

// ---------------- the pictures over the map ----------------

const Chart: React.FC<{ chart: ChartSpec; k: number; f: number; showSource: boolean }> = ({ chart, k, f, showSource }) => {
  const pts = chart.points;
  const lo0 = Math.min(...pts);
  const hi0 = Math.max(...pts);
  const pad = (hi0 - lo0) * 0.14 || 1;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const box = { x0: L + 30, x1: R - 30, y0: 1010, y1: 1250 };
  // time runs left to right on an RTL page too (owner, 19 Nov 2026): the oldest on the left, today on the right
  const X = (i: number) => box.x0 + (pts.length > 1 ? i / (pts.length - 1) : 1) * (box.x1 - box.x0);
  const Y = (v: number) => box.y1 - ((v - lo) / (hi - lo)) * (box.y1 - box.y0);
  const head = k * (pts.length - 1);
  const i0 = Math.floor(head);
  const under = i0 >= pts.length - 1 ? pts[pts.length - 1] : pts[i0] + (pts[i0 + 1] - pts[i0]) * (head - i0);
  const headX = box.x0 + k * (box.x1 - box.x0);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(pts.length - 1)} ${box.y1} L${X(0)} ${box.y1} Z`;
  const shown = faDigits(under.toFixed(chart.digits ?? 2)).replace(".", "٫");
  const done = k >= 0.999;
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill>
      {/* a glass panel: the chart reads over the live map, which stays half lit around it */}
      <div style={{ position: "absolute", top: 760, left: L - 24, width: COLW + 48, height: 580, borderRadius: 32, background: "rgba(22,32,50,0.8)", border: "2px solid rgba(255,176,32,0.25)" }} />
      <div style={{ position: "absolute", top: 780, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ fontWeight: 700, fontSize: 46, color: ROOM.paper }}>{chart.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 112, color: ROOM.amber, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{shown}</div>
          <div style={{ fontWeight: 600, fontSize: 44, color: ROOM.mute }}>{chart.unit}</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="sb-pen">
            <rect x={box.x0 - 40} y={box.y0 - 60} width={headX - box.x0 + 40} height={box.y1 - box.y0 + 120} />
          </clipPath>
          <linearGradient id="sb-under" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ROOM.amber} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ROOM.amber} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={box.x0} x2={box.x1} y1={box.y0 + (g * (box.y1 - box.y0)) / 3} y2={box.y0 + (g * (box.y1 - box.y0)) / 3} stroke={ROOM.line} strokeWidth={2} />
        ))}
        <g clipPath="url(#sb-pen)">
          <path d={area} fill="url(#sb-under)" />
          <path d={line} fill="none" stroke={ROOM.amber} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((v, i) => (
            <circle key={i} cx={X(i)} cy={Y(v)} r={7} fill={ROOM.paper} />
          ))}
        </g>
        {!done ? <circle cx={headX} cy={Y(under)} r={15} fill={ROOM.amber} stroke={ROOM.paper} strokeWidth={4} /> : null}
        {done ? (
          <g>
            <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={16} fill={ROOM.hit} />
            <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={16 + pulse * 30} fill="none" stroke={ROOM.hit} strokeWidth={3} opacity={1 - pulse} />
          </g>
        ) : null}
        <text x={box.x0} y={box.y1 + 58} textAnchor="start" fill={ROOM.mute} fontFamily={VAZIR} fontSize={40} fontWeight={600}>
          {chart.first}
        </text>
        <text x={box.x1} y={box.y1 + 58} textAnchor="end" fill={ROOM.paper} fontFamily={VAZIR} fontSize={40} fontWeight={700}>
          {chart.last}
        </text>
      </svg>
      {showSource ? <Source text={chart.source} k={1} /> : null}
    </AbsoluteFill>
  );
};

/** A source as one short line: who said it, without the chain of outlets and the date after it (the full line is in the
 *  Reel's caption on the site). «سپاه به نقل از آناتولی و شینهوا؛ UKMTO …» becomes «منبع: سپاه، UKMTO». */
export function shortSource(text: string): string {
  const who = String(text)
    .replace(/^منبع:\s*/, "")
    .split(/[؛.]/)
    .map((p) => p.trim())
    .map((p) => {
      // «دیدار برلین: Middle East Eye» names what, then who: keep who
      const m = /^([^:]{1,24}):\s*(.+)$/.exec(p);
      return m && !/[A-Za-z]/.test(m[1]) ? m[2] : p;
    })
    .map((p) => p.split(/\s+به نقل از\s+/)[0].split("،")[0].trim())
    .filter((p) => p && !/^جای نشانه/.test(p));
  return [...new Set(who)].slice(0, 3).join("، ");
}
/**
 * A figure on the map (round 3, the judge: «put the oil price on the map»): a tag standing over its place (the chart's
 * `place`, Hormuz for oil) on a leader, the figure counting under the pen, a small line of the last days drawn by the
 * same pen, today's point in red. The tankers of the lane run under it (Ambient).
 */
const PriceTag: React.FC<{ chart: ChartSpec; k: number; f: number; look: Look }> = ({ chart, k, f, look }) => {
  const pl = chart.place ? PLACES_FA[chart.place] : null;
  const v = makeView(look, STAGE, DIVAN, f, "price");
  const at = pl ? v.at(pl.lon, pl.lat) : null;
  if (!at) return null;
  const pts = chart.points;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  // a tag, not a card: the map stays the picture (round 3B)
  const W = 440;
  const Hh = 90;
  const x = Math.max(L, Math.min(R - W - 40, at[0] - (W + 40) / 2));
  const y = Math.max(600, Math.min(1080, at[1] - 470));
  const X = (i: number) => 20 + (i / Math.max(1, pts.length - 1)) * (W - 40);
  const Y = (val: number) => Hh - 10 - ((val - lo) / (hi - lo || 1)) * (Hh - 20);
  const head = k * (pts.length - 1);
  const i0 = Math.floor(head);
  const under = i0 >= pts.length - 1 ? pts[pts.length - 1] : pts[i0] + (pts[i0 + 1] - pts[i0]) * (head - i0);
  const line = pts.map((val, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(val).toFixed(1)}`).join(" ");
  const shown = faDigits(under.toFixed(chart.digits ?? 2)).replace(".", "٫");
  const pop = rise(k * 60, 0, 8);
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${at[0]} ${at[1]} L${at[0]} ${y + 300}`} stroke={ROOM.amber} strokeWidth={4} strokeDasharray="10 8" opacity={pop} />
        <circle cx={at[0]} cy={at[1]} r={12} fill={ROOM.amber} />
        <circle cx={at[0]} cy={at[1]} r={12 + pulse * 34} fill="none" stroke={ROOM.amber} strokeWidth={3} opacity={1 - pulse} />
      </svg>
      <div style={{ position: "absolute", left: x, top: y, width: W + 40, opacity: pop, transform: `translateY(${(1 - pop) * 30}px)`, background: "rgba(22,32,50,0.9)", border: `3px solid ${ROOM.amber}`, borderRadius: 30, padding: "18px 20px 14px", direction: "rtl", fontFamily: VAZIR, boxShadow: "0 0 60px rgba(255,176,32,0.25)" }}>
        <div style={{ fontWeight: 700, fontSize: 34, color: ROOM.paper }}>{chart.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 96, color: ROOM.amber, lineHeight: 1.05 }}>{shown}</div>
          <div style={{ fontWeight: 600, fontSize: 38, color: ROOM.mute }}>{chart.unit}</div>
        </div>
        <svg width={W} height={Hh} style={{ direction: "ltr" }}>
          <clipPath id="tag-pen">
            <rect x={0} y={0} width={20 + k * (W - 40) + 4} height={Hh} />
          </clipPath>
          <g clipPath="url(#tag-pen)">
            <path d={line} fill="none" stroke={ROOM.amber} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {k >= 0.999 ? <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={10} fill={ROOM.hit} /> : <circle cx={20 + k * (W - 40)} cy={Y(under)} r={10} fill={ROOM.paper} />}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", direction: "ltr", fontSize: 32, fontWeight: 600, color: ROOM.mute }}>
          <span>{chart.first}</span>
          <span style={{ color: ROOM.paper }}>{chart.last}</span>
        </div>
      </div>
      <Source text={chart.source} k={k > 0.5 ? 1 : 0} />
    </AbsoluteFill>
  );
};

const Source: React.FC<{ text?: string; k: number; top?: number }> = ({ text, k, top }) =>
  text && shortSource(text) ? (
    <div style={{ position: "absolute", top: top ?? SOURCE_TOP, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 36, color: ROOM.mute, opacity: 0.85 * k, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      منبع: {shortSource(text)}
    </div>
  ) : null;

/** A big figure: it counts up to its value under the pen's amber, then what it means, then its source. */
const NumberPic: React.FC<{ b: Extract<Beat, { kind: "number" }>; local: number; view: number }> = ({ b, local, view }) => {
  const m = /([0-9۰-۹][0-9۰-۹٬,]*(?:[٫.][0-9۰-۹]+)?)/.exec(b.big);
  const latin = m ? m[1].replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٬,]/g, "").replace("٫", ".") : null;
  const value = latin ? Number(latin) : NaN;
  const k = interpolate(local, [0, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const decimals = latin && latin.includes(".") ? latin.split(".")[1].length : 0;
  const shown = m && Number.isFinite(value) ? b.big.replace(m[1], faNum(value * k, decimals)) : b.big;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 700, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, textAlign: "right" }}>
        <div style={{ fontWeight: 800, fontSize: 190, color: ROOM.amber, lineHeight: 1, textShadow: "0 0 60px rgba(255,176,32,0.35)" }}>{shown}</div>
        <div style={{ fontWeight: 700, fontSize: 52, color: ROOM.paper, marginTop: 18, opacity: view >= 1 ? 1 : 0.0, transform: `translateY(${view >= 1 ? 0 : 20}px)` }}>{b.unit}</div>
        <div style={{ fontWeight: 600, fontSize: 48, color: ROOM.paper, marginTop: 26, lineHeight: 1.45, opacity: view >= 1 ? 1 : 0 }}>{b.text}</div>
      </div>
      <Source text={b.source} k={view >= 2 ? 1 : 0} />
    </AbsoluteFill>
  );
};

/** A road in three views (bible §2): its object in its colour with its letter and title, then its cost, then its source. */
const RoadPic: React.FC<{ b: Extract<Beat, { kind: "road" }>; local: number; view: number; f: number; aiLabel?: string; onMap?: boolean }> = ({ b, local, view, f, aiLabel, onMap }) => {
  const r = b.road;
  const k = rise(local, 0, 12);
  const side = view >= 1;
  if (onMap) {
    // round 2 (the judge: «the roads read as cards»): a road on the map is its line on the map. The letter and the
    // title are the header; the cost is a label on the map where the line ends (roadCallout); the source is the one line.
    return (
      <AbsoluteFill>
        <div style={{ position: "absolute", top: 330, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 24, opacity: k, transform: `translateX(${(1 - k) * -40}px)` }}>
          <div style={{ width: 112, height: 112, borderRadius: 30, background: r.color, color: ROOM.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 58, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: `0 0 60px ${r.color}aa` }}>{r.key}</div>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 74, color: ROOM.paper, lineHeight: 1.18, textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>{r.title}</div>
        </div>
        <Source text={r.source} k={view >= 1 ? 1 : 0} />
      </AbsoluteFill>
    );
  }
  // on the map the object is smaller and up at the side, so the road it draws stays in sight
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: onMap ? 640 : side ? 440 : 280, top: onMap ? 470 : side ? 560 : 640, transform: `scale(${(onMap ? 0.48 : side ? 0.72 : 1) * (0.7 + 0.3 * k)})`, transformOrigin: "50% 50%", opacity: k, filter: `drop-shadow(0 0 40px ${r.color}55)` }}>
        <RoadObject id={r.object} color={r.color} f={f} />
      </div>
      {side ? <div style={{ position: "absolute", top: 985, left: 0, width: 1080, height: 400, background: "linear-gradient(180deg, rgba(26,35,48,0) 0%, rgba(26,35,48,0.92) 18%, rgba(26,35,48,0.92) 100%)" }} /> : null}
      <div style={{ position: "absolute", top: side ? 1010 : 1130, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 104, height: 104, borderRadius: 28, background: r.color, color: ROOM.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 54, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: `0 0 50px ${r.color}88` }}>{r.key}</div>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 64, color: ROOM.paper, lineHeight: 1.2 }}>{r.title}</div>
      </div>
      {side ? (
        <div style={{ position: "absolute", top: 1150, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR }}>
          <div style={{ fontWeight: 700, fontSize: 38, color: r.color }}>{aiLabel ?? "پیامد احتمالی، تحلیل دیوان"}</div>
          <div style={{ fontWeight: 800, fontSize: 60, color: ROOM.paper, lineHeight: 1.35, marginTop: 6 }}>{r.cost}</div>
        </div>
      ) : null}
      <Source text={r.source} k={view >= 2 ? 1 : 0} top={1390} />
    </AbsoluteFill>
  );
};

/** round 2: the flags stand on the map, each on its capital as the camera reaches it (the judge: «a frozen row of flags») */
const FlagsOnMap: React.FC<{ b: Extract<Beat, { kind: "flags" }>; local: number; look: Look; f: number }> = ({ b, local, look, f }) => {
  const v = makeView(look, STAGE, DIVAN, f, "flags");
  return (
    <AbsoluteFill>
      {b.a3.map((a3, i) => {
        const ll = CAPITALS[a3] ?? country(a3)?.centroid;
        const at = ll ? v.at(ll[0], ll[1]) : null;
        const k = rise(local, i * 14, 10);
        if (!at || k <= 0) return null;
        const bob = Math.sin((f + i * 11) / 9) * 6;
        return (
          <div key={a3} style={{ position: "absolute", left: at[0], top: at[1], transform: `translate(-50%, -100%) translateY(${(1 - k) * -80 + bob}px) scale(${0.6 + 0.4 * k})`, opacity: k, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FlagChip a3={a3} height={112} size={46} />
            <div style={{ width: 4, height: 70, background: ROOM.paper, opacity: 0.8 }} />
            <div style={{ width: 18, height: 18, borderRadius: 99, background: ROOM.amber, boxShadow: `0 0 24px ${ROOM.amber}` }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const FlagsPic: React.FC<{ b: Extract<Beat, { kind: "flags" }>; local: number }> = ({ b, local }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", top: 760, left: 0, width: 1080, display: "flex", justifyContent: "center", gap: 46, direction: "rtl" }}>
      {b.a3.map((a3, i) => {
        const k = rise(local, i * 9, 9);
        return (
          <div key={a3} style={{ transform: `translateY(${(1 - k) * 60 + Math.sin((local + i * 11) / 9) * 10}px) scale(${(0.6 + 0.4 * k) * (1 + 0.05 * Math.sin((local + i * 7) / 13))}) rotate(${Math.sin((local + i * 5) / 17) * 3}deg)`, opacity: k }}>
            <FlagChip a3={a3} height={150} size={48} />
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);

/**
 * Divan's estimate for each road, on the map (round 3, the judge: «make the gauge pins ride their road comets»): the
 * close's map holds every road's line; each road's rider travels its own line toward Iran and stops where Divan's
 * estimate puts it (near the table: most of the way; far: little of it). The bar in the lower third reads the same,
 * its pins moving with the riders, calm on the right, the far end on the left.
 */
const GaugePic: React.FC<{ b: Extract<Beat, { kind: "gauge" }>; local: number; f: number; look: Look; lines: Record<string, [number, number][]> }> = ({ b, local, f, look, lines }) => {
  const x0 = L + 30;
  const x1 = R - 30;
  const at = (r: number) => x1 - r * (x1 - x0);
  const v = makeView(look, STAGE, DIVAN, f, "gauge");
  const yBar = 1270;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 330, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, fontWeight: 800, fontSize: 72, color: ROOM.paper, textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>{b.label}</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="sb-risk" x1="1" x2="0">
            <stop offset="0%" stopColor="#3da5ff" />
            <stop offset="55%" stopColor={ROOM.amber} />
            <stop offset="100%" stopColor={ROOM.hit} />
          </linearGradient>
        </defs>
        {b.roads.map((r, i) => {
          const k = rise(local, 8 + i * 22, 30);
          const line = lines[r.key];
          if (!line) return null;
          const share = (1 - (r.risk ?? 0.5)) * k;
          const [lon, lat] = alongLine(line, share);
          const p = v.at(lon, lat);
          if (!p) return null;
          const ring = ((f + i * 12) % 36) / 36;
          return (
            <g key={`rider-${i}`}>
              <circle cx={p[0]} cy={p[1]} r={34 + ring * 40} fill="none" stroke={r.color} strokeWidth={4} opacity={(1 - ring) * k} />
              <circle cx={p[0]} cy={p[1]} r={34} fill={r.color} stroke="#ffffff" strokeWidth={4} opacity={Math.min(1, k * 3)} />
              <text x={p[0]} y={p[1] + 12} textAnchor="middle" fill={ROOM.bg} fontFamily={VAZIR} fontWeight={800} fontSize={34} opacity={Math.min(1, k * 3)}>
                {r.key}
              </text>
            </g>
          );
        })}
        <rect x={x0 - 20} y={yBar - 96} width={x1 - x0 + 40} height={170} rx={28} fill="rgba(22,32,50,0.82)" />
        <rect x={x0} y={yBar} width={x1 - x0} height={18} rx={9} fill="url(#sb-risk)" />
        <text x={x1} y={yBar + 58} textAnchor="end" fill={ROOM.mute} fontFamily={VAZIR} fontSize={38} fontWeight={700}>
          {b.ends[0]}
        </text>
        <text x={x0} y={yBar + 58} textAnchor="start" fill={ROOM.mute} fontFamily={VAZIR} fontSize={38} fontWeight={700}>
          {b.ends[1]}
        </text>
        {b.roads.map((r, i) => {
          const k = rise(local, 8 + i * 22, 30);
          const x = at((r.risk ?? 0.5) * k + 0 * (1 - k));
          return (
            <g key={i}>
              <path d={`M${x} ${yBar - 6} L${x - 14} ${yBar - 30} H${x + 14} Z`} fill={r.color} />
              <circle cx={x} cy={yBar - 58} r={28 + Math.sin(f / 6 + i) * 2} fill={r.color} opacity={Math.min(1, k * 3)} />
              <text x={x} y={yBar - 46} textAnchor="middle" fill={ROOM.bg} fontFamily={VAZIR} fontWeight={800} fontSize={30}>
                {r.key}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** The point at share s (0…1) of the way along a polyline of [lon, lat], on great circles. */
function alongLine(line: [number, number][], s: number): [number, number] {
  const legs = line.slice(1).map((p, i) => geoDistance(line[i], p));
  const all = legs.reduce((a, x) => a + x, 0) || 1;
  let want = Math.max(0, Math.min(1, s)) * all;
  for (let i = 0; i < legs.length; i += 1) {
    if (want <= legs[i] || i === legs.length - 1) return geoInterpolate(line[i], line[i + 1])(legs[i] ? Math.min(1, want / legs[i]) : 0) as [number, number];
    want -= legs[i];
  }
  return line[line.length - 1];
}

/** The line each road draws (its furthest comet, dashed line or claim), by the road's key. */
function roadLines(p: ReelContent): Record<string, [number, number][]> {
  const out: Record<string, [number, number][]> = {};
  for (const b of p.beats) {
    if (b.kind !== "road") continue;
    let best: [number, number][] | null = null;
    let len = -1;
    for (const m of b.marks ?? []) {
      if (m.kind !== "comet" && m.kind !== "dashed" && m.kind !== "claim") continue;
      const d = geoDistance(m.coords[0], m.coords[m.coords.length - 1]);
      if (d > len) {
        len = d;
        best = m.coords;
      }
    }
    if (best) out[b.road.key] = best;
  }
  return out;
}

const PollPic: React.FC<{ b: Extract<Beat, { kind: "poll" }>; local: number; view: number; f: number; badge?: string; len: number }> = ({ b, local, view, f, badge, len }) => {
  const badgeAt = Math.max(30, len - LOOP - 46);
  const bk = rise(local, badgeAt, 8) * (1 - interpolate(local, [len - LOOP - 6, len - LOOP], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 1010, left: L + 20, width: COLW - 40, direction: "rtl", display: "flex", flexDirection: "column", gap: 16 }}>
        {b.options.map((o, i) => {
          const k = rise(local, 8 + i * 12, 10);
          const glow = 0.5 + 0.5 * Math.sin((f - i * 10) / 6);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, background: "rgba(11,17,29,0.72)", border: `3px solid ${o.color}`, borderRadius: 24, padding: "10px 22px", transform: `translateX(${(1 - k) * 60}px)`, opacity: k, boxShadow: `0 0 ${20 + glow * 30}px ${o.color}55` }}>
              <div style={{ width: 70, height: 70, borderRadius: 999, background: o.color, color: ROOM.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 38, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{o.key}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 48, color: ROOM.paper }}>{o.title}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1345, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, display: "flex", flexDirection: "row", alignItems: "center", gap: 20, opacity: view >= 2 ? 1 : 0 }}>
        <div style={{ alignSelf: "flex-start", border: `3px solid ${ROOM.amber}`, color: ROOM.amber, fontWeight: 800, fontSize: 40, padding: "6px 22px", borderRadius: 999 }}>{b.chip}</div>
        <div style={{ color: ROOM.mute, fontWeight: 600, fontSize: 40, direction: "ltr", textAlign: "right" }}>{b.site}</div>
      </div>
      <div style={{ position: "absolute", left: L, top: 1420, opacity: bk, transform: `scale(${0.8 + 0.2 * bk})`, transformOrigin: "left center", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,176,32,0.14)", border: `2px solid ${ROOM.amber}`, borderRadius: 999, padding: "8px 22px", fontFamily: VAZIR, direction: "rtl" }}>
        <span style={{ color: ROOM.paper, fontWeight: 800, fontSize: 40 }}>{badge ?? "دیوان"}</span>
        <svg width={34} height={30} viewBox="0 0 24 22">
          <path d="M12 21 C-4 10 4 -2 12 5 C20 -2 28 10 12 21 Z" fill={ROOM.hit} />
        </svg>
        <span style={{ color: ROOM.amber, fontWeight: 800, fontSize: 36 }}>+ دنبال کن</span>
      </div>
      <Sfx at={badgeAt} name="badge" volume={0.4} />
    </AbsoluteFill>
  );
};

/** A state's demand at the table: its flag beside it on the map, what it wants, and the source. */
const DemandPic: React.FC<{ b: Extract<Beat, { kind: "demand" }>; local: number; view: number; color: string }> = ({ b, local, view, color }) => {
  const k = rise(local, 4, 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 330, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 24, transform: `translateX(${(1 - k) * -40}px)`, opacity: k }}>
        <FlagChip a3={b.a3} height={96} name={null} glow={`${color}66`} />
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 76, color, textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>{nameFa(b.a3)}</div>
      </div>
      <Source text={b.source} k={view >= 1 ? 1 : 0} />
    </AbsoluteFill>
  );
};

// ---------------- the frame ----------------

const Header: React.FC<{ s: Shot; local: number; big: boolean; color: string; arrive?: number }> = ({ s, local, big, color, arrive = 0 }) => {
  if (!s.text.header || s.picture.layer === "chart" || s.picture.layer === "number" || s.picture.layer === "road" || s.picture.layer === "gauge") return null;
  // words snap in (5 frames): a cross-fade caught half-way read as ghosted text on the judge's sheets (round 3A)
  const k = big ? 1 : rise(local, arrive, 5);
  return (
    <div style={{ position: "absolute", top: 330, left: L, width: COLW, direction: "rtl", textAlign: "right", fontFamily: VAZIR, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
      <div style={{ fontWeight: 800, fontSize: big ? 92 : 76, color, lineHeight: 1.22, textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}>{s.text.header}</div>
      {s.text.sub && s.picture.layer !== "poll" ? <div style={{ fontWeight: 700, fontSize: 48, color: ROOM.paper, marginTop: 8 }}>{s.text.sub}</div> : null}
    </div>
  );
};

/** The narrator's words, a few at a time, the one being said in amber (muted autoplay still reads the Reel). */
const Caption: React.FC<{ sb: Storyboard; f: number }> = ({ sb, f }) => {
  const t = f / sb.fps;
  if (f < 3) return null;
  const i = sb.words.findIndex((w) => t >= w.at - 0.05 && t < w.end + 0.15);
  if (i < 0) return null;
  const cue = sb.words[i].cue;
  const same = sb.words.map((w, j) => ({ ...w, j })).filter((w) => w.cue === cue);
  const pos = same.findIndex((w) => w.j === i);
  const start = Math.max(0, pos - (pos % 3));
  const chunk = same.slice(start, start + 3);
  return (
    <div style={{ position: "absolute", top: 1490, left: L, width: COLW, direction: "rtl", textAlign: "center", fontFamily: VAZIR, fontWeight: 700, fontSize: 46 }}>
      <span style={{ background: "rgba(13,19,34,0.78)", borderRadius: 16, padding: "6px 18px", boxDecorationBreak: "clone" }}>
        {chunk.map((w) => (
          <span key={w.j} style={{ color: w.j === i ? ROOM.amber : ROOM.paper }}>
            {w.text}{" "}
          </span>
        ))}
      </span>
    </div>
  );
};

/**
 * Round 8 (owner: «یک جعبهٔ راهنمای ثابت»): the words of a beat's numbered places in one fixed box above the source line:
 * a row an item, its disc on the right as on the map, plain Persian in at most two lines. A row comes in when its disc
 * lands on the map; the box keeps its full size from the beat's first frame, so nothing on the map moves for it.
 */
const LegendPanel: React.FC<{ items: LegendItem[]; tOf: (n: number) => number; hitOf: (n: number) => boolean; focus?: { n: number; t: number } }> = ({ items, tOf, hitOf, focus }) => {
  const { rows, box: full } = legendLayout(items);
  const k0 = Math.max(...rows.map((r) => tOf(r.n)));
  if (k0 < 0) return null;
  const pk = Math.min(1, (k0 + 1) / 8);
  // pass 3 (owner: «کادر راهنما از اول تمام‌قد است»): the box is as tall as the rows that have come, growing upward from
  // the source line as each row lands (eased over 8 frames); the rows above slide up to make room
  const grow = rows.map((r) => {
    const t = tOf(r.n);
    return t < 0 ? 0 : Easing.out(Easing.cubic)(Math.min(1, (t + 1) / 8));
  });
  const H = LEGEND_PAD * 2 - LEGEND_GAP + rows.reduce((n, r, i) => n + (r.h + LEGEND_GAP) * grow[i], 0);
  const box = { ...full, y: full.y + full.h - H, h: H };
  const tops = rows.map((_, i) => box.y + LEGEND_PAD + rows.slice(0, i).reduce((n, q, j) => n + (q.h + LEGEND_GAP) * grow[j], 0));
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <g opacity={pk}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={26} fill="rgba(14,21,33,0.9)" stroke="rgba(243,239,230,0.18)" strokeWidth={2} />
        {rows.map((r, ri) => {
          const t = tOf(r.n);
          if (t < 0) return null;
          const k = Math.min(1, (t + 1) / 10);
          const cx = box.x + box.w - 20 - 26;
          const top = tops[ri];
          const lh = r.size * 1.32;
          const ty = top + (r.h - (r.share !== undefined ? 44 : 0) - r.lines.length * lh) / 2;
          return (
            // pass 4: on a shot turned to a disc its row is lit (an amber bar beside it), the other rows step back
            <g key={r.n} opacity={k * (focus && r.n !== focus.n ? 1 - 0.45 * Math.min(1, focus.t / 10) : 1)} transform={`translate(${(1 - k) * 24} 0)`}>
              {focus && r.n === focus.n ? <rect x={box.x + 10} y={top - 4} width={box.w - 20} height={r.h + 8} rx={16} fill="rgba(255,176,32,0.12)" stroke="#ffb020" strokeWidth={3} opacity={Math.min(1, focus.t / 10)} /> : null}
              {r.n ? <Disc x={cx} y={top + Math.min(r.h / 2, 26 + 2)} n={r.n} r={24} hit={hitOf(r.n)} /> : null}
              {r.measure ? (
                <g transform={`translate(${cx} ${top + r.h / 2})`} stroke={DIVAN.accent} strokeWidth={5} strokeLinecap="round">
                  <path d="M0 -20 L0 20 M-11 -20 L11 -20 M-11 20 L11 20" fill="none" />
                </g>
              ) : null}
              {r.share !== undefined ? (
                <g>
                  <rect x={box.x + 26} y={top + r.h - 34} width={cx + 26 - box.x - 26} height={26} rx={13} fill="rgba(243,239,230,0.12)" stroke="rgba(243,239,230,0.35)" strokeWidth={2} />
                  <rect x={box.x + 26 + (cx + 26 - box.x - 26) * (1 - Math.min(1, t / 24) * r.share)} y={top + r.h - 34} width={(cx + 26 - box.x - 26) * Math.min(1, t / 24) * r.share} height={26} rx={13} fill={ROOM.amber} />
                </g>
              ) : null}
              {r.lines.map((l, j) => (
                <text key={j} x={cx - 26 - 18} y={ty + lh * (j + 0.78)} textAnchor="start" direction="rtl" fill={ROOM.paper} fontFamily={VAZIR} fontWeight={j === 0 ? 700 : 600} fontSize={r.size}>
                  {l}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** The camera at frame f: the shots' keys, and the room's one slow breath over the Reel (the same at its first and last frame). */
export function lookOfFrame(keys: Key[], f: number, total: number): Look {
  const base = lookAt(keys, f, false);
  const breath = Math.sin((2 * Math.PI * f) / total);
  return { ...base, span: base.span * (1 + 0.025 * breath), lon: base.lon + base.span * 0.004 * breath };
}

/**
 * Round 7: every word the map writes on frame f, with its box, as the renderer places it (tests/words.test.mjs walks a
 * Reel through this and asserts that no two meet, nor any meets the header or the source line).
 */
export function frameWords(p: ReelContent, sb: Storyboard, f: number) {
  const keys = cameraKeys(sb);
  const look = lookOfFrame(keys, f, sb.total);
  const inLoop = f >= sb.total - LOOP;
  const idx = Math.max(0, sb.shots.findIndex((s) => f >= Math.round(s.start * sb.fps) && f < Math.round((s.start + s.dur) * sb.fps)));
  const shot = sb.shots[idx] ?? sb.shots[0];
  const beat = p.beats[shot.beat];
  const view = makeView(look, STAGE, DIVAN, f);
  const list = marksAt(p, sb, f, inLoop);
  const lb = legendOn(beat, inLoop);
  const over = [...(!inLoop && beat.kind === "poll" ? [POLL_BOX] : []), ...(lb ? [lb] : [])];
  const words = layoutWords(view, refLookOf(sb, shot.beat), list, !inLoop && beat.kind === "map", look.span, over).words;
  return { look, shot, beat, words, list, view, legend: lb, over };
}

/** Round 8: the legend's box on this beat (null: none, or the loop's first picture). */
export function legendOn(beat: Beat, inLoop: boolean) {
  return !inLoop && (beat.kind === "map" || beat.kind === "hook") ? legendBox(beat.legend) : null;
}

/**
 * Round 8, the pre-delivery check's eyes (scripts/mapcheck.mjs): everything frame f draws on the map, where it is on the
 * frame and on the earth. Words (with their boxes), the panels over the map (header, source line, legend, poll), every
 * thing (each hull of a column of ships on its own, with its waterline), every numbered disc, every lane drawn, the
 * count's badge. The same functions the renderer runs.
 */
export function frameScene(p: ReelContent, sb: Storyboard, f: number) {
  const w = frameWords(p, sb, f);
  const { view, list } = w;
  type B = { x: number; y: number; w: number; h: number };
  const things: { id: string; floats: boolean; box: B; p: [number, number]; geo: [number, number] | null; sc: number; badge?: B; col?: number; k: number; pose?: Pose | null }[] = [];
  const discs: { n: number; sea: boolean; xy: [number, number]; geo: [number, number]; r: number }[] = [];
  const lanes: { id: string; coords: [number, number][] }[] = [];
  // pass 3: a column of ships as the line counts it, and how many of it are drawn on this frame
  const cols: { li: number; n: number; drawn: number; own: boolean }[] = [];
  list.forEach(({ m, t, life, base, opacity, own }, li) => {
    if (t < 0) return;
    if (m.kind === "lane") lanes.push({ id: m.id, coords: m.coords });
    if (m.kind === "marker") {
      const q = view.at(m.lon, m.lat);
      if (q) discs.push({ n: m.n, sea: m.sea, xy: q, geo: [m.lon, m.lat], r: MARKER_R });
    }
    if (m.kind !== "object" || (opacity !== undefined && opacity < 0.5)) return;
    if (m.move === "drop" || m.move === "arc" || m.move === "pipe") return;
    const fl = FLOATING.has(m.id);
    const col = m.move === "sail" && m.f0 !== undefined && m.count && m.count > 1 && m.count <= COLUMN_MAX ? columnOf(m, base, view.look.span) : null;
    if (col) {
      const c0 = things.length;
      for (let i = 0; i < col.n; i += 1) {
        const h = sailAt(m, f, i * col.gapKm);
        const q = h ? view.at(h.p[0], h.p[1]) : null;
        if (!h || !q) continue;
        const s2 = artScale(m.id) * (m.size ?? 1) * col.zoom;
        const hb = { x: q[0] - 135 * s2, y: q[1] - 120 * s2, w: 270 * s2, h: 140 * s2 };
        const pose = shipPose(view, h.way, h.s);
        const k = (fl ? wetK(view, q, s2, m.id, pose) : 1) * clearOfPanels(hb, [CHROME[0], ...w.over]);
        if (k) things.push({ id: m.id, floats: fl, p: q, geo: h.p, sc: s2, col: li, k, pose, box: { x: q[0] - 135 * s2, y: q[1] - 120 * s2, w: 270 * s2, h: 140 * s2 } });
      }
      cols.push({ li, n: col.n, drawn: things.length - c0, own: Boolean(own) });
      return;
    }
    const op = objectPoint(m, t, life ?? 90, base, view, f);
    if (!op) return;
    const k = (fl ? wetK(view, op.p, op.sc, m.id) : 1) * clearOfPanels(op.box, [CHROME[0], ...w.over]);
    if (!k) return;
    const badge = m.count && m.count > COLUMN_MAX ? { x: op.p[0] + 130 * op.sc * 0.62 - 34, y: op.p[1] - 120 * op.sc - 34 * 1.4, w: 68, h: 68 } : undefined;
    things.push({ id: m.id, floats: fl, p: op.p, geo: view.inv(op.p[0], op.p[1]), sc: op.sc, box: op.box, k, ...(badge ? { badge } : {}) });
  });
  return { ...w, things, discs, lanes, cols };
}

export const Reel: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const sb = p.storyboard;
  const fps = sb.fps;
  const total = sb.total;
  const loopAt = total - LOOP;
  const inLoop = f >= loopAt;
  const idx = Math.max(0, sb.shots.findIndex((s) => f >= Math.round(s.start * fps) && f < Math.round((s.start + s.dur) * fps)));
  const shot = sb.shots[idx] ?? sb.shots[0];
  const beat = p.beats[shot.beat];
  const beatStart = Math.round((sb.shots.find((s) => s.beat === shot.beat)?.start ?? 0) * fps);
  const local = f - Math.round(shot.start * fps);
  const beatLocal = f - beatStart;
  // pass 4: the header of a beat's flying first shot waits for the camera, and lands with the marks
  const arrive = arriveOf(sb.shots, shot, fps);
  const first = sb.shots.find((s) => s.beat === shot.beat);
  const arrive0 = first ? arriveOf(sb.shots, first, fps) : 0;
  // pass 4: the disc this shot turns to (director.ts), with frames since the shot began
  const focusOn = !inLoop && shot.motion.focus ? { n: shot.motion.focus, t: local } : undefined;
  const keys = React.useMemo(() => cameraKeys(sb), [sb]);
  const look = lookOfFrame(keys, f, total);
  const overMap = shot.picture.layer !== "map" && !inLoop;
  // a road drawn on the map keeps the map lit: the road is on it. Round 2: no picture puts the map out any more; a chart
  // or a figure dims it to half, the poll and the flags hardly at all (the judge: «a dimmed still behind the poll»)
  const roadOnMap = beat.kind === "road" && Boolean(beat.look);
  const dimTo = !overMap || roadOnMap || beat.kind === "flags" ? 0 : beat.kind === "poll" ? 0 : beat.kind === "gauge" || (beat.kind === "chart" && beat.chart.place) ? 0 : beat.kind === "chart" ? 0.25 : 0.5;
  const dim = interpolate(f, [beatStart, beatStart + 8], [0, dimTo], clamp) * (inLoop ? 0 : 1);
  // every shot over the map moves on its own: a slow push and a drift that turns at each cut, so no 2 s stand still
  const shotLen = Math.max(1, Math.round(shot.dur * fps));
  const sp = Math.min(1, local / shotLen);
  const push: React.CSSProperties = { position: "absolute", inset: 0, transform: `scale(${1 + 0.045 * sp}) translateX(${(shot.n % 2 ? -1 : 1) * 14 * sp}px)`, transformOrigin: "50% 45%" };
  const marks = marksAt(p, sb, f, inLoop);
  // the words that belong on the map, as labels with leader lines: a road's cost where its line ends, a state's demand
  // on its capital (round 2: no boxed cards)
  if (!inLoop && beat.kind === "road" && roadOnMap) {
    const end = roadEnd(beat);
    if (end) marks.push({ m: { kind: "callout", lon: end[0], lat: end[1], bold: beat.road.cost, color: beat.road.color }, t: beatLocal - 26, beat: shot.beat, own: true });
  }
  if (!inLoop && beat.kind === "road" && roadOnMap) {
    // a road's ground: the states its line joins, filled in the road's colour (Iran keeps its amber), so every road is
    // its own geography (round 2, the judge: «one thin diagonal line reused three times»)
    for (const a3 of statesOfRoad(beat)) marks.unshift({ m: { kind: "fill", a3, color: beat.road.color, pulse: true } as Mark, t: beatLocal, beat: shot.beat, own: true });
  }
  if (!inLoop && beat.kind === "demand" && beat.a3 !== "IRN") marks.unshift({ m: { kind: "fill", a3: beat.a3, color: colorOfA3(p, beat.a3), pulse: true } as Mark, t: beatLocal, beat: shot.beat, own: true });
  if (!inLoop && beat.kind === "demand") {
    const ll = CAPITALS[beat.a3] ?? country(beat.a3)?.centroid;
    if (ll) marks.push({ m: { kind: "callout", lon: ll[0], lat: ll[1], bold: beat.wants, sub: "می‌خواهد", color: colorOfA3(p, beat.a3) }, t: beatLocal - 20, beat: shot.beat, own: true });
  }
  // an incident lands: a red pin in its first half second flashes the edges of the screen (the turn is seen)
  const flash = marks.reduce((a, x) => (((x.m.kind === "pins" && x.m.color.toLowerCase() === ROOM.hit) || (x.m.kind === "marker" && x.m.hit)) && x.t >= 0 && x.t < 14 ? Math.max(a, 1 - x.t / 14) : a), 0);
  // round 8: the beat's legend (its numbered places' words) in its fixed band, each row with its disc as it lands
  const lb = legendOn(beat, inLoop);
  const legendItems = lb && (beat.kind === "map" || beat.kind === "hook") ? beat.legend ?? [] : [];
  const discT = (n: number) => marks.reduce((a, x) => (x.own && ((x.m.kind === "marker" && x.m.n === n) || (n === 0 && (x.m.kind === "share" || x.m.kind === "measure"))) ? Math.max(a, x.t) : a), -1);
  const discHit = (n: number) => marks.some((x) => x.own && x.m.kind === "marker" && x.m.n === n && x.m.hit);
  const hookShot = sb.shots[0];
  // the loop: the hook's words are back at once (6 frames), so the last second is the first picture, sharp
  const loopK = interpolate(f, [loopAt, loopAt + 6], [0, 1], clamp);
  const color = p.convention === "actors" ? DIVAN.actors.iran : ROOM.amber;
  // the beat's own colour, for a demand: its state's actor colour
  const demandColor = beat.kind === "demand" ? (p.beats.find((b) => b.kind === "map" || b.kind === "hook") ? colorOfA3(p, beat.a3) : ROOM.amber) : ROOM.amber;
  const lookFlags = true;
  const roadsShown = p.beats.filter((b) => b.kind === "road").map((b) => (b as Extract<Beat, { kind: "road" }>).road);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 42%, ${ROOM.bg2} 0%, ${ROOM.bg} 62%, ${ROOM.edge} 100%)` }}>
      <MapStage look={look} frame={STAGE} theme={DIVAN} f={f} dim={dim} bleed>
        <SeaDetail />
        <MapMarks list={marks} f={f} span={look.span} scale={!inLoop && beat.kind === "map"} refLook={refLookOf(sb, shot.beat)} over={[...(!inLoop && beat.kind === "poll" ? [POLL_BOX] : []), ...(lb ? [lb] : [])]} focus={focusOn} />
      </MapStage>
      {/* the scrims: the map runs under the header and the caption, darkened there so their words read */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 640, background: "linear-gradient(180deg, rgba(22,32,50,0.94) 0%, rgba(22,32,50,0.72) 55%, rgba(22,32,50,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 1330, width: 1080, height: 590, background: "linear-gradient(0deg, rgba(22,32,50,0.95) 0%, rgba(22,32,50,0.75) 60%, rgba(22,32,50,0) 100%)" }} />
      {lb ? <LegendPanel items={legendItems} tOf={discT} hitOf={discHit} focus={focusOn} /> : null}
      {flash > 0 ? <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${160 + 120 * flash}px rgba(255,77,64,${0.55 * flash})` }} /> : null}
      {!inLoop && beat.kind === "flags" ? <FlagsOnMap b={beat} local={beatLocal} look={look} f={f} /> : null}
      {/* the picture of this shot, over the dimmed map */}
      <div style={push}>
      {!inLoop && beat.kind === "chart" && !beat.chart.place ? <Chart chart={beat.chart} k={interpolate(beatLocal, [6, Math.max(20, sb.shots.filter((s) => s.beat === shot.beat).reduce((n, s) => n + s.dur, 0) * fps * 0.72)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })} f={f} showSource={shot.view >= 1} /> : null}
      {!inLoop && beat.kind === "number" ? <NumberPic b={beat} local={beatLocal} view={shot.view} /> : null}
      {!inLoop && beat.kind === "road" ? <RoadPic b={beat} local={beatLocal} view={roadOnMap ? Math.max(1, shot.view) : shot.view} f={f} aiLabel={p.ai_label} onMap={roadOnMap} /> : null}
      {!inLoop && beat.kind === "flags" && !lookFlags ? <FlagsPic b={beat} local={beatLocal} /> : null}
      {!inLoop && beat.kind === "poll" ? <PollPic b={beat} local={beatLocal} view={shot.view} f={f} badge={p.badge} len={sb.shots.filter((s) => s.beat === shot.beat).reduce((n, s) => n + Math.round(s.dur * fps), 0)} /> : null}
      {!inLoop && beat.kind === "demand" ? <DemandPic b={beat} local={beatLocal} view={shot.view} color={demandColor} /> : null}
      </div>
      {/* the pictures that stand on the map itself, outside the push (round 3) */}
      {!inLoop && beat.kind === "gauge" ? <GaugePic b={beat} local={beatLocal} f={f} look={look} lines={roadLines(p)} /> : null}
      {!inLoop && beat.kind === "chart" && beat.chart.place ? <PriceTag chart={beat.chart} k={interpolate(beatLocal, [6, Math.max(20, sb.shots.filter((s) => s.beat === shot.beat).reduce((n, s) => n + s.dur, 0) * fps * 0.6)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })} f={f} look={look} /> : null}
      {!inLoop && beat.kind === "map" ? <Source text={shot.text.source ?? beat.source} k={rise(beatLocal, Math.max(10, arrive0), 10)} top={lb ? LEGEND_SOURCE_TOP : undefined} /> : null}
      {!inLoop ? <Header s={shot} local={local} big={shot.beat === 0} arrive={arrive} color={shot.picture.layer === "poll" ? ROOM.amber : shot.beat === 0 ? ROOM.paper : color} /> : null}
      {/* the loop: the first picture's words come back */}
      {inLoop ? (
        <div style={{ opacity: loopK }}>
          <Header s={hookShot} local={99} big color={ROOM.paper} />
        </div>
      ) : null}
      <Hud p={p} f={f} active={inLoop ? -1 : roadsShown.findIndex((r) => beat.kind === "road" && beat.road.key === r.key)} roads={roadsShown} after={!inLoop && (beat.kind === "poll" || beat.kind === "gauge")} ai={!inLoop && beat.kind === "road" ? p.ai_label : undefined} />
      {/* the poll writes its own options and the badge sits where the caption would: no caption there */}
      {!inLoop && sb.voice.length > 0 && beat.kind !== "poll" && !lb && !marks.some((x) => x.own && x.t >= 0 && x.m.kind === "callout") ? <Caption sb={sb} f={f} /> : null}
      {sb.voice.map((v, i) => (
        <Sequence key={i} from={v.from} durationInFrames={v.frames + 6} layout="none">
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      {sb.shots.map((s) =>
        s.sound.sfx ? <Sfx key={s.n} at={Math.round(s.start * fps)} name={s.sound.sfx} volume={s.sound.sfx === "hit" ? 0.5 : s.sound.sfx === "pop" ? 0.28 : 0.34} /> : null,
      )}
    </AbsoluteFill>
  );
};

/** The states a road's line starts and ends in (point in polygon on Natural Earth), Iran left out. */
const STATE_CODES = Object.keys(NAMES_FA);
function stateAt(lon: number, lat: number): string | null {
  for (const a3 of STATE_CODES) {
    const c = country(a3);
    if (c && geoContains(c.geo, [lon, lat])) return a3;
  }
  return null;
}
const ROAD_STATES = new WeakMap<object, string[]>();
function statesOfRoad(b: Extract<Beat, { kind: "road" }>): string[] {
  const hit = ROAD_STATES.get(b);
  if (hit) return hit;
  const out = new Set<string>();
  for (const m of b.marks ?? []) {
    const pts = m.kind === "comet" || m.kind === "dashed" || m.kind === "claim" ? [m.coords[0], m.coords[m.coords.length - 1]] : m.kind === "pins" ? m.points.map((p) => [p.lon, p.lat] as [number, number]) : [];
    for (const [lon, lat] of pts) {
      // only a real place: a line that ends on a state's capital (a point drawn only to bend a line names no state)
      const a3 = stateAt(lon, lat);
      const cap = a3 ? CAPITALS[a3] : null;
      if (a3 && a3 !== "IRN" && cap && Math.hypot(cap[0] - lon, cap[1] - lat) < 1.5) out.add(a3);
    }
  }
  ROAD_STATES.set(b, [...out]);
  return [...out];
}

/** Where a road's line ends on the map: the last point of its comet, dashed line or claim, else its last pin. */
function roadEnd(b: Extract<Beat, { kind: "road" }>): [number, number] | null {
  const ms = b.marks ?? [];
  for (const m of [...ms].reverse()) if (m.kind === "comet" || m.kind === "dashed" || m.kind === "claim") return m.coords[m.coords.length - 1];
  for (const m of [...ms].reverse()) if (m.kind === "pins" && m.points.length) return [m.points[m.points.length - 1].lon, m.points[m.points.length - 1].lat];
  return null;
}

function colorOfA3(p: ReelContent, a3: string): string {
  for (const b of p.beats) {
    const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : b.kind === "demand" ? (b.marks ?? []) : [];
    for (const m of marks) if (m.kind === "fill" && m.a3 === a3) return m.color;
  }
  return ROOM.amber;
}

/** round 2: the AI label is said once, as a chip beside the kicker while the roads (Divan's analysis) are on screen */
const shortAi = (s?: string) => (s ? (s.includes("هوش مصنوعی") ? "تحلیل دیوان، هوش مصنوعی" : s) : "");
const Hud: React.FC<{ p: ReelContent; f: number; active: number; roads: { key: string; color: string }[]; after: boolean; ai?: string }> = ({ p, f, active, roads, after, ai }) => (
  <div style={{ position: "absolute", top: 236, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 18, fontFamily: VAZIR }}>
    <div style={{ background: ROOM.amber, color: ROOM.bg, fontWeight: 800, fontSize: 40, padding: "6px 24px", borderRadius: 999, whiteSpace: "nowrap", flex: "none" }}>{p.kicker}</div>
    {ai ? <div style={{ color: ROOM.paper, border: `2px solid ${ROOM.mute}`, fontWeight: 700, fontSize: 28, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>{shortAi(ai)}</div> : <div style={{ color: ROOM.mute, fontWeight: 700, fontSize: 38 }}>{p.date}</div>}
    <div style={{ flex: 1 }} />
    {roads.map((o, i) => {
      const on = i === active;
      const done = after || (active > i && active >= 0);
      return (
        <div key={i} style={{ width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 34, color: on ? ROOM.bg : done ? o.color : ROOM.mute, background: on ? o.color : "transparent", border: `3px solid ${on || done ? o.color : ROOM.line}`, transform: `scale(${on ? 1 + 0.06 * Math.sin(f / 5) : 1})` }}>
          {o.key}
        </div>
      );
    })}
  </div>
);

/** The tile on the profile grid: the room, the kicker, three or four big words, the roads' or actors' colours. */
export const ReelCover: React.FC<{ kicker: string; big: string; colors?: string[] }> = (c) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 38%, ${ROOM.bg2} 0%, ${ROOM.bg} 62%, ${ROOM.edge} 100%)`, direction: "rtl", fontFamily: VAZIR, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 860, display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
      <div style={{ background: ROOM.amber, color: ROOM.bg, fontWeight: 800, fontSize: 56, padding: "10px 36px", borderRadius: 999 }}>{c.kicker}</div>
      <div style={{ fontWeight: 800, fontSize: 132, color: ROOM.paper, lineHeight: 1.25 }}>{c.big}</div>
      <div style={{ display: "flex", gap: 24 }}>
        {(c.colors ?? ["#ff5a4e", "#3da5ff", "#2ed3a0"]).map((col, i) => (
          <div key={i} style={{ width: 70, height: 70, borderRadius: 20, background: col }} />
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 44, color: ROOM.mute }}>دیوان</div>
    </div>
  </AbsoluteFill>
);
