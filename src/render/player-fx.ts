import { lerp, type Frame, type Sprite } from "@ngne/core";
import { Beam, Bullet, Particle, Pickup, Pose } from "../components/combat.ts";
import { Flight } from "../components/flight.ts";
import { LAYER } from "../config/layers.ts";
import { VIEW, fromLegacy as w } from "../config/view.ts";
import { NOVA_ATLAS_ID, novaAtlasPlan } from "../services/player-fx-assets.ts";
import { rev01Sprite, type SparseAtlasPlan } from "../services/rev01-assets.ts";
import { playerFxState } from "../systems/player-fx-state.ts";
import { drawNative, nativeQuad } from "../ui/sprite.ts";
import type { RenderPassFactory } from "./pass.ts";
import {
  BEAM_SCROLL_PX_PER_SECOND, CHARGE_READY, EFFECT, EFFECT_SPRITES, beamCoreWidth, hostileShape, needleDirection, novaFrameAt,
  paletteColor, playbackFrame, playbackIndex, poseName, poseSockets, resolvePlayerCues, type EffectKind, type NovaDraw, type PlayerCues,
} from "./player-fx-model.ts";

const ART = {
  player: rev01Sprite("player"), playerFlash: rev01Sprite("playerFlash"), playerCalm: rev01Sprite("playerCalm"), exhaust: rev01Sprite("exhaust"),
  plasmaReady: rev01Sprite("plasmaReady"), plasmaReadyCalm: rev01Sprite("plasmaReadyCalm"), playerDeath: rev01Sprite("playerDeath"),
  primaryLance: rev01Sprite("primaryLance"), hostileBead: rev01Sprite("hostileBead"), hostileNeedle: rev01Sprite("hostileNeedle"), hostileOrb: rev01Sprite("hostileOrb"),
  novaCalm: rev01Sprite("novaCalm"), mine: rev01Sprite("mine"), pickup: rev01Sprite("pickup"), beamWarning: rev01Sprite("beamWarning"),
};
const EFFECT_ART = Object.fromEntries(Object.entries(EFFECT_SPRITES).map(([kind, id]) => [kind, rev01Sprite(id)]));
/** Reduced motion holds one flame: medium, the loop's most frequent frame. */
const EXHAUST_CALM = ART.exhaust.frame("medium");
/** spec playerDeath.coreMarker: the code-drawn core stays on frames 0..lastFrame. */
const DEATH_CORE_LAST = ART.playerDeath.frame((ART.playerDeath.spec.coreMarker as { lastFrame: string }).lastFrame).index;
const ORB = [0, 1, 2, 3].map((index) => paletteColor("orb", index)), LOW_HULL_COLOR = paletteColor("needle", 1);
/** Legacy core marker colours; size from codeDrawn.playerCore (outer 7, inner 3). */
const CORE_RIM = 0x12374d, CORE_FILL = 0xb9ffff;

/** Core marker centred on the pivot pixel (px, py): always opaque, above bullets. */
function drawCore(frame: Frame, px: number, py: number): void {
  frame.rect(px + 0.5, py + 0.5, 7, 7, CORE_RIM, 0.9, LAYER.coreRim);
  frame.rect(px + 0.5, py + 0.5, 3, 3, CORE_FILL, 1, LAYER.core);
}

export interface PlayerView { x: number; y: number; level: number; cues: PlayerCues; clock: number; reducedMotion: boolean }
/**
 * Player stack at its pivot pixel: exhaust under the hull at the pose's exhaust sockets, hull or flash, calm outline,
 * low-hull emissive on the pod rears, charge-ready marker at the plasma muzzle, core marker on top.
 */
export function drawPlayer(frame: Frame, view: PlayerView): void {
  const px = Math.floor(view.x), py = Math.floor(view.y), name = poseName(view.level), sockets = poseSockets(view.level), { cues } = view;
  const flame = view.reducedMotion ? EXHAUST_CALM : playbackFrame(ART.exhaust, view.clock)!;
  for (const [dx, dy] of sockets.exhaust) drawNative(frame, flame, px + dx, py + dy, { layer: LAYER.playerExhaust, alpha: cues.alpha });
  if (cues.hull === "playerFlash") drawNative(frame, ART.playerFlash.frame(name), px, py, { layer: LAYER.playerFlash });
  else drawNative(frame, ART.player.frame(name), px, py, { layer: LAYER.player, alpha: cues.alpha });
  if (cues.calm) drawNative(frame, ART.playerCalm.frame(`${cues.calm}-${name}`), px, py, { layer: LAYER.playerCalm });
  if (cues.lowHull) {
    // codeDrawn.lowHullCue: 2x2 on each pod rear, canvas rows 22-23, beside the nozzle column (mirror-symmetric at neutral).
    const [[left], [right]] = sockets.exhaust;
    frame.rect(px + left, py + 7, 2, 2, LOW_HULL_COLOR, 1, LAYER.playerFlash);
    frame.rect(px + right + 1, py + 7, 2, 2, LOW_HULL_COLOR, 1, LAYER.playerFlash);
  }
  if (cues.chargeReady) {
    const [mx, my] = sockets.plasma, art = cues.chargeReady === "plasmaReady" ? playbackFrame(ART.plasmaReady, view.clock)! : ART.plasmaReadyCalm.frames[0];
    drawNative(frame, art, px + mx, py + my, { layer: LAYER.playerMuzzleFx });
  }
  drawCore(frame, px, py);
}

