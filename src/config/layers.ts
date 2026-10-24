/**
 * The one draw-layer table (art rev01 spec `presentation.layers`, bottom to top).
 * Categories follow the spec list order; slots inside a category keep the established
 * hull/exhaust/flash stacking. Numbers are consecutive so the whole table spans < 64 layers.
 * Later tickets draw into existing slots; a new slot is an orchestrator-coordinated edit here.
 */
export const LAYER_CATEGORIES = [
  ["background", ["background", "backgroundTint", "stars", "floorTelegraph"]],
  // Mines below minelayer hulls, then enemies/bosses/parts, pickups, then the player stack: exhaust under the hull, flash and calm cue over it.
  ["hulls", ["mine", "mineDetail", "mineCore", "bossLink", "enemy", "enemyDetail", "enemyMark", "enemyCue", "pickup", "pickupGlow", "pickupMark", "playerExhaust", "player", "playerFlash", "playerCalm"]],
  ["effects", ["explosion", "particle", "playerMuzzleFx"]],
  ["hud", ["hudBand", "hudPlate", "hudTrack", "hudFill", "hudFillTop", "hudText", "banner", "bannerText", "stageCard", "stageCardText", "scorePop"]],
  ["nova", ["nova"]],
  ["beams", ["beamLane", "beamCore", "beamMarker"]],
  ["bullets", ["playerBullet", "plasmaShot", "hostileRim", "hostileBody", "hostileCore", "plasmaImpact"]],
  ["core", ["coreRim", "core"]],
  ["flash", ["flash"]],
  ["screen", ["screenBackdrop", "screenDim", "screenPanel", "screenItem", "screenItemMark", "screenText"]],
] as const;

type Slot = (typeof LAYER_CATEGORIES)[number][1][number];
export type LayerCategory = (typeof LAYER_CATEGORIES)[number][0];

const layers = {} as Record<Slot, number>, categories = {} as Record<Slot, LayerCategory>;
let next = 0;
for (const [category, slots] of LAYER_CATEGORIES) for (const slot of slots) { layers[slot] = next++; categories[slot] = category; }

export const LAYER: Readonly<Record<Slot, number>> = layers;
export const layerCategory = (slot: Slot): LayerCategory => categories[slot];
