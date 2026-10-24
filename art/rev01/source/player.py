import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "1": ("steel", 0), "2": ("steel", 1), "3": ("steel", 2), "4": ("steel", 3),
    "a": ("hero", 0), "b": ("hero", 1), "c": ("hero", 2), "d": ("hero", 3),
    "k": ("cockpit", 0), "K": ("cockpit", 1),
}

# Left half of the neutral frame, columns 0..15 (15 = centre column).
HALF = [
    "...............O",  # 0  nose tip
    "..............O4",  # 1
    "..............O4",  # 2
    "..............O4",  # 3
    ".............O34",  # 4
    ".............O3b",  # 5  canopy frame tip
    "............O3bd",  # 6
    "............O3bK",  # 7  canopy glass, lit at the top
    "...........O33bK",  # 8
    "...........O3bKK",  # 9
    "..........O33bkK",  # 10
    "..........O34bkk",  # 11
    ".........O334bbk",  # 12
    ".........Ooo3bbb",  # 13 intake mouths
    "........OOcdc344",  # 14 pod front caps (highlight), wing root
    ".......O4Ocdc344",  # 15
    "......O44Occc234",  # 16
    ".....O443Occc234",  # 17
    "....O4433Occb122",  # 18 spine panel seam
    "...O433ccObcb234",  # 19 wing stripe starts (shallower than the leading edge)
    "..O43ccbbObbb234",  # 20
    ".O4ccbb32Obbb233",  # 21
    "Odcbb3332Obba233",  # 22 wingtip fin
    "Occ333322Oaba223",  # 23
    "Ocb331122Oaaa223",  # 24 flap seam
    "Ob32222OOOaaa222",  # 25
    "Ob222OO..Oaaa222",  # 26
    "Oa2OO....OaaaO22",  # 27
    ".OO......O232OO2",  # 28 nozzle
    ".........O232O.O",  # 29
    ".........O121O..",  # 30 nozzle exit: open bottom, the exhaust attaches on row 31
    "................",  # 31
    "................",  # 32
]
NOZZLE_ROW = 31  # first row under the nozzles; exhaust pivot goes here

# Bank-left, columns 0..9 of rows 14..30: the lowered left wing. Span shrinks (tip moves from
# col 0 to col 4), the leading edge steepens from 1:1 to 2:1, every tone is one step darker.
# Column 9 is free because the left pod slides 1 px inward (see bank_left).
LOW_WING = {
    14: ".........O",
    15: "........O3",
    16: "........O3",
    17: ".......O32",
    18: ".......O32",
    19: "......O322",
    20: "......O3bb",
    21: ".....O3baa",
    22: ".....Obba2",
    23: "....Ocb221",
    24: "....Ob2111",
    25: "....Oa21OO",
    26: "....Oa1O..",
    27: ".....OO...",
    28: "..........",
    29: "..........",
    30: "..........",
}
DARKER = {"4": "3", "3": "2", "2": "1", "1": "1", "d": "c", "c": "b", "b": "a", "a": "a"}
LIGHTER = {"3": "4", "2": "3", "1": "2", "c": "d", "b": "c", "a": "b"}


def mirror(half):
    return [r + r[-2::-1] for r in half]


def bank_left(neutral):
    rows = [list(r) for r in neutral]
    # Canopy (above the roll axis) slides 1 px toward the lowered wing.
    for y in range(4, 13):
        l, r = neutral[y].index("O"), neutral[y].rindex("O")
        inner = neutral[y][l + 1:r]
        rows[y][l + 1:r] = inner[1:] + DARKER[inner[-1]]
    # Intake row: left intake follows the pod 1 px inward.
    rows[13][9:18] = "OOoo3bbba"
    for y in range(14, 31):
        n = neutral[y]
        rows[y][0:10] = LOW_WING[y]
        if y < 27:
            # left pod (outline + 3 px) 1 px inward; body narrows to 4 px with the spine
            # shifted toward the lowered side and the far flank shaded
            rows[y][10:14] = n[9:13]
            seg = n[13:18]
            rows[y][14:18] = seg[1:4] + DARKER[seg[4]]
        else:
            rows[y][10:15] = n[9:14]
            rows[y][15:18] = n[15:18]
        # raised right wing (columns 22..30) turns toward the light: one step lighter
        for x in range(22, 31):
            rows[y][x] = LIGHTER.get(rows[y][x], rows[y][x])
    return ["".join(r) for r in rows]


def frames():
    neutral = mirror(HALF)
    left = bank_left(neutral)
    right = [r[::-1] for r in left]  # light is from the top, so a horizontal flip keeps it valid
    return [left, neutral, right]


def sockets(frame):
    """Exhaust attach points (dx, dy) from the pivot: centre of each nozzle exit, row below it."""
    px, py = 15, 16
    row = frame[NOZZLE_ROW - 1]
    xs = [x for x in range(len(row) - 4) if row[x] == "O" and row[x + 4] == "O" and "." not in row[x:x + 5]]
    return [(x + 2 - px, NOZZLE_ROW - py) for x in xs]


if __name__ == "__main__":
    fs = frames()
    for name, f in zip(("bank-left", "neutral", "bank-right"), fs):
        print(name, "exhaust sockets", sockets(f))
    imgs = [pixlib.grid_image(f, LEGEND) for f in fs]
    print(pixlib.save_sprite("player", imgs))
