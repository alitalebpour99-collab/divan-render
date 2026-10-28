// «اگر من بودم»: one office of the state as one Reel. The question on its desk, the
// decision a model would take in that seat, what may follow, what it does to the
// three goals and what would turn it around. All of it is the model's reading and
// marked as such on every scene after the first; every word comes from the props.
import React from "react";
import { AbsoluteFill, Audio, Easing, continueRender, delayRender, interpolate, staticFile } from "remotion";
import { getInfo as vazirInfo } from "@remotion/google-fonts/Vazirmatn";
import { DrawnEmblem } from "./emblems";
import { AiChip, Backdrop, Brand, C, FPS, Foot, GoalCard, H, Kicker, NASKH, Net, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, Seal, VAZIR, W, Words, clamped, during, ease, faDigits, fade, grow, leave, paint, pop, readFrames, rise, starts, useCurrentFrame } from "./kit";
import type { SeatProps } from "./props";
import { scenes, type Cues } from "./voice";

// Every digit is set in Vazirmatn, also inside a Naskh sentence: a face of Vazirmatn that
// holds nothing but the digits stands before Naskh in the font list of those sentences.
// Vazirmatn is the larger and the darker of the two at the same size and weight, so its
// digits are set a little smaller and a step lighter than the words around them.
const DIGITS = "DivanDigits";
const NASKH_TEXT = `${DIGITS}, "${NASKH}"`;
if (typeof FontFace !== "undefined" && typeof document !== "undefined") {
  const handle = delayRender("Fetching the digits of Vazirmatn");
  const file = `url(${vazirInfo().fonts.normal["400"].arabic}) format("woff2")`;
  const only = { unicodeRange: "U+06F0-06F9, U+0660-0669, U+066B-066C", sizeAdjust: "86%" };
  // medium text takes the first face, bold text the second
  const faces = [new FontFace(DIGITS, file, { ...only, weight: "300 400" }), new FontFace(DIGITS, file, { ...only, weight: "600" })];
  Promise.all(faces.map((face) => face.load().then(() => document.fonts.add(face))))
    .catch(() => undefined) // without them the digits stay in Naskh: still Persian, still readable
    .then(() => continueRender(handle));
}

const HOOK = 90;
const ASK = 126;
const LONGEST = 50 * FPS;
// the sheet lies between these two lines of the frame; the second is the edge of the desk
const SHEET_TOP = 298;
const DESK = 996;
// where the mark of the seat stands in the opening, and where it rests as the plate on the front of the desk
const MARK_TOP = 446;
const PLATE_TOP = 1052;
const PLATE = 0.44;
// the two outcomes stand a step apart, one on each side of the scale
const ASIDE = 140;
// the goal card of the kit, in its place near the bottom, begins about here
const GOALS_TOP = 1116;

const split = (text: string) => text.trim().split(/\s+/).filter(Boolean);
const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const between = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));

