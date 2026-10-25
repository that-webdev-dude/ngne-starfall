# Starfall

A standalone full-window arcade shoot-em-up built with **@ngne/core 0.3.0** and TypeScript. Three authored sectors lead from Orbital Breakwater through Furnace Belt to Midnight Citadel, with distinct bosses, destructible machinery, bullet patterns, mines and charged beams.

The logical view is **640×360**, enlarged by an integer number of device pixels with DPR-aware CSS sizing. Spare space is letterboxed; windows below 640×360 device pixels clip the centred 1× canvas.

## Run

Use Node.js 24 or newer and a WebGPU-capable desktop browser. Serve on localhost or HTTPS; opening `index.html` directly from disk does not work.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

Open **http://127.0.0.1:4173/**. The built site is in `dist/`; it uses relative asset URLs and can be served from a subdirectory. For development, use `npm.cmd run dev`.

## Controls

| Action                | Keyboard / mouse         | Standard gamepad mapping |
| --------------------- | ------------------------ | ------------------------ |
| Move                  | WASD or arrows           | Left stick               |
| Shoot straight upward | Hold Space or left mouse | Hold X                   |
| Nova                  | B                        | A                        |
| Pause                 | Escape or P              | Start                    |
| Fullscreen            | F                        | —                        |
| Menu navigation       | Arrows, Enter or click   | D-pad, A                 |

Holding both fire inputs keeps one firing cadence. Nova clears hostile projectiles and beams, damages enemies, and recharges in 15 seconds. The bright center dot marks the player's small hitbox. Movement accelerates and coasts on release; the ship banks with horizontal input.

Each sector begins with full hull and Nova. Retry restores that sector's entry score, preventing repeated attempts from accumulating score. Clear all three sectors to finish the campaign. Best score and settings are stored locally in the browser. Music, effects, mute and reduced motion are available in Settings. Touch controls are not included; physical gamepad support still needs device testing.

## Source layout

`src/main.ts` wires the browser shell and campaign. `components/` contains ECS schemas; `entities/` composes archetypes; `systems/` implements simulation; `render/` contains background, enemy, player/effect and HUD passes; `scenes/` composes gameplay and menus. `config/` owns stage/balance data, `world/` owns session state and geometry, `ui/` provides native font/sprite/menu helpers, and `services/` owns assets, campaign preparation, audio, display and persistence. Runtime artwork lives in `src/assets/sprites/` and `src/assets/backgrounds/`; frame/socket metadata and specified gameplay values come from `src/assets/spec.json`. `src/assets/audio/` retains synthesized audio and provenance.

## Checks

```powershell
npm.cmd test
npm.cmd run build
node --experimental-strip-types tests/run-campaign-bot.ts .test-output/campaign-bot.json 17 41 83
```

Bot output defaults to gitignored `.test-output/campaign-bot.json`. It uses normal movement/fire/Nova inputs and exact read-only entity observations, demonstrating reachability rather than human difficulty or fun.

Development-only routes (use `npm.cmd run dev`, then open localhost):

- `tests/browser-campaign.html`: rendered bot using production campaign composition.
- `tests/browser-integration.html?stage=1&manual=1&calm=0`: ordinary production stage start; stages 1–3, motion off/on through `calm=0|1`, normal pause/settings/controls/results/retry routes.
- `tests/browser-integration.html?stage=1&scenario=boss&calm=0&capture=1`: frozen presentation preset using real renderers/assets. Presets seed clocks/entities/HP and do not establish reachability. H shows/hides diagnostics; O saves current native 640×360 canvas pixels as PNG.

Fixture code is excluded from the production Vite entry/build. See [Testing](docs/testing.md) for route options, manual checks, current integration decisions and known limitations.

## Asset provenance

The rev01 pixel-art pack was generated from palette-index grids and background generators. Its exported PNGs and specification are maintained under `src/assets/`; builds and tests need no separate authoring archive. Keep the original generators, palette, review and art tools in an archive if future artwork regeneration is needed. Music/effects are original deterministic synthesis with no external samples; the generator and WAV provenance remain under `src/assets/audio/`.

NGNE is used through the pinned published package's public APIs. Its license is included with the dependency. No engine source modifications or publishing are part of this delivery.
