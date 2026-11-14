// The first seconds of every Reel. Instagram counts how many viewers leave in
// the first three seconds, and a Reel that loses them there is shown to few
// others (the owner asked for growth on 16 October 2026; Instagram's own advice
// and the skip rate it reports since August 2025). So a Reel no longer opens on
// the name and a title that rises word by word: from the very first frame it
// shows its strongest figure and a question, on its series' colour, and the
// Reel itself follows. The hook's words come from the site like every other
// word (lib/social/formats.ts); nothing is written here.
//
// A real picture and real motion from frame 0 (the owner, 6 November 2026):
// under the question the Reel's own picture plays, sharp and moving, from the
// moment its layout names (`look`: the figure counting in its ring, the last
// board of «پنج عدد» flipping), not a still frame out of focus. The question is
// a title (at least TITLE_MIN), the figure larger still.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EMBLEM } from "./Cover";
import { Emblem } from "./emblems";
import { Alive, BODY_MIN, Bleed, C, FPS, NASKH, SAFE_BOTTOM, SIDE, SIDE_RAIL, Seal, Sfx, Silent, TITLE_MIN, VAZIR, Waits, clamped, ease, faDigits, paint } from "./kit";
import type { Base, HookView } from "./props";

/** How long the hook stands alone; the Reel starts under it a little before it leaves. */
export const HOOK_FRAMES = Math.round(2.4 * FPS);
const OVERLAP = 10;
export const HOOK_OVERLAP = OVERLAP;
/** How long the hook stays: longer when the narrator takes longer to ask the question (voice.ts). */
const hookLen = (p: { hookLen?: number }) => p.hookLen ?? HOOK_FRAMES;

/** The question's size: a title at least, larger when it is short. */
export const hookSize = (text: string) => (text.length > 70 ? TITLE_MIN : text.length > 48 ? TITLE_MIN + 6 : text.length > 30 ? TITLE_MIN + 14 : TITLE_MIN + 22);

/** What the hook shows of its Reel: the frame of the layout it plays from, and the band of the picture it shows (fractions of the height). */
export type Look = { at: number; band?: [number, number] };
const bandMask = ([top, bottom]: [number, number]) => `linear-gradient(180deg, transparent ${Math.max(0, top * 100 - 6)}%, #000 ${top * 100}%, #000 ${bottom * 100}%, transparent ${Math.min(100, bottom * 100 + 6)}%)`;

