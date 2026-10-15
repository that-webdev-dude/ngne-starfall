import type { ImageAsset, Lease } from "./assets.js";
import { type QuadRenderer } from "./quad-renderer.js";
import type { Frame } from "./renderer.js";
import type { RendererResourceInspection } from "./resource-inspection.js";
/** Internal injected platform boundary; public declarations never expose GPU identifiers. */
export interface RendererPlatform {
    readonly gpu?: GPU;
    readonly signal?: AbortSignal;
    readonly snapshot?: (source: ImageBitmap | HTMLCanvasElement) => Promise<ImageBitmap>;
}
export declare class WebGpuRuntime {
    private readonly canvas;
    private readonly width;
    private readonly height;
    private readonly diagnostic;
    private readonly platform;
    status: "initializing" | "ready" | "recovering" | "failed" | "disposed";
    drawCalls: number;
    sprites: number;
    private generation?;
    private pending?;
    private readiness;
    private entries;
    private replacements;
    private faults;
    private failure?;
    private readonly ownerAbort;
    private constructor();
    static create(canvas: HTMLCanvasElement, width: number, height: number, diagnostic: (error: unknown) => void, platform?: RendererPlatform): Promise<WebGpuRuntime>;
    private report;
    private assertAlive;
    private assertGeneration;
    ready(): Promise<void>;
    /** Internal diagnostics used by the sustained renderer harness. Stable until generation changes. */
    get stats(): Readonly<QuadRenderer["stats"]> | undefined;
    inspect(limit?: number): RendererResourceInspection;
    private initialize;
    private lost;
    private upload;
    private ensureImage;
    private releaseEntry;
    /** Takes ownership of the supplied retained source lease, including on failure. */
    acquire(definition: ImageAsset, source: Lease<ImageBitmap>, signal: AbortSignal): Promise<() => void>;
    texture(id: string, source: ImageBitmap | HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
    render(frame: Frame, clear: number): void;
    dispose(): void;
}
