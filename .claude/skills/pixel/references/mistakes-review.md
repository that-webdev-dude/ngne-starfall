# Mistakes & review checklist

Use when: critiquing a pixel-art sprite or tile, or self-checking art you generated, before calling it done.
Tags: untagged = from the source book; `[inferred]` = close reading of the book's examples; `[not in book]` = added general practice.

## Banding

- **Looks like**: edges of different colour or shape regions end or step on the same row or column, making a false line that ties unrelated parts together. Most common case: shading steps lined up with the object's own outline.
  - **Super pixel**: on a diagonal, every shade band shifts on the same rows as the outline, so the line reads as a stack of fat blocks.
  - **Lazy gradient**: the shading bands are concentric copies of the outline, stepping wherever it steps.
  - **Subtle**: the edges of small features (e.g. eyes) sit on the same rows as steps in the outline or shadow.
- **Why bad**: throws away the chance to suggest a smoother line; the eye reads the false lines as structure.
- **Fix**: stagger the steps so each band shifts on a different row than the outline and the other bands. Vary band widths around a shape. Nudge outline or shadow steps by one pixel so they don't meet feature edges.
- **Limits**: at very small sizes, reduce banding rather than expecting to remove it. Only possible exception: one tiny segment tiled in code (e.g. a moving wire or vine), and even that is discouraged.

```
super pixel: bands step together     fixed: steps staggered
#12#....                             #12#....
#12#....                             .#2#....
.#12#...                             .#12#...
.#12#...                             ..#2#...
..#12#..                             ..#12#..
..#12#..                             ...#2#..
```

`#` outline, `1` highlight, `2` mid tone, `.` background [inferred].

## Too much anti-aliasing

- **Looks like**: a fringe of in-between colours along the outline and inner shapes; the sprite looks blurry, like a big image scaled down.
- **Why bad**: image quality is lost everywhere at once; the crisp pixel look is gone.
- **Fix**: use AA sparingly. Keep a hard outline and clean inner shapes, with few intermediate pixels. One intermediate step per jaggy [not in book].

## Poor line / shape quality

- **Looks like**: lines, and also unlined silhouettes and shadow shapes, whose pixel steps look accidental: ragged profiles, stray single pixels, notches, broken bits.
- **Why bad**: a line is built from squares, so it only reads well if every step looks deliberate. Dropping outlines doesn't avoid this, because filled shapes have edges too.
- **Fix**: make small adjustments until the profile is smooth. Merge broken shadow bits into solid shapes and remove orphan pixels [inferred]. Step lengths along a curve change gradually, e.g. 3-2-2-1, not 3-1-3-1 [not in book].

## Weak palette choices

- **Looks like**:
  - contrast too low (values bunched in the mid range, looks washed out) or too high (harsh);
  - saturation too high (garish) or too low (muted, greyed);
  - too many colours (long ramps of closely spaced shades).
- **Why bad**: the palette is central to readable, successful pixel art. A big palette also makes every later sprite and animation harder.
- **Fix**: deliberately choose the contrast range, the saturation level and a small colour count. Trim near-identical steps within a ramp [inferred]. Check value separation in greyscale [not in book].

## Too much complexity

- **Looks like**: an early sprite made with high detail and a big palette, without considering project scope.
- **Why bad**: the quality bar it sets must then be met by every asset for consistency. Detail and palette size multiply the work for new sprites and animation. Players often prefer a simple look.
- **Fix**: choose the final style with the project's scope in mind; keep it simple (KISS).

## Flash / pillow shading

- **Looks like**: the darkest values run along every outer edge, with lighter values in the middle, as if lit by a camera flash.
- **Why bad**: the form looks flat and the result is mediocre.
- **Fix**: use a believable light source (e.g. overhead). Surfaces facing the light are lightest, and values darken as surfaces turn away. Dark edges appear only on the shadow side [inferred].

```
pillow (bad)     overhead light
3333333          1111111
3222223          1111111
3211123          2222222
3222223          2222222
3333333          3333333
```

`1` light → `3` dark. Simplified [inferred].

## No texture / material

- **Looks like**: shading gives form and depth, but every surface is smooth, even bands; the material can't be identified.
- **Why bad**: materials react to light differently depending on transparency/translucency, reflectivity and coarseness. An object with several colours also has different values.
- **Fix** (as far as the resolution allows):
  - Transparent: show the background colour through the object, and give it a cast shadow that lets some light through (refraction).
  - Reflective: add reflections and specular highlights.
  - Coarse/worn: mottled, irregular patches and broken highlights instead of smooth bands [inferred].
- **Limits**: full detail may not fit small sprites. Still convey the key material cue where the size allows.

## Review checklist

Every "yes" points to a failure; fix it, then re-check.

- Does any shade edge step on the same row or column as the outline? → banding
- Does any diagonal have all bands stepping together? → super pixel
- Are shading bands just concentric copies of the outline? → lazy-gradient banding
- Do small features' edges line up with outline or shadow steps? → subtle banding
- Is there a soft fringe of in-between colours, or does it look downscaled? → too much AA
- Are there stray single pixels, notches or ragged runs on outlines, silhouettes or shadow shapes? → poor line/shape quality
- Do step lengths along curves jump erratically (e.g. 3-1-3-1)? → poor line quality [not in book]
- Are values bunched together (washed out), or jarringly harsh? → contrast
- Is saturation garish or dull compared with the intended style and other assets? → saturation
- Does any ramp have near-identical neighbouring shades, or is the colour count large for the size? → too many colours [inferred]
- Would matching this detail and palette size across every asset and animation frame be unrealistic? → too much complexity
- Are all outer edges dark with a light centre, regardless of light direction? → pillow shading
- Is the light direction unclear or inconsistent? → pillow shading [inferred]
- Is it impossible to tell the material (transparent, reflective, coarse) from the shading? → no texture
