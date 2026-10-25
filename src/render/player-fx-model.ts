import { Kind } from "../config/enemies.ts";
import {
    REV01_SPEC,
    rev01Sprite,
    type NativeFrame,
    type NativeSprite,
    type Rev01Id,
} from "../services/rev01-assets.ts";

/**
 * T2 presentation model: player poses and sockets, cue priority, effect kinds and lifetimes, hostile shapes,
 * needle directions, beam-lane bands and nova timing, all read from src/assets/spec.json. Pure and Node-safe
 * (metadata only), so the simulation, the renderer and tests share one definition.
 */

type Ramp = { name: string; colors: string[] };
const ramps = (REV01_SPEC.palette as { ramps: Ramp[] }).ramps;
/** Spec palette entry as 0xRRGGBB: `ramp[index]`, dark to light (README "Palette"). */
export function paletteColor(ramp: string, index: number): number {
    const color = ramps.find((entry) => entry.name === ramp)?.colors[index];
    if (!color) throw new Error(`rev01 palette has no ${ramp}[${index}]`);
    return parseInt(color.slice(1), 16);
}

// ---- Player poses and sockets -------------------------------------------------------------------------------

const player = rev01Sprite("player");
/** Pose names in level order -3..3 (bank-left-3 ... neutral ... bank-right-3); level + 3 is the frame index. */
export const POSES: readonly string[] = player.spec.frames;
if (POSES.length !== 7 || POSES[3] !== "neutral")
    throw new Error("rev01 player: expected 7 poses with neutral in the middle");
export const poseName = (level: number): string => POSES[level + 3];

/**
 * Every level is shown for at least 50 ms (spec player.animation.transitionMs 40-65, proposal; three 60 Hz ticks),
 * so a traverse runs one level per 50 ms. A pose that has rested that long answers a new target on the same tick:
 * the return toward neutral starts immediately, and a reversal mid-roll waits at most for the current level's 50 ms.
 */
export const POSE_STEP_SECONDS = 0.05;
const [minStepMs, maxStepMs] = (player.spec.animation as unknown as { transitionMs: number[] })
    .transitionMs;
if (POSE_STEP_SECONDS * 1000 < minStepMs || POSE_STEP_SECONDS * 1000 > maxStepMs)
    throw new Error("pose step outside spec transitionMs");

/** `since`: seconds the current level has been shown. */
export interface PoseState {
    level: number;
    since: number;
}
export const neutralPose = (): PoseState => ({ level: 0, since: POSE_STEP_SECONDS });
/** Target level for the simulation's bank (-1..1): symmetric rounding to the nearest of the seven levels. */
export function poseTarget(bank: number): number {
    return Math.sign(bank) * Math.min(3, Math.round(Math.abs(bank) * 3));
}
/** Advances the pose by at most one level per call (one simulation tick). */
export function stepPose(state: PoseState, bank: number, dt: number): void {
    state.since += dt;
    const direction = Math.sign(poseTarget(bank) - state.level);
    // 1e-9 s: three accumulated 1/60 s ticks count as the full 50 ms.
    if (direction !== 0 && state.since >= POSE_STEP_SECONDS - 1e-9) {
        state.level += direction;
        state.since = 0;
    }
}

export type Socket = readonly [number, number];
export interface PoseSockets {
    exhaust: readonly Socket[];
    primary: readonly Socket[];
    plasma: Socket;
}
const specSockets = player.spec.sockets as {
    exhaust: Record<string, Socket[]>;
    primaryMuzzle: Record<string, Socket[]>;
    plasmaMuzzle: Record<string, Socket>;
};
const SOCKETS: readonly PoseSockets[] = POSES.map((name) => ({
    exhaust: specSockets.exhaust[name],
    primary: specSockets.primaryMuzzle[name],
    plasma: specSockets.plasmaMuzzle[name],
}));
/** Spec player sockets for one pose level, offsets from the pivot pixel (+y down). playerFlash shares them. */
export const poseSockets = (level: number): PoseSockets => SOCKETS[level + 3];

// ---- Playback -----------------------------------------------------------------------------------------------

/** Frame index at `seconds` into a spec playback; -1 once a non-looping playback has ended. */
export function playbackIndex(
    durationsMs: readonly number[],
    seconds: number,
    loop: boolean,
): number {
    const total = durationsMs.reduce((sum, ms) => sum + ms, 0);
    // 1e-6 ms keeps tick times that land on a boundary (3 x 1/60 s = 50 ms) on the next frame.
    let cursor = Math.max(0, seconds * 1000 + 1e-6);
    if (loop) cursor %= total;
    for (let index = 0; index < durationsMs.length; index++) {
        if (cursor < durationsMs[index]) return index;
        cursor -= durationsMs[index];
    }
    return -1;
}
export function playbackFrame(sprite: NativeSprite, seconds: number): NativeFrame | undefined {
    const playback = sprite.playback;
    if (!playback) throw new Error(`rev01 ${sprite.id} has no playback`);
    const index = playbackIndex(playback.durationsMs, seconds, playback.loop);
    return index < 0 ? undefined : playback.frames[index];
}
export const playbackSeconds = (sprite: NativeSprite): number =>
    (sprite.playback?.durationsMs ?? []).reduce((sum, ms) => sum + ms, 0) / 1000;

