import type { Frame } from "@ngne/core";
import type { CombatContext } from "../systems/combat-context.ts";

/**
 * One stage render responsibility. `frame` takes native rev01 quads (`drawNative`, whole-pixel geometry);
 * `legacy` is the same frame with engine-equivalent centre rounding for pre-rev01 draws (`pixelSnapped`).
 * Passes run in a fixed order every frame; layer numbers, not order, decide stacking (config/layers.ts).
 */
export type RenderPass = (frame: Frame, alpha: number, legacy: Frame) => void;
export type RenderPassFactory = (context: CombatContext) => RenderPass;
