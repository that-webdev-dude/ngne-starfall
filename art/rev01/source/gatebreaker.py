import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Gatebreaker (stage 1 boss): wide navy battle station, guns pointing down (toward the player).
# 159x79, pivot (79,39), light from the top (screen north).
# Built from plates (angular polygons, filled + outlined + bevelled by one rule) and hand-authored
# modules (turret, core, fins) stamped on a char grid; the left half is drawn and mirrored about
# column 79, then a few asymmetric overrides break the copy.
W, H, CX = 159, 79, 79
LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("navy", 0), "2": ("navy", 1), "3": ("navy", 2),
    "r": ("raider", 0), "s": ("raider", 1), "t": ("raider", 2), "u": ("raider", 3),
    "x": ("brass", 0), "y": ("brass", 1), "z": ("brass", 2),
    "f": ("fire", 0), "g": ("fire", 1), "h": ("fire", 2), "i": ("fire", 3), "j": ("fire", 4),
}
G = [["." for _ in range(W)] for _ in range(H)]

def put(x, y, c, mirror=True):
    if c == " ": return
    if 0 <= x < W and 0 <= y < H: G[y][x] = c
    if mirror and 0 <= W - 1 - x < W and 0 <= y < H: G[y][W - 1 - x] = c

def poly_mask(pts):
    """Pixels whose centre lies inside the polygon (left-half coords, mirrored)."""
    m = set()
    ys = [p[1] for p in pts]
    for y in range(max(0, int(min(ys))), min(H, int(max(ys)) + 1)):
        yc = y + 0.5; xs = []
        for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
            if (y0 <= yc) != (y1 <= yc): xs.append(x0 + (yc - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for x in range(W):
                if a <= x + 0.5 < b: m.add((x, y))
    return m | {(W - 1 - x, y) for x, y in m}

def plate(m, top, face, bot, edge="O", top2=None):
    """Fill a mask: 1 px outline, lit top bevel, face, dark bottom bevel (light from the top)."""
    border = {(x, y) for x, y in m if any((x + dx, y + dy) not in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    inner = m - border
    for x, y in m:
        if (x, y) in border: c = edge
        elif (x, y - 1) not in inner: c = top
        elif top2 and (x, y - 2) not in inner: c = top2
        elif (x, y + 1) not in inner: c = bot
        else: c = face
        G[y][x] = c

def stamp(x0, y0, rows, mirror=True):
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c not in " .": put(x0 + i, y0 + j, c, mirror)

def disc(cx, cy, hw):
    """Disc from a hand-corrected half-width table hw[0]=top row .. hw[-1]=middle row."""
    n = len(hw) - 1; m = set()
    for k, w in enumerate(hw):
        for dy in (k - n, n - k):
            for dx in range(-w, w + 1): m.add((cx + dx, cy + dy))
    return m | {(W - 1 - x, y) for x, y in m}

R13 = [3, 6, 8, 9, 10, 11, 11, 12, 12, 12, 13, 13, 13, 13]
R10 = [3, 5, 6, 7, 8, 9, 9, 10, 10, 10, 10]
R8 = [2, 4, 5, 6, 7, 7, 8, 8, 8]
R6 = [2, 4, 5, 5, 6, 6, 6]

def border_of(m):
    return {(x, y) for x, y in m if any((x + dx, y + dy) not in m for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}

def ring(cx, cy, outer, inner, face, otop, obot, itop, ibot, seam="O"):
    """Flat annulus seen from above: outer chamfer lit on the north half, inner lip shadowed on the north half."""
    mo, mi = disc(cx, cy, outer), disc(cx, cy, inner)
    bo, bi = border_of(mo), border_of(mi)
    for x, y in mo:
        if (x, y) in mi: continue
        dy = y - cy
        if (x, y) in bo: c = "O"
        elif any((x + dx, y + dy2) in bo for dx, dy2 in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = otop if dy < 0 else obot if dy > 0 else face
        elif any((x + dx, y + dy2) in mi for dx, dy2 in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = itop if dy < 0 else ibot if dy > 0 else face
        else: c = face
        G[y][x] = c
    for x, y in bi: G[y][x] = seam

def sym(pts):
    """Polygon symmetric about the centre column: give the left half from top-centre to bottom-centre."""
    return pts

# ---------------------------------------------------------------- back layer: fins, pods, wings
# tall pylon behind the wing root: spiked steel blades either side of a navy mast
plate(poly_mask([(54, 28), (54, 12), (58, 3), (60, 3), (61, 4), (61, 28)]), "d", "c", "b")
plate(poly_mask([(60, 0), (69, 0), (69, 30), (60, 30)]), "3", "2", "1")
stamp(60, 0, ["OOOOOOOOO",
              "OcdddddcO",
              "ObbbbbbbO",
              "OcdddddcO",
              "ObbbbbbbO",
              "OaaaaaaaO",
              "O1hhihh1O"], )
# small spike fin on the wing
plate(poly_mask([(44, 22), (43, 15), (46, 6), (48, 6), (51, 15), (51, 22)]), "d", "c", "b")
# pod antennae
plate(poly_mask([(8, 16), (8, 9), (9, 6), (10, 6), (11, 9), (11, 16)]), "d", "c", "b")
plate(poly_mask([(13, 16), (13, 9), (14, 6), (15, 6), (16, 9), (16, 16)]), "d", "c", "b")
# wing slab, pod to spine, with a darker down-facing skirt
plate(poly_mask([(19, 21), (27, 17), (50, 17), (56, 22), (72, 22), (72, 62), (54, 62), (50, 58), (24, 58), (19, 54)]), "3", "2", "1", top2="3")
plate(poly_mask([(19, 51), (72, 51), (72, 64), (53, 64), (49, 60), (23, 60), (19, 56)]), "2", "1", "1")
# outer pod (left), tall armoured block
plate(poly_mask([(6, 13), (17, 13), (21, 17), (21, 59), (17, 64), (8, 64), (3, 59), (3, 18)]), "3", "2", "1", top2="3")
# red armour: wing leading-edge chevron, pod flank
plate(poly_mask([(33, 20), (37, 15), (50, 15), (56, 21), (56, 25), (46, 25), (42, 20)]), "u", "t", "s")
plate(poly_mask([(1, 31), (5, 27), (5, 52), (1, 48)]), "u", "t", "s")
# machinery bay between turret and spine
plate(poly_mask([(47, 27), (60, 27), (60, 55), (47, 55)]), "b", "a", "a")
# lower steel prongs
plate(poly_mask([(52, 56), (57, 56), (57, 66), (55, 69), (54, 69), (52, 66)]), "d", "c", "b")
# spine
plate(poly_mask([(80, 8), (75, 8), (70, 14), (69, 62), (72, 74), (75, 78), (80, 78)]), "3", "2", "1", top2="3")
# ribbed antenna ridge on the spine
plate(poly_mask([(80, 2), (78, 2), (75, 8), (75, 24), (80, 24)]), "d", "c", "b")
for y in (8, 12, 16, 20): stamp(76, y, ["dddd", "bbbb"])
# red X plates around the core
plate(poly_mask([(64, 16), (72, 16), (76, 22), (68, 32), (62, 40), (57, 40), (57, 30)]), "u", "t", "s", top2="u")
plate(poly_mask([(57, 44), (62, 44), (68, 51), (74, 60), (74, 70), (68, 70), (57, 56)]), "u", "t", "s")
# core housing + core
ring(79, 40, R10, R6, "b", "c", "a", "a", "c")
stamp(73, 34, ["....fffff....",
               "..ffgggggff..",
               ".fgghhhhhggf.",
               ".fghhiiihhgf.",
               "fghhiijiihhgf",
               "fghiijjjiihgf",
               "fghiijjjiihgf",
               "fghhiijiihhgf",
               "fgghhiiihhggf",
               ".fgghhhhhggf.",
               ".ffgghhhggff.",
               "..ffgggggff..",
               "....fffff...."], mirror=False)
# turret: navy collar, steel rim, red dome
ring(32, 43, R13, R10, "2", "3", "1", "2", "2")
ring(32, 43, R10, R8, "c", "d", "b", "b", "d")
plate(disc(32, 43, R8), "u", "t", "s", top2="u")
# gun mantlet and twin brass barrels (shadowed just under the mantlet, dark tip facing away)
plate(poly_mask([(29, 40), (36, 40), (37, 41), (37, 48), (28, 48), (28, 41)]), "d", "c", "b")
stamp(30, 44, ["aaaaa"])
BARREL = ["OxxxO", "OxyxO"] + ["OyzyO"] * 14 + ["OcdcO", "ObcbO"] + ["OyzyO"] * 4 + ["OxxxO", "OOOOO"]
stamp(27, 48, [b + ("o" if i < 12 else " ") + b for i, b in enumerate(BARREL)])

# ---------------------------------------------------------------- details
# pod: steel sensor cap with three lamps, lamp bars low on the flank, steel foot
plate(poly_mask([(6, 17), (19, 17), (19, 24), (6, 24)]), "d", "c", "b")
plate(poly_mask([(8, 28), (17, 28), (17, 38), (14, 41), (8, 41)]), "3", "2", "1")
stamp(10, 30, ["....1", "...1.", "..1..", ".1...", "1...."])  # pressed crease across the hatch
plate(poly_mask([(15, 52), (21, 52), (21, 58), (18, 61), (15, 61)]), "u", "t", "s")
stamp(9, 21, ["hOhOh"])
stamp(8, 45, ["iOiOi", "hOhOh", "hOhOh"])
plate(poly_mask([(8, 61), (17, 61), (17, 66), (15, 68), (10, 68), (8, 66)]), "d", "c", "b")
# machinery bay: hazard strip, two pipes, a lamp
stamp(48, 29, ["".join("z" if (c + k) % 4 < 2 else "O" for c in range(9)) for k in range(4)])  # "/" stripes
stamp(48, 37, ["ccccccccc", "bbbbbbbbb", "ooooooooo"])
stamp(48, 44, ["ccccccccc", "bbbbbbbbb", "ooooooooo"])
stamp(52, 51, ["hh"])
# spine: vent grille above the nose, nose lamp
stamp(75, 63, ["ooooo", "bbbbb", "ooooo", "bbbbb", "ooooo", "bbbbb", "ooooo"])
stamp(78, 74, ["ih"])
# brass: collar bolts, trim band under the core
for x, y in ((24, 35), (40, 35), (23, 50), (41, 50)): stamp(x, y, ["z", "x"])
plate(poly_mask([(74, 53), (80, 53), (80, 59), (76, 59), (74, 57)]), "z", "y", "x")
# core housing lamps
stamp(71, 39, ["i", "h", "h"])
stamp(74, 32, ["hi"])
stamp(74, 48, ["hh"])

# ---------------------------------------------------------------- right-side variations (no mirror)
put(145, 21, "a", False)                      # one dead sensor lamp on the right pod
for x, c in ((105, "a"), (106, "a"), (108, "h"), (109, "h")): put(x, 51, c, False)  # bay lamp moved
stamp(146, 45, ["iOiOO", "hOhOO", "hOhOO"], mirror=False)  # right flank: two lamp bars, not three

# ---------------------------------------------------------------- render
rows = ["".join(r) for r in G]
# outline split: silhouette edge -> outline[0], interior seam -> outline[1]
out = [list(r) for r in rows]
for y in range(H):
    for x in range(W):
        if rows[y][x] == "O":
            nb = [rows[y + dy][x + dx] if 0 <= y + dy < H and 0 <= x + dx < W else "." for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            if "." not in nb: out[y][x] = "o"
rows = ["".join(r) for r in out]
if "--dump" in sys.argv: print(chr(10).join(f"{i:2d} {r}" for i, r in enumerate(rows)))
pixlib.save_sprite("gatebreaker", [pixlib.grid_image(rows, LEGEND)])
