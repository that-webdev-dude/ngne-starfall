"""Player ship (rev01 revision pass, N1 "twin-pod gunship", approved at gate 1): 7 input poses,
bank-left-3 ... neutral ... bank-right-3. Canvas 31x33, pivot (15,16), +y down.

Light from the top (above the ship, biased to screen-up): forward-facing planes lightest, flat tops
mid, rear-facing steps and seams darkest. Banks are whole-body rolls, each pose drawn as its own
grid (never a rotated or squashed neutral): the pod that rolls up stays broad and takes light
values, the pod that rolls down foreshortens, darkens and tucks against the fuselage; canopy and
prow shift 1 px toward the lowered side from level 2. Every feature stays on the same rows in all
seven poses (a roll does not move anything vertically). Right banks are mirrors of the left banks:
valid because the light is left/right symmetric; the asymmetric canopy flank flips with them on
purpose so the raised side's flank stays the lit one."""
import sys; sys.dont_write_bytecode = True
from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("outline", 0), "o": ("outline", 1),
    "1": ("steel", 0), "2": ("steel", 1), "3": ("steel", 2), "4": ("steel", 3),
    "a": ("hero", 0), "b": ("hero", 1), "c": ("hero", 2), "d": ("hero", 3),
    "k": ("cockpit", 0), "K": ("cockpit", 1),
}
W, H, PX, PY = 31, 33, 15, 16
FRAME_NAMES = ["bank-left-3", "bank-left-2", "bank-left-1", "neutral", "bank-right-1", "bank-right-2", "bank-right-3"]

# Neutral: left half, columns 0..15 (15 = centre column, mirrored).
NEUTRAL_HALF = [
    "................",  # 0
    "................",  # 1
    "..............OO",  # 2  emitter housing tip
    ".............O34",  # 3  housing front face (lit), one chamfered block
    ".....OOO....Od2o",  # 4  gun barrel cap; plasma bore (o); prow facet d
    ".....O3O...Odc23",  # 5
    "....O44O...Occ12",  # 6  gun housing front face (lit)
    "...Od32O...Obccc",  # 7  pod head: forward-outward facet (d)
    "..Odd32O...Obooo",  # 8  cockpit recess: front wall in shadow
    ".Oddc32O...ObokK",  # 9  canopy, warm accent
    ".Odcc21O...Obokk",  # 10
    ".OcccooO..OObcdd",  # 11  housing rear shadow; recess rear wall faces forward (lit)
    ".OcccbbO.OcOcccc",  # 12  pod: outer flank c, inner flank b (toward the slot); wing-root leading edge
    ".OcccbbOOcbocccc",  # 13  wing sits one level below pod and fuselage (o seams)
    ".Occbbbocbbocccc",  # 14  crease steps in: inner flank widens toward the rear
    ".Occbbbobbbocccc",  # 15
    ".Occbbbobbboaaaa",  # 16  fuselage: rear-facing step to the engine deck
    ".Occbbbobbbob233",  # 17
    ".O34443obbaob233",  # 18  engine collar: lit forward facet
    ".O23332obaOOa122",  # 19  collar face
    ".Oo111ooaO..Oa22",  # 20  collar underside (dark)
    ".ObbbaaOO...Oa22",  # 21  aft section: outer b, inner a
    ".ObbbaaO....Oa11",  # 22
    ".ObbaaaO....Oaaa",  # 23
    "..OaaaO......Oaa",  # 24  rear taper
    "..OaaaO......OOO",  # 25
    "..O343O.........",  # 26  nozzle
    "..O232O.........",  # 27
    "..O232O.........",  # 28
    "..O121O.........",  # 29  nozzle exit: open bottom, exhaust attaches on row 30
    "................",  # 30
    "................",  # 31
    "................",  # 32
]

