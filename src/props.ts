import type { Hold, VoiceIn, VoiceOut } from "./voice";
// What the site hands the renderer for one Reel. Types only: the site builds
// these objects from its own data (lib/social/formats.ts) and every composition
// draws nothing that is not in them.

export type Tone = "good" | "bad" | "both" | "none";

/** One of Divan's three goals for one decision: the band around today, in the site's own words. */
export type GoalView = { id: string; name: string; band: [number, number]; verdict: string; tone: Tone };

/** The opening of a Reel: its strongest figure (optional) and a question, readable from the first frame. */
export type HookView = { text: string; figure: string | null };

export type Base = {
  /** the composition that draws it */
  format: string;
  /** the line under the name on every frame, for example «دوراهی‌های ایران» */
  series: string;
  /** file name of the score inside the bundle's public folder; set by the renderer */
  music?: string;
  /** the first seconds (Hook.tsx); always sent, null for none, so a sample's hook never takes its place */
  hook: HookView | null;
  /** where this Reel stands in its series, and the next one's name (formats.ts, numbered) */
  part?: { n: number; of: number; next: string | null };
  /** the narrator's lines as the renderer hands them in (worker.mjs): a file in the public folder, its moment, its length in frames */
  voiceIn?: VoiceIn[];
  /** set by the composition's metadata (voice.ts), not by the site: each line placed, the holds, how long the hook stays */
  voice?: VoiceOut[];
  holds?: Hold[];
  hookLen?: number;
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

/** The line drawings of the weapons block, by the kind of piece. */
export type ArmIcon = "jet" | "tank" | "heli" | "uav" | "plane" | "spg" | "gun" | "rocket" | "sub" | "ship" | "boat";

/** «جنگ‌افزار»: one kind of weapon, how many each state has, and what Iran has of it. */
export type ArsenalProps = Base & {
  format: "arsenal";
  /** «نیروی هوایی» */
  force: string;
  /** «جنگنده و هواپیمای تهاجمی» */
  arm: string;
  /** one line: what is counted */
  what: string;
  icon: ArmIcon;
  /** all the states together: «۲٬۲۱۱» and «فروند در ۹ کشور» */
  sum: number;
  sumText: string;
  sumLabel: string;
  /** the states with a table, largest first */
  rows: { name: string; total: number; totalText: string; approx: boolean; stored: string | null; share: number; home: boolean }[];
  /** Iran in this kind: «ایران: …», «رتبهٔ ۳ از ۹», its share of the sum (0–100) */
  home: { line: string; rank: string; share: number; shareText: string } | null;
  /** Iran's largest models of this kind (at most five) */
  models: { name: string; countText: string; origin: string; share: number }[];
  /** the states that are not in the list, and why, in one line */
  absent: string | null;
  /** why Iran's table of this force is read but not shown, when it is held back */
  held: string | null;
  /** «جدول‌های ویکی‌پدیای انگلیسی (CC BY-SA 4.0)، خوانده‌شده در …» */
  source: string;
  foot: string;
};

/** «دلار در بازار آزاد»: the free-market dollar on the days the site read a source, as one line. */
export type DollarProps = Base & {
  format: "dollar";
  question: string;
  /** the last figure, in toman, and its date */
  last: number;
  lastText: string;
  lastDate: string;
  /** the first figure and its date */
  firstText: string;
  firstDate: string;
  /** the plain change from the first figure to the last, for example «۲٫۸ برابر» */
  times: string;
  /** every point: x and y in percent of the plot (x from the first day, y from the top) */
  points: { x: number; y: number; dateText: string; value: string; approx: boolean; event: string | null }[];
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  /** «تومان» */
  unit: string;
  /** the outlets the points come from */
  sources: string;
  foot: string;
};

/** «پروندهٔ هسته‌ای»: the declared facilities on the map, or the enriched uranium on the ladder. */
export type NuclearProps = Base & {
  format: "nuclear";
  view: "sites" | "stock" | "place";
  kicker: string;
  question: string;
  /** sites: one dot per place, with how many facilities stand there in each state */
  places: { name: string; lon: number; lat: number; hit: number; whole: number; unknown: number }[];
  /** sites: the counts and their names, in the site's words */
  legend: { hit: string; whole: string; unknown: string; hitN: number; wholeN: number; unknownN: number };
  /** sites: the facilities that were hit, by name */
  hitNames: string[];
  /** stock: the figures of the last estimate */
  stock: { totalText: string; heuText: string; heu: number; level: number; asOf: string; explain: string } | null;
  /** place: one city and its facilities, each with what the agency reports of it (null for the other views; always sent) */
  focus: { name: string; lon: number; lat: number; items: { name: string; status: "hit" | "whole" | "unknown"; label: string; note: string }[] } | null;
  /** one line each: the last inspection, the Board's last resolution */
  notes: string[];
  source: string;
  foot: string;
};

/** «عدد روز»: one figure of the site, with what it means, its date and its source. */
export type FigureProps = Base & {
  format: "figure";
  /** the section the figure belongs to: «اقتصاد» */
  section: string;
  label: string;
  /** the figure itself, for the count, and as the site writes it */
  value: number;
  decimals: number;
  valueText: string;
  unit: string;
  /** percent figures get a ring: how many full turns and how far into the last */
  percent: number | null;
  explain: string;
  when: string;
  source: string;
  foot: string;
};

/** «حدس بزن»: a question on a ranking of the site, four answers, a count of three, the answer, and the whole ranking. */
export type QuizProps = Base & {
  format: "quiz";
  /** «حدس بزن · جنگ‌افزار» */
  kicker: string;
  question: string;
  /** four answers; \`answer\` is the right one's place among them */
  options: string[];
  answer: number;
  /** the answer in a sentence, for example «ایران: حدود ۱٬۵۱۳ دستگاه، رتبهٔ ۴ از ۹» */
  reveal: string;
  /** the whole ranking, largest first */
  rows: { name: string; text: string; share: number; home: boolean }[];
  source: string;
  foot: string;
};

/** A place of Iran among the states of the region: «راکت‌انداز», «حدود ۱٬۴۷۶ دستگاه», 1 of 9. */
export type PowerRow = { label: string; value: string; rank: number; of: number; note: string | null };

/**
 * «قدرت ایران»: Iran's missiles, drones and air defence by name, and its first
 * places in the region. Since 29 October 2026 one part a Reel: a part's props
 * carry its own scenes and the others are null (the place has two, land and beyond).
 */
export type PowerProps = Base & {
  format: "power";
  /** the ballistic missiles whose range two sources give, longest first; `claim` is Iran's own word about one of them */
  missiles: { kicker: string; title: string; sub: string | null; items: { name: string; km: number; claim: string | null }[]; unranged: string | null; max: number; ticks: { km: number; label: string }[] } | null;
  /** how many models the list names, and the known ones with what they do */
  drones: { kicker: string; title: string; sub: string | null; models: number; items: { name: string; role: string }[] } | null;
  /** the systems by layer, the longest range first */
  air: { kicker: string; title: string; sub: string | null; layers: { name: string; items: string[] }[] } | null;
  land: { kicker: string; title: string; sub: string | null; rows: PowerRow[] } | null;
  beyond: { kicker: string; title: string; sub: string | null; rows: PowerRow[] } | null;
  outro: { name: string; words: string[]; call: string; handle: string };
  source: string;
};

/** One card of a post of several pictures (a carousel), 1080 by 1350. */
export type CardView =
  | { kind: "hook"; kicker: string; figure: string | null; title: string; sub: string | null }
  | { kind: "bars"; title: string; rows: { name: string; text: string; share: number; home: boolean }[]; note: string | null }
  | { kind: "list"; title: string; items: { k: string; v: string; s: string | null }[]; note: string | null }
  | { kind: "figure"; label: string; value: string; unit: string; explain: string; when: string; source: string }
  | { kind: "end"; title: string; lines: string[]; cta: string };

/** A post of several pictures: cards drawn one per frame, in the colour of the series they come from. */
export type CardsProps = Base & {
  format: "cards";
  /** the series whose colour and emblem the cards wear */
  of: string;
  cards: CardView[];
};

/** How a value of the two new formats is written: the units of the site's series (lib/people.ts, data/region-series.json). */
export type SeriesUnit = "people" | "births" | "years" | "percent" | "index" | "usd" | "usdbn" | "count" | "m3" | "tonnes" | "kg" | "kwh" | "tco2" | "per100" | "per100k" | "per1k_births" | "per100k_births" | "ugm3";

/** «اون موقع، الان»: one of Iran's series from the World Bank, its first year against its latest, on paper. */
export type ThenNowProps = Base & {
  format: "thennow";
  /** «اون موقع، الان · مردم» */
  kicker: string;
  /** «جمعیت ایران» */
  label: string;
  /** the opening question, «سال ۱۹۶۰ ایران چند نفر جمعیت داشت؟» */
  question: string;
  unit: SeriesUnit;
  /** the two ends: the year in Persian digits, the value as the World Bank gives it, and as the site writes it */
  from: { year: string; value: number; text: string };
  to: { year: string; value: number; text: string };
  /** every year's value between, oldest first, for the line */
  line: number[];
  /** what changed, in a few words: «۴٫۲ برابر», «۳۴ سال بیشتر» */
  change: string;
  /** what the series measures, the site's own sentence */
  explain: string;
  source: string;
  foot: string;
};

/** «مسابقهٔ کشورها»: the nine states of the region year by year, as a race of bars. */
export type RaceProps = Base & {
  format: "race";
  kicker: string;
  /** «جمعیت» */
  title: string;
  question: string;
  unit: SeriesUnit;
  /** the years of the race, oldest first */
  years: number[];
  /** each state, its value in each of those years (null before the World Bank has one) */
  rows: { name: string; home: boolean; values: (number | null)[] }[];
  /** the end in one line: «ایران: ۱۹۶۰ سوم، امروز دوم» */
  end: string;
  source: string;
  foot: string;
};

/** One row of «دههٔ تو»: an indicator in the year a generation was born, and its latest value. */
export type DecadeRow = {
  /** the World Bank's code, «SP.POP.TOTL» (the narrator says each row in its own words) */
  code: string;
  /** the site's name of the series, «جمعیت» */
  label: string;
  unit: SeriesUnit;
  /** the value in the year of birth, as the World Bank gives it and as the site writes it */
  then: { value: number; text: string };
  /** the latest value, and its year in the solar calendar in Persian digits («۱۴۰۴») */
  now: { value: number; text: string; year: string };
  /** what changed, in a few words: «۱٫۸ برابر», «۱۵٫۷ سال بیشتر» */
  change: string;
};

/** «دههٔ تو»: the Iran a generation was born into, against today; the old half sepia, the new half the night. */
export type DecadeProps = Base & {
  format: "decade";
  /** «دههٔ تو» */
  kicker: string;
  /** the generation as Iranians name it, «دهه‌شصتی‌ها» */
  name: string;
  /** «وقتی به دنیا آمدید، ایران چه شکلی بود؟» */
  question: string;
  /** the year read, in the solar calendar and the Gregorian one, Persian digits: «۱۳۶۵», «۱۹۸۶» */
  year: string;
  gregorian: string;
  /** «میانهٔ دههٔ شصت» */
  note: string;
  /** the other column: «امروز», and a line on what it is */
  today: string;
  todayNote: string;
  /** three or four rows: only indicators with a value in that very year */
  rows: DecadeRow[];
  /** «برای یک دهه‌شصتی بفرست» */
  send: string;
  source: string;
  foot: string;
};

/** One figure of «پنج عدد». */
export type FiveCard = {
  /** its place in the countdown: 5 … 1 */
  n: number;
  /** the series' own name: «تنش آبی» */
  label: string;
  /** the figure as the site writes it («۱٬۴۳۵ مترمکعب»), and its two parts: the number the board flips to («۱٬۴۳۵», «۸۱٫۳٪») and the unit under it */
  text: string;
  num: string;
  unit: string;
  /** the year of the figure, in Persian digits */
  year: string;
  /** what the series measures, in the site's own sentence */
  means: string;
  /** the first year beside the latest, where it says as much: its year, its figure as the site writes it, and both values for two bars */
  then: { year: string; text: string; value: number; now: number } | null;
  /** the narrator's sentence on this figure, with digits (lib/social/voice.ts writes them out) */
  say: string;
};

/** «پنج عدد»: five of Iran's World Bank series on one theme, counted down from five to one (a countdown, not a ranking). */
export type FiveProps = Base & {
  format: "five";
  /** «پنج عدد · آب و کشاورزی» */
  kicker: string;
  /** «آب و کشاورزی ایران» */
  theme: string;
  /** the five in the order they are counted, «۵» first */
  cards: FiveCard[];
  /** the closing question: «کدامش غافلگیرت کرد؟ شماره‌اش را بنویس» */
  ask: string;
  source: string;
  foot: string;
};

/** One figure of a round of «درست یا غلط»: the country, its value as the source gives it, as the card writes it, and as the narrator says it (short). */
export type TrueFalseFigure = { name: string; value: number; text: string; said: string };

/** One round of «درست یا غلط»: a sentence about Iran and one neighbour, and what the figures say of it. */
export type TrueFalseRound = {
  /** what is compared: «پژوهشگران در هر میلیون نفر» */
  topic: string;
  /** the same in a word or two, for the score at the end: «پژوهشگران» */
  short: string;
  /** «جمعیت ایران از ترکیه بیشتر است.» */
  sentence: string;
  /** the sentence says Iran has more, or less */
  claim: "more" | "less";
  /** whether the sentence is true: computed from the two figures, never chosen */
  truth: boolean;
  /** the one year both figures are for, in Persian digits */
  year: string;
  /** Iran, then the neighbour */
  a: TrueFalseFigure;
  b: TrueFalseFigure;
  /** the unit as the narrator says it after the two figures: «نفر» */
  unit: string;
  /** where the two figures come from, in a few words */
  source: string;
};

/** «درست یا غلط»: three sentences about Iran among the nine states, each with a count of three, a stamp and the two figures. */
export type TrueFalseProps = Base & {
  format: "truefalse";
  /** «درست یا غلط؟» */
  kicker: string;
  /** the opening line, said by the narrator: «سه جمله دربارهٔ ایران و همسایه‌ها. درست یا غلط؟» */
  question: string;
  rounds: TrueFalseRound[];
  /** the question back to the viewer at the end: «چند تا را درست گفتی؟» and how to answer */
  ask: string;
  answer: string;
  source: string;
  foot: string;
};

export type ReelProps = DilemmaProps | SeatProps | RegionProps | PrecedentProps | TalksProps | WarProps | BordersProps | ArsenalProps | DollarProps | NuclearProps | FigureProps | QuizProps | PowerProps | ThenNowProps | RaceProps | DecadeProps | CardsProps | StoryProps | FiveProps | TrueFalseProps;

/** The still picture a Reel shows on the profile grid. */
export type CoverProps = {
  format: string;
  series: string;
  kicker: string;
  title: string;
  /** one short figure or word that carries the tile, optional */
  mark?: string;
};
