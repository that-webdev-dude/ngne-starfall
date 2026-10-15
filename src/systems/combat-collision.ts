import type { Entity, SchemaQueryViews } from "@ngne/core";
import { Beam, Bullet, Enemy, Pickup, Pose } from "../components/combat.ts";
import { isBoss, isBossPart, isOrdinaryEnemy } from "../world/enemy-kinds.ts";
import { COMBAT } from "../config/encounters.ts";
import { spawnRepair } from "../entities/combat.ts";
import { segmentCircle } from "../world/patterns.ts";
import type { CombatContext } from "./combat-context.ts";

export function installCombatCollision({ scene, run, sound, burst, stage }: CombatContext): void {
  const enemies = scene.world.query(Pose, Enemy), bullets = scene.world.query(Pose, Bullet), pickups = scene.world.query(Pose, Pickup);
  const drops = scene.random("repair-drops");
  type Views = SchemaQueryViews<[typeof Pose, typeof Enemy]>;
  const targets: { p: Views["pose"]; e: Views["enemy"]; row: number; entity: Entity }[] = [];
  const damagePlayer = () => {
    if (run.invulnerable > 0 || run.phase === "clear" || run.phase === "dead") return;
    run.hull--; run.invulnerable = 1.2; run.combo = 1; run.comboTimer = 0; run.shake = 3.5; run.flash = 0.14;
    scene.freeze(4); sound.damage(); burst(run.x, run.y, 0x83edff, 24, true);
    if (run.hull <= 0) { run.phase = "dead"; run.shake = 6; sound.death(); burst(run.x, run.y, 0xffcc9a, 65, true); }
  };
  scene.system(({ dt }) => {
    if (run.phase === "clear" || run.phase === "dead") return;
    targets.length = 0;
    enemies.eachChunk((chunk) => {
      for (let row = 0; row < chunk.count; row++) if (chunk.views.enemy.active[row]) targets.push({ p: chunk.views.pose, e: chunk.views.enemy, row, entity: chunk.entityAt(row) });
    });
    targets.sort((a, b) => Number(isBossPart(b.e.kind[b.row])) - Number(isBossPart(a.e.kind[a.row])));
    const boss = targets.find((target) => isBoss(target.e.kind[target.row]));
    bullets.eachChunk((chunk) => {
      const p = chunk.views.pose, b = chunk.views.bullet;
      for (let row = 0; row < chunk.count; row++) {
        if (!b.active[row]) continue;
        p.px[row] = p.x[row]; p.py[row] = p.y[row];
        p.x[row] += b.vx[row] * dt; p.y[row] += b.vy[row] * dt; b.age[row] += dt;
        if (!b.team[row]) {
          for (const target of targets) {
            const { p: ep, e, row: er } = target;
            if (!e.active[er] || !segmentCircle(p.px[row], p.py[row], p.x[row], p.y[row], ep.x[er], ep.y[er], e.radius[er] + b.radius[row])) continue;
            e.hp[er] -= b.damage[row]; e.flash[er] = 0.07;
            if (isBossPart(e.kind[er]) && boss) boss.e.hp[boss.row] -= b.damage[row] * 0.65;
            b.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); sound.hit();
            burst(p.x[row], p.y[row], 0xffd9a5, 3); break;
          }
        } else if (segmentCircle(p.px[row], p.py[row], p.x[row], p.y[row], run.x, run.y, COMBAT.playerRadius + b.radius[row])) {
          b.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); damagePlayer();
        }
        if (b.active[row] && (p.x[row] < -25 || p.x[row] > 505 || p.y[row] < -30 || p.y[row] > 300 || b.age[row] > 10)) {
          b.active[row] = 0; scene.world.despawn(chunk.entityAt(row));
        }
      }
    });
    scene.world.query(Pose, Beam).eachChunk((chunk) => { const p = chunk.views.pose, beam = chunk.views.beam; for (let row = 0; row < chunk.count; row++) if (beam.active[row]) {
      beam.age[row] += dt;
      if (beam.age[row] >= beam.charge[row] + beam.duration[row]) { beam.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
      else if (beam.age[row] >= beam.charge[row] && run.y >= p.y[row] && Math.abs(run.x - p.x[row]) <= beam.width[row] / 2 + COMBAT.playerRadius) damagePlayer();
    } });
    for (const { p, e, row, entity } of targets) {
      if (!e.active[row]) continue;
      if (e.hp[row] <= 0) {
        e.active[row] = 0; scene.world.despawn(entity);
        const kind = e.kind[row], base = [100, 300, 200, 5000, 650, 350, 400, 50, 6500, 800, 10000, 1000][kind], points = base * run.combo;
        run.score += points; run.kills++; run.combo = Math.min(COMBAT.maxChain, run.combo + 1); run.comboTimer = COMBAT.chainSeconds;
        run.scorePops.push({ x: p.x[row] - 8, y: p.y[row] - 12, text: `+${points}`, life: 0.8 });
        const large = isBoss(kind) || isBossPart(kind);
        burst(p.x[row], p.y[row], large ? 0xffc57d : 0xff9c7d, large ? 55 : 18, true);
        sound.kill(large); run.shake = Math.max(run.shake, large ? 4 : 0.8);
        if (isBossPart(kind)) { if (kind === 9) run.sections[e.pattern[row]] = 0; else if (e.pattern[row] === 0) run.bossLeft = 0; else run.bossRight = 0; scene.freeze(3); }
        if (isOrdinaryEnemy(kind) && drops.next() < 0.04) spawnRepair(scene.world, p.x[row], p.y[row]);
        if (isBoss(kind) && run.hull > 0) {
          run.phase = "clear"; run.bossHealth = 0; run.banner = stage.index === 2 ? "STARFALL / VICTORY" : `${stage.name} SECURED`; run.bannerTime = 5; run.shake = 6; run.flash = 0.2;
          run.score += [3000, 5000, 10000][stage.index] + run.hull * 500;
          run.bossDeathX = p.x[row]; run.bossDeathY = p.y[row]; scene.freeze(9);
          for (const other of targets) if (other.e.active[other.row]) { other.e.active[other.row] = 0; scene.world.despawn(other.entity); }
          bullets.eachChunk((batch) => { for (let i = 0; i < batch.count; i++) if (batch.views.bullet.active[i]) { batch.views.bullet.active[i] = 0; scene.world.despawn(batch.entityAt(i)); } });
          scene.world.query(Beam).eachChunk((chunk) => { for (let row = 0; row < chunk.count; row++) { chunk.views.beam.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); } });
        }
      } else if (Math.hypot(p.x[row] - run.x, p.y[row] - run.y) < e.radius[row] + COMBAT.playerRadius) damagePlayer();
    }
    if (boss && boss.e.active[boss.row]) run.bossHealth = Math.max(0, boss.e.hp[boss.row]);
    if (run.hull <= 0 || run.phase === "clear") { targets.length = 0; return; }
    pickups.eachChunk((chunk) => {
      const p = chunk.views.pose, item = chunk.views.pickup;
      for (let row = 0; row < chunk.count; row++) {
        if (!item.active[row]) continue;
        p.px[row] = p.x[row]; p.py[row] = p.y[row]; item.age[row] += dt;
        const distance = Math.hypot(run.x - p.x[row], run.y - p.y[row]);
        if (distance < 55) { p.x[row] += (run.x - p.x[row]) * dt * 4; p.y[row] += (run.y - p.y[row]) * dt * 4; }
        else p.y[row] += dt * 25;
        if (distance < 13) { run.hull = Math.min(5, run.hull + 1); run.score += 150; item.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); burst(p.x[row], p.y[row], 0x85f7af, 14); run.scorePops.push({ x: p.x[row] - 12, y: p.y[row] - 10, text: "REPAIR", life: 1 }); }
        else if (p.y[row] > 290) { item.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); }
      }
    });
    // Borrowed columns stay within this update's commit epoch.
    targets.length = 0;
  });
}
