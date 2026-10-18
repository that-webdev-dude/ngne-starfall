import { clamp, lerp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { spawnBeam, spawnEnemy } from "../entities/combat.ts";
import { campaignFrame, engineSockets } from "../services/campaign-assets.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import { drawDefeat, drawGap, forgetDestroyed, locate, type BossDefinition } from "./boss.ts";

/** Stage 3 finale: three health phases add charged lanes; two destructible emitters (pattern 0 left, 1 right) fire fans and thicken rings. */
export const starfallEngine: BossDefinition = {
  name: "STARFALL ENGINE", hp: 600, clearBonus: 10000,
  create({ scene, run, sound, hostiles }) {
    const enemies = scene.world.query(Pose, Enemy), { emit } = hostiles;
    const emitters = [enemySpec(Kind.EngineEmitter).hp, enemySpec(Kind.EngineEmitter).hp];
    const socket = (side: number) => side ? engineSockets().rightEmitter : engineSockets().leftEmitter;
    return {
      spawn() {
        spawnEnemy(scene.world, run, Kind.StarfallEngine, 240, -40, { hp: starfallEngine.hp });
        for (let i = 0; i < emitters.length; i++) spawnEnemy(scene.world, run, Kind.EngineEmitter, 240, -40, { hp: 55, pattern: i });
      },
      update(dt) {
        const { boss, parts } = locate(enemies, Kind.StarfallEngine, Kind.EngineEmitter);
        let bossX = 240, bossY = -40;
        if (boss) {
          const { p, e, row } = boss, time = Math.max(0, e.age[row] - 2.7);
          forgetDestroyed(emitters, parts);
          p.x[row] = 240 + Math.sin(time * 0.4) * 65;
          p.y[row] = Math.min(65, p.y[row] + dt * 40);
          bossX = p.x[row]; bossY = p.y[row]; run.bossHealth = Math.max(0, e.hp[row]);
          const hp = starfallEngine.hp, phase = e.hp[row] < hp / 3 ? 3 : e.hp[row] < hp * 2 / 3 ? 2 : 1;
          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / REACTOR SURGE`; run.bannerTime = 1.4; sound.boss(); }
          const cycle = Math.floor(e.fireIndex[row] / 8), index = e.fireIndex[row] % 8;
          const times = [0.8, 1.8, 2.8, 4.5, 5.6, 6.7, 8.4, 10];
          const due = cycle * 12 + times[index];
          if (time > due - 0.7 && !e.cue[row]) {
            e.cue[row] = index < 3 ? 1 : 2;
            e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]);
            if (index === 3) e.originX[row] = cycle % 2 ? 350 : 130;
          }
          if (time >= due) {
            if (index < 3) {
              const side = index % 2 === 0 ? 0 : 1, [sx, sy] = socket(side);
              if (emitters[side] > 0) emit(p.x[row] + sx, p.y[row] + sy + 12, fan(e.targetAngle[row], phase === 1 ? 7 : 9, 1.25, 54 + phase * 4), 0xf4a0e4);
            } else if (index < 6) {
              for (const x of curtainPositions(e.originX[row], 88 - phase * 8, index % 2 === 0 ? 12 : 0)) emit(x, 38, [{ vx: 0, vy: 48 + phase * 2 }], 0xd794ff);
              if (index === 3 && phase > 1 && !hostiles.suppressed) { spawnBeam(scene.world, clamp(run.x, 28, 452), 12, 1.1, 0.65); if (phase === 3) spawnBeam(scene.world, clamp(run.x + (run.x < 240 ? 100 : -100), 28, 452), 12, 1.1, 0.65); }
            } else {
              const count = (phase === 1 ? 14 : phase === 2 ? 18 : 20) - (emitters[0] <= 0 ? 3 : 0) - (emitters[1] <= 0 ? 3 : 0);
              emit(p.x[row], p.y[row] + 10, ring(count, index === 7 ? Math.PI / count : 0, 40 + phase * 4), 0xff88c8);
            }
            e.fireIndex[row]++; e.cue[row] = 0;
          }
        }
        enemies.eachChunk(({ views, count }) => { const p = views.pose, e = views.enemy; for (let row = 0; row < count; row++) if (e.active[row] && e.kind[row] === Kind.EngineEmitter) {
          const side = e.pattern[row] ? 1 : 0, [sx, sy] = socket(side);
          p.x[row] = bossX + sx; p.y[row] = bossY + sy;
          emitters[side] = Math.max(0, e.hp[row]);
        } });
      },
      render(frame, alpha) {
        drawDefeat(frame, run, campaignFrame("starfallEngine"));
        const { boss, parts } = locate(enemies, Kind.StarfallEngine, Kind.EngineEmitter);
        if (!boss) return;
        const { p, e, row } = boss, x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha), index = e.fireIndex[row] % 8;
        if (e.cue[row] === 2 && index >= 3 && index < 6) drawGap(frame, e.originX[row], 88 - run.bossPhase * 8, 0x77e5c2, 0xb5efd0);
        for (const side of [0, 1]) if (!(parts & 1 << side)) {
          const [sx, sy] = socket(side);
          frame.rect(x + sx, y + sy, 20, 20, 0x0a1020, 0.88, 3); frame.rect(x + sx, y + sy, 8, 3, 0x954258, 1, 4);
        }
      },
    };
  },
};
