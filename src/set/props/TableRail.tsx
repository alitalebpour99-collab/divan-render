// The near edge of the war-room table: a dark walnut rail with a brass inlay,
// a brass rule lying on it and the series' ribbon over its corner. It fills
// the bottom of the frame under the platforms' caption rows (nothing to read
// there, so it carries no word) and puts something between the viewer and the
// cloth. Drawn in code (SVG); listed in props/manifest.json for Ahura's shared
// asset library.
import React from "react";

export const RAIL_H = 300;

export const TableRail: React.FC<{ width: number; frame: number; signal: { main: string; deep: string }; drift?: number }> = ({ width, frame, signal, drift = 0 }) => {
  const W = width;
  // the lamp's glint walks slowly along the brass, so the rail is never a still picture
  const glint = ((frame * 2.2) % (W + 600)) - 300;
  const ticks = [];
  for (let i = -2; i < 60; i += 1) {
    const x = 60 + i * 20 + ((drift % 20) + 20) % 20;
    if (x < 60 || x > W - 250) continue;
    const long = i % 5 === 0;
    ticks.push(<line key={i} x1={x} y1={44} x2={x} y2={long ? 68 : 58} stroke="#5a4520" strokeWidth={long ? 2.4 : 1.4} />);
  }
  return (
    <svg width={W} height={RAIL_H} viewBox={`0 0 ${W} ${RAIL_H}`} style={{ position: "absolute", left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="rail-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3a22" />
          <stop offset="0.18" stopColor="#452b18" />
          <stop offset="1" stopColor="#2a190d" />
        </linearGradient>
        <linearGradient id="rail-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1dca0" />
          <stop offset="0.45" stopColor="#c9a45c" />
          <stop offset="1" stopColor="#7c5f2a" />
        </linearGradient>
        <linearGradient id="rail-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,.55)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id="rail-glint" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,244,210,0)" />
          <stop offset="0.5" stopColor="rgba(255,244,210,.5)" />
          <stop offset="1" stopColor="rgba(255,244,210,0)" />
        </linearGradient>
        <linearGradient id="rail-ribbon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={signal.deep} />
          <stop offset="0.35" stopColor={signal.main} />
          <stop offset="1" stopColor={signal.deep} />
        </linearGradient>
      </defs>
      {/* the cloth's shadow under the rail's lip, then the wood */}
      <rect x="0" y="0" width={W} height="26" fill="rgba(0,0,0,.42)" />
      <rect x="0" y="18" width={W} height={RAIL_H - 18} fill="url(#rail-wood)" />
      {/* the grain: long faint strokes */}
      {[70, 118, 150, 196, 236, 268].map((y, i) => (
        <path key={y} d={`M0 ${y} C ${W * 0.25} ${y - 7 + (i % 3) * 4}, ${W * 0.6} ${y + 9 - (i % 2) * 6}, ${W} ${y - 2}`} stroke="rgba(120,84,48,.22)" strokeWidth={i % 2 ? 1.2 : 2} fill="none" />
      ))}
      {/* the brass inlay along the lip */}
      <rect x="0" y="18" width={W} height="7" fill="url(#rail-brass)" />
      <rect x="0" y="25" width={W} height="2" fill="rgba(0,0,0,.5)" />
      {/* the brass rule lying on the rail */}
      <g>
        <rect x="52" y="48" width={W - 300} height="40" rx="3" fill="rgba(0,0,0,.45)" transform="translate(6 8)" />
        <rect x="52" y="40" width={W - 300} height="40" rx="3" fill="url(#rail-brass)" />
        {ticks}
        <rect x={glint} y="40" width="260" height="40" fill="url(#rail-glint)" />
      </g>
      {/* the series' ribbon over the corner of the rail */}
      <g>
        <path d={`M${W - 196} 18 L${W - 96} 18 L${W - 96} 214 L${W - 146} 178 L${W - 196} 214 Z`} fill="rgba(0,0,0,.4)" transform="translate(7 9)" />
        <path d={`M${W - 196} 18 L${W - 96} 18 L${W - 96} 214 L${W - 146} 178 L${W - 196} 214 Z`} fill="url(#rail-ribbon)" />
        <line x1={W - 184} y1="22" x2={W - 184} y2="196" stroke="rgba(255,255,255,.22)" strokeWidth="2" />
        <line x1={W - 108} y1="22" x2={W - 108} y2="196" stroke="rgba(0,0,0,.25)" strokeWidth="2" />
      </g>
      <rect x="0" y="26" width={W} height="60" fill="url(#rail-shade)" opacity=".35" />
    </svg>
  );
};
