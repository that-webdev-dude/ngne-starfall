import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
    Camera,
    Frame,
    Game,
    emptyInput,
    type InputSnapshot,
    type PreparedScene,
} from "@ngne/core";
import { LAYER, LAYER_CATEGORIES } from "../src/config/layers.ts";
import { STAGES } from "../src/config/stages.ts";
import {
    CONTROLS_HINT,
    LOW_HULL,
    STAGE_CARD_SECONDS,
    bossThresholds,
    createStageCard,
    drawHud,
} from "../src/render/hud.ts";
import { CONTROLS_LINES, menuScene } from "../src/scenes/menu.ts";
import { FONT_MASK_TEXTURE, fontImage } from "../src/services/font-assets.ts";
import {
    REV01_SPEC,
    REV01_URLS,
    rev01Image,
    rev01Sprite,
    type NativeFrame,
    type Rev01Id,
} from "../src/services/rev01-assets.ts";
import { stageScene } from "../src/scenes/stage.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import { FONT, centredX, drawText, glyph, textWidth } from "../src/ui/bitmap-text.ts";
import {
    ITEM,
    SETTINGS_LABELS,
    menuLayout,
    meterFrame,
    resultFrame,
} from "../src/ui/menu-layout.ts";
import { PRESENTATION, TEXT_COLOR, paletteColor } from "../src/ui/presentation.ts";
import {
    newRun,
    type BannerKind,
    type Progress,
    type ProgressCommand,
    type RunState,
    type Session,
} from "../src/world/session.ts";
import { decodePng } from "./helpers/png.ts";

const sound = new Proxy({}, { get: () => () => {} }) as CombatSound;
const categoryOf = new Map<number, string>();
for (const [category, slots] of LAYER_CATEGORIES)
    for (const slot of slots) categoryOf.set(LAYER[slot], category);
const newSession = (reducedMotion = false): Session => ({
    settings: { music: 1, effects: 1, muted: false, reducedMotion },
    screen: "playing",
    best: 0,
    ready: true,
});

// ---- Quad decoding: texture + UV -> sprite frame / glyph, as the renderer receives them. ----
const frameIndex = new Map<string, { id: Rev01Id; frame: NativeFrame }[]>();
for (const id of Object.keys(REV01_URLS) as Rev01Id[])
    if (id !== "nova" && id !== "font")
        frameIndex.set(
            `rev01-${id}`,
            rev01Sprite(id).frames.map((frame) => ({ id, frame })),
        );
const characters = rev01Sprite("font").spec.characters as Record<string, string>;
const glyphByU = new Map(
    Object.values(characters).map((character) => [glyph(character)!.u.toFixed(6), character]),
);

interface Quad {
    layer: number;
    texture?: string;
    x0: number;
    y0: number;
    width: number;
    height: number;
    u: number;
    uw: number;
    color: number;
    alpha: number;
    name?: string;
    id?: string;
    char?: string;
}
function quads(frame: Frame): Quad[] {
    const layers = (frame as unknown as { layers: number[] }).layers,
        d = frame.data;
    return Array.from({ length: frame.count }, (_, i): Quad => {
        const o = i * 14,
            texture = frame.textures[i],
            u = d[o + 6];
        const color =
            (Math.round(d[o + 10] * 255) << 16) |
            (Math.round(d[o + 11] * 255) << 8) |
            Math.round(d[o + 12] * 255);
        const quad: Quad = {
            layer: layers[i],
            texture,
            x0: d[o],
            y0: d[o + 1],
            width: d[o + 2],
            height: d[o + 5],
            u,
            uw: d[o + 8],
            color,
            alpha: d[o + 13],
        };
        if (texture === FONT_MASK_TEXTURE) quad.char = glyphByU.get(u.toFixed(6));
        const match = texture
            ? frameIndex.get(texture)?.find((entry) => Math.abs(entry.frame.u - u) < 1e-6)
            : undefined;
        if (match) {
            quad.name = match.frame.name;
            quad.id = match.id;
        }
        return quad;
    });
}
/** A frame whose camera has engine snapping off, like the stage and menu scenes. */
function nativeFrame(): Frame {
    const frame = new Frame(),
        camera = new Camera();
    camera.pixelSnap = false;
    frame.scene(camera, 1);
    return frame;
}
const glyphs = (drawn: Quad[]) => drawn.filter((quad) => quad.texture === FONT_MASK_TEXTURE);
/** Reads the string drawn with its first glyph's top-left at (x, y): one cell per 6 px, spaces where no glyph. */
function readText(drawn: Quad[], x: number, y: number, length: number): string {
    const at = new Map(
        glyphs(drawn)
            .filter((quad) => quad.y0 === y)
            .map((quad) => [quad.x0, quad.char]),
    );
    assert.ok(!at.has(x - FONT.advance), `text at ${x},${y} starts earlier`);
    return Array.from({ length }, (_, i) => at.get(x + i * FONT.advance) ?? " ").join("");
}
const colourAt = (drawn: Quad[], x: number, y: number) =>
    glyphs(drawn).find((quad) => quad.x0 === x && quad.y0 === y)?.color;
const ofSprite = (drawn: Quad[], id: Rev01Id) => drawn.filter((quad) => quad.id === id);
const whole = (quad: Quad) =>
    [quad.x0, quad.y0, quad.width, quad.height].every(
        (value) => Math.abs(value - Math.round(value)) < 1e-6,
    );

function hud(
    stageIndex: number,
    setup: (run: RunState) => void = () => {},
    options: { reducedMotion?: boolean; cardVisible?: boolean } = {},
): Quad[] {
    const run = newRun(stageIndex),
        stage = STAGES[stageIndex],
        card = createStageCard();
    if (!options.cardVisible) card.advance(STAGE_CARD_SECONDS);
    setup(run);
    const frame = nativeFrame();
    drawHud(frame, { run, stage, session: newSession(options.reducedMotion), card });
    return quads(frame);
}

// ---- Font ----

test("font: one stable derived mask asset, glyph frames on its texture, raw strip never claimable", () => {
    assert.equal(fontImage(), fontImage());
    assert.equal(fontImage().id, "rev01-font-mask");
    assert.equal(FONT_MASK_TEXTURE, fontImage().id);
    assert.throws(() => rev01Image("font"), /fontImage/);
    const font = rev01Sprite("font");
    assert.equal(font.frames.length, Object.keys(characters).length);
    for (const frame of font.frames) {
        const image = glyph(characters[frame.name])!;
        assert.equal(image.texture, fontImage().id, `${frame.name} uses the mask texture`);
        assert.deepEqual(
            [image.x, image.width, image.height, image.u, image.uw],
            [frame.x, 5, 7, frame.u, frame.uw],
            `${frame.name} is the strip frame`,
        );
    }
    assert.deepEqual(
        [FONT.cell, FONT.advance, FONT.spaceAdvance, FONT.lineHeight],
        [[5, 7], 6, 6, 9],
    );
});

