# Pass 5: frame-by-frame judgement (2 fps sheets)

Rendered on the public `divan-render` workflow (`preview-map-objects`, two renders, the last Samples run 44997654804).
Mapcheck: PASS on every frame of both (`--every 1`, local, on the code as committed; the workflow's `--every 2` also
passed). Tests workflow: passes. Gate: both pass. The Abqaiq render that first failed `hook-short` (its title stayed until 4.0 s) was redone with the fix
(Samples run 44998394226, Abqaiq only): the hook title holds until 2.0 s, all checks pass.

## What changed
- **A followed line** (`director.ts followOf`): when a beat's story is a pipeline longer than half its frame, with its
  one numbered place at the far end, the camera follows the line. The line draws from its start while the camera
  travels with it: start, middle, end. At the end the disc, the thing standing by it and its legend row land; then the
  camera pulls back to the beat's frame. The camera glides through each shot instead of whipping.
- Abqaiq «راهی بی‌هرمز»: the East-West pipeline is drawn from the Abqaiq plant to Yanbu. Yanbu's disc ① and a tanker sit
  on the Red Sea, with the row «ینبع، پایانه در دریای سرخ». The beat's frame is the Yanbu end (span 8).
- **The hook keeps its title** through its first beat (the hook is at least 2.5 s), and never past 3 s.
- **No header blink:** a beat's header snaps in on its first shot and then stays through the beat's cuts (it used to
  re-fade on every shot; 11.0 s in pass 4).
- Tests: on a followed line, a shot before the end brings the line itself (`motion.follow`).

## «تنگه» (divan-strait, 29.5 s): 8.2 / 10
- 0–2.0 s: «شش نفتکش، فقط یک هفته» stays on while the six tankers (about 108 px) sail in; 2.5 s «یک هفته در هرمز».
- 9.5–15.5 s: the measure is on with its header; the header no longer blinks at the cuts (11.0 s).
- 16–24 s: ① and the mine, then ② and the burning tanker, then the camera turns ①, ②, ① with the rows lit.
- Still weak: one whip frame into each beat (2.5, 9.5, 15.5 s); the six sail as one diagonal row.

## «ابقیق» (divan-abqaiq, 40.0 s): 8.0 / 10
- 27.5–34.5 s, which used to be a 6.5 s hold: 28.0 s the plant at the pipeline's start; 28.5–31.0 s the pipeline draws
  west as the camera travels with it across Arabia; 31.5–32.0 s Yanbu: disc ①, the tanker in the Red Sea and the
  legend row; 33.0 s مدینه, ینبع, جده; the oil flows along the line.
- 11.6–19.6 s, the share beat (pass 4): each shot a real change; discs off the pipeline's end circles.
- Still weak: the whip frame at each beat cut (11.5, 19.5, 27.5 s); the middle shot of the followed line is only
  the line and a desert map; the four names at 33.0 s land together.
