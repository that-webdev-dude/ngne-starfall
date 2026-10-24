"""Menu item 3-slice, 9 frames (left, fill, right for normal, focused and disabled). Caps 5x15,
fill 1x15; pivot (0,0). outline, panel, ui; 6 colours. Rows 209 x 15 at x 216..424, text on
itemTop + 4..10 (presentation.screens.panel.item). Repeat the fill over (width - 10).

Three states, each with its own cap shape so focus never depends on colour alone:
  normal   = a recessed slot: chamfered ends (2 px, 1:1), outline[0] top and side walls (the walls in
             shadow), panel[0] floor, panel[2] lit lower lip and lower chamfers (the walls that face up).
             Text: label (ui[0]).
  focused  = a raised plate with square ends: panel[3] lit top row, panel[2] face, outline[0] bottom
             row; outside each end a ui[1] bracket ([ on the left, ] on the right), the warm side bars
             of the current menu turned into a shape. Brighter face + brackets read in greyscale.
             Text: ui[1] (proposal; textColors has no focus entry).
  disabled = the normal chamfered outline drawn only as a panel[0] line on the panel[1] fill, no lip:
             a flat ghost slot. Text: disabled (panel[3])."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # shadowed slot walls; plate underside
    "K": ("panel", 0),    # slot floor; disabled outline
    "D": ("panel", 1),    # disabled face (= panel fill)
    "M": ("panel", 2),    # lit slot lip; focused plate face
    "H": ("panel", 3),    # focused plate lit top
    "A": ("ui", 1),       # focus brackets
}

NORMAL_LEFT = ["..OOO", ".OKKK"] + ["OKKKK"] * 11 + [".MKKK", "..MMM"]
NORMAL_FILL = ["O"] + ["K"] * 13 + ["M"]
FOCUSED_LEFT = ["AA.HH"] + ["A..MM"] * 13 + ["AA.OO"]
FOCUSED_FILL = ["H"] + ["M"] * 13 + ["O"]
DISABLED_LEFT = ["..KKK", ".KDDD"] + ["KDDDD"] * 11 + [".KDDD", "..KKK"]
DISABLED_FILL = ["K"] + ["D"] * 13 + ["K"]

def mirror(grid: list[str]) -> list[str]:
    return [row[::-1] for row in grid]

FRAMES = [
    NORMAL_LEFT, NORMAL_FILL, mirror(NORMAL_LEFT),
    FOCUSED_LEFT, FOCUSED_FILL, mirror(FOCUSED_LEFT),
    DISABLED_LEFT, DISABLED_FILL, mirror(DISABLED_LEFT),
]

if __name__ == "__main__":
    print(pixlib.save_sprite("menuItem", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
