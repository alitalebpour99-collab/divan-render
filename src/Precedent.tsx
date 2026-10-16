// «این راه را رفته‌ایم»: one big decision of Iran's past as one Reel. The year
// rolls back to the moment, its folder opens on what was decided, closes, and a
// line leads down to what followed. Every word comes from the props the site
// sends, and nothing is compared with today: that is the site's own rule for these cards.
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Brand, C, Foot, Kicker, NASKH, Net, Panel, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, VAZIR, W, clamped, faDigits, fade, grow, leave, paint, pop, readFrames, rise, starts } from "./kit";
import type { PrecedentProps } from "./props";

// where the roll starts: the Solar Hijri year for a year below 1500, the Gregorian one otherwise
const NOW_SH = 1405;
const NOW_AD = 2026;
/** frames the year takes to roll back */
const ROLL = 46;

// the dial of the opening
const DIAL = 720;
const DIAL_X = W / 2;
const DIAL_Y = 668;
const YEAR_SIZE = 196;
/** the widest the landed year may be inside the dial */
const YEAR_ROOM = 560;
/** the room of one digit while the number rolls (em) */
const CELL = 0.6;

// the folder and the card under it share one column, clear of Instagram's buttons
const COL = W - SIDE - SIDE_RAIL;
const FOLDER_TOP = 226;
const TAB_H = 58;
const HEAD_H = 184;
const HEAD_PAD = 34;
const MINI = 84;
const EDGE = 6;
const EDGE_IN = 30;
const LINK_H = 84;
/** where the small dial sits on the folder: the big one flies there when the folder comes */
const MINI_X = SIDE + HEAD_PAD + MINI / 2;
const MINI_Y = FOLDER_TOP + TAB_H + HEAD_H / 2;
// the room of the closing words: from under the closed folder down to the closing line of the Reel
const CLOSE_TOP = FOLDER_TOP + TAB_H + HEAD_H + 30;
const CLOSE_BOTTOM = SAFE_BOTTOM + 200;

