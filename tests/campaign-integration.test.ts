import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
    Game,
    emptyInput,
    type Asset,
    type PreparedScene,
    type SceneSetup,
    type WorldAccess,
} from "@ngne/core";
import { Beam, Bullet, Enemy, Pose } from "../src/components/combat.ts";
import { STAGES } from "../src/config/stages.ts";
import { Kind, enemySpec } from "../src/config/enemies.ts";
import { EMITTER_SOCKETS } from "../src/bosses/starfall-engine.ts";
import { REV01_GAMEPLAY } from "../src/config/rev01-gameplay.ts";
import { fromLegacy as w } from "../src/config/view.ts";
import { spawnBeam, spawnBullet, spawnEnemy } from "../src/entities/combat.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { menuScene } from "../src/scenes/menu.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import type { Progress, ProgressCommand, RunState, Session } from "../src/world/session.ts";

type Setup = SceneSetup<Progress, ProgressCommand>;
type Action = (scene: Setup, run: RunState) => void;

async function campaignFixture(stageIndex = 0, entryScore = 0, initialize?: Action) {
    const session: Session = {
        settings: { music: 0, effects: 0, muted: true, reducedMotion: false },
        screen: "title",
        best: 0,
        ready: true,
    };
    const calls: Record<string, number> = {},
        queue: Action[] = [],
        candidates = new Map<string, PreparedScene>();
    const life = { loaded: 0, disposed: 0, scenesDisposed: 0 };
    const asset: Asset = {
        id: "campaign-fixture",
        load: async () => {
            life.loaded++;
            return {};
        },
        dispose: () => {
            life.disposed++;
        },
    };
    const sound = Object.fromEntries(
        [
            "update",
            "shoot",
            "enemyShot",
            "hit",
            "kill",
            "nova",
            "damage",
            "boss",
            "clear",
            "death",
        ].map((name) => [
            name,
            () => {
                calls[name] = (calls[name] ?? 0) + 1;
            },
        ]),
    ) as unknown as CombatSound;
    const take = (purpose: string) => {
        const candidate = candidates.get(purpose);
        candidates.delete(purpose);
        return candidate;
    };
    const game = new Game<Progress, ProgressCommand>({
        seed: "CAMPAIGN-INTEGRATION",
        state: { best: 0, runs: 0 },
        transition: (state, command) => ({
            best: Math.max(state.best, command.score),
            runs: state.runs + 1,
        }),
    });
    let world!: WorldAccess;
    const stage = (index: number, score: number, init?: Action) => {
        const actual = stageScene(
            session,
            { assets: [asset], sound: () => sound, take },
            index,
            score,
        );
        return {
            ...actual,
            setup(scene: Setup) {
                scene.system(
                    () => {
                        for (const action of queue.splice(0)) action(scene, session.run!);
                    },
                    { runsDuringFreeze: true },
                );
                actual.setup(scene);
                world = scene.world;
                scene.defer(() => {
                    life.scenesDisposed++;
                });
                session.run!.waveIndex = STAGES[index].encounters.length;
                init?.(scene, session.run!);
            },
        };
    };
    await game.start(
        await game.prepare(stage(stageIndex, entryScore, initialize), { key: "campaign-fixture" }),
    );
    return {
        session,
        game,
        calls,
        life,
        queue,
        candidates,
        take,
        stage,
        get world() {
            return world;
        },
        ticks(count: number) {
            for (let i = 0; i < count; i++) game.tick(emptyInput());
        },
        press(key: string) {
            game.tick({ ...emptyInput(), pressed: [key] });
        },
        async result() {
            candidates.set(
                "result",
                await game.prepare(menuScene("result", session, take), {
                    key: `result-${game.simulationTick}`,
                }),
            );
            for (let i = 0; i < 180; i++) game.tick();
        },
        async follow(purpose: string, index: number, score: number) {
            candidates.set(
                purpose,
                await game.prepare(stage(index, score), {
                    key: `${purpose}-${game.simulationTick}`,
                }),
            );
            game.tick({ ...emptyInput(), pressed: ["Enter"] });
            game.tick();
        },
    };
}

/** A boss part counts as destroyed once its entity is gone. */
function partAlive(world: WorldAccess, kind: number, pattern: number): boolean {
    let alive = false;
    world.query(Enemy).eachChunk(({ views, count }) => {
        for (let i = 0; i < count; i++)
            if (views.enemy.kind[i] === kind && views.enemy.pattern[i] === pattern) alive = true;
    });
    return alive;
}
function hostileCount(world: WorldAccess): number {
    let count = 0;
    world.query(Bullet).eachChunk(({ views, count: length }) => {
        for (let i = 0; i < length; i++)
            if (views.bullet.active[i] && views.bullet.team[i]) count++;
    });
    return count;
}