// ---- Cues ---------------------------------------------------------------------------------------------------

/** Normal-motion damage flash: the playerFlash counterpart of the current pose ("one brief flash", spec proposal). */
export const DAMAGE_FLASH_SECONDS = 0.1;
/** Reduced motion: playerCalm hit-<pose> held 250 ms (spec playerCalm.cuePriority). */
export const CALM_HIT_SECONDS = 0.25;
/** Invulnerability blink: legacy runtime opacity, 18 Hz phase, dim 0.35 (never invisible; the core stays opaque). */
export const BLINK_RATE = 18,
    BLINK_DIM_ALPHA = 0.35;
/** Low hull is hull <= 1 (owner, gate 5); codeDrawn.lowHullCue blinks at ~2 Hz (0.25 s on, 0.25 s off). */
export const LOW_HULL = 1,
    LOW_HULL_RATE = 4;
/**
 * No plasma charge exists in the game (hold-to-charge is excluded), so the charge-ready cue is never shown;
 * `resolvePlayerCues` keeps its slot so the priority stays as specified once a charge state exists.
 */
export const CHARGE_READY = false;

export interface PlayerCueInput {
    reducedMotion: boolean;
    clock: number;
    /** Seconds since the last hull loss (Infinity if none). */
    sinceDamage: number;
    invulnerable: number;
    hull: number;
    chargeReady: boolean;
}
export interface PlayerCues {
    /** Hull art: the pose frame of `player`, or of `playerFlash` during the damage flash. */
    hull: "player" | "playerFlash";
    /** Hull and exhaust opacity (runtime invulnerability blink). */
    alpha: number;
    /** Reduced-motion outline (playerCalm `<calm>-<pose>`). */
    calm?: "hit" | "shield";
    /** Charge-ready marker at the plasma muzzle; stays visible through every other cue. */
    chargeReady?: "plasmaReady" | "plasmaReadyCalm";
    /** Low-hull emissive lit this frame. */
    lowHull: boolean;
}
/**
 * Spec playerFlash.cuePriority / playerCalm.cuePriority: damage first (the flash overrides everything but the
 * charge-ready cue), then invulnerability (blink, or the held shield outline), charge-ready always at the muzzle,
 * low hull persistent and separate (steady in reduced motion). The core marker is drawn in every case.
 */
export function resolvePlayerCues(input: PlayerCueInput): PlayerCues {
    // 1e-9 s: a tick-accumulated clock landing on a boundary (6 x 1/60 s = 100 ms) ends the cue on that tick.
    const low = input.hull > 0 && input.hull <= LOW_HULL,
        within = (seconds: number) => input.sinceDamage < seconds - 1e-9;
    if (input.reducedMotion) {
        const calm = within(CALM_HIT_SECONDS)
            ? "hit"
            : input.invulnerable > 0
              ? "shield"
              : undefined;
        return {
            hull: "player",
            alpha: 1,
            calm,
            chargeReady: input.chargeReady ? "plasmaReadyCalm" : undefined,
            lowHull: low,
        };
    }
    const chargeReady = input.chargeReady ? ("plasmaReady" as const) : undefined;
    if (within(DAMAGE_FLASH_SECONDS))
        return { hull: "playerFlash", alpha: 1, chargeReady, lowHull: false };
    const dim = input.invulnerable > 0 && Math.floor(input.clock * BLINK_RATE) % 2 === 1;
    return {
        hull: "player",
        alpha: dim ? BLINK_DIM_ALPHA : 1,
        chargeReady,
        lowHull: low && Math.floor(input.clock * LOW_HULL_RATE) % 2 === 0,
    };
}

// ---- Effects ------------------------------------------------------------------------------------------------

/** Named effect sprites carried in `Particle.kind` (0 stays the code-drawn square particle). */
export const EFFECT = { explosion: 1, hitSpark: 2, heavyBreakup: 3, plasmaImpact: 4 } as const;
export type EffectKind = (typeof EFFECT)[keyof typeof EFFECT];
export const EFFECT_SPRITES: Readonly<Record<EffectKind, Rev01Id>> = {
    [EFFECT.explosion]: "explosion",
    [EFFECT.hitSpark]: "hitSpark",
    [EFFECT.heavyBreakup]: "heavyBreakup",
    [EFFECT.plasmaImpact]: "plasmaImpact",
};
/** Particle lifetime of an effect: its whole once-playback (explosion 0.365 s, the legacy value). */
export const effectSeconds = (kind: EffectKind): number =>
    playbackSeconds(rev01Sprite(EFFECT_SPRITES[kind]));
