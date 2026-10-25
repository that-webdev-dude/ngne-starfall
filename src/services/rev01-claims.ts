import type { ImageAsset } from "@ngne/core";
import { fontImage } from "./font-assets.ts";
import { playerFxExtraImages } from "./player-fx-assets.ts";
import { REV01_CLAIMS, rev01Image, type Rev01Id } from "./rev01-assets.ts";

/**
 * Shared rev01 scene claims. Reads the owner groups in `REV01_CLAIMS` plus the worker-owned hooks
 * (`fontImage` from font-assets.ts, T4; `playerFxExtraImages` from player-fx-assets.ts, T2), so workers change
 * what loads without editing this file or rev01-assets.ts. Hooks import rev01-assets only; nothing imports back.
 */
/** Drops repeats of the same asset; two different definitions under one id throw here instead of in the engine loader. */
function unique(assets: readonly ImageAsset[]): ImageAsset[] {
    const byId = new Map<string, ImageAsset>();
    for (const asset of assets) {
        const seen = byId.get(asset.id);
        if (seen && seen !== asset)
            throw new Error(`rev01 claims: two definitions for asset id ${asset.id}`);
        byId.set(asset.id, asset);
    }
    return [...byId.values()];
}
const plain = (ids: readonly Rev01Id[]) => ids.map(rev01Image);

/** Every rev01 image a stage scene claims, in a stable order. Unknown stages claim nothing. */
export function rev01StageImages(stageId: string): ImageAsset[] {
    const enemies = (REV01_CLAIMS.enemies as Record<string, readonly Rev01Id[]>)[stageId];
    const background = (REV01_CLAIMS.backgrounds as Record<string, Rev01Id>)[stageId];
    if (!enemies || !background) return [];
    return unique([
        ...plain([background, ...REV01_CLAIMS.playerFx]),
        ...playerFxExtraImages(),
        ...plain(enemies),
        fontImage(),
        ...plain(REV01_CLAIMS.hud),
        ...plain(REV01_CLAIMS.screens),
    ]);
}

/** The pause/settings/controls/result kit and font, claimed by the title. */
export const rev01ScreenImages = (): ImageAsset[] =>
    unique([fontImage(), ...plain(REV01_CLAIMS.screens)]);
