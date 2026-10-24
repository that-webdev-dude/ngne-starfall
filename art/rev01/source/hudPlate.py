"""HUD backing plate, 3-slice (left 5x13, fill 1x13, right 5x13), pivot (0,0); slices meet edge to edge.
outline, panel; 3 colours. Sits on the code-drawn band (panel[0]) behind each HUD text group, rows 2..14
(top) or 341..353 (bottom): left cap at the plate's first column, fill repeated, right cap ending at its
last column. Text starts at cap column 4 and may end on the right cap's column 0, so both are body.

A low raised plate lit from the top: panel[2] top bevel, panel[1] face, outline[0] bottom edge (the shadow
side, which merges into the band). 2 px chamfered corners, lit on the upper diagonal and dark on the lower
one. Nothing brighter than panel[2], so the plate stays quieter than any text colour on it."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # bottom (shadow) edge
    "F": ("panel", 1),    # face
    "B": ("panel", 2),    # top bevel
}

LEFT = [
    "..BBB",
    ".BFFF",
    "BFFFF",
    "FFFFF",
    "FFFFF",
    "FFFFF",
    "FFFFF",
    "FFFFF",
    "FFFFF",
    "FFFFF",
    "FFFFF",
    ".OFFF",
    "..OOO",
]
FILL = ["B"] + ["F"] * 11 + ["O"]
RIGHT = [r[::-1] for r in LEFT]

if __name__ == "__main__":
    print(pixlib.save_sprite("hudPlate", [pixlib.grid_image(f, LEGEND) for f in (LEFT, FILL, RIGHT)]))
