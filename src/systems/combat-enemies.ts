import { Enemy, Pose } from "../components/combat.ts";
import { COMBAT } from "../config/encounters.ts";
import { Kind } from "../config/enemies.ts";
import { spawnEnemy, spawnRepair } from "../entities/combat.ts";
import { fan } from "../world/patterns.ts";
import type { CombatContext } from "./combat-context.ts";

export function installCombatEnemies({ scene, run, sound, stage, hostiles, boss }: CombatContext): void {
  const enemies = scene.world.query(Pose, Enemy), { emit } = hostiles;
  let warning = false;
  scene.system(({ dt }) => {
    if (run.phase === "dead" || run.phase === "clear") return;
    if (run.seconds >= stage.bossAt - 4 && !warning) {
      warning = true; run.banner = `WARNING / ${stage.boss.name}`; run.bannerTime = 4;
      hostiles.clear({ enemies: true });
      run.waveIndex = stage.encounters.length;
    }
    if (run.phase === "waves" && run.seconds >= stage.bossAt) {
      run.phase = "boss"; run.bossHealth = run.bossMax = stage.boss.hp;
      run.banner = stage.boss.name; run.bannerTime = 3; sound.boss();
      boss.spawn();
    }
    while (run.waveIndex < stage.encounters.length && stage.encounters[run.waveIndex].at <= run.seconds) {
      const event = stage.encounters[run.waveIndex];
      if (enemies.size + event.count > COMBAT.enemyCap) break;
      run.waveIndex++;
      if (event.kind === "repair") { spawnRepair(scene.world, event.side, -10); continue; }
      for (let i = 0; i < event.count; i++) {
        if (event.kind === "interceptor") spawnEnemy(scene.world, run, Kind.Interceptor,
          event.side + (i - (event.count - 1) / 2) * 27, -22 - Math.abs(i - (event.count - 1) / 2) * 14,
          { pattern: event.quiet ? 1 : 0, cooldown: 1.8 + i * 0.13 });
        if (event.kind === "gunship") spawnEnemy(scene.world, run, Kind.Gunship, event.side, -25);
        if (event.kind === "sweeper") spawnEnemy(scene.world, run, Kind.Sweeper, event.side ? 505 + i * 40 : -25 - i * 40, 92 + i * 46,
          { vx: event.side ? -65 : 65, cooldown: 0.8 + i * 0.3 });
        if (event.kind === "minelayer" || event.kind === "warden") spawnEnemy(scene.world, run, event.kind === "minelayer" ? Kind.Minelayer : Kind.Warden, event.side + i * 50, -24, { cooldown: 2.7 + i * 0.4 });
      }
    }
    enemies.eachChunk((chunk) => {
      const p = chunk.views.pose, e = chunk.views.enemy;
      for (let row = 0; row < chunk.count; row++) {
        if (!e.active[row] || e.hp[row] <= 0) continue;
        p.px[row] = p.x[row]; p.py[row] = p.y[row];
        e.age[row] += dt; e.flash[row] = Math.max(0, e.flash[row] - dt);
        const kind = e.kind[row], age = e.age[row];
        if (kind === Kind.Interceptor) {
          p.x[row] = e.originX[row] + Math.sin(age * 1.6) * 19; p.y[row] += dt * 40;
          if (e.pattern[row] === 0 && e.fireIndex[row] === 0) {
            e.cooldown[row] -= dt;
            if (e.cooldown[row] < 0.35 && !e.cue[row]) { e.cue[row] = 1; e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]); }
            if (e.cooldown[row] <= 0) { emit(p.x[row], p.y[row] + 8, fan(e.targetAngle[row], 1, 0, 62), 0xff747d); e.fireIndex[row]++; e.cue[row] = 0; }
          }
        } else if (kind === Kind.Gunship) {
          p.y[row] += dt * (p.y[row] < 67 ? 28 : age > 12 ? 38 : 5);
          p.x[row] = e.originX[row] + Math.sin(age * 0.8) * 24;
          e.cooldown[row] -= dt;
          if (e.cooldown[row] < 0.45 && !e.cue[row]) { e.cue[row] = 1; e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]); }
          if (e.cooldown[row] <= 0) { emit(p.x[row], p.y[row] + 10, fan(e.targetAngle[row], 5, 56 * Math.PI / 180, 58), 0xff9b70); e.cooldown[row] = 2.4; e.cue[row] = 0; }
        } else if (kind === Kind.Sweeper) {
          p.x[row] += e.vx[row] * dt; p.y[row] += Math.sin(age * 3) * dt * 8;
          e.cooldown[row] -= dt;
          if (e.cooldown[row] <= 0) {
            if (Math.hypot(run.x - p.x[row], run.y - p.y[row]) > 45) emit(p.x[row], p.y[row] + 7, fan(Math.PI / 2, 3, 32 * Math.PI / 180, 48), 0xf78caf);
            e.cooldown[row] = 0.7;
          }
        }
        if ((kind === Kind.Interceptor || kind === Kind.Gunship || kind === Kind.Sweeper) && (p.y[row] > 300 || p.x[row] < -100 || p.x[row] > 580)) { e.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
      }
    });
  });
}
