"""Stage 2 background, Furnace Belt: an asteroid mining belt seen from above.

Dark space with a faint warm haze, rusty cratered asteroids and mining gantries on both edges,
dim ember-lit furnace vats and windows, and an open dark centre for play.
Everything is drawn as palette indices on a 640x400 grid with one light (upper-left);
ordered (Bayer 4x4) dither is used only at haze band edges, in the vat melt and at the edge of the melt's light spill.
Run from art/rev01:  python -I source/furnaceBackground.py"""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib
import math, random
import numpy as np
from PIL import Image, ImageDraw

W, H = 640, 400
SEED = 2207

# Stage palette: named ramps, dark -> light. 29 colours.
RAMPS = {
    "space": ["#040307", "#08060b", "#0d0910"],                       # sky
    "haze":  ["#140c12", "#1c1117", "#26161b"],                       # warm nebula, edges only
    "far":   ["#1b1519", "#261d22", "#33282c"],                       # distant rocks and towers
    "cool":  ["#1c1720", "#2b222d", "#3d3040", "#544250"],            # grey-violet rock
    "rust":  ["#251210", "#3b1d17", "#542a1f", "#6e3929", "#874f38"],  # rusty rock
    "steel": ["#100c0f", "#1d1618", "#2d2224", "#423230", "#5b4842"],  # gantries, towers, pipes
    "ember": ["#3a1c17", "#5e2a1d", "#823d27", "#a44c30", "#cc6e3e", "#d6885a"],  # furnace light: deep brick -> muted amber core
}
PALETTE, IDX = [], {}
for _name, _cols in RAMPS.items():
    IDX[_name] = list(range(len(PALETTE), len(PALETTE) + len(_cols)))
    PALETTE += _cols
NONE = -1

def P(name, i): return IDX[name][i]
RUSTSTAIN = IDX["rust"][1]

LIGHT = np.array([-0.55, -0.65, 0.52]); LIGHT /= np.linalg.norm(LIGHT)
BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16

canvas = np.full((H, W), P("space", 0), dtype=np.int16)

def put(x, y, c):
    if 0 <= x < W and 0 <= y < H and c != NONE: canvas[y, x] = c

def rect(x0, y0, x1, y1, c):
    """Fill [x0,x1) x [y0,y1)."""
    x0, x1, y0, y1 = max(0, x0), min(W, x1), max(0, y0), min(H, y1)
    if x0 < x1 and y0 < y1: canvas[y0:y1, x0:x1] = c

def paste(local, ox, oy):
    """Paste a local index array (NONE = skip) with its top-left at (ox, oy)."""
    h, w = local.shape
    for y in range(h):
        yy = oy + y
        if not 0 <= yy < H: continue
        for x in range(w):
            c = local[y, x]
            if c != NONE: put(ox + x, yy, int(c))

def mask_poly(w, h, pts):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon(pts, fill=1)
    return np.array(m, dtype=bool)

def clean_mask(m):
    """Drop pixels with <=1 4-neighbours and fill notches with >=3, so silhouettes have no strays."""
    for _ in range(2):
        p = np.pad(m, 1)
        n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
        m = (m & (n >= 2)) | (~m & (n >= 3))
    return m

def clean_orphans(a, m):
    """Recolour pixels that share their colour with none of their 4 neighbours."""
    for _ in range(2):
        p = np.pad(a, 1, constant_values=NONE)
        nb = [p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]
        same = sum((q == a).astype(int) for q in nb)
        ys, xs = np.nonzero(m & (same == 0))
        for y, x in zip(ys, xs):
            vals = [int(q[y, x]) for q in nb if q[y, x] != NONE]
            if vals: a[y, x] = max(set(vals), key=lambda v: (vals.count(v), v))
    return a

# ---------------------------------------------------------------- haze
def value_noise(rng, cell):
    gw, gh = W // cell + 2, H // cell + 2
    g = rng.random((gh, gw))
    ys, xs = np.mgrid[0:H, 0:W] / cell
    x0, y0 = xs.astype(int), ys.astype(int)
    fx, fy = xs - x0, ys - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx
    b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy

def draw_haze(rng):
    n = 0.5 * value_noise(rng, 96) + 0.3 * value_noise(rng, 44) + 0.2 * value_noise(rng, 20)
    xs = np.mgrid[0:H, 0:W][1]
    ys = np.mgrid[0:H, 0:W][0]
    edge = np.clip(1 - np.minimum(xs, W - 1 - xs) / 230.0, 0, 1) ** 1.4
    streak = np.exp(-((xs * 0.42 + ys - 330) / 70.0) ** 2) * 0.35      # faint diagonal drift across the centre
    f = n * (0.35 + 1.1 * edge + streak) - 0.08
    levels = [P("space", 0), P("space", 1), P("space", 2), P("haze", 0), P("haze", 1), P("haze", 2)]
    L = np.clip(f * 6.0, 0, len(levels) - 1.001)
    base = np.floor(L).astype(int); frac = L - base
    wd = 0.22                                                          # dither only in a narrow band at each step
    g = np.clip((frac - (0.5 - wd)) / (2 * wd), 0, 1)
    thr = BAYER4[ys % 4, xs % 4]
    lvl = np.minimum(base + (g > thr), len(levels) - 1)
    centre = (xs >= 120) & (xs < 520)
    lvl = np.where(centre, np.minimum(lvl, 4), lvl)                   # playfield: at most haze1
    canvas[:, :] = np.array(levels)[lvl]

# ---------------------------------------------------------------- rocks
CLUSTERS = [[(0, 0), (1, 0)], [(0, 0), (0, 1)], [(0, 0), (1, 0), (0, 1)], [(0, 0), (1, 0), (1, 1)],
            [(0, 0), (1, 0), (2, 0), (1, 1)], [(0, 0), (1, 0), (2, 1), (1, 1)], [(0, 0), (0, 1), (1, 1), (1, 2)]]

def rock(cx, cy, r, ramp, rng, craters=None, squash=0.85, angle=None, thresholds=None, lump=0.55):
    """A faceted, cratered asteroid lit from the upper-left. ramp = list of palette indices dark->light."""
    angle = rng.uniform(0, math.pi) if angle is None else angle
    nv = rng.randint(12, 16)
    harm = [(k, rng.uniform(0.03, 0.13) / (k - 1) ** 0.6, rng.uniform(0, 6.28)) for k in range(2, 6)]
    def R(t): return r * (1 + sum(a * math.cos(k * t + ph) for k, a, ph in harm))
    S = int(r * 1.5) + 4
    w = h = 2 * S + 1
    ca, sa = math.cos(angle), math.sin(angle)
    def to_local(t, rr):           # polar in rock frame -> local pixel (elongated, rotated)
        x, y = rr * math.cos(t), rr * math.sin(t) * squash
        return S + x * ca - y * sa, S + x * sa + y * ca
    pts = []
    for i in range(nv):
        t = (i + rng.uniform(-0.3, 0.3)) / nv * 2 * math.pi
        pts.append(to_local(t, R(t)))
    m = clean_mask(mask_poly(w, h, pts))
    ys, xs = np.mgrid[0:h, 0:w]
    dx, dy = xs - S + 0.0, ys - S + 0.0
    # rock frame coordinates
    rx, ry = dx * ca + dy * sa, (-dx * sa + dy * ca) / squash
    t = np.arctan2(ry, rx)
    Rt = r * (1 + sum(a * np.cos(k * t + ph) for k, a, ph in harm)) * 1.04
    q = np.clip(np.hypot(rx, ry) / Rt, 0, 0.995)
    ux, uy = dx / (np.hypot(dx, dy) + 1e-6), dy / (np.hypot(dx, dy) + 1e-6)
    nz = np.sqrt(1 - q * q)
    N = np.stack([ux * q, uy * q, nz * 0.9 + 0.1], -1)
    # facets: voronoi cells, each with its own tilted normal
    nseed = max(3, int(m.sum() / 38))
    seeds = []
    cand = list(zip(*np.nonzero(m)))
    for _ in range(nseed):
        sy, sx = cand[rng.randrange(len(cand))]
        n0 = N[sy, sx] + np.array([rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), rng.uniform(-0.25, 0.25)])
        seeds.append((sx, sy, n0 / np.linalg.norm(n0)))
    d2 = np.stack([(xs - sx) ** 2 + ((ys - sy) * 1.3) ** 2 for sx, sy, _ in seeds])
    cell = np.argmin(d2, 0)
    CN = np.stack([s[2] for s in seeds])[cell]
    # lumps: each cell is a small dome of its own, so the rock reads as a cluster of bulbous chunks
    SX = np.array([s_[0] for s_ in seeds])[cell]; SY = np.array([s_[1] for s_ in seeds])[cell]
    cr_ = math.sqrt(m.sum() / nseed) * 0.75
    bu, bv = (xs - SX) / cr_, (ys - SY) / cr_
    bq = np.clip(np.hypot(bu, bv), 0, 0.98)
    BN = np.stack([bu, bv, np.sqrt(1 - bq * bq)], -1)
    NN = 0.4 * CN + 0.25 * N + lump * BN
    NN /= np.linalg.norm(NN, axis=-1, keepdims=True)
    shade = NN @ LIGHT
    k = len(ramp)
    th = thresholds or ([0.12, 0.42, 0.66, 0.86][:k - 1] if k == 5 else [0.16, 0.5, 0.78][:k - 1])
    level = np.digitize(shade, th)
    # craters: concave bowls (lit on the lower-right inner wall), raised rim lit on the upper-left
    if craters is None: craters = 0 if r < 7 else (1 if r < 12 else rng.randint(2, 3) if r < 22 else rng.randint(3, 5))
    for ci in range(craters):
        big = ci == 0 and r >= 18
        rc = r * (rng.uniform(0.3, 0.38) if big else rng.uniform(0.12, 0.22))
        rc = max(2.0, rc)
        for _try in range(20):
            sy, sx = cand[rng.randrange(len(cand))]
            if q[sy, sx] < (0.45 if big else 0.62): break
        u, v = (xs - sx) / rc, (ys - sy) / (rc * 0.85)
        dd = u * u + v * v
        inside = (dd < 1) & m
        bn = np.stack([-u, -v, np.sqrt(np.clip(1 - dd, 0, 1)) * 0.7 + 0.15], -1)
        bn /= np.linalg.norm(bn, axis=-1, keepdims=True)
        bl = np.digitize(bn @ LIGHT - 0.22, th)
        level = np.where(inside, bl, level)
        if rc >= 4.5:
            deep = (dd < 0.28) & (u + v < 0.35) & m
            level = np.where(deep, 0, level)
        rim = (dd >= 1) & (dd < (1 + 1.6 / rc) ** 2) & m
        level = np.where(rim & (u + v < -0.2), np.minimum(level + 1, k - 1), level)
        level = np.where(rim & (u + v > 0.5), np.maximum(level - 1, 0), level)
    # texture: small irregular clusters, one step darker (pits), a few one step lighter (chips)
    for _ in range(int(m.sum() / 28)):
        sy, sx = cand[rng.randrange(len(cand))]
        shape = rng.choice(CLUSTERS)
        step = -1 if rng.random() < 0.8 else 1
        for ox, oy in shape:
            x, y = sx + ox, sy + oy
            if 0 <= x < w and 0 <= y < h and m[y, x]:
                level[y, x] = min(k - 1, max(0, level[y, x] + step)) if level[y, x] > 0 else 0
    # shadow-side edge: darkest step on boundary pixels facing away from the light
    p = np.pad(m, 1)
    border = m & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    away = (ux * LIGHT[0] + uy * LIGHT[1]) < -0.15
    level = np.where(border & away, 0, level)
    out = np.where(m, np.array(ramp)[np.clip(level, 0, k - 1)], NONE).astype(np.int16)
    out = clean_orphans(out, m)
    paste(out, int(round(cx)) - S, int(round(cy)) - S)

