// A project's look on the map: the ground, the actors' colours, the type. The engine draws nothing in a colour of
// its own; every project hands its theme in (Divan's is DIVAN below; Bidar and Manshur write theirs the same way).
export type Theme = {
  /** the room behind the globe */
  sky: string;
  skyGlow: string;
  sea: string;
  seaLight: string;
  land: string;
  landEdge: string;
  border: string;
  graticule: string;
  /** small place names */
  label: string;
  /** labels that matter, callouts */
  ink: string;
  halo: string;
  /** the project's own mark (pins, measures, the comets' heads) */
  accent: string;
  /** actors: a colour per role; a map video uses these and never the roads' colours (map-engine-fa.md §5) */
  actors: Record<Role, string>;
  font: string;
};
export type Role = "iran" | "us" | "russia" | "china" | "gulf" | "europe" | "other" | "red";

/**
 * Divan: the navy situation room, amber for Iran and Divan's own marks (bible v3). Round 2 (21 Nov 2026, the judge:
 * «the map must be darker, only Iran in amber»): a night map. The sea is near-navy, the land one step lighter, the
 * borders a hairline; every other state stays this dark unless a beat fills it, and then only as a tint (Reel.tsx).
 */
export const DIVAN: Theme = {
  sky: "#18233a",
  skyGlow: "#24375a",
  sea: "#121f35",
  seaLight: "#182a45",
  land: "#2a3649",
  landEdge: "#56698a",
  border: "#43546e",
  graticule: "#17263f",
  label: "#a3afbd",
  ink: "#f3efe6",
  halo: "#0b111d",
  accent: "#ffb020",
  actors: {
    iran: "#ffb020",
    us: "#3d8fe0",
    russia: "#6fa57a",
    china: "#c8564c",
    gulf: "#7fa3cf",
    europe: "#4f6fb8",
    other: "#7d8b9c",
    red: "#ff4d40",
  },
  font: "Vazirmatn",
};

/** The role a state plays by default on Divan's maps. */
export const ROLE_OF: Record<string, Role> = {
  IRN: "iran",
  USA: "us",
  GBR: "us",
  ISR: "us",
  RUS: "russia",
  BLR: "russia",
  CHN: "china",
  PRK: "china",
  SAU: "gulf",
  ARE: "gulf",
  QAT: "gulf",
  BHR: "gulf",
  KWT: "gulf",
  OMN: "gulf",
};
export const roleOf = (a3: string): Role => ROLE_OF[a3] ?? "other";
