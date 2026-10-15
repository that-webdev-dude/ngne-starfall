import { clamp, down, pressed, type SceneSetup } from "@ngne/core";
import { Flight } from "../components/flight.ts";
import { FLIGHT, VIEW } from "../config/preview.ts";
import { approach } from "../utils/motion.ts";
import { flightVelocity } from "../world/flight-motion.ts";

export interface PreviewState {
  seconds: number;
  demo: boolean;
  direction: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bank: number;
  effectAge: number;
  effectX: number;
  effectY: number;
  flash: number;
  reducedMotion: boolean;
}

export function installFlight(scene: SceneSetup, state: PreviewState): void {
  const players = scene.world.query(Flight);
  scene.system(({ input, dt }) => {
    if (pressed(input, "KeyT")) { state.demo = !state.demo; state.seconds = 0; }
    // A quick tap can press and release between fixed ticks. Preserve its latched edge.
    const active = (key: string) => down(input, key) || pressed(input, key);
    const horizontal = Number(active("KeyD") || active("ArrowRight")) - Number(active("KeyA") || active("ArrowLeft"));
    const vertical = Number(active("KeyS") || active("ArrowDown")) - Number(active("KeyW") || active("ArrowUp"));
    if (horizontal || vertical) state.demo = false;
    // Alternating holds and releases make the authored bank and coasting visible.
    const phase = state.seconds % 6;
    const demoX = phase < 1.2 ? -1 : phase < 3 ? 0 : phase < 4.2 ? 1 : 0;
    let mx = state.demo ? demoX : horizontal;
    let my = state.demo ? 0 : vertical;
    const length = Math.max(1, Math.hypot(mx, my));
    mx /= length; my /= length;
    state.direction = mx;
    players.eachChunk((chunk) => {
      const p = chunk.views.flight;
      for (let row = 0; row < chunk.count; row++) {
        p.px[row] = p.x[row]; p.py[row] = p.y[row]; p.previousBank[row] = p.bank[row];
        const beforeX = p.vx[row], beforeY = p.vy[row];
        p.vx[row] = flightVelocity(beforeX, mx, dt);
        p.vy[row] = flightVelocity(beforeY, my, dt);
        p.x[row] = clamp(p.x[row] + (beforeX + p.vx[row]) * 0.5 * dt, 30, VIEW.width - 30);
        p.y[row] = clamp(p.y[row] + (beforeY + p.vy[row]) * 0.5 * dt, 64, VIEW.height - 50);
        if ((p.x[row] <= 30 && p.vx[row] < 0) || (p.x[row] >= VIEW.width - 30 && p.vx[row] > 0)) p.vx[row] = 0;
        if ((p.y[row] <= 64 && p.vy[row] < 0) || (p.y[row] >= VIEW.height - 50 && p.vy[row] > 0)) p.vy[row] = 0;
        p.bank[row] = approach(p.bank[row], mx, FLIGHT.bankResponse, dt);
        state.x = p.x[row]; state.y = p.y[row]; state.vx = p.vx[row]; state.vy = p.vy[row]; state.bank = p.bank[row];
      }
    });
    if (pressed(input, "Space")) {
      state.effectAge = 0;
      state.effectX = state.x; state.effectY = Math.max(70, state.y - 65);
      state.flash = state.reducedMotion ? 0 : 0.12;
      scene.freeze(3);
    }
  });
  scene.system(({ dt }) => {
    state.seconds += dt;
    state.effectAge += dt;
    state.flash = Math.max(0, state.flash - dt);
    const shake = state.reducedMotion ? 0 : Math.max(0, 1 - state.effectAge * 7) * 1.8;
    scene.camera.shakeX = Math.sin(state.effectAge * 140) * shake;
    scene.camera.shakeY = Math.cos(state.effectAge * 110) * shake;
  }, { runsDuringFreeze: true });
  scene.resetInterpolation(() => players.eachChunk((chunk) => {
    const p = chunk.views.flight;
    for (let row = 0; row < chunk.count; row++) { p.px[row] = p.x[row]; p.py[row] = p.y[row]; p.previousBank[row] = p.bank[row]; }
  }));
}
