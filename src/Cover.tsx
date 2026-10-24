// The still picture a Reel shows on the profile grid. Instagram cuts the tall
// frame down to its middle (3:4, and 1:1 in some places), so everything that
// must be read sits in the middle square; the rest is ground.
//
// The tile wears its series' colour (kit.tsx, HUES): a tinted ground, a band
// down the reading edge and the series' emblem as a large mark. Seven kinds of
// tile, one hand: the grid shows at a glance which is which.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Emblem } from "./emblems";
import { C, H, NASKH, Seal, VAZIR, W, paint } from "./kit";
import type { CoverProps } from "./props";

/** One emblem per series. */
export const EMBLEM: Record<string, string> = { dilemma: "council", seat: "seat", region: "home", precedent: "archive", talks: "chancery", war: "war", borders: "today", arsenal: "arsenal", dollar: "treasury", nuclear: "atom", figure: "figure", quiz: "ideas", power: "arsenal", thennow: "today", race: "home" };

// the middle square of the frame: what every surface of Instagram shows
const TOP = (H - W) / 2;

export const Cover: React.FC<CoverProps> = ({ format, kicker, title, mark: given }) => {
  paint(format);
  // a figure the title already says is not said twice
  const mark = given && !title.includes(given) ? given : undefined;
  const size = title.length > 46 ? 80 : title.length > 32 ? 94 : title.length > 20 ? 112 : 132;
  const emblem = EMBLEM[format] ?? "seat";
  return (
    <AbsoluteFill style={{ background: C.bg, direction: "rtl" }}>
      {/* the series' colour fills the tile: a deep tinted ground that lightens toward one corner */}
      <AbsoluteFill style={{ background: `linear-gradient(158deg, ${C.deep} 0%, ${C.dusk} 52%, ${C.bg} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(1000px 1000px at 80% 34%, ${C.glow}, transparent 70%)` }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`, backgroundSize: "120px 120px", opacity: 0.26 }} />
      {/* the series' emblem, large and faint, above and below the square: seen only where the whole tall frame is shown */}
      {[TOP - 330, TOP + W + 70].map((y) => (
        <div key={y} style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 0.14 }}>
          <Emblem id={emblem} size={260} color={C.acc} stroke={0.8} />
        </div>
      ))}
      {/* a frame inside the square, and the emblem as a large mark in its lower corner */}
      <div style={{ position: "absolute", top: TOP + 50, left: 50, right: 50, height: W - 100, borderRadius: 44, border: `2px solid ${C.accLine}`, background: "rgba(13,19,34,.30)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -70, bottom: -90, opacity: 0.17 }}>
          <Emblem id={emblem} size={560} color={C.acc} stroke={0.6} />
        </div>
        {/* a band of the series' colour down the reading edge: the tile is found again by it */}
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 22, background: C.acc }} />
      </div>

      <div style={{ position: "absolute", top: TOP + 100, right: 124, left: 104, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Seal size={84} word={false} />
          <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 60, color: C.ink, lineHeight: 1.1 }}>دیوان</span>
        </div>
        <Emblem id={emblem} size={76} color={C.acc} stroke={1.3} />
      </div>

      <div style={{ position: "absolute", top: TOP + 230, bottom: H - TOP - W + 160, right: 124, left: 104, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 24 }}>
        {/* the series' name on its colour */}
        <span style={{ padding: "8px 30px 12px", borderRadius: 40, background: C.acc, color: C.onAcc, fontFamily: VAZIR, fontWeight: 800, fontSize: 46, lineHeight: 1.5, whiteSpace: "nowrap" }}>{kicker}</span>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: size, lineHeight: 1.42, color: C.ink, textWrap: "balance" as never }}>{title}</div>
        {/* the figure that carries the tile, when it has one */}
        {mark ? <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: mark.length > 5 ? 104 : 132, lineHeight: 1.1, color: C.acc }}>{mark}</div> : null}
      </div>

      <div style={{ position: "absolute", top: TOP + W - 148, right: 124, left: 104, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: VAZIR, fontSize: 32, color: C.ink2 }}>دوراهی‌های ایران</span>
        <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: C.ink, direction: "ltr" }}>divan.ahura.cloud</span>
      </div>
    </AbsoluteFill>
  );
};
