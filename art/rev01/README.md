# Art rev01: 640x360 view and native-size sprites

Spec for moving Starfall from a 480x270 view with runtime-shrunk paintings to a 640x360 view with sprites drawn at their final size. The machine-readable version is [spec.json](spec.json); this file explains it. Nothing in `src/` has changed yet.

**Revision pass in progress.** The owner's review [FEEDBACK.md](FEEDBACK.md) is the brief for the current pass; its proposals (7 bank poses on 31×33, 40–65 ms pose transitions, a hold-to-charge plasma of about 0.9 s, a 12-frame / 620 ms nova, 17 plasma effect frames, 7 flash counterparts, the projectile sizes) are the working defaults in spec.json and are marked "proposal" there. Status per asset is in the table below.

Sources: rules tagged *(book)* come from the pixel-art skill ("Pixel Art for Game Developers"). Untagged numbers are choices for this project.

## Status

Scope of every approval so far: **stills only**. No playback, collision or gameplay check has been done for any asset. "rev01 README" means the approval was recorded in the first README of this pack without a named approver; it is treated as the owner's approval of the stills.

| Asset | Revision | Approved by | Scope | Pending in this pass |
|---|---|---|---|---|
| player | Phase 2 build (7 poses) | pending owner (gate 2) | — | study N1 approved at gate 1 |
| playerFlash | Phase 2 build | pending owner (gate 2) | — | |
| exhaust | rev01 | rev01 README | stills | lateral flicker, Phase 3 |
| primaryLance, hostileBead, hostileNeedle, hostileOrb | Phase 2 build | pending owner (gate 2) | — | study approved at gate 1; needle has 3 direction frames |
| plasmaCharge, plasmaReady, plasmaMuzzle, plasmaShot, plasmaImpact | Phase 2 build | pending owner (gate 2) | — | |
| nova, novaCalm | Phase 2 build (12 + 2 frames) | pending owner (gate 2) | — | study approved at gate 1; staging decision open |
| interceptor | rev01 | rev01 README | stills | engine pulse + firing cue, Phase 3 |
| dart | rev01 | rev01 README | stills | engine pulse + firing cue, Phase 3 |
| gunship | Phase 2 build (4 frames, canvas 39×35) | pending owner (gate 2) | — | |
| warden | rev01 | rev01 README | stills | one functional action, Phase 3 |
| minelayer | rev01 | rev01 README | stills | one functional action, Phase 3 |
| gatebreaker, gatebreakerTurret | Phase 2 build | pending owner (gate 2) | — | hull idle / core telegraph / 3 wrecks; turret idle / telegraph / firing / down |
| kilnHead, kilnSegment | rev01 | rev01 README | stills | cutter/drill motion, coupling compression, Phase 3 |
| starfallEngine | rev01 | rev01 README | stills | layered armour, emitter states, Phase 3 |
| explosion, hitSpark, heavyBreakup | Phase 2 build | pending owner (gate 2) | — | explosion frames 3–4 pulled off row 30 |
| breakwaterBackground | rev01 | rev01 README | stills | local contrast in the boss entrance area, Phase 3 |
| furnaceBackground | rev01 | rev01 README | stills | sparse dim depth cues only (stays dim by owner decision), Phase 3 |
| citadelBackground | rev01 | rev01 README | stills | break repeated terraces, calm the portal behind the boss, Phase 3 |

New approvals are recorded here only when the owner gives them, with the revision and the scope checked.

## Summary

- Logical view becomes **640x360**, shown at a whole-number scale only: 2× Steam Deck, 3× 1080p, 4× 1440p, 6× 4K.
- Every sprite is redrawn at its **final size**: whole-number, odd×odd canvas, binary transparency, colours from one **77-entry indexed palette** (55 hull/environment entries plus 21 effect entries).
- Ships get smaller relative to the screen (player 17% → 9% of screen height). Bosses keep about the same screen share.
- World constants scale by exactly 4/3 (640/480 = 360/270), so timing and screen-relative speeds don't change.

