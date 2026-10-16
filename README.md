# divan-render

The Reels and Stories of Divan's Instagram page
([@divan.ahura](https://www.instagram.com/divan.ahura/)), as a Remotion project.
Divan is a situation and decision room for Iran: <https://divan.ahura.cloud>.

This folder only draws. A composition draws exactly what the site hands it
(`src/props.ts`) and nothing else: no text of a Reel is written here. The
plan, the content, the owner's review and the posting live in the site.

| file | what |
|---|---|
| `src/kit.tsx` | the site's night palette and type, a colour per series, Instagram's safe zones, the seal, the motion pieces |
| `src/Dilemma.tsx` `Seat.tsx` `Region.tsx` `Precedent.tsx` `Talks.tsx` `WarReplay.tsx` `Borders.tsx` | one composition per format; its id in `src/Root.tsx` is the format's id |
| `src/Story.tsx` | the nine-second Story that follows a Reel |
| `src/Cover.tsx` | the still tile for the profile grid |
| `music.mjs` | the score, synthesized for each Reel's own length; one key per format |
| `worker.mjs` | asks the site for work, renders, hands the files back |
| `samples/` | one example of content per format, for looking at a layout |

## Where it runs

**On GitHub, in the public copy of this folder**
([alitalebpour99-collab/divan-render](https://github.com/alitalebpour99-collab/divan-render)),
every quarter of an hour (`.github/workflows/render.yml`): `node worker.mjs` in
one pass; a look that finds nothing ends in seconds. Public repositories' jobs cost nothing. The site's key is the
repository's Actions secret `DIVAN_RENDER_SECRET`; nothing secret is in the
files.

The public copy is made from Divan's own repository: after a change to
`video/`, run `node scripts/mirror-video.mjs` there.

The same worker can run anywhere with Node 22: `DIVAN_RENDER_SECRET=… node
worker.mjs` (one pass) or `--loop` (looks every two minutes). Until 16 October
2026 it ran on Ahura's shared server as the app `divan-video` (this folder's
`Dockerfile`); that server had too little free memory for it from 12 October.
Before each Reel the worker looks at the machine (`/proc/meminfo`,
`/proc/loadavg`) and waits while it is short of memory or busy.

Settings: `DIVAN_RENDER_SECRET`, `DIVAN_URL`, `RENDER_CONCURRENCY`,
`RENDER_GL`, `QUIET_URL` (another renderer on the same machine to wait for),
`POLL_SECONDS`, `START_FREE_MB`, `ABORT_FREE_MB`, `HOLD_UNTIL`.

## Look at a format

Keep the packages out of a synced folder (OneDrive and the like).

```bash
npm ci
node build.mjs seat                                   # one composition alone, into bundle-seat/
node render.mjs seat --bundle bundle-seat --still 60,400,900     # frames, to out/
node render.mjs seat --props samples/seat.json --bundle bundle-seat   # the whole Reel
node frames.mjs seat samples/seat.json                # how long it runs
```

Two rules for every layout: nothing to read in the bottom 330 px (Instagram
draws the caption there), and nothing in the lower right 150 px (its buttons).
Look at the longest episode before any other.

Do not render several Reels at once on a small machine: four at a time filled
8 GB of memory and, through the page file, the whole disk (9 October 2026).
A render that is killed leaves its browser profile in the temp folder
(`puppeteer_dev_chrome_profile-*`); delete those.

## The map files

`src/data/region.json` is cut from [Natural Earth](https://www.naturalearthdata.com/)
1:50m (public domain). `src/data/eras.json` holds rows of
[Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria)
v0.2.1 by the Seshat Global History Databank, licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
([paper](https://doi.org/10.1038/s41597-025-04516-9)). Both are copies of the
site's `data/map/*`; after those change, run `node sync-maps.mjs` in Divan's
own repository (`--check` only compares).

The type is Vazirmatn and Noto Naskh Arabic (SIL Open Font License), loaded
from Google Fonts at render time.
