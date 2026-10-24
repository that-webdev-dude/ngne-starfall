import { REV01_GAMEPLAY } from "./rev01-gameplay.ts";
import { fromLegacy } from "./view.ts";

/** side: spawn x for every kind except sweeper, where it is the entry side flag (0 left, 1 right). */
export interface Encounter { at: number; kind: "interceptor" | "gunship" | "sweeper" | "minelayer" | "warden" | "repair"; count: number; side: number; quiet?: boolean }
export const ENCOUNTERS: Encounter[] = ([
  { at: 2, kind: "interceptor", count: 4, side: fromLegacy(150), quiet: true },
  { at: 8, kind: "interceptor", count: 5, side: fromLegacy(330), quiet: true },
  ...[13, 18, 23, 29, 35, 41, 46, 50, 55, 60, 65, 70, 76, 81].map((at, index) => ({ at, kind: "interceptor" as const, count: index > 8 ? 6 : 4, side: fromLegacy(index % 2 ? 320 : 160) })),
  ...[15, 23, 44, 48, 64, 77, 80].map((at, index) => ({ at, kind: "gunship" as const, count: 1, side: fromLegacy(index % 2 ? 350 : 130) })),
  ...[28, 36, 60, 66, 72, 79].map((at, index) => ({ at, kind: "sweeper" as const, count: 2, side: index % 2 })),
  { at: 52, kind: "repair", count: 1, side: fromLegacy(240) },
] satisfies Encounter[]).sort((a, b) => a.at - b.at);
/** Player and hostile bullet radii come from the rev01 spec; the player bolt has no spec radius and keeps 2 x 4/3. */
export const COMBAT = {
  enemyCap: 18, bulletCap: 180, novaSeconds: 15, chainSeconds: 2, maxChain: 8,
  playerRadius: REV01_GAMEPLAY.playerRadius, hostileBulletRadius: REV01_GAMEPLAY.hostileBulletRadius, playerBulletRadius: fromLegacy(2),
} as const;
