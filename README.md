# Starfall

A standalone full-window arcade shoot-em-up built with **@ngne/core 0.3.0** and TypeScript. Three authored sectors lead from Orbital Breakwater through Furnace Belt to Midnight Citadel, with distinct bosses, destructible machinery, bullet patterns, mines and charged beams.

## Run

Use Node.js 24 or newer and a WebGPU-capable desktop browser. Serve on localhost or HTTPS; opening `index.html` directly from disk does not work.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

Open **http://127.0.0.1:4173/**. The built site is in `dist/`; it uses relative asset URLs and can be served from a subdirectory. For development, use `npm.cmd run dev`.

## Controls

| Action | Keyboard / mouse | Standard gamepad mapping |
| --- | --- | --- |
| Move | WASD or arrows | Left stick |
| Shoot straight upward | Hold Space or left mouse | Hold X |
| Nova | B | A |
| Pause | Escape or P | Start |
| Fullscreen | F | — |
| Menu navigation | Arrows, Enter or click | D-pad, A |

Holding both fire inputs keeps one firing cadence. Nova clears hostile projectiles and beams, damages enemies, and recharges in 15 seconds. The bright center dot marks the player's small hitbox. Movement accelerates and coasts on release; the ship banks with horizontal input.

Each sector begins with full hull and Nova. Retry restores that sector's entry score, preventing repeated attempts from accumulating score. Clear all three sectors to finish the campaign. Best score and settings are stored locally in the browser. Music, effects, mute and reduced motion are available in Settings. Touch controls are not included; physical gamepad support still needs device testing.

## Source layout

`src/main.ts` wires the browser shell and campaign. `components/` contains ECS data schemas; `entities/` composes archetypes; `systems/` implements simulation/rendering; `scenes/` composes gameplay and menus. `config/` owns stage and balance data, `world/` owns non-ECS state and geometry, `assets/` holds raster/audio sources and metadata, `ui/` provides canvas text/sprite helpers, and `services/` owns assets, campaign preparation, audio, display and persistence.

## Checks

```powershell
npm.cmd test
node --experimental-strip-types tests/run-campaign-bot.ts
```

The bot uses normal movement/fire/Nova inputs and exact read-only entity observations. It demonstrates reachable outcomes, not human difficulty or fun. `tests/browser-campaign.html` is a development-only rendered verification fixture using the production campaign composition; it is excluded from the production Vite build. The final report separates unit/integration tests, normal-rules runs, browser observations and human acceptance.

## Asset provenance

Artwork consists of original AI-generated raster assets, with prompts, source references, measured frame/pivot data and handoffs under `art/` and `src/assets/`. The editable originals are raster PNGs rather than layered pixel-editor documents. Music and effects are original deterministic synthesis with no external samples; the generator and measured WAV metadata are under `src/assets/audio/`.

NGNE is used through the pinned published package's public APIs. Its license is included with the dependency. No engine source modifications or publishing are part of this delivery.
