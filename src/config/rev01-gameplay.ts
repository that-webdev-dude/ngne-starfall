import spec from "../../art/rev01/spec.json" with { type: "json" };

/**
 * Gameplay numbers the rev01 spec sets explicitly instead of the uniform 4/3 world migration
 * (spec `gameplay`, `codeDrawn.beamLane.widthsAt640`). Everything else spatial goes through `fromLegacy`.
 */
export const REV01_GAMEPLAY = {
  playerRadius: spec.gameplay.playerRadius,
  hostileBulletRadius: spec.gameplay.hostileBulletRadius,
  enemyRadius: spec.gameplay.enemyRadius,
  beamWidth: { starfallEngine: spec.codeDrawn.beamLane.widthsAt640.starfallEngine, warden: spec.codeDrawn.beamLane.widthsAt640.warden },
} as const;
