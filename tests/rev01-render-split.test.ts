import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Camera, Frame, Game, emptyInput, type PreparedScene } from "@ngne/core";
import { fileURLToPath } from "node:url";
import { Beam, Pose } from "../src/components/combat.ts";
import { Kind } from "../src/config/enemies.ts";
import { LAYER, LAYER_CATEGORIES } from "../src/config/layers.ts";
import { STAGES } from "../src/config/stages.ts";
import { fromLegacy as w } from "../src/config/view.ts";
import { spawnBullet, spawnEnemy, spawnParticle, spawnRepair } from "../src/entities/combat.ts";
import { drawMine } from "../src/render/player-fx.ts";
import { menuScene } from "../src/scenes/menu.ts";
import { fontImage } from "../src/services/font-assets.ts";
import { NOVA_ATLAS_ID, deriveNovaAtlas } from "../src/services/player-fx-assets.ts";
import { REV01_CLAIMS, REV01_URLS, rev01Sprite } from "../src/services/rev01-assets.ts";
import { stageScene } from "../src/scenes/stage.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import { startNovaFx } from "../src/systems/player-fx-state.ts";
import type { Progress, ProgressCommand, Session } from "../src/world/session.ts";
import { decodePng } from "./helpers/png.ts";

const sound = new Proxy({}, { get: () => () => {} }) as CombatSound;
const categoryOf = new Map<number, string>();
for (const [category, slots] of LAYER_CATEGORIES)
    for (const slot of slots) categoryOf.set(LAYER[slot], category);
const BACKGROUND_TEXTURES = new Set(
    Object.values(REV01_CLAIMS.backgrounds).map((id) => `rev01-${id}`),
);
// T4 native HUD art: the font mask and the registry's HUD group (derived from the claims, not a fixed count).
const HUD_TEXTURES = new Set([fontImage().id, ...REV01_CLAIMS.hud.map((id) => `rev01-${id}`)]);
const T2_TEXTURES = new Set([...REV01_CLAIMS.playerFx.map((id) => `rev01-${id}`), NOVA_ATLAS_ID]);
const T3_TEXTURES = new Set(
    Object.values(REV01_CLAIMS.enemies)
        .flat()
        .map((id) => `rev01-${id}`),
);
deriveNovaAtlas(decodePng(fileURLToPath(REV01_URLS.nova)));

/** Quads as the renderer receives them: layer, texture, top-left corner, edge lengths and centre (translation + half of both edge vectors). */
function quads(frame: Frame) {
    const layers = (frame as unknown as { layers: number[] }).layers,
        d = frame.data;
    return Array.from({ length: frame.count }, (_, i) => ({
        layer: layers[i],
        texture: frame.textures[i],
        x0: d[i * 14],
        y0: d[i * 14 + 1],
        width: d[i * 14 + 2],
        height: d[i * 14 + 5],
        u: d[i * 14 + 6],
        edges: Array.from(d.subarray(i * 14 + 2, i * 14 + 6)),
        cx: d[i * 14] + (d[i * 14 + 2] + d[i * 14 + 4]) / 2,
        cy: d[i * 14 + 1] + (d[i * 14 + 3] + d[i * 14 + 5]) / 2,
    }));
}

