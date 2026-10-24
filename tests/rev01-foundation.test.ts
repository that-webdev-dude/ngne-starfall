import { test } from "node:test";
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Camera, Frame, type Sprite } from "@ngne/core";
import { LAYER, LAYER_CATEGORIES, layerCategory } from "../src/config/layers.ts";
import { VIEW } from "../src/config/view.ts";
import { displayLayout } from "../src/services/display.ts";
import { nativeQuad, pixelSnapped } from "../src/ui/sprite.ts";
import { decodePng, pngSize } from "./helpers/png.ts";

// Metadata-only import: no image may be fetched or decoded while the rev01 module loads and builds metadata.
const blocked = (name: string) => () => { throw new Error(`${name} called during a metadata-only import`); };
Object.assign(globalThis, { fetch: blocked("fetch"), createImageBitmap: blocked("createImageBitmap") });
// Hooks first: each must import cleanly on its own (no circular-initialization dependence on rev01-assets).
const { fontImage } = await import("../src/services/font-assets.ts");
const { playerFxExtraImages } = await import("../src/services/player-fx-assets.ts");
const { rev01ScreenImages, rev01StageImages } = await import("../src/services/rev01-claims.ts");
const rev01 = await import("../src/services/rev01-assets.ts");
const { REV01_CLAIMS, REV01_SPEC, REV01_URLS, frameCanvases, novaUploadFrames, planSparseAtlas, rev01Image, rev01Sprite, maskPixels } = rev01;
type Rev01Id = keyof typeof REV01_URLS;
const ids = Object.keys(REV01_URLS) as Rev01Id[];
const pathOf = (id: Rev01Id) => fileURLToPath(REV01_URLS[id]);

test("JSON import attributes load the read-only spec under Node, identical to a direct import", async () => {
  const direct = (await import("../art/rev01/spec.json", { with: { type: "json" } })).default;
  assert.deepEqual(REV01_SPEC, direct);
  assert.deepEqual(REV01_SPEC.viewport.logical, [VIEW.width, VIEW.height]);
  assert.deepEqual(new Set(ids), new Set(REV01_SPEC.sprites.map((sprite) => sprite.id)), "one literal URL per spec sprite");
  for (const id of ids) assert.ok(existsSync(pathOf(id)), `${id}: ${pathOf(id)}`);
  for (const id of ids.filter((id) => id !== "nova" && id !== "font")) rev01Image(id); // defining assets never loads them
  fontImage(); playerFxExtraImages();
});

test("device-pixel integer scale: spec table, DPR 1 / 1.25 / 1.5 / 2, whole-device-pixel placement", () => {
  const table = REV01_SPEC.viewport as unknown as { integerScales: Record<string, number> };
  for (const [screen, scale] of Object.entries(table.integerScales)) {
    const [width, height] = screen.split(" ")[0].split("x").map(Number);
    assert.equal(displayLayout(width, height, 1).scale, scale, screen);
  }
  // Same 1920x1080 panel under Windows display scaling: the CSS box shrinks, the device scale stays 3.
  for (const [ratio, cssWidth, cssHeight] of [[1, 1920, 1080], [1.25, 1536, 864], [1.5, 1280, 720], [2, 960, 540]] as const) {
    const layout = displayLayout(1920, 1080, ratio);
    assert.equal(layout.scale, 3, `DPR ${ratio}`);
    assert.deepEqual([layout.cssWidth, layout.cssHeight, layout.cssLeft, layout.cssTop], [cssWidth, cssHeight, 0, 0], `DPR ${ratio}`);
  }
  const cases: [number, number, number][] = [[1280, 800, 1], [2560, 1600, 2], [1919, 1081, 1.25], [3440, 1440, 1.5], [2880, 1800, 2], [1366, 768, 1.25]];
  for (const [width, height, ratio] of cases) {
    const layout = displayLayout(width, height, ratio), device = (css: number) => css * ratio;
    assert.ok(Number.isInteger(layout.scale) && layout.scale >= 1);
    assert.equal(layout.scale, Math.floor(Math.min(width / 640, height / 360)), `${width}x${height}`);
    assert.ok(Math.abs(device(layout.cssWidth) - 640 * layout.scale) < 1e-9 && Math.abs(device(layout.cssHeight) - 360 * layout.scale) < 1e-9);
    for (const offset of [device(layout.cssLeft), device(layout.cssTop)]) assert.ok(Math.abs(offset - Math.round(offset)) < 1e-9, "edge on a device pixel");
    const bars = [device(layout.cssLeft), width - device(layout.cssLeft) - 640 * layout.scale];
    assert.ok(bars.every((bar) => bar >= 0) && Math.abs(bars[0] - bars[1]) <= 1, "letterbox/pillarbox split evenly");
  }
  assert.equal(displayLayout(1280, 800, 1).cssTop, 40, "Steam Deck: 40 px bars top and bottom");
});

