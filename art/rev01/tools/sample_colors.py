"""Print each current sprite's dominant opaque colours (area-downscaled to its draw size,
median-cut to 10 colours, sorted dark -> light). Input for hand-curating the rev01 ramps."""
import json, colorsys, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCES = ["src/assets/art-gate.json", "src/assets/combat-art.json", "src/assets/campaign-art.json"]

def main() -> None:
    for meta in SOURCES:
        for key, asset in json.loads((ROOT / meta).read_text())["assets"].items():
            frame = asset["frames"][1 if key == "player" else 0]
            x, y, w, h = frame["rect"]
            image = Image.open(ROOT / "src/assets" / asset["path"][2:]).convert("RGBA").crop((x, y, x + w, y + h))
            size = (max(1, round(asset["drawSize"][0])), max(1, round(asset["drawSize"][1])))
            small = image.resize(size, Image.BOX)
            opaque = [p[:3] for p in small.get_flattened_data() if p[3] >= 128]
            if not opaque: continue
            strip = Image.new("RGB", (len(opaque), 1)); strip.putdata(opaque)
            q = strip.quantize(10, method=Image.Quantize.MEDIANCUT)
            pal, counts = q.getpalette(), sorted(q.getcolors(), reverse=True)
            cols = [tuple(pal[i * 3:i * 3 + 3]) for _, i in counts]
            cols.sort(key=lambda c: colorsys.rgb_to_hls(*(v / 255 for v in c))[1])
            print(f"{key:18s}", " ".join("#%02x%02x%02x" % c for c in cols))

if __name__ == "__main__":
    sys.exit(main())
