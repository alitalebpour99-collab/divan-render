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

/** Divan: the navy situation room, amber for Iran and Divan's own marks (bible v3). */
export const DIVAN: Theme = {
  sky: "#0d1322",
  skyGlow: "#1b2a44",
  sea: "#14233a",
  seaLight: "#1d3352",
  land: "#2a3546",
  landEdge: "#3b4a60",
  border: "#55657c",
  graticule: "#1f3150",
  label: "#a3afbd",
  ink: "#f3efe6",
  halo: "#0d1322",
  accent: "#ffb020",
  actors: {
    iran: "#ffb020",
    us: "#3d8fe0",
    russia: "#6fa57a",
    china: "#c8564c",
    gulf: "#5c7fa8",
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
