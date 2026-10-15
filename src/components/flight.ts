import { component, f64 } from "@ngne/core";

export const Flight = component("flight", {
  x: f64(325), y: f64(184), px: f64(325), py: f64(184),
  vx: f64(), vy: f64(), bank: f64(), previousBank: f64(),
});
