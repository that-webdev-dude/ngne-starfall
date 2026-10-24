# T1 fix brief

Role: Opus/medium, fresh focused fix agent, no subagents. Codex gate: 4% weekly, ordinary usage allowed; separate five-hour window unavailable. Owner says not to check Claude usage. Same integration branch; no commits, branch changes, pushes or art edits. Main/HEAD must stay 840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d.

Read T1-REVIEW.md, T1-REPORT.md, TICKETS.md's T1/checklist and DECISIONS.md. Read the relevant spec entries and touched modules/tests. Fix only A–D below, then finish the required checks; do not repeat a full project research pass. Everything was green (57 tests, build, 9 bot stage clears) before these changes. The orchestrator also compared actual immutable main modules (evidence in T1/orchestrator-*.json), and the built game passed a title -> stage 1 -> pause browser smoke at 2x with no reported errors. The review's earlier browser/baseline gaps are superseded by that evidence.

A. Preserve actual interceptor exit ticks at floating-point ties. The review accepts the one-tick difference as Low, but the owner's requirement is unchanged timing, so fix it instead of accepting it. For real 5-ship wave spawn rows -22/-36/-50, current migrated exits occur at 483/504/525 rather than main's 484/505/526. Use the smallest numerical-boundary correction (e.g. a tiny, documented tolerance only on the affected interceptor y exit predicate), without moving the intended 300 legacy-px boundary or changing other enemy behavior. Add real spawn-row exit-tick assertions against the immutable baseline simulation and cover 4-/6-ship rows too. Do not weaken or merely relabel the timing guarantee. Keep the correction well below a rendered pixel.

B. Add worker-owned asset hooks before the parallel wave. T2 must add its derived nova atlas and T4 must replace raw font loading with its derived mask without both editing rev01-assets.ts. Use two small worker-owned modules (suggest src/services/player-fx-assets.ts and font-assets.ts), lazy stable getters and shared claim functions that already consume them. A T1 font hook may return the current raw font asset; T4 supplies its mask later. Ensure raw and masked font definitions can never both be claimed under one ID; use one consistent font getter for stage and screen claims. T2's extra image getter can be empty until T2. Keep Node metadata import side-effect free, avoid circular-initialization hazards, keep direct art URLs/no copies, and keep all 53 PNGs bundled. Update registry tests to derive expectations through the hooks. Document exact ownership and API names in T1-REPORT.md for later briefs.

C. Complete the world-value audit in src/components/flight.ts and combat.ts, which were accidentally omitted from the implementer's file list. Unused schema defaults still contain old positions, radii/size and beam width. Bring spatial defaults into the 640x360/spec convention, using existing named defaults/spawn conventions where appropriate. Do not change dimensionless/timing/HP/damage fields or production behavior; real spawns override these fields. Use a small assertion in the existing foundation coverage if needed, not a separate suite.

D. Fix the mine-render seam now, preserving T1's current appearance. `createEnemyRender` currently passes its legacy rounding wrapper into drawMine. That cannot carry T2 native odd-sized mine quads correctly. Change the shared drawMine contract to receive the actual native Frame and the legacy Frame separately (then x/y/cue/clock); T1 continues drawing through the legacy argument. T2 will use the native argument; T3 keeps the agreed call signature. Update caller/smoke coverage and document this seam. No native mine replacement in T1.

Allowed files: the above component/asset modules, src/render/player-fx.ts and enemies.ts for seam only, src/systems/combat-enemies.ts for numerical predicate only, relevant existing tests/helpers, and this ticket's report/decision notes. Art read-only. Do not implement T2–T4 or delete dead legacy loaders (engineSockets deletion belongs to T5).

After fixes, run `npm.cmd test`, `npm.cmd run build`, and `node --experimental-strip-types tests/run-campaign-bot.ts .test-output/integration/T1/fix-campaign-bot.json 17 41 83` to completion. Logs in .test-output/integration/T1/fix-*.log. Recheck art hashes and main ref. Update T1-REPORT.md with final count/results and exact new hook/mine interfaces. Return a compact lettered A–D disposition and actual check results. Orchestrator handles status and costs. Do not write to the shared DECISIONS.md while the orchestrator is using it; put requested notes in the report.

Brief checklist:

- Work from the approved integration snapshot of local main; verify branch/base, no main moves or commits. Preserve supplied dirty art files.
- Read this ticket, relevant spec entries, definition of done and decision log.
- Assert only what this ticket owns. Derive shared inventories from the registry. Coordinate semantic caller changes.
- Grep tests for replaced geometry/text; update all affected assertions without weakening them.
- Native frames use spec pivots, sockets and timing; shared layers and reduced-motion paths remain binding. Plasma mechanics remain excluded.
- Use existing waits, frame counting and platform handling where relevant; no browser work needed in this fix.
- Record choices/mismatches in the ticket report, never in art/spec. Report gameplay contradictions or new art needs to the orchestrator.
- Finish tests and build before handing off. Never end while a background command runs or kill unrelated processes.
- Self-review A–D and report files, evidence, limitations and actual model/effort.
