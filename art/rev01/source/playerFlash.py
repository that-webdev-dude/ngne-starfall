"""Damage flash: one bright counterpart per player pose (same order, silhouette and sockets).

Derived from source/player.py by a legend remap, so every flash frame stays pixel-aligned with its
pose: hull planes are lifted to high values (hero[3], plasma[2..4], steel[2..3]) and keep their
plane order (darker planes stay a step below lit ones), the outline stays dark so the silhouette
holds on the dark backgrounds, and the cockpit accent is kept. It flashes the whole hull, so it
cannot be confused with the charge-ready cue, which stays local at the plasma muzzle.
Hand fixes, applied after the remap, are listed in FIXES."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib
import importlib.util

_spec = importlib.util.spec_from_file_location("player_source", Path(__file__).resolve().parent / "player.py")
player = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(player)

LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),                     # outline kept dark
    "k": ("cockpit", 0), "K": ("cockpit", 1),                     # cockpit accent kept
    "a": ("plasma", 2), "b": ("hero", 3), "c": ("plasma", 3), "d": ("plasma", 4),
    "1": ("steel", 2), "2": ("steel", 3), "3": ("steel", 3), "4": ("plasma", 4),
}

# Hand fixes after the remap: (row, from, to) for every frame. Row 11 holds the dark shadows behind the
# pod gun housings; in the flash they read as holes punched in the pod heads, so they become steel[2].
# All other outline pixels (silhouette, wing seams, canopy recess rim, collar undersides) stay dark.
FIXES = [(11, "o", "1")]


def frames():
    out = []
    for i, f in enumerate(player.frames()):
        rows = [list(r) for r in f]
        for y, old, new in FIXES:
            rows[y] = [new if ch == old else ch for ch in rows[y]]
        out.append(["".join(r) for r in rows])
    return out


if __name__ == "__main__":
    print(pixlib.save_sprite("playerFlash", [pixlib.grid_image(f, LEGEND) for f in frames()]))
