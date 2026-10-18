import { clamp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { COMBAT } from "../config/encounters.ts";
import { Kind } from "../config/enemies.ts";
import { spawnBeam, spawnEnemy } from "../entities/combat.ts";
import { ring } from "../world/patterns.ts";
import type { CombatContext } from "./combat-context.ts";

export function installAdvancedEnemies({ scene, run, sound, hostiles }: CombatContext): void {
  const enemies = scene.world.query(Pose, Enemy), { emit } = hostiles;
  scene.system(({ dt }) => {
    if (run.phase === "clear" || run.phase === "dead") return;
    enemies.eachChunk((chunk) => {
      const p = chunk.views.pose, e = chunk.views.enemy;
      for (let row = 0; row < chunk.count; row++) {
        if (!e.active[row] || e.hp[row] <= 0) continue;
        const kind = e.kind[row], age = e.age[row];
        if (kind === Kind.Minelayer || kind === Kind.Warden) {
          p.y[row] += dt * (p.y[row] < 65 ? 30 : age > 12 ? 45 : 2);
          p.x[row] = e.originX[row] + Math.sin(age * 0.65) * (kind === Kind.Minelayer ? 20 : 9);
          e.cooldown[row] -= dt;
          if (e.cooldown[row] < 0.8 && !e.cue[row]) { e.cue[row] = 1; e.targetAngle[row] = clamp(run.x, 24, 456); }
          if (e.cooldown[row] <= 0) {
            if (kind === Kind.Minelayer && !hostiles.suppressed && enemies.size < COMBAT.enemyCap) spawnEnemy(scene.world, run, Kind.Mine, p.x[row], p.y[row] + 18, { cooldown: 1.8 });
            else if (kind === Kind.Warden && !hostiles.suppressed) { spawnBeam(scene.world, e.targetAngle[row], 10, 0.8, 0.55); sound.enemyShot(); }
            e.cooldown[row] = kind === Kind.Minelayer ? 3 : 3.3; e.cue[row] = 0;
          }
          if (p.y[row] > 295) { e.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
        }
        if (kind === Kind.Mine) {
          p.y[row] += dt * 13; e.cooldown[row] -= dt;
          if (e.cooldown[row] < 0.8) e.cue[row] = 1;
          if (e.cooldown[row] <= 0) { emit(p.x[row], p.y[row], ring(8, age * 0.15, 48), 0xffbc74); e.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
        }
      }
    });
  });
}
