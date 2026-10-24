import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Starfall Engine (stage 3 boss): violet star-shaped alien engine. 143x111, pivot (71,48).
# Long blades radiate from two side emitter housings; bone spires and ribbed steel pods flank a
# tall hull with the core. Light from the top (screen north).
# Weak points (glow ramp): core (71,48), emitters (30,47)/(112,47), lower emitter (71,78).
#
# HALF is the approved rev01 art (left half incl. centre column 71, mirrored to APPROVED), kept
# verbatim. Everything else is a patch over it, so the frames stay in sync:
#   finish()  rev01 finish pass -> FULL (phase-1 with the emitters, what starfallEmitter is cut
#             from): stepped blade armour (upper plane engine[1] with a 1 px lit top edge, 1 px
#             outline[1] ledges, lower planes engine[0]), steel[2] edge trim on the blade edges that
#             sit against the Citadel portal, contact shadows, recessed couplers/ribs by the core.
#   well()    hull only: the two side emitters (lens, bone ring, clamps) are the separate
#             starfallEmitter sprite (source/starfallEmitter.py runs this file); the hull keeps the
#             housing rim around an empty well -> P1.
#   frames    phase-1, phase-2, phase-3, surge-1, surge-2, surge-3, defeat: patches over P1
#             (phase3 builds on phase2, surge-N on phase-N, defeat on phase3), cell lists in
#             full-canvas coordinates, not mirrored.
#
# Blades: two hard facets split on a spine; the facet that faces up is engine[1], the other
# engine[0]. Core: steel[3]/bone[1] four-point star in a glow[2] -> glow[1] corona, gripped by bone
# talons. Emitters: magenta glow lenses in a bone ring broken by three clamps (wide lit one on top,
# dark gaps lower left/right). The silhouette touches the canvas only at the centre spire tip
# (row 0) and the tail tip (row 110), as approved.
LEGEND = {
    ".": None,
    "o": ("outline", 0), "q": ("outline", 1),
    "1": ("engine", 0), "2": ("engine", 1), "3": ("engine", 2),
    "5": ("glow", 0), "6": ("glow", 1), "7": ("glow", 2),
    "8": ("bone", 0), "9": ("bone", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
}
HALF = [
    "......................................................................o9",  # 0 centre spire tip
    "......................................................................o9",  # 1
    "......................................................................o9",  # 2
    "............................................................o.........o9",  # 3
    "...........................................................o1o.......o99",  # 4 crown blades
    "...........................................................o1o.......o99",  # 5
    "...........................................................o13o......o99",  # 6
    ".................................................o........o113o......o99",  # 7
    "............o...................................o9o.......o113o......o99",  # 8 upper blade tip
    "...........o1o..................................o9o.......o113o......o99",  # 9
    "............o1o.................................o9o.......o1123o.....o99",  # 10
    "............o13o.........................o......o9o.......o1123o....o899",  # 11
    "............o113o.......................oco....o898o......o1123o....o899",  # 12 steel mast
    ".............o123o......................oco....o898o.....o11123o....o899",  # 13
    ".............o1123o.....................oco....o898o.....o111223o..oq899",  # 14
    ".............o11223o....................oco....o898o.....o111123o.o3q899",  # 15
    "..............o11223o...................oco....o898o.....o111123oo33q899",  # 16
    "..............o112223o..................oco....o898o.....o111123o333q899",  # 17
    "..............o1112223o.................oco....o898o.....o11112q3333q899",  # 18
    "...............o1122223o................oco...o88988o...o111112q333q8899",  # 19
    "...............o11122223o...............oco...o88988o...o11111q3333q8899",  # 20
    "...............o111222223o..............oco...o88988o...o1111q33333q8899",  # 21
    "................o111222223o.............oco..oo88988o...o1111q33333q8899",  # 22
    "................o1112222223o............oco.o33qqqqqo....o11q3333333qqqq",  # 23 pod top, crown plate
    "................o11112222223o...........oco.o2222222o....o1q33333q333333",  # 24
    ".................o15122222223o..........oco.o2222222o.....oq33333q333333",  # 25
    ".................o115122222223o.........ocooo2222222o.....o23222q3333333",  # 26
    ".................o1151122222223o........occcc22ccccco....o222222q2223333",  # 27
    "..................o1511222222223o.......ocaaa22aaaaao....o22222q22222222",  # 28
    "..................o11511222222223o......ocooo22qqqqqo...o222222q22222222",  # 29
    "..................o111512222222223o.....oco.o22ccccco...o11222q222222222",  # 30
    "...................o115112222222223o....oco.o22aaaaao..o1111222222999999",  # 31
    "...................o1151122222222223o...oco.o22qqqqqo..o111111229922qqqq",  # 32
    "...................o11151122222222223o..oco.o22ccccco.o1111111992qqq3333",  # 33 core ring top
    "....................o1111122qqqqq2223o..oco.o22aaaaa2oo11111111qq3333333",  # 34
    "....................o1111qqqq333qqqq3o..oco..o2qqqqq2o11111111q333333333",  # 35
    "....................o11qq333q333q333oo..oco..o2ccccc2o1111111q3333333999",  # 36
    ".....................oq33333q333q33333o.obo..o2aaaaa2q111111q33333999999",  # 37
    ".....................o333999q333q999333oobo..o2qqqqq2q11111q333399999qqq",  # 38
    "....................o3339999q333q9999333obo..o2ccccc2q1111q3333999qqq666",  # 39
    "...................o222999qqq222qqq999222qo..o2222222q222q3333999qq66677",  # 40
    "...................o22999q666666666q99922qo..o2222222q222q22299999666679",  # 41
    "................ooo22999q66666666666q99922o..o2222222q22q222299q89966779",  # 42
    ".............ooo33q2299q6666777776666q9922o..o2222222q22q22299qq68996799",  # 43
    "..........ooo33322q2299q6667777777666q9922ooooqqqqqqqqqqq22299q66668779d",  # 44
    ".......ooo3332222q2299q666677777776666q9922q99999999999q222299q66667799d",  # 45
    "......o3332222222q2299q666677777776666q9922q88888888888q22299q66677799dd",  # 46
    "......o1111111111q2288q666677777776666q8822qbqbbqbbqbbqq22299q6777999ddd",  # 47 emitter + core centre row (pivot y=48)
    ".......ooo1111111q2288q566667777766665q8822qbqbbqbbqbbqq22288q6799dddddd",  # 48
    "..........ooo1111q2288q566666666666665q8822qbqbbqbbqbbqq22288q5777999ddd",  # 49
    ".............ooo11q2288q5666666666665q8822qaaaaaaaaaaaaq22288q55677799dd",  # 50
    "................ooo2211q5566666666655q1122ooooqqqqqqqqqq222288q5666779dd",  # 51
    "..................o22111q55666666655q11122o..o2222222q22q22288q556667799",  # 52
    "..................oo11188q555555555q88111o...o2222222q22q22218qq56866779",  # 53
    ".................o3q111188qq55555qq881111o...o2ccccc2q22q111118q58666677",  # 54
    "................o322q1111188qqqqq8811111o....o2aaaaa2q222q11111885556666",  # 55 lower blade
    "...............o32222q11111188888111111o.....o2qqqqq2q222q1111118qq55556",  # 56
    "...............o322222q111111111111111o......o2ccccc2q2222q1111118qqq555",  # 57
    "..............o32222222qq11111111111oo.......o2aaaaa11q1111q111111888qqq",  # 58
    "..............o3222222222qqq11111qoo..........oqqqqq11q11111q11111111888",  # 59
    ".............o32222222222211qqqqq11o..........occccc11q111111q1111111111",  # 60
    ".............o3222222222211111111111o.........oaaaaa11q1111112q111111111",  # 61
    "............o3222222222211111111111o..........oqqqqq11q11111122qq1111111",  # 62
    "............o322222222211111111111o...........occccc11q1111112222qqq1111",  # 63
    "...........o3222222222111111111111o...........oaaaaa11q1111112222222qqqq",  # 64
    "...........o322222222111111111111o............oqqqqq11q11111112222222222",  # 65
    "..........o3222222221111111111111o............occccc11o11111112222222222",  # 66
    "..........o322222221111111111111oo............o2222211o11111112222222qqq",  # 67
    ".........o322222221111111111111o33ooooo.......o2221111o11111111222qqqq33",  # 68 lower emitter top
    ".........o32222221111511111111o32233111ooo....o1111111oo111111112q333q33",  # 69
    "........o3222222111151111111ooo32221111111o...o11qoooo.o11111111q3333q33",  # 70
    "........o32222211115111111oo..o3222111111o.....oabao...o1111111q22299q33",  # 71
    ".......o3222221111511111oo...o32221111111o......obo.....o11111q222999q33",  # 72
    ".......o32222111151111oo.....o32221111111o......obo.....o1111q222999qq22",  # 73
    "......o3222211115111oo.......o3221111111o.......obo.....o1111q22999q6777",  # 74
    "......o32221111511oo........o32221111111o.......obo......o111q2299q67777",  # 75
    ".....o3222111151oo..........o3221111111o........obo......o12q22999q67777",  # 76
    ".....o32211111oo............o322111111o.........obo......o12q2299q667777",  # 77
    "....o3221111oo.............o322111111o..........obo.......o1q2288q567777",  # 78 lower emitter centre
    "....o32111oo...............o32211111o...........obo.......o1q2288q566777",  # 79
    "...o3211oo.................o3211111o.............o........o1q22888q56666",  # 80
    "...o31oo..................o3221111o........................o1q2211q55666",  # 81
    "..o3oo....................o321111o.........................o1q22111q5555",  # 82
    "...o......................o32111o..........................o1q222188qq55",  # 83
    ".........................o32111o..........................o3q1q1111888qq",  # 84 tail spikes
    ".........................o3211o..........................o32q11q11111888",  # 85
    ".........................o311o...........................o32q111q1111111",  # 86
    "........................o321o............................o322q111q111111",  # 87
    "........................o31o............................o3222q1111qqq111",  # 88
    "........................o3o.............................o3222q1111111q89",  # 89
    ".......................o3o..............................o32222q121111q89",  # 90
    "........................o................................o3222q1q2111q89",  # 91
    ".........................................................o3222q11q211q89",  # 92
    ".........................................................o32221q11q21q89",  # 93
    "..........................................................o3221q111q1q89",  # 94
    "..........................................................o3221q11111q89",  # 95
    "..........................................................o32211o1111q89",  # 96
    "...........................................................o321oo1111q89",  # 97
    "...........................................................o321o.o111q89",  # 98
    "...........................................................o321o.o111q89",  # 99
    "............................................................o31o..o11118",  # 100
    "............................................................o31o..o11118",  # 101
    "............................................................o3o....o1118",  # 102
    ".............................................................o.....o1118",  # 103
    "....................................................................o118",  # 104
    "....................................................................o118",  # 105
    ".....................................................................o11",  # 106
    ".....................................................................o11",  # 107
    "......................................................................o1",  # 108
    "......................................................................o1",  # 109
    ".......................................................................o",  # 110 tail tip
]

W, H, CX = 143, 111, 71
APPROVED = [r + r[-2::-1] for r in HALF]     # the approved rev01 art, emitters included

# ---------------------------------------------------------------- helpers (full-canvas coordinates)
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

def mirrored(cells):
    return set(cells) | {(W - 1 - x, y) for x, y in cells}

def left(cells):
    return {(x, y) for x, y in cells if x <= CX}

def flood(rows, seed, chars):
    """4-connected region of `chars` around `seed`."""
    seen, todo = set(), [seed]
    while todo:
        x, y = todo.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < H) or rows[y][x] not in chars: continue
        seen.add((x, y))
        todo += [(x + dx, y + dy) for dx, dy in N4]
    return seen

