import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Camera, Frame, Game, emptyInput, lerp, type Camera as CameraType, type SceneSetup, type Sprite, type WorldAccess } from "@ngne/core";
import { Bullet, Particle, Pose } from "../src/components/combat.ts";
import { Flight } from "../src/components/flight.ts";
import { COMBAT } from "../src/config/encounters.ts";
import { Kind } from "../src/config/enemies.ts";
import { LAYER } from "../src/config/layers.ts";
import { STAGES } from "../src/config/stages.ts";
import { FLIGHT, fromLegacy as w } from "../src/config/view.ts";
import { spawnBullet, spawnEnemy, spawnRepair } from "../src/entities/combat.ts";
import { drawBeamLane, drawPlayer, needleQuad } from "../src/render/player-fx.ts";
import {
  CALM_HIT_SECONDS, DAMAGE_FLASH_SECONDS, EFFECT, HOSTILE_SHAPES, NOVA_CALM_FLARE_SECONDS, POSES, POSE_STEP_SECONDS, effectSeconds, hostileShape,
  killEffect, neutralPose, paletteColor, poseName, poseSockets, resolvePlayerCues, stepPose, type PlayerCues,
} from "../src/render/player-fx-model.ts";
import { stageScene } from "../src/scenes/stage.ts";
import { NOVA_ATLAS_ID, WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D, deriveNovaAtlas, novaAtlasPlan, packNovaAtlas, playerFxExtraImages } from "../src/services/player-fx-assets.ts";
import { REV01_SPEC, REV01_URLS, novaUploadFrames, rev01Sprite, type NativeFrame } from "../src/services/rev01-assets.ts";
import type { CombatSound } from "../src/systems/combat-context.ts";
import { PLAYER_DEATH_SECONDS, playerFxState } from "../src/systems/player-fx-state.ts";
import { approach } from "../src/utils/motion.ts";
import type { Progress, ProgressCommand, RunState, Session } from "../src/world/session.ts";
import { decodePng } from "./helpers/png.ts";

const DT = 1 / 60;
const novaPath = fileURLToPath(REV01_URLS.nova), novaStrip = decodePng(novaPath);
deriveNovaAtlas(novaStrip); // the atlas plan a browser load would set

interface Quad { layer: number; texture?: string; x0: number; y0: number; ix: number; iy: number; jx: number; jy: number; u: number; v: number; uw: number; vh: number; rgb: number; alpha: number }
function quads(frame: Frame): Quad[] {
  const layers = (frame as unknown as { layers: number[] }).layers, d = frame.data;
  return Array.from({ length: frame.count }, (_, i) => {
    const o = i * 14, byte = (value: number) => Math.round(value * 255);
    return { layer: layers[i], texture: frame.textures[i], x0: d[o], y0: d[o + 1], ix: d[o + 2], iy: d[o + 3], jx: d[o + 4], jy: d[o + 5],
      u: d[o + 6], v: d[o + 7], uw: d[o + 8], vh: d[o + 9], rgb: (byte(d[o + 10]) << 16) | (byte(d[o + 11]) << 8) | byte(d[o + 12]), alpha: d[o + 13] };
  });
}
/** A frame as the stage camera produces it: engine centre snapping off. */
function nativeFrame(): Frame { const frame = new Frame(), camera = new Camera(); camera.pixelSnap = false; frame.scene(camera, 1); return frame; }
/** Which frame of a strip a quad samples (by its strip offset). */
const frameOf = (id: Parameters<typeof rev01Sprite>[0], quad: Quad) => rev01Sprite(id).frames.find((frame) => Math.fround(frame.u) === quad.u)?.name;
/** Expected index in a once-playback at `ms` (independent of the renderer's helper). */
function onceIndex(durations: readonly number[], ms: number): number {
  let sum = 0;
  for (let i = 0; i < durations.length; i++) { sum += durations[i]; if (ms < sum - 1e-6) return i; }
  return -1;
}

type Fixture = (scene: SceneSetup<Progress, ProgressCommand>, run: RunState) => void;
async function stage(options: { reducedMotion?: boolean; stageIndex?: number; setup?: Fixture } = {}) {
  const session: Session = { settings: { music: 0, effects: 0, muted: true, reducedMotion: options.reducedMotion ?? false }, screen: "title", best: 0, ready: true };
  const calls: Record<string, number> = {}, taken: { purpose: string; finishTimer: number }[] = [], queue: Fixture[] = [];
  const sound = new Proxy({}, { get: (_, name) => () => { calls[String(name)] = (calls[String(name)] ?? 0) + 1; } }) as CombatSound;
  const index = options.stageIndex ?? 0;
  const actual = stageScene(session, { assets: [], sound: () => sound, take: (purpose) => { taken.push({ purpose, finishTimer: session.run!.finishTimer }); return undefined; } }, index);
  const game = new Game<Progress, ProgressCommand>({ seed: "T2-PLAYER-FX", state: { best: 0, runs: 0 }, transition: (state) => state });
  let world!: WorldAccess, camera!: CameraType;
  await game.start(await game.prepare({ ...actual, setup(scene) {
    scene.system(() => { for (const action of queue.splice(0)) action(scene, session.run!); }, { runsDuringFreeze: true });
    actual.setup(scene); world = scene.world; camera = scene.camera;
    session.run!.waveIndex = STAGES[index].encounters.length; // no waves, no boss: only what a test spawns
    options.setup?.(scene, session.run!);
  } }, { key: `t2-${index}` }));
  const run = session.run!;
  return {
    game, run, calls, taken, queue, world: () => world, fx: () => playerFxState(run),
    tick(input: ReturnType<typeof emptyInput> = emptyInput()) { game.tick(input); },
    hold(keys: string[]) { game.tick({ ...emptyInput(), held: keys }); },
    press(key: string) { game.tick({ ...emptyInput(), pressed: [key] }); },
    /** Rendered quads with positions in world pixels (the whole-pixel shake removed). */
    render(alpha = 1) {
      const frame = new Frame(); game.render(frame, alpha);
      return quads(frame).map((quad) => ({ ...quad, x0: quad.x0 + camera.shakeX, y0: quad.y0 + camera.shakeY }));
    },
    player() { let x = 0, y = 0; world.query(Flight).eachChunk(({ views }) => { x = lerp(views.flight.px[0], views.flight.x[0], 1); y = lerp(views.flight.py[0], views.flight.y[0], 1); }); return { x, y }; },
  };
}

