// The flags of the nine states of Divan's weapons block, drawn by code (never
// by an image model, which writes letters badly and flags wrong), as cloth on
// a brass pole that waves a little under the lamp: the sheet is cut in thin
// upright strips, each lifted by a slow wave that grows away from the pole,
// and lit or shaded by its slope. The art is simplified at this size, but the
// colours, the bands and the words are each state's own.
import React from "react";
import { NASKH } from "../kit";

const W = 300;
const H = 200;

/** A five-pointed star round (cx, cy) with outer radius r, one point up (turned by `turn` degrees). */
const star = (cx: number, cy: number, r: number, turn = 0) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = ((turn - 90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.4 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};

/** Iran's emblem, simplified: the four crescents and the upright sword in red. */
const IranEmblem: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#da0000">
    <path d="M-2 -26 L2 -26 L2 22 L-2 22 Z" />
    <path d="M-6 -30 L0 -36 L6 -30 Z" />
    <path d="M-10 -20 Q-26 -2 -12 20 Q-20 0 -8 -16 Z" />
    <path d="M10 -20 Q26 -2 12 20 Q20 0 8 -16 Z" />
    <path d="M-16 -16 Q-36 4 -18 26 Q-30 4 -14 -12 Z" />
    <path d="M16 -16 Q36 4 18 26 Q30 4 14 -12 Z" />
  </g>
);

/** The flat art of a flag on its 300 × 200 sheet. */
function Art({ iso3 }: { iso3: string }) {
  switch (iso3) {
    case "IRN":
      return (
        <>
          <rect width={W} height={H / 3} fill="#239f40" />
          <rect y={H / 3} width={W} height={H / 3} fill="#ffffff" />
          <rect y={(2 * H) / 3} width={W} height={H / 3} fill="#da0000" />
          {/* the bands of the takbir along the white, eleven a side, as small white marks */}
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i} fill="#ffffff" opacity="0.9">
              <rect x={10 + i * 26.4} y={H / 3 - 9} width={16} height={4} />
              <rect x={10 + i * 26.4} y={(2 * H) / 3 + 5} width={16} height={4} />
            </g>
          ))}
          <IranEmblem x={W / 2} y={H / 2} s={0.82} />
        </>
      );
    case "SAU":
      return (
        <>
          <rect width={W} height={H} fill="#006c35" />
          <text x={W / 2} y={92} textAnchor="middle" direction="rtl" fontFamily={NASKH} fontWeight={700} fontSize={30} fill="#ffffff">
            لا إله إلا الله محمد رسول الله
          </text>
          <path d="M62 128 L232 128 L238 122 L244 128 L238 134 L232 130 L62 130 Z" fill="#ffffff" />
          <path d="M226 120 L230 120 L230 138 L226 138 Z" fill="#ffffff" />
        </>
      );
    case "TUR":
      return (
        <>
          <rect width={W} height={H} fill="#e30a17" />
          <circle cx={112} cy={100} r={50} fill="#ffffff" />
          <circle cx={125} cy={100} r={40} fill="#e30a17" />
          <path d={star(178, 100, 25, -18)} fill="#ffffff" />
        </>
      );
    case "ISR":
      return (
        <>
          <rect width={W} height={H} fill="#ffffff" />
          <rect y={20} width={W} height={30} fill="#0038b8" />
          <rect y={150} width={W} height={30} fill="#0038b8" />
          <path d="M150 64 L181 118 L119 118 Z" fill="none" stroke="#0038b8" strokeWidth="7" strokeLinejoin="miter" />
          <path d="M150 136 L119 82 L181 82 Z" fill="none" stroke="#0038b8" strokeWidth="7" strokeLinejoin="miter" />
        </>
      );
    case "ARE":
      return (
        <>
          <rect width={W} height={H / 3} fill="#00732f" />
          <rect y={H / 3} width={W} height={H / 3} fill="#ffffff" />
          <rect y={(2 * H) / 3} width={W} height={H / 3} fill="#000000" />
          <rect width={75} height={H} fill="#ff0000" />
        </>
      );
    case "EGY":
      return (
        <>
          <rect width={W} height={H / 3} fill="#ce1126" />
          <rect y={H / 3} width={W} height={H / 3} fill="#ffffff" />
          <rect y={(2 * H) / 3} width={W} height={H / 3} fill="#000000" />
          {/* the eagle of Saladin, simplified, in gold */}
          <g fill="#c09300">
            <path d="M150 78 L158 84 L156 96 L166 92 L180 80 L176 98 L164 112 L156 118 L144 118 L136 112 L124 98 L120 80 L134 92 L144 96 L142 84 Z" />
            <path d="M140 118 L160 118 L156 126 L144 126 Z" />
          </g>
        </>
      );
    case "PAK":
      return (
        <>
          <rect width={W} height={H} fill="#01411c" />
          <rect width={75} height={H} fill="#ffffff" />
          <circle cx={188} cy={100} r={50} fill="#ffffff" />
          <circle cx={202} cy={88} r={44} fill="#01411c" />
          <path d={star(222, 76, 18, 30)} fill="#ffffff" />
        </>
      );
    case "IRQ":
      return (
        <>
          <rect width={W} height={H / 3} fill="#ce1126" />
          <rect y={H / 3} width={W} height={H / 3} fill="#ffffff" />
          <rect y={(2 * H) / 3} width={W} height={H / 3} fill="#000000" />
          <text x={W / 2} y={116} textAnchor="middle" direction="rtl" fontFamily={NASKH} fontWeight={700} fontSize={40} fill="#007a3d">
            الله أكبر
          </text>
        </>
      );
    case "QAT":
      return (
        <>
          <rect width={W} height={H} fill="#8a1538" />
          {/* the white band at the hoist with its nine points */}
          <path
            d={`M0 0 L84 0 ${Array.from({ length: 9 }, (_, i) => `L112 ${((i + 0.5) * H) / 9} L84 ${((i + 1) * H) / 9}`).join(" ")} L0 ${H} Z`}
            fill="#ffffff"
          />
        </>
      );
    default:
      return <rect width={W} height={H} fill="#4a5a52" />;
  }
}

