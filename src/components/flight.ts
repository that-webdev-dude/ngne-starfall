import { component, f64 } from "@ngne/core";
import { PLAYER_START } from "../world/session.ts";

export const Flight = component("flight", {
    x: f64(PLAYER_START.x),
    y: f64(PLAYER_START.y),
    px: f64(PLAYER_START.x),
    py: f64(PLAYER_START.y),
    vx: f64(),
    vy: f64(),
    bank: f64(),
    previousBank: f64(),
});
