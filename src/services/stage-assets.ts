import type { Asset } from "@ngne/core";
import type { StageConfig } from "../config/stages.ts";
import { REV01_CLAIMS, rev01Sprite, type NativeFrame } from "./rev01-assets.ts";
import { rev01StageImages } from "./rev01-claims.ts";
import { combatAudioAssetsForStage } from "./sound.ts";

/** Native frame and the registry-derived images claimed by this stage. No superseded raster definitions remain. */
export function stageArt(stage: StageConfig): { background: NativeFrame; images: readonly Asset[] } {
  const id = REV01_CLAIMS.backgrounds[stage.id as keyof typeof REV01_CLAIMS.backgrounds];
  if (!id) throw new Error(`Missing stage artwork: ${stage.id}`);
  return { background: rev01Sprite(id).frames[0], images: rev01StageImages(stage.id) };
}
/** Every asset a stage scene claims: registry-derived rev01 images, then its music and effects. */
export function stageAssets(stage: StageConfig): Asset[] {
  return [...stageArt(stage).images, ...combatAudioAssetsForStage(stage.index)];
}
