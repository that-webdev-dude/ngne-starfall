# T2 Player, projectiles, effects, nova — implementer report

Follow-up: Codex review requested the beam-core correction; that correction is implemented and awaits re-review. See `T2-FIX-REPORT.md` for current fix checks. The original implementation evidence below is retained.

State: implemented in the `codex/starfall-rev01-t2` worktree on the reviewed post-T1 snapshot; no commits. **Not reviewed** (Opus/xhigh review follows). Not marked accepted. No browser/GPU run in this ticket; the runtime captures are T5's.

Implementer: Claude Opus 5.5 (`claude-opus-5-5`), effort high per brief, single agent, no subagents. Usage/cost: not readable inside the session; orchestrator to record.

## Results

| Check | Result | Log |
| --- | --- | --- |
| `npm.cmd test` | 73 / 73 pass (60 before T2 + 13 new in `rev01-player-fx.test.ts`) | `.test-output/integration/T2/npm-test.log` |
| `npm.cmd run build` | pass (typecheck src + tests, vite build, 74 modules) | `.test-output/integration/T2/npm-build.log` |
| campaign bot, seeds 17 / 41 / 83 | 9 / 9 stages clear, normal controls only (not required by T2; run because muzzle sockets move bolts) | `.test-output/integration/T2/campaign-bot.{log,json}` |
| art/rev01 vs `.test-output/integration/baseline.json` | 114 / 114 identical, 0 added/missing; `main` = HEAD = `840fc0a` | `.test-output/integration/T2/art-hash-check.{mjs,log}` |
| mutation checks | 3 / 3 caught (mirrored needle turn, fade-3 uploaded, damage flash dropped); all reverted | `.test-output/integration/T2/mutation-*.log` |
| nova render evidence | see "Nova" below | `.test-output/integration/T2/render-evidence.{ts,json}` |

Bot vs T1 (same seeds; T1 numbers from T1-REPORT): breakwater 149.95 s → 151.45 s, hull 5/5/5 → 4/4/4, kills 85 → 70; furnace 213.80 s → 213.80 s, hull 5/5/5, kills 75 → 76; citadel 171.95 s → 168.25 s, hull 3/4/4 → 4/4/4, kills 96 → 102. Boss start times, max bullets unchanged; novas 9/13/10 → 8/14/11. The difference comes from the spec primary muzzles (see "Gameplay-visible consequence").

## Changed files

New (T2-owned):
- `src/render/player-fx-model.ts`: pure, Node-safe model read from spec.json: poses and stepper, per-pose sockets, playback helper, cue priority, effect kinds/lifetimes, hostile shape table, 16 needle directions, beam core width, nova timeline.
- `src/systems/player-fx-state.ts`: per-run presentation state in a `WeakMap<RunState, …>` (pose, last hull loss, nova origin, death record); no RunState/session edit.
- `tests/rev01-player-fx.test.ts`: 13 tests (below).
- `docs/rev01-integration/T2-REPORT.md` (this file).

Modified (T2-owned):
- `src/render/player-fx.ts`: the native renderer (rewritten; `drawMine` signature kept).
- `src/services/player-fx-assets.ts`: `playerFxExtraImages()` now returns the nova sparse atlas; `packNovaAtlas`, `deriveNovaAtlas`, `novaAtlasPlan`.
- `src/systems/combat-player.ts`: pose stepping, per-pose primary muzzles, nova origin, reduced-motion still embers.
- `src/systems/combat-effects.ts`: `burst` effect kinds and `still`; per-tick `observePlayerFx`.
- `src/systems/hostile-fire.ts`: unchanged (shape classification is presentation-only and lives in the model).

Caller edits under the brief's presentation-payload allowance (simulation values unchanged):
1. `src/systems/combat-context.ts`: `burst(x, y, color, count, effect?: boolean | EffectKind, still?: boolean)`; previously `explosion?: boolean`. `true` still means explosion, so `scenes/stage.ts` (boss cascade) is untouched.
2. `src/systems/combat-collision.ts`, four `burst` arguments only:
   - player bolt hits an enemy hull: `3` → `3, EFFECT.hitSpark`;
   - enemy kill: `true` → `killEffect(kind)` (heavyBreakup for gunship/warden/minelayer, explosion otherwise);
   - player damage `24, true` → `24` and player death `65, true` → `65`: no fireball sprite on the player (damage cue is playerFlash/playerCalm; death plays playerDeath from the T2 state). Particle counts and colours unchanged.
   - plus one import line.
