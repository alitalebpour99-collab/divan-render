// «عدد روز»: one figure of the site. The figure counts up large in the middle,
// a ring fills around it when it is a percentage (a second ring when it is over
// a hundred), and around any other figure a slow ring of light turns; then what
// it means, in the site's own sentence; then its date and its source.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Brand, C, FPS, Foot, Kicker, NASKH, Net, Progress, SIDE, SIDE_RAIL, VAZIR, W, Words, clamped, ease, fade, faNum, grow, leave, paint, pop, readFrames, rise, starts } from "./kit";
import type { FigureProps } from "./props";

const HOOK = 150;

function plan(p: FigureProps) {
  const explain = Math.min(300, Math.max(150, readFrames(p.explain)));
  const source = Math.min(180, Math.max(110, Math.round(readFrames(`${p.when} ${p.source}`) * 0.9)));
  const lengths = [HOOK, explain, source];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const figureDuration = (p: FigureProps) => plan(p).total;

const CX = W / 2;
const CY = 930;
const R = 330;

export const Figure: React.FC<FigureProps> = (p) => {
  paint("figure");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const [, aExplain, aSource] = at;
  const count = grow(frame, 30, 70);
  const done = fade(frame, 100, 8);
  // the figure rises a little out of the way when its meaning arrives
  const lift = interpolate(frame, [aExplain, aExplain + 24], [0, -200], { ...clamped, easing: ease });
  const shrink = interpolate(frame, [aExplain, aExplain + 24], [1, 0.72], { ...clamped, easing: ease });
  const size = p.valueText.length > 9 ? 150 : p.valueText.length > 6 ? 180 : 220;
  const laps = p.percent != null ? p.percent / 100 : 0;
  const ring1 = Math.min(1, laps) * count;
  const ring2 = Math.max(0, Math.min(1, laps - 1)) * count;
  const turn = ((frame / FPS) * 24) % 360;

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={48} />
      <Net total={total} opacity={0.22} count={16} top={420} bottom={1500} />
      <Brand tag={p.series} />
      <Progress total={total} marks={[aExplain, aSource]} />

      <div style={{ position: "absolute", top: 222, right: SIDE, left: SIDE, opacity: fade(frame, 2, 12) }}>
        <Kicker size={36}>{`عدد روز · ${p.section}`}</Kicker>
        <Words text={p.label} from={6} step={3} style={{ marginTop: 10, fontFamily: NASKH, fontWeight: 700, fontSize: p.label.length > 34 ? 60 : 72, lineHeight: 1.4, color: C.ink }} />
      </div>

      {/* the figure and its ring */}
      <div style={{ position: "absolute", left: 0, right: 0, top: CY - R - 40, height: 2 * R + 80, transform: `translateY(${lift}px) scale(${shrink})` }}>
        <svg width={W} height={2 * R + 80} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g transform={`translate(${CX} ${R + 40})`} opacity={fade(frame, 14, 16)}>
            <circle r={R} fill="none" stroke={C.line2} strokeWidth={3} />
            {p.percent != null ? (
              <>
                <circle r={R} fill="none" stroke={C.acc} strokeWidth={26} strokeLinecap="round" pathLength={100} strokeDasharray={`${ring1 * 100} 100`} transform="rotate(-90)" />
                {ring2 > 0 ? <circle r={R - 44} fill="none" stroke={C.acc} strokeOpacity={0.6} strokeWidth={18} strokeLinecap="round" pathLength={100} strokeDasharray={`${ring2 * 100} 100`} transform="rotate(-90)" /> : null}
              </>
            ) : (
              <g transform={`rotate(${turn})`}>
                <circle r={R} fill="none" stroke={C.acc} strokeWidth={10} strokeLinecap="round" pathLength={100} strokeDasharray={`${18 * count} 7 ${6 * count} 69`} />
              </g>
            )}
          </g>
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1, color: C.ink, transform: `scale(${pop(frame, 26, 26)})`, direction: "rtl", whiteSpace: "nowrap" }}>
            {done > 0.5 ? p.valueText : `${p.value < 0 ? "منفی " : ""}${faNum(Math.abs(p.value) * count, p.decimals)}`}
          </div>
          <div style={{ marginTop: 24, fontFamily: VAZIR, fontWeight: 700, fontSize: 48, color: C.acc, opacity: fade(frame, 60, 12) }}>{p.unit}</div>
        </div>
      </div>

      {/* what it means */}
      {frame >= aExplain - 2 ? (
        <div style={{ position: "absolute", top: 1040, right: SIDE_RAIL, left: SIDE, opacity: leave(frame, aSource + 16, 14) }}>
          <Words text={p.explain} from={aExplain + 16} step={2} lift={20} style={{ fontFamily: VAZIR, fontSize: 40, lineHeight: 1.7, color: C.ink }} />
        </div>
      ) : null}

      {/* its date and its source */}
      {frame >= aSource - 2 ? (
        <div style={{ position: "absolute", top: 1040, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, aSource + 12, 14), transform: `translateY(${rise(frame, aSource + 12, 24, 14)}px)` }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color: C.ink }}>{p.when}</div>
          <div style={{ marginTop: 16, fontFamily: VAZIR, fontSize: 30, lineHeight: 1.7, color: C.ink2 }}>{`منبع: ${p.source}`}</div>
        </div>
      ) : null}
      <Foot opacity={fade(frame, aSource + 22, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
