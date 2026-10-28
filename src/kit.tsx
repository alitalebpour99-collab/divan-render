// What every Divan Reel shares: the site's night palette and type, Instagram's
// safe zones, the seal, the brand line, the closing line and the motion pieces.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame as useFilmFrame } from "remotion";
import { loadFont as loadVazir } from "@remotion/google-fonts/Vazirmatn";
import { loadFont as loadNaskh } from "@remotion/google-fonts/NotoNaskhArabic";
import { CHROMA, HUES } from "./hues";
import type { Hold } from "./voice";

export const { fontFamily: VAZIR } = loadVazir("normal", { weights: ["400", "500", "700", "800"], subsets: ["arabic", "latin"] });
export const { fontFamily: NASKH } = loadNaskh("normal", { weights: ["500", "700"], subsets: ["arabic"] });

export const W = 1080;
export const H = 1920;
export const FPS = 30;
// Instagram draws the caption over the bottom of a Reel and its buttons down the
// lower right edge; nothing that must be read sits there.
export const SAFE_BOTTOM = 330;

// ---------- the safe stage (Safe.tsx) ----------
// Every Reel is drawn a little smaller, so that its highest line (the name, at
// DESIGN_TOP) lands at y 290 and its lowest (the closing line, on SAFE_BOTTOM) at
// y 1590: inside the 4:5 crop of Instagram's feed (285–1635) and clear of the
// caption and buttons of the full-screen viewers.
const DESIGN_TOP = 60;
const SCREEN_TOP = 290;
const SCREEN_BOTTOM = 1590;
export const STAGE_K = (SCREEN_BOTTOM - SCREEN_TOP) / (H - SAFE_BOTTOM - DESIGN_TOP);
export const STAGE_X = (W - W * STAGE_K) / 2;
export const STAGE_Y = SCREEN_TOP - DESIGN_TOP * STAGE_K;
/**
 * True while a Reel is drawn on the safe stage. The stage paints the night
 * ground itself, full-bleed, so Backdrop steps aside there and no edge of the
 * smaller stage can show.
 */
export const OnStage = React.createContext(false);
/**
 * A ground that covers the whole screen even on the stage: there it reaches out
 * past the stage's edges to the screen's, so its colours land on the same
 * pixels as the stage's own ground and the two cannot be told apart.
 */
export const Bleed: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) =>
  React.useContext(OnStage) ? (
    <div style={{ position: "absolute", left: -STAGE_X / STAGE_K, top: -STAGE_Y / STAGE_K, width: W / STAGE_K, height: H / STAGE_K, ...style }}>{children}</div>
  ) : (
    <AbsoluteFill style={style}>{children}</AbsoluteFill>
  );
export const SIDE_RAIL = 150;
export const SIDE = 70;

// the night theme of the site (app/globals.css); the accent is the series' own colour, set by paint()
export const C = {
  bg: "#0D1322",
  bg2: "#111A2C",
  panel: "#141C30",
  ink: "#EDE6D6",
  ink2: "#C2BBAB",
  ink3: "#958F82",
  line: "rgba(237,230,214,.13)",
  line2: "rgba(237,230,214,.26)",
  acc: "oklch(0.77 0.11 250)",
  accSoft: "oklch(0.77 0.11 250 / 0.14)",
  accLine: "oklch(0.77 0.11 250 / 0.45)",
  /** the soft light behind a scene, in the series' colour */
  glow: "oklch(0.77 0.11 250 / 0.10)",
  /** a dark ground tinted with the series' colour, for the tile and the Story */
  deep: "oklch(0.33 0.10 250)",
  /** the same tint, darker: where the tinted ground meets the night ground */
  dusk: "oklch(0.22 0.055 250)",
  /** what stands on the accent */
  onAcc: "#0D1322",
  /** «closer to the goal», on every series: a meaning, so it does not change with the series' colour */
  good: "oklch(0.77 0.11 250)",
  strike: "oklch(0.67 0.19 27)",
  strikeSoft: "oklch(0.67 0.19 27 / 0.16)",
  claim: "oklch(0.82 0.14 84)",
  claimSoft: "oklch(0.82 0.14 84 / 0.16)",
  sea: "#0B111F",
  land: "#121A2C",
  iran: "#16203A",
  mapLine: "rgba(237,230,214,.13)",
};