test("viewports below 640x360 device pixels keep 1x and clip equally on both sides", () => {
  for (const [width, height, ratio] of [[600, 300, 1], [601, 359, 1], [500, 300, 1.25], [639, 360, 2]] as const) {
    const layout = displayLayout(width, height, ratio);
    assert.equal(layout.scale, 1);
    assert.equal(layout.cssWidth * ratio, 640);
    const left = -layout.cssLeft * ratio, right = 640 - width - left;
    assert.ok(left >= 0 && right >= 0 && Math.abs(left - right) <= 1, `${width}: clip ${left} / ${right}`);
    if (height < 360) { const top = -layout.cssTop * ratio, bottom = 360 - height - top; assert.ok(Math.abs(top - bottom) <= 1); }
  }
});

test("native frames: canvases, strip size, pivots and one texel per logical pixel match spec and PNG", () => {
  for (const id of ids) {
    const sprite = rev01Sprite(id), canvases = frameCanvases(sprite.spec), size = pngSize(pathOf(id));
    assert.deepEqual([sprite.stripWidth, sprite.stripHeight], [size.width, size.height], `${id} strip`);
    assert.equal(sprite.frames.length, sprite.spec.frames.length);
    let x = 0;
    sprite.frames.forEach((frame, index) => {
      const [w, h] = canvases[index];
      assert.deepEqual([frame.x, frame.y, frame.width, frame.height], [x, 0, w, h], `${id}/${frame.name} rect (left to right, top-aligned)`);
      if (!id.endsWith("Background")) assert.ok(w % 2 === 1 && h % 2 === 1, `${id}/${frame.name} odd canvas`);
      const expected = Array.isArray(sprite.spec.pivot) ? sprite.spec.pivot : [(w - 1) / 2, (h - 1) / 2];
      assert.deepEqual([frame.pivotX, frame.pivotY], expected, `${id}/${frame.name} pivot`);
      assert.ok(frame.pivotX >= 0 && frame.pivotX < w && frame.pivotY >= 0 && frame.pivotY < h);
      assert.ok(Math.abs(frame.uw * sprite.stripWidth - w) < 1e-9 && Math.abs(frame.vh * sprite.stripHeight - h) < 1e-9, "UV covers exactly the canvas");
      const quad = nativeQuad(frame, 100.5, 50.25, { layer: 0 });
      assert.deepEqual([quad.width, quad.height], [w, h], "drawn at native size (no drawSize)");
      x += w;
    });
    // Per-pose sockets must name every frame (spec conventions.sockets).
    for (const [name, socket] of Object.entries(sprite.spec.sockets ?? {})) {
      if (socket && typeof socket === "object" && !Array.isArray(socket)) assert.deepEqual(Object.keys(socket).sort(), [...sprite.spec.frames].sort(), `${id}.${name}`);
    }
  }
});

test("animation metadata: order names exist, durations pair with frames, nova plays 11 frames / 560 ms without fade-3", () => {
  for (const id of ids) {
    const sprite = rev01Sprite(id), animation = sprite.spec.animation;
    if (!animation?.durationsMs) { assert.equal(sprite.playback, undefined); continue; }
    assert.ok(sprite.playback);
    assert.equal(sprite.playback.frames.length, animation.durationsMs.length, id);
    assert.ok(animation.durationsMs.every((ms) => Number.isInteger(ms) && ms > 0));
    if (animation.totalMs) assert.equal(animation.durationsMs.reduce((a, b) => a + b, 0), animation.totalMs, `${id} totalMs`);
    assert.equal(sprite.playback.loop, animation.type === "loop");
  }
  const nova = novaUploadFrames();
  assert.equal(nova.length, 11);
  assert.equal(rev01Sprite("nova").playback!.durationsMs.reduce((a, b) => a + b, 0), 560);
  assert.ok(!nova.some((frame) => frame.name === "fade-3"));
  assert.deepEqual(nova.map((frame) => frame.name), rev01Sprite("nova").spec.frames.slice(0, 11));
});

