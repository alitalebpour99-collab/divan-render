// «دههٔ تو»: the Iran a generation was born into, against today (World Bank,
// lib/social/formats.ts). About twenty seconds, on a screen split in two: the
// side where time begins (the right, in Persian) is an old photo, sepia with a
// grain that never stands still, dust and a scratch now and then; the other
// side is the night of every Reel.
//
// The beats: the name of the generation very large on the old photo and the
// question; the night comes in from the left and the year is stamped in violet
// ink, like the stamp on a birth certificate, with «امروز» across from it; four
// rows, each crossed by a wipe that counts the old figure up and then the new
// one; the photo comes back over the whole screen with the call to send it to
// someone of that generation, and the source. The ground of both halves is the
// safe stage's (Safe.tsx draws DecadeGround full-bleed), so the old photo
// reaches the screen's edges; the layout recolours what crosses the seam.
import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame as useFilmFrame, useVideoConfig } from "remotion";
import { HUES } from "./hues";
import { C, H, NASKH, OnStage, SIDE, STAGE_K, STAGE_X, Sfx, VAZIR, W, Words, clamped, ease, fade, grow, layoutFrame, leave, paint, pop, rise, useCurrentFrame } from "./kit";
import type { DecadeProps, DecadeRow } from "./props";
import { scenes, type Cues } from "./voice";
import { seriesText } from "./values";

// ---------- the moments, in frames of the layout ----------
const Q = 0;
/** the night comes in and the year is stamped */
const YEAR = 60;
const SWEEP = 20;
/** the year and «امروز» rise to be the heads of the two columns */
const LIFT = 100;
const ROW0 = 140;
/** each row: label, the wipe with both counts, what changed; whole by ROW − 18, where the picture may wait for the narrator */
const ROW = 90;
const endOf = (rows: number) => ROW0 + rows * ROW + 10;
export const decadeDuration = (p: { rows: unknown[] }) => endOf(p.rows.length) + 120;
/** The narrator's moments in this layout (voice.ts; the site's lines name them, lib/social/voice.ts): the question, then one line per row. */
export const decadeCues = (p: { rows: unknown[] }): Cues => {
  const rows = p.rows.map((_, i) => ROW0 + i * ROW);
  return { ...scenes([Q, YEAR, ...rows, endOf(p.rows.length)]), start: Q + 2, ...Object.fromEntries(rows.map((at, i) => [`r${i + 1}`, at])) };
};

// ---------- the two grounds ----------
/** The old photo: its paper, its inks, and the violet of the stamp (the series' own hue). */
export const OLD = { ground: "#D6BF98", light: "#ECDDBE", ink: "#2A1B0D", ink2: "#5A4128", ink3: "#7E664A", line: "rgba(42,27,13,.24)" };
export const STAMP = `oklch(0.43 0.15 ${HUES.decade})`;
type Tone = "old" | "new";
const ink = (t: Tone) => (t === "old" ? OLD.ink : C.ink);
const ink2 = (t: Tone) => (t === "old" ? OLD.ink2 : C.ink2);
const mark = (t: Tone) => (t === "old" ? STAMP : C.acc);

/** How much of the screen's width the night covers, from the left: none on the old photo, half while the rows are read. */
const inOut = Easing.inOut(Easing.cubic);
export function nightShare(frame: number, rows: number): number {
  const end = endOf(rows);
  return interpolate(frame, [YEAR, YEAR + SWEEP], [0, 0.5], { ...clamped, easing: inOut }) - interpolate(frame, [end + 6, end + 6 + SWEEP], [0, 0.5], { ...clamped, easing: inOut });
}