test("split render passes draw every combat element into the shared layer table with native rasters and preserved code rounding", async () => {
    for (const stage of STAGES) {
        const session: Session = {
            settings: { music: 0, effects: 0, muted: true, reducedMotion: false },
            screen: "title",
            best: 0,
            ready: true,
        };
        const game = new Game<Progress, ProgressCommand>({
            seed: "RENDER",
            state: { best: 0, runs: 0 },
            transition: (state) => state,
        });
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
                        const run = session.run!;
                        run.waveIndex = stage.encounters.length;
                        run.phase = "boss";
                        run.bossMax = run.bossHealth = stage.boss.hp;
                        run.bannerTime = 2;
                        run.banner = "TEST";
                        run.bannerKind = "sector";
                        run.novaRing = 0.3;
                        startNovaFx(run);
                        run.flash = 0.1;
                        run.scorePops.push({ x: w(100), y: w(100), text: "+100", life: 1 });
                        for (const kind of Object.values(Kind))
                            spawnEnemy(scene.world, run, kind, w(60 + kind * 30), w(120), {
                                cooldown: 0.5,
                            });
                        spawnBullet(scene.world, w(100), w(200), 0, w(40));
                        spawnBullet(scene.world, w(110), w(200), 0, -w(370), 0);
                        spawnParticle(scene.world, w(150), w(150), 0, 0, 1, 0xffffff, w(2));
                        spawnParticle(scene.world, w(160), w(150), 0, 0, 0.365, 0xffffff, w(1), 1);
                        spawnRepair(scene.world, w(200), w(150));
                        scene.world.spawn(
                            Pose.of({ x: w(300), px: w(300), y: w(38), py: w(38) }),
                            Beam.of({ width: 13, charge: 10, duration: 1 }),
                        );
                        scene.world.spawn(
                            Pose.of({ x: w(340), px: w(340), y: w(38), py: w(38) }),
                            Beam.of({ width: 15, charge: 0, duration: 10 }),
                        );
                    },
                },
                { key: `render-${stage.id}` },
            ),
        );
        try {
            for (let i = 0; i < 3; i++) game.tick(emptyInput());
            const frame = new Frame();
            game.render(frame, 0.5);
            const drawn = quads(frame);
            assert.ok(drawn.length > 100, `${stage.id}: ${drawn.length} quads`);
            const used = new Set<string>();
            for (const quad of drawn) {
                const category = categoryOf.get(quad.layer);
                assert.ok(category, `${stage.id}: layer ${quad.layer} is not in the shared table`);
                used.add(category);
                if (quad.texture && HUD_TEXTURES.has(quad.texture))
                    assert.equal(
                        category,
                        "hud",
                        `${stage.id}: ${quad.texture} drawn outside the HUD layers`,
                    );
                else if (quad.texture)
                    assert.ok(
                        BACKGROUND_TEXTURES.has(quad.texture) ||
                            T2_TEXTURES.has(quad.texture) ||
                            T3_TEXTURES.has(quad.texture),
                        `${stage.id}: unexpected or retired texture ${quad.texture}`,
                    );
            }
            for (const category of [
                "background",
                "hulls",
                "effects",
                "hud",
                "nova",
                "beams",
                "bullets",
                "core",
                "flash",
            ])
                assert.ok(used.has(category), `${stage.id}: nothing drawn in ${category}`);
            // T4 HUD quads are native: textured rev01 HUD art and the code-drawn bands, every corner and edge on a whole pixel.
            const native = (quad: (typeof drawn)[number]) =>
                (quad.texture !== undefined &&
                    (HUD_TEXTURES.has(quad.texture) || BACKGROUND_TEXTURES.has(quad.texture))) ||
                quad.layer === LAYER.hudBand;
            const whole = (value: number) => Math.abs(value - Math.round(value)) < 1e-4;
            assert.ok(drawn.filter(native).length > 50, `${stage.id}: native HUD quads`);
            assert.deepEqual(
                drawn.filter(
                    (quad) =>
                        native(quad) && ![quad.x0, quad.y0, quad.width, quad.height].every(whole),
                ),
                [],
                `${stage.id}: native HUD quads off the pixel grid`,
            );
            // pixelSnap is off for the stage; every legacy quad must arrive with an engine-rounded centre (shake is whole too).
            const onGrid = (quad: (typeof drawn)[number]) =>
                whole(quad.x0) && whole(quad.y0) && quad.edges.every(whole);
            assert.deepEqual(
                drawn.filter(
                    (quad) => quad.texture && T2_TEXTURES.has(quad.texture) && !onGrid(quad),
                ),
                [],
                `${stage.id}: off-grid T2 quads`,
            );
            assert.ok(
                drawn.some((quad) => quad.texture && T3_TEXTURES.has(quad.texture)),
                `${stage.id}: native enemy quads`,
            );
            assert.deepEqual(
                drawn.filter(
                    (quad) => quad.texture && T3_TEXTURES.has(quad.texture) && !onGrid(quad),
                ),
                [],
                `${stage.id}: off-grid T3 quads`,
            );
            for (const id of [
                "interceptor",
                "dart",
                "gunship",
                stage.index === 0
                    ? "gatebreaker"
                    : stage.index === 1
                      ? "kilnHead"
                      : "starfallEngine",
            ])
                assert.ok(
                    drawn.some((quad) => quad.texture === `rev01-${id}`),
                    `${stage.id}: no native ${id}`,
                );
            const offGrid = drawn.filter(
                (quad) =>
                    !native(quad) &&
                    !(
                        quad.texture &&
                        (T2_TEXTURES.has(quad.texture) || T3_TEXTURES.has(quad.texture))
                    ) &&
                    quad.layer !== LAYER.bossLink &&
                    (quad.texture
                        ? !whole(quad.cx) || !whole(quad.cy)
                        : !onGrid(quad) && (!whole(quad.cx) || !whole(quad.cy))),
            );
            assert.deepEqual(offGrid, [], `${stage.id}: unrounded legacy quads`);
            const layerOf = (texture: string) =>
                drawn.find((quad) => quad.texture === texture)?.layer;
            assert.equal(layerOf("rev01-player"), LAYER.player);
            assert.equal(layerOf("rev01-exhaust"), LAYER.playerExhaust);
            assert.equal(layerOf(NOVA_ATLAS_ID), LAYER.nova);
            for (const id of ["primaryLance", "hostileBead", "pickup", "explosion", "beamWarning"])
                assert.ok(layerOf(`rev01-${id}`) !== undefined, `${stage.id}: ${id} drawn`);
            assert.ok(
                drawn.some((quad) => quad.texture === "rev01-mine" && quad.layer === LAYER.mine),
                `${stage.id}: native mine`,
            );
        } finally {
            game.dispose();
        }
    }
});

