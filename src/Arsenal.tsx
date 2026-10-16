// «جنگ‌افزار»: one kind of weapon. The piece draws itself line by line while the
// sum of the nine states counts up; then every state's bar grows to its own
// figure, largest first, with Iran's in the series' colour; then what Iran has
// of it, model by model; then where the numbers come from. Every word and every
// figure comes from the props the site sends (lib/arsenal.ts, from Wikipedia's
// tables).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Brand, C, Foot, H, Kicker, NASKH, Panel, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, VAZIR, W, Words, clamped, ease, fade, faNum, grow, leave, paint, pop, readFrames, rise, starts } from "./kit";
import type { ArmIcon, ArsenalProps } from "./props";

const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

/**
 * The pieces as line art on a 320 by 120 sheet, the same drawings as the
 * site's weapons block (app/[lang]/war/forces/Arsenal.tsx). Aircraft are seen
 * from above, the rest from the side; `line` marks a stroke only.
 */
const ART: Record<ArmIcon, { d: string; line?: true }[]> = {
  jet: [
    { d: "M16 60L58 54 108 50 250 50 290 53 290 67 250 70 108 70 58 66z" },
    { d: "M60 60Q80 51 102 60 80 69 60 60z" },
    { d: "M122 50L198 11 228 11 222 50z" },
    { d: "M122 70L198 109 228 109 222 70z" },
    { d: "M246 50L274 27 294 27 288 50z" },
    { d: "M246 70L274 93 294 93 288 70z" },
    { d: "M290 53L302 55 302 59 290 59z" },
    { d: "M290 61L302 61 302 65 290 67z" },
    { d: "M190 9L234 9", line: true },
    { d: "M190 111L234 111", line: true },
    { d: "M252 55L286 52", line: true },
    { d: "M252 65L286 68", line: true },
  ],
  tank: [
    { d: "M70 98Q52 98 50 86 52 74 70 74L262 74Q280 74 282 86 280 98 262 98z" },
    { d: ring(80, 86, 8) },
    { d: ring(113, 86, 8) },
    { d: ring(146, 86, 8) },
    { d: ring(179, 86, 8) },
    { d: ring(212, 86, 8) },
    { d: ring(245, 86, 8) },
    { d: "M54 74L92 55 268 55 286 66 286 74z" },
    { d: "M118 55L132 33 214 33 234 55z" },
    { d: "M20 41L128 41 126 47 20 47z" },
    { d: "M66 39L86 39 86 49 66 49z" },
    { d: "M176 33L180 26 198 26 202 33z" },
    { d: "M188 26L158 20", line: true },
    { d: "M212 33L228 6", line: true },
  ],
  heli: [
    { d: "M34 22L252 22", line: true },
    { d: "M139 22L147 22 147 34 139 34z" },
    { d: "M70 62Q72 40 104 34L172 34Q192 36 198 48L198 64Q182 78 150 78L96 78Q74 76 70 62z" },
    { d: "M77 58Q81 45 104 40L122 40 122 58z" },
    { d: "M198 46L286 40 286 48 198 62z" },
    { d: "M274 40L290 15 300 15 292 48 282 48z" },
    { d: ring(297, 21, 12), line: true },
    { d: "M128 62L162 62 162 69 128 69z" },
    { d: "M104 78L100 91M156 78L160 91", line: true },
    { d: "M78 85Q80 91 88 91L178 91", line: true },
  ],
  uav: [
    { d: "M38 60Q52 53 80 54L250 56 276 58 276 62 250 64 80 66Q52 67 38 60z" },
    { d: "M134 55L150 6 166 6 172 55z" },
    { d: "M134 65L150 114 166 114 172 65z" },
    { d: "M244 56L262 34 274 34 268 57z" },
    { d: "M244 64L262 86 274 86 268 63z" },
    { d: ring(58, 60, 4) },
    { d: "M281 44L281 76", line: true },
  ],
  plane: [
    { d: "M24 60Q32 46 62 46L236 48 296 56 296 64 236 72 62 74Q32 74 24 60z" },
    { d: "M118 47L128 6 158 6 166 47z" },
    { d: "M118 73L128 114 158 114 166 73z" },
    { d: "M262 52L270 28 290 28 294 55z" },
    { d: "M262 68L270 92 290 92 294 65z" },
    { d: "M102 30L124 30 124 36 102 36z" },
    { d: "M106 14L128 14 128 20 106 20z" },
    { d: "M102 84L124 84 124 90 102 90z" },
    { d: "M106 100L128 100 128 106 106 106z" },
    { d: "M102 25L102 41M106 9L106 25M102 79L102 95M106 95L106 111", line: true },
  ],
  spg: [
    { d: "M70 100Q52 100 50 88 52 76 70 76L262 76Q280 76 282 88 280 100 262 100z" },
    { d: ring(80, 88, 8) },
    { d: ring(113, 88, 8) },
    { d: ring(146, 88, 8) },
    { d: ring(179, 88, 8) },
    { d: ring(212, 88, 8) },
    { d: ring(245, 88, 8) },
    { d: "M54 76L84 60 272 60 286 68 286 76z" },
    { d: "M150 60L158 30 250 30 262 60z" },
    { d: "M160 44L30 12 28 19 158 52z" },
    { d: "M28 9L40 12 36 24 24 20z" },
    { d: "M226 30L244 6", line: true },
    { d: "M196 30L196 22 216 22 216 30", line: true },
  ],
  gun: [
    { d: ring(150, 82, 22) },
    { d: ring(150, 82, 8) },
    { d: "M150 58L62 26 58 34 146 68z" },
    { d: "M56 22L70 26 64 40 50 36z" },
    { d: "M132 44L142 40 164 74 152 80z" },
    { d: "M166 80L288 100 286 106 162 90z" },
    { d: "M286 98L302 96 304 104 288 108z" },
    { d: "M128 104L176 104", line: true },
    { d: "M20 106L304 106", line: true },
  ],
  rocket: [
    { d: "M40 78L214 78 214 96 40 96z" },
    { d: "M214 62L262 62 286 80 286 96 214 96z" },
    { d: "M228 68L258 68 272 80 228 80z" },
    { d: ring(78, 98, 12) },
    { d: ring(112, 98, 12) },
    { d: ring(250, 98, 12) },
    { d: "M52 76L196 24 208 52 64 78z" },
    { d: "M196 24L208 52M176 31L188 59M156 38L168 66M136 46L148 73M116 53L128 77M96 60L104 78", line: true },
    { d: "M120 78L138 60M150 78L160 50", line: true },
    { d: "M24 110L300 110", line: true },
  ],
  sub: [
    { d: "M20 72Q32 56 78 55L236 55Q284 58 304 71 284 84 236 87L78 87Q32 86 20 72z" },
    { d: "M126 55L132 30 176 30 186 55z" },
    { d: "M148 30L148 12M160 30L160 18", line: true },
    { d: "M112 38L134 38 134 44 112 44z" },
    { d: "M274 60L290 40 300 40 294 63z" },
    { d: "M274 82L290 102 300 102 294 79z" },
    { d: "M308 58L308 84", line: true },
    { d: "M30 71L56 71", line: true },
    { d: "M6 48Q26 42 46 48T86 48 126 48M192 48Q212 42 232 48T272 48 312 48", line: true },
  ],
  ship: [
    { d: "M10 64L46 94 284 94 308 70 218 70 212 64z" },
    { d: "M98 64L106 44 172 44 178 64z" },
    { d: "M114 44L118 31 152 31 156 44z" },
    { d: "M134 31L134 6M122 15L146 15", line: true },
    { d: ring(164, 37, 5) },
    { d: "M186 64L190 46 206 46 210 64z" },
    { d: "M224 70L224 54 252 54 252 70z" },
    { d: "M60 64L64 53 82 53 86 64z" },
    { d: "M64 56L38 50", line: true },
    { d: "M4 102Q24 96 44 102T84 102 124 102 164 102 204 102 244 102 284 102 316 102", line: true },
  ],
  boat: [
    { d: "M28 70L60 94 262 94 284 72z" },
    { d: "M120 72L128 54 178 54 186 72z" },
    { d: "M152 54L152 24M142 34L162 34", line: true },
    { d: "M78 71L82 61 98 61 102 71z" },
    { d: "M84 63L58 57", line: true },
    { d: "M200 72L208 58 232 63 226 73z" },
    { d: "M234 73L242 59 266 64 260 73z" },
    { d: "M14 102Q34 96 54 102T94 102 134 102 174 102 214 102 254 102 294 102 306 102", line: true },
  ],
};

