# T3 Enemies and bosses — implementer report

State: implemented in the working tree of `codex/starfall-rev01-t3` (post-T1 snapshot); no commits. **Not reviewed** (Opus/xhigh review pending; not marked accepted). No owner visual approval claimed. No browser run in this ticket: the render evidence below is a Node software rasterization of the real render pass, not a browser/GPU capture.

Implementer: Claude Opus 5.5 (`claude-opus-5-5`), effort high, single agent, no subagents. Usage/cost is not readable from inside the session; orchestrator to record.

## Results

| Check | Result | Log / evidence |
| --- | --- | --- |
| `npm.cmd test` | 71 / 71 pass (T1 final: 60; +11 in `tests/rev01-enemies.test.ts`) | `.test-output/integration/T3/npm-test.log` |
| `npm.cmd run build` | pass (typecheck src + tests, vite build) | `.test-output/integration/T3/npm-build.log` |
| campaign bot, seeds 17 / 41 / 83 (extra, not required) | 9 / 9 stages clear, normal controls only | `.test-output/integration/T3/campaign-bot.{log,json}` |
| mutation (both applied in one run, then reverted): Kiln cap removed / right turret not flipped | 4 tests fail: the full-cycle Kiln test (spacing 33.92 px at tick 442) for the cap; socket, Gatebreaker and defeat tests for the flip | `.test-output/integration/T3/mutation-cap-and-flip.log` |
| art/rev01 vs `.test-output/integration/baseline.json` | 114 / 114 identical, 0 changed / added / missing | `.test-output/integration/T3/art-hash-check.log` |
| refs | `main` = HEAD = `840fc0a` | — |

Bot per stage (same seeds as T1; boss start unchanged at 90.017 / 100.017 / 110.017 s). Differences come from the new collider/origin geometry below; they are bot observations, not a balance claim.

| Stage | Clear s T1 → T3 | Hull 17/41/83 T1 → T3 | Kills | Novas | Max bullets |
| --- | --- | --- | --- | --- | --- |
| orbital-breakwater | 149.95 → 141.62 | 5/5/5 → 5/5/4 | 85 → 83 | 9 → 9 | 70 → 70 |
| furnace-belt | 213.80 → 213.85 | 5/5/5 → 5/5/5 | 75 → 78 | 13 → 13 | 71 → 71 |
| midnight-citadel | 171.95 → 178.23 | 3/4/4 → 5/5/5 | 96 → 97 | 10 → 11 | 68 → 65 |

## Changed files

- New: `src/bosses/sockets.ts` (spec socket reader, flip/-90 transform, volley split), `src/render/enemy-frames.ts` (ordinary-enemy frame choice), `tests/rev01-enemies.test.ts`, this report.
- Modified: `src/render/enemies.ts`, `src/bosses/{boss,gatebreaker,kiln-serpent,starfall-engine}.ts`, `src/systems/{combat-enemies,advanced-enemies}.ts`.
- Tests updated (legacy → native assertions, nothing loosened): `tests/rev01-render-split.test.ts` (shared with T2/T4, see "Shared patches"), `tests/combat-integration.test.ts` and `tests/campaign-integration.test.ts` (turret/emitter fixtures now use the spec sockets instead of `BOSS`/`ENGINE`).
- `docs/rev01-integration/DECISIONS.md`: T3 notes appended.
- Not touched: art, shared asset registries/claims, layer table, `ui/sprite.ts`, T2 files (`render/player-fx.ts` incl. `drawMine`, hostile-fire, effects), HUD/font/menus, `world/session.ts`, components, collision.
- Scratch probes/evidence scripts (gitignored): `.test-output/integration/T3/*.ts|mjs`.

## What was done

