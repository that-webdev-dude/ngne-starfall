# Gameplay captures

Captured on 2026-10-25 in Chrome with WebGPU, using `@ngne/core` 0.3.0 at game revision `f4f09a6143da3109903e7ec21f3defc8e6f2bc66`.

These are unedited 640x360 PNGs copied from the rendered GPU canvas immediately after a frame. The HUD and full playfield are included. No presentation presets, seeded encounters, health changes, compositing or image generation were used.

The campaign ran from the title screen with seed 17 and the existing [campaign bot](../../tests/browser-campaign.ts), using ordinary movement, fire, Nova and menu inputs. A temporary capture launcher added PNG export and a gallery, and recorded overload diagnostics separately from fatal errors. Production game code and rules were unchanged.

The run cleared all three sectors with score 188,850 and hull 4, with no fatal runtime errors. It recorded 127 nonfatal overload diagnostics, including browser throttling while minimized or backgrounded; this capture run is not a performance benchmark.

| File                                                                 | Sector time | Score   | Hull |
| -------------------------------------------------------------------- | ----------- | ------- | ---- |
| [Orbital Breakwater combat](orbital-breakwater-combat.png)           | 52.03 s     | 15,050  | 4    |
| [Gatebreaker](orbital-breakwater-gatebreaker.png)                    | 104.02 s    | 47,700  | 4    |
| [Kiln Serpent](furnace-belt-kiln-serpent.png)                        | 128.02 s    | 100,250 | 4    |
| [Midnight Citadel Nova](midnight-citadel-nova.png)                   | 52.02 s     | 139,700 | 4    |
| [Starfall Engine (lead image)](midnight-citadel-starfall-engine.png) | 146.00 s    | 166,850 | 5    |
