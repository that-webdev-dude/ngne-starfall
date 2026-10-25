import { clamp, lerp, type Frame } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { LAYER } from "../config/layers.ts";
import { fromLegacy as w } from "../config/view.ts";
import { spawnEnemy } from "../entities/combat.ts";
import { rev01Sprite } from "../services/rev01-assets.ts";
import { drawNative } from "../ui/sprite.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import {
    drawAttackCue,
    drawDefeat,
    drawGap,
    forgetDestroyed,
    hitColor,
    locate,
    loopIndex,
    patternDue,
    type BossDefinition,
    type BossSchedule,
} from "./boss.ts";
import { placeSocket, specSocket, type PartPose, type Point } from "./sockets.ts";

const HEAD = rev01Sprite("kilnHead"),
    SEGMENT = rev01Sprite("kilnSegment");
const MAX_HP = enemySpec(Kind.KilnHead).hp,
    SECTIONS = 3;

/** Patterns 0-2 fans, 3-4 rings (+ two shots per surviving section), 5-7 curtains; times unchanged. */
export const KILN_SCHEDULE: BossSchedule = {
    entry: 2.7,
    period: 12,
    times: [0.8, 2, 3.2, 4.8, 6, 8.2, 9.3, 10.4],
    cueLead: 0.7,
};
/** Both Kiln parts are drawn rotated by exactly -90 degrees (canvas +x to screen up; the drill points screen +x). */
export const KILN_POSE: PartPose = { rotation: -90 };
/** Owner decision 1: successive joints never come closer than 34 px horizontally (spec kilnHead.integration). */
export const KILN_MIN_JOINT_SPACING = 34;
/** A segment shows "compressed" while a link next to it turns faster than this (rad/s); about the median link turn rate. */
export const KILN_COMPRESS_RATE = 0.25;

/** Head path (unchanged). */
export const kilnHeadX = (time: number): number => w(275) + Math.sin(time * 0.5) * w(90);
/** Original section path (unchanged): 0.3 s phase lag and (i + 1) x 34 legacy px behind the head, bobbing 12 legacy px. */
export function kilnSectionPath(time: number, headY: number, section: number): Point {
    return [
        kilnHeadX(time - (section + 1) * 0.3) - (section + 1) * w(34),
        headY + w(6) + Math.sin(time * 1.2 - section * 0.8) * w(12),
    ];
}
/**
 * Section joints behind the head: each keeps its original path unless it would come closer than 34 px (x) to the
 * joint ahead, in which case only that positional lag is capped. Colliders, husks, sprites and couplings use these.
 */
export function kilnChain(time: number, headY: number): Point[] {
    const joints: Point[] = [];
    let ahead = kilnHeadX(time);
    for (let section = 0; section < SECTIONS; section++) {
        const [x, y] = kilnSectionPath(time, headY, section);
        ahead = Math.min(x, ahead - KILN_MIN_JOINT_SPACING);
        joints.push([ahead, y]);
    }
    return joints;
}
/** Per section: true while either adjacent link (head included as joint 0) turned faster than KILN_COMPRESS_RATE over the tick. */
export function kilnCompressed(
    previous: readonly Point[],
    current: readonly Point[],
    dt: number,
): boolean[] {
    const angle = (joints: readonly Point[], i: number) =>
        Math.atan2(joints[i][1] - joints[i + 1][1], joints[i][0] - joints[i + 1][0]);
    const turning = (link: number) =>
        link >= 0 &&
        link < current.length - 1 &&
        Math.abs(angle(current, link) - angle(previous, link)) > KILN_COMPRESS_RATE * dt;
    return Array.from(
        { length: current.length - 1 },
        (_, section) => turning(section) || turning(section + 1),
    );
}
/** Head frame: the cut loop, the damaged loop from phase 2 (HP < 1/2); reduced motion holds each loop's first frame. */
const HEAD_LOOP = HEAD.playback!.durationsMs.map((ms) => ms / 1000);
export function kilnHeadFrame(hp: number, clock: number, reducedMotion: boolean): string {
    return `${hp < MAX_HP / 2 ? "damaged" : "cut"}-${reducedMotion ? 0 : loopIndex(clock, HEAD_LOOP)}`;
}

