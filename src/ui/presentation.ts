import type { Frame } from "@ngne/core";
import {
    REV01_SPEC,
    rev01Sprite,
    type NativeFrame,
    type NativeSprite,
    type Rev01Id,
} from "../services/rev01-assets.ts";
import { drawNative } from "./sprite.ts";

/**
 * T4 presentation helpers: spec palette lookups, text colours and native placement for HUD/screen sprites.
 * Every HUD and screen position in spec `presentation` is the top-left pixel; frames draw at native size.
 */
interface Ramp {
    name: string;
    colors: string[];
}
const ramps = new Map(
    (REV01_SPEC.palette as { ramps: Ramp[] }).ramps.map((ramp) => [ramp.name, ramp.colors]),
);

/** Colour of a spec palette reference such as "ui[1]" or "ui[1] (chain > 1)" (the leading ramp[index] token). */
export function paletteColor(reference: string): number {
    const match = /^(\w+)\[(\d+)\]/.exec(reference.trim());
    const hex = match ? ramps.get(match[1])?.[Number(match[2])] : undefined;
    if (!hex) throw new Error(`rev01 palette: no colour ${reference}`);
    return parseInt(hex.slice(1), 16);
}

export interface Presentation {
    textColors: Record<string, string>;
    bands: {
        top: { rows: [number, number]; fill: string; edge: string };
        bottom: { rows: [number, number]; fill: string; edge: string };
        opacity: number;
    };
    layout: {
        topRowA: {
            textRows: [number, number];
            plateRows: [number, number];
            wordmark: { text: string; x: number };
            score: { x: number };
            scorePlate: [number, number];
            chain: { x: number };
            chainPlate: [number, number];
            hullLabel: { text: string; x: number };
            hullPips: { x: number[]; y: number };
            hullPlate: [number, number];
            nova: { x: number };
            novaBar: { x: number; y: number };
            novaPlate: [number, number];
        };
        topRowB: {
            bossName: { textRows: [number, number] };
            bossBar: { x: number; y: number };
            bossMarks: { y: number; thresholds: Record<string, number[]> };
        };
        bottom: {
            textRows: [number, number];
            plateRows: [number, number];
            stage: { x: number };
            stagePlate: [number, number];
            chargeLabel: { text: string; x: number };
            chargeBar: { x: number; y: number };
            chargePlate: [number, number];
            controlsHint: { text: string; x: number };
            timerPlate: [number, number];
        };
        banner: { rows: [number, number]; textRows: [number, number]; centreX: number };
        stageCard: { x: number; y: number };
    };
    screens: {
        dim: { fill: string; opacity: number };
        panel: {
            x: [number, number];
            centreY: number;
            itemStep: number;
            item: { x: [number, number]; height: number };
        };
        pause: { title: string; items: string[] };
        settings: { title: string };
        controls: { title: string; lines: number; lineStep: number; lineX: number };
        result: { plate: { x: number; y: number } };
        footer: { text: string; row: number; centreX: number };
    };
}
export const PRESENTATION = REV01_SPEC.presentation as unknown as Presentation;

export type TextColor =
    | "label"
    | "value"
    | "heading"
    | "danger"
    | "disabled"
    | "novaReady"
    | "chainActive"
    | "chainIdle"
    | "scorePop"
    | "focused";
/** `presentation.textColors`, resolved through the palette (tint colours for the font mask). */
export const TEXT_COLOR = Object.fromEntries(
    Object.entries(PRESENTATION.textColors).map(([name, reference]) => [
        name,
        paletteColor(reference),
    ]),
) as Record<TextColor, number>;

/** Native frame by sprite id and frame name. */
export const art = (id: Rev01Id, name: string): NativeFrame => rev01Sprite(id).frame(name);

/** Draws a native frame with its top-left pixel at (left, top), in screen space (HUD and screens never shake). */
export function drawAt(
    frame: Frame,
    image: NativeFrame,
    left: number,
    top: number,
    layer: number,
): void {
    drawNative(frame, image, left + image.pivotX, top + image.pivotY, { layer, screen: true });
}

/** Columns [0, columns) of a pivot-(0,0) frame: the bar fill rule (texels are cropped, never scaled). */
export function clipColumns(image: NativeFrame, columns: number): NativeFrame {
    const width = Math.max(0, Math.min(image.width, Math.floor(columns)));
    return { ...image, width, uw: (image.uw * width) / image.width };
}

