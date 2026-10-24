/** Logical view (art rev01 spec `viewport.logical`): every texel is one logical pixel. */
export const VIEW = { width: 640, height: 360 } as const;
/** The 480x270 view every pre-rev01 world constant was authored in. */
export const LEGACY_VIEW = { width: 480, height: 270 } as const;
/** spec `viewport.worldScaleFromPrevious`: 640/480 = 360/270. */
export const WORLD_SCALE = 4 / 3;
/**
 * Migrates one 480x270-era world distance, position, speed or acceleration to the 640x360 world.
 * Applied exactly once per legacy value; `v * 4 / 3` keeps integer results exact (480 -> 640, 18 -> 24).
 * Never applied to times, rates, counts, HP, damage, scores, angles or normalized values.
 */
export const fromLegacy = (value: number): number => value * 4 / 3;

export const FLIGHT = {
  speed: fromLegacy(175),
  // Baseline trace (.test-output/integration/T1/motion-baseline-trace.log): rest -> top speed in 12 frames (200 ms).
  acceleration: fromLegacy(900),
  // Release glide: top speed -> rest in 12 frames, 17.04 legacy px (22.72 px at 640x360).
  deceleration: fromLegacy(900),
  turn: fromLegacy(4500), // input opposes current velocity
  bankResponse: 20,
  stickDeadzone: 0.15, // matches the @ngne/core gamepad cutoff
} as const;
/** Player clamp, spec `sprites.nova.radii.derivation` / `presentation.bands`: the 18..462 x 43..239 clamp at 4/3, y rounded to 57..319 so the hull stays above the bottom band. */
export const PLAYER_BOUNDS = { minX: 24, maxX: 616, minY: 57, maxY: 319 } as const;
