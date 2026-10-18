import { pressed, type Asset, type PreparedScene, type SceneDefinition, type SceneSetup } from "@ngne/core";
import { Flight } from "../components/flight.ts";
import { Bullet, Enemy, Pose } from "../components/combat.ts";
import { newRun, type Progress, type ProgressCommand, type Session } from "../world/session.ts";
import { createEffects, installCombatEffects } from "../systems/combat-effects.ts";
import { installCombatPlayer } from "../systems/combat-player.ts";
import { installCombatEnemies } from "../systems/combat-enemies.ts";
import { installCombatCollision } from "../systems/combat-collision.ts";
import { installCombatRender } from "../systems/combat-render.ts";
import type { CombatSound } from "../systems/combat-context.ts";
import { STAGES } from "../config/stages.ts";
import { installAdvancedEnemies } from "../systems/advanced-enemies.ts";
import { createHostileFire } from "../systems/hostile-fire.ts";

export interface StageServices {
  assets: readonly Asset[];
  sound(scene: SceneSetup<Progress, ProgressCommand>): CombatSound;
  take(purpose: "pause" | "result"): PreparedScene | undefined;
}
export function stageScene(session: Session, services: StageServices, stageIndex = 0, entryScore = 0): SceneDefinition<Progress, ProgressCommand> {
  const stage = STAGES[stageIndex];
  if (!stage) throw new Error(`Unknown stage ${stageIndex}`);
  return {
    id: stage.id, assets: services.assets,
    setup(scene) {
      const run = scene.resource("run", newRun(stageIndex, entryScore)); run.banner = stage.name; session.run = run; session.screen = "playing";
      scene.world.spawn(Flight.of({ x: 240, px: 240, y: 206, py: 206 }));
      const sound = services.sound(scene), base = { scene, run, session, sound, stage };
      const context = { ...base, burst: createEffects(base), hostiles: createHostileFire(base) };
      const progress = scene.state();
      let pauseRequested = false, cascadeIndex = 0;
      scene.system(({ input, scenes }) => {
        if (pressed(input, "Escape") || pressed(input, "KeyP") || pressed(input, "Pad9")) pauseRequested = true;
        if (pauseRequested && run.phase !== "clear" && run.phase !== "dead") {
          const candidate = services.take("pause"); if (candidate) { pauseRequested = false; scenes.push(candidate); }
        }
      });
      installCombatPlayer(context); installCombatEnemies(context); installAdvancedEnemies(context); installCombatCollision(context); installCombatEffects(context);
      scene.system(({ dt, scenes }) => {
        if (run.phase !== "dead" && run.phase !== "clear") return;
        if (!run.finished) { run.finished = true; progress.dispatch({ type: "finish", score: run.score }); }
        run.finishTimer += dt;
        if (run.phase === "clear") {
          const cascade = [[0.2, -33, 3], [0.5, 33, 3], [0.8, -17, -7], [1.1, 19, 12], [1.45, 0, 0]];
          if (cascadeIndex < cascade.length && run.finishTimer >= cascade[cascadeIndex][0]) {
            const [, x, y] = cascade[cascadeIndex];
            context.burst(run.bossDeathX + x, run.bossDeathY + y, 0xffc58d, cascadeIndex === 4 ? 90 : 30, true);
            sound.kill(true); run.shake = cascadeIndex === 4 ? 5 : 2.5;
            if (cascadeIndex === 4) sound.clear();
            cascadeIndex++;
          }
        }
        if (run.finishTimer > (run.phase === "clear" ? 2.2 : 1.2)) { const result = services.take("result"); if (result) scenes.push(result); }
      });
      const players = scene.world.query(Flight), enemies = scene.world.query(Pose, Enemy), bullets = scene.world.query(Pose, Bullet);
      scene.resetInterpolation(() => {
        players.eachChunk((chunk) => { const p = chunk.views.flight; for (let row = 0; row < chunk.count; row++) { p.px[row] = p.x[row]; p.py[row] = p.y[row]; p.previousBank[row] = p.bank[row]; } });
        for (const query of [enemies, bullets]) query.eachChunk((chunk) => { const p = chunk.views.pose; for (let row = 0; row < chunk.count; row++) { p.px[row] = p.x[row]; p.py[row] = p.y[row]; } });
      });
      installCombatRender(context);
    },
  };
}
