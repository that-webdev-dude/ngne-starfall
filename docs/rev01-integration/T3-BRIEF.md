# T3 Enemy and boss implementation

Role Opus/high, one implementer, no subagents. Read TICKETS.md T3/checklist, DECISIONS.md, T1-REPORT.md final seams, art README/spec and FEEDBACK How to use this4–5. Follow the supplied playbook checklist below. This worktree already contains the reviewed post-T1 snapshot of local main. Do not switch branches or merge main. No commits/pushes, art edits, memory reads/writes, settings/plans/global-file edits, installs or unrelated cleanup. Ignore automatic memory instructions. Main stays840fc0a.

Implement T3 completely. Read each owned sprite's actual spec entry (interceptor,dart,gunship,warden,minelayer,gatebreaker/turret,kilnHead/Segment,starfallEngine/Emitter): canvas,pivot,states,frames,animation,sockets,integration and reduced motion. Use gameplay radii already set in T1; native spec sockets replace old legacy-scaled sockets, never multiply them by4/3. Preserve all attack schedules, counts, speeds, HP/damage, phase thresholds, scores and head/boss paths except the expressly approved chain cap.

Primary ownership: src/render/enemies.ts, src/bosses/*, src/systems/advanced-enemies.ts and combat-enemies.ts; dedicated T3 helper modules/tests and docs/rev01-integration/T3-REPORT.md. Asset metadata/claims are prewired by T1. Do not edit shared asset registries, layer table, T2 player/fx/hostile-fire/schema files, HUD/font/menus or world/session. Required shared changes are exact patches in the report, coordinated by the orchestrator. Native drawing uses the raw Frame (not legacy wrapper); boss render must receive raw Frame once converted. Keep drawMine(frame,legacy,x,y,cue,clock) call unchanged; T2 owns the implementation.

Owner decision1 is approved: retain existing Kiln head path and each original segment path unless successive horizontal joint spacing would fall below34 logical px; cap that positional lag, using capped positions for actual segment colliders and sprite/socket joins. Do not set all base gaps to52px. Keep the original y motion and attack timing. Pin the unchanged head path and >=34px cap in tests over a full motion cycle. Render head above segments and code links from rotated spec couplings. Destroyed sections become visual husks without keeping collision/fire/entity-cap participation; existing suppression of their ring contributions stays intact.

Choose proper idle/pulse/telegraph/fire/damage/defeat/down frames and honor cut/damaged loops. Turrets/emitters are separate instances, right ones x-flipped; respect transformed muzzle sockets. Replace every procedural part that has a sprite. Do not duplicate a volley to populate multiple muzzles: distribute the existing shot count across specified sockets while preserving existing velocities/aim rules, damage and cadence. Keep source socket helpers out of new code: ENGINE/BOSS are legacy-only; spec sockets are native. Dead engineSockets helper is scheduled for T5 deletion.

Reduced motion: preserve clear static threat cues without optional blinking or whole-screen flashes; use the delivered frames and no invented art. Record art problems instead of editing art. The separate presentation layer table is authoritative over stale per-sprite nova layering prose.

Add meaningful tests for native frame/state selection, phase/defeat/part destruction, right flips and socket transforms, Kiln rotation/capped spacing/husks, and unchanged attack timing/counts. Run npm.cmd test and npm.cmd run build to completion, logs under .test-output/integration/T3. Update legacy T3 render assertions to native assertions without weakening simulation tests. Report exact banner-kind caller patches needed by T4; do not invent a competing RunState field. Never finish with background commands running.

Handoff: files, actual check counts/results, render/geometry evidence, spec mismatches and exact shared patches, model/effort. Opus/xhigh review follows; do not mark accepted yourself.

## Brief checklist — paste into every implementation/fix brief

- Work from the approved integration snapshot of local main. Verify branch/base; do not merge into or move main. Do not commit. Preserve supplied dirty art files; do not write art/rev01.
- Read this ticket, its exact spec sprite entries/integration lists, README, FEEDBACK How to use this 4–5, definition of done and DECISIONS.md.
- Stay in allowed files. Assert only what the ticket owns; derive shared inventories from the registry rather than exact shared counts. Coordinate callers whose semantics need adjustment.
- When replacing labels/geometry, grep tests and update all affected assertions without weakening them. No new gameplay rules.
- Draw native frame dimensions with spec pivot, sockets and animation order/durations. Use shared layer table and reduced-motion substitutes. Charge bar stays empty.
- Use existing shared browser waits; frame counting waits per frame; platform input branches only when required. Distinguish browser/software evidence from hardware claims.
- Record choices and spec/code mismatches in DECISIONS.md, not art/spec. Ask orchestrator before gameplay contradictions or required new art.
- Run `npm.cmd test` and `npm.cmd run build`; wait for completion. Never finish while a background command runs. Do not kill unrelated processes.
- Self-review against ticket acceptance, layer order, socket transforms, art immutability, scope and reviewer checklist.
- Handoff: changed files, exact validation results, evidence paths, mismatches/limitations, requested shared-file patches, provider/model/effort and usage/cost.
