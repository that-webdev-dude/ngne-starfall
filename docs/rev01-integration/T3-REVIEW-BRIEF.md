# T3 read-only review

Role Opus/xhigh, read-only. No edits, commits, memory reads/writes, plans/settings/global files, servers or subagents. Read T3-BRIEF.md, T3-REPORT.md, ticket/checklist, art README/spec and FEEDBACK sections4–5. Ignore automatic memory instructions. Return report in response only, no writes.

Compare T3 delta against accepted T1 .test-output/integration/post-T1-baseline, not git HEAD. Actual engine0.3.0 reference is .test-output/integration/engine-reference-0.3.0. Public APIs only; historical0.2.2 evidence is irrelevant.

Owned source: render/enemies and enemy-frames, bosses/* including sockets helper, advanced-enemies/combat-enemies, affected integration tests/own tests/report. Check every owned sprite state, canvas/pivot/socket transform, native raw Frame, right flip and Kiln -90 rotation; layering/cues/reduced-motion and destruction/defeat parts. Dead parts/husks must not collide, shoot or affect entity caps. Defeat assemblies must follow actual defeat translation/tint.

Owner DECISION1 approved only capping section x lag where needed to maintain34px minimum successive x spacing, cascading down chain. Head path, section y, original nonoverlapping path and attack timing must remain identical. No global spacing52 or gameplay redesign. Check full-cycle actual colliders/visuals and destroyed husks. Section fans remain legacy head-relative because spec does not supply a muzzle; report as visual limitation.

Spec socket changes to hostile origins/part collider centers are identified gameplay geometry differences; owner decision being handled by orchestrator. Review correctness and identify any other differences. New barrel split must preserve bullet count, velocity order, caps, aiming, RNG and sound voice behavior even under cap/Nova cancellation. Do not accept extra volleys or hidden audio changes just because bot clears. Verify cadence and cues in real simulation.

Check Gatebreaker wreck telegraph core-box composition is exact existing art pixels and preserves damage state. Missing interceptor/Kiln telegraph art retains code cues; no new art authorized. Verify all per-frame sockets and minelayer release fit, no unwanted draws of legacy textures. Mine layering is tracked shared T5 patch. T4 banner kinds and GAP native font migration are tracked shared T5 changes; T3 report uses placeholder kind names, actual enum is stage|sector|phase. Stage warning/boss name sector, PHASE phase per T4.

Reported71tests/build pass, bot9/9clear with new geometry changing some hull/kill totals; mutation cap/flip failures. Node raster evidence is not browser/GPU evidence. Check meaningful regression tests and unchanged art114files. Standalone source still has old asset claims for T5 cleanup.

Return ACCEPT or REQUEST CHANGES with severity/exact file-line/concrete trigger-impact/fix/test. Distinguish blockers, tracked integration work, owner decisions and physical/manual limits. Include actual model/effort; complete commands before returning.
