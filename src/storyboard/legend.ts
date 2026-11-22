// Round 8 (owner, 22 Nov 2026, after seven rounds of «a label beside its point on a leader line» kept failing on his
// screenshots: a leader ending on Iranian land, an Iranian flag beside «مین … به گفتهٔ سپاه» reading as if Iran laid
// the mine, words on ships, lane lines crossing each other and the coast, a tanker on the Bandar Abbas coast):
// the map carries no callout text and no leader line at all. Instead:
//   1. a small numbered disc (۱ ۲ ۳) exactly at each incident or place, on water (clear of the coast) for a sea event;
//   2. a fixed legend box in a reserved band above the source line: «۱  مین، نزدیک خصب، به گفتهٔ سپاه، ۲۰ نوامبر»,
//      plain Persian, at most two lines an item and three items a beat;
//   3. no flag beside an incident: who says it is in the words only;
//   4. every ship, object and disc on a water point checked against the coastline, a set distance off the coast;
//   5. lanes only from the real Hormuz traffic separation scheme (one inbound, one outbound, faint, on the water);
//   6. a strike is its impact point (a burst under the disc), never a launch direction the source does not give.
// Pure and idempotent: enrich() runs it last; the director and the renderer read its marks and the beat's legend.
import { geoDistance } from "d3-geo";
import type { Look } from "../map-engine/camera";
import { LANES, ROUTES } from "../map-engine/lanes";
import { isLand, coastKm, landOn } from "../map-engine/water";
import { isShip, HULL_PROBES, type MapObjectId } from "../map-engine/object-ids";
import { smooth } from "../map-engine/ships";
import { textWidth } from "../map-engine/labels";
import type { Beat, Mark, ReelContent } from "./types";


/** at most this many numbered places a beat */
export const LEGEND_MAX = 3;
/** the disc's radius on the frame (px) */
export const MARKER_R = 24;
/** The legend's band: full column width, its bottom just over the source line (which moves under it on such a beat). */
export const LEGEND = { x: 40, w: 1000, bottom: 1474, pad: 20, size: 38, minSize: 32, lineK: 1.32, gap: 14, disc: 26 };
/** where the source line is written on a beat with a legend (under the legend; the caption is not shown there) */
export const LEGEND_SOURCE_TOP = 1490;
/** the widest a shot of a beat with discs gets (× its span): clearances are measured there (director.ts keeps to it) */
export const WIDE = 1.15;
/** the map band a beat with a legend keeps its numbered places and its things in (px of the 1080 × 1920 frame) */
export const BAND_TOP = 600;

/** n: the disc's number (0: a share the line says, its bar in the row instead of a disc); share: 0…1 */
export type LegendItem = { n: number; text: string; share?: number; measure?: boolean };
type Box = { x: number; y: number; w: number; h: number };

const FA = "۰۱۲۳۴۵۶۷۸۹";
export const faDigit = (n: number) => String(n).replace(/\d/g, (d) => FA[Number(d)]);

/** The long names of sources in the short form the source line writes (the same body; nothing is dropped). */
const SHORT: [RegExp, string][] = [[/سازمان عملیات تجاری دریایی بریتانیا|مرکز عملیات تجارت دریایی بریتانیا|مرکز دریایی بریتانیا/g, "UKMTO"]];
const short = (s: string) => SHORT.reduce((x, [re, to]) => x.replace(re, to), s);

/** An item's words: the bold, then who says it and when (the callout's sub-line), one plain sentence. */
export function itemText(bold: string, sub?: string): string {
  return [bold, sub ? short(sub) : ""].map((s) => s.trim()).filter(Boolean).join("، ");
}

/** The width the words of an item may take (the disc and its gap on the right). */
const TEXT_W = LEGEND.w - 2 * LEGEND.pad - (2 * LEGEND.disc + 18);
/**
 * An item wrapped at the largest size from 38 down to 32 px that keeps it to two lines (words never cut). Null when even
 * the smallest takes three: the writer must say it shorter (tests/legend.test.mjs fails on such a sample).
 */
export function wrapItem(text: string, maxW = TEXT_W): { size: number; lines: string[] } | null {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = LEGEND.size; size >= LEGEND.minSize; size -= 2) {
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (textWidth(next, size) <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length <= 2 && lines.every((l) => textWidth(l, size) <= maxW)) return { size, lines };
  }
  return null;
}

