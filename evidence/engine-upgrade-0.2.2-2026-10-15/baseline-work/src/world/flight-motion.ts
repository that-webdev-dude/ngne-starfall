import { FLIGHT } from "../config/preview.ts";

/** Exponential response is stable under changing simulation step sizes. */
export function flightVelocity(velocity: number, input: number, dt: number): number {
  const response = input === 0 ? FLIGHT.friction : FLIGHT.acceleration;
  const target = input * FLIGHT.speed;
  const next = target + (velocity - target) * Math.exp(-response * dt);
  return input === 0 && Math.abs(next) < FLIGHT.settleSpeed ? 0 : next;
}
