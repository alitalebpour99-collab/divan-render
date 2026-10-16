// The renderer of Divan's Reels. It asks the site for work, renders what it is
// given, and hands the files back; the site then shows each Reel to the owner
// and posts it at its hour. A carousel (format «cards») is drawn as stills,
// one picture per card, and handed back as slide1.jpg, slide2.jpg, …
//
// It runs on Ahura's own server as the small app «divan-video» (Dockerfile
// beside this file), by the owner's decision of 10 October 2026, and it can be
// run by hand on any machine with Node and room for a headless Chrome.
//
//   DIVAN_RENDER_SECRET=… node worker.mjs --loop     stays up: looks for work every two minutes
//   DIVAN_RENDER_SECRET=… node worker.mjs            one pass: take what waits, render, hand back, end
//   DIVAN_URL=http://localhost:3212                  another address (default https://divan.ahura.cloud)
//
// The server is shared and short of memory, so the worker is careful with it:
// one Reel at a time, one browser tab, and before each Reel it waits while
// Manshur's own video worker is rendering (QUIET_URL, its health address), so
// that two browsers never run side by side. It also looks at the machine
// itself: it does not start while memory is short or the processors are busy
// (a build of some other app, say), and it gives a render up when memory runs
// out under it. On 10 October 2026 a render and a deploy met, and every site
// on the server stopped answering for some minutes.
//
// Nothing of a Reel's content is printed: a Reel is the owner's to see first.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { score } from "./music.mjs";

const SITE = (process.env.DIVAN_URL ?? "https://divan.ahura.cloud").replace(/\/+$/, "");
const SECRET = process.env.DIVAN_RENDER_SECRET ?? "";
const LOOP = process.argv.includes("--loop");
const POLL_MS = Math.max(30, Number(process.env.POLL_SECONDS) || 120) * 1000;
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.RENDER_CONCURRENCY) || (LOOP ? 1 : Math.min(4, os.cpus().length))));
// another renderer on the same machine: while it says it is busy, this one waits
const QUIET_URL = process.env.QUIET_URL ?? "";
const QUIET_WAIT_MS = Math.max(0, Number(process.env.QUIET_WAIT_MINUTES ?? 40)) * 60_000;
const GL = process.env.RENDER_GL || undefined;
// the machine must have this much memory free before a Reel is started, and this much while it renders
const START_FREE_MB = Number(process.env.START_FREE_MB) || 2200;
const ABORT_FREE_MB = Number(process.env.ABORT_FREE_MB) || 450;
// the operator's way to keep the worker out of a window somebody else needs: no Reel is started before this moment (an ISO time)
const HOLD_UNTIL = Date.parse(process.env.HOLD_UNTIL ?? "") || 0;
const PORT = Number(process.env.PORT) || 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = { busy: false, started: new Date().toISOString(), lastLook: null, lastReel: null, rendered: 0, failed: 0 };

async function call(query, init = {}, tries = 3) {
  let last = "";
  for (let n = 1; n <= tries; n += 1) {
    try {
      const res = await fetch(`${SITE}/api/social/work${query}`, { ...init, headers: { authorization: `Bearer ${SECRET}`, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(180_000) });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) return body;
      last = `HTTP ${res.status} ${body?.error ?? ""}`.trim();
      // a refusal will not change by asking again
      if (res.status >= 400 && res.status < 500) break;
    } catch (e) {
      last = e instanceof Error ? e.name : "error";
    }
    if (n < tries) await sleep(4000 * n);
  }
  throw new Error(`the site did not accept the call (${last})`);
}

/**
 * The whole machine as Linux reports it: memory that can still be had, and how
 * busy the processors are. Inside a container these two files still describe
 * the host. Null where they do not exist (a developer's own computer).
 */
function machine() {
  try {
    const mem = fs.readFileSync("/proc/meminfo", "utf8");
    const freeMb = Number(/^MemAvailable: *([0-9]+)/m.exec(mem)?.[1]) / 1024;
    const load = Number(fs.readFileSync("/proc/loadavg", "utf8").split(" ")[0]);
    return Number.isFinite(freeMb) && Number.isFinite(load) ? { freeMb, load, cpus: os.cpus().length } : null;
  } catch {
    return null;
  }
}
/** Why a Reel should not be started right now, or "" when the machine has room. */
function crowded() {
  const m = machine();
  if (!m) return "";
  if (m.freeMb < START_FREE_MB) return `only ${Math.round(m.freeMb)} MB of memory is free`;
  if (m.load > Math.max(1.5, m.cpus * 0.7)) return `the processors are busy (load ${m.load.toFixed(1)} on ${m.cpus})`;
  return "";
}

