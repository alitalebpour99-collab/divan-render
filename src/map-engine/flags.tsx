// Flags instead of faces (owner's rule for every map: no photo of a real person; a leader is his state's flag and
// name). Each flag is drawn flat by code on its own sheet, never by an image model (which writes letters badly and
// gets flags wrong); the art is simplified at chip size, but every colour, band and word is the state's own. A state
// with no art here gets a plain chip with its name only: the engine never draws a flag it does not know.
// Iran's flag is the real one (iran-flag.ts: 4 : 7, the emblem, the 22 takbir), from Divan's #23.
import React from "react";
import { NASKH, VAZIR } from "./fonts";
import { IRAN_FLAG, takbirXs } from "./iran-flag";
import { nameFa } from "./names";

const W = 300;
const H = 200;

const star = (cx: number, cy: number, r: number, turn = 0) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = ((turn - 90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.4 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
};
const bands = (cols: string[], vertical = false) =>
  cols.map((c, i) => (vertical ? <rect key={i} x={(i * W) / cols.length} width={W / cols.length + 0.5} height={H} fill={c} /> : <rect key={i} y={(i * H) / cols.length} width={W} height={H / cols.length + 0.5} fill={c} />));

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

/** The flat art on a 300 × 200 sheet (Iran's on its own 350 × 200), or null for a state the engine has no art for. */
export function flagArt(a3: string): React.ReactNode | null {
  switch (a3) {
    case "IRN":
      return <IranFlag />;
    case "USA": {
      const stripe = H / 13;
      return (
        <>
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} y={i * stripe} width={W} height={stripe + 0.4} fill={i % 2 ? "#ffffff" : "#b22234"} />
          ))}
          <rect width={W * 0.4} height={stripe * 7} fill="#3c3b6e" />
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: r % 2 ? 5 : 6 }, (_, c) => <path key={`${r}-${c}`} d={star(10 + c * 20 + (r % 2 ? 10 : 0), 8 + r * 11.6, 4.2)} fill="#ffffff" />),
          )}
        </>
      );
    }
    case "RUS":
      return <>{bands(["#ffffff", "#0039a6", "#d52b1e"])}</>;
    case "CHN":
      return (
        <>
          <rect width={W} height={H} fill="#ee1c25" />
          <path d={star(50, 50, 30)} fill="#ffff00" />
          <path d={star(100, 20, 10, 23)} fill="#ffff00" />
          <path d={star(120, 40, 10, 46)} fill="#ffff00" />
          <path d={star(120, 70, 10, 70)} fill="#ffff00" />
          <path d={star(100, 90, 10, 21)} fill="#ffff00" />
        </>
      );
    case "OMN":
      return (
        <>
          <rect width={W} height={H} fill="#db161b" />
          <rect x={90} width={W - 90} height={H / 3} fill="#ffffff" />
          <rect x={90} y={(2 * H) / 3} width={W - 90} height={H / 3} fill="#008000" />
        </>
      );
    case "SAU":
      return (
        <>
          <rect width={W} height={H} fill="#006c35" />
          <text x={W / 2} y={90} textAnchor="middle" direction="rtl" fontFamily={NASKH} fontWeight={700} fontSize={26} textLength={236} lengthAdjust="spacingAndGlyphs" fill="#ffffff">
            لا إله إلا الله محمد رسول الله
          </text>
          <path d="M62 128 L232 128 L238 122 L244 128 L238 134 L232 130 L62 130 Z" fill="#ffffff" />
        </>
      );
    case "ARE":
      return (
        <>
          {bands(["#00732f", "#ffffff", "#000000"])}
          <rect width={75} height={H} fill="#ff0000" />
        </>
      );
    case "QAT":
      return (
        <>
          <rect width={W} height={H} fill="#8a1538" />
          <path d={`M0 0 L84 0 ${Array.from({ length: 9 }, (_, i) => `L112 ${((i + 0.5) * H) / 9} L84 ${((i + 1) * H) / 9}`).join(" ")} L0 ${H} Z`} fill="#ffffff" />
        </>
      );
    case "BHR":
      return (
        <>
          <rect width={W} height={H} fill="#ce1126" />
          <path d={`M0 0 L80 0 ${Array.from({ length: 5 }, (_, i) => `L120 ${((i + 0.5) * H) / 5} L80 ${((i + 1) * H) / 5}`).join(" ")} L0 ${H} Z`} fill="#ffffff" />
        </>
      );
    case "KWT":
      return (
        <>
          {bands(["#007a3d", "#ffffff", "#ce1126"])}
          <path d={`M0 0 L75 ${H / 3} L75 ${(2 * H) / 3} L0 ${H} Z`} fill="#000000" />
        </>
      );
    case "IRQ":
      return (
        <>
          {bands(["#ce1126", "#ffffff", "#000000"])}
          <text x={W / 2} y={116} textAnchor="middle" direction="rtl" fontFamily={NASKH} fontWeight={700} fontSize={40} fill="#007a3d">
            الله أكبر
          </text>
        </>
      );
    case "YEM":
      return <>{bands(["#ce1126", "#ffffff", "#000000"])}</>;
    case "EGY":
      return (
        <>
          {bands(["#ce1126", "#ffffff", "#000000"])}
          <path d="M150 78 L158 84 L156 96 L166 92 L180 80 L176 98 L164 112 L156 118 L144 118 L136 112 L124 98 L120 80 L134 92 L144 96 L142 84 Z" fill="#c09300" />
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
          <path d="M150 64 L181 118 L119 118 Z" fill="none" stroke="#0038b8" strokeWidth="7" />
          <path d="M150 136 L119 82 L181 82 Z" fill="none" stroke="#0038b8" strokeWidth="7" />
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
    case "UKR":
      return <>{bands(["#0057b7", "#ffd700"])}</>;
    case "FRA":
      return <>{bands(["#002395", "#ffffff", "#ed2939"], true)}</>;
    case "DEU":
      return <>{bands(["#000000", "#dd0000", "#ffce00"])}</>;
    case "JPN":
      return (
        <>
          <rect width={W} height={H} fill="#ffffff" />
          <circle cx={W / 2} cy={H / 2} r={60} fill="#bc002d" />
        </>
      );
    case "IND":
      return (
        <>
          {bands(["#ff9933", "#ffffff", "#138808"])}
          <circle cx={W / 2} cy={H / 2} r={26} fill="none" stroke="#000080" strokeWidth={4} />
        </>
      );
    default:
      return null;
  }
}

