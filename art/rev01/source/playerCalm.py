"""Reduced-motion / reduced-flash player cues (gate 4): a held outline around the current pose's silhouette.
14 frames on a 35x37 canvas, pivot (17,18) = the player pivot (15,16) shifted by (+2,+2):
shield-<pose> x7 (invulnerability, plasma[2]) then hit-<pose> x7 (damage, cockpit[1]), same pose order as player.

Generated, not hand-drawn: each frame is derived from the alpha of the matching player.png frame, so it
follows any later hull edit pose by pose.
  1. silhouette S = opaque player pixels, placed at (+2,+2);
  2. close S by 2 px (8-neighbour dilate x2, erode x2): fills the 1-4 px slots between pods, prow and tail, so
     the line runs over them instead of dropping 1 px spikes into each notch;
  3. grow the closed shape by 1 px (8-neighbour) = the clear gap; the line is the exterior pixels 4-adjacent to
     it (a 4-adjacent boundary keeps diagonals 1 px wide, corner to corner);
  4. the gap pixels (exterior pixels 4-adjacent to the closed shape) get outline[1] as a dark backing, so the
     line stays separate from the hull on the planet, the furnace rocks and the citadel portal; on the clear
     colour it is invisible and the line reads as one pixel clear of the hull;
  5. breaks: below each nozzle exit (rows from the exhaust socket down, columns socket x +-3) so the flame
     passes freely in every exhaust frame, and an 11x11 window centred on the plasmaMuzzle socket so the
     plasmaReadyCalm marker (9x9) keeps a clear pixel around it.
Distance choice: one pixel clear (step 3) over touching. Touching puts the line against outline[0], which
vanishes on #060d19, so at 1x it lands right next to the lit hero[3] pod facets and reads as a hull rim (and as
the codeDrawn.readyCue prow rim); one px clear reads as a separate field around the ship on all three
backgrounds. Shield and hit share the exact shape; only the colour differs, uniform along the line."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib
from PIL import Image

LEGEND = {
    ".": None,
    "o": ("outline", 1),   # dark backing in the 1 px gap
    "s": ("plasma", 2),    # shield line (invulnerability)
    "h": ("cockpit", 1),   # hit line (damage), warm
}
PLAYER = pixlib.sprite("player")
POSES = PLAYER["frames"]
PW, PH = PLAYER["canvas"]
PAD = 2
W, H = PW + 2 * PAD, PH + 2 * PAD
PX, PY = PLAYER["pivot"][0] + PAD, PLAYER["pivot"][1] + PAD
CLOSE, NOZZLE_HALF, MUZZLE_HALF = 2, 3, 5
N4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]
N8 = N4 + [(1, 1), (1, -1), (-1, 1), (-1, -1)]


def silhouette(i):
    sheet = Image.open(pixlib.ROOT / "sprites" / "player.png").convert("RGBA")
    a = sheet.crop((i * PW, 0, (i + 1) * PW, PH)).getchannel("A")
    return {(x + PAD, y + PAD) for y in range(PH) for x in range(PW) if a.getpixel((x, y))}


def grow(m):
    return m | {(x + dx, y + dy) for x, y in m for dx, dy in N8 if 0 <= x + dx < W and 0 <= y + dy < H}


def shrink(m):
    return {(x, y) for x, y in m if all((x + dx, y + dy) in m for dx, dy in N8)}


def boundary(shape):
    """Pixels outside `shape`, reachable from the canvas edge, 4-adjacent to `shape`."""
    seen, stack = set(), [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
    while stack:
        p = stack.pop()
        if p in seen or p in shape or not (0 <= p[0] < W and 0 <= p[1] < H): continue
        seen.add(p); stack += [(p[0] + dx, p[1] + dy) for dx, dy in N4]
    return {(x, y) for x, y in seen if any((x + dx, y + dy) in shape for dx, dy in N4)}


def broken(pixels, pose):
    keep = set(pixels)
    for sx, sy in PLAYER["sockets"]["exhaust"][pose]:
        keep -= {(x, y) for x, y in pixels if y >= PY + sy and abs(x - (PX + sx)) <= NOZZLE_HALF}
    mx, my = PLAYER["sockets"]["plasmaMuzzle"][pose]
    keep -= {(x, y) for x, y in pixels if abs(x - (PX + mx)) <= MUZZLE_HALF and abs(y - (PY + my)) <= MUZZLE_HALF}
    return keep


def outline_grid(i, line_char):
    pose = POSES[i]
    s = silhouette(i)
    closed = s
    for _ in range(CLOSE): closed = grow(closed)
    for _ in range(CLOSE): closed = shrink(closed)
    closed |= s
    line = broken(boundary(grow(closed)), pose)
    backing = broken(boundary(closed), pose)
    assert not (line | backing) & s, "cue covers the hull"
    rows = [["."] * W for _ in range(H)]
    for x, y in backing: rows[y][x] = "o"
    for x, y in line: rows[y][x] = line_char
    return ["".join(r) for r in rows]


def frames():
    out = [outline_grid(i, "s") for i in range(len(POSES))] + [outline_grid(i, "h") for i in range(len(POSES))]
    for f in out:
        assert f[0].strip(".") == "" and f[-1].strip(".") == "" and all(r[0] == r[-1] == "." for r in f), "opaque edge pixel"
    return out


if __name__ == "__main__":
    print(pixlib.save_sprite("playerCalm", [pixlib.grid_image(f, LEGEND) for f in frames()]))
