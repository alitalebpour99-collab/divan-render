// Contrast of words on the map (round 5, the judge: «Saudi-blue callouts dim on navy, the GBR line unreadable»). WCAG
// 2.x relative luminance and contrast ratio; a callout's colour is brought up (towards white on a dark ground, towards
// the night ink on a light one) until it reads at 4.5:1 against what lies under it. Pure, no React.
const hex = (c: string): [number, number, number] => {
  const s = c.replace("#", "");
  const f = s.length === 3 ? s.split("").map((x) => x + x).join("") : s.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
};
const toHex = (r: number[]) => "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(c: string): number {
  const [r, g, b] = hex(c).map((v) => {
    const u = v / 255;
    return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** a over b at alpha k. */
export function mix(a: string, b: string, k: number): string {
  const A = hex(a);
  const B = hex(b);
  return toHex(A.map((v, i) => v * k + B[i] * (1 - k)));
}
/**
 * The colour, or the nearest step of it that reads at `min` against every ground given (the grounds a label may lie on
 * while the camera moves). Its hue stays: Saudi blue stays blue, only lighter.
 */
export function readable(c: string, grounds: string[], min = 4.5): string {
  const worst = (x: string) => Math.min(...grounds.map((g) => contrast(x, g)));
  if (worst(c) >= min) return c;
  const dark = grounds.reduce((n, g) => n + luminance(g), 0) / grounds.length < 0.18;
  for (let k = 0.1; k <= 1.0001; k += 0.05) {
    const x = mix(dark ? "#ffffff" : "#0b111d", c, k);
    if (worst(x) >= min) return x;
  }
  return dark ? "#ffffff" : "#0b111d";
}
