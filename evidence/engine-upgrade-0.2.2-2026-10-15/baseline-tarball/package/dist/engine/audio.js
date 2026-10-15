/** Decode independently of a playback device; scenes lease the resulting buffer. */
export function audioAsset(id, url) {
    return {
        id,
        kind: "audio",
        estimateBytes: (buffer) => buffer.length * buffer.numberOfChannels * 4,
        async load(signal) {
            const response = await fetch(url, { signal });
            if (!response.ok)
                throw new Error(`Audio load failed: ${response.status}`);
            const bytes = await response.arrayBuffer();
            const decoder = new OfflineAudioContext(1, 1, 44100);
            return decoder.decodeAudioData(bytes);
        },
    };
}
/** Bounded Web Audio voices. Playback requests flush only after committed ticks. */
export class Audio {
    context;
    master;
    voices = new Map();
    queue = [];
    volumes = new Map();
    buses = new Map();
    ducking = 1;
    mutedValue = false;
    nextScope = 0;
    disposed = false;
    maxVoices = 32;
    get muted() {
        return this.mutedValue;
    }
    set muted(value) {
        this.mutedValue = value;
        this.mix();
    }
    mix() {
        if (this.master)
            this.master.gain.value = this.mutedValue ? 0 : 0.3 * this.ducking;
    }
    async unlock() {
        if (this.disposed)
            throw new Error("Audio is disposed");
        if (!this.context) {
            this.context = new AudioContext();
            this.master = this.context.createGain();
            this.mix();
            this.master.connect(this.context.destination);
        }
        await this.context.resume();
    }
    scene(id) {
        if (this.disposed)
            throw new Error("Audio is disposed");
        id = `${id}:${this.nextScope++}`;
        let disposed = false;
        let fade;
        const volume = (target, seconds) => {
            if (disposed || this.disposed)
                return;
            if (!Number.isFinite(target))
                throw new Error("Invalid volume");
            if (!Number.isFinite(seconds) || seconds < 0)
                throw new Error("Invalid fade duration");
            target = Math.max(0, Math.min(1, target));
            const now = this.context?.currentTime ?? 0;
            const end = now + seconds;
            if (!Number.isFinite(end))
                throw new Error("Invalid fade duration");
            const from = fade
                ? fade.from +
                    (fade.target - fade.from) *
                        Math.min(1, (now - fade.start) / (fade.end - fade.start))
                : (this.volumes.get(id) ?? 1);
            const bus = this.context && seconds > 0 ? this.bus(id) : this.buses.get(id);
            fade = undefined;
            if (bus) {
                // Replace the entire owned timeline; retain only the current linear envelope.
                bus.gain.cancelScheduledValues(0);
                bus.gain.setValueAtTime(end > now ? from : target, now);
                if (end > now) {
                    bus.gain.linearRampToValueAtTime(target, end);
                    fade = { from, target, start: now, end };
                }
            }
            this.volumes.set(id, target);
        };
        return {
            play: (sound) => {
                if (!disposed && !this.disposed && this.queue.length < 128)
                    this.queue.push({ scope: id, sound });
            },
            volume: (target) => volume(target, 0),
            fadeTo: (target, seconds) => volume(target, seconds),
            dispose: () => {
                disposed = true;
                fade = undefined;
                this.release(id);
            },
        };
    }
    duck(level = 0.35) {
        if (!Number.isFinite(level))
            throw new Error("Invalid ducking level");
        this.ducking = Math.max(0, Math.min(1, level));
        this.mix();
    }
    bus(scope) {
        let bus = this.buses.get(scope);
        if (!bus) {
            bus = this.context.createGain();
            bus.gain.value = this.volumes.get(scope) ?? 1;
            bus.connect(this.master);
            this.buses.set(scope, bus);
        }
        return bus;
    }
    flush() {
        const queue = this.queue.splice(0);
        const ctx = this.context;
        if (!ctx || ctx.state !== "running")
            return;
        for (const { scope, sound } of queue) {
            if (this.muted && !("buffer" in sound && sound.loop))
                continue;
            if (this.voices.size >= this.maxVoices)
                break;
            if ("buffer" in sound) {
                if (!(Number.isFinite(sound.rate ?? 1) &&
                    (sound.rate ?? 1) > 0 &&
                    Number.isFinite(sound.volume ?? 0.2)))
                    continue;
                const source = ctx.createBufferSource(), gain = ctx.createGain();
                source.buffer = sound.buffer;
                source.loop = !!sound.loop;
                source.playbackRate.value = sound.rate ?? 1;
                gain.gain.value = Math.max(0, sound.volume ?? 0.2);
                source.connect(gain);
                gain.connect(this.bus(scope));
                this.voices.set(source, { gain, scope });
                source.onended = () => {
                    source.disconnect();
                    gain.disconnect();
                    this.voices.delete(source);
                };
                source.start();
                continue;
            }
            if (!(sound.frequency > 0 &&
                Number.isFinite(sound.frequency) &&
                sound.duration > 0 &&
                Number.isFinite(sound.duration) &&
                Number.isFinite(sound.volume ?? 0.2)))
                continue;
            const oscillator = ctx.createOscillator(), gain = ctx.createGain();
            oscillator.type = sound.type ?? "square";
            oscillator.frequency.setValueAtTime(sound.frequency, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, sound.endFrequency ?? sound.frequency), ctx.currentTime + sound.duration);
            gain.gain.setValueAtTime(Math.max(0.0001, sound.volume ?? 0.2), ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + sound.duration);
            oscillator.connect(gain);
            gain.connect(this.bus(scope));
            this.voices.set(oscillator, { gain, scope });
            oscillator.onended = () => {
                oscillator.disconnect();
                gain.disconnect();
                this.voices.delete(oscillator);
            };
            oscillator.start();
            oscillator.stop(ctx.currentTime + sound.duration);
        }
    }
    release(scope) {
        this.queue = this.queue.filter((s) => s.scope !== scope);
        const errors = [];
        for (const [o, v] of this.voices)
            if (v.scope === scope) {
                this.stopVoice(o, v.gain, errors);
                this.voices.delete(o);
            }
        try {
            this.buses.get(scope)?.gain.cancelScheduledValues(0);
        }
        catch (error) {
            errors.push(error);
        }
        try {
            this.buses.get(scope)?.disconnect();
        }
        catch (error) {
            errors.push(error);
        }
        this.buses.delete(scope);
        this.volumes.delete(scope);
        if (errors.length)
            throw new AggregateError(errors, "Audio scope disposal failed");
    }
    suspend() {
        this.queue.length = 0;
        return this.context?.suspend();
    }
    resume() {
        return this.context?.resume();
    }
    async dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.queue.length = 0;
        const errors = [];
        for (const [o, v] of this.voices)
            this.stopVoice(o, v.gain, errors);
        this.voices.clear();
        this.volumes.clear();
        for (const b of this.buses.values()) {
            try {
                b.gain.cancelScheduledValues(0);
            }
            catch (e) {
                errors.push(e);
            }
            try {
                b.disconnect();
            }
            catch (e) {
                errors.push(e);
            }
        }
        this.buses.clear();
        try {
            this.master?.disconnect();
        }
        catch (e) {
            errors.push(e);
        }
        try {
            await this.context?.close();
        }
        catch (e) {
            errors.push(e);
        }
        this.context = undefined;
        this.master = undefined;
        if (errors.length)
            throw new AggregateError(errors, "Audio disposal failed");
    }
    stopVoice(source, gain, errors) {
        source.onended = null;
        for (const action of [
            () => source.stop(),
            () => source.disconnect(),
            () => gain.disconnect(),
        ]) {
            try {
                action();
            }
            catch (error) {
                errors.push(error);
            }
        }
    }
}
