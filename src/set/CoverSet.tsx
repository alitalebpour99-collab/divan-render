// The set style's tile for the profile grid: one object and three or four big
// words (the social audit of 2026-11-13), on the war-room table.
//
// Round 2 (2026-11-16): the series' colour carries the tile. The upper part is
// the table with the episode's own thing on it, large (the figure's object,
// the two flags, the series' seal); the lower part is a block in the series'
// colour, the cover of a dossier lying on the table, with the tile's words and
// its mark on it. The block runs from the middle of the square to the bottom
// of the frame, so the square crop and the 3:4 crop of the grid both show it,
// and the lower third is never empty cloth. Everything to be read sits in the
// middle square; the upper right corner of the square is left to Instagram's
// Reel mark.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Emblem } from "../emblems";
import { NASKH, VAZIR } from "../kit";
import { EMBLEM } from "../Cover";
import { Compass, T } from "./Table";
import type { Line } from "./space.ts";
import { Flag } from "./flags";
import { Model3D } from "./models";
import { objectFor } from "./props/objects.ts";
import { signalOf } from "./signal.ts";

const TOP = (1920 - 1080) / 2;
/** where the coloured block begins, from the top of the frame */
export const BLOCK_TOP = TOP + 590;

export const CoverSet: React.FC<{ format: string; big?: string; mark?: string; title?: string; object?: string; fitted: Line[]; pair?: string[] }> = ({ format, fitted, pair, mark, title, object }) => {
  const sig = signalOf(format);
  // the mark is shown when it adds something: not on the two-flag tile (the flags part its episodes), not when the big words already say it («۲۶۰ روز جنگ», «روز ۲۶۰»)
  const said = new Set(fitted.flatMap((l) => l.text.split(" ")));
  const shown = mark && pair?.length !== 2 && !mark.split(" ").every((x) => said.has(x)) ? mark : null;
  // a figure's tile shows the thing the figure is about, not a sign for «figure»
  const thing = format === "figure" ? objectFor({ object, label: title ?? fitted.map((l) => l.text).join(" ") }) : null;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(closest-side at 50% 34%, ${T.baizeLit}, ${T.baize} 62%, ${T.baizeEdge})`, direction: "rtl" }}>
      <AbsoluteFill style={{ opacity: 0.35, backgroundImage: `linear-gradient(rgba(234,208,143,.09) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,208,143,.09) 1.5px, transparent 1.5px)`, backgroundSize: "160px 160px" }} />
      {/* the lamp over the object, tinted a little by the series */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 30% at 50% ${TOP + 300}px, ${sig.glow}, rgba(0,0,0,0) 80%)` }} />
      <div style={{ position: "absolute", left: 150, top: TOP + 20, opacity: 0.32 }}>
        <Compass size={780} />
      </div>

      {/* the one object, large, in the upper part of the square */}
      {pair?.length === 2 ? (
        <div style={{ position: "absolute", top: TOP + 110, left: 60, width: 960, height: 420 }}>
          <div style={{ position: "absolute", left: 490, top: 30, width: 440, height: 310, transform: "rotate(-7deg)", filter: "drop-shadow(12px 22px 18px rgba(0,0,0,.55))" }}>
            <Flag iso3={pair[0]} width={440} height={310} frame={12} pole="left" />
          </div>
          <div style={{ position: "absolute", left: 30, top: 30, width: 440, height: 310, transform: "rotate(7deg)", filter: "drop-shadow(12px 22px 18px rgba(0,0,0,.55))" }}>
            <Flag iso3={pair[1]} width={440} height={310} frame={30} pole="right" />
          </div>
        </div>
      ) : thing ? (
        <div style={{ position: "absolute", top: TOP + 150, left: (1080 - 800) / 2, width: 800, height: 360 }}>
          <Model3D id={thing} w={800} h={360} frame={20} />
        </div>
      ) : (
        <div style={{ position: "absolute", top: TOP + 90, left: (1080 - 440) / 2, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #3a5a45, #12322a 70%)", border: `5px solid ${T.brassLight}`, boxShadow: `0 0 0 14px rgba(10,31,26,.9), 0 0 0 26px ${sig.main}, 0 0 0 30px ${T.brassDark}, 0 34px 70px rgba(0,0,0,.55)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Emblem id={EMBLEM[format] ?? "seat"} size={250} color={T.brassLight} stroke={1.2} />
        </div>
      )}

      {/* the series' colour: the dossier's cover, from the middle of the square to the bottom of the frame */}
      <div style={{ position: "absolute", left: 0, right: 0, top: BLOCK_TOP, bottom: 0, background: `linear-gradient(180deg, ${sig.main} 0%, ${sig.main} 55%, ${sig.deep} 100%)`, boxShadow: "0 -18px 40px rgba(0,0,0,.45)" }}>
        {/* the dossier's brass edge and its stitched line */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 12, background: `linear-gradient(180deg, ${T.brassLight}, ${T.brass} 55%, ${T.brassDark})` }} />
        <div style={{ position: "absolute", left: 60, right: 60, top: 34, height: 0, borderTop: `3px dashed ${sig.ink}`, opacity: 0.28 }} />
        {/* the paper's grain: a faint diagonal weave */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "repeating-linear-gradient(135deg, rgba(0,0,0,.6) 0 2px, transparent 2px 9px)" }} />
      </div>
      <div style={{ position: "absolute", top: BLOCK_TOP + 46, left: 70, right: 70, height: shown ? 316 : 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {fitted.map((l, i) => (
          <div key={i} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: l.size, lineHeight: 1.28, color: sig.ink, whiteSpace: "nowrap", unicodeBidi: "plaintext" }}>
            {l.text}
          </div>
        ))}
      </div>
      {/* the episode's own mark (its figure) on a stamped plate: no two tiles of a series read the same */}
      {shown ? (
        <div dir="rtl" style={{ position: "absolute", top: BLOCK_TOP + 366, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "2px 46px 10px", borderRadius: 12, border: `4px solid ${sig.ink}`, fontFamily: VAZIR, fontWeight: 800, fontSize: 78, lineHeight: 1.2, color: sig.ink, whiteSpace: "nowrap", unicodeBidi: "plaintext", transform: "rotate(-2deg)" }}>{shown}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
