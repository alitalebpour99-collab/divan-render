// «درست یا غلط؟»: three quick rounds about Iran among the nine states of the
// region. A game, so a look of its own (owner 2026-10-23: the formats look too
// much alike): a red ground with slow rays, and a deck of white cards. Each
// round turns the next card face up, a bold black sentence readable from its
// first frame («جمعیت ایران از ترکیه بیشتر است.»); a ring counts three seconds
// with a tick each second while the viewer decides; then a stamp, «درست» in
// green or «غلط» in red, and the two figures with their one year and their
// source. The card flies off and the next comes up. Last comes the score card:
// «چند تا را درست گفتی؟», the score to write in the comments, the three verdicts
// once more and the sources. Whether a sentence is true is the site's to
// compute from the figures (lib/social/formats.ts); every word and figure here
// comes from the props.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame as useFilmFrame } from "remotion";
import { HUES } from "./hues";
import { NASKH, OnStage, SAFE_BOTTOM, SIDE, SIDE_RAIL, Seal, Sfx, VAZIR, clamped, ease, fade, faNum, grow, paint, useCurrentFrame } from "./kit";
import type { TrueFalseProps, TrueFalseRound } from "./props";
import { scenes, type Cues } from "./voice";

const HUE = HUES.truefalse;
/** The colours of the game: the red ground, the white card and its back, the ink, and the two stamps. */
export const TF = {
  top: `oklch(0.60 0.19 ${HUE})`,
  mid: `oklch(0.50 0.185 ${HUE})`,
  low: `oklch(0.37 0.14 ${HUE})`,
  card: "#FFFCF7",
  back: `oklch(0.95 0.025 ${HUE})`,
  ink: "#17110F",
  ink2: "#574D47",
  ink3: "#857A72",
  line: "rgba(23,17,15,.10)",
  red: `oklch(0.53 0.2 ${HUE})`,
  yes: "oklch(0.55 0.15 150)",
  no: "oklch(0.55 0.21 27)",
};

// the moments, in frames: the title, then a card for each round, then the score card
const INTRO = 45;
const ROUND = 145;
/** inside a round: the ring starts, counts three seconds, the stamp lands, the figures come */
const RING = 6;
const RING_LEN = 90;
const STAMP = RING + RING_LEN;
const FIGS = STAMP + 8;
/** a card leaves over the last frames of its round while the next comes up from the deck */
const SWAP = 12;
const END_LEN = 130;

function plan(p: TrueFalseProps) {
  const n = Math.max(1, p.rounds.length);
  const rounds = Array.from({ length: n }, (_, i) => INTRO + i * ROUND);
  const end = INTRO + n * ROUND;
  return { rounds, end, total: end + END_LEN };
}
export const trueFalseDuration = (p: TrueFalseProps) => plan(p).total;
/**
 * The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts): each round's
 * sentence as its card comes up (sN), and its verdict with the two figures as the stamp lands (vN). The verdict's
 * line opens with a breath, so its moment lies a little after the stamp: begun a moment early, its word lands on it.
 */
export const trueFalseCues = (p: TrueFalseProps): Cues => {
  const { rounds, end } = plan(p);
  const out: Cues = { ...scenes([0, ...rounds, end]), start: 2 };
  rounds.forEach((r, i) => {
    out[`s${i + 1}`] = r + 6;
    out[`v${i + 1}`] = r + STAMP + 10;
  });
  return out;
};

