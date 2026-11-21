// The objects that stand on the map (object-ids.ts): real things drawn by code as detailed illustrations, lit from the
// top left with gradients (ObjectDefs), outlined in the night map's ink so they read on the dark sea. Round 4 (owner,
// 21 Nov 2026: «با جزئیات … دقیق‌تر و جزئیات بیشتری»): each type has its own true shape — a VLCC with its aft house and
// deck piping, a container ship with its bays, a Moss LNG carrier with its domes, a destroyer with its gun and radar
// mast; a Shahed-type delta drone is not a MALE drone, an F-35 is not an Su-35; a ballistic missile is not a cruise
// missile. Ships sit in the water (a waterline, foam, a wake); aircraft leave contrails; a fire's smoke drifts with the
// wind. One consistent scale: a VLCC is the largest thing on the sea, a destroyer about 0.8 of it, a fast boat a fifth.
import React from "react";
import { useView } from "./MapStage";
import { densify } from "./layers";
import { VAZIR } from "./fonts";
import type { MapObjectId, ObjectMove } from "./object-ids";

const INK = "#0b121c";
const STEEL = "#c9d2dd";
const STEEL_D = "#8d99a8";
const FLAME = "#ffb020";
const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
const out3 = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const pop = (u: number) => {
  const x = clamp01(u);
  return x < 0.7 ? (x / 0.7) * 1.15 : 1.15 - ((x - 0.7) / 0.3) * 0.15;
};
const S = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round" as const };
const s1 = { stroke: INK, strokeWidth: 1.2, strokeLinejoin: "round" as const };
const G = (id: string) => `url(#dvo-${id})`;
/** a deterministic pick from a list (no randomness: every frame and every render the same) */
const pick = <T,>(list: T[], i: number) => list[((i * 7919) % list.length + list.length) % list.length];

/** The shared paints of every object: once per map (MapMarks draws it), and in the preview sheet. */
export const ObjectDefs: React.FC = () => {
  const lin = (id: string, stops: [number, string, number?][], vertical = true) => (
    <linearGradient id={`dvo-${id}`} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
      {stops.map(([o, c, op], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />
      ))}
    </linearGradient>
  );
  const rad = (id: string, stops: [number, string, number?][], cx = "35%", cy = "30%") => (
    <radialGradient id={`dvo-${id}`} cx={cx} cy={cy} r="75%">
      {stops.map(([o, c, op], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />
      ))}
    </radialGradient>
  );
  return (
    <defs>
      {lin("hull", [[0, "#5b6a80"], [0.35, "#3a4658"], [1, "#1c2430"]])}
      {lin("hullBlue", [[0, "#3d5d8a"], [0.4, "#25406a"], [1, "#132542"]])}
      {lin("grey", [[0, "#c3ccd7"], [0.45, "#98a4b3"], [1, "#5f6b7b"]])}
      {lin("boot", [[0, "#d0603f"], [1, "#7a2617"]])}
      {lin("white", [[0, "#ffffff"], [0.6, "#ece7dc"], [1, "#bdb7aa"]])}
      {lin("whiteSide", [[0, "#f6f2e9"], [1, "#a9a396"]], false)}
      {lin("steel", [[0, "#edf1f5"], [0.5, "#b9c3cf"], [1, "#7d8999"]])}
      {lin("steelH", [[0, "#7d8999"], [0.45, "#edf1f5"], [1, "#8d99a8"]])}
      {lin("glass", [[0, "#89aedb"], [1, "#1d2f4b"]])}
      {lin("deck", [[0, "#8a6d4c"], [1, "#5c4630"]])}
      {lin("sand", [[0, "#d8cd9d"], [0.5, "#aea170"], [1, "#6f6644"]])}
      {lin("olive", [[0, "#9aa274"], [1, "#545a3a"]])}
      {lin("gold", [[0, "#f6d77d"], [0.5, "#d9a440"], [1, "#9b6d22"]])}
      {lin("note", [[0, "#c7e4bd"], [1, "#6f9e68"]])}
      {lin("concrete", [[0, "#eeeae1"], [1, "#a8a497"]])}
      {lin("yellow", [[0, "#f2d27a"], [1, "#a47f2c"]])}
      {lin("rust", [[0, "#8a6250"], [1, "#3c2a22"]])}
      {lin("water", [[0, "#2d4a73", 0.0], [0.25, "#1b3150", 0.85], [1, "#132542", 0.95]])}
      {lin("plume", [[0, "#fff6c8"], [0.25, "#ffd36a"], [0.6, "#ff8a2a", 0.7], [1, "#d2541f", 0]], false)}
      {lin("contrail", [[0, "#ffffff", 0], [1, "#ffffff", 0.75]], false)}
      {rad("sphere", [[0, "#ffffff"], [0.55, "#e4ded1"], [1, "#9c958a"]])}
      {rad("steelBall", [[0, "#a7b3c2"], [0.6, "#5a6678"], [1, "#2a3240"]])}
      {rad("flame", [[0, "#fffbe0"], [0.35, "#ffd36a"], [0.75, "#ff8a2a"], [1, "#d2541f", 0]], "50%", "70%")}
      {rad("glow", [[0, "#ffb020", 0.55], [1, "#ffb020", 0]], "50%", "50%")}
    </defs>
  );
};

/** a flame that flickers: tongues with their own beats, a hot core and a glow */
const Flame: React.FC<{ x: number; y: number; f: number; k?: number }> = ({ x, y, f, k = 1 }) => {
  const h = (i: number) => (20 + 10 * Math.sin(f / 2.3 + i * 2.1) + 6 * Math.sin(f / 1.3 + i)) * k;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={-10 * k} r={34 * k} fill={G("glow")} />
      {[-12, -4, 4, 12].map((dx, i) => (
        <path key={i} d={`M${dx * k - 9 * k} 0 C${dx * k - 8 * k} ${-h(i) * 0.7} ${dx * k + 3 * k} ${-h(i) * 1.2} ${dx * k + 1 * k} ${-h(i) * 1.6} C${dx * k + 6 * k} ${-h(i)} ${dx * k + 9 * k} ${-h(i) * 0.5} ${dx * k + 9 * k} 0 Z`} fill={i % 2 ? "#ffd36a" : FLAME} stroke="#d2541f" strokeWidth={1} />
      ))}
      <ellipse cx={0} cy={-6 * k} rx={9 * k} ry={6 * k} fill="#fffbe0" />
    </g>
  );
};

/** smoke rising and leaning with the wind (`drift`: where the wind carries it, per unit of rise), from (x, y) */
const Smoke: React.FC<{ x: number; y: number; f: number; k?: number; dark?: boolean; drift?: [number, number] }> = ({ x, y, f, k = 1, dark = true, drift = [0.85, 0.05] }) => (
  <g>
    {Array.from({ length: 9 }, (_, i) => {
      const u = ((f + i * 8) % 72) / 72;
      const rise = u * 150 * k;
      const wob = Math.sin(i * 2.4 + f / 20) * 6 * k * u;
      return <circle key={i} cx={x + rise * drift[0] + wob} cy={y - rise + rise * drift[1]} r={(7 + u * 34) * k} fill={dark ? (i % 2 ? "#2a2f38" : "#3a404b") : "#eef1f5"} opacity={(1 - u) * (dark ? 0.72 : 0.8)} />;
    })}
  </g>
);

/** the sea at a hull: the water over the underbody, foam along the waterline */
const Water: React.FC<{ x0: number; x1: number; f: number; y?: number }> = ({ x0, x1, f, y = 6 }) => (
  <g>
    <rect x={x0 - 6} y={y} width={x1 - x0 + 12} height={14} fill={G("water")} />
    <path d={`M${x0 - 8} ${y} ${Array.from({ length: Math.ceil((x1 - x0) / 16) + 2 }, (_, i) => `Q${x0 - 8 + i * 16 + 8} ${y - 2.5 + Math.sin(f / 4 + i) * 1.5} ${x0 - 8 + (i + 1) * 16} ${y}`).join(" ")}`} fill="none" stroke="#ffffff" strokeWidth={2.2} opacity={0.75} />
  </g>
);

// ---------------- the ships (side view, bow to +x, waterline at y = 0, about 260 long) ----------------

