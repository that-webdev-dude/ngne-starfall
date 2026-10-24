"""Reduced-motion charge-ready marker (gate 4): one static frame held at the plasma muzzle while the charge is
full. 15x15, pivot (7,7) on the plasmaMuzzle socket, drawn above the hull and above playerCalm; plasma ramp,
4 colours. A charged cell, 9x9: a ring (plasma[3] on the upper half, plasma[2] on the lower, lit from the
top) around a 1 px dark plasma[0] gap and a 5 px hot core (the ready-a core: plasma[3] with a plasma[4]
plus). Sized like plasmaCharge charge-3 and the enlarged ready-b (~9-10 px) so it reads as the same "full"
level, but round and closed instead of the charge-3 four-point star, and the dark gap reads as "held"
without pulsing. playerCalm's outline is broken in an 11x11 window around the muzzle, so it stays 1 px
clear of this marker, and nothing warm is used, so it cannot read as the hit cue. The dark gap keeps it legible over the prow and over the planet / portal backgrounds."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "0": ("plasma", 0),  # dark gap inside the ring
    "2": ("plasma", 2),  # ring, lower half
    "3": ("plasma", 3),  # ring, upper half; core arms
    "4": ("plasma", 4),  # white-hot centre
}

FRAMES = [
    # ready-static
    [
        "...............",
        "...............",
        "...............",
        "......333......",
        "....3300033....",
        "....3033303....",
        "...303343303...",
        "...203444302...",
        "...203343302...",
        "....2033302....",
        "....2200022....",
        "......222......",
        "...............",
        "...............",
        "...............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("plasmaReadyCalm", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
