import { imageAsset } from "@ngne/core";
import metadata from "../assets/combat-art.json" with { type: "json" };
import { toArtFrame, type ArtFrame } from "./art-assets.ts";
export const combatImages = {
  dart: imageAsset("dart", new URL("../assets/dart.png", import.meta.url).href),
  gunship: imageAsset("gunship", new URL("../assets/gunship.png", import.meta.url).href),
  gatebreaker: imageAsset("gatebreaker", new URL("../assets/gatebreaker.png", import.meta.url).href),
};
export const combatArt = Object.fromEntries(Object.entries(combatImages).map(([key, definition]) => {
  const source = metadata.assets[key as keyof typeof combatImages];
  return [key, toArtFrame(definition.id, source, source.frames[0])];
})) as Record<keyof typeof combatImages, ArtFrame>;
