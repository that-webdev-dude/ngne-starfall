import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Frame, Game, emptyInput, type SceneSetup, type WorldAccess } from "@ngne/core";
import { Bullet, Enemy, Pose } from "../src/components/combat.ts";
import {
    TELEGRAPH_CORE,
    TURRET_MUZZLES,
    TURRET_SOCKETS,
    gatebreakerHull,
    gatebreakerTurret,
} from "../src/bosses/gatebreaker.ts";
import {
    KILN_COMPRESS_RATE,
    KILN_MIN_JOINT_SPACING,
    kilnChain,
    kilnCompressed,
    kilnHeadFrame,
    kilnHeadX,
    kilnSectionPath,
} from "../src/bosses/kiln-serpent.ts";
import {
    addPoint,
    placeSocket,
    specSocket,
    specSocketList,
    splitVolley,
    type Point,
} from "../src/bosses/sockets.ts";
import {
    EMITTER_MUZZLES,
    EMITTER_SOCKETS,
    engineEmitter,
    engineHullFrame,
} from "../src/bosses/starfall-engine.ts";
import { DEFEAT, HIT_TINT } from "../src/bosses/boss.ts";
import { Kind, enemySpec } from "../src/config/enemies.ts";
import { LAYER } from "../src/config/layers.ts";
import { STAGES } from "../src/config/stages.ts";
import { fromLegacy as w } from "../src/config/view.ts";
import { spawnBullet, spawnEnemy } from "../src/entities/combat.ts";
import { ORDINARY_SPRITES, ordinaryFrame } from "../src/render/enemy-frames.ts";
import { stageScene } from "../src/scenes/stage.ts";
import {
    REV01_CLAIMS,
    rev01Sprite,
    type NativeFrame,
    type NativeSprite,
    type Rev01Id,
} from "../src/services/rev01-assets.ts";
import { MINE_RELEASE } from "../src/systems/advanced-enemies.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import { ENEMY_MUZZLES, GUNSHIP_TIMING } from "../src/systems/combat-enemies.ts";
import { fan } from "../src/world/patterns.ts";
import type { Progress, ProgressCommand, RunState, Session } from "../src/world/session.ts";
import spec from "../src/assets/spec.json" with { type: "json" };
import { decodePng } from "./helpers/png.ts";

/**
 * T3 evidence: native enemy/boss frame choice at cue, fire, phase, part-destruction and defeat boundaries, spec
 * sockets under the right-hand flip and the Kiln -90 degree rotation (read back from the actual quads), the approved
 * Kiln chain cap over a full motion cycle, husks, and attack counts/origins that keep every existing shot.
 */
const dt = 1 / 60;
const sound = new Proxy({}, { get: () => () => {} }) as CombatSound;
type Setup = SceneSetup<Progress, ProgressCommand>;
type Action = (scene: Setup, run: RunState) => void;
const specSprite = (id: string) => spec.sprites.find((entry) => entry.id === id)!;

async function stage(stageIndex: number, setup: Action, reducedMotion = false) {
    const session: Session = {
        settings: { music: 0, effects: 0, muted: true, reducedMotion },
        screen: "title",
        best: 0,
        ready: true,
    };
    const game = new Game<Progress, ProgressCommand>({
        seed: "T3",
        state: { best: 0, runs: 0 },
        transition: (state) => state,
    });
    const queue: Action[] = [];
    let world!: WorldAccess;
    const actual = stageScene(
        session,
        { assets: [], sound: () => sound, take: () => undefined },
        stageIndex,
    );
    await game.start(
        await game.prepare(
            {
                ...actual,
                setup(scene) {
                    scene.system(
                        () => {
                            for (const action of queue.splice(0)) action(scene, session.run!);
                        },
                        { runsDuringFreeze: true },
                    );
                    actual.setup(scene);
                    world = scene.world;
                    session.run!.waveIndex = STAGES[stageIndex].encounters.length;
                    session.run!.invulnerable = 1e9;
                    session.run!.bannerTime = 0;
                    setup(scene, session.run!);
                },
            },
            { key: `t3-${stageIndex}` },
        ),
    );
    return {
        game,
        session,
        queue,
        get run() {
            return session.run!;
        },
        get world() {
            return world;
        },
        tick: (count = 1) => {
            for (let i = 0; i < count; i++) game.tick(emptyInput());
        },
        render: (alpha = 1) => {
            const frame = new Frame();
            game.render(frame, alpha);
            return quads(frame);
        },
    };
}

interface Quad {
    layer: number;
    texture?: string;
    d: number[];
}
function quads(frame: Frame): Quad[] {
    const layers = (frame as unknown as { layers: number[] }).layers;
    return Array.from({ length: frame.count }, (_, i) => ({
        layer: layers[i],
        texture: frame.textures[i],
        d: Array.from(frame.data.slice(i * 14, i * 14 + 14)),
    }));
}
/** The native frame a quad samples (flipped quads run their u backwards); frame data is Float32. */
function frameOf(quad: Quad, sprite: NativeSprite): NativeFrame | undefined {
    const [, , , , , , u, , uw] = quad.d,
        left = Math.min(u, u + uw),
        texel = 0.25 / sprite.stripWidth;
    return sprite.frames.find(
        (frame) => Math.abs(frame.u - left) < texel && Math.abs(frame.uw - Math.abs(uw)) < texel,
    );
}
const isFlipped = (quad: Quad) => quad.d[8] < 0;
/** Screen pixel that shows canvas texel (cx, cy) of `art` in this quad (inverse of the quad's affine + UV map). */
function texelPixel(
    quad: Quad,
    sprite: NativeSprite,
    art: NativeFrame,
    cx: number,
    cy: number,
): Point {
    const [x0, y0, ax, ay, bx, by, u, v, uw, vh] = quad.d;
    const s = ((art.x + cx + 0.5) / sprite.stripWidth - u) / uw,
        t = ((art.y + cy + 0.5) / sprite.stripHeight - v) / vh;
    return [Math.floor(x0 + ax * s + bx * t), Math.floor(y0 + ay * s + by * t)];
}
const socketPixel = (quad: Quad, sprite: NativeSprite, [dx, dy]: Point): Point => {
    const art = frameOf(quad, sprite)!;
    return texelPixel(quad, sprite, art, art.pivotX + dx, art.pivotY + dy);
};
const byTexture = (drawn: Quad[], id: Rev01Id) =>
    drawn.filter((quad) => quad.texture === `rev01-${id}`);
const rgb = (quad: Quad) =>
    (Math.round(quad.d[10] * 255) << 16) |
    (Math.round(quad.d[11] * 255) << 8) |
    Math.round(quad.d[12] * 255);

