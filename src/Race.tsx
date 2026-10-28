// «مسابقهٔ کشورها»: the nine states of «ایران در منطقه» year by year, as a race
// of bars (World Bank, data/region-series.json). About 19 seconds: the question;
// the race from the first year to the latest, the bars changing places, the year
// large behind them, a pop each time Iran moves; the end with Iran's place then
// and now, the source and a line to follow the page. Its own look: deep ground,
// each state a quiet colour, Iran in the series' colour (owner 2026-10-23: the
// formats look too much alike).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { Backdrop, C, NASKH, SIDE, Sfx, VAZIR, W, Words, clamped, fade, faNum, leave, paint, pop, rise, useCurrentFrame, PartLine } from "./kit";
import type { RaceProps } from "./props";
import { scenes, type Cues } from "./voice";
import { shortText } from "./values";

const Q = 0;
const RACE = 70;
const RACE_LEN = 400;
const END = RACE + RACE_LEN + 20;
export const raceDuration = () => END + 110;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
export const raceCues = (): Cues => ({ ...scenes([Q, RACE, END]), start: Q + 2, first: RACE, last: END });

const TOP = 300;
const ROW = 112;
const BAR_H = 80;
const NAME_W = 190;
// the room left for the value at the end of the longest bar
const LABEL_W = 260;
const BAR_W = W - 2 * SIDE - NAME_W - 20 - LABEL_W;
// the other states in quiet colours around the wheel, so a state keeps its colour through the race
const QUIET = [200, 150, 95, 40, 330, 250, 175, 15].map((h) => `oklch(0.62 0.05 ${h})`);

/** A state's value at a point between two years: the straight line between the two known years around it. */
function valueAt(values: (number | null)[], at: number): number | null {
  const i = Math.floor(at);
  const f = at - i;
  const a = values[i] ?? null;
  const b = values[Math.min(values.length - 1, i + 1)] ?? null;
  if (a == null) return null;
  if (b == null || f === 0) return a;
  return a + (b - a) * f;
}

/** The order of the states in one year: largest first; a state without a value that year is out. */
const order = (rows: RaceProps["rows"], i: number) =>
  rows
    .map((r, k) => ({ k, v: r.values[i] }))
    .filter((x): x is { k: number; v: number } => x.v != null)
    .sort((a, b) => b.v - a.v)
    .map((x) => x.k);

const ORD = ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم"];

