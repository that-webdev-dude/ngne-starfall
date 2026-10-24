"""Check spec.json for internal consistency, and optionally check exported files against it.

Usage: python -I tools/validate.py [--all] [--rebuild] [sprite-id=path/to/file.png ...]
  --all       check every sprite in the spec that has a file in sprites/ or backgrounds/
  --rebuild   also run source/<id>.py with saving intercepted and compare to the export

Scope: this checks files, not art quality. It verifies strip sizes, binary alpha, ramp
membership, colour budgets and edge margins (sprites flagged edgeClear); background palette size, forbidden ramps and the brightness
cap; that every socket exists for every pose and lies inside the canvas; and, with
--rebuild, that each source script reproduces its PNG exactly. It does not judge silhouette,
shading, animation, collision fairness or readability in play."""
import json, runpy, sys
sys.dont_write_bytecode = True  # -I ignores PYTHONDONTWRITEBYTECODE; keep the folder free of __pycache__
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPEC = json.loads((ROOT / "spec.json").read_text())
RAMPS = {r["name"]: r for r in SPEC["palette"]["ramps"]}
BACKGROUND_FORBIDDEN = ["fire", "glow", "pickup", "cockpit", "plasma", "bead", "needle", "orb", "nova"]

def rgb(hex_: str) -> tuple[int, int, int]:
    return tuple(int(hex_[i:i + 2], 16) for i in (1, 3, 5))

def luma(c) -> float:
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

def is_background(spec: dict) -> bool:
    return spec["id"].endswith("Background")

def canvases(spec: dict) -> list[tuple[int, int]]:
    if "canvases" in spec: return [tuple(c) for c in spec["canvases"]]
    return [tuple(spec["canvas"])] * len(spec["frames"])