/** The lengths of the scenes (the seat, the desk, the decision, the outcomes, the goals, the question back) and the moments inside them, counted from the start of their scene. */
function plan(p: SeatProps) {
  // a Reel that runs much past three quarters of a minute loses its viewers: every scene has a ceiling
  let desk = between(26 + Math.round(readFrames(p.desk, 0) * 0.75), 190, 290);

  // the decision is said word by word; when the sentence is complete the seal comes down on it
  const said = split(p.decision).length;
  const pace = said > 28 ? 2.5 : 3;
  const sealed = 8 + Math.round(said * pace) + 8;
  const read = Math.max(sealed + 44, Math.round(readFrames(p.decision, 0) * 0.72));
  // the steps follow as far as the ceiling leaves time to read them
  const needs = p.steps.map((s) => Math.round(readFrames(s, 0) * 0.5));
  let shown = needs.length;
  while (shown > 0 && read + sum(needs.slice(0, shown)) * 0.7 + 12 > 480) shown -= 1;
  let decide = Math.min(480, read + sum(needs.slice(0, shown)) + 12);

  const good = Math.max(84, Math.round(readFrames(p.good[0] ?? "", 0) * 0.75));
  const bad = Math.max(128, Math.round(readFrames(p.bad[0] ?? "", 0) * 0.75) + 16);
  let outcomes = Math.min(300, 12 + good + bad);

  let goals = between(Math.round(readFrames(p.flip, 0) * 0.75) + 84, 200, 270);

  // and all of them together never pass fifty seconds
  const room = LONGEST - HOOK - ASK;
  const wanted = desk + decide + outcomes + goals;
  if (wanted > room) [desk, decide, outcomes, goals] = [desk, decide, outcomes, goals].map((n) => Math.floor((n * room) / wanted));

  // the sheet is read at the pace of its scene: the last word brightens a second before the sheet leaves
  const sweep = (desk - 26 - 40) / Math.max(1, split(p.desk).length);
  // each step comes in when a calm reader is about to reach it, the first right after the seal
  const before = needs.slice(0, shown).map((_, k) => sum(needs.slice(0, k)));
  const squeeze = Math.min(1, (decide - 12 - read) / Math.max(1, sum(needs.slice(0, shown))));
  const firstStep = sealed + 40;
  const lastStep = Math.max(firstStep + 22 * (shown - 1), decide - 14 - Math.round((needs[shown - 1] ?? 0) * squeeze));
  const stepAt = before.map((b) => Math.round(firstStep + ((lastStep - firstStep) * b) / Math.max(1, before[shown - 1])));
  // the bad outcome follows the good one closely: both are on the scale before either is read to its end
  const turn = 12 + between(Math.round(good * 0.4), 48, 70);

  const lengths = [HOOK, desk, decide, outcomes, goals, ASK];
  return { lengths, at: starts(lengths), total: sum(lengths), pace, sealed, shown, stepAt, sweep, turn };
}
export const seatDuration = (p: SeatProps) => plan(p).total;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts). */
export const seatCues = (p: SeatProps): Cues => ({ ...scenes(plan(p).at), decision: plan(p).at[2] });

// a long text is set smaller, so the longest episode stays inside its box and clear of the block under it
const officeSize = (t: string) => (t.length > 18 ? 100 : t.length > 11 ? 112 : t.length > 6 ? 150 : 190);
const deskSize = (t: string) => (t.length > 170 ? 54 : t.length > 125 ? 60 : t.length > 100 ? 66 : 72);
const decisionSize = (t: string) => (t.length > 150 ? 60 : t.length > 125 ? 64 : t.length > 95 ? 70 : 76);
const outcomeSize = (t: string) => (t.length > 100 ? 46 : t.length > 60 ? 50 : 54);
const flipSize = (t: string) => (t.length > 105 ? 56 : t.length > 85 ? 60 : t.length > 60 ? 66 : 72);

/** The top line of a scene: what kind of thing follows. Across from it, on the left, stands the mark that this is a model's reading (drawn once, for all scenes). */
const Head: React.FC<{ children: React.ReactNode; color?: string; size?: number; opacity?: number }> = ({ children, color = C.acc, size = 40, opacity = 1 }) => (
  <div style={{ position: "absolute", top: 216, right: SIDE, left: SIDE, height: 62, display: "flex", alignItems: "center", direction: "rtl", opacity }}>
    <Kicker color={color} size={size}>
      {children}
    </Kicker>
  </div>
);

/** The emblem of the office inside its ring. `draw` draws the lines of the emblem in, `turn` (degrees) turns the dotted ring. */
const Ring: React.FC<{ id: string; size: number; draw: number; turn: number }> = ({ id, size, draw, turn }) => (
  <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
      <circle cx="100" cy="100" r="97" fill={C.bg} />
      <circle cx="100" cy="100" r="97" fill={C.accSoft} stroke={C.acc} strokeWidth="2.2" />
      <circle cx="100" cy="100" r="88.5" fill="none" stroke={C.acc} strokeWidth="1.3" strokeDasharray="2 9.585" strokeLinecap="round" opacity=".8" transform={`rotate(${turn} 100 100)`} />
      <circle cx="100" cy="100" r="80" fill="none" stroke={C.acc} strokeWidth=".7" opacity=".55" />
    </svg>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <DrawnEmblem id={id} size={size * 0.64} color={C.ink} stroke={0.8} draw={draw} />
    </div>
  </div>
);

