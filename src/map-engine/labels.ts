// Label placement, pure: for each label eight places round its point are tried in order, and the first that meets
// no other label and stays inside the safe frame is taken; a label that finds no room is taken out on a leader line
// (map-engine-fa.md §4). Greedy, no library. The labels are placed once per shot, so they never jump while it plays.
export type Box = { x: number; y: number; w: number; h: number };
export type Want = { id: string; x: number; y: number; w: number; h: number; prio?: number };
export type Placed = { id: string; box: Box; anchor: [number, number]; leader: boolean; side: "r" | "l" };

/** About how wide a Persian line is: Vazirmatn's letters average half their size. */
export const textWidth = (s: string, size: number) => Math.ceil(String(s).length * size * 0.58) + 8;

const meets = (a: Box, b: Box, pad = 8) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inside = (a: Box, safe: Box) => a.x >= safe.x && a.y >= safe.y && a.x + a.w <= safe.x + safe.w && a.y + a.h <= safe.y + safe.h;

export function place(wants: Want[], safe: Box, taken: Box[] = [], gap = 18): Placed[] {
  const out: Placed[] = [];
  const used = [...taken];
  const order = [...wants].sort((a, b) => (b.prio ?? 0) - (a.prio ?? 0));
  for (const w of order) {
    const g = gap;
    // right, left, above, below, and the four corners: a Persian label reads best to the left of its point
    const tries: [number, number, "r" | "l"][] = [
      [w.x - g - w.w, w.y - w.h / 2, "l"],
      [w.x + g, w.y - w.h / 2, "r"],
      [w.x - w.w / 2, w.y - g - w.h, "l"],
      [w.x - w.w / 2, w.y + g, "l"],
      [w.x - g - w.w, w.y - g - w.h, "l"],
      [w.x + g, w.y - g - w.h, "r"],
      [w.x - g - w.w, w.y + g, "l"],
      [w.x + g, w.y + g, "r"],
    ];
    let done: Placed | null = null;
    for (const [x, y, side] of tries) {
      const box = { x, y, w: w.w, h: w.h };
      if (inside(box, safe) && !used.some((u) => meets(u, box))) {
        done = { id: w.id, box, anchor: [w.x, w.y], leader: false, side };
        break;
      }
    }
    if (!done) {
      // out on a leader line: further and further from the point, above then below, until there is room
      for (let r = 120; r <= 520 && !done; r += 80)
        for (const dy of [-r, r, -r * 0.6, r * 0.6]) {
          const x = Math.min(safe.x + safe.w - w.w, Math.max(safe.x, w.x - w.w / 2));
          const box = { x, y: w.y + dy - w.h / 2, w: w.w, h: w.h };
          if (inside(box, safe) && !used.some((u) => meets(u, box))) {
            done = { id: w.id, box, anchor: [w.x, w.y], leader: true, side: "l" };
            break;
          }
        }
    }
    if (!done) {
      // round 4: no free place: the one that covers least (of the other labels, the objects, the lines), never just the point
      const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const cands: Box[] = [];
      for (const [x, y] of tries) cands.push({ x, y, w: w.w, h: w.h });
      for (let r = 120; r <= 520; r += 80) for (const dy of [-r, r, -r * 0.6, r * 0.6]) cands.push({ x: Math.min(safe.x + safe.w - w.w, Math.max(safe.x, w.x - w.w / 2)), y: w.y + dy - w.h / 2, w: w.w, h: w.h });
      const fit = (b: Box): Box => ({ ...b, x: Math.min(safe.x + safe.w - b.w, Math.max(safe.x, b.x)), y: Math.min(safe.y + safe.h - b.h, Math.max(safe.y, b.y)) });
      const best = cands.map(fit).map((b) => ({ b, cost: used.reduce((n, u) => n + area(u, b), 0) + Math.hypot(b.x + b.w / 2 - w.x, b.y + b.h / 2 - w.y) * 2 })).sort((a, z) => a.cost - z.cost)[0].b;
      done = { id: w.id, box: best, anchor: [w.x, w.y], leader: true, side: "l" };
    }
    used.push(done.box);
    out.push(done);
  }
  return out;
}

/** Whether any two placed labels meet, or one leaves the safe frame (the gate asks this). */
export function clashes(placed: Placed[], safe: Box): string[] {
  const bad: string[] = [];
  placed.forEach((p, i) => {
    if (!inside(p.box, safe)) bad.push(`${p.id} outside the safe frame`);
    for (const q of placed.slice(i + 1)) if (meets(p.box, q.box, 0)) bad.push(`${p.id} meets ${q.id}`);
  });
  return bad;
}