/** a merchant hull: deck at -h, a raked bow, a flat transom, the boot-top over the waterline */
const MerchantHull: React.FC<{ h: number; paint: string; f: number }> = ({ h, paint, f }) => (
  <g>
    <path d={`M-126 2 L118 2 L112 10 L-120 10 Z`} fill={G("boot")} opacity={0.55} />
    <path d={`M-130 ${-h} L106 ${-h} Q122 ${-h - 3} 134 ${-h - 9} L120 2 L-124 2 Z`} fill={paint} {...S} />
    <path d={`M-124 2 L120 2 L118 -3 L-125 -3 Z`} fill={G("boot")} />
    <path d={`M-129 ${-h + 3} L107 ${-h + 3} Q121 ${-h} 132 ${-h - 5}`} fill="none" stroke="#ffffff" strokeWidth={1.6} opacity={0.45} />
    <path d={`M-130 ${-h} L106 ${-h} Q122 ${-h - 3} 134 ${-h - 9}`} fill="none" stroke={STEEL} strokeWidth={2.4} />
    {/* the bow's anchor and its hawse pipe, the draught marks */}
    <circle cx={116} cy={-h + 6} r={3} fill={INK} />
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M126 ${-4 - i * 5} L129 ${-4 - i * 5}`} stroke="#ffffff" strokeWidth={1} opacity={0.6} />
    ))}
    <Water x0={-126} x1={122} f={f} y={2} />
  </g>
);

/** the house aft: decks of cabins, the bridge with its wings, a radar mast, the funnel with its company band */
const House: React.FC<{ x: number; h: number; decks: number; band: string; f: number }> = ({ x, h, decks, band, f }) => {
  const H = decks * 9 + 8;
  const top = -h - H;
  return (
    <g>
      <rect x={x} y={top} width={36} height={H} fill={G("white")} {...S} />
      <rect x={x + 26} y={top} width={10} height={H} fill={G("whiteSide")} opacity={0.6} />
      {Array.from({ length: decks }, (_, i) => (
        <g key={i}>
          <path d={`M${x} ${top + 8 + i * 9} L${x + 36} ${top + 8 + i * 9}`} stroke="#9e988b" strokeWidth={1} />
          {Array.from({ length: 5 }, (_, j) => (
            <rect key={j} x={x + 3 + j * 6.5} y={top + 10 + i * 9} width={3.5} height={4} fill="#3b5576" />
          ))}
        </g>
      ))}
      {/* the bridge: wider, its windows a dark band, the wings over the sides */}
      <rect x={x - 6} y={top - 10} width={48} height={11} fill={G("white")} {...S} />
      <rect x={x - 4} y={top - 7} width={44} height={5} fill={G("glass")} />
      <path d={`M${x - 8} ${top - 11} L${x + 44} ${top - 11}`} stroke={INK} strokeWidth={2.5} />
      {/* the radar mast and its scanner turning */}
      <path d={`M${x + 28} ${top - 11} L${x + 28} ${top - 30} M${x + 22} ${top - 22} L${x + 36} ${top - 22}`} stroke={INK} strokeWidth={2} />
      <rect x={x + 28 - 9 * Math.abs(Math.cos(f / 6))} y={top - 33} width={18 * Math.abs(Math.cos(f / 6)) + 1} height={3} fill={STEEL} stroke={INK} strokeWidth={0.8} />
      {/* the funnel on the house's after end, raked back: the company band, the black top, a little haze */}
      <path d={`M${x + 2} ${top - 10} L${x - 2} ${top - 34} L${x + 14} ${top - 36} L${x + 18} ${top - 10} Z`} fill={band} {...S} />
      <path d={`M${x + 1} ${top - 26} L${x + 16} ${top - 27} L${x + 15} ${top - 22} L${x + 1} ${top - 21} Z`} fill="#ffffff" opacity={0.85} />
      <path d={`M${x - 2} ${top - 34} L${x + 14} ${top - 36} L${x + 14.5} ${top - 31} L${x - 1} ${top - 30} Z`} fill={INK} />
      {[0, 1, 2].map((i) => {
        const u = ((f + i * 14) % 42) / 42;
        return <circle key={i} cx={x + 6 - u * 22} cy={top - 40 - u * 26} r={3 + u * 9} fill="#c9ced6" opacity={(1 - u) * 0.35} />;
      })}
      {/* the lifeboat on its slipway at the stern */}
      <path d={`M${x - 14} ${-h - 4} L${x - 2} ${-h - 10} L${x + 2} ${-h - 6} L${x - 10} ${-h} Z`} fill="#f26a21" {...s1} />
    </g>
  );
};

const tanker = (f: number, c: string) => {
  const h = 22;
  return (
    <g>
      <MerchantHull h={h} paint={G("hull")} f={f} />
      {/* the main deck: the long pipe rack, the catwalk on its stanchions, the manifold and its two hose cranes */}
      <path d={`M-84 ${-h - 4} L112 ${-h - 4} M-84 ${-h - 7} L112 ${-h - 7}`} stroke={STEEL_D} strokeWidth={2.4} />
      <path d={`M-84 ${-h - 13} L108 ${-h - 13}`} stroke={STEEL} strokeWidth={2} />
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d={`M${-80 + i * 12} ${-h} L${-80 + i * 12} ${-h - 13}`} stroke={STEEL_D} strokeWidth={1.2} />
      ))}
      {[-6, 10].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={-h - 12} width={8} height={12} fill={STEEL} {...s1} />
          <path d={`M${x} ${-h - 12} L${x} ${-h - 34} L${x + 18} ${-h - 24}`} fill="none" stroke={INK} strokeWidth={2.2} />
        </g>
      ))}
      {[-50, 40, 80].map((x) => (
        <rect key={x} x={x - 3} y={-h - 10} width={6} height={10} fill={STEEL_D} {...s1} />
      ))}
      {/* the forecastle, the windlass, the foremast with its light */}
      <path d={`M100 ${-h} L110 ${-h - 7} L130 ${-h - 13} L132 ${-h - 9}`} fill={G("hull")} {...s1} />
      <rect x={104} y={-h - 12} width={8} height={5} fill={STEEL_D} {...s1} />
      <path d={`M118 ${-h - 10} L118 ${-h - 38}`} stroke={INK} strokeWidth={2} />
      <circle cx={118} cy={-h - 40} r={2.4} fill={f % 30 < 15 ? "#ffefb0" : "#6b5a2a"} />
      <House x={-118} h={h} decks={5} band={c === "#ffd88a" ? "#c8553d" : c} f={f} />
    </g>
  );
};

const cargo = (f: number, c: string) => {
  const h = 26;
  const box = ["#c0563f", "#3d7fb8", "#d9a440", "#5e8f5a", "#e2ddd0", "#8a5aa8", "#2f6f73", "#b8432f"];
  const bays = Array.from({ length: 10 }, (_, i) => -64 + i * 18.5).filter((x) => x < 112);
  return (
    <g>
      <MerchantHull h={h} paint={G("hullBlue")} f={f} />
      {bays.map((x, i) => {
        const tiers = [4, 5, 5, 5, 5, 5, 5, 4, 4, 3][i] ?? 3;
        return (
          <g key={i}>
            {Array.from({ length: tiers }, (_, j) => (
              <g key={j}>
                <rect x={x} y={-h - 10 - j * 10} width={17} height={10} fill={pick(box, i * 5 + j * 3 + 1)} {...s1} strokeWidth={0.9} />
                {[4, 8, 12].map((d) => (
                  <path key={d} d={`M${x + d} ${-h - 9 - j * 10} L${x + d} ${-h - 1 - j * 10}`} stroke="#000" strokeWidth={0.6} opacity={0.35} />
                ))}
              </g>
            ))}
            <path d={`M${x - 0.8} ${-h} L${x - 0.8} ${-h - 10 - tiers * 10 + 10}`} stroke={STEEL_D} strokeWidth={1} />
          </g>
        );
      })}
      <path d={`M112 ${-h} L118 ${-h - 9} L132 ${-h - 14}`} fill="none" stroke={INK} strokeWidth={1.4} />
      <House x={-110} h={h} decks={7} band={c === "#ffd88a" ? "#3d7fb8" : c} f={f} />
    </g>
  );
};

const lng = (f: number, c: string) => {
  const h = 26;
  return (
    <g>
      <MerchantHull h={h} paint={G("hullBlue")} f={f} />
      <path d={`M-84 ${-h - 4} L112 ${-h - 4}`} stroke={STEEL_D} strokeWidth={3} />
      {[-58, -16, 26, 68].map((x) => (
        <g key={x}>
          {/* the Moss sphere: its skirt into the hull, the dome over the deck, the equator ring, the light on it */}
          <path d={`M${x - 24} ${-h} A24 24 0 0 1 ${x + 24} ${-h} Z`} fill={G("sphere")} {...S} />
          <path d={`M${x - 22} ${-h - 6} L${x + 22} ${-h - 6}`} stroke="#b0a99c" strokeWidth={1.6} />
          <ellipse cx={x - 8} cy={-h - 16} rx={7} ry={4} fill="#ffffff" opacity={0.8} />
          <rect x={x - 3} y={-h - 28} width={6} height={5} fill={STEEL} {...s1} />
        </g>
      ))}
      <House x={-118} h={h} decks={6} band={c === "#ffd88a" ? "#3d7fb8" : c} f={f} />
    </g>
  );
};

const warship = (f: number, c: string) => (
  <g>
    <path d="M-120 2 L112 2 L106 10 L-114 10 Z" fill={G("grey")} opacity={0.5} />
    {/* the flared hull, the knuckle, the sharp bow */}
    <path d="M-128 -16 L84 -16 L136 -26 L118 2 L-122 2 Z" fill={G("grey")} {...S} />
    <path d="M-126 -9 L96 -9 L126 -14" fill="none" stroke="#5f6b7b" strokeWidth={1.4} />
    <path d="M-128 -16 L84 -16 L136 -26" fill="none" stroke="#e3e8ee" strokeWidth={2} />
    <Water x0={-124} x1={118} f={f} y={2} />
    {/* the gun forward and its barrel */}
    <path d="M62 -16 L66 -26 L84 -26 L88 -16 Z" fill={G("grey")} {...S} />
    <path d="M84 -23 L118 -27" stroke={INK} strokeWidth={3.6} strokeLinecap="round" />
    {/* the missile cells */}
    <rect x={34} y={-20} width={22} height={4} fill="#5f6b7b" {...s1} />
    {[36, 41, 46, 51].map((x) => (
      <path key={x} d={`M${x} -20 L${x} -16`} stroke={INK} strokeWidth={0.8} />
    ))}
    {/* the bridge and the deckhouse, their angled faces, the radar panel, the mast */}
    <path d="M-30 -16 L-30 -46 L14 -46 L28 -16 Z" fill={G("grey")} {...S} />
    <path d="M-24 -46 L-22 -60 L10 -60 L14 -46 Z" fill={G("grey")} {...S} />
    <path d="M-20 -57 L8 -57 L10 -51 L-21 -51 Z" fill={G("glass")} />
    <path d="M0 -40 L8 -42 L14 -34 L12 -24 L4 -22 L-2 -30 Z" fill="#b9c4d1" {...s1} />
    <path d="M-8 -60 L-6 -104 M-16 -86 L4 -86 M-14 -96 L2 -96 M-6 -104 L-6 -112" stroke={INK} strokeWidth={2.2} />
    <rect x={-6 - 10 * Math.abs(Math.cos(f / 5))} y={-92} width={20 * Math.abs(Math.cos(f / 5)) + 1} height={3} fill={STEEL} stroke={INK} strokeWidth={0.8} />
    {/* the funnels, the hangar, the flight deck */}
    <path d="M-52 -16 L-50 -40 L-38 -40 L-36 -16 Z M-68 -16 L-66 -36 L-56 -36 L-54 -16 Z" fill="#8f9bab" {...S} />
    <rect x={-112} y={-34} width={40} height={18} fill={G("grey")} {...S} />
    <path d="M-128 -16 L-112 -16" stroke="#e3e8ee" strokeWidth={2} />
    {/* the ensign at the stern */}
    <path d="M-124 -16 L-124 -42" stroke={INK} strokeWidth={1.6} />
    <path d={`M-124 -42 Q-114 ${-44 + Math.sin(f / 5) * 2} -104 -40 L-104 -32 Q-114 ${-36 + Math.sin(f / 5) * 2} -124 -34 Z`} fill={c === "#ffd88a" ? "#3d8fe0" : c} stroke={INK} strokeWidth={1} />
  </g>
);

const fastBoat = (f: number, i: number) => (
  <g transform={`rotate(-4) translate(0 ${Math.sin(f / 3 + i) * 1.5})`}>
    <path d="M-60 4 Q-40 -2 -24 2 M-60 9 Q-40 6 -24 6" fill="none" stroke="#ffffff" strokeWidth={2.4} opacity={0.65} />
    <path d="M-26 0 L22 0 L36 -10 L-26 -10 Z" fill={G("grey")} {...S} />
    <path d="M-26 -4 L30 -4" stroke="#5f6b7b" strokeWidth={1} />
    <path d="M-12 -10 L-10 -20 L6 -20 L10 -10 Z" fill={G("white")} {...s1} />
    <path d="M-8 -18 L5 -18 L7 -13 L-8 -13 Z" fill={G("glass")} />
    <path d="M18 -10 L18 -14 L30 -16" stroke={INK} strokeWidth={2} />
    <path d="M-22 -10 L-22 -22" stroke={INK} strokeWidth={1.4} />
    <ellipse cx={30} cy={1} rx={14} ry={3} fill="#ffffff" opacity={0.6} />
  </g>
);

// ---------------- the art of every object ----------------

export const OBJECT_ART: Record<MapObjectId, (f: number, c: string, variant?: string, sign?: string) => React.ReactNode> = {
  tanker,
  cargo,
  lng,
  warship,
  boats: (f) => (
    <g>
      {[
        [-72, 16],
        [0, -14],
        [72, 12],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {fastBoat(f, i)}
        </g>
      ))}
    </g>
  ),
  mine: (f, c) => (
    <g transform={`translate(0 ${Math.sin(f / 9) * 3})`}>
      <path d="M0 22 L0 64" stroke={STEEL_D} strokeWidth={4} strokeDasharray="6 4" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 6;
        return (
          <g key={i}>
            <path d={`M${Math.cos(a) * 28} ${-6 + Math.sin(a) * 28} L${Math.cos(a) * 46} ${-6 + Math.sin(a) * 46}`} stroke={INK} strokeWidth={12} strokeLinecap="round" />
            <path d={`M${Math.cos(a) * 28} ${-6 + Math.sin(a) * 28} L${Math.cos(a) * 46} ${-6 + Math.sin(a) * 46}`} stroke={G("steel")} strokeWidth={7} strokeLinecap="round" />
          </g>
        );
      })}
      <circle cx={0} cy={-6} r={32} fill={G("steelBall")} {...S} />
      <path d="M-32 -6 A32 32 0 0 0 32 -6" fill="none" stroke={c === "#ffd88a" ? "#b8432f" : c} strokeWidth={5} />
      {[-18, 0, 18].map((x) => (
        <circle key={x} cx={x} cy={-30 + Math.abs(x) * 0.3} r={1.6} fill={INK} />
      ))}
      <path d="M-30 -14 A32 32 0 0 1 -6 -36" fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.5} />
      <rect x={-48} y={6} width={96} height={30} fill={G("water")} />
      <path d={`M-52 8 Q-26 ${2 + Math.sin(f / 5) * 2} 0 8 T52 8`} fill="none" stroke="#ffffff" strokeWidth={2.4} opacity={0.7} />
    </g>
  ),
  missile: (f, c, variant) =>
    variant === "cruise" ? (
      <g>
        <path d={`M-58 0 L${-120 - Math.sin(f / 1.3) * 8} -4 L${-120 - Math.sin(f / 1.3) * 8} 4 Z`} fill={G("plume")} />
        <path d="M-60 -6 L50 -6 Q74 -6 80 0 Q74 6 50 6 L-60 6 Z" fill={G("steel")} {...S} />
        <path d="M-10 0 L-34 -30 L-26 -30 L4 -2 Z M-10 0 L-34 30 L-26 30 L4 2 Z" fill={G("grey")} {...S} />
        <path d="M-60 -6 L-72 -18 L-50 -6 Z M-60 6 L-72 18 L-50 6 Z" fill={G("grey")} {...S} />
        <path d="M-20 6 L10 6 L6 11 L-16 11 Z" fill="#5f6b7b" {...s1} />
        <path d="M54 -6 Q72 -5 80 0" fill="none" stroke={c === "#ffd88a" ? "#b8432f" : c} strokeWidth={3} />
      </g>
    ) : (
      <g>
        {/* the exhaust: a long plume, a white-hot core, the shock diamonds */}
        <path d={`M-82 -7 L${-190 - Math.sin(f / 1.2) * 14} -3 L${-190 - Math.sin(f / 1.2) * 14} 3 L-82 7 Z`} fill={G("plume")} />
        <path d={`M-82 -3 L${-130 - Math.sin(f / 1.1) * 8} 0 L-82 3 Z`} fill="#fffbe0" />
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={-96 - i * 14} cy={0} rx={4} ry={2.6} fill="#ffffff" opacity={0.7 - i * 0.2} />
        ))}
        <path d="M-82 -9 L-98 -26 L-70 -9 Z M-82 9 L-98 26 L-70 9 Z" fill={G("grey")} {...S} />
        <rect x={-82} y={-9} width={120} height={18} rx={2} fill={G("white")} {...S} />
        {[-60, -30, 0].map((x) => (
          <path key={x} d={`M${x} -9 L${x} 9`} stroke="#9e988b" strokeWidth={1.2} />
        ))}
        <rect x={-44} y={-9} width={10} height={18} fill={c === "#ffd88a" ? "#3a4658" : c} />
        <path d="M38 -9 Q78 -9 94 0 Q78 9 38 9 Z" fill={G("grey")} {...S} />
        <path d="M44 -8 Q70 -7 84 -2" fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.5} />
      </g>
    ),
  drone: (f, _c, variant) =>
    variant === "male" ? (
      <g>
        {/* a MALE drone from above: long straight wings, a slim body with its sensor ball, the V-tail, the pusher prop */}
        <path d="M14 -6 L6 -112 L-8 -112 L-10 -6 Z M14 6 L6 112 L-8 112 L-10 6 Z" fill={G("steel")} {...S} />
        <path d="M6 -112 L-8 -112 M6 112 L-8 112" stroke={INK} strokeWidth={2} />
        <path d="M74 0 Q72 -10 56 -10 L-64 -6 L-64 6 L56 10 Q72 10 74 0 Z" fill={G("steelH")} {...S} />
        <circle cx={62} cy={0} r={6} fill="#2a3240" />
        <path d="M-56 -4 L-80 -30 L-86 -28 L-66 -2 Z M-56 4 L-80 30 L-86 28 L-66 2 Z" fill={G("grey")} {...S} />
        <ellipse cx={-70} cy={0} rx={3} ry={18} fill="#8d99a8" opacity={0.55} transform={`rotate(${(f * 47) % 360} -70 0)`} />
      </g>
    ) : (
      <g>
        {/* a Shahed-type one-way drone from above: the cranked delta, the winglets, the nose, the pusher prop */}
        <path d="M58 -6 L-34 -70 L-50 -66 L-38 -6 Z M58 6 L-34 70 L-50 66 L-38 6 Z" fill={G("sand")} {...S} />
        <path d="M-34 -70 L-50 -78 L-50 -66 Z M-34 70 L-50 78 L-50 66 Z" fill="#6f6644" {...s1} />
        <path d="M-10 -30 L36 -8 M-10 30 L36 8" stroke="#6f6644" strokeWidth={1.4} />
        <path d="M80 0 Q76 -9 58 -9 L-46 -7 L-46 7 L58 9 Q76 9 80 0 Z" fill={G("sand")} {...S} />
        <path d="M60 -6 Q74 -5 78 -1" fill="none" stroke="#ffffff" strokeWidth={1.6} opacity={0.5} />
        <ellipse cx={-52} cy={0} rx={4} ry={22} fill="#8d99a8" opacity={0.55} transform={`rotate(${(f * 47) % 360} -52 0)`} />
        <circle cx={-50} cy={0} r={4} fill={INK} />
      </g>
    ),
  jet: (_f, c, variant) =>
    variant === "f35" ? (
      <g>
        {/* an F-35 from above: the chined nose, the trapezoid wings, the canted twin tails, one engine */}
        <path d="M24 -10 L-26 -66 L-46 -64 L-40 -12 Z M24 10 L-26 66 L-46 64 L-40 12 Z" fill={G("grey")} {...S} />
        <path d="M-50 -12 L-74 -40 L-86 -38 L-74 -12 Z M-50 12 L-74 40 L-86 38 L-74 12 Z" fill={G("grey")} {...S} />
        <path d="M96 0 L70 -10 L30 -16 L-70 -14 L-84 -8 L-84 8 L-70 14 L30 16 L70 10 Z" fill={G("steelH")} {...S} />
        <path d="M-46 -12 L-60 -26 M-46 12 L-60 26" stroke={INK} strokeWidth={3} />
        <ellipse cx={56} cy={0} rx={18} ry={5} fill={G("glass")} stroke={INK} strokeWidth={1.2} />
        <path d="M22 -16 L10 -20 M22 16 L10 20" stroke={INK} strokeWidth={1.6} />
        <ellipse cx={-88} cy={0} rx={6} ry={7} fill={FLAME} opacity={0.85} />
      </g>
    ) : variant === "su35" ? (
      <g>
        {/* an Su-35 from above: the long nose, the root extensions, the big swept wings, two engines far apart, two tails */}
        <path d="M30 -14 L-30 -86 L-48 -86 L-44 -18 Z M30 14 L-30 86 L-48 86 L-44 18 Z" fill={G("grey")} {...S} />
        <path d="M60 -8 L30 -16 L-10 -20 M60 8 L30 16 L-10 20" fill="none" stroke={INK} strokeWidth={1.4} />
        <path d="M-60 -18 L-86 -48 L-98 -46 L-84 -18 Z M-60 18 L-86 48 L-98 46 L-84 18 Z" fill={G("grey")} {...S} />
        <path d="M110 0 L80 -8 L40 -12 L-86 -26 L-100 -22 L-100 22 L-86 26 L40 12 L80 8 Z" fill={G("steelH")} {...S} />
        <path d="M-60 -22 L-74 -40 M-60 22 L-74 40" stroke={INK} strokeWidth={3} />
        <ellipse cx={-104} cy={-14} rx={5} ry={6} fill={FLAME} opacity={0.85} />
        <ellipse cx={-104} cy={14} rx={5} ry={6} fill={FLAME} opacity={0.85} />
        <ellipse cx={74} cy={0} rx={16} ry={5} fill={G("glass")} stroke={INK} strokeWidth={1.2} />
        <circle cx={-20} cy={-50} r={3} fill={c === "#ffd88a" ? "#b8432f" : c} />
        <circle cx={-20} cy={50} r={3} fill={c === "#ffd88a" ? "#b8432f" : c} />
      </g>
    ) : (
      <g>
        {/* a fighter from above: swept wings, tailplanes, one fin, the bubble canopy */}
        <path d="M30 -6 L-26 -70 L-44 -70 L-34 -8 Z M30 6 L-26 70 L-44 70 L-34 8 Z" fill={G("grey")} {...S} />
        <path d="M-50 -8 L-74 -36 L-84 -36 L-72 -8 Z M-50 8 L-74 36 L-84 36 L-72 8 Z" fill={G("grey")} {...S} />
        <path d="M92 0 L62 -7 L-62 -9 L-80 -5 L-80 5 L-62 9 L62 7 Z" fill={G("steelH")} {...S} />
        <path d="M-56 0 L-80 0" stroke={INK} strokeWidth={3} />
        <ellipse cx={50} cy={0} rx={14} ry={4.5} fill={G("glass")} stroke={INK} strokeWidth={1.2} />
        <ellipse cx={-84} cy={0} rx={6} ry={7} fill={FLAME} opacity={0.8} />
      </g>
    ),
  rig: (f) => (
    <g>
      {/* the jacket: four legs into the sea, the X bracing, the foam at the legs */}
      {[-52, -22, 22, 52].map((x) => (
        <path key={x} d={`M${x * 1.12} 14 L${x * 0.86} -56`} stroke={G("yellow")} strokeWidth={7} />
      ))}
      <path d="M-58 8 L50 -34 M58 8 L-50 -34 M-56 -14 L54 -14 M-48 -36 L46 -36" stroke="#a8914f" strokeWidth={3} />
      <rect x={-70} y={6} width={140} height={16} fill={G("water")} />
      {[-58, -25, 25, 58].map((x) => (
        <ellipse key={x} cx={x} cy={7} rx={8} ry={2.4} fill="#ffffff" opacity={0.65} />
      ))}
      {/* the two decks, the modules, the living quarters, the helideck, the derrick, the crane, the flare */}
      <rect x={-74} y={-70} width={148} height={14} fill={G("yellow")} {...S} />
      <rect x={-70} y={-86} width={44} height={16} fill={G("white")} {...S} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M-66 ${-82 + i * 4} L-30 ${-82 + i * 4}`} stroke="#3b5576" strokeWidth={1.6} strokeDasharray="3 2" />
      ))}
      <rect x={-20} y={-84} width={22} height={14} fill="#5e8f5a" {...s1} />
      <rect x={6} y={-80} width={30} height={10} fill="#b8432f" {...s1} />
      <rect x={40} y={-82} width={26} height={12} fill={G("steel")} {...s1} />
      <path d="M-72 -90 L-30 -90 L-36 -86 L-66 -86 Z" fill="#4f7d5c" {...s1} />
      <path d="M-56 -90 L-56 -92 M-48 -90 L-48 -92" stroke="#ffffff" strokeWidth={1.4} />
      <path d="M-14 -84 L-2 -170 L10 -84 M-11 -110 L7 -110 M-8 -136 L4 -136 M-12 -96 L8 -124 M8 -96 L-10 -124 M-7 -124 L5 -148 M5 -124 L-6 -148" fill="none" stroke={INK} strokeWidth={2.4} />
      <path d="M44 -82 L92 -126" stroke={INK} strokeWidth={4} />
      <path d="M92 -126 L92 -108" stroke={INK} strokeWidth={1.2} />
      <path d="M66 -64 L124 -100" stroke={STEEL_D} strokeWidth={5} />
      <Flame x={126} y={-102} f={f} k={0.9} />
      <Smoke x={128} y={-128} f={f} k={0.45} drift={[0.9, 0]} />
    </g>
  ),
  refinery: (f) => (
    <g>
      <rect x={-130} y={-4} width={260} height={8} fill={G("concrete")} {...S} />
      {/* the tank farm: floating-roof tanks and an LPG sphere */}
      {[-112, -80].map((x) => (
        <g key={x}>
          <rect x={x - 15} y={-40} width={30} height={36} fill={G("steelH")} {...S} />
          <ellipse cx={x} cy={-40} rx={15} ry={4.5} fill={G("white")} {...s1} />
          {[-28, -16].map((y) => (
            <path key={y} d={`M${x - 15} ${y} L${x + 15} ${y}`} stroke="#9aa6b5" strokeWidth={1} />
          ))}
        </g>
      ))}
      <circle cx={-52} cy={-24} r={18} fill={G("sphere")} {...S} />
      <path d="M-66 -4 L-62 -14 M-38 -4 L-42 -14" stroke={INK} strokeWidth={2} />
      {/* the pipe rack */}
      <path d="M-34 -30 L60 -30 M-34 -24 L60 -24 M-34 -18 L60 -18" stroke={STEEL_D} strokeWidth={2.4} />
      {[-30, -2, 26, 54].map((x) => (
        <path key={x} d={`M${x} -4 L${x} -32`} stroke={INK} strokeWidth={1.6} />
      ))}
      {/* the distillation columns with their platforms and ladders, the cracker */}
      {[
        [-14, 140, 16],
        [12, 110, 12],
      ].map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={-h} width={w} height={h - 4} rx={w / 2} fill={G("steelH")} {...S} />
          {Array.from({ length: Math.floor(h / 22) }, (_, j) => (
            <path key={j} d={`M${x - 4} ${-h + 14 + j * 22} L${x + w + 4} ${-h + 14 + j * 22}`} stroke={INK} strokeWidth={1.4} />
          ))}
          <path d={`M${x + w + 2} -4 L${x + w + 2} ${-h + 8}`} stroke={INK} strokeWidth={0.8} strokeDasharray="2 2" />
        </g>
      ))}
      <rect x={34} y={-60} width={34} height={56} fill={G("concrete")} {...S} />
      <rect x={44} y={-98} width={10} height={38} fill={G("steelH")} {...S} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={38 + i * 10} y={-50} width={6} height={8} fill="#3b5576" />
      ))}
      <Smoke x={49} y={-104} f={f} k={0.55} dark={false} />
      {/* the flare stacks, burning */}
      {[96, 116].map((x, i) => (
        <g key={x}>
          <path d={`M${x} -4 L${x} ${-150 + i * 30}`} stroke={INK} strokeWidth={4} />
          <path d={`M${x - 6} -4 L${x} -60 L${x + 6} -4`} fill="none" stroke={INK} strokeWidth={1.2} />
          <Flame x={x} y={-152 + i * 30} f={f + i * 7} k={0.7} />
        </g>
      ))}
    </g>
  ),
  pipeline: (f, c) => (
    <g>
      {[-90, -30, 30, 90].map((x) => (
        <path key={x} d={`M${x - 10} 0 L${x - 4} -24 L${x + 4} -24 L${x + 10} 0`} fill={G("concrete")} {...s1} />
      ))}
      <path d="M-120 -34 L-40 -34 L-40 -62 L-10 -62 L-10 -34 L120 -34" fill="none" stroke={INK} strokeWidth={18} strokeLinejoin="round" />
      <path d="M-120 -34 L-40 -34 L-40 -62 L-10 -62 L-10 -34 L120 -34" fill="none" stroke={G("steelH")} strokeWidth={13} strokeLinejoin="round" />
      {[-100, -70, 10, 50, 100].map((x) => (
        <rect key={x} x={x - 3} y={-42} width={6} height={16} rx={1} fill={STEEL_D} {...s1} />
      ))}
      {/* the valve station: its body, its wheel turning */}
      <rect x={58} y={-44} width={20} height={20} rx={3} fill={G("steel")} {...S} />
      <path d="M68 -44 L68 -60" stroke={INK} strokeWidth={3} />
      <g transform={`rotate(${f * 2} 68 -64)`}>
        <circle cx={68} cy={-64} r={10} fill="none" stroke={c === "#ffd88a" ? "#b8432f" : c} strokeWidth={3.5} />
        <path d="M58 -64 L78 -64 M68 -74 L68 -54" stroke={c === "#ffd88a" ? "#b8432f" : c} strokeWidth={2.4} />
      </g>
    </g>
  ),
  barrel: (f, c) => (
    <g>
      <rect x={-36} y={-100} width={72} height={100} rx={6} fill={c === "#ffd88a" ? "#2f5d8a" : c} {...S} />
      <rect x={-36} y={-100} width={72} height={100} rx={6} fill={G("steelH")} opacity={0.35} />
      {[-34, -66].map((y) => (
        <g key={y}>
          <path d={`M-36 ${y} L36 ${y}`} stroke={INK} strokeWidth={4} />
          <path d={`M-36 ${y - 3} L36 ${y - 3}`} stroke="#ffffff" strokeWidth={1.2} opacity={0.4} />
        </g>
      ))}
      <ellipse cx={0} cy={-100} rx={36} ry={9} fill="#7a9cc0" {...S} />
      <ellipse cx={0} cy={-100} rx={28} ry={6} fill="none" stroke="#5a7ca0" strokeWidth={1.4} />
      <circle cx={16} cy={-101} r={4} fill={INK} />
      <path d={`M0 ${-60 + Math.sin(f / 10) * 1.5} Q-12 -44 -12 -38 A12 12 0 0 0 12 -38 Q12 -44 0 ${-60 + Math.sin(f / 10) * 1.5} Z`} fill={INK} stroke="#f3efe6" strokeWidth={2} />
      <path d="M-4 -46 Q-6 -42 -4 -39" fill="none" stroke="#ffffff" strokeWidth={1.6} opacity={0.7} />
    </g>
  ),
  nuclear: (f, c) => (
    <g>
      <rect x={-140} y={-4} width={280} height={8} fill={G("concrete")} {...S} />
      {/* the fence along the front */}
      <path d="M-136 -2 L136 -2" stroke={INK} strokeWidth={1} strokeDasharray="2 3" />
      {/* the cooling tower and its steam */}
      <path d="M-132 -4 L-118 -44 Q-128 -96 -114 -128 L-66 -128 Q-52 -96 -62 -44 L-48 -4 Z" fill={G("concrete")} {...S} />
      <path d="M-120 -44 Q-90 -38 -60 -44" fill="none" stroke="#9e988b" strokeWidth={2} />
      <Smoke x={-92} y={-132} f={f} k={0.85} dark={false} drift={[0.6, 0]} />
      {/* the halls with their ridged roofs */}
      <rect x={-40} y={-40} width={70} height={36} fill={G("concrete")} {...S} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${-40 + i * 11.6} -40 L${-34 + i * 11.6} -48 L${-28.4 + i * 11.6} -40`} fill={G("steel")} {...s1} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={-34 + i * 16} y={-28} width={8} height={10} fill="#3b5576" />
      ))}
      <rect x={-40} y={-14} width={70} height={4} fill={c === "#ffd88a" ? FLAME : c} />
      {/* the domes */}
      {[
        [56, 34],
        [108, 26],
      ].map(([x, r]) => (
        <g key={x}>
          <rect x={x - r} y={-r * 0.9} width={r * 2} height={r * 0.9 - 4} fill={G("concrete")} {...S} />
          <path d={`M${x - r} ${-r * 0.9} A${r} ${r} 0 0 1 ${x + r} ${-r * 0.9} Z`} fill={G("sphere")} {...S} />
          <path d={`M${x - r * 0.6} ${-r * 1.3} A${r * 0.7} ${r * 0.5} 0 0 1 ${x} ${-r * 1.75}`} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.8} />
        </g>
      ))}
      <path d="M134 -4 L134 -110" stroke={INK} strokeWidth={5} />
      <path d="M130 -110 L138 -110" stroke="#b8432f" strokeWidth={4} />
    </g>
  ),
  tank: () => (
    <g>
      <rect x={-92} y={-28} width={176} height={28} rx={14} fill="#2d3226" {...S} />
      {Array.from({ length: 22 }, (_, i) => (
        <path key={i} d={`M${-82 + i * 8} -1 L${-80 + i * 8} 1`} stroke="#6b7356" strokeWidth={2} />
      ))}
      {[-70, -46, -22, 2, 26, 50].map((x) => (
        <g key={x}>
          <circle cx={x} cy={-12} r={10} fill="#5a6146" stroke={INK} strokeWidth={1.4} />
          <circle cx={x} cy={-12} r={4} fill="#3b4030" />
        </g>
      ))}
      <circle cx={70} cy={-16} r={7} fill="#5a6146" stroke={INK} strokeWidth={1.2} />
      <path d="M-98 -28 L88 -28 L102 -42 L-90 -48 Z" fill={G("sand")} {...S} />
      <path d="M-90 -36 L96 -34" stroke="#6f6644" strokeWidth={1} />
      <path d="M-46 -48 L36 -48 L48 -64 L-36 -72 Z" fill={G("sand")} {...S} />
      {[-40, -26, -12, 2, 16, 30].map((x) => (
        <rect key={x} x={x} y={-60} width={11} height={8} fill="#8c845c" {...s1} strokeWidth={0.8} />
      ))}
      <rect x={46} y={-64} width={104} height={7} rx={2} fill="#8c845c" {...S} strokeWidth={1.4} />
      <rect x={96} y={-66} width={14} height={11} rx={3} fill="#7f7550" {...s1} />
      <rect x={-22} y={-82} width={20} height={10} rx={3} fill="#7f7550" {...s1} />
      <path d="M-12 -82 L6 -88" stroke={INK} strokeWidth={2.4} />
      <path d="M-40 -72 L-40 -100" stroke={INK} strokeWidth={1.4} />
    </g>
  ),
  troops: (f) => (
    <g>
      {[
        [-60, 8, 0.92],
        [0, 0, 1],
        [60, 10, 0.9],
      ].map(([x, y, k], i) => {
        const step = Math.sin(f / 5 + i * 2) * 4;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
            <ellipse cx={0} cy={2} rx={20} ry={4} fill="#000" opacity={0.35} />
            <path d={`M-7 -42 L${-11 - step * 0.3} -2 M7 -42 L${11 + step * 0.3} -2`} stroke="#4c5338" strokeWidth={9} strokeLinecap="round" />
            <path d={`M${-14 - step * 0.3} -2 L${-6 - step * 0.3} -2 M${8 + step * 0.3} -2 L${16 + step * 0.3} -2`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
            <path d="M-15 -90 L15 -90 L13 -42 L-13 -42 Z" fill={G("olive")} {...S} />
            <rect x={-13} y={-80} width={26} height={20} rx={3} fill="#5d6447" {...s1} />
            {[-8, 0, 8].map((p) => (
              <rect key={p} x={p - 3} y={-76} width={6} height={7} fill="#4c5338" />
            ))}
            <circle cx={0} cy={-100} r={10} fill="#d6b48c" {...s1} />
            <path d="M-15 -102 A15 13 0 0 1 15 -102 L17 -99 L-17 -99 Z" fill={G("olive")} {...s1} />
            <path d="M-26 -66 L30 -94" stroke={INK} strokeWidth={5} strokeLinecap="round" />
            <path d="M-8 -70 L-12 -76" stroke={INK} strokeWidth={3} />
            <path d="M-12 -84 L12 -70" stroke="#7d8460" strokeWidth={8} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  ),
  parliament: (f, c, variant) => {
    const flag = (x: number, y: number) => (
      <g>
        <path d={`M${x} ${y} L${x} ${y - 40}`} stroke={INK} strokeWidth={2.4} />
        <path d={`M${x} ${y - 40} Q${x + 12} ${y - 44 + Math.sin(f / 5) * 4} ${x + 24} ${y - 40} T${x + 48} ${y - 40} L${x + 48} ${y - 20} Q${x + 36} ${y - 24 + Math.sin(f / 5 + 1) * 4} ${x + 24} ${y - 20} T${x} ${y - 20} Z`} fill={c === "#ffd88a" ? FLAME : c} stroke={INK} strokeWidth={1.2} />
      </g>
    );
    if (variant === "majlis")
      return (
        <g>
          {/* Iran's Majlis at Baharestan: the stepped pyramid, its bands of windows, the crown on top */}
          <rect x={-130} y={-8} width={260} height={8} fill={G("concrete")} {...S} />
          <path d="M-118 -8 L-74 -120 L74 -120 L118 -8 Z" fill={G("concrete")} {...S} />
          <path d="M40 -120 L74 -120 L118 -8 L80 -8 Z" fill="#000" opacity={0.14} />
          {Array.from({ length: 7 }, (_, i) => {
            const y = -20 - i * 14;
            const w = 112 - i * 6;
            return <path key={i} d={`M${-w} ${y} L${w} ${y}`} stroke="#3b5576" strokeWidth={4} strokeDasharray="6 3" />;
          })}
          <path d="M-74 -120 L-60 -140 L60 -140 L74 -120 Z" fill={G("steel")} {...S} />
          <rect x={-40} y={-30} width={80} height={22} fill={G("glass")} {...s1} />
          {flag(0, -140)}
        </g>
      );
    if (variant === "capitol")
      return (
        <g>
          <rect x={-136} y={-8} width={272} height={8} fill={G("concrete")} {...S} />
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect x={s < 0 ? -134 : 40} y={-52} width={94} height={44} fill={G("white")} {...S} />
              {Array.from({ length: 6 }, (_, i) => (
                <rect key={i} x={(s < 0 ? -126 : 48) + i * 14} y={-46} width={5} height={34} fill="#c8c2b5" />
              ))}
            </g>
          ))}
          <rect x={-40} y={-66} width={80} height={58} fill={G("white")} {...S} />
          <path d="M-46 -66 L46 -66 L0 -84 Z" fill={G("white")} {...S} />
          <rect x={-30} y={-110} width={60} height={26} fill={G("white")} {...S} />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={-27 + i * 8.5} y={-106} width={3.5} height={20} fill="#c8c2b5" />
          ))}
          <path d="M-32 -110 A32 36 0 0 1 32 -110 Z" fill={G("sphere")} {...S} />
          <rect x={-5} y={-156} width={10} height={12} fill={G("white")} {...s1} />
          {flag(0, -156)}
        </g>
      );
    return (
      <g>
        <rect x={-104} y={-8} width={208} height={8} fill={G("concrete")} {...S} />
        <rect x={-96} y={-16} width={192} height={8} fill={G("concrete")} {...S} />
        <rect x={-88} y={-26} width={176} height={10} fill={G("white")} {...S} />
        {[-72, -44, -16, 16, 44, 72].map((x) => (
          <g key={x}>
            <rect x={x - 6} y={-88} width={12} height={62} fill={G("whiteSide")} {...s1} />
            <rect x={x - 8} y={-90} width={16} height={4} fill={G("white")} {...s1} />
          </g>
        ))}
        <rect x={-88} y={-98} width={176} height={10} fill={G("white")} {...S} />
        <path d="M-94 -98 L94 -98 L0 -128 Z" fill={G("white")} {...S} />
        <rect x={-28} y={-142} width={56} height={14} fill={G("white")} {...S} />
        <path d="M-32 -142 A32 32 0 0 1 32 -142 Z" fill={G("sphere")} {...S} />
        {flag(0, -174)}
      </g>
    );
  },
  money: (f, _c, _v, sign) => (
    <g>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={-94 + (i % 2) * 4} y={-24 - i * 8} width={144} height={24} rx={3} fill={G("note")} {...s1} />
      ))}
      <rect x={-92} y={-100} width={144} height={58} rx={4} fill={G("note")} {...S} />
      <rect x={-86} y={-94} width={132} height={46} rx={3} fill="none" stroke="#4d7a4a" strokeWidth={2} />
      <rect x={-36} y={-100} width={30} height={58} fill="#e9e2c8" opacity={0.9} />
      <ellipse cx={14} cy={-71} rx={16} ry={18} fill="#cfe5c6" stroke="#4d7a4a" strokeWidth={2} />
      {sign ? (
        <text x={14} y={-61} textAnchor="middle" fontFamily={VAZIR} fontWeight={800} fontSize={30} fill="#2f5a2c">
          {sign}
        </text>
      ) : (
        <circle cx={14} cy={-73} r={6} fill="#4d7a4a" />
      )}
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} transform={`translate(${84} ${-6 - i * 9 + (i === 5 ? Math.sin(f / 8) * 2 : 0)})`}>
          <ellipse cx={0} cy={0} rx={24} ry={7} fill="#a87a28" {...s1} />
          <ellipse cx={0} cy={-3} rx={24} ry={7} fill={G("gold")} {...s1} />
        </g>
      ))}
    </g>
  ),
  treaty: (f, c) => (
    <g transform="rotate(-6)">
      <rect x={-62} y={-172} width={132} height={176} rx={4} fill="#000" opacity={0.25} />
      <rect x={-66} y={-176} width={132} height={176} rx={4} fill={G("white")} {...S} />
      <path d="M-40 -158 L40 -158" stroke="#3b4658" strokeWidth={5} strokeLinecap="round" />
      {[-140, -124, -108, -92, -76].map((y, i) => (
        <path key={y} d={`M-48 ${y} L${i === 4 ? 10 : 48} ${y}`} stroke="#9aa3ad" strokeWidth={3.5} strokeLinecap="round" />
      ))}
      <path d="M-50 -40 q10 -16 20 0 t20 -4 t18 2 M10 -30 q8 -12 16 0 t14 -2" fill="none" stroke="#2b3a52" strokeWidth={2.6} />
      {[
        [-30, -18],
        [42, -18],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x - 6} ${y + 10} L${x - 10} ${y + 30} M${x + 6} ${y + 10} L${x + 10} ${y + 30}`} stroke={i ? "#3d7fb8" : "#b8432f"} strokeWidth={5} />
          <circle cx={x} cy={y} r={15} fill={i ? "#3d7fb8" : c === "#ffd88a" ? "#b8432f" : c} {...S} />
          <circle cx={x} cy={y} r={9} fill="none" stroke="#ffffff" strokeWidth={1.6} opacity={0.6} />
        </g>
      ))}
      <g transform={`rotate(${-35 + Math.sin(f / 12) * 2} 0 -60)`}>
        <rect x={-10} y={-150} width={14} height={100} rx={6} fill={INK} />
        <rect x={-10} y={-120} width={14} height={6} fill="#d9a440" />
        <path d="M-10 -50 L4 -50 L-3 -30 Z" fill="#d9a440" />
      </g>
    </g>
  ),
  padlock: () => (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx={-110 + i * 22 + (i > 2 ? 132 : 0) - (i > 2 ? 66 : 0)} cy={-40} rx={12} ry={7} fill="none" stroke={STEEL_D} strokeWidth={5} />
      ))}
      <path d="M-34 -82 L-34 -112 A34 34 0 0 1 34 -112 L34 -82" fill="none" stroke={INK} strokeWidth={20} />
      <path d="M-34 -82 L-34 -112 A34 34 0 0 1 34 -112 L34 -82" fill="none" stroke={G("steelH")} strokeWidth={13} />
      <rect x={-56} y={-88} width={112} height={88} rx={12} fill={G("gold")} {...S} />
      <rect x={-48} y={-80} width={96} height={6} rx={3} fill="#ffffff" opacity={0.35} />
      <circle cx={0} cy={-52} r={10} fill={INK} />
      <path d="M-6 -50 L6 -50 L4 -24 L-4 -24 Z" fill={INK} />
    </g>
  ),
};

