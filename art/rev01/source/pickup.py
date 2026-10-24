"""Repair pickup, 3 frames (base, bright, peak). 17x17, pivot (8,8); outline, pickup; 4 colours.
Replaces codeDrawn.pickup: 15 px square plate (outline[0] frame, 1 px chamfered corners), 13 px
inner field (x2-14, y2-14) and a 9x3 cross centred on the pivot.

Light from the top: the plate is a raised panel, so its upper and left field edges catch the light
(pickup[1]); the field is pickup[0]. The cross is pickup[1] with a pickup[2] centre stroke: a
medical cross on a soft-cornered plate, no points or spikes, so it reads as "collect me" and never
as a hazard; green is used by nothing hostile.

Pulse (loop base, bright, peak, bright at 200 ms): only the cross rim and the inner field change;
the outline frame and the silhouette never move.
  base   = cross rim pickup[1], field edge lit on top and left only.
  bright = the cross rim heats to pickup[2] (solid pale cross).
  peak   = also the lower and right field edges light up (pickup[1]): the whole panel glows.
Reduced motion holds 'base'."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # plate frame
    "d": ("pickup", 0),   # inner field
    "m": ("pickup", 1),   # lit field edge, cross rim (base)
    "L": ("pickup", 2),   # cross centre stroke; whole cross when bright
}

FRAMES = [
    # base
    [
        ".................",
        "..OOOOOOOOOOOOO..",
        ".OmmmmmmmmmmmmmO.",
        ".OmddddddddddddO.",
        ".OmddddmLmdddddO.",
        ".OmddddmLmdddddO.",
        ".OmddddmLmdddddO.",
        ".OmdmmmmLmmmmddO.",
        ".OmdLLLLLLLLLddO.",
        ".OmdmmmmLmmmmddO.",
        ".OmddddmLmdddddO.",
        ".OmddddmLmdddddO.",
        ".OmddddmLmdddddO.",
        ".OmddddddddddddO.",
        ".OmddddddddddddO.",
        "..OOOOOOOOOOOOO..",
        ".................",
    ],
    # bright
    [
        ".................",
        "..OOOOOOOOOOOOO..",
        ".OmmmmmmmmmmmmmO.",
        ".OmddddddddddddO.",
        ".OmddddLLLdddddO.",
        ".OmddddLLLdddddO.",
        ".OmddddLLLdddddO.",
        ".OmdLLLLLLLLLddO.",
        ".OmdLLLLLLLLLddO.",
        ".OmdLLLLLLLLLddO.",
        ".OmddddLLLdddddO.",
        ".OmddddLLLdddddO.",
        ".OmddddLLLdddddO.",
        ".OmddddddddddddO.",
        ".OmddddddddddddO.",
        "..OOOOOOOOOOOOO..",
        ".................",
    ],
    # peak
    [
        ".................",
        "..OOOOOOOOOOOOO..",
        ".OmmmmmmmmmmmmmO.",
        ".OmdddddddddddmO.",
        ".OmddddLLLddddmO.",
        ".OmddddLLLddddmO.",
        ".OmddddLLLddddmO.",
        ".OmdLLLLLLLLLdmO.",
        ".OmdLLLLLLLLLdmO.",
        ".OmdLLLLLLLLLdmO.",
        ".OmddddLLLddddmO.",
        ".OmddddLLLddddmO.",
        ".OmddddLLLddddmO.",
        ".OmdddddddddddmO.",
        ".OmmmmmmmmmmmmmO.",
        "..OOOOOOOOOOOOO..",
        ".................",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("pickup", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