/** The piece, drawn in: each line starts a little after the one before it; the shapes fill softly once drawn. */
const Art: React.FC<{ icon: ArmIcon; draw: number; fill: number; width: number; stroke?: number }> = ({ icon, draw, fill, width, stroke = 2.2 }) => {
  const parts = ART[icon] ?? ART.jet;
  return (
    <svg viewBox="-6 -6 332 132" width={width} height={(width * 132) / 332} style={{ display: "block", overflow: "visible" }}>
      {parts.map((p, i) => {
        const local = Math.max(0, Math.min(1, draw * (1 + 0.18 * (parts.length - 1)) - 0.18 * i));
        return (
          <path
            key={i}
            d={p.d}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - local}
            fill={p.line ? "none" : C.acc}
            fillOpacity={p.line ? 0 : 0.16 * fill}
            stroke={C.acc}
            strokeWidth={stroke}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

// the scenes: the piece and the sum, the nine states, Iran, the source
const HOOK = 120;
const ROWS_IN = 300;
const SOURCE_MIN = 135;

function plan(p: ArsenalProps) {
  const iran = p.home ? Math.max(210, 96 + p.models.length * 30) : Math.max(150, readFrames(p.held ?? p.absent ?? "", 120));
  const source = Math.min(210, Math.max(SOURCE_MIN, Math.round(readFrames([p.source, p.absent ?? ""].join(" ")) * 0.7)));
  const lengths = [HOOK, ROWS_IN, iran, source];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const arsenalDuration = (p: ArsenalProps) => plan(p).total;

// the list of states: under the head, clear of Instagram's buttons on the right
const LIST_TOP = 400;
const LIST_BOTTOM = H - SAFE_BOTTOM - 40;
const LIST_RIGHT = SIDE_RAIL;
const LIST_LEFT = SIDE;
const LIST_W = W - LIST_RIGHT - LIST_LEFT;

const LATIN = { direction: "ltr", unicodeBidi: "isolate" } as React.CSSProperties;

export const Arsenal: React.FC<ArsenalProps> = (p) => {
  paint("arsenal");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const [, aRows, aIran, aSource] = at;

  // ---- the hook: the piece draws itself, the sum counts up
  const draw = interpolate(frame, [8, HOOK - 26], [0, 1], { ...clamped, easing: ease });
  const filled = fade(frame, HOOK - 40, 24);
  const hookOut = leave(frame, aRows + 14, 14);
  // the piece then rests small in the corner of the head for the rest of the Reel
  const shrink = grow(frame, aRows, 22);

  // ---- the rows
  const n = p.rows.length;
  const pitch = Math.min(122, (LIST_BOTTOM - LIST_TOP) / Math.max(1, n));
  const rowsOut = leave(frame, aIran + 12, 14);

  // ---- Iran
  const shareRing = grow(frame, aIran + 18, 40);

  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={34} />
      <Brand tag={p.series} />
      <Progress total={total} marks={[aRows, aIran, aSource]} />

      {/* the head of the whole Reel: the force and the kind */}
      <div style={{ position: "absolute", top: 222, right: SIDE, left: SIDE, opacity: fade(frame, 2, 12) }}>
        <Kicker size={36}>{`جنگ‌افزار · ${p.force}`}</Kicker>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginTop: 6 }}>
          <Words text={p.arm} from={6} step={4} style={{ fontFamily: NASKH, fontWeight: 700, fontSize: interpolate(shrink, [0, 1], [86, 58]), lineHeight: 1.3, color: C.ink }} />
          {/* the piece, small, once the hook is over */}
          <div style={{ flex: "none", opacity: shrink }}>
            <Art icon={p.icon} draw={1} fill={1} width={230} stroke={3.2} />
          </div>
        </div>
      </div>

      {/* ---- 1 · the piece and the sum ---- */}
      {frame < aRows + 30 ? (
        <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: hookOut }}>
          <div style={{ transform: `scale(${interpolate(frame, [0, HOOK], [0.94, 1.02], clamped)})` }}>
            <Art icon={p.icon} draw={draw} fill={filled} width={900} />
          </div>
          <div style={{ marginTop: 70, fontFamily: VAZIR, fontWeight: 800, fontSize: 150, lineHeight: 1, color: C.acc, opacity: fade(frame, 24, 10), transform: `translateY(${rise(frame, 24, 30)}px)` }}>
            {faNum(Math.round(p.sum * grow(frame, 26, 56)))}
          </div>
          <div style={{ marginTop: 18, fontFamily: VAZIR, fontWeight: 700, fontSize: 44, color: C.ink2, opacity: fade(frame, 34, 12) }}>{p.sumLabel}</div>
          <div style={{ marginTop: 26, maxWidth: W - 2 * SIDE - 40, textAlign: "center", fontFamily: VAZIR, fontSize: 32, lineHeight: 1.6, color: C.ink3, opacity: fade(frame, 52, 14) }}>{p.what}</div>
        </div>
      ) : null}

      {/* ---- 2 · the nine states: largest first, each bar grows to its own figure ---- */}
      {frame >= aRows - 4 && frame < aIran + 30 ? (
        <div style={{ position: "absolute", inset: 0, opacity: Math.min(fade(frame, aRows, 12), rowsOut) }}>
          <div style={{ position: "absolute", top: LIST_TOP - 62, right: LIST_RIGHT, left: LIST_LEFT, fontFamily: VAZIR, fontSize: 30, color: C.ink3, opacity: fade(frame, aRows + 6, 12) }}>هر کشور چند تا دارد؟</div>
          {p.rows.map((r, i) => {
            const start = aRows + 14 + i * 9;
            const g = grow(frame, start, 46);
            const figure = r.total * g;
            const settled = fade(frame, start + 44, 8);
            const y = LIST_TOP + i * pitch;
            const barW = Math.max(6, r.share * (LIST_W - 230)) * g;
            const home = r.home;
            return (
              <div key={r.name} style={{ position: "absolute", top: y, right: LIST_RIGHT, width: LIST_W, height: pitch, opacity: fade(frame, start, 10), transform: `translateX(${-rise(frame, start, 40, 16)}px)` }}>
                {home ? (
                  <div style={{ position: "absolute", inset: "4px -14px", borderRadius: 22, background: C.accSoft, border: `1.5px solid ${C.accLine}`, boxShadow: `0 0 ${40 + 18 * Math.sin(frame / 9)}px ${C.glow}` }} />
                ) : null}
                <div style={{ position: "absolute", top: pitch * 0.12, right: 4, left: 0, display: "flex", alignItems: "baseline", gap: 18, fontFamily: VAZIR }}>
                  <span style={{ width: 40, flex: "none", fontWeight: 800, fontSize: 30, color: home ? C.acc : C.ink3 }}>{faNum(i + 1)}</span>
                  <span style={{ flex: 1, fontWeight: home ? 800 : 600, fontSize: home ? 42 : 36, color: home ? C.ink : C.ink2, whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ flex: "none", fontWeight: 800, fontSize: home ? 44 : 38, color: home ? C.acc : C.ink }}>{settled > 0.5 ? r.totalText : faNum(Math.round(figure))}</span>
                </div>
                <div style={{ position: "absolute", bottom: pitch * 0.16, right: 62, height: home ? 20 : 14, width: barW, borderRadius: 10, background: home ? C.acc : C.ink3, opacity: home ? 1 : 0.55 }} />
                {r.stored ? <div style={{ position: "absolute", bottom: pitch * 0.12, left: 0, fontFamily: VAZIR, fontSize: 22, color: C.ink3, opacity: settled }}>{r.stored}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ---- 3 · Iran ---- */}
      {frame >= aIran - 4 && frame < aSource + 24 ? (
        <div style={{ position: "absolute", top: 420, right: SIDE_RAIL, left: SIDE, opacity: Math.min(fade(frame, aIran + 4, 12), leave(frame, aSource + 14, 14)) }}>
          {p.home ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
                {/* Iran's share of all the pieces of the nine, as a ring */}
                <svg width="250" height="250" viewBox="0 0 250 250" style={{ flex: "none", transform: `scale(${pop(frame, aIran + 8, 26)})` }}>
                  <circle cx="125" cy="125" r="104" fill="none" stroke={C.line2} strokeWidth="22" />
                  <circle cx="125" cy="125" r="104" fill="none" stroke={C.acc} strokeWidth="22" strokeLinecap="round" pathLength={100} strokeDasharray={`${p.home.share * shareRing} 100`} transform="rotate(-90 125 125)" />
                  <text x="125" y="138" textAnchor="middle" fill={C.ink} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 52 }}>
                    {p.home.shareText}
                  </text>
                  <text x="125" y="176" textAnchor="middle" fill={C.ink3} style={{ fontFamily: VAZIR, fontSize: 22 }}>
                    از همه
                  </text>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 72, color: C.ink, lineHeight: 1.2, opacity: fade(frame, aIran + 10, 12) }}>ایران</div>
                  <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 40, color: C.acc, marginTop: 8, opacity: fade(frame, aIran + 18, 12) }}>{p.home.rank}</div>
                  <div style={{ fontFamily: VAZIR, fontSize: 31, lineHeight: 1.55, color: C.ink2, marginTop: 10, opacity: fade(frame, aIran + 26, 12) }}>{p.home.line}</div>
                </div>
              </div>
              {p.models.length ? (
                <div style={{ marginTop: 56 }}>
                  <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: C.ink3, marginBottom: 18, opacity: fade(frame, aIran + 40, 12) }}>بیشترینِ ایران، به مدل</div>
                  {p.models.map((m, i) => {
                    const from = aIran + 48 + i * 12;
                    const g = grow(frame, from, 28);
                    return (
                      <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 22, height: 96, borderTop: `1.5px solid ${C.line}`, opacity: fade(frame, from, 10), transform: `translateY(${rise(frame, from, 24, 14)}px)` }}>
                        <div style={{ flex: "none", width: 170, fontFamily: VAZIR, fontWeight: 800, fontSize: 40, color: C.ink }}>{m.countText}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
                            <span style={{ ...LATIN, fontFamily: VAZIR, fontWeight: 700, fontSize: 32, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                            <span style={{ fontFamily: VAZIR, fontSize: 24, color: C.ink3, whiteSpace: "nowrap" }}>{m.origin}</span>
                          </div>
                          <div style={{ marginTop: 10, height: 10, width: `${Math.max(3, m.share * 100) * g}%`, borderRadius: 5, background: C.acc, opacity: 0.85 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <Panel dashed style={{ marginTop: 40 }}>
              <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 60, color: C.ink, marginBottom: 18 }}>ایران</div>
              <div style={{ fontFamily: VAZIR, fontSize: 34, lineHeight: 1.7, color: C.ink2 }}>{p.held ?? p.absent ?? ""}</div>
            </Panel>
          )}
        </div>
      ) : null}

      {/* ---- 4 · where the numbers come from ---- */}
      {frame >= aSource - 4 ? (
        <div style={{ position: "absolute", top: 520, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, aSource + 6, 14) }}>
          <Kicker size={34} color={C.ink3}>این عددها از کجاست؟</Kicker>
          <div style={{ marginTop: 22, fontFamily: VAZIR, fontSize: 34, lineHeight: 1.75, color: C.ink2 }}>{p.source}</div>
          {p.absent ? <div style={{ marginTop: 26, fontFamily: VAZIR, fontSize: 28, lineHeight: 1.7, color: C.ink3, opacity: fade(frame, aSource + 26, 14) }}>{p.absent}</div> : null}
        </div>
      ) : null}
      <Foot opacity={fade(frame, aSource + 18, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
