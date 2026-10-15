import type { Frame } from "@ngne/core";
import type { ArtFrame } from "../services/art-assets.ts";
export function drawSprite(frame: Frame, artwork: ArtFrame, x: number, y: number, layer = 2, alpha = 1, color = 0xffffff, rotation = 0): void {
  const offsetX = artwork.width / 2 - artwork.pivotX, offsetY = artwork.height / 2 - artwork.pivotY;
  const c = Math.cos(rotation), s = Math.sin(rotation);
  frame.sprite({ x: x + offsetX * c - offsetY * s, y: y + offsetX * s + offsetY * c,
    width: artwork.width, height: artwork.height, texture: artwork.texture, u: artwork.u, v: artwork.v,
    uw: artwork.uw, vh: artwork.vh, layer, alpha, color, rotation });
}
