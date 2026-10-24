import type { Frame, Sprite } from "@ngne/core";
import type { NativeFrame } from "../services/rev01-assets.ts";

/**
 * Scenes that draw native rev01 frames turn the engine's centre rounding off (`camera.pixelSnap = false`):
 * it would put odd-sized quads on half pixels. Established code-drawn geometry goes through this view,
 * which preserves its engine-rounded centres while the camera offset stays whole.
 */
export function pixelSnapped(frame: Frame): Frame {
  const view = Object.create(frame) as Frame;
  view.sprite = (sprite: Sprite) => frame.sprite({ ...sprite, x: Math.round(sprite.x), y: Math.round(sprite.y) });
  view.rect = (x, y, width, height, color, alpha, layer, screen) => frame.rect(Math.round(x), Math.round(y), width, height, color, alpha, layer, screen);
  return view;
}

export interface NativeDraw { layer: number; alpha?: number; color?: number; flipX?: boolean; rotation?: 0 | -90; screen?: boolean }

/**
 * Quad for one native frame (1 texel = 1 logical pixel) whose pivot pixel is the screen pixel containing (x, y).
 * Every edge lands on a whole pixel, so nearest sampling never meets a texel boundary. `flipX` mirrors about the
 * pivot column (right-hand turrets/emitters); `rotation: -90` turns canvas +x to screen up about the pivot (Kiln).
 * Requires `camera.pixelSnap = false` and a whole-pixel camera offset (see `pixelSnapped`).
 */
export function nativeQuad(art: NativeFrame, x: number, y: number, draw: NativeDraw): Sprite {
  const px = Math.floor(x), py = Math.floor(y), { width: w, height: h, pivotX, pivotY } = art;
  const u = draw.flipX ? art.u + art.uw : art.u, uw = draw.flipX ? -art.uw : art.uw;
  const pivotColumn = draw.flipX ? w - 1 - pivotX : pivotX;
  const common = { width: w, height: h, texture: art.texture, u, v: art.v, uw, vh: art.vh, layer: draw.layer, alpha: draw.alpha ?? 1, color: draw.color ?? 0xffffff, screen: draw.screen ?? false };
  if (draw.rotation === -90) return { ...common, x: px - pivotY + h / 2, y: py - (w - 1 - pivotColumn) + w / 2, rotation: -Math.PI / 2 };
  return { ...common, x: px - pivotColumn + w / 2, y: py - pivotY + h / 2, rotation: 0 };
}

export function drawNative(frame: Frame, art: NativeFrame, x: number, y: number, draw: NativeDraw): void {
  frame.sprite(nativeQuad(art, x, y, draw));
}
