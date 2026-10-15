import { imageAsset } from "@ngne/core";
import metadata from "../assets/combat-art.json" with { type: "json" };
import type { ArtFrame } from "./art-assets.ts";
const images = {
  dart: imageAsset("dart", new URL("../assets/dart.png", import.meta.url).href),
  gunship: imageAsset("gunship", new URL("../assets/gunship.png", import.meta.url).href),
  gatebreaker: imageAsset("gatebreaker", new URL("../assets/gatebreaker.png", import.meta.url).href),
};
export const combatImageAssets = Object.values(images);
export const combatArt = Object.fromEntries(Object.entries(images).map(([key, definition]) => {
  const source = metadata.assets[key as keyof typeof images], [width, height] = source.drawSize;
  const [x, y, w, h] = source.frames[0].rect, [px, py] = source.frames[0].pivot;
  return [key, { texture: definition.id, width, height, pivotX: px / w * width, pivotY: py / h * height,
    u: x / source.imageSize[0], v: y / source.imageSize[1], uw: w / source.imageSize[0], vh: h / source.imageSize[1] }];
})) as Record<keyof typeof images, ArtFrame>;
