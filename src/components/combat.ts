import { component, f64, u8, u32 } from "@ngne/core";
import { COMBAT } from "../config/encounters.ts";
import { Kind, enemySpec } from "../config/enemies.ts";
import { REV01_GAMEPLAY } from "../config/rev01-gameplay.ts";
import { fromLegacy } from "../config/view.ts";
// Spatial defaults follow the 640x360 spawn conventions (entities/combat.ts); real spawns always set them.
export const Pose = component("pose", { x: f64(), y: f64(), px: f64(), py: f64() });
/** kind: a `Kind` value from config/enemies.ts. */
export const Enemy = component("enemy", { kind: u8(), hp: f64(), maxHp: f64(), age: f64(), cooldown: f64(), vx: f64(), vy: f64(), originX: f64(), pattern: u8(), active: u8(1), flash: f64(), radius: f64(enemySpec(Kind.Interceptor).radius), id: u32(), targetAngle: f64(), cue: f64(), fireIndex: u32() });
export const Bullet = component("bullet", { vx: f64(), vy: f64(), team: u8(), damage: f64(1), radius: f64(COMBAT.playerBulletRadius), age: f64(), active: u8(1), color: u32(0xff767e), size: f64(fromLegacy(3)) });
export const Particle = component("particle", { vx: f64(), vy: f64(), age: f64(), life: f64(), color: u32(), size: f64(), kind: u8() });
export const Pickup = component("pickup", { age: f64(), active: u8(1) });
export const Beam = component("beam", { age: f64(), charge: f64(0.9), duration: f64(0.65), width: f64(REV01_GAMEPLAY.beamWidth.starfallEngine), active: u8(1) });