- `src/components/*`, `src/entities/*`: not changed. Effect tags ride the existing `Particle.kind` u8 (0 = code square, 1 explosion as before, 2 hitSpark, 3 heavyBreakup, 4 plasmaImpact).

Tests migrated (legacy T2 assertions replaced by native ones, none weakened):
- `tests/rev01-render-split.test.ts`: legacy `player-bank`/`exhaust`/`explosion` textures removed from the allowed set (asserting they are gone); T2 textures allowed by registry (`REV01_CLAIMS.playerFx` + atlas id); native T2 quads must have whole-pixel corners and edges, legacy-textured quads still need engine-rounded centres, untextured quads one of the two; layer checks now on `rev01-player`/`rev01-exhaust`/atlas/mine plus five more T2 sprites; nova triggered through `startNovaFx` with the atlas derived from the decoded PNG. The `drawMine` seam test now checks one native quad (texture, layer, idle/armed frame, pivot pixel, native size) and zero legacy draws, for both cues and three clocks.
- `tests/combat-integration.test.ts` (held-fire test): `x = run.x ± w(5)` → x on a spec neutral primary muzzle, plus a new "one bolt per muzzle per volley" count.

## What was done

- **Poses (7) and sockets:** `stepPose` runs once per tick in `combat-player` from the simulation's `bank` (target = nearest of 7 levels, symmetric rounding). Every level shows ≥ 50 ms (spec `transitionMs` 40–65; 3 ticks), so traverses run one level per 50 ms; a rested pose answers at once, so the return toward neutral starts on the same tick; a reversal mid-roll waits at most for the current level's 50 ms. The module throws at load if 50 ms leaves the spec range. Primary bolts spawn at `run + primaryMuzzle[pose]` (2 per volley, same order, cadence, speed, damage, radius). The renderer draws exhaust at `exhaust[pose]` (pivot (3,0), under the hull), hull/flash/calm at the pivot pixel, charge-ready at `plasmaMuzzle[pose]`; all from the same pose level. playerFlash sockets are asserted identical to player's.
- **Cue priority** (`resolvePlayerCues`): damage → playerFlash pose frame for 100 ms (overrides all but charge-ready; low-hull hidden), then the legacy runtime blink (18 Hz phase, 0.35 / 1, never invisible); reduced motion → playerCalm `hit-<pose>` 250 ms, then `shield-<pose>` until `run.invulnerable` ends, no opacity change. Charge-ready slot = plasmaReady / plasmaReadyCalm at the muzzle, kept through all cues; `CHARGE_READY = false` because no charge exists (chargeBar stays empty, no input/damage/resource). Low hull (hull ≤ 1): two 2×2 needle[1] emissives at canvas rows 22–23 beside each nozzle column, ~2 Hz, steady in reduced motion. Core marker: 7/3 rects (codeDrawn.playerCore) on the pivot pixel in every case.
- **Damage/death detection:** `observePlayerFx` (combat-effects system, runs during freeze) records a hull drop and the first `phase === "dead"` tick. Freeze, iFrames (1.2 s), death and the 1.2 s result delay are untouched; the test checks the result is requested on the first tick with `finishTimer > 1.2`.
- **Effects:** explosion (fodder, bosses, parts, boss cascade), hitSpark (player shot on a hull, at the impact point), heavyBreakup (gunship/warden/minelayer), playerDeath (once at the death position, pivot = player pivot, frame 0 skipped for a banked pose, core marker on death-0/1), plasmaImpact defined but never spawned. Effect particles live exactly their spec once-playback (explosion 0.365 s = legacy).
- **Projectiles:** primaryLance 3×11 for player bolts; hostile bead / needle / orb by emitter colour (table below), one quad per bullet, radius unchanged (4). Needles: 16 directions = needle-0/22/45 turned k quarter turns, and needle-22 mirrored in x then turned (k+1) quarter turns (= PIL TRANSVERSE then k turns). No other rotation.
- **Nova:** fixed origin recorded at the trigger (`startNovaFx`), clock `run.novaRing` (unchanged; clear/damage still fire on trigger). Normal: the 11 played frames at their 40/40/50×6/60×3 ms from the sparse atlas, tiles culled off-screen. Reduced: ignite-1 held 120 ms, then novaCalm calm-ring 150 ms, calm-broken 150 ms; cleared bullets become still embers (same random draws, zero velocity); no full-screen flash (unchanged rule).
- **Sparse atlas:** `playerFxExtraImages()` lazily defines one stable asset `rev01-nova-atlas` = `derivedImageAsset(REV01_URLS.nova, deriveNovaAtlas)`. `packNovaAtlas` checks the decoded strip size, plans with `planSparseAtlas(novaUploadFrames(), opaque-from-loaded-alpha, { tile 32, width 2048, maxDimension })` and copies only those cells. `maxDimension` = 8192 (`WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D`): the engine's `createGpuContext` calls `adapter.requestDevice()` without `requiredLimits`, so the device has WebGPU's default limit, the same `device.limits.maxTextureDimension2D` its `uploadImage` checks. No engine or shared-module change. The decoded strip bitmap is closed by T1's helper; disposal closes the atlas bitmap; an aborted load fetches nothing (fake browser test).
- **Pickup / mine / beam:** pickup loop base, bright, peak, bright (200 ms each) on `effectClock`, reduced holds base. Mine: idle while `cue == 0`, armed (held) while `cue == 1`, native quad on the raw frame. Beam lanes from codeDrawn.beamLane on whole-pixel columns centred on the pixel containing `beam.x`, exactly `beam.width` wide (15 / 13), rows `floor(beam.y)`..359: firing = orb[0] separation 1 px, orb[1] edge 2 px, orb[2] body, orb[3] 6 px core biased 0.5 px right, orb[3] 6-row pulse marks every 32 rows on the body/core boundary; warning = orb[1] lane at 30 %, orb[2] dashed 6/4 edges at 75 %, beamWarning marker (marker / marker-dim 120 ms) with its pivot at `(beam.x, laneTop + 9)`. Scrolling 64 px/s, static in reduced motion. Legacy `!` text and bar removed.

