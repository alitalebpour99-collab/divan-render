// The set style's tile for the profile grid: one object and three or four big
// words (the social audit of 2026-11-13), on the war-room table. Everything to
// be read sits in the middle square, which every surface of Instagram shows.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Emblem } from "../emblems";
import { NASKH } from "../kit";
import { EMBLEM } from "../Cover";
import { Compass, T } from "./Table";
import type { Line } from "./space.ts";
import { Flag } from "./flags";
import { signalOf } from "./signal.ts";
import { VAZIR } from "../kit";

const TOP = (1920 - 1080) / 2;

export const CoverSet: React.FC<{ format: string; big?: string; mark?: string; fitted: Line[]; pair?: string[] }> = ({ format, fitted, pair, mark }) => {
  const sig = signalOf(format);
  // the mark is shown when it adds something: not on the two-flag tile (the flags part its episodes), not when the big words already say it («۲۶۰ روز جنگ», «روز ۲۶۰»)
  const said = new Set(fitted.flatMap((l) => l.text.split(" ")));
  const shown = mark && pair?.length !== 2 && !mark.split(" ").every((x) => said.has(x)) ? mark : null;
  const two = fitted.length > 1;
  return (
  <AbsoluteFill style={{ background: `radial-gradient(closest-side, ${T.baizeLit}, ${T.baize} 60%, ${T.baizeEdge})`, direction: "rtl" }}>
    {/* the series' colour in the light over the table */}
    <AbsoluteFill style={{ background: `radial-gradient(78% 44% at 50% 42%, ${sig.glow}, rgba(0,0,0,0) 78%)` }} />
    <AbsoluteFill style={{ opacity: 0.35, backgroundImage: `linear-gradient(rgba(234,208,143,.09) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,208,143,.09) 1.5px, transparent 1.5px)`, backgroundSize: "160px 160px" }} />
    {/* «ایران در برابر …»: the one object is the two flags, crossed on their poles over the compass rose */}
    {pair?.length === 2 ? (
      <div style={{ position: "absolute", top: TOP + 110, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 760, height: 400 }}>
          <div style={{ position: "absolute", left: 95, top: -40, opacity: 0.4 }}>
            <Compass size={570} />
          </div>
          <div style={{ position: "absolute", left: 400, top: 60, width: 340, height: 240, transform: "rotate(-8deg)", filter: "drop-shadow(10px 18px 16px rgba(0,0,0,.5))" }}>
            <Flag iso3={pair[0]} width={340} height={240} frame={12} pole="left" />
          </div>
          <div style={{ position: "absolute", left: 20, top: 60, width: 340, height: 240, transform: "rotate(8deg)", filter: "drop-shadow(10px 18px 16px rgba(0,0,0,.5))" }}>
            <Flag iso3={pair[1]} width={340} height={240} frame={30} pole="right" />
          </div>
        </div>
      </div>
    ) : null}
    {/* the one object: the series' emblem on a brass seal, over the compass rose of the table */}
    <div style={{ position: "absolute", top: TOP + 90, left: 0, right: 0, display: pair?.length === 2 ? "none" : "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 430, height: 430 }}>
        <div style={{ position: "absolute", inset: -70, opacity: 0.45 }}>
          <Compass size={570} />
        </div>
        <div style={{ position: "absolute", inset: 70, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #3a5a45, #12322a 70%)", border: `4px solid ${T.brassLight}`, boxShadow: `0 0 0 12px rgba(10,31,26,.9), 0 0 0 20px ${sig.main}, 0 0 0 23px ${T.brassDark}, 0 30px 60px rgba(0,0,0,.5)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Emblem id={EMBLEM[format] ?? "seat"} size={170} color={T.brassLight} stroke={1.2} />
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", top: TOP + (shown ? (two ? 500 : 530) : 560), left: 80, right: 80, height: shown ? 340 : 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {fitted.map((l, i) => (
        <div key={i} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: l.size, lineHeight: 1.3, color: T.ink, whiteSpace: "nowrap", unicodeBidi: "plaintext" }}>
          {l.text}
        </div>
      ))}
    </div>
    {/* the episode's own mark (its figure, its day, its score) in the series' colour: no two tiles of a series read the same */}
    {shown ? (
      <div dir="rtl" style={{ position: "absolute", top: TOP + (two ? 900 : 872), left: 80, right: 80, height: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ width: 90, height: 5, background: sig.main, borderRadius: 3 }} />
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 76, lineHeight: 1.2, color: sig.main, whiteSpace: "nowrap", unicodeBidi: "plaintext" }}>{shown}</div>
        <div style={{ width: 90, height: 5, background: sig.main, borderRadius: 3 }} />
      </div>
    ) : null}
    {/* the series' ribbon over the frame's upper left corner: the upper right belongs to Instagram's Reel mark on the grid */}
    <svg width="130" height="250" viewBox="0 0 130 250" style={{ position: "absolute", top: TOP + 34, left: 112 }}>
      <path d="M12 0 L112 0 L112 236 L62 196 L12 236 Z" fill="rgba(0,0,0,.4)" transform="translate(6 8)" />
      <path d="M12 0 L112 0 L112 236 L62 196 L12 236 Z" fill={sig.main} />
      <path d="M12 0 L40 0 L40 214 L12 236 Z" fill={sig.deep} opacity=".55" />
    </svg>
    {/* a thin brass frame round the middle square */}
    <div style={{ position: "absolute", top: TOP + 40, left: 40, right: 40, height: 1000, border: `2px solid ${T.brass}`, borderRadius: 16 }} />
    <div style={{ position: "absolute", top: TOP + 52, left: 52, right: 52, height: 976, border: `3px solid ${sig.main}`, opacity: 0.75, borderRadius: 12 }} />
  </AbsoluteFill>
  );
};
