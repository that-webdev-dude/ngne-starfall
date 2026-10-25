import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

/** IHDR width/height without decoding pixel data. */
export function pngSize(path: string): { width: number; height: number } {
    const bytes = readFileSync(path);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Minimal decoder for the art pack: 8-bit RGBA (6) or RGB (2), non-interlaced. Returns RGBA8. */
export function decodePng(path: string): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
} {
    const bytes = readFileSync(path),
        chunks: Buffer[] = [];
    const width = bytes.readUInt32BE(16),
        height = bytes.readUInt32BE(20),
        depth = bytes[24],
        type = bytes[25],
        interlace = bytes[28];
    if (depth !== 8 || (type !== 6 && type !== 2) || interlace !== 0)
        throw new Error(`${path}: unsupported PNG ${depth}/${type}/${interlace}`);
    for (let offset = 8; offset < bytes.length;) {
        const length = bytes.readUInt32BE(offset),
            name = bytes.toString("latin1", offset + 4, offset + 8);
        if (name === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
        offset += length + 12;
    }
    const raw = inflateSync(Buffer.concat(chunks)),
        channels = type === 6 ? 4 : 3,
        stride = width * channels;
    const rows = new Uint8Array(height * stride),
        data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)],
            line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)),
            out = y * stride;
        for (let x = 0; x < stride; x++) {
            const left = x >= channels ? rows[out + x - channels] : 0,
                up = y ? rows[out - stride + x] : 0,
                corner = x >= channels && y ? rows[out - stride + x - channels] : 0;
            const p = left + up - corner,
                pa = Math.abs(p - left),
                pb = Math.abs(p - up),
                pc = Math.abs(p - corner);
            const predictor =
                filter === 0
                    ? 0
                    : filter === 1
                      ? left
                      : filter === 2
                        ? up
                        : filter === 3
                          ? (left + up) >> 1
                          : pa <= pb && pa <= pc
                            ? left
                            : pb <= pc
                              ? up
                              : corner;
            rows[out + x] = (line[x] + predictor) & 255;
        }
    }
    for (let i = 0; i < width * height; i++) {
        data[i * 4] = rows[i * channels];
        data[i * 4 + 1] = rows[i * channels + 1];
        data[i * 4 + 2] = rows[i * channels + 2];
        data[i * 4 + 3] = channels === 4 ? rows[i * channels + 3] : 255;
    }
    return { width, height, data };
}
