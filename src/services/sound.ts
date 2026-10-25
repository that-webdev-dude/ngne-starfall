import { audioAsset, type Audio, type SceneSetup } from "@ngne/core";
import type { CombatPhase, Settings } from "../world/session.ts";

const clips = {
    waves: audioAsset(
        "music-breakwater",
        new URL("../assets/audio/breakwater.wav", import.meta.url).href,
    ),
    boss: audioAsset(
        "music-gatebreaker",
        new URL("../assets/audio/gatebreaker.wav", import.meta.url).href,
    ),
    shot: audioAsset("sound-shot", new URL("../assets/audio/shot.wav", import.meta.url).href),
    hit: audioAsset("sound-hit", new URL("../assets/audio/hit.wav", import.meta.url).href),
    kill: audioAsset(
        "sound-explosion",
        new URL("../assets/audio/explosion.wav", import.meta.url).href,
    ),
    nova: audioAsset("sound-nova", new URL("../assets/audio/nova.wav", import.meta.url).href),
    damage: audioAsset("sound-damage", new URL("../assets/audio/damage.wav", import.meta.url).href),
    warning: audioAsset(
        "sound-warning",
        new URL("../assets/audio/warning.wav", import.meta.url).href,
    ),
    clear: audioAsset("sound-clear", new URL("../assets/audio/clear.wav", import.meta.url).href),
    death: audioAsset("sound-death", new URL("../assets/audio/death.wav", import.meta.url).href),
};
const sectorMusic = [
    { waves: clips.waves, boss: clips.boss },
    {
        waves: audioAsset(
            "music-furnace",
            new URL("../assets/audio/furnace.wav", import.meta.url).href,
        ),
        boss: audioAsset("music-kiln", new URL("../assets/audio/kiln.wav", import.meta.url).href),
    },
    {
        waves: audioAsset(
            "music-citadel",
            new URL("../assets/audio/citadel.wav", import.meta.url).href,
        ),
        boss: audioAsset(
            "music-starfall-engine",
            new URL("../assets/audio/starfall-engine.wav", import.meta.url).href,
        ),
    },
] as const;
const clipsForStage = (stageIndex: number) => ({
    ...clips,
    ...(sectorMusic[stageIndex] ?? sectorMusic[0]),
});
export const combatAudioAssetsForStage = (stageIndex: number) =>
    Object.values(clipsForStage(stageIndex));
export interface CombatSound {
    update(dt: number, phase: CombatPhase): void;
    shoot(): void;
    enemyShot(): void;
    hit(): void;
    kill(big?: boolean): void;
    nova(): void;
    damage(): void;
    boss(): void;
    clear(): void;
    death(): void;
}

/** All voices belong to scene scopes; cue cooldowns keep dense encounters under the voice budget. */
export function createCombatSound<S, C>(
    scene: SceneSetup<S, C>,
    audio: Audio,
    settings: Pick<Settings, "music" | "effects" | "muted">,
    stageIndex = 0,
): CombatSound {
    const effects = audio.scene("combat-effects");
    scene.defer(() => effects.dispose());
    let music = audio.scene("combat-music");
    scene.defer(() => music.dispose());
    const buffers = Object.fromEntries(
        Object.entries(clipsForStage(stageIndex)).map(([key, asset]) => [
            key,
            scene.assets.get(asset.id) as AudioBuffer,
        ]),
    ) as Record<keyof typeof clips, AudioBuffer>;
    let time = 0,
        lastPhase: CombatPhase | undefined,
        musicLevel = -1,
        effectsLevel = -1;
    const next = new Map<string, number>();
    let variation = 0;
    function play(
        key: keyof typeof clips,
        volume: number,
        cooldown = 0,
        rate = 1,
        lane: string = key,
    ): void {
        if (time < (next.get(lane) ?? -1)) return;
        next.set(lane, time + cooldown);
        effects.play({ buffer: buffers[key], volume, rate });
    }
    return {
        update(dt, phase) {
            time += dt;
            const targetMusic = Math.max(0, Math.min(1, settings.music));
            const targetEffects = Math.max(0, Math.min(1, settings.effects));
            audio.muted = settings.muted;
            if (targetEffects !== effectsLevel) {
                effects.volume(targetEffects);
                effectsLevel = targetEffects;
            }
            if (phase !== lastPhase) {
                if (phase === "waves" || phase === "boss") {
                    music.dispose();
                    music = audio.scene(`music-${phase}`);
                    music.volume(targetMusic);
                    music.play({ buffer: buffers[phase], volume: 0.65, loop: true });
                } else music.fadeTo(0, 0.45);
                lastPhase = phase;
                musicLevel = targetMusic;
            }
            if (targetMusic !== musicLevel && (phase === "waves" || phase === "boss")) {
                music.volume(targetMusic);
                musicLevel = targetMusic;
            }
        },
        shoot: () => play("shot", 0.24, 0.07),
        enemyShot: () => play("shot", 0.12, 0.14, 0.45, "enemy-shot"),
        hit: () => play("hit", 0.21, 0.045),
        kill: (big = false) => {
            variation++;
            play("kill", big ? 0.8 : 0.48, 0.055, big ? 0.7 : 0.93 + (variation % 4) * 0.08);
        },
        nova: () => play("nova", 0.9, 0.4),
        damage: () => play("damage", 0.7, 0.3),
        boss: () => play("warning", 0.6, 1.2),
        clear: () => play("clear", 0.8, 1),
        death: () => play("death", 0.8, 1),
    };
}
