# Art rev01: 640x360 view and native-size sprites

Spec for moving Starfall from a 480x270 view with runtime-shrunk paintings to a 640x360 view with sprites drawn at their final size. The machine-readable version is [spec.json](spec.json); this file explains it. Nothing in `src/` has changed yet.

**Status:** all 15 assets are drawn, validated and approved: 12 sprite strips in [sprites/](sprites), 3 backgrounds in [backgrounds/](backgrounds). Each PNG is rebuilt by its script in [source/](source) (`python -I source/<id>.py`). Sockets are measured and recorded in spec.json.

Sources: rules tagged *(book)* come from the pixel-art skill ("Pixel Art for Game Developers"). Untagged numbers are choices for this project.

## Summary

- Logical view becomes **640x360**, shown at a whole-number scale only: 2× Steam Deck, 3× 1080p, 4× 1440p, 6× 4K.
- Every sprite is redrawn at its **final size**: whole-number, odd×odd canvas, binary transparency, colours from one **56-entry indexed palette**.
- Ships get smaller relative to the screen (player 17% → 9% of screen height). Bosses keep about the same screen share.
- World constants scale by exactly 4/3 (640/480 = 360/270), so timing and screen-relative speeds don't change.

## Viewport

| Item | Value |
|---|---|
| Logical size | 640×360 (16:9) |
| Scale | `k = floor(min(screenW / 640, screenH / 360))` in **device pixels**, k ≥ 1 |
| Leftover space | letterbox/pillarbox in the clear colour `#060d19` |
| Backing canvas | 640×360, enlarged with `image-rendering: pixelated` to `640·k / devicePixelRatio` CSS px |

Compute `k` in device pixels, not CSS pixels. With Windows display scaling at 125%, a 1920-px screen is 1536 CSS px wide, so a CSS-based scale would be uneven.

| Screen | k | Result |
|---|---|---|
| 1280×720 | 2 | exact fit |
| Steam Deck 1280×800 | 2 | 1280×720, 40 px bars top and bottom |
| 1920×1080 | 3 | exact fit |
| 1920×1200 | 3 | 60 px bars top and bottom |
| 2560×1440 | 4 | exact fit |
| 3440×1440 | 4 | pillarbox |
| 3840×2160 | 6 | exact fit |

**Optional tall mode (later):** on 16:10 screens, render 640×400 and fill the extra 40 rows with background and HUD only. Never extend the playfield there, or Deck players get more reaction room than desktop players. Backgrounds are already specced at 640×400 so this needs no new art.

## Palette

One shared indexed palette, 56 entries. Index 0 is transparent *(book: reserve index 0 as the key colour)*. Ramps are contiguous and ordered dark → light *(book: keep each ramp in contiguous slots so it can be edited or swapped as a unit)*. Swatches with a greyscale value check are in [palette.png](palette.png).

| Indices | Ramp | Used by |
|---|---|---|
| 1–2 | outline | everything |
| 3–6 | steel | shared metal |
| 7–10 | hero | player hull |
| 11–12 | cockpit | player accent |
| 13–16 | exhaust | player flame |
| 17–20 | raider | interceptor, dart, warden, Gatebreaker |
| 21–23 | brass | gunship, warden, minelayer, Gatebreaker |
| 24–26 | violet | gunship, warden |
| 27–29 | navy | Gatebreaker |
| 30–33 | rust | Kiln Serpent |
| 34–36 | olive | minelayer |
| 37–39 | engine | Starfall Engine |
| 40–42 | glow | Starfall Engine weak points |
| 43–44 | bone | Starfall Engine |
| 45–49 | fire | explosions, Gatebreaker and Kiln cores |
| 50–52 | pickup | repair pickup |
| 53–55 | ui | text |

The ramps were picked by hand from the dominant colours of the current art (`tools/sample_colors.py`), so each faction keeps its present look.

Rules:
- Each sprite has a colour budget (`maxColors` in spec.json). The book's guide for a small character is about 13–14 colours *(book, inferred)*.
- Strongest saturation is reserved for the player, fire and glow. Everything the player must notice sits in those ramps *(book: reserve strongest saturation for the gameplay layer)*.
- Backgrounds use their own ≤32-colour palette per stage. They must not use the fire, glow, pickup or cockpit ramps, and their lightest value stays below steel's lightest *(book: distant layers lighter and lower in contrast; here "lower contrast" applies because the sky is dark)*. This fixes today's orange station lights, which compete with explosions and bullets.

## Sprites

All canvases are odd×odd, so a symmetric ship has a 1 px centre column and the pivot sits on a whole pixel. That also keeps the pivot whole after the engine's −90° rotation of the Kiln parts. The pivot is the centre pixel `((w−1)/2, (h−1)/2)` unless noted. "Screen share" is height ÷ 360, or width ÷ 640 for bosses.

| Sprite | Canvas | Frames | Max colours | Screen share | Was (480×270) |
|---|---|---|---|---|---|
| player | 31×33 | 3 (bank-left, neutral, bank-right) | 16 | 9% | 34×45, 17% |
| exhaust | 7×15, pivot (3,0) | 3 | 5 | — | 7×21 |
| interceptor | 27×23 | 1 | 12 | 6% | 40×33, 12% |
| dart (Sweeper) | 13×25 | 1 | 10 | 7% | 14×27, 10% |
| gunship | 39×31 | 1 | 14 | 9% | 42×32, 12% |
| warden | 33×31 | 1 | 14 | 9% | 36×35, 13% |
| minelayer | 29×29 | 1 | 12 | 8% | 30×32, 12% |
| Gatebreaker | 159×79 | 1 | 24 | 25% width | 110×56, 23% width |
| Kiln head | 65×47 | 1 | 20 | — | 66×48 |
| Kiln segment | 41×23 | 1 | 14 | — | 40×22 |
| Starfall Engine | 143×111, pivot (71,48) | 1 | 24 | 31% | 104×81, 30% |
| explosion | 31×31 | 6 | 6 | — | 56×56 |
| backgrounds ×3 | 640×400, pivot (320,200) | 1 each | 32 | full screen | 480×270 |

