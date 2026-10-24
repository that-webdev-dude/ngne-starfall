import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib
"""Stage 1 background, Orbital Breakwater (640x400; the game shows rows 20-379).

Layers, back to front: deep space + dim stars, the blue planet limb with cloud bands (top),
a faint distant scaffold layer, then the station towers framing the left and right edges.
Light comes from the upper right (the planet's lit limb), so station tops and right faces are lit.
Everything is drawn with indices into the fixed stage palette below; randomness is seeded."""
import math
import numpy as np
from PIL import Image

W, H = 640, 400
SEED = 1701

# Stage palette: named ramps, dark -> light. 29 colours.
RAMPS = {
    "space":  ["#091428", "#0e1c36"],
    "star":   ["#1f2c46", "#3a4c6c"],
    "back":   ["#0d1a2b", "#15253a"],
    "planet": ["#0a1a3c", "#0e2550", "#133268", "#1a4282", "#24569c"],
    "cloud":  ["#2c5590", "#4470a6", "#6890bf"],
    "rim":    ["#3a86bd", "#80c2df"],
    "steel":  ["#050a13", "#0a1826", "#0f2536", "#15334a", "#1e4560", "#2c5d7a", "#457e99"],
    "khaki":  ["#26261f", "#3b3a2c", "#55523b"],
    "lamp":   ["#1f4a50", "#3f8286", "#78b8b6"],
}
COLORS, IDX = [], {}
for name, ramp in RAMPS.items():
    for i, c in enumerate(ramp):
        IDX[(name, i)] = len(COLORS); COLORS.append(c)

def P(ramp, i): return IDX[(ramp, i)]
def S(i): return IDX[("steel", max(0, min(6, i)))]
K = lambda i: IDX[("khaki", i)]
L = lambda i: IDX[("lamp", i)]

C = np.full((H, W), P("space", 0), dtype=np.int16)
rng = np.random.default_rng(SEED)

# ---------------------------------------------------------------- primitives
def px(x, y, c):
    if 0 <= x < W and 0 <= y < H: C[y, x] = c

def rect(x, y, w, h, c):
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 > x0 and y1 > y0: C[y0:y1, x0:x1] = c

def hline(x, y, w, c): rect(x, y, w, 1, c)
def vline(x, y, h, c): rect(x, y, 1, h, c)

def line(x0, y0, x1, y1, c):
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        px(x0, y0, c)
        if x0 == x1 and y0 == y1: return
        e2 = 2 * err
        if e2 >= dy: err += dy; x0 += sx
        if e2 <= dx: err += dx; y0 += sy

STEEL_LO, STEEL_HI = IDX[("steel", 1)], IDX[("steel", 6)]
def shade_mask(m, ox, oy, d=2):
    """Cast shadow down-left (light is upper right): steel pixels under the shifted footprint go one step darker."""
    hh, ww = m.shape
    big = np.zeros((hh + d, ww + d), bool)
    for k in range(1, d + 1): big[k:k + hh, d - k:d - k + ww] |= m
    big[0:hh, d:d + ww] &= ~m
    x0, y0 = ox - d, oy
    for (yy_, xx_) in zip(*np.nonzero(big)):
        X, Y = x0 + xx_, y0 + yy_
        if 0 <= X < W and 0 <= Y < H and STEEL_LO <= C[Y, X] <= STEEL_HI: C[Y, X] -= 1

def shade_rect(x, y, w, h, d=2): shade_mask(np.ones((h, w), bool), x, y, d)

def lamp_s(x, y, n=1):
    """Small dim teal indicator, 1x1 or 2x1, in a dark housing."""
    rect(x - 1, y - 1, n + 2, 3, S(0))
    for i in range(n): px(x + i, y, L(2) if i == n - 1 else L(1))

def ledge(x, y, w):
    """Lit 2 px lip with a cast shadow on the plating below."""
    hline(x, y, w, S(5)); hline(x, y + 1, w, S(3)); shade_rect(x, y, w, 2)

def plate(x, y, w, h):
    """Large plate with a recessed inset: inner top/right walls in shadow, bottom/left walls lit."""
    panel(x, y, w, h, 3, rivets=True)
    ix, iy, iw, ih = x + 4, y + 4, w - 8, h - 8
    rect(ix, iy, iw, ih, S(2))
    hline(ix, iy, iw, S(0)); vline(ix + iw - 1, iy, ih, S(1))
    hline(ix, iy + ih - 1, iw, S(4)); vline(ix, iy + 1, ih - 2, S(3))
    hline(ix + 1, iy + 1, iw - 2, S(1))

