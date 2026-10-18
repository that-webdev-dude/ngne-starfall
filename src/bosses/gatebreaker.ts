import { lerp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { BOSS } from "../config/boss-geometry.ts";
import { COMBAT } from "../config/encounters.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { spawnEnemy } from "../entities/combat.ts";
import { combatArt } from "../services/combat-assets.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import { drawDefeat, drawGap, forgetDestroyed, locate, type BossDefinition } from "./boss.ts";

/** Stage 1 carrier: two destructible turrets (pattern 0 left, 1 right) fire aimed fans; the hull fires curtains and rings. */
export const gatebreaker: BossDefinition = {
  name: "GATEBREAKER", hp: COMBAT.bossHp, clearBonus: 3000,
  create({ scene, run, hostiles: { emit } }) {
    const enemies = scene.world.query(Pose, Enemy), sockets = [BOSS.leftTurret, BOSS.rightTurret];
    const turrets = [enemySpec(Kind.GatebreakerTurret).hp, enemySpec(Kind.GatebreakerTurret).hp];
    return {
      spawn() {
        spawnEnemy(scene.world, run, Kind.Gatebreaker, 240, -35, { hp: gatebreaker.hp });
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, 202, -20, { pattern: 0 });
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, 278, -20, { pattern: 1 });
      },
      update(dt) {
        const { boss, parts } = locate(enemies, Kind.Gatebreaker, Kind.GatebreakerTurret);
        let bossX = 240, bossY = -35;
        if (boss) {
          const { p, e, row } = boss, age = e.age[row];
          forgetDestroyed(turrets, parts);
          p.x[row] = 240 + Math.sin(Math.max(0, age - 2.5) * 0.55) * 75;
          p.y[row] = Math.min(67, p.y[row] + dt * 42); bossX = p.x[row]; bossY = p.y[row];
          run.bossHealth = Math.max(0, e.hp[row]);
          const time = Math.max(0, age - 2.5), cycle = Math.floor(e.fireIndex[row] / 8), index = e.fireIndex[row] % 8;
          const times = [0.9, 2.1, 3.3, 4.6, 5.7, 6.8, 8.5, 10];
          const next = cycle * 12 + times[index];
          if (time > next - 0.55 && !e.cue[row]) { e.cue[row] = index < 3 ? 1 : index < 6 ? 2 : 3; e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]); }
          if (time >= next) {
            const enraged = e.hp[row] < COMBAT.bossHp / 2;
            if (index < 3) {
              const side = index % 2 === 0 ? 0 : 1;
              if (turrets[side] > 0) emit(p.x[row] + sockets[side][0], p.y[row] + 21, fan(e.targetAngle[row], enraged ? 9 : 7, (enraged ? 96 : 72) * Math.PI / 180, 58), 0xffa07e);
            } else if (index < 6) {
              const gap = cycle % 2 ? 360 : 120;
              for (const x of curtainPositions(gap, 64, index % 2 === 0 ? 12 : 0)) emit(x, 36, [{ vx: 0, vy: 52 }], 0xff797f);
            } else emit(p.x[row], p.y[row] + 10, ring(enraged ? 18 : 14, (index === 7 ? Math.PI / (enraged ? 18 : 14) : 0) + cycle * 0.13, enraged ? 50 : 44), 0xf2a5ec);
            e.fireIndex[row]++; e.cue[row] = 0;
          }
        }
        enemies.eachChunk((chunk) => { const p = chunk.views.pose, e = chunk.views.enemy; for (let row = 0; row < chunk.count; row++) if (e.kind[row] === Kind.GatebreakerTurret && e.active[row]) {
          const socket = sockets[e.pattern[row]];
          p.x[row] = bossX + socket[0]; p.y[row] = bossY + socket[1];
          turrets[e.pattern[row]] = Math.max(0, e.hp[row]);
        } });
      },
      render(frame, alpha) {
        drawDefeat(frame, run, combatArt.gatebreaker);
        const { boss, parts } = locate(enemies, Kind.Gatebreaker, Kind.GatebreakerTurret);
        if (!boss) return;
        const { p, e, row } = boss, x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha);
        if (e.cue[row] === 2) drawGap(frame, Math.floor(e.fireIndex[row] / 8) % 2 ? 360 : 120, 64, 0x67e3be, 0xa4e8bd);
        sockets.forEach((socket, side) => {
          if (parts & 1 << side) return;
          frame.rect(x + socket[0], y + socket[1] + 8, 20, 25, 0x0a1320, 0.84, 3);
          frame.rect(x + socket[0], y + socket[1], 9, 3, 0xa64738, 1, 4);
        });
      },
    };
  },
};
