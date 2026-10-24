import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Kiln Serpent body segment, 41x23, pivot (20,11). Same orientation and light as kilnHead: canvas +x is
# screen top (lit end), canvas top/bottom are screen left/right, where the chain runs. Rear coupling = steel
# bellows at the top centre, front coupling = bottom centre (toward the head); both on the pivot column x=20.
# Bellows (rev01 pass 2): each coupling is a flange plus folds across the coupling axis (canvas rows, so they
# read as rings across the chain on screen), lit from +x like the rest; they replaced the fluted stubs.
# Capsule barrel: rows turn away from the viewer toward top/bottom, so the shading curves (C-shaped shadow on
# the plate, lens highlight on the lit side). Core window from rust[3] + steel[3]; end discs are steel gear rings.
LEGEND = {
    ".": None,
    "o": ("outline", 0), "n": ("outline", 1),
    "a": ("steel", 0), "b": ("steel", 1), "c": ("steel", 2), "d": ("steel", 3),
    "1": ("rust", 0), "2": ("rust", 1), "3": ("rust", 2), "4": ("rust", 3),
}
ROWS = [
    "................oabbcccdo................",
    ".......ooooooooonaaaabbcnooooooooo.......",
    "......o222222222nabbcccdn223333333o......",
    "...oo22222222222naaaabbcn33333333333ooo..",
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
    "...oo22222222222naaaabbcn33333333333ooo..",
    "......o222222222nabbcccdn223333333o......",
    ".......ooooooooonaaaabbcnooooooooo.......",
    "................oabbcccdo................",
]

# compressed: shown while the chain turns. Both bellows shorten 1 px toward the core (canvas y): the flange
# and the folds move in one row, and the outermost row (cols 16-24) empties; the stub sides and the hull do
# not change, so only rows 0-3 / 19-22 at cols 16-24 differ from idle.
def compress(rows):
    g = list(rows)
    for edge, step in ((0, 1), (22, -1)):
        g[edge] = rows[edge][:16] + "." * 9 + rows[edge][25:]
        g[edge + step] = rows[edge + step][:17] + rows[edge][17:24] + rows[edge + step][24:]
        g[edge + 2 * step] = rows[edge + 2 * step][:17] + rows[edge + step][17:24] + rows[edge + 2 * step][24:]
        g[edge + 3 * step] = rows[edge + 3 * step][:17] + rows[edge + 2 * step][17:24] + rows[edge + 3 * step][24:]
    return g

# destroyed (gate 4): burnt-out husk kept in the chain while the head lives. The couplings (rows 0-3 and
# 19-22, cols 16-24) are untouched, so the sockets and the code links stay where idle has them.
# The barrel is split by a 2:1 diagonal gap through the core window, from the shadow-side end ring, which it
# notches, to the lit stripe band, where a small fire burns out of it with its tongue toward canvas +x (screen up). Its edges are scorched (rust[0]); a
# short crack crosses the plate on the lit side of the window (screen upper left). The hull is blackened one value, the core
# window is dark with one fire[0] ember; the lit +x end ring keeps its values, so the husk still reads as
# a lit segment (dim, not dead).
LEGEND.update({"5": ("fire", 0), "6": ("fire", 1), "7": ("fire", 2), "8": ("fire", 3), "9": ("fire", 4)})
SPLIT = [(3, 5), (4, 5), (5, 6), (6, 6), (7, 7), (8, 7), (9, 8), (10, 8), (11, 9), (12, 9), (13, 10), (14, 10),
         (15, 11), (16, 11), (17, 12), (18, 12), (19, 13), (20, 13), (21, 14), (22, 14), (23, 15), (24, 15),
         (25, 16)]
NOTCH = [(1, 5, "."), (2, 5, "o")]                               # the split bites the end-ring outline
FIRE = [(26, 15, "6"), (27, 15, "7"), (26, 16, "8"), (27, 16, "8"), (28, 16, "7"), (26, 17, "6"), (27, 17, "7")]
SCORCH = [(5, 7), (8, 8), (11, 10), (12, 10), (14, 9), (15, 10), (21, 15), (22, 15), (23, 14), (24, 16), (25, 17),
          (25, 15), (24, 14)]
CRACK = [(22, 6), (23, 6), (24, 7), (25, 7)]                          # short crack, upper plate
WINDOW = {10: "nnnnnnn", 11: "nn5nnnn", 12: "nnnnnnn"}                # cols 17-23: dark core window
BLACKEN = {"4": "3", "3": "2", "2": "1", "d": "c", "c": "b", "b": "a"}
KEEP = {(x, y) for y in range(23) for x in range(16, 25) if y <= 3 or y >= 19}    # couplings
KEEP |= {(x, y) for y in range(23) for x in range(36, 41)}                       # lit end ring

def destroyed(rows):
    g = [list(r) for r in rows]
    for y in range(23):
        for x in range(41):
            if (x, y) not in KEEP: g[y][x] = BLACKEN.get(g[y][x], g[y][x])
    for y, s in WINDOW.items(): g[y][17:24] = list(s)
    for x, y in SCORCH:
        if g[y][x] in "234": g[y][x] = "1"
    for x, y in SPLIT + CRACK: g[y][x] = "o"
    for x, y, c in NOTCH + FIRE: g[y][x] = c
    return ["".join(r) for r in g]

DESTROYED = destroyed(ROWS)
for y in list(range(0, 4)) + list(range(19, 23)):  # couplings identical to idle
    assert DESTROYED[y][16:25] == ROWS[y][16:25], y

FRAMES = [ROWS, compress(ROWS), DESTROYED]
pixlib.save_sprite("kilnSegment", [pixlib.grid_image(f, LEGEND) for f in FRAMES])
