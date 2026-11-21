// Label placement, pure: for each label eight places round its point are tried in order, and the first that meets
// no other label and stays inside the safe frame is taken; a label that finds no room is taken out on a leader line
// (map-engine-fa.md §4). Greedy, no library. The labels are placed once per shot, so they never jump while it plays.
export type Box = { x: number; y: number; w: number; h: number };
export type Want = { id: string; x: number; y: number; w: number; h: number; prio?: number };
export type Placed = { id: string; box: Box; anchor: [number, number]; leader: boolean; side: "r" | "l" };

/** About how wide a Persian line is: Vazirmatn's letters average half their size. */
export const textWidth = (s: string, size: number) => Math.ceil(String(s).length * size * 0.52) + 8;

const meets = (a: Box, b: Box, pad = 8) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inside = (a: Box, safe: Box) => a.x >= safe.x && a.y >= safe.y && a.x + a.w <= safe.x + safe.w && a.y + a.h <= safe.y + safe.h;

export function place(wants: Want[], safe: Box, taken: Box[] = []): Placed[] {
  const out: Placed[] = [];
  const used = [...taken];
  const order = [...wants].sort((a, b) => (b.prio ?? 0) - (a.prio ?? 0));
  for (const w of order) {
    const g = 18;
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
      const box = { x: Math.min(safe.x + safe.w - w.w, Math.max(safe.x, w.x - w.w / 2)), y: Math.min(safe.y + safe.h - w.h, Math.max(safe.y, w.y - w.h / 2)), w: w.w, h: w.h };
      done = { id: w.id, box, anchor: [w.x, w.y], leader: true, side: "l" };
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
