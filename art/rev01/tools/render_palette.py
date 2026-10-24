"""Render palette.png: one row per ramp, 24 px swatches, plus a greyscale copy to check value steps."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parents[1]
ramps = json.loads((HERE / "spec.json").read_text())["palette"]["ramps"]
S, LABEL = 24, 90
width = LABEL + S * max(len(r["colors"]) for r in ramps) * 2 + 16
image = Image.new("RGB", (width, S * len(ramps)), "#060d19")
draw = ImageDraw.Draw(image)
for row, ramp in enumerate(ramps):
    y = row * S
    draw.text((4, y + 7), f"{ramp['first']:>2} {ramp['name']}", fill="#dde9e3")
    for i, hex_ in enumerate(ramp["colors"]):
        draw.rectangle((LABEL + i * S, y, LABEL + (i + 1) * S - 1, y + S - 2), fill=hex_)
        grey = Image.new("RGB", (1, 1), hex_).convert("L").getpixel((0, 0))
        x = LABEL + S * len(ramp["colors"]) + 16 + i * S
        draw.rectangle((x, y, x + S - 1, y + S - 2), fill=(grey, grey, grey))
image.save(HERE / "palette.png")
print("wrote", HERE / "palette.png")
