// The topic's own objects on the map (owner, 21 Nov 2026: «آبجکت‌های خاص همون موضوع برای دیوان درست بشه، مثلاً کشتی
// یا هر چیزی که بحث میشه»). A classifier reads what a beat says (fa and en) and names the things it is about: a
// tanker, a mine, a missile, a drone, a rig, a parliament, money … Then each thing is put where the story already is
// on the map: a ship sails the beat's own line or the sea lane in view, a burning tanker stands on the writer's pin, a
// missile comes down onto it, a parliament stands on its state's capital. Nothing is invented: an object only stands
// on a line, a pin, a callout or a named place the writer gave, or on Divan's own geography (the lanes, the capitals,
// a few towns named in the line); a missile's launch site is never drawn. Pure and idempotent, like enrich.ts.
import { geoDistance } from "d3-geo";
import type { Look } from "../map-engine/camera";
import { CAPITALS } from "../map-engine/capitals";
import { LANES } from "../map-engine/lanes";
import { NAMES_FA, PLACES_FA } from "../map-engine/names";
import { country } from "../map-engine/world";
import { isAircraft, isShip, type MapObjectId } from "../map-engine/object-ids";
import type { Beat, Mark, ReelContent, TemplateId } from "./types";

type Topic = { id: string; objects: MapObjectId[]; fa: string[]; en: string[]; weight?: number };

