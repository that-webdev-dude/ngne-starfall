import { test } from "node:test";
import { strict as assert } from "node:assert";
import { flightVelocity } from "../src/world/flight-motion.ts";
import { FLIGHT } from "../src/config/view.ts";

test("release preserves momentum then settles smoothly", () => {
  let velocity = FLIGHT.speed;
  velocity = flightVelocity(velocity, 0, 1 / 60);
  assert.ok(velocity > 100 && velocity < FLIGHT.speed);
  for (let frame = 0; frame < 29; frame++) velocity = flightVelocity(velocity, 0, 1 / 60);
  assert.ok(velocity > 2 && velocity < 3);
  for (let frame = 0; frame < 30; frame++) velocity = flightVelocity(velocity, 0, 1 / 60);
  assert.equal(velocity, 0);
});

test("acceleration is responsive, symmetric and fixed-step independent", () => {
  let fine = 0, coarse = 0;
  for (let frame = 0; frame < 60; frame++) fine = flightVelocity(fine, 1, 1 / 60);
  for (let frame = 0; frame < 30; frame++) coarse = flightVelocity(coarse, 1, 1 / 30);
  assert.ok(Math.abs(fine - coarse) < 1e-9);
  assert.ok(fine > FLIGHT.speed * 0.99);
  assert.equal(flightVelocity(0, -1, 1 / 60), -flightVelocity(0, 1, 1 / 60));
});
