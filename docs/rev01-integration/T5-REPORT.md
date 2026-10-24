# T5 cleanup and shared integration

**Final status: ACCEPTED** after Codex/xhigh re-review of the fixture BEST fix and orchestrator browser verification. See BROWSER-REVIEW.md for the 30 required plus 38 supplemental captures and MANUAL-CHECKS.md for pending owner physical-device/play checks. The implementation handoff evidence below records its original scope and limits. Provider/model/effort: Codex, gpt-6.1-sol/high as configured by the orchestrator, one worker. Per-worker tokens/cost unavailable; root owns the account usage ledger (7% at start).

T5 review P3 follow-up: manual fixture BEST now synchronizes after campaign reconciliation, matching production. Codex/medium fix verified actual scored finish/result `12345 → BEST 12345`, stable seeded capture BEST 191550, 108 tests/build and all 114 art hashes. See [T5-FIX-REPORT.md](T5-FIX-REPORT.md); focused review and root's manual browser reload remain pending.

## Results

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| `npm.cmd test` | 108/108 pass, zero fail/skipped; accepted combined baseline had 104 | `.test-output/integration/T5/npm-test.log` |
| `npm.cmd run build` | Source/tests typecheck and Vite production build pass, 71 modules | `.test-output/integration/T5/npm-build.log` |
| `node --experimental-strip-types tests/run-campaign-bot.ts .test-output/integration/final-campaign-bot.json 17 41 83` | All three seeds campaign-clear, all nine stages clear, zero diagnostics; full results identical to accepted T2–T4 merged run | `.test-output/integration/final-campaign-bot.json`, `T5/campaign-bot.log` |
| Runtime/bundle cleanup | Zero obsolete loader/socket imports or `src/assets` raster/metadata URLs. Seven emitted + 46 unique inlined PNGs all byte-match rev01 exports; obsolete metadata names and fixture markers absent from production JS | `T5/audit.{mjs,json,log}` |
| Art/main preservation | All 114 files exactly match original `baseline.json`, zero added/missing/changed. Main and HEAD remain `840fc0a1d518240e8e1bbd0e0ad1af99c4fd420d`, branch `codex/starfall-rev01-integration` | `T5/audit.json` |
| Whitespace | `git diff --check` passes | terminal check |

Compact durable results: `evidence/rev01-integration-2026-10-24/T5-automated.json`. Browser screenshots, GPU observations, gate-sheet comparisons, physical-device checks and human feel are pending the orchestrator/owner; this report claims none of them.

The supplied pre-T5 snapshot captured a formatting-only spec difference (`3264101E…9226`) that predates T5. Root guarded semantic equality and restored the original exact baseline bytes (`7DFE5127…F940A`); all 114 original hashes now match. Worker independently rechecked semantic equality against root's retained `.test-output/integration/spec-format-only-before-restoration.json`. The pre-T5 manifest stays historical and has exactly that one art exception. Worker made no art writes; both hashes and the restoration are explicit in the audit.

## Changes

- Native stage backgrounds use their spec `(320,200)` pivots at `(320,180)`, yielding a 640×400 quad at `(0,-20)` cropped by the ordinary 640×360 viewport. Existing 17% stage tint and starfield/RNG remain. Raw gate sheets can therefore differ in brightness from runtime.
- Title uses the native Breakwater background, neutral player and spec neutral exhaust sockets, retaining its established composition/tint and T4 font/menu kit. No extra title redesign.
- Banner writers now set the actual T4 `sector`/`phase` enum. Boss GAP text uses native 5×7 mask glyphs at 1× with `TEXT_COLOR.heading`; score pops already use the native renderer. Removed the temporary 3×5 renderer and obsolete raster draw helper.
- Mines draw below enemy/minelayer hulls within the shared hull category. No category change or gameplay values changed.
- `derivedImageAsset` closes decoded bitmaps in `finally` on canvas failures and checks cancellation after decoding and before derivation. Existing font/nova hooks retain stable identities and one claim each; no plain raw-font/nova-strip claim is introduced.
- README documents Node 24, package 0.3.0, device-pixel scaling, source/provenance, explicit gitignored bot output and development routes. MANUAL-CHECKS has the real diagnostic labels, hide/export keys and stage-by-stage four-run reply formats.
- New actual-production browser fixture and Node-safe presentation helper; no production entry or build fixture wiring.

