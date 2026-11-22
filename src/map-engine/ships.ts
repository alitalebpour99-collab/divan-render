// How ships move and how many there are (round 7, owner: «کشتی‌ها طبیعی حرکت کنند … تعداد از خبر بیاید»). Pure.
//
// Motion. A ship sails one clock for the whole Reel, not one per beat: where it is depends on the Reel's frame, so it
// never jumps when a beat changes. Every ship keeps its type's real service speed, played as one time-lapse for every
// Reel (one second of video is a quarter of an hour at sea): a laden tanker at 13 knots covers about 6 km a second of video.
// Its way is its lane with the corners rounded (Chaikin), so it turns in gentle curves, and it turns its bow round a
// turn instead of flipping.
//
// Number. «شش نفتکش» is six ships: the line's own number of the ships it names, read here. No number: one ship, the
// symbol of the story. Never more than the line says.
import { geoDistance, geoInterpolate } from "d3-geo";
import type { MapObjectId } from "./object-ids";

/** knots each type sails at (service speeds: a VLCC 13, a container ship 16, an LNG carrier 18, a destroyer 20, fast boats 40) */
export const KNOTS: Partial<Record<MapObjectId, number>> = { tanker: 13, cargo: 16, lng: 18, warship: 20, boats: 40 };
/** the time-lapse of every Reel: one second of video is this many seconds at sea */
export const TIMELAPSE = 900;
const FPS = 30;
const KM = 6371.0088;
/** kilometres a ship of this type covers in one frame of video */
export const kmPerFrame = (id: MapObjectId) => ((KNOTS[id] ?? 13) * 1.852 * TIMELAPSE) / 3600 / FPS;

/** A lane with its corners rounded: three passes of Chaikin's corner cutting (the ends stay where they are). */
export function smooth(path: [number, number][], passes = 3): [number, number][] {
  let p = path;
  for (let n = 0; n < passes && p.length > 2; n += 1) {
    const q: [number, number][] = [p[0]];
    for (let i = 0; i + 1 < p.length; i += 1) {
      const [a, b] = [p[i], p[i + 1]];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

export type Way = { pts: [number, number][]; at: number[]; km: number };
/** A way measured: the kilometres from its start to each of its points. */
export function wayOf(path: [number, number][]): Way {
  const at = [0];
  for (let i = 1; i < path.length; i += 1) at.push(at[i - 1] + geoDistance(path[i - 1], path[i]) * KM);
  return { pts: path, at, km: at[at.length - 1] };
}
/** The point `s` kilometres along a way (clamped to its ends). */
export function pointAt(w: Way, s: number): [number, number] {
  if (s <= 0) return w.pts[0];
  if (s >= w.km) return w.pts[w.pts.length - 1];
  let i = 1;
  while (w.at[i] < s) i += 1;
  const u = (s - w.at[i - 1]) / Math.max(1e-9, w.at[i] - w.at[i - 1]);
  return geoInterpolate(w.pts[i - 1], w.pts[i])(u) as [number, number];
}
/** How far along a way its point nearest `p` is, in kilometres. */
export function kmAlong(w: Way, p: [number, number]): number {
  let best = 0;
  let d = Infinity;
  for (let i = 0; i + 1 < w.pts.length; i += 1) {
    for (let k = 0; k <= 8; k += 1) {
      const q = geoInterpolate(w.pts[i], w.pts[i + 1])(k / 8) as [number, number];
      const dd = geoDistance(q, p);
      if (dd < d) {
        d = dd;
        best = w.at[i] + ((w.at[i + 1] - w.at[i]) * k) / 8;
      }
    }
  }
  return best;
}

const FA_NUM: Record<string, number> = { یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10, یازده: 11, دوازده: 12 };
const EN_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const FA_SHIPS = "نفتکش|نفت‌کش|کشتی|شناور|ناو|ناوشکن|نفتکش‌ها|کشتی‌ها|ال‌ان‌جی";
const EN_SHIPS = "tankers?|ships?|vessels?|warships?|destroyers?|carriers?";
const digits = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));

/**
 * The number of ships a text names, or null when it gives none: «شش نفتکش», «۶ نفتکش», «۲ کشتی», «six tankers»,
 * «6 vessels». A count of something else («شش روز») is not a count of ships. The largest such number wins (a line that
 * says «شش نفتکش … دو نفتکش در چند ساعت» is about six).
 */
export function shipCount(text: string): number | null {
  const t = String(text ?? "").replace(/‌/g, "‌");
  const found: number[] = [];
  const fa = new RegExp(`(?:^|[\\s«(،])(${Object.keys(FA_NUM).join("|")}|[0-9۰-۹٠-٩]{1,3})\\s*(?:فروند\\s*)?(?:${FA_SHIPS})`, "gu");
  for (const m of t.matchAll(fa)) found.push(FA_NUM[m[1]] ?? digits(m[1]));
  const en = new RegExp(`\\b(${Object.keys(EN_NUM).join("|")}|\\d{1,3})\\s+(?:[a-z-]+\\s+)?(?:${EN_SHIPS})\\b`, "gi");
  for (const m of t.matchAll(en)) found.push(EN_NUM[m[1].toLowerCase()] ?? Number(m[1]));
  const ok = found.filter((n) => Number.isFinite(n) && n >= 1 && n <= 500);
  return ok.length ? Math.max(...ok) : null;
}

/** A count as the badge writes it: «۶×». */
export const countBadge = (n: number) => `${String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}×`;
