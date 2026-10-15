export interface Asset<T = unknown> {
    readonly id: string;
    readonly kind?: "image" | "audio";
    /** Decoded payload estimate; absent/undefined means unknown. */
    estimateBytes?(value: T): number | undefined;
    load(signal: AbortSignal): Promise<T>;
    dispose?(value: T): void;
}
export interface Lease<T = unknown> {
    readonly id: string;
    readonly value: T;
    release(): void;
}
export interface ImageAsset extends Asset<ImageBitmap> {
    readonly kind: "image";
}
export declare function imageAsset(id: string, url: string): ImageAsset;
export type AssetClaim = "external" | "scene" | "dependency" | "renderer";
export interface AssetRetention {
    readonly maxEntries?: number;
    readonly maxBytes?: number;
}
export interface AssetsOptions {
    readonly retention?: AssetRetention;
    readonly diagnostic?: (error: unknown) => void;
}
export interface AssetEntryInspection {
    readonly id: string;
    readonly loaded: boolean;
    readonly estimatedBytes: number | undefined;
    readonly claims: Readonly<Record<AssetClaim, number>>;
}
export interface AssetInspection {
    readonly loaded: number;
    readonly loading: number;
    readonly leased: number;
    readonly unleased: number;
    readonly claims: Readonly<Record<AssetClaim, number>>;
    readonly estimatedBytes: number;
    readonly imageBytes: number;
    readonly audioBytes: number;
    readonly unknownSizes: number;
    readonly overBudget: boolean;
    readonly protectedOverBudget: boolean;
    readonly cleanupFailures: number;
    readonly entries: readonly AssetEntryInspection[];
    readonly truncated: boolean;
}
/** Shared decoded data; GPU uploads belong to the renderer. */
export declare class Assets {
    private entries;
    private disposed;
    private order;
    private cleanupFailures;
    private trimming;
    private readonly maxEntries;
    private readonly maxBytes;
    private readonly diagnostic?;
    constructor(options?: AssetsOptions);
    acquire<T>(definition: Asset<T>, signal?: AbortSignal, claim?: AssetClaim): Promise<Lease<T>>;
    private autoTrim;
    private report;
    private remove;
    trim(): void;
    evict(id: string): boolean;
    inspect(limit?: number): AssetInspection;
    dispose(): void;
}
