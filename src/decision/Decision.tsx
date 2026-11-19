// «تصمیم امروز» and the formats made from the same day's analysis: Divan's decision room (owner, 19 Nov 2026:
// «خوب و قشنگ بود»). The event on the stage from frame 0 (a live map, a chart of the last days, or the news wire
// as it came in), what weighs on the decision, two or three cards (roads, scenarios, advisors, last week's
// decisions), Divan's estimate on a gauge when there is one, and a poll-style close; the last frames bring the
// first picture back, so the Reel loops. Every word comes from the props (types.ts); the timing and the checks
// are in timeline.ts.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VAZIR } from "../kit";
import { makeMap } from "../geo";
import { CARD_IN, CARD_OUT, FACT_AT, LOOP, PEN, ROW_AT, ROW_IN, chartX, checksOf, scenesOf } from "./timeline";
import type { Card, ChartSpec, DecisionCoverProps, DecisionProps, MapSpec, Row, WireSpec } from "./types";

// the room: deep navy, never near-black (the gate counts near-black pixels), brass-amber for Divan's own marks
const C = {
  bg: "#1a2330",
  bg2: "#202b3a",
  edge: "#151d28",
  panel: "rgba(34,45,60,0.95)",
  line: "#34445a",
  paper: "#f3efe6",
  mute: "#a3afbd",
  amber: "#ffb020",
  hit: "#ff4d40",
  sea: "#16283c",
  land: "#26334450",
  landSolid: "#263344",
  iran: "#2e3e52",
};
// the safe column (the apps' buttons sit right and below)
const L = 64;
const R = 884;
const W = R - L;

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const rise = (f: number, at: number, dur = 12) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease });
const faDigits = (s: string) => s.replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[Number(x)]);

export const decisionMeta = ({ props }: { props: DecisionProps }) => {
  const { scenes, voice, total } = scenesOf(props, props.voiceIn ?? []);
  const qc = checksOf(props, scenes, voice, total);
  return { durationInFrames: total, props: { ...props, scenes, voice, drone: true, qc } };
};

