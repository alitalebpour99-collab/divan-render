// «پروندهٔ هسته‌ای»: two Reels of the nuclear file, both in the IAEA's own words
// as the site gives them.
// - sites: Iran's declared facilities on the map, city by city, each place a
//   ring split by what the agency reports of its facilities (damaged in June
//   2025, not damaged, unknown); then the damaged ones by name.
// - stock: the enriched uranium of the last estimate, and the levels it stands on.
// Places are cities, as on the site, never the facilities' own coordinates.
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { EXTENTS, makeMap } from "./geo";
import { Backdrop, Brand, C, Foot, Kicker, NASKH, Panel, Progress, SIDE, SIDE_RAIL, VAZIR, W, Words, clamped, ease, fade, faNum, grow, leave, paint, pop, readFrames, rise, starts } from "./kit";
import type { NuclearProps } from "./props";

function plan(p: NuclearProps) {
  const notes = Math.min(240, Math.max(150, Math.round(readFrames(p.notes.join(" ")) * 0.75)));
  const source = Math.min(180, Math.max(120, Math.round(readFrames(p.source) * 0.8)));
  const lengths = p.view === "sites" ? [105, 60 + p.places.length * 18 + 60, Math.max(150, 60 + p.hitNames.length * 14), notes, source] : [110, 240, notes, source];
  return { lengths, at: starts(lengths), total: lengths.reduce((a, b) => a + b, 0) };
}
export const nuclearDuration = (p: NuclearProps) => plan(p).total;

const MAP_BOX = { x0: 60, y0: 560, x1: W - 60, y1: 1190 };

/** One place on the map: a ring split by the state of its facilities, and its name with the count. */
const Place: React.FC<{ x: number; y: number; name: string; hit: number; whole: number; unknown: number; s: number; label: number; side: "left" | "right" }> = ({ x, y, name, hit, whole, unknown, s, label, side }) => {
  const total = hit + whole + unknown;
  const r = 16 + Math.min(22, total * 3);
  const parts = [
    { n: hit, color: C.strike },
    { n: unknown, color: C.claim },
    { n: whole, color: C.ink2 },
  ].filter((q) => q.n > 0);
  let used = 0;
  return (
    <>
      <svg style={{ position: "absolute", left: x - r - 8, top: y - r - 8, overflow: "visible" }} width={2 * r + 16} height={2 * r + 16}>
        <g transform={`translate(${r + 8} ${r + 8}) scale(${s})`}>
          <circle r={r} fill={C.bg} fillOpacity={0.75} stroke={C.line2} strokeWidth={1.5} />
          {parts.map((q, i) => {
            const len = (q.n / total) * 100;
            const el = <circle key={i} r={r - 4} fill="none" stroke={q.color} strokeWidth={8} pathLength={100} strokeDasharray={`${Math.max(0, len - (parts.length > 1 ? 2 : 0))} 100`} strokeDashoffset={-used} transform="rotate(-90)" />;
            used += len;
            return el;
          })}
          <text y={9} textAnchor="middle" fill={C.ink} style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 24 }}>
            {faNum(total)}
          </text>
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          top: y - 22,
          ...(side === "left" ? { right: W - x + r + 14 } : { left: x + r + 14 }),
          fontFamily: VAZIR,
          fontWeight: 700,
          fontSize: 28,
          color: C.ink,
          whiteSpace: "nowrap",
          opacity: label,
          textShadow: "0 2px 10px rgba(0,0,0,.8)",
        }}
      >
        {name}
      </div>
    </>
  );
};