Changed source/test files versus pre-T5: `src/bosses/{boss,gatebreaker,kiln-serpent,starfall-engine}.ts` (GAP caller/font and PHASE kind only), `src/config/layers.ts`, `src/render/background.ts`, `src/scenes/menu.ts`, `src/services/{rev01-assets,stage-assets}.ts`, `src/systems/{combat-collision,combat-enemies,combat-render}.ts`, `src/ui/{bitmap-text,sprite}.ts`, `tests/{browser-boss-review,rev01-foundation.test,rev01-render-split.test,stage-assets.test}.ts`. Added `tests/browser-integration.{html,ts}`, `tests/helpers/integration-presentation.ts`, `tests/rev01-integration.test.ts`, this report and durable evidence. Also edited README and MANUAL-CHECKS; DECISIONS/cost ledger remain root-owned.

Deleted all 15 superseded `src/assets/*.png` (player-bank, exhaust, interceptor, explosion, orbital-breakwater, dart, gunship, gatebreaker, furnace-background, citadel-background, kiln-head, kiln-segment, minelayer, warden, starfall-engine), three metadata JSONs (`art-gate`, `combat-art`, `campaign-art`), three legacy service loaders (`art-assets`, `combat-assets`, `campaign-assets`, including `engineSockets`) and `src/config/boss-geometry.ts`. Audio bytes/provenance are unchanged. Exact path inventory is in the audit.

## Shared patch dispositions

| Request | Disposition |
| --- | --- |
| T2 A mine layering | Applied, matching foundation order assertion; DECISION3 uses mineRelease |
| T2 B derived cleanup | Applied with constructor/context/draw/read failures plus cancellation-after-decode/read regressions; decoded source always closed, derive/upload not reached |
| T2 C decision notes | Reported here; root owns DECISIONS |
| T3 A banner writers | Applied using T4's concrete enum, not the earlier placeholder `alert`: warning/boss-name/secure are `sector`, PHASE writers `phase` |
| T3 B / T4 P7 GAP | Applied against combined `Boss.render(native, alpha, legacy)` interface; raw frame goes to font, rounded code frame to lane; obsolete label colors removed |
| T3 C legacy cleanup | Removed loaders, rasters, metadata and socket table after all callers migrated |
| T3 D shared test union | Preserved every T2/T3/T4 native/layer/forbidden-texture check; replaced only obsolete background/title and legacy claim assertions with native ones |
| T4 P1–P5 | All actual production writers covered; tests drive warning, boss entry, phase changes and collision clear for each applicable stage |
| T4 P6 | Existing development boss-review ending sets `bannerKind: sector` |
| Startup stage writer | Preserved `newRun` kind `stage` and original gameplay banner clock. Actual-stage test after 157 ticks proves both expired card and old banner absent |
| Font/nova registration | Existing stable hooks and registry uniqueness assertions retained; stages claim registry images followed by unchanged audio, exactly once |

## Fixture routes

Serve with the ordinary development server. Worker did not start/control a server/browser. Base path is `/tests/browser-integration.html` (Vite dev only, excluded from `dist`).

**Ordinary manual stage:** `?stage=N&manual=1&calm=0|1`, N = 1, 2, 3. Example: `http://127.0.0.1:5173/tests/browser-integration.html?stage=2&manual=1&calm=0`. Starts the selected production stage at zero with normal HP/clocks/encounters/controls, production sound and campaign candidate routing. Pause/settings/controls, death/result, retry/next/title/replay routes use production menus and campaign composition. Sound starts enabled after the first canvas key/pointer unlock; calm is explicitly selected. No gameplay preset is applied. H hides diagnostics; PLAY STAGE reloads this route.

**Capture:** `?stage=N&scenario=S&calm=0|1&capture=1`. Use N=1/2/3 and these scenarios:

| S | Presentation setup |
| --- | --- |
| `card` | First genuine stage update, its actual card visible |
| `play` | Expired card after 158 updates; seeded ordinary craft, primary/hostile shots, mines where claimed, pickup, 13/15px lanes and kill effects |
| `boss` | Production boss entered by seeded stage clock and warmed through 402 actual updates; default phase/damage and one destroyed part (middle Kiln husk) |
| `pause` | Boss preset plus actual production pause menu |
| `result` | Clear portrait at 2.3s with enemies/projectiles/effects explicitly removed, expired defeat pose, actual sector/final result menu |
| `settings` / `controls` | Actual pause menu navigated by public input snapshots to the requested page |
| `death` | Production playerDeath at 150ms, hull zero; no menu |
| `loss` | Dead portrait plus actual SIGNAL LOST result menu |
| `nova` | Seeded play plus production nova at 230ms; normal uses loaded sparse atlas, calm uses novaCalm |
| `dense` | Seeded play/nova overlap plus low hull and simultaneous damage/iFrames; calm swaps production cues |
| `title` | Actual production title and native raster composition |

Thirty core shots: N=1/2/3 × S=`card,play,boss,pause,result` × measured k=1/2. Supplements include settings, controls, death/loss, title and `nova`/`dense` normal/calm at both scales. These are explicit presentation states, **not ordinary-rules reachability**. Bot evidence remains separate.

