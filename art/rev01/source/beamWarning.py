"""Pre-fire beam warning marker, 2 frames (marker, marker-dim). 13x17, pivot (6,8); orb ramp only, 4 colours.
Replaces the code-drawn '!' and bar (codeDrawn.beamLane.warning.marker). Drawn at the beam centre x, at the
emitter end of the warning lane, above the lane; the lower triangle's tip points down the lane.

Two stacked 11x7 down-pointing triangles with a 1 px gap: orb[0] rim, upper body orb[2], lower body orb[3]
(the brighter mark leads down the lane). Each side is a clean 1:1 diagonal from the row under the top edge
to the tip; the top rim row caps it, so each corner is blunted by one vertical rim pixel (11 wide and
7 tall cannot be a pure 1:1 triangle, which would be 6 tall). The gap keeps the two marks apart at 1x:
on the 30% warning lane orb[0] almost vanishes and the bodies carry the read, so gap 0 merges them into one
arrow, and 7+1+7 rows keep the pivot on the centre row of an odd canvas.
marker-dim drops each body one step (upper orb[1], lower orb[2]) and keeps the rim, so the silhouette is
constant and only the bodies blink. Loop 120/120 ms; reduced motion holds 'marker'."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "0": ("orb", 0),  # rim
    "1": ("orb", 1),  # dim upper body
    "2": ("orb", 2),  # upper body / dim lower body
    "3": ("orb", 3),  # lower body
}

FRAMES = [
    # marker
    [
        ".............",
        ".00000000000.",
        ".02222222220.",
        "..022222220..",
        "...0222220...",
        "....02220....",
        ".....020.....",
        "......0......",
        ".............",
        ".00000000000.",
        ".03333333330.",
        "..033333330..",
        "...0333330...",
        "....03330....",
        ".....030.....",
        "......0......",
        ".............",
    ],
    # marker-dim
    [
        ".............",
        ".00000000000.",
        ".01111111110.",
        "..011111110..",
        "...0111110...",
        "....01110....",
        ".....010.....",
        "......0......",
        ".............",
        ".00000000000.",
        ".02222222220.",
        "..022222220..",
        "...0222220...",
        "....02220....",
        ".....020.....",
        "......0......",
        ".............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("beamWarning", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