/**
 * One consistent scale on the map (round 4): a VLCC is the largest thing on the sea; a container ship and an LNG
 * carrier about as long; a destroyer about 0.8 of it; a fast boat a fifth (three of them make the group); a jet and a
 * drone the size of a destroyer's length (they are seen from above, nearer the camera); a missile smaller; buildings
 * about a VLCC's width.
 */
const SCALE: Record<MapObjectId, number> = { tanker: 0.88, cargo: 0.88, lng: 0.88, warship: 0.74, boats: 0.62, mine: 0.62, missile: 0.62, drone: 0.72, jet: 0.78, rig: 0.82, refinery: 0.82, pipeline: 0.74, barrel: 0.82, nuclear: 0.8, tank: 0.8, troops: 0.82, parliament: 0.8, money: 0.8, treaty: 0.72, padlock: 0.76 };
/** where a fire sits on each object, in its own units */
const FIRE_AT: Partial<Record<MapObjectId, [number, number]>> = { tanker: [30, -32], cargo: [20, -60], lng: [-16, -46], warship: [-20, -40], rig: [-30, -88], refinery: [-80, -46], pipeline: [0, -40], barrel: [0, -104], nuclear: [0, -50] };
const SHIP_IDS = new Set<MapObjectId>(["tanker", "cargo", "lng", "warship"]);

