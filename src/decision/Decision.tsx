// «تصمیم امروز»: Divan's v2 look (sample of 19 November 2026, not on the page).
//
// One day's open decision: the event on a live map from frame 0, the fact that
// weighs on it, three real roads (each with its likely effect, the evidence and
// who argues for it, every line with its source), a gauge of Divan's own
// estimate of the risk, and a poll-style close that asks the viewer to choose.
// The look is new: a dark decision room with signal colours per road, kinetic
// Persian type, maps, counters and option cards, never generic shapes.
// Every word on screen comes from the props.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VAZIR } from "../kit";
import { makeMap, type Extent } from "../geo";

const FPS = 30;
const C = {
  ink: "#07090d",
  ink2: "#0d1219",
  panel: "rgba(16,22,30,0.92)",
  line: "#253142",
  paper: "#f3efe6",
  mute: "#93a0ae",
  amber: "#ffb020",
  hit: "#ff3b30",
  sea: "#0a1520",
  land: "#141c26",
  iran: "#1d2a38",
};
// the safe column (the apps' buttons sit right and below)
const L = 64;
const R = 884;
const W = R - L;

type Lab = { t: string; lon: number; lat: number; size?: number };
type MapSpec = {
  extent: Extent;
  labels?: Lab[];
  hits?: Lab[];
  arcs?: { from: [number, number]; to: [number, number] }[];
  tankers?: { lon: number; lat: number; fire?: boolean; rot?: number }[];
  pair?: Lab | null;
  source: string;
};
type FactCards = { kind: "cards"; cards: { big: string; text: string; source: string }[] };
type FactChart = { kind: "chart"; title: string; unit: string; points: number[]; first: string; last: string; fromText: string; toText: string; source: string };
type Option = { key: string; title: string; color: string; effect: string; evidence: string; evidenceSource: string; who: string; whoSource?: string; risk: number };
export type DecisionProps = {
  format: "decision";
  kicker: string;
  date: string;
  hook: { l1: string; l2: string };
  map: MapSpec;
  fact: FactCards | FactChart;
  options: Option[];
  riskLabel: string;
  riskEnds: [string, string];
  ask: { q: string; chip: string; site: string };
  badge?: string;
  voiceIn?: { file: string; cue: string; frames: number }[];
  music?: string;
  // filled by decisionMeta
  scenes?: { cue: string; from: number; len: number }[];
  voice?: { file: string; from: number; frames: number }[];
  drone?: boolean;
};

const ORDER = ["start", "fact", "a", "b", "c", "ask"] as const;
const MIN: Record<string, number> = { start: 105, fact: 110, a: 110, b: 110, c: 110, ask: 120 };
const PAD = 12;
const LOOP = 12;

/** Each scene lasts as long as its line takes to be said, never less than its own minimum. */
export const decisionMeta = ({ props }: { props: DecisionProps }) => {
  const lines = props.voiceIn ?? [];
  const scenes: { cue: string; from: number; len: number }[] = [];
  const voice: { file: string; from: number; frames: number }[] = [];
  let at = 0;
  for (const cue of ORDER) {
    const line = lines.find((l) => l.cue === cue);
    const lead = cue === "start" ? 2 : 5;
    const len = Math.max(MIN[cue], line ? lead + line.frames + PAD : 0) + (cue === "ask" ? 30 + LOOP : 0);
    if (line) voice.push({ file: line.file, from: at + lead, frames: line.frames });
    scenes.push({ cue, from: at, len });
    at += len;
  }
  return { durationInFrames: at, props: { ...props, scenes, voice, drone: true } };
};

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const rise = (f: number, at: number, dur = 12) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease });

