// The things a figure of «عدد روز» is about, as models for the war-room table
// (models.tsx draws them: a side view pressed out into depth, turned a little
// under the lamp, its shadow on the cloth). One real object a figure: an oil
// drum for production, a tanker for loadings, banknotes for prices and the
// budget, a fuel pump, a pylon, a cascade of centrifuges, a shipping crate, a
// missile; an abacus when a figure is about none of them. Generic shapes: no
// brand, no flag, no insignia. Listed in props/manifest.json for Ahura's
// shared asset library.
//
// A sheet is 400 × 180, the ground near y 160. `metal` is the face's gradient
// from the lit edge to the shade, `hue` the colour of the pressed-out layers,
// `brass` parts are drawn in brass over the face.
export type ObjectModel = { body: string[]; dark?: string[]; lines?: string[]; brass?: string[]; wheels?: [number, number, number][]; ground: number; metal?: [string, string, string, string]; hue?: number };

const STEEL_BLUE: ObjectModel["metal"] = ["#c9d6e4", "#7f97b4", "#3f566f", "#1b2838"];
const PAPER_GREEN: ObjectModel["metal"] = ["#e6edd3", "#a9bb93", "#62775a", "#313d2e"];
const WOOD: ObjectModel["metal"] = ["#e3c79c", "#a9824f", "#6a4a26", "#2f1f0e"];
const PALE_STEEL: ObjectModel["metal"] = ["#eef1ee", "#b4bdb8", "#6b7772", "#2f3835"];
const SIGNAL_RED: ObjectModel["metal"] = ["#f0b9a8", "#c8553f", "#7d2a1c", "#32100a"];

