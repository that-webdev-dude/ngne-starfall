import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Game, emptyInput, type SceneSetup, type WorldAccess } from "@ngne/core";
import { Beam, Bullet, Enemy, Pose } from "../src/components/combat.ts";
import { COMBAT } from "../src/config/encounters.ts";
import { Kind, enemySpec } from "../src/config/enemies.ts";
import { REV01_GAMEPLAY } from "../src/config/rev01-gameplay.ts";
import { STAGES } from "../src/config/stages.ts";
import { fromLegacy as w } from "../src/config/view.ts";
import { spawnBullet, spawnEnemy } from "../src/entities/combat.ts";
import { stageScene } from "../src/scenes/stage.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import type { Progress, ProgressCommand, RunState, Session } from "../src/world/session.ts";
import spec from "../src/assets/spec.json" with { type: "json" };

/**
 * Timing evidence for the 4/3 migration: schedules, counts, HP, scores and cadences are pinned to their
 * pre-migration values, and simulated trajectories equal the legacy (480x270) formulas x 4/3 tick by tick,
 * so every position-driven event (entry, crossing, exit) happens on the same tick as before. Real interceptor rows hit
 * the exit boundary exactly; their exit ticks are pinned against main's arithmetic (INTERCEPTOR_EXIT_TOLERANCE).
 */
const dt = 1 / 60;

// Pre-migration tables: at:kind:count:legacy side (sweeper side is a direction flag).
const SCHEDULES: Record<string, string[]> = {
    "orbital-breakwater": [
        "2:interceptor:4:150:quiet",
        "8:interceptor:5:330:quiet",
        "13:interceptor:4:160",
        "15:gunship:1:130",
        "18:interceptor:4:320",
        "23:interceptor:4:160",
        "23:gunship:1:350",
        "28:sweeper:2:flag0",
        "29:interceptor:4:320",
        "35:interceptor:4:160",
        "36:sweeper:2:flag1",
        "41:interceptor:4:320",
        "44:gunship:1:130",
        "46:interceptor:4:160",
        "48:gunship:1:350",
        "50:interceptor:4:320",
        "52:repair:1:240",
        "55:interceptor:4:160",
        "60:interceptor:6:320",
        "60:sweeper:2:flag0",
        "64:gunship:1:130",
        "65:interceptor:6:160",
        "66:sweeper:2:flag1",
        "70:interceptor:6:320",
        "72:sweeper:2:flag0",
        "76:interceptor:6:160",
        "77:gunship:1:350",
        "79:sweeper:2:flag1",
        "80:gunship:1:130",
        "81:interceptor:6:320",
    ],
    "furnace-belt": [
        "2:interceptor:4:160",
        "8:minelayer:1:145",
        "9:interceptor:4:320",
        "13:sweeper:2:flag0",
        "16:interceptor:5:160",
        "23:interceptor:5:320",
        "26:gunship:1:165",
        "29:sweeper:2:flag1",
        "30:interceptor:5:160",
        "30:minelayer:1:335",
        "34:warden:1:345",
        "37:interceptor:5:320",
        "44:interceptor:5:160",
        "45:sweeper:2:flag0",
        "51:interceptor:5:320",
        "52:minelayer:1:145",
        "55:repair:1:240",
        "56:gunship:1:165",
        "58:interceptor:5:160",
        "61:sweeper:2:flag1",
        "64:warden:1:135",
        "65:interceptor:5:320",
        "72:interceptor:5:160",
        "74:minelayer:1:335",
        "77:sweeper:2:flag0",
        "78:gunship:1:165",
        "79:interceptor:5:320",
        "86:interceptor:5:160",
    ],
    "midnight-citadel": [
        "2:interceptor:4:160",
        "8:interceptor:4:320",
        "8:minelayer:1:145",
        "13:sweeper:2:flag0",
        "14:interceptor:5:160",
        "17:warden:1:345",
        "20:interceptor:5:320",
        "26:interceptor:5:160",
        "27:minelayer:1:335",
        "28:gunship:1:165",
        "29:sweeper:2:flag1",
        "32:interceptor:5:320",
        "38:interceptor:5:160",
        "39:warden:1:135",
        "44:interceptor:5:320",
        "45:sweeper:2:flag0",
        "46:minelayer:1:145",
        "50:interceptor:5:160",
        "56:interceptor:5:320",
        "58:gunship:1:165",
        "60:repair:1:240",
        "61:sweeper:2:flag1",
        "61:warden:1:345",
        "62:interceptor:5:160",
        "65:minelayer:1:335",
        "68:interceptor:5:320",
        "74:interceptor:5:160",
        "77:sweeper:2:flag0",
        "80:interceptor:5:320",
        "83:warden:1:135",
        "83:gunship:1:315",
        "84:minelayer:1:145",
        "86:interceptor:5:160",
        "92:interceptor:5:320",
        "93:sweeper:2:flag1",
        "98:interceptor:5:160",
    ],
};

