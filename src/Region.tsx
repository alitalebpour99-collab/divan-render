// «ایران در منطقه»: one indicator, and where Iran stands among the countries of
// its region. The bars leave zero together; each one stops at its own figure and
// takes its place, so the viewer sees the order form. Every word and every figure
// comes from the props the site sends.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile } from "remotion";
import { makeMap, type Extent } from "./geo";
import { Backdrop, Brand, C, Foot, H, Kicker, NASKH, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, VAZIR, W, clamped, faDigits, faNum, fade, leave, paint, pop, readFrames, rise, starts, useCurrentFrame } from "./kit";
import type { RegionProps, RegionRowProps } from "./props";
import { scenes, type Cues } from "./voice";

const HOOK = 75;
const RACE = 270;
// inside the race: the rows line up, then the front crosses the track; the rest is for reading the order
const LINE_UP = 14;
const RUN = 144;

const HEAD_TOP = 222;
const LIST_TOP = 372;
const LIST_BOTTOM = H - SAFE_BOTTOM - 30;
// the list runs down past Instagram's buttons, so all of it keeps the rail free;
// the card behind a row is PAD wider than the row's text on both sides
const PAD = 18;
const LIST_RIGHT = SIDE_RAIL + PAD;
const LIST_LEFT = 34 + PAD;
const LIST_W = W - LIST_RIGHT - LIST_LEFT;

// under Iran's row: the badge with the site's line, then a note (what the indicator measures, later its source)
const BADGE = 400;
const BADGE_TOP = 536;
const NOTE_GAP = 40;
const NOTE_W = W - SIDE_RAIL - SIDE;
// the closing line of the kit begins a little under this
const NOTE_BOTTOM = H - SAFE_BOTTOM - 130;
// the count around the badge: frames before it starts, and frames for every tick
const COUNT_IN = 12;
const PACE = 3;

// the window of the map behind the opening: Iran in the middle, its region around it
const WINDOW: Extent = [
  [25, 11],
  [79, 44],
];
const MAP_BOX = { x0: -60, y0: 790, x1: W + 60, y1: 1690 };

// a Reel of this format stays within twenty-five seconds
const LONGEST = 750;

