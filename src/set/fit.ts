// Text that fits its plate: broken into lines at word boundaries and made
// smaller until it fits the width and the number of lines, measured with the
// real font (a canvas shapes Persian as the page does). It runs in
// calculateMetadata once the fonts have loaded, so the plan holds the lines
// exactly as they are drawn, and the gate checks those. Outside a browser (the
// tests) a rough width per letter stands in for the canvas.
import { MIN_TEXT, type Line } from "./space.ts";

export type Measure = (text: string, size: number, weight: number, family: string) => number;

let ctx: CanvasRenderingContext2D | null = null;
/** The width of a text in pixels, from the browser's canvas; a rough estimate where there is none. */
export const measure: Measure = (text, size, weight, family) => {
  if (typeof document === "undefined") return text.length * size * 0.5;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.5;
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.direction = "rtl";
  return ctx.measureText(text).width;
};

/** Loads every weight the set uses before anything is measured. */
export async function ready(families: string[]) {
  if (typeof document === "undefined") return;
  await document.fonts.ready;
  await Promise.all(families.flatMap((f) => [400, 500, 700, 800].map((w) => document.fonts.load(`${w} 40px "${f}"`, "دیوان ۱۲۳")))).catch(() => undefined);
}

function breakLines(words: string[], width: number, w: (s: string) => number): string[] {
  const lines: string[] = [];
  let cur: string[] = [];
  for (const word of words) {
    const next = [...cur, word].join(" ");
    if (cur.length && w(next) > width) {
      lines.push(cur.join(" "));
      cur = [word];
    } else cur.push(word);
  }
  if (cur.length) lines.push(cur.join(" "));
  // balance: move a word down while that makes the longest line shorter
  for (let i = lines.length - 2; i >= 0; i -= 1) {
    for (;;) {
      const a = lines[i].split(" ");
      if (a.length < 2) break;
      const b = [a[a.length - 1], ...lines[i + 1].split(" ")].join(" ");
      const a2 = a.slice(0, -1).join(" ");
      if (Math.max(w(a2), w(b)) < Math.max(w(lines[i]), w(lines[i + 1])) && w(b) <= width) {
        lines[i] = a2;
        lines[i + 1] = b;
      } else break;
    }
  }
  return lines;
}

export type FitAsk = { text: string; width: number; maxLines: number; size: number; min?: number; weight?: number; family: string; color?: string };

/**
 * The text as lines that fit: the size goes down two pixels at a time from
 * `size` to `min` (never under MIN_TEXT unless `min` says so) until the lines
 * fit `width` and `maxLines`. A text that does not fit even at `min` is laid
 * out at `min` and reported as `overflow` (the gate refuses such a Reel).
 */
export function fit(a: FitAsk, m: Measure = measure): { lines: Line[]; overflow: boolean; width: number } {
  const weight = a.weight ?? 700;
  const min = a.min ?? MIN_TEXT;
  // words part at plain spaces only: a no-break space holds a Latin name together (plans.ts, plainFa)
  const words = a.text.trim().split(/[ \t\n]+/).filter(Boolean);
  for (let size = a.size; size >= min; size -= 2) {
    const w = (s: string) => m(s, size, weight, a.family);
    const lines = breakLines(words, a.width, w);
    if (lines.length <= a.maxLines && lines.every((l) => w(l) <= a.width)) return { lines: lines.map((text) => ({ text, size, weight, color: a.color })), overflow: false, width: Math.max(...lines.map(w)) };
  }
  const w = (s: string) => m(s, min, weight, a.family);
  const lines = breakLines(words, a.width, w);
  return { lines: lines.map((text) => ({ text, size: min, weight, color: a.color })), overflow: true, width: Math.max(...lines.map(w)) };
}

/** Height of fitted lines at a line height. */
export const linesHeight = (lines: Line[], lead = 1.4) => lines.reduce((h, l) => h + l.size * lead, 0);
