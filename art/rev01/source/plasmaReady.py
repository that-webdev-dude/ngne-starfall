"""Plasma ready pulse, 2-frame loop (120 ms each), held at the muzzle while the charge is full. 15x15, pivot
(7,7) on the plasmaMuzzle socket, drawn above the hull; plasma ramp, 2 colours. ready-a: 5 px hot core
(plasma[4] plus inside plasma[3]). ready-b: the same core breathed out 1 px with a 1 px white rim (7 px).
Small, round and steady at one point, so it reads as "weapon ready", not as the whole-hull damage flash."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "1": ("plasma", 1),  # cooling edge, mote tails
    "2": ("plasma", 2),
    "3": ("plasma", 3),
    "4": ("plasma", 4),  # white-hot
}

FRAMES = [
    # ready-a
    [
        "...............",
        "...............",
        "...............",
        "...............",
        "...............",
        "......333......",
        ".....33433.....",
        ".....34443.....",
        ".....33433.....",
        "......333......",
        "...............",
        "...............",
        "...............",
        "...............",
        "...............",
    ],
    # ready-b
    [
        "...............",
        "...............",
        "...............",
        "...............",
        "......444......",
        ".....43334.....",
        "....4334334....",
        "....4344434....",
        "....4334334....",
        ".....43334.....",
        "......444......",
        "...............",
        "...............",
        "...............",
        "...............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("plasmaReady", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