function enemyRows(world: WorldAccess, kind: number) {
    const rows: {
        x: number;
        y: number;
        hp: number;
        pattern: number;
        age: number;
        cue: number;
        cooldown: number;
        fireIndex: number;
        targetAngle: number;
    }[] = [];
    world.query(Pose, Enemy).eachChunk(({ views, count }) => {
        for (let i = 0; i < count; i++)
            if (views.enemy.active[i] && views.enemy.kind[i] === kind) {
                const e = views.enemy;
                rows.push({
                    x: views.pose.x[i],
                    y: views.pose.y[i],
                    hp: e.hp[i],
                    pattern: e.pattern[i],
                    age: e.age[i],
                    cue: e.cue[i],
                    cooldown: e.cooldown[i],
                    fireIndex: e.fireIndex[i],
                    targetAngle: e.targetAngle[i],
                });
            }
    });
    return rows;
}
/** Hostile bullets published this tick (not advanced yet). */
function freshShots(world: WorldAccess) {
    const shots: { x: number; y: number; vx: number; vy: number }[] = [];
    world.query(Pose, Bullet).eachChunk(({ views, count }) => {
        for (let i = 0; i < count; i++)
            if (views.bullet.active[i] && views.bullet.team[i] && views.bullet.age[i] === 0)
                shots.push({
                    x: views.pose.x[i],
                    y: views.pose.y[i],
                    vx: views.bullet.vx[i],
                    vy: views.bullet.vy[i],
                });
    });
    return shots;
}
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
/** A boss row with a preset clock (setup-time queries cannot see uncommitted spawns). */
function spawnBoss(
    scene: Setup,
    run: RunState,
    kind: Kind,
    x: number,
    y: number,
    state: { hp?: number; age?: number; fireIndex?: number } = {},
) {
    const hp = state.hp ?? enemySpec(kind).hp;
    scene.world.spawn(
        Pose.of({ x, y, px: x, py: y }),
        Enemy.of({
            kind,
            hp,
            maxHp: hp,
            originX: x,
            age: state.age ?? 0,
            fireIndex: state.fireIndex ?? 0,
            cooldown: enemySpec(kind).cooldown,
            radius: enemySpec(kind).radius,
            id: run.nextId++,
        }),
    );
}

test("native sockets come straight from the spec (no 4/3 factor); source code no longer uses the legacy socket tables", () => {
    assert.deepEqual(ENEMY_MUZZLES.interceptor, specSprite("interceptor").sockets!.muzzle);
    assert.deepEqual(ENEMY_MUZZLES.dart, specSprite("dart").sockets!.muzzle);
    assert.deepEqual(ENEMY_MUZZLES.gunship, [
        specSprite("gunship").sockets!.leftMuzzle,
        specSprite("gunship").sockets!.rightMuzzle,
    ]);
    assert.deepEqual(MINE_RELEASE, specSprite("minelayer").sockets!.mineRelease);
    assert.deepEqual(TURRET_SOCKETS, [
        [-47, 4],
        [47, 4],
    ]);
    assert.deepEqual(EMITTER_SOCKETS, [
        [-41, -1],
        [41, -1],
    ]);
    // Right instances negate dx (spec socketNote); the left keeps the spec order.
    assert.deepEqual(TURRET_MUZZLES, [
        [
            [-50, 33],
            [-44, 33],
        ],
        [
            [50, 33],
            [44, 33],
        ],
    ]);
    assert.deepEqual(EMITTER_MUZZLES, [
        [-41, 11],
        [41, 11],
    ]);
    assert.deepEqual(placeSocket([3, 29], { flipX: true }), [-3, 29]);
    assert.deepEqual(
        placeSocket([0, 21], { rotation: -90 }),
        [21, 0],
        "Kiln drill points screen +x",
    );
    assert.deepEqual(placeSocket([0, -23], { rotation: -90 }), [-23, 0]);
    assert.deepEqual(placeSocket([-22, 13], { rotation: -90 }), [13, 22]);
    assert.deepEqual(specSocket("kilnSegment", "frontCoupling", "compressed"), [0, 10]);
    assert.throws(() => specSocket("kilnSegment", "frontCoupling"), /single socket/);
    const sources: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) walk(path);
            else if (path.endsWith(".ts")) sources.push(path);
        }
    };
    walk("src");
    for (const path of sources) {
        const source = readFileSync(path, "utf8");
        if (!path.endsWith(join("config", "boss-geometry.ts")))
            assert.doesNotMatch(
                source,
                /boss-geometry/,
                `${path} uses the legacy BOSS/ENGINE sockets`,
            );
        if (path.includes(join("src", "bosses")) || path.endsWith(join("render", "enemies.ts")))
            assert.doesNotMatch(
                source,
                /art-assets|campaign-assets|combat-assets|drawSprite/,
                `${path} still draws legacy enemy art`,
            );
    }
});

test("every enemy/boss sprite a stage can spawn is in that stage's registry claims", () => {
    const sprite: Record<string, Rev01Id[]> = {
        interceptor: ["interceptor"],
        sweeper: ["dart"],
        gunship: ["gunship"],
        minelayer: ["minelayer"],
        warden: ["warden"],
        repair: [],
    };
    const bosses: Record<string, Rev01Id[]> = {
        GATEBREAKER: ["gatebreaker", "gatebreakerTurret"],
        "KILN SERPENT": ["kilnHead", "kilnSegment"],
        "STARFALL ENGINE": ["starfallEngine", "starfallEmitter"],
    };
    for (const entry of STAGES) {
        const claims = new Set<string>(
            (REV01_CLAIMS.enemies as Record<string, readonly string[]>)[entry.id],
        );
        for (const id of [
            ...entry.encounters.flatMap((event) => sprite[event.kind]),
            ...bosses[entry.boss.name],
        ])
            assert.ok(claims.has(id), `${entry.id} draws ${id}`);
    }
    // Every delivered ordinary-enemy frame is reachable from some state (and nothing else is asked for).
    const reachable: Record<string, string[]> = {
        interceptor: ["idle", "pulse", "fire"],
        dart: ["idle", "pulse", "fire"],
        gunship: ["idle", "fire", "vent-a", "vent-b"],
        warden: ["idle", "charge", "fire"],
        minelayer: ["idle", "open", "release"],
    };
    for (const id of Object.values(ORDINARY_SPRITES))
        assert.deepEqual([...reachable[id!]].sort(), [...specSprite(id!).frames].sort(), id);
    const seen = new Map<string, Set<string>>();
    for (const [kind, id] of Object.entries(ORDINARY_SPRITES))
        for (const reduced of [false, true])
            for (const cue of [0, 1])
                for (const fireIndex of [0, 1])
                    for (const cooldown of [-0.01, 0.05, 0.3, 0.5, 2.39, 3.29, 0.69])
                        for (const age of [0.05, 0.11, 0.15, 0.2]) {
                            const name = ordinaryFrame(
                                Number(kind),
                                { age, cue, cooldown, fireIndex },
                                reduced,
                            );
                            rev01Sprite(id!).frame(name);
                            seen.set(id!, (seen.get(id!) ?? new Set()).add(name));
                        }
    for (const [id, names] of seen)
        assert.deepEqual([...names].sort(), [...reachable[id]].sort(), id);
});

test("splitVolley spreads one volley over the muzzles without adding, dropping or re-aiming a shot", () => {
    const muzzles: Point[] = [
        [-15, 16],
        [15, 16],
    ];
    for (const count of [1, 2, 5, 7, 9]) {
        const shots = fan(Math.PI / 2, count, 1.2, 70),
            runs = splitVolley(shots, muzzles);
        assert.deepEqual(
            runs.flatMap((run) => run.shots),
            shots,
            `${count}: same shots, same order`,
        );
        if (count > 1)
            assert.deepEqual(
                runs.map((run) => run.shots.length),
                [Math.ceil(count / 2), Math.floor(count / 2)],
            );
        // Aimed down, the fan sweeps from +x to -x, so the first run leaves the +x muzzle: paths never cross at the hull.
        if (count > 1)
            assert.deepEqual(
                runs.map((run) => run.origin),
                [
                    [15, 16],
                    [-15, 16],
                ],
            );
    }
    // Aimed up the sweep reverses, and so does the muzzle order.
    assert.deepEqual(
        splitVolley(fan(-Math.PI / 2, 5, 1, 70), muzzles).map((run) => run.origin),
        [
            [-15, 16],
            [15, 16],
        ],
    );
});

