import { clamp, lerp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { spawnEnemy } from "../entities/combat.ts";
import { campaignFrame } from "../services/campaign-assets.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import { drawDefeat, drawGap, forgetDestroyed, locate, type BossDefinition } from "./boss.ts";

/** Stage 2 serpent: a head trailed by three destructible sections (pattern 0-2) that add fans to its rings. */
export const kilnSerpent: BossDefinition = {
  name: "KILN SERPENT", hp: 540, clearBonus: 5000,
  create({ scene, run, sound, hostiles: { emit } }) {
    const enemies = scene.world.query(Pose, Enemy);
    const sections = Array.from({ length: 3 }, () => enemySpec(Kind.KilnSegment).hp);
    return {
      spawn() {
        spawnEnemy(scene.world, run, Kind.KilnHead, 240, -40, { hp: kilnSerpent.hp });
        for (let i = 0; i < sections.length; i++) spawnEnemy(scene.world, run, Kind.KilnSegment, 240, -40, { hp: 55, pattern: i });
      },
      update(dt) {
        const { boss, parts } = locate(enemies, Kind.KilnHead, Kind.KilnSegment);
        let bossY = -40, bossAge = 0;
        if (boss) {
          const { p, e, row } = boss, time = Math.max(0, e.age[row] - 2.7);
          forgetDestroyed(sections, parts);
          p.x[row] = 275 + Math.sin(time * 0.5) * 90;
          p.y[row] = Math.min(65, p.y[row] + dt * 40);
          bossY = p.y[row]; bossAge = time; run.bossHealth = Math.max(0, e.hp[row]);
          const phase = e.hp[row] < kilnSerpent.hp / 2 ? 2 : 1;
          if (phase > run.bossPhase) { run.bossPhase = phase; run.banner = `PHASE ${phase} / CORE OVERHEAT`; run.bannerTime = 1.4; sound.boss(); }
          const cycle = Math.floor(e.fireIndex[row] / 8), index = e.fireIndex[row] % 8;
          const times = [0.8, 2, 3.2, 4.8, 6, 8.2, 9.3, 10.4];
          const due = cycle * 12 + times[index];
          if (time > due - 0.7 && !e.cue[row]) {
            e.cue[row] = index < 3 ? 1 : 2;
            e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]);
            if (index === 5) e.originX[row] = clamp(p.x[row], 80, 400);
          }
          if (time >= due) {
            if (index < 3) emit(p.x[row], p.y[row] + 18, fan(Math.PI / 2 + (index % 2 ? -0.3 : 0.3), phase === 1 ? 7 : 9, Math.PI * 0.47, 60), 0xffaa76);
            else if (index < 5) {
              emit(p.x[row], p.y[row] + 12, ring(phase === 1 ? 10 : 14, index === 4 ? Math.PI / 14 : 0, phase === 1 ? 46 : 50), 0xffaa76);
              for (let i = 0; i < 3; i++) if (sections[i] > 0) emit(p.x[row] - (i + 1) * 34, p.y[row] + 12, fan(Math.PI / 2, 2, 0.7, 42), 0xffdf87);
            } else for (const x of curtainPositions(e.originX[row], 72, index % 2 === 0 ? 12 : 0)) emit(x, 38, [{ vx: 0, vy: 50 }], 0xffaa76);
            e.fireIndex[row]++; e.cue[row] = 0;
          }
        }
        enemies.eachChunk(({ views, count }) => { const p = views.pose, e = views.enemy; for (let row = 0; row < count; row++) if (e.active[row] && e.kind[row] === Kind.KilnSegment) {
          const i = e.pattern[row];
          p.x[row] = 275 + Math.sin((bossAge - (i + 1) * 0.3) * 0.5) * 90 - (i + 1) * 34; p.y[row] = bossY + 6 + Math.sin(bossAge * 1.2 - i * 0.8) * 12;
          sections[i] = Math.max(0, e.hp[row]);
        } });
      },
      render(frame, alpha) {
        drawDefeat(frame, run, campaignFrame("kilnHead"), -Math.PI / 2);
        const joints = new Map<number, { x: number; y: number }>();
        enemies.eachChunk(({ views, count }) => { const p = views.pose, e = views.enemy; for (let row = 0; row < count; row++) if (e.active[row] && (e.kind[row] === Kind.KilnHead || e.kind[row] === Kind.KilnSegment)) {
          joints.set(e.kind[row] === Kind.KilnHead ? -1 : e.pattern[row], { x: lerp(p.px[row], p.x[row], alpha), y: lerp(p.py[row], p.y[row], alpha) });
        } });
        for (let index = 0; index < 3; index++) {
          const current = joints.get(index), previous = joints.get(index - 1);
          if (!current || !previous) continue;
          const dx = previous.x - current.x, dy = previous.y - current.y;
          const link = { x: (current.x + previous.x) / 2, y: (current.y + previous.y) / 2, width: Math.hypot(dx, dy), rotation: Math.atan2(dy, dx), layer: 1 };
          frame.sprite({ ...link, height: 4, color: 0x644b40 });
          frame.sprite({ ...link, height: 1, color: 0xc6a47b });
        }
        const { boss } = locate(enemies, Kind.KilnHead, Kind.KilnSegment);
        if (boss && boss.e.cue[boss.row] === 2 && boss.e.fireIndex[boss.row] % 8 >= 5) drawGap(frame, boss.e.originX[boss.row], 72, 0x77e5c2, 0xb5efd0);
      },
    };
  },
};
