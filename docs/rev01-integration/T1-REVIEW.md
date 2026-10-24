# T1 review: ACCEPT

Nothing blocks acceptance. I found no gameplay contradictions, no missed or doubled 4/3 scaling, and no weakened tests. The three findings below are all Low and don't block.

## Findings

**1. Low: interceptors in 5-ship waves leave the screen one tick earlier than on main**
- **Where:** `src/systems/combat-enemies.ts:31` (spawn rows) and `:67` (the `y > w(300)` check). The test claim at `tests/rev01-timing.test.ts:17-19,79` says too much.
- **Trigger:** every interceptor wave with 5 ships. That is the stage 1 wave at t=8 and most interceptor waves in stages 2 and 3.
  - All five ships are removed at ticks 483/504/525 instead of 484/505/526.
  - On main, y lands exactly on 300 at tick 483 because of floating-point rounding. In the migrated maths it lands just above 400 at the same tick.
  - I checked this against the production formulas at dt = 1/60. 4- and 6-ship waves, gunships, sweepers, minelayers, wardens, pickups and the y-65 speed change all hit the same tick as main.
- **Impact:** the ships are already off-screen. The enemy count drops one tick earlier, so a wave held back by the enemy cap can spawn 16.7 ms earlier.
- **Fix:**
  - Accept it as rounding noise and record it in DECISIONS.md.
  - Change the timing test's "every position-driven event happens on the same tick" claim: it holds only because the test starts at rows like −22.25 that avoid the tie.
  - Add the real spawn rows (−22, −36, −50) to the trajectory test and pin the exit tick you actually see.

**2. Low: no clean hook yet for T2's nova atlas and T4's font mask**
- **Where:** `src/services/rev01-assets.ts:143-181`.
- **Trigger:** both images are derived from a PNG before upload. To get them loaded, T2 and T4 must each edit `REV01_CLAIMS`, `rev01StageImages` or `rev01ScreenImages`. That file is outside both tickets' allowed files.
- **Impact:** if T4 gives its mask the id `rev01-font` while `font` is still claimed by the HUD and menu groups, the engine throws `Conflicting asset identity` (in `assets.js` when loading). Stage or title loading then fails.
- **Fix, before T2–T4 start:** either
  - add per-owner extension arrays now that the claim functions read from, and use distinct ids (`rev01-nova-atlas`, `rev01-font-mask`); or
  - state in the T2 and T4 briefs that the orchestrator applies these claim patches.

**3. Low: an old socket helper still returns unscaled values**
- **Where:** `src/services/campaign-assets.ts:23`, `engineSockets()`.
- **Trigger:** it still returns 480x270-unit sockets and nothing calls it now. A later caller would silently skip the 4/3 scaling.
- **Fix:** delete it in T5 with the other dead loaders. Tell T3 to use `ENGINE` or the spec sockets only.

## Evidence gaps
- **Nothing has run in a browser yet.** This covers the new display sizing (device-pixel resize observer, DPR change, fullscreen) and the extra rev01 images each stage now loads (44–46 per stage, 8 on the title). Every Node test and the campaign bot pass `assets: []`. A rev01 image failing to load would stop stages starting in the real game while every check stays green. I recommend one production-build smoke test (title → start each stage → pause, at 1x and 2x) before T2–T4 build on T1. Otherwise, state explicitly that T5 covers it.
- **Test count:** the brief cites 55/55, but `npm-test.log` shows 57/57 passing.
- **Menu click areas** were migrated without a test. Reading the code, the click areas match the drawn items (x 208–432, same rows). T4's pointer-rectangle tests should cover this.

## Verified, no action needed
- **Scaling:** every value the brief listed is scaled by 4/3 exactly once. That includes speeds, accelerations, spawn positions, culling bounds, curtains and rings, beam y and lane clamps, and boss sockets (scaled once in `boss-geometry.ts`, no double scaling). It also covers camera shake (amplitude and decay rate, so durations are unchanged), particles and the bot heuristics (squared-distance terms scaled twice).
- **Not scaled:** sweeper side flags, bank response, deadzone, random draws, times, HP, damage and score are untouched.
- **Spec exceptions:** radii, the 15/13 px beam lanes and the 24..616 × 57..319 player clamp come from the spec. Weak-point radii exist in the old metadata but nothing in the code uses them, so there is nothing to scale.
- **Motion tests:** they pin the trace I re-derived from the main model (glide 17 + 1/24 px; reversal reaches −155 at frame 10 and −175 at frame 12; overshoot 10/3 px), times 4/3, every frame, to 1e-9. No production movement was tuned. The other test edits keep or tighten the old assertions.
- **Native frames:** strips are top-aligned (matches `pixlib.strip`) and checked against the PNG sizes. Odd-pixel pivots, the −90° rotation and flip were checked against the engine's quad maths. JSON import under Node works without fetching any image, and all 53 literal URLs are in the build.
- **Nova:** 11 frames / 560 ms, fade-3 excluded. The sparse atlas plan respects the device texture limit (2048x416).
- **Pixel snapping:** `pixelSnapped` with whole-pixel shake gives exactly the engine's old rounding (`renderer.js` rounds after subtracting the camera).
- **Layers and render split:** the 52-slot layer table matches the spec categories. The render passes draw in the same order as before the split.
- **Display:** the scale is computed in device pixels, the offset lands on a whole device pixel, and small windows are clipped evenly on both sides. Fullscreen targets the document element, so the browser's fullscreen styles never stretch the canvas.
- **Art and branch:** I recomputed the art hashes: 114/114 match `baseline.json`. main = HEAD = 840fc0a. `src/assets`, `vite.config.ts` and `package.json` are unchanged.

## Left to later tickets (not T1 defects)
- Kiln ≥34 px lag cap (T3).
- Replacing the old sockets with native spec sockets (T2/T3).
- Menu pixel snapping and opaque HUD bands (T4).
- Native backgrounds (T5).

## Limitations
- This was a static review plus small Node calculations. I did not run `npm test`, the build, the bot or a browser, per the brief.
- The flip and −90° rendering is checked by maths only, not on a real GPU.
- I could not write the plan file because the Write tool is disabled in this session, so the report is only in this reply.
- No background commands are running.

Model: Claude Opus 5.5 (`claude-opus-5-5`). The brief asked for xhigh effort; I can't confirm the actual setting from inside the session.
