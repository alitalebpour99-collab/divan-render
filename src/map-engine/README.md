# The map engine («موتور نقشه»)

The shared map engine of Divan, Bidar and Manshur (spec: `ahura-city/ali-list-1112/video-styles-1120/map-engine-fa.md`).
It lives in `divan-render` (the public mirror of `divan/video/`) so another project can copy the folder or install the
repository as a dependency. It has no Divan code in it: the look comes in as a `Theme`.

## What it does

- **Data:** Natural Earth admin-0 countries (public domain) at 1:110m for the globe and 1:50m for every dive
  (`data/world-110m.json`, `data/world-50m.json`, built by `divan/scripts/build-world.mjs`). Each country carries its
  ISO alpha-3 code and Natural Earth's `NAME_FA`; `names.ts` goes before it (short names, «خلیج فارس», «تنگهٔ هرمز»).
- **Camera:** one orthographic projection turned to a look `{lon, lat, span}`; a dive from the globe into a strait is
  van Wijk & Nuij's smooth zoom-and-pan (`camera.ts`, `flight`), and a held look still breathes (no frozen frame).
- **Layers** (`layers.tsx`): `CountryFill` (a disc opening from the centroid, glow inside the edge), `RegionHatch`
  (contested ground is always hatched, never filled), `ClaimLine`, `DashedLine` (dashes pop one by one),
  `CometTrail` (great-circle head and fading tail, additive glow; `loop` for the ambient traffic in `lanes.ts`),
  `PinCluster` + `pinsIn` (for a counter), `MeasureLine` (the length is `km()` of the two points, never typed),
  `Callouts` (one bold word and one line, greedy placement in `labels.ts`, leader from the label's right edge),
  `PlaceLabels` (≥ 40 px on a dark halo), `LaneLine` and `WaterMask` (round 7: a lane, a sea comet or a hatched sea
  area is drawn only on the water, `water.ts`).
- **Ships** (`ships.ts`): one clock per ship over the whole Reel at its type's real speed, rounded lanes, the number of
  ships read from the line.
- **Flags, never faces:** `FlagChip` draws a state's flag flat by code (Iran's is the real 4 : 7 flag with the emblem and
  the 22 takbir, `iran-flag.ts`); a state without art gets a chip with its name only.

## Using it

```tsx
import { MapStage, CountryFill, CometTrail, lookAt, DIVAN } from "./map-engine";

const look = lookAt([{ at: 0, lon: 40, lat: 25, span: 200 }, { at: 45, lon: 56.4, lat: 26.4, span: 3 }], frame);
<MapStage look={look} frame={{ x: 0, y: 420, w: 1080, h: 1100 }} theme={DIVAN} f={frame}>
  <CountryFill a3="IRN" color={DIVAN.actors.iran} t={frame - 30} />
  <CometTrail coords={[[54.8, 26.45], [56.1, 26.62], [57.3, 25.5]]} color="#ffd27a" t={frame} loop={90} />
</MapStage>;
```

Bidar writes a theme for its night museum hall, Manshur one for its cream paper on navy (`theme.ts` shows Divan's).
Rendering is plain SVG: deterministic frame by frame, no WebGL, fine on GitHub Actions.