def apply(rows, cells, mirror=False):
    """Copy of rows with cells [(x, y, c)] written on top (optionally mirrored about column 71)."""
    g = [list(r) for r in rows]
    for x, y, c in cells:
        g[y][x] = c
        if mirror: g[y][W - 1 - x] = c
    return ["".join(r) for r in g]

def remap(rows, cells, mapping):
    """Copy of rows with the characters of `cells` mapped."""
    g = [list(r) for r in rows]
    for x, y in cells: g[y][x] = mapping.get(g[y][x], g[y][x])
    return ["".join(r) for r in g]

def glyph(x0, y0, art):
    """Cells of a small hand-drawn mark ("." keeps the pixel)."""
    return [(x0 + i, y0 + j, c) for j, r in enumerate(art) for i, c in enumerate(r) if c != "."]

STEP = {"r": (1, 0), "l": (-1, 0), "d": (0, 1), "u": (0, -1), "R": (1, 1), "L": (-1, 1), "U": (1, -1), "Y": (-1, -1)}

def crack(x, y, moves, c="o"):
    """1 px crack from (x, y): r/l/d/u straight, R/L down-right/down-left, U/Y up-right/up-left."""
    cells = [(x, y, c)]
    for m in moves:
        dx, dy = STEP[m]; x += dx; y += dy; cells.append((x, y, c))
    return cells

