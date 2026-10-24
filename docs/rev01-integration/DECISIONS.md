# Rev01 integration decision and cost log

## Binding decisions

- Owner: work off local main on a branch; main stays untouched; no commits until explicitly requested. Apply reviewed ticket patches to the integration branch without committing.
- Owner: direct art/rev01 PNG URLs; spec.json import attributes; no copied raster assets. Art/rev01 is read-only, including the existing uncommitted README/spec changes.
- Owner: nova.animation.order is 11 frames/560 ms, fade-3 excluded from playback and GPU upload; Engine/Warden lanes 15/13px; Mine radius 6; low hull <=1; stage card 2.6s; ringed calm ready cue.
- Owner: no plasma hold-to-charge implementation; chargeBar empty. Tall mode and title redesign beyond migration are excluded.
- Parallel ownership: T2 owns mines/pickups/beam render; T3 owns enemy/boss render; T4 owns HUD/menu/font. Orchestrator coordinates asset registration and banner/timer call sites so parallel agents do not race shared files.

## Environment and gates

- Owner clarification during T1: orchestrator is Codex; Claude usage checks are unnecessary. Use Codex usage for subsequent gates and cost reporting; keep unavailable windows/cross-provider costs explicit. Existing role/model instructions remain unchanged.
- Initial checkout: main ahead of origin/main by 10 commits. Existing changes: art/rev01/README.md and spec.json. Integration branch created as codex/starfall-rev01-integration; no commits made.
- Playbook found at C:/Users/jfabi/.claude/skills/large-project-playbook/PLAYBOOK.md. Initial roles were Opus/high implementations, Opus/xhigh reviews, Opus/medium fixes. Owner now requires Codex for all remaining work; preserve high/xhigh/medium role efforts using gpt-6.1-sol.
- Codex usage reading: 2% used in a 10080-minute window. This is a different provider and does not satisfy the Claude gate.
- Local Claude Code 2.1.289 supports opus and high/xhigh/medium effort; interactive banner reports Opus 5.5, Claude Max. No ticket model call has started.
- Initial sandboxed Claude /usage failed to load usage data. Network-enabled retry succeeded: session 15% (reset 24 Oct 2026 23:30 Europe/London), weekly all models 23% (reset 30 Oct 2026 20:00 Europe/London). T1 single implementer gate passes. Usage screen session had zero input/output tokens and $0 model cost.
- Baseline `npm.cmd test`: 39 tests, 37 pass, 2 fail in motion.test.ts (glide range and full-speed reversal after ten frames). Preserve current movement code; diagnose assertions against the actual baseline rather than changing gameplay to make stale assumptions pass. Store exact trace/equivalence evidence before any assertion correction; no wider tolerances just to hide failures.

## Ticket cost ledger

| Ticket | Size | Model/effort | Impl + review + fix usage | State |
| --- | --- | --- | --- | --- |
| T1 | M | Opus/high + xhigh review + medium fixes | Impl $14.4325628 + review $5.928544 + fix $2.8610956 + re-review $2.0502898 = $25.2724922 CLI estimate; 343463 output tokens; Codex weekly 2% to 4% (orchestration only) | ACCEPTED, uncommitted |
| T2 | M | Opus/high implementation; Codex/xhigh review/re-review + medium fix | Impl $9.5692242 CLI estimate;179987 outputtokens; Codex account5→7% spans concurrentT2–T4work/root, no exactticketcost available | ACCEPTED, applied uncommitted |
| T3 | M | Opus/high implementation; Codex/xhigh review/re-review + medium fix | Impl $11.3290878 CLI estimate;200488 outputtokens; Codex account5→7% concurrent attribution as above | ACCEPTED, applied uncommitted |
| T4 | M | Opus/high+xhigh initialreview; Codex/medium fix+xhigh re-review | Impl $7.7862038 + review $3.8286402 = $11.614844 CLI estimate;182656 outputtokens; Codex concurrentaccount5→7% | ACCEPTED, applied uncommitted |
| T5 | S–M | Codex gpt-6.1-sol/high + xhigh review/re-review + medium fix | Codex account weekly 7→10%, includes root/browser/orchestration and concurrent account use; no exact worker billing; short window unavailable | COMPLETE automated/browser evidence, owner play pending, uncommitted |

