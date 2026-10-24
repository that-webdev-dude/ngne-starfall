---
name: pixel
description: Pixel-art craft rules for game art (linework, palettes and ramps, shading, animation, tilesets, dithering, common mistakes), distilled from "Pixel Art for Game Developers". Use this whenever the user wants to create, generate in code, critique, fix or art-direct pixel art (sprites, characters, enemies, 16x16/32x32 tiles and tilesets, palettes and palette swaps, dithering, sprite animation frames, parallax backgrounds), even if they only say "sprite", "tile", "retro" or "8-bit/16-bit look". Not for general rendering, shader or GPU code, texture-filtering setup, or non-pixel illustration.
x-source: skills-manager@d586348
x-content-hash: dd494b05651c5a5c5453b7c8110cc9835a9efdbea3892524982d04fb6fa2dc2d
---
<!-- Vendored from skills-manager@d586348. Do not edit here: edit the source in the skills-manager repo and re-run `skills sync`. -->


# Pixel art

Rules for making pixel art that reads as deliberate, hand-placed pixels rather than a downscaled image. They come from one book (Daniel Silber, 2016), so treat them as a strong, opinionated baseline, not the only school of pixel art. If the user's established style or explicit choices contradict a rule, follow the user and mention the trade-off once.

Provenance tags in the reference files: untagged = from the book; `[inferred]` = a close reading of the book's examples; `[not in book]` = general practice added on top. Weigh tagged items a little less.

## Which reference to read

Read only what the task needs. For a review, always read `mistakes-review.md` plus the topic files for what you see.

| Task involves                                                                      | Read                                |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| Outlines, diagonals, curves, anti-aliasing, blocking out a character               | `references/lines.md`               |
| Choosing a palette, ramps, gradients, palette swaps, saturation/contrast           | `references/color.md`               |
| Light direction, shading forms, cast shadows, depth/atmosphere, perspective        | `references/shading-perspective.md` |
| Animation frames, idle/walk/jump/attack, timing, squash and stretch                | `references/animation.md`           |
| Top-down tiles, seamless textures, transition/blend tiles, dithering, water, rocks | `references/tiles-topdown.md`       |
| Side-view/platformer tiles, parallax layers, platforms, buildings                  | `references/tiles-sideview.md`      |
| Critiquing any sprite or tile, or checking your own output                         | `references/mistakes-review.md`     |

## Core rules

These apply to almost every task, so they are here rather than only in the references.

- Lines are 1 px wide, and diagonal steps touch only at corners. Steps along a line are equal or alternate in a regular rhythm; along a curve they lengthen or shorten steadily. No lone pixels sticking out of a curve.
- Use a small palette built from ramps (a few shades per material). Every extra colour costs time in every later sprite and frame, so a big palette is a project-wide commitment.
- Pick one light direction and shade by which way each surface faces it. Never shade "dark rim, light centre" (pillow shading).
- Don't let shading bands step on the same rows or columns as the outline or each other (banding); stagger them.
- Anti-alias sparingly. A fringe of in-between colours everywhere makes it look like a blurry downscale.
- Moderate contrast and saturation; reserve the strongest saturation and contrast for what the player must notice (the gameplay layer, the hero).
- Distant layers get lighter, closer to the sky colour, lower in contrast and detail.
- Animate with the smallest change that reads (often 1 px), keep outlines continuous between frames, and use anticipation and follow-through.
- Tiles must repeat without visible seams or grid-aligned patterns; break repetition with variation tiles.
- Keep complexity matched to the project's scope: the first finished sprite sets the bar every other asset must meet.

## Reviewing art

1. Look at the image at native size and enlarged with nearest-neighbour scaling (never smooth scaling, which hides the pixel grid). If you can run Python with Pillow, make an 8–10x preview and read it; list the distinct colours to spot near-duplicates.
2. Run the checklist in `references/mistakes-review.md`, plus any topic file that applies.
3. Report the problems in order of visual impact. For each: what is wrong, where (coordinates or region), why it hurts, and the concrete fix. Mention what already works so the user doesn't change it.
4. Keep rules and taste apart. Faults the references name (pillow shading, banding, stray pixels, near-duplicate colours) are fixes; a different silhouette, palette size, hue-shifted ramps or outline colour are design options, so offer them as such rather than as requirements.
5. If you redraw the sprite, hold it to the same standard as generated art (below), and say what you changed beyond the fixes, especially anything gameplay depends on: canvas size, the anchor or ground-contact row, the silhouette.