/** A burst where a missile or a drone lands: a short flash, a shock ring and sparks, `t` frames after the hit. */
export const Burst: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  // pass 3: 16 frames, the flash no wider than a ship's hull, so what it hits is seen at once (and the ship draws over it)
  if (t < 0 || t > 16) return null;
  const k = out3(t / 16);
  return (
    <g>
      <circle cx={x} cy={y} r={20 + k * 90} fill="none" stroke="#ffe08a" strokeWidth={8 * (1 - k)} opacity={1 - k} />
      <circle cx={x} cy={y} r={40 * (1 - k * 0.6)} fill={FLAME} opacity={(1 - k) * 0.7} />
      <circle cx={x} cy={y} r={26 * (1 - k)} fill="#fffaf0" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 + 0.3;
        return <path key={i} d={`M${x + Math.cos(a) * (20 + k * 60)} ${y + Math.sin(a) * (20 + k * 60)} L${x + Math.cos(a) * (34 + k * 100)} ${y + Math.sin(a) * (34 + k * 100)}`} stroke="#ffe08a" strokeWidth={4} opacity={1 - k} strokeLinecap="round" />;
      })}
    </g>
  );
};

export type ObjectSpec = {
  id: MapObjectId;
  lon: number;
  lat: number;
  color?: string;
  move?: ObjectMove;
  path?: [number, number][];
  /** frames after it lands when it catches fire (true: from the start) */
  fire?: number | boolean;
  /** an approaching ship: frames it takes along its path to its point (the incident's time) */
  arrive?: number;
  size?: number;
  sign?: string;
  /** a type of its kind: shahed | male (drones), f35 | su35 (jets), ballistic | cruise (missiles), majlis | capitol (parliaments) */
  variant?: string;
  /** where the wind carries smoke, on the screen (per unit of rise); the default leans it to the right */
  wind?: [number, number];
};

