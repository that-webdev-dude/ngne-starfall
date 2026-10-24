"""Ordinary hostile fire, 1 frame. 9x9, pivot (4,4); bead ramp, 4 colours.
7 px sphere lit from the top: bead[3] highlight upper left, bead[2] body, bead[1] shadow crescent lower
right, bead[0] separation rim (visible on the darkest background, unlike outline[0]). Study B, gate 1."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "0": ("bead", 0),  # separation rim
    "1": ("bead", 1),
    "2": ("bead", 2),
    "3": ("bead", 3),  # highlight
}

FRAMES = [
    # bead
    [
        ".........",
        "...000...",
        "..03320..",
        ".0232220.",
        ".0222220.",
        ".0222110.",
        "..01110..",
        "...000...",
        ".........",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("hostileBead", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