export const OBJECTS: Record<string, ObjectModel> = {
  // two oil drums: one in front, one behind and to the right, their ribs and their bungs
  barrel: {
    body: ["M246 44 Q300 34 354 44 L354 152 Q300 162 246 152 Z", "M92 30 Q168 16 244 30 L244 150 Q168 166 92 150 Z"],
    dark: ["M92 30 Q168 44 244 30 Q168 16 92 30 Z", "M246 44 Q300 54 354 44 Q300 34 246 44 Z"],
    lines: ["M92 68 Q168 82 244 68", "M92 110 Q168 124 244 110", "M246 78 Q300 88 354 78", "M246 116 Q300 126 354 116"],
    brass: ["M150 24 Q160 20 170 24 Q160 28 150 24 Z", "M128 84 L208 84 L208 100 L128 100 Z"],
    ground: 162,
    metal: STEEL_BLUE,
    hue: 212,
  },
  // an oil tanker in profile: the long low hull, the bridge aft, the deck's pipes and its mast
  tanker: {
    body: ["M14 104 L386 104 L360 148 L44 148 Z", "M292 62 L352 62 L352 104 L292 104 Z", "M306 40 L338 40 L338 62 L306 62 Z", "M60 92 L270 92 L270 104 L60 104 Z"],
    dark: ["M40 132 L364 132 L358 148 L46 148 Z", "M300 70 L344 70 L344 80 L300 80 Z"],
    lines: ["M24 116 L378 116", "M90 92 L90 78 L240 78 L240 92", "M150 78 L150 60", "M320 40 L320 22"],
    brass: ["M84 84 L96 84 L96 92 L84 92 Z", "M234 84 L246 84 L246 92 L234 92 Z"],
    ground: 152,
    metal: SIGNAL_RED,
    hue: 8,
  },
  // three bundles of banknotes stacked, each with its paper band
  banknotes: {
    body: ["M62 118 L338 118 L338 152 L62 152 Z", "M80 84 L320 84 L320 116 L80 116 Z", "M100 50 L300 50 L300 82 L100 82 Z"],
    dark: [],
    lines: ["M62 128 L338 128", "M62 140 L338 140", "M80 94 L320 94", "M80 106 L320 106", "M100 60 L300 60", "M100 72 L300 72"],
    brass: ["M176 118 L224 118 L224 152 L176 152 Z", "M178 84 L222 84 L222 116 L178 116 Z", "M180 50 L220 50 L220 82 L180 82 Z"],
    ground: 156,
    metal: PAPER_GREEN,
    hue: 96,
  },
  // a fuel dispenser: its cabinet, its display, the hose and the nozzle in its holster
  pump: {
    body: ["M140 44 L250 44 L250 152 L140 152 Z", "M130 28 L260 28 L260 46 L130 46 Z", "M124 150 L266 150 L266 160 L124 160 Z", "M284 96 L306 96 L306 130 L294 138 L284 130 Z"],
    dark: ["M156 60 L234 60 L234 92 L156 92 Z"],
    lines: ["M250 66 Q304 60 296 96", "M156 106 L234 106", "M156 120 L234 120", "M156 134 L234 134"],
    brass: ["M164 68 L226 68 L226 84 L164 84 Z"],
    ground: 162,
    metal: SIGNAL_RED,
    hue: 8,
  },
  // a lattice power pylon: two legs to a narrow top, three cross-arms with their insulators
  pylon: {
    body: ["M150 160 L190 22 L210 22 L250 160 L234 160 L200 50 L166 160 Z", "M104 46 L296 46 L296 54 L104 54 Z", "M124 78 L276 78 L276 86 L124 86 Z", "M140 110 L260 110 L260 118 L140 118 Z"],
    dark: [],
    lines: ["M172 100 L228 132", "M228 100 L172 132", "M180 62 L220 86", "M220 62 L180 86", "M160 140 L240 160", "M240 140 L160 160"],
    brass: [],
    wheels: [[110, 62, 6], [290, 62, 6], [130, 94, 6], [270, 94, 6], [146, 126, 6], [254, 126, 6]],
    ground: 162,
    metal: PALE_STEEL,
    hue: 180,
  },
  // a cascade of centrifuges: four tall rotors on a base, the pipes joining their heads
  centrifuge: {
    body: ["M76 40 Q96 30 116 40 L116 150 L76 150 Z", "M138 40 Q158 30 178 40 L178 150 L138 150 Z", "M200 40 Q220 30 240 40 L240 150 L200 150 Z", "M262 40 Q282 30 302 40 L302 150 L262 150 Z", "M60 148 L318 148 L318 160 L60 160 Z"],
    dark: ["M76 54 L116 54 L116 62 L76 62 Z", "M138 54 L178 54 L178 62 L138 62 Z", "M200 54 L240 54 L240 62 L200 62 Z", "M262 54 L302 54 L302 62 L262 62 Z"],
    lines: ["M96 32 L96 18 L282 18 L282 32", "M158 32 L158 18", "M220 32 L220 18", "M76 104 L116 104", "M138 104 L178 104", "M200 104 L240 104", "M262 104 L302 104"],
    brass: ["M84 132 L108 132 L108 140 L84 140 Z", "M146 132 L170 132 L170 140 L146 140 Z", "M208 132 L232 132 L232 140 L208 140 Z", "M270 132 L294 132 L294 140 L270 140 Z"],
    ground: 162,
    metal: PALE_STEEL,
    hue: 190,
  },
  // a shipping crate on its skids: planks, corner irons, a stencil plate
  crate: {
    body: ["M96 48 L304 48 L304 146 L96 146 Z", "M108 146 L140 146 L140 158 L108 158 Z", "M260 146 L292 146 L292 158 L260 158 Z"],
    dark: [],
    lines: ["M96 72 L304 72", "M96 98 L304 98", "M96 122 L304 122", "M148 48 L148 146", "M252 48 L252 146"],
    brass: ["M96 48 L118 48 L118 70 L96 70 Z", "M282 48 L304 48 L304 70 L282 70 Z", "M96 124 L118 124 L118 146 L96 146 Z", "M282 124 L304 124 L304 146 L282 146 Z", "M176 84 L224 84 L224 110 L176 110 Z"],
    ground: 160,
    metal: WOOD,
    hue: 30,
  },
  // a ballistic missile lying on its cradle: the long body, the pointed nose, four fins
  missile: {
    body: ["M18 88 Q54 70 110 70 L330 70 L330 106 L110 106 Q54 106 18 88 Z", "M296 70 L346 40 L360 40 L344 70 Z", "M296 106 L346 136 L360 136 L344 106 Z", "M330 76 L372 80 L372 96 L330 100 Z", "M130 106 L150 106 L162 152 L118 152 Z", "M250 106 L270 106 L282 152 L238 152 Z"],
    dark: ["M110 70 L122 70 L122 106 L110 106 Z"],
    lines: ["M122 88 L330 88", "M200 70 L200 106", "M100 152 L300 152"],
    brass: ["M214 78 L250 78 L250 98 L214 98 Z"],
    ground: 158,
    metal: PALE_STEEL,
    hue: 160,
  },
  // an abacus: a wooden frame, five rods, their beads pushed to either side
  abacus: {
    body: ["M70 26 L330 26 L330 42 L70 42 Z", "M70 138 L330 138 L330 154 L70 154 Z", "M70 26 L86 26 L86 154 L70 154 Z", "M314 26 L330 26 L330 154 L314 154 Z"],
    dark: [],
    lines: ["M86 62 L314 62", "M86 84 L314 84", "M86 106 L314 106", "M86 128 L314 128"],
    brass: [],
    wheels: [[104, 62, 10], [126, 62, 10], [148, 62, 10], [296, 62, 10], [104, 84, 10], [274, 84, 10], [296, 84, 10], [104, 106, 10], [126, 106, 10], [252, 106, 10], [274, 106, 10], [296, 106, 10], [104, 128, 10], [126, 128, 10], [148, 128, 10], [170, 128, 10], [296, 128, 10]],
    ground: 158,
    metal: WOOD,
    hue: 30,
  },
};

export type ObjectId = keyof typeof OBJECTS;

/** What a figure is about, read from its own words (its label, its unit, its section): the first that matches. */
const ABOUT: [RegExp, string][] = [
  [/بارگیری|صادرات نفت|نفتکش|محموله/, "tanker"],
  [/بنزین|گازوئیل|سوخت/, "pump"],
  [/نفت|بشکه/, "barrel"],
  [/برق|مگاوات|خاموشی|نیروگاه/, "pylon"],
  [/اورانیوم|غنی[‌ ]?سازی|غنا|سانتریفیوژ|هسته[‌ ]?ای|کیلوگرم اورانیوم/, "centrifuge"],
  [/موشک|برد |پهپاد/, "missile"],
  [/تجارت|واردات|صادرات|گمرک/, "crate"],
  [/تورم|قیمت|دلار|ارز|تومان|ریال|بودجه|کسری|ذخایر|صندوق|بانک|بورس|نقدینگی|درآمد|زیان|میلیارد/, "banknotes"],
];
export function objectFor(f: { object?: string | null; label?: string; unit?: string; section?: string; explain?: string }): string {
  if (f.object && f.object in OBJECTS) return f.object;
  const own = `${f.label ?? ""} ${f.unit ?? ""}`;
  for (const [re, id] of ABOUT) if (re.test(own)) return id;
  const wider = `${f.section ?? ""}`;
  if (/هسته/.test(wider)) return "centrifuge";
  if (/اقتصاد|تحریم/.test(wider)) return "banknotes";
  return "abacus";
}
