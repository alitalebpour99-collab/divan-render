// How the two series formats write a value while it counts, in Persian, the way the site writes the same unit
// (lib/people.ts): the counted figure lands on the site's own text, so the two must agree.
import type { SeriesUnit } from "./props";

const n = (v: number, frac: number) => new Intl.NumberFormat("fa-IR", { minimumFractionDigits: 0, maximumFractionDigits: frac }).format(v);

export function seriesText(unit: SeriesUnit, v: number): string {
  switch (unit) {
    case "people":
      return Math.abs(v) >= 1e6 ? `${n(Math.round(v / 1e5) / 10, 1)} میلیون` : `${n(Math.round(v), 0)} نفر`;
    case "births":
      return `${n(Math.round(v * 100) / 100, 2)} فرزند`;
    case "years":
      return `${n(Math.round(v * 10) / 10, 1)} سال`;
    case "percent":
      return `${n(Math.round(v * 10) / 10, 1)}٪`;
    case "index":
      return n(Math.round(v * 10) / 10, 1);
    case "usd":
      return `${n(Math.round(v), 0)} دلار`;
    case "usdbn":
      return v >= 1e12 ? `${n(Math.round(v / 1e11) / 10, 1)} هزار میلیارد دلار` : `${n(Math.round(v / 1e8) / 10, 1)} میلیارد دلار`;
    case "count":
      return n(Math.round(v), 0);
    case "m3":
      return `${n(Math.round(v), 0)} مترمکعب`;
    case "tonnes":
      return `${n(Math.round(v / 1e5) / 10, 1)} میلیون تن`;
    case "kg":
      return `${n(Math.round(v), 0)} کیلو`;
    case "kwh":
      return `${n(Math.round(v), 0)} کیلووات‌ساعت`;
    case "tco2":
      return `${n(Math.round(v * 10) / 10, 1)} تن`;
    case "per100":
      return `${n(Math.round(v * 10) / 10, 1)} برای هر ۱۰۰ نفر`;
    case "per100k":
      return `${n(Math.round(v * 10) / 10, 1)} در هر ۱۰۰ هزار نفر`;
    case "per1k_births":
      return `${n(Math.round(v * 10) / 10, 1)} در هر هزار تولد`;
    case "per100k_births":
      return `${n(Math.round(v), 0)} در هر ۱۰۰ هزار تولد`;
    case "ugm3":
      return `${n(Math.round(v * 10) / 10, 1)} میکروگرم در مترمکعب`;
  }
}

/** A short form for a bar's end in the race: the same units, fewer words. */
export function shortText(unit: SeriesUnit, v: number): string {
  switch (unit) {
    case "people":
      return `${n(Math.round(v / 1e5) / 10, 1)} میلیون`;
    case "usdbn":
      return v >= 1e12 ? `${n(Math.round(v / 1e11) / 10, 1)} هزار میلیارد $` : `${n(Math.round(v / 1e9), 0)} میلیارد $`;
    case "usd":
      return `${n(Math.round(v), 0)} $`;
    case "years":
      return `${n(Math.round(v * 10) / 10, 1)} سال`;
    case "percent":
      return `${n(Math.round(v), 0)}٪`;
    default:
      return seriesText(unit, v);
  }
}
