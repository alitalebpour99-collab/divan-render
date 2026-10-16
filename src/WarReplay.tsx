// «جنگ، روز به روز»: the recorded war events appear on the map in the order of
// their days. Every dot is one event of data/war-events.json, at city level.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EXTENTS, makeMap } from "./geo";
import { Backdrop, Brand, C, FPS, Foot, NASKH, SAFE_BOTTOM, SIDE, SIDE_RAIL, VAZIR, W, addDays, clamped, during, ease, faDate, faDigits, faNum, fade, grow, leave, paint, rise } from "./kit";

import type { WarEventProps, WarProps } from "./props";

type Trust = "confirmed" | "claim" | "unverified";
type Ev = WarEventProps;

const HOOK = Math.round(2.6 * FPS);
const PLAY = Math.round(23.4 * FPS);
const END = Math.round(6 * FPS);
export const warReplayDuration = HOOK + PLAY + END;
/** The replay always runs the same length: more days only mean faster days. */
export const warDuration = (_p?: WarProps) => warReplayDuration;

const BOX = { x0: 16, y0: 372, x1: W - 16, y1: 1404 };
const EXT = EXTENTS.region;
const inWindow = (c: [number, number]) => c[0] >= EXT[0][0] && c[0] <= EXT[1][0] && c[1] >= EXT[0][1] && c[1] <= EXT[1][1];

// Half of the events fall in the first month. Time on screen follows the events as
// much as the calendar, so the dense weeks can be read and the quiet months do not drag.
function clock(events: Ev[], maxDay: number) {
  const upTo = new Array(maxDay + 1).fill(0);
  for (const e of events) if (e.d >= 0 && e.d <= maxDay) upTo[e.d] += 1;
  for (let d = 1; d <= maxDay; d += 1) upTo[d] += upTo[d - 1];
  const cum = upTo.map((n) => n / Math.max(1, events.length));
  /** The share of the replay that has passed when day `d` begins (0 … 1). */
  const shareAt = (d: number) => 0.45 * ((d - 1) / Math.max(1, maxDay - 1)) + 0.55 * cum[Math.max(0, Math.min(maxDay, Math.floor(d) - 1))];
  const frameOfDay = (d: number) => HOOK + shareAt(d) * PLAY;
  /** The day the replay stands at, on a frame. */
  const dayAt = (frame: number) => {
    const p = Math.max(0, Math.min(1, (frame - HOOK) / PLAY));
    let d = 1;
    while (d < maxDay && shareAt(d + 1) <= p) d += 1;
    return d;
  };
  return { frameOfDay, dayAt };
}

// name, longitude, latitude, rotation (the site's map: components/map/DivanMap.tsx)
const SEAS: [string, number, number, number][] = [
  ["خلیج فارس", 51.0, 27.3, 27],
  ["دریای خزر", 51.2, 39.6, 0],
  ["دریای عمان", 60.0, 23.9, -14],
  ["دریای سرخ", 38.0, 20.6, -58],
  ["دریای مدیترانه", 33.4, 34.6, 0],
  ["دریای عرب", 61.0, 16.0, 0],
];
const LANDS: [string, number, number][] = [
  ["عراق", 43.4, 33.0],
  ["عربستان", 44.6, 23.6],
  ["ترکیه", 35.6, 38.9],
  ["سوریه", 38.4, 35.1],
  ["مصر", 32.0, 26.4],
  ["یمن", 47.2, 15.7],
  ["عمان", 56.8, 20.4],
  ["افغانستان", 62.6, 33.4],
  ["پاکستان", 62.9, 27.6],
];

const COLOR: Record<Trust, string> = { confirmed: C.strike, claim: C.claim, unverified: C.ink2 };
const LABEL: Record<Trust, string> = { confirmed: "تأییدشده", claim: "ادعای یک طرف", unverified: "تأییدنشده" };