const SLICES = 22;

/**
 * A flag waving on its pole at a frame. `pole` says on which side the pole
 * stands ("left" by default; "right" for the second of two flags facing each
 * other); the cloth itself is never drawn mirrored, so its words read.
 */
export const Flag: React.FC<{ iso3: string; width: number; height: number; frame: number; pole?: "left" | "right"; still?: boolean }> = ({ iso3, width, height, frame, pole = "left", still }) => {
  const id = `flag-${iso3}-${pole}`;
  const t = still ? 0 : frame / 9;
  // the sheet inside the piece: room for the pole and the wave
  const POLE = 18;
  const sheetW = width - POLE - 10;
  const sheetH = Math.min(height - 28, (sheetW * H) / W);
  const sx = sheetW / W;
  const sy = sheetH / H;
  const x0 = pole === "left" ? POLE : 10;
  const y0 = (height - sheetH) / 2 - 6;
  const slice = W / SLICES;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <g id={`${id}-art`}>
          <Art iso3={iso3} />
        </g>
        {Array.from({ length: SLICES }, (_, i) => (
          <clipPath key={i} id={`${id}-c${i}`}>
            <rect x={i * slice - 0.6} y={-20} width={slice + 1.2} height={H + 40} />
          </clipPath>
        ))}
      </defs>
      {/* the pole, brass, with its finial */}
      <rect x={pole === "left" ? 4 : width - 12} y={4} width={8} height={height - 4} rx={3} fill="#c9a45c" />
      <circle cx={pole === "left" ? 8 : width - 8} cy={6} r={7} fill="#ead08f" />
      <g transform={`translate(${x0} ${y0}) scale(${sx} ${sy})`}>
        {Array.from({ length: SLICES }, (_, i) => {
          // the distance from the pole: the wave is nothing at the pole and grows toward the fly
          const u = pole === "left" ? i / (SLICES - 1) : 1 - i / (SLICES - 1);
          const phase = t - u * 4.2;
          const dy = Math.sin(phase) * 9 * u;
          const slope = Math.cos(phase) * u;
          return (
            <g key={i} clipPath={`url(#${id}-c${i})`} transform={`translate(0 ${dy.toFixed(2)})`}>
              <use href={`#${id}-art`} />
              <rect x={i * slice - 0.6} y={0} width={slice + 1.2} height={H} fill={slope > 0 ? "#fff3d6" : "#000"} opacity={Math.min(0.32, Math.abs(slope) * 0.32)} />
            </g>
          );
        })}
      </g>
    </svg>
  );
};
