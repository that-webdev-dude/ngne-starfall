import { clamp, lerp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { LAYER } from "../config/layers.ts";
import { REV01_GAMEPLAY } from "../config/rev01-gameplay.ts";
import { fromLegacy as w } from "../config/view.ts";
import { spawnBeam, spawnEnemy } from "../entities/combat.ts";
import { rev01Sprite } from "../services/rev01-assets.ts";
import { drawNative } from "../ui/sprite.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import {
    drawDefeat,
    drawGap,
    forgetDestroyed,
    hitColor,
    locate,
    patternDue,
    sinceLastPattern,
    type BossDefinition,
    type BossSchedule,
} from "./boss.ts";
import { addPoint, placeSocket, specSocket, type PartPose, type Point } from "./sockets.ts";

const HULL = rev01Sprite("starfallEngine"),
    EMITTER = rev01Sprite("starfallEmitter");
const MAX_HP = enemySpec(Kind.StarfallEngine).hp;

/** Patterns 0-2 are emitter fans (0 and 2 left, 1 right), 3-5 curtains (+ lanes from phase 2), 6-7 rings; times unchanged. */
export const ENGINE_SCHEDULE: BossSchedule = {
    entry: 2.7,
    period: 12,
    times: [0.8, 1.8, 2.8, 4.5, 5.6, 6.7, 8.4, 10],
    cueLead: 0.7,
};
export const emitterSide = (pattern: number): 0 | 1 => (pattern % 2 === 0 ? 0 : 1);
/** Emitter slot 0 (left) and 1 (right, drawn flipped in x): spec hull sockets, and each slot's muzzle from the boss pivot. */
export const EMITTER_POSES: readonly PartPose[] = [{}, { flipX: true }];
export const EMITTER_SOCKETS: readonly Point[] = [
    specSocket("starfallEngine", "leftEmitter"),
    specSocket("starfallEngine", "rightEmitter"),
];
export const EMITTER_MUZZLES: readonly Point[] = EMITTER_SOCKETS.map((socket, side) =>
    addPoint(socket, placeSocket(specSocket("starfallEmitter", "muzzle"), EMITTER_POSES[side])),
);
/** Spec proposal: emitter firing frame 90 ms; charge is held for the 0.7 s cue. */
export const EMITTER_FIRING_SECONDS = 0.09;

/** Health phase (unchanged thresholds): 1 at full, 2 below 2/3, 3 below 1/3. */
export const enginePhase = (hp: number): 1 | 2 | 3 =>
    hp < MAX_HP / 3 ? 3 : hp < (MAX_HP * 2) / 3 ? 2 : 1;
/** phase-N, or surge-N while the core cue for curtains/rings (cue 2) is up; surge frames only add light to their phase. */
export const engineHullFrame = (hp: number, cue: number): string =>
    `${cue === 2 ? "surge" : "phase"}-${enginePhase(hp)}`;
/** Emitter state: charge while its fan is cued, firing for 90 ms after it fired, down once destroyed. */
export function engineEmitter(
    side: 0 | 1,
    alive: boolean,
    boss: { cue: number; fireIndex: number; time: number },
): "idle" | "charge" | "firing" | "down" {
    if (!alive) return "down";
    const pending = boss.fireIndex % 8,
        last = (boss.fireIndex - 1) % 8;
    if (boss.cue === 1 && pending < 3 && emitterSide(pending) === side) return "charge";
    if (
        boss.fireIndex > 0 &&
        last < 3 &&
        emitterSide(last) === side &&
        sinceLastPattern(ENGINE_SCHEDULE, boss.time, boss.fireIndex) < EMITTER_FIRING_SECONDS
    )
        return "firing";
    return "idle";
}

