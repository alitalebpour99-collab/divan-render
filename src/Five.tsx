// «پنج عدد»: five of Iran's World Bank series on one theme, counted down from
// five to one (a countdown, not a ranking). Each figure arrives as a large
// Persian numeral that lands with a hit; its board swings down like the flap of
// a station's departure board and the figure flips into place tile by tile,
// counting up, as a split-flap board does; under it the series' own sentence on
// what it measures and the year of the figure, and where the first year says as
// much, the first year beside the latest as two bars. At the end the five
// together, the question to answer in the comments, and the source. About 23
// seconds on the night ground, every moment with its sound.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { Backdrop, Brand, C, Foot, Kicker, NASKH, Progress, SIDE, SIDE_RAIL, Sfx, VAZIR, W, Words, clamped, ease, faDigits, fade, grow, paint, pop, rise, starts, useCurrentFrame } from "./kit";
import type { FiveCard, FiveProps } from "./props";
import { scenes, type Cues } from "./voice";

/** One figure's scene, and the closing scene with the five together (frames). */
const CARD = 105;
const END = 108;
// inside a figure's scene
const HIT = 5;
const SWING = 7;
const FLIP0 = 10;
const STEP = 4;
const STEPS = 6;
const SETTLED = FLIP0 + STEPS * STEP;

