"""HUD/menu font, 46 frames (A-Z, 0-9, : / - . + ! , ' < >). 5x7 cell, pivot (0,0); ui[2]; 1 colour.
Replaces the 3x5 GLYPHS table in src/ui/bitmap-text.ts. The strip is a mask: the consumer draws the
opaque pixels in the text colour it needs (presentation.textColors).

Metrics: monospaced, cell 5x7 = the canvas (strokes may touch every edge), advance 6 (1 px gap),
line height 9, cap height 7 (rows 0-6), baseline row 6, no descenders; a string is 6n - 1 px wide.

Construction rules, applied to every glyph:
- 1 px strokes, no anti-aliasing. Full-width stems on columns 0 and 4; single stems on column 2.
- Middle bars and waists on row 3 (A B E F H P R S 3 5 6 8 9), so the set shares one mid-line.
- One corner rule for round letters and figures (C D G J O Q S U B P R 0 2 3 5 6 8 9): a rounded
  corner is the corner pixel left out, i.e. a single 1 px diagonal step between the runs. Square
  letters (E F H L T Z, the left of B D P R) keep sharp corners.
- Diagonals: K N R Z 7 M and the interior of 0, 4, < > are 1:1. Full-height strokes that cross 5
  columns in 7 rows (slash, X, the arms of Y) alternate runs 1,2,1,2,1; V steps 3,3 to a 1 px point.
- Punctuation that is symmetric sits on the middle column (: . ! ' , and the stems of + and -);
  minus and plus are centred on row 3. The apostrophe is a straight 2 px tick (a slanted one reads
  as an acute accent); the comma is a 2 px head-and-tail on rows 5-6, inside the cell.

Disambiguation at 1x:
- 0 / O: the zero carries a 1:1 slash (top-right to bottom-left inside the bowl); O is open.
- 1 / I: the one has a flag at (1,1) and a 3 px foot; I has 3 px bars at top and bottom.
- 5 / S: the five has a flat full-width top with a square top-left corner; S is rounded all round.
- 8 / B: the eight is rounded on both sides with a pinched waist; B has a straight, square left stem.
- 2 / Z: the two has a rounded top; Z has a flat full-width top and bottom with a 1:1 diagonal."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {".": None, "#": ("ui", 2)}

GLYPHS = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "J": ["..###", "....#", "....#", "....#", "....#", "#...#", ".###."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", ".#.#.", ".#.#.", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
    "X": ["#...#", ".#.#.", ".#.#.", "..#..", ".#.#.", ".#.#.", "#...#"],
    "Y": ["#...#", ".#.#.", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "#....", "####.", "....#", "#...#", ".###."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    "colon":      [".....", ".....", "..#..", ".....", "..#..", ".....", "....."],
    "slash":      ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
    "minus":      [".....", ".....", ".....", "#####", ".....", ".....", "....."],
    "period":     [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
    "plus":       [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
    "exclaim":    ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
    "comma":      [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
    "apostrophe": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
    "less":       ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
    "greater":    [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
}

if __name__ == "__main__":
    frames = pixlib.sprite("font")["frames"]
    assert list(GLYPHS) == frames, "glyph order differs from spec font.frames"
    print(pixlib.save_sprite("font", [pixlib.grid_image(GLYPHS[f], LEGEND) for f in frames]))
