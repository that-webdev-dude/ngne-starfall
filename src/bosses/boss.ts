import type { Frame, SchemaQuery, SchemaQueryViews } from "@ngne/core";
import type { Enemy, Pose } from "../components/combat.ts";
import type { Kind } from "../config/enemies.ts";
import type { ArtFrame } from "../services/art-assets.ts";
import type { CombatContext } from "../systems/combat-context.ts";
import { text } from "../ui/bitmap-text.ts";
import { drawSprite } from "../ui/sprite.ts";
import type { RunState } from "../world/session.ts";

/** One stage's boss encounter: owns its spawn, patterns, part state and boss-specific visuals. */
export interface Boss {
  /** Spawns the boss and its parts when the boss phase starts. */
  spawn(): void;
  /** Moves the boss and its parts and fires due patterns; runs every simulated tick until the stage ends. */
  update(dt: number): void;
  /** Draws telegraphs, destroyed parts and the defeat sprite; the body sprite is drawn by the enemy pass. */
  render(frame: Frame, alpha: number): void;
}
export interface BossDefinition {
  name: string; hp: number; clearBonus: number;
  create(context: Omit<CombatContext, "boss">): Boss;
}

type EnemyViews = SchemaQueryViews<[typeof Pose, typeof Enemy]>;
export interface BossRow { p: EnemyViews["pose"]; e: EnemyViews["enemy"]; row: number }

/**
 * The live boss row, plus a bitmask of part slots (`Enemy.pattern`) that still have an entity.
 * A part counts as destroyed once its entity is gone; borrowed views are valid until the next commit.
 */
export function locate(enemies: SchemaQuery<[typeof Pose, typeof Enemy]>, bossKind: Kind, partKind: Kind): { boss?: BossRow; parts: number } {
  let boss: BossRow | undefined, parts = 0;
  enemies.eachChunk(({ views, count }) => {
    const e = views.enemy;
    for (let row = 0; row < count; row++) if (e.active[row]) {
      if (e.kind[row] === bossKind && e.hp[row] > 0) boss ??= { p: views.pose, e, row };
      else if (e.kind[row] === partKind) parts |= 1 << e.pattern[row];
    }
  });
  return { boss, parts };
}
/** Zeroes the health of part slots whose entity is gone; firing keeps using the health copied last update. */
export function forgetDestroyed(health: number[], parts: number): void {
  for (let i = 0; i < health.length; i++) if (!(parts & 1 << i)) health[i] = 0;
}

export function drawGap(frame: Frame, x: number, width: number, color: number, label: number): void {
  frame.rect(x, 151, width, 230, color, 0.07, -1, true);
  text(frame, "GAP", x - 6, 36, label);
}
export function drawDefeat(frame: Frame, run: RunState, artwork: ArtFrame, rotation = 0): void {
  if (run.phase === "clear" && run.finishTimer < 1.45) drawSprite(frame, artwork, run.bossDeathX, run.bossDeathY, 2, 1, 0x9c706b, rotation);
}
