"""Menu panel 9-slice, 9 frames (top-left, top, top-right, left, fill, right, bottom-left, bottom,
bottom-right). Corners 7x7, top/bottom edges 1x7, left/right edges 7x1, fill 1x1; pivot (0,0).
outline, panel; 5 colours. Used by pause, settings, controls and result (presentation.screens.panel).

Assembly: corners at the panel's four corners, top/bottom edges repeated across (width - 14), left/right
edges repeated down (height - 14), fill repeated over the inside. Every edge slice is a constant
cross-section, so any length tiles without a seam; the slices meet edge to edge.

Construction (cross-section from the outside in): outline[0] rim, a 2 px raised frame, a 1 px panel[0]
groove, then the panel[1] fill (the recessed face that carries text).
Light from the top:
  top    = outline[0], panel[3] lit face, panel[2], panel[0] groove (the frame's shadow on the fill)
  sides  = outline[0], panel[2], panel[2], panel[0] groove
  bottom = panel[0] groove, panel[2] lit lip (faces up), panel[1] lower face, outline[0]
So the top edge is one step lighter than the bottom (panel[3]/[2] vs panel[2]/[1]).
Corners are 45-degree chamfers (3 px cut, 1:1 steps), like the hull plates: the upper chamfers carry
the lit panel[3] face, the lower ones the dark panel[1] face. The groove keeps square inner corners."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # outer rim
    "K": ("panel", 0),    # groove between frame and fill
    "D": ("panel", 1),    # fill; lower face of the bottom frame and lower chamfers
    "M": ("panel", 2),    # frame body; lit lip of the bottom frame
    "H": ("panel", 3),    # lit top face and upper chamfers
}

TOP_LEFT = [
    "...OOOO",
    "..OHHHH",
    ".OHMMMM",
    "OHMKKKK",
    "OMMKDDD",
    "OMMKDDD",
    "OMMKDDD",
]
BOTTOM_LEFT = [
    "OMMKDDD",
    "OMMKDDD",
    "OMMKDDD",
    "OMMKKKK",
    ".OMMMMM",
    "..ODDDD",
    "...OOOO",
]
TOP = ["O", "H", "M", "K", "D", "D", "D"]
BOTTOM = ["D", "D", "D", "K", "M", "D", "O"]
LEFT = ["OMMKDDD"]
FILL = ["D"]

def mirror(grid: list[str]) -> list[str]:
    return [row[::-1] for row in grid]

FRAMES = [TOP_LEFT, TOP, mirror(TOP_LEFT), LEFT, FILL, mirror(LEFT), BOTTOM_LEFT, BOTTOM, mirror(BOTTOM_LEFT)]

if __name__ == "__main__":
    print(pixlib.save_sprite("menuPanel", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
