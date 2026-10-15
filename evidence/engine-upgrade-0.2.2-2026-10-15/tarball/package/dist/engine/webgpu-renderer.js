import { ACQUIRE_IMAGE, CREATE_RENDERER, RENDERER_READY } from "./renderer-host.js";
import { WebGpuRuntime } from "./webgpu-runtime.js";
/** GPU-free public declaration boundary; resources live in the private runtime. */
export class WebGPURenderer {
    canvas;
    width;
    height;
    #runtime;
    constructor(canvas, width, height, runtime) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.#runtime = runtime;
    }
    static create(canvas, width, height, onError = console.error) {
        return this[CREATE_RENDERER](canvas, width, height, onError);
    }
    static async [CREATE_RENDERER](canvas, width, height, onError, signal) {
        const runtime = await WebGpuRuntime.create(canvas, width, height, onError, { signal });
        return new WebGPURenderer(canvas, width, height, runtime);
    }
    get status() {
        const status = this.#runtime.status;
        if (status === "initializing")
            throw new Error("Renderer is not initialized");
        return status;
    }
    get drawCalls() {
        return this.#runtime.drawCalls;
    }
    get sprites() {
        return this.#runtime.sprites;
    }
    inspect(limit = 100) {
        return this.#runtime.inspect(limit);
    }
    texture(id, source, signal) {
        return this.#runtime.texture(id, source, signal);
    }
    [ACQUIRE_IMAGE](definition, source, signal) {
        return this.#runtime.acquire(definition, source, signal);
    }
    [RENDERER_READY]() {
        return this.#runtime.ready();
    }
    render(frame, clear = 0x090e20) {
        this.#runtime.render(frame, clear);
    }
    dispose() {
        this.#runtime.dispose();
    }
}
