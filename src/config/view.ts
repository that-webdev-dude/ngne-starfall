export const VIEW = { width: 480, height: 270 } as const;
export const FLIGHT = {
  speed: 175,
  acceleration: 900, // px/s²: rest -> top speed in 150 ms (9 frames)
  deceleration: 900, // px/s²: release glide, top speed -> rest in 150 ms, ~10 px drift
  turn: 4500, // px/s²: input opposes current velocity
  bankResponse: 20,
  stickDeadzone: 0.15, // matches the @ngne/core gamepad cutoff
} as const;