test("ordinary enemies: frame at cue, fire and loop boundaries in the actual simulation; shot origins on spec muzzles", async () => {
    // Gunship: idle -> vent-a/vent-b (120 ms each) during the 0.45 s cue -> fire (70 ms) on the volley tick -> idle.
    for (const reduced of [false, true]) {
        const h = await stage(
            0,
            (scene, run) =>
                spawnEnemy(scene.world, run, Kind.Gunship, w(130), w(67), { cooldown: 0.605 }),
            reduced,
        );
        try {
            const frames: string[] = [];
            let volley = -1;
            for (let tick = 1; tick <= 60; tick++) {
                h.tick();
                const [g] = enemyRows(h.world, Kind.Gunship),
                    shots = freshShots(h.world);
                frames.push(ordinaryFrame(Kind.Gunship, g, reduced));
                if (shots.length) {
                    volley = tick;
                    assert.equal(shots.length, 5, "one 5-shot volley");
                    const left = shots.filter((s) => near(s.x, g.x - 15) && near(s.y, g.y + 16)),
                        right = shots.filter((s) => near(s.x, g.x + 15) && near(s.y, g.y + 16));
                    assert.equal(left.length + right.length, 5, "every shot leaves a spec muzzle");
                    assert.deepEqual([left.length, right.length].sort(), [2, 3]);
                    const expected = fan(g.targetAngle, 5, (56 * Math.PI) / 180, w(58));
                    assert.deepEqual(
                        shots.map((s) => [s.vx, s.vy]),
                        expected.map((s) => [s.vx, s.vy]),
                        "velocities and order unchanged",
                    );
                }
            }
            // cooldown 0.605 - n/60 drops below 0.45 on tick 10 and to <= 0 on tick 37; cue elapsed = n/60 - 0.155.
            assert.equal(volley, 37);
            assert.deepEqual(frames.slice(0, 9), Array(9).fill("idle"));
            const cue = frames.slice(9, 36);
            if (reduced)
                assert.deepEqual(
                    cue,
                    Array(27).fill("vent-b"),
                    "reduced motion holds the open vent",
                );
            else
                assert.deepEqual(cue, [
                    ...Array(7).fill("vent-a"),
                    ...Array(7).fill("vent-b"),
                    ...Array(7).fill("vent-a"),
                    ...Array(6).fill("vent-b"),
                ]);
            assert.deepEqual(
                frames.slice(36, 42),
                ["fire", "fire", "fire", "fire", "fire", "idle"],
                "fire held 70 ms from the volley tick",
            );
            assert.ok(frames.slice(42).every((name) => name === "idle"));
        } finally {
            h.game.dispose();
        }
    }
    // Interceptor: idle/pulse 120/120 by age (idle only in reduced motion), single aimed shot from its muzzle, fire for 70 ms.
    for (const reduced of [false, true]) {
        const h = await stage(
            0,
            (scene, run) =>
                spawnEnemy(scene.world, run, Kind.Interceptor, w(100), w(60), { cooldown: 0.505 }),
            reduced,
        );
        try {
            const frames: string[] = [];
            let shotTick = 0;
            for (let tick = 1; tick <= 50; tick++) {
                h.tick();
                const [i] = enemyRows(h.world, Kind.Interceptor),
                    shots = freshShots(h.world);
                frames.push(ordinaryFrame(Kind.Interceptor, i, reduced));
                if (shots.length) {
                    shotTick = tick;
                    assert.deepEqual(
                        shots.map((s) => [s.x, s.y]),
                        [[i.x + 0, i.y + 10]],
                    );
                }
            }
            // cooldown 0.505 - n/60 <= 0 on tick 31; the fire frame holds while less than 70 ms have passed (ticks 31-34).
            assert.equal(shotTick, 31);
            assert.deepEqual(
                frames.slice(30, 35),
                ["fire", "fire", "fire", "fire", "idle"],
                "fire held 70 ms after the shot, then the loop",
            );
            if (reduced) assert.ok(frames.every((name) => name !== "pulse"));
            else
                assert.deepEqual(frames.slice(0, 15), [
                    ...Array(7).fill("idle"),
                    ...Array(7).fill("pulse"),
                    "idle",
                ]);
        } finally {
            h.game.dispose();
        }
    }
    // Dart: fire frame only after a real shot; the proximity skip (player within 45 legacy px) shows no flash.
    for (const close of [false, true]) {
        const h = await stage(0, (scene, run) => {
            spawnEnemy(
                scene.world,
                run,
                Kind.Sweeper,
                close ? run.x : w(100),
                close ? run.y - 20 : w(92),
                { cooldown: 0.04, vx: 0 },
            );
        });
        try {
            h.tick(3);
            const [d] = enemyRows(h.world, Kind.Sweeper),
                shots = freshShots(h.world);
            assert.equal(shots.length, close ? 0 : 3);
            if (!close)
                assert.ok(
                    shots.every((s) => near(s.x, d.x) && near(s.y, d.y + 13)),
                    "dart fires from its spec muzzle",
                );
            assert.equal(ordinaryFrame(Kind.Sweeper, d, false), close ? "idle" : "fire");
        } finally {
            h.game.dispose();
        }
    }
    // Warden: charge for the whole 0.8 s cue, fire 70 ms after the lane; Minelayer: open, release for the last 120 ms, mine on mineRelease.
    for (const kind of [Kind.Warden, Kind.Minelayer]) {
        const h = await stage(1, (scene, run) =>
            spawnEnemy(scene.world, run, kind, w(150), w(65), { cooldown: 1.005 }),
        );
        try {
            const frames: string[] = [];
            let action = 0;
            for (let tick = 1; tick <= 70; tick++) {
                h.tick();
                const [e] = enemyRows(h.world, kind);
                frames.push(ordinaryFrame(kind, e, false));
                if (!action && e.fireIndex > 0) action = tick;
                if (kind === Kind.Minelayer && action === tick) {
                    const [mine] = enemyRows(h.world, Kind.Mine);
                    assert.ok(
                        mine &&
                            near(mine.x, e.x + MINE_RELEASE[0]) &&
                            near(mine.y, e.y + MINE_RELEASE[1]),
                        "mine spawns on mineRelease",
                    );
                }
            }
            // 1.005 - n/60: cue (< 0.8) from tick 13, action (<= 0) on tick 61.
            assert.equal(action, 61);
            assert.deepEqual(frames.slice(0, 12), Array(12).fill("idle"));
            if (kind === Kind.Warden) {
                assert.deepEqual(frames.slice(12, 60), Array(48).fill("charge"));
                assert.deepEqual(frames.slice(60, 66), [
                    "fire",
                    "fire",
                    "fire",
                    "fire",
                    "fire",
                    "idle",
                ]);
            } else {
                // cooldown < 0.12 from tick 54: the release frame (mine in the bay) leads into the spawn, then the doors close.
                assert.deepEqual(frames.slice(12, 53), Array(41).fill("open"));
                assert.deepEqual(frames.slice(53, 60), Array(7).fill("release"));
                assert.equal(frames[60], "idle");
            }
        } finally {
            h.game.dispose();
        }
    }
});

