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
  view: "sites" | "stock";
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

/** «قدرت ایران»: Iran's missiles, drones and air defence by name, and its first places in the region. */
export type PowerProps = Base & {
  format: "power";
  /** the ballistic missiles whose range two sources give, longest first; `claim` is Iran's own word about one of them */
  missiles: { kicker: string; title: string; sub: string | null; items: { name: string; km: number; claim: string | null }[]; unranged: string | null; max: number; ticks: { km: number; label: string }[] };
  /** how many models the list names, and the known ones with what they do */
  drones: { kicker: string; title: string; sub: string | null; models: number; items: { name: string; role: string }[] };
  /** the systems by layer, the longest range first */
  air: { kicker: string; title: string; sub: string | null; layers: { name: string; items: string[] }[] };
  land: { kicker: string; title: string; sub: string | null; rows: PowerRow[] };
  beyond: { kicker: string; title: string; sub: string | null; rows: PowerRow[] };
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

export type ReelProps = DilemmaProps | SeatProps | RegionProps | PrecedentProps | TalksProps | WarProps | BordersProps | ArsenalProps | DollarProps | NuclearProps | FigureProps | QuizProps | PowerProps | ThenNowProps | RaceProps | CardsProps | StoryProps;

/** The still picture a Reel shows on the profile grid. */
export type CoverProps = {
  format: string;
  series: string;
  kicker: string;
  title: string;
  /** one short figure or word that carries the tile, optional */
  mark?: string;
};