const defeatedBoss: Action = (scene, run) => {
    run.phase = "boss";
    spawnEnemy(
        scene.world,
        run,
        [Kind.Gatebreaker, Kind.KilnHead, Kind.StarfallEngine][run.stageIndex],
        w(240),
        w(65),
        { hp: 0 },
    );
};

test("each stage awards its clear and hull bonuses exactly once through actual boss death", async () => {
    for (const index of [0, 1, 2]) {
        const h = await campaignFixture(index, 1200, (scene, run) => {
            run.hull = 3;
            defeatedBoss(scene, run);
        });
        try {
            h.ticks(1);
            const expected = 1200 + [5000, 6500, 10000][index] + [3000, 5000, 10000][index] + 1500;
            assert.equal(h.session.run!.score, expected);
            assert.equal(h.session.run!.entryScore, 1200);
            assert.equal(h.session.run!.phase, "clear");
            assert.equal(h.game.state.runs, 1);
            h.ticks(240);
            assert.equal(h.session.run!.score, expected);
            assert.equal(h.game.state.runs, 1);
        } finally {
            h.game.dispose();
        }
    }
});

test("real result menus carry score across three stages, retry restores entry score, final replay starts fresh", async () => {
    const h = await campaignFixture(0, 0, defeatedBoss);
    try {
        h.ticks(1);
        const firstClear = h.session.run!.score;
        await h.result();
        await h.follow("next", 1, firstClear);
        assert.equal(h.session.run!.stageIndex, 1);
        assert.equal(h.session.run!.entryScore, firstClear);
        assert.equal(h.session.run!.score, firstClear);
        assert.equal(h.session.run!.hull, 5);
        assert.equal(h.session.run!.nova, 1);
        assert.equal(h.game.scenes.length, 1);
        assert.equal(h.game.scenes[0].entityCount, 1);
        h.queue.push((scene, run) => {
            run.score += 777;
            run.hull = 1;
            run.invulnerable = 0;
            spawnBullet(scene.world, run.x, run.y, 0, 0);
        });
        h.ticks(2);
        assert.equal(h.session.run!.phase, "dead");
        await h.result();
        await h.follow("retry", 1, firstClear);
        assert.equal(h.session.run!.stageIndex, 1);
        assert.equal(
            h.session.run!.score,
            firstClear,
            "retry must discard score earned during failed stage",
        );
        assert.equal(h.session.run!.entryScore, firstClear);
        assert.equal(h.session.run!.hull, 5);
        assert.equal(h.session.run!.seconds, 0);
        assert.equal(h.session.run!.combo, 1);
        assert.equal(h.game.scenes[0].entityCount, 1);
        h.queue.push(defeatedBoss);
        h.ticks(2);
        const secondClear = h.session.run!.score;
        await h.result();
        await h.follow("next", 2, secondClear);
        assert.equal(h.session.run!.stageIndex, 2);
        assert.equal(h.session.run!.entryScore, secondClear);
        h.queue.push(defeatedBoss);
        h.ticks(2);
        const finalScore = h.session.run!.score;
        await h.result();
        assert.equal(h.session.screen, "clear");
        assert.equal(h.game.state.best, finalScore);
        assert.equal(
            h.game.state.runs,
            4,
            "three clears plus one failed attempt dispatch once each",
        );
        await h.follow("replay", 0, 0);
        assert.equal(h.session.run!.stageIndex, 0);
        assert.equal(h.session.run!.entryScore, 0);
        assert.equal(h.session.run!.score, 0);
        assert.equal(h.game.state.best, finalScore);
        assert.equal(h.life.scenesDisposed, 4);
        assert.equal(h.game.assets.inspect().claims.scene, 1);
    } finally {
        h.game.dispose();
    }
    assert.equal(h.life.disposed, h.life.loaded);
});