test("ordinary enemies render natively at their spec pivot with the hit tint (none in reduced motion) and the interceptor's code cue", async () => {
    for (const reduced of [false, true]) {
        const h = await stage(
            1,
            (scene, run) => {
                spawnEnemy(scene.world, run, Kind.Warden, w(150), w(65), { cooldown: 5 });
                spawnEnemy(scene.world, run, Kind.Interceptor, w(300), w(60), { cooldown: 0.3 });
            },
            reduced,
        );
        try {
            h.tick();
            h.queue.push((scene) =>
                scene.world.query(Enemy).eachChunk(({ views, count }) => {
                    for (let i = 0; i < count; i++) views.enemy.flash[i] = 0.07;
                }),
            );
            h.tick();
            const drawn = h.render(),
                sprite = rev01Sprite("warden"),
                [warden] = enemyRows(h.world, Kind.Warden);
            const [quad] = byTexture(drawn, "warden");
            assert.equal(quad.layer, LAYER.enemy);
            assert.deepEqual(
                socketPixel(quad, sprite, [0, 0]),
                [Math.floor(warden.x), Math.floor(warden.y)],
                "pivot texel on the pixel containing the position",
            );
            assert.deepEqual(socketPixel(quad, sprite, specSocket("warden", "rightMuzzle")), [
                Math.floor(warden.x) + 8,
                Math.floor(warden.y) + 11,
            ]);
            assert.equal(rgb(quad), reduced ? 0xffffff : HIT_TINT);
            const cue = drawn.filter((q) => q.layer === LAYER.enemyCue);
            assert.equal(cue.length, 1, "interceptor aim cue (no telegraph frame in the art)");
        } finally {
            h.game.dispose();
        }
    }
});

test("Gatebreaker: hull wreck/telegraph states, flipped turret sockets, turret telegraph/firing/down, split turret fans", async () => {
    const max = enemySpec(Kind.Gatebreaker).hp;
    assert.deepEqual(gatebreakerHull(max, 0), { frame: "idle", coreTelegraph: false });
    assert.deepEqual(
        gatebreakerHull(max, 1),
        { frame: "idle", coreTelegraph: false },
        "turret fans cue the turret, not the core",
    );
    for (const cue of [2, 3])
        assert.deepEqual(gatebreakerHull(max, cue), { frame: "telegraph", coreTelegraph: false });
    assert.deepEqual(gatebreakerHull((max * 2) / 3 + 0.01, 0).frame, "idle");
    assert.deepEqual(gatebreakerHull((max * 2) / 3, 0), { frame: "wreck-1", coreTelegraph: false });
    assert.deepEqual(gatebreakerHull((max * 2) / 3, 3), { frame: "wreck-1", coreTelegraph: true });
    assert.deepEqual(gatebreakerHull(max / 3, 2), { frame: "wreck-2", coreTelegraph: true });
    // The wreck frames keep idle's core pixels inside the telegraph's 13x13 core box, and telegraph differs from idle only there,
    // so wreck + that box is exactly "wreck with the core cue" (no invented pixels).
    const png = decodePng("src/assets/sprites/gatebreaker.png"),
        hull = rev01Sprite("gatebreaker");
    const pixel = (name: string, x: number, y: number) => {
        const f = hull.frame(name),
            i = ((f.y + y) * png.width + f.x + x) * 4;
        return png.data.slice(i, i + 4).join();
    };
    const inCore = (x: number, y: number) =>
        x - 79 >= -6 && x - 79 <= 6 && y - 39 >= -5 && y - 39 <= 7;
    let changed = 0;
    for (let y = 0; y < 79; y++)
        for (let x = 0; x < 159; x++) {
            if (pixel("idle", x, y) !== pixel("telegraph", x, y)) {
                assert.ok(inCore(x, y), `telegraph differs outside the core box at ${x},${y}`);
                changed++;
            }
            if (inCore(x, y))
                for (const wreck of ["wreck-1", "wreck-2"])
                    assert.equal(
                        pixel(wreck, x, y),
                        pixel("idle", x, y),
                        `${wreck} core ${x},${y}`,
                    );
        }
    assert.ok(changed > 0);
    assert.deepEqual(
        [
            TELEGRAPH_CORE.width,
            TELEGRAPH_CORE.height,
            TELEGRAPH_CORE.pivotX,
            TELEGRAPH_CORE.pivotY,
            TELEGRAPH_CORE.x,
        ],
        [13, 13, 6, 5, 159 + 79 - 6],
    );

    // Turret states from the boss clock: pattern 0/2 left, 1 right; firing 90 ms after its fan.
    assert.equal(gatebreakerTurret(0, true, { cue: 1, fireIndex: 0, time: 0.5 }), "telegraph");
    assert.equal(gatebreakerTurret(1, true, { cue: 1, fireIndex: 0, time: 0.5 }), "idle");
    assert.equal(gatebreakerTurret(1, true, { cue: 1, fireIndex: 1, time: 1.8 }), "telegraph");
    assert.equal(gatebreakerTurret(0, true, { cue: 0, fireIndex: 1, time: 0.9 + 0.089 }), "firing");
    assert.equal(gatebreakerTurret(0, true, { cue: 0, fireIndex: 1, time: 0.9 + 0.091 }), "idle");
    assert.equal(gatebreakerTurret(1, true, { cue: 0, fireIndex: 1, time: 0.95 }), "idle");
    assert.equal(
        gatebreakerTurret(0, true, { cue: 2, fireIndex: 3, time: 4.1 }),
        "idle",
        "curtain cue leaves turrets idle",
    );
    assert.equal(gatebreakerTurret(0, false, { cue: 1, fireIndex: 0, time: 0.5 }), "down");

    // Actual fans: one volley per pattern, 7 (9 enraged) shots shared by the turret's two transformed muzzles.
    for (const [fireIndex, age, hp, side, count] of [
        [0, 3.4, max, 0, 7],
        [1, 4.6, max / 2 - 1, 1, 9],
    ] as const) {
        const h = await stage(0, (scene, run) => {
            run.phase = "boss";
            spawnBoss(scene, run, Kind.Gatebreaker, w(240), w(67), { hp, age, fireIndex });
            for (const pattern of [0, 1])
                spawnEnemy(
                    scene.world,
                    run,
                    Kind.GatebreakerTurret,
                    w(240) + TURRET_SOCKETS[pattern][0],
                    w(67) + TURRET_SOCKETS[pattern][1],
                    { pattern },
                );
        });
        try {
            h.tick();
            const [boss] = enemyRows(h.world, Kind.Gatebreaker),
                shots = freshShots(h.world);
            assert.equal(shots.length, count);
            const muzzles = TURRET_MUZZLES[side].map(([mx, my]) => [boss.x + mx, boss.y + my]);
            assert.ok(
                shots.every((s) => muzzles.some(([x, y]) => near(s.x, x) && near(s.y, y))),
                "every shot leaves one of the turret's muzzles",
            );
            assert.deepEqual(
                muzzles
                    .map(([x, y]) => shots.filter((s) => near(s.x, x) && near(s.y, y)).length)
                    .sort(),
                [Math.floor(count / 2), Math.ceil(count / 2)],
            );
            const enraged = hp < max / 2,
                expected = fan(
                    boss.targetAngle,
                    enraged ? 9 : 7,
                    ((enraged ? 96 : 72) * Math.PI) / 180,
                    w(58),
                );
            assert.deepEqual(
                shots.map((s) => [s.vx, s.vy]),
                expected.map((s) => [s.vx, s.vy]),
            );
            // The firing turret shows "firing", the other idle; both sit on their spec sockets, the right one flipped.
            const drawn = h.render(),
                sprite = rev01Sprite("gatebreakerTurret"),
                turrets = byTexture(drawn, "gatebreakerTurret");
            assert.equal(turrets.length, 2);
            for (const quad of turrets) {
                const right = isFlipped(quad),
                    slot = right ? 1 : 0;
                assert.equal(quad.layer, LAYER.enemyDetail, "turrets draw above the hull");
                assert.equal(frameOf(quad, sprite)!.name, slot === side ? "firing" : "idle");
                assert.deepEqual(socketPixel(quad, sprite, [0, 0]), [
                    Math.floor(boss.x) + TURRET_SOCKETS[slot][0],
                    Math.floor(boss.y) + TURRET_SOCKETS[slot][1],
                ]);
                // Each barrel's spec muzzle texel is drawn exactly where that volley's shots start (right instance: dx negated).
                for (const muzzle of specSocketList("gatebreakerTurret", "muzzles")) {
                    const [x, y] = addPoint(
                        [Math.floor(boss.x), Math.floor(boss.y)],
                        addPoint(TURRET_SOCKETS[slot], placeSocket(muzzle, { flipX: right })),
                    );
                    assert.deepEqual(socketPixel(quad, sprite, muzzle), [x, y]);
                    if (slot === side)
                        assert.ok(
                            shots.some((s) => Math.floor(s.x) === x && Math.floor(s.y) === y),
                        );
                }
            }
            const [hullQuad] = byTexture(drawn, "gatebreaker");
            assert.equal(
                frameOf(hullQuad, rev01Sprite("gatebreaker"))!.name,
                enraged ? "wreck-1" : "idle",
            );
        } finally {
            h.game.dispose();
        }
    }
    // A destroyed turret shows "down" in its well and its fan is gone; the core cue in a wreck stage draws the core box over it.
    const h = await stage(0, (scene, run) => {
        run.phase = "boss";
        // Pattern 6 (ring) is due at 8.5 s: 0.3 s before it the core cue (cue 3) is up.
        spawnBoss(scene, run, Kind.Gatebreaker, w(240), w(67), {
            hp: max / 3,
            age: 2.5 + 8.5 - 0.3,
            fireIndex: 6,
        });
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, w(240), w(67), { pattern: 1 });
    });
    try {
        h.tick();
        const drawn = h.render(),
            turret = rev01Sprite("gatebreakerTurret");
        const names = byTexture(drawn, "gatebreakerTurret")
            .map((quad) => `${isFlipped(quad) ? "R" : "L"}:${frameOf(quad, turret)!.name}`)
            .sort();
        assert.deepEqual(names, ["L:down", "R:idle"]);
        const hull = byTexture(drawn, "gatebreaker").map(
            (quad) =>
                frameOf(quad, rev01Sprite("gatebreaker"))?.name ?? `crop:${quad.d[8].toFixed(6)}`,
        );
        assert.equal(hull[0], "wreck-2");
        assert.equal(hull.length, 2, "ring cue (cue 3) adds the telegraph core box over the wreck");
    } finally {
        h.game.dispose();
    }
});

