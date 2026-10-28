// «مذاکره، دور به دور»: every counted round of the nuclear talks since 2003 on one
// thread. The periods are its knots, the rounds of the last two years its beads,
// each drawn by what came of it, and the last bead is where it stands now.
// Every word and every count comes from the props the site sends.
import React from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile } from "remotion";
import { loadFont as loadVazir } from "@remotion/google-fonts/Vazirmatn";
import { loadFont as loadNaskh } from "@remotion/google-fonts/NotoNaskhArabic";
import { Backdrop, Brand, C, Count, Foot, H, Kicker, NASKH, Panel, Progress, SIDE, SIDE_RAIL, VAZIR, W, clamped, during, ease, faDigits, fade, grow, leave, paint, pop, readFrames, rise, starts, useCurrentFrame } from "./kit";
import type { TalkResult, TalksProps } from "./props";
import { scenes, type Cues } from "./voice";

const KNOT_AT = 14; // frames into the periods before the first knot
const BEAD_AT = 24; // frames into the last two years before the first bead
const SPOT = 26; // how long each kind of result is held in the light

// the thread: it runs down the frame beside the periods, clear of Instagram's buttons, and goes on from there into the last two years
const THREAD = 866;
const THREAD_TOP = 334;

// agreement is blue, no result is red, waiting is amber; the rest stays ink
const TONE: Record<TalkResult, { color: string; soft: string; ink: string }> = {
  deal: { color: C.acc, soft: C.accSoft, ink: C.acc },
  step: { color: C.acc, soft: C.accSoft, ink: C.acc },
  open: { color: C.ink2, soft: C.line, ink: C.ink },
  none: { color: C.strike, soft: C.strikeSoft, ink: C.strike },
  pending: { color: C.claim, soft: C.claimSoft, ink: C.claim },
};
const toneOf = (result: TalkResult) => TONE[result] ?? TONE.open;

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- measuring ----------
// A place beside a bead, a date, an outcome come in every length. So that a name never
// runs into its neighbour and a long text is cut on a word, widths are measured with the
// real letters. The two faces of the kit are asked for once more only to know when they
// are in; no frame is taken before that.

type Face = "vazir" | "naskh";
const faces = [loadVazir("normal", { weights: ["400", "500", "700", "800"], subsets: ["arabic", "latin"] }), loadNaskh("normal", { weights: ["500", "700"], subsets: ["arabic"] })];
let pen: CanvasRenderingContext2D | null = null;
const measured = new Map<string, number>();

