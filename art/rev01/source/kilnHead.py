import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Kiln Serpent head, 65x47, pivot (32,23). Canvas keeps the source orientation (stack up, drill down);
# the engine draws it rotated -90 degrees, so canvas +x (right) is screen top and canvas top is screen left.
# Light therefore comes from canvas +x (the right cutter/arm is the lit, screen-top side) plus a frontal fill.
# Parts: exhaust stack = rear coupling (top centre, glowing port), chest vent, amber core on the pivot,
# fluted drill (bottom centre), shoulder pads, hazard-striped forearms, hydraulic rods, two hooked saw cutters
# (same disc on both sides, not mirrored, so the light stays on +x).
LEGEND = {
    ".": None,
    "o": ("outline", 0), "n": ("outline", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("rust", 0), "2": ("rust", 1), "3": ("rust", 2), "4": ("rust", 3),
    "5": ("fire", 0), "6": ("fire", 1), "7": ("fire", 2), "8": ("fire", 3), "9": ("fire", 4),
}
ROWS = [
    "...........................oabbbccccdo...........................",
    "..........................oabbooooocddo..........................",
    ".........................oabbobnnnnocddo.........................",
    ".........................oabbob565nocddo.........................",
    ".........................oabbobnnnnocddo.........................",
    "...............oooooooooooaabbooooocdddooooooooooo...............",
    "..............o22222222222naabbbcccdddn33333333333o..............",
    ".............o222233333333nonnnnnnnnnon333333334444o.............",
    "............o2222233333n2233bbbbcccdd3344n3333344444o............",
    "...........o2222233333n2223333333333333444n3333344444o...........",
    "..........o2222223333n22a233333333333334c44n3333444444o..........",
    "..........o222222333n2222233nnnnnnnnn3344444n333444444o..........",
    ".........oo222a23333n2222233bbbcccddd3344444n33334c444oo.........",
    "........o22n22223333n2222233nnnnnnnnn3344444n33334444n44o........",
    ".......o223n22223333n2222223bbbcccddd3444444n33334444n344o.......",
    "......o2233nnnnnnnnnn2222223nnnnnnnnn3444444nnnnnnnnnn3344o......",
    ".....o22333333334nnnn22222233333333333444444nnnn23333333344o.....",
    "....o223333333334nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn233333333344o....",
    "...o22nn44nn44334bbbb22222233333333333444444cccc23344nn44nn44o...",
    "..o223n44nn44n334cccc22nnn2333abccd3334nnn44dddd233n44nn44n344o..",
    "..o22344nn44nn334aaaa22aaa233an676nd334bbb44cccc233nn44nn44344o..",
    "..o2234nn44nn4334nnnn22nnn23an67876nd34nnn44nnnn2334nn44nn4344o..",
    "..o223nn44nn44334nnnn22aaa22a6789876d44bbb44nnnn23344nn44nn344o..",
    "..o223n44nn44n334bbbb22nnn22a7899987d44nnn44cccc233n44nn44n344o..",
    "..o22344nn44nn334cccc22aaa22a6789876d44bbb44dddd233nn44nn44344o..",
    "..o2234nn44nn4334aaaa22nnn22an67876nd44nnn44cccc2334nn44nn4344o..",
    "..o223nn44nn44334nnnn22222223an676nd34444444nnnn23344nn44nn344o..",
    "..o22nnnnnnnnnnn4nnnno22222233abbcc33444444onnnn2nnnnnnnnnnn44o..",
    "..o2233a3333a334onnnnoo2222233333333344444oonnnno233c3333c3344o..",
    "...o22333333334oonnnno.o22223333333334444o.onnnnoo23333333344o...",
    "...oc223333334dddoooo...o222233333334444o...oooocoo233333344do...",
    "...obcaabbbccaado........oo2abbbcccdd4oo.......obcaabbbccaado....",
    "...obabbbbbccccao..........onaaabbbcno.........obabbbbbccccao....",
    "...oaabbbbbccccaao.........obnnccabddo.........oaabbbbbccccaao...",
    "...oabbbbbdcccccado........onnbcaaddbo.........oabbbbbdcccccado..",
    ".oooabbbbcddccccaddo........obbnacdbo........oooabbbbcddccccaddo.",
    "obbbabbbccnddcccadddo.......obnnccbbo.......obbbabbbccnddcccadddo",
    ".obbabbbbccdccccaooo........onnbcabdo........obbabbbbccdccccaooo.",
    "..obabbbbbcbbcccao...........obbabdo..........obabbbbbcbbcccao...",
    "...oaabbbbbbbbbaao...........obnaddo...........oaabbbbbbbbbaao...",
    "....oabbbbbbbbbado...........onncdbo............oabbbbbbbbbado...",
    "....obaabbbbbaacco............obcbo.............obaabbbbbaacco...",
    "...obbbaaaaaaaooco............obabo............obbbaaaaaaaooco...",
    "....oooooobcco..o.............onado.............oooooobcco..o....",
    ".........obco..................obo...................obco........",
    ".........obo....................o....................obo.........",
    "..........o...........................................o..........",
]

# ---------------------------------------------------------------- cut-1 / cut-2
# cut-0 = ROWS (the approved frame). Only the two cutters and the drill move; everything else is ROWS.
#
# Cutters: both discs are the same drawing (hubs (10,36) and (54,36)), so they turn the same way on screen.
# Each hook has its flat cutting face on its clockwise side, so the discs spin clockwise (in the canvas and,
# since a rotation keeps handedness, on screen). The tooth pattern repeats every 90 degrees (4 hooks, 4 nubs
# between them); each frame turns it 30 degrees, so cut-2 -> cut-0 is the same 30-degree step. On this
# octagonal rim a 30-degree turn slides a hook about 4 px along the rim. The disc face (rim ring, hub,
# shading) does not turn, and the light stays on canvas +x: hooks are d on the lit right/upper right,
# c lower right, b on the shadow side. The disc top is under the arm, so hooks there are hidden.
DISC = [  # left disc without hooks, rows 31..46, cols 0..20 (the right disc is the same at cols 44..64)
    "...obcaabbbccaado....",
    "...obabbbbbccccao....",
    "...oaabbbbbccccaao...",
    "...oabbbbbdcccccao...",
    "...oabbbbcddccccao...",
    "...oabbbccnddcccao...",
    "...oabbbbccdccccao...",
    "...oabbbbbcbbcccao...",
    "...oaabbbbbbbbbaao...",
    "....oabbbbbbbbbado...",
    "....obaabbbbbaacco...",
    "....obbaaaaaaaooo....",
    "....oooooooooo.......",
    ".....................",
    ".....................",
    ".....................",
]
HUBS = ((10, 36), (54, 36))
ROW30 = {(10, 36): ((4, 30), (16, 30)), (54, 36): ((48, 30), (60, 30))}  # disc rim cells visible on row 30
# Hook fill as offsets from the hub, for the hook nearest +x; the other three are exact 90-degree turns.
HOOK = {0: ((7, -2), (7, -1), (8, -1), (7, 0), (8, 0), (9, 0)),
        30: ((7, 2), (7, 3), (8, 3), (7, 4), (8, 4), (9, 4)),
        60: ((6, 6), (5, 6), (4, 6), (4, 7), (5, 7), (4, 8))}
NUB = {0: (6, 6), 30: (2, 7), 60: (-2, 7)}  # one-pixel nub 45 degrees behind each hook

def turn(p, k):
    for _ in range(k): p = (-p[1], p[0])  # 90 degrees clockwise, +y down
    return p

def steel(dx, dy, angle):
    """Hook / nub colour from where it faces: the light is fixed on canvas +x."""
    a = angle % 360
    if a in (90,): return "c" if dx >= 1 else "b"         # bottom hook: lit half on its right
    if a >= 300 or a <= 15: return "d"
    if a <= 75: return "c"
    if a == 225 or a == 240: return "c"                     # upper-left rim pixel under the arm edge
    return "b"

STUB = {0: ((7, -2), (7, -1), (7, 0))}  # what is left of a broken phase-0 hook: its root on the rim

def cutters(g, phase, broken=()):
    """broken: (hub, k) hooks snapped off to their root (defeat only; the cut loop passes none)."""
    for hub in HUBS:
        cx, cy = hub
        ox = cx - 10
        for j, r in enumerate(DISC):
            g[31 + j][ox:ox + 21] = list(r)
        for x, y in ROW30[hub]: g[y][x] = "o"
        visible = lambda x, y: y >= 31 or (x, y) in ROW30[hub]
        fill = {}
        for k in range(4):
            angle = phase + 90 * k
            for p in HOOK[phase]:
                if (hub, k) in broken and p not in STUB[phase]: continue
                dx, dy = turn(p, k)
                fill[(cx + dx, cy + dy)] = steel(dx, dy, angle)
            dx, dy = turn(NUB[phase], k)
            fill[(cx + dx, cy + dy)] = steel(dx, dy, angle + 45)
        fill = {p: c for p, c in fill.items() if visible(*p)}
        for (x, y), c in fill.items(): g[y][x] = c
        for x, y in fill:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if ny >= 31 and 0 <= nx < 65 and g[ny][nx] == ".": g[ny][nx] = "o"

# Drill: the flutes are diagonal bands along x+y with period 4 (two dark, two light). Per row the drill has
# a shadow zone L (groove n / b), a middle zone M (a / c) and a lit zone R (b / d). Three frames cannot
# split a 4 px period evenly, so in cut-1 the light band is 1 px wide in L and M and 3 px wide in R (wider
# highlight on the lit side, wider groove on the shadow side): band centres sit at 0.5, 2, 3.5, then 4.5
# (= cut-0) along x+y, i.e. 1.5, 1.5 and 1 px steps toward the tip (canvas +y, the head's front after the
# rotation), so the flutes screw forward with no ambiguous half-period jump. Collar rows 31-32 and the tip
# pixel stay.
DRILL_ZONES = {33: (28, 31, 34, 36), 34: (28, 31, 34, 36), 35: (29, 32, 34, 35), 36: (29, 32, 34, 35),
               37: (29, 32, 34, 35), 38: (30, 32, 33, 34), 39: (30, 32, 33, 34), 40: (30, 32, 33, 34),
               41: (31, 32, 33, 33), 42: (31, 32, 33, 33), 43: (31, 32, 33, 33)}  # L from, M from, R from, R to
FLUTE = {"L": ("n", "b"), "M": ("a", "c"), "R": ("b", "d")}  # (dark, light)
LIGHT = [{"L": {0, 1}, "M": {0, 1}, "R": {0, 1}},
         {"L": {2}, "M": {2}, "R": {1, 2, 3}},
         {"L": {3, 0}, "M": {3, 0}, "R": {3, 0}}]

def drill(g, frame):
    for y, (l, m, r, end) in DRILL_ZONES.items():
        for x in range(l, end + 1):
            zone = "L" if x < m else "M" if x < r else "R"
            g[y][x] = FLUTE[zone][((x + y) % 4) in LIGHT[frame][zone]]

def build(frame, broken=()):
    g = [list(r) for r in ROWS]
    cutters(g, 30 * frame, broken)
    drill(g, frame)
    return ["".join(r) for r in g]

def moving(x, y):
    """The cutter and drill cells: the only cells allowed to differ between frames of one loop."""
    return (y >= 30 and (x <= 21 or x >= 43)) or (31 <= y <= 43 and 28 <= x <= 36)

FRAMES = [build(f) for f in range(3)]
assert FRAMES[0] == ROWS, "the frame builder must reproduce the approved cut-0"
for f in FRAMES[1:]:  # nothing outside the cutters and the drill changes
    for y in range(47):
        for x in range(65):
            if f[y][x] != ROWS[y][x]:
                assert moving(x, y), (x, y)

# ---------------------------------------------------------------- damage helpers (as in gatebreaker.py)
STEP = {"r": (1, 0), "l": (-1, 0), "d": (0, 1), "u": (0, -1), "R": (1, 1), "L": (-1, 1), "U": (1, -1), "Y": (-1, -1)}

def crack(x, y, moves, c="o"):
    """1 px crack from (x, y): r/l/d/u straight, R/L down-right/down-left, U/Y up-right/up-left."""
    cells = [(x, y, c)]
    for m in moves:
        dx, dy = STEP[m]; x += dx; y += dy; cells.append((x, y, c))
    return cells

def glyph(x0, y0, rows):
    """Cells of a small hand-drawn mark ("." keeps the pixel)."""
    return [(x0 + i, y0 + j, c) for j, r in enumerate(rows) for i, c in enumerate(r) if c != "."]

def apply(rows, cells):
    g = [list(r) for r in rows]
    for x, y, c in cells: g[y][x] = c
    return ["".join(r) for r in g]

def remap(rows, cells, mapping):
    g = [list(r) for r in rows]
    for x, y in cells: g[y][x] = mapping.get(g[y][x], g[y][x])
    return ["".join(r) for r in g]

def area(x0, y0, rows):
    """Cell set of a mask drawn with '#'."""
    return [(x0 + i, y0 + j) for j, r in enumerate(rows) for i, c in enumerate(r) if c == "#"]

CORE_CELLS = [(x, y) for y in range(19, 27) for x in range(28, 37) if ROWS[y][x] in "6789"]
PORT = [(31, 3), (32, 3), (33, 3)]                       # exhaust-stack port (rear coupling)

# ---------------------------------------------------------------- damaged-0/1/2 (phase 2, HP < 1/2)
# 'CORE OVERHEAT': the cut loop keeps turning; everything below is a fixed patch over each cut frame,
# outside the cutter/drill cells, so the three damaged frames differ only where the cut frames do.
# The damage carries by value and mass so phase 2 reads at 1x after the rotation (gate 4 review):
# - three scorch masses (outline[1] core, rust[0] body, one-step-darker fringe) on the lit right shoulder,
#   the shadow-side left shoulder and the core housing's lower left;
# - a chunk of the shadow shoulder's silhouette bitten out (a notch up to 6 px deep over rows 9-13,
#   screen bottom after the rotation);
# - the lit (+x, screen-top) hazard panel torn wide open on fire (fire[1]-fire[3] interior, tongue toward
#   +x), with a steel rib on its shadow side and bent lit lips (rust[3]);
# - five seams glowing in 4-5 px runs of fire[1]-fire[2];
# - the core's inner rings one value up (fire[4] diamond), the stack port hot; two short outline[0]
#   cracks for texture.
SOOT_MAP = {"#": {"1": "n", "2": "n", "3": "n", "4": "n"},          # soot core
            "+": {"2": "1", "3": "1", "4": "1"},                    # charred body
            "-": {"4": "3", "3": "2", "2": "1"}}                    # fringe: one value down

def soot(x0, y0, rows):
    return [(x0 + i, y0 + j, c) for j, r in enumerate(rows) for i, c in enumerate(r) if c in SOOT_MAP]

SCORCH = (soot(43, 7, ["......-++--.",     # right shoulder (lit plate)
                       "...-+++###-.",
                       "..-+######+-",
                       ".-+####+++-.",
                       "-++###+--...",
                       "-+##++-.....",
                       ".-++-.......",
                       "..--........"])
          + soot(13, 6, ["...--+-...",     # left shoulder, round the bite
                         "..-+###+-.",
                         ".-+####++-",
                         "-+###+++-.",
                         "++##+-....",
                         "+###+-....",
                         "++#++-....",
                         "-+++-.....",
                         ".-+-......",
                         "..-......."])
          + soot(22, 25, [".-++-...",      # core housing, lower left
                          "-+###+-.",
                          "+####+-.",
                          "-+##+-..",
                          ".-+-...."]))
BITE_EDGE = {9: 13, 10: 15, 11: 16, 12: 15, 13: 12}   # shadow shoulder: new outline x per row (notch)

def bite(rows):
    """Cut the notch: cells left of the new edge go transparent, every cell they expose becomes outline."""
    g = [list(r) for r in rows]
    gone = {(x, y) for y, edge in BITE_EDGE.items() for x in range(edge) if g[y][x] != "."}
    for x, y in gone: g[y][x] = "."
    for x, y in gone:
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in gone and g[ny][nx] != ".": g[ny][nx] = "o"
    return ["".join(r) for r in g]

CRACKS = (crack(47, 12, "LdL")                  # right shoulder, out of the scorch
          + crack(41, 26, "LdL")                # core housing, lower right
          + crack(30, 9, "rR"))                 # chest plate
TEAR = glyph(52, 18, ["....o44..",             # lit hazard panel torn open on fire: void, steel rib on
                      "..oon67o.",             # the shadow (-x) side, flames toward +x (screen up),
                      ".on66787o",             # bent lit lips (rust[3]) at the rim
                      "onb67887o",
                      "onb66776o",
                      ".onb666no",
                      "..onnnno4",
                      "...o44..."])
SEAMS = (glyph(23, 17, ["67776"])               # under the chest
         + glyph(38, 17, ["6776"])              # under the right shoulder
         + glyph(46, 15, ["6776"])              # right shoulder / forearm
         + glyph(20, 11, ["6", "7", "7", "6"])  # left shoulder / chest
         + glyph(51, 27, ["6776"]))             # right forearm cuff
HOT_CORE = {"7": "8", "8": "9"}

def damage(rows):
    g = [list(r) for r in rows]
    for x, y, c in SCORCH: g[y][x] = SOOT_MAP[c].get(g[y][x], g[y][x])
    rows = ["".join(r) for r in g]
    rows = remap(rows, CORE_CELLS, HOT_CORE)
    rows = bite(rows)
    rows = apply(rows, CRACKS + TEAR + SEAMS + [(x, y, c) for (x, y), c in zip(PORT, "676")])
    return rows

DAMAGED = [damage(f) for f in FRAMES]
for d, f in zip(DAMAGED, FRAMES):   # the damage patch never touches a moving cell
    for y in range(47):
        for x in range(65):
            if d[y][x] != f[y][x]: assert not moving(x, y), (x, y)

# ---------------------------------------------------------------- defeat (held at 0 HP)
# Builds on the damaged patch (nothing heals; its seam and tear fires cool one to two values). Cutters stalled at cut-0 with hooks snapped to their
# roots, drill snapped below the collar's third flute, core dark (outline / fire[0]) with two embers,
# stack port out, the shadow side one value darker while the lit plates (chest, right shoulder, right
# forearm and cutter, core housing) keep their values so it still reads as the Kiln head; embers sit in seams.
BROKEN = {((10, 36), 1), ((10, 36), 2), ((54, 36), 0), ((54, 36), 1)}
DARKEN = {"4": "3", "3": "2", "2": "1", "d": "c", "c": "b", "b": "a"}
KEEP_LIT = set(area(26, 5, ["##############"] * 13)               # chest plate + stack base
               + area(38, 6, ["####################"] * 11)       # right shoulder
               + area(48, 17, ["###############"] * 13)          # right forearm and hazard panel
               + area(22, 18, ["#####################"] * 12)    # core housing
               + area(43, 30, ["######################"] * 17))  # lit (screen-top) cutter
DEAD_CORE = {"6": "5", "7": "n", "8": "o", "9": "o"}
COOL = {"6": "5", "7": "6", "8": "6"}   # the damaged seams and the tear fire burn down to embers
SNAP = glyph(29, 38, ["ocdoboo",       # drill snapped: row 38 is the jagged break (fresh metal c/d on
                      ".oo.o.."])      # the fracture), everything below row 39 gone
EMBERS = (glyph(25, 16, [".7", "78"])          # chest seam
          + glyph(14, 14, ["7.", "87"])        # left shoulder seam
          + glyph(56, 21, ["7", "8"])          # inside the torn panel
          + glyph(40, 27, ["67"])              # core-housing crack
          + glyph(18, 19, ["6"]) + glyph(46, 24, ["7"]))   # rod sleeves
CORE_EMBERS = [(31, 22, "6"), (33, 24, "5")]

def defeat():
    rows = build(0, BROKEN)
    rows = damage(rows)
    rows = remap(rows, [(x, y) for y in range(47) for x in range(65) if (x, y) not in KEEP_LIT], DARKEN)
    rows = remap(rows, CORE_CELLS, DEAD_CORE)
    rows = remap(rows, [(x, y) for y in range(47) for x in range(65) if (x, y) not in CORE_CELLS], COOL)
    g = [list(r) for r in rows]
    for y in range(39, 47):
        for x in range(28, 37): g[y][x] = "."
    rows = ["".join(r) for r in g]
    return apply(rows, SNAP + EMBERS + CORE_EMBERS + [(x, y, c) for (x, y), c in zip(PORT, "n5n")])

DEFEAT = defeat()
pixlib.save_sprite("kilnHead", [pixlib.grid_image(f, LEGEND) for f in FRAMES + DAMAGED + [DEFEAT]])
