// «اون موقع، الان»: one of Iran's series from the World Bank, its first year
// against its latest. A short Reel (about 17 seconds) on paper, unlike every
// other series of the page (owner 2026-10-23: the formats look too much alike):
// the question; the first year stamped in red and its figure counting; the
// latest year and its figure; the line of every year between and what changed;
// what the series measures, its source and a line to follow the page. Every
// moment has its sound (public/sfx).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { HUES } from "./hues";
import { NASKH, OnStage, SIDE, Sfx, VAZIR, W, Words, clamped, ease, fade, grow, leave, pop, rise, useCurrentFrame } from "./kit";
import type { ThenNowProps } from "./props";
import { scenes, type Cues } from "./voice";
import { seriesText } from "./values";

/** The paper of this series: its own ground, ink and red, drawn full-bleed by the safe stage too (Safe.tsx). */
export const PAPER = { ground: "#F1E8D8", deep: "#E6D8BF", ink: "#1E1913", ink2: "#544a3f", ink3: "#877b6c", line: "rgba(30,25,19,.14)" };
export const RED = `oklch(0.52 0.16 ${HUES.thennow})`;

// the moments, in frames
const Q = 0;
const THEN = 60;
const NOW = 168;
const LINE = 276;
const END = 396;
export const thenNowDuration = () => END + 135;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
// «۴٫۳ برابر» is said as its badge lands, once the line has drawn
export const thenNowCues = (): Cues => ({ ...scenes([Q, THEN, NOW, LINE, END]), start: Q + 2, then: THEN, now: NOW, change: LINE + 76, explain: END });

