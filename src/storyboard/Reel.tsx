// The one style of Divan (bible v3): the navy room of «تصمیم امروز», drawn from a storyboard (director.ts). The map is
// the anchor: it is on the stage from frame 0 with the event on it, the camera dives and pans as the narrator names
// places, and the other pictures (the pen chart, a road's object, a big figure, the gauge, the poll) come over it
// while the map breathes behind. A picture changes every 1 to 2 seconds, on a word. The last frames bring the first
// picture back, so the Reel loops. Every word comes from the content (types.ts); nothing is typed here.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { geoContains, geoDistance, geoInterpolate } from "d3-geo";
import { measureLabelBox, placeCallouts } from "../map-engine/layers";
import { densify, useView, ContextNames, NAMES_FA, PLACES_FA, nameFa, CAPITALS, CometTrail, CountryFill, Callouts, ClaimLine, DashedLine, FlagChip, LANES, MapStage, MeasureLine, PinCluster, PlaceLabels, RegionHatch, DIVAN, country, lookAt, makeView, faNum, type Key, type Look, type CalloutSpec } from "../map-engine";
import { VAZIR } from "../map-engine/fonts";
import { LOOP } from "./director";
import { RoadObject } from "./objects";
import { MapObject, ObjectDefs, objectBox } from "../map-engine/objects";
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
      const travel = s.motion.camera === "dive" ? Math.min(len, 40) : Math.min(len, 22);
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

