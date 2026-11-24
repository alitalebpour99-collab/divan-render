// The score of a Reel, synthesized: a slow chord progression in a minor key,
// one soft key on every beat, and a soft hall around both. No sample, no licence,
// no download; the bar is stretched so the video is a whole number of bars, and
// the last bar comes home and rests.
//   score({ id, seconds }) -> Buffer (WAV, 44.1 kHz stereo 16-bit), as long as the video; id is the format
//
// Since 29 October 2026 a Reel's score is a track of Divan's music library when
// the site hands one in (score({ …, track: file })): beds made once with
// ElevenLabs Music in the one style the owner chose («اولی»: a steady pulse of
// muted synth and low strings under a data documentary, no melody), kept on
// the site and not in this public repository. The synthesized score stays for
// a Reel without one.
import { execFileSync } from "node:child_process";

const RATE = 44100;
const TAU = Math.PI * 2;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// One key and one pace per format, so that two Reels in a row do not sound the same.
// root: MIDI note of the key
const MOODS = {
  dilemma: { root: 45, bpm: 60 },
  seat: { root: 47, bpm: 58 },
  region: { root: 48, bpm: 66 },
  precedent: { root: 41, bpm: 52 },
  talks: { root: 46, bpm: 60 },
  war: { root: 45, bpm: 63 },
  borders: { root: 43, bpm: 54 },
  arsenal: { root: 40, bpm: 64 },
  // «ایران در برابر …»: low and steady under the counts, a beat a kind
  versus: { root: 39, bpm: 70, pulse: true },
  dollar: { root: 44, bpm: 62 },
  nuclear: { root: 42, bpm: 56 },
  figure: { root: 49, bpm: 64 },
  quiz: { root: 50, bpm: 72 },
  // a steady low beat under the chords: the one Reel that is meant to stir
  power: { root: 38, bpm: 84, pulse: true },
  // the two short formats of 23 October 2026 move faster, with the beat under them
  thennow: { root: 43, bpm: 92, pulse: true },
  race: { root: 41, bpm: 100, pulse: true },
  // «دههٔ تو»: a little slower, for looking back
  decade: { root: 44, bpm: 86, pulse: true },
  // the countdown of five figures: a quick pulse under the flipping board
  five: { root: 46, bpm: 96, pulse: true },
  truefalse: { root: 47, bpm: 104, pulse: true },
  // the content system's templates (src/Templates.tsx) take the score of the series they show
  t1: { root: 38, bpm: 84, pulse: true },
  t2: { root: 44, bpm: 62 },
  t5: { root: 50, bpm: 72 },
  t6: { root: 43, bpm: 92, pulse: true },
  // «یک دور»: the dollar's key, the drone's heartbeat a beat a second (a turn of 10 s is ten beats)
  loop: { root: 44, bpm: 60 },
};
// i  VI  III  VII, as open voicings above the key note: root, fifth, tenth
const CHORDS = [
  [0, 7, 15],
  [-4, 3, 12],
  [3, 10, 19],
  [-2, 5, 14],
];

// A soft key: two sines a hair apart, two quiet partials that die fast, and an attack slow enough that nothing knocks.
function key(L, R, at, midi, gain, pan) {
  const f = hz(midi);
  const start = Math.max(0, Math.round(at * RATE));
  const length = Math.min(L.length - start, Math.round(5.5 * RATE));
  const left = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const right = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let n = 0; n < length; n += 1) {
    const t = n / RATE;
    const attack = t < 0.03 ? 0.5 - 0.5 * Math.cos((Math.PI * t) / 0.03) : 1;
    const body = Math.exp(-t / 1.15);
    const sample = attack * (body * (0.62 * Math.sin(TAU * f * t) + 0.38 * Math.sin(TAU * f * 1.0028 * t)) + 0.06 * Math.exp(-t / 0.45) * Math.sin(TAU * 2 * f * t) + 0.015 * Math.exp(-t / 0.22) * Math.sin(TAU * 3 * f * t));
    L[start + n] += left * sample;
    R[start + n] += right * sample;
  }
}