test("registry: every spec sprite is claimed by exactly the consumers' groups; the nova strip is never a plain upload", () => {
  const claimed = new Set<string>([...REV01_CLAIMS.playerFx, ...Object.values(REV01_CLAIMS.enemies).flat(), ...REV01_CLAIMS.hud, ...REV01_CLAIMS.screens, ...Object.values(REV01_CLAIMS.backgrounds)]);
  // nova: T2's playerFxExtraImages(); font: T4's fontImage(). Neither is a plain group entry or rev01Image().
  assert.deepEqual(new Set([...claimed, "nova", "font"]), new Set(ids));
  assert.ok(!claimed.has("nova") && !claimed.has("font"));
  assert.throws(() => rev01Image("nova"));
  assert.throws(() => rev01Image("font"), /fontImage/);
  // Hooks are lazy and stable: the same definitions every call, so claims never carry two assets under one id.
  assert.equal(fontImage(), fontImage());
  assert.equal(playerFxExtraImages(), playerFxExtraImages());
  const font = fontImage(), extra = playerFxExtraImages();
  assert.ok(font.kind === "image" && extra.every((asset) => asset.kind === "image" && asset.id !== "rev01-nova"));
  const ofFont = (assets: readonly { id: string }[]) => assets.filter((asset) => asset.id.startsWith("rev01-font"));
  for (const stage of Object.keys(REV01_CLAIMS.enemies)) {
    const assets = rev01StageImages(stage), claims = assets.map((asset) => asset.id);
    assert.equal(new Set(claims).size, claims.length, "no duplicate claims");
    assert.ok(claims.includes(`rev01-${(REV01_CLAIMS.backgrounds as Record<string, string>)[stage]}`));
    assert.ok(!claims.includes("rev01-nova"));
    for (const id of [...REV01_CLAIMS.playerFx, ...REV01_CLAIMS.hud, ...REV01_CLAIMS.screens]) assert.ok(claims.includes(`rev01-${id}`), `${stage} claims ${id}`);
    for (const asset of extra) assert.ok(assets.includes(asset), `${stage} claims T2 extra ${asset.id}`);
    assert.deepEqual(ofFont(assets), [font], `${stage}: exactly one font definition, from fontImage()`);
  }
  assert.deepEqual(rev01StageImages("unknown"), []);
  const screens = rev01ScreenImages();
  assert.ok(screens.every((asset) => asset.kind === "image" && asset.id.startsWith("rev01-")));
  assert.deepEqual(screens.map((asset) => asset.id), [font.id, ...REV01_CLAIMS.screens.map((id) => `rev01-${id}`)]);
  assert.deepEqual(ofFont(screens), [font], "title: same font definition as the stages");
});

test("shared layer table follows presentation.layers category order and keeps hull/exhaust/flash stacking", () => {
  const spec = REV01_SPEC.presentation.layers.list;
  const labels = ["background", "hulls", "effects", "HUD", "nova ring", "beam lanes", "bullets", "player core marker", "full-screen flash", "pause / result scene"];
  assert.equal(LAYER_CATEGORIES.length, spec.length);
  LAYER_CATEGORIES.forEach(([category], index) => assert.ok(spec[index].startsWith(labels[index]), `${category} ↔ ${spec[index]}`));
  const values = Object.values(LAYER);
  assert.deepEqual([...values].sort((a, b) => a - b), values.map((_, i) => i), "consecutive, unique");
  assert.ok(values.length <= 64, "fits the engine's 64-layer bucket sort");
  for (let i = 1; i < LAYER_CATEGORIES.length; i++) {
    const below = LAYER_CATEGORIES[i - 1][1].map((slot) => LAYER[slot]), above = LAYER_CATEGORIES[i][1].map((slot) => LAYER[slot]);
    assert.ok(Math.max(...below) < Math.min(...above), `${LAYER_CATEGORIES[i - 1][0]} below ${LAYER_CATEGORIES[i][0]}`);
  }
  const order = (...slots: (keyof typeof LAYER)[]) => slots.forEach((slot, i) => i && assert.ok(LAYER[slots[i - 1]] < LAYER[slot], `${slots[i - 1]} < ${slot}`));
  order("mine", "bossLink", "enemy", "enemyDetail", "enemyMark", "pickup", "playerExhaust", "player", "playerFlash", "playerCalm");
  order("explosion", "particle", "playerMuzzleFx");
  order("hudBand", "hudPlate", "hudTrack", "hudFill", "hudText", "banner", "stageCard", "scorePop", "nova", "beamLane", "beamMarker", "playerBullet", "hostileCore", "plasmaImpact", "coreRim", "core", "flash", "screenDim", "screenText");
  assert.equal(layerCategory("plasmaImpact"), "bullets");
  assert.equal(layerCategory("playerFlash"), "hulls");
});