/** Joiners and vowel marks take no room. */
const roomless = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  return c === 0x200c || c === 0x200d || (c >= 0x64b && c <= 0x65f) || c === 0x670;
};
/** How wide a line is at a size (px): measured in the bold weight, the widest in use. Before the faces are in, a fair guess. */
const widthOf = (text: string, size: number, face: Face = "vazir") => {
  if (!pen) {
    let em = 0;
    for (const ch of text) em += roomless(ch) ? 0 : ch === " " ? 0.26 : face === "vazir" ? 0.5 : 0.46;
    return em * size;
  }
  const key = `${face}:${text}`;
  let em = measured.get(key);
  if (em === undefined) {
    pen.font = face === "vazir" ? `700 100px ${VAZIR}` : `700 100px "${NASKH}"`;
    em = pen.measureText(text).width / 100;
    measured.set(key, em);
  }
  return em * size;
};
/** How many lines a text takes at a size in a width, wrapped word by word as a browser does. */
const linesOf = (text: string, size: number, width: number, face: Face = "vazir") => {
  const space = widthOf(" ", size, face);
  let lines = 1;
  let used = 0;
  for (const word of text.trim().split(/\s+/)) {
    const w = widthOf(word, size, face);
    if (used && used + space + w > width - 3) {
      lines += 1;
      used = w;
    } else used += (used ? space : 0) + w;
  }
  return lines;
};
/** The largest of `sizes` at which a text takes at most `lines` lines of `width`; at the smallest, whole words are dropped from its end until it does. */
function fit(text: string, width: number, lines: number, sizes: number[], face: Face = "vazir") {
  const whole = text.trim();
  for (const size of sizes) if (linesOf(whole, size, width, face) <= lines) return { text: whole, size };
  const size = sizes[sizes.length - 1];
  let cut = whole;
  while (cut.includes(" ") && linesOf(`${cut}…`, size, width, face) > lines) cut = cut.slice(0, cut.lastIndexOf(" "));
  return { text: `${cut.replace(/[\s،؛:,.(«–-]+$/u, "")}…`, size };
}
/** True once both faces are in and text can be measured; the frame waits for it. */
function useFaces() {
  const [ready, setReady] = React.useState(pen !== null);
  const [handle] = React.useState(() => (pen ? null : delayRender("Talks: waiting for its two faces, to measure text", { timeoutInMilliseconds: 60000 })));
  React.useEffect(() => {
    if (pen) return undefined;
    let alive = true;
    Promise.all(faces.map((face) => face.waitUntilDone()))
      .then(() => {
        pen = document.createElement("canvas").getContext("2d");
      })
      .catch(() => undefined) // the guess stays in use
      .then(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  // released only after the measured layout is on the page
  React.useEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);
  return ready;
}

/** A display line of Naskh with its digits in Vazirmatn: Naskh's own digits sit too far apart. */
const digitsInVazir = (text: string) => text.split(/([0-9۰-۹]+)/).map((part, i) => (i % 2 ? <span key={i} style={{ fontFamily: VAZIR, fontSize: "0.84em" }}>{faDigits(part)}</span> : part));

/** The lengths of the scenes: the count, the periods, the last two years bead by bead, where it stands now, the caveat and the address. */
function plan(p: TalksProps) {
  const eras = p.periods.length;
  const rounds = p.recent.length;
  // the kinds of result that have at least one bead: each is held in the light once
  const kinds = p.tally.filter((t) => t.n > 0);
  // many periods or many rounds arrive faster, so the Reel stays about as long
  const knotStep = clampN(Math.round(126 / Math.max(1, eras)), 9, 22);
  const beadStep = clampN(Math.round(170 / Math.max(1, rounds - 1)), 4, 12);
  const knotsIn = KNOT_AT + Math.max(0, eras - 1) * knotStep + 18;
  const beadsIn = BEAD_AT + Math.max(0, rounds - 1) * beadStep + 14;
  const last = p.recent[rounds - 1];
  const lengths = [
    96,
    eras ? knotsIn + 20 + clampN(Math.round(readFrames(p.floor) * 0.66), 80, 104) : 0,
    rounds ? beadsIn + 8 + kinds.length * SPOT + 34 : 0,
    last ? clampN(Math.round(readFrames(`${last.date} ${last.place} ${last.mediator ?? ""} ${last.outcome}`) * 0.75) + 60, 170, 216) : 0,
    clampN(readFrames(p.note) - 10, 126, 150),
  ];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0), knotStep, beadStep, knotsIn, beadsIn, kinds };
}
export const talksDuration = (p: TalksProps) => plan(p).total;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
export const talksCues = (p: TalksProps): Cues => {
  const { at } = plan(p);
  return { ...scenes(at), last: at[3] };
};

const body: React.CSSProperties = { position: "absolute", right: SIDE, left: SIDE, direction: "rtl" };
const heading: React.CSSProperties = { ...body, top: 216, fontFamily: NASKH, fontWeight: 700, fontSize: 88, lineHeight: 1.3, color: C.ink };

/** One round as a bead, drawn by what came of it. `r` is the radius of an ordinary bead (an agreement is larger), `k` how far it has arrived, `halo` how much it is lit, `seen` how bright it is, `beat` the phase of the ripple of a round still waiting. */
const Bead: React.FC<{ result: TalkResult; x: number; y: number; r: number; k?: number; halo?: number; seen?: number; beat?: number }> = ({ result, x, y, r, k = 1, halo = 0, seen = 1, beat }) => {
  const tone = toneOf(result);
  const big = result === "deal" ? r * 1.36 : r;
  const line = Math.max(2.2, r * 0.21);
  const c = r * 0.36;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      {halo > 0 ? <circle r={big + r * 0.66} fill="none" stroke={tone.color} strokeWidth={line * 0.7} opacity={0.6 * halo} /> : null}
      {result === "pending" && beat !== undefined ? <circle r={r * (1.2 + 0.7 * beat)} fill="none" stroke={tone.color} strokeWidth={line * 0.7} opacity={0.6 * (1 - beat) ** 2} /> : null}
      {/* the thread never shows through a bead, however dim the bead is */}
      <circle r={big + line / 2} fill={C.bg} />
      <g opacity={seen}>
        {result === "deal" ? (
          <>
            <circle r={big} fill={C.acc} />
            <circle r={big + r * 0.34} fill="none" stroke={C.accLine} strokeWidth={line * 0.6} />
          </>
        ) : result === "step" ? (
          <>
            <path d={`M${-r} 0A${r} ${r} 0 0 0 ${r} 0Z`} fill={C.acc} />
            <circle r={r} fill="none" stroke={C.acc} strokeWidth={line} />
          </>
        ) : result === "none" ? (
          <>
            <circle r={r} fill={C.strikeSoft} stroke={C.strike} strokeWidth={line} />
            <path d={`M${-c} ${-c}L${c} ${c}M${c} ${-c}L${-c} ${c}`} fill="none" stroke={C.strike} strokeWidth={line} strokeLinecap="round" />
          </>
        ) : result === "pending" ? (
          <>
            <circle r={r} fill={C.claimSoft} stroke={C.claim} strokeWidth={line} />
            <circle r={r * 0.34} fill={C.claim} />
          </>
        ) : (
          <circle r={r} fill="none" stroke={C.ink2} strokeWidth={line} />
        )}
      </g>
    </g>
  );
};

