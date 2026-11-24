# Lessons of Divan's Reels

The owner's rule (21 Nov 2026): «هر ایرادی که می‌گیری از ویدیو باعث بشه نسخهٔ ایده‌آل بهتری بشه تا به ۱۰ برسیم». Every
flaw the judge or a frame-by-frame review finds becomes a fix in the engine or a template, never a patch on one
video, so every later Reel inherits it. Each round: render on GitHub (Samples workflow), the 1 fps contact sheet
scored twice by the Claude vision judge (`lib/social/judge.ts`, the median kept) beside our own honest score.

Samples: «تنگه» (`divan-strait`), «میز سه‌جانبه» (`divan-table3`), «تصمیم امروز» (`divan-today`). No narrator in these
rounds (ElevenLabs is out until 27 Nov 2026): the captions run on guessed word times.

## Scores

| round | «تنگه» | «میز سه‌جانبه» | «تصمیم امروز» | what changed |
|---|---|---|---|---|
| 1 (divan#27) | 5.65 | 6.3 | 5.6 | the map engine, one style, the storyboard director, the QA gate |
| 2A | 6.5 | 6.7 | 5.95 | full-screen map, a camera move every shot, roads as lines, Iran the only amber, one source line |
| 2B | 6.4 | 6.6 | 6.25 | labels off the coast with a flag, comets that keep running, nothing near-black |
| 2C | 6.5 | 6.95 | 6.6 | the ground names itself, moves of 0.7 s out to the region and in, actor fills seen |
| 2D | 6.4 | 7.1 | 6.5 | roads and demands fill their states, the close gathers the story on the hook's map |
| 2E | 6.4 | 6.9 | 6.9 | a map with words on it stays flat (labels keep to their points) |

Each score is the judge's median of two runs (`lib/social/judge.ts`, same prompt and references). A spread of ±0.3
between runs is normal, so changes under 0.3 are noise.

## Round 2

### Pass A: flaws of round 1 and their fixes

| flaw (seconds are round 1's) | where it was | fix in the engine |
|---|---|---|
| one framing held for about 20 s («تنگه» 1–21 s; «میز» 20–29 s); the camera only pushed 14 % a shot | `director.ts`: every later shot of a beat was a small push | a camera vocabulary (`MOVES`: push, pan, pull, lean), a different move every shot, started at a different place each beat; tilt and roll are part of a look (`camera.ts`), so the map leans back like a table and turns a little |
| the map a panel between header and caption; small next to @atlynxmaps | `Reel.tsx` `STAGE` y 520…1480 | the map fills the screen; scrims at the top and the bottom keep the header and the caption legible |
| amber land flooding the frame («تنگه»); the map not dark enough | fills at 0.62 for every actor | night palette (`theme.ts`, kept above the gate's near-black line); Iran the only amber (0.46, 0.3 when close, glowing edge), every other state a tint (0.26 / 0.16, no glow) |
| the roads read as cards: an object icon, a three-line card, the AI disclaimer on each | `RoadPic` | a road on the map is its line: the comet leaves a glowing route (`CometTrail route`), the letter and title are the header, the cost a label with a leader line where the line ends, the AI label once as a chip beside the kicker |
| boxed demand cards («میز» 13–29 s) | `DemandPic` | the demand is a label on the state's capital (`CAPITALS`), the camera keeps on it |
| a frozen row of flags over a dimmed globe («میز» 9–12 s) | `FlagsPic` | each flag stands on its capital on a pole, the camera flies from one to the next |
| a dimmed still behind the poll; no return to the first picture | dim 0.8 under every picture | the poll flies home to the hook's map, dim 0.3, options as dark pills over it; charts and figures dim to 0.55 only |
| source lines of two or three rows under every shot, illegible | `Source` | one line, one place (y 1414), the outlets only (`shortSource`: «سپاه، UKMTO»); the full line stays in the post's caption |
| in-map labels too small at phone size | callouts 46 px, place names 40 px, the measure 52 px | 60, 52 and 64 px |
| the turn only captioned («دو حادثه، یک روز») | pins | a red pin lands with a shock ring and a red flash at the screen's edges |
| the hook a still frame when the concept gave no opening | `cameraKeys` | with no opening the hook dives from 2.4 times wider and leaning back |

Scores after pass A (judge, two runs, median; ours in brackets): «تنگه» 6.5 (6.2 / 6.8) [ours 6.0], «میز سه‌جانبه» 6.7
(6.6 / 6.8) [6.5], «تصمیم امروز» 5.95 (5.6 / 6.3) [5.5]. The gate failed «dark» on two (41 % near-black): the scrims and
the sky were under luma 26.

### Pass B: what pass A still got wrong

| flaw | fix in the engine |
|---|---|
| 41 % near-black (gate) | scrims and sky in the room's navy (luma above 26) |
| labels lying on the coast and the comet; boxes cut at the frame's edge | a label stands 56 px off its point on a leader (`place(…, gap)`); Persian bold measured at 0.58 of its size, not 0.52 |
| who says it is only in small grey words | a callout carries the flag of whose claim it is (`a3`; the map writer sets it from the claim's state) |
| holds of 4–6 s on one state with nothing moving | the comets of the beat on screen keep running along their route (a trip every 1.8 s) |
| the small roll read as a wobble | no roll; a pan travels a third of the frame when the shot brings nothing new |
| the road title over the kicker (16–27 s of «تصمیم امروز») | the HUD on one line, the AI chip short |
| a boxed demand under a flag in a corner | the flag and the state's name are the header; the demand is the label on its capital |
| two layers of words (a label and the caption saying the same) | the caption gives way while a label of the beat is on the map |
| the end only half returns, faded | the poll flies to the hook's exact frame; the last 0.8 s is the hook's picture and words, sharp |
| the chart competes with the map under it; the gauge over a still globe | the chart dims the map to 0.78; behind any picture a globe turns 14° a shot |

Scores after pass B: «تنگه» 6.4 (6.4 / 6.4) [ours 6.0], «میز سه‌جانبه» 6.6 (6.6 / 6.6) [6.5], «تصمیم امروز» 6.25
(6.2 / 6.3) [6.0]. Every gate check passed. The judge: still «one framing» inside a beat (the moves too small to read on a
sheet of one frame a second), no names on the ground, thin comets, the end only in the last 0.5 s.

### Pass C

| flaw | fix in the engine |
|---|---|
| moves too small to read: a sheet of one frame a second sees one framing | each move is made in 0.7 s, then the camera creeps on; a pull goes out to the region (2.4 times the beat's frame), a push twice as close; bounds 0.4 to 2.8 |
| no names on the ground (Oman, the UAE, the seas) | `ContextNames`: the seas, cities and states whose point is in the frame, quiet, never within 150 px of a mark that speaks; the places list gains Berlin, Doha, Muscat, Fujairah, Riyadh, Baghdad, Ankara |
| other actors hardly seen | fills of the other actors at 0.4 (0.26 close); Iran 0.5 |
| thin comets | a brighter, wider head glow; the coast a lit line (`landEdge`) |
| the gauge and the poll held still | the gauge's roads land one by one with a ring each; the poll's options one by one |
| the chart as a dim overlay | a glass panel over a half-lit map |
| the return only in the last half second | the loop is 1.3 s: the hook's words back at once, the camera home |

Scores after pass C: «تنگه» 6.5 (6.4 / 6.6) [ours 6.3], «میز سه‌جانبه» 6.95 (6.8 / 7.1) [6.8], «تصمیم امروز» 6.6
(6.6 / 6.6) [6.3]. Gate: all pass.

### Pass D

| flaw | fix in the engine |
|---|---|
| «میز ایران و آمریکا کجاست؟» opens on a frame without America | `hookFrom`: when the hook fills states out of its frame and the concept gives no opening, the first frame is the globe turned to hold them all, then the dive |
| the close a card wall over a dim map; the story gone at the end | the close gathers every line and pin of every beat (the roads too) back on the hook's map, comets running; options in the lower third over a map dimmed only 12 % |
| each road the same thin diagonal | a road fills the states its line joins (capital to capital, point in polygon on Natural Earth) in the road's colour, breathing; a demand fills its state |
| the chart leaves the map | the chart in a panel on the lower half, the map lit above it |
| two layers of words | captions one size down (46 px, weight 700) and gone while a label speaks |

Scores after pass D: «تنگه» 6.4 (6.4 / 6.4) [ours 6.4], «میز سه‌جانبه» 7.1 (7.0 / 7.2) [7.0], «تصمیم امروز» 6.5
(6.4 / 6.6) [6.6]. Gate: all pass. Our own frame review found the cause of the judge's «labels that drift and leave the
frame»: the lean (a CSS tilt of the map) moves the map under labels placed on the flat projection.

### Pass E

| flaw | fix in the engine |
|---|---|
| labels off their points and past the frame's edge under a leaning map («میز» 13–29 s) | a beat with words on the map (a label, a measure, a demand, a road's cost) is seen flat; only a beat without words leans |
| the caption under the poll ran into the badge | no caption under the poll (its options are its words) |

Scores after pass E: «تنگه» 6.4 (6.4 / 6.4) [ours 6.4], «میز سه‌جانبه» 6.9 (6.8 / 7.0) [7.0], «تصمیم امروز» 6.9
(6.6 / 7.2) [6.8]. Gate: all pass.

## What still stands between these Reels and 10

1. **The content is thinner than the engine.** The judge asks every round for the six tankers as six pins, the
   incident path, the shipping lane, IRGC against UKMTO in two colours, the three clauses as zones. The engine draws
   all of that; the writer (`lib/agents/maps.ts`, `decision.ts`) hands it one or two marks a beat, and only from
   places it knows. Next: the writer asks for a mark per 1.5 s of a line, the reports' places geocoded into
   `PLACES_FA` (sea areas as polygons for hatching), the shipping lane as a known line, and a beat may not hold a
   frame without a new mark. Facts we do not have (where each tanker was hit) stay off the map: we never invent a pin.
2. **No narrator.** The captions run on guessed word times and the judge counts them as a second layer of words.
   With the ElevenLabs narrator (after 27 Nov 2026) the cuts land on spoken words, the captions are the voice's, and
   the music ducks under it. The judge sees only frames, so the voice will lift the Reel more than its score; re-judge then.
3. **Labels that do not fit.** A demand longer than about 20 letters is wider than the safe frame at 60 px and is
   cut at the left edge («به گفتهٔ آمریکا: هرمز باز بماند»). Next: a callout's size shrinks to fit (down to 44 px) or
   breaks into two lines; the writer keeps a demand to four words.
4. **The chart and the gauge leave the map.** The judge wants the price on the map (a figure over Hormuz on a tanker
   comet) and the gauge's pins moving with their roads' comets. Next: a `price` mark and a gauge drawn on the map.
5. **Comets read thin at phone size.** Next: a thicker trail with a dashed route under it, and a comet head in the
   actor's colour.
6. **The 1 fps sheet is the judge's whole view.** Motion between seconds (the dives, the creep) is invisible to it;
   a 2 fps sheet or a short clip would judge the motion fairly.

## Round 3 (21 Nov 2026)

### The judge, re-based

The judge read one frame a second: every move between two seconds was invisible to it. Since round 3 the contact sheets
are **two frames a second, 20 s a sheet** (ten across, four down, each frame with its time, «12.5s»), and the judge
reads a Reel's sheets in order (`qa.mjs` `contactSheets`; the worker sends `sheet`, `sheet2`, `sheet3`; `run.ts` and
`judge.ts` take them all). Claude's vision takes images, not video, so a clip is not an option; one sheet for a whole
Reel would be shrunk past reading. The reference sheets were already two frames a second.

Round 2E re-judged on 2 fps sheets (the fair baseline): «تنگه» 6.7 (6.4 / 7.0), «میز سه‌جانبه» 6.9 (6.6 / 7.2),
«تصمیم امروز» 6.35 (6.3 / 6.4). Within the noise of the 1 fps scores (6.4, 6.9, 6.9).

### Pass A

| flaw | fix |
|---|---|
| the writer hands one or two marks a beat; the map holds a frame with one comet | the map writer (`lib/agents/maps.ts`) is asked for a mark per 1.5 s of a beat's line, from the reports only: a sea area the report names (`zone`, hatched: «in and around the strait» is the zone, never invented points), the shipping lane (`lane`), the ports and cities it names (`label`); what it leaves short is filled from the ground in view (`enrich.ts`: the lane as a traced route, then the names of places in view), never with news; the site and the renderer both run it |
| IRGC and UKMTO told in one colour | a claim carries its claimant's state: its colour and its flag; a link one side claims and the other has not confirmed is dashed |
| a long label cut at the frame's edge | `fitCallout`: 60 px if it fits, down to 44 px, else two lines broken nearest the middle |
| the oil chart leaves the map | a chart with a `place` (the writer sets Hormuz for oil) is a price tag on the map: the figure counting under the pen, a small line of the last days, a leader to the strait, the lane's tankers under it; the camera moves over it |
| the gauge a bar over a still globe | each road's rider travels its own line toward Iran and stops where Divan's estimate puts it; the bar in the lower third moves with the riders |
| a demand held 4 s on one state (13.5–17.5 s) | a beat with a line follows it after its first two shots: out to the line's middle, then to where it lands |
| the poll's address over its options | the chip and the address on one row under the options |
| thin comets | wider trail and head |

Scores after pass A (2 fps): «تنگه» 6.35 (6.3 / 6.4) [ours 6.2], «میز سه‌جانبه» 7.2 (7.2 / 7.2) [7.0], «تصمیم امروز» 6.8
(6.8 / 6.8) [6.7]. Gate: all pass. «تنگه» fell: the camera followed the shipping lane out to empty sea (7.5–9 s).

### Pass B

| flaw | fix |
|---|---|
| the camera followed a lane out to empty sea («تنگه» 7.5–9 s) | a looping comet is traffic, not a story: the camera follows only a beat's own lines |
| the red hatching of the zone dominated every frame after it came | quieter hatching (lines 0.6, ground 0.12) |
| boxed labels over the route and the zone | labels as words on a halo with a shade, not a card; placed clear of every line on the map (`taken` boxes along the lines) |
| a dashed claim stands still once drawn («میز» 19–29 s) | a faint comet travels a dashed link while its beat is on screen |
| the price tag a card over the map | a smaller tag (the map stays the picture) |
| ghosted words caught mid-fade on the sheet | headers snap in (5 frames) |

Scores after pass B (2 fps): «تنگه» 6.6 (6.6 / 6.6) [ours 6.5], «میز سه‌جانبه» 7.0 (7.0 / 7.0) [7.0], «تصمیم امروز» 6.6
(6.6 / 6.6) [6.6]. Gate: all pass.

### Pass C

| flaw (asked in every round) | fix |
|---|---|
| «thick glowing comets with tails» | the comet's trail 24 px at its head, the head 22 px with a tighter glow |
| the caption strip repeats the headline | the caption is the narrator's words: no narrator, no caption (the samples have none until the ElevenLabs narrator is back; with it the captions return and must be judged again) |
| the end is the first frame only for an instant | home in 20 frames, then the last frames are the first frame itself, its comets running |
| a demand holds on its state for 2.5 s before anything moves | a demand or a road follows its line from its second shot |

Scores after pass C (2 fps): «تنگه» 6.6 (6.4 / 6.8) [ours 6.5], «میز سه‌جانبه» 7.4 (7.4 / 7.4) [7.2], «تصمیم امروز» 6.85
(6.6 / 7.1) [6.8]. Gate: all pass. **Pass C is the head of round 3.**

### Pass D (tried, reverted)

White words on a solid navy backing (no red on a red fill), one label at a time, a state's fill flashing when its label
lands, flags kept out of the title band, a bare price figure, the first frame held longer, bigger options. Scores: «تنگه»
6.4 (6.4 / 6.4), «میز سه‌جانبه» 6.8 (6.8 / 6.8), «تصمیم امروز» 6.7 (6.6 / 6.8): no better, and the two runs asked for
opposite labels (one: a solid backing; the other: «remove the opaque black boxes»). Reverted whole; the separate ideas
(one label at a time, flags out of the title band, the flash) are worth trying again one at a time.

### Round 3: scores (two frames a second)

| pass | «تنگه» | «میز سه‌جانبه» | «تصمیم امروز» |
|---|---|---|---|
| 2E re-judged (baseline) | 6.7 | 6.9 | 6.35 |
| 3A | 6.35 | 7.2 | 6.8 |
| 3B | 6.6 | 7.0 | 6.6 |
| **3C (head)** | **6.6** | **7.4** | **6.85** |
| 3D (reverted) | 6.4 | 6.8 | 6.7 |

### The plateau

Since 2B every pass lands between 6.4 and 7.4, and two runs of the same sheet differ by up to 0.6. The fixes now move
the score less than the judge's own noise. What the judge asks for in every round, and what stands in the way:

1. **Events the reports do not place.** «Six tanker pins dropping one by one», «a counter 1→6», «an orbit across the
   incident pins»: the reports name the strait, not six points. We draw the zone and never invent the pins. A source
   that gives positions (an agency's own notice naming the distance from a port, where it does) would let the writer
   place them honestly.
2. **The narrator.** No voice until 27 Nov 2026, so no captions (they are the narrator's words) and no cut on a spoken
   word; the judge sees a silent map. The next round must be judged with the ElevenLabs narrator.
3. **The judge's taste is unsettled on labels** (solid card or bare words on a halo): pick one from the owner's own
   references, not from the judge.
4. **Roads that share one geography** («تصمیم امروز»: three roads all Europe → Iran) come from the day's story; a
   road's own place (Doha, Washington) is used when the writer names it.
5. **Throughput:** a pass is about 17 minutes of render on GitHub; a voice and a source of positions would move the
   score more than another pass of polish.

## The owner's decision on map labels (21 Nov 2026)

The judge contradicted itself on labels (pass 3D: one run wanted a solid backing, the other «remove the opaque black
boxes»). The owner chose: **bare text with a soft shadow and a leader line, as on @atlynxmaps; no solid boxes.** The
callouts and the measure's length are now words with a soft double drop shadow, their colour in the words, the
leader and the dot; no backing, no bar. Iterations pause until the ElevenLabs narrator is back (27 Nov 2026); the next
round is judged with the voice.

## Nothing blinks (owner, 22 Nov 2026)

The owner: «نوشته‌های روی نقشه و جاها و بعضی وقت‌ها آبجکت‌ها یهو ناپدید و دوباره تولید میشن». Measured on the round-8
samples: 22 blinks in divan-strait and 24 in divan-abqaiq (a word or thing gone for 1 to 27 frames, then back). Causes:
every frame placed its words on its own (the ground's names greedy, nearest the centre, five at most: a newcomer pushed
an old name out for a few frames); a beat's things belonged to that beat only and the next beat drew the same tanker or
refinery afresh 3 frames after the cut; a ship whose hull touched a coast or a panel for a few frames went out and came
back. Now: the same thing on two beats is one thing (`markKey`, carried on with its clock, sliding when the new beat
moves it a little); a thing whose story ends fades out over 9 frames; the Reel is walked once in order (`reelTrack`):
names on the frame before keep their place first, a blink under 15 frames is never drawn, the shorter side of a gap
under 30 frames is dropped, and every word and thing fades in and out. mapcheck's rule `blink` fails any Reel where
something is gone for 1 to 30 frames and back.

## «یک دور» on the map engine (23 Nov 2026)

The seamless loop (#26, closed) was rebuilt in the one style: `src/loop/Loop.tsx` and its pure layout `src/loop/scene.ts`.
Two samples on `divan-render` branch `preview-loop-v2` (Samples, `loop:loop-dollar`).

| flaw in the first sample | fix |
|---|---|
| the line flat in the lower third of its panel: the site's 0–100 frame keeps its own padding | the plot is scaled to the readings (first on the left edge, today on the right, lowest and highest 8 % inside) |
| the axis dates' words in the wrong order («خرداد ۱۴۰۴ ۲۳»): an SVG `<text>` runs Persian without the page's direction | the two dates are HTML in `direction: rtl` |
| (from #26) a figure that rolled through values between two readings | the figure on screen is always the reading at the pin, with «حدود» when the site marks it approximate |
| (from #26) two events close together would flash their words for a few frames | the draw rests at each event; every leg at least 22 frames (`MIN_LEG`, tested) |

### v3 (24 Nov 2026)

| flaw of v2 (6.5) | fix |
|---|---|
| the map a still amber backdrop: only a small sway | the camera drifts across Iran once a turn (±1.6°), rises and falls twice, breathes ±6 %; Tehran's pin travels with it |
| nothing on the map answers the story | each event sends a ripple from Tehran over the map and lifts Iran's amber for 1.2 s |
| the pin's ring on a 1 s clock unrelated to the music | the turn is 288 frames, sixteen beats of the 100 BPM bed; the pin swells on each beat (the beat's phase against the track is not measured) |
| the bottom fifth empty | the events' strip: a numbered disc an event at its date, filled as the pin passes, the same numbers on the line and in the event's row |
| samples on the synthesized drone | `render.mjs --track` takes the library track the worker would (`samples/loop-dollar.track`) |

### v4 (24 Nov 2026)

| flaw of v3 (7.5) | fix |
|---|---|
| today's red dot over disc ۶ at the strip's end; the strip's pin over a disc's number | no dot at the end (the line's red point is today); the pin drawn under the discs |
| the pin's beat on the tempo but not on the track's beats | `music.mjs` `beatOf` measures the folded bed (onsets, tempo by autocorrelation, phase of the turn's 16-beat grid); the renderer hands the first beat in as `beatPhase` |
| the strip at y 1600–1690, under Instagram's caption | the strip is the chart's time axis inside the panel; the panel, source line and caption row move up; every box ends above y 1500 (tested) |

v2 seam: SSIM 0.999 (threshold now 0.99), sound 1.0 dB apart, wrap jump 4.2 % of the peak; mapcheck (with `blink`, read across
the seam) passes on every frame; −14.2 LUFS, true peak −2.5 dBFS.