const Sites: React.FC<NuclearProps & { at: number[] }> = (p) => {
  const frame = useCurrentFrame();
  const [, aMap, aList, aNotes] = p.at;
  const map = useMemo(() => makeMap(EXTENTS.iran, MAP_BOX), []);
  const spots = useMemo(() => {
    const xy = p.places.map((q) => map.at(q.lon, q.lat));
    // a name goes on the side away from its nearest neighbour, so close places do not write over each other
    return p.places.map((q, i) => {
      let near = -1;
      let best = Infinity;
      xy.forEach((o, j) => {
        if (j === i) return;
        const d = Math.hypot(o[0] - xy[i][0], o[1] - xy[i][1]);
        if (d < best) {
          best = d;
          near = j;
        }
      });
      const side: "left" | "right" = near >= 0 && best < 160 && xy[near][0] < xy[i][0] ? "right" : "left";
      return { ...q, x: xy[i][0], y: xy[i][1], side };
    });
  }, [map, p.places]);
  const draw = interpolate(frame, [aMap, aMap + 40], [0, 1], { ...clamped, easing: ease });
  const order = [...spots].sort((a, b) => b.hit + b.whole + b.unknown - (a.hit + a.whole + a.unknown));
  const mapOut = leave(frame, aList + 10, 14);
  return (
    <>
      {/* the counts, first */}
      {frame < aMap + 20 ? (
        <div style={{ position: "absolute", top: 760, right: SIDE, left: SIDE, display: "flex", justifyContent: "center", gap: 26, opacity: leave(frame, aMap + 12, 12) }}>
          {[
            { n: p.legend.hitN, t: p.legend.hit, c: C.strike },
            { n: p.legend.wholeN, t: p.legend.whole, c: C.ink2 },
            { n: p.legend.unknownN, t: p.legend.unknown, c: C.claim },
          ]
            .filter((q) => q.n > 0)
            .map((q, i) => (
              <div key={i} style={{ flex: 1, padding: "34px 18px", borderRadius: 28, background: C.panel, border: `1.5px solid ${C.line2}`, textAlign: "center", transform: `scale(${pop(frame, 26 + i * 10, 22)})` }}>
                <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 110, lineHeight: 1, color: q.c }}>{faNum(Math.round(q.n * grow(frame, 30 + i * 10, 30)))}</div>
                <div style={{ marginTop: 18, fontFamily: VAZIR, fontWeight: 700, fontSize: 30, lineHeight: 1.4, color: C.ink2 }}>{q.t}</div>
              </div>
            ))}
        </div>
      ) : null}

      {/* the map, place by place */}
      {frame >= aMap - 2 && frame < aList + 26 ? (
        <div style={{ position: "absolute", inset: 0, opacity: Math.min(fade(frame, aMap, 12), mapOut) }}>
          <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
            <path d={map.land} fill={C.land} opacity={0.75} />
            <path d={map.borders} fill="none" stroke={C.mapLine} strokeWidth={1.2} />
            <path d={map.iran} fill={C.iran} fillOpacity={draw} stroke={C.acc} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </svg>
          {order.map((q, i) => {
            const from = aMap + 44 + i * 18;
            return <Place key={q.name} x={q.x} y={q.y} name={q.name} hit={q.hit} whole={q.whole} unknown={q.unknown} s={pop(frame, from, 20)} label={fade(frame, from + 8, 10)} side={q.side} />;
          })}
          {/* the key under the map */}
          <div style={{ position: "absolute", top: MAP_BOX.y1 + 30, right: SIDE_RAIL, left: SIDE, display: "flex", flexWrap: "wrap", gap: "14px 30px", fontFamily: VAZIR, fontSize: 28, color: C.ink2, opacity: fade(frame, aMap + 30, 14) }}>
            {[
              { c: C.strike, t: p.legend.hit, n: p.legend.hitN },
              { c: C.ink2, t: p.legend.whole, n: p.legend.wholeN },
              { c: C.claim, t: p.legend.unknown, n: p.legend.unknownN },
            ]
              .filter((q) => q.n > 0)
              .map((q, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, background: q.c }} />
                  {`${q.t}: ${faNum(q.n)}`}
                </span>
              ))}
          </div>
        </div>
      ) : null}

      {/* the damaged ones, by name */}
      {frame >= aList - 2 && frame < aNotes + 20 ? (
        <div style={{ position: "absolute", top: 560, right: SIDE_RAIL, left: SIDE, opacity: Math.min(fade(frame, aList + 8, 12), leave(frame, aNotes + 12, 12)) }}>
          <Kicker size={38} color={C.strike}>{p.legend.hit}</Kicker>
          <div style={{ marginTop: 22 }}>
            {p.hitNames.map((name, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderTop: `1.5px solid ${C.line}`, fontFamily: VAZIR, fontSize: 34, color: C.ink, opacity: fade(frame, aList + 14 + i * 10, 10), transform: `translateY(${rise(frame, aList + 14 + i * 10, 20, 12)}px)` }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, background: C.strike, flex: "none" }} />
                {name}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

const Stock: React.FC<NuclearProps & { at: number[] }> = (p) => {
  const frame = useCurrentFrame();
  const [, aLadder, aNotes] = p.at;
  const s = p.stock;
  if (!s) return null;
  // the ladder: 0 at the foot, a little over the highest level at the head
  const top = 640;
  const foot = 1300;
  const max = Math.max(70, s.level + 10);
  const yOf = (v: number) => foot - ((foot - top) * v) / max;
  const fill = grow(frame, aLadder + 20, 90);
  const marks = [
    { v: 3.67, t: "سقف برجام: ۳٫۶۷ درصد" },
    { v: 20, t: "غنای ۲۰ درصد" },
    { v: s.level, t: `ایران: ${faNum(s.level)} درصد` },
  ];
  return (
    <>
      {frame < aLadder + 20 ? (
        <div style={{ position: "absolute", top: 760, right: SIDE, left: SIDE, textAlign: "center", opacity: leave(frame, aLadder + 12, 12) }}>
          <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 200, lineHeight: 1, color: C.acc, transform: `translateY(${rise(frame, 22, 40)}px)`, opacity: fade(frame, 22, 10) }}>{faNum(s.heu * grow(frame, 24, 56), 1)}</div>
          <div style={{ marginTop: 22, fontFamily: VAZIR, fontWeight: 700, fontSize: 46, lineHeight: 1.4, color: C.ink, opacity: fade(frame, 36, 12) }}>{s.heuText}</div>
          <div style={{ marginTop: 22, fontFamily: VAZIR, fontSize: 32, color: C.ink3, opacity: fade(frame, 52, 12) }}>{s.asOf}</div>
        </div>
      ) : null}
      {frame >= aLadder - 2 && frame < aNotes + 20 ? (
        <div style={{ position: "absolute", inset: 0, opacity: Math.min(fade(frame, aLadder, 12), leave(frame, aNotes + 12, 12)) }}>
          {/* the tube */}
          <div style={{ position: "absolute", left: 120, top, width: 90, height: foot - top, borderRadius: 45, border: `2px solid ${C.line2}`, background: "rgba(237,230,214,.04)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: (foot - yOf(s.level)) * fill, background: `linear-gradient(0deg, ${C.acc}, ${C.accLine})` }} />
          </div>
          {marks.map((m, i) => {
            const y = yOf(m.v);
            const reached = fill * s.level >= m.v - 0.01;
            return (
              <div key={i} style={{ position: "absolute", top: y - 24, left: 226, display: "flex", alignItems: "center", gap: 16, opacity: reached ? 1 : 0.35 }}>
                <span style={{ width: 46, height: 3, background: reached ? C.acc : C.line2 }} />
                <span style={{ fontFamily: VAZIR, fontWeight: m.v === s.level ? 800 : 600, fontSize: m.v === s.level ? 40 : 32, color: m.v === s.level ? C.acc : C.ink2, whiteSpace: "nowrap" }}>{m.t}</span>
              </div>
            );
          })}
          {/* the two figures beside the tube */}
          <div style={{ position: "absolute", top: 760, left: 470, right: SIDE_RAIL, opacity: fade(frame, aLadder + 90, 14) }}>
            <Panel>
              <div style={{ fontFamily: VAZIR, fontSize: 28, color: C.ink3 }}>کل اورانیوم غنی‌شده</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 54, color: C.ink, marginTop: 6 }}>{s.totalText}</div>
            </Panel>
          </div>
          <div style={{ position: "absolute", top: 1360, right: SIDE_RAIL, left: SIDE, fontFamily: VAZIR, fontSize: 32, lineHeight: 1.7, color: C.ink2, opacity: fade(frame, aLadder + 120, 14) }}>{s.explain}</div>
        </div>
      ) : null}
    </>
  );
};

