// Draws a plan of the set style (plans.ts): Divan's war-room table under its
// lamp. Ink-green baize with a faint topographic map in it and a plotting
// grid, thin brass rules and a compass rose set into it, the region's map for
// the war, and the episode's dossier plates, brass seals and pins lying on it.
// The camera (space.ts) moves the whole table; nothing here decides where or
// when, it only draws what the plan says at the frame it is asked for.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Emblem } from "../emblems";
import { NASKH, VAZIR } from "../kit";
import { makeMap } from "../geo";
import { FPS, H, W, COL_X, EYE_Y, poseAt, project, seen, speedAt, type Hud, type Line, type Piece, type Plan, type Pose } from "./space.ts";
import { WAR_EXTENT } from "./plans.ts";

/** Divan's set colours: ink green, brass, paper. The three meanings of the site stay (blue nearer the goal, red a strike, yellow a claim). */
export const T = {
  baize: "#123a31",
  baizeLit: "#1d5446",
  baizeEdge: "#0b241e",
  plate: "rgba(10,31,26,.93)",
  plateLit: "rgba(16,44,37,.95)",
  brass: "#c9a45c",
  brassLight: "#ead08f",
  brassDark: "#8a6b32",
  ink: "#f2ebd9",
  ink2: "#cfc7b2",
  acc: "#ead08f",
  good: "#8fbbe6",
  strike: "#e0664f",
  claim: "#ecc56b",
  sea: "#0e2f28",
  land: "#174538",
  iran: "#2a5a44",
};
const COLOR: Record<string, string> = { ink: T.ink, ink2: T.ink2, acc: T.acc, claim: T.claim, good: T.good, bad: T.strike, both: T.claim };
const SFX_VOLUME: Record<string, number> = { whoosh: 0.3, hit: 0.5, tick: 0.22, pop: 0.28, rise: 0.36, swish: 0.24 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const familyOf = (l: Line) => (l.family === "naskh" ? NASKH : VAZIR);

// ---------- the cloth: a topographic map in the baize ----------
/** Closed contour lines round a few hills, from a fixed seed (the same table in every Reel). */
function contours(): string[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const hills = Array.from({ length: 9 }, () => ({ x: (rnd() - 0.5) * 6200, y: (rnd() - 0.4) * 6400, r: 300 + rnd() * 500, k: [rnd() * 6, rnd() * 6, rnd() * 6] }));
  const out: string[] = [];
  for (const h of hills) {
    for (let ring = 1; ring <= 7; ring += 1) {
      const pts: string[] = [];
      for (let i = 0; i <= 72; i += 1) {
        const a = (i / 72) * Math.PI * 2;
        const wob = 1 + 0.16 * Math.sin(3 * a + h.k[0]) + 0.09 * Math.sin(5 * a + h.k[1] + ring * 0.3) + 0.05 * Math.sin(9 * a + h.k[2]);
        const r = h.r * ring * 0.42 * wob;
        pts.push(`${(h.x + Math.cos(a) * r).toFixed(0)},${(h.y + Math.sin(a) * r * 0.82).toFixed(0)}`);
      }
      out.push(`M${pts.join("L")}Z`);
    }
  }
  return out;
}

/** The compass rose of the table and of the tile: sixteen points, the north in brass light. */
export const Compass: React.FC<{ size: number; color?: string; spin?: number; opacity?: number }> = ({ size, color = T.brass, spin = 0, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ display: "block", opacity, transform: `rotate(${spin}deg)` }}>
    <circle r="96" fill="none" stroke={color} strokeWidth="1.6" />
    <circle r="88" fill="none" stroke={color} strokeWidth="0.8" />
    <circle r="40" fill="none" stroke={color} strokeWidth="0.8" />
    {Array.from({ length: 64 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2;
      const r0 = i % 4 === 0 ? 80 : 85;
      return <line key={i} x1={Math.sin(a) * r0} y1={-Math.cos(a) * r0} x2={Math.sin(a) * 88} y2={-Math.cos(a) * 88} stroke={color} strokeWidth={i % 4 === 0 ? 1.4 : 0.7} />;
    })}
    {Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const long = i % 4 === 0 ? 78 : i % 2 === 0 ? 56 : 40;
      const side = i % 4 === 0 ? 11 : 7;
      const tip = [Math.sin(a) * long, -Math.cos(a) * long];
      const l = [Math.sin(a - Math.PI / 2) * side, -Math.cos(a - Math.PI / 2) * side];
      const r = [Math.sin(a + Math.PI / 2) * side, -Math.cos(a + Math.PI / 2) * side];
      return (
        <g key={i}>
          <path d={`M${l[0]},${l[1]}L${tip[0]},${tip[1]}L0,0Z`} fill={i === 0 ? T.brassLight : color} opacity={i % 4 === 0 ? 0.95 : 0.55} />
          <path d={`M${r[0]},${r[1]}L${tip[0]},${tip[1]}L0,0Z`} fill="none" stroke={color} strokeWidth="0.9" opacity={i % 4 === 0 ? 0.95 : 0.55} />
        </g>
      );
    })}
    <circle r="5" fill={T.brassLight} />
  </svg>
);

