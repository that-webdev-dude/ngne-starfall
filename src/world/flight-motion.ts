import { FLIGHT } from "../config/view.ts";

/** Constant-rate approach: reaches top speed or rest in a fixed time and distance. */
export function flightVelocity(velocity: number, input: number, dt: number): number {
  const target = input * FLIGHT.speed;
  const rate = target * velocity < 0 ? FLIGHT.turn
    : Math.abs(target) < Math.abs(velocity) ? FLIGHT.deceleration
    : FLIGHT.acceleration;
  const step = rate * dt;
  return Math.abs(target - velocity) <= step ? target : velocity + Math.sign(target - velocity) * step;
}

/** Rescales a deadzoned stick axis so output ramps from 0 at the cutoff instead of jumping. */
export function stickAxis(value: number): number {
  const magnitude = Math.abs(value);
  return magnitude <= FLIGHT.stickDeadzone ? 0 : Math.sign(value) * Math.min(1, (magnitude - FLIGHT.stickDeadzone) / (1 - FLIGHT.stickDeadzone));
}