function comb(input, delay, feedback, damp) {
  const out = new Float32Array(input.length);
  const line = new Float32Array(delay);
  let index = 0;
  let store = 0;
  for (let n = 0; n < input.length; n += 1) {
    const delayed = line[index];
    store = delayed * (1 - damp) + store * damp;
    line[index] = input[n] + store * feedback;
    out[n] = delayed;
    index = index + 1 === delay ? 0 : index + 1;
  }
  return out;
}

function allpass(input, delay) {
  const out = new Float32Array(input.length);
  const line = new Float32Array(delay);
  let index = 0;
  for (let n = 0; n < input.length; n += 1) {
    const delayed = line[index];
    out[n] = delayed - input[n];
    line[index] = input[n] + delayed * 0.5;
    index = index + 1 === delay ? 0 : index + 1;
  }
  return out;
}

// A soft hall (Freeverb's tunings), so the notes ring into each other.
function room(channel, spread) {
  const wet = new Float32Array(channel.length);
  for (const delay of [1116, 1277, 1422, 1557]) {
    const voice = comb(channel, delay + spread, 0.85, 0.5);
    for (let n = 0; n < wet.length; n += 1) wet[n] += voice[n] * 0.25;
  }
  return allpass(allpass(wet, 556 + spread), 441 + spread);
}

/** The level a track is brought to before it steps back under the narrator (RMS, dB): about the synthesized score's own, -17 to -20. */
const TRACK_RMS = -20;
/** When a Reel is longer than its track, the track starts again under this many seconds of crossfade. */
const LOOP = 1.5;

/** How loud the score is at a moment: in over 0.7 s, out over the last 2.6 s, and down to a third under a narrator's line, with a fifth of a second either side. */
function level(t, seconds, duck, deep = false) {
  const under = duck.reduce((m, [a, b]) => Math.max(m, Math.min(smooth((t - a + 0.2) / 0.2), smooth((b + 0.25 - t) / 0.25))), 0);
  return smooth(t / (deep ? 0.08 : 0.7)) * smooth((seconds - t) / (deep ? 0.25 : 2.6)) * (1 - (deep ? DUCK.deep : DUCK.classic) * under);
}

/** Two channels as a WAV file, each sample times gain. */
function wav(L, R, gain) {
  const total = L.length;
  const data = Buffer.alloc(total * 4);
  for (let n = 0; n < total; n += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n] * gain)) * 32767), n * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n] * gain)) * 32767), n * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/** A Reel's score from a track of the library: from its beginning, looped with a crossfade when the Reel runs longer, at the synthesized score's level, in, out and under the narrator as that score is. */
function fromTrack(file, seconds, duck, deep = false) {
  const pcm = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-ac", "2", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const all = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  const frames = Math.floor(all.length / 2);
  if (frames < RATE * 4) throw new Error("the track is too short");
  const total = Math.ceil(seconds * RATE);
  const cross = Math.round(LOOP * RATE);
  const span = frames - cross;
  const L = new Float32Array(total);
  const R = new Float32Array(total);
  let sum = 0;
  for (let n = 0; n < total; n += 1) {
    const k = n % span;
    let l = all[k * 2];
    let r = all[k * 2 + 1];
    if (n >= span && k < cross) {
      // the track's own tail fades out under its beginning
      const u = smooth(k / cross);
      l = u * l + (1 - u) * all[(span + k) * 2];
      r = u * r + (1 - u) * all[(span + k) * 2 + 1];
    }
    L[n] = l;
    R[n] = r;
    sum += l * l + r * r;
  }
  const rms = 10 * Math.log10(sum / (2 * total) + 1e-12);
  let peak = 0;
  for (let n = 0; n < total; n += 1) {
    const v = level(n / RATE, seconds, duck, deep);
    L[n] *= v;
    R[n] *= v;
    peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
  }
  const gain = Math.min(10 ** ((TRACK_RMS - rms) / 20), peak ? 0.9 / peak : 1);
  return wav(L, R, gain);
}

/**
 * How far the bed steps down under the narrator: to 32 % (about −10 dB) in the
 * classic look; to 14 % (about −17 dB, as Pickwise's and Bidar's set style) in
 * the set style, where the bed comes back up between the lines.
 */