test("encounter schedules keep their times, kinds and counts; only spawn x moves, by exactly 4/3", () => {
    for (const stage of STAGES) {
        const expected = SCHEDULES[stage.id].map((row) => row.split(":"));
        assert.equal(stage.encounters.length, expected.length, stage.id);
        stage.encounters.forEach((event, index) => {
            const [at, kind, count, side, quiet] = expected[index];
            assert.deepEqual(
                [event.at, event.kind, event.count, Boolean(event.quiet)],
                [Number(at), kind, Number(count), quiet === "quiet"],
                `${stage.id} #${index}`,
            );
            assert.equal(
                event.side,
                side.startsWith("flag") ? Number(side.slice(4)) : w(Number(side)),
                `${stage.id} #${index} side`,
            );
        });
    }
    assert.deepEqual(
        STAGES.map((stage) => [stage.bossAt, stage.boss.hp, stage.boss.clearBonus]),
        [
            [90, 480, 3000],
            [100, 540, 5000],
            [110, 600, 10000],
        ],
    );
});

test("HP, cooldowns, scores, caps and clocks are unchanged; radii and lanes are the spec's explicit values", () => {
    const stats = [
        [3, 1.6, 100],
        [12, 1.9, 300],
        [8, 0.7, 200],
        [480, 0.7, 5000],
        [35, 0.7, 650],
        [14, 0.7, 350],
        [17, 0.7, 400],
        [2, 0.7, 50],
        [540, 0.7, 6500],
        [55, 0.7, 800],
        [600, 0.7, 10000],
        [55, 0.7, 1000],
    ];
    const names = [
        "Interceptor",
        "Gunship",
        "Sweeper",
        "Gatebreaker",
        "GatebreakerTurret",
        "Minelayer",
        "Warden",
        "Mine",
        "KilnHead",
        "KilnSegment",
        "StarfallEngine",
        "EngineEmitter",
    ] as const;
    names.forEach((name, kind) => {
        const entry = enemySpec(kind);
        assert.deepEqual([entry.hp, entry.cooldown, entry.score], stats[kind], name);
        assert.equal(entry.radius, spec.gameplay.enemyRadius[name], `${name} radius from spec`);
    });
    assert.deepEqual(
        [
            COMBAT.enemyCap,
            COMBAT.bulletCap,
            COMBAT.novaSeconds,
            COMBAT.chainSeconds,
            COMBAT.maxChain,
        ],
        [18, 180, 15, 2, 8],
    );
    assert.deepEqual(
        [COMBAT.playerRadius, COMBAT.hostileBulletRadius, COMBAT.playerBulletRadius],
        [spec.gameplay.playerRadius, spec.gameplay.hostileBulletRadius, w(2)],
    );
    assert.deepEqual(
        [REV01_GAMEPLAY.beamWidth.starfallEngine, REV01_GAMEPLAY.beamWidth.warden],
        [15, 13],
    );
    assert.equal(enemySpec(Kind.Mine).radius, 6);
});

async function harness(
    stageIndex: number,
    setup: (scene: SceneSetup<Progress, ProgressCommand>, run: RunState) => void,
) {
    const session: Session = {
        settings: { music: 0, effects: 0, muted: true, reducedMotion: false },
        screen: "title",
        best: 0,
        ready: true,
    };
    const sound = new Proxy({}, { get: () => () => {} }) as CombatSound;
    const game = new Game<Progress, ProgressCommand>({
        seed: "TIMING",
        state: { best: 0, runs: 0 },
        transition: (state) => state,
    });
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
                    actual.setup(scene);
                    world = scene.world;
                    session.run!.waveIndex = STAGES[stageIndex].encounters.length;
                    session.run!.invulnerable = 1e9;
                    setup(scene, session.run!);
                },
            },
            { key: "timing" },
        ),
    );
    const pose = (kind: number) => {
        let found: [number, number] | undefined;
        world.query(Pose, Enemy).eachChunk(({ views, count }) => {
            for (let i = 0; i < count; i++)
                if (views.enemy.active[i] && views.enemy.kind[i] === kind)
                    found = [views.pose.x[i], views.pose.y[i]];
        });
        return found;
    };
    return {
        game,
        session,
        pose,
        get world() {
            return world;
        },
        tick: () => game.tick(emptyInput()),
    };
}

