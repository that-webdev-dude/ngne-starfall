# T4 review fixes A–C

State: implemented and locally validated in codex/starfall-rev01-t4. Ready for independent re-review; this is not final integrated acceptance.

## Changes

- A: src/render/hud.ts uses exact fractions [1/2], [1/2], [1/3, 2/3] for passed state, while bossThresholds retains the authored spec decimals for x placement. Module initialization asserts every exact fraction agrees with its corresponding spec decimal within 1e-4 (and their lengths agree). Engine 400/600 stays ahead, 399/600 is passed. T4-REPORT mismatch 5 now correctly records that the old 2/3 mark flipped earlier, and explains the fix.
- B: the card timer system uses the public engine 0.3.0 runsDuringFreeze:true option. No gameplay clock or freeze duration changed. A real KeyB on the first tick triggers Nova; the card remains visible on tick 155 and expires on stage update tick 156, while run.seconds is only 151/60 s. The existing long-pause test is unchanged and passes for all three stages.
- C: title non-screen legacy quads now all undergo the same rounded-centre assertion as stage legacy quads; there must be at least one such quad. Native screen corner/size checks and all stage assertions remain intact. Title raster art stays legacy until T5.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Full npm.cmd test after mutations restored | 78/78 pass, 0 failed/skipped | .test-output/integration/T4-fix/npm-test.log |
| npm.cmd run build | Passed source/tests typechecks and Vite production build | .test-output/integration/T4-fix/npm-build.log |
| Whole-HP boss mark sweep | 0..480 Gatebreaker, 0..540 Kiln, 0..600 Engine: 1623 health values, including all equality boundaries. Passed counts equal strict gameplay phase minus 1, or Gatebreaker enraged flag. Mark x columns remain spec-derived | rev01-presentation.test.ts and full test log |
| Mutation A: restore decimal passed-state comparison | New sweep fails at Engine health 400/600, actual 1 passed vs expected 0 | .test-output/integration/T4-fix/mutation-A.log |
| Mutation B: remove runsDuringFreeze:true | Real Nova test fails: card remains on tick 156 | .test-output/integration/T4-fix/mutation-B.log |
| Art and Git refs | All 114 art files match supplied baseline hashes; HEAD and main both 840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d; branch codex/starfall-rev01-t4 | .test-output/integration/T4-fix/boundaries.json |

The sweep independently reproduces the strict health comparisons read from the three boss implementations; it does not drive each boss update 1623 times. The Nova and pause checks run the real stage scene and engine tick/freeze handling. Both temporary HUD mutations were restored in finally blocks before the final full test run. Build ran against the same restored source bytes.

## Scope and remaining integration

Changed only src/render/hud.ts, tests/rev01-presentation.test.ts, tests/rev01-render-split.test.ts, docs/rev01-integration/T4-REPORT.md and this report, plus ignored required local test/build output. Existing T1/T4 changes and dirty art README/spec were preserved. No art, simulation, metadata, shared caller, registry, layer, native pixel/pivot/socket, reduced-motion, charge-bar, or banner semantic changes. Read presentation sprite entries/integration lists, README, FEEDBACK usage 4–5, ticket and decisions. Existing chargeBar-empty tests pass.

P1–P7 remain explicitly tracked in T4-REPORT; shared wiring, native title migration, shim deletion and browser captures remain T5's integration work. No browser, server, campaign bot, physical GPU or human acceptance was attempted during these fixes. No commits, main changes, external Claude, memory/global writes, or subagents. No background commands remain running.

Provider/model/effort: Codex (GPT-6-based agent), requested medium fix role; exact runtime model/effort and per-ticket token/cost billing are not exposed in this worker. Owner replacement of Claude/Opus was followed. Narrow worktree write/check escalation was approved automatically; there was no automatic-review rejection. Initial sandbox reads worked but writes and Git status required the approved escalation because this managed worktree is outside the current writable roots.