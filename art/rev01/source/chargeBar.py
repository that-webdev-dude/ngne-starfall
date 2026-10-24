"""Plasma charge bar, 6 frames (empty, level-1, level-2, level-3, ready-a, ready-b). 61x7, pivot (0,0); the
canvas is the bar. panel, plasma; 7 colours. Drawn at x 200..260, rows 344..350 on the charge plate.

Three cells of 19x7 at columns 0..18, 21..39 and 42..60 (2 px gaps show the plate). Each cell is a slot
with cut corners: row 0 and its end columns panel[0], row 6 the panel[2] lower lip; only the energy rows
1..5 between its columns 1..17 change, so every frame has the same mask.
  empty    = all three slots dark (panel[0]).
  level-n  = cells 1..n lit, one per plasmaCharge level (charge-1/2/3), in the lower plasma entries lit
             from the top: plasma[2] top row, plasma[1] body, plasma[0] bottom row.
  ready-a  = the 'on' state, plasmaReady's meaning and colour order: every cell one step lighter
             (plasma[3] top, plasma[2] body, plasma[1] bottom) with a 13 px plasma[4] white-hot core on
             row 3, 2 px short of each cell end, like plasmaReady's white core held inside the orb.
  ready-b  = the same lighter cells without the core line: still lighter than level-3, so "full" reads in
             both frames of the 120/120 ms loop (in step with plasmaReady).
Cyan, local to the HUD and never a whole-bar white flash, so it does not read as damage (playerFlash)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

CELL, GAP = 19, 2
LEGEND = {
    ".": None,
    "P": ("panel", 0),   # slot wall, empty cell
    "l": ("panel", 2),   # lit lower lip
    "0": ("plasma", 0),
    "1": ("plasma", 1),
    "2": ("plasma", 2),
    "3": ("plasma", 3),
    "4": ("plasma", 4),  # ready core
}

INNER = CELL - 2  # energy columns 1..17 of a cell
# energy rows 1..5, top to bottom; a single character fills the row
EMPTY = ["P", "P", "P", "P", "P"]
LIT = ["2", "1", "1", "1", "0"]
READY_A = ["3", "2", "22" + "4" * (INNER - 4) + "22", "2", "1"]
READY_B = ["3", "2", "2", "2", "1"]

def cell(energy: list[str]) -> list[str]:
    rows = [e * INNER if len(e) == 1 else e for e in energy]
    assert all(len(r) == INNER for r in rows)
    return (["." + "P" * INNER + "."]
            + ["P" + r + "P" for r in rows]
            + ["." + "l" * INNER + "."])

def bar(*cells: list[str]) -> list[str]:
    columns = [cell(c) for c in cells]
    return [("." * GAP).join(c[y] for c in columns) for y in range(7)]

FRAMES = [
    bar(EMPTY, EMPTY, EMPTY),        # empty
    bar(LIT, EMPTY, EMPTY),          # level-1
    bar(LIT, LIT, EMPTY),            # level-2
    bar(LIT, LIT, LIT),              # level-3
    bar(READY_A, READY_A, READY_A),  # ready-a
    bar(READY_B, READY_B, READY_B),  # ready-b
]

if __name__ == "__main__":
    print(pixlib.save_sprite("chargeBar", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