/**
 * Every series has a colour of its own, so that the profile grid shows at a
 * glance which tile is which and a viewer finds «the yellow ones» again. The
 * hues are spread around the wheel at one lightness and strength. The ground,
 * the type and the three meanings stay the site's on every series: blue
 * brings a goal nearer (C.good), red is a strike or a loss (C.strike), yellow
 * a claim or a mixed effect (C.claim).
 */
// the table itself is in hues.ts, which the site's desk reads too
export { CHROMA, HUES };

/**
 * Sets the accent to a series' colour. Every composition calls it first
 * thing; a render draws one composition, so the palette is that series' for
 * the whole render.
 */
export function paint(format: string): void {
  const h = HUES[format] ?? HUES.seat;
  const c = CHROMA[format] ?? 0.125;
  // the tinted grounds keep the same share of the accent's strength on every series
  const deep = +(0.1 * (c / 0.125)).toFixed(3);
  const dusk = +(0.055 * (c / 0.125)).toFixed(3);
  C.acc = `oklch(0.80 ${c} ${h})`;
  C.accSoft = `oklch(0.80 ${c} ${h} / 0.14)`;
  C.accLine = `oklch(0.80 ${c} ${h} / 0.45)`;
  C.glow = `oklch(0.80 ${c} ${h} / 0.11)`;
  C.deep = `oklch(0.33 ${deep} ${h})`;
  C.dusk = `oklch(0.22 ${dusk} ${h})`;
}

export const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
/** 0 → 1 from `from`, over `length` frames. */
export const fade = (frame: number, from: number, length = 12) => interpolate(frame, [from, from + length], [0, 1], clamped);
/** `distance` → 0 from `from`: something settles into its place. */
export const rise = (frame: number, from: number, distance = 36, length = 18) => interpolate(frame, [from, from + length], [distance, 0], { ...clamped, easing: ease });
/** 1 → 0 over the `length` frames before `until`. */
export const leave = (frame: number, until: number, length = 10) => interpolate(frame, [until - length, until], [1, 0], clamped);
/** Visible between two frames, with a soft way in and out. */
export const during = (frame: number, from: number, until: number, length = 12) => Math.min(fade(frame, from, length), leave(frame, until, length));
/** 0 → 1 eased: for things that grow. */
export const grow = (frame: number, from: number, length = 24) => interpolate(frame, [from, from + length], [0, 1], { ...clamped, easing: ease });
/** A value that overshoots a little and settles: for a stamp, a badge, a bar that lands. */
export const pop = (frame: number, from: number, length = 22) => interpolate(frame, [from, from + length * 0.55, from + length * 0.8, from + length], [0, 1.08, 0.97, 1], clamped);

const FA = "۰۱۲۳۴۵۶۷۸۹";
/** Persian digits, nothing else changed (for years and day numbers). */
export const faDigits = (v: number | string) => String(v).replace(/\d/g, (d) => FA[Number(d)]);
/** A number in Persian digits with separators. */
export const faNum = (n: number, frac = 0) => new Intl.NumberFormat("fa-IR", { minimumFractionDigits: frac, maximumFractionDigits: frac }).format(n);
/** A day of the Gregorian calendar in the Solar Hijri calendar, in Persian. */
export const faDate = (iso: string, withYear = true) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** Where each scene of a Reel begins, from the lengths of the scenes (frames). */
export const starts = (lengths: number[]) => lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));

/**
 * How long a text must stay to be read once (frames): about three and a half words a second, plus a short breath.
 * It was three words a second and almost a second of breath until 24 October 2026: viewers watched about ten
 * seconds of Reels of thirty to fifty, so every text scene is now about a fifth shorter.
 */
