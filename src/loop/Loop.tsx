// «یک دور» (the seamless-loop Reel, approved again by the owner on 23 Nov 2026 in the one style): the live free-market
// dollar line in the navy room of the storyboard Reels. The map of Iran is the ground, Tehran's market marked on it with
// a leader down to the glass chart panel (Reel.tsx draws a chart beat the same way). Frame 0 is the hook: the full line,
// today's reading and «… برابر». The pin runs back along the line to the first day, the figure stepping back through
// the readings; the line is drawn again to today, the pin resting at each event as it pops up in the caption's row;
// the full line and «… برابر» come back, the channel badge shows for a moment and is gone, and the last frame flows
// into the first. Every moving value is periodic in the turn (loop-time.ts, scene.ts). Music only, no narrator. Every
// figure on the screen is a reading the site keeps with its outlet (lib/social/formats.ts, loop()); the source is on
// the screen with them.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CountryFill, DIVAN, MapStage, faNum } from "../map-engine";
import { SeaDetail } from "../map-engine/detail";
import { VAZIR } from "../map-engine/fonts";
import { ROOM, shortSource } from "../storyboard/Reel";
import type { LoopProps } from "../props";
import { cuesOf } from "../loop-time";
import { COLW, H, L, LABEL_SIZE, PANEL, PIN_R, PLOT, ROW_H, SOURCE_TOP, W, eventFrames, headerSize, loopDuration, loopScene, rowSize } from "./scene";

export { loopDuration };

const STAGE = { x: 0, y: 0, w: W, h: H };
const halo = "0 0 10px rgba(11,17,29,0.95), 0 2px 4px rgba(11,17,29,0.95)";

