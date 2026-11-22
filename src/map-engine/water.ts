// Land and water (round 7, owner: «کشتی و آبجکت‌ها هیچ‌وقت روی خشکی و خط ساحل نباشند»; «خط مسیر فقط روی آب»). One
// test of «is this point land» for the whole engine, at the finest coast it has there: Natural Earth 1:50m everywhere,
// the 1:10m coasts of the straits (Musandam, Qeshm, Hormuz, Larak, Bab el-Mandeb …) and the small Gulf islands of
// sea-detail.json on top. A ship, a mine, a wake, a lane line and a hatched sea area live only where this says water.
import { geoContains, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import straits from "./data/straits-10m.json";
import sea from "./data/sea-detail.json";
import { worldFor } from "./world";

/* eslint-disable @typescript-eslint/no-explicit-any */
const COASTS = (feature(straits as any, (straits as any).objects.coasts) as any).features as any[];
const ISLANDS = (sea as any).features[2];

/**
 * Round 8: the land's polygons one by one, each with its box, so a test looks only at the few whose box holds the point
 * (the whole world's land in one geoContains took 13 ms a point; the same answer now takes a fraction of that).
 */
type Poly = { box: [number, number, number, number]; geo: any };
let POLYS: Poly[] | null = null;
function polys(): Poly[] {
  if (POLYS) return POLYS;
  const out: Poly[] = [];
  const add = (coords: [number, number][][]) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of coords[0]) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    // a ring across the antimeridian or round a pole: its box is the whole earth
    if (x1 - x0 > 180) (x0 = -180), (x1 = 180);
    out.push({ box: [x0, y0, x1, y1], geo: { type: "Polygon", coordinates: coords } });
  };
  const geom = (g: any): void => {
    if (!g) return;
    if (g.type === "FeatureCollection") g.features.forEach(geom);
    else if (g.type === "Feature") geom(g.geometry);
    else if (g.type === "GeometryCollection") g.geometries.forEach(geom);
    else if (g.type === "Polygon") add(g.coordinates);
    else if (g.type === "MultiPolygon") g.coordinates.forEach((c: [number, number][][]) => add(c));
  };
  geom(worldFor(0).land);
  if (ISLANDS) geom(ISLANDS);
  for (const c of COASTS) geom(c);
  POLYS = out;
  return out;
}

/** True on land (or on a coast's own line, to the nearest few hundred metres of the 1:10m data). */
export function isLand(p: [number, number]): boolean {
  const [x, y] = p;
  for (const q of polys()) {
    const b = q.box;
    if (x < b[0] - 0.01 || x > b[2] + 0.01 || y < b[1] - 0.01 || y > b[3] + 0.01) continue;
    // planar ray casting in degrees (the data is dense: its edges are short enough that a straight edge in degrees and
    // a great circle agree); Antarctica, round the pole, keeps the spherical test
    if (b[1] < -85 ? geoContains(q.geo, p) : inRings(q.geo.coordinates, x, y)) return true;
  }
  return false;
}
/** Inside a polygon's outer ring and outside its holes (even-odd over all its rings). */
function inRings(rings: [number, number][][], x: number, y: number): boolean {
  let inside = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i, i += 1) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
}

/**
 * Round 8: the land test for the word checks of every frame (a name, the scale, a measure's words, a disc's edge): the
 * same answer as isLand, kept per 0.01° (about a kilometre), so a frame's dozens of samples cost almost nothing.
 */
