# T2 beam core fix report

State: implemented; awaiting independent re-review. Codex gpt-6.1-sol, medium effort, one worker, no subagents. Usage/cost is unavailable inside this worker; parent owns usage readings. No commits.

## Change

- Restored the spec's six-column bright core in both 15 px and 13 px firing lanes. Lane centre is `floor(x) + 0.5`; core centre is `floor(x) + 1`: a deterministic 0.5 px bias to the right. Core bounds are integer pixel edges (`floor(x) - 2` inclusive to `floor(x) + 4` exclusive).
- Pulse columns derive from the resulting bounds: `coreLeft - 1` and `coreRight`, immediately outside the six core columns. Both sides share the same clipped six-row marks and 32-row period. The narrower lane necessarily has asymmetric remaining body coverage; the separation/edge/body base bands and lane coverage remain unchanged.
- Kept 15/13 lane bounds, warning geometry, layers, 64 px/s scrolling and reduced-motion held cues unchanged. No gameplay, clocks, collision radius, HP, count, RNG, sockets, animation selection, chargeBar or charging behavior changed. DECISION2 muzzle geometry was not revisited.
- Updated the production Frame draw test for both widths at integer and fractional x/y positions. Assertions cover exactly six core columns, half-pixel right bias, all four whole-pixel rectangle edges, unchanged lane extent/bands, pulse columns/row registration/period, warning marker frames/pivot and reduced-motion warning/firing statics.
- Corrected the obsolete five-pixel compromise in T2-REPORT.md. Shared asset cleanup and mine layering remain T5.

## Files

Only these source/test/report files were written by this fix:

- `src/render/player-fx-model.ts`
- `src/render/player-fx.ts`
- `tests/rev01-player-fx.test.ts`
- `docs/rev01-integration/T2-REPORT.md`
- `docs/rev01-integration/T2-FIX-REPORT.md`

Check logs are confined to `.test-output/integration/T2-fix/`. Build output is the normal ignored `dist/` output. Existing dirty T1/T2/art files were preserved; no art files were written.

## Verification

| Check | Result | Evidence under `.test-output/integration/T2-fix/` |
| --- | --- | --- |
| Focused production beam draw test | 1/1 pass across both widths and three coordinate pairs | `beam-test.log` |
| Five-pixel mutation of production `beamCoreWidth` | Fails at six-column band assertion, exit 1; original restored before full checks | `mutation-five-pixel.log` |
| `npm.cmd test` | 73/73 pass, exit 0 | `npm-test.log` |
| `npm.cmd run build` | source/test typecheck and Vite build pass, exit 0 | `npm-build.log` |
| Art baseline SHA-256 | 114/114 identical; zero added, changed or missing | `art-hash-check.log` |
| Branch/base | `codex/starfall-rev01-t2`; HEAD and main remain `840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d` | `art-hash-check.log`, `git-status.log` |

Self-review: read T2 brief/ticket/checklist/review, exact codeDrawn.beamLane and beamWarning metadata, presentation layers/reduced-motion rules, README and FEEDBACK integration/acceptance entries; searched affected helper/render callers and assertions. The fix addresses review A-B without changing shared modules or asserting ownership of other tickets. All commands have completed.

## Limits

Node tests exercise production renderer Frame output. No browser, GPU, device, dense-combat or human visual acceptance was performed. Campaign bot was not rerun for this presentation-only correction. Independent re-review remains required. The repository-wide dirty state includes the inherited integration snapshot; this fix does not claim those pre-existing changes as its own. Narrow escalated access was used for authorized writes/check logs in the designated worktree outside this worker's default writable root; no auto-review rejection occurred.
