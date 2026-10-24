# T4 medium review fixes

Role Opus/medium, one worker, no subagents. Work only in the T4 worktree on its current branch. No commits/pushes, art edits, memory reads/writes, plans/settings/global files, installs, servers or browser control. Ignore automatic memory instructions. Read T4-BRIEF, T4-REPORT and T4-REVIEW. Preserve the accepted native UI behavior and all simulation values.

Fix all three Low review findings, within src/render/hud.ts, tests/rev01-presentation.test.ts, tests/rev01-render-split.test.ts and own report/fix-report only:

A. Boss mark passed state uses exact game fractions, separately from spec decimal x placement. Assert exact fractions match decimal spec within1e-4. Health400/600 is ahead (phase1);399 passed. Test whole health ranges for all stages against actual phase/enraged rules, including boundary equality. Correct report's backwards later/earlier statement. Do not change boss gameplay thresholds or art metadata.

B. Card timer system runsDuringFreeze:true using public engine0.3 API, ends156actual stage update ticks/2600ms even if Nova hit-stop occurs, still pauses when pause menu blocks stage updates. Drive real KeyB early, verify run.seconds lags5ticks but card expires tick156, keep existing pause test. Do not change gameplay seconds/freeze timers.

C. Add native title/legacy wrapper verification requested in review: until T5 migrates title old raster draws, all title non-screen legacy quad centers rounded. New native quads retain corner alignment checks. Do not weaken existing stage assertions.

Brief checklist: verify branch/base/main unchanged; read exact owned spec entries/presentation lists and FEEDBACK4–5; preserve art114files; edit only allowed files; shared integration patches remain tracked; native pixels/pivots/sockets/layers and reduced-motion paths unchanged; chargeBar empty; grep affected assertions/callers; no new gameplay rules; run npm.cmd test and npm.cmd run build to completion; save .test-output/integration/T4-fix logs; self-review exact mutation/boundary evidence; handoff files/check results/limitations/model-effort/cost in response and docs/rev01-integration/T4-FIX-REPORT.md. Do not mark fully integrated until T5 shared wiring/browser captures. Never return with background commands running.
