import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Gunship: faceted violet hull around a brass-ringed reactor, brass keel prow, two horned
# brass armour pods, two brass (copper) cannons pointing down toward the player.
# Light from the top: north facets lightest (violet[2]), side and south facets in shadow.
# Each row = pod (x0-8) + gap/strut (x9-10) + hull (x11-19, 19 = centre column); mirrored.
# Frames (spec order): idle, fire, vent-a, vent-b. Every state is idle plus a few edits on the
# left half (x0-19), mirrored, so only the active parts move:
#   fire   = both cannons recoil: pod rim compresses 1 px (taper row 18 removed), mount up 1 px,
#            barrel/collar/muzzle brake up 2 px (the barrel slides 1 px into the mount);
#            5x5 muzzle burst (needle[2] 3x3 core with a fire[3] centre, needle[1] rim, needle[2]
#            rays through the rim) on rows 28-32, its top row overlapping the barrel's last row.
#   vent-a = reactor ring opens 1 px (inner corner fillets become aperture gap), core glows
#            fire[2] with a fire[3] centre; flank vent slots (x12-13 of seam row 11) fire[2].
#   vent-b = core brightens: fire[4] centre, fire[3] arms, fire[2] corners; slots fire[3].
# Canvas 39x35: rows 31-34 are empty in idle/vent and give the fire frame's burst room.
# Lamps (dorsal sensor, pod grilles, strut highlights) never change.
LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "1": ("steel", 0), "2": ("steel", 1), "3": ("steel", 2), "4": ("steel", 3),
    "a": ("brass", 0), "b": ("brass", 1), "c": ("brass", 2),
    "v": ("violet", 0), "w": ("violet", 1), "x": ("violet", 2),
    "f": ("fire", 2), "F": ("fire", 3), "G": ("fire", 4),  # vent glow; F also the burst centre
    "n": ("needle", 1), "N": ("needle", 2),    # muzzle flash
}
POD = [
    ".........",  # 0
    ".........",  # 1
    ".........",  # 2
    ".O.......",  # 3  horn
    "OcOO.....",  # 4
    "OccbOO...",  # 5  upper plate (lit)
    "OcbbbbOO.",  # 6
    "OcbbbbbbO",  # 7
    "Obbbbbbb4",  # 8
    "Oooooooa3",  # 9  plate seam
    "Obo333oa2",  # 10 grille
    "Obo111oa2",  # 11
    "Oao333oao",  # 12
    "Oao111oa3",  # 13
    "Oaoooooa2",  # 14
    "Oabbbbba1",  # 15 lower plate
    "OaaaaaaaO",  # 16
    ".OaaaaaO.",  # 17
    "..OaaaO..",  # 18
    "..O333O..",  # 19 cannon mount
    "..O121O..",  # 20
    "..ObcaO..",  # 21 barrel
    "..ObcaO..",  # 22
    "..ObcaO..",  # 23
    ".O34432O.",  # 24 collar
    "..OabaO..",  # 25
    "..ObcaO..",  # 26
    "..ObcaO..",  # 27
    ".O34432O.",  # 28 muzzle brake
    ".O21112O.",  # 29
    "..OOOOO..",  # 30
]
# Armoured wing-strut x8-11: two steel plates with lit top edges, running into pod and hull.
GAP = [".."] * 7 + ["OO", "44", "33", "22", "22", "oo", "33", "22", "11", "OO"] + [".."] * 14
HULL = [
    "......OOO",  # 0  dorsal sensor
    "......O34",  # 1
    "...OOOO12",  # 2
    "..Oxxxxxx",  # 3  north facet
    ".Oxxxxxxx",  # 4
    "Oxxxxxxxx",  # 5
    "Owoxxxxxx",  # 6  seam A
    "Owwoxxxxx",  # 7
    "4wwwoxooo",  # 8  reactor housing
    "3wwwwoccc",  # 9
    "2wwwocbOO",  # 10
    "2oooobO44",  # 11 core
    "ovvvobOc4",  # 12
    "3vvvoaObc",  # 13
    "2vvvoaaOO",  # 14
    "1vvvooaaa",  # 15
    "Ooooovooo",  # 16 seam B
    ".Ovvvoabc",  # 17 keel plate
    ".Ovvvoabc",  # 18
    "..Ovvoabc",  # 19
    "..Ovvoabb",  # 20
    "...Ovoaab",  # 21
    "...Ovoaab",  # 22
    "....Ooaab",  # 23
    ".....Oaab",  # 24
    "......Oaa",  # 25
    ".......Oa",  # 26
    "........O",  # 27 prow tip
    ".........",  # 28
    ".........",  # 29
    ".........",  # 30
]
HALF = [p + g + h for p, g, h in zip(POD, GAP, HULL)] + ["." * 20] * 4  # rows 31-34 empty
assert len(HALF) == 35 and all(len(r) == 20 for r in HALF), [len(r) for r in HALF]

# Fire: pod rows 17-34 (x0-8) after recoil. Rows 0-16 of the pod are unchanged.
POD_FIRE = [
    ".OaaaaaO.",  # 17 rim (row 18 taper compressed away)
    "..O333O..",  # 18 cannon mount, up 1
    "..O121O..",  # 19
    "..ObcaO..",  # 20 barrel, up 2 (top row hidden in the mount)
    "..ObcaO..",  # 21
    ".O34432O.",  # 22 collar, up 2
    "..OabaO..",  # 23
    "..ObcaO..",  # 24
    "..ObcaO..",  # 25
    ".O34432O.",  # 26 muzzle brake, up 2
    ".O21112O.",  # 27
    "..OnNnO..",  # 28 burst top overlaps the barrel's closing row (bore mouth lit)
    "..nNNNn..",  # 29 muzzle burst: needle[2] core, needle[1] rim
    "..NNFNN..",  # 30 centre = muzzle socket (4, 30); rays reach x2 / x6
    "..nNNNn..",  # 31
    "...nNn...",  # 32 bottom ray
    ".........",  # 33
    ".........",  # 34
]

def edit(half, cells):
    """cells: {(x, y): char} on the left half (x <= 19); returns a new half grid."""
    out = [list(r) for r in half]
    for (x, y), c in cells.items(): out[y][x] = c
    return ["".join(r) for r in out]

FIRE = [r if y < 17 else POD_FIRE[y - 17] + r[9:] for y, r in enumerate(HALF)]
VENT_OPEN = {(17, 10): "O", (17, 14): "O"}            # ring inner fillets -> aperture gap
VENT_A = edit(HALF, {**VENT_OPEN,
    (18, 11): "f", (19, 11): "f", (18, 12): "f", (19, 12): "F", (18, 13): "f", (19, 13): "f",
    (12, 11): "f", (13, 11): "f"})
VENT_B = edit(HALF, {**VENT_OPEN,
    (18, 11): "f", (19, 11): "F", (18, 12): "F", (19, 12): "G", (18, 13): "f", (19, 13): "F",
    (12, 11): "F", (13, 11): "F"})

def mirror(half): return [r + r[-2::-1] for r in half]

FRAMES = [mirror(h) for h in (HALF, FIRE, VENT_A, VENT_B)]
rows = FRAMES[0]
pixlib.save_sprite("gunship", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
