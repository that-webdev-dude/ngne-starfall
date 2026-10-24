import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Warden: violet bat-winged raider, nose pointing down. Broad swept upper blades, a gun strut
# with a brass cannon at each end, down-curving claw blades outboard, armoured violet
# fuselage around a red dagger core with a brass emblem. Light from the top.
# Frames (spec order): idle, charge, fire. Each state is idle plus edits to the guns only
# (left half x6-10, mirrored); lamps (blade/claw/tail tips, emblem, core) never change.
#   charge = each gun reads as a lit tube: nose plate row 24 fire[2] rim / fire[3] centre,
#            muzzle ring row 23 fire[2], barrel highlight (x8, row 22) fire[2].
#   fire   = both cannons recoil 2 px into the mount (mount lower row and one barrel row
#            slide away), ring/plate/bore move up 2; 5x5 muzzle burst (needle[2] core with a
#            fire[3] centre, needle[1] rim, needle[2] side rays) on rows 23-27, its top row
#            replacing the bore's closing outline. Idle muzzle sockets (first transparent pixel
#            under the gun, x8/x24 row 26) land inside the burst.
LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "v": ("violet", 0), "w": ("violet", 1), "x": ("violet", 2),
    "r": ("raider", 0), "s": ("raider", 1), "t": ("raider", 2), "u": ("raider", 3),
    "a": ("brass", 0), "b": ("brass", 1), "c": ("brass", 2),
    "f": ("fire", 2), "F": ("fire", 3),      # aperture glow; F also the burst centre
    "n": ("needle", 1), "N": ("needle", 2),  # muzzle flash
}
# Left half incl. centre column 16; mirrored.
HALF = [
    #0123456789abcdefg
    "......O.........O",  # 0  blade tip, tail tip
    ".....OcO.......Oc",  # 1
    ".....OwxO......Ob",  # 2
    "....OwwxxO....Oxu",  # 3
    "....OwwwxxO...Oxu",  # 4
    "...OwwwwxxxOOOxxt",  # 5
    "...Owwwwwxxxoxxwt",  # 6
    "..Owwwwwwxxxoxwws",  # 7
    "..Oswwwwwwxxowwvs",  # 8
    ".Osswwwwwwwxoooor",  # 9
    ".Otsswwwwwwwoxxtu",  # 10
    "Otssswwwwwwwowwsc",  # 11
    ".OOOtsswwwwwowsbc",  # 12 emblem
    "....OOOsswwwowssa",  # 13
    "...OOOOOOOssovvrs",  # 14 gun strut
    "..Ocxxxxxxxxoxxtu",  # 15
    ".Obwwwwwwwwwowwst",  # 16
    "OxwvvvOcbcOvowwst",  # 17 claw root, cannon mount
    "OwsOOOObbaOOovwss",  # 18
    "Ows...ObcaO.Oxxtu",  # 19 lower plate
    "Ows...ObcaO.Owwsr",  # 20
    "Ows...ObcaO.Owvru",  # 21 core
    ".OwsO.ObcaO.Owvru",  # 22
    ".OwsO.OcccO.Ovvss",  # 23 muzzle ring
    ".OwsO.OaaaO.Oxwtt",  # 24 nose plate
    "..OwsO.OOO...Owss",  # 25
    "..OsO........Owvs",  # 26
    "...OcO........Ovs",  # 27
    "....O.........Ovs",  # 28
    "...............Os",  # 29
    "................O",  # 30 nose tip
]
assert len(HALF) == 31 and all(len(r) == 17 for r in HALF), [len(r) for r in HALF]

def edit(half, cells):
    """cells: {(x, y): char} on the left half (x <= 16); returns a new half grid."""
    out = [list(r) for r in half]
    for (x, y), c in cells.items(): out[y][x] = c
    return ["".join(r) for r in out]

def gun(half, rows):
    """Replace the gun column x6-10 from row 18 down with `rows` (5 chars each)."""
    return edit(half, {(6 + i, 18 + y): c for y, r in enumerate(rows) for i, c in enumerate(r)})

CHARGE = edit(HALF, {(8, 22): "f",                              # barrel highlight above the ring
                     (7, 23): "f", (8, 23): "f", (9, 23): "f",  # muzzle ring
                     (7, 24): "f", (8, 24): "F", (9, 24): "f"}) # nose plate / aperture
FIRE = gun(HALF, [
    "ObcaO",  # 18 barrel (mount's lower row and one barrel row slid into the mount)
    "ObcaO",  # 19
    "ObcaO",  # 20
    "OcccO",  # 21 muzzle ring, up 2
    "OaaaO",  # 22 nose plate, up 2
    ".nNn.",  # 23 burst top = bore mouth (replaces the closing outline)
    "nNNNn",  # 24 needle[2] core, needle[1] rim
    "NNFNN",  # 25 fire[3] centre, side rays
    "nNNNn",  # 26 idle muzzle socket (8, 26)
    ".nNn.",  # 27 bottom ray
])

def mirror(half): return [r + r[-2::-1] for r in half]

FRAMES = [mirror(h) for h in (HALF, CHARGE, FIRE)]
rows = FRAMES[0]
pixlib.save_sprite("warden", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
