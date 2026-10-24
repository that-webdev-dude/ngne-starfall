"""Nova, 12 frames played once (40 x2, 50 x6, 60 x4 ms): ignite x2, expand x6, fade x4.
Per-frame canvases (2R+3 for ignite/expand, 2(R+12)+1 for fade), pivot = centre of each frame,
nova ramp + outline[1] (6 colours). Procedural, deterministic (fixed seeds); method from study C.

Index grids are numpy arrays of real palette indices: 0 transparent, 2 = outline[1] (cold soot),
72..76 = nova ramp (72 dark trailing edge, 73 orange, 74 gold body, 75 yellow, 76 white-hot front).

1. Contour. A pixel is inside the disk of radius r when b <= X[a], with a = max(|dx|,|dy|) and
   b = min(|dx|,|dy|); X starts from the ideal b^2 + a^2 <= (r + 0.5)^2 (outer radius exactly r on
   the axes, exact 8-fold symmetry). One octant's run lengths X[a] - X[a+1] (top flat -> 45-degree
   shoulder) are then corrected:
   - `redistribute`: in each zone where two neighbouring lengths n, n-1 alternate (first n-1 ..
     last n), keep their counts and re-place the n's with a linearly falling density;
   - `repair` (the hand-fix pass): while a zone still has a streak of n that grows again or a
     streak of n-1 that shrinks again, move one run up to 10 places (the edit an artist makes by
     shifting one step), choosing the move that removes the most such reversals, accepted only if
     no contour pixel moves more than 1 px (r < 300) or 2 px (r >= 300) from the ideal circle.
     Applied to the 12 outer radii (the silhouettes); inner colour boundaries use redistribute
     only. `CONTOUR_LOG` records the moves per radius.
2. Depth. L(p) = largest k with p inside the corrected disk D(R - k), so every colour boundary is
   itself a corrected circle. The front is the 4-boundary of D(R): an exact 1-px line.
3. Expand band, outside -> in: 76 front, 75 (1-2 px), 74 gold body, 73 (1 px below width 7, else
   2 px), dark 72 tips on the inner edge. Seeded angular profiles in px of arc (so they scale with
   circumference) vary the yellow width, move the gold/orange boundary by +-1 and add 1-3 px tabs.
4. Fade. The circumference is cut into kept arcs and gaps (lengths in px of arc). On a kept arc the
   1-px front runs the whole length on a `base`-px band, with stepped chunks (1-px shoulders) under
   it; short arcs are fragments pushed 1-4 px outward. Hot arcs keep a white front, cooling arcs a
   yellow one. Ember clusters (2-8 px, oriented to the tangent) are stamped in the gaps only, kept
   1 px clear of everything; soot (outline[1]) sits sparsely inside cooling arc ends.
5. Cleanup by rule: spur removal / notch fill, colour orphans merged, isolated pixels removed."""
import sys, math, random
sys.dont_write_bytecode = True
from pathlib import Path
from collections import Counter
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib
import numpy as np
from PIL import Image

SOOT, D, O, G, Y, W = 2, 72, 73, 74, 75, 76
LUT = {0: (0, 0, 0, 0), SOOT: pixlib.color(("outline", 1))}
for _i in range(5): LUT[72 + _i] = pixlib.color(("nova", _i))

# ---------------------------------------------------------------- contour
def streak_reversals(runs: list[int]) -> int:
    """Inside each two-length zone, streaks of the longer length should only shorten and streaks
    of the shorter length only lengthen (the zone's last streak excluded). Counts violations."""
    bad = 0
    for n in range(max(runs, default=1), 1, -1):
        lo = [i for i, v in enumerate(runs) if v == n - 1]
        hi = [i for i, v in enumerate(runs) if v == n]
        if not lo or not hi or hi[-1] < lo[0]: continue
        seg = runs[lo[0]:hi[-1] + 1]
        if any(v not in (n, n - 1) for v in seg): continue
        streaks = []
        for v in seg:
            if streaks and streaks[-1][0] == v: streaks[-1][1] += 1
            else: streaks.append([v, 1])
        long_ = [k for v, k in streaks if v == n]
        short = [k for v, k in streaks if v == n - 1][:-1]
        bad += sum(1 for j in range(1, len(long_)) if long_[j] > long_[j - 1])
        bad += sum(1 for j in range(1, len(short)) if short[j] < short[j - 1])
    return bad