Parallel wave start: Codex weekly usage4% before each T2/T3/T4 start; ordinary usage allowed, five-hour window unavailable. Three workers maximum. Each uses Opus/high with restricted/safe mode and no memory/global edits.

- T2: C:/Users/jfabi/.codex/worktrees/starfall-rev01-t2/ngne-starfall, branch codex/starfall-rev01-t2.
- T3: C:/Users/jfabi/.codex/worktrees/starfall-rev01-t3/ngne-starfall, branch codex/starfall-rev01-t3.
- T4: C:/Users/jfabi/.codex/worktrees/starfall-rev01-t4/ngne-starfall, branch codex/starfall-rev01-t4.
- Each branch starts at unchanged main SHA840fc0a plus the identical reviewed, uncommitted T1 files. Snapshot hashes and guarded copy/apply helper are in .test-output/integration. Existing dependencies are junction-linked, no packages installed. No commits were created to share the foundation.

## T1 implementation notes (implementer, 24 Oct 2026; unreviewed)

- Implementer: Claude Opus 5.5, single agent. Usage not readable in-session; orchestrator records cost. Full report: `docs/rev01-integration/T1-REPORT.md`.
- Checks: `npm.cmd test` 57/57, `npm.cmd run build` pass, campaign bot 3 seeds x 3 stages clear. Logs in `.test-output/integration/T1/`. Art 114/114 unchanged; main = HEAD = 840fc0a.
- Motion: the two baseline failures were stale assertions (glide 17.04 px / 12 frames; reverse speed at frame 12; overshoot 3.33 px). Tests now pin the recorded baseline trace and require the migrated model to equal it x 4/3 per frame; movement code unchanged.
- Applied explicit spec values: radii (player 5, hostile bullet 4, enemy table, mine 6), lanes 15/13, player clamp 24..616 x 57..319. Everything else spatial goes through `fromLegacy` once; legacy sockets scaled once in `config/boss-geometry.ts` / at use sites; native spec sockets untouched for T2/T3.
- Open for orchestrator: hostile bullet radius 4 (gameplay) vs bead damage bound 3 (lane clearance 14 vs 14.67 px); no ticket owns the native backgrounds (registered and claimed, legacy still drawn); Vite inlines rev01 PNGs under 4 KiB; no browser smoke run in T1.
- Shared decisions: stage camera `pixelSnap = false` with whole-pixel shake and `pixelSnapped` legacy view (proven identical rounding); one 52-slot layer table in spec category order; rev01 claims pre-wired per owner group; nova never uploaded whole (sparse plan 2048x416, 801 tiles, fade-3 excluded).
- Permission denials: git log/show/status and some compound shell commands; no same-commit baseline bot run exists.

## Owner decision 1 — approved

- Kiln spec sprites.kilnHead.integration requires >=34px joint spacing; uniformly scaled existing paths reach approximately 27px. Changing spacing changes actual segment positions/colliders, so this is the gameplay contradiction boundary in the owner's brief.
- Owner chose: cap positional lag only when a joint would be closer than 34px. Preserve the source path otherwise, use the capped positions for segment colliders and sprite/socket attachment, and retain the head path and attack timing. Do not increase all base gaps to 52px. T3 may implement this choice.

## Orchestrator resolutions after T1 implementation

