import { lerp } from "@ngne/core";
import { Enemy, Pose } from "../components/combat.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { LAYER } from "../config/layers.ts";
import { fromLegacy as w } from "../config/view.ts";
import { spawnEnemy } from "../entities/combat.ts";
import { rev01Sprite, type NativeFrame } from "../services/rev01-assets.ts";
import { drawNative } from "../ui/sprite.ts";
import { curtainPositions, fan, ring } from "../world/patterns.ts";
import { drawDefeat, drawGap, forgetDestroyed, hitColor, locate, patternDue, sinceLastPattern, type BossDefinition, type BossSchedule } from "./boss.ts";
import { addPoint, placeSocket, specSocket, specSocketList, splitVolley, type PartPose, type Point } from "./sockets.ts";

const HULL = rev01Sprite("gatebreaker"), TURRET = rev01Sprite("gatebreakerTurret");
const MAX_HP = enemySpec(Kind.Gatebreaker).hp;

/** Patterns 0-2 are turret fans (0 and 2 left, 1 right), 3-5 curtains, 6-7 rings; times unchanged. */
export const GATEBREAKER_SCHEDULE: BossSchedule = { entry: 2.5, period: 12, times: [0.9, 2.1, 3.3, 4.6, 5.7, 6.8, 8.5, 10], cueLead: 0.55 };
export const turretSide = (pattern: number): 0 | 1 => pattern % 2 === 0 ? 0 : 1;
/** Turret slot 0 (left) and 1 (right, drawn flipped in x): spec hull sockets, and each slot's barrel muzzles from the boss pivot. */
export const TURRET_POSES: readonly PartPose[] = [{}, { flipX: true }];
export const TURRET_SOCKETS: readonly Point[] = [specSocket("gatebreaker", "leftTurret"), specSocket("gatebreaker", "rightTurret")];
export const TURRET_MUZZLES: readonly (readonly Point[])[] = TURRET_SOCKETS.map((socket, side) =>
  specSocketList("gatebreakerTurret", "muzzles").map((muzzle) => addPoint(socket, placeSocket(muzzle, TURRET_POSES[side]))));
/** Spec proposal: turret firing frame 90 ms; telegraphs are held for the 0.55 s cue. */
export const TURRET_FIRING_SECONDS = 0.09;

/**
 * Hull state: wreck-1/2 from 2/3 and 1/3 HP ("shown at 2/3, 1/3 and 0 HP"; wreck-3 is the defeat pose). The core
 * telegraph (cue 2 curtains, cue 3 rings) uses the telegraph frame; the wreck frames have no telegraph variant, so
 * they carry the telegraph frame's core box on top (their core pixels equal idle's, see tests/rev01-enemies.test.ts).
 */
export function gatebreakerHull(hp: number, cue: number): { frame: "idle" | "telegraph" | "wreck-1" | "wreck-2"; coreTelegraph: boolean } {
  const telegraph = cue === 2 || cue === 3;
  if (hp <= MAX_HP / 3) return { frame: "wreck-2", coreTelegraph: telegraph };
  if (hp <= MAX_HP * 2 / 3) return { frame: "wreck-1", coreTelegraph: telegraph };
  return { frame: telegraph ? "telegraph" : "idle", coreTelegraph: false };
}
/** Turret state: telegraph while its fan is cued, firing for 90 ms after it fired, down once destroyed. */
export function gatebreakerTurret(side: 0 | 1, alive: boolean, boss: { cue: number; fireIndex: number; time: number }): "idle" | "telegraph" | "firing" | "down" {
  if (!alive) return "down";
  const pending = boss.fireIndex % 8, last = (boss.fireIndex - 1) % 8;
  if (boss.cue === 1 && pending < 3 && turretSide(pending) === side) return "telegraph";
  if (boss.fireIndex > 0 && last < 3 && turretSide(last) === side && sinceLastPattern(GATEBREAKER_SCHEDULE, boss.time, boss.fireIndex) < TURRET_FIRING_SECONDS) return "firing";
  return "idle";
}

/** Sub-rect of a native frame (offsets from its pivot) that draws in place over the full frame. */
export function cropFrame(art: NativeFrame, dx: number, dy: number, width: number, height: number): NativeFrame {
  const stripWidth = art.width / art.uw, stripHeight = art.height / art.vh, x = art.x + art.pivotX + dx, y = art.y + art.pivotY + dy;
  return { ...art, name: `${art.name}@${dx},${dy}`, x, y, width, height, pivotX: -dx, pivotY: -dy, u: x / stripWidth, v: y / stripHeight, uw: width / stripWidth, vh: height / stripHeight };
}
/** The telegraph frame's core box (pivot -6..6, -5..7): the only pixels where it differs from idle. */
export const TELEGRAPH_CORE = cropFrame(HULL.frame("telegraph"), -6, -5, 13, 13);