/** From the most particular to the most general; a weight below 1 for words that also mean other things. */
export const TOPICS: Topic[] = [
  { id: "tanker", objects: ["tanker"], fa: ["نفتکش", "تانکر", "ابرنفتکش", "نفت‌کش"], en: ["tanker", "supertanker", "vlcc"] },
  { id: "lng", objects: ["lng"], fa: ["ال‌ان‌جی", "گاز مایع", "گازبر", "ال ان جی"], en: ["lng"] },
  { id: "cargo", objects: ["cargo"], fa: ["کشتی تجاری", "کشتی باری", "کانتینر", "کشتیرانی", "باربری"], en: ["cargo", "container ship", "freighter", "shipping"] },
  { id: "ship", objects: ["cargo"], fa: ["کشتی", "شناور", "ترافیک دریایی", "عبور و مرور"], en: ["ship", "vessel"], weight: 0.6 },
  { id: "warship", objects: ["warship"], fa: ["ناو", "ناوشکن", "ناوچه", "ناوگان", "نیروی دریایی", "رزم‌ناو", "ناو هواپیمابر", "اسکورت", "یگان دریایی"], en: ["warship", "destroyer", "frigate", "navy", "naval", "aircraft carrier", "fleet", "escort"] },
  { id: "boats", objects: ["boats"], fa: ["قایق", "قایق تندرو", "قایق‌های تندرو", "قایق‌ها"], en: ["speedboat", "fast boat", "fast boats", "boats"] },
  { id: "mine", objects: ["mine"], fa: ["مین", "مین دریایی", "مین‌گذاری"], en: ["mine", "naval mine", "sea mine"] },
  { id: "missile", objects: ["missile"], fa: ["موشک", "موشکی", "پرتابه", "بالستیک", "کروز", "راکت"], en: ["missile", "projectile", "ballistic", "rocket", "cruise missile"] },
  { id: "drone", objects: ["drone"], fa: ["پهپاد", "پهپادی", "پهپادها", "شاهد"], en: ["drone", "uav", "shahed"] },
  { id: "jet", objects: ["jet"], fa: ["جنگنده", "جنگنده‌ها", "بمب‌افکن", "حمله هوایی", "حملات هوایی", "نیروی هوایی", "هواپیمای جنگی"], en: ["jet", "fighter", "airstrike", "air strike", "bomber", "warplane", "air force"] },
  { id: "aircraft", objects: ["jet"], fa: ["هواپیما", "پرواز", "حریم هوایی"], en: ["aircraft", "airspace", "flight"], weight: 0.5 },
  { id: "rig", objects: ["rig"], fa: ["سکوی نفتی", "سکو", "میدان نفتی", "میدان گازی", "پارس جنوبی", "چاه نفت", "تولید نفت", "دریایی نفت"], en: ["oil rig", "platform", "oilfield", "oil field", "gas field", "south pars", "offshore"] },
  { id: "refinery", objects: ["refinery"], fa: ["پالایشگاه", "پتروشیمی", "پالایش", "بنزین"], en: ["refinery", "petrochemical", "gasoline", "fuel"] },
  { id: "pipeline", objects: ["pipeline"], fa: ["خط لوله", "لوله"], en: ["pipeline"] },
  { id: "oil", objects: ["barrel", "tanker"], fa: ["نفت", "نفت خام", "بشکه", "برنت", "اوپک", "صادرات نفت", "نفتی"], en: ["oil", "crude", "barrel", "brent", "opec"] },
  { id: "gas", objects: ["lng", "rig"], fa: ["گاز"], en: ["gas"], weight: 0.7 },
  { id: "nuclear", objects: ["nuclear"], fa: ["هسته‌ای", "غنی‌سازی", "اورانیوم", "نطنز", "فردو", "آژانس", "بازرسان", "راکتور", "سانتریفیوژ"], en: ["nuclear", "uranium", "enrichment", "iaea", "reactor", "natanz", "fordow", "centrifuge"] },
  { id: "tank", objects: ["tank"], fa: ["تانک", "زرهی", "زره‌پوش", "توپخانه"], en: ["tank", "armour", "armor", "armoured", "artillery"] },
  { id: "troops", objects: ["troops"], fa: ["سرباز", "ارتش", "نیروی زمینی", "نظامیان", "نیروهای نظامی", "پیاده‌نظام", "استقرار", "جبهه", "شبه‌نظامیان"], en: ["troops", "soldiers", "army", "ground forces", "infantry", "deployment", "militia", "front line"] },
  { id: "parliament", objects: ["parliament"], fa: ["مجلس", "پارلمان", "نماینده", "نمایندگان", "کنگره", "سنا", "انتخابات", "رأی‌گیری", "طرح دوفوریتی"], en: ["parliament", "congress", "senate", "lawmakers", "mps", "election", "vote", "bill"] },
  { id: "law", objects: ["parliament"], fa: ["قانون", "رأی", "دولت", "کابینه"], en: ["law", "government", "cabinet"], weight: 0.5 },
  { id: "sanctions", objects: ["padlock"], fa: ["تحریم", "تحریم‌ها", "تحریمی"], en: ["sanction", "sanctions", "embargo"] },
  { id: "money", objects: ["money"], fa: ["دلار", "ریال", "تومان", "ارز", "پول", "تورم", "بانک", "بانک مرکزی", "یورو", "نرخ", "اقتصاد", "دارایی"], en: ["dollar", "rial", "toman", "currency", "inflation", "money", "bank", "euro", "exchange rate", "economy", "assets"] },
  { id: "price", objects: ["money"], fa: ["قیمت", "گرانی"], en: ["price", "prices"], weight: 0.5 },
  { id: "talks", objects: ["treaty"], fa: ["مذاکره", "مذاکرات", "توافق", "توافق‌نامه", "گفتگو", "گفت‌وگو", "میانجی", "میانجی‌گری", "آتش‌بس", "قرارداد", "پیمان", "دیدار"], en: ["talks", "deal", "agreement", "negotiation", "negotiations", "treaty", "ceasefire", "summit", "mediation"] },
];

/** Words that mean something was hit: a ship on a pin then burns. */
const HIT = { fa: ["آتش", "آتش گرفت", "هدف قرار", "اصابت", "حمله", "انفجار", "منفجر", "خورد", "آسیب", "سوخت"], en: ["hit", "struck", "attack", "attacked", "fire", "ablaze", "explosion", "damaged", "burning"] };

