// The map's layers (map-engine-fa.md §3). Each reads the view from <MapStage> and its own clock `t`: the frames
// since it came in (negative: not yet). Every distance is measured from the data (world.ts km), never typed in.
import React from "react";
import { geoInterpolate, geoDistance } from "d3-geo";
import { useView } from "./MapStage";
import { country, km } from "./world";
import { VAZIR } from "./fonts";
import { place, textWidth, type Box } from "./labels";
import { flagArt, flagAspect } from "./flags";

const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
const out3 = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const pop = (u: number) => {
  const x = clamp01(u);
  return x < 0.7 ? (x / 0.7) * 1.18 : 1.18 - ((x - 0.7) / 0.3) * 0.18;
};
export const faNum = (n: number, digits = 0) => n.toLocaleString("fa-IR", { maximumFractionDigits: digits, minimumFractionDigits: digits, useGrouping: true });

/** Points along a polyline of [lon, lat], every `stepDeg` degrees of arc at most, on great circles. */
export function densify(coords: [number, number][], stepDeg = 0.08): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < coords.length - 1; i += 1) {
    const a = coords[i];
    const b = coords[i + 1];
    const n = Math.max(1, Math.ceil(((geoDistance(a, b) * 180) / Math.PI) / stepDeg));
    const at = geoInterpolate(a, b);
    for (let k = 0; k < n; k += 1) out.push(at(k / n) as [number, number]);
  }
  out.push(coords[coords.length - 1]);
  return out;
}

const line = (pts: ([number, number] | null)[]) => {
  let d = "";
  let pen = false;
  for (const p of pts) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    pen = true;
  }
  return d;
};

/** A state or region filling with its colour: a disc that opens from its centre (0.4 s), with a glow inside its edge. */
export const CountryFill: React.FC<{ a3: string; color: string; t: number; dur?: number; opacity?: number; edge?: boolean; /** breathe while it is the beat's subject */ pulse?: boolean }> = ({ a3, color, t, dur = 12, opacity = 0.62, edge = true, pulse = false }) => {
  const v = useView();
  const c = country(a3);
  if (!c || t < 0) return null;
  const d = v.path(c.geo);
  if (!d) return null;
  const centre = v.at(c.centroid[0], c.centroid[1]) ?? [v.frame.x + v.frame.w / 2, v.frame.y + v.frame.h / 2];
  const k = out3(t / dur);
  const id = `${v.uid}-fill-${a3}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          {/* the disc must reach the whole frame however far the centroid is (a close dive puts it thousands of px away) */}
          <circle cx={centre[0]} cy={centre[1]} r={k >= 0.999 ? 1e6 : k * (Math.hypot(centre[0] - (v.frame.x + v.frame.w / 2), centre[1] - (v.frame.y + v.frame.h / 2)) + 1500)} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={color} opacity={opacity * (pulse ? 1 + 0.35 * Math.sin(t / 7) : 1)} />
        {edge ? <path d={d} fill="none" stroke={color} strokeWidth={10} opacity={0.55} filter={`url(#${v.uid}-glow)`} /> : null}
        <path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1.5} />
      </g>
    </g>
  );
};

/** A contested or occupied area: diagonal hatching in the claimant's colour, never a solid fill (the map gate's rule). */
export const RegionHatch: React.FC<{ a3?: string; polygon?: [number, number][]; color: string; t: number; angle?: number }> = ({ a3, polygon, color, t, angle = 45 }) => {
  const v = useView();
  if (t < 0) return null;
  const geo = a3 ? country(a3)?.geo : polygon ? { type: "Polygon", coordinates: [[...polygon, polygon[0]]] } : null;
  if (!geo) return null;
  const d = v.path(geo);
  const id = `${v.uid}-hatch-${a3 ?? "p"}`;
  const k = clamp01(t / 10);
  return (
    <g opacity={k}>
      <defs>
        <pattern id={id} width={18} height={18} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle}) translate(${(v.f * 0.4) % 18} 0)`}>
          <rect width={18} height={18} fill={color} opacity={0.12} />
          <line x1={0} y1={0} x2={0} y2={18} stroke={color} strokeWidth={4} opacity={0.6} />
        </pattern>
      </defs>
      <path d={d} fill={`url(#${id})`} stroke={color} strokeWidth={3} strokeDasharray="10 8" strokeOpacity={0.8} />
    </g>
  );
};