const Words: React.FC<{ text: string; at: number; size: number; color?: string; weight?: number; stagger?: number; still?: boolean }> = ({ text, at, size, color = C.paper, weight = 800, stagger = 3, still }) => {
  const f = useCurrentFrame();
  return (
    <span style={{ fontFamily: VAZIR, fontSize: size, fontWeight: weight, color, lineHeight: 1.32 }}>
      {text.split(" ").map((w, i) => {
        const k = still ? 1 : rise(f, at + i * stagger, 10);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${(1 - k) * 0.5 * size}px)`, opacity: k, filter: `blur(${(1 - k) * 6}px)` }}>
            {w}
            {i < text.split(" ").length - 1 ? " " : ""}
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

/** A tanker seen from the side: hull, bridge at the stern, deck pipes; on fire when the props say so. */
const Tanker: React.FC<{ x: number; y: number; fire?: boolean; rot?: number; f: number; s?: number }> = ({ x, y, fire, rot = 0, f, s = 1 }) => {
  const flick = (k: number) => 1 + 0.18 * Math.sin(f / 2.3 + k) + 0.1 * Math.sin(f / 1.1 + k * 3);
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
          <ellipse cx={6} cy={-22} rx={20 * flick(1)} ry={14 * flick(2)} fill="#ff6a00" opacity={0.85} />
          <ellipse cx={4} cy={-28} rx={12 * flick(3)} ry={12 * flick(4)} fill="#ffb020" />
          <ellipse cx={2} cy={-31} rx={5} ry={6 * flick(5)} fill="#fff1b8" />
          <ellipse cx={-6} cy={-58 - (f % 40)} rx={18 + (f % 40) / 2} ry={10 + (f % 40) / 4} fill="#3a3f46" opacity={0.5 * (1 - (f % 40) / 40)} />
        </g>
      ) : null}
    </g>
  );
};

/** A target on the map: a crosshair with a ring that keeps pulsing outward. */
const Hit: React.FC<{ x: number; y: number; f: number; t: string; at: number; side?: "l" | "r" }> = ({ x, y, f, t, at, side = "l" }) => {
  const k = rise(f, at, 8);
  const p = ((f - at) % 36) / 36;
  return (
    <g opacity={k}>
      <circle cx={x} cy={y} r={14 + p * 46} fill="none" stroke={C.hit} strokeWidth={3} opacity={(1 - p) * 0.9} />
      <circle cx={x} cy={y} r={11} fill={C.hit} />
      <path d={`M${x - 22} ${y} H${x - 14} M${x + 14} ${y} H${x + 22} M${x} ${y - 22} V${y - 14} M${x} ${y + 14} V${y + 22}`} stroke="#fff" strokeWidth={3} />
      <text x={side === "l" ? x - 34 : x + 34} y={y + 13} textAnchor={side === "l" ? "end" : "start"} fill={C.paper} fontFamily={VAZIR} fontWeight={800} fontSize={40} style={{ paintOrder: "stroke", stroke: C.ink, strokeWidth: 8 }}>
        {t}
      </text>
    </g>
  );
};

const MAP_BOX = { x0: 20, y0: 560, x1: 1060, y1: 1420 };

const MapScene: React.FC<{ p: DecisionProps; dim: number }> = ({ p, dim }) => {
  const f = useCurrentFrame();
  const m = React.useMemo(() => makeMap(p.map.extent, MAP_BOX), [p.map.extent]);
  const zoom = interpolate(f, [0, 200], [1, 1.1], clamp);
  const cx = (MAP_BOX.x0 + MAP_BOX.x1) / 2;
  const cy = (MAP_BOX.y0 + MAP_BOX.y1) / 2;
  return (
    <AbsoluteFill style={{ opacity: 1 - dim * 0.62 }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs>
          <clipPath id="mapclip">
            <rect x={MAP_BOX.x0} y={MAP_BOX.y0} width={MAP_BOX.x1 - MAP_BOX.x0} height={MAP_BOX.y1 - MAP_BOX.y0} rx={28} />
          </clipPath>
          <radialGradient id="seaglow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0f2233" />
            <stop offset="100%" stopColor={C.sea} />
          </radialGradient>
        </defs>
        <g clipPath="url(#mapclip)">
          <rect x={MAP_BOX.x0} y={MAP_BOX.y0} width={MAP_BOX.x1 - MAP_BOX.x0} height={MAP_BOX.y1 - MAP_BOX.y0} fill="url(#seaglow)" />
          <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
            <path d={m.grat} fill="none" stroke="#16283a" strokeWidth={1} />
            <path d={m.land} fill={C.land} />
            <path d={m.iran} fill={C.iran} stroke={C.amber} strokeOpacity={0.7} strokeWidth={2.5} />
            <path d={m.borders} fill="none" stroke="#33414f" strokeWidth={1.5} />
            {(p.map.labels ?? []).map((l, i) => {
              const [x, y] = m.at(l.lon, l.lat);
              return (
                <text key={i} x={x} y={y} textAnchor="middle" fill={C.mute} fontFamily={VAZIR} fontWeight={700} fontSize={l.size ?? 36} opacity={0.9}>
                  {l.t}
                </text>
              );
            })}
            {(p.map.arcs ?? []).map((a, i) => {
              const [x0, y0] = m.at(a.from[0], a.from[1]);
              const [x1, y1] = m.at(a.to[0], a.to[1]);
              const mx = (x0 + x1) / 2;
              const my = Math.min(y0, y1) - 160;
              const k = rise(f, 6 + i * 6, 24);
              const len = 1400;
              return <path key={i} d={`M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`} fill="none" stroke={C.amber} strokeWidth={4} strokeDasharray={`${len}`} strokeDashoffset={len * (1 - k)} strokeLinecap="round" opacity={0.95} />;
            })}
            {(p.map.tankers ?? []).map((t, i) => {
              const [x, y] = m.at(t.lon, t.lat);
              const bob = Math.sin(f / 9 + i) * 3;
              return <Tanker key={i} x={x} y={y + bob} fire={t.fire} rot={t.rot} f={f + i * 7} s={1.15} />;
            })}
            {p.map.pair
              ? (() => {
                  const [x, y] = m.at(p.map.pair.lon, p.map.pair.lat);
                  return (
                    <g opacity={rise(f, 10, 10)}>
                      <Tanker x={x - 52} y={y} f={f} s={0.9} />
                      <Tanker x={x + 52} y={y} f={f} s={0.9} />
                      <path d={`M${x - 20} ${y - 18} Q${x} ${y - 46} ${x + 20} ${y - 18}`} fill="none" stroke={C.amber} strokeWidth={4} strokeDasharray="8 6" strokeDashoffset={-f} />
                      <text x={x} y={y + 52} textAnchor="middle" fill={C.paper} fontFamily={VAZIR} fontWeight={700} fontSize={34} style={{ paintOrder: "stroke", stroke: C.ink, strokeWidth: 8 }}>
                        {p.map.pair.t}
                      </text>
                    </g>
                  );
                })()
              : null}
            {(p.map.hits ?? []).map((h, i) => {
              const [x, y] = m.at(h.lon, h.lat);
              return <Hit key={i} x={x} y={y} f={f} t={h.t} at={i === 0 ? 0 : 16 + i * 6} side={x < 380 ? "r" : "l"} />;
            })}
          </g>
        </g>
        <rect x={MAP_BOX.x0} y={MAP_BOX.y0} width={MAP_BOX.x1 - MAP_BOX.x0} height={MAP_BOX.y1 - MAP_BOX.y0} rx={28} fill="none" stroke={C.line} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", top: MAP_BOX.y1 + 18, left: L, width: W, direction: "rtl", fontFamily: VAZIR, fontSize: 34, fontWeight: 500, color: C.mute }}>{p.map.source}</div>
    </AbsoluteFill>
  );
};

const Hud: React.FC<{ p: DecisionProps; active: number }> = ({ p, active }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 236, left: L, width: W, direction: "rtl", display: "flex", alignItems: "center", gap: 18, fontFamily: VAZIR }}>
      <div style={{ background: C.amber, color: C.ink, fontWeight: 800, fontSize: 38, padding: "6px 24px", borderRadius: 999 }}>{p.kicker}</div>
      <div style={{ color: C.mute, fontWeight: 600, fontSize: 36 }}>{p.date}</div>
      <div style={{ flex: 1 }} />
      {p.options.map((o, i) => {
        const on = i === active;
        const done = active > i;
        return (
          <div key={o.key} style={{ width: 62, height: 62, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 34, color: on ? C.ink : done ? o.color : C.mute, background: on ? o.color : "transparent", border: `3px solid ${on || done ? o.color : C.line}`, transform: `scale(${on ? 1 + 0.06 * Math.sin(f / 5) : 1})` }}>
            {o.key}
          </div>
        );
      })}
    </div>
  );
};

const Hook: React.FC<{ p: DecisionProps; still?: boolean }> = ({ p, still }) => (
  <div style={{ position: "absolute", top: 330, left: L, width: W, direction: "rtl", textAlign: "right" }}>
    <div>
      <Words text={p.hook.l1} at={0} size={74} still={still} stagger={2} />
    </div>
    <div>
      <Words text={p.hook.l2} at={8} size={86} color={C.amber} still={still} />
    </div>
  </div>
);

const FactScene: React.FC<{ p: DecisionProps; len: number }> = ({ p, len }) => {
  const f = useCurrentFrame();
  const fact = p.fact;
  if (fact.kind === "cards") {
    return (
      <div style={{ position: "absolute", top: 600, left: L, width: W, direction: "rtl", display: "flex", flexDirection: "column", gap: 34 }}>
        {fact.cards.map((c, i) => {
          const k = rise(f, 4 + i * 22, 14);
          return (
            <div key={i} style={{ background: C.panel, border: `2px solid ${C.line}`, borderRight: `10px solid ${C.amber}`, borderRadius: 26, padding: "28px 34px", transform: `translateX(${(1 - k) * -120}px)`, opacity: k, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 64, color: C.amber, lineHeight: 1.2 }}>{c.big}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 600, fontSize: 44, color: C.paper, lineHeight: 1.45, marginTop: 8 }}>{c.text}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 34, color: C.mute, marginTop: 14 }}>{`منبع: ${c.source}`}</div>
            </div>
          );
        })}
      </div>
    );
  }
  // a line of the last days, drawn as it is said; the last price counts down to its value
  const pts = fact.points;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const box = { x0: L + 20, x1: R - 20, y0: 860, y1: 1230 };
  const X = (i: number) => box.x1 - (i / (pts.length - 1)) * (box.x1 - box.x0); // RTL: time runs right to left
  const Y = (v: number) => box.y1 - ((v - lo) / (hi - lo || 1)) * (box.y1 - box.y0);
  const k = rise(f, 4, Math.round(len * 0.5));
  const d = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const last = pts.length - 1;
  const count = interpolate(f, [Math.round(len * 0.35), Math.round(len * 0.7)], [pts[last - 1], pts[last]], { ...clamp, easing: ease });
  const fa = (n: number) => n.toFixed(2).replace(".", "٫").replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[Number(x)]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 600, left: L, width: W, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ fontWeight: 700, fontSize: 44, color: C.paper }}>{fact.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 150, color: C.amber, lineHeight: 1.05 }}>{fa(count)}</div>
          <div style={{ fontWeight: 600, fontSize: 44, color: C.mute }}>{fact.unit}</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={box.x0} x2={box.x1} y1={box.y0 + (g * (box.y1 - box.y0)) / 3} y2={box.y0 + (g * (box.y1 - box.y0)) / 3} stroke={C.line} strokeWidth={2} />
        ))}
        <path d={d} fill="none" stroke={C.amber} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={3000} strokeDashoffset={3000 * (1 - k)} />
        {k > 0.98 ? (
          <g>
            <circle cx={X(last - 1)} cy={Y(pts[last - 1])} r={13} fill={C.paper} />
            <circle cx={X(last)} cy={Y(pts[last])} r={16} fill={C.hit} />
            <circle cx={X(last)} cy={Y(pts[last])} r={16 + ((f % 30) / 30) * 30} fill="none" stroke={C.hit} strokeWidth={3} opacity={1 - (f % 30) / 30} />
          </g>
        ) : null}
        <text x={box.x1} y={box.y1 + 60} textAnchor="end" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {fact.first}
        </text>
        <text x={box.x0} y={box.y1 + 60} textAnchor="start" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {fact.last}
        </text>
      </svg>
      <div style={{ position: "absolute", top: 1330, left: L, width: W, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ fontWeight: 700, fontSize: 44, color: C.paper }}>
          {fact.fromText} <span style={{ color: C.hit }}>{fact.toText}</span>
        </div>
        <div style={{ fontWeight: 500, fontSize: 34, color: C.mute, marginTop: 12 }}>{`منبع: ${fact.source}`}</div>
      </div>
    </AbsoluteFill>
  );
};

const ICON: Record<string, (c: string) => React.ReactNode> = {
  // the road ahead: an arrow leaving a point
  effect: (c) => <path d="M30 8 L10 22 L30 36 M10 22 H44" fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />,
  // a document with its lines
  evidence: (c) => (
    <g fill="none" stroke={c} strokeWidth={4}>
      <path d="M12 4 H32 L40 12 V40 H12 Z" />
      <path d="M18 18 H34 M18 26 H34 M18 33 H28" />
    </g>
  ),
  // a speaker's voice
  who: (c) => (
    <g fill="none" stroke={c} strokeWidth={4} strokeLinecap="round">
      <circle cx={30} cy={14} r={8} />
      <path d="M16 40 C16 28 44 28 44 40" />
      <path d="M10 10 C4 16 4 24 10 30" />
    </g>
  ),
};

const Row: React.FC<{ icon: string; label: string; text: string; sub?: string; color: string; k: number }> = ({ icon, label, text, sub, color, k }) => (
  <div style={{ display: "flex", gap: 20, alignItems: "flex-start", opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
    <svg width={52} height={48} viewBox="0 0 52 48" style={{ flex: "none", marginTop: 8 }}>
      {ICON[icon](color)}
    </svg>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color }}>{label}</div>
      <div style={{ fontFamily: VAZIR, fontWeight: 600, fontSize: 40, color: C.paper, lineHeight: 1.4 }}>{text}</div>
      {sub ? <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 34, color: C.mute, marginTop: 4 }}>{sub}</div> : null}
    </div>
  </div>
);

/** Divan's own estimate of each road's risk, on one bar: the roads already shown stay as their letters. */
const Gauge: React.FC<{ p: DecisionProps; upto: number; k: number }> = ({ p, upto, k }) => {
  const f = useCurrentFrame();
  const x0 = L + 30;
  const x1 = R - 30;
  const at = (r: number) => x1 - r * (x1 - x0); // RTL: calm on the right, war on the left
  return (
    <div style={{ position: "absolute", top: 1420, left: 0, width: 1080, height: 190 }}>
      <div style={{ position: "absolute", top: 0, left: L, width: W, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 34, color: C.mute }}>{p.riskLabel}</div>
      <svg width={1080} height={190} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="risk" x1="1" x2="0">
            <stop offset="0%" stopColor="#3da5ff" />
            <stop offset="55%" stopColor={C.amber} />
            <stop offset="100%" stopColor={C.hit} />
          </linearGradient>
        </defs>
        <rect x={x0} y={92} width={x1 - x0} height={16} rx={8} fill="url(#risk)" opacity={0.9} />
        <text x={x1} y={150} textAnchor="end" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {p.riskEnds[0]}
        </text>
        <text x={x0} y={150} textAnchor="start" fill={C.mute} fontFamily={VAZIR} fontSize={34} fontWeight={600}>
          {p.riskEnds[1]}
        </text>
        {p.options.slice(0, upto + 1).map((o, i) => {
          const now = i === upto;
          const r = now ? o.risk * k : o.risk;
          const x = at(r);
          return (
            <g key={o.key} opacity={now ? 1 : 0.55}>
              <path d={`M${x} 88 L${x - 14} 64 H${x + 14} Z`} fill={o.color} />
              <circle cx={x} cy={44} r={now ? 26 + Math.sin(f / 5) * 1.5 : 20} fill={now ? o.color : "transparent"} stroke={o.color} strokeWidth={3} />
              <text x={x} y={56} textAnchor="middle" fill={now ? C.ink : o.color} fontFamily={VAZIR} fontWeight={800} fontSize={now ? 30 : 24}>
                {o.key}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const OptionScene: React.FC<{ p: DecisionProps; i: number; len: number }> = ({ p, i, len }) => {
  const f = useCurrentFrame();
  const o = p.options[i];
  const enter = rise(f, 0, 12);
  const leave = interpolate(f, [len - 8, len], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 380, left: L, width: W, direction: "rtl", transform: `translateX(${(1 - enter) * -260 + leave * 260}px)`, opacity: enter * (1 - leave), filter: `blur(${(1 - enter) * 10 + leave * 10}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: o.color, color: C.ink, fontFamily: VAZIR, fontWeight: 800, fontSize: 64, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${o.color}66` }}>{o.key}</div>
          <div style={{ flex: 1 }}>
            <Words text={o.title} at={4} size={66} />
          </div>
        </div>
        <div style={{ marginTop: 36, background: C.panel, border: `2px solid ${C.line}`, borderTop: `8px solid ${o.color}`, borderRadius: 28, padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22, boxShadow: "0 40px 90px rgba(0,0,0,0.55)" }}>
          <Row icon="effect" label="پیامد احتمالی (تحلیل دیوان)" text={o.effect} color={o.color} k={rise(f, 12, 10)} />
          <Row icon="evidence" label="سند امروز" text={o.evidence} sub={`منبع: ${o.evidenceSource}`} color={o.color} k={rise(f, 26, 10)} />
          <Row icon="who" label="چه کسی چه می‌گوید" text={o.who} sub={o.whoSource ? `منبع: ${o.whoSource}` : undefined} color={o.color} k={rise(f, 40, 10)} />
        </div>
      </div>
      <Gauge p={p} upto={i} k={rise(f, 10, 26)} />
      <Sfx at={1} name="whoosh" volume={0.35} />
      <Sfx at={12} name="pop" volume={0.3} />
      <Sfx at={26} name="pop" volume={0.3} />
      <Sfx at={40} name="pop" volume={0.3} />
    </AbsoluteFill>
  );
};

const AskScene: React.FC<{ p: DecisionProps; len: number }> = ({ p, len }) => {
  const f = useCurrentFrame();
  const badgeAt = Math.max(30, len - LOOP - 30 - 66);
  const b = rise(f, badgeAt, 8) * (1 - interpolate(f, [badgeAt + 60, badgeAt + 66], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 380, left: L, width: W, direction: "rtl", textAlign: "right" }}>
        <Words text={p.ask.q} at={0} size={92} color={C.amber} />
      </div>
      <div style={{ position: "absolute", top: 640, left: L + 30, width: W - 60, direction: "rtl", display: "flex", flexDirection: "column", gap: 26 }}>
        {p.options.map((o, i) => {
          const k = rise(f, 8 + i * 6, 10);
          const glow = 0.5 + 0.5 * Math.sin((f - i * 10) / 6);
          return (
            <div key={o.key} style={{ display: "flex", alignItems: "center", gap: 22, background: "#f3efe6", borderRadius: 28, padding: "22px 26px", transform: `scale(${0.9 + 0.1 * k})`, opacity: k, boxShadow: `0 0 ${20 + glow * 30}px ${o.color}55` }}>
              <div style={{ width: 84, height: 84, borderRadius: 999, background: o.color, color: C.ink, fontFamily: VAZIR, fontWeight: 800, fontSize: 44, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{o.key}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 46, color: C.ink }}>{o.title}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1290, left: L, width: W, direction: "rtl", fontFamily: VAZIR, display: "flex", flexDirection: "column", gap: 14, opacity: rise(f, 24, 10) }}>
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
  const { durationInFrames } = useVideoConfig();
  const scenes = p.scenes ?? decisionMeta({ props: p }).props.scenes!;
  const sc = (cue: string) => scenes.find((s) => s.cue === cue)!;
  const fact = sc("fact");
  const optStart = sc("a").from;
  const ask = sc("ask");
  const active = f < optStart ? -1 : f >= ask.from ? 3 : f < sc("b").from ? 0 : f < sc("c").from ? 1 : 2;
  // the map stays as the room's back wall; it dims under the cards and comes back for the loop
  const loop = interpolate(f, [durationInFrames - LOOP, durationInFrames - 1], [0, 1], clamp);
  const dim = Math.max(interpolate(f, [fact.from, fact.from + 10], [0, 1], clamp) * (p.fact.kind === "chart" ? 1 : 0.6), f >= optStart ? 1 : 0) * (1 - loop);
  const camShake = f < 6 ? Math.sin(f * 3) * (6 - f) * 1.5 : 0;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 40%, ${C.ink2} 0%, ${C.ink} 70%)` }}>
      <AbsoluteFill style={{ transform: `translate(${camShake}px, 0)` }}>
        <MapScene p={p} dim={p.fact.kind === "chart" && f >= fact.from && f < optStart ? 1.6 * dim : dim} />
      </AbsoluteFill>
      {/* the hook: the event in words, from frame 0 */}
      <Sequence from={0} durationInFrames={fact.from + 8} layout="none">
        <div style={{ opacity: interpolate(f, [fact.from, fact.from + 8], [1, 0], clamp) }}>
          <Hook p={p} />
        </div>
      </Sequence>
      <Sequence from={fact.from} durationInFrames={fact.len}>
        <FactScene p={p} len={fact.len} />
        <Sfx at={1} name="whoosh" volume={0.35} />
        <Sfx at={p.fact.kind === "chart" ? Math.round(fact.len * 0.35) : 26} name="tick" volume={0.35} />
      </Sequence>
      {p.options.map((o, i) => {
        const s = sc(["a", "b", "c"][i]);
        return (
          <Sequence key={o.key} from={s.from} durationInFrames={s.len}>
            <OptionScene p={p} i={i} len={s.len} />
          </Sequence>
        );
      })}
      <Sequence from={ask.from} durationInFrames={ask.len - LOOP}>
        <AskScene p={p} len={ask.len} />
      </Sequence>
      {/* the loop: the first picture's words come back for the last frames */}
      {loop > 0 ? (
        <div style={{ opacity: loop }}>
          <Hook p={p} still />
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