# bank-left-1: left pod 1 px inward (cols 2-8), its outer flank drops to b and its inner flank takes the
# rolled-up value c; slot 2 px; fuselage left edge column darkens, right edge column lights;
# right wing lighter; raised pod crease straightens, collar brighter on its outer side.
BANK_LEFT_1 = [
    "...............................",  # 0
    "...............................",  # 1
    "..............OOO..............",  # 2
    ".............O343O.............",  # 3
    "......OOO...Oc2o2dO....OOO.....",  # 4
    "......O3O..Occ232cdO...O3O.....",  # 5
    ".....O44O..Obc121ccO...O44O....",  # 6
    "....Od32O..ObccccccO...O23dO...",  # 7
    "...Odd32O..ObooooocO...O23ddO..",  # 8
    "..Oddb32O..ObokKkocO...O23cddO.",  # 9
    "..Odbb21O..ObokkkocO...O12cddO.",  # 10
    "..ObbbooO.OObcdddccOO..OoocccO.",  # 11
    "..ObbbccOObObccccccOdO.ObbcccO.",  # 12
    "..ObbbccObbobccccccocdOObbcccO.",  # 13
    "..ObbcccobbobccccccoccdobbcccO.",  # 14
    "..ObbcccobbobccccccocccobbcccO.",  # 15
    "..ObbcccobboaaaaaaaocccobbcccO.",  # 16
    "..Obbcccobboa23332cocccobbcccO.",  # 17
    "..O34443obaoa23332cobcco34444O.",  # 18
    "..O23332oaOOa12221bOObco23333O.",  # 19
    "..Oo111ooO..Oa222bO..Oboo111oO.",  # 20
    "..ObbbaaO...Oa222bO...OOaabbbO.",  # 21
    "..ObbbaaO...Oa111bO....OaabbbO.",  # 22
    "..ObbaaaO...OaaaaaO....OaaabbO.",  # 23
    "...OaaaO.....OaaaO......OaaaO..",  # 24
    "...OaaaO.....OOOOO......OaaaO..",  # 25
    "...O343O................O343O..",  # 26
    "...O232O................O232O..",  # 27
    "...O232O................O232O..",  # 28
    "...O121O................O121O..",  # 29
    "...............................",  # 30
    "...............................",  # 31
    "...............................",  # 32
]

# bank-left-2: left pod 4 px wide (cols 4-9), outer flank (a) showing, head facet c; slot 1 px;
# canopy and prow 1 px left, fuselage right flank (cols 17-18) appears lit while the tops drop to b;
# raised pod moves 1 px in and widens to 8 px (cols 22-29), wing root 2 px.
BANK_LEFT_2 = [
    "...............................",  # 0
    "...............................",  # 1
    ".............OOO...............",  # 2
    "............O343O..............",  # 3
    ".......OOO.Ob2o2dO....OOO......",  # 4
    ".......O3O.Ob232cdO...O3O......",  # 5
    "......O43O.Ob121bccO..O44O.....",  # 6
    ".....Oc32O.ObbbbbccO..O23dO....",  # 7
    "....Occ32O.OoooooccO..O23ddO...",  # 8
    "....Oab32O.OokKkKccO..O23cddO..",  # 9
    "....Oab21O.OokkkkccO..O12cccdO.",  # 10
    "....OabooOOOcdddcbbOO.OoocccdO.",  # 11
    "....OabbbObObbbbbccOcOobbccccO.",  # 12
    "....OabbbOaObbbbbccObcobbccccO.",  # 13
    "....OabbboaObbbbbccObbobbbcccO.",  # 14
    "....OabbboaObbbbbccObbobbbcccO.",  # 15
    "....OabbboaOaaaaaaaObbobbbcccO.",  # 16
    "....OabbboaO2222233ObbobbbcccO.",  # 17
    "....O2343oaO2222233Oabo234443O.",  # 18
    "....O1222oOO1111122OOao123332O.",  # 19
    "....Oo111o.Oa22233O..OOo1111oO.",  # 20
    "....OaabbO.Oa22233O...OaabbccO.",  # 21
    "....OaabbO.Oa11122O...OaabbccO.",  # 22
    "....OaaabO.OaaaabO....OaabbcbO.",  # 23
    "....OaaaaO.OaaabO.....OaabbbO..",  # 24
    ".....OaaaO.OOOOO.......OabbO...",  # 25
    ".....O333O.............O343O...",  # 26
    ".....O222O.............O233O...",  # 27
    ".....O222O.............O233O...",  # 28
    ".....O121O.............O122O...",  # 29
    "...............................",  # 30
    "...............................",  # 31
    "...............................",  # 32
]