test("Starfall Engine: phase/surge hull frames at the HP thresholds, emitter charge/firing/down, flipped emitter muzzles", async () => {
    const max = enemySpec(Kind.StarfallEngine).hp;
    assert.equal(engineHullFrame(max, 0), "phase-1");
    assert.equal(
        engineHullFrame(max, 1),
        "phase-1",
        "emitter fan cues use the emitter, not the core",
    );
    assert.equal(engineHullFrame(max, 2), "surge-1");
    assert.equal(engineHullFrame((max * 2) / 3, 0), "phase-1");
    assert.equal(engineHullFrame((max * 2) / 3 - 1e-9, 2), "surge-2");
    assert.equal(engineHullFrame(max / 3 - 1e-9, 0), "phase-3");
    assert.equal(engineEmitter(0, true, { cue: 1, fireIndex: 2, time: 2.5 }), "charge");
    assert.equal(engineEmitter(1, true, { cue: 1, fireIndex: 2, time: 2.5 }), "idle");
    assert.equal(engineEmitter(1, true, { cue: 0, fireIndex: 2, time: 1.8 + 0.05 }), "firing");
    assert.equal(engineEmitter(1, false, { cue: 1, fireIndex: 1, time: 1.5 }), "down");
    for (const [fireIndex, age, side] of [
        [0, 3.5, 0],
        [1, 4.5, 1],
    ] as const) {
        const h = await stage(2, (scene, run) => {
            run.phase = "boss";
            spawnBoss(scene, run, Kind.StarfallEngine, w(240), w(65), { age, fireIndex });
            for (const pattern of [0, 1])
                spawnEnemy(scene.world, run, Kind.EngineEmitter, w(240), w(65), {
                    hp: 55,
                    pattern,
                });
        });
        try {
            h.tick();
            const [boss] = enemyRows(h.world, Kind.StarfallEngine),
                shots = freshShots(h.world);
            assert.equal(shots.length, 7, "one 7-shot fan, unchanged");
            const [mx, my] = EMITTER_MUZZLES[side];
            assert.ok(shots.every((s) => near(s.x, boss.x + mx) && near(s.y, boss.y + my)));
            const drawn = h.render(),
                sprite = rev01Sprite("starfallEmitter"),
                emitters = byTexture(drawn, "starfallEmitter");
            assert.equal(emitters.length, 2);
            for (const quad of emitters) {
                const slot = isFlipped(quad) ? 1 : 0;
                assert.equal(frameOf(quad, sprite)!.name, slot === side ? "firing" : "idle");
                assert.deepEqual(
                    socketPixel(quad, sprite, specSocket("starfallEmitter", "muzzle")),
                    [
                        Math.floor(boss.x) + EMITTER_MUZZLES[slot][0],
                        Math.floor(boss.y) + EMITTER_MUZZLES[slot][1],
                    ],
                );
            }
            assert.equal(
                frameOf(byTexture(drawn, "starfallEngine")[0], rev01Sprite("starfallEngine"))!.name,
                "phase-1",
            );
        } finally {
            h.game.dispose();
        }
    }
});

test("defeat: native defeat frames tinted at the death position with every part down, removed after the cascade", async () => {
    const cases = [
        [0, "gatebreaker", "wreck-3", "gatebreakerTurret"],
        [1, "kilnHead", "defeat", undefined],
        [2, "starfallEngine", "defeat", "starfallEmitter"],
    ] as const;
    for (const [index, id, frame, part] of cases) {
        const h = await stage(index, (_scene, run) => {
            run.phase = "clear";
            run.finishTimer = 0.5;
            run.bossDeathX = 301.4;
            run.bossDeathY = 90.7;
        });
        try {
            let drawn = h.render();
            const [hull] = byTexture(drawn, id),
                sprite = rev01Sprite(id);
            assert.equal(frameOf(hull, sprite)!.name, frame);
            assert.equal(rgb(hull), DEFEAT.tint);
            assert.deepEqual(socketPixel(hull, sprite, [0, 0]), [301, 90]);
            if (id === "kilnHead")
                assert.ok(
                    near(hull.d[2], 0, 1e-9) && near(hull.d[3], -65, 1e-9),
                    "rotated -90 degrees",
                );
            if (part) {
                const parts = byTexture(drawn, part);
                assert.deepEqual(
                    parts.map((quad) => [frameOf(quad, rev01Sprite(part))!.name, isFlipped(quad)]),
                    [
                        ["down", false],
                        ["down", true],
                    ],
                );
            }
            h.run.finishTimer = DEFEAT.seconds;
            drawn = h.render();
            assert.equal(byTexture(drawn, id).length, 0);
        } finally {
            h.game.dispose();
        }
    }
});

