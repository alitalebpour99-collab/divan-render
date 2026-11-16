// The weapons of «ایران در برابر …» as objects in three dimensions, on the
// war-room table: a tank, a combat jet, a gun, a submarine and a warship, each
// a side view in brushed gunmetal, pressed out into depth (a stack of the
// same outline, darker toward the back) and turned a little on its own axis
// under the lamp, so it reads as a model standing on the table, not a sign.
// No WebGL: CSS 3D transforms on SVG layers. The shapes are generic (no
// insignia, no model a viewer could take for a given state's), the same for
// both sides of a comparison.
import React from "react";
import { OBJECTS } from "./props/objects.ts";

/** One model: its outline parts on a 400 × 180 sheet (side view, nose or muzzle to the left), the details drawn on its face, and where its wheels are. */
type Model = { body: string[]; dark?: string[]; lines?: string[]; wheels?: [number, number, number][]; ground: number; /** parts drawn in brass over the face */ brass?: string[]; /** the face's gradient, lit edge to shade (gunmetal when left out) */ metal?: [string, string, string, string]; /** the hue of the pressed-out layers */ hue?: number };

const MODELS: Record<string, Model> = {
  tank: {
    // hull with its sloped glacis, the turret with its mantlet and long gun, the track skirt
    body: [
      "M70 118 L96 96 L318 96 L352 112 L346 132 L84 132 Z",
      "M150 96 L162 66 L262 62 L292 72 L298 96 Z",
      "M162 76 L18 72 L18 80 L162 86 Z",
      "M12 70 L24 70 L24 82 L12 82 Z",
      "M232 62 L240 50 L262 50 L266 62 Z",
    ],
    dark: ["M64 130 Q58 150 78 158 L330 158 Q352 150 346 130 Z"],
    lines: ["M96 104 L318 104", "M176 80 L284 78", "M70 140 L340 140"],
    wheels: [[98, 146, 13], [134, 148, 14], [170, 148, 14], [206, 148, 14], [242, 148, 14], [278, 148, 14], [314, 146, 13]],
    ground: 160,
  },
  jet: {
    // a delta-winged combat jet in profile: fuselage, canopy, intake, fin, the near wing, the nozzle
    body: [
      "M14 92 Q40 80 92 78 L300 74 Q338 76 362 84 L376 92 L362 100 L300 104 L92 104 Q40 102 14 92 Z",
      "M262 76 L300 18 L326 18 L330 76 Z",
      "M150 100 L262 100 L322 132 L292 136 L200 110 Z",
      "M360 84 L392 86 L392 98 L360 100 Z",
    ],
    dark: ["M66 80 Q92 60 128 64 L150 78 Z", "M170 102 L210 102 L214 116 L176 114 Z"],
    lines: ["M100 92 L300 90", "M240 80 L240 102", "M300 30 L326 30"],
    ground: 150,
  },
  gun: {
    // a towed howitzer: the long barrel and its muzzle brake, the recoil cylinders, the shield, the carriage and trails
    body: [
      "M196 84 L28 66 L28 76 L196 98 Z",
      "M16 62 L32 62 L32 80 L16 80 Z",
      "M196 74 L250 74 L262 96 L196 106 Z",
      "M214 70 L232 40 L250 44 L250 98 L214 100 Z",
      "M240 104 L380 140 L374 150 L232 118 Z",
    ],
    dark: ["M150 96 L196 98 L196 108 L150 104 Z"],
    lines: ["M60 72 L190 88", "M200 90 L256 90"],
    wheels: [[226, 128, 28], [226, 128, 12]],
    ground: 158,
  },
  sub: {
    // the long rounded hull, the sail with its planes and masts, the cross of the tail
    body: [
      "M10 104 Q24 78 84 76 L304 76 Q362 80 388 102 Q362 124 304 128 L84 128 Q24 128 10 104 Z",
      "M136 76 L144 38 L204 38 L216 76 Z",
      "M118 52 L144 52 L144 60 L118 60 Z",
      "M352 86 L374 58 L388 58 L380 90 Z",
      "M352 118 L374 146 L388 146 L380 114 Z",
    ],
    dark: ["M160 38 L160 16 L166 16 L166 38 Z", "M182 38 L182 22 L188 22 L188 38 Z"],
    lines: ["M40 100 L360 100", "M84 112 L300 112"],
    ground: 150,
  },
  ship: {
    // a frigate: hull with its raked bow, the bow gun, the bridge and mast, the stack, the hangar
    body: [
      "M8 92 L56 136 L344 136 L392 100 L280 100 L270 92 Z",
      "M118 92 L128 64 L208 64 L216 92 Z",
      "M136 64 L142 46 L190 46 L196 64 Z",
      "M162 46 L166 8 L172 8 L176 46 Z",
      "M232 92 L238 66 L262 66 L268 92 Z",
      "M290 100 L292 78 L340 78 L344 100 Z",
      "M70 92 L76 80 L100 80 L104 92 Z",
    ],
    dark: ["M80 84 L46 76 L46 80 L80 88 Z", "M150 22 L188 22 L188 26 L150 26 Z"],
    lines: ["M40 116 L360 116", "M140 74 L204 74"],
    ground: 146,
  },
};
MODELS.heli = MODELS.jet;
MODELS.spg = MODELS.gun;
MODELS.rocket = MODELS.gun;
MODELS.boat = MODELS.ship;
// the objects of «عدد روز» (props/objects.ts): the same drawing, their own metal
for (const [id, m] of Object.entries(OBJECTS)) MODELS[id] = m;
MODELS.plane = MODELS.jet;
MODELS.uav = MODELS.jet;