const Mark: React.FC<{ x: number; y: number; t: Trust; age: number; since: number }> = ({ x, y, t, age, since }) => {
  const col = COLOR[t];
  // it pops in, one ring leaves it, and after a month it steps back
  const pop = interpolate(since, [0, 7], [0, 1], { ...clamped, easing: ease });
  const old = age > 30;
  const s = (old ? 0.62 : 1) * pop;
  const ring = since < 26 ? interpolate(since, [0, 26], [0, 1], clamped) : 1;
  return (
    <g opacity={old ? 0.5 : 1}>
      {since < 26 ? <circle cx={x} cy={y} r={8 + ring * 46} fill="none" stroke={col} strokeWidth={2.2} opacity={0.85 * (1 - ring)} /> : null}
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        {t === "confirmed" ? (
          <>
            <circle r="7.5" fill={col} />
            <circle r="13" fill="none" stroke={col} strokeWidth="1.6" />
          </>
        ) : t === "claim" ? (
          <circle r="9.5" fill={C.bg} stroke={col} strokeWidth="2.6" strokeDasharray="4.2 3.4" />
        ) : (
          <>
            <circle r="7.5" fill={C.bg} stroke={col} strokeWidth="2.2" />
            <circle r="2.2" fill={col} />
          </>
        )}
      </g>
    </g>
  );
};

const LegendDot: React.FC<{ t: Trust }> = ({ t }) => (
  <svg width="30" height="30" viewBox="-15 -15 30 30" style={{ flex: "none" }}>
    {t === "confirmed" ? (
      <>
        <circle r="6.5" fill={COLOR[t]} />
        <circle r="11.5" fill="none" stroke={COLOR[t]} strokeWidth="1.5" />
      </>
    ) : t === "claim" ? (
      <circle r="9" fill="none" stroke={COLOR[t]} strokeWidth="2.4" strokeDasharray="4 3.2" />
    ) : (
      <>
        <circle r="7" fill="none" stroke={COLOR[t]} strokeWidth="2" />
        <circle r="2" fill={COLOR[t]} />
      </>
    )}
  </svg>
);