test("Kiln head path is unchanged and joints never come closer than 34 px over a full motion cycle; colliders use the capped chain", async () => {
    const cycle = Math.ceil((2 * Math.PI) / 0.1 / dt) + 200;
    const h = await stage(1, (scene, run) => {
        run.phase = "boss";
        spawnEnemy(scene.world, run, Kind.KilnHead, w(240), w(-40), { hp: 1e9 });
        for (let pattern = 0; pattern < 3; pattern++)
            spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), { hp: 1e9, pattern });
    });
    try {
        let age = 0,
            legacyY = -40,
            capped = 0,
            maxShift = 0,
            compressedTicks = 0,
            idleTicks = 0;
        for (let tick = 1; tick <= cycle; tick++) {
            h.tick();
            age += dt;
            legacyY = Math.min(65, legacyY + dt * 40);
            const time = Math.max(0, age - 2.7),
                [head] = enemyRows(h.world, Kind.KilnHead);
            assert.ok(
                near(head.x, w(275 + Math.sin(time * 0.5) * 90), 1e-7) &&
                    near(head.y, w(legacyY), 1e-7),
                `head path tick ${tick}`,
            );
            const segments = enemyRows(h.world, Kind.KilnSegment).sort(
                (a, b) => a.pattern - b.pattern,
            );
            let ahead = head.x;
            segments.forEach((segment, section) => {
                const [x, y] = kilnSectionPath(time, head.y, section);
                // Legacy section path x 4/3 (bob and lag unchanged); x is only ever pulled back, to exactly 34 px behind the joint ahead.
                assert.ok(
                    near(
                        x,
                        w(
                            275 +
                                Math.sin((time - (section + 1) * 0.3) * 0.5) * 90 -
                                (section + 1) * 34,
                        ),
                        1e-7,
                    ),
                );
                assert.ok(
                    near(segment.y, y, 1e-9) &&
                        near(
                            segment.y,
                            w(legacyY + 6 + Math.sin(time * 1.2 - section * 0.8) * 12),
                            1e-7,
                        ),
                    `section ${section} y tick ${tick}`,
                );
                assert.ok(
                    ahead - segment.x >= KILN_MIN_JOINT_SPACING - 1e-9,
                    `spacing tick ${tick} section ${section}: ${ahead - segment.x}`,
                );
                if (near(segment.x, x, 1e-12))
                    assert.ok(ahead - x >= KILN_MIN_JOINT_SPACING - 1e-9);
                else {
                    assert.ok(
                        segment.x < x && near(ahead - segment.x, KILN_MIN_JOINT_SPACING, 1e-9),
                    );
                    capped++;
                    maxShift = Math.max(maxShift, x - segment.x);
                }
                ahead = segment.x;
            });
            if (tick % 30 === 0) {
                const kiln = h.render().filter((quad) => quad.texture === "rev01-kilnSegment"),
                    names = kiln.map((quad) => frameOf(quad, rev01Sprite("kilnSegment"))!.name);
                compressedTicks += names.filter((name) => name === "compressed").length;
                idleTicks += names.filter((name) => name === "idle").length;
            }
        }
        assert.ok(
            capped > 1000 && maxShift > 15,
            `cap engaged (${capped} joint-ticks, max ${maxShift.toFixed(2)} px)`,
        );
        assert.ok(
            compressedTicks > 0 && idleTicks > 0,
            "segments show compressed while links turn and idle otherwise",
        );
        // The pure chain helper is the same rule.
        assert.deepEqual(
            kilnChain(0, 80).map(([x]) => x),
            [0, 1, 2].map((section) =>
                Math.min(
                    kilnSectionPath(0, 80, section)[0],
                    kilnHeadX(0) - KILN_MIN_JOINT_SPACING * (section + 1),
                ),
            ),
        );
    } finally {
        h.game.dispose();
    }

    // A collider follows the capped joint: find a tick where section 2 sits > 17 px behind its original path
    // (segment radius 14 + bolt radius 2.67 < 17), then put a resting player bolt on either point for that tick.
    let age = 0,
        target = 0,
        capped: Point = [0, 0],
        original: Point = [0, 0];
    for (let tick = 1, y = w(-40); tick < 5000 && !target; tick++) {
        age += dt;
        y = Math.min(w(65), y + dt * w(40));
        const time = Math.max(0, age - 2.7),
            joint = kilnChain(time, y)[2],
            path = kilnSectionPath(time, y, 2);
        if (tick > 200 && path[0] - joint[0] > 17) {
            target = tick;
            capped = joint;
            original = path;
        }
    }
    assert.ok(target > 0);
    for (const [at, hit] of [
        [capped, true],
        [original, false],
    ] as const) {
        const k = await stage(1, (scene, run) => {
            run.phase = "boss";
            spawnEnemy(scene.world, run, Kind.KilnHead, w(240), w(-40), { hp: 1e9 });
            for (let pattern = 0; pattern < 3; pattern++)
                spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), { hp: 55, pattern });
        });
        try {
            // Spawned at the start of tick target-1, the bolt is published at its commit and collides on tick `target`.
            k.tick(target - 2);
            k.queue.push((scene) => {
                spawnBullet(scene.world, at[0], at[1], 0, 0, 0);
            });
            k.tick(2);
            const section = enemyRows(k.world, Kind.KilnSegment).find((s) => s.pattern === 2)!;
            assert.ok(
                near(section.x, capped[0], 1e-6),
                "section 2 is on the capped joint on that tick",
            );
            assert.equal(
                section.hp,
                hit ? 54 : 55,
                hit
                    ? "a shot at the capped joint hits the section"
                    : "nothing collides on the uncapped path",
            );
        } finally {
            k.game.dispose();
        }
    }
});

