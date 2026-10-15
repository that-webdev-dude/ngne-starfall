# Starfall delivery

Completed locally on 2026-10-06 using the published **@ngne/core 0.2.1** package and its public APIs. No engine source edits or publication were performed.

## Delivered game

- Three authored sectors: Orbital Breakwater, Furnace Belt and Midnight Citadel.
- Gatebreaker carrier, articulated Kiln Serpent with destructible sections, and a three-phase Starfall Engine with destructible emitters.
- Five enemy ship roles, destructible drifting mines, telegraphed beam lanes, aimed fans, rings and staggered curtains.
- Manual straight-up firing on held Space/left mouse; B Nova; authored left/right banking and friction-based movement.
- Full-window canvas presentation, stage-specific artwork/music, explosions, particles, hit-stop, camera shake, score chains and reduced-motion settings.
- Stage progression, entry-score checkpoints, full-hull retries, final ending/replay, and local settings/best-score persistence.

The game source is this project. The standalone built site is `dist/`; the packaged site is **artifacts/final/starfall-web.zip**. `artifacts/final/manifest.json` records exact source/build hashes. NGNE's MIT notice ships in the built site. Asset sources, prompts and measurements remain under `art/` and `src/assets/`.

## Launch

Run `npm.cmd run preview -- --port 4173 --strictPort` from this directory, then open **http://127.0.0.1:4173/**. Rebuild with `npm.cmd run build`; a clean checkout first needs `npm.cmd ci`. See `README.md` for controls and development commands. The ZIP contains a static site and must be served over localhost or HTTPS in a WebGPU-capable browser.

## Verification

| Evidence | Result and limits |
| --- | --- |
| TypeScript/Vite | Production build passed; final bundle `index-CQu0T89Q.js`. |
| Automated tests | 32/32 passed. Includes manual fire, movement, swept collision, Nova, beam/mine lifecycle, destructible boss parts, score banking, actual scene transitions/retries/ending/replay, pause and asset claims, and scoped audio for all sectors. Subsequent changes were presentation-only and checked in the browser. |
| Normal-rules headless campaign | Three seeds cleared all three stages and reached the final result using ordinary Space/arrows/B/Enter inputs. About 8m38s active simulation per campaign. No health, invulnerability, encounter or time mutations. Exact observation/prediction makes this a reachability test, not a human difficulty verdict. |
| Rendered campaign | A real-time BrowserGame fixture reused the production campaign factory, assets and scenes, and drove public input keys. It cleared sectors at 160.57s, 193.65s and 179.08s active simulation, carried scores 57500 and 110800 forward, and finished at score191550/hull4. No recorded runtime diagnostics. This fixture did not substitute for physical human controls or listening. |
| Final presentation fixes | Separate explicitly seeded boss/result fixtures confirmed clear HUD placement and correct menu layering after the full run. They are presentation checks, not additional normal-rules wins. |
| Production entry point | Final `dist` preview: title, launch, Space firing, pause and return-to-title checked through browser controls; error panel empty. The packaged ZIP contains these same built files. |
| Human acceptance | User approved concept, representative art, first-stage playtest, requested manual straight shooting, and authorized campaign completion. No full-campaign human playtest or audible mix acceptance is implied. |

Detailed evidence: `artifacts/campaign-testing/tester-evidence.json`, `headless-final.json`, and `artifacts/final/browser-campaign-result.json`, `browser-verification.json`, `production-smoke.json`. Screenshots retain the pre-fix findings and final corrections. Development-only browser fixtures live under `tests/` and are excluded from the production build.

## Material limits

WebGPU is required; there is no fallback renderer or touch-control scheme. Physical gamepad, mobile, cross-browser and broad hardware testing were not performed. Audio assets decoded during browser operation and ownership/mixer behavior passed tests, but this work does not claim a human listening pass. Raster artwork is generated pixel-styled PNG material with measured metadata, not layered native pixel-editor source. Hosting/publication remains outside scope.

## Engine exercise

The game uses schema ECS/chunk queries, buffered entity lifetime, fixed-step simulation, named RNG streams, WebGPU sprite layers/tints/rotation, camera shake and interpolation, hit-stop with continuing effects, prepared scene candidates, asset leases, scoped audio/fades, and browser input. Collision, encounter design, scoring, progression and bitmap UI remain consumer-owned.

## Optional engine improvements

**No qualifying candidates found.** Development issues resolved here were game-owned input/cooldown logic, menu cleanup/layering, asset geometry, and presentation integration. The existing evidence does not justify an engine feature recommendation or public API change.