## Generating art in code

Models tend to produce noisy, symmetric or blurry "pixel art" when they place pixels freehand. Working from explicit structure avoids most of that:

1. Fix the constraints first: canvas/tile size, palette (named ramps with index numbers), light direction, outline or no outline.
2. Draw with palette indices on a grid (a string map or 2D array per frame or tile), not with free RGB values, so every pixel belongs to a ramp.
3. Place texture and accent pixels deliberately and irregularly; avoid both pure random noise and grid-regular patterns. Vary the marks: small connected clusters of different shapes and sizes read as a material, while a field of isolated dots and identical 2-px marks reads as sprinkles. Keep bright pixels sparse in ground tiles so the background doesn't compete with characters. For dither, use the patterns in the tiles references.
4. Shade around the form. Light/shadow boundaries should curve with the volume; a straight diagonal split or evenly spaced parallel bands reads as stripes painted on a flat shape, not a lit surface.
5. For tiles, deliver a small variation set rather than a single tile: the base plus 2–3 variants on the same palette (accents moved, a prop or two), and a suggested mix ratio. If you recommend flipped or rotated variants, save them as tiles too rather than only describing them. When the user asks for a specific number of tiles, make that number and suggest the rest. Be honest about limits: a few small tiles reduce repetition but don't remove it on a large map.
6. Render the result and an enlarged nearest-neighbour preview, look at it, and run the review checklist on your own output. Fix and re-render before handing it over.
   - Judge sprites at native 1x as well as enlarged; the 1x read is what players see.
   - For tiles, render a field of at least 4x4 mixing every variant, including the same tile next to itself on both axes. Matching edge pixels only prevents seams; it does not prevent repetition. Look for any distinctive feature (a flower group, a bright blade, a dark clump) that recurs in the same arrangement: a recurring motif makes the grid visible. Break it up or tone it down.
7. Before handing over, check the claims in your message against the files: tile and frame counts, how many variant cells the preview uses, colour counts.
8. Tell the user which rules shaped the result, and what you'd change at a larger size or palette.

## Art direction and specs

When asked to plan art (animation lists, tileset contents, palette budgets, style guides), give concrete numbers from the references: tile and canvas sizes, colours per ramp, frame counts and timings. Say which are the book's guidance and which are your choices for this project.

A plan is only useful if the user knows what to do with it, so end with a short "How to use this" section:

- What to produce first (e.g. the idle and run, before the rest of the set).
- The two realistic routes: draw it yourself or hand it to an artist, using the spec as the brief; or have Claude generate the frames/tiles with the workflow above (palette-index grids plus a render script), then review and hand-polish them.
- Where the user's engine takes over (frame data format, timings, anchors).

When the spec describes frames, prefer machine-readable frame data that the user's engine or a later Claude run can consume directly, over prose alone. Default to the simplest format the engine already supports: usually baked frames (one full palette-index grid per frame). Part-based layering or a runtime compositor is an option to mention, not the default. It is a big assumption about someone else's engine, and moving parts by offsets can still open gaps, overlaps and silhouette pops, so each composed frame still needs checking.

Run a consistency pass before handing over a spec, because precise-looking numbers that disagree make the whole spec untrustworthy:

- Totals add up (frame counts per animation vs any stated total).
- One coordinate convention is used throughout (origin, which way +y points, whether patch coordinates are relative to the rest pose or final), and stated extents match the pixels described.
- Frame counts match the poses described (e.g. a 6-frame run describes 6 poses).
- State transitions make sense (e.g. death doesn't loop back to idle unless respawn is intended).
- Present choices such as tick rates, layer counts and timings as choices, and keep each rule stated once.