/** Kill effect by enemy kind: heavyBreakup for the mid-tier gunship/warden/minelayer (spec role), explosion otherwise. */
export const killEffect = (kind: number): EffectKind =>
    kind === Kind.Gunship || kind === Kind.Warden || kind === Kind.Minelayer
        ? EFFECT.heavyBreakup
        : EFFECT.explosion;

// ---- Hostile shapes and needle directions -------------------------------------------------------------------

export type HostileShape = "hostileBead" | "hostileNeedle" | "hostileOrb";
/**
 * Presentation only: one shape per weapon role, keyed by the colour each emitter already passes to
 * `HostileFire.emit` (one colour per weapon). Aimed volleys are needles, boss core rings are orbs, the rest
 * (curtains, fixed fans, Kiln volleys, mine bursts) beads. Unknown colours fall back to the ordinary bead.
 */
export const HOSTILE_SHAPES: Readonly<Record<number, HostileShape>> = {
    0xff747d: "hostileNeedle", // interceptor aimed shot
    0xff9b70: "hostileNeedle", // gunship aimed fan
    0xffa07e: "hostileNeedle", // Gatebreaker turret aimed fan
    0xf4a0e4: "hostileNeedle", // Starfall Engine emitter aimed fan
    0xf2a5ec: "hostileOrb", // Gatebreaker core ring
    0xff88c8: "hostileOrb", // Starfall Engine core ring
    0xff797f: "hostileBead", // Gatebreaker curtain
    0xd794ff: "hostileBead", // Starfall Engine curtain
    0xffaa76: "hostileBead", // Kiln head fans, ring and curtain
    0xffdf87: "hostileBead", // Kiln segment fans
    0xffbc74: "hostileBead", // mine burst
    0xf78caf: "hostileBead", // sweeper fan
};
export const hostileShape = (color: number): HostileShape => HOSTILE_SHAPES[color] ?? "hostileBead";

export type NeedleFrame = "needle-0" | "needle-22" | "needle-45";
export interface NeedleDirection {
    index: number;
    frame: NeedleFrame;
    flipX: boolean;
    quarterTurns: number;
}
/**
 * One of 16 directions (spec hostileNeedle.directions). Angles are clockwise on screen from straight down:
 * k * 90 + {0, 22.5, 45} use the delivered frame turned k quarter turns; k * 90 + 67.5 is needle-22 mirrored
 * across the down-left diagonal (PIL TRANSVERSE = mirror in x, then one quarter turn) turned k more.
 * Only exact quarter turns and mirrors, so every texel lands on a pixel.
 */
export function needleDirection(vx: number, vy: number): NeedleDirection {
    const index = ((Math.round(Math.atan2(-vx, vy) / (Math.PI / 8)) % 16) + 16) % 16,
        quarter = index >> 2,
        step = index & 3;
    if (step === 3)
        return { index, frame: "needle-22", flipX: true, quarterTurns: (quarter + 1) % 4 };
    return {
        index,
        frame: (["needle-0", "needle-22", "needle-45"] as const)[step],
        flipX: false,
        quarterTurns: quarter,
    };
}

// ---- Beam lanes (codeDrawn.beamLane) ------------------------------------------------------------------------

/**
 * Spec 6 px bright band inside either firing lane (13/15 px). The renderer gives its
 * centre a deterministic 0.5 px right bias relative to the lane, keeping rectangle edges on whole pixels.
 */
export const beamCoreWidth = (width: number): number => Math.max(1, Math.min(6, width - 6));
/** Scroll speed of the firing pulse marks (32-row period) and the warning dashes (6 on / 4 off); static in reduced motion. */
export const BEAM_SCROLL_PX_PER_SECOND = 64;

// ---- Nova ---------------------------------------------------------------------------------------------------

/** Reduced motion (novaCalm.role): ignite-1 held ~120 ms at the origin as a local flare, then the calm ring frames. */
export const NOVA_CALM_FLARE_SECONDS = 0.12;
export type NovaDraw = { atlasFrame: number } | { calm: NativeFrame };
/** What the nova shows `seconds` after its trigger: an uploaded frame index (novaUploadFrames order) or a novaCalm frame. */
export function novaFrameAt(seconds: number, reducedMotion: boolean): NovaDraw | undefined {
    if (!reducedMotion) {
        const index = playbackIndex(rev01Sprite("nova").playback!.durationsMs, seconds, false);
        return index < 0 ? undefined : { atlasFrame: index };
    }
    if (seconds < NOVA_CALM_FLARE_SECONDS) return { atlasFrame: 1 }; // ignite-1
    const calm = playbackFrame(rev01Sprite("novaCalm"), seconds - NOVA_CALM_FLARE_SECONDS);
    return calm && { calm };
}
