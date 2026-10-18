import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Game, emptyInput, type SceneDefinition, type WorldAccess } from "@ngne/core";
import { Bullet } from "../src/components/combat.ts";
import { COMBAT } from "../src/config/encounters.ts";
import { spawnBullet } from "../src/entities/combat.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import { createHostileFire, type HostileFire } from "../src/systems/hostile-fire.ts";
import { newRun, type Progress, type ProgressCommand } from "../src/world/session.ts";

const volley = (count: number) => Array.from({ length: count }, () => ({ vx: 0, vy: 40 }));

async function harness() {
  const run = newRun();
  let cues = 0, world!: WorldAccess, hostiles!: HostileFire, plan: (h: HostileFire) => void = () => {};
  const sound = { enemyShot: () => { cues++; } } as CombatSound;
  const scene: SceneDefinition<Progress, ProgressCommand> = {
    id: "hostile-fire-test",
    setup(setup) {
      world = setup.world;
      hostiles = createHostileFire({ scene: setup, run, sound });
      setup.system(() => { plan(hostiles); plan = () => {}; });
      spawnBullet(setup.world, 100, 100, 0, -300, 0);
    },
  };
  const game = new Game<Progress, ProgressCommand>({ seed: 1, state: { best: 0, runs: 0 }, transition: (state) => state });
  await game.start(await game.prepare(scene, { key: "hostile-fire-test" }));
  const bullets = () => { let hostile = 0, friendly = 0; world.query(Bullet).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) views.bullet.team[i] ? hostile++ : friendly++; }); return { hostile, friendly }; };
  return { run, game, bullets, cues: () => cues, tick(next: (h: HostileFire) => void) { plan = next; game.tick(emptyInput()); } };
}

test("hostile fire caps live plus same-tick bullets across separate volleys", async () => {
  const h = await harness();
  try {
    h.tick((fire) => { fire.emit(0, 0, volley(150), 0xff0000); fire.emit(0, 0, volley(50), 0xff0000); });
    assert.equal(h.bullets().hostile, COMBAT.bulletCap);
    h.tick((fire) => fire.emit(0, 0, volley(5), 0xff0000));
    assert.equal(h.bullets().hostile, COMBAT.bulletCap);
    assert.equal(h.cues(), 3, "a capped volley still cues once");
  } finally { h.game.dispose(); }
});

test("hostile fire is suppressed after Nova and clear keeps friendly bullets unless asked", async () => {
  const h = await harness();
  try {
    h.run.novaRing = 0;
    h.tick((fire) => { assert.equal(fire.suppressed, true); fire.emit(0, 0, volley(4), 0xff0000); });
    assert.deepEqual(h.bullets(), { hostile: 0, friendly: 1 });
    assert.equal(h.cues(), 0);
    h.run.novaRing = 1;
    h.tick((fire) => fire.emit(0, 0, volley(4), 0xff0000));
    const cleared: number[] = [];
    h.tick((fire) => fire.clear({ onHostileBullet: (x) => cleared.push(x) }));
    assert.deepEqual(h.bullets(), { hostile: 0, friendly: 1 });
    assert.equal(cleared.length, 4);
    h.tick((fire) => fire.clear({ playerBullets: true }));
    assert.deepEqual(h.bullets(), { hostile: 0, friendly: 0 });
  } finally { h.game.dispose(); }
});
