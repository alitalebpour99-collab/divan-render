// Round 8: the pre-delivery check's rules (scripts/mapcheck.mjs runs them on a sample; tests/legend.test.mjs on both topics).
import { enrich } from "../src/storyboard/enrich.ts";
import { direct } from "../src/storyboard/director.ts";
import { frameScene, CHROME } from "../src/storyboard/Reel.tsx";
import { isLand, coastKm, landAt } from "../src/map-engine/water.ts";

/** a thing's hull must be this far off the coast (km), a disc of a sea event this far */
export const HULL_KM = 1;
export const DISC_KM = 2;

const meet = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const onScreen = (b) => b.x + b.w > 0 && b.x < 1080 && b.y + b.h > 0 && b.y < 1920;

export function checkReel(content, every = 2) {
  const c = enrich(content);
  const sb = direct(c, []);
  const fails = [];
  const fail = (f, rule, what) => fails.push({ f, s: +(f / sb.fps).toFixed(2), rule, what });
  for (let f = 0; f < sb.total; f += every) {
    const sc = frameScene(c, sb, f);
    const { words, things, discs, lanes, view, beat } = sc;
    // the loop's last frames fly home under the hook's words: the same rules hold
    const panels = [...CHROME, ...(sc.over ?? [])];
    // --- words ---
    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      for (let j = i + 1; j < words.length; j += 1) if (meet(w.box, words[j].box)) fail(f, "text-over-text", `${w.kind} «${w.t}» × ${words[j].kind} «${words[j].t}»`);
      for (const p of panels) if (meet(w.box, p)) fail(f, "text-under-panel", `${w.kind} «${w.t}»`);
      for (const t of things) if (meet(w.box, t.box)) fail(f, "text-over-object", `${w.kind} «${w.t}» × ${t.id}`);
      for (const d of discs) if (meet(w.box, { x: d.xy[0] - d.r, y: d.xy[1] - d.r, w: 2 * d.r, h: 2 * d.r })) fail(f, "text-over-marker", `${w.kind} «${w.t}» × ${d.n}`);
      // over land: every word but a land place's own name (its anchor on land) must lie on the water
      const anchorLand = (() => {
        if ((w.kind !== "name" && w.kind !== "label") || !w.at) return false;
        const g = view.inv(w.at[0], w.at[1]);
        return g ? landAt(g) : false;
      })();
      if (!anchorLand) {
        let land = 0;
        for (let a = 0; a <= 4; a += 1)
          for (let b = 0; b <= 2; b += 1) {
            const g = view.inv(w.box.x + (w.box.w * a) / 4, w.box.y + (w.box.h * b) / 2);
            if (g && landAt(g)) land += 1;
          }
        if (land) fail(f, "text-over-land", `${w.kind} «${w.t}» (${land}/15 samples on land)`);
      }
    }
    // --- things ---
    for (const t of things) {
      if (!onScreen(t.box)) continue;
      for (const p of panels) if (meet(t.box, p)) fail(f, "object-under-text", `${t.id} under a panel`);
      for (const d of discs) if (meet(t.box, { x: d.xy[0] - d.r, y: d.xy[1] - d.r, w: 2 * d.r, h: 2 * d.r })) fail(f, "object-over-marker", `${t.id} × ${d.n}`);
      if (!t.floats) continue;
      // the waterline: five points along the hull, and the point itself off the coast
      const bad = [];
      for (const dx of [-110, -55, 0, 55, 110]) {
        const g = view.inv(t.p[0] + dx * t.sc, t.p[1] + 4 * t.sc);
        if (g && isLand(g)) bad.push(dx);
      }
      const g0 = t.geo ?? view.inv(t.p[0], t.p[1]);
      const ck = g0 ? (isLand(g0) ? 0 : coastKm(g0)) : Infinity;
      if (bad.length || ck < HULL_KM) fail(f, "object-on-land", `${t.id} at ${g0?.map((x) => x.toFixed(3)).join(",")} hull on land at ${bad.join("/") || "-"}, ${ck.toFixed(1)} km off the coast`);
      if (t.badge) {
        for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) {
          const gb = view.inv(t.badge.x + t.badge.w * a, t.badge.y + t.badge.h * b);
          if (gb && landAt(gb)) {
            fail(f, "badge-on-land", `${t.id} count badge`);
            break;
          }
        }
      }
    }
    for (let i = 0; i < things.length; i += 1)
      for (let j = i + 1; j < things.length; j += 1) if (onScreen(things[i].box) && (things[i].col === undefined || things[i].col !== things[j].col) && meet(things[i].box, things[j].box, -6)) fail(f, "object-over-object", `${things[i].id} × ${things[j].id}`);
    // --- discs ---
    for (const d of discs) {
      if (d.xy[1] < 0 || d.xy[1] > 1920 || d.xy[0] < 0 || d.xy[0] > 1080) continue;
      for (const p of panels) if (meet({ x: d.xy[0] - d.r, y: d.xy[1] - d.r, w: 2 * d.r, h: 2 * d.r }, p)) fail(f, "marker-under-text", `${d.n}`);
      if (!d.sea) continue;
      const ck = isLand(d.geo) ? 0 : coastKm(d.geo);
      let edge = 0;
      for (let k = 0; k < 8; k += 1) {
        const g = view.inv(d.xy[0] + Math.cos((k * Math.PI) / 4) * (d.r + 4), d.xy[1] + Math.sin((k * Math.PI) / 4) * (d.r + 4));
        if (g && isLand(g)) edge += 1;
      }
      if (ck < DISC_KM || edge) fail(f, "marker-on-land", `${d.n} at ${d.geo.join(",")}: ${ck.toFixed(1)} km off the coast, ${edge}/8 of its edge on land`);
    }
    // --- lanes (geometry, once a beat is enough, but cheap) ---
    const laneKey = lanes.map((l) => l.id).join("|") + String(c.beats.indexOf(beat));
    if (laneKey !== frameScene.lastLanes) {
      frameScene.lastLanes = laneKey;
      for (const l of lanes) {
        const pts = [];
        for (let i = 0; i + 1 < l.coords.length; i += 1) {
          const [a, b] = [l.coords[i], l.coords[i + 1]];
          const n = Math.max(1, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]) / 0.01));
          for (let k = 0; k <= n; k += 1) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
        }
        const wet = pts.filter((q) => {
          const s = view.at(q[0], q[1]);
          return s && s[0] > -50 && s[0] < 1130 && s[1] > -50 && s[1] < 1970;
        });
        const hits = wet.filter((q) => isLand(q) || coastKm(q) < 0.5);
        if (hits.length) fail(f, "line-on-land", `lane ${l.id}: ${hits.length} points on or at the coast, first ${hits[0].map((x) => x.toFixed(3))}`);
      }
      for (let i = 0; i < lanes.length; i += 1)
        for (let j = i + 1; j < lanes.length; j += 1) {
          const A = lanes[i].coords;
          const B = lanes[j].coords;
          let cross = false;
          for (let a = 0; a + 1 < A.length && !cross; a += 1)
            for (let b = 0; b + 1 < B.length && !cross; b += 1) cross = segCross(A[a], A[a + 1], B[b], B[b + 1]);
          if (cross) fail(f, "lines-cross", `${lanes[i].id} × ${lanes[j].id}`);
        }
    }
  }
  return { c, sb, fails };
}

function segCross(p1, p2, p3, p4) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