- First read-only Opus/xhigh review: ACCEPT, three Low findings. Before the parallel wave, resolve the one-tick interceptor exit tie and shared derived-asset hooks; complete unused component spatial defaults and the native/legacy mine interface. A focused Opus/medium fix agent is working on these, followed by re-review. Dead unscaled engineSockets helper is reserved for T5 deletion.
- Keep hostile bullet radius 4 exactly as the owner's collision-radii source spec.gameplay says. Per-sprite bounds are optional collision guidance and do not override the explicitly designated gameplay table. No new owner decision needed.
- Native backgrounds are assigned to T5 shared wiring in TICKETS.md. No ownership gap remains.
- Vite data-URI inlining satisfies bundled direct PNG URL delivery; separate emitted files were not requested. Keep Vite configuration unchanged.
- The orchestrator independently archived immutable main sources and ran the baseline bot: seeds 17/41/83 all campaign-clear. Baseline results are .test-output/integration/baseline-campaign.json. The implementation report's statement that no baseline run exists describes the implementer's permissions, not the final evidence state.
- Actual main-module comparisons passed for all 94 encounter entries, boss timing/HP/clear bonuses, 3600 mixed-input flight steps at 30/60/120Hz, and all 12 enemy non-radius stats. Evidence: .test-output/integration/T1/orchestrator-*.json.
- T1 implementation estimate is reported by the CLI, not a subscription usage percentage or a confirmed charge. Claude usage is not checked, per owner clarification. Codex has a weekly window only in the current tool response; no five-hour percentage is available.
- T1 production browser smoke passed: title -> campaign -> pause, stage 1, backing 640x360, CSS 1280x720, DPR 1, k=2, zero reported game/console errors or warnings. Evidence: .test-output/integration/T1/browser-smoke.json and browser-smoke-pause.jpg. The first sandboxed server was unreachable; restarting only this task's Vite process outside the sandbox resolved it.
- Medium fixes A–D passed 60 tests, build and all nine bot stage clears. T2 owns playerFxExtraImages() in player-fx-assets.ts; T4 owns fontImage() in font-assets.ts; rev01-claims.ts composes both with stable identities. Necessary menu/stage caller imports are authorized under the ticket's registration-caller scope.
- The fix CLI agent made two unauthorized Claude memory edits after finishing source work. The orchestrator restored both exact original contents and the automatic timestamp, with no unrelated content overwritten. All later CLI agents use restricted/safe mode and explicit no-memory instructions. No memory update is retained.
- Final focused Opus/xhigh re-review ACCEPTS A–D with no required changes. Final T1: 60 tests pass, build passes, seeds17/41/83 all nine stages clear. Post-fix production Stage1 launch/pause passed at measured 1x and2x; existing seeded presentation fixtures loaded Stage2/3 without errors/warnings. These are browser asset/loading checks, not physical-device or human-play acceptance. Reports: T1-REVIEW.md and T1-REREVIEW.md; browser evidence: .test-output/integration/T1/post-fix-*.json/jpg.

## Parallel ticket handoffs and pending decisions

- T2 reports73tests/build and9/9bot clears. Native player sockets alter shot origins and kill totals; owner DECISION2 is pending. T3 reports71tests/build and9/9clears. Hostile sockets, minelayer release and boss-part centers alter geometry/outcomes; owner DECISION3 pending. No geometry choice is silently treated as balance-neutral.
- T4 read-only review accepts its owned scope with three Low findings: exact gameplay fractions for passed boss marks (spec decimals remain layout coordinates); stage card should run during hit-stop while still pausing; title legacy-rounding assertion until T5 native migration. Fix at medium effort. Shared writer/font/title patches remain mandatory T5 integration work.
- Starting T2 external Opus review was rejected by automatic approval review: the command would send repository contents and brief to Anthropic, and prior authorization was judged insufficiently explicit about the destination. No retry or bypass. Owner authorization requested for scoped external Claude implementations/reviews/fixes, with Codex alternative. New external runs paused pending reply. Already-completed T4 review collected read-only.

## Owner decisions 2 and 3 — approved; provider replacement