/** The seat as one mark: the ring, the name of the office and its branch of the state. Laid out once, then moved and scaled as a whole. */
const SeatMark: React.FC<{ p: SeatProps; top: number; scale: number; ring: number; draw: number; turn: number; name: number; lift: number; group: number; opacity?: number }> = ({ p, top, scale, ring, draw, turn, name, lift, group, opacity = 1 }) => (
  <div style={{ position: "absolute", top, left: SIDE, right: SIDE, display: "flex", flexDirection: "column", alignItems: "center", direction: "rtl", transform: `scale(${scale})`, transformOrigin: "50% 0", opacity }}>
    <div style={{ transform: `scale(${ring})` }}>
      <Ring id={p.emblem} size={360} draw={draw} turn={turn} />
    </div>
    <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: officeSize(p.office), lineHeight: 1.3, color: C.ink, textAlign: "center", textWrap: "balance", maxWidth: W - 2 * SIDE_RAIL, marginTop: 28, opacity: name, transform: `translateY(${lift}px)` }}>{p.office}</div>
    <div style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 38, color: C.ink2, marginTop: 10, opacity: group }}>{p.group}</div>
  </div>
);

/** The question on the sheet. Every word is there from the start and brightens when a calm reader would reach it; a closing question turns to the accent. */
const SheetText: React.FC<{ text: string; from: number; per: number }> = ({ text, from, per }) => {
  const frame = useCurrentFrame();
  const all = split(text);
  // the closing question: the words after the last full stop, when the text ends in a question mark and is not one question as a whole
  let ask = all.length;
  if (/؟$/.test(text.trim()))
    for (let i = all.length - 2; i >= 0; i -= 1)
      if (/[.؟!؛]$/.test(all[i])) {
        ask = i + 1;
        break;
      }
  return (
    <div style={{ fontFamily: NASKH_TEXT, fontWeight: 500, fontSize: deskSize(text), lineHeight: 1.7, direction: "rtl", textWrap: "pretty" }}>
      {all.map((w, i) => (
        <span key={i} style={{ color: `color-mix(in oklab, ${i >= ask ? C.acc : C.ink} ${Math.round(fade(frame, from + i * per, 9) * 100)}%, ${C.ink2})` }}>
          {w}{" "}
        </span>
      ))}
    </div>
  );
};

/** One outcome: its text on a card, with the edge in the colour of its side. */
const Outcome: React.FC<{ text: string; color: string; style?: React.CSSProperties }> = ({ text, color, style }) => (
  <div style={{ display: "flex", borderRadius: 24, background: C.panel, border: `1.5px solid ${C.line}`, overflow: "hidden", direction: "rtl", ...style }}>
    <span style={{ width: 10, background: color, flex: "none" }} />
    <div style={{ padding: "22px 30px 26px", fontFamily: VAZIR, fontWeight: 500, fontSize: outcomeSize(text), lineHeight: 1.65, color: C.ink, textWrap: "pretty" }}>{text}</div>
  </div>
);

