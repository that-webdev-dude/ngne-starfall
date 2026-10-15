export const isBoss = (kind: number): boolean => kind === 3 || kind === 8 || kind === 10;
export const isBossPart = (kind: number): boolean => kind === 4 || kind === 9 || kind === 11;
export const isOrdinaryEnemy = (kind: number): boolean => kind < 3 || kind === 5 || kind === 6;
