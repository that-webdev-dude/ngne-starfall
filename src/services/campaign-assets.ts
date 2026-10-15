import { imageAsset } from "@ngne/core";
import metadata from "../assets/campaign-art.json" with { type: "json" };
import type { ArtFrame } from "./art-assets.ts";
interface Source { imageSize: number[]; drawSize: number[]; frames: { rect: number[]; pivot: number[] }[]; sockets?: Record<string, number[]> }
const sources = metadata.assets as Record<string, Source>;
const images = {
  furnaceBackground: imageAsset("furnace-background", new URL("../assets/furnace-background.png", import.meta.url).href),
  citadelBackground: imageAsset("citadel-background", new URL("../assets/citadel-background.png", import.meta.url).href),
  kilnHead: imageAsset("kiln-head", new URL("../assets/kiln-head.png", import.meta.url).href),
  kilnSegment: imageAsset("kiln-segment", new URL("../assets/kiln-segment.png", import.meta.url).href),
  starfallEngine: imageAsset("starfall-engine", new URL("../assets/starfall-engine.png", import.meta.url).href),
  minelayer: imageAsset("minelayer", new URL("../assets/minelayer.png", import.meta.url).href),
  warden: imageAsset("warden", new URL("../assets/warden.png", import.meta.url).href),
};
export type CampaignArtKey = keyof typeof images;
const frames = new Map<CampaignArtKey, ArtFrame>();
export function campaignFrame(key: CampaignArtKey): ArtFrame {
  const cached = frames.get(key); if (cached) return cached;
  const source = sources[key]; if (!source) throw new Error(`Missing campaign artwork metadata: ${key}`);
  const [width, height] = source.drawSize, [x, y, w, h] = source.frames[0].rect, [px, py] = source.frames[0].pivot;
  const frame = { texture: images[key].id, width, height, pivotX: px / w * width, pivotY: py / h * height,
    u: x / source.imageSize[0], v: y / source.imageSize[1], uw: w / source.imageSize[0], vh: h / source.imageSize[1] };
  frames.set(key, frame); return frame;
}
export function campaignImageAssets(stageIndex: number) {
  return stageIndex === 0 ? [] : stageIndex === 1 ? [images.furnaceBackground, images.kilnHead, images.kilnSegment, images.minelayer, images.warden] : [images.citadelBackground, images.starfallEngine, images.minelayer, images.warden];
}
export function engineSockets(): { leftEmitter: number[]; rightEmitter: number[]; core: number[] } {
  const sockets = sources.starfallEngine?.sockets;
  if (!sockets?.leftEmitter || !sockets?.rightEmitter || !sockets?.core) throw new Error("Missing Starfall Engine emitter geometry");
  return { leftEmitter: sockets.leftEmitter, rightEmitter: sockets.rightEmitter, core: sockets.core };
}