/** The lengths of the scenes: the question, the race, Iran's place, the source. */
function plan(p: RegionProps) {
  // the terms of a source must stay long enough to be read, so the last scene grows with its text
  const source = Math.min(210, Math.max(150, 36 + Math.round(readFrames([p.source, p.terms ?? "", p.missing ?? ""].join(" ")) * 0.75)));
  // what the indicator measures is read once the badge has counted: about a second and a half into the scene
  const wish = Math.min(210, Math.max(150, 48 + Math.round(readFrames(p.means) * 0.8)));
  const rank = Math.max(150, Math.min(wish, LONGEST - HOOK - RACE - source));
  const lengths = [HOOK, RACE, rank, source];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const regionDuration = (p: RegionProps) => plan(p).total;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
export const regionCues = (p: RegionProps): Cues => ({ ...scenes(plan(p).at), rank: plan(p).at[2] });

const unit = (v: number) => Math.max(0, Math.min(1, v));
const glide = Easing.inOut(Easing.cubic);
// how a paragraph breaks: no word left alone on its last line; a short one in lines of like length
const PRETTY = { textWrap: "pretty" } as React.CSSProperties;
const BALANCED = { textWrap: "balance" } as React.CSSProperties;

type Move = { at: number; span: number; by: number };
/** One row through the race: where it starts, when its bar stops, how far it then drops, and every step it takes. */
type Lane = { first: number; stop: number; span: number; drop: number; moves: Move[] };
/** The rows, and the front all bars share: a curve through the frame and the share of every stop. */
type Race = { lanes: Lane[]; t: number[]; s: number[]; m: number[] };

/**
 * The race, worked out once. The rows start in the order of their names. Every
 * bar grows with the same front, so a bar stops when the front reaches its share:
 * the shortest first, the longest last. A row that stops takes its final place
 * (its place in `rows`), and the rows still running share the places left, in the
 * order of their names. So the ranking is seen to form from the bottom up.
 */
function raceOf(rows: RegionRowProps[]): Race {
  const n = rows.length;
  const all = rows.map((_, i) => i);
  const byName = [...all].sort((a, b) => rows[a].name.localeCompare(rows[b].name, "fa") || a - b);
  const byShare = [...all].sort((a, b) => rows[a].share - rows[b].share || b - a);
  // when each bar stops: half by its length (a front that starts and ends slowly),
  // half by its turn, so close figures do not all stop on one frame and a far leader does not run alone for seconds
  const stop = new Array<number>(n).fill(LINE_UP);
  byShare.forEach((i, q) => {
    stop[i] = LINE_UP + RUN * (0.5 * ((q + 1) / n) + 0.5 * (0.5 - Math.sin(Math.asin(1 - 2 * unit(rows[i].share)) / 3)));
  });
  const slot = new Array<number>(n).fill(0);
  byName.forEach((i, k) => {
    slot[i] = k;
  });
  const lanes: Lane[] = rows.map((_, i) => ({ first: slot[i], stop: stop[i], span: 16, drop: 0, moves: [] }));
  const running = new Set(all);
  for (const j of byShare) {
    running.delete(j);
    // the places no stopped row holds are exactly the final places of the rows still running
    const free = all.filter((s) => running.has(s));
    const next = slot.slice();
    next[j] = j;
    byName
      .filter((i) => running.has(i))
      .forEach((i, k) => {
        next[i] = free[k];
      });
    const drop = next[j] - slot[j];
    const span = Math.min(30, 16 + 3 * Math.abs(drop));
    lanes[j].drop = drop;
    lanes[j].span = span;
    for (const i of all) {
      if (next[i] !== slot[i]) lanes[i].moves.push({ at: stop[j], span, by: next[i] - slot[i] });
      slot[i] = next[i];
    }
  }
  // the front: a smooth curve through every stop that never turns back, at rest at both ends
  const t = [LINE_UP, ...byShare.map((i) => stop[i])];
  const s = [0, ...byShare.map((i) => unit(rows[i].share))];
  const d = t.slice(1).map((v, k) => (s[k + 1] - s[k]) / Math.max(1e-6, v - t[k]));
  const m = t.map((_, k) => (k === 0 || k === t.length - 1 || d[k - 1] <= 0 || d[k] <= 0 ? 0 : (2 * d[k - 1] * d[k]) / (d[k - 1] + d[k])));
  return { lanes, t, s, m };
}
/** How far the front has run on a frame of the race (0 … 1 of the track). */
function frontAt({ t, s, m }: Race, f: number) {
  const last = t.length - 1;
  if (f <= t[0]) return 0;
  if (f >= t[last]) return s[last];
  let k = 0;
  while (k < last - 1 && f >= t[k + 1]) k += 1;
  const h = t[k + 1] - t[k];
  const x = (f - t[k]) / h;
  const x2 = x * x;
  const x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * s[k] + (x3 - 2 * x2 + x) * h * m[k] + (3 * x2 - 2 * x3) * s[k + 1] + (x3 - x2) * h * m[k + 1];
}
/** The place a row holds on a frame of the race, between two places while it travels. */
const slotAt = (lane: Lane, f: number) => lane.moves.reduce((s, m) => s + m.by * glide(unit((f - m.at) / m.span)), lane.first);

/** The middle of a drawn outline, from its own points. */
function middleOf(d: string): [number, number] {
  const v = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let k = 0; k + 1 < v.length; k += 2) {
    x0 = Math.min(x0, v[k]);
    x1 = Math.max(x1, v[k]);
    y0 = Math.min(y0, v[k + 1]);
    y1 = Math.max(y1, v[k + 1]);
  }
  return Number.isFinite(x0) ? [(x0 + x1) / 2, (y0 + y1) / 2] : [W / 2, H / 2];
}

/**
 * How many lines a text in Vazir takes in a column: its words laid one after
 * another, every letter counted a little wide, so the answer errs on the long side.
 */
function linesOf(text: string, size: number, width: number) {
  const room = width / (0.48 * size);
  let lines = 1;
  let used = 0;
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const length = word.replace(/‌/g, "").length * (/[A-Za-z]/.test(word) ? 1.2 : 1);
    if (used > 0 && used + 1 + length > room) {
      lines += 1;
      used = length;
    } else used += (used > 0 ? 1 : 0) + length;
  }
  return lines;
}

