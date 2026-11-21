# divan-render

The Reels and Stories of Divan's Instagram page
([@divan.ahura](https://www.instagram.com/divan.ahura/)), as a Remotion project.
Divan is a situation and decision room for Iran: <https://divan.ahura.cloud>.

This folder only draws. A composition draws exactly what the site hands it
(`src/props.ts`) and nothing else: no text of a Reel is written here. The
plan, the content, the owner's review and the posting live in the site.

**One style since 21 Nov 2026** (owner, 20 Nov: «هر پروژه یک سبک»): the navy room of «تصمیم امروز». Every Reel is the
composition `decision`, drawn from a storyboard; the bible's twelve templates are content, not compositions.

| file | what |
|---|---|
| `src/map-engine/` | the shared map engine (Natural Earth with Persian names, d3-geo, globe and dives, fills, hatching, lines, comets, pins, measures, labels, flag chips); see its README |
| `src/storyboard/` | the content types, the twelve templates, the director (a shot every 1–2 s on the narrator's words), the checks, the novelty rules, the renderer (`Reel.tsx`), the Story and the tile |
| `src/decision/` | the older card props (`types.ts`) and their checks (`timeline.ts`); such props are converted (`storyboard/fromDecision.ts`) |
| `qa.mjs` | the quality gate on the file (no still over 2 s, legible, sync, loop) and the 1 fps contact sheet for the vision judge |
| `music.mjs` | the score, synthesized for each Reel's own length |
| `worker.mjs` | asks the site for work, renders, runs the gate, hands the files and the sheet back |
| `samples/` | `divan-strait`, `divan-table3`, `divan-today` (21 Nov 2026) and `decision-oil` (the card layout, converted) |

The sections below describe formats that were retired on 21 Nov 2026; they are kept for the history of the page.

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

## «تصمیم امروز»: the decision room (19 November 2026)

The owner's word on the first samples: «خوب و قشنگ بود»; the voice must be the ElevenLabs narrator, the
animation checked frame by frame, and a gate. One composition, `decision` (`src/decision/`), draws «تصمیم
امروز» and the formats made from the same day's analysis (props.variant: `today`, `advisor`, `scenarios`,
`number`, `council`, `week`); the site's writer is `lib/agents/decision.ts`.

- The stage holds the event from frame 0: a live map (targets that pulse, burning tankers, a transfer at sea,
  paths whose dashes flow), the chart of the last days (`number`), or the news wire with its headline typed in.
- Then what weighs on the decision (one or two fact cards, or a chart in the fact scene), two or three cards
  (roads, scenarios, advisors with a seal and «هوش مصنوعی», last week's decisions), Divan's estimate on a gauge
  when there is one, and a poll-style close with the badge; the last 14 frames bring the first picture back.
- The chart is drawn by a pen that runs from the oldest point to today's (a clip, not a dashed stroke: the
  dashes of the first sample showed the line's far end before its start); the counter reads the value under
  the pen, so it lands on today's figure with it.
- The room is deep navy, never near-black (the gate counts near-black pixels), with a slow breath of the camera
  over the whole Reel that ends where it began.
- `src/decision/timeline.ts`: the scenes follow the narrator's lines (each as long as its line, never less than its
  minimum), and the checks made before anything is drawn (`props.qc`): 15 to 35 s, a hook of at most 7 words,
  the event on the stage, at most three big texts, the narrator from frame 0, every card's text inside its room,
  every piece of evidence with its source, no «·» or «|» beside Persian, the AI advisors labelled, every card's
  rows in before it leaves, the chart's pen done with time to read. `gate.mjs` `enforceDecision` adds the file
  checks (a frozen stretch, the loop, the loudness, the darkness); the worker hands back nothing that fails.
- Music: the dark drone of the set style (`props.drone`). Sample: `samples/decision-oil.json` with its ElevenLabs
  take `decision-oil.voice.json` and tile `decision-oil.cover.json` (Samples workflow: `decision:decision-oil`).

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
- Two formats of 15 November 2026 are drawn only in this style, 15 to 25 s
  each: «ایران در برابر …» (`versus`: two flags waving on brass poles
  (`src/set/flags.tsx`, drawn by code) and the weapon of each kind as a model
  in three dimensions (`src/set/models.tsx`, CSS 3D on SVG layers, no WebGL),
  a card per state with its figure counting up, «نامطمئن» on a figure the site
  doubts, the kind's own source line with both tables' dates) and the war map
  (`war`: a relief map with pins that drop and stand on it, the day counting
  at the top, the three places named most often as numbered pins and cards,
  the last seven days' pins pulsing). Both fit their scenes into 25 s with the
  narrator's lines (`VIRAL_MAX`). Samples: `set-versus-sau`, `set-versus-tur`,
  `set-war`.
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

### Round 1 of «میز اتاق وضعیت» (16 November 2026)

After the owner's template review:

- **The close** (`plans.ts` `close`, `CLOSE_MIN`, `CLOSE_SETTLE`): the camera
  goes straight home; the first picture stays on the table; the question
  takes the hook's place for about two seconds with `divan.ahura.cloud` as its
  last line; then the hook's question is back for the loop. About three
  seconds. There is no card for the address any more, and the narrator's last
  line for the set formats is one short sentence (the site's
  `lib/social/voice.ts` `SET_CLOSE_LINE`).
- **Lines** (`fit.ts` `breakLines`): the fewest lines that fit, and of every
  way to cut them: no lone word, a sentence kept whole on its line, then the
  lines nearest in width. «تولید نفت خام. / یعنی چه؟», not «تولید نفت / خام. یعنی چه؟».
- **The table's near edge** (`props/TableRail.tsx`): a walnut rail with a
  brass inlay, a brass rule and the series' ribbon fill the bottom 300 px, under
  the platforms' caption rows. It carries no word.
- **A colour a series** (`signal.ts`): crimson for the war, amber for the
  figure, steel blue for the decision, ivory for the comparison. The tile
  (`CoverSet.tsx`) wears it as a ribbon on its upper left (the upper right is
  where Instagram draws its Reel mark on the grid), as the seal's ring and in
  the light, and shows the episode's `mark` (its figure, its day, its score)
  in it. The site gives a tile that would repeat a recent one the day as its
  mark (`lib/social/covers.ts`).
- **Gate**: `close` (3.8 s at most from the close to the end, and never only
  words on the table) and `balanced` (no line of one word beside full lines).
- **Assets**: every new set piece is a file of its own with an entry in
  `src/set/props/manifest.json` (name in English and Persian, what it shows,
  tags, how it was made, licence, origin) for Ahura's shared asset library.

## The topic's objects on the map (21 November 2026)

The owner: «آبجکت‌های خاص همون موضوع برای دیوان درست بشه، مثلاً کشتی یا هر چیزی که بحث میشه». Every map now shows the
real things the narrator talks about, never an abstract shape.

- `src/map-engine/object-ids.ts` and `objects.tsx`: twenty objects drawn in code (SVG, about 200 px on the finished
  frame, outlined for the night map): tanker, container ship, LNG carrier, warship, fast boats, naval mine, missile,
  drone, fighter jet, offshore rig, refinery, pipeline, oil barrel, nuclear site, tank, troops, parliament, money,
  signed agreement, sanctions padlock. Ships are seen from the side, aircraft from above. Each moves in its own way:
  `sail` (along a line, with its wake), `fly` (with its shadow), `orbit`, `arc` (a missile between the writer's two
  places, a burst where it lands), `drop` (a missile coming down onto the writer's pin; no launch site is drawn),
  `pipe` (a pipeline laid along a line, the flow running) and `stand` (lands, then keeps a flame, steam or a flag
  moving); `fire` sets a ship burning after it is hit. Registered for Ahura's asset library in
  `objects.manifest.json`.
- `src/storyboard/topics.ts`: a keyword classifier in Persian and English (whole words; «همین» is not a mine) names
  the objects of each beat, in the order the line says them, and places them where the story already is: the n-th
  sentence that names an object goes on the writer's n-th pin (a burning tanker, a mine beside it, a missile coming
  down), a ship sails the beat's own comet or the sea lane in view, a parliament, money or the padlock stand on the
  capital of the beat's state, talks on their venue, a nuclear site on a town the line names (city level only). A beat
  that names nothing shows the Reel's main thing; a Reel that names nothing falls back on its template's object. It
  runs inside `enrich()`, before the ground labels; pure and idempotent. A road drawn on the map carries its road
  object (a tanker sails its line, a barrel or a signed text stands under its cost).
- Labels keep clear of the objects (`LineBoxes`), and an object of the first frame runs back to where it stood, so
  the loop still ends on the first picture.
- Pass 3 rules (`topics.ts` `settle`, the director, `Reel.tsx`): what floats stands and sails only on water with its
  whole hull (Natural Earth land, nearest sea point); no object stands on or sails through a place name the writer
  put on the map; two standing objects never overlap; a beat's objects are there from its first shot, and a ship that
  is hit catches fire only when its pin or the missile lands; a missile's burst is short and draws under the ship.
  Pass 4: a name keeps its room on the widest frame a beat is seen in (the opening dive too), and objects shrink with
  the map when the camera is wider than their beat (to 0.55 of their size).

### Round 4 (owner, 21 Nov 2026: detail, accuracy, text, length)

- **Objects as illustrations** (`objects.tsx`, shared paints `ObjectDefs`): a VLCC with its aft house, pipe rack and
  manifold cranes; a container ship with its bays; a Moss LNG carrier; a destroyer with its gun, cells, radar panel and
  mast; types by name (`variant`: Shahed-type or MALE drone, F-35 or Su-35, ballistic or cruise missile, Iran's Majlis
  or the Capitol); a waterline and foam, wakes, contrails, exhaust plumes, smoke that drifts with the wind, lifeboats
  pulling away from a burning ship. One scale for all (a destroyer about 0.8 of a VLCC).
- **Real routes** (`data/routes.json`, GeoJSON with a source and an accuracy on each): the Hormuz traffic separation
  scheme's outbound (south) and inbound (north) lanes, the Red Sea route, and the Goreh–Jask, East–West and
  Habshan–Fujairah pipelines. Ships sail the real lane in its own direction; a pipeline a line names is laid on its
  route. The test checks every sea lane is water on the 1:50m and 1:10m coasts.
- **Events in order**: a ship sails in along its lane, lies at the reported point when the incident lands, then burns;
  a missile or a drone comes down on the point (never from a launch site); the time or date the line or the source gives
  joins the callout on its leader line; a place the source calls approximate is an area, not a pin.
- **Map detail** (`detail.tsx`, data `sea-detail.json` from Natural Earth 1:10m by `scripts/build-sea-detail.mjs`): the
  200 m and 1000 m depth bands, the 1:10m coasts and small islands of Hormuz, islands and ports named small on close
  maps, a scale bar and a north arrow on map beats.
- **Text** (`storyboard/textcheck.ts`, the check `text`): no filler, clean Persian spelling, no named place far from its
  mark. On the site, `lib/agents/factcheck.ts` checks every line against the reports with Claude before a draft is
  kept; unsupported lines are rewritten or cut, and the log goes with the Reel (`factcheck`).
- **Length follows the content** (`director.ts` `readFrames`, `checks.ts` `LENGTH`): a beat stays until its words can be
  read at 2.75 words a second plus a second to look at its map; a Reel runs 15–90 s (YouTube up to 600 s).
- Round 4, pass 2: the ground's lane comet loops (the camera never chases traffic away from the story); the camera
  follows a pipeline's route or a ship's lane; a callout whose place is off the frame is not drawn; a label with no
  free place takes the one that covers least; a place name rises above an object passing under it, on a leader.
- Round 4, pass 3: a claim beat (two or more states' callouts) frames every claim point in every shot, and a claim is
  never hidden off the frame; all words on the map are placed against each other (scale and measures, then callouts
  and their leaders, then place names); the flag stands where a callout's words begin; the north arrow sits beside
  the scale, not on it; a callout that only repeats the headline is dropped; the clipped 1:10m coasts lose their stroke.
- Round 5: callouts read at 4.5:1 against the ground sampled under them (contrast.ts, WCAG), with a halo, and a larger
  sub-line; a beat's callouts are placed once on its look and carried with their places (no jumps), clear of objects,
  smoke and lanes; every later shot of a map beat brings a new mark (exact shot count in enrich, standing things come
  in one by one, more Saudi places); a hook standing where the story's strike lands shows the strike on shot 1; the
  camera keeps a beat's main standing thing inside the safe frame.
