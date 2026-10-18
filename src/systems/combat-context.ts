import type { SceneSetup } from "@ngne/core";
import type { Progress, ProgressCommand, RunState, Session, CombatPhase } from "../world/session.ts";
import type { StageConfig } from "../config/stages.ts";
import type { HostileFire } from "./hostile-fire.ts";
export interface CombatSound {
  update(dt: number, phase: CombatPhase): void; shoot(): void; enemyShot(): void; hit(): void;
  kill(big?: boolean): void; nova(): void; damage(): void; boss(): void; clear(): void; death(): void;
}
export interface CombatContext {
  scene: SceneSetup<Progress, ProgressCommand>; run: RunState; session: Session; sound: CombatSound;
  stage: StageConfig;
  burst(x: number, y: number, color: number, count: number, explosion?: boolean): void;
  hostiles: HostileFire;
}
