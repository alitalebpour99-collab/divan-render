// The content system's templates (the owner, 6 November 2026):
//   T1 «لایه به لایه»          a whole seen from above, one layer at a time
//   T2 «نگه دار، برگرد عقب»    today's figure held, then its line rewound to where it began
//   T5 «حدس بزن»               a question, four answers, a count of three, the answer
//   T6 «اون موقع، الان»        one figure then and now, as two columns seen from above
// Each keeps the rules of the owner's sample videos: a real picture already
// moving on the first frame, with the question over it; one idea a beat;
// picture, voice, words and sound in step (the narrator's words as captions,
// kit.tsx; each kind of moment its own sound, the code of video/sfx.mjs); a
// sound on every cut; and an end that asks. The series' colour comes from
// HUES (paint); the camera never moves, and data is seen from straight above.
// Nothing is written here: the content is the site's (lib/social/templates.ts),
// and no template is planned yet.
import React from "react";
import { AbsoluteFill, Audio, Composition, interpolate, staticFile, useCurrentFrame as useFilmFrame } from "remotion";
import { Backdrop, Brand, C, Cue, Kicker, NASKH, Progress, SIDE, SIDE_RAIL, VAZIR, W, Waits, Words, clamped, ease, faDigits, fade, grow, leave, paint, pop, rise, starts, useCurrentFrame } from "./kit";
import { onStage } from "./Safe";
import type { Base, T1Props, T2Props, T5Props, T6Props } from "./props";
import { layVoice, scenes, type Cues } from "./voice";
import t1Sample from "../samples/t1-air.json";
import t2Sample from "../samples/t2-dollar.json";
import t5Sample from "../samples/t5-quiz.json";
import t6Sample from "../samples/t6-thennow.json";

/** The type of the templates: a title 104 px and every text to read 57 px at least (88 and 48 on the finished video). */
const TITLE = 104;
const BODY = 57;
/** The opening scene. A template's content stops above y 1380: the narrator's captions are drawn under it (kit.tsx, Captions). */
const OPEN = 84;
const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const plan = (lengths: number[]) => ({ lengths, at: starts(lengths), total: sum(lengths) });

/** The question on the first frame: readable at once, it only settles, and leaves as the first idea comes. */
const Question: React.FC<{ text: string; until: number }> = ({ text, until }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 214, right: SIDE, left: SIDE, opacity: leave(frame, until, 10), transform: `translateY(${interpolate(frame, [0, 18], [8, 0], { ...clamped, easing: ease })}px)` }}>
      <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: TITLE, lineHeight: 1.3, color: C.ink, textShadow: `0 4px 40px ${C.bg}` }}>{text}</div>
    </div>
  );
};

/** The end: the question back to the viewer, then where every figure comes from and when, above the captions' band. */
const End: React.FC<{ p: { ask: string; source: string; foot: string }; t: number }> = ({ p, t }) => (
  <div style={{ position: "absolute", top: 860, right: SIDE_RAIL, left: SIDE, opacity: fade(t, 0, 10) }}>
    <Words text={p.ask} from={2} step={3} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 80, lineHeight: 1.35, color: C.ink }} />
    <div style={{ marginTop: 26, fontFamily: VAZIR, fontSize: BODY - 9, lineHeight: 1.45, color: C.ink2, opacity: fade(t, 20, 10) }}>{`منبع: ${p.source}`}</div>
    <div style={{ marginTop: 14, fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: C.acc, direction: "ltr", textAlign: "right", opacity: fade(t, 28, 10) }}>divan.ahura.cloud</div>
  </div>
);

/** A template's frame: the night ground in its series' colour, the page's name, where the viewer is, and the clock that waits for the narrator. */
function framed<P extends Base & { of: string }>(Body: React.FC<P>, length: (p: P) => { at: number[]; total: number }): React.FC<P> {
  const Framed: React.FC<P> = (p) => {
    paint(p.of);
    const { at, total } = length(p);
    return (
      <Waits holds={p.holds}>
        <AbsoluteFill style={{ direction: "rtl" }}>
          {p.music ? <Audio src={staticFile(p.music)} /> : null}
          <Backdrop total={total} glowY={36} />
          <Brand tag={p.series} />
          <Progress total={total} marks={at.slice(1)} />
          <Body {...p} />
        </AbsoluteFill>
      </Waits>
    );
  };
  return Framed;
}

