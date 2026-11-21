// The one style of Divan (bible v3): the navy room of «تصمیم امروز», drawn from a storyboard (director.ts). The map is
// the anchor: it is on the stage from frame 0 with the event on it, the camera dives and pans as the narrator names
// places, and the other pictures (the pen chart, a road's object, a big figure, the gauge, the poll) come over it
// while the map breathes behind. A picture changes every 1 to 2 seconds, on a word. The last frames bring the first
// picture back, so the Reel loops. Every word comes from the content (types.ts); nothing is typed here.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CometTrail, CountryFill, Callouts, ClaimLine, DashedLine, FlagChip, LANES, MapStage, MeasureLine, PinCluster, PlaceLabels, RegionHatch, DIVAN, lookAt, faNum, type Key, type Look, type CalloutSpec } from "../map-engine";
import { VAZIR } from "../map-engine/fonts";
import { LOOP } from "./director";
import { RoadObject } from "./objects";
import type { Beat, ChartSpec, Mark, ReelContent, Shot, Storyboard } from "./types";

export const ROOM = { bg: "#1a2330", bg2: "#202b3a", edge: "#151d28", panel: "rgba(30,41,58,0.94)", line: "#34445a", paper: "#f3efe6", mute: "#a3afbd", amber: "#ffb020", hit: "#ff4d40" };
const L = 64;
const R = 884;
const COLW = R - L;
/** the map's frame: full width, under the header, above the caption */
const STAGE = { x: 0, y: 520, w: 1080, h: 960 };
const SAFE = { x: L, y: 540, w: COLW, h: 900 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const rise = (f: number, at: number, dur = 10) => interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease });
export const faDigits = (s: string) => String(s).replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[Number(x)]);

type Props = ReelContent & { storyboard: Storyboard; music?: string };

const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.4 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={45} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** The camera's keys from the shots: a dive takes 1.5 s, a push the whole shot; the last frames fly back to the first look. */
function cameraKeys(sb: Storyboard): Key[] {
  const keys: Key[] = [];
  let prev: Look | null = null;
  for (const s of sb.shots) {
    const look = s.motion.look;
    if (!look) continue;
    const a = Math.round(s.start * sb.fps);
    const len = Math.round(s.dur * sb.fps);
    if (!prev) {
      const hook = s.motion.from;
      keys.push({ at: 0, ...(hook ?? { ...look, span: look.span * (s.motion.camera === "push-close" ? 0.55 : 1.12) }) });
      keys.push({ at: a + len, ...look });
    } else {
      const travel = s.motion.camera === "dive" ? Math.min(len, 45) : len;
      if (keys[keys.length - 1].at < a) keys.push({ at: a, ...prev });
      keys.push({ at: a + travel, ...look, ease: s.motion.camera === "dive" ? "inOut" : "out" });
    }
    prev = look;
  }
  // the loop: hold the last look, then fly back to the first in the last frames (the frame number goes last: a key's own «at» must not win)
  if (keys.length) keys.push({ ...keys[keys.length - 1], at: sb.total - LOOP }, { ...keys[0], at: sb.total - 1 });
  return keys.filter((k, i, all) => i === 0 || k.at > all[i - 1].at);
}

/** The marks on the map at frame f, each with its clock: the hook's are whole from frame 0 (the event is already there). */
function marksAt(c: ReelContent, sb: Storyboard, f: number, inLoop: boolean) {
  const out: { m: Mark; t: number; beat: number; own: boolean }[] = [];
  const cur = sb.shots.find((s) => f >= s.start * sb.fps && f < (s.start + s.dur) * sb.fps) ?? sb.shots[sb.shots.length - 1];
  // the chapter: from the last beat that clears the map
  let from = 0;
  c.beats.forEach((b, i) => {
    if (b.kind === "map" && b.clear && i <= cur.beat) from = i;
  });
  for (const s of sb.shots) {
    const b = c.beats[s.beat];
    const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : b.kind === "demand" || b.kind === "road" ? (b.marks ?? []) : [];
    for (const i of s.marks) {
      const m = marks[i];
      const at = s.beat === 0 && s.n === 1 ? -60 : Math.round(s.start * sb.fps) + 3;
      if (inLoop) {
        if (s.beat === 0 && s.n === 1) out.push({ m, t: f - at, beat: 0, own: true });
        continue;
      }
      if (f < at) continue;
      if (s.beat === 0 || s.beat >= from) {
        // labels, measures and callouts belong to their own beat; what is drawn on the ground stays for the chapter
        const passing = m.kind === "callout" || m.kind === "measure" || m.kind === "label" || m.kind === "flag" || b.kind === "road";
        if (passing && s.beat !== cur.beat) continue;
        out.push({ m, t: f - at, beat: s.beat, own: s.beat === cur.beat });
      }
    }
  }
  return out;
}

