"""Centre banner plate, 3-slice x 2 variants (left/fill/right 9x21 / 1x21 / 9x21, then the same three
-alert), pivot (0,0); slices meet edge to edge. panel, alert; 6 colours. Rows 158..178, centred on
x 320, width = text width + 22: caps 9 px + fill (width - 18); text at plate column 11, rows 7..13.

A raised plate over the playfield, lit from the top: panel[0] silhouette with 3 px chamfered corners,
panel[2] top bevel (and upper diagonal), panel[1] face, panel[0] bottom bevel (and lower diagonal). Two
engraved rules run the full width 2 px above and below the text: a panel[0] groove with a lit lower wall.
Each cap carries a 4x7 chevron on the text rows pointing at the text (left ">", right "<"), 4 px clear of
it.
  normal (stage / sector text): rules lit panel[2], chevrons panel[3].
  alert (PHASE banners): rules lit alert[0], chevrons alert[1]. Only these accents change; the silhouette,
  bevels and face are identical, and both accents stay darker than the alert[2] danger text."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "O": ("panel", 0),    # silhouette (outline[0] would be a near-duplicate of panel[0])
    "D": ("panel", 0),    # bottom bevel, groove
    "F": ("panel", 1),    # face
    "B": ("panel", 2),    # top bevel; lit rule (normal)
    "c": ("panel", 3),    # chevron (normal)
    "r": ("alert", 0),    # lit rule (alert)
    "a": ("alert", 1),    # chevron (alert)
}

LEFT = [
    "...OOOOOO",
    "..OBBBBBB",
    ".OBFFFFFF",
    "OBFDDDDDD",
    "OFFBBBBBB",
    "OFFFFFFFF",
    "OFFFFFFFF",
    "OFFcFFFFF",
    "OFFFcFFFF",
    "OFFFFcFFF",
    "OFFFFFcFF",
    "OFFFFcFFF",
    "OFFFcFFFF",
    "OFFcFFFFF",
    "OFFFFFFFF",
    "OFFFFFFFF",
    "OFFDDDDDD",
    "OFFBBBBBB",
    ".ODFFFFFF",
    "..ODDDDDD",
    "...OOOOOO",
]
FILL = ["O", "B", "F", "D", "B"] + ["F"] * 11 + ["D", "B", "F", "D", "O"]
RIGHT = [r[::-1] for r in LEFT]

def alert(rows: list[str]) -> list[str]:
    """Rule rows 4 and 17 light in alert[0]; chevrons turn alert[1]."""
    out = [r.replace("c", "a") for r in rows]
    for y in (4, 17): out[y] = out[y].replace("B", "r")
    return out

if __name__ == "__main__":
    frames = [LEFT, FILL, RIGHT, alert(LEFT), alert(FILL), alert(RIGHT)]
    print(pixlib.save_sprite("bannerPlate", [pixlib.grid_image(f, LEGEND) for f in frames]))