test("later-stage pause freezes beams and resume or title replacement releases correct scene resources", async () => {
    const h = await campaignFixture(2, 12000, (scene) => {
        spawnBeam(scene.world, w(80));
    });
    try {
        h.candidates.set(
            "pause",
            await h.game.prepare(menuScene("pause", h.session, h.take), { key: "pause" }),
        );
        h.press("Escape");
        let age = 0;
        h.world.query(Beam).eachChunk(({ views }) => {
            age = views.beam.age[0];
        });
        const seconds = h.session.run!.seconds;
        h.ticks(120);
        assert.equal(h.session.run!.seconds, seconds);
        h.world.query(Beam).eachChunk(({ views }) => assert.equal(views.beam.age[0], age));
        h.press("Escape");
        h.ticks(1);
        assert.equal(h.session.screen, "playing");
        assert.ok(h.session.run!.seconds > seconds);
        h.candidates.set(
            "pause",
            await h.game.prepare(menuScene("pause", h.session, h.take), { key: "pause-again" }),
        );
        h.press("Escape");
        h.candidates.set(
            "title",
            await h.game.prepare(
                { ...menuScene("title", h.session, h.take), assets: [] },
                { key: "title" },
            ),
        );
        h.press("ArrowDown");
        h.press("ArrowDown");
        h.press("ArrowDown");
        h.press("Enter");
        h.ticks(1);
        assert.equal(h.session.screen, "title");
        assert.equal(h.game.scenes.length, 1);
        assert.equal(h.game.scenes[0].definition, "menu-title");
        assert.equal(h.life.scenesDisposed, 1);
        assert.equal(h.game.assets.inspect().claims.scene, 0);
    } finally {
        h.game.dispose();
    }
});

test("later enemy families differ: delayed mine versus charged lane, with delayed beam damage and Nova cancellation", async () => {
    for (const kind of [Kind.Minelayer, Kind.Warden]) {
        const h = await campaignFixture(1, 0, (scene, run) => {
            run.invulnerable = 0;
            spawnEnemy(scene.world, run, kind, w(100), w(65), { cooldown: 0 });
        });
        try {
            h.ticks(1);
            assert.equal(
                hostileCount(h.world),
                0,
                "neither family creates immediate damaging bullets",
            );
            assert.equal(h.world.query(Beam).size, kind === Kind.Warden ? 1 : 0);
            if (kind === Kind.Minelayer) {
                let mines = 0;
                h.world.query(Enemy).eachChunk(({ views, count }) => {
                    for (let i = 0; i < count; i++) if (views.enemy.kind[i] === Kind.Mine) mines++;
                });
                assert.equal(mines, 1);
                h.ticks(80);
                assert.equal(hostileCount(h.world), 0, "mine must retain its arming delay");
                h.ticks(30);
                assert.equal(hostileCount(h.world), 8, "armed mine detonates into a radial burst");
            }
            if (kind === Kind.Warden) {
                h.ticks(40);
                assert.equal(h.session.run!.hull, 5, "charge telegraph must not damage the player");
                h.ticks(10);
                assert.equal(
                    h.session.run!.hull,
                    4,
                    "charged lane damages a player who remains inside",
                );
                h.ticks(5);
                h.press("KeyB");
                assert.equal(h.world.query(Beam).size, 0, "Nova must remove the remaining lane");
            }
        } finally {
            h.game.dispose();
        }
    }
});

test("mines damage on contact, can be shot down, and Nova suppresses a due detonation", async () => {
    for (const mode of ["contact", "shoot", "nova"]) {
        const h = await campaignFixture(1, 0, (scene, run) => {
            run.invulnerable = 0;
            const x = mode === "contact" ? run.x : w(100),
                y = mode === "contact" ? run.y : w(140);
            spawnEnemy(scene.world, run, Kind.Mine, x, y, { cooldown: mode === "nova" ? 0 : 1.8 });
            if (mode === "shoot")
                for (let i = 0; i < 2; i++) spawnBullet(scene.world, x, y, 0, 0, 0);
        });
        try {
            if (mode === "nova") h.press("KeyB");
            else h.ticks(1);
            if (mode === "contact") {
                assert.equal(h.session.run!.hull, 4);
                assert.equal(h.calls.damage, 1);
            } else {
                assert.equal(h.world.query(Enemy).size, 0);
                assert.equal(hostileCount(h.world), 0);
                assert.equal(h.session.run!.kills, 1);
            }
        } finally {
            h.game.dispose();
        }
    }
});

test("expired beams and charging beams at stage clear release their entities", async () => {
    const lane = REV01_GAMEPLAY.beamWidth.starfallEngine;
    const h = await campaignFixture(2, 0, (scene) => {
        spawnBeam(scene.world, w(80), lane, 0.1, 0.1);
    });
    try {
        h.ticks(13);
        assert.equal(h.world.query(Beam).size, 0);
        h.queue.push((scene, run) => {
            spawnBeam(scene.world, w(80), lane, 10, 10);
            defeatedBoss(scene, run);
        });
        h.ticks(2);
        assert.equal(h.session.run!.phase, "clear");
        assert.equal(h.world.query(Beam).size, 0);
    } finally {
        h.game.dispose();
    }
});

