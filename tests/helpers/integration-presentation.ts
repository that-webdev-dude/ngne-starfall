// Development fixture only. These seeded states are presentation setup, never normal-rules reachability.
import type { SceneDefinition, SceneSetup } from "@ngne/core";
import { Beam, Bullet, Enemy, Particle, Pose } from "../../src/components/combat.ts";
import { Flight } from "../../src/components/flight.ts";
import { Kind, isBoss } from "../../src/config/enemies.ts";
import { STAGES } from "../../src/config/stages.ts";
import { spawnBeam, spawnBullet, spawnEnemy, spawnParticle, spawnRepair } from "../../src/entities/combat.ts";
import { poseSockets } from "../../src/render/player-fx-model.ts";
import { observePlayerFx, playerFxState, startNovaFx } from "../../src/systems/player-fx-state.ts";
import type { Progress, ProgressCommand, Session } from "../../src/world/session.ts";

export const SCENARIOS = ["card", "play", "boss", "pause", "result", "settings", "controls", "death", "loss", "nova", "dense", "title"] as const;
export type IntegrationScenario = typeof SCENARIOS[number];
export interface PresentationOptions { scenario: IntegrationScenario; pose: number; novaTime: number; variant: string }
export interface PresentationState { frozen: boolean; ticks: number; ready: boolean }

/** Gate registered public update callbacks, retaining the actual production render callback and assets. */
export function gateUpdates(scene: SceneSetup<Progress, ProgressCommand>, frozen: () => boolean): SceneSetup<Progress, ProgressCommand> {
  return { ...scene, system(update, options) { scene.system(context => { if (!frozen()) update(context); }, options); } };
}