/** The object at a screen point, turned and flipped, with its shadow, its fire and the aftermath of a hit. */
const Art: React.FC<{ o: ObjectSpec; x: number; y: number; angle: number; flip: boolean; k: number; f: number; t: number; topView: boolean }> = ({ o, x, y, angle, flip, k, f, t, topView }) => {
  const sc = SCALE[o.id] * (o.size ?? 1) * k;
  const color = o.color ?? "#ffd88a";
  const fireT = o.fire === true ? 0 : typeof o.fire === "number" ? o.fire : null;
  const burning = fireT !== null && t >= fireT;
  const since = burning ? t - (fireT ?? 0) : 0;
  const fa = FIRE_AT[o.id] ?? [0, -40];
  const art = (OBJECT_ART[o.id] ?? OBJECT_ART.tanker)(f, color, o.variant, o.sign);
  const fx = flip ? -fa[0] : fa[0];
  return (
    <g transform={`translate(${x} ${y})`}>
      {topView ? (
        <g transform={`translate(18 34) rotate(${angle}) scale(${sc})`} opacity={0.38} style={{ filter: "blur(5px) brightness(0)" }}>
          {art}
        </g>
      ) : (
        <ellipse cx={0} cy={8 * sc} rx={125 * sc} ry={14 * sc} fill="#03060c" opacity={0.42} style={{ filter: "blur(6px)" }} />
      )}
      <g transform={`rotate(${angle}) scale(${flip ? -sc : sc} ${sc})`} style={{ filter: "drop-shadow(0 4px 6px rgba(3,6,12,0.8))" }}>
        {art}
        {burning ? (
          <g transform={flip ? "scale(-1 1)" : undefined}>
            {/* the aftermath: the fire on deck, the smoke drifting with the wind, the crew's lifeboats pulling away */}
            <Smoke x={fx} y={fa[1] - 24} f={f} k={1.2} drift={o.wind ?? [0.85, 0.05]} />
            <Flame x={fx} y={fa[1]} f={f} k={1.3 * clamp01(since / 10 + 0.3)} />
            {SHIP_IDS.has(o.id) && since > 30
              ? [-1, 1].map((s) => {
                  const u = clamp01((since - 30) / 150);
                  return (
                    <g key={s} transform={`translate(${s * (40 + u * 120)} ${18 + u * 26})`}>
                      <path d={`M${-s * 22} 3 L${-s * 10} 2`} stroke="#ffffff" strokeWidth={2} opacity={0.6} />
                      <path d="M-9 0 L9 0 L6 5 L-6 5 Z" fill="#f26a21" stroke={INK} strokeWidth={1} />
                      <rect x={-5} y={-4} width={10} height={4} rx={2} fill="#f26a21" stroke={INK} strokeWidth={0.8} />
                    </g>
                  );
                })
              : null}
          </g>
        ) : null}
      </g>
    </g>
  );
};

