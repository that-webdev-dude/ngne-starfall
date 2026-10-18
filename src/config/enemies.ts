/** Values stored in the `Enemy.kind` u8 column. */
export const Kind = {
  Interceptor: 0, Gunship: 1, Sweeper: 2,
  Gatebreaker: 3, GatebreakerTurret: 4,
  Minelayer: 5, Warden: 6, Mine: 7,
  KilnHead: 8, KilnSegment: 9,
  StarfallEngine: 10, EngineEmitter: 11,
} as const;
export type Kind = (typeof Kind)[keyof typeof Kind];

/** ordinary: wave enemies that can drop repairs; part: destructible boss machinery that also damages its boss. */
export type EnemyRole = "ordinary" | "boss" | "part" | "mine";
export interface EnemySpec { role: EnemyRole; hp: number; radius: number; cooldown: number; score: number }

const ENEMIES: Record<Kind, EnemySpec> = {
  [Kind.Interceptor]: { role: "ordinary", hp: 3, radius: 12, cooldown: 1.6, score: 100 },
  [Kind.Gunship]: { role: "ordinary", hp: 12, radius: 14, cooldown: 1.9, score: 300 },
  [Kind.Sweeper]: { role: "ordinary", hp: 8, radius: 9, cooldown: 0.7, score: 200 },
  [Kind.Gatebreaker]: { role: "boss", hp: 480, radius: 29, cooldown: 0.7, score: 5000 },
  [Kind.GatebreakerTurret]: { role: "part", hp: 35, radius: 11, cooldown: 0.7, score: 650 },
  [Kind.Minelayer]: { role: "ordinary", hp: 14, radius: 12, cooldown: 0.7, score: 350 },
  [Kind.Warden]: { role: "ordinary", hp: 17, radius: 14, cooldown: 0.7, score: 400 },
  [Kind.Mine]: { role: "mine", hp: 2, radius: 6, cooldown: 0.7, score: 50 },
  [Kind.KilnHead]: { role: "boss", hp: 540, radius: 22, cooldown: 0.7, score: 6500 },
  [Kind.KilnSegment]: { role: "part", hp: 55, radius: 14, cooldown: 0.7, score: 800 },
  [Kind.StarfallEngine]: { role: "boss", hp: 600, radius: 28, cooldown: 0.7, score: 10000 },
  [Kind.EngineEmitter]: { role: "part", hp: 55, radius: 10, cooldown: 0.7, score: 1000 },
};

export function enemySpec(kind: number): EnemySpec {
  const spec = ENEMIES[kind as Kind];
  if (!spec) throw new Error(`Unknown enemy kind ${kind}`);
  return spec;
}
export const isBoss = (kind: number): boolean => enemySpec(kind).role === "boss";
export const isBossPart = (kind: number): boolean => enemySpec(kind).role === "part";
export const isOrdinaryEnemy = (kind: number): boolean => enemySpec(kind).role === "ordinary";
