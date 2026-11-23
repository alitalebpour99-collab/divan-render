// «یک دور»'s pre-delivery check (scripts/mapcheck.mjs routes a loop's sample here). Pure: the loop's layout
// (src/loop/scene.ts), the land test and the blink rule; no renderer, so the public Tests workflow runs it with
// d3-geo and topojson-client alone.
import { loopScene, loopDuration, COLW, headerSize } from "../src/loop/scene.ts";
import { textWidth } from "../src/map-engine/labels.ts";
import { landAt } from "../src/map-engine/water.ts";
import { BLINK_FRAMES, blinks } from "./blinks.mjs";

const meet = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const onScreen = (b) => b.x + b.w > 0 && b.x < 1080 && b.y + b.h > 0 && b.y < 1920;
/**
 * «یک دور» (the seamless loop, src/loop/scene.ts): the same rules on its own layout, every frame of the turn. Its words
 * on the map (Tehran's name) and its pin may not meet the header, the source line, the glass panel, the event's row or
 * the badge, nor one another; a word that is not a land place's own name may not lie on land; every word of the row
 * fits the column. A loop has no end to fly home from: nothing may blink anywhere in the turn, across the seam too
 * (the turn is read twice over its first BLINK_FRAMES frames).
 */
export async function checkLoop(content, every = 1) {
  const N = loopDuration(content);
  const fails = [];
  const fail = (f, rule, what) => fails.push({ f, s: +(f / 30).toFixed(2), rule, what });
  const seen = [];
  if (textWidth(content.span, headerSize(content.span)) > 2 * COLW - 60) fail(0, "header-too-long", `«${content.span}» needs more than two lines`);
  for (let f = 0; f < N; f += 1) {
    const sc = loopScene(content, f);
    const set = new Set();
    for (const w of sc.words) if (w.map) set.add(`${w.kind} «${w.t}»`);
    for (const d of sc.discs) set.add(`disc ${d.n}`);
    seen.push(set);
    if (f % every) continue;
    const mapWords = sc.words.filter((w) => w.map);
    for (let i = 0; i < mapWords.length; i += 1) {
      const w = mapWords[i];
      for (let j = i + 1; j < mapWords.length; j += 1) if (meet(w.box, mapWords[j].box)) fail(f, "text-over-text", `«${w.t}» × «${mapWords[j].t}»`);
      for (const p of sc.panels) if (meet(w.box, p)) fail(f, "text-under-panel", `${w.kind} «${w.t}»`);
      for (const d of sc.discs) if (meet(w.box, { x: d.xy[0] - d.r, y: d.xy[1] - d.r, w: 2 * d.r, h: 2 * d.r })) fail(f, "text-over-marker", `«${w.t}» × ${d.n}`);
      if (!onScreen(w.box) || w.box.x < 0 || w.box.x + w.box.w > 1080) fail(f, "text-off-screen", `«${w.t}»`);
      const g = w.at ? sc.view.inv(w.at[0], w.at[1]) : null;
      const anchorLand = w.kind === "label" && g ? landAt(g) : false;
      if (!anchorLand) {
        let land = 0;
        for (let a = 0; a <= 4; a += 1)
          for (let b = 0; b <= 2; b += 1) {
            const q = sc.view.inv(w.box.x + (w.box.w * a) / 4, w.box.y + (w.box.h * b) / 2);
            if (q && landAt(q)) land += 1;
          }
        if (land) fail(f, "text-over-land", `«${w.t}» (${land}/15 samples on land)`);
      }
    }
    for (const d of sc.discs) for (const p of sc.panels) if (meet({ x: d.xy[0] - d.r, y: d.xy[1] - d.r, w: 2 * d.r, h: 2 * d.r }, p)) fail(f, "marker-under-text", `${d.n}`);
    for (const w of sc.words) if (!w.map && w.box.w > COLW) fail(f, "row-too-wide", `«${w.t}»`);
  }
  // across the seam: the turn, then its first frames again
  const ring = [...seen, ...seen.slice(0, BLINK_FRAMES + 2)];
  for (const b of blinks(ring, ring.length)) fail(b.from % N, "blink", `${b.k} gone on frames ${b.from % N}–${b.to % N} (${b.n}) and back`);
  return { sb: { total: N }, fails };
}