/**
 * Waits while the other renderer on this machine is busy or the machine has
 * no room. True when a Reel may be started. After QUIET_WAIT_MS it stops
 * waiting: for the other renderer it then starts anyway (a Reel must not wait
 * for ever), for a crowded machine it does not (the next look is in two minutes).
 */
async function waitForQuiet() {
  const until = Date.now() + QUIET_WAIT_MS;
  let said = "";
  for (;;) {
    let busy = false;
    if (QUIET_URL) {
      try {
        const res = await fetch(QUIET_URL, { signal: AbortSignal.timeout(10_000) });
        busy = Boolean((await res.json()).busy);
      } catch {
        // it cannot be asked: it is not rendering either
      }
    }
    const why = busy ? "the other renderer is busy" : crowded();
    if (!why) {
      if (said) console.log("there is room now; starting");
      return true;
    }
    if (why !== said) console.log(`${why}; waiting`);
    said = why;
    if (Date.now() >= until) {
      if (busy && !crowded()) {
        console.log("waited long enough for the other renderer; starting anyway");
        return true;
      }
      console.log("the machine still has no room; this Reel waits for the next look");
      return false;
    }
    await sleep(30_000);
  }
}

let serveUrl = "";
async function site() {
  if (serveUrl) return serveUrl;
  serveUrl = fs.existsSync("bundle/index.html") ? path.resolve("bundle") : await bundle({ entryPoint: path.resolve("src/index.ts"), outDir: path.resolve("bundle"), publicDir: path.resolve("public") });
  fs.mkdirSync(path.join(serveUrl, "public"), { recursive: true });
  fs.mkdirSync("out", { recursive: true });
  return serveUrl;
}

/** A carousel: every card a JPEG of 1080 by 1350, in order. Returns the files. */
async function renderCards(job, serve, chromiumOptions, timeoutInMilliseconds, out) {
  const composition = await selectComposition({ serveUrl: serve, id: "cards", inputProps: job.props, chromiumOptions, timeoutInMilliseconds });
  for (let frame = 0; frame < composition.durationInFrames; frame += 1) {
    const output = path.resolve("out", `${job.name}-${frame + 1}.jpg`);
    out.push(output);
    await renderStill({ composition, serveUrl: serve, output, frame, inputProps: job.props, imageFormat: "jpeg", jpegQuality: 92, chromiumOptions, timeoutInMilliseconds });
  }
  return out;
}

