// The narrator's lines for one Reel (made by the site, lib/social/voice.ts). Where each line
// goes is the composition's own work (src/voice.ts): every line belongs to a moment of the
// layout, and the picture waits on that moment while the line is said.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** A little air kept around each line when it is cut out of the take, in seconds: before its first sound, after its last. */
const BEFORE = 0.05;
const AFTER = 0.12;
/** The take's loudness is measured in steps of this many seconds. */
const STEP = 0.01;
/** Below the take's loudest step, in dB, nothing is heard. */
const SILENT = -55;
/**
 * The shortest silence that is a pause between two lines, in seconds. A stop
 * inside a word is shorter: the closing «د» of «بود» is silent for about 50 ms
 * before it is let go, and that release still belongs to the word.
 */
const PAUSE = 0.12;

/** The take's loudness in steps of 10 ms, in dB below its loudest step; null for a take with no voice in it (the samples' silent ones). */
function loudness(file) {
  const RATE = 16000;
  const n = RATE * STEP;
  const pcm = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const f = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  const db = [];
  for (let i = 0; i + n <= f.length; i += n) {
    let s = 0;
    for (let j = i; j < i + n; j++) s += f[j] * f[j];
    db.push(10 * Math.log10(s / n + 1e-12));
  }
  const peak = db.reduce((a, b) => Math.max(a, b), -120);
  return peak < -60 ? null : db.map((d) => d - peak);
}

/**
 * Where each line is cut out of the take, in seconds. ElevenLabs' timings put a
 * line's first letter about a tenth of a second after its voice begins, and the
 * pause before it inside the line before; cut there, a line ended on the first
 * sound of the next one, and the next began without it: the owner heard «یه حرف
 * اضافه» between the lines (29 October 2026). So the cut is made in the take's
 * own silence: in the pause between two lines (the longest silence of PAUSE or
 * more where the timings put the change), the line before ends a little after
 * its last sound and the next begins a little before its first. Two lines
 * read without any pause are cut at the quietest step between them. A take
 * with no voice is cut at the timings.
 */
export function cutPoints(lines, db) {
  if (!db) return lines.map((l, i) => [Math.max(0, l.start - 0.04), Math.min(lines[i + 1] ? Math.max(l.end, lines[i + 1].start - 0.01) : l.end + 0.16, l.end + 0.16)]);
  const step = (t) => Math.min(db.length, Math.max(0, Math.round(t / STEP)));
  const heard = db.map((d) => d >= SILENT);
  const first = heard.indexOf(true);
  const last = heard.lastIndexOf(true);
  const cuts = lines.map((l) => [l.start, l.end]);
  cuts[0][0] = Math.max(0, Math.min(lines[0].start, first * STEP) - BEFORE);
  cuts[cuts.length - 1][1] = Math.min((last + 1) * STEP + AFTER, lines[lines.length - 1].end + 0.4);
  for (let i = 0; i + 1 < lines.length; i++) {
    const end = lines[i].end;
    const next = lines[i + 1].start;
    let best = null;
    for (let k = step(Math.max(lines[i].start + 0.1, end - 1)); k < step(Math.min(next + 0.35, lines[i + 1].end)); ) {
      if (heard[k]) {
        k++;
        continue;
      }
      let j = k;
      while (j < db.length && !heard[j]) j++;
      // silence from k to j
      if ((j - k) * STEP >= PAUSE && j * STEP > end - 0.5 && k * STEP < next + 0.1 && (!best || j - k > best.b - best.a)) best = { a: k, b: j };
      k = j;
    }
    if (best) {
      const from = best.a * STEP;
      const to = best.b * STEP;
      const mid = (from + to) / 2;
      cuts[i][1] = Math.min(from + AFTER, mid);
      cuts[i + 1][0] = Math.max(to - BEFORE, mid);
    } else {
      let q = step(end - 0.3);
      for (let s = q; s < step(next + 0.1); s++) if (db[s] < db[q]) q = s;
      cuts[i][1] = q * STEP;
      cuts[i + 1][0] = q * STEP;
    }
  }
  return cuts;
}

/**
 * Writes the lines beside the score in the bundle's public folder, named after the Reel,
 * and returns them as the composition takes them in: file, moment (cue), length in frames.
 *
 * Since 28 October 2026 the site sends one take of the whole script and where each line
 * lies in it ({ b64, lines: [{ cue, start, end }] }); each line is cut out of the take in
 * its pauses (cutPoints) with a few milliseconds of fade, so no click is heard. A line list
 * made line by line (each with its own b64, the first version) is still taken as it is.
 */
export function voiceFiles(voice, publicDir, name, fps = 30) {
  if (voice && !Array.isArray(voice) && voice.b64 && Array.isArray(voice.lines)) {
    const take = path.join(publicDir, `voice-${name}-take.mp3`);
    fs.writeFileSync(take, Buffer.from(voice.b64, "base64"));
    const cuts = voice.lines.length ? cutPoints(voice.lines, loudness(take)) : [];
    return voice.lines.map((line, i) => {
      const [from, to] = cuts[i];
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
