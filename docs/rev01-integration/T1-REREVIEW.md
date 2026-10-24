**Verdict: ACCEPT.** None of A–D needs changes, and nothing blocks T2–T4.

## Dispositions

**A. Interceptor exit ties: fixed.**
- **Scope:** the tolerance (1e-6 world px) applies only to the interceptor y check (`src/systems/combat-enemies.ts:10` and `:72-73`). The 400 px boundary, gunship and sweeper y checks, every x bound, and the movement, fire and spawn code are unchanged against `baseline-source`.
- **Why it's safe:** there is only one interceptor spawn site (`:33-35`). Production always steps at 1/60 s: `main.ts` doesn't override the step and the engine defaults to 1/60. At that step only the 5-ship rows −22/−36/−50 land exactly on the boundary. The 4- and 6-ship rows sit 1/3 legacy px away, so the tolerance can't affect them.
- **Evidence:** the probe ran immutable main's actual stage scene and the migrated one on real waves (stage 1 at 4/5/6 ships, stages 2–3 at 5 ships). Both gave identical removal ticks (`fix-baseline-exit-ticks.json` = `fix-migrated-exit-ticks.json`).
- **Test:** `tests/rev01-timing.test.ts:121-155` runs the production spawner and pins main's tick counts (moves = removal − 1). With the tolerance set to 0 the test fails (`fix-mutation-tolerance0.log`). No assertion was loosened; the header and the off-grid row comment now describe what each covers.

**B. Asset hooks: correct.**
- **Hooks:** `fontImage()` (`font-assets.ts:11-13`) and `playerFxExtraImages()` (`player-fx-assets.ts:10-12`) are lazy, cached, and do nothing when imported.
- **No import cycle:** the hooks import `rev01-assets.ts` only, `rev01-claims.ts` imports the hooks plus `rev01-assets.ts`, and nothing imports back.
- **One font path:** `rev01Image("font")` throws, and font is no longer in `REV01_CLAIMS.hud` or `screens`. Stage and title claims both call `fontImage()`.
- **Stable identities:** the engine checks for conflicting ids by object identity (`assets.js:49-50`). The cached objects plus `unique()` (`rev01-claims.ts:12-20`), which throws on two different objects under one id, make that error unreachable through the claim functions.
- **Callers:** `menu.ts:3` and `stage-assets.ts:6` only changed which file they import from. 53/53 PNGs are still bundled.
- **Tests:** they import the hooks first with `fetch` and `createImageBitmap` blocked, and derive their expectations through the hooks.

**C. Component defaults: consistent.**
- Each new default equals its production spawn default or the spec value:
  - `Flight` x/y/px/py = `PLAYER_START`, which `stage.ts:28` also sets.
  - `Enemy.radius` = the interceptor's spec radius (kind 0 is Interceptor).
  - `Bullet.radius` = `COMBAT.playerBulletRadius` (team 0 is the player).
  - `Bullet.size` = `fromLegacy(3)`, the `spawnBullet` default.
  - `Beam.width` = 15, the `spawnBeam` default and the spec Engine lane.
- Every production `.of()` call sets these fields itself, so production behaviour is unchanged. All non-spatial defaults are the same as main.
- The new config imports add no cycle: `session.ts` imports only `view.ts`, and `encounters.ts`/`enemies.ts` import only `rev01-gameplay.ts`/`view.ts`.
- The assertion is in the existing foundation test (`rev01-foundation.test.ts:211-223`).

**D. Mine seam: correct.**
- `installCombatRender` passes the raw scene frame and the `pixelSnapped` wrapper (`combat-render.ts:17-19`). `render/enemies.ts:33` forwards both as `drawMine(frame, legacy, x, y, cue, clock)`.
- The T1 body (`player-fx.ts:16-21`) draws only on `legacy`, and it matches main's mine drawing ×4/3 in quads, colours, layers and the cue ring. `Boolean(e.cue)` behaves the same as main's truthiness check.
- Tests check the six-argument signature, that nothing lands on the native frame, the quad count (3, or 11 with the cue), centring, and that every stage draws the three mine layers.

## Notes for later briefs (not T1 defects)
1. **T4:** `rev01Sprite("font")` frames still say texture `rev01-font`, and `nativeQuad` uses that value (`sprite.ts:43`). Once T4 switches to `rev01-font-mask`, glyph quads must use `fontImage().id`, or they will point at a texture that never loads. `T1-REPORT.md:104` already says this; repeat it in the T4 brief.
2. **T2:** `playerFxExtraImages()` takes no device argument, and the engine requests the GPU device without raising any limits (`gpu-context.js:12`). T2 should plan the nova atlas against 8192, as the test does, rather than the report's "T2 passes `device.limits`" (`T1-REPORT.md:76`). The engine still checks the size at upload.
3. **T2/T3:**
   - The render-split check that every quad centre is a whole number (`rev01-render-split.test.ts:59-60`) will reject odd-sized native quads, whose centres fall on half pixels. Limit it to legacy quads when native art lands.
   - Nothing currently checks that the enemy pass hands `drawMine` the raw frame. T1 ignores that argument, so swapping the two arguments wouldn't fail any test. T2 should add that check.

## Checks
- **Evidence filenames** match `T1-REPORT.md`:
  - `fix-npm-test.log`: 60/60 pass, 0 fail.
  - `fix-npm-build.log`: typecheck of src and tests, then `vite build`, passes.
  - `fix-campaign-bot.{log,json}`: all 9 stage clears, numbers identical to the original T1 run.
  - `fix-art-hash-check.log`: 114/114 match, nothing changed or added.
  - `fix-bundle-evidence.log`: 53/53 bundled.
- **Branch:** main = HEAD = `840fc0a1d518…`, read from `.git/refs`.

## Limitations
- Bash was denied apart from one listing, so I couldn't run `git diff`, the tests, the build, the bot or the probe. I compared the current source by eye against the `baseline-source` copy and relied on the recorded logs, including the art-hash log, which I didn't recompute.
- No browser run. The production smoke predates the hook change; T5 covers final assets and screens, and no physical-device acceptance is claimed.
- Nothing was edited, and no command is still running.

Model: Claude Opus 5.5 (`claude-opus-5-5`). xhigh effort was requested; I can't confirm the actual setting from inside the session.
