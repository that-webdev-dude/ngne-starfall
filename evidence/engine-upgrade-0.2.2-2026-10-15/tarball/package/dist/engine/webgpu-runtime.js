import { createGpuContext } from "./gpu-context.js";
import { createQuadRenderer } from "./quad-renderer.js";
import { uploadImage } from "./texture-assets.js";
export class WebGpuRuntime {
    canvas;
    width;
    height;
    diagnostic;
    platform;
    status = "initializing";
    drawCalls = 0;
    sprites = 0;
    generation;
    pending;
    readiness = Promise.resolve();
    entries = new Map();
    replacements = new Map();
    faults = new Set();
    failure;
    ownerAbort = () => {
        try {
            this.dispose();
        }
        catch (error) {
            this.report(error);
        }
    };
    constructor(canvas, width, height, diagnostic, platform) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.diagnostic = diagnostic;
        this.platform = platform;
    }
    static async create(canvas, width, height, diagnostic, platform = {}) {
        if (!Number.isSafeInteger(width) ||
            width <= 0 ||
            !Number.isSafeInteger(height) ||
            height <= 0)
            throw new Error("Invalid WebGPU logical dimensions");
        platform.signal?.throwIfAborted();
        const runtime = new WebGpuRuntime(canvas, width, height, diagnostic, platform);
        platform.signal?.addEventListener("abort", runtime.ownerAbort, { once: true });
        runtime.readiness = runtime.initialize();
        try {
            await runtime.readiness;
            return runtime;
        }
        catch (error) {
            try {
                runtime.dispose();
            }
            catch (cleanup) {
                throw new AggregateError([error, cleanup], "WebGPU initialization cleanup failed");
            }
            throw error;
        }
    }
    report(error) {
        try {
            this.diagnostic(error);
        }
        catch {
            /* Diagnostic callbacks cannot affect simulation. */
        }
    }
    assertAlive() {
        this.platform.signal?.throwIfAborted();
        if (this.status === "disposed")
            throw new Error("WebGPU renderer is disposed");
        if (this.status === "failed")
            throw this.failure ?? new Error("WebGPU renderer failed; reload required");
    }
    assertGeneration(generation) {
        this.assertAlive();
        generation.abort.signal.throwIfAborted();
        generation.context?.assertReady();
    }
    async ready() {
        this.assertAlive();
        await this.readiness;
        this.assertAlive();
    }
    /** Internal diagnostics used by the sustained renderer harness. Stable until generation changes. */
    get stats() {
        return this.generation?.quad?.stats;
    }
    inspect(limit = 100) {
        if (!Number.isSafeInteger(limit) || limit < 0 || limit > 1000)
            throw new Error("Invalid renderer inspection limit");
        let leasedSources = 0, manualSources = 0, consumers = 0, estimatedSourceBytes = 0;
        let textures = 0, uploads = 0, estimatedTextureBytes = 0;
        const entries = [];
        const sources = new Set();
        const gpuTextures = new Set();
        for (const entry of this.entries.values()) {
            const bytes = entry.source.width * entry.source.height * 4;
            if (entry.definition)
                leasedSources++;
            else
                manualSources++;
            consumers += entry.refs;
            if (!sources.has(entry.source)) {
                sources.add(entry.source);
                estimatedSourceBytes += bytes;
            }
            if (entries.length < limit)
                entries.push(Object.freeze({
                    id: entry.id,
                    ownership: entry.definition ? "asset-lease" : "manual-snapshot",
                    consumers: entry.refs,
                    estimatedSourceBytes: bytes,
                }));
        }
        for (const generation of new Set([this.generation, this.pending])) {
            if (!generation || generation.disposed)
                continue;
            uploads += generation.uploads.size;
            if (generation.white && !gpuTextures.has(generation.white)) {
                gpuTextures.add(generation.white);
                textures++;
                estimatedTextureBytes += 4;
            }
            for (const [entry, texture] of generation.images)
                if (!gpuTextures.has(texture)) {
                    gpuTextures.add(texture);
                    textures++;
                    estimatedTextureBytes += entry.source.width * entry.source.height * 4;
                }
        }
        return Object.freeze({
            sources: sources.size,
            leasedSources,
            manualSources,
            consumers,
            textures,
            uploads,
            manualReplacements: this.replacements.size,
            estimatedSourceBytes,
            estimatedTextureBytes,
            entries: Object.freeze(entries),
            truncated: this.entries.size > entries.length,
        });
    }
    async initialize() {
        const generation = {
            abort: new AbortController(),
            images: new Map(),
            uploads: new Map(),
            uncaptured: new Set(),
            disposed: false,
        };
        this.pending = generation;
        try {
            const context = await createGpuContext(this.canvas, generation.abort.signal, (message) => this.lost(generation, message), (error) => {
                if (this.generation !== generation && this.pending !== generation)
                    return;
                const key = typeof error === "object" && error !== null && "message" in error
                    ? String(error.message)
                    : String(error);
                if (generation.uncaptured.has(key))
                    return;
                generation.uncaptured.add(key);
                this.report(error);
            }, this.platform.gpu);
            generation.context = context;
            this.assertGeneration(generation);
            const quad = await createQuadRenderer(context.device, context.format);
            generation.quad = quad;
            this.assertGeneration(generation);
            generation.white = context.device.createTexture({
                size: [1, 1],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            });
            context.device.queue.writeTexture({ texture: generation.white }, new Uint8Array([255, 255, 255, 255]), {}, [1, 1]);
            await quad.texture("", generation.white.createView());
            this.assertGeneration(generation);
            // Repeat after awaits: membership can change during source upload/recovery.
            for (;;) {
                let missing;
                for (const entry of this.entries.values())
                    if (!generation.images.has(entry)) {
                        missing = entry;
                        break;
                    }
                if (!missing)
                    break;
                try {
                    await this.ensureImage(generation, missing);
                }
                catch (error) {
                    if (!missing.released)
                        throw error;
                }
                this.assertGeneration(generation);
            }
            this.generation = generation;
            this.pending = undefined;
            this.status = "ready";
        }
        catch (error) {
            if (this.pending === generation)
                this.pending = undefined;
            try {
                disposeGeneration(generation);
            }
            catch (cleanup) {
                throw new AggregateError([error, cleanup], "WebGPU generation cleanup failed");
            }
            throw error;
        }
    }
    lost(generation, message) {
        if (generation !== this.generation || this.status !== "ready")
            return;
        this.status = "recovering";
        this.generation = undefined;
        this.drawCalls = this.sprites = 0;
        this.readiness = (async () => {
            disposeGeneration(generation);
            await this.initialize();
        })().catch((error) => {
            if (this.status === "disposed")
                throw error;
            this.status = "failed";
            this.failure = new Error("WebGPU recovery failed. Reload to create a new renderer", {
                cause: new AggregateError([new Error("Device lost: " + message), error], "Device replacement failed"),
            });
            this.report(this.failure);
            throw this.failure;
        });
        void this.readiness.catch(() => {
            /* Failure is reported once; readiness consumers also receive it. */
        });
    }
    async upload(generation, source) {
        this.assertGeneration(generation);
        const { context, quad } = generation;
        if (!context || !quad)
            throw new Error("WebGPU generation is not initialized");
        const texture = await uploadImage(context.device, source);
        try {
            this.assertGeneration(generation);
            const binding = await quad.binding(texture.createView());
            this.assertGeneration(generation);
            return { texture, binding };
        }
        catch (error) {
            try {
                texture.destroy();
            }
            catch (cleanup) {
                throw new AggregateError([error, cleanup], "Texture rollback failed");
            }
            throw error;
        }
    }
    ensureImage(generation, entry) {
        if (generation.images.has(entry))
            return Promise.resolve();
        const previous = generation.uploads.get(entry);
        if (previous)
            return previous;
        const upload = (async () => {
            if (entry.released)
                throw new Error("Image consumer released: " + entry.id);
            const result = await this.upload(generation, entry.source);
            try {
                this.assertGeneration(generation);
                if (entry.released || this.entries.get(entry.id) !== entry)
                    throw new Error("Image consumer released: " + entry.id);
                const quad = generation.quad;
                if (!quad)
                    throw new Error("Missing quad renderer");
                quad.setTexture(entry.id, result.binding);
                generation.images.set(entry, result.texture);
            }
            catch (error) {
                try {
                    result.texture.destroy();
                }
                catch (cleanup) {
                    throw new AggregateError([error, cleanup], "Image publication rollback failed");
                }
                throw error;
            }
        })();
        generation.uploads.set(entry, upload);
        void upload
            .finally(() => {
            if (generation.uploads.get(entry) === upload)
                generation.uploads.delete(entry);
        })
            .catch(() => {
            /* The acquiring consumer/initialization owns this rejection. */
        });
        return upload;
    }
    releaseEntry(entry) {
        if (entry.released)
            return;
        entry.released = true;
        const current = this.entries.get(entry.id) === entry;
        if (current)
            this.entries.delete(entry.id);
        const actions = [];
        for (const generation of [this.generation, this.pending]) {
            if (!generation)
                continue;
            const texture = generation.images.get(entry);
            generation.images.delete(entry);
            if (current)
                actions.push(() => generation.quad?.release(entry.id));
            if (texture)
                actions.push(() => texture.destroy());
        }
        actions.push(entry.releaseSource);
        runCleanup(actions, "Image release failed");
    }
    /** Takes ownership of the supplied retained source lease, including on failure. */
    async acquire(definition, source, signal) {
        let entry;
        try {
            this.assertAlive();
            signal.throwIfAborted();
            if (!definition.id || this.replacements.has(definition.id))
                throw new Error("Image ID is reserved or manually registered: " + definition.id);
            const previous = this.entries.get(definition.id);
            if (previous && previous.definition !== definition)
                throw new Error("Conflicting image identity: " + definition.id);
            if (previous) {
                source.release();
                entry = previous;
            }
            else {
                entry = {
                    id: definition.id,
                    definition,
                    source: source.value,
                    releaseSource: () => source.release(),
                    refs: 0,
                    released: false,
                };
                this.entries.set(entry.id, entry);
            }
        }
        catch (error) {
            source.release();
            throw error;
        }
        entry.refs++;
        let released = false;
        const release = () => {
            if (released)
                return;
            released = true;
            signal.removeEventListener("abort", abort);
            if (--entry.refs === 0)
                this.releaseEntry(entry);
        };
        const abort = () => {
            try {
                release();
            }
            catch (error) {
                this.report(error);
            }
        };
        signal.addEventListener("abort", abort, { once: true });
        try {
            await abortable((async () => {
                for (;;) {
                    await this.ready();
                    signal.throwIfAborted();
                    const generation = this.generation;
                    // Loss can land between readiness and this read; join its recovery.
                    if (!generation)
                        continue;
                    try {
                        await this.ensureImage(generation, entry);
                    }
                    catch (error) {
                        if (this.status === "recovering" || generation !== this.generation)
                            continue;
                        throw error;
                    }
                    if (generation === this.generation && this.status === "ready")
                        return;
                }
            })(), signal);
            signal.throwIfAborted();
            return release;
        }
        catch (error) {
            // A failed, unpublished upload is immediately retryable; older consumers retain only
            // their release token. An entry already drawn by other consumers stays live.
            if (this.entries.get(entry.id) === entry &&
                !signal.aborted &&
                !this.generation?.images.has(entry))
                this.releaseEntry(entry);
            release();
            throw error;
        }
    }
    async texture(id, source, signal) {
        this.assertAlive();
        signal?.throwIfAborted();
        if (!id || this.entries.get(id)?.definition)
            throw new Error("Texture ID is reserved or leased: " + id);
        const token = {};
        this.replacements.set(id, token);
        let snapshot;
        try {
            snapshot = await (this.platform.snapshot
                ? this.platform.snapshot(source)
                : createImageBitmap(source, {
                    premultiplyAlpha: "none",
                    colorSpaceConversion: "none",
                }));
            for (;;) {
                this.assertAlive();
                signal?.throwIfAborted();
                if (this.replacements.get(id) !== token)
                    throw new Error("Texture replacement superseded: " + id);
                await this.ready();
                this.assertAlive();
                signal?.throwIfAborted();
                const generation = this.generation;
                if (!generation)
                    continue;
                let result;
                try {
                    result = await this.upload(generation, snapshot);
                }
                catch (error) {
                    if (this.status === "recovering" || generation !== this.generation)
                        continue;
                    throw error;
                }
                let published = false;
                try {
                    this.assertAlive();
                    signal?.throwIfAborted();
                    if (this.replacements.get(id) !== token)
                        throw new Error("Texture replacement superseded: " + id);
                    if (generation !== this.generation || this.status !== "ready")
                        continue;
                    const owned = snapshot;
                    const entry = {
                        id,
                        source: owned,
                        releaseSource: () => owned.close(),
                        refs: 1,
                        released: false,
                    };
                    generation.quad?.setTexture(id, result.binding);
                    const previous = this.entries.get(id);
                    this.entries.set(id, entry);
                    generation.images.set(entry, result.texture);
                    snapshot = undefined;
                    published = true;
                    if (previous)
                        this.releaseEntry(previous);
                    return;
                }
                finally {
                    if (!published)
                        result.texture.destroy();
                }
            }
        }
        finally {
            if (this.replacements.get(id) === token)
                this.replacements.delete(id);
            snapshot?.close();
        }
    }
    render(frame, clear) {
        this.drawCalls = this.sprites = 0;
        if (this.status !== "ready")
            return;
        const generation = this.generation;
        if (!generation?.quad || !generation.context)
            return;
        try {
            generation.quad.prepare(frame);
            const view = generation.context.acquire();
            const encoder = generation.context.device.createCommandEncoder();
            generation.quad.encode(encoder, view, frame, this.width, this.height, clear);
            generation.context.submit(encoder);
            this.drawCalls = generation.quad.stats.drawCalls;
            this.sprites = frame.count;
            this.faults.clear();
        }
        catch (error) {
            const key = error instanceof Error ? error.message : String(error);
            if (!this.faults.has(key)) {
                this.faults.add(key);
                this.report(error);
            }
        }
    }
    dispose() {
        if (this.status === "disposed")
            return;
        this.status = "disposed";
        this.drawCalls = this.sprites = 0;
        this.platform.signal?.removeEventListener("abort", this.ownerAbort);
        const generations = [this.generation, this.pending];
        for (const generation of generations)
            generation?.abort.abort(new Error("WebGPU initialization cancelled by disposal"));
        this.replacements.clear();
        const actions = [];
        for (const entry of this.entries.values())
            actions.push(() => this.releaseEntry(entry));
        for (const generation of generations)
            if (generation)
                actions.push(() => disposeGeneration(generation));
        runCleanup(actions, "WebGPU disposal failed");
    }
}
function disposeGeneration(generation) {
    // Partial async initialization may attach late allocations after a previous teardown.
    generation.disposed = true;
    generation.abort.abort(new Error("WebGPU generation cancelled"));
    const { quad, white, context } = generation;
    generation.quad = undefined;
    generation.white = undefined;
    generation.context = undefined;
    const textures = [...generation.images.values()];
    generation.images.clear();
    runCleanup([
        () => quad?.dispose(),
        ...textures.map((texture) => () => texture.destroy()),
        () => white?.destroy(),
        () => context?.dispose(),
    ], "WebGPU generation disposal failed");
}
function runCleanup(actions, message) {
    const errors = [];
    for (const action of actions)
        try {
            action();
        }
        catch (error) {
            errors.push(error);
        }
    if (errors.length)
        throw new AggregateError(errors, message);
}
function abortable(work, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted)
            abort();
        void work.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
}
