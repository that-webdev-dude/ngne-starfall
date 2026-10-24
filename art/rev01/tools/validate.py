"""Check spec.json for internal consistency, and optionally check sprite strips against it.

Usage: python -I tools/validate.py [sprite-id=path/to/strip.png ...]
A strip holds the sprite's frames left to right, each canvas-sized, using only palette colours
(index 0 = fully transparent pixels)."""
import colorsys, json, sys
from pathlib import Path
from PIL import Image

SPEC = json.loads((Path(__file__).resolve().parents[1] / "spec.json").read_text())

def rgb(hex_: str) -> tuple[int, int, int]:
    return tuple(int(hex_[i:i + 2], 16) for i in (1, 3, 5))

def luma(c) -> float:
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def check_spec() -> list[str]:
    errors, next_index, seen = [], 1, {}
    ramps = {r["name"]: r for r in SPEC["palette"]["ramps"]}
    for ramp in SPEC["palette"]["ramps"]:
        if ramp["first"] != next_index: errors.append(f"ramp {ramp['name']} starts at {ramp['first']}, expected {next_index}")
        next_index = ramp["first"] + len(ramp["colors"])
        values = [luma(rgb(c)) for c in ramp["colors"]]
        if values != sorted(values): errors.append(f"ramp {ramp['name']} is not ordered dark -> light")
        for c in ramp["colors"]:
            if c in seen: errors.append(f"{c} appears in {seen[c]} and {ramp['name']}")
            seen[c] = ramp["name"]
    if next_index != SPEC["palette"]["size"]: errors.append(f"palette size {SPEC['palette']['size']} != {next_index}")
    for s in SPEC["sprites"]:
        (w, h), (px, py) = s["canvas"], s["pivot"]
        background = s["id"].endswith("Background")
        if not background and (w % 2 == 0 or h % 2 == 0): errors.append(f"{s['id']} canvas {w}x{h} is not odd x odd")
        if not (0 <= px < w and 0 <= py < h): errors.append(f"{s['id']} pivot outside canvas")
        for name in s["ramps"]:
            if name not in ramps and not background: errors.append(f"{s['id']} uses unknown ramp {name}")
        anim = s.get("animation", {})
        if "durationsMs" in anim:
            steps = len(anim.get("order", s["frames"]))
            if steps != len(anim["durationsMs"]): errors.append(f"{s['id']} has {steps} steps but {len(anim['durationsMs'])} durations")
    return errors

def check_strip(sprite_id: str, path: str) -> list[str]:
    spec = next((s for s in SPEC["sprites"] if s["id"] == sprite_id), None)
    if spec is None: return [f"unknown sprite id {sprite_id}"]
    image = Image.open(path).convert("RGBA")
    (w, h), frames = spec["canvas"], len(spec["frames"])
    errors = [] if image.size == (w * frames, h) else [f"{path}: size {image.size}, expected {(w * frames, h)}"]
    allowed = {rgb(c) for r in SPEC["palette"]["ramps"] if r["name"] in spec["ramps"] for c in r["colors"]}
    used, partial, foreign = set(), 0, set()
    for p in image.get_flattened_data():
        if p[3] == 0: continue
        if p[3] != 255: partial += 1; continue
        used.add(p[:3])
        if allowed and p[:3] not in allowed: foreign.add("#%02x%02x%02x" % p[:3])
    if partial: errors.append(f"{path}: {partial} semi-transparent pixels")
    if foreign: errors.append(f"{path}: colours outside its ramps: {sorted(foreign)[:8]}")
    if len(used) > spec["maxColors"]: errors.append(f"{path}: {len(used)} colours, max {spec['maxColors']}")
    return errors

def main(argv: list[str]) -> int:
    errors = check_spec()
    for arg in argv:
        sprite_id, _, path = arg.partition("=")
        errors += check_strip(sprite_id, path)
    for e in errors: print("FAIL", e)
    print("OK" if not errors else f"{len(errors)} problem(s)")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