// ---- Poses and sockets --------------------------------------------------------------------------------------

test("poses: seven spec levels, one level per 50 ms (spec 40-65), immediate first step toward neutral and on reversal, never a skipped level", () => {
  assert.deepEqual(POSES, rev01Sprite("player").spec.frames);
  assert.deepEqual(rev01Sprite("playerFlash").spec.frames, POSES, "one flash counterpart per pose");
  const [min, max] = (rev01Sprite("player").spec.animation as unknown as { transitionMs: number[] }).transitionMs;
  assert.ok(POSE_STEP_SECONDS * 1000 >= min && POSE_STEP_SECONDS * 1000 <= max);
  const state = neutralPose(); let bank = 0;
  // Keyboard input through the simulation's bank: hard right, release, hard left, reversal to hard right.
  const segments: [number, number, number][] = [[1, 30, 3], [0, 30, 0], [-1, 40, -3], [1, 40, 3]];
  for (const [input, ticks, final] of segments) {
    const changes: number[] = [], start = state.level;
    let previous = state.level;
    for (let tick = 0; tick < ticks; tick++) {
      bank = approach(bank, input, FLIGHT.bankResponse, DT); stepPose(state, bank, DT);
      assert.ok(Math.abs(state.level - previous) <= 1, "adjacent levels only");
      if (state.level !== previous) changes.push(tick);
      previous = state.level;
    }
    assert.equal(state.level, final, `input ${input} settles on level ${final}`);
    assert.equal(changes[0], 0, `input ${input}: the first level changes on the first tick`);
    for (let i = 1; i < changes.length; i++) assert.equal(changes[i] - changes[i - 1], Math.round(POSE_STEP_SECONDS / DT), "then one level per 50 ms");
    assert.equal(changes.length, Math.abs(final - start), "every level in between visited exactly once");
  }
});

test("sockets: volleys spawn on the current pose's primary muzzles; exhaust, hull, flash, calm and plasma attach at the same pose's sockets", async () => {
  const flash = rev01Sprite("playerFlash").spec.sockets, spec = rev01Sprite("player").spec.sockets;
  assert.deepEqual(flash, spec, "playerFlash shares the player sockets pose by pose");
  const h = await stage();
  try {
    const levels = new Set<number>();
    const check = () => {
      const level = h.fx().pose.level, spawned: number[][] = [], round = (value: number) => Math.round(value * 1e6) / 1e6;
      h.world().query(Pose, Bullet).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) if (!views.bullet.team[i] && views.bullet.age[i] === 0) spawned.push([round(views.pose.x[i] - h.run.x), round(views.pose.y[i] - h.run.y)]); });
      if (!spawned.length) return;
      levels.add(level);
      assert.deepEqual(spawned.sort((a, b) => a[0] - b[0]), poseSockets(level).primary.map(([dx, dy]) => [dx, dy]), `level ${level}: bolts on that pose's muzzles`);
      // Rendering of the same tick: hull frame and both flames at the pose's exhaust sockets.
      const drawn = h.render(), { x, y } = h.player(), px = Math.floor(x), py = Math.floor(y), exhaust = rev01Sprite("exhaust").frames[0];
      const hull = drawn.filter((quad) => quad.texture === "rev01-player");
      assert.equal(hull.length, 1);
      assert.equal(frameOf("player", hull[0]), poseName(level));
      assert.deepEqual([hull[0].x0, hull[0].y0], [px - 15, py - 16], "pivot (15,16) on the player's pixel");
      const flames = drawn.filter((quad) => quad.texture === "rev01-exhaust").map((quad) => [quad.x0, quad.y0]);
      assert.deepEqual(flames, poseSockets(level).exhaust.map(([dx, dy]) => [px + dx - exhaust.pivotX, py + dy - exhaust.pivotY]));
    };
    // Fire while banking right, holding, reversing left and releasing.
    for (const [keys, ticks] of [[["Space", "KeyD"], 40], [["Space", "KeyA"], 40], [["Space"], 30]] as const) for (let i = 0; i < ticks; i++) { h.hold([...keys]); check(); }
    assert.ok(levels.has(3) && levels.has(-3) && levels.size >= 4, `volleys at ${[...levels].join(", ")}`);
    assert.equal(h.fx().pose.level, 0);
  } finally { h.game.dispose(); }
  // Per-pose draw: every cue art is registered to the same pivot pixel and the pose's plasma muzzle.
  for (let level = -3; level <= 3; level++) for (const cues of [
    { hull: "playerFlash", alpha: 1, chargeReady: "plasmaReady", lowHull: false },
    { hull: "player", alpha: 0.35, calm: "shield", chargeReady: "plasmaReadyCalm", lowHull: true },
    { hull: "player", alpha: 1, calm: "hit", lowHull: false },
  ] as PlayerCues[]) {
    const frame = nativeFrame(), name = poseName(level), sockets = poseSockets(level);
    drawPlayer(frame, { x: 200.7, y: 150.3, level, cues, clock: 0.13, reducedMotion: false });
    const drawn = quads(frame), at = (texture: string) => drawn.filter((quad) => quad.texture === texture);
    const hull = at(`rev01-${cues.hull}`)[0];
    assert.equal(frameOf(cues.hull, hull), name);
    assert.equal(hull.layer, cues.hull === "player" ? LAYER.player : LAYER.playerFlash);
    assert.deepEqual([hull.x0, hull.y0, hull.alpha], [200 - 15, 150 - 16, Math.fround(cues.alpha)]);
    assert.ok(at("rev01-exhaust").every((quad) => quad.layer === LAYER.playerExhaust && quad.alpha === Math.fround(cues.alpha)));
    if (cues.calm) {
      const calm = at("rev01-playerCalm")[0];
      assert.equal(frameOf("playerCalm", calm), `${cues.calm}-${name}`);
      assert.deepEqual([calm.x0, calm.y0, calm.layer, calm.alpha], [200 - 17, 150 - 18, LAYER.playerCalm, 1], "calm canvas = player canvas + 2 px each side");
    }
    if (cues.chargeReady) {
      const ready = at(`rev01-${cues.chargeReady}`)[0], [mx, my] = sockets.plasma;
      assert.deepEqual([ready.x0 + 7, ready.y0 + 7, ready.layer], [200 + mx, 150 + my, LAYER.playerMuzzleFx], "plasma cue pivot on the pose's plasma muzzle");
    }
    const low = drawn.filter((quad) => !quad.texture && quad.rgb === paletteColor("needle", 1));
    assert.equal(low.length, cues.lowHull ? 2 : 0);
    if (cues.lowHull) assert.deepEqual(low.map((quad) => [quad.x0, quad.y0, quad.ix, quad.jy]), [[200 + sockets.exhaust[0][0] - 1, 156, 2, 2], [200 + sockets.exhaust[1][0], 156, 2, 2]], "2x2 on each pod rear, canvas rows 22-23");
    const core = drawn.filter((quad) => quad.layer === LAYER.core || quad.layer === LAYER.coreRim);
    assert.deepEqual(core.map((quad) => [quad.x0 + quad.ix / 2, quad.y0 + quad.jy / 2, quad.ix, quad.alpha === 1 || quad.alpha === Math.fround(0.9)]), [[200.5, 150.5, 7, true], [200.5, 150.5, 3, true]], "core marker on the pivot pixel, never dimmed");
  }
});

