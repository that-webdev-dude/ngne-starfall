import runpy, sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Gatebreaker turret: one instance per leftTurret / rightTurret socket, drawn above the hull.
# 27x45, pivot (13,14) = the socket = the turret centre, (32,43) / (126,43) on the hull canvas.
# Frames (spec order): idle, telegraph, firing, down. Light from the top.
#
# idle/telegraph/firing are cut from the hull source's own drawing (source/gatebreaker.py, run
# here for the shared code): the collar interior plus the barrels, at the same pixels relative to
# the socket, so hull idle + turret idle at both sockets is pixel-identical to the approved full
# idle (asserted below). The collar's outer outline ring is hull (the turret well's rim), which
# keeps the canvas edge columns clear. down is drawn here on the same footprint.
GB = runpy.run_path(str(Path(__file__).with_name("gatebreaker.py")), run_name="gatebreaker_source")
W, H, OX, OY = 27, 45, 19, 29                # canvas; hull position of the canvas origin (left socket)
SOCKETS = ((32, 43), (126, 43))              # pivot (13,14) on the hull canvas
LEGEND = GB["LEGEND"]
disc, border_of, R13, R10, R8 = GB["disc"], GB["border_of"], GB["R13"], GB["R10"], GB["R8"]

def left(cells): return {(x, y) for x, y in cells if x < GB["CX"]}

COLLAR = left(disc(32, 43, R13))
INTERIOR = COLLAR - border_of(COLLAR)        # the turret's part of the collar; the rim ring is hull

def barrel_cells(recoil):
    rows = [b + ("o" if i < 12 else " ") + b for i, b in enumerate(GB["BARREL"])]
    return {(27 + i, GB["BARREL_Y"] - recoil + j) for j, r in enumerate(rows) for i, c in enumerate(r) if c != " "}

def cut(full, cells):
    g = [["."] * W for _ in range(H)]
    for x, y in cells: g[y - OY][x - OX] = full[y][x]
    return ["".join(r) for r in g]

def remap(rows, cells, mapping):
    g = [list(r) for r in rows]
    for x, y in cells: g[y - OY][x - OX] = mapping.get(g[y - OY][x - OX], g[y - OY][x - OX])
    return ["".join(r) for r in g]

def stamp(rows, x0, y0, art):
    """Hull coordinates; "." keeps the pixel."""
    g = [list(r) for r in rows]
    for j, r in enumerate(art):
        for i, c in enumerate(r):
            if c != ".": g[y0 + j - OY][x0 + i - OX] = c
    return ["".join(r) for r in g]

# ---------------------------------------------------------------- idle
IDLE = cut(GB["FULL"], INTERIOR | barrel_cells(0))

def composite(hull, turret):
    g = [list(r) for r in hull]
    for sx, sy in SOCKETS:
        for j, r in enumerate(turret):
            for i, c in enumerate(r):
                if c != ".": g[sy - 14 + j][sx - 13 + i] = c
    return ["".join(r) for r in g]

# pixel identity: hull idle + turret idle == the approved full idle (this pass) at the left socket;
# at the right socket the approved art was the mirror image, and the one sprite matches it except
# the mantlet's top border, which sat 1 px off-centre (x 28..35 about centre 32): 2 pixels.
# The turret's own pixels are also the first approved art's pixels (before the finish pass).
diff = [(x, y) for y, (a, b) in enumerate(zip(composite(GB["IDLE"], IDLE), GB["FULL"])) for x in range(GB["W"]) if a[x] != b[x]]
assert diff == [(122, 40), (130, 40)], f"hull + turret idle differs from the approved idle at {diff}"
assert all(c == "." or GB["ORIG"][OY + j][OX + i] == c for j, r in enumerate(IDLE) for i, c in enumerate(r)), "turret idle differs from the approved head"

# ---------------------------------------------------------------- telegraph (held for the 0.55 s cue)
# rim and collar bolts glow in the fire ramp, barrel tips fire[3]
RIM = left(GB["RIM"])
BOLTS = {(x, y + k) for x, y in GB["COLLAR_BOLTS"] for k in (0, 1)}
TIP_ROW = GB["BARREL_Y"] + len(GB["BARREL"]) - 2
TELEGRAPH = remap(IDLE, RIM, {"d": "i", "c": "h", "b": "h"})
TELEGRAPH = remap(TELEGRAPH, BOLTS, {"z": "i", "x": "h"})
TELEGRAPH = stamp(TELEGRAPH, 28, TIP_ROW, ["iii...iii"])

