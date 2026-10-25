import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Camera, Frame, Game, emptyInput, type SceneSetup } from "@ngne/core";
import { fileURLToPath } from "node:url";
import { drawGap } from "../src/bosses/boss.ts";
import { Enemy, Pose } from "../src/components/combat.ts";
import { isBoss } from "../src/config/enemies.ts";
import { LAYER } from "../src/config/layers.ts";
import { STAGES } from "../src/config/stages.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { derivedImageAsset, REV01_URLS } from "../src/services/rev01-assets.ts";
import { deriveNovaAtlas } from "../src/services/player-fx-assets.ts";
import { rev01StageImages } from "../src/services/rev01-claims.ts";
import { TEXT_COLOR } from "../src/ui/presentation.ts";
import { centredX } from "../src/ui/bitmap-text.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";
import { presentationStage } from "./helpers/integration-presentation.ts";
import { decodePng } from "./helpers/png.ts";

test("integrated banner writers select sector/phase kinds and startup never returns after the card", async () => {
    for (const stage of STAGES) {
        const session: Session = {
            settings: { music: 0, effects: 0, muted: true, reducedMotion: false },
            screen: "title",
            best: 0,
            ready: true,
        };
        const game = new Game<Progress, ProgressCommand>({
            seed: 17,
            state: { best: 0, runs: 0 },
            transition: (s) => s,
        });
        const sound = new Proxy({}, { get: () => () => {} }) as CombatSound;
        let action: ((scene: SceneSetup<Progress, ProgressCommand>) => void) | undefined;
        const actual = stageScene(
            session,
            { assets: [], sound: () => sound, take: () => undefined },
            stage.index,
        );
        await game.start(
            await game.prepare(
                {
                    ...actual,
                    setup(scene) {
                        actual.setup(scene);
                        scene.system(() => {
                            const next = action;
                            action = undefined;
                            next?.(scene);
                        });
                    },
                },
                { key: "banner-writers" },
            ),
        );
        try {
            for (let tick = 0; tick < 157; tick++) game.tick(emptyInput());
            const run = session.run!;
            assert.equal(run.bannerKind, "stage");
            const frame = new Frame();
            game.render(frame, 1);
            const layers = (frame as unknown as { layers: number[] }).layers.slice(0, frame.count);
            assert.ok(
                !layers.includes(LAYER.banner) && !layers.includes(LAYER.stageCard),
                "startup banner and expired card absent",
            );
            action = () => {
                run.seconds = stage.bossAt - 4;
            };
            game.tick();
            game.tick();
            assert.equal(run.banner, `WARNING / ${stage.boss.name}`);
            assert.equal(run.bannerKind, "sector");
            action = () => {
                run.seconds = stage.bossAt;
            };
            game.tick();
            game.tick();
            assert.equal(run.banner, stage.boss.name);
            assert.equal(run.bannerKind, "sector");
            if (stage.index > 0) {
                action = (scene) =>
                    scene.world.query(Pose, Enemy).eachChunk(({ views, count }) => {
                        for (let row = 0; row < count; row++)
                            if (isBoss(views.enemy.kind[row]))
                                views.enemy.hp[row] = stage.boss.hp * 0.3;
                    });
                game.tick();
                game.tick();
                assert.match(run.banner, /^PHASE [23] \/ /);
                assert.equal(run.bannerKind, "phase");
            }
            action = (scene) =>
                scene.world.query(Pose, Enemy).eachChunk(({ views, count }) => {
                    for (let row = 0; row < count; row++)
                        if (isBoss(views.enemy.kind[row])) views.enemy.hp[row] = 0;
                });
            game.tick();
            game.tick();
            assert.equal(run.phase, "clear");
            assert.equal(run.bannerKind, "sector");
            assert.equal(
                run.banner,
                stage.index === 2 ? "STARFALL / VICTORY" : `${stage.name} SECURED`,
            );
        } finally {
            game.dispose();
        }
    }
});

test("boss GAP hint uses native 5x7 mask at 1x with the heading palette", () => {
    const legacy = new Frame(),
        native = new Frame();
    const camera = new Camera();
    camera.pixelSnap = false;
    native.scene(camera, 1);
    drawGap(legacy, native, 160.6, 88, 0x77e5c2);
    assert.equal(legacy.count, 1, "only lane through the rounded code frame");
    assert.equal(native.count, 3);
    for (let i = 0; i < native.count; i++) {
        const data = native.data,
            o = i * 14;
        assert.equal(native.textures[i], "rev01-font-mask");
        assert.deepEqual(
            [data[o], data[o + 1], data[o + 2], data[o + 5]],
            [centredX("GAP", 161) + i * 6, 48, 5, 7],
        );
        assert.equal(
            (Math.round(data[o + 10] * 255) << 16) |
                (Math.round(data[o + 11] * 255) << 8) |
                Math.round(data[o + 12] * 255),
            TEXT_COLOR.heading,
        );
    }
});