export const Loop: React.FC<LoopProps> = (p) => {
  const f = useCurrentFrame();
  const sc = loopScene(p, f);
  const N = sc.N;
  const pts = p.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  // the line fills its plot (pass 2 of the sample: the site's own 0–100 frame left it flat in a third of the panel):
  // the first reading on the left edge, today on the right, the lowest and highest readings 8 % inside the edges
  const yLo = Math.min(...pts.map((q) => q.y));
  const yHi = Math.max(...pts.map((q) => q.y));
  const sx = (x: number) => PLOT.x0 + ((x - first.x) / Math.max(1e-6, last.x - first.x)) * (PLOT.x1 - PLOT.x0);
  const sy = (y: number) => PLOT.y0 + (0.08 + (0.84 * (y - yLo)) / Math.max(1e-6, yHi - yLo)) * (PLOT.y1 - PLOT.y0);
  const line = [...sc.shown, sc.tip].map((q, i) => `${i ? "L" : "M"}${sx(q.x).toFixed(1)} ${sy(q.y).toFixed(1)}`).join(" ");
  const area = `${line} L${sx(sc.tip.x).toFixed(1)} ${PLOT.y1} L${sx(first.x).toFixed(1)} ${PLOT.y1} Z`;
  // the whole line stays faint under the drawing, so the panel is never empty while the pin runs back
  const ghost = pts.map((q, i) => `${i ? "L" : "M"}${sx(q.x).toFixed(1)} ${sy(q.y).toFixed(1)}`).join(" ");
  const label = sc.words.find((w) => w.kind === "label")!;
  const row = sc.words.find((w) => w.kind === "row");
  const cues = cuesOf(eventFrames(p), N, p.badge !== false);
  const hs = headerSize(p.span);
  const pop = sc.eventAge >= 0 && sc.eventAge < 16 ? sc.eventAge / 16 : -1;
  const ev = sc.event;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 42%, ${ROOM.bg2} 0%, ${ROOM.bg} 62%, ${ROOM.edge} 100%)` }}>
      {/* the ground: Iran in Divan's amber, the camera swaying a little, whole periods a turn */}
      <MapStage look={sc.look} frame={STAGE} theme={DIVAN} f={f} dim={0.1} bleed uid="loop">
        <SeaDetail />
        <CountryFill a3="IRN" color={DIVAN.actors.iran} t={999} opacity={0.5} />
      </MapStage>
      {/* the scrims of the storyboard Reels: the map runs under the header and the bottom rows, darkened there */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 640, background: "linear-gradient(180deg, rgba(22,32,50,0.94) 0%, rgba(22,32,50,0.72) 55%, rgba(22,32,50,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: 1330, width: W, height: 590, background: "linear-gradient(0deg, rgba(22,32,50,0.95) 0%, rgba(22,32,50,0.75) 60%, rgba(22,32,50,0) 100%)" }} />

      {/* Tehran's market on the map: the pin, its ring, its name, the leader down to the panel */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${sc.pin[0]} ${sc.pin[1] + PIN_R} L${sc.pin[0]} ${PANEL.y}`} stroke={ROOM.amber} strokeWidth={4} strokeDasharray="10 8" opacity={0.85} />
        <circle cx={sc.pin[0]} cy={sc.pin[1]} r={PIN_R + sc.pulse * 34} fill="none" stroke={ROOM.amber} strokeWidth={3} opacity={1 - sc.pulse} />
        <circle cx={sc.pin[0]} cy={sc.pin[1]} r={PIN_R} fill={ROOM.amber} stroke={ROOM.paper} strokeWidth={3} />
      </svg>
      <div style={{ position: "absolute", left: label.box.x, top: label.box.y, width: label.box.w, height: label.box.h, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: VAZIR, fontWeight: 800, fontSize: LABEL_SIZE, color: ROOM.paper, textShadow: halo, whiteSpace: "nowrap", direction: "rtl" }}>
        {label.t}
      </div>

      {/* the HUD and the header, where every storyboard Reel has them */}
      <div style={{ position: "absolute", top: 236, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 18, fontFamily: VAZIR }}>
        <div style={{ background: ROOM.amber, color: ROOM.bg, fontWeight: 800, fontSize: 40, padding: "6px 24px", borderRadius: 999, whiteSpace: "nowrap", flex: "none" }}>{p.kicker}</div>
        <div style={{ color: ROOM.mute, fontWeight: 700, fontSize: 38, whiteSpace: "nowrap" }}>{last.dateText}</div>
      </div>
      <div style={{ position: "absolute", top: 330, left: L, width: COLW, direction: "rtl", textAlign: "right", fontFamily: VAZIR, fontWeight: 800, fontSize: hs, lineHeight: 1.22, color: ROOM.paper, textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}>{p.span}</div>

      {/* the glass panel: the reading at the pin, «… برابر», the line */}
      <div style={{ position: "absolute", left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, borderRadius: 32, background: "rgba(22,32,50,0.8)", border: "2px solid rgba(255,176,32,0.25)" }} />
      <div style={{ position: "absolute", top: PANEL.y + 22, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          {sc.reading.approx ? <div style={{ fontWeight: 700, fontSize: 44, color: ROOM.mute }}>حدود</div> : null}
          <div style={{ fontWeight: 800, fontSize: 120, color: ROOM.amber, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{faNum(sc.reading.v)}</div>
          <div style={{ fontWeight: 600, fontSize: 44, color: ROOM.mute }}>{p.unit}</div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 42, color: ROOM.paper, marginTop: 2 }}>{sc.reading.dateText}</div>
      </div>
      <div style={{ position: "absolute", top: PANEL.y + 150, left: L, opacity: sc.times, transform: `scale(${0.9 + 0.1 * sc.times})`, transformOrigin: "left center", background: ROOM.amber, color: ROOM.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 56, padding: "4px 26px", borderRadius: 999, whiteSpace: "nowrap", direction: "rtl" }}>
        {p.times}
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="loop-under" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ROOM.amber} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ROOM.amber} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.y0 + (g * (PLOT.y1 - PLOT.y0)) / 3} y2={PLOT.y0 + (g * (PLOT.y1 - PLOT.y0)) / 3} stroke={ROOM.line} strokeWidth={2} />
        ))}
        <path d={ghost} fill="none" stroke={ROOM.amber} strokeOpacity={0.2} strokeWidth={4} strokeDasharray="10 12" />
        <path d={area} fill="url(#loop-under)" />
        <path d={line} fill="none" stroke={ROOM.amber} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        {sc.shown.map((q, i) =>
          q.event ? (
            <circle key={i} cx={sx(q.x)} cy={sy(q.y)} r={11} fill={ROOM.amber} stroke={ROOM.paper} strokeWidth={4} />
          ) : (
            <circle key={i} cx={sx(q.x)} cy={sy(q.y)} r={7} fill={q.approx ? ROOM.bg : ROOM.paper} stroke={ROOM.paper} strokeWidth={q.approx ? 3 : 0} />
          ),
        )}
        {/* the event the pin has just reached rings once */}
        {ev && pop >= 0 ? <circle cx={sx(ev.x)} cy={sy(ev.y)} r={11 + pop * 40} fill="none" stroke={ROOM.amber} strokeWidth={4} opacity={1 - pop} /> : null}
        {/* the pin at the head of the line; on the full line today's point in red, ringing */}
        {sc.full ? (
          <g>
            <circle cx={sx(last.x)} cy={sy(last.y)} r={16} fill={ROOM.hit} />
            <circle cx={sx(last.x)} cy={sy(last.y)} r={16 + sc.pulse * 30} fill="none" stroke={ROOM.hit} strokeWidth={3} opacity={1 - sc.pulse} />
          </g>
        ) : (
          <circle cx={sx(sc.tip.x)} cy={sy(sc.tip.y)} r={15} fill={ROOM.amber} stroke={ROOM.paper} strokeWidth={4} />
        )}
      </svg>
      {/* the two ends of the time axis, as HTML: an SVG text runs a Persian date's words in the wrong order */}
      <div style={{ position: "absolute", left: PLOT.x0 - 10, top: PLOT.y1 + 20, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 38, color: ROOM.mute, whiteSpace: "nowrap" }}>{first.dateText}</div>
      <div style={{ position: "absolute", right: W - PLOT.x1 - 10, top: PLOT.y1 + 20, direction: "rtl", fontFamily: VAZIR, fontWeight: 700, fontSize: 38, color: ROOM.paper, whiteSpace: "nowrap" }}>{last.dateText}</div>

      {/* the one source line, on the screen with every figure */}
      <div style={{ position: "absolute", top: SOURCE_TOP, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 36, color: ROOM.mute, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        منبع: {shortSource(p.source)}
      </div>

      {/* the caption's row: the event the pin has reached, while the line is drawn */}
      {row ? (
        <div style={{ position: "absolute", left: row.box.x, top: row.box.y, width: row.box.w, height: ROW_H, opacity: sc.drawing, display: "flex", alignItems: "center", gap: 18, padding: "0 26px", boxSizing: "border-box", direction: "rtl", background: "rgba(13,19,34,0.86)", border: `2px solid ${ROOM.amber}`, borderRadius: 999, fontFamily: VAZIR }}>
          <div style={{ width: 24, height: 24, borderRadius: 999, background: ROOM.amber, flex: "none" }} />
          <div style={{ fontWeight: 700, fontSize: rowSize(row.t), color: ROOM.paper, whiteSpace: "nowrap" }}>{row.t}</div>
        </div>
      ) : null}
      {/* the channel badge (PollPic's), small and gone before the turn ends */}
      {sc.badge > 0.001 ? (
        <div style={{ position: "absolute", left: sc.badgeBox.x, top: sc.badgeBox.y, height: ROW_H, boxSizing: "border-box", opacity: sc.badge, transform: `scale(${0.8 + 0.2 * sc.badge})`, transformOrigin: "left center", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,176,32,0.14)", border: `2px solid ${ROOM.amber}`, borderRadius: 999, padding: "0 26px", fontFamily: VAZIR, direction: "rtl" }}>
          <span style={{ color: ROOM.paper, fontWeight: 800, fontSize: 40 }}>دیوان</span>
          <svg width={34} height={30} viewBox="0 0 24 22">
            <path d="M12 21 C-4 10 4 -2 12 5 C20 -2 28 10 12 21 Z" fill={ROOM.hit} />
          </svg>
          <span style={{ color: ROOM.amber, fontWeight: 800, fontSize: 36 }}>+ دنبال کن</span>
        </div>
      ) : null}

      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      {cues.map((c, i) => (
        <Sequence key={`c${i}`} from={c.at} durationInFrames={Math.min(45, N - c.at - 1)} layout="none">
          <Audio src={staticFile(`sfx/${c.name}.wav`)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