/** Code-drawn link (no sprite): a 5 px steel[0] band with a steel[2] centre line between two coupling pixels. */
const LINK = { width: 5, color: 0x3a3d4a, core: 1, coreColor: 0x9a9ca0 } as const;
/** Screen pixel centre of a coupling socket on a part drawn at (x, y) with the Kiln rotation. */
export function couplingPoint(x: number, y: number, socket: Point): Point {
    const [dx, dy] = placeSocket(socket, KILN_POSE);
    return [Math.floor(x) + dx + 0.5, Math.floor(y) + dy + 0.5];
}
function drawLink(frame: Frame, from: Point, to: Point): void {
    const dx = from[0] - to[0],
        dy = from[1] - to[1],
        length = Math.hypot(dx, dy);
    if (length < 1) return;
    const link = {
        x: (from[0] + to[0]) / 2,
        y: (from[1] + to[1]) / 2,
        width: length,
        rotation: Math.atan2(dy, dx),
        layer: LAYER.bossLink,
    };
    frame.sprite({ ...link, height: LINK.width, color: LINK.color });
    frame.sprite({ ...link, height: LINK.core, color: LINK.coreColor });
}

/** Stage 2 serpent: a head trailed by three destructible sections (pattern 0-2) that add fans to its rings. */
export const kilnSerpent: BossDefinition = {
    name: "KILN SERPENT",
    hp: MAX_HP,
    clearBonus: 5000,
    create({ scene, run, session, sound, hostiles: { emit } }) {
        const enemies = scene.world.query(Pose, Enemy);
        const sections = Array.from({ length: SECTIONS }, () => enemySpec(Kind.KilnSegment).hp);
        const schedule = KILN_SCHEDULE;
        // Joint chain of the last two updates (head first) for husks and the compressed state; empty until the head exists.
        let previous: Point[] = [],
            current: Point[] = [],
            compressed = [false, false, false];
        // Keep husks on the same frozen poses as live ECS parts after a hit-stop or scene reset.
        scene.resetInterpolation(() => {
            previous = current;
        });
        return {
            spawn() {
                spawnEnemy(scene.world, run, Kind.KilnHead, w(240), w(-40));
                for (let i = 0; i < sections.length; i++)
                    spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), {
                        hp: 55,
                        pattern: i,
                    });
            },
            update(dt) {
                const { boss, parts } = locate(enemies, Kind.KilnHead, Kind.KilnSegment);
                let bossY = w(-40),
                    bossAge = 0;
                if (boss) {
                    const { p, e, row } = boss,
                        time = Math.max(0, e.age[row] - schedule.entry);
                    forgetDestroyed(sections, parts);
                    p.x[row] = kilnHeadX(time);
                    p.y[row] = Math.min(w(65), p.y[row] + dt * w(40));
                    bossY = p.y[row];
                    bossAge = time;
                    run.bossHealth = Math.max(0, e.hp[row]);
                    const phase = e.hp[row] < kilnSerpent.hp / 2 ? 2 : 1;
                    if (phase > run.bossPhase) {
                        run.bossPhase = phase;
                        run.banner = `PHASE ${phase} / CORE OVERHEAT`;
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
                        if (index === 5) e.originX[row] = clamp(p.x[row], w(80), w(400));
                    }
                    if (time >= due) {
                        if (index < 3)
                            emit(
                                p.x[row],
                                p.y[row] + w(18),
                                fan(
                                    Math.PI / 2 + (index % 2 ? -0.3 : 0.3),
                                    phase === 1 ? 7 : 9,
                                    Math.PI * 0.47,
                                    w(60),
                                ),
                                0xffaa76,
                            );
                        else if (index < 5) {
                            emit(
                                p.x[row],
                                p.y[row] + w(12),
                                ring(
                                    phase === 1 ? 10 : 14,
                                    index === 4 ? Math.PI / 14 : 0,
                                    w(phase === 1 ? 46 : 50),
                                ),
                                0xffaa76,
                            );
                            // Section fans keep their original head-relative origin; destroyed sections (husks) add nothing.
                            for (let i = 0; i < 3; i++)
                                if (sections[i] > 0)
                                    emit(
                                        p.x[row] - (i + 1) * w(34),
                                        p.y[row] + w(12),
                                        fan(Math.PI / 2, 2, 0.7, w(42)),
                                        0xffdf87,
                                    );
                        } else
                            for (const x of curtainPositions(
                                e.originX[row],
                                w(72),
                                index % 2 === 0 ? w(12) : 0,
                            ))
                                emit(x, w(38), [{ vx: 0, vy: w(50) }], 0xffaa76);
                        e.fireIndex[row]++;
                        e.cue[row] = 0;
                    }
                }
                const joints = kilnChain(bossAge, bossY);
                if (boss) {
                    const chain = [[boss.p.x[boss.row], boss.p.y[boss.row]] as Point, ...joints];
                    previous = current.length ? current : chain;
                    current = chain;
                    compressed = kilnCompressed(previous, current, dt);
                } else {
                    previous = [];
                    current = [];
                }
                enemies.eachChunk(({ views, count }) => {
                    const p = views.pose,
                        e = views.enemy;
                    for (let row = 0; row < count; row++)
                        if (e.active[row] && e.kind[row] === Kind.KilnSegment) {
                            const i = e.pattern[row];
                            p.x[row] = joints[i][0];
                            p.y[row] = joints[i][1];
                            sections[i] = Math.max(0, e.hp[row]);
                        }
                });
            },
            render(frame, alpha, legacy) {
                drawDefeat(frame, run, [
                    {
                        art: HEAD.frame("defeat"),
                        draw: { layer: LAYER.enemyDetail, rotation: -90 },
                    },
                ]);
                const reduced = session.settings.reducedMotion;
                const { boss } = locate(enemies, Kind.KilnHead, Kind.KilnSegment);
                if (!boss) return;
                const { p, e, row } = boss;
                // Joints: head, then each section from its entity (collider position) or, once destroyed, as a husk on the chain.
                const head: Point = [
                    lerp(p.px[row], p.x[row], alpha),
                    lerp(p.py[row], p.y[row], alpha),
                ];
                const parts: ({ at: Point; frame: string; flash: number } | undefined)[] = [
                    undefined,
                    undefined,
                    undefined,
                ];
                enemies.eachChunk(({ views, count }) => {
                    for (let i = 0; i < count; i++)
                        if (views.enemy.active[i] && views.enemy.kind[i] === Kind.KilnSegment) {
                            const section = views.enemy.pattern[i];
                            parts[section] = {
                                at: [
                                    lerp(views.pose.px[i], views.pose.x[i], alpha),
                                    lerp(views.pose.py[i], views.pose.y[i], alpha),
                                ],
                                frame: compressed[section] ? "compressed" : "idle",
                                flash: views.enemy.flash[i],
                            };
                        }
                });
                const sections = parts.map(
                    (part, section) =>
                        part ??
                        (current.length
                            ? {
                                  at: [
                                      lerp(
                                          previous[section + 1][0],
                                          current[section + 1][0],
                                          alpha,
                                      ),
                                      lerp(
                                          previous[section + 1][1],
                                          current[section + 1][1],
                                          alpha,
                                      ),
                                  ] as Point,
                                  frame: "destroyed",
                                  flash: 0,
                              }
                            : undefined),
                );
                let ahead = couplingPoint(head[0], head[1], specSocket("kilnHead", "rearCoupling"));
                for (const section of sections) {
                    if (!section) break;
                    const [x, y] = section.at;
                    drawLink(
                        frame,
                        ahead,
                        couplingPoint(
                            x,
                            y,
                            specSocket("kilnSegment", "frontCoupling", section.frame),
                        ),
                    );
                    drawNative(frame, SEGMENT.frame(section.frame), x, y, {
                        layer: LAYER.enemy,
                        rotation: -90,
                        color: hitColor(section.flash, reduced),
                    });
                    ahead = couplingPoint(
                        x,
                        y,
                        specSocket("kilnSegment", "rearCoupling", section.frame),
                    );
                }
                // The head draws above the sections (spec integration note).
                drawNative(
                    frame,
                    HEAD.frame(kilnHeadFrame(e.hp[row], run.effectClock, reduced)),
                    head[0],
                    head[1],
                    {
                        layer: LAYER.enemyDetail,
                        rotation: -90,
                        color: hitColor(e.flash[row], reduced),
                    },
                );
                // The head has no telegraph frame: its code-drawn attack cue stays (static under reduced motion).
                if (e.cue[row])
                    drawAttackCue(legacy, head[0], head[1] + w(8), run.effectClock, reduced);
                if (e.cue[row] === 2 && e.fireIndex[row] % 8 >= 5)
                    drawGap(legacy, frame, e.originX[row], w(72), 0x77e5c2);
            },
        };
    },
};
