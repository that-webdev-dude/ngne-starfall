"""Option toggle, 2 frames (off, on). 19x9, pivot (0,0); the canvas is the switch (may touch edges).
outline, panel, ui; 6 colours. SOUND and REDUCED MOTION; right-aligned to itemX + 200 and centred on
the 15-row item (itemTop + 3) (presentation.screens.panel.settingsItem).

Same outer shape in both frames: a panel[3] frame with 1 px chamfered corners (reads on both the
panel[0] slot and the panel[2] focused plate). Inside, a 7x7 knob and a 9-column track, split by an
outline[0] column (the knob's side wall).
  knob = ui[2] lit top row over a ui[0] face, with a 3 px panel[3] grip line on its centre column.
  off  = knob left, track right recessed panel[0] (dark).
  on   = knob right, track left filled ui[1] (lit).
Greyscale: off is a light block beside a dark field; on is a light field with the knob across a dark
seam on the other side, so position and fill both carry the state."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "P": ("panel", 3),    # frame; knob grip
    "K": ("panel", 0),    # off track
    "O": ("outline", 0),  # knob side wall
    "u": ("ui", 0),       # knob face
    "W": ("ui", 2),       # knob lit top
    "A": ("ui", 1),       # on track
}

KNOB = ["WWWWWWW", "uuuuuuu", "uuuPuuu", "uuuPuuu", "uuuPuuu", "uuuuuuu", "uuuuuuu"]
EDGE = ".PPPPPPPPPPPPPPPPP."
OFF = [EDGE] + ["P" + k + "O" + "K" * 9 + "P" for k in KNOB] + [EDGE]
ON = [EDGE] + ["P" + "A" * 9 + "O" + k + "P" for k in KNOB] + [EDGE]

if __name__ == "__main__":
    print(pixlib.save_sprite("optionToggle", [pixlib.grid_image(f, LEGEND) for f in [OFF, ON]]))
