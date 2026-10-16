// The site's base map (Natural Earth, data/map/region.json), projected into a box of the frame.
import { geoGraticule, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import topoJson from "./data/region.json";

export type Extent = [[number, number], [number, number]];
export type Box = { x0: number; y0: number; x1: number; y1: number };

// the same windows the site's map uses (components/map/DivanMap.tsx)
export const EXTENTS: Record<"iran" | "region" | "archive", Extent> = {
  iran: [[43.8, 24.2], [63.4, 39.9]],
  region: [[31, 11.5], [64, 41]],
  archive: [[36, 24], [72, 44.5]],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = topoJson as any;

export function makeMap(extent: Extent, box: Box) {
  const proj = geoMercator().fitExtent(
    [
      [box.x0, box.y0],
      [box.x1, box.y1],
    ],
    { type: "MultiPoint", coordinates: [extent[0], extent[1], [extent[0][0], extent[1][1]], [extent[1][0], extent[0][1]]] },
  );
  const path = geoPath(proj);
  const d = (o: GeoPermissibleObjects) => path(o) ?? "";
  const geos = topo.objects.countries.geometries;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iranGeo = (feature(topo, topo.objects.countries) as any).features.find((f: any) => f.id === "364");
  return {
    d,
    land: d(merge(topo, geos)),
    iran: iranGeo ? d(iranGeo) : "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    borders: d(mesh(topo, topo.objects.countries, (a: any, b: any) => a !== b)),
    grat: d(geoGraticule().step([4, 4])()),
    at: (lon: number, lat: number): [number, number] => (proj([lon, lat]) as [number, number] | null) ?? [0, 0],
  };
}