const Words: React.FC<{ text: string; at: number; size: number; color?: string; weight?: number; stagger?: number }> = ({ text, at, size, color = C.paper, weight = 800, stagger = 3 }) => {
  const f = useCurrentFrame();
  const list = text.split(" ");
  return (
    <span style={{ fontFamily: VAZIR, fontSize: size, fontWeight: weight, color, lineHeight: 1.32 }}>
      {list.map((w, i) => {
        const k = rise(f, at + i * stagger, 10);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${(1 - k) * 0.5 * size}px)`, opacity: k, filter: `blur(${(1 - k) * 6}px)` }}>
            {w}
            {i < list.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
};

const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.45 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// ---------------- the stage: the event, from frame 0 ----------------

/** A tanker seen from the side: hull, bridge at the stern, deck pipes; on fire when the props say so. */
const Tanker: React.FC<{ x: number; y: number; fire?: boolean; rot?: number; f: number; s?: number }> = ({ x, y, fire, rot = 0, f, s = 1 }) => {
  const flick = (k: number) => 1 + 0.18 * Math.sin(f / 2.3 + k) + 0.1 * Math.sin(f / 1.1 + k * 3);
  const puff = (f % 40) / 40;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M-46 0 L42 0 L50 -8 L-50 -8 Z" fill="#c9d2dc" />
      <path d="M-50 -8 L50 -8 L46 -14 L-46 -14 Z" fill="#7f8b98" />
      <rect x={-44} y={-26} width={16} height={12} fill="#e8edf2" />
      <rect x={-40} y={-32} width={4} height={6} fill="#e8edf2" />
      {[-18, -4, 10, 24].map((px) => (
        <rect key={px} x={px} y={-17} width={9} height={3} fill="#5b6672" />
      ))}
      {fire ? (
        <g>
          <ellipse cx={-6} cy={-58 - puff * 40} rx={18 + puff * 20} ry={10 + puff * 10} fill="#55606c" opacity={0.55 * (1 - puff)} />
          <ellipse cx={6} cy={-22} rx={20 * flick(1)} ry={14 * flick(2)} fill="#ff6a00" opacity={0.85} />
          <ellipse cx={4} cy={-28} rx={12 * flick(3)} ry={12 * flick(4)} fill="#ffb020" />
          <ellipse cx={2} cy={-31} rx={5} ry={6 * flick(5)} fill="#fff1b8" />
        </g>
      ) : null}
    </g>
  );
};

/** A target on the map: a crosshair with a ring that keeps pulsing outward. */
const Hit: React.FC<{ x: number; y: number; f: number; t: string; phase: number; side: "l" | "r" }> = ({ x, y, f, t, phase, side }) => {
  const p = ((f + phase) % 36) / 36;
  return (
    <g>
      <circle cx={x} cy={y} r={14 + p * 46} fill="none" stroke={C.hit} strokeWidth={3} opacity={(1 - p) * 0.9} />
      <circle cx={x} cy={y} r={11} fill={C.hit} />
      <path d={`M${x - 22} ${y} H${x - 14} M${x + 14} ${y} H${x + 22} M${x} ${y - 22} V${y - 14} M${x} ${y + 14} V${y + 22}`} stroke="#fff" strokeWidth={3} />
      <text x={side === "l" ? x - 34 : x + 34} y={y + 13} textAnchor={side === "l" ? "end" : "start"} fill={C.paper} fontFamily={VAZIR} fontWeight={800} fontSize={40} style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: 8 }}>
        {t}
      </text>
    </g>
  );
};

const BOX = { x0: 20, y0: 560, x1: 1060, y1: 1420 };

const MapStage: React.FC<{ map: MapSpec; zoom: number; dim: number }> = ({ map, zoom, dim }) => {
  const f = useCurrentFrame();
  const m = React.useMemo(() => makeMap(map.extent, BOX), [map.extent]);
  const cx = (BOX.x0 + BOX.x1) / 2;
  const cy = (BOX.y0 + BOX.y1) / 2;
  return (
    <AbsoluteFill style={{ opacity: 1 - dim * 0.6 }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <clipPath id="mapclip">
            <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} rx={28} />
          </clipPath>
          <radialGradient id="seaglow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1d3550" />
            <stop offset="100%" stopColor={C.sea} />
          </radialGradient>
        </defs>
        <g clipPath="url(#mapclip)">
          <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} fill="url(#seaglow)" />
          <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
            <path d={m.grat} fill="none" stroke="#22394f" strokeWidth={1} />
            <path d={m.land} fill={C.landSolid} />
            <path d={m.iran} fill={C.iran} stroke={C.amber} strokeOpacity={0.75} strokeWidth={2.5} />
            <path d={m.borders} fill="none" stroke="#46576b" strokeWidth={1.5} />
            {(map.labels ?? []).map((l, i) => {
              const [x, y] = m.at(l.lon, l.lat);
              return (
                <text key={i} x={x} y={y} textAnchor="middle" fill={C.mute} fontFamily={VAZIR} fontWeight={700} fontSize={l.size ?? 36}>
                  {l.t}
                </text>
              );
            })}
            {(map.arcs ?? []).map((a, i) => {
              const [x0, y0] = m.at(a.from[0], a.from[1]);
              const [x1, y1] = m.at(a.to[0], a.to[1]);
              const my = Math.min(y0, y1) - 160;
              // drawn whole from frame 0, the dashes flowing along it: the same picture at the start and at the loop
              return <path key={i} d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${my} ${x1} ${y1}`} fill="none" stroke={C.amber} strokeWidth={4} strokeDasharray="18 12" strokeDashoffset={-f * 1.5} strokeLinecap="round" opacity={0.9} />;
            })}
            {(map.tankers ?? []).map((t, i) => {
              const [x, y] = m.at(t.lon, t.lat);
              return <Tanker key={i} x={x} y={y + Math.sin(f / 9 + i) * 3} fire={t.fire} rot={t.rot} f={f + i * 7} s={1.15} />;
            })}
            {map.pair
              ? (() => {
                  const [x, y] = m.at(map.pair.lon, map.pair.lat);
                  return (
                    <g>
                      <Tanker x={x - 52} y={y} f={f} s={0.9} />
                      <Tanker x={x + 52} y={y} f={f} s={0.9} />
                      <path d={`M${x - 20} ${y - 18} Q${x} ${y - 46} ${x + 20} ${y - 18}`} fill="none" stroke={C.amber} strokeWidth={4} strokeDasharray="8 6" strokeDashoffset={-f} />
                      <text x={x} y={y + 52} textAnchor="middle" fill={C.paper} fontFamily={VAZIR} fontWeight={700} fontSize={34} style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: 8 }}>
                        {map.pair.t}
                      </text>
                    </g>
                  );
                })()
              : null}
            {(map.hits ?? []).map((h, i) => {
              const [x, y] = m.at(h.lon, h.lat);
              return <Hit key={i} x={x} y={y} f={f} t={h.t} phase={i * 12} side={x < 380 ? "r" : "l"} />;
            })}
          </g>
        </g>
        <rect x={BOX.x0} y={BOX.y0} width={BOX.x1 - BOX.x0} height={BOX.y1 - BOX.y0} rx={28} fill="none" stroke={C.line} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", top: BOX.y1 + 18, left: L, width: W, direction: "rtl", fontFamily: VAZIR, fontSize: 34, fontWeight: 500, color: C.mute, opacity: Math.max(0, 1 - dim * 3) }}>{map.source}</div>
    </AbsoluteFill>
  );
};