test("font mask load: the derived image is the font.png alpha with every opaque texel white (tint = text colour)", async () => {
    const path = fileURLToPath(REV01_URLS.font),
        source = decodePng(path),
        heading = paletteColor("ui[2]");
    // The strip is ui[2] with binary alpha (spec presentation.font.drawing).
    for (let i = 0; i < source.data.length; i += 4) {
        const alpha = source.data[i + 3];
        assert.ok(alpha === 0 || alpha === 255);
        if (alpha)
            assert.equal(
                (source.data[i] << 16) | (source.data[i + 1] << 8) | source.data[i + 2],
                heading,
            );
    }
    const saved = {
        fetch: globalThis.fetch,
        createImageBitmap: (globalThis as Record<string, unknown>).createImageBitmap,
        OffscreenCanvas: (globalThis as Record<string, unknown>).OffscreenCanvas,
        ImageData: (globalThis as Record<string, unknown>).ImageData,
    };
    let fetched = "",
        uploaded: { data: Uint8ClampedArray; width: number; height: number } | undefined;
    class StubImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(data: Uint8ClampedArray, width: number, height: number) {
            this.data = data;
            this.width = width;
            this.height = height;
        }
    }
    Object.assign(globalThis, {
        fetch: async (url: string) => {
            fetched = url;
            return { ok: true, blob: async () => new Blob([readFileSync(fileURLToPath(url))]) };
        },
        createImageBitmap: async (input: unknown) => {
            if (input instanceof StubImageData) {
                uploaded = input;
                return { width: input.width, height: input.height, close() {} };
            }
            return { width: source.width, height: source.height, close() {} };
        },
        OffscreenCanvas: class {
            width = source.width;
            height = source.height;
            getContext() {
                return {
                    drawImage() {},
                    getImageData: () => ({
                        width: source.width,
                        height: source.height,
                        data: source.data,
                    }),
                };
            }
        },
        ImageData: StubImageData,
    });
    try {
        const bitmap = (await fontImage().load(new AbortController().signal)) as unknown as {
            width: number;
            height: number;
        };
        assert.equal(fetched, REV01_URLS.font, "derived from the art pack's font.png, no copy");
        assert.ok(uploaded);
        assert.deepEqual(
            [bitmap.width, bitmap.height, uploaded.width, uploaded.height],
            [230, 7, 230, 7],
        );
        let opaque = 0;
        for (let i = 0; i < source.data.length; i += 4) {
            const expected = source.data[i + 3] ? [255, 255, 255, 255] : [0, 0, 0, 0];
            assert.deepEqual(Array.from(uploaded.data.subarray(i, i + 4)), expected);
            if (source.data[i + 3]) opaque++;
        }
        assert.ok(opaque > 46 * 5, "every glyph has strokes");
    } finally {
        Object.assign(globalThis, saved);
    }
});

test("font metrics: 6n - 1 width, 6 px advance, upper-case, missing glyphs and spaces advance only, exact tint", () => {
    assert.deepEqual(
        ["", "A", "AB", "STARFALL", CONTROLS_HINT].map(textWidth),
        [0, 5, 11, 47, 221],
    );
    assert.equal(CONTROLS_HINT.length, 37);
    assert.equal(centredX("GATEBREAKER", 320), 320 - Math.floor(65 / 2));
    const frame = nativeFrame();
    drawText(frame, "aB #?c:9", 10.7, 20.2, TEXT_COLOR.danger, LAYER.hudText);
    const drawn = quads(frame);
    // a, B, c, :, 9 have glyphs; space, # and ? draw nothing but keep the cell.
    assert.deepEqual(
        drawn.map((quad) => [quad.char, quad.x0, quad.y0, quad.width, quad.height]),
        [
            ["A", 10, 20, 5, 7],
            ["B", 16, 20, 5, 7],
            ["C", 40, 20, 5, 7],
            [":", 46, 20, 5, 7],
            ["9", 52, 20, 5, 7],
        ],
    );
    assert.ok(
        drawn.every(
            (quad) =>
                quad.color === TEXT_COLOR.danger &&
                quad.alpha === 1 &&
                quad.layer === LAYER.hudText,
        ),
    );
    // textColors resolve to the palette entries the spec names.
    assert.deepEqual(TEXT_COLOR, {
        label: 0x8aabbf,
        value: 0xffd39c,
        heading: 0xdde9e3,
        danger: 0xee8f86,
        disabled: 0x3a5873,
        novaReady: 0xffe27e,
        chainActive: 0xffd39c,
        chainIdle: 0x8aabbf,
        scorePop: 0xffd39c,
        focused: 0xffd39c,
    });
});

test("every string the HUD and screens draw is covered by the font (no silent missing glyphs)", () => {
    const strings = [
        "STARFALL",
        "0001234",
        "CHAIN 9X",
        "HULL",
        "NOVA READY",
        "NOVA 15S",
        "PLASMA",
        CONTROLS_HINT,
        "12:59",
        "+100",
        "REPAIR",
        "PREPARING FLIGHT...",
        ...STAGES.flatMap((stage) => [
            `0${stage.index + 1} / ${stage.name}`,
            `SECTOR 0${stage.index + 1}`,
            stage.name,
            stage.boss.name,
            `WARNING / ${stage.boss.name}`,
            `${stage.name} SECURED`,
            `NEXT / ${stage.name}`,
            `RETRY / ${stage.name}`,
        ]),
        "STARFALL / VICTORY",
        "PHASE 2 / CORE OVERHEAT",
        "PHASE 3 / REACTOR SURGE",
        ...PRESENTATION.screens.pause.items,
        PRESENTATION.screens.pause.title,
        PRESENTATION.screens.settings.title,
        PRESENTATION.screens.controls.title,
        ...SETTINGS_LABELS,
        ...CONTROLS_LINES,
        PRESENTATION.screens.footer.text,
        "LAUNCH CAMPAIGN",
        "NEXT SECTOR",
        "RETRY SECTOR",
        "PLAY AGAIN",
        "RETURN TO TITLE",
        "THREE SECTORS / ONE LAST FLIGHT",
        "A PILOT. A NOVA. A SKY FULL OF TROUBLE.",
        "ALL THREE SECTORS LIBERATED / CAMPAIGN COMPLETE",
        "WELCOME HOME. YOU EARNED IT.",
        "SCORE BANKED / HULL AND NOVA RESTORED",
        "SECTOR ENTRY SCORE 12345",
        "KILLS 104   BEST 191550",
        "SCORE 0191550",
    ];
    for (const value of strings)
        for (const character of value)
            assert.ok(
                character === " " || glyph(character),
                `${JSON.stringify(value)}: no glyph for ${character}`,
            );
    assert.equal(CONTROLS_LINES.length, PRESENTATION.screens.controls.lines);
});

