// The flags of the nine states of Divan's weapons block, drawn by code (never
// by an image model, which writes letters badly and flags wrong), as cloth on
// a brass pole that waves a little under the lamp: the sheet is cut in thin
// upright strips, each lifted by a slow wave that grows away from the pole,
// and lit or shaded by its slope. The art is simplified at this size, but the
// colours, the bands and the words are each state's own.
import React from "react";
import { NASKH } from "../kit";
import { IRAN_FLAG, flagAspect, takbirXs } from "./iran-flag";

const W = 300;
const H = 200;
/** The width of a state's sheet when it is 200 high: 350 for Iran (4 : 7), 300 for the others (2 : 3). */
const sheetWidth = (iso3: string) => Math.round(H * flagAspect(iso3));

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

/**
 * Iran's flag on its own 630 × 360 sheet (iran-flag.ts): the three bands, the
 * 22 takbir in white along the edges of the green and the red, the emblem in
 * red. Until 18 Nov this was a 3 : 2 sketch with plain white bars for the
 * takbir and a made-up emblem; Ali: «پرچم ایران غلطه».
 */
const IranFlag: React.FC = () => {
  const F = IRAN_FLAG;
  const t = F.takbir;
  return (
    <g transform={`scale(${H / F.height})`}>
      <rect width={F.width} height={F.height} fill={F.red} />
      <rect width={F.width} height={(2 * F.height) / 3} fill={F.white} />
      <rect width={F.width} height={F.height / 3} fill={F.green} />
      <g transform={`translate(${t.origin[0]} ${t.origin[1]})`} fill="none" stroke={F.white} strokeWidth={t.stroke}>
        {takbirXs().map((x) => (
          <g key={x} transform={`translate(${x - t.origin[0]} 0)`}>
            {t.wordsAt.map((y) => <path key={`w${y}`} d={t.words} transform={`translate(0 ${y}) scale(${t.wordsScale})`} />)}
            {t.lineAt.map((y) => <path key={`l${y}`} d={t.line} transform={`translate(0 ${y}) scale(${t.lineScale})`} />)}
          </g>
        ))}
      </g>
      <g fill={F.red} transform={`translate(${F.emblem.centre[0]} ${F.emblem.centre[1]}) scale(${F.emblem.scale})`}>
        {F.emblem.half.map((d, i) => <path key={`r${i}`} d={d} />)}
        <g transform="scale(-1 1)">{F.emblem.half.map((d, i) => <path key={`l${i}`} d={d} />)}</g>
      </g>
    </g>
  );
};

/** The flat art of a flag on its 300 × 200 sheet. */
function Art({ iso3 }: { iso3: string }) {
  switch (iso3) {
    case "IRN":
      // always today's flag; a historical one only by its own key on an explicitly historical episode (iran-flag.ts)
      return <IranFlag />;
    case "SAU":
      return (
        <>
          <rect width={W} height={H} fill="#006c35" />
          <text x={W / 2} y={90} textAnchor="middle" direction="rtl" fontFamily={NASKH} fontWeight={700} fontSize={26} textLength={236} lengthAdjust="spacingAndGlyphs" fill="#ffffff">
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
  // the sheet keeps its state's own proportion (Iran 4 : 7, the others 2 : 3): when the box is too low for the width,
  // the sheet gets narrower instead of being squashed (until 18 Nov a wide, low box stretched it: sx ≠ sy)
  const AW = sheetWidth(iso3);
  const room = width - POLE - 10;
  const sheetH = Math.min(height - 28, (room * H) / AW);
  const sheetW = (sheetH * AW) / H;
  const sx = sheetW / AW;
  const sy = sheetH / H;
  const x0 = pole === "left" ? POLE : 10 + room - sheetW;
  const y0 = (height - sheetH) / 2 - 6;
  const slice = AW / SLICES;
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
