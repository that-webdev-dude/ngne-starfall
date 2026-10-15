import { lerp } from "@ngne/core";
import { Beam, Bullet, Enemy, Particle, Pickup, Pose } from "../components/combat.ts";
import { Flight } from "../components/flight.ts";
import { BOSS } from "../config/boss-geometry.ts";
import { animationIndex, art } from "../services/art-assets.ts";
import { combatArt } from "../services/combat-assets.ts";
import { text } from "../ui/bitmap-text.ts";
import { drawSprite } from "../ui/sprite.ts";
import type { CombatContext } from "./combat-context.ts";
import { campaignFrame, engineSockets } from "../services/campaign-assets.ts";
import { isBoss } from "../world/enemy-kinds.ts";

export function installCombatRender({ scene, run, session, stage }: CombatContext): void {
  const players = scene.world.query(Flight), enemies = scene.world.query(Pose, Enemy), bullets = scene.world.query(Pose, Bullet), particles = scene.world.query(Pose, Particle), pickups = scene.world.query(Pose, Pickup);
  const rng = scene.random("background-stars"), stars = Array.from({ length: 36 }, () => ({ x: rng.range(0, 480), y: rng.range(0, 270), speed: rng.range(5, 23) }));
  scene.render((frame, alpha) => {
    const background = stage.index === 0 ? art.background : campaignFrame(stage.index === 1 ? "furnaceBackground" : "citadelBackground");
    const bossArtwork = () => stage.index === 0 ? combatArt.gatebreaker : campaignFrame(stage.index === 1 ? "kilnHead" : "starfallEngine");
    drawSprite(frame, background, 240, 135, -10);
    frame.rect(240, 135, 480, 270, 0x050d19, 0.17, -9, true);
    for (const star of stars) frame.rect(star.x, (star.y + (session.settings.reducedMotion ? 0 : run.effectClock * star.speed)) % 270, 1, star.speed > 16 ? 2 : 1, 0x9ccee1, 0.35, -7);
    if (run.phase === "clear" && run.finishTimer < 1.45) drawSprite(frame, bossArtwork(), run.bossDeathX, run.bossDeathY, 2, 1, 0x9c706b, stage.index === 1 ? -Math.PI / 2 : 0);
    if (stage.index === 1) {
      const joints = new Map<number, { x: number; y: number }>();
      enemies.eachChunk(({ views, count }) => { const p = views.pose, e = views.enemy; for (let row = 0; row < count; row++) if (e.active[row] && (e.kind[row] === 8 || e.kind[row] === 9)) {
        joints.set(e.kind[row] === 8 ? -1 : e.pattern[row], { x: lerp(p.px[row], p.x[row], alpha), y: lerp(p.py[row], p.y[row], alpha) });
      } });
      for (let index = 0; index < 3; index++) {
        const current = joints.get(index), previous = joints.get(index - 1);
        if (!current || !previous) continue;
        const dx = previous.x - current.x, dy = previous.y - current.y;
        const link = { x: (current.x + previous.x) / 2, y: (current.y + previous.y) / 2, width: Math.hypot(dx, dy), rotation: Math.atan2(dy, dx), layer: 1 };
        frame.sprite({ ...link, height: 4, color: 0x644b40 });
        frame.sprite({ ...link, height: 1, color: 0xc6a47b });
      }
    }
    enemies.eachChunk((chunk) => {
      const p = chunk.views.pose, e = chunk.views.enemy;
      for (let row = 0; row < chunk.count; row++) {
        if (!e.active[row] || e.kind[row] === 4 || e.kind[row] === 11) continue;
        const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha), kind = e.kind[row];
        if (kind === 7) {
          frame.sprite({ x, y, width: 10, height: 10, rotation: Math.PI / 4, color: 0x624a39, layer: 3 });
          frame.rect(x, y, 6, 6, e.cue[row] ? 0xff9163 : 0xe3c471, 1, 4);
          frame.rect(x, y, 2, 2, 0xfff0b5, 1, 5);
          if (e.cue[row]) for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4, radius = 10 + Math.sin(run.effectClock * 14) * 2; frame.rect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 1, 1, 0xffaa73, 0.7, 3); }
          continue;
        }
        const artwork = kind === 0 ? art.enemy : kind === 1 ? combatArt.gunship : kind === 2 ? combatArt.dart : kind === 3 ? combatArt.gatebreaker : campaignFrame(kind === 5 ? "minelayer" : kind === 6 ? "warden" : kind === 8 ? "kilnHead" : kind === 9 ? "kilnSegment" : "starfallEngine");
        const rotated = kind === 8 || kind === 9;
        drawSprite(frame, artwork, x, y, 2, 1, e.flash[row] ? 0xffb7b0 : 0xffffff, rotated ? -Math.PI / 2 : 0);
        if (e.flash[row]) { const height = rotated ? artwork.width : artwork.height; frame.rect(x, y - height / 2, 7, 1, 0xfff6da, 1, 4); frame.rect(x, y - height / 2, 1, 6, 0xfff6da, 1, 4); }
        if (e.cue[row]) {
          const pulse = 2 + Math.sin(run.effectClock * 36) * 0.7;
          frame.rect(x, y + (isBoss(kind) ? 8 : 12), pulse * 2, pulse * 2, 0xffbb7c, 0.8, 5);
          if (kind === 3 && e.cue[row] === 2) {
            const gap = Math.floor(e.fireIndex[row] / 8) % 2 ? 360 : 120;
            frame.rect(gap, 151, 64, 230, 0x67e3be, 0.07, -1, true);
            text(frame, "GAP", gap - 6, 36, 0xa4e8bd);
          }
          if ((kind === 8 && e.fireIndex[row] % 8 >= 5 || kind === 10 && e.fireIndex[row] % 8 >= 3 && e.fireIndex[row] % 8 < 6) && e.cue[row] === 2) {
            const gap = e.originX[row], width = kind === 8 ? 72 : 88 - run.bossPhase * 8;
            frame.rect(gap, 151, width, 230, 0x77e5c2, 0.07, -1, true); text(frame, "GAP", gap - 6, 36, 0xb5efd0);
          }
        }
        if (kind === 3) {
          for (const [hp, socket] of [[run.bossLeft, BOSS.leftTurret], [run.bossRight, BOSS.rightTurret]] as const) if (hp <= 0) {
            frame.rect(x + socket[0], y + socket[1] + 8, 20, 25, 0x0a1320, 0.84, 3);
            frame.rect(x + socket[0], y + socket[1], 9, 3, 0xa64738, 1, 4);
          }
        }
        if (kind === 10) {
          const sockets = engineSockets();
          for (const [hp, socket] of [[run.bossLeft, sockets.leftEmitter], [run.bossRight, sockets.rightEmitter]] as const) if (hp <= 0) {
            frame.rect(x + socket[0], y + socket[1], 20, 20, 0x0a1020, 0.88, 3); frame.rect(x + socket[0], y + socket[1], 8, 3, 0x954258, 1, 4);
          }
        }
      }
    });
    scene.world.query(Pose, Beam).eachChunk(({ views, count }) => { const p = views.pose, beam = views.beam; for (let row = 0; row < count; row++) if (beam.active[row]) {
      const firing = beam.age[row] >= beam.charge[row], x = p.x[row];
      frame.rect(x, 154, firing ? beam.width[row] + 4 : beam.width[row], 232, firing ? 0xdc80ff : 0xfc798f, firing ? 0.65 : 0.12, firing ? 12 : -1);
      frame.rect(x, 154, firing ? Math.max(2, beam.width[row] - 5) : 1, 232, firing ? 0xffedff : 0xffb2bb, firing ? 0.95 : 0.7, 13);
      if (!firing) { text(frame, "!", x - 2, 48, 0xffb9c4); frame.rect(x, 39, 9, 3, 0xffb9c4, 1, 13); }
    } });
    pickups.eachChunk((chunk) => { const p = chunk.views.pose, item = chunk.views.pickup; for (let row = 0; row < chunk.count; row++) if (item.active[row]) {
      const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha);
      frame.rect(x, y, 11, 11, 0x174d47, 1, 5); frame.rect(x, y, 9, 9, 0x56dba4, 0.3 + Math.sin(run.effectClock * 8) * 0.1, 6);
      frame.rect(x, y, 7, 2, 0xb3ffd5, 1, 7); frame.rect(x, y, 2, 7, 0xb3ffd5, 1, 7);
    } });
    if (run.phase !== "dead") players.eachChunk((chunk) => {
      const p = chunk.views.flight;
      for (let row = 0; row < chunk.count; row++) {
        const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha), bank = lerp(p.previousBank[row], p.bank[row], alpha);
        const pose = bank < -0.32 ? "left" : bank > 0.32 ? "right" : "neutral";
        const opacity = run.invulnerable > 0 && Math.floor(run.effectClock * 18) % 2 ? 0.35 : 1;
        const exhaust = art.exhaust[session.settings.reducedMotion ? 0 : animationIndex(run.effectClock, art.exhaustDurations, true)];
        for (const [sx, sy] of art.exhaustSockets[pose]) drawSprite(frame, exhaust, x + sx, y + sy, 3, opacity);
        drawSprite(frame, art.player[pose], x, y, 4, opacity);
        frame.rect(x, y, 5, 5, 0x12374d, 0.9, 11); frame.rect(x, y, 3, 3, 0xb9ffff, 1, 12);
      }
    });
    particles.eachChunk((chunk) => { const p = chunk.views.pose, fx = chunk.views.particle; for (let row = 0; row < chunk.count; row++) {
      const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha);
      if (fx.kind[row] === 1) { const index = animationIndex(fx.age[row], art.explosionDurations); if (index < art.explosions.length) drawSprite(frame, art.explosions[session.settings.reducedMotion ? 2 : index], x, y, 6); }
      else frame.rect(x, y, fx.size[row], fx.size[row], fx.color[row], Math.max(0, 1 - fx.age[row] / fx.life[row]), 7);
    } });
    // Bullets always sit above effects and hulls, preserving dodge readability.
    bullets.eachChunk((chunk) => { const p = chunk.views.pose, b = chunk.views.bullet; for (let row = 0; row < chunk.count; row++) if (b.active[row]) {
      const x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha), hostile = b.team[row] === 1;
      if (hostile) { frame.rect(x, y, 7, 7, 0x351a39, 1, 14); frame.rect(x, y, 5, 5, b.color[row], 1, 15); frame.rect(x, y - 1, 2, 2, 0xffeddf, 1, 16); }
      else frame.sprite({ x, y, width: 2, height: 9, color: 0xffe0a4, rotation: Math.atan2(b.vy[row], b.vx[row]) + Math.PI / 2, layer: 13 });
    } });
    if (run.novaRing < 0.65 && !session.settings.reducedMotion) for (let i = 0; i < 56; i++) {
      const angle = i * Math.PI * 2 / 56, radius = run.novaRing * 470;
      frame.rect(run.x + Math.cos(angle) * radius, run.y + Math.sin(angle) * radius, 4, 4, 0xaffff1, 1 - run.novaRing / 0.65, 17);
    }
    if (run.flash > 0 && !session.settings.reducedMotion) frame.rect(240, 135, 480, 270, 0xffcfab, run.flash, 19, true);
    for (const pop of run.scorePops) text(frame, pop.text, pop.x, pop.y, 0xffe3a8);
    frame.rect(240, 12, 480, 24, 0x07111f, 0.92, 40, true);
    frame.rect(240, 261, 480, 18, 0x07111f, 0.92, 40, true);
    text(frame, "STARFALL", 10, 6, 0xc2e7e9); text(frame, String(run.score).padStart(7, "0"), 68, 6, 0xffe2b7);
    text(frame, `CHAIN ${run.combo}X`, 119, 6, run.combo > 1 ? 0xffbd80 : 0x6f8fa6);
    for (let i = 0; i < 5; i++) frame.rect(303 + i * 10, 8, 7, 5, i < run.hull ? 0x96e8e7 : 0x273b51, 1, 45, true);
    text(frame, "HULL", 273, 6, 0x87a8bc);
    text(frame, run.nova >= 0.999 ? "NOVA READY" : `NOVA ${Math.ceil((1 - run.nova) * 15)}S`, 373, 6, run.nova >= 0.999 ? 0xaaffc4 : 0x849baf);
    frame.rect(409, 16, 70, 2, 0x223749, 1, 45, true); frame.rect(374 + 35 * run.nova, 16, 70 * run.nova, 2, 0x92e8d4, 1, 46, true);
    text(frame, `0${stage.index + 1} / ${stage.name}`, 10, 257, 0x9cb4c5);
    text(frame, "SPACE/MOUSE FIRE   B NOVA   ESC PAUSE", 280, 257, 0x7d99ae);
    text(frame, `${Math.floor(run.seconds / 60)}:${String(Math.floor(run.seconds % 60)).padStart(2, "0")}`, 445, 257, 0x9cb4c5);
    if (run.phase === "boss") {
      text(frame, stage.bossName, 240 - stage.bossName.length * 2, 15, 0xf1c9c2);
      frame.rect(240, 26, 180, 4, 0x3a2a3d, 1, 44, true);
      const fraction = run.bossHealth / run.bossMax;
      frame.rect(150 + 90 * fraction, 26, 180 * fraction, 4, 0xfa797b, 1, 45, true);
    }
    if (run.bannerTime > 0) {
      const width = run.banner.length * 4;
      frame.rect(240, 126, width + 22, 21, 0x071320, 0.82, 44, true);
      text(frame, run.banner, 240 - width / 2, 124, run.phase === "waves" && run.seconds < 5 ? 0xc8e9e6 : 0xffc6a2);
    }
  });
}
