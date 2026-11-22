// Sea areas a report can name («در داخل و اطراف تنگهٔ هرمز»), as rough polygons [lon, lat] for hatching (round 3,
// 21 Nov 2026). An area is what the report says, never a point it does not give: a zone says «somewhere here».
// Drawn by hand from Natural Earth's coasts at the 1:50m scale; they follow the water, not the borders at sea.
// Round 7: these outlines are Divan's own sketches of where a sea is, not an advisory's: they name a sea and are never
// hatched as a danger area. A danger area is drawn only from its source's own outline (`source`), clipped to the water.
export type Zone = { id: string; t: string; polygon: [number, number][]; /** the official outline's source, when it is one (UKMTO/JMIC advisory) */ source?: string; /** where its name is written */ at?: [number, number] };

export const ZONES: Zone[] = [
  { id: "hormuz", t: "تنگهٔ هرمز", polygon: [[55.6, 26.95], [56.6, 27.05], [57.1, 26.4], [56.95, 25.75], [56.45, 25.95], [56.3, 26.35], [55.85, 26.45]] },
  { id: "gulfOfOman", t: "دریای عمان", polygon: [[56.95, 25.7], [57.4, 25.6], [59.0, 25.3], [61.6, 25.1], [61.0, 22.6], [59.0, 22.8], [58.0, 23.7], [56.6, 24.6]] },
  { id: "persianGulf", t: "خلیج فارس", polygon: [[48.5, 29.7], [50.3, 29.2], [51.3, 27.9], [53.5, 26.9], [55.5, 26.7], [56.1, 26.3], [55.6, 25.5], [54.1, 24.2], [52.0, 24.0], [51.4, 25.1], [50.6, 25.6], [49.9, 26.6], [48.9, 27.6], [48.1, 29.1]] },
  { id: "babElMandeb", t: "تنگهٔ باب‌المندب", polygon: [[42.6, 13.6], [43.6, 13.0], [43.9, 12.4], [43.3, 12.2], [42.7, 12.6], [42.4, 13.1]] },
  { id: "redSea", t: "دریای سرخ", polygon: [[32.6, 29.8], [34.6, 27.6], [36.9, 24.0], [39.0, 20.6], [41.5, 16.6], [42.9, 14.0], [42.3, 13.6], [40.2, 15.6], [38.2, 18.6], [35.6, 23.2], [33.7, 26.8], [32.4, 29.5]] },
];
export const zoneOf = (id: string) => ZONES.find((z) => z.id === id) ?? null;
