import runpy, sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

# Starfall Engine emitter: one instance per leftEmitter / rightEmitter socket, drawn above the hull;
# the right instance is drawn flipped in x. 27x27, pivot (13,13) = the socket = the lens centre,
# (30,47) / (112,47) on the hull canvas. Frames (spec order): idle, charge, firing, down.
# Light from the top.
#
# idle is cut from the hull source's own drawing (source/starfallEngine.py, run here for the shared
# code): the lens, the bone ring with its three clamps and everything inside the housing, at the
# same pixels relative to the socket. Hull phase-1 + emitter idle at both sockets is pixel-identical
# to the finished phase-1 frame, and the emitter's pixels are the approved rev01 pixels (asserted
# below). The housing rim stays hull, around an empty well. charge / firing / down are patches on
# idle over the same footprint, so the well never shows.
SE = runpy.run_path(str(Path(__file__).with_name("starfallEngine.py")), run_name="starfallEngine_source")
W, H = 27, 27
SX, SY = SE["EMITTER_X"], SE["EMITTER_Y"]    # left socket on the hull canvas
OX, OY = SX - 13, SY - 13                    # hull position of the canvas origin
LEGEND = dict(SE["LEGEND"], **{"F": ("fire", 1), "G": ("fire", 2), "H": ("fire", 3)})
MASK = SE["left"](SE["EMITTER"])

def cut(full, cells):
    g = [["."] * W for _ in range(H)]
    for x, y in cells: g[y - OY][x - OX] = full[y][x]
    return ["".join(r) for r in g]

def local(cells):
    return {(x - OX, y - OY) for x, y in cells}

def put(rows, cells):
    """cells [(x, y, c)] in canvas coordinates."""
    g = [list(r) for r in rows]
    for x, y, c in cells: g[y][x] = c
    return ["".join(r) for r in g]

def remap(rows, cells, mapping):
    g = [list(r) for r in rows]
    for x, y in cells: g[y][x] = mapping.get(g[y][x], g[y][x])
    return ["".join(r) for r in g]

def glyph(x0, y0, art):
    return [(x0 + i, y0 + j, c) for j, r in enumerate(art) for i, c in enumerate(r) if c != "."]

# ---------------------------------------------------------------- idle
IDLE = cut(SE["FULL"], MASK)

def composite(hull, emitter):
    """Hull frame with the emitter at both sockets (the right one flipped in x)."""
    g = [list(r) for r in hull]
    for flip, sx in ((False, SX), (True, SE["W"] - 1 - SX)):
        for j, r in enumerate(emitter):
            for i, c in enumerate(r[::-1] if flip else r):
                if c != ".": g[SY - 13 + j][sx - 13 + i] = c
    return ["".join(r) for r in g]

# pixel identity: hull phase-1 + emitter idle (left as drawn, right flipped) == the finished phase-1
# frame with its emitters, on both sides; and the emitter's pixels are the approved rev01 pixels
diff = [(x, y) for y, (a, b) in enumerate(zip(composite(SE["P1"], IDLE), SE["FULL"])) for x in range(SE["W"]) if a[x] != b[x]]
assert not diff, f"hull + emitter idle differs from the finished phase-1 frame at {diff}"
assert all(c == "." or SE["APPROVED"][OY + j][OX + i] == c for j, r in enumerate(IDLE) for i, c in enumerate(r)), "emitter idle differs from the approved art"

# lens cells (canvas): the glow pixels, and the outline[1] ring around them
LENS = {(x, y) for y, r in enumerate(IDLE) for x, c in enumerate(r) if c in "567"}
LENS_RIM = {(x, y) for y, r in enumerate(IDLE) for x, c in enumerate(r)
            if c == "q" and any((x + dx, y + dy) in LENS for dx, dy in SE["N4"])} - local({(x, y) for x in range(28, 33) for y in range(35, 41)})
RING = {(x, y) for y, r in enumerate(IDLE) for x, c in enumerate(r) if c in "89"}

# ---------------------------------------------------------------- charge (held for the 0.7 s cue)
# the lens steps up to glow[2], its outline[1] rim becomes a glow[1] halo ring
CHARGE = remap(IDLE, LENS, {"5": "6", "6": "7"})
CHARGE = remap(CHARGE, LENS_RIM, {"q": "6"})

# ---------------------------------------------------------------- firing (90 ms)
# lens white-hot (bone[1] body, glow[2] edge) with a short flare below the socket toward the muzzle
FIRING = remap(IDLE, LENS, {"5": "7", "6": "9", "7": "9"})
FIRING = remap(FIRING, LENS_RIM, {"q": "7"})
FIRING = put(FIRING, glyph(11, 22, [".797.",
                                    "..9..",
                                    ".696.",
                                    "..6.."]))

# ---------------------------------------------------------------- down
# ring charred (bone[0] top, steel[0] bottom) and cracked through in three places, clamp scorched,
# lens dead (glow[0] centre in outline), a torn breach low on the lens with a small persistent fire
DOWN = remap(IDLE, LENS, {"7": "5", "6": "q", "5": "o"})
DOWN = remap(DOWN, RING, {"9": "8", "8": "a"})
DOWN = remap(DOWN, local({(x, y) for x in range(28, 33) for y in range(35, 41)}), {"3": "2", "2": "1"})
DOWN = put(DOWN, [(x, y, "o") for x, y in ((6, 7), (5, 8), (5, 9),       # ring cracks
                                            (21, 9), (22, 10),
                                            (7, 19), (8, 20))])
DOWN = put(DOWN, glyph(14, 15, [".ooo.",                                   # breach with the fire
                                "o.H.o",
                                "oHGHo",
                                "oGFGo"]))

FRAMES = [IDLE, CHARGE, FIRING, DOWN]
assert all(r[0] == r[-1] == "." for f in FRAMES for r in f) and all(set(f[0] + f[-1]) == {"."} for f in FRAMES), "opaque pixel on a canvas edge"

if __name__ == "__main__":
    if "--dump" in sys.argv:
        n = int(sys.argv[sys.argv.index("--dump") + 1])
        print(chr(10).join(f"{i:2d} {r}" for i, r in enumerate(FRAMES[n])))
    pixlib.save_sprite("starfallEmitter", [pixlib.grid_image(rows, LEGEND) for rows in FRAMES])
