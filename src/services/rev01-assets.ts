import { imageAsset, type ImageAsset } from "@ngne/core";
import spec from "../assets/spec.json" with { type: "json" };

/**
 * Native rev01 art: PNGs from src/assets; frames, pivots, sockets and animation from src/assets/spec.json,
 * one texel per logical pixel, no drawSize. Importing this module never decodes an image, so Node tests can
 * use all metadata; images load only when a scene claims them.
 */
export interface SpecAnimation {
    type: string;
    order?: string[];
    durationsMs?: number[];
    totalMs?: number;
}
export interface SpecSprite {
    id: string;
    frames: string[];
    canvas?: number[];
    canvases?: number[][];
    pivot?: number[] | string;
    animation?: SpecAnimation;
    sockets?: Record<string, unknown>;
    [key: string]: unknown;
}
export const REV01_SPEC = spec as unknown as {
    viewport: { logical: number[]; worldScaleFromPrevious: number };
    sprites: SpecSprite[];
    presentation: { layers: { list: string[] } } & Record<string, unknown>;
} & Record<string, unknown>;

/** One baked frame: its rect in the strip (texels), pivot pixel and UVs. Frames sit left to right, top-aligned. */
export interface NativeFrame {
    texture: string;
    name: string;
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX: number;
    pivotY: number;
    u: number;
    v: number;
    uw: number;
    vh: number;
}
export interface NativeSprite {
    id: string;
    texture: string;
    url: string;
    stripWidth: number;
    stripHeight: number;
    frames: readonly NativeFrame[];
    spec: SpecSprite;
    /** Spec playback (animation.order or all frames, with durationsMs); undefined for input-pose/state/static sprites. */
    playback?: { frames: readonly NativeFrame[]; durationsMs: readonly number[]; loop: boolean };
    frame(name: string): NativeFrame;
}

// Literal paths so Vite rewrites and bundles each PNG; one per spec sprite id.
export const REV01_URLS = {
    player: new URL("../assets/sprites/player.png", import.meta.url).href,
    playerFlash: new URL("../assets/sprites/playerFlash.png", import.meta.url).href,
    exhaust: new URL("../assets/sprites/exhaust.png", import.meta.url).href,
    primaryLance: new URL("../assets/sprites/primaryLance.png", import.meta.url).href,
    hostileBead: new URL("../assets/sprites/hostileBead.png", import.meta.url).href,
    hostileNeedle: new URL("../assets/sprites/hostileNeedle.png", import.meta.url).href,
    hostileOrb: new URL("../assets/sprites/hostileOrb.png", import.meta.url).href,
    plasmaCharge: new URL("../assets/sprites/plasmaCharge.png", import.meta.url).href,
    plasmaReady: new URL("../assets/sprites/plasmaReady.png", import.meta.url).href,
    plasmaMuzzle: new URL("../assets/sprites/plasmaMuzzle.png", import.meta.url).href,
    plasmaShot: new URL("../assets/sprites/plasmaShot.png", import.meta.url).href,
    plasmaImpact: new URL("../assets/sprites/plasmaImpact.png", import.meta.url).href,
    nova: new URL("../assets/sprites/nova.png", import.meta.url).href,
    novaCalm: new URL("../assets/sprites/novaCalm.png", import.meta.url).href,
    interceptor: new URL("../assets/sprites/interceptor.png", import.meta.url).href,
    dart: new URL("../assets/sprites/dart.png", import.meta.url).href,
    gunship: new URL("../assets/sprites/gunship.png", import.meta.url).href,
    warden: new URL("../assets/sprites/warden.png", import.meta.url).href,
    minelayer: new URL("../assets/sprites/minelayer.png", import.meta.url).href,
    gatebreaker: new URL("../assets/sprites/gatebreaker.png", import.meta.url).href,
    gatebreakerTurret: new URL("../assets/sprites/gatebreakerTurret.png", import.meta.url).href,
    kilnHead: new URL("../assets/sprites/kilnHead.png", import.meta.url).href,
    kilnSegment: new URL("../assets/sprites/kilnSegment.png", import.meta.url).href,
    starfallEngine: new URL("../assets/sprites/starfallEngine.png", import.meta.url).href,
    starfallEmitter: new URL("../assets/sprites/starfallEmitter.png", import.meta.url).href,
    explosion: new URL("../assets/sprites/explosion.png", import.meta.url).href,
    hitSpark: new URL("../assets/sprites/hitSpark.png", import.meta.url).href,
    heavyBreakup: new URL("../assets/sprites/heavyBreakup.png", import.meta.url).href,
    breakwaterBackground: new URL("../assets/backgrounds/breakwaterBackground.png", import.meta.url)
        .href,
    furnaceBackground: new URL("../assets/backgrounds/furnaceBackground.png", import.meta.url).href,
    citadelBackground: new URL("../assets/backgrounds/citadelBackground.png", import.meta.url).href,
    playerDeath: new URL("../assets/sprites/playerDeath.png", import.meta.url).href,
    playerCalm: new URL("../assets/sprites/playerCalm.png", import.meta.url).href,
    plasmaReadyCalm: new URL("../assets/sprites/plasmaReadyCalm.png", import.meta.url).href,
    mine: new URL("../assets/sprites/mine.png", import.meta.url).href,
    pickup: new URL("../assets/sprites/pickup.png", import.meta.url).href,
    beamWarning: new URL("../assets/sprites/beamWarning.png", import.meta.url).href,
    font: new URL("../assets/sprites/font.png", import.meta.url).href,
    hudPip: new URL("../assets/sprites/hudPip.png", import.meta.url).href,
    novaBar: new URL("../assets/sprites/novaBar.png", import.meta.url).href,
    chargeBar: new URL("../assets/sprites/chargeBar.png", import.meta.url).href,
    bossBar: new URL("../assets/sprites/bossBar.png", import.meta.url).href,
    bossBarMark: new URL("../assets/sprites/bossBarMark.png", import.meta.url).href,
    hudPlate: new URL("../assets/sprites/hudPlate.png", import.meta.url).href,
    bannerPlate: new URL("../assets/sprites/bannerPlate.png", import.meta.url).href,
    hudCalm: new URL("../assets/sprites/hudCalm.png", import.meta.url).href,
    menuPanel: new URL("../assets/sprites/menuPanel.png", import.meta.url).href,
    panelRule: new URL("../assets/sprites/panelRule.png", import.meta.url).href,
    menuItem: new URL("../assets/sprites/menuItem.png", import.meta.url).href,
    optionToggle: new URL("../assets/sprites/optionToggle.png", import.meta.url).href,
    optionMeter: new URL("../assets/sprites/optionMeter.png", import.meta.url).href,
    stageCard: new URL("../assets/sprites/stageCard.png", import.meta.url).href,
    resultPlate: new URL("../assets/sprites/resultPlate.png", import.meta.url).href,
} as const;
export type Rev01Id = keyof typeof REV01_URLS;