// ---- HUD ----

test("HUD geometry: opaque bands, plates at the layout columns, text at its x/rows, all native and on HUD layers", () => {
    for (const stage of STAGES) {
        const drawn = hud(stage.index, (run) => {
            run.score = 1234;
            run.combo = 3;
            run.seconds = 83.4;
            run.nova = 0.5;
        });
        assert.ok(
            drawn.every((quad) => categoryOf.get(quad.layer) === "hud"),
            "HUD layers only (below nova, lanes, bullets, core)",
        );
        assert.ok(drawn.every(whole), "whole-pixel corners and sizes");
        assert.ok(
            glyphs(drawn).every((quad) => quad.width === 5 && quad.height === 7),
            "1x text only",
        );
        // Bands: rows 0-30 panel[0], 31 panel[1]; 336 panel[1], 337-359 panel[0]; opaque.
        const bands = drawn
            .filter((quad) => quad.layer === LAYER.hudBand)
            .map((quad) => [quad.x0, quad.y0, quad.width, quad.height, quad.color, quad.alpha]);
        assert.deepEqual(bands, [
            [0, 0, 640, 31, 0x08121f, 1],
            [0, 31, 640, 1, 0x122030, 1],
            [0, 336, 640, 1, 0x122030, 1],
            [0, 337, 640, 23, 0x08121f, 1],
        ]);
        // Plates: left cap at the first column, right cap ending on the last, 1-texel fill repeated between, 13 rows.
        const plates = ofSprite(drawn, "hudPlate");
        const ranges = [
            [4, 106, 2],
            [112, 172, 2],
            [388, 470, 2],
            [476, 634, 2],
            [4, 148, 341],
            [156, 264, 341],
            [599, 634, 341],
        ];
        assert.equal(plates.length, ranges.length * 3);
        ranges.forEach(([first, last, top], i) => {
            const [left, fill, right] = plates.slice(i * 3, i * 3 + 3);
            assert.deepEqual(
                [left.name, left.x0, left.y0, left.width, left.height],
                ["left", first, top, 5, 13],
            );
            assert.deepEqual(
                [fill.name, fill.x0, fill.width, fill.height],
                ["fill", first + 5, last - first + 1 - 10, 13],
            );
            assert.ok(
                Math.abs(fill.uw * rev01Sprite("hudPlate").stripWidth - 1) < 1e-4 &&
                    Math.abs(fill.u - rev01Sprite("hudPlate").frame("fill").u) < 1e-6,
                "fill samples exactly its one texel column",
            );
            assert.deepEqual(
                [right.name, right.x0 + right.width - 1, right.y0],
                ["right", last, top],
            );
            assert.equal(left.layer, LAYER.hudPlate);
        });
        // Text positions and colours (presentation.layout).
        assert.equal(readText(drawn, 8, 5, 8), "STARFALL");
        assert.equal(colourAt(drawn, 8, 5), TEXT_COLOR.heading);
        assert.equal(readText(drawn, 62, 5, 7), "0001234");
        assert.equal(colourAt(drawn, 62, 5), TEXT_COLOR.value);
        assert.equal(readText(drawn, 116, 5, 8), "CHAIN 3X");
        assert.equal(colourAt(drawn, 116, 5), TEXT_COLOR.chainActive);
        assert.equal(readText(drawn, 392, 5, 4), "HULL");
        assert.equal(colourAt(drawn, 392, 5), TEXT_COLOR.label);
        assert.equal(readText(drawn, 480, 5, 8), "NOVA 8S ");
        assert.equal(colourAt(drawn, 480, 5), TEXT_COLOR.label);
        assert.equal(
            readText(drawn, 8, 344, 5 + stage.name.length),
            `0${stage.index + 1} / ${stage.name}`,
        );
        assert.equal(readText(drawn, 160, 344, 6), "PLASMA");
        assert.equal(readText(drawn, 368, 344, 37), CONTROLS_HINT);
        assert.equal(
            readText(drawn, 631 - textWidth("1:23") + 1, 344, 4),
            "1:23",
            "timer right edge 631",
        );
        assert.ok(
            glyphs(drawn)
                .filter((quad) => quad.y0 === 344)
                .every((quad) => quad.color === TEXT_COLOR.label),
        );
        // Pips at x 420..460 row 5, nova bar at (546, 6), charge bar at (200, 344).
        assert.deepEqual(
            ofSprite(drawn, "hudPip").map((quad) => [
                quad.name,
                quad.x0,
                quad.y0,
                quad.width,
                quad.height,
            ]),
            [420, 430, 440, 450, 460].map((x) => ["full", x, 5, 7, 7]),
        );
        assert.deepEqual(
            ofSprite(drawn, "novaBar").map((quad) => [quad.name, quad.x0, quad.y0]),
            [
                ["track", 546, 6],
                ["fill", 546, 6],
            ],
        );
        assert.deepEqual(
            ofSprite(drawn, "chargeBar").map((quad) => [
                quad.name,
                quad.x0,
                quad.y0,
                quad.width,
                quad.height,
            ]),
            [["empty", 200, 344, 61, 7]],
        );
        assert.equal(ofSprite(drawn, "bossBar").length, 0, "no boss row outside the boss phase");
    }
    assert.equal(
        colourAt(
            hud(0, (run) => {
                run.combo = 1;
            }),
            116,
            5,
        ),
        TEXT_COLOR.chainIdle,
    );
});