/** The baize, its grid, its contour lines, its brass rules and compass roses: drawn once, moved by the camera. */
const Cloth: React.FC<{ frame: number }> = ({ frame }) => {
  const lines = useMemo(contours, []);
  const R = 4200;
  return (
    <>
      <div style={{ position: "absolute", left: -R, top: -R, width: 2 * R, height: 2 * R, background: `radial-gradient(closest-side, ${T.baizeLit}, ${T.baize} 55%, ${T.baizeEdge})` }} />
      <div style={{ position: "absolute", left: -R, top: -R, width: 2 * R, height: 2 * R, opacity: 0.35, backgroundImage: `linear-gradient(rgba(234,208,143,.09) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(234,208,143,.09) 1.5px, transparent 1.5px)`, backgroundSize: "160px 160px" }} />
      <svg width={2 * R} height={2 * R} viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} style={{ position: "absolute", left: -R, top: -R }}>
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={T.brassLight} strokeWidth={i % 7 === 6 ? 3 : 1.8} opacity={i % 7 === 6 ? 0.16 : 0.1} />
        ))}
        {/* brass plotting rules between the stations, with their ticks */}
        {[-1300, 1050, 2850].map((y) => (
          <g key={y} opacity={0.5}>
            <line x1={-R} y1={y} x2={R} y2={y} stroke={T.brass} strokeWidth="3" />
            {Array.from({ length: 106 }, (_, i) => (
              <line key={i} x1={-R + i * 80} y1={y} x2={-R + i * 80} y2={y + (i % 5 === 0 ? 34 : 16)} stroke={T.brass} strokeWidth="2" />
            ))}
          </g>
        ))}
      </svg>
      {/* compass roses set into the table, turning very slowly */}
      {[
        [0, 640, 520],
        [1650, 420, 440],
        [380, 2520, 460],
        [-1600, 1250, 480],
        [1400, 2900, 420],
        [-1200, 3050, 420],
        [-2200, -900, 600],
        [2400, -1200, 560],
      ].map(([x, y, s]) => (
        <div key={`${x},${y}`} style={{ position: "absolute", left: x - s / 2, top: y - s / 2 }}>
          <Compass size={s} spin={frame * 0.08} opacity={0.5} />
        </div>
      ))}
    </>
  );
};