# ---------------------------------------------------------------- firing (90 ms)
# barrels 2 px up into the housing, housing compressed 1 px, a 5x4 muzzle flash filling each
# barrel mouth (fire[4] core, fire[2] edge), clear of the bottom edge row
FLASH = [".hjh.",
         "hjjjh",
         "hijih",
         ".hih."]
FIRING = cut(GB["build"](recoil=2), INTERIOR | barrel_cells(2))
FIRING = stamp(FIRING, 27, 69, FLASH)
FIRING = stamp(FIRING, 33, 69, FLASH)

# ---------------------------------------------------------------- down
# charred collar with one lit top edge, a soot band where the rim was, the red dome torn open to a
# dark breach (raider[1] cap, raider[0] below, lit south wall), a small persistent fire, two
# snapped barrel stubs, cracks. Nothing hangs below: the barrels went with the turret.
CX, CY = 32, 43
D = [["."] * W for _ in range(H)]
def put(x, y, c): D[y - OY][x - OX] = c

def ring(outer, inner, face, otop, obot, itop, ibot, edge="O"):
    mo, mi = left(disc(CX, CY, outer)), left(disc(CX, CY, inner))
    bo = border_of(mo)
    for x, y in mo - mi:
        dy = y - CY
        near = lambda m: any((x + a, y + b) in m for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        if (x, y) in bo: c = edge
        elif near(bo): c = otop if dy < 0 else obot if dy > 0 else face
        elif near(mi): c = itop if dy < 0 else ibot if dy > 0 else face
        else: c = face
        put(x, y, c)

ring(R13, R10, "a", "b", "o", "a", "a")                 # charred collar
ring(R10, R8, "o", "o", "o", "o", "o", edge="o")        # burnt rim: one soot band
BREACH = {9: (12, 13), 10: (11, 15), 11: (10, 16), 12: (9, 16), 13: (9, 17), 14: (9, 17),
          15: (9, 17), 16: (10, 17), 17: (10, 16), 18: (11, 15), 19: (12, 14)}   # local rows/columns
hole = {(OX + x, OY + y) for y, (x0, x1) in BREACH.items() for x in range(x0, x1 + 1)}
dome = left(disc(CX, CY, R8))
db = border_of(dome)
for x, y in dome:
    if (x, y) in db or (x, y) in hole: c = "O"
    elif (x, y - 1) in hole: c = "s"                                 # south wall catches the light
    else: c = "s" if y - CY < 1 - abs(x - CX) // 3 else "r"           # lit cap curves down the middle
    put(x, y, c)
DOWN = ["".join(r) for r in D]
DOWN = stamp(DOWN, 31, 44, [".h.",                       # fire in the breach, low in the hole
                            "hih",
                            "ghg"])
DOWN = stamp(DOWN, 27, 49, ["OabaO.OabaO",               # snapped stubs, broken ends stepping down
                            "OabaO.OabaO",
                            "OaaO..OabaO",
                            "OOO....OaaO",
                            "........OOO"])
for x, y in ((7, 4), (6, 5), (5, 6), (4, 7),                         # cracks (local), 1:1 / 2:1
             (19, 5), (20, 6), (20, 7), (21, 8), (21, 9),
             (18, 23), (19, 23), (20, 22), (21, 22)):
    DOWN = stamp(DOWN, OX + x, OY + y, ["O"])
DOWN = ["".join(c if (OX + i, OY + j) in INTERIOR else "." for i, c in enumerate(r)) for j, r in enumerate(DOWN)]  # live collar's footprint

FRAMES = [IDLE, TELEGRAPH, FIRING, DOWN]
assert all(r[0] == r[-1] == "." for f in FRAMES for r in f) and all(set(f[0] + f[-1]) == {"."} for f in FRAMES), "opaque pixel on a canvas edge"

if __name__ == "__main__":
    if "--dump" in sys.argv:
        n = int(sys.argv[sys.argv.index("--dump") + 1])
        print(chr(10).join(f"{i:2d} {r}" for i, r in enumerate(FRAMES[n])))
    pixlib.save_sprite("gatebreakerTurret", [pixlib.grid_image(rows, LEGEND) for rows in FRAMES])
