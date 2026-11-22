// Round 8 (owner, 22 Nov 2026): a numbered place on the map is a small clean disc with its number, exactly at the
// incident or place (on water for a sea event, legend.ts); its words are in the legend box, never on the map. A strike
// that landed there is a short burst under the disc and a red ring, with no direction drawn.
import React from "react";
import { useView } from "./MapStage";
import { VAZIR } from "./fonts";
import { Burst } from "./objects";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const faDigit = (n: number) => String(n).replace(/\d/g, (d) => FA[Number(d)]);
const out3 = (u: number) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 3;

/** the disc's radius (px), as legend.ts MARKER_R */
export const DISC_R = 24;
export const DISC_INK = "#0b121c";
export const DISC_RING = "#f3efe6";
export const DISC_HIT = "#ff4d40";

/** The disc itself, for the map and for the legend's rows (the same picture in both). */
export const Disc: React.FC<{ x: number; y: number; n: number; r?: number; hit?: boolean; k?: number }> = ({ x, y, n, r = DISC_R, hit = false, k = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <circle r={r + 3} fill={DISC_INK} opacity={0.55} />
    <circle r={r} fill={DISC_INK} stroke={hit ? DISC_HIT : DISC_RING} strokeWidth={4} />
    <text y={r * 0.38} textAnchor="middle" fill={DISC_RING} fontFamily={VAZIR} fontWeight={800} fontSize={r * 1.18}>
      {faDigit(n)}
    </text>
  </g>
);

export const MapMarker: React.FC<{ lon: number; lat: number; n: number; hit?: boolean; t: number; /** pass 4: the shot turns to this disc (its legend row lights) */ focus?: number }> = ({ lon, lat, n, hit = false, t, focus }) => {
  const v = useView();
  if (t < 0) return null;
  const at = v.at(lon, lat);
  if (!at) return null;
  const k = out3(t / 9);
  const ring = (v.f % 60) / 60;
  return (
    <g>
      {hit ? <Burst x={at[0]} y={at[1]} t={t} /> : null}
      {/* a slow ring: the place is live, the eye finds it */}
      <circle cx={at[0]} cy={at[1]} r={DISC_R + 6 + ring * 26} fill="none" stroke={hit ? DISC_HIT : DISC_RING} strokeWidth={2.5} opacity={(1 - ring) * 0.55 * k} />
      {/* pass 4: the disc the shot turns to: an amber halo that swells in as the camera leans to it */}
      {focus !== undefined && focus >= 0 ? <circle cx={at[0]} cy={at[1]} r={DISC_R + 10} fill="none" stroke="#ffb020" strokeWidth={5} opacity={Math.min(1, focus / 10)} /> : null}
      <Disc x={at[0]} y={at[1]} n={n} hit={hit} k={(0.6 + 0.4 * k) * (focus !== undefined && focus >= 0 ? 1 + 0.15 * Math.min(1, focus / 10) : 1)} />
    </g>
  );
};
