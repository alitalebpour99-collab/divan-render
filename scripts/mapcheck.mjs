// Round 8, the owner's pre-delivery check (22 Nov 2026): run on a Reel's frames before anything is reported. It walks the
// Reel frame by frame through the very functions the renderer draws with (Reel.tsx frameScene) and fails on:
//   - a word's box over land (a sea name, a measure's length, the scale; a name of a land place may stand on its land),
//     over another word, over a thing or a numbered disc, or under the header, the source line, the legend or the poll;
//   - a thing that floats, a numbered disc of a sea event or a count's badge on land or on the coastline;
//   - a lane line touching land, or two lane lines crossing.
// The panels (header, source line, legend, poll) are opaque boxes of their own: their words are not over the map.
//   node --import ./tests/register.mjs scripts/mapcheck.mjs samples/divan-strait.json [--every 2] [--out report.json]
// Exit code 1 when anything fails.
import fs from "node:fs";
import path from "node:path";
import { checkReel } from "./mapcheck-lib.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith(".json"));
const every = Number(args[args.indexOf("--every") + 1]) || (args.includes("--every") ? 2 : 1);
const outAt = args.indexOf("--out");
const out = outAt >= 0 ? args[outAt + 1] : null;
if (!file) {
  console.error("usage: mapcheck.mjs <sample.json> [--every n] [--out report.json]");
  process.exit(2);
}

const t0 = Date.now();
const { sb, fails } = checkReel(JSON.parse(fs.readFileSync(file, "utf8")), every);
const byRule = {};
for (const x of fails) (byRule[x.rule] ??= []).push(x);
const report = { file: path.basename(file), frames: sb.total, every, ok: fails.length === 0, fails: fails.length, rules: Object.fromEntries(Object.entries(byRule).map(([k, v]) => [k, { n: v.length, first: v.slice(0, 6) }])), ms: Date.now() - t0 };
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`${report.file}: ${report.ok ? "PASS" : "FAIL"}, ${fails.length} failure(s) on ${Math.ceil(sb.total / every)} frames (${report.ms} ms)`);
for (const [k, v] of Object.entries(report.rules)) {
  console.log(`  ${k}: ${v.n}`);
  for (const x of v.first) console.log(`    ${x.s}s f${x.f}: ${x.what}`);
}
process.exit(report.ok ? 0 : 1);
