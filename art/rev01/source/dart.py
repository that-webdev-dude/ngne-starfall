import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Dart (Sweeper): slim raider needle ship, nose pointing down (toward the player).
# Left half incl. centre column 6; mirrored. Light from the top (screen north).
# Frames (spec order): idle, pulse, fire. Each state is idle plus a few edits on the left half
# (x <= 6), mirrored, so only the active parts change:
#   pulse = tail engine glow: the top of the dorsal spine (6,1)-(6,2) turns exhaust[2]
#           (2 px; the outline cap (6,0) stays).
#   fire  = muzzle cue at the barrel mouth: needle[2] core on the tip (6,24) = muzzle socket,
#           needle[1] rim on the row above (5,23)-(7,23) (4 px, all inside the idle silhouette;
#           the canvas has no row below the tip).
LEGEND = {
    ".": None,
    "o": ("outline", 0),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("raider", 0), "2": ("raider", 1), "3": ("raider", 2), "4": ("raider", 3),
    "E": ("exhaust", 2),                       # engine pulse
    "n": ("needle", 1), "N": ("needle", 2),    # muzzle cue
}
HALF = [
    "......o",
    ".....o4",
    ".....o3",
    "...ooo3",
    "..ocdo3",
    "o.obco3",
    "ooo43o3",
    "o4o33o3",
    "o3o32o3",
    ".o3oo33",
    ".o34323",
    "..o3233",
    "..o2233",
    "...o1bd",
    "....oab",
    "....o2a",
    "....o23",
    "....o23",
    "....o12",
    ".....o3",
    ".....o3",
    ".....o2",
    ".....oc",
    ".....ob",
    "......o",
]

def edit(half, cells):
    """cells: {(x, y): char} on the left half (x <= 6); returns a new half grid."""
    out = [list(r) for r in half]
    for (x, y), c in cells.items(): out[y][x] = c
    return ["".join(r) for r in out]

PULSE = edit(HALF, {(6, 1): "E", (6, 2): "E"})
FIRE = edit(HALF, {(5, 23): "n", (6, 23): "n", (6, 24): "N"})

def mirror(half): return [r + r[-2::-1] for r in half]

FRAMES = [mirror(h) for h in (HALF, PULSE, FIRE)]
rows = FRAMES[0]
pixlib.save_sprite("dart", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
