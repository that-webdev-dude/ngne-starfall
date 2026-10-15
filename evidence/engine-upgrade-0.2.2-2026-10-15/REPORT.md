# Starfall NGNE 0.2.2 upgrade verification

Date: 2026-10-15. Scope: this consumer only. No Git repository existed; none was initialized. No commit, push, publication, engine edit or other-consumer edit.

## Result

- Exact `@ngne/core@0.2.2` installed; package and lock pin updated. Current README version updated. Production source, assets and tests are unchanged.
- Both 0.2.1 and 0.2.2 pass all 32 existing tests, strict TypeScript and Vite production build.
- Both clear all three campaign stages for seeds 17, 41 and 83 with identical complete bot results and no diagnostics. Final scores: 192550, 193150 and 192100.
- Both production entrypoints pass title -> launch -> fire input -> pause -> resume, with no error-panel diagnostics.
- Three paired browser comparisons show no convincing performance improvement or regression. This is compatibility evidence, not a claim of higher gameplay FPS.

## Baseline and package identity

- `baseline-0.2.1.zip` preserves all 189 pre-upgrade non-node_modules files, including source, assets, package/lock, prior dist and historical delivery evidence. Read-only; every archive entry was checked against `baseline-files.json`.
- Baseline archive SHA256: `ff10dbfb9647fc0b7cd5bf0a10929aa77362d5bea1c39f20303ca6f982af0ecc`.
- `baseline-work/` is the isolated runnable 0.2.1 copy; its source/assets/tests match the original inventory. `ngne-core-0.2.1.tgz` preserves its dependency; all 55 installed package files match. Tarball SHA256: `b3819d50a7663038df4469a9d8e6ff13301d7a1c8012c5bce1c130c83c1ec571`.
- `ngne-core-0.2.2.tgz` was fetched from npm and matches the verified release candidate SHA256: `0fa8876e57d9cab76f33cf4849ae3417da0ec3b6e72fbda8bd88a27f98f02a16`. All 56 installed files match it. Registry metadata is retained in `registry-dist-0.2.2.json`.
- All 84 original source/asset/test/public files and 63 historical art/evidence files remain unchanged. `integrity.json` lists the exact original-file differences: package, lock, README and rebuilt dist. The old `artifacts/final/starfall-web.zip` and historical reports still describe their original 0.2.1 delivery.
- No prior benchmark label existed. `baseline-benchmark-version.json` and `candidate-benchmark-version.json` derive labels from each installed package, correctly naming 0.2.1 and 0.2.2 without relabeling historical evidence.

## Paired browser comparison

Fresh Chrome profiles, AB / BA / AB order, same seed 17 and unchanged production campaign composition. The existing `tests/browser-campaign.ts` bot runs with build-only scheduler/telemetry and a readiness observer around public `Game.prepare`; asset preparation is bounded and excluded before stepping. No production file is instrumented.

Each run advances 1800 rendered frames with synthetic 1/60 timestamps: 600 warmup, 1200 measured. Real requestAnimationFrame paces submissions; its wall cadence is not fixed to 60 Hz. The workload is the first 30 simulated seconds of sector 1, measuring BrowserGame CPU update plus render preparation/submission, excluding the afterFrame bot/DOM observer. It is not a full-game, real-time FPS or GPU-duration measurement.

Environment: Windows, Intel i7-12650H, Node 24.15.0, Chrome 155.0.8059.79 headless, 960x540 viewport/DPR 1, 480x270 backing canvas. CDP reports WebGPU enabled, Intel UHD/NVIDIA devices and Intel ANGLE D3D11; a specific WebGPU adapter and GPU timestamps were not recorded. Full flags/driver/environment are retained per run.

CPU milliseconds per sampled frame (each row is a separate run; no pooling):

| Pair | Version | Mean | p50 | p95 |
| --- | --- | ---: | ---: | ---: |
| 1 AB | 0.2.1 | 0.5645 | 0.5 | 0.8 |
| 1 AB | 0.2.2 | 0.5514 | 0.5 | 0.9 |
| 2 BA | 0.2.1 | 0.5198 | 0.5 | 0.7 |
| 2 BA | 0.2.2 | 0.5067 | 0.5 | 0.8 |
| 3 AB | 0.2.1 | 0.5628 | 0.4 | 1.4 |
| 3 AB | 0.2.2 | 0.5693 | 0.5 | 0.8 |

The median of the three means changes 0.5628 -> 0.5514 ms (about 2.0% lower); medians of per-run p50 and p95 remain 0.5 and 0.8 ms. The ranges overlap and the third mean moves the other way. This does not establish a speedup. Timer resolution is about 0.1 ms, material at these small costs.

All six runs have 1799 simulation ticks, identical complete captured game/run/history state, identical sprite/draw-call sequences, mean 909.854 sprites (839-1256) and 891 final quads. The final packed-frame/order diagnostic hash is `4106e847`; all six final PNG files are byte-identical, SHA256 `f9afb8746412d330d6335884b62b35e4f9d46d6fe45e6432c6ecbef9f0a3b82b`. This snapshot checks one scene/time, not every possible visual state. All six sampled runs have no diagnostics or dropped synthetic ticks. All eight browser sessions closed with no owned profile processes remaining and successful profile removal.

## Reproduce and inspect

From the consumer root:

```powershell
npm.cmd test
npm.cmd run build
node evidence/engine-upgrade-0.2.2-2026-10-15/build-comparison.mjs
node evidence/engine-upgrade-0.2.2-2026-10-15/compare-browser.mjs
node evidence/engine-upgrade-0.2.2-2026-10-15/compare-campaign.mjs
node evidence/engine-upgrade-0.2.2-2026-10-15/verify-integrity.mjs
```

Keep other benchmarks idle during measurement. `browser-comparison.json` retains each run's summary; `runs/*/raw.json` retains all 1200 samples. Each browser run retains environment, logs, screenshot and cleanup. `campaign-comparison.json` retains exact three-seed results for both packages. Existing test/build output and install/package checks are retained separately. `SHA256SUMS` inventories evidence except regenerable baseline node_modules.

Remaining limits: browser smoke is sector 1 only; full campaign comparison is headless simulation with stub sound/assets. No new human campaign/fun, audible audio, physical gamepad, mobile, other browser/device or GPU-time acceptance. No optimization was made. The refreshed production site is in `dist/`; historical distribution ZIPs were preserved.