export const DUCK = { classic: 0.68, deep: 0.86 };

/**
 * The set style's bed (src/set/), made here like the synthesized score: a dark,
 * minimal drone with a heartbeat sub pulse, as the owner wants a news page to
 * sound (2026-10-28/29 on Manshur: dark minimal drones and a sub pulse kept;
 * piano, santur, busy strings and glitchy beds turned down). A low root with
 * its octave and a quiet fifth swelling and fading every eight seconds, a
 * double thump every second (50 falling to 38 Hz), a breath of filtered noise
 * on top. No melody, no beat to dance to, nothing that is not made in this file.
 * It does not fade out at the end: the Reel loops, so it comes back on itself.
 */
export function drone({ id, seconds, duck = [], raw = false }) {
  const { root } = MOODS[id] ?? MOODS.dilemma;
  const f = hz(root - 12);
  const total = Math.ceil(seconds * RATE);
  const L = new Float32Array(total);
  const R = new Float32Array(total);
  let seed = 3;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  let lowL = 0;
  let lowR = 0;
  for (let n = 0; n < total; n += 1) {
    const t = n / RATE;
    const breathe = 0.82 + 0.18 * Math.sin(TAU * 0.07 * t);
    const drone = 0.16 * breathe * (Math.sin(TAU * f * t) + 0.42 * Math.sin(TAU * 2 * f * t + 0.4) + 0.1 * Math.sin(TAU * 3 * f * t + 1.1));
    const swell = 0.5 - 0.5 * Math.cos(TAU * (t / 8));
    const fifth = 0.035 * swell * Math.sin(TAU * f * 3 * t * 1.0008);
    // a breath of air: white noise through two slow one-pole filters, a little apart in each ear
    lowL += 0.012 * (noise() - lowL);
    lowR += 0.012 * (noise() - lowR);
    const air = 0.05 * (0.6 + 0.4 * Math.sin(TAU * 0.11 * t + 1));
    L[n] = drone + fifth + air * lowL;
    R[n] = drone * 0.98 + fifth * 1.02 + air * lowR;
  }
  // the heartbeat: two soft thumps a second, the second lighter
  for (let beat = 0; beat < seconds; beat += 1) {
    for (const [off, gain] of [
      [0, 0.34],
      [0.24, 0.2],
    ]) {
      const start = Math.round((beat + off) * RATE);
      const length = Math.min(total - start, Math.round(0.45 * RATE));
      let phase = 0;
      for (let k = 0; k < length; k += 1) {
        const tt = k / RATE;
        const fr = 38 + 12 * Math.exp(-tt / 0.06);
        phase += (TAU * fr) / RATE;
        const v = gain * Math.exp(-tt / 0.16) * Math.sin(phase) * (tt < 0.006 ? tt / 0.006 : 1);
        L[start + k] += v;
        R[start + k] += v;
      }
    }
  }
  // raw: the bare drone with no fade at either end, for loopBed to fold into a seamless turn
  if (raw) return { L, R };
  let peak = 0;
  for (let n = 0; n < total; n += 1) {
    const t = n / RATE;
    const under = duck.reduce((m, [a, b]) => Math.max(m, Math.min(smooth((t - a + 0.25) / 0.25), smooth((b + 0.35 - t) / 0.35))), 0);
    const v = smooth(t / 0.08) * smooth((seconds - t) / 0.25) * (1 - DUCK.deep * under);
    L[n] *= v;
    R[n] *= v;
    peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
  }
  return wav(L, R, peak ? 0.6 / peak : 1);
}

/** The tail of a seamless loop's bed laid over its head (s): the wrap point then has no click and no step in level. */
export const SEAM_CROSS = 0.4;
/** Where a library track is entered for a loop (s): past any intro, inside the steady body of the minute. */
const LOOP_ENTRY = 4;

/**
 * Folds a bed of `total + cross` samples into a seamless turn of `total`: the last `cross` samples are laid
 * over the first with an equal-power crossfade (the head comes in as the tail goes out), so the turn's last
 * sample runs straight into the sample that followed it in the bed, which is now the turn's first. Pure.
 */