// ---------- the war map ----------
const TRUST: Record<string, string> = { confirmed: T.strike, claim: T.claim, unverified: T.ink2 };
const WarMap: React.FC<{ plan: Plan; frame: number }> = ({ plan, frame }) => {
  const m = plan.map!;
  const map = useMemo(() => makeMap(WAR_EXTENT, { x0: m.at[0] - m.w / 2, y0: m.at[1] - m.h / 2, x1: m.at[0] + m.w / 2, y1: m.at[1] + m.h / 2 }), [m]);
  const x0 = m.at[0] - m.w / 2 - 400;
  const y0 = m.at[1] - m.h / 2 - 400;
  // at the first frame and the last the replay is whole (the loop); between, the events come day by day
  const replay = frame >= (plan.shots[1]?.at ?? 0) && frame < plan.home;
  return (
    <svg width={m.w + 800} height={m.h + 800} viewBox={`${x0} ${y0} ${m.w + 800} ${m.h + 800}`} style={{ position: "absolute", left: x0, top: y0 }}>
      <rect x={m.at[0] - m.w / 2 - 30} y={m.at[1] - m.h / 2 - 30} width={m.w + 60} height={m.h + 60} fill={T.sea} stroke={T.brass} strokeWidth="3" />
      <rect x={m.at[0] - m.w / 2 - 44} y={m.at[1] - m.h / 2 - 44} width={m.w + 88} height={m.h + 88} fill="none" stroke={T.brass} strokeWidth="1.2" opacity=".7" />
      <path d={map.grat} fill="none" stroke={T.brassLight} strokeWidth="1" opacity=".12" />
      <path d={map.land} fill={T.land} stroke="rgba(234,208,143,.25)" strokeWidth="1.4" />
      <path d={map.iran} fill={T.iran} />
      <path d={map.borders} fill="none" stroke="rgba(234,208,143,.3)" strokeWidth="1.5" strokeDasharray="6 6" />
      <path d={map.iran} fill="none" stroke={T.brassLight} strokeWidth="3" opacity=".9" />
      {m.pins.map((p, i) => {
        const since = replay ? frame - p.from : 99;
        if (since < 0) return null;
        const pop = interpolate(since, [0, 6], [0, 1], clamp);
        const ring = interpolate(since, [0, 24], [0, 1], clamp);
        const col = TRUST[p.t];
        return (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            {since < 24 ? <circle r={10 + ring * 46} fill="none" stroke={col} strokeWidth="2.6" opacity={0.9 * (1 - ring)} /> : null}
            <g transform={`scale(${pop})`}>
              {p.t === "confirmed" ? <circle r="8" fill={col} /> : p.t === "claim" ? <circle r="9" fill={T.sea} stroke={col} strokeWidth="3" strokeDasharray="4 3" /> : <circle r="7.5" fill={T.sea} stroke={col} strokeWidth="2.4" />}
            </g>
          </g>
        );
      })}
    </svg>
  );
};