/** Every item laid out: its size, lines and its row's top and height inside the box. */
export function legendLayout(items: LegendItem[]) {
  let y = LEGEND.pad;
  const rows = items.map((it) => {
    const fit = wrapItem(it.text) ?? { size: LEGEND.minSize, lines: [it.text] };
    const h = Math.max(2 * LEGEND.disc, fit.lines.length * fit.size * LEGEND.lineK) + (it.share !== undefined ? 44 : 0);
    const row = { ...it, ...fit, y, h };
    y += h + LEGEND.gap;
    return row;
  });
  const h = y - LEGEND.gap + LEGEND.pad;
  return { rows, box: { x: LEGEND.x, y: LEGEND.bottom - h, w: LEGEND.w, h } as Box };
}
/** The legend's box on the frame (null: the beat has none). */
export function legendBox(items: LegendItem[] | undefined): Box | null {
  return items && items.length ? legendLayout(items).box : null;
}
/** The lowest y a numbered place or a thing may stand at on a beat with this legend. */
export const bandBottom = (items: LegendItem[] | undefined) => (legendBox(items)?.y ?? 1400) - 24;

const deg = (a: [number, number], b: [number, number]) => (geoDistance(a, b) * 180) / Math.PI;
const inView = (look: Look, p: [number, number], share = 0.5) => deg([look.lon, look.lat], p) < look.span * share;

/** Things that float: their disc and their picture must be on the water. */
const FLOATS = new Set<MapObjectId>(["tanker", "cargo", "lng", "warship", "boats", "mine", "rig"]);
export const floats = (m: { id: MapObjectId; lon: number; lat: number }) => FLOATS.has(m.id) && !(m.id === "rig" && isLand([m.lon, m.lat]));

/** km a disc must stay off the coast on a beat of this span: its radius and a margin, measured on the widest shot (1.3 ×). */
export function clearKm(span: number): number {
  const pxPerKm = 1080 / (span * WIDE * 111.32);
  return Math.max(3, (MARKER_R + 10) / pxPerKm);
}

/**
 * The nearest point at sea at least `km` off every coast (the engine's finest coastline: 1:50m, the straits' 1:10m, the
 * Gulf islands), searched outward in rings of 1.5 km. Null when there is none within 80 km.
 */
export function waterPoint(p: [number, number], km: number, away: [number, number][][] = [], awayKm = 0, maxKm = 80): [number, number] | null {
  const ok = (q: [number, number]) => coastKm(q) >= km && away.every((w) => pathKm(q, w) >= awayKm) && !isLand(q);
  if (ok(p)) return p;
  const kx = 1 / Math.max(0.2, Math.cos((p[1] * Math.PI) / 180));
  for (let r = 1.5; r <= maxKm; r += 1.5) {
    const n = Math.max(12, Math.round(r * 1.5));
    const ring: [number, number][] = [];
    for (let k = 0; k < n; k += 1) {
      const a = (k * 2 * Math.PI) / n;
      ring.push([p[0] + ((Math.cos(a) * r) / 111.32) * kx, p[1] + (Math.sin(a) * r) / 110.6]);
    }
    const found = ring.find(ok);
    if (found) return [Number(found[0].toFixed(4)), Number(found[1].toFixed(4))];
  }
  return null;
}

/** km from a point to a line (equirectangular about the point: exact enough within a strait) */
export function pathKm(p: [number, number], path: [number, number][]): number {
  const kx = 111.32 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i += 1) {
    const ax = (path[i][0] - p[0]) * kx;
    const ay = (path[i][1] - p[1]) * ky;
    const dx = (path[i + 1][0] - path[i][0]) * kx;
    const dy = (path[i + 1][1] - path[i][1]) * ky;
    const L = dx * dx + dy * dy;
    const u = L > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(ax + dx * u, ay + dy * u));
  }
  return best;
}