/** A claim line or a new border, drawn along its length with a glow. */
export const ClaimLine: React.FC<{ coords: [number, number][]; color: string; t: number; dur?: number; width?: number }> = ({ coords, color, t, dur = 24, width = 6 }) => {
  const v = useView();
  if (t < 0) return null;
  const d = line(densify(coords).map(([a, b]) => v.at(a, b)));
  const k = out3(t / dur);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={width * 3} opacity={0.5} filter={`url(#${v.uid}-glow)`} pathLength={1} strokeDasharray={`${k} 1`} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${k} 1`} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

/** A blockade, a red line, a ceasefire line: big dashes that pop in one after another. */
export const DashedLine: React.FC<{ coords: [number, number][]; color: string; t: number; gap?: number; width?: number }> = ({ coords, color, t, gap = 1.6, width = 9 }) => {
  const v = useView();
  if (t < 0) return null;
  const pts = densify(coords, 0.02).map(([a, b]) => v.at(a, b));
  // dashes of about 34 px on the screen, whatever the zoom
  const dashes: [number, number, number, number][] = [];
  let acc = 0;
  let on = true;
  let start: [number, number] | null = null;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b) continue;
    acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (on && !start) start = a;
    if (on && acc >= 34) {
      dashes.push([start![0], start![1], b[0], b[1]]);
      on = false;
      acc = 0;
      start = null;
    } else if (!on && acc >= 22) {
      on = true;
      acc = 0;
    }
  }
  return (
    <g>
      {dashes.map(([x1, y1, x2, y2], i) => {
        const k = pop((t - i * gap) / 6);
        if (k <= 0) return null;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={i} transform={`translate(${mx} ${my}) scale(${k}) translate(${-mx} ${-my})`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width * 2.4} opacity={0.35} filter={`url(#${v.uid}-soft)`} strokeLinecap="round" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
};

/**
 * Something on the move (a ship, a convoy, money between states): a bright head on a great-circle path with a tail of
 * fading points, glowing. `progress` 0…1 is where the head is; a looping comet passes `loop` frames per trip.
 */
export const CometTrail: React.FC<{ coords: [number, number][]; color: string; t: number; dur?: number; loop?: number; tail?: number; head?: number; width?: number; /** the line it leaves behind on the map (round 2: a road reads as a line on the map, not a card) */ route?: boolean }> = ({ coords, color, t, dur = 40, loop, tail = 0.22, head = 9, width = 5, route = false }) => {
  const v = useView();
  const pts = React.useMemo(() => densify(coords, 0.05), [coords]);
  if (t < 0) return null;
  const p = loop ? (t % loop) / loop : out3(t / dur);
  const n = pts.length - 1;
  const hi = p * n;
  const lo = Math.max(0, hi - tail * n * (loop ? 1 : Math.min(1, p * 3)));
  const seg: React.ReactNode[] = [];
  const parts = 28;
  for (let i = 0; i < parts; i += 1) {
    const a = lo + ((hi - lo) * i) / parts;
    const b = lo + ((hi - lo) * (i + 1)) / parts;
    const A = v.at(...pts[Math.floor(a)]);
    const B = v.at(...pts[Math.min(n, Math.ceil(b))]);
    if (!A || !B) continue;
    const w = (i + 1) / parts;
    seg.push(<line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={color} strokeWidth={width * (0.3 + w)} strokeOpacity={w * w * 0.9} strokeLinecap="round" />);
  }
  const H = v.at(...pts[Math.min(n, Math.round(hi))]);
  const fade = loop ? Math.min(1, Math.min(p, 1 - p) * 8) : 1;
  // the route: the whole way drawn up to the head, a steady line under the comet that stays when it has passed
  const trace = route ? line(pts.slice(0, Math.max(1, Math.round(loop ? n : hi)) + 1).map(([a, b]) => v.at(a, b))) : "";
  return (
    <g style={{ mixBlendMode: "screen" }} opacity={fade}>
      {trace ? <path d={trace} fill="none" stroke={color} strokeWidth={width * 2.6} opacity={0.22} filter={`url(#${v.uid}-glow)`} strokeLinecap="round" /> : null}
      {trace ? <path d={trace} fill="none" stroke={color} strokeWidth={Math.max(2.5, width * 0.5)} opacity={0.75} strokeLinecap="round" strokeLinejoin="round" /> : null}
      <g filter={`url(#${v.uid}-glow)`} opacity={0.8}>{seg}</g>
      <g filter={`url(#${v.uid}-soft)`}>{seg}</g>
      {seg}
      {H ? (
        <g>
          <circle cx={H[0]} cy={H[1]} r={head * 2.4} fill={color} opacity={0.55} filter={`url(#${v.uid}-glow)`} />
          <circle cx={H[0]} cy={H[1]} r={head} fill="#fffaf0" />
        </g>
      ) : null}
    </g>
  );
};

/** Pins that pop one after another (bases, cities, events); a counter can read how many are in. */
export const PinCluster: React.FC<{ points: { lon: number; lat: number }[]; color: string; t: number; gap?: number; r?: number; ring?: boolean }> = ({ points, color, t, gap = 2.4, r = 13, ring = true }) => {
  const v = useView();
  if (t < 0) return null;
  return (
    <g>
      {points.map((p, i) => {
        const at = v.at(p.lon, p.lat);
        const k = pop((t - i * gap) / 7);
        if (!at || k <= 0) return null;
        const pulse = ((v.f + i * 9) % 45) / 45;
        return (
          <g key={i}>
            {ring ? <circle cx={at[0]} cy={at[1]} r={r + pulse * r * 2.4} fill="none" stroke={color} strokeWidth={3} opacity={(1 - pulse) * 0.8} /> : null}
            {/* the landing: one wide shock ring in the first 0.6 s */}
            {t - i * gap < 18 ? <circle cx={at[0]} cy={at[1]} r={r + out3((t - i * gap) / 18) * r * 9} fill="none" stroke={color} strokeWidth={6 * (1 - out3((t - i * gap) / 18))} opacity={1 - out3((t - i * gap) / 18)} /> : null}
            <circle cx={at[0]} cy={at[1]} r={r * k} fill={color} stroke="#ffffff" strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
};

/** How many pins of a cluster are in at clock t (for a counter beside it). */
export const pinsIn = (n: number, t: number, gap = 2.4) => Math.max(0, Math.min(n, Math.floor(t / gap) + 1));

/** A measure between two points, its length read from the data: «۵۴ کیلومتر». */
export const MeasureLine: React.FC<{ a: [number, number]; b: [number, number]; t: number; color?: string; size?: number; label?: string }> = ({ a, b, t, color, size = 64, label }) => {
  const v = useView();
  if (t < 0) return null;
  const A = v.at(...a);
  const B = v.at(...b);
  if (!A || !B) return null;
  const c = color ?? v.theme.accent;
  const k = out3(t / 14);
  const x2 = A[0] + (B[0] - A[0]) * k;
  const y2 = A[1] + (B[1] - A[1]) * k;
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const nx = -Math.sin(ang) * 18;
  const ny = Math.cos(ang) * 18;
  const text = label ?? `${faNum(Math.round(km(a, b)))} کیلومتر`;
  const mx = (A[0] + B[0]) / 2;
  const my = (A[1] + B[1]) / 2;
  const tk = clamp01((t - 12) / 8);
  return (
    <g>
      <line x1={A[0]} y1={A[1]} x2={x2} y2={y2} stroke={c} strokeWidth={5} />
      <line x1={A[0] - nx} y1={A[1] - ny} x2={A[0] + nx} y2={A[1] + ny} stroke={c} strokeWidth={5} />
      {k > 0.98 ? <line x1={B[0] - nx} y1={B[1] - ny} x2={B[0] + nx} y2={B[1] + ny} stroke={c} strokeWidth={5} /> : null}
      {/* bare words with a soft shadow, no box (the owner's decision on map labels, 21 Nov 2026) */}
      <g opacity={tk} transform={`translate(${mx + nx * 3.2} ${my + ny * 3.2})`} style={{ filter: "drop-shadow(0 3px 10px rgba(5,9,16,0.95)) drop-shadow(0 0 3px rgba(5,9,16,0.9))" }}>
        <text x={0} y={size * 0.28} textAnchor="middle" direction="rtl" fill={c} fontFamily={VAZIR} fontWeight={800} fontSize={size}>
          {text}
        </text>
      </g>
    </g>
  );
};

export type CalloutSpec = { id: string; lon: number; lat: number; bold: string; sub?: string; color?: string; size?: number; /** whose claim it is: its flag beside the words */ a3?: string };

/**
 * Labels with leader lines: one bold word and one line under it, placed so no two meet and none leaves the safe frame
 * (labels.ts). The placement is made once from `placeView` (the shot's own look), so the labels never jump; the
 * leader is drawn from the label's right edge, where a Persian line starts.
 */
/**
 * How a label fits the safe frame (round 3; pass 2D cut «به گفتهٔ آمریکا: هرمز باز بماند» at the left edge): the
 * bold line at 60 px if it fits, else smaller down to 44 px, else broken into two lines at the space nearest its middle
 * (at the largest size that then fits). Returns the size, the lines and the box.
 */
export function fitCallout(c: { bold: string; sub?: string; a3?: string; size?: number }, maxW: number) {
  const flag = c.a3 && flagArt(c.a3) ? 1.3 : 0;
  const widthOf = (lines: string[], size: number) => Math.max(...lines.map((l) => textWidth(l, size)), c.sub ? textWidth(c.sub, size * 0.72) : 0) + 34 + flag * size;
  const top = c.size ?? 60;
  const sizes = [top, 56, 52, 48, 44].filter((s) => s <= top);
  let lines = [c.bold];
  let size = sizes.find((s) => widthOf(lines, s) <= maxW);
  if (!size) {
    const words = c.bold.split(" ");
    if (words.length > 1) {
      let best = 1;
      for (let i = 1; i < words.length; i += 1) if (Math.abs(words.slice(0, i).join(" ").length - c.bold.length / 2) < Math.abs(words.slice(0, best).join(" ").length - c.bold.length / 2)) best = i;
      lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
    }
    size = sizes.find((s) => widthOf(lines, s) <= maxW) ?? sizes[sizes.length - 1];
  }
  const w = Math.min(maxW, widthOf(lines, size));
  const h = size * 1.35 * lines.length - (lines.length - 1) * size * 0.15 + (c.sub ? size * 0.95 : 0) + 18;
  return { size, lines, w, h };
}

export const Callouts: React.FC<{ items: CalloutSpec[]; ts: number[]; safe: Box; taken?: Box[] }> = ({ items, ts, safe, taken = [] }) => {
  const v = useView();
  const fits = items.map((c) => fitCallout(c, safe.w));
  const wants = items.map((c, i) => {
    const at = v.at(c.lon, c.lat) ?? [-999, -999];
    return { id: c.id, x: at[0], y: at[1], w: fits[i].w, h: fits[i].h, prio: items.length - i };
  });
  // round 2: a label stands 56 px off its point on a leader, so it never lies on the coast or the line it names
  const placed = place(wants, safe, taken, 56);
  return (
    <g>
      {items.map((c, i) => {
        const t = ts[i] ?? 0;
        if (t < 0) return null;
        const p = placed.find((x) => x.id === c.id);
        const at = v.at(c.lon, c.lat);
        if (!p || !at) return null;
        // round 4: a callout whose point is off the frame is not drawn (a label floating far from its place misleads)
        if (at[0] < v.frame.x - 20 || at[0] > v.frame.x + v.frame.w + 20 || at[1] < v.frame.y - 20 || at[1] > v.frame.y + v.frame.h + 20) return null;
        const col = c.color ?? v.theme.ink;
        const { size, lines } = fits[i];
        const line = size * 1.2;
        const k = out3(t / 10);
        const bx = p.box.x;
        const by = p.box.y;
        const ex = p.box.x + p.box.w;
        const ey = by + p.box.h / 2;
        const lead = Math.hypot(ex - at[0], ey - at[1]) > 30;
        return (
          <g key={c.id} opacity={k}>
            {lead ? <path d={`M${at[0]} ${at[1]} L${ex + 6} ${ey}`} stroke={col} strokeWidth={3} pathLength={1} strokeDasharray={`${k} 1`} fill="none" /> : null}
            <circle cx={at[0]} cy={at[1]} r={7} fill={col} />
            {/* the owner's decision (21 Nov 2026), as on @atlynxmaps: bare words with a soft shadow on a leader line, never a box */}
            <g transform={`translate(0 ${(1 - k) * 14})`} style={{ filter: "drop-shadow(0 3px 10px rgba(5,9,16,0.95)) drop-shadow(0 0 3px rgba(5,9,16,0.9))" }}>
              {lines.map((l, j) => (
                <text key={j} x={ex - 22} y={by + size * 1.08 + j * line} textAnchor="start" direction="rtl" fill={col} fontFamily={VAZIR} fontWeight={800} fontSize={size}>
                  {l}
                </text>
              ))}
              {c.a3 && flagArt(c.a3) ? (
                <svg x={bx + 14} y={by + p.box.h / 2 - size * 0.42} width={size * 0.84 * flagAspect(c.a3)} height={size * 0.84} viewBox={`0 0 ${c.a3 === "IRN" ? 200 * flagAspect(c.a3) : 300} 200`} preserveAspectRatio="none">
                  {flagArt(c.a3)}
                </svg>
              ) : null}
              {c.sub ? (
                <text x={ex - 22} y={by + size * 1.08 + (lines.length - 1) * line + size * 0.95} textAnchor="start" direction="rtl" fill={v.theme.ink} fontFamily={VAZIR} fontWeight={700} fontSize={size * 0.72}>
                  {c.sub}
                </text>
              ) : null}
            </g>
          </g>
        );
      })}
    </g>
  );
};

/**
 * The ground's own names (round 2, the judge: «Oman and the UAE are not named», «no names beyond Iran»): the seas,
 * cities and states whose point is in the frame, quiet and small, nearest the centre first, never within 150 px of a
 * mark that speaks (`avoid`) nor of each other. At most `max`; none on the whole globe but the states.
 */
export const ContextNames: React.FC<{ avoid: [number, number][]; max?: number; places: { t: string; lon: number; lat: number }[]; states: { t: string; lon: number; lat: number }[] }> = ({ avoid, max = 5, places, states }) => {
  const v = useView();
  const cx = v.frame.x + v.frame.w / 2;
  const cy = v.frame.y + v.frame.h / 2;
  const zone = { x0: 90, x1: 990, y0: 640, y1: 1360 };
  const taken: [number, number][] = avoid.map(([lon, lat]) => v.at(lon, lat)).filter((p): p is [number, number] => Boolean(p));
  const pool = (v.look.span > 70 ? states : [...places, ...states]).map((p) => ({ ...p, at: v.at(p.lon, p.lat) })).filter((p) => p.at && p.at[0] > zone.x0 && p.at[0] < zone.x1 && p.at[1] > zone.y0 && p.at[1] < zone.y1) as { t: string; at: [number, number] }[];
  pool.sort((a, b) => Math.hypot(a.at[0] - cx, a.at[1] - cy) - Math.hypot(b.at[0] - cx, b.at[1] - cy));
  const out: { t: string; at: [number, number] }[] = [];
  for (const p of pool) {
    if (out.length >= max) break;
    if (taken.some((q) => Math.hypot(q[0] - p.at[0], q[1] - p.at[1]) < 150)) continue;
    out.push(p);
    taken.push(p.at);
  }
  return (
    <g opacity={0.82}>
      {out.map((l, i) => (
        <text key={i} x={l.at[0]} y={l.at[1] + 15} textAnchor="middle" direction="rtl" fill={v.theme.label} fontFamily={VAZIR} fontWeight={600} fontSize={44} style={{ paintOrder: "stroke", stroke: v.theme.halo, strokeWidth: 8, strokeLinejoin: "round" }}>
          {l.t}
        </text>
      ))}
    </g>
  );
};

/** Quiet place names (seas, straits, states), never under 50 px (round 2: the judge could not read 40 px), each on a dark halo. */
export const PlaceLabels: React.FC<{ items: { t: string; lon: number; lat: number; size?: number; color?: string }[]; opacity?: number; /** boxes the names keep clear of (objects on the map): a name over one moves above it */ avoid?: Box[] }> = ({ items, opacity = 1, avoid = [] }) => {
  const v = useView();
  return (
    <g opacity={opacity}>
      {items.map((l, i) => {
        const at = v.at(l.lon, l.lat);
        if (!at) return null;
        const size = Math.max(50, l.size ?? 52);
        const w = textWidth(l.t, size);
        let y = at[1];
        // round 4: a name never lies on an object: it rises above the object's box (and its leader keeps the place)
        for (const b of avoid) if (at[0] + w / 2 > b.x && at[0] - w / 2 < b.x + b.w && y > b.y - 6 && y - size < b.y + b.h) y = b.y - 10;
        const moved = y !== at[1];
        return (
          <g key={i}>
            {moved ? <path d={`M${at[0]} ${at[1]} L${at[0]} ${y + 6}`} stroke={l.color ?? v.theme.label} strokeWidth={2} opacity={0.7} /> : null}
            {moved ? <circle cx={at[0]} cy={at[1]} r={5} fill={l.color ?? v.theme.label} /> : null}
          <text x={at[0]} y={y} textAnchor="middle" direction="rtl" fill={l.color ?? v.theme.label} fontFamily={VAZIR} fontWeight={700} fontSize={Math.max(50, l.size ?? 52)} style={{ paintOrder: "stroke", stroke: v.theme.halo, strokeWidth: 9, strokeLinejoin: "round" }}>
            {l.t}
          </text>
          </g>
        );
      })}
    </g>
  );
};