/** A display line in Naskh that arrives word by word. */
const Said: React.FC<{ text: string; from: number; style?: React.CSSProperties }> = ({ text, from, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: NASKH, direction: "rtl", ...style }}>
      {text
        .trim()
        .split(/\s+/)
        .map((word, i) => (
          <span key={i} style={{ display: "inline-block", marginLeft: "0.26em", opacity: fade(frame, from + i * 3, 9), transform: `translateY(${rise(frame, from + i * 3, 24, 14)}px)` }}>
            {digitsInVazir(word)}
          </span>
        ))}
    </div>
  );
};

// ---------- 1 · the count ----------

const Hook: React.FC<{ p: TalksProps; until: number }> = ({ p, until }) => {
  const frame = useCurrentFrame();
  const rounds = Math.max(0, Math.round(p.total));
  const places = String(rounds).length;
  const size = places > 2 ? 290 : 400;
  // the figure is already running on the first frame: the Reel never opens on a still
  const counted = rounds * grow(frame, -3, 64);
  const pitch = clampN((W - 2 * SIDE) / Math.max(1, rounds), 9, 22);
  // when the count has settled, one soft wave runs along the ticks, the way the eye reads
  const wave = interpolate(frame, [50, 84], [-8, rounds + 8], clamped);
  return (
    <div style={{ ...body, top: 290, opacity: leave(frame, until, 12) }}>
      <Kicker size={46}>مذاکره، دور به دور</Kicker>
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 6 }}>
        {/* tabular digits in a box as wide as the final figure: nothing shakes or shifts as it runs */}
        <span style={{ flex: "none", minWidth: places * 0.625 * size, marginRight: -0.05 * size, textAlign: "right", fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1.04, color: C.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.06em" }}>
          <Count to={rounds} from={-3} length={64} />
        </span>
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: places > 2 ? 100 : 112, lineHeight: 1.3, color: C.ink2, opacity: fade(frame, -8, 12), transform: `translateY(${rise(frame, -4, 34, 18)}px)` }}>
          دور
          <br />
          گفت‌وگو
        </span>
      </div>
      <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 6, opacity: fade(frame, 28, 12), transform: `translateY(${rise(frame, 28, 30, 18)}px)` }}>از {faDigits(p.since)} تا امروز</div>
      {/* one tick for every round, strung on one thread */}
      <div style={{ display: "flex", flexWrap: "wrap", rowGap: 14, marginTop: 44 }}>
        {Array.from({ length: rounds }, (_, k) => {
          const on = clampN(counted - k, 0, 1);
          const lift = 1 + 0.26 * Math.exp(-(((k - wave) / 2.8) ** 2));
          return (
            <span key={k} style={{ width: pitch, height: 60, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", opacity: on, background: `linear-gradient(${C.ink3}, ${C.ink3}) center / 100% 3px no-repeat` }}>
              <span style={{ width: Math.max(4, pitch * 0.36), height: 46 * (0.5 + 0.5 * on) * lift, borderRadius: 3, background: C.ink2 }} />
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- 2 · the periods ----------

const TEXT_EDGE = 800; // the right edge of what is written beside the thread

/** The periods as rows beside the thread: a row is as tall as its title needs, the room left over is shared out between the rows, and many periods are set smaller. */
function ladder(p: TalksProps) {
  const TOP = 372;
  const BOTTOM = 1356;
  const n = p.periods.length;
  const scales = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52];
  for (const s of scales) {
    const titleSize = Math.round(36 * s);
    const countWidth = Math.round(96 * s);
    const textWidth = TEXT_EDGE - SIDE - countWidth - 24;
    const head = 40 * s;
    const titles = p.periods.map((e) => fit(e.title, textWidth, 2, [titleSize]).text);
    const heights = titles.map((title) => head + linesOf(title, titleSize, textWidth) * titleSize * 1.36);
    const gap = n > 1 ? Math.min(96, (BOTTOM - TOP - heights.reduce((a, b) => a + b, 0)) / (n - 1)) : 0;
    if (gap >= 22 * s || s === scales[scales.length - 1]) {
      const knots: number[] = [];
      let top = TOP;
      for (const height of heights) {
        knots.push(top + head / 2);
        top += height + gap;
      }
      return { s, titleSize, countWidth, textWidth, head, titles, knots, bottom: top - gap };
    }
  }
  throw new Error("unreachable");
}

const Eras: React.FC<{ p: TalksProps; from: number; until: number; step: number; knotsIn: number }> = ({ p, from, until, step, knotsIn }) => {
  const frame = useCurrentFrame();
  const n = p.periods.length;
  const { s, titleSize, countWidth, textWidth, head, titles, knots, bottom } = ladder(p);
  const at = (k: number) => from + KNOT_AT + k * step;
  const shown = p.periods.map((e, k) => Math.round(e.count * grow(frame, at(k) + 2, 14)));
  const landed = from + knotsIn;
  // the running total is the sum of what the rows show, and it ends on the site's own figure
  const running = frame >= landed ? p.total : Math.min(p.total, shown.reduce((a, b) => a + b, 0));
  const rest = bottom + 58;
  const under = 62 * s;
  // it rides the end of the thread: it waits under the newest knot and moves on just before the next one arrives
  const stops = [from, at(0) - 2];
  const places = [THREAD_TOP, knots[0] + under];
  for (let k = 1; k < n; k += 1) {
    stops.push(at(k) - 8, at(k) - 1);
    places.push(knots[k - 1] + under, knots[k] + under);
  }
  stops.push(landed, landed + 16);
  places.push(knots[n - 1] + under, rest);
  const tip = interpolate(frame, stops, places, { ...clamped, easing: ease });
  const floor = fit(p.floor, TEXT_EDGE - SIDE, 2, [28, 26, 24]);
  const yearsSize = Math.round(28 * s);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: during(frame, from, until, 12) }}>
      <div style={{ ...heading, transform: `translateY(${rise(frame, from, 36, 18)}px)` }}>دوره‌ها</div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <line x1={THREAD} x2={THREAD} y1={THREAD_TOP} y2={tip} stroke={C.ink3} strokeWidth={4} strokeLinecap="round" />
        {/* the count is a floor: past the total the thread goes on, unsure */}
        <line x1={THREAD} x2={THREAD} y1={rest + 50} y2={rest + 50 + 92 * grow(frame, landed + 18, 22)} stroke={C.ink3} strokeWidth={4} strokeLinecap="round" strokeDasharray="1 13" strokeDashoffset={-(frame - from) * 0.45} opacity={fade(frame, landed + 18, 10)} />
        {knots.map((y, k) => (
          <circle key={k} cx={THREAD} cy={y} r={13 * s * pop(frame, at(k) - 2, 14)} fill={C.bg} stroke={C.ink} strokeWidth={4} />
        ))}
      </svg>
      {p.periods.map((e, k) => {
        const years = faDigits(e.years);
        const tick = Math.min(11, (textWidth - widthOf(years, yearsSize) - 30) / Math.max(1, e.count));
        return (
          <div key={k} style={{ position: "absolute", top: knots[k] - head / 2, right: W - TEXT_EDGE, left: SIDE, display: "flex", alignItems: "flex-start", gap: 24, direction: "rtl", opacity: fade(frame, at(k), 10), transform: `translateX(${rise(frame, at(k), 16, 16)}px)` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, height: head }}>
                <span style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: yearsSize, color: C.ink3, whiteSpace: "nowrap" }}>{years}</span>
                {/* one tick for each round of the period */}
                <span style={{ display: "flex" }}>
                  {Array.from({ length: Math.max(0, Math.round(e.count)) }, (_, i) => (
                    <span key={i} style={{ width: tick, flex: "none", display: "flex", justifyContent: "center", opacity: i < shown[k] ? 1 : 0 }}>
                      <span style={{ width: Math.max(2.5, tick * 0.55), height: 24 * s, borderRadius: 3, background: C.ink2 }} />
                    </span>
                  ))}
                </span>
              </div>
              <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: titleSize, lineHeight: 1.36, color: C.ink, maxHeight: 2 * titleSize * 1.36, overflow: "hidden" }}>{titles[k]}</div>
            </div>
            <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: Math.round(60 * s), lineHeight: 1.2, color: C.ink, flex: "none", width: countWidth, textAlign: "left", opacity: shown[k] || frame >= landed ? 1 : 0 }}>{faDigits(shown[k])}</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: tip - 33, left: THREAD - 80, width: 160, display: "flex", justifyContent: "center", direction: "rtl", opacity: fade(frame, from + 2, 8) }}>
        <span style={{ boxSizing: "border-box", minWidth: 84, height: 66, padding: "0 16px", borderRadius: 33, background: C.panel, border: `2px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 40, color: C.ink, transform: `scale(${1 + 0.14 * grow(frame, landed, 16)})` }}>{faDigits(running)}</span>
      </div>
      <div style={{ position: "absolute", top: rest - 30, height: 60, right: W - THREAD + 72, display: "flex", alignItems: "center", fontFamily: VAZIR, fontWeight: 700, fontSize: 36, color: C.ink, whiteSpace: "nowrap", opacity: fade(frame, landed + 6, 12) }}>دور گفت‌وگو</div>
      <div style={{ position: "absolute", top: rest + 48, right: W - TEXT_EDGE, left: SIDE, fontFamily: VAZIR, fontSize: floor.size, lineHeight: 1.65, color: C.ink2, direction: "rtl", maxHeight: 2 * floor.size * 1.65, overflow: "hidden", opacity: fade(frame, landed + 20, 14), transform: `translateY(${rise(frame, landed + 20, 20, 16)}px)` }}>{floor.text}</div>
    </div>
  );
};

// ---------- 3 · the last two years ----------

const PATH_LEFT = 372;
const TALLY_WIDTH = 262;

/** The rounds as one winding thread, read like a page (right to left, then back): where each bead sits, the path through them, and how far along the path each bead is. */
function weave(n: number) {
  const TOP = 452;
  const BOTTOM = 1450;
  const TURN = 60;
  const from = THREAD - TURN;
  const to = PATH_LEFT + TURN;
  let per = Math.min(3, Math.max(1, n));
  while (per < n && (Math.ceil(n / per) - 1) * 132 > BOTTOM - TOP) per += 1;
  const rows = Math.ceil(n / per);
  const gap = rows > 1 ? clampN((BOTTOM - TOP) / (rows - 1), 132, 170) : 0;
  const space = per > 1 ? (from - to) / (per - 1) : 0;
  const quarter = (Math.PI * TURN) / 2;
  const x: number[] = [];
  const y: number[] = [];
  const row: number[] = [];
  const along: number[] = [];
  // it comes down from the periods above and turns into the first row
  let d = `M${THREAD} ${THREAD_TOP}V${TOP - TURN}A${TURN} ${TURN} 0 0 1 ${from} ${TOP}`;
  let length = TOP - TURN - THREAD_TOP + quarter;
  for (let j = 0; j < n; j += 1) {
    const r = Math.floor(j / per);
    const col = j % per;
    const leftward = r % 2 === 0;
    const px = leftward ? from - col * space : to + col * space;
    const py = TOP + r * gap;
    if (col > 0) {
      d += `H${px}`;
      length += space;
    } else if (r > 0) {
      // the end of the row above: out, down and back in
      const edge = leftward ? THREAD : PATH_LEFT;
      const sweep = leftward ? 1 : 0;
      d += `A${TURN} ${TURN} 0 0 ${sweep} ${edge} ${py - gap + TURN}V${py - TURN}A${TURN} ${TURN} 0 0 ${sweep} ${px} ${py}`;
      length += 2 * quarter + gap - 2 * TURN;
    }
    x.push(px);
    y.push(py);
    row.push(r);
    along.push(length);
  }
  return { x, y, row, along, d, length, r: 23 * clampN(space ? space / 150 : 1, 0.5, 1) };
}

const TAG = 28;
const TAG_LINE = 36;
/** A name on one line, or, when it is long, on two lines of about the same width. */
function inTwo(text: string) {
  const words = text.split(" ");
  let best = [text];
  let width = widthOf(text, TAG);
  if (words.length < 2 || width <= 200) return best;
  for (let i = 1; i < words.length; i += 1) {
    const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const w = Math.max(widthOf(pair[0], TAG), widthOf(pair[1], TAG));
    if (w < width) {
      width = w;
      best = pair;
    }
  }
  return best;
}
/** The place of each agreement and of the last round, under its bead or over it: on the side where it sits nearer its bead, and never over another name. A name that fits nowhere is left out. */
function tags(p: TalksProps, g: ReturnType<typeof weave>) {
  const n = p.recent.length;
  const wanted = [n - 1, ...p.recent.map((round, j) => (round.result === "deal" && j < n - 1 ? j : -1)).filter((j) => j >= 0).reverse()];
  const placed: { j: number; lines: string[]; w: number; h: number; x: number; y: number; side: number }[] = [];
  for (const j of wanted) {
    const lines = inTwo(fit(p.recent[j].place, 380, 2, [TAG]).text);
    const w = Math.max(...lines.map((line) => widthOf(line, TAG))) + 16;
    const h = lines.length * TAG_LINE;
    const edge = p.recent[j].result === "deal" ? g.r * 1.7 : g.r;
    const sides = [1, -1].map((side) => {
      // between two rows the thread turns on one side only: a name keeps clear of the turn there, and of the tally or of Instagram's buttons on the other side
      const turnsLeft = (g.row[j] + (side > 0 ? 0 : 1)) % 2 === 0;
      const lo = (turnsLeft ? PATH_LEFT + 22 : SIDE + TALLY_WIDTH + 24) + w / 2;
      const hi = (turnsLeft ? W - SIDE_RAIL : THREAD - 22) - w / 2;
      const x = clampN(g.x[j], lo, Math.max(lo, hi));
      return { x, y: g.y[j] + side * (edge + 16 + h / 2), side, off: Math.abs(x - g.x[j]) };
    });
    sides.sort((a, b) => a.off - b.off || b.side - a.side);
    const spot = sides.find((o) => placed.every((t) => Math.abs(t.y - o.y) >= (t.h + h) / 2 + 6 || Math.abs(t.x - o.x) >= (t.w + w) / 2 + 14));
    if (spot) placed.push({ j, lines, w, h, x: spot.x, y: spot.y, side: spot.side });
  }
  return placed;
}

const Beads: React.FC<{ p: TalksProps; from: number; until: number; step: number; beadsIn: number; kinds: TalksProps["tally"] }> = ({ p, from, until, step, beadsIn, kinds }) => {
  const frame = useCurrentFrame();
  const n = p.recent.length;
  const g = weave(n);
  const at = (j: number) => from + BEAD_AT + j * step;
  const drawn = interpolate(frame, [from + 2, ...p.recent.map((_, j) => at(j))], [0, ...g.along], clamped);
  const all = from + beadsIn;
  // when every bead is in, each kind of result is held in the light in turn, with its count beside it
  const pass = during(frame, all + 5, all + 11 + kinds.length * SPOT, 8);
  const light = (result: TalkResult) => {
    const i = kinds.findIndex((t) => t.result === result);
    return i < 0 ? 0 : during(frame, all + 5 + i * SPOT, all + 11 + (i + 1) * SPOT, 8);
  };
  const seen = (result: TalkResult) => 1 - 0.64 * pass * (1 - light(result));
  const pitch = clampN(980 / Math.max(1, p.tally.length), 120, 190);
  const names = tags(p, g);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: during(frame, from, until, 12) }}>
      <div style={{ ...heading, transform: `translateY(${rise(frame, from, 36, 18)}px)` }}>دو سال گذشته</div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={g.d} fill="none" stroke={C.ink3} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${g.length} ${g.length}`} strokeDashoffset={g.length - drawn} opacity={drawn > 0 ? 1 : 0} />
        {/* a short tie from each named bead to its name */}
        {names.map((t) => {
          const round = p.recent[t.j];
          const edge = round.result === "deal" ? g.r * 1.7 : g.r;
          return <line key={`tie-${t.j}`} x1={g.x[t.j]} x2={g.x[t.j]} y1={g.y[t.j] + t.side * (edge + 5)} y2={g.y[t.j] + t.side * (edge + 14)} stroke={toneOf(round.result).color} strokeWidth={2.5} strokeLinecap="round" opacity={0.7 * fade(frame, at(t.j) + 6, 10) * seen(round.result)} />;
        })}
        {p.recent.map((round, j) =>
          frame >= at(j) ? <Bead key={j} result={round.result} x={g.x[j]} y={g.y[j]} r={g.r} k={pop(frame, at(j), 14)} halo={pass * light(round.result)} seen={seen(round.result)} beat={((frame - at(j)) % 48) / 48} /> : null,
        )}
      </svg>
      {names.map((t) => (
        <div key={t.j} style={{ position: "absolute", left: t.x - t.w / 2, width: t.w, top: t.y - t.h / 2, lineHeight: `${TAG_LINE}px`, textAlign: "center", whiteSpace: "nowrap", fontFamily: VAZIR, fontWeight: 500, fontSize: TAG, color: toneOf(p.recent[t.j].result).ink, direction: "rtl", opacity: fade(frame, at(t.j) + 6, 10) * seen(p.recent[t.j].result) }}>
          {t.lines.map((line, i) => (
            <div key={i}>{faDigits(line)}</div>
          ))}
        </div>
      ))}
      {/* the tally: each count goes up as a bead of its kind arrives, and ends on the site's own figure */}
      {p.tally.map((t, k) => {
        const arrivals = p.recent.map((round, j) => (round.result === t.result ? at(j) + 4 : -1)).filter((f) => f >= 0 && f <= frame);
        const count = frame >= all ? t.n : Math.min(t.n, arrivals.length);
        const bump = arrivals.length && frame < all + 12 ? 1 - fade(frame, arrivals[arrivals.length - 1], 10) : 0;
        const tone = toneOf(t.result);
        return (
          <div key={k} style={{ position: "absolute", top: 398 + k * pitch, left: SIDE, width: TALLY_WIDTH, direction: "rtl", opacity: fade(frame, from + 6 + k * 4, 12) * seen(t.result) }}>
            {/* nothing is written before the first bead of the kind: a zero would look like one more bead */}
            <div style={{ display: "flex", height: 84 }}>
              <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 84, lineHeight: 1, color: tone.ink, opacity: arrivals.length || frame >= all ? 1 : 0, transform: `scale(${1 + 0.12 * bump})`, transformOrigin: "50% 60%" }}>{faDigits(count)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 2 }}>
              <svg width={44} height={44} viewBox="-22 -22 44 44" style={{ flex: "none" }}>
                <Bead result={t.result} x={0} y={0} r={12.5} />
              </svg>
              <span style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 30, lineHeight: "44px", color: C.ink2 }}>{t.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- 4 · where it stands now ----------

const Now: React.FC<{ p: TalksProps; from: number; until: number }> = ({ p, from, until }) => {
  const frame = useCurrentFrame();
  const last = p.recent[p.recent.length - 1];
  const tone = toneOf(last.result);
  // the end of the thread: the rounds just before, and this one
  const tail = p.recent.slice(-6);
  const END = 164;
  const START = W - SIDE_RAIL;
  const LINE = 436;
  const TOP = 566;
  const xOf = (i: number) => END + (tail.length - 1 - i) * 126;
  const tip = interpolate(frame, [from + 2, from + 26], [START, END], { ...clamped, easing: ease });
  const inner = W - SIDE - SIDE_RAIL - 80;
  const date = fit(last.date, inner, 3, [38, 34, 30]);
  const place = fit(last.place, inner, 2, [108, 92, 76, 62, 52], "naskh");
  const mediator = last.mediator ? fit(`میانجی: ${last.mediator}`, inner, 2, [36, 32]) : null;
  const outcome = fit(last.outcome, inner, 3, [46, 40, 36, 32]);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: during(frame, from, until, 12) }}>
      <div style={{ ...heading, transform: `translateY(${rise(frame, from, 36, 18)}px)` }}>اکنون</div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="talks-thread-in" gradientUnits="userSpaceOnUse" x1={START} y1={0} x2={START - 150} y2={0}>
            <stop offset="0" stopColor={C.ink3} stopOpacity="0" />
            <stop offset="1" stopColor={C.ink3} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* drawn as a thin bar: a level line has no height for a gradient to fill */}
        <rect x={tip} y={LINE - 2} width={START - tip} height={4} fill="url(#talks-thread-in)" />
        <line x1={END} x2={END} y1={LINE} y2={LINE + (TOP - 30 - LINE) * grow(frame, from + 28, 12)} stroke={C.ink3} strokeWidth={4} opacity={fade(frame, from + 28, 4)} />
        {tail.map((round, i) =>
          i < tail.length - 1 ? (
            <Bead key={i} result={round.result} x={xOf(i)} y={LINE} r={15} k={clampN((xOf(i) + 26 - tip) / 26, 0, 1)} seen={0.6} />
          ) : (
            <Bead key={i} result={round.result} x={END} y={LINE} r={30} k={pop(frame, from + 22, 16)} halo={round.result === "pending" ? 0 : 0.55 + 0.3 * Math.sin((frame - from) / 9)} beat={((frame - from) % 48) / 48} />
          ),
        )}
      </svg>
      <Panel style={{ position: "absolute", top: TOP, left: SIDE, right: SIDE_RAIL, padding: "64px 40px 42px", opacity: fade(frame, from + 30, 12), transform: `translateY(${rise(frame, from + 30, 30, 18)}px)` }}>
        {/* what came of it, in the colour and the sign of its bead */}
        <div style={{ position: "absolute", top: -34, left: 30, height: 66, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 16px 0 28px", borderRadius: 33, background: `linear-gradient(${tone.soft}, ${tone.soft}), ${C.bg}`, border: `2.5px solid ${tone.color}`, fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: tone.ink, whiteSpace: "nowrap", transform: `scale(${pop(frame, from + 40, 16)})` }}>
          <svg width={40} height={40} viewBox="-20 -20 40 40" style={{ flex: "none" }}>
            <Bead result={last.result} x={0} y={0} r={11} />
          </svg>
          {last.resultName}
        </div>
        <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: date.size, lineHeight: 1.6, color: C.ink2, maxHeight: 3 * date.size * 1.6, overflow: "hidden", opacity: fade(frame, from + 44, 12) }}>{faDigits(date.text)}</div>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: place.size, lineHeight: 1.5, color: C.ink, maxHeight: 2 * place.size * 1.5, overflow: "hidden", opacity: fade(frame, from + 50, 12), transform: `translateY(${rise(frame, from + 50, 26, 18)}px)` }}>{digitsInVazir(place.text)}</div>
        {mediator ? (
          <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: mediator.size, lineHeight: 1.6, color: C.ink, marginTop: 8, maxHeight: 2 * mediator.size * 1.6, overflow: "hidden", opacity: fade(frame, from + 60, 12) }}>
            <span style={{ color: C.ink3 }}>میانجی: </span>
            {faDigits(mediator.text.replace(/^میانجی:\s*/u, ""))}
          </div>
        ) : null}
        <div style={{ height: 2, background: C.line2, margin: "28px 0 22px", transform: `scaleX(${grow(frame, from + 64, 22)})`, transformOrigin: "100% 50%" }} />
        <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: outcome.size, lineHeight: 1.7, color: C.ink, maxHeight: 3 * outcome.size * 1.7, overflow: "hidden", opacity: fade(frame, from + 72, 14), transform: `translateY(${rise(frame, from + 72, 24, 18)}px)` }}>{faDigits(outcome.text)}</div>
      </Panel>
    </div>
  );
};

