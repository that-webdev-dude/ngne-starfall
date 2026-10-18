import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Game, emptyInput, type Asset, type PreparedScene, type SceneSetup, type WorldAccess } from "@ngne/core";
import { Bullet, Enemy, Pose } from "../src/components/combat.ts";
import { BOSS } from "../src/config/boss-geometry.ts";
import { COMBAT, ENCOUNTERS } from "../src/config/encounters.ts";
import { Kind } from "../src/config/enemies.ts";
import { spawnBullet, spawnEnemy } from "../src/entities/combat.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { menuScene } from "../src/scenes/menu.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import type { Progress, ProgressCommand, RunState, Session } from "../src/world/session.ts";

type Setup = SceneSetup<Progress, ProgressCommand>;
type Fixture = (scene: Setup, run: RunState) => void;

async function boot(initialize?: Fixture) {
  const session: Session = { settings: { music: 0, effects: 0, muted: true, reducedMotion: false }, screen: "title", best: 0, ready: true };
  const calls: Record<string, number> = {};
  const sound = Object.fromEntries(["update", "shoot", "enemyShot", "hit", "kill", "nova", "damage", "boss", "clear", "death"].map((name) => [name, () => { calls[name] = (calls[name] ?? 0) + 1; }])) as unknown as CombatSound;
  const queue: Fixture[] = [], candidates = new Map<string, PreparedScene>();
  const lifecycle = { loaded: 0, disposed: 0, scenesDisposed: 0 };
  const asset: Asset = { id: "integration-fixture", load: async () => { lifecycle.loaded++; return {}; }, dispose: () => { lifecycle.disposed++; } };
  const take = (purpose: string) => { const value = candidates.get(purpose); candidates.delete(purpose); return value; };
  const services = { assets: [asset], sound: () => sound, take };
  const game = new Game<Progress, ProgressCommand>({ seed: "STARFALL-INTEGRATION", state: { best: 0, runs: 0 }, transition: (state, command) => ({ best: Math.max(state.best, command.score), runs: state.runs + 1 }) });
  let world!: WorldAccess;
  const actual = stageScene(session, services);
  const fixture = { ...actual, setup(scene: Setup) {
    scene.system(() => { for (const action of queue.splice(0)) action(scene, session.run!); }, { runsDuringFreeze: true });
    actual.setup(scene);
    world = scene.world;
    scene.defer(() => { lifecycle.scenesDisposed++; });
    session.run!.waveIndex = ENCOUNTERS.length;
    initialize?.(scene, session.run!);
  } };
  await game.start(await game.prepare(fixture, { key: "fixture-stage" }));
  return { game, session, calls, queue, candidates, lifecycle, services, world, take,
    ticks(count: number) { for (let i = 0; i < count; i++) game.tick(emptyInput()); },
    press(key: string) { game.tick({ ...emptyInput(), pressed: [key] }); },
  };
}

function bullets(world: WorldAccess) {
  const result: { team: number; x: number; y: number; vx: number; vy: number }[] = [];
  world.query(Pose, Bullet).eachChunk(({ views, count }) => {
    for (let i = 0; i < count; i++) if (views.bullet.active[i]) result.push({ team: views.bullet.team[i], x: views.pose.x[i], y: views.pose.y[i], vx: views.bullet.vx[i], vy: views.bullet.vy[i] });
  });
  return result;
}

test("actual collision system applies one hit for simultaneous bullets and restores damage after iFrames", async () => {
  const h = await boot((scene, run) => {
    run.invulnerable = 0;
    for (let i = 0; i < 3; i++) spawnBullet(scene.world, run.x, run.y, 0, 0);
  });
  try {
    h.ticks(1);
    assert.equal(h.session.run!.hull, 4);
    assert.equal(h.calls.damage, 1);
    assert.equal(bullets(h.world).filter((b) => b.team).length, 0);
    h.ticks(8);
    h.queue.push((scene, run) => { spawnBullet(scene.world, run.x, run.y, 0, 0); });
    h.ticks(2);
    assert.equal(h.session.run!.hull, 4, "a later bullet during iFrames must not damage again");
    h.ticks(80);
    h.queue.push((scene, run) => { spawnBullet(scene.world, run.x, run.y, 0, 0); });
    h.ticks(2);
    assert.equal(h.session.run!.hull, 3);
    assert.equal(h.calls.damage, 2);
  } finally { h.game.dispose(); }
});

