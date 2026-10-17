// «قدرت ایران»: what Iran has, in one Reel. Its ballistic missiles drawn as
// streaks as long as their range, its drones as a squadron that lights up model
// by model, its air defence as three domes under a turning sweep, then the
// places where Iran stands first among the nine states of the region, in arms
// and beyond them, and the name. Asked by the owner on 17 October 2026: Iran
// shown strong, professionally, for Instagram. Strong by what is so: every
// range has two sources (data/iran-arms.json), every rank is the site's own,
// and nothing is counted that no open source counts. Every word and figure
// comes from the props the site sends.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Brand, C, FPS, Foot, Kicker, NASKH, Progress, SAFE_BOTTOM, SIDE, SIDE_RAIL, VAZIR, W, clamped, ease, fade, faNum, grow, leave, paint, pop, rise, starts } from "./kit";
import type { PowerProps, PowerRow } from "./props";

const LENGTHS = [330, 210, 240, 240, 210, 190];
function plan() {
  const at = starts(LENGTHS);
  return { at, total: LENGTHS.reduce((a, b) => a + b, 0) };
}
export const powerDuration = (_p: PowerProps) => plan().total;

const TOP = 236;
const BODY = 470;
const BOTTOM = 1920 - SAFE_BOTTOM - 40;
const LATIN = { direction: "ltr", unicodeBidi: "isolate" } as React.CSSProperties;

/** A scene's head: its number and kind, then its title, rising in. */
const Head: React.FC<{ from: number; kicker: string; title: string; sub?: string | null }> = ({ from, kicker, title, sub }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: TOP, right: SIDE, left: SIDE, direction: "rtl" }}>
      <Kicker size={34} style={{ opacity: fade(frame, from, 10), transform: `translateY(${rise(frame, from, 20)}px)` }}>
        {kicker}
      </Kicker>
      <div style={{ marginTop: 8, fontFamily: NASKH, fontWeight: 700, fontSize: 76, lineHeight: 1.3, color: C.ink, opacity: fade(frame, from + 4, 12), transform: `translateY(${rise(frame, from + 4, 30)}px)` }}>{title}</div>
      {sub ? <div style={{ marginTop: 6, fontFamily: VAZIR, fontSize: 28, color: C.ink3, opacity: fade(frame, from + 12, 12) }}>{sub}</div> : null}
    </div>
  );
};

/** A band of light that crosses the frame, right to left, as a scene begins. */
const Sweep: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 18) return null;
  const x = interpolate(frame, [at, at + 18], [W + 200, -500], { ...clamped, easing: ease });
  return <div style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 300, background: `linear-gradient(90deg, transparent, ${C.glow}, ${C.accSoft}, transparent)`, opacity: 0.9, pointerEvents: "none" }} />;
};

/** The scene is on from `from` to `until`: it fades in and, at its end, lifts away. */
const Scene: React.FC<{ from: number; until: number; children: React.ReactNode }> = ({ from, until, children }) => {
  const frame = useCurrentFrame();
  if (frame < from - 2 || frame > until + 2) return null;
  const out = interpolate(frame, [until - 12, until], [0, 1], { ...clamped, easing: ease });
  return <AbsoluteFill style={{ opacity: Math.min(fade(frame, from, 8), 1 - out), transform: `translateY(${-out * 70}px)` }}>{children}</AbsoluteFill>;
};