/** px on the frame of a look (the orthographic map near its centre, as keepInFrame measures it) */
const toPx = (look: Look, p: [number, number]): [number, number] => {
  const px = 1080 / look.span;
  const cos = Math.cos((look.lat * Math.PI) / 180);
  return [540 + (p[0] - look.lon) * cos * px, 960 - (p[1] - look.lat) * px];
};
const fromPx = (look: Look, x: number, y: number): [number, number] => {
  const px = 1080 / look.span;
  const cos = Math.cos((look.lat * Math.PI) / 180);
  return [look.lon + (x - 540) / (cos * px), look.lat - (y - 960) / px];
};
/** a thing's room around its point (px) at art scale 0.95 (a main ship): its hull and house; smaller things in proportion */
const ROOM = { x0: -150, x1: 150, y0: -150, y1: 34 };
/** pass 3: a mine's own room (its ball and horns, its chain under the water): it stands right by its disc */
// pass 4: as wide as the mine is drawn (its box measured 157 px on the frame)
const MINE_ROOM = { x0: -80, x1: 80, y0: -62, y1: 40 };
/** the art scale a thing is drawn at on a beat with discs (objscale: about 185 px, a mine smaller) */
const artOf = (id: MapObjectId) => (id === "mine" ? 0.62 : 0.95);
const roomOf = (id: MapObjectId) => {
  if (id === "mine") return MINE_ROOM;
  const k = artOf(id) / 0.95;
  return { x0: ROOM.x0 * k, x1: ROOM.x1 * k, y0: ROOM.y0 * k, y1: ROOM.y1 * k };
};
const roomAt = (q: [number, number], sc: number | MapObjectId = 0.95): Box => {
  const R = typeof sc === "string" ? roomOf(sc) : { x0: (ROOM.x0 * sc) / 0.95, x1: (ROOM.x1 * sc) / 0.95, y0: (ROOM.y0 * sc) / 0.95, y1: (ROOM.y1 * sc) / 0.95 };
  return { x: q[0] + R.x0, y: q[1] + R.y0, w: R.x1 - R.x0, h: R.y1 - R.y0 };
};
const meet = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const discBox = (q: [number, number], pad = 10): Box => ({ x: q[0] - MARKER_R - pad, y: q[1] - MARKER_R - pad, w: 2 * (MARKER_R + pad), h: 2 * (MARKER_R + pad) });

/**
 * A standing thing beside the numbered disc of its incident, not on it: the disc stays exactly at the place, the thing
 * (a burning tanker, a mine, a refinery) takes a spot right by it whose room clears every disc and every thing already
 * placed, on the water with its whole picture when it floats. Pass 3 (owner: the mine stood 30–40 km from its disc, the
 * burning tanker against Larak and Qeshm): the spots are tried in rings round the disc, the nearest ring first, and in a
 * ring the one with the most open water round the picture wins; a mine has a mine's room, so it stands just beside.
 */
