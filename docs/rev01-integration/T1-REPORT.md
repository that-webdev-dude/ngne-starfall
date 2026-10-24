# T1 Foundation — implementer report

State: implemented in the working tree of `codex/starfall-rev01-integration`; no commits. **Not reviewed** (Opus/xhigh review pending). No owner visual approval claimed; no browser run in this ticket.

Implementer: Claude Opus 5.5 (`claude-opus-5-5`), effort per brief (high), single agent, no subagents. Usage/cost: not readable from inside the session; orchestrator to record.

## Results

Final (after the T1 fix pass, see "Fix pass A–D" below):

| Check | Result | Log |
| --- | --- | --- |
| `npm.cmd test` | 60 / 60 pass | `.test-output/integration/T1/fix-npm-test.log` |
| `npm.cmd run build` | pass | `.test-output/integration/T1/fix-npm-build.log` |
| campaign bot, seeds 17 / 41 / 83 | 9 / 9 stages clear; per-stage numbers identical to the table below | `.test-output/integration/T1/fix-campaign-bot.{log,json}` |
| rev01 PNGs in bundle | 53 / 53 (7 files, 46 inlined), 0 missing | `.test-output/integration/T1/fix-bundle-evidence.{log,json}` |
| art/rev01 vs baseline.json | 114 / 114 identical, 0 added; `main` = HEAD = `840fc0a` | `.test-output/integration/T1/fix-art-hash-check.log` |

Original implementation run:

| Check | Result | Log |
| --- | --- | --- |
| `npm.cmd test` | 57 / 57 pass (baseline 37 / 39) | `.test-output/integration/T1/npm-test.log` |
| `npm.cmd run build` | pass (typecheck src + tests, vite build) | `.test-output/integration/T1/npm-build.log` |
| campaign bot, seeds 17 / 41 / 83 | 9 / 9 stages clear, normal controls only | `.test-output/integration/T1/campaign-bot.{log,json}` |
| rev01 PNGs in bundle | 53 / 53 (7 emitted files referenced from JS, 46 inlined data URIs) | `.test-output/integration/T1/bundle-evidence.json` |
| art/rev01 vs baseline.json | 114 / 114 identical, 0 added; `main` = HEAD = `840fc0a` | `.test-output/integration/T1/art-hash-check.log` |
| baseline motion trace | 480x270 model, before any edit | `.test-output/integration/T1/motion-baseline-trace.log` |

Bot ran as `node --experimental-strip-types tests/run-campaign-bot.ts .test-output/integration/T1/campaign-bot.json` (output arg keeps tracked `artifacts/` untouched; default seeds).

| Stage | Clear s | Hull (17/41/83) | Kills | Boss start | Max bullets | Novas |
| --- | --- | --- | --- | --- | --- | --- |
| orbital-breakwater | 149.95 | 5/5/5 | 85 | 90.017 | 70 | 9 |
| furnace-belt | 213.80 | 5/5/5 | 75 | 100.017 | 71 | 13 |
| midnight-citadel | 171.95 | 3/4/4 | 96 | 110.017 | 68 | 10 |

Reference only (unknown earlier commit, `artifacts/campaign-testing/headless-final.json`): 152.4 / 189.2 / 176.7 s, kills 92 / 84 / 108. The smaller spec collision radii make enemies harder to hit; the Kiln fight runs ~25 s longer for the bot. No same-commit baseline bot run exists (see Permission denials).

## Changed files

Modified: `src/config/{view,encounters,stages,enemies,boss-geometry}.ts`, `src/services/{display,stage-assets}.ts`, `src/style.css`, `src/ui/sprite.ts`, `src/systems/{combat-render,combat-player,combat-enemies,advanced-enemies,combat-collision,combat-effects}.ts`, `src/bosses/{boss,gatebreaker,kiln-serpent,starfall-engine}.ts`, `src/entities/combat.ts`, `src/world/{patterns,session}.ts`, `src/scenes/{stage,menu}.ts`, `tests/{motion,patterns,combat-integration,campaign-integration,stage-assets}.test.ts`, `tests/browser-{campaign,boss-review}.ts`, `tests/helpers/campaign-bot.ts`.

