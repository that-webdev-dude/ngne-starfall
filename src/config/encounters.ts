export interface Encounter { at: number; kind: "interceptor" | "gunship" | "sweeper" | "minelayer" | "warden" | "repair"; count: number; side: number; quiet?: boolean }
export const ENCOUNTERS: Encounter[] = ([
  { at: 2, kind: "interceptor", count: 4, side: 150, quiet: true },
  { at: 8, kind: "interceptor", count: 5, side: 330, quiet: true },
  ...[13, 18, 23, 29, 35, 41, 46, 50, 55, 60, 65, 70, 76, 81].map((at, index) => ({ at, kind: "interceptor" as const, count: index > 8 ? 6 : 4, side: index % 2 ? 320 : 160 })),
  ...[15, 23, 44, 48, 64, 77, 80].map((at, index) => ({ at, kind: "gunship" as const, count: 1, side: index % 2 ? 350 : 130 })),
  ...[28, 36, 60, 66, 72, 79].map((at, index) => ({ at, kind: "sweeper" as const, count: 2, side: index % 2 })),
  { at: 52, kind: "repair", count: 1, side: 240 },
] satisfies Encounter[]).sort((a, b) => a.at - b.at);
export const COMBAT = { enemyCap: 18, bulletCap: 180, novaSeconds: 15, playerRadius: 4, chainSeconds: 2, maxChain: 8 } as const;