/** The day's headline on a strip of wire paper, its outlets stamped beside it. */
const WireStage: React.FC<{ wire: WireSpec; zoom: number; dim: number }> = ({ wire, zoom, dim }) => {
  const f = useCurrentFrame();
  const typed = Math.min(wire.headline.length, Math.max(Math.round(wire.headline.length * 0.55), Math.round(f * 1.6)));
  return (
    <AbsoluteFill style={{ opacity: 1 - dim * 0.65 }}>
      <div style={{ position: "absolute", top: 620, left: L - 10, width: W + 20, transform: `scale(${zoom}) rotate(-1.2deg)`, transformOrigin: "50% 30%", background: "#efe9dc", borderRadius: 10, padding: "34px 36px 30px", boxShadow: "0 40px 90px rgba(0,0,0,0.45)", direction: "rtl" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: "#6b6150", borderBottom: "2px dashed #b9ae98", paddingBottom: 12 }}>
          <span>خبر رسید</span>
          <span>{wire.when}</span>
        </div>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 54, color: "#1b2330", lineHeight: 1.4, marginTop: 18, minHeight: 230 }}>
          {wire.headline.slice(0, typed)}
          <span style={{ opacity: f % 20 < 10 ? 1 : 0, color: C.hit }}>{typed < wire.headline.length ? "▍" : ""}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18 }}>
          {wire.outlets.slice(0, 5).map((o, i) => (
            <span key={i} style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: "#8a2a1f", border: "3px solid #8a2a1f", borderRadius: 8, padding: "2px 14px", transform: `rotate(${(i % 2 ? 1 : -1) * 2}deg)`, opacity: 0.9 }}>
              {o}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", top: 1440, left: L, width: W, direction: "rtl", fontFamily: VAZIR, fontSize: 34, fontWeight: 500, color: C.mute, opacity: Math.max(0, 1 - dim * 3) }}>{wire.source}</div>
    </AbsoluteFill>
  );
};

/**
 * A line of the last days. Time runs left to right whatever the page's direction (chartX): the pen draws from the
 * oldest point on the left to today's on the right, where the red mark stands; the counter reads the value under
 * the pen, so it ends exactly on today's figure as the pen does.
 */
