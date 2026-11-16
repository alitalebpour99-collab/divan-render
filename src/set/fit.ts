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

const ENDS = /[.!؟?،,؛:»]$/;

/**
 * Words as balanced lines: the fewest lines that fit the width, and of every
 * way to cut the words into that many lines the one that reads best (the
 * owner's review of 2026-11-16: «تولید نفت / خام. یعنی چه؟»). In order: no
 * line of one word when there is another way, a sentence kept whole on its
 * line (a cut inside a line that holds a full stop or a comma costs), then the
 * lines nearest to one another in width.
 */
export function breakLines(words: string[], width: number, w: (s: string) => number): string[] {
  return cutLines(words, width, w).lines;
}

/** breakLines with what is still wrong with the best cut: lines of one word, and lines that hold the end of one sentence and the start of the next. */
export function cutLines(words: string[], width: number, w: (s: string) => number): { lines: string[]; flaws: number } {
  let count = 1;
  let cur: string[] = [];
  for (const word of words) {
    if (cur.length && w([...cur, word].join(" ")) > width) {
      count += 1;
      cur = [word];
    } else cur.push(word);
  }
  if (count <= 1 || words.length > 40) return { lines: greedy(words, width, w), flaws: 0 };
  const memo = new Map<string, number>();
  const wide = (i: number, j: number) => {
    const key = i + ":" + j;
    let v = memo.get(key);
    if (v === undefined) {
      v = w(words.slice(i, j).join(" "));
      memo.set(key, v);
    }
    return v;
  };
  // a mark inside the line (not at its end) means the line starts a new sentence or clause it does not finish
  const inner = (i: number, j: number) => words.slice(i, j - 1).filter((x) => ENDS.test(x)).length;
  let best: number[] | null = null;
  let bestCost = Infinity;
  let bestFlaws = 0;
  const walk = (from: number, left: number, cuts: number[], lone: number, marks: number, lo: number, hi: number) => {
    if (left === 1) {
      const v = wide(from, words.length);
      if (v > width) return;
      const n = words.length - from;
      const cost = (lone + (n === 1 ? 1 : 0)) * 4 * width + (marks + inner(from, words.length)) * 0.3 * width + (Math.max(hi, v) - Math.min(lo, v));
      if (cost < bestCost) {
        bestCost = cost;
        best = [...cuts];
        bestFlaws = lone + (n === 1 ? 1 : 0) + marks + inner(from, words.length);
      }
      return;
    }
    for (let j = from + 1; j <= words.length - (left - 1); j += 1) {
      const v = wide(from, j);
      if (v > width) break;
      walk(j, left - 1, [...cuts, j], lone + (j - from === 1 ? 1 : 0), marks + inner(from, j), Math.min(lo, v), Math.max(hi, v));
    }
  };
  walk(0, count, [], 0, 0, Infinity, 0);
  if (!best) return { lines: greedy(words, width, w), flaws: 0 };
  const edges = [0, ...(best as number[]), words.length];
  return { lines: edges.slice(1).map((e, i) => words.slice(edges[i], e).join(" ")), flaws: bestFlaws };
}

function greedy(words: string[], width: number, w: (s: string) => number): string[] {
  const lines: string[] = [];
  let cur: string[] = [];
  for (const word of words) {
    if (cur.length && w([...cur, word].join(" ")) > width) {
      lines.push(cur.join(" "));
      cur = [word];
    } else cur.push(word);
  }
  if (cur.length) lines.push(cur.join(" "));
  return lines;
}

/**
 * How uneven a block of lines is: the narrowest line against the widest (1 is
 * even). The gate refuses a block of three words a line or more whose
 * narrowest line is under RAGGED of its widest.
 */
export const RAGGED = 0.42;
export function evenness(lines: { text: string; size: number; weight?: number }[], family: string, m: Measure = measure): number {
  if (lines.length < 2) return 1;
  const ws = lines.map((l) => m(l.text, l.size, l.weight ?? 700, family));
  return Math.min(...ws) / Math.max(...ws);
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
    const cut = cutLines(words, a.width, w);
    let lines = cut.lines;
    if (lines.length <= a.maxLines && lines.every((l) => w(l) <= a.width)) {
      let at = size;
      // a little smaller (to 86 % of this size) when that lets a sentence keep its line or a lone word find company
      if (cut.flaws) {
        for (let s2 = size - 2; s2 >= Math.max(min, Math.ceil(size * 0.86)); s2 -= 2) {
          const w2 = (t: string) => m(t, s2, weight, a.family);
          const c2 = cutLines(words, a.width, w2);
          if (c2.lines.length <= lines.length && c2.flaws < cut.flaws && c2.lines.every((l) => w2(l) <= a.width)) {
            lines = c2.lines;
            at = s2;
            if (!c2.flaws) break;
          }
        }
      }
      const wAt = (t: string) => m(t, at, weight, a.family);
      return { lines: lines.map((text) => ({ text, size: at, weight, color: a.color })), overflow: false, width: Math.max(...lines.map(wAt)) };
    }
  }
  const w = (s: string) => m(s, min, weight, a.family);
  const lines = breakLines(words, a.width, w);
  return { lines: lines.map((text) => ({ text, size: min, weight, color: a.color })), overflow: true, width: Math.max(...lines.map(w)) };
}

/** Height of fitted lines at a line height. */
export const linesHeight = (lines: Line[], lead = 1.4) => lines.reduce((h, l) => h + l.size * lead, 0);
