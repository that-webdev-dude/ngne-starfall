import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Interceptor: wide twin-pod raider fighter, nose pointing down (toward the player).
# Left half incl. centre column 13; mirrored. Light from the top (screen north).
# Frames (spec order): idle, pulse, fire. Each state is idle plus a few edits on the left half
# (x <= 13), mirrored, so only the active parts change:
#   pulse = engine glow on each pod's flat rear face (row 3, x5-8 outline): x5-7 light up,
#           exhaust[1] rim with an exhaust[2] centre at x6 (3 px per pod, 6 px total).
#   fire  = muzzle cue at the nose gun: needle[2] core at (13,21) (the first transparent pixel
#           under the tip = muzzle socket), needle[1] rim at (12,21)/(14,21) and on the tip
#           outline (13,20), so the flash stays joined to the barrel when outline[0] vanishes on
#           the dark sky (4 px). Row 22 (canvas edge) stays empty.
LEGEND = {
    ".": None,
    "o": ("outline", 0), "O": ("outline", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("raider", 0), "2": ("raider", 1), "3": ("raider", 2), "4": ("raider", 3),
    "e": ("exhaust", 1), "E": ("exhaust", 2),  # engine pulse
    "n": ("needle", 1), "N": ("needle", 2),    # muzzle cue
}
HALF = [
    ".o............",
    "o4o...........",
    "o44oo......ooo",
    "o4444oooo.oabd",
    "o33444444ooabc",
    "o33O334444o4bc",
    "o22O333334o3bb",
    "o22O33OO33oabb",
    "o22O33aa33oabb",
    "o22O333322oaab",
    "o21O222222oacc",
    "o11O222211oabb",
    "o111111111oabb",
    "ocoooo3344oabb",
    "obo..o3334oabb",
    ".o....o333oabb",
    "......o233oo34",
    ".......o23oo34",
    ".......o22o.o4",
    "........o2o.o3",
    "........o2o..o",
    "........o1o...",
    ".........o....",
]

def edit(half, cells):
    """cells: {(x, y): char} on the left half (x <= 13); returns a new half grid."""
    out = [list(r) for r in half]
    for (x, y), c in cells.items(): out[y][x] = c
    return ["".join(r) for r in out]

PULSE = edit(HALF, {(5, 3): "e", (6, 3): "E", (7, 3): "e"})
FIRE = edit(HALF, {(13, 20): "n", (12, 21): "n", (13, 21): "N"})

def mirror(half): return [r + r[-2::-1] for r in half]

FRAMES = [mirror(h) for h in (HALF, PULSE, FIRE)]
rows = FRAMES[0]
pixlib.save_sprite("interceptor", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