// ---------- 5 · the caveat, and where the whole list is ----------

const Close: React.FC<{ p: TalksProps; from: number }> = ({ p, from }) => {
  const frame = useCurrentFrame();
  const n = p.recent.length;
  const width = W - 2 * SIDE;
  const pitch = n > 1 ? Math.min(60, (width - 44) / (n - 1)) : 0;
  const r = clampN(pitch ? pitch * 0.27 : 14, 4, 14);
  const xOf = (j: number) => width - 22 - j * pitch;
  const tip = interpolate(frame, [from + 2, from + 34], [width, xOf(n - 1)], { ...clamped, easing: ease });
  const note = fit(p.note, width, 4, [68, 60, 52, 46], "naskh");
  return (
    <div style={{ ...body, top: 300, opacity: fade(frame, from, 12) }}>
      {/* the same beads once more, small and on one line: what the caveat is about */}
      {n ? (
        <svg width={width} height={64} viewBox={`0 0 ${width} 64`} style={{ display: "block" }}>
          <line x1={width} x2={tip} y1={32} y2={32} stroke={C.ink3} strokeWidth={3} strokeLinecap="round" />
          {p.recent.map((round, j) => (
            <Bead key={j} result={round.result} x={xOf(j)} y={32} r={r} k={clampN((xOf(j) + 20 - tip) / 20, 0, 1)} halo={j === n - 1 && round.result !== "pending" ? 0.55 + 0.3 * Math.sin((frame - from) / 9) : 0} beat={j === n - 1 ? ((frame - from) % 48) / 48 : undefined} />
          ))}
        </svg>
      ) : null}
      <Said text={note.text} from={from + 8} style={{ fontWeight: 700, fontSize: note.size, lineHeight: 1.75, color: C.ink, marginTop: 34 }} />
      <div style={{ display: "flex", marginTop: 40, opacity: fade(frame, from + 50, 12), transform: `translateY(${rise(frame, from + 50, 20, 16)}px)` }}>
        <span style={{ padding: "12px 26px", borderRadius: 32, border: `2px solid ${C.line2}`, fontFamily: VAZIR, fontWeight: 500, fontSize: 34, color: C.ink2, whiteSpace: "nowrap" }}>به‌روز تا {faDigits(p.asOf)}</span>
      </div>
    </div>
  );
};

