"""Plasma ready pulse, 2-frame loop (120 ms each), held at the muzzle while the charge is full. 15x15, pivot
(7,7) on the plasmaMuzzle socket, drawn above the hull; plasma ramp, 3 colours (plasma[0] unused: it vanishes
on the clear colour). ready-a: a round 9x9 orb (x3..11, y3..11) at least as large as the charge-3 core:
plasma[2] rim, plasma[3] body, plasma[4] plus-shaped core. ready-b: the same orb with its core swollen to a
3x3 and a 1 px plasma[1] halo breathed out around the rim (11x11, x2..12, y2..12). Only the halo and four
core pixels change, so the loop pulses without popping. Round, symmetric and rayless: it reads as energy
held at full size, distinct from charge-3's spinning pinwheel tendrils, and local to the muzzle, unlike the
whole-hull playerFlash. Content reaches at most 5 px below the pivot (same as charge-3)."""
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
        ".....22222.....",
        "....2333332....",
        "...233333332...",
        "...233444332...",
        "...233444332...",
        "...233444332...",
        "...233333332...",
        "....2333332....",
        ".....22222.....",
        "...............",
        "...............",
        "...............",
    ],
    # ready-b
    [
        "...............",
        "...............",
        ".....11111.....",
        "....1222221....",
        "...123333321...",
        "..12334443321..",
        "..12344444321..",
        "..12344444321..",
        "..12344444321..",
        "..12334443321..",
        "...123333321...",
        "....1222221....",
        ".....11111.....",
        "...............",
        "...............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("plasmaReady", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