function besideDiscs(look: Look, o: Extract<Mark, { kind: "object" }>, discs: [number, number][], placed: Box[]): { at: [number, number]; size?: number } | "drop" | null {
  const R0 = roomOf(o.id);
  const roomAt = (q: [number, number], size: number): Box => ({ x: q[0] + R0.x0 * size, y: q[1] + R0.y0 * size, w: (R0.x1 - R0.x0) * size, h: (R0.y1 - R0.y0) * size });
  const at = toPx(look, [o.lon, o.lat]);
  const near = discs.filter((d) => meet(roomAt(at, 1), discBox(d)));
  if (!near.length && !placed.some((b) => meet(roomAt(at, 1), b, 6))) return null;
  // round from the disc it belongs to (the nearest), so a mine or a burning ship stays by its incident
  const own = [...discs].sort((a, z) => Math.hypot(a[0] - at[0], a[1] - at[1]) - Math.hypot(z[0] - at[0], z[1] - at[1]))[0];
  const anchor = near[0] ?? (own && Math.hypot(own[0] - at[0], own[1] - at[1]) < 420 ? own : null);
  // a thing on another thing with no incident of its own goes (it would stand at a place nobody named)
  if (!anchor) return "drop";
  const d0 = anchor;
  // pass 4: a mine keeps a little more room from its disc (its horns touched the disc as the camera settled)
  const gap = MARKER_R + (o.id === "mine" ? 26 : 16);
  const sea = floats(o);
  const ship = isShip(o.id);
  // pass 3: a ship that finds no open water right by its incident at its full size stands smaller (down to half, about
  // 95 px, still twice a column's ship) rather than far from its place: every size and spot is scored by how far its
  // point is from the disc, a smaller picture counting as a little further
  const sizes = ship && sea ? [1, 0.82, 0.65, 0.5] : [1];
  let best: { q: [number, number]; size: number; score: number; open: number } | null = null;
  for (const size of sizes) {
    const R = { x0: R0.x0 * size, x1: R0.x1 * size, y0: R0.y0 * size, y1: R0.y1 * size };
    const sc = artOf(o.id) * size;
    for (const m of [1, 1.25, 1.55, 1.9]) {
      // the ring: above the disc (the disc at its waterline), beside it, below it, and the four corners
      for (const sx of [-1, 0, 1])
        for (const sy of [-1, 0, 1]) {
          if (!sx && !sy) continue;
          const dx = sx ? sx * ((sx < 0 ? R.x1 : -R.x0) + gap) * m : 0;
          const dy = sy < 0 ? -(R.y1 + gap) * m : sy > 0 ? (-R.y0 + gap) * m : 0;
          const q: [number, number] = [d0[0] + dx, d0[1] + dy];
          const score = Math.hypot(dx, dy) + (1 - size) * 160;
          if (best && score > best.score + 40) continue;
          const r = roomAt(q, size);
          if (discs.some((d) => meet(r, discBox(d)))) continue;
          if (placed.some((b) => meet(r, b, 6))) continue;
          // afloat: its whole picture on open water (a ship: its waterline, house and bow 2 km off every coast)
          const open = sea ? openKm(look, q, sc, ship) : 1;
          if (open <= 0) continue;
          // among spots about as near, the one with the most open water round it
          if (!best || score + 40 < best.score || (score < best.score + 40 && (open > best.open + 1 || (open >= best.open - 1 && score < best.score)))) best = { q, size, score, open };
        }
    }
  }
  if (!best) return "drop";
  const g = fromPx(look, best.q[0], best.q[1]);
  return { at: [Number(g[0].toFixed(4)), Number(g[1].toFixed(4))], ...(best.size < 1 ? { size: best.size } : {}) };
}
/**
 * How open the water is round a thing standing at q on the frame of a look, drawn at art scale sc: the km from its
 * picture's nearest point to the nearest coast (capped at 15), or 0 when a part of it is within 2 km of one. A ship is
 * probed through its waterline, deck gear, house and bow (objects.tsx HULL_PROBES); a mine along its waterline.
 */
function openKm(look: Look, q: [number, number], sc: number, ship: boolean): number {
  const g0 = fromPx(look, q[0], q[1]);
  if (isLand(g0) || coastKm(g0) < 2) return 0;
  const pts: [number, number][] = ship ? HULL_PROBES : [-52, -26, 0, 26, 52].map((x) => [x, 8] as [number, number]);
  let worst = 15;
  for (const [ax, ay] of pts) {
    const g = fromPx(look, q[0] + ax * sc * 1.15, q[1] + ay * sc * 1.15);
    const km = isLand(g) ? 0 : coastKm(g);
    if (km < 2) return 0;
    worst = Math.min(worst, km);
  }
  return worst;
}

/** The real sea lanes in view of a look (the Hormuz TSS both ways, the Red Sea route): what a lane line may draw. */
export function lanesInView(look: Look): { id: string; coords: [number, number][] }[] {
  // pass 3: and only a lane whose drawn part (the scheme between its ends) is itself in view
  return ROUTES.filter((r) => r.kind === "sea-lane" && r.path.filter((p) => inView(look, p, 0.9)).length >= 2)
    .map((r) => ({ id: r.id, coords: SCHEME[r.id] ? clipLon(r.path, ...SCHEME[r.id]) : r.path }))
    .filter((l) => l.coords.length >= 2 && l.coords.some((p) => inView(look, p, 0.9)));
}
/**
 * The separation scheme proper (round 8, owner: «خطوط مسیر نباید همدیگر را قطع کنند»): the Hormuz lanes are drawn only
 * between the scheme's two ends, where inbound and outbound run side by side; west of it and out in the Gulf of Oman the
 * routes are only a way ships go (they part there, and the route data crosses), so no line is drawn there.
 */