const textureId = (id: Rev01Id) => `rev01-${id}`;

/** Canvas per frame: the shared `canvas`, or `canvases` (one per frame). */
export function frameCanvases(sprite: SpecSprite): number[][] {
    if (sprite.canvases) return sprite.canvases;
    if (!sprite.canvas) throw new Error(`rev01 ${sprite.id}: no canvas`);
    return sprite.frames.map(() => sprite.canvas!);
}

/** Pivot pixel: explicit [x, y], otherwise (including "centre of each frame") the centre pixel ((w-1)/2, (h-1)/2). */
function pivotOf(sprite: SpecSprite, [w, h]: number[]): [number, number] {
    return Array.isArray(sprite.pivot)
        ? [sprite.pivot[0], sprite.pivot[1]]
        : [(w - 1) / 2, (h - 1) / 2];
}

function build(id: Rev01Id): NativeSprite {
    const source = REV01_SPEC.sprites.find((entry) => entry.id === id);
    if (!source) throw new Error(`rev01 spec has no sprite ${id}`);
    const canvases = frameCanvases(source),
        texture = textureId(id);
    if (canvases.length !== source.frames.length)
        throw new Error(
            `rev01 ${id}: ${canvases.length} canvases for ${source.frames.length} frames`,
        );
    const stripWidth = canvases.reduce((sum, [w]) => sum + w, 0),
        stripHeight = Math.max(...canvases.map(([, h]) => h));
    let x = 0;
    const frames = canvases.map(([width, height], index): NativeFrame => {
        const [pivotX, pivotY] = pivotOf(source, [width, height]);
        if (!Number.isInteger(pivotX) || !Number.isInteger(pivotY))
            throw new Error(`rev01 ${id}: pivot not on a whole pixel`);
        const frame = {
            texture,
            name: source.frames[index],
            index,
            x,
            y: 0,
            width,
            height,
            pivotX,
            pivotY,
            u: x / stripWidth,
            v: 0,
            uw: width / stripWidth,
            vh: height / stripHeight,
        };
        x += width;
        return frame;
    });
    const byName = new Map(frames.map((frame) => [frame.name, frame]));
    const frame = (name: string) => {
        const found = byName.get(name);
        if (!found) throw new Error(`rev01 ${id}: no frame ${name}`);
        return found;
    };
    const animation = source.animation;
    let playback: NativeSprite["playback"];
    if (animation?.durationsMs) {
        const order = (animation.order ?? source.frames).map(frame);
        if (order.length !== animation.durationsMs.length)
            throw new Error(
                `rev01 ${id}: ${order.length} frames for ${animation.durationsMs.length} durations`,
            );
        playback = {
            frames: order,
            durationsMs: animation.durationsMs,
            loop: animation.type === "loop",
        };
    }
    return {
        id,
        texture,
        url: REV01_URLS[id],
        stripWidth,
        stripHeight,
        frames,
        spec: source,
        playback,
        frame,
    };
}