def panel(x, y, w, h, base=3, rivets=False, shadow=False):
    """Plate with a 1 px dark seam, lit top/right bevel, shaded bottom/left."""
    rect(x, y, w, h, S(1))
    rect(x + 1, y + 1, w - 2, h - 2, S(base))
    hline(x + 1, y + 1, w - 2, S(base + 1))
    vline(x + w - 2, y + 1, h - 2, S(base + 1))
    hline(x + 1, y + h - 2, w - 3, S(base - 1))
    vline(x + 1, y + 2, h - 4, S(base - 1))
    if rivets and w >= 9 and h >= 9:
        for rx in (x + 3, x + w - 4):
            for ry in (y + 3, y + h - 4):
                px(rx, ry, S(base + 2)); px(rx - 1, ry + 1, S(base - 1))
    if shadow: shade_rect(x, y, w, h)

def recess(x, y, w, h):
    """Dark cavity in a hull; its top edge is in shadow of the plate above."""
    rect(x, y, w, h, S(1)); hline(x, y, w, S(0)); vline(x, y, h, S(0))

def pipe_v(x, y, h, w=3, flange=0):
    cols = {2: [2, 4], 3: [1, 3, 5], 4: [1, 3, 5, 4], 5: [1, 2, 4, 5, 4]}[w]
    shade_rect(x, y, w, h, 1)
    for i, c in enumerate(cols): vline(x + i, y, h, S(c))
    if flange:
        for fy in range(y + flange // 2, y + h - 2, flange):
            hline(x - 1, fy, w + 2, S(4)); px(x + w, fy, S(5))
            hline(x - 1, fy + 1, w + 2, S(1))

def pipe_h(x, y, w, h=3, flange=0):
    rows = {2: [4, 2], 3: [5, 3, 1], 4: [5, 4, 2, 1]}[h]
    for i, c in enumerate(rows): hline(x, y + i, w, S(c))
    if flange:
        for fx in range(x + flange // 2, x + w - 2, flange):
            vline(fx, y - 1, h + 2, S(2)); vline(fx + 1, y - 1, h + 2, S(5))

def lamp(x, y, big=True):
    """Dim teal beacon in a dark housing. big = 2x2 core."""
    if big:
        rect(x - 1, y - 1, 4, 4, S(0))
        px(x, y, L(1)); px(x + 1, y, L(2)); px(x, y + 1, L(0)); px(x + 1, y + 1, L(1))
    else:
        px(x, y, L(1)); px(x - 1, y, S(0))

def truss(x, y, w, h, cap=None):
    """Horizontal girder: lit top rail, shaded bottom rail, X-bracing in square cells."""
    pipe_h(x, y, w, 3)
    pipe_h(x, y + h - 3, w, 3)
    hline(x, y + h - 1, w, S(0))
    inner = h - 6
    cell = inner + 1
    n = max(1, round((w - 2) / cell))
    cell = (w - 2) / n
    for i in range(n + 1):
        cx = x + round(i * cell)
        rect(cx, y + 3, 2, inner, S(3)); vline(cx + 1, y + 3, inner, S(4))
    for i in range(n):
        a, b = x + round(i * cell) + 2, x + round((i + 1) * cell) - 1
        line(a, y + 3, b, y + h - 4, S(3))
        line(a, y + h - 4, b, y + 3, S(2))
    if cap == "L":   # end plate on the left (right-side station arms)
        panel(x - 4, y - 3, 5, h + 6, 3)
    elif cap == "R":
        panel(x + w - 1, y - 3, 5, h + 6, 3)

def strut(x0, y0, x1, y1):
    """Diagonal brace, 3 px thick: lit upper edge, mid body, dark underside."""
    line(x0, y0, x1, y1, S(4)); line(x0, y0 + 1, x1, y1 + 1, S(3)); line(x0, y0 + 2, x1, y1 + 2, S(1))

def octagon_mask(w, h, c):
    yy, xx = np.mgrid[0:h, 0:w]
    return (xx + yy >= c) & ((w - 1 - xx) + yy >= c) & (xx + (h - 1 - yy) >= c) & ((w - 1 - xx) + (h - 1 - yy) >= c)

def hatch(x, y, w, h, cut=7):
    """Octagonal docking hatch: bevelled frame, dashed muted hazard ring, dark iris with crosshair."""
    m = octagon_mask(w, h, cut)
    shade_mask(m, x, y, 3)
    sub = C[y:y + h, x:x + w]
    sub[m] = S(1)
    inner = octagon_mask(w - 2, h - 2, cut - 1)
    sub[1:h - 1, 1:w - 1][inner] = S(3)
    # lit top-right bevel / shaded bottom-left bevel on the frame band
    yy, xx = np.mgrid[0:h, 0:w]
    band = m & ~np.pad(octagon_mask(w - 6, h - 6, cut - 2), 3)
    lit = band & ((xx - w / 2) - (yy - h / 2) > 0)
    sub[band & ~lit & np.pad(inner, 1)] = S(2)
    sub[lit & np.pad(inner, 1)] = S(4)
    # dashed ring (muted khaki, replaces the old orange hazard border)
    ring = np.pad(octagon_mask(w - 8, h - 8, cut - 3), 4) & ~np.pad(octagon_mask(w - 10, h - 10, cut - 4), 5)
    dash = ((xx + yy) // 3) % 2 == 0
    sub[ring & dash] = K(1)
    sub[ring & dash & lit] = K(2)
    # iris
    cx, cy, r = w / 2 - 0.5, h / 2 - 0.5, min(w, h) * 0.27
    d = np.hypot(xx - cx, yy - cy)
    sub[d <= r + 0.5] = S(1)
    sub[d <= r - 0.7] = S(2)
    arc = (d <= r - 0.7) & (d > r - 2.5) & ((xx - cx) - (yy - cy) > 2)
    sub[arc] = S(3)
    icx, icy = int(round(cx)), int(round(cy))
    sub[icy, int(cx - r + 3):int(cx + r - 2)] = S(1)
    sub[int(cy - r + 3):int(cy + r - 2), icx] = S(1)
    sub[icy - 1:icy + 1, icx:icx + 2] = S(4)

def crate(x, y, w, h):
    """Muted khaki cargo box: dark rim, lit top/right edge, centre seams, corner bolts."""
    rect(x, y, w, h, S(0))
    rect(x + 1, y + 1, w - 2, h - 2, K(1))
    hline(x + 1, y + 1, w - 2, K(2)); vline(x + w - 2, y + 1, h - 2, K(2))
    hline(x + 1, y + h - 2, w - 2, K(0)); vline(x + 1, y + 2, h - 3, K(0))
    if h >= 14: hline(x + 2, y + h // 2, w - 4, K(0)); hline(x + 2, y + h // 2 + 1, w - 4, K(2))
    if w >= 12: vline(x + w // 2, y + 2, h - 4, K(0))
    for bx, by in ((x + 3, y + 3), (x + w - 4, y + 3)):
        px(bx, by, K(2))
    shade_rect(x, y, w, h)

def tank_v(x, y, w, h):
    """Vertical capsule tank, lit from the right: banded columns, staggered dome ends, khaki straps."""
    ry = max(2, w // 4)
    shade_rect(x, max(0, y), w, h - max(0, -y), 2)
    stops = [(0.12, 1), (0.30, 2), (0.50, 3), (0.64, 4), (0.74, 5), (0.80, 6), (0.90, 4), (1.01, 2)]
    for i in range(w):
        f = (i + 0.5) / w
        c = next(v for t, v in stops if f < t)
        e = 1 - (2 * f - 1) ** 2
        top = y + round(ry * (1 - math.sqrt(max(0, e))))
        vline(x + i, top, h - 2 * (top - y), S(c))
        px(x + i, top, S(0)); px(x + i, y + h - 1 - (top - y), S(0))
        if top - y < ry and 0.4 < f < 0.85: px(x + i, top + 1, S(min(6, c + 1)))
    vline(x, y + ry, h - 2 * ry, S(0)); vline(x + w - 1, y + ry, h - 2 * ry, S(0))
    for sy in (y + h // 4, y + h - h // 4 - 2):
        for i in range(1, w - 1):
            f = (i + 0.5) / w
            px(x + i, sy, K(2) if 0.55 < f < 0.85 else K(1))
            px(x + i, sy + 1, K(0))

def sphere(cx, cy, r):
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    d2 = xx ** 2 + yy ** 2
    m = d2 <= r * r + r * 0.6
    nz = np.sqrt(np.clip(1 - d2 / (r * r), 0, 1))
    I = (xx / r) * 0.55 + (-yy / r) * 0.45 + nz * 0.70
    lv = np.select([I > 0.95, I > 0.72, I > 0.42, I > 0.05], [6, 5, 4, 3], 2)
    sub = C[cy - r:cy + r + 1, cx - r:cx + r + 1]
    for v in range(2, 7): sub[m & (lv == v)] = S(v)
    edge = m & ~np.pad((d2 <= (r - 1) ** 2 + (r - 1) * 0.6)[1:-1, 1:-1], 1)
    sub[edge] = S(0)
    sub[r, 1:2 * r] = S(1)   # weld seam
    sub[r - 1, r + 3:2 * r - 1] = S(4)

def fan(cx, cy, r):
    """Round vent fan: dark housing ring, three lit blades, hub."""
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    d = np.hypot(xx, yy)
    a = np.arctan2(yy, xx)
    sub = C[cy - r:cy + r + 1, cx - r:cx + r + 1]
    sub[d <= r + 0.4] = S(0)
    sub[d <= r - 0.6] = S(2)
    sub[(d <= r - 0.6) & (d > r - 1.6) & (xx - yy > 0)] = S(4)
    sub[d <= r - 2] = S(1)
    blade = ((a + d * 0.18) % (2 * math.pi / 3)) < 0.75
    bm = blade & (d <= r - 2.5) & (d > 2)
    sub[bm] = S(3)
    sub[bm & (yy < 0)] = S(4)
    sub[d <= 2.2] = S(4); sub[(d <= 1.2)] = S(5)

def hazard(x, y, w, h):
    rect(x, y, w, h, S(0))
    for yy in range(y + 1, y + h - 1):
        for xx in range(x + 1, x + w - 1):
            C[yy, xx] = K(1) if ((xx - yy) // 4) % 2 == 0 else S(1)
    vline(x + w - 2, y + 1, h - 2, S(4))

def grille(x, y, w, h):
    rect(x, y, w, h, S(1))
    for yy in range(y + 1, y + h - 1, 2):
        hline(x + 1, yy, w - 2, S(3)); px(x + w - 2, yy, S(4))

def cable(x, y0, y1):
    vline(x, y0, y1 - y0, S(3))

def hull(x0, y0, x1, y1, seed, rows=(10, 14, 18, 22), cols=(10, 14, 18, 24)):
    """Fill a hull region with rows of plates of varied size; a few get rivets, grilles or lights."""
    r = np.random.default_rng(seed)
    y = y0
    while y < y1:
        h = int(r.choice(rows)); h = min(h, y1 - y) if y1 - y >= 6 else y1 - y
        x = x0 - int(r.integers(0, 8))
        while x < x1:
            w = int(r.choice(cols))
            xa, wa = max(x, x0), min(x + w, x1) - max(x, x0)
            if wa >= 4 and h >= 4:
                b = r.random()
                base = 2 if b < 0.25 else (4 if b > 0.93 else 3)
                panel(xa, y, wa, h, base, rivets=r.random() < 0.35)
                roll = r.random()
                if roll < 0.12 and wa >= 10 and h >= 10: grille(xa + 2, y + 3, wa - 4, h - 6)
                elif roll > 0.82 and wa >= 12 and h >= 12:
                    rect(xa + 3, y + 3, wa - 6, h - 6, S(2)); hline(xa + 3, y + 3, wa - 6, S(1))
                    vline(xa + wa - 4, y + 3, h - 6, S(1)); hline(xa + 3, y + h - 4, wa - 6, S(4))
                elif roll < 0.2 and wa >= 6 and h >= 8: px(xa + wa - 4, y + h - 4, L(0))
            x += w
        y += h

# ---------------------------------------------------------------- noise (seeded value noise)
_TAB = np.random.default_rng(SEED + 1).random(1 << 16)
def vnoise3(x, y, z):
    ix, iy, iz = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
    fx, fy, fz = x - ix, y - iy, z - iz
    sx, sy, sz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    def h(a, b, c): return _TAB[((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) & 0xFFFF]
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                wgt = (sx if dx else 1 - sx) * (sy if dy else 1 - sy) * (sz if dz else 1 - sz)
                out = out + wgt * h(ix + dx, iy + dy, iz + dz)
    return out

def fbm(x, y, z, octaves=4):
    tot, amp, norm = 0, 1.0, 0
    for o in range(octaves):
        tot = tot + amp * vnoise3(x * 2 ** o, y * 2 ** o, z * 2 ** o); norm += amp; amp *= 0.5
    return tot / norm

def checker(yy, xx): return (xx + yy) % 2 == 0

# ---------------------------------------------------------------- 1. space
yy, xx = np.mgrid[0:H, 0:W]

# ---------------------------------------------------------------- 2. stars (dim only; the game draws bright moving stars)
stars = []
while len(stars) < 110:
    sx, sy = int(rng.integers(2, W - 2)), int(rng.integers(2, H - 2))
    if all(abs(sx - a) + abs(sy - b) > 14 for a, b in stars): stars.append((sx, sy))
for i, (sx, sy) in enumerate(stars):
    if i % 23 == 0:   # a few tiny crosses
        px(sx, sy, P("star", 1))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): px(sx + dx, sy + dy, P("star", 0))
    else:
        px(sx, sy, P("star", 1) if i % 5 == 0 else P("star", 0))

# ---------------------------------------------------------------- 3. planet
CX, CY, R = 310.0, -132.0, 278.0
ys = slice(0, 175)
py_, px_ = yy[ys].astype(float), xx[ys].astype(float)
dxp, dyp = (px_ + 0.5 - CX) / R, (py_ + 0.5 - CY) / R
d = np.hypot(dxp, dyp)
inside = d <= 1.0
nz = np.sqrt(np.clip(1 - d * d, 0, 1))
LV = np.array([0.62, -0.42, 0.66]); LV /= np.linalg.norm(LV)
lit = dxp * LV[0] + dyp * LV[1] + nz * LV[2]
vis = lit[inside]
t = np.clip((lit - vis.min()) / (vis.max() - vis.min()), 0, 1)
edge = (1.0 - d) * R            # px inside the limb
q = 0.3 + t * 2.9 + np.clip(1 - edge / 10, 0, 1) * 1.4 * t   # limb haze on the lit half only
lvl = np.floor(q)
frac = q - lvl
lvl = np.where((frac > 0.82) & checker(py_, px_), lvl + 1, lvl)   # narrow 50% checker at each step
lvl = np.clip(lvl, 0, 4).astype(int)

# clouds: anisotropic noise on the sphere, stretched along the limb, banded by depth (nz)
def fbm_p(x, y, z, octaves=5, gain=0.62):
    tot, amp, norm = 0, 1.0, 0
    for o in range(octaves):
        tot = tot + amp * vnoise3(x * 2 ** o, y * 2 ** o, z * 2 ** o); norm += amp; amp *= gain
    return tot / norm
cl = fbm_p(dxp * 16 + 3.1, dyp * 16 + 7.7, nz * 34 + 1.3)
cl = cl + 0.11 * np.sin(nz * 30 + 0.8) + 0.06 * np.sin(dxp * 7 + 2.0)
haze = inside & (cl > 0.54) & (edge > 3)
cloud = inside & (cl > 0.61) & (edge > 4)
dense = cloud & (cl > 0.68)
def clean(m, it=2):
    for _ in range(it):
        nb = (np.roll(m, 1, 0).astype(int) + np.roll(m, -1, 0) + np.roll(m, 1, 1) + np.roll(m, -1, 1))
        m = (m & (nb >= 2)) | (~m & (nb >= 3))
    return m
def drop_small(m, min_px):
    """Remove connected specks smaller than min_px (4-connectivity)."""
    m = m.copy(); seen = np.zeros_like(m)
    hh, ww = m.shape
    for y0, x0 in zip(*np.nonzero(m)):
        if seen[y0, x0]: continue
        stack, comp = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop(); comp.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < hh and 0 <= nx < ww and m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; stack.append((ny, nx))
        if len(comp) < min_px:
            for y, x in comp: m[y, x] = False
    return m
cloud = drop_small(clean(cloud) & inside & (edge > 4), 6)
haze = drop_small(clean(haze) & inside & ~cloud, 8)
dense = clean(dense) & cloud

body = np.array([P("planet", i) for i in range(5)])[lvl]
# cloud shadow: surface pixels down-left of a cloud go one step darker
shadow = ~cloud & np.roll(np.roll(cloud, 1, 0), -1, 1)
PL = np.array([P("planet", i) for i in range(5)])
body = np.where(haze, PL[np.minimum(lvl + 1, 4)], body)          # thin cloud veil: one step up
body = np.where(shadow & ~haze, PL[np.maximum(lvl - 1, 0)], body)
# cloud tones follow the planet's light: dark side uses the lower half of the cloud ramp
thick = np.roll(cloud, -1, 0) & np.roll(cloud, -2, 0)                         # cloud continues 2 px below
toLight = (~np.roll(np.roll(cloud, 1, 0), -1, 1) | ~np.roll(cloud, 1, 0)) & thick   # up / up-right open
toShade = ~np.roll(np.roll(cloud, -1, 0), 1, 1)                               # down-left neighbour is open
litSide = t > 0.55
mid = np.where(litSide, P("cloud", 1), P("cloud", 0))
hi = np.where(litSide, P("cloud", 2), P("cloud", 1))
lo = np.where(litSide, P("cloud", 0), P("planet", 3))
ctone = np.where(toLight, hi, np.where(toShade, lo, np.where(dense, mid, np.where(litSide, P("cloud", 0), P("planet", 4)))))
body = np.where(cloud, ctone, body)
centre = (px_ >= 150) & (px_ < 490)
body = np.where(cloud & centre & (body == P("cloud", 2)), P("cloud", 1), body)   # keep bullets readable
# atmosphere rim: 1-2 px line, bright on the lit side, fading to deep blue on the left
rimLine = inside & (edge < 1.0)
rimIn = inside & (edge >= 1.0) & (edge < 1.6 + 2.6 * np.clip(t - 0.5, 0, 1) * 2)   # wider on the lit side
body = np.where(rimLine, np.select([t > 0.62, t > 0.34], [P("rim", 1), P("rim", 0)], P("planet", 4)), body)
body = np.where(rimIn & (t > 0.48), P("rim", 0), body)
# boss entrance: lower the cloud and rim contrast behind the boss only (canvas x 160-480, y 20-170).
# Weight w is 1 in the core and feathers to exactly 0 at the region edges; the step-downs fade in
# through a 4x4 ordered dither so no hard seam shows. Each level drops a tone one step on its own ramp
# (or into the planet ramp) using existing stage colours only.
def ramp01(v, a, b): return np.clip((v - a) / (b - a), 0, 1)
wB = (np.minimum(ramp01(px_, 160, 215), ramp01(480 - px_, 0, 55)) * ramp01(py_, 20, 55)
      * (px_ < 480) * (py_ < 170))
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
thr = (BAYER[py_.astype(int) % 4, px_.astype(int) % 4] + 0.5) / 16
step1 = wB > 0.5 * thr                 # fades in over w 0..0.5
step2 = wB > 0.5 + 0.5 * thr           # fades in over w 0.5..1
b0 = body.copy()
body = np.where(step1 & (b0 == P("cloud", 1)), P("cloud", 0), body)
body = np.where(step2 & (b0 == P("cloud", 0)), P("planet", 3), body)
body = np.where(step1 & (b0 == P("rim", 1)), P("rim", 0), body)
body = np.where(step2 & np.isin(b0, [P("rim", 0), P("rim", 1)]), P("planet", 4), body)
region = C[ys]
region[inside] = body[inside]
# faint halo just outside the limb on the lit half
halo = ~inside & (edge > -5) & (t > 0.30)
region[halo & (edge > -2.5)] = P("space", 1)
region[halo & (edge <= -2.5) & checker(py_, px_)] = P("space", 1)

# ---------------------------------------------------------------- 4. distant scaffold (near space colour, no outlines)
B0, B1 = P("back", 0), P("back", 1)
def back_column(x, y0, y1, w):
    rect(x, y0, w, y1 - y0, B0); vline(x + w - 2, y0, y1 - y0, B1)
    for y in range(y0 + 6, y1, 15): hline(x, y, w, B1)
def back_truss(x, y, w, h):
    hline(x, y, w, B1); hline(x, y + h - 1, w, B0); hline(x, y + h - 2, w, B0)
    for cx in range(x, x + w - h + 1, h):
        line(cx, y + 1, cx + h - 2, y + h - 2, B0); line(cx, y + h - 2, cx + h - 2, y + 1, B0)
back_column(84, 100, 400, 16)
back_truss(100, 214, 22, 6)
back_column(530, 214, 400, 16)
back_truss(512, 352, 22, 6)
back_truss(518, 92, 30, 6)

# ---------------------------------------------------------------- 5. left station
# hull mass
hull(0, 0, 64, 400, SEED + 10)
hull(60, 0, 80, 62, SEED + 11, cols=(10, 12))
hull(64, 60, 84, 132, SEED + 12, cols=(10, 12))
# top cluster: recess with pipes, a lit window strip
recess(6, 8, 30, 34); pipe_v(9, 8, 34, 3, flange=9); pipe_v(15, 8, 34, 4, flange=11); pipe_v(22, 8, 34, 3)
grille(27, 12, 7, 26)
panel(38, 6, 22, 20, 3, rivets=True); px(55, 21, L(1)); px(53, 21, L(0))
hatch(6, 66, 58, 56)
# pipe bundle along the inner edge
recess(62, 132, 18, 120)
pipe_v(64, 132, 120, 4, flange=14); pipe_v(70, 132, 120, 3, flange=17); pipe_v(75, 132, 120, 2)
crate(10, 132, 20, 28)
panel(32, 134, 26, 14, 3, rivets=True); lamp(52, 140, big=False)
# internal girder crossing the core
recess(0, 166, 60, 18); truss(0, 167, 60, 16)
# crate stack on the pipes
crate(40, 208, 16, 26); crate(56, 208, 16, 26); hline(40, 234, 32, S(0))
pipe_h(0, 242, 80, 3, flange=12)
# upper arm (crosses the planet limb)
truss(82, 80, 78, 15, cap="R"); lamp(165, 80); lamp(165, 90)
strut(80, 116, 104, 95); strut(80, 117, 96, 108)
panel(76, 74, 9, 27, 4)
# mid arm + hanging pod
truss(78, 172, 46, 13, cap="R"); lamp(129, 174); lamp(129, 182, big=False)
panel(74, 168, 8, 21, 4)
cable(112, 185, 206); hline(110, 205, 5, S(2)); crate(106, 206, 13, 16)
# lower block with twin spherical tanks
rect(0, 250, 106, 150, S(1))
hull(0, 252, 30, 400, SEED + 13, cols=(10, 15))
recess(30, 256, 38, 92)
sphere(49, 276, 15); sphere(49, 312, 15)
for gx in (31, 66): vline(gx, 256, 92, S(3)); vline(gx + 1, 256, 92, S(4)) if gx == 66 else None
panel(30, 348, 38, 22, 3, rivets=True)
hull(68, 252, 100, 400, SEED + 14, cols=(8, 12, 16))
hazard(98, 262, 8, 112)
pipe_v(70, 258, 70, 3, flange=12); pipe_v(88, 300, 64, 2)
crate(10, 344, 18, 28)
# lower arm with a bracketed box
truss(106, 282, 46, 13, cap="R"); lamp(157, 284); lamp(157, 291, big=False)
rect(126, 295, 2, 4, S(2)); panel(122, 299, 14, 11, 3)
strut(104, 316, 126, 296)
# inner-edge clutter: boxes and pipe elbows break the straight tower edge
panel(80, 138, 10, 16, 3); px(85, 148, L(1))
pipe_h(80, 198, 9, 3); pipe_v(87, 198, 12, 3); panel(84, 210, 9, 8, 3)
panel(76, 226, 12, 14, 2, rivets=True)
panel(78, 40, 8, 22, 3); lamp(82, 46, big=False)
recess(36, 160, 4, 6); pipe_v(40, 184, 24, 2); pipe_v(18, 186, 64, 2, flange=16)
pipe_v(48, 0, 6, 3)
# small indicator lights on the hull
for lx, ly in ((44, 52), (20, 196), (58, 160), (90, 262), (12, 384)): px(lx, ly, L(1))
# depth: ledges, large inset plates, pipe runs
ledge(0, 62, 80); ledge(0, 128, 84); ledge(0, 246, 106)
plate(0, 186, 36, 20); pipe_v(18, 184, 66, 2, flange=16)
plate(0, 374, 30, 26)
pipe_v(60, 0, 60, 3, flange=10)
# stepped setbacks on the centre-facing edge
panel(80, 0, 12, 14, 3, shadow=True); panel(80, 14, 7, 16, 2, shadow=True)
panel(84, 102, 10, 12, 3, shadow=True); panel(84, 114, 6, 16, 2, shadow=True)
panel(80, 154, 6, 14, 3, shadow=True); vline(83, 152, 2, S(4))
panel(80, 240, 8, 8, 3, shadow=True)
panel(106, 250, 8, 14, 3, shadow=True); panel(106, 310, 6, 20, 2, shadow=True)
panel(106, 336, 10, 12, 3, shadow=True); panel(106, 366, 7, 34, 3, shadow=True)
vline(110, 244, 6, S(4)); px(110, 243, L(1))                          # antenna stub
# lamps: arm tips, ledges, edges (irregular)
for lx, ly, n in ((160, 76, 2), (161, 98, 1), (124, 168, 1), (125, 187, 2), (152, 278, 1), (153, 297, 2),
                  (88, 4, 2), (85, 24, 1), (90, 106, 1), (78, 64, 2), (38, 130, 1), (70, 130, 2),
                  (82, 158, 1), (100, 248, 2), (110, 316, 1), (112, 340, 2), (108, 372, 1), (24, 248, 1),
                  (58, 186, 1), (66, 352, 2)):
    lamp_s(lx, ly, n)

# ---------------------------------------------------------------- 6. right station
hull(576, 70, 640, 400, SEED + 20)
hull(548, 0, 578, 60, SEED + 21, cols=(10, 12))
hull(560, 88, 578, 150, SEED + 22, cols=(9, 10))
# twin tanks at the top
recess(578, 0, 62, 74)
tank_v(581, -12, 25, 84); tank_v(610, -12, 25, 84)
pipe_v(607, 0, 74, 2)
# girder under the tanks
recess(552, 72, 88, 18); truss(552, 73, 88, 16)
# upper arm
truss(496, 58, 54, 14, cap="L"); lamp(488, 60); lamp(488, 67, big=False)
panel(546, 52, 10, 24, 4)
strut(548, 92, 524, 73)
# second arm with crate on top and two hanging pods
truss(482, 130, 80, 15, cap="L"); lamp(474, 132); lamp(474, 141)
crate(514, 107, 22, 24)   # bottom rim sits on the girder's top rail
panel(558, 124, 10, 27, 4)
cable(498, 145, 178); hline(496, 177, 5, S(2)); crate(492, 178, 13, 20)
cable(527, 145, 190); hline(525, 189, 5, S(2)); crate(521, 190, 13, 18)
# hatch
hatch(580, 94, 58, 62)
# brace bay with pipes and a boxed truss
recess(548, 152, 30, 100)
truss(550, 160, 28, 14)
pipe_v(552, 178, 74, 3, flange=13); pipe_v(558, 178, 74, 4, flange=16); pipe_v(565, 178, 74, 3); pipe_v(571, 178, 74, 4, flange=19)
hazard(614, 182, 14, 66)
grille(590, 186, 18, 30)
# fan bay
rect(588, 252, 52, 76, S(1)); panel(588, 252, 50, 76, 2)
fan(613, 272, 12); fan(613, 306, 12)
# lower arm
truss(530, 256, 40, 13, cap="L"); lamp(522, 258); lamp(522, 265, big=False)
panel(566, 250, 12, 26, 4); lamp(570, 260, big=False)
# lower crates, pipes, bottom tank
pipe_v(562, 280, 120, 4, flange=15); pipe_v(568, 280, 120, 3, flange=21); pipe_v(573, 280, 120, 3)
crate(538, 296, 12, 22); crate(550, 296, 12, 22)
pipe_h(534, 318, 30, 3); panel(531, 316, 5, 7, 4)
strut(561, 338, 540, 321)
crate(536, 344, 16, 28)
pipe_h(530, 372, 34, 3); panel(527, 370, 5, 7, 4)
strut(561, 390, 542, 375)
recess(580, 340, 40, 60); tank_v(584, 346, 20, 70); pipe_v(608, 340, 60, 3, flange=14)
# inner-edge clutter
panel(540, 14, 9, 18, 3); lamp(543, 22, big=False)
pipe_h(538, 40, 11, 3); pipe_v(538, 40, 12, 3)
panel(550, 94, 11, 22, 3, rivets=True); px(553, 110, L(1))
panel(542, 192, 7, 14, 3); pipe_h(540, 222, 9, 3)
panel(552, 274, 10, 18, 2); lamp(556, 282, big=False)
pipe_v(596, 220, 30, 2); pipe_v(628, 330, 70, 3, flange=12)
for lx, ly in ((560, 30), (596, 166), (628, 236), (600, 336), (552, 106)): px(lx, ly, L(1))
# depth: ledges, inset plates, pipe runs
ledge(578, 158, 62); ledge(578, 330, 62)
plate(576, 220, 36, 30)
pipe_v(579, 160, 60, 3, flange=14); pipe_h(578, 250, 62, 2)
# stepped setbacks on the centre-facing edge
panel(540, 0, 8, 12, 3, shadow=True); panel(552, 116, 8, 8, 2, shadow=True)
panel(540, 236, 8, 14, 3, shadow=True); panel(544, 206, 4, 14, 2, shadow=True)
panel(556, 326, 6, 12, 3, shadow=True); panel(554, 382, 8, 18, 3, shadow=True)
panel(542, 158, 6, 10, 3, shadow=True); vline(545, 150, 8, S(4)); px(545, 149, L(1))   # antenna stub
# lamps: arm tips, ledges, edges (irregular)
for lx, ly, n in ((493, 54, 2), (494, 76, 1), (478, 126, 1), (477, 148, 2), (527, 252, 2), (528, 271, 1),
                  (544, 4, 1), (541, 34, 2), (556, 84, 1), (544, 120, 2), (590, 160, 2), (620, 160, 1),
                  (544, 196, 1), (542, 240, 2), (536, 320, 2), (531, 374, 1), (558, 340, 1), (600, 252, 1),
                  (632, 332, 2), (557, 392, 1)):
    lamp_s(lx, ly, n)

# ---------------------------------------------------------------- write
pal = np.array([pixlib.rgb(c) for c in COLORS], dtype=np.uint8)
image = Image.fromarray(pal[C], "RGB")
print(pixlib.save_background("breakwaterBackground", image), len(COLORS), "palette colours")