export const Race: React.FC<RaceProps> = (p) => {
  paint("race");
  const frame = useCurrentFrame();
  const total = raceDuration();
  const last = p.years.length - 1;
  const t = interpolate(frame, [RACE, RACE + RACE_LEN], [0, last], clamped);
  const i = Math.floor(t);
  const f = t - i;
  const now = order(p.rows, i);
  const next = order(p.rows, Math.min(last, i + 1));
  const values = p.rows.map((r) => valueAt(r.values, t));
  const max = Math.max(1, ...values.filter((v): v is number => v != null));
  const year = p.years[Math.min(last, Math.round(t))];
  const home = p.rows.findIndex((r) => r.home);

  // Iran's place each year: a pop where it changes
  const moves: number[] = [];
  let was = order(p.rows, 0).indexOf(home);
  for (let y = 1; y <= last; y += 1) {
    const r = order(p.rows, y).indexOf(home);
    if (r >= 0 && was >= 0 && r !== was) moves.push(Math.round(RACE + (y / last) * RACE_LEN));
    if (r >= 0) was = r;
  }
  const rankNow = now.indexOf(home);
  const quiet = new Map<number, string>();
  p.rows.forEach((r, k) => {
    if (!r.home) quiet.set(k, QUIET[quiet.size % QUIET.length]);
  });

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} volume={0.85} /> : null}
      <Backdrop total={total} glowY={30} />

      {/* the name and the kind of Reel */}
      <div style={{ position: "absolute", top: 60, right: SIDE, left: SIDE, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 52, color: C.ink }}>دیوان</span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: C.acc }}>{p.kicker}</span>
          <PartLine />
        </span>
      </div>
      <div style={{ position: "absolute", top: 140, right: SIDE, left: SIDE, fontFamily: NASKH, fontWeight: 700, fontSize: 64, color: C.ink, opacity: fade(frame, RACE - 6, 10) }}>{p.title}</div>

      {/* the question */}
      <Sfx at={Q} name="hit" />
      {frame < RACE + 10 ? (
        <div style={{ position: "absolute", top: 640, right: SIDE, left: SIDE, opacity: leave(frame, RACE, 12) }}>
          <Words text={p.question} from={2} step={2} lift={22} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: p.question.length > 44 ? 84 : 96, lineHeight: 1.45, color: C.ink }} />
          <div style={{ marginTop: 26, fontFamily: VAZIR, fontWeight: 700, fontSize: 38, color: C.acc, opacity: fade(frame, 30, 10) }}>{`${faNum(p.years[0])} تا ${faNum(p.years[last])}`.replace(/٬/g, "")}</div>
        </div>
      ) : null}

      {/* the year, large behind the bars */}
      <Sfx at={RACE - 4} name="whoosh" />
      {moves.map((m) => (
        <Sfx key={m} at={m} name="pop" />
      ))}
      <Sfx at={RACE + RACE_LEN} name="hit" />
      {frame >= RACE - 4 ? (
        <div style={{ position: "absolute", left: SIDE - 10, top: TOP + 5 * ROW, fontFamily: VAZIR, fontWeight: 800, fontSize: 230, lineHeight: 1, color: C.ink, opacity: 0.13 * fade(frame, RACE - 4, 10) * leave(frame, END + 6, 10) }}>
          {faNum(year).replace(/٬/g, "")}
        </div>
      ) : null}

      {/* the bars */}
      {frame >= RACE - 4
        ? p.rows.map((r, k) => {
            const v = values[k];
            const a = now.indexOf(k);
            const b = next.indexOf(k);
            if (v == null || (a < 0 && b < 0)) return null;
            const place = a < 0 ? b : b < 0 ? a : a + (b - a) * f;
            const y = TOP + place * ROW;
            const width = Math.max(8, (v / max) * BAR_W);
            const colour = r.home ? C.acc : (quiet.get(k) ?? C.ink3);
            return (
              <div key={r.name} style={{ position: "absolute", top: y, right: SIDE, left: SIDE, height: BAR_H, display: "flex", alignItems: "center", gap: 20, opacity: fade(frame, RACE - 4, 10) * (a < 0 ? f : 1) }}>
                <span style={{ width: NAME_W, flex: "none", fontFamily: VAZIR, fontWeight: r.home ? 800 : 700, fontSize: r.home ? 46 : 40, color: r.home ? C.acc : C.ink2, textAlign: "right", whiteSpace: "nowrap" }}>{r.name}</span>
                <div style={{ position: "relative", height: BAR_H, width, borderRadius: 14, background: colour, boxShadow: r.home ? `0 0 34px ${C.accLine}` : undefined }}>
                  <span style={{ position: "absolute", right: "calc(100% + 14px)", top: 0, bottom: 0, display: "flex", alignItems: "center", fontFamily: VAZIR, fontWeight: 700, fontSize: 33, color: r.home ? C.ink : C.ink2, whiteSpace: "nowrap", direction: "rtl" }}>
                    {shortText(p.unit, v)}
                  </span>
                </div>
              </div>
            );
          })
        : null}

      {/* Iran's place, under the bars */}
      {frame >= RACE && rankNow >= 0 ? (
        <div style={{ position: "absolute", right: SIDE, top: TOP + 9 * ROW + 30, fontFamily: VAZIR, fontWeight: 800, fontSize: 46, color: C.acc, opacity: fade(frame, RACE + 10, 10) * leave(frame, END, 10) }}>
          {`ایران: ${ORD[rankNow] ?? faNum(rankNow + 1)}`}
        </div>
      ) : null}

      {/* the end: Iran then and now, the source, the page */}
      <Sfx at={END} name="swish" />
      {frame >= END ? (
        <div style={{ position: "absolute", right: SIDE, left: SIDE, top: TOP + 9 * ROW + 10, display: "flex", flexDirection: "column", gap: 16, opacity: fade(frame, END + 2, 10), transform: `translateY(${rise(frame, END + 2, 24, 12)}px)` }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 50, color: C.acc, transform: `scale(${pop(frame, END + 4, 16)})`, transformOrigin: "right center" }}>{p.end}</div>
          <div style={{ fontFamily: VAZIR, fontSize: 26, lineHeight: 1.6, color: C.ink3 }}>{`منبع: ${p.source}`}</div>
          <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: C.ink, opacity: fade(frame, END + 30, 10) }}>
            دنبال کنید <span style={{ direction: "ltr", unicodeBidi: "isolate", color: C.acc }}>@divan.ahura</span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
