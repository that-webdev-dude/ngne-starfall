import type { SceneDefinition } from "@ngne/core";
import { spawnPlayer } from "../entities/player.ts";
import { artAssets } from "../services/art-assets.ts";
import { installArtRender } from "../systems/art-render.ts";
import { installFlight, type PreviewState } from "../systems/flight.ts";

export function artPreview(state: PreviewState): SceneDefinition {
  return {
    id: "starfall-art-preview",
    assets: artAssets,
    setup(scene) {
      spawnPlayer(scene.world);
      scene.resource("preview", state);
      installFlight(scene, state);
      installArtRender(scene, state);
    },
  };
}