const NUMBER = /([۰-۹٠-٩\d]+(?:[٬٫.,][۰-۹٠-٩\d]+)*)/;
/** A display line in Naskh whose digits are set in Vazir (Naskh's digits sit too far apart). */
const Mixed: React.FC<{ text: string; tint?: (nth: number) => string | undefined }> = ({ text, tint }) => (
  <>
    {text.split(NUMBER).map((part, k) =>
      k % 2 ? (
        <span key={k} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: "0.9em", color: tint?.((k - 1) / 2) }}>
          {part}
        </span>
      ) : (
        <React.Fragment key={k}>{part}</React.Fragment>
      ),
    )}
  </>
);

/** A display line that arrives word by word. */
const Rising: React.FC<{ text: string; from: number; step?: number; style?: React.CSSProperties; tint?: (word: string) => string | undefined }> = ({ text, from, step = 3, style, tint }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ direction: "rtl", ...style }}>
      {text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w, i) => {
          const at = from + i * step;
          return (
            <span key={i} style={{ display: "inline-block", marginLeft: "0.26em", opacity: fade(frame, at, 9), transform: `translateY(${rise(frame, at, 26, 14)}px)`, color: tint?.(w) }}>
              <Mixed text={w} />
            </span>
          );
        })}
    </div>
  );
};

