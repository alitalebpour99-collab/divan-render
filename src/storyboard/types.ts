// The storyboard of a Divan Reel (storyboard-fa.md §2), and the content it is made from. Pure types: the site's
// writer (lib/agents) and the renderer share them. One style for every template: the navy room of «تصمیم امروز».
import type { Look } from "../map-engine/camera";

export type TemplateId =
  | "today"
  | "advisor"
  | "scenarios"
  | "number"
  | "council"
  | "week"
  | "dilemma"
  | "table3"
  | "redline"
  | "strait"
  | "fronts"
  | "bases";

export type HookType = "question" | "odd-number" | "wrong-belief" | "object-close-up" | "before-after" | "countdown";
export type EndingType = "loop-to-hook" | "one-word-question" | "callback";

/** One of the three ideas the concept writer offers for a video (storyboard-fa.md §3). */
export type Concept = {
  one_line: string;
  idea_family: string;
  hook: { type: HookType; text: string };
  anchor: { asset: string; regions: string[] };
  beats: string[];
  twist_at_beat: number;
  ending: { type: EndingType; line: string };
  new_because: string[];
  /** the objects the roads or beats show (for the novelty rules) */
  objects?: string[];
};

/** What a published video leaves behind, for the novelty rules (storyboard-fa.md §4). */
export type Fingerprint = {
  id: string;
  day: string;
  template: TemplateId;
  idea_family: string;
  hook_type: HookType;
  ending_type: EndingType;
  anchor_asset: string;
  /** the map region of the hook (Divan: not again within 5 days) */
  hook_region?: string;
  objects: string[];
  opening_shot: { layer: string; camera: string };
  words?: string[];
};

export type ObjectId = "barrel" | "tanker" | "banknote" | "treaty" | "table" | "shield" | "mine" | "pipeline" | "container" | "megaphone" | "scale" | "factory";

export type ChartSpec = { title: string; unit: string; points: number[]; first: string; last: string; source: string; digits?: number };

/** A mark on the map: what appears, where, in whose colour. Coordinates are [lon, lat]. */
export type Mark =
  | { kind: "fill"; a3: string; color: string; /** breathes while it is the beat's subject (the renderer sets it) */ pulse?: boolean }
  | { kind: "hatch"; a3?: string; polygon?: [number, number][]; color: string }
  | { kind: "claim"; coords: [number, number][]; color: string }
  | { kind: "dashed"; coords: [number, number][]; color: string }
  | { kind: "comet"; coords: [number, number][]; color: string; loop?: boolean }
  | { kind: "pins"; points: { lon: number; lat: number }[]; color: string; counter?: string }
  | { kind: "callout"; lon: number; lat: number; bold: string; sub?: string; color?: string; /** whose claim: its flag beside the words */ a3?: string }
  | { kind: "measure"; a: [number, number]; b: [number, number] }
  | { kind: "label"; t: string; lon: number; lat: number }
  | { kind: "flag"; a3: string; lon: number; lat: number };

export type Road = { key: string; color: string; title: string; cost: string; source: string; object: ObjectId; risk?: number | null };

/** A beat: one narrator line and what shows it. The director cuts every beat into shots of 1 to 2 seconds. */
export type Beat =
  | { kind: "hook"; cue: string; say?: string; look: Look; title: string; sub?: string; marks?: Mark[]; region?: string; /** where the first frame looks from: the globe (a dive), across (a pan) or very close; the concept sets it */ from?: Look; opening?: string }
  | { kind: "map"; cue: string; say?: string; look: Look; marks: Mark[]; caption?: string; source?: string; clear?: boolean }
  | { kind: "chart"; cue: string; say?: string; chart: ChartSpec }
  | { kind: "number"; cue: string; say?: string; big: string; unit: string; text: string; source: string }
  | { kind: "flags"; cue: string; say?: string; a3: string[]; title: string }
  | { kind: "demand"; cue: string; say?: string; a3: string; look: Look; wants: string; source: string; marks?: Mark[] }
  | { kind: "road"; cue: string; say?: string; road: Road; /** the road drawn on the live map in its own colour (analysis): where the camera looks, what it draws */ look?: Look; marks?: Mark[] }
  | { kind: "gauge"; cue: string; say?: string; label: string; ends: [string, string]; roads: Road[] }
  | { kind: "poll"; cue: string; say?: string; q: string; options: { key: string; color: string; title: string }[]; chip: string; site: string };

export type BeatKind = Beat["kind"];

/** Everything a Reel says and shows, as the writer hands it over (props of the composition «decision»). */
export type ReelContent = {
  format: "decision";
  /** the storyboard engine's content (the old «decision» props have none: they are converted, fromDecision.ts) */
  engine: "storyboard";
  template: TemplateId;
  video_id: string;
  kicker: string;
  date: string;
  concept: Concept;
  beats: Beat[];
  /** «roads» (today and its family: red, blue, green) or «actors» (the map templates): never both (map-engine-fa.md §5) */
  convention: "roads" | "actors";
  badge?: string;
  /** a label on the screen: this is Divan's analysis, made with AI */
  ai_label?: string;
};

export type Picture = { layer: "map" | "chart" | "number" | "flags" | "road" | "gauge" | "poll" | "title"; asset: string; beat: number; view?: string };
export type Motion = { camera: "dive" | "pan" | "push" | "push-close" | "hold-breathe" | "pull-out" | "pen" | "none"; look?: Look; /** the first shot only: where the camera starts (the concept's opening) */ from?: Look; object: { id: string; do: string; at_word?: string }[] };
export type ShotText = { header?: string; sub?: string; chips: string[]; source?: string; caption_keyword?: string };
export type Sound = { sfx?: "hit" | "whoosh" | "tick" | "pop" | "rise" | "swish" | "badge"; at_word?: string; music?: string };
export type Transition = "cut" | "push" | "slide" | "pop" | "dive" | "loop";

export type Shot = {
  n: number;
  /** seconds from the Reel's start */
  start: number;
  dur: number;
  beat: number;
  at_word: string | null;
  /** when that word is said, seconds from the Reel's start (null: no narrator on this shot) */
  word_at: number | null;
  picture: Picture;
  motion: Motion;
  text: ShotText;
  sound: Sound;
  transition_out: Transition;
  meaning: string;
  /** the marks this shot brings onto the map, by index into its beat's marks */
  marks: number[];
  /** the view of a beat inside its picture: which of a road's three views, which share of a chart's pen */
  view: number;
};

export type Storyboard = {
  video_id: string;
  project: "divan";
  template: TemplateId;
  idea_family: string;
  concept: Concept;
  fps: number;
  total: number;
  voice: { file: string; from: number; frames: number; cue: string }[];
  words: { text: string; at: number; end: number; cue: string }[];
  shots: Shot[];
  checks: { max_static_s: number; max_words_on_screen: number; max_words_per_shot: number; sync_tolerance_s: number; end_after_last_word_s: number };
};