# ---------------------------------------------------------------- regions of the approved art (left half)
UB = flood(APPROVED, (25, 28), "1235")       # upper blade
LB = flood(APPROVED, (20, 65), "1235")       # lower blade
CB = flood(APPROVED, (60, 8), "123")         # crown blade
# emitter: lens, bone ring and clamps, everything inside the housing (the housing rim stays hull)
EMITTER_X, EMITTER_Y = 30, 47                # leftEmitter socket (-41, -1)
RING_HW = {38: 5, 39: 6, 40: 7, 41: 8, 45: 10, 46: 10, 47: 10, 48: 10, 49: 10, 53: 7, 54: 6, 55: 4, 56: 2}   # bone ring outer half-widths (9 elsewhere)
EMITTER = {(EMITTER_X + dx, y) for y in range(38, 57) for dx in range(-RING_HW.get(y, 9), RING_HW.get(y, 9) + 1)}
EMITTER |= {(x, y) for x in range(28, 33) for y in range(35, 38)}   # top clamp, below its cap row
# core: corona (glow) and star inside the bone ring
CORE_BOX = {(x, y) for x in range(61, 82) for y in range(39, 58)}
CORONA = {(x, y) for x, y in CORE_BOX if APPROVED[y][x] in "567"}
STAR = {(x, y) for x, y in CORE_BOX if APPROVED[y][x] == "d"}