// ---------- 1 · the missiles ----------
const Missiles: React.FC<{ p: PowerProps; from: number; until: number }> = ({ p, from, until }) => {
  const frame = useCurrentFrame();
  const m = p.missiles;
  const rows = m.items;
  const pitch = Math.min(66, (BOTTOM - 70 - (BODY + 60)) / Math.max(1, rows.length));
  const labelW = 230;
  const right = SIDE_RAIL;
  const zone = W - right - labelW - SIDE - 150;
  const x0 = W - right - labelW - 16; // where every streak starts, from the right
  return (
    <Scene from={from} until={until}>
      <Head from={from} kicker={m.kicker} title={m.title} sub={m.sub} />
      {/* the ruler: kilometres from the start of every streak */}
      <div style={{ position: "absolute", top: BODY, left: 0, width: W, height: 40, opacity: fade(frame, from + 14, 12) }}>
        {m.ticks.map((t) => {
          const x = x0 - (t.km / m.max) * zone;
          return (
            <div key={t.km} style={{ position: "absolute", left: x - 60, width: 120, textAlign: "center", fontFamily: VAZIR, fontSize: 22, color: C.ink3 }}>
              {t.label}
            </div>
          );
        })}
      </div>
      <svg width={W} height={BOTTOM - BODY} style={{ position: "absolute", top: BODY + 40, left: 0, opacity: fade(frame, from + 14, 12) }}>
        {m.ticks.map((t) => {
          const x = x0 - (t.km / m.max) * zone;
          return <line key={t.km} x1={x} x2={x} y1={0} y2={rows.length * pitch} stroke={C.line} strokeWidth={1.5} strokeDasharray="4 8" />;
        })}
      </svg>
      {rows.map((r, i) => {
        const at = from + 22 + i * 8;
        const g = grow(frame, at, 30);
        const len = (r.km / m.max) * zone * g;
        const top = BODY + 46 + i * pitch;
        const hot = Boolean(r.claim);
        return (
          <div key={r.name} style={{ position: "absolute", top, left: 0, width: W, height: pitch, opacity: fade(frame, at - 4, 8) }}>
            <div style={{ position: "absolute", right, width: labelW, top: 0, height: pitch, display: "flex", alignItems: "center", justifyContent: "flex-start", direction: "rtl", fontFamily: VAZIR, fontWeight: hot ? 800 : 700, fontSize: hot ? 37 : 34, color: hot ? C.acc : C.ink, whiteSpace: "nowrap" }}>
              {r.name}
            </div>
            {/* the streak: a trail that brightens toward its head */}
            <div style={{ position: "absolute", left: x0 - len, width: len, top: pitch / 2 - (hot ? 7 : 5), height: hot ? 14 : 10, borderRadius: 7, background: `linear-gradient(90deg, ${C.acc}, ${hot ? C.acc : C.accLine} 40%, rgba(255,255,255,0.04))` }} />
            <div style={{ position: "absolute", left: x0 - len - 11, top: pitch / 2 - 11, width: 22, height: 22, borderRadius: 11, background: C.ink, boxShadow: `0 0 26px 10px ${C.acc}`, opacity: g < 1 ? 1 : 0.85 }} />
            <div style={{ position: "absolute", left: Math.max(SIDE - 20, x0 - len - 160), width: 140, top: 0, height: pitch, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: VAZIR, fontWeight: 800, fontSize: 31, color: hot ? C.acc : C.ink2, opacity: fade(frame, at + 18, 8) }}>
              {faNum(Math.round(r.km * g))}
            </div>
            {/* Iran’s own word about it stands under the list, where it does not cover the streak */}
          </div>
        );
      })}
      {rows.some((r) => r.claim) ? (
        <div style={{ position: "absolute", top: BODY + 56 + rows.length * pitch, right, left: SIDE, direction: "rtl", fontFamily: VAZIR, fontWeight: 800, fontSize: 30, color: C.acc, opacity: fade(frame, from + 22 + rows.length * 8, 12) }}>
          {rows.filter((r) => r.claim).map((r) => `${r.name}: ${r.claim}`).join("  ·  ")}
        </div>
      ) : null}
      {m.unranged ? (
        <div style={{ position: "absolute", top: BODY + 104 + rows.length * pitch, right, left: SIDE, direction: "rtl", fontFamily: VAZIR, fontSize: 27, color: C.ink3, opacity: fade(frame, from + 22 + rows.length * 8, 12) }}>{m.unranged}</div>
      ) : null}
    </Scene>
  );
};

// ---------- 2 · the drones ----------
/** A small delta wing, the drone's sign in the squadron. */
const Wing: React.FC<{ size: number; color: string; lit: number }> = ({ size, color, lit }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <path d="M20 4 L35 32 L20 26 L5 32 Z" fill={lit > 0.5 ? color : "none"} fillOpacity={0.35 + 0.65 * lit} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
  </svg>
);

