import { neutralPose, playbackSeconds, type PoseState } from "../render/player-fx-model.ts";
import { rev01Sprite } from "../services/rev01-assets.ts";
import type { RunState } from "../world/session.ts";

/**
 * Per-run player/effect presentation state (T2), kept beside RunState rather than in it. Advanced only on
 * simulation ticks, so it is deterministic; the pose also selects the primary muzzle sockets.
 */
export interface PlayerFxState {
  pose: PoseState;
  /** run.effectClock when the hull last dropped (-Infinity before any hit). */
  damageClock: number;
  lastHull: number;
  /** Nova trigger position; the ring stays there (spec nova.origin) while run.novaRing counts its time. */
  nova?: { x: number; y: number };
  /** Death position, effectClock at death and the playback offset (frame 0 is skipped for a banked pose). */
  death?: { x: number; y: number; clock: number; offset: number };
}

const states = new WeakMap<RunState, PlayerFxState>();
export function playerFxState(run: RunState): PlayerFxState {
  let state = states.get(run);
  if (!state) { state = { pose: neutralPose(), damageClock: -Infinity, lastHull: run.hull }; states.set(run, state); }
  return state;
}

/** Called by the nova trigger: fixes the ring's origin at the player position. */
export function startNovaFx(run: RunState): void {
  playerFxState(run).nova = { x: run.x, y: run.y };
}

/** spec playerDeath: "frame 0 is drawn from neutral; the consumer may skip frame 0 for a banked pose". */
const DEATH_SKIP_SECONDS = rev01Sprite("playerDeath").playback!.durationsMs[0] / 1000;
export const PLAYER_DEATH_SECONDS = playbackSeconds(rev01Sprite("playerDeath"));

/** Once per tick, after collision: records hull losses (damage cue) and the death position. */
export function observePlayerFx(run: RunState): void {
  const state = playerFxState(run);
  if (run.hull < state.lastHull) state.damageClock = run.effectClock;
  state.lastHull = run.hull;
  if (run.phase === "dead" && !state.death) {
    state.death = { x: run.x, y: run.y, clock: run.effectClock, offset: state.pose.level === 0 ? 0 : DEATH_SKIP_SECONDS };
  }
}