export const readFrames = (text: string, floor = 60) =>
  Math.max(
    floor,
    Math.round(
      (text
        .trim()
        .split(/\s+/)
        .filter(Boolean).length *
        0.28 +
        0.7) *
        FPS,
    ),
  );

/** The dark ground of the site, with its faint grid drifting slowly: nothing else moves behind the content. */
export const Backdrop: React.FC<{ total: number; glowY?: number }> = ({ total, glowY = 40 }) => {
  const frame = useCurrentFrame();
  if (React.useContext(OnStage)) return null;
  const drift = frame / total;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 900px at 50% ${glowY}%, ${C.glow}, transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `${-drift * 60}px ${-drift * 120}px`,
          opacity: 0.3,
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(13,19,34,0) 55%, rgba(13,19,34,.75) 100%)" }} />
    </AbsoluteFill>
  );
};

/** The Divan seal, as on the site: two rings, a square and a diamond around the name. */
export const Seal: React.FC<{ size: number; color?: string; filled?: boolean; word?: boolean }> = ({ size, color = C.acc, filled = false, word = true }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: "block", flex: "none" }}>
    <circle cx="60" cy="60" r="57" fill={filled ? C.accSoft : "none"} stroke={color} strokeWidth="2.4" />
    <circle cx="60" cy="60" r="51.5" fill="none" stroke={color} strokeWidth=".8" />
    <circle cx="60" cy="60" r="37" fill="none" stroke={color} strokeWidth=".9" />
    <path d="M41.5 41.5h37v37h-37z" fill="none" stroke={color} strokeWidth=".8" opacity=".55" />
    <path d="M60 33.8L86.2 60 60 86.2 33.8 60z" fill="none" stroke={color} strokeWidth=".8" opacity=".55" />
    {word ? (
      <text x="60" y="66" textAnchor="middle" fill={color} style={{ fontFamily: NASKH, fontSize: 21, fontWeight: 700 }}>
        دیوان
      </text>
    ) : (
      <circle cx="60" cy="60" r="5" fill={color} />
    )}
  </svg>
);

// ---------- where the Reel stands in its series ----------
/** The Reel's place in its series, and whether its last seconds have come (Safe.tsx gives it). */
export type Part = { n: number; of: number; next: string | null; ending: boolean };
export const PartCtx = React.createContext<Part | null>(null);
/** «قسمت ۳ از ۱۵», and in the last seconds «قسمت بعد: …»: a series gives a reason to follow. */
export const partText = (p: Part) => (p.ending && p.next ? `قسمت بعد: ${p.next}` : `قسمت ${faDigits(p.n)} از ${faDigits(p.of)}`);
/** The part as a small pill at the far end of the name line. */
export const PartPill: React.FC<{ color?: string }> = ({ color }) => {
  const p = React.useContext(PartCtx);
  if (!p) return null;
  return (
    <span style={{ marginInlineStart: "auto", maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: VAZIR, fontSize: 26, fontWeight: 700, color: color ?? C.acc, border: `2px solid ${color ?? C.acc}`, borderRadius: 30, padding: "4px 18px", direction: "rtl" }}>
      {partText(p)}
    </span>
  );
};
/** The part as a small line under a kicker, for the layouts with a name line of their own. */
export const PartLine: React.FC<{ color?: string }> = ({ color }) => {
  const p = React.useContext(PartCtx);
  if (!p) return null;
  return <span style={{ fontFamily: VAZIR, fontSize: 22, fontWeight: 500, color: color ?? C.ink3, maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{partText(p)}</span>;
};

/** The name on every frame: a Reel reposted elsewhere still says whose it is. */
export const Brand: React.FC<{ tag: string }> = ({ tag }) => (
  <div style={{ position: "absolute", top: 60, right: SIDE, left: SIDE, display: "flex", alignItems: "center", gap: 22, direction: "rtl" }}>
    <Seal size={92} word={false} />
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontFamily: NASKH, fontSize: 58, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>دیوان</span>
      <span style={{ fontFamily: VAZIR, fontSize: 24, color: C.ink3, marginTop: 2 }}>{tag}</span>
    </div>
    <PartPill />
  </div>
);

/** A layer that makes no sound: the hook's blurred look ahead at the Reel (Hook.tsx) must not play its effects. */
const Quiet = React.createContext(false);
export const Silent: React.FC<{ children: React.ReactNode }> = ({ children }) => <Quiet.Provider value={true}>{children}</Quiet.Provider>;

/** Model-written text is always marked, as on the site. */
export const AiChip: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 18px",
      borderRadius: 24,
      border: `1.5px dashed ${C.line2}`,
      fontFamily: VAZIR,
      fontSize: 24,
      fontWeight: 500,
      color: C.ink2,
      opacity,
      direction: "rtl",
      whiteSpace: "nowrap",
      flex: "none",
    }}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ink2} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
    تحلیل هوش مصنوعی، نه خبر
  </span>
);