def redistribute(runs: list[int]) -> list[int]:
    runs = list(runs)
    for n in range(max(runs, default=1), 1, -1):
        lo = [i for i, v in enumerate(runs) if v == n - 1]
        hi = [i for i, v in enumerate(runs) if v == n]
        if not lo or not hi or hi[-1] < lo[0]: continue
        s, e = lo[0], hi[-1]
        seg = runs[s:e + 1]
        if any(v not in (n, n - 1) for v in seg): continue
        A, L = seg.count(n), len(seg)
        pos = set()
        for k in range(1, A + 1):
            p = min(L - 1, int(L * (1 - math.sqrt(1 - (k - 0.5) / A))))
            while p in pos: p += 1
            pos.add(min(p, L - 1))
        runs[s:e + 1] = [n if i in pos else n - 1 for i in range(L)]
    return runs

def repair(runs: list[int], start: int, ideal: list[int], tol: int) -> tuple[list[int], list[tuple[int, int]]]:
    """Hand-fix pass: move one run (an n or n-1) up to 10 places along the octant, picking the move
    that removes the most streak reversals, accepted only within `tol` px of the ideal circle;
    repeat until clean or stuck. Returns (runs, moves as (from, to))."""
    def deviation(rs):
        cur, worst = start, 0
        for r, v in zip(rs, ideal):
            cur += r; worst = max(worst, abs(cur - v))
        return worst
    cur, moves = list(runs), []
    v = streak_reversals(cur)
    while v:
        best = None
        for i in range(len(cur)):
            for j in range(max(0, i - 10), min(len(cur), i + 11)):
                if j == i or abs(cur[i] - cur[j]) != 1: continue
                cand = cur[:i] + cur[i + 1:]
                cand.insert(j, cur[i])
                vc = streak_reversals(cand)
                if vc < v and (best is None or (vc, abs(i - j)) < best[0]) and deviation(cand) <= tol:
                    best = ((vc, abs(i - j)), (i, j), cand)
        if best is None: break
        (v, _), mv, cur = best
        moves.append(mv)
    return cur, moves

OUTER_RADII = {6, 10, 40, 95, 160, 235, 320, 410, 500, 590, 695, 760}
CONTOUR_LOG: dict = {}
_X_CACHE: dict = {}

def corrected_x(r: float) -> np.ndarray:
    """Corrected half-width per octant row a (index a); rows past the top are -1 (length amax+1)."""
    key = round(r, 3)
    if key in _X_CACHE: return _X_CACHE[key]
    T = r + 0.5
    amax = int(math.floor(T))
    ideal = [math.floor(math.sqrt(max(T * T - a * a, 0.0))) for a in range(amax + 1)]
    rows = [a for a in range(amax, -1, -1) if ideal[a] < a]       # octant rows, top first
    X = list(ideal)
    if len(rows) > 1:
        runs = [ideal[rows[i]] - ideal[rows[i - 1]] for i in range(1, len(rows))]
        fixed = redistribute(runs)
        moves = []
        if key in OUTER_RADII:   # silhouettes get the hand-fix pass; inner colour boundaries keep redistribute only
            fixed, moves = repair(fixed, ideal[rows[0]], [ideal[a] for a in rows[1:]], 1 if r < 300 else 2)
        cur = ideal[rows[0]]
        for a, run in zip(rows[1:], fixed):
            cur += run; X[a] = cur
        CONTOUR_LOG[key] = {"moves": moves, "reversals_left": streak_reversals(fixed),
                            "max_shift": max(abs(X[a] - ideal[a]) for a in rows)}
    _X_CACHE[key] = np.array(X, dtype=np.int64)
    return _X_CACHE[key]

