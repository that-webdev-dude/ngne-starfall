import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Interceptor: wide twin-pod raider fighter, nose pointing down (toward the player).
# Left half incl. centre column 13; mirrored. Light from the top (screen north).
LEGEND = {
    ".": None,
    "o": ("outline", 0), "O": ("outline", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("raider", 0), "2": ("raider", 1), "3": ("raider", 2), "4": ("raider", 3),
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
rows = [r + r[-2::-1] for r in HALF]
pixlib.save_sprite("interceptor", [pixlib.grid_image(rows, LEGEND)])
