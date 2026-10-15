/** Detached renderer ownership snapshot, not driver/process memory measurement. */
export interface RendererResourceInspection {
    readonly sources: number;
    readonly leasedSources: number;
    readonly manualSources: number;
    readonly consumers: number;
    readonly textures: number;
    readonly uploads: number;
    readonly manualReplacements: number;
    readonly estimatedSourceBytes: number;
    readonly estimatedTextureBytes: number;
    readonly entries: readonly Readonly<{
        id: string;
        ownership: "asset-lease" | "manual-snapshot";
        consumers: number;
        estimatedSourceBytes: number;
    }>[];
    readonly truncated: boolean;
}
