"""Option meter, 5 frames (level-0 .. level-4). 29x7, pivot (0,0); the canvas is the meter (may touch
edges). panel, ui; 4 colours. MUSIC and EFFECTS at 0, 25, 50, 75, 100 % (level = round(value * 4));
right-aligned to itemX + 200, centred on the 15-row item (itemTop + 4, the text rows)
(presentation.screens.panel.settingsItem).

A panel[3] frame with 1 px chamfered corners (same frame as optionToggle) holding 4 cells of 6x5,
split by panel[3] columns. Empty cell = a recessed panel[0] socket with a panel[2] lit lower lip
(the hudPip 'empty' language); filled cell = flat ui[1], the same 'on' fill as the toggle. Cells fill
left to right; the outline never changes, so the row keeps its rhythm at every level."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "P": ("panel", 3),  # frame and cell separators
    "K": ("panel", 0),  # empty cell
    "M": ("panel", 2),  # lit lower lip of an empty cell
    "A": ("ui", 1),     # filled cell
}

EMPTY = ["KKKKKK"] * 4 + ["MMMMMM"]
FULL = ["AAAAAA"] * 5

def level(n: int) -> list[str]:
    cells = [FULL if i < n else EMPTY for i in range(4)]
    edge = "." + "P" * 27 + "."
    return [edge] + ["P" + "P".join(c[r] for c in cells) + "P" for r in range(5)] + [edge]

FRAMES = [level(n) for n in range(5)]

if __name__ == "__main__":
    print(pixlib.save_sprite("optionMeter", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
