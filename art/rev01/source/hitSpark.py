"""Hit spark, 3 frames played once (30, 40, 50 ms): player shot hitting a hull. Contact flash
(white 3x3 with short rays), rays lengthen while the centre cools, then sparse fading fragments.
Shots travel up, so the splash sprays back down and sideways: rays measured from the centre are
up 1, left 3, right 4, down 5 (the down ray kinks right), and the fragments fall down-right.
11x11, pivot (5,5); plasma ramp (4 colours; plasma[0] is unused because it vanishes on the
clear colour). Drawn above the hull at the impact point."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "1": ("plasma", 1),  # cooling glow, fragment tails
    "2": ("plasma", 2),
    "3": ("plasma", 3),
    "W": ("plasma", 4),  # white-hot contact
}

FRAMES = [
    # contact flash (down ray already kinks right)
    [
        "...........",
        "...........",
        "...........",
        ".....3.....",
        "....3W3....",
        "..23WWW32..",
        "....3W3....",
        ".....3.....",
        "......2....",
        "...........",
        "...........",
    ],
    # rays lengthen (left 3, right 4, down 5 with a kink, up 1), centre cools
    [
        "...........",
        "...........",
        "...........",
        "...........",
        "....121....",
        "..13232321.",
        "....121....",
        ".....3.....",
        ".....3.....",
        "......21...",
        "...........",
    ],
    # sparse fading fragments, biased down and right
    [
        "...........",
        "...........",
        "...........",
        "...........",
        "...........",
        "...........",
        ".21..1..12.",
        ".........1.",
        "...........",
        ".......12..",
        "...........",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("hitSpark", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
