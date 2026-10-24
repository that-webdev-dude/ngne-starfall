# Tiles, seamless textures, dithering, top-down tile sets

Use when: reviewing or generating tile sets, seamless/repeating textures, terrain transition tiles, dither patterns, or top-down (Zelda-style) environment art.

## Do

- Make every tile in a set the same power-of-2 size (8, 16, 32). Fix the size before agreeing to a job: each doubling of the side quadruples the pixels to draw.
- Work on a grid equal to the tile size, with snap on. Preview each tile in several rows and columns beside a tile bank (one clean, up-to-date master copy of every tile).
- Keep base textures homogeneous: detail spread evenly, low contrast, nothing that catches the eye. Then add variation tiles (flowers, rocks, rough patches).
- Keep environment colors low contrast so backgrounds don't compete with character sprites.
- Place texture accents as sparse, irregular single pixels: no straight lines, no clumps. Tile 3x3 and fix any accidental alignments.
- Use variation tiles to lay out paths that guide the player (including subtle paths to secrets), and arrangements that form a hint image (e.g. a key-shaped lake).
- Use odd counts for organic props (e.g. 3 stones). Even counts read as a pattern.
- A large prop may span 2+ adjacent tiles if the pieces are always placed together.
- Reuse effort: flip/mirror tiles, and recolor finished props by palette swap.
- Palette: reserve slot 0 for transparency, fill unused slots with a loud color (e.g. magenta) so they can't be confused with near-blacks, and keep a few spares.
- Use organic dither for skies, shadows and natural shading, and patterned dither for man-made materials (metal, plastic).
- Make the grid visible on purpose only when the subject is itself gridded or angular (floor tiles, ridges).

## Don't

- Don't put a single standout element in a repeating tile. Once tiled, it becomes a polka-dot grid.
- Don't put a gradient inside a repeating tile. Every tile edge becomes a seam.
- Don't use dramatic shadows or high contrast in base tiles. They expose the repeat and fight characters for attention.
- Don't let one object fill most of a base tile, or concentrate detail in one area (fine for accent tiles).
- Don't run long lines of pixels along tile edges. They outline the grid.
- Don't align or cluster accent pixels in organic textures. Alignment reads as man-made, and a cluster becomes a repeating motif.
- Don't pair near-white highlights with near-black shadows in ground textures. It looks noisy and patterned.
- Don't use checker/patterned dither on foliage. It looks static.
- Don't animate dithered areas. They flicker ("pixel flash") and the texture becomes inconsistent.
- Don't use perfect quarter-circle corner tiles for organic transitions. They look too regular.
- Don't make shade variants with "darken" filters. They overshoot or merge close values; remap through a shifted palette instead.

## Techniques

### Ground base tile

1. Fill with the material's middle ramp color.
2. Add sparse, quasi-random single pixels one step darker, and fewer one step lighter.
3. Tile 3x3 and break up anything that lines up.

- Rough variant: same colors, denser. Short streaks and small clumps are fine if evenly spread. Raise the contrast for thicker growth.
- Sand: base brown, gray pebble pixels of similar value, a lighter glint on some of them, and a few darker-brown specks.

### Organic dither (A into B)

- Sprinkle B into A (sparse far from the border, dense near it, quasi-random), then A into B. Applied along a stepped ramp, it reads as one smooth gradient.

```
A=. B=#       border
              v
step 1  .....#..#.#.##|########
        ..#....#.#.#.#|########
step 2  .....#..#.#.##|#.#..#.#
        ..#....#.#.#.#|.##.#...
```

### Patterned dither (between adjacent ramp colors)

- A narrow 50% checker band at each step fakes an in-between color: 5 real colors read as about 9. Wider mixed patterns (sparse dots grading into checker) give a softer step [inferred]. Hand-drawn stylized patterns also work.

```
checker step              mixed step (approx.)
AAAA #.#.#. BBBB          AAAA #...#... #.#.#. .#.#.# ### BBBB
AAAA .#.#.# BBBB          AAAA ..#...#. .#.#.# #.#.## #.# BBBB
```

### Blend tile between two similar textures