// textures drawn once by the browser and moved about: a grain that never stands still costs almost nothing
const tile = (body: string, size: number) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${body}</svg>`)}")`;
/** dark specks where the noise is low */
const GRAIN = tile(`<filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.10 0 0 0 0 0.04 -2.6 0 0 0 1.42'/></filter><rect width='100%' height='100%' filter='url(#g)'/>`, 256);
/** light specks where it is high */
const SHINE = tile(`<filter id='s' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='11' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 0.97 0 0 0 0 0.88 2.8 0 0 0 -1.62'/></filter><rect width='100%' height='100%' filter='url(#s)'/>`, 256);
/** the uneven toning of an old print, in wide soft patches */
const STAINS = tile(`<filter id='t' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.004' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0 0.08 -1.6 0 0 0 0.92'/></filter><rect width='100%' height='100%' filter='url(#t)'/>`, 720);
/** a rubber stamp's ink is never even: the stamp is seen through this */
const INKED = tile(`<filter id='i' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3.4 0 0 0 -0.72'/></filter><rect width='100%' height='100%' filter='url(#i)'/>`, 240);

/** A number in 0–1 that is the same for the same frame and key: the grain, the dust and the scratches move without a seed. */
const chance = (tick: number, key: number) => {
  const a = Math.sin((tick + 1) * 12.9898 + key * 78.233) * 43758.5453;
  return a - Math.floor(a);
};

/**
 * The old photo, full-screen; the ground shows as much of it as the night
 * leaves. Its grain stands still, as a print's does: a grain that changed on
 * every frame could not be compressed (a sample of 21 seconds came to 134 MB).
 * Only the dust and a scratch now and then come and go, a few pixels each.
 */
const OldPhoto: React.FC<{ film: number }> = ({ film }) => {
  const tick = Math.floor(film / 3);
  const r = (k: number) => chance(tick, k);
  return (
    <AbsoluteFill style={{ background: OLD.ground }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 1150px at 58% 42%, ${OLD.light}, transparent 72%)` }} />
      <AbsoluteFill style={{ backgroundImage: STAINS, backgroundSize: "720px 720px", opacity: 0.2 }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: "256px 256px", opacity: 0.45 }} />
      <AbsoluteFill style={{ backgroundImage: SHINE, backgroundSize: "256px 256px", backgroundPosition: "97px 41px", opacity: 0.4 }} />
      {/* a scratch down the print now and then, and a few specks of dust */}
      {r(5) < 0.3 ? <div style={{ position: "absolute", top: 0, bottom: 0, left: r(6) * W, width: 1 + r(7) * 1.5, background: "rgba(42,27,13,.2)" }} /> : null}
      {r(8) < 0.2 ? <div style={{ position: "absolute", top: r(9) * H * 0.5, height: H * (0.2 + r(10) * 0.4), left: r(11) * W, width: 1.5, background: "rgba(250,240,220,.45)" }} /> : null}
      {[0, 1, 2, 3].map((i) =>
        r(20 + i) < 0.45 ? <div key={i} style={{ position: "absolute", left: r(30 + i) * W, top: r(40 + i) * H, width: 2 + r(50 + i) * 4, height: 2 + r(60 + i) * 4, borderRadius: "50%", background: "rgba(42,27,13,.32)" }} /> : null,
      )}
      {/* darker toward the edges of the print */}
      <AbsoluteFill style={{ background: "radial-gradient(1250px 1700px at 58% 46%, transparent 52%, rgba(74,46,18,.46) 100%)" }} />
    </AbsoluteFill>
  );
};

/** The night ground of every Reel (Safe.tsx, Ground): its glow, its slow grid. */
const Night: React.FC<{ film: number }> = ({ film }) => {
  const { durationInFrames } = useVideoConfig();
  const drift = film / durationInFrames;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 1100px at 25% 42%, ${C.glow}, transparent 70%)` }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`, backgroundSize: "120px 120px", backgroundPosition: `${-drift * 60}px ${-drift * 120}px`, opacity: 0.3 }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(13,19,34,0) 55%, rgba(13,19,34,.75) 100%)" }} />
    </AbsoluteFill>
  );
};

/**
 * The ground of the whole screen: the night on the left, the old photo on the
 * right, and the seam between them, bright while it moves. It follows the
 * layout's own clock, which waits for the narrator, so the seam and the
 * layout's halves stay on the same pixels.
 */
export const DecadeGround: React.FC<{ reel: Pick<DecadeProps, "rows" | "holds"> }> = ({ reel }) => {
  const film = useFilmFrame();
  const frame = layoutFrame(film, reel.holds ?? []);
  const s = nightShare(frame, reel.rows.length);
  const x = s * W;
  const moving = s > 0.002 && s < 0.498;
  return (
    <AbsoluteFill>
      <Night film={film} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: x, right: 0, overflow: "hidden" }}>
        {/* anchored to the screen, so the photo's grain and stains do not slide with the seam */}
        <div style={{ position: "absolute", top: 0, right: 0, width: W, height: H }}>
          <OldPhoto film={film} />
        </div>
      </div>
      {s > 0.002 ? (
        <>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: x - 60, width: 60, background: "linear-gradient(90deg, transparent, rgba(0,0,0,.28))" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: x - (moving ? 3 : 1.5), width: moving ? 6 : 3, background: C.acc, opacity: moving ? 1 : 0.75, boxShadow: moving ? `0 0 46px 10px ${C.accLine}` : `0 0 18px 2px ${C.accSoft}` }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- the layout ----------
/** What sits across the seam is drawn twice, in each half's own inks, each copy cut at the seam. */
const TwoTone: React.FC<{ seam: number; children: (tone: Tone) => React.ReactNode }> = ({ seam, children }) => (
  <>
    {seam < W ? <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${Math.max(0, seam)}px)` }}>{children("old")}</AbsoluteFill> : null}
    {seam > 0 ? <AbsoluteFill style={{ clipPath: `inset(0 ${Math.max(0, W - seam)}px 0 0)` }}>{children("new")}</AbsoluteFill> : null}
  </>
);