// ---- Cue priority -------------------------------------------------------------------------------------------

test("cue priority: damage flash before the invulnerability blink, charge-ready kept at the muzzle, low hull separate; reduced motion holds calm cues", () => {
  const base = { reducedMotion: false, clock: 0, sinceDamage: Infinity, invulnerable: 0, hull: 5, chargeReady: false };
  // Damage overlaps invulnerability and charge-ready: flash wins, charge-ready stays, low hull waits.
  assert.deepEqual(resolvePlayerCues({ ...base, sinceDamage: 0.05, invulnerable: 1.15, chargeReady: true, hull: 1 }), { hull: "playerFlash", alpha: 1, chargeReady: "plasmaReady", lowHull: false });
  const alphas = new Set<number>(), lows = new Set<boolean>();
  for (let tick = 0; tick < 60; tick++) {
    const cues = resolvePlayerCues({ ...base, clock: tick * DT, sinceDamage: DAMAGE_FLASH_SECONDS + tick * DT, invulnerable: 1, chargeReady: true, hull: 1 });
    assert.equal(cues.hull, "player"); assert.equal(cues.chargeReady, "plasmaReady"); assert.equal(cues.calm, undefined);
    alphas.add(cues.alpha); lows.add(cues.lowHull);
  }
  assert.deepEqual([...alphas].sort(), [0.35, 1], "bright/dim, never invisible");
  assert.deepEqual([...lows].sort(), [false, true], "low hull blinks at ~2 Hz in normal motion");
  assert.equal(resolvePlayerCues({ ...base, clock: 0.06, invulnerable: 0 }).alpha, 1, "no blink without invulnerability");
  assert.equal(resolvePlayerCues({ ...base, hull: 2 }).lowHull, false); assert.equal(resolvePlayerCues({ ...base, hull: 0 }).lowHull, false);
  const calm = { ...base, reducedMotion: true, chargeReady: true, hull: 1 };
  for (let tick = 0; tick < 60; tick++) {
    const clock = tick * DT, hit = resolvePlayerCues({ ...calm, clock, sinceDamage: clock * CALM_HIT_SECONDS, invulnerable: 1 });
    assert.deepEqual(hit, { hull: "player", alpha: 1, calm: "hit", chargeReady: "plasmaReadyCalm", lowHull: true }, "hit held, no opacity change, low hull steady");
    assert.equal(resolvePlayerCues({ ...calm, clock, sinceDamage: CALM_HIT_SECONDS + clock, invulnerable: 0.5 }).calm, "shield");
    assert.equal(resolvePlayerCues({ ...calm, clock, sinceDamage: CALM_HIT_SECONDS + clock, invulnerable: 0 }).calm, undefined);
  }
});

test("damage in the stage: playerFlash for 100 ms then the opacity blink; reduced motion: hit outline 250 ms, shield until iFrames end, no flashes", async () => {
  for (const reducedMotion of [false, true]) {
    const h = await stage({ reducedMotion, setup: (scene, run) => { run.invulnerable = 0; spawnBullet(scene.world, run.x, run.y, 0, 0); } });
    try {
      h.tick();
      assert.equal(h.run.hull, 4); assert.equal(h.run.invulnerable, 1.2, "iFrame length unchanged");
      const states: string[] = [];
      for (let tick = 0; tick < 100; tick++) {
        const drawn = h.render(), hull = drawn.find((quad) => quad.texture === "rev01-player"), flash = drawn.find((quad) => quad.texture === "rev01-playerFlash");
        const calm = drawn.find((quad) => quad.texture === "rev01-playerCalm");
        assert.ok(drawn.some((quad) => quad.layer === LAYER.core), "core marker every frame");
        assert.ok(!drawn.some((quad) => quad.texture === "rev01-explosion"), "no fireball on the player");
        if (reducedMotion) {
          assert.ok(hull && !flash && hull.alpha === 1, "hull never flashes or dims");
          assert.ok(!drawn.some((quad) => quad.layer === LAYER.flash), "no full-screen flash");
          states.push(calm ? frameOf("playerCalm", calm)!.split("-")[0] : "none");
        } else states.push(flash ? "flash" : hull!.alpha === 1 ? "bright" : "dim");
        h.tick();
      }
      const runLength = (value: string) => states.indexOf(value) === 0 ? states.findIndex((state) => state !== value) : -1;
      if (reducedMotion) {
        assert.equal(runLength("hit"), Math.round(CALM_HIT_SECONDS / DT), "hit outline held 250 ms");
        const shieldEnd = states.lastIndexOf("shield");
        assert.ok(states.slice(15, shieldEnd + 1).every((state) => state === "shield") && states.slice(shieldEnd + 1).every((state) => state === "none"));
        assert.ok(shieldEnd > 60 && shieldEnd < 85, `shield until invulnerability ends (${shieldEnd})`);
      } else {
        assert.equal(runLength("flash"), Math.round(DAMAGE_FLASH_SECONDS / DT), "one brief flash");
        assert.ok(states.slice(6, 60).includes("dim") && states.slice(6, 60).includes("bright"));
        assert.ok(states.slice(85).every((state) => state === "bright"), "blink ends with the iFrames");
      }
    } finally { h.game.dispose(); }
  }
});

