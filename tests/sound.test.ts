import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Audio, SceneSetup } from "@ngne/core";
import { combatAudioAssetsForStage, createCombatSound } from "../src/services/sound.ts";

for (const stageIndex of [0, 1, 2])
    test(`stage ${stageIndex + 1} audio replaces music scopes, throttles cues and disposes owned voices`, () => {
        const scopes: { name: string; disposed: boolean; plays: unknown[]; level: number }[] = [];
        const cleanups: (() => void)[] = [];
        const host = {
            muted: false,
            scene(name: string) {
                const record = { name, disposed: false, plays: [] as unknown[], level: 1 };
                scopes.push(record);
                return {
                    play: (clip: unknown) => {
                        assert.equal(record.disposed, false);
                        record.plays.push(clip);
                    },
                    volume: (level: number) => {
                        record.level = level;
                    },
                    fadeTo: (level: number) => {
                        record.level = level;
                    },
                    dispose: () => {
                        record.disposed = true;
                    },
                };
            },
        };
        const scene = {
            assets: new Map(
                combatAudioAssetsForStage(stageIndex).map((asset) => [asset.id, { id: asset.id }]),
            ),
            defer: (cleanup: () => void) => cleanups.push(cleanup),
        } as unknown as SceneSetup;
        const settings = { music: 0.6, effects: 0.8, muted: false, reducedMotion: false };
        const sound = createCombatSound(scene, host as unknown as Audio, settings, stageIndex);
        sound.update(1 / 60, "waves");
        const waves = scopes.find((scope) => scope.name === "music-waves")!;
        assert.equal(waves.plays.length, 1);
        assert.equal(
            (waves.plays[0] as { buffer: { id: string } }).buffer.id,
            ["music-breakwater", "music-furnace", "music-citadel"][stageIndex],
        );
        for (let i = 0; i < 200; i++) {
            sound.shoot();
            sound.enemyShot();
            sound.hit();
            sound.kill();
        }
        assert.equal(
            scopes[0].plays.length,
            4,
            "one voice per cue lane at the same simulation time",
        );
        sound.update(0.2, "waves");
        sound.shoot();
        assert.equal(scopes[0].plays.length, 5);
        assert.equal(waves.plays.length, 1, "music does not restart every tick");
        sound.update(1 / 60, "boss");
        assert.equal(waves.disposed, true);
        const boss = scopes.find((scope) => scope.name === "music-boss")!;
        assert.equal(boss.plays.length, 1);
        assert.equal(
            (boss.plays[0] as { buffer: { id: string } }).buffer.id,
            ["music-gatebreaker", "music-kiln", "music-starfall-engine"][stageIndex],
        );
        settings.music = 0.2;
        settings.effects = 0.3;
        settings.muted = true;
        sound.update(1 / 60, "boss");
        assert.equal(host.muted, true);
        assert.equal(boss.level, 0.2);
        assert.equal(scopes[0].level, 0.3);
        sound.update(1 / 60, "clear");
        assert.equal(boss.level, 0);
        cleanups.reverse().forEach((cleanup) => cleanup());
        assert.ok(scopes.every((scope) => scope.disposed));
    });