const SCHEME: Record<string, [number, number]> = { "hormuz-tss-out": [55.9, 57.2], "hormuz-tss-in": [55.9, 57.2] };
export function clipLon(path: [number, number][], lo: number, hi: number): [number, number][] {
  const out: [number, number][] = [];
  const cut = (a: [number, number], b: [number, number], x: number): [number, number] => {
    const u = (x - a[0]) / (b[0] - a[0]);
    return [x, a[1] + (b[1] - a[1]) * u];
  };
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    const inside = p[0] >= lo && p[0] <= hi;
    const prev = path[i - 1];
    if (prev) {
      const xs = [lo, hi].filter((x) => (prev[0] - x) * (p[0] - x) < 0).sort((a, z) => Math.abs(a - prev[0]) - Math.abs(z - prev[0]));
      for (const x of xs) out.push(cut(prev, p, x));
    }
    if (inside) out.push(p);
  }
  return out;
}

/**
 * Pass 3: the middle of the shipping lane nearest a point: the point on the nearer of the scheme's two ways closest to
 * it, and half-way across to the other way (the separation zone). Null without two lanes in view.
 */
export function laneMiddle(lanes: { coords: [number, number][] }[], p: [number, number]): [number, number] | null {
  if (lanes.length < 2) return null;
  const near = (path: [number, number][], q: [number, number]): [number, number] => {
    let best: [number, number] = path[0];
    let d = Infinity;
    for (let i = 0; i + 1 < path.length; i += 1)
      for (let k = 0; k <= 20; k += 1) {
        const r: [number, number] = [path[i][0] + ((path[i + 1][0] - path[i][0]) * k) / 20, path[i][1] + ((path[i + 1][1] - path[i][1]) * k) / 20];
        const dd = Math.hypot((r[0] - q[0]) * Math.cos((q[1] * Math.PI) / 180), r[1] - q[1]);
        if (dd < d) {
          d = dd;
          best = r;
        }
      }
    return best;
  };
  const [a, b] = [...lanes].sort((x, z) => pathKm(p, x.coords) - pathKm(p, z.coords));
  const qa = near(a.coords, p);
  const qb = near(b.coords, qa);
  return [Number(((qa[0] + qb[0]) / 2).toFixed(4)), Number(((qa[1] + qb[1]) / 2).toFixed(4))];
}

/** a writer's line that is a ship's way at sea (both ends on water), or a looping traffic comet */
const seaComet = (m: Mark) => m.kind === "comet" && (Boolean(m.loop) || (!isLand(m.coords[0]) && !isLand(m.coords[m.coords.length - 1])));

/** what stands on land only */
const ON_LAND = new Set<MapObjectId>(["refinery", "pumpjack", "nuclear", "parliament", "tank", "troops", "barrel", "money", "treaty", "padlock"]);

/** One beat with its callouts as numbered discs and a legend, its lanes real, its strikes impact points. */
/** a pipeline's end circle (objects.tsx: r 14 px) */
const END_R = 14;
/**
 * Pass 4: a numbered disc that would sit on the end circle of a line (a pipeline's start or end) moves just off it, to the
 * side of the line (or beyond its end), about a disc and a half from the circle: on land for a place on land, on open
 * water for a sea event, clear of the line itself and of the discs already placed. Measured on the beat's widest shot.
 */