/** Legacy motion per tick (480x270 units): returns [x, y] after `age` was advanced, or undefined once despawned. */
type Legacy = (state: { x: number; y: number; age: number }) => [number, number] | undefined;
const LEGACY: {
    name: string;
    stage: number;
    kind: number;
    at: [number, number];
    ticks: number;
    step: Legacy;
    options?: { vx?: number; pattern?: number };
}[] = [
    // Off-grid start rows check per-tick positions away from ties; the real interceptor rows (exact-300 ties) are pinned below.
    {
        name: "interceptor",
        stage: 0,
        kind: Kind.Interceptor,
        at: [100, -22.25],
        ticks: 600,
        options: { pattern: 1 },
        step: (s) => {
            const y = s.y + dt * 40;
            return y > 300 ? undefined : [100 + Math.sin(s.age * 1.6) * 19, y];
        },
    },
    {
        name: "gunship",
        stage: 0,
        kind: Kind.Gunship,
        at: [130, -25],
        ticks: 900,
        step: (s) => {
            const y = s.y + dt * (s.y < 67 ? 28 : s.age > 12 ? 38 : 5);
            return y > 300 ? undefined : [130 + Math.sin(s.age * 0.8) * 24, y];
        },
    },
    {
        name: "sweeper",
        stage: 0,
        kind: Kind.Sweeper,
        at: [-25, 92],
        ticks: 600,
        options: { vx: 65 },
        step: (s) => {
            const x = s.x + 65 * dt;
            return x > 580 ? undefined : [x, s.y + Math.sin(s.age * 3) * dt * 8];
        },
    },
    {
        name: "minelayer",
        stage: 1,
        kind: Kind.Minelayer,
        at: [145, -20.25],
        ticks: 900,
        step: (s) => {
            const y = s.y + dt * (s.y < 65 ? 30 : s.age > 12 ? 45 : 2);
            return y > 295 ? undefined : [145 + Math.sin(s.age * 0.65) * 20, y];
        },
    },
    {
        name: "warden",
        stage: 1,
        kind: Kind.Warden,
        at: [345, -20.25],
        ticks: 900,
        step: (s) => {
            const y = s.y + dt * (s.y < 65 ? 30 : s.age > 12 ? 45 : 2);
            return y > 295 ? undefined : [345 + Math.sin(s.age * 0.65) * 9, y];
        },
    },
    {
        name: "Gatebreaker",
        stage: 0,
        kind: Kind.Gatebreaker,
        at: [240, -35],
        ticks: 600,
        step: (s) => [
            240 + Math.sin(Math.max(0, s.age - 2.5) * 0.55) * 75,
            Math.min(67, s.y + dt * 42),
        ],
    },
    {
        name: "Kiln head",
        stage: 1,
        kind: Kind.KilnHead,
        at: [240, -40],
        ticks: 600,
        step: (s) => [
            275 + Math.sin(Math.max(0, s.age - 2.7) * 0.5) * 90,
            Math.min(65, s.y + dt * 40),
        ],
    },
    {
        name: "Starfall Engine",
        stage: 2,
        kind: Kind.StarfallEngine,
        at: [240, -40],
        ticks: 600,
        step: (s) => [
            240 + Math.sin(Math.max(0, s.age - 2.7) * 0.4) * 65,
            Math.min(65, s.y + dt * 40),
        ],
    },
];