/** Width over height of a flag's sheet: Iran 7 : 4, the others 3 : 2. */
export const flagAspect = (a3: string) => (a3 === "IRN" ? IRAN_FLAG.width / IRAN_FLAG.height : 1.5);

/** A flag as a flat chip (rounded corners, a thin light edge), with the state's name under it; or the name alone. */
export const FlagChip: React.FC<{ a3: string; height: number; name?: string | null; color?: string; ink?: string; size?: number; glow?: string }> = ({ a3, height, name, color = "#f3efe6", ink = "#1a2330", size = 40, glow }) => {
  const art = flagArt(a3);
  const w = height * flagAspect(a3);
  const label = name === null ? null : (name ?? nameFa(a3));
  const id = `chip-${a3}-${Math.round(height)}`;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {art ? (
        <svg width={w} height={height} viewBox={`0 0 ${a3 === "IRN" ? H * flagAspect(a3) : W} ${H}`} style={{ borderRadius: height * 0.1, boxShadow: glow ? `0 0 ${height * 0.5}px ${glow}` : `0 ${height * 0.08}px ${height * 0.3}px rgba(0,0,0,0.45)`, outline: "2px solid rgba(255,255,255,0.35)" }}>
          <defs>
            <clipPath id={id}>
              <rect width={a3 === "IRN" ? H * flagAspect(a3) : W} height={H} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id})`}>{art}</g>
        </svg>
      ) : (
        <div style={{ width: w, height, borderRadius: height * 0.1, background: color, color: ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: height * 0.32 }}>{nameFa(a3)}</div>
      )}
      {label && art ? <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: size, color, direction: "rtl", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>{label}</div> : null}
    </div>
  );
};