## Viewport

| Item | Value |
|---|---|
| Logical size | 640×360 (16:9) |
| Scale | `k = floor(min(screenW / 640, screenH / 360))` in **device pixels** |
| Small windows | if the formula gives `k = 0`, use `k = 1`, centre the canvas and let the viewport clip it equally on both sides; never scale by a fraction. Windows under 640×360 are not a supported play target. |
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

One shared indexed palette, 77 entries. Index 0 is transparent *(book: reserve index 0 as the key colour)*. Ramps are contiguous and ordered dark → light *(book: keep each ramp in contiguous slots so it can be edited or swapped as a unit)*. Swatches with a greyscale value check are in [palette.png](palette.png).

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
| 56–60 | plasma | player lance, charged plasma effects, player flash, ready and low-hull cues |
| 61–64 | bead | ordinary hostile fire |
| 65–67 | needle | aimed fast hostile fire |
| 68–71 | orb | heavy hostile plasma, beam lane and warning |
| 72–76 | nova | nova ring |

Ramps 1–55 were picked by hand from the dominant colours of the current art (`tools/sample_colors.py`), so each faction keeps its present look. Ramps 56–76 are the effect ramps added in this pass; existing hull ramps are never recoloured to make effects.

Rules:
- Each sprite has a colour budget (`maxColors` in spec.json). The book's guide for a small character is about 13–14 colours *(book, inferred)*.
- Strongest saturation is reserved for the player, fire, glow and the effect ramps. Everything the player must notice sits in those ramps *(book: reserve strongest saturation for the gameplay layer)*.
- Backgrounds use their own ≤32-colour palette per stage. They must not use any colour of the fire, glow, pickup, cockpit or effect ramps, and their lightest value stays below steel's lightest (luma 216.0) *(book: distant layers lighter and lower in contrast; here "lower contrast" applies because the sky is dark)*. The validator enforces both.

## Sprites

All canvases are odd×odd, so a symmetric ship has a 1 px centre column and the pivot sits on a whole pixel. That also keeps the pivot whole after the engine's −90° rotation of the Kiln parts. The pivot is the centre pixel `((w−1)/2, (h−1)/2)` unless noted. "Screen share" is height ÷ 360 for ships; for bosses it is given as width ÷ 640 and height ÷ 360.

| Sprite | Canvas | Frames | Max colours | Screen share | Was (480×270) |
|---|---|---|---|---|---|
| player | 31×33 | 7 (bank-left-3 … neutral … bank-right-3) | 16 | 9% | 34×45, 17% |
| playerFlash | 31×33 | 7 (one per pose) | 16 | 9% | — |
| exhaust | 7×15, pivot (3,0) | 3 | 5 | — | 7×21 |
| primaryLance | 3×11 | 1 | 4 | — | code 3×11 |
| hostileBead | 9×9 | 1 | 4 | — | code 9 ring |
| hostileNeedle | 13×13 | 3 (0°, 22.5°, 45°) | 4 | — | — |
| hostileOrb | 13×13 | 1 | 5 | — | — |
| plasmaCharge / plasmaReady | 15×15 | 3 / 2 | 5 | — | — |
| plasmaMuzzle | 19×19 | 2 | 5 | — | — |
| plasmaShot | 15×23 | 4 | 6 | — | — |
| plasmaImpact | 35×35 | 6 | 6 | — | — |
| nova | per frame, 15×15 … 1545×1545 | 12 | 6 | ring reaches every corner | code ring of 56 squares |
| novaCalm | 223×223 | 2 | 6 | reduced-motion nova | — |
| hitSpark | 11×11 | 3 | 5 | — | code burst |
| heavyBreakup | 47×47 | 8 | 8 | — | — |
| gatebreakerTurret | 27×45, pivot (13,14) | 4 (idle, telegraph, firing, down) | 20 | — | part of the hull + code 20×25 rect |
| interceptor | 27×23 | 1 | 12 | 6% | 40×33, 12% |
| dart (Sweeper) | 13×25 | 1 | 10 | 7% | 14×27, 10% |
| gunship | 39×35, pivot (19,15) | 4 (idle, fire, vent-a, vent-b) | 17 | 9% | 42×32, 12% |
| warden | 33×31 | 1 | 14 | 9% | 36×35, 13% |
| minelayer | 29×29 | 1 | 12 | 8% | 30×32, 12% |
| Gatebreaker | 159×79 | 5 (idle, telegraph, wreck ×3) | 24 | 24.8% width / 21.9% height | 110×56, 22.9% width |
| Kiln head | 65×47 | 1 | 20 | — | 66×48 |
| Kiln segment | 41×23 | 1 | 14 | — | 40×22 |
| Starfall Engine | 143×111, pivot (71,48) | 1 | 24 | 22.3% width / 30.8% height | 104×81, 21.7% width / 30% height |
| explosion | 31×31 | 6 | 6 | — | 56×56 |
| backgrounds ×3 | 640×400, pivot (320,200) | 1 each | 32 | full screen | 480×270 |

