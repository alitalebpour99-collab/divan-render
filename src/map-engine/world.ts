// The engine's world: Natural Earth countries (public domain) at two scales, read once. The globe and wide views use
// 1:110m, every dive into a region 1:50m. Each country carries its ISO alpha-3 code (`a3`) and its Persian name.
import { geoArea, geoCentroid, geoDistance } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import w110 from "./data/world-110m.json";
import w50 from "./data/world-50m.json";
import straits from "./data/straits-10m.json";
import { nameFa } from "./names";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Country = { a3: string; fa: string; geo: any; centroid: [number, number] };
export type World = { countries: Country[]; byA3: Map<string, Country>; land: any; borders: any };

function read(topo: any): World {
  const feats = (feature(topo, topo.objects.countries) as any).features as any[];
  const countries: Country[] = feats.map((f) => {
    // the centroid of the largest part: France's is in France, not between it and Guiana
    let geo = f;
    if (f.geometry?.type === "MultiPolygon") {
      const parts = f.geometry.coordinates.map((c: any) => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: c } }));
      geo = parts.reduce((a: any, b: any) => (geoArea(b) > geoArea(a) ? b : a), parts[0]);
    }
    return { a3: f.properties.a3, fa: nameFa(f.properties.a3, f.properties.fa), geo: f, centroid: geoCentroid(geo) as [number, number] };
  });
  return {
    countries,
    byA3: new Map(countries.filter((c) => c.a3).map((c) => [c.a3, c])),
    land: merge(topo, topo.objects.countries.geometries),
    borders: mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b),
  };
}

let coarse: World | null = null;
let fine: World | null = null;
/** The world at the scale a view needs: a view narrower than `FINE_BELOW` degrees gets the 1:50m shapes. */
export const FINE_BELOW = 55;
export const worldFor = (span: number): World => (span < FINE_BELOW ? (fine ??= read(w50)) : (coarse ??= read(w110)));

/** A country by its code, at the fine scale (for fills, hatching, centroids). */
export const country = (a3: string): Country | undefined => worldFor(0).byA3.get(a3);

/** Kilometres between two points on the earth (great circle). The engine's distances are measured, never typed. */
export const EARTH_KM = 6371.0088;
export const km = (a: [number, number], b: [number, number]) => geoDistance(a, b) * EARTH_KM;

/**
 * The narrowest gap between two states inside a box [[lon0, lat0], [lon1, lat1]], measured on the 1:50m coastlines
 * (a strait's width): the two closest points and the kilometres between them. Measured from the data, never typed.
 */
export function nearestGap(a3a: string, a3b: string, box: [[number, number], [number, number]]): { a: [number, number]; b: [number, number]; km: number } | null {
  const inBox = ([x, y]: number[]) => x >= box[0][0] && x <= box[1][0] && y >= box[0][1] && y <= box[1][1];
  // the 1:10m strait coasts first, the 1:50m shapes where no strait box covers the place
  const fine10 = (feature(straits as any, (straits as any).objects.coasts) as any).features as any[];
  const ringsOf = (g: any): number[][][] => (g.type === "Polygon" ? g.coordinates : g.coordinates.flat());
  const pts = (a3: string): [number, number][] => {
    const near = fine10.filter((f) => f.properties.a3 === a3).flatMap((f) => ringsOf(f.geometry).flat().filter(inBox));
    if (near.length) return near as [number, number][];
    const c = worldFor(0).byA3.get(a3);
    if (!c) return [];
    return ringsOf(c.geo.geometry).flat().filter(inBox) as [number, number][];
  };
  const A = pts(a3a);
  const B = pts(a3b);
  let best: { a: [number, number]; b: [number, number]; km: number } | null = null;
  for (const p of A) for (const q of B) {
    const d = km(p, q);
    if (!best || d < best.km) best = { a: p, b: q, km: d };
  }
  return best;
}