test("HUD bars draw the track then columns [0, ceil(w * fraction)) of the fill, cropped not scaled", () => {
    const fill = rev01Sprite("novaBar").frame("fill");
    for (const [nova, columns] of [
        [0, 0],
        [0.001, 1],
        [0.5, 43],
        [0.73, 63],
        [0.998, 85],
    ] as const) {
        const drawn = ofSprite(
                hud(0, (run) => {
                    run.nova = nova;
                }),
                "novaBar",
            ),
            clipped = drawn.find((quad) => quad.name === "fill");
        assert.equal(drawn[0].name, "track");
        if (!columns) {
            assert.equal(clipped, undefined);
            continue;
        }
        assert.ok(clipped);
        assert.deepEqual(
            [clipped.x0, clipped.width, clipped.height],
            [546, columns, 5],
            `nova ${nova}`,
        );
        assert.ok(
            Math.abs(clipped.uw * rev01Sprite("novaBar").stripWidth - columns) < 1e-3 &&
                Math.abs(clipped.u - fill.u) < 1e-6,
            "UV crop matches the column count (1 texel per pixel)",
        );
        assert.ok(clipped.layer > drawn[0].layer);
    }
    for (const stage of STAGES)
        for (const fraction of [1, 0.71, 0.5, 0.37, 0.004, 0]) {
            const drawn = hud(stage.index, (run) => {
                run.phase = "boss";
                run.bossMax = 3000;
                run.bossHealth = 3000 * fraction;
            });
            const bar = ofSprite(drawn, "bossBar"),
                clipped = bar.find((quad) => quad.name === "fill"),
                columns = Math.ceil(241 * fraction);
            assert.deepEqual(
                [bar[0].name, bar[0].x0, bar[0].y0, bar[0].width],
                ["track", 200, 23, 241],
            );
            if (columns)
                assert.deepEqual(
                    [clipped!.x0, clipped!.y0, clipped!.width, clipped!.height],
                    [200, 23, columns, 5],
                );
            else assert.equal(clipped, undefined);
            // Boss name centred at 320 - floor((6n - 1) / 2) on rows 13-19, heading colour.
            const name = stage.boss.name,
                x = 320 - Math.floor((6 * name.length - 1) / 2);
            assert.equal(readText(drawn, x, 13, name.length), name);
            assert.equal(colourAt(drawn, x, 13), TEXT_COLOR.heading);
            // Marks at 200 + round(240 t) - 1, row 21: ahead while health >= t, passed below it; above the fill.
            const marks = ofSprite(drawn, "bossBarMark"),
                thresholds = bossThresholds(stage.id);
            assert.deepEqual(thresholds, stage.index === 2 ? [0.3333, 0.6667] : [0.5]);
            assert.deepEqual(
                marks.map((quad) => [quad.name, quad.x0, quad.y0, quad.width, quad.height]),
                thresholds.map((t, i) => [
                    fraction < (stage.index === 2 ? [1 / 3, 2 / 3][i] : 1 / 2) ? "passed" : "ahead",
                    200 + Math.round(240 * t) - 1,
                    21,
                    3,
                    9,
                ]),
            );
            assert.ok(marks.every((quad) => quad.layer === LAYER.hudFillTop));
        }
});

test("boss marks match exact phase/enraged rules at every whole health value, including equality", () => {
    for (const stage of STAGES) {
        const max = stage.boss.hp,
            thresholds = bossThresholds(stage.id);
        const fractions = stage.index === 2 ? [1 / 3, 2 / 3] : [1 / 2];
        fractions.forEach((fraction, i) => assert.ok(Math.abs(fraction - thresholds[i]) <= 1e-4));
        for (let health = 0; health <= max; health++) {
            // Same strict comparisons as Gatebreaker.enraged, Kiln.phase and Engine.phase.
            const phase =
                stage.index === 2
                    ? health < max / 3
                        ? 3
                        : health < (max * 2) / 3
                          ? 2
                          : 1
                    : health < max / 2
                      ? 2
                      : 1;
            const marks = ofSprite(
                hud(stage.index, (run) => {
                    run.phase = "boss";
                    run.bossMax = max;
                    run.bossHealth = health;
                }),
                "bossBarMark",
            );
            assert.equal(
                marks.filter((quad) => quad.name === "passed").length,
                phase - 1,
                `${stage.id}: health ${health}/${max}`,
            );
            assert.deepEqual(
                marks.map((quad) => quad.x0),
                thresholds.map((threshold) => 200 + Math.round(240 * threshold) - 1),
            );
        }
    }
    const engineMark = (health: number) =>
        ofSprite(
            hud(2, (run) => {
                run.phase = "boss";
                run.bossMax = 600;
                run.bossHealth = health;
            }),
            "bossBarMark",
        )[1].name;
    assert.equal(engineMark(400), "ahead", "equality is phase 1");
    assert.equal(engineMark(399), "passed", "below two thirds is phase 2");
});
test("low hull (<= 1): low-a/low-b on the remaining pip, HULL in danger; reduced motion holds hudCalm statics (never blinks)", () => {
    assert.equal(LOW_HULL, 1);
    const pips = (hull: number, clock: number, reducedMotion = false) => {
        const drawn = hud(
            0,
            (run) => {
                run.hull = hull;
                run.effectClock = clock;
            },
            { reducedMotion },
        );
        return {
            pips: ofSprite(drawn, "hudPip")
                .concat(ofSprite(drawn, "hudCalm").filter((quad) => quad.y0 === 5))
                .sort((a, b) => a.x0 - b.x0)
                .map((quad) => `${quad.id}:${quad.name}`),
            label: colourAt(drawn, 392, 5),
        };
    };
    assert.deepEqual(pips(3, 0), {
        pips: ["hudPip:full", "hudPip:full", "hudPip:full", "hudPip:empty", "hudPip:empty"],
        label: TEXT_COLOR.label,
    });
    assert.deepEqual(pips(2, 0.3), {
        pips: ["hudPip:full", "hudPip:full", "hudPip:empty", "hudPip:empty", "hudPip:empty"],
        label: TEXT_COLOR.label,
    });
    // hudPip loop: low-a 250 ms, low-b 250 ms.
    assert.deepEqual(pips(1, 0), {
        pips: ["hudPip:low-a", "hudPip:empty", "hudPip:empty", "hudPip:empty", "hudPip:empty"],
        label: TEXT_COLOR.danger,
    });
    assert.deepEqual(pips(1, 0.26).pips[0], "hudPip:low-b");
    assert.deepEqual(pips(1, 0.51).pips[0], "hudPip:low-a");
    assert.deepEqual(pips(0, 0), { pips: Array(5).fill("hudPip:empty"), label: TEXT_COLOR.danger });
    for (const clock of [0, 0.26, 0.51, 1.3])
        assert.deepEqual(pips(1, clock, true), {
            pips: [
                "hudCalm:pip-low",
                "hudPip:empty",
                "hudPip:empty",
                "hudPip:empty",
                "hudPip:empty",
            ],
            label: TEXT_COLOR.danger,
        });
});

