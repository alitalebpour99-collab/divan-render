// The colour of each series, shared by the Reels (kit.tsx paints with it) and the
// owner's desk on the site (the panel marks each format with it). No imports, so
// both sides can read it.

/** The hue of each series on the colour wheel (oklch), one per format. */
export const HUES: Record<string, number> = { seat: 250, dilemma: 90, region: 195, precedent: 295, talks: 340, war: 45, borders: 135, arsenal: 235, dollar: 162, nuclear: 115, figure: 70, quiz: 12, power: 32, thennow: 22, race: 275, decade: 318, five: 213, truefalse: 12 };
/**
 * How strong a series' colour is. Most series share one strength; two are
 * quiet on purpose, so that eleven series stay apart on the grid: the weapons
 * in steel, the figure of the day in sand.
 */
export const CHROMA: Record<string, number> = { arsenal: 0.05, figure: 0.06, power: 0.15, thennow: 0.14, race: 0.16, decade: 0.14, truefalse: 0.17 };