const MapMarks: React.FC<{ list: { m: Mark; t: number; own: boolean }[]; f: number }> = ({ list, f }) => {
  const callouts: CalloutSpec[] = [];
  const ts: number[] = [];
  const labels: { t: string; lon: number; lat: number }[] = [];
  const body = list.map(({ m, t }, i) => {
    switch (m.kind) {
      case "fill":
        return <CountryFill key={i} a3={m.a3} color={m.color} t={t} />;
      case "hatch":
        return <RegionHatch key={i} a3={m.a3} polygon={m.polygon} color={m.color} t={t} />;
      case "claim":
        return <ClaimLine key={i} coords={m.coords} color={m.color} t={t} />;
      case "dashed":
        return <DashedLine key={i} coords={m.coords} color={m.color} t={t} />;
      case "comet":
        return <CometTrail key={i} coords={m.coords} color={m.color} t={t} dur={36} loop={m.loop ? 75 : undefined} head={13} width={8} tail={0.3} />;
      case "pins":
        return <PinCluster key={i} points={m.points} color={m.color} t={t} />;
      case "measure":
        return <MeasureLine key={i} a={m.a} b={m.b} t={t} />;
      case "callout":
        callouts.push({ id: `c${i}`, lon: m.lon, lat: m.lat, bold: m.bold, sub: m.sub, color: m.color });
        ts.push(t);
        return null;
      case "label":
        labels.push({ t: m.t, lon: m.lon, lat: m.lat });
        return null;
      default:
        return null;
    }
  });
  void f;
  return (
    <>
      {body}
      <PlaceLabels items={labels} />
      <Callouts items={callouts} ts={ts} safe={SAFE} />
    </>
  );
};

/** The day's traffic: comets on the sea lanes in view, always moving, back where they began at the loop. */
const Ambient: React.FC<{ f: number; total: number; look: Look }> = ({ f, total, look }) => {
  if (look.span > 120) return null;
  const near = LANES.filter((l) => l.path.some(([lon, lat]) => Math.abs(lon - look.lon) < look.span * 0.7 && Math.abs(lat - look.lat) < look.span * 0.9)).slice(0, 3);
  return (
    <>
      {near.map((l, i) => (
        <CometTrail key={l.id} coords={l.path} color="#ffd88a" t={((f / total) * 2 + i * 0.37) * 120} loop={120} tail={0.22} head={8} width={5} />
      ))}
    </>
  );
};

// ---------------- the pictures over the map ----------------

