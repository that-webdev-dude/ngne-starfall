export declare const lerp: (a: number, b: number, t: number) => number;
export declare const clamp: (n: number, lo: number, hi: number) => number;
export declare function seedOf(...parts: (string | number)[]): number;
/** Mulberry32, version 1. State is owned by the mounted scene. */
export declare class Random {
    #private;
    constructor(state: number);
    next(): number;
    snapshot(): number;
    restore(state: number): void;
    range(min: number, max: number): number;
    int(min: number, max: number): number;
}
export declare class Cleanup {
    private actions;
    defer(action: () => void): void;
    dispose(): void;
}
export declare class Camera {
    x: number;
    y: number;
    previousX: number;
    previousY: number;
    shakeX: number;
    shakeY: number;
    pixelSnap: boolean;
    beginTick(): void;
    cut(x?: number, y?: number): void;
    view(alpha: number): {
        x: number;
        y: number;
    };
}
export declare class FixedStep {
    readonly dt: number;
    readonly maxTicks: number;
    private accumulator;
    constructor(dt?: number, maxTicks?: number);
    reset(): void;
    advance(seconds: number, tick: () => void): {
        ticks: number;
        dropped: number;
        alpha: number;
    };
}
/** Recursive read-only view of supported plain data, including arrays and tuples. */
export type DeepReadonly<T> = T extends object ? {
    readonly [Key in keyof T]: DeepReadonly<T[Key]>;
} : T;
/** Validate and copy plain data before freezing; caller-owned values stay untouched. */
export declare function immutable<T>(value: T | DeepReadonly<T>): DeepReadonly<T>;