function offEnds(look: Look, at: [number, number], pipes: [number, number][][], sea: boolean, span: number, discs: [number, number][]): [number, number] {
  const P = toPx(look, at);
  const lineDist = (q: [number, number], path: [number, number][]) => {
    let best = Infinity;
    for (let i = 0; i + 1 < path.length; i += 1) {
      const a = toPx(look, path[i]);
      const b = toPx(look, path[i + 1]);
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1]));
    }
    return best;
  };
  for (const path of pipes) {
    for (const [e, prev] of [[path[0], path[1]], [path[path.length - 1], path[path.length - 2]]] as [[number, number], [number, number]][]) {
      const E = toPx(look, e);
      if (Math.hypot(E[0] - P[0], E[1] - P[1]) > MARKER_R + END_R + 12) continue;
      const Q = toPx(look, prev);
      const L = Math.hypot(E[0] - Q[0], E[1] - Q[1]) || 1;
      const u = [(E[0] - Q[0]) / L, (E[1] - Q[1]) / L];
      // beside the line first (either side), then beyond its end, then the corners between
      const dirs: [number, number][] = [[-u[1], u[0]], [u[1], -u[0]], [u[0], u[1]], [u[0] - u[1], u[1] + u[0]], [u[0] + u[1], u[1] - u[0]]];
      let best: { q: [number, number]; score: number } | null = null;
      for (const d of [MARKER_R + END_R + 22, MARKER_R + END_R + 36, MARKER_R + END_R + 54])
        for (const [dx0, dy0] of dirs) {
          const n = Math.hypot(dx0, dy0);
          const q: [number, number] = [E[0] + (dx0 / n) * d, E[1] + (dy0 / n) * d];
          if (pipes.some((pp) => lineDist(q, pp) < MARKER_R + 12)) continue;
          if (discs.some((x) => Math.hypot(x[0] - q[0], x[1] - q[1]) < 2 * MARKER_R + 20)) continue;
          const g = fromPx(look, q[0], q[1]);
          const ok = sea ? !isLand(g) && coastKm(g) >= clearKm(span) : isLand(g);
          if (!ok) continue;
          // the side with the most room from the other discs
          const room = discs.length ? Math.min(...discs.map((x) => Math.hypot(x[0] - q[0], x[1] - q[1]))) : 999;
          const score = d - Math.min(room, 300) * 0.05;
          if (!best || score < best.score) best = { q, score };
        }
      if (best) {
        const g = fromPx(look, best.q[0], best.q[1]);
        return [Number(g[0].toFixed(4)), Number(g[1].toFixed(4))];
      }
    }
  }
  return at;
}