/** One country: its place, its name, its figure with the year, and under them its bar, growing from the right. */
const Row: React.FC<{
  row: RegionRowProps;
  pitch: number;
  /** px below the top of the list */
  y: number;
  /** the bar now, in px */
  bar: number;
  /** the number as it stands now */
  figure: string;
  /** 0 → 1 as the count ends: the figure is final, and its year comes with it */
  settled: number;
  /** 0 … 1: the place number lands */
  placed: number;
  /** 0 … 1: the card behind the row */
  card: number;
  /** 0 … 1: how far the glow around Iran's card has swollen (it breathes slowly) */
  glow: number;
  /** 0 … 1 along the bar, or null: a light that passes over Iran's bar once */
  shine: number | null;
  opacity: number;
  z: number;
}> = ({ row, pitch, y, bar, figure, settled, placed, card, glow, shine, opacity, z }) => {
  const u = Math.max(0.72, Math.min(1.08, pitch / 132));
  const big = row.home;
  const line = (big ? 60 : 52) * u;
  const thick = (big ? 30 : 22) * u;
  const gap = 8 * u;
  const block = line + gap + thick;
  const top = (pitch - block) / 2;
  const pad = 13 * u;
  const unitStyle: React.CSSProperties = { fontWeight: 500, fontSize: (big ? 33 : 29) * u, color: big ? C.ink2 : C.ink3 };
  return (
    <div style={{ position: "absolute", top: LIST_TOP, right: LIST_RIGHT, width: LIST_W, height: pitch, transform: `translateY(${y}px)`, opacity, zIndex: z, direction: "rtl" }}>
      <div
        style={{
          position: "absolute",
          top: top - pad,
          height: block + 2 * pad,
          left: -PAD,
          right: -PAD,
          borderRadius: 24,
          opacity: card,
          ...(big
            ? { background: `linear-gradient(${C.accSoft}, ${C.accSoft}), ${C.bg2}`, border: `1.5px solid ${C.accLine}`, boxShadow: `0 0 ${(50 + 22 * glow).toFixed(1)}px oklch(0.77 0.11 250 / ${(0.17 + 0.11 * glow).toFixed(3)})` }
            : { background: C.bg2, border: `1.5px solid ${C.line2}`, boxShadow: "0 16px 40px rgba(0,0,0,.5)" }),
        }}
      />
      <div style={{ position: "absolute", top, left: 0, right: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", height: line, lineHeight: `${line}px`, whiteSpace: "nowrap", fontFamily: VAZIR }}>
          <span style={{ width: 54 * u, flex: "none", fontWeight: 800, fontSize: (big ? 40 : 32) * u, color: big ? C.acc : C.ink3, opacity: Math.min(1, placed * 2.5) }}>
            <span style={{ display: "inline-block", transform: `scale(${placed})` }}>{row.pos}</span>
          </span>
          <span style={{ fontWeight: big ? 800 : 700, fontSize: (big ? 46 : 38) * u, color: big ? C.acc : C.ink2 }}>{row.name}</span>
          <span style={{ flex: 1 }} />
          <span style={{ opacity: 0.55 + 0.45 * settled }}>
            {row.pre ? <span style={unitStyle}>{row.pre}</span> : null}
            <span style={{ fontWeight: big ? 800 : 700, fontSize: (big ? 44 : 37) * u, color: big ? C.ink : C.ink2 }}>{figure}</span>
            <span style={unitStyle}>{row.post}</span>
          </span>
          <span style={{ flex: "none", marginRight: 18 * u, fontWeight: 400, fontSize: (big ? 26 : 24) * u, color: big ? C.ink2 : C.ink3, opacity: settled }}>سال {row.year}</span>
        </div>
        <div style={{ position: "relative", height: thick, marginTop: gap, borderRadius: thick / 2, background: "rgba(237,230,214,.055)" }}>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: bar, borderRadius: thick / 2, overflow: "hidden", background: big ? C.acc : "rgba(237,230,214,.3)", boxShadow: big ? `0 0 26px ${C.accLine}` : undefined }}>
            {shine !== null && shine > 0 && shine < 1 ? <div style={{ position: "absolute", top: 0, bottom: 0, width: 150, right: -150 + shine * (bar + 150), background: "linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)" }} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

/** The frame on which the count around the badge reaches Iran's tick. */
const countEnds = (from: number, pos: number, of: number) => from + COUNT_IN + (Math.max(1, Math.min(Math.max(1, of), pos)) - 1) * PACE;

/** Iran's place as a ring: one tick for every country, counted from the top; the count stops on Iran's tick, and it stays lit. */
const Badge: React.FC<{ of: number; pos: number; from: number }> = ({ of, pos, from }) => {
  const frame = useCurrentFrame();
  const n = Math.max(1, of);
  const lit = Math.max(1, Math.min(n, pos));
  const thick = n > 14 ? 16 : 28;
  const R = BADGE / 2 - thick / 2 - 34;
  const step = 360 / n;
  const gap = n > 1 ? ((thick + 16) / (2 * Math.PI * R)) * 360 : 0.2;
  const half = Math.min(179.9, Math.max(0.6, (step - gap) / 2));
  const point = (deg: number) => `${(R * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(R * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
  const tick = (k: number) => `M${point(-90 + k * step - half)}A${R} ${R} 0 ${half > 90 ? 1 : 0} 1 ${point(-90 + k * step + half)}`;
  const count = from + COUNT_IN;
  const arrive = countEnds(from, pos, of);
  const shown = Math.max(1, Math.min(lit, 1 + Math.floor((frame - count) / PACE)));
  const land = interpolate(frame, [arrive, arrive + 8, arrive + 18], [0.94, 1.06, 1], clamped);
  const breath = 0.5 + 0.16 * Math.sin((frame - arrive) / 15);
  return (
    <div style={{ position: "relative", width: BADGE, height: BADGE, flex: "none" }}>
      <svg width={BADGE} height={BADGE} viewBox={`${-BADGE / 2} ${-BADGE / 2} ${BADGE} ${BADGE}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <filter id="region-halo" filterUnits="userSpaceOnUse" x={-BADGE / 2 - 30} y={-BADGE / 2 - 30} width={BADGE + 60} height={BADGE + 60}>
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>
        {/* a thin orbit that turns slowly: the badge is never quite still */}
        <circle r={R + thick / 2 + 18} fill="none" stroke={C.accLine} strokeWidth="1.8" strokeDasharray="2 14" strokeLinecap="round" opacity={0.8 * fade(frame, from, 14)} transform={`rotate(${frame * 0.28})`} />
        {Array.from({ length: n }, (_, k) => {
          const passed = count + k * PACE;
          const trail = k < lit - 1 && frame >= passed ? Math.max(0, 1 - (frame - passed) / 12) : 0;
          return (
            <g key={k} opacity={fade(frame, from + k * 1.5, 8)}>
              <path d={tick(k)} fill="none" stroke={C.line2} strokeWidth={thick} strokeLinecap="round" />
              {trail > 0 ? <path d={tick(k)} fill="none" stroke={C.acc} strokeWidth={thick} strokeLinecap="round" opacity={0.7 * trail} /> : null}
            </g>
          );
        })}
        {frame >= arrive ? (
          <g transform={`scale(${land})`} opacity={fade(frame, arrive, 4)}>
            <path d={tick(lit - 1)} fill="none" stroke={C.acc} strokeWidth={thick + 12} strokeLinecap="round" filter="url(#region-halo)" opacity={breath} />
            <path d={tick(lit - 1)} fill="none" stroke={C.acc} strokeWidth={thick} strokeLinecap="round" />
          </g>
        ) : null}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: VAZIR,
          fontWeight: 800,
          fontSize: BADGE * (lit > 9 ? 0.34 : 0.45),
          lineHeight: 1,
          color: C.ink,
          opacity: fade(frame, count - 2, 6),
          transform: `scale(${interpolate(frame, [arrive, arrive + 8, arrive + 18], [1, 1.1, 1], clamped)})`,
        }}
      >
        {faDigits(shown)}
      </div>
    </div>
  );
};

