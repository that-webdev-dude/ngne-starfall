# T4 HUD/font/menu/screen implementation

Role Opus/high, one implementer, no subagents. Read TICKETS.md T4/checklist, DECISIONS.md, T1-REPORT.md final seams, art README/spec and FEEDBACK How to use this4–5. Follow the supplied playbook checklist below. This worktree contains the reviewed post-T1 snapshot of local main. Do not switch branches or merge main. No commits/pushes, art edits, memory reads/writes, settings/plans/global-file edits, installs or unrelated cleanup. Ignore automatic memory instructions. Main stays840fc0a.

Implement T4 completely, accounting for every presentation.integration and screens.integration item in the report. Read all presentation sprite entries and the complete presentation section: font, plates, bands, bars/pips/marks, hudCalm, menuPanel/rule/item/toggles/meters, stageCard and resultPlate. All text is native5x7,6px advance,9px line-height,6n-1 width, uppercase, missing glyph advances only. No runtime text scaling, including title text; large result words come from authored plates. Use textColors exactly via font-mask tinting.

Primary ownership: src/render/hud.ts, src/ui/bitmap-text.ts, src/services/font-assets.ts (fontImage hook), src/scenes/menu.ts, src/world/session.ts for banner-kind only; dedicated T4 UI/asset helpers/tests and docs/rev01-integration/T4-REPORT.md. Do not edit shared asset/layer registries, T2/T3 renderers/systems/bosses or other world state. Native frames need camera.pixelSnap=false in menu scenes. Use raw Frame/native helpers, not the legacy rounding wrapper.

fontImage() is the single font claim used by stage/menu registries. Replace its raw image with a stable lazily defined derived mask, preferably idrev01-font-mask, using T1 derivedImageAsset/maskPixels. Bitmap glyph frames must use that same texture ID. rev01Image("font") intentionally refuses, preventing conflicting raw/masked claims. No art copies or generated replacement font.

HUD: exact presentation.layout positions, opaque bands, plate slices, native pips, clipped bar fill columns, boss marks and names, low hull<=1, calm static counterparts, score pops, and always-empty chargeBar. Follow shared HUD<nova<lanes<bullets<core layering. Stage card has its own2.6s timer and replaces the startup banner; no change to gameplay clocks. Normal/stage/sector banners vs PHASE alerts get an explicit banner kind. Do not infer kind from arbitrary colors/time. Do not add charge behavior or field.

Screens: native menu kit and matching press/drag-start hit rectangles; fixed settings labels with meter/toggle controls, SOUND=!muted; controls layout; proper resultPlate frame and centered stats; reduced-motion HUD/screens never blink. Title is only migrated to640x360/font/menu kit; no redesign or new title art.

Where stage initialization or boss/collision/banner writers need new-kind assignments or startup-banner suppression, provide exact minimal patches in the report for orchestrated shared integration (T3 owns bosses). Standalone tests may set the intended banner kinds directly. Avoid silently editing shared call sites. Keep the renderer's startup banner from reappearing after the2.6s card. The orchestrator/T5 will apply shared caller patches before final integrated acceptance.

Add meaningful tests for font mask/metrics/missing glyph, HUD geometry/clipping/low hull/calm, stage-card lifetime, banner selection, menu click and drag bounds, settings mapping and result frames. Run npm.cmd test and npm.cmd run build to completion; logs under .test-output/integration/T4. Update legacy HUD/menu render assertions to native assertions without weakening input/lifecycle tests. Include a checklist mapping every integration-list item to implementation or exact shared patch. Never finish with background commands running.

Handoff: files, actual check counts/results, render/UI evidence, mismatches, exact shared patches, model/effort. Opus/xhigh review follows; do not mark accepted yourself.

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
