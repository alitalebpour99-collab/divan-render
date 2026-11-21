// The engine's camera, pure (no React): where it looks and how wide, and how it travels between two looks.
//
// A look is a centre on the earth and a span: how many degrees of arc the frame's width holds. The globe is a span
// over 170 (the whole earth with sky round it); a strait is a span of 2 or 3. Every view is the same orthographic
// projection turned to the centre, so a dive from the globe into a strait is one continuous move, never a cut.
// Between two looks the camera follows van Wijk & Nuij's smooth zoom and pan (2003; d3.interpolateZoom does the
// same): out a little, across, and in, at a speed the eye can follow.
import { geoDistance, geoInterpolate } from "d3-geo";

/** roll turns the map in the frame (degrees); tilt leans it back like a table seen from a chair (degrees, 0…30) */
export type Look = { lon: number; lat: number; span: number; roll?: number; tilt?: number };
export type Key = Look & { at: number; ease?: "inOut" | "out" | "linear" };

const RHO = Math.SQRT2;
const RAD = 180 / Math.PI;

/** The projection's scale (the globe's radius in px) for a span across a frame `width` px wide. */
export function scaleOf(span: number, width: number) {
  if (span > 170) return ((width / 2) * 170) / span / Math.sin((170 * Math.PI) / 360);
  return width / 2 / Math.sin((Math.max(0.05, span) * Math.PI) / 360);
}

export const easeInOut = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
export const easeOut = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - (1 - u) ** 3);

/**
 * The look at share t (0…1) of the way from a to b: van Wijk's path in (centre distance, width), with the centre
 * moving on the great circle between the two centres. A plain pan when the spans match, a plain zoom when the
 * centres do.
 */
export function flight(a: Look, b: Look, t: number): Look {
  const d = geoDistance([a.lon, a.lat], [b.lon, b.lat]) * RAD;
  const w0 = Math.min(a.span, 200);
  const w1 = Math.min(b.span, 200);
  const roll = (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * t;
  const tilt = (a.tilt ?? 0) + ((b.tilt ?? 0) - (a.tilt ?? 0)) * t;
  if (d < 1e-6) return { lon: a.lon, lat: a.lat, span: w0 * Math.pow(w1 / w0, t), roll, tilt };
  const centre = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  const d2 = d * d;
  const b0 = (w1 * w1 - w0 * w0 + RHO ** 4 * d2) / (2 * w0 * RHO * RHO * d);
  const b1 = (w1 * w1 - w0 * w0 - RHO ** 4 * d2) / (2 * w1 * RHO * RHO * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / RHO;
  const s = t * S;
  const coshr0 = Math.cosh(r0);
  const u = ((w0 / (RHO * RHO)) * (coshr0 * Math.tanh(RHO * s + r0) - Math.sinh(r0))) / d;
  const w = (w0 * coshr0) / Math.cosh(RHO * s + r0);
  const [lon, lat] = centre(Math.max(0, Math.min(1, u)));
  return { lon, lat, span: w, roll, tilt };
}

/**
 * The look at frame f on a track of keys (sorted by frame). Between two keys the camera flies; before the first and
 * after the last it holds. A held look still breathes: the span grows by up to 2 % and the centre drifts a little,
 * so no frame of the map ever stands still.
 */
export function lookAt(keys: Key[], f: number, breathe = true): Look {
  if (!keys.length) return { lon: 53, lat: 30, span: 30 };
  let look: Look;
  if (f <= keys[0].at) look = keys[0];
  else if (f >= keys[keys.length - 1].at) look = keys[keys.length - 1];
  else {
    let i = 0;
    while (keys[i + 1].at <= f) i += 1;
    const a = keys[i];
    const b = keys[i + 1];
    const u = (f - a.at) / Math.max(1, b.at - a.at);
    const e = b.ease === "linear" ? u : b.ease === "out" ? easeOut(u) : easeInOut(u);
    look = flight(a, b, e);
  }
  if (!breathe) return look;
  const k = 1 + 0.02 * Math.sin(f / 47);
  const drift = look.span * 0.006;
  return { ...look, span: look.span * k, lon: look.lon + drift * Math.sin(f / 61), lat: look.lat + drift * Math.cos(f / 73) };
}
