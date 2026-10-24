"""Stage title card, 3 frames (orbital-breakwater, furnace-belt, midnight-citadel). 241x61, pivot (0,0);
drawn at view x 200, row 120 for 2.6 s with no motion. Ramps panel, ui and one muted motif ramp per stage
(Breakwater navy, Furnace rust, Citadel engine); 12 colours over the strip.

Layout (canvas coordinates, inclusive):
  plate       the whole canvas: panel[0] key line with 4 px chamfered corners, panel[3] top bevel,
              panel[2] side bevels, panel[1] field. Light from the top.
  numeral bay x 7..53, rows 7..53: octagonal recess (panel[0]) with a lit lower lip (panel[2]).
              Authored block numeral 1/2/3 (25x37, 6 px stems, 5 px chamfers; the 1 is 20 wide):
              face ui[0], up-facing edges ui[2], 1 px drop shadow panel[2].
  text slots  "SECTOR 0n" at (72,16), 53x7, label colour; stage name at (72,30), up to 107x7, heading
              colour. Both drawn by code with the 5x7 font; the pixels there are plain panel[1].
  groove      rows 25 (panel[0]) and 26 (panel[2]), x 72..178: engraved rule between the two lines.
  stage pips  three 7x3 pips at x 72/81/90, rows 45..47: ui[0] up to the current stage, panel[2] after.
  motif bay   x 188..234, rows 7..53, same recess as the numeral bay; motif centred inside it, two tones
              of the stage ramp (body [1], lit [2]) and panel[0] cuts:
                Breakwater: ringed planet, lit cap from the top, ring in front of the disc.
                Furnace:    beehive kiln with chimney, brick courses and flames in the arched mouth.
                Citadel:    spires on a floating inverted ziggurat (the citadel of the stage background).
Nothing in the bays touches the bay walls; the plate fills its canvas (edge rule exception)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

W, H = 241, 61
BASE = {
    ".": None,
    "k": ("panel", 0),  # key line, recess, cuts
    "p": ("panel", 1),  # plate field
    "m": ("panel", 2),  # side bevel, lit lips, numeral shadow, groove lip, unlit pip
    "h": ("panel", 3),  # top bevel
    "u": ("ui", 0),     # numeral face, lit pip
    "w": ("ui", 2),     # numeral up-facing edge
}
MOTIF_RAMP = ["navy", "rust", "engine"]

NUMERAL_1 = [  # 20x38
    ".....wwwwwwww.......",
    "....wuuuuuuuu.......",
    "...wuuuuuuuuu.......",
    "..wuuuuuuuuuu.......",
    ".wuuuuuuuuuuu.......",
    "wuuuuuuuuuuuu.......",
    "mmmmmmmuuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    ".......uuuuuu.......",
    "wwwwwwwuuuuuuwwwwwww",
    "uuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuu",
    "mmmmmmmmmmmmmmmmmmmm",
]

NUMERAL_2 = [  # 25x38
    ".....wwwwwwwwwwwwwww.....",
    "....wuuuuuuuuuuuuuuuw....",
    "...wuuuuuuuuuuuuuuuuuw...",
    "..wuuuuuuuuuuuuuuuuuuuw..",
    ".wuuuuuuuuuuuuuuuuuuuuuw.",
    "wuuuuuuuuuuuuuuuuuuuuuuuw",
    "mmmmmmmmmmmmmmmmmmmuuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    ".....wwwwwwwwwwwwwwuuuuuu",
    "....wuuuuuuuuuuuuuuuuuuum",
    "...wuuuuuuuuuuuuuuuuuuum.",
    "..wuuuuuuuuuuuuuuuuuuum..",
    ".wuuuuuuuuuuuuuuuuuuum...",
    "wuuuuuuuuuuuuuuuuuuum....",
    "uuuuuummmmmmmmmmmmmm.....",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuu...................",
    "uuuuuuwwwwwwwwwwwwwwwwwww",
    "uuuuuuuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuuuuuuu",
    "uuuuuuuuuuuuuuuuuuuuuuuuu",
    "mmmmmmmmmmmmmmmmmmmmmmmmm",
]

NUMERAL_3 = [  # 25x38
    ".....wwwwwwwwwwwwwww.....",
    "....wuuuuuuuuuuuuuuuw....",
    "...wuuuuuuuuuuuuuuuuuw...",
    "..wuuuuuuuuuuuuuuuuuuuw..",
    ".wuuuuuuuuuuuuuuuuuuuuuw.",
    "wuuuuuuuuuuuuuuuuuuuuuuuw",
    "mmmmmmmmmmmmmmmmmmmuuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    ".......wwwwwwwwwwwwuuuuuu",
    ".......uuuuuuuuuuuuuuuuuu",
    ".......uuuuuuuuuuuuuuuuuu",
    ".......uuuuuuuuuuuuuuuuuu",
    ".......uuuuuuuuuuuuuuuuuu",
    ".......uuuuuuuuuuuuuuuuuu",
    ".......mmmmmmmmmmmmuuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "...................uuuuuu",
    "wwwwwwwwwwwwwwwwwwwuuuuuu",
    "muuuuuuuuuuuuuuuuuuuuuuum",
    ".muuuuuuuuuuuuuuuuuuuuum.",
    "..muuuuuuuuuuuuuuuuuuum..",
    "...muuuuuuuuuuuuuuuuum...",
    "....muuuuuuuuuuuuuuum....",
    ".....mmmmmmmmmmmmmmm.....",
]

MOTIF_BREAKWATER = [  # 39x25
    "................bbbbbbb................",
    "..............bbbbbbbbbbb..............",
    "............bbbbbbbbbbbbbbb............",
    "...........bbbbbbbbbbbbbbbbb...........",
    "..........bbbbbbbbaaaaaaabbbb..........",
    ".........bbbbbbaaaaaaaaaaaaabb.........",
    ".........bbbbbaaaaaaaaaaaaaaab.........",
    "........bbbbaaaaaaaaaaaaaaaaaaa........",
    "........bbbaaaaaaaaaaaaaaaaaaaa........",
    ".....bbbkbbaaaaaaaaaaaaaaaaaaaaabb.....",
    "...bb..bbbaaaaaaaaaaaaaaaaaaaaaa..bb...",
    ".bb....bbaaaaaaaaaaaaaaaaaaaaaaa....bb.",
    "b......bbaaaaaaaaaaaaaaaaaaaaaaa......b",
    ".bb....bbaaaaaaaaaaaaaaaaaaaaaaa....bb.",
    "...bb..kkkaaaaaaaaaaaaaaaaaaakkk..bb...",
    ".....bbbbbkkkkkkkkkkkkkkkkkkkbbbbb.....",
    "........aabbbbbbbbbbbbbbbbbbbaa........",
    "........aaaaaaaaaaaaaaaaaaaaaaa........",
    ".........aaaaaaaaaaaaaaaaaaaaa.........",
    ".........aaaaaaaaaaaaaaaaaaaaa.........",
    "..........aaaaaaaaaaaaaaaaaaa..........",
    "...........aaaaaaaaaaaaaaaaa...........",
    "............aaaaaaaaaaaaaaa............",
    "..............aaaaaaaaaaa..............",
    "................aaaaaaa................",
]

MOTIF_FURNACE = [  # 35x37
    "......................bbbbbbb......",
    "......................aaaaaaa......",
    ".......................aaaaa.......",
    ".......................aaaaa.......",
    ".......................aaaaa.......",
    ".......................aaaaa.......",
    "..............bbbbbbb..aaaaa.......",
    "...........bbbbbbbbbbbbaaaaa.......",
    ".........bbbbbbbbbbbbbbaaaaa.......",
    "........bbbbbbbaaaaaaaaaaaaa.......",
    ".......bbbbbaaaaaaaaaaaaabbb.......",
    "......bbbbaaaaaaaaaaaaaaaaabb......",
    ".....bbbbaaaaaaaaaaaaaaaaaaabb.....",
    "....bbbbaaaaaakkkkkkkaaaaaaaabb....",
    "....bbbaaaaakkkaaaaakkkaaaaaaab....",
    "...bbbaaaaakkaakkkkkaakkaaaaaaab...",
    "...bbaaaaakaakkkkkkkkkaakaaaaaaa...",
    "...bbaaaakkakkkkkkkkkkkakkaaaaaa...",
    "..aaaaaaakakkkkkkkkkkkkkakaaaaaaa..",
    "..aaaaaakkakkkkkkkkkkkkkakkaaaaaa..",
    "..aaaaaakakkkkkkkkkkkkkkkakaaaaaa..",
    "..aaaaaakakkkkkkkkkkkkkkkakaaaaaa..",
    "..aaaaaakakkkkkkkkkkkkkkkakaaaaaa..",
    "..aaaaaaaakkkkkkkkkkkkkkkaaaaaaaa..",
    "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
    "..aaakaaaakkkkkbkkkkkkkkkaaaakaaa..",
    "..aaakaaaakkkkkbbkkkkkkkkaaaakaaa..",
    "..aaakaaaakkkkbbbkkkbkkkkaaaakaaa..",
    "..aaakaaaakkkkbbbbkkbbkkkaaaakaaa..",
    "..kkkkkkkkkkkbbbbbkkbbkkkkkkkkkkk..",
    "..akaaaaaakkkbbbbbbkbbbkkaaaaaaka..",
    "..aaaaaaaakkbbbbbbbbbbbkkaaaaaaaa..",
    "..aaaaaaaakkbbbbbbbbbbbbkaaaaaaaa..",
    "..aaaaaaaakbbbbbbbbbbbbbkaaaaaaaa..",
    "..aaaaaaaakbbbbbbbbbbbbbkaaaaaaaa..",
    "bbbbbbbbbbkkkkkkkkkkkkkkkbbbbbbbbbb",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
]

MOTIF_CITADEL = [  # 37x40
    "..................b..................",
    "..................b..................",
    "..................b..................",
    ".................bba.................",
    ".................bba.................",
    "................bbbaa................",
    "................bbbaa................",
    "...............bbbbaaa...............",
    "...............aaaaaaa...............",
    ".........b.....aaaaaaa.....b.........",
    ".........b.....aaabaaa.....b.........",
    "........bba....aaabaaa....bba........",
    "........bba....aaabaaa....bba........",
    ".......bbbaa...aaaaaaa...bbbaa.......",
    ".......aaaaa...aaaaaaa...aaaaa.......",
    "...b...aaaaa...aaaaaaa...aaaaa...b...",
    "...b...aabaa...aaabaaa...aabaa...b...",
    "...b...aabaa...aaabaaa...aabaa...b...",
    "..bba..aabaa...aaabaaa...aabaa..bba..",
    "..aaa..aaaaa...aaaaaaa...aaaaa..aaa..",
    "..aaa..aaaaa...aaaaaaa...aaaaa..aaa..",
    "..aba..aaaaa...aaaaaaa...aaaaa..aba..",
    "..aba..aabaa...aaabaaa...aabaa..aba..",
    "..aba..aabaa...aaabaaa...aabaa..aba..",
    "..aaa..aabaa...aaabaaa...aabaa..aaa..",
    "..aaa..aaaaa...aaaaaaa...aaaaa..aaa..",
    "..aaa..aaaaa...aaaaaaa...aaaaa..aaa..",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "aaaaaaabbaaaaaaaaaaaaaabbbaaaaaaaaaaa",
    "...aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...",
    "...aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...",
    "......aaaaaaaabbaaaaaaaaaaaaaaa......",
    "......aaaaaaaaaaaaaaaaaaaaaaaaa......",
    ".........aaaaaaaaaaaaaaaaaaa.........",
    ".........aaaaaaaaaabaaaaaaaa.........",
    "............aaaaaaaaaaaaa............",
    "............aaaaaaaaaaaaa............",
    "...............aaaaaaa...............",
    "...............aaaaaaa...............",
]


MOTIFS = [MOTIF_BREAKWATER, MOTIF_FURNACE, MOTIF_CITADEL]
NUMERALS = [NUMERAL_1, NUMERAL_2, NUMERAL_3]
BAYS = [(7, 7), (188, 7)]
BAY = 47


def plate(g):
    """Chamfered plate: key line, bevel ring (top lit), field."""
    cut = 4
    for y in range(H):
        for x in range(W):
            dx, dy = min(x, W - 1 - x), min(y, H - 1 - y)
            if dx + dy < cut: g[y][x] = "."
            elif dx + dy == cut or dx == 0 or dy == 0: g[y][x] = "k"
            elif dx + dy == cut + 1 or dx == 1 or dy == 1: g[y][x] = "h" if y <= cut else ("m" if y < H - 2 else "p")
            else: g[y][x] = "p"


def bay(g, x0, y0, cut=8):
    """Octagonal recess: panel[0], lower lip lit."""
    for y in range(BAY):
        for x in range(BAY):
            dx, dy = min(x, BAY - 1 - x), min(y, BAY - 1 - y)
            if dx + dy < cut: continue
            lip = y == BAY - 1 or (dx + dy == cut and y > BAY // 2)
            g[y0 + y][x0 + x] = "m" if lip else "k"


def stamp(g, rows, x0, y0):
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c != ".": g[y0 + j][x0 + i] = c


def centred(g, rows, x0, y0):
    stamp(g, rows, x0 + (BAY - len(rows[0])) // 2, y0 + (BAY - len(rows)) // 2)


def card(n):
    g = [["."] * W for _ in range(H)]
    plate(g)
    for bx, by in BAYS: bay(g, bx, by)
    centred(g, NUMERALS[n], *BAYS[0])
    centred(g, MOTIFS[n], *BAYS[1])
    for x in range(72, 179): g[25][x] = "k"; g[26][x] = "m"
    for i in range(3):
        for x in range(72 + 9 * i, 79 + 9 * i):
            for y in range(45, 48): g[y][x] = "u" if i <= n else "m"
    return ["".join(r) for r in g]


def legend(n):
    return {**BASE, "a": (MOTIF_RAMP[n], 1), "b": (MOTIF_RAMP[n], 2)}


if __name__ == "__main__":
    print(pixlib.save_sprite("stageCard", [pixlib.grid_image(card(n), legend(n)) for n in range(3)]))
