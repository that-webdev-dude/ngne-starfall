"""Reduced-motion HUD cues (gate 5), 3 frames with their own canvases: pip-low 7x7, nova-ready 85x5,
charge-ready 61x7; pivot (0,0), each placed at the top-left its looping sprite uses (presentation.layout).
outline, panel, hero, needle, nova, plasma; 10 colours. Each frame keeps the mask of the loop it replaces
and holds the 'ready' / 'low' meaning without motion (presentation.reducedMotion.map).

All three use plasmaReadyCalm's vocabulary for a held cue: a closed ring. On the bars it is a bright ring
around the energy, which neither the fill nor a charge level ever has (both are top-lit gradients, cut open
at the leading edge while filling), so ready reads by shape, also in greyscale, not only by being lighter;
on the pip it is the 3x3 emissive around one dark pixel.
  pip-low      = hudPip low-a with its centre pixel cut to outline[0]: a needle[1] ring around a dark
                 pinhole. low-a alone reads in colour but its core is only ~40 luma below the hero[2] body, so
                 in greyscale the static pip looked almost like a full one; the pinhole makes a bullseye
                 (153 body / 113 ring / 15 centre) that reads at 1x without hue or motion, uses no extra
                 colour, and is the same ring shape as the two bars. Top light (hero[3] row, hero[1] bottom
                 row), rim and mask as every hudPip frame; the steady emissive still matches
                 codeDrawn.lowHullCue in reduced motion ('held steady'). Not a copy of low-a or low-b.
  nova-ready   = a nova[3] ring (rows 1 and 3, end columns 1 and 83) around a nova[1] core row: the full
                 bar framed in the NOVA READY text colour, ~190 mean luma against the fill's ~105, with bright
                 end markers the fill never has. Not ready-a (top-lit gradient, distinct mainly by value).
  charge-ready = each cell a plasma[3] ring, a 1 px dark gap (the slot floor) and the 13 px plasma[4] core of
                 ready-a (cell columns 3..15, row 3): plasmaReadyCalm's ring-gap-core in cell form, so the HUD
                 and the muzzle marker read as the same held 'full'. Not ready-a (no ring, no gap).
Colour budget: the loops' 'on' frames together use 14 colours and the strip allows 10, so the bars draw
their slot walls and the charge gap in outline[0] (#0b0f1c, a 3-step neighbour of the loops' panel[0]
#08121f, indistinguishable at 1x), the rings are one step (no top/bottom split), and nova[2], plasma[1],
plasma[2] are not used. The lower lips stay panel[2] like every bar frame."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0),  # pip rim and pinhole; bar slot walls; charge ring gap
    "l": ("panel", 2),    # lit lower lip of the bar slots
    "d": ("hero", 1),     # pip bottom row
    "m": ("hero", 2),     # pip body
    "h": ("hero", 3),     # pip top light
    "n": ("needle", 1),   # low-hull emissive
    "a": ("nova", 1),     # nova core row
    "A": ("nova", 3),     # nova ring
    "R": ("plasma", 3),   # charge ring
    "W": ("plasma", 4),   # charge core
}

PIP_LOW = [  # hudPip low-a with a dark centre
    ".OOOOO.",
    "OhhhhhO",
    "OmnnnmO",
    "OmnOnmO",
    "OmnnnmO",
    "OdddddO",
    ".OOOOO.",
]

def nova_ready(w: int = 85) -> list[str]:
    inner = w - 2  # energy columns 1..83
    return [
        "." + "O" * inner + ".",
        "O" + "A" * inner + "O",
        "OA" + "a" * (inner - 2) + "AO",
        "O" + "A" * inner + "O",
        "." + "l" * inner + ".",
    ]

CELL, GAP = 19, 2

def charge_cell() -> list[str]:
    inner = CELL - 2  # energy columns 1..17
    energy = [
        "R" * inner,
        "R" + "O" * (inner - 2) + "R",
        "RO" + "W" * (inner - 4) + "OR",
        "R" + "O" * (inner - 2) + "R",
        "R" * inner,
    ]
    return ["." + "O" * inner + "."] + ["O" + r + "O" for r in energy] + ["." + "l" * inner + "."]

def charge_ready() -> list[str]:
    c = charge_cell()
    return [("." * GAP).join([c[y]] * 3) for y in range(7)]

FRAMES = [PIP_LOW, nova_ready(), charge_ready()]  # pip-low, nova-ready, charge-ready

if __name__ == "__main__":
    print(pixlib.save_sprite("hudCalm", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
