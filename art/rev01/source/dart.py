import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Dart (Sweeper): slim raider needle ship, nose pointing down (toward the player).
# Left half incl. centre column 6; mirrored. Light from the top (screen north).
LEGEND = {
    ".": None,
    "o": ("outline", 0),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("raider", 0), "2": ("raider", 1), "3": ("raider", 2), "4": ("raider", 3),
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
rows = [r + r[-2::-1] for r in HALF]
pixlib.save_sprite("dart", [pixlib.grid_image(rows, LEGEND)])
