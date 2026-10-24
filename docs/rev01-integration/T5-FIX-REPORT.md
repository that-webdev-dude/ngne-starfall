# T5 manual BEST sync fix

Implemented; pending focused review and root's manual browser reload. Codex gpt-6.1-sol/medium, one worker, no subagents. Worker usage/cost unavailable; root owns the ledger.

- Only runtime change: `tests/browser-integration.ts` copies `app.game.state.best` into `session.best` immediately after `campaign.reconcile()` in `afterFrame`, matching `src/main.ts` and `tests/browser-campaign.ts`.
- No gameplay, preset, render/export, dimensions, pivots, sockets, animation, layers, reduced-motion or charge/timing/count/HP/RNG changes. The frozen capture seed remains 191550.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Actual callback / scored finish / result | Before fix: progress 12345, session 0, production result glyphs `KILLS 0   BEST 0`. After fix: progress/session 12345, result `KILLS 0   BEST 12345`; exactly one production finish dispatch | `.test-output/integration/T5-fix/probe.{mjs,json,log}` |
| Capture result stability | Stages 1/2/3 × normal/calm: BEST 191550; complete production quad data and texture sequences identical immediately before/after executing old/new callback | Same probe |
| Full tests | 108/108 pass; zero fail, cancelled or skipped; existing tests unchanged | `T5-fix/npm-test.log` |
| Build | Source and tests no-emit typechecks plus Vite build pass; 71 modules | `T5-fix/npm-build.log` |
| Art / refs | All original 114 SHA-256 hashes match, no extra art files; main and HEAD `840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d`; branch `codex/starfall-rev01-integration` | Probe JSON |
| Scope / whitespace | Saved pre-fix fixture compared against current: exactly the intended one-line change; `git diff --check` passes | `T5-fix/scope.log` |

The finite probe parses the saved/current fixture with the existing TypeScript dependency and executes the actual `afterFrame` body. An actual `Game` runs the production stage finish dispatch, pushes the production result menu and renders its font quads, which are decoded by glyph UV. It seeds only the completed phase/score/finish clock to reach the result in one tick; it does not claim ordinary-rules reachability. Browser/GPU/status/audio plumbing and campaign candidate preparation are substituted. No helper framework or permanent implementation-presence test was added.

Root owns live port 5173, manual reload, PNG export/rendered browser comparison and acceptance. Worker performed no browser/server actions or capture writes. Existing integration tests also pass their 42 capture scenario/stage/calm cases. Physical GPU/display/gamepad, audible balance and human feel remain outside this fix's evidence.

Self-review: assignment follows reconciliation and precedes status/export bookkeeping; subsequent production result renders see the updated score. Native PNG code and seeded state are unchanged. No spec mismatch or owner decision was introduced. T5-REVIEW's P3 finding is addressed; this report does not mark T5 accepted.

Only authored files: fixture, this report and a compact fix note in T5-REPORT; probe/logs are ignored under `.test-output/integration/T5-fix`. No commit, staging, main/branch move, art/memory/global writes, installs, external Claude, source-game/preset/helper/ledger edits or subagents. All worker commands completed; no worker background command remains.
