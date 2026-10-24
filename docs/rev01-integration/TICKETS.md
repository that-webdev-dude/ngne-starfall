# Starfall rev01 integration tickets

Binding sources: the owner's integration brief, `art/rev01/README.md`, `art/rev01/spec.json`, `FEEDBACK.md` How to use this 4–5, and large-project-playbook sections 2, 4, 6, 7, 9, 11.

## Execution rules

- Integration branch: `codex/starfall-rev01-integration`, based on local main. Main must not move. No commits, pushes, tags, deployment, or art edits.
- Preserve the existing uncommitted rev01 README/spec changes. Hash the supplied art before implementation and compare at handoff.
- T1 runs alone. T2–T4 start only after T1 passes tests, build, campaign bot and independent read-only review. In this task, “merge” means apply reviewed changes to the integration working tree without commits.
- Parallel ticket worktrees need the reviewed, uncommitted T1 snapshot applied before work starts; do not create a checkpoint commit. Use disjoint ownership and patches if needed. Never use post-T1 main: main stays untouched.
- Maximum three working agents, reduced by the usage gate. Owner clarification: this is a Codex orchestration session; check Codex usage, not Claude usage. Read Codex usage before every implementer/reviewer/fixer start and during work. One ticket starts at <=55% session, two parallel at <=40%, review/fix at <=80%; nothing new above 90% weekly. If a window is unavailable, record that rather than inventing a reading. Record window/reset with every reading.
- Remaining roles after the owner's provider replacement: Codex gpt-6.1-sol/high implementer, xhigh read-only reviewer, medium fixes. Completed Opus work retains its actual model in the evidence. No further external Claude runs. Check Codex usage for all starts.
- CLI agents use restricted/safe mode and explicit workspace-only/no-memory instructions. No agent may update global memory, plans, settings or unrelated files. Read-only reviews return their report without filesystem writes.
- Read-only review per ticket before applying its result; resolve and re-review actionable findings. Record files, checks, evidence, limitations, and impl/review/fix cost in DECISIONS.md.
- Binding exclusions: plasma charging/input/damage/resource mechanics; tall mode; title redesign beyond viewport/font/menu kit; art generation or edits; encounter/timing/balance changes beyond explicitly approved world scaling and radii.
- Owner decision cards only for gameplay contradictions in binding values or required new art. List the affected element and options; never invent art or silently change gameplay.

## T1 Foundation — M

Status: ACCEPTED after focused re-review; applied uncommitted on the integration branch. Depends on: none. Blocks: T2, T3, T4 (gate released). Blocked until: none.

Scope:

- 640x360 VIEW; integer enlargement in device pixels, DPR-aware CSS sizing, centred clipping below 1x, clear #060d19. Resize/fullscreen/DPR changes update sizing.
- Audit every world distance, position, speed, acceleration, culling boundary, shake and bot geometry for exactly 4/3 migration. Preserve durations, cadence, counts, HP, damage, score, normalized values and random-stream behavior. Apply explicit spec radii, beam widths and existing approved player clamp instead of blindly multiplying exceptions.
- Spec-driven native rev01 asset module: direct PNG URLs under art/rev01 and JSON import attributes supported by Node tests. Frames, varying canvases, pivots, sockets and animation durations use one texel per logical pixel; no drawSize for new art.
- One layer table matching presentation.layers. Split combat-render into render/player-fx.ts, render/enemies.ts, render/hud.ts by moving responsibilities without additional behavior changes. Keep old artwork until replacement tickets.
- Establish non-overlapping shared asset registration/loading and renderer interfaces for the next wave, including sparse nova upload and font loading seams where needed.

