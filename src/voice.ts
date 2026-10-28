// The narrator on a Reel's own timeline (the lines are made by the site, lib/social/voice.ts).
//
// Each line belongs to a moment of the Reel, its cue: «start» is the Reel's
// question, «end» the line to follow the page, and every format names its own
// moments in between («then», «now», «rank», «reveal» …, see cues() in each
// layout, each the first frame of a scene). A line starts on its moment. When
// a line is still being said as the next moment comes, the picture waits until
// the voice has finished (a hold, kit.tsx), a little before the scene changes,
// while the scene before is still whole, so voice and picture stay together;
// the owner heard them drift apart on 27 October 2026. A Reel without a voice
// is laid out exactly as before.
/** A hold: at this frame of a layout the picture waits, on the frame before, for `len` frames (kit.tsx draws it). */
export type Hold = { at: number; len: number };

/** A line as the renderer hands it in: its file in the public folder, its moment and its length in frames. */
export type VoiceIn = { file: string; cue: string; frames: number };
/** A line placed: the frame of the film it starts on. */
export type VoiceOut = { file: string; from: number; frames: number };
/**
 * The moments of a layout, in frames of the layout itself (before any hold).
 * A name that starts with «_» is only where a scene begins: no line is said
 * there, but a line is never carried into it; the scene before waits.
 */
export type Cues = Record<string, number>;
/** Every scene of a plan after the first, as a place no line runs past (`plan(p).at` in a layout). */
export const scenes = (at: number[]): Cues => Object.fromEntries(at.slice(1).map((a, i) => [`_${i + 1}`, a]));

const GAP = 8;
const LEAD = 4;
/** a scene begins to leave up to half a second before the next one comes (kit.tsx, leave): the picture waits before that */
const SETTLE = 18;
/** how far before the layout's end the line to follow the page comes in: the last scene stands whole there */
const END_CUE = 30;
/** the last word is said this long before the film ends */
const TAIL = 12;
/**
 * A line may begin this much before its moment when the voice is free: a
 * narrator starts the sentence as the picture comes, and the figure, said a
 * second into it, lands with the picture. Waiting for the picture left the
 * voice silent in mid-thought (Reel 77, owner 2026-10-28: «خوب نمی‌خونه»).
 */
const EARLY = 24;

const sumHolds = (holds: Hold[]) => holds.reduce((s, h) => s + h.len, 0);
/** a frame of the layout as a frame of the film, once the holds before it are counted */
const realOf = (body: number, holds: Hold[]) => body + holds.filter((h) => h.at <= body).reduce((s, h) => s + h.len, 0);

function hold(holds: Hold[], at: number, len: number) {
  if (len <= 0) return;
  const same = holds.find((h) => h.at === at);
  if (same) same.len += len;
  else holds.push({ at, len });
  holds.sort((a, b) => a.at - b.at);
}

/**
 * Where every line goes, how long the hook stays (a Reel's question may take
 * longer to say than the hook's own 2.4 seconds), which holds the layout needs,
 * and how long the film then runs.
 */
export function layVoice(lines: VoiceIn[] | undefined, cues: Cues, body: number, hooked: boolean, hookBase: number, overlap: number) {
  const holds: Hold[] = [];
  const voice: VoiceOut[] = [];
  const known = (lines ?? []).filter((l) => l.frames > 0 && (l.cue === "start" || l.cue === "end" || l.cue in cues));
  let hookLen = hookBase;
  let free = 0;
  const start = known.find((l) => l.cue === "start");
  if (start && hooked) {
    // the question is said over the hook, which stays until it has been said
    hookLen = Math.max(hookBase, LEAD + start.frames + overlap);
    voice.push({ file: start.file, from: LEAD, frames: start.frames });
    free = LEAD + start.frames + GAP;
  }
  const offset = hooked ? hookLen - overlap : 0;
  const cueOf = (l: VoiceIn) => (l.cue === "start" ? (cues.start ?? 2) : l.cue === "end" ? Math.max(0, body - END_CUE) : cues[l.cue]);
  const rest = known.filter((l) => !(l === start && hooked)).sort((a, b) => cueOf(a) - cueOf(b));
  // the scenes' beginnings go in among the lines: the picture waits before one while a line is still being said
  const bounds = Object.entries(cues)
    .filter(([k]) => k.startsWith("_"))
    .map(([, at]) => at);
  const events = [...rest.map((l) => ({ at: cueOf(l), line: l as VoiceIn | null })), ...bounds.map((at) => ({ at, line: null as VoiceIn | null }))].sort((a, b) => a.at - b.at || (a.line ? 1 : -1));
  for (const { at, line } of events) {
    let from = offset + realOf(at, holds);
    if (from < free) {
      hold(holds, Math.max(0, at - SETTLE), free - from);
      from = free;
    }
    if (!line) continue;
    if (line.cue !== "start" && from > free) from = Math.max(free, from - EARLY);
    voice.push({ file: line.file, from, frames: line.frames });
    free = from + line.frames + GAP;
  }
  // the film runs until the last word has been said
  const said = voice.length ? Math.max(...voice.map((v) => v.from + v.frames)) : 0;
  const plain = offset + body + sumHolds(holds);
  if (said + TAIL > plain) hold(holds, Math.max(0, body - END_CUE), said + TAIL - plain);
  return { voice, holds, hookLen, total: offset + body + sumHolds(holds) };
}
