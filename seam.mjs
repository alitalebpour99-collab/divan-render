// The seam check of «یک دور» (the seamless loop, src/Loop.tsx): run on every
// rendered loop before it is handed back, so a loop whose end does not flow into
// its beginning never reaches the owner or the page (the seamless-loop round of
// 20 November 2026; the thresholds are the round's, as Pickwise measures them).
//
//   seam-video   SSIM of the first and the last frame, small and a little soft (gate.mjs likeness): 0.97 or more
//   seam-level   RMS of the last 50 ms against the first 50 ms of the sound: at most 3 dB apart
//   seam-click   the jump from the last sample to the first, against the sound's peak: at most 0.2 of it,
//                and no bigger than a few times the largest step between neighbouring samples near the seam
//
// The judging is pure (seamChecks, audioSeam) and tested with small made-up
// signals (tests/seam.test.mjs); measuring a file needs ffmpeg.
//   DIVAN_GATE=warn  report and go on      DIVAN_GATE=off  no check at all
import { spawnSync } from "node:child_process";
import { GateRefusal, likeness } from "./gate.mjs";

export const SEAM = { ssim: 0.97, levelDb: 3, click: 0.2, stepTimes: 4, windowS: 0.05, silenceDb: -60 };

const db = (x) => 20 * Math.log10(Math.max(1e-9, x));
const rmsOf = (a, from, to) => {
  let s = 0;
  for (let i = from; i < to; i += 1) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from));
};

/**
 * How the sound meets itself at the wrap point. `pcm`: one channel (Float32Array, −1…1), `rate` in Hz.
 * Returns { headDb, tailDb, jumpDb, click, step, silent }: the RMS of the first and last window, their
 * difference, the wrap jump as a share of the peak, and that jump against the largest neighbouring step
 * inside the two windows.
 */
export function audioSeam(pcm, rate, { windowS = SEAM.windowS } = {}) {
  const n = pcm.length;
  const w = Math.max(1, Math.min(Math.floor(n / 2), Math.round(windowS * rate)));
  const head = rmsOf(pcm, 0, w);
  const tail = rmsOf(pcm, n - w, n);
  let peak = 0;
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(pcm[i]));
  let largest = 0;
  for (let i = 1; i < w; i += 1) largest = Math.max(largest, Math.abs(pcm[i] - pcm[i - 1]));
  for (let i = n - w + 1; i < n; i += 1) largest = Math.max(largest, Math.abs(pcm[i] - pcm[i - 1]));
  const jump = Math.abs(pcm[0] - pcm[n - 1]);
  const headDb = db(head);
  const tailDb = db(tail);
  const silent = headDb < SEAM.silenceDb && tailDb < SEAM.silenceDb;
  return { headDb, tailDb, jumpDb: Math.abs(headDb - tailDb), click: peak ? jump / peak : 0, step: largest ? jump / largest : jump > 0 ? Infinity : 0, silent };
}

/** The verdict from what was measured: { ssim } and, when the loop has sound, { audio: audioSeam(…) }. Pure. */
export function seamChecks({ ssim, audio }) {
  const out = [];
  const add = (id, ok, detail, faText) => out.push({ id, ok: Boolean(ok), detail, fa: faText });
  add("seam-video", Number.isFinite(ssim) && ssim >= SEAM.ssim, `first and last frame SSIM ${Number(ssim).toFixed(3)} (${SEAM.ssim} or more)`, "فریم آخر حلقه به فریم اولش نمی‌خورد");
  if (!audio) {
    add("seam-sound", false, "no sound to measure", "صدای حلقه خوانده نشد");
    return out;
  }
  if (audio.silent) {
    add("seam-level", true, "silence on both sides of the seam", "");
    add("seam-click", true, "silence on both sides of the seam", "");
    return out;
  }
  add("seam-level", audio.jumpDb <= SEAM.levelDb, `last 50 ms ${audio.tailDb.toFixed(1)} dB, first 50 ms ${audio.headDb.toFixed(1)} dB: ${audio.jumpDb.toFixed(1)} dB apart (${SEAM.levelDb} or less)`, "بلندی صدا سر حلقه می‌پرد");
  const clickOk = audio.click <= SEAM.click && audio.step <= SEAM.stepTimes;
  add("seam-click", clickOk, `wrap jump ${(100 * audio.click).toFixed(1)} % of the peak (${100 * SEAM.click} % or less), ${Number.isFinite(audio.step) ? audio.step.toFixed(1) : "∞"}× the largest step beside it (${SEAM.stepTimes}× or less)`, "سر حلقه صدای تق دارد");
  return out;
}

/** How long the picture of a file runs (s), or null. */
export function pictureSeconds(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  const v = Number(String(r.stdout ?? "").trim());
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * The sound of a file as one channel at 48 kHz, or null when it has none; with `seconds`, only as long as the
 * picture: a player loops at the picture's end, and the AAC encoder pads its last block with silence past it.
 */
export function soundOf(file, rate = 48000, seconds = null) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, ...(seconds ? ["-t", seconds.toFixed(4)] : []), "-vn", "-ac", "1", "-ar", String(rate), "-f", "f32le", "-"], { maxBuffer: 512 * 1024 * 1024 });
  const buf = r.stdout ?? Buffer.alloc(0);
  if (!buf.length) return null;
  const copy = Buffer.from(buf);
  return new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4));
}

/** Measures a rendered loop. */
export function measureSeam(file) {
  const ssim = likeness(file, 0, "last");
  const pcm = soundOf(file, 48000, pictureSeconds(file));
  return { ssim, audio: pcm && pcm.length > 4800 ? audioSeam(pcm, 48000) : null };
}

/** The verdict in plain Persian, for the site's note and the panel's feed. */
export function seamVerdict(checks) {
  const failed = checks.filter((c) => !c.ok);
  return failed.length ? `بازبینی سر حلقه رد شد: ${failed.map((c) => c.fa).join("؛ ")}.` : "";
}

/** A refusal of the seam check: the site marks the loop failed at once and tells the panel's feed, not Telegram. */
export class SeamRefusal extends GateRefusal {}

/** Runs the seam check as the switch says; throws a SeamRefusal when it fails and the switch is on. */
export function enforceSeam({ file, mode = process.env.DIVAN_GATE || "on", log = console.log }) {
  if (mode === "off") return null;
  const checks = seamChecks(measureSeam(file));
  const result = { ok: checks.every((c) => c.ok), checks };
  for (const c of checks) log(`seam ${c.ok ? "pass" : "FAIL"} ${c.id}: ${c.detail}`);
  if (!result.ok && mode !== "warn") throw new SeamRefusal(seamVerdict(checks));
  return result;
}
