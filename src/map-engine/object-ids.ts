// The things that stand on the map (owner, 21 Nov 2026: «آبجکت‌های خاص همون موضوع»): a tanker in the strait, a
// missile on its arc, a drone, a rig, a parliament, a stack of money. Each one is a real, recognisable object drawn
// by code (objects.tsx), never an abstract circle or square. Pure: the site, the tests and the renderer read it.
export type MapObjectId =
  | "tanker"
  | "cargo"
  | "lng"
  | "warship"
  | "boats"
  | "mine"
  | "missile"
  | "drone"
  | "jet"
  | "rig"
  | "refinery"
  | "pipeline"
  | "barrel"
  | "nuclear"
  | "tank"
  | "troops"
  | "parliament"
  | "money"
  | "treaty"
  | "padlock";

/**
 * How an object lives on the map. stand: it lands on its point and keeps a small motion of its own (a flame, steam, a
 * flag). sail: a ship along its path, its wake behind it. fly: an aircraft or a drone along its path, its shadow under
 * it. orbit: an aircraft circling its point. arc: a missile from the path's first point to its last, a burst where it
 * lands. drop: a missile coming down onto its point from the sky (no launch site is drawn: none is claimed). pipe: a
 * pipeline laid along its path with the flow running in it.
 */
export type ObjectMove = "stand" | "sail" | "fly" | "orbit" | "arc" | "drop" | "pipe";

export type ObjectMeta = { id: MapObjectId; en: string; fa: string; depicts: string; moves: ObjectMove[]; tags: string[] };

export const MAP_OBJECTS: ObjectMeta[] = [
  { id: "tanker", en: "oil tanker", fa: "نفتکش", depicts: "a crude tanker in side view: long low hull with its red boot-top, deck pipes and manifold, the bridge and funnel aft", moves: ["sail", "stand"], tags: ["shipping", "oil", "strait", "hormuz"] },
  { id: "cargo", en: "container ship", fa: "کشتی باری", depicts: "a container ship in side view, stacks of coloured boxes, the bridge aft", moves: ["sail", "stand"], tags: ["shipping", "trade", "red sea"] },
  { id: "lng", en: "LNG carrier", fa: "کشتی گاز مایع", depicts: "a gas carrier in side view with four round tanks on deck", moves: ["sail", "stand"], tags: ["gas", "qatar", "shipping"] },
  { id: "warship", en: "warship", fa: "ناو جنگی", depicts: "a grey destroyer in side view: sharp bow, gun forward, stepped superstructure, radar mast, ensign aft", moves: ["sail", "stand"], tags: ["navy", "escort", "military"] },
  { id: "boats", en: "fast attack boats", fa: "قایق‌های تندرو", depicts: "three small fast boats in a staggered line, each with its white wake", moves: ["sail", "stand"], tags: ["navy", "irgc", "strait"] },
  { id: "mine", en: "naval mine", fa: "مین دریایی", depicts: "a horned contact mine half under the water, bobbing, its mooring chain below", moves: ["stand"], tags: ["navy", "strait", "incident"] },
  { id: "missile", en: "missile", fa: "موشک", depicts: "a missile in side view, ogive nose, fins and a burning motor, with its smoke trail", moves: ["arc", "drop"], tags: ["strike", "military"] },
  { id: "drone", en: "drone", fa: "پهپاد", depicts: "a delta-wing one-way drone seen from above, winglets and the pusher propeller turning", moves: ["fly", "orbit"], tags: ["strike", "military"] },
  { id: "jet", en: "fighter jet", fa: "جنگنده", depicts: "a fighter seen from above, swept wings, tailplanes and twin fins, its shadow on the ground", moves: ["fly", "orbit"], tags: ["air force", "airstrike", "bases"] },
  { id: "rig", en: "offshore oil rig", fa: "سکوی نفتی", depicts: "an offshore platform: legs in the sea, the deck, the derrick, a crane and a flare burning on its boom", moves: ["stand"], tags: ["oil", "gas", "field"] },
  { id: "refinery", en: "refinery", fa: "پالایشگاه", depicts: "a refinery: storage tanks, a distillation tower, pipes and a flare stack burning", moves: ["stand"], tags: ["oil", "industry", "fuel"] },
  { id: "pipeline", en: "pipeline", fa: "خط لوله", depicts: "a steel pipeline on its supports with flanges and a valve wheel; along a path, the pipe laid on the map with the flow running", moves: ["stand", "pipe"], tags: ["oil", "gas", "export"] },
  { id: "barrel", en: "oil barrel", fa: "بشکهٔ نفت", depicts: "a steel oil drum with its ribs and a drop of crude on it", moves: ["stand"], tags: ["oil", "price", "export"] },
  { id: "nuclear", en: "nuclear site", fa: "تأسیسات هسته‌ای", depicts: "a nuclear site at city level: a domed reactor hall and a cooling tower with steam rising", moves: ["stand"], tags: ["nuclear", "iaea", "enrichment"] },
  { id: "tank", en: "battle tank", fa: "تانک", depicts: "a main battle tank in side view: tracks and road wheels, hull, turret and long gun", moves: ["stand"], tags: ["army", "front", "military"] },
  { id: "troops", en: "troops", fa: "نیروهای نظامی", depicts: "three soldiers in helmets with rifles, in a staggered file", moves: ["stand"], tags: ["army", "deployment", "front"] },
  { id: "parliament", en: "parliament building", fa: "ساختمان مجلس", depicts: "a parliament: steps, six columns, a pediment and a dome with the state's flag waving on it", moves: ["stand"], tags: ["politics", "vote", "law"] },
  { id: "money", en: "money", fa: "پول", depicts: "a stack of banknotes with the currency's sign and a pile of coins beside it", moves: ["stand"], tags: ["economy", "currency", "inflation"] },
  { id: "treaty", en: "signed agreement", fa: "توافق‌نامه", depicts: "a signed document with its ruled lines, a wax seal and a pen across it", moves: ["stand"], tags: ["diplomacy", "talks", "deal"] },
  { id: "padlock", en: "padlock (sanctions)", fa: "قفل تحریم", depicts: "a heavy padlock, shackle closed, a keyhole in its face", moves: ["stand"], tags: ["sanctions", "economy"] },
];

export const OBJECT_IDS = MAP_OBJECTS.map((o) => o.id);
export const isShip = (id: MapObjectId) => id === "tanker" || id === "cargo" || id === "lng" || id === "warship" || id === "boats";
export const isAircraft = (id: MapObjectId) => id === "jet" || id === "drone";
