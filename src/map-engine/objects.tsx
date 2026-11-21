// The objects that stand on the map (object-ids.ts): real things drawn by code, lit from the top left, outlined in
// the night map's ink so they read on the dark sea, each about 200 px wide whatever the zoom (they are markers, like
// the pins). Ships are seen from the side, as on the reference maps; aircraft and drones from above, turned to where
// they fly. Every object moves in its own way (sail, fly, orbit, arc, drop, pipe, stand) and keeps a small life of its
// own (a wake, a flame, steam, a flag), so a map with an object on it is never a still picture.
import React from "react";
import { useView } from "./MapStage";
import { densify } from "./layers";
import { VAZIR } from "./fonts";
import type { MapObjectId, ObjectMove } from "./object-ids";

const INK = "#0b121c";
const PAPER = "#f3efe6";
const STEEL = "#c9d2dd";
const STEEL_D = "#8d99a8";
const GLASS = "#2b3a52";
const BOOT = "#b8432f";
const FLAME = "#ffb020";
const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
const out3 = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const pop = (u: number) => {
  const x = clamp01(u);
  return x < 0.7 ? (x / 0.7) * 1.15 : 1.15 - ((x - 0.7) / 0.3) * 0.15;
};
const S = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: "round" as const };

/** a flame that flickers: three tongues, their heights moving on their own beats */
const Flame: React.FC<{ x: number; y: number; f: number; k?: number }> = ({ x, y, f, k = 1 }) => {
  const h = (i: number) => (18 + 9 * Math.sin(f / 2.3 + i * 2.1) + 6 * Math.sin(f / 1.4 + i)) * k;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={-6 * k} rx={22 * k} ry={16 * k} fill={FLAME} opacity={0.35} />
      {[-9, 0, 9].map((dx, i) => (
        <path key={i} d={`M${dx * k - 8 * k} 0 Q${dx * k} ${-h(i) * 1.5} ${dx * k + 8 * k} 0 Z`} fill={i === 1 ? "#ffe08a" : FLAME} stroke="#d2541f" strokeWidth={1.2} />
      ))}
    </g>
  );
};

/** smoke rising and leaning with the wind, from (x, y) */
const Smoke: React.FC<{ x: number; y: number; f: number; k?: number; dark?: boolean }> = ({ x, y, f, k = 1, dark = true }) => (
  <g>
    {Array.from({ length: 6 }, (_, i) => {
      const u = ((f + i * 10) % 60) / 60;
      return <circle key={i} cx={x - u * 70 * k} cy={y - u * 120 * k} r={(8 + u * 26) * k} fill={dark ? "#2a2f38" : "#e9edf2"} opacity={(1 - u) * (dark ? 0.7 : 0.85)} />;
    })}
  </g>
);

const hull = (c: string) => (
  <g>
    <path d="M-100 0 L96 0 L90 10 L-94 10 Z" fill={BOOT} {...S} />
    <path d="M-104 -22 L108 -22 L96 0 L-100 0 Z" fill="#5f6e84" {...S} />
    <path d="M-102 -22 L107 -22 L105 -17 L-101 -17 Z" fill={STEEL} />
    <path d="M-100 -4 L98 -4" stroke={c} strokeWidth={3} opacity={0.9} />
  </g>
);
const bridgeAft = (c: string, tall = 0) => (
  <g>
    <rect x={-98} y={-62 - tall} width={34} height={40 + tall} fill={PAPER} {...S} />
    <rect x={-103} y={-64 - tall} width={44} height={6} fill={PAPER} {...S} />
    <rect x={-95} y={-56 - tall} width={28} height={5} fill={GLASS} />
    <rect x={-95} y={-44 - tall} width={28} height={3} fill={GLASS} opacity={0.7} />
    <path d={`M-92 ${-64 - tall} L-91 ${-80 - tall} L-79 ${-80 - tall} L-78 ${-64 - tall} Z`} fill={c} {...S} />
    <rect x={-91.5} y={-84 - tall} width={13} height={5} fill={INK} />
  </g>
);

