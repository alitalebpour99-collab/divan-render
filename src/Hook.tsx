// The first seconds of every Reel. Instagram counts how many viewers leave in
// the first three seconds, and a Reel that loses them there is shown to few
// others (the owner asked for growth on 16 October 2026; Instagram's own advice
// and the skip rate it reports since August 2025). So a Reel no longer opens on
// the name and a title that rises word by word: from the very first frame it
// shows its strongest figure and a question, on its series' colour, and the
// Reel itself follows. The hook's words come from the site like every other
// word (lib/social/formats.ts); nothing is written here.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EMBLEM } from "./Cover";
import { Emblem } from "./emblems";
import { Bleed, C, FPS, NASKH, SAFE_BOTTOM, SIDE, SIDE_RAIL, Seal, Sfx, VAZIR, Waits, clamped, ease, paint } from "./kit";
import type { Base, HookView } from "./props";

/** How long the hook stands alone; the Reel starts under it a little before it leaves. */
export const HOOK_FRAMES = Math.round(2.4 * FPS);
const OVERLAP = 10;
export const HOOK_OVERLAP = OVERLAP;
/** How long the hook stays: longer when the narrator takes longer to ask the question (voice.ts). */
const hookLen = (p: { hookLen?: number }) => p.hookLen ?? HOOK_FRAMES;

const HookCard: React.FC<{ format: string; hook: HookView; len: number }> = ({ format, hook, len }) => {
  paint(format);
  const frame = useCurrentFrame();
  // readable on the very first frame: nothing fades in, the picture only settles
  const push = interpolate(frame, [0, len], [1.05, 1], { ...clamped, easing: ease });
  const out = interpolate(frame, [len - OVERLAP, len + 6], [0, 1], { ...clamped, easing: ease });
  const turn = (frame / FPS) * 9;
  const size = hook.text.length > 70 ? 62 : hook.text.length > 48 ? 72 : hook.text.length > 30 ? 82 : 92;
  const figureSize = !hook.figure ? 0 : hook.figure.length > 10 ? 130 : hook.figure.length > 6 ? 168 : 210;
  return (
    <AbsoluteFill style={{ direction: "rtl", opacity: 1 - out, transform: `translateY(${-out * 160}px)` }}>
      {/* opaque: it hides the Reel that starts under it; on the safe stage it reaches out to the screen's edges */}
      <Bleed>
        <AbsoluteFill style={{ background: C.bg }} />
        <AbsoluteFill style={{ background: `linear-gradient(165deg, ${C.deep} 0%, ${C.dusk} 52%, ${C.bg} 100%)` }} />
        <AbsoluteFill style={{ background: `radial-gradient(1000px 1000px at 50% 40%, ${C.glow}, transparent 70%)` }} />
      </Bleed>
      {/* the series' emblem, large and faint, turning slowly behind the words */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", opacity: 0.12, transform: `rotate(${turn}deg)` }}>
        <Emblem id={EMBLEM[format] ?? "seat"} size={720} color={C.acc} stroke={0.6} />
      </div>
      <div style={{ position: "absolute", top: 66, right: SIDE, display: "flex", alignItems: "center", gap: 16 }}>
        <Seal size={72} word={false} />
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 48, color: C.ink }}>دیوان</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 220,
          bottom: SAFE_BOTTOM + 40,
          right: SIDE_RAIL - 50,
          left: SIDE,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 34,
          transform: `scale(${push})`,
          transformOrigin: "right center",
        }}
      >
        {hook.figure ? <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: figureSize, lineHeight: 1.05, color: C.acc, whiteSpace: "nowrap" }}>{hook.figure}</div> : null}
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: size, lineHeight: 1.5, color: C.ink, textWrap: "balance" } as React.CSSProperties}>{hook.text}</div>
        {/* a bar that runs out with the hook: the viewer sees that the answer is coming */}
        <div style={{ width: 320, height: 8, borderRadius: 4, background: C.line, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (frame / (len - OVERLAP)) * 100)}%`, background: C.acc }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A Reel with its hook in front: the hook alone first, then the Reel; the score runs from the first frame. */
export function withHook<P extends Base>(Inner: React.FC<P>): React.FC<P> {
  const Hooked: React.FC<P> = (p) => {
    // the layout draws from its own clock, which waits for the narrator (kit.tsx, Waits)
    if (!p.hook?.text)
      return (
        <Waits holds={p.holds}>
          <Inner {...p} />
        </Waits>
      );
    const inner = { ...p, music: undefined } as P;
    const len = hookLen(p);
    return (
      <AbsoluteFill>
        {p.music ? <Audio src={staticFile(p.music)} /> : null}
        <Sequence from={len - OVERLAP}>
          <Waits holds={p.holds}>
            <Inner {...inner} />
          </Waits>
        </Sequence>
        {/* the question lands with a hit, and leaves with a whoosh as the Reel comes in */}
        <Sfx at={0} name="hit" />
        <Sfx at={len - OVERLAP - 4} name="whoosh" />
        <Sequence durationInFrames={len + 8}>
          <HookCard format={p.format} hook={p.hook} len={len} />
        </Sequence>
      </AbsoluteFill>
    );
  };
  return Hooked;
}