Options: `pose=-3|-2|-1|0|1|2|3` selects frozen player pose (default 0); `novaTime=0..0.559` selects nova seconds (default 0.23); `variant=intact` keeps full boss/parts, `parts` default selects 30% hull/one destroyed part, `phase` adds real PHASE plate text, `cue` selects held curtain/gap cue, `defeat` shows only the boss's production defeat pose at 0.3s with all live enemies/parts/projectiles removed. Use `scenario=boss` for boss variants. Example sparse routes:

```text
/tests/browser-integration.html?stage=1&scenario=nova&calm=0&capture=1
/tests/browser-integration.html?stage=1&scenario=nova&calm=1&capture=1
/tests/browser-integration.html?stage=3&scenario=dense&calm=1&pose=-3&capture=1
/tests/browser-integration.html?stage=2&scenario=boss&variant=cue&capture=1
```

Frozen captures gate production update registrations, then push a public `blocksUpdateBelow` scene. Suspended production renders receive alpha=1; thus ECS poses and private Kiln husks remain stable while waiting/resizing. Stage cards expire by genuine stage updates, with no product debug override. A regression covers 42 stage/scenario/calm combinations and compares full production quads at alpha 0/.25/.5/.75/1, while also proving every texture drawn belongs to its stage's actual claims, sparse/calm nova is drawn, results contain no boss, and every background is native 640×400 at `(0,-20)`.

## Readiness, diagnostics and PNG

- `#fixture-status` (visible controls) and `#fixture-status-only` (ARIA status when capture hides controls) contain JSON. `LOADING` becomes `READY` only after the first actual production GPU render. Fatal faults become `ERROR`; engine `{type: overload, droppedTicks}` reports remain visibly recorded in `diagnostics` (including simulation tick) while readiness remains available. Resize/host dropped ticks are not silently discarded or misclassified as failed assets/rendering. Also inspect `#game[data-ready=true][data-status=READY]` and its ARIA label.
- JSON reports selected stage/scenario, `setup` class, calm, frozen, screen/phase/seconds, actual view/backing/CSS/viewport dimensions, DPR/k, renderer status, sparse atlas dimensions/registration, exports, nonfatal diagnostics and errors. Setup says `NORMAL RULES / ordinary stage beginning` or `SEEDED PRESENTATION / not reachability evidence`. Adapter identity is explicitly unavailable through public API. The one initial public renderer inventory is sampled, not inspected through private GPU state.
- `capture=1` hides every test control/debug HTML element outside the actual game canvas. H restores/hides it. Do not include diagnostic overlays in screenshots.
- **O** (keyboard code KeyO) or **SAVE FRAME (O)** requests a native PNG. On the next `afterFrame`, immediately after production rendering, the fixture copies the current WebGPU canvas pixels to a 640×360 2D canvas and encodes/downloads PNG. There is no reconstruction from metadata or Node quads; no copy/readback occurs during ordinary play without an export request. Filename: `starfall-sN-S-normal|calm-counter.png`. `exported` increments after encoding; check errors and actual downloaded pixels. Worker has not verified browser download/GPU pixels; root does that.

## Limits and remaining work

- Orchestrator owns actual browser control, measured 1×/2× JPEG screenshots, native PNG export verification and comparisons against `.test-output/art-gate1..5`. Do not infer GPU upload success, screenshots or visual acceptance from the Node packing/quad tests or this report.
- The fixture is genuine production rendering with loaded production assets/sound, but seeded presets do not prove reachability, animation continuity, input feel or accessibility. Manual play and normal browser campaign remain necessary. Physical GPU/Windows scaling, physical gamepad, audible balance and human feel require separate evidence.
- Historical `art/rev01/tools/sample_colors.py` expects removed `src/assets` JSON/rasters and cannot rerun from this cleanup checkout. It is read-only provenance tooling; art source generators/exports remain untouched. Inert `spec.replaces` strings can still name historical PNGs; no active URL points there.
- Existing art gaps/choices remain recorded in T2–T4: no authored interceptor/Kiln head telegraph variants (code cues retained), Gatebreaker damaged core overlay, head-relative Kiln section fan origins, small title wordmark and overlay/footer comparison. No redraw or new art claim.
- Plasma hold/charge/release/damage/resource rules, optional tall mode and further title redesign remain owner decisions; chargeBar stays empty. No new gameplay clocks/HP/counts/balance edits were made.
- No commits/staging/push/main/branch changes, art edits, installs, external Claude, worker server/browser actions, subagents or memory/global writes. All worker test/build/bot commands completed; no worker background command remains running.