/** where along a screen polyline a share `p` of its length lands, and the direction there */
function along(pts: [number, number][], p: number): { x: number; y: number; dx: number; dy: number } {
  if (pts.length === 1) return { x: pts[0][0], y: pts[0][1], dx: 1, dy: 0 };
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    total += d;
  }
  let want = clamp01(p) * total;
  for (let i = 0; i < seg.length; i += 1) {
    if (want <= seg[i] || i === seg.length - 1) {
      const u = seg[i] ? Math.min(1, want / seg[i]) : 0;
      const a = pts[i];
      const b = pts[i + 1];
      return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, dx: b[0] - a[0], dy: b[1] - a[1] };
    }
    want -= seg[i];
  }
  const a = pts[pts.length - 1];
  return { x: a[0], y: a[1], dx: 1, dy: 0 };
}

/** the wake behind a ship (white, widening, fading) or the contrails behind an aircraft (two thin white lines) */
const Trail: React.FC<{ pts: [number, number][]; air: boolean; k: number }> = ({ pts, air, k }) => {
  if (pts.length < 2) return null;
  if (air) {
    const off = 16 * k;
    return (
      <g>
        {[-1, 1].map((s) => {
          const line = pts.map((p, i) => {
            const q = pts[Math.min(pts.length - 1, i + 1)];
            const r = pts[Math.max(0, i - 1)];
            const dx = q[0] - r[0];
            const dy = q[1] - r[1];
            const n = Math.hypot(dx, dy) || 1;
            return [p[0] - (dy / n) * off * s, p[1] + (dx / n) * off * s] as [number, number];
          });
          return line.slice(1).map((q, i) => <line key={`${s}${i}`} x1={line[i][0]} y1={line[i][1]} x2={q[0]} y2={q[1]} stroke="#ffffff" strokeWidth={2 + i * 0.15} strokeOpacity={((i + 1) / line.length) * 0.55} strokeLinecap="round" />);
        })}
      </g>
    );
  }
  return (
    <g>
      {pts.slice(1).map((q, i) => (
        <g key={i}>
          <line x1={pts[i][0]} y1={pts[i][1]} x2={q[0]} y2={q[1]} stroke="#ffffff" strokeWidth={(3 + i * 1.1) * k} strokeOpacity={((i + 1) / pts.length) * 0.35} strokeLinecap="round" />
          <line x1={pts[i][0]} y1={pts[i][1]} x2={q[0]} y2={q[1]} stroke="#ffffff" strokeWidth={(1 + i * 0.25) * k} strokeOpacity={((i + 1) / pts.length) * 0.7} strokeLinecap="round" strokeDasharray="3 5" />
        </g>
      ))}
    </g>
  );
};