test("nova ready: NOVA READY in novaReady colour, ready-a/ready-b loop; reduced motion shows hudCalm nova-ready; charge bar always empty", () => {
    const nova = (clock: number, reducedMotion = false) => {
        const drawn = hud(
            0,
            (run) => {
                run.nova = 1;
                run.effectClock = clock;
            },
            { reducedMotion },
        );
        assert.equal(readText(drawn, 480, 5, 10), "NOVA READY");
        assert.equal(colourAt(drawn, 480, 5), TEXT_COLOR.novaReady);
        assert.deepEqual(
            ofSprite(drawn, "chargeBar").map((quad) => [quad.name, quad.width]),
            [["empty", 61]],
            "no charge state: always the empty frame",
        );
        return drawn
            .filter((quad) => quad.x0 === 546 && quad.y0 === 6)
            .map((quad) => `${quad.id}:${quad.name}:${quad.width}`);
    };
    assert.deepEqual(nova(0), ["novaBar:track:85", "novaBar:ready-a:85"]);
    assert.deepEqual(nova(0.31), ["novaBar:track:85", "novaBar:ready-b:85"]);
    for (const clock of [0, 0.31, 0.62, 2])
        assert.deepEqual(nova(clock, true), ["novaBar:track:85", "hudCalm:nova-ready:85"]);
    // No charge data or behaviour is added to the run.
    assert.deepEqual(
        Object.keys(newRun()).filter((key) => /charge|plasma/i.test(key)),
        [],
    );
    // Reduced motion: the whole HUD is identical at every clock (nothing blinks); with motion the loops do change.
    const snapshot = (clock: number, reducedMotion: boolean) =>
        JSON.stringify(
            hud(
                2,
                (run) => {
                    run.hull = 1;
                    run.nova = 1;
                    run.phase = "boss";
                    run.bossMax = 10;
                    run.bossHealth = 4;
                    run.effectClock = clock;
                    run.bannerTime = 1;
                    run.banner = "PHASE 2 / REACTOR SURGE";
                    run.bannerKind = "phase";
                },
                { reducedMotion },
            ),
        );
    assert.ok(
        [0.13, 0.26, 0.4, 0.77, 3.1].every((clock) => snapshot(clock, true) === snapshot(0, true)),
    );
    assert.notEqual(snapshot(0.26, false), snapshot(0, false));
});

test("banner kind picks the plate: sector = normal caps + heading text, phase = alert caps + danger text, stage = never drawn", () => {
    const banner = (kind: BannerKind, value: string, time = 1) => {
        const drawn = hud(1, (run) => {
            run.banner = value;
            run.bannerTime = time;
            run.bannerKind = kind;
        });
        return {
            plate: ofSprite(drawn, "bannerPlate"),
            text: glyphs(drawn).filter((quad) => quad.layer === LAYER.bannerText),
            drawn,
        };
    };
    for (const [kind, value, names, color] of [
        ["sector", "WARNING / KILN SERPENT", ["left", "fill", "right"], TEXT_COLOR.heading],
        [
            "phase",
            "PHASE 2 / CORE OVERHEAT",
            ["left-alert", "fill-alert", "right-alert"],
            TEXT_COLOR.danger,
        ],
    ] as const) {
        const { plate, text, drawn } = banner(kind, value),
            width = textWidth(value) + 22,
            x = 320 - Math.floor(textWidth(value) / 2);
        assert.deepEqual(
            plate.map((quad) => quad.name),
            names,
        );
        assert.deepEqual(
            plate.map((quad) => [quad.x0, quad.y0, quad.width, quad.height]),
            [
                [x - 11, 158, 9, 21],
                [x - 2, 158, width - 18, 21],
                [x - 11 + width - 9, 158, 9, 21],
            ],
        );
        assert.ok(plate.every((quad) => quad.layer === LAYER.banner));
        assert.equal(readText(drawn, x, 165, value.length), value);
        assert.ok(text.length > 0 && text.every((quad) => quad.color === color && quad.y0 === 165));
    }
    assert.deepEqual(
        banner("stage", "FURNACE BELT").plate,
        [],
        "the stage-start banner is the stage card's",
    );
    assert.deepEqual(banner("stage", "FURNACE BELT").text, []);
    assert.deepEqual(
        banner("sector", "FURNACE BELT SECURED", 0).plate,
        [],
        "expired banners draw nothing",
    );
    assert.equal(newRun().bannerKind, "stage", "a new run starts with the stage-start banner");
});

test("score pops: 1x font in scorePop colour on the scorePop layer, no plate", () => {
    const drawn = hud(0, (run) => {
        run.scorePops.push({ x: 100.6, y: 80.2, text: "+250", life: 0.5 });
    });
    const pops = glyphs(drawn).filter((quad) => quad.layer === LAYER.scorePop);
    assert.deepEqual(
        pops.map((quad) => [quad.char, quad.x0, quad.y0, quad.color]),
        [
            ["+", 100, 80, TEXT_COLOR.scorePop],
            ["2", 106, 80, TEXT_COLOR.scorePop],
            ["5", 112, 80, TEXT_COLOR.scorePop],
            ["0", 118, 80, TEXT_COLOR.scorePop],
        ],
    );
});

// ---- Stage card (real stage scene) ----