export const Talks: React.FC<TalksProps> = (p) => {
  paint("talks");
  const frame = useCurrentFrame();
  useFaces();
  const { lengths, at, total, knotStep, beadStep, knotsIn, beadsIn, kinds } = plan(p);
  const [HOOK, ERAS, BEADS, NOW] = lengths;
  const [, T_ERAS, T_BEADS, T_NOW, T_CLOSE] = at;
  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={total} glowY={34} />
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />

      {frame < HOOK + 12 ? <Hook p={p} until={HOOK} /> : null}
      {ERAS && frame >= T_ERAS - 2 && frame < T_BEADS + 12 ? <Eras p={p} from={T_ERAS} until={T_BEADS} step={knotStep} knotsIn={knotsIn} /> : null}
      {/* the thread itself stays while the periods give way to the last two years */}
      {ERAS && BEADS ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <line x1={THREAD} x2={THREAD} y1={THREAD_TOP} y2={THREAD_TOP + 56} stroke={C.ink3} strokeWidth={4} strokeLinecap="round" opacity={during(frame, T_BEADS - 16, T_BEADS + 16, 6)} />
        </svg>
      ) : null}
      {BEADS && frame >= T_BEADS - 2 && frame < T_NOW + 12 ? <Beads p={p} from={T_BEADS} until={T_NOW} step={beadStep} beadsIn={beadsIn} kinds={kinds} /> : null}
      {NOW && frame >= T_NOW - 2 && frame < T_CLOSE + 12 ? <Now p={p} from={T_NOW} until={T_CLOSE} /> : null}
      {frame >= T_CLOSE - 2 ? <Close p={p} from={T_CLOSE} /> : null}

      <Foot opacity={fade(frame, T_CLOSE + 62, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