Size decisions:
- **Fodder is smaller than the player.** The interceptor (3 HP) was wider than the player; now it's 27 px against the player's 31.
- **Mid-tier enemies are about the player's size**, so threat level reads from colour and silhouette, not just scale.
- **Bosses keep their screen share**, so they still dominate the screen while ships shrink around them.
- The Starfall Engine pivot stays above centre (48 of 111), as today, so its on-screen placement doesn't move.
- The Kiln parts stay in their current orientation; the engine keeps rotating them by exactly −90°, which is lossless on whole pixels.
- The player keeps 31×33 with pivot (15,16) for the 7-pose redesign. If the armoured silhouette cannot read in that budget, larger native-size samples are compared in context before the canvas changes.

### Player design and banking

The player is a compact armed spacecraft: shorter armoured prow, recessed cockpit, substantial engine pods, visible weapon housings and negative spaces between hull sections; blue/cyan identity with a small warm cockpit accent. Aggression comes from mass, silhouette and weapons, not spikes or lone bright pixels.

Banking is **whole-body**: each of the seven poses is a solid hull rolling, re-lit for its orientation. The raised pod shows its top surface, the lowered pod its side/underside, the canopy displaces, hull sections overlap, and the extreme pose has the narrowest silhouette. Do not rotate or squash the neutral bitmap. The pivot (gameplay core) stays fixed; canopy and pods may move around it. Poses are input states traversed one level per 40–65 ms (proposal), with an immediate return toward neutral.

### Animation

| Sprite | Type | Order | Durations (ms) |
|---|---|---|---|
| player | input pose | bank-left-3 … neutral … bank-right-3 | 40–65 per level (proposal) |
| exhaust | loop | short, medium, long, medium | 80, 80, 80, 80 |
| explosion | once | 0–5 | 45, 50, 65, 65, 65, 75 (365 total) |
| plasmaReady | loop | a, b | 120, 120 |
| plasmaMuzzle | once | 0–1 | 40, 50 |
| plasmaShot | loop | 0–3 | 60 ×4 |
| plasmaImpact | once | 0–5 | 40, 45, 55, 60, 65, 75 |
| nova | once | ignite ×2, expand ×6, fade ×4 | 40 ×2, 50 ×6, 60 ×4 (620 total, proposal) |

Rules: change only what moves between frames. Avoid pixels popping in and out *(book)*. Keep the silhouette continuous between adjacent bank poses so the roll reads as one object. No opaque pixel on a canvas edge row or column, so moving effects never look cropped; the only exception is a canvas that is exactly the sprite's shape (the 3×11 lance, the needle's head columns).

### Player states and cue priority (proposal)

