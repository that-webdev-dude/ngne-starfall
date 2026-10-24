"""Plasma discharge flash, 2 frames played once (40, 50 ms). 19x19, pivot (9,9) on the plasmaMuzzle socket,
drawn above the hull; plasma ramp, 4 colours. muzzle-0: wide white-hot burst (7 px core) with a long
forward ray, two forward diagonals, side rays and short rear rays. muzzle-1: the burst thins into an open
forward ring (radius 5, brightest at the top) with the rays carried outward as short streaks and a cooling
centre. Weighted forward: nothing more than 5 px below the pivot (ship row 6, clear of the canopy)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "1": ("plasma", 1),  # cooling edge, mote tails
    "2": ("plasma", 2),
    "3": ("plasma", 3),
    "4": ("plasma", 4),  # white-hot
}

FRAMES = [
    # muzzle-0
    [
        "...................",
        ".........1.........",
        ".........2.........",
        "....1....2....1....",
        ".....2...3...2.....",
        "......2..3..2......",
        ".......33333.......",
        ".......34443.......",
        "......3444443......",
        "..122334444433221..",
        "......3444443......",
        ".......34443.......",
        ".......23332.......",
        "......1..2..1......",
        ".........1.........",
        "...................",
        "...................",
        "...................",
        "...................",
    ],
    # muzzle-1
    [
        "...................",
        ".........1.........",
        "...1.....2.....1...",
        "....2.........2....",
        ".......22322.......",
        "......2.....2......",
        ".....2.......2.....",
        ".....1.......1.....",
        "....1....2....1....",
        ".12.1...232...1.21.",
        "....1....1....1....",
        "...................",
        "...................",
        "...................",
        "...................",
        "...................",
        "...................",
        "...................",
        "...................",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("plasmaMuzzle", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
