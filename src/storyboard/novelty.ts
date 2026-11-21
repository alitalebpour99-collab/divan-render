// The novelty rules (storyboard-fa.md §4, bible §7): code, not AI. The concept writer offers three ideas; this picks
// the one least like the last 30 videos that breaks none of the rules, or none (the writer is asked once more with
// the reasons; then the video is held as «تکراری», never posted in silence).
import type { Concept, Fingerprint, TemplateId } from "./types";

const DAY = 86_400_000;
const tokens = (s: string) =>
  new Set(
    String(s ?? "")
      .replace(/[؟?!.،,؛:«»"()]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
export const jaccard = (a: Iterable<string>, b: Iterable<string>) => {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n += 1;
  return n / (A.size + B.size - n);
};

/**
 * The opening shot a concept asks for (the novelty rules count layer + camera): a globe anchor opens on the globe, a
 * map anchor on the map; the hook type sets the camera (a question pushes in, a wrong belief pans across to the
 * truth, an object close-up starts very close). The director and the renderer draw exactly this opening.
 */
export function openingOf(c: Concept): { layer: string; camera: string } {
  const layer = c.anchor.asset.startsWith("globe") ? "globe" : "map";
  const camera = ({ question: "push", "odd-number": "push", countdown: "push", "wrong-belief": "pan", "before-after": "pan", "object-close-up": "push-close" } as Record<string, string>)[c.hook.type] ?? "push";
  return { layer, camera };
}

export type Candidate = { concept: Concept; template: TemplateId; hook_region?: string; opening: { layer: string; camera: string } };
export type Judged = { candidate: Candidate; similarity: number; broken: string[] };

/** How alike a candidate is to one past video, 0…1: the same family, hook, ending, anchor, objects and words. */
export function likeness(c: Candidate, f: Fingerprint): number {
  const parts = [
    c.concept.idea_family === f.idea_family ? 1 : 0,
    c.concept.hook.type === f.hook_type ? 1 : 0,
    c.concept.ending.type === f.ending_type ? 1 : 0,
    c.concept.anchor.asset === f.anchor_asset ? 1 : 0,
    c.template === f.template ? 1 : 0,
    jaccard(c.concept.objects ?? [], f.objects),
    jaccard(tokens(`${c.concept.one_line} ${c.concept.hook.text}`), f.words ?? []),
  ];
  const w = [0.2, 0.12, 0.08, 0.2, 0.1, 0.15, 0.15];
  return parts.reduce((s, p, i) => s + p * w[i], 0);
}

export function judge(c: Candidate, recent: Fingerprint[], now = Date.now(), dailyTemplate: TemplateId = "today"): Judged {
  const byAge = [...recent].sort((a, b) => Date.parse(b.day) - Date.parse(a.day));
  const last = (n: number) => byAge.slice(0, n);
  const within = (days: number) => byAge.filter((f) => now - Date.parse(f.day) <= days * DAY);
  const broken: string[] = [];
  if (last(2).some((f) => f.idea_family === c.concept.idea_family)) broken.push(`idea family «${c.concept.idea_family}» was used in the last 2 videos`);
  if (last(7).filter((f) => f.hook_type === c.concept.hook.type).length >= 2) broken.push(`hook type «${c.concept.hook.type}» already twice in the last 7`);
  if (last(7).filter((f) => f.ending_type === c.concept.ending.type).length >= 3) broken.push(`ending «${c.concept.ending.type}» already 3 times in the last 7`);
  if (within(14).some((f) => f.anchor_asset === c.concept.anchor.asset)) broken.push(`anchor «${c.concept.anchor.asset}» was used in the last 14 days`);
  if (c.hook_region && within(5).some((f) => f.hook_region === c.hook_region)) broken.push(`the hook's map region «${c.hook_region}» was used in the last 5 days`);
  const week = new Set(within(7).flatMap((f) => f.objects));
  const overlap = (c.concept.objects ?? []).filter((o) => week.has(o)).length;
  if (overlap > 1) broken.push(`${overlap} of its objects were shown in the last 7 days (1 at most)`);
  const close = last(30).find((f) => jaccard(c.concept.objects ?? [], f.objects) > 0.5 && (c.concept.objects ?? []).length > 1);
  if (close) broken.push(`its objects are too like video ${close.id}'s`);
  const opening = `${c.opening.layer}+${c.opening.camera}`;
  if (last(5).some((f) => `${f.opening_shot.layer}+${f.opening_shot.camera}` === opening) && c.template !== dailyTemplate) broken.push(`the opening shot ${opening} was used in the last 5 videos`);
  const sims = last(30).map((f) => likeness(c, f));
  const similarity = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;
  return { candidate: c, similarity, broken };
}

/** The candidate least like the last 30 that breaks no rule; or null with every candidate's reasons. */
export function pick(cands: Candidate[], recent: Fingerprint[], now = Date.now()): { chosen: Judged | null; all: Judged[] } {
  const all = cands.map((c) => judge(c, recent, now));
  const fine = all.filter((j) => !j.broken.length).sort((a, b) => a.similarity - b.similarity);
  return { chosen: fine[0] ?? null, all };
}

/** The fingerprint a video leaves once it is made. */
export function fingerprintOf(x: { id: string; day: string; template: TemplateId; concept: Concept; hook_region?: string; opening: { layer: string; camera: string } }): Fingerprint {
  return {
    id: x.id,
    day: x.day,
    template: x.template,
    idea_family: x.concept.idea_family,
    hook_type: x.concept.hook.type,
    ending_type: x.concept.ending.type,
    anchor_asset: x.concept.anchor.asset,
    hook_region: x.hook_region,
    objects: x.concept.objects ?? [],
    opening_shot: x.opening,
    words: [...tokens(`${x.concept.one_line} ${x.concept.hook.text}`)],
  };
}