def pivot(spec: dict, canvas: tuple[int, int]) -> tuple[int, int]:
    p = spec["pivot"]
    if isinstance(p, str): return ((canvas[0] - 1) // 2, (canvas[1] - 1) // 2)
    return tuple(p)

def check_spec() -> list[str]:
    errors, next_index, seen = [], 1, {}
    for ramp in SPEC["palette"]["ramps"]:
        if ramp["first"] != next_index: errors.append(f"ramp {ramp['name']} starts at {ramp['first']}, expected {next_index}")
        next_index = ramp["first"] + len(ramp["colors"])
        values = [luma(rgb(c)) for c in ramp["colors"]]
        if values != sorted(values): errors.append(f"ramp {ramp['name']} is not ordered dark -> light")
        for c in ramp["colors"]:
            if c in seen: errors.append(f"{c} appears in {seen[c]} and {ramp['name']}")
            seen[c] = ramp["name"]
    if next_index != SPEC["palette"]["size"]: errors.append(f"palette size {SPEC['palette']['size']} != {next_index}")
    for name in BACKGROUND_FORBIDDEN:
        if name not in RAMPS: errors.append(f"background-forbidden ramp {name} is not in the palette")
    ids = [s["id"] for s in SPEC["sprites"]]
    for i in ids:
        if ids.count(i) > 1: errors.append(f"duplicate sprite id {i}")
    for s in SPEC["sprites"]:
        if "canvases" in s and len(s["canvases"]) != len(s["frames"]): errors.append(f"{s['id']} has {len(s['canvases'])} canvases for {len(s['frames'])} frames")
        for c in canvases(s):
            w, h = c
            if not is_background(s) and (w % 2 == 0 or h % 2 == 0): errors.append(f"{s['id']} canvas {w}x{h} is not odd x odd")
            px, py = pivot(s, c)
            if not (0 <= px < w and 0 <= py < h): errors.append(f"{s['id']} pivot outside canvas {w}x{h}")
        for name in s["ramps"]:
            if name not in RAMPS and not is_background(s): errors.append(f"{s['id']} uses unknown ramp {name}")
        anim = s.get("animation", {})
        if "durationsMs" in anim:
            steps = len(anim.get("order", s["frames"]))
            if steps != len(anim["durationsMs"]): errors.append(f"{s['id']} has {steps} steps but {len(anim['durationsMs'])} durations")
            if "totalMs" in anim and sum(anim["durationsMs"]) != anim["totalMs"]: errors.append(f"{s['id']} durations sum to {sum(anim['durationsMs'])}, totalMs says {anim['totalMs']}")
        if "order" in anim:
            for f in anim["order"]:
                if f not in s["frames"]: errors.append(f"{s['id']} animation order names unknown frame {f}")
        errors += check_sockets(s)
    return errors

def socket_points(value) -> list[tuple[int, int]]:
    """A socket value is [dx, dy] or a list of them."""
    if isinstance(value, list) and len(value) == 2 and all(isinstance(v, int) for v in value): return [tuple(value)]
    if isinstance(value, list): return [p for v in value for p in socket_points(v)]
    return []

def check_sockets(spec: dict) -> list[str]:
    errors = []
    for name, value in spec.get("sockets", {}).items():
        per_pose = isinstance(value, dict)
        if per_pose:
            missing = [f for f in spec["frames"] if f not in value]
            unknown = [f for f in value if f not in spec["frames"]]
            if missing: errors.append(f"{spec['id']} socket {name} missing for pose(s) {missing}")
            if unknown: errors.append(f"{spec['id']} socket {name} names unknown pose(s) {unknown}")
            items = [(f, v) for f, v in value.items() if f in spec["frames"]]
        else:
            items = [(None, value)]
        for frame, v in items:
            points = socket_points(v)
            if not points: errors.append(f"{spec['id']} socket {name}{' ' + frame if frame else ''} is not [dx, dy] or a list of them")
            canvas = canvases(spec)[spec["frames"].index(frame)] if frame else canvases(spec)[0]
            px, py = pivot(spec, canvas)
            for dx, dy in points:
                x, y = px + dx, py + dy
                if not (0 <= x < canvas[0] and 0 <= y < canvas[1]):
                    errors.append(f"{spec['id']} socket {name}{' ' + frame if frame else ''} ({dx},{dy}) lands at ({x},{y}), outside {canvas[0]}x{canvas[1]}")
    return errors

def check_strip(sprite_id: str, path: str) -> list[str]:
    spec = next((s for s in SPEC["sprites"] if s["id"] == sprite_id), None)
    if spec is None: return [f"unknown sprite id {sprite_id}"]
    if not Path(path).exists(): return [f"{path}: missing"]
    image = Image.open(path).convert("RGBA")
    if is_background(spec): return check_background(spec, path, image)
    sizes = canvases(spec)
    expected = (sum(w for w, _ in sizes), max(h for _, h in sizes))
    errors = [] if image.size == expected else [f"{path}: size {image.size}, expected {expected}"]
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
    if spec.get("edgeClear") and image.size == expected:
        x = 0
        for frame, (w, h) in zip(spec["frames"], sizes):
            box = image.crop((x, 0, x + w, h)).getchannel("A").getbbox(); x += w
            if box and (box[0] == 0 or box[1] == 0 or box[2] == w or box[3] == h): errors.append(f"{path}: frame {frame} has opaque pixels on the canvas edge (edgeClear)")
    return errors

def check_background(spec: dict, path: str, image: Image.Image) -> list[str]:
    errors = [] if image.size == tuple(spec["canvas"]) else [f"{path}: size {image.size}, expected {tuple(spec['canvas'])}"]
    colors = image.getcolors(1 << 24) or []
    if any(c[3] != 255 for _, c in colors): errors.append(f"{path}: not fully opaque")
    used = {c[:3] for _, c in colors}
    if len(used) > spec["maxColors"]: errors.append(f"{path}: {len(used)} colours, max {spec['maxColors']}")
    forbidden = {rgb(c): name for name in BACKGROUND_FORBIDDEN for c in RAMPS[name]["colors"]}
    hits = sorted({f"#%02x%02x%02x ({forbidden[c]})" % c for c in used if c in forbidden})
    if hits: errors.append(f"{path}: uses forbidden ramp colours {hits[:8]}")
    cap = max(luma(rgb(c)) for c in RAMPS["steel"]["colors"])
    brightest = max(luma(c) for c in used)
    if brightest >= cap: errors.append(f"{path}: brightest colour luma {brightest:.1f} is not below steel's lightest {cap:.1f}")
    return errors

def check_rebuild(sprite_id: str, path: str) -> list[str]:
    """Run source/<id>.py with pixlib's save functions intercepted; compare to the export."""
    script = ROOT / "source" / f"{sprite_id}.py"
    if not script.exists(): return [f"{sprite_id}: no source script {script.name}"]
    sys.path.insert(0, str(ROOT / "tools"))
    import pixlib
    captured = {}
    def fake_sprite(sid, frames):
        captured[sid] = pixlib.strip(frames).convert("RGBA"); return Path(f"<captured {sid}>")
    def fake_background(sid, image):
        captured[sid] = image.convert("RGB").convert("RGBA"); return Path(f"<captured {sid}>")
    saved = pixlib.save_sprite, pixlib.save_background
    pixlib.save_sprite, pixlib.save_background = fake_sprite, fake_background
    real_stdout = sys.stdout
    try:
        sys.stdout = open(__import__("os").devnull, "w")
        runpy.run_path(str(script), run_name="__main__")
    except Exception as e:  # noqa: BLE001 - report, don't crash the run
        return [f"{sprite_id}: source script failed: {e!r}"]
    finally:
        sys.stdout.close(); sys.stdout = real_stdout
        pixlib.save_sprite, pixlib.save_background = saved
    if sprite_id not in captured: return [f"{sprite_id}: source script did not save {sprite_id}"]
    rebuilt, export = captured[sprite_id], Image.open(path).convert("RGBA")
    if rebuilt.size != export.size: return [f"{sprite_id}: rebuilt size {rebuilt.size} != export {export.size}"]
    if rebuilt.tobytes() != export.tobytes():
        diff = sum(1 for a, b in zip(rebuilt.get_flattened_data(), export.get_flattened_data()) if a != b)
        return [f"{sprite_id}: rebuilt image differs from {path} in {diff} pixel(s)"]
    return []

def default_path(spec: dict) -> Path:
    return ROOT / ("backgrounds" if is_background(spec) else "sprites") / f"{spec['id']}.png"

def main(argv: list[str]) -> int:
    rebuild, everything = "--rebuild" in argv, "--all" in argv
    args = [a for a in argv if not a.startswith("--")]
    errors = check_spec()
    targets = [(a.partition("=")[0], a.partition("=")[2]) for a in args]
    if everything: targets += [(s["id"], str(default_path(s))) for s in SPEC["sprites"] if default_path(s).exists()]
    checked = 0
    for sprite_id, path in targets:
        errors += check_strip(sprite_id, path)
        if rebuild: errors += check_rebuild(sprite_id, path)
        checked += 1
    for e in errors: print("FAIL", e)
    print(("OK" if not errors else f"{len(errors)} problem(s)") + f" (spec + {checked} file(s){', rebuilt' if rebuild else ''})")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