Each cue has one meaning:
- **Damage:** one brief flash using the `playerFlash` counterpart of the current pose, then the invulnerability cue.
- **Invulnerability:** bright/dim alternation done at runtime (opacity), with the core marker always visible; never a fully invisible ship.
- **Charge:** energy gathers at the plasma muzzle (`plasmaCharge` levels), then the `plasmaReady` pulse stays local at the muzzle. It must not resemble being hit.
- **Low hull:** a persistent small emissive on the pod rears (spec `codeDrawn.lowHullCue`), separate from the damage flash.

When cues overlap: damage first, then the invulnerability blink, while the charge-ready cue stays visible at the muzzle. Reduced-motion play needs persistent substitutes for the blinking cues.

### Projectiles and effects

Each weapon role has one shape, so ownership reads from silhouette alone, including in greyscale:

| Role | Sprite | Look |
|---|---|---|
| player primary | primaryLance 3×11 | narrow cyan/white lance, pointed head, short fading tail |
| player charged | plasmaShot 15×23 (+ code-drawn trail) | broad cyan/teal capsule, hot centre, turbulent edge |
| ordinary hostile | hostileBead 9×9 | coral/pink round bead with a dark rim |
| aimed fast hostile | hostileNeedle 13×13 ×3 | red/orange dart; frames at 0°, 22.5°, 45°, the other 13 of 16 directions by 90° turns and mirrors |
| heavy hostile | hostileOrb 13×13 | magenta orb/diamond, distinct from the player's elongated plasma |
| beam hazard | code-drawn lane | stable bright lane in the orb ramp with a distinct pre-fire warning; width follows the collision geometry |

Code rendering stays allowed: the renderer may draw a projectile from its sprite or reproduce it with rects in the same ramp colours, as long as shape and size match. Dangerous cores sit above hulls, smoke and debris; trails stay subordinate to the core. Damage bounds and decorative glow are recorded separately in spec.json (`bounds`).

The nova is baked frames with a fixed origin (the trigger position) and explicit outer radii per frame. The largest radius (690 px) is derived from the farthest visible corner from any legal player position, so the ring reaches every corner. The interior stays transparent so the ship and surviving hazards remain visible. Frame canvases are 2R+3 (ignite/expand) and 2(R+12)+1 (fade, for drifting embers). The strip holds full frames; the consumer packs them into a sparse tile atlas (gate 1 decision). `novaCalm` is the reduced-motion alternative.

### Sockets

All sockets (exhaust nozzles, muzzles, turrets, couplings, emitters, weak points) are measured from the finished art and stored in spec.json as offsets from the pivot with +y down. Kiln sockets are in the sprite's own canvas coordinates, before the engine's −90° rotation. The player's exhaust, primary-muzzle and plasma-muzzle sockets are recorded per pose; neutral and the extreme banks carry the study A measurements, the intermediate levels are interpolated, and all seven are re-measured in Phase 2. A muzzle socket is the first transparent pixel straight ahead of the muzzle centre; an exhaust socket is the nozzle-exit centre on the row below it.

Integration notes from the art pass:
- The Gatebreaker's turrets are separate sprites (`gatebreakerTurret`, one instance per socket, the right one drawn flipped in x) with their own idle / telegraph / firing / down frames, because the game fires and destroys them separately; the hull keeps the wells. The Starfall Engine's destroyed-emitter overlay (20×20) is still undersized; Phase 3.
- The player's nozzle bottoms are open so the flame joins without a gap, so always draw the exhaust under the ship. Plasma effects attach at the plasma muzzle and draw above the hull.
- Lighting on the Kiln parts was drawn for their on-screen orientation: canvas +x ends up as screen top.

## Gameplay numbers (proposal)

- **World constants:** multiply every world constant by 4/3, including speeds, accelerations, spawn positions and the beam rects. Example: `FLIGHT.speed` 175 → 233.
- **Collision radii:** these follow the new art instead of the 4/3 rule:
  - player 5, plasma shot 5
  - interceptor 9, gunship 13, sweeper 8
  - minelayer 11, warden 12, mine 7
  - Gatebreaker 42, turret 15
  - Kiln head 21, segment 14
  - Starfall Engine 38, emitter 13