- DECISION2: use spec per-pose player muzzle sockets for real bolt spawns; accept the resulting aim/coverage changes. Timing, counts, speed and damage unchanged.
- DECISION3: use spec hostile shot/mine-release/boss-part sockets and corresponding collider centers; accept geometry changes and resulting campaign outcomes. Counts, timing, velocities and HP unchanged. Gunship/turret volleys split existing shots over painted muzzles, never duplicate.
- Owner chose Codex agents for all remaining work instead of authorizing external Claude access. No further Claude invocation. Started Codex gpt-6.1-sol/xhigh read-only T2 and T3 reviewers and gpt-6.1-sol/medium T4 fix in their isolated worktrees; three agents max. Codex usage5% weekly before each start; short window unavailable, ordinary usage allowed. Provider-specific dollar/token billing is unavailable for these Codex subagents; record account usage delta with concurrent attribution limitations.
- Codex T2 review REQUEST CHANGES: one P2, restore spec6px beam core (not5), deterministic half-pixel bias with integer edges/pulse registration. No additional gameplay change beyond approved sockets. T2 medium fix started at Codex weekly6%.
- Codex T4 medium fixes complete:78tests/build pass, exhaustive1623whole-HP mark states, real Nova hit-stop/card expiry at156ticks, title legacy rounding;114art unchanged. Focused Codex/xhigh re-review started at weekly6%. Account delta5→6% spans concurrent reviews/fix and root work; no exact per-ticket percentage or charge can be inferred.
- T4 focused Codex re-review ACCEPT, applied with hashes proving root unchanged since original accepted T4. T2 focused Codex re-review ACCEPT after6pxcore fix; applied source and unioned T2/T4 render-split assertions without weakening native/HUD/legacy-title checks. Combined91tests pass. Reports T2-REREVIEW.md and T4-REREVIEW.md.
- T3 Codex review REQUEST CHANGES: oneP2, private Kiln husk history lacks resetInterpolation, causing33pxvisual gap during actual destruction/Nova hit-stop. Cadence/path/shot/mixer checks otherwise pass:4500ticks perboss including laterphases/destroyedparts,90cap/Nova scenarios,9/9botclears. Medium fix started at Codex weekly7%; no gameplay change authorized.
- T3 medium fix73tests/build and callback-removal mutation pass; focused Codex/xhigh re-review ACCEPT. Applied source with guardedT1base and merged combat-integration test; root union ofallthree render-split assertions preserves native pixels/registry/layers/mine and title legacy checks. Combined104tests/build pass; seeds17/41/83 clearall9stages with approved geometry (JSON .test-output/integration/T2-T4-merged-campaign.json). Boss entry times remain90.017/100.017/110.017s. T5baseline snapshot taken before cleanup; native backgrounds/sharedbanner/font/layer patches still pendingT5.
- T5 Codex/high started after gate at weekly7%. Exact pre-T5 source/tests/README and file hashes saved .test-output/integration/pre-T5 for independent delta review. Root owns browser capture; worker will not claim GPU/runtime screenshot acceptance.

## Final integration gate

- T5 final Codex/xhigh re-review ACCEPT after one fixture-only BEST synchronization fix. Independent real callback/clear/death result probes verify the fix and unchanged seeded result renders. Final 108 tests, build/typechecks and all nine campaign clears pass; bot outcomes exactly match the accepted merged T2–T4 run.
- Root saved and dimension/hash-audited 30 required plus 38 supplemental real GPU renderer captures at actual 1x/2x CSS sizes, with two native640×360PNGexports. Compared all30core files against relevant gates1–5; supplements cover calm/nova/dense/poses/boss states/menu/death. Final production bundle launch/fire/pause and existing browser review/campaign pages smoke pass. Details BROWSER-REVIEW.md and durable browser-summary.json.
- Browser overload diagnostics are retained separately from fatal faults; no performance/human/device claim. A pause tap during Nova hit-stop can be missed in both main baseline and integration; unchanged behavior documented and reproduced, no gameplay fix made.
- A formatting-only spec rewrite was discovered with timestamp21:09:06UTC before T5. Root proved semantic equality to original worker copies and restored exact original bytes/SHA7DFE…F940A. The source of the rewrite remains unidentified; the T3 reviewer confirmed no filesystem write/formatter in its probes. Historic pre-T5 manifest and the formatted copy are retained for audit. All114original art hashes now match, including supplied dirty README/spec; no source art value/pixel change retained.
- Final root checks: main and HEAD840fc0a, integration branch unchanged, no staged files or commits, old src/assets PNGs absent. Historical sample_colors.py dependency on removed legacy files is documented, not rebuilt or edited. Managed worker worktrees remain recoverable/uncommitted; none archived because archive creates a snapshot commit.
- Codex gate snapshots used the same10080-minute window, reset1793389584 = Friday30October2026 at19:46:24GMT (Europe/London). Short-window data unavailable throughout; ordinary usage allowed. Whole-session observed account2→10% is not attributable billing and may include other account activity. CLI dollar/token figures above are earlier provider estimates, not actual charges. No further Claude runs after owner chose Codex.
