import { lerp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { drawAttackCue, hitColor } from "../bosses/boss.ts";
import { Kind } from "../config/enemies.ts";
import { LAYER } from "../config/layers.ts";
import { rev01Sprite, type NativeSprite } from "../services/rev01-assets.ts";
import { ENEMY_MUZZLES } from "../systems/combat-enemies.ts";
import { drawNative } from "../ui/sprite.ts";
import { ORDINARY_SPRITES, ordinaryFrame } from "./enemy-frames.ts";
import type { RenderPassFactory } from "./pass.ts";
import { drawMine } from "./player-fx.ts";

/**
 * Ordinary enemies as native rev01 frames (spec pivot, one texel per pixel), mines through T2's `drawMine`, then the
 * boss's own render (hull, parts, husks, telegraphs, defeat). Boss and part kinds are drawn only by their boss.
 */
export const createEnemyRender: RenderPassFactory = ({ scene, run, session, boss }) => {
    const enemies = scene.world.query(Pose, Enemy);
    const sprites = new Map<number, NativeSprite>(
        Object.entries(ORDINARY_SPRITES).map(([kind, id]) => [Number(kind), rev01Sprite(id!)]),
    );
    return (frame, alpha, legacy) => {
        const reduced = session.settings.reducedMotion;
        enemies.eachChunk((chunk) => {
            const p = chunk.views.pose,
                e = chunk.views.enemy;
            for (let row = 0; row < chunk.count; row++) {
                if (!e.active[row]) continue;
                const x = lerp(p.px[row], p.x[row], alpha),
                    y = lerp(p.py[row], p.y[row], alpha),
                    kind = e.kind[row];
                // Native frame and legacy wrapper both pass through: T2's native mine quads must not go through legacy rounding.
                if (kind === Kind.Mine) {
                    drawMine(frame, legacy, x, y, Boolean(e.cue[row]), run.effectClock);
                    continue;
                }
                const sprite = sprites.get(kind);
                if (!sprite) continue;
                const name = ordinaryFrame(
                    kind,
                    {
                        age: e.age[row],
                        cue: e.cue[row],
                        cooldown: e.cooldown[row],
                        fireIndex: e.fireIndex[row],
                    },
                    reduced,
                );
                drawNative(frame, sprite.frame(name), x, y, {
                    layer: LAYER.enemy,
                    color: hitColor(e.flash[row], reduced),
                });
                // The interceptor's aim telegraph has no frame in the art: keep the code cue, now at its spec muzzle.
                if (kind === Kind.Interceptor && e.cue[row])
                    drawAttackCue(
                        legacy,
                        x + ENEMY_MUZZLES.interceptor[0],
                        y + ENEMY_MUZZLES.interceptor[1],
                        run.effectClock,
                        reduced,
                    );
            }
        });
        boss.render(frame, alpha, legacy);
    };
};