export function legendBeat(b: Extract<Beat, { kind: "hook" | "map" }>): Extract<Beat, { kind: "hook" | "map" }> {
  const look = b.look;
  const span = look.span;
  // things and discs are measured on the widest shot of the beat (the camera pulls out to 1.3 of its span at most)
  const wide: Look = { ...look, span: span * WIDE };
  const marks0 = b.marks ?? [];
  const callouts = marks0.filter((m): m is Extract<Mark, { kind: "callout" }> => m.kind === "callout").slice(0, LEGEND_MAX);
  const strikes = marks0.filter((m): m is Extract<Mark, { kind: "object" }> => m.kind === "object" && m.move === "drop");
  const floating = marks0.filter((m): m is Extract<Mark, { kind: "object" }> => m.kind === "object" && floats(m));
  const legend: LegendItem[] = [];
  const discs: [number, number][] = [];
  // ships sailing a lane through this beat pass a fixed disc on it: a disc keeps clear of their way (a column's small
  // hull is about 45 px either side of its way; measured on the widest shot), as far as the water allows
  const ways = marks0.filter((m): m is Extract<Mark, { kind: "object" }> => m.kind === "object" && m.move === "sail" && Boolean(m.path) && isShip(m.id)).map((m) => m.path!);
  const wayKm = ways.length ? (MARKER_R + 60) / (1080 / (span * WIDE * 111.32)) : 0;
  const markerOf = new Map<Mark, Mark>();
  const pipes = marks0.filter((m): m is Extract<Mark, { kind: "object" }> => m.kind === "object" && m.move === "pipe" && Boolean(m.path) && m.path!.length >= 2).map((m) => m.path!);
  callouts.forEach((c, i) => {
    const p: [number, number] = [c.lon, c.lat];
    // an event at sea: its place is water, or a thing that floats is part of it (a mine, a ship that was hit)
    // pass 3: a place well inland (Abqaiq) stays on its land whatever floats near it; a coastal one (Khasab) is a sea event
    // when a mine or a struck ship is part of it
    const sea = !isLand(p) || (coastKm(p) < 12 && floating.some((o) => deg([o.lon, o.lat], p) < span * 0.25));
    let at: [number, number] = p;
    const struck = strikes.some((s) => deg([s.lon, s.lat], p) < span * 0.1) || marks0.some((m) => m.kind === "pins" && m.points.some((q) => deg([q.lon, q.lat], p) < span * 0.06)) || floating.some((o) => o.move !== "sail" && deg([o.lon, o.lat], p) < span * 0.25);
    const mid = sea && !struck ? laneMiddle(lanesInView(look), p) : null;
    if (mid) {
      // pass 3 (owner: «دایرهٔ ۱ یک منطقه را نشان می‌دهد و به ساحل ایران نزدیک است»): a claim about the waters of a strait
      // («۶ نفتکش، ۷ روز»), not a point, is numbered in the middle of the shipping lane, between its two ways
      at = waterPoint(mid, clearKm(span)) ?? p;
    } else if (sea) {
      let found: [number, number] | null = null;
      // in and around a strait the water clear of both coasts and of the ships' way may lie a little further out
      for (const k of [1, 0.75, 0.5, 0.25, 0]) if ((found = waterPoint(p, clearKm(span), ways, wayKm * k, k ? 120 : 80))) break;
      at = found ?? p;
    }
    // pass 4 (the judge: «discs ① and ② on the pipeline's end circles read as busy»): a disc stands just off a line's end
    at = offEnds(wide, at, pipes, sea, span, discs);
    const hit = strikes.some((s) => deg([s.lon, s.lat], p) < span * 0.1) || marks0.some((m) => m.kind === "pins" && m.color.toLowerCase() === "#ff4d40" && m.points.some((q) => deg([q.lon, q.lat], p) < span * 0.06));
    markerOf.set(c, { kind: "marker", n: i + 1, lon: at[0], lat: at[1], sea, ...(hit ? { hit: true } : {}) } as Mark);
    legend.push({ n: i + 1, text: itemText(c.bold, c.sub) });
    discs.push(toPx(wide, at));
  });
  const calloutAt = callouts.map((c) => [c.lon, c.lat] as [number, number]);
  const onDisc = (p: [number, number]) => calloutAt.some((q) => deg(p, q) < span * 0.08);
  const lanes = lanesInView(look);
  const shipping = marks0.some((m) => m.kind === "object" && isShip(m.id));
  const out: Mark[] = [];
  const placed: Box[] = [];
  for (const m of marks0) {
    if (m.kind === "callout") {
      const mk = markerOf.get(m);
      if (mk) out.push(mk);
      continue;
    }
    // the disc is the place now: a pin on it goes (a pin elsewhere stays, at sea moved to the water like a disc)
    if (m.kind === "pins") {
      const pts = m.points.filter((q) => !onDisc([q.lon, q.lat]));
      if (pts.length) out.push({ ...m, points: pts });
      continue;
    }
    // a strike is its impact point: the burst under the disc, no missile or drone flying from anywhere
    if (m.kind === "object" && m.move === "drop") continue;
    // a hand-drawn line at sea goes: only the real lanes are drawn (below)
    if (seaComet(m)) continue;
    // a measure's length (round 8): a row of the legend, never words on the map; its bar stays on the map
    if (m.kind === "measure") {
      const km = Math.round(geoDistance(m.a, m.b) * 6371.0088);
      legend.push({ n: 0, text: `${faDigit(km)} کیلومتر، از ساحل تا ساحل`, measure: true });
      out.push(m);
      continue;
    }
    // a share the line says (round 6's bar over its thing) is a row of the legend with its bar: no words on the map
    if (m.kind === "share") {
      legend.push({ n: 0, text: m.label, share: m.share });
      out.push(m);
      continue;
    }
    if (m.kind === "object") {
      let o = m;
      // a building, a barrel, a parliament stands on land: on the water it is not drawn (a refinery in the sea misleads)
      if (!floats(o) && ON_LAND.has(o.id) && (o.move === undefined || o.move === "stand") && !isLand([o.lon, o.lat])) continue;
      // a ship on a writer's line sails the real lane nearest it instead
      if (o.move === "sail" && (!o.lane || o.lane.startsWith("c") || o.lane.startsWith("w")) && isShip(o.id)) {
        const ids: Record<string, string> = { "hormuz-tss-out": "hormuz-out", "hormuz-tss-in": "hormuz-in", "red-sea-north": "red-sea" };
        const real = LANES.filter((l) => lanes.some((x) => ids[x.id] === l.id));
        const best = real.map((l) => ({ l, d: Math.min(...l.path.map((q) => deg(q, [o.lon, o.lat]))) })).sort((a, z) => a.d - z.d)[0];
        if (best) o = { ...o, path: smooth(best.l.path), lane: best.l.id };
      }
      if (o.move === "stand" || o.move === "approach" || o.move === undefined) {
        const q = besideDiscs(wide, o, discs, placed);
        if (q === "drop") continue;
        if (q) {
          let moved: Extract<Mark, { kind: "object" }> = { ...o, lon: q.at[0], lat: q.at[1], ...(q.size ? { size: q.size } : {}) };
          // a ship that was coming in lies by its disc instead: its way in would pass over the disc and the things there
          if (o.move === "approach") moved = { ...moved, move: "stand", path: undefined };
          o = moved;
        }
        placed.push(roomAt(toPx(wide, [o.lon, o.lat]), o.id === "mine" ? "mine" : artOf(o.id) * (o.size ?? 1)));
      }
      out.push(o);
      continue;
    }
    out.push(m);
  }
  // the real lanes, faint, under everything that stands on them: only when a ship of the story is on the water here
  if (shipping && !out.some((m) => m.kind === "lane")) {
    const ground = out.reduce((n, m, i) => (m.kind === "fill" || m.kind === "hatch" ? i + 1 : n), 0);
    out.splice(ground, 0, ...lanes.map((l) => ({ kind: "lane", id: l.id, coords: l.coords }) as Mark));
  }
  return { ...b, marks: out, ...(legend.length ? { legend } : {}) } as Extract<Beat, { kind: "hook" | "map" }>;
}

