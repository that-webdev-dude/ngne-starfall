import { VIEW, fromLegacy } from "../config/view.ts";

export interface Shot { vx: number; vy: number }
export function fan(angle: number, count: number, spread: number, speed: number): Shot[] {
  return Array.from({ length: count }, (_, index) => {
    const a = angle + (count === 1 ? 0 : (index / (count - 1) - 0.5) * spread);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  });
}
export function ring(count: number, rotation: number, speed: number): Shot[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = rotation + index / count * Math.PI * 2;
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  });
}
/** Swept point versus circle avoids fast friendly bolts tunneling across small enemies. */
export function segmentCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, radius: number): boolean {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / (dx * dx + dy * dy || 1)));
  return (ax + dx * t - cx) ** 2 + (ay + dy * t - cy) ** 2 <= radius * radius;
}
/** Curtain columns across the view; gapCenter, width and offset are world units (the legacy 12/24 grid at 4/3). */
export function curtainPositions(gapCenter: number, width = fromLegacy(64), offset = 0): number[] {
  const result: number[] = [];
  for (let x = fromLegacy(12) + offset; x < VIEW.width; x += fromLegacy(24)) if (Math.abs(x - gapCenter) >= width / 2) result.push(x);
  return result;
}
