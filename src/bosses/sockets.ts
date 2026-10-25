import { rev01Sprite, type Rev01Id } from "../services/rev01-assets.ts";
import type { Shot } from "../world/patterns.ts";

/**
 * Native rev01 sockets (art spec `sprites[].sockets`): [dx, dy] from the pivot pixel in 640x360 logical pixels, +y down.
 * They are already at final size and are never scaled; the legacy-measured BOSS/ENGINE socket tables are not used.
 */
export type Point = readonly [number, number];
/** The draw transform of one part instance, exactly as `drawNative` applies it. */
export interface PartPose {
    flipX?: boolean;
    rotation?: 0 | -90;
}

const isPoint = (value: unknown): value is Point =>
    Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number");

/** One socket; per-frame sockets (an object keyed by frame name) need the frame. */
export function specSocket(id: Rev01Id, name: string, frame?: string): Point {
    const entry = rev01Sprite(id).spec.sockets?.[name];
    const value =
        entry && !Array.isArray(entry) && typeof entry === "object"
            ? (entry as Record<string, unknown>)[frame ?? ""]
            : entry;
    if (!isPoint(value))
        throw new Error(`rev01 ${id}.${name}${frame ? `[${frame}]` : ""} is not a single socket`);
    return value;
}
/** A socket list (e.g. both barrels of a turret), in spec order. */
export function specSocketList(id: Rev01Id, name: string): Point[] {
    const entry = rev01Sprite(id).spec.sockets?.[name];
    if (!Array.isArray(entry) || !entry.every(isPoint))
        throw new Error(`rev01 ${id}.${name} is not a socket list`);
    return entry;
}

/**
 * Screen offset of a socket under a part's draw transform: flipX mirrors dx about the pivot column (right-hand
 * turret/emitter, "negate dx"); rotation -90 turns canvas +x to screen up, so (dx, dy) lands at (dy, -dx) (Kiln).
 * Integer sockets stay on whole pixels relative to the pivot pixel.
 */
export function placeSocket([dx, dy]: Point, pose: PartPose = {}): Point {
    const x = pose.flipX ? 0 - dx : dx;
    return pose.rotation === -90 ? [dy, 0 - x] : [x, dy];
}
export const addPoint = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];

/**
 * Spreads one existing volley over several muzzles without adding, dropping or re-aiming a shot. Shots keep their
 * order and velocities; consecutive runs go to the muzzles ordered toward the side the volley's first shot leans to,
 * so paths do not cross at the hull. Run lengths differ by at most one (the earlier run takes the extra shot).
 */
export function splitVolley(
    shots: readonly Shot[],
    muzzles: readonly Point[],
): { origin: Point; shots: Shot[] }[] {
    if (!muzzles.length) throw new Error("splitVolley needs a muzzle");
    const first = shots[0],
        last = shots[shots.length - 1];
    const lean: Point =
        first && last
            ? [
                  first.vx / Math.hypot(first.vx, first.vy) -
                      last.vx / Math.hypot(last.vx, last.vy),
                  first.vy / Math.hypot(first.vx, first.vy) -
                      last.vy / Math.hypot(last.vx, last.vy),
              ]
            : [0, 0];
    const ordered = muzzles
        .map((origin, index) => ({
            origin,
            index,
            toward: origin[0] * lean[0] + origin[1] * lean[1],
        }))
        .sort((a, b) => b.toward - a.toward || a.index - b.index);
    const runs: { origin: Point; shots: Shot[] }[] = [];
    let start = 0;
    ordered.forEach(({ origin }, index) => {
        const size = Math.ceil((shots.length - start) / (ordered.length - index));
        runs.push({ origin, shots: shots.slice(start, start + size) });
        start += size;
    });
    return runs.filter((run) => run.shots.length > 0);
}