test("stage card: own 2.6 s timer from stage start, replaces the start banner, which never reappears; frozen under pause", async () => {
    for (const stage of STAGES) {
        const session = newSession(),
            candidates = new Map<string, PreparedScene>();
        const game = new Game<Progress, ProgressCommand>({
            seed: "CARD",
            state: { best: 0, runs: 0 },
            transition: (state) => state,
        });
        await game.start(
            await game.prepare(
                stageScene(
                    session,
                    {
                        assets: [],
                        sound: () => sound,
                        take: (purpose) => {
                            const scene = candidates.get(purpose);
                            candidates.delete(purpose);
                            return scene;
                        },
                    },
                    stage.index,
                ),
                { key: `card-${stage.id}` },
            ),
        );
        const render = () => {
            const frame = new Frame();
            game.render(frame, 1);
            return quads(frame);
        };
        try {
            const run = session.run!;
            const first = render(),
                card = ofSprite(first, "stageCard");
            assert.deepEqual(
                card.map((quad) => [
                    quad.name,
                    quad.x0,
                    quad.y0,
                    quad.width,
                    quad.height,
                    quad.layer,
                ]),
                [[stage.id, 200, 120, 241, 61, LAYER.stageCard]],
            );
            assert.equal(readText(first, 272, 136, 9), `SECTOR 0${stage.index + 1}`);
            assert.equal(colourAt(first, 272, 136), TEXT_COLOR.label);
            assert.equal(readText(first, 272, 150, stage.name.length), stage.name);
            assert.equal(colourAt(first, 272, 150), TEXT_COLOR.heading);
            assert.ok(
                glyphs(first)
                    .filter((quad) => quad.y0 === 136 || quad.y0 === 150)
                    .every((quad) => quad.layer === LAYER.stageCardText),
            );
            assert.equal(
                ofSprite(first, "bannerPlate").length,
                0,
                "the start banner is replaced by the card",
            );
            game.tick(emptyInput());
            const dt = run.seconds,
                ticks = Math.round(STAGE_CARD_SECONDS / dt);
            // Pause after 1 tick: the card's clock stops with the stage.
            candidates.set(
                "pause",
                await game.prepare(
                    menuScene("pause", session, () => undefined),
                    { key: `pause-${stage.id}` },
                ),
            );
            game.tick({ ...emptyInput(), pressed: ["Escape"] });
            assert.equal(game.scenes.length, 2);
            for (let i = 0; i < ticks * 2; i++) game.tick(emptyInput());
            assert.equal(
                ofSprite(render(), "stageCard").length,
                1,
                "still showing after a long pause",
            );
            game.tick({ ...emptyInput(), pressed: ["Escape"] });
            assert.equal(game.scenes.length, 1);
            // Card time = stage time played since start (pause excluded): visible through tick ticks-1, gone at tick `ticks`.
            while (Math.round(run.seconds / dt) < ticks - 1) game.tick(emptyInput());
            assert.equal(
                ofSprite(render(), "stageCard").length,
                1,
                `${stage.id}: visible at ${run.seconds.toFixed(4)} s`,
            );
            game.tick(emptyInput());
            assert.ok(Math.abs(run.seconds - STAGE_CARD_SECONDS) < 1e-9, `${run.seconds}`);
            const after = render();
            assert.equal(ofSprite(after, "stageCard").length, 0, `${stage.id}: card gone at 2.6 s`);
            // The stage-start banner still has time left (3.5 s) but stays hidden: the card replaced it.
            assert.ok(run.bannerTime > 0.8 && run.bannerKind === "stage", `${run.bannerTime}`);
            assert.equal(
                ofSprite(after, "bannerPlate").length,
                0,
                "start banner does not reappear after the card",
            );
            while (run.bannerTime > 0) {
                game.tick(emptyInput());
                assert.equal(ofSprite(render(), "bannerPlate").length, 0);
            }
            // Gameplay clocks are untouched: banner time ran down from 3.5 s at the stage's own rate.
            assert.ok(Math.abs(run.seconds - 3.5) < dt + 1e-9, `${run.seconds}`);
        } finally {
            game.dispose();
        }
    }
});

test("stage card expires on actual stage tick 156 through Nova hit-stop while gameplay lags five ticks", async () => {
    for (const stage of STAGES) {
        const session = newSession();
        const game = new Game<Progress, ProgressCommand>({
            seed: "CARD-NOVA",
            state: { best: 0, runs: 0 },
            transition: (state) => state,
        });
        await game.start(
            await game.prepare(
                stageScene(
                    session,
                    { assets: [], sound: () => sound, take: () => undefined },
                    stage.index,
                ),
                { key: `nova-card-${stage.id}` },
            ),
        );
        const cardCount = () => {
            const frame = new Frame();
            game.render(frame, 1);
            return ofSprite(quads(frame), "stageCard").length;
        };
        try {
            assert.equal(cardCount(), 1);
            game.tick({ ...emptyInput(), pressed: ["KeyB"] });
            assert.equal(session.run!.nova, 0, "real Nova input fired on tick 1");
            for (let tick = 2; tick <= 155; tick++) game.tick(emptyInput());
            assert.equal(cardCount(), 1, `${stage.id}: visible through tick 155`);
            assert.ok(
                Math.abs(session.run!.seconds - 150 / 60) < 1e-9,
                "gameplay lagged five ticks",
            );
            game.tick(emptyInput());
            assert.equal(cardCount(), 0, `${stage.id}: gone at tick 156 (2600 ms)`);
            assert.ok(
                Math.abs(session.run!.seconds - 151 / 60) < 1e-9,
                "gameplay clock retains hit-stop",
            );
        } finally {
            game.dispose();
        }
    }
});
// ---- Screens ----

function menuGame(
    kind: "title" | "pause" | "result",
    session: Session,
    take: (purpose: string) => PreparedScene | undefined = () => undefined,
) {
    const game = new Game<Progress, ProgressCommand>({
        seed: 1,
        state: { best: 0, runs: 0 },
        transition: (state) => state,
    });
    return {
        game,
        async start() {
            await game.start(
                await game.prepare(
                    { ...menuScene(kind, session, take), assets: [] },
                    { key: kind },
                ),
            );
            game.tick(emptyInput());
        },
        render() {
            const frame = new Frame();
            game.render(frame, 1);
            return quads(frame);
        },
        click(startX: number, startY: number, x = startX, y = startY, button = 0) {
            game.tick({
                ...emptyInput(),
                pointer: { ...emptyInput().pointer, completed: [{ button, startX, startY, x, y }] },
            } as InputSnapshot);
        },
        press(key: string) {
            game.tick({ ...emptyInput(), pressed: [key] });
        },
    };
}
/** Item plates as drawn: one rect per menuItem row (left cap x, right cap end, rows), with the focused flag. */
function drawnItems(drawn: Quad[]) {
    const rows = new Map<number, Quad[]>();
    for (const quad of ofSprite(drawn, "menuItem"))
        rows.set(quad.y0, [...(rows.get(quad.y0) ?? []), quad]);
    return [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([top, parts]) => ({
            left: parts[0].x0,
            right: parts[2].x0 + parts[2].width - 1,
            top,
            bottom: top + parts[0].height - 1,
            focused: parts[0].name!.endsWith("focused"),
        }));
}