def small_rock(cx, cy, r, ramp, rng):
    """Tiny distant debris: 2-3 tones, no craters."""
    rock(cx, cy, r, ramp, rng, craters=0, squash=rng.uniform(0.7, 0.95), thresholds=[0.2, 0.62][:len(ramp) - 1], lump=0.0)

# ---------------------------------------------------------------- structures
STEEL = {"S": IDX["steel"], "E": IDX["ember"]}
FAR = {"S": [P("far", 0), P("far", 0), P("far", 1), P("far", 2), P("far", 2)],
       "E": [P("ember", 0), P("ember", 0), P("ember", 1), P("ember", 1), P("ember", 1), P("ember", 1)]}

def cyl_shade(t):
    """Column shade (0-4) across a cylinder lit from the upper-left; t in [0,1)."""
    return 2 if t < 0.12 else 3 if t < 0.42 else 4 if t < 0.5 else 2 if t < 0.66 else 1 if t < 0.86 else 0

def tower(x, y0, y1, w, pal, rng, rings=13, windows=(), cap=True):
    S, E = pal["S"], pal["E"]
    bb = max(1, w // 6)
    for i in range(w):
        t = (i + 0.5) / w
        c = S[cyl_shade(t)]
        curve = round(bb * math.sqrt(max(0, 1 - (2 * t - 1) ** 2)))
        for y in range(y0 + curve, y1):
            put(x + i, y, c)
    ry = y0 + 6
    while ry < y1 - 2:
        for i in range(-1, w + 1):
            t = min(max((i + 0.5) / w, 0), 0.999)
            curve = round(bb * math.sqrt(max(0, 1 - (2 * t - 1) ** 2)))
            put(x + i, ry + curve, S[0])
            put(x + i, ry + curve + 1, S[min(4, cyl_shade(t) + 1)])
        ry += rings + (ry * 7) % 5
    if cap == "dome":
        r = w / 2
        for yy in range(-int(r * 0.8) - 1, 1):
            for i in range(w):
                u, v = (i + 0.5 - r) / r, (yy + 0.5) / (r * 0.8)
                if u * u + v * v > 1: continue
                l = -u * 0.6 - v * 0.7
                put(x + i, y0 + yy, S[4] if l > 0.75 else S[3] if l > 0.3 else S[2] if l > -0.1 else S[1] if l > -0.5 else S[0])
        put(x + w // 2, y0 - int(r * 0.8) - 1, S[2]); put(x + w // 2, y0 - int(r * 0.8) - 2, E[3])
        cap = False
    elif cap == "stack":                                  # chimney: narrow neck, flared lip, a glowing mouth
        n0, n1 = x + 2, x + w - 2
        for i in range(n0, n1):
            t = (i - n0 + 0.5) / (n1 - n0)
            for y in range(y0 - 7, y0 + 1): put(i, y, S[min(3, cyl_shade(t))])
        rect(x + 1, y0 - 9, x + w - 1, y0 - 7, S[3]); rect(x + 1, y0 - 7, x + w - 1, y0 - 6, S[0])
        rect(x + 2, y0 - 9, x + w - 2, y0 - 8, E[2]); rect(x + 3, y0 - 9, x + w - 3, y0 - 8, E[4])
        cap = True
    elif cap == "mast":
        mx = x + w // 2
        rect(mx, y0 - 14, mx + 1, y0, S[3]); rect(mx + 1, y0 - 14, mx + 2, y0, S[1])
        rect(mx - 3, y0 - 10, mx + 5, y0 - 9, S[2])
        put(mx, y0 - 15, E[3]); put(mx + 1, y0 - 15, E[2])
        cap = True
    if cap:
        for i in range(w):
            t = (i + 0.5) / w
            curve = round(bb * math.sqrt(max(0, 1 - (2 * t - 1) ** 2)))
            for y in range(y0 - curve, y0 + curve):
                put(x + i, y, S[3] if i < w * 0.55 else S[2])
            put(x + i, y0 - curve, S[4] if i < w * 0.5 else S[3])
    for wy in windows:
        wx = x + max(1, w // 3 - 1)
        window(wx, wy, pal)

def window(x, y, pal, w=2, h=2):
    S, E = pal["S"], pal["E"]
    rect(x - 1, y - 1, x + w + 1, y, S[0])
    for i in range(w):
        put(x + i, y, E[4] if (w == 3 and i == 1) else E[3])
        for j in range(1, h): put(x + i, y + j, E[2])
    rect(x, y + h, x + w, y + h + 1, S[1])

def box(x, y, w, h, d, pal, wins=(), seams=7, rail=True):
    """Machine house in 3/4 view: lit top face, front face, darker right side strip."""
    S, E = pal["S"], pal["E"]
    rect(x, y, x + w, y + d, S[3])
    rect(x, y, x + w, y + 1, S[4])
    rect(x + w - 2, y, x + w, y + d, S[2])
    rect(x, y + d, x + w, y + d + h, S[2])
    side = max(2, w // 6)
    rect(x + w - side, y + d, x + w, y + d + h, S[1])
    rect(x, y + d, x + w, y + d + 1, S[1])
    rect(x, y + d + h - 1, x + w, y + d + h, S[0])
    sx = x + seams
    while sx < x + w - side - 1:
        rect(sx, y + d + 2, sx + 1, y + d + h - 1, S[1])
        sx += seams
    for wx, wy in wins:
        window(x + wx, y + d + wy, pal, w=3 if w > 24 else 2)
        # rust streak under some windows
        if (x + wx) % 3 == 0:
            rect(x + wx + 1, y + d + wy + 3, x + wx + 2, y + d + min(h - 1, wy + 7), RUSTSTAIN)
    # vent slits near the right of the front face
    if h >= 12 and w >= 26:
        vx = x + w - side - 6
        for k in range(3):
            rect(vx, y + d + h - 4 - 2 * k, vx + 4, y + d + h - 3 - 2 * k, S[0])
    # railing on the top deck: posts every 4 px with a rail above
    if rail:
        rect(x, y - 2, x + w, y - 1, S[2])
        for px in range(x, x + w, 4): put(px, y - 1, S[1])

def legs(x0, x1, y0, y1, pal, brace=True):
    S = pal["S"]
    for x in (x0, x1 - 2):
        rect(x, y0, x + 1, y1, S[2]); rect(x + 1, y0, x + 2, y1, S[0])
    if brace and x1 - x0 > 6:
        span = x1 - x0 - 4
        y = y0 + 2
        while y + span < y1:
            for i in range(span):
                put(x0 + 2 + i, y + i, S[1]); put(x1 - 3 - i, y + i, S[1])
            y += span + 3

def catwalk(x0, x1, y, pal, rng, slope=0.0, lights=True):
    """Truss gantry 6 px deep: lit top rail, open truss, bottom rail, shadow. slope = dy/dx (0.5 -> 2:1 steps)."""
    S, E = pal["S"], pal["E"]
    nl = x0 + rng.randint(4, 12)
    for x in range(x0, x1):
        yt = y + math.floor((x - x0) * slope + 0.5)
        k = (x - x0) % 6
        put(x, yt, S[4] if k < 3 else S[3])
        put(x, yt + 1, S[2])
        for row in (2, 3):
            if k == 0 or (row == 2 and k in (2, 4)) or (row == 3 and k == 3):
                put(x, yt + row, S[1])
        put(x, yt + 4, S[2])
        put(x, yt + 5, S[0])
        if lights and x == nl:
            put(x, yt - 1, S[1]); put(x, yt, E[3])
            nl = x + rng.randint(9, 19)

def vpipe(x, y0, y1, pal, w=3, flange=19):
    S = pal["S"]
    cols = [S[3], S[2], S[0]] if w == 3 else [S[2], S[3], S[1], S[0]]
    for i, c in enumerate(cols): rect(x + i, y0, x + i + 1, y1, c)
    fy = y0 + flange // 2
    while fy < y1 - 2:
        rect(x - 1, fy, x + w + 1, fy + 1, S[4] if w == 4 else S[3])
        rect(x - 1, fy + 1, x + w + 1, fy + 2, S[1])
        fy += flange

def hpipe(x0, x1, y, pal, flange=23):
    S = pal["S"]
    for i, c in enumerate([S[3], S[2], S[0]]): rect(x0, y + i, x1, y + i + 1, c)
    fx = x0 + flange // 2
    while fx < x1 - 2:
        rect(fx, y - 1, fx + 1, y + 4, S[4]); rect(fx + 1, y - 1, fx + 2, y + 4, S[1])
        fx += flange

def vat(cx, cy, a, b, hb, pal, rng):
    """Furnace vat: a cylinder seen from above at 3/4, its opening showing dim molten metal."""
    S, E = pal["S"], pal["E"]
    VATS.append((cx, cy, a, b, hb))
    for i in range(-a, a + 1):
        t = (i + a + 0.5) / (2 * a + 1)
        e = b * math.sqrt(max(0, 1 - (i / (a + 0.5)) ** 2))
        top, bot = cy + round(e * 0.2), cy + hb + round(e)
        c = S[min(2, cyl_shade(t))]                                   # body kept dark so the melt is the local highlight
        for y in range(top, bot): put(cx + i, y, c)
        # rings
        for ry in (cy + round(e) + 4, cy + round(e) + hb // 2 + 1, cy + round(e) + hb - 4):
            if ry < bot - 1:
                put(cx + i, ry, S[0]); put(cx + i, ry + 1, S[min(3, cyl_shade(t) + 1)])
        put(cx + i, bot - 1, S[0])
    # opening and rim
    melt = {}
    for y in range(-b - 2, b + 3):
        for i in range(-a - 1, a + 2):
            uo, vo = i / (a + 0.5), y / (b + 0.5)
            ui, vi = i / (a - 2.5), y / (b - 1.5)
            if uo * uo + vo * vo > 1: continue
            px, py = cx + i, cy + y
            if ui * ui + vi * vi <= 1:
                rr = math.hypot(ui * 1.05, (vi + 0.2) * 1.2)
                if vi < -0.5 + 0.3 * ui * ui: c = E[0]                  # far inner wall, lit by the melt
                else:                                                    # melt: brightest at the core, ordered dither between steps
                    L = min(3.999, max(0.0, (1.12 - rr) * 3.9))         # 0..4 -> E1..E4
                    step, fr = int(L), L - int(L)
                    g = min(1.0, max(0.0, (fr - 0.3) / 0.4))
                    c = E[min(4, 1 + step + (g > BAYER4[py % 4, px % 4]))]
                melt[(px, py)] = c
                put(px, py, c)
            else:
                lit = (-uo * 0.6 - vo * 0.8)
                c = S[3] if lit > 0.45 else S[2] if lit > -0.1 else S[1] if lit > -0.6 else S[0]   # dark rim
                if ui * ui + vi * vi <= 1.6: c = E[1] if vo > 0.3 else E[0]   # inner lip lit by the melt
                put(px, py, c)
    # crust: a few dark irregular floes drifting on the melt
    cells = [k for k, c in melt.items() if c in (E[2], E[3])]
    for _ in range(max(2, a // 6)):
        sx, sy = rng.choice(cells)
        for ox, oy in rng.choice(CLUSTERS):
            if melt.get((sx + ox, sy + oy)) in (E[2], E[3]): put(sx + ox, sy + oy, E[1])
    # the hot core: the only E5 pixels besides chimney mouths
    sx, sy = cx, cy + 1
    for ox, oy in [(0, 0), (1, 0), (2, 0), (1, 1), (-1, 1), (0, 1)]: put(sx + ox, sy + oy, E[5])

VATS = []

ROCKS = set(IDX["rust"] + IDX["cool"])
SKY = set(IDX["space"] + IDX["haze"])

def glow_spill(cx, cy, a, b, hb):
    """Melt light on its surroundings (never on the vat itself), in 2 steps with a dithered edge:
    steel S1-S4 shifts into ember, rock faces turned toward the vat get an ember rim, and a faint heat halo
    sits over the opening."""
    S, E = STEEL["S"], STEEL["E"]
    near = {S[1]: E[0], S[2]: E[1], S[3]: E[2], S[4]: E[2]}
    far_ = {S[2]: E[0], S[3]: E[1], S[4]: E[1]}
    R = a + 26
    src = canvas.copy()
    for y in range(cy - b - R // 2, cy + hb + R // 3):
        for x in range(cx - R, cx + R + 1):
            if not (0 <= x < W and 0 <= y < H): continue
            if abs(x - cx) <= a + 1 and cy - b - 2 <= y <= cy + hb + b: continue
            d = math.hypot((x - cx) / R, (y - cy) / (R * 0.62))
            if d >= 1: continue
            s_ = 1 - d + (BAYER4[y % 4, x % 4] - 0.5) * 0.16       # ordered-dither the step edges
            c = int(src[y, x])
            if c in near:
                if s_ > 0.55: canvas[y, x] = near[c]
                elif s_ > 0.22 and c in far_: canvas[y, x] = far_[c]
            elif c in ROCKS and s_ > 0.3:
                # rim light: only rock pixels whose neighbour toward the vat is not rock
                vx, vy = cx - x, cy - y; n = math.hypot(vx, vy) or 1
                tx, ty = x + round(2 * vx / n), y + round(2 * vy / n)
                if 0 <= tx < W and 0 <= ty < H and int(src[ty, tx]) not in ROCKS:
                    canvas[y, x] = E[2] if s_ > 0.6 else E[1]
    # heat halo: a thin dithered band of the darkest ember over the far half of the opening
    for y in range(cy - b - 5, cy):
        for x in range(cx - a, cx + a + 1):
            if not (0 <= x < W and 0 <= y < H) or int(canvas[y, x]) not in SKY: continue
            e = math.hypot((x - cx) / (a + 3), (y - cy) / (b + 4))
            if 1.0 < e < 1.0 + 0.45 * (1 - abs(x - cx) / (a + 1)) and BAYER4[y % 4, x % 4] < 0.5:
                canvas[y, x] = E[0]

def crane(base, elbow, tip, pal):
    S = pal["S"]
    xs = [base[0], elbow[0], tip[0]]; ys = [base[1], elbow[1], tip[1]]
    x0, y0 = min(xs) - 6, min(ys) - 6
    w, h = max(xs) - x0 + 7, max(ys) - y0 + 7
    m = Image.new("L", (w, h), 0); d = ImageDraw.Draw(m)
    d.line([(base[0] - x0, base[1] - y0), (elbow[0] - x0, elbow[1] - y0)], fill=1, width=4)
    d.line([(elbow[0] - x0, elbow[1] - y0), (tip[0] - x0, tip[1] - y0)], fill=1, width=3)
    m = clean_mask(np.array(m, dtype=bool))
    p = np.pad(m, 1)
    up, dn, lf, rt = ~p[:-2, 1:-1], ~p[2:, 1:-1], ~p[1:-1, :-2], ~p[1:-1, 2:]
    out = np.where(m, S[2], NONE)
    out = np.where(m & (dn | rt), S[0], out)
    out = np.where(m & (up | lf), S[3], out)
    paste(out.astype(np.int16), x0, y0)
    for (jx, jy), r in ((base, 3), (elbow, 3)):
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if x * x + y * y <= r * r + 1:
                    l = -x - y
                    put(jx + x, jy + y, S[4] if l >= 3 else S[3] if l >= 0 else S[1] if l > -4 else S[0])
        put(jx, jy, S[0])
    # claw
    tx, ty = tip
    for y in range(0, 6):
        put(tx - 3, ty + y, S[3]); put(tx - 2, ty + y, S[1])
        put(tx + 2, ty + y, S[2]); put(tx + 3, ty + y, S[0])
    rect(tx - 3, ty, tx + 4, ty + 1, S[3])
    put(tx - 2, ty + 6, S[2]); put(tx + 1, ty + 6, S[1])

# ---------------------------------------------------------------- scene
def build():
    rng = random.Random(SEED)
    draw_haze(np.random.default_rng(SEED))
    far2, far3 = IDX["far"][:2], IDX["far"]
    cool, rust = IDX["cool"], IDX["rust"]
    rust_d, cool_d = rust[:4], cool[:3]          # back-layer rocks lose their top step (depth)

    # distant debris: dense in the edge bands; the playfield (x 150-490) keeps only a few tiny, darkest ones
    centre_left = 6
    for _ in range(190):
        x = rng.uniform(0, W); y = rng.uniform(0, H)
        if 150 < x < 490:
            if centre_left == 0 or rng.random() > 0.08: continue
            centre_left -= 1
            small_rock(x, y, rng.uniform(1.6, 2.4), far2, rng)
        elif 118 < x < 522:
            small_rock(x, y, rng.uniform(1.6, 3.4), far2, rng)
        else:
            small_rock(x, y, rng.uniform(1.8, 6.0), far3, rng)
    rock(372, 206, 4, far2, rng, craters=0)          # one slightly larger drifter, still darkest ramp

    # distant towers and gantries (far palette)
    tower(30, -4, H, 12, FAR, rng, rings=17, windows=[64, 212, 331], cap=False)
    tower(112, 150, H, 8, FAR, rng, rings=15, windows=[268], cap="mast")
    catwalk(0, 118, 138, FAR, rng, lights=False)
    catwalk(60, 118, 236, FAR, rng, lights=False, slope=-0.5)
    tower(556, -4, H, 10, FAR, rng, rings=16, windows=[45, 190, 350], cap=False)
    tower(522, 8, 168, 7, FAR, rng, rings=14, windows=[96], cap="mast")
    catwalk(522, W, 246, FAR, rng, lights=False)
    catwalk(522, 590, 54, FAR, rng, lights=False, slope=0.5)

    # mid-distance rocks drifting at the inner edge of each belt (darker ramps, no highlight step)
    for side in (0, 1):
        for _ in range(9):
            x = rng.uniform(112, 148); y = rng.uniform(0, H)
            r = rng.uniform(3, 7)
            rock(x if side == 0 else W - 1 - x, y, r, rust[:3] if rng.random() < 0.5 else cool[:3], rng, craters=0)

    # back rock walls along both edges (darker ramps)
    for side in (0, 1):
        y = -24
        while y < H + 20:
            r = rng.uniform(16, 30)
            x = rng.uniform(-4, 84)
            ramp = rust_d if rng.random() < 0.6 else cool_d
            rock(x if side == 0 else W - 1 - x, y, r, ramp, rng)
            y += r * rng.uniform(0.8, 1.2)

    # ================= left belt (x 0-120)
    rock(102, 96, 30, rust, rng)
    rock(24, 180, 22, cool, rng)
    vpipe(2, -2, H, STEEL, w=4, flange=23)
    vpipe(8, -2, H, STEEL, flange=29)
    tower(50, 10, H, 14, STEEL, rng, rings=12, windows=[40, 92, 236, 330])
    tower(106, 44, 70, 8, STEEL, rng, rings=9, cap="stack")          # stack standing on the asteroid
    box(44, 12, 30, 12, 5, STEEL, wins=[(5, 4), (16, 4)])
    box(76, 2, 30, 10, 4, STEEL, wins=[(6, 3), (18, 3)])
    tower(84, -4, 4, 8, STEEL, rng, cap="dome")
    vat(26, 54, 22, 9, 34, STEEL, rng)
    catwalk(64, 98, 74, STEEL, rng)
    box(90, 68, 16, 8, 4, STEEL, wins=[(5, 2)])                    # mining head docked on the asteroid
    box(4, 106, 36, 14, 5, STEEL, wins=[(6, 5), (20, 5)])
    catwalk(0, 118, 128, STEEL, rng)
    catwalk(66, 118, 112, STEEL, rng, slope=0.5)                   # iso stair down to the lower deck
    legs(14, 40, 134, 166, STEEL)
    box(66, 138, 30, 10, 5, STEEL, wins=[(8, 3)])
    box(96, 144, 22, 14, 5, STEEL, wins=[(5, 5)], seams=6)
    legs(70, 92, 153, 186, STEEL)
    for k, px in enumerate((22, 27, 32)):                          # pipe cluster
        vpipe(px, 140 + 3 * k, 206, STEEL, flange=17 + 2 * k)
    hpipe(20, 50, 206, STEEL)
    box(60, 194, 32, 18, 6, STEEL, wins=[(5, 5), (17, 5)])
    legs(64, 88, 218, 246, STEEL)
    tower(96, 214, 250, 8, STEEL, rng, rings=10, cap="mast")
    rock(126, 254, 8, rust[:4], rng, craters=1)
    crane((88, 204), (112, 192), (124, 240), STEEL)
    vpipe(44, 214, H, STEEL)
    vat(24, 258, 19, 8, 36, STEEL, rng)
    catwalk(46, 116, 290, STEEL, rng, slope=-0.5)
    box(92, 248, 26, 10, 4, STEEL, wins=[(5, 3), (15, 3)])
    hpipe(0, 104, 296, STEEL)
    catwalk(0, 112, 304, STEEL, rng)
    box(78, 318, 32, 14, 5, STEEL, wins=[(6, 5), (18, 5)])
    box(6, 316, 30, 12, 5, STEEL, wins=[(6, 4)])
    tower(104, 344, H, 10, STEEL, rng, rings=12, cap="stack")
    vat(70, 362, 15, 6, 28, STEEL, rng)
    catwalk(0, 60, 342, STEEL, rng, slope=0.5)
    # left, in front
    rock(114, 166, 9, rust, rng, craters=1)
    rock(134, 124, 5, rust[:3], rng)
    rock(10, 222, 10, cool, rng, craters=1)
    rock(24, 372, 20, rust, rng)
    rock(118, 384, 12, cool, rng)
    rock(140, 270, 4, cool[:3], rng)
    rock(138, 336, 5, rust[:3], rng)

    # ================= right belt (x 520-640)
    rock(540, 34, 24, rust, rng)
    rock(556, 234, 38, rust, rng)
    rock(524, 336, 18, cool, rng)
    vpipe(632, -2, H, STEEL, flange=27)
    vpipe(598, -2, H, STEEL, w=4, flange=21)
    tower(608, -4, H, 18, STEEL, rng, rings=13, windows=[30, 118, 214, 300, 372], cap=False)
    tower(572, 150, 250, 10, STEEL, rng, rings=11, windows=[206], cap="dome")
    tower(538, 52, 110, 10, STEEL, rng, rings=10, windows=[78], cap="stack")
    box(560, 8, 54, 12, 5, STEEL, wins=[(6, 4), (20, 4), (36, 4)])
    box(522, 0, 34, 10, 4, STEEL, wins=[(6, 3), (20, 3)])
    vat(590, 68, 20, 8, 30, STEEL, rng)
    box(520, 112, 26, 10, 4, STEEL, wins=[(8, 3)])
    box(556, 112, 34, 16, 5, STEEL, wins=[(6, 5), (18, 5)])
    catwalk(520, 604, 150, STEEL, rng)
    legs(530, 556, 156, 186, STEEL)
    crane((578, 118), (548, 104), (530, 134), STEEL)
    vat(604, 176, 18, 7, 36, STEEL, rng)
    catwalk(522, 572, 222, STEEL, rng, slope=-0.5)                  # iso stair up to the dome tower
    box(520, 222, 24, 12, 5, STEEL, wins=[(5, 4)])
    legs(524, 540, 239, 262, STEEL)
    box(574, 254, 52, 14, 6, STEEL, wins=[(6, 5), (20, 5), (34, 5)])
    box(526, 266, 34, 12, 5, STEEL, wins=[(6, 4), (18, 4)])
    legs(580, 620, 274, 302, STEEL)
    for k, px in enumerate((546, 551, 556)):                       # pipe cluster
        vpipe(px, 292, H, STEEL, flange=19 + 2 * k)
    hpipe(536, W, 292, STEEL)
    catwalk(560, W, 318, STEEL, rng, slope=0.5)
    box(584, 344, 40, 14, 5, STEEL, wins=[(6, 5), (20, 5)])
    tower(532, 300, H, 8, STEEL, rng, rings=11, cap="mast")
    vat(566, 380, 16, 6, 26, STEEL, rng)
    # right, in front
    rock(500, 204, 8, rust, rng, craters=1)
    rock(500, 64, 6, cool, rng)
    rock(630, 306, 10, rust, rng, craters=1)
    rock(616, 392, 16, rust, rng)
    rock(498, 286, 5, rust[:3], rng)
    rock(508, 20, 5, cool[:3], rng)

    for v in VATS: glow_spill(*v)
    lut = np.array([pixlib.rgb(c) for c in PALETTE], dtype=np.uint8)
    return Image.fromarray(lut[canvas], "RGB")

if __name__ == "__main__":
    image = build()
    print(pixlib.save_background("furnaceBackground", image))