test("enemy and boss trajectories equal the legacy formulas x 4/3 on every tick, including entry caps and exits", async () => {
    for (const entry of LEGACY) {
        const h = await harness(entry.stage, (scene, run) => {
            if (
                entry.kind === Kind.Gatebreaker ||
                entry.kind === Kind.KilnHead ||
                entry.kind === Kind.StarfallEngine
            )
                run.phase = "boss";
            spawnEnemy(scene.world, run, entry.kind as Kind, w(entry.at[0]), w(entry.at[1]), {
                cooldown: 1e9,
                hp: 1e9,
                vx: entry.options?.vx === undefined ? undefined : w(entry.options.vx),
                pattern: entry.options?.pattern,
            });
        });
        try {
            const legacy = { x: entry.at[0], y: entry.at[1], age: 0 };
            let exitTick: number | undefined;
            for (let tick = 1; tick <= entry.ticks; tick++) {
                h.tick();
                let expected: [number, number] | undefined;
                if (exitTick === undefined) {
                    legacy.age += dt;
                    expected = entry.step(legacy);
                    if (expected) [legacy.x, legacy.y] = expected;
                    else exitTick = tick;
                }
                const actual = h.pose(entry.kind);
                if (!expected) {
                    assert.equal(
                        actual,
                        undefined,
                        `${entry.name} must despawn on tick ${exitTick}`,
                    );
                    continue;
                }
                assert.ok(actual, `${entry.name} alive on tick ${tick}`);
                assert.ok(
                    Math.abs(actual[0] - w(expected[0])) < 1e-7 &&
                        Math.abs(actual[1] - w(expected[1])) < 1e-7,
                    `${entry.name} tick ${tick}: ${actual} vs ${expected.map(w)}`,
                );
            }
        } finally {
            h.game.dispose();
        }
    }
});

test("real interceptor waves (4/5/6 ships) leave on main's exact ticks, including the exact-300 floating-point ties", async () => {
    // Main (480x270) arithmetic: spawn row -22 - |i - mid| * 14, y += dt * 40 per tick, removed on the first tick with y > 300.
    // 5-ship rows -22/-36/-50 land on 300 exactly; main's sum stays ~2e-13 below, so the tie is kept alive for one more tick.
    const mainExitTicks = (count: number) =>
        Array.from({ length: count }, (_, i) => {
            let y = -22 - Math.abs(i - (count - 1) / 2) * 14,
                tick = 0;
            do {
                tick++;
                y += dt * 40;
            } while (!(y > 300));
            return tick;
        });
    // Matches immutable main's stage scene (.test-output/integration/T1/fix-baseline-exit-ticks.json records removal tick = moves + 1).
    assert.deepEqual([4, 5, 6].map(mainExitTicks), [
        [515, 494, 494, 515],
        [526, 505, 484, 505, 526],
        [536, 515, 494, 494, 515, 536],
    ]);
    for (const [stage, count] of [
        [0, 4],
        [0, 5],
        [0, 6],
        [1, 5],
        [2, 5],
    ] as const) {
        const index = STAGES[stage].encounters.findIndex(
            (event) => event.kind === "interceptor" && event.count === count,
        );
        const event = STAGES[stage].encounters[index];
        const h = await harness(stage, (_scene, run) => {
            run.waveIndex = index;
            run.seconds = event.at;
        });
        try {
            const seen = new Map<number, { x: number; first: number; last: number }>();
            for (let tick = 1; tick <= 600; tick++) {
                h.tick();
                if (tick === 1) h.session.run!.waveIndex = STAGES[stage].encounters.length;
                h.world.query(Pose, Enemy).eachChunk(({ views, count: rows }) => {
                    for (let i = 0; i < rows; i++) {
                        if (!views.enemy.active[i] || views.enemy.kind[i] !== Kind.Interceptor)
                            continue;
                        const entry = seen.get(views.enemy.id[i]) ?? {
                            x: views.enemy.originX[i],
                            first: tick,
                            last: tick,
                        };
                        entry.last = tick;
                        seen.set(views.enemy.id[i], entry);
                    }
                });
            }
            const ships = [...seen.values()].sort((a, b) => a.x - b.x);
            assert.equal(ships.length, count, `${STAGES[stage].id} wave #${index}`);
            assert.ok(
                ships.every((ship) => ship.first === 1),
                "whole wave spawns on tick 1",
            );
            // The spawn tick does not move a ship, so the last alive tick equals its number of moves until removal.
            assert.deepEqual(
                ships.map((ship) => ship.last),
                mainExitTicks(count),
                `${STAGES[stage].id} wave #${index} exit ticks`,
            );
        } finally {
            h.game.dispose();
        }
    }
});