/** Stage 3 finale: three health phases add charged lanes; two destructible emitters (pattern 0 left, 1 right) fire fans and thicken rings. */
export const starfallEngine: BossDefinition = {
    name: "STARFALL ENGINE",
    hp: MAX_HP,
    clearBonus: 10000,
    create({ scene, run, session, sound, hostiles }) {
        const enemies = scene.world.query(Pose, Enemy),
            { emit } = hostiles;
        const emitters = [enemySpec(Kind.EngineEmitter).hp, enemySpec(Kind.EngineEmitter).hp];
        const schedule = ENGINE_SCHEDULE;
        // Lane width from the spec (15 px at 640, replaces 12 at 480); the lane centre clamp is the legacy 28..452 at 4/3.
        const lane = (x: number) =>
            spawnBeam(
                scene.world,
                clamp(x, w(28), w(452)),
                REV01_GAMEPLAY.beamWidth.starfallEngine,
                1.1,
                0.65,
            );
        return {
            spawn() {
                spawnEnemy(scene.world, run, Kind.StarfallEngine, w(240), w(-40));
                for (let i = 0; i < emitters.length; i++)
                    spawnEnemy(scene.world, run, Kind.EngineEmitter, w(240), w(-40), {
                        hp: 55,
                        pattern: i,
                    });
            },
            update(dt) {
                const { boss, parts } = locate(enemies, Kind.StarfallEngine, Kind.EngineEmitter);
                let bossX = w(240),
                    bossY = w(-40);
                if (boss) {
                    const { p, e, row } = boss,
                        time = Math.max(0, e.age[row] - schedule.entry);
                    forgetDestroyed(emitters, parts);
                    p.x[row] = w(240) + Math.sin(time * 0.4) * w(65);
                    p.y[row] = Math.min(w(65), p.y[row] + dt * w(40));
                    bossX = p.x[row];
                    bossY = p.y[row];
                    run.bossHealth = Math.max(0, e.hp[row]);
                    const phase = enginePhase(e.hp[row]);
                    if (phase > run.bossPhase) {
                        run.bossPhase = phase;
                        run.banner = `PHASE ${phase} / REACTOR SURGE`;
                        run.bannerTime = 1.4;
                        run.bannerKind = "phase";
                        sound.boss();
                    }
                    const cycle = Math.floor(e.fireIndex[row] / 8),
                        index = e.fireIndex[row] % 8;
                    const due = patternDue(schedule, e.fireIndex[row]);
                    if (time > due - schedule.cueLead && !e.cue[row]) {
                        e.cue[row] = index < 3 ? 1 : 2;
                        e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]);
                        if (index === 3) e.originX[row] = w(cycle % 2 ? 350 : 130);
                    }
                    if (time >= due) {
                        if (index < 3) {
                            const side = emitterSide(index),
                                [mx, my] = EMITTER_MUZZLES[side];
                            if (emitters[side] > 0)
                                emit(
                                    p.x[row] + mx,
                                    p.y[row] + my,
                                    fan(
                                        e.targetAngle[row],
                                        phase === 1 ? 7 : 9,
                                        1.25,
                                        w(54 + phase * 4),
                                    ),
                                    0xf4a0e4,
                                );
                        } else if (index < 6) {
                            for (const x of curtainPositions(
                                e.originX[row],
                                w(88 - phase * 8),
                                index % 2 === 0 ? w(12) : 0,
                            ))
                                emit(x, w(38), [{ vx: 0, vy: w(48 + phase * 2) }], 0xd794ff);
                            if (index === 3 && phase > 1 && !hostiles.suppressed) {
                                lane(run.x);
                                if (phase === 3) lane(run.x + (run.x < w(240) ? w(100) : -w(100)));
                            }
                        } else {
                            const count =
                                (phase === 1 ? 14 : phase === 2 ? 18 : 20) -
                                (emitters[0] <= 0 ? 3 : 0) -
                                (emitters[1] <= 0 ? 3 : 0);
                            emit(
                                p.x[row],
                                p.y[row] + w(10),
                                ring(count, index === 7 ? Math.PI / count : 0, w(40 + phase * 4)),
                                0xff88c8,
                            );
                        }
                        e.fireIndex[row]++;
                        e.cue[row] = 0;
                    }
                }
                enemies.eachChunk(({ views, count }) => {
                    const p = views.pose,
                        e = views.enemy;
                    for (let row = 0; row < count; row++)
                        if (e.active[row] && e.kind[row] === Kind.EngineEmitter) {
                            const side = e.pattern[row] ? 1 : 0,
                                [sx, sy] = EMITTER_SOCKETS[side];
                            p.x[row] = bossX + sx;
                            p.y[row] = bossY + sy;
                            emitters[side] = Math.max(0, e.hp[row]);
                        }
                });
            },
            render(frame, alpha, legacy) {
                drawDefeat(frame, run, [
                    { art: HULL.frame("defeat"), draw: { layer: LAYER.enemy } },
                    ...EMITTER_SOCKETS.map((offset, side) => ({
                        art: EMITTER.frame("down"),
                        offset,
                        draw: { layer: LAYER.enemyDetail, flipX: EMITTER_POSES[side].flipX },
                    })),
                ]);
                const { boss, parts } = locate(enemies, Kind.StarfallEngine, Kind.EngineEmitter);
                if (!boss) return;
                const { p, e, row } = boss,
                    x = lerp(p.px[row], p.x[row], alpha),
                    y = lerp(p.py[row], p.y[row], alpha),
                    index = e.fireIndex[row] % 8;
                const reduced = session.settings.reducedMotion;
                if (e.cue[row] === 2 && index >= 3 && index < 6)
                    drawGap(legacy, frame, e.originX[row], w(88 - run.bossPhase * 8), 0x77e5c2);
                drawNative(frame, HULL.frame(engineHullFrame(e.hp[row], e.cue[row])), x, y, {
                    layer: LAYER.enemy,
                    color: hitColor(e.flash[row], reduced),
                });
                const flash = [0, 0];
                enemies.eachChunk(({ views, count }) => {
                    for (let i = 0; i < count; i++)
                        if (views.enemy.active[i] && views.enemy.kind[i] === Kind.EngineEmitter)
                            flash[views.enemy.pattern[i] ? 1 : 0] = views.enemy.flash[i];
                });
                const state = {
                    cue: e.cue[row],
                    fireIndex: e.fireIndex[row],
                    time: Math.max(0, e.age[row] - schedule.entry),
                };
                EMITTER_SOCKETS.forEach((socket, index) => {
                    const side = index as 0 | 1,
                        name = engineEmitter(side, Boolean(parts & (1 << side)), state);
                    drawNative(frame, EMITTER.frame(name), x + socket[0], y + socket[1], {
                        layer: LAYER.enemyDetail,
                        flipX: EMITTER_POSES[side].flipX,
                        color: name === "down" ? 0xffffff : hitColor(flash[side], reduced),
                    });
                });
            },
        };
    },
};
