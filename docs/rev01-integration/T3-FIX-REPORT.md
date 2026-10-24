# T3 interpolation fix report

Implemented A–B from T3-FIX-BRIEF.md; ready for independent re-review, not self-accepted. Provider/model/effort: Codex, gpt-6.1-sol / medium as configured by the orchestrator; single worker, no subagents. Per-worker usage/cost unavailable.

## Changes

- src/bosses/kiln-serpent.ts: registers the private chain with public scene.resetInterpolation; previous = current collapses husk interpolation with live ECS poses at hit-stop/reset. Compression selection and simulation updates remain unchanged.
- tests/rev01-enemies.test.ts: two added production-stage regressions (section destruction and Nova), each with normal and reduced motion. A real stationary bolt destroys the middle section on tick 602; its entity disappears and the rendered husk remains. Nova uses normal KeyB input after the chain resumes and advances 20 ticks.
- Each regression proves moving/capped conditions, checks alpha 0/0.5/1 on the event boundary and every frozen tick including the last boundary, compares all live/husk hull and link vertices, requires successive pivot spacing >=34 px and the live-to-husk capped joint exactly 34 px, checks both link bands/cores terminate on visible coupling centres, and checks simulation resumes afterward.
- This fix report is the only report changed; DECISIONS.md remains orchestrator-owned. No shared patches requested by this fix.

## Validation

| Check | Result | Evidence under .test-output/integration/T3-fix/ |
| --- | --- | --- |
| Focused regressions | 2/2 pass; four scenarios including reduced motion | focused-test.log |
| Remove only new reset callback, then restore in finally | Both regressions fail at alpha 0 vs 0.5 hull/link geometry as expected | mutation-reset-removed.log |
| npm.cmd test after restoration | 73/73 pass, 0 skipped/failures | npm-test.log |
| npm.cmd run build | Both source/test typechecks and Vite production build pass | npm-build.log |
| Art baseline comparison | 114/114 identical; zero changed/added/missing | art-ref-check.json |
| Branch/ref | codex/starfall-rev01-t3; HEAD and main remain 840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d | art-ref-check.json |
| git diff --check | pass | completed terminal check |

## Checklist and limits

Read ticket T3, implementation/fix briefs, prior report/review, T1 seams, decision log, art README, exact Kiln head/segment spec entries and presentation layers, FEEDBACK How to use this 4–5, and ticket acceptance/checklist. Grepped affected Kiln/freeze/Nova tests; all original full-cycle path, collider, cadence, socket and render assertions remain intact. Native 1:1 dimensions, pivots, sockets, layering, approved collider geometry and compression rules are unchanged. No clocks/counts/radii/HP/RNG, charge-bar data or mechanics changed. No new art or gameplay contradiction.

Only the two owned source/test paths above and this report were written, plus ignored check logs/build output. Supplied dirty art is unchanged. No commits, main changes, installs, external Claude, browser, servers, memory/global writes, or subagents. Narrow worktree-write/check escalations were approved; no automatic-approval rejection. Sandboxed Git worktree diff/status initially reported that it must run in a work tree; explicit --work-tree with the authorized check completed without changing Git configuration.

Evidence is headless Node production-stage render/simulation with empty fixture assets and stub sound, plus build/typechecking. No browser/GPU, audible, physical-device or owner gameplay acceptance claimed. Existing T5 banner/font/cleanup work and documented head-relative section fans remain outside this fix. All commands have completed; no background commands remain.
