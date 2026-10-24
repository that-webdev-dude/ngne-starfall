import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Gatebreaker (stage 1 boss): wide navy battle station, guns pointing down (toward the player).
# 159x79, pivot (79,39), light from the top (screen north).
# Built from plates (angular polygons, filled + outlined + bevelled by one rule) and hand-authored
# modules (turret, core, fins) stamped on a char grid; the left half is drawn and mirrored about
# column 79, then a few asymmetric overrides break the copy.
#
# Frames (spec order): idle, telegraph, wreck-1, wreck-2, wreck-3. Hull only: the turret heads,
# collars and barrels are the separate gatebreakerTurret sprite (source/gatebreakerTurret.py,
# which runs this file for the shared drawing); the hull keeps an empty turret well under each.
# build(turret=False) draws the hull; build() with the turrets is the approved full idle that the
# turret sprite is cut from, build(finish=False) the art as approved before the finish pass.
# Every hull state is a patch over idle: {row: [(x, "chars"), ...]} (" " keeps the pixel) or a
# list of (x, y, char); mirrored patches are given for the left half only.
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
G = []

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

DARKER = {"3": "2", "2": "1", "1": "o", "d": "c", "c": "b", "b": "a"}

def recolor(cells, mapping):
    """Map the characters of the given (already mirrored) cells."""
    for x, y in cells:
        if 0 <= x < W and 0 <= y < H: G[y][x] = mapping.get(G[y][x], G[y][x])

def cast_shadow(m, depth=2, on="21"):
    """Contact shadow straight down (light from the top): the first `depth` pixels below the mask in
    each column darken one step if they are one of `on`."""
    for x, y in m:
        if (x, y + 1) in m: continue
        for k in range(1, depth + 1):
            yy = y + k
            if yy >= H: break
            c = G[yy][x]
            if c in on and (k == 1 or c != "1"): G[yy][x] = DARKER[c]

def mirrored(cells):
    return set(cells) | {(W - 1 - x, y) for x, y in cells}

CORE = ["....fffff....",
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
        "....fffff...."]
CORE_X, CORE_Y = 73, 34
BARREL = ["OxxxO", "OxyxO"] + ["OyzyO"] * 14 + ["OcdcO", "ObcbO"] + ["OyzyO"] * 4 + ["OxxxO", "OOOOO"]
BARREL_Y = 48
SPINE_PTS = [(80, 8), (75, 8), (70, 14), (69, 62), (72, 74), (75, 78), (80, 78)]
XUP_PTS = [(64, 16), (72, 16), (76, 22), (68, 32), (62, 40), (57, 40), (57, 30)]
XLOW_PTS = [(57, 44), (62, 44), (68, 51), (74, 60), (74, 70), (68, 70), (57, 56)]
RIM = disc(32, 43, R10) - disc(32, 43, R8)   # steel turret rim (both turrets)
COLLAR_BOLTS = ((24, 35), (40, 35), (23, 50), (41, 50))

