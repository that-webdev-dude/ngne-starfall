"""Minelayer mine, 2 frames (idle, armed). 19x19, pivot (9,9); outline, brass, fire; 8 colours.
Replaces codeDrawn.mine (13 px diamond, 7 px core, 3 px hot centre).

Shape: a 13 px diamond (|dx|+|dy| <= 6 from the pivot) with an outline[0] rim; the 2 px brass
shell (|d| 4-5) is a four-faced pyramid lit from the top: the two upper faces brass[2], the two
lower faces brass[0], brass[1] at the waist (the left and right points) as the transition, so
the value split carries the silhouette at 1x on every background. The 7 px core (|d| <= 3) is
a recessed bowl: its upper lip is shadowed (brass[0]), the lower lip and floor are lit
(brass[2]). The 3 px hot centre is a 3x3 detonator lamp: fire[1] with a fire[3] centre, a red
warning light that reads at 1x and keeps the mine apart from the round coral bead, the red
needle, the magenta orb, the green pickup and the player's cyan effects.

armed (the burst cue, held, not blinking): the core heats to fire[2] (|d| 3) and fire[3] (|d| 2)
around a fire[4] centre, the heat leaks into the shell's inner ring (|d| 4, fire[1]), and four
2 px marks stand off the diamond's points (fire[1] at the point, fire[2] outside), inside the
19x19 canvas. The rim and the outer shell ring (|d| 5) are identical in both frames, so the
silhouette and the lit/shadow split do not pop; only heat appears.

The minelayer's release frame shows this mine at the same scale, centred on the mineRelease
socket and cropped by the hull: the core through the open bay doors, the lower half hanging
between the claws (source/minelayer.py)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # rim
    "a": ("brass", 0),    # lower faces, shadowed upper lip of the core
    "b": ("brass", 1),    # waist transition
    "c": ("brass", 2),    # upper faces, lit core floor
    "R": ("fire", 1),     # detonator lamp; armed heat ring and marks
    "f": ("fire", 2),     # armed core edge, mark tips
    "F": ("fire", 3),     # detonator centre; armed core
    "W": ("fire", 4),     # armed hot centre
}

FRAMES = [
    # idle
    [
        "...................",
        "...................",
        "...................",
        ".........O.........",
        "........OcO........",
        ".......OcccO.......",
        "......OccaccO......",
        ".....OccacaccO.....",
        "....OccaRRRaccO....",
        "...ObbccRFRccbbO...",
        "....OaacRRRcaaO....",
        ".....OaacccaaO.....",
        "......OaacaaO......",
        ".......OaaaO.......",
        "........OaO........",
        ".........O.........",
        "...................",
        "...................",
        "...................",
    ],
    # armed
    [
        "...................",
        ".........f.........",
        ".........R.........",
        ".........O.........",
        "........OcO........",
        ".......OcRcO.......",
        "......OcRfRcO......",
        ".....OcRfFfRcO.....",
        "....OcRfFWFfRcO....",
        ".fRObRfFWWWFfRbORf.",
        "....OaRfFWFfRaO....",
        ".....OaRfFfRaO.....",
        "......OaRfRaO......",
        ".......OaRaO.......",
        "........OaO........",
        ".........O.........",
        ".........R.........",
        ".........f.........",
        "...................",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("mine", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
