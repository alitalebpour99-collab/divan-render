// The text rules a Reel is checked against before anything is drawn (owner, 21 Nov 2026: «متن‌ها رو بیشتر دقت کنه و
// کس‌شعر ننویسه»). Pure and free: the site runs them on a draft before its model fact-check (lib/agents/factcheck.ts),
// the renderer again on what it draws (checks.ts). What a rule finds is named line by line, so it can be cut or fixed.
//   filler       empty words that say nothing or dramatise («بی‌سابقه», «زنگ خطر», «همه‌چیز تغییر کرد» …)
//   spelling     Arabic «ي»/«ك», Latin digits beside Persian, «می» without its half-space, doubled spaces or marks
//   map          a callout or label that names a place (a city, a port, an island, a sea) while its mark stands far
//                from that place (the words contradict the map); a state's name is not a place
import { geoDistance } from "d3-geo";
import { PLACES_FA, SEA_PLACES_FA } from "../map-engine/names";
import type { Beat, Mark, ReelContent } from "./types";

export type TextIssue = { beat: number; field: string; text: string; rule: "filler" | "spelling" | "map"; detail: string };

/** Words and phrases that fill or dramatise without saying a fact (a line must state what happened, who says so, where, when). */
export const FILLER = [
  "بی‌سابقه", "بی سابقه", "زنگ خطر", "شوکه", "شوک‌آور", "همه چیز تغییر کرد", "همه‌چیز تغییر کرد", "باورنکردنی", "وحشتناک",
  "فاجعه‌بار", "انفجاری", "داغ‌ترین", "مهم‌ترین خبر", "حتما ببینید", "حتماً ببینید", "منتظر باشید", "به نظر می‌رسد", "گفته می‌شود",
  "برخی می‌گویند", "کارشناسان معتقدند", "بسیاری معتقدند", "در شرایطی که", "قابل توجه", "چشمگیر", "عجیب", "رازآلود",
];

/** every line of a Reel a viewer reads or hears, with where it lives */
export function linesOf(c: ReelContent): { beat: number; field: string; text: string; mark?: Mark }[] {
  const out: { beat: number; field: string; text: string; mark?: Mark }[] = [];
  const add = (beat: number, field: string, text?: string, mark?: Mark) => {
    if (text && text.trim()) out.push({ beat, field, text, ...(mark ? { mark } : {}) });
  };
  c.beats.forEach((b: Beat, i) => {
    add(i, "say", b.say);
    if (b.kind === "hook") (add(i, "title", b.title), add(i, "sub", b.sub));
    if (b.kind === "map") add(i, "caption", b.caption);
    if (b.kind === "number") (add(i, "big", b.big), add(i, "unit", b.unit), add(i, "text", b.text));
    if (b.kind === "chart") add(i, "chart", b.chart.title);
    if (b.kind === "road") (add(i, "road", b.road.title), add(i, "cost", b.road.cost));
    if (b.kind === "demand") add(i, "wants", b.wants);
    if (b.kind === "flags") add(i, "flags", b.title);
    if (b.kind === "poll") (add(i, "q", b.q), b.options.forEach((o, k) => add(i, `option${k}`, o.title)));
    const marks = b.kind === "hook" || b.kind === "map" || b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : [];
    marks.forEach((m, k) => {
      if (m.kind === "callout") (add(i, `callout${k}`, m.bold, m), add(i, `callout${k}.sub`, m.sub, m));
      if (m.kind === "label") add(i, `label${k}`, m.t, m);
    });
  });
  return out;
}

const deg = (a: [number, number], b: [number, number]) => (geoDistance(a, b) * 180) / Math.PI;
/** the places a line may name, with where they are */
const GAZETTEER: { t: string; at: [number, number] }[] = [
  ...Object.values(PLACES_FA).map((p) => ({ t: p.t, at: [p.lon, p.lat] as [number, number] })),
  ...Object.values(SEA_PLACES_FA).map((p) => ({ t: p.t, at: [p.lon, p.lat] as [number, number] })),
];

export function textIssues(c: ReelContent): TextIssue[] {
  const out: TextIssue[] = [];
  for (const l of linesOf(c)) {
    const t = l.text;
    for (const w of FILLER) if (t.includes(w)) out.push({ ...l, rule: "filler", detail: `«${w}» says nothing checkable` });
    if (/[يك]/.test(t)) out.push({ ...l, rule: "spelling", detail: "Arabic «ي» or «ك» instead of «ی» or «ک»" });
    if (/[؀-ۿ]/.test(t) && /[0-9]/.test(t.replace(/[A-Za-z][A-Za-z0-9-]*/g, ""))) out.push({ ...l, rule: "spelling", detail: "Latin digits in a Persian line" });
    if (/(^|\s)(ن?می) (?=[؀-ۿ])/.test(t)) out.push({ ...l, rule: "spelling", detail: "«می» without its half-space (می‌…)" });
    if (/ {2,}|،،|\.\.(?!\.)|؟؟/.test(t)) out.push({ ...l, rule: "spelling", detail: "doubled space or mark" });
    // the words and the map: a callout or label naming a place must stand near it
    const m = l.mark;
    if (m && (m.kind === "callout" || m.kind === "label")) {
      const at: [number, number] = [m.lon, m.lat];
      for (const g of GAZETTEER) {
        if (!new RegExp(`(^|[\\s،:«])${g.t}($|[\\s،.؟»])`).test(t)) continue;
        const d = deg(at, g.at);
        // a sea, a gulf or a strait is wide: its name may stand anywhere along it
        const wide = /^(دریای|خلیج|تنگهٔ|کانال)/.test(g.t) ? 7 : 1.6;
        if (d > wide) out.push({ ...l, rule: "map", detail: `names «${g.t}» but stands ${d.toFixed(1)}° from it` });
      }
    }
  }
  return out;
}