/** Columns lit for a fill fraction: ceil(width * fraction), clamped to the frame (spec presentation.integration bars). */
export const fillColumns = (width: number, fraction: number) =>
    Math.min(width, Math.max(0, Math.ceil(width * Math.min(1, Math.max(0, fraction)))));

/**
 * A 1-texel-wide (and/or 1-texel-tall) slice repeated across `width` x `height` pixels. The quad samples only
 * that one texel along the stretched axis, so nearest filtering gives exactly the repeated slice.
 */
export function drawRepeat(
    frame: Frame,
    image: NativeFrame,
    left: number,
    top: number,
    width: number,
    height: number,
    layer: number,
): void {
    if (width <= 0 || height <= 0) return;
    if (
        (width !== image.width && image.width !== 1) ||
        (height !== image.height && image.height !== 1)
    )
        throw new Error(`${image.texture}/${image.name}: only 1-texel slices repeat`);
    frame.sprite({
        x: left + width / 2,
        y: top + height / 2,
        width,
        height,
        texture: image.texture,
        u: image.u,
        v: image.v,
        uw: image.uw,
        vh: image.vh,
        layer,
        screen: true,
    });
}

/** 3-slice: left cap at `left`, fill repeated, right cap ending at column left + width - 1. */
export function drawThreeSlice(
    frame: Frame,
    sprite: NativeSprite,
    [leftName, fillName, rightName]: readonly [string, string, string],
    left: number,
    top: number,
    width: number,
    layer: number,
): void {
    const head = sprite.frame(leftName),
        fill = sprite.frame(fillName),
        tail = sprite.frame(rightName);
    drawAt(frame, head, left, top, layer);
    drawRepeat(
        frame,
        fill,
        left + head.width,
        top,
        width - head.width - tail.width,
        fill.height,
        layer,
    );
    drawAt(frame, tail, left + width - tail.width, top, layer);
}

/** 9-slice menuPanel covering columns left..left+width-1 and rows top..top+height-1. */
export function drawNineSlice(
    frame: Frame,
    left: number,
    top: number,
    width: number,
    height: number,
    layer: number,
): void {
    const panel = rev01Sprite("menuPanel"),
        corner = panel.frame("top-left"),
        cw = corner.width,
        ch = corner.height;
    const innerW = width - 2 * cw,
        innerH = height - 2 * ch,
        right = left + width - cw,
        bottom = top + height - ch;
    drawAt(frame, corner, left, top, layer);
    drawRepeat(frame, panel.frame("top"), left + cw, top, innerW, ch, layer);
    drawAt(frame, panel.frame("top-right"), right, top, layer);
    drawRepeat(frame, panel.frame("left"), left, top + ch, cw, innerH, layer);
    drawRepeat(frame, panel.frame("fill"), left + cw, top + ch, innerW, innerH, layer);
    drawRepeat(frame, panel.frame("right"), right, top + ch, cw, innerH, layer);
    drawAt(frame, panel.frame("bottom-left"), left, bottom, layer);
    drawRepeat(frame, panel.frame("bottom"), left + cw, bottom, innerW, ch, layer);
    drawAt(frame, panel.frame("bottom-right"), right, bottom, layer);
}

/** Opaque code-drawn rect over whole pixels (bands, dim overlay), screen space. */
export function fillRect(
    frame: Frame,
    left: number,
    top: number,
    width: number,
    height: number,
    color: number,
    layer: number,
    alpha = 1,
): void {
    frame.rect(left + width / 2, top + height / 2, width, height, color, alpha, layer, true);
}

/** Frame of a spec playback at `ms` (loops wrap; non-loops hold the last frame). */
export function playbackFrame(sprite: NativeSprite, ms: number): NativeFrame {
    const playback = sprite.playback;
    if (!playback) throw new Error(`rev01 ${sprite.id} has no playback`);
    const total = playback.durationsMs.reduce((sum, duration) => sum + duration, 0);
    let t = playback.loop
        ? ((ms % total) + total) % total
        : Math.min(Math.max(ms, 0), total - 1e-9);
    for (let i = 0; i < playback.frames.length; i++) {
        if (t < playback.durationsMs[i]) return playback.frames[i];
        t -= playback.durationsMs[i];
    }
    return playback.frames[playback.frames.length - 1];
}