const Chart: React.FC<{ chart: ChartSpec; len: number; top: number; local: number; start?: number }> = ({ chart, len, top, local, start = 0 }) => {
  const f = local;
  const pts = chart.points;
  const lo0 = Math.min(...pts);
  const hi0 = Math.max(...pts);
  const pad = (hi0 - lo0) * 0.12 || 1;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const box = { x0: L + 30, x1: R - 30, y0: top + 260, y1: top + 600 };
  const X = (i: number) => chartX(i, pts.length, box.x0, box.x1);
  const Y = (v: number) => box.y1 - ((v - lo) / (hi - lo)) * (box.y1 - box.y0);
  const k = start + (1 - start) * interpolate(f, [len * PEN[0], len * PEN[1]], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const head = k * (pts.length - 1);
  const i0 = Math.floor(head);
  const t = head - i0;
  const under = i0 >= pts.length - 1 ? pts[pts.length - 1] : pts[i0] + (pts[i0 + 1] - pts[i0]) * t;
  const headX = box.x0 + k * (box.x1 - box.x0);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(pts.length - 1).toFixed(1)} ${box.y1} L${X(0).toFixed(1)} ${box.y1} Z`;
  const digits = chart.digits ?? 2;
  const shown = faDigits(under.toFixed(digits)).replace(".", "٫");
  const done = k >= 0.999;
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top, left: L, width: W, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ fontWeight: 700, fontSize: 44, color: C.paper }}>{chart.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 150, color: C.amber, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{shown}</div>
          <div style={{ fontWeight: 600, fontSize: 44, color: C.mute }}>{chart.unit}</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="pen">
            <rect x={box.x0 - 40} y={box.y0 - 40} width={headX - box.x0 + 40} height={box.y1 - box.y0 + 80} />
          </clipPath>
          <linearGradient id="under" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={box.x0} x2={box.x1} y1={box.y0 + (g * (box.y1 - box.y0)) / 3} y2={box.y0 + (g * (box.y1 - box.y0)) / 3} stroke={C.line} strokeWidth={2} />
        ))}
        <g clipPath="url(#pen)">
          <path d={area} fill="url(#under)" />
          <path d={line} fill="none" stroke={C.amber} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((v, i) => (
            <circle key={i} cx={X(i)} cy={Y(v)} r={7} fill={C.paper} />
          ))}
        </g>
        {/* the pen itself, on the line */}
        {!done ? <circle cx={headX} cy={Y(under)} r={14} fill={C.amber} stroke={C.paper} strokeWidth={4} /> : null}
        {done ? (
          <g>
            <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={16} fill={C.hit} />
            <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={16 + pulse * 30} fill="none" stroke={C.hit} strokeWidth={3} opacity={1 - pulse} />
          </g>
        ) : null}
        {/* the oldest date under the left end, today's under the right */}
        <text x={box.x0} y={box.y1 + 58} textAnchor="start" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {chart.first}
        </text>
        <text x={box.x1} y={box.y1 + 58} textAnchor="end" fill={C.paper} fontFamily={VAZIR} fontSize={34} fontWeight={700}>
          {chart.last}
        </text>
      </svg>
      <div style={{ position: "absolute", top: box.y1 + 100, left: L, width: W, direction: "rtl", fontFamily: VAZIR, opacity: rise(f, len * PEN[1] - 6, 10) }}>
        <div style={{ fontWeight: 700, fontSize: 44, color: C.paper }}>
          {chart.fromText} <span style={{ color: C.hit }}>{chart.toText}</span>
        </div>
        <div style={{ fontWeight: 500, fontSize: 34, color: C.mute, marginTop: 12 }}>{`منبع: ${chart.source}`}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- the HUD, the hook ----------------

const Hud: React.FC<{ p: DecisionProps; active: number }> = ({ p, active }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 236, left: L, width: W, direction: "rtl", display: "flex", alignItems: "center", gap: 18, fontFamily: VAZIR }}>
      <div style={{ background: C.amber, color: C.bg, fontWeight: 800, fontSize: 38, padding: "6px 24px", borderRadius: 999 }}>{p.kicker}</div>
      <div style={{ color: C.mute, fontWeight: 600, fontSize: 36 }}>{p.date}</div>
      <div style={{ flex: 1 }} />
      {p.cards.map((o, i) => {
        const on = i === active;
        const done = active > i;
        return (
          <div key={i} style={{ width: 62, height: 62, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 34, color: on ? C.bg : done ? o.color : C.mute, background: on ? o.color : "transparent", border: `3px solid ${on || done ? o.color : C.line}`, transform: `scale(${on ? 1 + 0.06 * Math.sin(f / 5) : 1})` }}>
            {o.key}
          </div>
        );
      })}
    </div>
  );
};

/** The hook: its first line is whole in frame 0 (the event), its second comes in word by word. */
const Hook: React.FC<{ p: DecisionProps; enter: boolean }> = ({ p, enter }) => (
  <div style={{ position: "absolute", top: 330, left: L, width: W, direction: "rtl", textAlign: "right" }}>
    <div>
      <Words text={p.hook.l1} at={-20} size={64} stagger={0} />
    </div>
    <div>
      <Words text={p.hook.l2} at={enter ? 3 : -20} size={92} color={C.amber} stagger={enter ? 3 : 0} />
    </div>
    {p.role ? <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: C.paper, opacity: 0.85 }}>{p.role}</div> : null}
  </div>
);

// ---------------- the facts ----------------

const Facts: React.FC<{ p: DecisionProps; len: number }> = ({ p, len }) => {
  const f = useCurrentFrame();
  if (p.factChart) return <Chart chart={p.factChart} len={len} top={600} local={f} />;
  return (
    <div style={{ position: "absolute", top: 600, left: L, width: W, direction: "rtl", display: "flex", flexDirection: "column", gap: 34, transform: `scale(${1 + 0.03 * (f / len)})`, transformOrigin: "50% 30%" }}>
      {(p.facts ?? []).map((c, i) => {
        const k = rise(f, FACT_AT(i), 14);
        return (
          <div key={i} style={{ background: C.panel, border: `2px solid ${C.line}`, borderRight: `10px solid ${C.amber}`, borderRadius: 26, padding: "28px 34px", transform: `translateX(${(1 - k) * -120}px)`, opacity: k, boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 64, color: C.amber, lineHeight: 1.2 }}>{c.big}</div>
            <div style={{ fontFamily: VAZIR, fontWeight: 600, fontSize: 44, color: C.paper, lineHeight: 1.45, marginTop: 8 }}>{c.text}</div>
            <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 34, color: C.mute, marginTop: 14 }}>{`منبع: ${c.source}`}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------- the cards ----------------

const ICON: Record<Row["icon"], (c: string) => React.ReactNode> = {
  // the road ahead: an arrow leaving a point
  effect: (c) => <path d="M30 8 L10 22 L30 36 M10 22 H44" fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />,
  // a document with its lines
  evidence: (c) => (
    <g fill="none" stroke={c} strokeWidth={4}>
      <path d="M12 4 H32 L40 12 V40 H12 Z" />
      <path d="M18 18 H34 M18 26 H34 M18 33 H28" />
    </g>
  ),
  // a person speaking
  who: (c) => (
    <g fill="none" stroke={c} strokeWidth={4} strokeLinecap="round">
      <circle cx={30} cy={14} r={8} />
      <path d="M16 40 C16 28 44 28 44 40" />
      <path d="M10 10 C4 16 4 24 10 30" />
    </g>
  ),
  // a signal to watch: an eye
  signal: (c) => (
    <g fill="none" stroke={c} strokeWidth={4}>
      <path d="M4 24 C14 8 40 8 50 24 C40 40 14 40 4 24 Z" />
      <circle cx={27} cy={24} r={7} fill={c} />
    </g>
  ),
  // a speech bubble
  say: (c) => <path d="M6 8 H46 V32 H22 L12 42 V32 H6 Z" fill="none" stroke={c} strokeWidth={4} strokeLinejoin="round" />,
  // a tick: what was done
  done: (c) => <path d="M8 24 L20 36 L46 10" fill="none" stroke={c} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />,
};

const RowLine: React.FC<{ r: Row; color: string; k: number }> = ({ r, color, k }) => (
  <div style={{ display: "flex", gap: 20, alignItems: "flex-start", opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
    <svg width={52} height={48} viewBox="0 0 52 48" style={{ flex: "none", marginTop: 8 }}>
      {ICON[r.icon](color)}
    </svg>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color }}>{r.label}</div>
      <div style={{ fontFamily: VAZIR, fontWeight: 600, fontSize: 44, color: C.paper, lineHeight: 1.38 }}>{r.text}</div>
      {r.sub ? <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 34, color: C.mute, marginTop: 4 }}>{r.sub}</div> : null}
    </div>
  </div>
);

/** An AI advisor's seal: a ring with its office's word, and the label that says it is AI. */
const Seal: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 120, height: 120, borderRadius: 999, border: `6px double ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: `0 0 50px ${color}55`, background: "rgba(255,255,255,0.04)" }}>
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={24} fill="none" stroke={color} strokeWidth={3} />
      <path d="M20 40 L32 18 L44 40 Z" fill={color} opacity={0.9} />
      <circle cx={32} cy={46} r={3} fill={color} />
    </svg>
  </div>
);

