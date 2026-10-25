import type { ImageAsset } from "@ngne/core";
import {
    REV01_URLS,
    derivedImageAsset,
    novaUploadFrames,
    planSparseAtlas,
    rev01Sprite,
    type NativeFrame,
    type Pixels,
    type SparseAtlasPlan,
} from "./rev01-assets.ts";

/**
 * T2-owned hook: extra images stage scenes claim for player/projectile/effect rendering beyond the plain strips in
 * `REV01_CLAIMS.playerFx`: the nova sparse atlas. Lazy, and the same array (and asset) on every call; defining the
 * asset never loads it.
 */
export const NOVA_ATLAS_ID = "rev01-nova-atlas";
export const NOVA_TILE = 32,
    NOVA_ATLAS_WIDTH = 2048;
/**
 * The engine creates its device with `adapter.requestDevice()` and no `requiredLimits`, so the device has
 * WebGPU's default `maxTextureDimension2D` of 8192 on every implementation (WebGPU spec, "Limits" default
 * table); the engine's own upload check reads the same `device.limits.maxTextureDimension2D`.
 */
export const WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D = 8192;

/**
 * Packs only the occupied 32x32 cells of the 11 played nova frames (fade-3 excluded by `novaUploadFrames`) from the
 * decoded strip into a sparse atlas, checking the result against the device texture limit.
 */
export function packNovaAtlas(
    source: Pixels,
    maxDimension = WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D,
): { pixels: Pixels; plan: SparseAtlasPlan } {
    const strip = rev01Sprite("nova");
    if (source.width !== strip.stripWidth || source.height !== strip.stripHeight)
        throw new Error(
            `nova strip is ${source.width}x${source.height}, spec ${strip.stripWidth}x${strip.stripHeight}`,
        );
    const opaque = (frame: NativeFrame, x: number, y: number, width: number, height: number) => {
        for (let row = frame.y + y; row < frame.y + y + height; row++) {
            for (
                let i = (row * source.width + frame.x + x) * 4 + 3, end = i + width * 4;
                i < end;
                i += 4
            )
                if (source.data[i]) return true;
        }
        return false;
    };
    const plan = planSparseAtlas(novaUploadFrames(), opaque, {
        tile: NOVA_TILE,
        atlasWidth: NOVA_ATLAS_WIDTH,
        maxDimension,
    });
    const data = new Uint8ClampedArray(plan.width * plan.height * 4);
    for (const tile of plan.tiles)
        for (let row = 0; row < tile.height; row++) {
            const from = ((tile.sy + row) * source.width + tile.sx) * 4;
            data.set(
                source.data.subarray(from, from + tile.width * 4),
                ((tile.dy + row) * plan.width + tile.dx) * 4,
            );
        }
    return { pixels: { width: plan.width, height: plan.height, data }, plan };
}

let loadedPlan: SparseAtlasPlan | undefined;
/** Tile layout of the uploaded atlas; set when the atlas is derived from the loaded strip (undefined before). */
export const novaAtlasPlan = (): SparseAtlasPlan | undefined => loadedPlan;
/** Derive step of the atlas asset (also used by tests with a decoded strip). */
export function deriveNovaAtlas(source: Pixels): Pixels {
    const { pixels, plan } = packNovaAtlas(source);
    loadedPlan = plan;
    return pixels;
}

let extra: readonly ImageAsset[] | undefined;
export function playerFxExtraImages(): readonly ImageAsset[] {
    return (extra ??= Object.freeze([
        derivedImageAsset(NOVA_ATLAS_ID, REV01_URLS.nova, deriveNovaAtlas),
    ]));
}