test("drawMine seam: (native frame, legacy frame, x, y, cue, clock); one native mine, nothing through legacy", () => {
    const mine = rev01Sprite("mine");
    for (const cue of [false, true])
        for (const clock of [0, 0.25, 1.3]) {
            const native = new Frame(),
                legacy = new Frame(),
                camera = new Camera();
            camera.pixelSnap = false;
            native.scene(camera, 1);
            drawMine(native, legacy, 300.6, 150.2, cue, clock);
            assert.equal(legacy.count, 0, "no legacy draws");
            const drawn = quads(native),
                art = mine.frame(cue ? "armed" : "idle");
            assert.equal(drawn.length, 1);
            assert.equal(drawn[0].texture, "rev01-mine");
            assert.equal(drawn[0].layer, LAYER.mine);
            assert.equal(drawn[0].u, Math.fround(art.u));
            assert.deepEqual(
                [drawn[0].x0, drawn[0].y0, drawn[0].width, drawn[0].height],
                [300 - art.pivotX, 150 - art.pivotY, art.width, art.height],
            );
        }
    assert.equal(drawMine.length, 6);
});

test("menus draw in the shared table: title in background/hull slots, pause and result in the screen category", async () => {
    for (const kind of ["title", "pause", "result"] as const) {
        const session: Session = {
            settings: { music: 0, effects: 0, muted: true, reducedMotion: false },
            screen: "playing",
            best: 0,
            ready: true,
        };
        session.run = { ...(await import("../src/world/session.ts")).newRun(0), phase: "clear" };
        const game = new Game<Progress, ProgressCommand>({
            seed: 1,
            state: { best: 0, runs: 0 },
            transition: (state) => state,
        });
        const scene: PreparedScene = await game.prepare(
            { ...menuScene(kind, session, () => undefined), assets: [] },
            { key: kind },
        );
        await game.start(scene);
        try {
            game.tick(emptyInput());
            const frame = new Frame();
            game.render(frame, 1);
            const drawn = quads(frame),
                categories = new Set(drawn.map((quad) => categoryOf.get(quad.layer)));
            assert.ok(!categories.has(undefined), kind);
            assert.ok(categories.has("screen"), kind);
            if (kind !== "title") assert.deepEqual([...categories], ["screen"], kind);
            else {
                const title = drawn.filter((quad) => categoryOf.get(quad.layer) !== "screen");
                assert.ok(
                    title.some((quad) => quad.texture === "rev01-breakwaterBackground"),
                    "title native background",
                );
                assert.ok(
                    title.some((quad) => quad.texture === "rev01-player") &&
                        title.some((quad) => quad.texture === "rev01-exhaust"),
                    "title native ship and socket exhaust",
                );
                assert.ok(
                    title.every(
                        (quad) =>
                            !quad.texture ||
                            [
                                "rev01-breakwaterBackground",
                                "rev01-player",
                                "rev01-exhaust",
                            ].includes(quad.texture),
                    ),
                    "no retired title rasters",
                );
                assert.deepEqual(
                    title.filter(
                        (quad) =>
                            ![quad.x0, quad.y0, quad.width, quad.height].every(Number.isInteger),
                    ),
                    [],
                    "title: native pixel edges",
                );
            }
            // Screen category = the native kit: font mask or rev01 screen art (registry group), whole-pixel corners and edges.
            const kit = new Set([
                    fontImage().id,
                    ...REV01_CLAIMS.screens.map((id) => `rev01-${id}`),
                ]),
                screen = drawn.filter((quad) => categoryOf.get(quad.layer) === "screen");
            assert.deepEqual(
                screen
                    .filter((quad) => quad.texture !== undefined && !kit.has(quad.texture))
                    .map((quad) => quad.texture),
                [],
                kind,
            );
            assert.ok(
                screen.some((quad) => quad.texture === fontImage().id) &&
                    screen.some((quad) => quad.texture === "rev01-menuItem"),
                kind,
            );
            assert.deepEqual(
                screen.filter(
                    (quad) =>
                        ![quad.x0, quad.y0, quad.width, quad.height].every(
                            (value) => Math.abs(value - Math.round(value)) < 1e-4,
                        ),
                ),
                [],
                `${kind}: off-grid screen quads`,
            );
        } finally {
            game.dispose();
        }
    }
});
