// Sea lanes and pipelines. The ones with a real route come from data/routes.json (GeoJSON with a source note on each:
// the Strait of Hormuz traffic separation scheme, the Red Sea route, the Goreh–Jask, East–West and Habshan–Fujairah
// pipelines); a lane runs in the order ships travel it. The others are schematic lanes for the ambient comets: drawn
// as motion, never labelled and never counted (map-engine-fa.md §3, «دنباله‌دارهای محیطی»).
import routes from "./data/routes.json";

export type Lane = { id: string; path: [number, number][] };
export type Route = { id: string; kind: "sea-lane" | "pipeline"; fa: string; en: string; names: string[]; source: string; accuracy_km: number; path: [number, number][] };

export const ROUTES: Route[] = (routes as unknown as { features: { properties: Record<string, unknown>; geometry: { coordinates: [number, number][] } }[] }).features.map((f) => ({
  id: String(f.properties.id),
  kind: f.properties.kind as Route["kind"],
  fa: String(f.properties.fa),
  en: String(f.properties.en),
  names: (f.properties.names as string[] | undefined) ?? [],
  source: String(f.properties.source),
  accuracy_km: Number(f.properties.accuracy_km),
  path: f.geometry.coordinates,
}));
const route = (id: string) => ROUTES.find((r) => r.id === id)!.path;

export const LANES: Lane[] = [
  { id: "hormuz-out", path: route("hormuz-tss-out") },
  { id: "hormuz-in", path: route("hormuz-tss-in") },
  { id: "gulf-qatar", path: [[49.9, 28.7], [51.2, 27.4], [52.4, 26.1], [54.0, 25.6], [55.4, 26.0]] },
  { id: "red-sea", path: route("red-sea-north") },
  { id: "arabian-sea", path: [[58.8, 23.6], [60.5, 20.5], [63.5, 16.5], [68.5, 13.0], [73.0, 10.0]] },
  { id: "malacca", path: [[94.5, 6.2], [97.8, 5.0], [100.2, 3.1], [102.5, 1.9], [103.85, 1.2], [105.2, 2.0], [108.5, 5.0]] },
  { id: "bosporus", path: [[27.2, 40.4], [28.9, 40.95], [29.05, 41.15], [29.3, 41.4], [31.0, 42.3], [33.5, 43.0]] },
  { id: "suez-med", path: [[32.3, 31.3], [30.5, 32.6], [26.0, 34.0], [20.0, 35.6], [14.0, 37.2]] },
  { id: "caspian", path: [[49.6, 37.6], [50.5, 39.5], [50.2, 41.5], [49.9, 43.6], [49.0, 45.6]] },
];

export const PIPELINES = ROUTES.filter((r) => r.kind === "pipeline");
