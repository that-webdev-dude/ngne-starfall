import { loopIndex } from "../bosses/boss.ts";
import { Kind } from "../config/enemies.ts";
import type { Rev01Id } from "../services/rev01-assets.ts";
import { LAYER_CRAFT_TIMING } from "../systems/advanced-enemies.ts";
import { GUNSHIP_TIMING, SWEEPER_TIMING } from "../systems/combat-enemies.ts";

/**
 * Native frame choice for the ordinary enemies (art spec state animations). Durations are the spec's proposals
 * ("idle/pulse loop 120/120 ms; fire 70 ms" ...); telegraph frames are held for the game's own cue lead instead
 * of the proposal length, so the art cue and the attack stay in step. Reduced motion holds decorative loops on
 * their first frame and threat loops on their strongest frame; one-shot fire frames still show (no blinking).
 */
export const ORDINARY_SPRITES: Partial<Record<Kind, Rev01Id>> = {
  [Kind.Interceptor]: "interceptor", [Kind.Sweeper]: "dart", [Kind.Gunship]: "gunship", [Kind.Warden]: "warden", [Kind.Minelayer]: "minelayer",
};
export const ENEMY_FRAME_SECONDS = {
  interceptor: { loop: [0.12, 0.12], fire: 0.07 },
  dart: { loop: [0.1, 0.1], fire: 0.07 },
  gunship: { vent: [0.12, 0.12], fire: 0.07 },
  warden: { fire: 0.07 },
  minelayer: { release: 0.12 },
} as const;

/** The Enemy columns a frame depends on (see the fire bookkeeping in combat-enemies.ts / advanced-enemies.ts). */
export interface EnemyFrameState { age: number; cue: number; cooldown: number; fireIndex: number }

export function ordinaryFrame(kind: number, s: EnemyFrameState, reducedMotion: boolean): string {
  switch (kind) {
    case Kind.Interceptor: {
      // Single shot (fireIndex 1); its clock keeps running below zero afterwards.
      if (s.fireIndex > 0 && -s.cooldown < ENEMY_FRAME_SECONDS.interceptor.fire) return "fire";
      return reducedMotion ? "idle" : ["idle", "pulse"][loopIndex(s.age, ENEMY_FRAME_SECONDS.interceptor.loop)];
    }
    case Kind.Sweeper: {
      // cue = this reload began with a shot (the proximity rule can skip one).
      if (s.cue && SWEEPER_TIMING.reload - s.cooldown < ENEMY_FRAME_SECONDS.dart.fire) return "fire";
      return reducedMotion ? "idle" : ["idle", "pulse"][loopIndex(s.age, ENEMY_FRAME_SECONDS.dart.loop)];
    }
    case Kind.Gunship: {
      if (s.fireIndex > 0 && GUNSHIP_TIMING.reload - s.cooldown < ENEMY_FRAME_SECONDS.gunship.fire) return "fire";
      if (s.cue) return reducedMotion ? "vent-b" : ["vent-a", "vent-b"][loopIndex(GUNSHIP_TIMING.cue - s.cooldown, ENEMY_FRAME_SECONDS.gunship.vent)];
      return "idle";
    }
    case Kind.Warden: {
      if (s.fireIndex > 0 && LAYER_CRAFT_TIMING.reload.warden - s.cooldown < ENEMY_FRAME_SECONDS.warden.fire) return "fire";
      return s.cue ? "charge" : "idle";
    }
    case Kind.Minelayer: {
      // Doors open for the telegraph; the release frame (mine in the bay) leads into the spawn on mineRelease.
      if (!s.cue) return "idle";
      return s.cooldown < ENEMY_FRAME_SECONDS.minelayer.release ? "release" : "open";
    }
    default: throw new Error(`no ordinary frame for enemy kind ${kind}`);
  }
}