const LAND_MEMO = new Map<number, boolean>();
export function landAt(p: [number, number]): boolean {
  const key = Math.round(p[0] * 100) * 100000 + Math.round(p[1] * 100);
  let r = LAND_MEMO.get(key);
  if (r === undefined) {
    r = isLand([Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
    if (LAND_MEMO.size > 400000) LAND_MEMO.clear();
    LAND_MEMO.set(key, r);
  }
  return r;
}
/** True when every sample of a box on the frame (5 across, 3 down) is water. */
export function boxOnWater(v: { inv: (x: number, y: number) => [number, number] | null }, b: { x: number; y: number; w: number; h: number }): boolean {
  for (let i = 0; i <= 4; i += 1)
    for (let j = 0; j <= 2; j += 1) {
      const g = v.inv(b.x + (b.w * i) / 4, b.y + (b.h * j) / 2);
      if (!g || landAt(g)) return false;
    }
  return true;
}

/** The kilometres from a point at sea to the nearest land, searched out to `maxKm` (rings of 8 directions); Infinity beyond. */
export function kmToLand(p: [number, number], maxKm = 12): number {
  if (isLand(p)) return 0;
  const R = 6371.0088;
  for (let d = 1; d <= maxKm; d += 1) {
    const deg = (d / R) * (180 / Math.PI);
    for (let k = 0; k < 12; k += 1) {
      const a = (k * Math.PI) / 6;
      const q: [number, number] = [p[0] + (Math.cos(a) * deg) / Math.cos((p[1] * Math.PI) / 180), p[1] + Math.sin(a) * deg];
      if (isLand(q)) return d;
    }
  }
  return Infinity;
}

/**
 * Round 8: the kilometres from a point to the nearest coastline (any shape the land test uses: 1:50m land, the straits'
 * 1:10m coasts, the Gulf islands), measured to the coast's segments themselves, not by rings of samples: exact to the
 * data, and fast (the segments are kept per 1° tile, with a degree of margin round it, so it sees up to ~100 km).
 * Infinity when no coast is that near. Land or water is isLand's to say; this is only how far the coast is.
 */
const TILES = new Map<string, Float64Array>();
function segsNear(p: [number, number]): Float64Array {
  const tx = Math.floor(p[0]);
  const ty = Math.floor(p[1]);
  const key = `${tx},${ty}`;
  let segs = TILES.get(key);
  if (segs) return segs;
  const x0 = tx - 1;
  const x1 = tx + 2;
  const y0 = ty - 1;
  const y1 = ty + 2;
  const out: number[] = [];
  const ring = (r: [number, number][]) => {
    for (let i = 0; i + 1 < r.length; i += 1) {
      const a = r[i];
      const b = r[i + 1];
      if (Math.max(a[0], b[0]) < x0 || Math.min(a[0], b[0]) > x1 || Math.max(a[1], b[1]) < y0 || Math.min(a[1], b[1]) > y1) continue;
      out.push(a[0], a[1], b[0], b[1]);
    }
  };
  const walk = (c: any): void => {
    if (!Array.isArray(c) || !c.length) return;
    if (typeof c[0][0] === "number") ring(c as [number, number][]);
    else for (const x of c) walk(x);
  };
  const geom = (g: any): void => {
    if (!g) return;
    if (g.type === "FeatureCollection") g.features.forEach((x: any) => geom(x));
    else if (g.type === "Feature") geom(g.geometry);
    else if (g.type === "GeometryCollection") g.geometries.forEach((x: any) => geom(x));
    else walk(g.coordinates);
  };
  for (const s of landShapes(0)) geom(s);
  segs = Float64Array.from(out);
  TILES.set(key, segs);
  return segs;
}
export function coastKm(p: [number, number]): number {
  const s = segsNear(p);
  const kx = 111.32 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110.57;
  let best = Infinity;
  for (let i = 0; i < s.length; i += 4) {
    const ax = (s[i] - p[0]) * kx;
    const ay = (s[i + 1] - p[1]) * ky;
    const bx = (s[i + 2] - p[0]) * kx;
    const by = (s[i + 3] - p[1]) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const L = dx * dx + dy * dy;
    const u = L > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
    const d = Math.hypot(ax + dx * u, ay + dy * u);
    if (d < best) best = d;
  }
  return best;
}
/** The kilometres from a point at sea to the coast (0 on land): coastKm on the water, the one test for clearance. */
export const seaKm = (p: [number, number]) => (isLand(p) ? 0 : coastKm(p));

/** A line cut into steps of about `stepKm`: what the water tests walk along. */
export function stepsOf(path: [number, number][], stepKm = 2): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < path.length; i += 1) {
    const [a, z] = [path[i], path[i + 1]];
    const n = Math.max(1, Math.ceil((geoDistance(a, z) * 6371) / stepKm));
    for (let k = 0; k < n; k += 1) out.push([a[0] + ((z[0] - a[0]) * k) / n, a[1] + ((z[1] - a[1]) * k) / n]);
  }
  if (path.length) out.push(path[path.length - 1]);
  return out;
}

/** The points of a line that lie on land (none: the line is all water). */
export function landOn(path: [number, number][], stepKm = 2): [number, number][] {
  return stepsOf(path, stepKm).filter(isLand);
}

/** The geometries a water mask cuts out at a given span: the land at that span's scale, the straits' coasts, the islands. */
export function landShapes(span: number): any[] {
  return [worldFor(span).land, ...(span < 30 ? COASTS : []), ...(span < 30 && ISLANDS ? [ISLANDS] : [])];
}
