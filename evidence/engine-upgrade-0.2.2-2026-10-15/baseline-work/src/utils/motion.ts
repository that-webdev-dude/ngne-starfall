export function approach(value: number, target: number, response: number, dt: number): number {
  return target + (value - target) * Math.exp(-response * dt);
}