test("Kiln render: -90 degree head/sections, head above sections, links from rotated couplings, husks without collision or fire", async () => {
    // compressed rule: static chain idle; a link turning faster than the threshold compresses both of its sections.
    const still: Point[] = [
        [300, 80],
        [266, 90],
        [232, 95],
        [198, 92],
    ];
    assert.deepEqual(kilnCompressed(still, still, dt), [false, false, false]);
    const turned = still.map(
        ([x, y], i) => (i === 2 ? [x, y + 34 * KILN_COMPRESS_RATE * dt * 2] : [x, y]) as Point,
    );
    assert.deepEqual(
        kilnCompressed(still, turned, dt),
        [true, true, true],
        "joint 2 moving turns links 1 and 2: every section touches one",
    );
    const tail = still.map(
        ([x, y], i) => (i === 3 ? [x, y + 34 * KILN_COMPRESS_RATE * dt * 2] : [x, y]) as Point,
    );
    assert.deepEqual(
        kilnCompressed(still, tail, dt),
        [false, true, true],
        "only the last link turns",
    );
    const slow = still.map(
        ([x, y], i) => (i === 3 ? [x, y + 34 * KILN_COMPRESS_RATE * dt * 0.5] : [x, y]) as Point,
    );
    assert.deepEqual(
        kilnCompressed(still, slow, dt),
        [false, false, false],
        "below the turn-rate threshold",
    );
    assert.equal(kilnHeadFrame(540, 0.1, false), "cut-1");
    assert.equal(kilnHeadFrame(540, 0.17, false), "cut-2");
    assert.equal(kilnHeadFrame(269, 0.25, false), "damaged-0");
    assert.equal(kilnHeadFrame(269, 0.1, true), "damaged-0");
    assert.equal(kilnHeadFrame(540, 0.1, true), "cut-0");

    const h = await stage(1, (scene, run) => {
        run.phase = "boss";
        spawnEnemy(scene.world, run, Kind.KilnHead, w(275), w(65), { hp: 540 });
        for (let pattern = 0; pattern < 3; pattern++)
            spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), {
                hp: pattern === 1 ? 1 : 55,
                pattern,
            });
    });
    try {
        h.tick(2);
        // Destroy section 1 with a stationary shot on its joint.
        const section1 = enemyRows(h.world, Kind.KilnSegment).find((s) => s.pattern === 1)!;
        h.queue.push((scene) => {
            spawnBullet(scene.world, section1.x, section1.y, 0, 0, 0);
        });
        h.tick(2);
        assert.equal(
            enemyRows(h.world, Kind.KilnSegment).length,
            2,
            "the destroyed section's entity is gone (no collision, no entity cap)",
        );
        h.tick(4);
        // The section kill shakes the camera; settle it so quads sit at world pixels.
        h.run.shake = 0;
        h.tick();
        const [head] = enemyRows(h.world, Kind.KilnHead),
            time = Math.max(0, head.age - 2.7),
            joints = kilnChain(time, head.y);
        const drawn = h.render(),
            headSprite = rev01Sprite("kilnHead"),
            segSprite = rev01Sprite("kilnSegment");
        const [headQuad] = byTexture(drawn, "kilnHead"),
            segments = byTexture(drawn, "kilnSegment");
        assert.equal(segments.length, 3, "two live sections and one husk");
        assert.ok(
            near(headQuad.d[2], 0, 1e-9) && near(headQuad.d[3], -65, 1e-9),
            "head canvas +x runs screen up",
        );
        assert.ok(segments.every((quad) => near(quad.d[2], 0, 1e-9) && near(quad.d[3], -41, 1e-9)));
        assert.ok(
            headQuad.layer > segments[0].layer &&
                segments.every((quad) => quad.layer === LAYER.enemy),
            "head above sections",
        );
        const hx = Math.floor(head.x),
            hy = Math.floor(head.y);
        assert.deepEqual(socketPixel(headQuad, headSprite, specSocket("kilnHead", "drill")), [
            hx + 21,
            hy,
        ]);
        assert.deepEqual(
            socketPixel(headQuad, headSprite, specSocket("kilnHead", "rearCoupling")),
            [hx - 23, hy],
        );
        const bySection = joints.map(([x, y]) =>
            segments.find(
                (quad) =>
                    near(socketPixel(quad, segSprite, [0, 0])[0], Math.floor(x)) &&
                    near(socketPixel(quad, segSprite, [0, 0])[1], Math.floor(y)),
            )!,
        );
        assert.ok(
            bySection.every(Boolean),
            "every section (husk included) sits on its capped chain joint",
        );
        assert.equal(frameOf(bySection[1], segSprite)!.name, "destroyed");
        assert.ok(
            bySection
                .filter((_, i) => i !== 1)
                .every((quad) => ["idle", "compressed"].includes(frameOf(quad, segSprite)!.name)),
        );
        // Links: three code links (through the husk), each from a coupling pixel centre to the next coupling pixel centre.
        const links = drawn.filter((quad) => quad.layer === LAYER.bossLink && !quad.texture);
        assert.equal(links.length, 6, "3 links x (band + centre line)");
        const ends = (quad: Quad): Point[] => {
            const [x0, y0, ax, ay, bx, by] = quad.d;
            return [
                [x0 + bx / 2, y0 + by / 2],
                [x0 + ax + bx / 2, y0 + ay + by / 2],
            ];
        };
        const couplings: Point[] = [[hx - 23 + 0.5, hy + 0.5]];
        bySection.forEach((quad) => {
            const name = frameOf(quad, segSprite)!.name,
                [px, py] = socketPixel(quad, segSprite, [0, 0]);
            for (const socket of ["frontCoupling", "rearCoupling"]) {
                const [dx, dy] = placeSocket(specSocket("kilnSegment", socket, name), {
                    rotation: -90,
                });
                assert.deepEqual(
                    socketPixel(quad, segSprite, specSocket("kilnSegment", socket, name)),
                    [px + dx, py + dy],
                );
                couplings.push([px + dx + 0.5, py + dy + 0.5]);
            }
        });
        for (let link = 0; link < 3; link++) {
            const from = couplings[link * 2],
                to = couplings[link * 2 + 1],
                band = links[link * 2],
                [a, b] = ends(band);
            // Float32 frame data: ~3e-5 px resolution at x ~ 400.
            const matches = (p: Point, q: Point) =>
                near(p[0], q[0], 1e-3) && near(p[1], q[1], 1e-3);
            assert.ok(
                (matches(a, to) && matches(b, from)) || (matches(a, from) && matches(b, to)),
                `link ${link} joins coupling pixels`,
            );
        }
        // The husk adds no fan to the ring volley: 10 core shots + 2 per surviving section.
        h.queue.push((scene) =>
            scene.world.query(Enemy).eachChunk(({ views, count }) => {
                for (let i = 0; i < count; i++)
                    if (views.enemy.kind[i] === Kind.KilnHead) {
                        views.enemy.age[i] = 7.5;
                        views.enemy.fireIndex[i] = 3;
                    }
            }),
        );
        h.tick();
        assert.equal(freshShots(h.world).length, 14);
        // A resting shot on the husk survives (husks have no collider); the joint moves < 2 px before the shot is live.
        const [now] = enemyRows(h.world, Kind.KilnHead),
            husk = kilnChain(Math.max(0, now.age - 2.7), now.y)[1];
        h.queue.push((scene) => {
            spawnBullet(scene.world, husk[0], husk[1], 0, 0, 0);
        });
        h.tick(2);
        let friendly = 0;
        h.world.query(Bullet).eachChunk(({ views, count }) => {
            for (let i = 0; i < count; i++)
                if (!views.bullet.team[i] && views.bullet.active[i]) friendly++;
        });
        assert.equal(friendly, 1, "the husk does not absorb the shot");
    } finally {
        h.game.dispose();
    }
});