# ---------------------------------------------------------------- finish pass (phase-1)
# Blades become stepped armour: an upper plane (engine[1], 1 px lit top edge) steps down at a 1 px
# outline[1] ledge onto lower planes that tilt away from the light (engine[0]). Ledges run square
# to the blade across both facets.
def finish(rows):
    cells = []
    for x, y in UB:                              # upper blade: tip plane / ledge x+y=53 / root plane
        c, s = rows[y][x], x + y
        if s == 53: cells.append((x, y, "q"))
        elif s > 53 and c in "23": cells.append((x, y, "1"))
        elif s < 53 and c == "3": cells.append((x, y, "c"))      # steel edge trim (portal separation)
    for x, y in LB:                              # lower blade: root / ledge / mid / ledge / tip
        c, d = rows[y][x], x - y
        if d in (-49, -62): cells.append((x, y, "q"))
        elif -62 < d < -49 and c == "3": cells.append((x, y, "2"))
        elif d < -62 and c in "23": cells.append((x, y, "1"))
        elif c == "2" and (rows[y - 1][x] == "q" or rows[y][x + 1] == "q") and (x, y - 1) not in LB:
            cells.append((x, y, "1"))           # contact shadow under the emitter housing
    cells.append((21, 69, "1"))                  # the glow seam starts under ledge 1 (no q/5 checker)
    for x, y in CB:                              # crown blade: steel edge trim on its lit edge
        if rows[y][x] == "3" and y <= 17: cells.append((x, y, "c"))
    # contact shadow on the crown plate along the crown blade's lower edge
    seam = {(x, y) for x in range(58, 66) for y in range(17, 26) if rows[y][x] == "q" and any((x + dx, y + dy) in CB for dx, dy in N4)}
    for x, y in seam:
        for dx, dy in ((1, 0), (0, 1)):
            if rows[y + dy][x + dx] == "3" and (x + dx, y + dy) not in CB: cells.append((x + dx, y + dy, "2"))
    # recessed machinery: the steel couplers and ribs flanking the core sit one step darker
    mach = {(x, y) for x in range(43, 57) for y in range(44, 52)} | {(x, y) for x in range(45, 53) for y in range(23, 71)}
    rows = apply(rows, cells, mirror=True)
    return remap(rows, mirrored(mach), {"d": "c", "c": "b", "b": "a"})

