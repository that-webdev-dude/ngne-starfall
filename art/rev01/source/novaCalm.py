"""Reduced-motion / low-flash nova, 2 frames (150, 150 ms) on 223x223, pivot (111,111):
calm-ring (static thin ring at r=110: 1-px white front + 1-px gold line) and calm-broken (the same
ring cut into arcs, ~55% kept, a few small embers no more than 4 px inside the ring).
Nova ramp only (outline unused); geometry (corrected circle, arc profiles, ember stamping) is
reused from source/nova.py so both read as the same object. The activation cue is ignite-1 of the
nova strip, held by the consumer."""
import sys, math, random
sys.dont_write_bytecode = True
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "tools")); import pixlib
sys.path.insert(0, str(HERE)); import nova          # shared geometry; nova's own __main__ does not run
import numpy as np

R, N = 110, 223
W, Y, G, O, D = nova.W, nova.Y, nova.G, nova.O, nova.D
SMALL_H = [["yg"], ["go"], ["gyo"], ["yg", ".o"], ["og", "g."]]          # 2-4 px embers
SMALL_D = [["y.", ".g"], ["go.", "..o"], ["yg", ".o"]]

def ring_lines(cv):
    outer = cv.disk(R)
    front = nova.boundary4(outer)
    gold = nova.boundary4(outer & ~front)          # the next 1-px peel inside the front
    return front, gold

def calm_ring():
    cv = nova.Canvas(N)
    front, gold = ring_lines(cv)
    g = np.zeros((N, N), np.int64)
    g[gold] = G
    g[front] = W
    return g

def calm_broken(seed=3):          # seed 3 keeps 55.0 % of the circumference
    cv = nova.Canvas(N)
    front, gold = ring_lines(cv)
    rng = random.Random(seed)
    circ = int(round(2 * math.pi * R))
    # 0 gap, 1 front only (white), 2 front + gold, 3 cooling front only (yellow)
    state = np.zeros(circ, np.int64)
    gaps, s = [], 0
    while s < circ:
        ln = min(rng.randint(*rng.choices([(28, 70), (12, 27), (4, 9)], [3, 4, 3])[0]), circ - s)
        state[s:s + ln] = 2 if ln >= 8 else 3
        if ln >= 8:                                  # gold drops away 2-4 px before each break
            state[s:s + rng.randint(2, 4)] = 1
            state[s + ln - rng.randint(2, 4):s + ln] = 1
        s += ln
        gl = rng.randint(*rng.choices([(5, 10), (11, 22), (23, 40)], [3, 4, 3])[0])
        gaps.append((s, gl)); s += gl
    state = state[:circ]
    kept = float((state > 0).mean())
    st = nova.sample(cv, state)
    g = np.zeros((N, N), np.int64)
    g[gold & (st == 2)] = G
    g[front & ((st == 1) | (st == 2))] = W
    g[front & (st == 3)] = Y
    op = g > 0
    g[op & (nova.neighbours8(op) == 0)] = 0
    occ = g > 0
    for gs, gl in gaps:
        if gl < 11 or rng.random() < 0.4: continue
        for _attempt in range(12):
            phi = ((gs + rng.uniform(2, gl - 2)) % circ) / circ * 2 * math.pi
            t = (math.degrees(phi) + 90) % 180
            if t < 22.5 or t >= 157.5: cells = nova.shape_cells(rng.choice(SMALL_H))
            elif 67.5 <= t < 112.5: cells = nova.shape_cells(rng.choice(SMALL_H), transpose=True)
            elif t < 67.5: cells = nova.shape_cells(rng.choice(SMALL_D))
            else: cells = nova.shape_cells(rng.choice(SMALL_D), mirror=True)
            rr = R - rng.uniform(2, 3)               # shapes are <= 2 px deep: nothing beyond 4 px inside
            cx = cv.c + int(round(rr * math.cos(phi))); cy = cv.c + int(round(rr * math.sin(phi)))
            if nova.stamp(g, occ, cells, cx, cy): break
    return g, kept

if __name__ == "__main__":
    broken, _ = calm_broken()
    pixlib.save_sprite("novaCalm", [nova.to_image(calm_ring()), nova.to_image(broken)])
