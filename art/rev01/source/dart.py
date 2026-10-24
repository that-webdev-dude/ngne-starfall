import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Dart (Sweeper): slim raider needle ship, nose pointing down (toward the player).
# Left half incl. centre column 6; mirrored. Light from the top (screen north).
# Frames (spec order): idle, pulse, fire. Each state is idle plus a few edits on the left half
# (x <= 6), mirrored, so only the active parts change:
#   pulse = tail engine glow: the top of the dorsal spine (6,1)-(6,2) turns exhaust[2]
#           (2 px; the outline cap (6,0) stays).
#   fire  = muzzle flash that extends the silhouette below the nose (canvas 13x29 since gate 4;
#           rows 25-28 are empty in idle/pulse): the tip outline (6,24) turns needle[1] so the
#           flash stays joined to the barrel, then a fan that opens away from the gun with a
#           needle[2] hot core down the centre: row 25 n N n, row 26 n n N n n, row 27 three
#           prongs n . n . n (11 px). Row 28 (canvas edge) stays empty. A fan widening away
#           from the barrel and fixed to the nose does not read as the hostileNeedle bullet
#           (a 3 px shaft behind a head that narrows to its point).
#           Muzzle socket = (6,25), the first transparent pixel under the tip in idle.
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
    ".......",
    ".......",
    ".......",
    ".......",
]

def edit(half, cells):
    """cells: {(x, y): char} on the left half (x <= 6); returns a new half grid."""
    out = [list(r) for r in half]
    for (x, y), c in cells.items(): out[y][x] = c
    return ["".join(r) for r in out]

PULSE = edit(HALF, {(6, 1): "E", (6, 2): "E"})
FIRE = edit(HALF, {(6, 24): "n",
                   (5, 25): "n", (6, 25): "N",
                   (4, 26): "n", (5, 26): "n", (6, 26): "N",
                   (4, 27): "n", (6, 27): "n"})

def mirror(half): return [r + r[-2::-1] for r in half]

FRAMES = [mirror(h) for h in (HALF, PULSE, FIRE)]
rows = FRAMES[0]
pixlib.save_sprite("dart", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