/** The closing line: where the content comes from, and where to see the whole of it. */
export const Foot: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <div style={{ position: "absolute", bottom: SAFE_BOTTOM + 4, left: SIDE, right: SIDE_RAIL, direction: "rtl", opacity }}>
    <div style={{ fontFamily: VAZIR, fontSize: 22, color: C.ink3, lineHeight: 1.7 }}>{children}</div>
    <div style={{ fontFamily: VAZIR, fontSize: 30, fontWeight: 700, color: C.ink, direction: "ltr", textAlign: "right", marginTop: 8 }}>divan.ahura.cloud</div>
  </div>
);

// ---------- shared motion pieces ----------

/** A line that arrives word by word: each word rises into place a few frames after the one before it. */
export const Words: React.FC<{ text: string; from: number; step?: number; lift?: number; style?: React.CSSProperties; accent?: (word: string, index: number) => string | undefined }> = ({ text, from, step = 3, lift = 26, style, accent }) => {
  const frame = useCurrentFrame();
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (
    <div style={{ direction: "rtl", ...style }}>
      {words.map((w, i) => {
        const at = from + i * step;
        return (
          <span key={i} style={{ display: "inline-block", marginLeft: "0.26em", opacity: fade(frame, at, 9), transform: `translateY(${rise(frame, at, lift, 14)}px)`, color: accent?.(w, i) }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** A figure that counts up to its value, in Persian digits. */
export const Count: React.FC<{ to: number; from: number; length?: number; decimals?: number }> = ({ to, from, length = 30, decimals = 0 }) => {
  const frame = useCurrentFrame();
  return <>{faNum(to * grow(frame, from, length), decimals)}</>;
};

// ---------- the picture waits for the narrator ----------
const Holds = React.createContext<Hold[]>([]);
/** Gives a layout its holds; outside one (the hook, the stage, a Story) the clock runs as the film does. */
export const Waits: React.FC<{ holds?: Hold[] | null; children: React.ReactNode }> = ({ holds, children }) => <Holds.Provider value={holds ?? []}>{children}</Holds.Provider>;
/** A frame of the film as the layout's own frame: during a hold it stays on the frame before it. */
export const layoutFrame = (film: number, holds: Hold[]) => {
  let t = film;
  for (const h of holds) {
    if (t < h.at) return t;
    if (t < h.at + h.len) return Math.max(0, h.at - 1);
    t -= h.len;
  }
  return t;
};
/**
 * While the layout waits for the narrator the picture does not stand still: it
 * moves slowly closer, about half a percent a second, and eases back as the
 * layout goes on. A picture that stood still for seconds looked like a fault
 * (owner 2026-10-28: «خیلی باگ داره»; 17 of 30 seconds stood still in Reel 77).
 */
export const Alive: React.FC<{ holds?: Hold[] | null; children: React.ReactNode }> = ({ holds, children }) => {
  const film = useFilmFrame();
  let push = 0;
  let before = 0;
  for (const h of holds ?? []) {
    const start = h.at + before;
    const most = Math.min(0.045, (h.len / FPS) * 0.0055);
    if (film >= start && film < start + h.len) push = Math.max(push, most * interpolate(film, [start, start + h.len], [0, 1], { ...clamped, easing: ease }));
    else if (film >= start + h.len) push = Math.max(push, most * interpolate(film, [start + h.len, start + h.len + 20], [1, 0], { ...clamped, easing: ease }));
    before += h.len;
  }
  return <AbsoluteFill style={{ transform: `scale(${1 + push})`, transformOrigin: "50% 42%" }}>{children}</AbsoluteFill>;
};
/** A frame of the layout as a frame of the film. */
export const filmFrame = (frame: number, holds: Hold[]) => frame + holds.filter((h) => h.at <= frame).reduce((s, h) => s + h.len, 0);
/**
 * The frame every layout draws from. It is Remotion's own frame, except that it
 * stands still while the layout waits for the narrator; with no holds it is the same.
 */
export function useCurrentFrame() {
  const film = useFilmFrame();
  const holds = React.useContext(Holds);
  return holds.length ? layoutFrame(film, holds) : film;
}

// ---------- sound ----------
/** The sound effects in public/sfx/ (made by sfx.mjs), each with the loudness it plays at under the score. */
export const SFX = { whoosh: 0.32, hit: 0.55, tick: 0.22, pop: 0.3, rise: 0.4, swish: 0.28 } as const;
export type SfxName = keyof typeof SFX;

/** One sound effect at a frame of the scene it sits in. */
export const Sfx: React.FC<{ at: number; name: SfxName; volume?: number }> = ({ at, name, volume }) => {
  // a frame of the layout: when the picture waits before it, the sound waits too
  const holds = React.useContext(Holds);
  if (React.useContext(Quiet)) return null;
  return (
    <Sequence from={Math.max(0, Math.round(filmFrame(at, holds)))} durationInFrames={Math.round(2 * FPS)} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume ?? SFX[name]} />
    </Sequence>
  );
};

/**
 * A thin line under the name that fills as the Reel goes, with a notch at every scene: the viewer sees how much is left.
 * Every scene also arrives with a whoosh (owner 2026-10-23: more life in the videos), so every Reel has its sound of
 * change without each layout placing one.
 */
export const Progress: React.FC<{ total: number; marks?: number[] }> = ({ total, marks = [] }) => {
  const frame = useCurrentFrame();
  const width = W - 2 * SIDE;
  return (
    <div style={{ position: "absolute", top: 176, left: SIDE, width, height: 6, borderRadius: 3, background: C.line, overflow: "hidden", direction: "ltr" }}>
      {marks.map((m) => (
        <Sfx key={`s${m}`} at={m - 6} name="whoosh" />
      ))}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: (width * Math.min(frame, total)) / total, background: C.acc, borderRadius: 3 }} />
      {marks.map((m) => (
        <span key={m} style={{ position: "absolute", top: 0, bottom: 0, right: (width * m) / total - 2, width: 4, background: C.bg }} />
      ))}
    </div>
  );
};

/** The small coloured line over a scene: what kind of thing follows. */
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.acc, size = 40, style }) => (
  <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: size, color, direction: "rtl", ...style }}>{children}</div>
);