export function seamless(L, R, total, cross) {
  if (L.length < total + cross || R.length < total + cross) throw new Error("the bed is shorter than a turn and its crossfade");
  const oL = new Float32Array(total);
  const oR = new Float32Array(total);
  for (let n = 0; n < total; n += 1) {
    if (n < cross) {
      const u = n / cross;
      const a = Math.sin((Math.PI / 2) * u);
      const b = Math.cos((Math.PI / 2) * u);
      oL[n] = a * L[n] + b * L[total + n];
      oR[n] = a * R[n] + b * R[total + n];
    } else {
      oL[n] = L[n];
      oR[n] = R[n];
    }
  }
  return { L: oL, R: oR };
}

/** How far the entry into a bed may be moved to find a calm wrap point (s), and the window the seam check compares (s). */
const ENTRY_SEARCH = 2;
const SEAM_WINDOW = 0.05;

/**
 * Where to enter a bed so that the turn's wrap point falls in a calm place: the 50 ms before the wrap (the turn's
 * last) and the 50 ms after it (which become, under the crossfade, the turn's first) as alike in level as the bed
 * allows, and neither of them on a beat. Searched in 5 ms steps from `from` over ENTRY_SEARCH. Pure.
 */
export function calmEntry(L, R, from, total, rate = RATE) {
  const w = Math.round(SEAM_WINDOW * rate);
  const cross = Math.round(SEAM_CROSS * rate);
  const step = Math.round(0.005 * rate);
  const db = (x, n) => 10 * Math.log10(x / (2 * Math.max(1, n)) + 1e-12);
  let best = from;
  let score = Infinity;
  for (let e = from; e <= from + Math.round(ENTRY_SEARCH * rate) && e + total + cross < L.length; e += step) {
    // the turn's last 50 ms, and its first 50 ms as seamless() will make them
    let x = 0;
    for (let i = e + total - w; i < e + total; i += 1) x += L[i] * L[i] + R[i] * R[i];
    let y = 0;
    for (let n = 0; n < w; n += 1) {
      const u = n / cross;
      const a = Math.sin((Math.PI / 2) * u);
      const b = Math.cos((Math.PI / 2) * u);
      const l = a * L[e + n] + b * L[e + total + n];
      const q = a * R[e + n] + b * R[e + total + n];
      y += l * l + q * q;
    }
    const before = db(x, w);
    const after = db(y, w);
    // alike on both sides first; of two alike, the quieter (off the beat)
    const v = Math.abs(before - after) + 0.02 * Math.max(before, after);
    if (v < score) {
      score = v;
      best = e;
    }
  }
  return best;
}

/**
 * The bed of «یک دور» (the seamless loop, Loop.tsx): the Reel's library track (the site's own music, entered a
 * few seconds in), or the synthesized drone without it, folded into one seamless turn of `seconds` (seamless,
 * SEAM_CROSS). No fade at either end and no ducking: the loop has no narrator, and the seam must carry only
 * the bed. The level is the library's (TRACK_RMS), or the drone's own.
 */
export function loopBed({ id, seconds, track }) {
  const total = Math.round(seconds * RATE);
  const cross = Math.round(SEAM_CROSS * RATE);
  let L;
  let R;
  if (track) {
    const pcm = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", track, "-ac", "2", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
    const all = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
    const frames = Math.floor(all.length / 2);
    L = new Float32Array(frames);
    R = new Float32Array(frames);
    for (let n = 0; n < frames; n += 1) {
      L[n] = all[n * 2];
      R[n] = all[n * 2 + 1];
    }
  } else {
    ({ L, R } = drone({ id, seconds: LOOP_ENTRY + ENTRY_SEARCH + seconds + SEAM_CROSS + 0.2, raw: true }));
  }
  const min = L.length >= Math.round((LOOP_ENTRY + ENTRY_SEARCH + seconds + SEAM_CROSS + 0.1) * RATE) ? Math.round(LOOP_ENTRY * RATE) : 0;
  if (L.length - min < total + cross) throw new Error("the bed is too short for a turn");
  const entry = calmEntry(L, R, min, total);
  const out = seamless(L.subarray(entry), R.subarray(entry), total, cross);
  let sum = 0;
  let peak = 0;
  for (let n = 0; n < total; n += 1) {
    sum += out.L[n] * out.L[n] + out.R[n] * out.R[n];
    peak = Math.max(peak, Math.abs(out.L[n]), Math.abs(out.R[n]));
  }
  const rms = 10 * Math.log10(sum / (2 * total) + 1e-12);
  const gain = track ? Math.min(10 ** ((TRACK_RMS - rms) / 20), peak ? 0.9 / peak : 1) : peak ? 0.6 / peak : 1;
  const bed = wav(out.L, out.R, gain);
  // v4 (24 Nov 2026): where the beats of this very turn fall, so the pin in Loop.tsx swells on them (beatOf)
  bed.beat = beatOf(out.L, out.R, total, RATE, seconds);
  return bed;
}

