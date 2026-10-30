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

const nova = rev01Sprite("nova").spec;
const radii = (nova.radii as { outer: number[] }).outer;
const dissipation = nova.dissipation as {
    bandPx: number[];
    arcCoverage: number[];
    sectors: number;
};

/** A binary cutout in source-pixel coordinates, applied once at upload, never per render tick. */
function keepNovaPixel(frame: NativeFrame, x: number, y: number): boolean {
    const band = dissipation.bandPx[frame.index];
    if (!band) return true; // Ignition (also used by reduced motion) and the first two rings are untouched.
    const dx = x - frame.pivotX,
        dy = y - frame.pivotY,
        radius = Math.hypot(dx, dy),
        outer = radii[frame.index];
    if (radius < outer - band || radius > outer + 0.5) return false;
    const coverage = dissipation.arcCoverage[frame.index];
    if (coverage === 1) return true;
    // Stable, uneven arc centres: gaps widen along the same rays as the wave travels outward.
    // No random speckle, rotation, resampling, partial alpha or tile-local coordinates.
    const sector = ((Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1) * dissipation.sectors,
        index = Math.floor(sector),
        centre = 0.5 + 0.12 * Math.sin(index * 2.4),
        width = coverage * (0.8 + 0.2 * Math.cos(index * 1.7));
    return Math.abs(sector - index - centre) <= width / 2;
}

/**
 * Packs only the occupied 32x32 cells of the 11 played nova frames (fade-3 excluded by `novaUploadFrames`) from the
 * decoded strip into a sparse atlas, cutting the normal-motion ring into progressively thinner arcs.
 * Retained RGBA texels are copied exactly; the source strip is never mutated.
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
    const frames = novaUploadFrames();
    const opaque = (frame: NativeFrame, x: number, y: number, width: number, height: number) => {
        for (let row = y; row < y + height; row++) {
            for (let col = x; col < x + width; col++)
                if (
                    source.data[((frame.y + row) * source.width + frame.x + col) * 4 + 3] &&
                    keepNovaPixel(frame, col, row)
                )
                    return true;
        }
        return false;
    };
    const plan = planSparseAtlas(frames, opaque, {
        tile: NOVA_TILE,
        atlasWidth: NOVA_ATLAS_WIDTH,
        maxDimension,
    });
    const data = new Uint8ClampedArray(plan.width * plan.height * 4);
    for (const tile of plan.tiles) {
        const frame = frames[tile.frame];
        for (let row = 0; row < tile.height; row++) {
            const from = ((tile.sy + row) * source.width + tile.sx) * 4;
            for (let col = 0; col < tile.width; col++) {
                const offset = from + col * 4;
                if (
                    source.data[offset + 3] &&
                    keepNovaPixel(frame, tile.sx + col - frame.x, tile.sy + row - frame.y)
                )
                    data.set(
                        source.data.subarray(offset, offset + 4),
                        ((tile.dy + row) * plan.width + tile.dx + col) * 4,
                    );
            }
        }
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