/** The scale between the two outcomes. `built` 0 → 1 sets it up; `angle` (degrees) is positive when the right side, the good one, is the heavier; `good` and `bad` 0 → 1 drop the two weights into their pans. */
const Balance: React.FC<{ built: number; angle: number; good: number; bad: number }> = ({ built, angle, good, bad }) => {
  const a = (angle * Math.PI) / 180;
  const half = 286 * built;
  const px = 400;
  const py = 58;
  const dx = half * Math.cos(a);
  const dy = half * Math.sin(a);
  const side = (dir: 1 | -1, color: string, soft: string, on: number) => {
    const x = px + dir * dx;
    const y = py + dir * dy;
    const plate = y + 84;
    return (
      <g opacity={between((built - 0.6) / 0.4, 0, 1)}>
        <path d={`M${x} ${y}L${x - 50} ${plate}M${x} ${y}L${x + 50} ${plate}`} stroke={C.ink2} strokeWidth="2.5" />
        <path d={`M${x - 52} ${plate}Q${x} ${plate + 36} ${x + 52} ${plate}z`} fill={soft} />
        <path d={`M${x - 60} ${plate}H${x + 60}`} stroke={color} strokeWidth="6" />
        <circle cx={x} cy={plate - 23 - 70 * (1 - on)} r="20" fill={color} opacity={Math.min(1, on * 2)} />
        <circle cx={x} cy={y} r="7" fill={C.ink} />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 800 250" width="928" height="290" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto" }}>
      <path d={`M${px} 226V${226 - (226 - py) * built}`} stroke={C.ink2} strokeWidth="6" />
      <path d={`M${px - 70 * built} 226H${px + 70 * built}`} stroke={C.ink2} strokeWidth="6" />
      <path d={`M${px - dx} ${py - dy}L${px + dx} ${py + dy}`} stroke={C.ink} strokeWidth="6" />
      {side(1, C.acc, C.accSoft, good)}
      {side(-1, C.strike, C.strikeSoft, bad)}
      <circle cx={px} cy={py} r="12" fill={C.bg} stroke={C.ink} strokeWidth="5" opacity={built} />
    </svg>
  );
};

/** The way of the decision and its way back. `drawn` 0 → 1 draws the road; `along` 0 → 1 sends a point down it. */
const Turn: React.FC<{ drawn: number; along: number }> = ({ drawn, along }) => {
  const OUT = 534;
  const BEND = Math.PI * 55;
  const BACK = 440;
  const ALL = OUT + BEND + BACK;
  const at = (s: number) => (s <= OUT ? { x: 684 - s, y: 50 } : s <= OUT + BEND ? { x: 150 - 55 * Math.sin((s - OUT) / 55), y: 105 - 55 * Math.cos((s - OUT) / 55) } : { x: 150 + (s - OUT - BEND), y: 160 });
  const out = Math.min(1, (drawn * ALL) / OUT);
  const back = between((drawn * ALL - OUT) / (BEND + BACK), 0, 1);
  const point = at(along * ALL);
  return (
    <svg viewBox="0 0 760 210" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: "100%", height: "100%", maxHeight: 230 }}>
      <g transform="translate(692 18)" opacity={Math.min(1, drawn * 12)}>
        <Seal size={64} word={false} />
      </g>
      {out > 0 ? <path d="M684 50H150" pathLength={1} stroke={C.ink2} strokeWidth="6" strokeDasharray="1 2" strokeDashoffset={1 - out} /> : null}
      {back > 0 ? <path d="M150 50a55 55 0 0 0 0 110H590" pathLength={1} stroke={C.claim} strokeWidth="6" strokeDasharray="1 2" strokeDashoffset={1 - back} /> : null}
      <path d="M566 136l26 24-26 24" stroke={C.claim} strokeWidth="6" opacity={between((back - 0.94) / 0.06, 0, 1)} />
      <circle cx={point.x} cy={point.y} r="11" fill={along * ALL > OUT ? C.claim : C.ink} opacity={Math.min(1, along * 10, (1 - along) * 10)} />
    </svg>
  );
};