export const WarReplay: React.FC<WarProps> = (p) => {
  paint("war");
  const frame = useCurrentFrame();
  const EVENTS = p.events;
  const MAX_DAY = Math.max(2, p.warDay);
  const { frameOfDay, dayAt } = useMemo(() => clock(EVENTS, MAX_DAY), [EVENTS, MAX_DAY]);
  const map = useMemo(() => makeMap(EXT, BOX), []);
  const placed = useMemo(
    () =>
      EVENTS.filter((e) => e.c && inWindow(e.c)).map((e, k, all) => {
        const [x, y] = map.at(e.c![0], e.c![1]);
        // events of one day do not all land on the same frame
        const nth = all.slice(0, k).filter((o) => o.d === e.d).length;
        return { ...e, x, y, at: frameOfDay(e.d) + Math.min(nth, 6) * 2 };
      }),
    [map, EVENTS, frameOfDay],
  );
  const offMap = EVENTS.filter((e) => e.c && !inWindow(e.c)).length;
  const noPlace = EVENTS.filter((e) => !e.c).length;

  const day = dayAt(frame);
  const ending = frame >= HOOK + PLAY;
  const shown = EVENTS.filter((e) => e.d <= day && frame >= HOOK);
  const tally = (t: Trust) => shown.filter((e) => e.t === t).length;
  const progress = Math.max(0, Math.min(1, (frame - HOOK) / PLAY));

  // the turning point the replay has just passed, held for a moment
  const passed = p.milestones.filter((m) => frame >= frameOfDay(m.day)).at(-1);
  const passedAt = passed ? frameOfDay(passed.day) : 0;
  const mileOpacity = passed && !ending ? during(frame, passedAt, passedAt + 62, 8) : 0;

  const endAt = HOOK + PLAY;
  // the map waits behind the opening words, and steps back again behind the closing card
  const mapDim = ending ? interpolate(frame, [endAt, endAt + 18], [1, 0.3], clamped) : interpolate(frame, [HOOK - 16, HOOK], [0.34, 1], clamped);
  const trackTop = H_TRACK;

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={warReplayDuration} glowY={46} />
      {p.music ? <Audio src={staticFile(p.music)} /> : null}

      {/* the map */}
      <svg width={W} height={1920} style={{ position: "absolute", inset: 0, opacity: mapDim }}>
        <defs>
          <clipPath id="box">
            <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} rx="26" />
          </clipPath>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <g clipPath="url(#box)">
          <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} fill={C.sea} />
          <path d={map.grat} fill="none" stroke={C.mapLine} strokeWidth="1" opacity=".6" />
          <path d={map.land} fill={C.land} stroke={C.mapLine} strokeWidth="1.4" />
          <path d={map.iran} fill={C.iran} />
          <path d={map.borders} fill="none" stroke={C.mapLine} strokeWidth="1.5" strokeDasharray="5 5" />
          <path d={map.iran} fill="none" stroke={C.acc} strokeWidth="11" filter="url(#glow)" opacity=".4" />
          <path d={map.iran} fill="none" stroke={C.acc} strokeWidth="2.6" />
          {SEAS.map(([name, lon, lat, turn]) => {
            const [x, y] = map.at(lon, lat);
            return (
              <text key={name} x={x} y={y} transform={`rotate(${turn} ${x} ${y})`} textAnchor="middle" fill={C.ink3} opacity=".8" style={{ fontFamily: NASKH, fontSize: 27 }}>
                {name}
              </text>
            );
          })}
          {LANDS.map(([name, lon, lat]) => {
            const [x, y] = map.at(lon, lat);
            return (
              <text key={name} x={x} y={y} textAnchor="middle" fill={C.ink3} opacity=".62" style={{ fontFamily: VAZIR, fontSize: 23 }}>
                {name}
              </text>
            );
          })}
          <text x={map.at(54.6, 33.4)[0]} y={map.at(54.6, 33.4)[1]} textAnchor="middle" fill={C.ink2} opacity=".55" style={{ fontFamily: NASKH, fontSize: 40, fontWeight: 700 }}>
            ایران
          </text>
          {placed.map((e, k) => (frame >= e.at ? <Mark key={k} x={e.x} y={e.y} t={e.t} age={day - e.d} since={frame - e.at} /> : null))}
        </g>
        <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} rx="26" fill="none" stroke={C.line2} strokeWidth="1.5" />
      </svg>

      <Brand tag={p.series} />

      {/* the hook */}
      <div style={{ position: "absolute", top: 640, right: SIDE, left: SIDE, textAlign: "center", opacity: leave(frame, HOOK - 4, 12) * fade(frame, 3, 10), transform: `translateY(${rise(frame, 3, 50, 22)}px)` }}>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 250, lineHeight: 1.05, color: C.ink }}>{faDigits(MAX_DAY)}</div>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 104, lineHeight: 1.35, color: C.ink }}>روز جنگ</div>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 76, lineHeight: 1.4, color: C.acc, opacity: fade(frame, 18, 12) }}>در نیم دقیقه</div>
        <div style={{ fontFamily: VAZIR, fontSize: 34, color: C.ink2, marginTop: 26, opacity: fade(frame, 30, 12) }}>هر نقطه، یک رویداد با منبع</div>
      </div>

      {/* the day the replay stands at */}
      <div style={{ position: "absolute", top: 206, right: SIDE, left: SIDE, display: "flex", alignItems: "baseline", gap: 22, opacity: fade(frame, HOOK, 10) * (ending ? leave(frame, endAt + 14, 12) : 1) }}>
        <span style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 40, color: C.ink2 }}>روز</span>
        <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 124, lineHeight: 1, color: C.ink, fontVariantNumeric: "tabular-nums", minWidth: 250 }}>{faDigits(day)}</span>
        <span style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 38, color: C.ink2 }}>{faDate(addDays(p.warStart, day - 1))}</span>
      </div>

      {/* a turning point, as the replay passes it */}
      <div style={{ position: "absolute", top: BOX.y0 + 26, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: mileOpacity, transform: `translateY(${passed ? rise(frame, passedAt, 22, 14) : 0}px)` }}>
        {passed ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 30px", borderRadius: 40, background: C.panel, border: `2px solid ${C.acc}`, boxShadow: "0 16px 40px rgba(0,0,0,.45)" }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: C.acc }} />
            <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 50, color: C.ink }}>{passed.fa}</span>
            <span style={{ fontFamily: VAZIR, fontSize: 30, color: C.ink2 }}>{faDate(passed.date, false)}</span>
          </div>
        ) : null}
      </div>

      {/* what the dots are, with the count so far */}
      <div style={{ position: "absolute", top: BOX.y1 + 22, right: SIDE_RAIL - 8, left: 34, display: "flex", gap: 12, opacity: fade(frame, HOOK - 14, 14) * (ending ? leave(frame, endAt + 14, 12) : 1) }}>
        {(["confirmed", "claim", "unverified"] as Trust[]).map((t) => (
          <div key={t} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 18, background: C.panel, border: `1.5px solid ${C.line}` }}>
            <LegendDot t={t} />
            <span style={{ fontFamily: VAZIR, fontSize: 25, color: C.ink2, whiteSpace: "nowrap" }}>{LABEL[t]}</span>
            <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 36, color: C.ink, marginInlineStart: "auto", fontVariantNumeric: "tabular-nums" }}>{faDigits(tally(t))}</span>
          </div>
        ))}
      </div>

      {/* the line of time: the days from right to left, the turning points on it */}
      <div style={{ position: "absolute", top: trackTop, right: SIDE_RAIL, left: SIDE - 24, height: 60, opacity: fade(frame, HOOK - 10, 14) * (ending ? leave(frame, endAt + 14, 12) : 1) }}>
        <div style={{ position: "absolute", top: 26, right: 0, left: 0, height: 4, borderRadius: 2, background: C.line2 }} />
        <div style={{ position: "absolute", top: 26, right: 0, width: `${(100 * (day - 1)) / (MAX_DAY - 1)}%`, height: 4, borderRadius: 2, background: C.acc }} />
        {p.milestones.map((m) => (
          <div key={m.date} style={{ position: "absolute", top: 14, right: `${(100 * (m.day - 1)) / (MAX_DAY - 1)}%`, width: 3, height: 28, marginRight: -1.5, borderRadius: 2, background: frame >= frameOfDay(m.day) ? C.acc : C.ink3 }} />
        ))}
        <div style={{ position: "absolute", top: 12, right: `${(100 * (day - 1)) / (MAX_DAY - 1)}%`, width: 22, height: 32, marginRight: -11, borderRadius: 7, background: C.ink, boxShadow: `0 0 0 4px ${C.bg}` }} />
      </div>

      {/* the end: what the replay showed, and what it did not */}
      {ending ? (
        <div style={{ position: "absolute", top: 470, right: SIDE, left: SIDE, opacity: fade(frame, endAt + 8, 14), transform: `translateY(${rise(frame, endAt + 8, 40, 20)}px)` }}>
          <div style={{ padding: "44px 46px", borderRadius: 30, background: "rgba(20,28,48,.94)", border: `1.5px solid ${C.line2}`, boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
            <div style={{ fontFamily: VAZIR, fontSize: 30, color: C.ink2 }}>تا {faDate(p.warAsOf)} در دیوان ثبت شده است</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
              <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 150, lineHeight: 1.15, color: C.ink }}>{faDigits(Math.round(grow(frame, endAt + 10, 30) * p.counts.total))}</span>
              <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 60, color: C.ink }}>رویداد، هر کدام با منبع</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 26 }}>
              {(["confirmed", "claim", "unverified"] as Trust[]).map((t, k) => {
                const n = p.counts[t];
                const from = endAt + 26 + k * 8;
                return (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, opacity: fade(frame, from, 10) }}>
                    <LegendDot t={t} />
                    <span style={{ fontFamily: VAZIR, fontSize: 34, color: C.ink, width: 250 }}>{LABEL[t]}</span>
                    <div style={{ flex: 1, height: 16, borderRadius: 8, background: C.line }}>
                      <div style={{ width: `${(100 * n * grow(frame, from, 26)) / Math.max(1, p.counts.total)}%`, height: "100%", borderRadius: 8, background: COLOR[t] }} />
                    </div>
                    <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 40, color: C.ink, width: 86, textAlign: "left" }}>{faDigits(n)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: VAZIR, fontSize: 27, lineHeight: 1.75, color: C.ink2, marginTop: 28, opacity: fade(frame, endAt + 56, 14) }}>
              جای هر رویداد در حد شهر است. {faNum(noPlace)} رویداد جای مشخصی در منبع ندارد و {faNum(offMap)} رویداد بیرون از این نقشه است. این فهرستِ همهٔ حمله‌ها نیست.
            </div>
          </div>
        </div>
      ) : null}

      <Foot opacity={ending ? fade(frame, endAt + 70, 14) : 0}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};

const H_TRACK = 1920 - SAFE_BOTTOM - 74;