/**
 * Mine body. T2 owns this implementation; the enemy pass (T3) calls it for Kind.Mine with this fixed signature.
 * `frame` is the actual native Frame; `legacy` (the `pixelSnapped` wrapper) and `clock` are unused since the
 * armed frame is held (spec mine.animation: no blink, so reduced motion needs no substitute).
 */
export function drawMine(frame: Frame, _legacy: Frame, x: number, y: number, cue: boolean, _clock: number): void {
  drawNative(frame, ART.mine.frame(cue ? "armed" : "idle"), x, y, { layer: LAYER.mine });
}

/** Hostile needle toward its velocity: a delivered frame, mirrored and/or turned by whole quarter turns about its centre pivot. */
export function needleQuad(x: number, y: number, vx: number, vy: number): Sprite {
  const direction = needleDirection(vx, vy), quad = nativeQuad(ART.hostileNeedle.frame(direction.frame), x, y, { layer: LAYER.hostileBody, flipX: direction.flipX });
  return { ...quad, rotation: direction.quarterTurns * Math.PI / 2 };
}

/** One nova step at its fixed origin: the frame's occupied atlas tiles (off-screen tiles skipped) or a novaCalm frame. */
export function drawNova(frame: Frame, draw: NovaDraw, x: number, y: number, plan: SparseAtlasPlan | undefined): void {
  const ox = Math.floor(x), oy = Math.floor(y);
  if ("calm" in draw) { drawNative(frame, draw.calm, ox, oy, { layer: LAYER.nova }); return; }
  if (!plan) return;
  const margin = 16; // camera shake is at most w(6) = 8 px
  for (const index of plan.frameTiles[draw.atlasFrame]) {
    const tile = plan.tiles[index], left = ox + tile.offsetX, top = oy + tile.offsetY;
    if (left + tile.width < -margin || top + tile.height < -margin || left > VIEW.width + margin || top > VIEW.height + margin) continue;
    frame.sprite({ x: left + tile.width / 2, y: top + tile.height / 2, width: tile.width, height: tile.height, texture: NOVA_ATLAS_ID,
      u: tile.dx / plan.width, v: tile.dy / plan.height, uw: tile.width / plan.width, vh: tile.height / plan.height, layer: LAYER.nova });
  }
}

/** codeDrawn.beamLane: whole-pixel columns centred on the pixel containing x, from the lane top to the bottom of the view. */
export function drawBeamLane(frame: Frame, x: number, y: number, width: number, age: number, firing: boolean, reducedMotion: boolean): void {
  const centre = Math.floor(x), left = centre - Math.floor((width - 1) / 2), top = Math.floor(y), bottom = VIEW.height, height = bottom - top;
  const column = (from: number, span: number, color: number, alpha: number, layer: number) => { if (span > 0) frame.rect(from + span / 2, top + height / 2, span, height, color, alpha, layer); };
  const runs = (columnX: number, period: number, on: number, color: number, alpha: number, layer: number) => {
    const scroll = reducedMotion ? 0 : (age * BEAM_SCROLL_PX_PER_SECOND) % period;
    for (let start = top - period + Math.floor(scroll); start < bottom; start += period) {
      const from = Math.max(top, start), to = Math.min(bottom, start + on);
      if (to > from) frame.rect(columnX + 0.5, (from + to) / 2, 1, to - from, color, alpha, layer);
    }
  };
  if (firing) {
    const core = beamCoreWidth(width), coreLeft = left + Math.ceil((width - core) / 2), coreRight = coreLeft + core;
    column(left, width, ORB[0], 1, LAYER.beamLane); // separation, 1 px each edge
    column(left + 1, width - 2, ORB[1], 1, LAYER.beamLane); // 2 px edge
    column(left + 3, width - 6, ORB[2], 1, LAYER.beamLane); // body
    column(coreLeft, core, ORB[3], 1, LAYER.beamCore);
    for (const mark of [coreLeft - 1, coreRight]) runs(mark, 32, 6, ORB[3], 1, LAYER.beamCore);
    return;
  }
  column(left, width, ORB[1], 0.3, LAYER.beamLane);
  for (const edge of [left, left + width - 1]) runs(edge, 10, 6, ORB[2], 0.75, LAYER.beamCore);
  const marker = reducedMotion ? ART.beamWarning.frame("marker") : playbackFrame(ART.beamWarning, age)!;
  drawNative(frame, marker, centre, top + 9, { layer: LAYER.beamMarker });
}