/** The largest size at which a line fits a width, measured in the browser with the font itself; an estimate where it cannot measure. */
const fitted = new Map<string, number>();
function fit(text: string, family: string, weight: number, width: number, max: number, min = 40): number {
  const id = `${family}|${weight}|${width}|${max}|${text}`;
  const known = fitted.get(id);
  if (known) return known;
  let size = Math.max(min, Math.min(max, Math.floor(width / Math.max(1, text.length * 0.52))));
  try {
    const font = `${weight} 100px ${/["']/.test(family) ? family : `"${family}"`}`;
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = font;
      const w = ctx.measureText(text).width;
      if (w > 0) {
        size = Math.max(min, Math.min(max, Math.floor((width / w) * 100)));
        if (document.fonts?.check(font, text)) fitted.set(id, size);
      }
    }
  } catch {
    // no canvas: the estimate stands
  }
  return size;
}

/** A figure as its number and its unit («۵۱٫۴» and «میلیون»); a percent keeps its sign with the number. */
const split = (text: string) => {
  const m = text.trim().match(/^([0-9۰-۹٫٬.,٪%−-]+)\s*(.*)$/);
  return m ? { num: m[1], unit: m[2] } : { num: text, unit: "" };
};

const HALF = W / 2;
const COL = HALF - SIDE;
const OLD_X = HALF;
const NEW_X = SIDE;
const ROWS_TOP = 400;
const ROW_H = 292;

