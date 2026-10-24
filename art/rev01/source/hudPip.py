"""HUD hull pip, 4 frames (full, empty, low-a, low-b). 7x7, pivot (3,3); the canvas is the pip (may touch
edges). outline, panel, hero, needle; 6 colours. Drawn on the hull plate (panel[1]) at x 420..460, y 5.

Same outer shape in every frame: a 7x7 square with 1 px chamfered corners and an outline[0] rim, so a
lost hull point never changes the row's rhythm.
  full   = a raised, clearly lit cell in the hero ramp (player identity), lit from the top: hero[3] top
           row, hero[2] body, hero[1] bottom row (hero[0] unused). Hull is the most critical number on
           screen, so full sits far above the empty socket in value (luma ~153 body vs ~15), not on the
           lower hero entries (gate 5 review B1: a hero[1] body read nearly as dark as empty at 1x).
  empty  = the same rim as a recessed socket: dark interior (outline[0]) with a panel[2] lower lip, the
           wall that faces the light in a recess.
  low-a  = full with a 3x3 needle[1] emissive core (codeDrawn.lowHullCue meaning: hull <= 1).
  low-b  = full with the emissive shrunk to its 1 px centre, so the pip still reads "low" in both
           frames of the ~2 Hz loop (250 ms each) and never looks like a plain full pip.
The 'on' state of the loop is low-a (3x3 orange core); reduced motion uses hudCalm pip-low."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # rim; recess interior
    "l": ("panel", 2),    # lit lower lip of the empty socket
    "d": ("hero", 1),     # lower edge (bottom row)
    "m": ("hero", 2),     # body
    "h": ("hero", 3),     # top light
    "n": ("needle", 1),   # low-hull emissive
}

FRAMES = [
    # full
    [
        ".OOOOO.",
        "OhhhhhO",
        "OmmmmmO",
        "OmmmmmO",
        "OmmmmmO",
        "OdddddO",
        ".OOOOO.",
    ],
    # empty
    [
        ".OOOOO.",
        "OOOOOOO",
        "OOOOOOO",
        "OOOOOOO",
        "OOOOOOO",
        "OlllllO",
        ".OOOOO.",
    ],
    # low-a
    [
        ".OOOOO.",
        "OhhhhhO",
        "OmnnnmO",
        "OmnnnmO",
        "OmnnnmO",
        "OdddddO",
        ".OOOOO.",
    ],
    # low-b
    [
        ".OOOOO.",
        "OhhhhhO",
        "OmmmmmO",
        "OmmnmmO",
        "OmmmmmO",
        "OdddddO",
        ".OOOOO.",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("hudPip", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