const sprites = new Map<Rev01Id, NativeSprite>();
export function rev01Sprite(id: Rev01Id): NativeSprite {
    let sprite = sprites.get(id);
    if (!sprite) {
        sprite = build(id);
        sprites.set(id, sprite);
    }
    return sprite;
}

/**
 * Plain image claims by consumer; scenes claim through rev01-claims.ts. Two ids are absent on purpose:
 * - nova: its 7766x1545 strip is never uploaded whole; T2 returns a sparse atlas from `playerFxExtraImages()`
 *   (player-fx-assets.ts) built with `planSparseAtlas` (fade-3 excluded).
 * - font: claimed only through the white mask from `fontImage()` (font-assets.ts).
 */
export const REV01_CLAIMS = {
    /** T2: player, projectiles, effects, mines, pickups, beam warning. */
    playerFx: [
        "player",
        "playerFlash",
        "playerCalm",
        "exhaust",
        "primaryLance",
        "hostileBead",
        "hostileNeedle",
        "hostileOrb",
        "plasmaCharge",
        "plasmaReady",
        "plasmaReadyCalm",
        "plasmaMuzzle",
        "plasmaShot",
        "plasmaImpact",
        "novaCalm",
        "explosion",
        "hitSpark",
        "heavyBreakup",
        "playerDeath",
        "mine",
        "pickup",
        "beamWarning",
    ],
    /** T3: per stage, the enemies and boss parts that stage spawns. */
    enemies: {
        "orbital-breakwater": [
            "interceptor",
            "dart",
            "gunship",
            "gatebreaker",
            "gatebreakerTurret",
        ],
        "furnace-belt": [
            "interceptor",
            "dart",
            "gunship",
            "minelayer",
            "warden",
            "kilnHead",
            "kilnSegment",
        ],
        "midnight-citadel": [
            "interceptor",
            "dart",
            "gunship",
            "minelayer",
            "warden",
            "starfallEngine",
            "starfallEmitter",
        ],
    },
    /** T4: HUD bands, bars, banner, stage card. */
    hud: [
        "hudPip",
        "novaBar",
        "chargeBar",
        "bossBar",
        "bossBarMark",
        "hudPlate",
        "bannerPlate",
        "hudCalm",
        "stageCard",
    ],
    /** T4: pause/settings/controls/result kit (claimed by the stage beneath pause/result, and by the title). */
    screens: [
        "menuPanel",
        "panelRule",
        "menuItem",
        "optionToggle",
        "optionMeter",
        "resultPlate",
        "hudCalm",
    ],
    /** Native 640x400 stage backgrounds, centred/cropped into the 640x360 view. */
    backgrounds: {
        "orbital-breakwater": "breakwaterBackground",
        "furnace-belt": "furnaceBackground",
        "midnight-citadel": "citadelBackground",
    },
} as const satisfies {
    playerFx: readonly Rev01Id[];
    enemies: Record<string, readonly Rev01Id[]>;
    hud: readonly Rev01Id[];
    screens: readonly Rev01Id[];
    backgrounds: Record<string, Rev01Id>;
};

const images = new Map<Rev01Id, ImageAsset>();
/** The engine image asset for one rev01 strip (texture id `rev01-<id>`). Nova and font have their own hooks. */
export function rev01Image(id: Rev01Id): ImageAsset {
    if (id === "nova")
        throw new Error("rev01 nova is uploaded as a sparse atlas, never as a full strip");
    if (id === "font")
        throw new Error("rev01 font is claimed only through fontImage() in font-assets.ts");
    let asset = images.get(id);
    if (!asset) {
        asset = imageAsset(textureId(id), REV01_URLS[id]);
        images.set(id, asset);
    }
    return asset;
}

