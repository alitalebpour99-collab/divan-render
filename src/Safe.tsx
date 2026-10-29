// Every Reel on one safe stage. The owner saw on 22 October 2026 that the top
// lines of the Reels were cut off («ریل‌هاش زوم میشه و بعضی از متن‌های بالای
// تصاویر میره», on every network). The cause: Instagram's home feed shows a Reel
// cropped to 4:5 (only y 285–1635 of the 1920 stay), the profile grid crops it
// to 3:4, and the full-screen viewers of Instagram, TikTok and YouTube Shorts lay
// their caption over the bottom and their buttons down the right edge. The
// layouts put the name at y 60 and many titles at y 216–300, so exactly those
// lines went.
//
// Instead of moving every piece of fifteen layouts by hand, the whole designed
// frame is drawn a little smaller (STAGE_K) on a stage whose first line lands
// at y 290 and whose last line (the closing line, H − SAFE_BOTTOM) lands at
// y 1590, both inside the feed's crop and clear of the caption (the geometry is
// in kit.tsx). The ground is painted full-bleed under the stage (Backdrop steps
// aside on it), the hook's opaque ground reaches out to the screen's edges
// (Bleed), and four thin strips fade the stage's edges into the ground (Edges),
// so no frame line shows. The Story and the grid tile keep their own layouts:
// the Story is never cropped, and the tile is drawn inside the square.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { HOOK_FRAMES } from "./Hook";
import { C, H, OnStage, PartCtx, STAGE_K, STAGE_X, STAGE_Y, W, clamped, ease, paint } from "./kit";
import type { Base } from "./props";
import { PaperGround } from "./ThenNow";
import { DecadeGround } from "./Decade";
import type { DecadeProps } from "./props";
import { TrueFalseGround } from "./TrueFalse";

/** The whole ground, full-bleed: the night ground of the scenes (Backdrop's), with the hook's tinted ground over it at first. */
const Ground: React.FC<{ hooked: boolean; format?: string; hookLen: number; reel?: Base }> = ({ hooked, format, hookLen, reel }) => {
  const frame = useCurrentFrame();
  // the one series on paper (ThenNow.tsx) has the paper as its ground
  if (format === "thennow") return <PaperGround />;
  // «دههٔ تو» is split: the old photo and the night, with the seam where the layout is (Decade.tsx)
  if (format === "decade" && reel) return <DecadeGround reel={reel as DecadeProps} />;
  // the game «درست یا غلط» on its red ground (TrueFalse.tsx)
  if (format === "truefalse") return <TrueFalseGround />;
  const { durationInFrames } = useVideoConfig();
  const drift = frame / durationInFrames;
  // the same moment the hook card leaves (Hook.tsx)
  const out = hooked ? interpolate(frame, [hookLen - 10, hookLen + 6], [0, 1], { ...clamped, easing: ease }) : 1;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 900px at 50% 40%, ${C.glow}, transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `${-drift * 60}px ${-drift * 120}px`,
          opacity: 0.3,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(13,19,34,0) 55%, rgba(13,19,34,.75) 100%)" }} />
      {out < 1 ? (
        <AbsoluteFill style={{ opacity: 1 - out }}>
          <AbsoluteFill style={{ background: `linear-gradient(165deg, ${C.deep} 0%, ${C.dusk} 52%, ${C.bg} 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(1000px 1000px at 50% 40%, ${C.glow}, transparent 70%)` }} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/** The stage on the screen, and how far its edges fade into the ground (screen pixels). */
const X0 = STAGE_X;
const X1 = STAGE_X + W * STAGE_K;
const Y0 = STAGE_Y;
const Y1 = STAGE_Y + H * STAGE_K;
const FADE = 60;
const EDGES: { box: React.CSSProperties; to: string }[] = [
  { box: { left: X0, top: Y0, width: FADE, height: Y1 - Y0 }, to: "right" },
  { box: { left: X1 - FADE, top: Y0, width: FADE, height: Y1 - Y0 }, to: "left" },
  { box: { left: X0, top: Y0, width: X1 - X0, height: FADE * 0.6 }, to: "bottom" },
  { box: { left: X0, top: Y1 - FADE, width: X1 - X0, height: FADE }, to: "top" },
];

/**
 * The stage's edges fade into the ground: four thin strips over them, each
 * painted with the same ground at the same place on the screen and fading
 * inwards. Only these strips are masked, so a frame costs little more than
 * without them (a mask over the whole stage made Chrome draw it all again
 * off-screen on every frame, and a Reel took three times as long).
 */
const Edges: React.FC<{ hooked: boolean; format: string; hookLen: number; reel?: Base }> = ({ hooked, format, hookLen, reel }) => (
  <>
    {EDGES.map(({ box, to }) => {
      const mask = `linear-gradient(to ${to}, #000, transparent)`;
      return (
        <div key={to} style={{ position: "absolute", overflow: "hidden", ...box, WebkitMaskImage: mask, maskImage: mask }}>
          <div style={{ position: "absolute", left: -Number(box.left), top: -Number(box.top), width: W, height: H }}>
            <Ground hooked={hooked} format={format} hookLen={hookLen} reel={reel} />
          </div>
        </div>
      );
    })}
  </>
);

/** A Reel (with its hook) drawn on the safe stage. */
export function onStage<P extends Base>(Inner: React.FC<P>): React.FC<P> {
  const Staged: React.FC<P> = (p) => {
    // the ground is drawn before the Reel paints itself: it takes the series' colour here
    paint(p.format);
    // the last two and a half seconds name the next episode
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const part = p.part ? { ...p.part, ending: frame >= durationInFrames - 75 } : null;
    return (
      <AbsoluteFill>
        <Ground hooked={Boolean(p.hook?.text)} format={p.format} hookLen={p.hookLen ?? HOOK_FRAMES} reel={p} />
        <div
          style={{
            position: "absolute",
            left: STAGE_X,
            top: STAGE_Y,
            width: W,
            height: H,
            transform: `scale(${STAGE_K})`,
            transformOrigin: "0 0",
            // a plain clip; the soft edges are the strips of Edges
            overflow: "hidden",
          }}
        >
          <OnStage.Provider value={true}>
            <PartCtx.Provider value={part}>
              <Inner {...p} />
            </PartCtx.Provider>
          </OnStage.Provider>
        </div>
        <Edges hooked={Boolean(p.hook?.text)} format={p.format} hookLen={p.hookLen ?? HOOK_FRAMES} reel={p} />
        {/* the narrator, when the renderer placed one */}
        {(p.voice ?? []).map((v) => (
          <Sequence key={v.file} from={v.from} layout="none">
            <Audio src={staticFile(v.file)} />
          </Sequence>
        ))}
      </AbsoluteFill>
    );
  };
  return Staged;
}