/** Beam lanes, pickups, the player, effects, bullets, nova ring and full-screen flash (native rev01 art). */
export const createPlayerFxRender: RenderPassFactory = ({ scene, run, session }) => {
  const players = scene.world.query(Flight), bullets = scene.world.query(Pose, Bullet), particles = scene.world.query(Pose, Particle), pickups = scene.world.query(Pose, Pickup), beams = scene.world.query(Pose, Beam);
  const fx = playerFxState(run);
  return (frame, alpha, legacy) => {
    const reducedMotion = session.settings.reducedMotion, clock = run.effectClock;
    beams.eachChunk(({ views, count }) => { const p = views.pose, beam = views.beam; for (let row = 0; row < count; row++) if (beam.active[row]) {
      drawBeamLane(frame, p.x[row], p.y[row], beam.width[row], beam.age[row], beam.age[row] >= beam.charge[row], reducedMotion);
    } });
    pickups.eachChunk((chunk) => { const p = chunk.views.pose, item = chunk.views.pickup; for (let row = 0; row < chunk.count; row++) if (item.active[row]) {
      // Pulse brightens the field only (base, bright, peak, bright); reduced motion holds base.
      const art = reducedMotion ? ART.pickup.frame("base") : playbackFrame(ART.pickup, clock)!;
      drawNative(frame, art, lerp(p.px[row], p.x[row], alpha), lerp(p.py[row], p.y[row], alpha), { layer: LAYER.pickup });
    } });
    if (run.phase !== "dead") players.eachChunk((chunk) => {
      const p = chunk.views.flight;
      for (let row = 0; row < chunk.count; row++) {
        const cues = resolvePlayerCues({ reducedMotion, clock, sinceDamage: clock - fx.damageClock, invulnerable: run.invulnerable, hull: run.hull, chargeReady: CHARGE_READY });
        drawPlayer(frame, { x: lerp(p.px[row], p.x[row], alpha), y: lerp(p.py[row], p.y[row], alpha), level: fx.pose.level, cues, clock, reducedMotion });
      }
    });
    else if (fx.death) {
      // The ship is gone: playerDeath plays once where it was, the core marker on its first frames.
      const index = playbackIndex(ART.playerDeath.playback!.durationsMs, clock - fx.death.clock + fx.death.offset, false);
      if (index >= 0) {
        drawNative(frame, ART.playerDeath.playback!.frames[index], fx.death.x, fx.death.y, { layer: LAYER.explosion });
        if (index <= DEATH_CORE_LAST) drawCore(frame, Math.floor(fx.death.x), Math.floor(fx.death.y));
      }
    }
    particles.eachChunk((chunk) => { const p = chunk.views.pose, particle = chunk.views.particle; for (let row = 0; row < chunk.count; row++) {
      const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha), kind = particle.kind[row];
      if (kind === 0) { legacy.rect(x, y, particle.size[row], particle.size[row], particle.color[row], Math.max(0, 1 - particle.age[row] / particle.life[row]), LAYER.particle); continue; }
      const sprite = EFFECT_ART[kind], art = sprite && playbackFrame(sprite, particle.age[row]);
      if (art) drawNative(frame, art, x, y, { layer: (kind as EffectKind) === EFFECT.plasmaImpact ? LAYER.plasmaImpact : LAYER.explosion });
    } });
    bullets.eachChunk((chunk) => { const p = chunk.views.pose, b = chunk.views.bullet; for (let row = 0; row < chunk.count; row++) if (b.active[row]) {
      const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha);
      if (b.team[row] !== 1) { drawNative(frame, ART.primaryLance.frames[0], x, y, { layer: LAYER.playerBullet }); continue; }
      const shape = hostileShape(b.color[row]);
      if (shape === "hostileNeedle") frame.sprite(needleQuad(x, y, b.vx[row], b.vy[row]));
      else drawNative(frame, ART[shape].frames[0], x, y, { layer: LAYER.hostileBody });
    } });
    const nova = fx.nova && novaFrameAt(run.novaRing, reducedMotion);
    if (fx.nova && nova) drawNova(frame, nova, fx.nova.x, fx.nova.y, novaAtlasPlan());
    if (run.flash > 0 && !reducedMotion) legacy.rect(w(240), w(135), w(480), w(270), 0xffcfab, run.flash, LAYER.flash, true);
  };
};
