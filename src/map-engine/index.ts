// «موتور نقشه»: the shared map engine of Divan, Bidar and Manshur (map-engine-fa.md). Natural Earth data with
// Persian names, d3-geo inside Remotion, one orthographic camera for the globe and every dive, and the layers:
// fills, hatching, claim and dashed lines, glowing comets, pin clusters, measures, labels with leader lines, flag
// chips. No image model, no photo of a person, no cost. See README.md for how another project takes it.
export { MapStage, makeView, useView, type View, type Frame } from "./MapStage";
export { ContextNames, pickNames, placeLabel, CountryFill, RegionHatch, LaneLine, WaterMask, ClaimLine, DashedLine, CometTrail, PinCluster, pinsIn, MeasureLine, Callouts, PlaceLabels, densify, faNum, type CalloutSpec } from "./layers";
export { FlagChip, flagArt, flagAspect } from "./flags";
export { lookAt, flight, scaleOf, easeInOut, easeOut, type Look, type Key } from "./camera";
export { place, clashes, textWidth, type Placed, type Want } from "./labels";
export { country, worldFor, km, nearestGap, EARTH_KM } from "./world";
export { NAMES_FA, PLACES_FA, nameFa } from "./names";
export { LANES, type Lane } from "./lanes";
export { DIVAN, ROLE_OF, roleOf, type Theme, type Role } from "./theme";
export { VAZIR, NASKH } from "./fonts";
export { CAPITALS } from "./capitals";
export { ZONES, zoneOf, type Zone } from "./zones";
