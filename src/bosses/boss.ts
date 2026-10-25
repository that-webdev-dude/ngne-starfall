import type { Frame, SchemaQuery, SchemaQueryViews } from "@ngne/core";
import type { Enemy, Pose } from "../components/combat.ts";
import type { Kind } from "../config/enemies.ts";
import { LAYER } from "../config/layers.ts";
import { fromLegacy } from "../config/view.ts";
import type { NativeFrame } from "../services/rev01-assets.ts";
import type { CombatContext } from "../systems/combat-context.ts";
import { centredX, drawText } from "../ui/bitmap-text.ts";
import { TEXT_COLOR } from "../ui/presentation.ts";
import { drawNative, type NativeDraw } from "../ui/sprite.ts";
import type { RunState } from "../world/session.ts";
import type { Point } from "./sockets.ts";

/** One stage's boss encounter: owns its spawn, patterns, part state and all of its visuals. */
export interface Boss {
    /** Spawns the boss and its parts when the boss phase starts. */
    spawn(): void;
    /** Moves the boss and its parts and fires due patterns; runs every simulated tick until the stage ends. */
    update(dt: number): void;
    /**
     * Draws the hull, its parts (live, destroyed or husk), telegraphs and the defeat frame. `frame` is the raw
     * native frame (`drawNative`); `legacy` keeps the pre-rev01 rounding for the code-drawn curtain-gap hint.
     */
    render(frame: Frame, alpha: number, legacy: Frame): void;
}
export interface BossDefinition {
    name: string;
    hp: number;
    clearBonus: number;
    create(context: Omit<CombatContext, "boss">): Boss;
}

type EnemyViews = SchemaQueryViews<[typeof Pose, typeof Enemy]>;
export interface BossRow {
    p: EnemyViews["pose"];
    e: EnemyViews["enemy"];
    row: number;
}

/**
 * The live boss row, plus a bitmask of part slots (`Enemy.pattern`) that still have an entity.
 * A part counts as destroyed once its entity is gone; borrowed views are valid until the next commit.
 */
export function locate(
    enemies: SchemaQuery<[typeof Pose, typeof Enemy]>,
    bossKind: Kind,
    partKind: Kind,
): { boss?: BossRow; parts: number } {
    let boss: BossRow | undefined,
        parts = 0;
    enemies.eachChunk(({ views, count }) => {
        const e = views.enemy;
        for (let row = 0; row < count; row++)
            if (e.active[row]) {
                if (e.kind[row] === bossKind && e.hp[row] > 0) boss ??= { p: views.pose, e, row };
                else if (e.kind[row] === partKind) parts |= 1 << e.pattern[row];
            }
    });
    return { boss, parts };
}
/** Zeroes the health of part slots whose entity is gone; firing keeps using the health copied last update. */
export function forgetDestroyed(health: number[], parts: number): void {
    for (let i = 0; i < health.length; i++) if (!(parts & (1 << i))) health[i] = 0;
}

/**
 * Pattern clock shared by the three bosses (unchanged): pattern `i` is due at `floor(i / 8) * 12 + times[i % 8]`
 * seconds after the entry delay; the cue is raised `cueLead` seconds earlier.
 */
export interface BossSchedule {
    entry: number;
    period: number;
    times: readonly number[];
    cueLead: number;
}
export const patternDue = (schedule: BossSchedule, index: number): number =>
    Math.floor(index / 8) * schedule.period + schedule.times[index % 8];
/** Seconds since the last fired pattern (fireIndex - 1), or Infinity before the first one. */
export const sinceLastPattern = (
    schedule: BossSchedule,
    time: number,
    fireIndex: number,
): number => (fireIndex > 0 ? time - patternDue(schedule, fireIndex - 1) : Infinity);

/** Index into a looping sequence of durations (seconds) at `time`. */
export function loopIndex(time: number, durations: readonly number[]): number {
    const total = durations.reduce((sum, d) => sum + d, 0);
    let t = ((time % total) + total) % total;
    for (let i = 0; i < durations.length; i++) {
        if (t < durations[i]) return i;
        t -= durations[i];
    }
    return durations.length - 1;
}

/** Hit feedback tint (0.07 s per hit). Reduced motion drops it: sustained fire would make it blink. */
export const HIT_TINT = 0xffb7b0;
export const hitColor = (flash: number, reducedMotion: boolean): number =>
    flash > 0 && !reducedMotion ? HIT_TINT : 0xffffff;

/**
 * Code-drawn attack cue (the pre-rev01 pulsing square), kept only where the art has no telegraph frame
 * (interceptor aim, Kiln head). Reduced motion holds its mean size instead of pulsing.
 */
export function drawAttackCue(
    legacy: Frame,
    x: number,
    y: number,
    clock: number,
    reducedMotion: boolean,
): void {
    const half = fromLegacy(2 + (reducedMotion ? 0 : Math.sin(clock * 36) * 0.7));
    legacy.rect(x, y, half * 2, half * 2, 0xffbb7c, 0.8, LAYER.enemyCue);
}

/** Curtain-gap hint: code lane keeps its rounding, native 5x7 label uses the heading palette. */
export function drawGap(
    frame: Frame,
    native: Frame,
    x: number,
    width: number,
    color: number,
): void {
    frame.rect(x, fromLegacy(151), width, fromLegacy(230), color, 0.07, LAYER.floorTelegraph, true);
    drawText(native, "GAP", centredX("GAP", Math.round(x)), 48, TEXT_COLOR.heading, LAYER.hudText);
}

/** The defeat pose is shown tinted at the death position until the clear cascade's last burst (1.45 s), as before. */
export const DEFEAT = { tint: 0x9c706b, seconds: 1.45 } as const;
export const defeatShown = (run: RunState): boolean =>
    run.phase === "clear" && run.finishTimer < DEFEAT.seconds;
export interface DefeatPart {
    art: NativeFrame;
    offset?: Point;
    draw: Omit<NativeDraw, "color">;
}
export function drawDefeat(frame: Frame, run: RunState, parts: readonly DefeatPart[]): void {
    if (!defeatShown(run)) return;
    for (const { art, offset = [0, 0], draw } of parts)
        drawNative(frame, art, run.bossDeathX + offset[0], run.bossDeathY + offset[1], {
            ...draw,
            color: DEFEAT.tint,
        });
}