def build(recoil=0, turret=True, finish=True):
    """The hull; with the turret heads (barrels `recoil` px up into the housing) or with empty
    turret wells; with or without the rev01 finish pass (stepped planes, contact shadows)."""
    global G
    G = [["." for _ in range(W)] for _ in range(H)]
    # ------------------------------------------------------------ back layer: fins, pods, wings
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
    # wing slab, pod to spine, with a darker down-facing skirt (finish pass: 1 px top specular)
    wing = poly_mask([(19, 21), (27, 17), (50, 17), (56, 22), (72, 22), (72, 62), (54, 62), (50, 58), (24, 58), (19, 54)])
    plate(wing, "3", "2", "1", top2=None if finish else "3")
    plate(poly_mask([(19, 51), (72, 51), (72, 64), (53, 64), (49, 60), (23, 60), (19, 56)]), "2", "1", "1")
    # outer pod (left), tall armoured block (finish pass: 1 px top specular)
    pod = poly_mask([(6, 13), (17, 13), (21, 17), (21, 59), (17, 64), (8, 64), (3, 59), (3, 18)])
    plate(pod, "3", "2", "1", top2=None if finish else "3")
    # red armour: wing leading-edge chevron, pod flank
    chevron = poly_mask([(33, 20), (37, 15), (50, 15), (56, 21), (56, 25), (46, 25), (42, 20)])
    plate(chevron, "u", "t", "s")
    plate(poly_mask([(1, 31), (5, 27), (5, 52), (1, 48)]), "u", "t", "s")
    # machinery bay between turret and spine
    plate(poly_mask([(47, 27), (60, 27), (60, 55), (47, 55)]), "b", "a", "a")
    # lower steel prongs
    plate(poly_mask([(52, 56), (57, 56), (57, 66), (55, 69), (54, 69), (52, 66)]), "d", "c", "b")
    # spine
    plate(poly_mask(SPINE_PTS), "3", "2", "1", top2="3")
    # ribbed antenna ridge on the spine
    ridge = poly_mask([(80, 2), (78, 2), (75, 8), (75, 24), (80, 24)])
    plate(ridge, "d", "c", "b")
    for y in (8, 12, 16, 20): stamp(76, y, ["dddd", "bbbb"])
    # ------------------------------------------------------------ finish pass: stepped wing and pod planes
    # Each side plate becomes an upper tier (navy[1], lit edge on top) stepping down at a 1 px
    # outline[1] ledge onto a lower tier (navy[0]) that tilts away from the light.
    # wing: the ledge runs above the turret collar and angles up to meet the chevron; the strip
    # between chevron and pylon belongs to the lower tier
    if finish:
        ledge = [(x, 28) for x in range(21, 43)] + [(43, 27), (44, 26), (45, 25)]
        for x, y in ledge: put(x, y, "o")
        lower = {(x, y) for x, y in wing if 21 <= x <= 59 and (y > 28 or (y >= 25 and x + y >= 71) or (x >= 56 and y >= 23))}
        recolor(mirrored(lower), {"2": "1", "3": "1"})
        # pod: ledge under the hatch, parallel to the hatch chamfer
        pledge = [(x, 43) for x in range(4, 16)] + [(16, 42), (17, 41), (18, 40), (19, 39)]
        for x, y in pledge: put(x, y, "o")
        plower = {(x, y) for x, y in pod if x <= 21 and (y > 43 or (y >= 40 and x + y > 58))}
        recolor(mirrored(plower), {"2": "1", "3": "1"})
    # ------------------------------------------------------------ front layer
    # red X plates around the core
    xup = poly_mask(XUP_PTS)
    plate(xup, "u", "t", "s", top2="u")
    xlow = poly_mask(XLOW_PTS)
    plate(xlow, "u", "t", "s")
    # core housing + core
    ring(79, 40, R10, R6, "b", "c", "a", "a", "c")
    stamp(CORE_X, CORE_Y, CORE, mirror=False)
    if turret:
        # turret: navy collar, steel rim, red dome
        ring(32, 43, R13, R10, "2", "3", "1", "2", "2")
        ring(32, 43, R10, R8, "c", "d", "b", "b", "d")
        plate(disc(32, 43, R8), "u", "t", "s", top2="u")
        # gun mantlet and twin brass barrels (shadowed just under the mantlet, dark tip facing away)
        plate(poly_mask([(29, 40), (36, 40), (37, 41), (37, 48), (28, 48), (28, 41)]), "d", "c", "b")
        stamp(30, 44, ["aaaaa"])
        if recoil:  # housing compressed 1 px: drop one equator row of rim, dome and mantlet (all
            # straight-sided there, so no jog) and let the lower half ride up over the collar lip
            head = disc(32, 43, R10)
            for y in range(43, 54):
                for x in range(19, 46):
                    if (x, y) in head: put(x, y, G[y + 1][x])
        stamp(27, BARREL_Y - recoil, [b + ("o" if i < 12 else " ") + b for i, b in enumerate(BARREL)])
    else:
        # empty turret well: the collar's outer rim stays as hull, inside a recess (north wall in
        # shadow, south wall lit, navy[0] floor, steel[0] bearing ring the head turns on)
        well = disc(32, 43, R13)
        wb = border_of(well)
        for x, y in well:
            if (x, y) in wb: c = "O"
            elif any((x + a, y + b) in wb for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = "o" if y < 43 else "2" if y > 43 else "1"
            else: c = "1"
            G[y][x] = c
        for x, y in border_of(disc(32, 43, R8)): G[y][x] = "a"
    if finish:
        # ------------------------------------------------------------ finish pass: contact shadows
        cast_shadow(disc(32, 43, R13), 1)          # under the turret housings
        cast_shadow(chevron, 2, on="2")            # under the red braces where they overlap the plates
        cast_shadow(xup, 2, on="2")
        # recessed mechanism: the ribbed ridge behind the reactor sits one step darker
        recolor(ridge, {"d": "c", "c": "b", "b": "a"})
    # ------------------------------------------------------------ details
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
    if turret:
        for x, y in COLLAR_BOLTS: stamp(x, y, ["z", "x"])
    plate(poly_mask([(74, 53), (80, 53), (80, 59), (76, 59), (74, 57)]), "z", "y", "x")
    # core housing lamps
    stamp(71, 39, ["i", "h", "h"])
    stamp(74, 32, ["hi"])
    stamp(74, 48, ["hh"])
    # ------------------------------------------------------------ right-side variations (no mirror)
    put(145, 21, "a", False)                      # one dead sensor lamp on the right pod
    for x, c in ((105, "a"), (106, "a"), (108, "h"), (109, "h")): put(x, 51, c, False)  # bay lamp moved
    stamp(146, 45, ["iOiOO", "hOhOO", "hOhOO"], mirror=False)  # right flank: two lamp bars, not three
    # ------------------------------------------------------------ outline split
    rows = ["".join(r) for r in G]
    # silhouette edge -> outline[0], interior seam -> outline[1]
    out = [list(r) for r in rows]
    for y in range(H):
        for x in range(W):
            if rows[y][x] == "O":
                nb = [rows[y + dy][x + dx] if 0 <= y + dy < H and 0 <= x + dx < W else "." for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                if "." not in nb: out[y][x] = "o"
    return ["".join(r) for r in out]

# ---------------------------------------------------------------- patch helpers
def apply(rows, patch=None, cells=(), mirror=False):
    """Copy of rows with a row patch {y: [(x, "chars"), ...]} and/or cells [(x, y, c)] written on top."""
    g = [list(r) for r in rows]
    def w(x, y, c):
        if c == " ": return
        g[y][x] = c
        if mirror: g[y][W - 1 - x] = c
    for y, segs in (patch or {}).items():
        for x, s in segs:
            for i, c in enumerate(s): w(x + i, y, c)
    for x, y, c in cells: w(x, y, c)
    return ["".join(r) for r in g]

def remap(rows, cells, mapping):
    """Copy of rows with the characters of `cells` mapped."""
    g = [list(r) for r in rows]
    for x, y in cells: g[y][x] = mapping.get(g[y][x], g[y][x])
    return ["".join(r) for r in g]

def glyph(x0, y0, rows):
    """Cells of a small hand-drawn mark ("." keeps the pixel)."""
    return [(x0 + i, y0 + j, c) for j, r in enumerate(rows) for i, c in enumerate(r) if c != "."]

STEP = {"r": (1, 0), "l": (-1, 0), "d": (0, 1), "u": (0, -1), "R": (1, 1), "L": (-1, 1), "U": (1, -1), "Y": (-1, -1)}

def crack(x, y, moves, c="O"):
    """1 px crack from (x, y): r/l/d/u straight, R/L down-right/down-left, U/Y up-right/up-left."""
    cells = [(x, y, c)]
    for m in moves:
        dx, dy = STEP[m]; x += dx; y += dy; cells.append((x, y, c))
    return cells

CORE_CELLS = [(CORE_X + i, CORE_Y + j) for j, r in enumerate(CORE) for i, c in enumerate(r) if c != "."]

# ---------------------------------------------------------------- idle
FULL = build()                     # hull + both turret heads: the approved full idle
ORIG = build(finish=False)         # the same before the rev01 finish pass (the first approved art)
IDLE = build(turret=False)         # the hull frame

# ---------------------------------------------------------------- telegraph (held for the 0.55 s cue)
# Core cue for the hull's curtain and ring attacks: the reactor steps up one value around a 3 px
# fire[4] plus. Replaces the code-drawn cue rect; the turret cue lives in gatebreakerTurret.
TELEGRAPH = remap(IDLE, CORE_CELLS, {"f": "g", "g": "h", "h": "i", "j": "i"})
TELEGRAPH = apply(TELEGRAPH, cells=[(79, 39, "j"), (78, 40, "j"), (79, 40, "j"), (80, 40, "j"), (79, 41, "j")])

# ---------------------------------------------------------------- wreck states (2/3, 1/3, 0 HP)
# Each stage adds to the one before; nothing heals. Cracks: outline[0], 1:1 or 2:1 steps, mostly on
# lit planes and braces so they read; fires sit in seams and ledges.
FIRE_A = [".h", "hi", "gh"]        # 5 px flame, leaning left
FIRE_B = ["h.", "ih", "hg"]        # 5 px, leaning right
FIRE_C = [".h.", "hig"]            # 4 px, low
FIRE_E = [".h.", "hih", "gig"]     # 7 px, wreck-3
FIRE_F = [".h..", "hih.", "giih", ".gg."]  # 10 px, wreck-3
SMOKE_A = [".ooo.", "ooooo", ".ooo."]
SMOKE_B = [".oo", "ooo", ".o."]
SMOKE_C = ["oo..", "ooo.", ".ooo"]
CHUNK = ["..oooo..",               # torn-out plate: outline[1] void, steel[1] structure inside
         ".oobbboo",
         "oobobbo.",
         ".oobboo.",
         "...oo..."]
CHUNK2 = [".oooo.",
          "oobbbo",
          "obobbo",
          ".oobo.",
          "..oo.."]

W1 = (crack(6, 24, "rRrRrR")            # left pod, below the sensor cap
      + crack(133, 20, "LLLLL")         # right wing, upper tier
      + crack(66, 19, "dLdLd")          # upper-left X brace
      + crack(86, 70, "lLlL")           # spine nose plate
      + glyph(19, 25, FIRE_A)           # pod / wing seam, left
      + glyph(101, 44, FIRE_B))         # bay / brace seam, right

def wreck1(rows):
    rows = remap(rows, XLOW_RIGHT, {"u": "t", "t": "s", "s": "r"})  # one brace darkened
    return apply(rows, cells=W1)

W2 = (crack(151, 18, "dLdL")            # right pod sensor cap
      + crack(36, 22, "RRRRR")          # left wing, under the chevron
      + crack(62, 48, "RdRdR")          # lower-left X brace
      + crack(96, 28, "LdLdL")          # upper-right X brace
      + glyph(24, 21, CHUNK)            # torn chunk, left wing upper tier
      + glyph(93, 21, CHUNK2)           # chunk bitten out of the upper-right X brace edge
      + glyph(56, 23, FIRE_C)           # chevron / pylon strip, left
      + glyph(121, 27, FIRE_A)          # wing ledge, right
      + glyph(19, 24, FIRE_E) + glyph(100, 43, FIRE_E)   # the wreck-1 fires grow
      + glyph(27, 16, SMOKE_A) + glyph(145, 11, SMOKE_C) + glyph(110, 13, SMOKE_B))  # smoke on the top edge

def wreck2(rows):
    return apply(wreck1(rows), cells=W2)

DARKEN = {"3": "2", "2": "1", "d": "c", "c": "b", "b": "a", "u": "t", "t": "s", "s": "r", "z": "y", "y": "x"}
LAMPS_OFF = {"h": "f", "i": "f"}
DEAD_CORE = {"g": "f", "h": "o", "i": "o", "j": "O"}
W3 = (crack(5, 30, "dRdR")              # left pod outer strip
      + crack(61, 30, "RRRR")           # upper-left X brace, across
      + crack(97, 50, "LdLdL")          # lower-right X brace
      + crack(152, 30, "dLdLd")         # right pod outer strip
      + crack(84, 34, "RdRd")           # core housing
      + crack(120, 23, "rRrR")          # right wing upper tier
      + crack(75, 72, "RrR")            # nose
      + crack(44, 53, "RrRr")           # left wing lower tier
      + glyph(19, 52, FIRE_B) + glyph(50, 26, FIRE_A) + glyph(8, 40, FIRE_F) + glyph(56, 34, FIRE_C)
      + glyph(101, 37, FIRE_B) + glyph(148, 41, FIRE_E) + glyph(138, 50, FIRE_B) + glyph(85, 57, FIRE_A)
      + glyph(101, 23, FIRE_B) + glyph(69, 43, FIRE_F)
      + glyph(55, 22, FIRE_F) + glyph(120, 26, FIRE_F)   # the wreck-2 fires grow
      + glyph(71, 10, SMOKE_B) + glyph(13, 11, SMOKE_C))

def wreck3(rows):
    rows = remap(rows, [(x, y) for y in range(H) for x in range(W) if (x, y) not in KEEP_LIT], DARKEN)
    rows = remap(rows, [(x, y) for y in range(H) for x in range(W) if (x, y) not in CORE_CELLS], LAMPS_OFF)
    rows = remap(rows, CORE_CELLS, DEAD_CORE)
    rows = wreck2(rows)
    return apply(rows, cells=W3 + [(78, 39, "g"), (81, 42, "f")])  # two embers left in the dead core

XLOW_RIGHT = {(x, y) for x, y in poly_mask(XLOW_PTS) if x > CX}
# wreck-3 keeps the spine plates and core housing at full value: the lit planes that stay
KEEP_LIT = (poly_mask(SPINE_PTS) - poly_mask(XUP_PTS) - poly_mask(XLOW_PTS)) | disc(79, 40, R10)
KEEP_LIT |= {(x, y) for x in range(21, 59) for y in range(17, 28) if IDLE[y][x] in "23"}  # left wing upper tier (the right one burns)
KEEP_LIT -= set(CORE_CELLS)

FRAMES = [IDLE, TELEGRAPH, wreck1(IDLE), wreck2(IDLE), wreck3(IDLE)]

# ---------------------------------------------------------------- render
if __name__ == "__main__":
    if "--dump" in sys.argv:
        n = int(sys.argv[sys.argv.index("--dump") + 1]) if len(sys.argv) > sys.argv.index("--dump") + 1 else 0
        print(chr(10).join(f"{i:2d} {r}" for i, r in enumerate(FRAMES[n])))
    pixlib.save_sprite("gatebreaker", [pixlib.grid_image(rows, LEGEND) for rows in FRAMES])
