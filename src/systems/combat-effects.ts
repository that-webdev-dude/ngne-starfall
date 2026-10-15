import { Particle, Pose } from "../components/combat.ts";
import { spawnParticle } from "../entities/combat.ts";
import type { CombatContext } from "./combat-context.ts";

export function createEffects(context: Omit<CombatContext, "burst">): CombatContext["burst"] {
  const { scene } = context, particles = scene.world.query(Pose, Particle), random = scene.random("combat-effects");
  let countThisTick = 0;
  scene.system(() => { countThisTick = 0; }, { runsDuringFreeze: true });
  return (x, y, color, count, explosion = false) => {
    const limit = context.session.settings.reducedMotion ? 160 : 700;
    for (let i = 0; i < count && particles.size + countThisTick < limit; i++) {
      const angle = random.range(0, Math.PI * 2), speed = random.range(20, 95);
      spawnParticle(scene.world, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        random.range(0.16, 0.6), color, random.int(1, 3));
      countThisTick++;
    }
    if (explosion && particles.size + countThisTick < limit) {
      spawnParticle(scene.world, x, y, 0, 0, 0.365, color, 1, 1); countThisTick++;
    }
  };
}
export function installCombatEffects({ scene, run, session, sound }: CombatContext): void {
  const particles = scene.world.query(Pose, Particle);
  scene.system(({ dt }) => {
    run.effectClock += dt; run.novaRing += dt;
    run.shake = Math.max(0, run.shake - dt * 15); run.flash = Math.max(0, run.flash - dt * 2);
    scene.camera.shakeX = session.settings.reducedMotion ? 0 : Math.sin(run.effectClock * 93) * run.shake;
    scene.camera.shakeY = session.settings.reducedMotion ? 0 : Math.cos(run.effectClock * 117) * run.shake * 0.6;
    for (let i = run.scorePops.length - 1; i >= 0; i--) { run.scorePops[i].life -= dt; run.scorePops[i].y -= dt * 13; if (run.scorePops[i].life <= 0) run.scorePops.splice(i, 1); }
    particles.eachChunk((chunk) => {
      const p = chunk.views.pose, fx = chunk.views.particle;
      for (let row = 0; row < chunk.count; row++) {
        p.px[row] = p.x[row]; p.py[row] = p.y[row]; fx.age[row] += dt;
        p.x[row] += fx.vx[row] * dt; p.y[row] += fx.vy[row] * dt;
        fx.vx[row] *= Math.exp(-dt * 2); fx.vy[row] *= Math.exp(-dt * 2);
        if (fx.age[row] >= fx.life[row]) scene.world.despawn(chunk.entityAt(row));
      }
    });
    sound.update(dt, run.phase);
  }, { runsDuringFreeze: true });
}