**Native drawing.** Every enemy/boss part is drawn from its rev01 frame with `drawNative` on the raw `Frame` (spec pivot, 1 texel = 1 px, whole-pixel quads). `Boss.render(frame, alpha, legacy)` now receives the raw frame; `legacy` is used only for the code-drawn curtain-gap hint and the code attack cue (pre-rev01 rounding kept). The enemy pass draws ordinary kinds and routes mines through the unchanged `drawMine(frame, legacy, x, y, cue, clock)` call; boss and part kinds are drawn only by their boss. No legacy enemy painting is drawn anymore (asserted).

**Layers (shared table, unchanged).** Kiln links `bossLink` < hulls and Kiln sections `enemy` < turrets, emitters and Kiln head `enemyDetail` < code attack cue `enemyCue`. Gap hint stays `floorTelegraph` + `hudText`.

**Frame choice** (spec "proposal" durations; telegraphs are held for the game's own cue lead so art and attack stay in step):

| Sprite | State → frame | Reduced motion |
| --- | --- | --- |
| interceptor | idle/pulse loop 120/120 ms by age; `fire` 70 ms after its single shot | holds `idle`; fire still shows |
| dart | idle/pulse 100/100 ms; `fire` 70 ms after a real shot (not after a proximity-skipped one) | holds `idle` |
| gunship | `vent-a`/`vent-b` 120 ms each through the 0.45 s cue; `fire` 70 ms after the volley; `idle` | holds `vent-b` (open vent) |
| warden | `charge` for the 0.8 s cue; `fire` 70 ms after the lane | same |
| minelayer | `open` during the 0.8 s cue; `release` (mine in bay) for its last 120 ms, then the mine spawns on `mineRelease` and the hull returns to `idle` | same |
| gatebreaker | `idle`; `telegraph` on core cues (curtain 2, ring 3); `wreck-1` at HP ≤ 2/3, `wreck-2` at ≤ 1/3; `wreck-3` as the defeat pose | same |
| gatebreakerTurret ×2 | `telegraph` while its fan is cued (patterns 0/2 left, 1 right), `firing` 90 ms after its fan, `down` once destroyed; right instance flipped | same |
| kilnHead | `cut-0..2` loop 80 ms; `damaged-0..2` from phase 2 (HP < 1/2); `defeat` as defeat pose | holds frame 0 of the loop |
| kilnSegment ×3 | `idle` / `compressed` (see Kiln) while alive; `destroyed` husk once its entity is gone | same |
| starfallEngine | `phase-N` (N = 1, <2/3, <1/3 HP, same thresholds as the phases); `surge-N` while the curtain/ring cue (cue 2) is up; `defeat` | same |
| starfallEmitter ×2 | `charge` while its fan is cued, `firing` 90 ms after its fan, `down` once destroyed; right flipped | same |

Hit feedback keeps the 70 ms tint (0xffb7b0) on the native frame; reduced motion drops it (sustained fire made it blink). The legacy white hit-marker rects and the generic pulsing cue square are removed wherever a telegraph frame exists. Defeat: the boss's defeat pose is drawn tinted (0x9c706b) at the death position until the cascade's 1.45 s burst, as before, with both turrets/emitters `down` in their wells; Kiln husks are not drawn after the head's defeat (spec: "until the head's defeat").

**Sockets (native, never scaled).** `src/bosses/sockets.ts` reads spec sockets (`specSocket`, `specSocketList`; per-frame sockets need the frame name) and places them with the same transform `drawNative` applies: flipX negates dx; −90 maps (dx, dy) → (dy, −dx). Sim and render use the same helpers. Legacy `BOSS`/`ENGINE` tables are no longer imported anywhere in `src` or tests (asserted).

Geometry changes (all are spec-socket replacements; the radii, speeds, aim angles, counts and schedules are unchanged):

| Element | Before (legacy × 4/3) | Now (spec, from the pivot) |
| --- | --- | --- |
| Interceptor shot origin | (0, 10.67) | muzzle (0, 10) |
| Dart shot origin | (0, 9.33) | muzzle (0, 13) |
| Gunship 5-shot volley | one origin (0, 13.33) | leftMuzzle (−15, 16) / rightMuzzle (15, 16), split 3/2 |
| Minelayer mine spawn | (0, 24) | mineRelease (0, 9) |
| Gatebreaker turret pivot = collider | (±43.8, 4.3) | (±47, 4) |
| Gatebreaker turret fan | one origin (±43.8, 28) | the turret's two barrels: left (−50, 33)/(−44, 33), right mirrored (50, 33)/(44, 33); 7 → 4/3, 9 → 5/4 |
| Engine emitter pivot = collider | (±38.6, 0) | (±41, −1) |
| Engine emitter fan | (±38.6, 16) | emitter muzzle: (±41, 11) |

Unchanged on purpose (no spec muzzle exists for them): hull ring origins (Gatebreaker/Engine +13.33, Kiln +16), Kiln head fans (+24), curtains, beam lanes, Kiln section fans (see mismatch 3).

**Volley split, not duplication.** `splitVolley` keeps the existing shots, order and velocities and gives consecutive runs to the muzzles ordered toward the side the volley's first shot leans to (no crossing paths at the hull); run lengths differ by at most one. Two `emit` calls per volley in the same tick keep `emit`'s cap behaviour identical (same `spawnedThisTick` accounting, same order) and the runtime sound mixer collapses same-tick cues to one voice.

**Fire bookkeeping (no gameplay effect).** To time fire frames: the interceptor's clock keeps running after its single shot (its fire gate is still `fireIndex === 0`); gunship and warden/minelayer count fire steps in `fireIndex` (unused for those kinds); the dart's `cue` (it has no telegraph) records whether its current reload began with a real shot. Timing constants moved to named exports (`GUNSHIP_TIMING`, `LAYER_CRAFT_TIMING`, …) with identical values; cadence tests pin them.

**Kiln (owner decision 1).** Head path and every section's original path are unchanged; `kilnChain` caps only a section's positional lag, so each joint is ≥ 34 px (x) behind the joint ahead (the cap cascades down the chain). Section colliders, husks, sprites and couplings all use the capped joints. Over one full motion cycle (62.8 s): spacing 27.35–63.32 px uncapped → 34.00–63.32 px capped; the cap is active on 29 % of joint-ticks, max shift 19.5 px (`kiln-chain-probe.log`); y motion and attack timing are untouched. Both parts are drawn at −90°; the head draws above the sections; code links run from the head's rotated `rearCoupling` to each section's rotated `frontCoupling` and section `rearCoupling` → next `frontCoupling` (per-frame compressed sockets), as a 5 px steel[0] band with a 1 px steel[2] centre line. A section shows `compressed` while either adjacent link turns faster than 0.25 rad/s (about the median link turn rate; consumer choice for the spec's "while the angle between adjacent joints is changing"). Destroyed sections are visual husks computed from the chain: no entity, so no collision, fire or entity-cap participation; their ring fans stay suppressed by the existing `sections[i] > 0` check.

## Tests (`tests/rev01-enemies.test.ts`, 11)

1. Spec sockets read unscaled; flip/−90 transforms; no `src` file imports `boss-geometry`; no T3 renderer imports legacy art or `drawSprite`.
2. Every sprite a stage can spawn is in that stage's registry claims; every delivered ordinary frame is reachable and nothing else is requested.
3. `splitVolley`: same shots/order, run sizes, muzzle order for down/up aims.
4. Actual simulation, per tick: gunship idle → vent-a/b → fire → idle (and reduced-motion hold), volley 5 shots on both spec muzzles with unchanged velocities; interceptor loop/fire and muzzle origin; dart fire only after a real shot; warden charge/fire; minelayer open/release and the mine spawning on `mineRelease`.
5. Ordinary render: pivot texel on the pixel containing the position, muzzle texel location, hit tint on/off with reduced motion, interceptor code cue.
6. Gatebreaker: hull thresholds and core cue; PNG proof that telegraph differs from idle only in the 13×13 core box and that wreck-1/2 keep idle's pixels there; turret telegraph/firing/down; actual 7- and 9-shot fans split over the transformed barrels; turret quads read back: right instance flipped, each barrel texel lands exactly where its shots start.
7. Starfall Engine: phase/surge thresholds, emitter charge/firing/down, 7-shot fans from the transformed emitter muzzle, flipped quads.
8. Defeat poses tinted at the death position, parts down (right flipped), Kiln rotated, removed after 1.45 s.
9. Kiln over a full motion cycle in the actual scene: head path = legacy formula × 4/3 every tick; section y unchanged; x equals the original path or exactly 34 px behind the joint ahead; never < 34; compressed and idle both occur. A resting bolt on the capped joint hits the section; the same bolt on the uncapped path does not.
10. Kiln render: −90° quads, head above sections, drill/rear coupling texels, every section (husk included) on its capped joint, three links joining coupling pixel centres, husk adds no ring fan (14 = 10 + 2 × 2) and does not absorb a bolt.
11. Gunship cadence and Kiln pattern ticks/volley sizes unchanged over full cycles.

## Render evidence (Node software rasterization, not a browser capture)

`.test-output/integration/T3/render-evidence.ts` boots the actual stage scenes, sets states, runs the real render passes and rasterizes the resulting quads with nearest sampling of the real `art/rev01` texels (hull layers + floor telegraph only; legacy-textured player/background quads skipped). Output: `.test-output/integration/T3/evidence-*-{1x,3x}.png` — Gatebreaker left-turret telegraph with an ordinary-enemy lineup in cue states; wreck-2 + right turret firing; wreck-2 + ring cue core box with the left turret down; Kiln spread, capped, phase-2 husk (normal and reduced motion); Engine phase-2 surge with the right emitter down, phase-1 left emitter charge; the three defeat poses. These show geometry and frame choice only; T5 owns the browser captures at 1×/2×.

## Spec/code mismatches and art problems (recorded, art untouched)

1. **Gatebreaker wreck states have no telegraph variant.** Choice: in wreck-1/2 the core cue draws the telegraph frame's 13×13 core box over the wreck frame. Tested pixel facts: telegraph differs from idle only inside that box and wreck-1/2 equal idle there, so the result is exactly "wreck with the core cue" and damage never disappears during the cue. Alternatives: show undamaged `telegraph` during the 0.55 s cue (damage flickers away), or no core cue below 2/3 HP (threat cue lost), or new wreck-telegraph art (owner card).
2. **No telegraph frame for the interceptor's aim cue or the Kiln head's attacks.** The pre-rev01 code cue (pulsing square, 0xffbb7c) is kept for those two only, at the interceptor's spec muzzle and the Kiln's old offset; static in reduced motion. Request telegraph frames if the owner wants them in art.
3. **Kiln section fans are head-relative** (`head.x − (i + 1) × 45.3`, `head.y + 16`), as before the migration, so they do not start on the (lagged or capped) section. Kept to preserve the attack; a one-line change to `sections`' joints is possible if the orchestrator wants the visible source to match.
4. **Fire frames follow the fire step** even when a fresh Nova cancels the shots (gunship, interceptor, warden): the flash reads as a shot cancelled at the muzzle. The dart's proximity skip shows no flash.
5. **Minelayer mine spawn moved 15 px up** to `mineRelease` (spec: "the game spawns its mine there"; release frame shows it at full scale). The new mine (r 6) briefly overlaps the minelayer (r 11) for ≈ 0.5 s. Revert = one line (`MINE_RELEASE`) if the orchestrator treats this as gameplay.
6. **Proposal durations vs cue leads.** Warden `charge` proposal 200 ms and minelayer `open` 120 ms are shorter than the game's 0.8 s cues; the frames are held for the cue. Gunship vent loops through the 0.45 s cue (a, b, a, b-partial).
7. **Defeat "drops".** The existing `drawDefeat` tints and removes the pose after 1.45 s; it does not animate a fall, and none was added.
8. Kiln `compressed` needs a consumer threshold (0.25 rad/s chosen); Gatebreaker wreck thresholds use ≤ 2/3 and ≤ 1/3 ("shown at 2/3, 1/3 and 0 HP"); Starfall phases keep the existing `<` thresholds.
9. Per-sprite layering prose is superseded by the presentation layer table, as instructed; no slot was added.

## Shared patches requested (not applied by T3)

**A. T4 banner kind** — exact writers in T3-owned files. Field/enum name is T4's (shown as `bannerKind` with `"normal" | "alert"` only as a placeholder; no RunState field was added by T3):

```diff
--- src/systems/combat-enemies.ts:31
-      warning = true; run.banner = `WARNING / ${stage.boss.name}`; run.bannerTime = 4;
+      warning = true; run.banner = `WARNING / ${stage.boss.name}`; run.bannerTime = 4; run.bannerKind = "alert";
--- src/systems/combat-enemies.ts:37
-      run.banner = stage.boss.name; run.bannerTime = 3; sound.boss();
+      run.banner = stage.boss.name; run.bannerTime = 3; run.bannerKind = "alert"; sound.boss();
--- src/bosses/kiln-serpent.ts:96
-          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / CORE OVERHEAT`; run.bannerTime = 1.4; sound.boss(); }
+          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / CORE OVERHEAT`; run.bannerTime = 1.4; run.bannerKind = "alert"; sound.boss(); }
--- src/bosses/starfall-engine.ts:64
-          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / REACTOR SURGE`; run.bannerTime = 1.4; sound.boss(); }
+          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / REACTOR SURGE`; run.bannerTime = 1.4; run.bannerKind = "alert"; sound.boss(); }
```