/** Stage 1 carrier: two destructible turrets (pattern 0 left, 1 right) fire aimed fans; the hull fires curtains and rings. */
export const gatebreaker: BossDefinition = {
  name: "GATEBREAKER", hp: MAX_HP, clearBonus: 3000,
  create({ scene, run, session, hostiles: { emit } }) {
    const enemies = scene.world.query(Pose, Enemy);
    const turrets = [enemySpec(Kind.GatebreakerTurret).hp, enemySpec(Kind.GatebreakerTurret).hp];
    const schedule = GATEBREAKER_SCHEDULE;
    return {
      spawn() {
        spawnEnemy(scene.world, run, Kind.Gatebreaker, w(240), w(-35));
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, w(202), w(-20), { pattern: 0 });
        spawnEnemy(scene.world, run, Kind.GatebreakerTurret, w(278), w(-20), { pattern: 1 });
      },
      update(dt) {
        const { boss, parts } = locate(enemies, Kind.Gatebreaker, Kind.GatebreakerTurret);
        let bossX = w(240), bossY = w(-35);
        if (boss) {
          const { p, e, row } = boss, age = e.age[row];
          forgetDestroyed(turrets, parts);
          p.x[row] = w(240) + Math.sin(Math.max(0, age - schedule.entry) * 0.55) * w(75);
          p.y[row] = Math.min(w(67), p.y[row] + dt * w(42)); bossX = p.x[row]; bossY = p.y[row];
          run.bossHealth = Math.max(0, e.hp[row]);
          const time = Math.max(0, age - schedule.entry), cycle = Math.floor(e.fireIndex[row] / 8), index = e.fireIndex[row] % 8;
          const next = patternDue(schedule, e.fireIndex[row]);
          if (time > next - schedule.cueLead && !e.cue[row]) { e.cue[row] = index < 3 ? 1 : index < 6 ? 2 : 3; e.targetAngle[row] = Math.atan2(run.y - p.y[row], run.x - p.x[row]); }
          if (time >= next) {
            const enraged = e.hp[row] < gatebreaker.hp / 2;
            if (index < 3) {
              const side = turretSide(index);
              // One fan per pattern, shared between the turret's two barrels (spec muzzles; right turret mirrored).
              if (turrets[side] > 0) for (const volley of splitVolley(fan(e.targetAngle[row], enraged ? 9 : 7, (enraged ? 96 : 72) * Math.PI / 180, w(58)), TURRET_MUZZLES[side])) {
                emit(p.x[row] + volley.origin[0], p.y[row] + volley.origin[1], volley.shots, 0xffa07e);
              }
            } else if (index < 6) {
              const gap = w(cycle % 2 ? 360 : 120);
              for (const x of curtainPositions(gap, w(64), index % 2 === 0 ? w(12) : 0)) emit(x, w(36), [{ vx: 0, vy: w(52) }], 0xff797f);
            } else emit(p.x[row], p.y[row] + w(10), ring(enraged ? 18 : 14, (index === 7 ? Math.PI / (enraged ? 18 : 14) : 0) + cycle * 0.13, w(enraged ? 50 : 44)), 0xf2a5ec);
            e.fireIndex[row]++; e.cue[row] = 0;
          }
        }
        enemies.eachChunk((chunk) => { const p = chunk.views.pose, e = chunk.views.enemy; for (let row = 0; row < chunk.count; row++) if (e.kind[row] === Kind.GatebreakerTurret && e.active[row]) {
          const socket = TURRET_SOCKETS[e.pattern[row]];
          p.x[row] = bossX + socket[0]; p.y[row] = bossY + socket[1];
          turrets[e.pattern[row]] = Math.max(0, e.hp[row]);
        } });
      },
      render(frame, alpha, legacy) {
        drawDefeat(frame, run, [{ art: HULL.frame("wreck-3"), draw: { layer: LAYER.enemy } },
          ...TURRET_SOCKETS.map((offset, side) => ({ art: TURRET.frame("down"), offset, draw: { layer: LAYER.enemyDetail, flipX: TURRET_POSES[side].flipX } }))]);
        const { boss, parts } = locate(enemies, Kind.Gatebreaker, Kind.GatebreakerTurret);
        if (!boss) return;
        const { p, e, row } = boss, x = lerp(p.px[row], p.x[row], alpha), y = lerp(p.py[row], p.y[row], alpha);
        const reduced = session.settings.reducedMotion, color = hitColor(e.flash[row], reduced);
        if (e.cue[row] === 2) drawGap(legacy, frame, w(Math.floor(e.fireIndex[row] / 8) % 2 ? 360 : 120), w(64), 0x67e3be);
        const hull = gatebreakerHull(e.hp[row], e.cue[row]);
        drawNative(frame, HULL.frame(hull.frame), x, y, { layer: LAYER.enemy, color });
        if (hull.coreTelegraph) drawNative(frame, TELEGRAPH_CORE, x, y, { layer: LAYER.enemy, color });
        const flash = [0, 0];
        enemies.eachChunk(({ views, count }) => { for (let i = 0; i < count; i++) if (views.enemy.active[i] && views.enemy.kind[i] === Kind.GatebreakerTurret) flash[views.enemy.pattern[i] & 1] = views.enemy.flash[i]; });
        const state = { cue: e.cue[row], fireIndex: e.fireIndex[row], time: Math.max(0, e.age[row] - schedule.entry) };
        TURRET_SOCKETS.forEach((socket, index) => {
          const side = index as 0 | 1, name = gatebreakerTurret(side, Boolean(parts & 1 << side), state);
          drawNative(frame, TURRET.frame(name), x + socket[0], y + socket[1], { layer: LAYER.enemyDetail, flipX: TURRET_POSES[side].flipX, color: name === "down" ? 0xffffff : hitColor(flash[side], reduced) });
        });
      },
    };
  },
};