test("death: playerDeath once at the death position (frame 0 skipped for a banked pose), core on frames 0-1, result timing unchanged", async () => {
  const durations = rev01Sprite("playerDeath").playback!.durationsMs;
  assert.equal(PLAYER_DEATH_SECONDS, 0.57);
  for (const banked of [false, true]) {
    const h = await stage({ setup: (_scene, run) => { run.invulnerable = 0; run.hull = 1; } });
    try {
      const input = banked ? ["KeyD"] : [];
      for (let i = 0; i < 10; i++) h.hold(input);
      assert.equal(h.fx().pose.level, banked ? 3 : 0);
      // Spawns publish at tick commit: the bullet exists on the next tick and hits on the one after.
      h.queue.push((scene, run) => { spawnBullet(scene.world, run.x, run.y, 0, 0); });
      h.hold(input); h.hold(input);
      assert.equal(h.run.phase, "dead");
      assert.equal(h.fx().pose.level, banked ? 3 : 0);
      const at = { x: Math.floor(h.run.x), y: Math.floor(h.run.y) }, frames: string[] = [];
      for (let tick = 0; tick < 50; tick++) {
        const drawn = h.render(), death = drawn.filter((quad) => quad.texture === "rev01-playerDeath");
        assert.ok(!drawn.some((quad) => quad.texture === "rev01-player" || quad.texture === "rev01-explosion"), "no hull, no fireball");
        const expected = onceIndex(durations, tick * DT * 1000 + (banked ? durations[0] : 0));
        if (expected < 0) assert.equal(death.length, 0);
        else {
          assert.equal(death.length, 1);
          assert.equal(frameOf("playerDeath", death[0]), `death-${expected}`);
          assert.deepEqual([death[0].x0, death[0].y0, death[0].layer], [at.x - 23, at.y - 23, LAYER.explosion]);
          frames.push(`death-${expected}`);
        }
        assert.equal(drawn.some((quad) => quad.layer === LAYER.core), expected >= 0 && expected <= 1, `core marker on death-0/1 only (tick ${tick})`);
        h.tick();
      }
      assert.equal(frames[0], banked ? "death-1" : "death-0");
      assert.equal(new Set(frames).size, banked ? 7 : 8, "every remaining frame shown once, in order");
      for (let i = 0; i < 40; i++) h.tick();
      const result = h.taken.find((entry) => entry.purpose === "result");
      assert.ok(result && result.finishTimer > 1.2 && result.finishTimer <= 1.2 + DT + 1e-9, "result after 1.2 s, as before");
    } finally { h.game.dispose(); }
  }
});

// ---- Effects ------------------------------------------------------------------------------------------------

test("effects: named once-sprites live exactly their spec playback; hit spark at the impact, breakup for mid-tier kills, explosion for fodder", async () => {
  const total = (id: Parameters<typeof rev01Sprite>[0]) => rev01Sprite(id).playback!.durationsMs.reduce((a, b) => a + b, 0) / 1000;
  assert.equal(effectSeconds(EFFECT.explosion), 0.365, "legacy explosion lifetime");
  for (const [kind, id] of [[EFFECT.hitSpark, "hitSpark"], [EFFECT.heavyBreakup, "heavyBreakup"], [EFFECT.plasmaImpact, "plasmaImpact"]] as const) {
    assert.equal(effectSeconds(kind), total(id)); assert.equal(rev01Sprite(id).playback!.loop, false);
  }
  for (const kind of [Kind.Gunship, Kind.Warden, Kind.Minelayer]) assert.equal(killEffect(kind), EFFECT.heavyBreakup);
  for (const kind of [Kind.Interceptor, Kind.Sweeper, Kind.Mine, Kind.Gatebreaker, Kind.KilnSegment]) assert.equal(killEffect(kind), EFFECT.explosion);
  for (const [kind, sprite] of [[Kind.Gunship, "heavyBreakup"], [Kind.Interceptor, "explosion"]] as const) {
    const h = await stage({ setup: (scene, run) => { spawnEnemy(scene.world, run, kind, w(240), w(120), { hp: 1, cooldown: 100 }); spawnBullet(scene.world, w(240), w(120) + 4, 0, -w(370), 0); } });
    try {
      h.tick();
      const effects: { kind: number; life: number; x: number; y: number }[] = [];
      h.world().query(Pose, Particle).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) if (views.particle.kind[i]) effects.push({ kind: views.particle.kind[i], life: views.particle.life[i], x: views.pose.x[i], y: views.pose.y[i] }); });
      const spark = effects.find((effect) => effect.kind === EFFECT.hitSpark), kill = effects.find((effect) => effect.kind !== EFFECT.hitSpark);
      assert.equal(effects.length, 2);
      assert.ok(spark && Math.abs(spark.y - (w(120) + 4 - w(370) * DT)) < 1e-9 && spark.x === w(240), "spark where the bolt hit");
      assert.equal(spark.life, effectSeconds(EFFECT.hitSpark));
      assert.deepEqual([kill?.kind, kill?.life], [killEffect(kind), effectSeconds(killEffect(kind))]);
      // The enemy moves once (< 1.2 px) before collision; the effect sits on its position at death.
      assert.ok(kill && Math.hypot(kill.x - w(240), kill.y - w(120)) < 1.2, `kill effect on the enemy (${kill?.x}, ${kill?.y})`);
      const seen: string[] = [], durations = rev01Sprite(sprite).playback!.durationsMs;
      for (let tick = 0; tick < 40; tick++) {
        const drawn = h.render().filter((quad) => quad.texture === `rev01-${sprite}`), expected = onceIndex(durations, tick * DT * 1000);
        assert.equal(drawn.length, expected < 0 ? 0 : 1, `${sprite} tick ${tick}`);
        if (drawn[0]) { assert.equal(frameOf(sprite, drawn[0]), rev01Sprite(sprite).spec.frames[expected]); assert.equal(drawn[0].layer, LAYER.explosion); seen.push(frameOf(sprite, drawn[0])!); }
        h.tick();
      }
      assert.deepEqual([...new Set(seen)], rev01Sprite(sprite).spec.frames, "all frames in order, then gone");
      let left = 0; h.world().query(Particle).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) if (views.particle.kind[i]) left++; });
      assert.equal(left, 0, "effect particles despawn when their playback ends");
    } finally { h.game.dispose(); }
  }
});

