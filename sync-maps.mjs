// The two map files the compositions draw on are copies of the site's own:
// the base map (Natural Earth) and the past outlines (Cliopatria). Run this
// from the repository's video/ folder after scripts/build-map.mjs or
// scripts/build-eras.mjs changed them; `--check` only says whether they differ.
//   node sync-maps.mjs [--check]
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "..");
const out = path.resolve(import.meta.dirname, "src/data");
const eras = JSON.parse(fs.readFileSync(path.join(repo, "data/map/eras.json"), "utf8"));
const want = {
  "region.json": fs.readFileSync(path.join(repo, "data/map/region.json"), "utf8"),
  // only what the borders Reel draws: the row of the dataset, the towns inside the line, what came after, and the outline
  "eras.json": JSON.stringify({ dataset: eras.dataset, places: eras.places, eras: Object.fromEntries(Object.entries(eras.eras).map(([k, e]) => [k, { row: e.row, inside: e.inside, later: e.later, geometry: e.geometry }])) }),
};
let stale = 0;
for (const [name, text] of Object.entries(want)) {
  const file = path.join(out, name);
  const same = fs.existsSync(file) && fs.readFileSync(file, "utf8") === text;
  if (same) continue;
  stale += 1;
  if (process.argv.includes("--check")) console.log(`${name} differs from the site's data`);
  else {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`${name} written`);
  }
}
if (!stale) console.log("the map files match the site's data");
else if (process.argv.includes("--check")) process.exitCode = 1;
