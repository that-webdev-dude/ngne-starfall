"""Result title plates, 3 frames (sector-secured, campaign-complete, signal-lost). 301x45, pivot (0,0);
drawn at view x 170, row 60 over the dimmed frozen stage. Ramps panel, ui, nova, alert; 12 colours over
the strip.

Plate (whole canvas, light from the top): panel[0] key line with 5 px chamfers, panel[3] top bevel,
panel[2] side bevels, panel[1] field, and an engraved inner frame inset 3 px (panel[0] groove, its
lower half lit panel[2]).

Display face (authored pixels, not a scaled 5x7): cap height 11, 2 px stems and bars, middle bar on
rows 4-5, outer corners of round letters cut by a 3 px triangle, glyphs 9 px wide (E, L 8; T, Y 10;
I 2), letter gap 2, word space 8. Two-tone face lit from the top: rows 0-5 light, rows 6-10 darker,
plus a 1 px drop shadow on the row below every bottom edge.
  victory   face ui[2] / ui[1], shadow nova[0]
  game over face alert[2] / alert[1], shadow alert[0]
Title on rows 16-26 (shadow 27), centred on column 150 (odd-width titles sit half a pixel left).

Accents on the title's centre row 21: a rule from 7 px beside the title to column 14 / 286, ending
in diamonds (lit upper half, darker lower half):
  sector-secured     solid nova[1] rule, one nova[2]/nova[1] diamond per side
  campaign-complete  same, three diamonds per side (the three sectors)
  signal-lost        alert[1] rule broken into 4-on/3-off dashes, one hollow alert diamond per side"""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

W, H = 301, 45
BASE = {".": None, "k": ("panel", 0), "p": ("panel", 1), "m": ("panel", 2), "h": ("panel", 3)}
WIN = {"T": ("ui", 2), "B": ("ui", 1), "S": ("nova", 0), "r": ("nova", 1), "c": ("nova", 2)}
LOST = {"T": ("alert", 2), "B": ("alert", 1), "S": ("alert", 0), "r": ("alert", 1), "c": ("alert", 2)}

# Display face, one glyph per space-separated column, letters in GLYPH_ORDER.
GLYPH_ORDER = "ACDEGHIKLNORSTUY"
SPECIMEN = [
    "..#####.. ..####### #######.. ######## ..####### ##.....## ## ##.....## ##...... ####...## ..#####.. #######.. ..####### ########## ##.....## ##......##",
    ".#######. .######## ########. ######## .######## ##.....## ## ##....##. ##...... ####...## .#######. ########. .######## ########## ##.....## ##......##",
    "##.....## ##....... ##.....## ##...... ##....... ##.....## ## ##...##.. ##...... ##.##..## ##.....## ##.....## ##....... ....##.... ##.....## .##....##.",
    "##.....## ##....... ##.....## ##...... ##....... ##.....## ## ##..##... ##...... ##.##..## ##.....## ##.....## ##....... ....##.... ##.....## ..##..##..",
    "######### ##....... ##.....## #######. ##...#### ######### ## ##.##.... ##...... ##..##.## ##.....## ########. .######.. ....##.... ##.....## ...####...",
    "######### ##....... ##.....## #######. ##...#### ######### ## ####..... ##...... ##..##.## ##.....## #######.. ..######. ....##.... ##.....## ....##....",
    "##.....## ##....... ##.....## ##...... ##.....## ##.....## ## ##.##.... ##...... ##..##.## ##.....## ##...##.. .......## ....##.... ##.....## ....##....",
    "##.....## ##....... ##.....## ##...... ##.....## ##.....## ## ##..##... ##...... ##...#### ##.....## ##....##. .......## ....##.... ##.....## ....##....",
    "##.....## ##....... ##.....## ##...... ##.....## ##.....## ## ##...##.. ##...... ##...#### ##.....## ##.....## .......## ....##.... ##.....## ....##....",
    "##.....## .######## ########. ######## .#######. ##.....## ## ##....##. ######## ##....### .#######. ##.....## ########. ....##.... .#######. ....##....",
    "##.....## ..####### #######.. ######## ..#####.. ##.....## ## ##.....## ######## ##....### ..#####.. ##.....## #######.. ....##.... ..#####.. ....##....",
]
GLYPHS = dict(zip(GLYPH_ORDER, zip(*(row.split(" ") for row in SPECIMEN))))
CAP, GAP, SPACE = 11, 2, 8