/** Deterministic fixture decoration. Manual launcher never calls this. */
export function presentationStage(actual: SceneDefinition<Progress, ProgressCommand>, session: Session, options: PresentationOptions): { definition: SceneDefinition<Progress, ProgressCommand>; state: PresentationState; warmup: number } {
  const state: PresentationState = { frozen: false, ticks: 0, ready: false };
  const bossPreset = ["boss", "pause", "result", "settings", "controls", "loss"].includes(options.scenario);
  const warmup = options.scenario === "card" ? 1 : bossPreset ? 402 : 158;
  const definition = { ...actual, setup(scene: SceneSetup<Progress, ProgressCommand>) {
    actual.setup(gateUpdates(scene, () => state.frozen));
    const run = session.run!, stage = STAGES[run.stageIndex];
    // Skip encounter entry for the boss portrait only; ordinary play/manual routes have distinct labels.
    run.waveIndex = stage.encounters.length;
    if (bossPreset) run.seconds = stage.bossAt - 1 / 60;
    run.invulnerable = 999;
    scene.system(() => {
      if (state.frozen) return;
      state.ticks++;
      if (bossPreset && state.ticks === warmup - 2) {
        scene.world.query(Pose, Enemy).eachChunk(({ views, count, entityAt }) => {
          const e = views.enemy;
          for (let row = 0; row < count; row++) {
            if (isBoss(e.kind[row])) e.hp[row] = stage.boss.hp * (options.variant === "intact" ? 1 : 0.3);
            if ([Kind.GatebreakerTurret, Kind.KilnSegment, Kind.EngineEmitter].includes(e.kind[row] as 4 | 9 | 11) && e.pattern[row] === (stage.index === 1 ? 1 : 0) && options.variant !== "intact") scene.world.despawn(entityAt(row));
          }
        });
      }
      if (state.ticks !== warmup) return;
      // Every value below is explicitly a static presentation choice, isolated from production entry.
      run.invulnerable = 0; run.shake = 0; run.flash = 0; run.effectClock = 4.25;
      run.score = 191550; run.kills = 104; run.combo = 4; run.comboTimer = 2; run.hull = options.scenario === "dense" ? 1 : 4;
      run.bannerTime = options.variant === "phase" ? 1.4 : 0;
      if (options.variant === "phase") { run.bannerKind = "phase"; run.banner = `PHASE ${run.bossPhase} / ${stage.index === 1 ? "CORE OVERHEAT" : "REACTOR SURGE"}`; }
      scene.world.query(Flight).eachChunk(({ views, count }) => {
        const p = views.flight;
        for (let row = 0; row < count; row++) { p.x[row] = p.px[row] = run.x = 320; p.y[row] = p.py[row] = run.y = 270; p.vx[row] = p.vy[row] = 0; p.bank[row] = p.previousBank[row] = options.pose / 3; }
      });
      const fx = playerFxState(run); fx.pose.level = options.pose; fx.lastHull = run.hull;
      if (["play", "nova", "dense"].includes(options.scenario)) {
        // Lineup uses only assets that the selected production stage claims.
        const kinds = stage.index === 0 ? [Kind.Interceptor, Kind.Sweeper, Kind.Gunship] : [Kind.Interceptor, Kind.Sweeper, Kind.Gunship, Kind.Minelayer, Kind.Warden];
        for (const [i, kind] of kinds.entries()) spawnEnemy(scene.world, run, kind, 100 + i * 105, 95 + i % 2 * 35, { cooldown: 0.15 });
        spawnRepair(scene.world, 430, 246);
        if (stage.index > 0) { spawnEnemy(scene.world, run, Kind.Mine, 415, 139); spawnEnemy(scene.world, run, Kind.Mine, 450, 190); }
        for (const [dx, dy] of poseSockets(options.pose).primary) for (let n = 0; n < 4; n++) spawnBullet(scene.world, run.x + dx, run.y + dy - n * 35, 0, -493.333, 0);
        for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
          const color = [0xff717e, 0xff747d, 0xff88c8][(row + col) % 3];
          spawnBullet(scene.world, 70 + col * 54 + row % 2 * 10, 150 + row * 27, Math.cos(col) * 65, 65, 1, color);
        }
        spawnBeam(scene.world, 211, 13, 0, 1); spawnBeam(scene.world, 510, 15, 1, 1);
        for (const [i, kind] of [1, 2, 3].entries()) spawnParticle(scene.world, 150 + i * 140, 200, 0, 0, 0.8, 0xffffff, 2, kind);
        run.scorePops = [{ x: 142, y: 177, text: "+300", life: 1 }];
      }
      scene.world.query(Pose, Enemy).eachChunk(({ views, count }) => {
        const e = views.enemy, p = views.pose;
        for (let row = 0; row < count; row++) {
          p.px[row] = p.x[row]; p.py[row] = p.y[row];
          if (!isBoss(e.kind[row]) && ![Kind.GatebreakerTurret, Kind.KilnSegment, Kind.EngineEmitter].includes(e.kind[row] as 4 | 9 | 11)) { e.cue[row] = 1; e.age[row] = 3; }
          if (isBoss(e.kind[row]) && options.variant === "cue") { e.cue[row] = 2; e.fireIndex[row] = stage.index === 0 ? 3 : 5; e.originX[row] = 320; }
        }
      });
      scene.world.query(Pose, Particle).eachChunk(({ views, count }) => { for (let row = 0; row < count; row++) views.particle.age[row] = 0.13; });
      scene.world.query(Pose, Beam).eachChunk(({ views, count }) => { for (let row = 0; row < count; row++) views.beam.age[row] = 0.25; });
      if (["nova", "dense"].includes(options.scenario)) { run.novaRing = options.novaTime; startNovaFx(run); run.nova = 0.3; }
      if (options.scenario === "dense" || options.variant === "damage") { fx.damageClock = run.effectClock - 0.05; run.invulnerable = 1; }
      if (options.scenario === "death" || options.scenario === "loss") { run.phase = "dead"; run.hull = 0; observePlayerFx(run); if (fx.death) fx.death.clock -= 0.15; }
      if (options.scenario === "result" || options.variant === "defeat") {
        // Match production clear's removed hulls/parts/projectiles. A clear portrait may show only
        // drawDefeat before 1.45 s; the result menu at 2.3 s has no surviving boss underneath it.
        for (const query of [scene.world.query(Pose, Enemy), scene.world.query(Pose, Bullet), scene.world.query(Pose, Beam), scene.world.query(Pose, Particle)]) {
          query.eachChunk(chunk => { for (let row = 0; row < chunk.count; row++) scene.world.despawn(chunk.entityAt(row)); });
        }
        run.phase = "clear"; run.bossHealth = 0; run.finishTimer = options.variant === "defeat" ? 0.3 : 2.3;
        run.bossDeathX = 320; run.bossDeathY = 90; run.bannerKind = "sector"; run.banner = stage.index === 2 ? "STARFALL / VICTORY" : `${stage.name} SECURED`; run.bannerTime = 5;
      }
      state.ready = state.frozen = true;
    });
  } };
  return { definition, state, warmup };
}