// ---- Nova ---------------------------------------------------------------------------------------------------

test("nova: 11 ordered frames / 560 ms from the trigger position while the ship moves; reduced motion: ignite-1 flare, novaCalm ring, embers in place", async () => {
  const plan = novaAtlasPlan()!, durations = rev01Sprite("nova").playback!.durationsMs, names = novaUploadFrames().map((frame) => frame.name);
  assert.deepEqual(names, rev01Sprite("nova").spec.frames.slice(0, 11));
  assert.equal(durations.reduce((a, b) => a + b, 0), 560);
  for (const reducedMotion of [false, true]) {
    const h = await stage({ reducedMotion, setup: (scene) => { for (let i = 0; i < 5; i++) spawnBullet(scene.world, w(100 + i * 40), w(60), 0, w(10)); } });
    try {
      // Bottom-left clamp corner (24, 319): from there every played frame, up to fade-2's corner reach, is on screen.
      h.queue.push((scene, run) => scene.world.query(Flight).eachChunk(({ views }) => {
        views.flight.x[0] = views.flight.px[0] = run.x = 24; views.flight.y[0] = views.flight.py[0] = run.y = 319;
      }));
      h.press("KeyB");
      assert.equal(h.calls.nova, 1);
      assert.deepEqual([h.run.x, h.run.y], [24, 319], "triggered at the clamp corner, the spec's worst case for corner reach");
      const origin = { x: Math.floor(h.fx().nova!.x), y: Math.floor(h.fx().nova!.y) }, startX = h.run.x;
      if (reducedMotion) {
        const embers: number[][] = [];
        h.world().query(Particle).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) if (views.particle.color[i] === 0x83f1e1) embers.push([views.particle.vx[i], views.particle.vy[i]]); });
        assert.equal(embers.length, 10); assert.ok(embers.every(([vx, vy]) => vx === 0 && vy === 0), "cleared bullets leave still embers");
      }
      const shown: string[] = [];
      for (let tick = 0; tick < 50; tick++) {
        const drawn = h.render(), atlas = drawn.filter((quad) => quad.texture === NOVA_ATLAS_ID), calm = drawn.filter((quad) => quad.texture === "rev01-novaCalm");
        const ms = h.run.novaRing * 1000;
        assert.ok([...atlas, ...calm].every((quad) => quad.layer === LAYER.nova));
        if (reducedMotion) assert.ok(!drawn.some((quad) => quad.layer === LAYER.flash), "no full-screen flash");
        let expected: string | undefined;
        if (!reducedMotion) { const index = onceIndex(durations, ms); expected = index < 0 ? undefined : names[index]; }
        else if (ms < NOVA_CALM_FLARE_SECONDS * 1000 - 1e-6) expected = "ignite-1";
        else { const index = onceIndex(rev01Sprite("novaCalm").playback!.durationsMs, ms - NOVA_CALM_FLARE_SECONDS * 1000); expected = index < 0 ? undefined : rev01Sprite("novaCalm").spec.frames[index]; }
        if (expected?.startsWith("calm")) {
          assert.equal(atlas.length, 0); assert.equal(calm.length, 1);
          assert.equal(frameOf("novaCalm", calm[0]), expected);
          assert.deepEqual([calm[0].x0 + 111, calm[0].y0 + 111], [origin.x, origin.y], "calm ring at the trigger position");
        } else if (expected) {
          const index = names.indexOf(expected), tiles = plan.frameTiles[index].map((slot) => plan.tiles[slot]);
          assert.equal(calm.length, 0);
          assert.ok(atlas.length > 0 && atlas.length <= tiles.length && tiles.length <= 169, `${expected}: ${atlas.length} quads of ${tiles.length}`);
          const key = (x: number, y: number) => `${x},${y}`, positions = new Set(tiles.map((tile) => key(origin.x + tile.offsetX, origin.y + tile.offsetY)));
          for (const quad of atlas) assert.ok(positions.has(key(quad.x0, quad.y0)), `${expected}: tile at ${quad.x0},${quad.y0} belongs to this frame at the fixed origin`);
          const visible = tiles.filter((tile) => { const x = origin.x + tile.offsetX, y = origin.y + tile.offsetY; return x < 640 && y < 360 && x + tile.width > 0 && y + tile.height > 0; });
          assert.ok(atlas.length >= visible.length, "every on-screen tile drawn");
        } else { assert.equal(atlas.length + calm.length, 0, `nothing after the nova (${ms} ms)`); }
        if (expected && shown.at(-1) !== expected) shown.push(expected);
        h.hold(["KeyD"]);
      }
      assert.deepEqual(shown, reducedMotion ? ["ignite-1", "calm-ring", "calm-broken"] : names, "playback order; fade-3 never shown");
      assert.ok(h.run.x - startX > 20, "the ship moved away; the ring did not follow");
    } finally { h.game.dispose(); }
  }
});

