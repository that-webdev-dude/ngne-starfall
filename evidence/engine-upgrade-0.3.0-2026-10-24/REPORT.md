# Starfall migration to NGNE 0.3.0

Date: 24 October 2026. Branch: `dev/ngne-030`.
Base: `e288ffe837582bc0e3a1d79628781f1eafd1fae1` (local `main` after the art pass-3 commit).

## Result

Migration validation passed against the 0.2.2 baseline, with two explicitly retained
pre-existing unit-test failures. This is not an all-green test-suite claim.

- Pinned `@ngne/core@0.3.0` in the manifest and lockfile; updated the README version.
- No production TypeScript, assets, art, existing game tests or other dependencies
  changed. Additional files are migration evidence and verification scripts/tests.
  BrowserGame and scene-managed image leases remain the integration.
- Work ran only in `C:/Users/jfabi/.codex/worktrees/ngne-030/ngne-starfall`.
  The original checkout remains on `main`. No commit, staging, push or merge.

## Review findings addressed

1. **Package verification:** `verify-package.mjs` measures the actual archive's
   SHA256 and SHA512 SRI, validates them against the published expected checksum,
   registry metadata and lockfile, checks manifest/installed/archive package identity,
   and compares every installed file directly against the archive. It does not trust
   a stale extracted reference. The output reports the measured version and hashes.
   All six regression checks pass, covering the valid package, damaged archive,
   wrong-version installation, mismatched lock integrity, altered matching extracted
   references and unexpected installed files. See `package-verifier-tests.log`.
2. **Actual production artifact:** browser smoke now serves the real outputs of
   `npm.cmd run build`, using `vite.config.ts`. The 0.2.2 baseline is built from a
   separate committed-source snapshot including `public/`; the 0.3.0 candidate is
   served directly from this worktree's `dist/`. Each output has 33 files. Build
   inventories, configuration hashes, served file paths/hashes and unchanged
   before/after artifact identity are recorded. The instrumented campaign fixture
   is a separate route and cannot satisfy the production-smoke checks.

3. **Stable baseline reconstruction:** source archival and baseline metadata are both
   pinned to `e288ffe837582bc0e3a1d79628781f1eafd1fae1`. The pinned manifest and
   lockfile must specify 0.2.2 before reconstruction or installation proceeds;
   loaded baseline artifacts must identify that same commit. Two acceptance checks
   pass. The main check simulates HEAD containing the current 0.3.0 migration while
   using real Git reads/archive creation and real tar extraction for the pinned
   commit; it asserts reconstructed 0.2.2 manifests and baseline metadata remain
   unchanged. No commit or Git ref mutation is needed for this check. See
   `production-build.test.mjs` and `baseline-reconstruction-tests.log`.

## Validation

| Check | 0.2.2 baseline | 0.3.0 candidate |
| --- | --- | --- |
| Existing game tests | 37 pass, 2 existing failures | Same 37 pass and same 2 failures; no skips/cancellations |
| Application/test typechecks and actual production Vite build | Pass | Pass |
| Normal-rules headless campaign, seeds 17 / 41 / 83 | All sectors cleared for every seed; no diagnostics | Exact complete result match for all seeds |
| WebGPU fixture, 1800 rendered frames / 1799 ticks | Pass | Exact game/run/history, packed-frame/order hash and final PNG match |
| Actual production artifact keyboard/pointer smoke | Nested URL: pass | Root and nested URLs: pass |
| Owned browser process and profile cleanup | Pass | Pass |

Existing movement failures remain separately documented in [BASELINE-FAILURES.md](BASELINE-FAILURES.md).
Their assertions and game tuning were not changed. Candidate tests, build and
three-seed campaign checks were rerun after the validation changes.

Production smoke covered keyboard launch, held fire input, movement, pause, resume,
return to title and pointer launch. Both versions had zero captured browser
exceptions, HTTP resource failures (excluding favicon) and game diagnostics. The
backing canvas stayed 480x270. `production-dist-validation.json` records the actual
artifact checks; `browser-comparison.json` records the separate fixture comparison.
The fixture ended with 888 quads, frame/order hash `8df14ea` and matching final PNGs.

Environment: Windows, Node 24.15.0, headless Chrome 155.0.8059.86, 960x540 viewport,
DPR 1, WebGPU enabled. Browser flags, GPU service information and cleanup are saved
per version. No particular engine-selected adapter was identified.

## Package identity

npm `latest` was verified as 0.3.0 during the original migration. The corrected
verifier confirms the archive, lockfile and registry metadata agree, and all 56
installed files match that archive. Measured SHA256:
`5d43cad5577fcd6bc40c0030415cf24a7b52a53200ff867733a8ffe3b9d9dfeb`.
See `registry.json`, `installed-dependency.json` and `package-verification.json`.
The expected published checksum is a validation input, not a hardcoded result.

[Published release](https://github.com/that-webdev-dude/ngne/releases/tag/v0.3.0)

## Reproduction and evidence

From this consumer root, with the pinned 0.3.0 dependencies and retained registry
archive at `.test-output/ngne-030/ngne-core-0.3.0.tgz`:

```powershell
node --test evidence/engine-upgrade-0.3.0-2026-10-24/production-build.test.mjs
node evidence/engine-upgrade-0.3.0-2026-10-24/production-build.mjs baseline
node evidence/engine-upgrade-0.3.0-2026-10-24/check.mjs candidate
node evidence/engine-upgrade-0.3.0-2026-10-24/build-browser.mjs baseline
node evidence/engine-upgrade-0.3.0-2026-10-24/build-browser.mjs candidate
node --test evidence/engine-upgrade-0.3.0-2026-10-24/verify-package.test.mjs
node evidence/engine-upgrade-0.3.0-2026-10-24/verify-package.mjs
node evidence/engine-upgrade-0.3.0-2026-10-24/browser-check.mjs
```

The baseline production builder archives the fixed commit above to create a fresh
isolated source snapshot and installs its locked 0.2.2 dependencies there. It never
follows HEAD for baseline content or metadata. It includes source, existing game
tests, public assets and all current build configuration inputs. The
candidate checker invokes the real production build and records its output inventory.
The browser runner refuses missing, changed or incorrectly located build artifacts.
These operations do not change the original art checkout or switch this worktree's
installed engine back to 0.2.2. Windows `tar` and the recorded Chrome path are required.

Generated snapshots, fixture builds, test temporary files and the archive stay under
ignored `.test-output/ngne-030/`; the candidate production output is `dist/`.
Evidence JSON, logs, scripts and PNGs live beside this report. The original pre-upgrade
unit-test and campaign baseline logs remain unchanged. Browser evidence was refreshed
using the corrected production-artifact checks.

## Limits and remaining work

The full campaign comparison is headless simulation with empty fixture assets and
stub sound. The separate browser fixture covers the first 30 simulated seconds with
synthetic fixed-step timestamps and real requestAnimationFrame pacing; it is not a
full rendered campaign or performance benchmark. Actual production smoke uses normal
timing. Held fire is input/diagnostic smoke, without a projectile-count assertion.
No new device-loss, human visual/audio, physical-gamepad, other-browser or broad GPU
acceptance is claimed. No performance improvement is claimed.

The art revision and its proposed 640x360 integration remain separate work. Before
merging, reconcile any subsequent main changes and repeat relevant validation.
The only known automated game-test failures remain the two documented movement tests.
