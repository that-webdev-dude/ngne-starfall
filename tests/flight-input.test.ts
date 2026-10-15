import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Game, emptyInput, type SceneDefinition } from "@ngne/core";
import { spawnPlayer } from "../src/entities/player.ts";
import { installFlight, type PreviewState } from "../src/systems/flight.ts";

test("a directional tap between ticks takes manual control and retains release drift", async () => {
  const state: PreviewState = {
    seconds: 0, demo: true, direction: 0, x: 325, y: 184, vx: 0, vy: 0, bank: 0,
    effectAge: 100, effectX: 0, effectY: 0, flash: 0, reducedMotion: false,
  };
  const scene: SceneDefinition = {
    id: "flight-input-test",
    setup(context) { spawnPlayer(context.world); installFlight(context, state); },
  };
  const game = new Game({ seed: 1, state: {}, transition: (previous) => previous });
  try {
    await game.start(await game.prepare(scene, { key: "flight-input-test" }));
    game.tick({ ...emptyInput(), pressed: ["ArrowRight"], released: ["ArrowRight"] });
    assert.equal(state.demo, false);
    assert.ok(state.x > 325);
    assert.ok(state.vx > 0);
    const xAfterTap = state.x, speedAfterTap = state.vx;
    game.tick(emptyInput());
    assert.ok(state.x > xAfterTap);
    assert.ok(state.vx > 0 && state.vx < speedAfterTap);
  } finally { game.dispose(); }
});
