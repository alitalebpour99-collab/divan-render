// «پنج عدد»: five of Iran's World Bank series on one theme, counted down from
// five to one (a countdown, not a ranking). Each figure arrives as a large
// Persian numeral that lands with a hit; beside it its board swings down like
// the flap of a station's departure board and the figure flips into place tile
// by tile, counting up, as a split-flap board does; under them the series' name,
// its year, what it measures in the series' own sentence, and where the first
// year says as much, the first year beside the latest as two bars; at the foot
// of every figure its source. At the end the five together, the question to
// answer in the comments, and the source. About 23 seconds on the night ground,
// every moment with its sound.
//
// The name of each figure is a title (TITLE_MIN at least) and every other text
// at least BODY_MIN (the owner, 6 November 2026). The short version
// (`cut: "short"`) runs 15 to 25 seconds with its narrator: shorter scenes, and
// the figures' lines that would not fit left out, the one it ends on last
// (kit.tsx, shortCues).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { BODY_MIN, Backdrop, Brand, C, Kicker, NASKH, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, Sfx, TITLE_MIN, VAZIR, Words, clamped, ease, faDigits, fade, grow, paint, pop, rise, shortCues, starts, useCurrentFrame } from "./kit";
import { HOOK_FRAMES, HOOK_OVERLAP, type Look } from "./Hook";
import type { FiveCard, FiveProps } from "./props";
import { scenes, type Cues } from "./voice";

/** One figure's scene, and the closing scene with the five together (frames); the short version's are tighter. */
const CARD = 105;
const END = 108;
const CARD_SHORT = 72;
const END_SHORT = 90;
// inside a figure's scene
const HIT = 5;
const SWING = 7;
const FLIP0 = 10;
const STEP = 4;
const STEPS = 6;
const SETTLED = FLIP0 + STEPS * STEP;

const lens = (p: FiveProps) => (p.cut === "short" ? { card: CARD_SHORT, end: END_SHORT } : { card: CARD, end: END });
function plan(p: FiveProps) {
  const { card, end } = lens(p);
  const lengths = [...p.cards.map(() => card), end];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const fiveDuration = (p: FiveProps) => plan(p).total;
/**
 * The narrator's moments (lib/social/voice.ts names them «n5» … «n1»): a
 * figure's line as its numeral has landed and its board swings down; a line
 * may begin a little before (voice.ts, EARLY), never before the scene comes.
 * The short version keeps the lines that fit in 25 seconds: «n5» goes first,
 * «n1», the figure it ends on, last.
 */
export const fiveCues = (p: FiveProps): Cues => {
  const { at, total } = plan(p);
  const cues = { ...scenes(at), ...Object.fromEntries(p.cards.map((c, i) => [`n${c.n}`, at[i] + 22])) };
  return p.cut === "short" ? shortCues(cues, p.voiceIn, total, Boolean(p.hook?.text), HOOK_FRAMES, HOOK_OVERLAP, p.cards.map((c) => `n${c.n}`)) : cues;
};
/** What the hook shows playing under its question: the last figure's numeral landing and its board flipping, and only those. */
export const fiveLook = (p: FiveProps): Look => ({ at: plan(p).at[Math.max(0, p.cards.length - 1)], band: [0.145, 0.31] });
/** The source as each figure's foot says it: its first part («بانک جهانی»); the whole of it closes the Reel. */
const sourceName = (source: string) => source.split(/[،(]/)[0].trim();

// ---------- the split-flap board ----------
const FA = "۰۱۲۳۴۵۶۷۸۹";
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)));
/** The characters that stand between the digits; their tiles are narrow. */
const NARROW = new Set(["٬", "٫"]);

