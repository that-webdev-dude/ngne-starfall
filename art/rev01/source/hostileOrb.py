"""Heavy hostile plasma, 1 frame. 13x13, pivot (6,6); orb ramp, 4 colours (outline unused).
Emissive round orb (gate 1 decision): orb[0] rim, orb[2] corona arc lit from the upper left fading into
the orb[1] shell lower right, orb[3] hot core on the pivot with an orb[2] halo. The core/shell/corona
pattern, not a lit ball, separates it from the bead; the round silhouette and dark rim separate it from
the player's elongated rimless plasma. Study B."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "0": ("orb", 0),  # rim
    "1": ("orb", 1),  # shell
    "2": ("orb", 2),  # corona, halo
    "3": ("orb", 3),  # hot core
}

FRAMES = [
    # orb
    [
        ".............",
        "....00000....",
        "...0222210...",
        "..022111110..",
        "..021122110..",
        ".02112322110.",
        ".02123332110.",
        ".02112321110.",
        "..011122110..",
        "..011111110..",
        "...0111110...",
        "....00000....",
        ".............",
    ],
]

if __name__ == "__main__":
    print(pixlib.save_sprite("hostileOrb", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
