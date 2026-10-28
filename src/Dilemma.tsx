// «دوراهی امروز»: one decision as one Reel. What happened (from sources), the
// roads, what each does to the three goals, and Divan's conclusion (AI analysis,
// and marked as such on every card). Every word comes from the props the site sends.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { AiChip, Backdrop, Brand, C, Foot, GoalCard, NASKH, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, Seal, VAZIR, clamped, during, faDigits, fade, grow, leave, paint, readFrames, rise, starts, useCurrentFrame } from "./kit";
import type { DilemmaProps } from "./props";

const ORDINAL = ["یکم", "دوم", "سوم", "چهارم", "پنجم"];
const STANCE: Record<string, { fa: string; color: string }> = { for: { fa: "موافق", color: C.good }, cond: { fa: "مشروط", color: C.claim }, against: { fa: "مخالف", color: C.strike } };

/** The lengths of the scenes: the question, what happened, each road, the conclusion, the question back to the viewer. */
function plan(p: DilemmaProps) {
  // a Reel that runs much past three quarters of a minute loses its viewers: every scene has a ceiling
  const hook = Math.min(120, Math.max(96, readFrames(p.question, 80)));
  const facts = Math.min(200, Math.max(150, 40 + p.facts.length * 38));
  const each = p.options.map((o) => Math.min(206, Math.max(170, Math.round(readFrames(`${o.line} ${o.gained} ${o.lost}`) * 0.55))));
  const conclude = Math.min(190, Math.max(150, readFrames(p.why) + (p.advisors.length ? 40 : 0)));
  const ask = 126;
  const lengths = [hook, facts, ...each, conclude, ask];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const dilemmaDuration = (p: DilemmaProps) => plan(p).total;

const Pips: React.FC<{ n: number; at: number }> = ({ n, at }) => (
  <div style={{ display: "flex", gap: 10 }}>
    {Array.from({ length: n }, (_, k) => (
      <span key={k} style={{ width: k === at ? 44 : 14, height: 14, borderRadius: 7, background: k === at ? C.acc : C.line2 }} />
    ))}
  </div>
);

export const Dilemma: React.FC<DilemmaProps> = (p) => {
  paint("dilemma");
  const frame = useCurrentFrame();
  const { lengths, at, total } = plan(p);
  const n = p.options.length;
  const HOOK = lengths[0];
  const T_FACTS = at[1];
  const T_OPTIONS = at[2];
  const T_CONCLUDE = at[2 + n];
  const T_ASK = at[3 + n];
  const body: React.CSSProperties = { position: "absolute", right: SIDE, left: SIDE, direction: "rtl" };
  const picked = Math.max(0, Math.min(n - 1, p.pick));
  const tally = (s: string) => p.advisors.filter((a) => a.stance === s).length;
  // a long question or a long road name is set smaller, so it never runs into the block under it
  const questionSize = p.question.length > 54 ? 84 : p.question.length > 40 ? 98 : 112;
  const titleSize = (t: string) => (t.length > 26 ? 72 : t.length > 18 ? 84 : 96);

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={total} glowY={34} />
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />

      {/* 1 · the question */}
      {frame < HOOK + 12 ? (
        <div style={{ ...body, top: 330, opacity: leave(frame, HOOK, 12) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: C.acc, opacity: fade(frame, 2, 10) }}>{p.kicker}</div>
          <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: questionSize, lineHeight: 1.42, color: C.ink, marginTop: 26, opacity: fade(frame, 8, 14), transform: `translateY(${rise(frame, 8, 50, 24)}px)` }}>{p.question}</div>
          {/* one road that opens into as many as the table holds */}
          <svg width="940" height="400" viewBox="0 0 940 400" style={{ marginTop: 40 }}>
            <path d="M470 400V250" fill="none" stroke={C.ink2} strokeWidth="6" strokeLinecap="round" strokeDasharray="150" strokeDashoffset={150 * (1 - grow(frame, 30, 20))} />
            {p.options.map((o, k) => {
              const x = n === 1 ? 470 : 110 + (720 * k) / (n - 1);
              const len = 420;
              return (
                <g key={k}>
                  <path d={`M470 250C470 150 ${x} 190 ${x} 60`} fill="none" stroke={C.acc} strokeWidth="6" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - grow(frame, 46 + k * 7, 26))} />
                  <circle cx={x} cy="44" r={16 * grow(frame, 66 + k * 7, 14)} fill={C.bg} stroke={C.acc} strokeWidth="5" />
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}

      {/* 2 · what happened, from sources */}
      {frame >= T_FACTS - 2 && frame < T_OPTIONS + 12 ? (
        <div style={{ ...body, top: 226, opacity: during(frame, T_FACTS, T_OPTIONS, 12) }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 92, color: C.ink }}>چه شد؟</span>
            <span style={{ fontFamily: VAZIR, fontSize: 28, color: C.ink3 }}>خبر، از منبع</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 30 }}>
            {p.facts.map((row, k) => {
              const from = T_FACTS + 12 + k * 34;
              const long = row.v.length > 30;
              return (
                <div key={k} style={{ padding: "26px 32px", borderRadius: 24, background: C.panel, border: `1.5px solid ${C.line}`, opacity: fade(frame, from, 12), transform: `translateY(${rise(frame, from, 30, 18)}px)` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
                    <span style={{ fontFamily: VAZIR, fontSize: 30, color: C.ink2 }}>{row.k}</span>
                    <span style={{ fontFamily: VAZIR, fontSize: 24, color: C.ink3, direction: "ltr", whiteSpace: "nowrap" }}>{row.s}</span>
                  </div>
                  <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: long ? 38 : 50, lineHeight: 1.5, color: C.ink, marginTop: 4 }}>{row.v}</div>
                </div>
              );
            })}
          </div>
          {p.chips.length ? (
            <div style={{ display: "flex", gap: 16, marginTop: 30, opacity: fade(frame, T_FACTS + 20 + p.facts.length * 34, 12) }}>
              {p.chips.map((chip, k) => (
                <span key={k} style={{ padding: "12px 24px", borderRadius: 30, border: `2px solid ${k === 0 ? C.claim : C.line2}`, fontFamily: VAZIR, fontWeight: k === 0 ? 700 : 500, fontSize: 32, color: k === 0 ? C.ink : C.ink2 }}>
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3 · the roads, one after another */}
      {p.options.map((o, k) => {
        const from = at[2 + k];
        const until = from + lengths[2 + k];
        if (frame < from - 2 || frame >= until + 12) return null;
        return (
          <div key={k} style={{ position: "absolute", inset: 0, opacity: during(frame, from, until, 12) }}>
            <div style={{ ...body, top: 216 }}>
              {/* the roads, what they gain and lose, and the columns are the model's reading: said on every card */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color: C.acc }}>
                    راه {ORDINAL[k]} از {faDigits(n)}
                  </span>
                  <Pips n={n} at={k} />
                </div>
                <AiChip />
              </div>
              <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: titleSize(o.title), lineHeight: 1.4, color: C.ink, marginTop: 10, transform: `translateY(${rise(frame, from, 40, 20)}px)` }}>{o.title}</div>
              <div style={{ fontFamily: VAZIR, fontSize: 38, lineHeight: 1.75, color: C.ink2, marginTop: 8, opacity: fade(frame, from + 8, 12) }}>{o.line}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 30 }}>
                {[
                  { label: "به دست می‌آید", text: o.gained, color: C.acc, at: from + 70 },
                  { label: "از دست می‌رود", text: o.lost, color: C.strike, at: from + 92 },
                ].map((x) => (
                  <div key={x.label} style={{ display: "flex", gap: 20, opacity: fade(frame, x.at, 12), transform: `translateY(${rise(frame, x.at, 24, 16)}px)` }}>
                    <span style={{ width: 8, borderRadius: 4, background: x.color, flex: "none" }} />
                    <div>
                      <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 28, color: x.color }}>{x.label}</div>
                      <div style={{ fontFamily: VAZIR, fontSize: 33, lineHeight: 1.7, color: C.ink }}>{x.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* what this road does to the three goals */}
            <GoalCard goals={o.goals} from={from + 34} style={{ position: "absolute", bottom: SAFE_BOTTOM + 14, right: SIDE_RAIL - 12, left: 34, opacity: fade(frame, from + 24, 14) }} />
          </div>
        );
      })}

      {/* 4 · Divan's conclusion */}
      {frame >= T_CONCLUDE - 2 && frame < T_ASK + 12 ? (
        <div style={{ ...body, top: 232, opacity: during(frame, T_CONCLUDE, T_ASK, 12) }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: C.acc }}>جمع‌بندی دیوان</span>
            <AiChip />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 34, marginTop: 44 }}>
            <div style={{ transform: `scale(${interpolate(frame, [T_CONCLUDE + 10, T_CONCLUDE + 26, T_CONCLUDE + 34], [1.9, 0.93, 1], clamped)}) rotate(${interpolate(frame, [T_CONCLUDE + 10, T_CONCLUDE + 30], [-14, 0], clamped)}deg)`, opacity: fade(frame, T_CONCLUDE + 10, 8) }}>
              <Seal size={230} filled />
            </div>
            <div>
              <div style={{ fontFamily: VAZIR, fontSize: 36, color: C.ink2 }}>راه {ORDINAL[picked]}</div>
              <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: titleSize(p.options[picked].title) + 8, lineHeight: 1.35, color: C.ink }}>{p.options[picked].title}</div>
            </div>
          </div>
          <div style={{ fontFamily: NASKH, fontWeight: 500, fontSize: p.why.length > 110 ? 42 : 50, lineHeight: 1.75, color: C.ink, marginTop: 40, opacity: fade(frame, T_CONCLUDE + 40, 14) }}>{p.why.replace(/[.]$/, "")}.</div>
          {p.advisors.length ? (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 44 }}>
                {p.advisors.map((a, k) => (
                  <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 30, background: C.panel, border: `2px solid ${STANCE[a.stance].color}`, opacity: fade(frame, T_CONCLUDE + 66 + k * 7, 10) }}>
                    <span style={{ fontFamily: VAZIR, fontSize: 28, color: C.ink2 }}>{a.name}</span>
                    <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 28, color: STANCE[a.stance].color }}>{STANCE[a.stance].fa}</span>
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: VAZIR, fontSize: 30, color: C.ink3, marginTop: 26, opacity: fade(frame, T_CONCLUDE + 104, 12) }}>
                {faDigits(tally("for"))} موافق · {faDigits(tally("cond"))} مشروط · {faDigits(tally("against"))} مخالف
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* 5 · the question goes back to the viewer */}
      {frame >= T_ASK - 2 ? (
        <div style={{ ...body, top: 300, opacity: fade(frame, T_ASK, 12) }}>
          <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 120, lineHeight: 1.4, color: C.ink, transform: `translateY(${rise(frame, T_ASK, 44, 22)}px)` }}>
            تو کدام راه را <span style={{ color: C.acc }}>می‌رفتی؟</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 40 }}>
            {p.options.map((o, k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 20, opacity: fade(frame, T_ASK + 16 + k * 8, 10) }}>
                <span style={{ width: 64, height: 64, borderRadius: 32, border: `2.5px solid ${C.acc}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 34, color: C.ink, flex: "none" }}>{faDigits(k + 1)}</span>
                <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: o.title.length > 24 ? 36 : 42, color: C.ink }}>{o.title}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: VAZIR, fontSize: 36, color: C.ink2, marginTop: 40, opacity: fade(frame, T_ASK + 56, 12) }}>شماره‌اش را بنویس.</div>
        </div>
      ) : null}

      <Foot opacity={fade(frame, T_ASK + 64, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
