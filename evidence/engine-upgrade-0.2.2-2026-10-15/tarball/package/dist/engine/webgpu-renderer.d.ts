import type { ImageAsset, Lease } from "./assets.js";
import type { Frame } from "./renderer.js";
import { ACQUIRE_IMAGE, CREATE_RENDERER, RENDERER_READY } from "./renderer-host.js";
import type { RendererResourceInspection } from "./resource-inspection.js";
export type RendererStatus = "ready" | "recovering" | "failed" | "disposed";
/** GPU-free public declaration boundary; resources live in the private runtime. */
export declare class WebGPURenderer {
    #private;
    readonly canvas: HTMLCanvasElement;
    readonly width: number;
    readonly height: number;
    private constructor();
    static create(canvas: HTMLCanvasElement, width: number, height: number, onError?: (error: unknown) => void): Promise<WebGPURenderer>;
    static [CREATE_RENDERER](canvas: HTMLCanvasElement, width: number, height: number, onError: (error: unknown) => void, signal?: AbortSignal): Promise<WebGPURenderer>;
    get status(): RendererStatus;
    get drawCalls(): number;
    get sprites(): number;
    inspect(limit?: number): RendererResourceInspection;
    texture(id: string, source: ImageBitmap | HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
    [ACQUIRE_IMAGE](definition: ImageAsset, source: Lease<ImageBitmap>, signal: AbortSignal): Promise<() => void>;
    [RENDERER_READY](): Promise<void>;
    render(frame: Frame, clear?: number): void;
    dispose(): void;
}
