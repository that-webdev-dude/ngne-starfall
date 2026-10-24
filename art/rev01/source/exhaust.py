import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Flame points down; row 0 sits under the nozzle (pivot (3,0)). Hot core (D) at the nozzle,
# cooling to C, B, A toward the edges and the tip. The top three rows stay the same in the
# medium and long frames so the nozzle end never flickers; only the tail stretches.
LEGEND = {".": None, "A": ("exhaust", 0), "B": ("exhaust", 1), "C": ("exhaust", 2), "D": ("exhaust", 3)}

SHORT = [
    "..CDC..",
    ".BDDDB.",
    ".BCDCB.",
    ".ABCBA.",
    "..BCB..",
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


def pad(rows, h=15):
    return rows + ["......."] * (h - len(rows))


if __name__ == "__main__":
    imgs = [pixlib.grid_image(pad(f), LEGEND) for f in (SHORT, MEDIUM, LONG)]
    print(pixlib.save_sprite("exhaust", imgs))