const Drones: React.FC<{ p: PowerProps; from: number; until: number }> = ({ p, from, until }) => {
  const frame = useCurrentFrame();
  const d = p.drones;
  const cols = 9;
  const n = d.models;
  const gridTop = BODY + 10;
  const cell = (W - SIDE - SIDE_RAIL) / cols;
  const flight = ((frame - from) / FPS) * 18;
  return (
    <Scene from={from} until={until}>
      <Head from={from} kicker={d.kicker} title={d.title} sub={d.sub} />
      {/* the squadron: one wing per model on the list, lighting up one after another, drifting as if in flight */}
      {Array.from({ length: n }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const at = from + 16 + i * 2;
        const lit = grow(frame, at, 10);
        const x = W - SIDE_RAIL - (col + 1) * cell + (row % 2 ? cell / 2 : 0) - flight * 0.6;
        const y = gridTop + row * 74 + Math.sin((frame - from) / 9 + i) * 5;
        return (
          <div key={i} style={{ position: "absolute", left: x + cell / 2 - 22, top: y, opacity: fade(frame, at - 6, 8), transform: `rotate(-90deg) scale(${0.7 + 0.3 * lit})` }}>
            <Wing size={44} color={C.acc} lit={lit} />
          </div>
        );
      })}
      {/* the known ones, with what each does, as their own articles say */}
      <div style={{ position: "absolute", top: gridTop + Math.ceil(n / cols) * 74 + 40, right: SIDE_RAIL, left: SIDE, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, direction: "rtl" }}>
        {d.items.slice(0, 8).map((it, i) => {
          const at = from + 70 + i * 6;
          return (
            <div key={it.name} style={{ padding: "16px 22px", borderRadius: 22, background: C.panel, border: `1.5px solid ${C.line}`, opacity: fade(frame, at, 8), transform: `scale(${pop(frame, at, 18)})` }}>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 36, color: C.ink, whiteSpace: "nowrap" }}>{it.name}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 28, color: C.acc, marginTop: 4 }}>{it.role}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// ---------- 3 · air defence ----------
const Air: React.FC<{ p: PowerProps; from: number; until: number }> = ({ p, from, until }) => {
  const frame = useCurrentFrame();
  const a = p.air;
  const cx = W / 2;
  const base = 470;
  const radii = [400, 290, 180];
  const sweep = ((frame - from) / FPS) * 70;
  return (
    <Scene from={from} until={until}>
      <Head from={from} kicker={a.kicker} title={a.title} sub={a.sub} />
      {/* three domes, the widest first, and a sweep turning over them */}
      <svg width={W} height={base + 10} style={{ position: "absolute", top: BODY - 20, left: 0 }}>
        <defs>
          <linearGradient id="sweep" x1="0" x2="1">
            <stop offset="0" stopColor={C.acc} stopOpacity="0" />
            <stop offset="1" stopColor={C.acc} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {radii.map((r, i) => {
          const g = grow(frame, from + 16 + i * 10, 26);
          const arc = Math.PI * r;
          return (
            <g key={r}>
              <path d={`M ${cx - r} ${base} A ${r} ${r} 0 0 1 ${cx + r} ${base}`} fill={C.accSoft} fillOpacity={0.35 * g} stroke={C.acc} strokeWidth={i === 0 ? 4 : 3} strokeOpacity={0.9 - i * 0.2} strokeDasharray={arc} strokeDashoffset={arc * (1 - g)} />
            </g>
          );
        })}
        <line x1={0} y1={base} x2={W} y2={base} stroke={C.line2} strokeWidth={2} />
        <g transform={`rotate(${-180 + (sweep % 180)} ${cx} ${base})`} opacity={fade(frame, from + 40, 12)}>
          <path d={`M ${cx} ${base} L ${cx + radii[0]} ${base} A ${radii[0]} ${radii[0]} 0 0 0 ${cx + radii[0] * Math.cos(0.5)} ${base - radii[0] * Math.sin(0.5)} Z`} fill="url(#sweep)" />
        </g>
        <circle cx={cx} cy={base} r={10} fill={C.acc} />
      </svg>
      {/* the systems of each layer, by name */}
      <div style={{ position: "absolute", top: BODY + base + 10, right: SIDE_RAIL, left: SIDE, display: "flex", flexDirection: "column", gap: 16, direction: "rtl" }}>
        {a.layers.map((l, i) => {
          const at = from + 40 + i * 16;
          return (
            <div key={l.name} style={{ padding: "16px 24px", borderRadius: 22, background: C.panel, border: `1.5px solid ${i === 0 ? C.accLine : C.line}`, opacity: fade(frame, at, 10), transform: `translateX(${-rise(frame, at, 40, 16)}px)` }}>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 32, color: C.acc }}>{l.name}</div>
              <div style={{ fontFamily: VAZIR, fontSize: 35, lineHeight: 1.55, color: C.ink, marginTop: 4 }}>{l.items.join("  ·  ")}</div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// ---------- 4 and 5 · first places ----------
const Places: React.FC<{ from: number; until: number; kicker: string; title: string; sub: string | null; rows: PowerRow[] }> = ({ from, until, kicker, title, sub, rows }) => {
  const frame = useCurrentFrame();
  return (
    <Scene from={from} until={until}>
      <Head from={from} kicker={kicker} title={title} sub={sub} />
      <div style={{ position: "absolute", top: BODY + 10, right: SIDE_RAIL, left: SIDE, display: "flex", flexDirection: "column", gap: 26, direction: "rtl" }}>
        {rows.slice(0, 4).map((r, i) => {
          const at = from + 18 + i * 12;
          const first = r.rank === 1;
          return (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 26, padding: "20px 26px", borderRadius: 28, background: first ? C.accSoft : C.panel, border: `2px solid ${first ? C.acc : C.line}`, boxShadow: first ? `0 0 50px ${C.glow}` : "none", opacity: fade(frame, at, 8), transform: `translateX(${-rise(frame, at, 60, 18)}px)` }}>
              {/* the place, as a medal */}
              <div style={{ flex: "none", width: 150, height: 150, borderRadius: 75, border: `4px solid ${C.acc}`, background: first ? C.acc : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${pop(frame, at + 6, 20)})` }}>
                <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 78, lineHeight: 1, color: first ? C.onAcc : C.acc }}>{faNum(r.rank)}</span>
                <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 20, color: first ? C.onAcc : C.ink3 }}>{`از ${faNum(r.of)}`}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 42, lineHeight: 1.3, color: C.ink }}>{r.label}</div>
                <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 40, color: C.acc, marginTop: 4 }}>{r.value}</div>
                {r.note ? <div style={{ fontFamily: VAZIR, fontSize: 22, color: C.ink3, marginTop: 4 }}>{r.note}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

// ---------- 6 · the name ----------
const Outro: React.FC<{ p: PowerProps; from: number; total: number }> = ({ p, from, total }) => {
  const frame = useCurrentFrame();
  const o = p.outro;
  const glow = 0.5 + 0.5 * Math.sin((frame - from) / 10);
  return (
    <Scene from={from} until={total + 20}>
      <div style={{ position: "absolute", top: 430, left: 0, right: 0, textAlign: "center", direction: "rtl" }}>
        <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 250, lineHeight: 1.1, color: C.ink, textShadow: `0 0 ${40 + 40 * glow}px ${C.acc}`, transform: `scale(${pop(frame, from + 4, 26)})` }}>{o.name}</div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", padding: "0 80px" }}>
          {o.words.map((w, i) => (
            <span key={w} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 40, color: C.acc, opacity: fade(frame, from + 24 + i * 6, 8), transform: `translateY(${rise(frame, from + 24 + i * 6, 24)}px)` }}>
              {w}
              {i < o.words.length - 1 ? <span style={{ color: C.ink3, marginRight: 18 }}>·</span> : null}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 60, fontFamily: VAZIR, fontWeight: 700, fontSize: 38, color: C.ink, opacity: fade(frame, from + 60, 12) }}>{o.call}</div>
        <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 800, fontSize: 44, color: C.acc, opacity: fade(frame, from + 66, 12), ...LATIN }}>{o.handle}</div>
      </div>
      <Foot opacity={fade(frame, from + 50, 14)}>{`منبع‌ها: ${p.source}`}</Foot>
    </Scene>
  );
};

export const Power: React.FC<PowerProps> = (p) => {
  paint("power");
  const { at, total } = plan();
  const [aM, aD, aA, aL, aB, aO] = at;
  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={34} />
      <Brand tag={p.series} />
      <Progress total={total} marks={[aD, aA, aL, aB, aO]} />
      <Missiles p={p} from={aM} until={aD} />
      <Drones p={p} from={aD} until={aA} />
      <Air p={p} from={aA} until={aL} />
      <Places from={aL} until={aB} kicker={p.land.kicker} title={p.land.title} sub={p.land.sub} rows={p.land.rows} />
      <Places from={aB} until={aO} kicker={p.beyond.kicker} title={p.beyond.title} sub={p.beyond.sub} rows={p.beyond.rows} />
      <Outro p={p} from={aO} total={total} />
      {[aD, aA, aL, aB, aO].map((a) => (
        <Sweep key={a} at={a - 4} />
      ))}
    </AbsoluteFill>
  );
};