- Butting them directly gives blocky stair-step corners.
- Instead of two rounded-corner tiles, put one blend tile at those corners: the rough texture thins out irregularly toward one diagonal, so the patch reads as an organic blob.

### 9-slice transition (patch of A inside B): lit, 12 tiles

1. On a 3x3 block, draw the boundary through the 8 outer tiles (rounded rectangle, slightly wavy).
2. Fill outside with B, color the line for light direction (lit edges lighter, shadow edges darker), and add cast shadow on the shadow side.
3. Inverse (B inside A): reuse the 4 side tiles on opposite sides and draw 4 new corners.

- Gives true light direction and any rectangle size, but it's slow and demands lighting consistency.

### Three-tile transition: fast, no true light direction

1. Draw the boundary on one side tile and one outer corner only. The side's line must sit at exactly half the tile height so flipped copies meet the corner.
2. Add a dark edge line and cast shadow, fill the outer material, and add stray bits crossing the edge (grass blades in sand).
3. Flip the side and corner to fill all 8 positions. Draw one inverse (concave) corner; the same side tile serves all 4 sides.

```
corner tile (TL)      side tile (top)      . outer  # inner
................      ................
........######        ................
.....#########        ################  <- line at mid-height
..############        ################
```

- Pros: quicker to make and to place, fewer inconsistencies, smaller files. Spend the saved tiles on edge variations to hide the grid.

### Props on a texture (flowers, stones, cacti)

1. Start from a base tile and block in the shape (stem/leaf pixels plus a bright accent, or gray blobs).
2. Add cast shadow on the ground, then light and dark on the prop (outline it if it must pop), then texture.
3. Palette-swap for a free extra variant.

- Wild growth: 3-pixel light blades, each with a dark pixel beside it so it pops.

### Shade variant

- Remap every color in a tile one ramp step darker (e.g. shadowed grass) using a second palette with shifted slots.

### Repeating rock face (fish-scale method)

1. Draw arched, scale-like stones (rounded tops, 1 px dark crevices).
2. Wrap curves that cross a side edge around to the opposite side. Make top-edge line ends meet bottom-edge curve starts, then test by tiling.
3. Add a light cap on top of each stone, then texture: value variation, moss in crevices, dirt flecks.

### Rock wall to ground blends

- Bottom: clear the tile bottom (front stones reach 1 px lower than crevices), fill with ground, darken the contact line, and overlap a few blades onto the rock.
- Top: paste the stone tile's bottom half onto a ground tile. Even out stones that pattern, and darken the ground just above so the rock stands out.
- Sides: one vertically tiling edge tile, flipped for both sides (accepts impossible lighting to save tiles). Add corner tiles and plateau rim tiles.
- Cast shadow: a shade-shifted ground tile plus one shadow-to-lit blend tile at the front. The back edge can stay angular because it echoes the structure.

### Stairs

- Repeating step: 2 dark px (riser) + 3 light px (tread). If the tile height isn't a multiple of 5, add one extra light band [inferred]. Mirror one tile for a 2-wide flight and add top/bottom tiles. Light/dark side tiles (5 total) look noticeably better.

### Water

1. Base: mid blue with short horizontal dashes in lighter and darker blue. Add variation tiles (reeds, a rock).
2. Put a sand/earth band between water and grass, using three-tile sand transitions as guides. Push the sand back so the water reaches mid-tile.
3. Shade the inner edge of the sand band, and soften angular corners into a gentler diagonal.
4. Angle the dashes to follow the shoreline, and darken the water near the beach.

## Numbers & specs

- Tile sizes: 8x8, 16x16, 32x32. One 32x32 = 4 16x16 = 16 8x8. Work canvas: about 128x128 for 16px tiles, at least 256x256 for 32px tiles.
- Classic 8-bit constraint: 256 colors total, 16 per tile, often 1 of them transparent.
- A full top-down set (grass, sand, water, stone, flowers) fits in about 32 colors. A dominant ground material can use a ~7-step ramp.
- 9-slice: 8 edge tiles + 4 inverse corners = 12. Three-tile method: side + corner + inverse corner. About 12 tiles can compose a whole top-down scene.
