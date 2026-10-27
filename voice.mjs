// The narrator's lines on a Reel's own timeline (the lines are made by the site, lib/social/voice.ts).
import fs from "node:fs";
import path from "node:path";

/**
 * The question from the first moment, the line to follow the page so that it
 * ends just before the Reel does, and the finding at about two fifths, moved
 * earlier when it would run into the last line. Lines never overlap. On a Reel
 * too short for all three the finding stays and the last line goes; a line that
 * fits nowhere is left out.
 * The files go beside the score in the bundle's public folder, named after the Reel.
 * Returns each line's file, the frame it starts on and its length in seconds, in order.
 */
export function placeVoice(lines, publicDir, name, total, fps) {
  if (!Array.isArray(lines) || !lines.length) return [];
  const gap = Math.round(0.35 * fps);
  const len = (l) => Math.ceil(l.seconds * fps);
  const first = lines.find((l) => l.where === "start");
  const middle = lines.find((l) => l.where === "middle");
  const last = lines.find((l) => l.where === "end");
  const at = new Map();
  let free = Math.round(0.15 * fps);
  if (first && free + len(first) <= total - Math.round(0.2 * fps)) {
    at.set(first, free);
    free += len(first) + gap;
  }
  let until = total - Math.round(0.2 * fps);
  if (last) {
    const from = total - len(last) - Math.round(0.6 * fps);
    if (from >= free) {
      at.set(last, from);
      until = from - gap;
    }
  }
  const fit = (end) => {
    const from = Math.max(free, Math.min(Math.round(total * 0.42), end - len(middle)));
    return from + len(middle) <= end ? from : null;
  };
  if (middle && fit(until) !== null) at.set(middle, fit(until));
  else if (middle && fit(total - Math.round(0.2 * fps)) !== null) {
    at.delete(last);
    at.set(middle, fit(total - Math.round(0.2 * fps)));
  }
  const out = [];
  lines.forEach((line, i) => {
    if (!at.has(line)) return;
    const file = `voice-${name}-${i}.mp3`;
    fs.writeFileSync(path.join(publicDir, file), Buffer.from(line.b64, "base64"));
    out.push({ file, from: at.get(line), seconds: line.seconds });
  });
  return out.sort((a, b) => a.from - b.from);
}

/** The stretches, in seconds, under which the score steps back (music.mjs). */
export const duckOf = (placed, fps) => placed.map((v) => [v.from / fps, v.from / fps + v.seconds]);

/** The narrator's files of one Reel, taken away after its render. */
export function dropVoice(publicDir, name) {
  for (const f of fs.readdirSync(publicDir).filter((x) => x.startsWith(`voice-${name}-`))) fs.rmSync(path.join(publicDir, f), { force: true });
}
