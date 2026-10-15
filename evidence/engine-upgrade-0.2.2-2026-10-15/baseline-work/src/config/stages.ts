import { COMBAT, ENCOUNTERS, type Encounter } from "./encounters.ts";
export interface StageConfig { index: number; id: string; name: string; bossName: string; bossAt: number; bossHp: number; encounters: Encounter[] }
function laterEncounters(final: boolean): Encounter[] {
  const list: Encounter[] = [];
  const end = final ? 102 : 92;
  for (let at = 2, index = 0; at < end; at += final ? 6 : 7, index++) list.push({ at, kind: "interceptor", count: index < 2 ? 4 : 5, side: index % 2 ? 320 : 160 });
  for (let at = 13, index = 0; at < end; at += 16, index++) list.push({ at, kind: "sweeper", count: 2, side: index % 2 });
  for (let at = 8, index = 0; at < end; at += final ? 19 : 22, index++) list.push({ at, kind: "minelayer", count: 1, side: index % 2 ? 335 : 145 });
  for (let at = final ? 17 : 34, index = 0; at < end; at += final ? 22 : 30, index++) list.push({ at, kind: "warden", count: 1, side: index % 2 ? 135 : 345 });
  for (const at of final ? [28, 58, 83] : [26, 56, 78]) list.push({ at, kind: "gunship", count: 1, side: at % 2 ? 315 : 165 });
  list.push({ at: final ? 60 : 55, kind: "repair", count: 1, side: 240 });
  return list.sort((a, b) => a.at - b.at);
}
export const STAGES: readonly StageConfig[] = [
  { index: 0, id: "orbital-breakwater", name: "ORBITAL BREAKWATER", bossName: "GATEBREAKER", bossAt: COMBAT.bossAt, bossHp: COMBAT.bossHp, encounters: ENCOUNTERS },
  { index: 1, id: "furnace-belt", name: "FURNACE BELT", bossName: "KILN SERPENT", bossAt: 100, bossHp: 540, encounters: laterEncounters(false) },
  { index: 2, id: "midnight-citadel", name: "MIDNIGHT CITADEL", bossName: "STARFALL ENGINE", bossAt: 110, bossHp: 600, encounters: laterEncounters(true) },
];