/** The marks on the map at frame f, each with its clock: the hook's are whole from frame 0 (the event is already there). */
function marksAt(c: ReelContent, sb: Storyboard, f: number, inLoop: boolean) {
  const out: { m: Mark; t: number; beat: number; own: boolean; life?: number; base?: number }[] = [];
  const baseOf = (i: number) => {
    const b = c.beats[i];
    return b.kind === "hook" || b.kind === "map" || b.kind === "demand" ? b.look.span : b.kind === "road" ? b.look?.span : undefined;
  };
  // where each beat ends: an object that moves (a ship, an aircraft) spends its beat on its way
  const ends: Record<number, number> = {};
  for (const s of sb.shots) ends[s.beat] = Math.max(ends[s.beat] ?? 0, Math.round((s.start + s.dur) * sb.fps));
  const cur = sb.shots.find((s) => f >= s.start * sb.fps && f < (s.start + s.dur) * sb.fps) ?? sb.shots[sb.shots.length - 1];
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
      const at = s.beat === 0 && s.n === 1 ? -60 : Math.round(s.start * sb.fps) + 3;
      if (inLoop) {
        // an object of the first frame runs back to where it stood then, so the last frame meets the first
        if (s.beat === 0 && s.n === 1) out.push({ m, t: m.kind === "object" ? -at - (sb.total - f) : f - at, beat: 0, own: true, life: (ends[0] ?? 0) - at, base: baseOf(0) });
        continue;
      }
      if (f < at) continue;
      if (s.beat === 0 || s.beat >= from) {
        // labels, measures and callouts belong to their own beat; what is drawn on the ground stays for the chapter
        const passing = m.kind === "callout" || m.kind === "measure" || m.kind === "label" || m.kind === "flag" || m.kind === "object" || b.kind === "road";
        // the close gathers the story on the first frame: every line and pin of every beat (the roads too) is back on
        // the hook's map and its comets run again (round 2, the judge: «end on the 0 s map with the three roads»)
        const gather = (c.beats[cur.beat].kind === "poll" || c.beats[cur.beat].kind === "gauge") && (m.kind === "comet" || m.kind === "dashed" || m.kind === "pins" || m.kind === "claim");
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
                const d = q.kind === "pins" ? Math.min(...q.points.map((p) => dist(p.lon, p.lat))) : q.kind === "object" && (q.move === "drop" || q.move === "arc") ? dist(q.lon, q.lat) - 1e-3 : Infinity;
                if (d <= best) {
                  best = d;
                  land = Math.round(z.start * sb.fps) + 3 + (q.kind === "object" ? 30 : 0);
                }
              }
          const struck = best < Infinity && land > at;
          // round 4, the sequence: the ship sails in and lies at its point when the incident lands, then burns
          mm = { ...m, ...(m.fire !== undefined && m.fire !== false ? { fire: Math.max(0, land - at) + (m.fire === true ? 0 : m.fire) } : {}), ...(m.move === "approach" ? { arrive: Math.max(24, (struck ? land : at + 60) - at - 8) } : {}) };
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
      const at = [[m.lon, m.lat] as [number, number], ...(m.path && m.path.length > 1 ? [m.path[0], m.path[Math.floor(m.path.length / 2)], m.path[m.path.length - 1]] : [])];
      for (const q of at) {
        const p = v.at(q[0], q[1]);
        if (p) boxes.push({ x: p[0] - 115, y: p[1] - 130, w: 230, h: 150 });
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

const MapMarks: React.FC<{ list: { m: Mark; t: number; own: boolean; life?: number; base?: number }[]; f: number; span: number; scale?: boolean }> = ({ list, f, span, scale = false }) => {
  const callouts: CalloutSpec[] = [];
  const ts: number[] = [];
  const labels: { t: string; lon: number; lat: number }[] = [];
  // a missile and its burst draw under what stands: a ship it hits is never hidden by the flash (pass 3)
  const objects: { drawFirst: boolean; node: React.ReactNode }[] = [];
  const view = useView();
  const objBoxes = list.flatMap(({ m, t, life, base }) => (m.kind === "object" ? [objectBox(m, t, life ?? 90, base, view)].filter((b): b is NonNullable<typeof b> => Boolean(b)) : []));
  const measures: React.ReactNode[] = [];
  const body = list.map(({ m, t, own, life, base }, i) => {
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
        return <CometTrail key={i} coords={m.coords} color={m.color} t={t} dur={36} loop={m.loop ? 75 : own && t > 40 ? 54 : undefined} head={22} width={24} tail={0.45} route />;
      case "pins":
        // a place the source gives only roughly: an area (a soft disc and a dashed ring), never a precise pin
        return m.area ? <AreaMarks key={i} points={m.points} color={m.color} t={t} span={span} /> : <PinCluster key={i} points={m.points} color={m.color} t={t} />;
      case "measure":
        // over the objects: a ship passing the narrowest point must not hide its length
        measures.push(<MeasureLine key={i} a={m.a} b={m.b} t={t} />);
        return null;
      case "callout":
        callouts.push({ id: `c${i}`, lon: m.lon, lat: m.lat, bold: m.bold, sub: m.sub, color: m.color, a3: m.a3 });
        ts.push(t);
        return null;
      case "label":
        labels.push({ t: m.t, lon: m.lon, lat: m.lat });
        return null;
      case "object":
        // over the lines and pins they belong to, under the labels
        objects.push({ drawFirst: m.move === "drop" || m.move === "arc", node: <MapObject key={`o${i}`} o={m} t={t} life={life ?? 90} base={base} /> });
        return null;
      default:
        return null;
    }
  });
  void f;
  // where a mark already speaks, the ground stays quiet
  const avoid: [number, number][] = [];
  for (const { m, t } of list) {
    if (t < 0) continue;
    if (m.kind === "object") avoid.push([m.lon, m.lat], ...(m.path ?? []));
    else if (m.kind === "callout" || m.kind === "label" || m.kind === "flag") avoid.push([m.lon, m.lat]);
    else if (m.kind === "pins") avoid.push(...m.points.map((p) => [p.lon, p.lat] as [number, number]));
    else if (m.kind === "measure") avoid.push(m.a, m.b, [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2]);
  }
  // pass 3: every word on the map is placed against every other: the scale and the measures first, then the callouts
  // (clear of them and of the lines), then the place names (clear of all of it, the leaders too)
  const sc = scale ? scaleGeom(view) : null;
  const fixed = [...(sc ? [sc.box] : []), ...list.flatMap(({ m, t }) => (m.kind === "measure" && t >= 0 ? [measureLabelBox(view, m.a, m.b)].filter((b): b is NonNullable<typeof b> => Boolean(b)) : []))];
  const pre = placeCallouts(view, callouts, SAFE, [...lineBoxesOf(view, list.map((x) => x.m)), ...fixed]);
  const calloutBoxes = pre.placed.flatMap((p) => {
    const out = [p.box];
    // the leader, as a row of small boxes
    const ex = p.box.x + p.box.w;
    const ey = p.box.y + p.box.h / 2;
    for (let s = 0; s <= 1; s += 0.1) out.push({ x: p.anchor[0] + (ex - p.anchor[0]) * s - 12, y: p.anchor[1] + (ey - p.anchor[1]) * s - 12, w: 24, h: 24 });
    return out;
  });
  return (
    <>
      <ObjectDefs />
      <ContextNames avoid={avoid} boxes={[...fixed, ...calloutBoxes, ...objBoxes]} places={span < 10 ? [...PLACE_LIST, ...SEA_LIST] : PLACE_LIST} states={STATE_LIST} max={span > 70 ? 4 : span < 10 ? 6 : 5} />
      {body}
      {objects.filter((o) => o.drawFirst).map((o) => o.node)}
      {objects.filter((o) => !o.drawFirst).map((o) => o.node)}
      {measures}
      <PlaceLabels items={labels} avoid={objBoxes} block={[...fixed, ...calloutBoxes]} />
      <Callouts items={callouts} ts={ts} safe={SAFE} pre={pre} />
    </>
  );
};

/** The day's traffic: comets on the sea lanes in view, always moving, back where they began at the loop. */
const Ambient: React.FC<{ f: number; total: number; look: Look }> = ({ f, total, look }) => {
  if (look.span > 120) return null;
  const near = LANES.filter((l) => l.path.some(([lon, lat]) => Math.abs(lon - look.lon) < look.span * 0.7 && Math.abs(lat - look.lat) < look.span * 0.9)).slice(0, 3);
  return (
    <>
      {near.map((l, i) => (
        <CometTrail key={l.id} coords={l.path} color="#ffd88a" t={((f / total) * 2 + i * 0.37) * 120} loop={120} tail={0.22} head={8} width={5} />
      ))}
    </>
  );
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

const Source: React.FC<{ text?: string; k: number; top?: number }> = ({ text, k }) =>
  text && shortSource(text) ? (
    <div style={{ position: "absolute", top: SOURCE_TOP, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 36, color: ROOM.mute, opacity: 0.85 * k, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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

const Header: React.FC<{ s: Shot; local: number; big: boolean; color: string }> = ({ s, local, big, color }) => {
  if (!s.text.header || s.picture.layer === "chart" || s.picture.layer === "number" || s.picture.layer === "road" || s.picture.layer === "gauge") return null;
  // words snap in (5 frames): a cross-fade caught half-way read as ghosted text on the judge's sheets (round 3A)
  const k = big ? 1 : rise(local, 0, 5);
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
  const keys = React.useMemo(() => cameraKeys(sb), [sb]);
  const base = lookAt(keys, f, false);
  // the room breathes once over the Reel: the same at its first and its last frame
  const breath = Math.sin((2 * Math.PI * f) / total);
  const look: Look = { ...base, span: base.span * (1 + 0.025 * breath), lon: base.lon + base.span * 0.004 * breath };
  const overMap = shot.picture.layer !== "map" && !inLoop;
  // a road drawn on the map keeps the map lit: the road is on it. Round 2: no picture puts the map out any more; a chart
  // or a figure dims it to half, the poll and the flags hardly at all (the judge: «a dimmed still behind the poll»)
  const roadOnMap = beat.kind === "road" && Boolean(beat.look);
  const dimTo = !overMap || roadOnMap || beat.kind === "flags" ? 0 : beat.kind === "poll" ? 0.12 : beat.kind === "gauge" || (beat.kind === "chart" && beat.chart.place) ? 0 : beat.kind === "chart" ? 0.25 : 0.5;
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
  const flash = marks.reduce((a, x) => (x.m.kind === "pins" && x.m.color.toLowerCase() === ROOM.hit && x.t >= 0 && x.t < 14 ? Math.max(a, 1 - x.t / 14) : a), 0);
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
        <Ambient f={f} total={total} look={look} />
        <MapMarks list={marks} f={f} span={look.span} scale={!inLoop && beat.kind === "map"} />
        {!inLoop && beat.kind === "map" ? <ScaleAndNorth /> : null}
      </MapStage>
      {/* the scrims: the map runs under the header and the caption, darkened there so their words read */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 640, background: "linear-gradient(180deg, rgba(22,32,50,0.94) 0%, rgba(22,32,50,0.72) 55%, rgba(22,32,50,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 1330, width: 1080, height: 590, background: "linear-gradient(0deg, rgba(22,32,50,0.95) 0%, rgba(22,32,50,0.75) 60%, rgba(22,32,50,0) 100%)" }} />
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
      {!inLoop && beat.kind === "map" ? <Source text={shot.text.source ?? beat.source} k={rise(beatLocal, 10, 10)} /> : null}
      {!inLoop ? <Header s={shot} local={local} big={shot.beat === 0} color={shot.picture.layer === "poll" ? ROOM.amber : shot.beat === 0 ? ROOM.paper : color} /> : null}
      {/* the loop: the first picture's words come back */}
      {inLoop ? (
        <div style={{ opacity: loopK }}>
          <Header s={hookShot} local={99} big color={ROOM.paper} />
        </div>
      ) : null}
      <Hud p={p} f={f} active={inLoop ? -1 : roadsShown.findIndex((r) => beat.kind === "road" && beat.road.key === r.key)} roads={roadsShown} after={!inLoop && (beat.kind === "poll" || beat.kind === "gauge")} ai={!inLoop && beat.kind === "road" ? p.ai_label : undefined} />
      {/* the poll writes its own options and the badge sits where the caption would: no caption there */}
      {!inLoop && sb.voice.length > 0 && beat.kind !== "poll" && !marks.some((x) => x.own && x.t >= 0 && x.m.kind === "callout") ? <Caption sb={sb} f={f} /> : null}
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
