import type { Asset } from "./assets.js";
export interface Sound {
    frequency: number;
    endFrequency?: number;
    duration: number;
    volume?: number;
    type?: OscillatorType;
}
export interface Clip {
    buffer: AudioBuffer;
    volume?: number;
    loop?: boolean;
    rate?: number;
}
/** Decode independently of a playback device; scenes lease the resulting buffer. */
export declare function audioAsset(id: string, url: string): Asset<AudioBuffer>;
/** Bounded Web Audio voices. Playback requests flush only after committed ticks. */
export declare class Audio {
    private context?;
    private master?;
    private voices;
    private queue;
    private volumes;
    private buses;
    private ducking;
    private mutedValue;
    private nextScope;
    private disposed;
    readonly maxVoices = 32;
    get muted(): boolean;
    set muted(value: boolean);
    private mix;
    unlock(): Promise<void>;
    scene(id: string): {
        play: (sound: Sound | Clip) => void;
        volume: (target: number) => void;
        fadeTo: (target: number, seconds: number) => void;
        dispose: () => void;
    };
    duck(level?: number): void;
    private bus;
    flush(): void;
    private release;
    suspend(): Promise<void> | undefined;
    resume(): Promise<void> | undefined;
    dispose(): Promise<void>;
    private stopVoice;
}
