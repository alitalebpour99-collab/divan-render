// «مرزها در گذر زمان»: the outlines the Cliopatria dataset draws for the Safavid
// and Qajar states, one after another, over today's border. The outlines and the
// areas are that dataset's reading (data/map/eras.json); nothing here redraws them.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import erasJson from "./data/eras.json";
import type { BordersProps } from "./props";
import { EXTENTS, makeMap } from "./geo";
import { Backdrop, Brand, C, FPS, Foot, NASKH, SIDE, SIDE_RAIL, VAZIR, W, clamped, during, ease, faDigits, faNum, fade, grow, leave, paint, rise, useCurrentFrame } from "./kit";

type EraKey = "1700" | "1813" | "1828";
type Row = { Name: string; FromYear: number; ToYear: number; Area: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ERAS = erasJson as any as { places: Record<string, [number, number]>; eras: Record<EraKey, { row: Row; inside: string[]; later: { FromYear: number; ToYear: number; Area: number }[]; geometry: any }> };

const BOX = { x0: 20, y0: 506, x1: W - 20, y1: 1232 };
const faYear = (iso: string) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)).replace(/[^۰-۹]/g, "");

// the four stops, as on the History page of the site
const after1828 = ERAS.eras["1828"].later[0];
const STOPS: { key: EraKey | "today"; from: number; big: string; small: string; title: string; bar: string; years: string; area: number | null }[] = [
  { key: "1700", from: 0, big: `حدود ${faYear("1700-07-01")}`, small: "خورشیدی · ۱۷۰۰ میلادی", title: "ایران در روزگار صفویان", bar: "صفویان", years: `${faDigits(ERAS.eras["1700"].row.FromYear)} تا ${faDigits(ERAS.eras["1700"].row.ToYear)}`, area: ERAS.eras["1700"].row.Area },
  { key: "1813", from: 250, big: `پیش از ${faYear("1813-10-24")}`, small: "خورشیدی · ۱۸۱۳ میلادی", title: "پیش از عهدنامهٔ گلستان", bar: "قاجار، پیش از گلستان", years: `${faDigits(ERAS.eras["1813"].row.FromYear)} تا ${faDigits(ERAS.eras["1813"].row.ToYear)}`, area: ERAS.eras["1813"].row.Area },
  { key: "1828", from: 400, big: `پیش از ${faYear("1828-02-22")}`, small: "خورشیدی · ۱۸۲۸ میلادی", title: "پیش از عهدنامهٔ ترکمانچای", bar: "قاجار، پیش از ترکمانچای", years: `${faDigits(ERAS.eras["1828"].row.FromYear)} تا ${faDigits(ERAS.eras["1828"].row.ToYear)}`, area: ERAS.eras["1828"].row.Area },
  { key: "today", from: 530, big: "امروز", small: "مرز کنونی ایران", title: "پس از ترکمانچای، تا امروز", bar: "پس از ترکمانچای", years: `${faDigits(after1828.FromYear)} تا ${faDigits(after1828.ToYear)}`, area: after1828.Area },
];
const CLOSE = 660;
export const bordersDuration = 800;
export const bordersLength = (_p?: BordersProps) => bordersDuration;
const HOOK_END = 96;
const MAX_AREA = Math.max(...STOPS.map((s) => s.area ?? 0));

// the towns the site's own texts name; a label only where there is room for one
const TOWNS: { id: string; fa: string; dx?: number; dy?: number; label?: boolean }[] = [
  { id: "tbilisi", fa: "تفلیس", dx: -14, dy: -16, label: true },
  { id: "yerevan", fa: "ایروان", dx: -16, dy: 12, label: true },
  { id: "nakhchivan", fa: "نخجوان" },
  { id: "ganja", fa: "گنجه" },
  { id: "shusha", fa: "قره‌باغ" },
  { id: "baku", fa: "باکو", dx: 16, dy: -12, label: true },
  { id: "herat", fa: "هرات", dx: 16, dy: 10, label: true },
  { id: "merv", fa: "مرو", dx: 16, dy: -10, label: true },
  { id: "bahrain", fa: "بحرین", dx: -16, dy: 12, label: true },
];