// ---------- the pieces ----------
const Text: React.FC<{ lines: Line[]; align?: "start" | "center"; opacity?: number }> = ({ lines, align = "start", opacity = 1 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", opacity }}>
    {lines.map((l, i) => (
      <div key={i} dir="rtl" style={{ fontFamily: familyOf(l), fontSize: l.size, fontWeight: l.weight, color: COLOR[l.color ?? "ink"] ?? T.ink, lineHeight: 1.42, whiteSpace: "nowrap", unicodeBidi: "plaintext" }}>
        {latin(l.text)}
      </div>
    ))}
  </div>
);
/** Latin runs (a source's name) kept whole inside a Persian line, so their brackets and words keep their order. */
const latin = (s: string) => s.split(/([A-Za-z][A-Za-z0-9 .,'&()-]*[A-Za-z0-9.)])/g).map((part, i) => (i % 2 ? <bdi key={i} dir="ltr">{part}</bdi> : part));
/** A brass frame: a thin outer line, a finer inner one and four corner marks. */
const Brass: React.FC<{ lit?: boolean; radius?: number }> = ({ lit, radius = 10 }) => (
  <>
    <div style={{ position: "absolute", inset: 0, borderRadius: radius, border: `2px solid ${lit ? T.brassLight : T.brass}`, boxShadow: lit ? `0 0 34px rgba(234,208,143,.35), inset 0 0 24px rgba(234,208,143,.12)` : "none" }} />
    <div style={{ position: "absolute", inset: 9, borderRadius: Math.max(0, radius - 5), border: `1px solid rgba(201,164,92,.45)` }} />
    {[
      { top: -3, right: -3, borderTop: 1, borderRight: 1 },
      { top: -3, left: -3, borderTop: 1, borderLeft: 1 },
      { bottom: -3, right: -3, borderBottom: 1, borderRight: 1 },
      { bottom: -3, left: -3, borderBottom: 1, borderLeft: 1 },
    ].map((c, i) => (
      <div key={i} style={{ position: "absolute", width: 26, height: 26, ...Object.fromEntries(Object.entries(c).map(([k, v]) => (k.startsWith("border") ? [k, `4px solid ${T.brassLight}`] : [k, v]))) }} />
    ))}
  </>
);
const countText = (to: number, decimals: number, u: number) => new Intl.NumberFormat("fa-IR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true }).format(to * u);

const Body: React.FC<{ p: Piece; frame: number }> = ({ p, frame }) => {
  const reveal = p.reveal ? interpolate(frame, [p.reveal, p.reveal + 8], [0, 1], clamp) : 1;
  const counting = p.count && frame < p.count.from + p.count.frames;
  const shown = (lines: Line[]) => (counting && p.count ? lines.map((l, i) => (i === (p.kind === "legend" ? 1 : 0) ? { ...l, text: countText(p.count!.to, p.count!.decimals, interpolate(frame, [p.count!.from, p.count!.from + p.count!.frames], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 })) } : l)) : lines);
  if (p.kind === "plate" || p.kind === "ask" || p.kind === "chip") {
    return (
      <div style={{ position: "absolute", inset: 0, background: p.kind === "chip" ? "rgba(8,24,20,.8)" : T.plate, borderRadius: 10, padding: p.kind === "chip" ? "12px 20px" : "34px 36px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {p.kind === "chip" ? <div style={{ position: "absolute", inset: 0, borderRadius: 10, border: `1px solid rgba(201,164,92,.5)` }} /> : <Brass />}
        <Text lines={p.lines ?? []} opacity={reveal} />
      </div>
    );
  }
  if (p.kind === "figure" || p.kind === "counter") {
    const draw = interpolate(frame, [Math.max(0, (p.show[0]?.[0] ?? 0) - 2), (p.show[0]?.[0] ?? 0) + 22], [0, 1], clamp);
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`} style={{ position: "absolute", inset: 0 }}>
          <rect x="3" y="3" width={p.w - 6} height={p.h - 6} rx="14" fill="rgba(8,26,22,.72)" stroke={T.brass} strokeWidth="2" />
          <line x1={40} y1={p.h - 26} x2={40 + (p.w - 80) * (p.kind === "counter" ? 1 : draw)} y2={p.h - 26} stroke={T.brassLight} strokeWidth="4" />
          {Array.from({ length: 21 }, (_, i) => (
            <line key={i} x1={40 + ((p.w - 80) * i) / 20} y1={p.h - 26} x2={40 + ((p.w - 80) * i) / 20} y2={p.h - (i % 5 === 0 ? 50 : 38)} stroke={T.brass} strokeWidth="2" opacity={0.8} />
          ))}
        </svg>
        {/* above the drawn box: an absolute box paints over text that is not positioned */}
        <div style={{ position: "relative" }}>
          <Text lines={shown(p.lines ?? [])} align="center" />
        </div>
      </div>
    );
  }
  if (p.kind === "seal") {
    const col = p.lit ? COLOR[p.lit] : T.brass;
    const size = Math.min(p.w, p.lines?.length ? p.h - 110 : p.h) - 10;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: 6 }}>
        <div style={{ width: size, height: size, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #3a5a45, #12322a 70%)", border: `3px solid ${col}`, boxShadow: `0 0 0 8px rgba(10,31,26,.9), 0 0 0 10px ${T.brassDark}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Emblem id={p.emblem ?? "seat"} size={size * 0.56} color={p.lit ? col : T.brassLight} stroke={1.2} />
        </div>
        {p.lines?.length ? <Text lines={p.lines.map((l, i) => (i === 1 ? { ...l, color: p.lit ?? "acc" } : l))} align="center" /> : null}
      </div>
    );
  }
  if (p.kind === "road") {
    const lit = p.lit === "acc";
    return (
      <div style={{ position: "absolute", inset: 0, background: lit ? T.plateLit : T.plate, borderRadius: 14, display: "flex", alignItems: "center", gap: 30, padding: "0 34px", boxSizing: "border-box" }}>
        <Brass lit={lit} radius={14} />
        <div style={{ flex: "none", width: p.h - 70, height: p.h - 70, borderRadius: "50%", border: `3px solid ${lit ? T.brassLight : T.brass}`, background: lit ? T.brass : "rgba(201,164,92,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: (p.h - 70) * 0.52, color: lit ? "#10261f" : T.brassLight }}>{p.mark}</div>
        <Text lines={p.lines ?? []} opacity={reveal} />
      </div>
    );
  }
  if (p.kind === "legend") {
    const col = TRUST[p.mark ?? "confirmed"];
    const [label, n] = shown(p.lines ?? []);
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 24, padding: "0 30px", background: "rgba(8,26,22,.7)", borderRadius: 10, border: `1px solid rgba(201,164,92,.45)` }}>
        <svg width="44" height="44" viewBox="-22 -22 44 44" style={{ flex: "none" }}>
          {p.mark === "confirmed" ? <circle r="12" fill={col} /> : p.mark === "claim" ? <circle r="13" fill="none" stroke={col} strokeWidth="4" strokeDasharray="6 4" /> : <circle r="12" fill="none" stroke={col} strokeWidth="3.5" />}
        </svg>
        <Text lines={[label]} />
        <div style={{ marginInlineStart: "auto" }}>
          <Text lines={[{ ...n, color: "acc" }]} />
        </div>
      </div>
    );
  }
  return null;
};

const PieceView: React.FC<{ p: Piece; pose: Pose; frame: number }> = ({ p, pose, frame }) => {
  const v = seen(p.show, frame);
  if (v <= 0.001) return null;
  const c = project(p.at, pose, p.lift);
  // a piece settles onto the table as it comes: a little larger and higher first
  const enter = p.show.find(([a, b]) => frame >= a && frame < b);
  const settle = enter && enter[0] > 0 ? interpolate(frame - enter[0], [0, 10], [1.06, 1], clamp) : 1;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: p.w, height: p.h, marginLeft: -p.w / 2, marginTop: -p.h / 2, transform: `rotate(${-pose.turn}deg) scale(${c.k * settle})`, opacity: v, filter: `drop-shadow(${8 + p.lift * 160}px ${14 + p.lift * 260}px ${10 + p.lift * 200}px rgba(0,0,0,.5))` }}>
      <Body p={p} frame={frame} />
    </div>
  );
};

// ---------- the screen lines ----------
const HudView: React.FC<{ h: Hud; frame: number }> = ({ h, frame }) => {
  const v = seen(h.show, frame);
  if (v <= 0.001) return null;
  if (h.kind === "badge") {
    const pop = interpolate(frame - h.show[0][0], [0, 8], [0.85, 1], clamp);
    return (
      <div style={{ position: "absolute", left: h.box.x, top: h.box.y, width: h.box.w, height: h.box.h, opacity: v, transform: `scale(${pop})`, transformOrigin: "left center", borderRadius: h.box.h / 2, background: "rgba(8,26,22,.88)", border: `1.5px solid ${T.brass}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, direction: "rtl" }}>
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: h.lines[0].size, color: T.ink, lineHeight: 1 }}>{h.lines[0].text}</span>
        {/* a tiny like heart and a tiny follow mark, no words */}
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill={T.strike} />
        </svg>
        <svg width="34" height="34" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke={T.brassLight} strokeWidth="2" />
          <path d="M12 7.5v9M7.5 12h9" stroke={T.brassLight} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  const strip = h.kind === "day";
  return (
    <div style={{ position: "absolute", left: h.box.x, top: h.box.y, width: h.box.w, height: h.box.h, opacity: v, borderRadius: strip ? 8 : 12, background: strip ? "rgba(10,31,26,.92)" : "rgba(6,20,17,.74)", border: `${strip ? 2 : 1}px solid ${strip ? T.brass : "rgba(201,164,92,.45)"}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
      <Text lines={h.lines} align="center" />
    </div>
  );
};

/** The whole frame of a set Reel. */
export const Table: React.FC<{ plan: Plan; music?: string }> = ({ plan, music }) => {
  const frame = useCurrentFrame();
  const pose = poseAt(plan.shots, plan.punches, frame);
  const speed = speedAt(plan.shots, plan.punches, frame);
  // a whip blurs the table a little in the direction of travel
  const blur = Math.min(5, Math.max(0, (speed - 30) / 14));
  const a = -pose.turn;
  return (
    <AbsoluteFill style={{ background: T.baizeEdge, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${COL_X}px, ${EYE_Y}px) rotate(${a}deg) scale(${pose.zoom}) translate(${-pose.x}px, ${-pose.y}px)` }}>
          <Cloth frame={frame} />
          {plan.map ? <WarMap plan={plan} frame={frame} /> : null}
        </div>
        {plan.pieces.map((p) => (
          <PieceView key={p.id} p={p} pose={pose} frame={frame} />
        ))}
      </div>
      {/* the lamp over the table, and the room's shadow at the edges */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 46% at 50% 44%, rgba(255,231,176,.13), rgba(255,231,176,0) 70%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,.42) 100%)", pointerEvents: "none" }} />
      {plan.hud.map((h) => (
        <HudView key={h.id} h={h} frame={frame} />
      ))}
      {music ? <Audio src={staticFile(music)} /> : null}
      {plan.voice.map((v, i) => (
        <Sequence key={`v${i}`} from={v.from} durationInFrames={v.frames + 4} layout="none">
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
      {plan.sfx.map((c, i) => (
        <Sequence key={`s${i}`} from={c.at} durationInFrames={Math.round(2 * FPS)} layout="none">
          <Audio src={staticFile(`sfx/${c.name}.wav`)} volume={SFX_VOLUME[c.name] ?? 0.25} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const SIZE = { W, H };
