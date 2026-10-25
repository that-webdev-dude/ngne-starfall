import { createBackgroundRender } from "../render/background.ts";
import { createEnemyRender } from "../render/enemies.ts";
import { createHudRender } from "../render/hud.ts";
import type { RenderPass } from "../render/pass.ts";
import { createPlayerFxRender } from "../render/player-fx.ts";
import { pixelSnapped } from "../ui/sprite.ts";
import type { CombatContext } from "./combat-context.ts";

/**
 * Stage render composition. Each pass owns one responsibility (background, enemies/bosses, player/effects, HUD);
 * draw order matches the pre-split renderer and the shared layer table decides stacking.
 */
export function installCombatRender(context: CombatContext): void {
    const passes: RenderPass[] = [
        createBackgroundRender(context),
        createEnemyRender(context),
        createPlayerFxRender(context),
        createHudRender(context),
    ];
    // Native frames need whole-pixel edges; code-drawn geometry keeps its existing rounded centres.
    context.scene.camera.pixelSnap = false;
    context.scene.render((frame, alpha) => {
        const legacy = pixelSnapped(frame);
        for (const pass of passes) pass(frame, alpha, legacy);
    });
}
