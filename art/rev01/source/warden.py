import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Warden: violet bat-winged raider, nose pointing down. Broad swept upper blades, a gun strut
# with a brass cannon at each end, down-curving claw blades outboard, armoured violet
# fuselage around a red dagger core with a brass emblem. Light from the top.
LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "v": ("violet", 0), "w": ("violet", 1), "x": ("violet", 2),
    "r": ("raider", 0), "s": ("raider", 1), "t": ("raider", 2), "u": ("raider", 3),
    "a": ("brass", 0), "b": ("brass", 1), "c": ("brass", 2),
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
rows = [r + r[-2::-1] for r in HALF]
pixlib.save_sprite("warden", [pixlib.grid_image(rows, LEGEND)])