class Canvas:
    def __init__(self, n: int):
        assert n % 2 == 1
        self.n, self.c = n, n // 2
        yy, xx = np.mgrid[0:n, 0:n]
        dx, dy = xx - self.c, yy - self.c
        self.a = np.maximum(abs(dx), abs(dy))
        self.b = np.minimum(abs(dx), abs(dy))
        self.theta = np.mod(np.arctan2(dy, dx), 2 * math.pi)       # 0 = +x, clockwise on screen
        self._disk = {}

    def disk(self, r: float) -> np.ndarray:
        if r < 0: return np.zeros((self.n, self.n), bool)
        key = round(r, 3)
        if key not in self._disk:
            X = corrected_x(r)
            full = np.full(self.n, -1, dtype=np.int64)
            full[: min(len(X), self.n)] = X[: self.n]
            self._disk[key] = self.b <= full[self.a]
        return self._disk[key]

    def depth(self, R: int, kmax: int) -> np.ndarray:
        L = np.full((self.n, self.n), -1, dtype=np.int64)
        for k in range(kmax + 1):
            L[self.disk(R - k)] = k
        return L

def boundary4(mask):
    m = np.pad(mask, 1)
    return mask & (~m[:-2, 1:-1] | ~m[2:, 1:-1] | ~m[1:-1, :-2] | ~m[1:-1, 2:])

def neighbours4(mask):
    m = np.pad(mask, 1).astype(np.int64)
    return m[:-2, 1:-1] + m[2:, 1:-1] + m[1:-1, :-2] + m[1:-1, 2:]

def neighbours8(mask):
    m = np.pad(mask, 1).astype(np.int64)
    s = np.zeros(mask.shape, np.int64)
    for oy in (0, 1, 2):
        for ox in (0, 1, 2):
            if (oy, ox) != (1, 1): s += m[oy:oy + mask.shape[0], ox:ox + mask.shape[1]]
    return s

# ---------------------------------------------------------------- angular profiles
def profile(rng, circ: int, segs) -> np.ndarray:
    """Piecewise-constant profile over `circ` px of arc. segs: [(value, (lo, hi), weight)]."""
    out = np.zeros(circ, np.int64)
    vals = [v for v, _, _ in segs]; weights = [w for _, _, w in segs]; lens = {v: l for v, l, _ in segs}
    s, last = 0, None
    while s < circ:
        v = rng.choices(vals, weights)[0]
        if v == last and len(vals) > 1: v = rng.choices(vals, weights)[0]
        ln = rng.randint(*lens[v])
        out[s:s + ln] = v
        s += ln; last = v
    return np.roll(out, rng.randrange(circ))

def sample(cv: Canvas, prof: np.ndarray) -> np.ndarray:
    circ = len(prof)
    return prof[np.floor(cv.theta / (2 * math.pi) * circ).astype(np.int64) % circ]

# ---------------------------------------------------------------- cleanup
def clean_shape(g, protect, iters=4):
    for _ in range(iters):
        op = g > 0
        spur = op & (neighbours4(op) <= 1) & ~protect
        g[spur] = 0
        op = g > 0
        notch = ~op & (neighbours4(op) >= 3)
        for y, x in zip(*np.nonzero(notch)):
            cs = [g[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))
                  if 0 <= yy < g.shape[0] and 0 <= xx < g.shape[1] and g[yy, xx] > 0]
            g[y, x] = Counter(cs).most_common(1)[0][0]
        if not spur.any() and not notch.any(): break
    return g