// ---------- T1 «لایه به لایه» ----------
const T1_LAYER = 96;
const T1_ALL = 96;
const T1_END = 120;
const t1Plan = (p: T1Props) => plan([OPEN, ...p.layers.map(() => T1_LAYER), T1_ALL, T1_END]);
export const t1Duration = (p: T1Props) => t1Plan(p).total;
/** The narrator's moments: the question, each layer as it lights («l1» from the outside in), all of them together, and the close. */
export const t1Cues = (p: T1Props): Cues => {
  const { at } = t1Plan(p);
  return { ...scenes(at), ...Object.fromEntries(p.layers.map((_, i) => [`l${i + 1}`, at[1 + i]])), total: at[1 + p.layers.length] };
};

const T1Body: React.FC<T1Props> = (p) => {
  const frame = useCurrentFrame();
  // the sweep turns on the film's own clock: while the picture waits for the narrator it is still alive, and the camera stays where it is
  const film = useFilmFrame();
  const { at } = t1Plan(p);
  const n = p.layers.length;
  const allAt = at[1 + n];
  const endAt = at[2 + n];
  const now = at.findIndex((a, i) => frame >= a && frame < (at[i + 1] ?? Infinity)) - 1;
  const CX = W / 2;
  const CY = 700;
  const radius = (i: number) => 300 - (i * 170) / Math.max(1, n - 1);
  const sweep = (film * 2.2) % 360;
  return (
    <AbsoluteFill>
      <Cue on="move" at={0} />
      {/* the layers from straight above, the outermost first: they draw themselves from the first frame */}
      <svg width={W} height={1400} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - fade(frame, endAt, 12) * 0.75 }}>
        <defs>
          <radialGradient id="t1glow">
            <stop offset="0%" stopColor={C.acc} stopOpacity={0.22} />
            <stop offset="100%" stopColor={C.acc} stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={340} fill="url(#t1glow)" />
        <g transform={`rotate(${sweep} ${CX} ${CY})`} opacity={0.5}>
          <path d={`M ${CX} ${CY} L ${CX} ${CY - 330} A 330 330 0 0 1 ${CX + 330 * Math.sin(Math.PI / 7)} ${CY - 330 * Math.cos(Math.PI / 7)} Z`} fill={C.accSoft} />
        </g>
        {p.layers.map((l, i) => {
          const r = radius(i);
          const lit = frame >= allAt || i === now;
          const seen = frame >= at[1 + i];
          return (
            <g key={l.name}>
              <circle cx={CX} cy={CY} r={r} fill="none" stroke={lit ? C.acc : seen ? C.accLine : C.line2} strokeWidth={lit ? 14 : 4} pathLength={100} strokeDasharray={`${100 * grow(frame, i * 6 - 26, 40)} 100`} transform={`rotate(-90 ${CX} ${CY})`} style={{ filter: lit ? `drop-shadow(0 0 18px ${C.accLine})` : undefined }} />
              {/* where this layer's systems stand: one dot each, around its ring */}
              {l.items.map((_, k) => {
                const a = ((k + 0.5) / l.items.length) * Math.PI * 2 + i * 0.4;
                const on = fade(frame, at[1 + i] + 30 + k * 3, 6);
                return <circle key={k} cx={CX + r * Math.sin(a)} cy={CY - r * Math.cos(a)} r={lit ? 11 : 7} fill={C.acc} opacity={Math.max(on, frame >= allAt ? 1 : 0, frame < at[1] ? 0.6 : 0) * (lit ? 1 : 0.55)} />;
              })}
            </g>
          );
        })}
        {/* all together: the whole count in the middle */}
        <text x={CX} y={CY + 30} textAnchor="middle" fill={C.ink} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 88, opacity: fade(frame, allAt + 30, 8) }} transform={`translate(${CX} ${CY}) scale(${pop(frame, allAt + 30, 22)}) translate(${-CX} ${-CY})`}>
          {p.totalText}
        </text>
      </svg>
      {frame < at[1] ? <Question text={p.question} until={at[1]} /> : null}
      {frame >= at[1] ? (
        <div style={{ position: "absolute", top: 206, right: SIDE, left: SIDE, opacity: fade(frame, at[1], 10) }}>
          <Kicker size={BODY}>{p.kicker}</Kicker>
        </div>
      ) : null}

      {p.layers.map((l, i) => {
        const a = at[1 + i];
        const t = frame - a;
        const count = Math.round(l.count * grow(frame, a + 14, 20));
        return (
          <React.Fragment key={l.name}>
            <Cue on="move" at={a} />
            <Cue on="label" at={a + 8} />
            {Array.from({ length: l.count }, (_, k) => (
              <Cue key={k} on="count" at={a + 14 + Math.round((k * 20) / l.count)} />
            ))}
            {t >= 0 && frame < a + T1_LAYER ? (
              <div style={{ position: "absolute", top: 1060, right: SIDE_RAIL, left: SIDE, opacity: fade(t, 4, 8) * leave(t, T1_LAYER, 8) }}>
                <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: BODY + 12, color: C.acc, transform: `scale(${pop(t, 8, 18)})`, transformOrigin: "right center" }}>{`${l.name}: ${faDigits(count)} سامانه`}</div>
                <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, lineHeight: 1.4, color: C.ink }}>
                  {l.items.map((name, k) => (
                    <span key={name} style={{ display: "inline-block", marginLeft: 22, opacity: fade(t, 30 + k * 3, 6), transform: `translateY(${rise(t, 30 + k * 3, 14, 10)}px)` }}>
                      {name}
                      {k < l.items.length - 1 ? "،" : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      <Cue on="move" at={allAt} />
      <Cue on="preReveal" at={allAt + 4} />
      <Cue on="reveal" at={allAt + 30} />
      {frame >= allAt && frame < endAt ? (
        <div style={{ position: "absolute", top: 1060, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, allAt + 30, 10) * leave(frame, endAt, 8) }}>
          <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 80, lineHeight: 1.35, color: C.ink }}>{p.layers.map((l) => l.name).join("، ")}</div>
        </div>
      ) : null}
      <Cue on="move" at={endAt} />
      {frame >= endAt ? <End p={p} t={frame - endAt} /> : null}
    </AbsoluteFill>
  );
};
export const T1 = framed(T1Body, t1Plan);

// ---------- T2 «نگه دار، برگرد عقب» ----------
const T2_HOLD = 84;
const T2_REWIND = 150;
const T2_FIRST = 100;
const T2_END = 120;
const t2Plan = () => plan([OPEN, T2_HOLD, T2_REWIND, T2_FIRST, T2_END]);
export const t2Duration = () => t2Plan().total;
/** The narrator's moments: the question, today's figure held, the rewind, where it began, how far it came, and the close. */
export const t2Cues = (): Cues => {
  const { at } = t2Plan();
  return { ...scenes(at), hold: at[1], rewind: at[2], first: at[3], times: at[3] + 40 };
};
/** The plot, seen flat: x from the first reading to today, y from the top. */
const PLOT = { left: 120, right: 990, top: 470, bottom: 960 };
const px = (x: number) => PLOT.left + ((PLOT.right - PLOT.left) * x) / 100;
const py = (y: number) => PLOT.top + ((PLOT.bottom - PLOT.top) * y) / 100;

/** The two bars of «hold» and the two triangles of «rewind», drawn, not written. */
const Glyph: React.FC<{ kind: "hold" | "rewind"; size: number }> = ({ kind, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    {kind === "hold" ? (
      <>
        <rect x="5" y="4" width="5" height="16" rx="1.5" fill={C.acc} />
        <rect x="14" y="4" width="5" height="16" rx="1.5" fill={C.acc} />
      </>
    ) : (
      <>
        <path d="M12 5 L3 12 L12 19 Z" fill={C.acc} />
        <path d="M21 5 L12 12 L21 19 Z" fill={C.acc} />
      </>
    )}
  </svg>
);

const T2Body: React.FC<T2Props> = (p) => {
  const frame = useCurrentFrame();
  const film = useFilmFrame();
  const { at } = t2Plan();
  const [, holdAt, rewindAt, firstAt, endAt] = at;
  const pts = p.points;
  const last = pts.length - 1;
  // the playhead: drawn to today on the first frames, held there, then run back to the first reading
  const back = interpolate(frame, [rewindAt + 10, firstAt - 14], [last, 0], { ...clamped, easing: ease });
  const head = frame < rewindAt ? last * grow(frame, 0, 36) : back;
  const i0 = Math.floor(head);
  const k = head - i0;
  const a = pts[Math.max(0, Math.min(last, i0))];
  const b = pts[Math.max(0, Math.min(last, i0 + 1))];
  const hx = px(a.x + (b.x - a.x) * k);
  const hy = py(a.y + (b.y - a.y) * k);
  const near = pts[Math.max(0, Math.min(last, Math.round(head)))];
  const drawn = (i: number) => i <= head + 0.001;
  const pulse = 0.6 + 0.4 * Math.sin(film / 6);
  const path = pts.map((q, i) => `${i ? "L" : "M"} ${px(q.x).toFixed(1)} ${py(q.y).toFixed(1)}`).join(" ");
  return (
    <AbsoluteFill>
      <Cue on="move" at={0} />
      <svg width={W} height={1400} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - fade(frame, endAt, 12) * 0.7 }}>
        <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke={C.line2} strokeWidth={2} />
        {/* the whole line, faint; the part up to the playhead, bright */}
        <path d={path} fill="none" stroke={C.line2} strokeWidth={5} strokeLinejoin="round" />
        <path d={pts.filter((_, i) => drawn(i)).map((q, i) => `${i ? "L" : "M"} ${px(q.x).toFixed(1)} ${py(q.y).toFixed(1)}`).join(" ") + ` L ${hx.toFixed(1)} ${hy.toFixed(1)}`} fill="none" stroke={C.acc} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((q, i) =>
          q.event ? <circle key={i} cx={px(q.x)} cy={py(q.y)} r={drawn(i) ? 12 : 8} fill={drawn(i) ? C.acc : C.line2} /> : null,
        )}
        <line x1={hx} y1={PLOT.top - 30} x2={hx} y2={PLOT.bottom} stroke={C.acc} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="8 10" />
        <circle cx={hx} cy={hy} r={18 + 8 * pulse} fill={C.accSoft} />
        <circle cx={hx} cy={hy} r={13} fill={C.acc} />
      </svg>
      {frame < holdAt ? <Question text={p.question} until={holdAt} /> : null}
      {frame >= holdAt ? (
        <div style={{ position: "absolute", top: 206, right: SIDE, left: SIDE, display: "flex", alignItems: "center", gap: 18, opacity: fade(frame, holdAt, 10) }}>
          <Glyph kind={frame >= rewindAt ? "rewind" : "hold"} size={56} />
          <Kicker size={BODY}>{frame >= rewindAt ? "برگرد عقب" : "نگه دار"}</Kicker>
        </div>
      ) : null}

      {/* held: today's figure */}
      <Cue on="move" at={holdAt} />
      <Cue on="reveal" at={holdAt + 6} />
      <Cue on="label" at={holdAt + 20} />
      {frame >= holdAt && frame < rewindAt ? (
        <div style={{ position: "absolute", top: 1010, right: SIDE_RAIL, left: SIDE, opacity: leave(frame, rewindAt, 8) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 120, lineHeight: 1.05, color: C.ink, transform: `scale(${pop(frame, holdAt + 6, 22)})`, transformOrigin: "right center" }}>{p.today.text}</div>
          <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, color: C.acc, opacity: fade(frame, holdAt + 20, 8) }}>{`امروز، ${p.today.date}`}</div>
        </div>
      ) : null}

      {/* rewound: each reading the playhead passes ticks, each day with an event lands as a label */}
      <Cue on="move" at={rewindAt} />
      {pts.map((q, i) => {
        // when the playhead passes this point on its way back
        const when = Math.round(interpolate(i, [0, last], [firstAt - 14, rewindAt + 10]));
        return i < last ? <Cue key={i} on={q.event ? "label" : "count"} at={when} /> : null;
      })}
      {frame >= rewindAt && frame < firstAt ? (
        <div style={{ position: "absolute", top: 1010, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, rewindAt + 6, 8) * leave(frame, firstAt, 8) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 96, lineHeight: 1.05, color: C.ink, direction: "rtl" }}>{`${near.approx ? "حدود " : ""}${near.value} ${p.unit}`}</div>
          <div style={{ marginTop: 8, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, color: C.ink2 }}>{near.dateText}</div>
          {near.event ? <div style={{ marginTop: 6, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, color: C.acc }}>{near.event}</div> : null}
        </div>
      ) : null}

      {/* where it began, and how far it came */}
      <Cue on="move" at={firstAt} />
      <Cue on="preReveal" at={firstAt + 14} />
      <Cue on="reveal" at={firstAt + 40} />
      {frame >= firstAt && frame < endAt ? (
        <div style={{ position: "absolute", top: 1010, right: SIDE_RAIL, left: SIDE, opacity: leave(frame, endAt, 8) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, color: C.ink2 }}>{[p.first.date, p.first.event].filter(Boolean).join("، ")}</div>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 84, color: C.ink }}>{p.first.text}</div>
          <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 800, fontSize: TITLE, color: C.acc, opacity: fade(frame, firstAt + 40, 6), transform: `scale(${pop(frame, firstAt + 40, 24)})`, transformOrigin: "right center" }}>{p.times}</div>
        </div>
      ) : null}
      <Cue on="move" at={endAt} />
      {frame >= endAt ? <End p={p} t={frame - endAt} /> : null}
    </AbsoluteFill>
  );
};
export const T2 = framed(T2Body, t2Plan);

