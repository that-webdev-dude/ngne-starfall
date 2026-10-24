"""Nova recharge bar, 4 frames (track, fill, ready-a, ready-b). 85x5, pivot (0,0); the canvas is the bar.
panel, nova; 6 colours. Drawn at x 546..630, rows 6..10 on the nova plate (panel[1]).

Every frame has the same mask: an 85x5 slot with its four corner pixels cut. Row 0 and the end columns
are panel[0] (the slot's shadowed top wall and ends), row 4 is the panel[2] lower lip (the recess wall
that faces the top light). Only the energy rows 1..3 between columns 1..83 change.
  track   = empty slot: rows 1..3 panel[0].
  fill    = the full bar in the lower nova entries: nova[1] rows 1..2, nova[0] row 3 (lit from the top).
            Uniform along x with no end cap: the consumer draws columns [0, ceil(85 * nova)) of it over
            the track, and any cut reads as a clean leading edge (column 84 is panel[0] in both frames).
  ready-a = the 'on' state: the energy one or two steps lighter, nova[3] top row, nova[2], nova[1].
  ready-b = nova[2] top row, nova[1] below: dimmer than ready-a but still lighter than fill, so the bar
            reads "ready" in both frames of the 300/300 ms loop.
The 'on' state of the loop is ready-a (nova[3] top line, matching the NOVA READY text colour)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

W = 85
LEGEND = {
    ".": None,
    "P": ("panel", 0),  # slot wall, empty slot
    "l": ("panel", 2),  # lit lower lip
    "0": ("nova", 0),
    "1": ("nova", 1),
    "2": ("nova", 2),
    "3": ("nova", 3),
}

def bar(top: str, mid: str, low: str) -> list[str]:
    """Slot frame around three energy rows (one legend character each, repeated over columns 1..83)."""
    return [
        "." + "P" * (W - 2) + ".",
        "P" + top * (W - 2) + "P",
        "P" + mid * (W - 2) + "P",
        "P" + low * (W - 2) + "P",
        "." + "l" * (W - 2) + ".",
    ]

FRAMES = [
    bar("P", "P", "P"),  # track
    bar("1", "1", "0"),  # fill
    bar("3", "2", "1"),  # ready-a
    bar("2", "1", "1"),  # ready-b
]

if __name__ == "__main__":
    print(pixlib.save_sprite("novaBar", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
