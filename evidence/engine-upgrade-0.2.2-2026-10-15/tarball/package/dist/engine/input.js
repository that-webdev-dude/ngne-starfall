export const emptyInput = () => Object.freeze({
    held: Object.freeze([]),
    pressed: Object.freeze([]),
    released: Object.freeze([]),
    pointer: Object.freeze({
        x: 0,
        y: 0,
        active: false,
        dx: 0,
        dy: 0,
        completed: Object.freeze([]),
    }),
    wheel: 0,
    axes: Object.freeze([0, 0, 0, 0]),
});
export const down = (i, key) => i.held.includes(key);
export const pressed = (i, key) => i.pressed.includes(key);
export class Input {
    held = new Set();
    presses = new Set();
    releases = new Set();
    x = 0;
    y = 0;
    dx = 0;
    dy = 0;
    active = false;
    pointerPresses = new Map();
    completions = [];
    wheel = 0;
    cleanups = [];
    padHeld = new Set();
    padIndex;
    blockedPadIndex;
    focused = false;
    set(key, value) {
        if (value && !this.held.has(key)) {
            this.held.add(key);
            this.presses.add(key);
        }
        if (!value && this.held.delete(key))
            this.releases.add(key);
    }
    attach(canvas, width, height) {
        this.focused = document.activeElement === canvas;
        const on = (target, name, fn) => {
            target.addEventListener(name, fn, { passive: false });
            this.cleanups.push(() => target.removeEventListener(name, fn));
        };
        on(window, "keydown", (e) => {
            const k = e;
            if (!this.focused || k.target !== canvas)
                return;
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k.code))
                k.preventDefault();
            this.set(k.code, true);
        });
        on(window, "keyup", (e) => this.set(e.code, false));
        on(window, "focus", () => {
            this.focused = document.activeElement === canvas;
        });
        on(window, "blur", () => {
            this.focused = false;
            this.clear();
        });
        on(canvas, "focus", () => {
            this.focused = true;
        });
        on(canvas, "blur", () => {
            this.focused = false;
            this.clear();
        });
        const pointer = (e) => {
            const r = canvas.getBoundingClientRect();
            const x = ((e.clientX - r.left) * width) / r.width, y = ((e.clientY - r.top) * height) / r.height;
            this.dx += x - this.x;
            this.dy += y - this.y;
            this.x = x;
            this.y = y;
            this.active = true;
        };
        on(canvas, "pointermove", (e) => pointer(e));
        on(canvas, "pointerdown", (e) => {
            const p = e;
            p.preventDefault();
            canvas.focus();
            pointer(p);
            canvas.setPointerCapture(p.pointerId);
            this.pointerPresses.set(p.button, { pointerId: p.pointerId, x: this.x, y: this.y });
            this.set("Pointer" + p.button, true);
        });
        on(canvas, "pointerup", (e) => {
            const p = e;
            const start = this.pointerPresses.get(p.button);
            if (!start || start.pointerId !== p.pointerId)
                return;
            pointer(p);
            this.completions.push(Object.freeze({
                button: p.button,
                startX: start.x,
                startY: start.y,
                x: this.x,
                y: this.y,
            }));
            this.pointerPresses.delete(p.button);
            this.set("Pointer" + p.button, false);
        });
        const cancelPointer = () => {
            for (const key of this.held)
                if (key.startsWith("Pointer"))
                    this.set(key, false);
            this.pointerPresses.clear();
            this.active = false;
        };
        on(canvas, "pointercancel", cancelPointer);
        on(canvas, "lostpointercapture", cancelPointer);
        on(canvas, "contextmenu", (e) => e.preventDefault());
        on(canvas, "wheel", (e) => {
            e.preventDefault();
            this.wheel += e.deltaY;
        });
    }
    consume() {
        let axes = [0, 0, 0, 0];
        const pad = this.focused && typeof navigator !== "undefined"
            ? navigator.getGamepads?.().find((p) => p?.connected)
            : undefined;
        const current = new Set();
        if (pad) {
            if (this.padIndex !== undefined && this.padIndex !== pad.index) {
                for (const key of this.padHeld)
                    this.releases.add(key);
                this.padHeld.clear();
            }
            this.padIndex = pad.index;
            const blocked = this.blockedPadIndex === pad.index;
            const hasInput = pad.axes.some((value) => Math.abs(value) > 0.15) ||
                pad.buttons.some((button) => button.pressed);
            if (blocked && !hasInput)
                this.blockedPadIndex = undefined;
            if (!blocked) {
                axes = axes.map((_, i) => (Math.abs(pad.axes[i] ?? 0) > 0.15 ? pad.axes[i] : 0));
                pad.buttons.forEach((button, i) => {
                    if (button.pressed)
                        current.add("Pad" + i);
                });
            }
        }
        else if (this.focused) {
            this.padIndex = undefined;
            this.blockedPadIndex = undefined;
        }
        for (const key of current)
            if (!this.padHeld.has(key))
                this.presses.add(key);
        for (const key of this.padHeld)
            if (!current.has(key))
                this.releases.add(key);
        this.padHeld = current;
        const result = Object.freeze({
            held: Object.freeze([...this.held, ...current]),
            pressed: Object.freeze([...this.presses]),
            released: Object.freeze([...this.releases]),
            pointer: Object.freeze({
                x: this.x,
                y: this.y,
                active: this.active,
                dx: this.dx,
                dy: this.dy,
                completed: Object.freeze(this.completions),
            }),
            wheel: this.wheel,
            axes: Object.freeze(axes),
        });
        this.presses.clear();
        this.releases.clear();
        this.completions = [];
        this.dx = this.dy = this.wheel = 0;
        return result;
    }
    clear() {
        this.pointerPresses.clear();
        this.completions = [];
        for (const key of this.held)
            this.releases.add(key);
        for (const key of this.padHeld)
            this.releases.add(key);
        this.held.clear();
        this.presses.clear();
        this.padHeld.clear();
        this.blockedPadIndex = this.padIndex;
        this.active = false;
        this.dx = this.dy = this.wheel = 0;
    }
    dispose() {
        this.cleanups
            .splice(0)
            .reverse()
            .forEach((f) => f());
        this.clear();
        this.focused = false;
    }
}