/** One row: what is measured; the wipe crosses it right to left, counting the old figure up and then the new one from the old; what changed lands last. */
const Row: React.FC<{ row: DecadeRow; at: number; top: number; out: number }> = ({ row, at, top, out }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -2) return null;
  // the wipe runs from the old side's outer edge to the new side's, crossing the seam halfway
  const wx = interpolate(t, [4, 60], [W - SIDE + 14, SIDE - 14], { ...clamped, easing: Easing.inOut(Easing.quad) });
  const kOld = grow(frame, at + 6, 26);
  const kNew = grow(frame, at + 34, 26);
  const was = split(row.then.text);
  const is = split(row.now.text);
  const oldShown = split(kOld >= 0.999 ? row.then.text : seriesText(row.unit, row.then.value * kOld));
  const newShown = split(kNew >= 0.999 ? row.now.text : seriesText(row.unit, row.then.value + (row.now.value - row.then.value) * kNew));
  // one size for both figures of a row, so the two read as a pair
  const size = Math.min(fit(was.num, VAZIR, 800, COL - 60, 120), fit(is.num, VAZIR, 800, COL - 60, 120));
  const wipe = Math.min(fade(frame, at + 2, 4), leave(frame, at + 64, 6));
  const figure = (colour: string): React.CSSProperties => ({ fontFamily: VAZIR, fontWeight: 800, fontSize: size, lineHeight: 1.05, color: colour, whiteSpace: "nowrap", direction: "rtl" });
  const centred: React.CSSProperties = { position: "absolute", width: COL, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" };
  return (
    <div style={{ position: "absolute", top, left: 0, width: W, height: ROW_H, opacity: out }}>
      {/* what is measured, over the old figure; what changed, over the new one */}
      <div style={{ ...centred, left: OLD_X, top: 0, opacity: fade(frame, at, 8), transform: `translateY(${rise(frame, at, 16, 12)}px)` }}>
        <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: OLD.ink2, whiteSpace: "nowrap" }}>{row.label}</span>
      </div>
      <div style={{ ...centred, left: NEW_X, top: 0 }}>
        <span style={{ padding: "2px 20px 6px", borderRadius: 40, background: C.acc, color: C.onAcc, fontFamily: VAZIR, fontWeight: 800, fontSize: 30, whiteSpace: "nowrap", transform: `scale(${pop(frame, at + 60, 12)})` }}>{row.change}</span>
      </div>

      {/* the figures, each seen only where the wipe has passed */}
      <div style={{ ...centred, left: OLD_X, top: 58, clipPath: wx > OLD_X ? `inset(0 0 0 ${wx - OLD_X}px)` : "none" }}>
        <span style={figure(OLD.ink)}>{oldShown.num}</span>
        <span style={{ marginTop: 6, fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: OLD.ink2, minHeight: 44 }}>{was.unit}</span>
      </div>
      <div style={{ ...centred, left: NEW_X, top: 58, clipPath: wx > NEW_X ? `inset(0 0 0 ${wx - NEW_X}px)` : "none" }}>
        <span style={{ ...figure(C.ink), transform: `scale(${interpolate(t, [60, 64, 70], [1, 1.06, 1], clamped)})` }}>{newShown.num}</span>
        <span style={{ marginTop: 6, fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: C.ink2, minHeight: 44, whiteSpace: "nowrap" }}>
          {is.unit}
          <span style={{ fontWeight: 500, fontSize: 28, color: C.ink3, marginRight: is.unit ? 14 : 0 }}>{row.now.year}</span>
        </span>
      </div>

      {/* the wipe: a line of the series' light with a soft trail where it has been */}
      {t >= 0 && t <= 72 ? (
        <>
          <div style={{ position: "absolute", top: 54, height: ROW_H - 100, left: wx, width: 150, background: `linear-gradient(90deg, ${C.accSoft}, transparent)`, opacity: wipe }} />
          <div style={{ position: "absolute", top: 48, height: ROW_H - 88, left: wx - 3, width: 6, borderRadius: 3, background: C.acc, boxShadow: `0 0 28px 6px ${C.accLine}`, opacity: wipe }} />
        </>
      ) : null}

      {/* the rule under the row, in each half's ink */}
      <div style={{ position: "absolute", top: ROW_H - 34, left: HALF + 30, width: COL - 30, height: 2, background: OLD.line, opacity: fade(frame, at + 58, 10) }} />
      <div style={{ position: "absolute", top: ROW_H - 34, left: SIDE, width: COL - 30, height: 2, background: C.line2, opacity: fade(frame, at + 58, 10) }} />
    </div>
  );
};