test("capture presets render production assets for every stage and stay identical at all interpolation alphas", async () => {
    deriveNovaAtlas(decodePng(fileURLToPath(REV01_URLS.nova)));
    for (const stage of STAGES)
        for (const calm of [false, true])
            for (const scenario of [
                "card",
                "play",
                "boss",
                "result",
                "death",
                "nova",
                "dense",
            ] as const) {
                const session: Session = {
                    settings: { music: 0, effects: 0, muted: true, reducedMotion: calm },
                    screen: "title",
                    best: 0,
                    ready: true,
                };
                const game = new Game<Progress, ProgressCommand>({
                    seed: 17,
                    state: { best: 0, runs: 0 },
                    transition: (state) => state,
                });
                const sound = new Proxy({}, { get: () => () => {} }) as CombatSound;
                const actual = stageScene(
                    session,
                    { assets: [], sound: () => sound, take: () => undefined },
                    stage.index,
                );
                const preset = presentationStage(actual, session, {
                    scenario,
                    pose: 2,
                    novaTime: 0.23,
                    variant: "parts",
                });
                await game.start(
                    await game.prepare(preset.definition, {
                        key: `fixture-${stage.index}-${scenario}`,
                    }),
                );
                try {
                    for (let tick = 0; tick < preset.warmup; tick++) game.tick();
                    assert.equal(preset.state.ready, true);
                    game.push(
                        await game.prepare(
                            { id: "fixture-freeze", blocksUpdateBelow: true, setup() {} },
                            { key: "freeze" },
                        ),
                    );
                    game.tick();
                    const frozenSeconds = session.run!.seconds;
                    const expected = new Frame();
                    game.render(expected, 1);
                    const expectedData = Array.from(expected.data.subarray(0, expected.count * 14)),
                        expectedTextures = expected.textures.slice(0, expected.count);
                    const claimed = new Set(rev01StageImages(stage.id).map((asset) => asset.id));
                    for (const texture of expectedTextures)
                        if (texture)
                            assert.ok(
                                claimed.has(texture),
                                `${stage.id} ${scenario} draws unclaimed ${texture}`,
                            );
                    const background = `rev01-${["breakwaterBackground", "furnaceBackground", "citadelBackground"][stage.index]}`;
                    const index = expectedTextures.indexOf(background);
                    assert.ok(index >= 0);
                    assert.deepEqual(
                        Array.from(
                            expected.data.subarray(index * 14, index * 14 + 6),
                            (value) => value || 0,
                        ),
                        [0, -20, 640, 0, 0, 400],
                        "native 640x400 background pivot centres with 20 rows cropped each side",
                    );
                    if (scenario === "nova" || scenario === "dense")
                        assert.ok(
                            expectedTextures.includes(calm ? "rev01-novaCalm" : "rev01-nova-atlas"),
                            "production nova draws sparse atlas / calm substitute",
                        );
                    if (scenario === "boss" && stage.index === 1)
                        assert.ok(
                            expectedTextures.includes("rev01-kilnSegment"),
                            "private husks included",
                        );
                    if (scenario === "result") {
                        const bossTextures = [
                            "gatebreaker",
                            "gatebreakerTurret",
                            "kilnHead",
                            "kilnSegment",
                            "starfallEngine",
                            "starfallEmitter",
                        ].map((id) => `rev01-${id}`);
                        assert.ok(
                            expectedTextures.every(
                                (texture) => !texture || !bossTextures.includes(texture),
                            ),
                            "result after 2.3s has no live boss/parts or expired defeat pose",
                        );
                    }
                    for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
                        game.tick();
                        const frame = new Frame();
                        game.render(frame, alpha);
                        assert.deepEqual(
                            Array.from(frame.data.subarray(0, frame.count * 14)),
                            expectedData,
                            `${stage.id} ${scenario} calm=${calm} alpha=${alpha}`,
                        );
                        assert.deepEqual(frame.textures.slice(0, frame.count), expectedTextures);
                    }
                    assert.equal(
                        session.run!.seconds,
                        frozenSeconds,
                        "capture resize/wait cannot advance gameplay",
                    );
                } finally {
                    game.dispose();
                }
            }
});

test("derived images close decoded sources on canvas errors and cancellation before derive", async () => {
    const globals = globalThis as Record<string, unknown>;
    const saved = Object.fromEntries(
        ["fetch", "createImageBitmap", "OffscreenCanvas"].map((key) => [key, globals[key]]),
    );
    try {
        for (const failure of [
            "constructor",
            "context",
            "draw",
            "read",
            "cancel-decode",
            "cancel-read",
        ] as const) {
            let closed = 0,
                derived = 0,
                bitmaps = 0;
            const abort = new AbortController();
            Object.assign(globalThis, {
                fetch: async () => new Response(new Uint8Array([1])),
                createImageBitmap: async () => {
                    bitmaps++;
                    if (failure === "cancel-decode") abort.abort();
                    return {
                        width: 1,
                        height: 1,
                        close() {
                            closed++;
                        },
                    };
                },
                OffscreenCanvas: class {
                    width = 1;
                    height = 1;
                    constructor() {
                        if (failure === "constructor") throw new Error("constructor");
                    }
                    getContext() {
                        if (failure === "context") return null;
                        return {
                            drawImage() {
                                if (failure === "draw") throw new Error("draw");
                            },
                            getImageData() {
                                if (failure === "read") throw new Error("read");
                                if (failure === "cancel-read") abort.abort();
                                return { width: 1, height: 1, data: new Uint8ClampedArray(4) };
                            },
                        };
                    }
                },
            });
            const asset = derivedImageAsset("cleanup", "test", (pixels) => {
                derived++;
                return pixels;
            });
            await assert.rejects(asset.load(abort.signal));
            assert.deepEqual([closed, derived, bitmaps], [1, 0, 1], failure);
        }
    } finally {
        Object.assign(globalThis, saved);
    }
});