/** A card of the site: the dark panel with a hairline. */
export const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; dashed?: boolean }> = ({ children, style, dashed = false }) => (
  <div style={{ padding: "26px 32px", borderRadius: 26, background: C.panel, border: `1.5px ${dashed ? "dashed" : "solid"} ${dashed ? C.line2 : C.line}`, direction: "rtl", ...style }}>{children}</div>
);

/** Slow points of light behind a scene, joined when they come near each other: the site's «مغز ایران». Decorative only. */
export const Net: React.FC<{ total: number; opacity?: number; count?: number; top?: number; bottom?: number }> = ({ total, opacity = 0.5, count = 26, top = 240, bottom = H - SAFE_BOTTOM }) => {
  const frame = useCurrentFrame();
  const turn = (frame / total) * Math.PI * 2;
  const points = Array.from({ length: count }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12543.1231;
    const rx = a - Math.floor(a);
    const ry = b - Math.floor(b);
    return {
      x: 60 + rx * (W - 120) + Math.sin(turn * (0.4 + rx) + i) * 46,
      y: top + ry * (bottom - top) + Math.cos(turn * (0.3 + ry) + i * 1.7) * 38,
      r: 2.6 + rx * 3,
    };
  });
  const links: [number, number, number][] = [];
  for (let i = 0; i < points.length; i += 1)
    for (let j = i + 1; j < points.length; j += 1) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d < 250) links.push([i, j, 1 - d / 250]);
    }
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity }}>
      {links.map(([i, j, s]) => (
        <line key={`${i}-${j}`} x1={points[i].x} y1={points[i].y} x2={points[j].x} y2={points[j].y} stroke={C.acc} strokeWidth={1.4} opacity={0.3 * s} />
      ))}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={C.acc} opacity={0.5} />
      ))}
    </svg>
  );
};