const DEPTH = 9;
const STEP = 3.2;

/** One layer of the pressed-out stack: the outline in one flat shade. */
const Layer: React.FC<{ m: Model; fill: string; z: number }> = ({ m, fill, z }) => (
  <svg viewBox="0 0 400 180" width="100%" height="100%" style={{ position: "absolute", inset: 0, transform: `translateZ(${z}px)`, overflow: "visible" }}>
    {[...m.body, ...(m.dark ?? [])].map((d, i) => (
      <path key={i} d={d} fill={fill} />
    ))}
    {(m.wheels ?? []).map(([x, y, r], i) => (
      <circle key={`w${i}`} cx={x} cy={y} r={r} fill={fill} />
    ))}
  </svg>
);

/**
 * The model at a frame: `turn` is its own slow turn (degrees, a few either
 * way), `mirror` faces it the other way (the second of two that face each
 * other). The face is lit from the lamp above and to the left; the back
 * layers go darker; a soft shadow lies under it on the cloth.
 */
export const Model3D: React.FC<{ id: string; w: number; h: number; frame: number; mirror?: boolean; glow?: number }> = ({ id, w, h, frame, mirror, glow = 0 }) => {
  const m = MODELS[id] ?? MODELS.tank;
  const k = `m-${id}`;
  // a slow turn on its own axis, a little tilt toward the viewer: always moving, never spinning
  const yaw = -24 + 9 * Math.sin(frame / 34);
  const pitch = 14 + 2 * Math.sin(frame / 47);
  return (
    <div style={{ position: "absolute", inset: 0, transform: mirror ? "scaleX(-1)" : undefined }}>
      {/* the shadow on the cloth, flat under the model */}
      <div style={{ position: "absolute", left: "8%", right: "8%", top: `${(m.ground / 180) * 100 - 6}%`, height: "16%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.55), rgba(0,0,0,0))", filter: "blur(4px)" }} />
      <div style={{ position: "absolute", inset: 0, perspective: 1400 }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateX(${pitch}deg) rotateY(${yaw}deg)` }}>
          {Array.from({ length: DEPTH }, (_, i) => (
            <Layer key={i} m={m} z={-(DEPTH - i) * STEP} fill={`hsl(${m.hue ?? 158}, ${m.hue == null ? 12 : 22}%, ${8 + i * 1.6}%)`} />
          ))}
          {/* the face: gunmetal under the lamp, brass details */}
          <svg viewBox="0 0 400 180" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs>
              <linearGradient id={`${k}-metal`} x1="0" y1="0" x2="0.25" y2="1">
                <stop offset="0" stopColor={m.metal?.[0] ?? "#c8cdc4"} />
                <stop offset="0.18" stopColor={m.metal?.[1] ?? "#8f9a92"} />
                <stop offset="0.55" stopColor={m.metal?.[2] ?? "#4d5a53"} />
                <stop offset="1" stopColor={m.metal?.[3] ?? "#26302c"} />
              </linearGradient>
              <linearGradient id={`${k}-sheen`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset={`${0.35 + 0.25 * Math.sin(frame / 34)}`} stopColor="#fff6dc" stopOpacity="0.32" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id={`${k}-wheel`} cx="0.38" cy="0.34" r="0.7">
                <stop offset="0" stopColor="#b9b29c" />
                <stop offset="0.6" stopColor="#4a4636" />
                <stop offset="1" stopColor="#1c1a14" />
              </radialGradient>
            </defs>
            {m.body.map((d, i) => (
              <path key={i} d={d} fill={`url(#${k}-metal)`} stroke="#ead08f" strokeOpacity={0.35 + glow * 0.5} strokeWidth="1.4" />
            ))}
            {(m.dark ?? []).map((d, i) => (
              <path key={`d${i}`} d={d} fill="#1d2622" stroke="#c9a45c" strokeOpacity="0.45" strokeWidth="1.2" />
            ))}
            {m.body.map((d, i) => (
              <path key={`s${i}`} d={d} fill={`url(#${k}-sheen)`} />
            ))}
            {(m.brass ?? []).map((d, i) => (
              <path key={`b${i}`} d={d} fill="#d9b869" stroke="#7c5f2a" strokeWidth="1.2" />
            ))}
            {(m.lines ?? []).map((d, i) => (
              <path key={`l${i}`} d={d} fill="none" stroke="#10171a" strokeOpacity="0.55" strokeWidth="1.6" />
            ))}
            {(m.wheels ?? []).map(([x, y, r], i) => (
              <g key={`w${i}`}>
                <circle cx={x} cy={y} r={r} fill={`url(#${k}-wheel)`} stroke="#c9a45c" strokeOpacity="0.5" strokeWidth="1.2" />
                <circle cx={x} cy={y} r={r * 0.35} fill="#2a2a22" />
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
