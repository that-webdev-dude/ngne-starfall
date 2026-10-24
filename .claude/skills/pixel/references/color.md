# Color & palettes

Use when: choosing or reviewing a sprite/scene palette, building color ramps, setting saturation/contrast, planning palette swaps or transparency. Untagged = from the book.

## Do

- Start every palette by asking for the fewest colors the image can work with; fix palette size / detail level early, before mass-producing animations, and keep it consistent across all characters and environments.
- Build the palette from ramps: one gradient per material/object (cloth, hair, skin, grass, foliage, sky, mountains); share a single color across objects only sparingly (e.g. one accent for shoes and eyes).
- Store each ramp in contiguous, ordered palette slots so it can be edited or swapped as a unit.
- Make skin ramps tighter (smaller steps) and longer (more colors) than cloth/hair ramps — for any skin tone.
- Ramps may shift hue instead of value (e.g. sky blue → lavender → pink); let ramps drift in hue as they darken (yellow-green → blue-green; yellow → olive) `[inferred]`.
- Default to mid-saturation; to spotlight one element, saturate its ramp fully and mute every other ramp.
- Aim for medium contrast: smooth value steps within a ramp; the light end of one ramp sits against the dark end of its neighbour's.
- Fill flat areas with the middle ramp step, then shade down and highlight up (alternative: lightest step as base, shadows only, pencil-style).
- Close outlines before flood-filling; or block in color shapes first and generate outlines around each color region.
- Judge colors on the filled sprite, not as swatches; a skin tone fine in isolation can read as plastic in context.
- Reserve palette index 0 as the transparent key color: sprites are rectangles, key pixels aren't drawn, and sprites are layered in front of the background.

## Don't

- Don't add colors for detail you can't afford to animate — the cost is paid on every frame of every animation.
- Don't scatter ramp colors randomly through the palette; it blocks fast iteration and swapping.
- Don't push everything to max saturation (garish) or everything to low saturation (dull grey-brown).
- Don't use very low contrast (values bunched mid-range, no real darks): flat, and achievable with fewer colors.
- Don't use very high contrast with few colors (near-black darks and bright highlights everywhere): harsh, too many focal points.
- Don't use a highly saturated skin base `[inferred]`.

## Techniques

**Build a ramp:** duplicate the base color → darken / lighten / hue-shift the copy to form the other end → interpolate the slots between.

**Re-mood a scene by palette swap** (day → sunset → night; also recolored enemies/characters)

1. Keep each area (sky, mountains) on its own ramp.
2. Light change (sunset): replace only the sky ramp's two end colors and re-interpolate.
3. Heavy change (night): re-color every ramp; the sky goes near-black.
4. Save each version as a separate palette for the same image.

- Day depth: nearest mountains darkest, farthest lightest and closest to the sky. A night palette can invert this.
- Swaps can switch lights on: window glass goes from sky-reflection colors to lit yellow.

**Hide/show features via palette**

1. Draw the optional feature (beard, hair) on its own palette index.
2. "Without" palette: set that index equal to the color beneath it (skin). "With" palette: give it a distinct color.

```
 slot:      0 outline/hair   1 skin   2 feature
 without:   dark             skin     = skin      -> feature hidden
 with:      dark             skin     beard color -> feature shown
```

- Several such slots let one sprite become several distinct characters.

## Numbers & specs

- Bit depth → colors: 1 bit = 2, 2 = 4, 3 = 8, 4 = 16, 8 = 256.
- Small character sprite: ~3-step ramps for cloth/hair, 3–4 for skin, plus outline and 1 shared accent ≈ 13–14 colors [inferred].
- Detail vs time (32×32 head): 3 colors ≈ 5 min, 5 ≈ 10 min, 11 ≈ 30 min; body ≈ 2× head → 8-frame walk ≈ 2 h / 4 h / 12 h, per animation.