/** RGBA8 pixels, row-major (ImageData-compatible). */
export interface Pixels {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

/** Font seam: keeps alpha and turns every opaque texel white so a tint colour reproduces exactly (spec font is a mask). */
export function maskPixels(source: Pixels): Pixels {
    const data = new Uint8ClampedArray(source.data.length);
    for (let i = 0; i < data.length; i += 4) {
        const alpha = source.data[i + 3];
        if (alpha) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = alpha;
        }
    }
    return { width: source.width, height: source.height, data };
}

/**
 * Image asset whose pixels are derived from a rev01 PNG before upload (font mask, nova sparse atlas).
 * Browser-only at load time (OffscreenCanvas); defining one is safe under Node.
 */
export function derivedImageAsset(
    id: string,
    url: string,
    derive: (source: Pixels) => Pixels,
): ImageAsset {
    return {
        id,
        kind: "image",
        estimateBytes: (bitmap) => bitmap.width * bitmap.height * 4,
        async load(signal) {
            const response = await fetch(url, { signal });
            if (!response.ok) throw new Error(`Image load failed: ${response.status}`);
            const decoded = await createImageBitmap(await response.blob(), {
                premultiplyAlpha: "none",
                colorSpaceConversion: "none",
            });
            let source: ImageData;
            try {
                signal.throwIfAborted();
                const canvas = new OffscreenCanvas(decoded.width, decoded.height),
                    context = canvas.getContext("2d", { willReadFrequently: true });
                if (!context) throw new Error("2D canvas unavailable");
                context.drawImage(decoded, 0, 0);
                source = context.getImageData(0, 0, canvas.width, canvas.height);
            } finally {
                decoded.close();
            }
            signal.throwIfAborted();
            const result = derive(source);
            return createImageBitmap(
                new ImageData(new Uint8ClampedArray(result.data), result.width, result.height),
                { premultiplyAlpha: "none", colorSpaceConversion: "none" },
            );
        },
        dispose: (bitmap) => bitmap.close(),
    };
}

export interface SparseTile {
    frame: number;
    sx: number;
    sy: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
    offsetX: number;
    offsetY: number;
}
export interface SparseAtlasPlan {
    tile: number;
    width: number;
    height: number;
    texels: number;
    tiles: readonly SparseTile[];
    /** Tile indices per uploaded frame, in upload order; offsets are from the frame's pivot pixel. */
    frameTiles: readonly (readonly number[])[];
}
/**
 * Packs only non-empty tile cells of the given frames into rows of an atlas no wider than `atlasWidth`.
 * `occupied` decides per cell (frame-local rect, clipped at frame edges). Throws when the result would
 * exceed `maxDimension` (the device's maxTextureDimension2D).
 */
export function planSparseAtlas(
    frames: readonly NativeFrame[],
    occupied: (frame: NativeFrame, x: number, y: number, width: number, height: number) => boolean,
    options: { tile?: number; atlasWidth?: number; maxDimension: number },
): SparseAtlasPlan {
    const tile = options.tile ?? 32,
        width = Math.min(options.atlasWidth ?? 2048, options.maxDimension),
        columns = Math.floor(width / tile);
    const tiles: SparseTile[] = [],
        frameTiles: number[][] = [];
    frames.forEach((frame, index) => {
        const list: number[] = [];
        for (let y = 0; y < frame.height; y += tile)
            for (let x = 0; x < frame.width; x += tile) {
                const w = Math.min(tile, frame.width - x),
                    h = Math.min(tile, frame.height - y);
                if (!occupied(frame, x, y, w, h)) continue;
                const slot = tiles.length;
                list.push(slot);
                tiles.push({
                    frame: index,
                    sx: frame.x + x,
                    sy: frame.y + y,
                    width: w,
                    height: h,
                    dx: (slot % columns) * tile,
                    dy: Math.floor(slot / columns) * tile,
                    offsetX: x - frame.pivotX,
                    offsetY: y - frame.pivotY,
                });
            }
        frameTiles.push(list);
    });
    const height = Math.max(1, Math.ceil(tiles.length / columns)) * tile;
    if (height > options.maxDimension)
        throw new Error(
            `Sparse atlas ${width}x${height} exceeds maxTextureDimension2D ${options.maxDimension}`,
        );
    return {
        tile,
        width,
        height,
        texels: tiles.reduce((sum, entry) => sum + entry.width * entry.height, 0),
        tiles,
        frameTiles,
    };
}

/** Nova frames to upload: exactly the spec playback order (11 frames, 560 ms); fade-3 is neither played nor uploaded. */
export function novaUploadFrames(): readonly NativeFrame[] {
    const playback = rev01Sprite("nova").playback;
    if (!playback) throw new Error("rev01 nova has no playback");
    return playback.frames;
}
