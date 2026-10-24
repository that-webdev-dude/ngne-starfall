"""Aimed fast hostile fire, 3 frames (directions, not animation). 13x13, pivot (6,6); needle ramp, 3 colours
(outline unused). Heavy dart: 3 px shaft (needle[0] rim and end cap, needle[1] centre, needle[2] spine
just behind the head), 5 px arrowhead filled needle[1] with a needle[0] rim, needle[2] point.
needle-0 points down (+y): the study B 5x11 dart centred on the canvas.
needle-22 and needle-45 are the same dart turned 22.5 and 45 degrees clockwise on screen (+y down): the
tip swings from straight down toward the lower left. Redrawn by hand, not resampled:
  needle-22: shaft lines step 2-2-2 (the 1:2 stair, nearest clean angle to 22.5), arrowhead back edge
  tilted (left barb one row higher, with a notch beside the shaft), right edge 1:1 down to the point.
  needle-45: shaft as three 1:1 diagonals (rim, centre, rim) ending in a corner cap; arrowhead as a
  right-angled triangle with the point at the lower left and notches between the barbs and the shaft.
Mass 35 / 37 / 35 px; centre of mass (6.0,5.9) / (5.9,6.2) / (5.8,6.2), so the pivot stays on it.
16 directions for the renderer: angle = k*90 + {0, 22.5, 45, 67.5} uses
{needle-0, needle-22, needle-45, needle-22 mirrored across the down-left diagonal (PIL TRANSVERSE)}
turned k quarter turns clockwise. The colours are symmetric, so mirroring flips no lighting."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "0": ("needle", 0),  # rim, end cap
    "1": ("needle", 1),  # fill
    "2": ("needle", 2),  # spine, point
}

FRAMES = [
    # needle-0
    [
        ".............",
        ".....000.....",
        ".....010.....",
        ".....010.....",
        ".....020.....",
        ".....020.....",
        ".....020.....",
        "....01110....",
        "....01110....",
        ".....010.....",
        ".....020.....",
        "......2......",
        ".............",
    ],
    # needle-22
    [
        ".............",
        ".......00....",
        ".......010...",
        "......010....",
        "......020....",
        ".....020.....",
        "...0.020.....",
        "...01110.....",
        "...011110....",
        "....0110.....",
        "....020......",
        "....2........",
        ".............",
    ],
    # needle-45
    [
        ".............",
        ".............",
        ".........00..",
        "........010..",
        "...0...020...",
        "...00.020....",
        "...01020.....",
        "...0110......",
        "...01110.....",
        "...200000....",
        "..2..........",
        ".............",
        ".............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("hostileNeedle", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
