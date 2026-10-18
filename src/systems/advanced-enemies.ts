import { clamp, type WorldAccess } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import type { StageConfig } from "../config/stages.ts";
import { COMBAT } from "../config/encounters.ts";
import { Kind } from "../config/enemies.ts";
import { spawnBeam, spawnEnemy } from "../entities/combat.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import type { RunState } from "../world/session.ts";
import type { CombatContext } from "./combat-context.ts";
import { engineSockets } from "../services/campaign-assets.ts";

export function spawnAdvancedBoss(world: WorldAccess, run: RunState, stage: StageConfig): void {
  spawnEnemy(world, run, stage.index === 1 ? Kind.KilnHead : Kind.StarfallEngine, 240, -40, { hp: stage.bossHp });
  const count = stage.index === 1 ? 3 : 2;
  run.bossLeft = run.bossRight = 55;
  for (let i = 0; i < count; i++) spawnEnemy(world, run, stage.index === 1 ? Kind.KilnSegment : Kind.EngineEmitter, 240, -40, { hp: 55, pattern: i });
}
export function installAdvancedEnemies({ scene, run, stage, sound, hostiles }: CombatContext): void {
  const enemies = scene.world.query(Pose, Enemy), { emit } = hostiles;
  scene.system(({ dt }) => {
    if (run.phase === "clear" || run.phase === "dead") return;
    let bossX = 240, bossY = -40, bossAge = 0;
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
        if (kind !== Kind.KilnHead && kind !== Kind.StarfallEngine) continue;
        const time = Math.max(0, age - 2.7);
        p.x[row] = kind === Kind.KilnHead ? 275 + Math.sin(time * 0.5) * 90 : 240 + Math.sin(time * 0.4) * 65;
        p.y[row] = Math.min(65, p.y[row] + dt * 40);
        bossX = p.x[row]; bossY = p.y[row]; bossAge = time; run.bossHealth = Math.max(0, e.hp[row]);
        const phase = kind === Kind.KilnHead ? (e.hp[row] < stage.bossHp / 2 ? 2 : 1) : e.hp[row] < stage.bossHp / 3 ? 3 : e.hp[row] < stage.bossHp * 2 / 3 ? 2 : 1;
        if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / ${kind === Kind.KilnHead ? "CORE OVERHEAT" : "REACTOR SURGE"}`; run.bannerTime = 1.4; sound.boss(); }
        const cycle = Math.floor(e.fireIndex[row] / 8), index = e.fireIndex[row] % 8;
        const times = kind === Kind.KilnHead ? [0.8, 2, 3.2, 4.8, 6, 8.2, 9.3, 10.4] : [0.8, 1.8, 2.8, 4.5, 5.6, 6.7, 8.4, 10];
        const due = cycle * 12 + times[index];
        if (time > due - 0.7 && !e.cue[row]) {
          e.cue[row] = index < 3 ? 1 : 2;
          e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]);
          if (kind === Kind.KilnHead && index === 5) e.originX[row] = clamp(p.x[row], 80, 400);
          if (kind === Kind.StarfallEngine && index === 3) e.originX[row] = cycle % 2 ? 350 : 130;
        }
        if (time < due) continue;
        if (kind === Kind.KilnHead) {
          if (index < 3) emit(p.x[row], p.y[row] + 18, fan(Math.PI / 2 + (index % 2 ? -0.3 : 0.3), phase === 1 ? 7 : 9, Math.PI * 0.47, 60), 0xffaa76);
          else if (index < 5) {
            emit(p.x[row], p.y[row] + 12, ring(phase === 1 ? 10 : 14, index === 4 ? Math.PI / 14 : 0, phase === 1 ? 46 : 50), 0xffaa76);
            for (let i = 0; i < 3; i++) if (run.sections[i] > 0) emit(p.x[row] - (i + 1) * 34, p.y[row] + 12, fan(Math.PI / 2, 2, 0.7, 42), 0xffdf87);
          } else for (const x of curtainPositions(e.originX[row], 72, index % 2 === 0 ? 12 : 0)) emit(x, 38, [{ vx: 0, vy: 50 }], 0xffaa76);
        } else {
          if (index < 3) {
            const left = index % 2 === 0;
            const socket = left ? engineSockets().leftEmitter : engineSockets().rightEmitter;
            if (left ? run.bossLeft > 0 : run.bossRight > 0) emit(p.x[row] + socket[0], p.y[row] + socket[1] + 12, fan(e.targetAngle[row], phase === 1 ? 7 : 9, 1.25, 54 + phase * 4), 0xf4a0e4);
          } else if (index < 6) {
            for (const x of curtainPositions(e.originX[row], 88 - phase * 8, index % 2 === 0 ? 12 : 0)) emit(x, 38, [{ vx: 0, vy: 48 + phase * 2 }], 0xd794ff);
            if (index === 3 && phase > 1 && !hostiles.suppressed) { spawnBeam(scene.world, clamp(run.x, 28, 452), 12, 1.1, 0.65); if (phase === 3) spawnBeam(scene.world, clamp(run.x + (run.x < 240 ? 100 : -100), 28, 452), 12, 1.1, 0.65); }
          } else {
            const count = (phase === 1 ? 14 : phase === 2 ? 18 : 20) - (run.bossLeft <= 0 ? 3 : 0) - (run.bossRight <= 0 ? 3 : 0);
            emit(p.x[row], p.y[row] + 10, ring(count, index === 7 ? Math.PI / count : 0, 40 + phase * 4), 0xff88c8);
          }
        }
        e.fireIndex[row]++; e.cue[row] = 0;
      }
    });
    enemies.eachChunk(({ views, count }) => { const p = views.pose, e = views.enemy; for (let row = 0; row < count; row++) if (e.active[row]) {
      if (e.kind[row] === Kind.KilnSegment) { const i = e.pattern[row]; p.x[row] = 275 + Math.sin((bossAge - (i + 1) * 0.3) * 0.5) * 90 - (i + 1) * 34; p.y[row] = bossY + 6 + Math.sin(bossAge * 1.2 - i * 0.8) * 12; run.sections[i] = Math.max(0, e.hp[row]); }
      if (e.kind[row] === Kind.EngineEmitter) { const socket = e.pattern[row] ? engineSockets().rightEmitter : engineSockets().leftEmitter; p.x[row] = bossX + socket[0]; p.y[row] = bossY + socket[1]; if (e.pattern[row]) run.bossRight = Math.max(0, e.hp[row]); else run.bossLeft = Math.max(0, e.hp[row]); }
    } });
  });
}