function plan(p: FiveProps) {
  const lengths = [...p.cards.map(() => CARD), END];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const fiveDuration = (p: FiveProps) => plan(p).total;
/**
 * The narrator's moments (lib/social/voice.ts names them «n5» … «n1»): a
 * figure's line as its numeral has landed and its board swings down; a line
 * may begin a little before (voice.ts, EARLY), never before the scene comes.
 */
export const fiveCues = (p: FiveProps): Cues => {
  const { at } = plan(p);
  return { ...scenes(at), ...Object.fromEntries(p.cards.map((c, i) => [`n${c.n}`, at[i] + 22])) };
};

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

/** The whole board of one figure: its tiles flip through the count and land on the figure at SETTLED. `t` is the scene's own frame. */
const Board: React.FC<{ num: string; t: number }> = ({ num, t }) => {
  const sets = React.useMemo(() => steps(num), [num]);
  const final = sets[sets.length - 1];
  const units = final.reduce((n, ch) => n + (NARROW.has(ch) ? 0.42 : 1), 0);
  const GAP = 14;
  const room = W - 2 * SIDE - 2 * 34;
  const w = Math.min(150, (room - GAP * (final.length - 1)) / units);
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
/** Five small numerals in a row, the current one lit: where in the countdown the viewer is. */
const Pips: React.FC<{ cards: FiveCard[]; now: number }> = ({ cards, now }) => (
  <div style={{ display: "flex", gap: 10, direction: "rtl" }}>
    {cards.map((c, i) => {
      const on = i === now;
      const done = i < now;
      return (
        <div key={c.n} style={{ width: 46, height: 56, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 32, background: on ? C.acc : "transparent", color: on ? C.onAcc : done ? C.ink2 : C.ink3, border: `2px solid ${on ? C.acc : done ? C.line2 : C.line}`, opacity: done || on ? 1 : 0.6 }}>
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
  const BAR = 400;
  const rows = [
    { year: card.then.year, text: card.then.text, share: Math.abs(card.then.value) / most, color: C.ink3, at: 46 },
    { year: card.year, text: card.text, share: Math.abs(card.then.now) / most, color: C.acc, at: 52 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {rows.map((r) => (
        <div key={r.year} style={{ display: "flex", alignItems: "center", gap: 20, direction: "rtl", opacity: fade(t, r.at, 8) }}>
          <span style={{ width: 130, fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: C.ink2, whiteSpace: "nowrap" }}>{`سال ${r.year}`}</span>
          <div style={{ position: "relative", flex: 1, height: 34 }}>
            <div style={{ position: "absolute", right: 0, top: 4, height: 26, borderRadius: 13, width: Math.max(10, BAR * r.share) * grow(t, r.at, 22), background: r.color }} />
            <span style={{ position: "absolute", right: Math.max(10, BAR * r.share) * grow(t, r.at, 22) + 16, top: -4, fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: C.ink, whiteSpace: "nowrap", opacity: fade(t, r.at + 14, 8) }}>
              {r.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** One figure: its numeral lands, its board swings down and flips to the figure, then what it measures. `t` runs from the scene's first frame. */
const Figure: React.FC<{ card: FiveCard; t: number }> = ({ card, t }) => {
  const out = interpolate(t, [CARD - 11, CARD - 1], [0, 1], { ...clamped, easing: ease });
  const slam = interpolate(t, [0, 7, 11, 15], [2.6, 0.92, 1.04, 1], clamped);
  const shake = interpolate(t, [HIT, HIT + 2, HIT + 4, HIT + 7], [0, 9, -4, 0], clamped);
  const swing = interpolate(t, [SWING, SWING + 12], [-96, 0], { ...clamped, easing: ease });
  // the board gives a small bump as the figure lands
  const landed = interpolate(t, [SETTLED - 1, SETTLED + 3, SETTLED + 9], [1, 1.045, 1], clamped);
  const glow = interpolate(t, [SETTLED - 2, SETTLED + 4, SETTLED + 30], [0, 1, 0.35], clamped);
  const label = card.label.length > 26 ? 52 : card.label.length > 18 ? 60 : 68;
  const numeral = faDigits(card.n);
  return (
    <AbsoluteFill style={{ transform: `translateY(${shake - out * 40}px)`, opacity: 1 - out }}>
      {/* the numeral, and its echo spreading as it lands */}
      <div style={{ position: "absolute", top: 220, right: SIDE - 6, width: 320, height: 440, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", fontFamily: VAZIR, fontWeight: 800, fontSize: 430, lineHeight: 1, color: "transparent", WebkitTextStroke: `4px ${C.acc}`, opacity: interpolate(t, [HIT, HIT + 20], [0.7, 0], clamped), transform: `scale(${interpolate(t, [HIT, HIT + 20], [1, 1.75], { ...clamped, easing: ease })})` }}>{numeral}</div>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 430, lineHeight: 1, color: C.acc, opacity: fade(t, 0, 4), transform: `scale(${slam})`, textShadow: `0 0 80px ${C.accSoft}` }}>{numeral}</div>
      </div>

      {/* the series' name and the year of its figure */}
      <div style={{ position: "absolute", top: 262, right: SIDE + 330, left: SIDE, height: 360, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
        <Words text={card.label} from={4} step={2} lift={22} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: label, lineHeight: 1.45, color: C.ink }} />
        <div style={{ alignSelf: "flex-start", padding: "6px 22px 9px", borderRadius: 30, border: `2px solid ${C.accLine}`, fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: C.ink2, opacity: fade(t, 22, 10), transform: `translateY(${rise(t, 22, 16, 12)}px)` }}>{`سال ${card.year}`}</div>
      </div>

      {/* the board: it swings down on its hinge, then its tiles flip through the count */}
      <div style={{ position: "absolute", top: 660, left: SIDE, right: SIDE, display: "flex", justifyContent: "center", perspective: 2200 }}>
        <div style={{ padding: "28px 34px", borderRadius: 32, background: C.panel, border: `2px solid ${C.line2}`, boxShadow: `0 0 ${60 * glow}px ${C.accLine}, 0 30px 60px rgba(0,0,0,.35)`, transform: `rotateX(${swing}deg) scale(${landed})`, transformOrigin: "50% 0%", opacity: fade(t, SWING, 3) }}>
          <Board num={card.num} t={t} />
        </div>
      </div>
      {card.unit ? (
        <div style={{ position: "absolute", top: 975, left: SIDE, right: SIDE, textAlign: "center", fontFamily: VAZIR, fontWeight: 700, fontSize: card.unit.length > 14 ? 38 : 46, color: C.acc, opacity: fade(t, 26, 10) }}>{card.unit}</div>
      ) : null}

      {/* what it measures, in the site's own sentence */}
      <div style={{ position: "absolute", top: 1050, right: SIDE_RAIL, left: SIDE }}>
        <Words text={card.means} from={32} step={1} lift={16} style={{ fontFamily: VAZIR, fontSize: card.means.length > 90 ? 36 : 40, lineHeight: 1.7, color: C.ink }} />
      </div>
      {card.then ? (
        <div style={{ position: "absolute", top: 1272, right: SIDE_RAIL, left: SIDE }}>
          <Then card={card} t={t} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** The five together, the question to answer in the comments, the source and the page. */
const Close: React.FC<{ p: FiveProps; t: number }> = ({ p, t }) => {
  const [q, a] = p.ask.split(/(?<=؟)\s*/);
  return (
    <AbsoluteFill style={{ opacity: fade(t, 0, 10) }}>
      <div style={{ position: "absolute", top: 250, right: SIDE, left: SIDE }}>
        <Words text={q} from={2} step={3} lift={24} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 82, lineHeight: 1.4, color: C.ink }} />
        {a ? <div style={{ marginTop: 6, fontFamily: VAZIR, fontWeight: 800, fontSize: 58, color: C.acc, transform: `scale(${pop(t, 14, 18)})`, transformOrigin: "right center" }}>{a}</div> : null}
      </div>
      <div style={{ position: "absolute", top: 500, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", gap: 12 }}>
        {p.cards.map((c, i) => {
          const at = 18 + i * 5;
          return (
            <div key={c.n} style={{ display: "flex", alignItems: "center", gap: 22, padding: "10px 22px", height: 96, borderRadius: 22, background: C.panel, border: `1.5px solid ${C.line}`, direction: "rtl", opacity: fade(t, at, 8), transform: `translateX(${-rise(t, at, 50, 14)}px)` }}>
              <div style={{ width: 64, height: 76, flex: "none", borderRadius: 14, border: `2px solid ${C.accLine}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 50, color: C.acc }}>{faDigits(c.n)}</div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: c.label.length > 28 ? 26 : 31, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</span>
                <span style={{ fontFamily: VAZIR, fontSize: 23, color: C.ink3, whiteSpace: "nowrap" }}>{`سال ${c.year}`}</span>
              </div>
              <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: 300 }}>
                <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 44, lineHeight: 1.1, color: C.ink, whiteSpace: "nowrap", direction: "rtl" }}>{c.num}</span>
                {c.unit ? <span style={{ fontFamily: VAZIR, fontSize: 21, color: C.ink3, whiteSpace: "nowrap" }}>{c.unit}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1086, right: SIDE_RAIL, left: SIDE, fontFamily: VAZIR, fontSize: 28, lineHeight: 1.7, color: C.ink2, opacity: fade(t, 46, 10) }}>{`منبع: ${p.source}`}</div>
      <div style={{ position: "absolute", top: 1168, right: SIDE_RAIL, left: SIDE, padding: "24px 30px", borderRadius: 26, border: `2px solid ${C.accLine}`, background: C.accSoft, opacity: fade(t, 56, 12), transform: `translateY(${rise(t, 56, 30, 14)}px)` }}>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 46, color: C.ink }}>هر روز یک عدد از ایران</div>
        <div style={{ marginTop: 8, fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: C.acc, direction: "ltr", textAlign: "right" }}>@divan.ahura</div>
      </div>
    </AbsoluteFill>
  );
};

export const Five: React.FC<FiveProps> = (p) => {
  paint("five");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const closing = at[p.cards.length];
  const now = Math.min(p.cards.length, Math.max(0, at.findIndex((a, i) => frame >= a && frame < (at[i + 1] ?? Infinity))));
  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={30} />
      {/* a soft light where the numerals land */}
      <AbsoluteFill style={{ background: `radial-gradient(700px 620px at 78% 24%, ${C.glow}, transparent 70%)` }} />
      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />

      <div style={{ position: "absolute", top: 206, right: SIDE, left: SIDE, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: fade(frame, 0, 10) }}>
        <Kicker size={34}>{p.kicker}</Kicker>
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
            {frame >= a && frame < a + CARD ? <Figure card={card} t={frame - a} /> : null}
          </React.Fragment>
        );
      })}

      <Sfx at={closing} name="swish" />
      {p.cards.map((c, i) => (
        <Sfx key={`r${c.n}`} at={closing + 18 + i * 5} name="tick" />
      ))}
      {frame >= closing ? <Close p={p} t={frame - closing} /> : null}

      <Foot opacity={fade(frame, 6, 12)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