/** The red ground with its slow rays, full-bleed; the safe stage paints it under everything (Safe.tsx). */
export const TrueFalseGround: React.FC = () => {
  // the rays turn on the film's own clock: they keep moving while the layout waits for the narrator
  const turn = useFilmFrame() * 0.1;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(172deg, ${TF.top} 0%, ${TF.mid} 48%, ${TF.low} 100%)` }}>
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${turn}deg at 50% 34%, rgba(255,255,255,.075) 0deg 6deg, rgba(255,255,255,0) 8deg 18deg, rgba(255,255,255,.075) 20deg)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(900px 900px at 50% 34%, rgba(255,255,255,.18), transparent 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(1500px 1700px at 50% 45%, transparent 55%, rgba(40,0,8,.4) 100%)" }} />
    </AbsoluteFill>
  );
};
const Ground: React.FC = () => (React.useContext(OnStage) ? null : <TrueFalseGround />);

/** A tick or a cross, drawn: a glyph would depend on the fonts of the machine that renders. */
const Mark: React.FC<{ ok: boolean; size: number; color: string; stroke?: number }> = ({ ok, size, color, stroke = 3.2 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flex: "none" }}>
    {ok ? <path d="M4.5 12.8l4.6 4.6L19.5 6.8" /> : <path d="M6 6l12 12M18 6L6 18" />}
  </svg>
);

// the card, and how the deck lies under it
const CARD_TOP = 236;
const CARD_H = 1100;
const PAD = 56;
const DEPTH_Y = 46;
const DEPTH_K = 0.05;
/** while the title shows, the deck waits this much lower, its backs peeking under the title */
const LOW = 660;

const step = (frame: number, at: number) => interpolate(frame, [at - SWAP, at], [0, 1], { ...clamped, easing: ease });

/**
 * Where card `i` of the deck lies (the score card is the last): `depth` 0 on top, 1 just under it …; it comes up
 * a step each time a card above it leaves; `out` runs 0 → 1 as it leaves itself, flung to the side.
 */
function deck(frame: number, i: number, rounds: number[], end: number) {
  let depth = i + 1 - step(frame, INTRO);
  for (let k = 1; k <= i && k < rounds.length; k += 1) depth -= step(frame, rounds[k]);
  if (i >= rounds.length) depth -= step(frame, end);
  // the score card is the last and never leaves
  const finish = i < rounds.length ? (rounds[i + 1] ?? end) : null;
  const t = finish === null ? 0 : interpolate(frame, [finish - SWAP, finish], [0, 1], clamped);
  return { depth: Math.max(0, depth), low: LOW * (1 - interpolate(frame, [INTRO - SWAP - 4, INTRO], [0, 1], { ...clamped, easing: ease })), out: t * t };
}

/** One card of the deck: its back while it waits, its face once it is on top. */
const Shell: React.FC<{ i: number; place: ReturnType<typeof deck>; children: React.ReactNode }> = ({ i, place, children }) => {
  const { depth, low, out } = place;
  // the face shows as the card reaches the top: whole on its round's first frame
  const face = interpolate(depth, [0, 0.6], [1, 0], clamped);
  return (
    <div
      style={{
        position: "absolute",
        top: CARD_TOP,
        right: SIDE,
        left: SIDE,
        height: CARD_H,
        borderRadius: 48,
        background: TF.card,
        boxShadow: "0 26px 70px rgba(40,0,10,.38)",
        transform: `translateY(${depth * DEPTH_Y + low}px) translateX(${-out * 1250}px) rotate(${-out * 16}deg) scale(${1 - depth * DEPTH_K})`,
        transformOrigin: "50% 100%",
        overflow: "hidden",
        direction: "rtl",
        zIndex: 100 - i,
      }}
    >
      {face > 0 ? <div style={{ position: "absolute", inset: 0, opacity: face }}>{children}</div> : null}
      {face < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - face, display: "flex", alignItems: "center", justifyContent: "center", background: TF.back }}>
          <div style={{ position: "absolute", inset: 26, borderRadius: 34, border: `4px solid ${TF.red}`, opacity: 0.3 }} />
          <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 300, color: TF.red, opacity: 0.2 }}>؟</span>
        </div>
      ) : null}
    </div>
  );
};

/** The face of a sentence card: the round, the year, the sentence; the ring; the stamp and the two figures. */
const Face: React.FC<{ r: TrueFalseRound; i: number; n: number; at: number }> = ({ r, i, n, at }) => {
  const local = useCurrentFrame() - at;
  const size = r.sentence.length > 44 ? 78 : r.sentence.length > 34 ? 86 : 94;
  const left = Math.min(3, Math.max(1, 3 - Math.floor((local - RING) / 30)));
  const run = interpolate(local, [RING, STAMP], [1, 0], clamped);
  const slam = interpolate(local, [STAMP, STAMP + 7, STAMP + 11], [2.3, 0.94, 1], { ...clamped, easing: ease });
  const max = Math.max(Math.abs(r.a.value), Math.abs(r.b.value)) || 1;
  const verdict = r.truth ? TF.yes : TF.no;
  return (
    <div style={{ position: "absolute", inset: 0, padding: PAD }}>
      {/* which round, and the year of both figures */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ padding: "6px 26px 10px", borderRadius: 40, background: TF.red, color: "#fff", fontFamily: VAZIR, fontWeight: 800, fontSize: 34 }}>{`جملهٔ ${faNum(i + 1)} از ${faNum(n)}`}</span>
        <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 38, color: TF.ink2 }}>{`سال ${r.year}`}</span>
      </div>
      <div style={{ marginTop: 30, fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color: TF.red }}>{r.topic}</div>
      {/* the sentence: bold and black, there from the first frame */}
      <div style={{ marginTop: 12, fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1.42, color: TF.ink, textWrap: "balance" } as React.CSSProperties}>{r.sentence}</div>

      {/* three seconds to decide */}
      {local >= RING - 2 && local < STAMP + 8 ? (
        <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: Math.min(fade(local, RING - 2, 6), interpolate(local, [STAMP, STAMP + 8], [1, 0], clamped)), transform: `scale(${interpolate(local, [STAMP, STAMP + 8], [1, 0.7], clamped)})` }}>
          <svg width="250" height="250" viewBox="0 0 250 250">
            <circle cx="125" cy="125" r="104" fill="none" stroke={TF.line} strokeWidth="18" />
            <circle cx="125" cy="125" r="104" fill="none" stroke={TF.red} strokeWidth="18" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(0.001, run * 100)} 100`} transform="rotate(-90 125 125)" />
            {[0, 1, 2].map((k) => (
              <line key={k} x1="125" y1="0" x2="125" y2="14" stroke={TF.ink3} strokeWidth="5" strokeLinecap="round" transform={`rotate(${k * 120} 125 125)`} />
            ))}
            <text x="125" y="162" textAnchor="middle" fill={TF.ink} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 112 }}>
              {faNum(left)}
            </text>
          </svg>
          <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: TF.ink3 }}>درست یا غلط؟</span>
        </div>
      ) : null}

      {/* the stamp */}
      {local >= STAMP ? (
        <div style={{ position: "absolute", top: 586, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "2px 44px 12px", border: `12px solid ${verdict}`, borderRadius: 30, color: verdict, fontFamily: VAZIR, fontWeight: 800, fontSize: 124, lineHeight: 1.2, opacity: fade(local, STAMP, 3), transform: `rotate(-6deg) scale(${slam})` }}>
            <Mark ok={r.truth} size={104} color={verdict} />
            {r.truth ? "درست" : "غلط"}
          </div>
        </div>
      ) : null}

      {/* the two figures, their one year and their source */}
      {local >= FIGS - 2 ? (
        <div style={{ position: "absolute", top: 800, right: PAD, left: PAD, display: "flex", flexDirection: "column", gap: 14 }}>
          {[r.a, r.b].map((f, k) => {
            const g = grow(local, FIGS + k * 6, 22);
            return (
              <div key={k} style={{ opacity: fade(local, FIGS + k * 6, 8) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, fontFamily: VAZIR, fontWeight: 800, fontSize: f.text.length > 24 ? 34 : 40, lineHeight: 1.25, color: k ? TF.ink2 : TF.ink }}>
                  <span style={{ whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ whiteSpace: "nowrap" }}>{f.text}</span>
                </div>
                <div style={{ marginTop: 8, height: 16, borderRadius: 8, background: TF.line }}>
                  <div style={{ height: "100%", width: `${Math.max(1.5, (Math.abs(f.value) / max) * 100) * g}%`, borderRadius: 8, background: k ? TF.ink3 : TF.ink, opacity: k ? 0.75 : 1 }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 2, opacity: fade(local, FIGS + 16, 10) }}>
            <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 30, lineHeight: 1.45, color: TF.ink2 }}>{`هر دو برای سال ${r.year}`}</div>
            <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 26, lineHeight: 1.45, color: TF.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{`منبع: ${r.source}`}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** The face of the score card: the question back to the viewer, the score to write, the three verdicts, the sources. */
const Score: React.FC<{ p: TrueFalseProps; at: number }> = ({ p, at }) => {
  const local = useCurrentFrame() - at;
  return (
    <div style={{ position: "absolute", inset: 0, padding: PAD }}>
      <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 84, lineHeight: 1.35, color: TF.ink }}>{p.ask}</div>
      <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 20 }}>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={{ width: 108, height: 108, borderRadius: 54, border: `6px solid ${TF.red}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 60, color: TF.red, transform: `scale(${interpolate(local, [6 + k * 5, 12 + k * 5, 17 + k * 5], [0, 1.12, 1], clamped)})` }}>
            {faNum(k)}
          </div>
        ))}
        <span style={{ marginRight: 14, fontFamily: VAZIR, fontWeight: 800, fontSize: 46, color: TF.red, whiteSpace: "nowrap", opacity: fade(local, 28, 10) }}>{p.answer}</span>
      </div>
      <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 14 }}>
        {p.rounds.map((r, k) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 24px", borderRadius: 24, background: "rgba(23,17,15,.045)", opacity: fade(local, 34 + k * 6, 8) }}>
            <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color: TF.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{`${faNum(k + 1)} · ${r.short} · ${r.b.name}`}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 22px 8px", borderRadius: 30, background: r.truth ? TF.yes : TF.no, color: "#fff", fontFamily: VAZIR, fontWeight: 800, fontSize: 34, flex: "none" }}>
              <Mark ok={r.truth} size={32} color="#fff" stroke={3.6} />
              {r.truth ? "درست" : "غلط"}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, fontFamily: VAZIR, fontSize: 28, lineHeight: 1.7, color: TF.ink3, opacity: fade(local, 56, 12) }}>{`منبع: ${p.source}`}</div>
    </div>
  );
};

export const TrueFalse: React.FC<TrueFalseProps> = (p) => {
  paint("truefalse");
  const frame = useCurrentFrame();
  const { rounds, end } = plan(p);
  const n = p.rounds.length;
  const titleOut = interpolate(frame, [INTRO - SWAP - 4, INTRO], [0, 1], { ...clamped, easing: ease });
  const settle = interpolate(frame, [0, 14], [1.05, 1], { ...clamped, easing: ease });

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} volume={0.85} /> : null}
      <Ground />

      {/* the name, and the three rounds as marks that fill as they are answered */}
      <div style={{ position: "absolute", top: 70, right: SIDE, left: SIDE, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Seal size={78} color="#fff" word={false} />
          <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 54, color: "#fff" }}>دیوان</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {p.rounds.map((r, k) => {
            const at = rounds[k];
            const done = frame >= at + STAMP;
            const live = frame >= at && !done;
            return (
              <div
                key={k}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  border: `4px solid ${done || live ? "#fff" : "rgba(255,255,255,.7)"}`,
                  background: done ? (r.truth ? TF.yes : TF.no) : live ? "#fff" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: VAZIR,
                  fontWeight: 800,
                  fontSize: 32,
                  color: live ? TF.red : "rgba(255,255,255,.85)",
                  transform: `scale(${interpolate(frame, [at + STAMP, at + STAMP + 6, at + STAMP + 10], [1, 1.25, 1], clamped)})`,
                }}
              >
                {done ? <Mark ok={r.truth} size={34} color="#fff" stroke={3.6} /> : faNum(k + 1)}
              </div>
            );
          })}
        </div>
      </div>

      {/* the title: there from the first frame */}
      <Sfx at={0} name="hit" />
      {frame < INTRO + 2 ? (
        <div style={{ position: "absolute", top: 330, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", alignItems: "center", gap: 46, opacity: 1 - titleOut, transform: `translateY(${-titleOut * 220}px) scale(${settle})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 30px 16px", borderRadius: 32, background: "#fff", color: TF.yes, fontFamily: VAZIR, fontWeight: 800, fontSize: 100, lineHeight: 1.2, transform: "rotate(-4deg)", boxShadow: "0 18px 40px rgba(40,0,10,.3)" }}>
              <Mark ok size={76} color={TF.yes} />
              درست
            </span>
            <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 70, color: "#fff" }}>یا</span>
            <span style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 30px 16px", borderRadius: 32, background: "#fff", color: TF.no, fontFamily: VAZIR, fontWeight: 800, fontSize: 100, lineHeight: 1.2, transform: "rotate(4deg)", boxShadow: "0 18px 40px rgba(40,0,10,.3)" }}>
              <Mark ok={false} size={76} color={TF.no} />
              غلط
            </span>
          </div>
          <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 72, lineHeight: 1.45, color: "#fff", textAlign: "center", textWrap: "balance" } as React.CSSProperties}>{p.question.split(/(?<=\.)\s+/)[0].replace(/\.$/, "")}</div>
        </div>
      ) : null}

      {/* the deck: the card on top, the ones still to come under it, the score card last */}
      <Sfx at={INTRO - SWAP - 4} name="whoosh" />
      {p.rounds.map((r, i) => {
        const place = deck(frame, i, rounds, end);
        return (
          <React.Fragment key={i}>
            {i > 0 ? <Sfx at={rounds[i] - SWAP} name="swish" /> : null}
            <Sfx at={rounds[i]} name="pop" />
            {[0, 1, 2].map((k) => (
              <Sfx key={k} at={rounds[i] + RING + k * 30} name="tick" />
            ))}
            <Sfx at={rounds[i] + STAMP} name="hit" />
            <Sfx at={rounds[i] + FIGS} name="pop" volume={0.2} />
            {place.out < 1 ? (
              <Shell i={i} place={place}>
                <Face r={r} i={i} n={n} at={rounds[i]} />
              </Shell>
            ) : null}
          </React.Fragment>
        );
      })}
      <Sfx at={end - SWAP} name="swish" />
      <Shell i={n} place={deck(frame, n, rounds, end)}>
        <Score p={p} at={end} />
      </Shell>

      {/* where everything is, under the score card */}
      {frame >= end ? (
        <div style={{ position: "absolute", bottom: SAFE_BOTTOM + 4, left: SIDE, right: SIDE_RAIL, direction: "rtl", opacity: fade(frame, end + 40, 14) }}>
          <div style={{ fontFamily: VAZIR, fontSize: 26, color: "rgba(255,255,255,.88)", lineHeight: 1.7 }}>{p.foot}</div>
          <div style={{ marginTop: 6, fontFamily: VAZIR, fontWeight: 800, fontSize: 34, color: "#fff", direction: "ltr", textAlign: "right" }}>divan.ahura.cloud</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
