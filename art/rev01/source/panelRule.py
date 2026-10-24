"""Panel rule 3-slice, 3 frames (left, fill, right). Caps 5x3, fill 1x3; pivot (0,0).
panel, ui; 3 colours. The divider under a panel title (presentation.screens.panel.rule:
panelTop + 22, x 212..428).

The fill is an engraved groove in the panel[1] fill, lit from the top: two panel[0] rows (the upper wall
in shadow) over a panel[3] lit lower lip, so at 1x it reads as one thin light line with a shadow above.
Each cap ends the groove one column short and sets a 3x3 panel[3] diamond stud with a ui[0] centre,
the only ui accent on the rule (a panel[2] stud vanished on the panel[1] fill at 1x).
Repeat the fill over (width - 10); any length tiles."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "K": ("panel", 0),  # groove wall in shadow
    "H": ("panel", 3),  # lit lower lip; stud
    "u": ("ui", 0),     # stud centre
}

LEFT = [
    ".H..K",
    "HuH.K",
    ".H..H",
]
FILL = ["K", "K", "H"]

def mirror(grid: list[str]) -> list[str]:
    return [row[::-1] for row in grid]

FRAMES = [LEFT, FILL, mirror(LEFT)]

if __name__ == "__main__":
    print(pixlib.save_sprite("panelRule", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