test("nova sparse atlas: only occupied 32x32 cells of the 11 played frames, from loaded pixels, fade-3 excluded, within the WebGPU default limit", () => {
  const { pixels, plan } = packNovaAtlas(novaStrip), frames = novaUploadFrames(), fade3 = rev01Sprite("nova").frame("fade-3");
  assert.deepEqual([plan.width, plan.height, plan.tiles.length, Math.max(...plan.frameTiles.map((list) => list.length))], [2048, 416, 801, 169], "T1-measured plan");
  assert.ok(plan.width <= WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D && plan.height <= WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D);
  assert.equal(WEBGPU_DEFAULT_MAX_TEXTURE_DIMENSION_2D, 8192);
  assert.deepEqual([pixels.width, pixels.height, pixels.data.length], [2048, 416, 2048 * 416 * 4]);
  assert.equal(plan.frameTiles.length, 11);
  assert.ok(plan.tiles.every((tile) => tile.sx + tile.width <= fade3.x), "no texel of fade-3 is uploaded");
  const alpha = (x: number, y: number) => novaStrip.data[(y * novaStrip.width + x) * 4 + 3];
  let opaque = 0, copied = 0, mismatched = 0, empty = 0;
  for (const frame of frames) for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) if (alpha(frame.x + x, frame.y + y)) opaque++;
  for (const tile of plan.tiles) {
    let any = false;
    for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
      const from = ((tile.sy + y) * novaStrip.width + tile.sx + x) * 4, to = ((tile.dy + y) * pixels.width + tile.dx + x) * 4;
      for (let c = 0; c < 4; c++) if (pixels.data[to + c] !== novaStrip.data[from + c]) mismatched++;
      if (novaStrip.data[from + 3]) { any = true; copied++; }
    }
    if (!any) empty++;
  }
  assert.deepEqual([mismatched, empty], [0, 0], "tiles are exact copies of occupied cells only");
  assert.equal(copied, opaque, "every opaque texel of every played frame is in the atlas, exactly");
  let atlasOpaque = 0; for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i]) atlasOpaque++;
  assert.equal(atlasOpaque, opaque, "nothing else in the atlas");
  assert.throws(() => packNovaAtlas(novaStrip, 256), /maxTextureDimension2D/, "plan rejected above the device limit");
  assert.throws(() => packNovaAtlas({ ...novaStrip, width: 100 }), /nova strip/);
});

test("nova atlas asset: stable lazy definition; the load fetches the strip, closes the decoded bitmap, uploads only the atlas and honours abort", async () => {
  const extra = playerFxExtraImages();
  assert.equal(extra, playerFxExtraImages()); assert.equal(extra.length, 1);
  const [asset] = extra;
  assert.deepEqual([asset.id, asset.kind], [NOVA_ATLAS_ID, "image"]);
  const saved = Object.fromEntries(["fetch", "createImageBitmap", "OffscreenCanvas", "ImageData"].map((name) => [name, (globalThis as Record<string, unknown>)[name]]));
  const bytes = readFileSync(novaPath), log = { fetched: 0, decodedClosed: 0, uploads: [] as { width: number; height: number; data: Uint8ClampedArray; closed: boolean }[] };
  Object.assign(globalThis, {
    fetch: async (url: string, init: { signal: AbortSignal }) => { init.signal.throwIfAborted(); assert.equal(url, REV01_URLS.nova); log.fetched++; return new Response(bytes); },
    createImageBitmap: async (source: Blob | { width: number; height: number; data: Uint8ClampedArray }) => {
      if (source instanceof Blob) return { width: novaStrip.width, height: novaStrip.height, close: () => { log.decodedClosed++; } };
      const bitmap = { width: source.width, height: source.height, data: source.data, closed: false, close() { bitmap.closed = true; } };
      log.uploads.push(bitmap); return bitmap;
    },
    OffscreenCanvas: class {
      width: number; height: number;
      constructor(width: number, height: number) { this.width = width; this.height = height; }
      getContext() { return { drawImage() {}, getImageData: (_x: number, _y: number, width: number, height: number) => ({ width, height, data: novaStrip.data }) }; }
    },
    ImageData: class {
      data: Uint8ClampedArray; width: number; height: number;
      constructor(data: Uint8ClampedArray, width: number, height: number) { this.data = data; this.width = width; this.height = height; }
    },
  });
  try {
    const bitmap = await asset.load(new AbortController().signal) as unknown as (typeof log.uploads)[number];
    assert.deepEqual([log.fetched, log.decodedClosed, log.uploads.length], [1, 1, 1], "one fetch, the decoded strip closed, one (atlas) bitmap");
    assert.deepEqual([bitmap.width, bitmap.height], [2048, 416], "the full 7766x1545 strip never becomes a texture");
    assert.deepEqual(bitmap.data, packNovaAtlas(novaStrip).pixels.data);
    assert.equal(asset.estimateBytes?.(bitmap as unknown as ImageBitmap), 2048 * 416 * 4);
    assert.deepEqual(novaAtlasPlan(), packNovaAtlas(novaStrip).plan, "renderer layout = uploaded layout");
    asset.dispose?.(bitmap as unknown as ImageBitmap);
    assert.equal(bitmap.closed, true);
    const aborted = new AbortController(); aborted.abort();
    await assert.rejects(asset.load(aborted.signal));
    assert.deepEqual([log.fetched, log.uploads.length], [1, 1], "an aborted load decodes and uploads nothing");
  } finally { Object.assign(globalThis, saved); }
});

// ---- Projectiles --------------------------------------------------------------------------------------------

/** Screen pixel of a texel centre after the engine's affine (renderer.js packAffine), as in rev01-foundation.test.ts. */
function texelPixel(quad: Sprite, frame: NativeFrame, i: number, j: number): [number, number] {
  const angle = quad.rotation ?? 0, c = Math.cos(angle), s = Math.sin(angle), ix = c * quad.width, iy = s * quad.width, jx = -s * quad.height, jy = c * quad.height;
  const x0 = quad.x - (ix + jx) / 2, y0 = quad.y - (iy + jy) / 2, sc = (quad.uw ?? 1) < 0 ? (frame.width - (i + 0.5)) / frame.width : (i + 0.5) / frame.width, tc = (j + 0.5) / frame.height;
  return [x0 + sc * ix + tc * jx - 0.5, y0 + sc * iy + tc * jy - 0.5];
}