def clean_colour_orphans(g, skip=(W,)):
    H, Wd = g.shape
    for colour in (Y, G, O, D):
        if colour in skip: continue
        m = g == colour
        for y, x in zip(*np.nonzero(m & (neighbours8(m) == 0))):
            cs = [g[yy, xx] for yy in (y - 1, y, y + 1) for xx in (x - 1, x, x + 1)
                  if (yy, xx) != (y, x) and 0 <= yy < H and 0 <= xx < Wd and g[yy, xx] > 0]
            if cs: g[y, x] = Counter(cs).most_common(1)[0][0]

# ---------------------------------------------------------------- ignite / expand
def ring_band(n, R, Wb, seed, tab_max, dark_frac, e75_len=(14, 60), tab_len=(3, 16), gap_len=(8, 40)):
    cv = Canvas(n)
    rng = random.Random(seed)
    circ = max(8, int(round(2 * math.pi * R)))
    e75 = sample(cv, profile(rng, circ, [(0, e75_len, 3), (1, e75_len, 2)]))
    e74 = sample(cv, profile(rng, circ, [(0, (10, 50), 3), (1, (8, 30), 1), (-1, (8, 30), 1)])) if Wb >= 7 else 0
    tab = (sample(cv, profile(rng, circ, [(0, gap_len, 3)] + [(k, tab_len, 1) for k in range(1, tab_max + 1)]))
           if tab_max else np.zeros_like(cv.a))
    dark = sample(cv, profile(rng, circ, [(0, (10, 45), 1 - dark_frac), (1, (6, 30), dark_frac)]))
    L = cv.depth(R, Wb + tab_max + 1)
    front = boundary4(cv.disk(R))
    g = np.zeros((n, n), np.int64)
    n_or = 2 if Wb >= 7 else 1
    k_y, k_g, k_in = 1 + e75, Wb - 1 - n_or + e74, Wb - 1 + tab
    band = (L >= 0) & (L <= k_in)
    g[band] = O
    g[band & (L <= k_g)] = G
    g[band & (L <= k_y)] = Y
    g[front] = W
    hole_side = band & (neighbours4(band) < 4) & ~front & (L >= k_in)
    g[hole_side & ((dark == 1) | (tab >= 2)) & (g == O)] = D
    g = clean_shape(g, protect=front)
    clean_colour_orphans(g)
    return g

def ignite0():
    """Compression: round white core in a yellow rim, a 1-2 px gap, then the forming ring."""
    cv = Canvas(15)
    g = np.zeros((15, 15), np.int64)
    g[cv.disk(6) & ~cv.disk(4)] = Y
    g[boundary4(cv.disk(6))] = W
    g[cv.disk(2)] = Y
    g[cv.a <= 1] = W
    return g

def ignite1():
    """The ring has detached (4 px band); a 3x3 residual flare stays at the origin."""
    cv = Canvas(23)
    g = ring_band(23, 10, 4, seed=11, tab_max=0, dark_frac=0.0)
    g[cv.a <= 1] = Y
    g[cv.a == 0] = W
    return g

# ---------------------------------------------------------------- fade
EMBERS_H = [  # tangent horizontal; y=75 g=74 o=73 d=72. Sizes 2..8 px.
    ["yg"], ["gyo"], ["yg", ".o"], ["oyg", ".o."], [".yg", "go."], ["yyg", "goo"],
    ["gyyo", ".oo."], [".gyg", "ogo."], ["oggy.", "..ooo"], ["yg..", "goog"], ["gy", "oo", ".d"],
]
EMBERS_D = [  # tangent along "\" (dx=+1, dy=+1); "/" is the horizontal mirror
    ["y.", ".g"], ["yg.", ".go"], ["g..", ".yg", "..o"], ["yg", "go"], ["go.", ".yo"],
    ["gy..", ".yg.", "..oo"], ["y..", "gg.", ".oo"], ["yg..", ".go.", "..oo"],
]
SOOTS = [["ss"], ["s.", "ss"], ["ss", ".s"], ["sss"]]
CH = {"y": Y, "g": G, "o": O, "d": D, "s": SOOT}
COOLER = {Y: G, G: O, O: D}

