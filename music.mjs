// The score of a Reel, synthesized: a slow chord progression in a minor key,
// one soft key on every beat, and a soft hall around both. No sample, no licence,
// no download; the bar is stretched so the video is a whole number of bars, and
// the last bar comes home and rests.
//   score({ id, seconds }) -> Buffer (WAV, 44.1 kHz stereo 16-bit), as long as the video; id is the format
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
  dollar: { root: 44, bpm: 62 },
  nuclear: { root: 42, bpm: 56 },
  figure: { root: 49, bpm: 64 },
  quiz: { root: 50, bpm: 72 },
  // a steady low beat under the chords: the one Reel that is meant to stir
  power: { root: 38, bpm: 84, pulse: true },
  // the two short formats of 23 October 2026 move faster, with the beat under them
  thennow: { root: 43, bpm: 92, pulse: true },
  race: { root: 41, bpm: 100, pulse: true },
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

export function score({ id, seconds, duck = [] }) {
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
    // under a narrator's line the score goes down to a third, with a fifth of a second either side
    const under = duck.reduce((m, [a, b]) => Math.max(m, Math.min(smooth((t - a + 0.2) / 0.2), smooth((b + 0.25 - t) / 0.25))), 0);
    const level = smooth(t / 0.7) * smooth((seconds - t) / 2.6) * (1 - 0.68 * under);
    L[n] = (L[n] + 0.26 * wetL[n]) * level;
    R[n] = (R[n] + 0.26 * wetR[n]) * level;
    peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
  }
  const gain = peak ? 0.56 / peak : 1;

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
