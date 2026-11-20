// «یک دور» (the seamless-loop Reel, 20 November 2026): one live line of the site
// on Divan's war-room table, drawn as a cycle. It opens on the full line with
// today's figure and «۲٫۸ برابر»; the brass pin runs back along the line to the
// first day while the figure rolls back; the line is plotted again to today, each
// event popping up as the pin reaches it; the full line and «… برابر» again, the
// channel badge for a moment, and the last frame flows into the first. Every
// moving value is a periodic function of the frame (loop-time.ts): the camera's
// sway, the compass roses, the lamp's glint on the rail, the pin's pulse. Music
// only (the bed is made seamless by music.mjs, loopBed); no narrator.
// Every figure comes from the props the site sends (lib/social/formats.ts, loop()).
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { NASKH, Seal, VAZIR, faNum } from "./kit";
import type { LoopProps } from "./props";
import { Cloth, T } from "./set/Table";
import { TableRail } from "./set/props/TableRail";
import { badgeAt, cuesOf, drawingAt, progressAt, reachedAt, runOf, timesAt, wave } from "./loop-time";

const W = 1080;
const H = 1920;
// inside the apps' safe area (set/space.ts ZONES: x 56–888, y 232–1583)
const Z = { left: 70, right: 878, top: 248 };
// the plotting sheet lying on the table, and the plot inside it; time runs from left to right, the oldest day on the
// left and today on the right, whatever the page's direction (the owner, 19 November 2026)
const SHEET = { x: 70, y: 640, w: 808, h: 540 };
const PLOT = { x0: 118, x1: 830, y0: 700, y1: 1090 };
const sx = (x: number) => PLOT.x0 + (x / 100) * (PLOT.x1 - PLOT.x0);
const sy = (y: number) => PLOT.y0 + (y / 100) * (PLOT.y1 - PLOT.y0);
const AMBER = "#e3a534";

/** The value of the line at a place on the time axis (percent), between the two readings either side. */
function valueAt(points: LoopProps["points"], run: number): number {
  const i = points.findIndex((q) => q.x > run + 1e-9);
  if (i < 0) return points[points.length - 1].v;
  if (i === 0) return points[0].v;
  const a = points[i - 1];
  const b = points[i];
  return a.v + ((b.v - a.v) * (run - a.x)) / Math.max(1e-6, b.x - a.x);
}

