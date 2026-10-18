import { Beam, Bullet, Enemy, Pose } from "../components/combat.ts";
import { COMBAT } from "../config/encounters.ts";
import { spawnBullet } from "../entities/combat.ts";
import type { Shot } from "../world/patterns.ts";
import type { CombatContext } from "./combat-context.ts";

export interface HostileFire {
  /** True while a fresh Nova cancels hostile fire, including shots that would be queued later this tick. */
  readonly suppressed: boolean;
  /** Spawns hostile bullets up to COMBAT.bulletCap and cues the enemy-shot sound, unless suppressed. */
  emit(x: number, y: number, shots: readonly Shot[], color: number): void;
  /** Despawns hostile bullets and beams; optionally every enemy and the player's bullets too. */
  clear(options?: { enemies?: boolean; playerBullets?: boolean; onHostileBullet?(x: number, y: number): void }): void;
}

export function createHostileFire({ scene, run, sound }: Pick<CombatContext, "scene" | "run" | "sound">): HostileFire {
  const bullets = scene.world.query(Pose, Bullet), enemies = scene.world.query(Enemy), beams = scene.world.query(Beam);
  // Spawns publish at tick commit, so the query cannot see this tick's bullets yet.
  let spawnedThisTick = 0;
  scene.system(() => { spawnedThisTick = 0; });
  const suppressed = () => run.novaRing < 0.1;
  const liveHostiles = () => {
    let live = 0;
    bullets.eachChunk((chunk) => { const b = chunk.views.bullet; for (let row = 0; row < chunk.count; row++) if (b.team[row] && b.active[row]) live++; });
    return live;
  };
  return {
    get suppressed() { return suppressed(); },
    emit(x, y, shots, color) {
      if (suppressed()) return;
      const live = liveHostiles();
      for (const shot of shots) {
        if (live + spawnedThisTick >= COMBAT.bulletCap) break;
        spawnBullet(scene.world, x, y, shot.vx, shot.vy, 1, color); spawnedThisTick++;
      }
      sound.enemyShot();
    },
    clear({ enemies: withEnemies = false, playerBullets = false, onHostileBullet } = {}) {
      if (withEnemies) enemies.eachChunk((chunk) => {
        const e = chunk.views.enemy;
        for (let row = 0; row < chunk.count; row++) if (e.active[row]) { e.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
      });
      bullets.eachChunk((chunk) => {
        const p = chunk.views.pose, b = chunk.views.bullet;
        for (let row = 0; row < chunk.count; row++) if (b.active[row] && (b.team[row] || playerBullets)) {
          b.active[row] = 0; scene.world.despawn(chunk.entityAt(row));
          if (b.team[row]) onHostileBullet?.(p.x[row], p.y[row]);
        }
      });
      beams.eachChunk((chunk) => {
        const beam = chunk.views.beam;
        for (let row = 0; row < chunk.count; row++) if (beam.active[row]) { beam.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
      });
    },
  };
}