export const Borders: React.FC<BordersProps> = ({ music, series }) => {
  paint("borders");
  const frame = useCurrentFrame();
  const map = useMemo(() => makeMap(EXTENTS.archive, BOX), []);
  const outlines = useMemo(() => (["1700", "1813", "1828"] as EraKey[]).map((k) => ({ k, d: map.d(ERAS.eras[k].geometry) })), [map]);
  const towns = useMemo(() => TOWNS.map((t) => ({ ...t, xy: map.at(ERAS.places[t.id][0], ERAS.places[t.id][1]) })), [map]);

  const at = STOPS.findLastIndex((s) => frame >= s.from);
  const stop = STOPS[at];
  const next = STOPS[at + 1];
  const until = next ? next.from : CLOSE;
  const closing = frame >= CLOSE;
  const insideNow = (id: string) => stop.key !== "today" && ERAS.eras[stop.key as EraKey].inside.includes(id);
  const insideBefore = (id: string) => at > 0 && STOPS[at - 1].key !== "today" && ERAS.eras[STOPS[at - 1].key as EraKey].inside.includes(id);

  const eraOpacity = (k: EraKey) => {
    const i = STOPS.findIndex((s) => s.key === k);
    const end = STOPS[i + 1].from;
    return Math.min(fade(frame, STOPS[i].from + (i === 0 ? 14 : 0), 26), interpolate(frame, [end, end + 26], [1, 0], clamped));
  };
  const todayGlow = interpolate(frame, [STOPS[3].from, STOPS[3].from + 26], [0.3, 1], clamped);
  const mapDim = closing ? interpolate(frame, [CLOSE, CLOSE + 20], [1, 0.3], clamped) : 1;

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={bordersDuration} glowY={48} />
      {music ? <Audio src={staticFile(music)} /> : null}

      <svg width={W} height={1920} style={{ position: "absolute", inset: 0, opacity: mapDim }}>
        <defs>
          <clipPath id="bbox">
            <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} rx="26" />
          </clipPath>
          <filter id="bglow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <g clipPath="url(#bbox)">
          <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} fill={C.sea} />
          <path d={map.grat} fill="none" stroke={C.mapLine} strokeWidth="1" opacity=".6" />
          <path d={map.land} fill={C.land} stroke={C.mapLine} strokeWidth="1.4" />
          <path d={map.borders} fill="none" stroke={C.mapLine} strokeWidth="1.4" strokeDasharray="5 5" />
          <path d={map.iran} fill={C.iran} opacity={0.6 + 0.4 * todayGlow} />
          {outlines.map(({ k, d }) => (
            <path key={k} d={d} fill={C.accSoft} stroke={C.acc} strokeWidth="3" strokeDasharray="12 8" strokeLinejoin="round" opacity={eraOpacity(k)} />
          ))}
          <path d={map.iran} fill="none" stroke={C.acc} strokeWidth="10" filter="url(#bglow)" opacity={0.45 * todayGlow} />
          <path d={map.iran} fill="none" stroke={stop.key === "today" ? C.acc : C.ink2} strokeWidth={stop.key === "today" ? 3.2 : 1.6} opacity={stop.key === "today" ? 1 : 0.75} />
          {towns.map((t) => {
            const [x, y] = t.xy;
            const inside = insideNow(t.id);
            // a town that has just fallen outside the line: one ring leaves it
            const lost = !inside && insideBefore(t.id);
            const since = frame - stop.from;
            const ring = lost && since < 34 ? since / 34 : null;
            const shown = fade(frame, 60 + TOWNS.indexOf(t) * 5, 12);
            const anchor = (t.dx ?? 0) < 0 ? "start" : "end";
            return (
              <g key={t.id} opacity={shown}>
                {ring !== null ? <circle cx={x} cy={y} r={8 + ring * 40} fill="none" stroke={C.claim} strokeWidth="2.4" opacity={0.9 * (1 - ring)} /> : null}
                <circle cx={x} cy={y} r={inside ? 7 : 5.5} fill={inside ? C.acc : C.bg} stroke={inside ? C.acc : C.ink3} strokeWidth="2" />
                {t.label ? (
                  <text x={x + (t.dx ?? 0)} y={y + (t.dy ?? 0) + 9} textAnchor={anchor} fill={inside ? C.ink : C.ink3} style={{ fontFamily: VAZIR, fontSize: 27, fontWeight: inside ? 700 : 400 }}>
                    {t.fa}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
        <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} rx="26" fill="none" stroke={C.line2} strokeWidth="1.5" />
      </svg>

      <Brand tag={series} />

      {/* the opening question */}
      <div style={{ position: "absolute", top: 208, right: SIDE, left: SIDE, opacity: leave(frame, HOOK_END, 12) * fade(frame, 3, 10), transform: `translateY(${rise(frame, 3, 44, 22)}px)` }}>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 104, lineHeight: 1.35, color: C.ink }}>
          ایران <span style={{ color: C.acc }}>چقدر</span> کوچک شد؟
        </div>
        <div style={{ fontFamily: VAZIR, fontSize: 36, color: C.ink2, marginTop: 6, opacity: fade(frame, 22, 12) }}>از صفویان تا امروز، روی نقشه</div>
      </div>

      {/* the stop the map stands at */}
      {!closing
        ? STOPS.map((s, i) => {
            const from = i === 0 ? HOOK_END + 4 : s.from;
            const end = STOPS[i + 1] ? STOPS[i + 1].from : CLOSE;
            const o = during(frame, from, end, 12);
            if (o <= 0) return null;
            return (
              <div key={s.key} style={{ position: "absolute", top: 196, right: SIDE, left: SIDE, opacity: o, transform: `translateY(${rise(frame, from, 26, 16)}px)` }}>
                <div style={{ fontFamily: VAZIR, fontSize: 34, fontWeight: 500, color: C.acc }}>{s.title}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 4 }}>
                  <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 116, lineHeight: 1.36, color: C.ink }}>{s.big}</span>
                </div>
                <div style={{ fontFamily: VAZIR, fontSize: 32, color: C.ink2, marginTop: -2 }}>{s.small}</div>
              </div>
            );
          })
        : null}

      {/* the areas the dataset gives for each line */}
      <div style={{ position: "absolute", top: BOX.y1 + 26, right: SIDE_RAIL - 8, left: 40, opacity: fade(frame, HOOK_END, 14) * (closing ? leave(frame, CLOSE + 16, 14) : 1) }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {STOPS.map((s, i) => {
            const from = (i === 0 ? HOOK_END + 10 : s.from + 8);
            const g = grow(frame, from, 34);
            const on = i === at;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 16, opacity: fade(frame, from - 6, 10) }}>
                <div style={{ width: 336, flex: "none" }}>
                  <div style={{ fontFamily: VAZIR, fontSize: 27, fontWeight: on ? 700 : 500, color: on ? C.ink : C.ink2, whiteSpace: "nowrap", lineHeight: 1.35 }}>{s.bar}</div>
                  <div style={{ fontFamily: VAZIR, fontSize: 20, color: C.ink3, whiteSpace: "nowrap", lineHeight: 1.3 }}>{s.years} میلادی</div>
                </div>
                <div style={{ flex: 1, height: 20, borderRadius: 10, background: C.line }}>
                  <div style={{ width: `${(100 * (s.area ?? 0) * g) / MAX_AREA}%`, height: "100%", borderRadius: 10, background: on ? C.acc : C.ink3 }} />
                </div>
                <div style={{ width: 118, flex: "none", fontFamily: VAZIR, fontWeight: 800, fontSize: 34, color: on ? C.ink : C.ink2, textAlign: "left", fontVariantNumeric: "tabular-nums" }}>{faNum(((s.area ?? 0) * g) / 1e6, 2)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: VAZIR, fontSize: 22, color: C.ink3, marginTop: 10 }}>مساحت به میلیون کیلومتر مربع، به برآورد Cliopatria</div>
      </div>

      {/* the close */}
      {closing ? (
        <div style={{ position: "absolute", top: 610, right: SIDE, left: SIDE, opacity: fade(frame, CLOSE + 10, 14), transform: `translateY(${rise(frame, CLOSE + 10, 40, 20)}px)` }}>
          <div style={{ padding: "46px 46px 40px", borderRadius: 30, background: "rgba(20,28,48,.94)", border: `1.5px solid ${C.line2}`, boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
            <div style={{ fontFamily: VAZIR, fontSize: 32, fontWeight: 500, color: C.acc }}>هدف اول مشاوران دیوان</div>
            <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 112, lineHeight: 1.4, color: C.ink }}>ایرانِ یکپارچه</div>
            <div style={{ fontFamily: VAZIR, fontSize: 34, lineHeight: 1.8, color: C.ink2, marginTop: 10, opacity: fade(frame, CLOSE + 34, 14) }}>هیچ تکه‌ای از خاک و هیچ بخشی از مردم جدا نشود.</div>
            <div style={{ fontFamily: VAZIR, fontSize: 26, lineHeight: 1.75, color: C.ink3, marginTop: 22, opacity: fade(frame, CLOSE + 50, 14) }}>
              خط‌چین‌ها برداشتِ مجموعه‌دادهٔ Cliopatria از قلمرو دولت‌های گذشته است، نه مرزِ نقشه‌برداری‌شده.
            </div>
          </div>
        </div>
      ) : null}

      <Foot opacity={closing ? fade(frame, CLOSE + 64, 14) : 0}>مرزهای تاریخی: Cliopatria (Seshat)، CC BY 4.0، ساده‌شده · نقشه: Natural Earth</Foot>
    </AbsoluteFill>
  );
};
