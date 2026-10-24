"""Player primary fire, 1 frame. 3x11, pivot (1,5); plasma ramp, 4 colours (plasma[0] unused).
Narrow lance pointing up: white tip and core, cyan flanks, fading to a 1 px tail. Flank steps (rows 2, 5)
are staggered against core steps (rows 4, 7, 9). The canvas is exactly the lance's footprint, so the
edge columns and rows are used (approved at gate 1, study B)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "1": ("plasma", 1),  # cooling edge, mote tails
    "2": ("plasma", 2),
    "3": ("plasma", 3),
    "4": ("plasma", 4),  # white-hot
}

FRAMES = [
    # lance
    [
        ".4.",
        "343",
        "242",
        "242",
        "232",
        "131",
        "131",
        ".2.",
        ".2.",
        ".1.",
        ".1.",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("primaryLance", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
