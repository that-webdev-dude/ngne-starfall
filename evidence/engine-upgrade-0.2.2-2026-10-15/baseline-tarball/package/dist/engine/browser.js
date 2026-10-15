import { Game, FAIL_GAME, PREPARE_ASSET, } from "./scene.js";
import { Frame } from "./renderer.js";
import { FixedStep } from "./primitives.js";
import { Input } from "./input.js";
import { Audio } from "./audio.js";
import { ACQUIRE_IMAGE, CREATE_RENDERER, RENDERER_READY } from "./renderer-host.js";
import { WebGPURenderer } from "./webgpu-renderer.js";
export class BrowserGame {
    options;
    game;
    input = new Input();
    audio = new Audio();
    frame = new Frame();
    stats = {
        fps: 60,
        frameMs: 0,
        updateMs: 0,
        renderMs: 0,
        sprites: 0,
        drawCalls: 0,
        droppedTicks: 0,
    };
    renderer;
    rendererPromise;
    acquisitionAbort;
    acquisition = 0;
    loop;
    raf = 0;
    last = 0;
    enabled = false;
    attached = false;
    operation;
    disposed = false;
    disposal;
    run = 0;
    width;
    height;
    scheduler;
    constructor(options) {
        this.options = options;
        this.game = new Game(options);
        this.width = options.width ?? 640;
        this.height = options.height ?? 360;
        if (!Number.isSafeInteger(this.width) ||
            this.width <= 0 ||
            !Number.isSafeInteger(this.height) ||
            this.height <= 0)
            throw new Error("Invalid display dimensions");
        this.loop = new FixedStep(this.game.dt, options.maxTicks ?? 5);
        this.scheduler = options.scheduler ?? {
            request: (callback) => requestAnimationFrame(callback),
            cancel: (id) => cancelAnimationFrame(id),
        };
        this.game[PREPARE_ASSET] = async (asset, signal) => {
            if (!isImageAsset(asset))
                return;
            const source = await this.game.assets.acquire(asset, signal, "renderer");
            let renderer;
            try {
                renderer = await this.ensureRenderer();
                signal.throwIfAborted();
            }
            catch (error) {
                source.release();
                throw error;
            }
            // The renderer owns the source lease from here, including on failure.
            return renderer[ACQUIRE_IMAGE](asset, source, signal);
        };
    }
    reportRenderer = (error) => {
        this.game.report(error);
        if (!this.options.diagnostic) {
            try {
                console.error(error);
            }
            catch {
                /* Logging cannot alter the host loop. */
            }
        }
    };
    ensureRenderer() {
        if (this.disposed || this.game.lifecycle === "Failed")
            return Promise.reject(new Error("Browser renderer ownership has ended"));
        if (this.renderer)
            return Promise.resolve(this.renderer);
        if (this.rendererPromise)
            return this.rendererPromise;
        const acquisition = ++this.acquisition;
        const abort = new AbortController();
        this.acquisitionAbort = abort;
        this.restoreBackingSize();
        const promise = WebGPURenderer[CREATE_RENDERER](this.options.canvas, this.width, this.height, this.reportRenderer, abort.signal)
            .then((renderer) => {
            if (this.disposed || acquisition !== this.acquisition) {
                renderer.dispose();
                throw new Error("Renderer acquisition cancelled");
            }
            this.renderer = renderer;
            return renderer;
        })
            .catch((error) => {
            if (acquisition === this.acquisition)
                this.rendererPromise = undefined;
            throw error;
        });
        this.rendererPromise = promise;
        return promise;
    }
    restoreBackingSize() {
        if (this.options.canvas.width !== this.width)
            this.options.canvas.width = this.width;
        if (this.options.canvas.height !== this.height)
            this.options.canvas.height = this.height;
    }
    endRenderer() {
        this.acquisition++;
        const errors = [];
        try {
            this.renderer?.dispose();
        }
        catch (error) {
            errors.push(error);
        }
        try {
            this.acquisitionAbort?.abort(new Error("Renderer acquisition cancelled by disposal"));
        }
        catch (error) {
            errors.push(error);
        }
        this.rendererPromise = undefined;
        if (errors.length)
            throw new AggregateError(errors, "Renderer teardown failed");
    }
    frameCallback = (now, run, callback) => {
        if (!this.enabled || run !== this.run)
            return;
        try {
            const elapsed = this.last ? (now - this.last) / 1000 : 0;
            this.last = now;
            const display = Object.freeze({
                width: this.width,
                height: this.height,
                pixelRatio: window.devicePixelRatio,
            });
            const begin = performance.now();
            const result = this.loop.advance(elapsed, () => {
                this.game.tick(this.input.consume(), display);
                this.audio.flush();
            });
            const updated = performance.now();
            this.frame.reset();
            this.game.render(this.frame, result.alpha);
            const renderer = this.renderer;
            if (!renderer)
                throw new Error("Browser renderer missing");
            this.restoreBackingSize();
            renderer.render(this.frame, this.options.clear);
            const end = performance.now();
            this.stats.fps += ((elapsed ? 1 / elapsed : 60) - this.stats.fps) * 0.05;
            this.stats.frameMs = end - begin;
            this.stats.updateMs = updated - begin;
            this.stats.renderMs = end - updated;
            this.stats.sprites = renderer.sprites;
            this.stats.drawCalls = renderer.drawCalls;
            this.stats.droppedTicks += result.dropped;
            if (result.dropped)
                this.game.report({
                    type: "overload",
                    droppedTicks: result.dropped,
                });
            this.options.afterFrame?.(this.stats);
            if (this.enabled)
                this.raf = this.scheduler.request(callback);
        }
        catch (e) {
            this.enabled = false;
            this.game[FAIL_GAME]();
            try {
                this.endRenderer();
            }
            catch (cleanup) {
                this.game.report(new AggregateError([e, cleanup], "Browser frame teardown failed"));
                return;
            }
            this.game.report(e);
        }
    };
    async start(initial) {
        this.requireIdle();
        if (this.game.lifecycle !== "Stopped")
            throw new Error("Cannot start in " + this.game.lifecycle);
        this.operation = "start";
        const run = ++this.run;
        const callback = (time) => this.frameCallback(time, run, callback);
        const cold = !this.attached;
        try {
            if (!cold)
                await this.audio.resume();
            if (this.disposed)
                throw new Error("Start cancelled by disposal");
            const renderer = await this.ensureRenderer();
            await renderer[RENDERER_READY]();
            if (this.disposed)
                throw new Error("Start cancelled by disposal");
            if (cold)
                this.input.attach(this.options.canvas, this.width, this.height);
            this.loop.reset();
            this.last = 0;
            await this.game.start(initial, {
                start: () => {
                    if (!cold)
                        this.input.clear();
                    this.raf = this.scheduler.request(callback);
                },
                stop: () => this.scheduler.cancel(this.raf),
            });
            if (this.disposed)
                throw new Error("Start cancelled by disposal");
            this.enabled = true;
            this.attached = true;
        }
        catch (e) {
            if (this.disposed)
                throw e;
            this.enabled = false;
            if (cold) {
                const errors = [e];
                try {
                    this.input.dispose();
                }
                catch (error) {
                    errors.push(error);
                }
                // Renderer ownership also ends when Game.start could not roll itself back.
                const failed = this.game.lifecycle === "Failed";
                if (errors.length > 1 || failed) {
                    this.game[FAIL_GAME]();
                    try {
                        this.endRenderer();
                    }
                    catch (cleanup) {
                        errors.push(cleanup);
                    }
                    throw new AggregateError(errors, "Browser startup rollback failed");
                }
            }
            else {
                this.game[FAIL_GAME]();
                try {
                    this.endRenderer();
                }
                catch (cleanup) {
                    throw new AggregateError([e, cleanup], "Browser resume teardown failed");
                }
            }
            throw e;
        }
        finally {
            this.operation = undefined;
        }
    }
    async stop() {
        this.requireIdle();
        if (!["Running", "Stopped"].includes(this.game.lifecycle))
            throw new Error("Cannot stop in " + this.game.lifecycle);
        this.operation = "stop";
        this.enabled = false;
        this.run++;
        const errors = [];
        try {
            try {
                this.scheduler.cancel(this.raf);
            }
            catch (e) {
                errors.push(e);
            }
            try {
                this.game.stop();
            }
            catch (e) {
                errors.push(e);
            }
            if (!this.renderer && this.rendererPromise) {
                this.acquisition++;
                this.acquisitionAbort?.abort();
                this.rendererPromise = undefined;
            }
            try {
                this.input.clear();
            }
            catch (e) {
                errors.push(e);
            }
            try {
                await this.audio.suspend();
            }
            catch (e) {
                errors.push(e);
            }
            if (errors.length) {
                if (!this.disposed)
                    this.game[FAIL_GAME]();
                try {
                    this.endRenderer();
                }
                catch (cleanup) {
                    errors.push(cleanup);
                }
                throw new AggregateError(errors, "Stop failed");
            }
        }
        finally {
            this.operation = undefined;
        }
    }
    dispose() {
        if (this.disposal)
            return this.disposal;
        this.disposed = true;
        this.enabled = false;
        this.run++;
        // Start every independent teardown now; a pending audio close must not
        // keep the world, renderer or input alive.
        this.disposal = Promise.allSettled([
            () => this.scheduler.cancel(this.raf),
            () => this.endRenderer(),
            () => this.game.dispose(),
            () => this.audio.dispose(),
            () => this.input.dispose(),
        ].map(async (action) => {
            await action();
        })).then((results) => {
            const errors = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
            if (errors.length)
                throw new AggregateError(errors, "Dispose failed");
        });
        return this.disposal;
    }
    requireIdle() {
        if (this.disposed)
            throw new Error("Browser game is disposed");
        if (this.operation)
            throw new Error("Lifecycle operation already pending: " + this.operation);
    }
}
function isImageAsset(asset) {
    return "kind" in asset && asset.kind === "image";
}
