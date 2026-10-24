import type { WorldAccess } from "@ngne/core";
import { Beam, Bullet, Enemy, Particle, Pickup, Pose } from "../components/combat.ts";
import type { RunState } from "../world/session.ts";
import { enemySpec, type Kind } from "../config/enemies.ts";
import { COMBAT } from "../config/encounters.ts";
import { REV01_GAMEPLAY } from "../config/rev01-gameplay.ts";
import { fromLegacy } from "../config/view.ts";
export function spawnEnemy(world: WorldAccess, run: RunState, kind: Kind, x: number, y: number, options: { vx?: number; pattern?: number; hp?: number; cooldown?: number } = {}) {
  const spec = enemySpec(kind), hp = options.hp ?? spec.hp;
  return world.spawn(Pose.of({ x, y, px: x, py: y }), Enemy.of({ kind, hp, maxHp: hp, originX: x,
    cooldown: options.cooldown ?? spec.cooldown, vx: options.vx ?? 0,
    pattern: options.pattern ?? 0, radius: spec.radius, id: run.nextId++ }));
}
/** Collision radius: spec hostile bullet radius for team 1, the legacy 2 px bolt at 4/3 for the player. */
export function spawnBullet(world: WorldAccess, x: number, y: number, vx: number, vy: number, team = 1, color = 0xff717e, size = fromLegacy(3)) {
  return world.spawn(Pose.of({ x, y, px: x, py: y }), Bullet.of({ vx, vy, team, radius: team ? COMBAT.hostileBulletRadius : COMBAT.playerBulletRadius, color, size }));
}
export function spawnParticle(world: WorldAccess, x: number, y: number, vx: number, vy: number, life: number, color: number, size = 2, kind = 0) {
  return world.spawn(Pose.of({ x, y, px: x, py: y }), Particle.of({ vx, vy, life, color, size, kind }));
}
export function spawnRepair(world: WorldAccess, x: number, y: number) { return world.spawn(Pose.of({ x, y, px: x, py: y }), Pickup.of()); }
/** Lanes start at the legacy y 38 at 4/3; the default width is the Engine's spec lane (15 at 640). */
export function spawnBeam(world: WorldAccess, x: number, width: number = REV01_GAMEPLAY.beamWidth.starfallEngine, charge = 0.9, duration = 0.65) {
  const y = fromLegacy(38);
  return world.spawn(Pose.of({ x, px: x, y, py: y }), Beam.of({ width, charge, duration }));
}