/**
 * The beats of a folded turn (v4 of «یک دور»): an onset curve (the rise of the level in 10 ms steps, the low end and
 * the tick both count), its tempo from the autocorrelation between 70 and 140 BPM, and the phase of a grid of
 * whole beats a turn (from the measured tempo, v5) folded over the turn: the place where the onsets pile up most.
 * Returns { beats (a turn), phase (frames after frame 0 of the first beat, 0…period), period (frames), bpm (measured), strength (the
 * fold's peak against its mean: 1 = no beat found) }. Pure; tests/seam.test.mjs checks it on a made-up pulse.
 */
export function beatOf(L, R, total, rate, seconds, fps = 30, beatsGiven = null) {
  const hop = Math.round(rate / 100);
  const n = Math.floor(total / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    for (let k = i * hop; k < (i + 1) * hop; k += 1) s += L[k] * L[k] + R[k] * R[k];
    env[i] = Math.sqrt(s / (2 * hop));
  }
  // the onset curve: only rises count, read round the turn (the turn is a circle)
  const on = new Float32Array(n);
  for (let i = 0; i < n; i += 1) on[i] = Math.max(0, env[i] - env[(i - 1 + n) % n]);
  // the tempo: the lag (10 ms steps) with the strongest circular autocorrelation between 70 and 140 BPM
  let bestLag = 0;
  let best = -Infinity;
  for (let lag = Math.round(6000 / 140); lag <= Math.round(6000 / 70); lag += 1) {
    let s = 0;
    for (let i = 0; i < n; i += 1) s += on[i] * on[(i + lag) % n];
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  // v5: as many whole beats a turn as the measured tempo gives (17 for 107 BPM over 9.6 s), so the grid stays on the
  // track's beats across the whole turn and still meets itself at the seam
  const beatsPerTurn = beatsGiven ?? Math.max(1, Math.round((seconds * 100) / bestLag));
  // the phase of the turn's own grid
  const periodS = seconds / beatsPerTurn;
  const bins = 60;
  const fold = new Float64Array(bins);
  for (let i = 0; i < n; i += 1) fold[Math.floor((((i * 0.01) % periodS) / periodS) * bins) % bins] += on[i];
  // a little smoothing (three bins) so one stray onset does not win
  const sm = Array.from(fold, (_, b) => fold[(b - 1 + bins) % bins] + 2 * fold[b] + fold[(b + 1) % bins]);
  let top = 0;
  for (let b = 1; b < bins; b += 1) if (sm[b] > sm[top]) top = b;
  const mean = sm.reduce((a, x) => a + x, 0) / bins || 1;
  return { beats: beatsPerTurn, phase: +(((top + 0.5) / bins) * periodS * fps).toFixed(2), period: +(periodS * fps).toFixed(2), bpm: +(6000 / bestLag).toFixed(1), strength: +(sm[top] / mean).toFixed(2) };
}

/**
 * A Reel's score. `loop`: the seamless loop's bed (loopBed). `set`: the set style's bed: the drone above, or (with
 * DIVAN_SET_MUSIC=library) the site's library track, ducked deeper.
 */
export function score({ id, seconds, duck = [], track, set = false, loop = false }) {
  if (loop) return loopBed({ id, seconds, track });
  if (set && (!track || process.env.DIVAN_SET_MUSIC !== "library")) return drone({ id, seconds, duck });
  if (track) return fromTrack(track, seconds, duck, set);
  const { root, bpm, pulse } = MOODS[id] ?? MOODS.dilemma;
  const total = Math.ceil(seconds * RATE);
  const L = new Float32Array(total);
  const R = new Float32Array(total);
  const bars = Math.max(2, Math.round(seconds / ((60 / bpm) * 4)));
  const bar = seconds / bars;
  const beat = bar / 4;
  const chordOf = (b) => (b === bars - 1 ? CHORDS[0] : CHORDS[b % 4]);

  // the chords, held and crossfaded: each comes in under the one before it
  const cross = 0.9;
  for (let b = 0; b < bars; b += 1) {
    const chord = chordOf(b);
    const from = b * bar;
    const to = (b + 1) * bar;
    const first = Math.max(0, Math.floor((from - cross) * RATE));
    const last = Math.min(total, Math.ceil((to + cross) * RATE));
    const envelope = (t) => smooth((t - (from - cross)) / (2 * cross)) * smooth((to + cross - t) / (2 * cross));
    chord.forEach((offset, k) => {
      const f = hz(root + 12 + offset);
      const detune = 1.0014 + k * 0.0004;
      for (let n = first; n < last; n += 1) {
        const t = n / RATE;
        const amount = envelope(t) * 0.05;
        L[n] += amount * (Math.sin(TAU * f * t) + 0.07 * Math.sin(TAU * 2 * f * t));
        R[n] += amount * (Math.sin(TAU * f * detune * t + 1.3) + 0.07 * Math.sin(TAU * 2 * f * detune * t));
      }
    });
    const low = hz(root + chord[0]);
    for (let n = first; n < last; n += 1) {
      const t = n / RATE;
      const sample = envelope(t) * 0.07 * (Math.sin(TAU * low * t) + 0.35 * Math.sin(TAU * 2 * low * t));
      L[n] += sample;
      R[n] += sample;
    }
  }

  // one soft key on every beat: root, fifth, tenth, fifth of the chord; the last bar rests on its first note
  const order = [0, 1, 2, 1];
  for (let b = 0; b < bars; b += 1) {
    const chord = chordOf(b);
    for (let q = 0; q < 4; q += 1) {
      if (b === bars - 1 && q > 0) break;
      const step = order[q];
      key(L, R, b * bar + q * beat, root + 24 + chord[step] - (step === 2 ? 12 : 0), q === 0 ? 0.1 : 0.075, q % 2 ? 0.28 : -0.28);
    }
  }

  // a deep, soft drum on every beat, louder on the first of the bar, rising through the Reel; none in the last bar
  if (pulse) {
    for (let b = 0; b < bars - 1; b += 1) {
      for (let q = 0; q < 4; q += 1) {
        const at = b * bar + q * beat;
        const start = Math.round(at * RATE);
        const length = Math.min(total - start, Math.round(0.6 * RATE));
        const gain = (q === 0 ? 0.32 : 0.18) * (0.55 + 0.45 * (b / Math.max(1, bars - 2)));
        let phase = 0;
        for (let n = 0; n < length; n += 1) {
          const t = n / RATE;
          // the pitch falls from 70 to 42 Hz: a boom, not a click
          const f = 42 + 28 * Math.exp(-t / 0.05);
          phase += (TAU * f) / RATE;
          const sample = gain * Math.exp(-t / 0.22) * Math.sin(phase) * (t < 0.004 ? t / 0.004 : 1);
          L[start + n] += sample;
          R[start + n] += sample;
        }
      }
    }
  }

  const wetL = room(L, 0);
  const wetR = room(R, 23);
  let peak = 0;
  for (let n = 0; n < total; n += 1) {
    const t = n / RATE;
    const v = level(t, seconds, duck);
    L[n] = (L[n] + 0.26 * wetL[n]) * v;
    R[n] = (R[n] + 0.26 * wetR[n]) * v;
    peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
  }
  return wav(L, R, peak ? 0.56 / peak : 1);
}
