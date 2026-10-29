// Renders one Reel by hand, from a file of props (the content the site would send).
//   node render.mjs seat                                  samples/seat.json → out/seat.mp4, with its score
//   node render.mjs seat --props samples/seat-cbi.json    another episode → out/seat-cbi.mp4
//   node render.mjs seat --still 40,300                   single frames → out/seat-0040.png … (to look at a layout)
//   node render.mjs seat --bundle bundle-seat             from the bundle of one composition (node build.mjs seat)
//   node render.mjs cover --props samples/seat.cover.json --still 0     the grid tile
//   node render.mjs cards --props samples/cards.json --still all        every card of a carousel → out/cards-0000.png …
//   node render.mjs thennow --voice lines.json            with a narrator: the lines as the site makes them (lib/social/voice.ts)
import fs from "node:fs";
import path from "node:path";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { finish } from "./finish.mjs";
import { score } from "./music.mjs";
import { dropVoice, duckOf, voiceFiles } from "./voice.mjs";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const id = args[0];
if (!id || id.startsWith("--")) {
  console.error("usage: node render.mjs <format> [--props file.json] [--still f1,f2] [--bundle dir] [--out name]");
  process.exit(2);
}
const propsFile = flag("--props") ?? `samples/${id}.json`;
const stillArg = flag("--still");
const stills = stillArg === "all" ? "all" : (stillArg?.split(",").map(Number) ?? null);
const serveUrl = path.resolve(flag("--bundle") ?? "bundle");
const name = flag("--out") ?? path.basename(propsFile).replace(/(\.cover)?\.json$/, "");
const props = JSON.parse(fs.readFileSync(propsFile, "utf8"));
fs.mkdirSync("out", { recursive: true });

// a busy machine may take longer than Remotion's half minute to open its browser (the worker allows two minutes too)
const timeoutInMilliseconds = 120_000;
const t0 = Date.now();
if (stills) {
  const composition = await selectComposition({ serveUrl, id, inputProps: props, timeoutInMilliseconds });
  for (const frame of stills === "all" ? Array.from({ length: composition.durationInFrames }, (_, i) => i) : stills) {
    const output = `out/${name}-${String(frame).padStart(4, "0")}.png`;
    await renderStill({ composition, serveUrl, output, frame: Math.min(frame, composition.durationInFrames - 1), inputProps: props, timeoutInMilliseconds });
    console.log("wrote", output, `(of ${composition.durationInFrames} frames)`);
  }
} else {
  fs.mkdirSync(path.join(serveUrl, "public"), { recursive: true });
  const lines = flag("--voice") ? JSON.parse(fs.readFileSync(flag("--voice"), "utf8")) : [];
  const voiceIn = voiceFiles(lines, path.join(serveUrl, "public"), name);
  const first = await selectComposition({ serveUrl, id, inputProps: { ...props, voiceIn }, timeoutInMilliseconds });
  const seconds = first.durationInFrames / first.fps;
  const music = `music-${name}.wav`;
  fs.writeFileSync(path.join(serveUrl, "public", music), score({ id, seconds, duck: duckOf(first) }));
  for (const v of first.props.voice ?? []) console.log("voice", v.file, "at", (v.from / first.fps).toFixed(2), "s for", (v.frames / first.fps).toFixed(2), "s");
  if (first.props.holds?.length) console.log("holds", JSON.stringify(first.props.holds));
  const inputProps = { ...props, voiceIn, music };
  const composition = await selectComposition({ serveUrl, id, inputProps, timeoutInMilliseconds });
  const outputLocation = `out/${name}.mp4`;
  // every tenth of the frames, with the time it took: a sample that crawls shows where
  let tenth = 0;
  const onProgress = ({ renderedFrames }) => {
    const now = Math.floor((renderedFrames / composition.durationInFrames) * 10);
    if (now > tenth) {
      tenth = now;
      console.log("frame", renderedFrames, "of", composition.durationInFrames, "after", Math.round((Date.now() - t0) / 1000), "s");
    }
  };
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 19, audioBitrate: "160k", inputProps, outputLocation, concurrency: Number(process.env.RENDER_CONCURRENCY ?? 3), timeoutInMilliseconds, onProgress });
  dropVoice(path.join(serveUrl, "public"), name);
  console.log(finish(outputLocation, seconds));
  console.log("wrote", outputLocation, composition.durationInFrames, "frames,", seconds.toFixed(1), "s, in", Math.round((Date.now() - t0) / 1000), "s");
}