/** Divan's own estimate for each card on one bar: the cards already shown stay as their letters. */
const Gauge: React.FC<{ p: DecisionProps; upto: number; k: number }> = ({ p, upto, k }) => {
  const f = useCurrentFrame();
  if (!p.gauge) return null;
  const x0 = L + 30;
  const x1 = R - 30;
  const at = (r: number) => x1 - r * (x1 - x0); // calm on the right, the far end on the left
  return (
    <div style={{ position: "absolute", top: 1420, left: 0, width: 1080, height: 170 }}>
      <div style={{ position: "absolute", top: 0, left: L, width: W, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 34, color: C.mute }}>{p.gauge.label}</div>
      <svg width={1080} height={170} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="risk" x1="1" x2="0">
            <stop offset="0%" stopColor="#3da5ff" />
            <stop offset="55%" stopColor={C.amber} />
            <stop offset="100%" stopColor={C.hit} />
          </linearGradient>
        </defs>
        <rect x={x0} y={92} width={x1 - x0} height={16} rx={8} fill="url(#risk)" />
        <text x={x1} y={150} textAnchor="end" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {p.gauge.ends[0]}
        </text>
        <text x={x0} y={150} textAnchor="start" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {p.gauge.ends[1]}
        </text>
        {p.cards.slice(0, upto + 1).map((o, i) => {
          const now = i === upto;
          const r = (o.risk ?? 0.5) * (now ? k : 1);
          const x = at(r);
          return (
            <g key={i} opacity={now ? 1 : 0.55}>
              <path d={`M${x} 88 L${x - 14} 64 H${x + 14} Z`} fill={o.color} />
              <circle cx={x} cy={44} r={now ? 26 + Math.sin(f / 5) * 1.5 : 20} fill={now ? o.color : C.bg} stroke={o.color} strokeWidth={3} />
              <text x={x} y={56} textAnchor="middle" fill={now ? C.bg : o.color} fontFamily={VAZIR} fontWeight={800} fontSize={now ? 30 : 24}>
                {o.key}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const CardScene: React.FC<{ p: DecisionProps; i: number; len: number }> = ({ p, i, len }) => {
  const f = useCurrentFrame();
  const o: Card = p.cards[i];
  const enter = rise(f, 0, CARD_IN);
  const leave = interpolate(f, [len - CARD_OUT, len], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 380,
          left: L,
          width: W,
          direction: "rtl",
          // in from the left, out to the right, and a slow push all the while: no second stands still
          transform: `translateX(${(1 - enter) * -260 + leave * 260}px) scale(${1 + 0.035 * (f / len)}) translateY(${Math.sin(f / 18) * 4}px)`,
          transformOrigin: "50% 40%",
          opacity: enter * (1 - leave),
          filter: `blur(${(1 - enter) * 10 + leave * 10}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
          {o.seal ? <Seal color={o.color} /> : <div style={{ width: 120, height: 120, borderRadius: 30, background: o.color, color: C.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 64, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${o.color}66`, flex: "none" }}>{o.key}</div>}
          <div style={{ flex: 1 }}>
            <Words text={o.title} at={4} size={o.seal ? 56 : 70} />
            {o.seal ? <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: o.color, marginTop: 4 }}>{o.seal}</div> : null}
          </div>
        </div>
        <div style={{ marginTop: 34, background: C.panel, border: `2px solid ${C.line}`, borderTop: `8px solid ${o.color}`, borderRadius: 28, padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22, boxShadow: "0 40px 90px rgba(0,0,0,0.45)" }}>
          {o.rows.map((r, j) => (
            <RowLine key={j} r={r} color={o.color} k={rise(f, ROW_AT(j), ROW_IN)} />
          ))}
        </div>
      </div>
      <Gauge p={p} upto={i} k={rise(f, 10, 26)} />
      <Sfx at={1} name="whoosh" volume={0.35} />
      {o.rows.map((_, j) => (
        <Sfx key={j} at={ROW_AT(j)} name="pop" volume={0.3} />
      ))}
    </AbsoluteFill>
  );
};

// ---------------- the close ----------------

const Ask: React.FC<{ p: DecisionProps; len: number }> = ({ p, len }) => {
  const f = useCurrentFrame();
  const badgeAt = Math.max(30, len - 66);
  const b = rise(f, badgeAt, 8) * (1 - interpolate(f, [badgeAt + 58, badgeAt + 64], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 380, left: L, width: W, direction: "rtl", textAlign: "right" }}>
        <Words text={p.ask.q} at={0} size={92} color={C.amber} />
      </div>
      <div style={{ position: "absolute", top: 640, left: L + 30, width: W - 60, direction: "rtl", display: "flex", flexDirection: "column", gap: 26 }}>
        {p.cards.map((o, i) => {
          const k = rise(f, 8 + i * 6, 10);
          const glow = 0.5 + 0.5 * Math.sin((f - i * 10) / 6);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, background: C.paper, borderRadius: 28, padding: "22px 26px", transform: `scale(${0.9 + 0.1 * k})`, opacity: k, boxShadow: `0 0 ${20 + glow * 30}px ${o.color}66` }}>
              <div style={{ width: 84, height: 84, borderRadius: 999, background: o.color, color: C.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 44, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{o.key}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 46, color: C.bg }}>{o.title}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1300, left: L, width: W, direction: "rtl", fontFamily: VAZIR, display: "flex", flexDirection: "column", gap: 14, opacity: rise(f, 24, 10) }}>
        <div style={{ alignSelf: "flex-start", border: `2px solid ${C.amber}`, color: C.amber, fontWeight: 700, fontSize: 34, padding: "6px 20px", borderRadius: 999 }}>{p.ask.chip}</div>
        <div style={{ color: C.mute, fontWeight: 600, fontSize: 36, direction: "ltr", textAlign: "right" }}>{p.ask.site}</div>
      </div>
      {/* the channel badge, small, low, gone before the loop */}
      <div style={{ position: "absolute", left: L, top: 1500, opacity: b, transform: `scale(${0.8 + 0.2 * b})`, transformOrigin: "left center", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,176,32,0.14)", border: `2px solid ${C.amber}`, borderRadius: 999, padding: "8px 22px", fontFamily: VAZIR, direction: "rtl" }}>
        <span style={{ color: C.paper, fontWeight: 800, fontSize: 36 }}>{p.badge ?? "دیوان"}</span>
        <svg width={34} height={30} viewBox="0 0 24 22">
          <path d="M12 21 C-4 10 4 -2 12 5 C20 -2 28 10 12 21 Z" fill={C.hit} />
        </svg>
        <span style={{ color: C.amber, fontWeight: 800, fontSize: 32 }}>+ دنبال کن</span>
      </div>
      <Sfx at={0} name="rise" volume={0.3} />
      <Sfx at={badgeAt} name="badge" volume={0.4} />
    </AbsoluteFill>
  );
};