test("Nova clears hostile shots, preserves friendly shots, suppresses due enemy fire, and respects recharge", async () => {
  const h = await boot((scene, run) => {
    run.shotTimer = 100;
    spawnBullet(scene.world, 10, 220, 0, 0, 0);
    spawnBullet(scene.world, 70, 170, 0, 0, 1);
    spawnBullet(scene.world, 80, 170, 0, 0, 1);
    spawnEnemy(scene.world, run, Kind.Gunship, 130, 67, { hp: 20, cooldown: 0 });
  });
  try {
    h.press("KeyB");
    assert.equal(h.calls.nova, 1);
    assert.equal(bullets(h.world).filter((b) => b.team).length, 0, "due gunship shot must not survive Nova's clear");
    assert.equal(bullets(h.world).filter((b) => !b.team).length, 1);
    h.world.query(Enemy).eachChunk(({ views }) => assert.equal(views.enemy.hp[0], 8));
    h.ticks(7);
    h.press("KeyB");
    assert.equal(h.calls.nova, 1);
    h.queue.push((scene) => scene.world.query(Enemy).eachChunk((chunk) => {
      for (let i = 0; i < chunk.count; i++) scene.world.despawn(chunk.entityAt(i));
    }));
    h.ticks(910);
    assert.equal(h.session.run!.nova, 1);
    h.press("KeyB");
    assert.equal(h.calls.nova, 2);
  } finally { h.game.dispose(); }
});

test("three enemy families emit distinct actual patterns", async () => {
  for (const [kind, count, speed] of [[Kind.Interceptor, 1, 62], [Kind.Gunship, 5, 58], [Kind.Sweeper, 3, 48]] as const) {
    const h = await boot((scene, run) => spawnEnemy(scene.world, run, kind, 100, 70, { cooldown: 0 }));
    try {
      h.ticks(1);
      const shots = bullets(h.world).filter((b) => b.team);
      assert.equal(shots.length, count, `enemy kind ${kind}`);
      for (const shot of shots) assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - speed) < 1e-9);
      assert.equal(new Set(shots.map((shot) => Math.atan2(shot.vy, shot.vx))).size, count);
    } finally { h.game.dispose(); }
  }
});

test("boss warning retires wave enemies and bullets before carrier and two turrets arrive", async () => {
  const h = await boot((scene, run) => {
    run.seconds = 85.99;
    spawnEnemy(scene.world, run, Kind.Gunship, 130, 67, { cooldown: 0 });
    spawnBullet(scene.world, 70, 170, 0, 0, 1);
  });
  try {
    h.ticks(1);
    assert.equal(h.world.query(Enemy).size, 0);
    assert.equal(bullets(h.world).filter((b) => b.team).length, 0);
    h.ticks(241);
    assert.equal(h.session.run!.phase, "boss");
    const kinds: number[] = [];
    h.world.query(Enemy).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) kinds.push(views.enemy.kind[i]); });
    assert.deepEqual(kinds.sort(), [Kind.Gatebreaker, Kind.GatebreakerTurret, Kind.GatebreakerTurret]);
    assert.equal(h.calls.boss, 1);
  } finally { h.game.dispose(); }
});

test("actual boss phase changes ring density and destroyed turret suppresses its fan", async () => {
  for (const [hp, count] of [[COMBAT.bossHp, 14], [COMBAT.bossHp / 2 - 1, 18]]) {
    const h = await boot((scene, run) => {
      run.phase = "boss";
      scene.world.spawn(Pose.of({ x: 240, y: 67 }), Enemy.of({ kind: Kind.Gatebreaker, hp, age: 11, fireIndex: 6 }));
    });
    try { h.ticks(1); assert.equal(bullets(h.world).filter((b) => b.team).length, count); }
    finally { h.game.dispose(); }
  }
  for (const alive of [true, false]) {
    const h = await boot((scene, run) => {
      run.phase = "boss"; run.bossLeft = alive ? 35 : 0;
      scene.world.spawn(Pose.of({ x: 240, y: 67 }), Enemy.of({ kind: Kind.Gatebreaker, hp: COMBAT.bossHp, age: 3.4 }));
    });
    try { h.ticks(1); assert.equal(bullets(h.world).filter((b) => b.team).length, alive ? 7 : 0); }
    finally { h.game.dispose(); }
  }
});

