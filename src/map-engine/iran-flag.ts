// The flag of the Islamic Republic of Iran as its law sets it (the Constitution,
// article 18, and the national standard ISIRI 1, 1980): three equal bands, green,
// white and red, in the proportion 4 : 7; the emblem in red at the centre; and
// «الله اکبر» in white stylised Kufic, eleven times along the lower edge of the
// green band and eleven times along the upper edge of the red band: 22 in all,
// for 22 Bahman 1357. The geometry is that of Wikimedia Commons «Flag of
// Iran.svg» (public domain), on its own 630 × 360 sheet, so the emblem and the
// inscriptions are the real ones and not a sketch.
//
// The rule for Iran's flags in a Reel:
//  - «IRN» is always this flag, today's flag: every comparison, every figure of
//    today, every map and every hook shows it.
//  - A historical flag (the lion and sun, before Bahman 1357) is never drawn in
//    its place. It may only come as its own key (for example «IRN-1343») on a
//    piece whose episode is explicitly about that time (a «دههٔ تو» or «آن موقع
//    و حالا» episode dated before 1979), with its year written next to it. No
//    such key exists yet (HISTORICAL_FLAGS is empty), so no Reel can show one.
// Pure data, no JSX: the tests read it without a browser.

export const IRAN_FLAG = {
  width: 630,
  height: 360,
  green: "#239f40",
  white: "#ffffff",
  red: "#da0000",
  /** the 22 takbir: one group of strokes repeated every 56 units, 11 times, from (8.4, 100.4) */
  takbir: {
    origin: [8.4, 100.4] as const,
    step: 56,
    count: 11,
    stroke: 2,
    /** «الله اکبر» in stylised Kufic, drawn at 1.4 × */
    words: "M0,1H26M1,10V5H9V9H17V5H12M4,9H6M26,9H21V5H29M29,0V9H37V0M33,0V9",
    wordsScale: 1.4,
    /** the line along the band edge, drawn at 2.8 × */
    line: "M0,7H9M10,7H19",
    lineScale: 2.8,
    /** the words on the green band (y 0) and on the red band (y 145.2); the lines at 0 and 120 */
    wordsAt: [0, 145.2] as const,
    lineAt: [0, 120] as const,
  },
  /** the emblem (four crescents, the sword, the shadda): its right half, mirrored for the left, 45 × at the centre */
  emblem: {
    scale: 45,
    centre: [315, 180] as const,
    half: [
      "M 1.015679,-0.01556 A 0.77528237,0.7752862 0 0 1 0.60199011,0.67052066 1.0040699,1.0040749 0 0 0 0.44435035,-0.74067818 q -0.0221518,-0.0177005 -0.0452767,-0.0341288 A 0.77575926,0.7757631 0 0 1 1.015679,-0.01556 Z",
      "m 0.65590144,-0.04683837 a 0.92689013,0.92689472 0 0 1 -1.21301321,0.88105983 q 0.0245198,0.00118 0.0492749,0.001178 a 1.0158759,1.0158809 0 0 0 0.84183925,-1.58419413 0.92423346,0.92423804 0 0 1 0.32189906,0.7019563 z",
      "M 0.26154437,-0.94393072 A 0.14154065,0.14154135 0 0 1 1.7299476e-6,-0.86887791 L -0.01707249,-0.88602911 1.7299476e-6,-0.96931462 A 0.1321491,0.13214975 0 0 0 0.24983482,-1.0002001 a 0.14021999,0.14022068 0 0 1 0.0117096,0.0562694 z",
      "M 0.11992727,-0.71445117 A 0.31475286,0.31475442 0 0 1 1.2855032e-6,-0.81025163 L -0.0506876,-0.01642556 1.2855032e-6,1.0001998 0.07882572,0.89166862 0.0891995,0.64144186 0.09996594,0.3809197 l 0.0014156,-0.0334002 4.7111e-4,-0.0124172 0.002279,-0.0541474 0.006758,-0.1640148 0.005501,-0.13242286 0.001571,-0.03827263 0.002042,-0.04872535 V -0.71445117 Z M 1.2855032e-6,-0.54965037 9.0174383e-5,-0.54949481 1.2855032e-6,-0.54933925 Z m 0,0.86447753 V 0.3145916 L 3.946188e-4,0.31468049 Z",
    ] as readonly string[],
  },
} as const;

/** Width over height of Iran's flag: 7 / 4. */
export const IRAN_ASPECT = IRAN_FLAG.width / IRAN_FLAG.height;

/** The x of each takbir group on the 630 sheet: 11 of them. */
export const takbirXs = (): number[] => Array.from({ length: IRAN_FLAG.takbir.count }, (_, i) => IRAN_FLAG.takbir.origin[0] + i * IRAN_FLAG.takbir.step);

/** Historical flags by key («IRN-1343» …). Empty on purpose: see the rule above. */
export const HISTORICAL_FLAGS: Readonly<Record<string, { year: string }>> = {};

/** Width over height of each state's flag as the Reels draw it. Iran: 7 : 4 by its law; the others 3 : 2. */
export const flagAspect = (iso3: string): number => (iso3 === "IRN" ? IRAN_ASPECT : 1.5);