const HookCard: React.FC<{ format: string; hook: HookView; len: number; behind?: React.ReactNode; band: [number, number]; part?: { n: number; of: number } | null }> = ({ format, hook, len, behind, band, part }) => {
  paint(format);
  const frame = useCurrentFrame();
  // readable on the very first frame: nothing fades in, the words only settle
  const push = interpolate(frame, [0, len], [1.05, 1], { ...clamped, easing: ease });
  const out = interpolate(frame, [len - OVERLAP, len + 6], [0, 1], { ...clamped, easing: ease });
  const turn = (frame / FPS) * 9;
  const size = hookSize(hook.text);
  const figureSize = !hook.figure ? 0 : hook.figure.length > 10 ? 150 : hook.figure.length > 6 ? 184 : 224;
  return (
    <AbsoluteFill style={{ direction: "rtl", opacity: 1 - out, transform: `translateY(${-out * 160}px)` }}>
      {/* opaque: it hides the Reel that starts under it; on the safe stage it reaches out to the screen's edges */}
      <Bleed>
        <AbsoluteFill style={{ background: C.bg }} />
        <AbsoluteFill style={{ background: `linear-gradient(165deg, ${C.deep} 0%, ${C.dusk} 52%, ${C.bg} 100%)` }} />
      </Bleed>
      {/* the Reel's own picture, sharp and already moving on the first frame, coming slowly closer */}
      {/* only the band its layout names: its own name line and its words are masked away, the hook has its own */}
      {behind ? (
        <AbsoluteFill style={{ opacity: 0.66, filter: "saturate(1.15)", transform: `scale(${interpolate(frame, [0, len], [1.12, 1.03], clamped)})`, maskImage: bandMask(band), WebkitMaskImage: bandMask(band) }}>{behind}</AbsoluteFill>
      ) : null}
      {/* night under the words only, so that the picture stays a picture and the words stay readable */}
      <AbsoluteFill style={{ background: `radial-gradient(1150px 760px at 55% 54%, ${C.bg}f2 0%, ${C.bg}cc 46%, ${C.bg}55 80%, ${C.bg}00 100%)` }} />
      {/* the series' emblem, large and faint, turning slowly behind the words */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", opacity: 0.08, transform: `rotate(${turn}deg)` }}>
        <Emblem id={EMBLEM[format] ?? "seat"} size={720} color={C.acc} stroke={0.6} />
      </div>
      <div style={{ position: "absolute", top: 66, right: SIDE, display: "flex", alignItems: "center", gap: 16 }}>
        <Seal size={72} word={false} />
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 52, color: C.ink }}>دیوان</span>
      </div>
      {part ? (
        <div style={{ position: "absolute", top: 70, left: SIDE, fontFamily: VAZIR, fontSize: BODY_MIN, fontWeight: 700, color: C.acc, border: `2px solid ${C.acc}`, borderRadius: 40, padding: "2px 24px 6px", direction: "rtl", background: `${C.bg}cc` }}>
          قسمت {faDigits(part.n)} از {faDigits(part.of)}
        </div>
      ) : null}
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
        {hook.figure ? <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: figureSize, lineHeight: 1.05, color: C.acc, whiteSpace: "nowrap", textShadow: `0 0 40px ${C.bg}` }}>{hook.figure}</div> : null}
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: size, lineHeight: 1.42, color: C.ink, textWrap: "balance", textShadow: `0 2px 30px ${C.bg}` } as React.CSSProperties}>{hook.text}</div>
        {/* a bar that runs out with the hook: the viewer sees that the answer is coming */}
        <div style={{ width: 320, height: 10, borderRadius: 5, background: C.line, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (frame / (len - OVERLAP)) * 100)}%`, background: C.acc }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * A Reel with its hook in front: the hook alone first, then the Reel; the score
 * runs from the first frame. `look` names the frame of the layout the hook
 * shows playing under its question, and the band of it; without one, about
 * where the Reel's answer stands (60 % of the way), between its name line and
 * the words at its foot.
 */
export function withHook<P extends Base>(Inner: React.FC<P>, look?: (p: P) => Look): React.FC<P> {
  const Hooked: React.FC<P> = (p) => {
    const { durationInFrames } = useVideoConfig();
    // the layout draws from its own clock, which waits for the narrator (kit.tsx, Waits)
    if (!p.hook?.text)
      return (
        <Waits holds={p.holds}>
          <Alive holds={p.holds}>
            <Inner {...p} />
          </Alive>
        </Waits>
      );
    const inner = { ...p, music: undefined } as P;
    const len = hookLen(p);
    const seen = look?.(p);
    const from = Math.max(0, Math.round(seen ? seen.at : (durationInFrames - len) * 0.6));
    return (
      <AbsoluteFill>
        {p.music ? <Audio src={staticFile(p.music)} /> : null}
        <Sequence from={len - OVERLAP}>
          <Waits holds={p.holds}>
            <Alive holds={p.holds}>
              <Inner {...inner} />
            </Alive>
          </Waits>
        </Sequence>
        {/* the question lands with a hit, and leaves with a whoosh as the Reel comes in */}
        <Sfx at={0} name="hit" />
        <Sfx at={len - OVERLAP - 4} name="whoosh" />
        <Sequence durationInFrames={len + 8}>
          <HookCard
            format={p.format}
            hook={p.hook}
            len={len}
            part={p.part}
            band={seen?.band ?? [0.16, 0.6]}
            behind={
              <Silent>
                {/* the layout plays from `from` on the hook's first frame: a negative start puts it there already moving */}
                <Sequence from={-from}>
                  <Inner {...inner} />
                </Sequence>
              </Silent>
            }
          />
        </Sequence>
      </AbsoluteFill>
    );
  };
  return Hooked;
}