for (const trigger of ["section destruction", "Nova"] as const)
    test(`Kiln husks and links stay attached at every frozen alpha after ${trigger}`, async () => {
        for (const reduced of [false, true]) {
            const h = await stage(
                1,
                (scene, run) => {
                    run.phase = "boss";
                    spawnEnemy(scene.world, run, Kind.KilnHead, w(275), w(65), { hp: 540 });
                    for (let pattern = 0; pattern < 3; pattern++)
                        spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), {
                            hp: pattern === 1 ? 1 : 55,
                            pattern,
                        });
                },
                reduced,
            );
            try {
                h.tick(600);
                const [before] = enemyRows(h.world, Kind.KilnHead);
                const section = enemyRows(h.world, Kind.KilnSegment).find((s) => s.pattern === 1)!;
                h.queue.push((scene) => {
                    spawnBullet(scene.world, section.x, section.y, 0, 0, 0);
                });
                h.tick(2); // Published on tick 601; actual production collision kills section 1 on tick 602.
                assert.equal(enemyRows(h.world, Kind.KilnSegment).length, 2);
                assert.equal(
                    h.game.scenes[0].freezeRemaining,
                    3,
                    "section destruction requests the real hit-stop",
                );
                assert.ok(
                    enemyRows(h.world, Kind.KilnHead)[0].x < before.x,
                    "destruction occurs on a moving interval",
                );
                if (trigger === "Nova") {
                    h.tick(3); // Finish the destruction freeze, then advance the surviving chain and its husk.
                    h.tick(20);
                    const oldX = enemyRows(h.world, Kind.KilnHead)[0].x;
                    h.run.nova = 1;
                    h.game.tick({ ...emptyInput(), pressed: ["KeyB"] });
                    assert.equal(
                        h.run.nova,
                        0,
                        "normal Nova input triggers production player code",
                    );
                    assert.equal(h.game.scenes[0].freezeRemaining, 5);
                    assert.ok(
                        enemyRows(h.world, Kind.KilnHead)[0].x < oldX,
                        "Nova also freezes a moving interval",
                    );
                }
                const age = enemyRows(h.world, Kind.KilnHead)[0].age;
                const checkFrozen = () => {
                    const drawn = [0, 0.5, 1].map((alpha) => h.render(alpha));
                    const geometry = (quads: Quad[]) =>
                        quads
                            .filter(
                                (q) =>
                                    q.texture === "rev01-kilnHead" ||
                                    q.texture === "rev01-kilnSegment" ||
                                    q.layer === LAYER.bossLink,
                            )
                            .map((q) => ({
                                texture: q.texture,
                                layer: q.layer,
                                d: q.d.slice(0, 6),
                            }));
                    assert.deepEqual(
                        geometry(drawn[0]),
                        geometry(drawn[1]),
                        "all live/husk hulls and link vertices fixed at alpha 0/0.5",
                    );
                    assert.deepEqual(
                        geometry(drawn[0]),
                        geometry(drawn[2]),
                        "all live/husk hulls and link vertices fixed at alpha 0/1",
                    );
                    for (const quads of drawn) {
                        const head = byTexture(quads, "kilnHead")[0],
                            segments = byTexture(quads, "kilnSegment");
                        const headSprite = rev01Sprite("kilnHead"),
                            segmentSprite = rev01Sprite("kilnSegment");
                        assert.equal(segments.length, 3);
                        assert.deepEqual(
                            segments.map((q) => frameOf(q, segmentSprite)!.name === "destroyed"),
                            [false, true, false],
                            "middle section remains a visual husk",
                        );
                        const pivots = [
                            socketPixel(head, headSprite, [0, 0]),
                            ...segments.map((q) => socketPixel(q, segmentSprite, [0, 0])),
                        ];
                        for (let i = 1; i < pivots.length; i++)
                            assert.ok(
                                pivots[i - 1][0] - pivots[i][0] >= KILN_MIN_JOINT_SPACING,
                                `frozen spacing at joint ${i}`,
                            );
                        assert.equal(
                            pivots[1][0] - pivots[2][0],
                            KILN_MIN_JOINT_SPACING,
                            "regression exercises the capped live-to-husk joint",
                        );
                        const links = quads.filter((q) => q.layer === LAYER.bossLink);
                        assert.equal(links.length, 6);
                        let rear = socketPixel(
                            head,
                            headSprite,
                            specSocket("kilnHead", "rearCoupling"),
                        );
                        segments.forEach((part, index) => {
                            const name = frameOf(part, segmentSprite)!.name;
                            const front = socketPixel(
                                part,
                                segmentSprite,
                                specSocket("kilnSegment", "frontCoupling", name),
                            );
                            for (const link of links.slice(index * 2, index * 2 + 2)) {
                                const [x, y, ax, ay, bx, by] = link.d;
                                const ends: Point[] = [
                                    [x + bx / 2, y + by / 2],
                                    [x + ax + bx / 2, y + ay + by / 2],
                                ];
                                for (const socket of [rear, front])
                                    assert.ok(
                                        ends.some(
                                            ([ex, ey]) =>
                                                near(ex, socket[0] + 0.5, 1e-3) &&
                                                near(ey, socket[1] + 0.5, 1e-3),
                                        ),
                                        "band and core terminate on the drawn coupling centres",
                                    );
                            }
                            rear = socketPixel(
                                part,
                                segmentSprite,
                                specSocket("kilnSegment", "rearCoupling", name),
                            );
                        });
                    }
                    assert.equal(
                        enemyRows(h.world, Kind.KilnHead)[0].age,
                        age,
                        "ordinary simulation stays frozen",
                    );
                };
                checkFrozen(); // Freeze starts at the end of the event tick; check that boundary too.
                let frozenTicks = 0;
                while (h.game.scenes[0].freezeRemaining > 0) {
                    h.tick();
                    checkFrozen();
                    frozenTicks++;
                }
                assert.equal(
                    frozenTicks,
                    trigger === "Nova" ? 5 : 3,
                    "every hit-stop tick including its final boundary checked",
                );
                h.tick();
                assert.ok(
                    enemyRows(h.world, Kind.KilnHead)[0].age > age,
                    "ordinary motion resumes after hit-stop",
                );
            } finally {
                h.game.dispose();
            }
        }
    });

test("unchanged attack timing and counts: per-kind shot ticks and boss volley sizes over full pattern cycles", async () => {
    const shotTicks = async (stageIndex: number, setup: Action, ticks: number) => {
        const h = await stage(stageIndex, setup),
            result: [number, number][] = [];
        try {
            for (let tick = 1; tick <= ticks; tick++) {
                h.tick();
                const n = freshShots(h.world).length;
                if (n) result.push([tick, n]);
            }
        } finally {
            h.game.dispose();
        }
        return result;
    };
    // Gunship cadence (1.9 s, then 2.4 s), 5 shots each.
    const gunship = await shotTicks(
        0,
        (scene, run) => spawnEnemy(scene.world, run, Kind.Gunship, w(130), w(-25), { hp: 1e9 }),
        600,
    );
    const expected: [number, number][] = [];
    for (let tick = 1, cooldown = 1.9; tick <= 600; tick++) {
        cooldown -= dt;
        if (cooldown <= 0) {
            expected.push([tick, 5]);
            cooldown = GUNSHIP_TIMING.reload;
        }
    }
    assert.deepEqual(gunship, expected);
    // Kiln with all sections alive: fans 7 (9 in phase 2), rings 10 + 3 x 2, curtains; same ticks as the time table.
    const kiln = await shotTicks(
        1,
        (scene, run) => {
            run.phase = "boss";
            spawnEnemy(scene.world, run, Kind.KilnHead, w(240), w(-40), { hp: 1e9 });
            for (let pattern = 0; pattern < 3; pattern++)
                spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), {
                    hp: 1e9,
                    pattern,
                });
        },
        1700,
    );
    const times = [0.8, 2, 3.2, 4.8, 6, 8.2, 9.3, 10.4],
        due: number[] = [];
    for (let tick = 1, age = 0, fireIndex = 0; tick <= 1700; tick++) {
        age += dt;
        if (Math.max(0, age - 2.7) >= Math.floor(fireIndex / 8) * 12 + times[fireIndex % 8]) {
            due.push(tick);
            fireIndex++;
        }
    }
    assert.deepEqual(
        kiln.map(([tick]) => tick),
        due,
    );
    assert.deepEqual(
        kiln.slice(0, 5).map(([, n]) => n),
        [7, 7, 7, 16, 16],
    );
});