/** Screen position of a texel centre after the engine's affine (renderer.js packAffine, quad corner (s, t) in 0..1). */
function texelCentre(quad: Sprite, frameWidth: number, frameHeight: number, i: number, j: number): [number, number] {
  const angle = quad.rotation ?? 0, c = Math.cos(angle), s = Math.sin(angle), w = quad.width, h = quad.height;
  const ix = c * w, iy = s * w, jx = -s * h, jy = c * h, x0 = quad.x - (ix + jx) / 2, y0 = quad.y - (iy + jy) / 2;
  const sc = (quad.uw ?? 1) < 0 ? (frameWidth - (i + 0.5)) / frameWidth : (i + 0.5) / frameWidth, tc = (j + 0.5) / frameHeight;
  return [x0 + sc * ix + tc * jx, y0 + sc * iy + tc * jy];
}

test("native quads put every edge on a whole pixel and the pivot texel on the pixel containing the position", () => {
  const near = (value: number) => Math.abs(value - Math.round(value)) < 1e-9;
  const cases: [Rev01Id, string, { flipX?: boolean; rotation?: -90 }][] = [
    ["player", "neutral", {}], ["exhaust", "long", {}], ["gatebreakerTurret", "idle", { flipX: true }], ["starfallEmitter", "idle", { flipX: true }],
    ["kilnHead", "cut-0", { rotation: -90 }], ["kilnSegment", "idle", { rotation: -90 }], ["hudPlate", rev01Sprite("hudPlate").spec.frames[1], {}],
  ];
  for (const [id, name, options] of cases) for (const [x, y] of [[100, 50], [100.49, 50.51], [-3.7, 359.99], [319.5, 180.5]]) {
    const frame = rev01Sprite(id).frame(name), quad = nativeQuad(frame, x, y, { layer: 0, ...options });
    const [cx, cy] = texelCentre(quad, frame.width, frame.height, frame.pivotX, frame.pivotY);
    assert.ok(Math.abs(cx - (Math.floor(x) + 0.5)) < 1e-9 && Math.abs(cy - (Math.floor(y) + 0.5)) < 1e-9, `${id} ${JSON.stringify(options)} pivot at ${cx},${cy} for ${x},${y}`);
    const [ax, ay] = texelCentre(quad, frame.width, frame.height, 0, 0);
    assert.ok(near(ax - 0.5) && near(ay - 0.5), `${id} texel centres on pixel centres`);
  }
  // Mirroring moves canvas column i to the mirrored side of the pivot column.
  const turret = rev01Sprite("gatebreakerTurret").frame("idle"), flipped = nativeQuad(turret, 200, 100, { layer: 0, flipX: true });
  const [mx] = texelCentre(flipped, turret.width, turret.height, turret.pivotX + 3, turret.pivotY);
  assert.equal(mx, 200.5 - 3);
  // -90 degrees: canvas +x ends up as screen up (spec: lighting drawn for that orientation).
  const head = rev01Sprite("kilnHead").frame("cut-0"), rotated = nativeQuad(head, 200, 100, { layer: 0, rotation: -90 });
  const [rx, ry] = texelCentre(rotated, head.width, head.height, head.pivotX + 5, head.pivotY);
  assert.ok(Math.abs(rx - 200.5) < 1e-9 && Math.abs(ry - (100.5 - 5)) < 1e-9);
});