export const Loop: React.FC<LoopProps & { badge?: boolean }> = (p) => {
  const frame = useCurrentFrame();
  const N = loopDuration(p);
  const pts = p.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const prog = progressAt(frame, N);
  const run = runOf(prog, first.x, last.x);
  const full = prog >= 0.9999;
  const value = full ? last.v : prog <= 0.0001 ? first.v : Math.round(valueAt(pts, run) / 100) * 100;
  const shown = pts.filter((q) => q.x <= run + 1e-6);
  const prev = shown[shown.length - 1] ?? first;
  const next = pts.find((q) => q.x > run + 1e-6);
  const tip = next ? { x: run, y: prev.y + ((next.y - prev.y) * (run - prev.x)) / Math.max(1e-6, next.x - prev.x) } : { x: last.x, y: last.y };
  const line = [...shown, tip].map((q, i) => `${i ? "L" : "M"}${sx(q.x).toFixed(1)} ${sy(q.y).toFixed(1)}`).join(" ");
  const area = `${line} L${sx(tip.x).toFixed(1)} ${PLOT.y1} L${sx(first.x).toFixed(1)} ${PLOT.y1} Z`;
  // the ghost of the whole line stays faint under the drawing, so the sheet is never empty
  const ghost = pts.map((q, i) => `${i ? "L" : "M"}${sx(q.x).toFixed(1)} ${sy(q.y).toFixed(1)}`).join(" ");
  const drawing = drawingAt(frame, N);
  const passed = shown.filter((q) => q.event);
  const event = drawing > 0 ? (passed[passed.length - 1] ?? null) : null;
  const events = pts.filter((q) => q.event).map((q) => reachedAt(q.x, first.x, last.x, N));
  const cues = cuesOf(events, N, p.badge !== false);
  const times = timesAt(frame, N);
  const badge = p.badge === false ? 0 : badgeAt(frame, N);
  // the camera: a slow sway and breath of whole periods per turn
  const zoom = 1.035 + 0.02 * wave(frame, N, 1);
  const dx = 16 * wave(frame, N, 1, 0.6);
  const dy = 10 * wave(frame, N, 2, 1.1);
  const turn = 0.5 * wave(frame, N, 1, 2.0);
  const pulse = 12 + 3 * wave(frame, N, 5);

  return (
    <AbsoluteFill style={{ background: T.baizeEdge, overflow: "hidden", direction: "rtl" }}>
      {/* the table and the sheet on it, under the camera */}
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(${zoom})` }}>
        <div style={{ position: "absolute", left: W / 2, top: H / 2 }}>
          {/* the roses swing a few degrees and back in a turn (Cloth turns them by frame × 0.08°) */}
          <Cloth frame={60 * wave(frame, N, 1)} />
        </div>
        <div style={{ position: "absolute", left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h, borderRadius: 18, background: T.plate, border: `2px solid ${T.brass}`, boxShadow: "14px 26px 40px rgba(0,0,0,.45)" }} />
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="loop-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={T.brassLight} stopOpacity="0.30" />
              <stop offset="1" stopColor={T.brassLight} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((k) => (
            <line key={k} x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.y0 + k * (PLOT.y1 - PLOT.y0)} y2={PLOT.y0 + k * (PLOT.y1 - PLOT.y0)} stroke={T.brass} strokeOpacity={0.22} strokeWidth={1.5} />
          ))}
          <path d={ghost} fill="none" stroke={T.brassLight} strokeOpacity={0.16} strokeWidth={4} strokeDasharray="10 12" />
          <path d={area} fill="url(#loop-area)" />
          <path d={line} fill="none" stroke={T.brassLight} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
          {shown.map((q, i) => (
            <circle key={i} cx={sx(q.x)} cy={sy(q.y)} r={q.event ? 11 : 6} fill={q.event ? AMBER : T.plate} stroke={T.brassLight} strokeWidth={q.approx ? 2 : 3} strokeDasharray={q.approx ? "3 4" : undefined} />
          ))}
          {/* the brass pin at the head of the line */}
          <circle cx={sx(tip.x)} cy={sy(tip.y)} r={pulse + 10} fill="none" stroke={T.brassLight} strokeOpacity={0.45} strokeWidth={2} />
          <circle cx={sx(tip.x)} cy={sy(tip.y)} r={pulse} fill={T.brass} stroke={T.brassLight} strokeWidth={3} />
          <circle cx={sx(tip.x)} cy={sy(tip.y)} r={4} fill={T.baizeEdge} />
          {/* the two ends of the axis */}
          <text x={PLOT.x0} y={PLOT.y1 + 62} textAnchor="start" direction="ltr" fill={T.ink2} style={{ fontFamily: VAZIR, fontSize: 42, fontWeight: 500 }}>
            {first.dateText}
          </text>
          <text x={PLOT.x1} y={PLOT.y1 + 62} textAnchor="end" direction="ltr" fill={T.ink2} style={{ fontFamily: VAZIR, fontSize: 42, fontWeight: 500 }}>
            {last.dateText}
          </text>
        </svg>
      </div>

      {/* the lamp over the table, the room's shadow, the table's near edge */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 46% at 50% 44%, rgba(255,231,176,.13), rgba(255,231,176,0) 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,.42) 100%)" }} />
      {/* the glint walks the whole rail once a turn: TableRail moves it frame × 2.2 px over W + 600 */}
      <TableRail width={W} frame={((frame % N) / N) * ((W + 600) / 2.2)} signal={{ main: AMBER, deep: "#9a6a12" }} />

      {/* the screen lines: whose page, what the line is, today's figure */}
      <div style={{ position: "absolute", top: Z.top, right: W - Z.right, left: Z.left, display: "flex", alignItems: "center", gap: 18 }}>
        <Seal size={70} color={T.brass} word={false} />
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 56, color: T.ink, lineHeight: 1 }}>دیوان</span>
        <span style={{ marginInlineStart: "auto", fontFamily: VAZIR, fontWeight: 700, fontSize: 48, color: T.brassLight, border: `2px solid ${T.brass}`, borderRadius: 40, padding: "4px 22px" }}>{p.kicker}</span>
      </div>
      <div style={{ position: "absolute", top: 360, right: W - Z.right, left: Z.left, textAlign: "center" }}>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 150, lineHeight: 1.05, color: T.brassLight, textShadow: "0 6px 18px rgba(0,0,0,.45)" }}>{faNum(value)}</div>
        <div style={{ marginTop: 12, fontFamily: VAZIR, fontWeight: 500, fontSize: 50, color: T.ink }}>{`${p.unit}، ${prev.dateText}`}</div>
      </div>

      {/* while the line is drawn: the event it has just passed; on the full line: how many times dearer */}
      {event?.event ? (
        <div style={{ position: "absolute", top: 1220, right: W - Z.right, left: Z.left, textAlign: "center", opacity: drawing, fontFamily: VAZIR, fontWeight: 700, fontSize: 52, lineHeight: 1.35, color: T.ink }}>
          {event.event}
        </div>
      ) : null}
      {times > 0.001 ? (
        <div style={{ position: "absolute", top: 1200, right: W - Z.right, left: Z.left, textAlign: "center", opacity: times }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 112, lineHeight: 1.1, color: AMBER }}>{p.times}</div>
          <div style={{ marginTop: 6, fontFamily: VAZIR, fontSize: 48, color: T.ink2 }}>{p.fromTo}</div>
        </div>
      ) : null}

      {/* the channel badge: small, in the bottom safe area, gone before the turn ends */}
      {badge > 0.001 ? (
        <div style={{ position: "absolute", top: 1404, left: (Z.left + Z.right) / 2 - 190, width: 380, height: 78, borderRadius: 39, opacity: badge, background: "rgba(8,26,22,.88)", border: `1.5px solid ${T.brass}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 48, color: T.ink, lineHeight: 1 }}>دیوان</span>
          <svg width="34" height="34" viewBox="0 0 24 24">
            <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={T.strike} />
          </svg>
          <svg width="34" height="34" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke={T.brassLight} strokeWidth="2" />
            <path d="M12 7.5v9M7.5 12h9" stroke={T.brassLight} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
      ) : null}

      {/* the source, on screen with every figure */}
      <div style={{ position: "absolute", top: 1500, right: W - Z.right, left: Z.left, textAlign: "center", fontFamily: VAZIR, fontSize: 40, lineHeight: 1.4, color: T.ink2 }}>{p.source}</div>

      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      {cues.map((c, i) => (
        <Sequence key={`c${i}`} from={c.at} durationInFrames={Math.min(60, N - c.at - 1)} layout="none">
          <Audio src={staticFile(`sfx/${c.name}.wav`)} volume={c.volume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** One turn, as the site set it, kept inside 8 to 15 s. */
export const loopDuration = (p: LoopProps) => Math.max(240, Math.min(450, Math.round(p.frames || 300)));
