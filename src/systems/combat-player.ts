import { clamp, down, pressed } from "@ngne/core";
import { Flight } from "../components/flight.ts";
import { Beam, Bullet, Enemy, Pose } from "../components/combat.ts";
import { isBoss } from "../world/enemy-kinds.ts";
import { COMBAT } from "../config/encounters.ts";
import { FLIGHT } from "../config/preview.ts";
import { spawnBullet } from "../entities/combat.ts";
import { approach } from "../utils/motion.ts";
import { flightVelocity } from "../world/flight-motion.ts";
import type { CombatContext } from "./combat-context.ts";

export function installCombatPlayer(context: CombatContext): void {
  const { scene, run, sound, burst } = context;
  const players = scene.world.query(Flight), enemies = scene.world.query(Pose, Enemy), bullets = scene.world.query(Pose, Bullet);
  scene.system(({ dt, input }) => {
    run.bulletSpawns = 0;
    if (run.phase === "dead" || run.phase === "clear") return;
    run.seconds += dt; run.bannerTime = Math.max(0, run.bannerTime - dt);
    run.invulnerable = Math.max(0, run.invulnerable - dt); run.nova = Math.min(1, run.nova + dt / COMBAT.novaSeconds);
    run.comboTimer = Math.max(0, run.comboTimer - dt); if (run.comboTimer === 0) run.combo = 1;
    const active = (key: string) => down(input, key) || pressed(input, key);
    let mx = Number(active("KeyD") || active("ArrowRight")) - Number(active("KeyA") || active("ArrowLeft")) + (input.axes[0] ?? 0);
    let my = Number(active("KeyS") || active("ArrowDown")) - Number(active("KeyW") || active("ArrowUp")) + (input.axes[1] ?? 0);
    const length = Math.max(1, Math.hypot(mx, my)); mx /= length; my /= length;
    players.eachChunk((chunk) => {
      const p = chunk.views.flight;
      for (let row = 0; row < chunk.count; row++) {
        p.px[row] = p.x[row]; p.py[row] = p.y[row]; p.previousBank[row] = p.bank[row];
        const beforeX = p.vx[row], beforeY = p.vy[row];
        p.vx[row] = flightVelocity(beforeX, mx, dt); p.vy[row] = flightVelocity(beforeY, my, dt);
        p.x[row] = clamp(p.x[row] + (beforeX + p.vx[row]) * dt / 2, 18, 462);
        p.y[row] = clamp(p.y[row] + (beforeY + p.vy[row]) * dt / 2, 43, 239);
        if ((p.x[row] === 18 && p.vx[row] < 0) || (p.x[row] === 462 && p.vx[row] > 0)) p.vx[row] = 0;
        if ((p.y[row] === 43 && p.vy[row] < 0) || (p.y[row] === 239 && p.vy[row] > 0)) p.vy[row] = 0;
        p.bank[row] = approach(p.bank[row], mx, FLIGHT.bankResponse, dt);
        run.x = p.x[row]; run.y = p.y[row];
      }
    });
    const firing = active("Pointer0") || active("Space") || active("Pad2");
    // Preserve the held-fire cadence; idle time cannot accumulate overdue shots.
    run.shotTimer = firing ? run.shotTimer - dt : Math.max(0, run.shotTimer - dt);
    if (firing && run.shotTimer <= 0) {
      run.shotTimer += 0.14;
      for (const offset of [-5, 5]) spawnBullet(scene.world, run.x + offset, run.y - 13, 0, -370, 0, 0xffd496, 2);
      sound.shoot();
    }
    if ((pressed(input, "KeyB") || pressed(input, "Pad0")) && run.nova >= 0.999) {
      run.nova = 0; run.invulnerable = Math.max(run.invulnerable, 0.5); run.novaRing = 0;
      run.shake = 4; run.flash = 0.16; scene.freeze(5); sound.nova();
      bullets.eachChunk((chunk) => {
        const p = chunk.views.pose, b = chunk.views.bullet;
        for (let row = 0; row < chunk.count; row++) if (b.team[row] && b.active[row]) {
          b.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); burst(p.x[row], p.y[row], 0x83f1e1, 2);
        }
      });
      enemies.eachChunk((chunk) => {
        const e = chunk.views.enemy;
        for (let row = 0; row < chunk.count; row++) if (e.active[row]) { e.hp[row] -= isBoss(e.kind[row]) ? 28 : 12; e.flash[row] = 0.14; }
      });
      scene.world.query(Beam).eachChunk((chunk) => { for (let row = 0; row < chunk.count; row++) { chunk.views.beam.active[row] = 0; scene.world.despawn(chunk.entityAt(row)); } });
      burst(run.x, run.y, 0x93f5ff, 60);
    }
  });
}
