// «حدس بزن»: a question on a ranking of the site, readable from the first
// frame, with four answers and a count of three, while the viewer guesses (and
// writes the guess in the comments); then the right answer lights up and the
// others fade, and the whole ranking runs in, Iran in the series' colour; then
// the source. A quiz keeps viewers to the answer and asks them to write: the two
// things Instagram weighs for a page that is new. Every word and figure comes
// from the props the site sends.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { Backdrop, Brand, C, FPS, Foot, Kicker, NASKH, Net, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, VAZIR, W, clamped, ease, fade, faNum, grow, leave, paint, pop, readFrames, rise, starts, useCurrentFrame } from "./kit";
import type { QuizProps } from "./props";
import { scenes, type Cues } from "./voice";

// the question stands alone, then three seconds of count, then the answer
const ASK = 45;
const COUNT = 3 * FPS;
const REVEAL = 54;
const RANKING = 180;

function plan(p: QuizProps) {
  const source = Math.min(180, Math.max(120, Math.round(readFrames(p.source) * 0.8)));
  const lengths = [ASK + COUNT, REVEAL, RANKING, source];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const quizDuration = (p: QuizProps) => plan(p).total;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
export const quizCues = (p: QuizProps): Cues => ({ ...scenes(plan(p).at), reveal: plan(p).at[1], ranking: plan(p).at[2] });

const OPTIONS_TOP = 780;
const CHIP_H = 176;
const GAP = 30;

export const Quiz: React.FC<QuizProps> = (p) => {
  paint("quiz");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const [, aReveal, aRank, aSource] = at;
  // the count: 3, 2, 1, each a second
  const counting = frame >= ASK && frame < aReveal;
  const left = Math.min(3, Math.max(1, 3 - Math.floor((frame - ASK) / FPS)));
  const inSecond = ((frame - ASK) % FPS) / FPS;
  const revealed = frame >= aReveal;
  const questionUp = interpolate(frame, [aRank - 6, aRank + 14], [0, 1], { ...clamped, easing: ease });
  const size = p.question.length > 60 ? 70 : p.question.length > 42 ? 80 : 92;

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={44} />
      <Net total={total} opacity={0.22} count={16} top={420} bottom={1500} />
      <Brand tag={p.series} />
      <Progress total={total} marks={[aReveal, aRank, aSource]} />

      {/* the question: there from the first frame */}
      <div style={{ position: "absolute", top: interpolate(questionUp, [0, 1], [300, 230]), right: SIDE, left: SIDE }}>
        <Kicker size={38}>{p.kicker}</Kicker>
        <div style={{ marginTop: 14, fontFamily: NASKH, fontWeight: 700, fontSize: interpolate(questionUp, [0, 1], [size, 54]), lineHeight: 1.45, color: C.ink, textWrap: "balance" } as React.CSSProperties}>{p.question}</div>
      </div>

      {/* four answers, two by two */}
      {frame < aRank + 16 ? (
        <div style={{ position: "absolute", top: OPTIONS_TOP, right: SIDE, left: SIDE, display: "grid", gridTemplateColumns: "1fr 1fr", gap: GAP, opacity: leave(frame, aRank + 14, 14) }}>
          {p.options.map((o, i) => {
            const right = i === p.answer;
            const lit = revealed && right ? pop(frame, aReveal, 22) : 1;
            const dim = revealed && !right ? interpolate(frame, [aReveal, aReveal + 12], [1, 0.28], clamped) : 1;
            return (
              <div
                key={i}
                style={{
                  height: CHIP_H,
                  borderRadius: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 18,
                  padding: "0 24px",
                  background: revealed && right ? C.acc : C.panel,
                  border: `2.5px solid ${revealed && right ? C.acc : C.line2}`,
                  color: revealed && right ? C.onAcc : C.ink,
                  fontFamily: VAZIR,
                  fontWeight: 800,
                  fontSize: o.length > 12 ? 44 : 56,
                  opacity: Math.min(fade(frame, 4 + i * 3, 8), dim),
                  transform: `scale(${(revealed && right ? lit : pop(frame, 4 + i * 3, 16)).toFixed(3)})`,
                  boxShadow: revealed && right ? `0 0 60px ${C.glow}` : "0 12px 30px rgba(0,0,0,.35)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 30, opacity: 0.7 }}>{["الف", "ب", "ج", "د"][i]}</span>
                {o}
                {revealed && right ? <span style={{ fontSize: 46 }}>✓</span> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* the count, and the call to guess in the comments */}
      {frame < aReveal + 10 ? (
        <div style={{ position: "absolute", top: OPTIONS_TOP + 2 * CHIP_H + GAP + 70, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, opacity: Math.min(fade(frame, ASK - 10, 10), leave(frame, aReveal + 8, 10)) }}>
          <svg width="190" height="190" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="80" fill="none" stroke={C.line2} strokeWidth="12" />
            <circle cx="95" cy="95" r="80" fill="none" stroke={C.acc} strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray={`${counting ? (1 - inSecond) * 100 : 0} 100`} transform="rotate(-90 95 95)" />
            <text x="95" y="122" textAnchor="middle" fill={C.ink} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 84 }}>
              {faNum(left)}
            </text>
          </svg>
          <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: C.ink2 }}>جوابت را در کامنت بنویس</div>
        </div>
      ) : null}

      {/* the answer in a sentence */}
      {revealed && frame < aRank + 20 ? (
        <div style={{ position: "absolute", top: OPTIONS_TOP + 2 * CHIP_H + GAP + 90, right: SIDE_RAIL, left: SIDE, textAlign: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 46, lineHeight: 1.5, color: C.acc, opacity: Math.min(fade(frame, aReveal + 8, 12), leave(frame, aRank + 16, 12)), transform: `translateY(${rise(frame, aReveal + 8, 26)}px)` }}>
          {p.reveal}
        </div>
      ) : null}

      {/* the whole ranking */}
      {frame >= aRank - 2 ? (
        <div style={{ position: "absolute", top: 520, right: SIDE_RAIL, left: SIDE, opacity: Math.min(fade(frame, aRank + 6, 12), leave(frame, aSource + 10, 12)) }}>
          {p.rows.slice(0, 9).map((r, i) => {
            const from = aRank + 10 + i * 6;
            const g = grow(frame, from, 30);
            const pitch = Math.min(108, (1920 - SAFE_BOTTOM - 60 - 520) / Math.max(1, Math.min(9, p.rows.length)));
            return (
              <div key={r.name} style={{ position: "relative", height: pitch, opacity: fade(frame, from, 8), transform: `translateX(${-rise(frame, from, 30, 14)}px)` }}>
                {r.home ? <div style={{ position: "absolute", inset: "4px -14px", borderRadius: 20, background: C.accSoft, border: `1.5px solid ${C.accLine}` }} /> : null}
                <div style={{ position: "absolute", top: pitch * 0.12, right: 4, left: 0, display: "flex", alignItems: "baseline", gap: 16, fontFamily: VAZIR }}>
                  <span style={{ width: 36, flex: "none", fontWeight: 800, fontSize: 28, color: r.home ? C.acc : C.ink3 }}>{faNum(i + 1)}</span>
                  <span style={{ flex: 1, fontWeight: r.home ? 800 : 600, fontSize: r.home ? 38 : 33, color: r.home ? C.ink : C.ink2, whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ flex: "none", fontWeight: 800, fontSize: r.home ? 38 : 32, color: r.home ? C.acc : C.ink }}>{r.text}</span>
                </div>
                <div style={{ position: "absolute", bottom: pitch * 0.14, right: 56, height: r.home ? 20 : 14, width: Math.max(6, r.share * (W - SIDE - SIDE_RAIL - 260)) * g, borderRadius: 10, background: r.home ? C.acc : C.ink2, opacity: r.home ? 1 : 0.42 }} />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* the source, and the question back to the viewer */}
      {frame >= aSource - 2 ? (
        <div style={{ position: "absolute", top: 560, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, aSource + 8, 12) }}>
          <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 64, lineHeight: 1.4, color: C.ink, transform: `scale(${pop(frame, aSource + 8, 22)})`, transformOrigin: "right center" }}>درست حدس زدی؟</div>
          <div style={{ marginTop: 18, fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color: C.acc }}>{p.reveal}</div>
          <div style={{ marginTop: 34, fontFamily: VAZIR, fontSize: 30, lineHeight: 1.75, color: C.ink3 }}>{`منبع: ${p.source}`}</div>
        </div>
      ) : null}
      <Foot opacity={fade(frame, aSource + 20, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