export const OBJECT_ART: Record<MapObjectId, (f: number, c: string, sign?: string) => React.ReactNode> = {
  tanker: (f, c) => (
    <g>
      {hull(BOOT)}
      <path d="M-60 -26 L98 -26" stroke={STEEL_D} strokeWidth={3} />
      <path d="M-60 -30 L98 -30" stroke={STEEL_D} strokeWidth={2} />
      {[-40, -10, 20, 50, 80].map((x) => (
        <path key={x} d={`M${x} -22 L${x} -32`} stroke={STEEL_D} strokeWidth={2} />
      ))}
      <rect x={6} y={-38} width={14} height={10} fill={STEEL} {...S} />
      <path d="M100 -22 L100 -44 M94 -36 L106 -36" stroke={INK} strokeWidth={2.5} />
      {bridgeAft(c === "#ffd88a" ? "#c8553d" : c)}
      <circle cx={100} cy={-46} r={2} fill={f % 30 < 15 ? "#ffefb0" : "#6b5a2a"} />
    </g>
  ),
  cargo: (_f, c) => {
    const box = ["#c0563f", "#3d7fb8", "#d9a440", "#5e8f5a", "#e2ddd0", "#8a5aa8"];
    return (
      <g>
        {hull(BOOT)}
        {Array.from({ length: 7 }, (_, i) =>
          Array.from({ length: [3, 3, 2, 3, 2, 3, 2][i] }, (_, j) => <rect key={`${i}-${j}`} x={-56 + i * 21} y={-33 - j * 11} width={20} height={11} fill={box[(i * 2 + j) % box.length]} {...S} strokeWidth={1.4} />),
        )}
        {bridgeAft(c === "#ffd88a" ? "#3d7fb8" : c, 14)}
      </g>
    );
  },
  lng: (_f, c) => (
    <g>
      {hull(BOOT)}
      {[-44, -6, 32, 70].map((x) => (
        <g key={x}>
          <path d={`M${x - 18} -22 A18 18 0 0 1 ${x + 18} -22 Z`} fill={PAPER} {...S} />
          <path d={`M${x - 10} -30 A10 8 0 0 1 ${x + 2} -36`} fill="none" stroke="#ffffff" strokeWidth={3} opacity={0.8} />
        </g>
      ))}
      <path d="M-60 -24 L96 -24" stroke={STEEL_D} strokeWidth={2} />
      {bridgeAft(c === "#ffd88a" ? "#3d7fb8" : c)}
    </g>
  ),
  warship: (f, c) => (
    <g>
      <path d="M-98 0 L96 0 L90 8 L-92 8 Z" fill="#46505e" {...S} />
      <path d="M-102 -16 L72 -16 L116 -24 L98 0 L-98 0 Z" fill="#8f9bab" {...S} />
      <path d="M-100 -16 L74 -16 L112 -23" fill="none" stroke={STEEL} strokeWidth={3} />
      <rect x={-56} y={-36} width={70} height={20} fill="#a7b2c0" {...S} />
      <rect x={-40} y={-54} width={40} height={18} fill="#a7b2c0" {...S} />
      <rect x={-36} y={-50} width={32} height={4} fill={GLASS} />
      <path d="M-22 -54 L-20 -96 M-30 -84 L-10 -84 M-27 -74 L-13 -74" stroke={INK} strokeWidth={3} />
      <rect x={-26 + Math.sin(f / 6) * 4} y={-92} width={12} height={5} fill={STEEL} stroke={INK} strokeWidth={1.4} />
      <rect x={20} y={-26} width={18} height={10} fill="#a7b2c0" {...S} />
      <rect x={46} y={-25} width={18} height={9} rx={3} fill="#a7b2c0" {...S} />
      <path d="M62 -21 L92 -25" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <rect x={-84} y={-24} width={22} height={8} fill="#a7b2c0" {...S} />
      <path d="M-98 -16 L-98 -40" stroke={INK} strokeWidth={2} />
      <path d={`M-98 -40 Q-88 ${-42 + Math.sin(f / 5) * 2} -78 -38 L-78 -30 Q-88 ${-34 + Math.sin(f / 5) * 2} -98 -32 Z`} fill={c === "#ffd88a" ? "#3d8fe0" : c} stroke={INK} strokeWidth={1.2} />
    </g>
  ),
  boats: (f) => (
    <g>
      {[
        [-64, 14],
        [0, -16],
        [64, 12],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y + Math.sin(f / 4 + i) * 2})`}>
          <path d="M-58 2 L-30 -2 M-58 6 L-30 4" stroke="#ffffff" strokeWidth={3} opacity={0.6} />
          <path d="M-28 0 L18 0 L32 -10 L-28 -10 Z" fill="#8f9bab" {...S} />
          <rect x={-14} y={-20} width={18} height={10} fill={PAPER} {...S} />
          <rect x={-11} y={-18} width={12} height={4} fill={GLASS} />
          <path d="M-24 -10 L-24 -24" stroke={INK} strokeWidth={2} />
        </g>
      ))}
    </g>
  ),
  mine: (f, c) => (
    <g transform={`translate(0 ${Math.sin(f / 9) * 3})`}>
      <path d="M0 22 L0 60" stroke={STEEL_D} strokeWidth={4} strokeDasharray="7 5" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI + (i * Math.PI) / 6;
        return (
          <g key={i}>
            <path d={`M${Math.cos(a) * 28} ${-6 + Math.sin(a) * 28} L${Math.cos(a) * 46} ${-6 + Math.sin(a) * 46}`} stroke={INK} strokeWidth={13} strokeLinecap="round" />
            <path d={`M${Math.cos(a) * 28} ${-6 + Math.sin(a) * 28} L${Math.cos(a) * 46} ${-6 + Math.sin(a) * 46}`} stroke={STEEL_D} strokeWidth={8} strokeLinecap="round" />
          </g>
        );
      })}
      <circle cx={0} cy={-6} r={32} fill="#6a778a" {...S} />
      <path d="M-32 -6 A32 32 0 0 0 32 -6" fill="none" stroke={c === "#ffd88a" ? BOOT : c} strokeWidth={5} />
      <circle cx={-11} cy={-18} r={9} fill={STEEL} opacity={0.75} />
      <path d="M-46 8 Q-23 2 0 8 T46 8 L46 30 L-46 30 Z" fill="#182a45" opacity={0.78} />
      <path d={`M-50 8 Q-25 ${2 + Math.sin(f / 5) * 2} 0 8 T50 8`} fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={0.6} />
    </g>
  ),
  missile: (f, c) => (
    <g>
      <ellipse cx={-80} cy={0} rx={26 + Math.sin(f / 1.5) * 5} ry={10} fill={FLAME} opacity={0.45} />
      <path d={`M-56 -5 Q${-92 - Math.sin(f / 1.3) * 10} 0 -56 5 Z`} fill={FLAME} stroke="#d2541f" strokeWidth={1.2} />
      <path d={`M-56 -3 Q${-76 - Math.sin(f / 1.1) * 6} 0 -56 3 Z`} fill="#ffe08a" />
      <path d="M-56 -8 L-74 -24 L-44 -8 Z M-56 8 L-74 24 L-44 8 Z" fill={STEEL_D} {...S} />
      <rect x={-56} y={-8} width={88} height={16} rx={3} fill={PAPER} {...S} />
      <rect x={-20} y={-8} width={8} height={16} fill={c === "#ffd88a" ? BOOT : c} />
      <path d="M-4 -8 L6 -16 L10 -8 Z M-4 8 L6 16 L10 8 Z" fill={STEEL_D} {...S} strokeWidth={1.4} />
      <path d="M32 -8 Q66 -8 80 0 Q66 8 32 8 Z" fill={c === "#ffd88a" ? BOOT : c} {...S} />
    </g>
  ),
  drone: (f) => (
    <g>
      <path d="M62 0 L-30 -64 L-46 -60 L-30 0 L-46 60 L-30 64 Z" fill="#c3cad3" {...S} />
      <path d="M-30 -64 L-44 -72 L-46 -60 Z M-30 64 L-44 72 L-46 60 Z" fill={STEEL_D} {...S} />
      <ellipse cx={6} cy={0} rx={52} ry={9} fill="#dde3ea" {...S} />
      <path d="M-20 -30 L30 -6 M-20 30 L30 6" stroke={STEEL_D} strokeWidth={2} />
      <ellipse cx={-50} cy={0} rx={4} ry={22} fill="#8d99a8" opacity={0.55} transform={`rotate(${(f * 47) % 360} -50 0)`} />
      <circle cx={-48} cy={0} r={4} fill={INK} />
    </g>
  ),
  jet: () => (
    <g>
      <path d="M30 -6 L-26 -70 L-44 -70 L-34 -8 Z M30 6 L-26 70 L-44 70 L-34 8 Z" fill="#aeb8c4" {...S} />
      <path d="M-50 -8 L-74 -36 L-84 -36 L-72 -8 Z M-50 8 L-74 36 L-84 36 L-72 8 Z" fill="#9ba6b4" {...S} />
      <path d="M90 0 L62 -7 L-62 -9 L-80 -5 L-80 5 L-62 9 L62 7 Z" fill="#c3cad3" {...S} />
      <path d="M-56 -5 L-76 -14 M-56 5 L-76 14" stroke={INK} strokeWidth={3} />
      <ellipse cx={50} cy={0} rx={14} ry={4.5} fill={GLASS} stroke={INK} strokeWidth={1.4} />
      <ellipse cx={-84} cy={0} rx={6} ry={7} fill={FLAME} opacity={0.8} />
    </g>
  ),
  rig: (f) => (
    <g>
      {[-52, -20, 20, 52].map((x) => (
        <path key={x} d={`M${x * 1.1} 12 L${x * 0.85} -50`} stroke="#c9b26b" strokeWidth={6} />
      ))}
      <path d="M-55 -10 L52 -40 M55 -10 L-52 -40 M-45 -30 L44 -30" stroke="#a8914f" strokeWidth={3} />
      <rect x={-66} y={-66} width={132} height={16} fill="#d4bd74" {...S} />
      <rect x={-60} y={-86} width={40} height={20} fill={PAPER} {...S} />
      <rect x={14} y={-80} width={36} height={14} fill="#b8432f" {...S} />
      <ellipse cx={-42} cy={-90} rx={22} ry={5} fill="#4f7d5c" {...S} strokeWidth={1.4} />
      <path d="M-12 -66 L0 -150 L12 -66 M-9 -90 L9 -90 M-6 -114 L6 -114 M-10 -78 L8 -102 M10 -78 L-8 -102" fill="none" stroke={INK} strokeWidth={3} />
      <path d="M40 -66 L84 -112" stroke={INK} strokeWidth={4} />
      <path d="M84 -112 L84 -96" stroke={INK} strokeWidth={1.5} />
      <path d="M60 -56 L116 -96" stroke={STEEL_D} strokeWidth={4} />
      <Flame x={118} y={-98} f={f} k={0.8} />
      <path d={`M-90 10 Q-60 ${4 + Math.sin(f / 6) * 2} -30 10 T30 10 T90 10`} fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={0.55} />
    </g>
  ),
  refinery: (f) => (
    <g>
      <rect x={-110} y={-4} width={220} height={8} fill="#3a4658" {...S} />
      {[-88, -52].map((x) => (
        <g key={x}>
          <rect x={x - 16} y={-44} width={32} height={40} fill={STEEL} {...S} />
          <ellipse cx={x} cy={-44} rx={16} ry={5} fill={PAPER} {...S} strokeWidth={1.4} />
        </g>
      ))}
      <rect x={-14} y={-128} width={18} height={124} fill="#b9c2cd" {...S} />
      {[-110, -88, -66, -44, -22].map((y) => (
        <path key={y} d={`M-16 ${y} L6 ${y}`} stroke={INK} strokeWidth={2} />
      ))}
      <rect x={14} y={-96} width={12} height={92} fill="#b9c2cd" {...S} />
      <path d="M-34 -30 L-14 -30 M4 -50 L14 -50 M26 -24 L60 -24 L60 -4" stroke={STEEL_D} strokeWidth={4} fill="none" />
      <rect x={40} y={-40} width={30} height={36} fill={PAPER} {...S} />
      <path d="M86 -4 L86 -150" stroke={INK} strokeWidth={5} />
      <Flame x={86} y={-152} f={f} k={0.8} />
      <Smoke x={86} y={-170} f={f} k={0.5} dark={false} />
    </g>
  ),
  pipeline: (f, c) => (
    <g>
      {[-70, 0, 70].map((x) => (
        <path key={x} d={`M${x - 10} 0 L${x} -26 L${x + 10} 0`} fill="none" stroke={INK} strokeWidth={4} />
      ))}
      <rect x={-104} y={-44} width={208} height={18} rx={9} fill={STEEL_D} {...S} />
      <rect x={-102} y={-41} width={204} height={5} rx={2} fill={STEEL} />
      {[-62, 0, 62].map((x) => (
        <rect key={x} x={x - 5} y={-48} width={10} height={26} rx={2} fill="#a7b2c0" {...S} strokeWidth={1.6} />
      ))}
      <path d="M0 -48 L0 -64" stroke={INK} strokeWidth={4} />
      <g transform={`rotate(${f * 2} 0 -70)`}>
        <circle cx={0} cy={-70} r={14} fill="none" stroke={c === "#ffd88a" ? BOOT : c} strokeWidth={4} />
        <path d="M-14 -70 L14 -70 M0 -84 L0 -56" stroke={c === "#ffd88a" ? BOOT : c} strokeWidth={3} />
      </g>
    </g>
  ),
  barrel: (f, c) => (
    <g>
      <rect x={-36} y={-100} width={72} height={100} rx={6} fill={c === "#ffd88a" ? "#2f5d8a" : c} {...S} />
      <rect x={14} y={-100} width={22} height={100} fill="#000" opacity={0.22} />
      <rect x={-34} y={-98} width={10} height={96} fill="#ffffff" opacity={0.18} />
      {[-34, -66].map((y) => (
        <path key={y} d={`M-36 ${y} L36 ${y}`} stroke={INK} strokeWidth={4} />
      ))}
      <ellipse cx={0} cy={-100} rx={36} ry={9} fill="#7a9cc0" {...S} />
      <circle cx={16} cy={-101} r={4} fill={INK} />
      <path d={`M0 ${-60 + Math.sin(f / 10) * 1.5} Q-12 -44 -12 -38 A12 12 0 0 0 12 -38 Q12 -44 0 ${-60 + Math.sin(f / 10) * 1.5} Z`} fill={INK} stroke={PAPER} strokeWidth={2} />
    </g>
  ),
  nuclear: (f, c) => (
    <g>
      <rect x={-120} y={-4} width={240} height={8} fill="#3a4658" {...S} />
      <path d="M-112 -4 L-98 -44 Q-106 -92 -94 -122 L-46 -122 Q-34 -92 -42 -44 L-28 -4 Z" fill={STEEL} {...S} />
      <path d="M-100 -44 Q-70 -38 -40 -44" fill="none" stroke={STEEL_D} strokeWidth={3} />
      <Smoke x={-70} y={-126} f={f} k={0.7} dark={false} />
      <rect x={-12} y={-54} width={84} height={50} fill={PAPER} {...S} />
      <path d="M-8 -54 A42 42 0 0 1 68 -54 Z" fill={PAPER} {...S} />
      <path d="M8 -74 A26 20 0 0 1 40 -86" fill="none" stroke="#ffffff" strokeWidth={4} />
      <rect x={72} y={-36} width={40} height={32} fill="#b9c2cd" {...S} />
      <rect x={-12} y={-24} width={84} height={6} fill={c === "#ffd88a" ? FLAME : c} />
      {[0, 22, 44].map((x) => (
        <rect key={x} x={x} y={-44} width={10} height={12} fill={GLASS} />
      ))}
    </g>
  ),
  tank: () => (
    <g>
      <rect x={-84} y={-26} width={160} height={26} rx={13} fill="#353b2c" {...S} />
      {[-66, -42, -18, 6, 30, 54].map((x) => (
        <circle key={x} cx={x} cy={-13} r={9} fill="#6b7356" stroke={INK} strokeWidth={1.6} />
      ))}
      <path d="M-90 -26 L82 -26 L94 -40 L-82 -44 Z" fill="#9c9468" {...S} />
      <path d="M-44 -44 L34 -44 L44 -60 L-34 -68 Z" fill="#a9a174" {...S} />
      <rect x={42} y={-60} width={86} height={7} rx={2} fill="#8c845c" {...S} strokeWidth={1.6} />
      <rect x={-22} y={-76} width={18} height={9} rx={2} fill="#8c845c" {...S} strokeWidth={1.6} />
      <path d="M-40 -66 L-40 -92" stroke={INK} strokeWidth={2} />
    </g>
  ),
  troops: (f) => (
    <g>
      {[
        [-56, 6, 0.92],
        [0, 0, 1],
        [56, 8, 0.9],
      ].map(([x, y, k], i) => {
        const step = Math.sin(f / 5 + i * 2) * 4;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
            <path d={`M-8 -40 L-12 ${-2 + step * 0.2} M8 -40 L12 ${-2 - step * 0.2}`} stroke="#5d6447" strokeWidth={9} strokeLinecap="round" />
            <path d="M-14 -88 L14 -88 L12 -40 L-12 -40 Z" fill="#7d8460" {...S} />
            <circle cx={0} cy={-98} r={10} fill="#d6b48c" {...S} strokeWidth={1.6} />
            <path d="M-14 -100 A14 12 0 0 1 14 -100 L16 -98 L-16 -98 Z" fill="#5d6447" {...S} strokeWidth={1.6} />
            <path d="M-20 -70 L26 -92" stroke={INK} strokeWidth={5} strokeLinecap="round" />
            <path d="M-10 -80 L10 -66" stroke="#7d8460" strokeWidth={7} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  ),
  parliament: (f, c) => (
    <g>
      <rect x={-100} y={-8} width={200} height={8} fill={STEEL} {...S} />
      <rect x={-92} y={-16} width={184} height={8} fill={STEEL} {...S} />
      <rect x={-86} y={-26} width={172} height={10} fill={PAPER} {...S} />
      {[-70, -42, -14, 14, 42, 70].map((x) => (
        <rect key={x} x={x - 6} y={-86} width={12} height={60} fill={PAPER} {...S} strokeWidth={1.6} />
      ))}
      <rect x={-86} y={-96} width={172} height={10} fill={PAPER} {...S} />
      <path d="M-92 -96 L92 -96 L0 -124 Z" fill={PAPER} {...S} />
      <rect x={-26} y={-138} width={52} height={14} fill={STEEL} {...S} />
      <path d="M-30 -138 A30 30 0 0 1 30 -138 Z" fill={STEEL} {...S} />
      <path d="M-12 -150 A16 12 0 0 1 8 -162" fill="none" stroke="#ffffff" strokeWidth={3} />
      <path d="M0 -168 L0 -206" stroke={INK} strokeWidth={2.5} />
      <path d={`M0 -206 Q12 ${-210 + Math.sin(f / 5) * 4} 24 -206 T48 -206 L48 -186 Q36 ${-190 + Math.sin(f / 5 + 1) * 4} 24 -186 T0 -186 Z`} fill={c === "#ffd88a" ? FLAME : c} stroke={INK} strokeWidth={1.4} />
    </g>
  ),
  money: (f, _c, sign) => (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={-92 + (i % 2) * 4} y={-24 - i * 9} width={140} height={24} rx={3} fill={i % 2 ? "#7fae7a" : "#8dbb86"} {...S} strokeWidth={1.6} />
      ))}
      <rect x={-90} y={-98} width={140} height={56} rx={4} fill="#a5cf9c" {...S} />
      <rect x={-84} y={-92} width={128} height={44} rx={3} fill="none" stroke="#4d7a4a" strokeWidth={2} />
      <ellipse cx={-20} cy={-70} rx={16} ry={18} fill="#cfe5c6" stroke="#4d7a4a" strokeWidth={2} />
      {sign ? (
        <text x={-20} y={-60} textAnchor="middle" fontFamily={VAZIR} fontWeight={800} fontSize={30} fill="#2f5a2c">
          {sign}
        </text>
      ) : (
        <circle cx={-20} cy={-72} r={6} fill="#4d7a4a" />
      )}
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`translate(${82} ${-6 - i * 10 + (i === 4 ? Math.sin(f / 8) * 2 : 0)})`}>
          <ellipse cx={0} cy={0} rx={24} ry={7} fill="#c8912f" {...S} strokeWidth={1.6} />
          <ellipse cx={0} cy={-3} rx={24} ry={7} fill="#e6b450" {...S} strokeWidth={1.6} />
        </g>
      ))}
    </g>
  ),
  treaty: (f, c) => (
    <g transform="rotate(-6)">
      <rect x={-66} y={-176} width={132} height={176} rx={4} fill={PAPER} {...S} />
      {[-150, -132, -114, -96, -78].map((y, i) => (
        <path key={y} d={`M-48 ${y} L${i === 4 ? 10 : 48} ${y}`} stroke="#9aa3ad" strokeWidth={4} strokeLinecap="round" />
      ))}
      <path d="M-46 -40 q10 -16 20 0 t20 -4 t18 2" fill="none" stroke={GLASS} strokeWidth={3} />
      <circle cx={38} cy={-30} r={18} fill={c === "#ffd88a" ? BOOT : c} {...S} />
      <circle cx={38} cy={-30} r={10} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.6} />
      <g transform={`rotate(${-35 + Math.sin(f / 12) * 2} 0 -60)`}>
        <rect x={-10} y={-150} width={14} height={100} rx={6} fill={INK} />
        <path d="M-10 -50 L4 -50 L-3 -30 Z" fill="#d9a440" />
      </g>
    </g>
  ),
  padlock: () => (
    <g>
      <path d="M-34 -82 L-34 -112 A34 34 0 0 1 34 -112 L34 -82" fill="none" stroke={INK} strokeWidth={20} />
      <path d="M-34 -82 L-34 -112 A34 34 0 0 1 34 -112 L34 -82" fill="none" stroke={STEEL} strokeWidth={13} />
      <rect x={-56} y={-88} width={112} height={88} rx={12} fill="#d9a440" {...S} />
      <rect x={20} y={-88} width={36} height={88} rx={10} fill="#000" opacity={0.18} />
      <circle cx={0} cy={-52} r={10} fill={INK} />
      <path d="M-6 -50 L6 -50 L4 -24 L-4 -24 Z" fill={INK} />
    </g>
  ),
};

const SCALE: Record<MapObjectId, number> = { tanker: 1.05, cargo: 1.05, lng: 1.05, warship: 1, boats: 0.9, mine: 1.05, missile: 0.85, drone: 0.95, jet: 1, rig: 0.95, refinery: 0.95, pipeline: 0.85, barrel: 0.95, nuclear: 0.95, tank: 0.95, troops: 0.95, parliament: 0.9, money: 0.9, treaty: 0.8, padlock: 0.85 };
/** where a fire sits on each object, in its own units */
const FIRE_AT: Partial<Record<MapObjectId, [number, number]>> = { tanker: [20, -30], cargo: [10, -50], lng: [-6, -40], warship: [-10, -40], rig: [-30, -90], refinery: [-52, -48], pipeline: [0, -44], barrel: [0, -104] };

/** A burst where a missile lands: a flash, a shock ring and sparks, `t` frames after the hit. */
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

export type ObjectSpec = { id: MapObjectId; lon: number; lat: number; color?: string; move?: ObjectMove; path?: [number, number][]; /** frames after it lands when it catches fire (true: from the start) */ fire?: number | boolean; size?: number; sign?: string };

/** The object at a screen point, turned and flipped, with its shadow; `body` true draws it, false only its shadow. */
const Art: React.FC<{ o: ObjectSpec; x: number; y: number; angle: number; flip: boolean; k: number; f: number; t: number; topView: boolean }> = ({ o, x, y, angle, flip, k, f, t, topView }) => {
  const sc = SCALE[o.id] * (o.size ?? 1) * k;
  const color = o.color ?? "#ffd88a";
  const fireT = o.fire === true ? 0 : typeof o.fire === "number" ? o.fire : null;
  const burning = fireT !== null && t >= fireT;
  const fa = FIRE_AT[o.id] ?? [0, -40];
  const art = (OBJECT_ART[o.id] ?? OBJECT_ART.tanker)(f, color, o.sign);
  return (
    <g transform={`translate(${x} ${y})`}>
      {topView ? (
        <g transform={`translate(16 30) rotate(${angle}) scale(${sc})`} opacity={0.4} style={{ filter: "blur(5px)" }}>
          <g style={{ filter: "brightness(0)" }}>{art}</g>
        </g>
      ) : (
        <ellipse cx={0} cy={10 * sc} rx={110 * sc} ry={16 * sc} fill="#03060c" opacity={0.45} style={{ filter: "blur(6px)" }} />
      )}
      <g transform={`rotate(${angle}) scale(${flip ? -sc : sc} ${sc})`} style={{ filter: "drop-shadow(0 4px 6px rgba(3,6,12,0.8))" }}>
        {art}
        {burning ? (
          <g transform={flip ? "scale(-1 1)" : undefined}>
            <Smoke x={flip ? -fa[0] : fa[0]} y={fa[1] - 20} f={f} k={1.1} />
            <Flame x={flip ? -fa[0] : fa[0]} y={fa[1]} f={f} k={1.2 * clamp01((t - (fireT ?? 0)) / 10 + 0.3)} />
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

/**
 * One object on the map at its own clock `t` (frames since it came in) with `life` frames before its beat ends: it
 * lands, then moves the way its spec says. A ship sails its path once over its beat; an aircraft flies it; a missile
 * arcs over it and bursts where it lands, again every 2.5 s while its beat lasts.
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
  if ((move === "sail" || move === "fly") && pts.length >= 2) {
    const span = Math.max(60, life);
    const p = 0.06 + 0.86 * clamp01(t / span);
    const h = along(pts, p);
    const top = move === "fly";
    const flip = !top && h.dx < 0;
    const ang = top ? (Math.atan2(h.dy, h.dx) * 180) / Math.PI : Math.max(-10, Math.min(10, (Math.atan2(flip ? -h.dy : h.dy, flip ? -h.dx : h.dx) * 180) / Math.PI));
    // the wake: the way it came, white and fading, widest at the stern
    const trail: [number, number][] = [];
    for (let i = 14; i >= 0; i -= 1) {
      const q = along(pts, Math.max(0, p - i * 0.012));
      trail.push([q.x, q.y]);
    }
    const bob = top ? 0 : Math.sin(f / 9) * 2;
    return (
      <g opacity={out3(t / 8)}>
        {trail.slice(1).map((q, i) => (
          <line key={i} x1={trail[i][0]} y1={trail[i][1]} x2={q[0]} y2={q[1]} stroke={top ? "#e9edf2" : "#ffffff"} strokeWidth={top ? 3 + i * 0.3 : 4 + i * 0.9} strokeOpacity={((i + 1) / trail.length) * (top ? 0.35 : 0.5)} strokeLinecap="round" />
        ))}
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
        <path d={d} fill="none" stroke={INK} strokeWidth={20} pathLength={1} strokeDasharray={`${kk} 1`} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={STEEL_D} strokeWidth={14} pathLength={1} strokeDasharray={`${kk} 1`} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={STEEL} strokeWidth={4} pathLength={1} strokeDasharray={`${kk} 1`} strokeLinecap="round" transform="translate(0 -3)" />
        {kk > 0.98 ? <path d={d} fill="none" stroke={c} strokeWidth={5} strokeDasharray="10 34" strokeDashoffset={-f * 3} strokeLinecap="round" opacity={0.95} /> : null}
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
    const smoke = Array.from({ length: 16 }, (_, i) => P(Math.max(0, u - i * 0.03)));
    return (
      <g>
        <path d={`M${A[0]} ${A[1]} Q${(A[0] + B[0]) / 2} ${(A[1] + B[1]) / 2 - lift * 2} ${B[0]} ${B[1]}`} fill="none" stroke="#e9edf2" strokeWidth={3} strokeDasharray="4 14" opacity={0.35} />
        {u < 1
          ? smoke.slice(1).map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={5 + i * 1.2} fill="#e9edf2" opacity={(1 - i / 16) * 0.45} />)
          : null}
        {u < 1 ? <Art o={o} x={x} y={y} angle={ang} flip={false} k={zoom} f={f} t={t} topView={false} /> : null}
        <Burst x={B[0]} y={B[1]} t={phase - 45} />
      </g>
    );
  }
  if (move === "drop" && at) {
    // from the sky above and to the right of its point: no launch site is drawn, none is claimed
    const S0: [number, number] = [at[0] + 240, at[1] - 620];
    const u = clamp01(t / 30) ** 1.6;
    const x = S0[0] + (at[0] - S0[0]) * u;
    const y = S0[1] + (at[1] - S0[1]) * u;
    const ang = (Math.atan2(at[1] - S0[1], at[0] - S0[0]) * 180) / Math.PI;
    return (
      <g>
        {u < 1 ? Array.from({ length: 12 }, (_, i) => {
          const w = Math.max(0, u - i * 0.04);
          return <circle key={i} cx={S0[0] + (at[0] - S0[0]) * w} cy={S0[1] + (at[1] - S0[1]) * w} r={5 + i * 1.4} fill="#e9edf2" opacity={(1 - i / 12) * 0.45} />;
        }) : null}
        {u < 1 ? <Art o={o} x={x} y={y} angle={ang} flip={false} k={zoom} f={f} t={t} topView={false} /> : null}
        <Burst x={at[0]} y={at[1]} t={t - 30} />
      </g>
    );
  }
  if (move === "orbit" && at) {
    const R = 120;
    const a = t / 36;
    const x = at[0] + Math.cos(a) * R;
    const y = at[1] + Math.sin(a) * R * 0.62;
    const ang = (Math.atan2(Math.cos(a) * R * 0.62, -Math.sin(a) * R) * 180) / Math.PI;
    return (
      <g opacity={out3(t / 10)}>
        <ellipse cx={at[0]} cy={at[1]} rx={R} ry={R * 0.62} fill="none" stroke="#e9edf2" strokeWidth={2.5} strokeDasharray="6 14" opacity={0.35} />
        <Art o={o} x={x} y={y} angle={ang} flip={false} k={zoom} f={f} t={t} topView />
      </g>
    );
  }
  if (!at) return null;
  // stand: it lands on its point (a pop and a ring on the water or the ground) and keeps its own small motion
  const ship = o.id === "tanker" || o.id === "cargo" || o.id === "lng" || o.id === "warship" || o.id === "boats" || o.id === "mine" || o.id === "rig";
  const ring = ((f % 50) / 50);
  return (
    <g>
      {ship ? <ellipse cx={at[0]} cy={at[1] + 6} rx={70 + ring * 90} ry={(70 + ring * 90) * 0.22} fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={(1 - ring) * 0.4} /> : null}
      <Art o={o} x={at[0]} y={at[1] + (ship ? Math.sin(f / 9) * 2 : 0)} angle={ship ? Math.sin(f / 13) * 1.5 : 0} flip={false} k={k} f={f} t={t} topView={o.id === "jet" || o.id === "drone"} />
    </g>
  );
};
