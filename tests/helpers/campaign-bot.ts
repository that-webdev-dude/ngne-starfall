import type { WorldAccess } from "@ngne/core";
import { Flight } from "../../src/components/flight.ts";
import { Beam, Bullet, Enemy, Pose } from "../../src/components/combat.ts";
import type { RunState } from "../../src/world/session.ts";

export interface BotThreat { x: number; y: number; vx: number; vy: number; radius: number; kind?: number }
export interface BotObservation {
  x: number; y: number; vx: number; vy: number; hull: number; nova: number;
  bossHealth: number; phase: string; bullets: BotThreat[]; enemies: BotThreat[];
  beams: { x: number; y: number; halfWidth: number; startsIn: number; endsIn: number }[];
}
export interface BotMemory { tick: number; move: readonly [number, number] }
export const createBotMemory = (): BotMemory => ({ tick: 0, move: [0, 0] });

/** Read-only observations: the bot never writes gameplay state or ECS columns. */
export function observeCampaign(world: WorldAccess, run: RunState, dt = 1 / 60): BotObservation {
  let vx = 0, vy = 0;
  world.query(Flight).eachChunk(({ views }) => { vx = views.flight.vx[0]; vy = views.flight.vy[0]; });
  const bullets: BotThreat[] = [], enemies: BotThreat[] = [];
  const beams: BotObservation["beams"] = [];
  world.query(Pose, Bullet).eachChunk(({ views: v, count }) => {
    for (let i = 0; i < count; i++) if (v.bullet.team[i] && v.bullet.active[i]) bullets.push({ x: v.pose.x[i], y: v.pose.y[i], vx: v.bullet.vx[i], vy: v.bullet.vy[i], radius: v.bullet.radius[i] + 4 });
  });
  world.query(Pose, Enemy).eachChunk(({ views: v, count }) => {
    for (let i = 0; i < count; i++) if (v.enemy.active[i]) enemies.push({ x: v.pose.x[i], y: v.pose.y[i], vx: (v.pose.x[i] - v.pose.px[i]) / dt, vy: (v.pose.y[i] - v.pose.py[i]) / dt, radius: v.enemy.radius[i] + 4, kind: v.enemy.kind[i] });
  });
  world.query(Pose, Beam).eachChunk(({ views: v, count }) => {
    for (let i = 0; i < count; i++) if (v.beam.active[i]) beams.push({ x: v.pose.x[i], y: v.pose.y[i], halfWidth: v.beam.width[i] / 2 + 4, startsIn: v.beam.charge[i] - v.beam.age[i], endsIn: v.beam.charge[i] + v.beam.duration[i] - v.beam.age[i] });
  });
  return { x: run.x, y: run.y, vx, vy, hull: run.hull, nova: run.nova, bossHealth: run.bossHealth, phase: run.phase, bullets, enemies, beams };
}

const moves: (readonly [number, number])[] = [-1, 0, 1].flatMap((x) => [-1, 0, 1].map((y) => [x, y] as const));

/** Returns ordinary held keyboard keys. Browser fixtures can apply changes through Input.set. */
export function decideCampaignKeys(observation: BotObservation, memory: BotMemory): string[] {
  if (observation.phase === "clear" || observation.phase === "dead") return [];
  if (memory.tick++ % 6 === 0) {
    const threats = [...observation.bullets, ...observation.enemies];
    const targets = observation.enemies.filter((enemy) => enemy.y < observation.y - 24 && enemy.y > -35);
    targets.sort((a, b) => (Math.abs(a.x - observation.x) + (observation.y - a.y) * 0.15) - (Math.abs(b.x - observation.x) + (observation.y - b.y) * 0.15));
    const target = targets[0], targetX = target ? Math.max(30, Math.min(450, target.x + target.vx * 0.22)) : 240;
    let bestCost = Infinity;
    for (const move of moves) {
      const length = Math.max(1, Math.hypot(...move)), mx = move[0] / length, my = move[1] / length;
      let x = observation.x, y = observation.y, vx = observation.vx, vy = observation.vy, cost = 0;
      for (let step = 1; step <= 8; step++) {
        vx = mx * 135 + (vx - mx * 135) * Math.exp(-(mx === 0 ? 8 : 14) * 0.1);
        vy = my * 135 + (vy - my * 135) * Math.exp(-(my === 0 ? 8 : 14) * 0.1);
        x = Math.max(18, Math.min(462, x + vx * 0.1));
        y = Math.max(43, Math.min(239, y + vy * 0.1));
        const time = step * 0.1;
        for (const threat of threats) {
          const clearance = Math.hypot(x - threat.x - threat.vx * time, y - threat.y - threat.vy * time) - threat.radius;
          cost += (clearance < 1 ? 2500 : 220 * Math.exp(-clearance * clearance / 160)) / (1 + step * 0.15);
        }
        for (const beam of observation.beams) if (time >= beam.startsIn && time < beam.endsIn && y >= beam.y) {
          const clearance = Math.abs(x - beam.x) - beam.halfWidth;
          cost += clearance < 1 ? 3000 : 350 * Math.exp(-clearance * clearance / 180);
        }
        cost += (y - 198) ** 2 * 0.0005 + (x - targetX) ** 2 * 0.0008;
      }
      cost += Math.hypot(move[0] - memory.move[0], move[1] - memory.move[1]) * 0.08;
      if (cost < bestCost) { bestCost = cost; memory.move = move; }
    }
  }
  const keys = ["Space"];
  if (memory.move[0] < 0) keys.push("ArrowLeft"); else if (memory.move[0] > 0) keys.push("ArrowRight");
  if (memory.move[1] < 0) keys.push("ArrowUp"); else if (memory.move[1] > 0) keys.push("ArrowDown");
  const closeThreat = observation.bullets.some((bullet) => Math.hypot(observation.x - bullet.x, observation.y - bullet.y) < 34);
  if (observation.nova >= 0.999 && (closeThreat || observation.bullets.length > 38 || observation.phase === "boss" && observation.bossHealth < 58)) keys.push("KeyB");
  return keys;
}
