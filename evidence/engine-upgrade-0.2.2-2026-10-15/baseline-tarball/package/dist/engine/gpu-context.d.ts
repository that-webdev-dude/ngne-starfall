export interface GpuContext {
    readonly device: GPUDevice;
    readonly format: GPUTextureFormat;
    assertReady(): void;
    acquire(): GPUTextureView;
    submit(encoder: GPUCommandEncoder): void;
    dispose(): void;
}
export declare function createGpuContext(canvas: HTMLCanvasElement, signal: AbortSignal, onLost: (message: string) => void, onError: (error: unknown) => void, gpu?: GPU | undefined): Promise<GpuContext>;
/** No await while scopes are on the shared device stack, including on synchronous failure. */
export declare function validateGpuOperation<T>(device: GPUDevice, operation: () => T): Promise<T>;
