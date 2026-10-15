export interface Settings { music: number; effects: number; muted: boolean; reducedMotion: boolean }
export interface Progress { best: number; runs: number }
export type ProgressCommand = { type: "finish"; score: number };
export type CombatPhase = "waves" | "boss" | "clear" | "dead";
export interface RunState {
  stageIndex: number; entryScore: number;
  phase: CombatPhase; seconds: number; score: number; hull: number; combo: number; comboTimer: number;
  nova: number; invulnerable: number; shotTimer: number; waveIndex: number;
  x: number; y: number; bossHealth: number; bossMax: number;
  kills: number; shake: number; flash: number; effectClock: number; banner: string; bannerTime: number;
  finishTimer: number; finished: boolean; nextId: number; scorePops: { x: number; y: number; text: string; life: number }[];
  bossLeft: number; bossRight: number; bulletSpawns: number; novaRing: number;
  bossDeathX: number; bossDeathY: number;
  sections: number[]; bossPhase: number;
}
export interface Session {
  settings: Settings; screen: "title" | "playing" | "paused" | "clear" | "dead";
  run?: RunState; best: number; ready: boolean;
}
export function newRun(stageIndex = 0, entryScore = 0): RunState {
  return { stageIndex, entryScore, phase: "waves", seconds: 0, score: entryScore, hull: 5, combo: 1, comboTimer: 0, nova: 1,
    invulnerable: 1.5, shotTimer: 0, waveIndex: 0, x: 240, y: 206,
    bossHealth: 0, bossMax: 1, kills: 0, shake: 0, flash: 0, effectClock: 0,
    banner: "ORBITAL BREAKWATER", bannerTime: 3.5, finishTimer: 0, finished: false,
    nextId: 1, scorePops: [], bossLeft: 35, bossRight: 35, bulletSpawns: 0, novaRing: 100, bossDeathX: 240, bossDeathY: 67, sections: [55, 55, 55], bossPhase: 1 };
}