export const Seat: React.FC<SeatProps> = (p) => {
  paint("seat");
  const frame = useCurrentFrame();
  const t = plan(p);
  const { total } = t;
  const [, T_DESK, T_DECIDE, T_OUT, T_GOALS, T_ASK] = t.at;
  const body: React.CSSProperties = { position: "absolute", right: SIDE, left: SIDE, direction: "rtl" };
  const turn = frame * 0.2;

  // the mark of the seat goes down from the opening to the front of the desk
  const down = interpolate(frame, [T_DESK - 22, T_DESK + 4], [0, 1], { ...clamped, easing: Easing.inOut(Easing.cubic) });
  // the legs of the desk grow down from its edge
  const legs = 420 * grow(frame, T_DESK + 6, 30);
  // the sheet comes over the desk from the right and settles on its edge
  const land = interpolate(frame, [T_DESK + 2, T_DESK + 28], [0, 1], { ...clamped, easing: ease });
  // the seal comes down when the sentence is complete
  const stamp = T_DECIDE + t.sealed;
  // the scale: first the good side is the heavier, then the bad, then it levels and only breathes
  const o = frame - T_OUT;
  const angle =
    interpolate(o, [34, 54, 64, t.turn + 20, t.turn + 44, t.turn + 54, t.turn + 62, t.turn + 88, t.turn + 104, t.turn + 118], [0, 10, 8.5, 8.5, -10, -8.5, -8.5, 2, -0.7, 0], { ...clamped, easing: Easing.inOut(Easing.sin) }) +
    0.6 * Math.sin((o - t.turn - 118) / 24) * fade(o, t.turn + 118, 30);
  // the road of the last scene is drawn once, then a point keeps going down it
  const g = frame - T_GOALS;

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      <Backdrop total={total} glowY={34} />
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Brand tag={p.series} />
      <Progress total={total} marks={t.at.slice(1)} />

      {/* 1 · the seat: nothing fades in from black, the name, the kicker and the ring are there on the first frame */}
      {frame < T_DESK ? (
        <AbsoluteFill style={{ opacity: leave(frame, T_DESK - 4, 14) }}>
          <Net total={total} />
          <div style={{ position: "absolute", top: 336, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, direction: "rtl" }}>
            <span style={{ width: 110 * grow(frame, 0, 26), height: 3, borderRadius: 2, background: C.accLine }} />
            <Kicker size={46}>اگر من بودم</Kicker>
            <span style={{ width: 110 * grow(frame, 0, 26), height: 3, borderRadius: 2, background: C.accLine }} />
          </div>
        </AbsoluteFill>
      ) : null}

      {/* from the second scene to the end, across from each scene's kicker: all that follows is a model's reading */}
      <div style={{ position: "absolute", top: 216, left: SIDE, height: 62, display: "flex", alignItems: "center", opacity: fade(frame, T_DESK, 12) }}>
        <AiChip />
      </div>

      {/* 2 · the question on the desk */}
      {frame >= T_DESK - 2 && frame < T_DECIDE ? (
        <AbsoluteFill style={{ opacity: leave(frame, T_DECIDE, 12) }}>
          <Head opacity={fade(frame, T_DESK, 12)}>روی میز</Head>
          {/* the desk: its edge, drawn from the right, and its two legs */}
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <linearGradient id="seat-leg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={C.ink2} stopOpacity=".8" />
                <stop offset="1" stopColor={C.ink2} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="seat-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={C.ink} stopOpacity=".07" />
                <stop offset="1" stopColor={C.ink} stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="96" y={DESK} width={W - 192} height={420} fill="url(#seat-front)" opacity={fade(frame, T_DESK + 8, 20)} />
            {legs > 1 ? (
              <>
                <rect x="94" y={DESK} width="4" height={legs} fill="url(#seat-leg)" />
                <rect x={W - 98} y={DESK} width="4" height={legs} fill="url(#seat-leg)" />
              </>
            ) : null}
            {frame > T_DESK - 2 ? <line x1={W - 36} x2={W - 36 - (W - 72) * grow(frame, T_DESK - 2, 24)} y1={DESK} y2={DESK} stroke={C.ink2} strokeWidth="5" strokeLinecap="round" /> : null}
          </svg>
          <div style={{ position: "absolute", top: SHEET_TOP, left: SIDE, right: SIDE, height: DESK - 3 - SHEET_TOP, transform: `translateX(${(1 - land) * W}px) rotate(${-4 * (1 - land)}deg)`, transformOrigin: "0% 100%" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "36px 46px", background: `color-mix(in oklab, ${C.ink} 5%, ${C.panel})`, border: `1.5px solid ${C.line2}`, borderRadius: "0 10px 3px 3px", clipPath: "polygon(46px 0, 100% 0, 100% 100%, 0 100%, 0 46px)" }}>
              <SheetText text={p.desk} from={T_DESK + 26} per={t.sweep} />
            </div>
            {/* the folded corner */}
            <svg width="46" height="46" style={{ position: "absolute", top: 0, left: 0 }}>
              <path d="M46 0V46H0z" fill="rgba(237,230,214,.14)" stroke={C.line2} strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        </AbsoluteFill>
      ) : null}
      {/* the mark of the seat: large in the opening, then the plate on the front of the desk (it passes in front of the desk's edge on its way down) */}
      {frame < T_DECIDE ? (
        <SeatMark
          p={p}
          top={MARK_TOP + (PLATE_TOP - MARK_TOP) * down}
          scale={1 - (1 - PLATE) * down}
          ring={pop(frame, -6, 24)}
          draw={grow(frame, -8, 50)}
          turn={turn}
          name={fade(frame, -5, 14)}
          lift={rise(frame, -5, 44, 24)}
          group={fade(frame, 16, 12) * (1 - down)}
          opacity={leave(frame, T_DECIDE, 12)}
        />
      ) : null}

      {/* 3 · the decision, sealed, and its steps */}
      {frame >= T_DECIDE - 2 && frame < T_OUT + 2 ? (
        <AbsoluteFill style={{ opacity: during(frame, T_DECIDE, T_OUT, 12) }}>
          <Head>تصمیم</Head>
          <div style={{ ...body, top: 300 }}>
            <div style={{ display: "flex", gap: 26 }}>
              {/* the edge of the sentence grows down beside it at the pace of its words */}
              <span style={{ width: 8, borderRadius: 4, background: C.acc, flex: "none", transform: `scaleY(${interpolate(frame, [T_DECIDE + 4, stamp - 6], [0.04, 1], clamped)})`, transformOrigin: "50% 0" }} />
              <Words text={p.decision} from={T_DECIDE + 8} step={t.pace} style={{ flex: 1, fontFamily: NASKH_TEXT, fontWeight: 700, fontSize: decisionSize(p.decision), lineHeight: 1.6, color: C.ink, textWrap: "pretty" }} />
            </div>
            {/* this lower block reaches under the middle of the frame: it keeps clear of the buttons on the right */}
            <div style={{ marginRight: SIDE_RAIL - SIDE }}>
              <div style={{ display: "flex", alignItems: "center", gap: 22, height: 196, marginTop: 10 }}>
                {t.shown ? <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 38, color: C.ink2, opacity: fade(frame, stamp + 20, 10) }}>گام‌ها</span> : null}
                <span style={{ flex: 1, height: 2, background: C.line2, transform: `scaleX(${t.shown ? grow(frame, stamp + 22, 24) : 0})`, transformOrigin: "100% 50%" }} />
                <div style={{ position: "relative", width: 196, height: 196, flex: "none" }}>
                  <svg viewBox="0 0 196 196" width="196" height="196" style={{ position: "absolute", inset: 0, opacity: fade(frame, stamp + 22, 14) }}>
                    <circle cx="98" cy="98" r="95" fill="none" stroke={C.acc} strokeWidth="1.6" strokeDasharray="2 8.658" strokeLinecap="round" opacity=".8" transform={`rotate(${-turn} 98 98)`} />
                  </svg>
                  <div style={{ position: "absolute", inset: 13, opacity: fade(frame, stamp, 8), transform: `scale(${interpolate(frame, [stamp, stamp + 16, stamp + 24], [1.9, 0.93, 1], clamped)}) rotate(${interpolate(frame, [stamp, stamp + 20], [-18, -7], clamped)}deg)` }}>
                    <Seal size={170} filled />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 6 }}>
                {p.steps.slice(0, t.shown).map((step, k) => {
                  const from = T_DECIDE + t.stepAt[k];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 20, opacity: fade(frame, from, 12), transform: `translateY(${rise(frame, from, 24, 16)}px)` }}>
                      <span style={{ width: 58, height: 58, borderRadius: 29, border: `2.5px solid ${C.acc}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 32, color: C.ink, flex: "none", transform: `scale(${pop(frame, from, 18)})` }}>{faDigits(k + 1)}</span>
                      <span style={{ fontFamily: VAZIR, fontWeight: 500, fontSize: 38, lineHeight: 1.55, color: C.ink, textWrap: "pretty" }}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* 4 · what may follow: the good outcome on the right of the scale, the bad one on the left */}
      {frame >= T_OUT - 2 && frame < T_GOALS + 2 ? (
        <AbsoluteFill style={{ opacity: during(frame, T_OUT, T_GOALS, 12) }}>
          <Head>اگر خوب پیش برود</Head>
          <div style={{ ...body, top: 298 }}>
            {p.good[0] ? <Outcome text={p.good[0]} color={C.acc} style={{ marginLeft: ASIDE, opacity: fade(frame, T_OUT + 12, 12), transform: `translateX(${rise(frame, T_OUT + 12, 50, 20)}px)` }} /> : null}
            <div style={{ margin: "22px 0 4px" }}>
              <Balance built={grow(frame, T_OUT + 2, 26)} angle={angle} good={grow(frame, T_OUT + 24, 14)} bad={grow(frame, T_OUT + t.turn + 10, 14)} />
            </div>
            {p.bad[0] ? (
              <>
                <Kicker color={C.strike} style={{ marginRight: ASIDE, opacity: fade(frame, T_OUT + t.turn - 4, 10) }}>
                  اگر بد پیش برود
                </Kicker>
                <Outcome text={p.bad[0]} color={C.strike} style={{ marginRight: ASIDE, marginTop: 14, opacity: fade(frame, T_OUT + t.turn, 12), transform: `translateX(${-rise(frame, T_OUT + t.turn, 50, 20)}px)` }} />
              </>
            ) : null}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* 5 · what would turn the decision around, over what it does to the three goals */}
      {frame >= T_GOALS - 2 && frame < T_ASK + 2 ? (
        <AbsoluteFill style={{ opacity: during(frame, T_GOALS, T_ASK, 12) }}>
          <Head color={C.claim} size={36}>
            چه چیزی این تصمیم را برمی‌گرداند؟
          </Head>
          <div style={{ ...body, top: 304, bottom: H - GOALS_TOP + 22, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 26, flex: "none" }}>
              <span style={{ width: 8, borderRadius: 4, background: C.claim, flex: "none", transform: `scaleY(${grow(frame, T_GOALS + 4, 30)})`, transformOrigin: "50% 0" }} />
              <div style={{ fontFamily: NASKH_TEXT, fontWeight: 500, fontSize: flipSize(p.flip), lineHeight: 1.62, color: C.ink, textWrap: "pretty", opacity: fade(frame, T_GOALS + 6, 14), transform: `translateY(${rise(frame, T_GOALS + 6, 36, 22)}px)` }}>{p.flip}</div>
            </div>
            <div style={{ flex: 1, minHeight: 0, marginRight: SIDE_RAIL - SIDE, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Turn drawn={grow(g, 26, 70)} along={g < 104 ? 0 : ((g - 104) % 110) / 110} />
            </div>
          </div>
          <GoalCard goals={p.goals} from={T_GOALS + 34} style={{ position: "absolute", bottom: SAFE_BOTTOM + 14, right: SIDE_RAIL - 12, left: 34, opacity: fade(frame, T_GOALS + 22, 14) }} />
        </AbsoluteFill>
      ) : null}

      {/* 6 · the question goes back to the viewer, and the seat comes back with it */}
      {frame >= T_ASK - 2 ? (
        <AbsoluteFill style={{ opacity: fade(frame, T_ASK, 12) }}>
          <Net total={total} opacity={0.36} top={700} />
          <div style={{ ...body, top: 282, fontFamily: NASKH, fontWeight: 700, fontSize: 124, lineHeight: 1.36, color: C.ink, textAlign: "center", transform: `translateY(${rise(frame, T_ASK, 44, 22)}px)` }}>
            تو در این جایگاه
            <span style={{ display: "block", color: C.acc }}>چه می‌کردی؟</span>
          </div>
          <SeatMark p={p} top={680} scale={0.72} ring={pop(frame, T_ASK + 8, 22)} draw={grow(frame, T_ASK + 12, 40)} turn={turn} name={fade(frame, T_ASK + 20, 12)} lift={rise(frame, T_ASK + 20, 30, 18)} group={fade(frame, T_ASK + 30, 12)} />
        </AbsoluteFill>
      ) : null}

      <Foot opacity={fade(frame, T_ASK + 50, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