# bank-left-3: lowered pod foreshortened to 3 px (cols 7-10) and tucked against the fuselage, one step
# darker with its outer flank showing; raised pod broad (cols 21-28) with lit head facet, top and
# rolled-up outer flank, separated by a clear 1 px slot (col 20) in front of and behind the wing root.
BANK_LEFT_3 = [
    "...............................",  # 0
    "...............................",  # 1
    ".............OOO...............",  # 2
    "............O343O..............",  # 3
    "........OOOOb2o2dO...OOO.......",  # 4
    "........O2OOb232cdO..O3O.......",  # 5
    "........O33Ob121bccO.O44O......",  # 6
    ".......Oc32ObbbbbccO.O23dO.....",  # 7
    ".......Ob32OoooooccO.O23ddO....",  # 8
    ".......Oa21OokKkKccO.O23cddO...",  # 9
    ".......Oa21OokkkkccO.O12ccddO..",  # 10
    ".......OaooOcdddcbbO.OoocdddO..",  # 11
    ".......OabbObbbbbccOoobbccccO..",  # 12
    ".......OabbObbbbbccObobbccccO..",  # 13
    ".......OaabObbbbbccObobbbcccO..",  # 14
    ".......OaabObbbbbccObobbbcccO..",  # 15
    ".......OaabOaaaaaaaObobbbcccO..",  # 16
    ".......OaabO2222233ObobbbcccO..",  # 17
    ".......O233O2222233Oao234443O..",  # 18
    ".......O122O1111122Ooo123332O..",  # 19
    ".......Oo11Oa22233O..Oo1111oO..",  # 20
    ".......OaaaOa22233O..OaabbccO..",  # 21
    ".......OaaaOa11122O..OaabbccO..",  # 22
    ".......OaaaOaaaabO...OaabbcbO..",  # 23
    ".......OaaaOaaabO....OaabbbO...",  # 24
    ".......OaaaOOOOO......OabbO....",  # 25
    ".......O232O..........O343O....",  # 26
    ".......O121O..........O233O....",  # 27
    ".......O121O..........O233O....",  # 28
    ".......O121O..........O122O....",  # 29
    "...............................",  # 30
    "...............................",  # 31
    "...............................",  # 32
]

# Muzzle centre columns per left/neutral pose: (primary left, primary right, plasma). Right banks mirror them.
MUZZLE_COLS = {"bank-left-3": (9, 22, 14), "bank-left-2": (8, 23, 14), "bank-left-1": (7, 24, 15), "neutral": (6, 24, 15)}


def mirror(half):
    return [r + r[-2::-1] for r in half]


def flip(frame):
    return [r[::-1] for r in frame]


def frames():
    neutral = mirror(NEUTRAL_HALF)
    lefts = [BANK_LEFT_3, BANK_LEFT_2, BANK_LEFT_1]
    out = lefts + [neutral] + [flip(f) for f in reversed(lefts)]
    for f in out:
        assert len(f) == H and all(len(r) == W for r in f) and set("".join(f)) <= set(LEGEND)
        assert f[0].strip(".") == "" and f[-1].strip(".") == "" and all(r[0] == r[-1] == "." for r in f), "opaque edge pixel"
    return out


def muzzle_cols(name):
    if name.startswith("bank-right"):
        l, r, p = MUZZLE_COLS[name.replace("right", "left")]
        return (W - 1 - r, W - 1 - l, W - 1 - p)
    return MUZZLE_COLS[name]


def sockets(frame, name):
    """Offsets (dx, dy) from the pivot, +y down.
    exhaust: centre of each nozzle exit (O + 3 metal px + O over a transparent row), on the row below it.
    primaryMuzzle / plasmaMuzzle: first transparent pixel straight ahead (up) of the muzzle centre."""
    exhaust = []
    for y in range(1, H):
        row, below = frame[y - 1], frame[y]
        for x in range(W - 4):
            seg = row[x:x + 5]
            if seg[0] == seg[4] == "O" and not set(seg[1:4]) & set(".Oo") and below[x + 1:x + 4] == "...":
                exhaust.append([x + 2 - PX, y - PY])
    def ahead(x):
        top = next(y for y in range(H) if frame[y][x] != ".")
        return [x - PX, top - 1 - PY]
    l, r, p = muzzle_cols(name)
    return {"exhaust": sorted(exhaust), "primaryMuzzle": [ahead(l), ahead(r)], "plasmaMuzzle": ahead(p)}


if __name__ == "__main__":
    fs = frames()
    for name, f in zip(FRAME_NAMES, fs):
        print(name, sockets(f, name))
    print(pixlib.save_sprite("player", [pixlib.grid_image(f, LEGEND) for f in fs]))