/** The whole Reel through legendBeat: every hook and map beat. Marked done, so a second pass changes nothing. */
export function legendize(c: ReelContent): ReelContent {
  if (c.legend) return c;
  return { ...c, legend: true, beats: c.beats.map((b) => (b.kind === "hook" || b.kind === "map" ? legendBeat(b) : b)) };
}

/**
 * Round 8: the camera keeps a beat's numbered places and its standing things inside the map band (between the header
 * and the legend, clear of the frame's sides), on every shot, whatever move the cycle asked for: it slides as little as
 * it must, and widens only when the points cannot fit at the shot's span.
 */
export function fitPoints(look: Look, discs: [number, number][], things: [number, number][], bottom: number, maxSpan = Infinity): Look {
  if (!discs.length && !things.length) return look;
  // the room each kind needs around its point (px): a disc its radius; a thing its picture
  const need = [...discs.map((p) => ({ p, x0: -MARKER_R - 24, x1: MARKER_R + 24, y0: -MARKER_R - 24, y1: MARKER_R + 24 })), ...things.map((p) => ({ p, x0: ROOM.x0 - 10, x1: ROOM.x1 + 10, y0: ROOM.y0 - 10, y1: ROOM.y1 + 10 }))];
  const left = 60;
  const right = 1020;
  const top = BAND_TOP;
  let span = look.span;
  for (let i = 0; i < 12; i += 1) {
    const L = { ...look, span };
    const xs = need.map((n) => toPx(L, n.p));
    const minX = Math.min(...xs.map((q, k) => q[0] + need[k].x0));
    const maxX = Math.max(...xs.map((q, k) => q[0] + need[k].x1));
    const minY = Math.min(...xs.map((q, k) => q[1] + need[k].y0));
    const maxY = Math.max(...xs.map((q, k) => q[1] + need[k].y1));
    if (maxX - minX <= right - left && maxY - minY <= bottom - top) {
      // slide the least: the box into the band
      const dx = minX < left ? left - minX : maxX > right ? right - maxX : 0;
      const dy = minY < top ? top - minY : maxY > bottom ? bottom - maxY : 0;
      if (!dx && !dy) return L;
      const px = 1080 / span;
      const cos = Math.cos((look.lat * Math.PI) / 180);
      return { ...L, lon: L.lon - dx / (cos * px), lat: L.lat + dy / px };
    }
    // never wider than the beat allows (its discs' clearances were measured there): then it slides as best it can
    if (span * 1.15 > maxSpan) {
      const L2 = { ...look, span: Math.min(span, maxSpan) };
      const xs = need.map((n) => toPx(L2, n.p));
      const cx = (Math.min(...xs.map((q, k) => q[0] + need[k].x0)) + Math.max(...xs.map((q, k) => q[0] + need[k].x1))) / 2;
      const cy = (Math.min(...xs.map((q, k) => q[1] + need[k].y0)) + Math.max(...xs.map((q, k) => q[1] + need[k].y1))) / 2;
      const px = 1080 / L2.span;
      const cos = Math.cos((look.lat * Math.PI) / 180);
      return { ...L2, lon: L2.lon + (cx - 540) / (cos * px), lat: L2.lat - (cy - (top + bottom) / 2) / px };
    }
    span *= 1.15;
  }
  return { ...look, span };
}
