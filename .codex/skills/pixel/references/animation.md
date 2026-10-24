# Animation

Use when: reviewing sprite animations, generating animation frames in code, or writing animation specs/lists for a game.

## Do

- Build each frame by duplicating the previous one and changing only what moves; use onion skinning (adjacent frames shown semi-transparent) to judge motion.
- Animate sprites in place; game code moves the sprite across the screen.
- Watch for pixel flashing (pixels popping in/out instead of shifting); judge it in playback, it is nearly invisible in stills. Sometimes unavoidable at very low resolution.
- Add anticipation before significant actions: a wind-up opposite to the action, involving the whole body, even for small actions.
- Add follow-through: motion overshoots past the end of the action, then settles to rest.
- Add secondary animation: parts/objects reacting to and lagging behind the main motion (hat, hair, clothing, swinging arms, smoke); eyes track a thrown object.
- Push squash and stretch past physical plausibility (odd as stills, alive in motion); use it on rigid objects and on-screen text too.
- Put the most-squashed frame directly before the most-stretched one for explosive actions (blasts, jumps).
- Decide per part whether it squashes; a loose part exempt from squash can hover and drift back as secondary motion while still stretching.
- Simplify a sprite before animating a full set: strip detail, max 2 shades per hue.
- Put one arm and one leg fully in shadow so left/right limbs stay readable, especially in side view.
- For detailed/textured sprites, split into rigid chunks (e.g. head / torso+arms / legs) and move chunks whole instead of redrawing.
- Keep idle animations subtle; a 1 px shift of one chunk is enough.
- Let game animations snap between states (players expect instant response); loop frequent actions, drop non-essential transitions.

## Don't

- Don't make pixels appear/disappear between frames when you can move them.
- Don't settle for 2-frame "rest / action" animations when anticipation and follow-through frames would add character.
- Don't move a fast object a large distance in one frame with nothing in between; the eye loses it.
- Don't keep heavy texture on sprites needing many animations; every detail must move in proportion and every textured pixel risks flashing.
- Don't redraw textured chunks per frame; it alters the texture and breaks continuity.
- Don't plan transitions between every pair of states; the count grows roughly with n² [inferred] (13 animations -> ~144 transitions).

## Techniques

### Fixing a pixel flash (head turn)

- Problem: a 1 px gap (e.g. jaw meets shoulder) gets filled by a dark pixel in the next frame -> pops.
- Worse: the head outline also breaks into light and dark pixels.
- Fix: keep outline and junction identical across frames; convey the turn by shifting interior features (eyes, nose, mouth shading) [inferred].

### Fast motion: trail and smear

- Object jumps far between frames -> in the arrival frame, draw ghost copies along the path, thinning toward the origin and dense near the object:

```
frame 1           frame 2
 ●                 o . . .__o.:oo●
```

- Smear (one frame of a fast jerk): repeat several lines of the trailing profile along the path; draw outline copies of loose parts tracing their path; stretch features (eyes) from old to new position.

### Anticipation -> action -> follow-through

1. Rest -> wind-up away from the action direction.
2. Action: snap toward it (optional smear frame).
3. Follow-through: body overshoots then settles; thrown objects continue their arc; eyes follow.

### Squash-and-stretch jump

1. Squash (anticipation) ~2x wide, ~1/2 tall; optional extra-flat frame; recover to rest.
2. Stretch upward ~2x tall, ~1/2 wide; flip attached parts (hat brim) up; optional extra-tall frame.
3. Loose parts skip the squash, hover, then drift back down.

### Squash and stretch on rigid objects (e.g. cannon)

1. Anticipation (burning fuse) -> squash: compress horizontally, extend vertically (choose which sub-parts).
2. Max stretch right after max squash -> follow-through: smoke thins, object recoils slightly, rest.

### Minimal idle: breathing

- Head and legs fixed; torso + both arms shift up 1 px as one chunk; redraw only a few hem pixels (creases); loop 2 frames at ~500 ms.

```
frame 1    frame 2
  (o)        (o)      head: static
 /[#]\      /[#]\     torso+arms: +1 px up
 /[ ]\       [=]      hem: creases redrawn
  | |        | |      legs: static
```

### Standard game animation set

- Core: walk, run, idle (no input), attack(s), death, jump. Optional: landing, emote, crouch/crawl, take damage, climb, draw weapon, balance flail.

## Numbers & specs

| Item                        | Value                                                                        |
| --------------------------- | ---------------------------------------------------------------------------- |
| Frame rate                  | 24 fps traditional (lower risks choppiness); 30 fps common in games; some 60 |
| Walk cycle                  | 8 frames typical; 16 very smooth; 2-3 barely passable                        |
| Squash / stretch            | ~2x width & ~0.5x height / ~2x height & ~0.5x width                          |
| Minimum move                | 1 px; on a 3 px part that is 1/3 its size, so subtlety is hard               |
| Anticipation/follow-through | often only 1-2 px of movement                                                |
