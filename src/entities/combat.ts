import type { WorldAccess } from "@ngne/core";
import { Beam, Bullet, Enemy, Particle, Pickup, Pose } from "../components/combat.ts";
import type { RunState } from "../world/session.ts";
import { enemySpec, type Kind } from "../config/enemies.ts";
export function spawnEnemy(world: WorldAccess, run: RunState, kind: Kind, x: number, y: number, options: { vx?: number; pattern?: number; hp?: number; cooldown?: number } = {}) {
  const spec = enemySpec(kind), hp = options.hp ?? spec.hp;
  return world.spawn(Pose.of({ x, y, px: x, py: y }), Enemy.of({ kind, hp, maxHp: hp, originX: x,
    cooldown: options.cooldown ?? spec.cooldown, vx: options.vx ?? 0,
    pattern: options.pattern ?? 0, radius: spec.radius, id: run.nextId++ }));
}
export function spawnBullet(world: WorldAccess, x: number, y: number, vx: number, vy: number, team = 1, color = 0xff717e, size = 3) {
  return world.spawn(Pose.of({ x, y, px: x, py: y }), Bullet.of({ vx, vy, team, radius: team ? 2.5 : 2, color, size }));
}
export function spawnParticle(world: WorldAccess, x: number, y: number, vx: number, vy: number, life: number, color: number, size = 2, kind = 0) {
  return world.spawn(Pose.of({ x, y, px: x, py: y }), Particle.of({ vx, vy, life, color, size, kind }));
}
export function spawnRepair(world: WorldAccess, x: number, y: number) { return world.spawn(Pose.of({ x, y, px: x, py: y }), Pickup.of()); }
export function spawnBeam(world: WorldAccess, x: number, width = 12, charge = 0.9, duration = 0.65) { return world.spawn(Pose.of({ x, px: x, y: 38, py: 38 }), Beam.of({ width, charge, duration })); }
