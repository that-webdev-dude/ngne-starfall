"""Boss bar phase mark, 2 frames (ahead, passed). 3x9, pivot (1,4); the canvas is the mark. panel, ui;
3 colours. Drawn at x = 200 + round(240 * t) - 1, y 21: rows 0-1 sit above the bar, 2-6 on it (bar rows
23..27), 7-8 below.

An I-beam: a 1 px stem on the centre column with a 3 px head at each end pointing at the bar. Over the
bar the stem is flanked by panel[0] columns, so it cuts a clear 3 px notch through the red fill.
  ahead  = phase still to come: stem and heads ui[0] (label colour), lighter than the fill around it.
  passed = health is below the threshold: stem and heads panel[3]; it now sits on the empty track and
           stays readable but quiet (dimmer than any text)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools")); import pixlib

LEGEND = {
    ".": None,
    "P": ("panel", 0),  # notch flanks over the bar
    "q": ("panel", 3),  # passed
    "u": ("ui", 0),     # ahead
}

AHEAD = [
    "uuu",
    ".u.",
    "PuP",
    "PuP",
    "PuP",
    "PuP",
    "PuP",
    ".u.",
    "uuu",
]

FRAMES = [AHEAD, [r.replace("u", "q") for r in AHEAD]]

if __name__ == "__main__":
    print(pixlib.save_sprite("bossBarMark", [pixlib.grid_image(f, LEGEND) for f in FRAMES]))
