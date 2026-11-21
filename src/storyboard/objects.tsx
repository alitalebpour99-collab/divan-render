// The roads' objects (bible §1, «هر راه یک شیء ایزومتریک تخت در رنگ همان راه»): flat isometric things drawn by code
// in the road's own colour, lit from the top left. Each one means its road: a barrel is oil sold, a tanker is a ship
// at sea, a banknote is money, a treaty a signed text. Never an abstract shape as the main object.
import React from "react";
import type { ObjectId } from "./types";

const hex = (c: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const n = m ? parseInt(m[1], 16) : 0x888888;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** The colour lighter (k > 0) or darker (k < 0). */
export const shade = (c: string, k: number) => {
  const [r, g, b] = hex(c);
  const f = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
// the isometric axes: x to the lower right, y to the lower left, z up
const I = (x: number, y: number, z: number): [number, number] => [(x - y) * 0.866, (x + y) * 0.5 - z];
const poly = (pts: [number, number][]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}Z`;
/** An isometric box of size (a, b, h) at (x, y, z): its three seen faces. */
const Box: React.FC<{ x?: number; y?: number; z?: number; a: number; b: number; h: number; c: string; edge?: string }> = ({ x = 0, y = 0, z = 0, a, b, h, c, edge }) => (
  <g stroke={edge ?? shade(c, -0.55)} strokeWidth={2} strokeLinejoin="round">
    <path d={poly([I(x, y + b, z), I(x + a, y + b, z), I(x + a, y + b, z + h), I(x, y + b, z + h)])} fill={shade(c, -0.18)} />
    <path d={poly([I(x + a, y, z), I(x + a, y + b, z), I(x + a, y + b, z + h), I(x + a, y, z + h)])} fill={shade(c, -0.38)} />
    <path d={poly([I(x, y, z + h), I(x + a, y, z + h), I(x + a, y + b, z + h), I(x, y + b, z + h)])} fill={shade(c, 0.25)} />
  </g>
);
/** An upright cylinder of radius r and height h, standing at the origin. */
const Can: React.FC<{ r: number; h: number; c: string; ribs?: number[] }> = ({ r, h, c, ribs = [] }) => {
  const ry = r * 0.5;
  return (
    <g stroke={shade(c, -0.55)} strokeWidth={2}>
      <path d={`M${-r} 0 A${r} ${ry} 0 0 0 ${r} 0 V${-h} A${r} ${ry} 0 0 1 ${-r} ${-h} Z`} fill={shade(c, -0.22)} />
      <path d={`M${r * 0.15} ${ry * 0.98} A${r} ${ry} 0 0 0 ${r} 0 V${-h} A${r} ${ry} 0 0 1 ${r * 0.15} ${-h + ry * 0.98} Z`} fill={shade(c, -0.42)} stroke="none" />
      {ribs.map((k) => (
        <path key={k} d={`M${-r} ${-h * k} A${r} ${ry} 0 0 0 ${r} ${-h * k}`} fill="none" strokeWidth={5} stroke={shade(c, -0.5)} />
      ))}
      <ellipse cx={0} cy={-h} rx={r} ry={ry} fill={shade(c, 0.28)} />
      <ellipse cx={r * 0.35} cy={-h} rx={r * 0.12} ry={ry * 0.14} fill={shade(c, -0.4)} />
    </g>
  );
};

const draw: Record<ObjectId, (c: string, f: number) => React.ReactNode> = {
  barrel: (c) => <Can r={110} h={250} c={c} ribs={[0.28, 0.72]} />,
  tanker: (c, f) => (
    <g transform={`translate(0 ${Math.sin(f / 14) * 4})`}>
      <Box x={-160} y={-40} a={320} b={80} h={46} c={c} />
      <Box x={-150} y={-30} a={60} b={60} h={110} c={shade(c, 0.35)} edge={shade(c, -0.5)} />
      {[-60, 0, 60].map((x) => (
        <Box key={x} x={x} y={-12} a={34} b={24} h={60} c={shade(c, 0.12)} />
      ))}
    </g>
  ),
  banknote: (c) => (
    <g>
      {[0, 22, 44, 66].map((z) => (
        <g key={z}>
          <Box x={-150} y={-70} z={z} a={300} b={140} h={16} c={z === 66 ? shade(c, 0.15) : c} />
        </g>
      ))}
      <ellipse cx={I(0, 0, 82)[0]} cy={I(0, 0, 82)[1]} rx={56} ry={28} fill="none" stroke={shade(c, -0.5)} strokeWidth={6} />
    </g>
  ),
  treaty: (c) => (
    <g>
      <Box x={-130} y={-170} a={260} b={340} h={10} c={shade(c, 0.55)} />
      {[-110, -60, -10, 40].map((y) => (
        <path key={y} d={poly([I(-100, y, 12), I(90, y, 12), I(90, y + 10, 12), I(-100, y + 10, 12)])} fill={shade(c, -0.25)} />
      ))}
      <g transform={`translate(${I(60, 110, 14)[0]} ${I(60, 110, 14)[1]})`}>
        <ellipse rx={44} ry={24} fill={shade(c, -0.25)} />
        <ellipse rx={28} ry={15} fill={shade(c, 0.1)} />
      </g>
    </g>
  ),
  table: (c) => (
    <g>
      {[
        [-150, -100],
        [130, -100],
        [-150, 80],
        [130, 80],
      ].map(([x, y]) => (
        <Box key={`${x}${y}`} x={x} y={y} a={20} b={20} h={120} c={shade(c, -0.3)} />
      ))}
      <Box x={-170} y={-120} z={120} a={340} b={240} h={22} c={c} />
    </g>
  ),
  shield: (c) => (
    <g transform="translate(0 -120)">
      <path d="M0 -150 L130 -100 C130 40 70 120 0 160 C-70 120 -130 40 -130 -100 Z" fill={shade(c, -0.2)} stroke={shade(c, -0.55)} strokeWidth={4} />
      <path d="M0 -150 L130 -100 C130 40 70 120 0 160 Z" fill={shade(c, -0.4)} />
      <path d="M0 -100 L70 -72 C70 10 38 64 0 92 C-38 64 -70 10 -70 -72 Z" fill={shade(c, 0.3)} />
    </g>
  ),
  mine: (c, f) => (
    <g transform={`translate(0 ${-150 + Math.sin(f / 16) * 6})`}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <path key={i} d={`M${Math.cos(a) * 90} ${Math.sin(a) * 90} L${Math.cos(a) * 140} ${Math.sin(a) * 140}`} stroke={shade(c, -0.45)} strokeWidth={16} strokeLinecap="round" />;
      })}
      <circle r={100} fill={shade(c, -0.2)} stroke={shade(c, -0.55)} strokeWidth={4} />
      <circle cx={-30} cy={-34} r={42} fill={shade(c, 0.3)} />
      <path d="M0 100 L0 190" stroke={shade(c, -0.5)} strokeWidth={6} strokeDasharray="12 8" />
    </g>
  ),
  pipeline: (c) => (
    <g>
      {[-140, 0, 140].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i * 30 - 30})`}>
          <g transform="rotate(-60)">
            <Can r={44} h={150} c={c} ribs={[0.5]} />
          </g>
        </g>
      ))}
      <Box x={-30} y={-30} a={60} b={60} h={60} c={shade(c, -0.15)} />
    </g>
  ),
  container: (c) => (
    <g>
      <Box x={-150} y={-60} a={300} b={120} h={130} c={c} />
      {[-110, -60, -10, 40, 90].map((x) => (
        <path key={x} d={`M${I(x, 60, 10)[0]} ${I(x, 60, 10)[1]} L${I(x, 60, 120)[0]} ${I(x, 60, 120)[1]}`} stroke={shade(c, -0.5)} strokeWidth={4} />
      ))}
    </g>
  ),
  megaphone: (c) => (
    <g transform="translate(0 -130) rotate(-12)">
      <path d="M-120 -40 L60 -120 L60 120 L-120 40 Z" fill={shade(c, -0.15)} stroke={shade(c, -0.55)} strokeWidth={4} />
      <ellipse cx={60} cy={0} rx={40} ry={120} fill={shade(c, 0.25)} stroke={shade(c, -0.55)} strokeWidth={4} />
      <rect x={-170} y={-36} width={56} height={72} rx={12} fill={shade(c, -0.4)} />
      {[1, 2, 3].map((k) => (
        <path key={k} d={`M${110 + k * 26} -${40 + k * 18} Q${130 + k * 34} 0 ${110 + k * 26} ${40 + k * 18}`} fill="none" stroke={c} strokeWidth={8} strokeLinecap="round" opacity={0.9 - k * 0.2} />
      ))}
    </g>
  ),
  scale: (c, f) => {
    const tilt = Math.sin(f / 20) * 6;
    return (
      <g transform="translate(0 -40)">
        <Box x={-60} y={-60} a={120} b={120} h={24} c={shade(c, -0.25)} />
        <rect x={-8} y={-260} width={16} height={240} fill={shade(c, -0.35)} />
        <g transform={`translate(0 -250) rotate(${tilt})`}>
          <rect x={-170} y={-8} width={340} height={16} rx={8} fill={c} />
          {[-160, 160].map((x) => (
            <g key={x} transform={`translate(${x} 0) rotate(${-tilt})`}>
              <path d="M0 0 L-50 90 M0 0 L50 90" stroke={shade(c, -0.4)} strokeWidth={4} />
              <path d="M-70 90 Q0 140 70 90 Z" fill={shade(c, 0.2)} stroke={shade(c, -0.5)} strokeWidth={3} />
            </g>
          ))}
        </g>
      </g>
    );
  },
  factory: (c, f) => (
    <g>
      <Box x={-150} y={-60} a={220} b={120} h={110} c={c} />
      <Box x={70} y={-60} a={80} b={120} h={160} c={shade(c, 0.1)} />
      <Box x={-130} y={-40} a={34} b={34} h={230} c={shade(c, -0.2)} />
      <circle cx={I(-113, -23, 250)[0]} cy={I(-113, -23, 250)[1] - ((f * 1.2) % 60)} r={26 + ((f * 1.2) % 60) * 0.4} fill={shade(c, 0.5)} opacity={0.5 - ((f * 1.2) % 60) / 140} />
    </g>
  ),
};

/** The object, about 420 px wide, standing on a soft shadow, turning a little as it breathes. */
export const RoadObject: React.FC<{ id: ObjectId; color: string; f: number; size?: number }> = ({ id, color, f, size = 1 }) => (
  <svg width={520 * size} height={460 * size} viewBox="-260 -330 520 460" style={{ overflow: "visible" }}>
    <ellipse cx={0} cy={70} rx={210} ry={56} fill="#000" opacity={0.28} />
    <ellipse cx={0} cy={70} rx={250} ry={80} fill={color} opacity={0.1} />
    <g transform={`translate(0 ${Math.sin(f / 18) * 5}) rotate(${Math.sin(f / 40) * 1.5})`}>{(draw[id] ?? draw.treaty)(color, f)}</g>
  </svg>
);

export const OBJECTS = Object.keys(draw) as ObjectId[];