New: `src/config/layers.ts`, `src/config/rev01-gameplay.ts`, `src/services/rev01-assets.ts`, `src/render/{pass,background,enemies,player-fx,hud}.ts`, `tests/rev01-foundation.test.ts`, `tests/rev01-timing.test.ts`, `tests/rev01-render-split.test.ts`, `tests/helpers/png.ts`, this report. DECISIONS.md: T1 notes appended.

Untouched: art/rev01 (read-only), `src/components/*` (until fix C), `src/assets/*`, legacy asset modules, `vite.config.ts`, `package.json`.

## What was done

- **Viewport:** `VIEW` 640x360. `displayLayout()` computes k = max(1, floor(min(devW/640, devH/360))) in device pixels, CSS size 640k/DPR, offset floored to whole device pixels, negative (equal clipping) below 1x. `installDisplay` reads the body's `device-pixel-content-box` (rect x DPR fallback) and re-applies on resize, fullscreen change and DPR change (matchMedia). Clear colour stays `#060d19`. Browser fixtures now install the same display.
- **4/3 migration:** one helper, `fromLegacy(v) = v * 4 / 3` (aliased `w` in dense files), wraps every legacy world distance, position, speed, acceleration, culling bound, shake amplitude and decay, particle speed/size, bot geometry (px² cost scales get one factor per length). Not scaled: times, cooldowns, rates, angles, counts, HP, damage, score, caps, sweeper side flag, bank response, stick deadzone, RNG draw count/order.
- **Explicit spec values instead of 4/3:** player radius 5, hostile bullet radius 4, enemy/boss/part radii from `gameplay.enemyRadius` (mine 6), beam lanes 15 (Engine) / 13 (Warden), player clamp 24..616 x 57..319. Player bolt radius has no spec value: 2 x 4/3.
- **Legacy metadata scaled exactly once:** painting draw sizes/pivots inside `drawSprite`; Gatebreaker and Engine sockets in `config/boss-geometry.ts` (`BOSS`, `ENGINE`); player exhaust sockets and muzzles (±5, −13) at their use sites. Native spec sockets are not read anywhere yet.
- **Render split:** `combat-render.ts` is now a composition of four passes run in the old order: `render/background.ts`, `render/enemies.ts` (incl. boss render), `render/player-fx.ts` (beams, pickups, player, effects, bullets, nova ring, flash; owns `drawMine`), `render/hud.ts`. Old artwork kept, geometry x 4/3, 3x5 text at native glyph size.
- **Layer table:** `config/layers.ts`, 52 consecutive slots in the 10 `presentation.layers` categories. Moves required by spec order: HUD now below nova < beams < bullets < core; charging lane moved from below hulls to the beam category; core marker above bullets; explosions above pickups/player; player above mines/pickups/cues.
- **rev01 registry:** literal `new URL()` per spec id (53), metadata from `spec.json` via JSON import attributes, frames left-to-right top-aligned, integer pivots, playback from `animation.order`/`durationsMs`. Claims: stage scenes claim background + player-fx + their enemies + HUD + screen kit; title claims the screen kit. Nova is never a plain image (`rev01Image("nova")` throws).

## Motion tests (reviewer attention)

Baseline failures were stale assertions, not regressions. Exact 480x270 trace: release glide 17.042 px over 12 frames (assertion said < 16); reversal reaches −175 at frame 12, −155 at frame 10 (assertion expected −175 at 10, because the turn rate only applies until velocity crosses zero); overshoot 3.333 px (the "< 3 px" check never ran because the velocity assertion failed first, and would also have failed). Movement code unchanged. The new tests pin the baseline trace (velocity per frame for release, reversal, acceleration; glide 17 + 1/24; peak 10/3) and require the migrated model to equal it x 4/3 on every frame, plus the unchanged frame counts. Lower bound `glide > 4 px` kept as `> w(4)`. No tolerance was widened; every comparison is 1e-9.

## Spec/code findings and decisions

