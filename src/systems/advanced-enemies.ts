import { clamp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { specSocket } from "../bosses/sockets.ts";
import { COMBAT } from "../config/encounters.ts";
import { Kind } from "../config/enemies.ts";
import { REV01_GAMEPLAY } from "../config/rev01-gameplay.ts";
import { fromLegacy as w } from "../config/view.ts";
import { spawnBeam, spawnEnemy } from "../entities/combat.ts";
import { ring } from "../world/patterns.ts";
import type { CombatContext } from "./combat-context.ts";

/** Minelayer/Warden timing (seconds, unchanged): telegraph lead before the action and the cooldown after it. Shared with the renderer. */
export const LAYER_CRAFT_TIMING = { cue: 0.8, reload: { minelayer: 3, warden: 3.3 } } as const;
/** The mine spawns on the spec mineRelease socket, where the minelayer's release frame shows it. */
export const MINE_RELEASE = specSocket("minelayer", "mineRelease");

export function installAdvancedEnemies({ scene, run, sound, hostiles }: CombatContext): void {
    const enemies = scene.world.query(Pose, Enemy),
        { emit } = hostiles;
    scene.system(({ dt }) => {
        if (run.phase === "clear" || run.phase === "dead") return;
        enemies.eachChunk((chunk) => {
            const p = chunk.views.pose,
                e = chunk.views.enemy;
            for (let row = 0; row < chunk.count; row++) {
                if (!e.active[row] || e.hp[row] <= 0) continue;
                const kind = e.kind[row],
                    age = e.age[row];
                if (kind === Kind.Minelayer || kind === Kind.Warden) {
                    p.y[row] += dt * w(p.y[row] < w(65) ? 30 : age > 12 ? 45 : 2);
                    p.x[row] =
                        e.originX[row] + Math.sin(age * 0.65) * w(kind === Kind.Minelayer ? 20 : 9);
                    e.cooldown[row] -= dt;
                    // Warden lanes aim at the player x (stored in targetAngle), clamped to the legacy 24..456 at 4/3.
                    if (e.cooldown[row] < LAYER_CRAFT_TIMING.cue && !e.cue[row]) {
                        e.cue[row] = 1;
                        e.targetAngle[row] = clamp(run.x, w(24), w(456));
                    }
                    if (e.cooldown[row] <= 0) {
                        if (
                            kind === Kind.Minelayer &&
                            !hostiles.suppressed &&
                            enemies.size < COMBAT.enemyCap
                        )
                            spawnEnemy(
                                scene.world,
                                run,
                                Kind.Mine,
                                p.x[row] + MINE_RELEASE[0],
                                p.y[row] + MINE_RELEASE[1],
                                { cooldown: 1.8 },
                            );
                        else if (kind === Kind.Warden && !hostiles.suppressed) {
                            spawnBeam(
                                scene.world,
                                e.targetAngle[row],
                                REV01_GAMEPLAY.beamWidth.warden,
                                0.8,
                                0.55,
                            );
                            sound.enemyShot();
                        }
                        // fireIndex counts fire steps (Warden fire frame); it drives no gameplay for these kinds.
                        e.cooldown[row] =
                            kind === Kind.Minelayer
                                ? LAYER_CRAFT_TIMING.reload.minelayer
                                : LAYER_CRAFT_TIMING.reload.warden;
                        e.cue[row] = 0;
                        e.fireIndex[row]++;
                    }
                    if (p.y[row] > w(295)) {
                        e.active[row] = 0;
                        scene.world.despawn(chunk.entityAt(row));
                    }
                }
                if (kind === Kind.Mine) {
                    p.y[row] += dt * w(13);
                    e.cooldown[row] -= dt;
                    if (e.cooldown[row] < 0.8) e.cue[row] = 1;
                    if (e.cooldown[row] <= 0) {
                        emit(p.x[row], p.y[row], ring(8, age * 0.15, w(48)), 0xffbc74);
                        e.active[row] = 0;
                        scene.world.despawn(chunk.entityAt(row));
                    }
                }
            }
        });
    });
}
