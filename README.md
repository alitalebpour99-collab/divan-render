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
`RENDER_GL` (unset: Chrome's own default; «swangle» drew every frame about
eight times slower on GitHub), `QUIET_URL` (another renderer on the same
machine to wait for), `POLL_SECONDS`, `START_FREE_MB`, `ABORT_FREE_MB`,
`HOLD_UNTIL`, `RENDER_MAX_MS` (a Reel still drawing after this long, 15 min,
is given up and tried again; the log says where it had reached).

## The hook, the type and the short versions

- **The hook** (`src/Hook.tsx`) shows the Reel's own picture under its
  question, sharp and already moving on frame 0: a layout names the frame it
  plays from and the band of the picture it shows (`look`, `withHook` in
  `src/Root.tsx`). «عدد روز» shows its figure counting in the ring, «پنج عدد»
  its last board flipping.
- **Type** (`TITLE_MIN`, `BODY_MIN` in `src/kit.tsx`): a title at least 88 px
  and every text to read at least 48 px on the finished video, that is 104 and
  57 px on the designed frame (the safe stage draws it at 85 %). The hook, «عدد
  روز» and «پنج عدد» keep to it; the name line at the top is the page's mark.
- **Short versions**: `cut: "short"` in the props of «عدد روز» and «پنج عدد»
  runs 15 to 25 seconds with the narrator. Its scenes are tighter, and the
  narrator's lines that would not fit in 25 seconds are left out, the one
  least needed first (`shortCues`); the question and the line to follow the
  page always stay. Samples: `figure-short`, `five-short` (with a narrator).

## Look at a format

Keep the packages out of a synced folder (OneDrive and the like).

```bash
npm ci
node build.mjs seat                                   # one composition alone, into bundle-seat/
node render.mjs seat --bundle bundle-seat --still 60,400,900     # frames, to out/
node render.mjs seat --props samples/seat.json --bundle bundle-seat   # the whole Reel
node frames.mjs seat samples/seat.json                # how long it runs
```

A carousel is drawn as stills, one card a frame: `node render.mjs cards --props samples/cards-tank.json --bundle bundle-cards --still all`.

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

## The set style

The owner approved the new video style on 13 November 2026 (lit sets, a
camera that never stands still, few big words, more care for the sound) and
asked for it in each project's own look. Divan's look is a calm war-room
dossier: an ink-green table with a faint topographic map in its cloth, a
plotting grid, thin brass rules and borders, compass roses set into it, and the
episode's brass-framed plates, seals and pins lying on it. Advisers are brass
seals with their emblem (`emblems.tsx`), never faces. It is drawn for Divan's
three most posted Reels: «عدد روز» (`figure`), «جنگ، روز به روز» (`war`) and
«دوراهی امروز» (`dilemma`). Every other format keeps its classic look.

- `src/set/space.ts`: the camera over the table (push from frame 0, sway,
  whips of 7 frames, glides of 20, punches), the platforms' safe zones measured
  on the owner's screenshots (x 56–888, y 232–1583), the plan's types.
- `src/set/plans.ts`: what each format puts on the table, where the camera
  goes and when, which sound lands where. Pure; every word comes from the props.
- `src/set/fit.ts`: every text measured with the real font before it is drawn.
- `src/set/Table.tsx`, `src/set/CoverSet.tsx`: the drawing, the tile (one seal
  and three or four big words). No WebGL.
- `gate.mjs`: the checks a Reel must pass before it is handed back: a hook of
  at most 7 words from frame 0 with no logo or card first, a camera event at
  least every 3 s and no 2.5 s frozen, the loop back to the first picture,
  every text inside the safe zones on every frame it is seen, type of 48 px or
  more (marks such as the source 40 px or more), no screen line over a piece,
  both halves of the frame used, every figure with its source on screen, no
  «·» or «|» beside Persian, the channel badge, at most two effects a second,
  −14 LUFS within 1 LU with the true peak at −1 dBTP or lower, near-black 35 %
  or less, three or four words on the tile; since the review of 2026-11-14
  also no card seen before its words and no stretch with nothing on the screen
  (`empty-card`), the cards of every resting moment centred on the screen and
  filling the column (`fill-x`), and a figure the hook counts inside its
  sentence («۱۸۴ رویداد در ۲۶۰ روز جنگ. کجا بودند؟», `hook-number`; two
  figures weigh one word in the 7). The plan's checks run before
  anything is drawn; a Reel that fails is not handed back and the site hears
  why in plain Persian («این ویدیو از بازبینی پیش از ارسال رد شد: …»).
- The channel badge: «دیوان» with a tiny heart and a tiny follow mark, in a
  brass pill at the lower left of the safe area, for 2.2 s over the closing
  question, gone before the loop. One master file for every platform.
- Sound: per-scene effects (whoosh on a whip, tick when a figure counts, pop
  when a plate lands, a rise before the pick, a hit at the reveal and in the
  first half second), at most two a second; the bed is a dark minimal drone
  with a heartbeat sub pulse made in `music.mjs` (`drone`), ducked about 17 dB
  under the narrator; `finish.mjs` levels in two passes and measures.
- A Reel whose hook cannot be seven words (the Decision Table's stand-in
  dilemma) and a job from a site that sends no tile words keep the classic look.

Switches (repository variables of `divan-render`, read by `render.yml`; unset
means on): `DIVAN_STYLE=classic` (the old look), `DIVAN_BADGE=off`,
`DIVAN_GATE=warn` (report and hand back anyway) or `off`,
`DIVAN_SET_MUSIC=library` (the site's library track instead of the drone).

Tests: `node --test tests/set.test.mjs` (Node 23.6 or later). Samples:
`scripts/set-samples.mjs` in Divan's repository writes `samples/set-*.json`;
the Samples workflow with `figure:set-figure war:set-war dilemma:set-dilemma`
renders them and keeps an artifact «small» (a 360 px copy, sheets of two
frames a second, the loudness, the gate's report).