1. **Hostile bullet radius (needs orchestrator confirmation, not blocking):** `gameplay.hostileBulletRadius` = 4 applied. `hostileBead.bounds.damage` = 3 ("the game may use"). With player 5 + bullet 4 = 9 (vs 8.67 uniform), ordinary curtain lanes keep 14 px clearance instead of 14.67 px (−0.67 px), pinned in `patterns.test.ts`. If the owner wants 3 (bead) or 3.33 (uniform), change `COMBAT.hostileBulletRadius` only.
2. **Enemy radii much smaller than 4/3** (e.g. interceptor 9 vs 16, Kiln head 21 vs 29.3): applied as specified; longer boss fights for the bot (above).
3. **bossWeakpointScale:** the code has no weak-point radii besides the boss/part radii the spec lists; nothing further applied.
4. **Kiln chain spacing:** T1 keeps the legacy formula x 4/3 (34 → 45.3 px base, lag term unchanged). DECISIONS.md "Owner decision 1" (cap the lag only below 34 px, colliders follow) is T3's to implement.
5. **Backgrounds:** no ticket owns replacing the three backgrounds. Native 640x400 strips are registered and claimed (so they ship); the legacy paintings are still drawn. Orchestrator to assign.
6. **Pixel grid:** `nativeQuad` needs engine centre rounding off (odd canvases otherwise land on half pixels). The stage camera sets `pixelSnap = false`; shake offsets are rounded to whole pixels; legacy draws go through `pixelSnapped`, proven identical to the engine's rounding. Shake now moves in whole-pixel steps (≤ 1 px from before on some frames).
7. **Inlined PNGs:** Vite inlines strips under 4 KiB as data URIs (`assetsInlineLimit`, vite.config.ts not in T1's files). `imageAsset` fetches data URIs fine. Set `build.assetsInlineLimit: 0` if separate files are required.
8. **Component defaults:** superseded by fix C (spatial defaults now follow the 640x360 spawn conventions).
9. **Runtime not exercised:** each stage scene now also loads 44 (stage 1) or 46 (stages 2–3) rev01 images, the title 8. Loader and claims are the engine's standard `imageAsset`, but no browser run happened in T1. Recommend a browser smoke check of the production build before T2–T4 build on it.

## Nova texture plan (measured)

Full strip 7766x1545 (12.0 M texels; fade-3 alone 1545 wide). `planSparseAtlas(novaUploadFrames(), opaque, { tile: 32, atlasWidth: 2048, maxDimension })` over the 11 played frames: **2048x416 atlas, 801 tiles, 0.79 M tile texels, 93,987 opaque texels, ≤ 169 tiles (quads) per frame**, fade-3 excluded. That is 5% of the WebGPU default `maxTextureDimension2D` (8192) in height, so it fits every WebGPU device. The plan throws if it would exceed the device limit; T2 passes `device.limits.maxTextureDimension2D`. The test checks that every opaque texel of every played frame lands in a tile.

## API seams for T2 / T3 / T4

- `config/layers.ts`: `LAYER.<slot>` for every draw. Pre-provisioned: `playerFlash`, `playerCalm`, `playerMuzzleFx`, `plasmaShot`, `plasmaImpact`, `hudPlate`, `stageCard(Text)`, `screen*`. New slots are a coordinated edit.
- `services/rev01-assets.ts`: `rev01Sprite(id)` → frames (`NativeFrame`: strip rect, pivot, UVs), `frame(name)`, `playback`, raw `spec` (sockets: native 640 units, do not scale). `rev01Image(id)` engine asset (texture `rev01-<id>`; throws for `nova` and `font`). `REV01_CLAIMS` groups by owner (claims already live, no edit needed; `nova` and `font` are not in any group). `derivedImageAsset(id, url, derive)` + `maskPixels`, `planSparseAtlas` + `novaUploadFrames`. Workers do not edit this file.
- Asset hooks (fix B) — see "Fix pass A–D": T2 owns `services/player-fx-assets.ts` (`playerFxExtraImages()`), T4 owns `services/font-assets.ts` (`fontImage()`). Scenes claim through `services/rev01-claims.ts` (`rev01StageImages`, `rev01ScreenImages`), which nobody needs to edit.
- Mine seam (fix D): `drawMine(frame, legacy, x, y, cue, clock)` in `render/player-fx.ts`.
- `ui/sprite.ts`: `drawNative(frame, art, x, y, { layer, alpha, color, flipX, rotation: -90, screen })` / `nativeQuad` (pivot pixel = pixel containing (x, y); flipX for right turret/emitter; −90 for Kiln). `pixelSnapped(frame)` for any remaining legacy draw.
- `render/pass.ts`: `RenderPass(frame, alpha, legacy)`. Native art draws on `frame`, legacy on `legacy`. T2 edits `render/player-fx.ts` (incl. `drawMine`), T3 `render/enemies.ts` + bosses, T4 `render/hud.ts` + menus. Menu scenes still use engine snapping: T4 sets `scene.camera.pixelSnap = false` in `menu.ts` when it draws native frames there.
- Legacy sockets to replace, not rescale: `BOSS.leftTurret/rightTurret` (−43.8, 4.3 at 4/3 vs spec −47, 4), `ENGINE.left/rightEmitter` (±38.6, 0 vs spec ±41, −1), player muzzles `w(±5), w(−13)` and `art.exhaustSockets` in `player-fx.ts` (spec per pose).

## Fix pass A–D (Opus/medium fix agent, 24 Oct 2026)

Fixer: Claude Opus 5.5 (`claude-opus-5-5`), effort medium per brief, single agent, no subagents. No commits; art untouched.

**A. Interceptor exit ticks at floating-point ties — fixed.**
- Cause: real rows (5-ship −22/−36/−50) reach y = 300 legacy px exactly at a tick. Main's float sum lands ~2e-13 *below* 300 (alive, removed next tick); the x4/3 sum lands ~3e-12 *above* 400 (removed one tick early). 4-/6-ship rows (−29/−43/−57) sit 1/3 px off the boundary and were never affected.
- Fix: `src/systems/combat-enemies.ts` exports `INTERCEPTOR_EXIT_TOLERANCE = 1e-6` (world px) and uses `y > w(300) + INTERCEPTOR_EXIT_TOLERANCE` for interceptors only. Gunship/sweeper and every x bound use the unchanged predicate. Boundary is still 400 px (300 legacy); 1e-6 px is 6 orders above the drift and 6 below a per-tick step (0.67 px).
- Evidence: the actual stage scene of immutable main (`.test-output/integration/baseline-source`) and of the migrated tree, run by the same probe on real waves (stage 1 4/5/6-ship, stage 2 and 3 5-ship), give identical removal ticks: 4 ships 516/495/495/516, 5 ships 527/506/485/506/527, 6 ships 537/516/495/495/516/537 (removal tick = moves + 1). Files: `fix-exit-probe.ts`, `fix-baseline-exit-ticks.json`, `fix-migrated-exit-ticks.json`, arithmetic `fix-exit-ticks.mjs`.
- Test: `tests/rev01-timing.test.ts` "real interceptor waves (4/5/6 ships) leave on main's exact ticks…" spawns the real waves through the production spawner and asserts per-ship exit ticks against main's arithmetic (pinned 494/515, 484/505/526, 494/515/536 moves). Mutation check: with tolerance 0 it fails on stage 1 wave #1 (`fix-mutation-tolerance0.log`). The file header and the off-grid trajectory rows' comment now say what each covers; no assertion was loosened.
- Bot: per-stage results identical to the original T1 run.

**B. Worker-owned asset hooks — added.**

| Module | Owner | API | T1 value | Later |
| --- | --- | --- | --- | --- |
| `src/services/player-fx-assets.ts` | T2 | `playerFxExtraImages(): readonly ImageAsset[]` | frozen `[]` | T2 returns its nova sparse atlas (distinct id, e.g. `rev01-nova-atlas`, via `derivedImageAsset` + `planSparseAtlas(novaUploadFrames(), …, { maxDimension })`) |
| `src/services/font-assets.ts` | T4 | `fontImage(): ImageAsset` | raw strip, id `rev01-font` | T4 returns `derivedImageAsset("rev01-font-mask", REV01_URLS.font, maskPixels)`; renderers use `fontImage().id` as the texture |
| `src/services/rev01-claims.ts` | shared, no edits needed | `rev01StageImages(stageId)`, `rev01ScreenImages()` | — | — |

- Both getters are lazy (`??=` cache) and return the same object on every call. Defining assets never fetches.
- One font path: `font` is removed from `REV01_CLAIMS.hud`/`screens`, `rev01Image("font")` throws, and stage and title claims both call `fontImage()`. Claims also throw if two different asset objects share an id, rather than leaving that to the engine loader.
- Import graph is one-way: hooks → `rev01-assets.ts`; `rev01-claims.ts` → hooks + `rev01-assets.ts`; nothing imports back, so there is no cycle. `stage-assets.ts` and `menu.ts` import the claim functions from `rev01-claims.ts` (import-path change only in `menu.ts`).
- Direct art URLs stay in `REV01_URLS`; no copies. Bundle: 53/53 PNGs.
- Tests (`rev01-foundation.test.ts` registry test, `stage-assets.test.ts`): expectations derive through `fontImage()`/`playerFxExtraImages()`. They check exactly one font asset (the hook's object) in every stage and title claim, T2 extras present in every stage, hook stability, and that `rev01Image("font")`/`("nova")` throw. The test imports the hooks before `rev01-assets` with fetch/createImageBitmap blocked.

**C. Component defaults — migrated (not used by production spawns).**
- `components/flight.ts`: x/y/px/py default to `PLAYER_START` (640x360 spawn), replacing the stale 325/184.
- `components/combat.ts`: `Enemy.radius` = interceptor spec radius (the default kind 0 is Interceptor), replacing 13. `Bullet.radius` = `COMBAT.playerBulletRadius` (the default team 0 is the player), replacing 3. `Bullet.size` = `fromLegacy(3)` (the `spawnBullet` default), replacing 3. `Beam.width` = `REV01_GAMEPLAY.beamWidth.starfallEngine` (15, the `spawnBeam` default), replacing 12.
- Damage, colour, charge, duration, active, HP and timing defaults are unchanged. Every production `.of()` sets these fields itself. Assertion: `rev01-foundation.test.ts` "unused component defaults…".

**D. Mine render seam — changed.**
- Contract: `drawMine(frame: Frame, legacy: Frame, x: number, y: number, cue: boolean, clock: number)` (`render/player-fx.ts`). `frame` is the actual native Frame for `drawNative` (odd mine canvas, spec pivot, whole-pixel quads). `legacy` is the `pixelSnapped` wrapper.
- T1 draws the unchanged legacy diamond on `legacy` and leaves `frame` untouched. T2 replaces the body and uses `frame`. T3 keeps the call in `render/enemies.ts`: `drawMine(frame, legacy, x, y, Boolean(e.cue[row]), run.effectClock)`.
- Tests: `rev01-render-split.test.ts` checks that the stage pass draws mine/mineDetail/mineCore layers for every stage, and the "drawMine seam" test checks the 6-argument signature, that nothing goes on the native frame in T1, and the same 3 (11 with the cue) legacy quads centred on the mine.

Files touched in the fix pass: `src/systems/combat-enemies.ts`, `src/services/{rev01-assets,stage-assets}.ts`, new `src/services/{font-assets,player-fx-assets,rev01-claims}.ts`, `src/scenes/menu.ts` (one import line), `src/components/{flight,combat}.ts`, `src/render/{player-fx,enemies}.ts`, `tests/{rev01-timing,rev01-foundation,rev01-render-split,stage-assets}.test.ts`, this report. DECISIONS.md not edited (orchestrator in use).

Fix limitations: no browser run (not required). The engine-side "Conflicting asset identity" path is guarded by the claim-level check but was not exercised in a browser. Permission denials in this pass (heredoc scripts, `sed -i`, compound `echo $?`) were worked around with Write/Edit and single commands; no check was skipped.

## Permission denials

Auto-denied (no approval surface): `git log`, `git show HEAD:…`, `git status` (after the first call), several compound Bash commands (pipes into grep, heredocs, `$?`), a PowerShell command with an embedded expression. Effects: no git-history diagnosis of the stale motion comments, and no same-commit baseline bot run, since baseline code could not be re-run after edits started. Timing equivalence is shown analytically instead (`tests/rev01-timing.test.ts`: pinned schedules/stats/cadence, tick-by-tick trajectories vs legacy formulas x 4/3, explicit-radius collisions).

## Left for orchestrator / reviewer

- Opus/xhigh read-only review; acceptance status in TICKETS.md.
- Decide findings 1 (bullet radius), 5 (backgrounds owner), 7 (inline limit); confirm 9 with a browser smoke run.
- Record T1 usage/cost in the ledger.
