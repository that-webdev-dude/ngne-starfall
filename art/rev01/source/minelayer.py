import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Minelayer: squat octagonal olive hull with four outlined olive armour plates (hazard
# chevrons inside each plate, horns at the outer corners), steel side
# pistons and exhaust stacks, a recessed bay holding three lit mines, a steel mine-bay door
# and two steel claws at the bottom (toward the player). Light from the top: the north rim
# is lit, the south rim falls into shadow; inside the recess the walls invert.
# Frames (spec order): idle, open, release. Only the mine-bay door changes (x12-16, rows
# 21-23, between the frame outlines at x11/x17; the leaves meet at the x14 seam). The
# leaves slide outward under the frame; the shadowed upper lip of the opening is outline[1].
#   open    = each leaf slides 1 px: 3 px gap (x13-15), lip on row 21, fire[2] glow below.
#   release = leaves fully retracted (5 px gap): the top half of a mine (diamond, centre
#             (14, 23)) in brass[1] rim / brass[2] core / fire[3] centre against the dark bay interior (outline[1]).
# The three mines in the recess are lamps and never change.
LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "g": ("olive", 0), "h": ("olive", 1), "i": ("olive", 2),
    "a": ("brass", 0), "b": ("brass", 1), "c": ("brass", 2),
    "1": ("steel", 0), "2": ("steel", 1), "3": ("steel", 2), "4": ("steel", 3),
    "f": ("fire", 2), "F": ("fire", 3),  # bay glow; F the released mine's centre
}
# Left half incl. centre column 14; mirrored.
HALF = [
    #0123456789abcde
    ".........OOOO..",  # 0  exhaust stack
    ".........O43O..",  # 1
    ".........O21O..",  # 2
    ".O......OO32OOO",  # 3  upper armour plate, horn corner
    "OiOO...Oiiiiiii",  # 4  north rim (lit)
    "OiiiOOOiiiiOccc",  # 5  brass hatch
    "OhiiiioiiiiObob",  # 6  plate lit top rim, seamed to hull
    "Ohccoooiiiihhhh",  # 7  hazard chevrons inside the plate
    "OhoccooiiiiOOOO",  # 8  mine recess
    "OhoobboiihOoooo",  # 9
    "OhboobohiOgggoc",  # 10 mine 1
    "OhggggohhOgggc4",  # 11 plate bottom lip
    "OOOOOOOhhOgggbc",  # 12
    "O33333OhhOgcgga",  # 13 side piston, mines 2 and 3
    "O11111OhhOc4cgg",  # 14
    "OOOOOOOhhObcbgg",  # 15 lower armour plate
    "OhiiiiohhOgaggg",  # 16
    "OhooccoghOggggg",  # 17 hazard chevrons
    "OhcoocoghhOhhhh",  # 18
    "OhbbooogghhOOOO",  # 19
    "Ohobboogggggggg",  # 20 south rim (shadow)
    "OhggggoggggO333",  # 21 plate bottom lip, mine-bay door
    "OhhhOOOggggO22o",  # 22
    "OhOO...OgggO11o",  # 23
    ".O.....O43OOOOO",  # 24 horn corner, claws
    "......O332O....",  # 25
    ".....O32O......",  # 26
    ".....O21O......",  # 27
    "......OO.......",  # 28
]
assert len(HALF) == 29 and all(len(r) == 15 for r in HALF), [len(r) for r in HALF]

def door(half, rows):
    """Replace the left half of the door (x12-14, rows 21-23) with `rows` (3 chars each)."""
    out = [list(r) for r in half]
    for y, r in enumerate(rows): out[21 + y][12:15] = r
    return ["".join(r) for r in out]

OPEN = door(HALF, [
    "3oo",  # 21 leaf edge x12 | shadowed lip
    "2ff",  # 22 glow
    "1ff",  # 23
])
RELEASE = door(HALF, [
    "oob",  # 21 lip | mine tip
    "obc",  # 22 bay interior | rim, core
    "bcF",  # 23 rim, core, centre (14, 23); the lip outline below hides the lower half
])

def mirror(half): return [r + r[-2::-1] for r in half]

FRAMES = [mirror(h) for h in (HALF, OPEN, RELEASE)]
rows = FRAMES[0]
pixlib.save_sprite("minelayer", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
