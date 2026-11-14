// The last step of every Reel, for the worker and the hand render alike.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";

/**
 * The last step of a Reel, as Iforia does it: one loudness for every video
 * (−14 LUFS, true peak at or below −1 dBTP, what short-video apps play at; level() below), then a check
 * that the file is as long as its composition and has sound. Needs ffmpeg on
 * the machine (the workflows install it); without it the video is handed back
 * as rendered. A check that fails throws, so the render counts as failed and is
 * tried again.
 */
export function finish(file, seconds) {
  const has = (bin) => {
    try {
      execFileSync(bin, ["-version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  if (!has("ffmpeg") || !has("ffprobe")) return "not levelled (no ffmpeg)";
  level(file);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", file]).toString());
  const length = Number(probe.format?.duration ?? 0);
  const audio = (probe.streams ?? []).some((s) => s.codec_type === "audio");
  if (!audio) throw new Error("check: the video has no sound");
  if (Math.abs(length - seconds) > 1.2) throw new Error(`check: the video is ${length.toFixed(1)} s long, its composition ${seconds.toFixed(1)} s`);
  if (fs.statSync(file).size < 200_000) throw new Error("check: the video file is too small");
  const loud = loudness(file);
  return `levelled to ${loud.lufs.toFixed(1)} LUFS (true peak ${loud.tp.toFixed(1)} dBTP), ${length.toFixed(1)} s with sound`;
}


/** The loudness every Reel is made to: −14 LUFS integrated, the true peak at −1 dBTP or lower, measured on the encoded file. */
export const TARGET = { lufs: -14, tolerance: 1, tp: -1 };

/** Integrated loudness and true peak of a file's sound, as ffmpeg's ebur128 measures them. */
export function loudness(file) {
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stderr ?? "";
  const summary = log.slice(log.lastIndexOf("Summary:"));
  const lufs = Number(/I:\s+(-?[\d.]+|-inf)\s+LUFS/.exec(summary)?.[1] ?? NaN);
  const tp = Number(/True peak:\s+Peak:\s+(-?[\d.]+|-inf)\s+dBFS/.exec(summary)?.[1] ?? NaN);
  return { lufs, tp };
}

/**
 * The sound levelled in two passes (a measured loudnorm, linear where it can
 * be; the single pass used before landed between −14.3 and −13.9 and never
 * looked at the true peak), then measured on the encoded AAC: when the encoder
 * lifted the true peak over −1 dBTP, it is done once more a little lower.
 */
export function level(file) {
  const tmp = file.replace(/\.mp4$/, ".level.mp4");
  const pass = (tp) => {
    const first = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `loudnorm=I=${TARGET.lufs}:TP=${tp}:LRA=11:print_format=json`, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stderr ?? "";
    let m = null;
    try {
      m = JSON.parse(first.slice(first.lastIndexOf("{"), first.lastIndexOf("}") + 1));
    } catch {
      m = null;
    }
    const af = m && Number.isFinite(Number(m.input_i)) ? `loudnorm=I=${TARGET.lufs}:TP=${tp}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : `loudnorm=I=${TARGET.lufs}:TP=${tp}:LRA=11`;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", tmp], { stdio: "inherit" });
  };
  pass(-1.5);
  if (loudness(tmp).tp > TARGET.tp) pass(-2.6);
  fs.renameSync(tmp, file);
}
