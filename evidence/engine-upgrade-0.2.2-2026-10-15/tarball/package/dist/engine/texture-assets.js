// Ownership/rollback adapted from cluster-renderer .versions/v03/assets/TextureAssets.ts
// at 34458a987f03b00894e98a40d39fc0ae666194f6. Device is supplied per generation.
import { validateGpuOperation } from "./gpu-context.js";
export async function uploadImage(device, source) {
    const { width, height } = source;
    if (!Number.isSafeInteger(width) ||
        !Number.isSafeInteger(height) ||
        width <= 0 ||
        height <= 0 ||
        width > device.limits.maxTextureDimension2D ||
        height > device.limits.maxTextureDimension2D)
        throw new Error("Invalid WebGPU image dimensions");
    let texture;
    try {
        await validateGpuOperation(device, () => {
            texture = device.createTexture({
                size: [width, height],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING |
                    GPUTextureUsage.COPY_DST |
                    GPUTextureUsage.RENDER_ATTACHMENT,
            });
            device.queue.copyExternalImageToTexture({ source, flipY: false }, { texture, colorSpace: "srgb", premultipliedAlpha: false }, [width, height]);
        });
        if (!texture)
            throw new Error("Image upload produced no texture");
        return texture;
    }
    catch (error) {
        try {
            texture?.destroy();
        }
        catch (cleanup) {
            throw new AggregateError([error, cleanup], "Image upload cleanup failed");
        }
        throw error;
    }
}
