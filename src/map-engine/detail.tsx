// A close map's detail (round 4, owner: «جزئیات بیشتر روی نقشه»): the sea's depth as a quiet tint (Natural Earth's
// 200 m and 1000 m bands: the shallow Persian Gulf a little lighter than the deep Gulf of Oman), the coasts and the
// small islands at 1:10m (Hormuz, Larak, Abu Musa, the Tunbs in their own shapes), a scale bar measured on the map and
// a north arrow. It fades in as the camera comes closer than 30° and stays clean: no fill is louder than the land.
import React from "react";
import { feature } from "topojson-client";
import sea from "./data/sea-detail.json";
import straits from "./data/straits-10m.json";
import { useView } from "./MapStage";
import { worldFor, km } from "./world";
import { VAZIR } from "./fonts";
import { faNum } from "./layers";

const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEA = sea as any;
const BOX = { type: "Polygon", coordinates: [[[32, 10], [32, 32], [66, 32], [66, 10], [32, 10]]] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COASTS = (feature(straits as any, (straits as any).objects.coasts) as any).features as any[];

/** Under the marks: the depth tint, then the land again over it, the 1:10m coasts and islands, the borders. */
export const SeaDetail: React.FC = () => {
  const v = useView();
  const s = v.look.span;
  const k = clamp01((30 - s) / 12);
  if (k <= 0) return null;
  const world = worldFor(s);
  const [d200, d1000, islands] = SEA.features;
  return (
    <g>
      <g opacity={k}>
        {/* shallow water (the shelf, under 200 m) a step lighter; the 200 m line like a chart's; the deep sea as it was */}
        <path d={v.path(BOX as never) ?? ""} fill="#1d3557" />
        {/* Natural Earth cuts its depth bands into tiles: a stroke of the fill's own colour hides the seams */}
        <path d={v.path(d200) ?? ""} fill="#162a47" stroke="#162a47" strokeWidth={2} />
        <path d={v.path(d1000) ?? ""} fill="#121f35" stroke="#121f35" strokeWidth={2} />
      </g>
      <path d={v.path(world.land) ?? ""} fill={v.theme.land} stroke={v.theme.landEdge} strokeWidth={1.4} />
      {s < 14
        ? COASTS.filter((c) => c.properties.strait === "hormuz").map((c, i) => <path key={i} d={v.path(c) ?? ""} fill={v.theme.land} />)
        : null}
      {s < 14 ? <path d={v.path(islands) ?? ""} fill={v.theme.land} stroke={v.theme.landEdge} strokeWidth={1.2} /> : null}
      <path d={v.path(world.borders) ?? ""} fill="none" stroke={v.theme.border} strokeWidth={s < 20 ? 2 : 1.3} strokeOpacity={0.8} />
    </g>
  );
};

/** A scale bar measured on the map at the frame's middle, and a north arrow: only on a close, flat map. */
export function scaleGeom(v: { look: { lon: number; lat: number; span: number; tilt?: number }; at: (lon: number, lat: number) => [number, number] | null }, x = 64, y = 1296) {
  const s = v.look.span;
  if (s > 25 || (v.look.tilt ?? 0) > 0.5) return null;
  const c: [number, number] = [v.look.lon, v.look.lat];
  const a = v.at(c[0] - 0.25, c[1]);
  const b = v.at(c[0] + 0.25, c[1]);
  if (!a || !b) return null;
  const pxPerKm = Math.hypot(b[0] - a[0], b[1] - a[1]) / km([c[0] - 0.25, c[1]], [c[0] + 0.25, c[1]]);
  const nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find((n) => n * pxPerKm >= 150) ?? 1000;
  const w = nice * pxPerKm;
  // pass 3: the north arrow stands right of the bar and its words, never on them (the judge: «شمال» over «۱۰۰ کیلومتر»)
  const textW = Math.ceil(`${nice} کیلومتر`.length * 40 * 0.58) + 8;
  const end = x + 60 + Math.max(w, w / 2 + textW / 2);
  const northX = end + 50;
  return { nice, w, northX, box: { x: x - 24, y: y - 120, w: northX + 60 - (x - 24), h: 150 } };
}

export const ScaleAndNorth: React.FC<{ x?: number; y?: number }> = ({ x = 64, y = 1296 }) => {
  const v = useView();
  const g = scaleGeom(v, x, y);
  if (!g) return null;
  const { nice, w, northX } = g;
  const halo = { paintOrder: "stroke" as const, stroke: v.theme.halo, strokeWidth: 7, strokeLinejoin: "round" as const };
  return (
    <g opacity={0.9}>
      {/* the north arrow */}
      <g transform={`translate(${northX} ${y - 70})`}>
        <path d="M0 -34 L12 4 L0 -4 L-12 4 Z" fill={v.theme.ink} stroke={v.theme.halo} strokeWidth={2} />
        <path d="M0 -34 L0 -4 L-12 4 Z" fill={v.theme.halo} opacity={0.5} />
        <text x={0} y={42} textAnchor="middle" fill={v.theme.ink} fontFamily={VAZIR} fontWeight={700} fontSize={40} style={halo}>
          شمال
        </text>
      </g>
      {/* the scale: a bar of a round length, its ends ticked, the length in Persian */}
      <g transform={`translate(${x + 60} ${y})`}>
        <rect x={0} y={-6} width={w} height={8} fill={v.theme.halo} opacity={0.6} />
        <rect x={0} y={-6} width={w / 2} height={8} fill={v.theme.ink} />
        <rect x={0} y={-6} width={w} height={8} fill="none" stroke={v.theme.ink} strokeWidth={2} />
        <text x={w / 2} y={-18} textAnchor="middle" direction="rtl" fill={v.theme.ink} fontFamily={VAZIR} fontWeight={700} fontSize={40} style={halo}>
          {`${faNum(nice)} کیلومتر`}
        </text>
      </g>
    </g>
  );
};
