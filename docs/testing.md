# Testing

## Automated checks

Use Node.js 24 or newer, from the repository root:

```powershell
npm.cmd test
npm.cmd run build
node --experimental-strip-types tests/run-campaign-bot.ts
```

The build checks source/test types and builds the production Vite entry. The campaign bot defaults to seeds 17, 41 and 83 and writes `.test-output/campaign-bot.json`; an output path followed by seeds can be supplied explicitly. Check every stage and campaign result, not just the exit code. The bot uses ordinary movement/fire/Nova inputs with exact entity observations and prediction. It demonstrates reachability, not human difficulty, audible balance or browser/GPU performance.

Generated test output belongs in gitignored `.test-output/`. Build output belongs in gitignored `dist/`.

## Browser fixtures

Start `npm.cmd run dev -- --port 5173 --strictPort`. Open the routes below at `http://127.0.0.1:5173/`. These fixtures are excluded from the production entry/build.

| Route                                                                    | Purpose                                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `/tests/browser-campaign.html`                                           | Rendered bot using production campaign composition.                                     |
| `/tests/browser-boss-review.html`                                        | Targeted boss presentation fixture.                                                     |
| `/tests/browser-integration.html?stage=1&manual=1&calm=0`                | Ordinary production stage beginning, normal controls/rules and sound after interaction. |
| `/tests/browser-integration.html?stage=1&scenario=boss&calm=0&capture=1` | Seeded, frozen presentation using production scenes, renderers and assets.              |

Integration route options:

| Parameter  | Values and behavior                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `stage`    | `1`, `2`, `3`: Breakwater, Furnace, Citadel.                                                                  |
| `manual`   | `1` starts ordinary play; PLAY STAGE does the same. LOAD PRESET seeds presentation state instead.             |
| `calm`     | `0` normal motion; `1` reduced motion. Manual play also permits changing it in Settings.                      |
| `scenario` | `card`, `play`, `boss`, `pause`, `result`, `settings`, `controls`, `death`, `loss`, `nova`, `dense`, `title`. |
| `capture`  | `1` hides fixture controls and freezes presentation presets. Manual play still advances normally.             |
| `pose`     | `-3` through `3`, default `0`: player bank pose in presets.                                                   |
| `novaTime` | `0` through `0.559` seconds, default `0.23`: preset Nova time.                                                |
| `variant`  | Boss presets: `intact`, `parts` (default: damaged hull/one destroyed part), `phase`, `cue`, `defeat`.         |

Presets seed clocks, populations and HP. Their images do not establish ordinary-rules reachability or animation continuity. For a compact presentation matrix, use all three stages × `card`, `play`, `boss`, `pause`, `result` × scales 1 and 2; supplement with normal/calm Nova, dense combat, player poses and menu/death states.

The diagnostic panel reports `LOADING`, `READY` after actual production GPU rendering, or `ERROR`. Confirm `NORMAL RULES / ordinary stage beginning` for play checks; presets say `SEEDED PRESENTATION / not reachability evidence`. Check backing size `[640,360]`, DPR, actual CSS dimensions and integer scale `k`. Nonfatal overload/dropped-tick diagnostics are recorded separately from fatal errors; retain both when reporting problems. Adapter identity is unavailable through the public API.

H toggles diagnostics. O or SAVE FRAME exports the next rendered GPU canvas as a native 640×360 PNG; check the export count, errors and downloaded file. The fixture does not reconstruct that image from metadata. Hide diagnostics before judging presentation.

For production smoke, run `npm.cmd run build`, then `npm.cmd run preview -- --port 4173 --strictPort`. Check title → launch → held fire → pause → return to title, and inspect the error overlay/browser console. A brief smoke does not establish a full rendered campaign clear.

## Manual checks

For each stage, play at scales 2 and 3 with reduced motion both off and on. Use the manual route above with the corresponding stage number. Target browser content areas of 1280×720 or 1920×1080 **device pixels**; Windows scaling changes CSS pixels, so verify DPR and reported `k`. Smaller than 640×360 device pixels clips the centred 1× canvas.

Use movement, held primary fire, Nova, damage/repair, pause, pointer navigation, Settings, Controls, retry and results. Repeat movement/fire/Nova/pause on a physical gamepad if available; record unavailable hardware explicitly. Listen to music/effects and their mix through play and pause.

| Stage                 | Checks                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1: Orbital Breakwater | Seven bank poses retain core/exhaust/muzzle alignment; Gatebreaker turrets show firing/disabled states; collision feel and primary cadence are acceptable. |
| 2: Furnace Belt       | Mines, pickups and beam warnings remain legible; Kiln links/rotation/damaged head read consistently; destroyed segment husks neither collide nor fire.     |
| 3: Midnight Citadel   | Engine phases, attached emitters, disabled machinery and defeat remain distinct during dense patterns; final result and replay work.                       |

Across all stages, inspect crisp pixels, letterboxing, text/card/result readability, menu hit areas and low-hull cues. Threats, lanes and the player core must remain readable over HUD/Nova/explosions. Reduced motion should provide understandable static cues without blinking. Check the dimmed HUD/footer overlap in menus.

Record stage, scale, DPR, reduced-motion setting, device/browser, gamepad availability and pass/fail details. Physical scaling, gamepad behavior, audible balance, accessibility and human play feel still need owner/device acceptance; automated checks and screenshots do not establish those results.

## Current integration decisions

- Runtime PNGs come from `src/assets/sprites/` and `src/assets/backgrounds/`; metadata and specified gameplay values come from `src/assets/spec.json`. Tests use these same assets, so the authoring archive is optional for builds and tests. Per-pose player muzzle sockets determine actual shot origins; hostile shot/mine-release/boss-part sockets determine spawn/collider geometry. Those geometry changes were intentional; counts, timings, velocities, damage and HP were preserved apart from explicitly specified spatial changes.
- Nova plays 11 frames over 560 ms; `fade-3` is excluded from playback/upload. Beam lane widths are 15/13 px for Engine/Warden, mine radius is 6, low hull means hull ≤ 1, and the stage card lasts 2.6 seconds.
- Plasma hold/charge/release gameplay is unimplemented and its HUD bar stays empty. Charge controls, damage/resource/boss rules, optional tall mode and further title redesign remain owner decisions.
- Runtime backgrounds retain the 17% tint and starfield, so raw art can appear brighter than the game.

## Known limitations

- A pause tap during Nova hit-stop can be consumed; repeating it after the freeze pauses. This predates the revised-art integration.
- Interceptor/Kiln head attack cues retain code-drawn elements. The damaged Gatebreaker core composites existing art, Kiln section fans retain head-relative origins, and the title wordmark remains small at native font size.
- Artwork regeneration requires the original authoring archive; exported runtime assets alone do not include its generators, palette or validation tools. The archive's historical palette sampler requires removed legacy inputs.
