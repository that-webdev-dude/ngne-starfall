import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Kiln Serpent body segment, 41x23, pivot (20,11). Same orientation and light as kilnHead: canvas +x is
# screen top (lit end), canvas top/bottom are screen left/right, where the chain runs. Rear coupling = steel
# bellows at the top centre, front coupling = bottom centre (toward the head); both on the pivot column x=20.
# Capsule barrel: rows turn away from the viewer toward top/bottom, so the shading curves (C-shaped shadow on
# the plate, lens highlight on the lit side). Core window from rust[3] + steel[3]; end discs are steel gear rings.
LEGEND = {
    ".": None,
    "o": ("outline", 0), "n": ("outline", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("rust", 0), "2": ("rust", 1), "3": ("rust", 2), "4": ("rust", 3),
}
ROWS = [
    "................obacacado................",
    ".......ooooooooonbacacadnooooooooo.......",
    "......o222222222nbacacadn223333333o......",
    "...oo22222222222nbacacadn33333333333ooo..",
    "..oaa12nnn33nnnnnnnnnnnnnnnnnn44nn33bao..",
    ".oaab12nn33nn222222222333333n44nnn43bbbo.",
    "..oab22n33nnn22b223333333d43n4nn4n43cbo..",
    ".oabb22n3nn3n223333333333444nnn44n44ccbo.",
    "..obb22nnn33n223333333334444nn44nn44cco..",
    ".oabc22nn33nn2233ooooooo3444n44nnn44dcbo.",
    "oaobc22n33nnn223o3444443o444n4nn4n44dcoco",
    "bcabc22n3nn3n223o4dd4dd4o444nnn44n44dcbdd",
    "oaobc22nnn33n223o3444443o444nn44nn44dcoco",
    ".oabc22nn33nn2233ooooooo3444n44nnn44dcbo.",
    "..obb22n33nnn223333333334444n4nn4n44cco..",
    ".oabb22n3nn3n223333333333444nnn44n44ccbo.",
    "..oab22nnn33n22b223333333d43nn44nn43cbo..",
    ".oaab12nn33nn222222222333333n44nnn43bbbo.",
    "..oaa12n33nnnnnnnnnnnnnnnnnnn4nn4n33bao..",
    "...oo22222222222nbacacadn33333333333ooo..",
    "......o222222222nbacacadn223333333o......",
    ".......ooooooooonbacacadnooooooooo.......",
    "................obacacado................",
]
pixlib.save_sprite("kilnSegment", [pixlib.grid_image(ROWS, LEGEND)])
