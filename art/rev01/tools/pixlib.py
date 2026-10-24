"""Shared helpers for the rev01 art sources: palette lookup, grid rendering, previews.

A sprite source (source/<id>.py) draws each frame as a list of equal-length strings, one
character per pixel, and maps characters to palette entries with a legend:
    legend = {".": None, "o": ("outline", 0), "s": ("steel", 2)}   # (ramp name, index in ramp)
Backgrounds may instead map characters (or pass integer arrays) to their own "#rrggbb" colours."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = json.loads((ROOT / "spec.json").read_text())
RAMPS = {r["name"]: r["colors"] for r in SPEC["palette"]["ramps"]}

def rgb(hex_: str) -> tuple[int, int, int]:
    return tuple(int(hex_[i:i + 2], 16) for i in (1, 3, 5))

def color(entry) -> tuple[int, int, int, int]:
    """None -> transparent, (ramp, i) -> palette colour, "#rrggbb" -> that colour."""
    if entry is None: return (0, 0, 0, 0)
    if isinstance(entry, str): return (*rgb(entry), 255)
    ramp, i = entry
    return (*rgb(RAMPS[ramp][i]), 255)

def sprite(sprite_id: str) -> dict:
    return next(s for s in SPEC["sprites"] if s["id"] == sprite_id)

def grid_image(rows: list[str], legend: dict) -> Image.Image:
    h, w = len(rows), len(rows[0])
    assert all(len(r) == w for r in rows), "ragged grid"
    image = Image.new("RGBA", (w, h))
    lut = {k: color(v) for k, v in legend.items()}
    image.putdata([lut[c] for r in rows for c in r])
    return image

def strip(frames: list[Image.Image]) -> Image.Image:
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h))
    for i, f in enumerate(frames): out.paste(f, (i * w, 0))
    return out

def save_sprite(sprite_id: str, frames: list[Image.Image]) -> Path:
    """Write sprites/<id>.png (frames left to right) after checking the canvas size."""
    w, h = sprite(sprite_id)["canvas"]
    for f in frames: assert f.size == (w, h), f"{sprite_id}: frame {f.size} != {(w, h)}"
    path = ROOT / "sprites" / f"{sprite_id}.png"
    path.parent.mkdir(exist_ok=True)
    strip(frames).save(path)
    return path

def save_background(sprite_id: str, image: Image.Image) -> Path:
    w, h = sprite(sprite_id)["canvas"]
    assert image.size == (w, h), f"{sprite_id}: {image.size} != {(w, h)}"
    path = ROOT / "backgrounds" / f"{sprite_id}.png"
    path.parent.mkdir(exist_ok=True)
    image.convert("RGB").save(path)
    return path

def preview(path, out, scale: int = 8, bg=(24, 26, 40)) -> None:
    """Nearest-neighbour enlargement on a flat backdrop (write `out` outside the art folder)."""
    image = Image.open(path).convert("RGBA")
    big = image.resize((image.width * scale, image.height * scale), Image.NEAREST)
    canvas = Image.new("RGBA", big.size, (*bg, 255))
    canvas.alpha_composite(big)
    canvas.convert("RGB").save(out)