export const Decision: React.FC<DecisionProps> = (p) => {
  const f = useCurrentFrame();
  const { durationInFrames: dur } = useVideoConfig();
  const scenes = p.scenes ?? scenesOf(p).scenes;
  const sc = (cue: string) => scenes.find((s) => s.cue === cue);
  const fact = sc("fact");
  const first = sc("c1")!;
  const ask = sc("ask")!;
  const loopAt = dur - LOOP;
  const inLoop = f >= loopAt;
  let active = -1;
  p.cards.forEach((_, i) => {
    const s = sc(`c${i + 1}`)!;
    if (f >= s.from) active = i;
  });
  if (f >= ask.from) active = p.cards.length;
  if (inLoop) active = -1;
  // the stage is the room's back wall: it dims under the cards and is whole again for the loop
  const loop = interpolate(f, [loopAt, dur - 1], [0, 1], clamp);
  const behind = fact ? interpolate(f, [fact.from, fact.from + 10], [0, 1], clamp) * (p.factChart ? 1.6 : 0.6) : 0;
  const dim = Math.min(1.6, Math.max(behind, f >= first.from ? 1 : 0)) * (1 - loop);
  // a slow breath in and out over the whole Reel: back to where it began at the loop
  const zoom = 1 + 0.08 * Math.sin((Math.PI * f) / dur);
  const st = p.stage;
  const hookOut = fact ?? first;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 38%, ${C.bg2} 0%, ${C.bg} 62%, ${C.edge} 100%)` }}>
      {st.kind === "map" ? <MapStage map={st.map} zoom={zoom} dim={dim} /> : null}
      {st.kind === "wire" ? <WireStage wire={st.wire} zoom={zoom} dim={dim} /> : null}
      {st.kind === "chart" ? (
        <div style={{ opacity: 1 - Math.min(1, dim) }}>
          <Chart chart={st.chart} len={scenes[0].len} top={640} local={inLoop ? scenes[0].len : f} start={0.35} />
        </div>
      ) : null}
      {/* the hook, from frame 0; it leaves just before the next scene comes */}
      <Sequence from={0} durationInFrames={hookOut.from + 2} layout="none">
        <div style={{ opacity: interpolate(f, [hookOut.from - 7, hookOut.from], [1, 0], clamp), transform: `translateY(${interpolate(f, [hookOut.from - 7, hookOut.from], [0, -40], clamp)}px)` }}>
          <Hook p={p} enter />
        </div>
      </Sequence>
      {fact ? (
        <Sequence from={fact.from} durationInFrames={fact.len}>
          <Facts p={p} len={fact.len} />
          <Sfx at={1} name="whoosh" volume={0.35} />
          <Sfx at={p.factChart ? Math.round(fact.len * PEN[0]) : FACT_AT(0)} name="tick" volume={0.35} />
        </Sequence>
      ) : null}
      {p.cards.map((_, i) => {
        const s = sc(`c${i + 1}`)!;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.len}>
            <CardScene p={p} i={i} len={s.len} />
          </Sequence>
        );
      })}
      <Sequence from={ask.from} durationInFrames={ask.len - LOOP}>
        <Ask p={p} len={ask.len - LOOP} />
      </Sequence>
      {/* the loop: the first picture's words come back for the last frames */}
      {inLoop ? (
        <div style={{ opacity: loop }}>
          <Hook p={p} enter={false} />
        </div>
      ) : null}
      <Hud p={p} active={active} />
      {(p.voice ?? []).map((v, i) => (
        <Sequence key={i} from={v.from} durationInFrames={v.frames + 6} layout="none">
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Sfx at={0} name="hit" volume={0.5} />
    </AbsoluteFill>
  );
};

/** The tile on the profile grid: the room's colour, the kicker, three or four big words, the cards' colours as dots. */
export const DecisionCover: React.FC<DecisionCoverProps> = (c) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 38%, ${C.bg2} 0%, ${C.bg} 62%, ${C.edge} 100%)`, direction: "rtl", fontFamily: VAZIR, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 860, display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
      <div style={{ background: C.amber, color: C.bg, fontWeight: 800, fontSize: 56, padding: "10px 36px", borderRadius: 999 }}>{c.kicker}</div>
      <div style={{ fontWeight: 800, fontSize: 132, color: C.paper, lineHeight: 1.25 }}>{c.big}</div>
      <div style={{ display: "flex", gap: 24 }}>
        {(c.colors ?? ["#ff5a4e", "#3da5ff", "#2ed3a0"]).map((col, i) => (
          <div key={i} style={{ width: 70, height: 70, borderRadius: 20, background: col }} />
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 44, color: C.mute }}>دیوان</div>
    </div>
  </AbsoluteFill>
);
