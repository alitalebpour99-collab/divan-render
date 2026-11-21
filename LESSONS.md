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
