import { test } from "node:test";
import { strict as assert } from "node:assert";
import { flightVelocity, stickAxis } from "../src/world/flight-motion.ts";
import { FLIGHT, fromLegacy as w } from "../src/config/view.ts";

const dt = 1 / 60;
const close = (actual: number, expected: number, message?: string) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, message ?? `${actual} != ${expected}`);

/** Steps velocity with constant input and integrates position like combat-player (trapezoid). */
function fly(velocity: number, input: number, frames: number) {
    let position = 0,
        peak = 0;
    const velocities: number[] = [];
    for (let frame = 0; frame < frames; frame++) {
        const before = velocity;
        velocity = flightVelocity(velocity, input, dt);
        position += ((before + velocity) * dt) / 2;
        peak = Math.max(peak, position);
        velocities.push(velocity);
    }
    return { velocity, position, peak, velocities };
}

/** Frames a constant-rate ramp needs to cover top speed. */
const rampFrames = (rate: number) => Math.ceil(FLIGHT.speed / rate / dt - 1e-9);

/**
 * Pre-migration 480x270 trace of this exact model (FLIGHT 175 / 900 / 900 / 4500), recorded before any T1 edit:
 * .test-output/integration/T1/motion-baseline-trace.log. Legacy px and px/s per frame.
 * The old assertions "glide < 16 px", "full reverse speed after 10 frames" and "overshoot < 3 px" were already
 * false at baseline (17.04 px, 12 frames, 3.33 px); movement is preserved, so the migrated model must equal
 * this trace x 4/3 frame for frame.
 */
const BASELINE = {
    release: [160, 145, 130, 115, 100, 85, 70, 55, 40, 25, 10, 0, 0],
    releaseGlide: 17 + 1 / 24,
    reversal: [100, 25, -50, -65, -80, -95, -110, -125, -140, -155, -170, -175, -175, -175],
    reversalPeak: 10 / 3,
    acceleration: [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 175, 175],
    rampFrames: 12,
};

test("release glide equals the baseline trace at 4/3: 12 frames, 17.04 legacy px, then settles exactly", () => {
    const frames = rampFrames(FLIGHT.deceleration);
    assert.equal(frames, BASELINE.rampFrames);
    assert.ok(fly(FLIGHT.speed, 0, frames - 1).velocity > 0);
    const { velocity, position, velocities } = fly(FLIGHT.speed, 0, BASELINE.release.length);
    velocities.forEach((v, frame) =>
        close(
            v,
            w(BASELINE.release[frame]),
            `frame ${frame + 1}: ${v} != ${w(BASELINE.release[frame])}`,
        ),
    );
    assert.equal(velocity, 0);
    close(position, w(BASELINE.releaseGlide));
    assert.ok(Math.abs(position - FLIGHT.speed ** 2 / (2 * FLIGHT.deceleration)) < 0.5);
    assert.ok(position > w(4), "glide must be detectable");
});

test("acceleration ramps to top speed over a perceptible but short window", () => {
    const frames = rampFrames(FLIGHT.acceleration);
    assert.ok(frames >= 4 && frames <= 15);
    assert.equal(frames, BASELINE.rampFrames);
    assert.ok(fly(0, 1, frames - 1).velocity < FLIGHT.speed);
    assert.equal(fly(0, 1, frames).velocity, FLIGHT.speed);
    fly(0, 1, BASELINE.acceleration.length).velocities.forEach((v, frame) =>
        close(v, w(BASELINE.acceleration[frame]), `frame ${frame + 1}`),
    );
});

test("full-speed reversal equals the baseline trace at 4/3: turn rate until the zero crossing, then acceleration", () => {
    const { velocities, peak } = fly(FLIGHT.speed, -1, BASELINE.reversal.length);
    velocities.forEach((v, frame) =>
        close(
            v,
            w(BASELINE.reversal[frame]),
            `frame ${frame + 1}: ${v} != ${w(BASELINE.reversal[frame])}`,
        ),
    );
    assert.ok(fly(FLIGHT.speed, -1, 11).velocity > -FLIGHT.speed);
    assert.equal(fly(FLIGHT.speed, -1, 12).velocity, -FLIGHT.speed);
    close(peak, w(BASELINE.reversalPeak));
});

test("motion is symmetric and fixed-step independent", () => {
    let fine = 0,
        coarse = 0;
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