const Chart: React.FC<{ chart: ChartSpec; k: number; f: number; showSource: boolean }> = ({ chart, k, f, showSource }) => {
  const pts = chart.points;
  const lo0 = Math.min(...pts);
  const hi0 = Math.max(...pts);
  const pad = (hi0 - lo0) * 0.14 || 1;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const box = { x0: L + 30, x1: R - 30, y0: 860, y1: 1240 };
  // time runs left to right on an RTL page too (owner, 19 Nov 2026): the oldest on the left, today on the right
  const X = (i: number) => box.x0 + (pts.length > 1 ? i / (pts.length - 1) : 1) * (box.x1 - box.x0);
  const Y = (v: number) => box.y1 - ((v - lo) / (hi - lo)) * (box.y1 - box.y0);
  const head = k * (pts.length - 1);
  const i0 = Math.floor(head);
  const under = i0 >= pts.length - 1 ? pts[pts.length - 1] : pts[i0] + (pts[i0 + 1] - pts[i0]) * (head - i0);
  const headX = box.x0 + k * (box.x1 - box.x0);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(pts.length - 1)} ${box.y1} L${X(0)} ${box.y1} Z`;
  const shown = faDigits(under.toFixed(chart.digits ?? 2)).replace(".", "٫");
  const done = k >= 0.999;
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 600, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR }}>
        <div style={{ fontWeight: 700, fontSize: 46, color: ROOM.paper }}>{chart.title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 150, color: ROOM.amber, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{shown}</div>
          <div style={{ fontWeight: 600, fontSize: 44, color: ROOM.mute }}>{chart.unit}</div>
        </div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="sb-pen">
            <rect x={box.x0 - 40} y={box.y0 - 60} width={headX - box.x0 + 40} height={box.y1 - box.y0 + 120} />
          </clipPath>
          <linearGradient id="sb-under" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ROOM.amber} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ROOM.amber} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1={box.x0} x2={box.x1} y1={box.y0 + (g * (box.y1 - box.y0)) / 3} y2={box.y0 + (g * (box.y1 - box.y0)) / 3} stroke={ROOM.line} strokeWidth={2} />
        ))}
        <g clipPath="url(#sb-pen)">
          <path d={area} fill="url(#sb-under)" />
          <path d={line} fill="none" stroke={ROOM.amber} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((v, i) => (
            <circle key={i} cx={X(i)} cy={Y(v)} r={7} fill={ROOM.paper} />
          ))}
        </g>
        {!done ? <circle cx={headX} cy={Y(under)} r={15} fill={ROOM.amber} stroke={ROOM.paper} strokeWidth={4} /> : null}
        {done ? (
          <g>
            <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={16} fill={ROOM.hit} />
            <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r={16 + pulse * 30} fill="none" stroke={ROOM.hit} strokeWidth={3} opacity={1 - pulse} />
          </g>
        ) : null}
        <text x={box.x0} y={box.y1 + 58} textAnchor="start" fill={ROOM.mute} fontFamily={VAZIR} fontSize={40} fontWeight={600}>
          {chart.first}
        </text>
        <text x={box.x1} y={box.y1 + 58} textAnchor="end" fill={ROOM.paper} fontFamily={VAZIR} fontSize={40} fontWeight={700}>
          {chart.last}
        </text>
      </svg>
      {showSource ? <Source text={chart.source} k={1} /> : null}
    </AbsoluteFill>
  );
};

const Source: React.FC<{ text?: string; k: number; top?: number }> = ({ text, k, top = 1372 }) =>
  text ? (
    <div style={{ position: "absolute", top, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, fontWeight: 600, fontSize: 40, color: ROOM.mute, opacity: k }}>
      {text.startsWith("منبع") ? text : `منبع: ${text}`}
    </div>
  ) : null;

/** A big figure: it counts up to its value under the pen's amber, then what it means, then its source. */
const NumberPic: React.FC<{ b: Extract<Beat, { kind: "number" }>; local: number; view: number }> = ({ b, local, view }) => {
  const m = /([0-9۰-۹][0-9۰-۹٬,]*(?:[٫.][0-9۰-۹]+)?)/.exec(b.big);
  const latin = m ? m[1].replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٬,]/g, "").replace("٫", ".") : null;
  const value = latin ? Number(latin) : NaN;
  const k = interpolate(local, [0, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const decimals = latin && latin.includes(".") ? latin.split(".")[1].length : 0;
  const shown = m && Number.isFinite(value) ? b.big.replace(m[1], faNum(value * k, decimals)) : b.big;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 700, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, textAlign: "right" }}>
        <div style={{ fontWeight: 800, fontSize: 190, color: ROOM.amber, lineHeight: 1, textShadow: "0 0 60px rgba(255,176,32,0.35)" }}>{shown}</div>
        <div style={{ fontWeight: 700, fontSize: 52, color: ROOM.paper, marginTop: 18, opacity: view >= 1 ? 1 : 0.0, transform: `translateY(${view >= 1 ? 0 : 20}px)` }}>{b.unit}</div>
        <div style={{ fontWeight: 600, fontSize: 48, color: ROOM.paper, marginTop: 26, lineHeight: 1.45, opacity: view >= 1 ? 1 : 0 }}>{b.text}</div>
      </div>
      <Source text={b.source} k={view >= 2 ? 1 : 0} />
    </AbsoluteFill>
  );
};

/** A road in three views (bible §2): its object in its colour with its letter and title, then its cost, then its source. */
const RoadPic: React.FC<{ b: Extract<Beat, { kind: "road" }>; local: number; view: number; f: number; aiLabel?: string; onMap?: boolean }> = ({ b, local, view, f, aiLabel, onMap }) => {
  const r = b.road;
  const k = rise(local, 0, 12);
  const side = view >= 1;
  // on the map the object is smaller and up at the side, so the road it draws stays in sight
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: onMap ? 640 : side ? 440 : 280, top: onMap ? 470 : side ? 560 : 640, transform: `scale(${(onMap ? 0.48 : side ? 0.72 : 1) * (0.7 + 0.3 * k)})`, transformOrigin: "50% 50%", opacity: k, filter: `drop-shadow(0 0 40px ${r.color}55)` }}>
        <RoadObject id={r.object} color={r.color} f={f} />
      </div>
      {side ? <div style={{ position: "absolute", top: 985, left: 0, width: 1080, height: 400, background: "linear-gradient(180deg, rgba(26,35,48,0) 0%, rgba(26,35,48,0.92) 18%, rgba(26,35,48,0.92) 100%)" }} /> : null}
      <div style={{ position: "absolute", top: side ? 1010 : 1130, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ width: 104, height: 104, borderRadius: 28, background: r.color, color: ROOM.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 54, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: `0 0 50px ${r.color}88` }}>{r.key}</div>
        <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 64, color: ROOM.paper, lineHeight: 1.2 }}>{r.title}</div>
      </div>
      {side ? (
        <div style={{ position: "absolute", top: 1150, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR }}>
          <div style={{ fontWeight: 700, fontSize: 38, color: r.color }}>{aiLabel ?? "پیامد احتمالی، تحلیل دیوان"}</div>
          <div style={{ fontWeight: 800, fontSize: 60, color: ROOM.paper, lineHeight: 1.35, marginTop: 6 }}>{r.cost}</div>
        </div>
      ) : null}
      <Source text={r.source} k={view >= 2 ? 1 : 0} top={1390} />
    </AbsoluteFill>
  );
};

const FlagsPic: React.FC<{ b: Extract<Beat, { kind: "flags" }>; local: number }> = ({ b, local }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", top: 760, left: 0, width: 1080, display: "flex", justifyContent: "center", gap: 46, direction: "rtl" }}>
      {b.a3.map((a3, i) => {
        const k = rise(local, i * 9, 9);
        return (
          <div key={a3} style={{ transform: `translateY(${(1 - k) * 60 + Math.sin((local + i * 11) / 9) * 10}px) scale(${(0.6 + 0.4 * k) * (1 + 0.05 * Math.sin((local + i * 7) / 13))}) rotate(${Math.sin((local + i * 5) / 17) * 3}deg)`, opacity: k }}>
            <FlagChip a3={a3} height={150} size={48} />
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);

/** Divan's estimate for each road on one bar: calm on the right, the far end on the left. */
const GaugePic: React.FC<{ b: Extract<Beat, { kind: "gauge" }>; local: number; f: number }> = ({ b, local, f }) => {
  const x0 = L + 30;
  const x1 = R - 30;
  const at = (r: number) => x1 - r * (x1 - x0);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 720, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, fontWeight: 800, fontSize: 64, color: ROOM.paper }}>{b.label}</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="sb-risk" x1="1" x2="0">
            <stop offset="0%" stopColor="#3da5ff" />
            <stop offset="55%" stopColor={ROOM.amber} />
            <stop offset="100%" stopColor={ROOM.hit} />
          </linearGradient>
        </defs>
        <rect x={x0} y={1000} width={x1 - x0} height={22} rx={11} fill="url(#sb-risk)" />
        <text x={x1} y={1080} textAnchor="end" fill={ROOM.mute} fontFamily={VAZIR} fontSize={40} fontWeight={700}>
          {b.ends[0]}
        </text>
        <text x={x0} y={1080} textAnchor="start" fill={ROOM.mute} fontFamily={VAZIR} fontSize={40} fontWeight={700}>
          {b.ends[1]}
        </text>
        {b.roads.map((r, i) => {
          const k = rise(local, 6 + i * 10, 18);
          const x = at((r.risk ?? 0.5) * k);
          return (
            <g key={i}>
              <path d={`M${x} 994 L${x - 16} 966 H${x + 16} Z`} fill={r.color} />
              <circle cx={x} cy={930} r={36 + Math.sin(f / 6 + i) * 2} fill={r.color} />
              <text x={x} y={946} textAnchor="middle" fill={ROOM.bg} fontFamily={VAZIR} fontWeight={800} fontSize={36}>
                {r.key}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const PollPic: React.FC<{ b: Extract<Beat, { kind: "poll" }>; local: number; view: number; f: number; badge?: string; len: number }> = ({ b, local, view, f, badge, len }) => {
  const badgeAt = Math.max(30, len - LOOP - 46);
  const bk = rise(local, badgeAt, 8) * (1 - interpolate(local, [len - LOOP - 6, len - LOOP], [0, 1], clamp));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 640, left: L + 20, width: COLW - 40, direction: "rtl", display: "flex", flexDirection: "column", gap: 24 }}>
        {b.options.map((o, i) => {
          const k = rise(local, 8 + i * 5, 9);
          const glow = 0.5 + 0.5 * Math.sin((f - i * 10) / 6);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, background: ROOM.paper, borderRadius: 28, padding: "20px 26px", transform: `scale(${0.85 + 0.15 * k})`, opacity: k, boxShadow: `0 0 ${20 + glow * 30}px ${o.color}66` }}>
              <div style={{ width: 84, height: 84, borderRadius: 999, background: o.color, color: ROOM.bg, fontFamily: VAZIR, fontWeight: 800, fontSize: 44, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{o.key}</div>
              <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: 48, color: ROOM.bg }}>{o.title}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1240, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, display: "flex", flexDirection: "column", gap: 14, opacity: view >= 2 ? 1 : 0 }}>
        <div style={{ alignSelf: "flex-start", border: `3px solid ${ROOM.amber}`, color: ROOM.amber, fontWeight: 800, fontSize: 40, padding: "6px 22px", borderRadius: 999 }}>{b.chip}</div>
        <div style={{ color: ROOM.mute, fontWeight: 600, fontSize: 40, direction: "ltr", textAlign: "right" }}>{b.site}</div>
      </div>
      <div style={{ position: "absolute", left: L, top: 1420, opacity: bk, transform: `scale(${0.8 + 0.2 * bk})`, transformOrigin: "left center", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,176,32,0.14)", border: `2px solid ${ROOM.amber}`, borderRadius: 999, padding: "8px 22px", fontFamily: VAZIR, direction: "rtl" }}>
        <span style={{ color: ROOM.paper, fontWeight: 800, fontSize: 40 }}>{badge ?? "دیوان"}</span>
        <svg width={34} height={30} viewBox="0 0 24 22">
          <path d="M12 21 C-4 10 4 -2 12 5 C20 -2 28 10 12 21 Z" fill={ROOM.hit} />
        </svg>
        <span style={{ color: ROOM.amber, fontWeight: 800, fontSize: 36 }}>+ دنبال کن</span>
      </div>
      <Sfx at={badgeAt} name="badge" volume={0.4} />
    </AbsoluteFill>
  );
};

/** A state's demand at the table: its flag beside it on the map, what it wants, and the source. */
const DemandPic: React.FC<{ b: Extract<Beat, { kind: "demand" }>; local: number; view: number; color: string }> = ({ b, local, view, color }) => {
  const k = rise(local, 4, 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 560, right: 1080 - R, direction: "rtl", transform: `translateY(${(1 - k) * -30}px)`, opacity: k }}>
        <FlagChip a3={b.a3} height={120} size={46} glow={`${color}66`} />
      </div>
      {view >= 1 ? (
        <div style={{ position: "absolute", top: 1160, left: L, width: COLW, direction: "rtl", fontFamily: VAZIR, background: "rgba(26,35,48,0.9)", border: `3px solid ${color}`, borderRadius: 26, padding: "22px 28px", opacity: rise(local, 0, 8) }}>
          <div style={{ fontWeight: 700, fontSize: 38, color }}>می‌خواهد</div>
          <div style={{ fontWeight: 800, fontSize: 60, color: ROOM.paper, lineHeight: 1.3 }}>{b.wants}</div>
        </div>
      ) : null}
      <Source text={b.source} k={view >= 2 ? 1 : 0} top={1390} />
    </AbsoluteFill>
  );
};

// ---------------- the frame ----------------

const Header: React.FC<{ s: Shot; local: number; big: boolean; color: string }> = ({ s, local, big, color }) => {
  if (!s.text.header || s.picture.layer === "chart" || s.picture.layer === "number" || s.picture.layer === "road" || s.picture.layer === "gauge") return null;
  const k = big ? 1 : rise(local, 0, 9);
  return (
    <div style={{ position: "absolute", top: 330, left: L, width: COLW, direction: "rtl", textAlign: "right", fontFamily: VAZIR, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}>
      <div style={{ fontWeight: 800, fontSize: big ? 92 : 76, color, lineHeight: 1.22, textShadow: "0 4px 24px rgba(0,0,0,0.55)" }}>{s.text.header}</div>
      {s.text.sub && s.picture.layer !== "poll" ? <div style={{ fontWeight: 700, fontSize: 48, color: ROOM.paper, marginTop: 8 }}>{s.text.sub}</div> : null}
    </div>
  );
};

/** The narrator's words, a few at a time, the one being said in amber (muted autoplay still reads the Reel). */
const Caption: React.FC<{ sb: Storyboard; f: number }> = ({ sb, f }) => {
  const t = f / sb.fps;
  if (f < 3) return null;
  const i = sb.words.findIndex((w) => t >= w.at - 0.05 && t < w.end + 0.15);
  if (i < 0) return null;
  const cue = sb.words[i].cue;
  const same = sb.words.map((w, j) => ({ ...w, j })).filter((w) => w.cue === cue);
  const pos = same.findIndex((w) => w.j === i);
  const start = Math.max(0, pos - (pos % 3));
  const chunk = same.slice(start, start + 3);
  return (
    <div style={{ position: "absolute", top: 1490, left: L, width: COLW, direction: "rtl", textAlign: "center", fontFamily: VAZIR, fontWeight: 800, fontSize: 54 }}>
      <span style={{ background: "rgba(13,19,34,0.78)", borderRadius: 16, padding: "6px 18px", boxDecorationBreak: "clone" }}>
        {chunk.map((w) => (
          <span key={w.j} style={{ color: w.j === i ? ROOM.amber : ROOM.paper }}>
            {w.text}{" "}
          </span>
        ))}
      </span>
    </div>
  );
};

export const Reel: React.FC<Props> = (p) => {
  const f = useCurrentFrame();
  const sb = p.storyboard;
  const fps = sb.fps;
  const total = sb.total;
  const loopAt = total - LOOP;
  const inLoop = f >= loopAt;
  const idx = Math.max(0, sb.shots.findIndex((s) => f >= Math.round(s.start * fps) && f < Math.round((s.start + s.dur) * fps)));
  const shot = sb.shots[idx] ?? sb.shots[0];
  const beat = p.beats[shot.beat];
  const beatStart = Math.round((sb.shots.find((s) => s.beat === shot.beat)?.start ?? 0) * fps);
  const local = f - Math.round(shot.start * fps);
  const beatLocal = f - beatStart;
  const keys = React.useMemo(() => cameraKeys(sb), [sb]);
  const base = lookAt(keys, f, false);
  // the room breathes once over the Reel: the same at its first and its last frame
  const breath = Math.sin((2 * Math.PI * f) / total);
  const look: Look = { ...base, span: base.span * (1 + 0.025 * breath), lon: base.lon + base.span * 0.004 * breath };
  const overMap = shot.picture.layer !== "map" && !inLoop;
  // a road drawn on the map keeps the map lit: the road is on it; any other picture dims the map behind it
  const roadOnMap = beat.kind === "road" && Boolean(beat.look);
  const dim = interpolate(f, [beatStart, beatStart + 8], [0, overMap ? (roadOnMap ? 0.25 : 0.8) : 0], clamp) * (inLoop ? 0 : 1);
  // every shot over the map moves on its own: a slow push and a drift that turns at each cut, so no 2 s stand still
  const shotLen = Math.max(1, Math.round(shot.dur * fps));
  const sp = Math.min(1, local / shotLen);
  const push: React.CSSProperties = { position: "absolute", inset: 0, transform: `scale(${1 + 0.045 * sp}) translateX(${(shot.n % 2 ? -1 : 1) * 14 * sp}px)`, transformOrigin: "50% 45%" };
  const marks = marksAt(p, sb, f, inLoop);
  const hookShot = sb.shots[0];
  const loopK = interpolate(f, [loopAt, total - 1], [0, 1], clamp);
  const color = p.convention === "actors" ? DIVAN.actors.iran : ROOM.amber;
  // the beat's own colour, for a demand: its state's actor colour
  const demandColor = beat.kind === "demand" ? (p.beats.find((b) => b.kind === "map" || b.kind === "hook") ? colorOfA3(p, beat.a3) : ROOM.amber) : ROOM.amber;
  const roadsShown = p.beats.filter((b) => b.kind === "road").map((b) => (b as Extract<Beat, { kind: "road" }>).road);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 42%, ${ROOM.bg2} 0%, ${ROOM.bg} 62%, ${ROOM.edge} 100%)` }}>
      <MapStage look={look} frame={STAGE} theme={DIVAN} f={f} dim={dim}>
        <Ambient f={f} total={total} look={look} />
        <MapMarks list={marks} f={f} />
      </MapStage>
      {/* the picture of this shot, over the dimmed map */}
      <div style={push}>
      {!inLoop && beat.kind === "chart" ? <Chart chart={beat.chart} k={interpolate(beatLocal, [6, Math.max(20, sb.shots.filter((s) => s.beat === shot.beat).reduce((n, s) => n + s.dur, 0) * fps * 0.72)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })} f={f} showSource={shot.view >= 1} /> : null}
      {!inLoop && beat.kind === "number" ? <NumberPic b={beat} local={beatLocal} view={shot.view} /> : null}
      {!inLoop && beat.kind === "road" ? <RoadPic b={beat} local={beatLocal} view={roadOnMap ? Math.max(1, shot.view) : shot.view} f={f} aiLabel={p.ai_label} onMap={roadOnMap} /> : null}
      {!inLoop && beat.kind === "flags" ? <FlagsPic b={beat} local={beatLocal} /> : null}
      {!inLoop && beat.kind === "gauge" ? <GaugePic b={beat} local={beatLocal} f={f} /> : null}
      {!inLoop && beat.kind === "poll" ? <PollPic b={beat} local={beatLocal} view={shot.view} f={f} badge={p.badge} len={sb.shots.filter((s) => s.beat === shot.beat).reduce((n, s) => n + Math.round(s.dur * fps), 0)} /> : null}
      {!inLoop && beat.kind === "demand" ? <DemandPic b={beat} local={beatLocal} view={shot.view} color={demandColor} /> : null}
      </div>
      {!inLoop && beat.kind === "map" ? <Source text={shot.text.source ?? beat.source} k={rise(beatLocal, 10, 10)} top={1430} /> : null}
      {!inLoop ? <Header s={shot} local={local} big={shot.beat === 0} color={shot.picture.layer === "poll" ? ROOM.amber : shot.beat === 0 ? ROOM.paper : color} /> : null}
      {/* the loop: the first picture's words come back */}
      {inLoop ? (
        <div style={{ opacity: loopK }}>
          <Header s={hookShot} local={99} big color={ROOM.paper} />
        </div>
      ) : null}
      <Hud p={p} f={f} active={inLoop ? -1 : roadsShown.findIndex((r) => beat.kind === "road" && beat.road.key === r.key)} roads={roadsShown} after={!inLoop && (beat.kind === "poll" || beat.kind === "gauge")} />
      {!inLoop ? <Caption sb={sb} f={f} /> : null}
      {sb.voice.map((v, i) => (
        <Sequence key={i} from={v.from} durationInFrames={v.frames + 6} layout="none">
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
      {p.music ? <Audio src={staticFile(p.music)} /> : null}
      {sb.shots.map((s) =>
        s.sound.sfx ? <Sfx key={s.n} at={Math.round(s.start * fps)} name={s.sound.sfx} volume={s.sound.sfx === "hit" ? 0.5 : s.sound.sfx === "pop" ? 0.28 : 0.34} /> : null,
      )}
    </AbsoluteFill>
  );
};

function colorOfA3(p: ReelContent, a3: string): string {
  for (const b of p.beats) {
    const marks = b.kind === "hook" ? (b.marks ?? []) : b.kind === "map" ? b.marks : b.kind === "demand" ? (b.marks ?? []) : [];
    for (const m of marks) if (m.kind === "fill" && m.a3 === a3) return m.color;
  }
  return ROOM.amber;
}

const Hud: React.FC<{ p: ReelContent; f: number; active: number; roads: { key: string; color: string }[]; after: boolean }> = ({ p, f, active, roads, after }) => (
  <div style={{ position: "absolute", top: 236, left: L, width: COLW, direction: "rtl", display: "flex", alignItems: "center", gap: 18, fontFamily: VAZIR }}>
    <div style={{ background: ROOM.amber, color: ROOM.bg, fontWeight: 800, fontSize: 40, padding: "6px 24px", borderRadius: 999 }}>{p.kicker}</div>
    <div style={{ color: ROOM.mute, fontWeight: 700, fontSize: 38 }}>{p.date}</div>
    <div style={{ flex: 1 }} />
    {roads.map((o, i) => {
      const on = i === active;
      const done = after || (active > i && active >= 0);
      return (
        <div key={i} style={{ width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 34, color: on ? ROOM.bg : done ? o.color : ROOM.mute, background: on ? o.color : "transparent", border: `3px solid ${on || done ? o.color : ROOM.line}`, transform: `scale(${on ? 1 + 0.06 * Math.sin(f / 5) : 1})` }}>
          {o.key}
        </div>
      );
    })}
  </div>
);

/** The tile on the profile grid: the room, the kicker, three or four big words, the roads' or actors' colours. */
export const ReelCover: React.FC<{ kicker: string; big: string; colors?: string[] }> = (c) => (
  <AbsoluteFill style={{ background: `radial-gradient(120% 75% at 50% 38%, ${ROOM.bg2} 0%, ${ROOM.bg} 62%, ${ROOM.edge} 100%)`, direction: "rtl", fontFamily: VAZIR, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 860, display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
      <div style={{ background: ROOM.amber, color: ROOM.bg, fontWeight: 800, fontSize: 56, padding: "10px 36px", borderRadius: 999 }}>{c.kicker}</div>
      <div style={{ fontWeight: 800, fontSize: 132, color: ROOM.paper, lineHeight: 1.25 }}>{c.big}</div>
      <div style={{ display: "flex", gap: 24 }}>
        {(c.colors ?? ["#ff5a4e", "#3da5ff", "#2ed3a0"]).map((col, i) => (
          <div key={i} style={{ width: 70, height: 70, borderRadius: 20, background: col }} />
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 44, color: ROOM.mute }}>دیوان</div>
    </div>
  </AbsoluteFill>
);
