// The Story that follows a Reel onto the page: nine seconds that say a new
// video is up, in the colour and with the emblem of its series. Nothing in it
// is new content: the kicker, the title and the figure are the Reel's own tile.
//
// Instagram lays its own bars over a Story (the account's name on top, the
// message field at the bottom), so everything that must be read sits between.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EMBLEM } from "./Cover";
import { Emblem } from "./emblems";
import { AiChip, C, FPS, H, NASKH, Net, Seal, VAZIR, W, Words, clamped, ease, fade, grow, paint, pop, rise } from "./kit";
import type { StoryProps } from "./props";

const TOTAL = Math.round(9.5 * FPS);
export const storyDuration = () => TOTAL;

// what Instagram covers
const TOP_BAR = 250;
const BOTTOM_BAR = 340;
const SIDE = 84;
// the tile's block starts under the emblem and must end above the call at the foot
const TILE_TOP = TOP_BAR + 610;
const CALL_TOP = H - BOTTOM_BAR - 20 - 180;

/** How many lines a title takes in Naskh at a size: words laid one after another, a letter counted half the size wide. */
function linesOf(text: string, size: number): number {
  const room = (W - 2 * SIDE) / (0.5 * size);
  let lines = 1;
  let used = 0;
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const n = word.replace(/\u200c/g, "").length;
    if (used > 0 && used + 1 + n > room) {
      lines += 1;
      used = n;
    } else used += (used > 0 ? 1 : 0) + n;
  }
  return lines;
}

export const Story: React.FC<StoryProps> = (p) => {
  paint(p.of);
  const frame = useCurrentFrame();
  const emblem = EMBLEM[p.of] ?? "seat";
  // a figure the title already says is not said twice (the war's tile: «۲۳۱ روز جنگ روی نقشه» and «۲۳۱»)
  const mark = p.mark && !p.title.includes(p.mark) ? p.mark : null;
  const markSize = mark && mark.length > 5 ? 96 : 124;
  // the largest title that leaves the kicker, the figure and the chip room above the call
  const room = CALL_TOP - TILE_TOP - 24;
  const fixed = 70 + 22 + (mark ? 22 + markSize * 1.1 : 0) + (p.ai ? 22 + 52 : 0);
  const size = [124, 112, 100, 90, 80, 72, 64].find((s) => fixed + linesOf(p.title, s) * s * 1.42 <= room) ?? 58;
  // the ring around the emblem turns slowly for the whole Story
  const turn = (frame / TOTAL) * 140;
  const ring = pop(frame, 14, 26);
  // the call at the foot arrives last, and its arrow keeps moving
  const call = 150;
  const nudge = Math.sin(((frame - call) / FPS) * Math.PI * 1.6) * 12;

  return (
    <AbsoluteFill style={{ background: C.bg, direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <AbsoluteFill style={{ background: `linear-gradient(165deg, ${C.deep} 0%, ${C.dusk} 48%, ${C.bg} 100%)`, opacity: fade(frame, 0, 14) }} />
      <AbsoluteFill style={{ background: `radial-gradient(900px 900px at 50% 36%, ${C.glow}, transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `${-(frame / TOTAL) * 60}px ${-(frame / TOTAL) * 120}px`,
          opacity: 0.26,
        }}
      />
      <Net total={TOTAL} opacity={0.34} count={18} top={TOP_BAR + 140} bottom={H - BOTTOM_BAR - 300} />

      {/* whose it is, and what kind of thing: under Instagram's own bar */}
      <div style={{ position: "absolute", top: TOP_BAR + 14, right: SIDE, left: SIDE, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, 4, 12), transform: `translateY(${rise(frame, 4, -24)}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Seal size={80} word={false} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 52, color: C.ink, lineHeight: 1.1 }}>دیوان</span>
            <span style={{ fontFamily: VAZIR, fontSize: 23, color: C.ink3 }}>{p.series}</span>
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 24px 10px", borderRadius: 30, border: `2px solid ${C.accLine}`, background: C.accSoft, fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: C.ink }}>
          <span style={{ width: 16, height: 16, borderRadius: 8, background: C.acc, opacity: 0.45 + 0.55 * Math.abs(Math.sin((frame / FPS) * Math.PI)) }} />
          ویدیوی تازه
        </span>
      </div>

      {/* the series' emblem in a ring that turns */}
      <div style={{ position: "absolute", top: TOP_BAR + 150, left: 0, right: 0, height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="420" height="420" viewBox="0 0 420 420" style={{ position: "absolute", transform: `scale(${ring}) rotate(${turn}deg)` }}>
          <circle cx="210" cy="210" r="200" fill="none" stroke={C.accLine} strokeWidth="2.5" strokeDasharray="3 15" strokeLinecap="round" />
          <circle cx="210" cy="210" r="168" fill={C.accSoft} stroke={C.acc} strokeWidth="3" strokeDasharray={`${1056 * grow(frame, 16, 40)} 1056`} transform="rotate(-90 210 210)" />
        </svg>
        <div style={{ opacity: fade(frame, 22, 14), transform: `scale(${pop(frame, 22, 24)})` }}>
          <Emblem id={emblem} size={210} color={C.acc} stroke={1.2} />
        </div>
      </div>

      {/* the Reel's own tile, in motion: its series, its title, its figure */}
      <div style={{ position: "absolute", top: TILE_TOP, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
        <span
          style={{
            padding: "8px 30px 12px",
            borderRadius: 40,
            background: C.acc,
            color: C.onAcc,
            fontFamily: VAZIR,
            fontWeight: 800,
            fontSize: 44,
            lineHeight: 1.5,
            whiteSpace: "nowrap",
            opacity: fade(frame, 44, 10),
            transform: `translateX(${interpolate(frame, [44, 62], [70, 0], { ...clamped, easing: ease })}px)`,
          }}
        >
          {p.kicker}
        </span>
        <Words text={p.title} from={60} step={4} lift={34} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: size, lineHeight: 1.42, color: C.ink }} />
        {mark ? <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: markSize, lineHeight: 1.1, color: C.acc, opacity: fade(frame, 112, 10), transform: `scale(${pop(frame, 112, 20)})`, transformOrigin: "right center" }}>{mark}</div> : null}
        {p.ai ? <AiChip opacity={fade(frame, 124, 12)} /> : null}
      </div>

      {/* where to see it: above Instagram's message field */}
      <div style={{ position: "absolute", bottom: BOTTOM_BAR + 20, right: SIDE, left: SIDE, opacity: fade(frame, call, 14), transform: `translateY(${rise(frame, call, 30)}px)` }}>
        <div style={{ height: 3, borderRadius: 2, background: C.accLine, transformOrigin: "right center", transform: `scaleX(${grow(frame, call, 30)})`, marginBottom: 26 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 46, color: C.ink, lineHeight: 1.4 }}>همین حالا در صفحه</span>
            <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: C.acc, direction: "ltr", textAlign: "right" }}>{p.handle}</span>
          </div>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{ flex: "none", transform: `translateY(${-nudge}px)` }}>
            <circle cx="55" cy="55" r="52" fill={C.acc} />
            <path d="M55 80V32M34 52l21-21 21 21" fill="none" stroke={C.onAcc} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};
