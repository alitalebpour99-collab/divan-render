// Divan's twelve templates (bible v2 §3 and v3), all in the one style of «تصمیم امروز». A template is the shape of
// the story: which beats, in which order, how long. The idea of each video is its own (the concept, concepts.ts).
import type { BeatKind, ReelContent, TemplateId } from "./types";

export type Template = {
  id: TemplateId;
  fa: string;
  /** when it airs (Tehran) */
  when: string;
  seconds: [number, number];
  convention: "roads" | "actors";
  /** the beats in order: a kind, how many (min, max) */
  recipe: [BeatKind, number, number][];
  families: string[];
};

export const TEMPLATES: Record<TemplateId, Template> = {
  today: { id: "today", fa: "تصمیم امروز", when: "روزانه، ظهر", seconds: [22, 36], convention: "roads", recipe: [["hook", 1, 1], ["map", 0, 2], ["chart", 0, 1], ["number", 0, 1], ["road", 2, 3], ["gauge", 0, 1], ["poll", 1, 1]], families: ["route-and-strait", "price-under-pen", "if-closed", "targets-map", "yesterday-today", "who-said-what", "table-of-talks"] },
  advisor: { id: "advisor", fa: "مشاور", when: "شنبه عصر", seconds: [20, 32], convention: "roads", recipe: [["hook", 1, 1], ["map", 0, 1], ["number", 0, 1], ["road", 1, 3], ["poll", 1, 1]], families: ["advisor-close-up", "one-road-opened"] },
  scenarios: { id: "scenarios", fa: "سناریوها", when: "دوشنبه", seconds: [24, 36], convention: "roads", recipe: [["hook", 1, 1], ["map", 1, 4], ["poll", 1, 1]], families: ["three-futures", "branching-map"] },
  number: { id: "number", fa: "عدد", when: "سه‌شنبه", seconds: [15, 26], convention: "roads", recipe: [["hook", 1, 1], ["chart", 0, 1], ["number", 1, 1], ["road", 0, 2], ["poll", 1, 1]], families: ["price-under-pen", "table-to-goods", "three-months-chart"] },
  council: { id: "council", fa: "شورا", when: "چهارشنبه", seconds: [24, 36], convention: "roads", recipe: [["hook", 1, 1], ["road", 2, 3], ["gauge", 0, 1], ["poll", 1, 1]], families: ["three-votes", "council-table"] },
  week: { id: "week", fa: "یک هفته بعد", when: "جمعه", seconds: [24, 40], convention: "roads", recipe: [["hook", 1, 1], ["road", 2, 4], ["poll", 1, 1]], families: ["what-came-of-it", "week-timeline"] },
  dilemma: { id: "dilemma", fa: "دوراهی", when: "جای خالی", seconds: [18, 30], convention: "roads", recipe: [["hook", 1, 1], ["map", 0, 1], ["road", 2, 2], ["poll", 1, 1]], families: ["two-roads", "no-verdict"] },
  table3: { id: "table3", fa: "میز سه‌جانبه", when: "دیدار یا توافق", seconds: [26, 40], convention: "actors", recipe: [["hook", 1, 1], ["flags", 1, 1], ["demand", 3, 3], ["map", 0, 2], ["poll", 1, 1]], families: ["whats-on-the-table", "who-wants-what", "three-demands-one-deal"] },
  redline: { id: "redline", fa: "خط قرمز", when: "وقتی اعلام شود", seconds: [20, 30], convention: "actors", recipe: [["hook", 1, 1], ["map", 2, 4], ["road", 0, 2], ["poll", 1, 1]], families: ["red-line-on-map", "events-near-the-line"] },
  strait: { id: "strait", fa: "تنگه", when: "رویداد دریایی", seconds: [24, 36], convention: "actors", recipe: [["hook", 1, 1], ["map", 2, 4], ["chart", 0, 1], ["number", 0, 1], ["poll", 1, 1]], families: ["route-and-strait", "one-day-of-traffic", "if-closed", "alternative-route"] },
  fronts: { id: "fronts", fa: "جبهه‌ها روی نقشه", when: "هفتگی", seconds: [28, 45], convention: "actors", recipe: [["hook", 1, 1], ["map", 3, 5], ["number", 0, 1], ["poll", 1, 1]], families: ["contact-line-this-week", "before-after-one-map", "distance-to-iran"] },
  bases: { id: "bases", fa: "پایگاه‌ها", when: "هم‌پیمانی‌ها", seconds: [20, 30], convention: "actors", recipe: [["hook", 1, 1], ["map", 2, 4], ["poll", 1, 1]], families: ["bases-around-iran", "colours-of-the-region", "corridors"] },
};

export const MAP_TEMPLATES: TemplateId[] = ["table3", "redline", "strait", "fronts", "bases"];

/** Whether a content's beats follow its template's recipe: the reasons it does not. */
export function recipeProblems(c: ReelContent): string[] {
  const t = TEMPLATES[c.template];
  if (!t) return [`unknown template ${c.template}`];
  const out: string[] = [];
  if (c.convention !== t.convention) out.push(`colour convention ${c.convention}, the template wants ${t.convention}`);
  if (c.beats[0]?.kind !== "hook") out.push("the first beat is not the hook");
  if (c.beats[c.beats.length - 1]?.kind !== "poll") out.push("the last beat is not the poll");
  for (const [kind, min, max] of t.recipe) {
    const n = c.beats.filter((b) => b.kind === kind).length;
    if (n < min || n > max) out.push(`${n} ${kind} beat(s), the template wants ${min} to ${max}`);
  }
  const allowed = new Set(t.recipe.map((r) => r[0]));
  for (const b of c.beats) if (!allowed.has(b.kind)) out.push(`a ${b.kind} beat has no place in ${t.id}`);
  return out;
}