- **Boss weak-point radii:** scale by the boss's size factor: Gatebreaker 1.445, Starfall Engine 1.375.
- **Plasma control:** primary keeps firing while held; the plasma charge accumulates to full in about 0.9 s; releasing a full charge launches the shot, releasing early fires nothing. Damage, cooldown and boss interaction are settled in play.
- **HUD text:** the 3×5 font at 2× on the Deck is 10 physical px tall. Whether that meets Valve's Deck guidance is unverified and is **not an acceptance criterion**; a 5×7 font gives margin either way.

## Review checklist per sprite

Run before accepting a sprite *(book, from `mistakes-review.md`)*:
- no stray single pixels or notches on the outline; 1 px lines
- no pillow shading; light comes from the top, consistently
- shading bands don't step on the same rows as the outline (banding); no flat parallel colour columns or edge bands, shade by plane orientation
- no soft anti-aliased fringe
- reads at 1× (judge native size first, then 6–8× nearest-neighbour), on all three backgrounds; outline[0] vanishes on `#060d19`, so the hull values must carry the silhouette
- war machines get angular plates, not plush capsules; "dim" must not become "dead"

Automated part:

```bash
python -I tools/validate.py --all --rebuild
```

It checks spec consistency (ramps, canvases, pivots, animation data, every socket present for every pose and inside the canvas) and, for each file, the strip size, binary alpha, ramp membership and colour budget; for backgrounds the palette size, forbidden ramps and the brightness cap; with `--rebuild`, that `source/<id>.py` reproduces the PNG exactly. Pass `id=path` pairs to check single files. It checks files, not art quality.

## How to use this

1. **Order of work** follows FEEDBACK.md: first a redesigned neutral player with the hardest left/right banks, projectile studies and a short nova study, shown on all three backgrounds at native size (gate 1). Then complete banking and anchors, damage/charge effects, one animated ordinary enemy and one boss with telegraph/firing/destruction states (gate 2). Then carry the approved treatment across the remaining assets (gate 3).
2. **Two routes:**
   - **Artist:** hand over this README, spec.json, palette.png and FEEDBACK.md as the brief. The current PNGs are reference for silhouette and faction look only.
   - **Claude-generated:** for each sprite, write one palette-index grid per frame, render it with a script, run `validate.py` and the review checklist, then hand-polish.
3. **Where the engine takes over:**
   - `VIEW` becomes 640×360, plus integer scaling in `style.css` / `display.ts`.
   - Metadata drops `imageSize`/`drawSize` for a single native size per frame; the player gets 7 input poses and a flash set.
   - The `gameplay` numbers above get applied; charge, release, cue priority and reduced-motion substitutes are consumer logic.
   - Sockets get re-measured.

## Files

| File | What |
|---|---|
| `spec.json` | machine-readable spec (viewport, palette, sprites, sockets, bounds, code-drawn elements, gameplay proposals) |
| `FEEDBACK.md` | the owner's review of rev01; brief for the current pass |
| `sprites/<id>.png` | final sprite strips, frames left to right, one file per spec sprite id |
| `backgrounds/<id>.png` | final 640×400 stage backgrounds |
| `source/<id>.py` | palette-index grid (or generator, for backgrounds) that writes the matching PNG |
| `tools/pixlib.py` | shared palette lookup, grid rendering and save helpers used by `source/` |
| `palette.png` | swatches plus a greyscale value check, from `tools/render_palette.py` |
| `tools/validate.py` | spec consistency, per-file checks, background rules, sockets, source rebuild |
| `tools/render_palette.py` | regenerates `palette.png` |
| `tools/sample_colors.py` | dominant colours of the current art (input used to choose the ramps) |