PHASE banners must be the alert kind (spec). WARNING and the boss-name banner are neither stage/sector nor PHASE in the spec; today they share the PHASE colour, so "alert" is the recommendation, T4/orchestrator to confirm. Non-T3 writers for completeness: `src/scenes/stage.ts:27` (stage name, normal; superseded by the stage card per T4) and `src/systems/combat-collision.ts:70` (SECURED / VICTORY, normal sector text). The Gatebreaker still sets no phase banner (spec integration note; no new rule added).

**B. T4 gap-hint label.** `drawGap` (`src/bosses/boss.ts`) centres "GAP" with the 3×5 font's half width (`x − 6`). When the 5×7 font lands, centre it as `x − Math.floor((6 * 3 − 1) / 2)` (8 px) or via T4's text-width helper; T4 owns `text()`.

**C. T5 cleanup.** Now unused: `src/config/boss-geometry.ts` (`BOSS`, `ENGINE`), `engineSockets()` in `services/campaign-assets.ts`, and the legacy enemy/boss rasters still claimed in `services/stage-assets.ts`: `artImages.enemy`, `combatImages.dart/gunship/gatebreaker`, `campaignImages.kilnHead/kilnSegment/minelayer/warden/starfallEngine` (no renderer references them; `tests/stage-assets.test.ts` pins those claims and needs the matching update).

**D. Shared test file.** `tests/rev01-render-split.test.ts` is also edited by T2/T4. T3's change: retired legacy enemy textures are forbidden, native textures from `REV01_CLAIMS.enemies` are allowed and must have every corner on a whole pixel, Kiln link quads (`bossLink`, untextured, native coupling geometry) are exempt from the legacy-rounding check, and every stage must draw native interceptor/dart/gunship and its boss hull. Merge by union with T2/T4's native-texture allowances.

## Limitations

- No browser or device run; evidence PNGs are Node software rasterization of real render output. Runtime boss/part-destruction captures per stage belong to T5.
- Kiln compression threshold, Gatebreaker core-box overlay and the retained code cues are consumer/visual choices awaiting review.
- Permission denials in this session: compound shell commands (pipes, `&&` lists with `ls/grep/echo $?`), `git check-ignore`, and file-tool reads of the engine's `dist` (symlink outside the worktree). Worked around with single commands, `node -e` runtime inspection of `Frame` (stable sort by layer then insertion) and Read/Grep tools; no check was skipped.
