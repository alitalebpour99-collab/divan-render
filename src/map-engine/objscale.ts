// How big an object stands on the map (round 6, the judge: «objects are small on wide maps»). Pure, no React.
/** the smallest an object is drawn, as its art's scale (round 7, owner: «خوانا ولی متناسب با نقشه»: about 150 px wide on a 1080 px frame) */
export const MIN_SCALE = 0.58;
/** the beat's main thing (the refinery that burns, the mine, the ship at its point) a size larger than the rest */
export const MAIN_BOOST = 1.3;
/** The zoom an object is drawn at: the map's own (shrinking on a wide map), never under the minimum, the main thing boosted. */
/** round 7: the most an object is drawn, as its art's scale (about 185 px; the main thing a size larger, about 240 px) */
export const MAX_SCALE = 0.72;
export function objectZoom(zoom: number, scale: number, main?: boolean): number {
  const s = Math.max(0.1, scale);
  return Math.min(MAX_SCALE / s, Math.max(zoom, MIN_SCALE / s)) * (main ? MAIN_BOOST : 1);
}
