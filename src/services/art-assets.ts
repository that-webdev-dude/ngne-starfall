import { imageAsset } from "@ngne/core";
import metadata from "../assets/art-gate.json" with { type: "json" };

interface SourceFrame { name: string; rect: number[]; pivot: number[] }
interface SourceAsset {
  imageSize: number[] | null;
  drawSize: number[];
  frames: SourceFrame[];
  animation?: { order: string[]; durationsMs?: number[] };
}
export interface ArtFrame {
  texture: string;
  width: number; height: number; pivotX: number; pivotY: number;
  u: number; v: number; uw: number; vh: number;
}
/** Converts one metadata frame (pixel rect and pivot in the source image) into a drawable, UV-mapped frame at `drawSize`. */
export function toArtFrame(texture: string, source: { imageSize: number[]; drawSize: number[] }, frame: { rect: number[]; pivot: number[] }): ArtFrame {
  const [width, height] = source.drawSize, [imageWidth, imageHeight] = source.imageSize, [x, y, w, h] = frame.rect, [px, py] = frame.pivot;
  return { texture, width, height, pivotX: px / w * width, pivotY: py / h * height, u: x / imageWidth, v: y / imageHeight, uw: w / imageWidth, vh: h / imageHeight };
}
export const artImages = {
  player: imageAsset("player-bank", new URL("../assets/player-bank.png", import.meta.url).href),
  exhaust: imageAsset("exhaust", new URL("../assets/exhaust.png", import.meta.url).href),
  enemy: imageAsset("interceptor", new URL("../assets/interceptor.png", import.meta.url).href),
  explosion: imageAsset("explosion", new URL("../assets/explosion.png", import.meta.url).href),
  background: imageAsset("orbital-breakwater", new URL("../assets/orbital-breakwater.png", import.meta.url).href),
};
export const artAssets = Object.values(artImages);
function frames(key: keyof typeof artImages): ArtFrame[] {
  const source = metadata.assets[key] as SourceAsset, imageSize = source.imageSize;
  if (!imageSize || source.frames.length === 0) throw new Error(`Art metadata incomplete: ${key}`);
  const ordered = source.animation?.order.map((name) => {
    const frame = source.frames.find((entry) => entry.name === name);
    if (!frame) throw new Error(`Missing ${key} frame: ${name}`);
    return frame;
  }) ?? source.frames;
  return ordered.map((frame) => toArtFrame(artImages[key].id, { imageSize, drawSize: source.drawSize }, frame));
}
const player = frames("player");
export const art = {
  player: { left: player[0], neutral: player[1], right: player[2] },
  exhaust: frames("exhaust"),
  exhaustSockets: {
    left: metadata.assets.player.exhaustSockets["bank-left"],
    neutral: metadata.assets.player.exhaustSockets.neutral,
    right: metadata.assets.player.exhaustSockets["bank-right"],
  },
  exhaustDurations: metadata.assets.exhaust.animation.durationsMs,
  enemy: frames("enemy")[0], explosions: frames("explosion"),
  explosionDurations: metadata.assets.explosion.animation.durationsMs,
  background: frames("background")[0],
};

export function animationIndex(seconds: number, durationsMs: readonly number[], loop = false): number {
  const total = durationsMs.reduce((sum, duration) => sum + duration, 0);
  let cursor = Math.max(0, seconds * 1000);
  if (loop) cursor %= total;
  for (let index = 0; index < durationsMs.length; index++) {
    if (cursor < durationsMs[index]) return index;
    cursor -= durationsMs[index];
  }
  return durationsMs.length;
}
