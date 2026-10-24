"""Boss health bar, 2 frames (track, fill). 241x5, pivot (0,0); the canvas is the bar. panel, alert;
6 colours. Drawn at x 200..440, rows 23..27 on the top band (no plate), under the boss name.

Same slot as novaBar so the two read as one family: an 241x5 slot with its four corner pixels cut, row 0
and the end columns panel[0], row 4 the panel[2] lower lip.
  track = empty slot: rows 1..3 panel[1]. The bar sits on the band (panel[0]) with no plate, so the
          slot floor is one step lighter than the band (the plate face colour) to keep the lost part of
          the bar visible; novaBar and chargeBar sit on panel[1] plates and use panel[0] floors instead.
  fill  = the full bar lit from the top: alert[2] top row, alert[1] body, alert[0] bottom row. Uniform
          along x with no end cap: the consumer draws columns [0, ceil(241 * fraction)) over the track,
          so any cut is a clean leading edge. Muted coral, darker and greyer than the bead/needle
          hostile ramps, so health never competes with bullets."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

W = 241
LEGEND = {
    ".": None,
    "P": ("panel", 0),  # slot wall
    "f": ("panel", 1),  # empty slot floor
    "l": ("panel", 2),  # lit lower lip
    "0": ("alert", 0),
    "1": ("alert", 1),
    "2": ("alert", 2),
}

def bar(top: str, mid: str, low: str) -> list[str]:
    """Slot frame around three energy rows (one legend character each, repeated over columns 1..239)."""
    return [
        "." + "P" * (W - 2) + ".",
        "P" + top * (W - 2) + "P",
        "P" + mid * (W - 2) + "P",
        "P" + low * (W - 2) + "P",
        "." + "l" * (W - 2) + ".",
    ]

FRAMES = [
    bar("f", "f", "f"),  # track
    bar("2", "1", "0"),  # fill
]

if __name__ == "__main__":
    print(pixlib.save_sprite("bossBar", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
