export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function seedOf(...parts) {
    let h = 2166136261;
    for (const char of JSON.stringify(parts))
        h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    return h >>> 0;
}
/** Mulberry32, version 1. State is owned by the mounted scene. */
export class Random {
    #state;
    constructor(state) {
        this.#state = state >>> 0;
    }
    next() {
        let t = (this.#state = (this.#state + 0x6d2b79f5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    snapshot() {
        return this.#state;
    }
    restore(state) {
        this.#state = state >>> 0;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    int(min, max) {
        return Math.floor(this.range(min, max));
    }
}
export class Cleanup {
    actions = [];
    defer(action) {
        this.actions.push(action);
    }
    dispose() {
        const errors = [];
        for (const action of this.actions.splice(0).reverse()) {
            try {
                action();
            }
            catch (e) {
                errors.push(e);
            }
        }
        if (errors.length)
            throw new AggregateError(errors, "Cleanup failed");
    }
}
export class Camera {
    x = 0;
    y = 0;
    previousX = 0;
    previousY = 0;
    shakeX = 0;
    shakeY = 0;
    pixelSnap = true;
    beginTick() {
        this.previousX = this.x;
        this.previousY = this.y;
    }
    cut(x = this.x, y = this.y) {
        this.x = this.previousX = x;
        this.y = this.previousY = y;
    }
    view(alpha) {
        return {
            x: lerp(this.previousX, this.x, alpha) + this.shakeX,
            y: lerp(this.previousY, this.y, alpha) + this.shakeY,
        };
    }
}
export class FixedStep {
    dt;
    maxTicks;
    accumulator = 0;
    constructor(dt = 1 / 60, maxTicks = 5) {
        this.dt = dt;
        this.maxTicks = maxTicks;
        if (!(Number.isFinite(dt) && dt > 0 && Number.isSafeInteger(maxTicks) && maxTicks > 0))
            throw new Error("Invalid fixed-step configuration");
    }
    reset() {
        this.accumulator = 0;
    }
    advance(seconds, tick) {
        if (!Number.isFinite(seconds) || seconds < 0)
            throw new Error("Invalid frame duration");
        this.accumulator += seconds;
        let ticks = 0;
        while (this.accumulator + 1e-12 >= this.dt && ticks < this.maxTicks) {
            tick();
            this.accumulator = Math.max(0, this.accumulator - this.dt);
            ticks++;
        }
        const dropped = Math.floor((this.accumulator + 1e-12) / this.dt);
        this.accumulator = Math.max(0, this.accumulator - dropped * this.dt);
        return { ticks, dropped, alpha: this.accumulator / this.dt };
    }
}
/** Validate and copy plain data before freezing; caller-owned values stay untouched. */
export function immutable(value) {
    // Traversal preserves supported fields and rejects values outside the data domain.
    return copyImmutable(value, new Map());
}
function copyImmutable(value, copies) {
    if (value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "bigint")
        return value;
    if (typeof value !== "object")
        throw new Error("Committed state, commands and events require plain data");
    const existing = copies.get(value);
    if (existing)
        return existing;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype &&
        prototype !== null &&
        !(Array.isArray(value) && prototype === Array.prototype))
        throw new Error("Committed state, commands and events require plain objects, arrays and primitives");
    const copy = Array.isArray(value) ? new Array(value.length) : Object.create(prototype);
    copies.set(value, copy);
    for (const key of Reflect.ownKeys(value)) {
        if (Array.isArray(value) && key === "length")
            continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (typeof key !== "string" || !descriptor?.enumerable || !("value" in descriptor))
            throw new Error("Plain data requires enumerable string-keyed data properties");
        Object.defineProperty(copy, key, {
            value: copyImmutable(descriptor.value, copies),
            enumerable: true,
        });
    }
    return Object.freeze(copy);
}