export const Nuclear: React.FC<NuclearProps> = (p) => {
  paint("nuclear");
  const frame = useCurrentFrame();
  const { at, total } = plan(p);
  const aNotes = at[at.length - 2];
  const aSource = at[at.length - 1];
  return (
    <AbsoluteFill style={{ direction: "rtl" }}>
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      <Backdrop total={total} glowY={40} />
      <Brand tag={p.series} />
      <Progress total={total} marks={at.slice(1)} />
      <div style={{ position: "absolute", top: 222, right: SIDE, left: SIDE, opacity: fade(frame, 2, 12) }}>
        <Kicker size={36}>{p.kicker}</Kicker>
        <Words text={p.question} from={6} step={3} style={{ marginTop: 10, fontFamily: NASKH, fontWeight: 700, fontSize: interpolate(grow(frame, at[1], 20), [0, 1], [72, 50]), lineHeight: 1.4, color: C.ink }} />
      </div>
      {p.view === "sites" ? <Sites {...p} at={at} /> : <Stock {...p} at={at} />}

      {/* what the agency says now */}
      {frame >= aNotes - 2 && frame < aSource + 20 ? (
        <div style={{ position: "absolute", top: 600, right: SIDE_RAIL, left: SIDE, opacity: Math.min(fade(frame, aNotes + 8, 12), leave(frame, aSource + 12, 12)) }}>
          {p.notes.map((n, i) => (
            <Panel key={i} style={{ marginBottom: 26, opacity: fade(frame, aNotes + 8 + i * 30, 14), transform: `translateY(${rise(frame, aNotes + 8 + i * 30, 24, 14)}px)` }}>
              <div style={{ fontFamily: VAZIR, fontSize: 33, lineHeight: 1.75, color: C.ink }}>{n}</div>
            </Panel>
          ))}
        </div>
      ) : null}

      {frame >= aSource - 2 ? (
        <div style={{ position: "absolute", top: 640, right: SIDE_RAIL, left: SIDE, opacity: fade(frame, aSource + 14, 14) }}>
          <Kicker size={34} color={C.ink3}>این‌ها از کجاست؟</Kicker>
          <div style={{ marginTop: 22, fontFamily: VAZIR, fontSize: 32, lineHeight: 1.75, color: C.ink2 }}>{p.source}</div>
          {p.view === "sites" ? <div style={{ marginTop: 18, fontFamily: VAZIR, fontSize: 27, lineHeight: 1.7, color: C.ink3 }}>جای هر تأسیسات در حد شهر است، نه محل خود آن.</div> : null}
        </div>
      ) : null}
      <Foot opacity={fade(frame, aSource + 24, 14)}>{p.foot}</Foot>
    </AbsoluteFill>
  );
};
