"""Stage 3 background: Midnight Citadel (640x400, own stage palette, <= 32 colours).

Layers, back to front:
  1. sky: deep violet field quantised to an 8-step ramp with a narrow 2x2 ordered-dither band
     at each step. The nebula haze is shaped by the side fortresses' own silhouettes (it hugs
     the walls and pods), plus a halo around the ring; the playfield centre is a smooth dark
     column, so its edge is designed rather than a noise contour.
  2. ring: lavender-violet arc, thick bright core at the top, wide dithered halo.
  3. central citadel: crisp dark silhouette (spire, needles, crossbar, pods, hanging mass),
     rim-lit where it faces the ring.
  4. side fortresses: far towers, then iso tiers descending to the playfield on a 2:1 slope
     (lit walkway tops, facades), towers of varied width/height/caps with glowing slit windows.
Light: overhead plus a lavender rim from the ring; side structures are lit on the edge facing
the playfield. The right side is its own layout drawn in "inner" coordinates and mirrored.
Every pixel is a palette index; the random seed is fixed."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib
import numpy as np
from PIL import Image

# ---- stage palette (dark -> light per ramp) -------------------------------------------------
RAMPS = {
    "space":  ["#07040e", "#0d0718", "#140a24", "#1b0e2f"],
    "nebula": ["#24113a", "#2d1544", "#34184d", "#3c1c58"],
    "far":    ["#0a0614", "#120b21", "#1b1230"],
    "stone":  ["#0a0614", "#17112a", "#221938", "#30244a", "#45365f", "#5f5080", "#776a9a"],
    "ring":   ["#2e1a52", "#4a2f7a", "#6a4aa0", "#aa8ad8", "#d4bdf2"],
    "brass":  ["#2a1f1f", "#46342a", "#67503a", "#8c7352"],
}
PALETTE, IDX = [], {}
for _name, _cols in RAMPS.items():
    IDX[_name] = []
    for _c in _cols:
        IDX[_name].append(len(PALETTE)); PALETTE.append(_c)
SP, NB, FA, ST, RG, BR = (IDX[k] for k in ("space", "nebula", "far", "stone", "ring", "brass"))
SKY = SP + NB                                     # 8-step sky ramp used by the field
S0, S1, S2, S3, S4, S5, S6 = ST
B0, B1, B2, B3 = BR
F0, F1, F2 = FA
W, H = 640, 400
NONE = -1
DITHER = np.array([[0, 2], [3, 1]])               # 2x2 ordered dither
RC = (319.5, 66.0); RR = 46.0                     # ring centre / radius (canvas coords)

def bayer(h, w):
    return (np.tile(DITHER, (h // 2 + 1, w // 2 + 1))[:h, :w] + 0.5) / 4

def dq(f, lo, hi):
    """Quantise a smooth field to integer steps with a narrow 2x2 ordered-dither band."""
    q = np.floor(f); frac = f - q
    q = q + (frac > 0.3 + bayer(*f.shape) * 0.42)
    return np.clip(q, lo, hi).astype(int)

def value_noise(cell, seed):
    """Smooth low-frequency noise (used only to bend haze contours, never per pixel)."""
    r = np.random.default_rng(seed)
    g = r.random((H // cell + 3, W // cell + 3))
    ys, xs = np.mgrid[0:H, 0:W] / cell
    y0, x0 = ys.astype(int), xs.astype(int)
    fy, fx = ys - y0, xs - x0
    fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
    a, b = g[y0, x0], g[y0, x0 + 1]
    c, d = g[y0 + 1, x0], g[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

# ---- drawing helpers on index layers ---------------------------------------------------------
def layer(w=W):
    return np.full((H, w), NONE, dtype=int)

def px(L, x, y, c):
    if 0 <= y < L.shape[0] and 0 <= x < L.shape[1]: L[y, x] = c

def rect(L, x0, y0, x1, y1, c):                   # inclusive-exclusive
    h, w = L.shape
    x0, x1, y0, y1 = max(x0, 0), min(x1, w), max(y0, 0), min(y1, h)
    if x0 < x1 and y0 < y1: L[y0:y1, x0:x1] = c

def darken(L, x0, y0, x1, y1, ramp):
    """Cast shadow: shift existing pixels of `ramp` one step darker."""
    h, w = L.shape
    for y in range(max(y0, 0), min(y1, h)):
        for x in range(max(x0, 0), min(x1, w)):
            c = L[y, x]
            if c in ramp and ramp.index(c) > 0: L[y, x] = ramp[ramp.index(c) - 1]

def composite(dst, src, x_off=0):
    h, w = src.shape
    m = src != NONE
    dst[:, x_off:x_off + w][m] = src[m]

# ---- sky -------------------------------------------------------------------------------------
def inner_edge(L):
    """Per-row inner extent of a side layer, smoothed, so the haze follows the silhouette."""
    occ = L != NONE
    e = np.where(occ.any(1), L.shape[1] - 1 - np.argmax(occ[:, ::-1], 1), 0).astype(float)
    e = np.array([e[max(0, y - 5):y + 6].max() for y in range(H)])
    k = np.ones(25) / 25
    return np.convolve(np.pad(e, 12, mode="edge"), k, mode="valid")

def sky(left, right):
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    el, er = inner_edge(left), inner_edge(right)
    dist = np.minimum(xs - el[:, None], (W - 1 - xs) - er[:, None])
    dist = np.clip(dist, 0, None)
    n = value_noise(36, 11) + 0.45 * (value_noise(14, 12) - 0.5)
    wisp = np.clip(1.5 * n - 0.15, 0, 1.4)                                  # broken cloud tendrils
    haze = 4.6 * np.exp(-dist / 20) * wisp + 0.9 * np.exp(-dist / 55)
    d = np.hypot(xs - RC[0], (ys - RC[1]) * 1.1)
    glow = 2.6 * np.exp(-(d / 70) ** 2) + 1.4 * np.exp(-((d - RR) / 20) ** 2) + 1.6 * np.exp(-(d / 150) ** 2) * wisp
    f = 0.7 + 0.6 * (1 - ys / H) + haze + glow
    centre = np.exp(-((xs - 319.5) / 110) ** 2) * np.clip((ys - 100) / 110, 0, 1)
    f -= 1.4 * centre                                                       # quiet dark column
    return np.array(SKY)[dq(f, 0, len(SKY) - 1)]

def ring(img):
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    dx, dy = xs - RC[0], ys - RC[1]
    d = np.hypot(dx, dy)
    up = np.clip(-dy / np.maximum(d, 1), -1, 1)                            # 1 at top of ring
    u = np.clip(up, 0, 1)
    e = d - RR
    amp = 5.6 * (0.55 + 0.45 * up)
    lam = np.where(e > 0, 4.5 + 4.0 * u, 2.6 + 1.0 * u)
    v = amp * np.exp(-np.abs(e) / lam)
    hw = 1.2 + 2.1 * u                                                      # core half-width
    core = (np.abs(e) < hw) & (up > -0.35)
    band = (np.abs(e) < hw + 1.2 + 0.8 * u) & (up > -0.6)
    lvl = np.where(v < 2.5, dq(v, 0, 4), np.floor(v).astype(int)) - 1
    lvl = np.minimum(lvl, 2)
    lvl = np.where(band, 3, lvl)
    lvl = np.where(core, 4, lvl)
    m = lvl >= 0
    img[m] = np.array(RG)[np.clip(lvl[m], 0, 4)]

# ---- central citadel -------------------------------------------------------------------------
def central(img):
    L = layer()
    def sym_span(y, hw, c):                       # symmetric about x = 319.5
        rect(L, 320 - hw, y, 320 + hw, y + 1, c)
    # hanging mass under the crossbar: inverted ziggurat with ribbed tiers and pinnacles
    tiers = [(79, 50, 9), (88, 43, 9), (97, 36, 10), (107, 29, 9), (116, 23, 11), (127, 16, 10),
             (137, 11, 9), (146, 7, 8), (154, 4, 7), (161, 2, 6), (167, 1, 5)]
    for i, (y, hw, th) in enumerate(tiers):
        for yy in range(y, y + th): sym_span(yy, hw, F0)
        sym_span(y, hw, F2)
        sym_span(y, min(hw, 30 - 2 * i), RG[0] if i < 4 else F2)   # terrace rims under the ring
        for k in range(2 + (i * 3) % 5, hw - 1, 6 + i % 2):   # buttress ribs
            for yy in range(y + 2, y + th - 1):
                px(L, 320 + k, yy, F1); px(L, 319 - k, yy, F1)
        if hw > 3:                                # hanging pinnacles under each tier corner
            ln = 4 + (i % 3) * 2
            for s in (-1, 1):
                x = 320 + hw - 2 if s > 0 else 319 - hw + 2
                for k in range(ln): px(L, x, y + th + k, F0)
                for k in range(ln // 2): px(L, x - s, y + th + k, F0)
    # main spire: stepped from the top edge down into the mass
    prof = [(0, 1), (12, 2), (25, 3), (36, 5), (45, 7), (53, 10), (61, 13), (68, 17)]
    for i, (y, hw) in enumerate(prof):
        y_end = prof[i + 1][0] if i + 1 < len(prof) else 80
        for yy in range(y, y_end):
            sym_span(yy, hw, F0)
            if hw > 2:
                px(L, 320 - hw + 2, yy, F1); px(L, 319 + hw - 2, yy, F1)   # pilasters
        if hw > 2: sym_span(y, hw + 1, F1)        # corbel ledge at each step
    # flanking needles standing on the crossbar
    for off, tip, hw in [(14, 40, 2), (26, 52, 2), (38, 36, 1), (50, 58, 1), (62, 46, 2), (72, 60, 1)]:
        for s in (-1, 1):
            cx = 320 + off if s > 0 else 319 - off
            for yy in range(tip, 76):
                w = min(hw, (yy - tip) // 4)      # tapering needle, 4:1 steps
                rect(L, cx - w, yy, cx + w + 1, yy + 1, F0)
            px(L, cx, tip - 1, F0)
    # crossbar walkway and rails
    rect(L, 180, 74, 460, 78, F1); rect(L, 180, 78, 460, 79, F0)
    for x in range(180, 460):                     # rim-lit top edge, brightest under the ring
        px(L, x, 74, RG[1] if abs(x - 319.5) < 64 else S3 if abs(x - 319.5) < 110 else S2)
    for x in range(184, 456, 7): px(L, x, 76, F0)
    for s in (-1, 1):
        for x in range(0, 124):                   # sagging upper rail between pods
            xx = 320 + 18 + x if s > 0 else 319 - 18 - x
            yy = int(round(66 + 4 * np.sin(x / 123 * np.pi)))
            px(L, xx, yy, F1)
            if x % 11 == 4: rect(L, xx, yy, xx + 1, 74, F1)
        for x in range(0, 74):                    # hanging cable under the bar
            xx = 320 + 56 + x if s > 0 else 319 - 56 - x
            px(L, xx, int(round(80 + 7 * np.sin(x / 73 * np.pi))), F1)
    # hanging spindle pods on the bar
    for off, top, bot, hw in [(80, 44, 126, 5), (128, 56, 108, 3)]:
        for s in (-1, 1):
            cx = 320 + off if s > 0 else 320 - off
            for yy in range(top, bot):
                if yy < top + 10: w = max(1, (yy - top) // 3)
                elif yy < 92: w = hw
                else: w = max(0, hw - (yy - 92) // 3)
                if w == 0:
                    if yy < bot - 1: px(L, cx - 1, yy, F0)
                    continue
                rect(L, cx - w, yy, cx + w, yy + 1, F1)
                rim = S3 if yy < 92 else S2           # edge facing the ring
                px(L, cx - w, yy, rim if s > 0 else F0); px(L, cx + w - 1, yy, F0 if s > 0 else rim)
            for yy in (67, 84):                   # ledge rings
                rect(L, cx - hw - 1, yy, cx + hw + 1, yy + 1, S3)
            for k, yy in enumerate((72, 78, 88)):  # small lit portholes
                px(L, cx - 1 + (k % 2), yy, RG[1])
    composite(img, L)
    # rim light: silhouette pixels whose open neighbour faces the ring and is lit
    mask = L != NONE
    out = img.copy()
    for y in range(1, 175):
        for x in range(170, 470):
            if not mask[y, x]: continue
            vx, vy = RC[0] - x, RC[1] - y
            dd = max(np.hypot(vx, vy), 1)
            best = None
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1)):
                if mask[ny, nx]: continue
                if (nx - x) * vx / dd + (ny - y) * vy / dd < 0.25 and img[ny, nx] not in RG[2:]: continue
                c = img[ny, nx]
                if c in RG[3:]: best = RG[2]
                elif c in RG[1:3] and best is None: best = RG[1]
                elif dd < 110 and best is None and c in NB[2:]: best = F2 if (ny == y - 1) else None
            if best is not None: out[y, x] = best
    img[:] = out
    # sparse lit windows in the hanging mass
    for x, y in [(305, 93), (334, 93), (298, 102), (311, 111), (328, 111), (317, 131), (341, 102),
                 (290, 84), (349, 84), (323, 121), (283, 93)]:
        img[y, x] = RG[2] if (x + y) % 3 == 0 else RG[1]
        img[y + 1, x] = RG[0]

# ---- side fortress modules (drawn for the LEFT side; +x faces the playfield) ------------------
def far_tower(L, x0, w, top, base, r):
    rect(L, x0, top, x0 + w, base, F1)
    rect(L, x0, top, x0 + 1, base, F0)
    rect(L, x0 + w - 1, top, x0 + w, base, F2)
    y = top + 4
    while y < base:                               # ledges
        rect(L, x0 - 1, y, x0 + w + 1, y + 1, F2)
        y += int(r.integers(9, 15))
    cx = x0 + w // 2                              # spire tip
    for k in range(1, w // 2 + 6):
        hw = max(0, w // 2 - k // 2)
        rect(L, cx - hw, top - k, cx + hw + (w % 2), top - k + 1, F1)
    for yy in range(top + 6, base - 3, 7):        # window marks, runs broken irregularly
        on = r.random() < 0.35
        for xx in range(x0 + 2, x0 + w - 2, 4):
            if r.random() < 0.3: on = not on
            if on:
                px(L, xx, yy, RG[0])
                if r.random() < 0.5: px(L, xx, yy + 1, RG[0])

def slab(L, x0, y0, length, tt, fh, r, lit=()):
    """Fortress terrace descending toward the playfield on a 2:1 slope: a wide lit walkway on
    top (merlons, flagstones), a facade below (pilasters, arcade, slot row) and a lit end face."""
    x_end = x0 + length
    joints = set(); x = x0 + int(r.integers(3, 8))
    while x < x_end: joints.add(x); x += int(r.integers(7, 13))
    pil = set(); x = x0 + int(r.integers(4, 9))
    while x < x_end - 4: pil.add(x); x += int(r.integers(9, 14))
    groove = tt // 2 + int(r.integers(-1, 2))
    for x in range(x0, x_end):
        ys = y0 + (x - x0) // 2
        rel = x - x0
        if rel % 5 < 3:                                           # merlons on the back parapet
            px(L, x, ys - 3, S6); px(L, x, ys - 2, S4); px(L, x, ys - 1, S3)
        else:
            px(L, x, ys - 1, S3)
        px(L, x, ys, S6 if rel % 5 < 3 else S5)
        for y in range(ys + 1, ys + tt - 1):                      # walkway, lit from above
            t = (y - ys) / tt
            c = S5 if t < 0.55 else S4
            if x in joints: c = S4 if t < 0.55 else S3
            elif y == ys + groove and rel % 4 != 0: c = S4 if t < 0.55 else S3
            px(L, x, y, c)
        px(L, x, ys + tt - 1, S6 if rel % 3 else S5)              # lit front lip
        fy = ys + tt                                              # facade
        for y in range(fy, fy + fh):
            c = S2
            if y == fy + 1: c = S0                                # shadow under the lip
            elif y > fy + 1: c = S1
            if x in pil and y > fy + 1: c = S3
            elif x - 1 in pil and y > fy + 1: c = S0
            px(L, x, y, c)
        px(L, x, fy + fh, S0)
        darken(L, x, fy + fh + 1, x + 1, fy + fh + 5, ST)
    k = 0
    ps = sorted(pil)
    for a, b in zip(ps, ps[1:]):                                  # arcade bays
        bay = k; k += 1
        xa = a + 2 + ((a + 2 - x0) % 2)
        arch_lit = bay in lit
        for xx in range(xa, b - 1, 4):
            fyy = y0 + (xx - x0) // 2 + tt
            for dx in (0, 1):
                for y in range(fyy + 4, fyy + 4 + int(fh * 0.42)):
                    c = S0
                    if arch_lit: c = RG[3] if (dx == 1 and y > fyy + 6) else RG[2]
                    px(L, xx + dx, y, c)
            arch_lit = arch_lit and r.random() < 0.6
        on = r.random() < 0.3                                     # slot row low on the facade
        for xx in range(a + 2, b - 1, 3):
            fyy = y0 + (xx - x0) // 2 + tt + int(fh * 0.68)
            if r.random() < 0.3: on = not on
            if fyy + 1 < y0 + (xx - x0) // 2 + tt + fh - 1:
                px(L, xx, fyy, RG[1] if on else S0); px(L, xx, fyy + 1, RG[0] if on else S0)
    ye = y0 + (x_end - 1 - x0) // 2                               # end face toward the playfield
    for y in range(ye - 1, ye + tt + fh + 1):
        top = y < ye + tt
        px(L, x_end, y, S6 if top else S3); px(L, x_end + 1, y, S5 if top else S2)
        px(L, x_end + 2, y, S0)

def tower(L, cx, base, w, h, cap, win, r, foot=True):
    x0 = cx - w // 2; x1 = x0 + w; top = base - h
    t1, t2 = 0.22 + 0.14 * r.random(), 0.58 + 0.12 * r.random()  # facet split varies per tower
    for i in range(w):
        f = i / (w - 1)
        c = S0 if i == 0 else S5 if i == w - 1 else S1 if f < t1 else S2 if f < t2 else S3
        rect(L, x0 + i, top, x0 + i + 1, base, c)
    cornices = []
    y = top + int(r.integers(3, 6))
    while y < base - 4:
        cornices.append(y)
        rect(L, x0 - 1, y, x1 + 1, y + 1, S3); px(L, x1, y, S5); px(L, x1 - 1, y, S4); px(L, x0 - 1, y, S1)
        rect(L, x0, y + 1, x1, y + 2, S0)
        y += int(r.integers(11, 20))
    if foot:
        rect(L, x0 - 1, base - 3, x1 + 1, base, S2); rect(L, x0 - 1, base - 3, x1 + 1, base - 2, S4)
        px(L, x1, base - 3, S5); px(L, x0 - 1, base - 3, S1); px(L, x0 - 1, base - 2, S1)
    if win in ("tall", "both"):
        wy0 = top + 6; wy1 = min(base - 6, wy0 + max(12, int(h * 0.55)))
        slits = [cx - 1 + (w >= 15 and w < 19)] if w < 19 else [cx - 5, cx + 3]
        for n, wx in enumerate(slits):
            y0w = wy0 + (3 if n == 0 and len(slits) > 1 else 0)
            rect(L, wx - 1, y0w - 2, wx + 4, wy1 + 1, S0)
            for y in range(y0w - 1, wy1):
                for dx in range(3):
                    if y == y0w - 1:                              # pointed arch
                        if dx == 1: px(L, wx + 1, y, RG[2])
                        continue
                    c = RG[3] if dx == 1 else RG[2]
                    px(L, wx + dx, y, c)
            for y in range(y0w + 5, wy1 - 1, 6): px(L, wx + 1, y, RG[1])   # tracery bars
            rect(L, wx - 1, wy1, wx + 4, wy1 + 1, S4)                     # sill
    if win in ("slots", "both"):
        for cy in cornices[(1 if win == "both" else 0):]:
            yy = cy + 4
            if yy + 2 >= base - 4: continue
            if win == "both" and yy < top + 8 + int(h * 0.55): continue
            on = r.random() < 0.4
            for xx in range(x0 + 2, x1 - 2, 3):
                if r.random() < 0.35: on = not on
                px(L, xx, yy, RG[1] if on else S0); px(L, xx, yy + 1, RG[0] if on else S0)
    capfn = {"dome": dome, "onion": onion, "tiered": tiered, "spire": spire, "cluster": cluster, "flat": flat}
    capfn[cap](L, cx, x0, x1, top, w)

def _dome(L, x0, w, base_y, ry_scale, point):
    rx = (w - 2) / 2; ry = max(3, round(rx * ry_scale)); dcx = x0 + w / 2
    for dy in range(ry + 1):
        t = dy / (ry + 0.5)
        half = rx * (np.sqrt(max(0, 1 - t * t)) if not point else
                     (1.08 * np.sin(np.pi * (0.35 + 0.65 * t)) if t < 0.62 else (1 - t) * 2.2))
        hw = int(round(min(half, rx + 1)))
        for x in range(int(round(dcx - hw)), int(round(dcx + hw))):
            nx = (x + 0.5 - dcx) / max(rx, 1)
            l = 0.55 * nx + 0.75 * t - 0.1
            c = B3 if (l > 0.85 and t < 0.9) else B2 if l > 0.4 else B1 if l > -0.15 else B0
            px(L, x, base_y - dy, c)
    fx = int(dcx)
    tip = base_y - ry - 1
    for k in range(5): px(L, fx, tip - k, B2 if k != 2 else B3)
    px(L, fx - 1, tip - 2, B1); px(L, fx + 1, tip - 2, B1)

def _drum(L, x0, x1, top, rows=3):
    rect(L, x0 + 1, top - rows, x1 - 1, top, S2); rect(L, x1 - 3, top - rows, x1 - 1, top, S3)
    rect(L, x0 + 1, top - rows, x1 - 1, top - rows + 1, S4); px(L, x0 + 1, top - rows + 1, S1)

def dome(L, cx, x0, x1, top, w):
    _drum(L, x0, x1, top); _dome(L, x0, w, top - 3, 0.85, False)

def onion(L, cx, x0, x1, top, w):
    _drum(L, x0, x1, top, 4); _dome(L, x0, w, top - 4, 1.35, True)

def tiered(L, cx, x0, x1, top, w):
    """Narrower lantern drum with slit lights, then a small dome."""
    _drum(L, x0, x1, top, 2)
    a, b = x0 + 3, x1 - 3
    rect(L, a, top - 9, b, top - 2, S2); rect(L, b - 2, top - 9, b, top - 2, S3); px(L, b - 1, top - 9, S5)
    rect(L, a, top - 9, a + 1, top - 2, S1)
    for xx in range(a + 2, b - 1, 3): rect(L, xx, top - 7, xx + 1, top - 3, RG[2])
    rect(L, a - 1, top - 10, b + 1, top - 9, S4)
    _dome(L, a - 1, b - a + 2, top - 10, 0.9, False)

def spire(L, cx, x0, x1, top, w):
    rect(L, x0, top - 1, x1, top, S4)
    sh = int(w * 1.8)
    for k in range(sh):
        hw = (w / 2 - 1) * (1 - k / sh)
        a, b = int(round(cx - hw)), int(round(cx + hw)) + (w % 2)
        b = max(b, a + 1)
        for x in range(a, b):
            px(L, x, top - 2 - k, S2 if x < cx else S5 if x == b - 1 else S3)
    for xx in (x0 + 1, x1 - 2):                    # corner pinnacles
        for k in range(4): px(L, xx, top - 2 - k, S3 if xx > cx else S2)

def cluster(L, cx, x0, x1, top, w):
    """Central spire flanked by two tall pinnacles."""
    spire(L, cx, x0 + 2, x1 - 2, top, w - 4)
    for xx, ln in ((x0 + 1, 9), (x1 - 2, 12)):
        for k in range(ln): px(L, xx, top - 1 - k, S4 if xx > cx else S2)
        px(L, xx, top - 1 - ln, S6 if xx > cx else S3)

def flat(L, cx, x0, x1, top, w):
    for x in range(x0, x1, 3):
        rect(L, x, top - 2, min(x + 2, x1), top, S3); px(L, min(x + 1, x1 - 1), top - 2, S5)

def float_tail(L, cx, base, w):
    """Stepped keel under a floating pod, ending in a spike."""
    k = 0
    while True:
        hw = w // 2 - k // 2
        if hw < 1: break
        a, b = cx - hw, cx + hw + (w % 2)
        rect(L, a, base + k, b, base + k + 1, S1); px(L, b - 1, base + k, S3); px(L, a, base + k, S0)
        k += 1
    for j in range(4): px(L, cx, base + k + j, S1)

def pod(L, x0, x1, y, pw, ph, r):
    """Bracket beam from the wall to a floating turret pod with gun barrels."""
    rect(L, x0, y, x1, y + 3, S1); rect(L, x0, y, x1, y + 1, S4); rect(L, x0, y + 3, x1, y + 4, S0)
    for x in range(x0 + 3, x1 - 2, 6): px(L, x, y + 1, S0)
    cx = x1 + pw // 2
    tower(L, cx, y + ph // 2, pw, ph, "spire", "slots", r, foot=False)
    float_tail(L, cx, y + ph // 2, pw)
    for k, yy in enumerate((y - 4, y + 1, y + 6)):
        ln = 10 + (k % 2) * 5
        rect(L, cx + pw // 2 + 1, yy, cx + pw // 2 + 1 + ln, yy + 1, S3)
        px(L, cx + pw // 2 + ln, yy, S5)
        px(L, cx + pw // 2 + 1, yy + 1, S0)

def side(layout, seed):
    r = np.random.default_rng(seed)
    L = layer(320)
    for x0, w, top in layout["far"]:
        far_tower(L, x0, w, top, H, r)
    rect(L, 0, 0, layout["solid"], H, F0)
    for item in layout["near"]:
        kind = item[0]
        if kind == "slab": slab(L, *item[1:6], r, lit=item[6] if len(item) > 6 else ())
        elif kind == "tower": tower(L, *item[1:7], r)
        elif kind == "pod": pod(L, *item[1:6], r)
        elif kind == "float":
            tower(L, *item[1:7], r, foot=False); float_tail(L, item[1], item[2], item[3])
    return L

# Hand-placed layouts in inner coordinates (x = distance from the outer screen edge).
# Each terrace is followed by the towers standing on it (base = terrace walkway), then the big
# end tower in front of its inner end, so nearer (lower) work overlaps what is behind it.
LEFT = {
    "solid": 14,
    "far": [(0, 24, 30), (20, 14, 56), (32, 18, 40), (48, 12, 132), (58, 16, 104), (72, 12, 150),
            (82, 12, 120), (38, 20, 214), (64, 14, 236), (86, 14, 206), (20, 22, 300), (54, 16, 318),
            (78, 12, 334), (104, 10, 170), (110, 8, 300)],
    "near": [
        ("slab", -6, -40, 106, 17, 24, (2,)),
        ("tower", 104, 64, 21, 70, "dome", "tall"),
        ("slab", -6, 58, 96, 17, 26, (1, 5)),
        ("tower", 16, 83, 13, 58, "spire", "tall"),
        ("tower", 46, 98, 19, 64, "dome", "both"),
        ("tower", 74, 112, 11, 40, "cluster", "slots"),
        ("pod", 106, 134, 128, 9, 30),
        ("tower", 94, 160, 23, 80, "tiered", "tall"),
        ("slab", -6, 160, 112, 18, 24, (4,)),
        ("tower", 26, 191, 17, 66, "onion", "tall"),
        ("tower", 60, 208, 13, 46, "spire", "slots"),
        ("tower", 84, 220, 15, 52, "dome", "tall"),
        ("pod", 118, 142, 236, 7, 24),
        ("tower", 110, 272, 17, 70, "spire", "tall"),
        ("slab", -6, 262, 92, 17, 24, (3,)),
        ("tower", 14, 286, 15, 50, "dome", "slots"),
        ("tower", 42, 299, 21, 72, "tiered", "both"),
        ("tower", 70, 314, 11, 44, "spire", "tall"),
        ("float", 132, 330, 9, 30, "spire", "slots"),
        ("tower", 92, 364, 19, 66, "onion", "tall"),
        ("slab", -6, 360, 100, 17, 26, (2, 6)),
        ("tower", 30, 392, 17, 56, "dome", "tall"),
        ("tower", 64, 409, 13, 44, "cluster", "slots"),
    ],
}
RIGHT = {
    "solid": 12,
    "far": [(0, 28, 10), (24, 12, 70), (36, 16, 30), (50, 14, 150), (66, 12, 128), (80, 10, 90),
            (28, 20, 250), (60, 16, 262), (84, 12, 232), (14, 20, 344), (48, 18, 356), (100, 10, 120),
            (106, 10, 280)],
    "near": [
        ("slab", -6, -10, 100, 17, 26, (3,)),
        ("tower", 20, 17, 15, 40, "dome", "slots"),
        ("tower", 56, 35, 13, 46, "spire", "tall"),
        ("tower", 98, 96, 19, 74, "onion", "tall"),
        ("float", 130, 122, 9, 34, "spire", "slots"),
        ("slab", -6, 100, 108, 18, 24, (2, 6)),
        ("tower", 18, 126, 21, 68, "tiered", "tall"),
        ("tower", 52, 143, 13, 50, "cluster", "slots"),
        ("tower", 80, 157, 15, 46, "dome", "tall"),
        ("pod", 116, 140, 190, 7, 26),
        ("tower", 106, 210, 23, 76, "dome", "both"),
        ("slab", -6, 206, 94, 17, 26, (1,)),
        ("tower", 30, 238, 17, 62, "onion", "tall"),
        ("tower", 62, 254, 11, 42, "spire", "slots"),
        ("pod", 98, 126, 286, 9, 28),
        ("tower", 92, 306, 13, 60, "spire", "tall"),
        ("slab", -6, 304, 104, 17, 24, (4,)),
        ("tower", 16, 329, 13, 52, "dome", "tall"),
        ("tower", 48, 345, 19, 66, "tiered", "both"),
        ("tower", 78, 360, 15, 50, "onion", "tall"),
        ("tower", 102, 412, 19, 62, "dome", "tall"),
    ],
}

def build():
    left = side(LEFT, 21)
    right = side(RIGHT, 22)
    img = sky(left, right)
    ring(img)
    central(img)
    composite(img, left, 0)
    composite(img, right[:, ::-1], W - 320)
    pal = np.array([pixlib.rgb(c) for c in PALETTE], dtype=np.uint8)
    return Image.fromarray(pal[img], "RGB")

if __name__ == "__main__":
    print(pixlib.save_background("citadelBackground", build()))
