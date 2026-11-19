// The timeline of a decision Reel and the checks it must pass before it is drawn (pure: no React).
// The scenes follow the narrator: each lasts as long as its line takes, never less than its minimum.
// The checks run in calculateMetadata; the worker refuses a Reel whose checks fail (props.qc),
// and then measures the finished file too (gate.mjs fileChecks: frozen picture, loop, loudness, darkness).
import type { DecisionProps } from "./types";

export const FPS = 30;
export const PAD = 6;
/** the last frames bring the first picture back, for the loop */
export const LOOP = 14;
/** the close holds the poll, then the badge, then the loop */
export const ASK_EXTRA = 34;
const MIN: Record<string, number> = { start: 96, fact: 100, ask: 110 };
const MIN_CARD = 104;

/** The moments of a Reel, in order: start, fact (when there are facts or the stage is a chart), one per card, ask. */
export const cuesOf = (p: DecisionProps) => ["start", ...(p.facts?.length || p.factChart ? ["fact"] : []), ...p.cards.map((_, i) => `c${i + 1}`), "ask"];

export type Scene = { cue: string; from: number; len: number };

export function scenesOf(p: DecisionProps, lines: { cue: string; frames: number; file?: string }[] = []) {
  const scenes: Scene[] = [];
  const voice: { file: string; from: number; frames: number }[] = [];
  let at = 0;
  for (const cue of cuesOf(p)) {
    const line = lines.find((l) => l.cue === cue);
    const lead = cue === "start" ? 2 : 5;
    const min = MIN[cue] ?? MIN_CARD;
    const len = Math.max(min, line ? lead + line.frames + PAD : 0) + (cue === "ask" ? ASK_EXTRA + LOOP : 0);
    if (line?.file) voice.push({ file: line.file, from: at + lead, frames: line.frames });
    scenes.push({ cue, from: at, len });
    at += len;
  }
  return { scenes, voice, total: at };
}

// ---- the moments inside a scene (in frames from the scene's start): the drawing and the checks use the same ----
export const ROW_AT = (i: number) => 12 + i * 14;
export const ROW_IN = 10;
export const CARD_IN = 12;
export const CARD_OUT = 8;
/** the chart's pen: from its start to its end, as shares of the scene */
export const PEN = [0.05, 0.62] as const;
export const FACT_AT = (i: number) => 4 + i * 20;

