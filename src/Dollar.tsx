// «دلار در بازار آزاد»: the free-market dollar on the days the site read a
// source, from the twelve-day war to the last reading. The last figure counts
// up first; then the line draws itself from the first day to the last, time
// running from right to left as in the site's Persian chart, and every event the
// site marks pops up as the line reaches it; then how many times dearer the
// dollar became; then the sources. Every figure comes from the props the site
// sends (lib/economy.ts, usdChart).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { Backdrop, Brand, C, Foot, Kicker, NASKH, Progress, SIDE, SIDE_RAIL, VAZIR, W, Words, clamped, ease, fade, faNum, grow, leave, paint, pop, readFrames, rise, starts, useCurrentFrame } from "./kit";
import type { DollarProps } from "./props";
import { scenes, type Cues } from "./voice";

const HOOK = 105;
const DRAW = 300;
const RESULT = 120;

function plan(p: DollarProps) {
  const source = Math.min(180, Math.max(120, Math.round(readFrames(p.sources) * 0.8)));
  const lengths = [HOOK, DRAW, RESULT, source];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const dollarDuration = (p: DollarProps) => plan(p).total;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
export const dollarCues = (p: DollarProps): Cues => ({ ...scenes(plan(p).at), result: plan(p).at[2] });

// the plot: above Instagram's buttons, which sit low on the right
const PLOT = { x0: 76, x1: 900, y0: 610, y1: 1110 };
const PW = PLOT.x1 - PLOT.x0;
const PH = PLOT.y1 - PLOT.y0;
// time runs from right to left, as in the site's Persian chart
const sx = (x: number) => PLOT.x0 + ((100 - x) / 100) * PW;
const sy = (y: number) => PLOT.y0 + (y / 100) * PH;

export const Dollar: React.FC<DollarProps> = (p) => {
  paint("dollar");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const [, aDraw, aResult, aSource] = at;
  const pts = p.points;
  const first = pts[0];
  const last = pts[pts.length - 1];

  // how far along the time axis the line has come (percent of the axis)
  const run = interpolate(frame, [aDraw + 16, aDraw + DRAW - 30], [first.x, last.x], { ...clamped, easing: ease });
  const shown = pts.filter((q) => q.x <= run + 1e-6);
  const next = pts.find((q) => q.x > run);
  const prev = shown[shown.length - 1] ?? first;
  const tip = next ? { x: run, y: prev.y + ((next.y - prev.y) * (run - prev.x)) / Math.max(1e-6, next.x - prev.x) } : { x: last.x, y: last.y };
  const line = [...shown, tip].map((q, i) => `${i ? "L" : "M"}${sx(q.x).toFixed(1)} ${sy(q.y).toFixed(1)}`).join(" ");
  const area = `${line} L${sx(tip.x).toFixed(1)} ${PLOT.y1} L${sx(first.x).toFixed(1)} ${PLOT.y1} Z`;
  // the latest event the line has passed: its card stays until the next one comes
  const passed = pts.map((q, i) => ({ q, i })).filter(({ q }) => q.event && q.x <= run);
  const current = passed[passed.length - 1] ?? null;
  const reachedAt = (q: DollarProps["points"][number]) => aDraw + 16 + ((DRAW - 46) * (q.x - first.x)) / Math.max(1e-6, last.x - first.x);

  const chartIn = fade(frame, aDraw, 14);
  const chartOut = leave(frame, aSource + 6, 10);

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={36} />
      <Brand tag={p.series} />
      <Progress total={total} marks={[aDraw, aResult, aSource]} />

      <div style={{ position: "absolute", top: 222, right: SIDE, left: SIDE, opacity: fade(frame, 2, 12) }}>
        <Kicker size={36}>اقتصاد · دلار در بازار آزاد</Kicker>
        <Words text={p.question} from={6} step={3} style={{ marginTop: 10, fontFamily: NASKH, fontWeight: 700, fontSize: interpolate(grow(frame, aDraw, 20), [0, 1], [76, 50]), lineHeight: 1.4, color: C.ink }} />
      </div>

      {/* ---- 1 · the last figure ---- */}
      {frame < aDraw + 20 ? (
        <div style={{ position: "absolute", top: 760, right: SIDE, left: SIDE, textAlign: "center", opacity: leave(frame, aDraw + 14, 14) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 190, lineHeight: 1, color: C.acc, transform: `translateY(${rise(frame, 20, 40)}px)`, opacity: fade(frame, 20, 10) }}>{faNum(Math.round(p.last * grow(frame, 22, 60)))}</div>
          <div style={{ marginTop: 20, fontFamily: VAZIR, fontWeight: 700, fontSize: 52, color: C.ink, opacity: fade(frame, 34, 12) }}>{`${p.unit} · ${p.lastDate}`}</div>
          <div style={{ marginTop: 40, fontFamily: VAZIR, fontSize: 36, color: C.ink3, opacity: fade(frame, 56, 14) }}>{`${p.firstDate}: ${p.firstText}`}</div>
        </div>
      ) : null}

      {/* ---- 2 · the line ---- */}
      {frame >= aDraw - 2 ? (
        <div style={{ position: "absolute", inset: 0, opacity: Math.min(chartIn, chartOut) }}>
          <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="dollar-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={C.acc} stopOpacity="0.28" />
                <stop offset="1" stopColor={C.acc} stopOpacity="0" />
              </linearGradient>
            </defs>
            {p.yTicks.map((t, i) => (
              <g key={i} opacity={fade(frame, aDraw + 4 + i * 2, 10)}>
                <line x1={PLOT.x0} x2={PLOT.x1} y1={sy(t.y)} y2={sy(t.y)} stroke={C.line} strokeWidth={1.5} />
                <text x={PLOT.x1 + 14} y={sy(t.y) + 8} fill={C.ink3} textAnchor="start" style={{ fontFamily: VAZIR, fontSize: 22 }}>
                  {t.label}
                </text>
              </g>
            ))}
            {p.xTicks.map((t, i) => (
              <text key={i} x={sx(t.x)} y={PLOT.y1 + 40} fill={C.ink3} textAnchor="middle" opacity={fade(frame, aDraw + 8 + i * 2, 10)} style={{ fontFamily: VAZIR, fontSize: 22 }}>
                {t.label}
              </text>
            ))}
            {current ? <line x1={sx(current.q.x)} x2={sx(current.q.x)} y1={PLOT.y0} y2={PLOT.y1} stroke={C.accLine} strokeWidth={2} strokeDasharray="6 8" /> : null}
            <path d={area} fill="url(#dollar-area)" />
            <path d={line} fill="none" stroke={C.acc} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
            {shown.map((q, i) => {
              const r = q.event ? 11 : 7;
              const s = pop(frame, reachedAt(q), 18);
              return <circle key={i} cx={sx(q.x)} cy={sy(q.y)} r={r * s} fill={q.event ? C.acc : C.bg} stroke={C.acc} strokeWidth={q.approx ? 2 : 3.5} strokeDasharray={q.approx ? "3 4" : undefined} />;
            })}
            {/* the head of the line */}
            {next ? <circle cx={sx(tip.x)} cy={sy(tip.y)} r={9 + 3 * Math.sin(frame / 4)} fill={C.acc} /> : null}
          </svg>

          {/* the event the line has just passed */}
          {current?.q.event ? (
            <div
              key={current.i}
              style={{
                position: "absolute",
                top: 1200,
                right: SIDE_RAIL + 20,
                left: SIDE,
                padding: "26px 34px",
                borderRadius: 26,
                background: C.panel,
                border: `1.5px solid ${C.accLine}`,
                opacity: Math.min(fade(frame, reachedAt(current.q), 10), leave(frame, aResult + 8, 10)),
                transform: `translateY(${rise(frame, reachedAt(current.q), 28, 14)}px)`,
              }}
            >
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 40, lineHeight: 1.4, color: C.ink }}>{current.q.event}</div>
              <div style={{ marginTop: 10, fontFamily: VAZIR, fontSize: 30, color: C.ink2 }}>
                {`${current.q.dateText} · ${current.q.approx ? "حدود " : ""}${current.q.value} ${p.unit}`}
              </div>
            </div>
          ) : null}

          {/* the last reading, once the line has arrived */}
          <div style={{ position: "absolute", top: sy(last.y) - 120, left: sx(last.x) - 20, opacity: fade(frame, reachedAt(last) + 4, 12), fontFamily: VAZIR, direction: "rtl", textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: 46, color: C.acc }}>{`${last.value} ${p.unit}`}</div>
            <div style={{ fontSize: 26, color: C.ink2 }}>{last.dateText}</div>
          </div>
        </div>
      ) : null}

      {/* ---- 3 · how many times dearer ---- */}
      {frame >= aResult - 2 && frame < aSource + 20 ? (
        <div style={{ position: "absolute", top: 1200, right: SIDE_RAIL + 20, left: SIDE, textAlign: "center", opacity: Math.min(fade(frame, aResult + 6, 12), leave(frame, aSource + 12, 12)) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 120, lineHeight: 1.1, color: C.acc, transform: `scale(${pop(frame, aResult + 6, 26)})` }}>{p.times}</div>
          <div style={{ marginTop: 14, fontFamily: VAZIR, fontSize: 32, lineHeight: 1.6, color: C.ink2 }}>{`از ${p.firstText} تا ${p.lastText}`}</div>
        </div>
      ) : null}

      {/* ---- 4 · the sources ---- */}
      {frame >= aSource - 2 ? (
        <div style={{ position: "absolute", top: 640, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, aSource + 8, 12) }}>
          <Kicker size={34} color={C.ink3}>این عددها از کجاست؟</Kicker>
          <div style={{ marginTop: 22, fontFamily: VAZIR, fontSize: 34, lineHeight: 1.75, color: C.ink2 }}>{p.sources}</div>
          <div style={{ marginTop: 22, fontFamily: VAZIR, fontSize: 28, lineHeight: 1.7, color: C.ink3 }}>نقطه‌های خط‌چین را خود منبع «حدودی» گفته است. نرخ بازار آزاد رسمی نیست؛ هر نقطه همان است که آن روز گزارش شد.</div>
        </div>
      ) : null}
      <Foot opacity={fade(frame, aSource + 24, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
