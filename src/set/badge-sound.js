// The badge's sound (owner, 2026-11-16: «وقتی گزینهٔ فالو و لایک میاد یه صدایی هم بده کاربر متوجه بشه»): Divan's
// flavour of the shared badge cue (../badge-cue.mjs, a Setavaz-owned SFX), a restrained muted-brass tick as the badge comes.
// Never over the narrator's words (the nearest pause within ±0.4 s, else left out); its peak LEVEL dB under the
// narrator's. Pure: the plans (plans.ts close) and the gate (gate.mjs) use it; sfx.mjs writes public/sfx/badge.wav.
// Its moment (owner, 2026-11-17: «بج رو ببر توی یه مکث»): the badge comes in a pause of the narration (closeMoment),
// so the tick on its first frame is heard on its own: a pause between two words of the close's line when there is one
// long enough, else a short breath between the last scene's sentence and the close's line (the line waits; no word is cut).
import { GUARD, LEVEL, RANGE, SHIFT, bodyOf, placeCue } from "../badge-cue.mjs";

export const BADGE_CUE = "badge";
export const FLAVOUR = "divan";
/** The peak of public/sfx/badge.wav: sfx.mjs sets every effect's peak to 0.89. */
export const CUE_FILE_PEAK_DB = 20 * Math.log10(0.89);
/** The narrator's peak (an ElevenLabs take peaks about here; the file is not read in the browser). */
export const VOICE_PEAK_DB = -1.5;
const FPS = 30;

/** The owner's shortest pause for the badge (s); the tick's own body with air on both sides counts when it is longer. */
export const MIN_PAUSE = 0.35;
/** The breath before the close's line when the close has no pause that long (s). */
export const BREATH = 0.4;
/** Frames of silence the badge's moment needs. */
export const needFrames = () => Math.ceil(Math.max(MIN_PAUSE, bodyOf(FLAVOUR) + 2 * GUARD) * FPS);
/** Frames after a word before the badge (and its tick) comes. */
const AIR = Math.ceil(GUARD * FPS);

/** What the narrator says, as [from, to] frames of the film: each placed line by its words when known, else whole. */
export function speechOf(voice, lines = []) {
  const out = [];
  for (const v of voice) {
    const words = lines.find((l) => l.file === v.file)?.words;
    if (words?.length) for (const w of words) out.push([v.from + w.from, v.from + w.from + w.frames]);
    else out.push([v.from, v.from + v.frames]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/**
 * The badge's first frame in the close, and where the close's line is said: { badge, lineAt, room }.
 * `at`: the badge's usual frame, where the line would start; `line`: the close's line ({ frames, words? }) or null;
 * `before`: the speech said before it ([from, to] frames); `hi(lineAt)`: the latest frame the badge may come
 * (it stays 1.5 s before the loop). First a pause between two of the line's words (the earliest), else a breath:
 * the line waits about 0.4 s, until the tick has been heard, the badge on its usual frame (or just after the last word).
 */
export function closeMoment({ at, line, before = [], hi = () => Infinity }) {
  if (!line || !line.frames) return { badge: at, lineAt: at, room: "no line" };
  const need = needFrames();
  const ws = [...(line.words ?? [])].sort((a, b) => a.from - b.from).map((w) => [at + w.from, at + w.from + w.frames]);
  for (let i = 0; i + 1 < ws.length; i++) {
    const [a, z] = [ws[i][1], ws[i + 1][0]];
    const t = Math.ceil(a) + AIR;
    if (z - a >= need && z - t >= need - AIR && t <= hi(at)) return { badge: t, lineAt: at, room: "pause" };
  }
  const last = before.reduce((m, [, z]) => Math.max(m, z), -Infinity);
  const badge = Math.max(at, Math.ceil(last) + AIR);
  // the line waits a breath: until the tick has been heard, and at least the pause the owner asked for after the last word
  const lineAt = Math.max(badge + Math.round(BREATH * FPS), badge + Math.ceil((bodyOf(FLAVOUR) + GUARD) * FPS), Math.ceil(last) + need);
  return { badge, lineAt, room: "breath" };
}

/** The badge's tick: { sfx, cue }. sfx is the effect to add (null when left out), cue what the gate reads. */
export function badgeCue(from, words = []) {
  const near = words.filter((w) => w.to >= from - 2 * FPS && w.from <= from + 2 * FPS).map((w) => [w.from, w.to]);
  const place = placeCue({ at: from / FPS, body: bodyOf(FLAVOUR), words: near.map(([a, z]) => [a / FPS, z / FPS]) });
  if (place.t === null) return { sfx: null, cue: { at: from, frame: null, why: place.why, speech: near } };
  const volume = Math.round(10 ** ((VOICE_PEAK_DB + LEVEL - CUE_FILE_PEAK_DB) / 20) * 1000) / 1000;
  const level = Math.round((CUE_FILE_PEAK_DB + 20 * Math.log10(volume) - VOICE_PEAK_DB) * 10) / 10;
  const frame = Math.round(place.t * FPS);
  return { sfx: { at: frame, name: BADGE_CUE, volume, why: "the badge's brass tick" }, cue: { at: from, frame, level, shift: place.shift, speech: near } };
}

/** The gate: the tick once near the badge, over no word, at its level; no badge, no tick. */
export function badgeCueCheck(plan) {
  const badge = plan.hud.find((h) => h.kind === "badge");
  const bells = plan.sfx.filter((s) => s.name === BADGE_CUE);
  if (!badge) return { ok: bells.length === 0, detail: bells.length ? "a tick without a badge" : "no badge, no tick" };
  const cue = badge.cue;
  if (!bells.length) return { ok: Boolean(cue && cue.frame === null), detail: cue?.why ? `the tick is left out: ${cue.why}` : "the badge has no tick" };
  const b = bells[0];
  const body = bodyOf(FLAVOUR) * FPS;
  const over = (cue?.speech ?? []).filter(([a, z]) => b.at + body > a && b.at < z);
  const level = cue?.level;
  const at = cue?.at ?? badge.from;
  const ok = bells.length === 1 && b.at === cue?.frame && Math.abs(b.at - at) <= SHIFT * FPS + 0.5 && !over.length && level >= RANGE[0] && level <= RANGE[1];
  return { ok, detail: `one brass tick at ${(b.at / FPS).toFixed(2)} s (${((b.at - at) / FPS).toFixed(2)} s from the badge's first frame), ${over.length ? "over the narrator" : "over no word"}, peak ${level} dB against the narrator's (${RANGE[0]} to ${RANGE[1]})` };
}