const DOT = /[؀-ۿ]\s*[·|]|[·|]\s*[؀-ۿ]/;
const NUMERAL = /^[0-9۰-۹٫٬.,/]+$/;
const words = (s: string) =>
  String(s ?? "")
    .replace(/[؟?!.،,؛:«»"()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
/** a figure is seen at a glance: two weigh one word (as the set style's gate counts) */
export const hookWeight = (s: string) => {
  const w = words(s);
  const n = w.filter((x) => NUMERAL.test(x)).length;
  return w.length - n + Math.ceil(n / 2);
};
/** About how many lines a text takes in a column of `width` px at `size` px (Vazirmatn: a Persian letter is about half its size wide). */
export const linesOf = (s: string, size: number, width: number) => Math.max(1, Math.ceil((String(s).length * size * 0.5) / width));

/** What the cards may hold so that a card fits above the gauge (1080 × 1920, the safe column 820 px wide). */
export const LIMITS = { hookL1: 34, hookL2: 26, title: 30, row: 72, sub: 70, ask: 24, factBig: 18, factText: 80, cards: [2, 3], rows: [2, 3] } as const;
/** The card's room: from its top (y 520) to the gauge (y 1420), or to the safe bottom (1580) without a gauge. */
export function cardHeight(card: DecisionProps["cards"][number]) {
  const inner = 820 - 64 - 72;
  let h = 52 + 26; // padding and the top edge
  for (const r of card.rows) h += 44 + linesOf(r.text, 44, inner) * 61 + (r.sub ? 48 : 0) + 22;
  return h;
}

export type Check = { id: string; ok: boolean; detail: string; fa: string };

export function checksOf(p: DecisionProps, scenes: Scene[], voice: { from: number }[], total: number): Check[] {
  const out: Check[] = [];
  const add = (id: string, ok: boolean, detail: string, fa: string) => out.push({ id, ok, detail, fa });
  const secs = total / FPS;
  add("length", secs >= 15 && secs <= 35, `${secs.toFixed(1)} s (15 to 35)`, "طول ویدیو بیرون از ۱۵ تا ۳۵ ثانیه است");
  const hw = hookWeight(`${p.hook.l1} ${p.hook.l2}`);
  add("hook-words", hw <= 7 && hw >= 2, `hook of ${hw} words (7 or fewer)`, "جملهٔ اول بیش از ۷ کلمه است");
  add("hook-fit", p.hook.l1.length <= LIMITS.hookL1 && p.hook.l2.length <= LIMITS.hookL2, `hook lines ${p.hook.l1.length} and ${p.hook.l2.length} letters`, "جملهٔ اول در قاب جا نمی‌شود");
  // the event in the first frame: a map with a mark on it, a chart, or the wire with its headline
  const st = p.stage;
  const event = st.kind === "map" ? (st.map.hits?.length ?? 0) + (st.map.tankers?.length ?? 0) + (st.map.pair ? 1 : 0) > 0 : st.kind === "chart" ? st.chart.points.length >= 3 : Boolean(st.wire.headline);
  add("event-first", event, `stage ${st.kind} with its event`, "رویداد در فریم اول دیده نمی‌شود");
  // at most three big texts: the hook, the fact (its big words or the chart's counter), the closing question
  const middles = (p.facts?.length ? 1 : 0) + (p.factChart ? 1 : 0) + (st.kind === "chart" ? 1 : 0);
  const bigs = 2 + middles;
  add("big-texts", bigs <= 3 && (p.facts?.length ?? 0) <= 2, `${bigs} big texts, ${p.facts?.length ?? 0} fact cards`, "بیش از سه متن بزرگ روی صفحه است");
  add("voice-zero", !voice.length || voice[0].from <= 3, voice.length ? `first line at frame ${voice[0].from}` : "no narrator", "صدای راوی از ثانیهٔ صفر شروع نمی‌شود");
  const n = p.cards.length;
  add("cards", n >= LIMITS.cards[0] && n <= LIMITS.cards[1] && p.cards.every((c) => c.rows.length >= LIMITS.rows[0] && c.rows.length <= LIMITS.rows[1]), `${n} cards`, "شمار کارت‌ها یا خط‌هایشان درست نیست");
  const room = p.gauge ? 1420 - 520 - 150 : 1580 - 520 - 150;
  const tall = p.cards.map((c) => cardHeight(c)).reduce((a, b) => Math.max(a, b), 0);
  const long = p.cards.flatMap((c) => [c.title.length > LIMITS.title ? `title «${c.title}»` : "", ...c.rows.map((r) => (r.text.length > LIMITS.row || (r.sub ?? "").length > LIMITS.sub ? `row «${r.text.slice(0, 20)}…»` : ""))]).filter(Boolean);
  add("card-fit", tall <= room && !long.length && p.ask.q.length <= LIMITS.ask, `tallest card ${tall} px of ${room}${long.length ? `; too long: ${long.join(", ")}` : ""}`, "متن یکی از کارت‌ها در قاب جا نمی‌شود");
  const factsFit = (p.facts ?? []).every((f) => f.big.length <= LIMITS.factBig && f.text.length <= LIMITS.factText);
  add("fact-fit", factsFit, "fact cards within their room", "متن کارت واقعیت در قاب جا نمی‌شود");
  // every piece of evidence and every fact with its source on the screen
  const sourced = p.cards.every((c) => c.rows.filter((r) => r.icon === "evidence").every((r) => Boolean(r.sub))) && (p.facts ?? []).every((f) => Boolean(f.source)) && Boolean(st.kind === "map" ? st.map.source : st.kind === "chart" ? st.chart.source : st.wire.source) && (!p.factChart || Boolean(p.factChart.source));
  add("sources", sourced, "every fact and piece of evidence has its source", "یک واقعیت یا سند منبع ندارد");
  const all = [p.kicker, p.hook.l1, p.hook.l2, p.role ?? "", p.ask.q, ...(p.facts ?? []).flatMap((f) => [f.big, f.text, f.source]), ...p.cards.flatMap((c) => [c.title, c.seal ?? "", ...c.rows.flatMap((r) => [r.label, r.text, r.sub ?? ""])])];
  add("no-dot", !all.some((s) => DOT.test(s)), "no «·» or «|» beside Persian", "کنار متن فارسی «·» یا «|» آمده است");
  // the AI advisors are labelled as AI, on every card
  if (p.variant === "council") add("ai-label", p.cards.every((c) => /هوش مصنوعی/.test(`${c.seal ?? ""} ${c.title}`)), "every advisor labelled as AI", "مشاوران هوش مصنوعی برچسب ندارند");
  // the motion: every scene's pieces are in before the scene leaves, the chart's pen ends with time to read it
  const short = scenes.filter((s) => s.cue.startsWith("c") && s.len < ROW_AT(2) + ROW_IN + CARD_OUT + 30);
  add("motion-cards", !short.length, short.length ? `scenes too short for their rows: ${short.map((s) => s.cue).join(", ")}` : "every card's rows are in a second before it leaves", "خط‌های یک کارت پیش از رفتنش کامل نمی‌شوند");
  const chart = st.kind === "chart" ? st.chart : p.factChart;
  if (chart) {
    const pts = chart.points;
    const fine = pts.length >= 3 && pts.every((v) => Number.isFinite(v)) && Math.max(...pts) > Math.min(...pts);
    const s0 = scenes.find((s) => s.cue === (st.kind === "chart" ? "start" : "fact")) ?? scenes[0];
    add("chart", fine && s0.len * (1 - PEN[1]) >= 24, `${pts.length} points, the pen ends ${Math.round(s0.len * (1 - PEN[1]))} frames before the scene does`, "نمودار درست کشیده نمی‌شود");
  }
  return out;
}
