import type { SceneSetup } from "@ngne/core";
import type { Progress, ProgressCommand, RunState, Session } from "../world/session.ts";
import type { StageConfig } from "../config/stages.ts";
import type { HostileFire } from "./hostile-fire.ts";
import type { CombatSound } from "../services/sound.ts";
export type { CombatSound };
export interface CombatContext {
  scene: SceneSetup<Progress, ProgressCommand>; run: RunState; session: Session; sound: CombatSound;
  stage: StageConfig;
  burst(x: number, y: number, color: number, count: number, explosion?: boolean): void;
  hostiles: HostileFire;
}
