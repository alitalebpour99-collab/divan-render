// Round 8's blink rule, pure (no renderer): the storyboard Reels' check (mapcheck-lib.mjs) and the loop's (mapcheck-loop.mjs) share it.
/** round 8 (owner, 22 Nov 2026: «یهو ناپدید و دوباره تولید میشن»): a word or thing gone for this many frames or fewer, then back, is a blink */
export const BLINK_FRAMES = 30;

/** the blinks of a Reel: present on frame a, absent on 1 to BLINK_FRAMES frames, present again (the loop's last frames excepted) */
export function blinks(frames, upTo) {
  const out = [];
  const last = new Map();
  frames.forEach((set, f) => {
    if (f >= upTo) return;
    for (const k of set) {
      const l = last.get(k);
      if (l !== undefined && f - l > 1 && f - l - 1 <= BLINK_FRAMES) out.push({ k, from: l + 1, to: f - 1, n: f - l - 1 });
      last.set(k, f);
    }
  });
  return out;
}