/**
 * One object on the map at its own clock `t` (frames since it came in) with `life` frames before its beat ends: it
 * lands, then moves the way its spec says. A ship sails its path once over its beat; an approaching ship sails to its
 * incident's point and stops there when the incident lands; an aircraft flies its path with contrails; a missile arcs
 * over its path and bursts where it lands; a missile or a drone dives onto its point from the sky (no launch site).
 */
export const MapObject: React.FC<{ o: ObjectSpec; t: number; life: number; /** the span its beat looks at: wider than that, the object shrinks with the map (to 0.55), so an opening dive never shows a ship as big as a coast */ base?: number }> = ({ o, t, life, base }) => {
  const v = useView();
  const route = React.useMemo(() => (o.path && o.path.length >= 2 ? densify(o.path, 0.03) : null), [o.path]);
  if (t < 0) return null;
  const f = v.f;
  const move = o.move ?? "stand";
  const pts = route ? (route.map(([a, b]) => v.at(a, b)).filter(Boolean) as [number, number][]) : [];
  const at = v.at(o.lon, o.lat);
  const zoom = base ? Math.max(0.55, Math.min(1, base / v.look.span)) : 1;
  const k = pop(t / 10) * zoom;
  const air = o.id === "jet" || o.id === "drone";
  if ((move === "sail" || move === "fly" || move === "approach") && pts.length >= 2) {
    const approach = move === "approach";
    const span = approach ? Math.max(20, o.arrive ?? 60) : Math.max(60, life);
    // an approaching ship slows as it reaches its point, then lies there
    const p = approach ? 1 - (1 - clamp01(t / span)) ** 2 : 0.06 + 0.86 * clamp01(t / span);
    const h = along(pts, p);
    const top = move === "fly";
    const last = along(pts, Math.max(0, p - 0.02));
    const dx = h.x - last.x || h.dx;
    const dy = h.y - last.y || h.dy;
    const flip = !top && dx < 0;
    const ang = top ? (Math.atan2(dy, dx) * 180) / Math.PI : Math.max(-10, Math.min(10, (Math.atan2(flip ? -dy : dy, flip ? -dx : dx) * 180) / Math.PI));
    const moving = !approach || p < 0.995;
    const trail: [number, number][] = [];
    if (moving) for (let i = 16; i >= 0; i -= 1) {
      const q = along(pts, Math.max(0, p - i * 0.011));
      trail.push([q.x, q.y]);
    }
    const bob = top ? 0 : Math.sin(f / 9) * 2;
    return (
      <g opacity={out3(t / 8)}>
        <Trail pts={trail} air={top} k={zoom} />
        <Art o={o} x={h.x} y={h.y + bob} angle={ang + (top ? 0 : Math.sin(f / 13) * 1.2)} flip={flip} k={zoom} f={f} t={t} topView={top} />
      </g>
    );
  }
  if (move === "pipe" && pts.length >= 2) {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    const kk = out3(t / 30);
    const c = o.color && o.color !== "#ffd88a" ? o.color : FLAME;
    return (
      <g>
        <path d={d} fill="none" stroke={INK} strokeWidth={18} pathLength={1} strokeDasharray={`${kk} 1`} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={STEEL_D} strokeWidth={12} pathLength={1} strokeDasharray={`${kk} 1`} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={STEEL} strokeWidth={3.5} pathLength={1} strokeDasharray={`${kk} 1`} strokeLinecap="round" transform="translate(0 -3)" />
        {kk > 0.98 ? <path d={d} fill="none" stroke={c} strokeWidth={5} strokeDasharray="10 34" strokeDashoffset={-f * 3} strokeLinecap="round" opacity={0.95} /> : null}
        {/* the two ends: where the oil goes in and where it comes out */}
        {[pts[0], pts[pts.length - 1]].map((p, i) => (
          <g key={i} opacity={kk}>
            <circle cx={p[0]} cy={p[1]} r={14} fill={STEEL} stroke={INK} strokeWidth={3} />
            <circle cx={p[0]} cy={p[1]} r={6} fill={i ? c : INK} />
          </g>
        ))}
        {at ? <Art o={{ ...o, id: "pipeline" }} x={at[0]} y={at[1]} angle={0} flip={false} k={k} f={f} t={t} topView={false} /> : null}
      </g>
    );
  }
  if (move === "arc" && pts.length >= 2) {
    const A = pts[0];
    const B = pts[pts.length - 1];
    const dist = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const lift = Math.max(140, Math.min(460, dist * 0.45));
    const cycle = 75;
    const phase = t % cycle;
    const P = (u: number): [number, number] => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - lift * 4 * u * (1 - u)];
    const u = clamp01(phase / 45);
    const [x, y] = P(u);
    const [x2, y2] = P(Math.min(1, u + 0.01));
    const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
    const smoke = Array.from({ length: 18 }, (_, i) => P(Math.max(0, u - i * 0.028)));
    return (
      <g>
        <path d={`M${A[0]} ${A[1]} Q${(A[0] + B[0]) / 2} ${(A[1] + B[1]) / 2 - lift * 2} ${B[0]} ${B[1]}`} fill="none" stroke="#e9edf2" strokeWidth={3} strokeDasharray="4 14" opacity={0.35} />
        {u < 1 ? smoke.slice(1).map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={5 + i * 1.2} fill="#e9edf2" opacity={(1 - i / 18) * 0.45} />) : null}
        {u < 1 ? <Art o={o} x={x} y={y} angle={ang} flip={false} k={zoom} f={f} t={t} topView={false} /> : null}
        <Burst x={B[0]} y={B[1]} t={phase - 45} />
      </g>
    );
  }
  if (move === "drop" && at) {
    // from the sky above and to the right of its point: no launch site is drawn, none is claimed
    const S0: [number, number] = [at[0] + 260, at[1] - 640];
    const u = clamp01(t / 30) ** 1.6;
    const x = S0[0] + (at[0] - S0[0]) * u;
    const y = S0[1] + (at[1] - S0[1]) * u;
    const ang = (Math.atan2(at[1] - S0[1], at[0] - S0[0]) * 180) / Math.PI;
    return (
      <g>
        {u < 1
          ? Array.from({ length: 14 }, (_, i) => {
              const w = Math.max(0, u - i * 0.035);
              return <circle key={i} cx={S0[0] + (at[0] - S0[0]) * w} cy={S0[1] + (at[1] - S0[1]) * w} r={4 + i * 1.3} fill="#e9edf2" opacity={(1 - i / 14) * (air ? 0.25 : 0.45)} />;
            })
          : null}
        {u < 1 ? <Art o={o} x={x} y={y} angle={ang} flip={false} k={zoom} f={f} t={t} topView={air} /> : null}
        <Burst x={at[0]} y={at[1]} t={t - 30} />
      </g>
    );
  }
  if (move === "orbit" && at) {
    const R = 120 * zoom;
    const a = t / 36;
    const P = (b: number): [number, number] => [at[0] + Math.cos(b) * R, at[1] + Math.sin(b) * R * 0.62];
    const [x, y] = P(a);
    const ang = (Math.atan2(Math.cos(a) * R * 0.62, -Math.sin(a) * R) * 180) / Math.PI;
    const trail = Array.from({ length: 16 }, (_, i) => P(a - (15 - i) * 0.05));
    return (
      <g opacity={out3(t / 10)}>
        <Trail pts={trail} air k={zoom} />
        <Art o={o} x={x} y={y} angle={ang} flip={false} k={zoom} f={f} t={t} topView />
      </g>
    );
  }
  if (!at) return null;
  // stand: it lands on its point (a pop and a ring on the water or the ground) and keeps its own small motion
  const ship = o.id === "tanker" || o.id === "cargo" || o.id === "lng" || o.id === "warship" || o.id === "boats" || o.id === "mine" || o.id === "rig";
  const ring = (f % 50) / 50;
  return (
    <g>
      {ship ? <ellipse cx={at[0]} cy={at[1] + 6} rx={(70 + ring * 90) * zoom} ry={(70 + ring * 90) * 0.22 * zoom} fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={(1 - ring) * 0.4} /> : null}
      <Art o={o} x={at[0]} y={at[1] + (ship ? Math.sin(f / 9) * 2 : 0)} angle={ship ? Math.sin(f / 13) * 1.5 : 0} flip={false} k={k} f={f} t={t} topView={o.id === "jet" || o.id === "drone"} />
    </g>
  );
};
