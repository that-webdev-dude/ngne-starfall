import { test } from "node:test";
import { strict as assert } from "node:assert";
import { STAGES } from "../src/config/stages.ts";
import { rev01StageImages } from "../src/services/rev01-claims.ts";
import { stageArt, stageAssets } from "../src/services/stage-assets.ts";

const AUDIO = [
    [
        "music-breakwater",
        "music-gatebreaker",
        "sound-shot",
        "sound-hit",
        "sound-explosion",
        "sound-nova",
        "sound-damage",
        "sound-warning",
        "sound-clear",
        "sound-death",
    ],
    [
        "music-furnace",
        "music-kiln",
        "sound-shot",
        "sound-hit",
        "sound-explosion",
        "sound-nova",
        "sound-damage",
        "sound-warning",
        "sound-clear",
        "sound-death",
    ],
    [
        "music-citadel",
        "music-starfall-engine",
        "sound-shot",
        "sound-hit",
        "sound-explosion",
        "sound-nova",
        "sound-damage",
        "sound-warning",
        "sound-clear",
        "sound-death",
    ],
];

test("each stage claims exactly its registry-derived rev01 images, then its audio", () => {
    for (const stage of STAGES) {
        const rev01 = rev01StageImages(stage.id).map((asset) => asset.id);
        assert.ok(rev01.length > 0, stage.id);
        assert.deepEqual(
            stageAssets(stage).map((asset) => asset.id),
            [...rev01, ...AUDIO[stage.index]],
        );
    }
});

test("each stage claims the background texture it draws", () => {
    for (const stage of STAGES) {
        const { background, images } = stageArt(stage);
        assert.ok(
            images.some((asset) => asset.id === background.texture),
            stage.id,
        );
    }
});