Allowed files: src/config/*, src/components/* for spatial defaults only, src/services/display.ts, new src/services/rev01-assets.ts and required asset hooks/registration callers, src/style.css, src/ui/sprite.ts, src/systems/* for scaling and render extraction only, src/render/*, src/bosses/* for scaling only, src/entities/*, src/world/* for scaling only, src/scenes/* for coordinates only, tests/* and ticket evidence/docs. Art is read-only.

Acceptance evidence:

- tests/rev01-foundation.test.ts: device-pixel scale at DPR 1/1.25/1.5/2, small viewport clipping, native frame dimensions/pivots/animation validation, JSON import and shared layer ordering.
- Existing motion/combat/hostile/campaign tests updated for the coordinate migration without weakening assertions; focused tests verify unchanged cadence and encounter timing and explicit radii.
- `npm.cmd test`, `npm.cmd run build`, `node --experimental-strip-types tests/run-campaign-bot.ts` pass; bot clears all stages using only normal controls and read-only observations.
- Production build manifest/file inspection demonstrates imported rev01 PNGs are bundled. Record nova device texture-limit plan and measurements before T2 uploads it.
- Opus/xhigh read-only review: no unresolved gameplay contradiction, scaling omission, or test weakening.

Out of scope: replacing remaining art, new combat mechanics, stage-card behavior, menu redesign.

## T2 Player, projectiles, effects, nova — M

Status: ACCEPTED after Codex/xhigh re-review of 6px beam fix; applied uncommitted. Owner approved native player socket geometry. Depends on: T1. Runtime captures complete in T5.

Scope: seven player poses and flash counterparts; per-pose exhaust/muzzle sockets; primaryLance; hostile bead/needle/orb with 16 needle directions from three baked frames; plasma assets available but no charge behavior; explosion/hitSpark/heavyBreakup/playerDeath; 11-frame, 560 ms nova order with fade-3 neither played nor uploaded, sparse atlas and device texture-size check; pickup/mine/beamWarning; spec beam-lane colors; cue priority and playerCalm/plasmaReadyCalm/novaCalm paths. Keep gameplay timing and balance.

Allowed files: src/render/player-fx.ts, src/systems/combat-player.ts, combat-effects.ts, hostile-fire.ts; T2's player-fx-assets.ts hook/module and dedicated helpers/tests. Coordinate asset registration/interface changes through orchestrator. Mine render ownership moves here from the T1 enemy renderer interface; T3 does not edit its implementation. Shared collision and ECS changes require orchestrator coordination and retain existing mechanics.

Acceptance evidence: tests/rev01-player-fx.test.ts checks pose traversal, socket spawn positions, effect order/durations, 16 needle directions, nova sparse packing/excluded frame/device limit and reduced-motion cue priority. `npm.cmd test` and `npm.cmd run build` green; runtime dense-combat/nova/damage captures at 1x/2x in T5. Opus/xhigh review accepted.

Out of scope: charge mechanic, enemy/boss selection, HUD/screens, art edits.

## T3 Enemies and bosses — M

Status: ACCEPTED after Codex/xhigh re-review of husk interpolation fix; applied uncommitted. Owner approved 34px lag cap and native hostile/mine/part socket geometry. Depends on: T1. Shared wiring/runtime captures complete in T5.

Scope: interceptor/dart/gunship/warden/minelayer frame selection; Gatebreaker hull and independently driven turrets with right flip; Kiln -90-degree head/segment rotation and spec chain spacing, compressed/damaged/defeat/destroyed states; Starfall Engine hull and separate emitters; muzzle/attachment sockets from spec. Preserve encounter timing, HP, attacks and balance.

Allowed files: src/render/enemies.ts, src/bosses/*, src/systems/advanced-enemies.ts, combat-enemies.ts; dedicated T3 asset module and tests. Use T1 shared layer/asset seams. Coordinate banner-kind writes with T4 through orchestrator.

Acceptance evidence: tests/rev01-enemies.test.ts checks frame selection at cue/phase/death boundaries, flipped turret sockets, rotated sockets and assembled chain spacing. Existing boss/combat tests, `npm.cmd test` and `npm.cmd run build` pass. Runtime boss/part destruction captures per stage in T5; Opus/xhigh review accepted. Gameplay contradiction from chain spacing is an owner card if not already resolved by the supplied spec.

Out of scope: new attacks, plasma mechanics, mines/player/effect rendering owned by T2, HUD/menu work, art edits.

## T4 HUD, font, menus, screens — M

Status: ACCEPTED after Codex/xhigh re-review of three Low fixes; applied uncommitted. Depends on: T1. Shared banner/font/title wiring and runtime captures complete in T5.

Scope: font.png mask, 5x7 cells/6px advance/1x text and textColors; HUD bands/plates/bars/pips/marks at spec layout; low hull <=1; banner kind stage/sector vs PHASE alert; independent 2.6s stage card replacing stage-start banner; pause/settings/controls/results/menu kit with matching hit rectangles, toggles, meters, result plates and hudCalm. Charge bar always empty. Every presentation.integration/screens.integration item accounted for.

Allowed files: src/render/hud.ts, src/ui/bitmap-text.ts, src/scenes/menu.ts, src/world/session.ts for banner kind only, T4's font-assets.ts hook and dedicated asset/UI helpers/tests. Orchestrator owns minimal stage timer/initialization and boss/collision banner-kind call-site changes required by the new interface; submit requested changes rather than racing T2/T3.

Acceptance evidence: tests/rev01-presentation.test.ts checks glyph masks/metrics/missing characters, HUD positions/fill cropping, low-hull and calm states, stage card duration/banner suppression, menu pointer rectangles, meter/toggle mapping and result frame selection. Existing menu lifecycle tests, `npm.cmd test`, `npm.cmd run build` pass. Screens/settings/controls/results runtime captures in T5; Opus/xhigh review accepted.

Out of scope: plasma state/charge mechanic, title art/layout redesign, simulation changes, art edits.

## T5 Cleanup and verification — S–M

Status: COMPLETE for implementation/automated/browser evidence, ACCEPTED after Codex/xhigh re-review. 108 tests/build pass; campaign 9/9 clears; 30 required plus 38 supplemental captures verified. Depends on: T2, T3, T4. Owner physical-device/play cards remain pending; no commits made.

Scope: finish shared asset wiring, including native 640x400 stage backgrounds centred/cropped through their spec pivots in the 640x360 view; remove only superseded src/assets rasters/metadata and dead loaders; retain audio/provenance still used; README Run/Checks/source/provenance update; final runtime evidence and compact report.

Allowed files: dead src/assets raster/metadata files, services asset modules/imports and the thin combat render coordinator for final background/claim wiring, README.md, tests/browser-* and dedicated integration fixtures, evidence/rev01-integration-2026-10-24/*, docs/rev01-integration/*; .test-output/integration runtime artifacts are gitignored. Art stays read-only.

Acceptance evidence:

- `npm.cmd test`, `npm.cmd run build`, campaign bot all stages clear. No old raster path referenced in runtime/build. Baseline art hashes and main ref unchanged.
- Browser review pages and normal game exercised; screenshots from the running production composition at actual logical 640x360 and 1x/2x for each stage's play, boss, pause, card, result (30 minimum), with reduced-motion overlap coverage and settings/controls/death supplements.
- Compare each screenshot against relevant .test-output/art-gate1..5 sheets; record concrete discrepancies, not blanket visual approval. No static mockup presented as runtime evidence.
- Report browser/adapter/DPR/viewport/scaling and automation actions. Distinguish software/browser checks from real-device scaling, gamepad and human feel.
- MANUAL-CHECKS.md: one owner check card per stage at 2x/3x, motion on/off; copy-paste setup, exact steps/expected result/reply format. Decisions list plasma charging, optional tall mode and any discovered required art/gameplay contradictions.
- Opus/xhigh read-only review accepted. Stop without commits.

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