export const Decade: React.FC<DecadeProps> = (p) => {
  paint("decade");
  const frame = useCurrentFrame();
  const stage = React.useContext(OnStage);
  const n = p.rows.length;
  const END = endOf(n);
  const total = decadeDuration(p);
  // the seam on this layout's own plane: the ground is drawn on the screen, the layout a little smaller on the stage
  const s = nightShare(frame, n);
  const seam = stage ? (s * W - STAGE_X) / STAGE_K : s * W;

  // the opening: the name very large, the question under it
  // set in Vazirmatn: the large lines must not depend on the Naskh face, which the renderer on GitHub does not always draw
  const nameSize = fit(p.name, VAZIR, 800, W - 2 * SIDE, 230, 120);
  const openOut = leave(frame, YEAR + 4, 14);
  // the year and «امروز»: stamped large across from each other, then risen to head the columns
  const lift = interpolate(frame, [LIFT, LIFT + 20], [0, 1], { ...clamped, easing: ease });
  const headY = interpolate(lift, [0, 1], [760, 278]);
  const headK = interpolate(lift, [0, 1], [1.1, 0.6]);
  const stamp = interpolate(frame, [YEAR + 10, YEAR + 17, YEAR + 22], [1.7, 0.93, 1], { ...clamped, easing: ease });
  const rowsOut = leave(frame, END + 8, 12);
  const endIn = END + 24;

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} volume={0.85} /> : null}
      {/* off the safe stage (a preview of the layout alone) the layout brings its own ground */}
      {stage ? null : <DecadeGround reel={p} />}

      {/* the name and the kind of Reel, in whichever ink the ground under them asks for */}
      <TwoTone seam={seam}>
        {(t) => (
          <>
            <div style={{ position: "absolute", top: 60, right: SIDE, left: SIDE, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 52, color: ink(t) }}>دیوان</span>
              <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: mark(t) }}>{p.kicker}</span>
            </div>
            <div style={{ position: "absolute", top: 150, right: SIDE, left: SIDE, height: 4, background: ink(t), opacity: 0.8 }} />
          </>
        )}
      </TwoTone>

      {/* the opening, on the old photo */}
      <Sfx at={Q} name="hit" />
      {frame < YEAR + 6 ? (
        <TwoTone seam={seam}>
          {(t) => (
            <div style={{ position: "absolute", top: 520, right: SIDE, left: SIDE, opacity: openOut, transform: `translateY(${interpolate(frame, [YEAR - 10, YEAR + 4], [0, -70], { ...clamped, easing: ease })}px)` }}>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: nameSize, lineHeight: 1.3, color: ink(t), whiteSpace: "nowrap", transform: `scale(${interpolate(frame, [0, YEAR], [1.04, 1], { ...clamped, easing: ease })})`, transformOrigin: "right center" }}>{p.name}</div>
              <div style={{ width: interpolate(frame, [4, 26], [0, 260], { ...clamped, easing: ease }), height: 8, borderRadius: 4, background: mark(t), margin: "18px 0 34px" }} />
              <Words text={p.question} from={2} step={2} lift={20} style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: p.question.length > 44 ? 66 : 74, lineHeight: 1.55, color: ink(t) }} />
            </div>
          )}
        </TwoTone>
      ) : null}

      {/* the year in violet ink on the old half, «امروز» on the night */}
      <Sfx at={YEAR - 2} name="whoosh" />
      <Sfx at={YEAR + 12} name="hit" />
      <Sfx at={YEAR + 24} name="pop" />
      <Sfx at={LIFT} name="swish" />
      {frame >= YEAR + 8 && frame < END + 22 ? (
        <>
          <div style={{ position: "absolute", left: OLD_X, width: COL, top: headY, height: 0, opacity: rowsOut }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: `translateY(-50%) scale(${headK})`, transformOrigin: "50% 50%" }}>
              <div style={{ position: "relative", padding: "10px 40px 18px", border: `7px solid ${STAMP}`, borderRadius: 22, color: STAMP, fontFamily: VAZIR, fontWeight: 800, fontSize: 150, lineHeight: 1.1, transform: `rotate(-5deg) scale(${stamp})`, opacity: fade(frame, YEAR + 10, 3), WebkitMaskImage: INKED, maskImage: INKED, WebkitMaskSize: "240px 240px", maskSize: "240px 240px" }}>
                <div style={{ position: "absolute", inset: 9, border: `2.5px solid ${STAMP}`, borderRadius: 14 }} />
                {p.year}
              </div>
              <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 44, color: OLD.ink2, whiteSpace: "nowrap", opacity: fade(frame, YEAR + 20, 10) }}>{`${p.gregorian} · ${p.note}`}</div>
            </div>
          </div>
          <div style={{ position: "absolute", left: NEW_X, width: COL, top: headY, height: 0, opacity: rowsOut }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: `translateY(-50%) scale(${headK})`, transformOrigin: "50% 50%", opacity: fade(frame, YEAR + 22, 10) }}>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 150, lineHeight: 1.1, color: C.ink, padding: "10px 0 18px", transform: `translateY(${rise(frame, YEAR + 22, 40, 16)}px)` }}>{p.today}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 44, color: C.ink3, whiteSpace: "nowrap" }}>{p.todayNote}</div>
            </div>
          </div>
        </>
      ) : null}

      {/* the rows */}
      {p.rows.map((r, i) => {
        const at = ROW0 + i * ROW;
        return (
          <React.Fragment key={r.code}>
            <Sfx at={at + 2} name="whoosh" />
            {[10, 18, 26].map((k) => (
              <Sfx key={`o${k}`} at={at + k} name="tick" />
            ))}
            {[40, 48, 56].map((k) => (
              <Sfx key={`n${k}`} at={at + k} name="tick" />
            ))}
            <Sfx at={at + 60} name="pop" />
            {frame < END + 22 ? <Row row={r} at={at} top={ROWS_TOP + i * ROW_H} out={rowsOut} /> : null}
          </React.Fragment>
        );
      })}

      {/* the close, on the old photo again: send it to one of them, where it is from, the page */}
      <Sfx at={END + 6} name="swish" />
      <Sfx at={endIn + 4} name="hit" />
      {frame >= endIn ? (
        <div style={{ position: "absolute", top: 560, right: SIDE, left: SIDE, display: "flex", flexDirection: "column", gap: 34, opacity: leave(frame, total, 10) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: fade(frame, endIn, 8) }}>
            {/* Instagram's own mark for sending */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={STAMP} strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" style={{ transform: `rotate(${interpolate(frame, [endIn, endIn + 16], [-30, 0], { ...clamped, easing: ease })}deg)` }}>
              <path d="M21.5 2.5L10.8 13.2M21.5 2.5l-6.8 19-3.9-8.3-8.3-3.9z" />
            </svg>
            <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 40, color: STAMP }}>{p.name}</span>
          </div>
          <Words text={p.send} from={endIn + 4} step={3} lift={22} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: fit(p.send, VAZIR, 800, W - 2 * SIDE, 112, 72), lineHeight: 1.4, color: OLD.ink, whiteSpace: "nowrap" }} />
          <div style={{ fontFamily: VAZIR, fontSize: 32, lineHeight: 1.7, color: OLD.ink2, opacity: fade(frame, endIn + 30, 12) }}>{`منبع: ${p.source}`}</div>
          <div style={{ marginTop: 26, padding: "26px 32px", borderRadius: 26, border: `3px solid ${OLD.ink}`, opacity: fade(frame, endIn + 44, 12), transform: `translateY(${rise(frame, endIn + 44, 30, 14)}px)` }}>
            <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 44, color: OLD.ink }}>{p.foot.replace(/[:：]\s*$/, "")}</div>
            <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 700, fontSize: 34, color: STAMP, direction: "ltr", textAlign: "right" }}>@divan.ahura · divan.ahura.cloud</div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