/** The paper itself: warm ground, a fine print of lines, a soft edge, full-bleed. */
export const PaperGround: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER.ground }}>
    <AbsoluteFill style={{ background: `radial-gradient(1200px 1000px at 50% 38%, rgba(255,255,255,.55), transparent 70%)` }} />
    <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, ${PAPER.line} 0 1px, transparent 1px 7px)`, opacity: 0.22 }} />
    <AbsoluteFill style={{ background: `radial-gradient(1400px 1600px at 50% 50%, transparent 60%, rgba(90,70,40,.22) 100%)` }} />
  </AbsoluteFill>
);

/** The paper under a scene: on the safe stage the stage paints it full-bleed (Safe.tsx), so here it steps aside. */
const Paper: React.FC = () => (React.useContext(OnStage) ? null : <PaperGround />);

/** A figure as two parts: the number, large, and its unit under it («۹۲٫۴» and «میلیون»). */
const parts = (text: string) => {
  const m = text.match(/^([۰-۹٫٬٪.,−-]+)s*(.*)$/);
  return m ? { num: m[1], unit: m[2] } : { num: text, unit: "" };
};

/** A year in red ink, set down like a stamp. */
const Stamp: React.FC<{ text: string; at: number; tilt: number }> = ({ text, at, tilt }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [at, at + 7, at + 12], [1.6, 0.94, 1], { ...clamped, easing: ease });
  return (
    <div style={{ display: "inline-block", padding: "4px 26px 10px", border: `6px solid ${RED}`, borderRadius: 18, color: RED, fontFamily: VAZIR, fontWeight: 800, fontSize: 112, lineHeight: 1.15, opacity: fade(frame, at, 4), transform: `rotate(${tilt}deg) scale(${s})`, transformOrigin: "50% 50%" }}>
      {text}
    </div>
  );
};

/** One end: «اون موقع» or «الان», the year, the figure counting to its value. */
const End: React.FC<{ label: string; year: string; value: number; text: string; unit: ThenNowProps["unit"]; at: number; top: number; tilt: number; dim: number }> = ({ label, year, value, text, unit, at, top, tilt, dim }) => {
  const frame = useCurrentFrame();
  const k = grow(frame, at + 12, 48);
  const shown = parts(k >= 0.999 ? text : seriesText(unit, value * k));
  const size = shown.num.length > 7 ? 124 : 164;
  return (
    <div style={{ position: "absolute", top, right: SIDE, left: SIDE, height: 400, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 30, direction: "rtl", opacity: fade(frame, at, 8) * dim, transform: `translateY(${rise(frame, at, 40, 14)}px)` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 54, color: PAPER.ink2 }}>{label}</span>
        <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1.05, color: PAPER.ink, whiteSpace: "nowrap", transform: `scale(${interpolate(frame, [at + 60, at + 66, at + 74], [1, 1.08, 1], clamped)})`, transformOrigin: "right center" }}>{shown.num}</span>
        {shown.unit ? <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: shown.unit.length > 14 ? 32 : 40, color: PAPER.ink2 }}>{shown.unit}</span> : null}
      </div>
      <Stamp text={year} at={at + 2} tilt={tilt} />
    </div>
  );
};

export const ThenNow: React.FC<ThenNowProps> = (p) => {
  const frame = useCurrentFrame();
  const total = thenNowDuration();
  // the two ends dim when the line takes over and again for the close
  const dim = interpolate(frame, [LINE, LINE + 16, END, END + 12], [1, 0.6, 0.6, 0], clamped);
  const questionOut = leave(frame, THEN, 12);
  // the line of every year: drawn left to right in time, which on this page runs right to left
  const lo = Math.min(0, ...p.line);
  const hi = Math.max(...p.line);
  const span = hi - lo || 1;
  const CW = W - 2 * SIDE;
  const CH = 240;
  // the badge of what changed sits where the line is low: over the old years when the series rose, over the new when it fell
  const rose = p.to.value >= p.from.value;
  const pts = p.line.map((v, i) => [CW - (i / Math.max(1, p.line.length - 1)) * CW, CH - ((v - lo) / span) * CH] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const drawn = grow(frame, LINE + 8, 64);
  const ticks = Array.from({ length: 9 }, (_, i) => i * 6);

  return (
    <AbsoluteFill style={{ direction: "rtl", color: PAPER.ink }}>
      {p.music ? <Audio src={staticFile(p.music)} volume={0.85} /> : null}
      <Paper />

      {/* the name and the kind of Reel, small, at the top */}
      <div style={{ position: "absolute", top: 60, right: SIDE, left: SIDE, display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl" }}>
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 52, color: PAPER.ink }}>دیوان</span>
        <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: RED }}>{p.kicker}</span>
      </div>
      <div style={{ position: "absolute", top: 150, right: SIDE, left: SIDE, height: 4, background: PAPER.ink, opacity: 0.85 }} />

      {/* the question */}
      <Sfx at={Q} name="hit" />
      {frame < THEN + 14 ? (
        <div style={{ position: "absolute", top: 560, right: SIDE, left: SIDE, opacity: questionOut }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: RED, marginBottom: 22 }}>{p.label}</div>
          <Words text={p.question} from={2} step={2} lift={22} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: p.question.length > 44 ? 84 : 100, lineHeight: 1.45, color: PAPER.ink }} />
        </div>
      ) : null}

      {/* the first year, then the latest */}
      <Sfx at={THEN} name="pop" />
      {ticks.map((t) => (
        <Sfx key={`a${t}`} at={THEN + 14 + t} name="tick" />
      ))}
      {frame >= THEN ? <End label="اون موقع" year={p.from.year} value={p.from.value} text={p.from.text} unit={p.unit} at={THEN} top={230} tilt={-5} dim={dim} /> : null}
      <Sfx at={NOW - 6} name="whoosh" />
      {ticks.map((t) => (
        <Sfx key={`b${t}`} at={NOW + 14 + t} name="tick" />
      ))}
      <Sfx at={NOW + 62} name="hit" />
      {frame >= NOW ? <End label="الان" year={p.to.year} value={p.to.value} text={p.to.text} unit={p.unit} at={NOW} top={700} tilt={4} dim={dim} /> : null}

      {/* the line of every year, and what changed */}
      <Sfx at={LINE + 4} name="rise" />
      <Sfx at={LINE + 76} name="hit" />
      {frame >= LINE ? (
        <div style={{ position: "absolute", top: 1180, right: SIDE, width: CW, height: CH + 120, opacity: fade(frame, LINE, 10) * leave(frame, END + 10, 10) }}>
          <svg width={CW} height={CH + 20} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
            <path d={`${d} L0 ${CH} L${CW} ${CH} Z`} fill={RED} opacity={0.1 * drawn} />
            <path d={d} fill="none" stroke={PAPER.ink} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${drawn} 1`} />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={11 * drawn} fill={RED} />
          </svg>
          <div style={{ position: "absolute", top: CH + 30, right: 0, left: 0, display: "flex", justifyContent: "space-between", fontFamily: VAZIR, fontSize: 30, fontWeight: 700, color: PAPER.ink3 }}>
            <span>{p.from.year}</span>
            <span>{p.to.year}</span>
          </div>
          {/* what changed, set down like a second stamp */}
          <div style={{ position: "absolute", top: -40, ...(rose ? { right: 0 } : { left: 0 }), padding: "10px 30px", borderRadius: 60, background: RED, color: PAPER.ground, fontFamily: VAZIR, fontWeight: 800, fontSize: 62, whiteSpace: "nowrap", transform: `rotate(-4deg) scale(${pop(frame, LINE + 74, 18)})` }}>
            {p.change}
          </div>
        </div>
      ) : null}

      {/* what it measures, where it is from, and the page */}
      <Sfx at={END} name="swish" />
      {frame >= END ? (
        <div style={{ position: "absolute", top: 560, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", gap: 34, opacity: fade(frame, END + 4, 12) }}>
          <Words text={p.explain} from={END + 6} step={2} lift={18} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: p.explain.length > 90 ? 58 : 66, lineHeight: 1.6, color: PAPER.ink }} />
          <div style={{ fontFamily: VAZIR, fontSize: 30, lineHeight: 1.7, color: PAPER.ink2, opacity: fade(frame, END + 40, 12) }}>{`منبع: ${p.source}`}</div>
          <div style={{ marginTop: 30, padding: "26px 32px", borderRadius: 26, border: `3px solid ${PAPER.ink}`, opacity: fade(frame, END + 60, 12), transform: `translateY(${rise(frame, END + 60, 30, 14)}px)` }}>
            <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 50, color: PAPER.ink }}>هر روز یک عدد از ایران</div>
            <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: RED, direction: "ltr", textAlign: "right" }}>@divan.ahura · divan.ahura.cloud</div>
          </div>
        </div>
      ) : null}
      {/* the last frames lead back to the first: the question's red returns */}
      <AbsoluteFill style={{ background: PAPER.ground, opacity: interpolate(frame, [total - 10, total], [0, 1], clamped) }} />
    </AbsoluteFill>
  );
};
