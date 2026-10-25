import type { Frame } from "@ngne/core";
import { FONT_MASK_TEXTURE } from "../services/font-assets.ts";
import { REV01_SPEC, rev01Sprite, type NativeFrame } from "../services/rev01-assets.ts";
import { drawNative } from "./sprite.ts";

/**
 * The rev01 5x7 font (spec presentation.font): monospaced, advance 6, line height 9, so a string is 6n - 1 px wide.
 * Glyphs are frames of the font strip drawn from its white mask (`fontImage()`, texture `rev01-font-mask`) tinted
 * with a text colour, at 1x only. Input is upper-cased; a character without a glyph (and space) only advances.
 */
const spec = REV01_SPEC.presentation as unknown as {
    font: { cell: [number, number]; advance: number; spaceAdvance: number; lineHeight: number };
};
export const FONT = {
    cell: spec.font.cell,
    advance: spec.font.advance,
    spaceAdvance: spec.font.spaceAdvance,
    lineHeight: spec.font.lineHeight,
} as const;

const characters = rev01Sprite("font").spec.characters as Record<string, string>;
const glyphs = new Map<string, NativeFrame>(
    rev01Sprite("font").frames.map((frame) => [
        characters[frame.name],
        { ...frame, texture: FONT_MASK_TEXTURE },
    ]),
);

/** Glyph frame (mask texture) for one character, or undefined when the font has none. */
export const glyph = (character: string): NativeFrame | undefined =>
    glyphs.get(character.toUpperCase());

/** Pixel width of a single line: 6n - 1 (0 for an empty string). */
export const textWidth = (value: string): number =>
    value.length ? value.length * FONT.advance - 1 : 0;

/** Left column that centres `value` on `centreX`: centreX - floor((6n - 1) / 2) (spec boss name / banner rule). */
export const centredX = (value: string, centreX: number): number =>
    centreX - Math.floor(textWidth(value) / 2);

/** Draws one line with its top-left pixel at (left, top), screen space, in `color` (a TEXT_COLOR entry). */
export function drawText(
    frame: Frame,
    value: string,
    left: number,
    top: number,
    color: number,
    layer: number,
): void {
    let x = Math.floor(left);
    const y = Math.floor(top);
    for (const character of value.toUpperCase()) {
        const image = character === " " ? undefined : glyphs.get(character);
        if (image) drawNative(frame, image, x, y, { layer, color, screen: true });
        x += character === " " ? FONT.spaceAdvance : FONT.advance;
    }
}
