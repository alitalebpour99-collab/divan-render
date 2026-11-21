// The quality gate of a finished Reel (storyboard-fa.md §5), measured on the file with ffmpeg:
//   - no still: no stretch over 2 s where under 1.5 % of the picture changes (the caption band left out, so words
//     changing alone do not count as motion, and a slow breath of the camera does not either);
//   - legible: in every shot that writes a header, the header band has real contrast in its middle frame;
//   - sync: every shot starts within 0.2 s of the word it is locked to (from the storyboard the render used);
//   - the loop: the last frame is the first again (SSIM 0.97 or more);
//   - and the file checks every Reel already had (gate.mjs: the first second moves, loudness, darkness).
// It also draws the contact sheet, one frame a second, which the vision judge scores (lib/social/judge.ts on the
// site, or judge.mjs here) against the reference sheets. A Reel the judge scores under 8 is held, never auto-posted.
//   node qa.mjs <video.mp4> <storyboard.json> [--sheet out.jpg] [--json out.json]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileChecks, likeness } from "./gate.mjs";

const W = 135;
const H = 240;
/** the caption band (y 1470…1560 of 1920) is not counted: the words change without the picture changing */
const CAPTION = [Math.round((1470 / 1920) * H), Math.round((1570 / 1920) * H)];

function grey(file, fps) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-an", "-vf", `fps=${fps},scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 });
  const px = r.stdout ?? Buffer.alloc(0);
  const n = Math.floor(px.length / (W * H));
  return Array.from({ length: n }, (_, i) => px.subarray(i * W * H, (i + 1) * W * H));
}

/** Stretches where the picture stands still: [start s, length s], from frames 0.25 s apart compared 0.5 s apart. */
export function stills(file, { share = 0.015, longest = 2.0 } = {}) {
  const fps = 4;
  const frames = grey(file, fps);
  const moved = [];
  for (let i = 2; i < frames.length; i += 1) {
    const a = frames[i - 2];
    const b = frames[i];
    let n = 0;
    let all = 0;
    for (let y = 0; y < H; y += 1) {
      if (y >= CAPTION[0] && y < CAPTION[1]) continue;
      for (let x = 0; x < W; x += 1) {
        all += 1;
        if (Math.abs(a[y * W + x] - b[y * W + x]) > 10) n += 1;
      }
    }
    moved.push(n / all);
  }
  const out = [];
  let run = 0;
  for (let i = 0; i <= moved.length; i += 1) {
    if (i < moved.length && moved[i] < share) run += 1;
    else {
      // a run of r pairs 0.25 s apart, each spanning 0.5 s, covers (r + 1) × 0.25 s
      const secs = run ? (run + 1) / fps : 0;
      if (secs > longest) out.push([(i - run) / fps, secs]);
      run = 0;
    }
  }
  return { stills: out, moved };
}

/** The contrast of the header band (y 330…520) in a frame: the spread of its light and dark (text on the room). */
function headerContrast(file, t) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "crop=820:190:64:330,scale=410:95,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 1 << 24 });
  const px = [...(r.stdout ?? [])].sort((a, b) => a - b);
  if (!px.length) return 0;
  return px[Math.floor(px.length * 0.99)] - px[Math.floor(px.length * 0.3)];
}

/** The contact sheet: one frame a second, ten across, each with its second. */
export function contactSheet(file, out) {
  const font = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"].find((f) => fs.existsSync(f));
  const label = font ? `,drawtext=fontfile='${font.replace(/:/g, "\\:")}':text='%{eif\\:t\\:d}s':x=8:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55` : "";
  spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-vf", `fps=1,scale=216:-2${label},tile=10x4:padding=4:color=0x000000`, "-frames:v", "1", "-q:v", "3", out]);
  return fs.existsSync(out) ? out : null;
}

export function qa(file, sb) {
  const checks = [];
  const add = (id, ok, detail, fa) => checks.push({ id, ok: Boolean(ok), detail, fa });
  const { stills: frozen } = stills(file);
  add("no-still", !frozen.length, frozen.length ? `still: ${frozen.map(([s, d]) => `${s.toFixed(1)} s for ${d.toFixed(1)} s`).join(", ")}` : "the picture changes in every 2 s", "تصویر بیش از ۲ ثانیه بی‌تغییر مانده است");
  const weak = [];
  for (const s of sb.shots) {
    if (!s.text?.header || ["chart", "number", "road", "gauge"].includes(s.picture.layer)) continue;
    const c = headerContrast(file, s.start + s.dur / 2);
    if (c < 110) weak.push(`#${s.n} (${c})`);
  }
  add("legible", !weak.length, weak.length ? `low contrast headers: ${weak.join(", ")}` : "every header stands out from the room", "متن یک نما خوانا نیست");
  const off = sb.shots.filter((s) => s.word_at !== null && Math.abs(s.word_at - s.start) > 0.2 + 0.2);
  add("sync", !off.length, off.length ? `shots off their word: ${off.map((s) => `#${s.n}`).join(", ")}` : `${sb.shots.filter((s) => s.word_at !== null).length} shots on their word`, "تصویر با کلمهٔ راوی هم‌زمان نیست");
  const loop = likeness(file, 0, "last");
  add("loop-97", loop >= 0.97, `first and last frame SSIM ${loop.toFixed(3)} (0.97 or more)`, "پایان به فریم اول برنمی‌گردد");
  for (const c of fileChecks(file)) if (c.id !== "still" && c.id !== "loop") checks.push(c);
  return { ok: checks.every((c) => c.ok), checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const [file, sbFile] = process.argv.slice(2);
  const flag = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
  const sb = JSON.parse(fs.readFileSync(sbFile, "utf8"));
  const result = qa(file, sb);
  for (const c of result.checks) console.log(`qa ${c.ok ? "pass" : "FAIL"} ${c.id}: ${c.detail}`);
  const sheet = flag("--sheet");
  if (sheet) console.log(`sheet ${contactSheet(file, sheet) ?? "not drawn"}`);
  if (flag("--json")) fs.writeFileSync(flag("--json"), JSON.stringify(result, null, 2));
}
