import { Beam, Bullet, Enemy, Pose } from "../components/combat.ts";
import { COMBAT } from "../config/encounters.ts";
import { Kind } from "../config/enemies.ts";
import { BOSS } from "../config/boss-geometry.ts";
import { spawnBullet, spawnEnemy, spawnRepair } from "../entities/combat.ts";
import { curtainPositions, fan, ring, type Shot } from "../world/patterns.ts";
import type { CombatContext } from "./combat-context.ts";
import { spawnAdvancedBoss } from "./advanced-enemies.ts";

export function installCombatEnemies({ scene, run, sound, stage }: CombatContext): void {
  const enemies = scene.world.query(Pose, Enemy), bullets = scene.world.query(Pose, Bullet);
  let warning = false;
  const emit = (x: number, y: number, shots: Shot[], color = 0xff747d) => {
    // Nova cancellation owns this tick, including shots that would be queued later.
    if (run.novaRing < 0.1) return;
    for (const shot of shots) {
      let hostileCount = 0;
      bullets.eachChunk((chunk) => { const b = chunk.views.bullet; for (let row = 0; row < chunk.count; row++) if (b.team[row] && b.active[row]) hostileCount++; });
      if (hostileCount + run.bulletSpawns >= COMBAT.bulletCap) break;
      spawnBullet(scene.world, x, y, shot.vx, shot.vy, 1, color); run.bulletSpawns++;
    }
    sound.enemyShot();
  };
  scene.system(({ dt }) => {
    if (run.phase === "dead" || run.phase === "clear") return;
    if (run.seconds >= stage.bossAt - 4 && !warning) {
      warning = true; run.banner = `WARNING / ${stage.bossName}`; run.bannerTime = 4;
      enemies.eachChunk((chunk) => { const e = chunk.views.enemy; for (let row = 0; row < chunk.count; row++) { e.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); } });
      bullets.eachChunk((chunk) => { const b = chunk.views.bullet; for (let row = 0; row < chunk.count; row++) if (b.team[row]) { b.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); } });
      scene.world.query(Beam).eachChunk((chunk) => { for (let row = 0; row < chunk.count; row++) { chunk.views.beam.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); } });
      run.waveIndex = stage.encounters.length;
    }
    if (run.phase === "waves" && run.seconds >= stage.bossAt) {
      run.phase = "boss"; run.bossHealth = run.bossMax = stage.bossHp;
      run.banner = stage.bossName; run.bannerTime = 3; sound.boss();
      if (stage.index === 0) {
        spawnEnemy(scene.world, run, Kind.Gatebreaker, 240, -35, { hp: stage.bossHp });
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, 202, -20, { pattern: 0 });
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, 278, -20, { pattern: 1 });
      } else spawnAdvancedBoss(scene.world, run, stage);
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
    let bossX = 240, bossY = -35;
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
            if (e.cooldown[row] <= 0) { emit(p.x[row], p.y[row] + 8, fan(e.targetAngle[row], 1, 0, 62)); e.fireIndex[row]++; e.cue[row] = 0; }
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
        } else if (kind === Kind.Gatebreaker) {
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
              const left = index % 2 === 0, alive = left ? run.bossLeft > 0 : run.bossRight > 0;
              if (alive) emit(p.x[row] + (left ? BOSS.leftTurret[0] : BOSS.rightTurret[0]), p.y[row] + 21, fan(e.targetAngle[row], enraged ? 9 : 7, (enraged ? 96 : 72) * Math.PI / 180, 58), 0xffa07e);
            } else if (index < 6) {
              const gap = cycle % 2 ? 360 : 120;
              for (const x of curtainPositions(gap, 64, index % 2 === 0 ? 12 : 0)) emit(x, 36, [{ vx: 0, vy: 52 }], 0xff797f);
            } else emit(p.x[row], p.y[row] + 10, ring(enraged ? 18 : 14, (index === 7 ? Math.PI / (enraged ? 18 : 14) : 0) + cycle * 0.13, enraged ? 50 : 44), 0xf2a5ec);
            e.fireIndex[row]++; e.cue[row] = 0;
          }
        }
        if ((kind === Kind.Interceptor || kind === Kind.Gunship || kind === Kind.Sweeper) && (p.y[row] > 300 || p.x[row] < -100 || p.x[row] > 580)) { e.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
      }
    });
    enemies.eachChunk((chunk) => { const p = chunk.views.pose, e = chunk.views.enemy; for (let row = 0; row < chunk.count; row++) if (e.kind[row] === Kind.GatebreakerTurret && e.active[row]) {
      const socket = e.pattern[row] === 0 ? BOSS.leftTurret : BOSS.rightTurret;
      p.x[row] = bossX + socket[0]; p.y[row] = bossY + socket[1];
      if (e.pattern[row] === 0) run.bossLeft = Math.max(0, e.hp[row]); else run.bossRight = Math.max(0, e.hp[row]);
    } });
  });
}
