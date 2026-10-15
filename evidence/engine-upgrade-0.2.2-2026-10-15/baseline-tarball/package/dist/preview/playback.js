import { duration } from "./model.js";
/** Caller supplies a monotonic millisecond clock; callback counts have no timing meaning. */
export class Playback {
    animation;
    elapsed = 0;
    playing = false;
    previous = 0;
    total;
    constructor(animation) {
        this.animation = animation;
        this.total = duration(animation);
    }
    get index() {
        let end = 0;
        for (const [index, entry] of this.animation.entries.entries()) {
            end += entry.ms;
            if (this.elapsed < end)
                return index;
        }
        return this.animation.entries.length - 1;
    }
    play(now) {
        if (this.playing)
            return;
        if (this.elapsed >= this.total)
            this.elapsed = 0;
        this.previous = now;
        this.playing = true;
    }
    advance(now) {
        if (!this.playing)
            return;
        const delta = Math.max(0, now - this.previous);
        this.previous = now;
        if (this.animation.playback === "loop") {
            const remainder = delta % this.total;
            this.elapsed =
                remainder >= this.total - this.elapsed
                    ? remainder - (this.total - this.elapsed)
                    : this.elapsed + remainder;
        }
        else {
            this.elapsed = delta >= this.total - this.elapsed ? this.total : this.elapsed + delta;
            if (this.elapsed === this.total)
                this.playing = false;
        }
    }
    pause(now) {
        this.advance(now);
        this.playing = false;
    }
    step(direction) {
        if (this.playing)
            return;
        const index = Math.max(0, Math.min(this.animation.entries.length - 1, this.index + direction));
        // Clamping also resets the endpoint entry, including a completed once animation.
        this.elapsed = this.animation.entries
            .slice(0, index)
            .reduce((sum, entry) => sum + entry.ms, 0);
    }
}
