import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import type { Frame } from "@ngne/core";

/**
 * Software rasterizer for evidence sheets: replays an engine Frame's quads (sorted like the renderer: scene,
 * layer, depth, insertion) into an RGBA buffer with nearest sampling, tint multiply and src-over alpha.
 * Axis-aligned quads only (the HUD and screens never rotate). This is a software check of the quad list the
 * game code produces, not a GPU/browser capture.
 */
export interface Rgba { width: number; height: number; data: Uint8ClampedArray }

export function blank(width: number, height: number, color = 0x060d19): Rgba {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) { data[i * 4] = color >> 16; data[i * 4 + 1] = (color >> 8) & 255; data[i * 4 + 2] = color & 255; data[i * 4 + 3] = 255; }
  return { width, height, data };
}

/** Copies `source` rows [top, top + target.height) into target (e.g. a 640x400 background through its centre pivot). */
export function blitRows(target: Rgba, source: Rgba, top: number): void {
  for (let y = 0; y < target.height; y++) target.data.set(source.data.subarray((y + top) * source.width * 4, (y + top + 1) * source.width * 4), y * target.width * 4);
}

/** Draws every quad; textures resolve through `texture(id)` (undefined = quad skipped and counted). Returns skipped texture ids. */
export function rasterize(target: Rgba, frame: Frame, texture: (id: string) => Rgba | undefined): Set<string> {
  frame.sort();
  const d = frame.data, skipped = new Set<string>();
  for (const i of frame.order) {
    const o = i * 14, id = frame.textures[i], image = id ? texture(id) : undefined;
    if (id && !image) { skipped.add(id); continue; }
    const x0 = d[o], y0 = d[o + 1], width = d[o + 2], height = d[o + 5];
    const [u, v, uw, vh] = [d[o + 6], d[o + 7], d[o + 8], d[o + 9]], tint = [d[o + 10], d[o + 11], d[o + 12]], alpha = d[o + 13];
    for (let py = Math.max(0, Math.ceil(y0 - 0.5)); py < Math.min(target.height, y0 + height - 0.5); py++) {
      for (let px = Math.max(0, Math.ceil(x0 - 0.5)); px < Math.min(target.width, x0 + width - 0.5); px++) {
        let r = 255, g = 255, b = 255, a = 255;
        if (image) {
          const s = (px + 0.5 - x0) / width, t = (py + 0.5 - y0) / height;
          const tx = Math.min(image.width - 1, Math.floor((u + s * uw) * image.width)), ty = Math.min(image.height - 1, Math.floor((v + t * vh) * image.height)), k = (ty * image.width + tx) * 4;
          [r, g, b, a] = [image.data[k], image.data[k + 1], image.data[k + 2], image.data[k + 3]];
        }
        const sa = (a / 255) * alpha, p = (py * target.width + px) * 4;
        if (sa <= 0) continue;
        target.data[p] = r * tint[0] * sa + target.data[p] * (1 - sa);
        target.data[p + 1] = g * tint[1] * sa + target.data[p + 1] * (1 - sa);
        target.data[p + 2] = b * tint[2] * sa + target.data[p + 2] * (1 - sa);
      }
    }
  }
  return skipped;
}

/** Nearest-neighbour enlargement by an integer factor. */
export function enlarge(source: Rgba, k: number): Rgba {
  const out = blank(source.width * k, source.height * k);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) out.data.set(source.data.subarray(((y / k | 0) * source.width + (x / k | 0)) * 4, ((y / k | 0) * source.width + (x / k | 0)) * 4 + 4), (y * out.width + x) * 4);
  return out;
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (bytes: Uint8Array) => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(name: string, body: Uint8Array): Buffer {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0); out.write(name, 4, "latin1"); Buffer.from(body).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}
/** Minimal RGBA8 PNG writer (filter 0). */
export function writePng(path: string, image: Rgba): void {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0); header.writeUInt32BE(image.height, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let y = 0; y < image.height; y++) Buffer.from(image.data.buffer, image.data.byteOffset + y * image.width * 4, image.width * 4).copy(raw, y * (image.width * 4 + 1) + 1);
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())]));
}