test("turret damage transfers to the core, turret destruction persists, and carrier defeat finishes once", async () => {
  const h = await boot((scene, run) => {
    run.phase = "boss";
    spawnEnemy(scene.world, run, Kind.Gatebreaker, 240, 67);
    spawnEnemy(scene.world, run, Kind.GatebreakerTurret, 240 + BOSS.leftTurret[0], 67 + BOSS.leftTurret[1], { hp: 1, pattern: 0 });
    spawnEnemy(scene.world, run, Kind.GatebreakerTurret, 240 + BOSS.rightTurret[0], 67 + BOSS.rightTurret[1], { pattern: 1 });
    spawnBullet(scene.world, 240 + BOSS.leftTurret[0], 67 + BOSS.leftTurret[1], 0, 0, 0);
  });
  try {
    h.ticks(1);
    assert.equal(h.session.run!.bossLeft, 0);
    assert.ok(Math.abs(h.session.run!.bossHealth - (COMBAT.bossHp - 0.65)) < 1e-9);
    h.ticks(5);
    assert.equal(h.session.run!.bossLeft, 0);
    h.queue.push((scene) => scene.world.query(Pose, Enemy).eachChunk(({ views, count }) => {
      for (let i = 0; i < count; i++) if (views.enemy.kind[i] === Kind.Gatebreaker) {
        views.enemy.hp[i] = 1;
        spawnBullet(scene.world, views.pose.x[i], views.pose.y[i], 0, 0, 0);
      }
    }));
    h.ticks(2);
    assert.equal(h.session.run!.phase, "clear");
    assert.equal(h.world.query(Enemy).size, 0);
    assert.equal(bullets(h.world).length, 0);
    assert.equal(h.game.state.runs, 1);
    h.ticks(180);
    assert.equal(h.calls.clear, 1, "the destruction cascade emits its clear cue once");
    assert.equal(h.game.state.runs, 1);
  } finally { h.game.dispose(); }
});

test("actual pause blocks simulation; death result retries into a clean stage and releases old scene claims", async () => {
  const h = await boot();
  try {
    h.candidates.set("pause", await h.game.prepare(menuScene("pause", h.session, h.take), { key: "pause" }));
    h.press("Escape");
    assert.equal(h.session.screen, "paused");
    assert.equal(h.game.scenes.length, 2);
    const before = { seconds: h.session.run!.seconds, effects: h.session.run!.effectClock, entities: h.game.scenes[0].entityCount };
    h.ticks(120);
    assert.deepEqual({ seconds: h.session.run!.seconds, effects: h.session.run!.effectClock, entities: h.game.scenes[0].entityCount }, before);
    h.press("Escape");
    h.ticks(1);
    assert.equal(h.session.screen, "playing");
    assert.ok(h.session.run!.seconds > before.seconds);
    h.queue.push((scene, run) => { run.hull = 1; run.invulnerable = 0; spawnBullet(scene.world, run.x, run.y, 0, 0); });
    h.ticks(2);
    assert.equal(h.session.run!.phase, "dead");
    assert.equal(h.game.state.runs, 1);
    h.candidates.set("result", await h.game.prepare(menuScene("result", h.session, h.take), { key: "result" }));
    h.ticks(90);
    assert.equal(h.session.screen, "dead");
    assert.equal(h.game.scenes.length, 2);
    const oldRun = h.session.run;
    h.candidates.set("retry", await h.game.prepare(stageScene(h.session, h.services), { key: "retry" }));
    h.press("Enter");
    h.ticks(1);
    assert.equal(h.game.scenes.length, 1);
    assert.equal(h.session.screen, "playing");
    assert.notEqual(h.session.run, oldRun);
    assert.equal(h.session.run!.hull, 5);
    assert.equal(h.session.run!.score, 0);
    assert.equal(h.session.run!.seconds, 0);
    assert.equal(h.game.scenes[0].entityCount, 1, "retry mounts only its fresh player");
    assert.equal(h.lifecycle.scenesDisposed, 1);
    assert.equal(h.game.assets.inspect().claims.scene, 1);
  } finally { h.game.dispose(); }
  assert.equal(h.lifecycle.disposed, h.lifecycle.loaded);
  assert.equal(h.game.assets.inspect().claims.scene, 0);
});