test("menu kit: panel/rule/items at the spec rows; click hit areas are exactly the drawn item rects, for press and drag start", async () => {
    const session = newSession(),
        menu = menuGame("pause", session);
    await menu.start();
    try {
        let drawn = menu.render();
        // Pause: 4 items, panel height 40 + 19 * 4 = 116, top 180 - 58 = 122, title rows 132.., rule at 144, items from 154.
        const panel = ofSprite(drawn, "menuPanel");
        assert.deepEqual([panel[0].name, panel[0].x0, panel[0].y0], ["top-left", 200, 122]);
        assert.deepEqual(
            [panel[8].name, panel[8].x0 + panel[8].width - 1, panel[8].y0 + panel[8].height - 1],
            ["bottom-right", 440, 237],
        );
        assert.deepEqual(
            ofSprite(drawn, "panelRule").map((quad) => [quad.name, quad.x0, quad.y0, quad.width]),
            [
                ["left", 212, 144, 5],
                ["fill", 217, 144, 207],
                ["right", 424, 144, 5],
            ],
        );
        const title = PRESENTATION.screens.pause.title;
        assert.equal(readText(drawn, centredX(title, 320), 132, title.length), title);
        assert.equal(colourAt(drawn, centredX(title, 320), 132), TEXT_COLOR.heading);
        let items = drawnItems(drawn);
        assert.deepEqual(
            items.map((item) => [item.left, item.right, item.top, item.bottom]),
            [154, 173, 192, 211].map((top) => [216, 424, top, top + 14]),
        );
        assert.deepEqual(
            items.map((item) => item.focused),
            [true, false, false, false],
        );
        assert.deepEqual(
            menuLayout("panel", 4).items.map((rect) => [
                rect.left,
                rect.top,
                rect.width,
                rect.height,
            ]),
            items.map((item) => [
                item.left,
                item.top,
                item.right - item.left + 1,
                item.bottom - item.top + 1,
            ]),
            "hit rects = drawn rects",
        );
        PRESENTATION.screens.pause.items.forEach((label, i) => {
            const x = centredX(label, 320);
            assert.equal(readText(drawn, x, items[i].top + 4, label.length), label);
            assert.equal(
                colourAt(drawn, x, items[i].top + 4),
                i === 0 ? TEXT_COLOR.focused : TEXT_COLOR.label,
            );
        });
        assert.ok(
            drawn.every(whole) && drawn.every((quad) => categoryOf.get(quad.layer) === "screen"),
        );
        const dim = drawn.find((quad) => quad.layer === LAYER.screenDim)!;
        assert.deepEqual(
            [dim.x0, dim.y0, dim.width, dim.height, dim.color],
            [0, 0, 640, 360, 0x08121f],
        );
        assert.ok(Math.abs(dim.alpha - 0.85) < 1e-6);
        // SETTINGS item (row 2): a click just outside its rect does nothing; on its corner pixels it activates.
        const settings = items[1];
        for (const [x, y] of [
            [215.99, settings.top + 7],
            [settings.right + 1, settings.top + 7],
            [320, settings.top - 0.01],
            [320, settings.bottom + 1],
        ]) {
            menu.click(x, y);
            assert.equal(drawnItems(menu.render()).length, 4, `miss at ${x},${y}`);
        }
        menu.click(320, settings.top + 7, 320, settings.top + 7, 2);
        assert.equal(drawnItems(menu.render()).length, 4, "right button ignored");
        menu.click(settings.right + 0.99, settings.bottom + 0.99);
        drawn = menu.render();
        items = drawnItems(drawn);
        assert.equal(items.length, 5, "settings page opened from the item's bottom-right pixel");
        // Settings: 5 items, height 135, top 113, items from 145. SOUND is item 2.
        assert.deepEqual(
            items.map((item) => item.top),
            [145, 164, 183, 202, 221],
        );
        const sound = items[2],
            motion = items[3];
        const muted = () => session.settings.muted;
        menu.click(sound.left, sound.top);
        assert.equal(muted(), true, "top-left pixel toggles");
        menu.click(sound.left + 5, sound.top + 2, motion.left + 5, motion.top + 2);
        assert.equal(muted(), true, "drag from SOUND to REDUCED MOTION: nothing");
        assert.equal(session.settings.reducedMotion, false);
        menu.click(sound.left - 1, sound.top + 2, sound.left + 5, sound.top + 2);
        assert.equal(muted(), true, "press outside, release inside: nothing");
        menu.click(sound.left + 5, sound.top + 2, sound.left - 1, sound.top + 2);
        assert.equal(muted(), true, "press inside, release outside: nothing");
        menu.click(sound.left + 5, sound.top + 2, sound.right, sound.bottom);
        assert.equal(
            muted(),
            false,
            "press and release inside the same item (drag within) toggles",
        );
        menu.click(320, sound.bottom + 2);
        assert.equal(muted(), false, "gap between items");
    } finally {
        menu.game.dispose();
    }
});

test("settings: fixed labels with optionMeter / optionToggle controls; SOUND = !muted, meters = round(value * 4)", async () => {
    assert.deepEqual([0, 0.12, 0.13, 0.25, 0.5, 0.62, 0.75, 1, 1.4, -1].map(meterFrame), [
        "level-0",
        "level-0",
        "level-1",
        "level-1",
        "level-2",
        "level-2",
        "level-3",
        "level-4",
        "level-4",
        "level-0",
    ]);
    const session = newSession(),
        menu = menuGame("title", session);
    Object.assign(session.settings, { music: 0.75, effects: 0, muted: true, reducedMotion: true });
    await menu.start();
    try {
        // Title main page: items on menuItem rects from row 241, no panel; open SETTINGS (item 1) by click.
        let items = drawnItems(menu.render());
        assert.deepEqual(
            items.map((item) => [item.left, item.right, item.top]),
            [
                [216, 424, 241],
                [216, 424, 260],
                [216, 424, 279],
            ],
        );
        assert.equal(ofSprite(menu.render(), "menuPanel").length, 0);
        menu.click(300, 267);
        const read = () => {
            const drawn = menu.render(),
                rows = drawnItems(drawn);
            const controls = drawn.filter(
                (quad) => quad.id === "optionMeter" || quad.id === "optionToggle",
            );
            return {
                drawn,
                rows,
                controls: controls.map((quad) => [
                    quad.id,
                    quad.name,
                    quad.x0 + quad.width - 1,
                    quad.y0,
                ]),
            };
        };
        let state = read();
        items = state.rows;
        assert.deepEqual(
            items.map((item) => item.top),
            [145, 164, 183, 202, 221],
        );
        SETTINGS_LABELS.forEach((label, i) => {
            const x = label === "BACK" ? centredX(label, 320) : 224;
            assert.equal(
                readText(state.drawn, x, items[i].top + 4, label.length),
                label,
                `${label} fixed word at the label column`,
            );
        });
        // Control right edge at itemX + 200 = 416, vertically centred on the 15-row item.
        assert.deepEqual(state.controls, [
            ["optionMeter", "level-3", 416, 145 + 4],
            ["optionMeter", "level-0", 416, 164 + 4],
            ["optionToggle", "off", 416, 183 + 3],
            ["optionToggle", "on", 416, 202 + 3],
        ]);
        assert.ok(
            state.drawn
                .filter((quad) => quad.id === "optionMeter" || quad.id === "optionToggle")
                .every((quad) => quad.layer === LAYER.screenItemMark),
        );
        // Activation semantics unchanged; the controls follow the stored values.
        menu.press("Enter");
        assert.equal(session.settings.music, 1);
        assert.equal(read().controls[0][1], "level-4");
        menu.press("Enter");
        assert.equal(session.settings.music, 0);
        assert.equal(read().controls[0][1], "level-0");
        menu.press("ArrowDown");
        menu.press("ArrowDown");
        menu.press("Enter");
        assert.equal(session.settings.muted, false);
        assert.equal(read().controls[2][1], "on", "SOUND on = not muted");
        menu.press("ArrowDown");
        menu.press("Enter");
        assert.equal(session.settings.reducedMotion, false);
        assert.equal(read().controls[3][1], "off");
        state = read();
        assert.deepEqual(
            state.rows.map((item) => item.focused),
            [false, false, false, true, false],
        );
        // Controls page: 8 lines at x 224 from itemsTop, step 11, hitbox line in heading; BACK at itemsTop + 92.
        menu.press("Escape");
        menu.press("ArrowDown");
        menu.press("ArrowDown");
        menu.press("Enter");
        const drawn = menu.render(),
            back = drawnItems(drawn);
        const top = 180 - Math.floor((40 + 19 + 11 * 8 + 4) / 2),
            itemsTop = top + 32;
        assert.deepEqual(
            back.map((item) => [item.top, item.bottom]),
            [[itemsTop + 92, itemsTop + 106]],
        );
        CONTROLS_LINES.forEach((line, i) => {
            assert.equal(readText(drawn, 224, itemsTop + 11 * i, line.length), line);
            assert.equal(
                colourAt(drawn, 224, itemsTop + 11 * i),
                i === 7 ? TEXT_COLOR.heading : TEXT_COLOR.label,
            );
        });
        assert.equal(
            readText(drawn, centredX("FLIGHT CONTROLS", 320), top + 10, 15),
            "FLIGHT CONTROLS",
        );
        menu.click(ITEM.left, back[0].top);
        assert.equal(
            drawnItems(menu.render()).length,
            3,
            "BACK by click returns to the title list",
        );
    } finally {
        menu.game.dispose();
    }
});