test("enemy fire cadence and boss pattern schedule are unchanged (tick lists from the untouched cooldown/time tables)", async () => {
    const shotTicks = async (
        stage: number,
        setup: (scene: SceneSetup<Progress, ProgressCommand>, run: RunState) => void,
        ticks: number,
    ) => {
        const h = await harness(stage, setup),
            result: number[] = [];
        try {
            for (let tick = 1; tick <= ticks; tick++) {
                h.tick();
                // Bullets published this tick have not been advanced yet (age 0).
                let fresh = 0;
                h.world.query(Bullet).eachChunk(({ views, count }) => {
                    for (let i = 0; i < count; i++)
                        if (
                            views.bullet.team[i] &&
                            views.bullet.active[i] &&
                            views.bullet.age[i] === 0
                        )
                            fresh++;
                });
                if (fresh > 0) result.push(tick);
            }
        } finally {
            h.game.dispose();
        }
        return result;
    };
    // Gunship: first volley when 1.9 s of cooldown runs out, then every 2.4 s.
    const gunship = await shotTicks(
        0,
        (scene, run) => spawnEnemy(scene.world, run, Kind.Gunship, w(130), w(-25), { hp: 1e9 }),
        600,
    );
    const expected: number[] = [];
    for (let tick = 1, cooldown = 1.9; tick <= 600; tick++) {
        cooldown -= dt;
        if (cooldown <= 0) {
            expected.push(tick);
            cooldown = 2.4;
        }
    }
    assert.deepEqual(gunship, expected);
    // Gatebreaker: pattern i fires when (age - 2.5) reaches cycle * 12 + times[i].
    const boss = await shotTicks(
        0,
        (scene, run) => {
            run.phase = "boss";
            spawnEnemy(scene.world, run, Kind.Gatebreaker, w(240), w(-35), { hp: 1e9 });
        },
        1500,
    );
    const times = [0.9, 2.1, 3.3, 4.6, 5.7, 6.8, 8.5, 10],
        due: number[] = [];
    let fireIndex = 0;
    for (let tick = 1, age = 0; tick <= 1500; tick++) {
        age += dt;
        const next = Math.floor(fireIndex / 8) * 12 + times[fireIndex % 8];
        if (Math.max(0, age - 2.5) >= next) {
            if (fireIndex % 8 >= 3) due.push(tick);
            fireIndex++;
        }
    }
    // Turret fans need live turrets (none spawned here), so only curtain and ring patterns emit.
    assert.deepEqual(boss, due);
});

test("explicit radii decide actual collisions: player 5 + hostile bullet 4, enemy contact from spec, lane half-width + player", async () => {
    const hits = async (
        make: (scene: SceneSetup<Progress, ProgressCommand>, run: RunState) => void,
    ) => {
        const h = await harness(1, (scene, run) => {
            run.invulnerable = 0;
            make(scene, run);
        });
        try {
            h.tick();
            return h.session.run!.hull < 5;
        } finally {
            h.game.dispose();
        }
    };
    const reach = COMBAT.playerRadius + COMBAT.hostileBulletRadius;
    assert.equal(
        await hits((scene, run) => spawnBullet(scene.world, run.x + reach - 0.01, run.y, 0, 0)),
        true,
    );
    assert.equal(
        await hits((scene, run) => spawnBullet(scene.world, run.x + reach + 0.01, run.y, 0, 0)),
        false,
    );
    // Mine contact (spec radius 6, owner decision): mines only sink w(13) px/s before collision runs.
    const contact = enemySpec(Kind.Mine).radius + COMBAT.playerRadius;
    assert.equal(
        await hits((scene, run) =>
            spawnEnemy(scene.world, run, Kind.Mine, run.x + contact - 0.01, run.y - w(13) * dt, {
                cooldown: 1e9,
            }),
        ),
        true,
    );
    assert.equal(
        await hits((scene, run) =>
            spawnEnemy(scene.world, run, Kind.Mine, run.x + contact + 0.01, run.y - w(13) * dt, {
                cooldown: 1e9,
            }),
        ),
        false,
    );
    const half = REV01_GAMEPLAY.beamWidth.warden / 2 + COMBAT.playerRadius;
    for (const [offset, expected] of [
        [half - 0.01, true],
        [half + 0.01, false],
    ] as const) {
        const h = await harness(1, (scene, run) => {
            run.invulnerable = 0;
            scene.world.spawn(
                Pose.of({ x: run.x + offset, y: w(38) }),
                Beam.of({ width: REV01_GAMEPLAY.beamWidth.warden, charge: 0, duration: 1 }),
            );
        });
        try {
            h.tick();
            assert.equal(h.session.run!.hull < 5, expected, `lane offset ${offset}`);
        } finally {
            h.game.dispose();
        }
    }
});
