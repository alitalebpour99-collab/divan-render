// The narrator's lines for one Reel (made by the site, lib/social/voice.ts). Where each line
// goes is the composition's own work (src/voice.ts): every line belongs to a moment of the
// layout, and the picture waits on that moment while the line is said.
import fs from "node:fs";
import path from "node:path";

/**
 * Writes the lines beside the score in the bundle's public folder, named after the Reel,
 * and returns them as the composition takes them in: file, moment (cue), length in frames.
 */
export function voiceFiles(lines, publicDir, name, fps = 30) {
  if (!Array.isArray(lines) || !lines.length) return [];
  return lines.map((line, i) => {
    const file = `voice-${name}-${i}.mp3`;
    fs.writeFileSync(path.join(publicDir, file), Buffer.from(line.b64, "base64"));
    return { file, cue: line.cue ?? line.where, frames: Math.ceil(line.seconds * fps) };
  });
}

/** The stretches, in seconds, under which the score steps back (music.mjs): where the composition placed each line. */
export const duckOf = (composition) => (composition.props?.voice ?? []).map((v) => [v.from / composition.fps, (v.from + v.frames) / composition.fps]);

/** The narrator's files of one Reel, taken away after its render. */
export function dropVoice(publicDir, name) {
  for (const f of fs.readdirSync(publicDir).filter((x) => x.startsWith(`voice-${name}-`))) fs.rmSync(path.join(publicDir, f), { force: true });
}
