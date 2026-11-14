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

const TOP = (1920 - 1080) / 2;

export const CoverSet: React.FC<{ format: string; big?: string; mark?: string; fitted: Line[] }> = ({ format, fitted }) => (
  <AbsoluteFill style={{ background: `radial-gradient(closest-side, ${T.baizeLit}, ${T.baize} 60%, ${T.baizeEdge})`, direction: "rtl" }}>
    <AbsoluteFill style={{ opacity: 0.35, backgroundImage: `linear-gradient(rgba(234,208,143,.09) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,208,143,.09) 1.5px, transparent 1.5px)`, backgroundSize: "160px 160px" }} />
    {/* the one object: the series' emblem on a brass seal, over the compass rose of the table */}
    <div style={{ position: "absolute", top: TOP + 90, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 430, height: 430 }}>
        <div style={{ position: "absolute", inset: -70, opacity: 0.45 }}>
          <Compass size={570} />
        </div>
        <div style={{ position: "absolute", inset: 70, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #3a5a45, #12322a 70%)", border: `4px solid ${T.brassLight}`, boxShadow: `0 0 0 12px rgba(10,31,26,.9), 0 0 0 15px ${T.brassDark}, 0 30px 60px rgba(0,0,0,.5)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Emblem id={EMBLEM[format] ?? "seat"} size={170} color={T.brassLight} stroke={1.2} />
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", top: TOP + 560, left: 80, right: 80, height: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {fitted.map((l, i) => (
        <div key={i} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: l.size, lineHeight: 1.3, color: T.ink, whiteSpace: "nowrap", unicodeBidi: "plaintext" }}>
          {l.text}
        </div>
      ))}
    </div>
    {/* a thin brass frame round the middle square */}
    <div style={{ position: "absolute", top: TOP + 40, left: 40, right: 40, height: 1000, border: `2px solid ${T.brass}`, borderRadius: 16 }} />
    <div style={{ position: "absolute", top: TOP + 52, left: 52, right: 52, height: 976, border: "1px solid rgba(201,164,92,.45)", borderRadius: 12 }} />
  </AbsoluteFill>
);