/** How the board writes its number while it counts: the decimals, the grouping and the sign after it of the figure it lands on. */
function counter(num: string) {
  const suffix = num.endsWith("٪") ? "٪" : "";
  const body = suffix ? num.slice(0, -1) : num;
  const decimals = (body.split("٫")[1] ?? "").length;
  const value = Number(latin(body).replace(/٬/g, "").replace("٫", "."));
  const format = new Intl.NumberFormat("fa-IR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: body.includes("٬") });
  return { value: Number.isFinite(value) ? value : 0, suffix, write: (v: number) => `${format.format(v)}${suffix}` };
}

/** The board's characters at each step of the count: blank first, the figure itself last; each set right-aligned to the figure's own tiles. */
function steps(num: string): string[][] {
  const final = Array.from(num);
  const c = counter(num);
  const fit = (text: string) => {
    const chars = Array.from(text);
    return [...Array(Math.max(0, final.length - chars.length)).fill(" "), ...chars].slice(-final.length);
  };
  const out = [final.map(() => " ")];
  for (let s = 1; s < STEPS; s += 1) out.push(fit(c.write(c.value * (1 - (1 - s / STEPS) ** 2))));
  out.push(final);
  return out;
}

/** The two halves of one tile's face: the character cut along the hinge. */
const Face: React.FC<{ ch: string; top: boolean; w: number; h: number; size: number; color: string; style?: React.CSSProperties }> = ({ ch, top, w, h, size, color, style }) => {
  const half = h / 2 - 2;
  return (
    <div style={{ position: "absolute", left: 0, width: w, height: half, top: top ? 0 : h / 2 + 2, overflow: "hidden", borderRadius: top ? "14px 14px 3px 3px" : "3px 3px 14px 14px", background: top ? "#1C2644" : "#18213B", backfaceVisibility: "hidden", ...style }}>
      <div style={{ position: "absolute", left: 0, width: w, height: h, top: top ? 0 : -(h / 2 + 2), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1, color, direction: "ltr" }}>
        <span style={{ transform: `translateY(${h * 0.03}px)` }}>{ch === " " ? "" : ch}</span>
      </div>
    </div>
  );
};

/** One tile of the board flipping from one character to the next as `k` runs 0 → 1: the upper flap falls over its hinge and shows the new lower half on its back. */
const Tile: React.FC<{ from: string; to: string; k: number; w: number; h: number; narrow: boolean }> = ({ from, to, k, w, h, narrow }) => {
  const size = Math.round(h * (narrow ? 0.6 : 0.66));
  const color = (ch: string) => (ch === "٪" ? C.acc : C.ink);
  if (narrow) {
    // a separator stands on the board itself, without a flap of its own
    const ch = k >= 0.5 ? to : from;
    return (
      <div style={{ position: "relative", width: w, height: h, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: h * 0.16, fontFamily: VAZIR, fontWeight: 800, fontSize: size, color: C.ink, opacity: ch === " " ? 0 : 1 }}>
        {ch === " " ? "" : ch}
      </div>
    );
  }
  const still = k <= 0 || k >= 1 || from === to;
  const shown = k >= 1 ? to : from;
  const first = k < 0.5;
  const angle = first ? 180 * k : 180 * (1 - k);
  return (
    <div style={{ position: "relative", width: w, height: h, perspective: h * 4 }}>
      {/* behind the falling flap: the new upper half, and the old lower half until the flap lands on it */}
      <Face ch={still ? shown : to} top w={w} h={h} size={size} color={color(still ? shown : to)} />
      <Face ch={still ? shown : from} top={false} w={w} h={h} size={size} color={color(still ? shown : from)} />
      {still ? null : first ? (
        <Face ch={from} top w={w} h={h} size={size} color={color(from)} style={{ transform: `rotateX(${-angle}deg)`, transformOrigin: "50% 100%", filter: `brightness(${1 - 0.45 * (angle / 90)})` }} />
      ) : (
        <Face ch={to} top={false} w={w} h={h} size={size} color={color(to)} style={{ transform: `rotateX(${angle}deg)`, transformOrigin: "50% 0%", filter: `brightness(${1 - 0.45 * (angle / 90)})` }} />
      )}
      {/* the hinge: a dark line across, and a pin at each side */}
      <div style={{ position: "absolute", left: -3, right: -3, top: h / 2 - 2, height: 4, background: C.bg, opacity: 0.9 }} />
      <div style={{ position: "absolute", left: -5, top: h / 2 - 9, width: 7, height: 18, borderRadius: 3, background: C.line2 }} />
      <div style={{ position: "absolute", right: -5, top: h / 2 - 9, width: 7, height: 18, borderRadius: 3, background: C.line2 }} />
    </div>
  );
};

/** The whole board of one figure: its tiles flip through the count and land on the figure at SETTLED. `t` is the scene's own frame; `room` the width its tiles may take. */
const Board: React.FC<{ num: string; t: number; room: number }> = ({ num, t, room }) => {
  const sets = React.useMemo(() => steps(num), [num]);
  const final = sets[sets.length - 1];
  const units = final.reduce((n, ch) => n + (NARROW.has(ch) ? 0.42 : 1), 0);
  const GAP = 14;
  const w = Math.min(140, (room - GAP * (final.length - 1)) / units);
  const h = Math.round(w * 1.42);
  return (
    <div style={{ display: "flex", gap: GAP, direction: "ltr", justifyContent: "center" }}>
      {final.map((ch, i) => {
        // the tiles flip a moment apart, the last digit first, as a real board's do
        const lag = (final.length - 1 - i) * 0.3;
        const local = t - FLIP0 - lag;
        const s = Math.max(0, Math.min(STEPS, Math.floor(local / STEP) + 1));
        const k = local < 0 ? 0 : s >= STEPS && local >= STEPS * STEP ? 1 : Math.min(1, (local - (s - 1) * STEP) / (STEP - 1));
        const from = sets[Math.max(0, s - 1)][i];
        const to = sets[s][i];
        return <Tile key={i} from={local < 0 ? sets[0][i] : from} to={local < 0 ? sets[0][i] : to} k={local < 0 ? 1 : k} w={NARROW.has(ch) ? w * 0.42 : w} h={h} narrow={NARROW.has(ch)} />;
      })}
    </div>
  );
};

// ---------- the countdown ----------
/** Five numerals in a row, the current one lit: where in the countdown the viewer is. */
const Pips: React.FC<{ cards: FiveCard[]; now: number }> = ({ cards, now }) => (
  <div style={{ display: "flex", gap: 10, direction: "rtl" }}>
    {cards.map((c, i) => {
      const on = i === now;
      const done = i < now;
      return (
        <div key={c.n} style={{ width: 54, height: 66, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 40, background: on ? C.acc : "transparent", color: on ? C.onAcc : done ? C.ink2 : C.ink3, border: `2px solid ${on ? C.acc : done ? C.line2 : C.line}`, opacity: done || on ? 1 : 0.6 }}>
          {faDigits(c.n)}
        </div>
      );
    })}
  </div>
);

/** The first year beside the latest, as two bars: how far the figure has come. */
const Then: React.FC<{ card: FiveCard; t: number }> = ({ card, t }) => {
  if (!card.then) return null;
  const most = Math.max(Math.abs(card.then.value), Math.abs(card.then.now)) || 1;
  const BAR = 330;
  const rows = [
    { year: card.then.year, text: card.then.text, share: Math.abs(card.then.value) / most, color: C.ink3, at: 40 },
    { year: card.year, text: card.text, share: Math.abs(card.then.now) / most, color: C.acc, at: 46 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div key={r.year} style={{ display: "flex", alignItems: "center", gap: 20, direction: "rtl", opacity: fade(t, r.at, 8) }}>
          <span style={{ width: 200, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY_MIN, color: C.ink2, whiteSpace: "nowrap" }}>{`سال ${r.year}`}</span>
          <div style={{ position: "relative", flex: 1, height: 70 }}>
            <div style={{ position: "absolute", right: 0, top: 20, height: 30, borderRadius: 15, width: Math.max(10, BAR * r.share) * grow(t, r.at, 22), background: r.color }} />
            <span style={{ position: "absolute", right: Math.max(10, BAR * r.share) * grow(t, r.at, 22) + 16, top: 0, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY_MIN, lineHeight: 1.2, color: C.ink, whiteSpace: "nowrap", opacity: fade(t, r.at + 12, 8) }}>
              {r.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** The numeral's box at the top right; the board stands beside it, the name under both. */
const NUM_W = 250;
const BAND = 270;

/** One figure: its numeral lands, its board swings down and flips to the figure, then its name, its year and what it measures. `t` runs from the scene's first frame. */
const Figure: React.FC<{ card: FiveCard; t: number; len: number; source: string }> = ({ card, t, len, source }) => {
  const out = interpolate(t, [len - 11, len - 1], [0, 1], { ...clamped, easing: ease });
  const slam = interpolate(t, [0, 7, 11, 15], [2.6, 0.92, 1.04, 1], clamped);
  const shake = interpolate(t, [HIT, HIT + 2, HIT + 4, HIT + 7], [0, 9, -4, 0], clamped);
  const swing = interpolate(t, [SWING, SWING + 12], [-96, 0], { ...clamped, easing: ease });
  // the board gives a small bump as the figure lands
  const landed = interpolate(t, [SETTLED - 1, SETTLED + 3, SETTLED + 9], [1, 1.045, 1], clamped);
  const glow = interpolate(t, [SETTLED - 2, SETTLED + 4, SETTLED + 30], [0, 1, 0.35], clamped);
  const numeral = faDigits(card.n);
  return (
    <AbsoluteFill style={{ transform: `translateY(${shake - out * 40}px)`, opacity: 1 - out }}>
      {/* the numeral, and its echo spreading as it lands */}
      <div style={{ position: "absolute", top: 286, right: SIDE - 6, width: NUM_W, height: BAND + 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", fontFamily: VAZIR, fontWeight: 800, fontSize: 330, lineHeight: 1, color: "transparent", WebkitTextStroke: `4px ${C.acc}`, opacity: interpolate(t, [HIT, HIT + 20], [0.7, 0], clamped), transform: `scale(${interpolate(t, [HIT, HIT + 20], [1, 1.75], { ...clamped, easing: ease })})` }}>{numeral}</div>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 330, lineHeight: 1, color: C.acc, opacity: fade(t, 0, 4), transform: `scale(${slam})`, textShadow: `0 0 80px ${C.accSoft}` }}>{numeral}</div>
      </div>

      {/* the board: it swings down on its hinge, then its tiles flip through the count */}
      <div style={{ position: "absolute", top: 300, left: SIDE, right: SIDE + NUM_W + 20, height: BAND, display: "flex", alignItems: "center", justifyContent: "center", perspective: 2200 }}>
        <div style={{ padding: "24px 30px", borderRadius: 30, background: C.panel, border: `2px solid ${C.line2}`, boxShadow: `0 0 ${60 * glow}px ${C.accLine}, 0 30px 60px rgba(0,0,0,.35)`, transform: `rotateX(${swing}deg) scale(${landed})`, transformOrigin: "50% 0%", opacity: fade(t, SWING, 3) }}>
          <Board num={card.num} t={t} room={1080 - 2 * SIDE - NUM_W - 20 - 60} />
        </div>
      </div>

      {/* the series' name, a title; then its year and its unit */}
      <div style={{ position: "absolute", top: 610, right: SIDE, left: SIDE }}>
        <Words text={card.label} from={4} step={2} lift={22} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: TITLE_MIN, lineHeight: 1.25, color: C.ink }} />
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap", opacity: fade(t, 20, 10), transform: `translateY(${rise(t, 20, 16, 12)}px)` }}>
          <span style={{ padding: "2px 24px 8px", borderRadius: 40, border: `2px solid ${C.accLine}`, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY_MIN, color: C.ink2 }}>{`سال ${card.year}`}</span>
          {card.unit ? <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: BODY_MIN, color: C.acc }}>{card.unit}</span> : null}
        </div>
      </div>

      {/* what it measures, in the site's own sentence, and the first year beside the latest */}
      <div style={{ position: "absolute", top: 960, right: SIDE_RAIL, left: SIDE, display: "flex", flexDirection: "column", gap: 18 }}>
        <Words text={card.means} from={26} step={1} lift={16} style={{ fontFamily: VAZIR, fontSize: BODY_MIN, lineHeight: 1.42, color: C.ink }} />
        {card.then ? <Then card={card} t={t} /> : null}
      </div>

      {/* where it comes from, on every figure */}
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM + 4, right: SIDE, left: SIDE_RAIL, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY_MIN, color: C.ink3, opacity: fade(t, 30, 10) }}>{`منبع: ${source}`}</div>
    </AbsoluteFill>
  );
};

/** The five together, the question to answer in the comments, the source and the page. */
const Close: React.FC<{ p: FiveProps; t: number }> = ({ p, t }) => {
  const [q, a] = p.ask.split(/(?<=؟)\s*/);
  return (
    <AbsoluteFill style={{ opacity: fade(t, 0, 10) }}>
      <div style={{ position: "absolute", top: 230, right: SIDE, left: SIDE }}>
        <Words text={q} from={2} step={3} lift={24} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: TITLE_MIN, lineHeight: 1.3, color: C.ink }} />
        {a ? <div style={{ marginTop: 4, fontFamily: VAZIR, fontWeight: 800, fontSize: 66, color: C.acc, transform: `scale(${pop(t, 14, 18)})`, transformOrigin: "right center" }}>{a}</div> : null}
      </div>
      <div style={{ position: "absolute", top: 480, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", gap: 10 }}>
        {p.cards.map((c, i) => {
          const at = 18 + i * 5;
          return (
            <div key={c.n} style={{ display: "flex", alignItems: "center", gap: 18, padding: "8px 20px", minHeight: 104, borderRadius: 22, background: C.panel, border: `1.5px solid ${C.line}`, direction: "rtl", opacity: fade(t, at, 8), transform: `translateX(${-rise(t, at, 50, 14)}px)` }}>
              <div style={{ width: 66, height: 80, flex: "none", borderRadius: 14, border: `2px solid ${C.accLine}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 54, color: C.acc }}>{faDigits(c.n)}</div>
              <span style={{ flex: 1, minWidth: 0, fontFamily: VAZIR, fontWeight: 700, fontSize: BODY_MIN, lineHeight: 1.15, color: C.ink }}>{c.label}</span>
              {/* the figure, and its year under it */}
              <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: BODY_MIN + 4, lineHeight: 1.1, color: C.ink, whiteSpace: "nowrap", direction: "rtl" }}>{c.num}</span>
                <span style={{ fontFamily: VAZIR, fontSize: BODY_MIN, lineHeight: 1.1, color: C.ink3, whiteSpace: "nowrap" }}>{c.year}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1230, right: SIDE_RAIL, left: SIDE, fontFamily: VAZIR, fontSize: BODY_MIN, lineHeight: 1.38, color: C.ink2, opacity: fade(t, 46, 10) }}>{`منبع: ${p.source}`}</div>
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM + 4, right: SIDE_RAIL, left: SIDE, padding: "16px 28px", borderRadius: 26, border: `2px solid ${C.accLine}`, background: C.accSoft, opacity: fade(t, 56, 12), transform: `translateY(${rise(t, 56, 30, 14)}px)` }}>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: BODY_MIN + 6, color: C.ink }}>هر روز یک عدد از ایران</div>
        <div style={{ marginTop: 4, fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: C.acc, direction: "ltr", textAlign: "right" }}>@divan.ahura  divan.ahura.cloud</div>
      </div>
    </AbsoluteFill>
  );
};

export const Five: React.FC<FiveProps> = (p) => {
  paint("five");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const { card: len } = lens(p);
  const closing = at[p.cards.length];
  const now = Math.min(p.cards.length, Math.max(0, at.findIndex((a, i) => frame >= a && frame < (at[i + 1] ?? Infinity))));
  const source = sourceName(p.source);
  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={22} />
      {/* a soft light where the numerals land */}
      <AbsoluteFill style={{ background: `radial-gradient(700px 620px at 80% 22%, ${C.glow}, transparent 70%)` }} />
      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />

      {/* the theme and where the countdown stands; the close has a question of its own there */}
      <div style={{ position: "absolute", top: 196, right: SIDE, left: SIDE, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, opacity: fade(frame, 0, 10) * (1 - fade(frame, closing, 8)) }}>
        <Kicker size={BODY_MIN} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{p.kicker}</Kicker>
        <Pips cards={p.cards} now={now} />
      </div>

      {p.cards.map((card, i) => {
        const a = at[i];
        return (
          <React.Fragment key={card.n}>
            {/* the numeral lands with a hit, the board swings down, each turn of the tiles ticks, the figure lands with a pop */}
            <Sfx at={a + HIT} name="hit" />
            <Sfx at={a + SWING} name="swish" />
            {Array.from({ length: STEPS }, (_, s) => (
              <Sfx key={s} at={a + FLIP0 + s * STEP} name="tick" />
            ))}
            <Sfx at={a + SETTLED} name="pop" />
            {frame >= a && frame < a + len ? <Figure card={card} t={frame - a} len={len} source={source} /> : null}
          </React.Fragment>
        );
      })}

      <Sfx at={closing} name="swish" />
      {p.cards.map((c, i) => (
        <Sfx key={`r${c.n}`} at={closing + 18 + i * 5} name="tick" />
      ))}
      {frame >= closing ? <Close p={p} t={frame - closing} /> : null}
    </AbsoluteFill>
  );
};