export const Region: React.FC<RegionProps> = (p) => {
  paint("region");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const T_RACE = at[1];
  const T_RANK = at[2];
  const T_SOURCE = at[3];
  const rows = p.rows;
  const race = useMemo(() => raceOf(rows), [rows]);
  const map = useMemo(() => makeMap(WINDOW, MAP_BOX), []);
  const heart = useMemo(() => middleOf(map.iran), [map]);
  const home = rows.findIndex((r) => r.home);
  const pitch = Math.min(146, Math.floor((LIST_BOTTOM - LIST_TOP) / Math.max(1, rows.length)));
  // the frame of the race, and how far its front has run
  const f = frame - T_RACE;
  const ran = frontAt(race, f);

  // a long title is set smaller: large in the opening, on one line over the list
  const hookSize = p.title.length <= 13 ? 150 : p.title.length <= 22 ? 124 : p.title.length <= 30 ? 108 : 94;
  const headSize = p.title.length <= 22 ? 64 : p.title.length <= 30 ? 58 : p.title.length <= 40 ? 52 : 44;

  // 3 · the badge and the site's line under it; the note under both
  // the ring waits until Iran's row has gone up past its place
  const badgeFrom = T_RANK + 13;
  const counted = countEnds(badgeFrom, p.rankPos, p.rankOf);
  const rankSize = p.rank.length <= 20 ? 84 : p.rank.length <= 26 ? 70 : 58;
  const groupHeight = BADGE + 14 + rankSize * 1.4;
  const noteRoom = NOTE_BOTTOM - (BADGE_TOP + groupHeight + NOTE_GAP);
  const meansAt = Math.max(T_RANK + 34, counted + 8);
  const meansSize = [50, 46, 42, 38].find((size) => linesOf(p.means, size, NOTE_W - 30) * size * 1.8 <= noteRoom) ?? 34;
  // 4 · the source takes the note's place; when it needs more room than the note had, the badge steps back for it
  const sourceSize = p.source.length <= 95 ? 40 : p.source.length <= 140 ? 36 : 32;
  const sourceNeeds =
    52 +
    linesOf(p.source, sourceSize, NOTE_W) * sourceSize * 1.7 +
    (p.terms ? 26 + linesOf(p.terms, 36, NOTE_W - 30) * 36 * 1.65 : 0) +
    (p.missing ? 22 + linesOf(p.missing, 32, NOTE_W - 30) * 32 * 1.65 : 0) +
    12;
  const squeeze = Math.max(0.6, Math.min(1, 1 - (sourceNeeds - noteRoom) / groupHeight));
  const groupScale = 1 - (1 - squeeze) * glide(unit((frame - T_SOURCE + 6) / 22));
  const missingAt = T_SOURCE + (p.terms ? 44 : 28);

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={total} glowY={36} />
      {p.music ? <Audio src={staticFile(p.music)} /> : null}

      {/* the region behind the opening: the site's base map, Iran lit, rings going out from it */}
      {frame < T_RACE + 6 ? (
        <svg
          width={W}
          height={H}
          style={{
            position: "absolute",
            inset: 0,
            opacity: leave(frame, T_RACE + 4, 16),
            transform: `scale(${interpolate(frame, [0, T_RACE], [1, 1.07], clamped)})`,
            transformOrigin: `${heart[0]}px ${heart[1]}px`,
            maskImage: "linear-gradient(180deg, transparent 37%, #000 47%, #000 76%, transparent 93%)",
            WebkitMaskImage: "linear-gradient(180deg, transparent 37%, #000 47%, #000 76%, transparent 93%)",
          }}
        >
          <defs>
            <filter id="region-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          <path d={map.land} fill="rgba(237,230,214,.045)" stroke={C.mapLine} strokeWidth="1.4" />
          <path d={map.borders} fill="none" stroke={C.mapLine} strokeWidth="1.4" strokeDasharray="5 5" />
          {[0, 1].map((k) => {
            const t = ((frame + k * 38) % 76) / 76;
            return <circle key={k} cx={heart[0]} cy={heart[1]} r={70 + 600 * t} fill="none" stroke={C.acc} strokeWidth="2" opacity={0.3 * (1 - t) * Math.min(1, t * 5)} />;
          })}
          <path d={map.iran} fill={C.accSoft} />
          <path d={map.iran} fill="none" stroke={C.acc} strokeWidth="11" filter="url(#region-glow)" opacity={0.2 + 0.2 * fade(frame, 0, 30)} />
          <path d={map.iran} fill="none" stroke={C.acc} strokeWidth="2.6" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - interpolate(frame, [-8, 36], [0, 1], clamped)} />
        </svg>
      ) : null}

      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />
      <Kicker style={{ position: "absolute", top: HEAD_TOP, right: SIDE, lineHeight: 1.25 }}>ایران در منطقه</Kicker>

      {/* 1 · the indicator, and the question */}
      {frame < HOOK + 2 ? (
        <div style={{ position: "absolute", top: HEAD_TOP + 76, right: SIDE, left: SIDE, opacity: leave(frame, HOOK, 12), transform: `translateY(${interpolate(frame, [HOOK - 12, HOOK], [0, -28], clamped)}px)` }}>
          <Rising text={p.title} from={-5} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: hookSize, lineHeight: 1.42, color: C.ink, textWrap: "balance" } as React.CSSProperties} />
          <Rising text="ایران کجای منطقه ایستاده؟" from={24} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 66, lineHeight: 1.5, color: C.ink2, marginTop: 26 }} tint={(w) => (w === "کجای" ? C.acc : undefined)} />
        </div>
      ) : null}

      {/* the indicator stays over the list, on one line */}
      {frame >= HOOK - 4 ? (
        <div style={{ position: "absolute", top: HEAD_TOP + 52, right: SIDE, left: SIDE, fontFamily: NASKH, fontWeight: 700, fontSize: headSize, lineHeight: 1.5, color: C.ink, whiteSpace: "nowrap", opacity: fade(frame, HOOK - 2, 12), transform: `translateY(${rise(frame, HOOK - 2, 24, 16)}px)` }}>
          <Mixed text={p.title} />
        </div>
      ) : null}

      {/* 2 · the race: every bar grows with the same front, stops at its own figure and takes its place */}
      {frame >= T_RACE
        ? rows.map((row, i) => {
            const isHome = i === home;
            if (!isHome && frame >= T_RANK + 14) return null;
            const lane = race.lanes[i];
            const done = f >= lane.stop;
            const part = done || row.share <= 0 ? 1 : Math.min(1, ran / row.share);
            const landed = lane.stop + (lane.drop ? lane.span : 0);
            // a row that drops is lifted on a card of its own, opaque while it passes over the others
            const lift = lane.drop ? Math.min(1, 4 * Math.sin(Math.PI * unit((f - lane.stop) / lane.span))) : 0;
            // 3 · the others step back and Iran's row goes up to the head of the list
            const up = isHome ? glide(unit((frame - T_RANK) / 24)) : 0;
            const sweep = isHome && frame < T_RANK ? unit((f - (LINE_UP + RUN + 26)) / 40) : null;
            return (
              <Row
                key={i}
                row={row}
                pitch={pitch}
                y={slotAt(lane, f) * (1 - up) * pitch + rise(f, lane.first * 2, 24, 14)}
                bar={row.share > 0 && ran > 0 ? Math.max(4, LIST_W * row.share * part) : 0}
                figure={done ? row.num : faNum(row.to * part, row.decimals)}
                settled={fade(f, lane.stop, 8)}
                placed={pop(f, landed - 4, 14)}
                card={isHome ? Math.max(lift, fade(f, landed - 2, 10)) : lift}
                glow={isHome ? 0.5 - 0.5 * Math.cos((frame - T_RACE) / 13) : 0}
                shine={sweep}
                opacity={fade(f, lane.first * 2, 10) * (isHome ? 1 : leave(frame, T_RANK + 12, 12))}
                z={1 + (isHome ? 1 : 0) + (lift > 0.02 ? 3 : 0)}
              />
            );
          })
        : null}

      {/* 3 · Iran's place: the ring counts to it, and the site's own line says it */}
      {frame >= T_RANK + 6 ? (
        <div style={{ position: "absolute", top: BADGE_TOP, left: 34, right: SIDE_RAIL, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${groupScale})`, transformOrigin: "50% 0" }}>
          <Badge of={p.rankOf} pos={p.rankPos} from={badgeFrom} />
          <div style={{ marginTop: 14, fontFamily: NASKH, fontWeight: 700, fontSize: rankSize, lineHeight: 1.4, color: C.ink, whiteSpace: "nowrap", opacity: fade(frame, counted - 2, 12), transform: `translateY(${rise(frame, counted - 2, 26, 16)}px)` }}>
            <Mixed text={p.rank} tint={(nth) => (nth === 0 ? C.acc : undefined)} />
          </div>
        </div>
      ) : null}
      {/* what the indicator measures */}
      {frame >= meansAt - 2 && frame < T_SOURCE + 2 ? (
        <div style={{ position: "absolute", top: BADGE_TOP + groupHeight + NOTE_GAP, right: SIDE_RAIL, left: SIDE, display: "flex", gap: 24, opacity: Math.min(fade(frame, meansAt, 14), leave(frame, T_SOURCE - 2, 10)), transform: `translateY(${rise(frame, meansAt, 28, 18)}px)` }}>
          <span style={{ width: 6, borderRadius: 3, background: C.line2, flex: "none" }} />
          <div style={{ fontFamily: VAZIR, fontWeight: 400, fontSize: meansSize, lineHeight: 1.8, color: C.ink, ...PRETTY }}>{p.means}</div>
        </div>
      ) : null}

      {/* 4 · where the figures come from, and on what terms */}
      {frame >= T_SOURCE ? (
        <div style={{ position: "absolute", top: BADGE_TOP + groupHeight * squeeze + NOTE_GAP, right: SIDE_RAIL, left: SIDE }}>
          <div style={{ opacity: fade(frame, T_SOURCE + 6, 12), transform: `translateY(${rise(frame, T_SOURCE + 6, 26, 16)}px)` }}>
            <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, lineHeight: 1.4, color: C.acc }}>منبع</div>
            <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: sourceSize, lineHeight: 1.7, color: C.ink, marginTop: 4, ...PRETTY }}>{p.source}</div>
          </div>
          {p.terms ? (
            <div style={{ display: "flex", gap: 22, marginTop: 26, opacity: fade(frame, T_SOURCE + 26, 12), transform: `translateY(${rise(frame, T_SOURCE + 26, 24, 16)}px)` }}>
              <span style={{ width: 8, borderRadius: 4, background: C.claim, flex: "none" }} />
              <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 36, lineHeight: 1.65, color: C.ink, ...BALANCED }}>{p.terms}</div>
            </div>
          ) : null}
          {p.missing ? (
            <div style={{ display: "flex", gap: 22, marginTop: 22, opacity: fade(frame, missingAt, 12), transform: `translateY(${rise(frame, missingAt, 24, 16)}px)` }}>
              <span style={{ width: 8, borderRadius: 4, background: C.line2, flex: "none" }} />
              <div style={{ fontFamily: VAZIR, fontWeight: 400, fontSize: 32, lineHeight: 1.65, color: C.ink2 }}>{p.missing}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Foot opacity={fade(frame, T_SOURCE + 58, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
