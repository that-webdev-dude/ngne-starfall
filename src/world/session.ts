import { fromLegacy } from "../config/view.ts";

export interface Settings {
    music: number;
    effects: number;
    muted: boolean;
    reducedMotion: boolean;
}
export interface Progress {
    best: number;
    runs: number;
}
export type ProgressCommand = { type: "finish"; score: number };
export type CombatPhase = "waves" | "boss" | "clear" | "dead";
/**
 * What the centre banner says (spec presentation.layout.banner), set by whoever writes `banner`:
 * - "stage": the stage-start banner; the stage card stands in for it, so it is never drawn as a banner.
 * - "sector": stage/sector messages (warning, boss name, sector secured) on the normal plate in heading text.
 * - "phase": PHASE n alerts on the alert plate in danger text.
 */
export type BannerKind = "stage" | "sector" | "phase";
export interface RunState {
    stageIndex: number;
    entryScore: number;
    phase: CombatPhase;
    seconds: number;
    score: number;
    hull: number;
    combo: number;
    comboTimer: number;
    nova: number;
    invulnerable: number;
    shotTimer: number;
    waveIndex: number;
    x: number;
    y: number;
    bossHealth: number;
    bossMax: number;
    kills: number;
    shake: number;
    flash: number;
    effectClock: number;
    banner: string;
    bannerTime: number;
    bannerKind: BannerKind;
    finishTimer: number;
    finished: boolean;
    nextId: number;
    scorePops: { x: number; y: number; text: string; life: number }[];
    novaRing: number;
    bossDeathX: number;
    bossDeathY: number;
    bossPhase: number;
}
export interface Session {
    settings: Settings;
    screen: "title" | "playing" | "paused" | "clear" | "dead";
    run?: RunState;
    best: number;
    ready: boolean;
}
/** Player start and default boss-death point: the legacy (240, 206) and (240, 67) at 4/3. */
export const PLAYER_START = { x: fromLegacy(240), y: fromLegacy(206) } as const;
export function newRun(stageIndex = 0, entryScore = 0): RunState {
    return {
        stageIndex,
        entryScore,
        phase: "waves",
        seconds: 0,
        score: entryScore,
        hull: 5,
        combo: 1,
        comboTimer: 0,
        nova: 1,
        invulnerable: 1.5,
        shotTimer: 0,
        waveIndex: 0,
        x: PLAYER_START.x,
        y: PLAYER_START.y,
        bossHealth: 0,
        bossMax: 1,
        kills: 0,
        shake: 0,
        flash: 0,
        effectClock: 0,
        banner: "ORBITAL BREAKWATER",
        bannerTime: 3.5,
        bannerKind: "stage",
        finishTimer: 0,
        finished: false,
        nextId: 1,
        scorePops: [],
        novaRing: 100,
        bossDeathX: fromLegacy(240),
        bossDeathY: fromLegacy(67),
        bossPhase: 1,
    };
}
