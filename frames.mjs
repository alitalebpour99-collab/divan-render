// Prints where the scenes of a Reel begin and how long it runs, for choosing frames to look at.
//   node frames.mjs seat [samples/seat-cbi.json] [--bundle bundle-seat]
import fs from "node:fs";
import path from "node:path";
import { selectComposition } from "@remotion/renderer";

const args = process.argv.slice(2);
const id = args[0];
const propsFile = args[1] && !args[1].startsWith("--") ? args[1] : `samples/${id}.json`;
const bundle = args.includes("--bundle") ? args[args.indexOf("--bundle") + 1] : `bundle-${id}`;
const props = JSON.parse(fs.readFileSync(propsFile, "utf8"));
const c = await selectComposition({ serveUrl: path.resolve(bundle), id, inputProps: props });
console.log(`${id} (${path.basename(propsFile)}): ${c.durationInFrames} frames, ${(c.durationInFrames / c.fps).toFixed(1)} s`);
