// <MapStage>: the container of every map. One orthographic projection turned to the camera's look (camera.ts), so the
// globe, a dive and a regional map are the same picture at different spans. Layers, in this order: sky, sea, land,
// fills, hatching, borders, lines, pins, comets, labels (map-engine-fa.md §3). The layers read the view from context.
import React from "react";
import { geoDistance, geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { scaleOf, type Look } from "./camera";
import type { Theme } from "./theme";
import { worldFor } from "./world";

export type Frame = { x: number; y: number; w: number; h: number };
export type View = {
  look: Look;
  frame: Frame;
  scale: number;
  /** [x, y] on the screen, or null when the point is on the far side of the globe */
  at: (lon: number, lat: number) => [number, number] | null;
  path: (geo: unknown) => string;
  /** [lon, lat] under a point of the screen (round 5: what lies under a label) */
  inv: (x: number, y: number) => [number, number] | null;
  theme: Theme;
  /** the frame of the whole Reel, for motion that never stops */
  f: number;
  /** a unique prefix for ids inside this stage */
  uid: string;
};
const Ctx = React.createContext<View | null>(null);
export const useView = () => {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("a map layer outside <MapStage>");
  return v;
};

export function makeView(look: Look, frame: Frame, theme: Theme, f: number, uid = "me"): View {
  const scale = scaleOf(look.span, frame.w);
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  const proj = geoOrthographic()
    .rotate([-look.lon, -look.lat, look.roll ?? 0])
    .scale(scale)
    .translate([cx, cy])
    .clipAngle(90)
    .clipExtent([
      [frame.x - 40, frame.y - 40],
      [frame.x + frame.w + 40, frame.y + frame.h + 40],
    ])
    .precision(0.4);
  const path = geoPath(proj);
  return {
    look,
    frame,
    scale,
    theme,
    f,
    uid,
    at: (lon, lat) => (geoDistance([lon, lat], [look.lon, look.lat]) > Math.PI / 2 - 0.02 ? null : (proj([lon, lat]) as [number, number])),
    path: (geo) => path(geo as never) ?? "",
    inv: (x, y) => (proj.invert ? (proj.invert([x, y]) as [number, number] | null) : null),
  };
}

const grat = geoGraticule().step([10, 10])();

export const MapStage: React.FC<{ look: Look; frame: Frame; theme: Theme; f: number; uid?: string; dim?: number; /** a frame that fills the screen has square corners */ bleed?: boolean; children?: React.ReactNode }> = ({ look, frame, theme, f, uid = "me", dim = 0, bleed = false, children }) => {
  const view = makeView(look, frame, theme, f, uid);
  const world = worldFor(look.span);
  const globe = look.span > 60;
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  // the tilt: the map leans back like a table seen from a chair, scaled so its far edge still fills the frame
  const tilt = Math.max(0, Math.min(30, look.tilt ?? 0));
  const lean: React.CSSProperties = tilt > 0.05 ? { transform: `perspective(2200px) rotateX(${tilt}deg) scale(${1 + tilt * 0.014})`, transformOrigin: "50% 62%" } : {};
  return (
    <Ctx.Provider value={view}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: 1 - dim, ...lean }}>
        <defs>
          <radialGradient id={`${uid}-sea`} cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor={theme.seaLight} />
            <stop offset="100%" stopColor={theme.sea} />
          </radialGradient>
          <radialGradient id={`${uid}-air`} cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor={theme.skyGlow} stopOpacity={0.0} />
            <stop offset="93%" stopColor={theme.skyGlow} stopOpacity={0.9} />
            <stop offset="100%" stopColor={theme.skyGlow} stopOpacity={0} />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          <clipPath id={`${uid}-frame`}>
            <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={globe || bleed ? 0 : 26} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-frame)`}>
          {globe ? <circle cx={cx} cy={cy} r={view.scale * 1.08} fill={`url(#${uid}-air)`} /> : null}
          <path d={view.path({ type: "Sphere" })} fill={`url(#${uid}-sea)`} />
          <path d={view.path(grat)} fill="none" stroke={theme.graticule} strokeWidth={1.2} />
          <path d={view.path(world.land)} fill={theme.land} stroke={theme.landEdge} strokeWidth={1.4} />
          <path d={view.path(world.borders)} fill="none" stroke={theme.border} strokeWidth={look.span < 20 ? 2 : 1.3} strokeOpacity={0.8} />
          {children}
        </g>
      </svg>
    </Ctx.Provider>
  );
};