test("needles: 16 directions are exact quarter turns / the TRANSVERSE mirror of the three delivered frames, tip toward the velocity", () => {
  const needle = rev01Sprite("hostileNeedle"), strip = decodePng(fileURLToPath(REV01_URLS.hostileNeedle)), tip = paletteColor("needle", 2);
  const texels = (frame: NativeFrame) => {
    const list: { dx: number; dy: number; rgba: number[] }[] = [];
    for (let j = 0; j < frame.height; j++) for (let i = 0; i < frame.width; i++) {
      const o = (j * strip.width + frame.x + i) * 4;
      if (strip.data[o + 3]) list.push({ dx: i - frame.pivotX, dy: j - frame.pivotY, rgba: Array.from(strip.data.subarray(o, o + 4)) });
    }
    return list;
  };
  const turn = ([x, y]: number[], quarter: number) => { for (let q = 0; q < quarter; q++) [x, y] = [-y, x]; return [x, y]; }; // clockwise on screen (+y down)
  const maps = new Set<string>();
  for (let k = 0; k < 16; k++) {
    const angle = k * Math.PI / 8, vx = -Math.sin(angle) * 80, vy = Math.cos(angle) * 80, quad = needleQuad(100.3, 50.7, vx, vy);
    assert.deepEqual([quad.width, quad.height, quad.layer], [13, 13, LAYER.hostileBody], "native 13x13, no enlargement");
    assert.ok(Math.abs(quad.rotation! / (Math.PI / 2) - Math.round(quad.rotation! / (Math.PI / 2))) < 1e-12, "whole quarter turns only");
    const frame = needle.frames.find((candidate) => Math.abs(candidate.u + (quad.uw! < 0 ? candidate.uw : 0) - quad.u!) < 1e-12)!;
    // Independent integer expectation (spec directions): frame k%4 (or needle-22 TRANSVERSE for 67.5), then floor(k/4) quarter turns.
    const step = k % 4, quarter = Math.floor(k / 4), source = needle.frame(["needle-0", "needle-22", "needle-45", "needle-22"][step]);
    assert.equal(frame.name, source.name);
    const drawn = new Map<string, string>(), expected = new Map<string, string>();
    for (const texel of texels(frame)) {
      const [px, py] = texelPixel(quad, frame, texel.dx + frame.pivotX, texel.dy + frame.pivotY);
      assert.ok(Math.abs(px - Math.round(px)) < 1e-9 && Math.abs(py - Math.round(py)) < 1e-9, "lossless: every texel on a pixel");
      drawn.set(`${Math.round(px) - 100},${Math.round(py) - 50}`, texel.rgba.join());
      const mirrored = step === 3 ? [-texel.dy, -texel.dx] : [texel.dx, texel.dy];
      expected.set(turn(mirrored, quarter).join(), texel.rgba.join());
    }
    assert.deepEqual(drawn, expected, `direction ${k}: pivot on (100, 50)`);
    // The tip (needle[2], farthest from the pivot) points along the velocity.
    const tipKey = [...drawn].filter(([, rgba]) => rgba === `${tip >> 16},${(tip >> 8) & 255},${tip & 255},255`).map(([key]) => key.split(",").map(Number)).sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1]))[0];
    const tipAngle = Math.atan2(-tipKey[0], tipKey[1]), error = Math.abs(((tipAngle - angle) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    assert.ok(error < 2 * Math.PI / 180, `direction ${k}: tip ${(tipAngle * 180 / Math.PI).toFixed(1)} vs ${k * 22.5}`);
    maps.add(JSON.stringify([...drawn].sort()));
  }
  assert.equal(maps.size, 16, "sixteen distinct bitmaps");
});

test("hostile shapes are presentation only: every emitter colour has one role, one quad per bullet, gameplay radius 4 for every shape", async () => {
  const source = (dir: string): string[] => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".ts")).map((entry) => readFileSync(`${entry.parentPath}/${entry.name}`, "utf8"));
  const colours = new Set<number>();
  for (const text of source(fileURLToPath(new URL("../src", import.meta.url)))) for (const match of text.matchAll(/\bemit\([^;]*?(0x[0-9a-fA-F]{6})\)/g)) colours.add(parseInt(match[1], 16));
  assert.ok(colours.size >= 10, `${colours.size} emitter colours`);
  assert.deepEqual([...colours].filter((colour) => !(colour in HOSTILE_SHAPES)), [], "every emitter colour classified");
  assert.deepEqual(Object.keys(HOSTILE_SHAPES).map(Number).filter((colour) => !colours.has(colour)), [], "no stale entries");
  assert.equal(hostileShape(0x123456), "hostileBead", "unknown colours read as ordinary fire");
  assert.deepEqual(new Set(Object.values(HOSTILE_SHAPES)), new Set(["hostileBead", "hostileNeedle", "hostileOrb"]));
  const shots = [0xff797f, 0xff747d, 0xf2a5ec, 0xff717e];
  const h = await stage({ setup: (scene) => shots.forEach((colour, i) => spawnBullet(scene.world, w(100 + i * 30), w(150), 0, w(30), 1, colour)) });
  try {
    h.tick();
    const radii: number[] = []; h.world().query(Bullet).eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) if (views.bullet.team[i]) radii.push(views.bullet.radius[i]); });
    assert.deepEqual(radii, shots.map(() => COMBAT.hostileBulletRadius));
    const drawn = h.render().filter((quad) => quad.layer >= LAYER.hostileRim && quad.layer <= LAYER.hostileCore);
    assert.deepEqual(drawn.map((quad) => [quad.texture, quad.ix, quad.jy]), [["rev01-hostileBead", 9, 9], ["rev01-hostileNeedle", 13, 13], ["rev01-hostileOrb", 13, 13], ["rev01-hostileBead", 9, 9]]);
  } finally { h.game.dispose(); }
});

// ---- Beam lanes, pickups ------------------------------------------------------------------------------------

