import type { Asset } from "@ngne/core";
import type { StageConfig } from "../config/stages.ts";
import { art, artImages, type ArtFrame } from "./art-assets.ts";
import { campaignFrame, campaignImages } from "./campaign-assets.ts";
import { combatImages } from "./combat-assets.ts";
import { combatAudioAssetsForStage } from "./sound.ts";

const shared = [artImages.player, artImages.exhaust, artImages.enemy, artImages.explosion];
const waveCraft = [combatImages.dart, combatImages.gunship];

/** Per stage: the background it draws and the images its scene claims (shared, then stage-specific). */
const STAGE_ART: Record<string, { background: ArtFrame; images: readonly Asset[] }> = {
  "orbital-breakwater": { background: art.background, images: [...shared, artImages.background, ...waveCraft, combatImages.gatebreaker] },
  "furnace-belt": { background: campaignFrame("furnaceBackground"), images: [...shared, ...waveCraft,
    campaignImages.furnaceBackground, campaignImages.kilnHead, campaignImages.kilnSegment, campaignImages.minelayer, campaignImages.warden] },
  "midnight-citadel": { background: campaignFrame("citadelBackground"), images: [...shared, ...waveCraft,
    campaignImages.citadelBackground, campaignImages.starfallEngine, campaignImages.minelayer, campaignImages.warden] },
};

export function stageArt(stage: StageConfig): { background: ArtFrame; images: readonly Asset[] } {
  const entry = STAGE_ART[stage.id];
  if (!entry) throw new Error(`Missing stage artwork: ${stage.id}`);
  return entry;
}
/** Every asset a stage scene claims: its images, then its music and effects. */
export function stageAssets(stage: StageConfig): Asset[] {
  return [...stageArt(stage).images, ...combatAudioAssetsForStage(stage.index)];
}
