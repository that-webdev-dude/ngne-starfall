import { clamp, down, pressed } from "@ngne/core";
import { Flight } from "../components/flight.ts";
import { Enemy, Pose } from "../components/combat.ts";
import { isBoss } from "../config/enemies.ts";
import { COMBAT } from "../config/encounters.ts";
import { FLIGHT, PLAYER_BOUNDS, fromLegacy as w } from "../config/view.ts";
import { spawnBullet } from "../entities/combat.ts";
import { poseSockets, stepPose } from "../render/player-fx-model.ts";
import { approach } from "../utils/motion.ts";
import { flightVelocity, stickAxis } from "../world/flight-motion.ts";
import type { CombatContext } from "./combat-context.ts";
import { playerFxState, startNovaFx } from "./player-fx-state.ts";

export function installCombatPlayer(context: CombatContext): void {
  const { scene, run, session, sound, burst, hostiles } = context;
  const players = scene.world.query(Flight), enemies = scene.world.query(Pose, Enemy), fx = playerFxState(run);
  const { minX, maxX, minY, maxY } = PLAYER_BOUNDS;
  scene.system(({ dt, input }) => {
    if (run.phase === "dead" || run.phase === "clear") return;
    run.seconds += dt; run.bannerTime = Math.max(0, run.bannerTime - dt);
    run.invulnerable = Math.max(0, run.invulnerable - dt); run.nova = Math.min(1, run.nova + dt / COMBAT.novaSeconds);
    run.comboTimer = Math.max(0, run.comboTimer - dt); if (run.comboTimer === 0) run.combo = 1;
    const active = (key: string) => down(input, key) || pressed(input, key);
    let mx = Number(active("KeyD") || active("ArrowRight")) - Number(active("KeyA") || active("ArrowLeft")) + stickAxis(input.axes[0] ?? 0);
    let my = Number(active("KeyS") || active("ArrowDown")) - Number(active("KeyW") || active("ArrowUp")) + stickAxis(input.axes[1] ?? 0);
    const length = Math.max(1, Math.hypot(mx, my)); mx /= length; my /= length;
    players.eachChunk((chunk) => {
      const p = chunk.views.flight;
      for (let row = 0; row < chunk.count; row++) {
        p.px[row] = p.x[row]; p.py[row] = p.y[row]; p.previousBank[row] = p.bank[row];
        const beforeX = p.vx[row], beforeY = p.vy[row];
        p.vx[row] = flightVelocity(beforeX, mx, dt); p.vy[row] = flightVelocity(beforeY, my, dt);
        p.x[row] = clamp(p.x[row] + (beforeX + p.vx[row]) * dt / 2, minX, maxX);
        p.y[row] = clamp(p.y[row] + (beforeY + p.vy[row]) * dt / 2, minY, maxY);
        if ((p.x[row] === minX && p.vx[row] < 0) || (p.x[row] === maxX && p.vx[row] > 0)) p.vx[row] = 0;
        if ((p.y[row] === minY && p.vy[row] < 0) || (p.y[row] === maxY && p.vy[row] > 0)) p.vy[row] = 0;
        p.bank[row] = approach(p.bank[row], mx, FLIGHT.bankResponse, dt);
        stepPose(fx.pose, p.bank[row], dt);
        run.x = p.x[row]; run.y = p.y[row];
      }
    });
    const firing = active("Pointer0") || active("Space") || active("Pad2");
    // Preserve the held-fire cadence; idle time cannot accumulate overdue shots.
    run.shotTimer = firing ? run.shotTimer - dt : Math.max(0, run.shotTimer - dt);
    if (firing && run.shotTimer <= 0) {
      run.shotTimer += 0.14;
      // Two bolts per volley from the current pose's spec primary muzzles (the pixel a shot spawns on, from the pivot).
      for (const [dx, dy] of poseSockets(fx.pose.level).primary) spawnBullet(scene.world, run.x + dx, run.y + dy, 0, -w(370), 0, 0xffd496, w(2));
      sound.shoot();
    }
    if ((pressed(input, "KeyB") || pressed(input, "Pad0")) && run.nova >= 0.999) {
      run.nova = 0; run.invulnerable = Math.max(run.invulnerable, 0.5); run.novaRing = 0; startNovaFx(run);
      run.shake = w(4); run.flash = 0.16; scene.freeze(5); sound.nova();
      // Reduced motion: cleared bullets become in-place ember clusters (spec novaCalm.role).
      hostiles.clear({ onHostileBullet: (x, y) => burst(x, y, 0x83f1e1, 2, false, session.settings.reducedMotion) });
      enemies.eachChunk((chunk) => {
        const e = chunk.views.enemy;
        for (let row = 0; row < chunk.count; row++) if (e.active[row]) { e.hp[row] -= isBoss(e.kind[row]) ? 28 : 12; e.flash[row] = 0.14; }
      });
      burst(run.x, run.y, 0x93f5ff, 60);
    }
  });
}
