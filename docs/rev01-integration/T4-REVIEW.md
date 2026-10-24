**Verdict: ACCEPT for the T4-owned scope.** This is not integrated acceptance. Final acceptance still needs P1–P7 applied, all native text callers wired, the 3x5 shim deleted, the title switched to native art, and T5's browser captures. There are no blockers; three Low findings are T4-owned and fit in a short medium fix or T5.

## Findings (all Low, non-blocking)

**1. One Engine boss mark flips one hit early** (`src/render/hud.ts:31`, `src/render/hud.ts:93`)
- **Trigger:** Stage 3 with `bossMax` 600 and `bossHealth` exactly 400. That value is reachable, because each player bullet hit on the body does 1 damage. 400/600 = 0.66666… is below the spec's 0.6667, so the 2/3 mark shows "passed". But `starfall-engine.ts:36` checks `400 < 400`, so the phase stays 1 and no PHASE 2 banner appears.
- **Impact:** Spec integration item 6 says the code's phase thresholds and the marks must agree. Report mismatch 5 also describes this backwards (it says the mark flips "later").
- **Fix:** Keep the spec thresholds for the mark x positions (the columns don't change). Decide "passed" with the code's exact fractions (1/2, 1/2, and 1/3 and 2/3), each asserted within 1e-4 of the spec value. Correct report item 5.
- **Test:** For each stage, step health over every whole number from 0 to max and assert the count of "passed" marks equals the code's phase − 1 (for Gatebreaker, its `enraged` check). Include health 400 → "ahead" and 399 → "passed".

**2. Hit-stop extends the stage card past 156 ticks** (`src/render/hud.ts:127`)
- **Trigger:** Nova starts full, so pressing B in the first 2.6 s triggers `freeze(5)` (`combat-player.ts:48-50`) and the card stays up for 161 ticks. Taking damage after the 1.5 s invulnerability adds 4 ticks the same way.
- **Impact:** The report says the card ends "after exactly 156 ticks", which doesn't hold here. The extra time is small but contradicts the spec's 2600 ms.
- **Fix:** Pass `{ runsDuringFreeze: true }` when registering the card system (a public option in 0.3.0). Pause still freezes the card, because the pause menu blocks updates below it. Alternatively, record hit-stop inclusion as an orchestrator decision.
- **Test:** In the stage-card test, press KeyB on tick 1. Assert the card is gone at tick 156 from start while `run.seconds` is 5 ticks behind, and keep the existing pause assertion.

**3. Title's legacy rounding is untested** (`tests/rev01-render-split.test.ts:107-112`, `src/scenes/menu.ts:56`, `menu.ts:101-106`)
- **Impact:** T4 turned off engine pixel snapping on the title and now routes its old painting through `pixelSnapped`. Nothing checks that the title's non-screen quads still arrive with rounded centres. A missed wrapper would put legacy quads on half pixels without any test failing.
- **Fix and test:** For the title, run the same rounded-centre check on all non-screen quads that the stage test already uses for legacy quads.

## Tracked for T5 (required for final acceptance, not T4 blockers)

- **P1–P6 are exact and enough.** Each matches the current line: `combat-enemies.ts:18,24`, `combat-collision.ts:70`, `kiln-serpent.ts:32`, `starfall-engine.ts:37`, `browser-boss-review.ts:29`. No other banner writers exist in src or tests.
  - Until they're applied, the WARNING, boss-name, SECURED, VICTORY and PHASE banners never draw.
  - T4's tests set kinds directly, so a missed writer fails nothing. Once P1 is in, a missed writer also silently keeps the previous kind. For example, without P3 the clear banner after a Kiln PHASE alert would use the alert plate.
  - T5 should add a real-stage test that drives each writer and asserts the banner kind, plate slices and text colour.
- **P7 applies cleanly but has an open colour choice.** Its lines match the current `boss.ts`, the three boss files and `enemies.ts:45`, but it must be merged with T3's own boss edits.
  - It keeps off-palette tints (0xa4e8bd / 0xb5efd0), while the brief requires the spec's text colours exactly. The orchestrator should pick a text-colour entry.
  - After P7, and once T2's beamWarning sprite replaces `player-fx.ts:32`, delete the shim at `bitmap-text.ts:39-54`. The build then proves no callers remain.
- **Title art is still legacy.** The title's player, exhaust and background (`menu.ts:100-106`) are T5's native wiring.
- **Capture timing.** `browser-boss-review` starts at bossAt − 0.2 s, so for the first 156 ticks the stage card fully covers the WARNING banner text. Take boss captures after the card ends.
- **Footer overlap.** On pause/result the footer overlaps the dimmed HUD controls hint; it reads "ENTER CONFIRMOUSE FIRE" in `screen-settings-2x.png`. This is the spec layout, so it goes to the gate-5 comparison or an owner check.

## What I verified

- **Scope:** Against the post-T1 baseline, only these changed: `hud.ts`, `menu.ts`, `font-assets.ts`, `bitmap-text.ts`, `session.ts` (banner kind only), the new `ui/presentation.ts` and `ui/menu-layout.ts`, and test files. The render-split test changes only add checks; `menu-lifecycle` is unchanged. Git shows no `src/assets` changes.
- **Art and main:** All 114 art files match `.test-output/integration/baseline.json`, and main = HEAD = `840fc0a`.
- **Tests:** I reran `npm test`: 76/76 pass. The mutation log shows real failures when the safeguards are removed.
- **Engine 0.3.0:** Pixel snapping is set per scene and also applies to screen quads. The sampler is nearest with clamp-to-edge. Pointer positions are continuous logical pixels, so half-open item rects are right. The pause menu stops the stage's systems, so the card freezes under pause.
- **Font:** A stable derived mask `rev01-font-mask` that keeps alpha; glyph frames use the same texture; `rev01Image("font")` throws. 5x7 cells, 6 px advance, 6n−1 width, missing glyphs only advance, and no scale parameter exists.
- **HUD:** Opaque bands on the exact rows, inclusive plate ranges, bar fills cropped to ceil(w·f) columns by UV, mark x = 200 + round(240t) − 1, centred boss name, low hull at ≤1, reduced-motion statics, charge bar always empty, layers from T1's table. The HUD draws only to the native frame.
- **1-texel repeat:** Valid. Every repeated slice is 1 texel wide along its stretched axis (enforced by a throw), the UV origin sits on a texel boundary, and sampling is nearest. The result is pixel-identical to native repetition.
- **Screens:**
  - **Items and clicks:** Drawing and hit-testing share one set of item rects (216..424 × top..top+14). Press and release must both land in the same item; the right button is ignored.
  - **Rows:** Pause items start at row 154, settings at 145; the controls BACK item is at itemsTop + 92.
  - **Results and overlay:** The result panel is 170..470 from row 116, 105 rows tall, with the correct plate frame per outcome and centred stats. The dim is panel[0] at 0.85.
  - **Controls:** Meters = round(v·4) and SOUND = !muted.
  - **Focus:** Focused items use the focused caps and colour. Focus handling is otherwise unchanged.

## Limitations

- I did not rerun `vite build` (it writes `dist/`). The no-emit typecheck was blocked by the permission mode, so the build result comes from the recorded log.
- I did not rerun the campaign bot. T1's bot JSON sits outside the worktree and listing it was denied; T4 doesn't touch simulation code.
- No browser or GPU run. I looked at 2 of the 20 software-rendered evidence sheets.
- No files were written and no background commands are running.

Model: Claude Opus 5.5 (`claude-opus-5-5`). The brief asked for xhigh effort; I can't confirm the effort setting from inside the session.
