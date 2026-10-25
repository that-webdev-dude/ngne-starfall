import type { SceneSetup } from "@ngne/core";
import type { Progress, ProgressCommand, RunState, Session } from "../world/session.ts";
import type { StageConfig } from "../config/stages.ts";
import type { HostileFire } from "./hostile-fire.ts";
import type { CombatSound } from "../services/sound.ts";
import type { Boss } from "../bosses/boss.ts";
import type { EffectKind } from "../render/player-fx-model.ts";
export type { CombatSound };
export interface CombatContext {
    scene: SceneSetup<Progress, ProgressCommand>;
    run: RunState;
    session: Session;
    sound: CombatSound;
    stage: StageConfig;
    /** Particles plus an optional effect sprite (`true` = explosion); `still` keeps the particles in place (presentation only). */
    burst(
        x: number,
        y: number,
        color: number,
        count: number,
        effect?: boolean | EffectKind,
        still?: boolean,
    ): void;
    hostiles: HostileFire;
    boss: Boss;
}
