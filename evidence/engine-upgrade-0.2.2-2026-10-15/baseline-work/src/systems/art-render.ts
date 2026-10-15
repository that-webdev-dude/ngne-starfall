import { lerp, type Frame, type SceneSetup } from "@ngne/core";
import { Flight } from "../components/flight.ts";
import { VIEW } from "../config/preview.ts";
import { art, animationIndex, type ArtFrame } from "../services/art-assets.ts";
import { text } from "../ui/bitmap-text.ts";
import type { PreviewState } from "./flight.ts";

function sprite(frame: Frame, artwork: ArtFrame, x: number, y: number, layer = 2, alpha = 1): void {
  frame.sprite({ x: x + artwork.width / 2 - artwork.pivotX, y: y + artwork.height / 2 - artwork.pivotY,
    width: artwork.width, height: artwork.height, texture: artwork.texture,
    u: artwork.u, v: artwork.v, uw: artwork.uw, vh: artwork.vh, layer, alpha });
}

export function installArtRender(scene: SceneSetup, state: PreviewState): void {
  const players = scene.world.query(Flight);
  const random = scene.random("preview-stars");
  const stars = Array.from({ length: 32 }, () => ({ x: random.range(36, VIEW.width - 36), y: random.range(0, VIEW.height), speed: random.range(3, 17) }));
  scene.render((frame, alpha) => {
    sprite(frame, art.background, VIEW.width / 2, VIEW.height / 2, -10);
    const seconds = state.reducedMotion ? 0 : state.seconds;
    for (const star of stars) frame.rect(star.x, (star.y + seconds * star.speed) % VIEW.height, 1, star.speed > 12 ? 2 : 1, 0x9cbcd4, 0.38, -7);
    const enemyX = 242 + Math.sin(seconds * 0.5) * 32;
    sprite(frame, art.enemy, enemyX, 68 + Math.sin(seconds * 0.9) * 3, 2);
    sprite(frame, art.enemy, 325 + Math.sin(seconds * 0.6) * 12, 104 + Math.sin(seconds) * 4, 2);
    // Readability samples, deliberately uncoupled from gameplay/collision.
    for (let i = 0; i < 4; i++) {
      const y = 110 + (seconds * 28 + i * 24) % 104;
      frame.rect(326 + (i % 2) * 10, y, 3, 6, 0xff797d, 1, 8);
      frame.rect(326 + (i % 2) * 10, y - 1, 1, 2, 0xffe4ba, 1, 9);
    }
    players.eachChunk((chunk) => {
      const p = chunk.views.flight;
      for (let row = 0; row < chunk.count; row++) {
        const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha);
        const bank = lerp(p.previousBank[row], p.bank[row], alpha);
        const pose = bank < -0.32 ? "left" : bank > 0.32 ? "right" : "neutral";
        const exhaust = art.exhaust[state.reducedMotion ? 0 : animationIndex(state.seconds, art.exhaustDurations, true)];
        for (const [socketX, socketY] of art.exhaustSockets[pose]) sprite(frame, exhaust, x + socketX, y + socketY, 3);
        sprite(frame, art.player[pose], x, y, 4);
        for (let beam = 0; beam < 2; beam++) {
          const beamY = y - 36 - ((seconds * 125 + beam * 48) % 94);
          if (beamY > 40) {
            frame.rect(x - 8, beamY, 2, 7, 0xffd298, 0.95, 7);
            frame.rect(x + 8, beamY, 2, 7, 0xffd298, 0.95, 7);
          }
        }
      }
    });
    const explosionIndex = animationIndex(state.effectAge, art.explosionDurations);
    if (explosionIndex < art.explosions.length) {
      sprite(frame, art.explosions[state.reducedMotion ? 2 : explosionIndex], state.effectX, state.effectY, 12);
      if (!state.reducedMotion) for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI * 2 / 12, distance = 8 + state.effectAge * 100;
        frame.rect(state.effectX + Math.cos(angle) * distance, state.effectY + Math.sin(angle) * distance, 2, 2, i % 2 ? 0xffca7c : 0xff7359, 1 - state.effectAge * 2, 13);
      }
    }
    if (state.flash > 0) frame.rect(240, 135, 480, 270, 0xffccaa, state.flash * 0.65, 18, true);
    frame.rect(240, 15, 480, 30, 0x07111f, 0.86, 40, true);
    frame.rect(240, 254, 480, 32, 0x07111f, 0.92, 40, true);
    frame.rect(240, 30, 452, 1, 0x31546b, 0.8, 41, true);
    text(frame, "STARFALL", 14, 9, 0xc7edf0, 2);
    text(frame, "01 / ORBITAL BREAKWATER", 199, 9, 0xa8b6c7);
    text(frame, "ART PREVIEW", 199, 19, 0x708da4);
    text(frame, state.demo ? "DEMO" : "MANUAL", 426, 9, 0xffc382);
    text(frame, `BANK ${state.bank < -0.32 ? "LEFT" : state.bank > 0.32 ? "RIGHT" : "LEVEL"}`, 14, 242, 0xa4d5df);
    text(frame, `SPEED ${Math.round(Math.hypot(state.vx, state.vy)).toString().padStart(3, "0")}`, 99, 242, 0xa4d5df);
    text(frame, "WASD/ARROWS MOVE   SPACE BURST   T DEMO   F FULLSCREEN", 14, 255, 0x97a5b7);
    text(frame, "FLIGHT / BANKING / EFFECTS STUDY", 277, 242, 0x647f97);
  });
}
