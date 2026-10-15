import type { Frame } from "./renderer.js";
export interface QuadRenderer {
    readonly stats: {
        drawCalls: number;
        sprites: number;
        uploadedBytes: number;
        bufferGrowths: number;
        capacity: number;
        bindings: number;
    };
    binding(view: GPUTextureView): Promise<GPUBindGroup>;
    setTexture(id: string, group: GPUBindGroup): void;
    texture(id: string, view: GPUTextureView): Promise<void>;
    release(id: string): void;
    prepare(frame: Frame): void;
    encode(encoder: GPUCommandEncoder, view: GPUTextureView, frame: Frame, width: number, height: number, clear: number): void;
    dispose(): void;
}
export declare function createQuadRenderer(device: GPUDevice, format: GPUTextureFormat, debug?: boolean): Promise<QuadRenderer>;