type Goal = { id?: string; name: string; band: [number, number]; verdict: string; tone: "good" | "bad" | "both" | "none" };

/** One goal as a column around today's line: the band rises toward the goal or sinks away from it. `g` runs 0 → 1. */
export const GoalColumn: React.FC<{ goal: Goal; g: number }> = ({ goal, g }) => {
  const STEP = 54;
  const MID = 2 * STEP + 18;
  const [lo, hi] = goal.band;
  const top = MID - hi * STEP * g;
  const bottom = MID - lo * STEP * g;
  const up = Math.max(0, MID - top);
  const down = Math.max(0, bottom - MID);
  const flat = lo === hi;
  const tone = goal.tone === "good" ? C.good : goal.tone === "bad" ? C.strike : goal.tone === "both" ? C.claim : C.ink3;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 29, color: C.ink, whiteSpace: "nowrap" }}>{goal.name}</div>
      <svg width="230" height={MID * 2} viewBox={`0 0 230 ${MID * 2}`}>
        {[-2, -1, 1, 2].map((k) => (
          <line key={k} x1="62" x2="168" y1={MID - k * STEP} y2={MID - k * STEP} stroke={C.line} strokeWidth="2" />
        ))}
        <rect x="74" y="6" width="82" height={MID * 2 - 12} rx="16" fill="rgba(237,230,214,.04)" stroke={C.line} strokeWidth="1.5" />
        {up > 0 ? <rect x="80" y={MID - up} width="70" height={up} rx="10" fill={C.good} /> : null}
        {down > 0 ? <rect x="80" y={MID} width="70" height={down} rx="10" fill={C.strike} /> : null}
        {flat && lo !== 0 ? <rect x="80" y={MID - lo * STEP * g - 9} width="70" height="18" rx="9" fill={lo > 0 ? C.good : C.strike} /> : null}
        {/* today's line */}
        <line x1="34" x2="196" y1={MID} y2={MID} stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 27, color: tone, whiteSpace: "nowrap", opacity: g }}>{goal.verdict}</div>
    </div>
  );
};

/** The three goal columns in their dashed card, as on every piece of advice of the site. `from` is the frame the first column starts to move. */
export const GoalCard: React.FC<{ goals: Goal[]; from: number; style?: React.CSSProperties }> = ({ goals, from, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ padding: "22px 14px 20px", borderRadius: 28, background: "rgba(20,28,48,.9)", border: `1.5px dashed ${C.line2}`, direction: "rtl", ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px 12px" }}>
        <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 28, color: C.ink2 }}>اثر بر سه هدف</span>
        <span style={{ fontFamily: VAZIR, fontSize: 23, color: C.ink3 }}>برآورد هوش مصنوعی: جهت، نه عدد</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {goals.map((goal, i) => (
          <GoalColumn key={goal.id ?? i} goal={goal} g={interpolate(frame, [from + i * 10, from + 30 + i * 10], [0, 1], { ...clamped, easing: ease })} />
        ))}
      </div>
    </div>
  );
};