## Nova evidence

From the loaded strip pixels (Node decode of `art/rev01/sprites/nova.png`; same function as the browser derive):

- Strip 7766×1545 (12.0 M texels; fade-3 1545 wide) is never uploaded. Atlas 2048×416 (0.85 M texels), 801 tiles, 793,883 tile texels, 11 frames (fade-3 excluded; no tile source rect reaches fade-3's x range). Every opaque texel of the 11 frames is copied exactly; the atlas holds no other opaque texel. Matches T1's 2048×416 / 801 / ≤ 169.
- Tiles per frame 1, 1, 8, 24, 46, 67, 96, 116, 131, 142, 169. Drawn after culling, worst case over 2475 legal origins (8 px grid over the clamp): 1, 1, 8, 24, 46, 60, 59, 30, 20, 20, 5 quads.
- A plan above the limit throws (`maxDimension` 256 test).

This is software evidence of production code under Node, not a GPU upload. The browser upload, 1×/2× captures and dense-combat timing are T5.

## Tests (`tests/rev01-player-fx.test.ts`, 13)

Poses (traverse timing, immediate first step, no skipped level); sockets in the stage (bolts per pose over a right/left/release run, hull frame + exhaust positions per volley) and per-pose drawing of every cue art at the pivot / plasma muzzle; cue priority table; damage in the stage, normal and reduced (flash 6 ticks then blink; hit 15 ticks, shield until iFrames end, no flash, hull alpha 1); death neutral/banked (frame sequence and timing, core on 0–1, no hull/fireball, result timing); effects (lifetimes from spec, kinds by event, spark position, frame order, despawn); nova normal/reduced from the clamp corner while the ship moves (frame by time, tiles belong to the frame at the fixed origin, all on-screen tiles drawn, ≤ 169, order, fade-3 never shown, embers still, no flash in reduced); sparse atlas bounds/content/limit; atlas asset (stable lazy id, one fetch, decoded closed, only the 2048×416 bitmap, plan = upload layout, dispose, abort); 16 needle directions (pixel-exact integer expectation, every texel on a pixel, tip within 2° of the velocity, 16 distinct bitmaps); hostile shapes (every `emit(…, 0x……)` colour in `src` classified, no stale entries, radius 4, one native quad each); beam lanes 15/13 (bands, width, marks, dashes, marker pivot/frames, reduced static); pickup loop and reduced hold.

## Hostile shape table (presentation only)

Keyed by the colour each emitter already passes to `emit` (one colour per weapon; T3 files untouched). Needle = aimed: interceptor `0xff747d`, gunship `0xff9b70`, Gatebreaker turrets `0xffa07e`, Engine emitters `0xf4a0e4`. Orb = boss core rings: Gatebreaker `0xf2a5ec`, Engine `0xff88c8`. Bead = everything else: Gatebreaker and Engine curtains, Kiln head (`0xffaa76`: fans, ring and curtain share one colour) and segments, mine burst, sweeper fan; unknown colours fall back to bead. A test fails if a new emitter colour appears without a table entry.

## Gameplay-visible consequence (for the orchestrator)

Applying the spec per-pose primary muzzles (brief: sockets attach consistently in simulation and rendering; T1-REPORT: legacy muzzles "replace, not rescale") moves where bolts spawn: neutral ±9 px, −13 px instead of the legacy ±6.67, −17.33; banked poses are asymmetric (e.g. bank-right-3 −7/+6). Cadence, count, speed, damage, radius and RNG are unchanged. The bot still clears 9/9 with the numbers above (stage 1 kills 85 → 70, stage 3 kills 96 → 102). If the orchestrator considers this a balance change needing an owner card, the only alternative consistent with "sockets attach in simulation and rendering" is a different muzzle art; I did not choose one.

## Spec/code mismatches and choices

1. **Beam core 6 px on odd lanes — fixed:** restored the specified 6 px core in both 15/13 px lanes. Its centre has a deterministic 0.5 px right bias relative to the lane centre so all rectangle edges remain whole pixels; pulse columns derive from the actual core bounds. Collision/lane bounds and calm statics are unchanged. See T2-FIX-REPORT.md.
2. **Pose return:** spec player note says "the return to neutral is immediate"; README says "an immediate return toward neutral". Implemented as an immediate start toward neutral, one level per 50 ms, so no exhaust/muzzle jumps 5 px in one frame (FEEDBACK acceptance: no muzzle or flame jumps).
3. **Mine layering:** mine.integration asks for the mine below the minelayer hull; `LAYER.mine` sits above `LAYER.enemy`. Today the mine spawns 24 px below the minelayer pivot, entirely below its hull, so there is no overlap. If T3 moves the spawn to `minelayer.sockets.mineRelease` [0, 9], apply shared patch A.
4. **Nova vs HUD:** nova.layering says "below … the HUD"; presentation.layers (gate 5, later) puts the nova over the HUD. T1's table follows presentation; T2 uses `LAYER.nova`.
5. **Kiln ring shape:** the Kiln head's ring shares its colour with its fans and curtain, so it is a bead, not an orb. If the owner wants all boss rings as orbs, T3 gives that ring its own colour and T2 adds one table entry.
6. **Damage cue:** the legacy explosion sprite on the player at every hit and at death is removed (playerFlash/playerCalm and playerDeath replace it; playerDeath role: never read as an enemy kill). The cyan and peach particles remain.
7. **Durations not fixed by spec:** damage flash 100 ms (spec: "one brief flash"); low-hull 2 Hz as 0.25 s on / 0.25 s off; beam scroll 64 px/s; nova calm flare 120 ms ("about 120 ms").
8. **Reduced motion for loops/effects not covered by a spec substitute:** exhaust holds "medium" (legacy held its first frame); explosion/hitSpark/heavyBreakup play normally (legacy held explosion frame 2). playerDeath plays normally per spec.
9. **Core marker:** 7/3 (codeDrawn.playerCore) in legacy colours; playerDeath's afterimage was sized for the old 5 px marker (spec colorNote), not changed.
10. **Unused plasma assets:** plasmaCharge, plasmaMuzzle, plasmaShot and plasmaTrail are claimed by T1 but never drawn; plasmaReady/plasmaReadyCalm only behind `CHARGE_READY = false`; plasmaImpact only as an effect kind nothing spawns.

## Requested shared patches (not applied)

A. `src/config/layers.ts`, only if T3 spawns mines at `mineRelease` (mine below the minelayer hull), with the matching `tests/rev01-foundation.test.ts` order line:

```diff
-  ["hulls", ["bossLink", "enemy", "enemyDetail", "enemyMark", "enemyCue", "mine", "mineDetail", "mineCore", "pickup", "pickupGlow", "pickupMark", "playerExhaust", "player", "playerFlash", "playerCalm"]],
+  ["hulls", ["mine", "mineDetail", "mineCore", "bossLink", "enemy", "enemyDetail", "enemyMark", "enemyCue", "pickup", "pickupGlow", "pickupMark", "playerExhaust", "player", "playerFlash", "playerCalm"]],
```
```diff
-  order("bossLink", "enemy", "enemyDetail", "enemyMark", "mine", "pickup", "playerExhaust", "player", "playerFlash", "playerCalm");
+  order("mine", "bossLink", "enemy", "enemyDetail", "enemyMark", "pickup", "playerExhaust", "player", "playerFlash", "playerCalm");
```

B. Optional hardening, `src/services/rev01-assets.ts` `derivedImageAsset.load`: close the decoded bitmap even when the canvas step throws, and stop before deriving if aborted meanwhile:

```diff
-      const canvas = new OffscreenCanvas(decoded.width, decoded.height), context = canvas.getContext("2d", { willReadFrequently: true });
-      if (!context) throw new Error("2D canvas unavailable");
-      context.drawImage(decoded, 0, 0); decoded.close();
-      const source = context.getImageData(0, 0, canvas.width, canvas.height), result = derive(source);
+      let source: ImageData;
+      try {
+        const canvas = new OffscreenCanvas(decoded.width, decoded.height), context = canvas.getContext("2d", { willReadFrequently: true });
+        if (!context) throw new Error("2D canvas unavailable");
+        context.drawImage(decoded, 0, 0);
+        source = context.getImageData(0, 0, canvas.width, canvas.height);
+      } finally { decoded.close(); }
+      signal.throwIfAborted();
+      const result = derive(source);
```

C. `docs/rev01-integration/DECISIONS.md` (orchestrator-owned; paste-ready):

```markdown
## T2 implementation notes (implementer, 24 Oct 2026; unreviewed)

- Implementer: Claude Opus 5.5, high, single agent. Report: docs/rev01-integration/T2-REPORT.md. 73/73 tests, build pass, bot 9/9 clear (seeds 17/41/83), art 114/114 unchanged, main = HEAD = 840fc0a. Logs: .test-output/integration/T2/.
- Per-pose spec primary muzzles now spawn the bolts (neutral ±9/−13 vs legacy ±6.67/−17.33); cadence/count/damage/radius/RNG unchanged. Bot stage-1 kills 85 → 70, stage-3 96 → 102; all stages clear.
- Choices: pose level ≥ 50 ms each, immediate start toward neutral; beam core 6 px with a deterministic 0.5 px right bias (fixed after T2 review); damage flash 100 ms; Kiln ring stays a bead (shared colour); no fireball on player damage/death; reduced-motion exhaust holds medium, explosions play normally.
- Caller edits: combat-context.ts burst type; combat-collision.ts four burst arguments. Pending: layers.ts mine slot (only if T3 spawns at mineRelease); optional derivedImageAsset close-on-error.
```

## Limitations

- No browser or GPU run; all render evidence is quads produced by production code under Node. Real upload, 1×/2× captures, dense combat and human feel are T5/owner checks.
- Legacy `player-bank`, `exhaust`, `explosion` PNGs are no longer drawn but are still claimed by `stage-assets.ts` and bundled (T5 removes dead rasters/loaders).
- Scratch files in `.test-output/integration/T2/` (`scratch-*.log`, `dump-sprite.ts`) are intermediate investigation output, not evidence.
- Permission denials: compound shell commands (pipes with `head`, `echo $?`) were auto-denied and rerun as single commands; the engine package resolves outside the worktree, so its source was read with single `grep`/`cat`/`sed` calls instead of the file tools. No check was skipped.