def shape_cells(rows, transpose=False, mirror=False):
    cells = [(x, y, CH[c]) for y, r in enumerate(rows) for x, c in enumerate(r) if c != "."]
    if transpose: cells = [(y, x, c) for x, y, c in cells]
    if mirror:
        wmax = max(x for x, _, _ in cells)
        cells = [(wmax - x, y, c) for x, y, c in cells]
    return cells

def oriented(rng, phi):
    t = (math.degrees(phi) + 90) % 180                 # tangent direction, y down
    if t < 22.5 or t >= 157.5: return shape_cells(rng.choice(EMBERS_H))
    if 67.5 <= t < 112.5: return shape_cells(rng.choice(EMBERS_H), transpose=True)
    if t < 67.5: return shape_cells(rng.choice(EMBERS_D))
    return shape_cells(rng.choice(EMBERS_D), mirror=True)

def stamp(g, occ, cells, cx, cy) -> bool:
    H, Wd = g.shape
    pts = [(cx + x, cy + y, c) for x, y, c in cells]
    for x, y, _ in pts:
        if not (1 <= x < Wd - 1 and 1 <= y < H - 1) or occ[y - 1:y + 2, x - 1:x + 2].any(): return False
    for x, y, c in pts: g[y, x] = c
    for x, y, _ in pts: occ[y, x] = True
    return True

# Fade stages; every length is px of arc, so the numbers are radius-independent. Kept fraction
# of the circumference with these seeds: fade-0 0.750, fade-1 0.556, fade-2 0.401, fade-3 0.192.
FADE = {
    # fade-0: ~75 % kept, white front on every kept arc, 3-px base, chunks 4-6 px, embers only in gaps
    "fade-0": dict(R=500, seed=12, kinds=[5, 4, 1], lens={"long": (40, 120), "mid": (12, 34), "short": (5, 11)},
                   gaps=[((3, 8), 4), ((9, 18), 3), ((19, 40), 3)], hot_p=1.0, cool_ends=False, base=3,
                   chunk_len=(8, 30), thin=(1, 4), depths=([4, 5, 6], [3, 4, 3]), short_depths=[2, 3, 3],
                   ember_every=45, ember_dr=(1, 6), soot=0),
    # fade-1: ~55 %, 2-px base, chunks up to 4 px, mostly hot, ends start to cool
    "fade-1": dict(R=590, seed=24, kinds=[4, 4, 2], lens={"long": (34, 95), "mid": (12, 30), "short": (5, 11)},
                   gaps=[((4, 10), 2), ((11, 28), 4), ((29, 56), 4)], hot_p=0.8, cool_ends=True, base=2,
                   chunk_len=(6, 24), thin=(2, 8), depths=([3, 4], [5, 4]), short_depths=[2, 2, 3],
                   ember_every=26, ember_dr=(1, 8), soot=4),
    # fade-2 (corner-reach frame): ~40 %, white front intact on every kept arc, 2-px base, chunks
    # up to 3 px, so it still reads as the ring arriving; arc phase chosen so the four extreme
    # corner directions land on kept arcs
    "fade-2": dict(R=695, seed=31, kinds=[3, 5, 2], lens={"long": (30, 80), "mid": (12, 28), "short": (5, 10)},
                   gaps=[((8, 16), 2), ((17, 40), 4), ((41, 80), 4)], hot_p=1.0, cool_ends=False, base=2,
                   chunk_len=(5, 18), thin=(2, 10), depths=([3], [1]), short_depths=[1, 2, 2],
                   ember_every=20, ember_dr=(1, 9), soot=0,
                   must_keep=[(616, 303), (-616, 303), (616, -319), (-616, -319)]),
    # fade-3: ~20 %, short thin pieces, mostly cooled, the rest is embers
    "fade-3": dict(R=760, seed=44, kinds=[0, 3, 7], lens={"long": (20, 30), "mid": (8, 18), "short": (3, 8)},
                   gaps=[((10, 24), 3), ((25, 50), 4), ((51, 80), 2)], hot_p=0.2, cool_ends=True, base=1,
                   chunk_len=(3, 10), thin=(2, 8), depths=([2], [1]), short_depths=[1, 1, 2],
                   ember_every=11, ember_dr=(1, 9), soot=10),
}