test("Kiln sections are destructible, transfer core damage and suppress their contribution to future rings", async () => {
    const h = await campaignFixture(1, 0, (scene, run) => {
        run.phase = "boss";
        spawnEnemy(scene.world, run, Kind.KilnHead, w(275), w(65), { hp: STAGES[1].boss.hp });
        spawnEnemy(scene.world, run, Kind.KilnSegment, w(227.55), w(70.99), { hp: 1, pattern: 0 });
        for (const pattern of [1, 2])
            spawnEnemy(scene.world, run, Kind.KilnSegment, w(240), w(-40), { hp: 55, pattern });
        spawnBullet(scene.world, w(227.55), w(70.99), 0, 0, 0);
    });
    try {
        h.ticks(1);
        assert.equal(partAlive(h.world, Kind.KilnSegment, 0), false);
        assert.ok(Math.abs(h.session.run!.bossHealth - (STAGES[1].boss.hp - 0.65)) < 1e-9);
        h.ticks(5);
        h.queue.push((scene) =>
            scene.world.query(Enemy).eachChunk(({ views, count }) => {
                for (let i = 0; i < count; i++)
                    if (views.enemy.kind[i] === Kind.KilnHead) {
                        views.enemy.age[i] = 7.5;
                        views.enemy.fireIndex[i] = 3;
                    }
            }),
        );
        h.ticks(1);
        assert.equal(
            hostileCount(h.world),
            14,
            "10 core shots plus two shots from each surviving section",
        );
    } finally {
        h.game.dispose();
    }
});

test("Starfall Engine has three health phases and increasing charged lanes; emitters reduce late ring density", async () => {
    for (const [hp, phase, beamCount] of [
        [STAGES[2].boss.hp, 1, 0],
        [(STAGES[2].boss.hp * 2) / 3 - 1, 2, 1],
        [STAGES[2].boss.hp / 3 - 1, 3, 2],
    ]) {
        const h = await campaignFixture(2, 0, (scene, run) => {
            run.phase = "boss";
            scene.world.spawn(
                Pose.of({ x: w(240), y: w(65) }),
                Enemy.of({
                    kind: Kind.StarfallEngine,
                    hp,
                    age: 7.2,
                    fireIndex: 3,
                    radius: enemySpec(Kind.StarfallEngine).radius,
                }),
            );
        });
        try {
            h.ticks(1);
            assert.equal(h.session.run!.bossPhase, phase);
            assert.equal(h.world.query(Beam).size, beamCount);
        } finally {
            h.game.dispose();
        }
    }
    for (const destroyed of [false, true]) {
        const h = await campaignFixture(2, 0, (scene, run) => {
            run.phase = "boss";
            if (!destroyed)
                for (const [pattern, [sx, sy]] of EMITTER_SOCKETS.entries())
                    spawnEnemy(scene.world, run, Kind.EngineEmitter, w(240) + sx, w(65) + sy, {
                        hp: 55,
                        pattern,
                    });
            scene.world.spawn(
                Pose.of({ x: w(240), y: w(65) }),
                Enemy.of({
                    kind: Kind.StarfallEngine,
                    hp: STAGES[2].boss.hp / 3 - 1,
                    age: 11.1,
                    fireIndex: 6,
                    radius: enemySpec(Kind.StarfallEngine).radius,
                }),
            );
        });
        try {
            h.ticks(1);
            assert.equal(hostileCount(h.world), destroyed ? 14 : 20);
        } finally {
            h.game.dispose();
        }
    }
});

test("Starfall Engine emitter collision uses its measured sprite socket and transfers damage to the core", async () => {
    const [sx, sy] = EMITTER_SOCKETS[0];
    const h = await campaignFixture(2, 0, (scene, run) => {
        run.phase = "boss";
        spawnEnemy(scene.world, run, Kind.StarfallEngine, w(240), w(65), { hp: STAGES[2].boss.hp });
        spawnEnemy(scene.world, run, Kind.EngineEmitter, w(240) + sx, w(65) + sy, {
            hp: 1,
            pattern: 0,
        });
        spawnBullet(scene.world, w(240) + sx, w(65) + sy, 0, 0, 0);
    });
    try {
        h.ticks(1);
        assert.equal(partAlive(h.world, Kind.EngineEmitter, 0), false);
        assert.ok(Math.abs(h.session.run!.bossHealth - (STAGES[2].boss.hp - 0.65)) < 1e-9);
        h.ticks(8);
        assert.equal(partAlive(h.world, Kind.EngineEmitter, 0), false);
    } finally {
        h.game.dispose();
    }
});