async function render(job) {
  const t0 = Date.now();
  const serve = await site();
  if (job.format === "cards") return renderPictures(job, serve, t0);
  const video = path.resolve("out", `${job.name}.mp4`);
  const cover = path.resolve("out", `${job.name}.jpg`);
  const music = `music-${job.name}.wav`;
  const chromiumOptions = { gl: GL };
  // the server is slow and shared: the page gets two minutes to draw a frame before a render counts as stuck (the default half minute failed a Reel on a busy day)
  const timeoutInMilliseconds = 120_000;
  // while the Reel renders the machine is watched: two looks in a row with almost no memory left end the render
  const { cancelSignal, cancel } = makeCancelSignal();
  let tight = 0;
  let gaveUp = false;
  const watch = setInterval(() => {
    const m = machine();
    tight = m && m.freeMb < ABORT_FREE_MB ? tight + 1 : 0;
    if (tight >= 2 && !gaveUp) {
      gaveUp = true;
      console.log(`Reel ${job.id}: the machine has almost no memory left; giving this render up`);
      cancel();
    }
  }, 20_000);
  try {
    // the tile for the profile grid
    const tile = await selectComposition({ serveUrl: serve, id: "cover", inputProps: job.cover, chromiumOptions, timeoutInMilliseconds });
    await renderStill({ composition: tile, serveUrl: serve, output: cover, inputProps: job.cover, imageFormat: "jpeg", jpegQuality: 92, chromiumOptions, timeoutInMilliseconds });
    // the score is made for this Reel's own length
    const first = await selectComposition({ serveUrl: serve, id: job.format, inputProps: job.props, chromiumOptions, timeoutInMilliseconds });
    const seconds = first.durationInFrames / first.fps;
    fs.writeFileSync(path.join(serve, "public", music), score({ id: job.format, seconds }));
    const inputProps = { ...job.props, music };
    const composition = await selectComposition({ serveUrl: serve, id: job.format, inputProps, chromiumOptions, timeoutInMilliseconds });
    await renderMedia({ composition, serveUrl: serve, codec: "h264", crf: 20, pixelFormat: "yuv420p", audioCodec: "aac", audioBitrate: "160k", inputProps, outputLocation: video, concurrency: CONCURRENCY, chromiumOptions, cancelSignal, timeoutInMilliseconds });
    for (const [kind, file, type] of [
      ["video", video, "video/mp4"],
      ["cover", cover, "image/jpeg"],
    ]) {
      await call(`?id=${job.id}&file=${kind}`, { method: "POST", headers: { "content-type": type }, body: fs.readFileSync(file) });
    }
    await call(`?id=${job.id}&done=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seconds }) });
    state.rendered += 1;
    console.log(`Reel ${job.id} (${job.format}): ${seconds.toFixed(1)} s of video, ${(fs.statSync(video).size / 1e6).toFixed(1)} MB, rendered and handed back in ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) {
    state.failed += 1;
    // the message of a render error may quote the content: only its first line, cut short, goes to the site, and none of it to the log
    const reason = gaveUp ? "the server ran short of memory; the render was given up and will be tried again" : String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 240);
    console.log(`Reel ${job.id} (${job.format}): failed after ${Math.round((Date.now() - t0) / 1000)} s`);
    await call(`?id=${job.id}&failed=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ error: reason }) }).catch(() => undefined);
  } finally {
    clearInterval(watch);
    for (const file of [video, cover, path.join(serve, "public", music)]) fs.rmSync(file, { force: true });
    state.lastReel = new Date().toISOString();
  }
}

/** A carousel from claim to hand-back: the pictures, the first one again as the cover, then done. */
async function renderPictures(job, serve, t0) {
  const chromiumOptions = { gl: GL };
  const timeoutInMilliseconds = 120_000;
  const files = [];
  try {
    await renderCards(job, serve, chromiumOptions, timeoutInMilliseconds, files);
    for (const [i, file] of files.entries()) await call(`?id=${job.id}&file=slide${i + 1}`, { method: "POST", headers: { "content-type": "image/jpeg" }, body: fs.readFileSync(file) });
    await call(`?id=${job.id}&file=cover`, { method: "POST", headers: { "content-type": "image/jpeg" }, body: fs.readFileSync(files[0]) });
    await call(`?id=${job.id}&done=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pictures: files.length }) });
    state.rendered += 1;
    console.log(`post ${job.id} (cards): ${files.length} pictures, rendered and handed back in ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) {
    state.failed += 1;
    const reason = String(e instanceof Error ? e.message : e).split("\n")[0].slice(0, 240);
    console.log(`post ${job.id} (cards): failed after ${Math.round((Date.now() - t0) / 1000)} s`);
    await call(`?id=${job.id}&failed=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ error: reason }) }).catch(() => undefined);
  } finally {
    for (const file of files) fs.rmSync(file, { force: true });
    state.lastReel = new Date().toISOString();
  }
}

/** One pass: the waiting Reels, one after another. Returns how many it took. */
async function pass() {
  let taken = 0;
  if (Date.now() < HOLD_UNTIL) return taken;
  for (;;) {
    // a look first: it costs the site nothing and claims nothing
    const { waiting } = await call("?peek=1&can=story,cards");
    state.lastLook = new Date().toISOString();
    if (!waiting) return taken;
    if (!(await waitForQuiet())) return taken;
    // this bundle holds the Story's composition and the carousel's, and says so: the site hands them only to a renderer that can draw them
    const { jobs } = await call("?max=1&can=story,cards");
    if (!jobs?.length) return taken;
    state.busy = true;
    try {
      await render(jobs[0]);
    } finally {
      state.busy = false;
    }
    taken += 1;
    // never more than a handful in one pass: something that fails for ever must not spin
    if (taken >= 6) return taken;
  }
}

if (!SECRET) {
  console.error("DIVAN_RENDER_SECRET is not set");
  process.exitCode = 2;
} else if (!LOOP) {
  const taken = await pass();
  console.log(taken ? `${taken} Reel(s) taken` : "nothing to render");
  if (state.failed) process.exitCode = 1;
} else {
  // the platform asks this address whether the worker is alive; it tells nothing of a Reel
  if (PORT) http.createServer((req, res) => (req.url === "/health" ? res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, ...state })) : res.writeHead(404).end())).listen(PORT, () => console.log(`divan video worker: health on :${PORT}`));
  console.log(`divan video worker: looking at ${SITE} every ${POLL_MS / 1000} s, ${CONCURRENCY} tab(s)${QUIET_URL ? ", waiting for the other renderer" : ""}`);
  await site();
  for (;;) {
    try {
      await pass();
    } catch (e) {
      // the site is restarting, or the network is away: tried again at the next look
      console.log("no pass:", e instanceof Error ? e.message.slice(0, 120) : "error");
    }
    await sleep(POLL_MS);
  }
}
