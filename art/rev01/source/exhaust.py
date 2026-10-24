import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Flame points down; row 0 sits under the nozzle (pivot (3,0)). Hot core (D) at the nozzle,
# cooling to C, B, A toward the edges and the tip. The top three rows stay the same in the
# medium and long frames so the nozzle end never flickers; only the tail stretches.
# Lateral flicker: medium-left / medium-right are the medium flame with the tail bent 1 px to
# that side. Rows 0-4 are medium's; row 5 is the bend joint (one pixel wider, core 2 px wide so
# it touches the core above and below edge-to-edge); rows 6-9 are medium's shifted 1 px.
# Nozzle join (asserted below): rows 0-1 are identical in all five frames and rows 0-2 in every
# frame but the approved short one, whose row 2 (.BCDCB.) is one value cooler than medium's.
# Row 4 is .ABCBA. in short, medium, medium-left and medium-right (asserted below).
LEGEND = {".": None, "A": ("exhaust", 0), "B": ("exhaust", 1), "C": ("exhaust", 2), "D": ("exhaust", 3)}

SHORT = [
    "..CDC..",
    ".BDDDB.",
    ".BCDCB.",
    ".ABCBA.",
    ".ABCBA.",  # row 4 = medium's row 4, so its side pixels (1,4)/(5,4) persist across short<->medium
    "..ABA..",
    "...A...",
]
MEDIUM = [
    "..CDC..",
    ".BDDDB.",
    ".CDDDC.",
    ".BCDCB.",
    ".ABCBA.",
    "..BCB..",
    "..BCB..",
    "..ABA..",
    "...B...",
    "...A...",
]
LONG = [
    "..CDC..",
    ".BDDDB.",
    ".CDDDC.",
    ".BCDCB.",
    ".BCDCB.",
    ".ABCBA.",
    "..BCB..",
    "..BCB..",
    "..BCB..",
    "..ABA..",
    "..ABA..",
    "...B...",
    "...A...",
    "...A...",
]

MEDIUM_LEFT = MEDIUM[:5] + [
    ".BCCB..",
    ".BCB...",
    ".ABA...",
    "..B....",
    "..A....",
]
MEDIUM_RIGHT = [r[::-1] for r in MEDIUM_LEFT]  # the flame is symmetric, so mirror the left bend
FRAMES = (SHORT, MEDIUM, LONG, MEDIUM_LEFT, MEDIUM_RIGHT)
assert all(f[:2] == MEDIUM[:2] for f in FRAMES), "rows 0-1 (nozzle join) must match in every frame"
assert all(f[:3] == MEDIUM[:3] for f in FRAMES[1:]), "rows 0-2 must match in medium/long/left/right"
assert MEDIUM_RIGHT[:5] == MEDIUM[:5]
assert SHORT[4] == MEDIUM[4] == MEDIUM_LEFT[4], "row 4 keeps 5 px so (1,4)/(5,4) never pop"


def pad(rows, h=15):
    return rows + ["......."] * (h - len(rows))


if __name__ == "__main__":
    imgs = [pixlib.grid_image(pad(f), LEGEND) for f in FRAMES]
    print(pixlib.save_sprite("exhaust", imgs))