test("idle flight never fires even with an enemy available to target", async () => {
  const h = await boot((scene, run) => spawnEnemy(scene.world, run, Kind.Gunship, 80, 140, { hp: 100, cooldown: 100 }));
  try {
    h.ticks(90);
    assert.equal(h.calls.shoot ?? 0, 0);
    assert.equal(bullets(h.world).filter((bullet) => !bullet.team).length, 0);
  } finally { h.game.dispose(); }
});

test("held fire triggers share one cadence and always shoot straight up regardless of possible aim targets", async () => {
  for (const held of [["Space"], ["Pointer0"], ["Space", "Pointer0"], ["Pad2"]]) {
    const h = await boot((scene, run) => spawnEnemy(scene.world, run, Kind.Gunship, 80, 140, { hp: 100, cooldown: 100 }));
    try {
      const input = { ...emptyInput(), held, axes: [0, 0, 1, 0], pointer: { ...emptyInput().pointer, active: true, x: 420, y: 230 } };
      for (let i = 0; i < 24; i++) h.game.tick(input);
      const shots = bullets(h.world).filter((bullet) => !bullet.team);
      assert.equal(h.calls.shoot, 3, `${held.join("+")} must retain the 0.14-second volley cadence`);
      assert.equal(shots.length, 6, "each volley must contain exactly two bolts");
      for (const shot of shots) {
        assert.equal(shot.vx, 0, "side enemies, pointer and right stick must not redirect fire");
        assert.equal(shot.vy, -370);
        assert.ok(shot.x === h.session.run!.x - 5 || shot.x === h.session.run!.x + 5);
        assert.ok(shot.y < h.session.run!.y);
      }
      assert.equal(h.session.run!.nova, 1);
      assert.equal(h.calls.nova ?? 0, 0);
      const volleys = h.calls.shoot;
      h.game.tick({ ...emptyInput(), released: held });
      h.ticks(24);
      assert.equal(h.calls.shoot, volleys, "release must stop spawning new shots");
    } finally { h.game.dispose(); }
  }
});

test("fire taps captured between simulation ticks produce one volley and do not latch", async () => {
  for (const key of ["Space", "Pointer0", "Pad2"]) {
    const h = await boot();
    try {
      h.game.tick({ ...emptyInput(), pressed: [key], released: [key] });
      assert.equal(h.calls.shoot, 1, `${key} tap must survive the input snapshot`);
      assert.equal(bullets(h.world).filter((bullet) => !bullet.team).length, 2);
      h.ticks(30);
      assert.equal(h.calls.shoot, 1);
      assert.equal(h.calls.nova ?? 0, 0);
    } finally { h.game.dispose(); }
  }
});

test("long idle does not accumulate cooldown debt or produce a catch-up burst", async () => {
  const h = await boot();
  try {
    h.ticks(600);
    const input = { ...emptyInput(), held: ["Space"] };
    h.game.tick(input);
    assert.equal(h.calls.shoot, 1, "first held tick must fire immediately");
    for (let i = 0; i < 6; i++) h.game.tick(input);
    assert.equal(h.calls.shoot, 1, "idle time must not allow rapid consecutive volleys");
    for (let i = 0; i < 23; i++) h.game.tick(input);
    assert.equal(h.calls.shoot, 4, "half a second of continuous fire must preserve normal cadence after idle");
  } finally { h.game.dispose(); }
});

test("B and Pad0 trigger Nova independently without firing a normal volley", async () => {
  for (const key of ["KeyB", "Pad0"]) {
    const h = await boot();
    try {
      h.press(key);
      assert.equal(h.calls.nova, 1);
      assert.equal(h.calls.shoot ?? 0, 0);
      assert.equal(h.session.run!.nova, 0);
      assert.equal(bullets(h.world).filter((bullet) => !bullet.team).length, 0);
    } finally { h.game.dispose(); }
  }
});