FULL = finish(APPROVED)                      # phase-1 with the emitters: what starfallEmitter is cut from

# ---------------------------------------------------------------- emitter well (hull only)
# The housing rim stays; inside it a recess: outline rim, shadowed north wall, lit south wall,
# engine[0] floor and the steel[0] bearing ring the lens sits on.
def well(rows):
    m = EMITTER
    border = {(x, y) for x, y in m if any((x + dx, y + dy) not in m for dx, dy in N4)}
    bearing = {(x, y) for x, y in m if 6 <= ((x - EMITTER_X) ** 2 + (y - EMITTER_Y) ** 2) ** 0.5 < 7}
    cells = []
    for x, y in m:
        near = any((x + dx, y + dy) in border for dx, dy in N4)
        if (x, y) in border: c = "o"
        elif near: c = "q" if y < EMITTER_Y else "2" if y > EMITTER_Y + 2 else "1"
        elif (x, y) in bearing: c = "a"
        else: c = "1"
        cells.append((x, y, c))
    return apply(rows, cells, mirror=True)

P1 = well(FULL)

# ---------------------------------------------------------------- damage states (2/3, 1/3 HP)
# Each phase adds damage that reads at 1x; nothing heals. Torn plates: a jagged outline[0] edge
# around an outline[1] void with lit steel ribs inside (steel[2] with a steel[3] glint over
# steel[1], one void row between ribs). Flares: 3x3 glow[2] bursts on seams. Cracks (outline[0],
# 1:1 / 2:1 steps) are detail on top. Not mirrored, so the symmetry breaks.
def rows_mask(spans, mirror=False):
    """{y: (x0, x1)} -> cells (left-half spans, optionally moved to the right half)."""
    m = {(x, y) for y, (x0, x1) in spans.items() for x in range(x0, x1 + 1)}
    return {(W - 1 - x, y) for x, y in m} if mirror else m