test("beam lanes: six core columns, integer edges and registered pulses inside unchanged 15 / 13 lanes; calm paths stay static", () => {
  const orb = [0, 1, 2, 3].map((index) => paletteColor("orb", index)), warning = rev01Sprite("beamWarning");
  for (const width of [15, 13]) for (const [x, y] of [[300, 50], [300.4, 50.75], [299.9, 49.9]]) {
    const centre = Math.floor(x), top = Math.floor(y), left = centre - (width - 1) / 2;
    // Independent expectation: six columns biased half a pixel right of the odd lane's centre.
    const coreLeft = centre - 2, coreRight = centre + 4;
    const lane = (age: number, firing: boolean, reducedMotion: boolean) => { const frame = nativeFrame(); drawBeamLane(frame, x, y, width, age, firing, reducedMotion); return quads(frame); };
    const firing = lane(0.2, true, false);
    const integerEdges = (draw: Quad[]) => assert.ok(draw.every((quad) => [quad.x0, quad.y0, quad.x0 + quad.ix, quad.y0 + quad.jy].every(Number.isInteger)), "all rectangle edges and marker corners are whole pixels");
    integerEdges(firing);
    assert.equal(Math.min(...firing.map((quad) => quad.x0)), left); assert.equal(Math.max(...firing.map((quad) => quad.x0 + quad.ix)), left + width, "art adds no width");
    assert.ok(firing.every((quad) => quad.y0 >= top && quad.y0 + quad.jy <= 360));
    const band = (rgb: number) => firing.filter((quad) => quad.rgb === rgb && quad.jy > 32).map((quad) => [quad.x0 - left, quad.ix]);
    assert.deepEqual([band(orb[0]), band(orb[1]), band(orb[2]), band(orb[3])], [[[0, width]], [[1, width - 2]], [[3, width - 6]], [[coreLeft - left, 6]]], "separation 1, edge 2, body, six-column core");
    const core = firing.find((quad) => quad.rgb === orb[3] && quad.jy > 32)!;
    assert.deepEqual(Array.from({ length: core.ix }, (_, index) => core.x0 + index), [centre - 2, centre - 1, centre, centre + 1, centre + 2, centre + 3], "exactly six bright core columns");
    assert.equal(core.x0 + core.ix / 2 - (left + width / 2), 0.5, "deterministic right bias");
    const marks = firing.filter((quad) => quad.jy <= 6 && quad.layer === LAYER.beamCore);
    assert.ok(marks.length >= 18 && marks.every((quad) => quad.ix === 1 && quad.rgb === orb[3] && (quad.x0 === coreLeft - 1 || quad.x0 === coreRight)), "pulse columns sit immediately outside actual core bounds");
    const leftMarks = marks.filter((quad) => quad.x0 === coreLeft - 1).map((quad) => [quad.y0, quad.jy]);
    assert.deepEqual(marks.filter((quad) => quad.x0 === coreRight).map((quad) => [quad.y0, quad.jy]), leftMarks, "pulse sides remain row-registered");
    assert.ok(leftMarks.some(([, height]) => height === 6));
    for (let index = 1; index < leftMarks.length; index++) assert.equal(leftMarks[index][0] - leftMarks[index - 1][0], 32, "32-row pulse period");
    assert.notDeepEqual(lane(0.25, true, false), firing, "marks scroll");
    const calmFiring = lane(0.25, true, true), calmWarning = lane(0.25, false, true);
    assert.deepEqual(calmFiring, lane(0.9, true, true), "firing static in reduced motion");
    assert.deepEqual(calmWarning, lane(0.9, false, true), "warning lane, dashes and marker static in reduced motion");
    integerEdges(calmFiring); integerEdges(calmWarning);
    const warn = lane(0.05, false, false), marker = warn.filter((quad) => quad.texture === "rev01-beamWarning");
    integerEdges(warn);
    assert.deepEqual(warn.filter((quad) => !quad.texture && quad.jy > 32).map((quad) => [quad.x0, quad.ix, quad.rgb, quad.alpha]), [[left, width, orb[1], Math.fround(0.3)]]);
    const dashes = warn.filter((quad) => !quad.texture && quad.jy <= 6);
    assert.ok(dashes.length > 50 && dashes.every((quad) => (quad.x0 === left || quad.x0 === left + width - 1) && quad.rgb === orb[2] && quad.alpha === Math.fround(0.75)), "dashed boundary 6 on / 4 off");
    assert.deepEqual([marker.length, marker[0].x0 + 6, marker[0].y0 + 8, marker[0].layer, frameOf("beamWarning", marker[0])], [1, centre, top + 9, LAYER.beamMarker, "marker"]);
    assert.equal(frameOf("beamWarning", lane(0.15, false, false).find((quad) => quad.texture)!), "marker-dim");
    assert.equal(frameOf("beamWarning", lane(0.15, false, true).find((quad) => quad.texture)!), "marker", "reduced motion holds marker");
    assert.equal(warning.playback!.loop, true);
  }
});
test("pickups loop base, bright, peak, bright at 200 ms; reduced motion holds base", async () => {
  for (const reducedMotion of [false, true]) {
    const h = await stage({ reducedMotion, setup: (scene) => { spawnRepair(scene.world, w(100), w(40)); } });
    try {
      const seen: string[] = [];
      for (let tick = 0; tick < 47; tick++) { // one 800 ms loop
        h.tick();
        const quad = h.render().find((candidate) => candidate.texture === "rev01-pickup")!;
        assert.equal(quad.layer, LAYER.pickup); assert.deepEqual([quad.ix, quad.jy], [17, 17]);
        const name = frameOf("pickup", quad)!;
        if (seen.at(-1) !== name) seen.push(name);
      }
      assert.deepEqual(seen, reducedMotion ? ["base"] : ["base", "bright", "peak", "bright"]);
    } finally { h.game.dispose(); }
  }
  assert.deepEqual((REV01_SPEC.sprites.find((sprite) => sprite.id === "pickup")!.animation!).order, ["base", "bright", "peak", "bright"]);
});
