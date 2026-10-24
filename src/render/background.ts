import { LAYER } from "../config/layers.ts";
import { VIEW, fromLegacy as w } from "../config/view.ts";
import { stageArt } from "../services/stage-assets.ts";
import { drawNative } from "../ui/sprite.ts";
import type { RenderPassFactory } from "./pass.ts";

/** Stage background, its tint and the scrolling starfield (spec layer "background + starfield"). */
export const createBackgroundRender: RenderPassFactory = ({ scene, run, session, stage }) => {
  // Same three draws per star as at 480x270, so the "background-stars" stream is unchanged; results are world px.
  const { background } = stageArt(stage), rng = scene.random("background-stars");
  const stars = Array.from({ length: 36 }, () => ({ x: rng.range(0, VIEW.width), y: rng.range(0, VIEW.height), speed: rng.range(w(5), w(23)) }));
  return (frame, _alpha, legacy) => {
    drawNative(frame, background, VIEW.width / 2, VIEW.height / 2, { layer: LAYER.background });
    legacy.rect(w(240), w(135), w(480), w(270), 0x050d19, 0.17, LAYER.backgroundTint, true);
    for (const star of stars) legacy.rect(star.x, (star.y + (session.settings.reducedMotion ? 0 : run.effectClock * star.speed)) % VIEW.height, w(1), star.speed > w(16) ? w(2) : w(1), 0x9ccee1, 0.35, LAYER.stars);
  };
};