Size decisions:
- **Fodder is smaller than the player.** The interceptor (3 HP) was wider than the player; now it's 27 px against the player's 31.
- **Mid-tier enemies are about the player's size**, so threat level reads from colour and silhouette, not just scale.
- **Bosses keep their screen share**, so they still dominate the screen while ships shrink around them.
- The Starfall Engine pivot stays above centre (48 of 111), as today, so its on-screen placement doesn't move.
- The Kiln parts stay in their current orientation; the engine keeps rotating them by exactly −90°, which is lossless on whole pixels.

### Animation

Timings carry over from the current data:

| Sprite | Type | Order | Durations (ms) |
|---|---|---|---|
| player | input pose | bank-left / neutral / bank-right | 65 transition |
| exhaust | loop | short, medium, long, medium | 80, 80, 80, 80 |
| explosion | once | 0–5 | 45, 50, 65, 65, 65, 75 (365 total) |

Rules: change only what moves between frames. Keep the outline identical across the bank frames apart from the wing that tilts. Avoid pixels popping in and out *(book)*.

### Sockets

All sockets (exhaust nozzles, muzzles, turrets, couplings, emitters, weak points) are measured from the finished art and stored in spec.json as offsets from the pivot with +y down, as today. Kiln sockets are in the sprite's own canvas coordinates, before the engine's −90° rotation. The player's exhaust sockets are per frame, because the lowered-side pod moves 1 px inward when the ship banks.

Integration notes from the art pass:
- The destroyed-turret overlay (Gatebreaker, 20×25) and the destroyed-emitter overlay (Starfall Engine, 20×20) are smaller than the new housings; grow them to about 26×28 and 25×25.
- The player's nozzle bottoms are open so the flame joins without a gap, so always draw the exhaust under the ship.
- Lighting on the Kiln parts was drawn for their on-screen orientation: canvas +x ends up as screen top.

### Code-drawn elements

Bullets, the player core, pickups and mines are drawn with `frame.rect` today and are already crisp. Keep them in code and only change the sizes (spec.json → `codeDrawn`):
- hostile bullet: 9 ring / 7 fill / 3 highlight
- player shot: 3×11
- pickup: 15 / 13 / 9×3 cross
- mine: 13 diamond / 7 / 3

## Gameplay numbers (proposal)

- **World constants:** multiply every world constant by 4/3, including speeds, accelerations, spawn positions and the beam rects. Example: `FLIGHT.speed` 175 → 233.
- **Collision radii:** these follow the new art instead of the 4/3 rule:
  - player 5
  - interceptor 9, gunship 13, sweeper 8
  - minelayer 11, warden 12, mine 7
  - Gatebreaker 42, turret 15
  - Kiln head 21, segment 14
  - Starfall Engine 38, emitter 13
- **Boss weak-point radii:** scale by the boss's size factor: Gatebreaker 1.445, Starfall Engine 1.375.
- **HUD text:** the 3×5 font at 2× on the Deck is 10 physical px tall. I believe Valve's Deck guidance asks for at least 9 px, but **I haven't verified that**. A 5×7 font gives margin.

## Review checklist per sprite

Run before accepting a sprite *(book, from `mistakes-review.md`)*:
- no stray single pixels or notches on the outline; 1 px lines
- no pillow shading; light comes from the top, consistently
- shading bands don't step on the same rows as the outline (banding)
- no soft anti-aliased fringe
- reads at 1× (judge native size first, then 6–8× nearest-neighbour)

Automated part:

```bash
python -I tools/validate.py player=sprites/player.png interceptor=sprites/interceptor.png
```

It checks spec consistency and, for each strip you pass, the size (frames side by side), binary alpha, colours within the sprite's ramps, and the colour budget.

## How to use this

1. **Make first:** player (all 3 bank frames) plus exhaust, then the interceptor. These set the bar for everything else *(book: the first finished sprite sets the bar)*. Then the other ordinary enemies, then the bosses, then backgrounds.
2. **Two routes:**
   - **Artist:** hand over this README, spec.json and palette.png as the brief. The current PNGs are reference for silhouette and faction look only.
   - **Claude-generated:** for each sprite, write one palette-index grid per frame, render it with a script, run `validate.py` and the review checklist, then hand-polish. Shrinking a painting won't pass `validate.py` without a cleanup pass; plan for one.
3. **Where the engine takes over:**
   - `VIEW` becomes 640×360, plus integer scaling in `style.css` / `display.ts`.
   - Metadata drops `imageSize`/`drawSize` for a single native size per frame.
   - The `gameplay` numbers above get applied.
   - Sockets get re-measured.

## Files

| File | What |
|---|---|
| `spec.json` | machine-readable spec (viewport, palette, sprites, sockets, code-drawn sizes, gameplay proposals) |
| `sprites/<id>.png` | final sprite strips, frames left to right, one file per spec sprite id |
| `backgrounds/<id>.png` | final 640×400 stage backgrounds |
| `source/<id>.py` | palette-index grid (or generator, for backgrounds) that writes the matching PNG |
| `tools/pixlib.py` | shared palette lookup, grid rendering and save helpers used by `source/` |
| `palette.png` | swatches plus a greyscale value check, from `tools/render_palette.py` |
| `tools/validate.py` | spec consistency and per-sprite strip checks |
| `tools/render_palette.py` | regenerates `palette.png` |
| `tools/sample_colors.py` | dominant colours of the current art (input used to choose the ramps) |
