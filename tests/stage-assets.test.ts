import { test } from "node:test";
import { strict as assert } from "node:assert";
import { STAGES } from "../src/config/stages.ts";
import { stageArt, stageAssets } from "../src/services/stage-assets.ts";

/** Pinned claim order per stage; a stage silently losing a texture or clip fails here, not in the browser. */
const EXPECTED = [
  [
    "player-bank", "exhaust", "interceptor", "explosion", "orbital-breakwater", "dart",
    "gunship", "gatebreaker", "music-breakwater", "music-gatebreaker", "sound-shot", "sound-hit",
    "sound-explosion", "sound-nova", "sound-damage", "sound-warning", "sound-clear", "sound-death",
  ],
  [
    "player-bank", "exhaust", "interceptor", "explosion", "dart", "gunship",
    "furnace-background", "kiln-head", "kiln-segment", "minelayer", "warden", "music-furnace",
    "music-kiln", "sound-shot", "sound-hit", "sound-explosion", "sound-nova", "sound-damage",
    "sound-warning", "sound-clear", "sound-death",
  ],
  [
    "player-bank", "exhaust", "interceptor", "explosion", "dart", "gunship",
    "citadel-background", "starfall-engine", "minelayer", "warden", "music-citadel", "music-starfall-engine",
    "sound-shot", "sound-hit", "sound-explosion", "sound-nova", "sound-damage", "sound-warning",
    "sound-clear", "sound-death",
  ],
];

test("each stage claims exactly its pinned assets in load order", () => {
  assert.deepEqual(STAGES.map((stage) => stageAssets(stage).map((asset) => asset.id)), EXPECTED);
});

test("each stage claims the background texture it draws", () => {
  for (const stage of STAGES) {
    const { background, images } = stageArt(stage);
    assert.ok(images.some((asset) => asset.id === background.texture), stage.id);
  }
});
