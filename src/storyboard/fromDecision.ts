// The old «decision» props (lib/agents/decision.ts until 21 Nov 2026: a stage, fact cards, road cards, a gauge, the
// poll) converted into the storyboard engine's content, so a Reel queued before the change is drawn in the same one
// style. Pure. Cards become roads of three views; a long effect line is cut to its first eight words.
import type { DecisionProps } from "../decision/types";
import type { Beat, Mark, ObjectId, ReelContent, Road, TemplateId } from "./types";

const OBJECT_WORDS: [RegExp, ObjectId][] = [
  [/نفتکش|کشتی|دریا|ناو|بندر/, "tanker"],
  [/مین/, "mine"],
  [/نفت|بشکه|صادرات نفت/, "barrel"],
  [/لوله|گاز/, "pipeline"],
  [/تحریم|دلار|پول|بانک|ریال|تومان|درآمد/, "banknote"],
  [/توافق|قطعنامه|پیمان|امضا|سند/, "treaty"],
  [/مذاکره|گفت‌وگو|میز|دیدار|میانجی/, "table"],
  [/دفاع|بازدارندگی|حفاظت|امنیت|آتش‌بس/, "shield"],
  [/بیانیه|اعلام|هشدار|پیام/, "megaphone"],
  [/قانون|دادگاه|حقوق|مجلس/, "scale"],
  [/کالا|بار|تجارت|واردات/, "container"],
  [/کارخانه|تولید|صنعت/, "factory"],
];
export const objectFor = (text: string, used: ObjectId[] = []): ObjectId => {
  for (const [re, id] of OBJECT_WORDS) if (re.test(text) && !used.includes(id)) return id;
  const rest: ObjectId[] = ["treaty", "table", "shield", "megaphone", "scale", "banknote"];
  return rest.find((x) => !used.includes(x)) ?? "treaty";
};
export const firstWords = (s: string, n = 8) => {
  const w = String(s ?? "").replace(/[.؛]+$/, "").split(/\s+/).filter(Boolean);
  return w.length <= n ? w.join(" ") : w.slice(0, n).join(" ");
};

const TEMPLATE_OF: Record<DecisionProps["variant"], TemplateId> = { today: "today", advisor: "advisor", scenarios: "scenarios", number: "number", council: "council", week: "week" };

export function fromDecision(p: DecisionProps): ReelContent {
  const st = p.stage;
  const map = st.kind === "map" ? st.map : null;
  const look = map
    ? (() => {
        const [[x0, y0], [x1, y1]] = map.extent;
        const lat = (y0 + y1) / 2;
        return { lon: (x0 + x1) / 2, lat, span: Math.max((x1 - x0) * Math.cos((lat * Math.PI) / 180), (y1 - y0) * 1.1) * 1.05 };
      })()
    : { lon: 53.5, lat: 30, span: 26 };
  const marks: Mark[] = [];
  if (map) {
    for (const h of map.hits ?? []) marks.push({ kind: "pins", points: [{ lon: h.lon, lat: h.lat }], color: "#ff4d40" }, { kind: "callout", lon: h.lon, lat: h.lat, bold: h.t, color: "#ff4d40" });
    const tk = map.tankers ?? [];
    if (tk.length) marks.push({ kind: "pins", points: tk.map((t) => ({ lon: t.lon, lat: t.lat })), color: tk.some((t) => t.fire) ? "#ff4d40" : "#ffb020" });
    for (const a of map.arcs ?? []) marks.push({ kind: "comet", coords: [a.from, a.to], color: "#ffb020" });
    if (map.pair) marks.push({ kind: "callout", lon: map.pair.lon, lat: map.pair.lat, bold: map.pair.t, color: "#ffb020" });
    for (const l of map.labels ?? []) marks.push({ kind: "label", t: l.t, lon: l.lon, lat: l.lat });
  }
  const beats: Beat[] = [{ kind: "hook", cue: "start", look, title: `${p.hook.l1} ${p.hook.l2}`.replace(/\s+/g, " ").trim(), sub: p.role ?? undefined, marks, region: map ? `${look.lon.toFixed(0)},${look.lat.toFixed(0)}` : "iran" }];
  let factCue = "fact";
  const chart = st.kind === "chart" ? st.chart : p.factChart;
  if (chart) {
    beats.push({ kind: "chart", cue: factCue, chart: { title: chart.title, unit: chart.unit, points: chart.points, first: chart.first, last: chart.last, source: chart.source, digits: chart.digits } });
    factCue = "fact-2";
  }
  for (const x of p.facts ?? []) {
    beats.push({ kind: "number", cue: factCue, big: x.big, unit: "", text: x.text, source: x.source });
    factCue = `${factCue}-n`;
  }
  const used: ObjectId[] = [];
  const roads: Road[] = p.cards.map((c) => {
    const effect = c.rows.find((r) => r.icon === "effect") ?? c.rows[0];
    const evidence = c.rows.find((r) => r.icon === "evidence" || r.icon === "done");
    const wanted = p.concept?.objects?.[used.length] as ObjectId | undefined;
    const object = wanted && !used.includes(wanted) ? wanted : objectFor(`${c.title} ${effect?.text ?? ""}`, used);
    used.push(object);
    // title and cost together at most eight words on screen
    return { key: c.key, color: c.color, title: c.title, cost: c.cost || firstWords(effect?.text ?? "", Math.max(3, 8 - c.title.split(/\s+/).length)), source: evidence?.sub ?? "تحلیل دیوان", object, risk: c.risk ?? null };
  });
  roads.forEach((r, i) => beats.push({ kind: "road", cue: `c${i + 1}`, road: r }));
  if (p.gauge) beats.push({ kind: "gauge", cue: "gauge", label: p.gauge.label, ends: p.gauge.ends, roads });
  beats.push({ kind: "poll", cue: "ask", q: p.ask.q, options: roads.map((r) => ({ key: r.key, color: r.color, title: r.title })), chip: p.ask.chip, site: p.ask.site });
  const say = new Map((p.say ?? []).map((s) => [s.cue, s.text]));
  for (const b of beats) if (say.has(b.cue)) (b as { say?: string }).say = say.get(b.cue);
  const digit = /[0-9۰-۹]/.test(p.hook.l1 + p.hook.l2);
  return {
    format: "decision",
    engine: "storyboard",
    template: TEMPLATE_OF[p.variant] ?? "today",
    video_id: `decision-${p.date}`,
    kicker: p.kicker,
    date: p.date,
    concept: p.concept ?? {
      one_line: `${p.hook.l1} ${p.hook.l2}`,
      idea_family: p.variant,
      hook: { type: digit ? "odd-number" : "question", text: `${p.hook.l1} ${p.hook.l2}` },
      anchor: { asset: map ? `map:${look.lon.toFixed(0)},${look.lat.toFixed(0)}` : `${st.kind}`, regions: [] },
      beats: beats.map((b) => b.kind),
      twist_at_beat: 2,
      ending: { type: "loop-to-hook", line: p.ask.q },
      new_because: ["converted from the card layout"],
      objects: roads.map((r) => r.object),
    },
    beats,
    convention: "roads",
    badge: p.badge,
  };
}