test("pixelSnapped legacy drawing with engine snapping off is identical to the engine's own rounding", () => {
  const draw = (frame: Frame) => {
    for (let i = 0; i < 50; i++) {
      const x = i * 7.37 - 20, y = i * 3.61 + 0.5;
      frame.rect(x, y, 4 + i % 3, 2.67, 0xff00ff, 0.5, i % 5, i % 2 === 0);
      frame.sprite({ x: y, y: x, width: 13.3, height: 9, rotation: i * 0.1, layer: 3, texture: "t" });
    }
  };
  for (const shake of [0, 3, -2]) {
    const engine = new Frame(), migrated = new Frame(), snapped = new Camera(), unsnapped = new Camera();
    snapped.shakeX = unsnapped.shakeX = shake; snapped.shakeY = unsnapped.shakeY = -shake; unsnapped.pixelSnap = false;
    engine.scene(snapped, 1); migrated.scene(unsnapped, 1);
    draw(engine); draw(pixelSnapped(migrated));
    assert.equal(migrated.count, engine.count);
    assert.deepEqual(Array.from(migrated.data.subarray(0, migrated.count * 14)), Array.from(engine.data.subarray(0, engine.count * 14)));
  }
});

test("unused component defaults use the 640x360 spawn conventions; non-spatial defaults unchanged", async () => {
  const { Flight } = await import("../src/components/flight.ts");
  const { Beam, Bullet, Enemy } = await import("../src/components/combat.ts");
  const { PLAYER_START } = await import("../src/world/session.ts");
  const { COMBAT } = await import("../src/config/encounters.ts");
  const { REV01_GAMEPLAY } = await import("../src/config/rev01-gameplay.ts");
  const { Kind, enemySpec } = await import("../src/config/enemies.ts");
  const d = (fields: Record<string, { default: unknown }>, ...names: string[]) => names.map((name) => fields[name].default);
  assert.deepEqual(d(Flight.fields, "x", "y", "px", "py"), [PLAYER_START.x, PLAYER_START.y, PLAYER_START.x, PLAYER_START.y]);
  assert.deepEqual(d(Enemy.fields, "kind", "radius", "active"), [Kind.Interceptor, enemySpec(Kind.Interceptor).radius, 1]);
  assert.deepEqual(d(Bullet.fields, "team", "radius", "size", "damage", "color"), [0, COMBAT.playerBulletRadius, 4, 1, 0xff767e]);
  assert.deepEqual(d(Beam.fields, "width", "charge", "duration"), [REV01_GAMEPLAY.beamWidth.starfallEngine, 0.9, 0.65]);
});

test("font mask seam keeps alpha and whitens opaque texels so a tint reproduces the text colour", () => {
  const source = { width: 2, height: 1, data: new Uint8ClampedArray([12, 34, 56, 255, 99, 99, 99, 0]) };
  assert.deepEqual(Array.from(maskPixels(source).data), [255, 255, 255, 255, 0, 0, 0, 0]);
});

test("nova sparse atlas plan: 11 played frames, 32x32 non-empty tiles, within the device texture limit", (t) => {
  const strip = decodePng(pathOf("nova")), frames = novaUploadFrames();
  const opaque = (frame: { x: number; y: number }, x: number, y: number, width: number, height: number) => {
    for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) if (strip.data[((frame.y + row) * strip.width + frame.x + column) * 4 + 3]) return true;
    return false;
  };
  // 8192 is WebGPU's default maxTextureDimension2D, the limit the engine's device is created with.
  const plan = planSparseAtlas(frames, opaque, { tile: 32, atlasWidth: 2048, maxDimension: 8192 });
  let opaqueTexels = 0, covered = 0;
  frames.forEach((frame) => { for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) if (strip.data[((frame.y + y) * strip.width + frame.x + x) * 4 + 3]) opaqueTexels++; });
  for (const tile of plan.tiles) for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) if (strip.data[((tile.sy + y) * strip.width + tile.sx + x) * 4 + 3]) covered++;
  assert.equal(covered, opaqueTexels, "every opaque texel of every played frame is in a tile");
  assert.equal(plan.frameTiles.length, 11);
  assert.ok(plan.width <= 2048 && plan.height <= 8192 && plan.height <= 4096, `${plan.width}x${plan.height}`);
  const full = rev01Sprite("nova");
  t.diagnostic(`nova strip ${full.stripWidth}x${full.stripHeight} (${full.stripWidth * full.stripHeight} texels, fade-3 ${full.frame("fade-3").width} wide); ` +
    `sparse atlas ${plan.width}x${plan.height} = ${plan.width * plan.height} texels, ${plan.tiles.length} tiles, ${plan.texels} tile texels, ` +
    `${opaqueTexels} opaque texels; max tiles per frame ${Math.max(...plan.frameTiles.map((list) => list.length))}`);
  assert.throws(() => planSparseAtlas(frames, opaque, { tile: 32, atlasWidth: 256, maxDimension: 256 }), /maxTextureDimension2D/);
});
