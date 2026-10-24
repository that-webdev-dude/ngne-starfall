# T5 manual BEST sync fix

Codex gpt-6.1-sol/medium, one worker, no subagents. ROOT integration branch, main840fc0a unchanged. Read T5-REVIEW/T5-REPORT/T5-BRIEF. No commits/staging/main/branch/art/memory/global/externalClaude/install/server/browser changes. Roothaslive5173server andactivelycaptures; do notcontrolit.

A. In tests/browser-integration.ts afterFrame, add session.best = app.game.state.best immediately after campaign.reconcile(), matching production main.ts and browser-campaign.ts. Manual route must show updated BEST on actual scored result, preserve seededcapture values/nativePNG/renderstate. No gameplay change.
B. Verify actual scored stage finish→result BEST reflects progress (review reproduction12345→BEST0 before). A finite in-memory actualafterFrame/result probe is sufficient; avoid introducing a helper/framework or a test that only asserts presence ofthisassignment. Existingtests unchanged unless useful genuinefixtureentry coverage is possible. Run npm.cmd test and npm.cmd run build,114art/main checks, own T5-FIX-REPORT.md with evidence/limits. Update T5-REPORT note ifneeded.

Allowed files only tests/browser-integration.ts, docs/rev01-integration/T5-REPORT.md, own T5-FIX-REPORT.md and ignored .test-output/integration/T5-fix logs/probes. Do not edit sourcegame/fixturepresethelper/costledger or change captures.

Brief checklist: verify currentbranch/main; read exactticket/spec/definitionofdone/reducedmotion/layers; assert onlyowned behavior; grep impacted callers/tests withoutweakening; native1:1dimensions/pivots/sockets/animation and layers unchanged; no charge/timing/count/HP/RNG changes; preserve114art; recordchoicesownreport notspec; sharedwaits/platforminput asapplicable; fulltest/buildcomplete; selfreview exactfinding and scope; reportchecks/model/effort/limits; neverreturnwithbackgroundcommands.
