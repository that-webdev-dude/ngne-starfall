# Shading & perspective

Use when: shading a sprite or object, placing cast shadows, checking light consistency, layering backgrounds for depth, or building a scene in perspective.

## Do

- Fix the light source first; every value and shadow follows from it. Light can come from any side, including low.
- Brightest plane = the one facing the light most directly; darkest = the one turned furthest away.
- Curved forms: concentric value bands centred toward the light, a small near-white highlight on the lit side, and a slightly lighter rim on the shadow side where light bounces up from the ground.
- Vary highlights by material: glossy surfaces get sharp highlights and may reflect; soft ones get little.
- Cast shadows: darkest at the contact point, lighter and softer-edged further away. Approximate them on unusual surfaces.
- Check light consistency across the whole scene, not just per object.
- Combine depth cues: overlap (near covers far), size (far = smaller), atmospheric perspective, linear perspective.
- Make each farther layer lighter, bluer, lower in contrast and saturation, and less detailed; keep the gameplay layer most saturated and contrasted so it stands out from busy backgrounds.
- When objects differ greatly in size, apply atmospheric perspective first so a huge far object reads as distant.
- Learn correct lighting, then simplify or drop parts on purpose (file size, time, animation complexity, consistency).

## Don't

- Don't let any shadow contradict the light direction; viewers sense it even if they can't name it.
- Don't flip a shaded sprite horizontally without checking it; flipping reverses its light direction.
- Don't default to a centred vanishing point; it looks formulaic. Anywhere on the horizon works.
- Don't reach for multiple vanishing points in typical game pixel art; one is usually enough.

## Techniques

### Plane shading (box)

- Light upper-left: top lightest, left face mid, right face darkest.
- Light low from the left: left face lightest, top mid, right darkest.
- Light overhead: top near-white, both sides dark.

```
   light (upper-left)
      \
       \  +-------+
        > | TOP   |  lightest
          +-------+--+
          | LEFT  |R |  LEFT = mid, R = darkest
          +-------+--+
```

### Projecting a cast shadow

1. Treat light as straight rays from the source.
2. Box: ray through each silhouette top corner to the ground; join those points to each other and to the base corners. The enclosed polygon is the shadow.
3. Sphere: rays tangent to its left and right edges bound an elliptical ground shadow.
4. Shadow falls opposite the light (light upper-left → shadow right/behind).
5. Tint ground shadows as a darker shade of the ground colour, not neutral grey.

```
     ray   ray
       \     \
        +-----+
        | box |\
        +-----+ \___    <- shadow polygon: base corners
         \_________\       + projected top corners
```

### Diagnosing a wrong shadow

- Across a group of objects, compare each one's dark-face side and cast-shadow direction; the odd one out is the error (often a flipped sprite).

### Atmospheric depth layers

1. Farthest layer: flat, hazy silhouettes close to the sky colour, no interior detail.
2. Each nearer layer: add detail, contrast, warmth and saturation.
3. Gameplay layer: strong outlines, saturated colour, highest contrast.

### One-point linear perspective

1. Draw the horizon (ground meets sky). Low = mostly sky, high = mostly ground; each changes the feel.
2. Place one vanishing point (VP) on it and fan lines out from it.
3. Same-height objects between the same pair of lines share scale and shrink toward the VP.
4. Front faces are flat rectangles; side faces follow lines to the VP. For mixed sizes, connect each object's corners nearest the VP to the VP.
5. Below the horizon an object's top shows; above it, its underside. Objects offset sideways below it show a side and the top.
6. Remove guides; add cast shadows from one consistent light.

```
  sky        [underside visible]
  ---------------- VP ---------------- horizon
            /       |       \
   [top visible]          [top visible]
  ground
```

### Shading a character sprite

1. Start from flat base colours; pick a light (frontal from above gives near-symmetric shading `[inferred]`).
2. Big forms shadow lower ones: head onto the top of the torso, hair onto skin under the hairline.
3. Shadow under the face, eyes and nose, and the undersides of arms and hands; add a few dark edge pixels and folds on clothing for roundness.
4. Lighten upper surfaces (thighs) so lower ones (shins) read as in shadow.
5. Reuse the shadow value for seams, pockets and details to stretch a small palette.
6. Shadow hair and shoes.
7. Highlights last, on protruding light-facing planes: side of the nose, cheekbones, backs of hands, lit cloth, shoe tops, top of the hair.

## Numbers & specs

- A material can read with 2 values (base + shadow); add a highlight for 3 `[inferred]`.
- 1 vanishing point covers most game pixel-art needs.
