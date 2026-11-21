// The content of a decision Reel («تصمیم امروز» and the formats made from the same day's analysis),
// as the site's writer hands it over (lib/agents/decision.ts). Every word on screen is here.

export type Lab = { t: string; lon: number; lat: number; size?: number };
export type MapSpec = {
  extent: [[number, number], [number, number]];
  labels?: Lab[];
  /** where something happened today: a target mark that keeps pulsing */
  hits?: Lab[];
  /** a path between two places; drawn as a line that flows, never as a launch site */
  arcs?: { from: [number, number]; to: [number, number] }[];
  tankers?: { lon: number; lat: number; fire?: boolean; rot?: number }[];
  /** two tankers side by side (a transfer at sea) */
  pair?: Lab | null;
  source: string;
};
export type ChartSpec = {
  title: string;
  unit: string;
  /** oldest first */
  points: number[];
  /** the date under the oldest and the newest point */
  first: string;
  last: string;
  fromText: string;
  toText: string;
  source: string;
  /** decimals the counter shows */
  digits?: number;
  /** where the figure stands on the map (a PLACES_FA id; oil: hormuz), round 3 */
  place?: string;
};
/** A news wire on the desk: the day's headline as it came in, with who reported it. */
export type WireSpec = { headline: string; outlets: string[]; when: string; source: string };

export type Stage = { kind: "map"; map: MapSpec } | { kind: "chart"; chart: ChartSpec } | { kind: "wire"; wire: WireSpec };

export type RowIcon = "effect" | "evidence" | "who" | "signal" | "say" | "done";
export type Row = { icon: RowIcon; label: string; text: string; sub?: string | null };
export type Card = {
  key: string;
  title: string;
  color: string;
  /** an AI advisor's seal instead of a letter («دو مشاور، یک میز») */
  seal?: string | null;
  rows: Row[];
  /** the effect in at most four words, for the storyboard's road shot beside its object */
  cost?: string | null;
  /** Divan's own estimate on the gauge, 0 calm … 1 war; none when there is no gauge */
  risk?: number | null;
};

export type DecisionVariant = "today" | "advisor" | "scenarios" | "number" | "council" | "week";

export type DecisionProps = {
  format: "decision";
  /** the idea the concept writer chose for this video (lib/agents/concepts.ts); the storyboard follows it */
  concept?: import("../storyboard/types").Concept | null;
  variant: DecisionVariant;
  kicker: string;
  date: string;
  hook: { l1: string; l2: string };
  /** the viewer's seat («اگر من تصمیم‌گیر بودم»), under the hook */
  role?: string | null;
  stage: Stage;
  /** one or two cards of what weighs on the decision, each with its source */
  facts?: { big: string; text: string; source: string }[] | null;
  /** or a chart of the last days in the fact scene (the stage then stays a map or a wire) */
  factChart?: ChartSpec | null;
  cards: Card[];
  gauge?: { label: string; ends: [string, string] } | null;
  ask: { q: string; chip: string; site: string };
  badge?: string;
  /** the narrator's lines, one per moment (start, fact, c1 …, ask): lib/social/voice.ts says them */
  say?: { cue: string; text: string }[];
  // ---- filled by the renderer ----
  voiceIn?: { file: string; cue: string; frames: number }[];
  music?: string;
  scenes?: { cue: string; from: number; len: number }[];
  voice?: { file: string; from: number; frames: number }[];
  drone?: boolean;
  qc?: { id: string; ok: boolean; detail: string; fa: string }[];
};

/** The tile of a decision Reel on the profile grid. */
export type DecisionCoverProps = { format: "decision"; series?: string; kicker: string; title?: string; big: string; colors?: string[] };
