# Nothing blinks (22 Nov 2026)

Owner: «نوشته‌های روی نقشه و جاها و بعضی وقت‌ها آبجکت‌ها یهو ناپدید و دوباره تولید میشن».

- `before-*.jpg`: frames of the pass-5 samples (map1, before the fix); `after-*.jpg`: the same frames of this render.
  The yellow number on each tile counts from the strip's first frame (strait-tankers starts at frame 72, strait-names at
  348 every 2nd frame, abqaiq-refinery at 116, abqaiq-names at 820, abqaiq-disc1 at 586 every 2nd frame).
- strait, frames 75 to 77: before, the six tankers are gone for 3 frames at the cut from the hook to beat 1 and come
  back; after, they sail on through the cut.
- abqaiq, frames 820 to 834 (the dive to the Red Sea): before, the names of states and cities trade places every frame;
  after, each keeps its place or fades out.
- mapcheck (rule `blink`, every frame) on the old engine: 22 blinks in divan-strait, 24 in divan-abqaiq. On this one: 0
  and 0; the gate and the quality checks pass on both.