test("result screens: resultPlate frame per outcome, centred stats in value/label colours, item rects below", async () => {
    const cases = [
        [0, "clear", "sector-secured", "NEXT SECTOR"],
        [1, "clear", "sector-secured", "NEXT SECTOR"],
        [2, "clear", "campaign-complete", "PLAY AGAIN"],
        [0, "dead", "signal-lost", "RETRY SECTOR"],
        [2, "dead", "signal-lost", "RETRY SECTOR"],
    ] as const;
    for (const [stageIndex, phase, plate, first] of cases) {
        assert.equal(resultFrame({ phase, stageIndex }), plate);
        const session = newSession(),
            taken: string[] = [];
        session.run = { ...newRun(stageIndex, 500), phase, score: 191550, kills: 104 };
        session.best = 191550;
        const menu = menuGame("result", session, (purpose) => {
            taken.push(purpose);
            return undefined;
        });
        await menu.start();
        try {
            const drawn = menu.render();
            assert.deepEqual(
                ofSprite(drawn, "resultPlate").map((quad) => [
                    quad.name,
                    quad.x0,
                    quad.y0,
                    quad.width,
                    quad.height,
                ]),
                [[plate, 170, 60, 301, 45]],
            );
            // Panel x 170..470 from row 116: 4 stat lines, 2 items -> height 23 + 44 + 38 = 105, bottom row 220.
            const panel = ofSprite(drawn, "menuPanel");
            assert.deepEqual(
                [
                    panel[0].x0,
                    panel[0].y0,
                    panel[8].x0 + panel[8].width - 1,
                    panel[8].y0 + panel[8].height - 1,
                ],
                [170, 116, 470, 220],
            );
            assert.equal(ofSprite(drawn, "panelRule").length, 0);
            const lines = glyphs(drawn).filter((quad) => quad.y0 >= 126 && quad.y0 < 170);
            const rows = [126, 137, 148, 159].map((y) =>
                lines.filter((quad) => quad.y0 === y).sort((a, b) => a.x0 - b.x0),
            );
            const score = "SCORE 0191550";
            assert.equal(readText(drawn, centredX(score, 320), 126, score.length), score);
            assert.ok(
                rows[0].every((quad) => quad.color === TEXT_COLOR.value) &&
                    rows
                        .slice(1)
                        .flat()
                        .every((quad) => quad.color === TEXT_COLOR.label),
            );
            const message =
                phase === "clear"
                    ? stageIndex === 2
                        ? "ALL THREE SECTORS LIBERATED / CAMPAIGN COMPLETE"
                        : `NEXT / ${STAGES[stageIndex + 1].name}`
                    : `RETRY / ${STAGES[stageIndex].name}`;
            assert.equal(
                readText(drawn, centredX(message, 320), 148, message.length),
                message,
                "centred",
            );
            assert.ok(
                rows.every(
                    (row) =>
                        row.length > 0 && row[0].x0 >= 177 && row[row.length - 1].x0 + 4 <= 463,
                ),
                "inside the panel",
            );
            assert.ok(
                glyphs(drawn).every((quad) => quad.width === 5 && quad.height === 7),
                "no scaled title text",
            );
            const items = drawnItems(drawn);
            assert.deepEqual(
                items.map((item) => [item.left, item.right, item.top]),
                [
                    [216, 424, 175],
                    [216, 424, 194],
                ],
            );
            assert.equal(readText(drawn, centredX(first, 320), 179, first.length), first);
            menu.click(400, 200, 300, 196);
            menu.game.tick(emptyInput());
            assert.equal(taken[0], "title", "RETURN TO TITLE by click (taken on the next tick)");
        } finally {
            menu.game.dispose();
        }
    }
});

test("screens never blink: pause/settings and result frames are identical over time, with or without reduced motion", async () => {
    for (const reducedMotion of [false, true])
        for (const kind of ["pause", "result"] as const) {
            const session = newSession(reducedMotion);
            session.run = { ...newRun(1), phase: "dead" };
            const menu = menuGame(kind, session);
            await menu.start();
            try {
                const first = JSON.stringify(menu.render());
                for (let i = 0; i < 40; i++) menu.game.tick(emptyInput());
                assert.equal(
                    JSON.stringify(menu.render()),
                    first,
                    `${kind} reducedMotion=${reducedMotion}`,
                );
            } finally {
                menu.game.dispose();
            }
        }
});

test("layer order: HUD text over plates over bands, banner/card above HUD text, all below nova, lanes, bullets and core", () => {
    const order = [
        "hudBand",
        "hudPlate",
        "hudTrack",
        "hudFill",
        "hudFillTop",
        "hudText",
        "banner",
        "bannerText",
        "stageCard",
        "stageCardText",
        "scorePop",
        "nova",
        "beamLane",
        "playerBullet",
        "hostileCore",
        "core",
    ] as const;
    order.forEach(
        (slot, i) => i && assert.ok(LAYER[order[i - 1]] < LAYER[slot], `${order[i - 1]} < ${slot}`),
    );
    const spec = REV01_SPEC.presentation.layers.list;
    assert.ok(
        spec.findIndex((entry) => entry.startsWith("HUD")) <
            spec.findIndex((entry) => entry.startsWith("nova ring")),
    );
});
