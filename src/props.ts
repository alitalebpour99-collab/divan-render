// What the site hands the renderer for one Reel. Types only: the site builds
// these objects from its own data (lib/social/formats.ts) and every composition
// draws nothing that is not in them.

export type Tone = "good" | "bad" | "both" | "none";

/** One of Divan's three goals for one decision: the band around today, in the site's own words. */
export type GoalView = { id: string; name: string; band: [number, number]; verdict: string; tone: Tone };

export type Base = {
  /** the composition that draws it */
  format: string;
  /** the line under the name on every frame, for example «دوراهی‌های ایران» */
  series: string;
  /** file name of the score inside the bundle's public folder; set by the renderer */
  music?: string;
};

export type DilemmaProps = Base & {
  format: "dilemma";
  /** «دوراهی امروز · روز ۲۲۴ جنگ» */
  kicker: string;
  question: string;
  /** «چه شد؟»: what is reported, each row with the name of its source */
  facts: { k: string; v: string; s: string }[];
  /** short counters under the facts, for example «۹ روز از رد طرح» */
  chips: string[];
  options: { title: string; line: string; gained: string; lost: string; goals: GoalView[] }[];
  /** index of the road Divan picks */
  pick: number;
  why: string;
  /** the five advisors and where each stands; empty for a dilemma without a table */
  advisors: { name: string; stance: "for" | "cond" | "against" }[];
  foot: string;
};

export type SeatProps = Base & {
  format: "seat";
  office: string;
  group: string;
  /** id of the line emblem (src/emblems.tsx) */
  emblem: string;
  /** the question on this office's desk */
  desk: string;
  decision: string;
  steps: string[];
  good: string[];
  bad: string[];
  ifs: { if: string; then: string; tone: "good" | "bad" | "open" }[];
  goals: GoalView[];
  /** what would turn the decision around */
  flip: string;
  foot: string;
};

export type RegionRowProps = {
  name: string;
  /** place among the countries, in Persian digits */
  pos: string;
  /** the figure, split around its number so the number can count up */
  pre: string;
  num: string;
  post: string;
  to: number;
  decimals: number;
  year: string;
  /** 0–1 of the longest bar */
  share: number;
  home: boolean;
};

export type RegionProps = Base & {
  format: "region";
  title: string;
  means: string;
  /** «ایران: رتبهٔ ۶ از ۸» */
  rank: string;
  rankPos: number;
  rankOf: number;
  rows: RegionRowProps[];
  /** countries without a value, in one line */
  missing: string | null;
  source: string;
  /** set for a series shown under its source's own terms */
  terms: string | null;
  foot: string;
};

export type PrecedentProps = Base & {
  format: "precedent";
  /** the year on the folder tab, both calendars */
  year: string;
  title: string;
  when: string;
  place: string;
  decision: string;
  aftermath: string;
  /** host names of the sources */
  sources: string[];
  /** the site's own caveat: the card tells what was decided and what followed, it does not compare with today */
  note: string;
  foot: string;
};

export type TalkResult = "deal" | "step" | "open" | "none" | "pending";

export type TalksProps = Base & {
  format: "talks";
  /** counted rounds since 2003 */
  total: number;
  since: string;
  periods: { title: string; years: string; count: number }[];
  /** the rounds of the last two years, oldest first */
  recent: { date: string; place: string; mediator: string | null; result: TalkResult; resultName: string; outcome: string }[];
  tally: { result: TalkResult; name: string; n: number }[];
  /** the site's caveat on the count: it is a floor, not a final number */
  floor: string;
  /** the site's caveat on the results: they are Divan's reading of what the sources wrote */
  note: string;
  asOf: string;
  foot: string;
};

/** One recorded event: its day of the war, its place at city level (longitude, latitude), how sure it is, and whether it is inside Iran. */
export type WarEventProps = { d: number; c: [number, number] | null; t: "confirmed" | "claim" | "unverified"; i: boolean };

export type WarProps = Base & {
  format: "war";
  warStart: string;
  /** the day the list of events was last brought up to date */
  warAsOf: string;
  /** the day of the war the replay runs to */
  warDay: number;
  events: WarEventProps[];
  milestones: { date: string; day: number; fa: string }[];
  counts: { total: number; confirmed: number; claim: number; unverified: number; located: number };
  foot: string;
};

export type BordersProps = Base & {
  format: "borders";
  today: string;
  foot: string;
};

/** The Story that follows a Reel onto the page: the Reel's own tile, in motion, and where to see the Reel. */
export type StoryProps = Base & {
  format: "story";
  /** the series of the Reel it announces: its colour and its emblem */
  of: string;
  kicker: string;
  title: string;
  mark?: string;
  /** the Reel carries model-written analysis: the Story says so too */
  ai: boolean;
  /** «@divan.ahura» */
  handle: string;
};

export type ReelProps = DilemmaProps | SeatProps | RegionProps | PrecedentProps | TalksProps | WarProps | BordersProps | StoryProps;

/** The still picture a Reel shows on the profile grid. */
export type CoverProps = {
  format: string;
  series: string;
  kicker: string;
  title: string;
  /** one short figure or word that carries the tile, optional */
  mark?: string;
};
