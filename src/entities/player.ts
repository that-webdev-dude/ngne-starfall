import type { WorldAccess } from "@ngne/core";
import { Flight } from "../components/flight.ts";

export function spawnPlayer(world: WorldAccess) {
  return world.spawn(Flight.of());
}