const DIGIT = /[0-9۰-۹٠-٩]/;
const JOINER = String.fromCharCode(0x200c);
const unit = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - unit(x), 3);
const soft = (a: number, b: number, x: number) => {
  const t = unit((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** An accent of the palette at another strength. */
const tint = (color: string, alpha: number) => color.replace(")", ` / ${alpha})`);
/** An ink of the palette, fading: the colour itself fades, so no box is drawn around the text while it goes. */
const faded = (color: string, alpha: number) => (alpha >= 1 ? color : `color-mix(in srgb, ${color} ${(unit(alpha) * 100).toFixed(1)}%, transparent)`);
/** A rough width in em: enough to choose a size at which a line fits. */
const widthOf = (text: string, digit: number, letter: number) =>
  Array.from(text).reduce((w, ch) => w + (DIGIT.test(ch) ? digit : ch === JOINER ? 0 : ch === " " ? 0.27 : /[()«»،.:·]/.test(ch) ? 0.35 : letter), 0);

type Year = { pre: string; num: string; post: string; value: number; start: number; land: number; size: number };

/** The first number of the year line: the year the dial rolls back to. The rest of the line is shown as given. */
function readYear(text: string): Year | null {
  const found = /[0-9۰-۹٠-٩]+/.exec(text);
  if (!found) return null;
  const num = found[0];
  const value = Number(
    Array.from(num, (ch) => {
      const fa = "۰۱۲۳۴۵۶۷۸۹".indexOf(ch);
      const ar = "٠١٢٣٤٥٦٧٨٩".indexOf(ch);
      return fa >= 0 ? fa : ar >= 0 ? ar : ch;
    }).join(""),
  );
  const start = Math.max(value < 1500 ? NOW_SH : NOW_AD, value);
  const pre = text.slice(0, found.index);
  const post = text.slice(found.index + num.length);
  // the frame the roll shows the year itself for the first time
  let land = 0;
  while (land < ROLL && Math.round(start + (value - start) * easeOut(land / ROLL)) !== value) land += 1;
  // the number stays large and the rest of the line is set beside it at two fifths of its size
  const size = Math.min(YEAR_SIZE, Math.floor(YEAR_ROOM / (num.length * 0.56 + 0.4 * widthOf(pre + post, 0.56, 0.6))));
  return { pre, num, post, value, start, land, size };
}

/** The lengths of the scenes: the year rolls back, what was decided, what followed, the site's caveat with its sources. */
function plan(p: PrecedentProps) {
  // each card stays long enough to be read once calmly, up to a ceiling: the longest moment stays near half a minute
  const hook = Math.min(129, Math.max(111, 78 + p.title.trim().split(/\s+/).length * 10));
  const decision = Math.min(390, Math.max(240, readFrames(p.decision) + 36));
  const aftermath = Math.min(294, Math.max(222, readFrames(p.aftermath) + 50));
  const close = Math.min(198, Math.max(162, readFrames(p.note) + 36));
  const lengths = [hook, decision, aftermath, close];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const precedentDuration = (p: PrecedentProps) => plan(p).total;

/** A line in Naskh with its digits in Vazirmatn: Naskh sets digits too far apart. */
const Mixed: React.FC<{ text: string; weight?: number }> = ({ text, weight = 700 }) => (
  <>
    {text.split(/([0-9۰-۹٠-٩]+)/).map((part, i) =>
      i % 2 ? (
        <span key={i} style={{ fontFamily: VAZIR, fontWeight: weight, fontSize: "0.8em" }}>
          {part}
        </span>
      ) : (
        part
      ),
    )}
  </>
);

/** A long text that arrives line by line: the mask has one band for each line and the bands clear one after another. */
const Lines: React.FC<{ text: string; size: number; from: number; step?: number }> = ({ text, size, from, step = 8 }) => {
  const frame = useCurrentFrame();
  const line = Math.round(size * 1.78);
  const count = 16;
  let mask: string | undefined;
  if (frame < from + count * step + 14) {
    const stops: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const a = fade(frame, from + i * step, 14).toFixed(3);
      stops.push(`rgba(0,0,0,${a}) ${i * line}px`, `rgba(0,0,0,${a}) ${(i + 1) * line}px`);
    }
    mask = `linear-gradient(to bottom, ${stops.join(", ")})`;
  }
  return <div style={{ fontFamily: VAZIR, fontSize: size, lineHeight: `${line}px`, color: C.ink, textWrap: "pretty", WebkitMaskImage: mask, maskImage: mask }}>{text}</div>;
};

/** The coloured edge of a card. It fills from the top while the card is on: the viewer sees how long it stays. */
const Edge: React.FC<{ color: string; from: number; until: number }> = ({ color, from, until }) => {
  const frame = useCurrentFrame();
  const round = `0 0 ${EDGE / 2}px ${EDGE / 2}px`;
  return (
    <div style={{ position: "absolute", top: 0, bottom: EDGE_IN, right: EDGE_IN, width: EDGE, borderRadius: round, background: tint(color, 0.26), overflow: "hidden" }}>
      <div style={{ height: `${interpolate(frame, [from, until], [0, 100], clamped)}%`, background: color, borderRadius: round }} />
    </div>
  );
};

const point = (c: number, r: number, deg: number): [number, number] => [c + r * Math.cos((deg * Math.PI) / 180), c + r * Math.sin((deg * Math.PI) / 180)];
/** An arc around the middle of a square of side 2·c, between two angles (degrees, clockwise from three o'clock). */
const arc = (c: number, r: number, from: number, to: number) => {
  const [x0, y0] = point(c, r, from);
  const [x1, y1] = point(c, r, to);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 1 : 0} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

// the marks of the dial: every one, every fifth, every fifteenth (`gap` is the angle between two marks of that kind)
const MARKS = [
  { r0: 322, r1: 334, w: 2, color: C.line2, gap: 3 },
  { r0: 316, r1: 334, w: 2.6, color: C.ink3, gap: 15 },
  { r0: 306, r1: 334, w: 3.6, color: C.ink2, gap: 45 },
];
/** a mark that moves leaves a tail behind it, in parts that grow fainter */
const TAIL = Array.from({ length: 7 }, (_, k) => 0.5 * Math.pow(1 - (k + 0.5) / 7, 1.6));

/** How far the arc of the dial goes back: longer for an older moment. */
const sweepOf = (year: Year | null) => Math.min(330, Math.max(30, (year ? year.start - year.value : 0) * 1.2));

/** The part of the year line around its number: it is written out beside the number when the roll has landed. */
const Beside: React.FC<{ text: string; open: number; shown: number }> = ({ text, open, shown }) => (
  // the column grows from nothing to the width of the text, and the text is cut at its edge (not above or below it)
  <span style={{ display: "grid", gridTemplateColumns: `${open}fr`, flex: "none", clipPath: open < 1 ? "inset(-1em 0px -1em 0px)" : undefined }}>
    <span style={{ minWidth: 0, whiteSpace: "pre", fontSize: "0.4em", fontWeight: 700, color: faded(C.ink2, unit(open * 2) * shown) }}>{text}</span>
  </span>
);

/**
 * The signature of the format: a dial that turns anticlockwise while the year rolls back.
 * When the folder comes (`until`), the ring flies to its corner and stays there as a small dial.
 */
const Dial: React.FC<{ year: Year | null; given: string; until: number }> = ({ year, given, until }) => {
  const frame = useCurrentFrame();
  const c = DIAL / 2;
  const land = year ? year.land : 0;
  const spin = Math.min(900, 280 + (year ? year.start - year.value : 0));
  const turn = (f: number) => -(spin * easeOut(f / ROLL) + 0.12 * f);
  // degrees a frame: a mark is drawn only while it moves less than half the way to the next one, and it trails the faster it goes
  const pace = Math.abs(turn(frame + 0.5) - turn(frame - 0.5));
  const swept = sweepOf(year) * easeOut(frame / ROLL);
  const [tipX, tipY] = point(c, 296, -90 - swept);
  const ringing = grow(frame, land, 22);

  // the way out: the face goes, the ring shrinks into the corner of the folder
  const fly = interpolate(frame, [until - 12, until + 8], [0, 1], { ...clamped, easing: Easing.inOut(Easing.cubic) });
  const face = leave(frame, until - 4, 8);
  const ring = 1 - soft(0.6, 1, fly);

  // the year: a number that rolls, then the line as the site wrote it
  const at = (f: number) => (year ? year.start + (year.value - year.start) * easeOut(f / ROLL) : 0);
  const years = Math.abs(at(frame + 0.5) - at(frame - 0.5));
  const landed = frame >= land;
  const digits = year ? Array.from(landed ? year.num : faDigits(Math.round(at(frame)))) : [];
  // a digit that changes within a frame is smeared down its column, like a wheel of a counter
  const blur = digits.map((_, i) => (landed ? 0 : Math.min(1.5, years / 10 ** (digits.length - 1 - i)) * 9));
  const settle = grow(frame, land + 1, 16);
  const size = year ? YEAR_SIZE + (year.size - YEAR_SIZE) * settle : Math.min(YEAR_SIZE, Math.floor(YEAR_ROOM / widthOf(given, 0.56, 0.6)));

  return (
    <div
      style={{
        position: "absolute",
        left: DIAL_X - c,
        top: DIAL_Y - c,
        width: DIAL,
        height: DIAL,
        transform: fly > 0 ? `translate(${((MINI_X - DIAL_X) * fly).toFixed(2)}px, ${((MINI_Y - DIAL_Y) * fly).toFixed(2)}px) scale(${(1 + (81 / 676 - 1) * fly).toFixed(4)})` : undefined,
      }}
    >
      <svg width={DIAL} height={DIAL} viewBox={`0 0 ${DIAL} ${DIAL}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="precedent-face">
            <stop offset="0" stopColor={tint(C.acc, 0.14)} />
            <stop offset="1" stopColor={tint(C.acc, 0)} />
          </radialGradient>
          {blur.map((b, i) => (
            <filter key={i} id={`precedent-roll-${i}`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={`0 ${b.toFixed(2)}`} />
            </filter>
          ))}
        </defs>
        {/* the face */}
        <circle cx={c} cy={c} r={300} fill={C.bg} fillOpacity={0.92 * face} />
        <circle cx={c} cy={c} r={300} fill="url(#precedent-face)" fillOpacity={face} />
        {/* the ring of marks: turning fast, the marks run into one band */}
        <circle cx={c} cy={c} r={338} fill="none" stroke={C.line2} strokeWidth={1.5} strokeOpacity={ring} />
        <circle cx={c} cy={c} r={296} fill="none" stroke={C.line} strokeWidth={1.5} strokeOpacity={ring} />
        <circle cx={c} cy={c} r={328} fill="none" stroke={C.line2} strokeWidth={12} strokeOpacity={0.5 * soft(0.66, 1.44, pace) * ring} />
        <g transform={`rotate(${turn(frame).toFixed(3)} ${c} ${c})`}>
          {Array.from({ length: 120 }, (_, i) => {
            const m = MARKS[i % 15 === 0 ? 2 : i % 5 === 0 ? 1 : 0];
            const seen = (1 - soft(m.gap * 0.22, m.gap * 0.48, pace)) * ring;
            if (seen < 0.01) return null;
            const mid = (m.r0 + m.r1) / 2;
            const own = ((m.w / mid) * 180) / Math.PI;
            const from = i * 3 - own / 2;
            const tail = pace * 0.75;
            return (
              <g key={i} fill="none" stroke={m.color} strokeWidth={m.r1 - m.r0}>
                <path d={arc(c, mid, from, from + own)} strokeOpacity={seen} />
                {tail > own ? TAIL.map((o, k) => <path key={k} d={arc(c, mid, from + own + (tail * k) / TAIL.length, from + own + (tail * (k + 1)) / TAIL.length)} strokeOpacity={seen * o} />) : null}
              </g>
            );
          })}
        </g>
        {/* how far back: the arc runs anticlockwise from the pointer */}
        <path d={arc(c, 296, -90, -90 - swept)} fill="none" stroke={C.acc} strokeWidth={5} strokeLinecap="round" strokeOpacity={face} />
        <circle cx={tipX} cy={tipY} r={15} fill={C.acc} fillOpacity={0.22 * face} />
        <circle cx={tipX} cy={tipY} r={7.5} fill={C.acc} fillOpacity={face} />
        <path d={`M${c - 13} 2H${c + 13}L${c} 22Z`} fill={C.acc} fillOpacity={face} />
        {frame >= land && ringing < 1 ? <circle cx={c} cy={c} r={296 + 40 * ringing} fill="none" stroke={C.acc} strokeWidth={3} strokeOpacity={0.5 * (1 - ringing) * face} /> : null}
      </svg>
      {face > 0 ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", direction: "rtl", fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1, color: faded(C.ink, face), whiteSpace: "nowrap", transform: "translateY(0.1em)" }}>
            {year ? (
              <>
                {year.pre ? <Beside text={year.pre} open={settle} shown={face} /> : null}
                <span style={{ display: "flex", direction: "ltr", flex: "none" }}>
                  {digits.map((ch, i) => (
                    // the room of a digit: one cell while the number rolls, so that it does not jitter; its own width once it has landed
                    <span key={i} style={{ position: "relative", display: "flex", flex: "none" }}>
                      <span style={{ display: "grid", gridTemplateColumns: `${settle}fr`, visibility: "hidden" }}>
                        <span style={{ minWidth: 0 }}>{ch}</span>
                      </span>
                      <span style={{ width: `${(CELL * (1 - settle)).toFixed(4)}em`, flex: "none" }} />
                      <span style={{ position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", filter: blur[i] > 0.4 ? `url(#precedent-roll-${i})` : undefined, opacity: blur[i] > 0.4 ? 1 - 0.25 * unit(blur[i] / 9) : undefined }}>{ch}</span>
                    </span>
                  ))}
                </span>
                {year.post ? <Beside text={year.post} open={settle} shown={face} /> : null}
              </>
            ) : (
              given
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** The dial on the folder: small, and still turning back slowly. */
const MiniDial: React.FC<{ sweep: number }> = ({ sweep }) => {
  const frame = useCurrentFrame();
  const c = MINI / 2;
  return (
    <svg width={MINI} height={MINI} viewBox={`0 0 ${MINI} ${MINI}`} style={{ display: "block", flex: "none" }}>
      <circle cx={c} cy={c} r={40.5} fill="none" stroke={C.line2} strokeWidth={1.5} />
      <g transform={`rotate(${(-frame * 0.5).toFixed(2)} ${c} ${c})`}>
        {Array.from({ length: 24 }, (_, i) => {
          const [x0, y0] = point(c, i % 6 === 0 ? 28 : 31.5, i * 15);
          const [x1, y1] = point(c, 36.5, i * 15);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={i % 6 === 0 ? C.ink2 : C.ink3} strokeWidth={i % 6 === 0 ? 2.2 : 1.5} />;
        })}
      </g>
      <path d={arc(c, 20, -90, -90 - sweep)} fill="none" stroke={C.acc} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={c} cy={c} r={3.4} fill={C.acc} />
    </svg>
  );
};

export const Precedent: React.FC<PrecedentProps> = (p) => {
  paint("precedent");
  const frame = useCurrentFrame();
  const { lengths, at, total } = plan(p);
  const HOOK = lengths[0];
  const T_DECISION = at[1];
  const T_AFTER = at[2];
  const T_CLOSE = at[3];
  const year = readYear(p.year);
  const land = year ? year.land : 0;
  const where = [p.when, p.place].filter(Boolean).join(" · ");

  // the title is set as large as its length lets it: one line under the dial when it fits, two when not; always one line on the folder
  const titleEm = widthOf(p.title, 0.5, 0.46);
  const hero = Math.floor(740 / titleEm) >= 78 ? Math.min(104, Math.floor(740 / titleEm)) : 76;
  const head = Math.floor(640 / titleEm);
  // a long text is set smaller, so that even the longest stays well above the caption
  const sizeOf = (text: string) => (text.length > 250 ? 46 : text.length > 200 ? 48 : text.length > 150 ? 52 : text.length > 100 ? 56 : 60);
  const noteSize = p.note.length > 110 ? 50 : p.note.length > 64 ? 58 : 68;
  // the folder opens on the decision and closes when what followed comes
  const open = frame < T_AFTER ? grow(frame, T_DECISION + 6, 26) : 1 - grow(frame, T_AFTER, 22);
  const hookOut = leave(frame, HOOK, 12);
  const folderIn = fade(frame, T_DECISION, 12);
  const afterOut = leave(frame, T_CLOSE, 12);
  const noteIn = fade(frame, T_CLOSE + 4, 14);
  const sourceIn = fade(frame, T_CLOSE + 46, 12);

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={total} glowY={34} />
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Net total={total} opacity={interpolate(frame, [HOOK - 12, HOOK + 8], [0.5, 0.2], clamped)} />
      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />

      {/* 1 · the year rolls back to the moment (texts fade by their colour: a faded box would show on the ground) */}
      {frame < HOOK ? (
        <>
          <Kicker size={44} color={tint(C.acc, hookOut)} style={{ position: "absolute", top: 236, left: 0, right: 0, textAlign: "center" }}>
            این راه را رفته‌ایم
          </Kicker>
          <div style={{ position: "absolute", top: 1040, left: SIDE_RAIL, right: SIDE_RAIL, textAlign: "center" }}>
            <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: hero, lineHeight: 1.42, color: faded(C.ink, fade(frame, land + 10, 14) * hookOut), textWrap: "balance", transform: `translateY(${rise(frame, land + 10, 46, 22)}px)` }}>
              <Mixed text={p.title} />
            </div>
            <div style={{ fontFamily: VAZIR, fontSize: 32, lineHeight: 1.7, color: faded(C.ink2, fade(frame, land + 22, 12) * hookOut), marginTop: 12 }}>{where}</div>
          </div>
        </>
      ) : null}

      {/* 2 → 4 · the folder of the moment: it opens on what was decided, closes, and what followed hangs from it */}
      {frame >= T_DECISION ? (
        <div style={{ position: "absolute", top: FOLDER_TOP, left: SIDE, right: SIDE_RAIL, direction: "rtl" }}>
          <div>
            {/* the tab with the year, and the edge of a sheet beside it */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", padding: "0 30px 0 26px", marginBottom: -1.5 }}>
              <div style={{ height: TAB_H, padding: "0 30px", display: "flex", alignItems: "center", flex: "none", borderRadius: "18px 18px 0 0", border: `1.5px solid ${C.accLine}`, borderBottom: "none", background: `linear-gradient(${C.accSoft}, ${C.accSoft}), ${C.panel}`, fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: C.ink, whiteSpace: "nowrap", opacity: folderIn }}>
                {p.year}
              </div>
              <div style={{ flex: 1, height: 11, marginRight: 14, borderRadius: "11px 11px 0 0", border: `1.5px solid ${faded(C.line2, folderIn)}`, borderBottom: "none" }} />
            </div>
            <Panel style={{ padding: 0, border: `1.5px solid ${C.accLine}`, overflow: "hidden", opacity: folderIn }}>
              <div style={{ height: HEAD_H, padding: `0 ${HEAD_PAD}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: NASKH, fontWeight: 700, color: C.ink, ...(head >= 40 ? { fontSize: Math.min(62, head), lineHeight: "92px", whiteSpace: "nowrap" } : { fontSize: 36, lineHeight: "46px", height: 92 }) }}>
                    <Mixed text={p.title} />
                  </div>
                  <div style={{ fontFamily: VAZIR, fontSize: 26, lineHeight: "44px", color: C.ink3, whiteSpace: "nowrap" }}>{where}</div>
                </div>
                <MiniDial sweep={sweepOf(year)} />
              </div>
              {frame < T_AFTER + 24 ? (
                // a row of the grid that goes from nothing to the height of what it holds: the folder opens, and closes again
                <div style={{ display: "grid", gridTemplateRows: `${open}fr`, overflow: "hidden" }}>
                  <div style={{ minHeight: 0 }}>
                    <div style={{ position: "relative", borderTop: `1.5px solid ${C.line}`, padding: "22px 60px 34px 34px", opacity: leave(frame, T_AFTER + 8, 8) }}>
                      <Edge color={C.acc} from={T_DECISION + 30} until={T_AFTER - 6} />
                      <Kicker size={36} style={{ lineHeight: "54px" }}>
                        تصمیم
                      </Kicker>
                      <Lines text={p.decision} size={sizeOf(p.decision)} from={T_DECISION + 18} />
                    </div>
                  </div>
                </div>
              ) : null}
            </Panel>
          </div>

          {/* 3 · what followed: a line comes down from the folder and runs on as the edge of its card */}
          {frame >= T_AFTER && frame < T_CLOSE ? (
            <>
              <svg width={COL} height={LINK_H} viewBox={`0 0 ${COL} ${LINK_H}`} style={{ display: "block", overflow: "visible" }}>
                <line x1={COL - EDGE_IN - EDGE / 2} x2={COL - EDGE_IN - EDGE / 2} y1={0} y2={LINK_H} stroke={C.claim} strokeWidth={EDGE} strokeOpacity={afterOut} strokeDasharray={LINK_H} strokeDashoffset={LINK_H * (1 - grow(frame, T_AFTER + 18, 16))} />
                <circle cx={COL - EDGE_IN - EDGE / 2} cy={0} r={10 * pop(frame, T_AFTER + 14, 14)} fill={C.bg} fillOpacity={afterOut} stroke={C.claim} strokeWidth={4} strokeOpacity={afterOut} />
              </svg>
              <Panel style={{ position: "relative", padding: "22px 60px 34px 34px", border: `1.5px solid ${tint(C.claim, 0.45)}`, overflow: "hidden", opacity: fade(frame, T_AFTER + 24, 12) * afterOut }}>
                <Edge color={C.claim} from={T_AFTER + 34} until={T_CLOSE - 16} />
                <Kicker size={36} color={C.claim} style={{ lineHeight: "54px" }}>
                  پیامد
                </Kicker>
                <Lines text={p.aftermath} size={sizeOf(p.aftermath)} from={T_AFTER + 40} />
              </Panel>
            </>
          ) : null}

        </div>
      ) : null}

      {/* 4 · the site's own caveat and where the card comes from, in the middle of the room between the folder and the closing line */}
      {frame >= T_CLOSE ? (
        <div style={{ position: "absolute", top: CLOSE_TOP, bottom: CLOSE_BOTTOM, left: SIDE, right: SIDE_RAIL, display: "flex", flexDirection: "column", justifyContent: "center", direction: "rtl" }}>
          <div style={{ fontFamily: NASKH, fontWeight: 500, fontSize: noteSize, lineHeight: 1.75, color: faded(C.ink, noteIn), textWrap: "balance", transform: `translateY(${rise(frame, T_CLOSE + 4, 34, 20)}px)` }}>
            <Mixed text={p.note} weight={500} />
          </div>
          {p.sources.length ? (
            <>
              <div style={{ height: 2, width: 160 * grow(frame, T_CLOSE + 38, 22), background: C.line2, marginTop: 38 }} />
              <div style={{ fontFamily: VAZIR, fontSize: 31, lineHeight: 1.9, color: faded(C.ink2, sourceIn), marginTop: 22 }}>
                <span style={{ fontWeight: 700, color: faded(C.ink3, sourceIn) }}>منبع:</span>{" "}
                {p.sources.map((host, k) => (
                  <React.Fragment key={host}>
                    {/* a host name reads left to right, and stays whole, inside the right-to-left line */}
                    <span style={{ whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", direction: "ltr", unicodeBidi: "isolate" }}>{host}</span>
                      {k < p.sources.length - 1 ? "،" : ""}
                    </span>
                    {k < p.sources.length - 1 ? " " : ""}
                  </React.Fragment>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {frame < HOOK + 10 ? <Dial year={year} given={p.year} until={HOOK} /> : null}
      <Foot opacity={fade(frame, T_CLOSE + 66, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