/** Towns a line may name for an object that stands on land (city level only: never a facility's coordinates). */
const TOWNS: { fa: string[]; en: string[]; lon: number; lat: number; for: MapObjectId[] }[] = [
  { fa: ["نطنز"], en: ["natanz"], lon: 51.92, lat: 33.51, for: ["nuclear"] },
  { fa: ["فردو", "قم"], en: ["fordow", "qom"], lon: 50.88, lat: 34.64, for: ["nuclear"] },
  { fa: ["اصفهان"], en: ["isfahan"], lon: 51.67, lat: 32.65, for: ["nuclear", "refinery"] },
  { fa: ["بوشهر"], en: ["bushehr"], lon: 50.84, lat: 28.97, for: ["nuclear"] },
  { fa: ["اراک"], en: ["arak"], lon: 49.69, lat: 34.09, for: ["nuclear", "refinery"] },
  { fa: ["آبادان"], en: ["abadan"], lon: 48.3, lat: 30.35, for: ["refinery"] },
  { fa: ["خارک"], en: ["kharg"], lon: 50.32, lat: 29.24, for: ["barrel", "tanker", "rig"] },
  { fa: ["پارس جنوبی", "عسلویه"], en: ["south pars", "asaluyeh"], lon: 52.4, lat: 26.9, for: ["rig", "lng"] },
  { fa: ["جاسک"], en: ["jask"], lon: 57.77, lat: 25.64, for: ["tanker", "pipeline"] },
];