def tear(mask):
    """Cells of a torn-open plate over `mask`: outline[0] torn edge, outline[1] void, a lattice of
    lit steel inside (steel[2] ribs with a steel[3] glint at the lit end, steel[1] spar between)."""
    border = {(x, y) for x, y in mask if any((x + dx, y + dy) not in mask for dx, dy in N4)}
    inner = mask - border
    y0 = min(y for _, y in inner)
    xs_all = sorted(x for x, _ in inner)
    spar = xs_all[len(xs_all) // 2]
    cells = [(x, y, "o") for x, y in border]
    for x, y in inner:
        xs = sorted(xx for xx, yy in inner if yy == y)
        if (y - y0) % 2 == 0: c = "b" if x == spar else "q"      # void between ribs, spar crossing it
        elif x == xs[-1] and len(xs) > 2: c = "q"                # rib ends short of the shadowed side
        else: c = "d" if x == xs[0] else "c"                     # rib, glint at its lit end
        cells.append((x, y, c))
    return cells

def flare(x, y):
    """3x3 glow[2] burst centred on a seam pixel."""
    return glyph(x - 1, y - 1, ["676", "777", "676"])

TEAR_UB = tear(rows_mask({14: (15, 16), 15: (15, 17), 16: (15, 18), 17: (15, 19), 18: (15, 20), 19: (16, 21),
                          20: (16, 22), 21: (17, 23), 22: (17, 24), 23: (18, 24), 24: (19, 24), 25: (21, 23)}))              # left upper blade tip plane
TEAR_LB = tear(rows_mask({65: (14, 15), 66: (13, 16), 67: (13, 17), 68: (12, 18), 69: (12, 19), 70: (11, 20),
                          71: (11, 20), 72: (12, 21), 73: (13, 20), 74: (14, 18)}, mirror=True))                           # right lower blade mid plane
TEAR_CL = tear(rows_mask({40: (55, 58), 41: (54, 59), 42: (54, 59), 43: (54, 59), 44: (54, 59), 45: (55, 59),
                          46: (55, 58), 47: (56, 58)}))   # core housing, left side
TEAR_CR = tear(rows_mask({49: (56, 58), 50: (55, 58), 51: (55, 59), 52: (54, 59), 53: (54, 59), 54: (54, 60),
                          55: (54, 59), 56: (55, 59), 57: (56, 58)}, mirror=True))  # right side, lower
# right lower blade tip plane torn away: void inside the outline, the steel spar along the spine
# (steel[2] with a steel[3] top edge) and two steel[1] cross ribs left standing
TIP_GONE = []
for x, y in LB:
    if x - y < -62:
        c = "c" if x + y == 85 else "d" if x + y == 84 else "b" if x - y in (-66, -71) else "q"
        TIP_GONE.append((W - 1 - x, y, c))
    elif x - y == -62:
        TIP_GONE.append((W - 1 - x, y, "o"))      # the plate's torn edge

RIGHT_UB_TIP_LIT = {(W - 1 - x, y) for x, y in UB if x + y < 53 and P1[y][x] in "2c"}

D2 = (TEAR_UB + TEAR_LB
      + crack(12, 66, "RRdR")                     # left lower blade, mid plate
      + crack(125, 58, "LdLd")                    # right lower blade, root plate
      + crack(77, 35, "RRdR")                     # core housing, right
      + flare(25, 28)                             # left upper blade ledge
      + flare(79, 28))                            # right dome seam

def phase2(rows):
    rows = remap(rows, RIGHT_UB_TIP_LIT, {"2": "1", "c": "b"})   # one blade's lit facet goes dark
    rows = remap(rows, CORONA, {"5": "6", "6": "7"})              # corona one value brighter
    return apply(rows, D2)

D3 = (TEAR_CL + TEAR_CR + TIP_GONE
      + crack(23, 21, "LdLd")                     # left upper blade, tip plate (beside the tear)
      + crack(66, 34, "LdL")                      # core housing, left
      + crack(76, 64, "RdRr")                     # lower hull plate
      + crack(61, 26, "dLdR")                     # left side panel
      + flare(11, 73)                             # left lower blade ledge 2
      + flare(89, 42))                            # right pod / hull seam

def phase3(rows):
    rows = phase2(rows)
    rows = apply(rows, [(x, y, "9") for x, y in CORONA if APPROVED[y][x] == "7"])   # reactor at glow[2], bone[1] centre
    return apply(rows, D3)

# ---------------------------------------------------------------- surge-N (held for the 0.7 s cue)
# core cue for the curtain and ring attacks on top of phase-N, so damage away from the core never
# disappears. Every surge only adds light to its own phase (phase-2/3 already run a glow[2] corona,
# so the cue has to come from white, not pink): the corona one step up (pink kept between star and
# rim), the steel[3] star grown (arms +-8 instead of +-5, a radius-4 diamond body) with a 1 px
# bone[1] halo, a 1 px steel[3] ring just inside the outline[1] lens rim, and the bone[0] side of the
# bone ring and talons round the lens lit to bone[1].
def grow(cells, within):
    return {(x + dx, y + dy) for x, y in cells for dx, dy in N4} & within | set(cells)

# the lens interior: everything inside the outline[1] rim (corona, inner bone ring, talon tips, star)
LENS = flood(["".join(APPROVED[y][x] if ((x - CX) / 9.5) ** 2 + ((y - 47.5) / 9) ** 2 <= 1 else "q" for x in range(W)) for y in range(H)], (CX, 48), "56789d")
# grown star: four-point star sqrt|dx| + sqrt|dy| <= sqrt(8) (arms reach +-8) over a radius-4 diamond body
SURGE_STAR = {(x, y) for x, y in LENS if abs(x - CX) ** 0.5 + abs(y - 48) ** 0.5 <= 8 ** 0.5 + 1e-9 or abs(x - CX) + abs(y - 48) <= 4}
SURGE_HALO = grow(SURGE_STAR, LENS) - SURGE_STAR
RIM_RING = {(x, y) for x, y in CORONA if any(APPROVED[y + dy][x + dx] == "q" and (x + dx, y + dy) not in LENS for dx, dy in N4)}
# the bone ring and talons round the lens (shadowed bone[0] side), lit by the core
TALONS = {(x, y) for y in range(33, 62) for x in range(57, 86) if (x, y) not in LENS and APPROVED[y][x] == "8"
          and ((x - CX) / 13) ** 2 + ((y - 47.5) / 12) ** 2 <= 1}

def surge(rows, n):
    rows = remap(rows, CORONA, {"5": "6", "6": "7"})
    rows = remap(rows, TALONS, {"8": "9"})
    return apply(rows, [(x, y, "9") for x, y in SURGE_HALO] + [(x, y, "d") for x, y in SURGE_STAR | RIM_RING])

# ---------------------------------------------------------------- defeat
# phase-3 darkened one step (tears included); the spires and the lower emitter stay lit so it does
# not go dead; core dark (glow[0] / outline, dead steel star); embers (glow ramp) in the seams
DARKEN = {"3": "2", "2": "1", "d": "c", "c": "b", "b": "a", "9": "8"}
SPIRES = {(x, y) for x in range(47, 54) for y in range(6, 23)} | {(x, y) for x in range(69, 74) for y in range(0, 23)}
LOWER_EMITTER = {(x, y) for x in range(58, 85) for y in range(67, 85)}
KEEP_LIT = mirrored(SPIRES) | LOWER_EMITTER
DE = ([(10, 72, "6"), (11, 73, "7"), (12, 74, "6")]          # left lower blade ledge 2
      + [(53, 41, "6"), (53, 42, "7")]                       # left pod / hull seam
      + [(121, 56, "7"), (120, 57, "6")]                     # right housing / lower blade seam
      + [(25, 35, "6"), (26, 35, "7")]                       # left housing top arc
      + [(60, 59, "6"), (61, 60, "7"), (62, 61, "6")]        # lower hull seam
      + [(125, 46, "6"), (125, 47, "7")]                     # right side spike / housing seam
      + [(68, 45, "6"), (74, 51, "5")])                      # two embers left in the dead core

def defeat(rows):
    rows = phase3(rows)
    rows = remap(rows, [(x, y) for y in range(H) for x in range(W) if (x, y) not in KEEP_LIT and (x, y) not in CORE_BOX], DARKEN)
    rows = remap(rows, CORONA, {"9": "5", "7": "5", "6": "q", "5": "q"})
    rows = remap(rows, STAR, {"d": "a"})
    rows = remap(rows, [(x, y) for x, y in CORE_BOX if (x, y) not in CORONA and (x, y) not in STAR], {"9": "8"})
    return apply(rows, DE)

P2, P3 = phase2(P1), phase3(P1)
FRAMES = [P1, P2, P3, surge(P1, 1), surge(P2, 2), surge(P3, 3), defeat(P1)]

if __name__ == "__main__":
    if "--dump" in sys.argv:
        n = int(sys.argv[sys.argv.index("--dump") + 1])
        print(chr(10).join(f"{i:3d} {r}" for i, r in enumerate(FRAMES[n])))
    pixlib.save_sprite("starfallEngine", [pixlib.grid_image(rows, LEGEND) for rows in FRAMES])
