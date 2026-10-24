import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Gunship: faceted violet hull around a brass-ringed reactor, brass keel prow, two horned
# brass armour pods, two brass (copper) cannons pointing down toward the player.
# Light from the top: north facets lightest (violet[2]), side and south facets in shadow.
# Each row = pod (x0-8) + gap/strut (x9-10) + hull (x11-19, 19 = centre column); mirrored.
LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "1": ("steel", 0), "2": ("steel", 1), "3": ("steel", 2), "4": ("steel", 3),
    "a": ("brass", 0), "b": ("brass", 1), "c": ("brass", 2),
    "v": ("violet", 0), "w": ("violet", 1), "x": ("violet", 2),
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
HALF = [p + g + h for p, g, h in zip(POD, GAP, HULL)]
assert len(HALF) == 31 and all(len(r) == 20 for r in HALF), [len(r) for r in HALF]
rows = [r + r[-2::-1] for r in HALF]
pixlib.save_sprite("gunship", [pixlib.grid_image(rows, LEGEND)])