// ---------- T5 «حدس بزن» ----------
const T5_COUNT = 90;
const T5_REVEAL = 90;
const T5_RANK = 120;
const T5_END = 100;
const t5Plan = () => plan([OPEN, T5_COUNT, T5_REVEAL, T5_RANK, T5_END]);
export const t5Duration = () => t5Plan().total;
/** The narrator's moments: the question, the count, the answer, the whole ranking, and the close. */
export const t5Cues = (): Cues => {
  const { at } = t5Plan();
  return { ...scenes(at), count: at[1], reveal: at[2], rank: at[3] };
};

const T5Body: React.FC<T5Props> = (p) => {
  const frame = useCurrentFrame();
  const { at } = t5Plan();
  const [, countAt, revealAt, rankAt, endAt] = at;
  const answered = frame >= revealAt;
  return (
    <AbsoluteFill>
      <Cue on="move" at={0} />
      {frame < rankAt ? (
        <>
          <div style={{ position: "absolute", top: 214, right: SIDE, left: SIDE }}>
            <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: p.question.length > 44 ? 88 : TITLE, lineHeight: 1.3, color: C.ink }}>{p.question}</div>
          </div>
          {/* the four answers, from straight above as four tiles; they arrive from the first frame */}
          <div style={{ position: "absolute", top: 620, right: SIDE, left: SIDE, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, opacity: leave(frame, rankAt, 10) }}>
            {p.options.map((o, i) => {
              const right = i === p.answer;
              return (
                <div key={o} style={{ height: 170, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px", textAlign: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: BODY, color: answered && right ? C.onAcc : C.ink, background: answered && right ? C.acc : C.panel, border: `2px solid ${answered && right ? C.acc : C.line2}`, opacity: fade(frame, i * 5, 8) * (answered && !right ? 0.35 : 1), transform: `translateY(${rise(frame, i * 5, 40, 14)}px) scale(${answered && right ? pop(frame, revealAt, 20) || 1 : 1})` }}>
                  {o}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
      {p.options.map((_, i) => (
        <Cue key={i} on="label" at={i * 5 + 4} />
      ))}
      {/* three, two, one */}
      <Cue on="move" at={countAt} />
      {[0, 1, 2].map((s) => (
        <Cue key={s} on="count" at={countAt + s * 26} />
      ))}
      <Cue on="preReveal" at={countAt + 60} />
      {frame >= countAt && frame < revealAt ? (
        <div style={{ position: "absolute", top: 1030, left: 0, right: 0, textAlign: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 220, color: C.acc }}>
          {faDigits(3 - Math.min(2, Math.floor((frame - countAt) / 26)))}
        </div>
      ) : null}
      <Cue on="reveal" at={revealAt} />
      {frame >= revealAt && frame < rankAt ? (
        <div style={{ position: "absolute", top: 1040, right: SIDE_RAIL, left: SIDE, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, lineHeight: 1.45, color: C.ink, opacity: fade(frame, revealAt + 8, 10) * leave(frame, rankAt, 8) }}>{p.reveal}</div>
      ) : null}
      {/* the whole ranking, its bars from straight above */}
      <Cue on="move" at={rankAt} />
      {frame >= rankAt && frame < endAt ? (
        <div style={{ position: "absolute", top: 300, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", gap: 14, opacity: leave(frame, endAt, 8) }}>
          {p.rows.slice(0, 9).map((r, i) => (
            <React.Fragment key={r.name}>
              <Cue on={r.home ? "label" : "count"} at={rankAt + 8 + i * 4} />
              <div style={{ display: "flex", alignItems: "center", gap: 18, direction: "rtl", opacity: fade(frame, rankAt + 8 + i * 4, 8) }}>
                <span style={{ width: 230, flex: "none", fontFamily: VAZIR, fontWeight: 700, fontSize: BODY - 9, color: r.home ? C.acc : C.ink, whiteSpace: "nowrap" }}>{r.name}</span>
                <div style={{ height: 38, borderRadius: 19, width: Math.max(12, 380 * r.share * grow(frame, rankAt + 8 + i * 4, 24)), background: r.home ? C.acc : C.line2 }} />
                <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: BODY - 9, color: C.ink2, whiteSpace: "nowrap" }}>{r.text}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      ) : null}
      <Cue on="move" at={endAt} />
      {frame >= endAt ? <End p={p} t={frame - endAt} /> : null}
    </AbsoluteFill>
  );
};
export const T5 = framed(T5Body, t5Plan);

// ---------- T6 «اون موقع، الان» ----------
const T6_COL = 90;
const T6_CHANGE = 90;
const T6_END = 120;
const t6Plan = () => plan([OPEN, T6_COL, T6_COL, T6_CHANGE, T6_END]);
export const t6Duration = () => t6Plan().total;
/** The narrator's moments: the question, then, now, how far it moved, and the close. */
export const t6Cues = (): Cues => {
  const { at } = t6Plan();
  return { ...scenes(at), then: at[1], now: at[2], change: at[3] };
};

const T6Body: React.FC<T6Props> = (p) => {
  const frame = useCurrentFrame();
  const { at } = t6Plan();
  const [, thenAt, nowAt, changeAt, endAt] = at;
  const most = Math.max(Math.abs(p.then.value), Math.abs(p.now.value)) || 1;
  const COL = 520;
  const BASE = 1000;
  const col = (v: number, from: number) => Math.max(14, (COL * Math.abs(v)) / most) * grow(frame, from, 30);
  // the whole line, seen flat, drawn from the first frame
  const lo = Math.min(...p.line);
  const hi = Math.max(...p.line);
  const linePath = p.line.map((v, i) => `${i ? "L" : "M"} ${(140 + (800 * i) / Math.max(1, p.line.length - 1)).toFixed(1)} ${(BASE - 40 - ((v - lo) / (hi - lo || 1)) * 420).toFixed(1)}`).join(" ");
  const columns = [
    { key: "then", x: 650, at: thenAt, v: p.then, color: C.ink3 },
    { key: "now", x: 250, at: nowAt, v: p.now, color: C.acc },
  ];
  return (
    <AbsoluteFill>
      <Cue on="move" at={0} />
      <svg width={W} height={1400} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={linePath} fill="none" stroke={C.acc} strokeOpacity={frame < thenAt ? 1 : 0.25} strokeWidth={7} strokeLinejoin="round" pathLength={100} strokeDasharray={`${100 * grow(frame, 0, 60)} 100`} />
        <line x1={120} y1={BASE} x2={960} y2={BASE} stroke={C.line2} strokeWidth={2} />
        {columns.map((c) => (frame >= c.at ? <rect key={c.key} x={c.x} y={BASE - col(c.v.value, c.at)} width={180} height={col(c.v.value, c.at)} rx={18} fill={c.color} /> : null))}
      </svg>
      {frame < thenAt ? <Question text={p.question} until={thenAt} /> : null}
      {frame >= thenAt ? (
        <div style={{ position: "absolute", top: 206, right: SIDE, left: SIDE, opacity: fade(frame, thenAt, 10) }}>
          <Kicker size={BODY}>{p.kicker}</Kicker>
          <div style={{ marginTop: 6, fontFamily: NASKH, fontWeight: 700, fontSize: 80, color: C.ink }}>{p.label}</div>
        </div>
      ) : null}
      {columns.map((c) => (
        <React.Fragment key={c.key}>
          <Cue on="move" at={c.at} />
          {[0, 1, 2, 3, 4].map((s) => (
            <Cue key={s} on="count" at={c.at + 4 + s * 6} />
          ))}
          <Cue on="label" at={c.at + 34} />
          {frame >= c.at ? (
            <div style={{ position: "absolute", left: c.x - 80, width: 340, top: BASE + 16, textAlign: "center", opacity: fade(frame, c.at + 30, 8) }}>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 62, color: C.ink, whiteSpace: "nowrap" }}>{c.v.text}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: BODY, color: c.key === "now" ? C.acc : C.ink2 }}>{`سال ${c.v.year}`}</div>
            </div>
          ) : null}
        </React.Fragment>
      ))}
      <Cue on="move" at={changeAt} />
      <Cue on="preReveal" at={changeAt + 4} />
      <Cue on="reveal" at={changeAt + 34} />
      {frame >= changeAt && frame < endAt ? (
        <div style={{ position: "absolute", top: 420, left: 0, right: 0, textAlign: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 150, color: C.acc, textShadow: `0 0 40px ${C.bg}`, opacity: fade(frame, changeAt + 34, 6) * leave(frame, endAt, 8), transform: `scale(${pop(frame, changeAt + 34, 24)})` }}>
          {p.change}
        </div>
      ) : null}
      <Cue on="move" at={endAt} />
      {frame >= endAt ? (
        <>
          <div style={{ position: "absolute", top: 360, right: SIDE_RAIL, left: SIDE, fontFamily: VAZIR, fontSize: BODY, lineHeight: 1.45, color: C.ink, opacity: fade(frame, endAt + 4, 10) }}>{p.explain}</div>
          <End p={p} t={frame - endAt} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
export const T6 = framed(T6Body, t6Plan);

// ---------- the compositions ----------
const frameOf = { width: 1080, height: 1920, fps: 30 };
/** A template's length with its narrator (voice.ts): it has no hook of its own, its question is its first scene. */
const timed =
  <P extends Base>(body: (p: P) => number, cues: (p: P) => Cues) =>
  ({ props }: { props: P }) => {
    const lay = layVoice(props.voiceIn, cues(props), body(props), false, 0, 0);
    return { durationInFrames: lay.total, props: { ...props, voice: lay.voice, holds: lay.holds } as P };
  };
const as = <T,>(sample: unknown) => ({ ...(sample as object), hook: null }) as T;
// the narrator's words as captions, and the safe stage, as every Reel is drawn
const S1 = onStage(T1, { captions: true });
const S2 = onStage(T2, { captions: true });
const S5 = onStage(T5, { captions: true });
const S6 = onStage(T6, { captions: true });

/** The templates in the studio and for the renderer: t1, t2, t5, t6. */
export const Templates: React.FC = () => (
  <>
    <Composition id="t1" component={S1} {...frameOf} durationInFrames={t1Duration(as<T1Props>(t1Sample))} defaultProps={as<T1Props>(t1Sample)} calculateMetadata={timed<T1Props>(t1Duration, t1Cues)} />
    <Composition id="t2" component={S2} {...frameOf} durationInFrames={t2Duration()} defaultProps={as<T2Props>(t2Sample)} calculateMetadata={timed<T2Props>(t2Duration, t2Cues)} />
    <Composition id="t5" component={S5} {...frameOf} durationInFrames={t5Duration()} defaultProps={as<T5Props>(t5Sample)} calculateMetadata={timed<T5Props>(t5Duration, t5Cues)} />
    <Composition id="t6" component={S6} {...frameOf} durationInFrames={t6Duration()} defaultProps={as<T6Props>(t6Sample)} calculateMetadata={timed<T6Props>(t6Duration, t6Cues)} />
  </>
);