FADE_STATS: dict = {}

def fade(name: str) -> np.ndarray:
    P = FADE[name]
    R = P["R"]; n = 2 * (R + 12) + 1
    cv = Canvas(n)
    rng = random.Random(P["seed"])
    circ = int(round(2 * math.pi * R))
    keep = np.zeros(circ, np.int64); heat = np.zeros(circ, np.int64); off = np.zeros(circ, np.int64)
    arcs, gaps = [], []
    s = 0
    while s < circ:
        kind = rng.choices(["long", "mid", "short"], P["kinds"])[0]
        ln = min(rng.randint(*P["lens"][kind]), circ - s)
        hot = 1 if (kind == "long" or rng.random() < P["hot_p"]) else 0
        prof = np.full(ln, P["base"] if kind != "short" else 1, np.int64)
        i = rng.randint(0, 6) if kind != "short" else 0
        while i < ln:
            cl = rng.randint(*P["chunk_len"]) if kind != "short" else ln
            dv, dw = P["depths"]
            dw = dw if (kind == "long" or len(dw) == 1) else dw[:-1] + [0]
            h = rng.choices(dv, dw)[0] if kind != "short" else rng.choice(P["short_depths"])
            h = max(h, P["base"])
            for j in range(cl):
                if i + j >= ln: break
                shoulder = h >= 3 and (j < rng.choice([1, 2]) or cl - 1 - j < 1)
                prof[i + j] = max(prof[i + j], h - 1 if shoulder else h)
            i += cl + rng.randint(*P["thin"])
        keep[s:s + ln] = prof
        heat[s:s + ln] = hot
        if P["cool_ends"] and hot and kind != "short":
            for end in rng.choice([("tail",), ("head",), ("head", "tail")]):
                k = min(rng.randint(3, 7), ln)
                if end == "tail": heat[s + ln - k:s + ln] = 0
                else: heat[s:s + k] = 0
        if kind == "short": off[s:s + ln] = rng.randint(1, 4)
        arcs.append((s, ln, hot)); s += ln
        gl = rng.randint(*rng.choices([r for r, _ in P["gaps"]], [w for _, w in P["gaps"]])[0])
        gaps.append((s, gl)); s += gl
    keep, heat, off = keep[:circ], heat[:circ], off[:circ]
    FADE_STATS[name] = {"kept": round(float((keep > 0).mean()), 3), "arcs": len(arcs)}
    rot = rng.randrange(circ)
    if P.get("must_keep"):   # arc phase: nearest rotation that puts every listed direction on a kept arc (+-3 px)
        want = [int(math.floor((math.atan2(dy, dx) % (2 * math.pi)) / (2 * math.pi) * circ)) for dx, dy in P["must_keep"]]
        for step in range(circ):
            r_try = (rot + step) % circ
            if all(keep[(w + d - r_try) % circ] > 0 and off[(w + d - r_try) % circ] == 0
                   for w in want for d in range(-3, 4)):
                rot = r_try; break
        FADE_STATS[name]["phase_step"] = step
    keep, heat, off = np.roll(keep, rot), np.roll(heat, rot), np.roll(off, rot)
    arcs = [((a + rot) % circ, l, h) for a, l, h in arcs]
    gaps = [((a + rot) % circ, l) for a, l in gaps]

    t, hot, o = sample(cv, keep), sample(cv, heat) == 1, sample(cv, off)
    g = np.zeros((n, n), np.int64)
    front_all = np.zeros((n, n), bool)
    for ov in np.unique(off):
        sel = o == ov
        L = cv.depth(R + int(ov), 7)
        front = boundary4(cv.disk(R + int(ov))) & sel
        inc = sel & ((t >= 1) & front | ((t >= 2) & (L >= 0) & (L <= t - 1)))
        g[inc] = G
        mid = inc & ~front & (L == 1)
        g[mid & hot & (t >= 3)] = Y
        g[mid & ~hot & (t == 2)] = O
        last = inc & ~front & (L == t - 1) & (t >= 3)
        g[last & hot] = O
        g[last & ~hot] = D
        g[inc & front & hot] = W
        g[inc & front & ~hot] = Y
        front_all |= inc & front
    for _ in range(4):
        op = g > 0
        spur = op & ~front_all & (neighbours4(op) < 2)
        if not spur.any(): break
        g[spur] = 0
    clean_colour_orphans(g, skip=(W, Y))
    op = g > 0
    g[op & (neighbours8(op) == 0)] = 0

    occ = g > 0
    lo, hi = P["ember_dr"]
    for gs, gl in gaps:
        count = int(gl / P["ember_every"] * rng.uniform(0.6, 1.4) + rng.random())
        for _ in range(count):
            for _attempt in range(12):
                phi = ((gs + rng.uniform(1, max(2, gl - 1))) % circ) / circ * 2 * math.pi
                dr = rng.choices([rng.uniform(lo, min(hi, 4)), rng.uniform(min(hi, 4), hi), -rng.uniform(3, hi)], [4, 3, 2])[0]
                cells = oriented(rng, phi)
                if abs(dr) > 5: cells = [(x, y, COOLER.get(c, c)) for x, y, c in cells]
                cx = cv.c + int(round((R + dr) * math.cos(phi))); cy = cv.c + int(round((R + dr) * math.sin(phi)))
                if stamp(g, occ, cells, cx, cy): break
    cool = [a for a in arcs if a[2] == 0 and a[1] >= 6]
    rng.shuffle(cool)
    placed = 0
    for a0, ln, _ in cool:
        if placed >= P["soot"]: break
        phi = ((a0 + ln - rng.uniform(0, 3)) % circ) / circ * 2 * math.pi
        rr = R - rng.uniform(4, 7)
        cx = cv.c + int(round(rr * math.cos(phi))); cy = cv.c + int(round(rr * math.sin(phi)))
        if stamp(g, occ, shape_cells(rng.choice(SOOTS)), cx, cy): placed += 1
    return g

