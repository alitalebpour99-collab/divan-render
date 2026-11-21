// The Story that follows a Reel onto the page, in the same one style: the navy room, the globe turning slowly to
// Iran behind, the Reel's kicker and title, and «ویدیوی تازه» with the page's handle. 9.5 seconds.
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { CountryFill, DIVAN, MapStage, VAZIR } from "../map-engine";
import { ROOM } from "./Reel";

export const STORY_FRAMES = 285;
export const storyDuration = () => STORY_FRAMES;
type StoryIn = { kicker: string; title: string; mark?: string; ai: boolean; handle: string };

export const RoomStory: React.FC<StoryIn> = (p) => {
  const f = useCurrentFrame();
  const k = (at: number, d = 12) => interpolate(f, [at, at + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  const look = { lon: 20 + 33 * interpolate(f, [0, STORY_FRAMES], [0, 1]), lat: 22 + 8 * k(0, STORY_FRAMES), span: 200 - 150 * k(10, 200) };
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 42%, ${ROOM.bg2} 0%, ${ROOM.bg} 62%, ${ROOM.edge} 100%)` }}>
      <MapStage look={look} frame={{ x: 0, y: 700, w: 1080, h: 1000 }} theme={DIVAN} f={f} uid="story">
        <CountryFill a3="IRN" color={DIVAN.actors.iran} t={f - 40} />
      </MapStage>
      <div style={{ position: "absolute", top: 300, left: 90, width: 900, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ display: "inline-block", background: ROOM.amber, color: ROOM.bg, fontWeight: 800, fontSize: 52, padding: "8px 30px", borderRadius: 999, opacity: k(0) }}>{p.kicker}</div>
        <div style={{ fontWeight: 800, fontSize: 84, color: ROOM.paper, lineHeight: 1.3, marginTop: 30, opacity: k(8), transform: `translateY(${(1 - k(8)) * 30}px)` }}>{p.title}</div>
        {p.ai ? <div style={{ fontWeight: 600, fontSize: 40, color: ROOM.mute, marginTop: 18, opacity: k(20) }}>تحلیل دیوان، با هوش مصنوعی</div> : null}
      </div>
      <div style={{ position: "absolute", top: 1480, left: 90, width: 900, direction: "rtl", fontFamily: VAZIR, opacity: k(60) }}>
        <div style={{ fontWeight: 800, fontSize: 64, color: ROOM.amber }}>ویدیوی تازه در صفحه</div>
        <div style={{ fontWeight: 700, fontSize: 48, color: ROOM.paper, direction: "ltr", textAlign: "right", marginTop: 10 }}>{p.handle}</div>
      </div>
    </AbsoluteFill>
  );
};
