// The narrator's lines for one Reel (made by the site, lib/social/voice.ts). Where each line
// goes is the composition's own work (src/voice.ts): every line belongs to a moment of the
// layout, and the picture waits on that moment while the line is said.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** A little air kept around each line when it is cut out of the take, in seconds. */
const BEFORE = 0.04;
const AFTER = 0.16;

/**
 * Writes the lines beside the score in the bundle's public folder, named after the Reel,
 * and returns them as the composition takes them in: file, moment (cue), length in frames.
 *
 * Since 28 October 2026 the site sends one take of the whole script and where each line
 * lies in it ({ b64, lines: [{ cue, start, end }] }); each line is cut out of the take
 * with a few milliseconds of fade, so no click is heard. A line list made line by line
 * (each with its own b64, the first version) is still taken as it is.
 */
export function voiceFiles(voice, publicDir, name, fps = 30) {
  if (voice && !Array.isArray(voice) && voice.b64 && Array.isArray(voice.lines)) {
    const take = path.join(publicDir, `voice-${name}-take.mp3`);
    fs.writeFileSync(take, Buffer.from(voice.b64, "base64"));
    return voice.lines.map((line, i) => {
      const next = voice.lines[i + 1];
      const from = Math.max(0, line.start - BEFORE);
      const to = Math.min(next ? Math.max(line.end, next.start - 0.01) : line.end + AFTER, line.end + AFTER);
      const seconds = Math.max(0.2, to - from);
      const file = `voice-${name}-${i}.mp3`;
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", from.toFixed(3), "-t", seconds.toFixed(3), "-i", take, "-af", `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, seconds - 0.06).toFixed(3)}:d=0.06`, "-c:a", "libmp3lame", "-b:a", "192k", path.join(publicDir, file)]);
      return { file, cue: line.cue, frames: Math.ceil(seconds * fps) };
    });
  }
  if (!Array.isArray(voice) || !voice.length) return [];
  return voice.map((line, i) => {
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
