import { Particle, Pose } from "../components/combat.ts";
import { fromLegacy as w } from "../config/view.ts";
import { spawnParticle } from "../entities/combat.ts";
import { EFFECT, effectSeconds } from "../render/player-fx-model.ts";
import type { CombatContext } from "./combat-context.ts";
import { observePlayerFx, playerFxState } from "./player-fx-state.ts";

export function createEffects(context: Omit<CombatContext, "burst" | "hostiles" | "boss">): CombatContext["burst"] {
  const { scene } = context, particles = scene.world.query(Pose, Particle), random = scene.random("combat-effects");
  let countThisTick = 0;
  playerFxState(context.run);
  scene.system(() => { countThisTick = 0; }, { runsDuringFreeze: true });
  return (x, y, color, count, effect = false, still = false) => {
    const limit = context.session.settings.reducedMotion ? 160 : 700;
    for (let i = 0; i < count && particles.size + countThisTick < limit; i++) {
      // Same draws in the same order as at 480x270; only the spatial results are migrated. `still` (reduced-motion
      // nova embers) keeps the draws and drops the velocity.
      const angle = random.range(0, Math.PI * 2), drawn = random.range(w(20), w(95)), speed = still ? 0 : drawn;
      spawnParticle(scene.world, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        random.range(0.16, 0.6), color, w(random.int(1, 3)));
      countThisTick++;
    }
    // One effect sprite in the particle's kind tag, alive for exactly its once-playback.
    const kind = effect === true ? EFFECT.explosion : effect || 0;
    if (kind && particles.size + countThisTick < limit) {
      spawnParticle(scene.world, x, y, 0, 0, effectSeconds(kind), color, w(1), kind); countThisTick++;
    }
  };
}
export function installCombatEffects({ scene, run, session, sound }: CombatContext): void {
  const particles = scene.world.query(Pose, Particle);
  scene.system(({ dt }) => {
    run.effectClock += dt; run.novaRing += dt;
    observePlayerFx(run);
    // Amplitudes are world px (x 4/3), so the decay rate scales too and every shake lasts as long as before.
    run.shake = Math.max(0, run.shake - dt * w(15)); run.flash = Math.max(0, run.flash - dt * 2);
    // Whole-pixel camera offset: native frames stay on the pixel grid (see ui/sprite.ts pixelSnapped).
    scene.camera.shakeX = session.settings.reducedMotion ? 0 : Math.round(Math.sin(run.effectClock * 93) * run.shake);
    scene.camera.shakeY = session.settings.reducedMotion ? 0 : Math.round(Math.cos(run.effectClock * 117) * run.shake * 0.6);
    for (let i = run.scorePops.length - 1; i >= 0; i--) { run.scorePops[i].life -= dt; run.scorePops[i].y -= dt * w(13); if (run.scorePops[i].life <= 0) run.scorePops.splice(i, 1); }
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