/** A text for matching: Persian letters of one form, no half-spaces, no hamzah on its own, no punctuation. */
export function norm(s: string): string {
  return ` ${String(s ?? "")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/[ئ]/g, "ی")
    .replace(/[ًٔ-ٰٟ]/g, "")
    .replace(/‌/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
}

const FA_TAIL = "(?:ها|های|هایی|ی|ای|ان|یان)?";
const EN_TAIL = "(?:s|es)?";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cache = new Map<string, RegExp>();
const rx = (kw: string, fa: boolean) => {
  const key = `${fa ? "f" : "e"}${kw}`;
  let r = cache.get(key);
  if (!r) {
    r = new RegExp(` ${esc(norm(kw).trim())}${fa ? FA_TAIL : EN_TAIL}(?= )`, "u");
    cache.set(key, r);
  }
  return r;
};
/** Where a word of the list first stands in the normalised text (whole words, with Persian plural and adjective endings), or -1. */
const firstAt = (text: string, fa: string[], en: string[]) => {
  let best = -1;
  for (const [list, isFa] of [
    [fa, true],
    [en, false],
  ] as const) {
    for (const kw of list) {
      const m = rx(kw, isFa).exec(text);
      if (m && (best < 0 || m.index < best)) best = m.index;
    }
  }
  return best;
};

export type TopicHit = { topic: string; objects: MapObjectId[]; score: number; at: number };

/** The topics a text is about, the strongest first (ties: the one said first). */
export function topicsOf(text: string): TopicHit[] {
  const t = norm(text);
  const out: TopicHit[] = [];
  for (const tp of TOPICS) {
    let n = 0;
    let at = -1;
    for (const [list, isFa] of [
      [tp.fa, true],
      [tp.en, false],
    ] as const) {
      for (const kw of list) {
        const r = new RegExp(rx(kw, isFa).source, "gu");
        const ms = t.match(r);
        if (ms) {
          n += ms.length;
          const i = t.search(rx(kw, isFa));
          if (i >= 0 && (at < 0 || i < at)) at = i;
        }
      }
    }
    if (n) out.push({ topic: tp.id, objects: tp.objects, score: n * (tp.weight ?? 1), at });
  }
  // a particular ship outranks the general «ship»; oil with a ship means a tanker
  const has = (id: string) => out.some((h) => h.topic === id);
  if (has("ship") && (has("oil") || has("tanker"))) out.forEach((h) => (h.topic === "ship" ? (h.objects = ["tanker"]) : null));
  return out.sort((a, b) => b.score - a.score || a.at - b.at);
}

export const isHit = (text: string) => firstAt(norm(text), HIT.fa, HIT.en) >= 0;

/** The objects a text names, in the order they are said, each once. */
export function objectsSaid(text: string): MapObjectId[] {
  const hits = topicsOf(text).sort((a, b) => a.at - b.at);
  const out: MapObjectId[] = [];
  for (const h of hits) if (!out.includes(h.objects[0])) out.push(h.objects[0]);
  return out;
}

/** The objects of a whole Reel, strongest first: what the hook falls back on, and the beats that name nothing. */
export function reelObjects(c: ReelContent): MapObjectId[] {
  const text = [c.concept?.one_line ?? "", c.concept?.hook?.text ?? "", ...(c.concept?.beats ?? []), ...c.beats.map(textOf)].join(" . ");
  const out: MapObjectId[] = [];
  for (const h of topicsOf(text)) for (const o of h.objects.slice(0, 1)) if (!out.includes(o)) out.push(o);
  // the concept's own objects (road objects: tanker, mine, barrel, pipeline …) count when they are map objects too
  for (const o of c.concept?.objects ?? []) if (["tanker", "mine", "barrel", "pipeline"].includes(o) && !out.includes(o as MapObjectId)) out.push(o as MapObjectId);
  if (!out.length) out.push(...(FALLBACK[c.template] ?? ["parliament"]));
  return out;
}

/** With nothing named at all, the template's own object (a strait has its tanker, a front its tank). */
const FALLBACK: Partial<Record<TemplateId, MapObjectId[]>> = { strait: ["tanker"], bases: ["jet"], fronts: ["tank"], table3: ["treaty"], redline: ["troops"], scenarios: ["parliament"], today: ["parliament"], dilemma: ["parliament"] };

/** Everything a beat says or writes. */
export function textOf(b: Beat): string {
  const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" || b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : [];
  const own = b.kind === "hook" ? [b.title, b.sub ?? ""] : b.kind === "map" ? [b.caption ?? ""] : b.kind === "road" ? [b.road.title, b.road.cost] : b.kind === "demand" ? [b.wants] : b.kind === "number" ? [b.text, b.unit] : b.kind === "chart" ? [b.chart.title] : [];
  return [b.say ?? "", ...own, ...marks.flatMap((m) => (m.kind === "callout" ? [m.bold, m.sub ?? ""] : m.kind === "label" ? [m.t] : []))].join(" . ");
}

const deg = (a: [number, number], b: [number, number]) => (geoDistance(a, b) * 180) / Math.PI;
const inView = (look: Look, p: [number, number], share = 0.42) => deg([look.lon, look.lat], p) < look.span * share;

export type Placed = { after: number; m: Extract<Mark, { kind: "object" }> };


/** The sentences of a line, each with the objects it names in their order and whether it says something was hit. */
const sentencesOf = (say: string) =>
  say
    .split(/[.!?؟]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ ids: objectsSaid(s), hit: isHit(s) }));

/**
 * Where a beat's objects go on its map, each as a mark and the index of the mark it follows (it comes in with it).
 * `ids`: the objects in the order the beat says them; at most `max` are placed.
 *
 * 1. The writer's pins are the incidents, in the order the line tells them: the n-th sentence that names an object
 *    is the n-th pin. A ship there was hit (it burns), a mine floats beside it, a missile comes down onto it.
 * 2. What is left: a ship sails the beat's own moving line (a comet), else a sea lane in view; a missile arcs along
 *    the writer's own line between two places, never from a launch site of our own; an aircraft flies a line or
 *    circles the beat's point; a rig, a refinery, a nuclear site stand on a town the line names (city level); a
 *    parliament, money and the sanctions' padlock on the capital of the state the beat is about.
 */
export function placeObjects(b: Extract<Beat, { kind: "hook" | "map" }>, ids: MapObjectId[], max: number, reelVenue: [number, number] | null = null): Placed[] {
  const marks = b.marks ?? [];
  const look = b.look;
  const text = norm(textOf(b));
  const out: Placed[] = [];
  const done = new Set<MapObjectId>();
  const pins: { at: [number, number]; i: number }[] = [];
  marks.forEach((m, i) => {
    if (m.kind === "pins") for (const p of m.points) pins.push({ at: [p.lon, p.lat], i });
  });
  const comets: { coords: [number, number][]; i: number }[] = [];
  const lines: { coords: [number, number][]; i: number }[] = [];
  const loops: { coords: [number, number][]; i: number }[] = [];
  marks.forEach((m, i) => {
    if (m.kind === "comet" && m.loop) loops.push({ coords: m.coords, i });
    else if (m.kind === "comet") comets.push({ coords: m.coords, i });
    else if (m.kind === "dashed" || m.kind === "claim") lines.push({ coords: m.coords, i });
  });
  const callouts = marks.map((m, i) => ({ m, i })).filter((x): x is { m: Extract<Mark, { kind: "callout" }>; i: number } => x.m.kind === "callout");
  const fills = marks.filter((m): m is Extract<Mark, { kind: "fill" }> => m.kind === "fill");
  const used = new Set<number>();
  const usedLanes = new Set<string>();
  const centre: [number, number] = [look.lon, look.lat];
  // the part of a lane well inside the frame (round 2 of the test render: a ship that starts at the lane's far end is
  // off the screen for its first seconds), the lane cut into short steps first so a long leg still gives points
  const seaIn = (coords: [number, number][]) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < coords.length - 1; i += 1) {
      const [a, z] = [coords[i], coords[i + 1]];
      const n = Math.max(1, Math.ceil(deg(a, z) / (look.span * 0.05)));
      for (let k = 0; k < n; k += 1) pts.push([a[0] + ((z[0] - a[0]) * k) / n, a[1] + ((z[1] - a[1]) * k) / n]);
    }
    if (coords.length) pts.push(coords[coords.length - 1]);
    return pts.filter((p) => inView(look, p, 0.4));
  };
  /** a path's point nearest the centre: where a moving object is counted as standing (in view, for the labels) */
  const mid = (path: [number, number][]) => path.reduce((a, p) => (deg(p, centre) < deg(a, centre) ? p : a), path[0]);
  /** on a regional map the centre of the frame is a place; on a globe it is nowhere */
  const regional = look.span <= 20;
  const push = (after: number, m: Placed["m"]) => {
    if (out.length >= max || !inView(look, [m.lon, m.lat], 0.46)) return false;
    out.push({ after, m });
    done.add(m.id);
    return true;
  };
  /** a sea lane in view for a ship with no line of its own: the writer's looping lane, else Divan's lanes */
  const lane = (): { path: [number, number][]; i: number } | null => {
    for (const l of loops) {
      const key = `w${l.i}`;
      const pts = seaIn(l.coords);
      if (!usedLanes.has(key) && pts.length >= 2) {
        usedLanes.add(key);
        // the writer's lane and Divan's lane of the same name are one: do not sail it twice
        for (const d of LANES) if (d.path.length === l.coords.length && d.path.every((p, k) => p[0] === l.coords[k][0] && p[1] === l.coords[k][1])) usedLanes.add(d.id);
        return { path: pts, i: l.i };
      }
    }
    for (const d of LANES) {
      const pts = seaIn(d.path);
      if (!usedLanes.has(d.id) && pts.length >= 2) {
        usedLanes.add(d.id);
        return { path: pts, i: -1 };
      }
    }
    return null;
  };
  const town = (id: MapObjectId): [number, number] | null => {
    for (const t of TOWNS) if (t.for.includes(id) && firstAt(text, t.fa, t.en) >= 0 && inView(look, [t.lon, t.lat], 0.45)) return [t.lon, t.lat];
    return null;
  };
  /** the state the beat is about: a callout's claimant other than Iran, a filled state the line names, else Iran */
  const stateOf = (): string | null => {
    for (const c of callouts) if (c.m.a3 && c.m.a3 !== "IRN" && c.m.a3 !== "GBR" && country(c.m.a3)) return c.m.a3;
    for (const f of fills) if (f.a3 !== "IRN" && text.includes(norm(nameOfA3(f.a3)))) return f.a3;
    return fills.some((f) => f.a3 === "IRN") || inView(look, [53.7, 32.4], 0.5) ? "IRN" : (fills[0]?.a3 ?? null);
  };
  const colourOf = (a3: string) => fills.find((f) => f.a3 === a3)?.color;
  const plainShip = (x: MapObjectId) => isShip(x) && x !== "warship" && x !== "boats";

  // 1. the incidents on the writer's pins, sentence by sentence
  let pin = 0;
  for (const s of sentencesOf(b.say ?? "")) {
    const own = s.ids.filter((x) => ids.includes(x));
    if (!own.length || pin >= pins.length) continue;
    const p = pins[pin];
    pin += 1;
    const missile = own.includes("missile");
    const ship = own.find(plainShip) ?? (missile && s.hit ? ids.find(plainShip) : undefined);
    if (missile) push(p.i, { kind: "object", id: "missile", lon: p.at[0], lat: p.at[1], move: "drop" });
    if (ship && s.hit) push(p.i, { kind: "object", id: ship, lon: p.at[0], lat: p.at[1], move: "stand", fire: missile ? 32 : 12 });
    else if (ship) push(p.i, { kind: "object", id: ship, lon: p.at[0], lat: p.at[1], move: "stand" });
    // a mine floats beside the ship it struck (to the west, so the two do not meet)
    if (own.includes("mine")) push(p.i, { kind: "object", id: "mine", lon: p.at[0] - look.span * (ship ? 0.085 : 0), lat: p.at[1] - look.span * (ship ? 0.035 : 0), move: "stand" });
    for (const x of own) {
      if (x === "missile" || x === "mine" || x === ship) continue;
      if (isAircraft(x)) push(p.i, { kind: "object", id: x, lon: p.at[0], lat: p.at[1], move: "orbit" });
      else if (x === "tank" || x === "troops" || x === "boats" || x === "warship") push(p.i, { kind: "object", id: x, lon: p.at[0] + look.span * 0.08, lat: p.at[1] - look.span * 0.04, move: "stand" });
    }
  }

  // 2. the rest, each in its own way
  for (const id of ids) {
    if (out.length >= max) break;
    if (done.has(id)) continue;
    if (isShip(id)) {
      const ln = comets.find((l) => !used.has(l.i) && seaIn(l.coords).length >= 2);
      if (ln) {
        used.add(ln.i);
        const m0 = mid(ln.coords);
        push(ln.i, { kind: "object", id, lon: m0[0], lat: m0[1], move: "sail", path: ln.coords });
        continue;
      }
      const l = lane();
      if (l) {
        const m0 = mid(l.path);
        push(l.i, { kind: "object", id, lon: m0[0], lat: m0[1], move: "sail", path: id === "boats" ? l.path.slice(Math.floor(l.path.length / 3)) : l.path });
      }
      continue;
    }
    if (id === "mine") {
      // a mine with no incident of its own: in the sea lane in view, as the threat to it
      const l = lane();
      if (l) {
        const mid = l.path[Math.floor(l.path.length / 2)];
        push(l.i, { kind: "object", id, lon: mid[0], lat: mid[1] - look.span * 0.04, move: "stand" });
      }
      continue;
    }
    if (id === "missile") {
      const ln = lines.find((l) => !used.has(l.i)) ?? comets.find((l) => !used.has(l.i));
      if (ln) {
        used.add(ln.i);
        const a = ln.coords[0];
        const z = ln.coords[ln.coords.length - 1];
        push(ln.i, { kind: "object", id, lon: z[0], lat: z[1], move: "arc", path: [a, z] });
      }
      continue;
    }
    if (isAircraft(id)) {
      const ln = comets.find((l) => !used.has(l.i)) ?? lines.find((l) => !used.has(l.i));
      if (ln) {
        used.add(ln.i);
        push(ln.i, { kind: "object", id, lon: ln.coords[0][0], lat: ln.coords[0][1], move: "fly", path: ln.coords });
      } else {
        const p = pins[0]?.at ?? (callouts[0] ? ([callouts[0].m.lon, callouts[0].m.lat] as [number, number]) : regional ? centre : null);
        if (p) push(pins[0]?.i ?? callouts[0]?.i ?? -1, { kind: "object", id, lon: p[0], lat: p[1], move: "orbit" });
      }
      continue;
    }
    if (id === "pipeline") {
      const ln = comets.find((l) => !used.has(l.i)) ?? lines.find((l) => !used.has(l.i));
      if (ln) {
        used.add(ln.i);
        const mid = ln.coords[Math.floor(ln.coords.length / 2)];
        push(ln.i, { kind: "object", id, lon: mid[0], lat: mid[1], move: "pipe", path: ln.coords });
      } else {
        const p = town(id) ?? (regional ? centre : null);
        if (p) push(-1, { kind: "object", id, lon: p[0], lat: p[1], move: "stand" });
      }
      continue;
    }
    if (id === "rig" || id === "refinery" || id === "barrel" || id === "nuclear") {
      const iran = country("IRN")?.centroid ?? null;
      const p =
        town(id) ??
        (id === "rig" && inView(look, [52.4, 26.9], 0.45) ? ([52.4, 26.9] as [number, number]) : null) ??
        (id === "barrel" && inView(look, [50.32, 29.24], 0.45) ? ([50.32, 29.24] as [number, number]) : null) ??
        (id === "nuclear" && iran && inView(look, iran, 0.45) ? iran : null) ??
        (id === "barrel" && regional ? ([centre[0] - look.span * 0.12, centre[1] - look.span * 0.1] as [number, number]) : null);
      if (p) push(-1, { kind: "object", id, lon: p[0], lat: p[1], move: "stand" });
      continue;
    }
    if (id === "tank" || id === "troops") {
      const c = callouts[0];
      const a3 = c ? null : stateOf();
      const at = c ? ([c.m.lon, c.m.lat] as [number, number]) : a3 ? (CAPITALS[a3] ?? country(a3)?.centroid ?? null) : regional ? centre : null;
      if (at) push(c?.i ?? -1, { kind: "object", id, lon: at[0] + look.span * 0.06, lat: at[1] - look.span * 0.05, move: "stand" });
      continue;
    }
    if (id === "parliament" || id === "money" || id === "padlock") {
      const a3 = stateOf();
      const at = a3 ? (CAPITALS[a3] ?? country(a3)?.centroid ?? null) : null;
      const sign = id === "money" ? (firstAt(text, ["دلار"], ["dollar", "usd"]) >= 0 ? "$" : firstAt(text, ["یورو"], ["euro"]) >= 0 ? "€" : undefined) : undefined;
      const where = at && inView(look, at, 0.45) ? at : regional ? centre : null;
      const col = a3 ? colourOf(a3) : undefined;
      if (where) push(-1, { kind: "object", id, lon: where[0], lat: where[1], move: "stand", ...(col ? { color: col } : {}), ...(sign ? { sign } : {}) });
      continue;
    }
    if (id === "treaty") {
      // where the talks are: the place this line says they are in, a place it names, the Reel's venue, the beat's state
      const named = Object.values(PLACES_FA).find((p) => text.includes(norm(p.t)) && inView(look, [p.lon, p.lat], 0.45));
      const own = venueOf(textOf(b));
      const a3 = stateOf();
      const cap = a3 ? (CAPITALS[a3] ?? null) : null;
      const at = [own, named ? ([named.lon, named.lat] as [number, number]) : null, reelVenue, cap, regional ? centre : null].find((p): p is [number, number] => Boolean(p) && inView(look, p as [number, number], 0.45));
      if (at) push(-1, { kind: "object", id, lon: at[0], lat: at[1], move: "stand" });
    }
  }
  // two objects that would stand on one point: the later one steps aside
  for (let i = 1; i < out.length; i += 1) {
    const a = out[i].m;
    if (a.move !== "stand") continue;
    for (let j = 0; j < i; j += 1) {
      const z = out[j].m;
      if (z.move === "stand" && z.id !== a.id && deg([a.lon, a.lat], [z.lon, z.lat]) < look.span * 0.04 && !(a.id === "mine" || z.id === "mine")) out[i] = { ...out[i], m: { ...a, lon: a.lon + look.span * 0.1 } };
    }
  }
  return out;
}

const nameOfA3 = (a3: string) => country(a3)?.fa ?? a3;

/** A beat has its objects already (the writer's, or this file's on an earlier pass). */
const hasObjects = (b: Beat) => (b.kind === "hook" || b.kind === "map") && (b.marks ?? []).some((m) => m.kind === "object");

/**
 * The content with the topic's objects on its map beats: the hook one (the Reel's main thing, there from frame 0),
 * every map beat up to four (what its own line names, in the order it names them; with nothing named, the Reel's main
 * thing, sailing its lane or standing on its place). Each object is put right after the mark it belongs to, so it
 * comes in on the same shot.
 */
export function withObjects(c: ReelContent): ReelContent {
  const main = reelObjects(c);
  const venue = venueOf(c.beats.map(textOf).join(" . "));
  let last: MapObjectId[] = [];
  const beats = c.beats.map((b): Beat => {
    if (b.kind === "road" && b.look && !(b.marks ?? []).some((m) => m.kind === "object")) {
      const placed = roadObjects(b);
      last = placed.map((p) => p.m.id);
      return placed.length ? { ...b, marks: insert(b.marks ?? [], placed) } : b;
    }
    if ((b.kind !== "hook" && b.kind !== "map") || hasObjects(b)) return b;
    const said = objectsSaid(textOf(b));
    // a beat that names nothing shows the Reel's main thing, unless the beat before had that one standing (a ship may sail on)
    const ids = b.kind === "hook" ? [...new Set([...said, ...main])].slice(0, 2) : said.length ? said : main.slice(0, 1).filter((x) => isShip(x) || !last.includes(x));
    const placed = placeObjects(b, ids, b.kind === "hook" ? 1 : 4, venue);
    last = placed.map((p) => p.m.id);
    return placed.length ? { ...b, marks: insert(b.marks ?? [], placed) } : b;
  });
  return { ...c, beats };
}

/** The marks with the objects put in, each right after its anchor; one with no anchor right after the ground (fills, hatching). */
function insert(have: Mark[], placed: Placed[]): Mark[] {
  const marks = [...have];
  const groundEnd = marks.reduce((n, m, i) => (m.kind === "fill" || m.kind === "hatch" ? i + 1 : n), 0);
  const slot = (p: Placed) => (p.after < 0 ? groundEnd - 1 : p.after);
  // from the last anchor back, so the earlier indices hold; objects of one anchor keep their order
  const sorted = placed.map((p, k) => ({ ...p, k })).sort((a, z) => slot(z) - slot(a) || z.k - a.k);
  for (const p of sorted) marks.splice(slot(p) + 1, 0, p.m);
  return marks;
}

/** The road objects (objects.tsx, flat and isometric) as the things of the map. */
const ROAD_TO_MAP: Record<string, MapObjectId | undefined> = { barrel: "barrel", tanker: "tanker", banknote: "money", treaty: "treaty", table: "treaty", mine: "mine", pipeline: "pipeline", container: "cargo", factory: "refinery", shield: "warship" };

/**
 * A road drawn on the live map (Divan's analysis) carries its own thing: a tanker sails its line, a barrel, a stack of
 * money or a signed text stands where the line ends, under the road's cost.
 */
function roadObjects(b: Extract<Beat, { kind: "road" }>): Placed[] {
  const marks = b.marks ?? [];
  const said = objectsSaid(`${b.say ?? ""} . ${b.road.title}`);
  const id = ROAD_TO_MAP[b.road.object] ?? said[0];
  if (!id) return [];
  const li = marks.findIndex((m) => m.kind === "comet" || m.kind === "dashed" || m.kind === "claim");
  const line = li >= 0 ? (marks[li] as { coords: [number, number][] }).coords : null;
  if (line && (isShip(id) || isAircraft(id)) && marks[li].kind === "comet") {
    const mid = line[Math.floor(line.length / 2)];
    return [{ after: li, m: { kind: "object", id, lon: mid[0], lat: mid[1], move: isShip(id) ? "sail" : "fly", path: line, color: b.road.color } }];
  }
  let end: [number, number] | null = line ? line[line.length - 1] : null;
  if (!end) for (const m of marks) if (m.kind === "pins" && m.points.length) end = [m.points[m.points.length - 1].lon, m.points[m.points.length - 1].lat];
  if (!end) return [];
  // beside the end, not on it: the road's cost is written there
  return [{ after: li >= 0 ? li : 0, m: { kind: "object", id, lon: end[0] - (b.look?.span ?? 10) * 0.05, lat: end[1] - (b.look?.span ?? 10) * 0.035, move: "stand", color: b.road.color } }];
}

/** Where talks are held: a place or a state the text says something happens «در» (in), else the first place it names. */
export function venueOf(text: string): [number, number] | null {
  const t = norm(text);
  const places = [...Object.values(PLACES_FA).map((p) => ({ n: norm(p.t), at: [p.lon, p.lat] as [number, number] })), ...Object.keys(NAMES_FA).filter((a3) => a3 !== "IRN").map((a3) => ({ n: norm(NAMES_FA[a3]), at: (CAPITALS[a3] ?? country(a3)?.centroid ?? null) as [number, number] | null }))].filter((p): p is { n: string; at: [number, number] } => Boolean(p.at));
  for (const p of places) if (t.includes(` در${p.n}`)) return p.at;
  return null;
}