# ---------------------------------------------------------------- frames
def to_image(g: np.ndarray) -> Image.Image:
    rgba = np.zeros((*g.shape, 4), np.uint8)
    for idx, col in LUT.items(): rgba[g == idx] = col
    return Image.fromarray(rgba, "RGBA")

def build() -> list[np.ndarray]:
    return [
        ignite0(),
        ignite1(),
        ring_band(83, 40, 5, seed=21, tab_max=1, dark_frac=0.3, e75_len=(8, 24), tab_len=(3, 8), gap_len=(8, 24)),
        ring_band(193, 95, 8, seed=31, tab_max=2, dark_frac=0.4),
        ring_band(323, 160, 9, seed=41, tab_max=3, dark_frac=0.4, tab_len=(3, 18), gap_len=(10, 48)),
        ring_band(473, 235, 9, seed=51, tab_max=3, dark_frac=0.4, tab_len=(3, 20), gap_len=(10, 56)),
        ring_band(643, 320, 9, seed=61, tab_max=3, dark_frac=0.4, tab_len=(3, 22), gap_len=(12, 64)),
        ring_band(823, 410, 9, seed=71, tab_max=3, dark_frac=0.45, tab_len=(3, 24), gap_len=(12, 70)),
        fade("fade-0"), fade("fade-1"), fade("fade-2"), fade("fade-3"),
    ]

if __name__ == "__main__":
    pixlib.save_sprite("nova", [to_image(g) for g in build()])