DIAMOND = [
    "...c...",
    "..ccc..",
    ".ccccc.",
    "ccccccc",
    ".rrrrr.",
    "..rrr..",
    "...r...",
]
HOLLOW = [
    "...c...",
    "..cpc..",
    ".cpppc.",
    "cpppppr",
    ".rpppr.",
    "..rpr..",
    "...r...",
]
FRAMES = [  # (title, legend, diamonds per side, solid rule)
    ("SECTOR SECURED", WIN, 1, True),
    ("THE SKY IS YOURS", WIN, 3, True),
    ("SIGNAL LOST", LOST, 1, False),
]
TITLE_Y, RULE_Y = 16, 21


def title_mask(text):
    cols = []
    for i, ch in enumerate(text):
        if ch == " ":
            cols += ["." * CAP] * (SPACE - GAP)
            continue
        g = GLYPHS[ch]
        cols += ["".join(g[y][x] for y in range(CAP)) for x in range(len(g[0]))]
        if i < len(text) - 1: cols += ["." * CAP] * GAP
    return ["".join(c[y] for c in cols) for y in range(CAP)]


def plate(g):
    cut = 5
    for y in range(H):
        for x in range(W):
            dx, dy = min(x, W - 1 - x), min(y, H - 1 - y)
            if dx + dy < cut: g[y][x] = "."
            elif dx + dy == cut or dx == 0 or dy == 0: g[y][x] = "k"
            elif dx + dy == cut + 1 or dx == 1 or dy == 1: g[y][x] = "h" if y <= cut else ("m" if y < H - 2 else "p")
            else: g[y][x] = "p"
    x0, y0, x1, y1, ic = 3, 3, W - 4, H - 4, 4  # engraved inner frame
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx, dy = min(x - x0, x1 - x), min(y - y0, y1 - y)
            if dx + dy < ic: continue
            if dx + dy == ic or dx == 0 or dy == 0:
                g[y][x] = "m" if y > H // 2 and (dy == 0 or dx + dy == ic) else "k"


def frame(text, count, solid):
    g = [["."] * W for _ in range(H)]
    plate(g)
    m = title_mask(text)
    tw = len(m[0])
    x0 = (W - tw) // 2
    for j in range(CAP):
        for i in range(tw):
            if m[j][i] != "#": continue
            g[TITLE_Y + j][x0 + i] = "T" if j <= 5 else "B"
            if j == CAP - 1 or m[j + 1][i] != "#": g[TITLE_Y + j + 1][x0 + i] = "S"
    for side in (-1, 1):
        near = x0 - 7 if side < 0 else x0 + tw + 6
        far = 14 if side < 0 else W - 15
        for x in range(min(near, far), max(near, far) + 1):
            if solid or abs(x - near) % 7 < 4: g[RULE_Y][x] = "r"
        for k in range(count):
            cx = far - side * 9 * k
            for j, r in enumerate(DIAMOND if solid else HOLLOW):
                for i, c in enumerate(r):
                    if c != ".": g[RULE_Y - 3 + j][cx - 3 + i] = c
            for x in (cx - 4, cx + 4): g[RULE_Y][x] = "p"  # 1 px gap between rule and diamond
    return ["".join(r) for r in g]


if __name__ == "__main__":
    images = [pixlib.grid_image(frame(t, n, s), {**BASE, **leg}) for t, leg, n, s in FRAMES]
    print(pixlib.save_sprite("resultPlate", images))
