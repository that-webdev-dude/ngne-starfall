import { test } from "node:test";
import { strict as assert } from "node:assert";
import { flightVelocity, stickAxis } from "../src/world/flight-motion.ts";
import { FLIGHT } from "../src/config/view.ts";

const dt = 1 / 60;

/** Steps velocity with constant input and integrates position like combat-player (trapezoid). */
function fly(velocity: number, input: number, frames: number) {
  let position = 0, peak = 0;
  for (let frame = 0; frame < frames; frame++) {
    const before = velocity;
    velocity = flightVelocity(velocity, input, dt);
    position += (before + velocity) * dt / 2;
    peak = Math.max(peak, position);
  }
  return { velocity, position, peak };
}

/** Frames a constant-rate ramp needs to cover top speed. */
const rampFrames = (rate: number) => Math.ceil(FLIGHT.speed / rate / dt - 1e-9);

test("release glides a visible but short distance, then settles exactly", () => {
  const frames = rampFrames(FLIGHT.deceleration);
  assert.ok(fly(FLIGHT.speed, 0, frames - 1).velocity > 0);
  const { velocity, position } = fly(FLIGHT.speed, 0, frames);
  assert.equal(velocity, 0);
  assert.ok(Math.abs(position - FLIGHT.speed ** 2 / (2 * FLIGHT.deceleration)) < 0.5);
  assert.ok(position > 4 && position < 16, "glide must be detectable without turning floaty");
});

test("acceleration ramps to top speed over a perceptible but short window", () => {
  const frames = rampFrames(FLIGHT.acceleration);
  assert.ok(frames >= 4 && frames <= 15);
  assert.ok(fly(0, 1, frames - 1).velocity < FLIGHT.speed);
  assert.equal(fly(0, 1, frames).velocity, FLIGHT.speed);
});

test("full-speed reversal overshoots less than three pixels", () => {
  const { velocity, peak } = fly(FLIGHT.speed, -1, 10);
  assert.equal(velocity, -FLIGHT.speed);
  assert.ok(peak < 3);
});

test("motion is symmetric and fixed-step independent", () => {
  let fine = 0, coarse = 0;
  for (let frame = 0; frame < 60; frame++) fine = flightVelocity(fine, 1, 1 / 60);
  for (let frame = 0; frame < 30; frame++) coarse = flightVelocity(coarse, 1, 1 / 30);
  assert.equal(fine, coarse);
  assert.equal(flightVelocity(0, -1, dt), -flightVelocity(0, 1, dt));
  assert.equal(flightVelocity(FLIGHT.speed, 0, dt), -flightVelocity(-FLIGHT.speed, 0, dt));
});

test("stick axis ramps from zero at the deadzone to full deflection", () => {
  assert.equal(stickAxis(0), 0);
  assert.equal(stickAxis(FLIGHT.stickDeadzone), 0);
  assert.equal(stickAxis(1), 1);
  assert.equal(stickAxis(-1), -1);
  assert.ok(Math.abs(stickAxis(-(FLIGHT.stickDeadzone + 1) / 2) + 0.5) < 1e-12);
});
