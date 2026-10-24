# T2 beam core fix

Codex gpt-6.1-sol/medium, one worker, no subagents. Owner replaced all remaining Claude work with Codex. Work in T2 worktree current branch. No commits/main changes/art edits/memory/global writes/installs/servers/browser/external Claude. Read T2-BRIEF/REPORT and T2-REVIEW plus exact spec codeDrawn.beamLane. Owner DECISION2 accepts spec muzzle geometry, no need revisit it.

A. Restore specified6px bright beam core in both15/13px firing lanes; keep hazard/lane bounds and gameplay unchanged. Document deterministic0.5px centering bias (choose one side) and retain whole-pixel rectangle edges. Pulse positions derive from actual resulting core bounds. Reduced motion remains static. Never shrink core to5for symmetry.
B. Update meaningful tests for actual production draw: both widths and fractional/integer beam positions, exactly6core columns, all integer edges, unchanged lane coverage, pulse alignment, reduced-motion statics. Remove hard-coded5px assertion. Mutation with5must fail. Correct T2 report beam compromise as fixed, and add own T2-FIX-REPORT.md.

Allowed files only src/render/player-fx-model.ts, src/render/player-fx.ts, tests/rev01-player-fx.test.ts, docs/rev01-integration/T2-REPORT.md and T2-FIX-REPORT.md. Shared asset close-on-error hardening and mine layering remain T5; do not touch shared sources.

Brief checklist: verify branch/base/main840fc0a unchanged; read ticket/exact sprite/codeDrawn/layers/reduced-motion entries and FEEDBACK4–5; assert only owned acceptance; grep affected tests/callers without weakening; native pixels/pivots/sockets/animations/layers preserved; chargeBar empty/no new mechanics; preserve all art114hashes; no game clocks/counts/radii/HP/RNG changes; record choices only own report (root owns DECISIONS); npm.cmd test and npm.cmd run build to completion, logs .test-output/integration/T2-fix; self-review against review and scope; report files/checks/mutation/limitations/model-effort; no background commands on return.
