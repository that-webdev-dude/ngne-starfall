import { test } from "node:test";
import { strict as assert } from "node:assert";
import { COMBAT } from "../src/config/encounters.ts";
import { PLAYER_BOUNDS, VIEW, fromLegacy as w } from "../src/config/view.ts";
import { curtainPositions, fan, ring, segmentCircle } from "../src/world/patterns.ts";

const close = (actual: number, expected: number) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const hostileRadius = COMBAT.hostileBulletRadius;

test("aimed fans keep a center shot and symmetric traversable lanes even across the angle wrap", () => {
    const angle = Math.PI - 0.03,
        speed = w(58);
    const forward = [Math.cos(angle), Math.sin(angle)];
    // Gunship and both carrier fan phases; spacing matters at a 100 legacy px (133.3 px) dodge distance.
    for (const [count, degrees] of [
        [5, 56],
        [7, 72],
        [9, 96],
    ]) {
        const shots = fan(angle, count, (degrees * Math.PI) / 180, speed);
        assert.equal(shots.length, count);
        for (let index = 0; index < count; index++) {
            const shot = shots[index],
                mirror = shots[count - index - 1];
            close(Math.hypot(shot.vx, shot.vy), speed);
            close(
                shot.vx * forward[0] + shot.vy * forward[1],
                mirror.vx * forward[0] + mirror.vy * forward[1],
            );
            close(
                shot.vy * forward[0] - shot.vx * forward[1],
                -(mirror.vy * forward[0] - mirror.vx * forward[1]),
            );
            if (index > 0) {
                const previous = shots[index - 1];
                const laneWidth =
                    (Math.hypot(shot.vx - previous.vx, shot.vy - previous.vy) * w(100)) / speed;
                assert.ok(
                    laneWidth > 2 * (COMBAT.playerRadius + hostileRadius),
                    "adjacent shots must leave a collision-free lane at the dodge distance",
                );
            }
        }
        close(shots[(count - 1) / 2].vx, forward[0] * speed);
        close(shots[(count - 1) / 2].vy, forward[1] * speed);
    }
    const [single] = fan(angle, 1, Math.PI, speed);
    close(single.vx, forward[0] * speed);
    close(single.vy, forward[1] * speed);
});

test("carrier rings have uniform spacing through the closing seam and do not duplicate a shot", () => {
    for (const count of [14, 18]) {
        const shots = ring(count, Math.PI - 0.01, w(50));
        assert.equal(shots.length, count);
        const firstGap = Math.hypot(shots[1].vx - shots[0].vx, shots[1].vy - shots[0].vy);
        for (let index = 0; index < count; index++) {
            const shot = shots[index],
                next = shots[(index + 1) % count];
            close(Math.hypot(shot.vx, shot.vy), w(50));
            close(Math.hypot(next.vx - shot.vx, next.vy - shot.vy), firstGap);
            assert.ok(
                shot.vx * next.vy - shot.vy * next.vx > 0,
                "ring order must advance consistently across the seam",
            );
        }
        close(
            shots.reduce((sum, shot) => sum + shot.vx, 0),
            0,
        );
        close(
            shots.reduce((sum, shot) => sum + shot.vy, 0),
            0,
        );
    }
});

test("curtains keep the legacy 64px (85.3 px) center exclusion and a traversable corridor after spec collision radii", () => {
    const clearance = COMBAT.playerRadius + hostileRadius,
        width = w(64),
        spacing = w(24);
    // Spec radii (player 5 + hostile bullet 4 = 9) replace 6.5 x 4/3 = 8.67: ordinary lanes keep 14 px of
    // clearance instead of the uniformly scaled 11 x 4/3 = 14.67 px. Recorded in T1-REPORT; pinned here.
    assert.equal(spacing - 2 * clearance, 14);
    // Include grid-aligned and half-cell offsets to catch exclusion-boundary mistakes.
    for (const center of [108, 120, 132, 348, 360, 372].map(w)) {
        const rows = [curtainPositions(center, width, 0), curtainPositions(center, width, w(12))];
        assert.notDeepEqual(rows[0], rows[1], "successive rows must stagger their ordinary lanes");
        let sharedLeft = -Infinity,
            sharedRight = Infinity;
        for (const positions of rows) {
            assert.ok(positions.length > 0);
            assert.equal(new Set(positions).size, positions.length);
            assert.ok(
                positions.every(
                    (x) => x >= 0 && x < VIEW.width && Math.abs(x - center) >= width / 2,
                ),
            );
            const left = Math.max(...positions.filter((x) => x < center));
            const right = Math.min(...positions.filter((x) => x > center));
            sharedLeft = Math.max(sharedLeft, left + clearance);
            sharedRight = Math.min(sharedRight, right - clearance);
            assert.ok(
                right - left - 2 * clearance >= width - 2 * clearance,
                "main corridor must leave the full exclusion minus the hitbox for the player center",
            );
            assert.equal(
                segmentCircle(
                    center,
                    PLAYER_BOUNDS.minY,
                    center,
                    PLAYER_BOUNDS.maxY,
                    left,
                    w(150),
                    clearance,
                ),
                false,
            );
            assert.equal(
                segmentCircle(
                    center,
                    PLAYER_BOUNDS.minY,
                    center,
                    PLAYER_BOUNDS.maxY,
                    right,
                    w(150),
                    clearance,
                ),
                false,
            );
            for (let index = 1; index < positions.length; index++) {
                assert.ok(
                    positions[index] - positions[index - 1] - 2 * clearance >=
                        spacing - 2 * clearance,
                    "ordinary curtain lanes must remain traversable by the hitbox",
                );
            }
        }
        assert.ok(
            sharedRight - sharedLeft >= w(51),
            "the safe corridor must persist across both staggered rows",
        );
    }
});

test("swept collision catches tunneling and tangency but rejects near misses and extension-only hits", () => {
    assert.equal(segmentCircle(-100, 0, 100, 0, 0, 0, 4), true);
    assert.equal(segmentCircle(-100, 4, 100, 4, 0, 0, 4), true);
    assert.equal(segmentCircle(100, 4, -100, 4, 0, 0, 4), true);
    assert.equal(segmentCircle(-100, 4.001, 100, 4.001, 0, 0, 4), false);
    assert.equal(segmentCircle(5, 0, 10, 0, 0, 0, 4), false);
    assert.equal(segmentCircle(-10, 0, -5, 0, 0, 0, 4), false);
    assert.equal(segmentCircle(3, 4, 3, 4, 0, 0, 5), true);
    assert.equal(segmentCircle(3, 4.001, 3, 4.001, 0, 0, 5), false);
});
