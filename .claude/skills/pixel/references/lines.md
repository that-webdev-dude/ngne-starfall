# Lines

Use when: drawing or generating outlines, diagonals, curves, circles and anti-aliased edges; reviewing a sprite's linework; blocking out a line-art character.

## Do

- Keep lines 1 px wide by default (a guideline, not a hard rule).
- Connect diagonal steps corner-to-corner only.
- Build each diagonal from steps of one equal length; if no single length fits the angle, alternate two lengths evenly (e.g. 3,2,3,2).
- On curves, make the step lengths grow or shrink steadily along the arc; get as close to this as the shape allows.
- Round a corner with a 1-px diagonal step between the horizontal and vertical runs.
- Reuse work: copy, mirror or rotate, then paste, and fix the joints afterwards.
- Anti-alias lightly; check the result zoomed out.
- Block in the whole figure before detailing any part; keep the first shapes simple.
- A rough first pass is fine; clean it down to 1-px lines afterwards.

## Don't

- Don't let neighbouring steps overlap into a 2-px-thick stair-step line.
- Don't mix step lengths at random in a straight line, or drop a stray 2-px run into a 1:1 diagonal.
- Don't leave a "lone wolf": a single pixel bulging out of a curve.
- Don't accept circle/curve-tool output as-is; its steps are uneven, so hand-correct it.
- Don't over-anti-alias; it turns into blur.

```
Diagonal steps         BAD: runs 2,2,3,2,3      GOOD: all 2
                       .........###             ..........##
                       .......##...             ........##..
                       ....###.....             ......##....
                       ..##........             ....##......
                       ##..........             ..##........
                                                ##..........
Two-length rhythm 3,2  Width                    BAD thick   GOOD 1 px
..........###                                   ......###   ......##
........##...                                   ....####.   ....##..
.....###.....                                   ..####...   ..##....
...##........                                   ####.....   ##......
###..........
Curve edge   BAD lone wolf   GOOD extend the run
             .#..            .#..
             .#..            ..#.
             ..#             ..#.
             .#..            ..#.
             .#..            .#..
```

## Techniques

Curves

1. Draw the curve freehand or with a circle tool.
2. Make the step lengths change monotonically: long runs where the curve is flattest, short runs on the diagonal shoulders [inferred].
3. Replace any lone protruding pixel by extending the run next to it.
4. Build symmetric shapes from one corrected half, mirrored.

Anti-aliasing a line

1. Mix a midtone halfway between the line colour and the background; use it on some or all of the steps.
2. Optionally add a second tone (midtone↔background) and spread it over more than one pixel along a step.
3. Apply it to inner edges (e.g. holes and sockets) as well as the silhouette.
4. Zoom out and remove any that blurs.

Line-art character blockout

1. Head: draw a circle, then hand-fix its visible lower half; you can skip parts that hair will cover.
2. Torso: a plain rectangle. Draw one leg and one arm, then mirror each to the other side.
3. Where parts join (arm to torso, shoulders, crotch), erase the overlapping outline so they read as connected.
4. Suggest hands, sleeves and similar details with just a few pixels.
5. Hair: draw the hairline over the forehead first, then the outer mass, then the ear nubs; thin any 2-px clumps to 1 px.

## Numbers & specs

- Line width: 1 px. Anti-aliasing: 1 midtone, plus an optional 2nd.
- Front-view face, head level:
  - Eyes: on the head's horizontal midline, as short 1-px-tall dashes.
  - Bottom of nose: halfway between eyes and chin.
  - Mouth: halfway between nose bottom and chin.
  - Brows: about 2 px above the eyes.
  - Ears: from about eye/brow level down to nose level.
- Head tilted up: features move up within the head; tilted down: they move down.
