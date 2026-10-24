# Side-view tile sets and parallax layers

Use when: reviewing, generating or specifying side-scroller/platformer tiles, sky and parallax backgrounds, platforms, or building/brick tiles.

## Do

- Build back to front: sky first, interactive layer last; judge each layer in context.
- Shift hue and saturation along a sky gradient, not just value; most saturated in the middle.
- Make sky bands thinner toward the top of the screen; use low-contrast steps so they blend.
- Treat the sky as one vertical strip of tiles repeated horizontally; only the transition tiles need work.
- Push distant layers toward the sky colors (lighter, lower contrast); reuse sky colors for the farthest shapes.
- Make each nearer layer larger, darker and more detailed than the one behind it.
- Reserve the most saturated, highest-value-contrast colors for the interactive (collidable) layer; lengthen its ramp if needed.
- Keep background foliage low-intensity (e.g. muted blue-greens) so it never competes with foreground greens.
- Fill every scrolling background layer down to the screen bottom so parallax never exposes a gap.
- Draw collidable tiles out to the tile edge (within 1-2 px) so visuals match rectangular collision boxes.
- Draw foreground tiles over the actual background to tune color and scale.
- Give each scrolling layer a varied silhouette; complex profiles look better and read as more believable.
- Use cap/profile tiles (peaks, skyline steps, a few rooftop pixels) to break flat layer tops.
- Suggest distant buildings with window rows only (no outlines); context from closer layers makes them read.
- Add cast shadow wherever an overhang meets a surface below; make shadowed variants of affected tiles.
- Add variation tiles (alt edge pattern, rooftop clutter, mossy brick, occupied window); felt, not noticed, they stop repetition.
- In a variation tile, shift the motif so no object is split across the tile edge.
- Keep freehand set-pieces within as few tiles as possible; reuse/flip their shapes.
- Make extra platforms believable scene objects (AC units, scaffolding, fire escapes).
- When mixing tile families (organic + urban), keep layer priority and ground logic coherent.
- Keep the working tile sheet grouped by type and partly assembled; a by-depth sheet helps palette tuning.
- Expect a limit on parallax layers; merge the farthest layer into the sky first.

## Don't

- Don't give the background more saturation/contrast than the foreground; depth collapses.
- Don't let a scrolling layer end above the screen bottom (it appears to hover).
- Don't leave a large flat-color body under a detailed edge; texture it.
- Don't build large freehand unifying structures before the level layout is final and play-tested.
- Don't spend a whole tile on a few pixels unless the silhouette gain justifies the tile budget.
- Don't force a mirrored tile if the flip looks wrong; draw separate left/right tiles.
- Don't make window shine depend on scene lighting; keep it self-contained.

## Techniques

**Dithered sky**

1. Build a small gradient (value + hue + saturation shift).
2. Paint horizontal bands, narrowing upward.
3. Dither band boundaries tile by tile; optionally add a subtle pattern to the plain fill tile.

**Mountain range from a few cap tiles**

1. Block mountains as whole-tile rectangles of stepped heights in a light sky color.
2. Draw a few cap tiles with a jagged ridge, one per height transition.
3. Closer range: copy the tiles two shades darker; use the skipped shade for peak highlights.
4. Texture the flat body by stamping cap-tile copies inside it in the highlight color.

**Distant tree line**

1. One horizon tile of tree tops + a shifted variation; fill below with the darker green to screen bottom.
2. Nearer trees: rough outline -> neutral fill -> darks -> lights -> clean lines; add ground color at the bottom.

**Extendable platform (2 tiles)**

1. Block top surface and underside with flat colors.
2. Dark band defines the walk surface; cast shadow from top onto underside.
3. Add midtone, outline, texture.
4. Mirror the end tile for the other end (optional, eases reuse).
5. Middle tile: copy the end tile and cover its edge with a vertical strip copied from its interior.

```
 ╭───────┬───────┬───────╮
 │ end L │  mid  │ end R │   mid repeats to any length
 ╰~~~~~~~┴~~~~~~~┴~~~~~~~╯
```

**Support structures under platforms (optional)**

1. Add a few blend colors between platform and background hues, on a layer between them.
2. Rough in rock/clay supports; duplicate/flip shapes.
3. Paint platform cast shadow on that color only (lock/mask it); soften with patterned dither that doubles as texture.
4. Reuse background cap tiles, recolored, as rock-edge tiles; add foliage in the same colors.

**Layered cityscape**

1. Far: sky-colored fill tiles with tiny window marks, plus skyline tiles (stepped tops, a few rooftop pixels).
2. Middle: larger buildings in the darkest sky color, gray windows, rooftop-clutter tiles.
3. Near background: larger and darker still, more window detail; a tinted window shadow adds flavor.
4. Main layer: brick -> window -> roof ledge -> side edge -> shadowed variants -> variation tiles.
   [inferred: schematic]

```
 far   ▁▁▃▃▁▅▁▃▃▃▁▁    sky colors, window marks only
 mid   ▁▅▅▃▁▃▇▃▁▅▅▃    darkest sky color, gray windows
 near  ▃▇▇▇▃▃▇▇▅▃▇▇    darker, detailed windows
```

**Brick tile**

1. Uniform-height bricks with 1 px dark mortar; offset alternate rows by half a brick.
2. Lighter color on each brick's top and left edges.
3. Vary mortar/brick tones for a weathered look.

```
 ▀▀▀▀▀▀▀│▀▀▀▀▀▀▀│▀▀▀   brick (lit top/left)
 ────────────────────  1 px mortar
 ▀▀▀│▀▀▀▀▀▀▀│▀▀▀▀▀▀▀   next row offset half a brick
```

**Window, ledge, edge**

1. Window: minimal frame + sill -> detail and recess shadow -> shine as diagonal lines of varying thickness -> place on brick, shadow below the sill.
2. Roof ledge: one repeating main tile + one end tile.
3. Side edge: stone quoins (alternating long/short blocks) over brick; separate left/right tiles if flipping fails.
4. Shadowed variants: darken top rows of wall tiles under the ledge.

## Numbers & specs

- Larger tiles suit side view (book: 32x32 vs 16x16 top-down); size the canvas as whole tiles (e.g. 640x480 = 20x15).
- Brick: 3 px brick + 1 px mortar per row; build the ramp up gradually (2 -> 3 -> 5 colors).
- Closer copy of a background layer: about 2 shades darker.
- Keep total colors modest; a full side-view environment can stay under ~50 colors.
