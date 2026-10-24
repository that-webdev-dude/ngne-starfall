"""Plasma charge levels, 3 state frames (about 0.3 / 0.6 / 0.9 s of holding fire). 15x15, pivot (7,7) on the
player's plasmaMuzzle socket, drawn above the hull; plasma ramp, 4 colours (plasma[0] unused: it vanishes
on the clear colour). charge-1: a 3 px plasma[2] spot with a plasma[3] centre on the socket, plus four
2 px motes (plasma[3] head inward, plasma[2] tail outward) on the diagonals 5 px out. charge-2: four motes
4 px out in a clockwise pinwheel around a filled 3x3 core (plasma[4] centre, plasma[3] arms,
plasma[2] corners), one step brighter and fuller than the charge-1 spot. charge-3: 5 px core with four short
pinwheel tendrils whose tips sit where the charge-2 motes were.
Content reaches at most 5 px below the pivot (ship row 6), clear of the canopy (rows 9-10)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "1": ("plasma", 1),  # cooling edge, mote tails
    "2": ("plasma", 2),
    "3": ("plasma", 3),
    "4": ("plasma", 4),  # white-hot
}

FRAMES = [
    # charge-1
    [
        "...............",
        "...............",
        "...............",
        "..2.........2..",
        "...3.......3...",
        "...............",
        ".......2.......",
        "......232......",
        ".......2.......",
        "...............",
        "...3.......3...",
        "..2.........2..",
        "...............",
        "...............",
        "...............",
    ],
    # charge-2
    [
        "...............",
        "...............",
        ".......1.......",
        "........3......",
        "...............",
        "...............",
        "...3..232......",
        "..1...343...1..",
        "......232..3...",
        "...............",
        "...............",
        "......3........",
        ".......1.......",
        "...............",
        "...............",
    ],
    # charge-3
    [
        "...............",
        "...............",
        "...............",
        "........1......",
        ".......2.......",
        "......232......",
        "...1.23432.....",
        "....2344432....",
        ".....23432.1...",
        "......232......",
        ".......2.......",
        "......1........",
        "...............",
        "...............",
        "...............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("plasmaCharge", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
